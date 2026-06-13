'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useFlow } from './FlowContext';
import type { KampagnenArt, Ebene, MilieuTyp, WerbemittelOption } from './FlowContext';
import { empfehleBudget, bewerteEckwerte, MIN_BUDGET } from '@/lib/eckwerte-logik';
import type { Risiko } from '@/lib/eckwerte-logik';
import styles from './Shell.module.css';

// ── Label maps ────────────────────────────────────────────────────────────────

const ART_LABEL: Record<KampagnenArt, string> = {
  volksinitiative: 'Volksinitiative',
  referendum:      'Referendum',
  kandidatur:      'Kandidatur',
  propositur:      'Propositur',
};

const EBENE_LABEL: Record<Ebene, string> = {
  eidgenoessisch: 'Eidgenössisch',
  kantonal:       'Kantonal',
  kommunal:       'Kommunal',
};

const FOKUS_LABELS: string[] = [
  'vor allem die eigene Basis',
  'eher die eigene Basis',
  'ausgewogen',
  'eher Unentschlossene',
  'vor allem Unentschlossene',
];

const MILIEU_LABEL: Record<MilieuTyp, string> = {
  laendlich: 'Ländlich-konservativ',
  urban:     'Urbane Junge',
  mitte:     'Akademische Mitte',
  familien:  'Familien & Pendler',
  aeltere:   'Ältere / Pensionierte',
};

const RISIKO_COLOR: Record<Risiko, string> = {
  niedrig: '#15A37E',
  mittel:  '#C98A2B',
  hoch:    '#BC5640',
};

const RISIKO_NOTE: Record<Risiko, string> = {
  niedrig: 'Budget, Gebiet und Laufzeit passen zusammen. Ihr seid durchgehend präsent.',
  mittel:  'Gebiet und Laufzeit sind eher gross für dieses Budget — die Präsenz wird stellenweise dünn.',
  hoch:    'Über diese Laufzeit und dieses Gebiet verteilt sich das Budget zu dünn — ihr würdet untergehen.',
};

const RISIKO_KURZ: Record<Risiko, string> = {
  niedrig: 'niedrig',
  mittel:  'mittel',
  hoch:    'hoch',
};

const WERBEMITTEL_LABEL: Record<WerbemittelOption, string> = {
  o1: 'Motion · animierter Loop · 6–10 Sek.',
  o2: 'Plakat-Motiv · 16:9 · 9:16 · 1:1',
};

const FOKUS_KURZ: string[] = [
  'konzentriert auf eure Hochburgen',
  'konzentriert auf eure Hochburgen',
  'Schwerpunkt Hochburgen, mit etwas Streuung',
  'breit dort, wo Unentschlossene erreichbar sind',
  'breit dort, wo Unentschlossene erreichbar sind',
];

const LAUFZEIT_KURZ: Record<14 | 28 | 42, string> = {
  14: 'kompakt in den letzten zwei Wochen',
  28: 'ab Versand der Stimmunterlagen',
  42: 'früh und stetig bis zum Termin',
};

const LAUFZEIT_LANG: Record<14 | 28 | 42, string> = {
  14: 'Kompakt in den letzten zwei Wochen — dicht, wenn alle entscheiden.',
  28: 'Schwerpunkt ab Versand der Stimmunterlagen, rund drei Wochen vor dem Termin.',
  42: 'Früh aufbauen und bis zum Termin stetig präsent bleiben.',
};

const fmtChf = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('de-CH', { day: 'numeric', month: 'short' });

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionWrap({
  label,
  children,
  isActive = false,
  justInk = false,
}: {
  label: string;
  children: React.ReactNode;
  isActive?: boolean;
  justInk?: boolean;
}) {
  const labelCls = [
    isActive  ? styles.dSecEditing  : '',
    justInk   ? styles.dSecJustInk  : '',
  ].filter(Boolean).join(' ');

  return (
    <div style={sectionStyle} data-dsec={label}>
      <span style={sectionLabel} className={labelCls || undefined}>{label}</span>
      {children}
    </div>
  );
}

function Ghost() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <i style={{ ...ghostLine, width: '72%' }} />
      <i style={{ ...ghostLine, width: '48%' }} />
    </div>
  );
}

function Filled({ lines }: { lines: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((l, i) => (
        <span key={i} style={{ fontSize: 14, color: '#2D1F52', lineHeight: 1.4, fontWeight: i === 0 ? 600 : 400 }}>
          {l}
        </span>
      ))}
    </div>
  );
}

function ChannelCards() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        { title: 'Öffentlich',   sub: 'Digitale Stelen im öffentlichen Raum' },
        { title: 'Online',       sub: 'Schweizer News- und Service-Portale' },
      ].map(c => (
        <div key={c.title} style={{ display: 'flex', gap: 10, background: '#F6F3FC', borderRadius: 11, padding: '10px 12px', border: '1.5px solid #E6E1F2', alignItems: 'flex-start' }}>
          <div>
            <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#2D1F52', marginBottom: 2 }}>{c.title}</span>
            <span style={{ display: 'block', fontSize: 11.5, color: '#857DA0', lineHeight: 1.4 }}>{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span style={{ fontSize: 12, border: '1px solid #E6E1F2', background: '#fff', borderRadius: 99, padding: '4px 10px', color: '#2D1F52' }}>
      {label}
    </span>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const date = new Intl.DateTimeFormat('de-CH', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

export default function DossierPanel({ dossierRef }: { dossierRef?: React.RefObject<HTMLElement | null> }) {
  const { anker, wen, budget, einschaetzung, eckwerte, werbemittel, mode, steps, currentIdx, visitedIdxs } = useFlow();
  const currentStepId = steps[currentIdx];
  const [whyOpen, setWhyOpen] = useState(false);

  // ── vflip: track prev budget for animation ─────────────────────────────────
  const prevBudgetRef = useRef<number | null>(null);
  const [budgetFlip, setBudgetFlip] = useState(false);

  // ── fillSec: track which sections have been inked ──────────────────────────
  const inkedSecs = useRef(new Set<string>());
  const [justInkedSec, setJustInkedSec] = useState<string | null>(null);

  // ── vflip effect ──────────────────────────────────────────────────────────

  const effectiveBudgetForFlip = mode === 'impact' ? eckwerte.budgetChf : (einschaetzung.budgetJustiert ?? null);
  useEffect(() => {
    if (effectiveBudgetForFlip === null) return;
    if (prevBudgetRef.current !== null && prevBudgetRef.current !== effectiveBudgetForFlip) {
      prevBudgetRef.current = effectiveBudgetForFlip;
      setBudgetFlip(true);
      const t = setTimeout(() => setBudgetFlip(false), 400);
      return () => clearTimeout(t);
    }
    prevBudgetRef.current = effectiveBudgetForFlip;
  }, [effectiveBudgetForFlip]);

  // ── fillSec: trigger inkdot on first fill ──────────────────────────────────

  const fillSec = useCallback((name: string) => {
    if (inkedSecs.current.has(name)) return;
    inkedSecs.current.add(name);
    setJustInkedSec(name);
    setTimeout(() => setJustInkedSec(null), 950);
  }, []);

  // ── Anlass ─────────────────────────────────────────────────────────────────

  const anlassLines: string[] | null =
    anker.art && anker.wahlsonntag
      ? [`${ART_LABEL[anker.art]} · ${EBENE_LABEL[anker.ebene ?? 'kommunal']}`, anker.wahlsonntag.label]
      : null;

  const gebietLines: string[] | null = anker.regions.length > 0 ? anker.regions.map(r => r.name) : null;

  // ── Stossrichtung (geführt) ────────────────────────────────────────────────

  const wenIdx = steps.indexOf('wen');
  const wenVisited = wenIdx >= 0 && visitedIdxs.has(wenIdx);

  const zgChips: string[] = wen.zgMode === 'partei'
    ? wen.partei.map(p => p === 'Mitte' ? 'Die Mitte' : p)
    : wen.milieu.map(m => MILIEU_LABEL[m]);

  // ── Budget (geführt) ───────────────────────────────────────────────────────

  const budgetIdx = steps.indexOf('budget');
  const budgetVisited = budgetIdx >= 0 && visitedIdxs.has(budgetIdx);

  // ── Einschätzung (geführt) ─────────────────────────────────────────────────

  const einschIdx = steps.indexOf('einschaetzung');
  const einschVisited = einschIdx >= 0 && visitedIdxs.has(einschIdx);

  const { laufzeit, budgetJustiert } = einschaetzung;
  const termin = anker.wahlsonntag ? new Date(anker.wahlsonntag.date) : null;
  const start  = termin ? new Date(termin.getTime() - laufzeit * 86_400_000) : null;
  const ende   = termin;

  const baseBudget: number | null = (() => {
    if (budget.modus === 'haben' && budget.betragChf !== null) return budget.betragChf;
    if (!start || !ende || anker.regions.length === 0) return null;
    return empfehleBudget({ start, ende, regions: anker.regions });
  })();

  const effectiveBudget: number | null = budgetJustiert ?? baseBudget;

  const einschResult = (start && ende && anker.regions.length > 0 && effectiveBudget !== null)
    ? bewerteEckwerte({ budgetChf: effectiveBudget, start, ende, regions: anker.regions })
    : null;

  const gebietStr = anker.regions.length > 0 ? anker.regions.map(r => r.name).join(', ') : 'eurem Gebiet';

  // ── Eckwerte (impact) ──────────────────────────────────────────────────────

  const isoMinus = (iso: string, days: number) =>
    new Date(new Date(iso).getTime() - days * 86_400_000).toISOString().slice(0, 10);

  const eckwerteIdx = steps.indexOf('eckwerte');
  const eckwerteVisited = eckwerteIdx >= 0 && visitedIdxs.has(eckwerteIdx);

  const impTermin = anker.wahlsonntag?.date ?? null;
  const impEnde = (!eckwerte.impDatesTouched && impTermin) ? impTermin : eckwerte.ende;
  const impStart = (!eckwerte.impDatesTouched && impTermin) ? isoMinus(impTermin, 28) : eckwerte.start;
  const impLaufTage = impStart && impEnde
    ? Math.max(1, Math.round((new Date(impEnde).getTime() - new Date(impStart).getTime()) / 86_400_000))
    : null;
  const impResult = impStart && impEnde && anker.regions.length > 0
    ? bewerteEckwerte({
        budgetChf: eckwerte.budgetChf,
        start: new Date(impStart),
        ende: new Date(impEnde),
        regions: anker.regions,
      })
    : null;

  // ── Werbemittel / Vorschau ─────────────────────────────────────────────────

  const werbemittelIdx = steps.indexOf('werbemittel');
  const werbemittelVisited = werbemittelIdx >= 0 && visitedIdxs.has(werbemittelIdx);

  const wowIdx = steps.indexOf('wow');
  const wowVisited = wowIdx >= 0 && visitedIdxs.has(wowIdx);

  const vorschauReach = mode === 'geführt'
    ? (einschResult?.reachLow ?? null)
    : (impResult?.reachLow ?? null);

  function zielbildText(fokus: number): string {
    if (fokus <= 1) return `Ihr wollt eure Basis in ${gebietStr} mobilisieren und klar präsent sein.`;
    if (fokus === 2) return `Ihr wollt in ${gebietStr} breit sichtbar und ernst genommen werden.`;
    return `Ihr wollt Unentschlossene in ${gebietStr} erreichen und überzeugen.`;
  }

  function wochenzumTermin(): number {
    if (!termin) return 0;
    return Math.max(1, Math.round((termin.getTime() - Date.now()) / 604_800_000));
  }

  const zgTxt = zgChips.length > 0 ? zgChips.join(' & ') : 'eure Zielgruppe';
  const ebeneStr = anker.ebene ? EBENE_LABEL[anker.ebene] : '—';

  // ── active section mapping ────────────────────────────────────────────────
  const ACTIVE_SEC: Partial<Record<string, string>> = {
    anker:         'Anlass',
    weiche:        'Anlass',
    wen:           'Stossrichtung',
    budget:        'Budget',
    einschaetzung: 'Unsere Einschätzung',
    eckwerte:      'Paket',
    werbemittel:   'Werbemittel',
    wow:           'Vorschau',
    abschluss:     'Vorschau',
  };
  const activeSec = ACTIVE_SEC[currentStepId] ?? null;

  // ── fillSec triggers ──────────────────────────────────────────────────────
  const fsAnlass      = !!anlassLines;
  const fsGebiet      = !!gebietLines;
  const fsCheckOk     = anker.checkStatus === 'ok';
  const fsWen         = mode === 'geführt' && wenVisited;
  const fsBudget      = mode === 'geführt' && budgetVisited && !!budget.modus;
  const fsEinsch      = mode === 'geführt' && einschVisited && !!einschResult;
  const fsStoss       = mode !== 'geführt' && (wen.partei.length > 0 || wen.milieu.length > 0);
  const fsPaket       = mode !== 'geführt' && eckwerteVisited && !!impResult;
  const fsWerbemittel = werbemittelVisited && !!werbemittel.option;
  const fsVorschau    = wowVisited;
  useEffect(() => {
    if (fsAnlass)       fillSec('Anlass');
    if (fsGebiet)       fillSec('Gebiet');
    if (fsCheckOk)      fillSec('Wo ihr erscheint');
    if (fsWen)          fillSec('Stossrichtung');
    if (fsBudget)       fillSec('Budget');
    if (fsEinsch)       fillSec('Unsere Einschätzung');
    if (fsStoss)        fillSec('Stossrichtung');
    if (fsPaket)        fillSec('Paket');
    if (fsWerbemittel)  fillSec('Werbemittel');
    if (fsVorschau)     fillSec('Vorschau');
  }, [fsAnlass, fsGebiet, fsCheckOk, fsWen, fsBudget, fsEinsch, fsStoss, fsPaket, fsWerbemittel, fsVorschau, fillSec]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <aside className={styles.dossier} ref={dossierRef as React.RefObject<HTMLElement>}>
      <div style={paper}>
        <div style={stripe} />

        {currentStepId === 'abschluss' && (
          <div style={{
            position: 'absolute', bottom: 28, right: 26,
            width: 58, height: 58, borderRadius: '50%',
            border: '2.5px solid #15A37E', background: '#F0FBF7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17l-5-5" stroke="#15A37E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-display, "Plus Jakarta Sans", sans-serif)', fontWeight: 800, fontSize: 17, color: '#2D1F52' }}>
            vio<span style={{ color: '#6B4FBB' }}>.</span>
          </span>
          <span style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase',
            border: `1.5px solid ${currentStepId === 'abschluss' ? '#15A37E' : '#E6E1F2'}`,
            color: currentStepId === 'abschluss' ? '#15A37E' : '#857DA0',
            borderRadius: 99, padding: '4px 11px', transition: 'all .2s',
          }}>
            {currentStepId === 'abschluss' ? 'Bereit' : 'Entwurf'}
          </span>
        </div>

        <h2 style={{ fontFamily: 'var(--font-display, "Plus Jakarta Sans", sans-serif)', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 3 }}>
          Präsenz-Dossier
        </h2>
        <p style={{ fontSize: 12, color: '#857DA0', marginBottom: 24 }}>{date}</p>

        {/* Anlass */}
        <SectionWrap label="Anlass" isActive={activeSec === 'Anlass'} justInk={justInkedSec === 'Anlass'}>
          {anlassLines ? <Filled lines={anlassLines} /> : <Ghost />}
        </SectionWrap>

        {/* Gebiet */}
        <SectionWrap label="Gebiet" isActive={activeSec === 'Gebiet'} justInk={justInkedSec === 'Gebiet'}>
          {gebietLines ? <Filled lines={gebietLines} /> : <Ghost />}
        </SectionWrap>

        {/* Wo ihr erscheint */}
        <SectionWrap label="Wo ihr erscheint" isActive={activeSec === 'Wo ihr erscheint'} justInk={justInkedSec === 'Wo ihr erscheint'}>
          {anker.checkStatus === 'ok' ? <ChannelCards /> : <Ghost />}
        </SectionWrap>

        {/* Mode-spezifische Sektionen */}
        {mode === 'geführt' ? (
          <>
            {/* Stossrichtung */}
            <SectionWrap label="Stossrichtung" isActive={activeSec === 'Stossrichtung'} justInk={justInkedSec === 'Stossrichtung'}>
              {wenVisited ? (
                <div>
                  <span style={{ fontSize: 14, color: '#2D1F52', fontWeight: 600, display: 'block', marginBottom: zgChips.length > 0 ? 7 : 0 }}>
                    {FOKUS_LABELS[wen.fokus]}
                  </span>
                  {zgChips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {zgChips.map(z => <Chip key={z} label={z} />)}
                    </div>
                  )}
                </div>
              ) : <Ghost />}
            </SectionWrap>

            {/* Budget */}
            <SectionWrap label="Budget" isActive={activeSec === 'Budget'} justInk={justInkedSec === 'Budget'}>
              {budgetVisited && budget.modus ? (
                <div>
                  <span style={{ fontSize: 14.5, fontWeight: 600, color: '#2D1F52', display: 'block' }}>
                    {budget.modus === 'haben' && budget.betragChf
                      ? `${fmtChf(budget.betragChf)} · eigenes Budget`
                      : 'Empfehlung durch VIO'}
                  </span>
                  <span style={{ fontSize: 12.5, color: '#857DA0', display: 'block', marginTop: 4, lineHeight: 1.5 }}>
                    {budget.modus === 'haben'
                      ? 'Wir sagen ehrlich, ob es für euer Gebiet reicht.'
                      : 'Wir schlagen die sinnvolle Grösse für eure Lage vor.'}
                  </span>
                </div>
              ) : <Ghost />}
            </SectionWrap>

            {/* Einschätzung */}
            <SectionWrap label="Unsere Einschätzung" isActive={activeSec === 'Unsere Einschätzung'} justInk={justInkedSec === 'Unsere Einschätzung'}>
              {einschVisited && einschResult && effectiveBudget !== null ? (
                <div>
                  {/* Zielbild */}
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, lineHeight: 1.35, letterSpacing: '-.01em', marginBottom: 10, color: '#2D1F52' }}>
                    {zielbildText(wen.fokus)}
                  </p>
                  {/* Ausgangslage */}
                  <p style={{ fontSize: 12.5, color: '#857DA0', marginBottom: 12, lineHeight: 1.5 }}>
                    {ebeneStr} · {gebietStr}. Noch rund {wochenzumTermin()} Wochen bis zum Termin. Zielgruppe: {zgTxt}.
                  </p>
                  {/* Risiko-Dot */}
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.55, marginBottom: 12 }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, marginTop: 5, background: RISIKO_COLOR[einschResult.risiko], display: 'block' }} />
                    <div>
                      <span style={{ color: '#2D1F52' }}>{RISIKO_NOTE[einschResult.risiko]}</span>
                      {einschResult.risiko !== 'niedrig' && (
                        <span style={{ color: '#857DA0', fontSize: 12.5, display: 'block', marginTop: 3 }}>
                          Was hilft: {einschResult.hebel.join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* D-reco: Warum-Satz + 2×2-Fakten */}
                  <div style={{ borderLeft: '3px solid #6B4FBB', paddingLeft: 14 }}>
                    <p style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: 500, marginBottom: 12, color: '#2D1F52' }}>
                      {FOKUS_KURZ[wen.fokus]} — {LAUFZEIT_KURZ[laufzeit]}.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 14px' }}>
                      <div>
                        <span style={factLbl}>Betrag</span>
                        <span className={budgetFlip ? styles.vflip : undefined} style={{ ...factVal, color: '#6B4FBB', fontSize: 19 }}>{fmtChf(effectiveBudget)}</span>
                      </div>
                      <div>
                        <span style={factLbl}>Reichweite</span>
                        <span style={factVal}>ca. {einschResult.reachLow.toLocaleString('de-CH')}+</span>
                      </div>
                      <div>
                        <span style={factLbl}>Laufzeit</span>
                        <span style={factVal}>{laufzeit} Tage</span>
                      </div>
                      <div>
                        <span style={factLbl}>Start</span>
                        <span style={factVal}>{start ? `ab ${fmtDate(start)}` : '—'}</span>
                      </div>
                    </div>
                    {/* Aufklapper */}
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() => setWhyOpen(!whyOpen)}
                        style={{ fontSize: 12, color: '#857DA0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}
                      >
                        Warum diese Empfehlung?{' '}
                        <span style={{ color: '#6B4FBB' }}>{whyOpen ? '−' : '+'}</span>
                      </button>
                      {whyOpen && (
                        <p style={{ fontSize: 12.5, color: '#857DA0', lineHeight: 1.55, marginTop: 7 }}>
                          {LAUFZEIT_LANG[laufzeit]}{' '}
                          {budget.modus === 'empfehlung' && budgetJustiert === null
                            ? 'Der Betrag ist unsere Empfehlung für eure Lage.'
                            : einschResult.ratio < 1
                              ? 'Der Betrag ist knapp — der Fokus auf die Hochburgen hält ihn tragfähig.'
                              : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : <Ghost />}
            </SectionWrap>
          </>
        ) : (
          <>
            {/* Stossrichtung (impact: nur bei befülltem Aufklapper) */}
            {(wen.partei.length > 0 || wen.milieu.length > 0) && (
              <SectionWrap label="Stossrichtung" isActive={activeSec === 'Stossrichtung'} justInk={justInkedSec === 'Stossrichtung'}>
                <div>
                  <span style={{ fontSize: 14, color: '#2D1F52', fontWeight: 600, display: 'block', marginBottom: zgChips.length > 0 ? 7 : 0 }}>
                    {FOKUS_LABELS[wen.fokus]}
                  </span>
                  {zgChips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {zgChips.map(z => <Chip key={z} label={z} />)}
                    </div>
                  )}
                </div>
              </SectionWrap>
            )}

            {/* Paket */}
            <SectionWrap label="Paket" isActive={activeSec === 'Paket'} justInk={justInkedSec === 'Paket'}>
              {eckwerteVisited && impResult ? (
                <div>
                  <span
                    className={budgetFlip ? styles.vflip : undefined}
                    style={{ fontSize: 14.5, fontWeight: 600, color: '#2D1F52', display: 'block', marginBottom: 8 }}
                  >
                    {fmtChf(eckwerte.budgetChf)}
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 14px' }}>
                    <div>
                      <span style={factLbl}>Reichweite</span>
                      <span style={factVal}>ca. {impResult.reachLow.toLocaleString('de-CH')}+</span>
                    </div>
                    <div>
                      <span style={factLbl}>Laufzeit</span>
                      <span style={factVal}>{impLaufTage} Tage</span>
                    </div>
                    <div>
                      <span style={factLbl}>Start</span>
                      <span style={factVal}>{impStart ? fmtDate(new Date(impStart)) : '—'}</span>
                    </div>
                    <div>
                      <span style={factLbl}>Hinweis</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISIKO_COLOR[impResult.risiko], flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: '#857DA0' }}>{RISIKO_KURZ[impResult.risiko]}</span>
                      </span>
                    </div>
                  </div>
                  {impResult.risiko !== 'niedrig' && (
                    <p style={{ fontSize: 12, color: '#857DA0', marginTop: 8, lineHeight: 1.5 }}>
                      Was hilft: {impResult.hebel.join(' · ')}
                    </p>
                  )}
                </div>
              ) : <Ghost />}
            </SectionWrap>
          </>
        )}

        {/* Werbemittel */}
        <SectionWrap label="Werbemittel" isActive={activeSec === 'Werbemittel'} justInk={justInkedSec === 'Werbemittel'}>
          {werbemittelVisited && werbemittel.option ? (
            <Filled lines={[WERBEMITTEL_LABEL[werbemittel.option]]} />
          ) : <Ghost />}
        </SectionWrap>

        {/* Vorschau */}
        <SectionWrap label="Vorschau" isActive={activeSec === 'Vorschau'} justInk={justInkedSec === 'Vorschau'}>
          {wowVisited ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: vorschauReach !== null ? 8 : 0 }}>
                {['Im öffentlichen Raum', 'Im Privaten'].map(ch => (
                  <div key={ch} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6B4FBB', flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 13.5, color: '#2D1F52', fontWeight: 500 }}>{ch}</span>
                  </div>
                ))}
              </div>
              {vorschauReach !== null && (
                <p style={{ fontSize: 12, color: '#857DA0', lineHeight: 1.4 }}>
                  ca. {vorschauReach.toLocaleString('de-CH')}+ Stimmberechtigte
                </p>
              )}
            </div>
          ) : <Ghost />}
        </SectionWrap>
      </div>
    </aside>
  );
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const paper: React.CSSProperties = {
  background: '#FFFEFB',
  borderRadius: 18,
  boxShadow: '0 30px 70px -30px rgba(45,31,82,.35), 0 6px 18px -8px rgba(45,31,82,.14)',
  border: '1px solid #EDE8F7',
  padding: '30px 30px 36px',
  position: 'relative',
  minHeight: 'calc(100vh - 120px)',
};

const stripe: React.CSSProperties = {
  position: 'absolute', left: 0, top: 18, bottom: 18,
  width: 4, borderRadius: '0 4px 4px 0',
  background: 'linear-gradient(180deg, #6B4FBB, #9C86D9)',
};

const sectionStyle: React.CSSProperties = {
  padding: '15px 0',
  borderTop: '1px solid #E6E1F2',
};

const sectionLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10.5, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase',
  color: '#857DA0', marginBottom: 7,
};

const ghostLine: React.CSSProperties = {
  display: 'block', height: 9, borderRadius: 6, background: '#F1EDF9',
};

const factLbl: React.CSSProperties = {
  display: 'block', fontSize: 10, letterSpacing: '.09em', textTransform: 'uppercase',
  color: '#857DA0', marginBottom: 2,
};

const factVal: React.CSSProperties = {
  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15.5,
  color: '#2D1F52', letterSpacing: '-.01em', display: 'inline-block',
};
