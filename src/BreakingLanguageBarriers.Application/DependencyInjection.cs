using BreakingLanguageBarriers.Application.Pipeline;
using BreakingLanguageBarriers.Application.Security;
using BreakingLanguageBarriers.Application.Services;
using BreakingLanguageBarriers.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;

namespace BreakingLanguageBarriers.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddSingleton<ILanguageCatalog, LanguageCatalogService>();
        services.AddSingleton<ISessionAccessValidator, SessionAccessValidator>();
        services.AddScoped<ConversationSessionService>();
        services.AddScoped<IConversationPipeline, ConversationPipeline>();
        return services;
    }
}
