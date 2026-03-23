'use client';

import { useEffect, useRef } from 'react';

const COLORS = [
  'rgba(107,79,187,',
  'rgba(139,111,212,',
  'rgba(96,68,180,',
  'rgba(120,90,200,',
  'rgba(155,125,220,',
];

const PAINT_DURATION = 3500;
const HOLD_DURATION  = 3000;
const FADE_DURATION  = 900;

interface Stroke {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  alpha: number;
  width: number;
  t: number;
}

function circleIntersections(
  proj: number, cos: number, sin: number, cx: number, cy: number, r: number
): [[number,number],[number,number]] | null {
  const angle = Math.atan2(sin, cos) + Math.PI / 2;
  const perp  = Math.cos(angle);
  const perp2 = Math.sin(angle);
  const d2 = r * r - proj * proj;
  if (d2 < 0) return null;
  const d = Math.sqrt(d2);
  return [
    [cx + proj * cos + d * perp,  cy + proj * sin + d * perp2],
    [cx + proj * cos - d * perp,  cy + proj * sin - d * perp2],
  ];
}

function buildStrokes(cx: number, cy: number, r: number): Stroke[] {
  const strokes: Stroke[] = [];
  const angle = -38 * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const numLines = 18;

  for (let li = 0; li < numLines; li++) {
    const t = li / (numLines - 1);
    const proj = -r + t * 2 * r;
    const pts = circleIntersections(proj, cos, sin, cx, cy, r);
    if (!pts) continue;
    const jit = () => (Math.random() - 0.5) * 2.4;
    strokes.push({
      x1: pts[0][0] + jit(), y1: pts[0][1] + jit(),
      x2: pts[1][0] + jit(), y2: pts[1][1] + jit(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.2 + Math.random() * 0.28,
      width: 1 + Math.random() * 4,
      t,
    });
  }
  return strokes.sort((a, b) => a.t - b.t);
}

const SIZE_MAP = {
  sm: { fontSize: 24, dotHostSize: 8,  canvasInternal: 48,  radius: 7  },
  md: { fontSize: 40, dotHostSize: 13, canvasInternal: 80,  radius: 11 },
  lg: { fontSize: 96, dotHostSize: 30, canvasInternal: 120, radius: 18 },
};

interface Props { size?: 'sm' | 'md' | 'lg'; }

export default function VioLogo({ size = 'sm' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { fontSize, dotHostSize, canvasInternal, radius } = SIZE_MAP[size];
  const cx = canvasInternal / 2;
  const cy = canvasInternal / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let strokes = buildStrokes(cx, cy, radius);
    let idx = 0;
    let phase: 'painting' | 'holding' | 'fading' = 'painting';
    let phaseStart = -1;
    let raf = 0;

    function animate(now: number) {
      if (!canvas || !ctx) return;
      if (phaseStart < 0) phaseStart = now;

      if (phase === 'painting') {
        const progress = Math.min((now - phaseStart) / PAINT_DURATION, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const target = Math.floor(eased * strokes.length);
        while (idx < target) {
          const s = strokes[idx++];
          ctx.save();
          ctx.strokeStyle = s.color + s.alpha + ')';
          ctx.lineWidth = s.width;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(s.x1, s.y1);
          ctx.lineTo(s.x2, s.y2);
          ctx.stroke();
          ctx.restore();
        }
        if (progress >= 1) { phase = 'holding'; phaseStart = now; }

      } else if (phase === 'holding') {
        if (now - phaseStart >= HOLD_DURATION) { phase = 'fading'; phaseStart = now; }

      } else {
        const t = Math.min((now - phaseStart) / FADE_DURATION, 1);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, canvasInternal, canvasInternal);
        ctx.restore();
        if (t >= 1) {
          ctx.clearRect(0, 0, canvasInternal, canvasInternal);
          strokes = buildStrokes(cx, cy, radius);
          idx = 0;
          phase = 'painting';
          phaseStart = now + 300;
        }
      }

      raf = requestAnimationFrame(animate);
    }

    const timer = setTimeout(() => { raf = requestAnimationFrame(animate); }, 600);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [cx, cy, radius, canvasInternal]);

  const canvasDisplayPx = dotHostSize * 3;

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: `${fontSize}px`,
        fontWeight: 800,
        color: '#2D1F52',
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}>
        VIO
      </span>
      <div style={{
        position: 'relative',
        width: `${dotHostSize}px`,
        height: `${dotHostSize}px`,
        alignSelf: 'flex-end',
        marginLeft: '1px',
        marginBottom: '0.08em',
      }}>
        <canvas
          ref={canvasRef}
          width={canvasInternal}
          height={canvasInternal}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: `${canvasDisplayPx}px`,
            height: `${canvasDisplayPx}px`,
            pointerEvents: 'none',
          }}
        />
      </div>
    </div>
  );
}
