import { NextResponse } from "next/server";
import { getSettings, saveSettings, checkPassword } from "@/lib/db";

export async function GET(req) {
  const pw = req.headers.get("x-admin-password");
  if (!(await checkPassword(pw))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  const pw = req.headers.get("x-admin-password");
  if (!(await checkPassword(pw))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const patch = await req.json();
    if ("password" in patch && (!patch.password || !patch.password.trim())) {
      delete patch.password;
    }
    const settings = await saveSettings(patch);
    return NextResponse.json({ ok: true, settings });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not save settings." }, { status: 500 });
  }
}
