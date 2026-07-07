# 🌱 Wellness Coach — Free 6 PM Zoom Sessions

A complete web app for a nutrition & wellness coach:

- A stunning, mobile-first **landing page** that captures leads.
- A password-protected **admin dashboard** at `/admin`.
- A **30-day content calendar** with AI-powered captions.
- **Neon Postgres** for data storage (free, hosted, no setup).
- **Claude AI** for caption + re-engagement message generation.

---

## 🌐 HOW TO PUT IT ONLINE (Free public link)

You'll get a free URL like **`your-name.vercel.app`** in about 15 minutes.

### Step 1 — Get a free Neon database (2 min)

1. Go to **https://neon.tech** and sign up free (use Google login for speed).
2. Click **"New Project"** → give it any name (e.g. `wellness-coach`) → **Create Project**.
3. On the project dashboard, find **"Connection string"** and click **Copy**.
   It looks like: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`
4. Keep this tab open — you'll paste it in Step 3.

> ✅ The free Neon tier gives you 0.5 GB storage and 190 compute hours/month — more than enough for this app.

---

### Step 2 — Push your code to GitHub (3 min)

1. Go to **https://github.com** and sign up free.
2. Click **"New repository"** (the green button) → name it `wellness-coach` → **Create repository**.
3. Install **Node.js** from **https://nodejs.org** (LTS version) if you haven't already.
4. Open **PowerShell**, go to the project folder, and run these commands one by one:

```
cd "C:\Users\Valli P\Wellness Team"
npm install
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/wellness-coach.git
git push -u origin main
```

> Replace `YOUR_GITHUB_USERNAME` with the username you created on GitHub.

---

### Step 3 — Deploy on Vercel (5 min)

1. Go to **https://vercel.com** and sign up free using your **GitHub account** (click "Continue with GitHub").
2. Click **"Add New → Project"**.
3. Find your `wellness-coach` repo and click **"Import"**.
4. Before clicking Deploy, click **"Environment Variables"** and add:
   - **Name:** `DATABASE_URL`
   - **Value:** paste the connection string you copied from Neon
5. Click **"Deploy"** and wait ~2 minutes.
6. ✅ Vercel gives you a free URL like **`wellness-coach.vercel.app`** — share this with everyone!

> Every time you make changes and run `git push`, Vercel automatically re-deploys. Magic ✨

---

### Step 4 — Set your Claude API key (for AI features)

1. Go to **https://console.anthropic.com** → API Keys → Create Key → copy it.
2. Open your live site's admin dashboard: `https://your-site.vercel.app/admin`
3. Log in (default password: `coach2024`) → Settings ⚙️ → paste the key → Save.

> The landing page and all lead tracking work without a key. You only need it for "Generate Caption" and "Generate Re-engagement Message".

---

## 💻 RUNNING LOCALLY (on your own computer)

1. Install Node.js from **https://nodejs.org** (LTS).
2. Copy the env file and add your Neon connection string:
   - Duplicate `.env.local.example` → rename it to `.env.local`
   - Open it in Notepad and replace the placeholder with your actual Neon connection string
3. Open PowerShell in the project folder:
```
cd "C:\Users\Valli P\Wellness Team"
npm install
npm run dev
```
4. Open **http://localhost:3000** (landing) and **http://localhost:3000/admin** (dashboard).

---

## 🔐 Admin login

- URL: `yoursite.vercel.app/admin`
- Default password: **`coach2024`**
- To change it: Dashboard → Settings ⚙️ → Change Admin Password → Update.

---

## 📊 Dashboard features

| Section | What it does |
|---|---|
| **Overview** | Stat cards + follow-up alert |
| **Leads** | Searchable table. Edit Status, Score (★), Notes inline. |
| **Content Calendar** | 30-day plan. One click → ready-to-post caption via Claude. |
| **Follow-ups** | Leads not contacted in 7+ days. One click → personalised WhatsApp DM. |
| **Settings** | API key, model, password, editable prompt templates. |

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| `DATABASE_URL is not set` | Add the Neon connection string as an env variable in Vercel or in `.env.local` |
| `npm is not recognized` | Node.js isn't installed yet, or close and reopen PowerShell after installing |
| AI button says "No Claude API key" | Add your key in Dashboard → Settings |
| Forgot password | Go to Neon dashboard → SQL Editor → run: `UPDATE app_settings SET value = jsonb_set(value::jsonb, '{password}', '"coach2024"')::text WHERE key='config'` |

---

## 🛠️ Tech stack

- **Next.js 14 (App Router)** + **React 18**
- **Tailwind CSS** + **Framer Motion**
- **Neon Postgres** (`@neondatabase/serverless`) — auto-creates tables on first run
- **Vercel** — free hosting, zero-config deploys
- **Claude API** (`claude-sonnet-4-20250514`) — AI captions & messages
