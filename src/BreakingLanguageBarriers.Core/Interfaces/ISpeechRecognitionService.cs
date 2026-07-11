using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Core.Interfaces;

public sealed record SpeechRecognitionResult(
    string Text,
    float Confidence,
    bool IsFinal,
    LanguageCode DetectedLanguage);

public interface ISpeechRecognitionService
{
    IAsyncEnumerable<SpeechRecognitionResult> RecognizeStreamAsync(
        IAsyncEnumerable<AudioChunk> audioStream,
        LanguageCode sourceLanguage,
        CancellationToken cancellationToken = default);
}
