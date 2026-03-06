import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@hubspot/api-client';

export async function POST(request: NextRequest) {
  try {
    const { sessionId, dealId, adCreatorState } = await request.json();

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
