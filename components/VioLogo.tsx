'use client';

import { useEffect, useRef } from 'react';

const COLORS = [
  'rgba(107,79,187,',
  'rgba(139,111,212,',
  'rgba(180,160,232,',
  'rgba(120,90,200,',
  'rgba(156,130,220,',
];

const PAINT_DURATION = 3500;
const HOLD_DURATION  = 2500;
const FADE_DURATION  = 1000;

const CX = 48, CY = 48, R = 20;

interface Stroke {
  x1: number; y1: number;
  x2: number; y2: number;
  color: string;
  alpha: number;
  width: number;
  t: number;
}

function circleIntersections(proj: number, cos: number, sin: number): [[number,number],[number,number]] | null {
  // Find where the scan line at perpendicular distance `proj` crosses the circle
  const perp = Math.cos(Math.atan2(sin, cos) + Math.PI / 2);
  const perp2 = Math.sin(Math.atan2(sin, cos) + Math.PI / 2);
  // parameterise along perpendicular axis from center
  // point = center + proj*(cos,sin) + s*(perp,perp2)
  // |point - center|^2 = R^2
  // (proj*cos + s*perp - CX + CX)^2 ... simplify: proj^2 + s^2 = R^2
  const d2 = R * R - proj * proj;
  if (d2 < 0) return null;
  const d = Math.sqrt(d2);
  return [
    [CX + proj * cos + d * perp,  CY + proj * sin + d * perp2],
    [CX + proj * cos - d * perp,  CY + proj * sin - d * perp2],
  ];
}

function buildStrokes(): Stroke[] {
  const strokes: Stroke[] = [];
  const angle = -35 * Math.PI / 180;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const numLines = 32;

  for (let li = 0; li < numLines; li++) {
    const t = li / (numLines - 1);
    const proj = -R + t * 2 * R;
    const pts = circleIntersections(proj, cos, sin);
    if (!pts) continue;
    const jit = () => (Math.random() - 0.5) * 4;
    strokes.push({
      x1: pts[0][0] + jit(), y1: pts[0][1] + jit(),
      x2: pts[1][0] + jit(), y2: pts[1][1] + jit(),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.12 + Math.random() * 0.18,
      width: 3 + Math.random() * 9,
      t,
    });
  }
  return strokes.sort((a, b) => a.t - b.t);
}

const SIZE_MAP = {
  sm: { font: 22, canvasPx: 48 },
  md: { font: 42, canvasPx: 80 },
  lg: { font: 96, canvasPx: 140 },
};

interface Props { size?: 'sm' | 'md' | 'lg'; }

export default function VioLogo({ size = 'sm' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { font, canvasPx } = SIZE_MAP[size];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let strokes = buildStrokes();
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
        ctx.globalAlpha = 0.07;
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.fillRect(0, 0, 96, 96);
        ctx.restore();
        if (t >= 1) {
          ctx.clearRect(0, 0, 96, 96);
          strokes = buildStrokes();
          idx = 0;
          phase = 'painting';
          phaseStart = now + 300;
        }
      }

      raf = requestAnimationFrame(animate);
    }

    const timer = setTimeout(() => { raf = requestAnimationFrame(animate); }, 600);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: `${font}px`,
        fontWeight: 800,
        color: '#1A1430',
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}>
        VIO
      </span>
      <div style={{
        position: 'relative',
        width: '14px',
        height: '14px',
        alignSelf: 'flex-end',
        marginBottom: '3px',
      }}>
        <canvas
          ref={canvasRef}
          width={96}
          height={96}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: `${canvasPx}px`,
            height: `${canvasPx}px`,
            pointerEvents: 'none',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: `${font}px`,
          fontWeight: 800,
          color: '#6B4FBB',
          position: 'relative',
          zIndex: 1,
          lineHeight: 1,
        }}>.</span>
      </div>
    </div>
  );
}
