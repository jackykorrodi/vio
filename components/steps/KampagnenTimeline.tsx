'use client';

import { useState, useRef, useLayoutEffect, type CSSProperties } from 'react';

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
const MIN_BULLET_PX = 36;   // nur Bullet-Kollision verhindern (Labels weichen vertikal aus)
const LABEL_GAP_PX  = 150;  // darunter würden zwei Labels auf gleicher Ebene überlappen → alternieren
const TAIL_DAYS     = 42;   // Schlussfenster (letzte 6 Wochen) wird gezoomt dargestellt
const TAIL_FRAC     = 0.58; // …und bekommt diesen Anteil der Trackbreite

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

// Buchungsschluss = letzter buchbarer Tag = Abstimmung minus DOOH-Vorlauf (10 Tage).
// Source of Truth: Regelkatalog §7.0/§8.6 (MIN_VORLAUF_DOOH = DOOH_CUTOFF_DAYS).
// Fix und paketunabhängig – ersetzt die frühere 4-Stufen-Heuristik.
function getKampParatDate(votingDateISO: string): string {
  return addDaysISO(votingDateISO, -DOOH_CUTOFF_DAYS);
}

// Headline-Status: grosse Zahl + Einheit + erklärender Satz (statt enger Pill).
function getStatusCopy(days: number): { num: number; unit: string; sub: string; tight: boolean; blocked: boolean } {
  if (days < DOOH_CUTOFF_DAYS) return { num: days, unit: 'Tage bis zur Abstimmung', sub: `Der Vorlauf ist zu kurz für eine buchbare Kampagne — öffentliche digitale Plakate (DOOH) brauchen mindestens ${DOOH_CUTOFF_DAYS} Tage.`, tight: true, blocked: true };
  if (days > 56) return { num: days, unit: 'Tage bis zur Abstimmung', sub: 'Du hast vollen Spielraum — alle Laufzeiten sind möglich.', tight: false, blocked: false };
  if (days > 28) return { num: days, unit: 'Tage bis zur Abstimmung', sub: 'Guter Zeitpunkt zum Starten. Genug Vorlauf für eine saubere Vorbereitung.', tight: false, blocked: false };
  return { num: days, unit: 'Tage bis zur Abstimmung', sub: 'Die Stimmunterlagen sind unterwegs — jetzt entscheidet sich vieles.', tight: false, blocked: false };
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

  const state = daysToEvent > 56 ? 1 : daysToEvent > 28 ? 2 : daysToEvent > DOOH_CUTOFF_DAYS ? 3 : 4;

  const today      = todayISO();
  const versand    = addDaysISO(votingDateISO, -STIMMUNTERLAGEN_OFFSET);
  const versandPast = versand < today;
  // Achse beginnt beim frühesten *angezeigten* Knoten. "Stimmzettel versandt"
  // wird nur in State 1–3 gezeigt; in State 4 (nicht buchbar) startet die Achse
  // bei Heute, damit Heute links und Abstimmung rechts steht (kein Rechts-Kleben).
  const axisStart  = (versandPast && state !== 4) ? versand : today;
  const totalDays  = Math.max(1, daysBetween(axisStart, votingDateISO));

  // Achse:
  // - Kurzer Vorlauf (gesamte Achse ≤ TAIL_DAYS): rein linear über die volle
  //   Breite → Knoten verteilen sich, statt sich rechts zu drängen (Zoom-in
  //   aufs kurze Fenster).
  // - Langer Vorlauf: zweizonig. Das entscheidende Schlussfenster (letzte
  //   TAIL_DAYS) bekommt einen festen, breiten Anteil (TAIL_FRAC); die frühere
  //   Zeit wird in den Rest komprimiert, damit sich Versand / Buchungsschluss /
  //   Abstimmung nicht ans Ende drängen.
  const linearOnly  = totalDays <= TAIL_DAYS;
  const tailStartPx = (1 - TAIL_FRAC) * trackW;
  const toPx = (iso: string) => {
    const dToVote = Math.max(0, daysBetween(iso, votingDateISO));
    if (linearOnly) {
      return (1 - dToVote / totalDays) * trackW;
    }
    if (dToVote <= TAIL_DAYS) {
      return tailStartPx + (1 - dToVote / TAIL_DAYS) * (trackW - tailStartPx);
    }
    const headSpan = Math.max(1, totalDays - TAIL_DAYS);
    return Math.max(0, (1 - (dToVote - TAIL_DAYS) / headSpan) * tailStartPx);
  };

  const kampParatDate = getKampParatDate(votingDateISO);
  const copy  = getStatusCopy(daysToEvent);

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

  // Sort chronologically. Nur Bullet-Kollision verhindern (kleiner Mindestabstand) –
  // Positionen bleiben weitgehend datentreu, kein grosses Auseinanderschieben mehr.
  const sorted = [...stateNodes].sort((a, b) => a.rawPx - b.rawPx);
  const adjPx = sorted.map(n => n.rawPx);
  for (let i = 1; i < adjPx.length - 1; i++) {
    if (adjPx[i] - adjPx[i - 1] < MIN_BULLET_PX) adjPx[i] = adjPx[i - 1] + MIN_BULLET_PX;
  }
  const secLast = adjPx.length - 2;
  if (secLast >= 0 && adjPx[secLast] > trackW - MIN_BULLET_PX) {
    adjPx[secLast] = trackW - MIN_BULLET_PX;
    for (let i = secLast - 1; i >= 0; i--) {
      if (adjPx[i] > adjPx[i + 1] - MIN_BULLET_PX) adjPx[i] = Math.max(0, adjPx[i + 1] - MIN_BULLET_PX);
    }
  }

  // Label-Platzierung: Standard oben. Wenn ein Knoten dem Vorgänger zu nah ist
  // (Labels würden auf gleicher Ebene überlappen), kippt er auf die Gegenseite →
  // alternierendes Oben/Unten-Muster. Punkte bleiben an echter Position.
  const places: ('top' | 'bottom')[] = [];
  for (let i = 0; i < adjPx.length; i++) {
    if (i === 0) { places.push('top'); continue; }
    places.push(adjPx[i] - adjPx[i - 1] < LABEL_GAP_PX
      ? (places[i - 1] === 'top' ? 'bottom' : 'top')
      : 'top');
  }
  const posNodes = sorted.map((n, i) => ({ ...n, adjPx: adjPx[i], place: places[i] }));

  // Phase bar metrics (true proportional, raw)
  const versandPct       = Math.max(0, Math.min(100, toPx(versand) / trackW * 100));
  const daysSinceVersand = state >= 3 ? Math.max(0, daysBetween(versand, today)) : 0;
  const daysVorbPrep     = state <= 2 ? daysBetween(today, versand) : 0;

  // Vertikale Geometrie: Achslinie in der Track-Mitte, Labels ober-/unterhalb.
  const TRACK_H = 116;
  const RAIL_Y  = 58;

  // Node-Wrapper: nur Ankerpunkt auf der x-Position; Bullet/Label absolut.
  const node = (px: number): CSSProperties => ({
    position: 'absolute',
    left: px,
    top: 0,
    bottom: 0,
    width: 0,
    zIndex: 1,
  });
  // Bullet zentriert auf der Achslinie.
  const bulletWrap = (size: number): CSSProperties => ({
    position: 'absolute',
    left: 0,
    top: RAIL_Y,
    transform: 'translate(-50%, -50%)',
    width: size,
    height: size,
  });
  // Label ober- oder unterhalb der Achslinie. align klemmt die äusseren Labels
  // (erstes linksbündig, letztes rechtsbündig), damit sie nicht über den
  // Kartenrand ragen; innere Labels bleiben zentriert.
  const labelWrap = (place: 'top' | 'bottom', align: 'center' | 'left' | 'right' = 'center'): CSSProperties => ({
    position: 'absolute',
    whiteSpace: 'nowrap',
    ...(align === 'center'
      ? { left: 0, transform: 'translateX(-50%)', textAlign: 'center' }
      : align === 'left'
        ? { left: 0, transform: 'none', textAlign: 'left' }
        : { right: 0, transform: 'none', textAlign: 'right' }),
    ...(place === 'top'
      ? { bottom: TRACK_H - RAIL_Y + 16 }
      : { top: RAIL_Y + 16 }),
  });
  const stem = (place: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute',
    left: 0,
    transform: 'translateX(-50%)',
    width: 1.5,
    height: 11,
    background: 'rgba(107,79,187,0.28)',
    ...(place === 'top'
      ? { bottom: TRACK_H - RAIL_Y + 4 }
      : { top: RAIL_Y + 4 }),
  });

  const ttBox = (place: 'top' | 'bottom'): CSSProperties => ({
    position: 'absolute',
    ...(place === 'top'
      ? { bottom: 'calc(100% + 6px)' }
      : { top: 'calc(100% + 6px)' }),
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
  });

  return (
    <div style={{ background: '#F3F0FF', borderRadius: 16, padding: '18px 20px', border: '1.5px solid rgba(107,79,187,0.14)', marginBottom: 24, animation: 'sp1-popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' as const, color: copy.tight ? AMBER : '#7A7596', marginBottom: 10 }}>
        KAMPAGNEN-TIMELINE
      </div>

      {/* Status headline: grosse Zahl + Einheit (+ Badge) + Satz */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' as const, marginBottom: 4 }}>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 38, fontWeight: 800, lineHeight: 1, color: copy.tight ? AMBER : V, letterSpacing: -1 }}>
          {copy.num}
        </span>
        <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 700, color: INK, letterSpacing: -0.2 }}>
          {copy.unit}
        </span>
        {copy.blocked && (
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' as const, color: AMBER, background: AMBER_BG, border: `1px solid rgba(201,106,0,0.30)`, borderRadius: 999, padding: '4px 11px', alignSelf: 'center' }}>
            nicht buchbar
          </span>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: INK2, lineHeight: 1.5, marginBottom: 22, maxWidth: '52ch' }}>
        {copy.sub}
      </div>

      {/* Bullets track */}
      <div ref={trackRef} style={{ position: 'relative' as const, height: TRACK_H, marginBottom: 16 }}>
        <div style={{ position: 'absolute' as const, top: RAIL_Y, left: 0, right: 0, height: 1, background: 'rgba(107,79,187,0.18)' }} />

        {posNodes.map((n, i) => {
          const s = { ...node(n.adjPx), opacity: n.past ? 0.45 : 1 };
          const cap = { fontSize: 11.5, fontWeight: 600, color: MUTED, whiteSpace: 'nowrap' as const, letterSpacing: 0.1 };
          const dateStyle = { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: INK, marginTop: 2 };
          // Äusserste Labels klemmen: erstes linksbündig, letztes rechtsbündig.
          const align: 'center' | 'left' | 'right' = i === 0 ? 'left' : i === posNodes.length - 1 ? 'right' : 'center';

          if (n.id === 'heute') return (
            <div key="heute" style={s}>
              <div style={bulletWrap(16)}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: V, border: `2.5px solid ${V}` }} />
              </div>
              {align === 'center' && <div style={stem(n.place)} />}
              <div style={labelWrap(n.place, align)}>
                <div style={cap}>Heute</div>
                <div style={{ ...dateStyle, color: V }}>{fmt(today)}</div>
              </div>
            </div>
          );
          if (n.id === 'versand') return (
            <div key="versand" style={s}>
              <div style={bulletWrap(14)}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: n.past ? 'transparent' : WHITE, border: '2px solid rgba(107,79,187,0.45)' }} />
              </div>
              {align === 'center' && <div style={stem(n.place)} />}
              <div style={labelWrap(n.place, align)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', position: 'relative' as const }}>
                  <div style={cap}>Stimmzettel versandt</div>
                  <span style={{ color: '#7A7596', cursor: 'help', fontSize: 10, flexShrink: 0 }} onMouseEnter={() => setTtVersand(true)} onMouseLeave={() => setTtVersand(false)}>ⓘ</span>
                  {ttVersand && <div style={ttBox(n.place)}>Ca. 4 Wochen vor dem Abstimmungssonntag kommen die Stimmunterlagen ins Haus. Viele Stimmberechtigte entscheiden genau in dieser Phase — Kampagnen, die hier präsent sind, erzielen die höchste Wirkung.</div>}
                </div>
                <div style={{ ...dateStyle, color: MUTED, fontWeight: 500 }}>{fmt(versand)}</div>
              </div>
            </div>
          );
          if (n.id === 'buchung') return (
            <div key="buchung" style={s}>
              <div style={bulletWrap(14)}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: WHITE, border: `2px solid ${V}` }} />
              </div>
              {align === 'center' && <div style={stem(n.place)} />}
              <div style={labelWrap(n.place, align)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center', position: 'relative' as const }}>
                  <div style={cap}>Buchungsschluss</div>
                  <span style={{ color: '#7A7596', cursor: 'help', fontSize: 10, flexShrink: 0 }} onMouseEnter={() => setTtParat(true)} onMouseLeave={() => setTtParat(false)}>ⓘ</span>
                  {ttParat && <div style={ttBox(n.place)}>Letzter buchbarer Tag: öffentliche digitale Plakate (DOOH) brauchen ca. {DOOH_CUTOFF_DAYS} Tage Vorlauf bis zur Ausspielung. Bis dahin müssen Werbemittel bereit und die Kampagne gebucht sein — wir helfen dir dabei.</div>}
                </div>
                <div style={dateStyle}>{fmt(kampParatDate)}</div>
              </div>
            </div>
          );
          return (
            <div key="abstimmung" style={s}>
              <div style={bulletWrap(18)}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: WHITE, border: `3px solid ${V}` }} />
              </div>
              {align === 'center' && <div style={stem(n.place)} />}
              <div style={labelWrap(n.place, align)}>
                <div style={cap}>Abstimmung</div>
                <div style={{ ...dateStyle, color: V }}>{fmt(votingDateISO)}</div>
              </div>
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
