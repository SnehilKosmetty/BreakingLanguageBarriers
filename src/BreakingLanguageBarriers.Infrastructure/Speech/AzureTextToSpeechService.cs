using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;
using Microsoft.CognitiveServices.Speech;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace BreakingLanguageBarriers.Infrastructure.Speech;

public sealed class AzureTextToSpeechService : ITextToSpeechService
{
    private readonly SpeechServiceOptions _options;
    private readonly ILogger<AzureTextToSpeechService> _logger;

    public AzureTextToSpeechService(
        IOptions<SpeechServiceOptions> options,
        ILogger<AzureTextToSpeechService> logger)
    {
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

        var voiceName = AzureVoiceMapper.GetVoiceName(language.Code);
        var speechConfig = SpeechConfig.FromSubscription(_options.AzureSpeechKey, _options.AzureSpeechRegion);
        speechConfig.SpeechSynthesisVoiceName = voiceName;
        speechConfig.SetSpeechSynthesisOutputFormat(SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3);

        using var synthesizer = new SpeechSynthesizer(speechConfig, null);
        using var registration = cancellationToken.Register(() => synthesizer.StopSpeakingAsync());

        var result = await synthesizer.SpeakTextAsync(text).ConfigureAwait(false);

        if (result.Reason == ResultReason.SynthesizingAudioCompleted)
        {
            _logger.LogInformation("Azure TTS synthesized {Language} with voice {Voice}", language.Code, voiceName);
            return new SynthesizedSpeech(result.AudioData, "audio/mpeg", 16000);
        }

        if (result.Reason == ResultReason.Canceled)
        {
            var details = SpeechSynthesisCancellationDetails.FromResult(result);
            throw new InvalidOperationException($"Azure TTS failed: {details.Reason} — {details.ErrorDetails}");
        }

        throw new InvalidOperationException($"Azure TTS returned unexpected result: {result.Reason}");
    }
}
