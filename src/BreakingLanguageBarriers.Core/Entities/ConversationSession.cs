using BreakingLanguageBarriers.Core.Enums;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Core.Entities;

public sealed class ConversationSession
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public string AccessTokenHash { get; init; } = string.Empty;
    public LanguageCode MyLanguage { get; set; } = null!;
    public LanguageCode OtherPersonLanguage { get; set; } = null!;
    public ConversationState State { get; set; } = ConversationState.Idle;
    public PrivacyMode PrivacyMode { get; set; } = PrivacyMode.Standard;
    public bool SaveHistory { get; set; } = true;
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? StoppedAt { get; set; }
    public List<ConversationTurn> Turns { get; } = [];
}
