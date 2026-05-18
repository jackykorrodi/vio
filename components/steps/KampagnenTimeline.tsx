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
const DOOH_CUTOFF_DAYS = 10;
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

function getStatusPill(days: number): { text: string; bg: string; border: string; color: string } {
  if (days > 56) return { text: `${days} Tage bis zur Abstimmung — du hast alle Optionen offen`, bg: V_DIM, border: V_DIM2, color: INK2 };
  if (days > 28) return { text: `${days} Tage bis zur Abstimmung — jetzt ist ein guter Zeitpunkt`, bg: V_DIM, border: V_DIM2, color: INK2 };
  if (days > DOOH_CUTOFF_DAYS) return { text: `Stimmzettel sind unterwegs — noch ${days} Tage bis zur Abstimmung`, bg: V_DIM, border: V_DIM2, color: INK2 };
  return { text: `Nur noch ${days} Tage — Plakatwerbung nicht mehr buchbar, Online-Werbung möglich`, bg: AMBER_BG, border: AMBER, color: AMBER };
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
  const state = daysToEvent > 56 ? 1 : daysToEvent > 28 ? 2 : daysToEvent > DOOH_CUTOFF_DAYS ? 3 : 4;
  const pill  = getStatusPill(daysToEvent);

  // Build node list per state
  const nVersand    = { id: 'versand'    as const, rawPx: toPx(versand),      past: versandPast };
  const nHeute      = { id: 'heute'      as const, rawPx: toPx(today),         past: false };
  const nBuchung    = { id: 'buchung'    as const, rawPx: toPx(kampParatDate), past: false };
  const nAbstimmung = { id: 'abstimmung' as const, rawPx: trackW,              past: false };

  const stateNodes = (
    state === 1 ? [nHeute, nVersand, nAbstimmung] :
    state === 2 ? [nHeute, nVersand, nBuchung, nAbstimmung] :
    state === 3 ? [nVersand, nHeute, nBuchung, nAbstimmung] :
                  [nHeute, nAbstimmung]
  );

  // Sort chronologically; forward pass pushes right only; abstimmung stays fixed (last)
  const sorted = [...stateNodes].sort((a, b) => a.rawPx - b.rawPx);
  const adjPx = sorted.map(n => n.rawPx);
  for (let i = 1; i < adjPx.length - 1; i++) {
    if (adjPx[i] - adjPx[i - 1] < MIN_BULLET_PX) adjPx[i] = adjPx[i - 1] + MIN_BULLET_PX;
  }
  const secLast = adjPx.length - 2;
  if (secLast >= 0 && adjPx[secLast] >= trackW - MIN_BULLET_PX) {
    adjPx[secLast] = trackW - MIN_BULLET_PX;
    for (let i = secLast - 1; i >= 0; i--) {
      if (adjPx[i] >= adjPx[i + 1] - MIN_BULLET_PX) adjPx[i] = Math.max(0, adjPx[i + 1] - MIN_BULLET_PX);
    }
  }
  const posNodes = sorted.map((n, i) => ({ ...n, adjPx: adjPx[i] }));

  // Phase bar metrics (true proportional, raw)
  const versandPct       = Math.max(0, Math.min(100, toPx(versand) / trackW * 100));
  const daysSinceVersand = state >= 3 ? Math.max(0, daysBetween(versand, today)) : 0;
  const daysVorbPrep     = state <= 2 ? daysBetween(today, versand) : 0;

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

      {/* Status pill */}
      <div style={{ background: pill.bg, border: `1px solid ${pill.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 500, color: pill.color, lineHeight: 1.5, marginBottom: 20 }}>
        {pill.text}
      </div>

      {/* Bullets track */}
      <div ref={trackRef} style={{ position: 'relative' as const, height: 68, marginBottom: 16 }}>
        <div style={{ position: 'absolute' as const, top: 7, left: 0, right: 0, height: 1, background: 'rgba(107,79,187,0.18)' }} />

        {posNodes.map((n) => {
          const s = { ...node(n.adjPx), opacity: n.past ? 0.45 : 1 };
          if (n.id === 'heute') return (
            <div key="heute" style={s}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: V, border: `2.5px solid ${V}` }} />
              <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, marginTop: 5, whiteSpace: 'nowrap' as const }}>Heute</div>
              <div style={{ fontSize: 9.5, fontWeight: 500, color: INK, marginTop: 1 }}>{fmt(today)}</div>
            </div>
          );
          if (n.id === 'versand') return (
            <div key="versand" style={s}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: n.past ? 'transparent' : WHITE, border: '2px solid rgba(107,79,187,0.45)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, position: 'relative' as const }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' as const }}>Stimmzettel versandt</div>
                <span style={{ color: '#7A7596', cursor: 'help', fontSize: 10, flexShrink: 0 }} onMouseEnter={() => setTtVersand(true)} onMouseLeave={() => setTtVersand(false)}>ⓘ</span>
                {ttVersand && <div style={ttBox}>Ca. 4 Wochen vor dem Abstimmungssonntag kommen die Stimmunterlagen ins Haus. Viele Stimmberechtigte entscheiden genau in dieser Phase — Kampagnen, die hier präsent sind, erzielen die höchste Wirkung.</div>}
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 500, color: MUTED, marginTop: 1 }}>{fmt(versand)}</div>
            </div>
          );
          if (n.id === 'buchung') return (
            <div key="buchung" style={s}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: WHITE, border: `2px solid ${V}` }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 5, position: 'relative' as const }}>
                <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' as const }}>Buchungsschluss</div>
                <span style={{ color: '#7A7596', cursor: 'help', fontSize: 10, flexShrink: 0 }} onMouseEnter={() => setTtParat(true)} onMouseLeave={() => setTtParat(false)}>ⓘ</span>
                {ttParat && <div style={ttBox}>Bis zu diesem Datum müssen deine Werbemittel bereit und die Kampagne gebucht sein. Politische Plakatwerbung braucht ca. 10 Tage Freigabelauf — wir helfen dir dabei!</div>}
              </div>
              <div style={{ fontSize: 9.5, fontWeight: 500, color: INK, marginTop: 1 }}>{fmt(kampParatDate)}</div>
            </div>
          );
          return (
            <div key="abstimmung" style={s}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: WHITE, border: `2.5px solid ${V}` }} />
              <div style={{ fontSize: 9.5, fontWeight: 600, color: MUTED, marginTop: 5, whiteSpace: 'nowrap' as const }}>Abstimmung</div>
              <div style={{ fontSize: 9.5, fontWeight: 700, color: V, marginTop: 1 }}>{fmt(votingDateISO)}</div>
            </div>
          );
        })}
      </div>

      {/* Phase bar */}
      <div>
        {state >= 3 ? (
          <div>
            <div style={{ height: 4, background: state === 4 ? AMBER : V, borderRadius: 2 }} />
            {state === 3 && (
              <div style={{ marginTop: 7, fontSize: 10, fontWeight: 500, color: INK2 }}>
                Stimmzettel wurden vor {daysSinceVersand} Tag{daysSinceVersand === 1 ? '' : 'en'} verschickt — jetzt ist der wirksamste Moment.
              </div>
            )}
          </div>
        ) : state === 2 ? (
          <div>
            <div style={{ position: 'relative' as const, height: 4 }}>
              <div style={{ position: 'absolute' as const, left: 0, width: `${versandPct}%`, height: '100%', background: 'rgba(107,79,187,0.28)', borderRadius: '2px 0 0 2px' }} />
              <div style={{ position: 'absolute' as const, left: `${versandPct}%`, right: 0, height: '100%', background: V, borderRadius: '0 2px 2px 0' }} />
            </div>
            <div style={{ position: 'relative' as const, height: 20, marginTop: 7 }}>
              <div style={{ position: 'absolute' as const, left: `${versandPct / 2}%`, transform: 'translateX(-50%)', fontSize: 10, color: MUTED, whiteSpace: 'nowrap' as const }}>
                {daysVorbPrep} Tage Vorbereitung
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: 4, background: 'rgba(107,79,187,0.28)', borderRadius: 2 }} />
        )}
      </div>
    </div>
  );
}
