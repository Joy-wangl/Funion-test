import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import BubbleSelect from '../../components/BubbleSelect';
import {
  CATEGORIES, FORM_CATEGORIES, ICON_PRESETS, PREVIEW_PRESETS, TAG_PRESETS,
  actKind, initialApps, type AppItem, type IconSpec, type Preview,
} from './data';
import './AppCenter.css';

type View =
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
  const [view, setView] = useState<View>({ kind: 'list' });
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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

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
    }
    return list;
  }, [apps, search, category, sortKey, sortDesc]);

  const detailApp = view.kind === 'detail' ? apps.find((a) => a.id === view.id) ?? null : null;

  const patchApp = (id: string, patch: Partial<AppItem>) =>
    setApps((v) => v.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  /* 添加/更新：加载后落库；我创建的无添加操作，直接打开 */
  const act = (app: AppItem) => {
    const kind = actKind(app);
    if (kind === 'open') {
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

  /* ---------- 列表/我的应用共用行：caret=打开+展开（我的应用行/列表我创建的）；其余=添加/更新/打开；主图仅详情展示 ---------- */
  const renderCell = (app: AppItem, caret: boolean) => (
    <div key={app.id} className="ap-cell" onClick={() => setView({ kind: 'detail', id: app.id })}>
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
        <button type="button" className="ap-back" onClick={() => setView({ kind: 'list' })}>
          <Svg d={IC.back} size={18} />
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
            options={['新建类目', ...FORM_CATEGORIES]}
            value={fCat}
            onChange={(v) => {
              if (v === '新建类目') { setToast('新建类目：演示'); return; }
              setFCat(v);
            }}
          />
          <button type="button" className="ap-cat-manage" onClick={() => setToast('类目管理：演示')}>类目管理</button>
        </div>

        <label className="ap-label">应用标签</label>
        <div className="ap-tag-line">
          <button
            type="button"
            className="ap-tag-add"
            onClick={() => setFTags((v) => {
              const next = TAG_PRESETS.find((t) => !v.includes(t));
              return next ? [...v, next] : v;
            })}
          >
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
    </div>
  );
}
