'use client';

import type { Hinweis, HinweisCode } from '@/lib/preislogik';

// ─── Typen ────────────────────────────────────────────────────────────────

interface CampaignHintProps {
  hinweise: Hinweis[];
  onApply?: (code: HinweisCode) => void;
  onBookConsult?: () => void;
  onDismiss?: (code: HinweisCode) => void;
}

type HintVariant = 'blocking' | 'recommendation' | 'info' | 'nudge' | 'nudge-strong' | 'context';

// ─── Code → Variant Mapping ───────────────────────────────────────────────

function getVariant(code: HinweisCode): HintVariant {
  switch (code) {
    case 'hard_stop_budget':
    case 'below_min_budget':
      return 'blocking';
    case 'too_thin':
    case 'overkill':
    case 'daily_below_floor':
      return 'recommendation';
    case 'capped_by_region':
      return 'info';
    case 'calendly_nudge_soft':
      return 'nudge';
    case 'calendly_nudge_strong':
      return 'nudge-strong';
    case 'screen_class_begrenzt':
    case 'screen_class_display_dom':
    case 'screen_class_multi_mixed':
    case 'no_dooh_inventory':
      return 'context';
    default:
      return 'info';
  }
}

function getTitle(code: HinweisCode): string | null {
  switch (code) {
    case 'hard_stop_budget': return 'Gesprächstermin erforderlich';
    case 'below_min_budget': return 'Mindestbudget erforderlich';
    case 'calendly_nudge_soft': return 'Persönliche Beratung möglich';
    case 'calendly_nudge_strong': return 'Grosse Kampagne geplant?';
    default: return null;
  }
}

// ─── Komponente ───────────────────────────────────────────────────────────

export default function CampaignHint({ hinweise, onApply, onBookConsult }: CampaignHintProps) {
  if (!hinweise || hinweise.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {hinweise.map(h => (
        <HintItem
          key={h.code}
          hinweis={h}
          onApply={onApply}
          onBookConsult={onBookConsult}
        />
      ))}
    </div>
  );
}

// ─── Einzelner Hint ───────────────────────────────────────────────────────

function HintItem({
  hinweis,
  onApply,
  onBookConsult,
}: {
  hinweis: Hinweis;
  onApply?: (code: HinweisCode) => void;
  onBookConsult?: () => void;
}) {
  const variant = getVariant(hinweis.code);
  const title = getTitle(hinweis.code);

  // Base styles
  const wrapperBase: React.CSSProperties = {
    display: 'flex',
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 14,
    fontFamily: "'Jost', sans-serif",
    animation: 'vio-hint-fadein 0.3s ease-out',
  };

  const bodyStyle: React.CSSProperties = { flex: 1, minWidth: 0 };

  const textStyle: React.CSSProperties = {
    fontSize: 15,
    lineHeight: 1.55,
    color: '#2D1F52',
    fontWeight: 500,
  };

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    color: '#1A0F3B',
    marginBottom: 6,
    letterSpacing: '0.01em',
  };

  const actionStyle: React.CSSProperties = {
    marginTop: 12,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: '#6B4FBB',
    color: 'white',
    border: 'none',
    borderRadius: 100,
    padding: '10px 20px',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  };

  const actionSecondaryStyle: React.CSSProperties = {
    ...actionStyle,
    background: 'transparent',
    color: '#6B4FBB',
    border: '1px solid rgba(107, 79, 187, 0.22)',
    marginLeft: 8,
  };

  // ─── Variant: blocking ───
  if (variant === 'blocking') {
    return (
      <>
        <style>{VIO_HINT_KEYFRAMES}</style>
        <div style={{
          ...wrapperBase,
          background: '#F7F5FF',
          borderLeft: '3px solid #6B4FBB',
          borderRadius: '0 8px 8px 0',
          padding: '18px 20px 18px 18px',
        }}>
          <div style={bodyStyle}>
            {title && <div style={titleStyle}>{title}</div>}
            <div style={textStyle}>{hinweis.text}</div>
            {hinweis.code === 'hard_stop_budget' && onBookConsult && (
              <button type="button" onClick={onBookConsult} style={actionStyle}>
                Termin buchen
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Variant: recommendation / info ───
  if (variant === 'recommendation' || variant === 'info') {
    const markerColor = variant === 'recommendation' ? '#6B4FBB' : '#B8A9E8';
    return (
      <>
        <style>{VIO_HINT_KEYFRAMES}</style>
        <div style={{
          ...wrapperBase,
          padding: '16px 0 0 0',
          borderTop: '1px solid rgba(107, 79, 187, 0.10)',
        }}>
          <div style={{
            flexShrink: 0,
            marginTop: 8,
            width: 5,
            height: 5,
            background: markerColor,
            borderRadius: 1,
          }} />
          <div style={bodyStyle}>
            <div style={textStyle}>{hinweis.text}</div>
            {variant === 'recommendation' && onApply && hinweis.code === 'too_thin' && (
              <>
                <button type="button" onClick={() => onApply(hinweis.code)} style={actionStyle}>
                  Anwenden
                </button>
                <button type="button" style={actionSecondaryStyle}>
                  Weiter wie bisher
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Variant: nudge / nudge-strong ───
  if (variant === 'nudge' || variant === 'nudge-strong') {
    const isStrong = variant === 'nudge-strong';
    return (
      <>
        <style>{VIO_HINT_KEYFRAMES}</style>
        <div style={{
          ...wrapperBase,
          background: isStrong ? '#F7F5FF' : 'white',
          border: isStrong ? '1px solid #6B4FBB' : '1px solid rgba(107, 79, 187, 0.22)',
          borderRadius: 10,
          padding: '18px 20px',
        }}>
          <div style={{
            flexShrink: 0,
            marginTop: 9,
            width: 7,
            height: 7,
            background: '#6B4FBB',
            borderRadius: '50%',
          }} />
          <div style={bodyStyle}>
            {title && <div style={titleStyle}>{title}</div>}
            <div style={textStyle}>{hinweis.text}</div>
            {onBookConsult && (
              <>
                <button type="button" onClick={onBookConsult} style={actionStyle}>
                  Termin buchen
                </button>
                {isStrong && (
                  <button type="button" style={actionSecondaryStyle}>
                    Weiter buchen
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  // ─── Variant: context (leiseste Stufe) ───
  return (
    <>
      <style>{VIO_HINT_KEYFRAMES}</style>
      <div style={{
        ...wrapperBase,
        padding: '12px 0',
      }}>
        <div style={{
          flexShrink: 0,
          marginTop: 10,
          width: 14,
          height: 2,
          background: '#B8A9E8',
          borderRadius: 1,
        }} />
        <div style={bodyStyle}>
          <div style={{
            fontSize: 14,
            lineHeight: 1.55,
            color: '#5A556F',
            fontWeight: 500,
          }}>
            {hinweis.text}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Keyframes (global, werden nur einmal injiziert) ──────────────────────

const VIO_HINT_KEYFRAMES = `
@keyframes vio-hint-fadein {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
`;
