"use client";

import { useEffect, useMemo, useState } from "react";
import { buildCalendar } from "@/lib/calendar";

const STATUSES = ["New", "Confirmed", "Attended", "Follow-up"];
const STATUS_STYLES = {
  New: "bg-sky-100 text-sky-700",
  Confirmed: "bg-amber-100 text-amber-700",
  Attended: "bg-emerald-100 text-emerald-700",
  "Follow-up": "bg-rose-100 text-rose-700",
};

const NAV = [
  { id: "overview", label: "Overview", icon: "📊" },
  { id: "leads", label: "Leads", icon: "👥" },
  { id: "calendar", label: "Content Calendar", icon: "🗓️" },
  { id: "followups", label: "Follow-ups", icon: "🔔" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function Admin() {
  const [pw, setPw] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [tab, setTab] = useState("overview");

  // Try to restore session
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("coachPw") : "";
    if (saved) tryLogin(saved, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryLogin(password, silent = false) {
    try {
      const res = await fetch("/api/leads", { headers: { "x-admin-password": password } });
      if (res.ok) {
        localStorage.setItem("coachPw", password);
        setPw(password);
        setAuthed(true);
        setAuthError("");
      } else if (!silent) {
        setAuthError("Wrong password. Try again.");
      }
    } catch {
      if (!silent) setAuthError("Could not connect. Is the app running?");
    }
  }

  function logout() {
    localStorage.removeItem("coachPw");
    setAuthed(false);
    setPw("");
  }

  if (!authed) {
    return (
      <div className="mesh-bg grid min-h-screen place-items-center px-5">
        <div className="blob left-10 top-10 h-64 w-64 bg-grass" />
        <div className="blob bottom-10 right-10 h-64 w-64 bg-lime" />
        <div className="glass relative z-10 w-full max-w-sm rounded-3xl p-8 shadow-card">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-leaf to-lime text-2xl text-white shadow-glow">
              🌱
            </div>
            <h1 className="font-display text-2xl font-extrabold text-ink">Coach Dashboard</h1>
            <p className="text-sm text-forest/70">Enter your password to continue</p>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); tryLogin(pw); }}
            className="space-y-3"
          >
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-leaf/20 bg-white/80 px-4 py-3 outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/15"
            />
            {authError && <p className="text-sm font-medium text-red-600">{authError}</p>}
            <button className="w-full rounded-xl bg-gradient-to-r from-leaf to-grass py-3 font-bold text-white shadow-glow transition hover:scale-[1.02]">
              Log In →
            </button>
            <p className="text-center text-xs text-forest/50">Default password: coach2024</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-mint font-body text-ink">
      {/* Sidebar */}
      <aside className="hidden w-60 flex-col border-r border-leaf/10 bg-white px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2 font-display text-lg font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-leaf to-lime text-white">🌱</span>
          Wellness<span className="text-leaf"> Coach</span>
        </div>
        <nav className="flex-1 space-y-1">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                tab === n.id ? "bg-gradient-to-r from-leaf to-grass text-white shadow-glow" : "text-forest/80 hover:bg-mint"
              }`}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <button onClick={logout} className="mt-4 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-forest/60 hover:bg-mint">
          ↩ Log out
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1">
        {/* Mobile top nav */}
        <div className="flex gap-1 overflow-x-auto border-b border-leaf/10 bg-white px-3 py-2 md:hidden">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                tab === n.id ? "bg-leaf text-white" : "text-forest/70"
              }`}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </div>

        <div className="mx-auto max-w-6xl px-5 py-8">
          {tab === "overview" && <Overview pw={pw} setTab={setTab} />}
          {tab === "leads" && <Leads pw={pw} />}
          {tab === "calendar" && <Calendar pw={pw} />}
          {tab === "followups" && <FollowUps pw={pw} />}
          {tab === "settings" && <Settings pw={pw} onPasswordChange={setPw} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- shared lead loader ---------------- */
function useLeads(pw) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/leads", { headers: { "x-admin-password": pw } });
      const json = await res.json();
      setLeads(json.leads || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [pw]);

  return { leads, loading, reload, setLeads };
}

async function patchLead(pw, id, patch) {
  await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-admin-password": pw },
    body: JSON.stringify(patch),
  });
}

/* ---------------- Overview ---------------- */
function Overview({ pw, setTab }) {
  const { leads, loading } = useLeads(pw);
  const total = leads.length;
  const hot = leads.filter((l) => Number(l.score) >= 4).length;
  const upcoming = leads.filter((l) => l.status === "New" || l.status === "Confirmed").length;
  const attended = leads.filter((l) => l.status === "Attended").length;
  const needFollow = leads.filter((l) => daysSince(l.lastContact) >= 7 && l.status !== "Attended").length;

  const cards = [
    { label: "Total Leads", value: total, icon: "👥", tint: "from-leaf to-grass" },
    { label: "Hot Leads (★4-5)", value: hot, icon: "🔥", tint: "from-orange-400 to-rose-500" },
    { label: "Upcoming Sessions", value: upcoming, icon: "📅", tint: "from-sky-400 to-indigo-500" },
    { label: "Attended", value: attended, icon: "✅", tint: "from-emerald-400 to-teal-500" },
  ];

  return (
    <div>
      <Header title="Overview" sub="Your wellness business at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-leaf/10 bg-white p-5 shadow-sm">
            <div className={`mb-3 grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br ${c.tint} text-xl text-white`}>{c.icon}</div>
            <div className="font-display text-3xl font-extrabold">{loading ? "—" : c.value}</div>
            <div className="text-sm text-forest/70">{c.label}</div>
          </div>
        ))}
      </div>

      {needFollow > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-5">
          <div>
            <div className="font-display text-lg font-bold text-rose-700">🔔 {needFollow} lead(s) need a follow-up</div>
            <p className="text-sm text-rose-600/80">Not contacted in 7+ days and haven't attended yet.</p>
          </div>
          <button onClick={() => setTab("followups")} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            Review →
          </button>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-leaf/10 bg-white p-5 shadow-sm">
        <h3 className="font-display text-lg font-bold">Recent signups</h3>
        <div className="mt-3 divide-y divide-leaf/10">
          {leads.slice(0, 5).map((l) => (
            <div key={l.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-semibold">{l.name}</span>
              <span className="text-forest/60">{l.goal}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[l.status]}`}>{l.status}</span>
              <span className="text-forest/50">{fmtDate(l.signupDate)}</span>
            </div>
          ))}
          {!loading && leads.length === 0 && <p className="py-4 text-sm text-forest/60">No leads yet — share your landing page!</p>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Leads table ---------------- */
function Leads({ pw }) {
  const { leads, loading, setLeads } = useLeads(pw);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return leads.filter(
      (l) =>
        l.name.toLowerCase().includes(s) ||
        l.contact.toLowerCase().includes(s) ||
        l.goal.toLowerCase().includes(s) ||
        l.status.toLowerCase().includes(s)
    );
  }, [leads, q]);

  function update(id, patch) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    patchLead(pw, id, patch);
  }

  return (
    <div>
      <Header title="Leads" sub="Edit status, score and notes directly in the table." />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="🔍 Search name, contact, goal or status…"
        className="mb-4 w-full max-w-md rounded-xl border border-leaf/20 bg-white px-4 py-2.5 outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/15"
      />

      <div className="overflow-x-auto rounded-2xl border border-leaf/10 bg-white shadow-sm">
        <table className="w-full min-w-[920px] text-sm">
          <thead>
            <tr className="border-b border-leaf/10 bg-mint/60 text-left text-xs uppercase tracking-wider text-forest/70">
              <Th>Name</Th><Th>Contact</Th><Th>Goal</Th><Th>Status</Th><Th>Score</Th>
              <Th>Notes</Th><Th>Last Contact</Th><Th>Signup</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-leaf/10">
            {filtered.map((l) => {
              const stale = daysSince(l.lastContact) >= 7 && l.status !== "Attended";
              return (
                <tr key={l.id} className={stale ? "bg-rose-50/50" : ""}>
                  <td className="px-3 py-2.5 font-semibold">{l.name}</td>
                  <td className="px-3 py-2.5 text-forest/80">{l.contact}</td>
                  <td className="px-3 py-2.5 text-forest/80">{l.goal}</td>
                  <td className="px-3 py-2.5">
                    <select
                      value={l.status}
                      onChange={(e) => update(l.id, { status: e.target.value })}
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_STYLES[l.status]}`}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <select
                      value={l.score}
                      onChange={(e) => update(l.id, { score: Number(e.target.value) })}
                      className="rounded-lg border border-leaf/20 bg-white px-2 py-1 outline-none"
                    >
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{"★".repeat(n)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5">
                    <input
                      defaultValue={l.notes}
                      onBlur={(e) => e.target.value !== l.notes && update(l.id, { notes: e.target.value })}
                      placeholder="Add note…"
                      className="w-44 rounded-lg border border-leaf/20 bg-white px-2 py-1 outline-none focus:border-leaf"
                    />
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => update(l.id, { lastContact: new Date().toISOString() })}
                      title="Mark contacted today"
                      className={`rounded-lg px-2 py-1 text-xs font-semibold ${stale ? "bg-rose-100 text-rose-700" : "bg-mint text-forest/70"} hover:bg-leaf hover:text-white`}
                    >
                      {fmtDate(l.lastContact)}{stale ? " ⚠" : ""}
                    </button>
                  </td>
                  <td className="px-3 py-2.5 text-forest/60">{fmtDate(l.signupDate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {loading && <p className="p-5 text-sm text-forest/60">Loading…</p>}
        {!loading && filtered.length === 0 && <p className="p-5 text-sm text-forest/60">No leads found.</p>}
      </div>
      <p className="mt-3 text-xs text-forest/50">Tip: click a “Last Contact” date to mark a lead as contacted today. Notes save when you click away.</p>
    </div>
  );
}

/* ---------------- Content Calendar ---------------- */
function Calendar({ pw }) {
  const days = useMemo(() => buildCalendar(new Date(), 30), []);
  const [outputs, setOutputs] = useState({});
  const [busy, setBusy] = useState(null);

  async function generate(day) {
    setBusy(day.index);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ type: "content", data: { topic: day.topic, hook: day.hook } }),
      });
      const json = await res.json();
      setOutputs((p) => ({ ...p, [day.index]: json.ok ? json.text : `⚠ ${json.error}` }));
    } catch {
      setOutputs((p) => ({ ...p, [day.index]: "⚠ Could not reach Claude." }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <Header title="30-Day Content Calendar" sub="A ready-made posting plan. Click “Generate Caption” for an instant, post-ready caption." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => (
          <div key={d.index} className="flex flex-col rounded-2xl border border-leaf/10 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-forest/60">{d.dayLabel}</span>
              <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ backgroundColor: d.color }}>
                {d.category}
              </span>
            </div>
            <h3 className="mt-2 font-display font-bold leading-snug">{d.topic}</h3>
            <p className="mt-1 text-sm italic text-forest/70">“{d.hook}”</p>

            <button
              onClick={() => generate(d)}
              disabled={busy === d.index}
              className="mt-3 self-start rounded-full bg-gradient-to-r from-leaf to-grass px-4 py-1.5 text-xs font-bold text-white shadow-glow transition hover:scale-105 disabled:opacity-60"
            >
              {busy === d.index ? "Writing…" : "✨ Generate Caption"}
            </button>

            {outputs[d.index] && (
              <div className="mt-3">
                <textarea
                  readOnly
                  value={outputs[d.index]}
                  className="h-40 w-full resize-none rounded-xl border border-leaf/15 bg-mint/40 p-3 text-sm outline-none"
                />
                <button
                  onClick={() => navigator.clipboard?.writeText(outputs[d.index])}
                  className="mt-1 text-xs font-semibold text-leaf hover:underline"
                >
                  📋 Copy caption
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Follow-ups ---------------- */
function FollowUps({ pw }) {
  const { leads, loading, setLeads } = useLeads(pw);
  const [outputs, setOutputs] = useState({});
  const [busy, setBusy] = useState(null);

  const stale = leads.filter((l) => daysSince(l.lastContact) >= 7 && l.status !== "Attended");

  async function generate(lead) {
    setBusy(lead.id);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({
          type: "reengagement",
          data: { name: lead.name, goal: lead.goal, status: lead.status, days: daysSince(lead.lastContact) },
        }),
      });
      const json = await res.json();
      setOutputs((p) => ({ ...p, [lead.id]: json.ok ? json.text : `⚠ ${json.error}` }));
    } catch {
      setOutputs((p) => ({ ...p, [lead.id]: "⚠ Could not reach Claude." }));
    } finally {
      setBusy(null);
    }
  }

  function markContacted(id) {
    const iso = new Date().toISOString();
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, lastContact: iso, status: "Follow-up" } : l)));
    patchLead(pw, id, { lastContact: iso, status: "Follow-up" });
  }

  return (
    <div>
      <Header title="Follow-ups" sub="Leads not contacted in 7+ days who haven't attended yet." />
      {loading && <p className="text-sm text-forest/60">Loading…</p>}
      {!loading && stale.length === 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-700">
          🎉 You're all caught up — no follow-ups needed right now!
        </div>
      )}
      <div className="space-y-4">
        {stale.map((l) => (
          <div key={l.id} className="rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg font-bold">{l.name} <span className="text-sm font-normal text-forest/60">· {l.goal}</span></div>
                <div className="text-sm text-rose-600">Last contact {daysSince(l.lastContact)} days ago · {l.contact}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => generate(l)}
                  disabled={busy === l.id}
                  className="rounded-full bg-gradient-to-r from-leaf to-grass px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:scale-105 disabled:opacity-60"
                >
                  {busy === l.id ? "Writing…" : "✨ Generate Re-engagement Message"}
                </button>
                <button onClick={() => markContacted(l.id)} className="rounded-full bg-mint px-4 py-2 text-sm font-semibold text-forest hover:bg-leaf hover:text-white">
                  ✓ Mark contacted
                </button>
              </div>
            </div>
            {outputs[l.id] && (
              <div className="mt-3">
                <textarea readOnly value={outputs[l.id]} className="h-32 w-full resize-none rounded-xl border border-leaf/15 bg-mint/40 p-3 text-sm outline-none" />
                <button onClick={() => navigator.clipboard?.writeText(outputs[l.id])} className="mt-1 text-xs font-semibold text-leaf hover:underline">
                  📋 Copy message
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function Settings({ pw, onPasswordChange }) {
  const [s, setS] = useState(null);
  const [saved, setSaved] = useState("");
  const [newPw, setNewPw] = useState("");

  useEffect(() => {
    fetch("/api/settings", { headers: { "x-admin-password": pw } })
      .then((r) => r.json())
      .then((j) => setS(j.settings));
  }, [pw]);

  async function save(patch, label = "Saved!") {
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-admin-password": pw },
      body: JSON.stringify(patch),
    });
    const j = await res.json();
    if (j.ok) {
      setS(j.settings);
      setSaved(label);
      setTimeout(() => setSaved(""), 2500);
    }
  }

  if (!s) return <p className="text-sm text-forest/60">Loading settings…</p>;

  return (
    <div className="max-w-2xl">
      <Header title="Settings" sub="Your Claude API key, model, password and editable prompt templates." />

      {saved && <div className="mb-4 rounded-xl bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-700">✓ {saved}</div>}

      {/* API key */}
      <Card title="Claude API Key" desc="Get it from console.anthropic.com → API Keys. Stored locally on your computer only.">
        <input
          type="password"
          value={s.apiKey}
          onChange={(e) => setS({ ...s, apiKey: e.target.value })}
          placeholder="sk-ant-..."
          className="w-full rounded-xl border border-leaf/20 bg-white px-4 py-2.5 outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/15"
        />
        <div className="mt-3 flex items-center gap-3">
          <input
            value={s.model}
            onChange={(e) => setS({ ...s, model: e.target.value })}
            className="flex-1 rounded-xl border border-leaf/20 bg-white px-4 py-2.5 text-sm outline-none focus:border-leaf"
          />
          <button onClick={() => save({ apiKey: s.apiKey, model: s.model })} className="rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-forest">
            Save
          </button>
        </div>
        <p className="mt-2 text-xs text-forest/50">Model field default: claude-sonnet-4-20250514</p>
      </Card>

      {/* Prompts */}
      <Card title="Prompt Templates" desc="Use {placeholders} like {name}, {goal}, {status}, {days}, {topic}, {hook}. They're filled in automatically.">
        {Object.entries(s.prompts).map(([key, val]) => (
          <div key={key} className="mb-3">
            <label className="mb-1 block text-sm font-semibold capitalize text-forest">{key}</label>
            <textarea
              value={val}
              onChange={(e) => setS({ ...s, prompts: { ...s.prompts, [key]: e.target.value } })}
              className="h-24 w-full resize-y rounded-xl border border-leaf/20 bg-white p-3 text-sm outline-none focus:border-leaf"
            />
          </div>
        ))}
        <button onClick={() => save({ prompts: s.prompts })} className="rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-forest">
          Save Templates
        </button>
      </Card>

      {/* Password */}
      <Card title="Change Admin Password" desc="Choose a new password for this dashboard.">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            placeholder="New password"
            className="flex-1 rounded-xl border border-leaf/20 bg-white px-4 py-2.5 outline-none focus:border-leaf"
          />
          <button
            onClick={async () => {
              if (!newPw.trim()) return;
              await save({ password: newPw }, "Password changed!");
              localStorage.setItem("coachPw", newPw);
              onPasswordChange(newPw);
              setNewPw("");
            }}
            className="rounded-xl bg-leaf px-5 py-2.5 font-semibold text-white hover:bg-forest"
          >
            Update
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ---------------- small helpers ---------------- */
function Header({ title, sub }) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-2xl font-extrabold sm:text-3xl">{title}</h1>
      {sub && <p className="text-sm text-forest/70">{sub}</p>}
    </div>
  );
}
function Th({ children }) {
  return <th className="px-3 py-3 font-semibold">{children}</th>;
}
function Card({ title, desc, children }) {
  return (
    <div className="mb-5 rounded-2xl border border-leaf/10 bg-white p-5 shadow-sm">
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {desc && <p className="mb-3 text-sm text-forest/70">{desc}</p>}
      {children}
    </div>
  );
}
