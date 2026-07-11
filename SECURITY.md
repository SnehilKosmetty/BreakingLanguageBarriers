# Security — Secrets & GitHub

This project is designed so **no passwords, API keys, or user conversation data** are stored in Git.

## Session security (implemented)

Every conversation session has a **cryptographic access token**:

- Generated with 256 bits of randomness when the session is created  
- Only a **SHA-256 hash** is stored on the server — not the plain token  
- Required on **every** API call (`X-Session-Token` header) and SignalR hub action  
- Invalid or missing token → **404 Not Found** (does not reveal whether a session exists)  
- Invite links look like: `?join=SESSION_ID&token=SECRET` — both parts are required  

Without the token, a random person **cannot**:

- Read session details  
- Read conversation history  
- Submit or receive translations  
- Join the SignalR room  

## What is safe to commit

| File | Purpose |
|------|---------|
| `appsettings.json` | Empty key placeholders only |
| `appsettings.example.json` | Template for developers |
| `client/.env.example` | Template for frontend env vars |

## What must NEVER be committed

- Azure Speech / Translator keys  
- Database connection strings  
- `appsettings.Development.json` (gitignored — use User Secrets locally)  
- `appsettings.Production.json`  
- Any `.env`, `.env.local`, `.env.production` with real values  
- `*.pfx`, `*.pem`, `*.key`  

## Local development (recommended)

Use **.NET User Secrets** (stored outside the repo on your machine):

```bash
cd src/BreakingLanguageBarriers.Api

dotnet user-secrets set "AiServices:TextToSpeech:AzureSpeechKey" "YOUR_KEY_HERE"
dotnet user-secrets set "AiServices:Translation:AzureTranslatorKey" "YOUR_KEY_HERE"
```

User Secrets path (Windows): `%APPDATA%\Microsoft\UserSecrets\breaking-language-barriers-api\secrets.json`  
This folder is **not** in your project directory and will not be pushed to GitHub.

## Production / cloud (Step 4 — later)

Store secrets in your cloud provider, not in code:

| Platform | Where to put secrets |
|----------|----------------------|
| Azure App Service | **Configuration → Application settings** |
| Azure Static Web Apps | Build env vars in portal / GitHub Actions secrets |
| GitHub Actions | **Repository → Settings → Secrets and variables** |

Never paste production keys into GitHub Issues, PRs, or commit messages.

## Before your first `git push`

1. Run: `git status` — confirm no `.env` or `secrets.json` files are staged  
2. Search the repo: no string that looks like a real Azure key (`[a-f0-9]{32}` subscription keys)  
3. Enable **GitHub secret scanning** (on by default for public repos)  

## If a key was accidentally committed

1. **Rotate the key immediately** in Azure Portal (revoke old, create new)  
2. Remove from git history (`git filter-repo` or GitHub support)  
3. Never rely on “delete in next commit” — history still contains it  

## Reporting

If you find a security issue, do not open a public issue with details. Contact the repository owner privately.
