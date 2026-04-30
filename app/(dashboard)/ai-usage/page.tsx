'use client';

import { Sparkles } from 'lucide-react';
import { PageLayout, PageSection } from '@/components/ui/page-layout';
import { LlmCostCard } from '@/components/dashboard/llm-cost-card';

export default function AiUsagePage() {
  return (
    <PageLayout
      title="AI Usage"
      description="OpenRouter / LLM cost tracking for the Gmail purchase classifier and any other AI features."
      icon={Sparkles}
    >
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
