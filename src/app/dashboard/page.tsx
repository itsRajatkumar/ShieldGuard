"use client";

import { Suspense } from 'react';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { Loader2 } from 'lucide-react';

function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <Dashboard />
    </Suspense>
  );
}

function DashboardFallback() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] gap-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
    )
}

export default DashboardPage;
