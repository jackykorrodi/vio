'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
} as const;

const page: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const card: React.CSSProperties = {
  background: C.white,
  borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(44,44,62,.07)',
  padding: '20px 22px',
  marginBottom: '14px',
};

const clabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.1em',
  color: C.muted,
  textTransform: 'uppercase',
  marginBottom: '10px',
};

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  onRestart?: (url: string) => void;
  isActive: boolean;
  isCompleted: boolean;
}

export default function Step1Entry({ briefing, updateBriefing, nextStep, onRestart }: Props) {
  const [url, setUrl] = useState(briefing.url || '');

  const handleSubmit = () => {
    let cleanUrl = url.trim();
    // Strip protocol and www, then re-prepend https://
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
    cleanUrl = cleanUrl.replace(/^www\./, '');
    if (cleanUrl) cleanUrl = 'https://' + cleanUrl;
    if (onRestart) {
      onRestart(cleanUrl);
    } else {
      updateBriefing({ url: cleanUrl });
      nextStep();
    }
  };

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 1
          </span>
        </div>

        <h1
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '30px',
            fontWeight: 400,
            letterSpacing: '-.02em',
            lineHeight: 1.25,
            marginBottom: '6px',
            color: C.taupe,
          }}
        >
          Zeig uns deine Website.
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Wir finden deine Zielgruppe. Versprochen.
        </p>

        {/* URL Input Card */}
        <div style={card}>
          <div style={clabel}>Deine Website-URL</div>
          <input
            type="url"
            value={url}
            placeholder="deine-website.ch"
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '5px' }}>
            Keine URL? Du kannst die Zielgruppe auch manuell eingeben.
          </div>
        </div>

        {/* Type Card */}
        <div style={card}>
          <div style={clabel}>Für wen wirbst du?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { value: 'b2c' as const, ico: '👥', name: 'Endkunden (B2C)', desc: 'Menschen, Haushalte, Bevölkerung' },
              { value: 'b2b' as const, ico: '🏢', name: 'Unternehmen (B2B)', desc: 'Firmen, Entscheider, Fachleute' },
            ].map(opt => {
              const active = briefing.campaignType === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => updateBriefing({ campaignType: opt.value })}
                  style={{
                    padding: '18px',
                    borderRadius: '10px',
                    border: `2px solid ${active ? C.primary : C.border}`,
                    background: active ? C.pl : C.bg,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '8px' }}>{opt.ico}</div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: C.taupe }}>{opt.name}</div>
                  <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{opt.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust row */}
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
          {['🔒 Deine Daten bleiben bei uns', '⚡ Bereit in 15 Sekunden', '🇨🇭 Nur Schweizer Medien'].map(t => (
            <span key={t} style={{ fontSize: '12px', color: C.muted, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '5px' }}>
              {t}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: C.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '100px',
            padding: '15px 32px',
            fontFamily: 'var(--font-outfit), sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(193,102,107,.3)',
            transition: 'all .18s',
            marginTop: '20px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
        >
          Los geht&apos;s →
        </button>
      </div>
    </section>
  );
}
