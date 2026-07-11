using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Core.Interfaces;

public interface ILanguageCatalog
{
    IReadOnlyList<LanguageCode> GetAll();
    LanguageCode? GetByCode(string code);
    IReadOnlyList<LanguageCode> GetIndianLanguages();
    IReadOnlyList<LanguageCode> GetInternationalLanguages();
}
