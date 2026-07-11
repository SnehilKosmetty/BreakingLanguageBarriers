using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Enums;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Application.Services;

public sealed class LanguageCatalogService : ILanguageCatalog
{
    private static readonly LanguageCode[] IndianLanguages =
    [
        LanguageCode.From("te-IN", "Telugu", "తెలుగు"),
        LanguageCode.From("mr-IN", "Marathi", "मराठी"),
        LanguageCode.From("hi-IN", "Hindi", "हिन्दी"),
        LanguageCode.From("ta-IN", "Tamil", "தமிழ்"),
        LanguageCode.From("kn-IN", "Kannada", "ಕನ್ನಡ"),
        LanguageCode.From("ml-IN", "Malayalam", "മലയാളം"),
        LanguageCode.From("bn-IN", "Bengali", "বাংলা"),
        LanguageCode.From("gu-IN", "Gujarati", "ગુજરાતી"),
        LanguageCode.From("pa-IN", "Punjabi", "ਪੰਜਾਬੀ"),
        LanguageCode.From("or-IN", "Odia", "ଓଡ଼ିଆ"),
        LanguageCode.From("as-IN", "Assamese", "অসমীয়া"),
        LanguageCode.From("ur-IN", "Urdu", "اردو"),
        LanguageCode.From("kok-IN", "Konkani", "कोंकणी"),
        LanguageCode.From("sa-IN", "Sanskrit", "संस्कृतम्"),
        LanguageCode.From("ks-IN", "Kashmiri", "کٲشُر"),
        LanguageCode.From("mni-IN", "Manipuri", "ꯃꯤꯇꯩ ꯂꯣꯟ"),
        LanguageCode.From("ne-IN", "Nepali", "नेपाली"),
        LanguageCode.From("brx-IN", "Bodo", "बड़ो"),
        LanguageCode.From("doi-IN", "Dogri", "डोगरी"),
        LanguageCode.From("mai-IN", "Maithili", "मैथिली"),
        LanguageCode.From("sat-IN", "Santali", "ᱥᱟᱱᱛᱟᱲᱤ"),
        LanguageCode.From("sd-IN", "Sindhi", "سنڌي")
    ];

    private static readonly LanguageCode[] InternationalLanguages =
    [
        LanguageCode.From("en-US", "English", "English", "US"),
        LanguageCode.From("es-ES", "Spanish", "Español", "ES"),
        LanguageCode.From("fr-FR", "French", "Français", "FR"),
        LanguageCode.From("de-DE", "German", "Deutsch", "DE"),
        LanguageCode.From("it-IT", "Italian", "Italiano", "IT"),
        LanguageCode.From("pt-BR", "Portuguese", "Português", "BR"),
        LanguageCode.From("zh-CN", "Mandarin Chinese", "普通话", "CN"),
        LanguageCode.From("ja-JP", "Japanese", "日本語", "JP"),
        LanguageCode.From("ko-KR", "Korean", "한국어", "KR"),
        LanguageCode.From("ar-SA", "Arabic", "العربية", "SA"),
        LanguageCode.From("ru-RU", "Russian", "Русский", "RU"),
        LanguageCode.From("tr-TR", "Turkish", "Türkçe", "TR"),
        LanguageCode.From("nl-NL", "Dutch", "Nederlands", "NL"),
        LanguageCode.From("vi-VN", "Vietnamese", "Tiếng Việt", "VN"),
        LanguageCode.From("th-TH", "Thai", "ไทย", "TH")
    ];

    private readonly Dictionary<string, LanguageCode> _byCode;

    public LanguageCatalogService()
    {
        _byCode = GetAll().ToDictionary(l => l.Code, StringComparer.OrdinalIgnoreCase);
    }

    public IReadOnlyList<LanguageCode> GetAll() =>
        IndianLanguages.Concat(InternationalLanguages).ToList();

    public LanguageCode? GetByCode(string code) =>
        _byCode.GetValueOrDefault(code);

    public IReadOnlyList<LanguageCode> GetIndianLanguages() => IndianLanguages;

    public IReadOnlyList<LanguageCode> GetInternationalLanguages() => InternationalLanguages;
}
