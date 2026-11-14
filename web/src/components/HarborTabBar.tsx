import { Camera, Heart, LucideIcon, ShieldCheck, Sun } from 'lucide-react';
import React from 'react';
import { triggerGentleFeedback } from '../services/audioService';
import { HarborTab, useHarborStore } from '../store/useHarborStore';

const TABS: Array<{
  key: HarborTab;
  label: string;
  Icon: LucideIcon;
}> = [
  { key: 'today', label: 'Today', Icon: Sun },
  { key: 'scan', label: 'Add Pill', Icon: Camera },
  { key: 'safety', label: 'Ask Safety', Icon: ShieldCheck },
  { key: 'care', label: 'Family', Icon: Heart },
];

export const HarborTabBar: React.FC = () => {
  const activeTab = useHarborStore((s) => s.activeTab);
  const setActiveTab = useHarborStore((s) => s.setActiveTab);

  return (
    <nav className="floating-dock-wrapper" aria-label="Main navigation">
      <div className="floating-dock">
        {TABS.map(({ key, label, Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              className="dock-tab"
              data-active={isActive}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                triggerGentleFeedback();
                setActiveTab(key);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
