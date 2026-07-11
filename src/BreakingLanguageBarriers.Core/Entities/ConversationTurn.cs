using BreakingLanguageBarriers.Core.Enums;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Core.Entities;

public sealed class ConversationTurn
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public Guid SessionId { get; init; }
    public SpeakerRole Speaker { get; init; }
    public LanguageCode SourceLanguage { get; init; } = null!;
    public LanguageCode TargetLanguage { get; init; } = null!;
    public string OriginalText { get; set; } = string.Empty;
    public string TranslatedText { get; set; } = string.Empty;
    public float RecognitionConfidence { get; set; }
    public float TranslationConfidence { get; set; }
    public byte[]? SynthesizedAudio { get; set; }
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;
}
