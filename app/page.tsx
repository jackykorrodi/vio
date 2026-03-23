'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Region, ALL_REGIONS } from '@/lib/regions';
import SwissAquarelle from '@/components/SwissAquarelle';

const C = {
  primary:     '#6B4FBB',
  primaryLight:'#8B6FD4',
  primaryPale: '#EDE8FF',
  primaryXpale:'#F5F2FF',
  gold:        '#D4A843',
  ink:         '#1A1430',
  slate:       '#7A7596',
  muted:       '#7A7596',
  border:      '#EDE8FF',
  bg:          '#FDFCFF',
  white:       '#FFFFFF',
  // legacy aliases kept for existing sections
  pd:          '#8B6FD4',
  pl:          '#EDE8FF',
  taupe:       '#1A1430',
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
          fontFamily: 'var(--font-sans)',
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
          fontFamily: 'var(--font-sans)',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          boxShadow: dark ? '0 4px 16px rgba(0,0,0,.15)' : '0 4px 16px rgba(107,79,187,0.30)',
          transition: 'transform .18s, box-shadow .18s',
          flexShrink: 0,
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = dark
            ? '0 8px 24px rgba(0,0,0,.2)'
            : '0 8px 24px rgba(107,79,187,0.40)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = dark
            ? '0 4px 16px rgba(0,0,0,.15)'
            : '0 4px 16px rgba(107,79,187,0.30)';
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

  // Hero politik state
  const [heroRegions, setHeroRegions] = useState<Region[]>([]);
  const [heroQuery, setHeroQuery] = useState('');
  const [heroDropdownOpen, setHeroDropdownOpen] = useState(false);
  const [heroVotingDate, setHeroVotingDate] = useState('');
  const [heroPolitikType, setHeroPolitikType] = useState<'ja' | 'nein' | 'kandidat' | 'event' | null>(null);

  const heroSearchResults = useMemo(() => {
    const q = heroQuery.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => !heroRegions.some(s => s.name === r.name));
    const schweiz = pool.filter(r => r.type === 'schweiz');
    const kantone = pool.filter(r => r.type === 'kanton');
    const staedte = pool.filter(r => r.type === 'stadt').sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return { schweiz, kantone, staedte };
  }, [heroQuery, heroRegions]);

  const heroTotalStimm = heroRegions.reduce((sum, r) => sum + r.stimm, 0);
  const heroAllFilled = heroRegions.length >= 1 && !!heroVotingDate && !!heroPolitikType;

  const heroDaysUntil = (dateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  };

  const heroTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const addHeroRegion = (r: Region) => {
    if (heroRegions.length >= 10) return;
    setHeroRegions(prev => [...prev, r]);
    setHeroQuery('');
    setHeroDropdownOpen(false);
  };

  const handleHeroPolitikSubmit = () => {
    if (!heroAllFilled) return;
    const days = heroDaysUntil(heroVotingDate);
    const tiers = [
      { rate: 0.14, freq: 3, weeks: 1 },
      { rate: 0.25, freq: 5, weeks: 2 },
      { rate: 0.35, freq: 7, weeks: 4 },
    ].filter(t => t.weeks === 1 || t.weeks * 7 <= days);
    const recommended = tiers[Math.min(1, tiers.length - 1)];
    const total = heroTotalStimm;
    const raw = (Math.round(total * recommended.rate) * recommended.freq / 1000) * 40;
    const budget = Math.max(2500, Math.round(raw / 500) * 500);
    const laufzeit = recommended.weeks;
    const startD = new Date(heroVotingDate + 'T12:00:00');
    startD.setDate(startD.getDate() - laufzeit * 7);
    const today = new Date();
    const actualStart = startD < today ? today : startD;
    const prefill = {
      campaignType: 'politik',
      politikType: heroPolitikType,
      votingDate: heroVotingDate,
      daysUntil: days,
      selectedRegions: heroRegions.map(r => ({ name: r.name, type: r.type, stimm: r.stimm, kanton: r.kanton })),
      totalStimmber: total,
      stimmberechtigte: total,
      politikRegion: heroRegions[0]?.name ?? '',
      politikRegionType: heroRegions[0]?.type ?? 'kanton',
      recommendedBudget: budget,
      recommendedLaufzeit: laufzeit,
      startDate: actualStart.toISOString().split('T')[0],
    };
    sessionStorage.setItem('vio_politik_prefill', JSON.stringify(prefill));
    router.push('/campaign?type=politik');
  };

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

      {/* ── Watercolor background blobs ───────────────────────────────────── */}
      {[
        { color: 'rgba(184,169,232,0.22)', size: 600, x: '15%',  y: '18%',  dur: 26, k: 'blob0' },
        { color: 'rgba(200,223,248,0.20)', size: 520, x: '72%',  y: '12%',  dur: 31, k: 'blob1' },
        { color: 'rgba(245,220,230,0.15)', size: 420, x: '88%',  y: '58%',  dur: 22, k: 'blob2' },
        { color: 'rgba(212,168,67,0.10)',  size: 360, x: '8%',   y: '72%',  dur: 28, k: 'blob3' },
        { color: 'rgba(184,169,232,0.18)', size: 460, x: '48%',  y: '88%',  dur: 24, k: 'blob4' },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'fixed',
          width: `${b.size}px`, height: `${b.size}px`,
          left: b.x, top: b.y,
          transform: 'translate(-50%,-50%)',
          background: `radial-gradient(circle, ${b.color}, transparent 70%)`,
          filter: 'blur(88px)',
          animation: `${b.k} ${b.dur}s ease-in-out alternate infinite`,
          zIndex: 0, pointerEvents: 'none',
        }} />
      ))}

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        backgroundColor: 'rgba(253,252,255,.9)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: `1px solid ${C.border}`,
        height: '64px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px, 5vw, 56px)',
      }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '26px', fontWeight: 800, color: C.primary, letterSpacing: '-.02em',
        }}>
          VIO
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {(['#how', '#whom', '#warum'] as const).map((href, i) => (
            <a
              key={href}
              href={href}
              style={{ fontSize: '14px', color: C.slate, textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 400 }}
              onMouseEnter={e => { e.currentTarget.style.color = C.primary; }}
              onMouseLeave={e => { e.currentTarget.style.color = C.slate; }}
            >
              {['Wie es funktioniert', 'Für wen', 'Warum VIO'][i]}
            </a>
          ))}
          <button
            type="button"
            onClick={() => router.push('/campaign')}
            style={{
              padding: '11px 26px',
              borderRadius: '100px',
              backgroundColor: C.primary,
              color: '#fff',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '13px', fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(107,79,187,0.30)',
              transition: 'background-color .18s',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.primaryLight; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.primary; }}
          >
            Kampagne starten →
          </button>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '88vh',
        backgroundColor: 'var(--off-white)',
        display: 'flex', alignItems: 'center',
        padding: '90px clamp(20px, 5vw, 64px) 80px',
        zIndex: 1,
      }}>
        <SwissAquarelle />

        <div id="hero-grid" style={{
          position: 'relative', zIndex: 2,
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
          gap: 'clamp(32px, 5vw, 72px)',
          maxWidth: '1120px', width: '100%', margin: '0 auto',
          alignItems: 'center',
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'none' : 'translateY(20px)',
          transition: 'opacity .7s ease, transform .7s ease',
        }}>

          {/* ── LEFT: Text ─────────────────────────────────────────────── */}
          <div>
            {/* Eyebrow */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              backgroundColor: C.primaryXpale,
              border: `1px solid rgba(107,79,187,.15)`,
              borderRadius: '100px',
              padding: '6px 18px',
              marginBottom: '28px',
            }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                backgroundColor: C.gold, flexShrink: 0, display: 'inline-block',
              }} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px', fontWeight: 700,
                color: C.primary, letterSpacing: '.08em', textTransform: 'uppercase',
              }}>
                Nur Schweizer Medien
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(38px, 5.5vw, 68px)',
              fontWeight: 800,
              letterSpacing: '-.03em',
              lineHeight: 1.07,
              color: C.ink,
              marginBottom: '20px',
            }}>
              VIO –<br />Sichtbarkeit<br />für alle.
            </h1>

            <p style={{
              fontSize: 'clamp(15px, 1.8vw, 18px)',
              color: C.muted,
              lineHeight: 1.7,
              maxWidth: '420px',
              marginBottom: '36px',
            }}>
              In weniger als 2 Minuten zur fertigen Kampagne — einfach, fair, persönlich.
            </p>

            {/* Trust micro-badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 20px' }}>
              {['🔒 Keine Kreditkarte', '⚡ Bereit in 2 Min.', '✓ Kein Fachjargon'].map(t => (
                <span key={t} style={{ fontSize: '13px', color: C.muted, fontWeight: 400 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Campaign type selector + accordion ──────────────── */}
          <div style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity .7s ease .25s' }}>
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
                          fontFamily: 'var(--font-sans)',
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
                          fontFamily: 'var(--font-sans)',
                          fontSize: '15px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 16px rgba(107,79,187,0.30)',
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

                {/* Politik: inline form */}
                {heroType === 'politik' && (
                  <div>
                    {/* Region picker */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Region / Wahlkreis</div>
                      {heroRegions.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '6px' }}>
                          {heroRegions.map(r => (
                            <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: C.pl, border: `1px solid ${C.primary}`, color: C.pd, borderRadius: '100px', padding: '4px 8px 4px 12px', fontSize: '12px', fontWeight: 600 }}>
                              {r.name}
                              <button type="button" onClick={() => setHeroRegions(prev => prev.filter(x => x.name !== r.name))} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '14px', padding: '0 3px', lineHeight: 1 }}>×</button>
                            </span>
                          ))}
                        </div>
                      )}
                      {heroRegions.length > 0 && (
                        <div style={{ fontSize: '12px', color: C.muted, marginBottom: '6px' }}>
                          Total: <strong style={{ color: C.taupe }}>{heroTotalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
                        </div>
                      )}
                      {heroRegions.length < 10 && (
                        <div>
                          <input
                            type="text"
                            value={heroQuery}
                            placeholder="Kanton oder Gemeinde suchen..."
                            onChange={e => { setHeroQuery(e.target.value); setHeroDropdownOpen(true); }}
                            onFocus={() => setHeroDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setHeroDropdownOpen(false), 200)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '14px', fontFamily: 'var(--font-sans)', color: C.taupe, backgroundColor: C.bg, outline: 'none' }}
                          />
                          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 4px 12px rgba(44,44,62,.08)', maxHeight: '320px', overflowY: 'scroll', WebkitOverflowScrolling: 'touch', marginTop: '4px', width: '100%', display: heroDropdownOpen ? 'block' : 'none' }}>
                            {heroSearchResults.schweiz.length > 0 && (
                              <div>
                                <div style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Schweiz</div>
                                {heroSearchResults.schweiz.map(r => (
                                  <div key={r.name} onMouseDown={() => addHeroRegion(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.taupe }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                    <span>{r.name}</span><span style={{ fontSize: '11px', color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {heroSearchResults.kantone.length > 0 && (
                              <div>
                                <div style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Kantone</div>
                                {heroSearchResults.kantone.map(r => (
                                  <div key={r.name} onMouseDown={() => addHeroRegion(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.taupe }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                    <span>{r.name}</span><span style={{ fontSize: '11px', color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {heroSearchResults.staedte.length > 0 && (
                              <div>
                                <div style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Städte & Gemeinden</div>
                                {heroSearchResults.staedte.map(r => (
                                  <div key={r.name} onMouseDown={() => addHeroRegion(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.taupe }} onMouseEnter={e => { e.currentTarget.style.background = C.bg; }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                                    <span>{r.name}</span><span style={{ fontSize: '11px', color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voting date */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Abstimmungs- oder Wahltag</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="date"
                          min={heroTodayStr()}
                          value={heroVotingDate}
                          onChange={e => setHeroVotingDate(e.target.value)}
                          style={{ padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '14px', fontFamily: 'var(--font-sans)', color: C.taupe, backgroundColor: C.white, outline: 'none', cursor: 'pointer' }}
                        />
                        {heroVotingDate && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: '100px', backgroundColor: '#F9EDEA', color: '#B3502A', fontSize: '12px', fontWeight: 600 }}>
                            Noch {heroDaysUntil(heroVotingDate)} Tage
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Kampagnentyp */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '8px' }}>Kampagnentyp</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {([
                          { value: 'ja' as const, ico: '✅', name: 'JA-Kampagne' },
                          { value: 'nein' as const, ico: '❌', name: 'NEIN-Kampagne' },
                          { value: 'kandidat' as const, ico: '🙋', name: 'Kandidatenwahl' },
                          { value: 'event' as const, ico: '📣', name: 'Event & Mobilisierung' },
                        ]).map(opt => {
                          const active = heroPolitikType === opt.value;
                          return (
                            <div key={opt.value} onClick={() => setHeroPolitikType(opt.value)} style={{ padding: '10px 12px', borderRadius: '10px', border: `2px solid ${active ? C.primary : C.border}`, background: active ? C.pl : C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .2s' }}>
                              <span style={{ fontSize: '16px' }}>{opt.ico}</span>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: C.taupe }}>{opt.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit */}
                    {heroAllFilled && (
                      <button
                        type="button"
                        onClick={handleHeroPolitikSubmit}
                        style={{ width: '100%', padding: '14px 24px', borderRadius: '100px', background: C.primary, color: '#fff', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 16px rgba(107,79,187,0.30)', transition: 'all .18s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
                      >
                        Kampagne starten →
                      </button>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>{/* end grid */}
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', zIndex: 1,
        borderTop: '1px solid rgba(107,79,187,0.08)',
        borderBottom: '1px solid rgba(107,79,187,0.08)',
        backgroundColor: 'rgba(237,232,255,0.18)',
        padding: '14px clamp(20px, 5vw, 56px)',
      }}>
        <div style={{
          maxWidth: '1120px', margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 'clamp(16px, 4vw, 44px)', flexWrap: 'wrap',
        }}>
          {[
            { label: '500+ KMU', sub: 'Schweizer Unternehmen' },
            { label: 'Politik', sub: 'Parteien & Gemeinden' },
            { label: 'Vereine', sub: 'NGOs & Non-Profits' },
            { label: 'DOOH-Netzwerk', sub: 'Ganze Schweiz' },
            { label: 'Ab CHF 2\'500', sub: 'Kein Mindestvertrag' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {i > 0 && <span style={{ color: 'rgba(107,79,187,0.18)', fontSize: '18px', fontWeight: 300 }}>|</span>}
              <div>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '13px', fontWeight: 700,
                  color: C.ink,
                }}>
                  {item.label}
                </span>
                <span style={{ fontSize: '12px', color: C.muted, marginLeft: '5px' }}>
                  {item.sub}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section id="how" style={{ position: 'relative', zIndex: 1, padding: '100px clamp(20px, 5vw, 56px)' }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px', fontWeight: 700, letterSpacing: '.15em',
              color: C.primary, textTransform: 'uppercase', marginBottom: '14px',
            }}>
              So einfach geht&apos;s
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 46px)',
              fontWeight: 800, letterSpacing: '-.025em', color: C.ink,
            }}>
              Drei Schritte zur Kampagne
            </h2>
          </Reveal>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {[
              {
                n: '01', ico: '🌐', pastel: 'rgba(107,79,187,0.08)',
                title: 'URL eingeben',
                desc: 'Gib deine Website-Adresse ein. Wir schauen uns an, was du anbietest und für wen.',
              },
              {
                n: '02', ico: '🔍', pastel: 'rgba(212,168,67,0.10)',
                title: 'Wir finden deine Zielgruppe',
                desc: 'Wir analysieren deinen Auftritt und leiten automatisch ab, wen du erreichen möchtest — nach Region, Branche und Grösse.',
              },
              {
                n: '03', ico: '📺', pastel: 'rgba(200,223,248,0.25)',
                title: 'Kampagne live',
                desc: 'Budget festlegen, Werbemittel hochladen, fertig. Deine Kampagne läuft auf Schweizer DOOH-Screens und im Web.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 100}>
                <div
                  style={{
                    backgroundColor: C.white,
                    borderRadius: '24px',
                    border: `1px solid rgba(107,79,187,0.09)`,
                    padding: '32px 28px',
                    height: '100%',
                    boxShadow: '0 2px 8px rgba(26,20,48,.05)',
                    transition: 'transform .22s, box-shadow .22s, border-top-color .22s',
                    cursor: 'default',
                    borderTop: '3px solid transparent',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-5px)';
                    el.style.boxShadow = '0 12px 32px rgba(107,79,187,0.13)';
                    el.style.borderTopColor = C.primary;
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'none';
                    el.style.boxShadow = '0 2px 8px rgba(26,20,48,.05)';
                    el.style.borderTopColor = 'transparent';
                  }}
                >
                  {/* Step icon box */}
                  <div style={{
                    width: '50px', height: '50px', borderRadius: '16px',
                    backgroundColor: s.pastel,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', marginBottom: '20px',
                  }}>
                    {s.ico}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '11px', fontWeight: 700, letterSpacing: '.12em',
                    color: C.primary, marginBottom: '10px',
                  }}>
                    {s.n}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '21px', fontWeight: 700, color: C.ink, marginBottom: '10px', letterSpacing: '-.01em',
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
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────────────────── */}
      <Reveal>
        <div style={{
          position: 'relative', zIndex: 1,
          padding: '72px clamp(20px, 5vw, 56px)',
          backgroundColor: C.primaryXpale,
          borderTop: '1px solid rgba(107,79,187,0.08)',
          borderBottom: '1px solid rgba(107,79,187,0.08)',
        }}>
          <div id="stats-grid" style={{
            maxWidth: '1040px', margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '32px',
            textAlign: 'center',
          }}>
            {[
              { value: '< 2 Min', label: 'Buchungszeit' },
              { value: '26', label: 'Kantone abgedeckt' },
              { value: "CHF 2'500", label: 'Mindestbudget' },
              { value: '70%', label: 'Budget für DOOH' },
            ].map(stat => (
              <div key={stat.label}>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(32px, 4vw, 50px)',
                  fontWeight: 800,
                  color: C.primary,
                  letterSpacing: '-.03em',
                  lineHeight: 1,
                  marginBottom: '8px',
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '13px', color: C.slate, fontWeight: 500 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <style>{`
        @media (max-width: 860px) {
          #hero-grid { grid-template-columns: 1fr !important; }
          #stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          #stats-grid { gap: 20px !important; }
        }
      `}</style>

      {/* ── AUDIENCE (dark) ──────────────────────────────────────────────── */}
      <section id="whom" style={{
        background: 'linear-gradient(145deg, #1E1530, #16112A)',
        padding: '100px clamp(20px, 5vw, 56px)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px', fontWeight: 700, letterSpacing: '.15em',
              color: 'rgba(184,169,232,.7)', textTransform: 'uppercase', marginBottom: '14px',
            }}>
              Perfekt geeignet für
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 46px)',
              fontWeight: 800, letterSpacing: '-.025em', color: '#fff',
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
                topBar: C.primary,
              },
              {
                ico: '🗳️',
                title: 'Politik & Gemeinden',
                desc: 'Politische Parteien, Kandidierende und Gemeinden, die ihre Botschaft gezielt in bestimmten Regionen platzieren wollen.',
                topBar: C.gold,
              },
              {
                ico: '🤝',
                title: 'Vereine & NGOs',
                desc: 'Non-Profit-Organisationen und Vereine, die für Events, Mitglieder oder Spenden werben — mit maximalem Wirkungsgrad.',
                topBar: '#C8DFF8',
              },
            ].map((w, i) => (
              <Reveal key={w.title} delay={i * 100}>
                <div
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.96)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    padding: '0',
                    height: '100%',
                    transition: 'transform .22s, box-shadow .22s',
                    cursor: 'default',
                    boxShadow: '0 4px 20px rgba(0,0,0,.18)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'translateY(-5px)';
                    el.style.boxShadow = '0 16px 40px rgba(0,0,0,.28)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement;
                    el.style.transform = 'none';
                    el.style.boxShadow = '0 4px 20px rgba(0,0,0,.18)';
                  }}
                >
                  {/* Colored top bar */}
                  <div style={{ height: '3px', backgroundColor: w.topBar }} />
                  <div style={{ padding: '28px 26px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '16px' }}>{w.ico}</div>
                    <h3 style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '21px', fontWeight: 700, color: C.ink, marginBottom: '10px', letterSpacing: '-.01em',
                    }}>
                      {w.title}
                    </h3>
                    <p style={{ fontSize: '14px', color: C.slate, lineHeight: 1.65 }}>
                      {w.desc}
                    </p>
                  </div>
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
              fontFamily: 'var(--font-display)',
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
                fontFamily: 'var(--font-display)',
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
                    fontFamily: 'var(--font-display)',
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
        position: 'relative', zIndex: 1,
        padding: '100px clamp(20px, 5vw, 56px)',
        textAlign: 'center',
        backgroundColor: 'var(--off-white)',
        borderTop: '1px solid rgba(107,79,187,0.08)',
      }}>
        <Reveal style={{ maxWidth: '620px', margin: '0 auto' }}>
          {/* Gold pill badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            backgroundColor: 'var(--gold-pale)',
            border: '1px solid rgba(212,168,67,0.30)',
            borderRadius: '100px',
            padding: '6px 18px',
            marginBottom: '28px',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              backgroundColor: C.gold, display: 'inline-block', flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '11px', fontWeight: 700,
              color: C.gold, letterSpacing: '.08em', textTransform: 'uppercase',
            }}>
              Jetzt starten
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(30px, 5vw, 52px)',
            fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.1,
            color: C.ink, marginBottom: '18px',
          }}>
            Bereit, loszulegen?
          </h2>
          <p style={{
            fontSize: '16px', color: C.muted,
            lineHeight: 1.65, marginBottom: '40px',
          }}>
            Gib deine Website-URL ein und entdecke, wie viele Menschen du mit deinem Budget erreichen kannst.
          </p>

          {/* 2 Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => router.push('/campaign')}
              style={{
                padding: '15px 36px',
                borderRadius: '100px',
                backgroundColor: C.primary,
                color: '#fff',
                border: 'none',
                fontFamily: 'var(--font-display)',
                fontSize: '15px', fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(107,79,187,0.30)',
                transition: 'background-color .18s, transform .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.primaryLight; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.transform = 'none'; }}
            >
              Kampagne starten →
            </button>
            <a
              href="#how"
              style={{
                padding: '15px 36px',
                borderRadius: '100px',
                backgroundColor: 'transparent',
                color: C.primary,
                border: 'none',
                fontFamily: 'var(--font-display)',
                fontSize: '15px', fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'opacity .18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              Mehr erfahren
            </a>
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
          fontFamily: 'var(--font-display)',
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
