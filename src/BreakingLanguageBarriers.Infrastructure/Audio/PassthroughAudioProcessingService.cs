using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Interfaces;

namespace BreakingLanguageBarriers.Infrastructure.Audio;

/// <summary>
/// Placeholder audio processor. Replace with WebRTC AEC, noise suppression,
/// and speaker separation when integrating production audio SDKs.
/// </summary>
public sealed class PassthroughAudioProcessingService : IAudioProcessingService
{
    public Task<ProcessedAudioChunk> ProcessAsync(AudioChunk chunk, CancellationToken cancellationToken = default)
    {
        var hasSpeech = chunk.Data.Length > 0;
        return Task.FromResult(new ProcessedAudioChunk(chunk.Data, hasSpeech ? 0.85f : 0.1f, hasSpeech));
    }
}
