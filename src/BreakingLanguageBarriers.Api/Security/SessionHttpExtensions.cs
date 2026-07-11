namespace BreakingLanguageBarriers.Api.Security;

public static class SessionHttpExtensions
{
    public const string TokenHeader = "X-Session-Token";

    public static string? GetSessionToken(this HttpContext context) =>
        context.Request.Headers[TokenHeader].FirstOrDefault()
        ?? context.Request.Query["token"].FirstOrDefault();
}
