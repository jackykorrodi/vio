'use client';

import { useState, useRef } from 'react';
import { BriefingData } from '@/lib/types';

const C = {
  primary: '#6B4FBB',
  pl: '#EDE8FF',
  pd: '#8B6FD4',
  taupe: '#1A1430',
  muted: '#7A7596',
  border: 'rgba(107,79,187,0.12)',
  bg: '#FDFCFF',
  white: '#FFFFFF',
  teal: '#2A7F7F',
} as const;

const page: React.CSSProperties = {
  maxWidth: '860px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const FORMATS = ['300×250', '970×250', '300×600', '1920×1080', '1080×1920'];

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;           // goes to Contact (for upload / spaeter)
  onUploadSelected: () => void;   // goes to Ad Creator (for erstellen)
  isActive: boolean;
}

export default function Step5Creative({ briefing, updateBriefing, nextStep, onUploadSelected }: Props) {
  const selected = briefing.werbemittel;
  const [openItem, setOpenItem] = useState<'upload' | 'erstellen' | 'spaeter' | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOptionClick = (value: 'upload' | 'erstellen' | 'spaeter') => {
    updateBriefing({ werbemittel: value });
    setOpenItem(prev => prev === value ? null : value);
  };

  function handleFiles(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter(f => f.size <= 50 * 1024 * 1024);
    setFiles(prev => [...prev, ...valid]);
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, j) => j !== i));
  }

  function handleWeiter() {
    if (!selected) return;
    if (selected === 'erstellen') {
      updateBriefing({ adCreation: 'selbst', adCreationFee: 500 });
      onUploadSelected();  // → Ad Creator
    } else if (selected === 'upload') {
      updateBriefing({ adCreation: 'upload' });
      nextStep();          // → Contact
    } else {
      updateBriefing({ adCreation: 'later' });
      nextStep();          // → Contact
    }
  }

  const uploadBody = (
    <div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, lineHeight: 1.5 }}>
        <strong style={{ color: C.taupe }}>Erforderliche Formate:</strong>{' '}
        {FORMATS.join(' · ')}
      </div>
      {/* Drop zone */}
      <div
        style={{
          border: `2px dashed ${dragOver ? C.primary : C.border}`,
          borderRadius: 10,
          padding: 22,
          textAlign: 'center',
          background: dragOver ? C.pl : C.bg,
          cursor: 'pointer',
          transition: 'all .2s',
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onMouseEnter={e => { if (!dragOver) (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; }}
        onMouseLeave={e => { if (!dragOver) (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
      >
        <div style={{ fontSize: 26, marginBottom: 6 }}>📎</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.taupe }}>Dateien hierher ziehen</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>oder klicken zum Auswählen</div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 7 }}>JPG, PNG, MP4, PDF · Max. 50 MB pro Datei</div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.mp4,.pdf"
        style={{ display: 'none' }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}
      />
      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 12px', background: C.white,
                border: `1px solid ${C.border}`, borderRadius: 8,
                marginBottom: 5, fontSize: 12,
              }}
            >
              <span style={{ color: C.taupe, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                📄 {f.name}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); removeFile(i); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 16, flexShrink: 0, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const erstellenBody = (
    <div style={{ background: C.bg, borderRadius: 10, padding: '13px 15px', fontSize: 13, lineHeight: 1.65 }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: C.taupe }}>So funktioniert&apos;s:</div>
      {[
        'Du gestaltest die Werbemittel selbst – wir führen dich durch alle 5 Formate',
        'Live-Vorschau auf echten DOOH- und Display-Formaten',
        'Basierend auf deiner Website und deinem Branding',
      ].map((pt, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'flex-start' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: 5 }} />
          <span style={{ color: C.taupe }}>{pt}</span>
        </div>
      ))}
    </div>
  );

  const spaeterBody = (
    <div style={{ background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: 10, padding: '11px 15px', fontSize: 13, color: '#7A5500', display: 'flex', gap: 9, lineHeight: 1.5 }}>
      <span>💡</span>
      <span>Wir reservieren dein Startdatum. Werbemittel müssen spätestens 5 Werktage vorher vorliegen.</span>
    </div>
  );

  const options: { value: 'upload' | 'erstellen' | 'spaeter'; ico: string; title: string; sub: string; badge: string; badgeStyle: React.CSSProperties; body: React.ReactNode }[] = [
    {
      value: 'upload',
      ico: '📁',
      title: 'Eigene Werbemittel hochladen',
      sub: 'JPG, PNG, MP4, PDF · Max. 50 MB',
      badge: 'Kostenlos',
      badgeStyle: { background: '#E8F5F5', color: C.teal },
      body: uploadBody,
    },
    {
      value: 'erstellen',
      ico: '✨',
      title: 'Werbemittel selbst erstellen',
      sub: 'Mit dem VIO Ad Creator – Live-Vorschau aller Formate',
      badge: '+ CHF 500',
      badgeStyle: { background: C.pl, color: C.pd },
      body: erstellenBody,
    },
    {
      value: 'spaeter',
      ico: '⏳',
      title: 'Später einschicken',
      sub: 'Kampagne jetzt starten, Werbemittel nachliefern',
      badge: 'Flexibel',
      badgeStyle: { background: '#E8F5F5', color: C.teal },
      body: spaeterBody,
    },
  ];

  const weiterLabel = selected === 'erstellen'
    ? 'Weiter zum Ad Creator →'
    : 'Weiter zum Abschluss →';

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 18, height: 2, background: C.primary, borderRadius: 2 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 4
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: 6, color: C.taupe }}>
          Deine Werbemittel.
        </h1>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.6 }}>
          Hast du bereits etwas – oder sollen wir das für dich übernehmen?
        </p>

        {/* Option cards */}
        {options.map(opt => {
          const active = selected === opt.value;
          const bodyOpen = openItem === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => handleOptionClick(opt.value)}
              style={{
                background: active ? C.pl : C.white,
                borderRadius: 14,
                border: `2px solid ${active ? C.primary : C.border}`,
                marginBottom: 12,
                cursor: 'pointer',
                transition: 'all .2s',
                overflow: 'hidden',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>{opt.ico}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.taupe }}>{opt.title}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{opt.sub}</div>
                </div>
                <div style={{
                  ...opt.badgeStyle,
                  marginLeft: 'auto', padding: '4px 10px', borderRadius: 100,
                  fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {opt.badge}
                </div>
                <div style={{
                  fontSize: 12, color: C.muted, marginLeft: 8, flexShrink: 0,
                  transition: 'transform .25s', transform: bodyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  ▾
                </div>
              </div>
              {/* Accordion body */}
              <div style={{
                maxHeight: bodyOpen ? '400px' : '0',
                overflow: 'hidden',
                transition: 'max-height .35s cubic-bezier(.4,0,.2,1)',
                padding: bodyOpen ? '0 20px 18px' : '0 20px',
              }}>
                {opt.body}
              </div>
            </div>
          );
        })}

        {/* CTA */}
        {selected && (
          <button
            type="button"
            onClick={handleWeiter}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.primary, color: '#fff', border: 'none',
              borderRadius: 100, padding: '15px 32px',
              fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(107,79,187,0.30)',
              transition: 'all .18s', marginTop: 8,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
          >
            {weiterLabel}
          </button>
        )}
      </div>
    </section>
  );
}
