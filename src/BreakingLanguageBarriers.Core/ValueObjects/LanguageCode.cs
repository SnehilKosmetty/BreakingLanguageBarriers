namespace BreakingLanguageBarriers.Core.ValueObjects;

public sealed record LanguageCode(string Code, string Name, string NativeName, string Region)
{
    public static LanguageCode From(string code, string name, string nativeName, string region = "IN")
        => new(code, name, nativeName, region);

    public override string ToString() => Code;
}
