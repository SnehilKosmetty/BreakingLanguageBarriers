using BreakingLanguageBarriers.Application.DTOs;
using BreakingLanguageBarriers.Application.Services;
using BreakingLanguageBarriers.Api.Security;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Infrastructure;
using Microsoft.AspNetCore.Mvc;

namespace BreakingLanguageBarriers.Api.Endpoints;

public static class ConversationEndpoints
{
    public static RouteGroupBuilder MapConversationEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1")
            .WithTags("Breaking Language Barriers")
            .RequireRateLimiting("api");

        group.MapGet("/health", () => Results.Ok(new
        {
            status = "healthy",
            mission = "Breaking Language Barriers with AI",
            timestamp = DateTimeOffset.UtcNow
        }));

        group.MapGet("/ai-status", (IConfiguration configuration) =>
        {
            var status = AiProviderStatus.FromConfiguration(configuration);
            return Results.Ok(status);
        });

        group.MapGet("/languages", (ILanguageCatalog catalog) =>
        {
            var languages = catalog.GetAll().Select(l => new LanguageDto(l.Code, l.Name, l.NativeName, l.Region));
            return Results.Ok(languages);
        });

        group.MapGet("/languages/indian", (ILanguageCatalog catalog) =>
        {
            var languages = catalog.GetIndianLanguages().Select(l => new LanguageDto(l.Code, l.Name, l.NativeName, l.Region));
            return Results.Ok(languages);
        });

        group.MapGet("/languages/international", (ILanguageCatalog catalog) =>
        {
            var languages = catalog.GetInternationalLanguages().Select(l => new LanguageDto(l.Code, l.Name, l.NativeName, l.Region));
            return Results.Ok(languages);
        });

        group.MapPost("/sessions", async (CreateSessionRequest request, ConversationSessionService service, CancellationToken ct) =>
        {
            try
            {
                var created = await service.CreateSessionAsync(request, ct);
                return Results.Created($"/api/v1/sessions/{created.Session.Id}", created);
            }
            catch (ArgumentException)
            {
                return Results.BadRequest(new { error = "Invalid request." });
            }
        });

        group.MapGet("/sessions/{sessionId:guid}", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                var session = await service.GetSessionAsync(sessionId, token, ct);
                return Results.Ok(session);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/start", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                return Results.Ok(await service.StartAsync(sessionId, token, ct));
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/stop", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                return Results.Ok(await service.StopAsync(sessionId, token, ct));
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/pause", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                return Results.Ok(await service.PauseAsync(sessionId, token, ct));
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/resume", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                return Results.Ok(await service.ResumeAsync(sessionId, token, ct));
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapPost("/sessions/{sessionId:guid}/translate", async (
            Guid sessionId,
            HttpContext http,
            ProcessSpeechRequest request,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            if (request.SessionId != sessionId)
                return Results.BadRequest(new { error = "Invalid request." });

            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                return Results.Ok(await service.ProcessSpeechAsync(request, token, ct));
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
            catch (InvalidOperationException)
            {
                return Results.Conflict(new { error = "Session is not accepting speech." });
            }
        });

        group.MapGet("/sessions/{sessionId:guid}/history", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            try
            {
                var token = http.GetSessionToken();
                if (string.IsNullOrWhiteSpace(token))
                    return Results.NotFound();

                var history = await service.GetHistoryAsync(sessionId, token, ct);
                return Results.Ok(history);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapDelete("/sessions/{sessionId:guid}/history", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            var token = http.GetSessionToken();
            if (string.IsNullOrWhiteSpace(token))
                return Results.NotFound();

            try
            {
                await service.ClearDisplayAsync(sessionId, token, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        group.MapDelete("/sessions/{sessionId:guid}", async (
            Guid sessionId,
            HttpContext http,
            ConversationSessionService service,
            CancellationToken ct) =>
        {
            var token = http.GetSessionToken();
            if (string.IsNullOrWhiteSpace(token))
                return Results.NotFound();

            try
            {
                await service.DeleteSessionAsync(sessionId, token, ct);
                return Results.NoContent();
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound();
            }
        });

        return group;
    }
}
