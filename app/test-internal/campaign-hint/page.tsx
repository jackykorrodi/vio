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
    code: 'too_thin',
    text: 'Dein Budget ist für 8 Wochen zu dünn verteilt. Empfehlung: Laufzeit auf 4 Wochen reduzieren für mehr Wirkung.',
    priority: 2,
  },
  {
    code: 'overkill',
    text: 'Deine Frequenz ist sehr hoch. Empfehlung: Budget reduzieren oder Region erweitern.',
    priority: 2,
  },
  {
    code: 'daily_below_floor',
    text: 'Tagesbudget unter CHF 150 — Ausspielung nicht garantiert. Empfehlung: Kürzere Laufzeit.',
    priority: 2,
  },
  {
    code: 'capped_by_region',
    text: 'Maximale Reichweite in Kanton Zürich erreicht. Mehr Budget bringt keine zusätzlichen Personen.',
    priority: 3,
  },
  {
    code: 'screen_class_begrenzt',
    text: 'In Adliswil läuft deine Kampagne mit erhöhtem Online-Anteil — das ist für diese Gemeindegrösse normal.',
    priority: 5,
  },
  {
    code: 'screen_class_display_dom',
    text: 'In Wädenswil erreichen wir deine Zielgruppe primär online. Digitale Plakate sind lokal stark begrenzt.',
    priority: 5,
  },
  {
    code: 'screen_class_multi_mixed',
    text: 'In deiner Region-Auswahl ist DOOH-Inventar teilweise begrenzt — der Online-Anteil wird entsprechend erhöht.',
    priority: 5,
  },
  {
    code: 'no_dooh_inventory',
    text: 'Keine DOOH-Flächen verfügbar. Kampagne läuft zu 100% als Display.',
    priority: 5,
  },
];

const VARIANT_LABELS: Record<string, string> = {
  hard_stop_budget: 'blocking',
  below_min_budget: 'blocking',
  too_thin: 'recommendation',
  overkill: 'recommendation',
  daily_below_floor: 'recommendation',
  capped_by_region: 'info',
  screen_class_begrenzt: 'context',
  screen_class_display_dom: 'context',
  screen_class_multi_mixed: 'context',
  no_dooh_inventory: 'context',
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
              ALL_HINTS.find(h => h.code === 'too_thin')!,
              ALL_HINTS.find(h => h.code === 'screen_class_begrenzt')!,
            ]}
            onApply={handleApply}
            onBookConsult={handleBookConsult}
          />
        </div>
      </div>
    </div>
  );
}
