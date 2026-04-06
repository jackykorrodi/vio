'use client';

interface Props {
  type: 'politik' | 'b2b';
  region: string;
  doohScreens: number;
  displayPersonen: number;
  reachVon: number;
  reachBis: number;
  frequency: number;
  branche?: string;
}

export default function ReichweiteKacheln({
  type, region, doohScreens, displayPersonen, reachVon, reachBis, frequency, branche,
}: Props) {
  const who =
    type === 'politik'
      ? `Stimmberechtigte in ${region}`
      : branche
      ? `${branche}-Mitarbeitende in ${region}`
      : `Mitarbeitende in ${region}`;

  const copy =
    type === 'politik' ? (
      <>
        sehen deine Botschaft{' '}
        <strong style={{ color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
          durchschnittlich {frequency}×
        </strong>{' '}
        — auf dem Weg zur Abstimmung, im Alltag und online. Der Mix aus öffentlicher Präsenz
        und digitalem Targeting schafft{' '}
        <strong style={{ color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
          maximalen Erinnerungseffekt
        </strong>{' '}
        bei minimaler Streuung.
      </>
    ) : (
      <>
        sehen deine Botschaft{' '}
        <strong style={{ color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
          durchschnittlich {frequency}×
        </strong>{' '}
        — auf dem Arbeitsweg, in der Pause und online. Öffentliche Sichtbarkeit trifft
        digitales Targeting:{' '}
        <strong style={{ color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
          deine Marke verankert sich
        </strong>{' '}
        genau dort, wo Entscheidungen reifen.
      </>
    );

  return (
    <div style={{ marginBottom: 28 }}>
      <style>{`
        .rk-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 0;
        }
        @media (max-width: 600px) {
          .rk-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── Two kacheln ── */}
      <div className="rk-grid">

        {/* Kachel 1 – DOOH */}
        <div style={{
          position: 'relative',
          background: 'white',
          borderRadius: 14,
          borderTop: '3px solid #6B4FBB',
          padding: '24px 20px 20px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(107,79,187,0.07)',
        }}>
          {/* Accent circle */}
          <div style={{
            position: 'absolute', top: -20, right: -20,
            width: 100, height: 100, borderRadius: '50%',
            background: '#6B4FBB', opacity: 0.06, pointerEvents: 'none',
          }} />

          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#F0ECFA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
              <rect x="1" y="1" width="20" height="13" rx="2" stroke="#6B4FBB" strokeWidth="1.6"/>
              <path d="M7 17H15" stroke="#6B4FBB" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M11 14V17" stroke="#6B4FBB" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Label */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
            textTransform: 'uppercase', color: '#7A7596',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: 8,
          }}>
            DOOH · Im öffentlichen Raum
          </div>

          {/* Number */}
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 800, color: '#6B4FBB',
            lineHeight: 1, marginBottom: 4,
          }}>
            bis zu {doohScreens.toLocaleString('de-CH')}
          </div>

          {/* Unit */}
          <div style={{ fontSize: 13, color: '#5A4A7A', marginBottom: 16 }}>
            digitale Screens
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#EDE8F7', marginBottom: 12 }} />

          {/* Orte */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Bahnhöfe & ÖV', 'Einkaufszentren', 'Tankstellen'].map(ort => (
              <li key={ort} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5A4A7A' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B4FBB', flexShrink: 0 }} />
                {ort}
              </li>
            ))}
          </ul>
        </div>

        {/* Kachel 2 – Display */}
        <div style={{
          position: 'relative',
          background: 'white',
          borderRadius: 14,
          borderTop: '3px solid #3DAA74',
          padding: '24px 20px 20px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(61,170,116,0.07)',
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: '#EAF3DE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
              <rect x="1" y="1" width="20" height="13" rx="2" stroke="#3DAA74" strokeWidth="1.6"/>
              <path d="M1 5H21" stroke="#3DAA74" strokeWidth="1.6"/>
              <circle cx="4" cy="3" r="1" fill="#3DAA74"/>
              <circle cx="7" cy="3" r="1" fill="#3DAA74"/>
            </svg>
          </div>

          {/* Label */}
          <div style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
            textTransform: 'uppercase', color: '#7A7596',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            marginBottom: 8,
          }}>
            Display · Online
          </div>

          {/* Number */}
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 26, fontWeight: 800, color: '#3DAA74',
            lineHeight: 1, marginBottom: 4,
          }}>
            ~{displayPersonen.toLocaleString('de-CH')}
          </div>

          {/* Unit */}
          <div style={{ fontSize: 13, color: '#5A4A7A', marginBottom: 16 }}>
            Personen erreichbar
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: '#D9EFE5', marginBottom: 12 }} />

          {/* Orte */}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Schweizer Newsportale', 'Blogs & Magazine', 'Apps mit CH-Usern'].map(ort => (
              <li key={ort} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#5A4A7A' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3DAA74', flexShrink: 0 }} />
                {ort}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Trichter SVG ── */}
      <div style={{ position: 'relative', height: 44 }}>
        <svg
          viewBox="0 0 100 40"
          preserveAspectRatio="none"
          style={{ width: '100%', height: 40, display: 'block' }}
        >
          <line x1="25" y1="0" x2="50" y2="35" stroke="#2D1F52" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.2" />
          <line x1="75" y1="0" x2="50" y2="35" stroke="#2D1F52" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.2" />
        </svg>
        <div style={{
          position: 'absolute', bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%', background: '#2D1F52',
        }} />
      </div>

      {/* ── Dark result box ── */}
      <div style={{
        position: 'relative',
        background: '#2D1F52',
        borderRadius: 14,
        padding: '28px 28px 24px',
        overflow: 'hidden',
      }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(107,79,187,.35), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Eyebrow */}
        <div style={{
          fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase',
          color: 'rgba(255,255,255,.35)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          marginBottom: 12,
        }}>
          Was das bedeutet
        </div>

        {/* Reach number */}
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 28, fontWeight: 800, color: 'white',
          lineHeight: 1, marginBottom: 6,
        }}>
          ~{reachVon.toLocaleString('de-CH')} – {reachBis.toLocaleString('de-CH')}
        </div>

        {/* Who */}
        <div style={{
          fontSize: 15, color: '#C4B5F4',
          fontFamily: "'Jost', sans-serif",
          marginBottom: 16,
        }}>
          {who}
        </div>

        {/* Copy text */}
        <p style={{
          fontFamily: "'Jost', sans-serif",
          fontSize: 14,
          color: 'rgba(255,255,255,.65)',
          lineHeight: 1.6,
          margin: '0 0 20px',
        }}>
          {copy}
        </p>

        {/* Footer pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { dot: '#C4B5F4', label: '70% DOOH' },
            { dot: '#3DAA74', label: '30% Display' },
            { dot: 'rgba(255,255,255,.4)', label: `Ø ${frequency}× Kontakte` },
          ].map(pill => (
            <span
              key={pill.label}
              style={{
                background: 'rgba(255,255,255,.08)',
                border: '1px solid rgba(255,255,255,.12)',
                borderRadius: 100,
                padding: '4px 12px',
                fontSize: 12,
                color: 'white',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: "'Jost', sans-serif",
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: pill.dot, flexShrink: 0 }} />
              {pill.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
