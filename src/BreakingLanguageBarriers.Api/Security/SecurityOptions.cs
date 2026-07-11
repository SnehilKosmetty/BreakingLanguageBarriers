namespace BreakingLanguageBarriers.Api.Security;

public sealed class SecurityOptions
{
    public string[] AllowedOrigins { get; set; } = ["http://localhost:5173"];
    public bool AllowAnyOriginInDevelopment { get; set; } = true;
}
