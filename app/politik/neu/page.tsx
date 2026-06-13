import { FlowProvider } from '@/components/flow-v2/FlowContext';
import Shell from '@/components/flow-v2/Shell';

export const metadata = {
  title: 'vio. — Kampagne planen',
};

export default function PolitikNeuPage() {
  return (
    <FlowProvider>
      <Shell />
    </FlowProvider>
  );
}
