"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const GOALS = [
  "Weight Loss",
  "Weight Gain",
  "Immune Health",
  "Digestive Health",
  "Healthy Lifestyle",
  "Skin Health",
];

const GOAL_CARDS = [
  { title: "Weight Loss", icon: "🔥", desc: "Shed fat sustainably — no crash diets, no starving." },
  { title: "Weight Gain", icon: "💪", desc: "Build healthy, lean weight the clean, nourishing way." },
  { title: "Immune Health", icon: "🛡️", desc: "Stop falling sick — strengthen immunity from your plate." },
  { title: "Digestive Health", icon: "🌿", desc: "Beat bloating, fix your gut, feel light all day." },
  { title: "Healthy Lifestyle", icon: "⚡", desc: "Tiny daily habits that transform your energy." },
  { title: "Skin Health", icon: "✨", desc: "Glow from within with nutrition for radiant skin." },
];

const STEPS = [
  { n: "01", t: "Pick your goal", d: "Tell us what you want to achieve in 30 seconds." },
  { n: "02", t: "Get the Zoom link", d: "We send your private link on WhatsApp / email." },
  { n: "03", t: "Join at 7 PM", d: "Hop on the free live session and get your plan." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.08, ease: "easeOut" },
  }),
};

export default function Landing() {
  const [form, setForm] = useState({ name: "", contact: "", goal: "Weight Loss" });
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [errMsg, setErrMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.contact.trim()) {
      setStatus("error");
      setErrMsg("Please enter your name and WhatsApp/email.");
      return;
    }
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, sessionType: "Zoom" }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
      setErrMsg("Something went wrong. Please try again.");
    }
  }

  return (
    <main className="relative overflow-hidden font-body text-ink">
      {/* ---------------- NAV ---------------- */}
      <nav className="relative z-30 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-leaf to-lime text-white shadow-glow">
            🌱
          </span>
          Wellness<span className="text-leaf"> Coach</span>
        </div>
        <a
          href="#join"
          className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-105 hover:bg-forest"
        >
          Book Free Session
        </a>
      </nav>

      {/* ---------------- HERO ---------------- */}
      <section className="mesh-bg relative">
        {/* floating blobs */}
        <div className="blob left-[-80px] top-10 h-72 w-72 bg-grass" />
        <div className="blob right-[-60px] top-32 h-80 w-80 bg-lime" style={{ animationDelay: "-6s" }} />
        <div className="blob bottom-[-60px] left-1/3 h-72 w-72 bg-sprout" style={{ animationDelay: "-12s" }} />

        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pb-24 pt-10 md:grid-cols-2 md:pt-16">
          {/* left copy */}
          <div>
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="inline-flex items-center gap-2 rounded-full border border-leaf/30 bg-white/70 px-4 py-2 text-xs font-bold uppercase tracking-wider text-forest shadow-sm backdrop-blur"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-leaf" />
              </span>
              Free Zoom Session · 7 PM Daily
            </motion.div>

            <motion.h1
              variants={fadeUp}
              custom={1}
              initial="hidden"
              animate="show"
              className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl"
            >
              Transform your health,{" "}
              <span className="shine-text">one evening</span> at a time.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={2}
              initial="hidden"
              animate="show"
              className="mt-5 max-w-md text-lg text-forest/80"
            >
              Join a certified nutrition coach live on Zoom — every night at 7 PM.
              Personalised guidance for weight, immunity, digestion, skin & a
              healthier lifestyle. 100% free.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={3}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center gap-5"
            >
              <a
                href="#join"
                className="group rounded-full bg-gradient-to-r from-leaf to-grass px-7 py-3.5 font-semibold text-white shadow-glow transition hover:scale-105"
              >
                Claim Your Free Spot →
              </a>
              <div className="flex items-center gap-3 text-sm text-forest/70">
                <div className="flex -space-x-2">
                  {["🧑🏽","👩🏻","🧔🏾","👩🏼"].map((e, i) => (
                    <span key={i} className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-mint text-sm">{e}</span>
                  ))}
                </div>
                <span><b className="text-ink">2,400+</b> people joined</span>
              </div>
            </motion.div>
          </div>

          {/* right: form card */}
          <motion.div
            id="join"
            variants={fadeUp}
            custom={2}
            initial="hidden"
            animate="show"
            className="glass relative rounded-3xl p-6 shadow-card sm:p-8"
          >
            <div className="absolute -right-3 -top-3 rotate-6 rounded-full bg-lime px-3 py-1 text-xs font-bold text-ink shadow">
              100% FREE
            </div>
            {status === "done" ? (
              <div className="py-10 text-center">
                <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-leaf to-lime text-3xl text-white shadow-glow">
                  ✓
                </div>
                <h3 className="font-display text-2xl font-bold">You're in! 🎉</h3>
                <p className="mt-2 text-forest/80">
                  We'll send your private 7 PM Zoom link to <b>{form.contact}</b> shortly.
                  Check your messages!
                </p>
                <button
                  onClick={() => { setStatus("idle"); setForm({ name: "", contact: "", goal: "Weight Loss" }); }}
                  className="mt-6 text-sm font-semibold text-leaf underline"
                >
                  Register someone else
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <h3 className="font-display text-2xl font-bold">Book your free session</h3>
                <p className="-mt-2 text-sm text-forest/70">Takes 30 seconds. No payment, ever.</p>

                <Field
                  label="Your name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="e.g. Priya Sharma"
                />
                <Field
                  label="WhatsApp number or email"
                  value={form.contact}
                  onChange={(v) => setForm({ ...form, contact: v })}
                  placeholder="e.g. +91 98765 43210"
                />

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-forest">
                    What's your main goal?
                  </label>
                  <select
                    value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })}
                    className="w-full rounded-xl border border-leaf/20 bg-white/80 px-4 py-3 font-medium text-ink outline-none transition focus:border-leaf focus:ring-4 focus:ring-leaf/15"
                  >
                    {GOALS.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* hidden session type */}
                <input type="hidden" name="sessionType" value="Zoom" />

                {status === "error" && (
                  <p className="text-sm font-medium text-red-600">{errMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full rounded-xl bg-gradient-to-r from-leaf to-grass py-3.5 font-bold text-white shadow-glow transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {status === "loading" ? "Reserving your spot…" : "Reserve My Free Spot →"}
                </button>
                <p className="text-center text-xs text-forest/60">
                  🔒 Your details are stored privately. We never spam.
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      {/* ---------------- GOALS GRID ---------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading
          kicker="Pick your path"
          title="One coach. Six transformations."
          sub="Whatever your body needs, there's a free session for it."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GOAL_CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              className="group rounded-2xl border border-leaf/10 bg-white p-6 shadow-sm transition hover:-translate-y-1.5 hover:border-leaf/30 hover:shadow-card"
            >
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-mint text-2xl transition group-hover:scale-110">
                {c.icon}
              </div>
              <h3 className="font-display text-xl font-bold">{c.title}</h3>
              <p className="mt-2 text-sm text-forest/75">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-forest to-ink py-20 text-white">
        <div className="blob right-10 top-10 h-64 w-64 bg-leaf opacity-30" />
        <div className="relative z-10 mx-auto max-w-6xl px-5">
          <SectionHeading
            kicker="So simple"
            title="From signup to glow-up in 3 steps"
            light
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeUp}
                custom={i}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur"
              >
                <div className="font-display text-5xl font-extrabold text-lime/90">{s.n}</div>
                <h3 className="mt-3 font-display text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-sm text-white/70">{s.d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- TESTIMONIALS ---------------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <SectionHeading kicker="Real results" title="People are thriving" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { n: "Anjali R.", g: "Weight Loss", q: "Lost 6 kg in two months without ever feeling hungry. The 7 PM sessions kept me accountable!" },
            { n: "Rahul M.", g: "Digestive Health", q: "My bloating is completely gone. I actually look forward to the live calls every night." },
            { n: "Sneha K.", g: "Skin Health", q: "My skin is glowing and I feel lighter. Can't believe this is free!" },
          ].map((t, i) => (
            <motion.div
              key={t.n}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="rounded-2xl border border-leaf/10 bg-white p-6 shadow-sm"
            >
              <div className="text-lime">★★★★★</div>
              <p className="mt-3 text-forest/85">“{t.q}”</p>
              <div className="mt-4 text-sm font-semibold text-ink">
                {t.n} <span className="font-normal text-forest/60">· {t.g}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------- FINAL CTA ---------------- */}
      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="mesh-bg relative overflow-hidden rounded-3xl border border-leaf/20 p-10 text-center shadow-card sm:p-14">
          <div className="blob left-10 top-0 h-48 w-48 bg-lime" />
          <div className="relative z-10">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
              Your free seat for <span className="shine-text">tonight's 7 PM</span> session is waiting.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-forest/80">
              Join thousands building healthier bodies — one evening at a time. No fees, no pressure.
            </p>
            <a
              href="#join"
              className="mt-8 inline-block rounded-full bg-gradient-to-r from-leaf to-grass px-8 py-4 font-bold text-white shadow-glow transition hover:scale-105"
            >
              Claim My Free Spot →
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-leaf/10 bg-mint">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-forest/70 sm:flex-row">
          <div className="font-display font-bold text-ink">🌱 Wellness Coach</div>
          <p>© {new Date().getFullYear()} Wellness Coach. Free daily 7 PM Zoom sessions.</p>
          <a href="/admin" className="text-forest/50 transition hover:text-leaf">Coach Login</a>
        </div>
      </footer>
    </main>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-forest">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-leaf/20 bg-white/80 px-4 py-3 text-ink outline-none transition placeholder:text-forest/40 focus:border-leaf focus:ring-4 focus:ring-leaf/15"
      />
    </div>
  );
}

function SectionHeading({ kicker, title, sub, light }) {
  return (
    <div className="text-center">
      <div className={`text-xs font-bold uppercase tracking-[0.2em] ${light ? "text-lime" : "text-leaf"}`}>
        {kicker}
      </div>
      <h2 className={`mt-3 font-display text-3xl font-extrabold sm:text-4xl ${light ? "text-white" : "text-ink"}`}>
        {title}
      </h2>
      {sub && <p className={`mx-auto mt-3 max-w-md ${light ? "text-white/70" : "text-forest/70"}`}>{sub}</p>}
    </div>
  );
}
