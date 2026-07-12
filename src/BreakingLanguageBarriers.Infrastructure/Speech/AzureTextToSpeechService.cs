using System.Net.Http.Headers;
using System.Text;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BreakingLanguageBarriers.Infrastructure.Speech;

/// <summary>
/// Azure Neural TTS via REST (works reliably on App Service without native Speech SDK).
/// </summary>
public sealed class AzureTextToSpeechService : ITextToSpeechService
{
    private readonly HttpClient _httpClient;
    private readonly SpeechServiceOptions _options;
    private readonly ILogger<AzureTextToSpeechService> _logger;

    public AzureTextToSpeechService(
        HttpClient httpClient,
        IOptions<SpeechServiceOptions> options,
        ILogger<AzureTextToSpeechService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<SynthesizedSpeech> SynthesizeAsync(
        string text,
        LanguageCode language,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.AzureSpeechKey))
            throw new InvalidOperationException("Azure Speech key is not configured.");

        var locale = AzureVoiceMapper.GetSpeechLocale(language.Code);
        var voiceName = AzureVoiceMapper.GetVoiceName(language.Code);
        var region = _options.AzureSpeechRegion.Trim().ToLowerInvariant();
        var endpoint = $"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1";

        var ssml = $"""
            <speak version='1.0' xml:lang='{locale}'>
              <voice name='{voiceName}'>{EscapeXml(text)}</voice>
            </speak>
            """;

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Add("Ocp-Apim-Subscription-Key", _options.AzureSpeechKey);
        request.Headers.Add("X-Microsoft-OutputFormat", "audio-16khz-32kbitrate-mono-mp3");
        request.Content = new StringContent(ssml, Encoding.UTF8, "application/ssml+xml");
        request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/ssml+xml");

        try
        {
            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Azure TTS failed ({Status}): {Body}", response.StatusCode, errorBody);
                throw new InvalidOperationException(
                    $"Azure TTS failed ({(int)response.StatusCode}). Check Speech key and region ({region}).");
            }

            var audio = await response.Content.ReadAsByteArrayAsync(cancellationToken);
            if (audio.Length == 0)
                throw new InvalidOperationException("Azure TTS returned empty audio.");

            _logger.LogInformation("Azure TTS synthesized {Language} with voice {Voice}", language.Code, voiceName);
            return new SynthesizedSpeech(audio, "audio/mpeg", 16000);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Azure TTS request failed for {Language}", language.Code);
            throw new InvalidOperationException($"Azure TTS failed: {ex.Message}");
        }
    }

    private static string EscapeXml(string text) =>
        text
            .Replace("&", "&amp;", StringComparison.Ordinal)
            .Replace("<", "&lt;", StringComparison.Ordinal)
            .Replace(">", "&gt;", StringComparison.Ordinal)
            .Replace("\"", "&quot;", StringComparison.Ordinal)
            .Replace("'", "&apos;", StringComparison.Ordinal);
}
