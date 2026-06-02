'use client';

import { useState, useEffect, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import type { CustomConfig } from '@/lib/types';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import { calculateImpact, calculateImpactCustom, PKG_CAP_LEVEL } from '@/lib/preislogik';
import type { PaketKey, CustomImpactResult } from '@/lib/preislogik';
import { ALL_REGIONS } from '@/lib/regions';
import type { Region } from '@/lib/regions';
import doohScreensRaw from '@/lib/dooh-screens.json';
import ImpactIndicator from '@/components/shared/ImpactIndicator';
import CampaignHint from '@/components/shared/CampaignHint';
import { resolveCampaign } from '@/lib/resolve-campaign';

type DoohEntry = { type: string; name?: string; kanton: string; screens: number; screens_politik: number; standorte: number; reach: number };
const DOOH_DATA = doohScreensRaw as DoohEntry[];


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

function fmtDateShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_LONG[d.getMonth()]}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function calcCampaignDates(votingDate: string, laufzeitWeeks: number): { startISO: string; endISO: string } {
  const today = todayISO();
  const endISO = votingDate;
  const rawStart = addDays(endISO, -(laufzeitWeeks * 7));
  if (rawStart < today) {
    return { startISO: today, endISO: addDays(today, laufzeitWeeks * 7) };
  }
  return { startISO: rawStart, endISO };
}

// ─── SbRow ────────────────────────────────────────────────────────────────────
function SbRow({ label, value, valueColor = '#2D1F52', last = false }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: last ? 'none' : '1px solid rgba(107,79,187,0.07)', fontSize: 13 }}>
      <span style={{ color: '#7A7596' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
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
export default function StepSummaryPolitik({ briefing, updateBriefing, nextStep, prevStep, stepNumber }: Props) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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

  const isCustom = briefing.pfad === 'custom' && !!briefing.customConfig;
  const customConfig: CustomConfig | null = isCustom ? (briefing.customConfig ?? null) : null;
  const customImpact: CustomImpactResult | null = useMemo(() => {
    if (!isCustom || !customConfig || !selectedRegionsFull.length) return null;
    const start = customConfig.campaignStart ? new Date(customConfig.campaignStart) : undefined;
    return calculateImpactCustom({ ...customConfig, regions: selectedRegionsFull, campaignStart: start });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustom, selectedRegionsFull.map(r => r.name).join(','),
    customConfig?.budget, customConfig?.laufzeitDays, customConfig?.freqWeekly, customConfig?.doohShare]);

  const vioData = briefing.vioPackages ?? null;
  const selectedPkg = (briefing.selectedPackage ?? vioData?.recommendedPackage ?? 'praesenz') as PaketKey;
  const pkg = vioData?.packages?.[selectedPkg] ?? null;

  const rc = useMemo(() => resolveCampaign(briefing), [
    briefing.pfad,
    briefing.selectedPackage, briefing.budget, briefing.laufzeit,
    briefing.customConfig?.budget, briefing.customConfig?.laufzeitDays, briefing.customConfig?.wirkungsfokus,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    selectedRegionsFull.map(r => r.name).join(','),
  ]);
  const budget = rc.budget;
  const laufzeitWeeks = rc.laufzeitWeeks;

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

  const { startISO: campaignStartISO, endISO: campaignEndISO } = briefing.votingDate
    ? (isCustom
        ? { startISO: addDays(briefing.votingDate, -rc.laufzeitDays), endISO: briefing.votingDate }
        : calcCampaignDates(briefing.votingDate, rc.laufzeitWeeks))
    : { startISO: '', endISO: '' };

  const pkgKey = briefing.selectedPackage as PaketKey | undefined;
  const impact = (!isCustom && selectedRegionsFull.length > 0)
    ? calculateImpact({
        budget: rc.budget,
        laufzeitDays: rc.laufzeitDays,
        regions: selectedRegionsFull,
        ...(pkgKey ? { mode: 'paketLevel', paketLevel: PKG_CAP_LEVEL[pkgKey] } : {}),
      })
    : null;

  const stimmTotal = vioData?.eligibleVotersTotal ?? briefing.totalStimmber
    ?? selectedRegionsFull.reduce((s, r) => s + r.stimm, 0);
  const customReachPeople = impact?.reachUniqueAbs ?? pkg?.targetReachPeople ?? 0;
  const displayPersonen = isCustom
    ? Math.round((customImpact?.reach ?? 0) * (1 - (customConfig?.doohShare ?? 0.3)))
    : Math.round(customReachPeople * (impact?.displayShare ?? 0.3));

  const daysUntilVote = vioData?.daysUntilVote ?? (briefing.votingDate
    ? Math.ceil((new Date(briefing.votingDate + 'T00:00:00').getTime() - new Date().getTime()) / 86400000)
    : null);

  const handleNext = () => {
    updateBriefing({
      startDate: campaignStartISO || todayISO(),
      b2bReach:  null,
    });
    nextStep();
  };

  const CALENDLY_URL = process.env.NEXT_PUBLIC_CALENDLY_URL ?? '#';

  return (
    <section style={{ background: '#F5F3FF', minHeight: '100vh', fontFamily: "'Jost', sans-serif", paddingBottom: isMobile ? 88 : 60 }}>

      {/* ── Header ── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 40px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{ width: 20, height: 2, background: '#6B4FBB', borderRadius: 2 }} />
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B4FBB' }}>
            {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 3'} · Politische Kampagne
          </span>
        </div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: '#2D1F52', letterSpacing: '-0.025em', marginBottom: 14 }}>
          Deine Kampagne im Überblick
        </h1>

        {/* Compact status chip row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap', marginBottom: 28, fontSize: 13, color: '#2D1F52' }}>
          {pkg?.name && (
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, color: '#6B4FBB' }}>{pkg.name}</span>
          )}
          {briefing.selectedRegions?.map(r => (
            <span key={r.name} style={{ color: '#5A556F' }}>&ensp;·&ensp;{r.name}</span>
          ))}
          {stimmTotal > 0 && (
            <span style={{ color: '#5A556F' }}>&ensp;·&ensp;{stimmTotal.toLocaleString('de-CH')} {inhabitants}</span>
          )}
          {briefing.votingDate && daysUntilVote != null && daysUntilVote > 0 && (
            <span style={{ color: '#633806' }}>&ensp;·&ensp;Abstimmung am {fmtDateShort(briefing.votingDate)} (in {daysUntilVote} Tagen)</span>
          )}
        </div>
      </div>

      {/* ── flex-row: main + sidebar ── */}
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* ── MAIN ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Hero: Wirkungsindikator (paket only) */}
          {!isCustom && impact && (
            <ImpactIndicator impact={impact} regionName={regionName} />
          )}
          {/* Hero: Custom Reach-Block */}
          {isCustom && customImpact && (() => {
            const reachBarPct = Math.min(customImpact.reachPercent, 100);
            const satRatio = customImpact.saturationRatio;
            const reachColor = satRatio < 0.4 ? '#7A7596' : satRatio <= 1.0 ? '#6B4FBB' : '#BA7517';
            const reachWeight = satRatio < 0.4 ? 700 : 800;
            return (
              <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 16, padding: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 8 }}>
                  Deine Botschaft erreicht
                </div>
                <div style={{ fontSize: 48, fontWeight: reachWeight, color: reachColor, lineHeight: 1, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  ~{Math.round(customImpact.reach).toLocaleString('de-CH')}
                </div>
                <div style={{ fontSize: 14, color: '#7A7596', marginBottom: 16 }}>
                  Personen &nbsp;·&nbsp; {customImpact.reachPercent.toFixed(1)}% der Stimmberechtigten
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'rgba(107,79,187,0.12)', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{ height: '100%', width: `${reachBarPct}%`, background: reachColor, borderRadius: 4, transition: 'width 0.3s ease' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#7A7596', fontWeight: 600, marginBottom: 4 }}>Frequenz</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2D1F52' }}>{customConfig!.freqWeekly}×/Wo</div>
                  </div>
                  <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#7A7596', fontWeight: 600, marginBottom: 4 }}>Laufzeit</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2D1F52' }}>{customConfig!.laufzeitDays} Tage</div>
                  </div>
                  <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: '#7A7596', fontWeight: 600, marginBottom: 4 }}>Kanal-Mix</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#2D1F52' }}>{Math.round(customConfig!.doohShare * 100)}% DOOH</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* "Gespräch buchen" inline card on mobile (budget >= 20k) */}
          {isMobile && budget >= 20000 && (
            <div style={{ background: '#EEEDFE', borderRadius: 14, padding: '16px 18px', marginTop: 16 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: '#2D1F52', marginBottom: 4 }}>Persönliche Beratung</div>
              <p style={{ fontSize: 12, color: '#7A7596', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.
              </p>
              <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-block', background: '#6B4FBB', color: 'white', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, textDecoration: 'none', fontFamily: "'Jost', sans-serif" }}>
                Gespräch buchen →
              </a>
            </div>
          )}

          {/* Kampagnen-Hinweise (paket only) */}
          {!isCustom && impact && impact.hinweise.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <CampaignHint
                hinweise={impact.hinweise.filter(h => h.code !== 'ok')}
                onBookConsult={() => { window.open(CALENDLY_URL, '_blank'); }}
              />
            </div>
          )}

          {/* Compact channel info row */}
          <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 12, padding: '14px 18px', marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 2 }}>Wie deine Werbung ausgespielt wird</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" stroke="#6B4FBB" strokeWidth="1.8"/><path d="M8 21h8M12 17v4" stroke="#6B4FBB" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2D1F52' }}>DOOH · Im öffentlichen Raum</span>
                <span style={{ fontSize: 12, color: '#7A7596', marginLeft: 8 }}>bis zu {doohScreenCount.toLocaleString('de-CH')} digitale Screens</span>
              </div>
            </div>
            <div style={{ height: 1, background: 'rgba(107,79,187,0.07)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#EDF7F4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="2" stroke="#1D9E75" strokeWidth="1.8"/><path d="M8 10h8M8 14h5" stroke="#1D9E75" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2D1F52' }}>Display · Online</span>
                <span style={{ fontSize: 12, color: '#7A7596', marginLeft: 8 }}>~{displayPersonen.toLocaleString('de-CH')} Personen erreichbar</span>
              </div>
            </div>
          </div>

          {/* Vote footnote (dezent, kein Alert-Style) */}
          {briefing.votingDate && campaignStartISO && (
            <p style={{ fontSize: 11, color: '#9B96B2', lineHeight: 1.65, marginTop: 12, marginBottom: 0 }}>
              Rückwärts gerechnet vom Wahlsonntag {fmtLong(briefing.votingDate)}: Kampagnenstart {fmtLong(campaignStartISO)} — Kampagnenende {fmtLong(campaignEndISO)}.
            </p>
          )}

          {/* CTAs (desktop) */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' }}>
              {prevStep && (
                <button
                  type="button"
                  onClick={prevStep}
                  style={{ background: 'white', color: '#6B4FBB', border: '1.5px solid rgba(107,79,187,0.30)', borderRadius: 100, padding: '14px 24px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                >
                  ← Etwas anpassen
                </button>
              )}
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
          )}
        </div>

        {/* ── SIDEBAR (desktop only) ── */}
        {!isMobile && (
          <div style={{ width: 248, flexShrink: 0, position: 'sticky', top: 72, display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Mini-Summary Card */}
            <div style={{ background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 14, padding: 18 }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#2D1F52', marginBottom: 10 }}>Deine Kampagne</div>
              {isCustom && customConfig ? (
                <>
                  <SbRow label="Budget" value={fmtCHF(customConfig.budget)} valueColor="#6B4FBB" />
                  <SbRow label="Laufzeit" value={`${customConfig.laufzeitDays} Tage`} />
                  <SbRow label="Frequenz" value={`${customConfig.freqWeekly}×/Wo`} />
                  <SbRow label="Kanal-Mix" value={`${Math.round(customConfig.doohShare * 100)}% DOOH`} />
                  <SbRow label="Start" value={campaignStartISO ? fmtMed(campaignStartISO) : '—'} />
                  <SbRow label="Wahlsonntag" value={briefing.votingDate ? fmtMed(briefing.votingDate) : '—'} valueColor="#BA7517" last />
                </>
              ) : (
                <>
                  <SbRow label="Paket" value={pkg?.name ?? selectedPkg.charAt(0).toUpperCase() + selectedPkg.slice(1)} />
                  <SbRow label="Budget" value={fmtCHF(budget)} valueColor="#6B4FBB" />
                  <SbRow label="Laufzeit" value={`${laufzeitWeeks} Woche${laufzeitWeeks !== 1 ? 'n' : ''}`} />
                  <SbRow label="Start" value={campaignStartISO ? fmtMed(campaignStartISO) : '—'} />
                  <SbRow label="Wahlsonntag" value={briefing.votingDate ? fmtMed(briefing.votingDate) : '—'} valueColor="#BA7517" last />
                </>
              )}
            </div>

            {/* Gespräch buchen — nur ab CHF 20'000 */}
            {budget >= 20000 && (
              <div style={{ background: '#EEEDFE', borderRadius: 14, padding: 18 }}>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#2D1F52', marginBottom: 6 }}>Persönliche Beratung</div>
                <p style={{ fontSize: 12, color: '#7A7596', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                  Unsere Beraterinnen helfen dir, das optimale Paket für deine Kampagne zu finden.
                </p>
                <a href={CALENDLY_URL} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', background: '#6B4FBB', color: 'white', borderRadius: 100, padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Jost', sans-serif", textAlign: 'center', textDecoration: 'none' }}>
                  Gespräch buchen →
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile sticky bottom bar ── */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', borderTop: '1px solid rgba(107,79,187,0.12)', padding: '12px 20px', display: 'flex', gap: 10, zIndex: 100 }}>
          {prevStep && (
            <button
              type="button"
              onClick={prevStep}
              style={{ flex: 1, background: 'white', color: '#6B4FBB', border: '1.5px solid rgba(107,79,187,0.30)', borderRadius: 100, padding: '13px 12px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              ← Etwas anpassen
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            style={{ flex: 2, background: '#6B4FBB', color: 'white', border: 'none', borderRadius: 100, padding: '13px 12px', fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Weiter →
          </button>
        </div>
      )}
    </section>
  );
}
