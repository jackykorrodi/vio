'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import doohScreensRaw from '@/lib/dooh-screens.json';

type DoohEntry = { type: string; name?: string; kanton: string; screens: number; screens_politik: number; standorte: number; reach: number };
const DOOH_DATA = doohScreensRaw as DoohEntry[];

type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz';
const PKG_ORDER: PkgKey[] = ['sichtbar', 'praesenz', 'dominanz'];
const MIXED_CPM = 39.5;

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function fmtLong(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMed(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function calcCampaignDates(votingDate: string, laufzeitWeeks: number): { startISO: string; endISO: string } {
  const today = todayISO();
  const endISO = addDays(votingDate, -3);
  const rawStart = addDays(endISO, -(laufzeitWeeks * 7));
  if (rawStart < today) {
    return { startISO: today, endISO: addDays(today, laufzeitWeeks * 7) };
  }
  return { startISO: rawStart, endISO };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
  stepNumber?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step2PolitikBudget({ briefing, updateBriefing, nextStep, stepNumber }: Props) {
  const vioData = briefing.vioPackages;

  const initPkg = (vioData?.recommendedPackage ?? 'praesenz') as PkgKey;
  const [selectedPkg, setSelectedPkg] = useState<PkgKey>(initPkg);
  const [budget, setBudget] = useState(() => vioData?.packages[initPkg].finalBudget ?? 9500);
  const [laufzeitWeeks, setLaufzeitWeeks] = useState(() =>
    Math.round((vioData?.packages[initPkg].durationDays ?? 28) / 7)
  );

  if (!vioData) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: '#7A7596' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 1 zurück.
      </section>
    );
  }

  const pkg = vioData.packages[selectedPkg];

  // Campaign dates
  const { startISO: campaignStartISO, endISO: campaignEndISO } = briefing.votingDate
    ? calcCampaignDates(briefing.votingDate, laufzeitWeeks)
    : { startISO: '', endISO: '' };

  // Reach
  const selectedPkgBudget = vioData.packages[selectedPkg].finalBudget;
  const isCustomBudget = budget !== selectedPkgBudget;
  const rawReach = isCustomBudget
    ? Math.round((budget / MIXED_CPM) * 1000 / pkg.frequency)
    : pkg.targetReachPeople;
  const maxReach = Math.round(vioData.eligibleVotersTotal * 0.8);
  const isCapped = rawReach > maxReach;
  const customReachPeople = isCapped ? maxReach : rawReach;
  const customReachPct = customReachPeople / vioData.eligibleVotersTotal;

  // DOOH entry
  const regionName = briefing.politikRegion ?? briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';
  const regionType = briefing.politikRegionType ?? briefing.selectedRegions?.[0]?.type ?? 'schweiz';
  const kantonCode = briefing.selectedRegions?.[0]?.kanton;
  let doohEntry: DoohEntry | undefined;
  if (regionType === 'schweiz') {
    doohEntry = DOOH_DATA.find(d => d.type === 'schweiz');
  } else if (regionType === 'stadt') {
    doohEntry = DOOH_DATA.find(d => d.type === 'stadt' && d.name === regionName);
  } else {
    doohEntry = DOOH_DATA.find(d => d.type === 'kanton' && d.kanton === kantonCode);
  }
  const doohScreenCount = doohEntry?.screens_politik ?? 0;
  const displayPersonen = Math.round(customReachPeople * 0.3);

  const inhabitants = getInhabitants((briefing.selectedRegions ?? []).map(r => r.name));
  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;

  // Slider fill percentages
  const budgetPct = Math.min(100, Math.max(0, ((budget - 2500) / (150000 - 2500)) * 100));
  const durPct    = Math.min(100, ((laufzeitWeeks - 1) / 7) * 100);
  const barPct    = Math.min(100, (customReachPct / 0.8) * 100);

  // Feasibility (same logic, updated end = voteDate - 3)
  const isPkgFeasible = (key: PkgKey): boolean => {
    if (!campaignEndISO) return true;
    const today = todayISO();
    const earliestStart = addDays(today, 10);
    const ms = new Date(campaignEndISO + 'T00:00:00').getTime()
             - new Date(earliestStart + 'T00:00:00').getTime();
    const available = Math.floor(ms / (24 * 3600 * 1000));
    return available >= vioData.packages[key].durationDays;
  };

  const handleSelectPkg = (key: PkgKey) => {
    setSelectedPkg(key);
    setBudget(vioData.packages[key].finalBudget);
    setLaufzeitWeeks(Math.round(vioData.packages[key].durationDays / 7));
  };

  const handleNext = () => {
    updateBriefing({
      budget,
      laufzeit:    laufzeitWeeks,
      startDate:   campaignStartISO || todayISO(),
      reach:       customReachPeople,
      reachVonPct: Math.round(customReachPct * 100),
      reachBisPct: Math.round(customReachPct * 100),
      b2bReach:    null,
    });
    nextStep();
  };

  // Insight badge — only on recommendedPackage
  const getInsightBadge = (key: PkgKey) => {
    const p = vioData.packages[key];
    if (key !== vioData.recommendedPackage) return null;
    if (p.hinweis) {
      const isRed = (vioData.daysUntilVote ?? 99) < 35;
      return {
        bg: isRed ? '#FCEBEB' : '#FAEEDA',
        color: isRed ? '#791F1F' : '#633806',
        icon: isRed ? '⚠' : '⏰',
        text: p.hinweis,
      };
    }
    if (key === 'dominanz') return { bg: '#EEEDFE', color: '#3C3489', icon: '⭐', text: 'Maximale Präsenz — deckt Unterlagen-Versand und Schlussphase vollständig ab.' };
    if (key === 'praesenz') return { bg: '#EAF3DE', color: '#27500A', icon: '✓', text: 'Läuft bis 3 Tage vor Unterlagen-Versand — präsent über die gesamte Meinungsbildungsphase.' };
    return { bg: '#FAEEDA', color: '#633806', icon: '⚡', text: 'Letzter Impuls — kurz vor Unterlagen-Versand.' };
  };

  // Sidebar row helper
  const SbRow = ({ label, value, valueColor = '#2D1F52', last = false }: { label: string; value: string; valueColor?: string; last?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(107,79,187,0.07)', fontSize: 13 }}>
      <span style={{ color: '#7A7596' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );

  return (
    <section style={{ background: '#F5F3FF', minHeight: '100vh', fontFamily: "'Jost', sans-serif", paddingBottom: 60 }}>
      <style>{`
        .sp-range { width: 100%; height: 4px; border-radius: 2px; outline: none; border: none; cursor: pointer; -webkit-appearance: none; appearance: none; background: transparent; position: absolute; top: 50%; transform: translateY(-50%); margin: 0; }
        .sp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }
        .sp-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }
      `}</style>

      {/* ── Full-width header ── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 20, height: 2, background: '#6B4FBB', borderRadius: 2 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B4FBB' }}>
            {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 2'} · Politische Kampagne
          </span>
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: '#2D1F52', letterSpacing: '-0.025em', marginBottom: 4 }}>
          Wie weit soll deine Kampagne strahlen?
        </h1>
        <p style={{ fontSize: 14, color: '#7A7596', fontWeight: 300, marginBottom: 20 }}>
          Alle Preise sind dynamisch auf deine Zielregion abgestimmt.
        </p>

        {/* Context bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 14px', background: 'white', borderRadius: 12, border: '1px solid rgba(107,79,187,0.10)', marginBottom: 28 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489' }}>Politische Kampagne</span>
          {briefing.selectedRegions?.map(r => (
            <span key={r.name} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#F1EFE8', color: '#7A7596' }}>📍 {r.name}</span>
          ))}
          <span style={{ fontSize: 13, color: '#2D1F52' }}>{vioData.eligibleVotersTotal.toLocaleString('de-CH')} {inhabitants}</span>
          <span style={{ flex: 1 }} />
          {vioData.daysUntilVote != null && (
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#FAEEDA', color: '#633806', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF9F27', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />
              Abstimmung in {vioData.daysUntilVote} Tagen
            </span>
          )}
        </div>
      </div>

      {/* ── flex-row: main + sidebar ── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Section label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 12 }}>Reichweite & Paket</div>

          {/* Paket grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {PKG_ORDER.map(key => {
              const p       = vioData.packages[key];
              const isSel   = selectedPkg === key;
              const isRec   = key === vioData.recommendedPackage;
              const feasible = isPkgFeasible(key);
              const badge   = getInsightBadge(key);
              const barW    = Math.round(p.reachPercent * 100);

              return (
                <div
                  key={key}
                  onClick={() => feasible && handleSelectPkg(key)}
                  style={{
                    position: 'relative',
                    background: isSel ? 'linear-gradient(145deg,#EEEDFE 0%,#F8F7FF 100%)' : 'white',
                    border: isSel ? '2px solid #7F77DD' : '1px solid rgba(107,79,187,0.12)',
                    borderRadius: 14,
                    padding: 16,
                    cursor: feasible ? 'pointer' : 'not-allowed',
                    textAlign: 'left' as const,
                    transition: 'all 0.18s',
                    opacity: !feasible ? 0.42 : isSel ? 1 : 0.72,
                    boxShadow: isSel ? '0 8px 28px rgba(107,79,187,0.18)' : 'none',
                    transform: isSel ? 'translateY(-2px)' : 'none',
                    pointerEvents: !feasible ? 'none' as const : 'auto' as const,
                  }}
                >
                  {/* Empfohlen pill */}
                  {isRec && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#6B4FBB', color: 'white', fontSize: 10, fontWeight: 600, padding: '2px 12px', borderRadius: 20, whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Empfohlen
                    </div>
                  )}

                  {/* Check circle */}
                  <div style={{
                    position: 'absolute',
                    top: 13,
                    right: 13,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: isSel ? '#6B4FBB' : 'white',
                    border: isSel ? '1.5px solid #6B4FBB' : '1.5px solid #D3D1C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isSel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A7596' }}>{p.name}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: isSel ? '#534AB7' : '#2D1F52', margin: '2px 0' }}>
                    {fmtCHF(p.finalBudget)}
                  </div>
                  <div style={{ fontSize: 11, color: '#7A7596', marginBottom: 10 }}>
                    {Math.round(p.durationDays / 7)} Wochen Laufzeit
                  </div>

                  <div style={{ height: 0.5, background: 'rgba(107,79,187,0.10)', margin: '8px 0' }} />

                  <div style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7A7596' }}>Stimmberechtigte erreichbar</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2D1F52', marginTop: 2 }}>~{p.targetReachPeople.toLocaleString('de-CH')}</div>
                  <div style={{ fontSize: 11, color: '#7A7596', marginBottom: 5 }}>{barW}% der {inhabitants}</div>
                  <div style={{ height: 3, background: 'rgba(107,79,187,0.10)', borderRadius: 2, marginBottom: badge ? 0 : 0 }}>
                    <div style={{ height: 3, borderRadius: 2, background: '#7F77DD', width: `${barW}%` }} />
                  </div>

                  {/* Insight badge — only on recommended */}
                  {badge && (
                    <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.5, display: 'flex', gap: 7, alignItems: 'flex-start', background: badge.bg, color: badge.color }}>
                      <span style={{ flexShrink: 0, marginTop: 1 }}>{badge.icon}</span>
                      {badge.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 12 }}>Wie deine Werbung ausgespielt wird</div>

          {/* Channel Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* DOOH Card */}
            <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', minHeight: 230 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(165deg,rgba(45,31,82,0.88) 0%,rgba(107,79,187,0.65) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 2, padding: 20, minHeight: 230, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4, marginTop: 20 }}>DOOH · Im öffentlichen Raum</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>bis zu {doohScreenCount.toLocaleString('de-CH')}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12, marginTop: 2 }}>digitale Screens</div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {['Bahnhöfe & ÖV', 'Einkaufszentren', 'Tankstellen'].map(b => (
                      <li key={b} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Display Card */}
            <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', minHeight: 230 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(165deg,rgba(8,50,41,0.88) 0%,rgba(29,158,117,0.65) 100%)' }} />
              <div style={{ position: 'relative', zIndex: 2, padding: 20, minHeight: 230, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="white" strokeWidth="1.8"/><path d="M8 10h8M8 14h5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', marginBottom: 4, marginTop: 20 }}>Display · Online</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: 'white', lineHeight: 1.1 }}>~{displayPersonen.toLocaleString('de-CH')}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 12, marginTop: 2 }}>Personen erreichbar</div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {['Schweizer Newsportale', 'Blogs & Magazine', 'Apps mit CH-Usern'].map(b => (
                      <li key={b} style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 12 }}>Budget & Laufzeit</div>

          {/* Sliders box */}
          <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 16, padding: 22, marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Budget slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#7A7596' }}>Budget</span>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#6B4FBB' }}>{fmtCHF(budget)}</span>
              </div>
              <div style={{ position: 'relative', height: 4, background: '#EDE8F7', borderRadius: 2 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#6B4FBB', borderRadius: 2, width: `${budgetPct}%`, pointerEvents: 'none' }} />
                <input type="range" className="sp-range" min={2500} max={150000} step={500} value={budget} onChange={e => setBudget(Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A7596', marginTop: 6 }}>
                <span>CHF 2&apos;500</span><span>CHF 150&apos;000</span>
              </div>
            </div>

            {/* Laufzeit slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#7A7596' }}>Laufzeit</span>
                <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#6B4FBB' }}>{laufzeitWeeks} Woche{laufzeitWeeks !== 1 ? 'n' : ''}</span>
              </div>
              <div style={{ position: 'relative', height: 4, background: '#EDE8F7', borderRadius: 2 }}>
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#6B4FBB', borderRadius: 2, width: `${durPct}%`, pointerEvents: 'none' }} />
                <input type="range" className="sp-range" min={1} max={8} step={1} value={laufzeitWeeks} onChange={e => setLaufzeitWeeks(Number(e.target.value))} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A7596', marginTop: 6 }}>
                <span>1 Woche</span><span>8 Wochen</span>
              </div>
            </div>
          </div>

          {/* Vote hint */}
          {briefing.votingDate && campaignStartISO && (
            <div style={{ background: '#FAEEDA', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#633806', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="#BA7517" strokeWidth="1.4"/>
                <path d="M5 1v3M11 1v3M2 7h12" stroke="#BA7517" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>
                Rückwärts gerechnet vom Wahlsonntag <strong>{fmtLong(briefing.votingDate)}</strong>: Kampagnenstart <strong>{fmtLong(campaignStartISO)}</strong> — <strong>{fmtLong(campaignEndISO)}</strong> (3 Tage vor Abstimmung).
              </span>
            </div>
          )}

          {/* Tipp box */}
          <div style={{ background: 'rgba(107,79,187,0.06)', borderLeft: '3px solid #6B4FBB', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 13, color: '#7A7596', marginBottom: 20 }}>
            💡 <strong style={{ color: '#2D1F52' }}>Tipp:</strong> Mit etwas mehr Budget lässt sich die Reichweite deutlich steigern.
          </div>

          {/* CTA */}
          <button
            type="button"
            onClick={handleNext}
            style={{ background: '#6B4FBB', color: 'white', border: 'none', borderRadius: 100, padding: '16px 32px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3C3489'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6B4FBB'; }}
          >
            Weiter zu den Werbemitteln →
          </button>
        </div>

        {/* ── SIDEBAR ── */}
        <div style={{ width: 268, flexShrink: 0, position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Card 1: Deine Kampagne */}
          <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 6 }}>Deine Kampagne</div>

            {/* Reach block */}
            <div style={{ textAlign: 'center', padding: '14px 0 16px', borderBottom: '1px solid rgba(107,79,187,0.08)', marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 4 }}>Stimmberechtigte erreichbar</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: '#534AB7', lineHeight: 1.1 }}>~{customReachPeople.toLocaleString('de-CH')}</div>
              <div style={{ fontSize: 12, color: '#7A7596', marginTop: 3 }}>{Math.round(customReachPct * 100)}% der {inhabitants}</div>
              <div style={{ marginTop: 10 }}>
                <div style={{ height: 4, background: '#F1EFE8', borderRadius: 2 }}>
                  <div style={{ height: 4, background: '#7F77DD', borderRadius: 2, width: `${barPct}%`, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 10, color: '#7A7596' }}>
                  <span>0%</span>
                  <span>{Math.round(customReachPct * 100)}%</span>
                  <span>80% (max)</span>
                </div>
              </div>
            </div>

            <SbRow label="Paket" value={pkg.name} />
            <SbRow label="Budget" value={fmtCHF(budget)} valueColor="#6B4FBB" />
            <SbRow label="Laufzeit" value={`${laufzeitWeeks} Woche${laufzeitWeeks !== 1 ? 'n' : ''}`} />
            <SbRow label="Kampagnenstart" value={campaignStartISO ? fmtMed(campaignStartISO) : '—'} />
            <SbRow label="Wahlsonntag" value={briefing.votingDate ? fmtMed(briefing.votingDate) : '—'} valueColor="#BA7517" last />
          </div>

          {/* Card 2: Deine Zielregion */}
          <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 6 }}>Deine Zielregion</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B4FBB', marginBottom: 2 }}>📍 {regionName}</div>
            <div style={{ fontSize: 12, color: '#7A7596', marginBottom: 10 }}>{vioData.eligibleVotersTotal.toLocaleString('de-CH')} Stimmberechtigte</div>
            <SbRow label="Polit. Screens" value={doohScreenCount.toLocaleString('de-CH')} />
            <SbRow label="Reichweite" value={`~${Math.round(customReachPct * 100)}%`} last />
            <div style={{ fontSize: 10, color: '#888780', marginTop: 8 }}>Quelle: VIO DOOH-Screendaten & BFS 2023</div>
          </div>

          {/* Card 3: Fragen? */}
          <div style={{ background: '#EEEDFE', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 6 }}>Fragen?</div>
            <p style={{ fontSize: 12, color: '#7A7596', lineHeight: 1.6, marginBottom: 12, margin: '0 0 12px 0' }}>
              Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_CALENDLY_URL || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'block', background: '#6B4FBB', color: 'white', border: 'none', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: "'Jost', sans-serif", textAlign: 'center', textDecoration: 'none' }}
            >
              Gespräch buchen →
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}
