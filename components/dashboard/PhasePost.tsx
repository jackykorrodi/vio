import type { DashboardData } from '@/lib/dashboard/types';
import { Card, Label, KeyValueRow, StatCard, ScreenshotGrid, Pill, C } from './atoms';

const FD = "var(--font-display)";
const FS = "var(--font-sans)";

export default function PhasePost({ data }: { data: DashboardData }) {
  const {
    finalReached, finalAvgSeen,
    durationLabel, region, channelsLabel, budget, totalContactsLabel,
    postScreenshots = [],
  } = data;

  const finalReachedFormatted = finalReached?.toLocaleString('de-CH') ?? '';

  return (
    <>
      {/* Intro */}
      <div style={{ marginBottom: 20 }}>
        <Pill variant="done">Kampagne abgeschlossen</Pill>
        <h1 className="dash-h1" style={{ fontFamily: FD, fontWeight: 800, fontSize: 24, letterSpacing: '-0.025em', color: C.ink, margin: '14px 0 6px', lineHeight: 1.15 }}>
          Deine Botschaft ist angekommen.
        </h1>
        <p style={{ fontSize: 13, color: C.muted, margin: 0, lineHeight: 1.6, fontFamily: FS }}>
          Vom 1. bis 28. Juni 2026 lief deine Kampagne in der Stadt Zürich. Hier das Endresultat.
        </p>
      </div>

      {/* Final stats */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <StatCard
          variant="violet"
          label="Menschen erreicht"
          value={finalReachedFormatted}
          sub="Ziel ~125'000 · 100% erreicht ✓"
        />
        <StatCard
          variant="dark"
          label="Ø gesehen"
          value={`${finalAvgSeen}`}
          valueSuffix="×"
          sub="Ziel 5× · übertroffen"
        />
      </div>

      {/* Key facts */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Eckdaten</Label>
        {durationLabel    && <KeyValueRow label="Laufzeit"             value={durationLabel} />}
        {region           && <KeyValueRow label="Region"               value={region} />}
        {channelsLabel    && <KeyValueRow label="Kanäle"               value={channelsLabel} />}
        {budget           && <KeyValueRow label="Budget eingesetzt"    value={budget} />}
        {totalContactsLabel && <KeyValueRow label="Kontaktfläche total" value={totalContactsLabel} />}
      </Card>

      {/* Screenshots */}
      {postScreenshots.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Label style={{ paddingLeft: 4 }}>Highlights aus dem Einsatz</Label>
          <ScreenshotGrid items={postScreenshots} />
        </div>
      )}

      {/* CTA */}
      <Card variant="soft">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              Bereit für die nächste Kampagne?
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Mit dem Wissen aus dieser Runde planen wir die nächste in wenigen Minuten.
            </div>
          </div>
          {/* TODO: wire up new campaign flow */}
          <a
            href="#"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-sans)', background: C.violet, color: '#FFFFFF',
              border: 'none', padding: '11px 22px', borderRadius: 100,
              fontSize: 13, fontWeight: 500, textDecoration: 'none', cursor: 'pointer',
            }}
          >
            Neue Kampagne
          </a>
        </div>
      </Card>
    </>
  );
}
