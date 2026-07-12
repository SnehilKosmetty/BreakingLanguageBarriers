namespace BreakingLanguageBarriers.Application.DTOs;

public sealed record LanguageDto(string Code, string Name, string NativeName, string Region);

public sealed record CreateSessionRequest(
    string MyLanguageCode,
    string OtherPersonLanguageCode,
    bool SaveHistory = true,
    string PrivacyMode = "Standard");

public sealed record SessionResponse(
    Guid Id,
    LanguageDto MyLanguage,
    LanguageDto OtherPersonLanguage,
    string State,
    string PrivacyMode,
    bool SaveHistory,
    DateTimeOffset CreatedAt,
    DateTimeOffset? StartedAt);

public sealed record ConversationTurnDto(
    Guid Id,
    string Speaker,
    string OriginalText,
    string TranslatedText,
    string SourceLanguage,
    string TargetLanguage,
    float RecognitionConfidence,
    float TranslationConfidence,
    DateTimeOffset Timestamp);

public sealed record StartConversationRequest(Guid SessionId);

public sealed record StopConversationRequest(Guid SessionId);

public sealed record ProcessSpeechRequest(
    Guid SessionId,
    string Speaker,
    string RecognizedText,
    float RecognitionConfidence);

public sealed record TranslationResponse(
    Guid TurnId,
    string Speaker,
    string OriginalText,
    string TranslatedText,
    string SourceLanguage,
    string TargetLanguage,
    float TranslationConfidence,
    string AudioBase64,
    string AudioContentType);

public sealed record SpeakRequest(string Text, string LanguageCode);

public sealed record SpeakResponse(string AudioBase64, string AudioContentType);
