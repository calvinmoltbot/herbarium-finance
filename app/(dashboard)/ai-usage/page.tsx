'use client';

import { Sparkles, Activity } from 'lucide-react';
import { PageLayout, PageSection } from '@/components/ui/page-layout';
import { LlmCostCard } from '@/components/dashboard/llm-cost-card';
import { CronStatusCard } from '@/components/dashboard/cron-status-card';

export default function AiUsagePage() {
  return (
    <PageLayout
      title="AI Usage"
      description="OpenRouter / LLM cost tracking for the Gmail purchase classifier and any other AI features."
      icon={Sparkles}
    >
      <PageSection
        title="Cron health"
        description="Status of the nightly gmail classifier. Goes red on failure or if the last run is older than 36 hours."
        icon={Activity}
      >
        <CronStatusCard jobName="gmail-classifier" label="Gmail classifier · last run" />
      </PageSection>

      <PageSection
        title="Spend"
        description="This month, lifetime, and how many transactions have been linked to a classified email."
        icon={Sparkles}
      >
        <LlmCostCard />
      </PageSection>
    </PageLayout>
  );
}
