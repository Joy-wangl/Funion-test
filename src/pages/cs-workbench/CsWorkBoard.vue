<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { kbV2Products, type KbV2Code } from '../knowledge/goodsKbV2Data';
import { KB_IMAGE_CATS, type KbImageCat } from '../knowledge/data';
import { onlineHitCats, qcShops, shopGradeOf, GRADE_COLOR } from '../quality/qcOnlineData';
import './CsWorkBoard.css';

/* ============ 客服工作台右侧看板：优化提示 + 商品知识 + 标记会话（支持收起为三 icon） ============ */

/* 当前会话（父组件传入）：看板三页签内容随会话切换——商品知识/标记会话绑定会话商品，优化提示绑定会话店铺 */
interface CsSession { id: number; shopId: string; plat: string; productId: string; skuName?: string; optKind: 'shop' | 'exp'; orderItemIds?: string[]; browseItemIds?: string[]; }
const props = defineProps<{ session: CsSession }>();

/* 媒体悬浮气泡：查看＝预览弹窗；发送到当前会话＝回投客服工作台聊天区（父组件监听追加卖家消息） */
const emit = defineEmits<{ (e: 'send-media', m: { kind: 'img' | 'video'; src: string; label: string }): void }>();
const preview = ref<null | { kind: 'img' | 'video'; src: string; label: string }>(null);
const openPreview = (kind: 'img' | 'video', m: { src: string; label: string }) => { preview.value = { kind, src: m.src, label: m.label }; };
const sendMedia = (kind: 'img' | 'video', m: { src: string; label: string }) => emit('send-media', { kind, src: m.src, label: m.label });

const collapsed = ref(true);

/* ---------- 悬浮球 / 独立浮层看板：均可拖动定位（位置仅本页生效，展开不挤压会话/聊天等其它内容） ---------- */
const BALL = 52;
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const ballPos = ref({ x: 76, y: (typeof window !== 'undefined' ? window.innerHeight : 900) - BALL - 24 });
let ballDrag: null | { sx: number; sy: number; ox: number; oy: number; moved: boolean } = null;
const onBallDown = (e: PointerEvent) => {
  ballDrag = { sx: e.clientX, sy: e.clientY, ox: ballPos.value.x, oy: ballPos.value.y, moved: false };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};
const onBallMove = (e: PointerEvent) => {
  if (!ballDrag) return;
  const dx = e.clientX - ballDrag.sx;
  const dy = e.clientY - ballDrag.sy;
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) ballDrag.moved = true;
  ballPos.value = {
    x: clamp(ballDrag.ox + dx, 8, window.innerWidth - BALL - 8),
    y: clamp(ballDrag.oy + dy, 8, window.innerHeight - BALL - 8),
  };
};
const onBallUp = () => {
  const moved = ballDrag?.moved;
  ballDrag = null;
  if (!moved) openBoard();
};

/* 看板为独立浮层（fixed 定位、可拖），展开/拖动均不改变其它内容布局 */
const panelPos = ref<null | { x: number; y: number }>(null);
let panelDrag: null | { sx: number; sy: number; ox: number; oy: number } = null;
const openBoard = () => {
  if (!panelPos.value) panelPos.value = { x: 88, y: 96 };
  collapsed.value = false;
};
const onHeadDown = (e: PointerEvent) => {
  if ((e.target as HTMLElement).closest('.cwb-fold')) return;
  const p = panelPos.value ?? { x: 88, y: 96 };
  panelDrag = { sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};
const onHeadMove = (e: PointerEvent) => {
  if (!panelDrag) return;
  panelPos.value = {
    x: clamp(panelDrag.ox + e.clientX - panelDrag.sx, 0, window.innerWidth - 120),
    y: clamp(panelDrag.oy + e.clientY - panelDrag.sy, 0, window.innerHeight - 48),
  };
};
const onHeadUp = () => { panelDrag = null; };

/* ---------- 标记会话：标签源＝运维-线上问题配置大类/小类 ----------
   两级下钻：第一级列问题大类；点大类进第二级选该大类小类；可返回上一级 */
const cats = computed(() => onlineHitCats());
/* 标签·问题类型：大类各自独立收起/展开（默认收起），展开后子标签横排成整行带；点子标签即选中打标 */
const openCats = ref<string[]>([]);
const isCatOpen = (name: string) => openCats.value.includes(name);
const toggleCat = (name: string) => {
  const i = openCats.value.indexOf(name);
  if (i < 0) openCats.value.push(name); else openCats.value.splice(i, 1);
};
/* 点空白收起已展开的子标签带：子标签带/大类按钮为热区不收起，看板头部为拖拽柄亦排除 */
const onDocClick = (e: MouseEvent) => {
  if (!openCats.value.length) return;
  const t = e.target as HTMLElement;
  if (t.closest('.cwb-sub-row') || t.closest('.cwb-cat-tag') || t.closest('.cwb-head')) return;
  openCats.value = [];
};
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

/* 关联商品：仅保留商品编码打标，默认直接展示商品编码分组
   商品编码按所属系列编码分组展示：系列编码为组标题，组内为该系列的商品编码；组内编码数大于一时提供「全部」快选 */
const fixedSeries = computed(() => kbV2Products.find((p) => p.id === props.session.productId) ?? kbV2Products[0]);
interface CodeGroup { key: string; title: string; codes: { value: string; label: string }[] }
const codeGroups = computed<CodeGroup[]>(() => {
  const p = fixedSeries.value;
  if (!p) return [];
  return [{ key: p.id, title: p.name, codes: p.codes.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` })) }];
});
const allCodesOf = (g: CodeGroup) => g.codes.map((c) => c.value);
const allCodes = () => codeGroups.value.flatMap(allCodesOf);
/* 商品编码支持多选；「全部」＝组内全选快选（选中全部时各商品编码同处选中态） */
const selCodes = ref<string[]>(allCodes());
const isAllOf = (g: CodeGroup) => allCodesOf(g).every((v) => selCodes.value.includes(v));
const toggleCode = (v: string) => {
  const i = selCodes.value.indexOf(v);
  if (i < 0) selCodes.value.push(v); else selCodes.value.splice(i, 1);
};
const pickAllOf = (g: CodeGroup) => {
  const vals = allCodesOf(g);
  selCodes.value = isAllOf(g)
    ? selCodes.value.filter((v) => !vals.includes(v))
    : [...new Set([...selCodes.value, ...vals])];
};
/* 当前打标目标：仅商品编码模式 */
const targetKeys = computed(() => codeGroups.value.flatMap((g) => g.codes.filter((c) => selCodes.value.includes(c.value)).map((c) => ({ code: c.value, title: c.value }))));

interface TagEntry { id: number; cat: string; sub: string; code: string; codeTitle: string; }
let tagSeq = 0;
/* 已打标签按会话隔离：切换会话后仅展示该会话自己的标签 */
const taggedMap = ref<Record<number, TagEntry[]>>({});
const tagged = computed(() => taggedMap.value[props.session.id] ?? []);
/* 已选标签按打标目标分组：组标题＋标签 chips（图三同款分组语言），不附其它描述文案 */
const taggedGroups = computed(() => {
  const groups: { key: string; title: string; items: TagEntry[] }[] = [];
  for (const t of tagged.value) {
    let g = groups.find((x) => x.key === t.code);
    if (!g) { g = { key: t.code, title: t.codeTitle, items: [] }; groups.push(g); }
    g.items.push(t);
  }
  return groups;
});
/* 点击子标签＝立即选中并打标到当前目标（toast 提示）；当前目标已全部持有该子标签时显选中态 */
const isSubOn = (sub: string) => {
  const keys = targetKeys.value.map((k) => k.code);
  return keys.length > 0 && keys.every((k) => tagged.value.some((t) => t.sub === sub && t.code === k));
};
const pickSub = (cat: string, sub: string) => {
  const keys = targetKeys.value;
  if (!keys.length) { pushToast('请先选择关联商品打标目标', 'warning'); return; }
  const list = (taggedMap.value[props.session.id] ??= []);
  const missing = keys.filter((k) => !list.some((t) => t.sub === sub && t.code === k.code));
  if (!missing.length) { pushToast(`已选标签：${sub}`, 'info'); return; }
  for (const k of missing) list.unshift({ id: ++tagSeq, cat, sub, code: k.code, codeTitle: k.title });
  pushToast(`已选标签：${sub}`);
};
const removeTag = (id: number) => {
  const list = taggedMap.value[props.session.id] ?? [];
  const i = list.findIndex((t) => t.id === id);
  if (i >= 0) list.splice(i, 1);
};

/* ---------- 商品知识：商品ID维度（唯一维度；系列编码维度与维度切换器已按需求移除） ----------
   编辑规则：ID 维度编辑仅落本 ID 覆盖层，不回写系列编码下的商品编码 */
type BaseRow = { label: string; value: string };
const idBase = ref<Record<string, Record<string, BaseRow[]>>>({});

/* 本会话正在咨询的商品所属系列（稳定绑定 session.productId）：模块一优化提示、模块三关联商品打标始终以它为准 */
const sessionProduct = computed(() => kbV2Products.find((p) => p.id === props.session.productId) ?? kbV2Products[0]);
/* 订单商品清单（商品粒度＝ID 维度 item，非系列）：一单可含多个商品；无订单数据时为空 */
const ALL_ENTRIES = kbV2Products.flatMap((p) => p.items.map((it) => ({ it, series: p })));
const rawOrderEntries = computed(() => (props.session.orderItemIds?.length ? props.session.orderItemIds.map((id) => ALL_ENTRIES.find((e) => e.it.id === id)).filter((e): e is NonNullable<typeof e> => !!e) : []));
const rawBrowseEntries = computed(() => (props.session.browseItemIds?.length ? props.session.browseItemIds.map((id) => ALL_ENTRIES.find((e) => e.it.id === id)).filter((e): e is NonNullable<typeof e> => !!e) : []));
const hasOrder = computed(() => rawOrderEntries.value.length > 0);
const hasBrowse = computed(() => rawBrowseEntries.value.length > 0);
/* 商品来源切换：用户订单 / 浏览足迹；缺省退化到本会话系列首商品 */
type ProdSource = 'order' | 'browse';
const prodSource = ref<ProdSource>('order');
const prodEntries = computed(() => {
  if (prodSource.value === 'browse' && hasBrowse.value) return rawBrowseEntries.value;
  if (hasOrder.value) return rawOrderEntries.value;
  if (hasBrowse.value) return rawBrowseEntries.value;
  const fallback = sessionProduct.value?.items[0];
  return fallback ? [{ it: fallback, series: sessionProduct.value }] : [];
});
/* 本会话商品＝订单清单首位（无订单时取当前来源首位）；模块二当前展示商品 selItemId 默认即它 */
const sessionItemId = computed(() => rawOrderEntries.value[0]?.it.id ?? prodEntries.value[0]?.it.id ?? '');
const selItemId = ref(sessionItemId.value);
const itemEntry = computed(() => prodEntries.value.find((e) => e.it.id === selItemId.value) ?? prodEntries.value[0]);
const item = computed(() => itemEntry.value?.it);
const selSku = ref(item.value?.skus[0]?.id ?? '');
const sku = computed(() => item.value?.skus.find((s) => s.id === selSku.value) ?? item.value?.skus[0]);
/* 当前会话关联 SKU（会话种子 skuName 绑定）：仅选中商品＝本会话商品时导轨挂「会话」角标，切到订单内其它商品则无 */
const sessionSkuId = computed(() => (props.session.skuName && selItemId.value === sessionItemId.value ? item.value?.skus.find((s) => s.name === props.session.skuName)?.id ?? '' : ''));
const codeChipsI = computed(() => sku.value?.codes.length ? sku.value.codes : item.value?.codes ?? []);
const selCodeI = ref(codeChipsI.value[0]?.code ?? '');
const codeI = computed(() => codeChipsI.value.find((c) => c.code === selCodeI.value) ?? codeChipsI.value[0]);
const baseI = computed(() => {
  const c = codeI.value;
  if (!c || !item.value) return [];
  return idBase.value[item.value.id]?.[c.code] ?? c.base;
});

/* 切换会话后重置各选择 ref 到新会话商品的首项（避免残留上一会话的编码/商品/SKU 选中） */
watch(() => props.session.id, () => {
  prodSource.value = hasOrder.value ? 'order' : 'browse';
  selCodes.value = allCodes();
  selItemId.value = sessionItemId.value;
  selSku.value = item.value?.skus[0]?.id ?? '';
  selCodeI.value = codeChipsI.value[0]?.code ?? '';
});

/* 切换订单内展示商品后：重置到该商品首个 SKU/编码（避免残留上一商品的选中） */
watch(selItemId, () => {
  selSku.value = item.value?.skus[0]?.id ?? '';
  selCodeI.value = codeChipsI.value[0]?.code ?? '';
});

/* SKU基础信息（ID维度，位于基础信息之上）：默认查看态，点编辑进入编辑态 */
const skuBaseStore = ref<Record<string, BaseRow[]>>({});
const defaultSkuBase = (price: string | undefined): BaseRow[] => {
  const n = parseFloat(price ?? '0') || 0;
  return [
    { label: 'SKU成本价', value: `${(n * 0.6).toFixed(2)}元` },
    { label: '预估发货成本', value: '2.50元' },
  ];
};
const skuBase = computed(() => skuBaseStore.value[sku.value?.id ?? ''] ?? defaultSkuBase(sku.value?.price));
const editingSku = ref(false);
const skuDraft = ref<BaseRow[]>([]);
const startSkuEdit = () => { skuDraft.value = skuBase.value.map((r) => ({ ...r })); editingSku.value = true; };
const cancelSkuEdit = () => { editingSku.value = false; };
const saveSkuEdit = () => { skuBaseStore.value[sku.value?.id ?? ''] = skuDraft.value.map((r) => ({ ...r })); editingSku.value = false; };
const rowsSku = computed(() => (editingSku.value ? skuDraft.value : skuBase.value));

/* 基础信息编辑（两维度各自草稿；保存时按同步规则落库） */
const editing = ref<null | 'S' | 'I'>(null);
const draft = ref<BaseRow[]>([]);
const startEdit = () => {
  draft.value = baseI.value.map((r) => ({ ...r }));
  editing.value = 'I';
};
const cancelEdit = () => { editing.value = null; };
const saveEdit = () => {
  const rows = draft.value.map((r) => ({ ...r }));
  const c = codeI.value;
  if (c && item.value) {
    idBase.value[item.value.id] = { ...(idBase.value[item.value.id] ?? {}), [c.code]: rows };
  }
  editing.value = null;
};

/* 商品知识底部固定操作栏：默认查看态，点编辑进入当前维度可编辑块的编辑态；保存/取消只作用于已在编辑态的块（与各块行内编辑入口共存不冲突） */
const kbEditing = computed(() => editingSku.value || editing.value !== null);
const startKbEdit = () => {
  startSkuEdit();
  startEdit();
};
const saveKbEdit = () => {
  if (editingSku.value) saveSkuEdit();
  if (editing.value) saveEdit();
};
const cancelKbEdit = () => {
  if (editingSku.value) cancelSkuEdit();
  if (editing.value) cancelEdit();
};

/* 图片信息页签（素材 cat 缺省归其它） */
const imgCat = ref<KbImageCat>('其它');
const imgCatOf = (m: { cat?: KbImageCat }): KbImageCat => m.cat ?? '其它';
const imagesOf = (c: KbV2Code | undefined) => (c ? c.images.filter((m) => imgCatOf(m) === imgCat.value) : []);
const imgCount = (c: KbV2Code | undefined, cat: KbImageCat) => (c ? c.images.filter((m) => imgCatOf(m) === cat).length : 0);

/* ---------- 新增素材（编辑态「新增」瓦片可点击）：点开上传弹窗，选文件后确认写入当前编码对应素材数组 ----------
   图片落 code.images（归属当前图片信息页签 imgCat）；商品视频落 code.videos；安装/使用视频落 code.guides。 */
interface AddTarget { kind: 'img' | 'video'; list: 'images' | 'videos' | 'guides'; }
const addTarget = ref<AddTarget | null>(null);
const addFile = ref<{ name: string; url: string } | null>(null);
const addInput = ref<HTMLInputElement | null>(null);
const openAdd = (kind: 'img' | 'video', list: AddTarget['list']) => {
  addTarget.value = { kind, list };
  addFile.value = null;
};
const closeAdd = () => { addTarget.value = null; addFile.value = null; };
const onPickAddFile = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!f) return;
  addFile.value = { name: f.name, url: URL.createObjectURL(f) };
};
const confirmAdd = () => {
  const t = addTarget.value;
  const code = codeI.value;
  if (!t || !code || !addFile.value) return;
  const base = addFile.value.name.replace(/\.[^.]+$/, '') || '新素材';
  const entry = {
    label: base,
    src: addFile.value.url,
    name: addFile.value.name,
    scenes: [],
    questions: [],
    keywords: [],
    ...(t.list === 'images' ? { cat: imgCat.value } : {}),
  };
  (code[t.list] as typeof code.images).push(entry as (typeof code.images)[number]);
  closeAdd();
};

/* 编辑态行取草稿、只读态行取数据源 */
const rowsI = computed(() => (editing.value === 'I' ? draft.value : baseI.value));

/* ---------- 商品知识 / 详情图片 双页签（分段胶囊） ----------
   详情图片按「当前会话所在平台」的商品发布规范组织图型：主图/白底图/SKU主图/详情图（各平台另有专属图型），
   会话切换＝平台切换＝规范与图片同步切换；图片取本会话商品（主图/SKU图/编码素材图），缺传张数以「待补」瓦片呈现。 */
const kbTab = ref<'kb' | 'imgs'>('kb');

interface PlatImgSpec { group: string; short: string; kind: 'main' | 'white' | 'sku' | 'detail'; need: number; have: number }
const PLAT_IMG_SPECS: Record<string, PlatImgSpec[]> = {
  淘宝: [
    { group: '商品主图', short: '主图', kind: 'main', need: 5, have: 5 },
    { group: '白底图', short: '白底图', kind: 'white', need: 1, have: 1 },
    { group: '长图', short: '长图', kind: 'main', need: 0, have: 1 },
    { group: 'SKU主图', short: 'SKU图', kind: 'sku', need: 2, have: 2 },
    { group: '详情图', short: '详情图', kind: 'detail', need: 5, have: 5 },
  ],
  天猫: [
    { group: '商品主图', short: '主图', kind: 'main', need: 5, have: 5 },
    { group: '白底图', short: '白底图', kind: 'white', need: 1, have: 1 },
    { group: '透明底图', short: '透明图', kind: 'white', need: 0, have: 1 },
    { group: 'SKU主图', short: 'SKU图', kind: 'sku', need: 2, have: 2 },
    { group: '详情图', short: '详情图', kind: 'detail', need: 5, have: 4 },
  ],
  拼多多: [
    { group: '轮播主图', short: '主图', kind: 'main', need: 5, have: 6 },
    { group: '白底图', short: '白底图', kind: 'white', need: 1, have: 1 },
    { group: 'SKU规格图', short: '规格图', kind: 'sku', need: 2, have: 2 },
    { group: '详情图', short: '详情图', kind: 'detail', need: 5, have: 3 },
  ],
  抖音: [
    { group: '商品主图', short: '主图', kind: 'main', need: 5, have: 5 },
    { group: '竖图', short: '竖图', kind: 'main', need: 0, have: 2 },
    { group: '白底图', short: '白底图', kind: 'white', need: 1, have: 0 },
    { group: 'SKU主图', short: 'SKU图', kind: 'sku', need: 2, have: 2 },
    { group: '详情图', short: '详情图', kind: 'detail', need: 5, have: 5 },
  ],
  快手: [
    { group: '商品主图', short: '主图', kind: 'main', need: 5, have: 4 },
    { group: '白底图', short: '白底图', kind: 'white', need: 1, have: 1 },
    { group: 'SKU主图', short: 'SKU图', kind: 'sku', need: 2, have: 2 },
    { group: '详情图', short: '详情图', kind: 'detail', need: 5, have: 5 },
  ],
  视频号: [
    { group: '商品主图', short: '主图', kind: 'main', need: 5, have: 5 },
    { group: '白底图', short: '白底图', kind: 'white', need: 1, have: 1 },
    { group: 'SKU主图', short: 'SKU图', kind: 'sku', need: 2, have: 1 },
    { group: '详情图', short: '详情图', kind: 'detail', need: 5, have: 2 },
  ],
};
const diSpecs = computed(() => PLAT_IMG_SPECS[props.session.plat] ?? PLAT_IMG_SPECS['淘宝']);
/* 图片槽位取图源：主图型取商品/SKU图；白底型取商品主图；SKU型取各 SKU 主图；详情型取当前编码素材图 */
const diSrcs = (kind: PlatImgSpec['kind']): string[] => {
  const it = item.value;
  const skus = it?.skus ?? [];
  switch (kind) {
    case 'sku': return skus.map((s) => s.img);
    case 'detail': return (codeI.value?.images ?? []).map((m) => m.src);
    case 'white': return [it?.img ?? ''];
    default: return [it?.img ?? '', ...skus.map((s) => s.img), sessionProduct.value?.img ?? ''];
  }
};
const diGroups = computed(() => diSpecs.value.map((s) => {
  const pool = diSrcs(s.kind).filter(Boolean);
  const src = pool.length ? pool : ['/products/main.png'];
  const list = Array.from({ length: s.have }, (_, i) => ({
    label: s.kind === 'sku' ? (item.value?.skus[i]?.name ?? `${s.short}${i + 1}`) : (s.have > 1 ? `${s.short}${i + 1}` : s.short),
    src: src[i % src.length],
  }));
  return { ...s, list, lack: Math.max(0, s.need - s.have) };
}));

/* ---------- 优化提示（第三页签）：品控中心发起优化任务后，接待人在此看到店铺/商品分值与放宽售后阶段，据此放宽售后等处置 ----------
   店铺分对齐品控-线上监控店铺（店铺体验分/商品分/物流分/服务分）；放宽售后阶段＝优化任务下发的处置口径与结束方式。
   看板无实时会话→店铺/商品绑定，固定当前会话关联店铺与商品作静态呈现。 */
const optShop = computed(() => qcShops.value.find((s) => s.id === props.session.shopId) ?? qcShops.value[0]);
/* 悬浮球展示当前会话关联店铺的体验分评级（阈值同品控 SHOP_GRADE_CFG），球色随档位（GRADE_COLOR 单一出口） */
const ballGrade = computed(() => {
  const s = optShop.value;
  return s.isNew ? '新' : shopGradeOf(s.platform, s.score);
});
const ballColor = computed(() => GRADE_COLOR[ballGrade.value] ?? '#86909c');
/* 店铺分对齐品控-线上监控店铺；拼多多店铺额外带「发货体验分」维度 */
const optShopScores = computed(() => {
  const s = optShop.value;
  const arr = [
    { k: '店铺体验分', v: s.score },
    { k: '商品分', v: s.goods },
    { k: '物流分', v: s.logistics },
    { k: '服务分', v: s.service },
  ];
  if (s.deliver != null) arr.push({ k: '发货体验分', v: s.deliver });
  return arr;
});
/* 放宽售后阶段按店铺区分：达到指标后结束（目标分值，开放式无结束日）；active=false 时该店铺未处于放宽售后阶段 */
const SHOP_LOOSE: Record<string, { active: boolean; plan: string; endMode: string; metric: string; target: number; start: string }> = {
  'PDD-6033': { active: true, plan: '放宽售后', endMode: '达到指标后结束', metric: '店铺体验分', target: 4.6, start: '2026-05-06' },
  'TB-2063': { active: true, plan: '放宽售后', endMode: '达到指标后结束', metric: '店铺体验分', target: 4.6, start: '2026-05-06' },
  'KS-5036': { active: true, plan: '放宽售后', endMode: '达到指标后结束', metric: '物流分', target: 4.6, start: '2026-09-01' },
  'TB-2088': { active: true, plan: '放宽售后', endMode: '达到指标后结束', metric: '服务分', target: 4.4, start: '2026-08-12' },
};
const optLoose = computed(() => SHOP_LOOSE[optShop.value.id] ?? { active: false, plan: '', endMode: '', metric: '', target: 0, start: '' });
/* 商品体验分 + 商品雷点按商品区分（该商品命中的高频问题类型，接待时优先规避/安抚）；商品名取当前会话关联商品 */
const GOODS_EXP: Record<string, { expScore: number; grade: string; mines: { name: string; n: number }[] }> = {
  K001: { expScore: 4.3, grade: 'B', mines: [ { name: '色差/与描述不符', n: 12 }, { name: '承重/结构问题', n: 8 }, { name: '物流破损', n: 5 }, { name: '安装困难', n: 3 } ] },
  K002: { expScore: 4.6, grade: 'A', mines: [ { name: '尺码偏小', n: 9 }, { name: '开胶/脱线', n: 4 } ] },
  K003: { expScore: 4.1, grade: 'C', mines: [ { name: '开胶/脱线', n: 14 }, { name: '色差/与描述不符', n: 7 }, { name: '尺码偏小', n: 6 } ] },
  K004: { expScore: 4.8, grade: 'A', mines: [ { name: '过敏/刺激', n: 3 } ] },
  K005: { expScore: 4.5, grade: 'B', mines: [ { name: '油腻/闷痘', n: 5 }, { name: '香味过重', n: 2 } ] },
  K006: { expScore: 4.2, grade: 'B', mines: [ { name: '偏重/脚感硬', n: 8 }, { name: '色差/与描述不符', n: 5 } ] },
};
const optGoods = computed(() => ({ name: sessionProduct.value?.name ?? '', ...(GOODS_EXP[props.session.productId] ?? GOODS_EXP.K001) }));
</script>

<template>
  <!-- 收起态：悬浮球＝当前会话店铺体验分评级（球色随档位），可拖动；点击（非拖动）展开看板 -->
  <button
    v-if="collapsed"
    type="button"
    class="cwb-fab"
    :style="{ left: ballPos.x + 'px', top: ballPos.y + 'px', '--gc': ballColor }"
    :title="`店铺体验分 ${optShop.score.toFixed(2)} · 评级 ${ballGrade} · 点击展开看板 / 可拖动`"
    @pointerdown="onBallDown"
    @pointermove="onBallMove"
    @pointerup="onBallUp"
  >
    <span class="cwb-fab-g">{{ ballGrade }}</span>
  </button>

  <!-- 展开态看板：独立浮层（fixed、可拖头部移动），不挤压会话/聊天等其它内容 -->
  <aside v-else class="cwb-board" :style="{ left: (panelPos?.x ?? 88) + 'px', top: (panelPos?.y ?? 96) + 'px' }">
    <div class="cwb-head" @pointerdown="onHeadDown" @pointermove="onHeadMove" @pointerup="onHeadUp">
      <span class="cwb-head-t">客服看板</span>
      <button type="button" class="cwb-fold" title="收起看板" @click="collapsed = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 6 9 12 15 18" /></svg>
      </button>
    </div>

    <!-- 三模块纵向叠放：模块以白卡片＋醒目标题区分，整列独立纵向滚动 -->
    <div class="cwb-body">
      <!-- ============ 模块一：优化提示 ============ -->
      <section class="cwb-mod" data-mod="opt">
        <div class="cwb-mod-t">优化提示</div>
        <!-- 店铺分（常驻）：品控-线上监控店铺四维分（拼多多追加发货体验分） -->
        <div class="cwb-sec">
          <div class="cwb-sec-t cwb-opt-sec-t">
            <span>店铺分</span>
            <!-- 放宽售后徽章＝店铺优化任务处置状态（不常驻：仅有店铺优化任务时展示） -->
            <template v-if="session.optKind === 'shop'">
              <span v-if="optLoose.active" class="cwb-opt-badge">放宽售后中</span>
              <span v-else class="cwb-opt-badge off">未放宽</span>
            </template>
          </div>
          <div class="cwb-opt-metrics">
            <div v-for="m in optShopScores" :key="m.k" class="cwb-opt-metric">
              <div class="k">{{ m.k }}</div>
              <div class="v">{{ m.v.toFixed(2) }}</div>
            </div>
          </div>
          <!-- 放宽售后阶段＝店铺优化任务下发的处置口径（不常驻） -->
          <div v-if="session.optKind === 'shop' && optLoose.active" class="cwb-opt-loose">
            <div class="cwb-opt-loose-h">{{ optLoose.plan }}阶段 · {{ optLoose.endMode }}</div>
            <div class="cwb-opt-loose-b">目标 {{ optLoose.metric }} ≥ {{ optLoose.target.toFixed(2) }} 分 · {{ optLoose.start }} 起至今</div>
          </div>
        </div>

        <!-- 商品体验分（常驻）：当前会话关联商品的体验分值与档位 -->
        <div class="cwb-sec">
          <div class="cwb-sec-t">商品体验分</div>
          <div class="cwb-opt-goods">
            <div class="cwb-opt-goods-score">{{ optGoods.expScore.toFixed(1) }}</div>
            <div class="cwb-opt-goods-grade">{{ optGoods.grade }}</div>
          </div>
          <!-- 安抚提示＋商品雷点＝体验分优化任务的接待指引（不常驻） -->
          <template v-if="session.optKind === 'exp'">
            <div class="cwb-opt-goods-tip solo">分值偏低，接待时优先安抚并主动给出售后方案</div>
            <div class="cwb-opt-mine-t">商品雷点</div>
            <div class="cwb-opt-mines">
              <span v-for="mn in optGoods.mines" :key="mn.name" class="cwb-opt-mine">{{ mn.name }}<b>{{ mn.n }}</b></span>
            </div>
          </template>
        </div>
      </section>

      <!-- ============ 模块二：商品知识 ============ -->
      <section class="cwb-mod" data-mod="kb">
        <!-- 多商品来源切换条：商品知识模块卡内顶部（体验分卡正下方），与知识内容同属一张卡；等宽两列不裁切；单商品来源不渲染 -->
        <div v-if="hasOrder && hasBrowse" class="cwb-prod-source-tabs">
          <button type="button" :class="{ on: prodSource === 'order' }" @click="prodSource = 'order'">用户订单</button>
          <button type="button" :class="{ on: prodSource === 'browse' }" @click="prodSource = 'browse'">浏览足迹</button>
        </div>
        <div v-if="prodEntries.length > 1" class="cwb-prod-cards">
          <button
            v-for="e in prodEntries"
            :key="e.it.id"
            type="button"
            class="cwb-prod-card"
            :class="{ on: e.it.id === (item?.id ?? '') }"
            :title="e.it.name"
            @click="selItemId = e.it.id"
          >
            <img class="cwb-prod-card-img" :src="e.it.img" alt="">
            <span class="cwb-prod-card-info">
              <span class="cwb-prod-card-name">{{ e.it.name }}</span>
              <span class="cwb-prod-card-id">商品ID {{ e.it.id }}</span>
            </span>
            <i v-if="e.it.id === sessionItemId" class="cwb-prod-card-sess">本会话</i>
          </button>
        </div>
        <!-- 标题行＝分段胶囊双页签（商品知识 / 详情图片）；编辑/保存/取消仅商品知识页签提供 -->
        <div class="cwb-mod-t">
          <span class="cwb-kb-tabs">
            <button type="button" :class="{ on: kbTab === 'kb' }" @click="kbTab = 'kb'">商品知识</button>
            <button type="button" :class="{ on: kbTab === 'imgs' }" @click="kbTab = 'imgs'">详情图片</button>
          </span>
          <span v-if="kbTab === 'kb'" class="cwb-kb-acts">
            <template v-if="!kbEditing">
              <button type="button" class="cwb-kb-link" @click="startKbEdit">编辑</button>
            </template>
            <template v-else>
              <button type="button" class="cwb-kb-foot-btn ghost" @click="cancelKbEdit">取消</button>
              <button type="button" class="cwb-kb-foot-btn primary" @click="saveKbEdit">保存</button>
            </template>
          </span>
        </div>
        <!-- 商品ID维度（唯一维度：系列编码维度与维度切换器已按需求移除） -->
        <div v-if="kbTab === 'kb'" class="cwb-id-cols">
          <div class="cwb-sku-col">
            <div class="cwb-sku-col-t">SKU</div>
            <button
              v-for="s in item?.skus ?? []"
              :key="s.id"
              type="button"
              class="cwb-sku-thumb"
              :class="{ on: s.id === (sku?.id ?? '') }"
              :title="s.name + (s.id === sessionSkuId ? '（当前会话SKU）' : '')"
              @click="selSku = s.id; selCodeI = s.codes[0]?.code ?? ''"
            >
              <img :src="s.img" alt="">
              <i v-if="s.id === sessionSkuId" class="cwb-sku-sess">会话</i>
            </button>
          </div>
          <div class="cwb-id-main">
            <!-- SKU信息：右主内容首块，基础信息同款文字栅格（SKU成本价/预估发货成本）；商品信息（主图/名称/商品ID）由上方切换条卡片承载，此处不重复 -->
            <div class="cwb-kb-sec">
              <div class="cwb-kb-sec-t">
                SKU信息
                <template v-if="editingSku">
                  <button type="button" class="cwb-edit" @click="saveSkuEdit">保存</button>
                  <button type="button" class="cwb-edit cancel" @click="cancelSkuEdit">取消</button>
                </template>
              </div>
              <div class="cwb-base-grid">
                <div class="cwb-base-cell">
                  <span class="k">SKU名称</span>
                  <span class="v" :title="sku?.name">{{ sku?.name }}</span>
                </div>
                <div v-for="r in rowsSku" :key="r.label" class="cwb-base-cell">
                  <span class="k">{{ r.label }}</span>
                  <input v-if="editingSku" v-model="r.value" class="cwb-base-inp">
                  <span v-else class="v">{{ r.value }}</span>
                </div>
              </div>
            </div>

            <div class="cwb-code-chips">
              <button
                v-for="c in codeChipsI"
                :key="c.code"
                type="button"
                class="cwb-code-chip slim"
                :class="{ on: c.code === (codeI?.code ?? '') }"
                @click="selCodeI = c.code"
              >
                <b>{{ c.code }}</b>
                <span>{{ c.name }}</span>
              </button>
            </div>

            <div class="cwb-kb-sec">
              <div class="cwb-kb-sec-t">
                基础信息
                <!-- 查看态不挂动作钮（编辑/新增仅编辑态展示）；进入编辑态入口在底部固定栏 -->
                <template v-if="editing === 'I'">
                  <button type="button" class="cwb-edit" @click="saveEdit">保存</button>
                  <button type="button" class="cwb-edit cancel" @click="cancelEdit">取消</button>
                </template>
              </div>
              <div class="cwb-base-grid">
                <div v-for="r in rowsI" :key="r.label" class="cwb-base-cell">
                  <span class="k">{{ r.label }}</span>
                  <input v-if="editing === 'I'" v-model="r.value" class="cwb-base-inp">
                  <span v-else class="v">{{ r.value }}</span>
                </div>
              </div>
            </div>

            <div class="cwb-kb-sec cwb-kb-media">
              <div class="cwb-kb-sec-t">图片信息</div>
              <div class="cwb-img-tabs">
                <button v-for="cat in KB_IMAGE_CATS" :key="cat" type="button" :class="{ on: imgCat === cat }" @click="imgCat = cat">
                  {{ cat }}({{ imgCount(codeI, cat) }})
                </button>
              </div>
              <div class="cwb-media-row">
                <div v-for="m in imagesOf(codeI)" :key="m.label" class="cwb-media">
                  <span class="cwb-media-img"><img :src="m.src" alt=""></span>
                  <span class="cwb-media-t">{{ m.label }}</span>
                  <div class="cwb-media-ops">
                    <button type="button" @click="openPreview('img', m)">查看</button>
                    <button type="button" @click="sendMedia('img', m)">发送到当前会话</button>
                  </div>
                </div>
                <div v-if="editing === 'I'" class="cwb-media add" title="新增图片" @click="openAdd('img', 'images')"><span class="cwb-media-img plus">＋</span><span class="cwb-media-t">新增</span></div>
              </div>
            </div>

            <div class="cwb-kb-sec cwb-kb-media">
              <div class="cwb-kb-sec-t">商品视频</div>
              <div class="cwb-media-row">
                <div v-for="m in codeI?.videos ?? []" :key="m.label" class="cwb-media">
                  <span class="cwb-media-img video"><img :src="m.src" alt=""><i class="cwb-play">▶</i></span>
                  <span class="cwb-media-t">{{ m.label }}</span>
                  <div class="cwb-media-ops">
                    <button type="button" @click="openPreview('video', m)">查看</button>
                    <button type="button" @click="sendMedia('video', m)">发送到当前会话</button>
                  </div>
                </div>
                <div v-if="editing === 'I'" class="cwb-media add" title="新增视频" @click="openAdd('video', 'videos')"><span class="cwb-media-img plus">＋</span><span class="cwb-media-t">新增</span></div>
              </div>
            </div>

            <div class="cwb-kb-sec cwb-kb-media">
              <div class="cwb-kb-sec-t">商品安装/使用视频</div>
              <div class="cwb-media-row">
                <div v-for="m in codeI?.guides ?? []" :key="m.label" class="cwb-media">
                  <span class="cwb-media-img video"><img :src="m.src" alt=""><i class="cwb-play">▶</i></span>
                  <span class="cwb-media-t">{{ m.label }}</span>
                  <div class="cwb-media-ops">
                    <button type="button" @click="openPreview('video', m)">查看</button>
                    <button type="button" @click="sendMedia('video', m)">发送到当前会话</button>
                  </div>
                </div>
                <div v-if="editing === 'I'" class="cwb-media add" title="新增视频" @click="openAdd('video', 'guides')"><span class="cwb-media-img plus">＋</span><span class="cwb-media-t">新增</span></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 详情图片页签：按会话所在平台发布规范分组（主图/白底图/SKU主图/详情图…），随会话平台与商品切换 -->
        <div v-else class="cwb-di">
          <div v-for="g in diGroups" :key="g.group" class="cwb-kb-sec cwb-kb-media">
            <div class="cwb-kb-sec-t">{{ g.group }}</div>
            <div class="cwb-media-row">
              <div v-for="m in g.list" :key="m.label" class="cwb-media">
                <span class="cwb-media-img"><img :src="m.src" alt=""></span>
                <span class="cwb-media-t" :title="m.label">{{ m.label }}</span>
                <div class="cwb-media-ops">
                  <button type="button" @click="openPreview('img', m)">查看</button>
                  <button type="button" @click="sendMedia('img', m)">发送到当前会话</button>
                </div>
              </div>
              <div v-for="n in g.lack" :key="`lack-${n}`" class="cwb-media">
                <span class="cwb-media-img lack">缺</span>
                <span class="cwb-media-t warn">待上传</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ============ 模块三：标记会话 ============ -->
      <section class="cwb-mod" data-mod="tag">
        <div class="cwb-mod-t">标记会话</div>
        <!-- 三个子块纵向叠放（关联商品 → 已选标签 → 标签·问题类型） -->
        <div class="cwb-sec">
          <div class="cwb-sec-t">关联商品</div>
          <!-- 商品编码按系列编码分组：系列编码为组标题，组内为该系列商品编码；组内编码数大于一时提供「全部」 -->
          <div class="cwb-code-groups">
            <div v-for="g in codeGroups" :key="g.key" class="cwb-code-group">
              <div class="cwb-code-gt" :title="g.title">{{ g.title }}</div>
              <div class="cwb-code-tags">
                <button
                  v-if="g.codes.length > 1"
                  type="button"
                  class="cwb-code-tag cwb-code-all"
                  :class="{ on: isAllOf(g) }"
                  title="选择该系列编码下全部商品编码"
                  @click="pickAllOf(g)"
                >全部</button>
                <button
                  v-for="c in g.codes"
                  :key="c.value"
                  type="button"
                  class="cwb-code-tag"
                  :class="{ on: selCodes.includes(c.value) }"
                  :title="c.label"
                  @click="toggleCode(c.value)"
                >{{ c.value }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="cwb-sec">
          <div class="cwb-sec-t">已选标签</div>
          <!-- 已选标签按商品编码分组：组标题＋标签 chips，点 × 快速清除；无其它描述文案 -->
          <div v-for="g in taggedGroups" :key="g.key" class="cwb-sel-group">
            <div class="cwb-code-gt" :title="g.title">{{ g.title }}</div>
            <div class="cwb-sel-tags">
              <span v-for="t in g.items" :key="t.id" class="cwb-sel-tag" :title="`${t.cat}·${t.sub}`">
                {{ t.sub }}
                <button type="button" class="cwb-tag-x" title="清除该标签" @click="removeTag(t.id)">×</button>
              </span>
            </div>
          </div>
        </div>

        <div class="cwb-sec">
          <div class="cwb-sec-t">标签 · 问题类型</div>
          <!-- 大类每行三枚等长；各大类独立收起/展开（默认收起），展开后子标签横排成整行带；点子标签即选中打标 -->
          <div class="cwb-cat-tags">
            <template v-for="c in cats" :key="c.name">
              <button type="button" class="cwb-cat-tag" :class="{ shut: !isCatOpen(c.name) }" :title="c.name" @click="toggleCat(c.name)">
                <span class="cwb-cat-name">{{ c.name }}</span>
                <svg class="cwb-cat-caret" :class="{ shut: !isCatOpen(c.name) }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              <div v-if="isCatOpen(c.name)" class="cwb-sub-row">
                <button
                  v-for="s in c.subs.filter((x) => !x.fixed)"
                  :key="s.id"
                  type="button"
                  class="cwb-sub"
                  :class="{ on: isSubOn(s.name) }"
                  :title="s.name"
                  @click="pickSub(c.name, s.name)"
                >{{ s.name }}</button>
              </div>
            </template>
          </div>
        </div>
      </section>
    </div>

    <!-- 媒体查看预览弹窗：图直显、视频叠播放角标 -->
    <Modal v-if="preview" :title="preview.kind === 'video' ? '视频预览' : '图片预览'" :sub="preview.label" size="md" @close="preview = null">
      <div class="cwb-preview">
        <img :src="preview.src" alt="">
        <i v-if="preview.kind === 'video'" class="cwb-preview-play">▶</i>
      </div>
    </Modal>

    <!-- 新增素材上传弹窗：点「新增」瓦片打开，选文件预览后确认写入 -->
    <Modal v-if="addTarget" :title="addTarget.kind === 'video' ? '新增视频' : '新增图片'" size="md" @close="closeAdd">
      <input ref="addInput" type="file" :accept="addTarget.kind === 'video' ? 'video/*' : 'image/*'" hidden @change="onPickAddFile">
      <div class="cwb-add-drop" @click="addInput?.click()">
        <template v-if="addFile">
          <img v-if="addTarget.kind === 'img'" class="cwb-add-prev" :src="addFile.url" alt="">
          <video v-else class="cwb-add-prev" :src="addFile.url" />
          <span class="cwb-add-name">{{ addFile.name }}</span>
        </template>
        <template v-else>
          <span class="cwb-add-plus">＋</span>
          <span class="cwb-add-hint">点击选择{{ addTarget.kind === 'video' ? '视频' : '图片' }}文件</span>
        </template>
      </div>
      <template #foot>
        <button type="button" class="cwb-kb-foot-btn ghost" @click="closeAdd">取消</button>
        <button type="button" class="cwb-kb-foot-btn primary" :disabled="!addFile" @click="confirmAdd">确认</button>
      </template>
    </Modal>
  </aside>
</template>
