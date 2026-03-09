'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';

function FeedbackCard({ briefing }: { briefing: BriefingData }) {
  const [feedbackText, setFeedbackText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle');

  const C8 = {
    primary: '#C1666B', pd: '#A84E53', taupe: '#5C4F3D',
    muted: '#8A8490', border: '#EDE8E0', bg: '#FAF7F2', white: '#FFFFFF',
  };

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
      <div style={{ background: C8.bg, border: `1px solid ${C8.border}`, borderRadius: '14px', padding: '20px 22px', marginTop: '20px', textAlign: 'center' }}>
        <span style={{ fontSize: '24px' }}>🙏</span>
        <p style={{ fontSize: '14px', fontWeight: 600, color: C8.taupe, marginTop: '8px' }}>Danke für dein Feedback!</p>
      </div>
    );
  }

  return (
    <div style={{ background: C8.bg, border: `1px solid ${C8.border}`, borderRadius: '14px', padding: '20px 22px', marginTop: '20px' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C8.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
        Eine kurze Frage
      </div>
      <p style={{ fontSize: '14px', color: C8.taupe, fontWeight: 600, marginBottom: '10px' }}>
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
          border: `1px solid ${C8.border}`, background: C8.white,
          fontFamily: 'var(--font-outfit), sans-serif', fontSize: '13px', color: C8.taupe,
          outline: 'none', resize: 'vertical', marginBottom: '10px',
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={status === 'sending' || !feedbackText.trim()}
        style={{
          background: C8.taupe, color: '#fff', border: 'none',
          borderRadius: '100px', padding: '10px 22px',
          fontFamily: 'var(--font-outfit), sans-serif', fontSize: '13px', fontWeight: 600,
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
import { calculateReach, formatNumber, formatCHF } from '@/lib/calculations';

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
  green: '#3A9E7A',
  teal: '#2A7F7F',
} as const;

const page: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const card: React.CSSProperties = {
  background: C.white,
  borderRadius: '12px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  padding: '20px 22px',
  marginBottom: '14px',
};

const MONTHS_DE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];

function formatDateDE(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function addDaysToStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  briefing: BriefingData;
  onBack: () => void;
  onSubmitSuccess: () => void;
}

export default function Step8Dashboard({ briefing, onBack, onSubmitSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isB2B = briefing.campaignType === 'b2b';
  const reach = isB2B
    ? (briefing.b2bReach?.mitarbeiter ?? briefing.reach)
    : (briefing.reach || calculateReach(briefing.budget, briefing.laufzeit).uniquePeople);

  const regions = briefing.analysis?.region ?? [];
  const durationDays = briefing.laufzeit * 7;
  const startDateStr = briefing.startDate || todayStr();
  const endDateStr = addDaysToStr(startDateStr, durationDays);

  const reachPerRegion = regions.length > 0 ? Math.round(reach / regions.length) : reach;

  const doohBudget = Math.round(briefing.budget * 0.7);
  const displayBudget = Math.round(briefing.budget * 0.3);

  const orgName = briefing.analysis?.organisation || briefing.firma || 'Deine Organisation';

  const mailtoBody = encodeURIComponent(
    `Hallo VIO Team,\n\nIch möchte mehr Menschen mit meiner Kampagne erreichen.\n\nKampagnen-Details:\n- Organisation: ${orgName}\n- Aktuelles Budget: ${formatCHF(briefing.budget)}\n- Laufzeit: ${briefing.laufzeit} Wochen\n- Region: ${regions.join(', ')}\n- Typ: ${isB2B ? 'B2B' : 'B2C'}\n\nBitte kontaktiert mich für ein Upgrade-Angebot.\n\nFreundliche Grüsse`
  );
  const mailtoHref = `mailto:hello@vio.swiss?subject=${encodeURIComponent('Mehr Reichweite – Kampagne ' + orgName)}&body=${mailtoBody}`;

  const handleOfferte = async () => {
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/submit-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...briefing, abschluss: 'offerte' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError('Deine Anfrage konnte nicht gesendet werden. Bitte versuche es erneut oder kontaktiere uns unter hello@vio.swiss.');
        setLoading(false);
        return;
      }
      onSubmitSuccess();
    } catch {
      setSubmitError('Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.');
      setLoading(false);
    }
  };

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 8
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          So sieht dein Dashboard aus.
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '20px', lineHeight: 1.6 }}>
          Das ist die Ansicht die deine Kunden nach dem Start sehen.
        </p>

        {/* Preview banner */}
        <div style={{
          background: C.pl,
          border: `1px solid ${C.primary}`,
          borderRadius: '10px',
          padding: '10px 16px',
          fontSize: '13px',
          color: C.pd,
          fontWeight: 500,
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>👁</span>
          Vorschau – Kampagne noch nicht gestartet
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div style={{ ...card, marginBottom: 0, textAlign: 'center', background: C.primary, border: 'none' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Menschen erreicht
            </div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '38px', color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: '4px' }}>
              0
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
              von ~{formatNumber(reach)} möglich
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: 600, color: C.primary, background: '#fff', borderRadius: '100px', padding: '3px 10px', display: 'inline-block' }}>
              startet bald
            </div>
          </div>

          <div style={{ ...card, marginBottom: 0, textAlign: 'center', background: C.taupe, border: 'none' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Kontakte pro Person
            </div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '38px', color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: '4px' }}>
              3×
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
              Ø Kontaktfrequenz / Woche
            </div>
          </div>
        </div>

        {/* Cards row: Kampagnenstart, Laufzeit, Kanal-Mix */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '14px' }}>
          <div style={{ ...card, marginBottom: 0, background: '#F0EBE3', border: '1px solid #DDD5C8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
              Kampagnenstart
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.taupe }}>
              {formatDateDE(startDateStr)}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 0, background: '#F0EBE3', border: '1px solid #DDD5C8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
              Laufzeit
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: C.taupe }}>
              {durationDays} Tage
            </div>
            <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
              {briefing.laufzeit} {briefing.laufzeit === 1 ? 'Woche' : 'Wochen'}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 0, background: '#F0EBE3', border: '1px solid #DDD5C8' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>
              Kanal-Mix
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.taupe, marginBottom: '3px' }}>
              70% DOOH
            </div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.taupe }}>
              30% Display
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ ...card, borderLeft: `4px solid ${C.primary}`, paddingLeft: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>
              Kampagnenfortschritt
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.primary }}>0%</div>
          </div>
          <div style={{ background: C.border, borderRadius: '100px', height: '8px', overflow: 'hidden', marginBottom: '8px' }}>
            <div style={{ width: '0%', height: '100%', background: C.primary, borderRadius: '100px' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: C.muted }}>
            <span>Start: {formatDateDE(startDateStr)}</span>
            <span>Ende: {formatDateDE(endDateStr)}</span>
          </div>
          <div style={{ marginTop: '8px', textAlign: 'center', fontSize: '12px', color: C.muted }}>
            {durationDays} Tage verbleibend
          </div>
        </div>

        {/* Two-column: Regions + Budget */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

          {/* Region breakdown */}
          <div style={card}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '14px' }}>
              Regionen
            </div>
            {regions.length > 0 ? regions.map(region => (
              <div key={region} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: C.taupe, fontWeight: 500, marginBottom: '5px' }}>
                  <span>{region}</span>
                  <span style={{ color: C.muted, fontSize: '12px' }}>~{formatNumber(reachPerRegion)}</span>
                </div>
                <div style={{ background: C.border, borderRadius: '100px', height: '5px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: C.primary, borderRadius: '100px' }} />
                </div>
              </div>
            )) : (
              <div style={{ fontSize: '13px', color: C.muted }}>Keine Regionen ausgewählt</div>
            )}
          </div>

          {/* Budget card */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', background: C.taupe, border: 'none' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '14px' }}>
              Budget
            </div>
            <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '28px', color: '#fff', letterSpacing: '-.03em', marginBottom: '2px' }}>
              {formatCHF(briefing.budget)}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
              Ausgegeben: {formatCHF(0)}
            </div>
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.15)', marginBottom: '12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>DOOH</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{formatCHF(doohBudget)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '16px' }}>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>Display</span>
              <span style={{ color: '#fff', fontWeight: 600 }}>{formatCHF(displayBudget)}</span>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <a
                href={mailtoHref}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: C.primary,
                  border: 'none',
                  borderRadius: '100px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#fff',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-outfit), sans-serif',
                  transition: 'all .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.pd; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.primary; }}
              >
                Mehr Menschen erreichen ↗
              </a>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Nach dem Start wird dieses Dashboard täglich aktualisiert.
        </div>

        {/* Submit error */}
        {submitError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: C.primary, marginBottom: '14px' }}>
            {submitError}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: 'none',
              border: `1.5px solid ${C.border}`,
              borderRadius: '100px',
              padding: '14px 24px',
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '15px',
              fontWeight: 500,
              color: C.muted,
              cursor: 'pointer',
              transition: 'all .15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.primary; e.currentTarget.style.color = C.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
          >
            ← Zurück
          </button>

          <button
            type="button"
            onClick={handleOfferte}
            disabled={loading}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: loading ? C.muted : C.primary,
              color: '#fff',
              border: 'none',
              borderRadius: '100px',
              padding: '15px 32px',
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(193,102,107,.3)',
              transition: 'all .18s',
            }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = loading ? C.muted : C.primary; e.currentTarget.style.transform = 'none'; } }}
          >
            {loading ? 'Wird gesendet...' : 'Offerte anfordern →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', fontSize: '12px', color: C.muted, marginTop: '8px' }}>
          🔒 Sichere Verbindung · Keine versteckten Kosten
        </div>

        <FeedbackCard briefing={briefing} />

      </div>
    </section>
  );
}
