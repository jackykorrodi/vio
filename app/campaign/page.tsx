import { Suspense } from 'react';
import CampaignFlow from './CampaignFlow';

export default function CampaignPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: 'var(--off-white)' }} />}>
      <CampaignFlow />
    </Suspense>
  );
}
