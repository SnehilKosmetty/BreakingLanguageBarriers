# Privacy — Breaking Language Barriers with AI

**Your users' privacy is a core product requirement, not an afterthought.**

## Principles

1. **Private by default** — new sessions use Private mode unless the user opts in to saving history.  
2. **Minimal retention** — we do not write conversations to disk or a database in the current version.  
3. **User control** — users can clear the screen, delete a session, and choose whether anything is stored.  
4. **No training on user data** — conversation text is not used to train AI models by this application.  
5. **Transparency** — the app explains where data goes before the user starts.

## What happens to conversation data

| Data | Private mode (default) | History enabled (opt-in) |
|------|------------------------|---------------------------|
| Speech text | Processed in real time, **not saved** on server | Stored in **server RAM only** until API restarts |
| Translations | Shown on screen, **not saved** on server | Same as above |
| Audio | Played once, **not saved** | Same as above |
| Browser display | Until user clears or closes tab | Until user clears or closes tab |

When the user presses **Stop** in Private mode (solo or session host), the server **deletes the session and any in-memory data**.

## UI ↔ implementation alignment

Every privacy claim shown in the app UI must match backend behavior:

| UI promise | Enforced in code |
|------------|------------------|
| Private mode on by default | Client default + server forces `SaveHistory = false` when private |
| No conversation saved in private mode | `ConversationPipeline` skips `AddTurnAsync` when private |
| Stop deletes private session | `StopAsync` calls `DeleteAsync` for private sessions |
| History only when opted in | Checkbox disabled in private mode; server rejects history reads |
| Clear display clears server history | `DELETE /sessions/{id}/history` clears in-memory turns |
| Session token not in cookies | Token kept in JS memory only (`api.ts`) |
| Invite link requires secret token | All API/SignalR calls validate `X-Session-Token` |
| No sale / no app-side AI training | No analytics or training code paths — disclose third-party translators in UI |

**Honest limits (also shown in UI):** Translation text is sent to MyMemory or Azure; browser speech may use vendor APIs (e.g. Chrome). Those providers have their own policies.

## Third-party services

Translation may use an external API:

| Provider | When | Data sent |
|----------|------|-----------|
| **MyMemory** | Default (no Azure Translator key) | Text to translate |
| **Azure Translator** | When you configure Azure | Text to translate |

Speech recognition uses the **browser microphone** (Web Speech API) by default — audio is handled by the browser vendor (e.g. Google in Chrome).

Text-to-speech uses **Azure Neural TTS** when configured; otherwise mock silent audio.

**You** (the deployer) should disclose these providers in your app store / website privacy notice for end users.

## Session access control

- Each session has a secret **access token** (256-bit random)  
- Server stores only a **hash** of the token  
- API and SignalR reject requests without a valid token  
- Invite links require both session ID **and** token  
- Failed access returns generic **404** (no information leakage)  

## Rate limiting

- API: 120 requests / minute per IP  
- SignalR / sessions: 30 connections / minute per IP  

## Transport & headers

- HTTPS enforced in production (HSTS)  
- Security headers: `no-store`, `nosniff`, `DENY` framing, `no-referrer`  
- CORS locked to allowed origins in production  

## What we do not do (current version)

- No user accounts or passwords stored  
- No conversation database on disk  
- No analytics on message content  
- No selling or sharing of conversation data  
- No end-to-end encryption yet (planned future enhancement)  

## Honest security note

No application can promise “unhackable.” This app uses industry-standard defenses: secret session tokens (hashed on server), HTTPS, rate limits, private-by-default, and no secrets in Git. For production, also use Azure WAF, monitoring, and keep dependencies updated.

## Deployer responsibilities

When you host this app for real users:

1. Use **HTTPS** everywhere  
2. Keep API keys in **cloud secret stores**, not in Git  
3. Choose **Azure Translator** in production for better privacy SLAs than free MyMemory  
4. Add a **Privacy Policy** page linked from your app (legal requirement in many regions)  
5. Set a short **session TTL** or restart policy if using history mode  

## User controls in the app

- **Private mode** — nothing stored on server  
- **Save history** — only when private is off  
- **Clear display** — removes messages from the screen  
- **Delete session** — removes server session and in-memory history  

## Contact

Publish a contact email in your deployed app for privacy requests (access / deletion).
