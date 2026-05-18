'use client';

import { useState, useRef, useLayoutEffect } from 'react';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const V       = '#6B4FBB';
const INK     = '#1E1535';
const INK2    = '#4A3A72';
const MUTED   = 'rgba(30,21,53,0.42)';
const WHITE   = '#FFFFFF';
const AMBER   = '#C96A00';
const AMBER_BG = 'rgba(201,106,0,0.07)';
const V_DIM   = 'rgba(107,79,187,0.09)';
const V_DIM2  = 'rgba(107,79,187,0.16)';

const STIMMUNTERLAGEN_OFFSET = 28;
const MIN_BULLET_PX = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function todayISO(): string {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round(
    (new Date(toISO + 'T00:00:00').getTime() - new Date(fromISO + 'T00:00:00').getTime()) / 86400000,
  );
}

function getKampParatDate(daysToEvent: number, versand: string, today: string): string {
  if (daysToEvent >= 49) return addDaysISO(versand, -10);
  if (daysToEvent >= 35) return addDaysISO(versand, -7);
  if (daysToEvent >= 21) return addDaysISO(today, 3);
  if (daysToEvent >= 10) return addDaysISO(today, 1);
  return today;
}

function getVorlaufHint(days: number): { text: string; bg: string; border: string; color: string } {
  if (days >= 49) return { text: `${days} Tage — alle Kampagnenlängen möglich, von kompakt bis langfristig.`, bg: V_DIM, border: V_DIM2, color: INK2 };
  if (days >= 35) return { text: `${days} Tage — komfortabler Vorlauf. Aussenwerbung und Online-Werbung breit kombinierbar.`, bg: V_DIM, border: V_DIM2, color: INK2 };
  if (days >= 21) return { text: `${days} Tage — Vorlauf reicht für eine kompakte Kampagne mit Aussenwerbung und Online-Werbung.`, bg: V_DIM, border: V_DIM2, color: INK2 };
  if (days >= 10) return { text: `${days} Tage — Online-Werbung wahrscheinlich. Aussenwerbung braucht mehr Vorlauf.`, bg: AMBER_BG, border: AMBER, color: AMBER };
  if (days >= 3)  return { text: `Nur ${days} Tage — Last-Minute. Kurze Online-Werbung sinnvoll.`, bg: AMBER_BG, border: AMBER, color: AMBER };
  return { text: `Nur ${days} Tage — zu kurzfristig, kein Kampagnenaufbau mehr möglich.`, bg: '#FFF0F0', border: '#FCA5A5', color: '#991B1B' };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  votingDateISO: string;
  daysToEvent: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function KampagnenTimeline({ votingDateISO, daysToEvent }: Props) {
  const [ttParat,   setTtParat]   = useState(false);
  const [ttVersand, setTtVersand] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const [trackW, setTrackW] = useState(560);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setTrackW(el.offsetWidth);
    const obs = new ResizeObserver(() => setTrackW(el.offsetWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const today      = todayISO();
  const versand    = addDaysISO(votingDateISO, -STIMMUNTERLAGEN_OFFSET);
  const versandPast = versand < today;
  const axisStart  = versandPast ? versand : today;
  const axisStartMs = new Date(axisStart + 'T00:00:00').getTime();
  const axisSpan   = Math.max(1, new Date(votingDateISO + 'T00:00:00').getTime() - axisStartMs);
  const toPx = (iso: string) =>
    Math.max(0, (new Date(iso + 'T00:00:00').getTime() - axisStartMs) / axisSpan * trackW);

  const kampParatDate = getKampParatDate(daysToEvent, versand, today);
  const kampParatGray = daysToEvent < 3;
  const hint = getVorlaufHint(daysToEvent);

  // [versand, heute, kampParat, abstimmung] in raw px
  const raw = [toPx(versand), toPx(today), toPx(kampParatDate), trackW];

  // Forward min-distance pass on indices 0–2 (abstimmung = index 3 stays fixed)
  const adj = [...raw];
  for (let i = 1; i <= 2; i++) {
    if (adj[i] - adj[i - 1] < MIN_BULLET_PX) adj[i] = adj[i - 1] + MIN_BULLET_PX;
  }
  // Overflow: clamp back if kampParat pushed past abstimmung
  if (adj[2] >= trackW) {
    adj[2] = trackW - MIN_BULLET_PX;
    if (adj[1] >= adj[2]) adj[1] = adj[2] - MIN_BULLET_PX;
    if (adj[0] >= adj[1]) adj[0] = Math.max(0, adj[1] - MIN_BULLET_PX);
  }

  // Phase bar: true proportional (raw px, not adj)
  const versandPct = Math.max(0, Math.min(100, raw[0] / trackW * 100));
  const daysSinceVersand = versandPast ? daysBetween(versand, today) : 0;
  const daysVorbPrep     = versandPast ? 0 : daysBetween(today, versand);

  const node = (px: number) => ({
    position: 'absolute' as const,
    left: px,
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    zIndex: 1,
  });

  const ttBox = {
    position: 'absolute' as const,
    bottom: 'calc(100% + 6px)',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#2D1F52',
    color: 'white',
    borderRadius: 8,
    padding: '8px 12px',
    fontSize: 12,
    maxWidth: 240,
    width: 'max-content',
    zIndex: 50,
    lineHeight: 1.5,
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  };

  return (
    <div style={{ background: '#F3F0FF', borderRadius: 16, padding: '18px 20px', border: '1.5px solid rgba(107,79,187,0.14)', marginBottom: 24, animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: '#7A7596', marginBottom: 10 }}>
        KAMPAGNEN-TIMELINE
      </div>

      {/* Vorlauf hint */}
      <div style={{ background: hint.bg, border: `1px solid ${hint.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: hint.color, lineHeight: 1.5, marginBottom: 20 }}>
        {hint.text}
      </div>

      {/* Bullets track */}
      <div ref={trackRef} style={{ position: 'relative' as const, height: 68, marginBottom: 16 }}>
        <div style={{ position: 'absolute' as const, top: 7, left: 0, right: 0, height: 1, background: 'rgba(107,79,187,0.18)' }} />

        {/* Unterlagen-Versand */}
        <div style={node(adj[0])}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: versandPast ? 'rgba(107,79,187,0.15)' : WHITE, border: `2px solid ${versandPast ? 'rgba(107,79,187,0.25)' : 'rgba(107,79,187,0.45)'}`, opacity: versandPast ? 0.6 : 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, position: 'relative' as const }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' as const }}>Unterlagen-Versand</div>
            <span style={{ color: '#7A7596', cursor: 'help', fontSize: 10, flexShrink: 0 }} onMouseEnter={() => setTtVersand(true)} onMouseLeave={() => setTtVersand(false)}>ⓘ</span>
            {ttVersand && <div style={ttBox}>Ca. 4 Wochen vor dem Abstimmungssonntag kommen die Abstimmungsunterlagen ins Haus. Viele Stimmberechtigte entscheiden genau in dieser Phase. Kampagnen, die hier präsent sind, erzielen die höchste Wirkung.</div>}
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 500, color: MUTED, marginTop: 1 }}>{fmt(versand)}</div>
        </div>

        {/* Heute */}
        <div style={node(adj[1])}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: V, border: `2.5px solid ${V}` }} />
          <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, marginTop: 5, whiteSpace: 'nowrap' as const }}>Heute</div>
          <div style={{ fontSize: 9.5, fontWeight: 500, color: INK, marginTop: 1 }}>{fmt(today)}</div>
        </div>

        {/* Kampagne parat */}
        <div style={node(adj[2])}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: kampParatGray ? 'rgba(107,79,187,0.15)' : WHITE, border: `2px solid ${kampParatGray ? 'rgba(107,79,187,0.25)' : V}` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, position: 'relative' as const }}>
            <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' as const }}>Kampagne parat</div>
            <span style={{ color: '#7A7596', cursor: 'help', fontSize: 10, flexShrink: 0 }} onMouseEnter={() => setTtParat(true)} onMouseLeave={() => setTtParat(false)}>ⓘ</span>
            {ttParat && <div style={ttBox}>DOOH-Screens für politische Kampagnen werden von jedem Betreiber individuell freigegeben — das dauert ca. 10 Tage. Bis zu diesem Datum müssen deine Werbemittel und die Kampagne freigegeben sein. Keine Angst, wir helfen dir dabei!</div>}
          </div>
          <div style={{ fontSize: 9.5, fontWeight: 500, color: kampParatGray ? MUTED : INK, marginTop: 1 }}>{fmt(kampParatDate)}</div>
        </div>

        {/* Abstimmung */}
        <div style={node(adj[3])}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: WHITE, border: `2.5px solid ${V}` }} />
          <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, marginTop: 5, whiteSpace: 'nowrap' as const }}>Abstimmung</div>
          <div style={{ fontSize: 9.5, fontWeight: 700, color: V, marginTop: 1 }}>{fmt(votingDateISO)}</div>
        </div>
      </div>

      {/* Phase bars — echte Proportion, kein Clamping */}
      <div>
        {versandPast ? (
          <div>
            <div style={{ height: 4, background: V, borderRadius: 2 }} />
            <div style={{ marginTop: 7, fontSize: 10, fontWeight: 500, color: INK2 }}>
              Heisse Phase aktiv seit {daysSinceVersand}d (28d total)
            </div>
          </div>
        ) : (
          <div>
            <div style={{ position: 'relative' as const, height: 4 }}>
              <div style={{ position: 'absolute' as const, left: 0, width: `${versandPct}%`, height: '100%', background: 'rgba(107,79,187,0.28)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute' as const, left: `${versandPct}%`, right: 0, height: '100%', background: V, borderRadius: '0 2px 2px 0' }} />
            </div>
            <div style={{ position: 'relative' as const, height: 20, marginTop: 7 }}>
              <div style={{ position: 'absolute' as const, left: `${versandPct / 2}%`, transform: 'translateX(-50%)', fontSize: 10, color: MUTED, whiteSpace: 'nowrap' as const }}>
                {daysVorbPrep} Tage Vorbereitung
              </div>
              <div style={{ position: 'absolute' as const, left: `${versandPct + (100 - versandPct) / 2}%`, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 500, color: INK2, whiteSpace: 'nowrap' as const }}>
                {STIMMUNTERLAGEN_OFFSET} Tage Heisse Phase
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
