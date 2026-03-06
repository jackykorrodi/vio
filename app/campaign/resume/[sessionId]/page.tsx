import { redirect } from 'next/navigation';
import { Client } from '@hubspot/api-client';

const C = {
  primary: '#C1666B',
  taupe: '#5C4F3D',
  bg: '#FAF7F2',
  muted: '#8A8490',
};

export default async function ResumePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let encoded = '';

  try {
    if (!process.env.HUBSPOT_ACCESS_TOKEN) throw new Error('no token');
    const hubspot = new Client({ accessToken: process.env.HUBSPOT_ACCESS_TOKEN });

    const searchResults = await hubspot.crm.deals.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'vio_session_id',
              operator: 'EQ' as any,
              value: sessionId,
            },
          ],
        },
      ],
      properties: ['vio_ad_creator_state', 'vio_session_id'],
      limit: 1,
      after: '0',
      sorts: [],
    });

    const deal = searchResults.results?.[0];
    if (!deal) throw new Error('deal not found');

    const stateStr = deal.properties?.vio_ad_creator_state || '';
    if (!stateStr) throw new Error('no state saved');

    const adState = JSON.parse(stateStr);
    const resumePayload = { ...adState, sessionId };
    encoded = Buffer.from(JSON.stringify(resumePayload)).toString('base64');
  } catch (e) {
    console.error('[resume] could not restore session:', e);
    // Fall through to error UI below
  }

  if (encoded) {
    redirect(`/campaign?resume=${encodeURIComponent(encoded)}`);
  }

  // Error UI — shown when deal not found or state missing
  return (
    <main
      style={{
        backgroundColor: C.bg,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ maxWidth: '480px', textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '52px', marginBottom: '24px' }}>&#128279;</div>
        <h1
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '28px',
            fontWeight: 400,
            color: C.taupe,
            marginBottom: '12px',
            letterSpacing: '-.02em',
          }}
        >
          Link nicht mehr gültig
        </h1>
        <p
          style={{
            fontSize: '15px',
            color: C.muted,
            lineHeight: 1.65,
            marginBottom: '28px',
          }}
        >
          Dieser Link ist abgelaufen oder ungültig.
          <br />
          Bitte starte eine neue Kampagne.
        </p>
        <a
          href="/"
          style={{
            display: 'inline-block',
            background: C.primary,
            color: '#fff',
            borderRadius: '100px',
            padding: '14px 32px',
            fontFamily: 'var(--font-outfit), sans-serif',
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Neue Kampagne starten
        </a>
      </div>
    </main>
  );
}
