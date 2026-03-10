import { NextRequest, NextResponse } from 'next/server';

const MAX_FEEDBACK_LENGTH = 5000;
const MAX_EMAIL_LENGTH = 254;
const MAX_ID_LENGTH = 64;

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }
    const { feedback, briefingId, email } = body as Record<string, unknown>;

    if (!feedback || typeof feedback !== 'string' || !feedback.trim()) {
      return NextResponse.json({ success: false, error: 'No feedback provided' }, { status: 400 });
    }
    if (feedback.length > MAX_FEEDBACK_LENGTH) {
      return NextResponse.json({ success: false, error: 'Feedback too long' }, { status: 400 });
    }
    // Validate optional fields
    if (briefingId !== undefined && (typeof briefingId !== 'string' || briefingId.length > MAX_ID_LENGTH || !/^\d+$/.test(briefingId))) {
      return NextResponse.json({ success: false, error: 'Invalid briefingId' }, { status: 400 });
    }
    if (email !== undefined && (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH)) {
      return NextResponse.json({ success: false, error: 'Invalid email' }, { status: 400 });
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
