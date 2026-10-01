<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue';
import { createTaobaoRows, createJmRows, createImgsOf, parentTasks, retrySub, PUB_NO_STRATEGY, PUB_STRATEGIES, PUB_SHOPS, PUB_ROUTE_PLATFORMS, PLATFORM_LOGO, createDetail } from './data';
import { blFailReason, matchBlacklist } from './blacklistData';
import type { BlType } from './blacklistData';
import type { CreateRow, SubTask, PubShop } from './data';
import { sgJmDetail, jmDetailSeeds } from './shopGoodsData';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import MoreActions from '../../components/MoreActions.vue';
import SortTh from '../../components/SortTh.vue';
import CreateDetailPage from './CreateDetailPage.vue';
import JmCreateDetailPage from './JmCreateDetailPage.vue';
import { pushToast } from '../../components/toast';
import TcStepsCell from './TcStepsCell.vue';
import QuickSkuModal, { mkVal } from './QuickSkuModal.vue';
import type { QuickDraftRow, QuickSpec } from './QuickSkuModal.vue';
import { addPublishTask, setPublishResume, setPublishRiskResume } from './publishStore';
import { pushGMsg, requestShopAcct } from '../../components/globalMsgData';
import { amOfflineShopNames, amOfflineSellerOfShop } from '../permission/accountData';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/** 商品创建页（jm=京麦平台：列表同源结构，详情走京麦接口字段页；video=视频号：详情走微信小店规格×SKU 笛卡尔积交互） */
const props = defineProps<{ jm?: boolean; video?: boolean }>();
const rows = ref<CreateRow[]>(props.jm ? createJmRows : createTaobaoRows);

/* 创建表列头排序：按创建时间，单列点击循环 desc → asc → 取消 */
const createSortDir = ref<'none' | 'asc' | 'desc'>('none');
const onCreateSort = () => {
  if (createSortDir.value === 'none') createSortDir.value = 'desc';
  else if (createSortDir.value === 'desc') createSortDir.value = 'asc';
  else createSortDir.value = 'none';
};
const createSortState = () => createSortDir.value;
const sortedRows = computed(() => {
  if (createSortDir.value === 'none') return rows.value;
  const dir = createSortDir.value === 'asc' ? 1 : -1;
  return [...rows.value].sort((a, b) => a.time.localeCompare(b.time) * dir);
});

/* 列表字段管理：三平台实例列结构同源共用 scope；百分比宽表不横向溢出，sticky=false 钉住仅置顶/置尾 */
const cf = useColField('create', {
  fixedLeft: [{ key: 'check' }],
  fields: [
    { key: 'product', label: '商品信息' },
    { key: 'store', label: '上架店铺' },
    { key: 'status', label: '状态' },
    { key: 'created', label: '创建人 / 创建时间' },
  ],
  fixedRight: [{ key: 'actions', label: '操作' }],
  sticky: false,
});
const { midCols } = cf;
/* 详情态：复用内部商机/店铺商品详情样式 */
const detail = ref<CreateRow | null>(null);
/* 京麦详情数据按行持久化：每行独立存储，返回列表后再进详情仍保留编辑态 */
const jmDetailStore = reactive<Record<string, any>>({});
const getJmDetail = (link: string) => {
  if (!jmDetailStore[link]) {
    const seed = jmDetailSeeds[link] ?? sgJmDetail;
    jmDetailStore[link] = JSON.parse(JSON.stringify(seed));
  }
  return jmDetailStore[link];
};
provide('getJmDetail', getJmDetail);
/* 淘宝/视频号详情数据按行持久化（同上） */
const tbDetailStore = reactive<Record<string, any>>({});
const getTbDetail = (link: string) => {
  if (!tbDetailStore[link]) tbDetailStore[link] = JSON.parse(JSON.stringify(createDetail));
  return tbDetailStore[link];
};
provide('getTbDetail', getTbDetail);
/* 创建时间范围筛选 */
const createDateFrom = ref('');
const createDateTo = ref('');
/* 列表选择列：勾选后「快速铺货」批量发布（支持一件或多件） */
const selLinks = ref<Set<string>>(new Set());
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((r) => selLinks.value.has(r.link)));
const toggleSel = (link: string, on: boolean) => {
  const next = new Set(selLinks.value);
  if (on) next.add(link);
  else next.delete(link);
  selLinks.value = next;
};
const toggleSelAll = (on: boolean) => {
  selLinks.value = on ? new Set(rows.value.map((r) => r.link)) : new Set();
};
/* 图片管理二级页开关：列表页仅保留入口按钮，点击进入二级页批量管理筛选结果下全部商品图片 */
const imgPage = ref(false);
/* 图片模式：每商品 3 图；批量操作结果记删除/已去品牌两个 set，对应选择项置灰不可再选 */
const imgDeleted = ref<Set<string>>(new Set());
const brandDone = ref<Set<string>>(new Set());
/* 去水印执行中集合：执行先落 busy 延时后转生成记录，批量与单图共用同一状态链 */
const wmBusy = ref<Set<string>>(new Set());
/* 生成记录（详情同款）：原图 + 每次去水印生成；去水印不置灰可重复执行，效果不理想可点版本还原 */
interface ImgWmRec { id: string; kind: 'origin' | 'wm'; label: string }
const wmRecs = ref<Record<string, ImgWmRec[]>>({});
const wmActive = ref<Record<string, string>>({});
const ensureOrigin = (key: string) => {
  if (wmRecs.value[key]) return;
  const rec: ImgWmRec = { id: `${key}@0`, kind: 'origin', label: '原图' };
  wmRecs.value = { ...wmRecs.value, [key]: [rec] };
  wmActive.value = { ...wmActive.value, [key]: rec.id };
};
const pushWmRec = (key: string) => {
  ensureOrigin(key);
  const list = wmRecs.value[key];
  const n = list.filter((r) => r.kind === 'wm').length + 1;
  const rec: ImgWmRec = { id: `${key}@${n}`, kind: 'wm', label: `生成${n}` };
  wmRecs.value = { ...wmRecs.value, [key]: [...list, rec] };
  wmActive.value = { ...wmActive.value, [key]: rec.id };
};
/* 点击版本即切换使用（选中哪个展示哪个），与详情生成记录同语义 */
const selectWmRec = (key: string, id: string) => {
  if (wmActive.value[key] === id) return;
  wmActive.value = { ...wmActive.value, [key]: id };
  const rec = (wmRecs.value[key] ?? []).find((r) => r.id === id);
  pushToast(rec?.kind === 'origin' ? '已切换使用原图' : `已切换使用「${rec?.label ?? ''}」`);
};
const wmRecsOf = (key: string) => wmRecs.value[key] ?? [];
const wmActiveOf = (key: string) => wmActive.value[key] ?? '';
const runWm = (keys: string[], doneMsg: string) => {
  if (!keys.length) return;
  wmBusy.value = new Set([...wmBusy.value, ...keys]);
  window.setTimeout(() => {
    const ks = new Set(keys);
    wmBusy.value = new Set([...wmBusy.value].filter((k) => !ks.has(k)));
    keys.forEach(pushWmRec);
    pushToast(doneMsg);
  }, 1600);
};
/* 图片模式：筛选结果下每商品 3 图全部瀑布流平铺；无收起/叠堆，选择项始终可勾选 */
const imgs = computed(() => rows.value
  .flatMap((r, ri) => createImgsOf(r, ri))
  .filter((im) => !imgDeleted.value.has(im.key))
  .map((im) => ({
    ...im,
    brandDone: brandDone.value.has(im.key),
    wmBusy: wmBusy.value.has(im.key),
  })));
/* 标签勾选（图片key::wm / ::brand）：选中后支持批量去水印 / 批量去品牌 / 批量删除 */
const selTags = ref<Set<string>>(new Set());
const tagId = (key: string, t: 'wm' | 'brand') => `${key}::${t}`;
const tagKey = (t: string) => t.slice(0, t.lastIndexOf('::'));
const toggleTag = (id: string) => {
  const n = new Set(selTags.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  selTags.value = n;
};
const clearSel = () => { selTags.value = new Set(); };
/* 图下文字行与悬浮预览共用的选择操作：去水印可重复执行不置灰（版本还原见生成记录点选），去品牌已处理后置灰 */
const imgOps = (im: (typeof imgs.value)[number]) => [
  { t: 'wm' as const, done: false, busy: im.wmBusy, label: im.wmBusy ? '去水印执行中' : '去水印' },
  { t: 'brand' as const, done: im.brandDone, busy: false, label: im.brandDone ? '已去品牌' : '去品牌' },
];
/* 瀑布流列数：容器宽按固定列宽 150＋间距 12 折算（ResizeObserver 跟随视口），CSS 多列在瓷砖量少时均衡收敛留右侧空白故改 JS 分列 */
const COL_W = 150;
const COL_GAP = 12;
const flatRef = ref<HTMLElement | null>(null);
const colCount = ref(8);
let flatRo: ResizeObserver | null = null;
watch(imgPage, (on) => {
  if (flatRo) { flatRo.disconnect(); flatRo = null; }
  if (!on) return;
  nextTick(() => {
    const el = flatRef.value;
    if (!el) return;
    const upd = () => { colCount.value = Math.max(4, Math.floor((el.clientWidth + COL_GAP) / (COL_W + COL_GAP))); };
    upd();
    flatRo = new ResizeObserver(upd);
    flatRo.observe(el);
  });
}, { immediate: true });
onBeforeUnmount(() => { if (flatRo) flatRo.disconnect(); });
/* 最短列分布：按图片高宽比＋操作行估算列高，逐张放入当前最矮列，形成真瀑布流 */
const imgCols = computed(() => {
  const cols = Array.from({ length: colCount.value }, () => ({ list: [] as typeof imgs.value, h: 0 }));
  for (const im of imgs.value) {
    const c = cols.reduce((a, b) => (a.h <= b.h ? a : b));
    c.list.push(im);
    c.h += im.rh + 0.15;
  }
  return cols.map((c) => c.list);
});
/* 悬浮预览翻转：逐瓷砖 hover 实测——滚动视口上方空间不足面板高时翻为向下弹，
   避免向上弹被屏幕顶裁剪（静态首行翻转在滚动后非首行贴顶时仍会裁，故改动态） */
const ZOOM_H = 480; /* 面板估算高兜底：放大图 max 420 ＋操作行＋桥接垫 */
const placeZoom = (e: MouseEvent) => {
  const thumb = e.currentTarget as HTMLElement;
  const zoom = thumb.querySelector('.cp-img-zoom') as HTMLElement | null;
  if (!zoom) return;
  const sc = thumb.closest('.app-content');
  const box = sc ? sc.getBoundingClientRect() : { top: 0, bottom: window.innerHeight };
  const r = thumb.getBoundingClientRect();
  const need = zoom.offsetHeight || ZOOM_H;
  const above = r.top - box.top;
  const below = box.bottom - r.bottom;
  const down = above < need && below > above;
  zoom.classList.toggle('cp-zoom-down', down);
  /* 定向后仍不足则整面板平移贴齐滚动视口（覆盖瓷砖而非裁切），hover 不断 */
  const zr = zoom.getBoundingClientRect();
  let dy = 0;
  if (!down && zr.top < box.top) dy = box.top - zr.top + 4;
  if (down && zr.bottom > box.bottom) dy = box.bottom - zr.bottom - 4;
  zoom.style.transform = dy ? `translate(-50%, ${dy}px)` : '';
};
const wmSel = computed(() => [...selTags.value].filter((t) => t.endsWith('::wm')));
const brandSel = computed(() => [...selTags.value].filter((t) => t.endsWith('::brand')));
const selImgKeys = computed(() => new Set([...selTags.value].map(tagKey)));
const batchWm = () => {
  const keys = wmSel.value.map(tagKey);
  selTags.value = new Set([...selTags.value].filter((t) => !t.endsWith('::wm')));
  runWm(keys, `批量去水印完成：共处理 ${keys.length} 张图片`);
};
const batchBrand = () => {
  const keys = brandSel.value.map(tagKey);
  brandDone.value = new Set([...brandDone.value, ...keys]);
  selTags.value = new Set([...selTags.value].filter((t) => !t.endsWith('::brand')));
  pushToast(`批量去品牌完成：共处理 ${keys.length} 张图片`);
};
const batchDelImgs = () => {
  const keys = [...selImgKeys.value];
  imgDeleted.value = new Set([...imgDeleted.value, ...keys]);
  selTags.value = new Set();
  pushToast(`已删除 ${keys.length} 张图片`);
};
/* 点击查看态：瀑布流之上全屏查看层；主区大图＋与瀑布流同源的去水印/去品牌操作，右侧全部图片缩略列 */
const viewKey = ref<string | null>(null);
const viewIdx = computed(() => imgs.value.findIndex((im) => im.key === viewKey.value));
const viewImg = computed(() => (viewIdx.value >= 0 ? imgs.value[viewIdx.value] : null));
const openView = (im: (typeof imgs.value)[number]) => { viewKey.value = im.key; };
const stepView = (d: number) => {
  const n = viewIdx.value + d;
  if (viewIdx.value < 0 || n < 0 || n >= imgs.value.length) return;
  viewKey.value = imgs.value[n].key;
};
/* 滚轮节流：一次滚轮刻度连发多个 wheel 事件，不节流一刻度会连跳多张 */
let viewWheelAt = 0;
const onViewWheel = (e: WheelEvent) => {
  e.preventDefault();
  if (Math.abs(e.deltaY) < 4) return;
  const now = Date.now();
  if (now - viewWheelAt < 260) return;
  viewWheelAt = now;
  stepView(e.deltaY > 0 ? 1 : -1);
};
/* 切换时右列当前缩略图滚入可视区 */
const viewRailRef = ref<HTMLElement | null>(null);
watch(viewIdx, () => {
  nextTick(() => {
    (viewRailRef.value?.querySelector('.cp-view-rail-item.on') as HTMLElement | null)?.scrollIntoView({ block: 'nearest' });
  });
});
/* 发布到：两步向导——第一步多选策略（含不使用策略发布）/ 第二步按策略选店铺，店铺跨策略互斥不可重复 */
interface PubSel {
  name: string;
  method: string;
  way: string;
  shopQ: string;
  platform: string;
  groupOpen: boolean;
  shops: number[];
}
const pubOpen = ref(false);
const pubStep = ref<1 | 2>(1);
const pubProducts = ref<CreateRow[]>([]);
const pubSel = ref<PubSel[]>([]);
/* 路由平台：发布到抽屉只展示当前路由（淘宝/视频号/京麦）本平台的策略与店铺 */
const routeKey = computed<'tb' | 'video' | 'jm'>(() => (props.jm ? 'jm' : props.video ? 'video' : 'tb'));
const pubPlatforms = computed(() => PUB_ROUTE_PLATFORMS[routeKey.value]);
const pubStrategies = computed(() => PUB_STRATEGIES.filter((s) => pubPlatforms.value.includes(s.platform)));
const newPubSel = (name: string): PubSel => ({
  name,
  method: '',
  way: '蜂联发布',
  shopQ: '',
  platform: pubPlatforms.value[0],
  groupOpen: false,
  shops: [],
});
const openPubTo = (products: CreateRow[]) => {
  pubProducts.value = products;
  pubSel.value = [];
  pubStep.value = 1;
  pubOpen.value = true;
};
const openQuickPub = () => {
  openPubTo(rows.value.filter((r) => selLinks.value.has(r.link)));
};
/* 竞品导入抽屉：导入方式双态——链接导入（平台+入口链接）/ 文件导入（xlsx 上传，≤10 MB） */
const impOpen = ref(false);
const impMode = ref<'link' | 'file'>('link');
const IMP_PLATS = ['淘宝', '天猫', '拼多多', '抖音', '快手', '京东'];
const impPlat = ref(IMP_PLATS[0]);
const impLink = ref('');
const impFileRef = ref<HTMLInputElement | null>(null);
const impFileName = ref('');
const openImp = () => {
  impMode.value = 'link';
  impLink.value = '';
  impFileName.value = '';
  if (impFileRef.value) impFileRef.value.value = '';
  impOpen.value = true;
};
const pickImpFile = () => impFileRef.value?.click();
const onImpFile = () => { impFileName.value = impFileRef.value?.files?.[0]?.name ?? ''; };
const confirmImpLink = () => {
  if (!impLink.value.trim()) { pushToast('请输入竞品链接', 'warning'); return; }
  pushToast(`竞品链接已提交（${impPlat.value}），获取完成后自动入列`);
  impOpen.value = false;
};
const confirmImpFile = () => {
  const f = impFileRef.value?.files?.[0];
  if (!f) { pushToast('请先选择 xlsx 文件', 'warning'); return; }
  if (!/\.(xlsx|xls)$/i.test(f.name)) { pushToast('仅支持 xlsx 文件', 'warning'); return; }
  if (f.size > 10 * 1024 * 1024) { pushToast('文件不能超过 10 MB', 'warning'); return; }
  pushToast(`文件「${f.name}」已上传，按文件内容导入商品`);
  impOpen.value = false;
};

/* ---------- SKU 快捷编辑（千牛式）：双入口——列表商品信息列「详」字芯片（单件）、勾选后列头上方选条「编辑商品信息」（批量，微信小店式交互）；
   弹窗保留 SKU 全字段（图片/名称/商品编码/系列编码/成本价/售价/利润/利润率/库存数）＋操作（复制/删除），保存按平台重建种子 SKU 数组回写；
   弹窗 UI 与联动/查询逻辑抽取至共享组件 QuickSkuModal（店铺商品详情视频号快捷编辑复用），类型与构造器由其普通 script 块导出 ---------- */
const quickRow = ref<CreateRow | null>(null);
const quickBatch = ref(false);
const quickDraft = ref<QuickDraftRow[]>([]);
/* 属性配置草稿（与详情 specs/saleAttrs 同构）：弹窗内增删属性值，保存回写种子 */
const quickSpecs = ref<QuickSpec[]>([]);
/* 弹窗与详情页共用同一份按行缓存的详情数据：弹窗复制/改值落到该商品自己的 skus，详情页读到的就是同一批对象 */
const detailOf = (link: string) => (props.jm ? getJmDetail(link) : getTbDetail(link));
const loadQuickSpecs = (link: string) => {
  const dd = detailOf(link);
  const dims: { name: string; values: string[] }[] = (props.jm ? dd.saleAttrs : dd.specs) ?? [];
  quickSpecs.value = dims.map((s) => ({ name: s.name, values: [...s.values] }));
};
/* 种子 SKU → 属性关联：非京麦按 specs 维度序取 color/style；京麦解析 attrs 串（颜色:黑 规格:标准） */
const valsOf = (u: Record<string, string>): Record<string, string> => {
  if (props.jm) return Object.fromEntries((u.attrs ?? '').split(' ').filter(Boolean).map((kv) => { const [k, v] = kv.split(':'); return [k, v]; }));
  const vals: Record<string, string> = { [quickSpecs.value[0]?.name ?? '颜色分类']: u.color, [quickSpecs.value[1]?.name ?? '款式']: u.style };
  /* 第三维起取值随种子 extra 持久化，弹窗与详情展示同一批关联值 */
  const extra = (u as { extra?: Record<string, string> }).extra ?? {};
  quickSpecs.value.forEach((sp, si) => { if (si > 1) vals[sp.name] = extra[String(si)] ?? ''; });
  return vals;
};
/* 每件商品独立展开一组 SKU 行（批量勾选 N 件即 N 组）：src 指向该商品详情缓存里的种子对象，val/vals 每行独立克隆互不串改；保存时按 own 分组、按 src 去重重建 */
const buildDraft = (list: CreateRow[]): QuickDraftRow[] => list.flatMap((row) => {
  const own = detailOf(row.link);
  const skus: Record<string, string>[] = own?.skus ?? [];
  return skus.map((u): QuickDraftRow => (props.jm
    ? { thumb: row.thumb, title: row.title, jm: true, own, src: u, qcode: u.outerId, val: mkVal(u.name, u.outerId, u.series, u.cost, u.jdPrice, u.stock), vals: valsOf(u) }
    : { thumb: row.thumb, title: row.title, jm: false, own, src: u, qcode: u.code, val: mkVal(u.name, u.code, u.series, u.cost, u.price, u.stock), vals: valsOf(u) }));
});
const openQuickSku = (row: CreateRow) => {
  loadQuickSpecs(row.link);
  quickDraft.value = buildDraft([row]);
  quickBatch.value = false;
  quickRow.value = row;
};
/* 批量入口：勾选的每件商品各展开一组 SKU 行（弹窗内按商品分组展示），与单件共用弹窗与回写 */
const batchRows = computed(() => rows.value.filter((r) => selLinks.value.has(r.link)));
const openBatchSku = () => {
  loadQuickSpecs(batchRows.value[0]?.link ?? '');
  quickDraft.value = buildDraft(batchRows.value);
  quickBatch.value = true;
  quickRow.value = null;
};
const closeQuick = () => {
  quickRow.value = null;
  quickBatch.value = false;
};
const saveQuickSku = () => {
  const write = (r: QuickDraftRow) => {
    Object.assign(r.src, r.jm
      ? { name: r.val.name, outerId: r.val.code, series: r.val.series, cost: r.val.cost, jdPrice: r.val.price, stock: r.val.stock }
      : { name: r.val.name, code: r.val.code, series: r.val.series, cost: r.val.cost, price: r.val.price, stock: r.val.stock });
    /* 属性关联回写：京麦重拼 attrs 串（空值维度不落，避免详情页解析出空属性）；非京麦按 specs 维度序写回 color/style */
    if (r.jm) r.src.attrs = quickSpecs.value.filter((sp) => r.vals[sp.name]).map((sp) => `${sp.name}:${r.vals[sp.name]}`).join(' ');
    else {
      r.src.color = r.vals[quickSpecs.value[0]?.name ?? ''] ?? '';
      r.src.style = r.vals[quickSpecs.value[1]?.name ?? ''] ?? '';
      const extra: Record<string, string> = {};
      quickSpecs.value.forEach((sp, si) => { if (si > 1 && r.vals[sp.name]) extra[String(si)] = r.vals[sp.name]; });
      (r.src as { extra?: Record<string, string> }).extra = extra;
    }
    return r.src;
  };
  /* 多组行可能共享同一 src：全部写值后按 src 去重重建，避免条目翻倍 */
  const dedupBySrc = (list: QuickDraftRow[]) => {
    const seen = new Set<Record<string, string>>();
    return list.map(write).filter((s) => !seen.has(s) && (seen.add(s), true));
  };
  /* 按所属商品详情分组回写：各自重建 skus；规格仅在维度数一致时回写（批量勾选到异构商品时不误改） */
  const groups = new Map<Record<string, any>, QuickDraftRow[]>();
  for (const r of quickDraft.value) {
    const own = r.own ?? (props.jm ? (sgJmDetail as Record<string, any>) : (createDetail as Record<string, any>));
    const g = groups.get(own);
    if (g) g.push(r);
    else groups.set(own, [r]);
  }
  groups.forEach((list, own) => {
    const specsBack = quickSpecs.value.map((s) => ({ name: s.name, values: [...s.values] }));
    const dims = props.jm ? own.saleAttrs : own.specs;
    const sameDims = Array.isArray(dims) && dims.length === specsBack.length;
    if (props.jm) {
      own.skus = dedupBySrc(list.filter((r) => r.jm));
      if (sameDims) own.saleAttrs = specsBack;
    } else {
      own.skus = dedupBySrc(list.filter((r) => !r.jm));
      if (sameDims) own.specs = specsBack;
    }
  });
  pushToast(quickBatch.value ? `SKU 信息已保存（${batchRows.value.length} 件商品）` : 'SKU 信息已保存');
  closeQuick();
};
const pubSelOf = (name: string) => pubSel.value.find((s) => s.name === name) ?? null;
const noStrat = computed(() => pubSelOf(PUB_NO_STRATEGY));
const togglePubStrat = (name: string, on: boolean) => {
  if (name === PUB_NO_STRATEGY) {
    // 选择「不使用策略发布」时，清空所有已选策略
    pubSel.value = on ? [newPubSel(PUB_NO_STRATEGY)] : pubSel.value.filter((s) => s.name !== PUB_NO_STRATEGY);
  } else {
    // 选择具体策略时，若已选「不使用策略发布」则清空它
    const filtered = pubSel.value.filter((s) => s.name !== PUB_NO_STRATEGY);
    pubSel.value = on ? [...filtered, newPubSel(name)] : filtered.filter((s) => s.name !== name);
  }
};
const pubStrategyInfo = (name: string) => PUB_STRATEGIES.find((s) => s.name === name) ?? null;
/* 店铺互斥：记录每个店铺被哪个策略选中，其他策略内禁用并提示 */
const shopTakenBy = computed(() => {
  const m = new Map<number, string>();
  pubSel.value.forEach((g) => g.shops.forEach((id) => m.set(id, g.name)));
  return m;
});
/* 店铺离线＝账号管理中该店卖家账号全部离线（RPA 发布依赖在线账号）：禁选＋前往登录引导 */
const pubOfflineShops = computed(() => new Set(amOfflineShopNames.value));
const isShopOffline = (s: PubShop) => pubOfflineShops.value.has(s.name);
/* 前往登录：关闭发布抽屉并桥接设置/账号管理，打开该离线账号的管理抽屉 */
const goLoginShop = (s: PubShop) => {
  const acct = amOfflineSellerOfShop(s.name);
  pubOpen.value = false;
  if (acct) requestShopAcct(acct.acctId);
};
const groupShopsVisible = (g: PubSel) => {
  const q = g.shopQ.trim();
  return PUB_SHOPS.filter((s) => s.platform === g.platform && (!q || s.name.includes(q) || '未分组店铺'.includes(q)));
};
const groupSelectable = (g: PubSel) =>
  groupShopsVisible(g).filter((s) => !isShopOffline(s) && (!shopTakenBy.value.has(s.id) || g.shops.includes(s.id)));
const groupAllChecked = (g: PubSel) => {
  const opts = groupSelectable(g);
  return opts.length > 0 && opts.every((s) => g.shops.includes(s.id));
};
const toggleGroupShop = (g: PubSel, id: number, on: boolean) => {
  g.shops = on ? [...g.shops, id] : g.shops.filter((x) => x !== id);
};
const toggleGroupAll = (g: PubSel, on: boolean) => {
  const ids = groupSelectable(g).map((s) => s.id);
  g.shops = on ? [...new Set([...g.shops, ...ids])] : g.shops.filter((x) => !ids.includes(x));
};
/* 步骤门槛：第一步已选策略（不使用策略须填上架方式）；第二步每个策略至少选一店 */
const pubNextEnabled = computed(() => pubSel.value.length > 0 && pubSel.value.every((g) => !!pubStrategyInfo(g.name) || g.method !== ''));
const pubSubmitEnabled = computed(() => pubSel.value.length > 0 && pubSel.value.every((g) => g.shops.length > 0));
const pubFootInfo = computed(() => `${pubSel.value.length} 个策略 · 共 ${pubSel.value.reduce((n, g) => n + g.shops.length, 0)} 个店铺`);
/* 创建发布任务并模拟异步处理（商品×策略组粒度，逐店随机成功/失败） */
const startPublishTask = (productName: string, shopIds: number[], blHit: BlType | null = null) => {
  /* 创建新任务（store 单例，跨组件/跨关闭累积多任务）；返回值为响应式引用 */
  const liveTask = addPublishTask(productName, shopIds.map((shopId, idx) => {
    const shop = PUB_SHOPS.find((s) => s.id === shopId);
    return {
      id: idx,
      shop: shop?.name ?? `店铺${shopId}`,
      platform: shop?.platform ?? '淘宝',
      status: 'pending' as const,
    };
  }));
  /* 黑品库命中：整单直接失败，逐店写失败原因，不再进入随机推进 */
  if (blHit) {
    const reason = blFailReason(blHit);
    liveTask.items.forEach((it) => { it.status = 'failed'; it.reason = reason; });
    return;
  }
  let idx = 0;
  /* 风控命中演示：任务创建时命中公司风险项——垃圾品管控直接取消执行；风险管控商品暂停待二次确认 */
  const riskRoll = Math.random();
  const RISK_JUNK = '商品命中公司垃圾品管控，不允许上架';
  if (riskRoll < 0.15) {
    liveTask.risk = { status: 'cancelled', reason: RISK_JUNK };
    pushGMsg({
      app: '智能运营中心', kind: '人工介入提醒', title: '发布任务风控取消',
      desc: RISK_JUNK + '，发布任务已自动取消',
      target: 'ops-center',
      kvs: [{ k: '商品名称', v: productName }],
    });
    return;
  }
  if (riskRoll < 0.35) {
    liveTask.risk = { status: 'confirm', reason: '该商品为公司风险管控商品，上架可能会导致亏损，是否确认上架？' };
    setPublishRiskResume(liveTask.id, () => window.setTimeout(processNext, 500));
    pushGMsg({
      app: '智能运营中心', kind: '人工介入提醒', title: '发布任务风险待确认',
      desc: '商品命中公司风险管控，上架可能会导致亏损，发布任务已暂停，请确认后继续上架或取消任务',
      target: 'ops-center',
      kvs: [{ k: '商品名称', v: productName }],
    });
    return;
  }
  /* 验证码人工介入演示：任务中途随机暂停一次，同步推送站内信，发布进度面板处理后续跑 */
  const interveneAt = liveTask.items.length > 2 && Math.random() < 0.5
    ? 1 + Math.floor(Math.random() * (liveTask.items.length - 1))
    : -1;
  let intervened = false;
  const processNext = () => {
    if (idx >= liveTask.items.length) return;
    if (idx === interveneAt && !intervened) {
      intervened = true;
      const item = liveTask.items[idx];
      liveTask.intervene = { shop: item.shop, platform: item.platform, code: String(Math.floor(1000 + Math.random() * 9000)) };
      setPublishResume(liveTask.id, processNext);
      pushGMsg({
        app: '智能运营中心', kind: '人工介入提醒', title: '商品发布需人工介入',
        desc: 'RPA 发布商品过程中弹出验证码，发布任务已暂停，请人工完成验证后恢复发布',
        target: 'ops-center',
        kvs: [{ k: '店铺名称', v: item.shop }, { k: '商品名称', v: liveTask.productName }],
      });
      return;
    }
    const item = liveTask.items[idx];
    /* 逐店铺风控命中（与任务中心一品一店一任务同口径）：垃圾品管控直接风控取消；风险管控商品暂停待二次确认 */
    const itemRoll = Math.random();
    if (itemRoll < 0.1) {
      item.status = 'cancelled';
      item.reason = RISK_JUNK;
      pushGMsg({
        app: '智能运营中心', kind: '人工介入提醒', title: '发布任务风控取消',
        desc: `${item.shop}：${RISK_JUNK}，该店铺发布任务已自动取消`,
        target: 'ops-center',
        kvs: [{ k: '商品名称', v: productName }, { k: '店铺名称', v: item.shop }],
      });
      idx++;
      if (idx < liveTask.items.length) window.setTimeout(processNext, 300 + Math.random() * 400);
      return;
    }
    if (itemRoll < 0.25) {
      item.status = 'confirm';
      item.reason = '该商品为公司风险管控商品，上架可能会导致亏损，是否确认上架？';
      setPublishRiskResume(liveTask.id, () => window.setTimeout(processNext, 500));
      pushGMsg({
        app: '智能运营中心', kind: '人工介入提醒', title: '发布任务风险待确认',
        desc: `${item.shop}：商品命中公司风险管控，上架可能会导致亏损，发布任务已暂停，请确认后继续上架或取消任务`,
        target: 'ops-center',
        kvs: [{ k: '商品名称', v: productName }, { k: '店铺名称', v: item.shop }],
      });
      return;
    }
    /* 模拟 50% 成功率（便于演示失败场景） */
    const success = Math.random() > 0.5;
    item.status = success ? 'success' : 'failed';
    if (!success) {
      const reasons = ['商品信息检查不通过，错误码:6600016 原因:类目错误', '库存不足，无法上架', '发品数量已达上限'];
      item.reason = reasons[Math.floor(Math.random() * reasons.length)];
    }
    idx++;
    if (idx < liveTask.items.length) {
      window.setTimeout(processNext, 300 + Math.random() * 400);
    }
  };
  window.setTimeout(processNext, 500);
};
const submitPub = () => {
  const products = pubProducts.value;
  const sels = pubSel.value;
  pubOpen.value = false;
  products.forEach((p) => {
    /* 黑品库匹配标识：SKU 商品编码 / 系列编码 / 链接商品ID（link 中 id= 段） */
    const d = props.jm ? getJmDetail(p.link) : getTbDetail(p.link);
    const skus: Record<string, any>[] = d?.skus ?? [];
    const codes = skus.map((u) => String(props.jm ? u.outerId ?? '' : u.code ?? '')).filter(Boolean);
    const series = skus.map((u) => String(u.series ?? '')).filter(Boolean);
    const linkId = /[?&]id=(\d+)/.exec(p.link)?.[1] ?? '';
    const hit = matchBlacklist(codes, series, linkId);
    sels.forEach((g) => startPublishTask(p.title, g.shops, hit));
  });
  pushToast(`已创建 ${products.length * sels.length} 个发布任务`);
};
const pubLogo = (p: string) => PLATFORM_LOGO[p] ?? '/logos/taobao.png';
/* 删除二次确认 */
const delRow = ref<CreateRow | null>(null);
/* 关联发布任务：抽屉展示该商品在任务中心的发布批次（同源联动，重试同步任务列表状态） */
const pubRow = ref<CreateRow | null>(null);
const pubTasks = computed<SubTask[]>(() => parentTasks.find((p) => p.pubFor === pubRow.value?.link)?.subs ?? []);
const pubSortAsc = ref(true);
const openPubDrawer = (row: CreateRow) => {
  pubRow.value = row;
  pubSortAsc.value = true;
  resetPubFilter();
  pubChecked.value = [];
};
const sortedPubTasks = computed(() => [...pubTasks.value].sort((a, b) => (pubSortAsc.value ? a.startTime.localeCompare(b.startTime) : b.startTime.localeCompare(a.startTime))));
/* 商品全局唯一，抽到列表上方摘要区；表格留变化列，任务状态 tab 即切即筛 */
const pubLinkId = computed(() => pubTasks.value[0]?.linkId ?? '');
const pubLastUpdate = computed(() => {
  const ts = pubTasks.value.map((t) => t.endTime).filter(Boolean).sort();
  return ts.length ? ts[ts.length - 1] : '–';
});
const pubTab = ref('all');
const pubTabs = computed(() => [
  { key: 'all', text: '全部', n: pubTasks.value.length },
  { key: 'queued', text: '队列中', n: pubTasks.value.filter((s) => s.status === 'queued').length },
  { key: 'running', text: '执行中', n: pubTasks.value.filter((s) => s.status === 'running').length },
  { key: 'done', text: '已完成', n: pubTasks.value.filter((s) => s.status === 'success').length },
  { key: 'failed', text: '执行失败', n: pubTasks.value.filter((s) => s.status === 'failed').length },
]);
const visiblePubTasks = computed(() => sortedPubTasks.value.filter((s) => {
  return pubTab.value === 'all' || (pubTab.value === 'done' ? s.status === 'success' : s.status === pubTab.value);
}));
const resetPubFilter = () => {
  pubTab.value = 'all';
};
/* 选择列：仅失败任务可勾选，勾选后支持批量重新发布 */
const pubChecked = ref<number[]>([]);
const failedVisible = computed(() => visiblePubTasks.value.filter((s) => s.status === 'failed'));
const allFailedChecked = computed(() => failedVisible.value.length > 0 && failedVisible.value.every((s) => pubChecked.value.includes(s.id)));
const togglePubCheck = (id: number, on: boolean) => {
  pubChecked.value = on ? [...pubChecked.value, id] : pubChecked.value.filter((x) => x !== id);
};
const toggleAllFailed = (on: boolean) => {
  const ids = failedVisible.value.map((s) => s.id);
  pubChecked.value = on ? [...new Set([...pubChecked.value, ...ids])] : pubChecked.value.filter((x) => !ids.includes(x));
};
const batchRetryPub = () => {
  if (!pubChecked.value.length) {
    pushToast('请先勾选需要重新发布的任务');
    return;
  }
  const subs = pubTasks.value.filter((s) => pubChecked.value.includes(s.id));
  pubChecked.value = [];
  subs.forEach((s) => retrySub(s));
  pushToast('重新发布中…');
  window.setTimeout(() => pushToast(`重新发布成功（${subs.length} 个任务）`), 1200);
};
const pubStatusText: Record<SubTask['status'], string> = { queued: '队列中', running: '执行中', success: '已完成', failed: '执行失败', confirm: '待确认', cancelled: '已取消' };
const pubStatusCls: Record<SubTask['status'], string> = { queued: 'queued', running: 'running', success: 'done', failed: 'failed', confirm: 'confirm', cancelled: 'cancelled' };
const retryPub = (sub: SubTask) => {
  pubChecked.value = pubChecked.value.filter((x) => x !== sub.id);
  retrySub(sub);
  pushToast('重新发布中…');
  window.setTimeout(() => pushToast('重新发布成功'), 1200);
};

/* 详情查看态入口：打开同一抽屉 */
const openPubFromDetail = () => {
  if (detail.value) openPubDrawer(detail.value);
};

const copyRow = (row: CreateRow) => {
  rows.value = rows.value.flatMap((r) => (r.link === row.link ? [r, { ...r, link: `${row.link}-copy-${Date.now()}` }] : [r]));
};
const confirmDelete = () => {
  if (!delRow.value) return;
  const link = delRow.value.link;
  rows.value = rows.value.filter((r) => r.link !== link);
  delRow.value = null;
};
/* ESC 关闭发布抽屉（遮罩点击同样可关） */
const onPubKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && viewKey.value) { viewKey.value = null; return; }
  if (e.key === 'Escape' && pubOpen.value) pubOpen.value = false;
};
onMounted(() => window.addEventListener('keydown', onPubKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onPubKey));
</script>

<template>
  <JmCreateDetailPage v-if="detail && props.jm" :row="detail" @back="detail = null" @open-pub="openPubFromDetail" />
  <CreateDetailPage v-else-if="detail" :row="detail" :video="props.video" @back="detail = null" @open-pub="openPubFromDetail" />
  <!-- 图片管理二级页：花瓣式全幅白底无卡壳（无切割感）；头部（返回＋标题＋批量操作栏）与瀑布流同白底无缝 -->
  <div v-else-if="imgPage" class="cp-imgpage">
    <div class="cp-imgpage-hd">
      <button class="sgd-back" title="返回" @click="imgPage = false">←</button>
      <span class="cp-imgpage-title">图片管理</span>
      <div class="cp-img-bar">
        <span class="cp-img-sel">已选 <b>{{ selTags.size }}</b> 个标签 · <b>{{ selImgKeys.size }}</b> 张图片</span>
        <button class="lightBtn" :disabled="wmSel.length === 0" @click="batchWm">批量去水印{{ wmSel.length ? `(${wmSel.length})` : '' }}</button>
        <button class="lightBtn" :disabled="brandSel.length === 0" @click="batchBrand">批量去品牌{{ brandSel.length ? `(${brandSel.length})` : '' }}</button>
        <button class="lightBtn cp-img-del" :disabled="selImgKeys.size === 0" @click="batchDelImgs">批量删除{{ selImgKeys.size ? `(${selImgKeys.size})` : '' }}</button>
        <button class="lightBtn" :disabled="selTags.size === 0" @click="clearSel">清除选择</button>
      </div>
    </div>
    <!-- 瀑布流瓷砖：窄列宽＋高度按比例自适应；圆角统一 16px 裁切；图下文字行居中，去水印可重复执行不置灰，去品牌已处理置灰 -->
    <div ref="flatRef" class="cp-img-flat">
      <div v-for="(col, ci) in imgCols" :key="ci" class="cp-img-col">
        <div v-for="im in col" :key="im.key" class="cp-img-card">
          <div class="cp-img-thumb" @mouseenter="placeZoom" @click="openView(im)">
            <img :src="im.src" alt="">
            <!-- 悬浮预览：放大图＋同组选择操作；面板为瓷砖子节点，透明下垫桥接 hover 不移出即不收起 -->
            <div class="cp-img-zoom">
              <div class="cp-img-zbox">
                <img :src="im.src" alt="">
                <div class="cp-img-ops">
                  <button
                    v-for="op in imgOps(im)" :key="op.t"
                    class="cp-img-op" :class="{ off: op.done, on: selTags.has(tagId(im.key, op.t)), busy: op.busy }"
                    :disabled="op.done || op.busy" @click.stop="toggleTag(tagId(im.key, op.t))"
                  >
                    <i class="cp-img-ck" />{{ op.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="cp-img-ops">
            <button
              v-for="op in imgOps(im)" :key="op.t"
              class="cp-img-op" :class="{ off: op.done, on: selTags.has(tagId(im.key, op.t)), busy: op.busy }"
              :disabled="op.done || op.busy" @click="toggleTag(tagId(im.key, op.t))"
            >
              <i class="cp-img-ck" />{{ op.label }}
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- 点击查看态：全屏查看层；主区大图＋与瀑布流同源操作行，右侧全部图片缩略列独立滚动；滚轮上下切换、右列点击跳转、ESC 或 × 关闭 -->
    <div v-if="viewImg" class="cp-view">
      <div class="cp-view-stage" @wheel="onViewWheel">
        <button class="cp-view-close" title="关闭" @click="viewKey = null">×</button>
        <div class="cp-view-pic"><img :src="viewImg.src" alt=""></div>
        <!-- 查看态两个胶囊钮只做勾选（与瀑布流同一选择集，点击不直接执行），统一由批量栏处理 -->
        <div class="cp-img-ops">
          <button
            v-for="op in imgOps(viewImg)" :key="op.t"
            class="cp-img-op" :class="{ off: op.done, on: selTags.has(tagId(viewImg.key, op.t)) }"
            :disabled="op.done" @click="toggleTag(tagId(viewImg.key, op.t))"
          >
            <i class="cp-img-ck" />{{ op.label }}
          </button>
        </div>
        <!-- 生成记录（详情同款）：查看态底部操作胶囊上方居中展示，点击任一版本即切换使用，选中版本加角标 -->
        <div v-if="wmRecsOf(viewImg.key).length > 1" class="cp-img-vers">
          <button
            v-for="r in wmRecsOf(viewImg.key)" :key="r.id"
            type="button" class="cp-img-ver" :class="{ on: wmActiveOf(viewImg.key) === r.id }"
            @click.stop="selectWmRec(viewImg.key, r.id)"
          >
            {{ r.label }}
            <i v-if="wmActiveOf(viewImg.key) === r.id" class="cp-img-ver-ck">✓</i>
          </button>
        </div>
        <span class="cp-view-idx">{{ viewIdx + 1 }} / {{ imgs.length }}</span>
      </div>
      <div ref="viewRailRef" class="cp-view-rail">
        <button
          v-for="(im, i) in imgs" :key="im.key"
          class="cp-view-rail-item" :class="{ on: i === viewIdx }"
          @click="viewKey = im.key"
        >
          <img :src="im.src" alt="">
        </button>
      </div>
    </div>
  </div>
  <div v-else class="create-page">
    <div class="ib-filters create-filter">
      <div class="ib-grid">
        <div class="ib-field">
          <label>商机来源</label>
          <BubbleSelect class-name="ib-select" default-value="全部" :options="['全部', '内部商机', '市场商机', '链接商品库']" />
        </div>
        <div class="ib-field">
          <label>来源平台</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="淘宝"
            :options="['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴']"
          />
        </div>
        <div class="ib-field">
          <label>链接商品ID</label>
          <input class="ib-input" placeholder="请输入链接商品ID" />
        </div>
        <div class="ib-field">
          <label>商品名称</label>
          <input class="ib-input" placeholder="请输入商品名称" />
        </div>
        <div class="ib-field">
          <label>状态</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="全部"
            :options="['全部', '已完善', '待完善']"
          />
        </div>
        <div class="ib-field">
          <label>发布店铺名</label>
          <input class="ib-input" placeholder="请输入发布店铺名" />
        </div>
        <div class="ib-field">
          <label>创建人名称</label>
          <input class="ib-input" placeholder="请输入创建人名称" />
        </div>
        <div class="ib-field">
          <label>创建时间</label>
          <DateRangePicker v-model:from="createDateFrom" v-model:to="createDateTo" placeholder="请选择日期范围" />
        </div>
        <div class="create-actions-inline">
          <div class="create-act-left">
            <button class="primaryBtn" :disabled="selLinks.size === 0" @click="openQuickPub">快速铺货</button>
            <button class="primaryBtn" @click="openImp">竞品导入</button>
          </div>
          <div class="create-act-right">
            <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
            <ColFieldPop :st="cf" />
            <button class="lightBtn">重置</button>
            <button class="primaryBtn">查询</button>
          </div>
        </div>
      </div>
    </div>

    <div class="ib-table-card">
      <!-- 微信小店式批量入口：勾选后列头上方展示「已选 N 条＋编辑商品信息」选条，点击弹窗批量编辑 SKU 关键信息 -->
      <div v-if="selLinks.size > 0" class="cp-selbar">
        <span class="cp-selbar-count">已选 <b>{{ selLinks.size }}</b> 条</span>
        <button class="lightBtn" @click="openBatchSku">编辑商品信息</button>
        <!-- 图片管理入口：勾选后选条内展示，点击进入二级页批量管理勾选商品图片 -->
        <button class="lightBtn cp-img-entry" @click="imgPage = true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" />
            <circle cx="5.5" cy="6.5" r="1.5" fill="currentColor" />
            <path d="M2.5 11.5l3.5-3 3 2.5 2.5-2 2 1.8" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          图片管理
        </button>
      </div>
      <div class="ib-table-wrap">
        <table class="ib-table create-table">
          <thead>
            <tr>
              <th :style="{ width: '4%' }">
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="allChecked"
                  @change="toggleSelAll(($event.target as HTMLInputElement).checked)
                  "
                />
              </th>
              <template v-for="c in midCols" :key="c.key">
                <SortTh v-if="c.key === 'created'" :label="c.label" :state="createSortState()" @sort="onCreateSort" />
                <th v-else>{{ c.label }}</th>
              </template>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in sortedRows" :key="row.link">
              <td>
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="selLinks.has(row.link)"
                  @change="toggleSel(row.link, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <template v-for="c in midCols" :key="c.key">
                <td v-if="c.key === 'product'">
                  <div class="create-product">
                    <img class="create-thumb" :src="row.thumb" alt="thumb" />
                    <div class="create-product-info">
                      <div class="create-product-title">
                        <!-- 平台展示统一官方图标（PLATFORM_LOGO），不用文字徽章 -->
                        <img class="create-platform-logo" :src="pubLogo(row.platformBadge)" :alt="row.platformBadge" />
                        <Ellipsis class-name="create-title-ell" :text="row.title" />
                      </div>
                      <div class="create-link">
                        竞品链接：<a href="#"><Ellipsis class-name="create-link-ell" :text="row.link" /></a>
                      </div>
                    </div>
                    <!-- 千牛式 SKU 快捷编辑入口：「详」字芯片与商品主图居中对齐 -->
                    <button type="button" class="cp-quick-sku" title="快捷编辑SKU" @click.stop="openQuickSku(row)">详</button>
                  </div>
                </td>
                <td v-else-if="c.key === 'store'" class="create-store-text">{{ row.store }}</td>
                <td v-else-if="c.key === 'status'">
                  <span class="sgd-tag" :class="i % 2 ? 'orange' : 'green'">{{ i % 2 ? '待完善' : '已完善' }}</span>
                </td>
                <td v-else-if="c.key === 'created'">
                  <div class="create-person">{{ row.person }}</div>
                  <div class="create-time">{{ row.time }}</div>
                </td>
              </template>
              <td class="create-ops">
                <a href="#" @click.prevent="detail = row">详情</a>
                <a
                  href="#"
                  @click.prevent="openPubTo([row])"
                >
                  发布到
                </a>
                <MoreActions
                  :items="[
                    { label: '关联发布任务', onClick: () => openPubDrawer(row) },
                    { label: '复制', onClick: () => copyRow(row) },
                    { label: '删除', danger: true, onClick: () => (delRow = row) },
                  ]"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 128 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn">2</button>
          <button class="ib-pagebtn">3</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="delRow" class="cp-modal-mask">
        <div class="cp-modal">
          <div class="cp-modal-title">删除确认</div>
          <div class="cp-modal-text">商品模版删除后无法恢复，是否确认删除？</div>
          <div class="cp-modal-foot">
            <button class="cp-btn" @click="delRow = null">取消</button>
            <button
              class="cp-btn danger"
              @click="confirmDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>

    </Teleport>
  </div>

  <!-- 关联发布任务抽屉：置于 .ops-center 内复用 tc-table 样式；与列表/详情并列，详情查看态亦可打开 -->
  <div v-if="pubRow" class="cp-drawer-mask" @click="pubRow = null" />
    <div v-if="pubRow" class="cp-drawer">
      <div class="cp-drawer-head">
        <span>关联发布任务</span>
        <button type="button" title="关闭" @click="pubRow = null">✕</button>
      </div>
      <div class="cp-drawer-body">
        <div class="cp-drawer-summary">
          <img class="tc-thumb" :src="pubRow.thumb" />
          <div class="cp-sum-main">
            <div class="cp-sum-name">{{ pubRow.title }}</div>
            <div class="cp-sum-meta">竞品链接：{{ pubLinkId }}</div>
          </div>
          <div class="cp-sum-item">
            <label>最近更新时间</label>
            <span>{{ pubLastUpdate }}</span>
          </div>
        </div>
        <div class="cp-drawer-filter">
          <div class="tc-tabs cp-f-tabs">
            <button
              v-for="t in pubTabs"
              :key="t.key"
              class="tc-tab"
              :class="pubTab === t.key ? 'active' : ''"
              @click="pubTab = t.key"
            >
              {{ t.text }}<span class="tc-count">{{ t.n }}</span>
            </button>
          </div>
          <button class="cp-repub-btn" @click="batchRetryPub">重新发布</button>
        </div>
        <table class="tc-table tc-detail">
          <thead>
            <tr>
              <th :style="{ width: '48px' }">
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="allFailedChecked"
                  @change="toggleAllFailed(($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th>任务ID</th>
              <th>发布信息</th>
              <th>任务状态</th>
              <th>节点状态</th>
              <SortTh label="执行起止时间" :state="pubSortAsc ? 'asc' : 'desc'" @sort="pubSortAsc = !pubSortAsc" />
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in visiblePubTasks" :key="s.id">
              <td>
                <input
                  v-if="s.status === 'failed'"
                  type="checkbox"
                  class="ib-check"
                  :checked="pubChecked.includes(s.id)"
                  @change="togglePubCheck(s.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td>{{ String(s.taskId).padStart(6, '0') }}</td>
              <td>
                <div class="tc-cell-lines">
                  <div>{{ s.publisher || '–' }} · {{ s.shops[0]?.shop ?? '–' }}</div>
                </div>
              </td>
              <td>
                <span class="tc-st" :class="pubStatusCls[s.status]"><i />{{ pubStatusText[s.status] }}</span>
              </td>
              <td>
                <TcStepsCell :sub="s" type="商品发布" />
              </td>
              <td>
                <div class="tc-cell-lines">
                  <div>起：{{ s.startTime || '–' }}</div>
                  <div>止：{{ s.endTime || '–' }}</div>
                </div>
              </td>
              <td class="actions-col">
                <a v-if="s.status === 'failed'" class="tc-link" @click.prevent="retryPub(s)">重试</a>
                <span v-else class="tc-dash">–</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  <!-- 竞品导入抽屉：修改竞品信息（导入方式 segment 双态：链接导入 / 文件导入） -->
  <div v-if="impOpen" class="cp-drawer-mask" @click="impOpen = false" />
  <div v-if="impOpen" class="cp-drawer cp-imp-drawer">
    <div class="cp-drawer-head">
      <span>修改竞品信息</span>
      <button type="button" title="关闭" @click="impOpen = false">✕</button>
    </div>
    <div class="cp-drawer-body">
      <div class="cp-imp-field">
        <label>导入方式</label>
        <div class="cp-imp-seg">
          <button :class="{ on: impMode === 'link' }" @click="impMode = 'link'">链接导入</button>
          <button :class="{ on: impMode === 'file' }" @click="impMode = 'file'">文件导入</button>
        </div>
      </div>
      <template v-if="impMode === 'link'">
        <div class="cp-imp-field">
          <label>平台</label>
          <BubbleSelect class-name="ib-select" :value="impPlat" :options="IMP_PLATS" @change="(v: string) => { impPlat = v; }" />
        </div>
        <div class="cp-imp-field">
          <label>入口链接</label>
          <input v-model="impLink" class="ib-input" placeholder="请输入竞品链接" />
        </div>
      </template>
      <template v-else>
        <div class="cp-imp-field">
          <label>商品文件</label>
          <div>
            <button class="lightBtn" @click="pickImpFile">选择 xlsx 文件</button>
            <span v-if="impFileName" class="cp-imp-filename">{{ impFileName }}</span>
          </div>
          <p class="cp-imp-tip">请上传「聚水潭商品库 → 导出商品」生成的 xlsx（不超过 10 MB），导入以文件内容为准，可先在表格里改价、改图再导入。</p>
        </div>
      </template>
    </div>
    <div class="cp-imp-foot">
      <button v-if="impMode === 'link'" class="primaryBtn" @click="confirmImpLink">确认并获取竞品信息</button>
      <button v-else class="primaryBtn" @click="confirmImpFile">确认并导入商品</button>
    </div>
    <input ref="impFileRef" class="cp-imp-fileinput" type="file" accept=".xlsx,.xls" @change="onImpFile" />
  </div>

  <!-- SKU 快捷编辑弹窗：共享组件 QuickSkuModal（含 pm-host 宿主层），保存回写详情种子 -->
  <QuickSkuModal
    v-if="quickRow || quickBatch"
    :draft="quickDraft"
    :batch="quickBatch"
    :specs="quickSpecs"
    :sub="quickBatch ? `已选 ${batchRows.length} 件商品` : quickRow?.title ?? ''"
    :jm="props.jm"
    @close="closeQuick"
    @save="saveQuickSku"
  />

  <!-- 发布到抽屉：两步向导——第一步多选策略 / 第二步按策略选店铺（店铺跨策略互斥） -->
  <div v-if="pubOpen" class="cp-drawer-mask" @click="pubOpen = false" />
  <div v-if="pubOpen" class="cp-pub-drawer">
    <div class="cp-pub-head">
      <span>{{ pubProducts.length > 1 ? '快速铺货' : '发布到' }}</span>
      <div class="cp-pub-steps">
        <span :class="pubStep === 1 ? 'active' : ''">1 选择策略</span>
        <i />
        <span :class="pubStep === 2 ? 'active' : ''">2 选择店铺</span>
      </div>
    </div>
    <div class="cp-pub-body">
      <template v-if="pubStep === 1">
        <div class="cp-pub-label">选择发布策略<i>*</i></div>
        <label
          v-for="s in pubStrategies"
          :key="s.name"
          class="cp-pub-strat"
          :class="pubSelOf(s.name) ? 'on' : ''"
        >
          <input
            type="checkbox"
            class="ib-check"
            :checked="!!pubSelOf(s.name)"
            @change="togglePubStrat(s.name, ($event.target as HTMLInputElement).checked)"
          />
          <span class="cp-pub-strat-main">
            <b>{{ s.name }}</b>
            <span class="cp-pub-strat-meta">上架方式：{{ s.pubMethod }} · 发布方式：{{ s.pubWay }} · 控利：{{ s.profitMode }} {{ s.profitRate }}</span>
          </span>
        </label>
        <label class="cp-pub-strat" :class="noStrat ? 'on' : ''">
          <input
            type="checkbox"
            class="ib-check"
            :checked="!!noStrat"
            @change="togglePubStrat(PUB_NO_STRATEGY, ($event.target as HTMLInputElement).checked)"
          />
          <span class="cp-pub-strat-main"><b>{{ PUB_NO_STRATEGY }}</b></span>
        </label>
        <div v-if="noStrat" class="cp-pub-nostrat">
          <div class="cp-pub-label">上架方式<i>*</i></div>
          <div class="cp-pub-radios">
            <label><input v-model="noStrat.method" type="radio" name="cp-nostrat-m" value="直接上架" />直接上架</label>
            <label><input v-model="noStrat.method" type="radio" name="cp-nostrat-m" value="放入仓库" />放入仓库</label>
          </div>
          <div class="cp-pub-label mt">发布方式<i>*</i></div>
          <div class="cp-pub-radios">
            <label><input v-model="noStrat.way" type="radio" name="cp-nostrat-w" value="蜂联发布" />蜂联发布</label>
            <label><input v-model="noStrat.way" type="radio" name="cp-nostrat-w" value="插件发布" />插件发布</label>
          </div>
        </div>
      </template>
      <template v-else>
        <div v-for="g in pubSel" :key="g.name" class="cp-pubg">
          <div class="cp-pubg-head">
            <b>{{ g.name }}</b>
            <span v-if="pubStrategyInfo(g.name)" class="cp-pubg-meta">
              上架方式：{{ pubStrategyInfo(g.name)!.pubMethod }} · 发布方式：{{ pubStrategyInfo(g.name)!.pubWay }}
            </span>
            <span v-else class="cp-pubg-meta">上架方式：{{ g.method }} · 发布方式：{{ g.way }}</span>
          </div>
          <div class="cp-pubg-body">
            <div class="cp-pub-shopbar">
              <div class="cp-pub-search">
                <input v-model="g.shopQ" class="ib-input" placeholder="店铺名称/分组名称" />
                <!-- 清除钮：框内右侧实心灰圆× 有值才显，与全局查询条件清除规范一致 -->
                <button v-if="g.shopQ" type="button" class="cp-pub-clear" title="清除" @click="g.shopQ = ''">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
                </button>
              </div>
              <BubbleSelect
                class-name="ib-select cp-pub-plat"
                :value="g.platform"
                :options="pubPlatforms"
                @change="(v) => (g.platform = v)"
              />
            </div>
            <div class="cp-pub-group-head">
              <label>
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="groupAllChecked(g)"
                  @change="toggleGroupAll(g, ($event.target as HTMLInputElement).checked)"
                />
                <b>未分组店铺</b>
              </label>
              <button type="button" class="cp-pub-caret" @click="g.groupOpen = !g.groupOpen">{{ g.groupOpen ? '▼' : '►' }}</button>
            </div>
            <template v-if="g.groupOpen">
              <label
                v-for="s in groupShopsVisible(g)"
                :key="s.id"
                class="cp-pub-shop"
                :class="[
                  shopTakenBy.has(s.id) && shopTakenBy.get(s.id) !== g.name ? 'taken' : '',
                  isShopOffline(s) ? 'offline' : '',
                ]"
              >
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="g.shops.includes(s.id)"
                  :disabled="(shopTakenBy.has(s.id) && shopTakenBy.get(s.id) !== g.name) || isShopOffline(s)"
                  @change="toggleGroupShop(g, s.id, ($event.target as HTMLInputElement).checked)"
                />
                <img :src="pubLogo(s.platform)" alt="" />
                <span class="cp-pub-shop-txt">
                  <span class="plat">{{ s.platform }}</span>
                  <span class="name">{{ s.name }}</span>
                </span>
                <!-- 离线店铺：禁选＋离线徽章＋前往登录入口（桥接账号管理卖家离线账号） -->
                <template v-if="isShopOffline(s)">
                  <span class="cp-pub-offline">离线</span>
                  <a class="cp-pub-gologin" href="#" @click.prevent="goLoginShop(s)">前往登录</a>
                </template>
                <span v-else-if="shopTakenBy.has(s.id) && shopTakenBy.get(s.id) !== g.name" class="cp-pub-taken">已被 {{ shopTakenBy.get(s.id) }} 选择</span>
              </label>
              <div v-if="groupShopsVisible(g).length === 0" class="cp-pub-empty">暂无店铺</div>
            </template>
          </div>
        </div>
      </template>
    </div>
    <div class="cp-pub-foot">
      <span v-if="pubStep === 2" class="cp-pub-footinfo">{{ pubFootInfo }}</span>
      <template v-if="pubStep === 1">
        <button class="cp-btn" @click="pubOpen = false">取消</button>
        <button class="cp-btn primary" :disabled="!pubNextEnabled" @click="pubStep = 2">下一步</button>
      </template>
      <template v-else>
        <button class="cp-btn" @click="pubStep = 1">上一步</button>
        <button class="cp-btn" @click="pubOpen = false">取消</button>
        <button class="cp-btn primary" :disabled="!pubSubmitEnabled" @click="submitPub">立即发布</button>
      </template>
    </div>
  </div>
</template>
