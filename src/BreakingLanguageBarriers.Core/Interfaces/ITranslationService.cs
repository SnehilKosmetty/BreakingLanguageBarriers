using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Core.Interfaces;

public sealed record TranslationResult(
    string TranslatedText,
    float Confidence,
    LanguageCode SourceLanguage,
    LanguageCode TargetLanguage);

public interface ITranslationService
{
    Task<TranslationResult> TranslateAsync(
        string text,
        LanguageCode sourceLanguage,
        LanguageCode targetLanguage,
        CancellationToken cancellationToken = default);
}
