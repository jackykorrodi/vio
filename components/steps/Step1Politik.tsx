'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';
import { buildVioPackagesV2 } from '@/lib/preislogik-adapter';
import { filterBuchbareRegionen, klassifiziereRegion, klassifiziereMehrereRegionen } from '@/lib/region-buchbarkeit';

// ─── Data ────────────────────────────────────────────────────────────────────

const CH_ABSTIMMUNGSSONNTAGE = [
  '2026-06-14',
  '2026-09-27',
  '2026-11-29',
  '2027-03-07',
  '2027-06-13',
  '2027-09-28',
  '2027-11-28',
  '2028-03-12',
  '2028-06-11',
];

const MONTHS_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

const SIDEBAR: Record<number, { title: string; text: string; tip: string }> = {
  1: {
    title: 'Warum zuerst das Enddatum?',
    text:  'Weil der Abstimmungs- oder Wahltag fix ist. Von dort aus rechnen wir rückwärts – so siehst du sofort, wie viel Vorlauf du noch hast und welche Pakete zeitlich möglich sind.',
    tip:   '<strong>Empfehlung:</strong> 4–6 Wochen Vorlauf sind ideal. Die Timeline wird automatisch berechnet – du musst keinen Starttermin eingeben.',
  },
  2: {
    title: 'Lokal wirkt stärker.',
    text:  'Wer in einer Region lebt und dort Werbung sieht, nimmt sie als relevanter wahr. Deshalb spielen wir ausschliesslich in deinen Zielgebieten aus – keine Streuverluste ausserhalb deines Wahlkreises.',
    tip:   '<strong>Tipp:</strong> Du kannst Kantone und Gemeinden kombinieren. Wir fassen alles zu einer einzigen Kampagne zusammen.',
  },
  3: {
    title: 'Kein fixes Budget? Kein Problem.',
    text:  'Viele starten ohne genaue Zahl. Du kannst einen Richtwert angeben – oder das Budget im nächsten Schritt mit dem Reichweiten-Tool bestimmen.',
    tip:   "<strong>Mindestbudget:</strong> CHF 4'000 für DOOH + Display. Empfohlen: CHF 7'500–15'000 für spürbare Wirkung.",
  },
};

// ─── Design tokens ────────────────────────────────────────────────────────────

const V       = '#6B4FBB';
const INK     = '#1E1535';
const INK2    = '#4A3A72';
const MUTED   = 'rgba(30,21,53,0.42)';
const BG      = '#F6F5F9';
const WHITE   = '#FFFFFF';
const BORDER  = 'rgba(107,79,187,0.13)';
const BORDER2 = 'rgba(107,79,187,0.38)';
const GREEN   = '#1E9E6A';
const GREEN_BG= 'rgba(30,158,106,0.08)';
const AMBER   = '#C96A00';
const AMBER_BG= 'rgba(201,106,0,0.07)';
const V_DIM   = 'rgba(107,79,187,0.09)';
const V_DIM2  = 'rgba(107,79,187,0.16)';
const SHADOW  = '0 1px 3px rgba(30,21,53,0.06), 0 4px 16px rgba(30,21,53,0.04)';
const SHADOW_H= '0 2px 8px rgba(107,79,187,0.12), 0 8px 32px rgba(107,79,187,0.1)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtLongDE(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtPillDE(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate()}. ${MONTHS_DE[d.getMonth()]}`;
}

function calcDaysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
}

const MIN_SETUP_DAYS = 10;

function todayPlusDaysISO(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO(): string {
  return todayPlusDaysISO(0);
}

function getNext2Sundays(): string[] {
  const minDate = todayPlusDaysISO(MIN_SETUP_DAYS);
  return CH_ABSTIMMUNGSSONNTAGE.filter(d => d >= minDate).slice(0, 2);
}

type DateGate =
  | { level: 'ok' }
  | { level: 'info';    message: string }
  | { level: 'warning'; message: string }
  | { level: 'error';   message: string }

function getDateGate(dateStr: string): DateGate {
  if (!dateStr) return { level: 'ok' }
  const days = calcDaysUntil(dateStr)
  if (days < MIN_SETUP_DAYS) {
    return {
      level: 'error',
      message: `Zu kurzfristig: Für die DOOH-Freigabe brauchen wir mindestens ${MIN_SETUP_DAYS} Tage Vorlauf. Bei Abstimmung in ${days} Tag${days === 1 ? '' : 'en'} ist eine Kampagne nicht mehr umsetzbar.`,
    }
  }
  if (days < 24) {
    return {
      level: 'warning',
      message: `Sehr knapp: Nach Freigabe bleiben nur noch ${days - MIN_SETUP_DAYS} Tage Kampagnenlaufzeit. Das Paket «Sichtbar» ist machbar – für mehr Wirkung empfehlen wir mindestens 38 Tage Vorlauf.`,
    }
  }
  if (days < 38) {
    return {
      level: 'info',
      message: `Paket «Präsenz» (4 Wochen) ist zeitlich nicht mehr machbar. «Sichtbar» (2 Wochen) läuft bis zur Abstimmung.`,
    }
  }
  return { level: 'ok' }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  onComplete: () => void;
  isActive: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Step1Politik({ briefing, updateBriefing, onComplete }: Props) {
  // Navigation
  const [curQ, setCurQ] = useState(() =>
    briefing.votingDate && briefing.selectedRegions?.length && briefing.politikType ? 4 : 1
  );
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  // Q1 state
  const [dateEvent, setDateEvent] = useState(briefing.votingDate ?? '');
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Q2 state
  const [regions, setRegions]         = useState<Region[]>(
    (briefing.selectedRegions ?? []).map(r => {
      const match = ALL_REGIONS.find(x => x.name === r.name);
      if (match) return match;
      return { name: r.name, type: r.type as Region['type'], kanton: r.kanton ?? 'CH', pop: r.stimm * 2, stimm: r.stimm };
    })
  );
  const [regionQuery, setRegionQuery] = useState('');
  const [ddOpen, setDdOpen]           = useState(false);
  const [screenHinweis, setScreenHinweis] = useState<string | null>(null);

  // Q3 state
  const [budget, setBudget]           = useState(briefing.recommendedBudget ?? 5000);
  const [budgetKnown, setBudgetKnown] = useState(!!briefing.recommendedBudget);

  // Summary pills (accumulated as user progresses)
  const [pills, setPills] = useState<string[]>([]);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goTo = (q: number, dir: 'forward' | 'back') => {
    if (dir === 'forward') {
      const newPills: string[] = [];
      if (dateEvent) {
        newPills.push(fmtLongDE(dateEvent));
      }
      if (regions.length) {
        newPills.push(regions.map(r => r.name).slice(0, 2).join(' · ') + (regions.length > 2 ? ` +${regions.length - 2}` : ''));
      }
      setPills(newPills);
    }
    setAnimDir(dir);
    setAnimKey(k => k + 1);
    setCurQ(q);
  };

  const next = () => goTo(curQ + 1, 'forward');
  const back = () => goTo(curQ - 1, 'back');

  // ─── Region search ────────────────────────────────────────────────────────

  const filteredRegions = useMemo(() => {
    const q = regionQuery.trim().toLowerCase();
    return ALL_REGIONS
      .filter(r => !regions.some(s => s.name === r.name))
      .filter(r => r.type !== 'stadt' || filterBuchbareRegionen([r]).length > 0)
      .filter(r => !q || r.name.toLowerCase().includes(q));
  }, [regionQuery, regions]);

  const addRegion = (r: Region) => {
    const newRegions = [...regions, r];
    setRegions(newRegions);
    setRegionQuery('');
    setDdOpen(false);
    if (newRegions.length === 1) {
      const klass = klassifiziereRegion(r);
      setScreenHinweis(klass.hinweis ?? null);
    } else {
      const klass = klassifiziereMehrereRegionen(newRegions);
      setScreenHinweis(klass.hinweis ?? null);
    }
  };

  const removeRegion = (name: string) => {
    const newRegions = regions.filter(r => r.name !== name);
    setRegions(newRegions);
    if (newRegions.length === 0) {
      setScreenHinweis(null);
    } else if (newRegions.length === 1) {
      const klass = klassifiziereRegion(newRegions[0]);
      setScreenHinweis(klass.hinweis ?? null);
    } else {
      const klass = klassifiziereMehrereRegionen(newRegions);
      setScreenHinweis(klass.hinweis ?? null);
    }
  };

  // ─── Q1 derived state ─────────────────────────────────────────────────────

  const dateGate    = getDateGate(dateEvent);
  const dateBlocked = dateGate.level === 'error';
  const q1Valid     = !!dateEvent && !dateBlocked;

  // Auto-computed campaign timeline (default 28-day campaign back from voting day)
  const tlCampaignEnd   = dateEvent;
  const tlCampaignStart = dateEvent
    ? (() => {
        const raw     = addDaysISO(dateEvent, -28);
        const minDate = todayPlusDaysISO(MIN_SETUP_DAYS);
        return raw < minDate ? minDate : raw;
      })()
    : '';
  const tlDurationDays = tlCampaignStart && tlCampaignEnd
    ? Math.max(0, Math.round(
        (new Date(tlCampaignEnd + 'T00:00:00').getTime() -
         new Date(tlCampaignStart + 'T00:00:00').getTime()) / 86400000
      ))
    : 0;
  const daysToEvent = dateEvent ? calcDaysUntil(dateEvent) : 0;
  const tlPkgHint = dateEvent && !dateBlocked
    ? daysToEvent >= 70 ? 'Paket «Dominanz» (8 Wochen) wäre möglich'
    : daysToEvent >= 42 ? 'Paket «Präsenz» (4 Wochen) empfohlen'
    : daysToEvent >= 28 ? 'Paket «Sichtbar» (2 Wochen) möglich'
    : null
    : null;

  // Pills for voting day selection
  const next2Sundays = getNext2Sundays();

  // ─── Finish ───────────────────────────────────────────────────────────────

  const finish = () => {
    const vioData = buildVioPackagesV2({
      regions:      regions,
      voteDate:     dateEvent || null,
      campaignType: 'event',
    });
    const rec  = vioData.packages[vioData.recommendedPackage];
    const days = dateEvent ? calcDaysUntil(dateEvent) : 0;

    updateBriefing({
      votingDate:        dateEvent,
      daysUntil:         days,
      selectedRegions:   regions.map(r => ({ name: r.name, type: r.type, stimm: r.stimm, kanton: r.kanton })),
      totalStimmber:     regions.reduce((s, r) => s + r.stimm, 0),
      stimmberechtigte:  regions.reduce((s, r) => s + r.stimm, 0),
      politikRegion:     regions[0]?.name ?? '',
      politikRegionType: (regions[0]?.type as 'kanton' | 'stadt' | 'schweiz') ?? 'kanton',
      vioPackages:       vioData,
      recommendedBudget:    budgetKnown ? budget : 0,
      recommendedLaufzeit:  Math.round(rec.durationDays / 7),
      ...(budgetKnown ? { budget } : {}),
    });
    onComplete();
  };

  // ─── Budget slider fill % ─────────────────────────────────────────────────

  const budgetPct = Math.round(((budget - 4000) / (50000 - 4000)) * 100);

  // ─── Current sidebar content ──────────────────────────────────────────────

  const sb = SIDEBAR[curQ];

  // ─── Animation style ──────────────────────────────────────────────────────

  const slideAnim = animDir === 'forward'
    ? 'sp1-slideRight 0.38s cubic-bezier(0.22,1,0.36,1) both'
    : 'sp1-slideLeft 0.38s cubic-bezier(0.22,1,0.36,1) both';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ fontFamily: "'Jost', sans-serif", background: BG, minHeight: '100vh', color: INK }}>

      <style>{`
        @keyframes sp1-slideRight {
          from { opacity: 0; transform: translateX(40px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes sp1-slideLeft {
          from { opacity: 0; transform: translateX(-40px) scale(0.98); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes sp1-popIn {
          from { opacity: 0; transform: scale(0.75); }
          to   { opacity: 1; transform: scale(1); }
        }
        .sp1-date-input { width:100%; border:none; outline:none; font-family:'Plus Jakarta Sans',sans-serif; font-size:17px; font-weight:700; color:${INK}; background:transparent; cursor:pointer; }
        .sp1-range { -webkit-appearance:none; width:100%; height:5px; border-radius:3px; outline:none; cursor:pointer; margin:18px 0 8px; }
        .sp1-range::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:${V}; border:3px solid white; box-shadow:0 2px 10px rgba(107,79,187,0.35); cursor:grab; transition:transform 0.15s; }
        .sp1-range:active::-webkit-slider-thumb { transform:scale(1.18); cursor:grabbing; }
        .sp1-region-search { width:100%; background:${WHITE}; border:1.5px solid ${BORDER}; border-radius:12px; padding:13px 16px 13px 42px; font-family:'Jost',sans-serif; font-size:15px; color:${INK}; outline:none; box-shadow:${SHADOW}; transition:border-color 0.18s,box-shadow 0.18s; }
        .sp1-region-search:focus { border-color:${V}; box-shadow:0 0 0 3px ${V_DIM}; }
        .sp1-region-search::placeholder { color:${MUTED}; }
        .sp1-date-field:focus-within { border-color:${V} !important; box-shadow:0 0 0 3px ${V_DIM} !important; }
        .sp1-btn-back:hover { border-color:${BORDER2}; color:${INK}; }
        .sp1-btn-next:hover:not(:disabled) { background:${INK}; box-shadow:0 4px 22px rgba(30,21,53,0.28); transform:translateY(-1px); }
        .sp1-card:hover { border-color:${BORDER2}; box-shadow:${SHADOW_H}; transform:translateY(-2px); }
        .sp1-nob:hover, .sp1-nob.active { border-color:${V}; color:${V}; background:${V_DIM}; }
        .sp1-nob.active { background:${V_DIM2} !important; }
        .sp1-region-opt:hover { background:${V_DIM}; }
        .sp1-date-pill { transition: all 0.18s; cursor: pointer; }
        .sp1-date-pill:hover { border-color: ${BORDER2} !important; box-shadow: ${SHADOW_H} !important; transform: translateY(-1px); }
      `}</style>

      <div style={{
        maxWidth: 1060,
        margin: '0 auto',
        padding: '44px 24px 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: 44,
        alignItems: 'start',
      }}>

        {/* ── Main flow area ── */}
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: V, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            Schritt 1 · Politische Kampagne
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: INK, letterSpacing: -0.5, marginBottom: 28, lineHeight: 1.2 }}>
            Lass uns deine{' '}
            <em style={{ fontStyle: 'italic', color: V }}>Kampagne einrichten.</em>
          </h1>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                height: 4,
                borderRadius: 2,
                flex: i === curQ ? 2.5 : 1,
                background: i < curQ ? GREEN : i === curQ ? V : BORDER,
                transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            ))}
          </div>

          {/* Summary pills */}
          {pills.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 20, minHeight: 4 }}>
              {pills.map((p, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 11px', borderRadius: 99,
                  background: GREEN_BG, border: `1px solid rgba(30,158,106,0.2)`,
                  fontSize: 12, fontWeight: 500, color: GREEN,
                  animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}>{p}</div>
              ))}
            </div>
          )}

          {/* ── Slide track ── */}
          <div key={animKey} style={{ animation: slideAnim }}>

            {/* ────── Q1: Wann ──────────────────────────────────────────────── */}
            {curQ === 1 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 1 von 3</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: INK, letterSpacing: -0.3, marginBottom: 5, lineHeight: 1.25 }}>Wann findet das statt?</div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.55 }}>Wähle den Abstimmungs- oder Wahltag. Wir berechnen den Kampagnenstart automatisch.</div>

                {/* Date pills */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 16 }}>
                  {next2Sundays.map(iso => {
                    const isSelected = dateEvent === iso && !showCustomDate;
                    return (
                      <button
                        key={iso}
                        className="sp1-date-pill"
                        onClick={() => { setDateEvent(iso); setShowCustomDate(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          background: isSelected ? V_DIM2 : WHITE,
                          border: `1.5px solid ${isSelected ? V : BORDER}`,
                          borderRadius: 14, padding: '14px 18px',
                          boxShadow: isSelected ? `0 0 0 3px ${V_DIM}` : SHADOW,
                          cursor: 'pointer', textAlign: 'left' as const,
                          transition: 'all 0.18s',
                        }}
                      >
                        <div style={{
                          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                          border: `2px solid ${isSelected ? V : BORDER2}`,
                          background: isSelected ? V : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: WHITE }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: isSelected ? V : MUTED, marginBottom: 3 }}>
                            Bundesabstimmung · Sonntag
                          </div>
                          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 800, color: isSelected ? V : INK, letterSpacing: -0.3 }}>
                            {fmtLongDE(iso)}
                          </div>
                        </div>
                        {isSelected && (
                          <div style={{ fontSize: 11, fontWeight: 700, color: V, background: V_DIM2, padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
                            Ausgewählt
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* "Anderes Datum" pill */}
                  <button
                    className="sp1-date-pill"
                    onClick={() => { setShowCustomDate(true); setDateEvent(''); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      background: showCustomDate ? V_DIM2 : WHITE,
                      border: `1.5px ${showCustomDate ? 'solid' : 'dashed'} ${showCustomDate ? V : BORDER2}`,
                      borderRadius: 14, padding: '14px 18px',
                      boxShadow: showCustomDate ? `0 0 0 3px ${V_DIM}` : 'none',
                      cursor: 'pointer', textAlign: 'left' as const,
                      transition: 'all 0.18s',
                    }}
                  >
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `2px solid ${showCustomDate ? V : BORDER2}`,
                      background: showCustomDate ? V : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {showCustomDate && <div style={{ width: 6, height: 6, borderRadius: '50%', background: WHITE }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' as const, color: showCustomDate ? V : MUTED, marginBottom: 3 }}>
                        Anderes Datum
                      </div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: showCustomDate ? V : INK2 }}>
                        {showCustomDate && dateEvent ? fmtLongDE(dateEvent) : 'Datum selbst wählen'}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Custom date input */}
                {showCustomDate && (
                  <div
                    className="sp1-date-field"
                    style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', boxShadow: SHADOW, marginBottom: 16, transition: 'border-color 0.18s, box-shadow 0.18s', animation: 'sp1-popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' as const, color: MUTED, marginBottom: 8 }}>
                      Abstimmungs- / Wahltag
                    </label>
                    <input
                      type="date"
                      className="sp1-date-input"
                      value={dateEvent}
                      min={todayPlusDaysISO(MIN_SETUP_DAYS)}
                      onChange={e => setDateEvent(e.target.value)}
                      autoFocus
                    />
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>Bundesabstimmungen finden immer an einem Sonntag statt.</div>
                  </div>
                )}

                {/* Date gate alert */}
                {dateEvent && dateGate.level !== 'ok' && (
                  <div
                    style={{
                      background:
                        dateGate.level === 'error'   ? '#FFF0F0' :
                        dateGate.level === 'warning' ? AMBER_BG :
                                                       V_DIM,
                      border: `1px solid ${
                        dateGate.level === 'error'   ? '#FCA5A5' :
                        dateGate.level === 'warning' ? AMBER :
                                                       V_DIM2
                      }`,
                      borderRadius: 12,
                      padding: '12px 16px',
                      fontSize: 13,
                      lineHeight: 1.5,
                      color:
                        dateGate.level === 'error'   ? '#991B1B' :
                        dateGate.level === 'warning' ? AMBER :
                                                       INK2,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                      fontWeight: 500,
                      marginBottom: 16,
                      animation: 'sp1-popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    }}
                  >
                    <span style={{ flexShrink: 0, fontSize: 15 }}>
                      {dateGate.level === 'error' ? '⛔' : dateGate.level === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                    <span>{dateGate.message}</span>
                  </div>
                )}

                {/* Auto-calculated timeline */}
                {dateEvent && !dateBlocked && tlDurationDays > 0 && (
                  <div style={{
                    background: V_DIM, border: `1.5px solid ${BORDER}`,
                    borderRadius: 14, padding: '16px 20px',
                    marginBottom: 24,
                    animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: V, marginBottom: 16 }}>
                      Kampagnen-Timeline
                    </div>

                    {/* 3-node timeline */}
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      {/* Node: Heute */}
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: 52 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: GREEN, border: '2px solid white', boxShadow: `0 0 0 3px ${GREEN_BG}` }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, marginTop: 5, textAlign: 'center' as const, lineHeight: 1.3 }}>
                          Heute<br />
                          <span style={{ fontWeight: 400, color: MUTED }}>{fmtPillDE(todayISO())}</span>
                        </div>
                      </div>

                      {/* Connector: setup period (gray) */}
                      <div style={{ flex: 1, height: 2, background: BORDER2, marginTop: 4, position: 'relative' as const }}>
                        <div style={{
                          position: 'absolute' as const, top: -18, left: '50%', transform: 'translateX(-50%)',
                          fontSize: 9.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' as const,
                          background: BG, padding: '0 4px',
                        }}>
                          Vorlauf
                        </div>
                      </div>

                      {/* Node: Kampagnenstart */}
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: 70 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: WHITE, border: `2.5px solid ${V}` }} />
                        <div style={{ fontSize: 10, fontWeight: 700, color: V, marginTop: 5, textAlign: 'center' as const, lineHeight: 1.3 }}>
                          Start<br />
                          <span style={{ fontWeight: 400, color: INK2 }}>{fmtPillDE(tlCampaignStart)}</span>
                        </div>
                      </div>

                      {/* Connector: campaign (violet) */}
                      <div style={{ flex: 2, height: 2, background: V, marginTop: 4, position: 'relative' as const }}>
                        <div style={{
                          position: 'absolute' as const, top: -18, left: '50%', transform: 'translateX(-50%)',
                          fontSize: 9.5, fontWeight: 700, color: V, whiteSpace: 'nowrap' as const,
                          background: BG, padding: '0 4px',
                        }}>
                          {tlDurationDays} Tage
                        </div>
                      </div>

                      {/* Node: Abstimmungstag */}
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: 70 }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: V, border: '2px solid white', boxShadow: `0 0 0 3px ${V_DIM2}`, marginTop: -1 }} />
                        <div style={{ fontSize: 10, fontWeight: 800, color: V, marginTop: 5, textAlign: 'center' as const, lineHeight: 1.3 }}>
                          Abstimmung<br />
                          <span style={{ fontWeight: 400 }}>{fmtPillDE(dateEvent)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7, marginTop: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: V, background: WHITE, border: `1px solid ${BORDER2}`, borderRadius: 99, padding: '3px 10px' }}>
                        {tlDurationDays} Tage · {Math.round(tlDurationDays / 7)} Wochen
                      </span>
                      {tlPkgHint && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: INK2, background: WHITE, border: `1px solid ${BORDER}`, borderRadius: 99, padding: '3px 10px' }}>
                          {tlPkgHint}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <button
                    onClick={next}
                    disabled={!q1Valid}
                    style={{
                      flex: 1, padding: '13px 24px', borderRadius: 10, border: 'none',
                      background: !q1Valid ? BORDER : V,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700,
                      color: !q1Valid ? MUTED : WHITE,
                      cursor: !q1Valid ? 'not-allowed' : 'pointer',
                      boxShadow: !q1Valid ? 'none' : '0 4px 18px rgba(107,79,187,0.28)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    className="sp1-btn-next"
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* ────── Q2: Wo ────────────────────────────────────────────────── */}
            {curQ === 2 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 2 von 3</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: INK, letterSpacing: -0.3, marginBottom: 5, lineHeight: 1.25 }}>Wo ist deine Zielregion?</div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 22, lineHeight: 1.55 }}>Wähle Kantone oder Gemeinden. Mehrere Gebiete lassen sich kombinieren.</div>

                {/* Search */}
                <div style={{ position: 'relative' as const, marginBottom: 10 }}>
                  <input
                    type="text"
                    className="sp1-region-search"
                    placeholder="Kanton oder Gemeinde suchen…"
                    value={regionQuery}
                    onChange={e => { setRegionQuery(e.target.value); setDdOpen(true); }}
                    onFocus={() => setDdOpen(true)}
                    onBlur={() => setTimeout(() => setDdOpen(false), 160)}
                  />
                </div>

                {/* Dropdown */}
                {ddOpen && (
                  <div style={{
                    background: WHITE, border: `1.5px solid ${BORDER2}`, borderRadius: 12,
                    boxShadow: SHADOW_H, overflow: 'hidden', maxHeight: 280, overflowY: 'auto' as const,
                    marginBottom: 14,
                  }}>
                    {filteredRegions.length === 0 ? (
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: INK }}>Region nicht gefunden?</div>
                        <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 4 }}>
                          Kein Problem — wir haben fast immer eine Lösung. Schreib uns kurz.
                        </div>
                        <a
                          href="mailto:hello@vio.ch"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            fontSize: 13, fontWeight: 600, color: V,
                            textDecoration: 'none',
                            background: V_DIM2, borderRadius: 8,
                            padding: '8px 12px', width: 'fit-content',
                          }}
                          onMouseDown={e => e.preventDefault()}
                        >
                          hello@vio.ch kontaktieren →
                        </a>
                      </div>
                    ) : filteredRegions.map(r => (
                      <div
                        key={r.name + r.type}
                        className="sp1-region-opt"
                        onMouseDown={() => addRegion(r)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 16px', cursor: 'pointer',
                          fontSize: 14, color: INK,
                          borderBottom: `1px solid ${BORDER}`,
                          transition: 'background 0.12s',
                        }}
                      >
                        <span style={{
                          fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const,
                          letterSpacing: 0.7, padding: '2px 6px', borderRadius: 4,
                          background: r.type === 'schweiz' ? 'rgba(30,158,106,0.12)' : V_DIM2,
                          color: r.type === 'schweiz' ? GREEN : V,
                          flexShrink: 0,
                        }}>
                          {r.type === 'schweiz' ? 'National' : r.type === 'kanton' ? 'Kanton' : 'Gemeinde'}
                        </span>
                        {r.name}
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                {regions.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 7, marginBottom: 24 }}>
                    {regions.map(r => {
                      const klass = klassifiziereRegion(r);
                      const badge = klass.klasse === 'begrenzt'
                        ? { text: 'Erhöhter Online-Anteil', show: true }
                        : klass.klasse === 'display-dominant'
                          ? { text: 'Primär online', show: true }
                          : { text: '', show: false };

                      return (
                        <div key={r.name} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: V_DIM2, border: `1.5px solid ${BORDER2}`,
                          borderRadius: 99, padding: '5px 14px',
                          fontSize: 13, fontWeight: 600, color: V,
                          animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                        }}>
                          {r.name}
                          {badge.show && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#6B4FBB',
                              background: '#F7F5FF',
                              border: '1px solid rgba(107,79,187,0.20)',
                              borderRadius: 100,
                              padding: '1px 8px',
                              marginLeft: 6,
                              whiteSpace: 'nowrap' as const,
                            }}>
                              {badge.text}
                            </span>
                          )}
                          <span
                            onClick={() => removeRegion(r.name)}
                            style={{ cursor: 'pointer', fontSize: 13, opacity: 0.5, lineHeight: 1, marginLeft: 2 }}
                          >✕</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {screenHinweis && (
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 10,
                    background: '#F0ECFA', border: '1px solid rgba(107,79,187,0.15)',
                    fontSize: 12, color: '#5A4A7A', lineHeight: 1.55,
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    marginBottom: 12,
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: V, flexShrink: 0, marginTop: 4 }} />
                    <span>{screenHinweis}</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <button onClick={back} className="sp1-btn-back" style={{ padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: WHITE, fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 500, color: MUTED, cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0 }}>← Zurück</button>
                  <button
                    onClick={next}
                    disabled={regions.length === 0}
                    style={{
                      flex: 1, padding: '13px 24px', borderRadius: 10, border: 'none',
                      background: regions.length === 0 ? BORDER : V,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700,
                      color: regions.length === 0 ? MUTED : WHITE,
                      cursor: regions.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow: regions.length === 0 ? 'none' : '0 4px 18px rgba(107,79,187,0.28)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    className="sp1-btn-next"
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* ────── Q3: Budget ────────────────────────────────────────────── */}
            {curQ === 3 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 3 von 3</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: INK, letterSpacing: -0.3, marginBottom: 5, lineHeight: 1.25 }}>Hast du schon ein Budget?</div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 22, lineHeight: 1.55 }}>Wenn ja, gib uns einen Richtwert. Wenn nicht, kein Problem – du legst das im nächsten Schritt fest.</div>

                {/* Budget display */}
                <div style={{ marginBottom: 20 }}>
                  {budgetKnown ? (
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 44, fontWeight: 800, color: V, letterSpacing: -2, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span style={{ fontSize: 20, fontWeight: 600, color: MUTED, letterSpacing: 0 }}>CHF</span>
                      <span>{budget.toLocaleString('de-CH').replace(/\./g, "'")}</span>
                    </div>
                  ) : (
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 44, fontWeight: 800, color: MUTED, letterSpacing: -2, lineHeight: 1 }}>
                      Noch offen
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 4, opacity: budgetKnown ? 1 : 0.4 }}>Mindestbudget: CHF 4&apos;000</div>
                </div>

                {/* Slider */}
                <div style={{
                  transition: 'opacity 0.3s, max-height 0.3s',
                  maxHeight: budgetKnown ? 200 : 0,
                  overflow: 'hidden',
                  opacity: budgetKnown ? 1 : 0.3,
                  pointerEvents: budgetKnown ? 'auto' : 'none',
                }}>
                  <input
                    type="range"
                    className="sp1-range"
                    min={4000}
                    max={50000}
                    step={500}
                    value={budget}
                    onChange={e => setBudget(Number(e.target.value))}
                    style={{
                      background: `linear-gradient(to right, ${V} ${budgetPct}%, ${BORDER} ${budgetPct}%)`,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, marginBottom: 20 }}>
                    <span>CHF 4&apos;000</span>
                    <span>CHF 50&apos;000+</span>
                  </div>
                </div>

                {/* "Ich weiss es noch nicht" toggle */}
                <button
                  onClick={() => setBudgetKnown(k => !k)}
                  className={`sp1-nob${!budgetKnown ? ' active' : ''}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '9px 16px', borderRadius: 99,
                    border: `1.5px dashed ${BORDER2}`, background: 'transparent',
                    fontFamily: "'Jost', sans-serif", fontSize: 13, fontWeight: 500, color: MUTED,
                    cursor: 'pointer', transition: 'all 0.18s', marginBottom: 24,
                  }}
                >
                  {budgetKnown ? 'Ich weiss es noch nicht' : 'Budget doch eingeben'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <button onClick={back} className="sp1-btn-back" style={{ padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: WHITE, fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 500, color: MUTED, cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0 }}>← Zurück</button>
                  <button
                    onClick={finish}
                    style={{
                      flex: 1, padding: '13px 24px', borderRadius: 10, border: 'none',
                      background: V,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700,
                      color: WHITE,
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(107,79,187,0.28)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    className="sp1-btn-next"
                  >
                    Zum Budget &amp; Reichweite →
                  </button>
                </div>
              </div>
            )}

          </div>{/* end slide track */}
        </div>{/* end main flow area */}

        {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
        <aside style={{ position: 'sticky' as const, top: 76 }}>
          <div style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 16, padding: 22, boxShadow: SHADOW }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, textTransform: 'uppercase' as const, color: V, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: V }} />
              Warum fragen wir das?
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 800, color: INK, marginBottom: 8, lineHeight: 1.3 }}>{sb.title}</div>
            <div style={{ fontSize: 13, color: INK2, lineHeight: 1.65, marginBottom: 14 }}>{sb.text}</div>
            <div
              style={{ background: AMBER_BG, borderLeft: `3px solid ${AMBER}`, borderRadius: '0 8px 8px 0', padding: '9px 12px', fontSize: 12.5, color: INK2, lineHeight: 1.5 }}
              dangerouslySetInnerHTML={{ __html: sb.tip }}
            />
          </div>
        </aside>

      </div>{/* end page grid */}
    </div>
  );
}
