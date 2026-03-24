'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';

// ─── Canton population ────────────────────────────────────────────────────────
const CANTON_POP: Record<string, { bev: number; stimm: number }> = {
  'Zürich': { bev: 1539000, stimm: 1077300 },
  'Bern': { bev: 1050000, stimm: 735000 },
  'Luzern': { bev: 428000, stimm: 299600 },
  'Uri': { bev: 37000, stimm: 25900 },
  'Schwyz': { bev: 166000, stimm: 116200 },
  'Obwalden': { bev: 39000, stimm: 27300 },
  'Nidwalden': { bev: 44000, stimm: 30800 },
  'Glarus': { bev: 41000, stimm: 28700 },
  'Zug': { bev: 131000, stimm: 91700 },
  'Freiburg': { bev: 337000, stimm: 235900 },
  'Solothurn': { bev: 283000, stimm: 198100 },
  'Basel-Stadt': { bev: 181000, stimm: 128100 },
  'Basel-Landschaft': { bev: 290000, stimm: 199400 },
  'Schaffhausen': { bev: 84000, stimm: 57200 },
  'Appenzell A.Rh.': { bev: 58000, stimm: 40800 },
  'Appenzell I.Rh.': { bev: 16000, stimm: 11500 },
  'St. Gallen': { bev: 514000, stimm: 340900 },
  'Graubünden': { bev: 201000, stimm: 138900 },
  'Aargau': { bev: 693000, stimm: 453400 },
  'Thurgau': { bev: 279000, stimm: 185700 },
  'Tessin': { bev: 356000, stimm: 249600 },
  'Waadt': { bev: 815000, stimm: 516900 },
  'Wallis': { bev: 345000, stimm: 215200 },
  'Neuenburg': { bev: 175000, stimm: 119800 },
  'Genf': { bev: 509000, stimm: 330000 },
  'Jura': { bev: 73000, stimm: 52800 },
  'Gesamte Schweiz': { bev: 8816000, stimm: 5571000 },
};

// ─── Packages ─────────────────────────────────────────────────────────────────
const PACKAGES = [
  { id: 'sichtbar' as const, label: 'Sichtbar',  budget: 2500,  duration: 2, freq: 3, recommended: false },
  { id: 'praesenz' as const, label: 'Präsenz',   budget: 9500,  duration: 4, freq: 7, recommended: true  },
  { id: 'dominanz' as const, label: 'Dominanz',  budget: 25000, duration: 6, freq: 7, recommended: false },
] as const;

type PackageId = 'sichtbar' | 'praesenz' | 'dominanz';

// ─── Calculation ──────────────────────────────────────────────────────────────
function calcReach(budget: number, stimmber: number) {
  const freq         = budget < 5000 ? 3 : budget < 8000 ? 5 : 7;
  const doohBudget   = budget * 0.7;
  const dispBudget   = budget * 0.3;
  const doohContacts = Math.round(doohBudget / 50 * 1000);
  const dispContacts = Math.round(dispBudget / 15 * 1000);
  const uniqueLow    = Math.min(Math.round(doohContacts / freq * 0.85), stimmber);
  const uniqueHigh   = Math.min(Math.round(doohContacts / freq * 1.1),  stimmber);
  const uniqueMid    = Math.round((uniqueLow + uniqueHigh) / 2);
  const pct          = Math.min(Math.round(uniqueHigh / stimmber * 100), 100);
  const screens      = Math.max(3, Math.round(budget / 950));
  return { freq, doohContacts, dispContacts, uniqueLow, uniqueHigh, uniqueMid, pct, screens };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  prevStep?: () => void;
  isActive: boolean;
  stepNumber?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step4Budget({ briefing, updateBriefing, nextStep, prevStep, stepNumber }: Props) {
  const isPolitik = briefing.campaignType === 'politik';

  const regionName = isPolitik
    ? (briefing.selectedRegions?.[0]?.name ?? briefing.politikRegion ?? 'Gesamte Schweiz')
    : (briefing.analysis?.region?.[0] ?? 'Gesamte Schweiz');

  const popData  = CANTON_POP[regionName] ?? CANTON_POP['Gesamte Schweiz'];
  const stimmber = isPolitik
    ? (briefing.totalStimmber ?? briefing.stimmberechtigte ?? popData.stimm)
    : popData.bev;

  // ── State ──
  const [budget,         setBudget]         = useState(9500);
  const [duration,       setDuration]       = useState(4);
  const [selectedPkg,    setSelectedPkg]    = useState<PackageId>('praesenz');
  const [accordionOpen,  setAccordionOpen]  = useState(false);
  const [regionPickerOpen,   setRegionPickerOpen]   = useState(false);
  const [regionQuery,        setRegionQuery]        = useState('');
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [editRegions, setEditRegions] = useState<Region[]>(() => (briefing.selectedRegions ?? []) as Region[]);
  const [startDate] = useState<string>(() => {
    if (briefing.votingDate && briefing.recommendedLaufzeit) {
      const d = new Date(briefing.votingDate + 'T12:00:00');
      d.setDate(d.getDate() - briefing.recommendedLaufzeit * 7);
      const today = new Date();
      return (d < today ? today : d).toISOString().split('T')[0];
    }
    return todayStr();
  });

  // ── Derived ──
  const { freq, doohContacts, dispContacts, uniqueLow, uniqueHigh, uniqueMid, pct, screens } =
    calcReach(budget, stimmber);

  const pkgReach = PACKAGES.map(p => {
    const dooh = Math.round(p.budget * 0.7 / 50 * 1000);
    const lo   = Math.min(Math.round(dooh / p.freq * 0.85), stimmber);
    const hi   = Math.min(Math.round(dooh / p.freq * 1.1),  stimmber);
    return { lo, hi, pct: Math.min(Math.round(hi / stimmber * 100), 100) };
  });

  const smartTip = (() => {
    if (duration > 4 && budget < 5000)
      return "Tipp: Für dieses Budget lieber 2–3 Wochen wählen — so bleibt die Frequenz hoch genug um zu wirken.";
    if (pct >= 55)
      return "Stark: Du erreichst über die Hälfte aller Stimmberechtigten. Maximale Durchdringung.";
    if (pct >= 40)
      return `Gute Durchdringung — ${pct}% der Stimmberechtigten sehen deine Kampagne mindestens ${freq}×.`;
    return "Tipp: Mit etwas mehr Budget lässt sich die Reichweite deutlich steigern — ab CHF 5'000 steigt die Frequenz auf 5× pro Person.";
  })();

  // ── Region picker ──
  const regionSearchResults = useMemo(() => {
    const q    = regionQuery.trim().toLowerCase();
    const pool = ALL_REGIONS
      .filter(r => !q || r.name.toLowerCase().includes(q))
      .filter(r => isPolitik || r.type === 'kanton')
      .filter(r => !editRegions.some(s => s.name === r.name));
    return [
      ...pool.filter(r => r.type === 'schweiz'),
      ...pool.filter(r => r.type === 'kanton'),
      ...pool.filter(r => r.type === 'stadt'),
    ].slice(0, 8);
  }, [regionQuery, editRegions, isPolitik]);

  const editTotalStimm = editRegions.reduce((s, r) => s + r.stimm, 0);

  const addEditRegion = (r: Region) => {
    if (!isPolitik) {
      updateBriefing({ analysis: briefing.analysis ? { ...briefing.analysis, region: [r.name] } : null });
      setRegionPickerOpen(false); setRegionQuery(''); return;
    }
    if (editRegions.length >= 10) return;
    setEditRegions(prev => [...prev, r]);
    setRegionQuery(''); setRegionDropdownOpen(false);
  };

  const removeEditRegion = (name: string) =>
    setEditRegions(prev => prev.filter(r => r.name !== name));

  const confirmRegionEdit = () => {
    if (!isPolitik || editRegions.length === 0) return;
    updateBriefing({
      selectedRegions:   editRegions.map(r => ({ name: r.name, type: r.type, stimm: r.stimm, kanton: r.kanton })),
      totalStimmber:     editTotalStimm,
      stimmberechtigte:  editTotalStimm,
      politikRegion:     editRegions[0]?.name ?? '',
      politikRegionType: (editRegions[0]?.type ?? 'kanton') as 'kanton' | 'stadt' | 'schweiz',
    });
    setRegionPickerOpen(false); setRegionQuery('');
  };

  const handlePackageSelect = (pkg: typeof PACKAGES[number]) => {
    setSelectedPkg(pkg.id);
    setBudget(pkg.budget);
    setDuration(pkg.duration);
  };

  const handleNext = () => {
    updateBriefing({
      budget, laufzeit: duration, startDate,
      reach: uniqueMid, freq,
      tierSelected: PACKAGES.findIndex(p => p.id === selectedPkg),
      b2bReach: null,
    });
    nextStep();
  };

  // ── Formatters ──
  const fmtCHF   = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;
  const fmtN     = (n: number) => Math.round(n).toLocaleString('de-CH');
  const fmtRange = (a: number, b: number) => `${fmtN(a)}–${fmtN(b)}`;
  const durLabel = (w: number) => `${w} ${w === 1 ? 'Woche' : 'Wochen'}`;

  const personLabel  = isPolitik ? 'Stimmberechtigte' : 'Personen';
  const ctBadgeLabel = briefing.campaignType === 'b2c' ? 'B2C' : briefing.campaignType === 'b2b' ? 'B2B' : 'Politische Kampagne';
  const ctBadgeColor = briefing.campaignType === 'politik' ? '#7C3AED' : 'var(--primary)';

  const budgetPct   = ((budget   - 2500) / (50000 - 2500)) * 100;
  const durationPct = ((duration - 1)    / (8 - 1))        * 100;

  // ── Accordion content (shared between mobile accordion + desktop sidebar) ──
  const CalcContent = () => (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--muted)] leading-relaxed mb-1">
        Dein Budget wird 70/30 auf DOOH-Screens und Online-Banner aufgeteilt.
      </p>
      {[
        { label: '📺 DOOH-Anteil (70%)',    value: fmtCHF(Math.round(budget * 0.7)) },
        { label: '🖥 Display-Anteil (30%)', value: fmtCHF(Math.round(budget * 0.3)) },
      ].map(row => (
        <div key={row.label} className="flex justify-between text-sm">
          <span className="text-[var(--taupe)]">{row.label}</span>
          <strong className="text-[var(--taupe)]">{row.value}</strong>
        </div>
      ))}
      <div className="h-px bg-[var(--border)] my-1" />
      <div className="flex justify-between text-sm">
        <span className="text-[var(--taupe)]">Ø Kontakte pro Person</span>
        <strong className="text-[var(--primary)]">{freq}×</strong>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <section className="bg-[var(--bg)]">
      {/* Global slider + serif font styles */}
      <style>{`
        .vio-serif { font-family: var(--font-display); font-weight: 700; }
        .vio-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 4px; border-radius: 2px;
          outline: none; cursor: pointer; border: none; display: block;
          background: linear-gradient(to right, var(--primary) var(--fill, 0%), rgba(107,79,187,0.12) var(--fill, 0%));
        }
        .vio-slider::-webkit-slider-runnable-track { height: 4px; border-radius: 2px; }
        .vio-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 28px; height: 28px;
          border-radius: 50%; background: #fff;
          border: 2px solid var(--primary); cursor: pointer;
          box-shadow: 0 1px 6px rgba(107,79,187,0.30); margin-top: -12px;
        }
        @media (min-width: 640px) {
          .vio-slider::-webkit-slider-thumb { width: 24px; height: 24px; margin-top: -10px; }
          .vio-slider::-moz-range-thumb { width: 24px; height: 24px; }
        }
        .vio-slider::-moz-range-thumb {
          width: 28px; height: 28px; border-radius: 50%;
          background: #fff; border: 2px solid var(--primary);
          cursor: pointer; box-shadow: 0 1px 6px rgba(107,79,187,0.30);
          box-sizing: border-box;
        }
        .vio-slider::-moz-range-progress { background: var(--primary); border-radius: 2px; height: 4px; }
        .vio-slider::-moz-range-track { height: 4px; border-radius: 2px; background: rgba(107,79,187,0.12); }
        .vio-budget-wrap {
          max-width: 1200px; margin: 0 auto;
          padding: 32px 40px 80px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 340px;
          gap: 40px;
          align-items: start;
        }
        .vio-pkg-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) {
          .vio-budget-wrap {
            grid-template-columns: 1fr;
            padding: 20px 16px 80px;
            gap: 24px;
          }
          .vio-pkg-grid {
            grid-template-columns: 1fr;
          }
          .vio-sidebar { display: none; }
        }
      `}</style>

      <div className="vio-budget-wrap">

        {/* ══════════════ MAIN COLUMN ══════════════ */}
        <div className="min-w-0">

          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-[18px] h-0.5 bg-[var(--primary)] rounded" />
            <span className="text-[11px] font-bold tracking-[.12em] text-[var(--primary)] uppercase">
              {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 4'}
            </span>
          </div>

          <h1 className="vio-serif text-[26px] sm:text-3xl font-normal tracking-tight leading-snug mb-6 text-[var(--taupe)]">
            Wie weit soll deine Kampagne strahlen?
          </h1>

          {/* ── CONTEXT BAR ── */}
          <div className="bg-white border border-[var(--border)] rounded-2xl px-[18px] py-3 mb-6 flex flex-wrap items-center gap-[10px] text-sm text-[var(--taupe)]">
            <span
              className="text-white rounded-full px-3 py-0.5 text-xs font-bold tracking-wide"
              style={{ background: ctBadgeColor }}
            >
              {ctBadgeLabel}
            </span>
            {isPolitik && briefing.selectedRegions && briefing.selectedRegions.length > 0 ? (
              <span className="flex flex-wrap gap-1.5 items-center">
                {briefing.selectedRegions.map(r => (
                  <span key={r.name} className="bg-[#EDE9FE] text-[#7C3AED] rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    📍 {r.name}
                  </span>
                ))}
                <span className="text-[var(--muted)]">· {stimmber.toLocaleString('de-CH')} Stimmberechtigte</span>
              </span>
            ) : (
              <span>
                📍 <strong>{regionName}</strong>
                &nbsp;·&nbsp;{stimmber.toLocaleString('de-CH')}&nbsp;{isPolitik ? 'Stimmberechtigte' : 'Personen'}
              </span>
            )}
            {isPolitik && briefing.daysUntil != null && (
              <span className="text-[#7A5500] bg-[#FFF8EE] border border-[#FDDFA4] rounded-lg px-2.5 py-0.5 text-xs">
                🗳️ Abstimmung in <strong>{briefing.daysUntil}</strong> Tagen
              </span>
            )}
            <button
              type="button"
              onClick={() => { setRegionPickerOpen(o => !o); setEditRegions((briefing.selectedRegions ?? []) as Region[]); setRegionQuery(''); }}
              className="ml-auto text-[var(--muted)] text-xs font-semibold underline cursor-pointer bg-transparent border-none min-h-[44px] px-1"
            >
              Region ändern
            </button>
          </div>

          {/* Region picker */}
          {regionPickerOpen && (
            <div className="bg-white border border-[var(--border)] rounded-xl p-[18px] mb-5">
              <div className="text-[11px] font-bold tracking-[.1em] text-[var(--muted)] uppercase mb-2.5">
                {isPolitik ? 'Regionen bearbeiten' : 'Region ändern'}
              </div>
              {isPolitik && editRegions.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editRegions.map(r => (
                      <span key={r.name} className="inline-flex items-center gap-1.5 bg-[#F9ECEC] border border-[var(--primary)] text-[var(--pd)] rounded-full pl-3 pr-2 py-1 text-sm font-semibold">
                        {r.name}
                        <button type="button" onClick={() => removeEditRegion(r.name)} className="text-[var(--muted)] text-base leading-none cursor-pointer bg-transparent border-none min-h-[44px] min-w-[44px] flex items-center justify-center">×</button>
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted)] mb-2">
                    Total: <strong className="text-[var(--taupe)]">{editTotalStimm.toLocaleString('de-CH')}</strong> Stimmberechtigte
                  </p>
                </>
              )}
              <div className="relative">
                <input
                  type="text"
                  value={regionQuery}
                  placeholder={isPolitik ? 'Kanton oder Gemeinde suchen...' : 'Kanton suchen...'}
                  onChange={e => { setRegionQuery(e.target.value); setRegionDropdownOpen(true); }}
                  onFocus={() => setRegionDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setRegionDropdownOpen(false), 200)}
                  className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-[var(--border)] text-sm text-[var(--taupe)] bg-[var(--bg)] outline-none min-h-[44px]"
                />
                {regionDropdownOpen && regionSearchResults.length > 0 && (
                  <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white border border-[var(--border)] rounded-xl shadow-[0_8px_24px_rgba(107,79,187,0.11)] max-h-[260px] overflow-y-auto z-[200]">
                    {regionSearchResults.map(r => (
                      <div
                        key={r.name}
                        onMouseDown={() => addEditRegion(r)}
                        className="px-3.5 py-2.5 cursor-pointer text-sm text-[var(--taupe)] flex justify-between hover:bg-[var(--bg)]"
                      >
                        <span>{r.name}</span>
                        <span className="text-[11px] text-[var(--muted)]">{r.stimm?.toLocaleString('de-CH')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                {isPolitik && editRegions.length > 0 && (
                  <button type="button" onClick={confirmRegionEdit} className="min-h-[44px] px-5 py-2 rounded-full bg-[var(--primary)] text-white text-sm font-semibold cursor-pointer border-none">
                    Übernehmen
                  </button>
                )}
                <button type="button" onClick={() => setRegionPickerOpen(false)} className="min-h-[44px] px-5 py-2 rounded-full bg-transparent text-[var(--muted)] border border-[var(--border)] text-sm font-semibold cursor-pointer">
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {/* ── PACKAGE CARDS ──
              Mobile: 1-col, horizontal (name+details left, price right), left-border selected
              Desktop: 3-col grid, stacked, checkmark circle, full border selected
          */}
          <div className="vio-pkg-grid">
            {PACKAGES.map((pkg, i) => {
              const isActive = selectedPkg === pkg.id;
              const pr       = pkgReach[i];
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => handlePackageSelect(pkg)}
                  className={[
                    'relative text-left cursor-pointer select-none rounded-2xl transition-all duration-150 min-h-[44px] w-full',
                    // Mobile layout: horizontal flex
                    'flex items-center gap-3 px-4 py-3',
                    // Desktop layout: vertical block
                    'sm:block sm:px-[18px] sm:py-5',
                    // Border + bg
                    isActive
                      ? 'border-l-[3px] border-l-[var(--primary)] border border-[var(--border)] bg-[var(--pl)] sm:border-2 sm:border-[var(--primary)]'
                      : 'border border-[var(--border)] bg-white',
                  ].join(' ')}
                >
                  {/* Recommended badge — desktop only */}
                  {pkg.recommended && (
                    <div className="hidden sm:block absolute top-[-11px] left-1/2 -translate-x-1/2 bg-[var(--primary)] text-white rounded-full px-3 py-0.5 text-[11px] font-bold tracking-[.06em] whitespace-nowrap">
                      Empfohlen
                    </div>
                  )}

                  {/* Checkmark — desktop only */}
                  <div className={[
                    'hidden sm:flex absolute top-3.5 right-3.5 w-5 h-5 rounded-full items-center justify-center transition-all duration-150',
                    isActive ? 'bg-[var(--primary)]' : 'bg-[var(--border)]',
                  ].join(' ')}>
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5L4 7.5L10 1.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Left side: name + meta (mobile) / stacked (desktop) */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-bold tracking-[.1em] uppercase mb-0.5 sm:mb-2 ${isActive ? 'text-[var(--pd)]' : 'text-[var(--muted)]'}`}>
                      {pkg.label}
                      {/* Mobile recommended asterisk */}
                      {pkg.recommended && <span className="sm:hidden ml-1 text-[var(--primary)]">★</span>}
                    </div>
                    {/* Details: hidden on mobile main row (shown as sub), full on desktop */}
                    <div className="hidden sm:block">
                      <div className="vio-serif leading-none mb-1.5" style={{ color: isActive ? 'var(--primary)' : 'var(--taupe)', fontSize: 'clamp(20px, 2vw, 26px)' }}>
                        {fmtCHF(pkg.budget)}
                      </div>
                      <div className="text-xs text-[var(--muted)] mb-2">{durLabel(pkg.duration)} · {pkg.freq}× Kontakt</div>
                      <div className={`text-[11px] ${isActive ? 'text-[var(--pd)]' : 'text-[var(--muted)]'}`}>
                        ~{fmtRange(pr.lo, pr.hi)} {personLabel} ({pr.pct}%)
                      </div>
                    </div>
                    {/* Mobile subtitle */}
                    <div className="sm:hidden text-xs text-[var(--muted)]">
                      {durLabel(pkg.duration)} · {pkg.freq}× · ~{pr.pct}%
                    </div>
                  </div>

                  {/* Right side: price (mobile only) */}
                  <div className={`sm:hidden vio-serif text-lg font-normal leading-none flex-shrink-0 ${isActive ? 'text-[var(--primary)]' : 'text-[var(--taupe)]'}`}>
                    {fmtCHF(pkg.budget)}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── RECOMMENDATION CARD ── */}
          <div className="bg-white rounded-2xl border border-[var(--border)] border-t-[3px] border-t-[var(--primary)] p-5 sm:p-[22px] mb-5">
            <div className="flex justify-between items-start gap-4 mb-4 flex-wrap">
              <div>
                <span className="inline-block bg-[var(--pl)] text-[var(--pd)] border border-[#F0C8C8] rounded-full px-3 py-0.5 text-[11px] font-bold tracking-[.06em] mb-2.5">
                  Unser Vorschlag
                </span>
                <div className="vio-serif text-4xl font-normal text-[var(--taupe)] tracking-tight leading-none">
                  {fmtRange(uniqueLow, uniqueHigh)}
                </div>
                <p className="text-sm text-[var(--muted)] mt-1.5">
                  {personLabel} sehen deine Kampagne · {pct}% von {regionName}
                </p>
              </div>
              <div className="text-right">
                <div className="vio-serif text-2xl text-[var(--primary)] tracking-tight leading-none">
                  {fmtCHF(budget)}
                </div>
                <p className="text-xs text-[var(--muted)] mt-1">{durLabel(duration)} · {freq}× Kontakt</p>
              </div>
            </div>
            <div className="grid grid-cols-2 pt-4 border-t border-[var(--border)]" style={{ gap: '16px 32px' }}>
              {[
                { label: 'DOOH Screens',     value: fmtN(screens),                   sub: 'digitale Plakatstellen' },
                { label: 'Display Kontakte', value: fmtN(dispContacts),              sub: 'Online-Banner Impressionen' },
                { label: 'Laufzeit',         value: durLabel(duration),              sub: `${freq}× Kontakt pro Person` },
                { label: 'Unique Reach',     value: fmtRange(uniqueLow, uniqueHigh), sub: `${pct}% der ${personLabel}` },
              ].map(cell => (
                <div key={cell.label} className="bg-[var(--bg)] rounded-xl px-3.5 py-2.5">
                  <div className="text-[10px] font-bold uppercase mb-1" style={{ letterSpacing: '.12em', color: '#B8A9E8' }}>{cell.label}</div>
                  <div className="vio-serif" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ink)' }}>{cell.value}</div>
                  <div className="mt-0.5" style={{ fontSize: '12px', fontWeight: 300, color: 'var(--slate)', fontFamily: 'var(--font-sans)' }}>{cell.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SLIDERS CARD ── */}
          <div className="bg-white border border-[var(--border)] rounded-2xl p-5 sm:p-[22px] mb-5">
            {/* Budget */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-sm font-semibold text-[var(--taupe)]">Budget</span>
                <span className="vio-serif text-xl text-[var(--primary)] tracking-tight">{fmtCHF(budget)}</span>
              </div>
              <input
                type="range" className="vio-slider"
                min={2500} max={50000} step={500} value={budget}
                onChange={e => setBudget(Number(e.target.value))}
                style={{ '--fill': `${budgetPct}%` } as React.CSSProperties}
              />
              <div className="flex justify-between text-[11px] text-[var(--muted)] mt-1.5">
                <span>CHF 2'500</span><span>CHF 50'000</span>
              </div>
            </div>
            {/* Duration */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-sm font-semibold text-[var(--taupe)]">Laufzeit</span>
                <span className="vio-serif text-xl text-[var(--primary)] tracking-tight">{durLabel(duration)}</span>
              </div>
              <input
                type="range" className="vio-slider"
                min={1} max={8} step={1} value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={{ '--fill': `${durationPct}%` } as React.CSSProperties}
              />
              <div className="flex justify-between text-[11px] text-[var(--muted)] mt-1.5">
                <span>1 Woche</span><span>8 Wochen</span>
              </div>
            </div>
          </div>

          {/* ── BREAKDOWN ── */}
          <div className="grid grid-cols-2 mb-5" style={{ gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(107,79,187,0.09)', borderRadius: '16px', padding: '20px 18px' }}>
              <div className="text-[10px] font-bold uppercase mb-2.5" style={{ letterSpacing: '.12em', color: '#B8A9E8' }}>DOOH — Digitale Screens</div>
              <div className="vio-serif leading-none mb-1" style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmtN(screens)}</div>
              <p className="mb-2" style={{ fontSize: '12px', fontWeight: 300, color: 'var(--slate)', fontFamily: 'var(--font-sans)' }}>Screens in {regionName}</p>
              <p className="leading-relaxed" style={{ fontSize: '11px', color: 'var(--slate)', fontFamily: 'var(--font-sans)', fontWeight: 300 }}>Bahnhöfe, Einkaufszentren, belebte Orte</p>
              <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-sm font-bold text-[var(--taupe)]">
                {fmtN(doohContacts)} Kontakte
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(107,79,187,0.09)', borderRadius: '16px', padding: '20px 18px' }}>
              <div className="text-[10px] font-bold uppercase mb-2.5" style={{ letterSpacing: '.12em', color: '#B8A9E8' }}>Display — Online Banner</div>
              <div className="vio-serif leading-none mb-1" style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmtCHF(Math.round(budget * 0.3))}</div>
              <p className="mb-2" style={{ fontSize: '12px', fontWeight: 300, color: 'var(--slate)', fontFamily: 'var(--font-sans)' }}>Display-Budget (30%)</p>
              <p className="leading-relaxed" style={{ fontSize: '11px', color: 'var(--slate)', fontFamily: 'var(--font-sans)', fontWeight: 300 }}>Schweizer Websites & Apps</p>
              <div className="mt-3 pt-2.5 border-t border-[var(--border)] text-sm font-bold text-[var(--taupe)]">
                {fmtN(dispContacts)} Kontakte
              </div>
            </div>
          </div>

          {/* ── MOBILE ACCORDION: Wie berechnen wir das? ── */}
          <div className="sm:hidden mb-5">
            <button
              type="button"
              onClick={() => setAccordionOpen(o => !o)}
              className="w-full min-h-[44px] flex items-center justify-between bg-white border border-[var(--border)] rounded-2xl px-4 py-3 text-sm font-semibold text-[var(--taupe)] cursor-pointer"
            >
              <span>Wie berechnen wir das?</span>
              <span className={`text-[var(--muted)] transition-transform duration-200 ${accordionOpen ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {accordionOpen && (
              <div className="bg-white border border-t-0 border-[var(--border)] rounded-b-2xl px-4 pb-4 pt-3">
                <CalcContent />
              </div>
            )}
          </div>

          {/* ── SMART TIP ── */}
          <div className="bg-[#F5EBEB] border-l-[3px] border-l-[var(--primary)] rounded-r-xl px-[18px] py-3.5 mb-7 text-sm text-[var(--taupe)] leading-relaxed">
            💡 {smartTip}
          </div>

          {/* ── CTA ──
              Mobile: stacked col (Weiter full-width, then Zurück)
              Desktop: inline row
          */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-[var(--primary)] text-white border-none rounded-full px-7 text-[15px] font-bold cursor-pointer transition-all duration-150 hover:bg-[var(--pd)] hover:-translate-y-0.5" style={{ padding: '15px 28px', boxShadow: '0 6px 20px rgba(107,79,187,0.28)', fontFamily: 'var(--font-display)' }}
            >
              Weiter zu den Werbemitteln →
            </button>
            {prevStep && (
              <button
                type="button"
                onClick={prevStep}
                className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 bg-transparent text-[var(--muted)] border border-[var(--border)] rounded-full px-6 py-3.5 text-sm font-semibold cursor-pointer transition-all duration-150 hover:text-[var(--taupe)]"
              >
                ← Zurück
              </button>
            )}
          </div>

        </div>{/* end main column */}

        {/* ══════════════ SIDEBAR ══════════════ */}
        <div className="vio-sidebar flex flex-col" style={{ position: 'sticky', top: '80px' }}>

          {/* Card 1: Wie berechnen wir das? */}
          <div style={{ background: '#fff', border: '1px solid rgba(107,79,187,0.09)', borderRadius: '20px', padding: '22px 20px', marginBottom: '16px' }}>
            <h3 className="vio-serif text-base text-[var(--taupe)] mb-3.5">Wie berechnen wir das?</h3>
            <CalcContent />
          </div>

          {/* Card 2: Deine Zielregion */}
          <div style={{ background: '#fff', border: '1px solid rgba(107,79,187,0.09)', borderRadius: '20px', padding: '22px 20px', marginBottom: '16px' }}>
            <h3 className="vio-serif text-base text-[var(--taupe)] mb-3.5">Deine Zielregion</h3>
            <p className="text-sm font-bold text-[var(--taupe)] mb-1.5">📍 {regionName}</p>
            <p className="text-sm text-[var(--muted)] mb-3.5">
              {stimmber.toLocaleString('de-CH')} {isPolitik ? 'Stimmberechtigte' : 'Einwohner'}
            </p>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Erreichbar via DOOH',    value: '~85%' },
                { label: 'Erreichbar via Display', value: '~92%' },
              ].map(row => (
                <div key={row.label} className="flex justify-between text-xs text-[var(--muted)]">
                  <span>{row.label}</span>
                  <strong className="text-[var(--taupe)]">{row.value}</strong>
                </div>
              ))}
            </div>
            <p className="mt-3 pt-2.5 border-t border-[var(--border)] text-[11px] text-[var(--muted)]">
              Quelle: BFS Bevölkerungsstatistik 2023
            </p>
          </div>

          {/* Card 3: Fragen? */}
          <div style={{ background: '#F5F2FF', borderRadius: '16px', padding: '18px' }}>
            <h3 className="vio-serif text-base text-[var(--taupe)] mb-2">Fragen?</h3>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
              Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.
            </p>
            <a
              href="https://calendly.com/vio"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', background: '#6B4FBB', color: '#fff', borderRadius: '100px', padding: '10px 20px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}
            >
              Gespräch buchen →
            </a>
          </div>

        </div>{/* end sidebar */}

      </div>
    </section>
  );
}
