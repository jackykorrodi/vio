'use client';

import CampaignHint from '@/components/shared/CampaignHint';
import type { Hinweis } from '@/lib/preislogik';

const ALL_HINTS: Hinweis[] = [
  {
    code: 'hard_stop_budget',
    text: "Kampagnen ab CHF 100'000 planen wir persönlich. Buchung ist nur nach einem kurzen Gespräch möglich — damit wir sicherstellen, dass alles passt.",
    priority: 1,
  },
  {
    code: 'below_min_budget',
    text: "Ab CHF 4'000 funktioniert eine Kampagne wirkungsvoll. Wir heben dein Budget automatisch an.",
    priority: 1,
  },
  {
    code: 'optimal_28d_standard',
    text: 'Empfehlung für deine Kampagne. Die 28-tägige Laufzeit deckt das Entscheidungsfenster rund um den Versand der Stimmunterlagen ab.',
    priority: 5,
  },
  {
    code: '28d_broad_reach_low_frequency',
    text: 'Diese Empfehlung setzt stärker auf breite Sichtbarkeit über das politische Entscheidungsfenster. Die durchschnittliche Kontaktfrequenz liegt leicht unter dem Idealwert.',
    priority: 5,
  },
  {
    code: 'sprint_14d_thin_budget',
    text: 'Konzentrierter Schlussimpuls über 14 Tage. Für volle 28-Tage-Präsenz wäre das Budget eher knapp.',
    priority: 5,
  },
  {
    code: 'aufbau_42d_thin_budget',
    text: '6 Wochen Aufbau — sinnvoll für komplexere Themen oder wenn Bekanntheit aufgebaut werden soll.',
    priority: 5,
  },
  {
    code: 'dominanzmodus',
    text: 'Hohe Präsenz: jede erreichte Person sieht die Botschaft sehr oft. Zusätzliches Budget bringt in dieser Region kaum mehr Reichweite, aber stärkere Wiederholung.',
    priority: 5,
  },
  {
    code: 'dominanzmodus_stark',
    text: 'Sehr hohe Frequenz pro Person. Ab diesem Budget empfehlen wir ein persönliches Gespräch zur Optimierung — z.B. Region erweitern oder Budget gezielter einsetzen.',
    priority: 5,
  },
  {
    code: 'too_thin',
    text: 'Budget reicht in dieser Konstellation nicht für eine wirkungsvolle Kampagne. Empfehlung: Region verkleinern oder Budget erhöhen.',
    priority: 5,
  },
];

const VARIANT_LABELS: Record<string, string> = {
  hard_stop_budget:              'blocking',
  below_min_budget:              'blocking',
  optimal_28d_standard:          'recommendation',
  '28d_broad_reach_low_frequency': 'info',
  sprint_14d_thin_budget:        'info',
  aufbau_42d_thin_budget:        'info',
  dominanzmodus:                 'info',
  dominanzmodus_stark:           'nudge',
  too_thin:                      'nudge',
};

export default function CampaignHintTestPage() {
  const handleBookConsult = () => alert('Calendly würde jetzt öffnen');
  const handleApply = (code: string) => alert(`Apply: ${code}`);

  return (
    <div style={{ background: '#FAFAFA', minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{
          borderBottom: '1px solid rgba(107,79,187,0.10)',
          paddingBottom: 24,
          marginBottom: 48,
        }}>
          <h1 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 22,
            fontWeight: 700,
            color: '#1A0F3B',
            marginBottom: 8,
          }}>
            CampaignHint — Alle Varianten
          </h1>
          <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: '#5A556F' }}>
            Test-Playground · <code>app/_test/campaign-hint/page.tsx</code>
          </p>
        </div>

        {ALL_HINTS.map(hint => (
          <div key={hint.code} style={{ marginBottom: 48 }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#9B8FBF',
              marginBottom: 10,
              display: 'flex',
              gap: 12,
            }}>
              <span style={{ background: 'rgba(107,79,187,0.08)', padding: '2px 8px', borderRadius: 4 }}>
                {hint.code}
              </span>
              <span style={{ background: 'rgba(107,79,187,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                variant: {VARIANT_LABELS[hint.code]}
              </span>
              <span style={{ background: 'rgba(107,79,187,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                priority: {hint.priority}
              </span>
            </div>
            <CampaignHint
              hinweise={[hint]}
              onApply={handleApply}
              onBookConsult={handleBookConsult}
            />
          </div>
        ))}

        <div style={{
          borderTop: '1px solid rgba(107,79,187,0.10)',
          paddingTop: 32,
          marginTop: 32,
        }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: '#1A0F3B',
            marginBottom: 24,
          }}>
            Kombiniert — wie in der echten App
          </h2>
          <CampaignHint
            hinweise={[
              ALL_HINTS.find(h => h.code === 'optimal_28d_standard')!,
              ALL_HINTS.find(h => h.code === 'dominanzmodus')!,
            ]}
            onApply={handleApply}
            onBookConsult={handleBookConsult}
          />
        </div>
      </div>
    </div>
  );
}
