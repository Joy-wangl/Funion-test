import { useEffect, useMemo, useState } from 'react';
import BubbleSelect from '../../components/BubbleSelect';
import { apps, DOMAINS, leaderUnits, leaderUnitOf, type AppItem } from './data';
import './AppCenter.css';

/* PRD《一体化应用中心需求对接文档》四大板块 */
type SectionKey = 'mine' | 'apps' | 'usage' | 'data';

const STATUS_LABEL: Record<AppItem['status'], string> = {
  online: '运行中',
  beta: '试用中',
  offline: '已停用',
};

/* ---------- 图标 ---------- */
const IC = {
  star: 'M12 3.6l2.6 5.3 5.9.9-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.9L12 3.6z',
  grid: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  chart: 'M4 20h16M7 16v-5m5 5V7m5 9v-3',
  db: 'M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
  enter: 'M13 5l7 7-7 7M20 12H4',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M4 12.5l5 5L20 6.5',
  phone: 'M5 4h4l2 5-2.5 1.5a12 12 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  mail: 'M4 6h16v12H4V6zm0 1l8 6 8-6',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-8 8a8 8 0 0116 0',
  dept: 'M4 20h16M6 20V6l6-3 6 3v14M10 9h1m3 0h1m-5 4h1m3 0h1',
};

function Icon({ d, size = 16, filled = false, className = '' }: { d: string; size?: number; filled?: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

/* 业务域配色（应用图标底色） */
const HUES: [string, string][] = [
  ['#eef3ff', '#4f7cff'],
  ['#e6f6fb', '#0e9db8'],
  ['#e8f7f0', '#1f9c5c'],
  ['#fff4e8', '#f77234'],
  ['#f0ecff', '#7b61ff'],
  ['#ffeef0', '#f53f5e'],
  ['#fffbe6', '#c9930a'],
  ['#ecf8e6', '#67a80f'],
];
const hueOf = (domain: string) => {
  const i = DOMAINS.findIndex((d) => d.name === domain);
  return HUES[(i < 0 ? 0 : i) % HUES.length];
};

const loadFavs = (): string[] => {
  try {
    const raw = localStorage.getItem('funion:ac:favs');
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return ['app-01', 'app-13'];
};

export default function AppCenter() {
  const [section, setSection] = useState<SectionKey>('apps');
  const [subView, setSubView] = useState<'domain' | 'all'>('domain');

  /* 收藏（我的应用） */
  const [favs, setFavs] = useState<string[]>(loadFavs);
  useEffect(() => {
    try { localStorage.setItem('funion:ac:favs', JSON.stringify(favs)); } catch { /* ignore */ }
  }, [favs]);

  /* 业务域视图 */
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS[0].name);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /* 所有应用筛选：草稿态，点搜索生效 */
  const [fDomain, setFDomain] = useState('全部业务域');
  const [fLeader, setFLeader] = useState('全部域长单位');
  const [fName, setFName] = useState('');
  const [fCoverage, setFCoverage] = useState('');
  const [query, setQuery] = useState({ domain: '全部业务域', leader: '全部域长单位', name: '', coverage: '' });

  /* 权限申请流程 */
  const [applied, setApplied] = useState<string[]>([]);
  const [permApp, setPermApp] = useState<AppItem | null>(null);
  const [permReason, setPermReason] = useState('');
  const [permDone, setPermDone] = useState(false);

  /* 轻提示 */
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const favApps = useMemo(() => apps.filter((a) => favs.includes(a.id)), [favs]);
  const domainApps = useMemo(() => apps.filter((a) => a.domain === selectedDomain), [selectedDomain]);
  const selectedApp = apps.find((a) => a.id === selectedId) ?? null;

  const filteredApps = useMemo(() => {
    return apps.filter((a) => {
      const okDomain = query.domain === '全部业务域' || a.domain === query.domain;
      const okLeader = query.leader === '全部域长单位' || leaderUnitOf(a.domain) === query.leader;
      const okName = !query.name || a.name.toLowerCase().includes(query.name.trim().toLowerCase());
      const okCoverage = !query.coverage || a.coverage.some((c) => c.includes(query.coverage.trim()));
      return okDomain && okLeader && okName && okCoverage;
    });
  }, [query]);

  const toggleFav = (id: string) => {
    setFavs((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  };

  /* 单点登录进入系统；无权限走权限申请流程 */
  const enterApp = (app: AppItem) => {
    if (app.status === 'offline') {
      setToast(`「${app.name}」已停用，请联系运维联系人`);
      return;
    }
    if (!app.hasPermission && !applied.includes(app.id)) {
      setPermReason('');
      setPermDone(false);
      setPermApp(app);
      return;
    }
    if (!app.hasPermission) {
      setToast('权限申请审批中，通过后即可进入系统');
      return;
    }
    setToast(`单点登录成功，正在跳转「${app.name}」`);
  };

  const submitPerm = () => {
    if (!permApp) return;
    if (!permReason.trim()) {
      setToast('请填写申请理由');
      return;
    }
    setApplied((v) => [...v, permApp.id]);
    setPermDone(true);
  };

  const openPerm = (app: AppItem) => {
    setPermReason('');
    setPermDone(false);
    setPermApp(app);
  };

  /* ---------- 通用：应用卡片 ---------- */
  const renderCard = (app: AppItem) => {
    const [bg, fg] = hueOf(app.domain);
    const fav = favs.includes(app.id);
    return (
      <div
        key={app.id}
        className={`ac-app-card${selectedId === app.id ? ' on' : ''}`}
        onClick={() => setSelectedId(app.id)}
      >
        <div className="ac-card-top">
          <span className="ac-app-icon" style={{ background: bg, color: fg }}>{app.name[0]}</span>
          <button
            type="button"
            className={`ac-star${fav ? ' on' : ''}`}
            title={fav ? '取消收藏' : '收藏'}
            onClick={(e) => { e.stopPropagation(); toggleFav(app.id); }}
          >
            <Icon d={IC.star} size={17} filled={fav} />
          </button>
        </div>
        <h3 className="ac-app-name">{app.name}</h3>
        <p className="ac-app-intro">{app.intro}</p>
        <div className="ac-card-foot">
          <span className={`ac-status st-${app.status}`}>{STATUS_LABEL[app.status]}</span>
          <span className="ac-card-domain">{app.domain}</span>
        </div>
      </div>
    );
  };

  /* ---------- 通用：右侧应用信息（PRD：责任部门/联系人/联系方式/简介） ---------- */
  const renderDetail = () => {
    if (!selectedApp) {
      return (
        <div className="ac-detail-empty">
          <Icon d={IC.grid} size={36} className="ac-detail-empty-ico" />
          <p>点击应用卡片查看应用信息</p>
        </div>
      );
    }
    const app = selectedApp;
    const [bg, fg] = hueOf(app.domain);
    const fav = favs.includes(app.id);
    const pending = !app.hasPermission && applied.includes(app.id);
    return (
      <>
        <div className="ac-detail-head">
          <span className="ac-app-icon lg" style={{ background: bg, color: fg }}>{app.name[0]}</span>
          <div className="ac-detail-title">
            <h3>{app.name}</h3>
            <span className={`ac-status st-${app.status}`}>{STATUS_LABEL[app.status]}</span>
          </div>
        </div>
        <div className="ac-detail-body">
          <div className="ac-row"><span className="ac-row-label">责任部门</span><span className="ac-row-value">{app.responsibleDept}</span></div>
          <div className="ac-row">
            <span className="ac-row-label">联系人</span>
            <span className="ac-row-value">
              {app.businessContact.name}（业务）／{app.opsContact.name}（运维）
            </span>
          </div>
          <div className="ac-row">
            <span className="ac-row-label">联系方式</span>
            <span className="ac-row-value">{app.phone}<br />{app.email}</span>
          </div>
          <div className="ac-row"><span className="ac-row-label">业务域</span><span className="ac-row-value">{app.domain}</span></div>
          <div className="ac-row"><span className="ac-row-label">覆盖业务</span><span className="ac-row-value">{app.coverage.join('、')}</span></div>
          <div className="ac-row col">
            <span className="ac-row-label">简介</span>
            <p className="ac-row-intro">{app.intro}</p>
          </div>
        </div>
        <div className="ac-detail-foot">
          <button type="button" className="ac-btn primary" onClick={() => enterApp(app)}>
            <Icon d={IC.enter} size={14} />
            进入系统
          </button>
          {!app.hasPermission && !pending && (
            <button type="button" className="ac-btn light" onClick={() => openPerm(app)}>权限申请</button>
          )}
          {pending && <span className="ac-perm-pending">权限审批中</span>}
          <button
            type="button"
            className={`ac-btn light${fav ? ' starred' : ''}`}
            onClick={() => toggleFav(app.id)}
          >
            <Icon d={IC.star} size={14} filled={fav} />
            {fav ? '已收藏' : '收藏'}
          </button>
        </div>
      </>
    );
  };

  /* ---------- 板块一：我的应用 ---------- */
  const renderMine = () => (
    <>
      <div className="ac-head">
        <h2 className="ac-title">我的应用</h2>
        <span className="ac-desc">我收藏的应用信息，点击后与业务域列表页面操作相同</span>
      </div>
      {favApps.length === 0 ? (
        <div className="ac-empty">
          <Icon d={IC.star} size={34} />
          <p>暂无收藏的应用</p>
          <button type="button" className="ac-btn light" onClick={() => setSection('apps')}>去应用（业务域）收藏</button>
        </div>
      ) : (
        <div className="ac-board">
          <div className="ac-board-center">
            <div className="ac-card-grid">{favApps.map(renderCard)}</div>
          </div>
          <aside className="ac-detail">{renderDetail()}</aside>
        </div>
      )}
    </>
  );

  /* ---------- 板块二：应用（业务域） ---------- */
  const renderApps = () => (
    <>
      <div className="ac-head">
        <h2 className="ac-title">应用（业务域）</h2>
        <span className="ac-desc">按油田业务域管理应用，左侧业务域 · 中间卡片 · 右侧应用信息</span>
        <div className="ac-seg">
          <button type="button" className={subView === 'domain' ? 'on' : ''} onClick={() => setSubView('domain')}>按业务域列表</button>
          <button type="button" className={subView === 'all' ? 'on' : ''} onClick={() => setSubView('all')}>所有应用</button>
        </div>
      </div>

      {subView === 'domain' ? (
        <div className="ac-board with-menu">
          <aside className="ac-domain-menu">
            <div className="ac-menu-title">业务域</div>
            {DOMAINS.map((d) => (
              <button
                key={d.name}
                type="button"
                className={`ac-menu-item${selectedDomain === d.name ? ' on' : ''}`}
                onClick={() => { setSelectedDomain(d.name); setSelectedId(null); }}
              >
                <span className="ac-menu-name">{d.name}</span>
                <span className="ac-menu-count">{apps.filter((a) => a.domain === d.name).length}</span>
              </button>
            ))}
          </aside>
          <div className="ac-board-center">
            <div className="ac-card-grid">{domainApps.map(renderCard)}</div>
          </div>
          <aside className="ac-detail">{renderDetail()}</aside>
        </div>
      ) : (
        <>
          <div className="ac-filters">
            <BubbleSelect
              className="ac-select"
              options={['全部业务域', ...DOMAINS.map((d) => d.name)]}
              value={fDomain}
              onChange={setFDomain}
            />
            <BubbleSelect
              className="ac-select"
              options={['全部域长单位', ...leaderUnits]}
              value={fLeader}
              onChange={setFLeader}
            />
            <input className="ac-input" placeholder="系统名" value={fName} onChange={(e) => setFName(e.target.value)} />
            <input className="ac-input" placeholder="覆盖业务" value={fCoverage} onChange={(e) => setFCoverage(e.target.value)} />
            <div className="ac-actions">
              <button
                type="button"
                className="ac-btn light"
                onClick={() => {
                  setFDomain('全部业务域'); setFLeader('全部域长单位'); setFName(''); setFCoverage('');
                  setQuery({ domain: '全部业务域', leader: '全部域长单位', name: '', coverage: '' });
                }}
              >
                重置
              </button>
              <button
                type="button"
                className="ac-btn primary"
                onClick={() => setQuery({ domain: fDomain, leader: fLeader, name: fName, coverage: fCoverage })}
              >
                搜索
              </button>
            </div>
          </div>

          <div className="ac-table-card">
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
                {filteredApps.map((app) => {
                  const [bg, fg] = hueOf(app.domain);
                  const fav = favs.includes(app.id);
                  return (
                    <tr key={app.id}>
                      <td>
                        <div className="ac-table-name">
                          <span className="ac-table-icon" style={{ background: bg, color: fg }}>{app.name[0]}</span>
                          <span>{app.name}</span>
                        </div>
                      </td>
                      <td>{app.domain}</td>
                      <td>{leaderUnitOf(app.domain)}</td>
                      <td>{app.coverage.join('、')}</td>
                      <td>{app.businessContact.name}</td>
                      <td><span className={`ac-status st-${app.status}`}>{STATUS_LABEL[app.status]}</span></td>
                      <td>
                        <div className="ac-table-ops">
                          <button type="button" className="ac-link" onClick={() => enterApp(app)}>进入系统</button>
                          <button
                            type="button"
                            className={`ac-star${fav ? ' on' : ''}`}
                            title={fav ? '取消收藏' : '收藏'}
                            onClick={() => toggleFav(app.id)}
                          >
                            <Icon d={IC.star} size={15} filled={fav} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredApps.length === 0 && (
              <div className="ac-table-empty">未找到匹配的应用</div>
            )}
          </div>
        </>
      )}
    </>
  );

  /* ---------- 板块三：使用情况 ---------- */
  const renderUsage = () => {
    const totalClicks = apps.reduce((s, a) => s + a.clicks, 0);
    const top = [...apps].sort((a, b) => b.clicks - a.clicks);
    const maxClicks = top[0]?.clicks ?? 1;
    const onlineCount = apps.filter((a) => a.status === 'online').length;
    return (
      <>
        <div className="ac-head">
          <h2 className="ac-title">使用情况</h2>
          <span className="ac-desc">各个应用的点击率使用情况卡片、排名</span>
        </div>

        <div className="ac-stats">
          <div className="ac-stat"><span className="ac-stat-label">应用总数</span><span className="ac-stat-num">{apps.length}</span><span className="ac-stat-sub">覆盖 {DOMAINS.length} 个业务域</span></div>
          <div className="ac-stat"><span className="ac-stat-label">本月总点击</span><span className="ac-stat-num">{totalClicks.toLocaleString()}</span><span className="ac-stat-sub">单点登录统一计数</span></div>
          <div className="ac-stat"><span className="ac-stat-label">运行中应用</span><span className="ac-stat-num">{onlineCount}</span><span className="ac-stat-sub">试用中 {apps.filter((a) => a.status === 'beta').length} 个</span></div>
          <div className="ac-stat"><span className="ac-stat-label">最受欢迎</span><span className="ac-stat-num sm">{top[0]?.name}</span><span className="ac-stat-sub">本月点击 {top[0]?.clicks.toLocaleString()} 次</span></div>
        </div>

        <div className="ac-usage-grid">
          <div className="ac-card ac-rank-card">
            <div className="ac-card-title">应用点击排名</div>
            <div className="ac-rank-list">
              {top.slice(0, 8).map((app, i) => (
                <div key={app.id} className="ac-rank-row">
                  <span className={`ac-rank-no r${i + 1}`}>{i + 1}</span>
                  <div className="ac-rank-main">
                    <div className="ac-rank-line">
                      <span className="ac-rank-name">{app.name}</span>
                      <span className="ac-rank-num">{app.clicks.toLocaleString()} 次</span>
                    </div>
                    <div className="ac-rank-bar"><i style={{ width: `${Math.round((app.clicks / maxClicks) * 100)}%` }} /></div>
                  </div>
                  <span className="ac-rank-rate">{((app.clicks / totalClicks) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ac-usage-cards">
            {top.map((app) => {
              const [bg, fg] = hueOf(app.domain);
              const wMax = Math.max(...app.weekly);
              return (
                <div key={app.id} className="ac-card ac-ucard">
                  <div className="ac-ucard-head">
                    <span className="ac-app-icon sm" style={{ background: bg, color: fg }}>{app.name[0]}</span>
                    <div className="ac-ucard-title">
                      <span className="ac-ucard-name">{app.name}</span>
                      <span className="ac-ucard-domain">{app.domain}</span>
                    </div>
                    <span className="ac-ucard-clicks">{app.clicks.toLocaleString()}</span>
                  </div>
                  <div className="ac-bars">
                    {app.weekly.map((w, i) => (
                      <i key={i} className={i === app.weekly.length - 1 ? 'last' : ''} style={{ height: `${Math.max(12, Math.round((w / wMax) * 100))}%` }} title={`${w} 次`} />
                    ))}
                  </div>
                  <div className="ac-ucard-foot">近 7 日点击趋势 · 点击率 {((app.clicks / totalClicks) * 100).toFixed(1)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      </>
    );
  };

  /* ---------- 板块四：数据中心（EPBP 嵌入） ---------- */
  const renderData = () => (
    <>
      <div className="ac-head">
        <h2 className="ac-title">数据中心</h2>
        <span className="ac-desc">EPBP 数据嵌入，单点登录免登录访问</span>
      </div>
      <div className="ac-card ac-epbp">
        <div className="ac-epbp-head">
          <span className="ac-epbp-tag">EPBP</span>
          <span className="ac-epbp-title">企业业务基础平台（EPBP）数据嵌入区</span>
          <span className="ac-epbp-sub">与 EPBP 结合嵌入，统一单点登录</span>
        </div>
        <div className="ac-epbp-body">
          <div className="ac-epbp-logo">EPBP</div>
          <p>勘探开发一体化业务数据将在此嵌入展示</p>
          <button type="button" className="ac-btn primary" onClick={() => setToast('单点登录成功，正在打开 EPBP 数据中心')}>
            <Icon d={IC.enter} size={14} />
            单点登录打开 EPBP
          </button>
        </div>
      </div>
    </>
  );

  const SECTIONS: { key: SectionKey; label: string; icon: string; badge?: number }[] = [
    { key: 'mine', label: '我的应用', icon: IC.star, badge: favs.length },
    { key: 'apps', label: '应用（业务域）', icon: IC.grid },
    { key: 'usage', label: '使用情况', icon: IC.chart },
    { key: 'data', label: '数据中心', icon: IC.db },
  ];

  return (
    <div className="ac-page">
      <aside className="ac-side">
        <div className="ac-side-brand">应用中心<span>一体化应用门户</span></div>
        <div className="ac-grp">导航</div>
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`ac-nav${section === s.key ? ' active' : ''}`}
            onClick={() => { setSection(s.key); setSelectedId(null); }}
          >
            <span className="ac-nav-ico"><Icon d={s.icon} size={17} /></span>
            <span className="ac-nav-text">{s.label}</span>
            {s.badge ? <span className="ac-badge">{s.badge}</span> : null}
          </button>
        ))}
      </aside>

      <main className="ac-main">
        {section === 'mine' && renderMine()}
        {section === 'apps' && renderApps()}
        {section === 'usage' && renderUsage()}
        {section === 'data' && renderData()}
      </main>

      {toast && <div className="ac-toast">{toast}</div>}

      {permApp && (
        <div className="ac-mask" onClick={() => setPermApp(null)}>
          <div className="ac-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ac-modal-head">
              <span>权限申请</span>
              <button type="button" className="ac-modal-close" onClick={() => setPermApp(null)}>
                <Icon d={IC.close} size={14} />
              </button>
            </div>
            {permDone ? (
              <div className="ac-modal-success">
                <span className="ac-success-ico"><Icon d={IC.check} size={22} /></span>
                <h4>申请已提交</h4>
                <p>系统：{permApp.name}</p>
                <p>审批流程：{leaderUnitOf(permApp.domain)} 审批 → 科技信息部备案</p>
                <p className="ac-success-status">当前状态：审批中</p>
              </div>
            ) : (
              <div className="ac-modal-body">
                <div className="ac-row"><span className="ac-row-label">申请系统</span><span className="ac-row-value">{permApp.name}</span></div>
                <div className="ac-row"><span className="ac-row-label">申请人</span><span className="ac-row-value">七妮妮</span></div>
                <div className="ac-row"><span className="ac-row-label">审批流程</span><span className="ac-row-value">{leaderUnitOf(permApp.domain)} 审批 → 科技信息部备案</span></div>
                <div className="ac-row col grow">
                  <span className="ac-row-label">申请理由</span>
                  <textarea
                    className="ac-textarea"
                    placeholder="请说明申请该系统权限的业务背景"
                    value={permReason}
                    onChange={(e) => setPermReason(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="ac-modal-foot">
              {permDone ? (
                <button type="button" className="ac-btn primary" onClick={() => setPermApp(null)}>完成</button>
              ) : (
                <>
                  <button type="button" className="ac-btn light" onClick={() => setPermApp(null)}>取消</button>
                  <button type="button" className="ac-btn primary" onClick={submitPerm}>提交申请</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
