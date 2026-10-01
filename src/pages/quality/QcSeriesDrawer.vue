<script setup lang="ts">
/* ---------- 系列编码详情抽屉（无任务/审核维度） ---------- */
import { computed, ref } from 'vue';
import { AFTER_SALES_ORDERS, SHOP_NAME, type ChatHit, type ChatSession, type Platform } from './data';
import {
  pct,
  platformProblemHits,
  rateCls,
  PROBLEM_TYPE_COLOR,
  type DateRange,
  type QcCenterSeries,
  type RangeKey,
} from './qcCenterData';
import {
  AFTER_TYPES,
  DRAWER_DEFAULT_CUSTOM,
  DRAWER_RANGE_LABELS,
  drawerRangeRatio,
  drawerRangeWindow,
  onlineAfterOrdersOf,
  onlineReviewsOf,
} from './qcOnlineData';
import { ecMain } from '../ops-center/data';
import { CAT_COLOR, QC2_CATS, QC2_CODES, briefOf, seriesTagBrief, type Qc2Code } from '../quality2/qc2Data';
import PlatformMatrix from './PlatformMatrix.vue';
import SessionCard from './SessionCard.vue';
import ChatFullModal from './ChatFullModal.vue';
import PlatLogo from './PlatLogo.vue';
import QcAfterOrdersPanel from './QcAfterOrdersPanel.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

const props = defineProps<{
  series: QcCenterSeries;
  initialCode?: string;
  /** 打开时定位的问题类型（列表命中类型/部门标签点入）；缺省全部 */
  initialTypes?: string[];
  onClose: () => void;
  allSessions: ChatSession[];
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
  /** 品控-线上壳：无商品标签维度，隐藏标签模块 */
  online?: boolean;
}>();

/* 售后/聊天证据的类型口径 → 问题类型大类（线上壳证据已是大类口径，原样透传） */
const AS_TO_QC: Record<string, string> = {
  质量问题: '质量问题',
  描述不符: '描述/宣传不符',
  物流破损: '包装破损',
  少件漏发: '少发',
};
const normType = (t: string) => AS_TO_QC[t] ?? t;

/* 头部商品主图：按系列编码数值顺取电商主图池（同编码跨列表同图） */
const seriesImg = computed(() => ecMain(parseInt(props.series.seriesCode.replace(/\D/g, ''), 10) || 0));

const codeTab = ref<string>(props.initialCode ?? 'all');
const chatTab = ref<string>('all');
/* 头部时间维度：默认近30天（全量证据跨度），切换后总览指标与三个场景明细同口径收敛 */
const range = ref<RangeKey>('30d');
const rangeCustom = ref<DateRange>({ ...DRAWER_DEFAULT_CUSTOM });
const rangeWin = computed(() => drawerRangeWindow(range.value, rangeCustom.value));
const rangeRatio = computed(() => drawerRangeRatio(range.value, rangeCustom.value));
const inRange = (at: string) => {
  const day = at.slice(0, 10);
  return day >= rangeWin.value[0] && day <= rangeWin.value[1];
};
const rangeLabel = computed(() => (range.value === 'custom'
  ? `${rangeWin.value[0]} ~ ${rangeWin.value[1]}`
  : DRAWER_RANGE_LABELS.find((r) => r.key === range.value)?.label ?? ''));
/* 头部时间范围：下拉选择档位（BubbleSelect 选项需 {value,label}），自定义档联动日期区间组件 */
const DRAWER_RANGE_OPTIONS = DRAWER_RANGE_LABELS.map((r) => ({ value: r.key as string, label: r.label }));
const onRangePick = (v: string) => { range.value = v as RangeKey; };
/* 评价场景平台页签 / 售后单场景平台页签（总览矩阵点格前往时写入） */
const revTab = ref<string>('all');
/* 售后单场景查询条件 pill：售后类型（与平台、小类行同语言，即时生效） */
const afterTypeSel = ref<string | null>(null);
/* 问题类型切换：饼图图例/扇区点击切至对应类型，再点同一类型回到全部 */
const entryType = props.initialTypes?.length === 1 ? props.initialTypes[0] : null;
const activeType = ref<string | null>(entryType);
/* 用户是否已手动改过问题类型：改过后切场景不再回落默认选中类型 */
const typeTouched = ref(false);
/* 问题小类快选（品控-线上三个场景）：默认全部，选中后只看该小类 */
const activeSub = ref<string | null>(null);
const pickType = (t: string) => {
  typeTouched.value = true;
  activeType.value = activeType.value === t ? null : t;
  activeSub.value = null;
  afterTypeSel.value = null;
};
const clearType = () => {
  typeTouched.value = true;
  activeType.value = null;
  activeSub.value = null;
};
const pickSub = (s: string) => {
  activeSub.value = activeSub.value === s ? null : s;
};
const fullId = ref<string | null>(null);
const selCode = computed(() => (codeTab.value === 'all' ? null : props.series.codes.find((c) => c.code === codeTab.value) ?? null));
const selCodes = computed(() => (selCode.value ? [selCode.value] : props.series.codes));

const stats = computed(() => {
  const r = rangeRatio.value;
  const orders = selCodes.value.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.orders, 0), 0);
  const refundWeighted = selCodes.value.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.refundRate * p.orders, 0), 0);
  const afterSales = selCodes.value.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.afterSales, 0), 0);
  return {
    orders: Math.round(orders * r),
    refundRate: orders ? refundWeighted / orders : 0,
    afterSales: Math.round(afterSales * r),
  };
});

const codeSet = computed(() => new Set(selCodes.value.map((c) => c.code)));
const sessions = computed(() => props.allSessions.filter((s) => codeSet.value.has(s.code) && inRange(s.startedAt)));
const problemHits = computed(() => (selCode.value ? selCode.value.problemHits : props.series.problemHits));
const hitsTotal = computed(() => problemHits.value.reduce((s, h) => s + h.count, 0));
const shareOf = (v: number) => `${hitsTotal.value ? ((v / hitsTotal.value) * 100).toFixed(1) : '0.0'}%`;
const hits = computed(() => platformProblemHits(selCodes.value));

/* 聊天核查随类型/小类切换收敛：选中时仅展示命中该大类（且该小类）的会话 */
const viewSessions = computed(() => (activeType.value || activeSub.value
  ? sessions.value.filter((s) => s.hits.some((h) =>
    (!activeType.value || normType(h.type) === activeType.value) && (!activeSub.value || h.sub === activeSub.value)))
  : sessions.value));
const sessionTabs = computed(() => {
  const counts = new Map<string, number>();
  viewSessions.value.forEach((s) => counts.set(s.platform, (counts.get(s.platform) ?? 0) + 1));
  return [...counts.entries()];
});
const shownSessions = computed(() => (chatTab.value === 'all' ? viewSessions.value : viewSessions.value.filter((s) => s.platform === chatTab.value)));
/* 线上壳平台行：按已选大类口径统计各平台命中次数（不随小类快选变化，小类行合计 = 平台数） */
const chatTypeHits = (s: ChatSession) => s.hits.filter((h) => !activeType.value || normType(h.type) === activeType.value);
const chatPlatTabs = computed(() => {
  const counts = new Map<string, number>();
  sessions.value.forEach((s) => {
    const n = chatTypeHits(s).length;
    if (n) counts.set(s.platform, (counts.get(s.platform) ?? 0) + n);
  });
  return [...counts.entries()];
});
const chatPlatTotal = computed(() => chatPlatTabs.value.reduce((s, [, n]) => s + n, 0));

/* 细分场景左栏（仅品控-线上壳）：总览 / 聊天记录 / 售后单 / 评价；场景内看该场景问题类型占比 + 明细 */
const SCENES = [
  { key: 'overview', label: '数据总览' },
  { key: 'chat', label: '会话数据' },
  { key: 'after', label: '售后数据' },
  { key: 'review', label: '评价数据' },
] as const;
/* 场景左栏 tab 前置图标 */
const SCENE_ICON: Record<SceneKey, string> = {
  overview: 'M3 3h18v18H3z M3 9h18 M9 9v12',
  chat: 'M4 4h16v12H9l-5 4z',
  after: 'M6 2h12v20l-3-2-3 2-3-2-3 2z M9 8h6 M9 12h6',
  review: 'M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.1-5.6-3-5.6 3 1.2-6.1L3 9.6l6.3-.8z',
};
type SceneKey = (typeof SCENES)[number]['key'];
const scene = ref<SceneKey>('overview');
/* 会话卡「售后单」按钮前往的目标售后单号：切至售后数据场景后定位高亮该行 */
const focusAfterNo = ref<string | null>(null);
const pickScene = (k: SceneKey) => {
  scene.value = k;
  activeSub.value = null;
  chatTab.value = 'all';
  revTab.value = 'all';
  afterPlatApplied.value = null;
  afterTypeSel.value = null;
  focusAfterNo.value = null;
  /* 列表命中类型点入：切场景后仍默认选中该类型（该场景存在此类命中且用户未手动改过时），其余情况回到全部 */
  activeType.value = !typeTouched.value && entryType && sceneHits.value.some((h) => h.type === entryType) ? entryType : null;
};
/* 会话卡「售后单」按钮：切到售后数据场景、清空问题类型/小类收敛（避免目标单被过滤），定位该售后单 */
const openAfterFromSession = (no: string) => {
  pickScene('after');
  typeTouched.value = true;
  activeType.value = null;
  activeSub.value = null;
  focusAfterNo.value = no;
};

const chatHits = computed(() => {
  const m = new Map<string, number>();
  sessions.value.forEach((s) => s.hits.forEach((h) => {
    const t = normType(h.type);
    m.set(t, (m.get(t) ?? 0) + 1);
  }));
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
});
const afterOrders = computed(() => onlineAfterOrdersOf(props.series).filter((o) => codeSet.value.has(o.code) && inRange(o.appliedAt)));
/* 会话卡关联售后：线上壳取线上售后单的会话起因挂链，运维壳取全局售后单明细 */
const sessionAfterNos = (s: ChatSession) => (props.online
  ? afterOrders.value.filter((o) => o.sessionId === s.id).map((o) => o.afterNo)
  : AFTER_SALES_ORDERS.filter((o) => o.sessionId === s.id).map((o) => o.id));
const asHits = computed(() => {
  const m = new Map<string, number>();
  afterOrders.value.forEach((o) => m.set(o.ptype, (m.get(o.ptype) ?? 0) + 1));
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
});
const reviews = computed(() => onlineReviewsOf(props.series).filter((r) => inRange(r.reviewedAt)));
const revHits = computed(() => {
  const m = new Map<string, number>();
  reviews.value.forEach((r) => m.set(r.ptype, (m.get(r.ptype) ?? 0) + 1));
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
});
const sceneHits = computed(() => (scene.value === 'chat' ? chatHits.value : scene.value === 'after' ? asHits.value : revHits.value));
/* 场景内问题小类清单：随已选大类 + 当前平台收敛，只列该平台内已命中的小类，计数与该场景单位口径一致 */
const chatSubs = computed(() => {
  const m = new Map<string, number>();
  sessions.value.forEach((s) => {
    if (chatTab.value !== 'all' && s.platform !== chatTab.value) return;
    chatTypeHits(s).forEach((h) => { if (h.sub) m.set(h.sub, (m.get(h.sub) ?? 0) + 1); });
  });
  return [...m.entries()].map(([sub, count]) => ({ sub, count })).sort((a, b) => b.count - a.count);
});
/* 售后单场景平台由面板查询区生效（初值来自总览矩阵点格前往） */
const afterPlatApplied = ref<string | null>(null);
const afterSubs = computed(() => {
  const m = new Map<string, number>();
  afterOrders.value.forEach((o) => {
    if (afterPlatApplied.value && o.platform !== afterPlatApplied.value) return;
    if (afterTypeSel.value && o.type !== afterTypeSel.value) return;
    if (o.psub && (!activeType.value || o.ptype === activeType.value)) m.set(o.psub, (m.get(o.psub) ?? 0) + 1);
  });
  return [...m.entries()].map(([sub, count]) => ({ sub, count })).sort((a, b) => b.count - a.count);
});
const revSubs = computed(() => {
  const m = new Map<string, number>();
  reviews.value.forEach((r) => {
    if (revTab.value !== 'all' && r.platform !== revTab.value) return;
    if (r.psub && (!activeType.value || r.ptype === activeType.value)) m.set(r.psub, (m.get(r.psub) ?? 0) + 1);
  });
  return [...m.entries()].map(([sub, count]) => ({ sub, count })).sort((a, b) => b.count - a.count);
});
const sceneSubs = computed(() => (scene.value === 'chat' ? chatSubs.value : scene.value === 'after' ? afterSubs.value : revSubs.value));
const sceneSubTotal = computed(() => sceneSubs.value.reduce((s, x) => s + x.count, 0));
const sceneUnit = computed(() => (scene.value === 'after' ? '单' : scene.value === 'review' ? '条' : '次'));
const sceneTotal = computed(() => sceneHits.value.reduce((s, h) => s + h.count, 0));
const shareOfScene = (v: number) => `${sceneTotal.value ? ((v / sceneTotal.value) * 100).toFixed(1) : '0.0'}%`;
/* 总览页复用各场景命中列表自身的占比口径 */
const shareOfList = (list: { count: number }[], v: number) => {
  const t = list.reduce((s, h) => s + h.count, 0);
  return `${t ? ((v / t) * 100).toFixed(1) : '0.0'}%`;
};
/* 总览「问题类型占比」：三个场景平铺各自类型条，行展开看该大类下小类，小类条按平台占比堆叠 */
type OvDim = 'chat' | 'after' | 'review';
interface OvPlat { pl: Platform; count: number }
interface OvSub { sub: string; count: number; plats: OvPlat[] }
interface OvRow { type: string; count: number; subs: OvSub[]; plats: Platform[] }
/** 堆叠段与图例的固定平台序 */
const OV_PLATS: Platform[] = ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'];
const OV_PLAT_COLORS: Record<string, string> = {
  天猫: '#f2555f', 拼多多: '#ff9f43', 抖音: '#5b6472', 京东: '#4f7cff', 淘宝: '#9b6bff', 快手: '#2ec7a5',
};
/* 堆叠条悬浮气泡：整条小类一次列出全部平台的次数与占比，锚定条上方居中 */
const segTip = ref<{ x: number; y: number; sub: string; unit: string; items: { pl: Platform; count: number; pct: string }[] } | null>(null);
const openSegTip = (e: MouseEvent, s: OvSub, unit: string) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  segTip.value = {
    x: r.left + r.width / 2,
    y: r.top - 8,
    sub: s.sub,
    unit,
    items: s.plats.map((p) => ({ pl: p.pl, count: p.count, pct: shareOfList(s.plats, p.count) })),
  };
};
const buildRows = (dim: OvDim): OvRow[] => {
  const typeMap = new Map<string, number>();
  const subMap = new Map<string, Map<string, number>>();
  const subPlatMap = new Map<string, Map<string, Map<Platform, number>>>();
  const bump = (t: string, sub: string | undefined, pl: Platform) => {
    typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    if (!sub) return;
    const sm = subMap.get(t) ?? new Map<string, number>();
    sm.set(sub, (sm.get(sub) ?? 0) + 1);
    subMap.set(t, sm);
    const pm = subPlatMap.get(t) ?? new Map<string, Map<Platform, number>>();
    const plm = pm.get(sub) ?? new Map<Platform, number>();
    plm.set(pl, (plm.get(pl) ?? 0) + 1);
    pm.set(sub, plm);
    subPlatMap.set(t, pm);
  };
  if (dim === 'chat') sessions.value.forEach((s) => s.hits.forEach((h) => bump(normType(h.type), h.sub, s.platform)));
  else if (dim === 'after') afterOrders.value.forEach((o) => bump(o.ptype, o.psub, o.platform));
  else reviews.value.forEach((r) => bump(r.ptype, r.psub, r.platform));
  return [...typeMap.entries()]
    .map(([type, count]) => {
      const subs = [...(subMap.get(type) ?? new Map<string, number>()).entries()]
        .map(([sub, c]) => ({
          sub,
          count: c,
          plats: OV_PLATS
            .map((pl) => ({ pl, count: subPlatMap.get(type)?.get(sub)?.get(pl) ?? 0 }))
            .filter((p) => p.count > 0),
        }))
        .sort((a, b) => b.count - a.count);
      return {
        type,
        count,
        subs,
        /* 图例只列该大类小类中实际出现的平台（固定序） */
        plats: OV_PLATS.filter((pl) => subs.some((x) => x.plats.some((p) => p.pl === pl))),
      };
    })
    .sort((a, b) => b.count - a.count);
};
const ovSections = computed(() => [
  { key: 'chat' as OvDim, label: '聊天记录', title: '聊天记录问题类型占比', unit: '次', rows: buildRows('chat') },
  { key: 'after' as OvDim, label: '售后单', title: '售后单问题类型占比', unit: '单', rows: buildRows('after') },
  { key: 'review' as OvDim, label: '评价', title: '评价问题类型占比', unit: '条', rows: buildRows('review') },
]);
const ovExpand = ref<string | null>(null);
const toggleOv = (dim: OvDim, type: string) => {
  const k = `${dim}:${type}`;
  ovExpand.value = ovExpand.value === k ? null : k;
};
/* 展开的小类行/平台段点击前往：切到对应场景 tab，并选中问题类型、小类与平台 */
const gotoScene = (dim: OvDim, type: string | null, plat: string | null, sub: string | null = null) => {
  scene.value = dim;
  typeTouched.value = true;
  activeType.value = type;
  activeSub.value = sub;
  chatTab.value = plat ?? 'all';
  revTab.value = plat ?? 'all';
  afterPlatApplied.value = plat;
  afterTypeSel.value = null;
};
/* 评价平台行：按已选大类口径统计各平台条数（不随小类快选变化） */
const typeReviews = computed(() => reviews.value.filter((r) => !activeType.value || r.ptype === activeType.value));
const viewReviews = computed(() => typeReviews.value.filter((r) => !activeSub.value || r.psub === activeSub.value));
const revTabs = computed(() => {
  const counts = new Map<string, number>();
  typeReviews.value.forEach((r) => counts.set(r.platform, (counts.get(r.platform) ?? 0) + 1));
  return [...counts.entries()];
});
const shownReviews = computed(() => (revTab.value === 'all' ? viewReviews.value : viewReviews.value.filter((r) => r.platform === revTab.value)));
/* 售后单场景平台行 / 售后类型行：与其它场景同一 pill 语言，计数随大类与平台收敛 */
const afterTypeOrders = computed(() => afterOrders.value.filter((o) => !activeType.value || o.ptype === activeType.value));
const afterPlatTabs = computed(() => {
  const counts = new Map<string, number>();
  afterTypeOrders.value.forEach((o) => counts.set(o.platform, (counts.get(o.platform) ?? 0) + 1));
  return [...counts.entries()];
});
const afterPlatTotal = computed(() => afterTypeOrders.value.length);
const platScopeAfter = computed(() => afterTypeOrders.value.filter((o) => !afterPlatApplied.value || o.platform === afterPlatApplied.value));
const afterTypePills = computed(() => AFTER_TYPES.map((t) => ({ key: t as string, count: platScopeAfter.value.filter((o) => o.type === t).length })));
/* 平台行与小类行三场景共用：平台在前、小类在后 */
const platTabs = computed(() => (scene.value === 'review' ? revTabs.value : scene.value === 'after' ? afterPlatTabs.value : chatPlatTabs.value));
const curPlatTab = computed(() => (scene.value === 'review' ? revTab.value : scene.value === 'after' ? (afterPlatApplied.value ?? 'all') : chatTab.value));
const curPlatTotal = computed(() => (scene.value === 'review' ? typeReviews.value.length : scene.value === 'after' ? afterPlatTotal.value : chatPlatTotal.value));
/* 切平台后若已选小类在该平台无命中则回到全部；小类快选不反向改动平台 */
const dropStaleSub = () => {
  if (activeSub.value && !sceneSubs.value.some((x) => x.sub === activeSub.value)) activeSub.value = null;
};
/* 售后类型在新平台范围内计数为 0 时同样回到全部，避免停在空表 */
const dropStaleAfter = () => {
  if (afterTypeSel.value && !afterTypePills.value.some((p) => p.key === afterTypeSel.value && p.count)) afterTypeSel.value = null;
};
/* 售后类型切换后小类行随之收敛：已选小类在新类型下无命中则回到全部 */
const pickAfterType = (t: string | null) => {
  afterTypeSel.value = afterTypeSel.value === t ? null : t;
  dropStaleSub();
};
const setPlatTab = (p: string) => {
  if (scene.value === 'review') revTab.value = p;
  else if (scene.value === 'after') afterPlatApplied.value = p === 'all' ? null : p;
  else chatTab.value = p;
  dropStaleSub();
  dropStaleAfter();
};

/* 售后信息（仅运维管理后台壳）：选中类型看该类型售后单 + 各平台退款证据，未选看各平台售后单量条 */
const typeEvidence = computed(() => {
  const t = activeType.value;
  if (!t) return null;
  const asAll = AFTER_SALES_ORDERS.filter((o) => codeSet.value.has(o.code) && normType(o.type) === t);
  const agg = new Map<Platform, { orders: number; w: number }>();
  selCodes.value.forEach((c) => {
    const plHits = platformProblemHits([c]);
    c.platforms.forEach((p) => {
      if ((plHits[p.platform] ?? []).some(([ht]) => ht === t)) {
        const e = agg.get(p.platform) ?? { orders: 0, w: 0 };
        e.orders += p.orders;
        e.w += p.refundRate * p.orders;
        agg.set(p.platform, e);
      }
    });
  });
  return {
    asRows: asAll.slice(0, 4),
    asCount: asAll.length,
    asMore: asAll.length > 4,
    refundRows: [...agg.entries()].map(([pl, e]) => ({ pl, orders: e.orders, rate: e.orders ? e.w / e.orders : 0 })),
  };
});

/* 各平台售后单量与售后率；条长以售后单最多平台为满格 */
const asBars = computed(() => {
  const agg = new Map<Platform, { afterSales: number; orders: number }>();
  selCodes.value.forEach((c) => c.platforms.forEach((p) => {
    const e = agg.get(p.platform) ?? { afterSales: 0, orders: 0 };
    e.afterSales += p.afterSales;
    e.orders += p.orders;
    agg.set(p.platform, e);
  }));
  const rows = [...agg.entries()].map(([pl, e]) => ({
    pl,
    afterSales: e.afterSales,
    rate: e.orders ? e.afterSales / e.orders : 0,
    w: 0,
  }));
  rows.sort((a, b) => b.afterSales - a.afterSales);
  const max = rows[0]?.afterSales || 1;
  rows.forEach((r) => { r.w = (r.afterSales / max) * 100; });
  return rows;
});

/* 平台矩阵命中按选中类型收敛 */
const matrixHits = computed(() => {
  const out: Partial<Record<Platform, [string, number][]>> = {};
  (Object.entries(hits.value) as [Platform, [string, number][]][]).forEach(([pl, arr]) => {
    out[pl] = activeType.value ? arr.filter(([t]) => t === activeType.value) : arr;
  });
  return out;
});

/* 商品标签维度：标签命中按「该平台在售编码」聚合；健康度各平台不一致不做跨平台聚合，只展示情况不展示规则 */
const qc2Scope = computed(() => {
  const scope = new Set(selCodes.value.map((c) => c.code));
  return QC2_CODES.filter((c) => scope.has(c.code));
});
/* 平台页签切换：全部态看系列各编码在该平台的命中情况；具体编码态看该编码在该平台的命中情况 */
const platTab = ref<string>(props.series.platforms[0] ?? '');
const activePlat = computed(() => (props.series.platforms.includes(platTab.value as Platform) ? platTab.value : props.series.platforms[0] ?? '') as Platform);
const platTabCounts = computed(() => props.series.platforms.map((pl) => {
  const codes = qc2Scope.value.filter((c) => c.platforms.includes(pl));
  return { pl, count: codes.length ? briefOf(codes).labels.length : 0 };
}));
const platScopeCodes = computed(() => qc2Scope.value.filter((c) => c.platforms.includes(activePlat.value)));
/* 标签按大类分组分行，避免多 chips 无序换行显得杂乱 */
const groupsOf = (codes: Qc2Code[]) => {
  const labels = codes.length ? briefOf(codes).labels : [];
  return QC2_CATS.map((cat) => ({ cat, items: labels.filter((l) => l.cat === cat) })).filter((g) => g.items.length);
};
/* 具体编码态：该编码在当前平台内的命中分组 */
const platTagGroups = computed(() => groupsOf(platScopeCodes.value));
/* 全部态：系列维度聚合（编码命中 ∪ 系列维度命中，按标签 id 去重；系列维度标签仅在此展示，编码态不重复） */
const allTagGroups = computed(() => {
  const labels = seriesTagBrief(props.series.seriesCode).labels;
  return QC2_CATS.map((cat) => ({ cat, items: labels.filter((l) => l.cat === cat) })).filter((g) => g.items.length);
});
const visibleGroups = computed(() => (selCode.value ? platTagGroups.value : allTagGroups.value));
const noneText = computed(() => (selCode.value
  ? (platScopeCodes.value.length ? '暂无标签命中' : '该编码未在此平台上架')
  : '暂无标签命中'));
</script>

<template>
  <div class="drawer-mask" @click="props.onClose" />
  <div class="drawer qc-series-drawer" :class="{ 'qc-d-online': online }">
    <div class="drawer-head">
      <div class="d-title">系列编码详情</div>
      <span class="x" @click="props.onClose">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </span>
    </div>
    <div class="drawer-body">
      <div class="detail-hero">
        <img class="av" :src="seriesImg" :alt="series.name">
        <div class="info">
          <div class="n">{{ series.seriesCode }} · {{ series.name }}</div>
          <div class="m">{{ series.codes.length }} 个商品编码 · {{ series.platforms.length }} 个平台</div>
        </div>
        <i v-if="online" class="qc-hero-break" aria-hidden="true"></i>
        <div class="qc-range-toggle qc-code-tabs qc-hero-code-tabs">
          <button type="button" :class="codeTab === 'all' ? 'active' : ''" @click="codeTab = 'all'; chatTab = 'all'">全部</button>
          <button
            v-for="c in series.codes"
            :key="c.code"
            type="button"
            :class="codeTab === c.code ? 'active' : ''"
            @click="codeTab = c.code; chatTab = 'all'"
          >
            {{ c.code }}
          </button>
        </div>
        <div v-if="online" class="qc-hero-range">
          <QcDateRangePicker
            v-if="range === 'custom'"
            :custom="rangeCustom"
            :on-change="(d: DateRange) => (rangeCustom = d)"
            :min="DRAWER_DEFAULT_CUSTOM.start"
            :max="DRAWER_DEFAULT_CUSTOM.end"
          />
          <label>时间范围</label>
          <BubbleSelect :options="DRAWER_RANGE_OPTIONS" :value="range" @change="onRangePick" />
        </div>
      </div>

      <!-- 品控-线上壳：左侧细分场景 Tab（总览/聊天记录/售后单/评价），场景内看该场景问题类型占比 + 明细 -->
      <template v-if="online">
        <div class="qc-d-scene">
          <div class="qc-d-rail">
            <button
              v-for="sc in SCENES"
              :key="sc.key"
              type="button"
              :class="{ active: scene === sc.key }"
              @click="pickScene(sc.key)"
            ><svg viewBox="0 0 24 24"><path :d="SCENE_ICON[sc.key]" /></svg>{{ sc.label }}</button>
          </div>
          <div class="qc-d-scene-body">
            <template v-if="scene === 'overview'">
              <div class="section-title">核心指标（{{ rangeLabel }}）</div>
              <div class="qc-d-kpi">
                <div class="cell"><div class="k">订单量</div><div class="v">{{ stats.orders.toLocaleString() }}</div></div>
                <div class="cell"><div class="k">综合退款率</div><div class="v"><span class="rate" :class="rateCls(stats.refundRate)">{{ pct(stats.refundRate) }}</span></div></div>
                <div class="cell"><div class="k">售后单</div><div class="v">{{ afterOrders.length.toLocaleString() }}<span class="sub"> 单</span></div></div>
                <div class="cell"><div class="k">聊天会话</div><div class="v">{{ sessions.length }}<span class="sub"> 个 · 命中 {{ sessions.filter((s) => s.hits.length).length }} 个</span></div></div>
              </div>
              <template v-for="sec in ovSections" :key="sec.key">
                <div class="section-title">{{ sec.title }}</div>
                <div class="qc-d-bars">
                  <div v-for="r in sec.rows" :key="r.type" class="tb-ov-row">
                    <div
                      class="tb-row"
                      :class="{ on: ovExpand === sec.key + ':' + r.type }"
                      :title="ovExpand === sec.key + ':' + r.type ? `收起「${r.type}」小类与各平台占比` : `展开「${r.type}」小类与各平台占比`"
                      @click="toggleOv(sec.key, r.type)"
                    >
                      <span class="caret" :class="{ open: ovExpand === sec.key + ':' + r.type }">
                        <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
                      </span>
                      <span class="tag">{{ r.type }}</span>
                      <span class="tb-bar"><i :style="{ width: shareOfList(sec.rows, r.count) }" /></span>
                      <span class="tb-cnt">{{ r.count }} {{ sec.unit }}</span>
                      <span class="tb-pct">{{ shareOfList(sec.rows, r.count) }}</span>
                    </div>
                    <div v-if="ovExpand === sec.key + ':' + r.type" class="tb-subs">
                      <div class="tb-plat-legend">
                        <span v-for="pl in r.plats" :key="pl" class="lg"><i :style="{ background: OV_PLAT_COLORS[pl] }" /><PlatLogo :platform="pl" />{{ pl }}</span>
                      </div>
                      <div
                        v-for="s in r.subs"
                        :key="s.sub"
                        class="tb-sub-row"
                        :title="`前往「${sec.label}」并选中 ${r.type} · ${s.sub}`"
                        @click="gotoScene(sec.key, r.type, null, s.sub)"
                      >
                        <span class="tag sub">{{ s.sub }}</span>
                        <span class="tb-bar stack" @mouseenter="openSegTip($event, s, sec.unit)" @mouseleave="segTip = null">
                          <i
                            v-for="p in s.plats"
                            :key="p.pl"
                            :style="{ width: shareOfList(r.subs, p.count), background: OV_PLAT_COLORS[p.pl] }"
                            @click.stop="gotoScene(sec.key, r.type, p.pl, s.sub)"
                          />
                        </span>
                        <span class="tb-cnt">{{ s.count }} {{ sec.unit }}</span>
                        <span class="tb-pct">{{ shareOfList(r.subs, s.count) }}</span>
                      </div>
                      <div v-if="!r.subs.length" class="qc-tp-none">该大类暂无小类命中</div>
                    </div>
                  </div>
                  <div v-if="!sec.rows.length" class="qc-tp-none">暂无问题命中</div>
                </div>
              </template>
            </template>
            <template v-else>
              <div class="qc-d-scene-cols">
                <div class="qc-d-typecol">
                  <button type="button" class="qc-d-type-tab" :class="{ active: !activeType }" @click="clearType">
                    <span class="c">全部</span>
                    <span class="n">{{ sceneTotal }} {{ sceneUnit }}</span>
                  </button>
                  <button
                    v-for="h in sceneHits"
                    :key="h.type"
                    type="button"
                    class="qc-d-type-tab"
                    :class="{ active: activeType === h.type }"
                    @click="pickType(h.type)"
                  >
                    <span class="c">{{ h.type }}</span>
                    <span class="n">{{ h.count }} {{ sceneUnit }} · {{ shareOfScene(h.count) }}</span>
                  </button>
                </div>
                <div class="qc-d-scene-main">
                  <div v-if="platTabs.length" class="qc-range-toggle qc-code-tabs qc-d-plat-tabs" style="margin: 0 0 24px">
                    <button type="button" :class="curPlatTab === 'all' ? 'active' : ''" @click="setPlatTab('all')">
                      <span class="t">全部</span><span class="n">{{ curPlatTotal }}</span>
                    </button>
                    <button
                      v-for="[p, n] in platTabs"
                      :key="p"
                      type="button"
                      :class="curPlatTab === p ? 'active' : ''"
                      @click="setPlatTab(p)"
                    >
                      <span class="t">{{ p }}</span><span class="n">{{ n }}</span>
                    </button>
                  </div>
                  <template v-if="scene === 'after'">
                    <div class="qc-d-segrow">
                      <span class="k">售后类型</span>
                      <div class="qc-d-seg">
                        <button type="button" :class="{ active: !afterTypeSel }" @click="pickAfterType(null)">全部类型<i>{{ platScopeAfter.length }}</i></button>
                        <button
                          v-for="p in afterTypePills"
                          :key="p.key"
                          type="button"
                          :disabled="!p.count"
                          :class="{ active: afterTypeSel === p.key }"
                          @click="pickAfterType(p.key)"
                        >{{ p.key }}<i>{{ p.count }}</i></button>
                      </div>
                    </div>
                  </template>
                  <div v-if="sceneSubs.length" class="qc-d-subset">
                    <span v-if="scene === 'after'" class="k">问题类型</span>
                    <button type="button" :class="{ active: !activeSub }" @click="activeSub = null">全部<i>{{ sceneSubTotal }}</i></button>
                    <button
                      v-for="s in sceneSubs"
                      :key="s.sub"
                      type="button"
                      :class="{ active: activeSub === s.sub }"
                      @click="pickSub(s.sub)"
                    >{{ s.sub }}<i>{{ s.count }}</i></button>
                  </div>
                  <template v-if="scene === 'chat'">
                    <div v-if="shownSessions.length" class="drawer-sessions">
                      <SessionCard
                        v-for="s in shownSessions"
                        :key="s.id"
                        :s="s"
                        :orders="sessionAfterNos(s)"
                        :on-full-screen="() => (fullId = s.id)"
                        :on-update-hits="props.onUpdateHits"
                        :show-sub="online"
                        :sub-filter="activeSub"
                        :on-after="openAfterFromSession"
                      />
                    </div>
                    <div v-else style="color: var(--text-4); font-size: 12px">暂无聊天会话</div>
                  </template>
                  <QcAfterOrdersPanel
                    v-else-if="scene === 'after'"
                    embedded
                    :series="series"
                    :ptype="activeType"
                    :psub="activeSub"
                    :platform="afterPlatApplied"
                    :atype="afterTypeSel"
                    :code-scope="codeTab === 'all' ? null : codeTab"
                    :range="range"
                    :custom="rangeCustom"
                    :on-update-hits="props.onUpdateHits"
                    :focus-no="focusAfterNo"
                    show-psub
                  />
                  <template v-else>
                    <div v-if="shownReviews.length" class="qc-d-reviews">
                      <div v-for="r in shownReviews" :key="r.id" class="qc-rev-row">
                        <div class="qc-rev-head"><PlatLogo :platform="r.platform" /><span class="shop">{{ SHOP_NAME[r.platform] }}</span><span class="code">{{ r.code }}</span><span class="gid">商品ID {{ r.goodsId }}</span><span class="tm">{{ r.reviewedAt }}</span></div>
                        <div class="qc-rev-body">{{ r.content }}</div>
                        <div class="qc-rev-foot"><span class="tag">{{ r.psub || r.ptype }}</span><span class="stars">{{ '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) }}</span></div>
                      </div>
                    </div>
                    <div v-else style="color: var(--text-4); font-size: 12px">暂无评价</div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <!-- 运维管理后台壳：保持原结构（核心指标 / 问题类型占比 / 售后信息 / 聊天记录核查） -->
      <template v-else>
        <div class="section-title">核心指标（{{ rangeLabel }}）</div>
        <div class="qc-d-kpi">
          <div class="cell"><div class="k">订单量</div><div class="v">{{ stats.orders.toLocaleString() }}</div></div>
          <div class="cell"><div class="k">综合退款率</div><div class="v"><span class="rate" :class="rateCls(stats.refundRate)">{{ pct(stats.refundRate) }}</span></div></div>
          <div class="cell"><div class="k">售后单</div><div class="v">{{ stats.afterSales.toLocaleString() }}<span class="sub"> 单</span></div></div>
          <div class="cell"><div class="k">聊天会话</div><div class="v">{{ sessions.length }}<span class="sub"> 个 · 命中 {{ sessions.filter((s) => s.hits.length).length }} 个</span></div></div>
        </div>
        <div class="section-title">问题类型占比</div>
        <div class="qc-d-bars">
          <div
            v-for="h in problemHits"
            :key="h.type"
            class="tb-row"
            :class="{ on: activeType === h.type }"
            :title="activeType === h.type ? `取消选择「${h.type}」` : `切换至「${h.type}」`"
            @click="pickType(h.type)"
          >
            <span class="tag">{{ h.type }}</span>
            <span class="tb-bar"><i :style="{ width: shareOf(h.count) }" /></span>
            <span class="tb-cnt">{{ h.count }} 次</span>
            <span class="tb-pct">{{ shareOf(h.count) }}</span>
          </div>
          <div v-if="!problemHits.length" class="qc-tp-none">暂无问题命中</div>
        </div>
        <div class="section-title">售后信息</div>
        <div class="qc-d-as">
          <div v-if="typeEvidence" class="qc-d-type-ev">
            <div class="qc-ev-head"><i :style="{ background: PROBLEM_TYPE_COLOR[activeType || ''] || '#4f7cff' }" />{{ activeType }}</div>
            <div class="qc-tp-src">
              <div class="qc-tp-k"><i class="c2" />售后单<span class="n">{{ typeEvidence.asCount.toLocaleString() }} 单</span></div>
              <template v-if="typeEvidence.asRows.length">
                <div v-for="o in typeEvidence.asRows" :key="o.id" class="qc-tp-row">
                  <span class="sid">{{ o.id }}</span>
                  <PlatLogo :platform="o.platform" />
                  <span class="tm">¥{{ o.amount }}</span>
                  <span class="tag st">{{ o.status }}</span>
                  <span class="tm">{{ o.appliedAt }}</span>
                </div>
                <div v-if="typeEvidence.asMore" class="qc-tp-more">… 共 {{ typeEvidence.asCount.toLocaleString() }} 单</div>
              </template>
              <div v-else class="qc-tp-none">无</div>
            </div>
            <div class="qc-tp-src">
              <div class="qc-tp-k"><i class="c3" />退款情况<span class="n">{{ typeEvidence.refundRows.length }} 平台</span></div>
              <template v-if="typeEvidence.refundRows.length">
                <div v-for="r in typeEvidence.refundRows" :key="r.pl" class="qc-tp-row">
                  <PlatLogo :platform="r.pl" />
                  <span class="plname">{{ r.pl }}</span>
                  <span class="tm">订单 {{ r.orders.toLocaleString() }}</span>
                  <span class="rate" :class="rateCls(r.rate)">{{ pct(r.rate) }}</span>
                </div>
              </template>
              <div v-else class="qc-tp-none">无</div>
            </div>
          </div>
          <template v-else>
            <div v-for="r in asBars" :key="r.pl" class="qc-as-row">
              <span class="pl"><PlatLogo :platform="r.pl" />{{ r.pl }}</span>
              <span class="bar"><i :style="{ width: r.w + '%' }" /></span>
              <span class="cnt">{{ r.afterSales.toLocaleString() }} 单</span>
              <span class="pct">{{ pct(r.rate) }}</span>
            </div>
            <div class="qc-as-foot">共 {{ stats.afterSales.toLocaleString() }} 单 · {{ asBars.length }} 个平台产生售后（售后率 = 当前口径售后单 / 订单量）</div>
          </template>
        </div>

        <div class="section-title">聊天记录核查（命中短语高亮）</div>
        <template v-if="viewSessions.length">
          <div class="qc-range-toggle qc-code-tabs" style="margin: 0 0 12px">
            <button type="button" :class="chatTab === 'all' ? 'active' : ''" @click="chatTab = 'all'">全部 {{ viewSessions.length }}</button>
            <button
              v-for="[p, n] in sessionTabs"
              :key="p"
              type="button"
              :class="chatTab === p ? 'active' : ''"
              @click="chatTab = p"
            >{{ p }} {{ n }}</button>
          </div>
          <div class="drawer-sessions">
            <SessionCard
              v-for="s in shownSessions"
              :key="s.id"
              :s="s"
              :orders="sessionAfterNos(s)"
              :on-full-screen="() => (fullId = s.id)"
              :on-update-hits="props.onUpdateHits"
              :show-sub="online"
            />
          </div>
        </template>
        <div v-else style="color: var(--text-4); font-size: 12px">暂无聊天会话</div>

        <div class="section-title">各平台数据</div>
        <PlatformMatrix
          :stats="selCode ? selCode.platforms : series.merged"
          :threshold="0.25"
          :problem-hits="matrixHits"
          :show-last-order="false"
        />

        <!-- 商品标签：模块置底；全部态看所有编码各平台去重后汇总，具体编码态平台页签看该编码在各平台的命中情况 -->
        <div class="section-title">商品标签</div>
        <div v-if="selCode" class="qc-range-toggle qc-code-tabs qc-tag-plat-tabs">
          <button
            v-for="t in platTabCounts"
            :key="t.pl"
            type="button"
            :class="activePlat === t.pl ? 'active' : ''"
            @click="platTab = t.pl"
          >{{ t.pl }} {{ t.count }}</button>
        </div>
        <div class="qc-tag-plat-card">
          <div v-if="visibleGroups.length" class="qc-tag-cat-rows">
            <div v-for="g in visibleGroups" :key="g.cat" class="qc-tag-cat-row">
              <span class="qc-tag-cat-k" :title="g.cat"><i :style="{ background: CAT_COLOR[g.cat] || '#4f7cff' }" />{{ g.cat }}</span>
              <div class="prob-tags">
                <span
                  v-for="l in g.items"
                  :key="l.id"
                  class="tag"
                  :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
                >{{ l.name }}</span>
              </div>
            </div>
          </div>
          <div v-else class="qc-tag-none">{{ noneText }}</div>
        </div>
      </template>
    </div>
    <div v-if="!online" class="drawer-foot">
      <button class="btn" @click="props.onClose">关闭</button>
    </div>
  </div>
  <ChatFullModal
    v-if="fullId"
    :sessions="shownSessions"
    :current-id="fullId"
    :on-nav="(id: string) => (fullId = id)"
    :on-close="() => (fullId = null)"
    :on-update-hits="props.onUpdateHits"
    :show-sub="online"
    :sub-filter="online ? activeSub : null"
  />
  <Teleport to="body">
    <div v-if="segTip" class="qc-seg-tip" :style="{ left: `${segTip.x}px`, top: `${segTip.y}px` }">
      <span class="hd">{{ segTip.sub }}</span>
      <span v-for="it in segTip.items" :key="it.pl" class="ln">
        <PlatLogo :platform="it.pl" />
        <span class="nm">{{ it.pl }}</span>
        <span class="vl">{{ it.count }} {{ segTip.unit }}</span>
        <span class="pc">{{ it.pct }}</span>
      </span>
    </div>
  </Teleport>
</template>
