'use client';

import { useState } from 'react';
import { BriefingData } from '@/lib/types';
import { PackageResult, computeStartDateISO } from '@/lib/vio-paketlogik';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#6B4FBB', pd: '#8B6FD4', pl: '#EDE8FF',
  taupe: '#2D1F52', muted: '#7A7596', border: 'rgba(107,79,187,0.12)',
  gold: '#D4A843', goldBg: '#FDF3DC',
} as const;

const DOOH_FREIGABE_TEXT =
  'Digitale Aussenwerbung für politische Kampagnen muss von jedem Standortbetreiber ' +
  'individuell freigegeben werden. Dieser Prozess dauert in der Regel 5–7 Werktage. ' +
  'Wir empfehlen deshalb frühzeitig zu buchen – damit deine Kampagne pünktlich live ' +
  'geht und du den wichtigsten Zeitraum vor der brieflichen Stimmabgabe optimal nutzt.';

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  briefing: BriefingData;
  updateBriefing: (data: Partial<BriefingData>) => void;
  nextStep: () => void;
  isActive: boolean;
  stepNumber?: number;
}

type PkgKey = 'sichtbar' | 'praesenz' | 'dominanz';

// ─── helpers ─────────────────────────────────────────────────────────────────
function fmtCHF(n: number): string {
  return `CHF ${Math.round(n).toLocaleString('de-CH')}`;
}

function weeksLabel(days: number): string {
  const w = days / 7;
  return `${w} ${w === 1 ? 'Woche' : 'Wochen'}`;
}

// ─── Package card ─────────────────────────────────────────────────────────────
function PaketCard({
  pkg,
  isSelected,
  onSelect,
  votingDate,
}: {
  pkg: PackageResult;
  isSelected: boolean;
  onSelect: () => void;
  votingDate?: string;
}) {
  // Check if latestBookingDate is in the past by computing it from vio data
  const bookingInPast = (() => {
    if (!votingDate || !pkg.latestBookingDate) return false;
    // pkg.latestBookingDate is already computed; compare today to it
    // We reconstruct via computeStartDateISO and subtract 10 days
    const startISO = computeStartDateISO(votingDate, pkg.durationDays);
    const start = new Date(startISO + 'T00:00:00');
    const booking = new Date(start);
    booking.setDate(start.getDate() - 10);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return booking < today;
  })();

  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        background: isSelected ? '#F5F2FF' : 'white',
        border: isSelected ? '2px solid #6B4FBB' : '1.5px solid rgba(107,79,187,0.12)',
        borderRadius: '20px',
        padding: '28px 24px',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all .2s',
        textAlign: 'left',
        width: '100%',
        boxShadow: isSelected ? '0 8px 24px rgba(107,79,187,0.12)' : '0 1px 4px rgba(44,44,62,.05)',
      }}
      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.28)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(107,79,187,0.09)'; } }}
      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = 'rgba(107,79,187,0.12)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(44,44,62,.05)'; } }}
    >
      {/* Badge Empfohlen */}
      {pkg.badge === 'Empfohlen' && (
        <div style={{
          position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
          background: '#6B4FBB', color: 'white',
          fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
          borderRadius: '100px', padding: '3px 14px', whiteSpace: 'nowrap' as const,
        }}>
          Empfohlen
        </div>
      )}

      {/* Check indicator */}
      <div style={{
        position: 'absolute', top: '16px', right: '16px',
        width: '22px', height: '22px', borderRadius: '50%',
        background: isSelected ? '#6B4FBB' : 'rgba(107,79,187,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Package name */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
        letterSpacing: '.12em', textTransform: 'uppercase' as const,
        color: isSelected ? '#8B6FD4' : '#7A7596', marginBottom: '10px',
      }}>
        {pkg.name}
      </div>

      {/* Budget */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,2vw,28px)', fontWeight: 800,
        color: isSelected ? '#6B4FBB' : '#2D1F52', letterSpacing: '-.025em', lineHeight: 1,
        marginBottom: '8px',
      }}>
        {fmtCHF(pkg.finalBudget)}
      </div>

      {/* Duration */}
      <div style={{ fontSize: '13px', color: '#7A7596', marginBottom: '4px' }}>
        {weeksLabel(pkg.durationDays)}
      </div>

      {/* Frequency */}
      <div style={{ fontSize: '12px', color: '#9B87CC', marginBottom: '10px', fontWeight: 500 }}>
        Ø {pkg.frequency} Kontakte pro Person
      </div>

      {/* Reach */}
      <div style={{
        background: isSelected ? 'rgba(107,79,187,0.08)' : 'rgba(107,79,187,0.04)',
        borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
      }}>
        <div style={{ fontSize: '12px', color: '#7A7596', marginBottom: '3px' }}>Reichweite</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', color: '#2D1F52' }}>
          ~{pkg.targetReachPeople.toLocaleString('de-CH')} Personen
        </div>
        <div style={{ fontSize: '11px', color: '#9B87CC' }}>
          {Math.round(pkg.uniqueReachPercent * 100)}% der Stimmberechtigten
        </div>
      </div>

      {/* Dates */}
      {pkg.recommendedStartDate && (
        <div style={{ fontSize: '12px', color: '#7A7596', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#2D1F52' }}>Empf. Kampagnenstart:</span>{' '}
          {pkg.recommendedStartDate}
        </div>
      )}
      {pkg.latestBookingDate && !bookingInPast && (
        <div style={{ fontSize: '12px', color: '#7A7596', marginBottom: '4px' }}>
          <span style={{ fontWeight: 600, color: '#2D1F52' }}>Für optimalen Start buche bis:</span>{' '}
          {pkg.latestBookingDate}
        </div>
      )}
      {bookingInPast && (
        <div style={{ fontSize: '12px', color: '#9B7120', fontStyle: 'italic', marginBottom: '4px' }}>
          Deine Kampagne startet sobald die Freigabe erfolgt ist (ca. 7 Werktage).
        </div>
      )}

      {/* Hinweis */}
      {pkg.hinweis && (
        <div style={{
          marginTop: '10px',
          background: C.goldBg, border: `1px solid rgba(212,168,67,0.3)`,
          borderRadius: '10px', padding: '10px 12px',
          fontSize: '12px', color: '#9B7120', lineHeight: 1.5,
          display: 'flex', gap: '8px', alignItems: 'flex-start',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: '1px' }}>
            <path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="#D4A843" strokeWidth="1.5" strokeLinejoin="round"/>
            <path d="M8 6v3.5" stroke="#D4A843" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11" r=".75" fill="#D4A843"/>
          </svg>
          {pkg.hinweis}
        </div>
      )}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Step2PolitikBudget({ briefing, updateBriefing, nextStep, stepNumber }: Props) {
  const vioData = briefing.vioPackages;

  const defaultPkg: PkgKey = vioData?.recommendedPackage ?? 'praesenz';
  const [selectedPkg, setSelectedPkg] = useState<PkgKey>(defaultPkg);

  if (!vioData) {
    return (
      <section style={{ padding: '80px 20px', textAlign: 'center', color: '#7A7596' }}>
        Keine Paketdaten vorhanden. Bitte gehe zu Schritt 1 zurück.
      </section>
    );
  }

  const pkg = vioData.packages[selectedPkg];

  const handleNext = () => {
    const startISO = briefing.votingDate
      ? computeStartDateISO(briefing.votingDate, pkg.durationDays)
      : '';
    updateBriefing({
      budget:      pkg.finalBudget,
      laufzeit:    Math.round(pkg.durationDays / 7),
      startDate:   startISO,
      reach:       pkg.targetReachPeople,
      reachVonPct: Math.round(pkg.uniqueReachPercent * 100),
      reachBisPct: Math.round(pkg.uniqueReachPercent * 100),
      b2bReach:    null,
    });
    nextStep();
  };

  const PKG_ORDER: PkgKey[] = ['sichtbar', 'praesenz', 'dominanz'];

  return (
    <section>
      <style>{`
        .vpb-wrap{max-width:900px;margin:0 auto;padding:40px 24px 100px;}
        .vpb-eyebrow{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
        .vpb-eline{width:20px;height:2px;background:#6B4FBB;border-radius:2px;flex-shrink:0;}
        .vpb-etxt{font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#D4A843;}
        .vpb-h1{font-family:'Plus Jakarta Sans',sans-serif;font-size:clamp(26px,2.4vw,34px);font-weight:800;letter-spacing:-.025em;line-height:1.15;color:#2D1F52;margin-bottom:10px;}
        .vpb-sub{font-size:14px;color:#7A7596;font-weight:300;line-height:1.6;margin-bottom:32px;}
        .vpb-ctx{background:white;border:1px solid rgba(107,79,187,0.10);border-radius:14px;padding:14px 20px;margin-bottom:28px;display:flex;flex-wrap:wrap;align-items:center;gap:10px;}
        .vpb-badge{background:#6B4FBB;color:white;border-radius:100px;padding:3px 14px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:700;}
        .vpb-rbadge{background:#EDE8FF;color:#6B4FBB;border-radius:100px;padding:3px 12px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;}
        .vpb-dbadge{background:#FDF3DC;color:#9B7120;border:1px solid rgba(212,168,67,0.3);border-radius:8px;padding:3px 10px;font-size:11px;}
        .vpb-pkg-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-bottom:32px;}
        .vpb-dooh-box{background:#EEF5FF;border:1px solid rgba(74,120,176,0.25);border-radius:16px;padding:20px 24px;margin-bottom:32px;display:flex;gap:14px;align-items:flex-start;}
        .vpb-dooh-icon{flex-shrink:0;margin-top:2px;}
        .vpb-dooh-title{font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:700;color:#2D1F52;margin-bottom:6px;}
        .vpb-dooh-text{font-size:13px;color:#4A78B0;line-height:1.6;font-weight:300;}
        .vpb-cta-btn{background:#6B4FBB;color:white;border:none;border-radius:100px;padding:17px 40px;font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:700;cursor:pointer;box-shadow:0 8px 24px rgba(107,79,187,0.28);transition:all .2s;}
        .vpb-cta-btn:hover{background:#8B6FD4;transform:translateY(-2px);}
        @media(max-width:700px){
          .vpb-pkg-grid{grid-template-columns:1fr;}
          .vpb-wrap{padding:24px 16px 80px;}
        }
      `}</style>

      <div className="vpb-wrap">

        {/* Eyebrow */}
        <div className="vpb-eyebrow">
          <div className="vpb-eline" />
          <span className="vpb-etxt">
            {stepNumber != null ? `Schritt ${stepNumber}` : 'Schritt 2'} · Politische Kampagne
          </span>
        </div>

        <h1 className="vpb-h1">Budget & Reichweite</h1>
        <p className="vpb-sub">
          Wähle das Paket, das zu deiner Kampagne passt. Alle Preise sind dynamisch auf deine Zielregion abgestimmt.
        </p>

        {/* Context bar */}
        <div className="vpb-ctx">
          <span className="vpb-badge">Politische Kampagne</span>
          {briefing.selectedRegions?.map(r => (
            <span key={r.name} className="vpb-rbadge">📍 {r.name}</span>
          ))}
          <span style={{ fontSize: '13px', color: '#7A7596' }}>
            {vioData.eligibleVotersTotal.toLocaleString('de-CH')} Stimmberechtigte
          </span>
          {vioData.daysUntilVote != null && (
            <span className="vpb-dbadge">
              🗓️ Abstimmung in <strong>{vioData.daysUntilVote}</strong> Tagen
            </span>
          )}
        </div>

        {/* Package cards */}
        <div className="vpb-pkg-grid">
          {PKG_ORDER.map(key => (
            <PaketCard
              key={key}
              pkg={vioData.packages[key]}
              isSelected={selectedPkg === key}
              onSelect={() => setSelectedPkg(key)}
              votingDate={briefing.votingDate}
            />
          ))}
        </div>

        {/* DOOH Freigabe infobox (immer anzeigen) */}
        <div className="vpb-dooh-box">
          <div className="vpb-dooh-icon">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="9" stroke="#4A78B0" strokeWidth="1.5"/>
              <path d="M11 7v5" stroke="#4A78B0" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="11" cy="15" r=".9" fill="#4A78B0"/>
            </svg>
          </div>
          <div>
            <div className="vpb-dooh-title">Wichtig: DOOH-Freigabe für politische Kampagnen</div>
            <div className="vpb-dooh-text">{DOOH_FREIGABE_TEXT}</div>
          </div>
        </div>

        {/* CTA */}
        <button type="button" className="vpb-cta-btn" onClick={handleNext}>
          Weiter zu den Werbemitteln →
        </button>

      </div>
    </section>
  );
}
