using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Enums;

namespace BreakingLanguageBarriers.Core.Interfaces;

public sealed record PipelineTurnResult(
    ConversationTurn Turn,
    byte[] SynthesizedAudio,
    string AudioContentType,
    ConversationState NextState);

public interface IConversationPipeline
{
    Task<PipelineTurnResult> ProcessTurnAsync(
        ConversationSession session,
        SpeakerRole speaker,
        string recognizedText,
        float recognitionConfidence,
        CancellationToken cancellationToken = default);
}
