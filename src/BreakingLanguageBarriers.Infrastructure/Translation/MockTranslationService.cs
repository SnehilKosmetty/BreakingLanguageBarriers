using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Infrastructure.Translation;

/// <summary>
/// Development stub for translation. Replace with Azure Translator, Google Translate,
/// or a custom LLM pipeline for context-aware Indian language translation.
/// </summary>
public sealed class MockTranslationService : ITranslationService
{
    public Task<TranslationResult> TranslateAsync(
        string text,
        LanguageCode sourceLanguage,
        LanguageCode targetLanguage,
        CancellationToken cancellationToken = default)
    {
        var translated = $"[{targetLanguage.Name}] {text}";
        return Task.FromResult(new TranslationResult(translated, 0.88f, sourceLanguage, targetLanguage));
    }
}
