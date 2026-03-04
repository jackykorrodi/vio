import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';

export async function POST(request: NextRequest) {
  const briefing = await request.json();
  console.log('[submit-briefing] received briefing for:', briefing.email, '| abschluss:', briefing.abschluss);

  const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN! });
  let contactId: string | null = null;

  // ── Create HubSpot contact ────────────────────────────────────────────────
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

  // ── Create HubSpot deal ───────────────────────────────────────────────────
  try {
    console.log('[submit-briefing] creating HubSpot deal, contactId:', contactId);
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
    await hubspot.crm.deals.basicApi.create(dealPayload);
    console.log('[submit-briefing] HubSpot deal created');
  } catch (e) {
    console.error('[submit-briefing] HubSpot deal creation failed:', e);
    // Continue — user should not see this error
  }

  console.log('[submit-briefing] done, returning success');
  return NextResponse.json({ success: true, navigateTo: 8 });
}
