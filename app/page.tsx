'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Region, ALL_REGIONS } from '@/lib/regions';
import SwissAquarelle from '@/components/SwissAquarelle';

const C = {
  primary:      '#6B4FBB',
  primaryLight: '#8B6FD4',
  primaryPale:  '#EDE8FF',
  primaryXpale: '#F5F2FF',
  gold:         '#D4A843',
  ink:          '#1A1430',
  slate:        '#7A7596',
  muted:        '#7A7596',
  border:       '#EDE8FF',
  bg:           '#FDFCFF',
  white:        '#FFFFFF',
  // legacy aliases
  pd:    '#8B6FD4',
  pl:    '#EDE8FF',
  taupe: '#1A1430',
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

  // Hero campaign-type selector state
  const [heroType, setHeroType]   = useState<'b2c' | 'b2b' | 'politik' | null>(null);
  const [heroUrl,  setHeroUrl]    = useState('');

  // Politik sub-form state
  const [heroRegions,      setHeroRegions]      = useState<Region[]>([]);
  const [heroQuery,        setHeroQuery]         = useState('');
  const [heroDropdownOpen, setHeroDropdownOpen]  = useState(false);
  const [heroVotingDate,   setHeroVotingDate]    = useState('');
  const [heroPolitikType,  setHeroPolitikType]   = useState<'ja' | 'nein' | 'kandidat' | 'event' | null>(null);

  const heroSearchResults = useMemo(() => {
    const q    = heroQuery.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => !heroRegions.some(s => s.name === r.name));
    return {
      schweiz: pool.filter(r => r.type === 'schweiz'),
      kantone: pool.filter(r => r.type === 'kanton'),
      staedte: pool.filter(r => r.type === 'stadt').sort((a, b) => a.name.localeCompare(b.name, 'de')),
    };
  }, [heroQuery, heroRegions]);

  const heroTotalStimm = heroRegions.reduce((sum, r) => sum + r.stimm, 0);
  const heroAllFilled  = heroRegions.length >= 1 && !!heroVotingDate && !!heroPolitikType;

  const heroDaysUntil = (dateStr: string) => {
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.max(0, Math.round((target.getTime() - today.getTime()) / 86400000));
  };
  const heroTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
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
    const total  = heroTotalStimm;
    const raw    = (Math.round(total * recommended.rate) * recommended.freq / 1000) * 40;
    const budget = Math.max(2500, Math.round(raw / 500) * 500);
    const laufzeit = recommended.weeks;
    const startD   = new Date(heroVotingDate + 'T12:00:00');
    startD.setDate(startD.getDate() - laufzeit * 7);
    const today       = new Date();
    const actualStart = startD < today ? today : startD;
    const prefill = {
      campaignType:        'politik',
      politikType:         heroPolitikType,
      votingDate:          heroVotingDate,
      daysUntil:           days,
      selectedRegions:     heroRegions.map(r => ({ name: r.name, type: r.type, stimm: r.stimm, kanton: r.kanton })),
      totalStimmber:       total,
      stimmberechtigte:    total,
      politikRegion:       heroRegions[0]?.name ?? '',
      politikRegionType:   heroRegions[0]?.type ?? 'kanton',
      recommendedBudget:   budget,
      recommendedLaufzeit: laufzeit,
      startDate:           actualStart.toISOString().split('T')[0],
    };
    sessionStorage.setItem('vio_politik_prefill', JSON.stringify(prefill));
    router.push('/campaign?type=politik');
  };

  const handleHeroStart = () => {
    if (!heroType || heroType === 'politik') return;
    const cleanUrl = heroUrl.trim().replace(/^https?:\/\//, '').replace(/^www\./, '');
    const params   = new URLSearchParams({ type: heroType });
    if (cleanUrl) params.set('url', cleanUrl);
    router.push('/campaign?' + params.toString());
  };

  return (
    <main style={{ backgroundColor: 'var(--off-white)', overflowX: 'hidden' }}>

      {/* ── Watercolor background ────────────────────────────────────────── */}
      <div className="wc-layer">
        <div className="wc-blob" style={{ width: 700, height: 700, background: 'radial-gradient(circle,rgba(184,169,232,.28),rgba(184,169,232,.05) 65%,transparent)', top: -200, left: -130, animationDuration: '27s' }} />
        <div className="wc-blob" style={{ width: 480, height: 480, background: 'radial-gradient(circle,rgba(200,223,248,.3),rgba(200,223,248,.05) 65%,transparent)', top: 280, right: -110, animationDuration: '20s', animationDelay: '-9s' }} />
        <div className="wc-blob" style={{ width: 380, height: 380, background: 'radial-gradient(circle,rgba(242,196,206,.22),transparent 65%)', bottom: 180, left: '12%', animationDuration: '25s', animationDelay: '-6s' }} />
        <div className="wc-blob" style={{ width: 300, height: 300, background: 'radial-gradient(circle,rgba(212,168,67,.16),transparent 65%)', bottom: 0, right: '22%', animationDuration: '31s', animationDelay: '-14s' }} />
      </div>
      <div className="grain" />

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '22px clamp(20px,5vw,64px)',
        position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        backgroundColor: 'rgba(253,252,255,.8)',
        borderBottom: '1px solid rgba(107,79,187,.08)',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800, color: C.primary, letterSpacing: '.02em' }}>VIO</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '38px' }}>
          {(['#how', '#whom', '#preise'] as const).map((href, i) => (
            <a key={href} href={href} style={{ textDecoration: 'none', color: C.slate, fontSize: '14px', fontWeight: 400, letterSpacing: '.02em', transition: 'color .2s', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.primary; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = C.slate; }}
            >
              {['Wie es funktioniert', 'Für wen', 'Preise'][i]}
            </a>
          ))}
          <button type="button" onClick={() => router.push('/campaign')} style={{ background: C.primary, color: '#fff', padding: '11px 26px', borderRadius: '100px', fontSize: '13px', fontWeight: 600, letterSpacing: '.02em', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-display)', boxShadow: '0 4px 16px rgba(107,79,187,.22)', transition: 'all .25s' }}
            onMouseEnter={e => { e.currentTarget.style.background = C.primaryLight; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(107,79,187,.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(107,79,187,.22)'; }}
          >
            Kampagne starten
          </button>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', backgroundColor: 'var(--off-white)' }}>
        <div id="hero-grid" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center',
          gap: '60px', padding: '80px clamp(20px,5vw,64px) 72px',
          maxWidth: '1380px', margin: '0 auto', minHeight: '90vh', position: 'relative',
        }}>
          <SwissAquarelle />

          {/* hero-left */}
          <div style={{
            maxWidth: '560px', position: 'relative', zIndex: 2,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'none' : 'translateY(20px)',
            transition: 'opacity .7s ease, transform .7s ease',
          }}>
            {/* Eyebrow */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: C.primaryXpale, border: '1px solid rgba(107,79,187,.15)', borderRadius: '100px', padding: '7px 18px', fontSize: '11px', color: C.primary, letterSpacing: '.1em', textTransform: 'uppercase', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '28px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.gold, flexShrink: 0, display: 'inline-block' }} />
              Schweizer Werbeplattform
            </div>

            {/* H1 */}
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(48px,5vw,78px)', fontWeight: 800, lineHeight: 1.06, color: C.ink, letterSpacing: '-.02em', marginBottom: '26px' }}>
              Deine Botschaft.<br />
              <em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary, letterSpacing: 0 }}>Überall.</em>
            </h1>

            {/* Sub */}
            <p style={{ fontSize: '17px', lineHeight: 1.7, color: C.slate, maxWidth: '430px', fontWeight: 300, marginBottom: '44px', fontFamily: 'var(--font-sans)' }}>
              In unter 2 Minuten zur fertigen Kampagne – ohne Agentur, ohne Fachjargon. DOOH-Screens und Online-Display, alles in einer Buchung. Einfach, fair, Schweiz.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
              <button type="button" onClick={() => router.push('/campaign')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: C.primary, color: '#fff', padding: '16px 34px', borderRadius: '100px', border: 'none', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, letterSpacing: '.01em', cursor: 'pointer', transition: 'all .28s', boxShadow: '0 6px 24px rgba(107,79,187,.3)' }}
                onMouseEnter={e => { e.currentTarget.style.background = C.primaryLight; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(107,79,187,.38)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(107,79,187,.3)'; }}
              >
                Jetzt starten →
              </button>
              <a href="#how" style={{ color: C.primary, textDecoration: 'none', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'gap .22s', fontFamily: 'var(--font-sans)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.gap = '10px'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.gap = '6px'; }}
              >
                Wie es funktioniert ↓
              </a>
            </div>
          </div>

          {/* hero-right: B2C/B2B/Politik form */}
          <div style={{ position: 'relative', zIndex: 2, opacity: heroVisible ? 1 : 0, transition: 'opacity .7s ease .25s' }}>
            {/* Type cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '0' }}>
              {([
                { value: 'b2c'    as const, ico: '👥', name: 'Privatkunden (B2C)', desc: 'Menschen & Haushalte' },
                { value: 'b2b'    as const, ico: '🏢', name: 'Geschäftskunden (B2B)', desc: 'Firmen & Fachleute' },
                { value: 'politik' as const, ico: '🗳️', name: 'Politische Kampagne', desc: 'Abstimmungen & Wahlen' },
              ] as const).map(opt => (
                <div key={opt.value} onClick={() => setHeroType(opt.value)}
                  style={{ background: heroType === opt.value ? C.pl : C.white, border: `2px solid ${heroType === opt.value ? C.primary : C.border}`, borderRadius: '12px', padding: '16px 14px', cursor: 'pointer', transition: 'all .2s', textAlign: 'left' }}
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
            <div style={{ maxHeight: heroType ? '1000px' : '0px', overflow: 'hidden', transition: 'max-height 300ms ease' }}>
              <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', marginTop: '10px', textAlign: 'left' }}>

                {/* B2C / B2B */}
                {heroType !== 'politik' && heroType !== null && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase', marginBottom: '10px' }}>Deine Website-URL</div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input type="url" value={heroUrl} placeholder="https://deine-website.ch"
                        onChange={e => setHeroUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleHeroStart()}
                        style={{ flex: 1, minWidth: 0, padding: '12px 16px', borderRadius: '100px', border: `1.5px solid ${C.border}`, fontSize: '15px', fontFamily: 'var(--font-sans)', color: C.taupe, backgroundColor: C.bg, outline: 'none' }}
                      />
                      <button type="button" onClick={handleHeroStart}
                        style={{ padding: '12px 24px', borderRadius: '100px', backgroundColor: C.primary, color: '#fff', border: 'none', fontFamily: 'var(--font-sans)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(107,79,187,.30)', transition: 'transform .18s, background-color .18s', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = C.primary; e.currentTarget.style.transform = 'none'; }}
                      >Kampagne starten →</button>
                    </div>
                  </div>
                )}

                {/* Politik */}
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
                          <input type="text" value={heroQuery} placeholder="Kanton oder Gemeinde suchen..."
                            onChange={e => { setHeroQuery(e.target.value); setHeroDropdownOpen(true); }}
                            onFocus={() => setHeroDropdownOpen(true)}
                            onBlur={() => setTimeout(() => setHeroDropdownOpen(false), 200)}
                            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '8px', border: `1.5px solid ${C.border}`, fontSize: '14px', fontFamily: 'var(--font-sans)', color: C.taupe, backgroundColor: C.bg, outline: 'none' }}
                          />
                          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '10px', boxShadow: '0 4px 12px rgba(44,44,62,.08)', maxHeight: '320px', overflowY: 'scroll', WebkitOverflowScrolling: 'touch' as unknown as undefined, marginTop: '4px', width: '100%', display: heroDropdownOpen ? 'block' : 'none' }}>
                            {heroSearchResults.schweiz.length > 0 && (
                              <div>
                                <div style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Schweiz</div>
                                {heroSearchResults.schweiz.map(r => (
                                  <div key={r.name} onMouseDown={() => addHeroRegion(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.taupe }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.bg; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                  >
                                    <span>{r.name}</span><span style={{ fontSize: '11px', color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {heroSearchResults.kantone.length > 0 && (
                              <div>
                                <div style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Kantone</div>
                                {heroSearchResults.kantone.map(r => (
                                  <div key={r.name} onMouseDown={() => addHeroRegion(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.taupe }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.bg; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                  >
                                    <span>{r.name}</span><span style={{ fontSize: '11px', color: C.muted }}>{r.stimm.toLocaleString('de-CH')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {heroSearchResults.staedte.length > 0 && (
                              <div>
                                <div style={{ padding: '6px 12px 2px', fontSize: '10px', fontWeight: 700, letterSpacing: '.1em', color: C.muted, textTransform: 'uppercase' }}>Städte & Gemeinden</div>
                                {heroSearchResults.staedte.map(r => (
                                  <div key={r.name} onMouseDown={() => addHeroRegion(r)} style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: C.taupe }}
                                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.bg; }}
                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                                  >
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
                        <input type="date" min={heroTodayStr()} value={heroVotingDate}
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
                          { value: 'ja'       as const, ico: '✅', name: 'JA-Kampagne' },
                          { value: 'nein'     as const, ico: '❌', name: 'NEIN-Kampagne' },
                          { value: 'kandidat' as const, ico: '🙋', name: 'Kandidatenwahl' },
                          { value: 'event'    as const, ico: '📣', name: 'Event & Mobilisierung' },
                        ]).map(opt => {
                          const active = heroPolitikType === opt.value;
                          return (
                            <div key={opt.value} onClick={() => setHeroPolitikType(opt.value)}
                              style={{ padding: '10px 12px', borderRadius: '10px', border: `2px solid ${active ? C.primary : C.border}`, background: active ? C.pl : C.bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all .2s' }}
                            >
                              <span style={{ fontSize: '16px' }}>{opt.ico}</span>
                              <span style={{ fontWeight: 600, fontSize: '13px', color: C.taupe }}>{opt.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Submit */}
                    {heroAllFilled && (
                      <button type="button" onClick={handleHeroPolitikSubmit}
                        style={{ width: '100%', padding: '14px 24px', borderRadius: '100px', background: C.primary, color: '#fff', border: 'none', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-sans)', boxShadow: '0 4px 16px rgba(107,79,187,.30)', transition: 'all .18s' }}
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
        </div>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(107,79,187,.08)', borderBottom: '1px solid rgba(107,79,187,.08)', background: 'rgba(237,232,255,.18)', padding: '20px clamp(20px,5vw,64px)', display: 'flex', alignItems: 'center', gap: '52px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', letterSpacing: '.12em', color: '#B8A9E8', fontFamily: 'var(--font-display)', fontWeight: 700, whiteSpace: 'nowrap' }}>Vertrauen bei</span>
        <div style={{ display: 'flex', gap: '36px', flexWrap: 'wrap' }}>
          {['KMUs in der ganzen Schweiz', 'Politische Kampagnen', 'Vereine & NGOs', 'Schweizer DOOH-Netzwerk', "Ab CHF 2'500"].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#3D3557', whiteSpace: 'nowrap' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'linear-gradient(135deg,#8B6FD4,#B8A9E8)', flexShrink: 0 }} />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '96px clamp(20px,5vw,64px)', maxWidth: '1380px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.14em', color: C.gold, fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '14px' }}>So einfach geht&apos;s</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,3.6vw,56px)', fontWeight: 800, lineHeight: 1.1, color: C.ink, marginBottom: '14px', letterSpacing: '-.02em' }}>
            Drei Schritte.<br /><em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary, letterSpacing: 0 }}>Eine Kampagne.</em>
          </h2>
          <p style={{ fontSize: '16px', color: C.slate, lineHeight: 1.65, maxWidth: '500px', fontWeight: 300, marginBottom: '60px', fontFamily: 'var(--font-sans)' }}>
            Kein Fachjargon, keine versteckten Kosten. Du gibst uns dein Anliegen – wir machen daraus eine professionelle Kampagne.
          </p>
        </Reveal>
        <div id="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
          {[
            { n: 'Schritt 01', mark: '◎', bg: '#F5F2FF', title: 'Website eingeben',    desc: 'Wir lesen deine Website und schlagen eine passende Zielgruppe vor. Du passt sie an – wenn nötig.' },
            { n: 'Schritt 02', mark: '◈', bg: '#EEF5FF', title: 'Budget & Reichweite', desc: 'Du siehst sofort, wie viele Menschen du erreichst. Klare Zahlen, fairer All-in-Preis.' },
            { n: 'Schritt 03', mark: '◉', bg: '#FDF0F3', title: 'Kampagne starten',    desc: 'Wir übernehmen die Auslieferung auf Schweizer DOOH-Screens und Display-Netzwerken.' },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 100}>
              <div
                style={{ background: 'white', border: '1.5px solid rgba(107,79,187,.09)', borderRadius: '24px', padding: '40px 34px', transition: 'all .3s', position: 'relative', overflow: 'hidden', borderTop: '3px solid transparent', height: '100%', boxSizing: 'border-box' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(107,79,187,.2)'; el.style.transform = 'translateY(-5px)'; el.style.boxShadow = '0 20px 56px rgba(107,79,187,.09)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(107,79,187,.09)'; el.style.transform = 'none'; el.style.boxShadow = 'none'; }}
              >
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: '#B8A9E8', letterSpacing: '.1em', marginBottom: '22px', fontWeight: 600, textTransform: 'uppercase' }}>{s.n}</div>
                <div style={{ width: '50px', height: '50px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '20px', background: s.bg }}>{s.mark}</div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '10px', lineHeight: 1.25, letterSpacing: '-.01em' }}>{s.title}</h3>
                <p style={{ fontSize: '14px', color: C.slate, lineHeight: 1.65, fontWeight: 300 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── STATS BAND ───────────────────────────────────────────────────── */}
      <Reveal>
        <div style={{ borderTop: '1px solid rgba(107,79,187,.08)', borderBottom: '1px solid rgba(107,79,187,.08)', padding: '64px clamp(20px,5vw,64px)' }}>
          <div id="stats-grid" style={{ maxWidth: '1380px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {[
              { num: '2',      unit: 'min',  desc: 'Von der Idee zur fertigen Kampagne', small: false },
              { num: '26',     unit: '',     desc: 'Schweizer Kantone buchbar',           small: false },
              { num: "2'500",  unit: ' CHF', desc: 'Mindestbudget – kein Mehr',           small: true  },
              { num: '70',     unit: '%',    desc: 'DOOH – sichtbar im öffentlichen Raum', small: false },
            ].map((s, i) => (
              <div key={i} style={{ paddingTop: 0, paddingBottom: 0, paddingLeft: i === 0 ? 0 : 40, paddingRight: 40, borderRight: i < 3 ? '1px solid rgba(107,79,187,.08)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: s.small ? '34px' : '50px', fontWeight: 800, color: C.primary, lineHeight: 1, letterSpacing: s.small ? '-.02em' : '-.03em', marginBottom: '6px' }}>
                  {s.num}<span style={{ fontSize: s.small ? '16px' : '22px', color: '#B8A9E8', fontWeight: 600 }}>{s.unit}</span>
                </div>
                <div style={{ fontSize: '13px', color: C.slate, lineHeight: 1.5, fontWeight: 300 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── AUDIENCE (dark) ──────────────────────────────────────────────── */}
      <div id="whom" style={{ background: 'linear-gradient(145deg,#1E1530 0%,#16112A 100%)', position: 'relative', overflow: 'hidden' }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', width: '500px', height: '500px', background: 'radial-gradient(circle,rgba(107,79,187,.22) 0%,transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', top: -150, right: -80, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: '380px', height: '380px', background: 'radial-gradient(circle,rgba(200,223,248,.1) 0%,transparent 70%)', borderRadius: '50%', filter: 'blur(100px)', bottom: -80, left: '8%', pointerEvents: 'none' }} />

        <div style={{ maxWidth: '1380px', margin: '0 auto', padding: '96px clamp(20px,5vw,64px)', position: 'relative', zIndex: 2 }}>
          <Reveal>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(212,168,67,.85)', fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '14px' }}>Für wen</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px,3.6vw,56px)', fontWeight: 800, lineHeight: 1.1, color: '#fff', marginBottom: '14px', letterSpacing: '-.02em' }}>
              Werbung war nie<br /><em style={{ fontStyle: 'italic', fontWeight: 300, color: '#B8A9E8', letterSpacing: 0 }}>so zugänglich.</em>
            </h2>
            <p style={{ fontSize: '16px', color: 'rgba(255,255,255,.44)', lineHeight: 1.65, maxWidth: '500px', fontWeight: 300, marginBottom: '60px', fontFamily: 'var(--font-sans)' }}>
              VIO ist für alle gebaut, die eine echte Botschaft haben – aber bisher keinen Zugang zu den richtigen Werkzeugen hatten.
            </p>
          </Reveal>
          <div id="audience-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '20px' }}>
            {[
              { ico: '🏪', title: 'KMU-Inhaber',    desc: 'Keine Zeit für Agenturgespräche. Deine Kunden sind draussen – erreiche sie schnell, zum richtigen Preis.',                           bar: 'linear-gradient(90deg,#6B4FBB,#B8A9E8)', iconBg: '#EDE8FF' },
              { ico: '🗳️', title: 'Politikerinnen', desc: 'Deine Botschaft, deine Region. VIO bringt dein Anliegen zu den richtigen Menschen.',                                                 bar: 'linear-gradient(90deg,#D4A843,rgba(212,168,67,.3))', iconBg: '#FDF3DC' },
              { ico: '🤝', title: 'Vereine & NGOs', desc: 'Kleines Budget, grosse Sache. Beweise, dass man auch ohne Grosskonzern-Mittel etwas bewegen kann.',                                   bar: 'linear-gradient(90deg,#C8DFF8,#8B6FD4)', iconBg: '#EEF5FF' },
            ].map((w, i) => (
              <Reveal key={w.title} delay={i * 100}>
                <div
                  style={{ background: 'rgba(255,255,255,.96)', borderRadius: '22px', padding: '36px 30px', transition: 'all .32s', boxShadow: '0 8px 32px rgba(0,0,0,.2)', cursor: 'default', height: '100%', boxSizing: 'border-box' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-6px)'; el.style.boxShadow = '0 24px 60px rgba(0,0,0,.28)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = '0 8px 32px rgba(0,0,0,.2)'; }}
                >
                  <div style={{ height: '3px', borderRadius: '100px', background: w.bar, marginBottom: '26px' }} />
                  <div style={{ width: '52px', height: '52px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '18px', fontSize: '24px', background: w.iconBg }}>{w.ico}</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, color: C.ink, marginBottom: '10px', lineHeight: 1.3, letterSpacing: '-.01em' }}>{w.title}</h3>
                  <p style={{ fontSize: '14px', color: C.slate, lineHeight: 1.68, fontWeight: 300 }}>{w.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section id="preise" style={{ padding: '112px clamp(20px,5vw,64px)', textAlign: 'center', maxWidth: '820px', margin: '0 auto' }}>
        <Reveal>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#FDF3DC', border: '1px solid rgba(212,168,67,.28)', borderRadius: '100px', padding: '7px 18px', fontSize: '11px', color: '#9B7120', fontFamily: 'var(--font-display)', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '32px' }}>
            🇨🇭 Gemacht für die Schweiz
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px,4vw,60px)', fontWeight: 800, lineHeight: 1.1, color: C.ink, letterSpacing: '-.02em', marginBottom: '18px' }}>
            Bereit für deine<br /><em style={{ fontStyle: 'italic', fontWeight: 300, color: C.primary, letterSpacing: 0 }}>erste Kampagne?</em>
          </h2>
          <p style={{ fontSize: '16px', color: C.slate, lineHeight: 1.65, fontWeight: 300, marginBottom: '44px', fontFamily: 'var(--font-sans)' }}>
            In weniger als 2 Minuten bist du live. Kein Risiko, kein Fachwissen nötig.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={() => router.push('/campaign')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: C.primary, color: '#fff', padding: '16px 34px', borderRadius: '100px', border: 'none', fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 6px 24px rgba(107,79,187,.3)', transition: 'all .28s' }}
              onMouseEnter={e => { e.currentTarget.style.background = C.primaryLight; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(107,79,187,.38)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(107,79,187,.3)'; }}
            >
              Kampagne starten →
            </button>
            <a href="mailto:hello@vio.ch"
              style={{ color: C.primary, textDecoration: 'none', fontSize: '14px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'gap .22s', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.gap = '10px'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.gap = '6px'; }}
            >
              Beratungsgespräch buchen ↗
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

      <style>{`
        @media (max-width: 860px) {
          #hero-grid     { grid-template-columns: 1fr !important; min-height: auto !important; }
          #steps-grid    { grid-template-columns: 1fr !important; }
          #audience-grid { grid-template-columns: 1fr !important; }
          #stats-grid    { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 480px) {
          #stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

    </main>
  );
}
