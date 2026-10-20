<script setup lang="ts">
/* ---------- 店铺分监控·店铺商品（子路由③）：商品维度挂店铺，字段＝商品信息(缩略图+商品名+商品ID+平台图标店铺名无标签行+「详」芯片)/商品评分(商品体验分+内部商品分+详情)/
   订单数据/聊天数据/评价数据/运营信息/上架时间（复合指标列，同监控列表列语言）；「详」开 SKU 信息只读弹窗；「详情」开评分雷达弹窗；
   店铺列表操作列「店铺商品」带入店铺+平台条件 ---------- */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Modal from '../../components/Modal.vue';
import SortTh from '../../components/SortTh.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import QcTrendModal from './QcTrendModal.vue';
import QcTodoCreateDrawer, { type TodoCreatePayload } from './QcTodoCreateDrawer.vue';
import QcTodoDetailDrawer from './QcTodoDetailDrawer.vue';
import { QC_TODOS, todoFromDraft } from './qcTodoData';
import { DEFAULT_WEIGHTS, gradeOf, scoreOf, type AuditWeights } from './qcAuditData';
import { qcGet } from './qcApi';
import { GRADE_COLOR, SHOP_PLATS, optEverOf, optStatusOf, qcShopGoods, qcShops, shopGoodHitTypes, shopGoodOfCode, shopGoodsJumpSeed, shopGoodSkus, shopGradeOf, shopOpsOf, onlineSeries, onlineSessionsOf, patchOnlineSession, type ShopGood, type ShopGoodSku, type ShopPlat } from './qcOnlineData';
import { PROBLEM_TYPE_COLOR, type QcCenterSeries } from './qcCenterData';
import type { ChatHit, ChatSession } from './data';

const goods = qcShopGoods;
const shopOf = (id: string) => qcShops.value.find((s) => s.id === id);
/* 平台官方图标：复用 /logos 官方资源；视频号无素材，同店铺列表 wxLogo 口径圆角矩形字标 data-uri */
const wxLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fa9a3e"/><text x="16" y="22" font-size="15" fill="#fff" text-anchor="middle" font-family="sans-serif">视</text></svg>');
const SHOP_LOGO: Record<ShopPlat, string> = { 淘宝: '/logos/taobao.png', 抖音: '/logos/douyin.png', 视频号: wxLogo, 快手: '/logos/kuaishou.png', 拼多多: '/logos/pinduoduo.png' };
/* 商品信息复合列缩略图：/products 既有素材按商品ID取模轮转（演示口径，同运营中心商品图资源） */
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const thumbOf = (id: string) => GOOD_THUMBS[Number(id) % GOOD_THUMBS.length];

/* 差评占比＝差评数/评价条数；售后占比＝售后数/订单数（订单数由数据侧还原）；风险占比＝风险会话/会话数；占比语义色同监控列表阈值（<3% ok / <5% warn / ≥5% bad） */
const badRatio = (g: ShopGood) => (g.reviews ? g.badReviews / g.reviews : 0);
const riskRatio = (g: ShopGood) => (g.sessions ? g.riskSessions / g.sessions : 0);
const badPct = (g: ShopGood) => `${(badRatio(g) * 100).toFixed(1)}%`;
const riskPct = (g: ShopGood) => `${(riskRatio(g) * 100).toFixed(1)}%`;
const afterPct = (g: ShopGood) => `${(g.orders ? (g.afterSales / g.orders) * 100 : 0).toFixed(1)}%`;
const rateCls = (v: number) => (v < 0.03 ? 'ok' : v < 0.05 ? 'warn' : 'bad');

/* ---------- 商品评分复合列：商品体验分取店铺 5 分制商品体验分；内部商品分用稽查模型算法——
   行内三列比率就近映射三维代表指标（差评占比→prod-badrate、售后占比→logi-postrefund、风险占比→serv-chat），
   按各指标满分线/零分线折算维度分，总分按维度权重加权（funion:auditWeights 可配） ---------- */
const auditW: AuditWeights = (() => {
  try { const raw = localStorage.getItem('funion:auditWeights'); if (raw) return JSON.parse(raw) as AuditWeights; } catch { /* 损坏回退默认 */ }
  return structuredClone(DEFAULT_WEIGHTS);
})();
const lineOf = (key: string) => auditW.indicators.find((i) => i.key === key) ?? DEFAULT_WEIGHTS.indicators.find((i) => i.key === key)!;
const expOf = (g: ShopGood) => (shopOf(g.shopId)?.goods ?? 0).toFixed(1);
const internalOf = (g: ShopGood) => {
  const prod = scoreOf(badRatio(g) * 100, lineOf('prod-badrate').fullLine, lineOf('prod-badrate').zeroLine);
  const logi = scoreOf(g.afterRatio * 100, lineOf('logi-postrefund').fullLine, lineOf('logi-postrefund').zeroLine);
  const serv = scoreOf(riskRatio(g) * 100, lineOf('serv-chat').fullLine, lineOf('serv-chat').zeroLine);
  const ds = auditW.dims;
  const dsum = ds.商品 + ds.物流 + ds.服务 || 100;
  const total = Math.round(((prod * ds.商品 + logi * ds.物流 + serv * ds.服务) / dsum) * 10) / 10;
  return { prod, logi, serv, total, grade: gradeOf(total) };
};

/* ---------- 评分详情：直接复用「系列编码详情」抽屉的全部内容（数据总览 / 会话数据 / 售后数据 / 评价数据 + 真实记录卡），
   唯一改动是把入口维度由系列编码改为商品——按商品ID确定性归属一个线上系列，其余内容、数据、交互与该抽屉完全一致 ---------- */
const ONLINE_SERIES = onlineSeries();
/* 证据平台口径：品控证据 Platform 集（天猫/拼多多/抖音/京东/淘宝/快手）不含「视频号」，
   演示口径将视频号店铺商品归并到最近的短视频证据平台「抖音」，其余店铺平台与证据平台同名直传；
   保证一件商品单平台收敛后仍有数据，且头部与明细平台标签一致 */
const EVIDENCE_PLAT: Record<ShopPlat, string> = { 淘宝: '淘宝', 抖音: '抖音', 视频号: '抖音', 快手: '快手', 拼多多: '拼多多' };
const evidencePlatOf = (g: ShopGood): string => {
  const sp = shopOf(g.shopId)?.platform;
  return sp ? EVIDENCE_PLAT[sp] : '';
};
/* 一件商品仅在一个店铺/一个平台在售：归属「在该证据平台有上架」的线上系列，保证单平台收敛后仍有数据。
   详情抽屉会话数据按证据平台收敛（platMatch），故优先归属聊天命中足以覆盖每个平台各≥1会话的系列
   （命中数≥6×平台数 → 打包会话数≥平台数），确保任一商品点开会话数据与问题类型占比都非空。 */
const chatRich = (s: QcCenterSeries) => s.codes.length > 0 && s.chatRiskHits >= 6 * s.platforms.length;
const chatAny = (s: QcCenterSeries) => s.codes.length > 0 && s.chatRiskHits > 0;
const seriesOfGood = (g: ShopGood): QcCenterSeries => {
  const plat = evidencePlatOf(g);
  const onPlat = plat ? ONLINE_SERIES.filter((s) => (s.platforms as string[]).includes(plat)) : [];
  const pick = (arr: QcCenterSeries[]) => arr[Number(g.id) % arr.length];
  const onPlatRich = onPlat.filter(chatRich);
  if (onPlatRich.length) return pick(onPlatRich);
  const onPlatChat = onPlat.filter(chatAny);
  if (onPlatChat.length) return pick(onPlatChat);
  const globalRich = ONLINE_SERIES.filter(chatRich);
  if (globalRich.length) return pick(globalRich);
  const list = onPlat.length ? onPlat : ONLINE_SERIES;
  return pick(list);
};
/* ---------- 操作列问题命中类型：风险项＝风险会话＋差评数＋售后数，类型按归属系列问题占比拆包；
   最多直展 3 个（窄列竖排三行），超出折叠为「+N」灰芯片悬浮气泡展示剩余（同监控列表涉及问题类型口径） ---------- */
const HIT_MAX = 3;
const hitTypesCache = new Map<string, { type: string; count: number }[]>();
const hitTypesOf = (g: ShopGood) => {
  let v = hitTypesCache.get(g.id);
  if (!v) { v = shopGoodHitTypes(g); hitTypesCache.set(g.id, v); }
  return v;
};
const shownHitsOf = (g: ShopGood) => hitTypesOf(g).slice(0, HIT_MAX);
const extraHitsOf = (g: ShopGood) => hitTypesOf(g).slice(HIT_MAX);
const scoreBox = ref<{ good: ShopGood; series: QcCenterSeries; initTypes: string[] } | null>(null);
const drawerSessions = ref<ChatSession[]>([]);
/* 操作列问题命中类型 chip 点入详情：打开详情抽屉并默认选中该类型（全列出+默认选中，同监控列表 chip 下钻口径） */
const openScore = (g: ShopGood, type?: string) => {
  const series = seriesOfGood(g);
  scoreBox.value = { good: g, series, initTypes: type ? [type] : [] };
  drawerSessions.value = [...onlineSessionsOf(series)];
};
const closeScore = () => { scoreBox.value = null; };
const updateSessionHits = (id: string, hits: ChatHit[]) => {
  patchOnlineSession(id, hits);
  drawerSessions.value = drawerSessions.value.map((x) => (x.id === id ? { ...x, hits } : x));
};
/* 商品维度上下文：头部展示商品名称+主图+所在证据平台，下钻行展示该商品 SKU（去重保序）；
   头部位同时带出商品ID/上架时间与商品评分（商品体验分＋内部商品分，口径同列表评分列），供抽屉头部展示 */
const productCtx = (g: ShopGood) => {
  const plat = evidencePlatOf(g);
  const exp = expOf(g);
  const skuRows = shopGoodSkus(g);
  /* SKU 卡数据源：系列编码（中文简称）按 SKU 名称去重归组供标签行；SKU 图按行序轮转既有主图池 */
  const skuSeries: Record<string, string[]> = {};
  const skuThumbs: Record<string, string> = {};
  skuRows.forEach((r, i) => {
    (skuSeries[r.name] ||= []).push(...r.series);
    skuThumbs[r.name] = GOOD_THUMBS[i % GOOD_THUMBS.length];
  });
  Object.keys(skuSeries).forEach((k) => { skuSeries[k] = [...new Set(skuSeries[k])]; });
  /* SKU 销量：按商品ID+SKU名哈希的确定性演示值（120–1980），供抽屉 SKU 卡销量行展示 */
  const skuSales: Record<string, number> = {};
  Object.keys(skuSeries).forEach((k) => {
    let h = 0;
    const s = `${g.id}-${k}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    skuSales[k] = 120 + (h % 1860);
  });
  return {
    name: g.name,
    thumb: thumbOf(g.id),
    skus: [...new Set(skuRows.map((r) => r.name))],
    skuSeries,
    skuThumbs,
    skuSales,
    skuCodeCount: skuRows.length,
    platform: plat,
    goodId: g.id,
    listedAt: g.listedAt,
    exp,
    /* 体验分语义色＝所在平台档位色（SHOP_GRADE_CFG 阈值→GRADE_COLOR，同店铺列表综合评级口径） */
    expColor: GRADE_COLOR[shopGradeOf(plat as ShopPlat, Number(exp))],
    score: internalOf(g).total,
    scoreColor: internalOf(g).grade.color,
    grade: internalOf(g).grade.name,
  };
};

/* ---------- 查询条件：搜索（商品名/商品ID/商品编码）+ 平台 + 店铺 + 运营组长 + 运营专员 + 运营助理 + 上架时间 + 命中问题类型 ---------- */
import { QC_PROBLEM_TYPES } from './qcCenterData';
import { HIT_CAT_DEF } from './qcOnlineData';

type PlatSel = ShopPlat | '全部平台';
const PLAT_OPTS: PlatSel[] = ['全部平台', ...SHOP_PLATS];
/* 优化任务查询条件：优化中＝周期含今天（列表挂标签口径）；已结束/未开始不挂标签但可查 */
type OptSel = '全部' | '优化中' | '已结束' | '无优化任务';
const OPT_OPTS: OptSel[] = ['全部', '优化中', '已结束', '无优化任务'];
/* 是否优化过：存在优化任务（任意状态）或历史优化周期即算优化过 */
type EverSel = '全部' | '优化过' | '未优化过';
const EVER_OPTS: EverSel[] = ['全部', '优化过', '未优化过'];
const blankF = () => ({
  q: '',
  platform: '全部平台' as PlatSel,
  shop: '',
  opsLeader: '',
  opsSpecialist: '',
  opsAssistant: '',
  listedFrom: '',
  listedTo: '',
  hitTypes: [] as string[],
  ordersMin: '',
  ordersMax: '',
  asMin: '',
  asMax: '',
  brMin: '',
  brMax: '',
  crMin: '',
  crMax: '',
  optTask: '全部' as OptSel,
  ever: '全部' as EverSel,
});
const draft = ref(blankF());
const applied = ref(blankF());
/* 关键词按空格 / 逗号 / 顿号分词，任一词命中即算匹配；商品编码按其归属商品匹配（监控列表「关联ID」跳转口径）；
   纯数字关键词只按商品ID匹配，避免编码哈希归属把无关商品带进结果 */
const kwHit = (g: ShopGood, kw: string) =>
  g.name.toLowerCase().includes(kw)
  || g.id.toLowerCase().includes(kw)
  || (!/^\d+$/.test(kw) && shopGoodOfCode(kw.toUpperCase())?.id === g.id);
/* 模糊匹配：输入值与选项值做子串包含比较（空值=不限） */
const fuzzyMatch = (val: string, input: string) => !input || val.includes(input);
/* 数值区间（空串=不限）：占比口径与行内复合列同源（售后占比=售后数÷订单数、差评占比=差评数÷评价数、风险占比=风险会话÷会话数，百分数一位小数） */
const numOf = (v: string) => (v.trim() === '' ? null : Number(v));
const inRange = (val: number, min: string, max: string) => {
  const lo = numOf(min); const hi = numOf(max);
  return (lo === null || Number.isNaN(lo) || val >= lo) && (hi === null || Number.isNaN(hi) || val <= hi);
};
const pct1 = (r: number) => Math.round(r * 1000) / 10;
const filtered = computed(() => goods.value.flatMap((g) => {
  const shop = shopOf(g.shopId);
  if (!shop) return [];
  const f = applied.value;
  if (f.platform !== '全部平台' && shop.platform !== f.platform) return [];
  if (!fuzzyMatch(shop.name, f.shop)) return [];
  const ops = shopOpsOf(g.shopId);
  if (!fuzzyMatch(ops.leader, f.opsLeader)) return [];
  if (!fuzzyMatch(ops.specialist, f.opsSpecialist)) return [];
  if (!fuzzyMatch(ops.assistant, f.opsAssistant)) return [];
  if (f.listedFrom && g.listedAt < f.listedFrom) return [];
  if (f.listedTo && g.listedAt > f.listedTo) return [];
  if (f.hitTypes.length > 0) {
    /* 穿梭框选的是小类，行内命中 chips 与商品命中均为大类口径：小类归其所属大类后与命中大类求交，
       否则小类名与大类名永不相交、选任何类型都查空 */
    const cats = new Set(f.hitTypes.map((sub) => HIT_CAT_DEF.find((c) => c.subs.includes(sub))?.name ?? sub));
    const hits = hitTypesOf(g);
    if (!hits.some((h) => cats.has(h.type))) return [];
  }
  if (!inRange(g.orders, f.ordersMin, f.ordersMax)) return [];
  if (!inRange(pct1(g.orders ? g.afterSales / g.orders : 0), f.asMin, f.asMax)) return [];
  if (!inRange(pct1(badRatio(g)), f.brMin, f.brMax)) return [];
  if (!inRange(pct1(riskRatio(g)), f.crMin, f.crMax)) return [];
  if (f.optTask !== '全部') {
    const st = optStatusOf(g);
    if (f.optTask === '无优化任务') { if (st) return []; }
    else if (st !== f.optTask) return [];
  }
  if (f.ever === '优化过' && !optEverOf(g)) return [];
  if (f.ever === '未优化过' && optEverOf(g)) return [];
  const kws = f.q.trim().toLowerCase().split(/[\s,，、]+/).filter(Boolean);
  if (kws.length && !kws.some((kw) => kwHit(g, kw))) return [];
  return [{ g, shop }];
}));
const onQuery = () => { applied.value = { ...draft.value }; };
const onReset = () => { draft.value = blankF(); applied.value = blankF(); };

/* ---------- 命中问题类型穿梭框：左列大类、右列已选小类；点击大类展开其小类，点击小类加入/移除已选集 ---------- */
const hitTypeOpen = ref(false);
const hitTypeLeftRef = ref<HTMLDivElement | null>(null);
const hitTypeRightRef = ref<HTMLDivElement | null>(null);
const hitTypeHoverCat = ref<string | null>(null);
const hitTypeSearch = ref('');
/* 已选小类 → 所属大类（用于右列展示归属） */
const selectedSubToCat = computed(() => {
  const m = new Map<string, string>();
  draft.value.hitTypes.forEach((sub) => {
    const cat = HIT_CAT_DEF.find((c) => c.subs.includes(sub));
    if (cat) m.set(sub, cat.name);
  });
  return m;
});
const toggleHitSub = (sub: string) => {
  const idx = draft.value.hitTypes.indexOf(sub);
  if (idx >= 0) draft.value.hitTypes.splice(idx, 1);
  else draft.value.hitTypes.push(sub);
};
const clearHitTypes = () => { draft.value.hitTypes = []; };
const hitTypeLabel = computed(() => {
  if (!draft.value.hitTypes.length) return '全部类型';
  if (draft.value.hitTypes.length <= 2) return draft.value.hitTypes.join('、');
  return `${draft.value.hitTypes.slice(0, 2).join('、')} 等${draft.value.hitTypes.length}项`;
});
const filteredHitCats = computed(() => {
  const q = hitTypeSearch.value.trim().toLowerCase();
  if (!q) return HIT_CAT_DEF;
  return HIT_CAT_DEF.map((c) => ({
    ...c,
    subs: c.subs.filter((s) => s.toLowerCase().includes(q)),
  })).filter((c) => c.name.toLowerCase().includes(q) || c.subs.length > 0);
});

/* ---------- 复合指标列头：点击列出排序指标气泡（同监控列表交互）；全表单排序槽，选定指标+方向，可清除 ---------- */
type SortKey = 'exp' | 'internal' | 'orders' | 'afterSales' | 'afterRatio' | 'sessions' | 'riskSessions' | 'riskRatio' | 'reviews' | 'badReviews' | 'badPct';
const SCORE_METRICS: { key: SortKey; label: string }[] = [
  { key: 'exp', label: '商品体验分' },
  { key: 'internal', label: '内部商品分' },
];
const ORDER_METRICS: { key: SortKey; label: string }[] = [
  { key: 'orders', label: '订单数' },
  { key: 'afterSales', label: '售后数' },
  { key: 'afterRatio', label: '售后占比' },
];
const CHAT_METRICS: { key: SortKey; label: string }[] = [
  { key: 'sessions', label: '会话数' },
  { key: 'riskSessions', label: '风险会话' },
  { key: 'riskRatio', label: '风险占比' },
];
const REVIEW_METRICS: { key: SortKey; label: string }[] = [
  { key: 'reviews', label: '评价数' },
  { key: 'badReviews', label: '差评数' },
  { key: 'badPct', label: '差评占比' },
];
type PickGroup = 'score' | 'order' | 'chat' | 'review';
const groupMetric = { score: ref<SortKey>('exp'), order: ref<SortKey>('orders'), chat: ref<SortKey>('sessions'), review: ref<SortKey>('reviews') };
const openPick = ref<PickGroup | null>(null);
const sort = ref<{ key: SortKey; desc: boolean } | null>(null);
const sortState = (key: string): 'none' | 'asc' | 'desc' =>
  sort.value?.key === key ? (sort.value.desc ? 'desc' : 'asc') : 'none';
const onPickMetric = (g: PickGroup, key: SortKey) => {
  groupMetric[g].value = key;
  sort.value = { key, desc: sort.value?.key === key ? sort.value.desc : false };
  openPick.value = null;
};
const onPickDir = (g: PickGroup, key: SortKey, desc: boolean) => {
  groupMetric[g].value = key;
  sort.value = { key, desc };
  openPick.value = null;
};
const onClearSort = () => { sort.value = null; openPick.value = null; };
/* 排序气泡支持点空白关闭：document 级 mousedown，落点在任何排序入口 th 之外即收起；入口内点击仍走表头 toggle 与选项逻辑 */
const onDocMouseDownForPick = (e: MouseEvent) => {
  if (!openPick.value) return;
  const t = e.target as Element | null;
  if (t && t.closest && t.closest('.qc-pick-th')) return;
  openPick.value = null;
};
onMounted(() => document.addEventListener('mousedown', onDocMouseDownForPick));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDownForPick));
const metricVal = (g: ShopGood, key: SortKey): number =>
  key === 'exp' ? Number(expOf(g))
    : key === 'internal' ? internalOf(g).total
      : key === 'badPct' ? badRatio(g)
        : key === 'riskRatio' ? riskRatio(g)
          : g[key];
const rowsCalc = computed(() => {
  const s = sort.value;
  if (!s) return filtered.value;
  return [...filtered.value].sort((a, b) => (metricVal(a.g, s.key) - metricVal(b.g, s.key)) * (s.desc ? -1 : 1));
});
/* 模拟接口读取：列表行经 /qc/shop/goods 返回（入参＝生效筛选＋排序），界面只消费响应 data */
type SgRow = { g: ShopGood; shop: NonNullable<ReturnType<typeof shopOf>> };
const rows = ref<SgRow[]>([]);
const loading = ref(false);
/* 请求序号：筛选刚挂载就变更（如跳转带入商品ID）时，丢弃过期响应，避免旧结果覆盖新筛选 */
let rowsSeq = 0;
watch(rowsCalc, async (v) => {
  const seq = ++rowsSeq;
  loading.value = true;
  const res = await qcGet('/qc/shop/goods', { filter: applied.value, sort: sort.value }, () => v);
  if (seq !== rowsSeq) return;
  rows.value = res.data;
  loading.value = false;
}, { immediate: true });

/* 分页：项目统一 ib-pagination 模式，默认 20 条/页（行源＝接口返回的商品行） */
const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize.value)));
const pageRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageList = computed((): (number | 'gap')[] => {
  const total = pageCount.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cur = page.value;
  if (cur <= 6) return [1, 2, 3, 4, 5, 6, 'gap', total];
  if (cur >= total - 5) return [1, 'gap', total - 5, total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap', cur - 1, cur, cur + 1, 'gap', total];
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 20; page.value = 1; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};
watch(applied, () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });

/* ---------- SKU 信息只读弹窗：商品信息列「详」芯片入口；纯文本呈现不可编辑 ---------- */
const skuBox = ref<{ good: ShopGood; rows: ShopGoodSku[] } | null>(null);
const openSku = (g: ShopGood) => { skuBox.value = { good: g, rows: shopGoodSkus(g) }; };

/* ---------- 商品趋势：复用趋势图弹层（四维页签＋周期切换＋五指标双轴），商品口径 totals 取行内复合列同源值；
   带优化任务周期时图上叠加区间色带（开始-结束），用于看优化任务是否有成效 ---------- */
const trendGood = ref<ShopGood | null>(null);
const openTrend = (g: ShopGood) => { trendGood.value = g; };
const goodTotals = (g: ShopGood) => ({ orders: g.orders, refundRate: g.afterRatio, afterSales: g.afterSales, chatRisks: g.riskSessions });

/* ---------- 优化任务：无标签＝未创建→操作列「创建任务」打开发起抽屉（关联商品预置当前行）；
   有标签＝关联待办已完成、进入优化阶段→操作列「优化任务」跳待办任务打开该待办详情（发起人＋处理人）。
   提交后生成「商品优化」待办（已完成态，处理人＝收件人）并把周期与关联待办 id 写回商品 ---------- */
const optGood = ref<ShopGood | null>(null);
const openOpt = (g: ShopGood) => { optGood.value = g; };
/* 有标签＝优化中：抽屉查看关联待办详情（发起人＋处理人） */
const optTodoId = ref<string | null>(null);
const optTodo = computed(() => QC_TODOS.find((t) => t.id === optTodoId.value) ?? null);
const optLabel = (g: ShopGood) => (optStatusOf(g) === '优化中' ? '优化任务' : '创建任务');
const clickOpt = (g: ShopGood) => {
  if (optStatusOf(g) !== '优化中') { openOpt(g); return; }
  optTodoId.value = g.optTask?.todoId ?? null;
};
/* 快捷创建（商品列表「创建任务」）：落一条「我发起·待处理」待办，待办任务模块可直接查看；
   优化周期写回商品挂「优化中」标签，标签行点「优化任务」看关联待办详情 */
const onOptCreated = (p: TodoCreatePayload) => {
  if (p.optCycle) {
    const todo = todoFromDraft({
      title: p.title,
      priority: p.priority,
      body: p.body,
      files: p.files,
      goods: p.goods,
      senders: p.senders,
      deadline: p.deadline,
      type: p.type || '商品优化',
      optPlan: p.optPlan,
      optEnd: p.optEnd,
      optCycle: p.optCycle,
      shops: p.shops,
      autoTo: p.senders.length ? undefined : '接待段',
    });
    QC_TODOS.push(todo);
    p.goods.forEach((gd) => { gd.optTask = { ...p.optCycle!, todoId: todo.id }; });
  }
  optGood.value = null;
};
/* 关联待办详情「关联商品」点击：关抽屉并按商品ID查询本列表（跨模块查看复用现有页面） */
const openOptGood = (g: ShopGood) => {
  optTodoId.value = null;
  shopGoodsJumpSeed.value = { q: g.id };
};

/* 跳转带入条件：店铺列表「店铺商品」带「店铺 + 平台」，监控列表「关联ID」带商品编码搜索；立即生效，消费后清空种子（侧栏直达不带筛选） */
watch(shopGoodsJumpSeed, (s) => {
  if (!s) return;
  const shop = s.shopId ? shopOf(s.shopId) : null;
  const next = shop
    ? { ...blankF(), q: '', platform: shop.platform as PlatSel, shop: shop.name }
    : { ...blankF(), q: s.q ?? '' };
  draft.value = { ...next };
  applied.value = { ...next };
  /* 系列详情·关联商品「详情」带入 openDetail：定位到该商品后直接打开其详情（商品列表/详情页） */
  if (s.openDetail && s.q) {
    const g = goods.value.find((x) => x.id === s.q || x.name === s.q);
    if (g) openScore(g);
  }
  shopGoodsJumpSeed.value = null;
}, { immediate: true });
</script>

<template>
  <div class="qc-ss-page">
    <!-- 查询条件：搜索 / 平台 / 店铺 / 运营组长 / 运营专员 / 运营助理 / 上架时间 / 命中问题类型 -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>搜索</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="商品名称 / 商品ID / 商品编码" :value="draft.q" @input="draft.q = ($event.target as HTMLInputElement).value" @keyup.enter="onQuery">
            <button v-if="draft.q" type="button" class="sg-clear" title="清除" @click="draft.q = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="draft.platform" :options="PLAT_OPTS" @change="(v: string) => (draft.platform = v as PlatSel)" />
        </div>
        <div class="sg-field">
          <label>店铺</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="输入店铺名称" :value="draft.shop" @input="draft.shop = ($event.target as HTMLInputElement).value" @keyup.enter="onQuery">
            <button v-if="draft.shop" type="button" class="sg-clear" title="清除" @click="draft.shop = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>运营组长</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="输入组长姓名" :value="draft.opsLeader" @input="draft.opsLeader = ($event.target as HTMLInputElement).value" @keyup.enter="onQuery">
            <button v-if="draft.opsLeader" type="button" class="sg-clear" title="清除" @click="draft.opsLeader = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>运营专员</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="输入专员姓名" :value="draft.opsSpecialist" @input="draft.opsSpecialist = ($event.target as HTMLInputElement).value" @keyup.enter="onQuery">
            <button v-if="draft.opsSpecialist" type="button" class="sg-clear" title="清除" @click="draft.opsSpecialist = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>运营助理</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="输入助理姓名" :value="draft.opsAssistant" @input="draft.opsAssistant = ($event.target as HTMLInputElement).value" @keyup.enter="onQuery">
            <button v-if="draft.opsAssistant" type="button" class="sg-clear" title="清除" @click="draft.opsAssistant = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>上架时间</label>
          <DateRangePicker v-model:from="draft.listedFrom" v-model:to="draft.listedTo" placeholder="全部时间" />
        </div>
        <div class="sg-field sg-field-hit-type" ref="hitTypeLeftRef">
          <label>命中问题类型</label>
          <div class="sg-hit-trigger" @click="hitTypeOpen = !hitTypeOpen">
            <span class="sg-hit-label" :class="{ ph: !draft.hitTypes.length }">{{ hitTypeLabel }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div v-if="hitTypeOpen" class="sg-hit-popover">
            <div class="sg-hit-search">
              <input class="sg-input" placeholder="搜索大类/小类" :value="hitTypeSearch" @input="hitTypeSearch = ($event.target as HTMLInputElement).value">
            </div>
            <div class="sg-hit-body">
              <div class="sg-hit-left">
                <div v-for="cat in filteredHitCats" :key="cat.name" class="sg-hit-cat" :class="{ active: hitTypeHoverCat === cat.name }" @mouseenter="hitTypeHoverCat = cat.name">
                  <span class="sg-hit-cat-name">{{ cat.name }}</span>
                  <span class="sg-hit-cat-count">{{ cat.subs.length }}</span>
                </div>
              </div>
              <div class="sg-hit-right">
                <div v-if="hitTypeHoverCat" class="sg-hit-subs">
                  <div class="sg-hit-sub-title">{{ hitTypeHoverCat }}</div>
                  <div v-for="sub in (HIT_CAT_DEF.find(c => c.name === hitTypeHoverCat)?.subs ?? [])" :key="sub" class="sg-hit-sub" :class="{ selected: draft.hitTypes.includes(sub) }" @click="toggleHitSub(sub)">
                    <span class="sg-hit-sub-check">{{ draft.hitTypes.includes(sub) ? '✓' : '' }}</span>
                    <span>{{ sub }}</span>
                  </div>
                </div>
                <div v-else class="sg-hit-sub-empty">鼠标悬停左侧大类查看小类</div>
              </div>
            </div>
            <div class="sg-hit-foot">
              <span class="sg-hit-selected-count">已选 {{ draft.hitTypes.length }} 项</span>
              <button type="button" class="sg-btn" @click="clearHitTypes">清空</button>
              <button type="button" class="sg-btn primary" @click="hitTypeOpen = false">确定</button>
            </div>
          </div>
        </div>
        <!-- 数值区间筛选（最小~最大，空串=不限）：订单数＋三占比，口径与行内复合列同源 -->
        <div class="sg-field">
          <label>订单数</label>
          <span class="sg-inputwrap">
            <span class="qc-numpair">
              <input class="sg-input" placeholder="最小" :value="draft.ordersMin" @input="draft.ordersMin = ($event.target as HTMLInputElement).value">
              <i>~</i>
              <input class="sg-input" placeholder="最大" :value="draft.ordersMax" @input="draft.ordersMax = ($event.target as HTMLInputElement).value">
            </span>
            <button v-if="draft.ordersMin || draft.ordersMax" type="button" class="sg-clear" title="清除" @click="draft.ordersMin = ''; draft.ordersMax = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>售后占比（%）</label>
          <span class="sg-inputwrap">
            <span class="qc-numpair">
              <input class="sg-input" placeholder="最小" :value="draft.asMin" @input="draft.asMin = ($event.target as HTMLInputElement).value">
              <i>~</i>
              <input class="sg-input" placeholder="最大" :value="draft.asMax" @input="draft.asMax = ($event.target as HTMLInputElement).value">
            </span>
            <button v-if="draft.asMin || draft.asMax" type="button" class="sg-clear" title="清除" @click="draft.asMin = ''; draft.asMax = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>差评占比（%）</label>
          <span class="sg-inputwrap">
            <span class="qc-numpair">
              <input class="sg-input" placeholder="最小" :value="draft.brMin" @input="draft.brMin = ($event.target as HTMLInputElement).value">
              <i>~</i>
              <input class="sg-input" placeholder="最大" :value="draft.brMax" @input="draft.brMax = ($event.target as HTMLInputElement).value">
            </span>
            <button v-if="draft.brMin || draft.brMax" type="button" class="sg-clear" title="清除" @click="draft.brMin = ''; draft.brMax = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>风险占比（%）</label>
          <span class="sg-inputwrap">
            <span class="qc-numpair">
              <input class="sg-input" placeholder="最小" :value="draft.crMin" @input="draft.crMin = ($event.target as HTMLInputElement).value">
              <i>~</i>
              <input class="sg-input" placeholder="最大" :value="draft.crMax" @input="draft.crMax = ($event.target as HTMLInputElement).value">
            </span>
            <button v-if="draft.crMin || draft.crMax" type="button" class="sg-clear" title="清除" @click="draft.crMin = ''; draft.crMax = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>优化任务</label>
          <BubbleSelect class-name="sg-select" :value="draft.optTask" :options="OPT_OPTS" @change="(v: string) => (draft.optTask = v as OptSel)" />
        </div>
        <div class="sg-field">
          <label>是否优化过</label>
          <BubbleSelect class-name="sg-select" :value="draft.ever" :options="EVER_OPTS" @change="(v: string) => (draft.ever = v as EverSel)" />
        </div>
        <div class="sg-field-actions">
          <button type="button" class="sg-btn" @click="onReset">重置</button>
          <button type="button" class="sg-btn primary" :disabled="loading" @click="onQuery">查询</button>
        </div>
      </div>
    </div>

    <section class="qc-ss-sec qc-sg-sec">
      <table class="qc-sg-table" :class="{ 'is-loading': loading }">
        <thead>
          <tr>
            <th style="width: 320px">商品信息</th>
            <SortTh class="qc-pick-th" label="商品评分" :state="sortState(groupMetric.score.value)" @sort="openPick = openPick === 'score' ? null : 'score'">
              <span v-if="openPick === 'score'" class="qc-sort-pick-menu">
                <span
                  v-for="m in SCORE_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === groupMetric.score.value }"
                  @click.stop="onPickMetric('score', m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir('score', m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir('score', m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(groupMetric.score.value) !== 'none'" class="qc-sort-pick-clear" @click.stop="onClearSort">清除排序</span>
              </span>
            </SortTh>
            <SortTh class="qc-pick-th" label="订单数据" :state="sortState(groupMetric.order.value)" @sort="openPick = openPick === 'order' ? null : 'order'">
              <span v-if="openPick === 'order'" class="qc-sort-pick-menu">
                <span
                  v-for="m in ORDER_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === groupMetric.order.value }"
                  @click.stop="onPickMetric('order', m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir('order', m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir('order', m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(groupMetric.order.value) !== 'none'" class="qc-sort-pick-clear" @click.stop="onClearSort">清除排序</span>
              </span>
            </SortTh>
            <SortTh class="qc-pick-th" label="聊天数据" :state="sortState(groupMetric.chat.value)" @sort="openPick = openPick === 'chat' ? null : 'chat'">
              <span v-if="openPick === 'chat'" class="qc-sort-pick-menu">
                <span
                  v-for="m in CHAT_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === groupMetric.chat.value }"
                  @click.stop="onPickMetric('chat', m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir('chat', m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir('chat', m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(groupMetric.chat.value) !== 'none'" class="qc-sort-pick-clear" @click.stop="onClearSort">清除排序</span>
              </span>
            </SortTh>
            <SortTh class="qc-pick-th" label="评价数据" :state="sortState(groupMetric.review.value)" @sort="openPick = openPick === 'review' ? null : 'review'">
              <span v-if="openPick === 'review'" class="qc-sort-pick-menu">
                <span
                  v-for="m in REVIEW_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === groupMetric.review.value }"
                  @click.stop="onPickMetric('review', m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir('review', m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir('review', m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(groupMetric.review.value) !== 'none'" class="qc-sort-pick-clear" @click.stop="onClearSort">清除排序</span>
              </span>
            </SortTh>
            <th class="qc-sg-hits-th">命中问题类型</th>
            <th>运营信息</th>
            <th>上架时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in pageRows" :key="r.g.id">
            <td>
              <div class="qc-sg-prod">
                <img class="qc-sg-prod-thumb" :src="thumbOf(r.g.id)" :alt="r.g.name">
                <div class="qc-sg-prod-info">
                  <div class="qc-sg-prod-name" :title="r.g.name">{{ r.g.name }}</div>
                  <div class="qc-sg-prod-meta"><span class="qc-sg-prod-lb">商品ID：</span>{{ r.g.id }}</div>
                  <div class="qc-sg-prod-meta"><span class="qc-sg-prod-logo"><img :src="SHOP_LOGO[r.shop.platform]" :alt="r.shop.platform"></span>{{ r.shop.name }}</div>
                  <div v-if="optStatusOf(r.g) === '优化中'" class="qc-sg-opttag" :title="`优化任务周期 ${r.g.optTask?.start} ~ ${r.g.optTask?.openEnd ? '至今（达到指标后结束）' : r.g.optTask?.end}`"><i></i>优化任务</div>
                </div>
                <button type="button" class="qc-sg-detail" title="SKU信息" @click.stop="openSku(r.g)">详</button>
              </div>
            </td>
            <td class="qc-sg-score">
              <div><span class="qc-cd-lb">商品体验分：</span><span class="qc-cd-v">{{ expOf(r.g) }}</span></div>
              <div><span class="qc-cd-lb">内部商品分：</span><span class="qc-cd-v qc-sg-inner" :style="{ color: internalOf(r.g).grade.color }">{{ internalOf(r.g).total }}</span></div>
            </td>
            <td class="qc-sg-order">
              <div><span class="qc-cd-lb">订单数：</span><span class="qc-cd-v">{{ r.g.orders.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">售后数：</span><span class="qc-cd-v">{{ r.g.afterSales }}</span></div>
              <div><span class="qc-cd-lb">售后占比：</span><span class="qc-cd-v rate" :class="rateCls(r.g.afterRatio)">{{ afterPct(r.g) }}</span></div>
            </td>
            <td class="qc-sg-chat">
              <div><span class="qc-cd-lb">会话数：</span><span class="qc-cd-v">{{ r.g.sessions }}</span></div>
              <div><span class="qc-cd-lb">风险会话：</span><span class="qc-cd-v" :class="{ 'rate bad': r.g.riskSessions > 0 }">{{ r.g.riskSessions }}</span></div>
              <div><span class="qc-cd-lb">风险占比：</span><span class="qc-cd-v rate" :class="rateCls(riskRatio(r.g))">{{ riskPct(r.g) }}</span></div>
            </td>
            <td class="qc-sg-review">
              <div><span class="qc-cd-lb">评价数：</span><span class="qc-cd-v">{{ r.g.reviews }}</span></div>
              <div><span class="qc-cd-lb">差评数：</span><span class="qc-cd-v">{{ r.g.badReviews }}</span></div>
              <div><span class="qc-cd-lb">差评占比：</span><span class="qc-cd-v rate" :class="rateCls(badRatio(r.g))">{{ badPct(r.g) }}</span></div>
            </td>
            <td class="qc-sg-hits">
              <div class="prob-tags">
                <template v-if="hitTypesOf(r.g).length">
                  <span
                    v-for="h in shownHitsOf(r.g)"
                    :key="h.type"
                    class="tag pick"
                    :title="`查看「${h.type}」命中详情`"
                    :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
                    @click="openScore(r.g, h.type)"
                  >{{ h.type }} {{ h.count }}</span>
                  <span v-if="extraHitsOf(r.g).length" class="tag prob-more hit-more">
                    +{{ extraHitsOf(r.g).length }}
                    <span class="prob-bubble">
                      <span
                        v-for="h in extraHitsOf(r.g)"
                        :key="h.type"
                        class="tag"
                        :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
                      >{{ h.type }} {{ h.count }}</span>
                    </span>
                  </span>
                </template>
                <span v-else class="tag pick" title="暂无问题命中，点击查看详情" @click="openScore(r.g)">无命中</span>
              </div>
            </td>
            <td class="qc-sg-ops">
              <div><span class="qc-cd-lb">运营助理：</span><span class="qc-cd-v">{{ shopOpsOf(r.g.shopId).assistant }}</span></div>
              <div><span class="qc-cd-lb">运营专员：</span><span class="qc-cd-v">{{ shopOpsOf(r.g.shopId).specialist }}</span></div>
              <div><span class="qc-cd-lb">运营组长：</span><span class="qc-cd-v">{{ shopOpsOf(r.g.shopId).leader }}</span></div>
            </td>
            <td class="qc-sg-date">{{ r.g.listedAt }}</td>
            <td class="qc-sg-op">
              <div class="qc-op-col">
                <a @click="openScore(r.g)">详情</a>
                <a @click="openTrend(r.g)">商品趋势</a>
                <a @click="clickOpt(r.g)">{{ optLabel(r.g) }}</a>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !rows.length">
            <td colspan="9">
              <div class="sg-empty-wrap">
                <div class="sg-empty-icon">◌</div>
                <div>暂无数据，请调整筛选条件</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="pageCount > 1" class="ib-pagination">
        <div class="ib-pageinfo">共 {{ rows.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" :value="`${pageSize}条/页`" :options="['20条/页', '50条/页', '100条/页']" @change="onPageSize" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
          <template v-for="(p, i) in pageList" :key="i">
            <span v-if="p === 'gap'" class="ib-pagedots">…</span>
            <button v-else class="ib-pagebtn" :class="p === page ? 'active' : ''" @click="page = p">{{ p }}</button>
          </template>
          <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input v-model="jumpVal" class="ib-jump-input" @keyup.enter="onJump">
          <span>页</span>
        </div>
      </div>
    </section>

    <!-- SKU 信息只读弹窗：「详」芯片入口；表口径同快捷编辑 SKU 弹窗去编辑态字段（规格下拉/利润/利润率/操作），纯文本不可编辑 -->
    <div v-if="skuBox" class="pm-page qc-sku-host">
      <Modal title="SKU信息" :sub="skuBox.good.name" size="xl" @close="skuBox = null">
        <table class="qc-sku-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>商品编码</th>
              <th>系列编码</th>
              <th>成本价</th>
              <th>售价</th>
              <th>库存数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in skuBox.rows" :key="s.code">
              <td>
                <div class="qc-sku-cell">
                  <img class="qc-sku-img" :src="thumbOf(skuBox.good.id)" :alt="skuBox.good.name">
                  <span class="qc-sku-name" :title="s.name">{{ s.name }}</span>
                </div>
              </td>
              <td class="qc-sku-code">{{ s.code }}</td>
              <td>
                <div class="qc-sku-series-wrap">
                  <span v-for="(sr, idx) in s.series" :key="sr" v-show="idx < 2" class="qc-sku-series">{{ sr }}</span>
                  <span v-if="s.series.length > 2" class="qc-sku-series qc-sku-series-more">+{{ s.series.length - 2 }}</span>
                </div>
              </td>
              <td>{{ s.cost }}</td>
              <td>{{ s.price }}</td>
              <td>{{ s.stock }}</td>
            </tr>
          </tbody>
        </table>
        <template #foot>
          <button class="sg-btn primary" @click="skuBox = null">关闭</button>
        </template>
      </Modal>
    </div>

    <!-- 评分详情：直接复用「系列编码详情」抽屉（数据总览/会话/售后/评价 + 真实记录卡）；入口维度由系列编码改为商品 -->
    <QcSeriesDrawer
      v-if="scoreBox"
      :key="`${scoreBox.good.id}-${scoreBox.initTypes.join(',')}`"
      :series="scoreBox.series"
      :product="productCtx(scoreBox.good)"
      :initial-types="scoreBox.initTypes"
      :on-close="closeScore"
      :all-sessions="drawerSessions"
      :on-update-hits="updateSessionHits"
      :online="true"
    />

    <!-- 商品趋势：复用趋势图弹层（四维页签＋周期切换＋五指标双轴）；带优化任务周期时图上叠加区间色带 -->
    <QcTrendModal
      v-if="trendGood"
      :title="`商品 ${trendGood.name}`"
      :totals="goodTotals(trendGood)"
      :good-types="hitTypesOf(trendGood)"
      :opt-range="trendGood.optTask ?? null"
      :on-close="() => (trendGood = null)"
    />

    <!-- 优化任务：发起「商品优化」待办（关联商品预置当前行）；发起人配置优化任务周期，提交后周期写回商品 -->
    <QcTodoCreateDrawer
      v-if="optGood"
      preset-type="商品优化"
      :preset-goods="optGood"
      @close="optGood = null"
      @created="onOptCreated"
    />

    <!-- 优化任务详情抽屉：有标签行点「优化任务」查看关联待办的发起人与处理人 -->
    <QcTodoDetailDrawer v-if="optTodo" :todo="optTodo" :on-close="() => (optTodoId = null)" :on-open-good="openOptGood" />
  </div>
</template>
