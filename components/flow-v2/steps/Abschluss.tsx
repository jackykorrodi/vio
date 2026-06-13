'use client';

import { useFlow } from '../FlowContext';
import { empfehleBudget, MIN_BUDGET } from '@/lib/eckwerte-logik';
import styles from '../Shell.module.css';

const MIN_BERATUNG = 12_000;

function addWorkdays(date: Date, delta: number): Date {
  const d = new Date(date);
  const step = delta >= 0 ? 1 : -1;
  let remaining = Math.abs(delta);
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d;
}

const isoMinus = (iso: string, days: number) =>
  new Date(new Date(iso).getTime() - days * 86_400_000).toISOString().slice(0, 10);

const fmtChf = (n: number) => `CHF ${n.toLocaleString('de-CH')}`;
const fmtDate = (d: Date) => d.toLocaleDateString('de-CH', { day: 'numeric', month: 'long', year: 'numeric' });

export function Abschluss() {
  const { mode, anker, budget, einschaetzung, eckwerte, wen, werbemittel } = useFlow();

  const termin = anker.wahlsonntag?.date ?? null;

  let startDate: Date | null = null;
  let effectiveBudget = MIN_BUDGET;

  if (mode === 'geführt') {
    const t = termin ? new Date(termin) : null;
    const { laufzeit, budgetJustiert } = einschaetzung;
    startDate = t ? new Date(t.getTime() - laufzeit * 86_400_000) : null;
    const ende = t;
    const base = (budget.modus === 'haben' && budget.betragChf !== null)
      ? budget.betragChf
      : (startDate && ende && anker.regions.length > 0)
        ? empfehleBudget({ start: startDate, ende, regions: anker.regions })
        : MIN_BUDGET;
    effectiveBudget = budgetJustiert ?? base;
  } else {
    const startStr = (!eckwerte.impDatesTouched && termin) ? isoMinus(termin, 28) : eckwerte.start;
    startDate = startStr ? new Date(startStr) : null;
    effectiveBudget = eckwerte.budgetChf;
  }

  const sujFrist = startDate ? addWorkdays(startDate, -5) : null;
  const showBeratung = effectiveBudget >= MIN_BERATUNG;

  function handleBuchen() {
    console.log('[VIO Abschluss]', {
      mode,
      anker: {
        art: anker.art,
        ebene: anker.ebene,
        regions: anker.regions.map(r => r.name),
        wahlsonntag: anker.wahlsonntag?.label ?? null,
      },
      wen: { fokus: wen.fokus, partei: wen.partei, milieu: wen.milieu },
      werbemittel: werbemittel.option,
      budget: effectiveBudget,
      start: startDate?.toISOString().slice(0, 10) ?? null,
    });
  }

  const btnBase: React.CSSProperties = {
    borderRadius: 18, padding: '18px 22px',
    fontFamily: 'var(--font-display)', fontWeight: 700,
    cursor: 'pointer', textAlign: 'left',
    transition: 'opacity .15s', border: 'none',
    width: '100%',
  };

  return (
    <div>
      <div className={styles.rv} style={{ '--i': 0 } as React.CSSProperties}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6B4FBB', marginBottom: 12 }}>
          Abschluss
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px,2.6vw,36px)', lineHeight: 1.12, letterSpacing: '-0.02em', color: '#2D1F52', marginBottom: 10 }}>
          Bereit zum Starten.
        </h1>
        <p style={{ color: '#857DA0', fontSize: 16, lineHeight: 1.55, marginBottom: 28, maxWidth: 520 }}>
          Euer Dossier ist vollständig. Jetzt buchen, Offerte anfragen oder kurz besprechen.
        </p>
      </div>

      {/* Zusammenfassung */}
      <div className={styles.rv} style={{ background: '#F6F3FC', borderRadius: 16, padding: '18px 22px', marginBottom: 28, maxWidth: 520, border: '1px solid #EFEBF9', '--i': 1 } as React.CSSProperties}>
        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: '#6B4FBB', letterSpacing: '-.02em', marginBottom: 4 }}>
          {fmtChf(effectiveBudget)}
        </span>
        {sujFrist && (
          <span style={{ fontSize: 14, color: '#857DA0' }}>
            Sujet einreichen bis {fmtDate(sujFrist)}
          </span>
        )}
      </div>

      {/* Aktions-Buttons */}
      <div className={styles.rv} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480, '--i': 2 } as React.CSSProperties}>
        <button
          onClick={handleBuchen}
          style={{ ...btnBase, background: '#6B4FBB', color: '#fff', fontSize: 17 }}
        >
          Jetzt buchen →
        </button>

        <button
          style={{ ...btnBase, background: '#fff', color: '#2D1F52', fontSize: 16, border: '1.5px solid #E6E1F2', fontWeight: 600 }}
        >
          Offerte als PDF anfragen
        </button>

        {showBeratung && (
          <button
            style={{ ...btnBase, background: '#fff', color: '#857DA0', fontSize: 15, border: '1.5px solid #E6E1F2', fontFamily: 'inherit', fontWeight: 500 }}
          >
            Kurz besprechen · 15 min
          </button>
        )}
      </div>

      <p style={{ fontSize: 13, color: '#857DA0', marginTop: 18, lineHeight: 1.5, maxWidth: 480 }}>
        Nach der Buchung: Sujet einreichen, fertig. Wir melden uns mit Buchungsbestätigung.
      </p>
    </div>
  );
}
