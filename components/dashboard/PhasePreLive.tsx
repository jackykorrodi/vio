import type { DashboardData } from '@/lib/dashboard/types';
import { Card, Label, KeyValueRow, ChecklistItem, ContactCard, C } from './atoms';

const FD = "var(--font-display)";

export default function PhasePreLive({ data }: { data: DashboardData }) {
  const {
    daysUntilStart, startDate, region,
    checkpoints = [], creativeText,
    package: pkg, durationDays, estimatedReach, frequency,
    contact,
  } = data;

  return (
    <>
      {/* Countdown */}
      <Card variant="dark" style={{ textAlign: 'center', padding: '32px 22px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 14, fontFamily: FD }}>
          Deine Kampagne startet in
        </div>
        <div>
          <span style={{ fontFamily: FD, fontSize: 72, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.95, color: '#FFFFFF' }}>
            {daysUntilStart}
          </span>
          <span style={{ fontSize: 24, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginLeft: 10 }}>
            Tagen
          </span>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 14 }}>
          am {startDate} · {region}
        </div>
      </Card>

      {/* Checklist */}
      <Card style={{ marginBottom: 12 }}>
        <Label>Alles bereit</Label>
        {checkpoints.map((cp, i) => (
          <ChecklistItem
            key={i}
            item={cp}
            isFirst={i === 0}
            isLast={i === checkpoints.length - 1}
          />
        ))}
      </Card>

      {/* Creative + Campaign details */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <Label>Dein Sujet</Label>
          <div style={{
            aspectRatio: '16/9',
            background: `linear-gradient(135deg, ${C.violet}, ${C.ink})`,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontFamily: FD,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            padding: 24,
            lineHeight: 1.2,
            whiteSpace: 'pre-line',
          }}>
            {creativeText}
          </div>
        </Card>
        <Card>
          <Label>Deine Kampagne</Label>
          {pkg            && <KeyValueRow label="Paket"      value={pkg} />}
          {durationDays   && <KeyValueRow label="Laufzeit"   value={`${durationDays} Tage`} />}
          {estimatedReach && <KeyValueRow label="Reichweite" value={estimatedReach} />}
          {frequency      && <KeyValueRow label="Frequenz"   value={frequency} />}
        </Card>
      </div>

      {/* Contact */}
      {contact && (
        <Card>
          <Label>Deine Ansprechperson</Label>
          <ContactCard {...contact} />
        </Card>
      )}
    </>
  );
}
