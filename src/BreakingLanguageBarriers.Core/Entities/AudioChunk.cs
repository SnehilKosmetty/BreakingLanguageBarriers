namespace BreakingLanguageBarriers.Core.Entities;

public sealed class AudioChunk
{
    public required byte[] Data { get; init; }
    public int SampleRate { get; init; } = 16000;
    public int Channels { get; init; } = 1;
    public string Encoding { get; init; } = "pcm16";
    public DateTimeOffset Timestamp { get; init; } = DateTimeOffset.UtcNow;
    public bool IsFinal { get; init; }
}
