'use client';

import { ReactNode } from 'react';

interface StepLayoutProps {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  infoTitle: string;
  infoText: string;
  infoPoints?: string[];
  isCompleted?: boolean;
}

export default function StepLayout({
  step,
  title,
  subtitle,
  children,
  infoTitle,
  infoText,
  infoPoints,
  isCompleted,
}: StepLayoutProps) {
  return (
    <section style={{ minHeight: '100vh', padding: '48px 24px 80px', backgroundColor: 'var(--off-white)' }}>
      <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start' }}>

          {/* ── Main (2/3) ─────────────────────────────────────────────── */}
          <div>
            {/* Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <div style={{ width: '18px', height: '2px', borderRadius: '2px', backgroundColor: '#6B4FBB' }} />
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px', fontWeight: 700, letterSpacing: '.14em',
                textTransform: 'uppercase', color: '#6B4FBB',
              }}>
                {isCompleted ? `✓ Schritt ${step}` : `Schritt ${step}`}
              </span>
            </div>

            {/* Title */}
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem', fontWeight: 800,
              letterSpacing: '-.025em', lineHeight: 1.15,
              color: '#1A1430', marginBottom: subtitle ? '8px' : '32px',
            }}>
              {title}
            </h2>

            {subtitle && (
              <p style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '15px', color: '#7A7596',
                lineHeight: 1.65, marginBottom: '32px',
              }}>
                {subtitle}
              </p>
            )}

            {children}
          </div>

          {/* ── Info Box (1/3) ──────────────────────────────────────────── */}
          <div style={{
            backgroundColor: '#F5F2FF',
            border: '1px solid rgba(107,79,187,0.15)',
            borderRadius: '20px',
            padding: '28px 24px',
            position: 'sticky',
            top: '84px',
          }}>
            <div style={{ width: '18px', height: '2px', borderRadius: '2px', backgroundColor: '#D4A843', marginBottom: '16px' }} />
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '15px', fontWeight: 700,
              color: '#1A1430', marginBottom: '10px',
            }}>
              {infoTitle}
            </h3>
            <p style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '13px', fontWeight: 300,
              lineHeight: 1.7, color: '#7A7596', marginBottom: infoPoints ? '16px' : 0,
            }}>
              {infoText}
            </p>
            {infoPoints && (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {infoPoints.map((pt, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{ color: '#6B4FBB', flexShrink: 0, fontSize: '12px', marginTop: '2px' }}>→</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', fontWeight: 300, color: '#7A7596', lineHeight: 1.6 }}>
                      {pt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
