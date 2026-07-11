# Cloud deploy — Azure App Service + Static Web Apps

Deploy so **two-person mode** and **WhatsApp invite links** work outside your PC.

| Component | Azure service | URL example |
|-----------|---------------|-------------|
| **API** (.NET) | App Service | `https://breaking-language-barriers-api.azurewebsites.net` |
| **UI** (React) | Static Web Apps | `https://happy-wave-123.azurestaticapps.net` |

---

## Before you start

- [ ] GitHub repo (private recommended until launch)
- [ ] Azure subscription ([free tier](https://azure.microsoft.com/free/) works for testing)
- [ ] Azure CLI installed (`az login`) — optional but helpful

**Never put API keys in GitHub.** Use Azure Application Settings and GitHub **Secrets**.

---

## Step 1 — Create the API (App Service)

### Azure Portal

1. **Create a resource** → **Web App**
2. Name: e.g. `breaking-language-barriers-api` (must be globally unique)
3. **Runtime**: .NET 10 (or latest .NET available)
4. **Region**: `Central India` (or closest to your users)
5. **Plan**: Free F1 for testing, Basic B1+ for real use
6. Create

### Required settings (Configuration → Application settings)

| Name | Value |
|------|--------|
| `ASPNETCORE_ENVIRONMENT` | `Production` |
| `Security__AllowedOrigins__0` | `https://YOUR-SWA.azurestaticapps.net` (add after Step 2) |
| `Security__AllowAnyOriginInDevelopment` | `false` |

**Azure AI keys** (recommended for production):

| Name | Value |
|------|--------|
| `AiServices__Translation__Provider` | `Azure` |
| `AiServices__Translation__AzureTranslatorKey` | Your Translator key |
| `AiServices__Translation__AzureTranslatorRegion` | e.g. `centralindia` |
| `AiServices__TextToSpeech__Provider` | `Azure` |
| `AiServices__TextToSpeech__AzureSpeechKey` | Your Speech key |
| `AiServices__TextToSpeech__AzureSpeechRegion` | e.g. `centralindia` |

### Platform settings (critical for SignalR)

1. **Configuration** → **General settings**
2. **Web sockets**: **On**
3. **Always On**: **On** (if not on Free tier)
4. **ARR affinity**: **On** (sessions are in-memory today)

### Health check (optional)

- Path: `/api/v1/health`

### Get publish profile

1. App Service → **Download publish profile**
2. Save contents for GitHub secret `AZURE_API_PUBLISH_PROFILE`

### Verify API

```bash
curl https://YOUR-API.azurewebsites.net/api/v1/health
```

---

## Step 2 — Create the UI (Static Web Apps)

### Azure Portal

1. **Create a resource** → **Static Web App**
2. **Plan**: Free
3. **Deployment source**: GitHub
4. Select your repo, branch `main`
5. **Build presets**: Custom
   - App location: `client`
   - Output location: `dist`
   - Api location: *(leave empty — API is separate App Service)*

Azure will add a workflow file. You can **replace it** with this repo’s `.github/workflows/deploy-client.yml` or merge the `VITE_API_BASE_URL` env block.

### Build environment variable

In SWA → **Configuration** → **Environment variables** (or GitHub secret):

| Name | Value |
|------|--------|
| `VITE_API_BASE_URL` | `https://YOUR-API.azurewebsites.net` (no trailing slash) |

Rebuild/redeploy after setting this — Vite bakes the URL at **build time**.

### Update API CORS

Go back to App Service and set:

```
Security__AllowedOrigins__0 = https://YOUR-SWA.azurestaticapps.net
```

If you add a custom domain later, add `Security__AllowedOrigins__1`.

---

## Step 3 — GitHub Actions secrets

Repo → **Settings** → **Secrets and variables** → **Actions**:

| Secret | Where to get it |
|--------|------------------|
| `AZURE_API_APP_NAME` | App Service name (e.g. `breaking-language-barriers-api`) |
| `AZURE_API_PUBLISH_PROFILE` | Download from App Service |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | SWA → **Manage deployment token** (copy full token) |

> **If deploy fails with `deployment_token was not provided`:** GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN` is missing. Copy token from Azure Portal → Static Web App → **Manage deployment token**, add as GitHub secret, re-run workflow.

| `VITE_API_BASE_URL` | `https://YOUR-API.azurewebsites.net` |

Workflows:

- `.github/workflows/deploy-api.yml` — deploys on `src/**` changes
- `.github/workflows/deploy-client.yml` — deploys on `client/**` changes

Trigger manually: **Actions** → workflow → **Run workflow**.

---

## Step 4 — Test two-person mode

1. Open your SWA URL on phone A (Chrome)
2. Choose **Two people** → **Start & invite**
3. Copy link → send on **WhatsApp** to phone B
4. Phone B opens link → **Join conversation**
5. Speak — translations should flow both ways

---

## Custom domain (optional)

1. **SWA**: Custom domains → add `app.yourdomain.com`
2. **API**: Custom domains → add `api.yourdomain.com`
3. Update `VITE_API_BASE_URL` and `Security__AllowedOrigins` to match
4. Redeploy client

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| GitHub deploy fails: `deployment_token was not provided` | Add GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN` from SWA → **Manage deployment token** |
| GitHub deploy fails: `No matching Static Web App was found or the api key was invalid` | Token is wrong, expired, or from a **different** Static Web App. In Azure → your SWA (`thankful-bay...`) → **Manage deployment token** → **Reset** → copy new token → **update** GitHub secret (no spaces) → re-run workflow |
| UI shows “API not connected” | Check `VITE_API_BASE_URL` was set **before** client build |
| CORS error in browser console | Add SWA URL to `Security__AllowedOrigins` on API |
| SignalR disconnects | Enable **Web sockets** on App Service |
| Invite link doesn’t work on WhatsApp | Must use **cloud URL**, not `localhost` |
| No voice output | Add Azure Speech key in App Service settings |
| Session lost randomly | Enable **ARR affinity** or move to Redis (future) |

---

## Cost estimate (testing)

- Static Web Apps Free: $0
- App Service Free F1: $0 (limited; sleeps when idle)
- Azure Speech + Translator: pay-per-use (small for testing)

---

## Files in this repo

| File | Purpose |
|------|---------|
| `appsettings.Production.example.json` | Template for production CORS + AI providers |
| `client/staticwebapp.config.json` | SPA routing for invite links (`?join=...`) |
| `client/.env.production.example` | Documents `VITE_API_BASE_URL` |
| `.github/workflows/deploy-api.yml` | API CI/CD |
| `.github/workflows/deploy-client.yml` | UI CI/CD |

See also `SECURITY.md` and `PRIVACY.md` before public launch.
