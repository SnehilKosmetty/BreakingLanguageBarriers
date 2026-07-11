using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Infrastructure.Speech;

/// <summary>
/// Development stub for speech recognition. Wire to Azure Speech, Google Cloud STT,
/// or Whisper for production Indian-language accuracy.
/// </summary>
public sealed class MockSpeechRecognitionService : ISpeechRecognitionService
{
    public async IAsyncEnumerable<SpeechRecognitionResult> RecognizeStreamAsync(
        IAsyncEnumerable<AudioChunk> audioStream,
        LanguageCode sourceLanguage,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        await foreach (var chunk in audioStream.WithCancellation(cancellationToken))
        {
            if (!chunk.IsFinal || chunk.Data.Length == 0)
                continue;

            yield return new SpeechRecognitionResult(
                $"[{sourceLanguage.Name} speech detected]",
                0.92f,
                true,
                sourceLanguage);
        }
    }
}
