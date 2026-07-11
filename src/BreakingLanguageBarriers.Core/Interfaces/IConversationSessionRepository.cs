using BreakingLanguageBarriers.Core.Entities;

namespace BreakingLanguageBarriers.Core.Interfaces;

public interface IConversationSessionRepository
{
    Task<ConversationSession?> GetByIdAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<ConversationSession> CreateAsync(ConversationSession session, CancellationToken cancellationToken = default);
    Task UpdateAsync(ConversationSession session, CancellationToken cancellationToken = default);
    Task DeleteAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task ClearTurnsAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ConversationTurn>> GetTurnsAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task AddTurnAsync(ConversationTurn turn, CancellationToken cancellationToken = default);
}
