<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { kpiItems, lossRows, metricNames, stockRows, videoKpiItems, videoLinkRank, videoSellerRank, videoTrendHours, videoTrendToday, videoTrendYesterday } from './data';
import type { LossRow, StockRow } from './data';
import { formatChartValue, isRateMetric, parseNumberText } from './trendChart';
import { SG_STATUS_META } from './shopGoodsData';
import type { SgStatus } from './shopGoodsData';
import TrendModal from './TrendModal.vue';
import SgBatchPriceModal from './SgBatchPriceModal.vue';
import OverviewPage from './OverviewPage.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';

/* Tab 切换：视频号实时数据 / 商品数据（运营驾驶舱）/ 发布数据（店铺商品） */
const dashTab = ref<'video' | 'product' | 'publish'>('product');

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const same = (a: Date | null, b: Date | null) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
const dayMs = (d: Date) => +new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysDiff = (a: Date, b: Date) => Math.round((dayMs(b) - dayMs(a)) / 86400000) + 1;

const profitOptions = [
  { key: 'all', text: '全部' },
  { key: 'negative', text: '新毛六利润负' },
  { key: 'positive', text: '新毛六利润正' },
];

/* ----- 时间栏 / 日历 ----- */
const mode = ref('realtime');
const gran = ref('d');
const dateText = ref('2026-08-12');
const active = ref(new Date(2026, 7, 12));
const cursor = ref(new Date(2026, 7, 1));
const start = ref<Date | null>(null);
const end = ref<Date | null>(null);
/* 日历类型：day=单日日历 week=周选日历 month=月选日历 range=自定义区间双面板 */
const calType = ref<'' | 'day' | 'week' | 'month' | 'range'>('');
const yearCursor = ref(new Date(2026, 0, 1));
const selWeek = ref<{ s: Date; e: Date } | null>(null);
const selMonth = ref<Date | null>(null);
const hoverWeek = ref(0);

/* ----- 指标选择 / 平台 / 利润分析 ----- */
const metricOpen = ref(false);
const selectedMetrics = ref<string[]>([...metricNames]);
const profitOpen = ref(false);
const profitFilter = ref('all');
const profitText = ref<string | null>('全部');

/* ----- 数据模式：视图=指标卡墙 / 列表=指标明细表 ----- */
const viewMode = ref('视图模式');

/* ----- 趋势弹窗 ----- */
const trendMetric = ref<string | null>(null);

/* ----- 亏损/缺货商品：反应式列表 + 勾选 + 上下架状态流转 + 批量操作 ----- */
/* 亏损/缺货合并单卡：下划线 tab 切换，批量按钮与表格跟随 tab */
const listTab = ref<'loss' | 'stock'>('loss');
const lossList = ref(lossRows.map((r) => ({ ...r })));
/* 缺货商品仅展示内仓或外仓至少一个为 0 的商品 */
const stockList = ref(stockRows.filter((r) => Number(r.inner) === 0 || Number(r.outer) === 0).map((r) => ({ ...r })));
const lossSel = ref<Set<LossRow>>(new Set());
const stockSel = ref<Set<StockRow>>(new Set());
/* 勾选按行对象记录（而非下标），排序后选中项不随行序错位 */
const toggleLossCheck = (row: LossRow) => {
  const n = new Set(lossSel.value);
  if (n.has(row)) n.delete(row); else n.add(row);
  lossSel.value = n;
};
const lossAllChecked = computed(() => lossView.value.length > 0 && lossView.value.every((r) => lossSel.value.has(r)));
const toggleLossAll = () => { lossSel.value = lossAllChecked.value ? new Set() : new Set(lossView.value); };
const toggleStockCheck = (row: StockRow) => {
  const n = new Set(stockSel.value);
  if (n.has(row)) n.delete(row); else n.add(row);
  stockSel.value = n;
};
const stockAllChecked = computed(() => stockView.value.length > 0 && stockView.value.every((r) => stockSel.value.has(r)));
const toggleStockAll = () => { stockSel.value = stockAllChecked.value ? new Set() : new Set(stockView.value); };

/* 亏损/缺货列头排序：单列激活，点击循环 降序 → 升序 → 取消 */
const lossSortKey = ref<'' | 'amount' | 'profit' | 'rate'>('');
const lossSortDir = ref<'none' | 'asc' | 'desc'>('none');
const stockSortKey = ref<'' | 'yesterday' | 'week7' | 'stock'>('');
const stockSortDir = ref<'none' | 'asc' | 'desc'>('none');
const cycleSort = <K extends string>(key: K, k: { value: K | '' }, d: { value: 'none' | 'asc' | 'desc' }) => {
  if (k.value !== key) { k.value = key; d.value = 'desc'; }
  else if (d.value === 'desc') d.value = 'asc';
  else if (d.value === 'asc') { k.value = '' as K | ''; d.value = 'none'; }
  else d.value = 'desc';
};
const onLossSort = (k: 'amount' | 'profit' | 'rate') => cycleSort(k, lossSortKey, lossSortDir);
const onStockSort = (k: 'yesterday' | 'week7' | 'stock') => cycleSort(k, stockSortKey, stockSortDir);
const lossSortState = (k: string) => (lossSortKey.value === k ? lossSortDir.value : 'none');
const stockSortState = (k: string) => (stockSortKey.value === k ? stockSortDir.value : 'none');
const lossView = computed(() => {
  const k = lossSortKey.value;
  if (!k || lossSortDir.value === 'none') return lossList.value;
  const dir = lossSortDir.value === 'asc' ? 1 : -1;
  return [...lossList.value].sort((a, b) => (parseNumberText(a[k]) - parseNumberText(b[k])) * dir);
});
const stockView = computed(() => {
  const k = stockSortKey.value;
  if (!k || stockSortDir.value === 'none') return stockList.value;
  const dir = stockSortDir.value === 'asc' ? 1 : -1;
  const val = (r: StockRow) => (k === 'stock' ? Number(r.inner) + Number(r.outer) : parseNumberText(r[k]));
  return [...stockList.value].sort((a, b) => (val(a) - val(b)) * dir);
});

/* 上下架状态流转（与店铺商品同源枚举）：销售中→下架；其余→上架 */
const shelfLabel = (s: SgStatus) => (s === 'selling' ? '下架' : '上架');
const applyShelf = (row: { goodsStatus: SgStatus }) => {
  if (row.goodsStatus === 'selling') {
    row.goodsStatus = 'offManual';
    pushToast('已下架：商品状态变更为已下架');
  } else {
    row.goodsStatus = 'selling';
    pushToast('已上架：商品状态变更为销售中');
  }
};
/* 批量下架（亏损商品）：勾选项统一转已下架 */
const batchOffLoss = () => {
  const n = lossSel.value.size;
  if (!n) return;
  for (const row of lossSel.value) row.goodsStatus = 'offManual';
  lossSel.value = new Set();
  pushToast(`批量下架成功：已下架 ${n} 件商品`);
};
/* 批量调价（缺货商品）：复用店铺商品批量调价弹窗 */
const stockBpOpen = ref(false);
const onStockBpOk = (msg: string) => {
  pushToast(msg);
  stockSel.value = new Set();
};
/* 批量调价（亏损商品）：亏损主因是定价，与缺货同源复用批量调价弹窗 */
const lossBpOpen = ref(false);
const onLossBpOk = (msg: string) => {
  pushToast(msg);
  lossSel.value = new Set();
};

const timebarRef = ref<HTMLDivElement | null>(null);
const metricWrapRef = ref<HTMLDivElement | null>(null);
const profitRef = ref<HTMLDivElement | null>(null);

const onDocClick = (e: MouseEvent) => {
  const t = e.target as Node;
  if (timebarRef.value && !timebarRef.value.contains(t)) calType.value = '';
  if (metricWrapRef.value && !metricWrapRef.value.contains(t)) metricOpen.value = false;
  if (profitRef.value && !profitRef.value.contains(t)) profitOpen.value = false;
};
/* 趋势图按容器实际像素出图，避免 viewBox 拉伸导致轴文字被横向放大/挤压 */
const chartSvgRef = ref<SVGSVGElement | null>(null);
const chartW = ref(660);
const chartH = ref(280);
let chartRo: ResizeObserver | null = null;
/* 视频页签按需渲染，svg 出现后再挂观察器 */
watch(chartSvgRef, (el) => {
  chartRo?.disconnect();
  chartRo = null;
  if (!el || typeof ResizeObserver === 'undefined') return;
  chartRo = new ResizeObserver(() => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      chartW.value = Math.round(r.width);
      chartH.value = Math.round(r.height);
    }
  });
  chartRo.observe(el);
});
onMounted(() => {
  document.addEventListener('click', onDocClick);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  chartRo?.disconnect();
});

function pickDate(d: Date) {
  let s = start.value;
  let e = end.value;
  if (!s || e) {
    s = d;
    e = null;
  } else {
    if (d < s) {
      e = s;
      s = d;
    } else e = d;
    if (daysDiff(s, e) > 31) {
      if (d >= s) {
        e = new Date(s);
        e.setDate(s.getDate() + 30);
      } else {
        s = new Date(e);
        s.setDate(e.getDate() - 30);
      }
      alert('最多选择 31 天');
    }
  }
  start.value = s;
  end.value = e;
  const base = s ?? d;
  cursor.value = new Date(base.getFullYear(), base.getMonth(), 1);
}

const onMode = (m: string) => {
  mode.value = m;
  calType.value = '';
  active.value = new Date(2026, 7, 12);
  if (m === 'realtime') dateText.value = '2026-08-12';
  if (m === '7') dateText.value = '2026-08-06 ~ 2026-08-12';
  if (m === '30') dateText.value = '2026-07-14 ~ 2026-08-12';
};

const onApply = () => {
  if (!start.value) return;
  let e = end.value;
  if (!e) {
    e = new Date(start.value);
    end.value = e;
  }
  dateText.value = same(start.value, e) ? fmt(start.value) : `${fmt(start.value)} ~ ${fmt(e)}`;
  calType.value = '';
  mode.value = 'custom';
};

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/* 日/周/月：打开对应日历（再点收起），交互与风格同图一 */
const onGran = (g: 'd' | 'w' | 'm') => {
  gran.value = g;
  const t = g === 'd' ? 'day' : g === 'w' ? 'week' : 'month';
  calType.value = calType.value === t ? '' : t;
  hoverWeek.value = 0;
  cursor.value = new Date(active.value.getFullYear(), active.value.getMonth(), 1);
  yearCursor.value = new Date(active.value.getFullYear(), 0, 1);
};

/* 日：单日日历点选一天 */
const pickDay = (d: Date) => {
  active.value = d;
  dateText.value = fmt(d);
  mode.value = 'day';
  gran.value = 'd';
  calType.value = '';
};

/* 周：点选所在周 周一~周日 */
const pickWeek = (d: Date) => {
  const s = mondayOf(d);
  const e = addDays(s, 6);
  selWeek.value = { s, e };
  active.value = e;
  dateText.value = `${fmt(s)} ~ ${fmt(e)}`;
  mode.value = 'week';
  gran.value = 'w';
  calType.value = '';
};

/* 月：点选自然月 */
const pickMonth = (mi: number) => {
  const d = new Date(yearCursor.value.getFullYear(), mi, 1);
  selMonth.value = d;
  active.value = d;
  dateText.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  mode.value = 'month';
  gran.value = 'm';
  calType.value = '';
};

/* 周选日历单元格：悬停/选中周 两端实心+中间浅色（图一样式） */
const weekCellCls = (d: Date) => {
  let cls = 'day' + (d.getMonth() !== cursor.value.getMonth() ? ' muted' : '');
  const wm = hoverWeek.value || (selWeek.value ? +mondayOf(selWeek.value.s) : 0);
  if (wm && +mondayOf(d) === wm) {
    const wd = (d.getDay() + 6) % 7;
    cls += wd === 0 || wd === 6 ? ' sel' : ' range';
  }
  return cls;
};

/* ‹ ›：按当前模式粒度前后移（日±1天 / 周±7天 / 月±1月 / 区间±1天） */
const shift = (dir: number) => {
  if (mode.value === 'month') {
    const [y, mo] = dateText.value.split('-').map(Number);
    const d = new Date(y || 2026, ((mo || 1) - 1) + dir, 1);
    selMonth.value = d;
    active.value = d;
    dateText.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    return;
  }
  if (mode.value === 'week' && selWeek.value) {
    const s = addDays(selWeek.value.s, dir * 7);
    const e = addDays(s, 6);
    selWeek.value = { s, e };
    active.value = e;
    dateText.value = `${fmt(s)} ~ ${fmt(e)}`;
    return;
  }
  if (mode.value === '7' || mode.value === '30') {
    const e = addDays(active.value, dir);
    active.value = e;
    dateText.value = `${fmt(addDays(e, mode.value === '7' ? -6 : -29))} ~ ${fmt(e)}`;
    return;
  }
  if (mode.value === 'custom' && start.value && end.value) {
    start.value = addDays(start.value, dir);
    end.value = addDays(end.value, dir);
    active.value = end.value;
    dateText.value = `${fmt(start.value)} ~ ${fmt(end.value)}`;
    return;
  }
  const d = addDays(active.value, dir);
  active.value = d;
  dateText.value = fmt(d);
};

const toggleMetric = (name: string) => {
  selectedMetrics.value = selectedMetrics.value.includes(name)
    ? selectedMetrics.value.filter((m) => m !== name)
    : [...selectedMetrics.value, name];
};

const pickProfit = (key: string, text: string) => {
  profitFilter.value = key;
  profitText.value = text;
  profitOpen.value = false;
};

/* 渲染单个月份面板的 42 天 */
function daysOf(base: Date) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const off = (first.getDay() + 6) % 7;
  const gs = new Date(y, m, 1 - off);
  const cells: { key: string; cls: string; label: number; date: Date }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gs);
    d.setDate(gs.getDate() + i);
    let cls = 'day' + (d.getMonth() !== m ? ' muted' : '');
    const t = dayMs(d);
    const a = start.value ? dayMs(start.value) : 0;
    const b = end.value ? dayMs(end.value) : 0;
    if (same(d, start.value) || same(d, end.value)) cls += ' sel';
    else if (start.value && end.value && t > Math.min(a, b) && t < Math.max(a, b)) cls += ' range';
    cells.push({ key: `d-${y}-${m}-${i}`, cls, label: d.getDate(), date: d });
  }
  return cells;
}

const cursorDays = computed(() => daysOf(cursor.value));
const nextMonthBase = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1));
const nextMonthDays = computed(() => daysOf(nextMonthBase.value));

const rangeText = computed(() => {
  if (start.value && end.value) return `已选择：${fmt(start.value)} 至 ${fmt(end.value)}`;
  if (start.value) return `已选择：${fmt(start.value)}`;
  return '已选择：--';
});

const trendKpi = computed(() => (trendMetric.value ? kpiItems.find((k) => k.metric === trendMetric.value) : undefined));
/* 弹窗左侧对比指标选项源：当前可见的 KPI 卡片列表 */
const visibleKpis = computed(() => kpiItems.filter((k) => selectedMetrics.value.includes(k.metric)).map((k) => ({ metric: k.metric, value: k.value })));

/* ----- 视频号实时数据：上期/上一周期标签（随选中时间变化） ----- */
/* 排行榜成员头像底色：按名次取色，保证同一成员在不同周期颜色稳定 */
const AVATAR_COLORS = ['#4f7cff', '#22a06b', '#f0a020', '#8b5cf6', '#e6455c', '#0ea5e9', '#d946ef', '#14b8a6', '#f97316', '#6366f1'];
const avatarBg = (i: number) => AVATAR_COLORS[i % AVATAR_COLORS.length];
/* 出单链接点图：跳店铺商品并按商品ID代入查询（与消息通知同一桥） */
const opsGoodsLocate = inject<((id: string) => void) | null>('opsGoodsLocate', null);
const goLinkGoods = (id: string) => opsGoodsLocate?.(id);
/* 两个榜单默认展示前 10 名，分页查看全部有数据的商品/成员；页面高度固定 10 行 */
const rankRowH = 52;
const RANK_PAGE_SIZE = 10;
const rankListStyle = { height: `${RANK_PAGE_SIZE * rankRowH}px` };
const linkPage = ref(1);
const sellerPage = ref(1);
/* 双榜表头排序：默认按销售额降序，点击切换升/降序 */
type LinkSortKey = 'amount' | 'orders';
type SellerSortKey = 'amount' | 'links';
const linkSort = ref<{ key: LinkSortKey; dir: 'asc' | 'desc' }>({ key: 'amount', dir: 'desc' });
const sellerSort = ref<{ key: SellerSortKey; dir: 'asc' | 'desc' }>({ key: 'amount', dir: 'desc' });
const rankNum = (v: string) => Number(v.replace(/,/g, '')) || 0;
const sortedLinks = computed(() => {
  const { key, dir } = linkSort.value;
  return videoLinkRank.slice().sort((a, b) => {
    const av = key === 'amount' ? rankNum(a.amount) : a.orders;
    const bv = key === 'amount' ? rankNum(b.amount) : b.orders;
    return (av - bv) * (dir === 'asc' ? 1 : -1);
  });
});
const sortedSellers = computed(() => {
  const { key, dir } = sellerSort.value;
  return videoSellerRank.slice().sort((a, b) => {
    const av = key === 'amount' ? rankNum(a.amount) : a.links;
    const bv = key === 'amount' ? rankNum(b.amount) : b.links;
    return (av - bv) * (dir === 'asc' ? 1 : -1);
  });
});
const toggleLinkSort = (key: LinkSortKey) => {
  linkSort.value = linkSort.value.key === key
    ? { key, dir: linkSort.value.dir === 'desc' ? 'asc' : 'desc' }
    : { key, dir: 'desc' };
  linkPage.value = 1;
};
const toggleSellerSort = (key: SellerSortKey) => {
  sellerSort.value = sellerSort.value.key === key
    ? { key, dir: sellerSort.value.dir === 'desc' ? 'asc' : 'desc' }
    : { key, dir: 'desc' };
  sellerPage.value = 1;
};
const linkSortState = (key: LinkSortKey) => (linkSort.value.key === key ? linkSort.value.dir : 'none');
const sellerSortState = (key: SellerSortKey) => (sellerSort.value.key === key ? sellerSort.value.dir : 'none');
const linkPages = computed(() => Math.max(1, Math.ceil(sortedLinks.value.length / RANK_PAGE_SIZE)));
const sellerPages = computed(() => Math.max(1, Math.ceil(sortedSellers.value.length / RANK_PAGE_SIZE)));
const pagedLinks = computed(() => sortedLinks.value.slice((linkPage.value - 1) * RANK_PAGE_SIZE, linkPage.value * RANK_PAGE_SIZE));
const pagedSellers = computed(() => sortedSellers.value.slice((sellerPage.value - 1) * RANK_PAGE_SIZE, sellerPage.value * RANK_PAGE_SIZE));
const rankNo = (page: number, i: number) => (page - 1) * RANK_PAGE_SIZE + i + 1;
/* 前五名奖牌样式：按名次取不同金属质感；行底色同步渐染 */
const medalCls = (n: number) => (n <= 5 ? `medal-${n}` : '');
const rowTone = (n: number) => (n <= 5 ? `tone-${n}` : '');
/* 卡片标题过长时仅在口径后缀前换行（如「退款金额」/「（完结时间）」），避免断在词中 */
const splitMetricLabel = (m: string) => {
  const i = m.indexOf('（');
  return i > 0 ? { main: m.slice(0, i), qual: m.slice(i) } : { main: m, qual: '' };
};
const videoPrevLabel = computed(() => {
  if (mode.value === 'realtime' || mode.value === 'day') return '昨日全天';
  if (mode.value === 'week') return '上周同期';
  if (mode.value === 'month') return '上月同期';
  if (mode.value === '7') return '前7天';
  if (mode.value === '30') return '前30天';
  return '上一周期';
});

/* 视频号实时数据：今日/昨日 24 小时支付金额趋势图（静态样例） */
const videoHover = ref<number | null>(null);
const videoChart = computed(() => {
  const W = Math.max(360, chartW.value);
  const H = Math.max(200, chartH.value);
  const L = 48;
  const R = 20;
  const T = 34;
  const B = 44;
  const labels = videoTrendHours;
  const s1 = videoTrendToday;
  const s2 = videoTrendYesterday;
  const n = labels.length;
  const max = 22;
  const min = 0;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const x = (i: number) => L + (i / (n - 1)) * plotW;
  const y = (v: number) => T + ((max - v) / (max - min)) * plotH;
  const toPath = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const path1 = toPath(s1);
  const path2 = toPath(s2);
  const area1 = `${path1} L${x(n - 1).toFixed(1)},${(H - B).toFixed(1)} L${x(0).toFixed(1)},${(H - B).toFixed(1)} Z`;
  const yTicks = [0, max * 0.25, max * 0.5, max * 0.75, max].map((v) => ({ value: v.toFixed(2) + '万', y: y(v) }));
  const xTicks = labels.map((l, i) => ({ label: l, x: x(i) }));
  const points1 = s1.map((v, i) => ({ x: x(i), y: y(v), v }));
  const points2 = s2.map((v, i) => ({ x: x(i), y: y(v), v }));
  return { W, H, path1, path2, area1, yTicks, xTicks, points1, points2 };
});
const onVideoMove = (e: MouseEvent) => {
  const svg = e.currentTarget as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const plotX = x - 48;
  const plotW = rect.width - 48 - 20;
  const n = videoTrendHours.length;
  const idx = Math.max(0, Math.min(n - 1, Math.round((plotX / plotW) * (n - 1))));
  videoHover.value = idx;
};
const onVideoLeave = () => {
  videoHover.value = null;
};
const videoTipStyle = computed(() => {
  if (videoHover.value === null) return {};
  const x = videoChart.value.points1[videoHover.value].x;
  return { left: `${(x / videoChart.value.W) * 100}%` };
});

/* ----- 列表模式：维度切换（平台/店铺/主管/组长/运营/助理）× 指标列矩阵 ----- */
/* 行维度选项卡：店铺=平台×店铺行；平台=平台汇总行（含店铺数）；人维度=人×平台汇总行 */
const DIM_TABS = ['平台', '店铺', '主管', '组长', '运营', '助理'] as const;
type DimTab = (typeof DIM_TABS)[number];
const dimTab = ref<DimTab>('店铺');
/* 店铺组织关系：平台/店铺 → 主管/组长/运营/助理（人员与筛选下拉选项同源） */
interface DimOrg { platform: string; shop: string; manager: string; leader: string; operator: string; assistant: string }
const DIM_ORG: DimOrg[] = [
  { platform: '淘宝C店', shop: '快乐小店-佰得小站', manager: '黄亚芳', leader: '李四', operator: '陈鑫', assistant: '小陈' },
  { platform: '淘宝C店', shop: '抖音小店-BB丽居佳/健身弹专区', manager: '黄亚芳', leader: '李四', operator: '小李', assistant: '小吴' },
  { platform: '淘宝C店', shop: '拼多多-阿涛弄弄', manager: '周梦琪', leader: '王五', operator: '小周', assistant: '小林' },
  { platform: '视频号', shop: '快乐小店-佰得小站', manager: '周梦琪', leader: '王五', operator: '陈鑫', assistant: '小陈' },
  { platform: '视频号', shop: '快乐小店-歪歪轩', manager: '张三', leader: '赵六', operator: '小李', assistant: '小吴' },
  { platform: '视频号', shop: '拼多多-朝妮优选的小百货', manager: '张三', leader: '赵六', operator: '小周', assistant: '小林' },
];
/* 维度单元格取值：按行哈希确定性拆分卡片基准值（率类指标围绕基准浮动） */
function dimSeed(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
  return h;
}
/* 单店铺原始值（未格式化）：率类围绕基准浮动，数值类按确定性份额拆分 */
const dimRawValue = (platform: string, shop: string, metric: string, base: number) => {
  const seed = dimSeed(`${platform}::${shop}::${metric}`);
  const share = isRateMetric(metric) ? 0.75 + (seed % 50) / 100 : 0.18 + (seed % 60) / 100;
  return base * share;
};
/* 列表模式排序：指标列点击 降→升→取消（取消后回维度默认序，同概览页排序语言） */
const listSort = ref<{ key: string; dir: 'asc' | 'desc' } | null>(null);
const toggleListSort = (key: string) => {
  if (listSort.value?.key !== key) listSort.value = { key, dir: 'desc' };
  else if (listSort.value.dir === 'desc') listSort.value = { key, dir: 'asc' };
  else listSort.value = null;
};
const listSortState = (key: string): 'none' | 'asc' | 'desc' => (listSort.value?.key === key ? listSort.value.dir : 'none');
/* 店铺行粒度时店铺数恒为 1 无对比意义：按用户要求不作为指标列 */
const dimCols = computed(() => kpiItems.filter((k) => selectedMetrics.value.includes(k.metric) && k.metric !== '店铺数'));
/* 维度列固定全量（用户定案：切维度不丢字段）：平台/店铺/主管/组长/运营/助理 六列常驻，选项卡只切行粒度 */
const DIM_FIELDS = [
  { label: '平台', field: 'platform' },
  { label: '店铺', field: 'shop' },
  { label: '主管', field: 'manager' },
  { label: '组长', field: 'leader' },
  { label: '运营', field: 'operator' },
  { label: '助理', field: 'assistant' },
] as const;
type DimFieldKey = (typeof DIM_FIELDS)[number]['field'];
/* 汇总行维度格：组内取值去重以顿号罗列（单值直接显示），不做纯计数 */
const dimCellText = (members: DimOrg[], field: DimFieldKey) => [...new Set(members.map((m) => m[field]))].join('、');
/* 汇总行指标：成员店铺数值求和，率类取均值（与店铺行同一取数口径，保证下钻一致；单店铺组求和/均值即其本身） */
interface DimRow { key: string; dimCells: string[]; cells: { metric: string; text: string; num: number }[] }
const aggCells = (members: DimOrg[]) =>
  dimCols.value.map((k) => {
    const raws = members.map((m) => dimRawValue(m.platform, m.shop, k.metric, parseNumberText(k.value)));
    const num = raws.reduce((a, b) => a + b, 0) / (isRateMetric(k.metric) ? raws.length : 1);
    return { metric: k.metric, text: formatChartValue(k.metric, num), num };
  });
const dimRows = computed<DimRow[]>(() => {
  let groups: { gk: string; members: DimOrg[] }[];
  if (dimTab.value === '店铺') {
    groups = DIM_ORG.map((o) => ({ gk: `${o.platform}::${o.shop}`, members: [o] }));
  } else if (dimTab.value === '平台') {
    groups = [...new Set(DIM_ORG.map((o) => o.platform))].map((p) => ({ gk: p, members: DIM_ORG.filter((o) => o.platform === p) }));
  } else {
    const field = (DIM_FIELDS.find((f) => f.label === dimTab.value) as { field: DimFieldKey }).field;
    const map = new Map<string, DimOrg[]>();
    for (const o of DIM_ORG) {
      const gk = `${o[field]}::${o.platform}`;
      const arr = map.get(gk);
      if (arr) arr.push(o); else map.set(gk, [o]);
    }
    groups = [...map.entries()].map(([gk, members]) => ({ gk, members }));
  }
  return groups.map(({ gk, members }) => ({
    key: gk,
    dimCells: DIM_FIELDS.map((f) => dimCellText(members, f.field)),
    cells: aggCells(members),
  }));
});
const visibleDimRows = computed(() => {
  const rows = dimRows.value.slice();
  if (!listSort.value) return rows;
  const key = listSort.value.key;
  const dir = listSort.value.dir === 'asc' ? 1 : -1;
  rows.sort((a, b) => ((a.cells.find((c) => c.metric === key)?.num ?? 0) - (b.cells.find((c) => c.metric === key)?.num ?? 0)) * dir);
  return rows;
});
</script>

<template>
  <!-- Tab 切换：视频号实时数据 / 商品数据 / 发布数据；一键分析随 Tab 同行右对齐 -->
  <div class="dash-tabs-row">
    <div class="dash-tabs">
      <button class="dash-tab" :class="{ active: dashTab === 'video' }" @click="dashTab = 'video'">视频号实时数据</button>
      <button class="dash-tab" :class="{ active: dashTab === 'product' }" @click="dashTab = 'product'">商品数据</button>
      <button class="dash-tab" :class="{ active: dashTab === 'publish' }" @click="dashTab = 'publish'">发布数据</button>
    </div>
    <button v-if="dashTab === 'video'" type="button" class="vc-btn vc-btn-green vc-ai-btn">
      <span class="vc-ai-ico" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 3.2l1.9 5.2 5.2 1.9-5.2 1.9L12 17.4l-1.9-5.2-5.2-1.9 5.2-1.9L12 3.2z" fill="currentColor" />
          <path d="M18.4 14.6l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8.8-2.1z" fill="currentColor" opacity=".85" />
        </svg>
      </span>
      一键分析
    </button>
  </div>

  <!-- 商品数据：原运营驾驶舱内容 -->
  <template v-if="dashTab === 'product'">
  <div class="dash-toolbar">
    <div class="dash-line">
    <div ref="timebarRef" class="timebar">
      <span class="label">统计时间</span>
      <span class="date">{{ dateText }}</span>
      <button class="tb mode" :class="mode === 'realtime' ? 'active' : ''" @click="onMode('realtime')">
        实时
      </button>
      <button class="tb mode" :class="mode === '7' ? 'active' : ''" @click="onMode('7')">
        7天
      </button>
      <button class="tb mode" :class="mode === '30' ? 'active' : ''" @click="onMode('30')">
        30天
      </button>
      <button class="tb gran" :class="gran === 'd' ? 'active' : ''" @click="onGran('d')">
        日
      </button>
      <button class="tb gran" :class="gran === 'w' ? 'active' : ''" @click="onGran('w')">
        周
      </button>
      <button class="tb gran" :class="gran === 'm' ? 'active' : ''" @click="onGran('m')">
        月
      </button>
      <button
        class="tb"
        @click="calType = calType === 'range' ? '' : 'range'"
      >
        自定义ⓘ
      </button>
      <button class="tb" @click="shift(-1)">
        ‹
      </button>
      <button class="tb" @click="shift(1)">
        ›
      </button>
      <div class="calendar" :class="{ show: !!calType, narrow: calType !== '' && calType !== 'range' }">
        <!-- 日：单日日历，点选一天 -->
        <div v-if="calType === 'day'" class="cal-panel">
          <div class="chead">
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
            </div>
            <div class="ctitle">
              <span>{{ cursor.getFullYear() }}年</span>
              <span>{{ cursor.getMonth() + 1 }}月</span>
            </div>
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
            </div>
          </div>
          <div class="week">
            <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
          </div>
          <div class="days">
            <button v-for="cell in cursorDays" :key="cell.key" :class="cell.cls" @click="pickDay(cell.date)">
              {{ cell.label }}
            </button>
          </div>
        </div>

        <!-- 周：周选日历，悬停整周高亮、点选 周一~周日（图一样式） -->
        <div v-else-if="calType === 'week'" class="cal-panel">
          <div class="chead">
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
            </div>
            <div class="ctitle">
              <span>{{ cursor.getFullYear() }}年</span>
              <span>{{ cursor.getMonth() + 1 }}月</span>
            </div>
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
            </div>
          </div>
          <div class="week">
            <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
          </div>
          <div class="days" @mouseleave="hoverWeek = 0">
            <button v-for="cell in cursorDays" :key="cell.key" :class="weekCellCls(cell.date)" @mouseenter="hoverWeek = +mondayOf(cell.date)" @click="pickWeek(cell.date)">
              {{ cell.label }}
            </button>
          </div>
        </div>

        <!-- 月：月选日历，点选自然月 -->
        <div v-else-if="calType === 'month'" class="cal-panel">
          <div class="chead">
            <div>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() - 1, 0, 1)">«</button>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() - 1, 0, 1)">‹</button>
            </div>
            <div class="ctitle">
              <span>{{ yearCursor.getFullYear() }}年</span>
            </div>
            <div>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() + 1, 0, 1)">›</button>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() + 1, 0, 1)">»</button>
            </div>
          </div>
          <div class="months">
            <button
              v-for="mi in 12" :key="mi"
              :class="{ on: !!selMonth && selMonth.getFullYear() === yearCursor.getFullYear() && selMonth.getMonth() === mi - 1 }"
              @click="pickMonth(mi - 1)"
            >{{ mi }}月</button>
          </div>
        </div>

        <!-- 自定义区间：双面板日历 -->
        <template v-else>
        <div class="calendar-panels">
          <div class="cal-panel">
            <div class="chead">
              <div>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)"
                >
                  «
                </button>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)"
                >
                  ‹
                </button>
              </div>
              <div class="ctitle">
                <span>{{ cursor.getFullYear() }}年</span>
                <span>{{ cursor.getMonth() + 1 }}月</span>
              </div>
              <div />
            </div>
            <div class="week">
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
              <span>日</span>
            </div>
            <div class="days">
              <button v-for="cell in cursorDays" :key="cell.key" :class="cell.cls" @click="pickDate(cell.date)">
                {{ cell.label }}
              </button>
            </div>
          </div>
          <div class="cal-panel">
            <div class="chead">
              <div />
              <div class="ctitle">
                <span>{{ nextMonthBase.getFullYear() }}年</span>
                <span>{{ nextMonthBase.getMonth() + 1 }}月</span>
              </div>
              <div>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)"
                >
                  ›
                </button>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)"
                >
                  »
                </button>
              </div>
            </div>
            <div class="week">
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
              <span>日</span>
            </div>
            <div class="days">
              <button v-for="cell in nextMonthDays" :key="cell.key" :class="cell.cls" @click="pickDate(cell.date)">
                {{ cell.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="cnote">* 最少选择 1 天 最多选择 31 天</div>
        <div class="cfoot">
          <div class="rangeText">{{ rangeText }}</div>
          <div>
            <button
              class="smallBtn"
              @click.stop="start = null; end = null"
            >
              清除
            </button>
            <button
              class="smallBtn primary"
              @click.stop="onApply()"
            >
              确定
            </button>
          </div>
        </div>
        </template>
      </div>
    </div>
    <div class="dash-spacer" />
    <button class="refresh">刷新数据</button>
    <div ref="metricWrapRef" class="metric-wrap">
      <button
        class="metric-toggle"
        @click.stop="metricOpen = !metricOpen"
      >
        指标选择 ▾
      </button>
      <div class="metric-dropdown" :class="metricOpen ? 'show' : ''">
        <div class="metrics">
          <span class="mtitle">指标选择</span>
          <button
            v-for="name in metricNames"
            :key="name"
            class="chip"
            :class="selectedMetrics.includes(name) ? 'active' : ''"
            @click.stop="toggleMetric(name)"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </div>
    </div>
    <div class="dash-line">
      <BubbleSelect
        class-name="platformSelect"
        :value="viewMode"
        :options="['视图模式', '列表模式']"
        @change="(v: string) => {
          if (v) viewMode = v;
        }"
      />
      <!-- 维度切换选项卡：平台/店铺/主管/组长/运营/助理，仅列表模式存在，只切行粒度、维度六列常驻 -->
      <div v-if="viewMode === '列表模式'" class="dash-dim-seg">
        <button
          v-for="t in DIM_TABS"
          :key="t"
          type="button"
          class="dash-dim-seg-item"
          :class="dimTab === t ? 'active' : ''"
          @click="dimTab = t"
        >
          {{ t }}
        </button>
      </div>
      <BubbleSelect
        class-name="platformSelect"
        default-value="平台"
        :options="['平台', '全部', '淘宝C店', '视频号']"
        @change="(v: string) => {
          if (v && v !== '平台') {
            console.log('已切换平台：' + v);
          }
        }"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="店铺"
        :options="['全部店铺', '快乐小店-佰得小站', '抖音小店-BB丽居佳/健身弹专区', '拼多多-潮眼优选的小百货']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="主管"
        :options="['全部主管', '黄亚芳', '周梦琪', '张三']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="组长"
        :options="['全部组长', '李四', '王五', '赵六']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="运营"
        :options="['全部运营', '陈鑫', '小李', '小周']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="助理"
        :options="['全部助理', '小陈', '小吴', '小林']"
      />
      <div ref="profitRef" class="profit-filter">
      <button
        class="profit-btn"
        @click.stop="profitOpen = !profitOpen"
      >
        {{ profitText ? `利润分析：${profitText} ▾` : '利润分析 ▾' }}
      </button>
      <div class="profit-menu" :class="profitOpen ? 'show' : ''">
        <div
          v-for="opt in profitOptions"
          :key="opt.key"
          class="profit-option"
          :class="profitFilter === opt.key ? 'active' : ''"
          @click.stop="pickProfit(opt.key, opt.text)"
        >
          {{ opt.text }}
        </div>
      </div>
    </div>
    </div>
  </div>

  <div v-if="viewMode === '视图模式'" class="kpis">
    <div
      v-for="kpi in kpiItems"
      :key="kpi.metric"
      class="card kpi"
      :class="selectedMetrics.includes(kpi.metric) ? '' : 'hidden'"
      @click="trendMetric = kpi.metric"
    >
      <div class="klabel">{{ kpi.metric }}</div>
      <div class="kval">{{ kpi.value }}</div>
      <div v-for="(seg, i) in kpi.foot" :key="i" class="kfoot" :class="seg.cls ?? ''">
        <span v-for="(line, j) in seg.lines" :key="j">
          <br v-if="j > 0" />
          {{ line }}
        </span>
      </div>
    </div>
  </div>

  <!-- 列表模式：维度六列（常驻不丢字段）× 指标列矩阵，行粒度随选项卡切换，指标列跟随指标选择、可排序 -->
  <div v-else-if="viewMode === '列表模式'" class="list-card">
    <div class="dash-dim-wrap">
      <table class="list-table dash-dim-table">
        <thead>
          <tr>
            <th
              v-for="f in DIM_FIELDS"
              :key="f.label"
              :class="f.label === '平台' ? 'dim-c-plat' : f.label === '店铺' ? 'dim-c-shop' : 'dim-c-org'"
            >
              {{ f.label }}
            </th>
            <SortTh v-for="k in dimCols" :key="k.metric" :label="k.metric" :state="listSortState(k.metric)" @sort="toggleListSort(k.metric)" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleDimRows" :key="row.key">
            <td
              v-for="(c, i) in row.dimCells"
              :key="i"
              :class="DIM_FIELDS[i].label === '平台' ? 'dim-c-plat' : DIM_FIELDS[i].label === '店铺' ? 'dim-c-shop' : 'dim-c-org'"
            >
              {{ c }}
            </td>
            <td v-for="c in row.cells" :key="c.metric">{{ c.text }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>



  <div class="dashboard-lists">
    <!-- 亏损/缺货合并单卡：tab 切换两表，头副行与批量按钮跟随当前 tab -->
    <div class="list-card">
      <div class="list-head">
        <div>
          <div class="dl-tabs">
            <button type="button" class="dl-tab" :class="listTab === 'loss' ? 'active' : ''" @click="listTab = 'loss'">
              亏损商品
            </button>
            <button type="button" class="dl-tab" :class="listTab === 'stock' ? 'active' : ''" @click="listTab = 'stock'">
              缺货商品
            </button>
          </div>
          <div class="sub">{{ listTab === 'loss' ? '仅展示利润异常商品，便于快速排查和处理' : '仅展示库存紧张或已缺货商品，便于补货跟进' }}</div>
        </div>
        <div class="list-batch">
          <button v-if="listTab === 'loss'" class="sg-btn" :disabled="lossSel.size === 0" @click="lossBpOpen = true">
            批量调价{{ lossSel.size ? `（${lossSel.size}）` : '' }}
          </button>
          <button v-if="listTab === 'loss'" class="sg-btn" :disabled="lossSel.size === 0" @click="batchOffLoss">
            批量下架{{ lossSel.size ? `（${lossSel.size}）` : '' }}
          </button>
          <button v-else class="sg-btn" :disabled="stockSel.size === 0" @click="stockBpOpen = true">
            批量调价{{ stockSel.size ? `（${stockSel.size}）` : '' }}
          </button>
        </div>
      </div>
      <table v-if="listTab === 'loss'" class="list-table">
        <thead>
          <tr>
            <th :style="{ width: '44px' }"><input type="checkbox" :checked="lossAllChecked" @change="toggleLossAll" /></th>
            <th :style="{ width: '56px' }">序号</th>
            <th>商品信息</th>
            <th>店铺</th>
            <th>平台</th>
            <SortTh label="销售金额" :state="lossSortState('amount')" @sort="onLossSort('amount')" />
            <SortTh label="新毛六利润" :state="lossSortState('profit')" @sort="onLossSort('profit')" />
            <SortTh label="新毛六利润率" :state="lossSortState('rate')" @sort="onLossSort('rate')" />
            <th>商品状态</th>
            <th :style="{ width: '110px' }">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in lossView" :key="i">
            <td><input type="checkbox" :checked="lossSel.has(row)" @change="toggleLossCheck(row)" /></td>
            <td>{{ i + 1 }}</td>
            <td class="item-info">
              <div class="item-product">
                <img class="ib-thumb" :src="row.thumb" />
                <div>
                  <div class="item-title">{{ row.title }}</div>
                  <div class="item-meta">
                    {{ row.meta[0] }}
                    <br />
                    {{ row.meta[1] }}
                  </div>
                </div>
              </div>
            </td>
            <td>{{ row.store }}</td>
            <td>{{ row.platform }}</td>
            <td>{{ row.amount }}</td>
            <td>
              <span class="badge-red">{{ row.profit }}</span>
            </td>
            <td>
              <span class="badge-red">{{ row.rate }}</span>
            </td>
            <td>
              <div class="sg-status">
                <span class="sg-dot" :style="{ background: SG_STATUS_META[row.goodsStatus].dot }" />
                <span :style="{ color: SG_STATUS_META[row.goodsStatus].color }">{{ SG_STATUS_META[row.goodsStatus].label }}</span>
              </div>
            </td>
            <td>
              <a class="action-link" href="javascript:void(0)">
                详情
              </a>
              <a class="action-link" href="javascript:void(0)" @click="applyShelf(row)">
                {{ shelfLabel(row.goodsStatus) }}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
      <table v-else class="list-table">
        <thead>
          <tr>
            <th :style="{ width: '44px' }"><input type="checkbox" :checked="stockAllChecked" @change="toggleStockAll" /></th>
            <th :style="{ width: '56px' }">序号</th>
            <th>商品信息</th>
            <th>店铺</th>
            <th>平台</th>
            <SortTh label="昨日销量" :state="stockSortState('yesterday')" @sort="onStockSort('yesterday')" />
            <SortTh label="近7日销量" :state="stockSortState('week7')" @sort="onStockSort('week7')" />
            <SortTh label="库存数" :state="stockSortState('stock')" @sort="onStockSort('stock')" />
            <th>商品状态</th>
            <th :style="{ width: '110px' }">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in stockView" :key="i">
            <td><input type="checkbox" :checked="stockSel.has(row)" @change="toggleStockCheck(row)" /></td>
            <td>{{ i + 1 }}</td>
            <td class="item-info">
              <div class="item-product">
                <img class="ib-thumb" :src="row.thumb" />
                <div>
                  <div class="item-title">{{ row.title }}</div>
                  <div class="item-meta">
                    {{ row.meta[0] }}
                    <br />
                    {{ row.meta[1] }}
                  </div>
                </div>
              </div>
            </td>
            <td>{{ row.store }}</td>
            <td>{{ row.platform }}</td>
            <td>{{ row.yesterday }}</td>
            <td>{{ row.week7 }}</td>
            <td>
              <div class="stock-cell">
                <div class="stock-line"><span class="stock-k">内仓：</span>{{ row.inner }}</div>
                <div class="stock-line"><span class="stock-k">外仓：</span>{{ row.outer }}</div>
              </div>
            </td>
            <td>
              <div class="sg-status">
                <span class="sg-dot" :style="{ background: SG_STATUS_META[row.goodsStatus].dot }" />
                <span :style="{ color: SG_STATUS_META[row.goodsStatus].color }">{{ SG_STATUS_META[row.goodsStatus].label }}</span>
              </div>
            </td>
            <td>
              <a class="action-link" href="javascript:void(0)">
                详情
              </a>
              <a class="action-link" href="javascript:void(0)" @click="applyShelf(row)">
                {{ shelfLabel(row.goodsStatus) }}
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 缺货商品批量调价：复用店铺商品批量调价弹窗宿主 -->
  <div class="pm-page pm-host">
    <SgBatchPriceModal
      v-if="stockBpOpen && stockSel.size > 0"
      :count="stockSel.size"
      @close="stockBpOpen = false"
      @ok="onStockBpOk"
    />
    <!-- 亏损商品批量调价：同源复用 -->
    <SgBatchPriceModal
      v-if="lossBpOpen && lossSel.size > 0"
      :count="lossSel.size"
      @close="lossBpOpen = false"
      @ok="onLossBpOk"
    />
  </div>

  <TrendModal
    v-if="trendMetric && trendKpi"
    :metric="trendMetric"
    :kpi-value-text="trendKpi.value"
    :date-text="dateText"
    :mode="mode"
    :kpis="visibleKpis"
    @close="trendMetric = null"
  />
  </template>

  <!-- 视频号实时数据：按图二样式还原，已删除框选指标（访客数/支付买家数/支付转化率/加购人数） -->
  <template v-else-if="dashTab === 'video'">
    <div class="vc-board card">
      <div class="vc-head">
        <div class="vc-title-row">
          <div class="vc-title">
            <span class="vc-title-icon" />
            数据概览
          </div>
        </div>
      </div>

      <div class="vc-toolbar">
        <div ref="timebarRef" class="timebar">
          <span class="label">统计时间</span>
          <span class="date">{{ dateText }} 17:54:48</span>
          <button class="tb" :class="{ active: mode === 'realtime' }" @click="onMode('realtime')">实时</button>
          <button class="tb" :class="{ active: gran === 'd' && mode !== 'realtime' }" @click="onGran('d')">日</button>
          <button class="tb" :class="{ active: gran === 'w' }" @click="onGran('w')">周</button>
          <button class="tb" :class="{ active: gran === 'm' }" @click="onGran('m')">月</button>
          <button class="tb" :class="{ active: calType === 'range' }" @click="calType = calType === 'range' ? '' : 'range'">自定义</button>
          <button class="tb" @click="shift(-1)">‹</button>
          <button class="tb" @click="shift(1)">›</button>
          <div class="calendar" :class="{ show: !!calType, narrow: calType !== '' && calType !== 'range' }">
            <div v-if="calType === 'day'" class="cal-panel">
              <div class="chead">
                <div>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
                </div>
                <div class="ctitle">
                  <span>{{ cursor.getFullYear() }}年</span>
                  <span>{{ cursor.getMonth() + 1 }}月</span>
                </div>
                <div>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
                </div>
              </div>
              <div class="week">
                <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
              </div>
              <div class="days">
                <button v-for="cell in cursorDays" :key="cell.key" :class="cell.cls" @click="pickDay(cell.date)">
                  {{ cell.label }}
                </button>
              </div>
            </div>
            <div v-else-if="calType === 'week'" class="cal-panel">
              <div class="chead">
                <div>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
                </div>
                <div class="ctitle">
                  <span>{{ cursor.getFullYear() }}年</span>
                  <span>{{ cursor.getMonth() + 1 }}月</span>
                </div>
                <div>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
                  <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
                </div>
              </div>
              <div class="week">
                <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
              </div>
              <div class="days" @mouseleave="hoverWeek = 0">
                <button v-for="cell in cursorDays" :key="cell.key" :class="weekCellCls(cell.date)" @mouseenter="hoverWeek = +mondayOf(cell.date)" @click="pickWeek(cell.date)">
                  {{ cell.label }}
                </button>
              </div>
            </div>
            <div v-else-if="calType === 'month'" class="cal-panel">
              <div class="chead">
                <div>
                  <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() - 1, 0, 1)">«</button>
                  <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() - 1, 0, 1)">‹</button>
                </div>
                <div class="ctitle">
                  <span>{{ yearCursor.getFullYear() }}年</span>
                </div>
                <div>
                  <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() + 1, 0, 1)">›</button>
                  <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() + 1, 0, 1)">»</button>
                </div>
              </div>
              <div class="months">
                <button
                  v-for="mi in 12" :key="mi"
                  :class="{ on: !!selMonth && selMonth.getFullYear() === yearCursor.getFullYear() && selMonth.getMonth() === mi - 1 }"
                  @click="pickMonth(mi - 1)"
                >{{ mi }}月</button>
              </div>
            </div>
            <template v-else>
              <div class="calendar-panels">
                <div class="cal-panel">
                  <div class="chead">
                    <div>
                      <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
                      <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
                    </div>
                    <div class="ctitle">
                      <span>{{ cursor.getFullYear() }}年</span>
                      <span>{{ cursor.getMonth() + 1 }}月</span>
                    </div>
                    <div />
                  </div>
                  <div class="week">
                    <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
                  </div>
                  <div class="days">
                    <button v-for="cell in cursorDays" :key="cell.key" :class="cell.cls" @click="pickDate(cell.date)">
                      {{ cell.label }}
                    </button>
                  </div>
                </div>
                <div class="cal-panel">
                  <div class="chead">
                    <div />
                    <div class="ctitle">
                      <span>{{ nextMonthBase.getFullYear() }}年</span>
                      <span>{{ nextMonthBase.getMonth() + 1 }}月</span>
                    </div>
                    <div>
                      <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
                      <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
                    </div>
                  </div>
                  <div class="week">
                    <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
                  </div>
                  <div class="days">
                    <button v-for="cell in nextMonthDays" :key="cell.key" :class="cell.cls" @click="pickDate(cell.date)">
                      {{ cell.label }}
                    </button>
                  </div>
                </div>
              </div>
              <div class="cnote">* 最少选择 1 天 最多选择 31 天</div>
              <div class="cfoot">
                <div class="rangeText">{{ rangeText }}</div>
                <div>
                  <button class="smallBtn" @click.stop="start = null; end = null">清除</button>
                  <button class="smallBtn primary" @click.stop="onApply()">确定</button>
                </div>
              </div>
            </template>
          </div>
        </div>
        <div class="vc-spacer" />
        <button class="vc-btn">自定义指标</button>
        <button class="vc-btn vc-btn-blue">全部指标</button>
      </div>

      <div class="vc-body">
        <div class="vc-cards">
          <div v-for="kpi in videoKpiItems" :key="kpi.metric" class="vc-card" :class="[kpi.ratios ? 'vc-card-large' : '', kpi.metric === '出单链接数' ? 'vc-card-below-refund' : '']">
            <div class="vc-klabel">
              <span class="vc-kname">{{ splitMetricLabel(kpi.metric).main }}<span v-if="splitMetricLabel(kpi.metric).qual" class="vc-kqual">{{ splitMetricLabel(kpi.metric).qual }}</span></span>
              <i class="vc-info">ⓘ</i>
            </div>
            <div class="vc-kmain">
              <div class="vc-kleft">
                <div class="vc-kval">{{ kpi.value }}</div>
                <div class="vc-ktrend" :class="kpi.trend === 'up' ? 'trend-up' : 'trend-down'">
                  {{ kpi.trend === 'up' ? '▲' : '▼' }} {{ kpi.delta }}%
                  <span class="vc-prev">
                    <template v-if="kpi.metric !== '支付金额'">{{ videoPrevLabel }}&nbsp;</template>{{ kpi.prev }}
                  </span>
                </div>
                <div class="vc-ksub">{{ videoPrevLabel }}</div>
              </div>
              <div v-if="kpi.ratios" class="vc-kright">
                <div v-for="r in kpi.ratios" :key="r.label" class="vc-ratio">
                  <span>{{ r.label }}</span>
                  <b>{{ r.value }}</b>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="vc-right">
          <div class="vc-chart">
            <div class="vc-chart-head">
              <span class="vc-legend today"><i /> 今日支付金额</span>
              <span class="vc-legend yesterday"><i /> 昨日支付金额</span>
            </div>
          <svg ref="chartSvgRef" :viewBox="`0 0 ${videoChart.W} ${videoChart.H}`" @mousemove="onVideoMove" @mouseleave="onVideoLeave">
            <g v-for="(t, i) in videoChart.yTicks" :key="`y-${i}`">
              <line :x1="48" :y1="t.y" :x2="videoChart.W - 20" :y2="t.y" stroke="#f0f2f5" stroke-width="1" />
              <text :x="42" :y="t.y + 4" text-anchor="end" font-size="11" fill="#98a0ae">{{ t.value }}</text>
            </g>
            <template v-for="(t, i) in videoChart.xTicks" :key="`x-${i}`">
              <text :x="t.x" :y="videoChart.H - 16" text-anchor="middle" font-size="11" fill="#98a0ae">{{ t.label }}</text>
            </template>
            <path :d="videoChart.area1" fill="rgba(79,124,255,0.08)" />
            <path :d="videoChart.path2" fill="none" stroke="#a8c5ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path :d="videoChart.path1" fill="none" stroke="#4f7cff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <template v-if="videoHover !== null">
              <line :x1="videoChart.points1[videoHover].x" :y1="34" :x2="videoChart.points1[videoHover].x" :y2="videoChart.H - 44" stroke="#e0e4ec" stroke-width="1" stroke-dasharray="3 3" />
              <circle :cx="videoChart.points1[videoHover].x" :cy="videoChart.points1[videoHover].y" r="4" fill="#4f7cff" stroke="#fff" stroke-width="2" />
              <circle :cx="videoChart.points2[videoHover].x" :cy="videoChart.points2[videoHover].y" r="4" fill="#a8c5ff" stroke="#fff" stroke-width="2" />
            </template>
            <rect x="48" y="34" :width="videoChart.W - 68" :height="videoChart.H - 78" fill="transparent" />
          </svg>
          <div v-if="videoHover !== null" class="vc-chart-tip" :style="videoTipStyle">
            <div class="vc-tip-time">{{ videoTrendHours[videoHover] }}</div>
            <div class="vc-tip-row today"><i /> 今日 {{ videoTrendToday[videoHover].toFixed(2) }}万</div>
            <div class="vc-tip-row yesterday"><i /> 昨日 {{ videoTrendYesterday[videoHover].toFixed(2) }}万</div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- 看板下方：出单链接排行 / 销售成员排行榜（当前时间周期全量，默认每页前 10 名） -->
    <div class="vc-ranks">
      <div class="vc-rank-card card">
        <div class="vc-rank-head">
          <span class="vc-rank-title">出单链接排行</span>
        </div>
        <div class="vc-rank-thead link">
          <span class="vc-rank-th-main">出单链接</span>
          <SortTh as="span" label="销售额" :state="linkSortState('amount')" @sort="toggleLinkSort('amount')" />
          <SortTh as="span" label="出单件数" :state="linkSortState('orders')" @sort="toggleLinkSort('orders')" />
        </div>
        <div class="vc-rank-list" :style="rankListStyle">
          <div v-for="(row, i) in pagedLinks" :key="row.linkId" class="vc-rank-row link" :class="rowTone(rankNo(linkPage, i))">
            <span class="vc-rank-no" :class="medalCls(rankNo(linkPage, i))">{{ rankNo(linkPage, i) }}</span>
            <button type="button" class="vc-rank-imgbtn" :title="`查看商品 ${row.linkId}`" @click="goLinkGoods(row.linkId)">
              <img class="vc-rank-img" :src="row.img" :alt="row.title" />
            </button>
            <div class="vc-rank-main">
              <div class="vc-rank-name" :title="row.title">{{ row.title }}</div>
              <div class="vc-rank-sub">商品ID {{ row.linkId }}</div>
            </div>
            <span class="vc-rank-val">¥{{ row.amount }}</span>
            <span class="vc-rank-num">{{ row.orders }}</span>
          </div>
        </div>
        <div v-if="linkPages > 1" class="vc-rank-foot">
          <span class="vc-rank-total">共 {{ videoLinkRank.length }} 条</span>
          <div class="vc-rank-pager">
            <button type="button" class="vc-rank-pgbtn" :disabled="linkPage === 1" aria-label="上一页" @click="linkPage--">‹</button>
            <span class="vc-rank-pgtext">{{ linkPage }} / {{ linkPages }}</span>
            <button type="button" class="vc-rank-pgbtn" :disabled="linkPage === linkPages" aria-label="下一页" @click="linkPage++">›</button>
          </div>
        </div>
      </div>

      <div class="vc-rank-card card">
        <div class="vc-rank-head">
          <span class="vc-rank-title">销售成员排行榜</span>
        </div>
        <div class="vc-rank-thead member">
          <span class="vc-rank-th-main">发布人</span>
          <span>组长</span>
          <SortTh as="span" label="出单链接数" :state="sellerSortState('links')" @sort="toggleSellerSort('links')" />
          <SortTh as="span" label="销售额" :state="sellerSortState('amount')" @sort="toggleSellerSort('amount')" />
        </div>
        <div class="vc-rank-list" :style="rankListStyle">
          <div v-for="(row, i) in pagedSellers" :key="row.name" class="vc-rank-row member" :class="rowTone(rankNo(sellerPage, i))">
            <span class="vc-rank-no" :class="medalCls(rankNo(sellerPage, i))">{{ rankNo(sellerPage, i) }}</span>
            <div class="vc-rank-main">
              <span class="vc-rank-ava" :style="{ background: avatarBg(rankNo(sellerPage, i)) }">{{ row.name.slice(0, 1) }}</span>
              <span class="vc-rank-name">{{ row.name }}</span>
            </div>
            <span class="vc-rank-leader" :title="`${row.leader}大组`">{{ row.leader }}</span>
            <span class="vc-rank-num">{{ row.links }}</span>
            <span class="vc-rank-val">¥{{ row.amount }}</span>
          </div>
        </div>
        <div v-if="sellerPages > 1" class="vc-rank-foot">
          <span class="vc-rank-total">共 {{ videoSellerRank.length }} 条</span>
          <div class="vc-rank-pager">
            <button type="button" class="vc-rank-pgbtn" :disabled="sellerPage === 1" aria-label="上一页" @click="sellerPage--">‹</button>
            <span class="vc-rank-pgtext">{{ sellerPage }} / {{ sellerPages }}</span>
            <button type="button" class="vc-rank-pgbtn" :disabled="sellerPage === sellerPages" aria-label="下一页" @click="sellerPage++">›</button>
          </div>
        </div>
      </div>
    </div>
  </template>

  <!-- 发布数据：原概览页内容 -->
  <template v-else>
    <OverviewPage />
  </template>
</template>
