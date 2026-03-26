'use client';

import { useState, useMemo } from 'react';
import { BriefingData } from '@/lib/types';
import b2bData from '@/lib/b2b-data.json';

interface B2BRecord {
  kanton: string;
  noga: string;
  groesse: string;
  firmen: number;
  ma: number;
}

const BRANCHEN = [
  { code: '47', label: 'Detailhandel',            nogaRange: '47'    },
  { code: '55', label: 'Gastronomie & Hotellerie', nogaRange: '55–56' },
  { code: '41', label: 'Bau & Handwerk',           nogaRange: '41–43' },
  { code: '86', label: 'Gesundheit & Soziales',    nogaRange: '86–88' },
  { code: '85', label: 'Bildung',                  nogaRange: '85'    },
  { code: '64', label: 'Finanz & Versicherung',    nogaRange: '64–66' },
  { code: '68', label: 'Immobilien',               nogaRange: '68'    },
  { code: '58', label: 'IT & Kommunikation',       nogaRange: '58–63' },
  { code: '10', label: 'Produktion & Industrie',   nogaRange: '10–33' },
  { code: '49', label: 'Transport & Logistik',     nogaRange: '49–53' },
  { code: '84', label: 'Öffentliche Verwaltung',   nogaRange: '84'    },
  { code: '99', label: 'Andere',                   nogaRange: ''      },
];

const GROESSEN = [
  { value: '1-10',   label: '1–10',   sub: 'Mikro'  },
  { value: '11-50',  label: '11–50',  sub: 'Klein'  },
  { value: '51-250', label: '51–250', sub: 'Mittel' },
  { value: '250+',   label: '250+',   sub: 'Gross'  },
];

const KANTONE_OPTIONS = [
  { value: 'CH', label: 'Ganze Schweiz', badge: 'CH'     },
  { value: 'ZH', label: 'Zürich',        badge: 'Kanton' },
  { value: 'BE', label: 'Bern',          badge: 'Kanton' },
  { value: 'VD', label: 'Waadt',         badge: 'Kanton' },
  { value: 'AG', label: 'Aargau',        badge: 'Kanton' },
  { value: 'SG', label: 'St. Gallen',    badge: 'Kanton' },
  { value: 'GE', label: 'Genf',          badge: 'Kanton' },
  { value: 'LU', label: 'Luzern',        badge: 'Kanton' },
  { value: 'TI', label: 'Tessin',        badge: 'Kanton' },
  { value: 'VS', label: 'Wallis',        badge: 'Kanton' },
  { value: 'FR', label: 'Freiburg',      badge: 'Kanton' },
  { value: 'BS', label: 'Basel-Stadt',   badge: 'Kanton' },
  { value: 'BL', label: 'Basel-Land',    badge: 'Kanton' },
  { value: 'TG', label: 'Thurgau',       badge: 'Kanton' },
  { value: 'GR', label: 'Graubünden',    badge: 'Kanton' },
  { value: 'SO', label: 'Solothurn',     badge: 'Kanton' },
  { value: 'NE', label: 'Neuenburg',     badge: 'Kanton' },
  { value: 'ZG', label: 'Zug',           badge: 'Kanton' },
  { value: 'SH', label: 'Schaffhausen',  badge: 'Kanton' },
  { value: 'JU', label: 'Jura',          badge: 'Kanton' },
  { value: 'AR', label: 'Appenzell AR',  badge: 'Kanton' },
  { value: 'OW', label: 'Obwalden',      badge: 'Kanton' },
  { value: 'NW', label: 'Nidwalden',     badge: 'Kanton' },
  { value: 'UR', label: 'Uri',           badge: 'Kanton' },
  { value: 'GL', label: 'Glarus',        badge: 'Kanton' },
  { value: 'AI', label: 'Appenzell IR',  badge: 'Kanton' },
];

interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  onComplete: () => void;
  isActive: boolean;
}

export default function Step1B2B({ updateBriefing, onComplete }: Props) {
  const [selectedBranchen, setSelectedBranchen] = useState<string[]>([]);
  const [selectedKantone, setSelectedKantone] = useState<string[]>([]);
  const [selectedGroessen, setSelectedGroessen] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const filteredKantone = useMemo(() => {
    const q = query.trim().toLowerCase();
    return KANTONE_OPTIONS
      .filter(k => !q || k.label.toLowerCase().includes(q) || k.value.toLowerCase().includes(q))
      .filter(k => !selectedKantone.includes(k.value));
  }, [query, selectedKantone]);

  const kantonTotalFirmen = useMemo(() => {
    if (!selectedKantone.length) return 0;
    const data = b2bData as B2BRecord[];
    return data
      .filter(r => selectedKantone.includes(r.kanton))
      .reduce((sum, r) => sum + r.firmen, 0);
  }, [selectedKantone]);

  const potenzial = useMemo(() => {
    if (!selectedBranchen.length || !selectedKantone.length || !selectedGroessen.length) return null;
    const data = b2bData as B2BRecord[];
    let totalFirmen = 0;
    let totalMA = 0;
    for (const kanton of selectedKantone) {
      for (const noga of selectedBranchen) {
        for (const groesse of selectedGroessen) {
          const match = data.find(r => r.kanton === kanton && r.noga === noga && r.groesse === groesse);
          if (match) {
            totalFirmen += match.firmen;
            totalMA += match.ma;
          }
        }
      }
    }
    const erreichbarFirmen = Math.round(totalFirmen * 0.5);
    const erreichbarMA = Math.round(totalMA * 0.5);
    const impressions = erreichbarMA * 5;
    const raw = (impressions / 1000) * 40;
    const budget = Math.max(2500, Math.round(raw / 500) * 500);
    return { totalFirmen, totalMA, erreichbarFirmen, erreichbarMA, budget };
  }, [selectedBranchen, selectedKantone, selectedGroessen]);

  const allFilled = selectedBranchen.length > 0 && selectedKantone.length > 0 && selectedGroessen.length > 0;

  const handleWeiter = () => {
    if (!allFilled || !potenzial) return;
    updateBriefing({
      branche: selectedBranchen,
      nogaCodes: selectedBranchen,
      selectedKantone,
      unternehmensgroesse: selectedGroessen,
      totalFirmen: potenzial.totalFirmen,
      totalMA: potenzial.totalMA,
      erreichbarFirmen: potenzial.erreichbarFirmen,
      recommendedBudget: potenzial.budget,
    });
    onComplete();
  };

  const toggleBranche = (code: string) =>
    setSelectedBranchen(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);

  const toggleGroesse = (value: string) =>
    setSelectedGroessen(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const addKanton = (value: string) => {
    setSelectedKantone(prev => [...prev, value]);
    setQuery('');
    setDropdownOpen(false);
  };

  const removeKanton = (value: string) =>
    setSelectedKantone(prev => prev.filter(v => v !== value));

  return (
    <section style={{ backgroundColor: '#FDFCFF', position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>

      {/* Background blobs */}
      {[
        { color: 'rgba(184,169,232,0.18)', size: 500, top: '-100px',  right: '-80px'  },
        { color: 'rgba(200,223,248,0.16)', size: 440, top: '300px',   left: '-100px'  },
        { color: 'rgba(212,168,67,0.08)',  size: 320, bottom: '10%',  right: '10%'    },
      ].map((b, i) => (
        <div key={i} style={{
          position: 'fixed',
          width: `${b.size}px`, height: `${b.size}px`,
          top:    (b as unknown as Record<string, string>).top,
          right:  (b as unknown as Record<string, string>).right,
          bottom: (b as unknown as Record<string, string>).bottom,
          left:   (b as unknown as Record<string, string>).left,
          background: `radial-gradient(circle,${b.color},transparent 65%)`,
          filter: 'blur(88px)', borderRadius: '50%', zIndex: 0, pointerEvents: 'none',
        }} />
      ))}

      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 20px 80px', position: 'relative', zIndex: 1 }}>

        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: 18, height: 2, background: '#6B4FBB', borderRadius: 2 }} />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' as const, color: '#D4A843' }}>
            Schritt 1 · B2B Kampagne
          </span>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,2.4vw,34px)', fontWeight: 800, letterSpacing: '-.025em', color: '#2D1F52', marginBottom: '6px' }}>
          Deine Zielgruppe
        </h1>
        <p style={{ fontSize: '14px', color: '#7A7596', fontWeight: 300, lineHeight: 1.6, marginBottom: '32px' }}>
          Wähle Branche, Region und Unternehmensgrösse für deine B2B-Kampagne.
        </p>

        {/* Main card */}
        <div style={{ background: 'white', borderRadius: '24px', padding: '40px', border: '1px solid rgba(107,79,187,0.09)', boxShadow: '0 4px 24px rgba(107,79,187,0.06)' }}>

          {/* ── BRANCHE ─────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '12px' }}>Branche</div>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
              {BRANCHEN.map(b => {
                const active = selectedBranchen.includes(b.code);
                return (
                  <button
                    key={b.code}
                    type="button"
                    onClick={() => toggleBranche(b.code)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: active ? '#EDE8FF' : 'white', border: active ? '2px solid #6B4FBB' : '1.5px solid rgba(107,79,187,0.14)', borderRadius: '100px', padding: '7px 14px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: active ? 700 : 500, color: active ? '#6B4FBB' : '#7A7596', cursor: 'pointer', transition: 'all .18s' }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F5F2FF'; e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.color = '#6B4FBB'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'rgba(107,79,187,0.14)'; e.currentTarget.style.color = '#7A7596'; } }}
                  >
                    {b.label}
                    {b.nogaRange && (
                      <span style={{ fontSize: '10px', background: 'rgba(107,79,187,0.10)', color: '#6B4FBB', borderRadius: '100px', padding: '1px 7px', fontWeight: 600 }}>
                        {b.nogaRange}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '24px 0' }} />

          {/* ── GEO ─────────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '12px' }}>Region / Kanton</div>

            {selectedKantone.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '8px' }}>
                {selectedKantone.map(val => {
                  const opt = KANTONE_OPTIONS.find(k => k.value === val);
                  return (
                    <span key={val} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#EDE8FF', border: '1px solid rgba(107,79,187,0.25)', borderRadius: '100px', padding: '5px 12px', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: '#6B4FBB' }}>
                      {opt?.label ?? val}
                      <button
                        type="button"
                        onClick={() => removeKanton(val)}
                        style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(107,79,187,0.15)', border: 'none', color: '#6B4FBB', cursor: 'pointer', fontSize: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, flexShrink: 0 }}
                        aria-label={`${opt?.label ?? val} entfernen`}
                      >×</button>
                    </span>
                  );
                })}
              </div>
            )}

            {selectedKantone.length > 0 && (
              <div style={{ fontSize: '12px', color: '#7A7596', marginBottom: '10px' }}>
                Total: <strong style={{ color: '#2D1F52' }}>{kantonTotalFirmen.toLocaleString('de-CH')}</strong> Unternehmen in der Auswahl
              </div>
            )}

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={query}
                placeholder="Kanton suchen..."
                onChange={e => { setQuery(e.target.value); setDropdownOpen(true); }}
                onFocus={e => { setDropdownOpen(true); e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(107,79,187,0.10)'; }}
                onBlur={e => { setTimeout(() => setDropdownOpen(false), 200); e.currentTarget.style.borderColor = 'rgba(107,79,187,0.15)'; e.currentTarget.style.boxShadow = 'none'; }}
                style={{ width: '100%', boxSizing: 'border-box' as const, border: '1.5px solid rgba(107,79,187,0.15)', borderRadius: '12px', padding: '12px 16px', fontSize: '15px', fontFamily: 'var(--font-sans)', color: '#2D1F52', background: '#FDFCFF', outline: 'none', transition: 'border-color .2s, box-shadow .2s' }}
              />
              {dropdownOpen && filteredKantone.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid rgba(107,79,187,0.12)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(44,44,62,.12)', maxHeight: '280px', overflowY: 'auto' as const, zIndex: 100 }}>
                  {filteredKantone.map(k => (
                    <div
                      key={k.value}
                      onMouseDown={() => addKanton(k.value)}
                      style={{ padding: '9px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FDFCFF'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span style={{ flex: 1, fontSize: '14px', color: '#2D1F52' }}>{k.label}</span>
                      <span style={{ fontSize: '11px', color: '#6B4FBB', background: 'rgba(107,79,187,0.10)', borderRadius: '100px', padding: '2px 8px', whiteSpace: 'nowrap' as const }}>{k.badge}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '24px 0' }} />

          {/* ── GROESSE ──────────────────────────────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '12px' }}>Unternehmensgrösse (Mitarbeitende)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {GROESSEN.map(g => {
                const active = selectedGroessen.includes(g.value);
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => toggleGroesse(g.value)}
                    style={{ background: active ? '#F5F2FF' : 'white', border: active ? '2px solid #6B4FBB' : '1.5px solid rgba(107,79,187,0.10)', borderRadius: '16px', padding: '18px 12px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '4px', cursor: 'pointer', transition: 'all .18s' }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.28)'; e.currentTarget.style.background = '#F5F2FF'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.10)'; e.currentTarget.style.background = 'white'; } }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '17px', color: active ? '#6B4FBB' : '#2D1F52' }}>{g.label}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: '11px', color: '#7A7596' }}>{g.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── POTENZIAL ────────────────────────────────────────────────────── */}
          {allFilled && potenzial && (
            <>
              <div style={{ height: '1px', background: 'rgba(107,79,187,0.08)', margin: '24px 0' }} />
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: '#B8A9E8', marginBottom: '12px' }}>Potenzialberechnung</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ background: '#F5F2FF', border: '1px solid rgba(107,79,187,0.12)', borderRadius: '14px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#B8A9E8', marginBottom: '6px' }}>Unternehmen total</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#2D1F52' }}>{potenzial.totalFirmen.toLocaleString('de-CH')}</div>
                  </div>
                  <div style={{ background: '#F5F2FF', border: '1px solid rgba(107,79,187,0.12)', borderRadius: '14px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#B8A9E8', marginBottom: '6px' }}>Erreichbare Mitarbeitende</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#2D1F52' }}>{potenzial.erreichbarMA.toLocaleString('de-CH')}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '10px', color: '#7A7596', marginTop: '2px' }}>via DOOH + Display</div>
                  </div>
                  <div style={{ background: '#F5F2FF', border: '1px solid rgba(107,79,187,0.12)', borderRadius: '14px', padding: '16px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '.1em', color: '#B8A9E8', marginBottom: '6px' }}>Empf. Budget</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', color: '#2D1F52' }}>CHF {potenzial.budget.toLocaleString('de-CH')}</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#7A7596', lineHeight: 1.5 }}>
                  Potenzial basiert auf BFS-Daten. Wird als Voreinstellung übernommen.
                </p>
              </div>
            </>
          )}

          {/* ── CTA ──────────────────────────────────────────────────────────── */}
          <button
            type="button"
            onClick={handleWeiter}
            disabled={!allFilled}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: allFilled ? '#6B4FBB' : 'rgba(107,79,187,0.40)', color: 'white', border: 'none', borderRadius: '100px', padding: '16px 32px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', cursor: allFilled ? 'pointer' : 'not-allowed', boxShadow: allFilled ? '0 6px 20px rgba(107,79,187,0.28)' : 'none', transition: 'all .18s' }}
            onMouseEnter={e => { if (allFilled) { e.currentTarget.style.background = '#8B6FD4'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
            onMouseLeave={e => { if (allFilled) { e.currentTarget.style.background = '#6B4FBB'; e.currentTarget.style.transform = 'none'; } }}
          >
            Weiter zu Budget & Reichweite →
          </button>

        </div>
      </div>
    </section>
  );
}
