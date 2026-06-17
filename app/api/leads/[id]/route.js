import { NextResponse } from "next/server";
import { updateLead, checkPassword } from "@/lib/db";

export async function PATCH(req, { params }) {
  const pw = req.headers.get("x-admin-password");
  if (!(await checkPassword(pw))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const patch = await req.json();
    const lead = await updateLead(params.id, patch);
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ ok: true, lead });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not update lead." }, { status: 500 });
  }
}
