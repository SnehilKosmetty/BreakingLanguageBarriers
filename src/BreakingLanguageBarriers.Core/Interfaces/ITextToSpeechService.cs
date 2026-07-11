using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Core.Interfaces;

public sealed record SynthesizedSpeech(byte[] AudioData, string ContentType, int SampleRate);

public interface ITextToSpeechService
{
    Task<SynthesizedSpeech> SynthesizeAsync(
        string text,
        LanguageCode language,
        CancellationToken cancellationToken = default);
}
