"use client";

/**
 * Canva App — Wellness Coach Content Studio
 *
 * HOW TO REGISTER THIS APP IN CANVA:
 *   1. Go to https://www.canva.com/developers/
 *   2. Create a free Developer account → "Create an app"
 *   3. App URL: https://YOUR-SITE.vercel.app/canva-app
 *   4. Open Canva editor → Apps (left sidebar) → Your apps → find it → Open
 *
 * This page calls your existing /api/generate endpoint (Claude) to write
 * captions and carousel copy, then inserts them into the open Canva design.
 */

import { useEffect, useState, useCallback } from "react";
import { buildCalendar } from "@/lib/calendar";

const GOALS = [
  "Weight Loss",
  "Weight Gain",
  "Immune Health",
  "Digestive Health",
  "Healthy Lifestyle",
  "Skin Health",
];

const SLIDE_TEMPLATES = [
  { id: "hook",    label: "Hook slide",    desc: "Big headline that stops the scroll" },
  { id: "tip",     label: "Tips carousel", desc: "3-slide carousel with actionable tips" },
  { id: "cta",     label: "CTA slide",     desc: "Call-to-action for the Zoom session" },
  { id: "quote",   label: "Quote card",    desc: "Motivational quote with your branding" },
  { id: "before",  label: "Before/After",  desc: "Problem → Solution two-panel post" },
];

const BRAND = {
  green:    "#16a34a",
  lime:     "#84cc16",
  dark:     "#0f3d2e",
  white:    "#ffffff",
  offwhite: "#f0fdf4",
};

export default function CanvaApp() {
  const [canvaSDK, setCanvaSDK] = useState(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [tab, setTab] = useState("calendar"); // calendar | carousel | settings
  const [adminPw, setAdminPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [calendar] = useState(() => buildCalendar(new Date(), 30));
  const [selected, setSelected] = useState(null);
  const [caption, setCaption] = useState("");
  const [slides, setSlides] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [goal, setGoal] = useState("Weight Loss");
  const [slideType, setSlideType] = useState("tip");
  const [msg, setMsg] = useState({ text: "", ok: true });

  // Load Canva Apps SDK (only works when loaded inside Canva's iframe)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const script = document.createElement("script");
    script.src = "https://sdk.canva.com/apps/v2/sdk.js";
    script.onload = async () => {
      try {
        const { createDesign } = await window.__canva_sdk__;
        setCanvaSDK(window.__canva_sdk__);
        setSdkReady(true);
      } catch {
        // Running outside Canva (e.g., direct browser visit) — preview mode only
        setSdkReady(false);
      }
    };
    script.onerror = () => setSdkReady(false);
    document.head.appendChild(script);
  }, []);

  function flash(text, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text: "", ok: true }), 3000);
  }

  // ── Generate caption for a calendar day ──
  async function generateCaption(day) {
    if (!adminPw) { flash("Enter your admin password in Settings first.", false); return; }
    setSelected(day);
    setGenerating(true);
    setCaption("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": adminPw },
        body: JSON.stringify({ type: "content", data: { topic: day.topic, hook: day.hook } }),
      });
      const json = await res.json();
      if (json.ok) setCaption(json.text);
      else flash(json.error || "Claude error.", false);
    } catch {
      flash("Could not reach your API. Check the password.", false);
    } finally {
      setGenerating(false);
    }
  }

  // ── Build carousel slide copy via Claude ──
  async function generateCarousel() {
    if (!adminPw) { flash("Enter your admin password in Settings first.", false); return; }
    setGenerating(true);
    setSlides([]);
    const prompt =
      `You are a social media expert for a wellness coach. ` +
      `Create a ${slideType === "tip" ? "3-slide" : "single-slide"} Instagram carousel for the goal: "${goal}". ` +
      `Format as JSON array. Each item: {"slide": N, "headline": "...", "body": "...", "cta": "..."}. ` +
      `Headlines max 8 words. Body max 20 words. Plain text only, no markdown.`;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": adminPw },
        body: JSON.stringify({
          type: "content",
          data: { topic: goal + " — " + slideType + " carousel", hook: prompt },
        }),
      });
      const json = await res.json();
      if (json.ok) {
        // Try parsing JSON from Claude's response
        try {
          const match = json.text.match(/\[[\s\S]*\]/);
          if (match) setSlides(JSON.parse(match[0]));
          else setSlides([{ slide: 1, headline: goal, body: json.text, cta: "Join free 7 PM Zoom →" }]);
        } catch {
          setSlides([{ slide: 1, headline: goal, body: json.text, cta: "Join free 7 PM Zoom →" }]);
        }
      } else {
        flash(json.error || "Claude error.", false);
      }
    } catch {
      flash("Could not reach your API.", false);
    } finally {
      setGenerating(false);
    }
  }

  // ── Insert text into Canva design ──
  async function insertIntoCanva(text) {
    if (!sdkReady || !canvaSDK) {
      flash("Open this app inside Canva to insert content.", false);
      return;
    }
    setInserting(true);
    try {
      await canvaSDK.design.addNativeElement({
        type: "TEXT",
        children: [text],
        fontSize: 24,
        fontWeight: "bold",
        color: BRAND.dark,
      });
      flash("Inserted into your Canva design ✓");
    } catch (e) {
      flash("Could not insert: " + e.message, false);
    } finally {
      setInserting(false);
    }
  }

  async function insertSlideSet() {
    if (!sdkReady || !canvaSDK) {
      flash("Open this app inside Canva to insert slides.", false);
      return;
    }
    if (!slides.length) return;
    setInserting(true);
    try {
      for (const s of slides) {
        const fullText = `${s.headline}\n\n${s.body}\n\n${s.cta}`;
        await canvaSDK.design.addNativeElement({ type: "TEXT", children: [fullText], fontSize: 24, color: BRAND.dark });
      }
      flash(`Inserted ${slides.length} slide(s) ✓`);
    } catch (e) {
      flash("Could not insert: " + e.message, false);
    } finally {
      setInserting(false);
    }
  }

  const TABS = [
    { id: "calendar", label: "📅 Calendar" },
    { id: "carousel", label: "🖼️ Carousel" },
    { id: "settings", label: "⚙️ Settings" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, background: "#f7fef9", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#0f3d2e,#16a34a)", color: "#fff", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20 }}>🌱</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Wellness Coach</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>Content Studio</div>
        </div>
        {sdkReady && (
          <span style={{ marginLeft: "auto", background: "#22c55e", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600 }}>
            ✓ Canva connected
          </span>
        )}
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "2px solid #dcfce7", background: "#fff" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 4px", border: "none", background: "none", cursor: "pointer",
              fontWeight: tab === t.id ? 700 : 400,
              color: tab === t.id ? BRAND.green : "#555",
              borderBottom: tab === t.id ? `3px solid ${BRAND.green}` : "3px solid transparent",
              fontSize: 12 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Flash message */}
      {msg.text && (
        <div style={{ background: msg.ok ? "#dcfce7" : "#fee2e2", color: msg.ok ? "#166534" : "#991b1b",
          padding: "8px 14px", fontSize: 12, fontWeight: 600 }}>
          {msg.text}
        </div>
      )}

      <div style={{ padding: 14 }}>

        {/* ── CALENDAR TAB ── */}
        {tab === "calendar" && (
          <div>
            <p style={{ color: "#555", marginBottom: 10, fontSize: 12 }}>
              Pick a day → generate a caption with Claude → insert into Canva.
            </p>
            {calendar.map(day => (
              <div key={day.index} style={{ background: "#fff", borderRadius: 10, border: "1px solid #dcfce7",
                marginBottom: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ display: "inline-block", borderRadius: 20, padding: "1px 8px", fontSize: 10,
                      fontWeight: 700, color: "#fff", background: day.color, marginBottom: 4 }}>
                      {day.dayLabel}
                    </span>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{day.topic}</div>
                    <div style={{ color: "#666", fontSize: 11, fontStyle: "italic" }}>"{day.hook}"</div>
                  </div>
                  <button onClick={() => generateCaption(day)} disabled={generating}
                    style={{ background: BRAND.green, color: "#fff", border: "none", borderRadius: 8,
                      padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                      opacity: generating ? 0.6 : 1 }}>
                    {generating && selected?.index === day.index ? "Writing…" : "✨ Generate"}
                  </button>
                </div>

                {selected?.index === day.index && caption && (
                  <div style={{ marginTop: 10 }}>
                    <textarea readOnly value={caption}
                      style={{ width: "100%", height: 110, borderRadius: 8, border: "1px solid #dcfce7",
                        background: "#f0fdf4", padding: 8, fontSize: 12, resize: "vertical", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={() => navigator.clipboard?.writeText(caption)}
                        style={btnStyle("#f0fdf4", BRAND.dark)}>
                        📋 Copy
                      </button>
                      <button onClick={() => insertIntoCanva(caption)} disabled={inserting}
                        style={btnStyle(BRAND.green, "#fff")}>
                        {inserting ? "Inserting…" : "➕ Add to Canva"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── CAROUSEL TAB ── */}
        {tab === "carousel" && (
          <div>
            <p style={{ color: "#555", marginBottom: 12, fontSize: 12 }}>
              Generate multi-slide carousel copy with Claude then insert into Canva.
            </p>

            <Label>Health goal</Label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={selectStyle}>
              {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>

            <Label>Slide type</Label>
            <select value={slideType} onChange={e => setSlideType(e.target.value)} style={selectStyle}>
              {SLIDE_TEMPLATES.map(s => (
                <option key={s.id} value={s.id}>{s.label} — {s.desc}</option>
              ))}
            </select>

            <button onClick={generateCarousel} disabled={generating}
              style={{ ...btnStyle(BRAND.green, "#fff"), width: "100%", padding: "10px", marginTop: 4, fontSize: 13 }}>
              {generating ? "Writing slides…" : "✨ Generate Carousel Copy"}
            </button>

            {slides.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: BRAND.dark }}>
                  {slides.length} slide(s) generated
                </div>
                {slides.map((s, i) => (
                  <div key={i} style={{ background: "#fff", borderRadius: 10, border: "1px solid #dcfce7",
                    padding: 10, marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: BRAND.green, marginBottom: 4 }}>
                      SLIDE {s.slide || i + 1}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.headline}</div>
                    <div style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>{s.body}</div>
                    <div style={{ color: BRAND.green, fontSize: 12, fontWeight: 600 }}>{s.cta}</div>
                    <button onClick={() => insertIntoCanva(`${s.headline}\n\n${s.body}\n\n${s.cta}`)}
                      disabled={inserting} style={{ ...btnStyle(BRAND.green, "#fff"), marginTop: 8, fontSize: 11 }}>
                      ➕ Insert this slide
                    </button>
                  </div>
                ))}
                <button onClick={insertSlideSet} disabled={inserting}
                  style={{ ...btnStyle(BRAND.dark, "#fff"), width: "100%", padding: 10, fontSize: 13 }}>
                  {inserting ? "Inserting…" : `➕ Insert All ${slides.length} Slides`}
                </button>
                <button onClick={() => navigator.clipboard?.writeText(slides.map(s =>
                    `SLIDE ${s.slide || ""}\n${s.headline}\n${s.body}\n${s.cta}`).join("\n\n---\n\n"))}
                  style={{ ...btnStyle("#f0fdf4", BRAND.dark), width: "100%", marginTop: 6 }}>
                  📋 Copy all slides
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div>
            <p style={{ color: "#555", marginBottom: 12, fontSize: 12 }}>
              Enter your dashboard admin password so this app can call Claude on your behalf.
            </p>
            <Label>Admin password (from your dashboard)</Label>
            <input type="password" value={adminPw} onChange={e => setAdminPw(e.target.value)}
              placeholder="coach2024"
              style={{ width: "100%", borderRadius: 8, border: "1px solid #dcfce7", padding: "8px 10px",
                fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
            <button onClick={() => { setPwSaved(true); flash("Password saved for this session ✓"); }}
              style={{ ...btnStyle(BRAND.green, "#fff"), width: "100%", padding: 10 }}>
              Save Password
            </button>

            <div style={{ marginTop: 20, background: "#fff", borderRadius: 10, border: "1px solid #dcfce7", padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>How to set up this app in Canva</div>
              <ol style={{ paddingLeft: 16, color: "#555", lineHeight: 1.8, fontSize: 12 }}>
                <li>Go to <b>canva.com/developers</b> → Create app</li>
                <li>App URL: <b>your-site.vercel.app/canva-app</b></li>
                <li>Open Canva editor → Apps → Your apps → open it</li>
                <li>Come back here, enter your admin password above</li>
                <li>Pick a calendar day or build a carousel → Insert!</li>
              </ol>
            </div>

            <div style={{ marginTop: 12, background: "#fffbeb", borderRadius: 10, border: "1px solid #fde68a",
              padding: 12, fontSize: 12, color: "#92400e" }}>
              <b>Note:</b> Make sure your Claude API key is saved in your main dashboard
              (wellness-coach.vercel.app/admin → Settings) first. This app calls the same Claude integration.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── tiny style helpers ──
function btnStyle(bg, color) {
  return {
    background: bg, color, border: "none", borderRadius: 8,
    padding: "7px 12px", cursor: "pointer", fontWeight: 600, fontSize: 12,
  };
}
function Label({ children }) {
  return <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 4 }}>{children}</div>;
}
const selectStyle = {
  width: "100%", borderRadius: 8, border: "1px solid #dcfce7", padding: "8px 10px",
  fontSize: 13, marginBottom: 10, background: "#fff", boxSizing: "border-box",
};
