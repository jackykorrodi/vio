import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';

export async function POST(request: NextRequest) {
  try {
    const briefing = await request.json();
    const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN! });

    // Create contact
    const contact = await hubspot.crm.contacts.basicApi.create({
      properties: {
        firstname: briefing.vorname,
        lastname: briefing.nachname,
        email: briefing.email,
        phone: briefing.telefon,
        company: briefing.firma,
      },
    });

    // Create deal
    await hubspot.crm.deals.basicApi.create({
      properties: {
        dealname: `VIO – ${briefing.analysis?.organisation || briefing.firma} – ${briefing.budget} CHF`,
        amount: String(briefing.budget),
        dealstage: briefing.abschluss === 'buchen' ? 'closedwon' : 'presentationscheduled',
        pipeline: 'default',
        description: JSON.stringify({
          url: briefing.url,
          campaignType: briefing.campaignType,
          analysis: briefing.analysis,
          reach: briefing.reach,
          laufzeit: briefing.laufzeit,
          werbemittel: briefing.werbemittel,
          abschluss: briefing.abschluss,
        }),
      },
      associations: [
        {
          to: { id: contact.id },
          types: [{ associationCategory: 'HUBSPOT_DEFINED' as any, associationTypeId: 3 }],
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('HubSpot error:', e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
