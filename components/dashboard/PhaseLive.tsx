'use client';

import type { DashboardData } from '@/lib/dashboard/types';
import { Card, Label, KeyValueRow, StatCard, ProgressBar, ScreenshotGrid, ChannelMixCard, C } from './atoms';

const FD = "var(--font-display)";
const FS = "var(--font-sans)";

export default function PhaseLive({ data }: { data: DashboardData }) {
  const {
    reached, reachedTarget, reachedPct,
    avgSeen, avgSeenTarget, avgSeenPct,
    currentDay, totalDays, startLabel, endLabel, remainingDays,
    screenshots = [], screenshotsNewCount,
    doohPct = 70, displayPct = 30,
    activeScreensLabel, region,
  } = data;

  const reachedFormatted = reached?.toLocaleString('de-CH') ?? '';
  const reachedTargetFormatted = reachedTarget?.toLocaleString('de-CH') ?? '';

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
  }

  return (
    <>
      {/* Stat cards */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <StatCard
          variant="violet"
          label="Menschen erreicht"
          value={reachedFormatted}
          sub={`von ~${reachedTargetFormatted} möglich · ${reachedPct}%`}
          showProgress
          progressPct={reachedPct}
        />
        <StatCard
          variant="dark"
          label="Ø gesehen"
          value={`${avgSeen}`}
          valueSuffix="×"
          sub={`Ziel ${avgSeenTarget}× · auf Kurs`}
          showProgress
          progressPct={avgSeenPct}
        />
      </div>

      {/* Timeline */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
          <Label style={{ marginBottom: 0 }}>Laufzeit</Label>
          <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 13, color: C.violet }}>
            Tag {currentDay} von {totalDays}
          </div>
        </div>
        <ProgressBar pct={Math.round(((currentDay ?? 0) / (totalDays ?? 1)) * 100)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: C.muted }}>
          <span>Start {startLabel}</span>
          <span>noch {remainingDays} Tage</span>
          <span>Ende {endLabel}</span>
        </div>
      </Card>

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <Label style={{ marginBottom: 0 }}>Deine Werbung im Einsatz</Label>
            {screenshotsNewCount && (
              <span style={{ fontSize: 11, color: C.muted }}>{screenshotsNewCount} neue Aufnahmen</span>
            )}
          </div>
          <ScreenshotGrid items={screenshots} />
        </div>
      )}

      {/* Channel mix + regions */}
      <div className="dash-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Card>
          <Label>Kanal-Mix</Label>
          <ChannelMixCard doohPct={doohPct} displayPct={displayPct} />
        </Card>
        <Card>
          <Label>Regionen</Label>
          <KeyValueRow label={region ?? 'Region'} value="100%" />
          {activeScreensLabel && (
            <div style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              {activeScreensLabel}
            </div>
          )}
        </Card>
      </div>

      {/* Share card */}
      <Card variant="soft">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: FD, fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 4 }}>
              Teile dein Dashboard
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>
              Mit Vorstand, Parteikolleg:innen oder Spendern.
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: FS, background: C.violet, color: '#FFFFFF',
              border: 'none', padding: '11px 22px', borderRadius: 100,
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Link kopieren
          </button>
        </div>
      </Card>
    </>
  );
}
