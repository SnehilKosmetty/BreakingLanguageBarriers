using System.Collections.Concurrent;
using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Interfaces;

namespace BreakingLanguageBarriers.Infrastructure.Persistence;

public sealed class InMemoryConversationSessionRepository : IConversationSessionRepository
{
    private readonly ConcurrentDictionary<Guid, ConversationSession> _sessions = new();
    private readonly ConcurrentDictionary<Guid, List<ConversationTurn>> _turns = new();

    public Task<ConversationSession?> GetByIdAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        _sessions.TryGetValue(sessionId, out var session);
        return Task.FromResult(session);
    }

    public Task<ConversationSession> CreateAsync(ConversationSession session, CancellationToken cancellationToken = default)
    {
        _sessions[session.Id] = session;
        _turns[session.Id] = [];
        return Task.FromResult(session);
    }

    public Task UpdateAsync(ConversationSession session, CancellationToken cancellationToken = default)
    {
        _sessions[session.Id] = session;
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        _sessions.TryRemove(sessionId, out _);
        _turns.TryRemove(sessionId, out _);
        return Task.CompletedTask;
    }

    public Task ClearTurnsAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        if (_turns.TryGetValue(sessionId, out var turns))
        {
            lock (turns)
            {
                turns.Clear();
            }
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<ConversationTurn>> GetTurnsAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        if (_turns.TryGetValue(sessionId, out var turns))
            return Task.FromResult<IReadOnlyList<ConversationTurn>>(turns.ToList());

        return Task.FromResult<IReadOnlyList<ConversationTurn>>([]);
    }

    public Task AddTurnAsync(ConversationTurn turn, CancellationToken cancellationToken = default)
    {
        var turns = _turns.GetOrAdd(turn.SessionId, _ => []);
        lock (turns)
        {
            turns.Add(turn);
        }
        return Task.CompletedTask;
    }
}
