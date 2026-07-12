using System.Threading.RateLimiting;
using BreakingLanguageBarriers.Api.Endpoints;
using BreakingLanguageBarriers.Api.Hubs;
using BreakingLanguageBarriers.Api.Security;
using BreakingLanguageBarriers.Application;
using BreakingLanguageBarriers.Infrastructure;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddSingleton<SessionParticipantTracker>();
builder.Services.Configure<SecurityOptions>(builder.Configuration.GetSection("Security"));

builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = builder.Environment.IsDevelopment();
    options.MaximumReceiveMessageSize = 1024 * 1024;
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("api", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 120,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
    options.AddPolicy("sessions", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            }));
});

var securityOptions = builder.Configuration.GetSection("Security").Get<SecurityOptions>()
    ?? new SecurityOptions();

var extraOrigins = builder.Configuration["CORS_ALLOWED_ORIGINS"];
if (!string.IsNullOrWhiteSpace(extraOrigins))
{
    securityOptions.AllowedOrigins = securityOptions.AllowedOrigins
        .Concat(extraOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClients", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod().AllowCredentials();

        if (builder.Environment.IsDevelopment() && securityOptions.AllowAnyOriginInDevelopment)
        {
            policy.SetIsOriginAllowed(_ => true);
        }
        else
        {
            policy.WithOrigins(securityOptions.AllowedOrigins);
        }
    });
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseCors("AllowClients");
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseRateLimiter();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
    app.UseHsts();
}

app.MapGet("/", () => Results.Ok(new
{
    name = "Breaking Language Barriers API",
    mission = "Breaking Language Barriers with AI",
    health = "/api/v1/health"
}));

app.MapConversationEndpoints();
app.MapHub<ConversationHub>("/hubs/conversation");

app.Run();

public partial class Program;
