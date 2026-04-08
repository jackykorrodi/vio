'use client';

import { useState } from 'react';
import Image from 'next/image';
import { BriefingData } from '@/lib/types';
import { computeStartDateISO } from '@/lib/vio-paketlogik';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import doohScreensRaw from '@/lib/dooh-screens.json';

// ─── Types ────────────────────────────────────────────────────────────────────
type DoohEntry = {
  type: string; name?: string; kanton: string;
  screens: number; screens_politik: number; standorte: number; reach: number;
};
const DOOH_DATA = doohScreensRaw as DoohEntry[];

type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz';
const PKG_ORDER: PkgKey[] = ['sichtbar', 'praesenz', 'dominanz'];

const PKG_BADGE: Record<PkgKey, { bg: string; color: string; icon: string; fallback: string }> = {
  sichtbar: { bg: '#FAEEDA', color: '#633806', icon: '⚠', fallback: 'Letzter Impuls vor dem Unterlagen-Versand.' },
  praesenz: { bg: '#EAF3DE', color: '#27500A', icon: '✓', fallback: 'Optimal — präsent über die Meinungsbildungsphase.' },
  dominanz: { bg: '#EEEDFE', color: '#3C3489', icon: '★', fallback: 'Max. Wirkung über den gesamten Abstimmungszeitraum.' },
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function fmtShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]}`;
}
function fmtLong(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}
function diffWeeks(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime();
  return Math.max(1, Math.round(ms / (7 * 24 * 3600 * 1000)));
}
function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
  stepNumber?: number;
}

// ─── Channel card — next/image with priority + gradient overlay ───────────────
function ChannelCard({
  imgSrc, overlayGradient, icon,
  label, headline, sub, bullets,
}: {
  imgSrc: string;
  overlayGradient: string;
  icon: React.ReactNode;
  label: string;
  headline: string;
  sub: string;
  bullets: string[];
}) {
  return (
    <div style={{
      position: 'relative',
      borderRadius: '14px',
      overflow: 'hidden',
      minHeight: '260px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
    }}>
      {/* Background image — fill + priority (no lazy load) */}
      <Image
        src={imgSrc}
        alt=""
        fill
        priority
        style={{ objectFit: 'cover' }}
        sizes="(max-width: 900px) 100vw, 600px"
      />

      {/* Gradient overlay — sits above image */}
      <div style={{
        position: 'absolute', inset: 0,
        background: overlayGradient,
        zIndex: 1,
      }} />

      {/* Content — above overlay */}
      <div style={{ position: 'relative', zIndex: 2, padding: '22px 20px 20px' }}>
        {/* Frosted icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: 'rgba(255,255,255,0.15)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          {icon}
        </div>

        {/* Label */}
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)',
          fontFamily: 'var(--font-display)', marginBottom: 6,
        }}>
          {label}
        </div>

        {/* Headline */}
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800,
          color: 'white', lineHeight: 1.15, marginBottom: 4,
        }}>
          {headline}
        </div>

        {/* Sub */}
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 14 }}>
          {sub}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.15)', marginBottom: 12 }} />

        {/* Bullets */}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {bullets.map(t => (
            <li key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'white' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.55)' }} />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StepPackages({ briefing, updateBriefing, nextStep, stepNumber }: Props) {
  const vioData = briefing.vioPackages;

  const computeStart = (key: PkgKey) => {
    if (!briefing.votingDate || !vioData) return '';
    return computeStartDateISO(briefing.votingDate, vioData.packages[key].durationDays);
  };
  const computeEnd = () => {
    if (!briefing.votingDate) return '';
    return addDays(briefing.votingDate, -28);
  };

  const [selectedPkg,  setSelectedPkg]  = useState<PkgKey>('praesenz');
  const [startISO,     setStartISO]     = useState(() => computeStart('praesenz'));
  const [endISO,       setEndISO]       = useState(() => computeEnd());
  const [budget,       setBudget]       = useState(() => vioData?.packages['praesenz'].finalBudget ?? 9500);
  const [dateError,    setDateError]    = useState<string | null>(null);
  const [endDateWarn,  setEndDateWarn]  = useState<string | null>(null);

  const sharedEndISO = computeEnd();

  const handleSelectPkg = (key: PkgKey) => {
    setSelectedPkg(key);
    setStartISO(computeStart(key));
    setEndISO(computeEnd());
    setBudget(vioData?.packages[key].finalBudget ?? budget);
    setDateError(null);
    setEndDateWarn(null);
  };

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!vioData) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--slate)' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 1 zurück.
      </section>
    );
  }
  const pkg = vioData.packages[selectedPkg];

  // ── Hard date boundaries ──────────────────────────────────────────────────
  const earliestStartISO = addDays(todayISO(), 10);
  const campaignEndISO   = sharedEndISO;
  const earliestStartFmt = fmtLong(earliestStartISO);
  const campaignEndFmt   = campaignEndISO ? fmtLong(campaignEndISO) : '';

  const isPkgFeasible = (key: PkgKey): boolean => {
    if (!campaignEndISO) return true;
    const ms = new Date(campaignEndISO + 'T00:00:00').getTime()
             - new Date(earliestStartISO + 'T00:00:00').getTime();
    return Math.floor(ms / 86400000) >= vioData.packages[key].durationDays;
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const inhabitants = getInhabitants((briefing.selectedRegions ?? []).map(r => r.name));
  const weeks = startISO && endISO ? diffWeeks(startISO, endISO) : Math.round(pkg.durationDays / 7);
  const voters = vioData.eligibleVotersTotal;

  // Reach: sqrt-scaled from base, capped at 80 %
  const baseReach = pkg.targetReachPeople;
  const basePrice = pkg.finalBudget;
  const rawReach  = basePrice > 0 ? Math.round(baseReach * Math.sqrt(budget / basePrice)) : baseReach;
  const maxReach  = Math.round(voters * 0.80);
  const reach     = Math.min(rawReach, maxReach);
  const isCapped  = rawReach > maxReach;
  const reachPct  = voters > 0 ? Math.min(80, Math.round(reach / voters * 100)) : 0;

  // Display persons
  const freq        = pkg.frequency;
  const dispPersons = Math.round((budget * 0.3) / 15 * 1000 / freq);

  // Effective frequency when capped
  const MIXED_CPM    = 39.5;
  const effectiveFreq = isCapped
    ? Math.round(((budget / MIXED_CPM) * 1000) / reach * 10) / 10
    : freq;

  // DOOH screens
  const rName   = briefing.politikRegion ?? briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';
  const rType   = briefing.politikRegionType ?? briefing.selectedRegions?.[0]?.type ?? 'schweiz';
  const rKanton = briefing.selectedRegions?.[0]?.kanton;
  let doohEntry: DoohEntry | undefined;
  if (rType === 'schweiz') doohEntry = DOOH_DATA.find(d => d.type === 'schweiz');
  else if (rType === 'stadt') doohEntry = DOOH_DATA.find(d => d.type === 'stadt' && d.name === rName);
  else doohEntry = DOOH_DATA.find(d => d.type === 'kanton' && d.kanton === rKanton);
  const doohScreens = doohEntry?.screens_politik ?? 0;

  // Per-card reach preview
  const pkgReach = (key: PkgKey) => {
    const p = vioData.packages[key];
    return Math.min(p.targetReachPeople, maxReach);
  };
  const pkgReachPct = (key: PkgKey) =>
    voters > 0 ? Math.min(80, Math.round(pkgReach(key) / voters * 100)) : 0;

  // Budget hint badge
  const budgetHint = budget >= 60000 ? 'Dominanz' : budget >= 20000 ? 'Präsenz' : 'Sichtbar';

  // Sidebar bar: 80 % of voters = full bar
  const barW = Math.min(100, (reachPct / 80) * 100);

  // handleNext
  const handleNext = () => {
    if (!startISO || !endISO || startISO >= endISO) {
      setDateError('Kampagnenstart muss vor dem Ende liegen.'); return;
    }
    if (startISO < earliestStartISO) {
      setDateError(`Freigabe braucht 10 Tage – Frühestmöglicher Start: ${earliestStartFmt}`); return;
    }
    if (campaignEndISO && endISO > campaignEndISO) {
      setDateError(`Ende muss vor dem Unterlagen-Versand (${campaignEndFmt}) liegen.`); return;
    }
    const durDays = Math.round(
      (new Date(endISO + 'T00:00:00').getTime() - new Date(startISO + 'T00:00:00').getTime()) / 86400000
    );
    if (durDays < 7) { setDateError('Mindestlaufzeit beträgt 7 Tage.'); return; }
    setDateError(null);
    updateBriefing({
      budget, laufzeit: weeks, startDate: startISO,
      reach, reachVonPct: Math.round(reachPct * 0.85), reachBisPct: reachPct, b2bReach: null,
    });
    nextStep();
  };

  const fmtN   = (n: number) => Math.round(n).toLocaleString('de-CH');
  const fmtCHF = (n: number) => `CHF ${fmtN(n)}`;

  return (
    <section>
      <style>{`
        /* ── Layout ── */
        .sp-outer { max-width: 1180px; margin: 0 auto; padding: 32px 40px 80px; }
        .sp-wrap  { display: flex; gap: 32px; align-items: flex-start; }
        .sp-main  { flex: 1; min-width: 0; }
        .sp-side  { width: 268px; flex-shrink: 0; position: sticky; top: 80px; }

        /* ── Section label ── */
        .sp-sec-label {
          font-family: var(--font-display);
          font-size: 11px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--slate);
          margin-bottom: 14px;
        }

        /* ── Context bar ── */
        .sp-ctx {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          background: white; border: 1px solid var(--border); border-radius: var(--rs);
          padding: 10px 16px; margin-bottom: 32px; font-size: 13px;
        }
        .sp-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700;
          font-family: var(--font-display);
        }
        .sp-badge-v  { background: var(--violet); color: white; }
        .sp-badge-pl { background: var(--violet-pale); color: var(--violet); }
        .sp-badge-am { background: #FFF0EA; color: #C2410C; border: 1px solid #FDBA74; }

        /* ── Package cards ── */
        .sp-pkts { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 32px; }
        .sp-pkt  {
          position: relative; background: white; border: 1.5px solid var(--border);
          border-radius: var(--r); padding: 22px 18px 18px; cursor: pointer;
          transition: border-color .18s, box-shadow .18s, transform .15s;
          display: flex; flex-direction: column; text-align: left;
        }
        .sp-pkt:hover  { border-color: var(--violet-light); transform: translateY(-2px);
          box-shadow: 0 4px 18px rgba(107,79,187,.10); }
        .sp-pkt.sel    { border: 2px solid var(--violet);
          box-shadow: 0 0 0 3px rgba(107,79,187,.12), 0 4px 18px rgba(107,79,187,.10); }
        .sp-pkt.off    { opacity: .55; cursor: default; }
        .sp-emp-badge  {
          position: absolute; top: -11px; left: 50%; transform: translateX(-50%);
          background: var(--violet); color: white; font-size: 10px; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase; padding: 3px 12px;
          border-radius: 20px; font-family: var(--font-display); white-space: nowrap;
        }
        .sp-pkt-lbl   { font-size: 10px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--slate);
          font-family: var(--font-display); margin-bottom: 6px; }
        .sp-pkt-price { font-family: var(--font-display); font-size: clamp(20px,1.8vw,26px);
          font-weight: 800; color: var(--ink); line-height: 1; margin-bottom: 4px; }
        .sp-pkt.sel .sp-pkt-price { color: var(--violet); }
        .sp-pkt-meta  { font-size: 12px; color: var(--slate); margin-bottom: 14px; }
        .sp-pkt-div   { height: 1px; background: var(--border); margin-bottom: 12px; }
        .sp-pkt-rlbl  { font-size: 10px; font-weight: 600; letter-spacing: .07em;
          text-transform: uppercase; color: var(--slate);
          font-family: var(--font-display); margin-bottom: 4px; }
        .sp-pkt-rnum  { font-family: var(--font-display); font-size: 16px; font-weight: 700;
          color: var(--ink); margin-bottom: 2px; }
        .sp-pkt-rpct  { font-size: 11px; color: var(--slate); margin-bottom: 10px; }
        .sp-pkt-bar-track { height: 5px; background: var(--border); border-radius: 3px;
          margin-bottom: 10px; overflow: hidden; }
        .sp-pkt-bar-fill  { height: 100%; border-radius: 3px;
          background: linear-gradient(90deg, var(--violet-light), var(--violet)); }
        .sp-pkt-insight   { display: inline-block; font-size: 11px; font-weight: 600;
          border-radius: 6px; padding: 2px 8px; }

        /* ── Channel cards ── */
        .sp-chs { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 32px; }

        /* ── Budget & Laufzeit block ── */
        .sp-bl      { background: white; border: 1px solid var(--border); border-radius: var(--r);
          padding: 26px 24px; margin-bottom: 32px; }
        .sp-bl-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
        .sp-bl-lbl  { font-size: 11px; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; color: var(--slate);
          font-family: var(--font-display); margin-bottom: 10px; }
        .sp-budget-input-wrap { display: flex; align-items: center; gap: 0;
          border: 1.5px solid var(--border); border-radius: 10px; overflow: hidden;
          transition: border-color .15s; }
        .sp-budget-input-wrap:focus-within { border-color: var(--violet); }
        .sp-budget-prefix { padding: 0 12px; font-size: 14px; font-weight: 600;
          color: var(--slate); background: var(--violet-xpale);
          border-right: 1px solid var(--border); line-height: 52px; white-space: nowrap; }
        .sp-budget-input { flex: 1; border: none; outline: none; padding: 0 16px;
          font-family: var(--font-display); font-size: 22px; font-weight: 800;
          color: var(--violet); background: transparent; width: 100%;
          -moz-appearance: textfield; }
        .sp-budget-input::-webkit-outer-spin-button,
        .sp-budget-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        .sp-budget-hint { margin-top: 8px; font-size: 12px; color: var(--slate); }
        .sp-budget-warn { margin-top: 8px; font-size: 11px; color: #B91C1C;
          background: #FFF5F5; border: 1px solid #FCA5A5; border-radius: 6px;
          padding: 4px 10px; font-weight: 600; }
        .sp-date-stack  { display: flex; flex-direction: column; gap: 14px; }
        .sp-date-fld label { display: block; font-size: 11px; font-weight: 700;
          letter-spacing: .07em; text-transform: uppercase; color: var(--slate);
          font-family: var(--font-display); margin-bottom: 6px; }
        .sp-date-fld input[type=date] { width: 100%; padding: 11px 13px;
          border: 1.5px solid var(--border); border-radius: 8px;
          font-family: var(--font-sans); font-size: 14px; font-weight: 600;
          color: var(--ink); background: white; outline: none;
          transition: border-color .15s; box-sizing: border-box; }
        .sp-date-fld input[type=date]:focus { border-color: var(--violet);
          box-shadow: 0 0 0 3px rgba(107,79,187,.10); }
        .sp-bl-footer { display: flex; align-items: center; gap: 10px;
          margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--border);
          flex-wrap: wrap; }
        .sp-laufzeit-badge { background: var(--violet-pale); color: var(--violet);
          border-radius: 20px; padding: 4px 12px;
          font-family: var(--font-display); font-size: 12px; font-weight: 700; }
        .sp-pkg-hint-badge { background: var(--gold-pale); color: #92400E;
          border: 1px solid #FDE68A; border-radius: 20px; padding: 4px 12px;
          font-family: var(--font-display); font-size: 12px; font-weight: 700; }
        .sp-date-err { background: #FFF5F5; border: 1px solid #FCA5A5; border-radius: 8px;
          padding: 10px 14px; margin-top: 16px;
          font-size: 13px; color: #B91C1C; font-weight: 500;
          display: flex; gap: 8px; align-items: flex-start; }

        /* ── Sidebar ── */
        .sp-scard { background: white; border: 1px solid var(--border); border-radius: var(--r);
          overflow: hidden; }
        .sp-scard-hd { background: var(--ink); padding: 22px 20px 18px; }
        .sp-s-elbl  { font-size: 10px; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: rgba(255,255,255,.45);
          font-family: var(--font-display); margin-bottom: 6px; }
        .sp-s-big   { font-family: var(--font-display); font-size: 30px; font-weight: 800;
          color: white; line-height: 1; margin-bottom: 4px; }
        .sp-s-sub   { font-size: 13px; color: rgba(255,255,255,.55);
          font-family: var(--font-sans); margin-bottom: 14px; }
        .sp-s-bar-track { height: 6px; background: rgba(255,255,255,.15);
          border-radius: 4px; margin-bottom: 6px; overflow: hidden; }
        .sp-s-bar-fill  { height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #B8A9E8, #C4B5F4); transition: width .3s; }
        .sp-s-ticks { display: flex; justify-content: space-between;
          font-size: 10px; color: rgba(255,255,255,.35); }
        .sp-scard-bd { padding: 18px 20px 20px; }
        .sp-s-budget-lbl { font-size: 10px; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--slate);
          font-family: var(--font-display); margin-bottom: 4px; }
        .sp-s-budget-num { font-family: var(--font-display); font-size: 22px; font-weight: 800;
          color: var(--violet); margin-bottom: 18px; }
        .sp-s-div   { height: 1px; background: var(--border); margin-bottom: 14px; }
        .sp-s-row   { display: flex; justify-content: space-between; align-items: baseline;
          margin-bottom: 8px; font-size: 13px; gap: 8px; }
        .sp-s-rl    { color: var(--slate); flex-shrink: 0; }
        .sp-s-rv    { font-weight: 600; color: var(--ink); text-align: right;
          font-family: var(--font-display); }
        .sp-cta     { width: 100%; margin-top: 18px; padding: 15px;
          background: var(--violet); color: white; border: none; border-radius: 50px;
          font-family: var(--font-display); font-size: 15px; font-weight: 700;
          cursor: pointer; transition: background .15s, transform .15s, box-shadow .15s;
          display: flex; align-items: center; justify-content: center; gap: 8px; }
        .sp-cta:hover:not(:disabled) { background: #5940A8; transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(107,79,187,.30); }
        .sp-cta:disabled { opacity: .45; cursor: not-allowed; }
        .sp-cta-note { margin-top: 10px; font-size: 11px; color: var(--slate);
          text-align: center; line-height: 1.45; }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .sp-outer { padding: 24px 20px 60px; }
          .sp-wrap  { flex-direction: column; }
          .sp-side  { width: 100%; position: static; }
          .sp-pkts  { grid-template-columns: 1fr; }
          .sp-chs   { grid-template-columns: 1fr; }
          .sp-bl-grid { grid-template-columns: 1fr; }
        }
        @media (min-width: 1024px) {
          .sp-pkts { grid-template-columns: repeat(3,1fr); }
        }
      `}</style>

      <div className="sp-outer">
        <div className="sp-wrap">

          {/* ══════════════ LEFT COLUMN ══════════════ */}
          <div className="sp-main">

            {/* ── Eyebrow ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 2, background: 'var(--violet)', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--violet)' }}>
                {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 2'} · Politische Kampagne
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,2.4vw,32px)', fontWeight: 800, color: 'var(--ink)', lineHeight: 1.15, marginBottom: 8 }}>
              Wie weit soll deine Kampagne strahlen?
            </h1>
            <p style={{ fontSize: 15, color: 'var(--slate)', marginBottom: 28 }}>
              Alle Preise sind dynamisch auf deine Zielregion abgestimmt.
            </p>

            {/* ── 1. Context bar ── */}
            <div className="sp-ctx">
              <span className="sp-badge sp-badge-v">Politische Kampagne</span>
              {briefing.selectedRegions?.map(r => (
                <span key={r.name} className="sp-badge sp-badge-pl">📍 {r.name}</span>
              ))}
              <span style={{ fontSize: 13, color: 'var(--slate)' }}>
                {vioData.eligibleVotersTotal.toLocaleString('de-CH')} {inhabitants}
              </span>
              {/* Urgency badge: only if vote within 30 days */}
              {vioData.daysUntilVote != null && vioData.daysUntilVote <= 30 && (
                <span className="sp-badge sp-badge-am">
                  🗳️ Abstimmung in {vioData.daysUntilVote} Tagen
                </span>
              )}
            </div>

            {/* ── 2. Package cards ── */}
            <div className="sp-sec-label">Intensität wählen</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'start', marginBottom: 32 }}>
              {PKG_ORDER.map(key => {
                const p         = vioData.packages[key];
                const isSel     = selectedPkg === key;
                const feasible  = isPkgFeasible(key);
                const rn        = pkgReach(key);
                const rp        = pkgReachPct(key);
                const badge     = PKG_BADGE[key];
                const badgeText = p.hinweis || badge.fallback;
                return (
                  <div
                    key={key}
                    onClick={() => handleSelectPkg(key)}
                    title={feasible ? undefined : 'Zu wenig Zeit bis Abstimmung – Daten anpassen'}
                    style={isSel ? {
                      border: '2.5px solid #7F77DD',
                      background: 'linear-gradient(145deg, #EEEDFE 0%, #F8F7FF 100%)',
                      boxShadow: '0 8px 32px rgba(83,74,183,0.25)',
                      transform: 'translateY(-2px)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderRadius: '14px',
                      padding: '16px',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'left',
                    } : {
                      border: '1px solid #E8E6F0',
                      background: 'white',
                      boxShadow: 'none',
                      transform: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderRadius: '14px',
                      padding: '16px',
                      position: 'relative',
                      opacity: 0.75,
                      display: 'flex',
                      flexDirection: 'column',
                      textAlign: 'left',
                    }}
                  >
                    {/* Empfohlen badge */}
                    {key === 'praesenz' && (
                      <div style={{
                        position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)',
                        background: '#6B4FBB', color: 'white', fontSize: 10, fontWeight: 700,
                        letterSpacing: '.06em', textTransform: 'uppercase', padding: '3px 12px',
                        borderRadius: 20, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap',
                      }}>Empfohlen</div>
                    )}

                    {/* Radio button */}
                    {isSel ? (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#7F77DD', border: '2px solid #7F77DD', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 14, right: 14 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />
                      </div>
                    ) : (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', border: '1.5px solid #D3D1C7', position: 'absolute', top: 14, right: 14 }} />
                    )}

                    {/* Tier name */}
                    <div style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: '.12em',
                      textTransform: 'uppercase', color: 'var(--slate)',
                      fontFamily: 'var(--font-display)', marginBottom: 6,
                    }}>{p.name}</div>

                    {/* Price */}
                    <div style={isSel
                      ? { fontSize: 22, fontWeight: 700, color: '#534AB7', fontFamily: 'var(--font-display)', lineHeight: 1, marginBottom: 4 }
                      : { fontSize: 22, fontWeight: 500, color: '#2C2C2A', fontFamily: 'var(--font-display)', lineHeight: 1, marginBottom: 4 }
                    }>CHF {fmtN(p.finalBudget)}</div>

                    {/* Duration + freq */}
                    <div style={{ fontSize: 12, color: 'var(--slate)', marginBottom: 14 }}>
                      {Math.round(p.durationDays / 7)} Wochen · Ø {p.frequency}× Kontakte/Person
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: '#EDE8FF', marginBottom: 12 }} />

                    {/* Reach */}
                    <div style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: '.07em',
                      textTransform: 'uppercase', color: 'var(--slate)',
                      fontFamily: 'var(--font-display)', marginBottom: 4,
                    }}>Stimmberechtigte erreichbar</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
                      ~{fmtN(rn)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--slate)', marginBottom: 10 }}>
                      {rp}% der Stimmberechtigten
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 5, background: '#EDE8FF', borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 3, width: `${rp}%`, background: 'linear-gradient(90deg, #8B6FD4, #6B4FBB)' }} />
                    </div>

                    {/* Insight badge */}
                    <div style={{
                      marginTop: 'auto',
                      padding: '8px 10px', borderRadius: 8,
                      fontSize: 11, lineHeight: 1.5,
                      display: 'flex', gap: 6, alignItems: 'flex-start',
                      background: badge.bg, color: badge.color,
                    }}>
                      <span style={{ flexShrink: 0 }}>{badge.icon}</span>
                      {badgeText}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── 3. Channel cards ── */}
            <div className="sp-sec-label">Wie deine Werbung ausgespielt wird</div>
            <div className="sp-chs">

              {/* DOOH */}
              <ChannelCard
                imgSrc="/images/vio-dooh-bahnhof.jpg"
                overlayGradient="linear-gradient(165deg, rgba(22,14,60,0.72) 0%, rgba(83,74,183,0.50) 100%)"
                icon={
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <rect x="1" y="1" width="20" height="13" rx="2" stroke="white" strokeWidth="1.6"/>
                    <path d="M7 17H15" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                    <path d="M11 14V17" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
                  </svg>
                }
                label="DOOH · Im öffentlichen Raum"
                headline={`bis zu ${fmtN(doohScreens)}`}
                sub="politisch zugelassene Screens"
                bullets={['Bahnhöfe & ÖV', 'Einkaufszentren', 'Tankstellen']}
              />

              {/* Display */}
              <ChannelCard
                imgSrc="/images/vio-display-phone.jpg"
                overlayGradient="linear-gradient(165deg, rgba(8,50,41,0.76) 0%, rgba(29,158,117,0.50) 100%)"
                icon={
                  <svg width="22" height="18" viewBox="0 0 22 18" fill="none">
                    <rect x="1" y="1" width="20" height="13" rx="2" stroke="white" strokeWidth="1.6"/>
                    <path d="M1 5H21" stroke="white" strokeWidth="1.6"/>
                    <circle cx="4" cy="3" r="1" fill="white"/>
                    <circle cx="7" cy="3" r="1" fill="white"/>
                  </svg>
                }
                label="Display · Online"
                headline={`~${fmtN(dispPersons)}`}
                sub="Personen erreichbar"
                bullets={['Schweizer Newsportale', 'Blogs & Magazine', 'Apps mit CH-Usern']}
              />
            </div>

            {/* ── 4. Budget & Laufzeit ── */}
            <div className="sp-sec-label">Budget & Laufzeit anpassen</div>
            <div className="sp-bl">
              <div className="sp-bl-grid">

                {/* Budget input */}
                <div>
                  <div className="sp-bl-lbl">Gesamtbudget</div>
                  <div className="sp-budget-input-wrap">
                    <span className="sp-budget-prefix">CHF</span>
                    <input
                      type="number"
                      className="sp-budget-input"
                      value={budget}
                      min={2500}
                      onChange={e => setBudget(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  {budget >= 2500 ? (
                    <div className="sp-budget-hint">
                      entspricht etwa{' '}
                      <span style={{ fontWeight: 700, color: 'var(--violet)' }}>{budgetHint}</span>
                    </div>
                  ) : (
                    <div className="sp-budget-warn">⚠ Mindestbudget: CHF 2&apos;500</div>
                  )}
                  {isCapped && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gold)', fontWeight: 600 }}>
                      ⚠ Max. Reichweite – höheres Budget steigert Frequenz (Ø {effectiveFreq}×)
                    </div>
                  )}
                </div>

                {/* Date inputs */}
                <div>
                  <div className="sp-bl-lbl">Kampagnenzeitraum</div>
                  <div className="sp-date-stack">
                    <div className="sp-date-fld">
                      <label>Kampagnenstart</label>
                      <input
                        type="date"
                        value={startISO}
                        min={earliestStartISO}
                        max={campaignEndISO ? addDays(campaignEndISO, -7) : undefined}
                        onChange={e => {
                          const newStart = e.target.value;
                          setStartISO(newStart);
                          setDateError(null);
                          // Auto-correct end if it falls before start + 7 days
                          if (newStart && endISO && endISO <= newStart) {
                            const corrected = addDays(newStart, 7);
                            setEndISO(corrected);
                            setEndDateWarn('Enddatum muss nach dem Startdatum liegen.');
                          } else {
                            setEndDateWarn(null);
                          }
                        }}
                      />
                    </div>
                    <div className="sp-date-fld">
                      <label>Kampagnenende</label>
                      <input
                        type="date"
                        value={endISO}
                        min={startISO ? addDays(startISO, 1) : earliestStartISO}
                        max={campaignEndISO || undefined}
                        onChange={e => {
                          const newEnd = e.target.value;
                          setDateError(null);
                          if (newEnd && startISO && newEnd <= startISO) {
                            // Auto-correct: set to start + 7 days, show warning
                            const corrected = addDays(startISO, 7);
                            setEndISO(corrected);
                            setEndDateWarn('Enddatum muss nach dem Startdatum liegen.');
                          } else {
                            setEndISO(newEnd);
                            setEndDateWarn(null);
                          }
                        }}
                      />
                      {endDateWarn && (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#B91C1C',
                          background: '#FFF5F5', border: '1px solid #FCA5A5',
                          borderRadius: 6, padding: '4px 8px', fontWeight: 600 }}>
                          ⚠ {endDateWarn}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer row */}
              <div className="sp-bl-footer">
                <span className="sp-laufzeit-badge">{weeks} {weeks === 1 ? 'Woche' : 'Wochen'}</span>
                <span className="sp-pkg-hint-badge">{budgetHint}</span>
                {budget < 2500 && (
                  <span style={{ fontSize: 12, color: '#B91C1C', fontWeight: 600 }}>
                    ⚠ Mindestbudget CHF 2&apos;500
                  </span>
                )}
                {campaignEndISO && (
                  <span style={{ fontSize: 12, color: 'var(--slate)', marginLeft: 'auto' }}>
                    Empf. Ende: <strong style={{ color: 'var(--ink)' }}>{fmtLong(campaignEndISO)}</strong>
                  </span>
                )}
              </div>

              {/* Date error */}
              {dateError && (
                <div className="sp-date-err">
                  <span style={{ flexShrink: 0 }}>⚠️</span>
                  {dateError}
                </div>
              )}
            </div>

          </div>{/* /sp-main */}

          {/* ══════════════ RIGHT SIDEBAR ══════════════ */}
          <div className="sp-side">
            <div className="sp-scard">

              {/* Reichweite — dark header */}
              <div className="sp-scard-hd">
                <div className="sp-s-elbl">Stimmberechtigte erreichbar</div>
                <div className="sp-s-big">~{fmtN(reach)}</div>
                <div className="sp-s-sub">{reachPct}% der {inhabitants}</div>

                <div className="sp-s-bar-track">
                  <div className="sp-s-bar-fill" style={{ width: `${barW}%` }} />
                </div>
                <div className="sp-s-ticks">
                  <span>0%</span>
                  <span style={{ color: 'rgba(255,255,255,.65)', fontWeight: 700 }}>{reachPct}%</span>
                  <span>80% (max)</span>
                </div>
              </div>

              {/* Body */}
              <div className="sp-scard-bd">

                {/* Budget */}
                <div className="sp-s-budget-lbl">Gesamtbudget</div>
                <div className="sp-s-budget-num">{fmtCHF(budget)}</div>

                <div className="sp-s-div" />

                {/* Summary rows */}
                {[
                  { l: 'Paket',           v: pkg.name },
                  { l: 'Region',          v: rName },
                  { l: 'Freq.',           v: `Ø ${effectiveFreq}×` },
                  { l: 'Start',           v: startISO ? fmtShort(startISO) : '—' },
                  { l: 'Ende',            v: endISO   ? fmtShort(endISO)   : '—' },
                ].map(row => (
                  <div key={row.l} className="sp-s-row">
                    <span className="sp-s-rl">{row.l}</span>
                    <span className="sp-s-rv">{row.v}</span>
                  </div>
                ))}

                {/* CTA */}
                <button
                  type="button"
                  className="sp-cta"
                  onClick={handleNext}
                  disabled={budget < 2500}
                >
                  Weiter zu den Werbemitteln →
                </button>

                <div className="sp-cta-note">
                  Keine Zahlung jetzt — du erhältst zuerst eine Offerte.
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
