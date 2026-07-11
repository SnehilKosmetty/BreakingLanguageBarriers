using System.Net.Http.Json;
using System.Text.Json.Serialization;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;
using Microsoft.Extensions.Logging;

namespace BreakingLanguageBarriers.Infrastructure.Translation;

/// <summary>
/// Free translation API for development. Uses English pivot for Indian language pairs
/// when direct translation is unavailable (e.g. Telugu to Marathi).
/// </summary>
public sealed class MyMemoryTranslationService : ITranslationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<MyMemoryTranslationService> _logger;

    public MyMemoryTranslationService(HttpClient httpClient, ILogger<MyMemoryTranslationService> logger)
    {
        _httpClient = httpClient;
        _httpClient.BaseAddress = new Uri("https://api.mymemory.translated.net/");
        _logger = logger;
    }

    public async Task<TranslationResult> TranslateAsync(
        string text,
        LanguageCode sourceLanguage,
        LanguageCode targetLanguage,
        CancellationToken cancellationToken = default)
    {
        var from = LanguageCodeMapper.ToIso639(sourceLanguage.Code);
        var to = LanguageCodeMapper.ToIso639(targetLanguage.Code);

        var (translated, confidence) = await TranslatePairAsync(text, from, to, cancellationToken);

        if (!IsValidTranslation(text, translated) && from != "en" && to != "en")
        {
            _logger.LogInformation("Direct {From}->{To} failed, trying English pivot", from, to);

            var (english, _) = await TranslatePairAsync(text, from, "en", cancellationToken);
            if (IsValidTranslation(text, english))
            {
                var (pivoted, pivotConfidence) = await TranslatePairAsync(english, "en", to, cancellationToken);
                if (IsValidTranslation(english, pivoted))
                {
                    translated = pivoted;
                    confidence = Math.Min(confidence, pivotConfidence) * 0.95f;
                }
            }
        }

        if (!IsValidTranslation(text, translated))
            throw new InvalidOperationException(
                $"Could not translate from {sourceLanguage.Name} to {targetLanguage.Name}. " +
                "Configure Azure Translator in appsettings.json for better Indian language support.");

        _logger.LogInformation("Translated {From} -> {To}", from, to);

        return new TranslationResult(translated, confidence, sourceLanguage, targetLanguage);
    }

    private async Task<(string Text, float Confidence)> TranslatePairAsync(
        string text,
        string from,
        string to,
        CancellationToken cancellationToken)
    {
        var url = $"get?q={Uri.EscapeDataString(text)}&langpair={from}|{to}";

        var response = await _httpClient.GetFromJsonAsync<MyMemoryResponse>(url, cancellationToken);

        var translated = response?.ResponseData?.TranslatedText?.Trim() ?? string.Empty;

        if (translated.Contains("MYMEMORY WARNING", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Translation quota reached. Try again later or configure Azure Translator.");

        return (translated, (float)(response?.ResponseData?.Match ?? 0.85));
    }

    private static bool IsValidTranslation(string source, string translated)
    {
        if (string.IsNullOrWhiteSpace(translated)) return false;

        var normalizedSource = source.Trim();
        var normalizedTarget = translated.Trim();

        return !string.Equals(normalizedSource, normalizedTarget, StringComparison.Ordinal);
    }

    private sealed class MyMemoryResponse
    {
        [JsonPropertyName("responseData")]
        public MyMemoryData? ResponseData { get; set; }
    }

    private sealed class MyMemoryData
    {
        [JsonPropertyName("translatedText")]
        public string? TranslatedText { get; set; }

        [JsonPropertyName("match")]
        public double Match { get; set; }
    }
}
