'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import { calculateImpact, coupleBudgetToLaufzeit, getLaufzeitCorridor } from '@/lib/preislogik';
import { ALL_REGIONS } from '@/lib/regions';
import type { Region } from '@/lib/regions';
import doohScreensRaw from '@/lib/dooh-screens.json';
import ImpactIndicator from '@/components/shared/ImpactIndicator';
import CampaignHint from '@/components/shared/CampaignHint';

type DoohEntry = { type: string; name?: string; kanton: string; screens: number; screens_politik: number; standorte: number; reach: number };
const DOOH_DATA = doohScreensRaw as DoohEntry[];

type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz';

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
  const endISO = votingDate; // endet am Abstimmungstag
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
export default function StepSummaryPolitik({ briefing, updateBriefing, nextStep, stepNumber }: Props) {
  // Rekonstruiere Region[]-Objekte aus briefing (stimm-Werte sind enthalten, aber wir brauchen Region-Typen für klassifiziereRegion)
  const selectedRegionsFull: Region[] = (briefing.selectedRegions ?? []).map(r => {
    const match = ALL_REGIONS.find(x => x.name === r.name);
    if (match) return match;
    // Fallback falls Region nicht gefunden (sollte nicht passieren, Schutz vor Crash)
    return {
      name: r.name,
      type: (r.type as 'stadt' | 'kanton' | 'schweiz') ?? 'stadt',
      kanton: r.kanton ?? 'CH',
      pop: r.stimm * 2,  // grobe Schätzung, wird nur im Edge-Case genutzt
      stimm: r.stimm,
    };
  });

  const vioData = briefing.vioPackages ?? null;
  const selectedPkg = (briefing.selectedPackage ?? vioData?.recommendedPackage ?? 'praesenz') as PkgKey;

  if (!vioData) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: '#7A7596' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 2 zurück.
      </section>
    );
  }

  const pkg = vioData.packages[selectedPkg];
  const initBudget = briefing.budget && briefing.budget > 0
    ? briefing.budget
    : (briefing.recommendedBudget && briefing.recommendedBudget > 0
        ? briefing.recommendedBudget
        : pkg.finalBudget);
  const initLaufzeit = briefing.laufzeit && briefing.laufzeit > 0
    ? briefing.laufzeit
    : Math.round(pkg.durationDays / 7);

  const [budget, setBudget] = useState<number>(initBudget);
  const [laufzeitWeeks, setLaufzeitWeeks] = useState<number>(initLaufzeit);
  const [budgetRef, setBudgetRef] = useState<{ budget: number; days: number }>({
    budget: initBudget,
    days: initLaufzeit * 7,
  });

  // Derived
  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;
  const inhabitants = getInhabitants((briefing.selectedRegions ?? []).map(r => r.name));
  const regionName = briefing.politikRegion ?? briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';
  const regionType = briefing.politikRegionType ?? briefing.selectedRegions?.[0]?.type ?? 'schweiz';
  const kantonCode = briefing.selectedRegions?.[0]?.kanton;

  // DOOH
  let doohEntry: DoohEntry | undefined;
  if (regionType === 'schweiz') {
    doohEntry = DOOH_DATA.find(d => d.type === 'schweiz');
  } else if (regionType === 'stadt') {
    doohEntry = DOOH_DATA.find(d => d.type === 'stadt' && d.name === regionName);
  } else {
    doohEntry = DOOH_DATA.find(d => d.type === 'kanton' && d.kanton === kantonCode);
  }
  const doohScreenCount = doohEntry?.screens_politik ?? 0;

  // Campaign dates
  const { startISO: campaignStartISO, endISO: campaignEndISO } = briefing.votingDate
    ? calcCampaignDates(briefing.votingDate, laufzeitWeeks)
    : { startISO: '', endISO: '' };

  // Reach — via calculateImpact (neue preislogik)
  const impact = selectedRegionsFull.length > 0
    ? calculateImpact({
        budget: budget,
        laufzeitDays: laufzeitWeeks * 7,
        regions: selectedRegionsFull,
      })
    : null;

  const customReachPeople = impact?.reachMitte ?? pkg.targetReachPeople;
  const customReachPct = vioData.eligibleVotersTotal > 0
    ? customReachPeople / vioData.eligibleVotersTotal
    : 0;
  const displayPersonen = Math.round(customReachPeople * (impact?.displayShare ?? 0.3));

  const adjustedBudget = budget;

  // Slider fill + corridor
  const corridor = getLaufzeitCorridor(budget);
  const laufzeitMinWeeks = Math.ceil(corridor.minDays / 7);
  const laufzeitMaxWeeks = Math.floor(corridor.maxDays / 7);
  const budgetPct = Math.min(100, Math.max(0, ((budget - 4000) / (100000 - 4000)) * 100));
  const durPct = laufzeitMaxWeeks > laufzeitMinWeeks
    ? Math.min(100, Math.max(0, ((laufzeitWeeks - laufzeitMinWeeks) / (laufzeitMaxWeeks - laufzeitMinWeeks)) * 100))
    : 100;

  const handleNext = () => {
    updateBriefing({
      budget:      adjustedBudget,
      laufzeit:    laufzeitWeeks,
      startDate:   campaignStartISO || todayISO(),
      reach:       impact?.reachMitte ?? pkg.targetReachPeople,
      reachVonPct: impact?.reachVonPct ?? 0,
      reachBisPct: impact?.reachBisPct ?? 0,
      b2bReach:    null,
    });
    nextStep();
  };

  const SbRow = ({ label, value, valueColor = '#2D1F52', last = false }: { label: string; value: string; valueColor?: string; last?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(107,79,187,0.07)', fontSize: 13 }}>
      <span style={{ color: '#7A7596' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );

  return (
    <section style={{ background: '#F5F3FF', minHeight: '100vh', fontFamily: "'Jost', sans-serif", paddingBottom: 60 }}>
      <style>{`
        .ss-range { width: 100%; height: 4px; border-radius: 2px; outline: none; border: none; cursor: pointer; -webkit-appearance: none; appearance: none; background: transparent; position: absolute; top: 50%; transform: translateY(-50%); margin: 0; }
        .ss-range::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }
        .ss-range::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }
      `}</style>

      {/* ── Header ── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 20, height: 2, background: '#6B4FBB', borderRadius: 2 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B4FBB' }}>
            {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 3'} · Politische Kampagne
          </span>
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: '#2D1F52', letterSpacing: '-0.025em', marginBottom: 4 }}>
          Deine Kampagne im Überblick
        </h1>
        <p style={{ fontSize: 14, color: '#7A7596', fontWeight: 300, marginBottom: 20 }}>
          Passe Budget, Laufzeit und Intensität individuell an.
        </p>

        {/* Context bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 14px', background: 'white', borderRadius: 12, border: '1px solid rgba(107,79,187,0.10)', marginBottom: 28 }}>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#EEEDFE', color: '#3C3489' }}>Politische Kampagne</span>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#F5F2FF', color: '#6B4FBB' }}>{pkg.name}</span>
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

          {/* Section label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 12 }}>Wie deine Werbung ausgespielt wird</div>

          {/* Channel Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {/* DOOH Card */}
            <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', minHeight: 230 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url('/images/vio-dooh-bahnhof.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
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
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "url('/images/vio-display-phone.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
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

          {/* Wirkungsindikator */}
          {impact && (
            <ImpactIndicator
              impact={impact}
              regionName={regionName}
            />
          )}

          {/* Kampagnen-Hinweise */}
          {impact && impact.hinweise.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <CampaignHint
                hinweise={impact.hinweise}
                onBookConsult={() => {
                  window.open(process.env.NEXT_PUBLIC_CALENDLY_URL ?? '#', '_blank');
                }}
              />
            </div>
          )}

          {/* Section label */}
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 12, marginTop: 24 }}>Budget & Laufzeit</div>

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
                <input type="range" className="ss-range" min={4000} max={100000} step={500} value={budget} onChange={e => {
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
                <input type="range" className="ss-range" min={laufzeitMinWeeks} max={laufzeitMaxWeeks} step={1} value={laufzeitWeeks} onChange={e => {
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

          {/* Vote hint */}
          {briefing.votingDate && campaignStartISO && (
            <div style={{ background: '#FAEEDA', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#633806', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="#BA7517" strokeWidth="1.4"/>
                <path d="M5 1v3M11 1v3M2 7h12" stroke="#BA7517" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              <span>
                Rückwärts gerechnet vom Wahlsonntag <strong>{fmtLong(briefing.votingDate)}</strong>: Kampagnenstart <strong>{fmtLong(campaignStartISO)}</strong> — Kampagnenende <strong>{fmtLong(campaignEndISO)}</strong> (Abstimmungstag).
              </span>
            </div>
          )}

          {/* Tipp box */}
          <div style={{ background: 'rgba(107,79,187,0.06)', borderLeft: '3px solid #6B4FBB', borderRadius: '0 8px 8px 0', padding: '10px 14px', fontSize: 13, color: '#7A7596', marginBottom: 20 }}>
            <strong style={{ color: '#2D1F52' }}>Tipp:</strong> Mit etwas mehr Budget lässt sich die Reichweite deutlich steigern.
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


            <SbRow label="Paket" value={pkg.name} />
            <SbRow label="Budget" value={fmtCHF(adjustedBudget)} valueColor="#6B4FBB" />
            <SbRow label="Laufzeit" value={`${laufzeitWeeks} Woche${laufzeitWeeks !== 1 ? 'n' : ''}`} />
            <SbRow label="Kampagnenstart" value={campaignStartISO ? fmtMed(campaignStartISO) : '—'} />
            <SbRow label="Wahlsonntag" value={briefing.votingDate ? fmtMed(briefing.votingDate) : '—'} valueColor="#BA7517" last />
          </div>

          {/* Card 2: Zielregion */}
          <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 6 }}>Deine Zielregion</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B4FBB', marginBottom: 2 }}>{regionName}</div>
            <div style={{ fontSize: 12, color: '#7A7596', marginBottom: 10 }}>{vioData.eligibleVotersTotal.toLocaleString('de-CH')} Stimmberechtigte</div>
            <SbRow label="Polit. Screens" value={doohScreenCount.toLocaleString('de-CH')} />
            <SbRow label="Reichweite" value={`~${Math.round(customReachPct * 100)}%`} last />
            <div style={{ fontSize: 10, color: '#888780', marginTop: 8 }}>Quelle: VIO DOOH-Screendaten & BFS 2023</div>
          </div>

          {/* Card 3: Fragen? */}
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
