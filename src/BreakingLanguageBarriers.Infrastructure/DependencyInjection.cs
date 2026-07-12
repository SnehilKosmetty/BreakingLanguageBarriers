using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Infrastructure.Audio;
using BreakingLanguageBarriers.Infrastructure.Persistence;
using BreakingLanguageBarriers.Infrastructure.Speech;
using BreakingLanguageBarriers.Infrastructure.Translation;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace BreakingLanguageBarriers.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<TranslationOptions>(configuration.GetSection("AiServices:Translation"));
        services.Configure<SpeechServiceOptions>(configuration.GetSection("AiServices:TextToSpeech"));

        services.AddSingleton<IConversationSessionRepository, InMemoryConversationSessionRepository>();
        services.AddSingleton<IAudioProcessingService, PassthroughAudioProcessingService>();

        services.AddSingleton<ISpeechRecognitionService, MockSpeechRecognitionService>();

        services.AddSingleton<MockTextToSpeechService>();
        services.AddHttpClient<AzureTextToSpeechService>();

        services.AddSingleton<ITextToSpeechService>(sp =>
            ResolveTextToSpeech(sp, configuration));

        services.AddHttpClient<MyMemoryTranslationService>();
        services.AddHttpClient<AzureTranslationService>();

        services.AddSingleton<ITranslationService>(sp =>
            ResolveTranslation(sp, configuration));

        return services;
    }

    private static ITextToSpeechService ResolveTextToSpeech(
        IServiceProvider sp,
        IConfiguration configuration)
    {
        var options = configuration.GetSection("AiServices:TextToSpeech").Get<SpeechServiceOptions>()
            ?? new SpeechServiceOptions();

        if (options.Provider.Equals("Azure", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(options.AzureSpeechKey))
        {
            return sp.GetRequiredService<AzureTextToSpeechService>();
        }

        return sp.GetRequiredService<MockTextToSpeechService>();
    }

    private static ITranslationService ResolveTranslation(
        IServiceProvider sp,
        IConfiguration configuration)
    {
        var options = configuration.GetSection("AiServices:Translation").Get<TranslationOptions>()
            ?? new TranslationOptions();

        if (options.Provider.Equals("Azure", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(options.AzureTranslatorKey))
        {
            return sp.GetRequiredService<AzureTranslationService>();
        }

        return sp.GetRequiredService<MyMemoryTranslationService>();
    }
}
