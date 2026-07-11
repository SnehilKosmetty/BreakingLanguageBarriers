namespace BreakingLanguageBarriers.Infrastructure.Translation;

internal static class LanguageCodeMapper
{
    public static string ToIso639(string languageCode)
    {
        // te-IN -> te, mr-IN -> mr, en-US -> en
        var dash = languageCode.IndexOf('-');
        return dash > 0 ? languageCode[..dash] : languageCode;
    }
}
