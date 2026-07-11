using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Infrastructure.Speech;

/// <summary>
/// Development stub for text-to-speech. Replace with Azure Neural TTS, Google WaveNet,
/// or ElevenLabs for natural Indian language voices.
/// </summary>
public sealed class MockTextToSpeechService : ITextToSpeechService
{
    public Task<SynthesizedSpeech> SynthesizeAsync(
        string text,
        LanguageCode language,
        CancellationToken cancellationToken = default)
    {
        // Minimal valid WAV header + silence for development playback testing.
        var audio = CreateSilentWav(16000, 500);
        return Task.FromResult(new SynthesizedSpeech(audio, "audio/wav", 16000));
    }

    private static byte[] CreateSilentWav(int sampleRate, int durationMs)
    {
        var numSamples = sampleRate * durationMs / 1000;
        var dataSize = numSamples * 2;
        var buffer = new byte[44 + dataSize];

        buffer[0] = (byte)'R'; buffer[1] = (byte)'I'; buffer[2] = (byte)'F'; buffer[3] = (byte)'F';
        WriteInt32(buffer, 4, 36 + dataSize);
        buffer[8] = (byte)'W'; buffer[9] = (byte)'A'; buffer[10] = (byte)'V'; buffer[11] = (byte)'E';
        buffer[12] = (byte)'f'; buffer[13] = (byte)'m'; buffer[14] = (byte)'t'; buffer[15] = (byte)' ';
        WriteInt32(buffer, 16, 16);
        WriteInt16(buffer, 20, 1);
        WriteInt16(buffer, 22, 1);
        WriteInt32(buffer, 24, sampleRate);
        WriteInt32(buffer, 28, sampleRate * 2);
        WriteInt16(buffer, 32, 2);
        WriteInt16(buffer, 34, 16);
        buffer[36] = (byte)'d'; buffer[37] = (byte)'a'; buffer[38] = (byte)'t'; buffer[39] = (byte)'a';
        WriteInt32(buffer, 40, dataSize);

        return buffer;
    }

    private static void WriteInt32(byte[] buffer, int offset, int value)
    {
        buffer[offset] = (byte)(value & 0xFF);
        buffer[offset + 1] = (byte)((value >> 8) & 0xFF);
        buffer[offset + 2] = (byte)((value >> 16) & 0xFF);
        buffer[offset + 3] = (byte)((value >> 24) & 0xFF);
    }

    private static void WriteInt16(byte[] buffer, int offset, short value)
    {
        buffer[offset] = (byte)(value & 0xFF);
        buffer[offset + 1] = (byte)((value >> 8) & 0xFF);
    }
}
