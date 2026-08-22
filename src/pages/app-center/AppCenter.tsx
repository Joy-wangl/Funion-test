import { useMemo, useState } from 'react';
import BubbleSelect from '../../components/BubbleSelect';
import { apps, DOMAINS, leaderUnits, type AppItem, type Domain } from './data';
import './AppCenter.css';

type TabKey = 'domain' | 'all';

const STATUS_LABEL: Record<AppItem['status'], string> = {
  online: '已上线',
  beta: '试用中',
  offline: '已下线',
};

const STATUS_CLS: Record<AppItem['status'], string> = {
  online: 'status-online',
  beta: 'status-beta',
  offline: 'status-offline',
};

export default function AppCenter() {
  const [tab, setTab] = useState<TabKey>('domain');
  const [selectedDomain, setSelectedDomain] = useState<Domain>(DOMAINS[0]);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  const [filterDomain, setFilterDomain] = useState<string>('全部业务域');
  const [filterLeader, setFilterLeader] = useState<string>('全部域长单位');
  const [filterName, setFilterName] = useState('');
  const [filterCoverage, setFilterCoverage] = useState('');

  const domainApps = useMemo(
    () => apps.filter((a) => a.domain === selectedDomain),
    [selectedDomain],
  );

  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      const okDomain = filterDomain === '全部业务域' || a.domain === filterDomain;
      const okLeader = filterLeader === '全部域长单位' || a.leaderUnit === filterLeader;
      const okName = !filterName || a.name.toLowerCase().includes(filterName.trim().toLowerCase());
      const okCoverage = !filterCoverage || a.coverage.some((c) => c.includes(filterCoverage.trim()));
      return okDomain && okLeader && okName && okCoverage;
    });
  }, [filterDomain, filterLeader, filterName, filterCoverage]);

  const enterApp = (app: AppItem) => {
    window.alert(`进入系统：${app.name}`);
  };

  return (
    <div className="app-center">
      <header className="ac-header">
        <div className="ac-brand">
          <span className="ac-brand-icon">▣</span>
          <span className="ac-brand-name">应用中心</span>
        </div>
        <div className="ac-tabs">
          <button
            type="button"
            className={`ac-tab ${tab === 'domain' ? 'active' : ''}`}
            onClick={() => setTab('domain')}
          >
            业务域应用
          </button>
          <button
            type="button"
            className={`ac-tab ${tab === 'all' ? 'active' : ''}`}
            onClick={() => setTab('all')}
          >
            所有应用
          </button>
        </div>
        <div className="ac-header-right">
          <span className="ac-avatar">应</span>
        </div>
      </header>

      {tab === 'domain' ? (
        <div className="ac-domain-layout">
          <aside className="ac-domain-menu">
            <div className="ac-menu-title">业务域</div>
            <nav className="ac-menu-list">
              {DOMAINS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`ac-menu-item ${selectedDomain === d ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedDomain(d);
                    setSelectedApp(null);
                  }}
                >
                  {d}
                  <span className="ac-menu-count">{apps.filter((a) => a.domain === d).length}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="ac-domain-main">
            <div className="ac-domain-hd">
              <h2 className="ac-domain-name">{selectedDomain}</h2>
              <span className="ac-domain-sub">{domainApps.length} 个应用</span>
            </div>
            <div className="ac-card-grid">
              {domainApps.map((app) => (
                <div
                  key={app.id}
                  className={`ac-app-card ${selectedApp?.id === app.id ? 'selected' : ''}`}
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="ac-card-head">
                    <div className="ac-app-icon">{app.name[0]}</div>
                    <span className={`ac-status ${STATUS_CLS[app.status]}`}>{STATUS_LABEL[app.status]}</span>
                  </div>
                  <h3 className="ac-app-name">{app.name}</h3>
                  <p className="ac-app-intro">{app.intro}</p>
                  <div className="ac-app-tags">
                    {app.tags.map((t) => (
                      <span key={t} className="ac-tag">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </main>

          <aside className="ac-detail-panel">
            {selectedApp ? (
              <>
                <div className="ac-detail-head">
                  <div className="ac-detail-icon">{selectedApp.name[0]}</div>
                  <div>
                    <h3 className="ac-detail-name">{selectedApp.name}</h3>
                    <span className={`ac-status ${STATUS_CLS[selectedApp.status]}`}>
                      {STATUS_LABEL[selectedApp.status]}
                    </span>
                  </div>
                </div>
                <div className="ac-detail-body">
                  <div className="ac-detail-row">
                    <span className="ac-detail-label">责任部门</span>
                    <span className="ac-detail-value">{selectedApp.responsibleDept}</span>
                  </div>
                  <div className="ac-detail-row">
                    <span className="ac-detail-label">业务联系人</span>
                    <span className="ac-detail-value">
                      {selectedApp.businessContact.name}
                      <span className="ac-detail-role">({selectedApp.businessContact.role})</span>
                    </span>
                  </div>
                  <div className="ac-detail-row">
                    <span className="ac-detail-label">运维联系人</span>
                    <span className="ac-detail-value">
                      {selectedApp.opsContact.name}
                      <span className="ac-detail-role">({selectedApp.opsContact.role})</span>
                    </span>
                  </div>
                  <div className="ac-detail-row">
                    <span className="ac-detail-label">联系方式</span>
                    <span className="ac-detail-value">{selectedApp.phone}</span>
                  </div>
                  <div className="ac-detail-row">
                    <span className="ac-detail-label">邮箱</span>
                    <span className="ac-detail-value">{selectedApp.email}</span>
                  </div>
                  <div className="ac-detail-block">
                    <span className="ac-detail-label">简介</span>
                    <p className="ac-detail-intro">{selectedApp.intro}</p>
                  </div>
                  <div className="ac-detail-block">
                    <span className="ac-detail-label">覆盖业务</span>
                    <div className="ac-detail-tags">
                      {selectedApp.coverage.map((c) => (
                        <span key={c} className="ac-tag">{c}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="ac-detail-foot">
                  <button type="button" className="ac-btn-primary" onClick={() => enterApp(selectedApp)}>
                    进入系统
                  </button>
                </div>
              </>
            ) : (
              <div className="ac-detail-empty">
                <div className="ac-empty-icon">☰</div>
                <p>点击左侧应用卡片查看详情</p>
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className="ac-all-layout">
          <div className="ac-filter-bar">
            <BubbleSelect
              options={['全部业务域', ...DOMAINS]}
              value={filterDomain}
              onChange={setFilterDomain}
              className="ac-filter-select"
            />
            <BubbleSelect
              options={['全部域长单位', ...leaderUnits]}
              value={filterLeader}
              onChange={setFilterLeader}
              className="ac-filter-select"
            />
            <input
              className="ac-input"
              placeholder="系统名"
              value={filterName}
              onChange={(e) => setFilterName(e.target.value)}
            />
            <input
              className="ac-input"
              placeholder="覆盖业务"
              value={filterCoverage}
              onChange={(e) => setFilterCoverage(e.target.value)}
            />
            <div className="ac-actions">
              <button
                type="button"
                className="ac-btn-light"
                onClick={() => {
                  setFilterDomain('全部业务域');
                  setFilterLeader('全部域长单位');
                  setFilterName('');
                  setFilterCoverage('');
                }}
              >
                重置
              </button>
              <button type="button" className="ac-btn-primary">
                搜索
              </button>
            </div>
          </div>

          <div className="ac-table-wrap">
            <table className="ac-table">
              <thead>
                <tr>
                  <th>系统名</th>
                  <th>业务域</th>
                  <th>域长单位</th>
                  <th>覆盖业务</th>
                  <th>业务联系人</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <div className="ac-table-name">
                        <span className="ac-table-icon">{app.name[0]}</span>
                        <span>{app.name}</span>
                      </div>
                    </td>
                    <td>{app.domain}</td>
                    <td>{app.leaderUnit}</td>
                    <td>
                      <div className="ac-table-tags">
                        {app.coverage.map((c) => (
                          <span key={c} className="ac-tag">{c}</span>
                        ))}
                      </div>
                    </td>
                    <td>{app.businessContact.name}</td>
                    <td>
                      <span className={`ac-status ${STATUS_CLS[app.status]}`}>{STATUS_LABEL[app.status]}</span>
                    </td>
                    <td>
                      <button type="button" className="ac-link" onClick={() => enterApp(app)}>
                        进入系统
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredApps.length === 0 && (
              <div className="ac-empty-state">
                <div className="ac-empty-icon">🔍</div>
                <p>未找到匹配的应用</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
