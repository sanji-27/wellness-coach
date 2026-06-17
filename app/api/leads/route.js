import { NextResponse } from "next/server";
import { getLeads, addLead, checkPassword } from "@/lib/db";

export async function POST(req) {
  try {
    const body = await req.json();
    if (!body.name || !body.contact) {
      return NextResponse.json({ error: "Name and contact are required." }, { status: 400 });
    }
    const lead = await addLead({
      name: body.name,
      contact: body.contact,
      goal: body.goal,
      sessionType: body.sessionType || "Zoom",
    });
    return NextResponse.json({ ok: true, lead });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not save lead." }, { status: 500 });
  }
}

export async function GET(req) {
  const pw = req.headers.get("x-admin-password");
  if (!(await checkPassword(pw))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const leads = await getLeads();
    return NextResponse.json({ leads });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not fetch leads." }, { status: 500 });
  }
}
