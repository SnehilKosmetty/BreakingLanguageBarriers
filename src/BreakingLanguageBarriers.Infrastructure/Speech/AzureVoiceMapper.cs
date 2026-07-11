namespace BreakingLanguageBarriers.Infrastructure.Speech;

internal static class AzureVoiceMapper
{
    private static readonly Dictionary<string, string> Voices = new(StringComparer.OrdinalIgnoreCase)
    {
        ["te-IN"] = "te-IN-ShrutiNeural",
        ["mr-IN"] = "mr-IN-AarohiNeural",
        ["hi-IN"] = "hi-IN-SwaraNeural",
        ["ta-IN"] = "ta-IN-PallaviNeural",
        ["kn-IN"] = "kn-IN-SapnaNeural",
        ["ml-IN"] = "ml-IN-SobhanaNeural",
        ["bn-IN"] = "bn-IN-TanishaaNeural",
        ["gu-IN"] = "gu-IN-DhwaniNeural",
        ["pa-IN"] = "pa-IN-VaaniNeural",
        ["or-IN"] = "or-IN-SubhasiniNeural",
        ["as-IN"] = "as-IN-YashicaNeural",
        ["ur-IN"] = "ur-IN-GulNeural",
        ["en-IN"] = "en-IN-NeerjaNeural",
        ["en-US"] = "en-US-JennyNeural",
        ["en-GB"] = "en-GB-SoniaNeural",
        ["es-ES"] = "es-ES-ElviraNeural",
        ["fr-FR"] = "fr-FR-DeniseNeural",
        ["de-DE"] = "de-DE-KatjaNeural",
        ["ja-JP"] = "ja-JP-NanamiNeural",
        ["ko-KR"] = "ko-KR-SunHiNeural",
        ["zh-CN"] = "zh-CN-XiaoxiaoNeural",
        ["ar-SA"] = "ar-SA-ZariyahNeural",
    };

    public static string GetVoiceName(string languageCode)
    {
        if (Voices.TryGetValue(languageCode, out var voice))
            return voice;

        var prefix = languageCode.Split('-')[0];
        var fallback = Voices.FirstOrDefault(v =>
            v.Key.StartsWith(prefix + "-", StringComparison.OrdinalIgnoreCase));

        return fallback.Value ?? "en-IN-NeerjaNeural";
    }

    public static string GetSpeechLocale(string languageCode)
    {
        if (languageCode.Contains('-', StringComparison.Ordinal))
            return languageCode;

        return languageCode switch
        {
            "te" => "te-IN",
            "mr" => "mr-IN",
            "hi" => "hi-IN",
            "ta" => "ta-IN",
            "kn" => "kn-IN",
            "ml" => "ml-IN",
            "bn" => "bn-IN",
            "gu" => "gu-IN",
            "pa" => "pa-IN",
            "en" => "en-IN",
            _ => "en-IN"
        };
    }
}
