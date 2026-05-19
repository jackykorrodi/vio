'use client';

import { useRouter } from 'next/navigation';

const PHASES = [
  { key: 'werbemittel', label: '1 · Werbemittel' },
  { key: 'preLive',     label: '2 · Pre-Live' },
  { key: 'live',        label: '3 · Live' },
  { key: 'post',        label: '4 · Abgeschlossen' },
] as const;

const violet = '#6B4FBB';
const muted  = '#7A7596';
const border = 'rgba(107,79,187,0.18)';

export default function DemoPhaseSwitcher({
  token,
  activePhase,
}: {
  token: string;
  activePhase: string;
}) {
  const router = useRouter();

  return (
    <div style={{ background: '#EDE9F7', padding: '32px 16px 0' }}>
      <div style={{
        maxWidth: 720,
        margin: '0 auto',
        background: '#FFFFFF',
        borderRadius: '14px 14px 0 0',
        border: '1px solid rgba(107,79,187,0.10)',
        borderBottom: 'none',
      }}>
        <div style={{
          padding: '10px 18px 2px',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase' as const,
          color: muted,
          fontFamily: 'var(--font-sans)',
        }}>
          Demo-Modus
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 18px 12px' }}>
          {PHASES.map(p => {
            const active = p.key === activePhase;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => router.push(`/dashboard/${token}?preview=${p.key}&demo=1`)}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  padding: '7px 13px',
                  borderRadius: 100,
                  background: active ? violet : 'transparent',
                  border: `1px solid ${active ? violet : border}`,
                  color: active ? '#FFFFFF' : muted,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all .15s',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
