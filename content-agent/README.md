# Daily Wellness Content Agent (100% free tier)

Every morning at **6:00 AM IST**, GitHub Actions runs `agent.py`, which:

1. Asks **Gemini 2.5 Flash** (free) for a fresh topic, a 300–400 word caption, a 5-scene reel script, an image keyword, and 10 hashtags — never repeating a past topic (`topic_history.json` is committed back after every run).
2. Builds `daily_post.png` — a branded 1080×1080 image (Unsplash photo, or a branded gradient if Unsplash is not configured).
3. Builds `daily_reel.mp4` — a 45-second 1080×1920 vertical reel from the scene script, with on-screen text and progress dots.
4. Sends everything to the coach's **Telegram** as three messages:
   - the post image,
   - the **full caption + hashtags as one copy-paste-ready message**,
   - the reel video with the voiceover script attached.

The coach just long-presses → Copy → posts. No manual writing, ever.

---

## One-time setup (~15 minutes)

### 1. Gemini API key (free — required)
1. Go to https://aistudio.google.com/apikey
2. Click **Create API key** → copy it.

> Free tier of `gemini-2.5-flash` allows plenty of requests/day for one daily run. The agent auto-falls back to `gemini-2.0-flash` if needed.

### 2. Telegram bot (free — for phone delivery)
1. In Telegram, message **@BotFather** → send `/newbot` → pick a name (e.g. `WellnessContentBot`).
2. BotFather replies with the **bot token** (`123456:ABC-...`). Save it.
3. The **coach** opens the bot and presses **Start** (sends any message).
4. Get the chat id: open
   `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
   in a browser and copy the number at `"chat":{"id": ... }`. That's `TELEGRAM_CHAT_ID`.

### 3. Visual providers (all free, all optional — add any you like)

Backgrounds are tried in this order; first hit wins. Reel scenes prefer **Pexels stock videos** (moving backgrounds) over photos.

| Provider | Env var | Get key at | Notes |
|---|---|---|---|
| Local Stable Diffusion | `SD_WEBUI_URL` | run Automatic1111 with `--api` | AI-generated visuals; local runs only (no GPU on Actions) |
| Pixazo (Flux Schnell/SDXL) | `PIXAZO_API_KEY` + `PIXAZO_ENDPOINT` | pixazo.ai (free, no card) | paste the generate endpoint URL from your dashboard |
| **Pexels** (recommended) | `PEXELS_API_KEY` | pexels.com/api | photos **and stock videos** for reel scenes |
| Unsplash | `UNSPLASH_ACCESS_KEY` | unsplash.com/developers | photos |
| Pixabay | `PIXABAY_API_KEY` | pixabay.com/api/docs | photos |

With no keys at all, a clean branded gradient is used — the pipeline never fails.

Voice: set `TTS_VOICE` (default male `en-IN-PrabhatNeural`; female `en-IN-NeerjaNeural`).

### 4. Add GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `GEMINI_API_KEY` | from step 1 (required) |
| `TELEGRAM_BOT_TOKEN` | from step 2 |
| `TELEGRAM_CHAT_ID` | from step 2 |
| `UNSPLASH_ACCESS_KEY` | from step 3 (optional) |

### 5. Test it
Repo → **Actions → Daily Wellness Content Generator → Run workflow**.
Within ~3 minutes the coach's Telegram receives the image, caption+hashtags, and reel. Generated files are also downloadable from the run's **Artifacts** for 14 days.

---

## Run locally (Windows PowerShell)

```powershell
pip install -r content-agent/requirements.txt
$env:GEMINI_API_KEY = "your-key"
$env:TELEGRAM_BOT_TOKEN = "your-token"      # optional
$env:TELEGRAM_CHAT_ID = "your-chat-id"      # optional
$env:UNSPLASH_ACCESS_KEY = "your-key"       # optional
python content-agent/agent.py
```

Output lands in `content-agent/output/YYYY-MM-DD/`:
`daily_post.png`, `daily_reel.mp4`, `content_ready.json`, `caption.txt`.

## Changing the schedule

Edit the cron in `.github/workflows/daily_content.yml` (UTC time):
`30 0 * * *` = 6:00 AM IST. For 7:00 AM IST use `30 1 * * *`.
