'use client';

import { useSearchParams } from 'next/navigation';
import { BriefingData } from '@/lib/types';
import B2CFlow from '@/components/flows/B2CFlow';
import B2BFlow from '@/components/flows/B2BFlow';
import PolitikFlow from '@/components/flows/PolitikFlow';

export default function CampaignFlow() {
  const searchParams = useSearchParams();
  const urlParam    = searchParams.get('url')    ?? '';
  const typeParam   = searchParams.get('type')   ?? '';
  const resumeParam = searchParams.get('resume') ?? '';

  let resumeData: (Partial<BriefingData> & { _targetStep?: number }) | undefined;
  if (resumeParam) {
    try {
      resumeData = JSON.parse(atob(resumeParam)) as Partial<BriefingData> & { _targetStep?: number };
    } catch { /* ignore malformed resume param */ }
  }

  if (typeParam === 'politik') {
    return <PolitikFlow resumeData={resumeData} />;
  }
  if (typeParam === 'b2b') {
    return <B2BFlow initialUrl={urlParam} resumeData={resumeData} />;
  }
  return <B2CFlow initialUrl={urlParam} resumeData={resumeData} />;
}
