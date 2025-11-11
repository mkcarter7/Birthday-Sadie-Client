'use client';

import PageHeader from '@/components/PageHeader';
import TimelineManager from '@/components/TimelineManager';

export default function AdminTimelinePage() {
  return (
    <main className="page">
      <PageHeader title="Timeline Admin" subtitle="Manage the party schedule" />
      <TimelineManager />
    </main>
  );
}
