using System.Net.Http.Json;
using System.Text.Json.Serialization;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BreakingLanguageBarriers.Infrastructure.Translation;

public sealed class AzureTranslationService : ITranslationService
{
    private readonly HttpClient _httpClient;
    private readonly TranslationOptions _options;
    private readonly ILogger<AzureTranslationService> _logger;

    public AzureTranslationService(
        HttpClient httpClient,
        IOptions<TranslationOptions> options,
        ILogger<AzureTranslationService> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<TranslationResult> TranslateAsync(
        string text,
        LanguageCode sourceLanguage,
        LanguageCode targetLanguage,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.AzureTranslatorKey))
            throw new InvalidOperationException("Azure Translator key is not configured.");

        var from = LanguageCodeMapper.ToIso639(sourceLanguage.Code);
        var to = LanguageCodeMapper.ToIso639(targetLanguage.Code);
        var endpoint = $"https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&from={from}&to={to}";

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
        request.Headers.Add("Ocp-Apim-Subscription-Key", _options.AzureTranslatorKey);
        request.Headers.Add("Ocp-Apim-Subscription-Region", _options.AzureTranslatorRegion);
        request.Content = JsonContent.Create(new[] { new { Text = text } });

        try
        {
            var response = await _httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError(
                    "Azure Translator failed ({Status}): {Body}. Region={Region}",
                    response.StatusCode,
                    errorBody,
                    _options.AzureTranslatorRegion);
                throw new InvalidOperationException(
                    $"Azure Translator failed ({(int)response.StatusCode}). Check Translator key and region ({_options.AzureTranslatorRegion}).");
            }

            var results = await response.Content.ReadFromJsonAsync<AzureTranslationResponse[]>(cancellationToken);
            var translated = results?[0]?.Translations?[0]?.Text?.Trim();

            if (string.IsNullOrWhiteSpace(translated))
                throw new InvalidOperationException("Azure returned empty translation.");

            _logger.LogInformation("Azure translated {From} -> {To}", from, to);

            return new TranslationResult(translated, 0.95f, sourceLanguage, targetLanguage);
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Azure Translator request failed");
            throw new InvalidOperationException($"Azure Translator failed: {ex.Message}");
        }
    }

    private sealed class AzureTranslationResponse
    {
        [JsonPropertyName("translations")]
        public AzureTranslation[]? Translations { get; set; }
    }

    private sealed class AzureTranslation
    {
        [JsonPropertyName("text")]
        public string? Text { get; set; }
    }
}
