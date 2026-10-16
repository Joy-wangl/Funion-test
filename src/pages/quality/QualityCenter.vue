<script setup lang="ts">
/* =========================================================
   品控中心 v3
   1. 问题类型看板：数据总览 · 问题类型占比 · 问题趋势（今日/近7天/自定义）
   2. 系列编码列表：复刻品控管理系列维度 · 展开各平台数据 · 命中问题类型列
   ========================================================= */
import { computed, onMounted, ref, watch } from 'vue';
import {
  QC_CENTER_SERIES,
  PROBLEM_DEPT,
  QC_PROBLEM_TYPES,
  applySeriesView,
  defaultDutyDept,
  deptsOfTypes,
  seriesHasProblemCode,
  type QcCenterCode,
  type QcCenterSeries,
  type ScopeTotals,
} from './qcCenterData';
import { CHAT_SESSIONS, SHOP_NAME, sessionsOf, type ChatHit, type ChatSession, type Platform, type PlatformStat } from './data';
import { codesMatchTagFilter } from '../quality2/qc2Data';
import { onlineSeries, onlineSeriesOfCode, onlineSessionsOf, onlineOwnerOf, onlineChatBrief, onlineReviewBrief, patchOnlineSession, seriesProblemCodes, codeCsHits, afterJumpSeed, shopGoodsJumpSeed, type AfterJump } from './qcOnlineData';
import { qcGet } from './qcApi';
import QcDashboard from './QcDashboard.vue';
import QcSeriesList, { DEFAULT_SERIES_FILTER, type SeriesFilter, type SortKey } from './QcSeriesList.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import Qc2Dashboard from '../quality2/Qc2Dashboard.vue';
import Qc2Config from '../quality2/Qc2Config.vue';
import QcChatModal from './QcChatModal.vue';
import QcTrendModal from './QcTrendModal.vue';
import QcAfterSales from './QcAfterSales.vue';
import QcAfterOrdersDrawer from './QcAfterOrdersDrawer.vue';
import QcProblemDef from './QcProblemDef.vue';
import QcShopList from './QcShopList.vue';
import QcShopGoods from './QcShopGoods.vue';
import QcHitManage from './QcHitManage.vue';
import QcPerm from './QcPerm.vue';
import QcPermDept from './QcPermDept.vue';
import QcPermRole from './QcPermRole.vue';
import QcAuditWeight from './QcAuditWeight.vue';
import QcAuditExempt from './QcAuditExempt.vue';
import QcReviewList from './QcReviewList.vue';
import QcTodoList from './QcTodoList.vue';
import './style.css';
import './qcCenter.css';
import './qcAudit.css';
import '../quality2/qc2.css';
/* React 版 App.tsx 静态引入 OpsCenter 使 sg-* 筛选样式全局生效，此处对齐 */
import '../ops-center/OpsCenter.css';

type View = 'dashboard' | 'series' | 'cfg' | 'after' | 'hit' | 'pdef' | 'shop' | 'perm' | 'appeal' | 'audit' | 'todo';
/** 壳级模式：原功能（问题类型驱动）/ 商品标签（数据概览的标签模块切换，左侧菜单不变） */
type Mode = 'legacy' | 'tags';

const props = defineProps<{ sidebarCollapsed: boolean; online?: boolean }>();

/* 深链：hash 第二段指定初始视图（分享 HTML 直落监控列表等）；线上壳 cfg 由下方 watch 回落 */
const readInitialView = (): View => {
  const seg = location.hash.replace(/^#/, '').split('/')[1];
  return seg === 'series' || seg === 'cfg' ? seg : 'dashboard';
};

const view = ref<View>(readInitialView());
const pickAfterJump = (s: AfterJump) => { afterJumpSeed.value = s; shopOpen.value = true; view.value = 'after'; };
const mode = ref<Mode>('legacy');
/* 品控-线上：编码监控一级分组（数据概览/监控列表 二级路由）与配置中心一级分组（命中问题管理/问题商品定义 二级路由）展开态 */
const codeOpen = ref(true);
const confOpen = ref(true);
/* 品控-线上侧栏图标（stroke currentColor，16x16，viewBox 0 0 24 24） */
const NAV_ICONS: Record<string, string> = {
  dashboard: '<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="10"/>',
  series: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  after: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  appeal: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
  todo: '<rect x="8" y="3" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  hit: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  pdef: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  shop: '<path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2-5.6-3.1-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z"/>',
  perm: '<path d="M12 3l7 3v6c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6Z"/><path d="m9.3 11.8 2 2 3.4-3.6"/>',
  audit: '<path d="M12 3v18"/><path d="M4 7h16"/><path d="M6 7l-2.6 5.6a3.2 3.2 0 0 0 6.4 0L7.2 7"/><path d="M18 7l-2.6 5.6a3.2 3.2 0 0 0 6.4 0L19.2 7"/>',
};
const NAV_ICON_SVG = (k: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[k] ?? ''}</svg>`;
/* 权限管理父级分组：展开态 + 当前子页 */
const permOpen = ref(true);
type PermView = 'member' | 'dept' | 'role';
const permView = ref<PermView>('member');
type AuditView = 'weight' | 'exempt';
const auditView = ref<AuditView>('weight');
/* 店铺监控父级分组：店铺列表 / 店铺商品 / 售后数据 / 评价数据 子路由（数据概览页已按用户指令删除） */
const shopOpen = ref(true);
type ShopView = 'list' | 'goods';
const shopView = ref<ShopView>('list');
/* 店铺列表操作列「店铺商品」：带入「店铺 + 平台」查询条件跳店铺商品（种子由 QcShopGoods 消费后清空） */
const pickShopGoods = (shopId: string) => { shopGoodsJumpSeed.value = { shopId }; shopView.value = 'goods'; };
/* 监控列表操作列「关联ID」：带入系列下商品编码跳店铺监控·店铺商品并按编码查询（种子由 QcShopGoods 消费后清空） */
const pickSeriesGoods = (codes: string[]) => {
  shopGoodsJumpSeed.value = { q: codes.join(' ') };
  view.value = 'shop';
  shopView.value = 'goods';
};
/* 系列详情·关联商品「详情」：关抽屉跳店铺商品并按商品ID查询，同时打开该商品详情（商品列表/详情页） */
const openGoodDetail = (g: { id: string }) => {
  detail.value = null;
  shopGoodsJumpSeed.value = { q: g.id, openDetail: true };
  view.value = 'shop';
  shopView.value = 'goods';
};
/* 模板分支内直接比较会被 TS 窄化报错，统一走 helper */
const modeIs = (m: Mode) => mode.value === m;
const sortKey = ref<SortKey | null>('orders');
const sortDesc = ref(true);
const detail = ref<{ series: QcCenterSeries; code?: string; types?: string[] } | null>(null);
const chatCtx = ref<{ codes: QcCenterCode[]; platforms: Platform[]; platform: Platform } | null>(null);
/** 趋势图弹层上下文：系列维度 / 平台维度（数据口径不同，交互一致） */
const trendCtx = ref<{ title: string; totals: ScopeTotals; seriesCode: string } | null>(null);
/* 品控-线上壳无标签配置菜单：切入线上态时若停留在该视图回退数据概览 */
watch(() => props.online, (v) => {
  if (v && view.value === 'cfg') view.value = 'dashboard';
}, { immediate: true });
/** 售后单列表抽屉上下文（售后列表「查看详情」，逐单明细，区别于系列编码详情） */
const afterCtx = ref<QcCenterSeries | null>(null);
/** 聊天会话（上提：全屏弹窗修改命中类型后卡片 / 统计同步闭环）；线上壳按系列惰性生成（命中总数=聊天风险） */
const chatSessions = ref<ChatSession[]>(CHAT_SESSIONS);
const onlineSessions = ref<ChatSession[]>([]);
const onlineSessionVer = ref(0);
watch(detail, (d) => { if (props.online && d) onlineSessions.value = [...onlineSessionsOf(d.series)]; });
const drawerSessions = computed(() => (props.online ? onlineSessions.value : chatSessions.value));
const chatModalSessions = computed(() => {
  if (!props.online || !chatCtx.value) return chatSessions.value;
  void onlineSessionVer.value;
  const first = chatCtx.value.codes[0];
  const s = first ? onlineSeriesOfCode(first.code) : null;
  return s ? [...onlineSessionsOf(s)] : [];
});
const updateSessionHits = (id: string, hits: ChatHit[]) => {
  if (props.online) {
    patchOnlineSession(id, hits);
    onlineSessions.value = onlineSessions.value.map((x) => (x.id === id ? { ...x, hits } : x));
    onlineSessionVer.value++;
  } else {
    chatSessions.value = chatSessions.value.map((x) => (x.id === id ? { ...x, hits } : x));
  }
};
const draft = ref<SeriesFilter>(DEFAULT_SERIES_FILTER);
const applied = ref<SeriesFilter>(DEFAULT_SERIES_FILTER);
/** 标签概览 / 标签配置下钻：预设监控列表标签筛选并跳转（标签字段已合并进监控列表） */
const pickTagCat = (cat: string | null) => {
  const tags = cat ? [cat] : [];
  draft.value = { ...draft.value, tags };
  applied.value = { ...applied.value, tags };
  view.value = 'series';
};
const pickTagLabel = (label: string | null) => {
  const tags = label ? [label] : [];
  draft.value = { ...draft.value, tags };
  applied.value = { ...applied.value, tags };
  view.value = 'series';
};
/** 责任部门绑定（全局式，持久化）：系列编码 → 部门；未绑定回退默认责任部门 */
const dutyMap = ref<Record<string, string>>((() => {
  try { return JSON.parse(localStorage.getItem('funion:dutyDepts') || '{}'); } catch { return {}; }
})());
const changeDuty = (code: string, dept: string | null) => {
  const next = { ...dutyMap.value };
  if (dept === null) delete next[code];
  else next[code] = dept;
  localStorage.setItem('funion:dutyDepts', JSON.stringify(next));
  dutyMap.value = next;
};

const patchDraft = (patch: Partial<SeriesFilter>) => { draft.value = { ...draft.value, ...patch }; };

const seriesView = (problemType: string | null) => (props.online ? onlineSeries() : QC_CENTER_SERIES)
  .map((s) => applySeriesView(s, {
    platform: applied.value.platform === '全部平台' ? null : (applied.value.platform as Platform),
    range: applied.value.range,
    custom: applied.value.custom,
    problemType,
  }))
  .filter((x): x is QcCenterSeries => x !== null);
const viewSeries = computed(() => seriesView(applied.value.type === '全部类型' ? null : applied.value.type));
/* 问题类型小类下钻（穿梭框）：系列下任一会话命中（大类+小类）即保留；线上壳取系列会话、离线壳取编码会话 */
const seriesHasSubHit = (s: QcCenterSeries, type: string, sub: string): boolean => (props.online
  ? onlineSessionsOf(s).some((sess) => sess.hits.some((h) => h.type === type && h.sub === sub))
  : s.codes.some((c) => sessionsOf(c.code).some((sess) => sess.hits.some((h) => h.type === type && h.sub === sub))));
/* 命中问题类型点入详情：详情内保留全部问题类型（不按列表类型筛选收敛），仅默认选中点入的那一类 */
const viewSeriesAllTypes = computed(() => seriesView(null));
const pickTypeDetail = (s: QcCenterSeries, t: string) => {
  detail.value = { series: viewSeriesAllTypes.value.find((x) => x.seriesCode === s.seriesCode) ?? s, types: [t] };
};

const filtered = computed(() => {
  let list = viewSeries.value;
  if (applied.value.dept !== '全部部门') {
    list = list.filter((s) => deptsOfTypes(s.problemHits.map((h) => h.type)).includes(applied.value.dept));
  }
  if (applied.value.duty !== '全部部门') {
    list = list.filter((s) => (dutyMap.value[s.seriesCode] ?? defaultDutyDept(s)) === applied.value.duty);
  }
  if (applied.value.type !== '全部类型' && applied.value.sub) {
    list = list.filter((s) => seriesHasSubHit(s, applied.value.type, applied.value.sub!));
  }
  /* 线上壳：组别 / 运维人员归属 + 数值区间筛选（订单量/退款率%/售后率%/风险率%） */
  if (props.online) {
    const f = applied.value;
    if (f.group !== '全部组别' || f.operator !== '全部运维') {
      list = list.filter((s) => {
        const o = onlineOwnerOf(s.seriesCode);
        if (!o) return false;
        return (f.group === '全部组别' || o.group === f.group) && (f.operator === '全部运维' || o.operator === f.operator);
      });
    }
    const num = (v: string) => (v.trim() === '' ? null : Number(v));
    const inRange = (val: number, min: string, max: string) => {
      const lo = num(min); const hi = num(max);
      return (lo === null || Number.isNaN(lo) || val >= lo) && (hi === null || Number.isNaN(hi) || val <= hi);
    };
    /* 售后率/风险率区间＝行内复合列同口径占比（售后单÷订单量、风险会话÷会话总数，百分数一位小数） */
    list = list.filter((s) => inRange(s.orders, f.ordersMin, f.ordersMax)
      && inRange(Math.round(s.refundRate * 1000) / 10, f.rateMin, f.rateMax)
      && inRange(Math.round((s.orders ? s.afterSales / s.orders : 0) * 1000) / 10, f.asMin, f.asMax)
      && inRange(Math.round(onlineChatBrief(s).rate * 1000) / 10, f.crMin, f.crMax));
    /* 问题编码状态筛选：与首列标识同口径（系列下任一编码存在问题命中） */
    if (f.pcode !== '全部') {
      const want = f.pcode === '有问题编码';
      list = list.filter((s) => (props.online ? seriesProblemCodes(s).length > 0 : seriesHasProblemCode(s)) === want);
    }
    /* 问题来源筛选（问题小类的标记来源）：编码命中按来源改写——客服打标＝会话客服打标(csTag 小类归大类)；
       系统稽查＝系统命中；无该来源命中的编码剔除、系列下无剩余编码则整行剔除（行内芯片/编码/部门列同口径收敛） */
    if (f.psrc !== '全部来源') {
      list = list
        .map((s) => {
          const codes = s.codes
            .map((c) => ({ ...c, problemHits: f.psrc === '客服打标' ? codeCsHits(c.code) : c.problemHits.filter((h) => h.count > 0) }))
            .filter((c) => c.problemHits.length > 0);
          return codes.length ? { ...s, codes } : null;
        })
        .filter((x): x is QcCenterSeries => x !== null);
    }
  }
  /* 标签筛选（级联多选 + 健康等级 + 判定方式）：系列下属任一商品编码命中即保留（与编码标签页同源口径）；线上壳无该维度 */
  const f = applied.value;
  if (!props.online && (f.tags.length || f.tagHealth !== '全部等级' || f.tagJudge !== '全部方式')) {
    list = list.filter((s) => codesMatchTagFilter(s.seriesCode, f.tags, f.tagHealth, f.tagJudge));
  }
  const kw = applied.value.q.trim().toLowerCase();
  if (!kw) return list;
  return list.filter(
    (s) => s.seriesCode.toLowerCase().includes(kw)
      || s.name.toLowerCase().includes(kw)
      || s.codes.some((c) => c.code.toLowerCase().includes(kw) || c.name.toLowerCase().includes(kw))
      || s.platforms.some((p) => p.includes(applied.value.q.trim()) || SHOP_NAME[p].toLowerCase().includes(kw)),
  );
});

/* 复合列排序指标取值：派生口径与行内展示同源（售后率/聊天三口径/评价三口径） */
const sortVal = (s: QcCenterSeries): number => {
  switch (sortKey.value) {
    case 'afterRate': return s.orders ? s.afterSales / s.orders : 0;
    case 'chatTotal': return onlineChatBrief(s).total;
    case 'chatRisk': return onlineChatBrief(s).risk;
    case 'chatRate': return onlineChatBrief(s).rate;
    case 'reviewTotal': return onlineReviewBrief(s).total;
    case 'reviewBad': return onlineReviewBrief(s).bad;
    case 'reviewRate': return onlineReviewBrief(s).rate;
    case 'refundRate': return s.refundRate;
    case 'afterSales': return s.afterSales;
    case 'chatRiskHits': return s.chatRiskHits;
    default: return s.orders;
  }
};

const sortedCalc = computed(() => (sortKey.value ? [...filtered.value].sort((a, b) => {
  const diff = sortVal(a) - sortVal(b);
  return sortDesc.value ? -diff : diff;
}) : filtered.value));
/* 模拟接口读取：监控列表行经 /qc/monitor/series 返回（入参＝生效筛选＋排序），界面只消费响应 data */
const sorted = ref<QcCenterSeries[]>([]);
const loading = ref(false);
watch(sortedCalc, async (v) => {
  loading.value = true;
  const res = await qcGet('/qc/monitor/series', {
    filter: applied.value,
    sort: sortKey.value ? { key: sortKey.value, desc: sortDesc.value } : null,
  }, () => v);
  sorted.value = res.data;
  loading.value = false;
}, { immediate: true });
onMounted(() => {
  void qcGet('/qc/db/bootstrap', { app: '品控-线上' }, () => ({
    series: onlineSeries().length,
    sessions: CHAT_SESSIONS.length,
  }));
});

const toggleSort = (key: SortKey) => {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value;
  else { sortKey.value = key; sortDesc.value = true; }
};
/** 复合列头气泡内直接指定升降序 */
const setSort = (key: SortKey, desc: boolean) => {
  sortKey.value = key;
  sortDesc.value = desc;
};
/** 复合列头气泡清除排序：恢复数据默认顺序 */
const clearSort = () => { sortKey.value = null; };

/** 平台维度趋势弹窗辅助 */
const onTrendStat = (st: PlatformStat, label: string, seriesCode: string) => {
  trendCtx.value = {
    title: `${label} · ${st.platform}`,
    totals: { orders: st.orders, refundRate: st.refundRate, afterSales: st.afterSales, chatRisks: st.chatRisks },
    seriesCode,
  };
};
</script>

<template>
  <div class="pm-page qc-page qc-center-page qc-mode-page">
    <div class="qc-page qc-mode-body">
      <aside class="qc-side" :class="[sidebarCollapsed ? 'collapsed' : '', online ? 'qcon-side' : '']">
      <div class="qc-side-brand">
        {{ online ? '品控中心' : '运维管理后台' }}
        <span>问题类型驱动 · 系列编码追踪</span>
      </div>
      <div
        v-if="online"
        class="qc-nav qc-nav-parent"
        :class="{ child: view === 'dashboard' || view === 'series' }"
        @click="codeOpen = !codeOpen; view = 'dashboard'; draft = { ...draft, q: '' }"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('series')" />
        <span class="qc-nav-text">编码监控</span>
        <span class="qc-nav-arrow" :class="{ open: codeOpen }">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </div>
      <div v-if="online && codeOpen" class="qc-subnav-wrap">
        <div
          class="qc-nav qc-subnav"
          :class="view === 'dashboard' ? 'active' : ''"
          @click="view = 'dashboard'; draft = { ...draft, q: '' }"
        ><span class="qc-nav-text">数据概览</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'series' ? 'active' : ''"
          @click="view = 'series'; draft = { ...draft, q: '' }"
        ><span class="qc-nav-text">监控列表</span></div>
      </div>
      <div
        v-if="!online"
        class="qc-nav"
        :class="view === 'dashboard' ? 'active' : ''"
        @click="view = 'dashboard'; draft = { ...draft, q: '' }"
      >
        <span class="qc-nav-ico">▦</span>
        <span class="qc-nav-text">数据概览</span>
      </div>
      <div
        v-if="!online"
        class="qc-nav"
        :class="view === 'series' ? 'active' : ''"
        @click="view = 'series'; draft = { ...draft, q: '' }"
      >
        <span class="qc-nav-ico">▤</span>
        <span class="qc-nav-text">监控列表</span>
      </div>
      <div
        v-if="online"
        class="qc-nav qc-nav-parent"
        :class="{ child: view === 'shop' || view === 'after' || view === 'appeal' }"
        @click="shopOpen = !shopOpen; view = 'shop'; shopView = 'list'"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('shop')" />
        <span class="qc-nav-text">店铺监控</span>
        <span class="qc-nav-arrow" :class="{ open: shopOpen }">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </div>
      <div v-if="online && shopOpen" class="qc-subnav-wrap">
        <div
          class="qc-nav qc-subnav"
          :class="view === 'shop' && shopView === 'list' ? 'active' : ''"
          @click="view = 'shop'; shopView = 'list'"
        ><span class="qc-nav-text">店铺列表</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'shop' && shopView === 'goods' ? 'active' : ''"
          @click="view = 'shop'; shopView = 'goods'"
        ><span class="qc-nav-text">店铺商品</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'after' ? 'active' : ''"
          @click="view = 'after'"
        ><span class="qc-nav-text">售后数据</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'appeal' ? 'active' : ''"
          @click="view = 'appeal'"
        ><span class="qc-nav-text">评价数据</span></div>
      </div>
      <div
        v-if="online"
        class="qc-nav"
        :class="view === 'todo' ? 'active' : ''"
        @click="view = 'todo'"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('todo')" />
        <span class="qc-nav-text">待办任务</span>
      </div>
      <div
        v-if="online"
        class="qc-nav qc-nav-parent"
        :class="{ child: view === 'hit' || view === 'pdef' }"
        @click="confOpen = !confOpen; view = 'hit'"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('pdef')" />
        <span class="qc-nav-text">配置中心</span>
        <span class="qc-nav-arrow" :class="{ open: confOpen }">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </span>
      </div>
      <div v-if="online && confOpen" class="qc-subnav-wrap">
        <div
          class="qc-nav qc-subnav"
          :class="view === 'hit' ? 'active' : ''"
          @click="view = 'hit'"
        ><span class="qc-nav-text">命中问题管理</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'pdef' ? 'active' : ''"
          @click="view = 'pdef'"
        ><span class="qc-nav-text">问题商品定义</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'audit' && auditView === 'weight' ? 'active' : ''"
          @click="view = 'audit'; auditView = 'weight'"
        ><span class="qc-nav-text">权重配置</span></div>
        <div
          class="qc-nav qc-subnav"
          :class="view === 'audit' && auditView === 'exempt' ? 'active' : ''"
          @click="view = 'audit'; auditView = 'exempt'"
        ><span class="qc-nav-text">豁免机制</span></div>
      </div>
      <template v-if="online">
        <div
          class="qc-nav qc-nav-parent"
          :class="{ child: view === 'perm' }"
          @click="permOpen = !permOpen; view = 'perm'; permView = 'member'"
        >
          <span class="qc-nav-ico" v-html="NAV_ICON_SVG('perm')" />
          <span class="qc-nav-text">权限管理</span>
          <span class="qc-nav-arrow" :class="{ open: permOpen }">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
          </span>
        </div>
        <div v-if="permOpen" class="qc-subnav-wrap">
          <div
            class="qc-nav qc-subnav"
            :class="view === 'perm' && permView === 'member' ? 'active' : ''"
            @click="view = 'perm'; permView = 'member'"
          ><span class="qc-nav-text">成员管理</span></div>
          <div
            class="qc-nav qc-subnav"
            :class="view === 'perm' && permView === 'dept' ? 'active' : ''"
            @click="view = 'perm'; permView = 'dept'"
          ><span class="qc-nav-text">部门管理</span></div>
          <div
            class="qc-nav qc-subnav"
            :class="view === 'perm' && permView === 'role' ? 'active' : ''"
            @click="view = 'perm'; permView = 'role'"
          ><span class="qc-nav-text">角色管理</span></div>
        </div>
      </template>
      <div
        v-if="!online"
        class="qc-nav"
        :class="view === 'cfg' ? 'active' : ''"
        @click="view = 'cfg'"
      >
        <span class="qc-nav-ico">⚙</span>
        <span class="qc-nav-text">标签配置</span>
      </div>
    </aside>

    <div class="qc-main">
      <!-- 模式切换仅作为数据概览的模块切换：左侧菜单与其余视图不随模式变化 -->
      <div v-if="view === 'dashboard' && !online" class="qc-mode-bar">
        <div class="qc-mode-tabs">
          <button type="button" :class="{ active: modeIs('legacy') }" @click="mode = 'legacy'">原功能</button>
          <button type="button" :class="{ active: modeIs('tags') }" @click="mode = 'tags'">商品标签</button>
        </div>
        <span class="qc-mode-desc">{{ modeIs('legacy') ? '问题类型驱动 · 系列编码追踪' : '商品标签驱动 · 时机与决策' }}</span>
      </div>
      <QcDashboard
        v-if="view === 'dashboard' && (online || modeIs('legacy'))"
        :online="online"
        :on-pick-type="(t: string) => {
          draft = { ...draft, type: t, sub: null };
          applied = { ...applied, type: t, sub: null };
          view = 'series';
        }"
        :on-open-code="(seriesCode: string, code: string) => {
          const s = (online ? onlineSeries() : QC_CENTER_SERIES).find((x) => x.seriesCode === seriesCode);
          if (s) detail = { series: s, code };
        }"
        :on-pick-dept="online ? (d: string) => {
          draft = { ...draft, dept: d };
          applied = { ...applied, dept: d };
          view = 'series';
        } : undefined"
        :on-pick-after="pickAfterJump"
      />
      <Qc2Dashboard
        v-else-if="view === 'dashboard' && !online"
        :on-pick-cat="pickTagCat"
        :on-pick-label="pickTagLabel"
      />
      <QcSeriesList
        v-else-if="view === 'series'"
        :series="sorted"
        :loading="loading"
        :sort-key="sortKey"
        :sort-desc="sortDesc"
        :on-toggle-sort="toggleSort"
        :on-set-sort="setSort"
        :on-clear-sort="clearSort"
        :draft="draft"
        :on-draft="patchDraft"
        :on-query="() => (applied = draft)"
        :on-reset="() => { draft = DEFAULT_SERIES_FILTER; applied = DEFAULT_SERIES_FILTER; }"
        :on-detail="(s: QcCenterSeries) => (detail = { series: s })"
        :on-chat="(codes: QcCenterCode[], platforms: Platform[], platform: Platform) => (chatCtx = { codes, platforms, platform })"
        :on-trend="(s: QcCenterSeries) => (trendCtx = {
          title: `系列 ${s.name}`,
          totals: { orders: s.orders, refundRate: s.refundRate, afterSales: s.afterSales, chatRisks: s.chatRiskHits },
          seriesCode: s.seriesCode,
        })"
        :on-trend-stat="onTrendStat"
        :duty-map="dutyMap"
        :on-duty="changeDuty"
        :online="online"
        :scope-dept="applied.dept"
        :on-pick-type="pickTypeDetail"
        :on-pick-dept="(s: QcCenterSeries, d: string) => (detail = {
          series: s,
          types: QC_PROBLEM_TYPES.filter((x) => PROBLEM_DEPT[x] === d),
        })"
        :on-codes="pickSeriesGoods"
      />
      <QcAfterSales
        v-else-if="view === 'after'"
      />
      <!-- 评价列表：看板（指标/问题类型占比/星级分布）＋扁平评价明细列表两级结构 -->
      <QcReviewList v-else-if="view === 'appeal'" />
      <QcTodoList v-else-if="view === 'todo'" />
      <QcHitManage v-else-if="view === 'hit'" />
      <QcProblemDef v-else-if="view === 'pdef'" />
      <QcShopList v-else-if="view === 'shop' && shopView === 'list'" :on-pick-goods="pickShopGoods" />
      <QcShopGoods v-else-if="view === 'shop' && shopView === 'goods'" />
      <QcPerm v-else-if="view === 'perm' && permView === 'member'" />
      <QcPermDept v-else-if="view === 'perm' && permView === 'dept'" />
      <QcPermRole v-else-if="view === 'perm' && permView === 'role'" />
      <QcAuditWeight v-else-if="view === 'audit' && auditView === 'weight'" />
      <QcAuditExempt v-else-if="view === 'audit' && auditView === 'exempt'" />
      <Qc2Config
        v-else
        :on-pick-label="pickTagLabel"
      />
      </div>
    </div>

    <QcSeriesDrawer
      v-if="detail"
      :key="`${detail.series.seriesCode}-${detail.code ?? 'all'}-${(detail.types ?? []).join(',')}`"
      :series="detail.series"
      :initial-code="detail.code"
      :initial-types="detail.types"
      :on-close="() => (detail = null)"
      :all-sessions="drawerSessions"
      :on-update-hits="updateSessionHits"
      :on-open-good="openGoodDetail"
      :online="online"
    />
    <QcChatModal
      v-if="chatCtx"
      :codes="chatCtx.codes"
      :platforms="chatCtx.platforms"
      :initial-platform="chatCtx.platform"
      :sessions="chatModalSessions"
      :on-update-hits="updateSessionHits"
      :on-close="() => (chatCtx = null)"
    />
    <QcTrendModal
      v-if="trendCtx"
      :title="trendCtx.title"
      :totals="trendCtx.totals"
      :series-code="trendCtx.seriesCode"
      :online="online"
      :on-close="() => (trendCtx = null)"
    />
    <QcAfterOrdersDrawer
      v-if="afterCtx"
      :series="afterCtx"
      :on-close="() => (afterCtx = null)"
    />
  </div>
</template>
