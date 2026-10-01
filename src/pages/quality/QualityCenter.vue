<script setup lang="ts">
/* =========================================================
   品控中心 v3
   1. 问题类型看板：数据总览 · 问题类型占比 · 问题趋势（今日/近7天/自定义）
   2. 系列编码列表：复刻品控管理系列维度 · 展开各平台数据 · 命中问题类型列
   ========================================================= */
import { computed, ref, watch } from 'vue';
import {
  QC_CENTER_SERIES,
  PROBLEM_DEPT,
  QC_PROBLEM_TYPES,
  applySeriesView,
  defaultDutyDept,
  deptsOfTypes,
  type QcCenterCode,
  type QcCenterSeries,
  type ScopeTotals,
} from './qcCenterData';
import { CHAT_SESSIONS, SHOP_NAME, type ChatHit, type ChatSession, type Platform, type PlatformStat } from './data';
import { codesMatchTagFilter } from '../quality2/qc2Data';
import { onlineSeries, onlineSeriesOfCode, onlineSessionsOf, onlineOwnerOf, onlineChatBrief, patchOnlineSession } from './qcOnlineData';
import QcDashboard from './QcDashboard.vue';
import QcSeriesList, { DEFAULT_SERIES_FILTER, type SeriesFilter, type SortKey } from './QcSeriesList.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import Qc2Dashboard from '../quality2/Qc2Dashboard.vue';
import Qc2Config from '../quality2/Qc2Config.vue';
import QcChatModal from './QcChatModal.vue';
import QcTrendModal from './QcTrendModal.vue';
import QcAfterSales from './QcAfterSales.vue';
import QcAfterOrdersDrawer from './QcAfterOrdersDrawer.vue';
import QcProblemCodes from './QcProblemCodes.vue';
import QcHitManage from './QcHitManage.vue';
import QcPerm from './QcPerm.vue';
import QcPermDept from './QcPermDept.vue';
import QcPermRole from './QcPermRole.vue';
import './style.css';
import './qcCenter.css';
import '../quality2/qc2.css';
/* React 版 App.tsx 静态引入 OpsCenter 使 sg-* 筛选样式全局生效，此处对齐 */
import '../ops-center/OpsCenter.css';

type View = 'dashboard' | 'series' | 'cfg' | 'after' | 'problem' | 'hit' | 'perm';
/** 壳级模式：原功能（问题类型驱动）/ 商品标签（数据概览的标签模块切换，左侧菜单不变） */
type Mode = 'legacy' | 'tags';

const props = defineProps<{ sidebarCollapsed: boolean; online?: boolean }>();

/* 深链：hash 第二段指定初始视图（分享 HTML 直落监控列表等）；线上壳 cfg 由下方 watch 回落 */
const readInitialView = (): View => {
  const seg = location.hash.replace(/^#/, '').split('/')[1];
  return seg === 'series' || seg === 'cfg' ? seg : 'dashboard';
};

const view = ref<View>(readInitialView());
const mode = ref<Mode>('legacy');
/* 品控-线上侧栏图标（stroke currentColor，16x16，viewBox 0 0 24 24） */
const NAV_ICONS: Record<string, string> = {
  dashboard: '<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="10"/>',
  series: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  after: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  problem: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  hit: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  perm: '<path d="M12 3l7 3v6c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6Z"/><path d="m9.3 11.8 2 2 3.4-3.6"/>',
};
const NAV_ICON_SVG = (k: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${NAV_ICONS[k] ?? ''}</svg>`;
/* 权限管理父级分组：展开态 + 当前子页 */
const permOpen = ref(true);
type PermView = 'member' | 'dept' | 'role';
const permView = ref<PermView>('member');
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
  /* 线上壳：组别 / 运维人员归属 + 数值区间筛选（订单量/退款率%/售后单/聊天风险） */
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
    list = list.filter((s) => inRange(s.orders, f.ordersMin, f.ordersMax)
      && inRange(Math.round(s.refundRate * 1000) / 10, f.rateMin, f.rateMax)
      && inRange(s.afterSales, f.asMin, f.asMax)
      && inRange(s.chatRiskHits, f.crMin, f.crMax));
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

/* 复合列排序指标取值：派生口径与行内展示同源（退款单数/售后率/聊天三口径） */
const sortVal = (s: QcCenterSeries): number => {
  switch (sortKey.value) {
    case 'refundCount': return Math.round(s.orders * s.refundRate);
    case 'afterRate': return s.orders ? s.afterSales / s.orders : 0;
    case 'chatTotal': return onlineChatBrief(s).total;
    case 'chatRisk': return onlineChatBrief(s).risk;
    case 'chatRate': return onlineChatBrief(s).rate;
    case 'refundRate': return s.refundRate;
    case 'afterSales': return s.afterSales;
    case 'chatRiskHits': return s.chatRiskHits;
    default: return s.orders;
  }
};

const sorted = computed(() => (sortKey.value ? [...filtered.value].sort((a, b) => {
  const diff = sortVal(a) - sortVal(b);
  return sortDesc.value ? -diff : diff;
}) : filtered.value));

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
        class="qc-nav"
        :class="view === 'dashboard' ? 'active' : ''"
        @click="view = 'dashboard'; draft = { ...draft, q: '' }"
      >
        <span v-if="online" class="qc-nav-ico" v-html="NAV_ICON_SVG('dashboard')" />
        <span v-else class="qc-nav-ico">▦</span>
        <span class="qc-nav-text">数据概览</span>
      </div>
      <div
        class="qc-nav"
        :class="view === 'series' ? 'active' : ''"
        @click="view = 'series'; draft = { ...draft, q: '' }"
      >
        <span v-if="online" class="qc-nav-ico" v-html="NAV_ICON_SVG('series')" />
        <span v-else class="qc-nav-ico">▤</span>
        <span class="qc-nav-text">监控列表</span>
      </div>
      <div
        v-if="online"
        class="qc-nav"
        :class="view === 'after' ? 'active' : ''"
        @click="view = 'after'"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('after')" />
        <span class="qc-nav-text">售后列表</span>
      </div>
      <div
        v-if="online"
        class="qc-nav"
        :class="view === 'problem' ? 'active' : ''"
        @click="view = 'problem'"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('problem')" />
        <span class="qc-nav-text">问题商品</span>
      </div>
      <div
        v-if="online"
        class="qc-nav"
        :class="view === 'hit' ? 'active' : ''"
        @click="view = 'hit'"
      >
        <span class="qc-nav-ico" v-html="NAV_ICON_SVG('hit')" />
        <span class="qc-nav-text">命中问题管理</span>
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
          draft = { ...draft, type: t };
          applied = { ...applied, type: t };
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
      />
      <Qc2Dashboard
        v-else-if="view === 'dashboard' && !online"
        :on-pick-cat="pickTagCat"
        :on-pick-label="pickTagLabel"
      />
      <QcSeriesList
        v-else-if="view === 'series'"
        :series="sorted"
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
          title: `系列 ${s.seriesCode} · ${s.name}`,
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
      />
      <QcAfterSales
        v-else-if="view === 'after'"
        :on-orders="(s: QcCenterSeries) => (afterCtx = s)"
        :on-trend="(s: QcCenterSeries) => (trendCtx = {
          title: `系列 ${s.seriesCode} · ${s.name}`,
          totals: { orders: s.orders, refundRate: s.refundRate, afterSales: s.afterSales, chatRisks: s.chatRiskHits },
          seriesCode: s.seriesCode,
        })"
      />
      <QcProblemCodes
        v-else-if="view === 'problem'"
        :on-detail="(s: QcCenterSeries) => (detail = { series: s })"
      />
      <QcHitManage v-else-if="view === 'hit'" />
      <QcPerm v-else-if="view === 'perm' && permView === 'member'" />
      <QcPermDept v-else-if="view === 'perm' && permView === 'dept'" />
      <QcPermRole v-else-if="view === 'perm' && permView === 'role'" />
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
