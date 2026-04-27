'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';

const C = {
  primary: '#6B4FBB',
  pl: '#EDE8FF',
  pd: '#8B6FD4',
  taupe: '#2D1F52',
  muted: '#7A7596',
  border: 'rgba(107,79,187,0.12)',
  bg: '#FDFCFF',
  white: '#FFFFFF',
  teal: '#2A7F7F',
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

interface Props {
  briefing: BriefingData;
  nextStep?: () => void;
  stepNumber?: number;
}

const nextSteps = [
  { ico: '', title: 'Offerte per E-Mail', sub: 'In wenigen Minuten in deinem Postfach' },
  { ico: '', title: 'Briefing geht raus', sub: 'Unser Partner-Team wird informiert' },
  { ico: '', title: 'Kampagne startet', sub: 'Nach deiner Freigabe innerhalb von 48h' },
];

const calendlyUrl = process.env.NEXT_PUBLIC_CALENDLY_URL;

function FeedbackCard({ briefing }: { briefing: BriefingData }) {
  const [feedbackText, setFeedbackText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');

  const handleSubmit = async () => {
    if (!feedbackText.trim()) return;
    setStatus('sending');
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: feedbackText,
          briefingId: briefing.dealId || null,
          email: briefing.email || null,
        }),
      });
    } catch { /* silent */ }
    setStatus('done');
  };

  if (status === 'done') {
    return (
      <div style={{ background: '#FDFCFF', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px', marginTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: C.taupe }}>Danke für dein Feedback!</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#FDFCFF', border: `1px solid ${C.border}`, borderRadius: '14px', padding: '20px 22px', marginTop: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
        Eine kurze Frage
      </div>
      <p style={{ fontSize: '14px', color: C.taupe, fontWeight: 600, marginBottom: '10px' }}>
        Was würdest du dir im Buchungsflow wünschen, um noch effizienter zu sein?
      </p>
      <textarea
        value={feedbackText}
        onChange={e => setFeedbackText(e.target.value)}
        placeholder="Dein Feedback..."
        rows={3}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '10px 12px', borderRadius: '8px',
          border: `1px solid ${C.border}`, background: C.white,
          fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', color: C.taupe,
          outline: 'none', resize: 'vertical', marginBottom: '10px',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === 'sending' || !feedbackText.trim()}
        style={{
          background: C.taupe, color: '#fff', border: 'none',
          borderRadius: '100px', padding: '10px 22px',
          fontFamily: 'var(--font-sans), sans-serif', fontSize: '13px', fontWeight: 600,
          cursor: status === 'sending' || !feedbackText.trim() ? 'default' : 'pointer',
          opacity: status === 'sending' || !feedbackText.trim() ? 0.6 : 1,
          transition: 'all .18s',
        }}
      >
        {status === 'sending' ? 'Wird gesendet…' : 'Senden'}
      </button>
    </div>
  );
}

export default function Step7Confirmation({ briefing, nextStep, stepNumber }: Props) {
  const POLITIK_TYPE_LABELS: Record<string, string> = {
    ja: 'Ja-Kampagne', nein: 'Nein-Kampagne', kandidat: 'Kandidatur', event: 'Event',
  };
  const PKG_LABELS: Record<string, string> = {
    sichtbar: 'Sichtbar', praesenz: 'Präsenz', dominanz: 'Dominanz',
  };
  const WERBEMITTEL_LABELS: Record<string, string> = {
    upload: 'Dateien hochgeladen', erstellen: 'Mit Ad Creator erstellt', spaeter: 'Später einreichen',
  };

  const regionLabel     = (briefing.selectedRegions ?? []).map(r => r.name).join(', ') || '—';
  const politikLabel    = POLITIK_TYPE_LABELS[briefing.politikType ?? ''] ?? '—';
  const paketLabel      = PKG_LABELS[briefing.selectedPackage ?? ''] ?? '—';
  const budgetLabel     = briefing.budget ? `CHF ${briefing.budget.toLocaleString('de-CH')}` : '—';
  const laufzeitLabel   = briefing.laufzeit ? `${briefing.laufzeit} Wochen` : '—';
  const datumLabel      = briefing.startDate && briefing.votingDate
    ? `${new Date(briefing.startDate + 'T00:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${new Date(briefing.votingDate + 'T00:00:00').toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
    : '—';
  const reachLabel      = briefing.reach ? briefing.reach.toLocaleString('de-CH') + ' Personen' : '—';
  const werbemittelLabel = WERBEMITTEL_LABELS[briefing.werbemittel ?? ''] ?? '—';
  const abschlussLabel  = (briefing as any).abschluss === 'buchen' ? 'Direktbuchung' : 'Offerte angefordert';

  const rows = [
    { label: 'Region',       value: regionLabel },
    { label: 'Kampagnentyp', value: politikLabel },
    { label: 'Paket',        value: paketLabel },
    { label: 'Budget',       value: budgetLabel },
    { label: 'Laufzeit',     value: laufzeitLabel },
    { label: 'Zeitraum',     value: datumLabel },
    { label: 'Reichweite',   value: reachLabel },
    { label: 'Werbemittel',  value: werbemittelLabel },
    { label: 'Abschluss',    value: abschlussLabel },
  ];

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            {stepNumber ? `Schritt ${stepNumber}` : 'Bestätigung'}
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Deine Kampagne ist auf dem Weg.
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Lehn dich kurz zurück – wir übernehmen.
        </p>

        {/* Confirmation box */}
        <div style={{ background: C.pl, border: `1.5px solid ${C.primary}`, borderRadius: '14px', padding: '28px', textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '24px', color: C.pd, fontWeight: 400, marginBottom: '6px' }}>
            Perfekt. Alles eingegangen.
          </h2>
          <p style={{ fontSize: '14px', color: C.pd, opacity: 0.75 }}>
            {briefing.email
              ? `Deine Offerte kommt in wenigen Minuten an ${briefing.email}.`
              : 'Deine Offerte kommt in wenigen Minuten per E-Mail.'}
          </p>
        </div>

        {/* Campaign summary */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid rgba(107,79,187,0.12)', padding: '20px 24px', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.08em', color: '#7A7596', textTransform: 'uppercase' as const, marginBottom: 12 }}>
            Deine Kampagne
          </div>
          {rows.map((row, i) => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(107,79,187,0.07)' : 'none', fontSize: 13 }}>
              <span style={{ color: '#7A7596' }}>{row.label}</span>
              <span style={{ fontWeight: 600, color: '#2D1F52', textAlign: 'right' as const, maxWidth: '60%' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {/* What happens next */}
        <div style={card}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
            Was jetzt passiert
          </div>
          {nextSteps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 0',
                borderBottom: i < nextSteps.length - 1 ? `1px solid ${C.border}` : 'none',
              }}
            >
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: C.pl, flexShrink: 0 }} />
              <div>
                <strong style={{ fontSize: '14px', fontWeight: 600, color: C.taupe }}>{step.title}</strong>
                <p style={{ fontSize: '12px', color: C.muted, marginTop: '1px' }}>{step.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ibox */}
        <div style={{ background: C.taupe, borderRadius: '14px', padding: '20px 22px', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display), Georgia, serif', fontSize: '19px', color: '#fff', fontWeight: 400, marginBottom: '8px' }}>
            Eine letzte Sache.
          </h3>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,.6)', lineHeight: 1.65, marginBottom: '10px' }}>
            Hast du Fragen bevor es losgeht? Wir sind für dich da – direkt und unkompliziert.
          </p>
          {[
            'info@vio.ch · Antwort innert 2 Stunden',
            'Oder buch direkt einen kurzen Call',
          ].map((pt, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'flex-start' }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: C.primary, flexShrink: 0, marginTop: '5px' }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,.65)' }}>{pt}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {nextStep && (
            <button
              type="button"
              onClick={nextStep}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: C.primary, color: '#fff', border: 'none',
                borderRadius: '100px', padding: '15px 32px',
                fontFamily: 'var(--font-sans), sans-serif', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(107,79,187,.3)',
                transition: 'all .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
            >
              Kampagnen-Dashboard ansehen →
            </button>
          )}
          {calendlyUrl && (
            <a
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                background: C.teal, color: '#fff', border: 'none',
                borderRadius: '100px', padding: '15px 32px',
                fontFamily: 'var(--font-sans), sans-serif', fontSize: '16px', fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 16px rgba(42,127,127,.3)',
                transition: 'all .18s', textDecoration: 'none',
              }}
            >
              Beratungsgespräch buchen
            </a>
          )}
        </div>

        <FeedbackCard briefing={briefing} />

        <style>{`@keyframes bi{0%{transform:scale(.4);opacity:0;}70%{transform:scale(1.12);}100%{transform:scale(1);opacity:1;}}`}</style>
      </div>
    </section>
  );
}
