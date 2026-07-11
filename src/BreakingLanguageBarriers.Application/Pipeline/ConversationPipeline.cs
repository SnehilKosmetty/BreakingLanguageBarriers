using BreakingLanguageBarriers.Core.Entities;
using BreakingLanguageBarriers.Core.Enums;
using BreakingLanguageBarriers.Core.Interfaces;
using BreakingLanguageBarriers.Core.ValueObjects;

namespace BreakingLanguageBarriers.Application.Pipeline;

public sealed class ConversationPipeline : IConversationPipeline
{
    private readonly ITranslationService _translationService;
    private readonly ITextToSpeechService _textToSpeechService;
    private readonly IConversationSessionRepository _repository;

    public ConversationPipeline(
        ITranslationService translationService,
        ITextToSpeechService textToSpeechService,
        IConversationSessionRepository repository)
    {
        _translationService = translationService;
        _textToSpeechService = textToSpeechService;
        _repository = repository;
    }

    public async Task<PipelineTurnResult> ProcessTurnAsync(
        ConversationSession session,
        SpeakerRole speaker,
        string recognizedText,
        float recognitionConfidence,
        CancellationToken cancellationToken = default)
    {
        var (sourceLanguage, targetLanguage) = ResolveLanguages(session, speaker);

        var translation = await _translationService.TranslateAsync(
            recognizedText,
            sourceLanguage,
            targetLanguage,
            cancellationToken);

        var synthesized = await _textToSpeechService.SynthesizeAsync(
            translation.TranslatedText,
            targetLanguage,
            cancellationToken);

        var turn = new ConversationTurn
        {
            SessionId = session.Id,
            Speaker = speaker,
            SourceLanguage = sourceLanguage,
            TargetLanguage = targetLanguage,
            OriginalText = recognizedText,
            TranslatedText = translation.TranslatedText,
            RecognitionConfidence = recognitionConfidence,
            TranslationConfidence = translation.Confidence,
            SynthesizedAudio = synthesized.AudioData
        };

        if (session.SaveHistory && session.PrivacyMode != PrivacyMode.Private)
            await _repository.AddTurnAsync(turn, cancellationToken);
        else
            turn.SynthesizedAudio = null;

        return new PipelineTurnResult(turn, synthesized.AudioData, synthesized.ContentType, ConversationState.Speaking);
    }

    private static (LanguageCode Source, LanguageCode Target) ResolveLanguages(
        ConversationSession session,
        SpeakerRole speaker) =>
        speaker switch
        {
            SpeakerRole.LocalUser => (session.MyLanguage, session.OtherPersonLanguage),
            SpeakerRole.RemoteUser => (session.OtherPersonLanguage, session.MyLanguage),
            _ => throw new ArgumentOutOfRangeException(nameof(speaker))
        };
}
