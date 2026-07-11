namespace BreakingLanguageBarriers.Api.Security;

public sealed class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
        context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
        context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
        context.Response.Headers.TryAdd("Permissions-Policy", "microphone=(self), camera=()");
        context.Response.Headers.TryAdd("Cache-Control", "no-store");
        context.Response.Headers.TryAdd("Pragma", "no-cache");

        if (context.Request.IsHttps)
            context.Response.Headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

        await _next(context);
    }
}
