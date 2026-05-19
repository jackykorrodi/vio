import type { CSSProperties, ReactNode } from 'react';
import type { Checkpoint, Screenshot } from '@/lib/dashboard/types';

// ── Design tokens ───────────────────────────────────────────────────────────
export const C = {
  violet: '#6B4FBB',
  ink:    '#2D1F52',
  bg:     '#F5F2FF',
  muted:  '#7A7596',
  border: 'rgba(107,79,187,0.10)',
  soft:   '#EEEDFE',
} as const;

const FD = "var(--font-display)"; // Plus Jakarta Sans
const FS = "var(--font-sans)";    // Jost

// ── Card variants ───────────────────────────────────────────────────────────
type CardVariant = 'white' | 'dark' | 'violet' | 'soft';

const cardBase: CSSProperties = {
  borderRadius: 14,
  padding: '18px 20px',
};

const cardStyles: Record<CardVariant, CSSProperties> = {
  white:  { background: '#FFFFFF', border: `1px solid ${C.border}` },
  dark:   { background: C.ink, border: 'none', color: '#FFFFFF' },
  violet: { background: C.violet, border: 'none', color: '#FFFFFF' },
  soft:   { background: C.soft, border: '1px solid rgba(107,79,187,0.18)' },
};

export function Card({
  variant = 'white',
  style,
  children,
}: {
  variant?: CardVariant;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div style={{ ...cardBase, ...cardStyles[variant], ...style }}>
      {children}
    </div>
  );
}

// ── Label ───────────────────────────────────────────────────────────────────
export function Label({ children, light, style }: { children: ReactNode; light?: boolean; style?: CSSProperties }) {
  return (
    <div style={{
      fontFamily: FD,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: light ? 'rgba(255,255,255,0.65)' : C.muted,
      marginBottom: 10,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── KeyValueRow ─────────────────────────────────────────────────────────────
export function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      padding: '8px 0',
      fontSize: 13,
      gap: 12,
      borderTop: `1px solid rgba(107,79,187,0.06)`,
    }}>
      <span style={{ color: C.muted, fontSize: 12 }}>{label}</span>
      <span style={{ fontFamily: FD, fontWeight: 600, color: C.ink, fontSize: 13, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ── ProgressBar ─────────────────────────────────────────────────────────────
export function ProgressBar({ pct, light }: { pct: number; light?: boolean }) {
  return (
    <div style={{
      background: light ? 'rgba(255,255,255,0.18)' : 'rgba(107,79,187,0.12)',
      borderRadius: 100,
      height: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: light ? '#FFFFFF' : C.violet,
        borderRadius: 100,
      }} />
    </div>
  );
}

// ── Pill ────────────────────────────────────────────────────────────────────
type PillVariant = 'live' | 'warn' | 'prep' | 'done';

const pillStyles: Record<PillVariant, CSSProperties> = {
  live: { background: '#EAF3DE', color: '#3B6D11' },
  warn: { background: '#FAEEDA', color: '#BA7517' },
  prep: { background: C.soft, color: C.violet },
  done: { background: 'rgba(45,31,82,0.08)', color: C.ink },
};

export function Pill({ variant, children }: { variant: PillVariant; children: ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      padding: '4px 11px',
      borderRadius: 100,
      fontFamily: FS,
      ...pillStyles[variant],
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
      {children}
    </span>
  );
}

// ── Checklist ───────────────────────────────────────────────────────────────
const checkIconStyles: Record<Checkpoint['status'], CSSProperties> = {
  done:    { background: C.violet, color: '#FFFFFF' },
  pending: { background: '#FAEEDA', color: '#BA7517' },
  todo:    { background: 'rgba(107,79,187,0.10)', color: C.muted },
};

const checkIconLabel: Record<Checkpoint['status'], string> = {
  done: '✓', pending: '●', todo: '·',
};

export function ChecklistItem({ item, isFirst, isLast }: { item: Checkpoint; isFirst?: boolean; isLast?: boolean }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
      padding: `${isFirst ? 0 : 12}px 0 ${isLast ? 0 : 12}px`,
      borderBottom: isLast ? 'none' : '1px solid rgba(107,79,187,0.08)',
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, marginTop: 1,
        ...checkIconStyles[item.status],
      }}>
        {checkIconLabel[item.status]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FD, fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
          {item.subtitle}
        </div>
      </div>
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({
  variant,
  label,
  value,
  valueSuffix,
  sub,
  showProgress,
  progressPct,
}: {
  variant: 'violet' | 'dark';
  label: string;
  value: string;
  valueSuffix?: string;
  sub: string;
  showProgress?: boolean;
  progressPct?: number;
}) {
  return (
    <Card variant={variant} style={{ textAlign: 'center', padding: '24px 20px' }}>
      <Label light style={{ marginBottom: 14 }}>{label}</Label>
      <div style={{ fontFamily: FD, fontWeight: 800, letterSpacing: '-0.035em', color: '#FFFFFF', lineHeight: 1, marginBottom: 6, fontSize: 42 }}>
        {value}
        {valueSuffix && <span style={{ fontSize: 22, opacity: 0.7 }}>{valueSuffix}</span>}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, marginTop: 6 }}>{sub}</div>
      {showProgress && progressPct !== undefined && (
        <div style={{ marginTop: 14 }}>
          <ProgressBar pct={progressPct} light />
        </div>
      )}
    </Card>
  );
}

// ── Callout ──────────────────────────────────────────────────────────────────
export function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{
      background: '#FAEEDA',
      borderLeft: '3px solid #BA7517',
      borderRadius: 8,
      padding: '12px 14px',
      fontSize: 12,
      color: '#854F0B',
      lineHeight: 1.55,
    }}>
      <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 12, marginBottom: 4 }}>{title}</div>
      {children}
    </div>
  );
}

// ── ScreenshotGrid ───────────────────────────────────────────────────────────
const screenBg: Record<Screenshot['variant'], string> = {
  photo:   'linear-gradient(135deg, #D4A843, #8B6F2A)',
  photo2:  'linear-gradient(135deg, #7B8FD4, #2D1F52)',
  sample:  'linear-gradient(135deg, #1E1530, #16112A)',
};

export function ScreenshotGrid({ items }: { items: Screenshot[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {items.map((s, i) => (
        <div key={i} style={{
          aspectRatio: '4/3',
          background: screenBg[s.variant],
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          padding: 8,
          textAlign: 'center',
        }}>
          {s.label}
        </div>
      ))}
    </div>
  );
}

// ── ContactCard ───────────────────────────────────────────────────────────────
export function ContactCard({ initials, name, role }: { initials: string; name: string; role: string }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{
        width: 46, height: 46, borderRadius: '50%', background: C.soft, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FD, fontWeight: 700, color: C.violet, fontSize: 15,
      }}>
        {initials}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: C.ink }}>{name}</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{role}</div>
      </div>
      {/* TODO: wire up booking link */}
      <a href="#" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: FS, background: 'transparent', color: C.violet,
        border: `1px solid ${C.violet}`,
        padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 500,
        textDecoration: 'none',
      }}>
        Gespräch buchen
      </a>
    </div>
  );
}

// ── ChannelMixCard ────────────────────────────────────────────────────────────
export function ChannelMixCard({ doohPct, displayPct }: { doohPct: number; displayPct: number }) {
  return (
    <>
      <div style={{ display: 'flex', height: 10, borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ background: C.violet, width: `${doohPct}%` }} />
        <div style={{ background: '#B8A9E8', width: `${displayPct}%` }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.muted }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: C.violet, display: 'inline-block' }} />
          DOOH Screens
        </span>
        <span style={{ fontFamily: FD, fontWeight: 700, color: C.ink }}>{doohPct}%</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 0' }}>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center', color: C.muted }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: '#B8A9E8', display: 'inline-block' }} />
          Online Display
        </span>
        <span style={{ fontFamily: FD, fontWeight: 700, color: C.ink }}>{displayPct}%</span>
      </div>
    </>
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
export function Btn({ href, ghost, children, style }: { href: string; ghost?: boolean; children: ReactNode; style?: CSSProperties }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontFamily: FS,
        background: ghost ? 'transparent' : C.violet,
        color: ghost ? C.violet : '#FFFFFF',
        border: ghost ? `1px solid ${C.violet}` : 'none',
        padding: '11px 22px',
        borderRadius: 100,
        fontSize: 13,
        fontWeight: 500,
        textDecoration: 'none',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
    </a>
  );
}
