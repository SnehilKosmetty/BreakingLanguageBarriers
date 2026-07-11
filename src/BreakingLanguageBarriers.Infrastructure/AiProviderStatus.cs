using BreakingLanguageBarriers.Infrastructure.Speech;
using BreakingLanguageBarriers.Infrastructure.Translation;
using Microsoft.Extensions.Configuration;

namespace BreakingLanguageBarriers.Infrastructure;

public sealed class AiProviderStatus
{
    public AiServiceStatus SpeechRecognition { get; init; } = new();
    public AiServiceStatus Translation { get; init; } = new();
    public AiServiceStatus TextToSpeech { get; init; } = new();

    public static AiProviderStatus FromConfiguration(IConfiguration configuration)
    {
        var speechOpts = configuration.GetSection("AiServices:SpeechRecognition").Get<SpeechServiceOptions>()
            ?? new SpeechServiceOptions();
        var ttsOpts = configuration.GetSection("AiServices:TextToSpeech").Get<SpeechServiceOptions>()
            ?? new SpeechServiceOptions();
        var translationOpts = configuration.GetSection("AiServices:Translation").Get<TranslationOptions>()
            ?? new TranslationOptions();

        var speechAzure = speechOpts.Provider.Equals("Azure", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(speechOpts.AzureSpeechKey);
        var ttsAzure = ttsOpts.Provider.Equals("Azure", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(ttsOpts.AzureSpeechKey);
        var translationAzure = translationOpts.Provider.Equals("Azure", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(translationOpts.AzureTranslatorKey);

        return new AiProviderStatus
        {
            SpeechRecognition = new AiServiceStatus
            {
                Provider = speechAzure ? "Azure" : "Browser",
                IsConfigured = speechAzure,
                Description = speechAzure
                    ? "Azure Speech STT (server audio stream)"
                    : "Browser Web Speech API (Chrome/Edge recommended)"
            },
            Translation = new AiServiceStatus
            {
                Provider = translationAzure ? "Azure" : "MyMemory",
                IsConfigured = translationAzure || !translationAzure,
                Description = translationAzure
                    ? "Azure Translator"
                    : "MyMemory free API (testing)"
            },
            TextToSpeech = new AiServiceStatus
            {
                Provider = ttsAzure ? "Azure" : "Mock",
                IsConfigured = ttsAzure,
                Description = ttsAzure
                    ? "Azure Neural TTS (natural Indian voices)"
                    : "Mock silent audio (add Azure Speech key for real voice)"
            }
        };
    }
}

public sealed class AiServiceStatus
{
    public string Provider { get; init; } = "Mock";
    public bool IsConfigured { get; init; }
    public string Description { get; init; } = string.Empty;
}
