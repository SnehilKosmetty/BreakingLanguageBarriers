using BreakingLanguageBarriers.Application.DTOs;
using BreakingLanguageBarriers.Application.Services;
using Microsoft.AspNetCore.SignalR;

namespace BreakingLanguageBarriers.Api.Hubs;

public sealed class ConversationHub : Hub
{
    private readonly ConversationSessionService _sessionService;
    private readonly SessionParticipantTracker _participants;
    private readonly ILogger<ConversationHub> _logger;

    public ConversationHub(
        ConversationSessionService sessionService,
        SessionParticipantTracker participants,
        ILogger<ConversationHub> logger)
    {
        _sessionService = sessionService;
        _participants = participants;
        _logger = logger;
    }

    public async Task JoinSession(string sessionId, string accessToken, string role = "guest")
    {
        try
        {
            if (!Guid.TryParse(sessionId, out var id)
                || !await _sessionService.ValidateAccessAsync(id, accessToken))
            {
                throw new HubException("Unauthorized");
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, sessionId);
            var count = _participants.Join(sessionId, Context.ConnectionId, role);
            _logger.LogInformation("Participant joined session {SessionId} as {Role}", sessionId, role);

            await Clients.Group(sessionId).SendAsync("ParticipantJoined", new
            {
                role,
                participantCount = count
            });
        }
        catch (HubException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to join session {SessionId}", sessionId);
            throw new HubException("Could not join session.");
        }
    }

    public async Task LeaveSession(string sessionId, string accessToken)
    {
        try
        {
            if (!Guid.TryParse(sessionId, out var id)
                || !await _sessionService.ValidateAccessAsync(id, accessToken))
            {
                throw new HubException("Unauthorized");
            }

            await Groups.RemoveFromGroupAsync(Context.ConnectionId, sessionId);
            var count = _participants.Leave(sessionId, Context.ConnectionId);
            await Clients.Group(sessionId).SendAsync("ParticipantLeft", new
            {
                participantCount = count
            });
        }
        catch (HubException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to leave session {SessionId}", sessionId);
            throw new HubException("Could not leave session.");
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        foreach (var sessionId in _participants.GetSessionIdsForConnection(connectionId))
        {
            var count = _participants.Leave(sessionId, connectionId);
            await Clients.Group(sessionId).SendAsync("ParticipantLeft", new
            {
                participantCount = count
            });
        }

        await base.OnDisconnectedAsync(exception);
    }

    public async Task StartConversation(string sessionId, string accessToken)
    {
        await RequireAndRun(sessionId, accessToken, async id =>
        {
            var response = await _sessionService.StartAsync(id, accessToken);
            await Clients.Group(sessionId).SendAsync("ConversationStarted", response);
        });
    }

    public async Task StopConversation(string sessionId, string accessToken)
    {
        await RequireAndRun(sessionId, accessToken, async id =>
        {
            var response = await _sessionService.StopAsync(id, accessToken);
            await Clients.Group(sessionId).SendAsync("ConversationStopped", response);
        });
    }

    public async Task PauseConversation(string sessionId, string accessToken)
    {
        await RequireAndRun(sessionId, accessToken, async id =>
        {
            var response = await _sessionService.PauseAsync(id, accessToken);
            await Clients.Group(sessionId).SendAsync("ConversationPaused", response);
        });
    }

    public async Task ResumeConversation(string sessionId, string accessToken)
    {
        await RequireAndRun(sessionId, accessToken, async id =>
        {
            var response = await _sessionService.ResumeAsync(id, accessToken);
            await Clients.Group(sessionId).SendAsync("ConversationResumed", response);
        });
    }

    public async Task SubmitRecognizedSpeech(ProcessSpeechRequest request, string accessToken)
    {
        try
        {
            if (!await _sessionService.ValidateAccessAsync(request.SessionId, accessToken))
                throw new HubException("Unauthorized");

            var result = await _sessionService.ProcessSpeechAsync(request, accessToken);
            // Text only over SignalR — audio is played client-side (keeps messages small).
            var lite = new TranslationResponse(
                result.TurnId,
                result.Speaker,
                result.OriginalText,
                result.TranslatedText,
                result.SourceLanguage,
                result.TargetLanguage,
                result.TranslationConfidence,
                string.Empty,
                result.AudioContentType);
            await Clients.Group(request.SessionId.ToString()).SendAsync("TranslationReady", lite);
        }
        catch (HubException)
        {
            throw;
        }
        catch (KeyNotFoundException)
        {
            throw new HubException("Session not found.");
        }
        catch (InvalidOperationException)
        {
            throw new HubException("Session is not accepting speech.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process speech for session {SessionId}", request.SessionId);
            throw new HubException("Translation failed.");
        }
    }

    public async Task SendAudioChunk(string sessionId, string accessToken, byte[] audioData, bool isFinal)
    {
        if (!Guid.TryParse(sessionId, out var id)
            || !await _sessionService.ValidateAccessAsync(id, accessToken))
        {
            throw new HubException("Unauthorized");
        }

        await Clients.OthersInGroup(sessionId).SendAsync("AudioChunkReceived", audioData, isFinal);
    }

    private async Task RequireAndRun(string sessionId, string accessToken, Func<Guid, Task> action)
    {
        try
        {
            if (!Guid.TryParse(sessionId, out var id)
                || !await _sessionService.ValidateAccessAsync(id, accessToken))
            {
                throw new HubException("Unauthorized");
            }

            await action(id);
        }
        catch (HubException)
        {
            throw;
        }
        catch (KeyNotFoundException)
        {
            throw new HubException("Session not found. Try starting again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Hub error for session {SessionId}", sessionId);
            throw new HubException("A server error occurred.");
        }
    }
}
