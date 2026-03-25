'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SwissAquarelle from '@/components/SwissAquarelle';
import VioLogo from '@/components/VioLogo';

const C = {
  primary:      '#6B4FBB',
  primaryLight: '#8B6FD4',
  primaryPale:  '#EDE8FF',
  primaryXpale: '#F5F2FF',
  gold:         '#D4A843',
  ink:          '#2D1F52',
  slate:        '#7A7596',
  border:       'rgba(107,79,187,0.10)',
  bg:           '#FDFCFF',
  white:        '#FFFFFF',
  lavender:     '#B8A9E8',
} as const;

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────
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
    <div ref={ref} style={{
      opacity:    visible ? 1 : 0,
      transform:  visible ? 'none' : 'translateY(28px)',
      transition: `opacity .65s ease ${delay}ms, transform .65s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const [heroVisible, setHeroVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setHeroVisible(true), 80); return () => clearTimeout(t); }, []);

  return (
    <main style={{ overflowX: 'hidden' }}>

      <div className="grain" />

      {/* ── BACKGROUND BLOBS ──────────────────────────────────────────────── */}
      <div className="wc-layer">
        <div className="wc-blob" style={{ width:'700px', height:'700px', background:'radial-gradient(circle,rgba(184,169,232,0.24),rgba(184,169,232,0.04) 65%,transparent)', top:'-200px', left:'-130px', animationDelay:'0s' }} />
        <div className="wc-blob" style={{ width:'480px', height:'480px', background:'radial-gradient(circle,rgba(200,223,248,0.22),rgba(200,223,248,0.04) 65%,transparent)', top:'280px', right:'-110px', animationDelay:'-9s' }} />
        <div className="wc-blob" style={{ width:'380px', height:'380px', background:'radial-gradient(circle,rgba(212,168,67,0.12),transparent 65%)', bottom:'30%', left:'12%', animationDelay:'-6s' }} />
        <div className="wc-blob" style={{ width:'300px', height:'300px', background:'radial-gradient(circle,rgba(184,169,232,0.18),transparent 65%)', bottom:'10%', right:'20%', animationDelay:'-14s' }} />
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(253,252,255,0.92)', backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(107,79,187,0.10)',
        height: '62px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 48px',
      }}>
        <VioLogo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <a
            href="#wieso"
            style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: C.slate, textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.primary; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.slate; }}
          >
            Wieso mit uns
          </a>
          <a
            href="/campaign"
            style={{ background: C.primary, color: 'white', padding: '10px 22px', borderRadius: '100px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, boxShadow: '0 4px 16px rgba(107,79,187,0.22)', transition: 'all .2s', textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.primaryLight; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.primary; }}
          >
            Kampagne starten
          </a>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div id="hero-grid" style={{
          minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr',
          alignItems: 'center', gap: '60px', padding: '100px 64px 60px',
          position: 'relative', zIndex: 1,
        }}>

          {/* hero-left */}
          <div style={{
            position: 'relative', zIndex: 2,
            opacity:   heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity .7s ease, transform .7s ease',
          }}>
            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.primaryXpale, border: '1px solid rgba(107,79,187,0.15)', borderRadius: '100px', padding: '7px 18px', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: C.primary, marginBottom: '28px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'block' }} />
              Schweizer Werbeplattform
            </div>

            {/* H1 */}
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(52px,5.5vw,82px)', fontWeight: 800, lineHeight: 1.04, letterSpacing: '-.025em', color: C.ink, marginBottom: '20px' }}>
              Deine Botschaft.<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary }}>Überall.</em>
            </h1>

            {/* Sub */}
            <p style={{ fontSize: '17px', lineHeight: 1.7, color: C.slate, fontWeight: 300, marginBottom: '44px', maxWidth: '430px', fontFamily: 'var(--font-sans)' }}>
              In wenigen Schritten zur fertigen Kampagne – ohne Agentur, ohne Fachjargon. DOOH-Screens und Online-Display, alles in einer Buchung. Einfach, fair, Schweiz.
            </p>

            {/* Target selector */}
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: C.ink, marginBottom: '14px' }}>
              Wen möchtest du erreichen?
            </div>
            <div className="target-list">
              {/* Politik */}
              <a href="/campaign?type=politik" className="ti primary">
                <div className="ti-icon">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="#6B4FBB" strokeWidth="1.5"/>
                    <path d="M11 7v4l3 2" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="ti-body">
                  <div className="ti-title">Stimmbevölkerung</div>
                  <div className="ti-sub">Abstimmungen, Kandidaturen &amp; politische Botschaften</div>
                </div>
                <div className="ti-arr">→</div>
              </a>
              {/* B2B */}
              <a href="/campaign?type=b2b" className="ti primary">
                <div className="ti-icon">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <rect x="2" y="8" width="18" height="11" rx="2" stroke="#6B4FBB" strokeWidth="1.5"/>
                    <path d="M7 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="#6B4FBB" strokeWidth="1.5"/>
                  </svg>
                </div>
                <div className="ti-body">
                  <div className="ti-title">Unternehmen &amp; Fachleute</div>
                  <div className="ti-sub">Firmen, Entscheider &amp; B2B-Zielgruppen in der Schweiz</div>
                </div>
                <div className="ti-arr">→</div>
              </a>
              {/* B2C */}
              <a href="/campaign?type=b2c" className="ti sec">
                <div className="ti-icon ti-icon-sec">
                  <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                    <circle cx="11" cy="8" r="3" stroke="#B8A9E8" strokeWidth="1.5"/>
                    <path d="M5 19c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="#B8A9E8" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="ti-body">
                  <div className="ti-title ti-title-sec">Privatkunden &amp; Konsumenten</div>
                  <div className="ti-sub">Lokale Kunden, Haushalte &amp; Endverbraucher</div>
                </div>
                <div className="ti-arr" style={{ color: C.lavender }}>→</div>
              </a>
            </div>
          </div>

          {/* hero-right */}
          <div style={{
            position: 'relative', height: '540px', zIndex: 2,
            opacity:   heroVisible ? 1 : 0,
            transition: 'opacity .7s ease .25s',
          }}>
            {/* Aqua pool */}
            <div style={{ position: 'absolute', width: '420px', height: '420px', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', borderRadius: '55% 45% 60% 40% / 48% 56% 44% 52%', background: 'radial-gradient(ellipse at 30% 35%,rgba(184,169,232,.45) 0%,transparent 55%),radial-gradient(ellipse at 68% 65%,rgba(200,223,248,.4) 0%,transparent 55%),radial-gradient(ellipse at 55% 25%,rgba(242,196,206,.28) 0%,transparent 45%),radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.55) 0%,transparent 55%)', filter: 'blur(4px)', animation: 'morphPool 14s ease-in-out infinite alternate', pointerEvents: 'none', zIndex: 0 }} />

            <div style={{ position: 'absolute', left: '50%', top: '0px', transform: 'translateX(-50%)', width: '480px', height: '280px', zIndex: 1, pointerEvents: 'none' as const, overflow: 'hidden' }}>
              <SwissAquarelle />
            </div>

            {/* Card 1 — card-main */}
            <div style={{ position: 'absolute', width: '290px', top: '40px', left: '50%', transform: 'translateX(-46%)', zIndex: 3, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,1)', borderRadius: '22px', padding: '24px 26px', boxShadow: '0 2px 0 rgba(107,79,187,.05),0 14px 44px rgba(107,79,187,.08),0 2px 8px rgba(0,0,0,.04)', animation: 'floatA 7s ease-in-out infinite' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--violet-pale)', borderRadius: '100px', padding: '4px 12px', fontSize: '10px', color: 'var(--violet)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--violet)', animation: 'blink 2s ease-in-out infinite', flexShrink: 0, display: 'block' }} />
                Kampagne · Live
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 800, color: 'var(--ink)', lineHeight: 1, marginBottom: '4px', letterSpacing: '-.02em' }}>124&apos;800</div>
              <div style={{ fontSize: '12px', color: 'var(--slate)', marginBottom: '16px' }}>Personen im Kanton Zürich</div>
              <div style={{ height: '7px', background: 'var(--violet-pale)', borderRadius: '100px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{ height: '100%', width: '0%', background: 'linear-gradient(90deg,var(--violet),var(--lavender))', borderRadius: '100px', animation: 'growBar 2.2s cubic-bezier(.4,0,.2,1) .8s forwards' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                <span style={{ color: 'var(--slate)' }}>CHF 3&apos;200 · 14 Tage</span>
                <span style={{ color: 'var(--violet)', fontWeight: 600 }}>72% Potenzial</span>
              </div>
            </div>

            {/* Card 2 — card-stat */}
            <div style={{ position: 'absolute', width: '200px', bottom: '90px', left: '4px', zIndex: 3, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,1)', borderRadius: '22px', padding: '24px 26px', boxShadow: '0 2px 0 rgba(107,79,187,.05),0 14px 44px rgba(107,79,187,.08),0 2px 8px rgba(0,0,0,.04)', animation: 'floatB 7s ease-in-out infinite' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '9.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#B8A9E8', marginBottom: '8px' }}>26 Kantone · 124 Gemeinden</div>
              <div style={{ lineHeight: 1, marginBottom: '4px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>5.4</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 400, color: '#7A7596', marginLeft: '4px' }}>Mio</span>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', fontWeight: 300, color: '#7A7596', marginBottom: '10px' }}>Stimmbevölkerung erreichbar</div>
              <div style={{ borderTop: '1px solid rgba(107,79,187,0.08)', margin: '8px 0' }} />
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--ink)' }}>600k+</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '11px', fontWeight: 300, color: '#7A7596' }}>Unternehmen CH</span>
              </div>
            </div>

            {/* Card 3 — card-reach */}
            <div style={{ position: 'absolute', width: '208px', top: '200px', right: '8px', zIndex: 3, background: 'rgba(255,255,255,.94)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,1)', borderRadius: '22px', padding: '24px 26px', boxShadow: '0 2px 0 rgba(107,79,187,.05),0 14px 44px rgba(107,79,187,.08),0 2px 8px rgba(0,0,0,.04)', animation: 'floatC 7s ease-in-out infinite' }}>
              <div style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--lavender)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '12px' }}>Kanäle</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--violet-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: 'var(--violet)', flexShrink: 0 }}>▦</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>DOOH Screens</div>
                    <div style={{ fontSize: '10px', color: 'var(--slate)' }}>70%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--sky-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#7B8FD4', flexShrink: 0 }}>◻</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--ink)' }}>Online Display</div>
                    <div style={{ fontSize: '10px', color: 'var(--slate)' }}>30%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(107,79,187,0.08)', borderBottom: '1px solid rgba(107,79,187,0.08)', background: 'rgba(237,232,255,0.18)', padding: '18px 64px' }}>
        <div id="strip-inner" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
          {([
            { num: '26',        label: 'Kantone buchbar',    sub: '124 Gemeinden verfügbar' },
            { num: '5.4 Mio',   label: 'Stimmbevölkerung',   sub: 'via DOOH & Display erreichbar' },
            { num: '600k+',     label: 'Unternehmen CH',     sub: 'via B2B Display erreichbar' },
            { num: "CHF 2'500", label: 'Einstiegsbudget',    sub: '100% Schweizer Medien' },
          ] as const).map((item, i, arr) => (
            <div key={item.num} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: i === 0 ? '0 28px 0 0' : '0 28px', borderRight: i < arr.length - 1 ? '1px solid rgba(107,79,187,0.10)' : 'none', flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: C.primary, letterSpacing: '-.02em', flexShrink: 0 }}>{item.num}</div>
              <div style={{ fontSize: '12px', color: C.slate, fontWeight: 300, lineHeight: 1.4 }}>
                <strong style={{ display: 'block', color: C.ink, fontWeight: 600, fontSize: '13px', fontFamily: 'var(--font-display)' }}>{item.label}</strong>
                {item.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '80px 64px' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.gold, marginBottom: '14px' }}>So funktioniert VIO</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,2.8vw,40px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, color: C.ink, marginBottom: '8px' }}>
            Planung. Werbemittel.<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary }}>Fertig gebucht.</em>
          </h2>
          <p style={{ fontSize: '15px', color: C.slate, fontWeight: 300, marginBottom: '48px', maxWidth: '520px', lineHeight: 1.6 }}>
            Alles in einem Flow — von der Zielgruppe bis zur gebuchten Kampagne. Klare Preise, keine Überraschungen.
          </p>
        </Reveal>
        <div id="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
          {([
            {
              num: '01',
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><circle cx="11" cy="11" r="8" stroke="#6B4FBB" strokeWidth="1.5"/><path d="M8 11l2 2 4-4" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              title: 'Zielgruppe definieren',
              body: 'Website eingeben oder Region wählen — wir schlagen automatisch die passende Zielgruppe vor. Du passt sie an wenn nötig.',
              badge: 'Automatisch', badgeStyle: {},
            },
            {
              num: '02',
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="3" stroke="#6B4FBB" strokeWidth="1.5"/><path d="M7 11h8M7 7h8M7 15h5" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              title: 'Budget & Reichweite',
              body: 'Budget und Laufzeit wählen. Direkt sehen wie viele Menschen du erreichst — inkl. DOOH-Anteil und Online-Display. Klare Preise.',
              badge: 'Transparent', badgeStyle: {},
            },
            {
              num: '03',
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="5" width="16" height="14" rx="2" stroke="#6B4FBB" strokeWidth="1.5"/><path d="M7 5V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1" stroke="#6B4FBB" strokeWidth="1.5"/><path d="M11 10v4M9 12h4" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              title: 'Werbemittel',
              body: 'Eigene Dateien hochladen, mit dem VIO Ad Creator selbst gestalten, oder später einreichen. Deine Wahl.',
              badge: 'Optional: CHF 500', badgeStyle: { background: '#FDF3DC', color: '#9B7120' },
            },
            {
              num: '04',
              icon: <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M5 12l5 5L19 7" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              title: 'Buchen & verfolgen',
              body: 'Kampagne final bestätigen. Danach siehst du live wie sie läuft — im persönlichen Dashboard mit Link zum Teilen.',
              badge: 'Dashboard inklusive', badgeStyle: { background: '#EDF7F5', color: '#3D8A80' },
            },
          ]).map((s, i) => (
            <Reveal key={s.num} delay={i * 80}>
              <div
                style={{ background: 'white', border: '1px solid rgba(107,79,187,0.09)', borderRadius: '22px', padding: '28px 22px', position: 'relative', overflow: 'hidden', transition: 'all .25s', cursor: 'default' }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'translateY(-4px)';
                  el.style.boxShadow = '0 14px 36px rgba(107,79,187,0.10)';
                  el.style.borderColor = 'rgba(107,79,187,0.18)';
                  (el.querySelector('[data-topbar]') as HTMLDivElement | null)?.style && ((el.querySelector('[data-topbar]') as HTMLDivElement).style.opacity = '1');
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.transform = 'none';
                  el.style.boxShadow = 'none';
                  el.style.borderColor = 'rgba(107,79,187,0.09)';
                  (el.querySelector('[data-topbar]') as HTMLDivElement | null)?.style && ((el.querySelector('[data-topbar]') as HTMLDivElement).style.opacity = '0');
                }}
              >
                <div data-topbar="" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', borderRadius: '22px 22px 0 0', opacity: 0, transition: 'opacity .25s', background: ['linear-gradient(90deg,#6B4FBB,#B8A9E8)', 'linear-gradient(90deg,#D4A843,rgba(212,168,67,.3))', 'linear-gradient(90deg,#6B4FBB,#C8DFF8)', 'linear-gradient(90deg,#3D8A80,#B8A9E8)'][i] }} />
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#B8A9E8', marginBottom: '14px' }}>{s.num}</div>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--violet-xpale)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px' }}>
                  {s.icon}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: C.ink, marginBottom: '8px', letterSpacing: '-.01em' }}>{s.title}</div>
                <p style={{ fontSize: '13px', color: C.slate, lineHeight: 1.6, fontWeight: 300, marginBottom: '12px' }}>{s.body}</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--violet-xpale)', color: C.primary, borderRadius: '100px', padding: '3px 10px', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '.04em', ...s.badgeStyle }}>
                  {s.badge}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── USP SECTION ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '0 64px 80px' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.gold, marginBottom: '14px' }}>Die einzigartige Kombination</div>
        </Reveal>
        <div id="usp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center' }}>
          {/* Left: text + bullets */}
          <Reveal>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,2.6vw,38px)', fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1, color: C.ink, marginBottom: '16px' }}>
                Öffentlicher Raum.<br />
                <em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary }}>Und privater Bildschirm.</em>
              </h2>
              <p style={{ fontSize: '15px', color: C.slate, fontWeight: 300, lineHeight: 1.75, marginBottom: '28px' }}>
                VIO kombiniert digitale Aussenwerbung (DOOH) mit Online-Display — als einzige Schweizer Plattform in einer einzigen Buchung.
              </p>
              {([
                {
                  icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="1" y="3" width="16" height="11" rx="2" stroke="#6B4FBB" strokeWidth="1.5"/><line x1="6" y1="14" x2="12" y2="14" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round"/><line x1="9" y1="14" x2="9" y2="17" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round"/></svg>,
                  title: 'DOOH — Öffentlicher Raum',
                  sub: 'Bahnhöfe, Einkaufszentren, belebte Orte. 70% deines Budgets. Keine Werbeblocker.',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="14" height="14" rx="3" stroke="#6B4FBB" strokeWidth="1.5"/><circle cx="9" cy="9" r="3" stroke="#6B4FBB" strokeWidth="1.5"/></svg>,
                  title: 'Display — Schweizer Medien',
                  sub: '30% erreicht dieselbe Zielgruppe zuhause. Präzise. Nur Schweizer Portale.',
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2L11.5 7H16.5L12.5 10.5L14 15.5L9 12.5L4 15.5L5.5 10.5L1.5 7H6.5L9 2Z" stroke="#6B4FBB" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
                  title: 'Eine Buchung. Doppelte Präsenz.',
                  sub: 'Kein Koordinieren. Kein Mediaplan. Du buchst einmal — wir steuern beide Kanäle.',
                },
              ]).map(pt => (
                <div key={pt.title} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '18px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '11px', background: 'var(--violet-xpale)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                    {pt.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '3px' }}>{pt.title}</div>
                    <div style={{ fontSize: '13px', color: C.slate, fontWeight: 300, lineHeight: 1.5 }}>{pt.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          {/* Right: budget card */}
          <Reveal delay={120}>
            <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: '24px', padding: '32px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: C.ink, marginBottom: '24px' }}>So verteilt sich dein Budget</div>
              {/* DOOH row */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, color: C.ink }}>DOOH Screens</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: C.primary }}>70%</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(107,79,187,0.08)', borderRadius: '100px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ height: '100%', width: '70%', background: 'linear-gradient(90deg,#6B4FBB,#B8A9E8)', borderRadius: '100px' }} />
                </div>
                <div style={{ fontSize: '11px', color: C.slate, fontWeight: 300 }}>Öffentlicher Raum · physische Präsenz</div>
              </div>
              {/* Display row */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, color: C.ink }}>Online Display</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 800, color: C.primary }}>30%</span>
                </div>
                <div style={{ height: '10px', background: 'rgba(107,79,187,0.08)', borderRadius: '100px', overflow: 'hidden', marginBottom: '6px' }}>
                  <div style={{ height: '100%', width: '30%', background: 'linear-gradient(90deg,#7B8FD4,#C8DFF8)', borderRadius: '100px' }} />
                </div>
                <div style={{ fontSize: '11px', color: C.slate, fontWeight: 300 }}>Schweizer Medien · privater Bildschirm</div>
              </div>
              <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '20px 0' }} />
              {([
                { l: 'Ø Kontaktfrequenz', r: '7× pro Person', highlight: true },
                { l: 'Buchungszeit',      r: 'wenige Schritte', highlight: false },
                { l: 'Medien',            r: '100% Schweiz',    highlight: false },
              ]).map(row => (
                <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '5px 0' }}>
                  <span style={{ color: C.slate }}>{row.l}</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: row.highlight ? C.primary : C.ink }}>{row.r}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW ────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, background: 'linear-gradient(145deg,#1E1530,#16112A)', padding: '80px 64px', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(107,79,187,0.22) 0%,transparent 70%)', top: '-200px', right: '-100px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle,rgba(200,223,248,0.12) 0%,transparent 70%)', bottom: '-100px', left: '10%', pointerEvents: 'none' }} />
        <div style={{ maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Reveal>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.gold, marginBottom: '14px' }}>Kampagnen-Dashboard</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,3vw,42px)', fontWeight: 800, letterSpacing: '-.025em', color: 'white', marginBottom: '10px', lineHeight: 1.1 }}>
              Deine Kampagne.<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: '#B8A9E8' }}>Live verfolgen.</em>
            </h2>
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,.45)', fontWeight: 300, marginBottom: '40px', maxWidth: '480px', lineHeight: 1.6 }}>
              Nach der Buchung erhältst du einen persönlichen Dashboard-Link — kein Login, einfach teilen. Sieh live wie deine Botschaft wirkt.
            </p>
          </Reveal>
          <div id="dash-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '28px' }}>
            {([
              { lbl: 'Personen erreicht',  num: "87'240", sub: 'von 124\'800 Ziel · Zürich',          fillW: '70%', fillBg: 'linear-gradient(90deg,#6B4FBB,#B8A9E8)', meta: '70% erreicht · 4 Tage verbleibend', numColor: C.ink },
              { lbl: 'Kontaktfrequenz',    num: '5.2×',   sub: 'Ø pro Person · Ziel 7×',              fillW: '74%', fillBg: 'linear-gradient(90deg,#D4A843,rgba(212,168,67,.4))', meta: "auf Kurs · CHF 3'200 eingesetzt", numColor: C.ink },
              { lbl: 'Kampagnenstatus',    num: 'Live',   sub: 'Gestartet 12. März · endet 26. März', fillW: '57%', fillBg: 'linear-gradient(90deg,#3D8A80,#B8E8E0)', meta: '57% der Laufzeit · DOOH + Display aktiv', numColor: '#3D8A80' },
            ]).map((card, i) => (
              <Reveal key={card.lbl} delay={i * 80}>
                <div style={{ background: 'rgba(255,255,255,0.95)', borderRadius: '20px', padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', borderRadius: '20px 20px 0 0', background: ['linear-gradient(90deg,#6B4FBB,#B8A9E8)', 'linear-gradient(90deg,#D4A843,rgba(212,168,67,.3))', 'linear-gradient(90deg,#C8DFF8,#6B4FBB)'][i] }} />
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#B8A9E8', marginBottom: '8px' }}>{card.lbl}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, color: card.numColor, letterSpacing: '-.02em', lineHeight: 1, marginBottom: '4px' }}>{card.num}</div>
                  <div style={{ fontSize: '12px', color: C.slate, fontWeight: 300, marginBottom: '12px' }}>{card.sub}</div>
                  <div style={{ height: '6px', background: 'rgba(107,79,187,0.10)', borderRadius: '100px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: card.fillW, background: card.fillBg, borderRadius: '100px' }} />
                  </div>
                  <div style={{ fontSize: '11px', color: C.slate }}>{card.meta}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <button
            type="button"
            onClick={() => router.push('/campaign')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '100px', padding: '12px 24px', fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'all .2s', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
          >
            Dashboard-Vorschau ansehen →
          </button>
        </div>
      </section>

      {/* ── WIESO MIT UNS ────────────────────────────────────────────────── */}
      <section id="wieso" style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '80px 64px' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: C.gold, marginBottom: '14px' }}>Wieso mit uns</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,2.8vw,40px)', fontWeight: 800, letterSpacing: '-.02em', color: C.ink, marginBottom: '8px', lineHeight: 1.1 }}>
            Wir kommen aus der{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary }}>Medienbranche.</em>
          </h2>
          <p style={{ fontSize: '15px', color: C.slate, fontWeight: 300, maxWidth: '520px', lineHeight: 1.6, marginBottom: '0' }}>
            Wir wissen wie Werbung funktioniert — und warum sie für die meisten viel zu kompliziert ist.
          </p>
        </Reveal>
        <div id="why-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px', marginTop: '40px' }}>
          {([
            {
              icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2L12.5 7.5H18L13.5 11L15.5 17L10 13.5L4.5 17L6.5 11L2 7.5H7.5L10 2Z" stroke="#6B4FBB" strokeWidth="1.5" strokeLinejoin="round"/></svg>,
              bar: 'linear-gradient(90deg,#6B4FBB,#B8A9E8)',
              title: 'Kein Fachwissen nötig',
              body: 'Du gibst uns deine Website — wir analysieren sie und schlagen dir eine Zielgruppe vor. Keine Fachbegriffe. Kein Mediaplan.',
            },
            {
              icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#6B4FBB" strokeWidth="1.5"/><path d="M7 10l2 2 4-4" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
              bar: 'linear-gradient(90deg,#D4A843,rgba(212,168,67,.4))',
              title: 'Faire, transparente Preise',
              body: 'Keine versteckten Kosten. Kein Agentur-Markup. Du siehst immer genau was du bekommst — bevor du buchst.',
            },
            {
              icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3" stroke="#6B4FBB" strokeWidth="1.5"/><path d="M4 18c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round"/></svg>,
              bar: 'linear-gradient(90deg,#C8DFF8,#6B4FBB)',
              title: 'Echte Menschen dahinter',
              body: 'Hinter VIO stecken keine Algorithmen. Wir sind erreichbar, beraten gerne — und freuen uns über jede Kampagne.',
            },
          ]).map((card, i) => (
            <Reveal key={card.title} delay={i * 80}>
              <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: '22px', padding: '28px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ height: '3px', background: card.bar, borderRadius: '22px 22px 0 0', position: 'absolute', top: 0, left: 0, right: 0 }} />
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--violet-xpale)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                  {card.icon}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 700, color: C.ink, marginBottom: '8px' }}>{card.title}</div>
                <p style={{ fontSize: '13px', color: C.slate, lineHeight: 1.6, fontWeight: 300 }}>{card.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA SECTION ──────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '60px 64px 100px', textAlign: 'center' }}>
        <Reveal>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--violet-xpale)', border: '1px solid rgba(107,79,187,0.15)', borderRadius: '100px', padding: '6px 16px', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.primary, marginBottom: '20px' }}>
            🇨🇭 Gemacht für die Schweiz
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,3.2vw,44px)', fontWeight: 800, letterSpacing: '-.025em', color: C.ink, marginBottom: '12px', lineHeight: 1.1 }}>
            Bereit für deine<br />
            <em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary }}>erste Kampagne?</em>
          </h2>
          <p style={{ fontSize: '16px', color: C.slate, fontWeight: 300, marginBottom: '36px', fontFamily: 'var(--font-sans)' }}>
            In wenigen Schritten gebucht. Keine Agentur. Kein Fachjargon.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/campaign?type=politik"
              style={{ background: C.primary, color: 'white', padding: '16px 36px', borderRadius: '100px', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', boxShadow: '0 6px 24px rgba(107,79,187,.3)', transition: 'all .25s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.primaryLight; (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = C.primary; (e.currentTarget as HTMLAnchorElement).style.transform = 'none'; }}
            >
              Politische Kampagne →
            </a>
            <a
              href="/campaign?type=b2b"
              style={{ color: C.primary, background: 'none', padding: '16px 28px', borderRadius: '100px', border: '1.5px solid rgba(107,79,187,.2)', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'all .25s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = C.primary; (e.currentTarget as HTMLAnchorElement).style.background = 'var(--violet-xpale)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(107,79,187,.2)'; (e.currentTarget as HTMLAnchorElement).style.background = 'none'; }}
            >
              B2B Kampagne →
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(107,79,187,.08)', padding: '36px clamp(20px,5vw,64px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 800, color: C.primary, letterSpacing: '.02em' }}>VIO</div>
          <div style={{ fontSize: '10.5px', letterSpacing: '.14em', textTransform: 'uppercase', color: '#B8A9E8', marginTop: '5px', fontFamily: 'var(--font-display)', fontWeight: 600 }}>Reichweite für alle</div>
        </div>
        <div style={{ fontSize: '12px', color: '#C8C4D8' }}>© {new Date().getFullYear()} VIO · Schweiz · Alle Rechte vorbehalten</div>
      </footer>

      {/* ── PAGE STYLES ──────────────────────────────────────────────────── */}
      <style>{`
        /* Target selector list */
        .target-list { display: flex; flex-direction: column; gap: 10px; max-width: 460px; }
        .ti {
          display: flex; align-items: center; gap: 16px;
          border-radius: 16px; padding: 16px 20px;
          cursor: pointer; text-decoration: none; color: inherit;
          transition: all .22s; position: relative; overflow: hidden;
          border: 1.5px solid rgba(107,79,187,0.10); background: white;
        }
        .ti::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0;
          width: 3px; background: #6B4FBB; border-radius: 16px 0 0 16px;
          opacity: 0; transition: opacity .22s;
        }
        .ti.primary::before { opacity: 1; }
        .ti.primary {
          background: linear-gradient(90deg, #F5F2FF 0%, white 60%);
          border-left: 3px solid #6B4FBB;
          border-top: 1px solid rgba(107,79,187,0.10);
          border-right: 1px solid rgba(107,79,187,0.10);
          border-bottom: 1px solid rgba(107,79,187,0.10);
          box-shadow: 0 4px 20px rgba(107,79,187,0.09);
        }
        .ti.sec {
          background: rgba(253,252,255,0.5);
          border: 1px solid rgba(107,79,187,0.07);
          padding: 13px 20px;
        }
        .ti:hover { transform: translateX(5px); border-left-color: #6B4FBB; }
        .ti:hover::before { opacity: 1; }
        .ti:hover .ti-arr { color: #6B4FBB; transform: translateX(3px); }
        .ti-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: #EDE8FF; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .ti-icon-sec { background: rgba(107,79,187,0.05); }
        .ti-body { flex: 1; }
        .ti-title {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 700; color: #2D1F52;
          margin-bottom: 2px; letter-spacing: -.01em;
        }
        .ti-title-sec { font-size: 14px; color: #7A7596; }
        .ti-sub { font-size: 12px; color: #7A7596; font-weight: 300; }
        .ti-arr { font-size: 16px; color: #B8A9E8; transition: all .22s; flex-shrink: 0; }

        /* Responsive */
        @media (max-width: 900px) {
          #hero-grid  { grid-template-columns: 1fr !important; min-height: auto !important; padding: 80px 24px 40px !important; }
          #how-grid   { grid-template-columns: repeat(2,1fr) !important; }
          #usp-grid   { grid-template-columns: 1fr !important; }
          #dash-grid  { grid-template-columns: 1fr !important; }
          #why-grid   { grid-template-columns: 1fr !important; }
          #strip-inner { flex-direction: column; gap: 16px; }
          .target-list { max-width: 100%; }
        }
        @media (max-width: 600px) {
          #how-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

    </main>
  );
}
