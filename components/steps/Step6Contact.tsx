'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { formatCHF, formatNumber } from '@/lib/calculations';

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

const card: React.CSSProperties = {
  background: C.white,
  borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(44,44,62,.07)',
  padding: '20px 22px',
  marginBottom: '14px',
};

const hint: React.CSSProperties = {
  fontSize: '12px',
  color: C.muted,
  marginBottom: '5px',
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  goToStep?: (step: number) => void;
  isActive: boolean;
}

export default function Step6Contact({ briefing, updateBriefing, nextStep, goToStep }: Props) {
  const [abschluss, setAbschluss] = useState<'buchen' | 'offerte'>('buchen');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!briefing.vorname.trim()) e.vorname = 'Vorname ist erforderlich.';
    if (!briefing.nachname.trim()) e.nachname = 'Nachname ist erforderlich.';
    if (!briefing.email.trim()) e.email = 'E-Mail ist erforderlich.';
    else if (!isValidEmail(briefing.email)) e.email = 'Bitte gib eine gültige E-Mail-Adresse ein.';
    if (abschluss === 'buchen') {
      if (!briefing.adresse.trim()) e.adresse = 'Adresse ist erforderlich.';
      if (!briefing.plz.trim()) e.plz = 'PLZ ist erforderlich.';
      if (!briefing.ort.trim()) e.ort = 'Ort ist erforderlich.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    setSubmitError('');
    try {
      const res = await fetch('/api/submit-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...briefing, abschluss }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setSubmitError('Deine Anfrage konnte nicht gesendet werden. Bitte versuche es erneut oder kontaktiere uns unter info@vio.ch.');
        setLoading(false);
        return;
      }
      if (data.dealId) {
        updateBriefing({ dealId: data.dealId });
      }
      if (data.navigateTo && goToStep) {
        goToStep(data.navigateTo);
      } else {
        nextStep();
      }
    } catch {
      setSubmitError('Netzwerkfehler. Bitte prüfe deine Internetverbindung und versuche es erneut.');
      setLoading(false);
    }
  };

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '13px 15px',
    border: `1.5px solid ${hasError ? C.primary : C.border}`,
    borderRadius: '10px',
    fontFamily: 'var(--font-outfit), sans-serif',
    fontSize: '15px',
    color: C.taupe,
    background: C.bg,
    outline: 'none',
    transition: 'all .2s',
  });

  const werbemittelLabel: Record<string, string> = {
    upload: 'Hochladen',
    erstellen: 'Erstellen lassen',
    spaeter: 'Später',
  };

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 6
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          Wie möchtest du weitermachen?
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          Unverbindliche Offerte oder direkt loslegen – du entscheidest.
        </p>

        {/* Campaign summary fbox */}
        <div style={{ background: C.taupe, borderRadius: '14px', padding: '20px 22px', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase', marginBottom: '14px' }}>
            Deine Kampagne auf einen Blick
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '12px' }}>
            {[
              ['Budget', formatCHF(briefing.budget)],
              ['Laufzeit', `${briefing.laufzeit} Wochen`],
              ['Region', briefing.analysis?.region?.join(', ') || '—'],
              ['Reichweite', briefing.reach ? `~${formatNumber(briefing.reach)}` : '—'],
              ['Werbemittel', briefing.werbemittel ? werbemittelLabel[briefing.werbemittel] : '—'],
              ['Typ', briefing.campaignType === 'b2c' ? 'B2C' : 'B2B'],
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>{lbl}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Abschluss cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          {[
            {
              value: 'buchen' as const,
              ico: '🚀',
              title: 'Direkt buchen',
              sub: 'Sofort starten. Rechnung per E-Mail oder Kreditkarte.',
              badge: 'Direkt loslegen',
              badgeStyle: { background: C.pl, color: C.pd },
            },
            {
              value: 'offerte' as const,
              ico: '📄',
              title: 'Offerte anfordern',
              sub: 'Kostenlos & unverbindlich. Per E-Mail in wenigen Minuten.',
              badge: 'Kostenlos',
              badgeStyle: { background: '#E8F5F5', color: C.teal },
            },
          ].map(opt => {
            const active = abschluss === opt.value;
            return (
              <div
                key={opt.value}
                onClick={() => setAbschluss(opt.value)}
                style={{
                  background: active ? C.pl : C.white,
                  borderRadius: '14px',
                  border: `2px solid ${active ? C.primary : C.border}`,
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all .2s',
                  textAlign: 'center',
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLDivElement).style.borderColor = C.border; (e.currentTarget as HTMLDivElement).style.transform = 'none'; } }}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>{opt.ico}</div>
                <div style={{ fontWeight: 700, fontSize: '15px', color: C.taupe, marginBottom: '6px' }}>{opt.title}</div>
                <div style={{ fontSize: '12px', color: C.muted, lineHeight: 1.5, marginBottom: '10px' }}>{opt.sub}</div>
                <div style={{ ...opt.badgeStyle, display: 'inline-block', padding: '4px 12px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>
                  {opt.badge}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form card */}
        <div style={card}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '16px' }}>
            Deine Angaben
          </div>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '12px' }}>
            <div>
              <div style={hint}>Vorname *</div>
              <input
                type="text"
                placeholder="Max"
                value={briefing.vorname}
                onChange={e => { updateBriefing({ vorname: e.target.value }); if (errors.vorname) setErrors(p => ({ ...p, vorname: '' })); }}
                style={inputStyle(!!errors.vorname)}
              />
              {errors.vorname && <p style={{ fontSize: '12px', color: C.primary, marginTop: '4px' }}>{errors.vorname}</p>}
            </div>
            <div>
              <div style={hint}>Nachname *</div>
              <input
                type="text"
                placeholder="Muster"
                value={briefing.nachname}
                onChange={e => { updateBriefing({ nachname: e.target.value }); if (errors.nachname) setErrors(p => ({ ...p, nachname: '' })); }}
                style={inputStyle(!!errors.nachname)}
              />
              {errors.nachname && <p style={{ fontSize: '12px', color: C.primary, marginTop: '4px' }}>{errors.nachname}</p>}
            </div>
          </div>

          {/* Email */}
          <div style={{ marginBottom: '12px' }}>
            <div style={hint}>E-Mail *</div>
            <input
              type="email"
              placeholder="max@muster.ch"
              value={briefing.email}
              onChange={e => { updateBriefing({ email: e.target.value }); if (errors.email) setErrors(p => ({ ...p, email: '' })); }}
              style={inputStyle(!!errors.email)}
            />
            {errors.email && <p style={{ fontSize: '12px', color: C.primary, marginTop: '4px' }}>{errors.email}</p>}
          </div>

          {/* Organisation */}
          <div style={{ marginBottom: abschluss === 'buchen' ? '0' : '0' }}>
            <div style={hint}>Organisation</div>
            <input
              type="text"
              placeholder="Muster AG"
              value={briefing.firma}
              onChange={e => updateBriefing({ firma: e.target.value })}
              style={inputStyle()}
            />
          </div>

          {/* Billing address (buchen only) */}
          {abschluss === 'buchen' && (
            <>
              <div style={{ height: '1px', background: C.border, margin: '16px 0' }} />
              <div style={{ fontSize: '13px', fontWeight: 600, color: C.taupe, marginBottom: '12px' }}>
                Rechnungsadresse
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={hint}>Strasse & Nr. *</div>
                <input
                  type="text"
                  placeholder="Musterstrasse 12"
                  value={briefing.adresse}
                  onChange={e => { updateBriefing({ adresse: e.target.value }); if (errors.adresse) setErrors(p => ({ ...p, adresse: '' })); }}
                  style={inputStyle(!!errors.adresse)}
                />
                {errors.adresse && <p style={{ fontSize: '12px', color: C.primary, marginTop: '4px' }}>{errors.adresse}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <div style={hint}>PLZ *</div>
                  <input
                    type="text"
                    placeholder="9000"
                    value={briefing.plz}
                    onChange={e => { updateBriefing({ plz: e.target.value }); if (errors.plz) setErrors(p => ({ ...p, plz: '' })); }}
                    style={inputStyle(!!errors.plz)}
                  />
                  {errors.plz && <p style={{ fontSize: '12px', color: C.primary, marginTop: '4px' }}>{errors.plz}</p>}
                </div>
                <div>
                  <div style={hint}>Ort *</div>
                  <input
                    type="text"
                    placeholder="St. Gallen"
                    value={briefing.ort}
                    onChange={e => { updateBriefing({ ort: e.target.value }); if (errors.ort) setErrors(p => ({ ...p, ort: '' })); }}
                    style={inputStyle(!!errors.ort)}
                  />
                  {errors.ort && <p style={{ fontSize: '12px', color: C.primary, marginTop: '4px' }}>{errors.ort}</p>}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Call box */}
        <div style={{ background: C.pl, border: `1.5px solid ${C.primary}`, borderRadius: '14px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '26px' }}>📞</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.taupe }}>Persönliche Beratung gewünscht?</div>
            <p style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>Ab CHF 15&apos;000 empfehlen wir ein kurzes Gespräch. Kostenlos, 15 Minuten.</p>
          </div>
          <a
            href={process.env.NEXT_PUBLIC_CALENDLY_URL || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: C.primary, color: '#fff', border: 'none',
              borderRadius: '100px', padding: '10px 18px',
              fontFamily: 'var(--font-outfit), sans-serif', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            Call buchen
          </a>
        </div>

        {/* Contact hint */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: C.muted, marginBottom: '14px' }}>
          Fragen?{' '}
          <a href="mailto:info@vio.ch" style={{ color: C.primary, fontWeight: 600, textDecoration: 'none' }}>
            info@vio.ch
          </a>{' '}
          · Antwort innert 2 Stunden
        </div>

        {/* Submit error */}
        {submitError && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: C.primary, marginBottom: '14px' }}>
            {submitError}
          </div>
        )}

        {/* Submit button (full width) */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: loading ? C.muted : C.primary,
            color: '#fff',
            border: 'none',
            borderRadius: '100px',
            padding: '17px',
            fontFamily: 'var(--font-outfit), sans-serif',
            fontSize: '17px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: loading ? 'none' : '0 4px 16px rgba(193,102,107,.3)',
            transition: 'all .18s',
          }}
        >
          {loading ? 'Wird gesendet...' : abschluss === 'buchen' ? 'Jetzt verbindlich buchen →' : 'Offerte anfordern →'}
        </button>
        <div style={{ textAlign: 'center', fontSize: '12px', color: C.muted, marginTop: '8px' }}>
          🔒 Sichere Verbindung · Keine versteckten Kosten
        </div>
      </div>
    </section>
  );
}
