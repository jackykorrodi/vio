import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, adConfig } = body as {
      dealId?: string;
      adConfig: Record<string, unknown>;
    };

    // If we have a HubSpot deal, update it with the ad configuration
    if (dealId && process.env.HUBSPOT_ACCESS_TOKEN) {
      try {
        const props: Record<string, string> = {
          vio_ad_headline: String(adConfig.headline ?? ''),
          vio_ad_subline: String(adConfig.subline ?? ''),
          vio_ad_cta: String(adConfig.cta ?? ''),
          vio_ad_font: String(adConfig.font ?? 'fraunces'),
          vio_ad_bg_color: String(adConfig.bgColor ?? ''),
          vio_ad_text_color: String(adConfig.textColor ?? ''),
          vio_ad_accent_color: String(adConfig.accentColor ?? ''),
          vio_ad_animation: String(adConfig.animation ?? 'none'),
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
