// Neon Postgres storage — replaces the old JSON file approach.
// Tables are created automatically on first use (no setup required).
// Set DATABASE_URL in your Vercel environment variables (or .env.local for local dev).

import { neon } from "@neondatabase/serverless";
import { DEFAULT_PROMPTS } from "./prompts";

const DEFAULT_SETTINGS = {
  password: "coach2024",
  apiKey: "",
  model: "claude-sonnet-4-20250514",
  prompts: DEFAULT_PROMPTS,
};

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. " +
        "Add it in Vercel → Project Settings → Environment Variables, " +
        "or create a .env.local file for local development."
    );
  }
  return neon(process.env.DATABASE_URL);
}

// Run once per cold start to guarantee the schema exists.
async function ensureTables(db) {
  await db`
    CREATE TABLE IF NOT EXISTS leads (
      id           TEXT        PRIMARY KEY,
      name         TEXT        NOT NULL,
      contact      TEXT        NOT NULL,
      goal         TEXT        NOT NULL DEFAULT 'Healthy Lifestyle',
      session_type TEXT        NOT NULL DEFAULT 'Zoom',
      status       TEXT        NOT NULL DEFAULT 'New',
      score        INTEGER     NOT NULL DEFAULT 3,
      notes        TEXT        NOT NULL DEFAULT '',
      signup_date  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_contact TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await db`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;
}

function rowToLead(r) {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact,
    goal: r.goal,
    sessionType: r.session_type,
    status: r.status,
    score: r.score,
    notes: r.notes,
    signupDate: r.signup_date,
    lastContact: r.last_contact,
  };
}

// ---------- Leads ----------

export async function getLeads() {
  const db = getDb();
  await ensureTables(db);
  const rows = await db`SELECT * FROM leads ORDER BY signup_date DESC`;
  return rows.map(rowToLead);
}

export async function addLead({ name, contact, goal, sessionType }) {
  const db = getDb();
  await ensureTables(db);

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const safeName = (name || "").trim();
  const safeContact = (contact || "").trim();
  const safeGoal = goal || "Healthy Lifestyle";
  const safeType = sessionType || "Zoom";

  const [row] = await db`
    INSERT INTO leads (id, name, contact, goal, session_type)
    VALUES (${id}, ${safeName}, ${safeContact}, ${safeGoal}, ${safeType})
    RETURNING *
  `;
  return rowToLead(row);
}

export async function updateLead(id, patch) {
  const db = getDb();
  await ensureTables(db);

  const [existing] = await db`SELECT * FROM leads WHERE id = ${id}`;
  if (!existing) return null;

  const status      = "status"      in patch ? patch.status                : existing.status;
  const score       = "score"       in patch ? Number(patch.score)         : existing.score;
  const notes       = "notes"       in patch ? patch.notes                 : existing.notes;
  const lastContact = "lastContact" in patch ? patch.lastContact           : existing.last_contact;
  const leadName    = "name"        in patch ? patch.name                  : existing.name;
  const contact     = "contact"     in patch ? patch.contact               : existing.contact;
  const goal        = "goal"        in patch ? patch.goal                  : existing.goal;

  const [row] = await db`
    UPDATE leads
    SET status       = ${status},
        score        = ${score},
        notes        = ${notes},
        last_contact = ${lastContact},
        name         = ${leadName},
        contact      = ${contact},
        goal         = ${goal}
    WHERE id = ${id}
    RETURNING *
  `;
  return rowToLead(row);
}

// ---------- Settings ----------

export async function getSettings() {
  const db = getDb();
  await ensureTables(db);

  const [row] = await db`SELECT value FROM app_settings WHERE key = 'config'`;
  if (!row) return { ...DEFAULT_SETTINGS, prompts: { ...DEFAULT_PROMPTS } };

  try {
    const stored = JSON.parse(row.value);
    return {
      ...DEFAULT_SETTINGS,
      ...stored,
      prompts: { ...DEFAULT_PROMPTS, ...(stored.prompts || {}) },
    };
  } catch {
    return { ...DEFAULT_SETTINGS, prompts: { ...DEFAULT_PROMPTS } };
  }
}

export async function saveSettings(patch) {
  const db = getDb();
  await ensureTables(db);

  const current = await getSettings();
  let next = {
    ...current,
    ...patch,
    prompts: { ...current.prompts, ...(patch.prompts || {}) },
  };
  // Never allow clearing the password accidentally.
  if (!next.password || !next.password.trim()) next.password = current.password;

  const json = JSON.stringify(next);
  await db`
    INSERT INTO app_settings (key, value) VALUES ('config', ${json})
    ON CONFLICT (key) DO UPDATE SET value = ${json}
  `;
  return next;
}

export async function checkPassword(pw) {
  const s = await getSettings();
  return typeof pw === "string" && pw.length > 0 && pw === s.password;
}
