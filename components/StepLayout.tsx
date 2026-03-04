'use client';

import { ReactNode } from 'react';

const C = {
  terracotta: '#C1666B',
  taupe: '#5C4F3D',
  muted: '#8A8490',
  border: '#EDE8E0',
  white: '#FFFFFF',
} as const;

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
    <section className="min-h-screen py-16 px-6" style={{ backgroundColor: '#FAF7F2' }}>
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main – 2/3 */}
          <div className="lg:col-span-2">
            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-px" style={{ backgroundColor: C.terracotta }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: C.terracotta,
                }}
              >
                {isCompleted ? `✓ Schritt ${step}` : `Schritt ${step}`}
              </span>
            </div>

            {/* Title */}
            <h2
              className="font-display mb-2"
              style={{
                fontFamily: 'var(--font-fraunces)',
                fontSize: '2rem',
                fontWeight: 400,
                color: C.taupe,
                lineHeight: 1.2,
              }}
            >
              {title}
            </h2>

            {subtitle && (
              <p className="mb-8" style={{ color: C.muted, fontSize: '15px' }}>
                {subtitle}
              </p>
            )}

            {children}
          </div>

          {/* Info Box – 1/3 */}
          <div className="lg:col-span-1">
            <div
              className="rounded-2xl p-6 sticky top-24"
              style={{ backgroundColor: C.taupe }}
            >
              <div className="w-6 h-px mb-4" style={{ backgroundColor: C.terracotta }} />
              <h3
                className="font-semibold text-base mb-3"
                style={{ color: '#FFFFFF', fontFamily: 'var(--font-outfit)' }}
              >
                {infoTitle}
              </h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {infoText}
              </p>
              {infoPoints && (
                <ul className="space-y-2">
                  {infoPoints.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                      <span style={{ color: C.terracotta, flexShrink: 0 }}>→</span>
                      {pt}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
