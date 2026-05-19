import type { DashboardData } from '@/lib/dashboard/types';
import { Card, Label, KeyValueRow, ChecklistItem, Callout, Btn, Pill, C } from './atoms';

const FD = "var(--font-display)";
const FS = "var(--font-sans)";

export default function PhaseWerbemittel({ data }: { data: DashboardData }) {
  const { checkpoints = [], calloutDeadline, calloutBody, package: pkg, startDate, region, budget } = data;

  return (
    <>
      {/* Intro */}
      <div style={{ marginBottom: 20 }}>
        <Pill variant="warn">Werbemittel ausstehend</Pill>
        <h1 className="dash-h1" style={{ fontFamily: FD, fontWeight: 800, fontSize: 24, letterSpacing: '-0.025em', color: C.ink, margin: '14px 0 6px', lineHeight: 1.15 }}>
          Damit deine Kampagne startet, fehlt noch ein Schritt.
        </h1>
        <p style={{ fontSize: 13, color: C.muted, margin: '0 0 18px', lineHeight: 1.6, fontFamily: FS }}>
          Lade dein Werbemittel hoch oder gestalte es im VIO Ad Creator. Du kannst jederzeit über diesen Link wieder einsteigen.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* TODO: wire up upload flow */}
          <Btn href="#">Werbemittel hochladen →</Btn>
          {/* TODO: wire up Ad Creator */}
          <Btn href="#" ghost>Im Ad Creator gestalten</Btn>
        </div>
      </div>

      {/* Callout */}
      {calloutDeadline && (
        <div style={{ marginBottom: 12 }}>
          <Callout title={`Bitte bis ${calloutDeadline} hochladen`}>
            {calloutBody}
          </Callout>
        </div>
      )}

      {/* Checklist */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Fortschritt</Label>
        {checkpoints.map((cp, i) => (
          <ChecklistItem
            key={i}
            item={cp}
            isFirst={i === 0}
            isLast={i === checkpoints.length - 1}
          />
        ))}
      </Card>

      {/* Campaign details */}
      <Card>
        <Label>Deine Kampagne</Label>
        {pkg      && <KeyValueRow label="Paket"  value={pkg} />}
        {startDate && <KeyValueRow label="Start"  value={startDate} />}
        {region   && <KeyValueRow label="Region" value={region} />}
        {budget   && <KeyValueRow label="Budget" value={budget} />}
      </Card>
    </>
  );
}
