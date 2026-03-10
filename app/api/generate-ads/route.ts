import { NextRequest, NextResponse } from 'next/server';

const DEAL_ID_RE = /^\d{1,20}$/;

function safeStr(val: unknown, maxLen: number): string {
  return typeof val === 'string' ? val.slice(0, maxLen) : '';
}

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
    const { dealId, adConfig } = body as { dealId?: unknown; adConfig?: unknown };

    if (dealId !== undefined && (typeof dealId !== 'string' || !DEAL_ID_RE.test(dealId))) {
      return NextResponse.json({ success: false, error: 'Invalid dealId' }, { status: 400 });
    }
    if (!adConfig || typeof adConfig !== 'object' || Array.isArray(adConfig)) {
      return NextResponse.json({ success: false, error: 'Invalid adConfig' }, { status: 400 });
    }
    const config = adConfig as Record<string, unknown>;

    // If we have a HubSpot deal, update it with the ad configuration
    if (dealId && process.env.HUBSPOT_ACCESS_TOKEN) {
      try {
        const props: Record<string, string> = {
          vio_ad_headline: safeStr(config.headline, 200),
          vio_ad_subline: safeStr(config.subline, 300),
          vio_ad_cta: safeStr(config.cta, 100),
          vio_ad_font: safeStr(config.font, 50) || 'fraunces',
          vio_ad_bg_color: safeStr(config.bgColor, 20),
          vio_ad_text_color: safeStr(config.textColor, 20),
          vio_ad_accent_color: safeStr(config.accentColor, 20),
          vio_ad_animation: safeStr(config.animation, 50) || 'none',
          vio_werbemittel_service: 'erstellen',
        };

        await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${process.env.HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ properties: props }),
        });
      } catch (e) {
        console.error('[generate-ads] HubSpot update error:', e);
      }
    }

    const jobId = `ad-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return NextResponse.json({ success: true, jobId });
  } catch (e) {
    console.error('[generate-ads] error:', e);
    return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
  }
}
