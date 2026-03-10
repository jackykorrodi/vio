import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEAL_ID_RE = /^\d{1,20}$/;

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
    const { sessionId, dealId, adCreatorState } = body as Record<string, unknown>;

    // Validate sessionId and dealId formats if provided
    if (sessionId !== undefined && (typeof sessionId !== 'string' || !UUID_RE.test(sessionId))) {
      return NextResponse.json({ success: false, error: 'Invalid sessionId' }, { status: 400 });
    }
    if (dealId !== undefined && (typeof dealId !== 'string' || !DEAL_ID_RE.test(dealId))) {
      return NextResponse.json({ success: false, error: 'Invalid dealId' }, { status: 400 });
    }

    // Only update HubSpot if we have a dealId — before Step 6 there is none yet
    if (dealId && sessionId && process.env.HUBSPOT_ACCESS_TOKEN) {
      try {
        const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });
        await hubspot.crm.deals.basicApi.update(dealId, {
          properties: {
            vio_session_id: sessionId,
            vio_ad_creator_state: JSON.stringify(adCreatorState),
          },
        });
      } catch (e) {
        console.error('[save-session] HubSpot update failed (silent):', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[save-session] error:', e);
    return NextResponse.json({ success: false });
  }
}
