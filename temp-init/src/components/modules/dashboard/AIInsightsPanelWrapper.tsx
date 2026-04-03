'use client';
import dynamic from 'next/dynamic';
const AIInsightsPanel = dynamic(() => import('./AIInsightsPanel'), { ssr: false });
export default function AIInsightsPanelWrapper() {
  return <AIInsightsPanel />;
}
