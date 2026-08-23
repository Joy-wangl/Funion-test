import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BubbleSelect from '../../components/BubbleSelect';
import {
  CATEGORIES, FORM_CATEGORIES, ICON_PRESETS, PLATFORM_NOTICES, PREVIEW_PRESETS, RANK_RANGES,
  FB_TYPES, INITIAL_FEEDBACKS, INITIAL_TAG_DEFS, TAG_COLOR_PRESETS,
  APP_TYPES, PERM_SCOPES, demoFileName,
  actKind, creatorDept, initialApps, seedReviews, usageInRange, versionOf,
  type AppItem, type AppReview, type FeedbackItem, type IconSpec, type Preview, type TagDef,
} from './data';
import './AppCenter.css';
import AppDashboard from './Dashboard';

type View =
  | { kind: 'home' }
  | { kind: 'list' }
  | { kind: 'detail'; id: string }
  | { kind: 'mine' }
  | { kind: 'dash' }
  | { kind: 'create'; editId?: string };

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
};

/* 评论时间：x 天前 / x 个月前 / x 年前 */
const agoText = (date: string): string => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date.replace(/\//g, '-')).getTime()) / 86400000));
  if (days < 1) return '今天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
};

/* 新功能/更新内容拆条（一次只发一条，按逗号拆成多条变更点） */
const featLinesOf = (a: AppItem): string[] => {
  const lines = (a.releaseNote ?? '性能优化与体验改进。').split(/[，,、]/).map((s) => s.trim()).filter(Boolean);
  return lines.length ? lines : ['性能优化与体验改进。'];
};

/* ---------- 小图标 ---------- */
const Svg = ({ d, size = 14, className = '', filled = false }: { d: string; size?: number; className?: string; filled?: boolean }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth={filled ? 0 : 2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const IC = {
  search: 'M11 4a7 7 0 110 14 7 7 0 010-14zm9 16l-4.35-4.35',
  clear: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  caret: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  sort: 'M8 5v14M8 5L5 8m3-3l3 3m8 11V5m0 14l-3-3m3 3l3-3',
  cat: 'M4 5h16v14H4V5zm0 4h16M9 9v10',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z',
  check: 'M20 6L9 17l-5-5',
  home: 'M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  all: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  /* 类目专属图标（iconfont 风格内联） */
  db: 'M12 3c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3zM4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3',
  plug: 'M9 3v5m6-5v5M6 8h12v3a6 6 0 01-6 6 6 6 0 01-6-6V8zm6 9v4',
  pen: 'M17 3l4 4L8 20l-5 1 1-5L17 3z',
  tool: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  robot: 'M12 2v3M9 5h6a5 5 0 015 5v5a5 5 0 01-5 5H9a5 5 0 01-5-5v-5a5 5 0 015-5zM9.5 12.5h.01M14.5 12.5h.01M10 16h4',
  star: 'M12 3l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45L2.6 9.85l6.5-.95L12 3z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  trophy: 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 01-10 0V4zm0 1H4v2a3 3 0 003 3m10-5h3v2a3 3 0 01-3 3',
  clock: 'M12 3a9 9 0 109 9 9 9 0 00-9-9zm0 4v5l3 2',
  flame: 'M12 3s5 4.5 5 9a5 5 0 01-10 0c0-4.5 5-9 5-9zm0 8s-2 1.8-2 3.5a2 2 0 004 0c0-1.7-2-3.5-2-3.5z',
  mail: 'M4 6h16v12H4V6zm0 2l8 6 8-6',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
};

/* 类目 → 专属图标映射 */
const CAT_ICONS: Record<string, string> = {
  数据管理类: IC.db,
  浏览器插件: IC.plug,
  绘图工具: IC.pen,
  实用小工具: IC.tool,
  Agent工具: IC.robot,
};

/* 类目图标库：iconfont 风格内联图形 + 支持上传自定义 */
const ICON_LIB: { k: string; d: string }[] = [
  { k: 'folder', d: IC.folder }, { k: 'home', d: IC.home }, { k: 'all', d: IC.all }, { k: 'db', d: IC.db },
  { k: 'plug', d: IC.plug }, { k: 'pen', d: IC.pen }, { k: 'tool', d: IC.tool }, { k: 'robot', d: IC.robot },
  { k: 'star', d: IC.star }, { k: 'bell', d: IC.bell }, { k: 'trophy', d: IC.trophy }, { k: 'clock', d: IC.clock },
  { k: 'flame', d: IC.flame }, { k: 'mail', d: IC.mail },
];
const GLYPHS: Record<string, string> = Object.fromEntries(ICON_LIB.map((g) => [g.k, g.d]));
const isImgIcon = (s: string) => s.startsWith('data:') || s.startsWith('/');
type CatDraft = { n: string; ic: string };

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
  const [rankOpen, setRankOpen] = useState<string | null>(null);
  const [fbType, setFbType] = useState(FB_TYPES[0]);
  const [fbText, setFbText] = useState('');
  const [fbList, setFbList] = useState<FeedbackItem[]>(INITIAL_FEEDBACKS);
  const [fbCreate, setFbCreate] = useState(false);
  const [fbDetailId, setFbDetailId] = useState<string | null>(null);
  const [fbNote, setFbNote] = useState('');
  const [fbFilter, setFbFilter] = useState<'all' | 'pending' | 'replied'>('all');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [mineTab, setMineTab] = useState<'created' | 'added'>('created');
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updateId, setUpdateId] = useState<string | null>(null);
  /* 评分及评论 */
  const [reviews, setReviews] = useState<AppReview[]>(seedReviews);
  const [revAllId, setRevAllId] = useState<string | null>(null);
  const [verHistId, setVerHistId] = useState<string | null>(null);
  const [msgOpen, setMsgOpen] = useState(false);
  const [msgTab, setMsgTab] = useState<'app' | 'sys'>('app');
  const [msgAppFilter, setMsgAppFilter] = useState('all');
  const [msgFbType, setMsgFbType] = useState('all');
  const [msgStatus, setMsgStatus] = useState<'all' | 'pending' | 'done'>('all');
  const [rvReplyId, setRvReplyId] = useState<string | null>(null);
  const [rvReplyText, setRvReplyText] = useState('');
  const [fbReplyId, setFbReplyId] = useState<string | null>(null);
  const [fbReplyText, setFbReplyText] = useState('');
  const [devDrawerId, setDevDrawerId] = useState<string | null>(null);
  const [rvStars, setRvStars] = useState(0);
  const [rvTitle, setRvTitle] = useState('');
  const [rvText, setRvText] = useState('');
  const [rvOpen, setRvOpen] = useState(false);
  const [rvImages, setRvImages] = useState<string[]>([]);
  /* 评价横滑条：超出展示区域的左右滚动交互 */
  const revStripRef = useRef<HTMLDivElement | null>(null);
  const [revNav, setRevNav] = useState({ l: false, r: false });
  const updateRevNav = () => {
    const el = revStripRef.current;
    if (!el) { setRevNav({ l: false, r: false }); return; }
    setRevNav({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  };
  useEffect(() => {
    const t = requestAnimationFrame(updateRevNav);
    return () => cancelAnimationFrame(t);
  }, [view, reviews]);
  const [toast, setToast] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [backView, setBackView] = useState<View>({ kind: 'mine' });

  /* 新建第二步：类型/部署/文件/版本/发布方式/权限 */
  const [step, setStep] = useState<1 | 2>(1);
  const [fType, setFType] = useState('');
  const [fDeploy, setFDeploy] = useState<'link' | 'file'>('file');
  const [fLink, setFLink] = useState('');
  const [fFile, setFFile] = useState('');
  const [fRun, setFRun] = useState('');
  const [fVersion, setFVersion] = useState('');
  const [fPublish, setFPublish] = useState<'online' | 'test'>('test');
  const [fPerm, setFPerm] = useState('所有人');
  const [permPop, setPermPop] = useState(false);

  /* 上传新创作表单 */
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [fIcon, setFIcon] = useState<IconSpec | null>(null);
  const [fPreviews, setFPreviews] = useState<Preview[]>([]);
  const [fCat, setFCat] = useState('Agent');
  const [fNote, setFNote] = useState('');
  const [fTags, setFTags] = useState<string[]>([]);
  const [tagDefs, setTagDefs] = useState<TagDef[]>(INITIAL_TAG_DEFS);
  const [tagPop, setTagPop] = useState(false);
  const [tagModal, setTagModal] = useState(false);
  const [tmName, setTmName] = useState('');
  const [tmColor, setTmColor] = useState(TAG_COLOR_PRESETS[0]);

  /* 类目管理抽屉（草稿态：新增/修改/删除/拖动排序，保存生效） */
  const [cats, setCats] = useState<string[]>(FORM_CATEGORIES);
  const [catIcons, setCatIcons] = useState<Record<string, string>>({});
  const [catDrawer, setCatDrawer] = useState(false);
  const [draft, setDraft] = useState<CatDraft[]>([]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState('');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [pickIdx, setPickIdx] = useState<number | null>(null);

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

  /* 切换页面时重置评价表单 */
  useEffect(() => { setRvStars(0); setRvTitle(''); setRvText(''); setRvOpen(false); setRvImages([]); }, [view]);

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
    if (kind === 'update') {
      setUpdateId(app.id);
      return;
    }
    setLoadingId(app.id);
    setTimeout(() => {
      setLoadingId(null);
      patchApp(app.id, { added: true });
      setToast(`已添加「${app.name}」`);
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
    setFNote(src?.releaseNote ?? '');
    setFTags(src?.tags ?? []);
    setStep(1);
    setFType(src?.appType ?? '');
    setFDeploy(src?.deployMode ?? 'file');
    setFLink(src?.linkUrl ?? '');
    setFFile(src?.appFile ?? '');
    setFRun(src?.runFile ?? '');
    setFVersion(src?.version ?? '');
    setFPublish(src?.publishMode ?? 'test');
    setFPerm(src?.permScope ?? '所有人');
    setPermPop(false);
    setBackView(view);
    setView({ kind: 'create', editId });
  };

  const nextStep = () => {
    if (!fName.trim()) { setToast('请输入应用名称'); return; }
    if (!fIcon) { setToast('请上传应用图标'); return; }
    if (fPreviews.length === 0) { setToast('请至少上传一张应用主图'); return; }
    setStep(2);
  };

  const submitCreate = () => {
    if (!fIcon) { setToast('请上传应用图标'); return; }
    if (!fType) { setToast('请选择应用类型'); return; }
    if (fType === 'Web应用' && fDeploy === 'link' && !fLink.trim()) { setToast('请输入外部链接地址'); return; }
    if ((fType === 'Web应用' && fDeploy === 'file') || fType === 'EXE程序' || fType === '浏览器插件') {
      if (!fFile) { setToast('请上传应用文件'); return; }
    }
    if (fType === 'EXE程序' && !fRun) { setToast('请选择运行文件'); return; }
    if (!fVersion.trim()) { setToast('请输入版本号'); return; }
    const extra = {
      appType: fType,
      deployMode: fType === 'Web应用' ? fDeploy : undefined,
      linkUrl: fType === 'Web应用' && fDeploy === 'link' ? fLink.trim() : undefined,
      appFile: fFile || undefined,
      runFile: fType === 'EXE程序' ? fRun : undefined,
      publishMode: fPublish,
      permScope: fPublish === 'online' ? fPerm : undefined,
      version: fVersion.trim(),
    };
    if (view.kind === 'create' && view.editId) {
      const target = apps.find((a) => a.id === view.editId);
      patchApp(view.editId, {
        name: fName.trim(), desc: fDesc.trim(), icon: fIcon, previews: fPreviews, category: fCat, tags: fTags,
        releaseNote: fNote.trim() || undefined, release: today(), hasUpdate: true,
        prevVersion: target?.hasUpdate ? target.prevVersion : target ? versionOf(target) : undefined, ...extra,
      });
      setToast('应用已更新，首页「应用上新」将展示本次更新');
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
        releaseNote: fNote.trim() || undefined,
        ...extra,
      };
      setApps((v) => [app, ...v]);
      setToast(fPublish === 'test' ? '创作已提交（发布测试）' : '创作已上传');
    }
    if (!(view.kind === 'create' && view.editId)) setMineTab('created');
    setView(backView);
  };

  /* ---------- 类目管理：新增/修改/删除/拖动排序 ---------- */
  const openCatDrawer = () => {
    setDraft(cats.map((n) => ({ n, ic: catIcons[n] ?? 'folder' })));
    setEditIdx(null);
    setEditVal('');
    setPickIdx(null);
    setCatDrawer(true);
  };

  const confirmEdit = (i: number) => {
    const name = editVal.trim();
    if (!name) { setToast('请输入类目名称'); return; }
    setDraft((v) => v.map((c, idx) => (idx === i ? { ...c, n: name } : c)));
    setEditIdx(null);
  };

  const addCatRow = () => {
    if (editIdx !== null) { setToast('请先完成当前编辑'); return; }
    setDraft((v) => [...v, { n: '', ic: 'folder' }]);
    setEditIdx(draft.length);
    setEditVal('');
  };

  const removeCat = (i: number) => {
    setDraft((v) => v.filter((_, idx) => idx !== i));
    if (editIdx === i) setEditIdx(null);
    else if (editIdx !== null && editIdx > i) setEditIdx(editIdx - 1);
  };

  const saveCats = () => {
    const rows = editIdx !== null ? draft.map((c, idx) => (idx === editIdx ? { ...c, n: editVal.trim() } : c)) : draft;
    const names = rows.map((r) => r.n);
    if (names.some((n) => !n)) { setToast('类目名称不能为空'); return; }
    if (new Set(names).size !== names.length) { setToast('类目名称重复'); return; }
    setCats(names);
    setCatIcons(Object.fromEntries(rows.map((r) => [r.n, r.ic])));
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
    tagDefs.forEach((d) => { if (!set.has(d.name)) set.set(d.name, 0); });
    return [...set.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [catTagUsage, tagDefs]);
  
  const tagColor = (name: string) => tagDefs.find((d) => d.name === name)?.color ?? '#8a91a0';
  
  /* 新建标签弹窗：名称 + 拾色器，确认后入库并选中 */
  const confirmNewTag = () => {
    const name = tmName.trim();
    if (!name) { setToast('请输入标签名称'); return; }
    if (tagDefs.some((d) => d.name === name)) { setToast('标签已存在'); return; }
    setTagDefs((v) => [...v, { name, color: tmColor }]);
    setFTags((v) => (v.includes(name) ? v : [...v, name]));
    setTagModal(false);
    setTmName('');
    setTmColor(TAG_COLOR_PRESETS[0]);
  };

  /* ---------- 列表/我的应用共用行：caret=打开+展开（我的应用行/列表我创建的）；其余=添加/更新/打开；主图仅详情展示 ---------- */
  const renderCell = (app: AppItem, caret: boolean) => (
    <div key={app.id} className="ap-cell" onClick={() => openDetail(app.id)}>
      <div className="ap-card-top">
        <Logo icon={app.icon} />
        <span className="ap-row-name">{app.name}{app.publishMode === 'test' && <i className="ap-badge-test">测试中</i>}</span>
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
      <div className="ap-card-bottom">
        <span className="ap-row-desc">{app.desc}</span>
        <button
          type="button"
          className={`ap-fav${favIds.includes(app.id) ? ' on' : ''}`}
          title={favIds.includes(app.id) ? '取消收藏' : '收藏'}
          onClick={(e) => { e.stopPropagation(); toggleFav(app.id); }}
        >
          <Svg d={IC.star} size={16} filled />
        </button>
      </div>
    </div>
  );

  /* ---------- 首页 ---------- */
  /* ---------- 意见反馈：新建 / 补充 / 模拟官方回复 ---------- */
  const fmtNow = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };
  const scheduleAdminReply = (id: string) => {
    window.setTimeout(() => {
      setFbList((v) => v.map((f) => (f.id === id ? {
        ...f,
        msgs: [...f.msgs, { id: `${id}-r${Date.now()}`, role: 'admin' as const, by: '应用市场管理员', at: fmtNow(), content: '已收到你的反馈，我们会尽快跟进处理并在此回复，感谢支持！' }],
      } : f)));
      setToast('收到一条官方回复');
    }, 4000);
  };
  const submitFb = () => {
    const text = fbText.trim();
    if (!text) { setToast('请先填写反馈内容'); return; }
    const id = `fb-${Date.now()}`;
    setFbList((v) => [{ id, type: fbType, at: fmtNow(), read: false, msgs: [{ id: `${id}-m1`, role: 'user' as const, by: '七妮妮', at: fmtNow(), content: text }] }, ...v]);
    setFbText('');
    setFbCreate(false);
    setToast('反馈已提交');
    scheduleAdminReply(id);
  };
  const appendFbNote = (id: string) => {
    const text = fbNote.trim();
    if (!text) { setToast('请先填写补充内容'); return; }
    setFbList((v) => v.map((f) => (f.id === id ? {
      ...f,
      msgs: [...f.msgs, { id: `${id}-m${Date.now()}`, role: 'user' as const, by: '七妮妮', at: fmtNow(), content: text }],
    } : f)));
    setFbNote('');
    setToast('补充已提交');
    scheduleAdminReply(id);
  };

  /* ---------- 消息中心：身份/维度/已读未读 ---------- */
  const myReviews = reviews.filter((r) => apps.some((a) => a.id === r.appId && a.mine));
  const unreadReviewCount = myReviews.filter((r) => r.read === false).length;
  const unreadFbCount = fbList.filter((f) => f.read === false).length;
  const msgCount = unreadReviewCount + unreadFbCount;
  const railApps = apps.filter((a) => a.mine && myReviews.some((r) => r.appId === a.id));
  const shownReviews = (msgAppFilter === 'all' ? myReviews : myReviews.filter((r) => r.appId === msgAppFilter))
    .filter((r) => msgStatus === 'all' || (msgStatus === 'pending' ? !r.reply : !!r.reply));
  const shownFb = (msgFbType === 'all' ? fbList : fbList.filter((f) => f.type === msgFbType))
    .filter((f) => msgStatus === 'all' || (msgStatus === 'pending' ? f.msgs[f.msgs.length - 1].role === 'user' : f.msgs[f.msgs.length - 1].role === 'admin'));

  const markRevRead = (id: string) => setReviews((v) => v.map((r) => (r.id === id ? { ...r, read: true } : r)));
  const markFbRead = (id: string) => setFbList((v) => v.map((f) => (f.id === id ? { ...f, read: true } : f)));
  const markAllRead = () => {
    if (msgTab === 'app') {
      const ids = new Set(myReviews.map((r) => r.id));
      setReviews((v) => v.map((r) => (ids.has(r.id) ? { ...r, read: true } : r)));
    } else {
      setFbList((v) => v.map((f) => ({ ...f, read: true })));
    }
    setToast('已全部标记为已读');
  };

  /* 应用渠道：创作者回复自己应用上的用户评价 */
  const replyReview = (id: string) => {
    const text = rvReplyText.trim();
    if (!text) { setToast('请先填写回复内容'); return; }
    setReviews((v) => v.map((r) => (r.id === id ? { ...r, reply: { text, date: today() } } : r)));
    setRvReplyId(null); setRvReplyText('');
    setToast('回复已提交');
  };

  /* 系统开发者：以应用市场管理员身份回复意见反馈 */
  const replyFb = (id: string) => {
    const text = fbReplyText.trim();
    if (!text) { setToast('请先填写回复内容'); return; }
    setFbList((v) => v.map((f) => (f.id === id ? {
      ...f,
      msgs: [...f.msgs, { id: `${id}-m${Date.now()}`, role: 'admin' as const, by: '应用市场管理员', at: fmtNow(), content: text }],
    } : f)));
    setFbReplyId(null); setFbReplyText('');
    setToast('回复已提交');
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
    /* 贡献榜时间维度：个人/部门榜仅统计范围内上架的创作 */
    const rangeDays = rankRange === '近7天' ? 7 : rankRange === '近30天' ? 30 : 0;
    const rangedApps = rangeDays === 0 ? apps : apps.filter((a) => now - new Date(a.release).getTime() <= rangeDays * 86400000);
    const personMap = new Map<string, number>();
    rangedApps.forEach((a) => personMap.set(a.creator, (personMap.get(a.creator) ?? 0) + 1));
    const personRank = [...personMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const deptMap = new Map<string, number>();
    rangedApps.forEach((a) => {
      const d = creatorDept(a.creator);
      deptMap.set(d, (deptMap.get(d) ?? 0) + 1);
    });
    const deptRank = [...deptMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const personUsers = new Map<string, number>();
    rangedApps.forEach((a) => personUsers.set(a.creator, (personUsers.get(a.creator) ?? 0) + usageInRange(a, rankRange)));
    const deptUsers = new Map<string, number>();
    rangedApps.forEach((a) => {
      const d = creatorDept(a.creator);
      deptUsers.set(d, (deptUsers.get(d) ?? 0) + usageInRange(a, rankRange));
    });
    const deptCreators = new Map<string, Set<string>>();
    rangedApps.forEach((a) => {
      const d = creatorDept(a.creator);
      if (!deptCreators.has(d)) deptCreators.set(d, new Set());
      deptCreators.get(d)?.add(a.creator);
    });
    const bestApps = [...apps].sort((a, b) => usageInRange(b, rankRange) - usageInRange(a, rankRange)).slice(0, 10);
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
                    {a.releaseNote && <i className="ap-rel-note">{a.releaseNote}</i>}
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
            <div className="ap-empty">还没有收藏的应用，在应用列表行内点击星标即可收藏</div>
          ) : (
            <div className="ap-grid">{favApps.map((app) => renderCell(app, app.mine))}</div>
          )}
        </section>

        <section className="ap-home-card">
          <h3 className="ap-home-title"><Svg d={IC.clock} size={18} />最近使用</h3>
          {recentApps.length === 0 ? (
            <div className="ap-empty">暂无最近使用的应用，点击应用的「打开」后会自动记录在这里</div>
          ) : (
            <div className="ap-grid">{recentApps.map(({ app }) => renderCell(app, app.mine))}</div>
          )}
        </section>

        <div className="ap-home-rank-row">
        <section className="ap-home-card">
          <div className="ap-rank-head">
            <h3 className="ap-home-title"><Svg d={IC.trophy} size={18} />贡献榜</h3>
            <button type="button" className="ap-link" onClick={() => setView({ kind: 'dash' })}>全部数据</button>
          </div>
          <div className="ap-rank-bar">
            <div className="ap-rank-tabs">
              {([['person', '个人贡献榜'], ['dept', '部门贡献榜'], ['best', '最佳应用榜']] as const).map(([k, label]) => (
                <button key={k} type="button" className={rankTab === k ? 'on' : ''} onClick={() => setRankTab(k)}>{label}</button>
              ))}
            </div>
            <BubbleSelect options={RANK_RANGES} value={rankRange} onChange={setRankRange} />
          </div>
          <div className="ap-rank-list">
            {rankTab === 'person' && (personRank.length === 0 ? (
              <div className="ap-empty">该时间范围内暂无创作数据</div>
            ) : personRank.map(([name, n], i) => {
              const created = apps.filter((a) => a.creator === name).sort((a, b) => b.users - a.users);
              const open = rankOpen === name;
              return (
                <div key={name} className="ap-rank-person">
                  <button type="button" className="ap-rank-row" onClick={() => setRankOpen(open ? null : name)}>
                    <b className={i < 3 ? `no${i + 1}` : ''}>{i + 1}</b>
                    <span className="ap-rank-name">{name}<i>{creatorDept(name)}</i></span>
                    <em>{n} 个创作 · {personUsers.get(name) ?? 0} 人使用</em>
                    <Svg d={IC.caret} size={14} className={`ap-rank-caret${open ? ' open' : ''}`} />
                  </button>
                  {open && (
                    <div className="ap-rank-apps">
                      {created.map((a) => (
                        <button key={a.id} type="button" className="ap-rank-app" onClick={() => openDetail(a.id)}>
                          <Logo icon={a.icon} size={18} />
                          <span>{a.name}</span>
                          <i>{a.users} 人</i>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            }))}
            {rankTab === 'dept' && (deptRank.length === 0 ? (
              <div className="ap-empty">该时间范围内暂无创作数据</div>
            ) : deptRank.map(([name, n], i) => (
              <div key={name} className="ap-rank-row">
                <b className={i < 3 ? `no${i + 1}` : ''}>{i + 1}</b>
                <span className="ap-rank-name">{name}<i>{deptCreators.get(name)?.size ?? 0} 位创作者</i></span>
                <em>{n} 次创作 · {deptUsers.get(name) ?? 0} 人使用</em>
              </div>
            )))}
            {rankTab === 'best' && bestApps.map((a, i) => (
              <button type="button" key={a.id} className="ap-rank-row" onClick={() => openDetail(a.id)}>
                <b className={i < 3 ? `no${i + 1}` : ''}>{i + 1}</b>
                <Logo icon={a.icon} size={32} />
                <span className="ap-rank-name">{a.name}<i>{a.creator} · {creatorDept(a.creator)}</i></span>
                <em>{usageInRange(a, rankRange)} 人次</em>
              </button>
            ))}
          </div>
        </section>

        <section className="ap-home-card ap-fb-card">
          <div className="ap-fb-head">
            <h3 className="ap-home-title"><Svg d={IC.mail} size={18} />意见反馈</h3>
          </div>
          <div className="ap-fb-bar">
            <div className="ap-fb-tabs">
              {([['all', '全部'], ['pending', '待回复'], ['replied', '已回复']] as const).map(([k, label]) => (
                <button key={k} type="button" className={fbFilter === k ? 'on' : ''} onClick={() => setFbFilter(k)}>{label}</button>
              ))}
            </div>
            <button type="button" className="ap-btn-blue" onClick={() => { setFbText(''); setFbCreate(true); }}>新建反馈</button>
          </div>
          <div className="ap-fb-list">
            {fbList.filter((f) => {
              const replied = f.msgs.some((m) => m.role === 'admin');
              return fbFilter === 'all' || (fbFilter === 'replied') === replied;
            }).map((f) => {
              const replies = f.msgs.filter((m) => m.role === 'admin').length;
              return (
                <button key={f.id} type="button" className="ap-fb-item" onClick={() => { setFbNote(''); setFbDetailId(f.id); }}>
                  <div className="ap-fb-item-head">
                    <em className={`ap-fb-type${f.type === '问题反馈' ? ' bug' : f.type === '体验优化' ? ' ux' : ''}`}>{f.type}</em>
                    <b className={replies > 0 ? 'st-done' : 'st-pending'}>{replies > 0 ? '已回复' : '待回复'}</b>
                  </div>
                  <p>{f.msgs[0].content}</p>
                  <div className="ap-fb-item-foot">
                    <i>{f.at}</i>
                    <span className="ap-fb-replies"><Svg d={IC.mail} size={12} />{replies} 条回复</span>
                    <Svg d={IC.caret} size={12} className="ap-fb-go" />
                  </div>
                </button>
              );
            })}
            {fbList.filter((f) => {
              const replied = f.msgs.some((m) => m.role === 'admin');
              return fbFilter === 'all' || (fbFilter === 'replied') === replied;
            }).length === 0 && <div className="ap-empty">该状态下暂无反馈记录</div>}
          </div>
        </section>
        </div>
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
    /* 评分及评论：平均 + 星级分布 */
    const rvs = reviews.filter((r) => r.appId === app.id);
    const rvAvg = rvs.length ? rvs.reduce((s, r) => s + r.stars, 0) / rvs.length : 0;
    const rvDist = [5, 4, 3, 2, 1].map((s) => rvs.filter((r) => r.stars === s).length);
    /* 当前用户对当前版本是否已评价（每个版本仅可评价一次） */
    const myRev = rvs.find((r) => r.user === '七妮妮' && r.version === versionOf(app));
    /* 类目使用人次排行 */
    const rank = apps.filter((a) => a.category === app.category).sort((a, b) => b.users - a.users).findIndex((a) => a.id === app.id) + 1;
    /* 开发者信息：同创作者应用 */
    const devApps = apps.filter((a) => a.creator === app.creator).sort((a, b) => b.users - a.users);
    const devUsers = devApps.reduce((s, a) => s + a.users, 0);
    /* 相关推荐：标签一致优先，不足 4 个用同类目补足，按使用人次降序 */
    const tagMatch = apps.filter((a) => a.id !== app.id && a.tags.some((t) => app.tags.includes(t)));
    const sameCat = apps.filter((a) => a.id !== app.id && a.category === app.category && !tagMatch.includes(a));
    const related = [...tagMatch, ...sameCat].sort((a, b) => b.users - a.users).slice(0, 4);
    return (
      <div className="ap-detail">
        <button type="button" className="ap-back" onClick={() => setView(detailBack)}>
          <Svg d={IC.back} size={18} />
        </button>
        <div className="ap-detail-head">
          <Logo icon={app.icon} size={78} />
          <div className="ap-detail-info">
            <h2>{app.name}{app.publishMode === 'test' && <i className="ap-badge-test">测试中</i>}</h2>
            <p>{app.desc}</p>
            <div className="ap-detail-actions">
              <button type="button" className="ap-btn-solid" onClick={() => act(app)}>
                {actKind(app) === 'add' ? '添加' : actKind(app) === 'update' ? '更新' : '打开'}
              </button>
            </div>
          </div>
          <button
            type="button"
            className={`ap-detail-fav${favIds.includes(app.id) ? ' on' : ''}`}
            title={favIds.includes(app.id) ? '取消收藏' : '收藏'}
            onClick={() => toggleFav(app.id)}
          >
            <span>收藏</span>
            <b><Svg d={IC.star} size={16} filled /></b>
          </button>
        </div>
        <div className="ap-detail-stats">
          <div className="ap-stat">
            <span>{rvs.length} 个评分</span>
            <b>{rvAvg.toFixed(1)}</b>
            <div className="ap-stat-stars">
              {[1, 2, 3, 4, 5].map((n) => <Svg key={n} d={IC.star} size={11} filled className={n <= Math.round(rvAvg) ? 'ap-star' : 'ap-star-dim'} />)}
            </div>
          </div>
          <div className="ap-stat"><span>排行榜</span><b>#{rank}</b><em>{app.category}</em></div>
          <div className="ap-stat"><span>开发者</span><b>{app.creator}</b></div>
          <div className="ap-stat"><span>使用人次</span><b>{app.users}</b></div>
          <div className="ap-stat"><span>当前版本</span><b>{versionOf(app)}</b></div>
        </div>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub">预览</h3>
        <div className="ap-detail-previews">
          {app.previews.map((p, i) => <PreviewCard key={i} p={p} />)}
        </div>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub">最新版更新内容</h3>
        <div className="ap-whatsnew">
          <div className="ap-wn-meta"><b>版本 {versionOf(app)}</b><span>{app.release}</span></div>
          <p>{app.releaseNote ?? '感谢使用！本次更新包含性能优化与体验改进。'}</p>
        </div>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub ap-sec-head">
          <span>新功能介绍</span>
          <button type="button" className="ap-link" onClick={() => setVerHistId(app.id)}>版本历史记录</button>
        </h3>
        <div className="ap-feat-entry">
          <div className="ap-feat-head">
            <b>常规</b>
            <div className="ap-feat-meta"><i>{agoText(app.release)}</i><span>版本 {versionOf(app)}</span></div>
          </div>
          <ul>{featLinesOf(app).map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub ap-sec-head">
          <span>评分及评论</span>
          {rvs.length > 0 && (
            <span className="ap-sec-acts">
              <span className="ap-rev-nav">
                <button type="button" title="上一条" disabled={!revNav.l} onClick={() => revStripRef.current?.scrollBy({ left: -480, behavior: 'smooth' })}><Svg d={IC.back} size={13} /></button>
                <button type="button" title="下一条" disabled={!revNav.r} onClick={() => revStripRef.current?.scrollBy({ left: 480, behavior: 'smooth' })}><Svg d={IC.chevR} size={13} /></button>
              </span>
              <button type="button" className="ap-link" onClick={() => setRevAllId(app.id)}>查看全部</button>
            </span>
          )}
        </h3>
        {rvs.length === 0 ? (
          <div className="ap-empty">暂无评价</div>
        ) : (
          <>
            <div className="ap-rate-top">
              <div className="ap-rate-left">
                <b>{rvAvg.toFixed(1)}</b>
                <span>满分 5 分</span>
                <i>{rvs.length} 个评分</i>
              </div>
              <div className="ap-rate-hist">
                {rvDist.map((c, i) => (
                  <div className="ap-hist-row" key={i}>
                    <Svg d={IC.star} size={10} filled className="ap-star" />
                    <div className="ap-hist-track"><div style={{ width: `${Math.round((c / rvs.length) * 100)}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="ap-rev-cards" ref={revStripRef} onScroll={updateRevNav}>
              {rvs.map((r) => (
                <div className="ap-rev-card" key={r.id}>
                  <div className="ap-rev-head">
                    <b>{r.title}</b>
                    <div className="ap-rev-meta"><i>{agoText(r.date)}</i><span>{r.user}</span><em>v{r.version}</em></div>
                  </div>
                  <div className="ap-rev-stars">
                    {[1, 2, 3, 4, 5].filter((n) => n <= r.stars).map((n) => <Svg key={n} d={IC.star} size={14} filled className="ap-star" />)}
                  </div>
                  <p>{r.text}</p>
                  {r.images && r.images.length > 0 && (
                    <div className="ap-rev-imgs">{r.images.map((src, i) => <img key={i} src={src} alt="" />)}</div>
                  )}
                  {r.reply && <div className="ap-rev-reply"><i>开发者回复</i><p>{r.reply.text}</p></div>}
                </div>
              ))}
            </div>
          </>
        )}
        {app.added ? (
          myRev ? (
            <div className="ap-rev-tip">已评价 v{myRev.version}，应用更新后可再次评价</div>
          ) : rvOpen ? (
          <div className="ap-rev-form">
            <div className="ap-rev-pick">
              <span>你的评分</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={n <= rvStars ? 'on' : ''} onClick={() => setRvStars(n)}>
                  <Svg d={IC.star} size={18} filled />
                </button>
              ))}
            </div>
            <input maxLength={20} placeholder="评论标题（选填）" value={rvTitle} onChange={(e) => setRvTitle(e.target.value)} />
            <textarea rows={3} maxLength={200} placeholder="写下你的评论，分享使用体验" value={rvText} onChange={(e) => setRvText(e.target.value)} />
            <div className="ap-rev-up">
              {rvImages.map((src, i) => (
                <span className="ap-rev-thumb" key={i}>
                  <img src={src} alt="" />
                  <button type="button" title="移除图片" onClick={() => setRvImages((v) => v.filter((_, j) => j !== i))}><Svg d={IC.clear} size={10} /></button>
                </span>
              ))}
              {rvImages.length < 3 && (
                <label className="ap-rev-up-add">
                  <Svg d={IC.plus} size={14} />
                  <em>添加图片</em>
                  <input type="file" accept="image/*" multiple onChange={(e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 3 - rvImages.length);
                    files.forEach((f) => {
                      const reader = new FileReader();
                      reader.onload = () => setRvImages((v) => (v.length >= 3 ? v : [...v, String(reader.result)]));
                      reader.readAsDataURL(f);
                    });
                    e.target.value = '';
                  }} />
                </label>
              )}
            </div>
            <div className="ap-rev-foot"><button type="button" className="ap-rev-collapse" onClick={() => setRvOpen(false)}>收起</button><button type="button" className="ap-btn-blue" onClick={() => submitReview(app)}>提交评价</button></div>
          </div>
          ) : (
            <button type="button" className="ap-rev-form-closed" onClick={() => setRvOpen(true)}>
              <span>你的评分</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n <= rvStars ? 'on' : ''}><Svg d={IC.star} size={16} filled /></i>
              ))}
              <em>点击写评价</em>
            </button>
          )
        ) : null}
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub">信息</h3>
        <div className="ap-info-grid">
          <div><i>提供者</i><b>{app.creator}</b></div>
          <div><i>类别</i><b>{app.category}</b></div>
          <div><i>应用类型</i><b>{app.appType ?? 'Web应用'}</b></div>
          <div><i>当前版本</i><b>{versionOf(app)}</b></div>
          <div><i>上线时间</i><b>{app.release}</b></div>
          <div><i>使用人次</i><b>{app.users}</b></div>
          <div><i>组织架构</i><b>{creatorDept('七妮妮')}</b></div>
        </div>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub">开发者信息</h3>
        <button type="button" className="ap-dev" title="查看上架应用" onClick={() => setDevDrawerId(app.id)}>
          <span className="ap-dev-ava">{app.creator.slice(0, 1)}</span>
          <div className="ap-dev-main">
            <b>{app.creator}</b>
            <i>{creatorDept(app.creator)}</i>
          </div>
          <div className="ap-dev-stats">
            <span><b>{devApps.length}</b>上架应用</span>
            <span><b>{devUsers}</b>总使用人次</span>
          </div>
          <Svg d={IC.arrow} size={14} className="ap-dev-go" />
        </button>
        <div className="ap-detail-divider" />
        <h3 className="ap-detail-sub">相关推荐</h3>
        {related.length === 0 ? (
          <div className="ap-empty">暂无相关推荐</div>
        ) : (
          <div className="ap-grid">{related.map((a) => renderCell(a, a.mine))}</div>
        )}
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

  /* ---------- 上传新创作 / 编辑应用（两步） ---------- */
  const renderCreate = () => {
    const editId = view.kind === 'create' ? view.editId : undefined;
    const editing = !!editId;

    const versionField = (
      <>
        <label className="ap-label">版本号<i>*</i></label>
        <div className="ap-field">
          <input maxLength={20} placeholder="遵循语义化版本规范(主版本.次版本.修订号)" value={fVersion} onChange={(e) => setFVersion(e.target.value)} />
          <span className="ap-count">{fVersion.length}/20</span>
        </div>
      </>
    );

    const noteField = (
      <>
        <label className="ap-label">{editing ? '更新描述' : '上新描述'}</label>
        <div className="ap-field area">
          <textarea maxLength={80} placeholder="如：新增批量导出；修复偶发卡顿" value={fNote} onChange={(e) => setFNote(e.target.value)} />
          <span className="ap-count">{fNote.length}/80</span>
        </div>
        <span className="ap-hint">将展示在首页「应用上新（升级公告）」</span>
      </>
    );

    const publishField = (
      <>
        <label className="ap-label">发布方式<i>*</i></label>
        <div className="ap-radio-line">
          <label className="ap-radio"><input type="radio" name="fpublish" checked={fPublish === 'online'} onChange={() => setFPublish('online')} />发布线上</label>
          <label className="ap-radio"><input type="radio" name="fpublish" checked={fPublish === 'test'} onChange={() => setFPublish('test')} />发布测试</label>
        </div>
      </>
    );

    const permField = fPublish === 'online' && (
      <>
        <label className="ap-label">权限管理<i>*</i></label>
        <div className="ap-perm-line">
          <span>{fPerm}</span>
          <button type="button" className="ap-link" onClick={() => setPermPop((v) => !v)}>修改</button>
          {permPop && (
            <div className="ap-perm-pop">
              {PERM_SCOPES.map((s) => (
                <button type="button" key={s} className={s === fPerm ? 'on' : ''} onClick={() => { setFPerm(s); setPermPop(false); }}>{s}</button>
              ))}
            </div>
          )}
        </div>
      </>
    );

    const fileField = (
      <>
        <label className="ap-label">上传应用文件<i>*</i></label>
        <button type="button" className="ap-upload-file" onClick={() => setFFile(demoFileName(fType))}>
          <Svg d={IC.folder} size={30} filled className="ap-uf-ic" />
          {fFile ? (
            <>
              <span className="ap-uf-name">已上传{fFile}</span>
              <span className="ap-link" onClick={(e) => { e.stopPropagation(); setFFile(demoFileName(fType)); setToast('已重新上传'); }}>重新上传</span>
            </>
          ) : (
            <span className="ap-uf-empty">点击上传应用文件</span>
          )}
        </button>
      </>
    );

    const runField = (
      <>
        <label className="ap-label">运行文件<i>*</i></label>
        <div className="ap-run-line">
          <span className={fRun ? '' : 'ph'}>{fRun || '选择运行文件路径'}</span>
          <button type="button" className="ap-link" onClick={() => setFRun('C:/User/admin')}>{fRun ? '重新选择' : '选择'}</button>
        </div>
      </>
    );

    return (
      <div className="ap-create">
        <div className="ap-create-head">
          <button type="button" className="ap-back" onClick={() => setView(backView)}>
            <Svg d={IC.back} size={18} />
          </button>
          <h2>{editing ? '编辑应用' : '上传新的创作'}</h2>
        </div>

        {step === 1 ? (
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
              {fTags.map((t) => {
                const c = tagColor(t);
                return (
                  <span key={t} className="ap-tag" style={{ borderColor: c, color: c, background: `${c}14` }}>
                    {t}
                    <button type="button" onClick={() => setFTags((v) => v.filter((x) => x !== t))}>×</button>
                  </span>
                );
              })}
            </div>
            {tagPop && (
              <div className="ap-tag-pop">
                <div className="ap-tag-pop-list">
                  {formTagOptions.filter((t) => !fTags.includes(t)).map((t) => {
                    const c = tagColor(t);
                    return (
                      <button type="button" key={t} className="ap-tag-opt" style={{ borderColor: c, color: c }} onClick={() => setFTags((v) => [...v, t])}>
                        {t}
                        {(catTagUsage.get(t) ?? 0) > 0 && <i>×{catTagUsage.get(t)}</i>}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className="ap-tag-opt new"
                    onClick={() => { setTmName(''); setTmColor(TAG_COLOR_PRESETS[0]); setTagModal(true); }}
                  >
                    <Svg d={IC.plus} size={12} />
                    新建标签
                  </button>
                </div>
              </div>
            )}

            <div className="ap-form-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setView(backView)}>返 回</button>
              <button type="button" className="ap-btn-blue" onClick={nextStep}>下一步</button>
            </div>
          </div>
        ) : (
          <div className="ap-form">
            <label className="ap-label">应用类型<i>*</i></label>
            <BubbleSelect
              className="ap-cat-select"
              options={APP_TYPES}
              value={fType || '请选择'}
              onChange={(v) => { setFType(v); setFFile(''); }}
            />

            {fType === 'Web应用' && (
              <>
                <label className="ap-label">部署模式<i>*</i></label>
                <div className="ap-radio-line">
                  <label className="ap-radio"><input type="radio" name="fdeploy" checked={fDeploy === 'link'} onChange={() => setFDeploy('link')} />外部链接</label>
                  <label className="ap-radio"><input type="radio" name="fdeploy" checked={fDeploy === 'file'} onChange={() => setFDeploy('file')} />文件托管</label>
                </div>
                {fDeploy === 'link' ? (
                  <>
                    <label className="ap-label">链接地址<i>*</i></label>
                    <div className="ap-field">
                      <input maxLength={100} placeholder="https://" value={fLink} onChange={(e) => setFLink(e.target.value)} />
                    </div>
                  </>
                ) : fileField}
                {versionField}
                {noteField}
                {publishField}
                {permField}
              </>
            )}

            {fType === 'EXE程序' && (
              <>
                {versionField}
                {fileField}
                {runField}
                {noteField}
                {publishField}
                {permField}
              </>
            )}

            {fType === '浏览器插件' && (
              <>
                {versionField}
                {fileField}
                {noteField}
                {publishField}
                {permField}
              </>
            )}

            {!fType && (
              <>
                {versionField}
                {noteField}
                {publishField}
              </>
            )}

            <div className="ap-form-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setStep(1)}>上一步</button>
              <button type="button" className="ap-btn-blue" onClick={submitCreate}>{editing ? '提交更新' : '提交创作'}</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const deleteApp = deleteId ? apps.find((a) => a.id === deleteId) : null;
  const updateApp = updateId ? apps.find((a) => a.id === updateId) : null;

  /* 提交评价：仅已添加的应用可评 */
  const submitReview = (app: AppItem) => {
    if (!app.added) { setToast('添加应用后才可以评价'); return; }
    if (!rvStars) { setToast('请先选择星级'); return; }
    if (!rvText.trim()) { setToast('请填写评论内容'); return; }
    setReviews((v) => [{ id: `rv-${Date.now()}`, appId: app.id, user: '七妮妮', stars: rvStars, title: rvTitle.trim() || '用户评论', text: rvText.trim(), date: today(), version: versionOf(app), read: false, images: rvImages.length ? rvImages : undefined }, ...v]);
    setRvStars(0); setRvTitle(''); setRvText(''); setRvOpen(false); setRvImages([]);
    setToast('评价已提交');
  };

  /* 确认更新：加载后清除更新标记 */
  const confirmUpdate = () => {
    if (!updateApp) return;
    const { id, name } = updateApp;
    const ver = versionOf(updateApp);
    setUpdateId(null);
    setLoadingId(id);
    setTimeout(() => {
      setLoadingId(null);
      patchApp(id, { hasUpdate: false });
      setToast(`「${name}」已更新至 v${ver}`);
    }, 900);
  };
  const menuApp = menu ? apps.find((a) => a.id === menu.id) : null;

  return (
    <div className="ap-page">
      <aside className="ap-side">
        <nav className="ap-cats">
          <button
            type="button"
            onClick={() => setView({ kind: 'home' })}
          >
            <Svg d={IC.home} size={15} className="ap-cat-ic" />
            首页
          </button>
          <div className="ap-side-div" />
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
              <Svg d={CAT_ICONS[c] ?? IC.cat} size={15} className="ap-cat-ic" />
              {c}
            </button>
          ))}
        </nav>
        <div className="ap-side-bottom">
          <button type="button" className={`ap-side-user${mineActive ? ' on' : ''}`} onClick={() => setView({ kind: 'mine' })} title="我的应用">
            <span className="ap-avatar" />
            七妮妮
          </button>
          <button type="button" className="ap-bell" title="消息中心" onClick={() => setMsgOpen(true)}>
            <Svg d={IC.bell} size={17} />
            {msgCount > 0 && <i>{msgCount}</i>}
          </button>
        </div>
      </aside>

      <main className="ap-main">
        {view.kind === 'home' && renderHome()}
        {view.kind === 'list' && renderList()}
        {view.kind === 'detail' && renderDetail()}
        {view.kind === 'mine' && renderMine()}
        {view.kind === 'dash' && <AppDashboard apps={apps} reviews={reviews} onBack={() => setView({ kind: 'home' })} onOpenApp={openDetail} />}
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
                  <div className="ap-cat-icwrap">
                    <button type="button" className="ap-cat-icon" title="更换图标" onClick={() => setPickIdx(pickIdx === i ? null : i)}>
                      {isImgIcon(c.ic) ? <img src={c.ic} alt="" /> : <Svg d={GLYPHS[c.ic] ?? IC.folder} size={16} />}
                    </button>
                    {pickIdx === i && (
                      <div className="ap-cat-pick">
                        {ICON_LIB.map((g) => (
                          <button
                            key={g.k}
                            type="button"
                            className={c.ic === g.k ? 'on' : ''}
                            onClick={() => { setDraft((v) => v.map((r, idx) => (idx === i ? { ...r, ic: g.k } : r))); setPickIdx(null); }}
                          >
                            <Svg d={g.d} size={16} />
                          </button>
                        ))}
                        <label className="ap-cat-pick-up" title="上传图标">
                          <Svg d={IC.plus} size={14} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const reader = new FileReader();
                              reader.onload = () => {
                                setDraft((v) => v.map((r, idx) => (idx === i ? { ...r, ic: String(reader.result) } : r)));
                                setPickIdx(null);
                              };
                              reader.readAsDataURL(f);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
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
                      <span className="ap-cat-name">{c.n}</span>
                      <button type="button" className="ap-cat-ic-btn" title="修改" onClick={() => { setEditIdx(i); setEditVal(c.n); }}>
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

      {fbCreate && createPortal(
        <>
          <div className="ap-drawer-mask" onClick={() => setFbCreate(false)} />
          <div className="ap-drawer">
            <div className="ap-drawer-head">
              <span>新建反馈</span>
              <button type="button" onClick={() => setFbCreate(false)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-drawer-body">
              <div className="ap-fb-field-label">反馈类型</div>
              <div className="ap-fb-types">
                {FB_TYPES.map((t) => (
                  <button key={t} type="button" className={fbType === t ? 'on' : ''} onClick={() => setFbType(t)}>{t}</button>
                ))}
              </div>
              <div className="ap-fb-field-label">反馈内容</div>
              <textarea
                className="ap-fb-input"
                rows={6}
                maxLength={200}
                placeholder="说说你的建议或遇到的问题，我们会认真跟进并回复…"
                value={fbText}
                onChange={(e) => setFbText(e.target.value)}
              />
              <div className="ap-fb-tip right">{fbText.length}/200</div>
            </div>
            <div className="ap-drawer-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setFbCreate(false)}>取 消</button>
              <button type="button" className="ap-btn-blue" onClick={submitFb}>提交反馈</button>
            </div>
          </div>
        </>,
        document.body,
      )}

      {(() => {
        const fbDetail = fbList.find((f) => f.id === fbDetailId);
        if (!fbDetail) return null;
        const replies = fbDetail.msgs.filter((m) => m.role === 'admin').length;
        return createPortal(
          <>
            <div className="ap-drawer-mask" onClick={() => setFbDetailId(null)} />
            <div className="ap-drawer ap-drawer-fb">
              <div className="ap-drawer-head">
                <span>反馈详情</span>
                <button type="button" onClick={() => setFbDetailId(null)}><Svg d={IC.clear} size={14} /></button>
              </div>
              <div className="ap-drawer-body">
                <div className="ap-fb-detail-meta">
                  <div className="ap-fb-meta-top">
                    <em className={`ap-fb-type${fbDetail.type === '问题反馈' ? ' bug' : fbDetail.type === '体验优化' ? ' ux' : ''}`}>{fbDetail.type}</em>
                    <i>提交于 {fbDetail.at}</i>
                  </div>
                  <div className="ap-fb-meta-status">
                    <span>处理状态</span>
                    <b className={replies > 0 ? 'st-done' : 'st-pending'}>{replies > 0 ? '已回复' : '待回复'}</b>
                    <em>{replies > 0 ? `共 ${replies} 条官方回复` : '等待官方处理中'}</em>
                  </div>
                </div>
                <div className="ap-fb-thread">
                  {fbDetail.msgs.map((m) => (
                    <div key={m.id} className={`ap-fb-msg ${m.role}`}>
                      <div className="ap-fb-msg-head"><b>{m.role === 'admin' ? `官方 · ${m.by}` : m.by}</b><i>{m.at}</i></div>
                      <p>{m.content}</p>
                    </div>
                  ))}
                  {replies === 0 && <div className="ap-fb-empty">暂无回复，官方处理后会在此回复你</div>}
                </div>
                <div className="ap-fb-field-label" style={{ marginTop: 16 }}>补充描述</div>
                <textarea
                  className="ap-fb-input"
                  rows={3}
                  maxLength={200}
                  placeholder="还有想补充的信息？写在这里…"
                  value={fbNote}
                  onChange={(e) => setFbNote(e.target.value)}
                />
              </div>
              <div className="ap-drawer-foot">
                <button type="button" className="ap-btn-plain" onClick={() => setFbDetailId(null)}>关 闭</button>
                <button type="button" className="ap-btn-blue" onClick={() => appendFbNote(fbDetail.id)}>提交补充</button>
              </div>
            </div>
          </>,
          document.body,
        );
      })()}

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

      {updateApp && (
        <div className="ap-mask">
          <div className="ap-modal">
            <div className="ap-modal-head">
              <span>更新应用</span>
              <button type="button" onClick={() => setUpdateId(null)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-modal-body">
              <div className="ap-upd-ver">
                <span>v{updateApp.prevVersion ?? '1.0.0'}</span>
                <Svg d={IC.arrow} size={14} />
                <b>v{versionOf(updateApp)}</b>
              </div>
              <div className="ap-upd-note">
                <i>更新内容</i>
                <p>{updateApp.releaseNote ?? '性能优化与体验改进。'}</p>
              </div>
            </div>
            <div className="ap-modal-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setUpdateId(null)}>取 消</button>
              <button type="button" className="ap-btn-blue" onClick={confirmUpdate}>立即更新</button>
            </div>
          </div>
        </div>
      )}

      {revAllId && (
        <div className="ap-mask">
          <div className="ap-modal ap-modal-lg">
            <div className="ap-modal-head">
              <span>全部评价（{reviews.filter((r) => r.appId === revAllId).length}）</span>
              <button type="button" onClick={() => setRevAllId(null)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-modal-body ap-rev-list">
              {reviews.filter((r) => r.appId === revAllId).map((r) => (
                <div className="ap-rev-item" key={r.id}>
                  <div className="ap-rev-head">
                    <b>{r.title}</b>
                    <div className="ap-rev-meta"><i>{agoText(r.date)}</i><span>{r.user}</span><em>v{r.version}</em></div>
                  </div>
                  <div className="ap-rev-stars">
                    {[1, 2, 3, 4, 5].filter((n) => n <= r.stars).map((n) => <Svg key={n} d={IC.star} size={13} filled className="ap-star" />)}
                  </div>
                  <p>{r.text}</p>
                  {r.images && r.images.length > 0 && (
                    <div className="ap-rev-imgs">{r.images.map((src, i) => <img key={i} src={src} alt="" />)}</div>
                  )}
                  {r.reply && <div className="ap-rev-reply"><i>开发者回复</i><p>{r.reply.text}</p></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {verHistId && (
        <div className="ap-mask">
          <div className="ap-modal ap-modal-lg">
            <div className="ap-modal-head">
              <span>版本历史记录</span>
              <button type="button" onClick={() => setVerHistId(null)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-modal-body ap-rev-list">
              {(() => {
                const h = apps.find((a) => a.id === verHistId);
                if (!h) return null;
                return (
                  <>
                    <div className="ap-vh-item">
                      <div className="ap-feat-head">
                        <b>版本 {versionOf(h)}</b>
                        <div className="ap-feat-meta"><i>{agoText(h.release)}</i><span>{h.release}</span></div>
                      </div>
                      <ul>{featLinesOf(h).map((l) => <li key={l}>{l}</li>)}</ul>
                    </div>
                    {h.prevVersion && (
                      <div className="ap-vh-item">
                        <div className="ap-feat-head">
                          <b>版本 {h.prevVersion}</b>
                          <div className="ap-feat-meta"><i>历史版本</i></div>
                        </div>
                        <ul><li>性能优化与体验改进。</li></ul>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {tagModal && (
        <div className="ap-mask">
          <div className="ap-modal">
            <div className="ap-modal-head">
              <span>新建标签</span>
              <button type="button" onClick={() => setTagModal(false)}><Svg d={IC.clear} size={14} /></button>
            </div>
            <div className="ap-modal-body">
              <div className="ap-tm-field">
                <label>标签名称</label>
                <input maxLength={8} placeholder="请输入标签名称" value={tmName} onChange={(e) => setTmName(e.target.value)} />
              </div>
              <div className="ap-tm-field">
                <label>标签颜色</label>
                <div className="ap-tm-colors">
                  {TAG_COLOR_PRESETS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`ap-tm-swatch${tmColor === c ? ' on' : ''}`}
                      style={{ background: c }}
                      title={c}
                      onClick={() => setTmColor(c)}
                    />
                  ))}
                  <label className="ap-tm-custom" title="自定义颜色">
                    <input type="color" value={tmColor} onChange={(e) => setTmColor(e.target.value)} />
                    <span style={{ background: tmColor }} />
                    <em>{tmColor}</em>
                  </label>
                </div>
              </div>
              <div className="ap-tm-preview">
                <span>预览</span>
                <span className="ap-tag" style={{ borderColor: tmColor, color: tmColor, background: `${tmColor}14` }}>{tmName.trim() || '标签'}</span>
              </div>
            </div>
            <div className="ap-modal-foot">
              <button type="button" className="ap-btn-plain" onClick={() => setTagModal(false)}>取 消</button>
              <button type="button" className="ap-btn-blue" onClick={confirmNewTag}>确 定</button>
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

      {msgOpen && (
        <>
          <div className="ap-drawer-mask" onClick={() => setMsgOpen(false)} />
          <div className="ap-drawer ap-drawer-msg">
            <div className="ap-drawer-head">
              <span>消息中心</span>
              <div className="ap-msg-head-act">
                <button type="button" className="ap-link" onClick={markAllRead}>全部已读</button>
                <button type="button" onClick={() => setMsgOpen(false)}><Svg d={IC.clear} size={14} /></button>
              </div>
            </div>
            <div className="ap-msg-tabs">
              <button type="button" className={msgTab === 'sys' ? 'on' : ''} onClick={() => { setMsgTab('sys'); setMsgStatus('all'); }}>
                系统反馈{unreadFbCount > 0 && <i>{unreadFbCount}</i>}
              </button>
              <button type="button" className={msgTab === 'app' ? 'on' : ''} onClick={() => { setMsgTab('app'); setMsgStatus('all'); }}>
                应用反馈{unreadReviewCount > 0 && <i>{unreadReviewCount}</i>}
              </button>
            </div>
            <div className="ap-msg-pane">
              <div className="ap-msg-rail">
                {msgTab === 'app' ? (
                  <>
                    <button type="button" className={msgAppFilter === 'all' ? 'on' : ''} onClick={() => setMsgAppFilter('all')}>
                      <span className="ap-rail-name">全部应用</span>
                      {unreadReviewCount > 0 && <i className="ap-rail-unread">{unreadReviewCount}</i>}
                    </button>
                    {railApps.map((a) => {
                      const un = myReviews.filter((r) => r.appId === a.id && r.read === false).length;
                      return (
                        <button type="button" key={a.id} className={msgAppFilter === a.id ? 'on' : ''} onClick={() => setMsgAppFilter(a.id)}>
                          <Logo icon={a.icon} size={33} />
                          <span className="ap-rail-name">{a.name}</span>
                          {un > 0 && <i className="ap-rail-unread">{un}</i>}
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <button type="button" className={msgFbType === 'all' ? 'on' : ''} onClick={() => setMsgFbType('all')}>
                      <span className="ap-rail-name">全部类型</span>
                      {unreadFbCount > 0 && <i className="ap-rail-unread">{unreadFbCount}</i>}
                    </button>
                    {FB_TYPES.map((t) => {
                      const un = fbList.filter((f) => f.type === t && f.read === false).length;
                      return (
                        <button type="button" key={t} className={msgFbType === t ? 'on' : ''} onClick={() => setMsgFbType(t)}>
                          <span className="ap-rail-name">{t}</span>
                          {un > 0 && <i className="ap-rail-unread">{un}</i>}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="ap-msg-list">
                <div className="ap-msg-filter">
                  <div className="ap-fb-tabs">
                    <button type="button" className={msgStatus === 'all' ? 'on' : ''} onClick={() => setMsgStatus('all')}>全部</button>
                    <button type="button" className={msgStatus === 'pending' ? 'on' : ''} onClick={() => setMsgStatus('pending')}>待回复</button>
                    <button type="button" className={msgStatus === 'done' ? 'on' : ''} onClick={() => setMsgStatus('done')}>已回复</button>
                  </div>
                </div>
                {msgTab === 'app' ? (
                  <>
                    {shownReviews.length === 0 && <div className="ap-empty">该应用下暂无用户评价</div>}
                    {shownReviews.map((r) => {
                      const app = apps.find((a) => a.id === r.appId);
                      return (
                        <div className={`ap-msg-item${r.read === false ? ' unread' : ''}`} key={r.id} onClick={() => markRevRead(r.id)}>
                          <div className="ap-msg-top">
                            <b>
                              {r.read === false && <i className="ap-msg-dot" />}
                              {app?.name ?? r.appId}
                              <em className={`ap-msg-st ${r.reply ? 'done' : 'pending'}`}>{r.reply ? '已回复' : '待回复'}</em>
                            </b>
                            <span className="ap-msg-top-act">
                              <i>{agoText(r.date)} · v{r.version}</i>
                              <button type="button" className="ap-link" onClick={() => { markRevRead(r.id); setMsgOpen(false); setView({ kind: 'detail', id: r.appId }); }}>查看应用</button>
                            </span>
                          </div>
                          <div className="ap-msg-rev">
                            <span>{r.user}</span>
                            <span className="ap-msg-stars">
                              {[1, 2, 3, 4, 5].map((n) => <Svg key={n} d={IC.star} size={12} filled className={n <= r.stars ? 'ap-star' : 'ap-star-dim'} />)}
                            </span>
                            <p>{r.title} · {r.text}</p>
                            {r.images && r.images.length > 0 && (
                              <div className="ap-rev-imgs">{r.images.map((src, i) => <img key={i} src={src} alt="" />)}</div>
                            )}
                          </div>
                          {r.reply ? (
                            <div className="ap-msg-reply"><i>我的回复 · {agoText(r.reply.date)}</i><p>{r.reply.text}</p></div>
                          ) : rvReplyId === r.id ? (
                            <div className="ap-msg-replyform">
                              <input value={rvReplyText} onChange={(e) => setRvReplyText(e.target.value)} maxLength={100} placeholder="回复该用户的评价" />
                              <div>
                                <button type="button" onClick={() => setRvReplyId(null)}>取消</button>
                                <button type="button" className="on" onClick={() => replyReview(r.id)}>回复</button>
                              </div>
                            </div>
                          ) : (
                            <div className="ap-msg-foot">
                              <button type="button" className="ap-link" onClick={() => { setRvReplyId(r.id); setRvReplyText(''); }}>回复</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="ap-msg-note">应用级反馈建议渠道（用户直接向开发者反馈）规划中，后续将在此汇聚展示</div>
                  </>
                ) : (
                  <>
                    {shownFb.length === 0 && <div className="ap-empty">该类型下暂无反馈</div>}
                    {shownFb.map((f) => {
                      const pending = f.msgs[f.msgs.length - 1].role === 'user';
                      return (
                        <div className={`ap-msg-item${f.read === false ? ' unread' : ''}`} key={f.id} onClick={() => markFbRead(f.id)}>
                          <div className="ap-msg-top">
                            <b>
                              {f.read === false && <i className="ap-msg-dot" />}
                              {f.type}
                              <em className={`ap-msg-st ${pending ? 'pending' : 'done'}`}>{pending ? '待回复' : '已回复'}</em>
                            </b>
                            <span className="ap-msg-top-act">
                              <i>{f.at}</i>
                              <button type="button" className="ap-link" onClick={() => { markFbRead(f.id); setMsgOpen(false); setFbDetailId(f.id); }}>查看反馈</button>
                            </span>
                          </div>
                          <div className="ap-msg-thread">
                            {f.msgs.map((m) => (
                              <div className={`ap-msg-m ${m.role}`} key={m.id}>
                                <i>{m.by} · {m.at}</i>
                                <p>{m.content}</p>
                              </div>
                            ))}
                          </div>
                          {fbReplyId === f.id ? (
                            <div className="ap-msg-replyform">
                              <input value={fbReplyText} onChange={(e) => setFbReplyText(e.target.value)} maxLength={200} placeholder="以应用市场管理员身份回复" />
                              <div>
                                <button type="button" onClick={() => setFbReplyId(null)}>取消</button>
                                <button type="button" className="on" onClick={() => replyFb(f.id)}>回复</button>
                              </div>
                            </div>
                          ) : (
                            <div className="ap-msg-foot">
                              <button type="button" className="ap-link" onClick={() => { setFbReplyId(f.id); setFbReplyText(''); }}>回复</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {devDrawerId && (() => {
        const d = apps.find((a) => a.id === devDrawerId);
        if (!d) return null;
        const dApps = apps.filter((a) => a.creator === d.creator).sort((a, b) => b.users - a.users);
        const dUsers = dApps.reduce((s, a) => s + a.users, 0);
        return (
          <>
            <div className="ap-drawer-mask" onClick={() => setDevDrawerId(null)} />
            <div className="ap-drawer">
              <div className="ap-drawer-head">
                <span>{d.creator} 的上架应用</span>
                <button type="button" onClick={() => setDevDrawerId(null)}><Svg d={IC.clear} size={14} /></button>
              </div>
              <div className="ap-drawer-body">
                <div className="ap-dev">
                  <span className="ap-dev-ava">{d.creator.slice(0, 1)}</span>
                  <div className="ap-dev-main">
                    <b>{d.creator}</b>
                    <i>{creatorDept(d.creator)}</i>
                  </div>
                  <div className="ap-dev-stats">
                    <span><b>{dApps.length}</b>上架应用</span>
                    <span><b>{dUsers}</b>总使用人次</span>
                  </div>
                </div>
                <div className="ap-dev-apps">
                  {dApps.map((a) => (
                    <button type="button" key={a.id} className="ap-dev-app" onClick={() => { setDevDrawerId(null); setView({ kind: 'detail', id: a.id }); }}>
                      <Logo icon={a.icon} size={36} />
                      <div className="ap-dev-app-main"><b>{a.name}</b><i>{a.category} · {a.users} 人次使用</i></div>
                      {a.id === d.id && <em className="ap-dev-cur">当前</em>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
