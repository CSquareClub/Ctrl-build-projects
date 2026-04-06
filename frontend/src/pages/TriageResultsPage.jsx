import React from 'react';
import TopNavBar from '../components/TopNavBar';
import SideNavBar from '../components/SideNavBar';
import IssueHeader from '../components/IssueHeader';
import ResultCards from '../components/ResultCards';
import AIInsights from '../components/AIInsights';
import DuplicatesList from '../components/DuplicatesList';
import ActionButtonsBar from '../components/ActionButtonsBar';

export default function TriageResultsPage() {
  return (
    <div className="bg-background text-on-surface min-h-screen">
      {/* Top Navigation Bar */}
      <TopNavBar />

      {/* Side Navigation Bar */}
      <SideNavBar />

      {/* Main Content Area */}
      <main className="ml-60 pt-14 p-8 min-h-screen pb-32">
        {/* Issue Header */}
        <IssueHeader />

        {/* Result Cards Grid */}
        <ResultCards />

        {/* AI Insights Section */}
        <AIInsights />

        {/* Possible Duplicates Section */}
        <DuplicatesList />
      </main>

      {/* Action Buttons Bar */}
      <ActionButtonsBar />

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 opacity-20 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-primary/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-0 w-[400px] h-[400px] bg-tertiary/10 blur-[120px] rounded-full"></div>
      </div>
    </div>
  );
}
