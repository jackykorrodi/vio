'use client';

import { useRef, useCallback } from 'react';

// ─── Design tokens (local, identical to StepPackages) ────────────────────────
const VIO_VIOLET  = '#6B4FBB';
const VIO_INK     = '#2D1F52';
const VIO_SLATE   = '#7A7596';
const DISPLAY_BG  = '#B8A9E8';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
function snap5(v: number): number {
  return Math.round(v * 20) / 20; // nearest 0.05
}

// ─── AllocationBar ───────────────────────────────────────────────────────────
// Interactive DOOH / Display split bar.
// - doohShare:    0.0–1.0, current split
// - maxDoohShare: region-dependent inventory cap (0.0–1.0)
// - Drag via Pointer Events (mouse + touch, no separate touch listener)
// - A11y: role="slider", Arrow ±5%, Home=0%, End=maxDoohShare

interface AllocationBarProps {
  doohShare: number;
  onChange: (newShare: number) => void;
  maxDoohShare: number;
  label?: string;
}

export default function AllocationBar({ doohShare, onChange, maxDoohShare }: AllocationBarProps) {
  const barRef  = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const doohPct    = Math.round(doohShare * 100);
  const displayPct = 100 - doohPct;
  const maxPct     = Math.round(maxDoohShare * 100);

  const overLimit = doohShare > maxDoohShare;
  const safePct   = Math.min(doohPct, maxPct);   // violet segment up to cap
  const excessPct = overLimit ? doohPct - maxPct : 0; // slashed segment above cap

  const slashBg = `repeating-linear-gradient(
    -45deg,
    ${VIO_VIOLET} 0px, ${VIO_VIOLET} 3px,
    rgba(255,255,255,0.35) 3px, rgba(255,255,255,0.35) 7px
  )`;

  const shareFromPointerX = useCallback((clientX: number): number => {
    const bar = barRef.current;
    if (!bar) return doohShare;
    const rect = bar.getBoundingClientRect();
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }, [doohShare]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(snap5(shareFromPointerX(e.clientX)));
  }
  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return;
    onChange(snap5(shareFromPointerX(e.clientX)));
  }
  function handlePointerUp() { dragging.current = false; }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(snap5(doohShare + 0.05), 0, 1)); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); onChange(clamp(snap5(doohShare - 0.05), 0, 1)); }
    if (e.key === 'Home')       { e.preventDefault(); onChange(0); }
    if (e.key === 'End')        { e.preventDefault(); onChange(maxDoohShare); }
  }

  return (
    <div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: VIO_SLATE, fontWeight: 500, marginBottom: 8 }}>
        <span>DOOH {doohPct}%</span>
        <span>Display {displayPct}%</span>
      </div>

      {/* Bar + handle — pointer events on whole bar */}
      <div
        ref={barRef}
        role="slider"
        aria-label="DOOH-Anteil"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={doohPct}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        style={{
          position: 'relative',
          height: 32,
          borderRadius: 8,
          background: DISPLAY_BG,
          cursor: 'ew-resize',
          userSelect: 'none',
          touchAction: 'none',
          outline: 'none',
        }}
      >
        {/* DOOH segment — violet, up to inventory cap */}
        {safePct > 0 && (
          <div style={{
            position: 'absolute', left: 0, top: 0, height: '100%',
            width: `${safePct}%`,
            background: VIO_VIOLET,
            borderRadius: excessPct > 0 ? '8px 0 0 8px' : (doohPct < 100 ? '8px 0 0 8px' : '8px'),
            pointerEvents: 'none',
            transition: 'width 0.08s ease',
          }} />
        )}
        {/* Excess DOOH segment — slashed pattern above inventory cap */}
        {excessPct > 0 && (
          <div style={{
            position: 'absolute',
            left: `${safePct}%`,
            top: 0,
            height: '100%',
            width: `${excessPct}%`,
            background: slashBg,
            borderRadius: displayPct > 0 ? '0' : '0 8px 8px 0',
            pointerEvents: 'none',
            transition: 'width 0.08s ease',
          }} />
        )}

        {/* Drag handle — 8px visible pin, 24px hit-area via transparent overlay */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: `${doohPct}%`,
            transform: 'translate(-50%, -50%)',
            width: 24,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{
            width: 8,
            height: 40,
            borderRadius: 4,
            background: VIO_INK,
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
          }} />
        </div>
      </div>

      {/* Focus ring via global style — scoped by aria-label */}
      <style>{`
        [aria-label="DOOH-Anteil"]:focus-visible {
          outline: 2px solid ${VIO_VIOLET};
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
