import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const webhookUrl = process.env.N8N_SAVE_PROGRESS_WEBHOOK_URL;

  if (!webhookUrl) {
    return NextResponse.json(
      { error: "N8N_SAVE_PROGRESS_WEBHOOK_URL ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  const body = await req.json();

  const upstream = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "Webhook-Anfrage fehlgeschlagen.", status: upstream.status },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
