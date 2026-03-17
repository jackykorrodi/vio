'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const C = {
  primary: '#C1666B',
  pd: '#A84E53',
  pl: '#F9ECEC',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
} as const;

// ── Scroll reveal wrapper ────────────────────────────────────────────────────

function Reveal({ children, style, delay = 0 }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : 'translateY(28px)',
        transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── URL input used in hero + CTA ─────────────────────────────────────────────

function UrlInput({
  placeholder,
  buttonLabel,
  dark = false,
  onSubmit,
}: {
  placeholder: string;
  buttonLabel: string;
  dark?: boolean;
  onSubmit: (url: string) => void;
}) {
  const [val, setVal] = useState('');
  const submit = () => onSubmit(val);

  return (
    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '520px' }}>
      <input
        type="url"
        value={val}
        placeholder={placeholder}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        style={{
          flex: 1,
          minWidth: 0,
          padding: '14px 20px',
          borderRadius: '100px',
          border: dark ? '1.5px solid rgba(255,255,255,.25)' : `1.5px solid ${C.border}`,
          fontSize: '15px',
          fontFamily: 'var(--font-outfit), sans-serif',
          color: dark ? '#fff' : C.taupe,
          backgroundColor: dark ? 'rgba(255,255,255,.12)' : C.white,
          outline: 'none',
        }}
      />
      <button
        type="button"
        onClick={submit}
        style={{
          padding: '14px 26px',
          borderRadius: '100px',
          backgroundColor: dark ? C.white : C.primary,
          color: dark ? C.pd : '#fff',
          border: 'none',
          fontFamily: 'var(--font-outfit), sans-serif',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: dark ? '0 4px 16px rgba(0,0,0,.15)' : '0 4px 16px rgba(193,102,107,.35)',
          transition: 'transform .18s, box-shadow .18s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = dark
            ? '0 8px 24px rgba(0,0,0,.2)'
            : '0 8px 24px rgba(193,102,107,.4)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = dark
            ? '0 4px 16px rgba(0,0,0,.15)'
            : '0 4px 16px rgba(193,102,107,.35)';
        }}
      >
        {buttonLabel}
      </button>
    </div>
  );
}


// ── Main page ────────────────────────────────────────────────────────────────

export default function HomePage() {
  const router = useRouter();
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Hero campaign selector state
  const [heroType, setHeroType] = useState<'b2c' | 'b2b' | 'politik' | null>(null);
  const [heroUrl, setHeroUrl] = useState('');

  const handleHeroStart = () => {
    if (!heroType || heroType === 'politik') return;
    const cleanUrl = heroUrl.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const params = new URLSearchParams({ type: heroType });
    if (cleanUrl) params.set('url', cleanUrl);
    router.push('/campaign?' + params.toString());
  };

  const handleStart = (url: string) => {
    let clean = url.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (clean) {
      router.push(`/campaign?url=${encodeURIComponent(clean)}`);
    } else {
      router.push('/campaign');
    }
  };

  return (
    <main style={{ backgroundColor: C.bg, overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        backgroundColor: 'rgba(250,247,242,.9)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.border}`,
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 5vw, 56px)',
      }}>
        <span style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: '28px', fontWeight: 600, color: C.primary, letterSpacing: '-.02em',
        }}>
          VIO
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="#how" style={{ fontSize: '14px', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>
            Wie es funktioniert
          </a>
          <a href="#whom" style={{ fontSize: '14px', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>
            Für wen
          </a>
          <a href="#warum" style={{ fontSize: '14px', color: C.muted, textDecoration: 'none', fontWeight: 500 }}>
            Warum VIO
          </a>
          <button
            type="button"
            onClick={() => router.push('/campaign')}
            style={{
              padding: '9px 22px',
              borderRadius: '100px',
              backgroundColor: C.primary,
              color: '#fff',
              border: 'none',
              fontFamily: 'var(--font-outfit), sans-serif',
              fontSize: '14px', fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color .18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.pd; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.primary; }}
          >
            Kampagne starten →
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '92vh',
        background: `linear-gradient(155deg, ${C.bg} 0%, ${C.pl} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px clamp(20px, 5vw, 56px)',
        textAlign: 'center',
      }}>
        <div
          style={{
            maxWidth: '800px', width: '100%',
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(24px)',
            transition: 'opacity .7s ease, transform .7s ease',
          }}
        >
          {/* Eyebrow */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: C.pl,
              border: `1px solid rgba(193,102,107,.2)`,
              borderRadius: '100px',
              padding: '6px 18px',
              marginBottom: '32px',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity .7s ease .1s',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: C.pd }}>
              🇨🇭 Nur Schweizer Medien
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 'clamp(42px, 8vw, 76px)',
              fontWeight: 400,
              letterSpacing: '-.03em',
              lineHeight: 1.08,
              color: C.taupe,
              marginBottom: '22px',
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? 'none' : 'translateY(16px)',
              transition: 'opacity .7s ease .15s, transform .7s ease .15s',
            }}
          >
            VIO –<br />Sichtbarkeit für alle.
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              color: C.muted,
              lineHeight: 1.65,
              maxWidth: '540px',
              margin: '0 auto 32px',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity .7s ease .25s',
            }}
          >
            In weniger als 2 Minuten zur fertigen Kampagne —
            einfach, fair, persönlich.
          </p>

          {/* Campaign type selector + accordion */}
          <div
            style={{
              maxWidth: '640px', margin: '0 auto',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity .7s ease .35s',
            }}
          >
            {/* Type cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '0' }}>
              {([
                { value: 'b2c' as const, ico: '👥', name: 'Privatkunden (B2C)', desc: 'Menschen & Haushalte' },
                { value: 'b2b' as const, ico: '🏢', name: 'Geschäftskunden (B2B)', desc: 'Firmen & Fachleute' },
                { value: 'politik' as const, ico: '🗳️', name: 'Politische Kampagne', desc: 'Abstimmungen & Wahlen' },
              ] as const).map(opt => (
                <div
                  key={opt.value}
                  onClick={() => setHeroType(opt.value)}
                  style={{
                    background: heroType === opt.value ? C.pl : C.white,
                    border: `2px solid ${heroType === opt.value ? C.primary : C.border}`,
                    borderRadius: '12px',
                    padding: '16px 14px',
                    cursor: 'pointer',
                    transition: 'all .2s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (heroType !== opt.value) (e.currentTarget as HTMLDivElement).style.borderColor = C.primary; }}
                  onMouseLeave={e => { if (heroType !== opt.value) (e.currentTarget as HTMLDivElement).style.borderColor = C.border; }}
                >
                  <div style={{ fontSize: '22px', marginBottom: '7px' }}>{opt.ico}</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: C.taupe, lineHeight: 1.3 }}>{opt.name}</div>
                  <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>{opt.desc}</div>
                </div>
              ))}
            </div>

            {/* Accordion */}
            <div style={{
              maxHeight: heroType ? '1000px' : '0px',
              overflow: 'hidden',
              transition: 'max-height 300ms ease',
            }}>
              <div style={{
                background: C.white,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '20px',
                marginTop: '10px',
                textAlign: 'left',
              }}>

                {/* B2C / B2B: URL input */}
                {heroType !== 'politik' && heroType !== null && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '10px' }}>
                      Deine Website-URL
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="url"
                        value={heroUrl}
                        placeholder="https://deine-website.ch"
                        onChange={e => setHeroUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleHeroStart()}
                        style={{
                          flex: 1, minWidth: 0,
                          padding: '12px 16px',
                          borderRadius: '100px',
                          border: `1.5px solid ${C.border}`,
                          fontSize: '15px',
                          fontFamily: 'var(--font-outfit), sans-serif',
                          color: C.taupe,
                          backgroundColor: C.bg,
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleHeroStart}
                        style={{
                          padding: '12px 24px',
                          borderRadius: '100px',
                          backgroundColor: C.primary,
                          color: '#fff',
                          border: 'none',
                          fontFamily: 'var(--font-outfit), sans-serif',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 16px rgba(193,102,107,.35)',
                          transition: 'transform .18s, background-color .18s',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.transform = 'none'; }}
                      >
                        Kampagne starten →
                      </button>
                    </div>
                  </div>
                )}

                {/* Politik: redirect to /campaign */}
                {heroType === 'politik' && (
                  <div style={{ padding: '20px 0' }}>
                    <p style={{ fontSize: '14px', color: C.muted, marginBottom: '16px', lineHeight: 1.6 }}>
                      Starte deine politische Kampagne — wähle Region, Datum und Kampagnentyp im nächsten Schritt.
                    </p>
                    <button
                      onClick={() => window.location.href = '/campaign?type=politik'}
                      style={{ background: '#C1666B', color: '#fff', border: 'none', borderRadius: '100px', padding: '15px 32px', fontSize: '16px', fontWeight: 600, cursor: 'pointer', width: '100%' }}
                    >
                      Politische Kampagne starten →
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div
            style={{
              display: 'flex', justifyContent: 'center', gap: '24px',
              flexWrap: 'wrap', marginTop: '24px',
              opacity: heroVisible ? 1 : 0,
              transition: 'opacity .7s ease .45s',
            }}
          >
            {[
              '🔒 Deine Daten bleiben bei uns',
              '⚡ Bereit in 2 Minuten',
              '✓ Keine Kreditkarte nötig',
            ].map(t => (
              <span key={t} style={{ fontSize: '13px', color: C.muted, fontWeight: 500 }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5 VORTEILE – above the fold ─────────────────────────────────── */}
      <section id="warum-vio" style={{ padding: '24px clamp(16px, 4vw, 48px)', backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '12px',
          }}>
            {[
              { ico: '⚡', title: 'In 2 Minuten live', desc: 'Keine Agentur, kein Fachwissen, kein wochenlanger Vorlauf.' },
              { ico: '💰', title: 'Faire Preise', desc: 'All-in Preis, kein Kleingedrucktes. Ab CHF\u00A02\'500.' },
              { ico: '📍', title: 'DOOH + Online', desc: 'Digitale Plakate und Online-Banner in einer Buchung.' },
              { ico: '👥', title: 'Echte Reichweite', desc: 'Konkrete Personenzahlen – nicht abstrakte Metriken.' },
              { ico: '🤝', title: 'Persönlich', desc: 'Echte Menschen hinter VIO. Wir antworten direkt.' },
            ].map((v) => (
              <div
                key={v.title}
                style={{
                  backgroundColor: '#FAF7F2',
                  borderRadius: '12px',
                  border: '1px solid #EDE8E1',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{v.ico}</span>
                <div style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '15px', fontWeight: 400, color: C.taupe,
                  letterSpacing: '-.01em', lineHeight: 1.2,
                }}>
                  {v.title}
                </div>
                <p style={{
                  fontSize: '12px', color: C.muted, lineHeight: 1.5, margin: 0,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        <style>{`
          @media (max-width: 900px) {
            #warum-vio > div > div { grid-template-columns: repeat(3, 1fr) !important; }
          }
          @media (max-width: 560px) {
            #warum-vio > div > div { grid-template-columns: repeat(2, 1fr) !important; }
          }
        `}</style>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '100px clamp(20px, 5vw, 56px)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '.15em',
              color: C.primary, textTransform: 'uppercase', marginBottom: '14px',
            }}>
              So einfach geht&apos;s
            </div>
            <h2 style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 'clamp(28px, 4vw, 46px)',
              fontWeight: 400, letterSpacing: '-.02em', color: C.taupe,
            }}>
              Drei Schritte zur Kampagne
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              {
                n: '01', ico: '🌐',
                title: 'URL eingeben',
                desc: 'Gib deine Website-Adresse ein. Wir schauen uns an, was du anbietest und für wen.',
              },
              {
                n: '02', ico: '🔍',
                title: 'Wir finden deine Zielgruppe',
                desc: 'Wir analysieren deinen Auftritt und leiten automatisch ab, wen du erreichen möchtest — nach Region, Branche und Grösse.',
              },
              {
                n: '03', ico: '📺',
                title: 'Kampagne live',
                desc: 'Budget festlegen, Werbemittel hochladen, fertig. Deine Kampagne läuft auf Schweizer DOOH-Screens und im Web.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div
                  style={{
                    backgroundColor: C.white,
                    borderRadius: '16px',
                    border: `1px solid ${C.border}`,
                    padding: '28px 26px',
                    height: '100%',
                    boxShadow: '0 1px 4px rgba(44,44,62,.07)',
                    transition: 'transform .2s, box-shadow .2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-5px)';
                    el.style.boxShadow = '0 10px 28px rgba(44,44,62,.12)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'none';
                    el.style.boxShadow = '0 1px 4px rgba(44,44,62,.07)';
                  }}
                >
                  <div style={{
                    fontSize: '11px', fontWeight: 700, letterSpacing: '.12em',
                    color: C.primary, marginBottom: '14px',
                  }}>
                    {s.n}
                  </div>
                  <div style={{ fontSize: '36px', marginBottom: '16px' }}>{s.ico}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: '22px', fontWeight: 400, color: C.taupe, marginBottom: '10px',
                  }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: C.muted, lineHeight: 1.65 }}>
                    {s.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* ── Media info box ─────────────────────────────────────────── */}
          <Reveal style={{ marginTop: '32px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {[
                {
                  ico: '🖥️',
                  label: 'DOOH',
                  title: 'Digital Out-of-Home',
                  desc: 'Digitale Screens an Bahnhöfen, Einkaufszentren und belebten Orten. Deine Werbung dort wo Menschen unterwegs sind.',
                },
                {
                  ico: '📱',
                  label: 'Display',
                  title: 'Online-Werbung',
                  desc: 'Banner und Anzeigen auf Websites und Apps – gezielt ausgespielt an deine Zielgruppe.',
                },
              ].map(m => (
                <div
                  key={m.label}
                  style={{
                    background: `linear-gradient(135deg, ${C.pl} 0%, ${C.bg} 100%)`,
                    borderRadius: '14px',
                    border: `1px solid rgba(193,102,107,.15)`,
                    padding: '24px 22px',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '28px', flexShrink: 0, marginTop: '2px' }}>{m.ico}</div>
                  <div>
                    <div style={{
                      fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
                      color: C.primary, textTransform: 'uppercase', marginBottom: '4px',
                    }}>
                      {m.label}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-fraunces), Georgia, serif',
                      fontSize: '16px', fontWeight: 400, color: C.taupe, marginBottom: '6px',
                    }}>
                      {m.title}
                    </div>
                    <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.6 }}>
                      {m.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOR WHOM ────────────────────────────────────────────────────── */}
      <section id="whom" style={{ backgroundColor: C.taupe, padding: '100px clamp(20px, 5vw, 56px)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '.15em',
              color: 'rgba(255,255,255,.45)', textTransform: 'uppercase', marginBottom: '14px',
            }}>
              Perfekt geeignet für
            </div>
            <h2 style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 'clamp(28px, 4vw, 46px)',
              fontWeight: 400, letterSpacing: '-.02em', color: '#fff',
            }}>
              Für wen ist VIO gemacht?
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              {
                ico: '🏪',
                title: 'KMU & Detailhandel',
                desc: 'Regionale Unternehmen, die ihre Bekanntheit in der Gemeinde oder im Kanton erhöhen möchten — ohne Agentur, ohne grosses Budget.',
              },
              {
                ico: '🗳️',
                title: 'Politik & Gemeinden',
                desc: 'Politische Parteien, Kandidierende und Gemeinden, die ihre Botschaft gezielt in bestimmten Regionen platzieren wollen.',
              },
              {
                ico: '🤝',
                title: 'Vereine & NGOs',
                desc: 'Non-Profit-Organisationen und Vereine, die für Events, Mitglieder oder Spenden werben — mit maximalem Wirkungsgrad.',
              },
            ].map((w, i) => (
              <Reveal key={w.title} delay={i * 100}>
                <div
                  style={{
                    backgroundColor: 'rgba(255,255,255,.08)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,.12)',
                    padding: '30px 26px',
                    height: '100%',
                    transition: 'transform .2s, background-color .2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-5px)';
                    el.style.backgroundColor = 'rgba(255,255,255,.13)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'none';
                    el.style.backgroundColor = 'rgba(255,255,255,.08)';
                  }}
                >
                  <div style={{ fontSize: '38px', marginBottom: '18px' }}>{w.ico}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: '22px', fontWeight: 400, color: '#fff', marginBottom: '10px',
                  }}>
                    {w.title}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,.6)', lineHeight: 1.65 }}>
                    {w.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── REASON WHY ──────────────────────────────────────────────────── */}
      <section id="warum" style={{ padding: '100px clamp(20px, 5vw, 56px)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, letterSpacing: '.15em',
              color: C.primary, textTransform: 'uppercase', marginBottom: '14px',
            }}>
              Warum VIO
            </div>
            <h2 style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 'clamp(28px, 4vw, 46px)',
              fontWeight: 400, letterSpacing: '-.02em', color: C.taupe,
            }}>
              Was VIO einzigartig macht
            </h2>
          </Reveal>

          {/* Big card */}
          <Reveal style={{ marginBottom: '16px' }}>
            <div style={{
              backgroundColor: C.taupe,
              borderRadius: '16px',
              padding: '40px 36px',
              boxShadow: '0 1px 4px rgba(44,44,62,.07)',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: 'clamp(22px, 3vw, 30px)',
                fontWeight: 400,
                color: '#fff',
                marginBottom: '16px',
                lineHeight: 1.25,
                letterSpacing: '-.02em',
              }}>
                Wir kommen aus der Medienbranche.<br />Wir wissen wo es hakt.
              </h3>
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,.65)',
                lineHeight: 1.7,
                maxWidth: '680px',
              }}>
                Auf der einen Seite grosse Unternehmen mit Agenturen und Spezialisten.
                Auf der anderen KMUs, Vereine, Politiker – mit echten Botschaften, aber keinem
                Zugang zu denselben Werkzeugen. Diesen Gap wollten wir schliessen.
              </p>
            </div>
          </Reveal>

          {/* 3 smaller cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {[
              {
                ico: '⚡',
                title: 'Schnell wenn du es brauchst',
                desc: 'In 2 Minuten buchst du eine Kampagne – ohne Agentur, ohne Fachwissen. Keine Fachbegriffe, keine versteckten Kosten.',
              },
              {
                ico: '💬',
                title: 'Persönlich wenn du es willst',
                desc: 'Hinter VIO stecken echte Menschen. Wir sind erreichbar, beraten gerne und freuen uns über jede Kampagne die wir gemeinsam auf den Weg bringen.',
              },
              {
                ico: '🇨🇭',
                title: '100% Schweiz',
                desc: 'Nur echte Schweizer Medien. Faire Preise. Transparente Abrechnung.',
              },
            ].map((r, i) => (
              <Reveal key={r.title} delay={i * 100}>
                <div
                  style={{
                    backgroundColor: C.white,
                    borderRadius: '14px',
                    border: `1px solid ${C.border}`,
                    padding: '26px 22px',
                    height: '100%',
                    boxShadow: '0 1px 4px rgba(44,44,62,.07)',
                    transition: 'transform .2s, box-shadow .2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-4px)';
                    el.style.boxShadow = '0 10px 28px rgba(44,44,62,.11)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'none';
                    el.style.boxShadow = '0 1px 4px rgba(44,44,62,.07)';
                  }}
                >
                  <div style={{ fontSize: '30px', marginBottom: '14px' }}>{r.ico}</div>
                  <h3 style={{
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize: '20px', fontWeight: 400, color: C.taupe, marginBottom: '10px',
                  }}>
                    {r.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: C.muted, lineHeight: 1.65 }}>
                    {r.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ──────────────────────────────────────────────────── */}
      <section style={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.pd} 100%)`,
        padding: '100px clamp(20px, 5vw, 56px)',
        textAlign: 'center',
      }}>
        <Reveal style={{ maxWidth: '620px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 'clamp(30px, 5vw, 52px)',
            fontWeight: 400, letterSpacing: '-.025em', lineHeight: 1.12,
            color: '#fff', marginBottom: '18px',
          }}>
            Bereit, loszulegen?
          </h2>
          <p style={{
            fontSize: '16px', color: 'rgba(255,255,255,.75)',
            lineHeight: 1.65, marginBottom: '40px',
          }}>
            Gib deine Website-URL ein und entdecke, wie viele Menschen du mit deinem Budget erreichen kannst.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <UrlInput
              placeholder="deine-website.ch"
              buttonLabel="Kostenlos starten →"
              dark
              onSubmit={handleStart}
            />
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer id="contact" style={{
        backgroundColor: C.taupe,
        padding: '36px clamp(20px, 5vw, 56px)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <span style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: '26px', fontWeight: 600, color: C.primary,
        }}>
          VIO
        </span>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          {[
            { label: 'hello@vio.ch', href: 'mailto:hello@vio.ch' },
            { label: 'Impressum', href: '#' },
            { label: 'Datenschutz', href: '#' },
          ].map(l => (
            <a
              key={l.label}
              href={l.href}
              style={{
                fontSize: '13px', color: 'rgba(255,255,255,.55)',
                textDecoration: 'none', fontWeight: 500,
                transition: 'color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>
          © {new Date().getFullYear()} VIO. Alle Rechte vorbehalten.
        </span>
      </footer>

    </main>
  );
}
