<script setup lang="ts">
/* ---------- 店铺分监控·店铺列表（子路由②）：平台/店铺/体验分三维/操作（趋势图/店铺商品）
   店铺种子与数据概览同源（qcOnlineData.qcShops）；优化任务整体下线（后续再规划） ---------- */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import SortTh from '../../components/SortTh.vue';
import PieChart from './PieChart.vue';
import { CHAT_SORT_METRICS, ORDER_SORT_METRICS, REVIEW_SORT_METRICS, type SortKey } from './QcSeriesList.vue';
import { GRADE_COLOR, SHOP_GRADES, SHOP_LOGO, SHOP_PLATS, onlineHitCats, onlineSeries, qcShops, qcShopGoods, shopGoodOfCode, shopGoodHitTypes, shopGradeOf, type OnlineShop, type ShopGood, type ShopPlat } from './qcOnlineData';
import { PROBLEM_TYPE_COLOR } from './qcCenterData';
import { qcGet } from './qcApi';

defineProps<{ onPickGoods?: (shopId: string) => void }>();

const shops = qcShops;
/* 综合评级：阈值同问题商品定义页 SHOP_GRADE_CFG；新店观察期不计入评级，灰标「不计入」；档位色取数据层单一出口 GRADE_COLOR */
const gradeOf = (s: OnlineShop) => shopGradeOf(s.platform, s.score);

/* ---------- 查询条件：搜索（店铺名/ID）+ 编码（系列编码/商品编码）+ 综合评级；draft 编辑、applied 生效，与售后列表同交互口径。
   平台维度由页首切换器独占（各平台指标口径不一，数据按平台分区展示），不再作为查询条件下拉 ---------- */
type PlatSel = '全部' | ShopPlat;
const GRADE_OPTS = ['全部评级', ...SHOP_GRADES, '新店'];
const blankF = () => ({ q: '', code: '', grade: '全部评级', hitType: '全部', hitSub: '全部' });
/* 问题类型/小类两级条件（看板占比卡点击代入）：大类取命中问题分类清单，小类随大类级联（标签去「XX类-」前缀，同看板下钻卡） */
const TYPE_OPTS = ['全部', ...onlineHitCats().map((c) => c.name)];
const subLabelOf = (catName: string, raw: string) => {
  const p = `${catName}类-`;
  return raw.startsWith(p) ? raw.slice(p.length) : raw;
};
const subOptsOf = (t: string): string[] => {
  if (t === '全部') return ['全部'];
  const cat = onlineHitCats().find((c) => c.name === t);
  return cat ? ['全部', ...cat.subs.map((x) => subLabelOf(t, x.name))] : ['全部'];
};
const draft = ref(blankF());
const applied = ref(blankF());
/* 页首平台切换：下划线 tab（同任务中心类型行语言），切换即生效不经查询按钮；
   首档「全部」＝跨平台总览（全部平台店铺数据，首列恢复平台 logo），其后各平台分区（指标口径不一）；段内计数＝当前其余条件下该范围店铺数 */
const platTab = ref<PlatSel>(SHOP_PLATS[0]);
const setPlatTab = (p: PlatSel) => { platTab.value = p; };
/* 两级页面（同售后概览/列表定稿）：一级＝看板（店铺分布卡＋数据总览＋问题类型占比），二级＝店铺列表 */
const tier = ref<'board' | 'list'>('board');
const ovSnap = ref<{ d: ReturnType<typeof blankF>; a: ReturnType<typeof blankF> } | null>(null);
/* 编码命中：商品编码（SP-）经稳定哈希归属到某件店铺商品→其店铺；系列编码（XL-/系列简称）展开为旗下全部商品编码后同口径归属。
   与店铺商品页「关联ID」跳转、商品编码搜索同源（shopGoodOfCode / onlineSeries） */
const codeHitShop = (shopId: string, raw: string): boolean => {
  const k = raw.trim().toUpperCase();
  if (!k) return true;
  const g = shopGoodOfCode(k);
  if (g && g.shopId === shopId) return true;
  const series = onlineSeries().find((s) => s.seriesCode.toUpperCase() === k || s.name.toUpperCase() === k);
  if (series && series.codes.some((c) => shopGoodOfCode(c.code)?.shopId === shopId)) return true;
  return false;
};
/* 除平台外的其余条件命中（切换器段内计数与列表过滤共用同一谓词，保证计数与结果同源） */
const matchExceptPlat = (s: OnlineShop): boolean => {
  const f = applied.value;
  if (f.grade === '新店') { if (!s.isNew) return false; }
  else if (f.grade !== '全部评级') { if (s.isNew || gradeOf(s) !== f.grade) return false; }
  const kw = f.q.trim().toLowerCase();
  if (kw && !s.name.toLowerCase().includes(kw) && !s.id.toLowerCase().includes(kw)) return false;
  if (!codeHitShop(s.id, f.code)) return false;
  /* 问题类型/小类：店铺命中须含该大类；小类按店铺大类计数的确定性拆包计数 > 0（与看板下钻卡同源） */
  if (f.hitType !== '全部') {
    if (!shopHitsOf(s).some((h) => h.type === f.hitType)) return false;
    if (f.hitSub !== '全部' && (shopSubHits(s, f.hitType).get(f.hitSub) ?? 0) <= 0) return false;
  }
  return true;
};
const platCount = (p: PlatSel) => shops.value.filter((s) => (p === '全部' || s.platform === p) && matchExceptPlat(s)).length;
const filteredCalc = computed(() => shops.value.filter((s) => {
  if (platTab.value !== '全部' && s.platform !== platTab.value) return false;
  return matchExceptPlat(s);
}));
/* 模拟接口读取：店铺列表行经 /qc/shop/list 返回（入参＝生效筛选＋平台切换），界面只消费响应 data */
const filtered = ref<OnlineShop[]>([]);
const loading = ref(false);
watch(filteredCalc, async (v) => {
  loading.value = true;
  const res = await qcGet('/qc/shop/list', { ...applied.value, platform: platTab.value }, () => v);
  filtered.value = res.data;
  loading.value = false;
}, { immediate: true });
const onQuery = () => { applied.value = { ...draft.value }; };
const onReset = () => { draft.value = blankF(); applied.value = blankF(); };

/* ---------- 趋势图（对齐监控列表趋势图样式）：图例胶囊 + 灰底图区（左轴刻度/底部日期/点状折线）+ 悬浮深色取值卡；
   序列＝单店四维 + 平台均值（同平台计入评级店铺的体验分均值）；时间范围近 7/30/90 天可切换；
   图例胶囊点选可隐藏/显示对应指标，隐藏序列不绘制、不进取值卡 ---------- */
const trendShop = ref<OnlineShop | null>(null);
const seedOf = (key: string) => (([...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 89) + 3);
const TREND_RANGES = [7, 30, 90];
const trendRange = ref(30);
const N = computed(() => trendRange.value);
const seriesOfN = (n: number, key: string, cur: number): number[] => {
  const seed = seedOf('shop-' + key);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(seed * 1.3 + i * 0.55) * 0.5 + Math.sin(seed * 2.7 + i * 0.21) * 0.5;
    out.push(cur + wave * 0.05 - (1 - t) * 0.06 * (seed % 2 ? 1 : -1));
  }
  out[n - 1] = cur;
  return out.map((v) => Math.round(v * 100) / 100);
};
const seriesOf = (key: string, cur: number): number[] => seriesOfN(N.value, key, cur);
/* 末端锚定今日，起点按范围回推 */
const T_END = new Date(2026, 9, 10);
const pad2 = (n: number) => String(n).padStart(2, '0');
const tLabel = (i: number) => { const d = new Date(T_END); d.setDate(d.getDate() - (N.value - 1 - i)); return `${d.getMonth() + 1}/${pad2(d.getDate())}`; };
const platAvgOf = (p: ShopPlat) => {
  const list = shops.value.filter((s) => s.platform === p && !s.isNew);
  return Math.round((list.reduce((a, s) => a + s.score, 0) / Math.max(list.length, 1)) * 100) / 100;
};
/* 跨平台总览态基准＝全部平台计入评级店铺均值；单平台态＝该平台均值 */
const allAvgOf = () => {
  const list = shops.value.filter((s) => !s.isNew);
  return Math.round((list.reduce((a, s) => a + s.score, 0) / Math.max(list.length, 1)) * 100) / 100;
};
const scopeAvgOf = () => (platTab.value === '全部' ? allAvgOf() : platAvgOf(platTab.value));
const scopeAvgLabel = computed(() => (platTab.value === '全部' ? '全平台' : platTab.value));
type TrendKey = 'score' | 'goods' | 'logistics' | 'service' | 'platavg';
const TREND_META: { key: TrendKey; label: string; color: string; dash?: boolean }[] = [
  { key: 'score', label: '店铺体验分', color: '#4f7cff' },
  { key: 'goods', label: '商品体验', color: '#00b42a' },
  { key: 'logistics', label: '物流体验', color: '#ff7d00' },
  { key: 'service', label: '服务体验分', color: '#f53f3f' },
  { key: 'platavg', label: '平台店铺体验分均值', color: '#86909c', dash: true },
];
/* 视图切换：评分趋势（四维+平台均值）／命中问题趋势（店铺 Top4 命中类型计数折线）；弹窗标题行右侧（关闭钮左）分段胶囊切换 */
const trendView = ref<'score' | 'hits'>('score');
/* 命中问题序列：计数按范围对近 30 天口径等比缩放并末端锚定，整数折线（波幅随量级） */
const HIT_TOP = 4;
const hitCurOf = (count: number) => Math.max(Math.round((count * trendRange.value) / 30), 1);
const hitSeriesOf = (key: string, cur: number): number[] => {
  /* FNV 哈希取种子：seedOf 的 *31 和模 89 在「同店+同计数不同类型」键上易碰撞致折线重合 */
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const seed = (h % 89) + 3;
  const n = N.value;
  const amp = Math.max(cur * 0.08, 1);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const wave = Math.sin(seed * 1.3 + i * 0.55) * 0.5 + Math.sin(seed * 2.7 + i * 0.21) * 0.5;
    out.push(Math.max(Math.round(cur + wave * amp - (1 - t) * amp * 0.8 * (seed % 2 ? 1 : -1)), 0));
  }
  out[n - 1] = cur;
  return out;
};
const trendSeries = computed(() => {
  const s = trendShop.value;
  if (!s) return [];
  if (trendView.value === 'hits') {
    return shopHitsOf(s).slice(0, HIT_TOP).map((h) => {
      const cur = hitCurOf(h.count);
      return { key: `hit-${h.type}`, label: h.type, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff', dash: false, cur, pts: hitSeriesOf(`${s.id}-${h.type}`, cur) };
    });
  }
  return TREND_META.map((m) => {
    const cur = m.key === 'platavg' ? platAvgOf(s.platform) : s[m.key];
    return { ...m, cur, pts: seriesOf(`${s.id}-${m.key}`, cur) };
  });
});
/* 图例胶囊点选隐藏/显示：隐藏序列不绘制、不进取值卡；取值域随可见序列自适应 */
const hiddenKeys = ref<string[]>([]);
const toggleSeries = (k: string) => {
  const i = hiddenKeys.value.indexOf(k);
  if (i >= 0) hiddenKeys.value.splice(i, 1);
  else hiddenKeys.value.push(k);
  trendHover.value = null;
};
const visibleSeries = computed(() => trendSeries.value.filter((m) => !hiddenKeys.value.includes(m.key)));
/* 图区几何：viewBox 1000x300；取值域随当前序列自适应（含上下留白） */
const TW = 1000;
const TH = 300;
const TL = 46;
const TR = 18;
const TT = 18;
const TB = 34;
const trendDomain = computed(() => {
  const src = visibleSeries.value.length ? visibleSeries.value : trendSeries.value;
  const vals = src.flatMap((m) => m.pts);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  if (trendView.value === 'hits') {
    const pad = Math.max((max - min) * 0.18, 1);
    return { lo: Math.max(Math.floor(min - pad), 0), hi: Math.ceil(max + pad) };
  }
  const pad = Math.max((max - min) * 0.18, 0.05);
  return { lo: Math.floor((min - pad) * 20) / 20, hi: Math.ceil((max + pad) * 20) / 20 };
});
const trendTicks = computed(() => {
  const { lo, hi } = trendDomain.value;
  const raw = [0, 1, 2, 3, 4].map((k) => lo + ((hi - lo) * k) / 4);
  return trendView.value === 'hits' ? raw.map((v) => Math.round(v)) : raw.map((v) => Math.round(v * 100) / 100);
});
/* 刻度/图例/取值卡数值格式：评分两位小数、命中次数整数 */
const fmtTrend = (v: number) => (trendView.value === 'hits' ? String(Math.round(v)) : v.toFixed(2));
const tx = (i: number) => TL + (i * (TW - TL - TR)) / (N.value - 1);
const ty = (v: number) => TT + (1 - (v - trendDomain.value.lo) / (trendDomain.value.hi - trendDomain.value.lo)) * (TH - TT - TB);
const lineOf = (pts: number[]) => pts.map((v, i) => tx(i).toFixed(1) + ',' + ty(v).toFixed(1)).join(' ');
/* x 轴日期刻度：随范围取至多 7 个等距节点 */
const TX_IDX = computed(() => {
  const n = N.value;
  const k = Math.min(n, 7);
  return Array.from({ length: k }, (_, j) => Math.round((j * (n - 1)) / (k - 1)));
});
/* 悬浮：竖向虚线引导 + 深色取值卡（吸附最近一天） */
const trendHover = ref<{ i: number; w: number } | null>(null);
const onTrendMove = (e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const xv = ((e.clientX - r.left) / Math.max(r.width, 1)) * TW;
  trendHover.value = { i: Math.max(0, Math.min(N.value - 1, Math.round(((xv - TL) / (TW - TL - TR)) * (N.value - 1)))), w: r.width };
};
const TTIP_W = 190;
const trendTipStyle = () => {
  const h = trendHover.value;
  if (!h) return {};
  const px = (tx(h.i) / TW) * h.w;
  if (px + 14 + TTIP_W <= h.w) return { left: px + 14 + 'px' };
  return { left: px - 14 + 'px', transform: 'translateX(-100%)' };
};
/* 打开弹窗复位显隐、范围与视图；切换范围/视图清空悬浮避免越界索引 */
const openTrend = (s: OnlineShop) => {
  trendShop.value = s;
  hiddenKeys.value = [];
  trendRange.value = 30;
  trendView.value = 'score';
  trendHover.value = null;
};
const setRange = (r: number) => {
  trendRange.value = r;
  trendHover.value = null;
};
const setTrendView = (v: 'score' | 'hits') => {
  if (trendView.value === v) return;
  trendView.value = v;
  hiddenKeys.value = [];
  trendHover.value = null;
};

/* ---------- 格内迷你趋势（数据看板指标卡同语言）：分值＋较昨日升降＋近 30 天折线，悬浮出日期+取值卡；
   折线末值锚定当前分值，较昨日＝末值−前一日；升降色同看板（升绿/降红/平灰） ---------- */
const SPARK_N = 30;
const SPARK_START = new Date(2026, 8, 11);
const SPARK_AXIS_Y = 34;
const sparkDate = (i: number) => { const d = new Date(SPARK_START); d.setDate(d.getDate() + i); return d; };
const sparkFull = (i: number) => { const d = sparkDate(i); return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`; };
const sparkShort = (i: number) => { const d = sparkDate(i); return `${d.getMonth() + 1}/${d.getDate()}`; };
const sparkSeries = (key: string, cur: number): number[] => {
  const seed = seedOf('spark-' + key);
  const out: number[] = [];
  for (let i = 0; i < SPARK_N; i++) {
    const t = i / (SPARK_N - 1);
    const wave = Math.sin(seed * 1.3 + i * 0.55) * 0.5 + Math.sin(seed * 2.7 + i * 0.21) * 0.5;
    out.push(cur + wave * 0.05 - (1 - t) * 0.06 * (seed % 2 ? 1 : -1));
  }
  out[SPARK_N - 1] = cur;
  return out.map((v) => Math.round(v * 100) / 100);
};
const sparkGeom = (pts: number[]) => {
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const pad = Math.max((max - min) * 0.2, 0.03);
  const lo = min - pad;
  const hi = max + pad;
  const y = (v: number) => 4 + (1 - (v - lo) / (hi - lo)) * 24;
  return { lo, hi, line: pts.map((v, i) => ((i / (pts.length - 1)) * 100).toFixed(2) + ',' + y(v).toFixed(2)).join(' ') };
};
const SPARK_KEYS = ['score', 'goods', 'logistics', 'service'] as const;
type SparkDim = (typeof SPARK_KEYS)[number];

/* ---------- 订单/聊天/评价数据复合列（2026-10-14 用户指令一比一照搬系列编码列表）：店铺旗下商品三口径汇总，
   比率＝售后订单/订单总数、风险会话/会话总数、差评数/评价数，与行内展示同源 ---------- */
type ShopBrief = {
  orders: number; afterSales: number; afterRate: number;
  chatTotal: number; chatRisk: number; chatRate: number;
  reviewTotal: number; reviewBad: number; reviewRate: number;
};
const shopBriefCache = computed(() => {
  const m = new Map<string, ShopBrief>();
  shops.value.forEach((s) => {
    const gs = qcShopGoods.value.filter((g) => g.shopId === s.id);
    const sum = (f: (g: ShopGood) => number) => gs.reduce((a, g) => a + f(g), 0);
    const orders = sum((g) => g.orders);
    const afterSales = sum((g) => g.afterSales);
    const chatTotal = sum((g) => g.sessions);
    const chatRisk = sum((g) => g.riskSessions);
    const reviewTotal = sum((g) => g.reviews);
    const reviewBad = sum((g) => g.badReviews);
    m.set(s.id, {
      orders, afterSales, afterRate: orders ? afterSales / orders : 0,
      chatTotal, chatRisk, chatRate: chatTotal ? chatRisk / chatTotal : 0,
      reviewTotal, reviewBad, reviewRate: reviewTotal ? reviewBad / reviewTotal : 0,
    });
  });
  return m;
});
const briefOf = (s: OnlineShop): ShopBrief => shopBriefCache.value.get(s.id)!;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const rateCls = (v: number) => (v < 0.03 ? 'ok' : v < 0.05 ? 'warn' : 'bad');
type SparkEntry = { pts: number[]; geom: ReturnType<typeof sparkGeom>; delta: number };
const sparkCache = computed(() => {
  const m = new Map<string, SparkEntry>();
  shops.value.forEach((s) => SPARK_KEYS.forEach((k) => {
    const pts = sparkSeries(`${s.id}-${k}`, s[k]);
    m.set(`${s.id}-${k}`, { pts, geom: sparkGeom(pts), delta: Math.round((pts[SPARK_N - 1] - pts[SPARK_N - 2]) * 100) / 100 });
  }));
  return m;
});
const sparkOf = (id: string, k: SparkDim): SparkEntry => sparkCache.value.get(`${id}-${k}`)!;
/* 近30天命中问题列（列头文案 2026-10-14 用户指令改）：店铺旗下全部商品的命中类型（风险会话＋差评＋售后按全局占比拆包）按类型求和、计数降序；3 个折叠 +N 气泡 */
const TYPE_MAX = 3;
const shopHitsCache = computed(() => {
  const m = new Map<string, { type: string; count: number }[]>();
  shops.value.forEach((s) => {
    const acc = new Map<string, number>();
    qcShopGoods.value.filter((g) => g.shopId === s.id)
      .forEach((g) => shopGoodHitTypes(g).forEach(({ type, count }) => acc.set(type, (acc.get(type) || 0) + count)));
    m.set(s.id, [...acc.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count));
  });
  return m;
});
const shopHitsOf = (s: OnlineShop) => shopHitsCache.value.get(s.id) || [];
/* 店铺大类计数按全局小类权重确定性拆包（同看板下钻口径）：小类合计恒等于该店大类计数，末位吸收余数；
   供看板下钻卡按店铺求和、以及小类条件过滤（计数 > 0 即该店涉及此小类） */
const shopSubHits = (s: OnlineShop, catName: string): Map<string, number> => {
  const m = new Map<string, number>();
  const major = shopHitsOf(s).find((h) => h.type === catName)?.count ?? 0;
  const cat = major ? onlineHitCats().find((c) => c.name === catName) : null;
  if (!major || !cat) return m;
  const wSum = cat.subs.reduce((a, x) => a + x.hits, 0) || 1;
  let left = major;
  cat.subs.forEach((x, i) => {
    const v = i === cat.subs.length - 1 ? left : Math.round((x.hits / wSum) * major);
    left -= v;
    const lb = subLabelOf(catName, x.name);
    m.set(lb, (m.get(lb) ?? 0) + v);
  });
  return m;
};
const shownTypes = (s: OnlineShop) => shopHitsOf(s).slice(0, TYPE_MAX);
const extraTypes = (s: OnlineShop) => shopHitsOf(s).slice(TYPE_MAX);
const deltaCls = (d: number) => (d > 0 ? 'up' : d < 0 ? 'down' : '');
const deltaTxt = (d: number) => (d > 0 ? `▲${d.toFixed(2)}` : d < 0 ? `▼${Math.abs(d).toFixed(2)}` : '—');

/* ---------- 页首看板（白面板语言同数据概览／评价看板）：口径＝当前平台切换＋生效查询条件命中的店铺集合（与下方列表同源 filtered）；
   总览五卡覆盖 分数／订单·售后／聊天／差评／问题命中，问题类型占比支持大类→小类下钻（点卡或点扇区，标题返回钮回大类） ---------- */
const boardAgg = computed(() => {
  const list = filtered.value;
  /* 新店不计入评级口径：均值只算计入评级店铺，与数据概览评分看板一致 */
  const graded = list.filter((s) => !s.isNew);
  const avg = (k: 'score' | 'goods' | 'logistics' | 'service') => graded.reduce((a, s) => a + s[k], 0) / Math.max(graded.length, 1);
  let orders = 0; let afterSales = 0; let chatTotal = 0; let chatRisk = 0; let reviewTotal = 0; let reviewBad = 0;
  list.forEach((s) => {
    const b = briefOf(s);
    orders += b.orders; afterSales += b.afterSales;
    chatTotal += b.chatTotal; chatRisk += b.chatRisk;
    reviewTotal += b.reviewTotal; reviewBad += b.reviewBad;
  });
  return {
    shops: list.length, newShops: list.length - graded.length, platAvg: scopeAvgOf(),
    score: avg('score'), goods: avg('goods'), logistics: avg('logistics'), service: avg('service'),
    orders, afterSales, afterRate: orders ? afterSales / orders : 0,
    chatTotal, chatRisk, chatRate: chatTotal ? chatRisk / chatTotal : 0,
    reviewTotal, reviewBad, reviewRate: reviewTotal ? reviewBad / reviewTotal : 0,
  };
});
/* 问题类型占比：店铺旗下商品命中类型（大类口径，同「近30天命中问题」列）按当前店铺集合求和、计数降序 */
const boardTypeItems = computed(() => {
  const acc = new Map<string, number>();
  filtered.value.forEach((s) => shopHitsOf(s).forEach((h) => acc.set(h.type, (acc.get(h.type) ?? 0) + h.count)));
  return [...acc.entries()]
    .map(([label, value]) => ({ label, value, color: PROBLEM_TYPE_COLOR[label] || '#4f7cff' }))
    .sort((a, b) => b.value - a.value);
});
const boardHitTotal = computed(() => boardTypeItems.value.reduce((s, i) => s + i.value, 0));
/* 命中来源两字段：有问题命中的去重店铺数／商品数（这些问题由哪些店的哪些品产生） */
const boardSrc = computed(() => {
  let shops = 0; let goods = 0;
  filtered.value.forEach((s) => {
    const n = qcShopGoods.value.filter((g) => g.shopId === s.id && shopGoodHitTypes(g).length).length;
    if (n) { shops += 1; goods += n; }
  });
  return { shops, goods };
});
/* 下钻小类：逐店按全局小类权重拆包后按当前店铺集合求和（小类合计恒等于大类，且与店铺级小类计数同源——
   小类卡点击代入列表条件后，列表行的小类计数之和即卡上数值）；小类名去「XX类-」前缀，色板沿用数据概览下钻口径 */
const SUB_COLORS = ['#e5484d', '#f76b15', '#7c3aed', '#4f7cff', '#12a594', '#e93d82', '#d46b08', '#1f9d55'];
const boardDetail = ref<string | null>(null);
const boardSubItems = computed(() => {
  const cat = boardDetail.value ? onlineHitCats().find((c) => c.name === boardDetail.value) : null;
  if (!cat) return null;
  const acc = new Map<string, number>();
  filtered.value.forEach((s) => shopSubHits(s, cat.name).forEach((v, k) => acc.set(k, (acc.get(k) ?? 0) + v)));
  return cat.subs.map((x, i) => ({
    label: subLabelOf(cat.name, x.name),
    value: acc.get(subLabelOf(cat.name, x.name)) ?? 0,
    color: SUB_COLORS[i % SUB_COLORS.length],
  }));
});
const boardPieItems = computed(() => boardSubItems.value ?? boardTypeItems.value);
const boardPieTotal = computed(() => boardPieItems.value.reduce((s, i) => s + i.value, 0));
const boardPctOf = (v: number) => (boardPieTotal.value ? `${((v / boardPieTotal.value) * 100).toFixed(1)}%` : '0.0%');
/* 大类态点卡下钻；小类态卡片不再可点（无更下级），仅标题返回钮回大类 */
const drillType = (label: string) => { if (!boardDetail.value) boardDetail.value = label; };

/* ---------- 两级页面（同售后概览/列表定稿）：一级＝看板（店铺分布卡＋数据总览＋问题类型占比），二级＝店铺列表；
   点分布卡代入对应评级条件进二级（快照一级口径），页头返回钮恢复快照回一级 ---------- */
const gotoList = (grade: string) => {
  ovSnap.value = { d: { ...draft.value }, a: { ...applied.value } };
  const next = { ...applied.value, grade };
  draft.value = { ...next };
  applied.value = { ...next };
  tier.value = 'list';
};
/* 看板下钻小类卡点击：大类＋小类一并代入两级条件进二级列表（快照一级口径，返回钮还原） */
const gotoTypeList = (type: string, sub: string) => {
  ovSnap.value = { d: { ...draft.value }, a: { ...applied.value } };
  const next = { ...applied.value, hitType: type, hitSub: sub };
  draft.value = { ...next };
  applied.value = { ...next };
  tier.value = 'list';
};
const backToBoard = () => {
  if (ovSnap.value) {
    draft.value = { ...ovSnap.value.d };
    applied.value = { ...ovSnap.value.a };
    ovSnap.value = null;
  }
  tier.value = 'board';
};
/* 店铺分布卡行：店铺数＋各评级店铺数；新店不计入评级，占比分母＝计入评级店铺（同数据概览评分看板口径） */
const boardGrades = computed(() => {
  const list = filtered.value;
  const graded = list.filter((s) => !s.isNew);
  const counts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  graded.forEach((s) => { counts[gradeOf(s)] += 1; });
  return { total: list.length, newShops: list.length - graded.length, graded: graded.length, counts };
});
const gradePct = (g: string) => (boardGrades.value.graded ? `${Math.round((boardGrades.value.counts[g] / boardGrades.value.graded) * 100)}%` : '0%');

/* ---------- 看板·体验分趋势（图一口径）：全部态＝各平台平均分各一条线（标题「各平台平均分趋势」），指定平台态＝该平台四维体验分均值线；
   单店序列同趋势弹窗口径 seriesOfN，逐日取均值聚合；平滑曲线＋同色渐变面积填充、底部居中图例仅名称；范围近 7/30/90 天独立切换（不与弹窗共用） ---------- */
const PLAT_LINE_COLOR: Record<ShopPlat, string> = { 淘宝: '#ff4e26', 抖音: '#1d2129', 视频号: '#00b42a', 快手: '#f7ba1e' };
const boardRange = ref(30);
const BN = computed(() => boardRange.value);
const BOARD_TREND_KEYS = ['score', 'goods', 'logistics', 'service'] as const;
const meanPts = (per: number[][]) => Array.from({ length: BN.value }, (_, i) => Math.round((per.reduce((a, p) => a + p[i], 0) / per.length) * 100) / 100);
const boardTrendSeries = computed((): { key: string; label: string; color: string; pts: number[] }[] => {
  const graded = filtered.value.filter((s) => !s.isNew);
  if (platTab.value === '全部') {
    return SHOP_PLATS.flatMap((p) => {
      const list = graded.filter((s) => s.platform === p);
      if (!list.length) return [];
      return [{ key: p, label: `${p}平均分`, color: PLAT_LINE_COLOR[p], pts: meanPts(list.map((s) => seriesOfN(BN.value, `${s.id}-score`, s.score))) }];
    });
  }
  if (!graded.length) return [];
  return BOARD_TREND_KEYS.map((k) => {
    const meta = TREND_META.find((m) => m.key === k)!;
    return { key: k as string, label: meta.label, color: meta.color, pts: meanPts(graded.map((s) => seriesOfN(BN.value, `${s.id}-${k}`, s[k]))) };
  });
});
const boardTrendTitle = computed(() => (platTab.value === '全部' ? '各平台平均分趋势' : '体验分趋势'));
const boardDomain = computed(() => {
  const vals = boardTrendSeries.value.flatMap((m) => m.pts);
  if (!vals.length) return { lo: 0, hi: 5 };
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const pad = Math.max((max - min) * 0.18, 0.05);
  return { lo: Math.floor((min - pad) * 20) / 20, hi: Math.ceil((max + pad) * 20) / 20 };
});
const boardTicks = computed(() => [0, 1, 2, 3, 4].map((k) => Math.round((boardDomain.value.lo + ((boardDomain.value.hi - boardDomain.value.lo) * k) / 4) * 100) / 100));
const btx = (i: number) => TL + (i * (TW - TL - TR)) / (BN.value - 1);
const bty = (v: number) => TT + (1 - (v - boardDomain.value.lo) / (boardDomain.value.hi - boardDomain.value.lo)) * (TH - TT - TB);
/* 图一平滑曲线：Catmull-Rom 转三次贝塞尔；面积＝曲线闭合到底边，配渐变填充 */
const bSmooth = (pts: number[]) => {
  const p = pts.map((v, i) => [btx(i), bty(v)] as const);
  if (p.length < 2) return '';
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    d += `C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)},${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)},${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
const bArea = (pts: number[]) => {
  if (pts.length < 2) return '';
  const base = (TH - TB).toFixed(1);
  return `${bSmooth(pts)}L${btx(pts.length - 1).toFixed(1)},${base}L${btx(0).toFixed(1)},${base}Z`;
};
const bTxIdx = computed(() => {
  const n = BN.value;
  const k = Math.min(n, 6);
  return Array.from({ length: k }, (_, j) => Math.round((j * (n - 1)) / (k - 1)));
});
const bLabel = (i: number) => { const d = new Date(T_END); d.setDate(d.getDate() - (BN.value - 1 - i)); return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; };
const boardHover = ref<{ i: number; w: number } | null>(null);
const onBoardMove = (e: MouseEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const xv = ((e.clientX - r.left) / Math.max(r.width, 1)) * TW;
  boardHover.value = { i: Math.max(0, Math.min(BN.value - 1, Math.round(((xv - TL) / (TW - TL - TR)) * (BN.value - 1)))), w: r.width };
};
const boardTipStyle = () => {
  const h = boardHover.value;
  if (!h) return {};
  const px = (btx(h.i) / TW) * h.w;
  if (px + 14 + TTIP_W <= h.w) return { left: px + 14 + 'px' };
  return { left: px - 14 + 'px', transform: 'translateX(-100%)' };
};
const setBoardRange = (r: number) => { boardRange.value = r; boardHover.value = null; };

/* ---------- 看板·TOP 问题店铺（图二口径）：行＝名次徽＋店名/副行＋指标值＋评级芯片，发丝线分隔；
   排序分段＝按命中次数（近30天降序、0 命中不入榜）/按体验分（计入评级店铺升序、最低分最问题）；点行代入店铺名进二级列表 ---------- */
const TOP_N = 5;
const topMode = ref<'hits' | 'score'>('hits');
const boardTopShops = computed(() => {
  const rows = filtered.value.map((s) => ({ s, hits: shopHitsOf(s).reduce((a, h) => a + h.count, 0) }));
  if (topMode.value === 'hits') {
    return rows.filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits || (a.s.name < b.s.name ? -1 : 1)).slice(0, TOP_N);
  }
  return rows.filter((x) => !x.s.isNew).sort((a, b) => a.s.score - b.s.score || (a.s.name < b.s.name ? -1 : 1)).slice(0, TOP_N);
});
const topSubOf = (s: OnlineShop) => {
  const t = shopHitsOf(s)[0]?.type ?? '无命中';
  return platTab.value === '全部' ? `${s.platform} · ${t}` : t;
};
const topColorOf = (s: OnlineShop) => (s.isNew ? '#86909c' : GRADE_COLOR[gradeOf(s)]);
const topChipOf = (s: OnlineShop) => (s.isNew ? '新' : gradeOf(s));
const gotoShop = (name: string) => {
  ovSnap.value = { d: { ...draft.value }, a: { ...applied.value } };
  const next = { ...applied.value, q: name };
  draft.value = { ...next };
  applied.value = { ...next };
  tier.value = 'list';
};

/* ---------- 表头排序（2026-10-14 用户指令）：体验分四维＋订单/聊天/评价九指标统一单排序槽，三态（降/升/无）互斥，仅改行序不改展示；
   复合列排序收在列头指标气泡（同系列编码列表交互：选指标＋指定升降序＋清除） ---------- */
type ShopSortKey = SparkDim | SortKey;
const sortDim = ref<ShopSortKey | null>(null);
const sortDir = ref<'desc' | 'asc'>('desc');
const toggleSort = (k: ShopSortKey) => {
  if (sortDim.value === k) {
    if (sortDir.value === 'desc') sortDir.value = 'asc';
    else { sortDim.value = null; sortDir.value = 'desc'; }
  } else { sortDim.value = k; sortDir.value = 'desc'; }
};
const setSort = (k: ShopSortKey, desc: boolean) => { sortDim.value = k; sortDir.value = desc ? 'desc' : 'asc'; };
const clearSort = () => { sortDim.value = null; sortDir.value = 'desc'; };
const sortState = (k: ShopSortKey | null): 'none' | 'desc' | 'asc' => (!k || sortDim.value !== k ? 'none' : sortDir.value);
/* 复合列当前排序指标：未排序或排序键不属于本列时为 null（列头灰双箭、气泡无选中项） */
const orderMetric = computed(() => (sortDim.value && ORDER_SORT_METRICS.some((m) => m.key === sortDim.value) ? sortDim.value : null));
const chatMetric = computed(() => (sortDim.value && CHAT_SORT_METRICS.some((m) => m.key === sortDim.value) ? sortDim.value : null));
const reviewMetric = computed(() => (sortDim.value && REVIEW_SORT_METRICS.some((m) => m.key === sortDim.value) ? sortDim.value : null));
/* 列头指标气泡：再点列头或点外部收起；选指标＝接管排序（同键循环三态），升降序分段直接指定方向（再点已选方向＝清除） */
const openPick = ref<'order' | 'chat' | 'review' | null>(null);
const onPickDoc = (e: MouseEvent) => {
  if (openPick.value && !(e.target as Element).closest('.qc-pick-th')) openPick.value = null;
};
onMounted(() => document.addEventListener('mousedown', onPickDoc));
onBeforeUnmount(() => document.removeEventListener('mousedown', onPickDoc));
const onPickMetric = (k: ShopSortKey) => { toggleSort(k); openPick.value = null; };
const onPickDir = (k: ShopSortKey, desc: boolean) => {
  if (sortDim.value === k && sortDir.value === (desc ? 'desc' : 'asc')) clearSort();
  else setSort(k, desc);
  openPick.value = null;
};
/* 排序取值：体验分四维取店铺字段；订单/聊天/评价九指标取店铺汇总口径（与行内展示同源） */
const sortVal = (s: OnlineShop, k: ShopSortKey): number => {
  if (k === 'score' || k === 'goods' || k === 'logistics' || k === 'service') return s[k];
  const b = briefOf(s);
  if (k === 'orders') return b.orders;
  if (k === 'afterSales') return b.afterSales;
  if (k === 'afterRate') return b.afterRate;
  if (k === 'chatTotal') return b.chatTotal;
  if (k === 'chatRisk') return b.chatRisk;
  if (k === 'chatRate') return b.chatRate;
  if (k === 'reviewTotal') return b.reviewTotal;
  if (k === 'reviewBad') return b.reviewBad;
  if (k === 'reviewRate') return b.reviewRate;
  return 0;
};
const sortedList = computed(() => {
  const list = [...filtered.value];
  const k = sortDim.value;
  if (!k) return list;
  return list.sort((a, b) => (sortDir.value === 'desc' ? sortVal(b, k) - sortVal(a, k) : sortVal(a, k) - sortVal(b, k)));
});

/* 分页：项目统一 ib-pagination 模式，默认 20 条/页（行源＝排序后店铺列表） */
const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(sortedList.value.length / pageSize.value)));
const pageRows = computed(() => sortedList.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
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
watch([applied, platTab], () => { page.value = 1; jumpVal.value = '1'; boardDetail.value = null; });
watch(page, (v) => { jumpVal.value = String(v); });
/* 悬浮取值：折线圆点＋底部定位点＋白底取值卡（日期＋商家指标水平），卡居中悬浮点于折线上方 */
const sparkHover = ref<{ key: string; i: number; w: number } | null>(null);
const sparkHoverOf = (key: string) => (sparkHover.value && sparkHover.value.key === key ? sparkHover.value : null);
const onSparkMove = (e: MouseEvent, key: string) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const fx = (e.clientX - r.left) / Math.max(r.width, 1);
  sparkHover.value = { key, i: Math.max(0, Math.min(SPARK_N - 1, Math.round(fx * (SPARK_N - 1)))), w: r.width };
};
const sparkHoverLeft = (key: string) => { const h = sparkHoverOf(key); return h ? (h.i / (SPARK_N - 1)) * 100 : 0; };
const sparkYAt = (m: SparkEntry, i: number) => 4 + (1 - (m.pts[i] - m.geom.lo) / (m.geom.hi - m.geom.lo)) * 24;
const sparkHoverTop = (m: SparkEntry, key: string) => { const h = sparkHoverOf(key); return h ? (sparkYAt(m, h.i) / 40) * 100 : 0; };
const SPARK_TIP_W = 176;
const sparkTipStyle = (key: string) => {
  const h = sparkHoverOf(key);
  if (!h) return {};
  const px = (h.i / (SPARK_N - 1)) * h.w;
  return { left: px - SPARK_TIP_W / 2 + 'px', top: 'auto', bottom: 'calc(100% + 6px)' };
};
const sparkHoverDate = (key: string) => { const h = sparkHoverOf(key); return h ? sparkFull(h.i) : ''; };
const sparkHoverVal = (m: SparkEntry, key: string) => { const h = sparkHoverOf(key); return h ? m.pts[h.i].toFixed(2) : ''; };
</script>

<template>
  <div class="qc-ss-page">
    <!-- 二级页头：返回钮＋标题（同售后列表两级页头语言）；一级看板不挂此行 -->
    <div v-if="tier === 'list'" class="qc-head qc-as-head">
      <button type="button" class="qc-as-back" @click="backToBoard">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
        返回店铺看板
      </button>
      <div class="qc-title">店铺列表</div>
    </div>
    <!-- 页首平台切换：下划线 tab（同任务中心类型行语言），计数括号内联，切换即生效不经查询按钮；
         首档「全部」＝跨平台总览（全部平台店铺数据），其后各平台分区 -->
    <div class="qc-sl-platbar">
      <div class="tc-typerow">
        <button type="button" class="tc-typeitem" :class="platTab === '全部' ? 'active' : ''" @click="setPlatTab('全部')">全部({{ platCount('全部') }})</button>
        <button v-for="p in SHOP_PLATS" :key="p" type="button" class="tc-typeitem" :class="platTab === p ? 'active' : ''" @click="setPlatTab(p)">{{ p }}({{ platCount(p) }})</button>
      </div>
    </div>
    <!-- 查询条件：搜索 / 编码（系列编码·商品编码）/ 综合评级（与数据概览评分看板跳转同口径） -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>搜索</label>
          <input class="sg-input" placeholder="店铺名称 / 店铺ID" :value="draft.q" @input="draft.q = ($event.target as HTMLInputElement).value">
        </div>
        <div class="sg-field">
          <label>综合评级</label>
          <BubbleSelect class-name="sg-select" :value="draft.grade" :options="GRADE_OPTS" @change="(v: string) => (draft.grade = v)" />
        </div>
        <div class="sg-field">
          <label>问题类型</label>
          <BubbleSelect class-name="sg-select" :value="draft.hitType" :options="TYPE_OPTS" @change="(v: string) => { draft.hitType = v; draft.hitSub = '全部'; }" />
        </div>
        <!-- 小类随大类级联：未选大类时不展示（无可选小类），看板小类卡点击代入后回显于此 -->
        <div v-if="draft.hitType !== '全部'" class="sg-field">
          <label>问题小类</label>
          <BubbleSelect class-name="sg-select" :value="draft.hitSub" :options="subOptsOf(draft.hitType)" @change="(v: string) => (draft.hitSub = v)" />
        </div>
        <div class="sg-field">
          <label>编码</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="系列编码 / 商品编码" :value="draft.code" @input="draft.code = ($event.target as HTMLInputElement).value" @keyup.enter="onQuery">
            <button v-if="draft.code" type="button" class="sg-clear" title="清除" @click="draft.code = ''; onQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field-actions">
          <button type="button" class="sg-btn" @click="onReset">重置</button>
          <button type="button" class="sg-btn primary" :disabled="loading" @click="onQuery">查询</button>
        </div>
      </div>
    </div>

    <!-- 一级看板：口径＝页首平台切换＋生效查询条件（与二级列表同源 filtered）；
         分布卡（店铺数＋各评级店铺数）在上，点击代入评级条件进二级列表 -->
    <div v-if="tier === 'board'" class="qc-ov-panel qc-sl-ov">
      <div class="qc-flat-grid cols-6 qc-sl-grades">
        <div class="flat-card" title="点击查看当前范围全部店铺" @click="gotoList('全部评级')">
          <div class="k">店铺数</div>
          <div class="v">{{ boardGrades.total.toLocaleString() }}<span class="dept-pct">新店 {{ boardGrades.newShops }}</span></div>
        </div>
        <div
          v-for="g in SHOP_GRADES"
          :key="g"
          class="flat-card"
          :title="`点击查看 ${g} 级店铺（占比＝${g} 级 ÷ 计入评级店铺）`"
          @click="gotoList(g)"
        >
          <div class="k"><i class="qc-sl-gchip" :style="{ color: GRADE_COLOR[g], background: GRADE_COLOR[g] + '1a' }">{{ g }}</i>级</div>
          <div class="v">{{ boardGrades.counts[g].toLocaleString() }}<span class="dept-pct">{{ gradePct(g) }}</span></div>
        </div>
      </div>
      <div class="qc-ov-divider" />
      <div class="qc-sec-head">
        <div class="qc-sec-title">店铺数据总览</div>
        <div class="qc-rv-src" :title="`${scopeAvgLabel}全部计入评级店铺的体验分均值（不随查询条件变化，作对比基准）`">
          <span>{{ scopeAvgLabel }}体验分均值：<b>{{ boardAgg.platAvg.toFixed(2) }}</b></span>
        </div>
      </div>
      <div class="qc-flat-grid cols-5">
        <div class="flat-card after-card" title="计入评级店铺的体验分均值（新店不计入）；子行为商品／物流／服务三维均值">
          <div class="k">平均体验分</div>
          <div class="v">{{ boardAgg.score.toFixed(2) }}</div>
          <div class="after-sess qc-sl-ov-dims">
            <span>商品<b>{{ boardAgg.goods.toFixed(2) }}</b></span>
            <span>物流<b>{{ boardAgg.logistics.toFixed(2) }}</b></span>
            <span>服务<b>{{ boardAgg.service.toFixed(2) }}</b></span>
          </div>
        </div>
        <div class="flat-card after-card" title="店铺旗下商品订单总数；售后率 = 售后订单 ÷ 订单总数">
          <div class="k">订单数据</div>
          <div class="v">{{ boardAgg.orders.toLocaleString() }}</div>
          <div class="after-sess sess-row">
            <span>售后订单<b>{{ boardAgg.afterSales.toLocaleString() }}</b></span>
            <span class="rate" :class="rateCls(boardAgg.afterRate)">{{ pct(boardAgg.afterRate) }}</span>
          </div>
        </div>
        <div class="flat-card after-card" title="店铺旗下商品会话总数；风险率 = 风险会话 ÷ 会话总数">
          <div class="k">聊天数据</div>
          <div class="v">{{ boardAgg.chatTotal.toLocaleString() }}</div>
          <div class="after-sess sess-row">
            <span>风险会话<b>{{ boardAgg.chatRisk.toLocaleString() }}</b></span>
            <span class="rate" :class="rateCls(boardAgg.chatRate)">{{ pct(boardAgg.chatRate) }}</span>
          </div>
        </div>
        <div class="flat-card after-card" title="店铺旗下商品评价数；差评占比 = 差评数 ÷ 评价数">
          <div class="k">评价数据</div>
          <div class="v">{{ boardAgg.reviewTotal.toLocaleString() }}</div>
          <div class="after-sess sess-row">
            <span>差评数<b>{{ boardAgg.reviewBad.toLocaleString() }}</b></span>
            <span class="rate" :class="rateCls(boardAgg.reviewRate)">{{ pct(boardAgg.reviewRate) }}</span>
          </div>
        </div>
        <div class="flat-card after-card" title="店铺旗下商品近30天问题命中总次数（风险会话＋差评＋售后按全局占比拆包）">
          <div class="k">问题命中次数</div>
          <div class="v">{{ boardHitTotal.toLocaleString() }}</div>
          <div class="after-sess sess-row">
            <span>涉及店铺<b>{{ boardSrc.shops }}</b></span>
            <span>涉及商品<b>{{ boardSrc.goods }}</b></span>
          </div>
        </div>
      </div>

      <template v-if="boardHitTotal">
        <div class="qc-ov-divider" />
        <div class="qc-sec-head">
          <div class="qc-sec-title">
            <template v-if="boardDetail">
              <button type="button" class="qc-detail-back" title="返回全部大类" @click="boardDetail = null">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <b class="qc-detail-name">{{ boardDetail }}</b>
            </template>
            <template v-else>问题类型占比</template>
          </div>
        </div>
        <div class="qc-share-row">
          <div class="qc-flat-grid cols-3 qc-share-cards">
            <div
              v-for="i in boardPieItems"
              :key="i.label"
              class="flat-card type-card"
              :title="boardDetail ? `点击查看「${i.label}」问题的店铺列表` : `查看「${i.label}」问题小类`"
              @click="boardDetail ? gotoTypeList(boardDetail, i.label) : drillType(i.label)"
            >
              <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
              <div class="v">{{ i.value.toLocaleString() }}<span class="dept-pct">{{ boardPctOf(i.value) }}</span></div>
            </div>
          </div>
          <div class="qc-share-pie">
            <PieChart
              :items="boardPieItems"
              total-label="命中次数"
              show-value
              value-unit="次"
              :drillable="!boardDetail"
              :on-drill="(l: string) => (boardDetail = l)"
            />
          </div>
        </div>
      </template>
      <div v-else class="qc-sl-ov-empty">当前条件下暂无问题命中</div>
      <!-- 看板底部双模块：体验分趋势（左·四维均值折线，范围独立切换）＋问题店铺TOP榜（右·命中次数前5，点行代入店铺名进二级列表） -->
      <div class="qc-ov-divider" />
      <div class="qc-sl-ov-duo">
        <div class="qc-sl-ov-duo-mod">
          <div class="qc-sec-head">
            <div class="qc-sec-title">{{ boardTrendTitle }}</div>
            <div class="qc-sl-trange">
              <button v-for="r in TREND_RANGES" :key="r" type="button" :class="{ on: boardRange === r }" @click="setBoardRange(r)">近 {{ r }} 天</button>
            </div>
          </div>
          <div v-if="boardTrendSeries.length" class="qc-sl-tpanel qc-sl-tpanel-plain" @mousemove="onBoardMove" @mouseleave="boardHover = null">
            <svg :viewBox="`0 0 ${TW} ${TH}`">
              <defs>
                <linearGradient v-for="(m, i) in boardTrendSeries" :key="'g' + m.key" :id="`qc-bgrad-${i}`" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" :stop-color="m.color" stop-opacity="0.26" />
                  <stop offset="100%" :stop-color="m.color" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <text v-for="t in boardTicks" :key="t" class="ax-y" :x="TL - 8" :y="bty(t) + 4" text-anchor="end">{{ t.toFixed(2) }}</text>
              <text v-for="i in bTxIdx" :key="'bx' + i" class="ax-x" :x="btx(i)" :y="TH - 8" text-anchor="middle">{{ bLabel(i) }}</text>
              <g v-for="(m, i) in boardTrendSeries" :key="m.key">
                <path :d="bArea(m.pts)" :fill="`url(#qc-bgrad-${i})`" stroke="none" />
                <path :d="bSmooth(m.pts)" fill="none" :stroke="m.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              </g>
              <g v-if="boardHover">
                <line :x1="btx(boardHover.i)" :x2="btx(boardHover.i)" :y1="TT" :y2="TH - TB" stroke="#c9cdd4" stroke-dasharray="4 4" />
                <circle v-for="m in boardTrendSeries" :key="'c' + m.key" :cx="btx(boardHover.i)" :cy="bty(m.pts[boardHover.i])" r="3.5" :fill="m.color" />
              </g>
            </svg>
            <div v-if="boardHover" class="qc-sl-ttip" :style="boardTipStyle()">
              <div class="tt-date">{{ bLabel(boardHover.i) }}</div>
              <div v-for="m in boardTrendSeries" :key="m.key" class="tt-row"><i :style="{ background: m.color }" />{{ m.label }}<b>{{ m.pts[boardHover.i].toFixed(2) }}</b></div>
            </div>
          </div>
          <div v-else class="qc-sl-ov-empty">当前条件下暂无计入评级店铺</div>
          <div v-if="boardTrendSeries.length" class="qc-sl-tlegend-b">
            <span v-for="m in boardTrendSeries" :key="m.key"><i :style="{ background: m.color }" />{{ m.label }}</span>
          </div>
        </div>
        <div class="qc-sl-ov-duo-mod">
          <div class="qc-sec-head">
            <div class="qc-sec-title">TOP 问题店铺</div>
            <div class="qc-sl-tswitch">
              <button type="button" :class="{ on: topMode === 'hits' }" @click="topMode = 'hits'">按命中次数</button>
              <button type="button" :class="{ on: topMode === 'score' }" @click="topMode = 'score'">按体验分</button>
            </div>
          </div>
          <div v-if="boardTopShops.length" class="qc-sl-toplist">
            <div
              v-for="(x, idx) in boardTopShops"
              :key="x.s.id"
              class="qc-sl-toprow"
              :title="`近30天命中 ${x.hits.toLocaleString()} 次 · 点击查看「${x.s.name}」店铺列表`"
              @click="gotoShop(x.s.name)"
            >
              <b class="qc-sl-toprank" :class="idx < 3 ? `r${idx + 1}` : ''">{{ idx + 1 }}</b>
              <span class="qc-sl-topmain">
                <b class="qc-sl-topname">{{ x.s.name }}</b>
                <em class="qc-sl-topsub">{{ topSubOf(x.s) }}</em>
              </span>
              <b class="qc-sl-topv" :style="{ color: topColorOf(x.s) }">{{ topMode === 'hits' ? x.hits.toLocaleString() : x.s.score.toFixed(2) }}<em>{{ topMode === 'hits' ? '次' : '分' }}</em></b>
              <i class="qc-sl-gchip" :style="{ color: topColorOf(x.s), background: topColorOf(x.s) + '1a' }">{{ topChipOf(x.s) }}</i>
            </div>
          </div>
          <div v-else class="qc-sl-ov-empty">当前条件下暂无问题命中</div>
        </div>
      </div>
    </div>

    <!-- 二级：店铺列表（平台切换与查询条件同一实例，两态共用） -->
    <section v-else class="qc-ss-sec qc-sl-sec">
      <table class="qc-sl-table" :class="{ 'is-loading': loading }">
        <thead>
          <tr>
            <th style="width: 132px">店铺</th>
            <th style="width: 80px">综合评级</th>
            <SortTh label="店铺体验分" :state="sortState('score')" @sort="toggleSort('score')" width="106px" />
            <th class="qc-exp-th" style="width: 158px">分项体验分</th>
            <!-- 订单/聊天/评价数据复合列：一比一照搬系列编码列表（列头 SortTh+指标气泡、列内三行 kv） -->
            <SortTh class="qc-pick-th" label="订单数据" width="136px" :state="sortState(orderMetric)" @sort="openPick = openPick === 'order' ? null : 'order'">
              <span v-if="openPick === 'order'" class="qc-sort-pick-menu">
                <span
                  v-for="m in ORDER_SORT_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === orderMetric }"
                  @click.stop="onPickMetric(m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir(m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir(m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(orderMetric) !== 'none'" class="qc-sort-pick-clear" @click.stop="clearSort(); openPick = null">清除排序</span>
              </span>
            </SortTh>
            <SortTh class="qc-pick-th" label="聊天数据" width="116px" :state="sortState(chatMetric)" @sort="openPick = openPick === 'chat' ? null : 'chat'">
              <span v-if="openPick === 'chat'" class="qc-sort-pick-menu">
                <span
                  v-for="m in CHAT_SORT_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === chatMetric }"
                  @click.stop="onPickMetric(m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir(m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir(m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(chatMetric) !== 'none'" class="qc-sort-pick-clear" @click.stop="clearSort(); openPick = null">清除排序</span>
              </span>
            </SortTh>
            <SortTh class="qc-pick-th" label="评价数据" width="116px" :state="sortState(reviewMetric)" @sort="openPick = openPick === 'review' ? null : 'review'">
              <span v-if="openPick === 'review'" class="qc-sort-pick-menu">
                <span
                  v-for="m in REVIEW_SORT_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === reviewMetric }"
                  @click.stop="onPickMetric(m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir(m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir(m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(reviewMetric) !== 'none'" class="qc-sort-pick-clear" @click.stop="clearSort(); openPick = null">清除排序</span>
              </span>
            </SortTh>
            <th class="qc-sl-types-th" style="width: 126px">近30天命中问题</th>
            <th style="width: 80px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in pageRows" :key="s.id">
            <td>
              <div class="qc-sl-shop">
                <!-- 平台图标仅跨平台总览态（页首「全部」）展示；单平台态切换器已标明平台，不重复展示 -->
                <span class="ss-top"><img v-if="platTab === '全部'" class="ss-logo" :src="SHOP_LOGO[s.platform]" :alt="s.platform">{{ s.name }}</span>
                <span class="ss-id"><em>店铺ID：</em>{{ s.id }}</span>
                <span class="ss-id"><em>开店时间：</em>{{ s.openAt }}</span>
              </div>
            </td>
            <td>
              <em v-if="!s.isNew" class="qc-sl-grade" :style="{ color: GRADE_COLOR[gradeOf(s)], background: GRADE_COLOR[gradeOf(s)] + '1a' }">{{ gradeOf(s) }}</em>
              <em v-else class="qc-sl-grade none">不计入</em>
            </td>
            <td>
              <!-- 店铺体验分：分值＋较昨日箭标＋近 30 天迷你折线 -->
              <div class="qc-sl-sc">
                <div class="qc-sl-sc-row">
                  <b class="qc-sl-score">{{ s.score.toFixed(2) }}</b>
                  <span class="qc-sl-cmp">较昨日</span>
                  <span class="qc-sl-delta" :class="deltaCls(sparkOf(s.id, 'score').delta)">{{ deltaTxt(sparkOf(s.id, 'score').delta) }}</span>
                </div>
                <div class="qc-sl-spark" @mousemove="onSparkMove($event, s.id + '-score')" @mouseleave="sparkHover = null">
                  <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                    <polyline :points="sparkOf(s.id, 'score').geom.line" fill="none" stroke="#4f7cff" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
                    <line x1="0" x2="100" :y1="SPARK_AXIS_Y" :y2="SPARK_AXIS_Y" stroke="#c9cdd4" stroke-width="1" stroke-dasharray="4 3" vector-effect="non-scaling-stroke" />
                  </svg>
                  <i v-if="sparkHoverOf(s.id + '-score')" class="bm-node" :style="{ left: sparkHoverLeft(s.id + '-score') + '%' }"></i>
                  <i v-if="sparkHoverOf(s.id + '-score')" class="bm-dot" :style="{ left: sparkHoverLeft(s.id + '-score') + '%', top: sparkHoverTop(sparkOf(s.id, 'score'), s.id + '-score') + '%' }"></i>
                  <div v-if="sparkHoverOf(s.id + '-score')" class="bm-tip" :style="sparkTipStyle(s.id + '-score')">
                    <div class="t-date">{{ sparkHoverDate(s.id + '-score') }}</div>
                    <div class="t-row"><i></i>商家指标水平<b>{{ sparkHoverVal(sparkOf(s.id, 'score'), s.id + '-score') }}分</b></div>
                  </div>
                </div>
                <div class="qc-sl-spark-x"><span>{{ sparkShort(0) }}</span><span>{{ sparkShort(SPARK_N - 1) }}</span></div>
              </div>
            </td>
            <td class="qc-exp-data">
              <div><span class="qc-cd-lb">商品体验：</span><span class="qc-cd-v"><b class="qc-sl-score">{{ s.goods.toFixed(2) }}</b><span class="qc-sl-delta" :class="deltaCls(sparkOf(s.id, 'goods').delta)">{{ deltaTxt(sparkOf(s.id, 'goods').delta) }}</span></span></div>
              <div><span class="qc-cd-lb">物流体验：</span><span class="qc-cd-v"><b class="qc-sl-score">{{ s.logistics.toFixed(2) }}</b><span class="qc-sl-delta" :class="deltaCls(sparkOf(s.id, 'logistics').delta)">{{ deltaTxt(sparkOf(s.id, 'logistics').delta) }}</span></span></div>
              <div><span class="qc-cd-lb">服务体验：</span><span class="qc-cd-v"><b class="qc-sl-score">{{ s.service.toFixed(2) }}</b><span class="qc-sl-delta" :class="deltaCls(sparkOf(s.id, 'service').delta)">{{ deltaTxt(sparkOf(s.id, 'service').delta) }}</span></span></div>
            </td>
            <td class="qc-order-data">
              <div><span class="qc-cd-lb">订单总数：</span><span class="qc-cd-v">{{ briefOf(s).orders.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">售后订单：</span><span class="qc-cd-v">{{ briefOf(s).afterSales.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">售后率：</span><span class="qc-cd-v"><span class="rate" :class="rateCls(briefOf(s).afterRate)">{{ pct(briefOf(s).afterRate) }}</span></span></div>
            </td>
            <td class="qc-chat-data">
              <div><span class="qc-cd-lb">会话总数：</span><span class="qc-cd-v">{{ briefOf(s).chatTotal.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">风险会话：</span><span class="qc-cd-v"><span :class="briefOf(s).chatRisk ? 'rate bad' : ''">{{ briefOf(s).chatRisk }}</span></span></div>
              <div><span class="qc-cd-lb">风险率：</span><span class="qc-cd-v"><span class="rate" :class="rateCls(briefOf(s).chatRate)">{{ pct(briefOf(s).chatRate) }}</span></span></div>
            </td>
            <td class="qc-review-data">
              <div><span class="qc-cd-lb">评价数：</span><span class="qc-cd-v">{{ briefOf(s).reviewTotal.toLocaleString() }}</span></div>
              <div><span class="qc-cd-lb">差评数：</span><span class="qc-cd-v"><span :class="briefOf(s).reviewBad ? 'rate bad' : ''">{{ briefOf(s).reviewBad }}</span></span></div>
              <div><span class="qc-cd-lb">差评占比：</span><span class="qc-cd-v"><span class="rate" :class="rateCls(briefOf(s).reviewRate)">{{ pct(briefOf(s).reviewRate) }}</span></span></div>
            </td>
            <td>
              <div v-if="shopHitsOf(s).length" class="prob-tags qc-sl-types">
                <span
                  v-for="h in shownTypes(s)"
                  :key="h.type"
                  class="tag"
                  :title="`近30天「${h.type}」命中 ${h.count} 次（店铺旗下商品的评价/售后/会话汇总）`"
                  :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
                >{{ h.type }} {{ h.count }}</span>
                <span v-if="extraTypes(s).length" class="tag prob-more hit-more">
                  +{{ extraTypes(s).length }}
                  <span class="prob-bubble">
                    <span
                      v-for="h in extraTypes(s)"
                      :key="h.type"
                      class="tag"
                      :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
                    >{{ h.type }} {{ h.count }}</span>
                  </span>
                </span>
              </div>
              <span v-else class="tag">无命中</span>
            </td>
            <td>
              <div class="qc-op-col">
                <a @click="onPickGoods?.(s.id)">店铺商品</a>
                <a @click="openTrend(s)">趋势图</a>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !filtered.length">
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
        <div class="ib-pageinfo">共 {{ sortedList.length }} 条</div>
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
  </div>

  <!-- 趋势图：评分趋势（单店四维 + 平台均值）／命中问题趋势（Top4 命中类型计数）标题行右侧胶囊切换；图例胶囊点选显隐 + 时间范围近 7/30/90 天 + 悬浮深色取值卡 -->
  <Modal v-if="trendShop" :title="trendView === 'hits' ? '命中问题趋势' : '评分趋势'" :sub="`${trendShop.name} · ${trendShop.platform} · 近 ${trendRange} 天`" size="xl" @close="trendShop = null">
    <template #extra>
      <div class="qc-sl-tswitch">
        <button type="button" :class="{ on: trendView === 'score' }" @click="setTrendView('score')">评分趋势</button>
        <button type="button" :class="{ on: trendView === 'hits' }" @click="setTrendView('hits')">命中问题趋势</button>
      </div>
    </template>
    <div class="qc-sl-thead">
      <div class="qc-sl-tlegend">
        <span
          v-for="m in trendSeries"
          :key="m.key"
          class="tl-pill"
          :class="{ off: hiddenKeys.includes(m.key) }"
          :title="hiddenKeys.includes(m.key) ? '点击显示该指标' : '点击隐藏该指标'"
          @click="toggleSeries(m.key)"
        ><i :style="{ background: m.color }" />{{ m.label }}<b>{{ fmtTrend(m.cur) }}</b></span>
      </div>
      <div class="qc-sl-tright">
        <div class="qc-sl-trange">
          <button v-for="r in TREND_RANGES" :key="r" type="button" :class="{ on: trendRange === r }" @click="setRange(r)">近 {{ r }} 天</button>
        </div>
      </div>
    </div>
    <div class="qc-sl-tpanel" @mousemove="onTrendMove" @mouseleave="trendHover = null">
      <svg :viewBox="`0 0 ${TW} ${TH}`">
        <text class="ax-unit" :x="TL - 38" :y="12">{{ trendView === 'hits' ? '次' : '分' }}</text>
        <g v-for="t in trendTicks" :key="t">
          <line :x1="TL" :x2="TW - TR" :y1="ty(t)" :y2="ty(t)" stroke="#e5e6eb" stroke-dasharray="4 4" />
          <text class="ax-y" :x="TL - 8" :y="ty(t) + 4" text-anchor="end">{{ fmtTrend(t) }}</text>
        </g>
        <text v-for="i in TX_IDX" :key="'x' + i" class="ax-x" :x="tx(i)" :y="TH - 10" text-anchor="middle">{{ tLabel(i) }}</text>
        <g v-for="m in visibleSeries" :key="m.key">
          <polyline :points="lineOf(m.pts)" fill="none" :stroke="m.color" stroke-width="2" stroke-linejoin="round" :stroke-dasharray="m.dash ? '6 5' : undefined" />
          <circle v-for="(v, i) in m.pts" :key="i" :cx="tx(i)" :cy="ty(v)" r="3" :fill="m.color" />
        </g>
        <line v-if="trendHover" :x1="tx(trendHover.i)" :x2="tx(trendHover.i)" :y1="TT" :y2="TH - TB" stroke="#c9cdd4" stroke-dasharray="4 4" />
      </svg>
      <div v-if="trendHover && visibleSeries.length" class="qc-sl-ttip" :style="trendTipStyle()">
        <div class="tt-date">{{ tLabel(trendHover.i) }}</div>
        <div v-for="m in visibleSeries" :key="m.key" class="tt-row"><i :style="{ background: m.color }" />{{ m.label }}<b>{{ fmtTrend(m.pts[trendHover.i]) }}</b></div>
      </div>
    </div>
    <template #foot>
      <button class="btn primary" @click="trendShop = null">关闭</button>
    </template>
  </Modal>
</template>
