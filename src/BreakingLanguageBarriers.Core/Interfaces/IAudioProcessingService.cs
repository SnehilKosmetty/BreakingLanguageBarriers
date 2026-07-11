using BreakingLanguageBarriers.Core.Entities;

namespace BreakingLanguageBarriers.Core.Interfaces;

public sealed record ProcessedAudioChunk(byte[] Data, float VoiceActivityScore, bool IsSpeech);

public interface IAudioProcessingService
{
    Task<ProcessedAudioChunk> ProcessAsync(AudioChunk chunk, CancellationToken cancellationToken = default);
}
