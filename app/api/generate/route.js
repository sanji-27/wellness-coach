import { NextResponse } from "next/server";
import { getSettings, checkPassword } from "@/lib/db";

function fillTemplate(template, data) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    data[key] !== undefined && data[key] !== null ? String(data[key]) : ""
  );
}

export async function POST(req) {
  const pw = req.headers.get("x-admin-password");
  if (!(await checkPassword(pw))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();
  if (!settings.apiKey) {
    return NextResponse.json(
      { error: "No Claude API key set. Add it in Dashboard → Settings." },
      { status: 400 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { type, data = {} } = body;
  const template = settings.prompts?.[type];
  if (!template) {
    return NextResponse.json({ error: "Unknown generation type." }, { status: 400 });
  }

  const prompt = fillTemplate(template, data);

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": settings.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: settings.model || "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const json = await resp.json();

    if (!resp.ok) {
      const msg = json?.error?.message || "Claude API request failed.";
      return NextResponse.json({ error: msg }, { status: resp.status });
    }

    const text =
      Array.isArray(json.content) && json.content[0]?.text
        ? json.content[0].text.trim()
        : "";

    return NextResponse.json({ ok: true, text });
  } catch (e) {
    return NextResponse.json(
      { error: "Could not reach Claude. Check your internet and API key." },
      { status: 500 }
    );
  }
}
