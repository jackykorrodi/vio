import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';

export async function POST(request: NextRequest) {
  console.log('[submit-briefing] route hit');

  try {
    const briefing = await request.json();
    console.log('[submit-briefing] received briefing for:', briefing.email, '| abschluss:', briefing.abschluss);

    const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN! });
    let contactId: string | null = null;

    // ── Create HubSpot contact ──────────────────────────────────────────────
    try {
      console.log('[submit-briefing] creating HubSpot contact for:', briefing.email);
      const contact = await hubspot.crm.contacts.basicApi.create({
        properties: {
          firstname: briefing.vorname,
          lastname: briefing.nachname,
          email: briefing.email,
          phone: briefing.telefon,
          company: briefing.firma,
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
        adHeadline: briefing.adHeadline,
        adSubline: briefing.adSubline,
        adCta: briefing.adCta,
        adBgStyle: briefing.adBgStyle,
        adBgColor: briefing.adBgColor,
        adTextColor: briefing.adTextColor,
        adAccentColor: briefing.adAccentColor,
        adLogoMode: briefing.adLogoMode,
        sessionId: briefing.sessionId,
      };
      const dealPayload: Parameters<typeof hubspot.crm.deals.basicApi.create>[0] = {
        properties: {
          dealname: `VIO – ${briefing.analysis?.organisation || briefing.firma || briefing.email} – ${briefing.budget} CHF`,
          amount: String(briefing.budget),
          dealstage: briefing.abschluss === 'buchen' ? 'closedwon' : 'presentationscheduled',
          pipeline: 'default',
          description: JSON.stringify({
            url: briefing.url,
            campaignType: briefing.campaignType,
            analysis: briefing.analysis,
            reach: briefing.reach,
            laufzeit: briefing.laufzeit,
            startDate: briefing.startDate,
            werbemittel: briefing.werbemittel,
            abschluss: briefing.abschluss,
          }),
          // Session persistence custom properties
          ...(briefing.sessionId ? {
            vio_session_id: briefing.sessionId,
            vio_ad_creator_state: JSON.stringify(adCreatorState),
          } : {}),
        },
        ...(contactId ? {
          associations: [
            {
              to: { id: contactId },
              types: [{ associationCategory: 'HUBSPOT_DEFINED' as any, associationTypeId: 3 }],
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
    if (briefing.sessionId && briefing.email && process.env.RESEND_API_KEY) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vio-beta.vercel.app';
        const resumeUrl = `${appUrl}/campaign/resume/${briefing.sessionId}`;
        const vorname = briefing.vorname || 'du';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'VIO Team <noreply@vio.swiss>',
            to: briefing.email,
            subject: 'Deine VIO Kampagne – jederzeit weiter bearbeiten',
            text: `Hallo ${vorname},\n\ndu kannst deine Kampagne jederzeit weiter bearbeiten – auch wenn du jetzt keine Zeit hast.\n\nKlick einfach auf diesen Link:\n${resumeUrl}\n\nAlles wird genau so sein wie du es verlassen hast.\n\nBis bald,\nDas VIO Team`,
          }),
        });
        console.log('[submit-briefing] resume email sent to:', briefing.email);
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
