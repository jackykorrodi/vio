import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    const { organisation, beschreibung, url } = await request.json();

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
    const raw = result.response.text().trim();
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const headlines = JSON.parse(clean);

    return NextResponse.json({ headlines });
  } catch {
    return NextResponse.json({ headlines: [] }, { status: 200 });
  }
}
