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
  teal: '#2A7F7F',
} as const;

const page: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

interface WMOption {
  value: 'upload' | 'erstellen' | 'spaeter';
  ico: string;
  title: string;
  sub: string;
  badge: string;
  badgeStyle: React.CSSProperties;
  body: React.ReactNode;
}

export default function Step5Creative({ briefing, updateBriefing, nextStep }: Props) {
  const selected = briefing.werbemittel;
  const [openItem, setOpenItem] = useState<'upload' | 'erstellen' | 'spaeter' | null>(null);

  const handleOptionClick = (value: 'upload' | 'erstellen' | 'spaeter') => {
    updateBriefing({ werbemittel: value });
    setOpenItem(prev => prev === value ? null : value);
  };

  const options: WMOption[] = [
    {
      value: 'upload',
      ico: '📁',
      title: 'Eigene Werbemittel hochladen',
      sub: 'JPG, PNG oder MP4 · Max. 50 MB',
      badge: 'Kostenlos',
      badgeStyle: { background: '#E8F5F5', color: C.teal },
      body: (
        <div
          style={{
            border: `2px dashed ${C.border}`,
            borderRadius: '10px',
            padding: '22px',
            textAlign: 'center',
            background: C.bg,
            cursor: 'pointer',
            transition: 'all .2s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; (e.currentTarget as HTMLDivElement).style.background = C.pl; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.background = C.bg; }}
        >
          <div style={{ fontSize: '26px', marginBottom: '6px' }}>📎</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: C.taupe }}>Dateien hierher ziehen</div>
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '3px' }}>oder klicken zum Auswählen</div>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '7px' }}>Banner 300×250, 728×90 · DOOH 1920×1080</div>
        </div>
      ),
    },
    {
      value: 'erstellen',
      ico: '✨',
      title: 'Werbemittel erstellen lassen',
      sub: 'Professionell gestaltet, auf deine Kampagne abgestimmt',
      badge: '+ CHF 500',
      badgeStyle: { background: C.pl, color: C.pd },
      body: (
        <div style={{ background: C.bg, borderRadius: '10px', padding: '13px 15px', fontSize: '13px', lineHeight: 1.65 }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: C.taupe }}>Was du bekommst:</div>
          {[
            'Alle Formate für DOOH und Display',
            'Erstellt von The Brief AI – in deinem Stil',
            'Lieferung innerhalb von 48 Stunden',
          ].map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px', alignItems: 'flex-start' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: '5px' }} />
              <span style={{ color: C.taupe }}>{pt}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      value: 'spaeter',
      ico: '⏳',
      title: 'Später entscheiden',
      sub: 'Kampagne jetzt starten, Werbemittel nachliefern',
      badge: 'Flexibel',
      badgeStyle: { background: '#E8F5F5', color: C.teal },
      body: (
        <div style={{ background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: '10px', padding: '11px 15px', fontSize: '13px', color: '#7A5500', display: 'flex', gap: '9px', lineHeight: 1.5 }}>
          <span>💡</span>
          <span>Wir reservieren dein Startdatum. Werbemittel müssen spätestens 5 Werktage vorher vorliegen.</span>
        </div>
      ),
    },
  ];

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 5
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Deine Werbemittel.
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Hast du bereits etwas – oder sollen wir das für dich übernehmen?
        </p>

        {/* WM Cards */}
        {options.map(opt => {
          const active = selected === opt.value;
          const bodyOpen = openItem === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => handleOptionClick(opt.value)}
              style={{
                background: active ? C.pl : C.white,
                borderRadius: '14px',
                border: `2px solid ${active ? C.primary : C.border}`,
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'all .2s',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px' }}>
                <div style={{ fontSize: '22px', flexShrink: 0 }}>{opt.ico}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: C.taupe }}>{opt.title}</div>
                  <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{opt.sub}</div>
                </div>
                <div style={{ ...opt.badgeStyle, marginLeft: 'auto', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {opt.badge}
                </div>
                <div style={{ fontSize: '12px', color: C.muted, marginLeft: '8px', flexShrink: 0, transition: 'transform .25s', transform: bodyOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▾
                </div>
              </div>
              {/* Body (accordion) */}
              <div
                style={{
                  maxHeight: bodyOpen ? '300px' : '0',
                  overflow: 'hidden',
                  transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
                  padding: bodyOpen ? '0 20px 18px' : '0 20px',
                }}
              >
                {opt.body}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        {selected && (
          <button
            type="button"
            onClick={nextStep}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: C.primary, color: '#fff', border: 'none',
              borderRadius: '100px', padding: '15px 32px',
              fontFamily: 'var(--font-outfit), sans-serif', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,102,107,.3)',
              transition: 'all .18s', marginTop: '8px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
          >
            Weiter zum Abschluss →
          </button>
        )}
      </div>
    </section>
  );
}
