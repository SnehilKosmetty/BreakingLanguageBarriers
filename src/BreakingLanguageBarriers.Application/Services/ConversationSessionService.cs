using BreakingLanguageBarriers.Application.DTOs;
using BreakingLanguageBarriers.Application.Security;
using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Enums;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.Security;

namespace BreakingLanguageBarriers.Application.Services;

public sealed class ConversationSessionService
{
    private readonly IConversationSessionRepository _repository;
    private readonly ILanguageCatalog _languageCatalog;
    private readonly IConversationPipeline _pipeline;
    private readonly ISessionAccessValidator _accessValidator;

    public ConversationSessionService(
        IConversationSessionRepository repository,
        ILanguageCatalog languageCatalog,
        IConversationPipeline pipeline,
        ISessionAccessValidator accessValidator)
    {
        _repository = repository;
        _languageCatalog = languageCatalog;
        _pipeline = pipeline;
        _accessValidator = accessValidator;
    }

    public async Task<CreateSessionResponse> CreateSessionAsync(
        CreateSessionRequest request,
        CancellationToken cancellationToken = default)
    {
        var myLanguage = _languageCatalog.GetByCode(request.MyLanguageCode)
            ?? throw new ArgumentException($"Unknown language: {request.MyLanguageCode}");
        var otherLanguage = _languageCatalog.GetByCode(request.OtherPersonLanguageCode)
            ?? throw new ArgumentException($"Unknown language: {request.OtherPersonLanguageCode}");

        var privacyMode = Enum.Parse<PrivacyMode>(request.PrivacyMode, ignoreCase: true);
        var saveHistory = privacyMode == PrivacyMode.Private ? false : request.SaveHistory;
        var accessToken = SessionTokenHasher.GenerateToken();

        var session = new ConversationSession
        {
            AccessTokenHash = SessionTokenHasher.HashToken(accessToken),
            MyLanguage = myLanguage,
            OtherPersonLanguage = otherLanguage,
            SaveHistory = saveHistory,
            PrivacyMode = privacyMode
        };

        await _repository.CreateAsync(session, cancellationToken);
        return new CreateSessionResponse(ToResponse(session), accessToken);
    }

    public async Task<SessionResponse> GetSessionAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        return ToResponse(session);
    }

    public async Task<SessionResponse> StartAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        session.State = ConversationState.Listening;
        session.StartedAt = DateTimeOffset.UtcNow;
        await _repository.UpdateAsync(session, cancellationToken);
        return ToResponse(session);
    }

    public async Task<SessionResponse> StopAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        session.State = ConversationState.Stopped;
        session.StoppedAt = DateTimeOffset.UtcNow;

        if (session.PrivacyMode == PrivacyMode.Private)
        {
            var response = ToResponse(session);
            await _repository.DeleteAsync(sessionId, cancellationToken);
            return response;
        }

        await _repository.UpdateAsync(session, cancellationToken);
        return ToResponse(session);
    }

    public async Task ClearDisplayAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        await _repository.ClearTurnsAsync(sessionId, cancellationToken);
    }

    public async Task<SessionResponse> PauseAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        session.State = ConversationState.Paused;
        await _repository.UpdateAsync(session, cancellationToken);
        return ToResponse(session);
    }

    public async Task<SessionResponse> ResumeAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        session.State = ConversationState.Listening;
        await _repository.UpdateAsync(session, cancellationToken);
        return ToResponse(session);
    }

    public async Task<TranslationResponse> ProcessSpeechAsync(
        ProcessSpeechRequest request,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(request.SessionId, accessToken, cancellationToken);

        if (session.State is ConversationState.Stopped or ConversationState.Paused)
            throw new InvalidOperationException("Session cannot process speech.");

        var speaker = Enum.Parse<SpeakerRole>(request.Speaker, ignoreCase: true);
        session.State = ConversationState.Processing;

        var result = await _pipeline.ProcessTurnAsync(
            session,
            speaker,
            request.RecognizedText,
            request.RecognitionConfidence,
            cancellationToken);

        session.State = result.NextState;
        await _repository.UpdateAsync(session, cancellationToken);

        return new TranslationResponse(
            result.Turn.Id,
            result.Turn.Speaker.ToString(),
            result.Turn.OriginalText,
            result.Turn.TranslatedText,
            result.Turn.SourceLanguage.Code,
            result.Turn.TargetLanguage.Code,
            result.Turn.TranslationConfidence,
            Convert.ToBase64String(result.SynthesizedAudio),
            result.AudioContentType);
    }

    public async Task<IReadOnlyList<ConversationTurnDto>> GetHistoryAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        var session = await GetAuthorizedSessionOrThrow(sessionId, accessToken, cancellationToken);
        if (!session.SaveHistory || session.PrivacyMode == PrivacyMode.Private)
            return [];

        var turns = await _repository.GetTurnsAsync(sessionId, cancellationToken);
        return turns.Select(t => new ConversationTurnDto(
            t.Id,
            t.Speaker.ToString(),
            t.OriginalText,
            t.TranslatedText,
            t.SourceLanguage.Code,
            t.TargetLanguage.Code,
            t.RecognitionConfidence,
            t.TranslationConfidence,
            t.Timestamp)).ToList();
    }

    public async Task DeleteSessionAsync(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken = default)
    {
        if (!await _accessValidator.ValidateAsync(sessionId, accessToken, cancellationToken))
            throw new KeyNotFoundException();

        await _repository.DeleteAsync(sessionId, cancellationToken);
    }

    public Task<bool> ValidateAccessAsync(
        Guid sessionId,
        string? accessToken,
        CancellationToken cancellationToken = default) =>
        _accessValidator.ValidateAsync(sessionId, accessToken, cancellationToken);

    private async Task<ConversationSession> GetAuthorizedSessionOrThrow(
        Guid sessionId,
        string accessToken,
        CancellationToken cancellationToken)
    {
        return await _accessValidator.GetAuthorizedSessionAsync(sessionId, accessToken, cancellationToken)
            ?? throw new KeyNotFoundException();
    }

    private static SessionResponse ToResponse(ConversationSession session) =>
        new(
            session.Id,
            new LanguageDto(session.MyLanguage.Code, session.MyLanguage.Name, session.MyLanguage.NativeName, session.MyLanguage.Region),
            new LanguageDto(session.OtherPersonLanguage.Code, session.OtherPersonLanguage.Name, session.OtherPersonLanguage.NativeName, session.OtherPersonLanguage.Region),
            session.State.ToString(),
            session.PrivacyMode.ToString(),
            session.SaveHistory,
            session.CreatedAt,
            session.StartedAt);
}
