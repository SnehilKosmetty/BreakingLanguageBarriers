namespace BreakingLanguageBarriers.Infrastructure.Speech;

public sealed class SpeechServiceOptions
{
    public string Provider { get; set; } = "Mock";
    public string AzureSpeechKey { get; set; } = string.Empty;
    public string AzureSpeechRegion { get; set; } = "centralindia";
}
