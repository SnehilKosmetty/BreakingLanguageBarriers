using System.Collections.Concurrent;

namespace BreakingLanguageBarriers.Api.Hubs;

public sealed class SessionParticipantTracker
{
    private readonly ConcurrentDictionary<string, ConcurrentDictionary<string, string>> _sessions = new();

    public int Join(string sessionId, string connectionId, string role)
    {
        var participants = _sessions.GetOrAdd(sessionId, _ => new ConcurrentDictionary<string, string>());
        participants[connectionId] = role;
        return participants.Count;
    }

    public int Leave(string sessionId, string connectionId)
    {
        if (!_sessions.TryGetValue(sessionId, out var participants))
            return 0;

        participants.TryRemove(connectionId, out _);
        if (participants.IsEmpty)
            _sessions.TryRemove(sessionId, out _);

        return participants.Count;
    }

    public IReadOnlyList<string> GetSessionIdsForConnection(string connectionId)
    {
        return _sessions
            .Where(s => s.Value.ContainsKey(connectionId))
            .Select(s => s.Key)
            .ToList();
    }
}
