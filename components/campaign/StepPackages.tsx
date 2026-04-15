'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { getInhabitants } from '@/lib/vio-inhabitants-map';

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

const MONTHS_SHORT = ['Jan','Feb','Mrz','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function fmtShort(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
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
  const hasBudget = !!(briefing.recommendedBudget && briefing.recommendedBudget > 0);

  const initPkg = (briefing.selectedPackage ?? vioData?.recommendedPackage ?? 'praesenz') as PkgKey;
  const [selectedPkg, setSelectedPkg] = useState<PkgKey>(initPkg);
  const [showAllPackets, setShowAllPackets] = useState<boolean>(!hasBudget);

  if (!vioData) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: '#7A7596' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 1 zurück.
      </section>
    );
  }

  const inhabitants = getInhabitants((briefing.selectedRegions ?? []).map(r => r.name));
  const regionName = briefing.politikRegion ?? briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';
  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;

  // Feasibility
  const campaignEndISO = briefing.votingDate ? addDays(briefing.votingDate, -3) : '';
  const isPkgFeasible = (key: PkgKey): boolean => {
    if (!campaignEndISO) return true;
    const earliestStart = addDays(todayISO(), 10);
    const ms = new Date(campaignEndISO + 'T00:00:00').getTime()
             - new Date(earliestStart + 'T00:00:00').getTime();
    const available = Math.floor(ms / (24 * 3600 * 1000));
    return available >= vioData.packages[key].durationDays;
  };

  const handleNext = () => {
    updateBriefing({ selectedPackage: selectedPkg });
    nextStep();
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
            <span key={r.name} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, padding: '3px 11px', borderRadius: 20, background: '#F1EFE8', color: '#7A7596' }}>📍 {r.name}</span>
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
              <span>Basierend auf deinem Budget von {fmtCHF(briefing.recommendedBudget!)} haben wir das passende Paket vorausgewählt.</span>
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
              const feasible = isPkgFeasible(key);
              const barW = Math.round(p.reachPercent * 100);

              const ctxType: 'warn' | 'ok' | 'star' =
                p.hinweis ? 'warn'
                : key === 'dominanz' ? 'star'
                : 'ok';
              const ctxText =
                p.hinweis ? p.hinweis
                : key === 'sichtbar' ? 'Läuft kurz vor dem Unterlagen-Versand – ideal für den letzten Impuls.'
                : key === 'praesenz' ? 'Läuft rund um den Unterlagen-Versand — optimale Präsenz in der Meinungsbildungsphase.'
                : 'Maximale Präsenz — deckt Unterlagen-Versand und Schlussphase vollständig ab.';
              const ctxIcon = ctxType === 'warn' ? '⚠' : ctxType === 'star' ? '★' : '✓';

              return (
                <div
                  key={key}
                  onClick={() => { if (feasible) setSelectedPkg(key); }}
                  style={{
                    position: 'relative',
                    background: isSel ? 'linear-gradient(145deg,#EEEDFE 0%,#F8F7FF 100%)' : 'white',
                    border: isSel ? '2.5px solid #7F77DD' : '1px solid rgba(107,79,187,0.12)',
                    borderRadius: 14,
                    padding: 16,
                    cursor: feasible ? 'pointer' : 'not-allowed',
                    textAlign: 'left' as const,
                    transition: 'all 0.18s',
                    opacity: !feasible ? 0.55 : isSel ? 1 : 0.72,
                    boxShadow: isSel ? '0 8px 28px rgba(107,79,187,0.20)' : 'none',
                    transform: isSel ? 'translateY(-2px)' : 'none',
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
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 700, color: isSel ? '#534AB7' : '#2D1F52', margin: '2px 0' }}>{fmtCHF(p.finalBudget)}</div>
                  <div style={{ fontSize: 11, color: '#7A7596', marginBottom: 10 }}>{Math.round(p.durationDays / 7)} Wochen Laufzeit</div>
                  <div style={{ height: 0.5, background: 'rgba(107,79,187,0.10)', margin: '8px 0' }} />
                  <div style={{ fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#7A7596' }}>Stimmberechtigte erreichbar</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2D1F52', marginTop: 2 }}>~{p.targetReachPeople.toLocaleString('de-CH')}</div>
                  <div style={{ fontSize: 11, color: '#7A7596', marginBottom: 5 }}>{barW}% der {inhabitants}</div>
                  <div style={{ height: 3, background: 'rgba(107,79,187,0.10)', borderRadius: 2 }}>
                    <div style={{ height: 3, borderRadius: 2, background: '#7F77DD', width: `${barW}%` }} />
                  </div>
                  <div className={`sp-ctx-tag ${ctxType}`}>
                    <span style={{ flexShrink: 0, fontSize: '12px' }}>{ctxIcon}</span>
                    <span>{ctxText}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {hasBudget && showAllPackets && (
            <button type="button" onClick={() => setShowAllPackets(false)} style={{ background: 'none', border: 'none', color: '#7A7596', fontSize: 12, cursor: 'pointer', marginBottom: 8 }}>
              ← Zurück zur Vorauswahl
            </button>
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
            <SbRow label="Stimmberechtigte" value={vioData.eligibleVotersTotal.toLocaleString('de-CH')} />
            {briefing.votingDate && <SbRow label="Abstimmung" value={fmtShort(briefing.votingDate)} valueColor="#BA7517" />}
            {hasBudget
              ? <SbRow label="Budget (Eingabe)" value={fmtCHF(briefing.recommendedBudget!)} valueColor="#6B4FBB" last />
              : <SbRow label="Budget" value="Noch nicht festgelegt" last />
            }
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
