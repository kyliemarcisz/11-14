import React, { useEffect } from 'react';
import { HarborHeader } from './components/HarborHeader';
import { HarborTabBar } from './components/HarborTabBar';
import { useHarborStore } from './store/useHarborStore';
import { AddPillView } from './views/AddPillView';
import { AskSafetyView } from './views/AskSafetyView';
import { FamilyView } from './views/FamilyView';
import { OnboardingView } from './views/OnboardingView';
import { TodayView } from './views/TodayView';

export const App: React.FC = () => {
  const hasCompletedOnboarding = useHarborStore(
    (s) => s.hasCompletedOnboarding
  );
  const activeTab = useHarborStore((s) => s.activeTab);
  const brainFogMode = useHarborStore((s) => s.brainFogMode);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-brain-fog',
      brainFogMode ? 'true' : 'false'
    );
  }, [brainFogMode]);

  if (!hasCompletedOnboarding) {
    return <OnboardingView />;
  }

  return (
    <div className="app-shell">
      <HarborHeader />
      <main style={{ flex: 1 }}>
        {activeTab === 'today' && <TodayView />}
        {activeTab === 'scan' && <AddPillView />}
        {activeTab === 'safety' && <AskSafetyView />}
        {activeTab === 'care' && <FamilyView />}
      </main>
      <HarborTabBar />
    </div>
  );
};

export default App;
