'use client';

import React from 'react';
import type { ImpactResult } from '@/lib/preislogik';

// ─── Typen ────────────────────────────────────────────────────────────────

interface ImpactIndicatorProps {
  impact: ImpactResult;
  regionName?: string;   // z.B. "Stadt Zürich" oder "3 Regionen"
  compact?: boolean;     // true = schmale Inline-Variante für Step 1
}

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('de-CH');
}

function getBarWidth(reach: number, pool: number): number {
  if (pool <= 0) return 0;
  return Math.min(Math.round((reach / pool) * 100), 100);
}

function getSplitLabel(share: number, channel: 'dooh' | 'display'): string {
  const pct = Math.round(share * 100);
  return channel === 'dooh'
    ? `${pct}% Digitale Plakate (DOOH)`
    : `${pct}% Online Display`;
}

function getScreenBadgeText(klasse: ImpactResult['screenKlasse']): string | null {
  if (klasse === 'begrenzt') return 'Erhöhter Online-Anteil in dieser Gemeinde';
  if (klasse === 'display-dominant') return 'Primär online — DOOH lokal begrenzt';
  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────

const C = {
  violet: '#6B4FBB',
  violetDark: '#3C3489',
  violetPale: '#EEEDFE',
  violetXpale: '#F7F5FF',
  ink: '#2D1F52',
  inkStrong: '#1A0F3B',
  slate: '#5A556F',
  slateLight: '#7A7596',
  lavender: '#B8A9E8',
  white: '#FFFFFF',
  border: 'rgba(107, 79, 187, 0.10)',
  borderStrong: 'rgba(107, 79, 187, 0.20)',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: C.slateLight,
  marginBottom: 5,
};

// ─── Vollständige Variante ─────────────────────────────────────────────────

function FullIndicator({ impact, regionName }: { impact: ImpactResult; regionName?: string }) {
  const barWidth = getBarWidth(impact.reachMitte, impact.stimmTotal);
  const badgeText = getScreenBadgeText(impact.screenKlasse);
  const laufzeitWeeks = Math.round(impact.laufzeitDays / 7);

  return (
    <div style={{
      background: C.white,
      border: `1px solid ${C.border}`,
      borderRadius: 16,
      padding: 28,
    }}>
      {/* Hauptzahl */}
      <div style={{ ...labelStyle, marginBottom: 8 }}>
        Deine Botschaft erreicht
      </div>

      <div style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 48,
        fontWeight: 800,
        color: C.inkStrong,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        marginBottom: 6,
      }}>
        ~{fmt(impact.reachMitte)}
      </div>

      <div style={{
        fontSize: 15,
        fontWeight: 500,
        color: C.slate,
        marginBottom: 20,
      }}>
        {fmt(impact.reachVon)}–{fmt(impact.reachBis)}{' '}
        <span style={{ color: C.violet, fontWeight: 600 }}>Stimmberechtigte</span>
        {regionName ? ` in ${regionName}` : ''}
      </div>

      {/* Reach-Bar */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          height: 6,
          background: C.violetXpale,
          borderRadius: 100,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <div style={{
            height: '100%',
            width: `${barWidth}%`,
            background: `linear-gradient(90deg, ${C.lavender}, ${C.violet})`,
            borderRadius: 100,
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: C.slateLight,
          fontWeight: 500,
        }}>
          <span>0</span>
          <span>
            {impact.reachVonPct}–{impact.reachBisPct}% von {fmt(impact.stimmTotal)}
            {impact.cappedByRegion ? ' — Maximum' : ''}
          </span>
          <span>80%</span>
        </div>
      </div>

      {/* Capped-Hinweis */}
      {impact.cappedByRegion && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          fontSize: 13,
          color: C.slate,
          fontWeight: 500,
        }}>
          <div style={{
            height: 2, width: 14,
            background: C.lavender,
            borderRadius: 1,
            flexShrink: 0,
          }} />
          Maximale Reichweite erreicht. Mehr Budget erhöht die Frequenz, nicht die Reichweite.
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: C.border, margin: '20px 0' }} />

      {/* Stats 3er-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          {
            label: 'Frequenz',
            value: `${impact.frequencyCampaign}×`,
            sub: 'pro Person',
          },
          {
            label: 'Laufzeit',
            value: `${laufzeitWeeks} Wo`,
            sub: `${impact.laufzeitDays} Tage`,
          },
          {
            label: 'Budget',
            value: fmt(impact.budget),
            sub: 'CHF',
          },
        ].map((stat, i) => (
          <div key={stat.label} style={{
            paddingLeft: i === 0 ? 0 : 20,
            paddingRight: i === 2 ? 0 : 20,
            borderRight: i < 2 ? `1px solid ${C.border}` : 'none',
          }}>
            <div style={labelStyle}>{stat.label}</div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 18,
              fontWeight: 800,
              color: C.inkStrong,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 12, color: C.slate, marginTop: 2 }}>
              {stat.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Channel-Split */}
      <div style={{ marginTop: 20 }}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>Kanal-Mix</div>
        <div style={{
          display: 'flex',
          height: 8,
          borderRadius: 100,
          overflow: 'hidden',
          gap: 2,
          marginBottom: 8,
        }}>
          <div style={{
            flex: impact.doohShare,
            background: C.violet,
            borderRadius: '100px 0 0 100px',
            transition: 'flex 0.4s ease',
          }} />
          <div style={{
            flex: impact.displayShare,
            background: C.lavender,
            borderRadius: '0 100px 100px 0',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {[
            { dot: C.violet, text: getSplitLabel(impact.doohShare, 'dooh') },
            { dot: C.lavender, text: getSplitLabel(impact.displayShare, 'display') },
          ].map(item => (
            <div key={item.text} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: C.slate, fontWeight: 500,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: item.dot, flexShrink: 0,
              }} />
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Screen-Klassen-Badge */}
      {badgeText && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: C.violetXpale,
          border: `1px solid ${C.borderStrong}`,
          borderRadius: 100,
          padding: '4px 12px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 11,
          fontWeight: 600,
          color: C.violet,
          marginTop: 16,
        }}>
          <div style={{
            width: 5, height: 5,
            borderRadius: '50%',
            background: C.violet,
          }} />
          {badgeText}
        </div>
      )}
    </div>
  );
}

// ─── Kompakte Variante (Step 1 Inline) ───────────────────────────────────

function CompactIndicator({ impact, regionName }: { impact: ImpactResult; regionName?: string }) {
  const barWidth = getBarWidth(impact.reachMitte, impact.stimmTotal);

  return (
    <div style={{ padding: '20px 0 0 0' }}>
      <div style={{ ...labelStyle, marginBottom: 6 }}>
        Deine Botschaft erreicht
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 6,
      }}>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 28,
          fontWeight: 800,
          color: C.inkStrong,
          letterSpacing: '-0.02em',
        }}>
          ~{fmt(impact.reachVon)}–{fmt(impact.reachBis)}
        </div>
        <div style={{ fontSize: 15, color: C.slate, fontWeight: 500 }}>
          Stimmberechtigte
          {regionName ? ` in ${regionName}` : ''}
        </div>
      </div>

      <div style={{
        height: 4,
        background: C.violetXpale,
        borderRadius: 100,
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          height: '100%',
          width: `${barWidth}%`,
          background: `linear-gradient(90deg, ${C.lavender}, ${C.violet})`,
          borderRadius: 100,
          transition: 'width 0.5s ease',
        }} />
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        <div>
          <div style={labelStyle}>Ø Frequenz</div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16,
            fontWeight: 800,
            color: C.inkStrong,
          }}>
            {impact.frequencyCampaign}× pro Person
          </div>
        </div>
        <div>
          <div style={labelStyle}>Kanal</div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16,
            fontWeight: 800,
            color: C.inkStrong,
          }}>
            {Math.round(impact.doohShare * 100)}% DOOH · {Math.round(impact.displayShare * 100)}% Display
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────

export default function ImpactIndicator({ impact, regionName, compact = false }: ImpactIndicatorProps) {
  if (compact) {
    return <CompactIndicator impact={impact} regionName={regionName} />;
  }
  return <FullIndicator impact={impact} regionName={regionName} />;
}
