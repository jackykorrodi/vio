'use client';

import React from 'react';
import ImpactIndicator from '@/components/shared/ImpactIndicator';
import { calculateImpact } from '@/lib/preislogik';
import { STAEDTE, KANTONE } from '@/lib/regions';

export default function ImpactIndicatorTestPage() {
  const zh = STAEDTE.find(s => s.name === 'Zürich')!;
  const waed = STAEDTE.find(s => s.name === 'Wädenswil')!;
  const adliswil = STAEDTE.find(s => s.name === 'Adliswil')!;
  const kZh = KANTONE.find(k => k.kanton === 'ZH')!;

  const standard = calculateImpact({ budget: 10000, laufzeitDays: 28, regions: [zh] });
  const begrenzt = calculateImpact({ budget: 6000, laufzeitDays: 28, regions: [adliswil] });
  const displayDom = calculateImpact({ budget: 8000, laufzeitDays: 21, regions: [waed] });
  const capped = calculateImpact({ budget: 50000, laufzeitDays: 42, regions: [kZh] });

  const s = {
    page: { background: '#FAFAFA', minHeight: '100vh', padding: '40px 24px' } as React.CSSProperties,
    wrap: { maxWidth: 760, margin: '0 auto' } as React.CSSProperties,
    header: { borderBottom: '1px solid rgba(107,79,187,0.10)', paddingBottom: 24, marginBottom: 48 } as React.CSSProperties,
    h1: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: '#1A0F3B', letterSpacing: '-0.02em', marginBottom: 6 } as React.CSSProperties,
    sub: { fontSize: 14, color: '#5A556F' } as React.CSSProperties,
    section: { marginBottom: 48 } as React.CSSProperties,
    title: { fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#7A7596', marginBottom: 20, paddingBottom: 10, borderBottom: '1px solid rgba(107,79,187,0.10)' },
    compactCard: { background: 'white', border: '1px solid rgba(107,79,187,0.10)', borderRadius: 16, padding: 24 } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={s.header}>
          <h1 style={s.h1}>ImpactIndicator · Test-Playground</h1>
          <p style={s.sub}>Route: /test-internal/impact-indicator</p>
        </div>

        <div style={s.section}>
          <div style={s.title}>Zustand 1 · Standard — Zürich Stadt (Klasse Voll, 70/30)</div>
          <ImpactIndicator impact={standard} regionName="Stadt Zürich" />
        </div>

        <div style={s.section}>
          <div style={s.title}>Zustand 2 · Begrenzt — Adliswil (50/50)</div>
          <ImpactIndicator impact={begrenzt} regionName="Adliswil" />
        </div>

        <div style={s.section}>
          <div style={s.title}>Zustand 3 · Display-dominant — Wädenswil (20/80)</div>
          <ImpactIndicator impact={displayDom} regionName="Wädenswil" />
        </div>

        <div style={s.section}>
          <div style={s.title}>Zustand 4 · Pool-capped — Kanton ZH</div>
          <ImpactIndicator impact={capped} regionName="Kanton Zürich" />
        </div>

        <div style={s.section}>
          <div style={s.title}>Zustand 5 · Kompakt (Inline, für Step 1)</div>
          <div style={s.compactCard}>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7A7596', marginBottom: 8 }}>
              Dein Budget
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 800, color: '#6B4FBB', letterSpacing: '-0.03em', marginBottom: 0 }}>
              CHF 10&apos;000
            </div>
            <ImpactIndicator impact={standard} regionName="Stadt Zürich" compact />
          </div>
        </div>
      </div>
    </div>
  );
}
