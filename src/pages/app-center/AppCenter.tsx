import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import BubbleSelect from '../../components/BubbleSelect';
import {
  CATEGORIES, FORM_CATEGORIES, ICON_PRESETS, PLATFORM_NOTICES, PREVIEW_PRESETS, RANK_RANGES,
  actKind, creatorDept, initialApps, usageInRange, type AppItem, type IconSpec, type Preview,
} from './data';
import './AppCenter.css';

type View =
  | { kind: 'home' }
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'mine' }
  | { kind: 'create'; editId?: string };

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
};

/* ---------- 小图标 ---------- */
const Svg = ({ d, size = 14, className = '' }: { d: string; size?: number; className?: string }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const IC = {
  search: 'M11 4a7 7 0 110 14 7 7 0 010-14zm9 16l-4.35-4.35',
  clear: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  caret: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  sort: 'M8 5v14M8 5L5 8m3-3l3 3m8 11V5m0 14l-3-3m3 3l3-3',
  cat: 'M4 5h16v14H4V5zm0 4h16M9 9v10',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z',
  check: 'M20 6L9 17l-5-5',
  home: 'M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  all: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  star: 'M12 3l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45L2.6 9.85l6.5-.95L12 3z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  trophy: 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 01-10 0V4zm0 1H4v2a3 3 0 003 3m10-5h3v2a3 3 0 01-3 3',
  clock: 'M12 3a9 9 0 109 9 9 9 0 00-9-9zm0 4v5l3 2',
  flame: 'M12 3s5 4.5 5 9a5 5 0 01-10 0c0-4.5 5-9 5-9zm0 8s-2 1.8-2 3.5a2 2 0 004 0c0-1.7-2-3.5-2-3.5z',
};

function Logo({ icon, size = 44 }: { icon: IconSpec; size?: number }) {
  return (
    <span className="ap-logo" style={{ width: size, height: size, background: icon.bg, fontSize: size * 0.42, color: icon.c ?? '#fff', borderRadius: size * 0.24 }}>
      {icon.g}
    </span>
  );
}

function PreviewCard({ p }: { p: Preview }) {
  return (
    <div className={`ap-preview hue-${p.hue}`}>
      <span className="ap-preview-title">{p.title}</span>
      <span className="ap-preview-sub">{p.sub}</span>
    </div>
  );
}

/* 行右侧操作按钮：添加/更新/打开/加载 */
function ActionBtn({ app, loading, onAct }: { app: AppItem; loading: boolean; onAct: (a: AppItem) => void }) {
  if (loading) return <span className="ap-spin" />;
  const kind = actKind(app);
  return (
    <button type="button" className={`ap-act ${kind === 'update' ? 'update' : 'plain'}`} onClick={(e) => { e.stopPropagation(); onAct(app); }}>
      {kind === 'add' ? '添加' : kind === 'update' ? '更新' : '打开'}
    </button>
  );
}

export default function AppCenter() {
  const [apps, setApps] = useState<AppItem[]>(initialApps);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'users' | 'release' | null>(null);
  const [sortDesc, setSortDesc] = useState(true);
  const [view, setView] = useState<View>({ kind: 'home' });
  const [detailBack, setDetailBack] = useState<View>({ kind: 'list' });
  const [recent, setRecent] = useState<{ id: string; at: number }[]>([]);
  const [favIds, setFavIds] = useState<string[]>([]);
  const [noticeId, setNoticeId] = useState<string | null>(null);
  const [rankRange, setRankRange] = useState('近30天');
  const [rankTab, setRankTab] = useState<'person' | 'dept' | 'best'>('person');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [mineTab, setMineTab] = useState<'created' | 'added'>('created');
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [backView, setBackView] = useState<View>({ kind: 'mine' });

  /* 上传新创作表单 */
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fIcon, setFIcon] = useState<IconSpec | null>(null);
  const [fPreviews, setFPreviews] = useState<Preview[]>([]);
  const [fCat, setFCat] = useState('Agent');
  const [fTags, setFTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [tagPop, setTagPop] = useState(false);
  const [tagNew, setTagNew] = useState('');

  /* 类目管理抽屉（草稿态：新增/修改/删除/拖动排序，保存生效） */
  const [cats, setCats] = useState<string[]>(FORM_CATEGORIES);
  const [catDrawer, setCatDrawer] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /* 平台公告 banner 自动轮播 */
  useEffect(() => {
    const t = setInterval(() => setBannerIdx((v) => (v + 1) % PLATFORM_NOTICES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const mineActive = view.kind === 'mine' || (view.kind === 'create' && backView.kind === 'mine');

  const listApps = useMemo(() => {
    let list = apps;
    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(kw) || a.desc.toLowerCase().includes(kw));
    } else if (category) {
      list = list.filter((a) => a.category === category);
    }
    if (sortKey) {
      list = [...list].sort((a, b) => {
        const va = sortKey === 'users' ? a.users : a.release;
        const vb = sortKey === 'users' ? b.users : b.release;
        const r = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDesc ? -r : r;
      });
    } else if (category && !search.trim()) {
      /* 类目下默认按标签使用次数排序（标签关联应用数之和，降序） */
      const m = new Map<string, number>();
      apps.filter((a) => a.category === category).forEach((a) => a.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
      const score = (a: AppItem) => a.tags.reduce((s, t) => s + (m.get(t) ?? 0), 0);
      list = [...list].sort((a, b) => score(b) - score(a));
    }
    return list;
  }, [apps, search, category, sortKey, sortDesc]);

  const detailApp = view.kind === 'detail' ? apps.find((a) => a.id === view.id) ?? null : null;

  const patchApp = (id: string, patch: Partial<AppItem>) =>
    setApps((v) => v.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  /* 添加/更新：加载后落库；我创建的无添加操作，直接打开；打开即记入最近使用 */
  const act = (app: AppItem) => {
    const kind = actKind(app);
    if (kind === 'open') {
      setRecent((v) => [{ id: app.id, at: Date.now() }, ...v.filter((r) => r.id !== app.id)].slice(0, 8));
      setToast(`正在打开「${app.name}」`);
      return;
    }
    setLoadingId(app.id);
    setTimeout(() => {
      setLoadingId(null);
      if (kind === 'add') {
        patchApp(app.id, { added: true });
        setToast(`已添加「${app.name}」`);
      } else {
        patchApp(app.id, { hasUpdate: false });
        setToast(`「${app.name}」已更新`);
      }
    }, 900);
  };

  const openMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ id, x: r.right - 116, y: r.bottom + 6 });
  };

  const openDetail = (id: string) => {
    setDetailBack(view);
    setView({ kind: 'detail', id });
  };

  const toggleFav = (id: string) => {
    const on = favIds.includes(id);
    setFavIds((v) => (on ? v.filter((x) => x !== id) : [...v, id]));
    setToast(on ? '已取消收藏' : '已收藏，可在首页查看');
  };

  const removeAdded = (id: string) => {
    patchApp(id, { added: false });
    setToast('已移除应用');
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    setApps((v) => v.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    setToast('应用已删除');
  };

  const openCreate = (editId?: string) => {
    const src = editId ? apps.find((a) => a.id === editId) : null;
    setFName(src?.name ?? '');
    setFDesc(src?.desc ?? '');
    setFIcon(src?.icon ?? null);
    setFPreviews(src?.previews ?? []);
    setFCat(src?.category ?? 'Agent');
    setFTags(src?.tags ?? []);
    setBackView(view);
    setView({ kind: 'create', editId });
  };

  const submitCreate = () => {
    if (!fName.trim()) { setToast('请输入应用名称'); return; }
    if (!fIcon) { setToast('请上传应用图标'); return; }
    if (fPreviews.length === 0) { setToast('请至少上传一张应用主图'); return; }
    if (view.kind === 'create' && view.editId) {
      patchApp(view.editId, { name: fName.trim(), desc: fDesc.trim(), icon: fIcon, previews: fPreviews, category: fCat, tags: fTags });
      setToast('应用已更新');
    } else {
      const app: AppItem = {
        id: `my-${Date.now()}`,
        name: fName.trim(),
        desc: fDesc.trim() || '小蜜蜂干活很刻苦',
        icon: fIcon,
        category: fCat,
        added: false,
        mine: true,
        users: 0,
        release: today(),
        creator: '七妮妮',
        previews: fPreviews,
        tags: fTags,
      };
      setApps((v) => [app, ...v]);
      setToast('创作已上传');
    }
    if (!(view.kind === 'create' && view.editId)) setMineTab('created');
    setView(backView);
  };

  /* ---------- 类目管理：新增/修改/删除/拖动排序 ---------- */
  const openCatDrawer = () => {
    setDraft(cats);
    setEditIdx(null);
    setEditVal('');
    setCatDrawer(true);
  };

  const confirmEdit = (i: number) => {
    const name = editVal.trim();
    if (!name) { setToast('请输入类目名称'); return; }
    setDraft((v) => v.map((c, idx) => (idx === i ? name : c)));
    setEditIdx(null);
  };

  const addCatRow = () => {
    if (editIdx !== null) { setToast('请先完成当前编辑'); return; }
    setDraft((v) => [...v, '']);
    setEditIdx(draft.length);
    setEditVal('');
  };

  const removeCat = (i: number) => {
    setDraft((v) => v.filter((_, idx) => idx !== i));
    if (editIdx === i) setEditIdx(null);
    else if (editIdx !== null && editIdx > i) setEditIdx(editIdx - 1);
  };

  const saveCats = () => {
    const names = editIdx !== null ? draft.map((c, idx) => (idx === editIdx ? editVal.trim() : c)) : draft;
    if (names.some((n) => !n)) { setToast('类目名称不能为空'); return; }
    if (new Set(names).size !== names.length) { setToast('类目名称重复'); return; }
    setCats(names);
    if (!names.includes(fCat)) setFCat(names[0] ?? fCat);
    setCatDrawer(false);
    setToast('类目已保存');
  };

  /* ---------- 标签：按类目内使用次数（关联应用数）降序，支持选择/新建 ---------- */
  const catTagUsage = useMemo(() => {
    const m = new Map<string, number>();
    apps.filter((a) => a.category === fCat).forEach((a) => a.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return m;
  }, [apps, fCat]);

  const formTagOptions = useMemo(() => {
    const set = new Map<string, number>(catTagUsage);
    customTags.forEach((t) => { if (!set.has(t)) set.set(t, 0); });
    return [...set.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [catTagUsage, customTags]);

  const createTag = () => {
    const name = tagNew.trim();
    if (!name) { setToast('请输入标签名称'); return; }
    if (fTags.includes(name)) { setToast('标签已选择'); return; }
    setCustomTags((v) => (v.includes(name) ? v : [...v, name]));
    setFTags((v) => [...v, name]);
    setTagNew('');
  };

  /* ---------- 列表/我的应用共用行：caret=打开+展开（我的应用行/列表我创建的）；其余=添加/更新/打开；主图仅详情展示 ---------- */
  const renderCell = (app: AppItem, caret: boolean) => (
    <div key={app.id} className="ap-cell" onClick={() => openDetail(app.id)}>
      <div className="ap-row">
        <Logo icon={app.icon} />
        <div className="ap-row-main">
          <span className="ap-row-name">{app.name}</span>
          <span className="ap-row-desc">{app.desc}</span>
        </div>
        {caret ? (
          <div className="ap-open-wrap" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="ap-act plain" onClick={() => act(app)}>打开</button>
            <button type="button" className="ap-act caret" onClick={(e) => openMenu(app.id, e)}>
              <Svg d={IC.caret} size={12} className={menu?.id === app.id ? 'up' : ''} />
            </button>
          </div>
        ) : (
          <ActionBtn app={app} loading={loadingId === app.id} onAct={act} />
        )}
      </div>
    </div>
  );

  /* ---------- 首页 ---------- */
  const fmtRecent = (at: number) => {
    const d = new Date(at);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const renderHome = () => {
    const recentApps = recent
      .map((r) => ({ app: apps.find((a) => a.id === r.id), at: r.at }))
      .filter((x): x is { app: AppItem; at: number } => Boolean(x.app));
    const favApps = apps.filter((a) => favIds.includes(a.id));
    const now = Date.now();
    const releases = apps
      .filter((a) => a.hasUpdate || now - new Date(a.release).getTime() <= 30 * 86400000)
      .sort((a, b) => b.release.localeCompare(a.release));
    const personMap = new Map<string, number>();
    apps.forEach((a) => personMap.set(a.creator, (personMap.get(a.creator) ?? 0) + 1));
    const personRank = [...personMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const deptMap = new Map<string, number>();
    apps.forEach((a) => {
      const d = creatorDept(a.creator);
      deptMap.set(d, (deptMap.get(d) ?? 0) + 1);
    });
    const deptRank = [...deptMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const personUsers = new Map<string, number>();
    apps.forEach((a) => personUsers.set(a.creator, (personUsers.get(a.creator) ?? 0) + a.users));
    const deptUsers = new Map<string, number>();
    apps.forEach((a) => {
      const d = creatorDept(a.creator);
      deptUsers.set(d, (deptUsers.get(d) ?? 0) + a.users);
    });
    const bestApps = [...apps].sort((a, b) => usageInRange(b, rankRange) - usageInRange(a, rankRange)).slice(0, 5);
    return (
      <div className="ap-home">
        <div className="ap-home-banner-row">
          <div className="ap-banner" onClick={() => setNoticeId(PLATFORM_NOTICES[bannerIdx].id)}>
            <em className="ap-banner-tag">{PLATFORM_NOTICES[bannerIdx].tag} · {PLATFORM_NOTICES[bannerIdx].date}</em>
            <h3>{PLATFORM_NOTICES[bannerIdx].title}</h3>
            <p>{PLATFORM_NOTICES[bannerIdx].content}</p>
            <div className="ap-banner-dots" onClick={(e) => e.stopPropagation()}>
              {PLATFORM_NOTICES.map((n, i) => (
                <button key={n.id} type="button" className={i === bannerIdx ? 'on' : ''} onClick={() => setBannerIdx(i)} />
              ))}
            </div>
          </div>
          <section className="ap-home-card">
            <h3 className="ap-home-title"><Svg d={IC.flame} size={18} />应用上新（升级公告）</h3>
            <div className="ap-rel-list">
              {releases.map((a) => (
                <button type="button" key={a.id} className="ap-rel-item" onClick={() => openDetail(a.id)}>
                  <Logo icon={a.icon} size={32} />
                  <span className="ap-rel-main">
                    <b>{a.name}</b>
                    <i>{a.hasUpdate ? '有新版本可更新' : `${a.release} 新上架`}</i>
                  </span>
                  <em className={`ap-rel-tag ${a.hasUpdate ? 'up' : 'new'}`}>{a.hasUpdate ? '升级' : '上新'}</em>
                </button>
              ))}
              {releases.length === 0 && <div className="ap-empty">暂无上新与升级公告</div>}
            </div>
          </section>
        </div>

        <section className="ap-home-card">
          <h3 className="ap-home-title"><Svg d={IC.star} size={18} />我收藏的应用</h3>
          {favApps.length === 0 ? (
            <div className="ap-empty">还没有收藏的应用，在应用详情右上角点击星标即可收藏</div>
          ) : (
            <div className="ap-home-row">
              {favApps.map((app) => (
                <div key={app.id} className="ap-home-app">
                  <button type="button" className="ap-home-app-body" onClick={() => openDetail(app.id)}>
                    <Logo icon={app.icon} size={40} />
                    <span>
                      <span className="ap-home-app-name">{app.name}</span>
                      <span className="ap-home-app-sub">{app.users} 人次使用</span>
                    </span>
                  </button>
                  <button type="button" className="ap-fav on" title="取消收藏" onClick={() => toggleFav(app.id)}>
                    <Svg d={IC.star} size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ap-home-card">
          <h3 className="ap-home-title"><Svg d={IC.clock} size={18} />最近使用</h3>
          {recentApps.length === 0 ? (
            <div className="ap-empty">暂无最近使用的应用，点击应用的「打开」后会自动记录在这里</div>
          ) : (
            <div className="ap-home-row">
              {recentApps.map(({ app, at }) => (
                <button type="button" key={app.id} className="ap-home-app" onClick={() => openDetail(app.id)}>
                  <Logo icon={app.icon} size={40} />
                  <span>
                    <span className="ap-home-app-name">{app.name}</span>
                    <span className="ap-home-app-sub">{fmtRecent(at)} 使用</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="ap-home-card">
          <div className="ap-rank-head">
            <h3 className="ap-home-title"><Svg d={IC.trophy} size={18} />贡献榜</h3>
            <span className="ap-rank-note">组织架构同步自成员管理（钉钉归属）</span>
          </div>
          <div className="ap-rank-bar">
            <div className="ap-rank-tabs">
              {([['person', '个人贡献榜'], ['dept', '部门贡献榜'], ['best', '最佳应用榜']] as const).map(([k, label]) => (
                <button key={k} type="button" className={rankTab === k ? 'on' : ''} onClick={() => setRankTab(k)}>{label}</button>
              ))}
            </div>
            {rankTab === 'best' ? (
              <BubbleSelect options={RANK_RANGES} value={rankRange} onChange={setRankRange} />
            ) : (
              <span className="ap-rank-sub-note">{rankTab === 'person' ? '按创作数量排序' : '按部门整体创作次数排序'}</span>
            )}
          </div>
          <div className="ap-rank-list">
            {rankTab === 'person' && personRank.map(([name, n], i) => {
              const created = apps.filter((a) => a.creator === name).sort((a, b) => b.users - a.users);
              return (
                <div key={name} className="ap-rank-person">
                  <div className="ap-rank-row">
                    <b className={i < 3 ? `no${i + 1}` : ''}>{i + 1}</b>
                    <span className="ap-rank-name">{name}<i>{creatorDept(name)}</i></span>
                    <em>{n} 个创作 · {personUsers.get(name) ?? 0} 人使用</em>
                  </div>
                  <div className="ap-rank-apps">
                    {created.slice(0, 4).map((a) => (
                      <button key={a.id} type="button" className="ap-rank-app" onClick={() => openDetail(a.id)}>
                        <Logo icon={a.icon} size={18} />
                        <span>{a.name}</span>
                        <i>{a.users} 人</i>
                      </button>
                    ))}
                    {created.length > 4 && <span className="ap-rank-more">+{created.length - 4}</span>}
                  </div>
                </div>
              );
            })}
            {rankTab === 'dept' && deptRank.map(([name, n], i) => (
              <div key={name} className="ap-rank-row">
                <b className={i < 3 ? `no${i + 1}` : ''}>{i + 1}</b>
                <span className="ap-rank-name">{name}</span>
                <em>{n} 次创作 · {deptUsers.get(name) ?? 0} 人使用</em>
              </div>
            ))}
            {rankTab === 'best' && bestApps.map((a, i) => (
              <button type="button" key={a.id} className="ap-rank-row" onClick={() => openDetail(a.id)}>
                <b className={i < 3 ? `no${i + 1}` : ''}>{i + 1}</b>
                <Logo icon={a.icon} size={28} />
                <span className="ap-rank-name">{a.name}</span>
                <em>{usageInRange(a, rankRange)} 人次</em>
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  };

  /* ---------- 列表 / 搜索 ---------- */
  const renderList = () => {
    const kw = search.trim();
    const title = kw ? `“${kw}”搜索结果` : category ? `${category}（${listApps.length}）` : `全部应用（${listApps.length}）`;
    return (
      <>
        <div className="ap-list-head">
          <h2 className="ap-list-title">{title}</h2>
          <div className="ap-sorts">
            {(['users', 'release'] as const).map((k) => (
              <button
                key={k}
                type="button"
                className={`ap-sort${sortKey === k ? ' on' : ''}`}
                onClick={() => {
                  if (sortKey === k) setSortDesc((v) => !v);
                  else { setSortKey(k); setSortDesc(true); }
                }}
              >
                {k === 'users' ? '使用人数' : '上架时间'}
                <Svg d={IC.sort} size={12} />
              </button>
            ))}
          </div>
        </div>
        <div className="ap-grid">{listApps.map((a) => renderCell(a, a.mine))}</div>
      </>
    );
  };

  /* ---------- 详情 ---------- */
  const renderDetail = () => {
    if (!detailApp) return null;
    const app = detailApp;
    return (
      <div className="ap-detail">
        <button type="button" className="ap-back" onClick={() => setView(detailBack)}>
          <Svg d={IC.back} size={18} />
        </button>
        <button
          type="button"
          className={`ap-fav${favIds.includes(app.id) ? ' on' : ''}`}
          title={favIds.includes(app.id) ? '取消收藏' : '收藏'}
          onClick={() => toggleFav(app.id)}
        >
          <Svg d={IC.star} size={16} />
        </button>
        <div className="ap-detail-head">
          <Logo icon={app.icon} size={78} />
          <div className="ap-detail-info">
            <h2>{app.name}</h2>
            <p>{app.desc}</p>
            <button type="button" className="ap-btn-solid" onClick={() => act(app)}>
              {actKind(app) === 'add' ? '添加' : actKind(app) === 'update' ? '更新' : '打开'}
            </button>
          </div>
          <div className="ap-detail-stats">
            <div className="ap-stat"><span>创作者</span><b>{app.creator}</b></div>
            <div className="ap-stat"><span>上线时间</span><b>{app.release}</b></div>
            <div className="ap-stat"><span>使用人次</span><b>{app.users}</b></div>
          </div>
        </div>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub">预览</h3>
        <div className="ap-detail-previews">
          {app.previews.map((p, i) => <PreviewCard key={i} p={p} />)}
        </div>
      </div>
    );
  };

  /* ---------- 我的应用 ---------- */
  const renderMine = () => {
    const created = apps.filter((a) => a.mine);
    const added = apps.filter((a) => a.added && !a.mine);
    const list = mineTab === 'created' ? created : added;
    return (
      <>
        <div className="ap-mine-head">
          <div className="ap-mine-tabs">
            <button type="button" className={mineTab === 'created' ? 'on' : ''} onClick={() => setMineTab('created')}>我的创作</button>
            <button type="button" className={mineTab === 'added' ? 'on' : ''} onClick={() => setMineTab('added')}>我添加的</button>
          </div>
          <button type="button" className="ap-btn-blue" onClick={() => openCreate()}>上传新创作</button>
        </div>
        <div className="ap-grid mine">{list.map((a) => renderCell(a, true))}</div>
      </>
    );
  };

  /* ---------- 上传新创作 ---------- */
  const renderCreate = () => (
    <div className="ap-create">
      <div className="ap-create-head">
        <button type="button" className="ap-back" onClick={() => setView(backView)}>
          <Svg d={IC.back} size={18} />
        </button>
        <h2>上传新的创作</h2>
      </div>

      <div className="ap-form">
        <label className="ap-label">应用名称<i>*</i></label>
        <div className="ap-field">
          <input maxLength={10} placeholder="请输入" value={fName} onChange={(e) => setFName(e.target.value)} />
          <span className="ap-count">{fName.length}/10</span>
        </div>

        <label className="ap-label">应用简述</label>
        <div className="ap-field area">
          <textarea maxLength={80} placeholder="请输入" value={fDesc} onChange={(e) => setFDesc(e.target.value)} />
          <span className="ap-count">{fDesc.length}/80</span>
        </div>

        <label className="ap-label">应用图标<i>*</i></label>
        <button
          type="button"
          className="ap-upload icon"
          onClick={() => setFIcon((cur) => ICON_PRESETS[(ICON_PRESETS.indexOf(cur as IconSpec) + 1) % ICON_PRESETS.length] ?? ICON_PRESETS[0])}
        >
          {fIcon ? <Logo icon={fIcon} size={96} /> : (<><Svg d={IC.plus} size={20} /><span>上传图片</span></>)}
        </button>
        <div className="ap-hint-line">
          <span className="ap-hint">支持.jpg .png .webp格式</span>
          <button type="button" className="ap-link" onClick={() => { setFIcon(ICON_PRESETS[Math.floor(Math.random() * ICON_PRESETS.length)]); setToast('已为你一键生成图标'); }}>
            没有灵感？点击一键生成
          </button>
        </div>

        <label className="ap-label">应用主图<i>*</i></label>
        <div className="ap-main-grid">
          {fPreviews.map((p, i) => <PreviewCard key={i} p={p} />)}
          {fPreviews.length < 9 && (
            <button type="button" className="ap-upload main" onClick={() => setFPreviews((v) => [...v, PREVIEW_PRESETS[v.length % PREVIEW_PRESETS.length]])}>
              <Svg d={IC.plus} size={20} />
              <span>上传图片</span>
            </button>
          )}
        </div>
        <span className="ap-hint">至少上传一张图片，最多可上传9张，建议图片比例 16:9</span>

        <label className="ap-label">应用分类<i>*</i></label>
        <div className="ap-cat-line">
          <BubbleSelect
            className="ap-cat-select"
            options={cats}
            value={fCat}
            onChange={setFCat}
          />
          <button type="button" className="ap-cat-manage" onClick={openCatDrawer}>类目管理</button>
        </div>

        <label className="ap-label">应用标签</label>
        <div className="ap-tag-line">
          <button type="button" className="ap-tag-add" onClick={() => setTagPop((v) => !v)}>
            <Svg d={IC.plus} size={12} />
            标签
          </button>
          {fTags.map((t) => (
            <span key={t} className="ap-tag">
              {t}
              <button type="button" onClick={() => setFTags((v) => v.filter((x) => x !== t))}>×</button>
            </span>
          ))}
        </div>
        {tagPop && (
          <div className="ap-tag-pop">
            <div className="ap-tag-pop-list">
              {formTagOptions.filter((t) => !fTags.includes(t)).map((t) => (
                <button type="button" key={t} className="ap-tag-opt" onClick={() => setFTags((v) => [...v, t])}>
                  {t}
                  {(catTagUsage.get(t) ?? 0) > 0 && <i>×{catTagUsage.get(t)}</i>}
                </button>
              ))}
              {formTagOptions.filter((t) => !fTags.includes(t)).length === 0 && (
                <span className="ap-tag-empty">暂无可用标签，可在下方新建</span>
              )}
            </div>
            <div className="ap-tag-pop-add">
              <input
                placeholder="新建标签"
                value={tagNew}
                onChange={(e) => setTagNew(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') createTag(); }}
              />
              <button type="button" className="ap-btn-blue" onClick={createTag}>新建</button>
            </div>
          </div>
        )}

        <div className="ap-form-foot">
          <button type="button" className="ap-btn-plain" onClick={() => setView(backView)}>返 回</button>
          <button type="button" className="ap-btn-blue" onClick={submitCreate}>下一步</button>
        </div>
      </div>
    </div>
  );

  const deleteApp = deleteId ? apps.find((a) => a.id === deleteId) : null;
  const menuApp = menu ? apps.find((a) => a.id === menu.id) : null;

  return (
    <div className="ap-page">
      <aside className="ap-side">
        <div className="ap-search">
          <Svg d={IC.search} size={14} />
          <input
            placeholder="搜索"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setView({ kind: 'list' }); }}
          />
          {search && (
            <button type="button" className="ap-search-clear" onClick={() => setSearch('')}>
              <Svg d={IC.clear} size={12} />
            </button>
          )}
        </div>
        <nav className="ap-cats">
          <button
            type="button"
            className={view.kind === 'home' ? 'on' : ''}
            onClick={() => setView({ kind: 'home' })}
          >
            <Svg d={IC.home} size={15} className="ap-cat-ic" />
            首页
          </button>
          <div className="ap-side-div" />
          <button
            type="button"
            className={`${!category && !search && view.kind === 'list' ? 'on' : ''}`}
            onClick={() => { setCategory(null); setSearch(''); setView({ kind: 'list' }); }}
          >
            <Svg d={IC.all} size={15} className="ap-cat-ic" />
            全部
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              className={`${category === c && !search ? 'on' : ''}`}
              onClick={() => { setCategory(category === c ? null : c); setSearch(''); setView({ kind: 'list' }); }}
            >
              <Svg d={IC.cat} size={15} className="ap-cat-ic" />
              {c}
            </button>
          ))}
        </nav>
        <button type="button" className={`ap-side-user${mineActive ? ' on' : ''}`} onClick={() => setView({ kind: 'mine' })} title="我的应用">
          <span className="ap-avatar" />
          七妮妮
        </button>
      </aside>

      <main className="ap-main">
        {view.kind === 'home' && renderHome()}
        {view.kind === 'list' && renderList()}
        {view.kind === 'detail' && renderDetail()}
        {view.kind === 'mine' && renderMine()}
        {view.kind === 'create' && renderCreate()}
      </main>

      {toast && <div className="ap-toast">{toast}</div>}

      {menu && menuApp && createPortal(
        <>
          <div className="ap-menu-mask" onClick={() => setMenu(null)} />
          <div className="ap-menu" style={{ left: menu.x, top: menu.y }}>
            {view.kind === 'mine' && mineTab === 'added' ? (
              <>
                <button type="button" onClick={() => { setMenu(null); setToast('已添加到首页'); }}>添加到首页</button>
                <button type="button" className="danger" onClick={() => { setMenu(null); removeAdded(menuApp.id); }}>移除应用</button>
              </>
            ) : view.kind === 'mine' ? (
              <>
                <button type="button" onClick={() => { setMenu(null); openCreate(menuApp.id); }}>编辑应用</button>
                <button type="button" onClick={() => { setMenu(null); setToast('权限管理：演示'); }}>权限管理</button>
                <button type="button" className="danger" onClick={() => { setMenu(null); setDeleteId(menuApp.id); }}>删除应用</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setMenu(null); act(menuApp); }}>打开</button>
                <button type="button" onClick={() => { setMenu(null); setToast('权限管理：演示'); }}>权限管理</button>
                <button type="button" onClick={() => { setMenu(null); openCreate(menuApp.id); }}>编辑应用</button>
              </>
            )}
          </div>
        </>,
        document.body,
      )}

      {catDrawer && createPortal(
        <>
          <div className="ap-drawer-mask" onClick={() => setCatDrawer(false)} />
          <div className="ap-drawer">
            <div className="ap-drawer-head">
              <span>管理类目</span>
              <button type="button" onClick={() => setCatDrawer(false)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-drawer-body">
              {draft.map((c, i) => (
                <div
                  key={i}
                  className={`ap-cat-row${dragIdx === i ? ' dragging' : ''}`}
                  draggable={editIdx !== i}
                  onDragStart={() => setDragIdx(i)}
                  onDragEnter={() => {
                    if (dragIdx === null || dragIdx === i) return;
                    setDraft((v) => {
                      const n = [...v];
                      const [m] = n.splice(dragIdx, 1);
                      n.splice(i, 0, m);
                      return n;
                    });
                    if (editIdx === dragIdx) setEditIdx(i);
                    else if (editIdx === i) setEditIdx(dragIdx);
                    setDragIdx(i);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={() => setDragIdx(null)}
                >
                  {editIdx === i ? (
                    <>
                      <input
                        className="ap-cat-edit-input"
                        autoFocus
                        placeholder="请输入类目名称"
                        value={editVal}
                        onChange={(e) => setEditVal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmEdit(i); }}
                      />
                      <button type="button" className="ap-cat-ic-btn" title="确定" onClick={() => confirmEdit(i)}>
                        <Svg d={IC.check} size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="ap-cat-name">{c}</span>
                      <button type="button" className="ap-cat-ic-btn" title="修改" onClick={() => { setEditIdx(i); setEditVal(c); }}>
                        <Svg d={IC.edit} size={15} />
                      </button>
                      <button type="button" className="ap-cat-ic-btn danger" title="删除" onClick={() => removeCat(i)}>
                        <Svg d={IC.trash} size={15} />
                      </button>
                    </>
                  )}
                </div>
              ))}
              <button type="button" className="ap-cat-new" onClick={addCatRow}>+ 新建分类</button>
            </div>
            <div className="ap-drawer-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setCatDrawer(false)}>取 消</button>
              <button type="button" className="ap-btn-blue" onClick={saveCats}>保 存</button>
            </div>
          </div>
        </>,
        document.body,
      )}

      {deleteApp && (
        <div className="ap-mask">
          <div className="ap-modal">
            <div className="ap-modal-head">
              <span>删除应用</span>
              <button type="button" onClick={() => setDeleteId(null)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-modal-body">
              应用删除后，使用记录及关联数据将全部丢失，请谨慎操作，是否确认删除该应用？
            </div>
            <div className="ap-modal-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setDeleteId(null)}>取 消</button>
              <button type="button" className="ap-btn-blue" onClick={confirmDelete}>确 定</button>
            </div>
          </div>
        </div>
      )}

      {noticeId && (() => {
        const n = PLATFORM_NOTICES.find((x) => x.id === noticeId);
        if (!n) return null;
        return (
          <div className="ap-mask">
            <div className="ap-modal">
              <div className="ap-modal-head">
                <span>{n.title}</span>
                <button type="button" onClick={() => setNoticeId(null)}><Svg d={IC.clear} size={14} /></button>
              </div>
              <div className="ap-modal-body ap-notice-body">
                <i>{n.date} · {n.tag}</i>
                <p>{n.content}</p>
              </div>
              <div className="ap-modal-foot">
                <button type="button" className="ap-btn-blue" onClick={() => setNoticeId(null)}>我知道了</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
