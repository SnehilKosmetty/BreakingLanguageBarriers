# Breaking Language Barriers with AI

> **Mission:** Remove language barriers so anyone speaking different languages can communicate naturally, as if they were speaking the same language.

An AI-powered real-time communication platform with a **C# / .NET** backend. Continuous listening, translation, and speech — no repeated microphone taps.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Apps                                   │
│   Web (React) · Android · iOS · Windows · macOS · Linux          │
│   Continuous mic capture · WebRTC · Responsive UI                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST + SignalR (WebSocket)
┌───────────────────────────▼─────────────────────────────────────┐
│              BreakingLanguageBarriers.Api                        │
│   REST endpoints · ConversationHub (real-time)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│           BreakingLanguageBarriers.Application                   │
│   ConversationSessionService · ConversationPipeline              │
│   LanguageCatalogService                                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│          BreakingLanguageBarriers.Infrastructure                   │
│   Speech Recognition · Translation · Text-to-Speech              │
│   Audio Processing · Session Persistence                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│              BreakingLanguageBarriers.Core                         │
│   Domain entities · Interfaces · Language definitions            │
└─────────────────────────────────────────────────────────────────┘
```

### Solution Structure

| Project | Purpose |
|---------|---------|
| `BreakingLanguageBarriers.Core` | Domain models, enums, service interfaces |
| `BreakingLanguageBarriers.Application` | Business logic, pipeline orchestration |
| `BreakingLanguageBarriers.Infrastructure` | AI provider implementations, persistence |
| `BreakingLanguageBarriers.Api` | ASP.NET Core API + SignalR hub |
| `BreakingLanguageBarriers.Tests` | Unit tests |
| `client` | React web app (continuous voice UI) |

---

## Web Client

The `client/` folder is a **React + TypeScript** web app that connects to the .NET API.

### Features

- Language picker (22 Indian + international languages)
- **Start / Stop / Pause / Resume** — no repeated mic taps
- Continuous speech recognition (Web Speech API)
- Real-time translation via SignalR
- Auto-play translated audio
- Conversation feed with replay
- Private mode and history controls
- Responsive layout (phone, tablet, desktop)

### Run the full stack

**Terminal 1 — Backend API:**
```bash
dotnet run --project src/BreakingLanguageBarriers.Api
```

**Terminal 2 — Web client:**
```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173** in Chrome or Edge (best speech recognition support).

### How to test

1. Select **My Language** (e.g. Telugu) and **Other Person Language** (e.g. Marathi)
2. Press **Start** and allow microphone access
3. Speak naturally — the app listens continuously
4. See original text + translation in the feed; translated audio plays automatically
5. Toggle **Me / Other person** before Start to simulate two-way conversation
6. Press **Stop** when done

---

## Core Workflow

```
User selects: My Language (Telugu) + Other Person Language (Marathi)
       ↓
Press Start → continuous listening begins
       ↓
Telugu Speech → Speech Recognition → Translate to Marathi → Speak Marathi
       ↓
Marathi Speech → Speech Recognition → Translate to Telugu → Speak Telugu
       ↓
Cycle continues until Stop
```

---

## Language Support

**22 Indian languages** (primary focus): Telugu, Marathi, Hindi, Tamil, Kannada, Malayalam, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu, Konkani, Sanskrit, Kashmiri, Manipuri, Nepali, Bodo, Dogri, Maithili, Santali, Sindhi.

**15 international languages**: English, Spanish, French, German, Italian, Portuguese, Mandarin, Japanese, Korean, Arabic, Russian, Turkish, Dutch, Vietnamese, Thai.

---

## Getting Started

### Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)

### Run the API

```bash
cd src/BreakingLanguageBarriers.Api
dotnet run
```

API runs at `https://localhost:7xxx` (see console output).

### Run Tests

```bash
dotnet test
```

---

## API Reference

### REST Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/languages` | All supported languages |
| `GET` | `/api/v1/languages/indian` | Indian languages only |
| `GET` | `/api/v1/languages/international` | International languages |
| `POST` | `/api/v1/sessions` | Create a conversation session |
| `GET` | `/api/v1/sessions/{id}` | Get session details |
| `POST` | `/api/v1/sessions/{id}/start` | Start continuous conversation |
| `POST` | `/api/v1/sessions/{id}/stop` | Stop conversation |
| `POST` | `/api/v1/sessions/{id}/pause` | Pause translation |
| `POST` | `/api/v1/sessions/{id}/resume` | Resume conversation |
| `POST` | `/api/v1/sessions/{id}/translate` | Process recognized speech |
| `GET` | `/api/v1/sessions/{id}/history` | Get conversation history |
| `DELETE` | `/api/v1/sessions/{id}` | Delete session |

### Create Session Example

```json
POST /api/v1/sessions
{
  "myLanguageCode": "te-IN",
  "otherPersonLanguageCode": "mr-IN",
  "saveHistory": true,
  "privacyMode": "Standard"
}
```

### SignalR Hub

Connect to `/hubs/conversation` for real-time communication:

| Method | Description |
|--------|-------------|
| `JoinSession(sessionId)` | Join a conversation room |
| `StartConversation(sessionId)` | Begin continuous listening |
| `StopConversation(sessionId)` | End conversation |
| `SubmitRecognizedSpeech(request)` | Send recognized text for translation |
| `SendAudioChunk(sessionId, audio, isFinal)` | Stream audio chunks |

| Event | Description |
|-------|-------------|
| `ConversationStarted` | Session is now listening |
| `TranslationReady` | Translated text + audio ready |
| `ConversationStopped` | Session ended |

---

## AI Provider Integration

The app supports **Azure** for production quality and **MyMemory/Mock** for testing without keys.

| Capability | Default (no keys) | With Azure keys |
|------------|-------------------|-----------------|
| Speech recognition | Browser Web Speech API | Azure STT (future audio stream) |
| Translation | MyMemory (free) | Azure Translator |
| Text-to-speech | Mock (silent) | **Azure Neural TTS** (Telugu, Marathi, Hindi, etc.) |

Check active providers: `GET /api/v1/ai-status`

### Enable Azure (recommended)

1. Create resources in [Azure Portal](https://portal.azure.com):
   - **Speech** resource (for neural voices)
   - **Translator** resource (optional, better translation)

2. Store keys securely with **User Secrets** (never commit keys):

```bash
cd src/BreakingLanguageBarriers.Api

dotnet user-secrets set "AiServices:TextToSpeech:Provider" "Azure"
dotnet user-secrets set "AiServices:TextToSpeech:AzureSpeechKey" "YOUR_SPEECH_KEY"
dotnet user-secrets set "AiServices:TextToSpeech:AzureSpeechRegion" "centralindia"

# Optional — better translation
dotnet user-secrets set "AiServices:Translation:Provider" "Azure"
dotnet user-secrets set "AiServices:Translation:AzureTranslatorKey" "YOUR_TRANSLATOR_KEY"
dotnet user-secrets set "AiServices:Translation:AzureTranslatorRegion" "centralindia"
```

3. Restart the API. The status bar shows `Voice: Azure` when configured.

### Indian neural voices (examples)

| Language | Azure voice |
|----------|-------------|
| Telugu | te-IN-ShrutiNeural |
| Marathi | mr-IN-AarohiNeural |
| Hindi | hi-IN-SwaraNeural |
| Tamil | ta-IN-PallaviNeural |
| English (India) | en-IN-NeerjaNeural |

---

## Privacy

See **[PRIVACY.md](PRIVACY.md)** for the full privacy model.

- **Private mode (default)** — nothing stored on the server; session deleted on Stop  
- **History mode (opt-in)** — in-memory only until API restarts; no database  
- **Delete session** — removes all server data immediately  
- **No keys in Git** — see **[SECURITY.md](SECURITY.md)**  

---

## Push to GitHub (safe)

**Nothing secret should ever appear on GitHub.** This repo is set up for that:

| Committed (safe) | Never committed (gitignored) |
|------------------|------------------------------|
| `appsettings.json` (empty keys) | `appsettings.Development.json` |
| `appsettings.example.json` | `.env`, `.env.local` |
| `client/.env.example` | User Secrets on your PC |
| Source code | `bin/`, `obj/`, `node_modules/`, `dist/` |

### First-time GitHub setup

```bash
cd BreakingLanguageBarriers

# Initialize (if not already)
git init

# Verify no secrets are staged
git status

# Stage and commit
git add .
git commit -m "Initial commit: Breaking Language Barriers with AI"

# Create repo on GitHub (CLI) and push
gh repo create BreakingLanguageBarriers --private --source=. --push
```

Use `--private` until you are ready for a public launch. Add Azure keys later via **User Secrets** (local) or **Azure App Settings** (cloud) — never in the repo.

---

## Cloud deploy (two-person / WhatsApp links)

Local `localhost` only works on your PC. For **share links on WhatsApp**, deploy to Azure:

**Full guide:** [DEPLOY.md](DEPLOY.md)

Quick summary:
1. **App Service** — hosts the .NET API (`/api`, SignalR `/hubs`)
2. **Static Web Apps** — hosts the React UI
3. Set `VITE_API_BASE_URL` to your API URL when building the client
4. Set `Security__AllowedOrigins` on the API to your Static Web App URL
5. Enable **Web sockets** on App Service (required for real-time chat)

GitHub Actions workflows are in `.github/workflows/`.

---

## Future Roadmap

- [x] Web client (React) with continuous mic streaming
- [x] Azure Neural TTS integration (add Speech key to enable)
- [x] Azure Translator integration (add Translator key to enable)
- [x] Cloud deploy scaffolding (Azure App Service + Static Web Apps — see [DEPLOY.md](DEPLOY.md))
- [ ] Video call translation
- [ ] Group conversation support
- [ ] Offline translation mode
- [ ] Mobile apps (MAUI / React Native)

---

## License

MIT
