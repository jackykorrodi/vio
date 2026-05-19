import type { ReactNode } from 'react';
import type { Phase } from '@/lib/dashboard/types';
import { C } from './atoms';

const FD = "var(--font-display)";
const FS = "var(--font-sans)";

type PillConfig = {
  bg: string;
  color: string;
  text: string;
  meta: string;
};

const PHASE_CONFIG: Record<Phase, PillConfig> = {
  werbemittel: { bg: '#FAEEDA', color: '#BA7517', text: 'Werbemittel ausstehend', meta: 'Startet 1. Juni 2026 · in 19 Tagen' },
  preLive:     { bg: C.soft,   color: C.violet,  text: 'In Vorbereitung',        meta: 'Startet 1. Juni 2026 · in 12 Tagen' },
  live:        { bg: '#EAF3DE', color: '#3B6D11', text: 'Live',                  meta: 'Bis 28. Juni · Tag 12 von 28' },
  post:        { bg: 'rgba(45,31,82,0.08)', color: C.ink, text: 'Abgeschlossen', meta: 'Lief 1. – 28. Juni 2026' },
};

export default function DashboardShell({
  phase,
  campaignName,
  children,
}: {
  phase: Phase;
  campaignName: string;
  children: ReactNode;
}) {
  const pill = PHASE_CONFIG[phase];

  return (
    <div style={{
      background: '#EDE9F7',
      minHeight: '100vh',
      padding: '32px 16px',
      fontFamily: FS,
      color: C.ink,
      WebkitFontSmoothing: 'antialiased',
    }}>
      <style>{`
        @media (max-width: 540px) {
          .dash-body { padding: 18px !important; }
          .dash-hdr  { padding: 14px 18px !important; }
          .dash-grid { grid-template-columns: 1fr !important; }
          .dash-h1   { font-size: 20px !important; }
        }
      `}</style>

      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        background: C.bg,
        borderRadius: 22,
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
        boxShadow: '0 8px 40px rgba(45,31,82,0.06)',
      }}>
        {/* Header */}
        <div
          className="dash-hdr"
          style={{
            background: '#FFFFFF',
            padding: '18px 24px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontFamily: FD, fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: C.violet, lineHeight: 1 }}>
              VIO
            </div>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: C.ink, marginTop: 6 }}>
              {campaignName}
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.4, marginTop: 3 }}>
              {pill.meta}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 600,
              padding: '4px 11px',
              borderRadius: 100,
              fontFamily: FS,
              background: pill.bg,
              color: pill.color,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {pill.text}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="dash-body" style={{ padding: 24 }}>
          {children}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '16px auto 0', textAlign: 'center', fontSize: 11, color: C.muted, lineHeight: 1.6 }}>
        Kampagnen-Dashboard · VIO Swiss
      </div>
    </div>
  );
}
