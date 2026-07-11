using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Security;

namespace BreakingLanguageBarriers.Application.Security;

public interface ISessionAccessValidator
{
    Task<bool> ValidateAsync(Guid sessionId, string? accessToken, CancellationToken cancellationToken = default);
    Task<ConversationSession?> GetAuthorizedSessionAsync(
        Guid sessionId,
        string? accessToken,
        CancellationToken cancellationToken = default);
}

public sealed class SessionAccessValidator : ISessionAccessValidator
{
    private readonly Core.Interfaces.IConversationSessionRepository _repository;

    public SessionAccessValidator(Core.Interfaces.IConversationSessionRepository repository)
    {
        _repository = repository;
    }

    public async Task<bool> ValidateAsync(
        Guid sessionId,
        string? accessToken,
        CancellationToken cancellationToken = default)
    {
        return await GetAuthorizedSessionAsync(sessionId, accessToken, cancellationToken) is not null;
    }

    public async Task<ConversationSession?> GetAuthorizedSessionAsync(
        Guid sessionId,
        string? accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await _repository.GetByIdAsync(sessionId, cancellationToken);
        if (session is null)
            return null;

        if (!SessionTokenHasher.VerifyToken(accessToken ?? string.Empty, session.AccessTokenHash))
            return null;

        return session;
    }
}
