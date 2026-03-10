import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  try {
    console.log('=== API CALLED ===');

    // --- Input validation ---
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const { url, campaignType } = body as Record<string, unknown>;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL fehlt' }, { status: 400 });
    }
    if (url.length > 2048) {
      return NextResponse.json({ error: 'URL zu lang' }, { status: 400 });
    }
    if (campaignType !== undefined && typeof campaignType !== 'string') {
      return NextResponse.json({ error: 'Ungültiger campaignType' }, { status: 400 });
    }

    console.log('URL received:', url);
    console.log('FIRECRAWL KEY exists:', !!process.env.FIRECRAWL_API_KEY);
    console.log('GEMINI KEY exists:', !!process.env.GEMINI_API_KEY);

    let cleanUrl = (url as string).trim();
    // Reject non-http(s) schemes explicitly
    if (/^[a-z][a-z0-9+\-.]*:/i.test(cleanUrl) &&
        !cleanUrl.startsWith('http://') &&
        !cleanUrl.startsWith('https://')) {
      return NextResponse.json({ error: 'Ungültiges URL-Schema' }, { status: 400 });
    }
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    console.log('=== FIRECRAWL START ===', cleanUrl);

    const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

    let scrapedContent = '';
    let pageTitle = '';
    let ogImage = '';
    let ogLogo = '';
    let favicon = '';
    let themeColor = '';

    try {
      const firecrawlTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firecrawl timeout')), 20000)
      );
      const crawlResult = await Promise.race([
        firecrawl.scrape(cleanUrl, { formats: ['markdown'], waitFor: 2000 }),
        firecrawlTimeout,
      ]);
      type CrawlMeta = {
        title?: string;
        ogImage?: string;
        ogLogo?: string;
        favicon?: string;
        themeColor?: string;
        'theme-color'?: string;
      };
      type CrawlResult = { markdown?: string; metadata?: CrawlMeta };
      const typed = crawlResult as CrawlResult;
      scrapedContent = typed.markdown || '';
      pageTitle = typed.metadata?.title || '';
      ogImage = typed.metadata?.ogImage || '';
      ogLogo = typed.metadata?.ogLogo || '';
      favicon = typed.metadata?.favicon || '';
      themeColor = typed.metadata?.themeColor || typed.metadata?.['theme-color'] || '';
      console.log('Title:', pageTitle);
      console.log('ogImage:', ogImage);
      console.log('themeColor:', themeColor);
      console.log('Content length:', scrapedContent.length);
    } catch (e) {
      console.error('Firecrawl error:', e);
      return NextResponse.json({ isManualFallback: true }, { status: 200 });
    }

    if (scrapedContent.length < 100) {
      return NextResponse.json({ isManualFallback: true }, { status: 200 });
    }

    console.log('=== GEMINI START ===');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const isB2B = campaignType === 'b2b';

    const b2cPrompt = `Du bist ein präziser Schweizer Mediaplanungs-Experte.
Analysiere diesen Website-Content für eine B2C Werbekampagne in der Schweiz.

ABSOLUTE REGELN:
- Nutze NUR Informationen die EXPLIZIT im Content stehen
- Halluziniere NICHTS — lieber null oder [] als falsch
- Bei Unsicherheit IMMER null oder leeres Array []

FELDDEFINITIONEN:
- organisation: Exakter Firmenname aus Logo, H1 oder Footer. Wenn unklar: null
- beschreibung: 1-2 Sätze was die Organisation macht. Wenn unklar: null
- region: Nur wenn Schweizer Kanton, Stadt oder Adresse EXPLIZIT erwähnt. Gültige Kürzel: ZH, BE, LU, UR, SZ, OW, NW, GL, ZG, FR, SO, BS, BL, SH, AR, AI, SG, GR, AG, TG, TI, VD, VS, NE, GE, JU. Sonst []
- gemeinden: Nur wenn KONKRETE Schweizer Gemeindenamen explizit vorkommen. Sonst []
- alter: Ableiten aus Angeboten, Sprache, Bildbeschreibungen. "jung"=18-34 Jahre, "mittel"=35-54 Jahre, "alt"=55+ Jahre. Mehrere Werte möglich. Sonst []
- einkommen: Aus Preissegment, Luxus-/Budget-Signalen. "tief"=Discounter/Sozialhilfe, "mittel"=Durchschnitt, "hoch"=Premium/Luxus. Sonst null
- wohnsituation: Nur wenn Mieten oder Kaufen explizit thematisiert. "mieter" oder "eigentuemer". Sonst null
- wohnlage: Aus Stadtbezug, Stichwörtern wie "urban", "Agglomeration", "ländlich", "Dorf". "staedtisch", "agglo", "laendlich". Mehrere möglich. Sonst []
- lifecycle: Aus Familien-/Lebensphasenangeboten. Optionen: "junge_paare", "singles", "junge_familien", "familien_aeltere_kinder", "eltern_erwachsene_kinder". Mehrere möglich. Sonst []
- kinder: Aus Kinderangeboten, Familienthemen. "keine", "ein_kind", "mehrere". Sonst null
- bildung: Aus Sprachniveau, Produktkomplexität, Berufsgruppen. "tief"=einfach, "mittel"=durchschnittlich, "hoch"=akademisch. Sonst null
- auto: Aus Standort, Parkplatz, Mobilität, Lieferdienst. "kein_auto", "ein_auto", "mehrere_autos". Sonst null
- sprache: Welche Sprachen werden auf der Website verwendet? "de", "fr", "it". Mindestens []

CONTENT:
${scrapedContent.substring(0, 5000)}

Antworte NUR mit diesem JSON (kein Text davor/danach, keine Backticks, kein Markdown):
{
  "organisation": null,
  "beschreibung": null,
  "region": [],
  "gemeinden": [],
  "alter": [],
  "einkommen": null,
  "wohnsituation": null,
  "wohnlage": [],
  "lifecycle": [],
  "kinder": null,
  "bildung": null,
  "auto": null,
  "sprache": ["de"]
}`;

    const b2bPrompt = `Du bist ein präziser Schweizer Mediaplanungs-Experte.
Analysiere diesen Website-Content für eine B2B Werbekampagne in der Schweiz.

ABSOLUTE REGELN:
- Nutze NUR Informationen die EXPLIZIT im Content stehen
- Halluziniere NICHTS — lieber null oder [] als falsch
- Bei Unsicherheit IMMER null oder leeres Array []

FELDDEFINITIONEN:
- organisation: Exakter Firmenname aus Logo, H1 oder Footer. Wenn unklar: null
- beschreibung: 1-2 Sätze was die Organisation macht. Wenn unklar: null
- branche: Hauptbranche als NOGA-Kategoriename. Wähle aus: "Detailhandel", "Gastronomie & Hotellerie", "Bau & Handwerk", "Gesundheit & Soziales", "Bildung", "Finanz & Versicherung", "Immobilien", "IT & Kommunikation", "Produktion & Industrie", "Transport & Logistik", "Öffentliche Verwaltung", "Andere". Wenn unklar: null
- nogaCode: 2-stelliger NOGA-Code. Beispiele: "47"=Detailhandel, "55"=Gastronomie, "41"=Bau, "86"=Gesundheit, "85"=Bildung, "64"=Finanz, "68"=Immobilien, "58"=IT/Kommunikation, "10"=Industrie, "49"=Transport, "84"=Verwaltung. Nur wenn klar ableitbar. Sonst null
- region: Nur wenn Schweizer Kanton, Stadt oder Adresse EXPLIZIT erwähnt. Kürzel: ZH, BE, LU, UR, SZ, OW, NW, GL, ZG, FR, SO, BS, BL, SH, AR, AI, SG, GR, AG, TG, TI, VD, VS, NE, GE, JU. Sonst []
- sprache: Welche Sprachen werden auf der Website verwendet? "de", "fr", "it". Mindestens ["de"]
- unternehmensgroesse: Array mit Unternehmensgrössenklassen der ZIELKUNDEN (nicht des Werbenden selbst). Mögliche Werte: "micro" (1–9 MA), "klein" (10–49 MA), "mittel" (50–249 MA), "gross" (250+ MA). Mehrere möglich. Wenn unklar: []

CONTENT:
${scrapedContent.substring(0, 5000)}

Antworte NUR mit diesem JSON (kein Text davor/danach, keine Backticks, kein Markdown):
{
  "organisation": null,
  "beschreibung": null,
  "branche": null,
  "nogaCode": null,
  "region": [],
  "sprache": ["de"],
  "unternehmensgroesse": []
}`;

    try {
      const prompt = isB2B ? b2bPrompt : b2cPrompt;
      const result = await model.generateContent(prompt);
      const raw = result.response.text();
      console.log('=== GEMINI RAW ===', raw);

      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const geminiData = JSON.parse(clean);

      // Build full AnalysisResult with defaults for missing fields
      const analysis = isB2B
        ? {
            organisation: geminiData.organisation ?? null,
            beschreibung: geminiData.beschreibung ?? null,
            region: Array.isArray(geminiData.region) ? geminiData.region : [],
            sprache: Array.isArray(geminiData.sprache) ? geminiData.sprache : ['de'],
            // B2C fields empty for B2B
            gemeinden: [],
            alter: [],
            einkommen: null,
            wohnsituation: null,
            wohnlage: [],
            lifecycle: [],
            kinder: null,
            bildung: null,
            auto: null,
            // B2B fields
            branche: geminiData.branche ?? null,
            nogaCode: geminiData.nogaCode ?? null,
            unternehmensgroesse: Array.isArray(geminiData.unternehmensgroesse)
              ? geminiData.unternehmensgroesse
              : [],
            // Meta
            needsManualInput: !geminiData.organisation,
            isManualFallback: false,
            pageTitle,
            ogImage,
            ogLogo,
            favicon,
            themeColor,
          }
        : {
            organisation: geminiData.organisation ?? null,
            beschreibung: geminiData.beschreibung ?? null,
            region: Array.isArray(geminiData.region) ? geminiData.region : [],
            sprache: Array.isArray(geminiData.sprache) ? geminiData.sprache : ['de'],
            // B2C fields
            gemeinden: Array.isArray(geminiData.gemeinden) ? geminiData.gemeinden : [],
            alter: Array.isArray(geminiData.alter) ? geminiData.alter : [],
            einkommen: geminiData.einkommen ?? null,
            wohnsituation: geminiData.wohnsituation ?? null,
            wohnlage: Array.isArray(geminiData.wohnlage) ? geminiData.wohnlage : [],
            lifecycle: Array.isArray(geminiData.lifecycle) ? geminiData.lifecycle : [],
            kinder: geminiData.kinder ?? null,
            bildung: geminiData.bildung ?? null,
            auto: geminiData.auto ?? null,
            // B2B fields empty for B2C
            branche: null,
            nogaCode: null,
            unternehmensgroesse: [],
            // Meta
            needsManualInput: !geminiData.organisation,
            isManualFallback: false,
            pageTitle,
            ogImage,
            ogLogo,
            favicon,
            themeColor,
          };

      return NextResponse.json(analysis);
    } catch (e) {
      console.error('Gemini error:', e);
      return NextResponse.json({ isManualFallback: true }, { status: 200 });
    }
  } catch (e) {
    console.error('General error:', e);
    return NextResponse.json({ isManualFallback: true }, { status: 500 });
  }
}
