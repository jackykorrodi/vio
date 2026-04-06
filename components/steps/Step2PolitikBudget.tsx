'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { computeStartDateISO } from '@/lib/vio-paketlogik';
import { getInhabitants } from '@/lib/vio-inhabitants-map';
import ReichweiteKacheln from '@/components/ReichweiteKacheln';
import doohScreensRaw from '@/lib/dooh-screens.json';

type DoohEntry = { type: string; name?: string; kanton: string; screens: number; screens_politik: number; standorte: number; reach: number };
const DOOH_DATA_POLITIK = doohScreensRaw as DoohEntry[];

// ─── Types ────────────────────────────────────────────────────────────────────
type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz';

// ─── Static why-box content per package ───────────────────────────────────────
const WHY: Record<PkgKey, { text: string; variant: 'green' | 'amber' }> = {
  sichtbar: {
    text: 'Läuft kurz vor Unterlagen-Versand – ideal für den letzten Impuls vor der Abstimmung.',
    variant: 'amber',
  },
  praesenz: {
    text: 'Präsent während der gesamten Meinungsbildungsphase – vor dem Unterlagen-Versand.',
    variant: 'green',
  },
  dominanz: {
    text: 'Maximale Präsenz über den gesamten Abstimmungszeitraum – stärkste Wirkung.',
    variant: 'green',
  },
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

function diffWeeks(startISO: string, endISO: string): number {
  const ms = new Date(endISO + 'T00:00:00').getTime() - new Date(startISO + 'T00:00:00').getTime();
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step2PolitikBudget({ briefing, updateBriefing, nextStep, stepNumber }: Props) {
  const vioData = briefing.vioPackages;

  // Per spec: Präsenz is always pre-selected
  const [selectedPkg, setSelectedPkg] = useState<PkgKey>('praesenz');

  // Derived: selected package data
  const pkg = vioData?.packages[selectedPkg];

  // Compute ISO dates for calendar
  const computeStart = (key: PkgKey) => {
    if (!briefing.votingDate || !vioData) return '';
    return computeStartDateISO(briefing.votingDate, vioData.packages[key].durationDays);
  };
  const computeEnd = () => {
    if (!briefing.votingDate) return '';
    return addDays(briefing.votingDate, -28); // briefwahl offset – same for all pkgs
  };

  const [startISO, setStartISO] = useState(() => computeStart('praesenz'));
  const [endISO,   setEndISO]   = useState(() => computeEnd());
  const [budget,   setBudget]   = useState(() => vioData?.packages['praesenz'].finalBudget ?? 9500);

  // Per-card computed start dates (for display on cards)
  const cardStartISO = (key: PkgKey) => computeStart(key);
  const sharedEndISO = computeEnd();

  const handleSelectPkg = (key: PkgKey) => {
    setSelectedPkg(key);
    setStartISO(computeStart(key));
    setEndISO(computeEnd());
    setBudget(vioData?.packages[key].finalBudget ?? budget);
  };

  const handleReset = () => handleSelectPkg(selectedPkg);

  // ── Missing data guard ───────────────────────────────────────────────────────
  if (!vioData || !pkg) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: '#7A7596' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 1 zurück.
      </section>
    );
  }

  // ── Derived display values ───────────────────────────────────────────────────
  const inhabitants = getInhabitants((briefing.selectedRegions ?? []).map(r => r.name));
  const weeks      = startISO && endISO ? diffWeeks(startISO, endISO) : Math.round(pkg.durationDays / 7);
  const budgetPct  = Math.min(100, Math.max(0, ((budget - 2500) / (200000 - 2500)) * 100));
  const earliestStart = fmtLong(addDays(todayISO(), 10));
  const recommendedEnd = sharedEndISO ? fmtLong(sharedEndISO) : '';

  const PKG_ORDER: PkgKey[] = ['sichtbar', 'praesenz', 'dominanz'];

  const handleNext = () => {
    updateBriefing({
      budget,
      laufzeit:    weeks,
      startDate:   startISO,
      reach:       pkg.targetReachPeople,
      reachVonPct: Math.round(pkg.uniqueReachPercent * 100),
      reachBisPct: Math.round(pkg.uniqueReachPercent * 100),
      b2bReach:    null,
    });
    nextStep();
  };

  const fmtCHF = (n: number) => `CHF ${Math.round(n).toLocaleString('de-CH')}`;

  return (
    <section>
      <style>{`
        .s2 { font-family: 'Jost', sans-serif; background: #FDFCFF; min-height: 100vh; }

        /* Header */
        .s2-hdr  { max-width: 900px; margin: 0 auto; padding: 32px 40px 0; }
        .s2-step { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .s2-dash { width: 28px; height: 2px; background: #6B4FBB; border-radius: 2px; flex-shrink: 0; }
        .s2-etxt { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6B4FBB; }
        .s2-h1   { font-family: 'Plus Jakarta Sans', sans-serif; font-size: clamp(24px,2.4vw,32px); font-weight: 800; color: #2D1F52; line-height: 1.15; margin-bottom: 8px; }
        .s2-sub  { font-size: 15px; color: #5A4A7A; margin-bottom: 28px; }

        /* Context bar */
        .s2-ctx  { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; background: white; border: 1px solid #D5CCF0; border-radius: 10px; padding: 10px 16px; margin-bottom: 36px; font-size: 13px; font-weight: 500; }
        .s2-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-chip-type   { background: #6B4FBB; color: white; }
        .s2-chip-region { background: #F0ECFA; color: #6B4FBB; }
        .s2-chip-date   { background: #FFF8E7; color: #92400E; border: 1px solid #FDE68A; }
        .s2-ctx-voters  { color: #5A4A7A; margin-left: 4px; }

        /* Main */
        .s2-main { max-width: 900px; margin: 0 auto; padding: 0 40px; }

        /* Packet grid */
        .s2-pkts { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; }
        .s2-pkt  { position: relative; background: white; border: 2px solid #EDE8F7; border-radius: 14px; padding: 24px 20px 20px; cursor: pointer; transition: border-color .18s, box-shadow .18s, transform .18s; display: flex; flex-direction: column; text-align: left; }
        .s2-pkt:hover   { border-color: #8B6FDB; box-shadow: 0 4px 16px rgba(45,31,82,0.10); transform: translateY(-2px); }
        .s2-pkt.sel     { border-color: #6B4FBB; box-shadow: 0 0 0 3px rgba(107,79,187,0.12), 0 4px 16px rgba(45,31,82,0.10); }
        .s2-rec-badge   { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #6B4FBB; color: white; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; padding: 4px 14px; border-radius: 20px; font-family: 'Plus Jakarta Sans', sans-serif; white-space: nowrap; }
        .s2-check-ring  { position: absolute; top: 16px; right: 16px; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #EDE8F7; display: flex; align-items: center; justify-content: center; transition: all .15s; }
        .s2-pkt.sel .s2-check-ring { background: #6B4FBB; border-color: #6B4FBB; }
        .s2-pkt-name    { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #5A4A7A; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 6px; }
        .s2-pkt-price   { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 28px; font-weight: 800; color: #2D1F52; line-height: 1; margin-bottom: 4px; }
        .s2-pkt.sel .s2-pkt-price { color: #6B4FBB; }
        .s2-pkt-dur     { font-size: 13px; color: #5A4A7A; }
        .s2-pkt-freq    { font-size: 12px; color: #6B4FBB; font-weight: 500; margin-top: 2px; margin-bottom: 14px; }
        .s2-divider     { height: 1px; background: #EDE8F7; margin-bottom: 14px; }
        .s2-reach-box   { background: #F5F3FB; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
        .s2-reach-lbl   { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #5A4A7A; margin-bottom: 4px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-reach-val   { font-size: 17px; font-weight: 700; color: #2D1F52; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-reach-pct   { font-size: 12px; color: #5A4A7A; margin-top: 2px; }
        .s2-dates       { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
        .s2-date-row    { display: flex; justify-content: space-between; align-items: baseline; }
        .s2-date-lbl    { font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase; color: #5A4A7A; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-date-val    { font-size: 13px; font-weight: 700; color: #2D1F52; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-why         { margin-top: auto; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #065F46; line-height: 1.45; display: flex; gap: 6px; align-items: flex-start; }
        .s2-why.amber   { background: #FFFBEB; border-color: #FDE68A; color: #92400E; }
        .s2-why-hint    { margin-top: 8px; background: #FFF8E7; border: 1px solid #FDE68A; border-radius: 8px; padding: 8px 10px; font-size: 12px; color: #92400E; line-height: 1.45; display: flex; gap: 6px; align-items: flex-start; }

        /* Calendar section */
        .s2-cal      { background: white; border: 1px solid #EDE8F7; border-radius: 14px; padding: 28px; margin-bottom: 24px; }
        .s2-cal-hdr  { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
        .s2-cal-ttl  { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; color: #2D1F52; }
        .s2-cal-sub  { font-size: 13px; color: #5A4A7A; margin-top: 3px; }
        .s2-reset    { font-size: 12px; color: #6B4FBB; cursor: pointer; font-weight: 600; border: none; background: none; padding: 4px 10px; border-radius: 6px; transition: background .15s; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-reset:hover { background: #F0ECFA; }
        .s2-cal-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
        .s2-cal-fld label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5A4A7A; margin-bottom: 8px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-cal-fld input[type=date] { width: 100%; padding: 12px 14px; border: 1.5px solid #EDE8F7; border-radius: 8px; font-family: 'Jost', sans-serif; font-size: 15px; font-weight: 600; color: #2D1F52; background: white; cursor: pointer; transition: border-color .15s; outline: none; }
        .s2-cal-fld input[type=date]:focus { border-color: #6B4FBB; box-shadow: 0 0 0 3px rgba(107,79,187,0.10); }
        .s2-cal-hint { font-size: 12px; color: #5A4A7A; margin-top: 6px; }
        .s2-cal-hint span { color: #6B4FBB; font-weight: 500; }

        /* Budget slider */
        .s2-sl-lbl-row  { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
        .s2-sl-lbl-txt  { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 13px; font-weight: 600; color: #5A4A7A; }
        .s2-sl-lbl-val  { font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; color: #6B4FBB; }
        .s2-sl-track    { position: relative; height: 4px; background: #EDE8F7; border-radius: 4px; margin-bottom: 8px; }
        .s2-sl-fill     { position: absolute; left: 0; top: 0; bottom: 0; background: #6B4FBB; border-radius: 4px; pointer-events: none; }
        .s2-sl-range    { display: flex; justify-content: space-between; font-size: 11px; color: #B8ADDA; }
        .s2-range-input { position: absolute; width: 100%; top: 50%; transform: translateY(-50%); -webkit-appearance: none; background: transparent; cursor: pointer; margin: 0; }
        .s2-range-input::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); transition: transform .15s; }
        .s2-range-input::-webkit-slider-thumb:hover { transform: scale(1.15); }
        .s2-range-input::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; border: 2.5px solid #6B4FBB; box-shadow: 0 1px 4px rgba(107,79,187,0.25); }

        /* Summary bar */
        .s2-sum  { background: #F0ECFA; border: 1px solid #D5CCF0; border-radius: 14px; padding: 20px 24px; display: flex; align-items: stretch; margin-bottom: 24px; }
        .s2-si   { flex: 1; padding: 0 20px; border-right: 1px solid #D5CCF0; }
        .s2-si:first-child { padding-left: 0; }
        .s2-si:last-child  { border-right: none; }
        .s2-si-lbl { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #6B4FBB; font-family: 'Plus Jakarta Sans', sans-serif; margin-bottom: 4px; }
        .s2-si-val { font-size: 17px; font-weight: 700; color: #2D1F52; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-si-sub { font-size: 12px; color: #5A4A7A; margin-top: 2px; }

        /* Infobox */
        .s2-info  { background: white; border: 1px solid #EDE8F7; border-left: 3px solid #6B4FBB; border-radius: 14px; padding: 16px 20px; margin-bottom: 32px; display: flex; gap: 12px; align-items: flex-start; }
        .s2-info-ttl { font-size: 13px; font-weight: 700; color: #2D1F52; margin-bottom: 4px; font-family: 'Plus Jakarta Sans', sans-serif; }
        .s2-info-txt { font-size: 13px; color: #5A4A7A; line-height: 1.55; }

        /* CTA */
        .s2-cta-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
        .s2-btn  { display: inline-flex; align-items: center; gap: 8px; background: #6B4FBB; color: white; font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700; padding: 16px 32px; border-radius: 50px; border: none; cursor: pointer; transition: background .15s, transform .15s, box-shadow .15s; }
        .s2-btn:hover { background: #5940A8; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(107,79,187,0.3); }
        .s2-cta-sum { font-size: 13px; color: #5A4A7A; line-height: 1.55; }
        .s2-cta-sum strong { color: #2D1F52; font-weight: 600; }

        /* Responsive */
        @media (max-width: 720px) {
          .s2-hdr, .s2-main { padding-left: 20px; padding-right: 20px; }
          .s2-pkts { grid-template-columns: 1fr; }
          .s2-cal-grid { grid-template-columns: 1fr; }
          .s2-sum { flex-direction: column; gap: 16px; }
          .s2-si { border-right: none; border-bottom: 1px solid #D5CCF0; padding: 0 0 16px; }
          .s2-si:last-child { border-bottom: none; padding-bottom: 0; }
        }
      `}</style>

      <div className="s2">

        {/* ── Header ── */}
        <div className="s2-hdr">
          <div className="s2-step">
            <div className="s2-dash" />
            <span className="s2-etxt">
              {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 2'} · Politische Kampagne
            </span>
          </div>
          <h1 className="s2-h1">Wie weit soll deine Kampagne strahlen?</h1>
          <p className="s2-sub">
            Alle Preise sind dynamisch auf deine Zielregion abgestimmt. Wähle die Intensität, die zu deinem Ziel passt.
          </p>

          {/* Context bar */}
          <div className="s2-ctx">
            <span className="s2-chip s2-chip-type">Politische Kampagne</span>
            {briefing.selectedRegions?.map(r => (
              <span key={r.name} className="s2-chip s2-chip-region">📍 {r.name}</span>
            ))}
            <span className="s2-ctx-voters">
              {vioData.eligibleVotersTotal.toLocaleString('de-CH')} {inhabitants}
            </span>
            {vioData.daysUntilVote != null && (
              <span className="s2-chip s2-chip-date">
                🗓️ Abstimmung in {vioData.daysUntilVote} Tagen
              </span>
            )}
          </div>
        </div>

        <div className="s2-main">

          {/* ── Packet cards ── */}
          <div className="s2-pkts">
            {PKG_ORDER.map(key => {
              const p        = vioData.packages[key];
              const isSel    = selectedPkg === key;
              const why      = WHY[key];
              const cStart   = cardStartISO(key);
              const cEnd     = sharedEndISO;

              return (
                <div
                  key={key}
                  className={`s2-pkt${isSel ? ' sel' : ''}`}
                  onClick={() => handleSelectPkg(key)}
                >
                  {/* Empfohlen badge – always on Präsenz */}
                  {key === 'praesenz' && (
                    <div className="s2-rec-badge">Empfohlen</div>
                  )}

                  {/* Check circle */}
                  <div className="s2-check-ring">
                    {isSel && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>

                  {/* Name */}
                  <div className="s2-pkt-name">{p.name}</div>

                  {/* Price */}
                  <div className="s2-pkt-price">{fmtCHF(p.finalBudget)}</div>

                  {/* Meta */}
                  <div className="s2-pkt-dur">{Math.round(p.durationDays / 7)} Wochen Laufzeit</div>
                  <div className="s2-pkt-freq">Ø {p.frequency} Kontakte pro Person</div>

                  <div className="s2-divider" />

                  {/* Reach box */}
                  <div className="s2-reach-box">
                    <div className="s2-reach-lbl">Reichweite</div>
                    <div className="s2-reach-val">~{p.targetReachPeople.toLocaleString('de-CH')} Personen</div>
                    <div className="s2-reach-pct">{Math.round(p.uniqueReachPercent * 100)}% der {inhabitants}</div>
                  </div>

                  {/* Dates */}
                  {cStart && cEnd && (
                    <div className="s2-dates">
                      <div className="s2-date-row">
                        <span className="s2-date-lbl">Kampagnenstart</span>
                        <span className="s2-date-val">{fmtLong(cStart)}</span>
                      </div>
                      <div className="s2-date-row">
                        <span className="s2-date-lbl">Ende</span>
                        <span className="s2-date-val">{fmtLong(cEnd)}</span>
                      </div>
                    </div>
                  )}

                  {/* Why box */}
                  <div className={`s2-why${why.variant === 'amber' ? ' amber' : ''}`}>
                    <span style={{ flexShrink: 0 }}>{why.variant === 'green' ? '✅' : '⚡'}</span>
                    {why.text}
                  </div>

                  {/* Dynamic hinweis (timing warning from vioData, if set) */}
                  {p.hinweis && (
                    <div className="s2-why-hint">
                      <span style={{ flexShrink: 0 }}>⚠️</span>
                      {p.hinweis}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Reichweite Kacheln ── */}
          {(() => {
            const regionName = briefing.politikRegion ?? briefing.selectedRegions?.[0]?.name ?? 'Gesamte Schweiz';
            const doohEntry = DOOH_DATA_POLITIK.find(d => d.name === regionName);
            const doohScreenCount = doohEntry?.screens_politik ?? 18223;
            return (
              <ReichweiteKacheln
                type="politik"
                region={regionName}
                doohScreens={doohScreenCount}
                displayPersonen={Math.round(pkg.targetReachPeople * 0.3)}
                reachVon={Math.round(pkg.targetReachPeople * 0.85)}
                reachBis={pkg.targetReachPeople}
                frequency={pkg.frequency}
              />
            );
          })()}

          {/* ── Calendar + Budget ── */}
          <div className="s2-cal">
            <div className="s2-cal-hdr">
              <div>
                <div className="s2-cal-ttl">Zeitraum & Budget anpassen</div>
                <div className="s2-cal-sub">Passe Start, Ende und Budget individuell an.</div>
              </div>
              <button type="button" className="s2-reset" onClick={handleReset}>
                ↺ Zurücksetzen
              </button>
            </div>

            <div className="s2-cal-grid">
              <div className="s2-cal-fld">
                <label>Kampagnenstart</label>
                <input
                  type="date"
                  value={startISO}
                  onChange={e => setStartISO(e.target.value)}
                />
                <div className="s2-cal-hint">
                  Frühestmöglich: <span>{earliestStart}</span> (nach Freigabe)
                </div>
              </div>
              <div className="s2-cal-fld">
                <label>Kampagnenende</label>
                <input
                  type="date"
                  value={endISO}
                  onChange={e => setEndISO(e.target.value)}
                />
                <div className="s2-cal-hint">
                  Empfohlen: <span>{recommendedEnd}</span> (vor Unterlagen-Versand)
                </div>
              </div>
            </div>

            {/* Budget slider */}
            <div>
              <div className="s2-sl-lbl-row">
                <span className="s2-sl-lbl-txt">Budget</span>
                <span className="s2-sl-lbl-val">{fmtCHF(budget)}</span>
              </div>
              <div className="s2-sl-track">
                <div className="s2-sl-fill" style={{ width: `${budgetPct}%` }} />
                <input
                  type="range"
                  className="s2-range-input"
                  min={2500}
                  max={200000}
                  step={500}
                  value={budget}
                  onChange={e => setBudget(Number(e.target.value))}
                />
              </div>
              <div className="s2-sl-range">
                <span>CHF 2&apos;500</span>
                <span>CHF 200&apos;000</span>
              </div>
            </div>
          </div>

          {/* ── Summary bar ── */}
          <div className="s2-sum">
            <div className="s2-si">
              <div className="s2-si-lbl">Paket</div>
              <div className="s2-si-val">{pkg.name}</div>
              <div className="s2-si-sub">{selectedPkg === 'praesenz' ? 'Empfohlen' : `${Math.round(pkg.uniqueReachPercent * 100)}% Reichweite`}</div>
            </div>
            <div className="s2-si">
              <div className="s2-si-lbl">Zeitraum</div>
              <div className="s2-si-val">
                {startISO && endISO
                  ? `${fmtShort(startISO)} – ${fmtShort(endISO)}`
                  : '—'}
              </div>
              <div className="s2-si-sub">{weeks} Wochen</div>
            </div>
            <div className="s2-si">
              <div className="s2-si-lbl">Reichweite</div>
              <div className="s2-si-val">~{pkg.targetReachPeople.toLocaleString('de-CH')}</div>
              <div className="s2-si-sub">{Math.round(pkg.uniqueReachPercent * 100)}% der {inhabitants}</div>
            </div>
            <div className="s2-si">
              <div className="s2-si-lbl">Budget total</div>
              <div className="s2-si-val">{fmtCHF(budget)}</div>
              <div className="s2-si-sub">DOOH + Display inkl.</div>
            </div>
          </div>

          {/* ── DOOH Infobox (immer sichtbar) ── */}
          <div className="s2-info">
            <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>📋</div>
            <div>
              <div className="s2-info-ttl">Warum so früh buchen? DOOH-Freigabe für politische Kampagnen</div>
              <div className="s2-info-txt">
                Digitale Aussenwerbung für politische Kampagnen muss von jedem Standortbetreiber individuell
                freigegeben werden. Dieser Prozess dauert in der Regel 5–7 Werktage. Wir empfehlen deshalb
                frühzeitig zu buchen – damit deine Kampagne pünktlich live geht und du den wichtigsten Zeitraum
                vor der brieflichen Stimmabgabe optimal nutzt.
              </div>
            </div>
          </div>

          {/* ── CTA ── */}
          <div className="s2-cta-row">
            <button type="button" className="s2-btn" onClick={handleNext}>
              Weiter zu den Werbemitteln
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="s2-cta-sum">
              <strong>{pkg.name} · {fmtCHF(budget)}</strong><br />
              <span>{weeks} Wochen · ~{pkg.targetReachPeople.toLocaleString('de-CH')} Personen erreicht</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
