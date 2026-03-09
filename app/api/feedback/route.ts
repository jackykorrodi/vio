import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { feedback, briefingId, email } = await request.json();
    if (!feedback?.trim()) {
      return NextResponse.json({ success: false, error: 'No feedback provided' }, { status: 400 });
    }

    if (briefingId && process.env.HUBSPOT_ACCESS_TOKEN) {
      try {
        // Use HubSpot Engagements API v1 (notes) via REST
        const notePayload = {
          engagement: { active: true, type: 'NOTE', timestamp: Date.now() },
          associations: { dealIds: [parseInt(briefingId, 10)], contactIds: [], companyIds: [], ownerIds: [], ticketIds: [] },
          attachments: [],
          metadata: {
            body: `VIO Buchungsflow Feedback${email ? ` (von ${email})` : ''}:\n\n${feedback}`,
          },
        };
        const res = await fetch('https://api.hubapi.com/engagements/v1/engagements', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notePayload),
        });
        if (!res.ok) {
          const text = await res.text();
          console.error('[feedback] HubSpot note failed:', res.status, text);
        } else {
          console.log('[feedback] HubSpot note created for deal:', briefingId);
        }
      } catch (e) {
        console.error('[feedback] HubSpot note error:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[feedback] unexpected error:', e);
    return NextResponse.json({ success: true });
  }
}
