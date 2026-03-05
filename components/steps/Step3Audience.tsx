'use client';

import { useState } from 'react';
import {
  BriefingData,
  AnalysisResult,
  AlterOption,
  WohnlageOption,
  LifecycleOption,
  SpracheOption,
  UnternehmensgroesseOption,
} from '@/lib/types';
import { CANTONS } from '@/lib/constants';

const C = {
  primary: '#C1666B',
  pl: '#F9ECEC',
  pd: '#A84E53',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  bg: '#FAF7F2',
  white: '#FFFFFF',
} as const;

const CANTON_CITIES: Partial<Record<string, string[]>> = {
  AG: ['Aarau', 'Baden', 'Wettingen', 'Brugg'],
  BE: ['Bern', 'Biel/Bienne', 'Thun', 'Köniz'],
  BS: ['Basel'],
  BL: ['Allschwil', 'Reinach'],
  FR: ['Fribourg', 'Bulle'],
  GE: ['Genf', 'Lancy', 'Meyrin', 'Vernier'],
  GR: ['Chur', 'Davos'],
  LU: ['Luzern', 'Kriens', 'Emmen'],
  NE: ['Neuenburg', 'La Chaux-de-Fonds'],
  SG: ['St. Gallen', 'Wil', 'Rapperswil-Jona', 'Gossau', 'Rorschach'],
  SH: ['Schaffhausen'],
  SO: ['Solothurn', 'Olten'],
  SZ: ['Schwyz', 'Küssnacht'],
  TG: ['Frauenfeld', 'Kreuzlingen', 'Weinfelden', 'Arbon'],
  TI: ['Lugano', 'Bellinzona', 'Locarno'],
  VD: ['Lausanne', 'Renens', 'Nyon'],
  VS: ['Sion', 'Visp', 'Brig'],
  ZG: ['Zug', 'Baar'],
  ZH: ['Zürich', 'Winterthur', 'Uster', 'Dübendorf', 'Kloten'],
};

const ALTER_LABELS: Record<AlterOption, string> = {
  jung: 'Jung (18–34)',
  mittel: 'Mittel (35–54)',
  alt: 'Reif (55+)',
};
const WOHNLAGE_LABELS: Record<WohnlageOption, string> = {
  staedtisch: 'Städtisch',
  agglo: 'Agglomeration',
  laendlich: 'Ländlich',
};
const LIFECYCLE_LABELS: Record<LifecycleOption, string> = {
  singles: 'Singles',
  junge_paare: 'Junge Paare',
  junge_familien: 'Junge Familien',
  familien_aeltere_kinder: 'Familien (ält. Kinder)',
  eltern_erwachsene_kinder: 'Eltern (erw. Kinder)',
};
const SPRACHE_LABELS: Record<SpracheOption, string> = {
  de: '🇩🇪 Deutsch',
  fr: '🇫🇷 Französisch',
  it: '🇮🇹 Italienisch',
};
const GROESSE_LABELS: Record<UnternehmensgroesseOption, string> = {
  micro: 'Micro (1–9)',
  klein: 'Klein (10–49)',
  mittel: 'Mittel (50–249)',
  gross: 'Gross (250+)',
};

const BRANCHE_SUGGESTIONS: { label: string; noga: string; range: string }[] = [
  { label: 'Detailhandel',            noga: '47', range: 'NOGA 47'    },
  { label: 'Gastronomie & Hotellerie', noga: '55', range: 'NOGA 55–56' },
  { label: 'Bau & Handwerk',          noga: '41', range: 'NOGA 41–43' },
  { label: 'Gesundheit & Soziales',   noga: '86', range: 'NOGA 86–88' },
  { label: 'Bildung',                 noga: '85', range: 'NOGA 85'    },
  { label: 'Finanz & Versicherung',   noga: '64', range: 'NOGA 64–66' },
  { label: 'Immobilien',              noga: '68', range: 'NOGA 68'    },
  { label: 'IT & Kommunikation',      noga: '58', range: 'NOGA 58–63' },
  { label: 'Produktion & Industrie',  noga: '10', range: 'NOGA 10–33' },
  { label: 'Transport & Logistik',    noga: '49', range: 'NOGA 49–53' },
  { label: 'Öffentliche Verwaltung',  noga: '84', range: 'NOGA 84'    },
  { label: 'Andere',                  noga: '',   range: ''            },
];

function toggleArr<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item];
}

const page: React.CSSProperties = {
  maxWidth: '720px',
  margin: '0 auto',
  padding: '40px 20px 80px',
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '14px',
  border: `1px solid ${C.border}`,
  boxShadow: '0 1px 4px rgba(44,44,62,.07)',
  padding: '20px 22px',
  marginBottom: '14px',
};

const clabel: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '.1em',
  color: C.muted,
  textTransform: 'uppercase',
  marginBottom: '10px',
};

function Tbtn({ active, onClick, col, children }: {
  active: boolean; onClick: () => void; col?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '8px 15px',
        borderRadius: col ? '10px' : '100px',
        border: `1.5px solid ${active ? C.primary : C.border}`,
        background: active ? C.primary : C.white,
        fontFamily: 'var(--font-outfit), sans-serif',
        fontSize: '13px',
        fontWeight: active ? 600 : 500,
        color: active ? '#fff' : C.muted,
        cursor: 'pointer',
        transition: 'all .15s',
        whiteSpace: 'nowrap',
        boxShadow: active ? '0 2px 8px rgba(193,102,107,.25)' : 'none',
        ...(col ? { width: '100%', textAlign: 'left' as const } : {}),
      }}
    >
      {children}
    </button>
  );
}

function Cbtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 11px',
        borderRadius: '100px',
        border: `1.5px ${active ? 'solid' : 'dashed'} ${active ? C.primary : C.border}`,
        background: active ? C.pl : 'transparent',
        fontFamily: 'var(--font-outfit), sans-serif',
        fontSize: '12px',
        fontWeight: 500,
        color: active ? C.primary : C.muted,
        cursor: 'pointer',
        transition: 'all .15s',
        margin: '0 4px 4px 0',
      }}
    >
      {children}
    </button>
  );
}

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
}

export default function Step3Audience({ briefing, updateBriefing, nextStep }: Props) {
  const isB2B = briefing.campaignType === 'b2b';
  const analysis = briefing.analysis;

  // ── Shared state ───────────────────────────────────────────────────────
  const [organisation, setOrganisation] = useState(analysis?.organisation || '');
  const [region, setRegion] = useState<string[]>(analysis?.region || []);
  const [selectedCities, setSelectedCities] = useState<string[]>(analysis?.gemeinden || []);
  const [sprache, setSprache] = useState<SpracheOption[]>(
    analysis?.sprache?.length ? analysis.sprache : ['de']
  );

  // ── B2C state ──────────────────────────────────────────────────────────
  const [alter, setAlter] = useState<AlterOption[]>(analysis?.alter || []);
  const [wohnlage, setWohnlage] = useState<WohnlageOption[]>(analysis?.wohnlage || []);
  const [einkommen, setEinkommen] = useState<'tief' | 'mittel' | 'hoch' | null>(analysis?.einkommen ?? null);
  const [lifecycle, setLifecycle] = useState<LifecycleOption[]>(analysis?.lifecycle || []);
  const [wohnsituation, setWohnsituation] = useState<'mieter' | 'eigentuemer' | null>(analysis?.wohnsituation ?? null);
  const [kinder, setKinder] = useState<'keine' | 'ein_kind' | 'mehrere' | null>(analysis?.kinder ?? null);
  const [bildung, setBildung] = useState<'tief' | 'mittel' | 'hoch' | null>(analysis?.bildung ?? null);
  const [auto, setAuto] = useState<'kein_auto' | 'ein_auto' | 'mehrere_autos' | null>(analysis?.auto ?? null);

  // ── B2B state ──────────────────────────────────────────────────────────
  const [branche, setBranche] = useState(analysis?.branche || '');
  const [nogaCode, setNogaCode] = useState(analysis?.nogaCode || '');
  const [unternehmensgroesse, setUnternehmensgroesse] = useState<UnternehmensgroesseOption[]>(
    Array.isArray(analysis?.unternehmensgroesse) ? analysis.unternehmensgroesse : []
  );
  const [showBrancheSuggestions, setShowBrancheSuggestions] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────
  const toggleCanton = (code: string) => {
    if (region.includes(code)) {
      setRegion(region.filter(c => c !== code));
      const cantonCities = CANTON_CITIES[code] || [];
      setSelectedCities(prev => prev.filter(c => !cantonCities.includes(c)));
    } else {
      setRegion([...region, code]);
    }
  };

  const activeCantonsWithCities = region.filter(code => (CANTON_CITIES[code]?.length ?? 0) > 0);

  const handleReset = () => {
    setOrganisation(analysis?.organisation || '');
    setRegion(analysis?.region || []);
    setSelectedCities(analysis?.gemeinden || []);
    setSprache(analysis?.sprache?.length ? analysis.sprache : ['de']);
    setAlter(analysis?.alter || []);
    setWohnlage(analysis?.wohnlage || []);
    setEinkommen(analysis?.einkommen ?? null);
    setLifecycle(analysis?.lifecycle || []);
    setWohnsituation(analysis?.wohnsituation ?? null);
    setKinder(analysis?.kinder ?? null);
    setBildung(analysis?.bildung ?? null);
    setAuto(analysis?.auto ?? null);
    setBranche(analysis?.branche || '');
    setNogaCode(analysis?.nogaCode || '');
    setUnternehmensgroesse(
      Array.isArray(analysis?.unternehmensgroesse) ? analysis.unternehmensgroesse : []
    );
  };

  const handleNext = () => {
    const updated: AnalysisResult = {
      organisation: organisation.trim() || null,
      beschreibung: analysis?.beschreibung ?? null,
      region,
      sprache,
      gemeinden: selectedCities,
      alter,
      einkommen,
      wohnsituation,
      wohnlage,
      lifecycle,
      kinder,
      bildung,
      auto,
      branche: branche.trim() || null,
      nogaCode: nogaCode.trim() || null,
      unternehmensgroesse,
      needsManualInput: false,
      isManualFallback: analysis?.isManualFallback || false,
      pageTitle: analysis?.pageTitle || '',
      ogImage: analysis?.ogImage || '',
      ogLogo: analysis?.ogLogo || '',
      favicon: analysis?.favicon || '',
    };
    updateBriefing({ analysis: updated });
    nextStep();
  };

  // ── Found-box rows ─────────────────────────────────────────────────────
  const foundRows: { label: string; value: string }[] = [];
  if (analysis?.organisation) foundRows.push({ label: 'Organisation', value: analysis.organisation });
  if (analysis?.region?.length) foundRows.push({ label: 'Region', value: analysis.region.join(', ') });
  if (isB2B) {
    if (analysis?.branche) foundRows.push({ label: 'Branche', value: analysis.branche });
    if (analysis?.nogaCode) foundRows.push({ label: 'NOGA', value: analysis.nogaCode });
    if (Array.isArray(analysis?.unternehmensgroesse) && analysis.unternehmensgroesse.length) {
      foundRows.push({
        label: 'Grösse',
        value: analysis.unternehmensgroesse.map(g => GROESSE_LABELS[g]).join(', '),
      });
    }
  } else {
    if (analysis?.alter?.length)
      foundRows.push({ label: 'Alter', value: analysis.alter.map(a => ALTER_LABELS[a]).join(', ') });
    if (analysis?.wohnlage?.length)
      foundRows.push({ label: 'Wohnlage', value: analysis.wohnlage.map(w => WOHNLAGE_LABELS[w]).join(', ') });
    if (analysis?.lifecycle?.length)
      foundRows.push({ label: 'Lebenssituation', value: analysis.lifecycle.map(l => LIFECYCLE_LABELS[l]).join(', ') });
  }
  if (analysis?.sprache?.length)
    foundRows.push({ label: 'Sprache', value: analysis.sprache.map(s => SPRACHE_LABELS[s]).join(', ') });

  const showNotice = !analysis || analysis.needsManualInput || (!isB2B && !analysis.einkommen);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: '10px',
    border: `1.5px solid ${C.border}`,
    fontSize: '14px',
    color: C.taupe,
    outline: 'none',
    backgroundColor: C.bg,
    fontFamily: 'var(--font-outfit), sans-serif',
    transition: 'all .2s',
  };

  return (
    <section style={{ backgroundColor: C.bg }}>
      <div style={page}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '18px', height: '2px', background: C.primary, borderRadius: '2px' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase' }}>
            Schritt 3
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '30px', fontWeight: 400, letterSpacing: '-.02em', lineHeight: 1.25, marginBottom: '6px', color: C.taupe }}>
          {isB2B ? 'Deine Zielunternehmen.' : 'Gut schaut\u2019s aus.'}
        </h1>
        <p style={{ fontSize: '14px', color: C.muted, marginBottom: '28px', lineHeight: 1.6 }}>
          {isB2B
            ? 'Welche Unternehmen willst du erreichen? Alles ist anpassbar.'
            : 'Stimmt das so – oder weisst du es besser? Alles ist anpassbar.'}
        </p>

        {/* Found box */}
        {foundRows.length > 0 && (
          <div style={{ background: C.taupe, borderRadius: '14px', padding: '20px 22px', marginBottom: '14px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', color: C.primary, textTransform: 'uppercase', marginBottom: '14px' }}>
              Das haben wir gefunden
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: '12px' }}>
              {foundRows.map((r, i) => (
                <div key={i}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '3px' }}>{r.label}</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notice */}
        {showNotice && (
          <div style={{ background: '#FFF8EE', border: '1px solid #FDDFA4', borderRadius: '10px', padding: '11px 15px', fontSize: '13px', color: '#7A5500', marginBottom: '14px', display: 'flex', gap: '9px', lineHeight: 1.5 }}>
            <span>💡</span>
            <span>
              {!analysis
                ? 'Wir konnten keine Angaben von deiner Website lesen. Bitte füll die Felder manuell aus.'
                : isB2B
                  ? 'Bitte ergänze Branche und Zielgruppen-Grösse für eine präzise Reichweite.'
                  : 'Einkommen und Wohnsituation konnten wir nicht eindeutig erkennen. Ergänze diese nach Bedarf.'}
            </span>
          </div>
        )}

        {/* ── Region (shared B2C + B2B) ─────────────────────────────────── */}
        <div style={card}>
          <div style={clabel}>Region – Kantone</div>
          <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px' }}>
            Aktiven Kanton anklicken → Städte erscheinen
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {CANTONS.map(canton => (
              <Tbtn key={canton.code} active={region.includes(canton.code)} onClick={() => toggleCanton(canton.code)}>
                {canton.code}
              </Tbtn>
            ))}
          </div>
          {activeCantonsWithCities.map(code => (
            <div key={code} style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: C.muted, marginBottom: '5px' }}>
                ↳ Städte in {code}
              </div>
              <div>
                {(CANTON_CITIES[code] || []).map(city => (
                  <Cbtn key={city} active={selectedCities.includes(city)} onClick={() => setSelectedCities(prev => toggleArr(prev, city))}>
                    {city}
                  </Cbtn>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── B2C-only fields ────────────────────────────────────────────── */}
        {!isB2B && (
          <>
            {/* Alter */}
            <div style={card}>
              <div style={clabel}>Alter</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {(['jung', 'mittel', 'alt'] as AlterOption[]).map(opt => (
                  <Tbtn key={opt} active={alter.includes(opt)} onClick={() => setAlter(toggleArr(alter, opt))}>
                    {ALTER_LABELS[opt]}
                  </Tbtn>
                ))}
              </div>
            </div>

            {/* Wohnlage + Einkommen */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={clabel}>Wohnlage</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {(['staedtisch', 'agglo', 'laendlich'] as WohnlageOption[]).map(opt => (
                    <Tbtn key={opt} col active={wohnlage.includes(opt)} onClick={() => setWohnlage(toggleArr(wohnlage, opt))}>
                      {WOHNLAGE_LABELS[opt]}
                    </Tbtn>
                  ))}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={clabel}>Einkommen</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {(['tief', 'mittel', 'hoch'] as const).map(opt => (
                    <Tbtn key={opt} col active={einkommen === opt} onClick={() => setEinkommen(einkommen === opt ? null : opt)}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Tbtn>
                  ))}
                </div>
              </div>
            </div>

            {/* Lebenssituation */}
            <div style={card}>
              <div style={clabel}>Lebenssituation</div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {(['singles', 'junge_paare', 'junge_familien', 'familien_aeltere_kinder', 'eltern_erwachsene_kinder'] as LifecycleOption[]).map(opt => (
                  <Tbtn key={opt} active={lifecycle.includes(opt)} onClick={() => setLifecycle(toggleArr(lifecycle, opt))}>
                    {LIFECYCLE_LABELS[opt]}
                  </Tbtn>
                ))}
              </div>
            </div>

            {/* Wohnsituation + Kinder */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={clabel}>Wohnsituation</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {([['mieter', 'Mieter'], ['eigentuemer', 'Eigentümer']] as const).map(([val, lbl]) => (
                    <Tbtn key={val} col active={wohnsituation === val} onClick={() => setWohnsituation(wohnsituation === val ? null : val)}>
                      {lbl}
                    </Tbtn>
                  ))}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={clabel}>Kinder</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {([['keine', 'Keine'], ['ein_kind', 'Ein Kind'], ['mehrere', 'Mehrere']] as const).map(([val, lbl]) => (
                    <Tbtn key={val} col active={kinder === val} onClick={() => setKinder(kinder === val ? null : val)}>
                      {lbl}
                    </Tbtn>
                  ))}
                </div>
              </div>
            </div>

            {/* Bildung + Auto */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={clabel}>Bildung</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {(['tief', 'mittel', 'hoch'] as const).map(opt => (
                    <Tbtn key={opt} col active={bildung === opt} onClick={() => setBildung(bildung === opt ? null : opt)}>
                      {opt.charAt(0).toUpperCase() + opt.slice(1)}
                    </Tbtn>
                  ))}
                </div>
              </div>
              <div style={{ ...card, marginBottom: 0 }}>
                <div style={clabel}>Auto</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  {([['kein_auto', 'Kein Auto'], ['ein_auto', 'Ein Auto'], ['mehrere_autos', 'Mehrere']] as const).map(([val, lbl]) => (
                    <Tbtn key={val} col active={auto === val} onClick={() => setAuto(auto === val ? null : val)}>
                      {lbl}
                    </Tbtn>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── B2B-only fields ────────────────────────────────────────────── */}
        {isB2B && (
          <>
            {/* Organisation */}
            <div style={card}>
              <div style={clabel}>Organisation</div>
              <input
                style={inputStyle}
                placeholder="Firmenname"
                value={organisation}
                onChange={e => setOrganisation(e.target.value)}
              />
            </div>

            {/* Branche + NOGA */}
            <div style={card}>
              <div style={clabel}>Branche & NOGA-Code</div>

              {/* Suggestion chips */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', color: C.muted, marginBottom: '7px' }}>
                  Branche wählen:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {BRANCHE_SUGGESTIONS.map(s => {
                    const isActive = branche === s.label;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => {
                          setBranche(s.label);
                          setNogaCode(s.noga);
                          setShowBrancheSuggestions(false);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '100px',
                          border: `1.5px solid ${isActive ? C.primary : C.border}`,
                          background: isActive ? C.primary : C.white,
                          color: isActive ? '#fff' : C.muted,
                          fontFamily: 'var(--font-outfit), sans-serif',
                          fontSize: '12px',
                          fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all .15s',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {s.label}
                        {s.range && (
                          <span style={{ opacity: 0.6, marginLeft: '4px', fontSize: '10px' }}>
                            {s.range}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Free-text inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '11px', color: C.muted, marginBottom: '5px' }}>Freitext Branche</div>
                  <input
                    style={inputStyle}
                    placeholder="z.B. Detailhandel"
                    value={branche}
                    onChange={e => setBranche(e.target.value)}
                  />
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: C.muted, marginBottom: '5px' }}>NOGA-Code</div>
                  <input
                    style={{ ...inputStyle, width: '80px' }}
                    placeholder="z.B. 47"
                    maxLength={3}
                    value={nogaCode}
                    onChange={e => setNogaCode(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            </div>

            {/* Unternehmensgrösse */}
            <div style={card}>
              <div style={clabel}>Unternehmensgrösse</div>
              <div style={{ fontSize: '12px', color: C.muted, marginBottom: '10px' }}>
                Mehrfachauswahl möglich
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['micro', 'klein', 'mittel', 'gross'] as UnternehmensgroesseOption[]).map(opt => {
                  const active = unternehmensgroesse.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setUnternehmensgroesse(toggleArr(unternehmensgroesse, opt))}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '10px',
                        border: `1.5px solid ${active ? C.primary : C.border}`,
                        background: active ? C.pl : C.white,
                        cursor: 'pointer',
                        transition: 'all .15s',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '13px', color: active ? C.pd : C.taupe }}>
                        {GROESSE_LABELS[opt]}
                      </div>
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px' }}>
                        {opt === 'micro' && 'Ø 4 erreichbare MA'}
                        {opt === 'klein' && 'Ø 18 erreichbare MA'}
                        {opt === 'mittel' && 'Ø 80 erreichbare MA'}
                        {opt === 'gross' && 'Ø 300 erreichbare MA'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── Sprache (shared) ──────────────────────────────────────────── */}
        <div style={card}>
          <div style={clabel}>Sprache</div>
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {(['de', 'fr', 'it'] as SpracheOption[]).map(opt => (
              <Tbtn key={opt} active={sprache.includes(opt)} onClick={() => setSprache(toggleArr(sprache, opt))}>
                {SPRACHE_LABELS[opt]}
              </Tbtn>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={handleNext}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: C.primary, color: '#fff', border: 'none',
            borderRadius: '100px', padding: '15px 32px',
            fontFamily: 'var(--font-outfit), sans-serif', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 16px rgba(193,102,107,.3)',
            transition: 'all .18s', marginTop: '8px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.pd; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = C.primary; e.currentTarget.style.transform = 'none'; }}
        >
          {isB2B ? 'Zielgruppe bestätigen →' : 'Ja, das stimmt – weiter →'}
        </button>

        <br />
        <button
          type="button"
          onClick={handleReset}
          style={{ background: 'none', border: 'none', fontFamily: 'var(--font-outfit), sans-serif', fontSize: '13px', color: C.muted, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', padding: '8px 0', display: 'inline-block', marginTop: '6px' }}
        >
          Angaben zurücksetzen
        </button>
      </div>
    </section>
  );
}
