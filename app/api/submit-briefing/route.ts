import { NextRequest, NextResponse } from 'next/server';
import { BriefingData } from '@/lib/types';
import { rateLimit } from '@/lib/rate-limit';
import { checkDuplicate } from '@/lib/submission-guard';

export async function POST(request: NextRequest) {
  console.log('[submit-briefing] route hit');

  const rl = rateLimit(request, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte eine Minute.' }, { status: 429 });
  }

  try {
    let briefing: Record<string, unknown>;
    try {
      const raw = await request.json();
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      briefing = raw as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate required fields
    if (!briefing.email || typeof briefing.email !== 'string' || !briefing.email.includes('@')) {
      return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich' }, { status: 400 });
    }
    if (typeof briefing.vorname !== 'string' || briefing.vorname.length > 100) {
      return NextResponse.json({ error: 'Ungültiger Vorname' }, { status: 400 });
    }
    if (typeof briefing.nachname !== 'string' || briefing.nachname.length > 100) {
      return NextResponse.json({ error: 'Ungültiger Nachname' }, { status: 400 });
    }
    if ((briefing.email as string).length > 254) {
      return NextResponse.json({ error: 'E-Mail-Adresse zu lang' }, { status: 400 });
    }
    if (briefing.abschluss !== 'offerte' && briefing.abschluss !== 'buchen') {
      return NextResponse.json({ error: 'Ungültiger Abschluss-Wert' }, { status: 400 });
    }

    // Duplicate submission guard
    const dupKey = `${briefing.email}-${briefing.kampagnentyp}`;
    if (checkDuplicate(dupKey)) {
      return NextResponse.json({ error: 'Diese Kampagne wurde bereits eingereicht.' }, { status: 409 });
    }

    // All required fields validated — safe to treat as BriefingData
    const b = briefing as unknown as BriefingData;

    console.log('[submit-briefing] received briefing for:', b.email, '| abschluss:', b.abschluss);

    const PD_TOKEN = process.env.PIPEDRIVE_API_TOKEN ?? '';
    const PD_BASE  = 'https://api.pipedrive.com/v1';

    // ── Step 1: Create Pipedrive person ────────────────────────────────────────
    let personId: number | null = null;
    try {
      const res = await fetch(`${PD_BASE}/persons?api_token=${PD_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     `${b.vorname} ${b.nachname}`.trim(),
          email:    [{ value: b.email, primary: true }],
          phone:    b.telefon ? [{ value: b.telefon, primary: true }] : undefined,
          org_name: b.firma || undefined,
        }),
      });
      const json = await res.json();
      personId = json?.data?.id ?? null;
      console.log('[submit-briefing] Pipedrive person created, id:', personId);
    } catch (e) {
      console.error('[submit-briefing] Pipedrive person creation failed:', e);
    }

    // ── Step 2: Create Pipedrive deal ──────────────────────────────────────────
    let dealId: number | null = null;
    try {
      const regionLabel = (b.selectedRegions ?? []).map((r: any) => r.name).join(', ')
        || b.politikRegion || b.firma || b.email;
      const res = await fetch(`${PD_BASE}/deals?api_token=${PD_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:     `VIO – ${regionLabel} – CHF ${b.budget ?? 0}`,
          value:     b.budget ?? 0,
          currency:  'CHF',
          person_id: personId ?? undefined,
          status:    b.abschluss === 'buchen' ? 'won' : 'open',
        }),
      });
      const json = await res.json();
      dealId = json?.data?.id ?? null;
      console.log('[submit-briefing] Pipedrive deal created, id:', dealId);
    } catch (e) {
      console.error('[submit-briefing] Pipedrive deal creation failed:', e);
    }

    // ── Step 3: Attach note with campaign details ──────────────────────────────
    try {
      if (dealId) {
        await fetch(`${PD_BASE}/notes?api_token=${PD_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: JSON.stringify({
              campaignType:    b.campaignType,
              politikType:     b.politikType,
              selectedRegions: b.selectedRegions,
              selectedPackage: b.selectedPackage,
              budget:          b.budget,
              laufzeit:        b.laufzeit,
              startDate:       b.startDate,
              votingDate:      b.votingDate,
              reach:           b.reach,
              werbemittel:     b.werbemittel,
              abschluss:       b.abschluss,
              sessionId:       b.sessionId,
              agenturcode:     b.agenturcode,
            }),
            deal_id: dealId,
          }),
        });
      }
    } catch (e) {
      console.error('[submit-briefing] Pipedrive note creation failed:', e);
    }

    // ── Send resume link email ──────────────────────────────────────────────────
    if (b.sessionId && b.email && process.env.RESEND_API_KEY) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vio-beta.vercel.app';
        const resumeUrl = `${appUrl}/campaign/resume/${b.sessionId}`;
        const vorname = b.vorname || 'du';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'VIO Team <noreply@vio.swiss>',
            to: b.email,
            subject: 'Deine VIO Kampagne – jederzeit weiter bearbeiten',
            text: `Hallo ${vorname},\n\ndu kannst deine Kampagne jederzeit weiter bearbeiten – auch wenn du jetzt keine Zeit hast.\n\nKlick einfach auf diesen Link:\n${resumeUrl}\n\nAlles wird genau so sein wie du es verlassen hast.\n\nBis bald,\nDas VIO Team`,
          }),
        });
        console.log('[submit-briefing] resume email sent to:', b.email);
      } catch (e) {
        console.error('[submit-briefing] resume email failed (silent):', e);
      }
    }

    console.log('[submit-briefing] done, returning success');
    return NextResponse.json({ success: true, dealId });

  } catch (e) {
    console.error('[submit-briefing] unexpected top-level error:', e);
    return NextResponse.json({ success: true });
  }
}
