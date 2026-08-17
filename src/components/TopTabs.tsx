import type { TabConfig } from '../config/navigation';
import './TopTabs.css';

interface TopTabsProps {
  tabs: TabConfig[];
  activeKey: string;
  onChange: (key: string) => void;
}

export default function TopTabs({ tabs, activeKey, onChange }: TopTabsProps) {
  return (
    <div className="top-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`top-tabs-item ${tab.key === activeKey ? 'is-active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
