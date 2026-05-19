import type { Phase } from '@/lib/dashboard/types';
import { MOCK_DATA } from '@/lib/dashboard/mock-data';
import DashboardShell from '@/components/dashboard/DashboardShell';
import DemoPhaseSwitcher from '@/components/dashboard/DemoPhaseSwitcher';
import PhaseWerbemittel from '@/components/dashboard/PhaseWerbemittel';
import PhasePreLive from '@/components/dashboard/PhasePreLive';
import PhaseLive from '@/components/dashboard/PhaseLive';
import PhasePost from '@/components/dashboard/PhasePost';

const VALID_PHASES: Phase[] = ['werbemittel', 'preLive', 'live', 'post'];

function isValidPhase(v: string | undefined): v is Phase {
  return VALID_PHASES.includes(v as Phase);
}

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ preview?: string; demo?: string }>;
}) {
  const { token } = await params;
  const { preview, demo } = await searchParams;
  const phase: Phase = isValidPhase(preview) ? preview : 'live';
  const data = MOCK_DATA[phase];
  const isDemo = demo === '1';

  return (
    <>
      {isDemo && <DemoPhaseSwitcher token={token} activePhase={phase} />}
      <DashboardShell phase={phase} campaignName={data.campaignName}>
        {phase === 'werbemittel' && <PhaseWerbemittel data={data} />}
        {phase === 'preLive'     && <PhasePreLive     data={data} />}
        {phase === 'live'        && <PhaseLive        data={data} />}
        {phase === 'post'        && <PhasePost        data={data} />}
      </DashboardShell>
    </>
  );
}
