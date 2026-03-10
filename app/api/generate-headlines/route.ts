import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ headlines: [] }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ headlines: [] }, { status: 400 });
    }
    const inputBody = body as Record<string, unknown>;

    // Validate and sanitise inputs
    const organisation = typeof inputBody.organisation === 'string' ? inputBody.organisation.slice(0, 200) : '';
    const beschreibung = typeof inputBody.beschreibung === 'string' ? inputBody.beschreibung.slice(0, 500) : '';
    const url = typeof inputBody.url === 'string' ? inputBody.url.slice(0, 2048) : '';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Erstelle 5 kurze Werbe-Headlines für folgendes Unternehmen:
Organisation: ${organisation || 'Unbekannt'}
Beschreibung: ${beschreibung || 'Keine'}
Website: ${url || ''}

Regeln:
- Max. 5 Wörter pro Headline
- Auf Deutsch, direkte Ansprache
- Prägnant, emotional, werbewirksam
- Für DOOH/Display-Werbung in der Schweiz geeignet
- Keine Satzzeichen am Ende ausser Ausrufezeichen wenn passend

Antworte NUR mit einem JSON-Array von 5 Strings (kein Text davor/danach, keine Backticks):
["Headline 1", "Headline 2", "Headline 3", "Headline 4", "Headline 5"]`;

    const result = await model.generateContent(prompt);
    const rawResponse = result.response.text().trim();
    const clean = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const headlines = JSON.parse(clean);

    return NextResponse.json({ headlines });
  } catch {
    return NextResponse.json({ headlines: [] }, { status: 200 });
  }
}
