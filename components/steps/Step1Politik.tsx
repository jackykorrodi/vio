'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { Region, ALL_REGIONS } from '@/lib/regions';
import { buildVioPackages } from '@/lib/vio-paketlogik';

// ─── Types ───────────────────────────────────────────────────────────────────

type CampaignType = 'abstimmung' | 'wahl';
type SubtypeVal = 'ja' | 'nein' | 'mob' | 'kand' | 'liste';

interface SubtypeOption {
  val: SubtypeVal;
  name: string;
  desc: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const SUBTYPES: Record<CampaignType, SubtypeOption[]> = {
  abstimmung: [
    { val: 'ja',   name: 'JA-Kampagne',  desc: 'Für eine Initiative oder einen Gegenvorschlag.' },
    { val: 'nein', name: 'NEIN-Kampagne', desc: 'Gegen eine Initiative oder ein Referendum.' },
    { val: 'mob',  name: 'Mobilisierung', desc: 'Stimmberechtigte zur Urne bewegen.' },
  ],
  wahl: [
    { val: 'kand',  name: 'Kandidatur',   desc: 'Persönlichkeitskampagne für eine Person.' },
    { val: 'liste', name: 'Listenwahl',   desc: 'Mehrere Kandidierende auf einer Parteiliste.' },
    { val: 'mob',   name: 'Mobilisierung',desc: 'Wählerschaft aktivieren.' },
  ],
};

const SIDEBAR: Record<number, { title: string; text: string; tip: string }> = {
  1: {
    title: 'Abstimmung oder Wahl – macht das einen Unterschied?',
    text:  'Ja. Abstimmungen brauchen klare Botschaften (Ja/Nein), kurze Kampagnenfenster und hohe Frequenz. Bei Wahlen geht es stärker um Bekanntheit und Gesichtspräsenz – das verändert wie wir aussteuern.',
    tip:   '<strong>Gut zu wissen:</strong> Abstimmungskampagnen profitieren davon, früh zu starten. Die letzten 10 Tage sind am wirkungsvollsten.',
  },
  2: {
    title: 'Warum zuerst das Enddatum?',
    text:  'Weil der Abstimmungs- oder Wahltag fix ist. Von dort aus rechnen wir rückwärts – so siehst du sofort, wie viel Vorlauf du noch hast und ob das Budget reicht.',
    tip:   '<strong>Empfehlung:</strong> 4–6 Wochen Vorlauf sind ideal. Unter 2 Wochen wird es knapp – aber auch das ist möglich.',
  },
  3: {
    title: 'Lokal wirkt stärker.',
    text:  'Wer in einer Region lebt und dort Werbung sieht, nimmt sie als relevanter wahr. Deshalb spielen wir ausschliesslich in deinen Zielgebieten aus – keine Streuverluste ausserhalb deines Wahlkreises.',
    tip:   '<strong>Tipp:</strong> Du kannst Kantone und Gemeinden kombinieren. Wir fassen alles zu einer einzigen Kampagne zusammen.',
  },
  4: {
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

function mapSubtype(st: string | null): 'ja' | 'nein' | 'kandidat' | 'event' {
  if (st === 'ja')   return 'ja';
  if (st === 'nein') return 'nein';
  if (st === 'kand' || st === 'liste') return 'kandidat';
  return 'event';
}

function fmtCHF(n: number): string {
  return "CHF " + n.toLocaleString('de-CH').replace(/\./g, "'");
}

function calcDaysUntil(iso: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + 'T00:00:00');
  return Math.max(0, Math.round((d.getTime() - today.getTime()) / 86400000));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  onComplete: () => void;
  isActive: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Step1Politik({ updateBriefing, onComplete }: Props) {
  // Navigation
  const [curQ, setCurQ] = useState(1);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  // Q1 state
  const [campaignType, setCampaignType] = useState<CampaignType | null>(null);
  const [subtype, setSubtype]           = useState<SubtypeVal | null>(null);
  const [subtypeOpen, setSubtypeOpen]   = useState(false);

  // Q2 state
  const [dateEvent, setDateEvent] = useState('');
  const [dateStart, setDateStart] = useState('');

  // Q3 state
  const [regions, setRegions]         = useState<Region[]>([]);
  const [regionQuery, setRegionQuery] = useState('');
  const [ddOpen, setDdOpen]           = useState(false);

  // Q4 state
  const [budget, setBudget]           = useState(5000);
  const [budgetKnown, setBudgetKnown] = useState(true);

  // Summary pills (accumulated as user progresses)
  const [pills, setPills] = useState<string[]>([]);

  // ─── Navigation ───────────────────────────────────────────────────────────

  const goTo = (q: number, dir: 'forward' | 'back') => {
    if (dir === 'forward') {
      // Snapshot current answers into pills before moving forward
      const newPills: string[] = [];
      if (campaignType && subtype) {
        const st = SUBTYPES[campaignType]?.find(x => x.val === subtype);
        if (st) newPills.push(st.name);
      }
      if (dateEvent) {
        const d = new Date(dateEvent + 'T00:00:00');
        newPills.push(d.toLocaleDateString('de-CH', { day: '2-digit', month: 'short', year: 'numeric' }));
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

  const filteredRegions = regionQuery.length > 0
    ? ALL_REGIONS
        .filter(r =>
          r.name.toLowerCase().includes(regionQuery.toLowerCase()) &&
          !regions.find(x => x.name === r.name)
        )
        .slice(0, 10)
    : [];

  const addRegion = (r: Region) => {
    setRegions(prev => [...prev, r]);
    setRegionQuery('');
    setDdOpen(false);
  };

  const removeRegion = (name: string) => {
    setRegions(prev => prev.filter(r => r.name !== name));
  };

  // ─── Timeline ─────────────────────────────────────────────────────────────

  let timelineDays  = 0;
  let timelineWeeks = 0;
  let timelineShow  = false;
  if (dateEvent && dateStart) {
    const evD = new Date(dateEvent + 'T00:00:00');
    const stD = new Date(dateStart + 'T00:00:00');
    timelineDays  = Math.round((evD.getTime() - stD.getTime()) / 86400000);
    timelineWeeks = Math.round(timelineDays / 7);
    timelineShow  = timelineDays > 0;
  }
  const q2Valid = !!dateEvent && (dateStart ? timelineDays > 0 : true);

  // ─── Finish ───────────────────────────────────────────────────────────────

  const finish = () => {
    const vioData = buildVioPackages({
      regions:      regions.map(r => ({ eligibleVoters: r.stimm })),
      voteDate:     dateEvent || null,
      campaignType: mapSubtype(subtype),
    });
    const rec  = vioData.packages[vioData.recommendedPackage];
    const days = dateEvent ? calcDaysUntil(dateEvent) : 0;

    updateBriefing({
      politikType:       mapSubtype(subtype),
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

      {/* Keyframes – only for slide animations (cannot be done inline) */}
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
      `}</style>

      {/* ── Page layout ─────────────────────────────────────────────────────── */}
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
          {/* Flow label */}
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase' as const, color: V, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            Schritt 1 · Politische Kampagne
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>

          {/* Flow title */}
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 800, color: INK, letterSpacing: -0.5, marginBottom: 28, lineHeight: 1.2 }}>
            Lass uns deine{' '}
            <em style={{ fontStyle: 'italic', color: V }}>Kampagne einrichten.</em>
          </h1>

          {/* Progress dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 32 }}>
            {[1, 2, 3, 4].map(i => (
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

            {/* ────── Q1: Was ──────────────────────────────────────────────── */}
            {curQ === 1 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 1 von 4</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: INK, letterSpacing: -0.3, marginBottom: 5, lineHeight: 1.25 }}>Worum geht es?</div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 22, lineHeight: 1.55 }}>Abstimmung oder Wahl – das gibt uns die Grundlage für alles weitere.</div>

                {/* Type cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
                  {([
                    { val: 'abstimmung' as CampaignType, name: 'Abstimmung', desc: 'Volksinitiative, Referendum oder kommunale Vorlage.' },
                    { val: 'wahl'       as CampaignType, name: 'Wahl',        desc: 'National-, Kantons-, Gemeinderat oder Regierungsrat.' },
                  ]).map(opt => (
                    <button
                      key={opt.val}
                      className="sp1-card"
                      onClick={() => {
                        setCampaignType(opt.val);
                        setSubtype(null);
                        setSubtypeOpen(true);
                      }}
                      style={{
                        background: campaignType === opt.val ? V_DIM : WHITE,
                        border: `1.5px solid ${campaignType === opt.val ? V : BORDER}`,
                        borderRadius: 14, padding: '16px 18px',
                        cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 13,
                        textAlign: 'left' as const, boxShadow: SHADOW, position: 'relative' as const,
                        transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                        userSelect: 'none' as const, width: '100%',
                      }}
                    >
                      {campaignType === opt.val && (
                        <div style={{
                          position: 'absolute', top: 8, right: 10,
                          width: 16, height: 16, borderRadius: '50%',
                          background: WHITE, border: `1.5px solid ${V}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: V, lineHeight: 1, paddingTop: 1,
                        }}>✓</div>
                      )}
                      <div>
                        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: INK, marginBottom: 2 }}>{opt.name}</div>
                        <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{opt.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Subtype (animated expand) */}
                <div style={{
                  overflow: 'hidden',
                  maxHeight: subtypeOpen && campaignType ? 300 : 0,
                  opacity: subtypeOpen && campaignType ? 1 : 0,
                  transition: 'max-height 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
                  marginBottom: subtypeOpen && campaignType ? 24 : 0,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 10 }}>Genauer –</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {campaignType && SUBTYPES[campaignType].map(st => (
                      <button
                        key={st.val}
                        className="sp1-card"
                        onClick={() => setSubtype(st.val)}
                        style={{
                          background: subtype === st.val ? V_DIM : WHITE,
                          border: `1.5px solid ${subtype === st.val ? V : BORDER}`,
                          borderRadius: 14, padding: '16px 18px',
                          cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 13,
                          textAlign: 'left' as const, boxShadow: SHADOW, position: 'relative' as const,
                          transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
                          userSelect: 'none' as const, width: '100%',
                        }}
                      >
                        {subtype === st.val && (
                          <div style={{
                            position: 'absolute', top: 8, right: 10,
                            width: 16, height: 16, borderRadius: '50%',
                            background: WHITE, border: `1.5px solid ${V}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 800, color: V, lineHeight: 1, paddingTop: 1,
                          }}>✓</div>
                        )}
                        <div>
                          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: INK, marginBottom: 2 }}>{st.name}</div>
                          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.4 }}>{st.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <button
                    onClick={next}
                    disabled={!campaignType || !subtype}
                    style={{
                      flex: 1, padding: '13px 24px', borderRadius: 10, border: 'none',
                      background: (!campaignType || !subtype) ? BORDER : V,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700,
                      color: (!campaignType || !subtype) ? MUTED : WHITE,
                      cursor: (!campaignType || !subtype) ? 'not-allowed' : 'pointer',
                      boxShadow: (!campaignType || !subtype) ? 'none' : '0 4px 18px rgba(107,79,187,0.28)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    className="sp1-btn-next"
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* ────── Q2: Wann ──────────────────────────────────────────────── */}
            {curQ === 2 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 2 von 4</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 21, fontWeight: 800, color: INK, letterSpacing: -0.3, marginBottom: 5, lineHeight: 1.25 }}>Wann findet das statt?</div>
                <div style={{ fontSize: 14, color: MUTED, marginBottom: 22, lineHeight: 1.55 }}>Erst der Abstimmungssonntag – dann der Kampagnenstart. So haben wir den Vorlauf im Blick.</div>

                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14, marginBottom: 20 }}>
                  {/* Event date */}
                  <div
                    className="sp1-date-field"
                    style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', boxShadow: SHADOW, transition: 'border-color 0.18s, box-shadow 0.18s' }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' as const, color: MUTED, marginBottom: 8 }}>
                      Abstimmungs- / Wahltag
                    </label>
                    <input
                      type="date"
                      className="sp1-date-input"
                      value={dateEvent}
                      onChange={e => setDateEvent(e.target.value)}
                    />
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>Bundesabstimmungen finden immer an einem Sonntag statt.</div>
                  </div>

                  {/* Start date */}
                  <div
                    className="sp1-date-field"
                    style={{ background: WHITE, border: `1.5px solid ${BORDER}`, borderRadius: 14, padding: '16px 20px', boxShadow: SHADOW, transition: 'border-color 0.18s, box-shadow 0.18s' }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' as const, color: MUTED, marginBottom: 8 }}>
                      Kampagnenstart
                    </label>
                    <input
                      type="date"
                      className="sp1-date-input"
                      value={dateStart}
                      onChange={e => setDateStart(e.target.value)}
                    />
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>Wir empfehlen 4–6 Wochen Vorlauf für maximale Wirkung.</div>
                  </div>
                </div>

                {/* Timeline pill */}
                {timelineShow && (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: V_DIM2, border: `1.5px solid ${BORDER2}`,
                    borderRadius: 99, padding: '10px 20px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700, color: V,
                    marginBottom: 24,
                    animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  }}>
                    <span>{timelineDays} Tage Kampagnendauer · {timelineWeeks} Wochen</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <button onClick={back} className="sp1-btn-back" style={{ padding: '11px 18px', borderRadius: 10, border: `1.5px solid ${BORDER}`, background: WHITE, fontFamily: "'Jost', sans-serif", fontSize: 14, fontWeight: 500, color: MUTED, cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0 }}>← Zurück</button>
                  <button
                    onClick={next}
                    disabled={!q2Valid}
                    style={{
                      flex: 1, padding: '13px 24px', borderRadius: 10, border: 'none',
                      background: !q2Valid ? BORDER : V,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, fontWeight: 700,
                      color: !q2Valid ? MUTED : WHITE,
                      cursor: !q2Valid ? 'not-allowed' : 'pointer',
                      boxShadow: !q2Valid ? 'none' : '0 4px 18px rgba(107,79,187,0.28)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                    className="sp1-btn-next"
                  >
                    Weiter →
                  </button>
                </div>
              </div>
            )}

            {/* ────── Q3: Wo ────────────────────────────────────────────────── */}
            {curQ === 3 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 3 von 4</div>
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
                {ddOpen && (regionQuery.length > 0) && (
                  <div style={{
                    background: WHITE, border: `1.5px solid ${BORDER2}`, borderRadius: 12,
                    boxShadow: SHADOW_H, overflow: 'hidden', maxHeight: 210, overflowY: 'auto' as const,
                    marginBottom: 14,
                  }}>
                    {filteredRegions.length === 0 ? (
                      <div style={{ padding: '10px 16px', fontSize: 14, color: MUTED, fontStyle: 'italic' }}>Keine Treffer</div>
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
                    {regions.map(r => (
                      <div key={r.name} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: V_DIM2, border: `1.5px solid ${BORDER2}`,
                        borderRadius: 99, padding: '5px 14px',
                        fontSize: 13, fontWeight: 600, color: V,
                        animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      }}>
                        {r.name}
                        <span
                          onClick={() => removeRegion(r.name)}
                          style={{ cursor: 'pointer', fontSize: 13, opacity: 0.5, lineHeight: 1, marginLeft: 2 }}
                        >✕</span>
                      </div>
                    ))}
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

            {/* ────── Q4: Budget ────────────────────────────────────────────── */}
            {curQ === 4 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: 0.8, textTransform: 'uppercase' as const, marginBottom: 6 }}>Frage 4 von 4</div>
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
