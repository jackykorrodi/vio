import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal but useful fallback from just the URL domain. */
function domainFallback(rawUrl: string) {
  let domain = rawUrl;
  let org    = rawUrl;
  try {
    const u = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    domain   = u.hostname.replace('www.', '');
    org      = domain.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch { /* keep raw values */ }

  return {
    organisation: org,
    beschreibung: null,
    region: [] as string[],
    sprache: ['de'],
    gemeinden: [] as string[],
    alter: [] as string[],
    einkommen: null,
    wohnsituation: null,
    wohnlage: [] as string[],
    lifecycle: [] as string[],
    kinder: null,
    bildung: null,
    auto: null,
    branche: null,
    nogaCode: null,
    unternehmensgroesse: [] as string[],
    needsManualInput: false,
    isManualFallback: false,
    pageTitle: '',
    ogImage: '',
    ogLogo: '',
    favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    themeColor: '#C1666B',
    headlines: [
      `${org} – für Sie`,
      `Wer braucht schon mehr als ${org}?`,
      `${org} – nah bei Ihnen`,
    ],
  };
}

/** Extract the highest-quality icon URL from raw HTML link tags. */
function extractLargeIcon(html: string, baseUrl: string): string {
  const patterns = [
    /<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i,
    /<link[^>]+sizes=["']192x192["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*sizes=["']192x192["']/i,
    /<link[^>]+sizes=["']180x180["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*sizes=["']180x180["']/i,
    /<link[^>]+sizes=["']128x128["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]*sizes=["']128x128["']/i,
  ];
  let base = '';
  try { const u = new URL(baseUrl); base = `${u.protocol}//${u.host}`; } catch { /* ignore */ }

  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) {
      const href = m[1].trim();
      if (href.startsWith('http')) return href;
      if (href.startsWith('//'))   return `https:${href}`;
      if (href.startsWith('/'))    return `${base}${href}`;
      return href;
    }
  }
  return '';
}

// Images containing these words are UI noise — skip them
const OG_IMAGE_BLOCKLIST = [
  'cashless', 'popup', 'modal', 'cookie', 'notice', 'hinweis',
  'banner-ad', 'notification', 'consent', 'gdpr', 'overlay',
];
function isBlockedImage(url: string): boolean {
  const lower = url.toLowerCase();
  return OG_IMAGE_BLOCKLIST.some(w => lower.includes(w));
}

/** Extract og:image / twitter:image / first large absolute <img> from HTML, skipping blocked URLs. */
function extractOgImage(html: string): string {
  // Collect all og:image candidates
  const ogRe = /<meta[^>]+(?:property=["']og:image["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*property=["']og:image["'])/gi;
  let m: RegExpExecArray | null;
  while ((m = ogRe.exec(html)) !== null) {
    const url = (m[1] || m[2] || '').trim();
    if (url.startsWith('http') && !isBlockedImage(url)) return url;
  }

  // twitter:image
  const twRe = /<meta[^>]+(?:name=["']twitter:image["'][^>]*content=["']([^"']+)["']|content=["']([^"']+)["'][^>]*name=["']twitter:image["'])/gi;
  while ((m = twRe.exec(html)) !== null) {
    const url = (m[1] || m[2] || '').trim();
    if (url.startsWith('http') && !isBlockedImage(url)) return url;
  }

  // First absolute-URL img that isn't an icon/avatar/pixel
  const imgRe = /<img[^>]+src=["'](https?:\/\/[^"']+\.(jpg|jpeg|png|webp)[^"']*)["']/gi;
  let imgM: RegExpExecArray | null;
  while ((imgM = imgRe.exec(html)) !== null) {
    const src = imgM[1];
    if (!/icon|logo|avatar|pixel|tracking|1x1/i.test(src) && !isBlockedImage(src)) return src;
  }
  return '';
}

/** Extract theme color from HTML: <meta name="theme-color">, then most-frequent CSS hex color. */
function extractThemeColor(html: string): string {
  // 1. <meta name="theme-color" content="#rrggbb">
  let m = html.match(/<meta[^>]+name=["']theme-color["'][^>]*content=["']\s*(#[0-9a-f]{3,6})\s*["']/i);
  if (!m) m = html.match(/<meta[^>]+content=["']\s*(#[0-9a-f]{3,6})\s*["'][^>]*name=["']theme-color["']/i);
  if (m?.[1]) return m[1];

  // 2. Most frequent hex color in inline styles + <style> blocks
  //    (only count colors that look like brand colors — skip near-white/near-black/gray)
  const colorRe = /#([0-9a-f]{6}|[0-9a-f]{3})\b/gi;
  const freq: Record<string, number> = {};
  let c: RegExpExecArray | null;
  while ((c = colorRe.exec(html)) !== null) {
    const raw = c[1].length === 3
      ? c[1].split('').map(x => x + x).join('')   // expand 3→6
      : c[1];
    const hex = raw.toLowerCase();
    // Skip near-white (>e0e0e0), near-black (<202020), and pure grays (r≈g≈b)
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const isLight = r > 0xe0 && g > 0xe0 && b > 0xe0;
    const isDark  = r < 0x20 && g < 0x20 && b < 0x20;
    const isGray  = Math.abs(r-g) < 15 && Math.abs(g-b) < 15 && Math.abs(r-b) < 15;
    if (!isLight && !isDark && !isGray) freq[`#${hex}`] = (freq[`#${hex}`] || 0) + 1;
  }
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0) return sorted[0][0];

  return '';
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 25-second hard timeout on the entire route ─────────────────────────────
  const routeTimeout = new Promise<NextResponse>(resolve =>
    setTimeout(() => {
      console.error('ROUTE TIMEOUT after 25s');
      resolve(NextResponse.json(domainFallback(''), { status: 200 }));
    }, 25000)
  );

  return Promise.race([handleRequest(request), routeTimeout]);
}

async function handleRequest(request: NextRequest): Promise<NextResponse> {
  // ── FATAL wrapper — nothing should escape silently ─────────────────────────
  let rawUrl = '';
  try {

  console.log('=== /api/analyze-url CALLED ===');

  // ── Input validation ───────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch (e) {
    console.error('JSON parse error:', e);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { url, campaignType } = body as Record<string, unknown>;
  rawUrl = typeof url === 'string' ? url : '';

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL fehlt' }, { status: 400 });
  }
  if (url.length > 2048) {
    return NextResponse.json({ error: 'URL zu lang' }, { status: 400 });
  }
  if (campaignType !== undefined && typeof campaignType !== 'string') {
    return NextResponse.json({ error: 'Ungültiger campaignType' }, { status: 400 });
  }

  // ── Normalise URL ──────────────────────────────────────────────────────────
  let cleanUrl = url.trim();
  if (/^[a-z][a-z0-9+\-.]*:/i.test(cleanUrl) &&
      !cleanUrl.startsWith('http://') &&
      !cleanUrl.startsWith('https://')) {
    return NextResponse.json({ error: 'Ungültiges URL-Schema' }, { status: 400 });
  }
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = 'https://' + cleanUrl;
  }

  // ── Early diagnostic log (visible immediately in Vercel logs) ────────────
  console.log('=== ANALYZE-URL CALLED, URL:', cleanUrl,
    'FIRECRAWL:', !!process.env.FIRECRAWL_API_KEY,
    'GEMINI:', !!process.env.GEMINI_API_KEY);
  if (!process.env.FIRECRAWL_API_KEY) console.warn('⚠️  FIRECRAWL_API_KEY is NOT SET');
  if (!process.env.GEMINI_API_KEY)    console.warn('⚠️  GEMINI_API_KEY is NOT SET');

  // ── Early exit if no API key ───────────────────────────────────────────────
  if (!process.env.FIRECRAWL_API_KEY) {
    console.warn('FIRECRAWL_API_KEY missing — returning domain fallback');
    return NextResponse.json(domainFallback(cleanUrl));
  }

  // ── Firecrawl scrape ───────────────────────────────────────────────────────
  let scrapedContent = '';
  let pageTitle      = '';
  let ogImage        = '';
  let ogLogo         = '';
  let favicon        = '';
  let themeColor     = '';
  let rawHtml        = '';

  try {
    console.log('=== FIRECRAWL START ===');
    const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });
    const timeout   = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firecrawl timeout')), 20000)
    );
    const crawlResult = await Promise.race([
      firecrawl.scrape(cleanUrl, { formats: ['markdown', 'html'], waitFor: 2000 }),
      timeout,
    ]);

    type CrawlMeta = {
      title?: string;
      ogImage?: string;
      ogLogo?: string;
      favicon?: string;
      themeColor?: string;
      'theme-color'?: string;
      [key: string]: unknown;
    };
    type CrawlResult = { markdown?: string; html?: string; metadata?: CrawlMeta };
    const typed = crawlResult as CrawlResult;

    scrapedContent = typed.markdown || '';
    rawHtml        = typed.html     || '';

    console.log('=== FIRECRAWL METADATA (full) ===', JSON.stringify(typed.metadata, null, 2));
    console.log('Markdown length:', scrapedContent.length, '/ HTML length:', rawHtml.length);

    pageTitle  = typed.metadata?.title      || '';
    ogImage    = typed.metadata?.ogImage    || '';
    ogLogo     = typed.metadata?.ogLogo     || '';
    favicon    = typed.metadata?.favicon    || '';
    themeColor = typed.metadata?.themeColor || typed.metadata?.['theme-color'] || '';

    // Apply blocklist to metadata ogImage — discard noisy UI images
    if (ogImage && isBlockedImage(ogImage)) {
      console.log('ogImage blocked (metadata):', ogImage);
      ogImage = '';
    }

    // Fallback: extract og:image / twitter:image from raw HTML if metadata is empty
    if (!ogImage && rawHtml) {
      ogImage = extractOgImage(rawHtml);
      if (ogImage) console.log('ogImage from HTML extraction:', ogImage);
    }

    // Fallback: extract high-res icon from HTML link tags if ogLogo is empty
    if (!ogLogo && rawHtml) {
      ogLogo = extractLargeIcon(rawHtml, cleanUrl);
      if (ogLogo) console.log('ogLogo from HTML icon extraction:', ogLogo);
    }

    // Fallback: extract theme color from HTML if Firecrawl metadata didn't return one
    if (!themeColor && rawHtml) {
      themeColor = extractThemeColor(rawHtml);
      if (themeColor) console.log('themeColor from HTML extraction:', themeColor);
    }

    console.log('=== EXTRACTED ===');
    console.log('  ogImage:', ogImage || '(empty)');
    console.log('  ogLogo:', ogLogo   || '(empty)');
    console.log('  favicon:', favicon || '(empty)');
    console.log('  themeColor:', themeColor || '(empty)');
    console.log('  pageTitle:', pageTitle   || '(empty)');

  } catch (e) {
    console.error('Firecrawl error (full):', e);
    console.warn('Returning domain fallback due to Firecrawl failure');
    return NextResponse.json(domainFallback(cleanUrl));
  }

  // If we got no meaningful content, return domain fallback (not blank manual form)
  if (scrapedContent.length < 100) {
    console.warn('Content too short (<100 chars) — returning domain fallback');
    const fb = domainFallback(cleanUrl);
    // Enrich with whatever metadata Firecrawl did return
    return NextResponse.json({ ...fb, pageTitle, ogImage, ogLogo, favicon, themeColor: themeColor || fb.themeColor });
  }

  // ── Gemini analysis ────────────────────────────────────────────────────────
  if (!process.env.GEMINI_API_KEY) {
    console.warn('GEMINI_API_KEY missing — returning domain fallback with meta');
    const fb = domainFallback(cleanUrl);
    return NextResponse.json({ ...fb, pageTitle, ogImage, ogLogo, favicon, themeColor: themeColor || fb.themeColor });
  }

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
    console.log('=== GEMINI START ===');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = isB2B ? b2bPrompt : b2cPrompt;
    const result = await model.generateContent(prompt);
    const raw    = result.response.text();
    console.log('=== GEMINI RAW ===', raw);

    const clean      = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const geminiData = JSON.parse(clean);

    const org = geminiData.organisation as string | null;
    const orgName = org || (() => {
      try { return new URL(cleanUrl).hostname.replace('www.', '').split('.')[0]
        .replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); } catch { return ''; }
    })();

    const headlines = [
      `${orgName} – für Sie`,
      `Wer braucht schon mehr als ${orgName}?`,
      `${orgName} – nah bei Ihnen`,
    ];

    const meta = { needsManualInput: !org, isManualFallback: false, pageTitle, ogImage, ogLogo, favicon, themeColor: themeColor || '#C1666B', headlines };

    const analysis = isB2B
      ? {
          organisation: org,
          beschreibung: geminiData.beschreibung ?? null,
          region: Array.isArray(geminiData.region) ? geminiData.region : [],
          sprache: Array.isArray(geminiData.sprache) ? geminiData.sprache : ['de'],
          gemeinden: [], alter: [], einkommen: null, wohnsituation: null,
          wohnlage: [], lifecycle: [], kinder: null, bildung: null, auto: null,
          branche: geminiData.branche ?? null,
          nogaCode: geminiData.nogaCode ?? null,
          unternehmensgroesse: Array.isArray(geminiData.unternehmensgroesse) ? geminiData.unternehmensgroesse : [],
          ...meta,
        }
      : {
          organisation: org,
          beschreibung: geminiData.beschreibung ?? null,
          region: Array.isArray(geminiData.region) ? geminiData.region : [],
          sprache: Array.isArray(geminiData.sprache) ? geminiData.sprache : ['de'],
          gemeinden: Array.isArray(geminiData.gemeinden) ? geminiData.gemeinden : [],
          alter: Array.isArray(geminiData.alter) ? geminiData.alter : [],
          einkommen: geminiData.einkommen ?? null,
          wohnsituation: geminiData.wohnsituation ?? null,
          wohnlage: Array.isArray(geminiData.wohnlage) ? geminiData.wohnlage : [],
          lifecycle: Array.isArray(geminiData.lifecycle) ? geminiData.lifecycle : [],
          kinder: geminiData.kinder ?? null,
          bildung: geminiData.bildung ?? null,
          auto: geminiData.auto ?? null,
          branche: null, nogaCode: null, unternehmensgroesse: [],
          ...meta,
        };

    console.log('=== FINAL RESPONSE ===', JSON.stringify({
      organisation: analysis.organisation,
      ogImage: analysis.ogImage,
      ogLogo: analysis.ogLogo,
      favicon: analysis.favicon,
      themeColor: analysis.themeColor,
      headlines: analysis.headlines,
    }, null, 2));

    return NextResponse.json(analysis);

  } catch (e) {
    console.error('Gemini error (full):', e);
    // Return domain fallback enriched with whatever Firecrawl gave us
    const fb = domainFallback(cleanUrl);
    return NextResponse.json({ ...fb, pageTitle, ogImage, ogLogo, favicon, themeColor: themeColor || fb.themeColor });
  }

  // ── End of FATAL wrapper ───────────────────────────────────────────────────
  } catch (fatal) {
    console.error('FATAL unhandled error in /api/analyze-url:', fatal);
    return NextResponse.json(domainFallback(rawUrl), { status: 200 });
  }
}
