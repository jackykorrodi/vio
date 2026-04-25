'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import { buildVioPackagesV2 } from '@/lib/preislogik-adapter';
import { calculateImpact, coupleBudgetToLaufzeit, getLaufzeitCorridor } from '@/lib/preislogik';
import { ALL_REGIONS } from '@/lib/regions';
import ImpactIndicator from '@/components/shared/ImpactIndicator';
import CampaignHint from '@/components/shared/CampaignHint';
import type { Region } from '@/lib/regions';

type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz';
const PKG_ORDER: PkgKey[] = ['sichtbar', 'praesenz', 'dominanz'];

// ─── Date helpers ─────────────────────────────────────────────────────────────
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
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

const MONTHS_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function fmtShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtLong(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
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
  // Rekonstruiere Region[]-Objekte aus briefing (brauchen Typ für klassifiziereRegion)
  const selectedRegionsFull: Region[] = (briefing.selectedRegions ?? []).map(r => {
    const match = ALL_REGIONS.find(x => x.name === r.name);
    if (match) return match;
    return {
      name: r.name,
      type: (r.type as 'stadt' | 'kanton' | 'schweiz') ?? 'stadt',
      kanton: r.kanton ?? 'CH',
      pop: r.stimm * 2,
      stimm: r.stimm,
    };
  });

  const vioData = selectedRegionsFull.length === 0
    ? (briefing.vioPackages ?? null)
    : buildVioPackagesV2({
        regions: selectedRegionsFull,
        voteDate: briefing.votingDate ?? null,
        campaignType: briefing.politikType ?? undefined,
      });

  // FIX 1: hasBudget only when budget >= 4000
  const userBudget = briefing.recommendedBudget ?? 0;
  const hasBudget = userBudget >= 4000;

  const initPkg = (() => {
    if (!hasBudget) return (briefing.selectedPackage ?? vioData?.recommendedPackage ?? 'praesenz') as PkgKey;
    // Wähle das Paket dessen finalBudget am nächsten zum userBudget liegt (von unten)
    const budgets: [PkgKey, number][] = [
      ['sichtbar', vioData?.packages.sichtbar.finalBudget ?? 0],
      ['praesenz', vioData?.packages.praesenz.finalBudget ?? 0],
      ['dominanz', vioData?.packages.dominanz.finalBudget ?? 0],
    ];
    // Nimm das grösste Paket das <= userBudget ist, sonst sichtbar
    const fit = budgets.filter(([, b]) => b <= userBudget);
    return (fit.length > 0 ? fit[fit.length - 1][0] : 'sichtbar') as PkgKey;
  })();
  const [selectedPkg, setSelectedPkg] = useState<PkgKey>(initPkg);
  const [showAllPackets, setShowAllPackets] = useState<boolean>(!hasBudget);

  // FIX 2: Budget/Laufzeit/Frequenz slider state
  const initBudget = userBudget >= 4000 ? userBudget : (vioData?.packages[initPkg]?.finalBudget ?? 9500);
  const [budget, setBudget] = useState<number>(initBudget);
  const [laufzeitWeeks, setLaufzeitWeeks] = useState(() =>
    Math.round((vioData?.packages[initPkg].durationDays ?? 28) / 7)
  );
  const [budgetRef, setBudgetRef] = useState<{ budget: number; days: number }>({
    budget: initBudget,
    days: vioData?.packages[initPkg].durationDays ?? 28,
  });
  const [adjOpen, setAdjOpen] = useState<boolean>(false);

  if (!vioData) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: '#7A7596' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 1 zurück.
      </section>
    );
  }

  // Campaign dates
  const { startISO: campaignStartISO, endISO: campaignEndISO } = briefing.votingDate
    ? calcCampaignDates(briefing.votingDate, laufzeitWeeks)
    : { startISO: '', endISO: '' };

  const inhabitants = getInhabitants((briefing.selectedRegions ?? []).map(r => r.name));
  const regionName = briefing.politikRegion ?? briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';
  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;

  // Live-Berechnung per Paket — via calculateImpact (neue preislogik)
  const getAdjustedValues = (key: PkgKey) => {
    const p = vioData.packages[key];
    const isSelected = key === selectedPkg;

    // Für nicht-selektierte Pakete: Paket-Default-Werte direkt verwenden (aus adapter/preislogik)
    if (!isSelected) {
      return {
        budget: p.finalBudget,
        reach: p.targetReachPeople,
        pct: Math.round(p.reachPercent * 100),
      };
    }

    // Für selektiertes Paket: Budget/Laufzeit kommen aus lokalem State (Slider)
    // calculateImpact liefert konsistente Reach-Berechnung inkl. Screen-Klassen, Delivery-Faktoren, Wearout
    if (selectedRegionsFull.length === 0) {
      return {
        budget: budget,
        reach: p.targetReachPeople,
        pct: Math.round(p.reachPercent * 100),
      };
    }

    const impact = calculateImpact({
      budget: budget,
      laufzeitDays: laufzeitWeeks * 7,
      regions: selectedRegionsFull,
    });

    const adjBudget = budget;

    return {
      budget: adjBudget,
      reach: impact.reachMitte,
      pct: vioData.eligibleVotersTotal > 0
        ? Math.round((impact.reachMitte / vioData.eligibleVotersTotal) * 100)
        : 0,
    };
  };
  const adjustedBudget = getAdjustedValues(selectedPkg).budget;
  const adjustedReach  = getAdjustedValues(selectedPkg).reach;

  // Impact-Objekt für ImpactIndicator + CampaignHint (nur für selektiertes Paket)
  const liveImpact = selectedRegionsFull.length > 0
    ? calculateImpact({
        budget: budget,
        laufzeitDays: laufzeitWeeks * 7,
        regions: selectedRegionsFull,
      })
    : null;

  // Slider fill percentages + corridor
  const corridor = getLaufzeitCorridor(budget);
  const laufzeitMinWeeks = Math.ceil(corridor.minDays / 7);
  const laufzeitMaxWeeks = Math.floor(corridor.maxDays / 7);
  const budgetPct = Math.min(100, Math.max(0, ((budget - 4000) / (100000 - 4000)) * 100));
  const durPct = laufzeitMaxWeeks > laufzeitMinWeeks
    ? Math.min(100, Math.max(0, ((laufzeitWeeks - laufzeitMinWeeks) / (laufzeitMaxWeeks - laufzeitMinWeeks)) * 100))
    : 100;

  // Feasibility — immer true, Datums-Validierung passiert in StepSummaryPolitik
  const isPkgFeasible = (_key: PkgKey): boolean => true;

  const handleSelectPkg = (key: PkgKey) => {
    setSelectedPkg(key);
    const newBudget = vioData.packages[key].finalBudget;
    const newDays = vioData.packages[key].durationDays;
    setBudget(newBudget);
    setLaufzeitWeeks(Math.round(newDays / 7));
    setBudgetRef({ budget: newBudget, days: newDays });
  };

  const handleNext = () => {
    const adj = getAdjustedValues(selectedPkg);
    updateBriefing({
      selectedPackage: selectedPkg,
      budget:      adj.budget,
      laufzeit:    laufzeitWeeks,
      startDate:   campaignStartISO || todayISO(),
      reach:       adj.reach,
      reachVonPct: adj.pct,
      reachBisPct: adj.pct,
      b2bReach:    null,
    });
    nextStep();
  };

  // FIX 3: Insight badge — alle 3 Pakete
  const getInsightBadge = (key: PkgKey) => {
    const p = vioData.packages[key];
    if (key === vioData.recommendedPackage && p.hinweis) {
      const isRed = (vioData.daysUntilVote ?? 99) < 35;
      return {
        bg: isRed ? '#FCEBEB' : '#FAEEDA',
        color: isRed ? '#791F1F' : '#633806',
        icon: '',
        text: p.hinweis,
      };
    }
    if (key === 'dominanz') return { bg: '#EEEDFE', color: '#3C3489', icon: '', text: 'Maximale Präsenz — deckt Unterlagen-Versand und Schlussphase vollständig ab.' };
    if (key === 'praesenz') return { bg: '#EAF3DE', color: '#27500A', icon: '', text: 'Läuft rund um den Unterlagen-Versand — optimale Präsenz in der Meinungsbildungsphase.' };
    return { bg: '#FAEEDA', color: '#633806', icon: '', text: 'Letzter Impuls vor dem Unterlagen-Versand.' };
  };

  const SbRow = ({ label, value, valueColor = '#2D1F52', last = false }: { label: string; value: string; valueColor?: string; last?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(107,79,187,0.07)', fontSize: 13 }}>
      <span style={{ color: '#7A7596' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );

  const pkgKeysToShow: PkgKey[] = (hasBudget && !showAllPackets)
    ? [(vioData.recommendedPackage as PkgKey)]
    : PKG_ORDER;

  return (
    <section style={{ background: '#F5F3FF', minHeight: '100vh', fontFamily: "'Jost', sans-serif", paddingBottom: 60 }}>
      <style>{`
        .sp-range { width: 100%; height: 4px; border-radius: 2px; outline: none; border: none; cursor: pointer; -webkit-appearance: none; appearance: none; background: transparent; position: absolute; top: 50%; transform: translateY(-50%); margin: 0; }
        .sp-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }
        .sp-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }
        .sp-ctx-tag { border-radius: 10px; padding: 9px 11px; font-size: 11px; line-height: 1.45; display: flex; gap: 6px; align-items: flex-start; margin-top: 10px; }
        .sp-ctx-tag.warn { background: #FCEBEB; color: #791F1F; }
        .sp-ctx-tag.ok   { background: #EAF3DE; color: #27500A; }
        .sp-ctx-tag.star { background: #FAEEDA; color: #633806; }
      `}</style>

      {/* ── Header ── */}
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
            <span key={r.name} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#F1EFE8', color: '#7A7596' }}>{r.name}</span>
          ))}
          <span style={{ fontSize: 13, color: '#2D1F52' }}>{vioData.eligibleVotersTotal.toLocaleString('de-CH')} {inhabitants}</span>
          <span style={{ flex: 1 }} />
          {vioData.daysUntilVote != null && (
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#FAEEDA', color: '#633806', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF9F27', display: 'inline-block' }} />
              Abstimmung in {vioData.daysUntilVote} Tagen
            </span>
          )}
        </div>
      </div>

      {/* ── flex-row: main + sidebar ── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 12 }}>Reichweite & Paket</div>

          {/* hasBudget info banner */}
          {hasBudget && !showAllPackets && (
            <div style={{ background: '#EEEDFE', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#3C3489', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <span>
                Basierend auf deinem Budget von <strong>{fmtCHF(userBudget)}</strong> haben wir das passende Paket vorausgewählt.
                {userBudget < vioData.packages[vioData.recommendedPackage as PkgKey].finalBudget && (
                  <span style={{ display: 'block', color: '#633806', marginTop: 4, fontSize: 12 }}>
                    Dein Budget ist etwas knapp für diese Region — mit {fmtCHF(vioData.packages[vioData.recommendedPackage as PkgKey].finalBudget)} erzielst du deutlich mehr Wirkung.
                  </span>
                )}
              </span>
              <button type="button" onClick={() => setShowAllPackets(true)} style={{ background: 'none', border: 'none', color: '#6B4FBB', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Anderes Paket wählen →
              </button>
            </div>
          )}

          {/* Paket grid */}
          <div style={{ display: 'grid', gridTemplateColumns: (hasBudget && !showAllPackets) ? '1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            {pkgKeysToShow.map(key => {
              const p = vioData.packages[key];
              const isSel = selectedPkg === key;
              const isRec = key === vioData.recommendedPackage;
              const adj = getAdjustedValues(key);
              const badge = getInsightBadge(key);

              return (
                <div
                  key={key}
                  onClick={() => handleSelectPkg(key)}
                  style={{
                    position: 'relative',
                    background: isSel ? '#F0ECFA' : 'white',
                    border: isSel ? '2.5px solid #6B4FBB' : '1px solid rgba(107,79,187,0.12)',
                    borderRadius: 14,
                    padding: 16,
                    cursor: 'pointer',
                    textAlign: 'left' as const,
                    transition: 'all 0.18s',
                    opacity: 1,
                    boxShadow: isSel ? '0 4px 20px rgba(107,79,187,0.18)' : 'none',
                    transform: isSel ? 'translateY(-3px)' : 'none',
                  }}
                >
                  {isRec && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#6B4FBB', color: 'white', fontSize: 10, fontWeight: 600, padding: '2px 12px', borderRadius: 20, whiteSpace: 'nowrap', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Empfohlen
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 13, right: 13, width: 18, height: 18, borderRadius: '50%', background: isSel ? '#6B4FBB' : 'white', border: isSel ? '1.5px solid #6B4FBB' : '1.5px solid #D3D1C7', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                    {isSel && <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'white' }} />}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7A7596' }}>{p.name}</div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: isSel ? '#534AB7' : '#2D1F52', margin: '2px 0' }}>{fmtCHF(adj.budget)}</div>
                  <div style={{ fontSize: 11, color: '#7A7596', marginBottom: 10 }}>{Math.round(p.durationDays / 7)} Wochen Laufzeit</div>
                  <div style={{ height: 0.5, background: 'rgba(107,79,187,0.10)', margin: '8px 0' }} />
                  <div style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7A7596' }}>Stimmberechtigte erreichbar</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2D1F52', marginTop: 2 }}>~{adj.reach.toLocaleString('de-CH')}</div>
                  <div style={{ fontSize: 11, color: '#7A7596', marginBottom: 5 }}>{adj.pct}% der {inhabitants}</div>
                  <div style={{ height: 3, background: 'rgba(107,79,187,0.10)', borderRadius: 2 }}>
                    <div style={{ height: 3, borderRadius: 2, background: '#7F77DD', width: `${adj.pct}%` }} />
                  </div>
                  {badge && (
                    <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, fontSize: 11, lineHeight: 1.5, background: badge.bg, color: badge.color }}>
                      {badge.text}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {hasBudget && showAllPackets && (
            <button type="button" onClick={() => setShowAllPackets(false)} style={{ background: 'none', border: 'none', color: '#7A7596', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
              ← Zurück zur Vorauswahl
            </button>
          )}

          {/* ── Budget & Laufzeit (eingeklappt) ── */}
          <div style={{ marginTop: 16 }}>
            <div
              onClick={() => setAdjOpen(o => !o)}
              style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 14, padding: '14px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'background .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#F5F3FF'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'white'; }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 5h12M5 8h6M7 11h2" stroke="#6B4FBB" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#2D1F52', flex: 1 }}>Budget &amp; Laufzeit anpassen</span>
              <svg style={{ transform: adjOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="#7A7596" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>

            {adjOpen && (
              <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 16, padding: 22, marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {/* Budget slider */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: '#7A7596' }}>Budget</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 700, color: '#6B4FBB' }}>{fmtCHF(budget)}</span>
                  </div>
                  <div style={{ position: 'relative', height: 4, background: '#EDE8F7', borderRadius: 2 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: '#6B4FBB', borderRadius: 2, width: `${budgetPct}%`, pointerEvents: 'none' }} />
                    <input type="range" className="sp-range" min={4000} max={100000} step={500} value={budget} onChange={e => {
                      const newBudget = Number(e.target.value);
                      setBudget(newBudget);
                      setBudgetRef({ budget: newBudget, days: laufzeitWeeks * 7 });
                      const c = getLaufzeitCorridor(newBudget);
                      const minW = Math.ceil(c.minDays / 7);
                      const maxW = Math.floor(c.maxDays / 7);
                      if (laufzeitWeeks < minW) setLaufzeitWeeks(minW);
                      if (laufzeitWeeks > maxW) setLaufzeitWeeks(maxW);
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A7596', marginTop: 6 }}>
                    <span>CHF 4&apos;000</span><span>CHF 100&apos;000</span>
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
                    <input type="range" className="sp-range" min={laufzeitMinWeeks} max={laufzeitMaxWeeks} step={1} value={laufzeitWeeks} onChange={e => {
                      const newWeeks = Number(e.target.value);
                      setLaufzeitWeeks(newWeeks);
                      const coupled = coupleBudgetToLaufzeit(budgetRef.budget, budgetRef.days, newWeeks * 7);
                      setBudget(coupled);
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#7A7596', marginTop: 6 }}>
                    <span>{laufzeitMinWeeks} Woche{laufzeitMinWeeks !== 1 ? 'n' : ''}</span><span>{laufzeitMaxWeeks} Wochen</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Kontaktfrequenz (Read-only, aus calculateImpact) ── */}
          {(() => {
            const impact = selectedRegionsFull.length > 0
              ? calculateImpact({
                  budget: budget,
                  laufzeitDays: laufzeitWeeks * 7,
                  regions: selectedRegionsFull,
                })
              : null;
            const fWeekly = impact?.frequencyWeekly
              ?? vioData.packages[selectedPkg].frequency
              ?? 5;
            const fCampaign = Math.round(fWeekly * laufzeitWeeks);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: 'rgba(107,79,187,0.04)', borderRadius: 10, border: '1px solid rgba(107,79,187,0.10)', marginTop: 12 }}>
                <span style={{ fontSize: 13, color: '#7A7596' }}>Ø Kontaktfrequenz</span>
                <span style={{ marginLeft: 'auto', fontSize: 15, fontWeight: 700, color: '#2D1F52' }}>
                  {fCampaign}× pro Person
                </span>
                <span style={{ fontSize: 12, color: '#9A90BB' }}>
                  (≈ {fWeekly.toFixed(1)}× / Woche)
                </span>
              </div>
            );
          })()}

          {/* ── Paketbudget live (angepasst) ── */}
          <div style={{ background: '#EEEDFE', borderRadius: 12, padding: '12px 16px', marginTop: 12, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#3C3489' }}>Paketbudget (angepasst)</span>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 20, fontWeight: 800, color: '#6B4FBB' }}>{fmtCHF(adjustedBudget)}</span>
          </div>

          {/* Wirkungsindikator */}
          {liveImpact && (
            <div style={{ marginTop: 20 }}>
              <ImpactIndicator
                impact={liveImpact}
                regionName={regionName}
              />
            </div>
          )}

          {/* Kampagnen-Hinweise */}
          {liveImpact && liveImpact.hinweise.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <CampaignHint
                hinweise={liveImpact.hinweise}
                onBookConsult={() => {
                  window.open(process.env.NEXT_PUBLIC_CALENDLY_URL ?? '#', '_blank');
                }}
                onApply={(code) => {
                  if (code === 'too_thin') {
                    setLaufzeitWeeks(prev => Math.max(1, Math.round(prev / 2)));
                  }
                }}
              />
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={handleNext}
            style={{ background: '#6B4FBB', color: 'white', border: 'none', borderRadius: 100, padding: '16px 32px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', marginTop: 8 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#3C3489'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#6B4FBB'; }}
          >
            Weiter zur Zusammenfassung →
          </button>
        </div>

        {/* ── SIDEBAR — Step 1 info only ── */}
        <div style={{ width: 268, flexShrink: 0, position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 12 }}>Deine Kampagne</div>
            <SbRow label="Kampagnentyp" value="Politisch" />
            {briefing.politikType && <SbRow label="Art" value={briefing.politikType} />}
            <SbRow label="Region" value={regionName} />
            {briefing.votingDate && <SbRow label="Abstimmung" value={fmtShort(briefing.votingDate)} valueColor="#BA7517" />}
            <SbRow label="Paket" value={vioData.packages[selectedPkg].name} />
            <SbRow label="Erreichbare Personen" value={`~${adjustedReach.toLocaleString('de-CH')}`} />
            <SbRow label="Budget" value={fmtCHF(adjustedBudget)} valueColor="#6B4FBB" />
            <SbRow label="Laufzeit" value={`${laufzeitWeeks} Woche${laufzeitWeeks !== 1 ? 'n' : ''}`} last />
          </div>

          <div style={{ background: '#EEEDFE', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 6 }}>Fragen?</div>
            <p style={{ fontSize: 12, color: '#7A7596', lineHeight: 1.6, margin: '0 0 12px 0' }}>
              Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.
            </p>
            <a href={process.env.NEXT_PUBLIC_CALENDLY_URL || '#'} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', background: '#6B4FBB', color: 'white', border: 'none', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', fontFamily: "'Jost', sans-serif", textAlign: 'center', textDecoration: 'none' }}>
              Gespräch buchen →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
