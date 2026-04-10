import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';
import { AssociationSpecAssociationCategoryEnum } from '@hubspot/api-client/lib/codegen/crm/deals';
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

    const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN! });
    let contactId: string | null = null;

    // ── Create HubSpot contact ──────────────────────────────────────────────
    try {
      console.log('[submit-briefing] creating HubSpot contact for:', b.email);
      const contact = await hubspot.crm.contacts.basicApi.create({
        properties: {
          firstname: b.vorname,
          lastname: b.nachname,
          email: b.email,
          phone: b.telefon,
          company: b.firma,
        },
      });
      contactId = contact.id;
      console.log('[submit-briefing] HubSpot contact created, id:', contactId);
    } catch (e) {
      console.error('[submit-briefing] HubSpot contact creation failed:', e);
      // Continue — deal creation will run without an association
    }

    // ── Create HubSpot deal ─────────────────────────────────────────────────
    let dealId: string | null = null;
    try {
      console.log('[submit-briefing] creating HubSpot deal, contactId:', contactId);
      const adCreatorState = {
        adHeadline: b.adHeadline,
        adSubline: b.adSubline,
        adCta: b.adCta,
        adBgStyle: b.adBgStyle,
        adBgColor: b.adBgColor,
        adTextColor: b.adTextColor,
        adAccentColor: b.adAccentColor,
        adLogoMode: b.adLogoMode,
        sessionId: b.sessionId,
      };
      const dealPayload: Parameters<typeof hubspot.crm.deals.basicApi.create>[0] = {
        properties: {
          dealname: `VIO – ${b.analysis?.organisation || b.firma || b.email} – ${b.budget} CHF`,
          amount: String(b.budget),
          dealstage: b.abschluss === 'buchen' ? 'closedwon' : 'presentationscheduled',
          pipeline: 'default',
          description: JSON.stringify({
            url: b.url,
            campaignType: b.campaignType,
            analysis: b.analysis,
            reach: b.reach,
            laufzeit: b.laufzeit,
            startDate: b.startDate,
            werbemittel: b.werbemittel,
            abschluss: b.abschluss,
          }),
          // Session persistence custom properties
          ...(b.sessionId ? {
            vio_session_id: b.sessionId,
            vio_ad_creator_state: JSON.stringify(adCreatorState),
          } : {}),
          // Agenturcode
          ...(b.agenturcode ? { vio_agenturcode: b.agenturcode } : {}),
        },
        ...(contactId ? {
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined, associationTypeId: 3 }],
            },
          ],
        } : {}),
      };
      const deal = await hubspot.crm.deals.basicApi.create(dealPayload);
      dealId = deal.id;
      console.log('[submit-briefing] HubSpot deal created, id:', dealId);
    } catch (e) {
      console.error('[submit-briefing] HubSpot deal creation failed:', e);
      // Continue — user should not see this error
    }

    // ── Send resume link email ──────────────────────────────────────────────
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
    return NextResponse.json({ success: true, navigateTo: 8, dealId });

  } catch (e) {
    console.error('[submit-briefing] unexpected top-level error:', e);
    // Return 200 so the user flow continues regardless
    return NextResponse.json({ success: true, navigateTo: 8 });
  }
}
