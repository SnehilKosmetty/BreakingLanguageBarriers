using BreakingLanguageBarriers.Application.Services;
using BreakingLanguageBarriers.Core.Interfaces;

namespace BreakingLanguageBarriers.Tests;

public class LanguageCatalogServiceTests
{
    [Fact]
    public void GetIndianLanguages_ReturnsAll22ScheduledLanguages()
    {
        var catalog = new LanguageCatalogService();
        var languages = catalog.GetIndianLanguages();

        Assert.Equal(22, languages.Count);
        Assert.Contains(languages, l => l.Code == "te-IN");
        Assert.Contains(languages, l => l.Code == "mr-IN");
    }

    [Fact]
    public void GetInternationalLanguages_IncludesMajorWorldLanguages()
    {
        var catalog = new LanguageCatalogService();
        var languages = catalog.GetInternationalLanguages();

        Assert.Contains(languages, l => l.Code == "en-US");
        Assert.Contains(languages, l => l.Code == "zh-CN");
        Assert.Contains(languages, l => l.Code == "ja-JP");
    }

    [Fact]
    public void GetByCode_ReturnsLanguage_WhenCodeExists()
    {
        var catalog = new LanguageCatalogService();
        var telugu = catalog.GetByCode("te-IN");

        Assert.NotNull(telugu);
        Assert.Equal("Telugu", telugu.Name);
    }
}
