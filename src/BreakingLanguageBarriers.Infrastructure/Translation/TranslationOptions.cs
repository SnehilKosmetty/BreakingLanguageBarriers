namespace BreakingLanguageBarriers.Infrastructure.Translation;

public sealed class TranslationOptions
{
    public string Provider { get; set; } = "MyMemory";
    public string AzureTranslatorKey { get; set; } = string.Empty;
    public string AzureTranslatorRegion { get; set; } = "centralindia";
}
