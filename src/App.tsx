import { useMemo, useState } from 'react';
import { navigation } from './config/navigation';
import TopTabs from './components/TopTabs';
import Sidebar, { findFirstLeaf } from './components/Sidebar';
import QualityControlCenter from './pages/quality/QualityControlCenter';
import OpsCenter from './pages/ops-center/OpsCenter';
import './App.css';

export default function App() {
  const [activeTabKey, setActiveTabKey] = useState('ops-center');
  const [activeMenuKey, setActiveMenuKey] = useState('');

  const activeTab = useMemo(
    () => navigation.find((tab) => tab.key === activeTabKey) ?? navigation[0],
    [activeTabKey],
  );

  const handleTabChange = (key: string) => {
    const tab = navigation.find((t) => t.key === key);
    if (!tab) return;
    setActiveTabKey(tab.key);
    setActiveMenuKey(findFirstLeaf(tab.menus)?.key ?? '');
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-logo">Funion</div>
        <TopTabs
          tabs={navigation}
          activeKey={activeTabKey}
          onChange={handleTabChange}
        />
        <div className="app-header-right">
          <span className="app-avatar" />
          <span className="app-username">七妮妮</span>
          <div className="app-window-dots">
            <button type="button" className="app-dot minimize">
              −
            </button>
            <button type="button" className="app-dot maximize">
              +
            </button>
            <button type="button" className="app-dot close">
              ×
            </button>
          </div>
        </div>
      </header>
      <div className="app-body">
        {activeTabKey === 'ops-center' ? (
          <main className="app-content">
            <OpsCenter />
          </main>
        ) : activeTabKey === 'qc' ? (
          <main className="app-content qc-standalone">
            <QualityControlCenter />
          </main>
        ) : (
          <>
            <Sidebar
              menus={activeTab.menus}
              activeKey={activeMenuKey}
              onSelect={setActiveMenuKey}
            />
            <main className="app-content" />
          </>
        )}
      </div>
    </div>
  );
}
