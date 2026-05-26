'use client';

import { useState } from 'react';

interface Props {
  onSave: (email: string) => Promise<void>;
  onClose: () => void;
}

const C = {
  primary: '#6B4FBB',
  ink:     '#2D1F52',
  muted:   '#7A7596',
  border:  'rgba(107,79,187,0.18)',
};

const FONT = 'Jost, var(--font-sans), sans-serif';

export default function SaveOverlay({ onSave, onClose }: Props) {
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await onSave(email);
      setDone(true);
    } catch {
      setError('Etwas ist schiefgelaufen. Bitte nochmals versuchen.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(45,31,82,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: '16px', padding: '36px 32px', maxWidth: '400px', width: '90%', boxShadow: '0 20px 60px rgba(45,31,82,0.18)', fontFamily: FONT, position: 'relative' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', fontSize: '18px', color: C.muted, cursor: 'pointer', lineHeight: 1, padding: '4px 6px', fontFamily: FONT }}
        >
          ✕
        </button>

        {done ? (
          <>
            <div style={{ fontSize: '28px', marginBottom: '10px', color: C.primary }}>✓</div>
            <p style={{ fontWeight: 700, fontSize: '18px', color: C.ink, margin: '0 0 8px', fontFamily: FONT }}>Link verschickt!</p>
            <p style={{ fontSize: '14px', color: C.muted, margin: 0, lineHeight: 1.5 }}>
              Wir haben dir einen Link an <strong style={{ color: C.ink }}>{email}</strong> geschickt, mit dem du hier weitermachen kannst.
            </p>
            <button
              onClick={onClose}
              style={{ marginTop: '24px', width: '100%', padding: '12px', background: C.primary, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT }}
            >
              Weiter
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontWeight: 700, fontSize: '18px', color: C.ink, margin: '0 0 8px', fontFamily: FONT }}>Stand speichern</p>
            <p style={{ fontSize: '14px', color: C.muted, margin: '0 0 24px', lineHeight: 1.5 }}>
              Gib deine E-Mail-Adresse ein — wir schicken dir einen Link, mit dem du hier weitermachen kannst.
            </p>

            <input
              type="email"
              required
              placeholder="deine@email.ch"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', border: `1.5px solid ${C.border}`, borderRadius: '8px', fontSize: '15px', fontFamily: FONT, color: C.ink, outline: 'none', boxSizing: 'border-box', marginBottom: error ? '8px' : '12px' }}
            />

            {error && (
              <p style={{ fontSize: '13px', color: '#c0392b', margin: '0 0 12px', fontFamily: FONT }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              style={{ width: '100%', padding: '12px', background: loading || !email ? 'rgba(107,79,187,0.45)' : C.primary, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading || !email ? 'default' : 'pointer', fontFamily: FONT, transition: 'background .2s' }}
            >
              {loading ? 'Wird gesendet…' : 'Link zuschicken'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
