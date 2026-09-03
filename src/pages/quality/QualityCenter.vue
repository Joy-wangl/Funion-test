<script setup lang="ts">
/* =========================================================
   品控中心 v3
   1. 问题类型看板：数据总览 · 问题类型占比 · 问题趋势（今日/近7天/自定义）
   2. 系列编码列表：复刻品控管理系列维度 · 展开各平台数据 · 命中问题类型列
   ========================================================= */
import { computed, ref } from 'vue';
import {
  QC_CENTER_SERIES,
  applySeriesView,
  defaultDutyDept,
  deptsOfTypes,
  type QcCenterCode,
  type QcCenterSeries,
  type ScopeTotals,
} from './qcCenterData';
import { CHAT_SESSIONS, SHOP_NAME, type ChatHit, type ChatSession, type Platform, type PlatformStat } from './data';
import { QC_OPT_TASKS, OPT_GROUPS, OPT_PICKERS, type OptTask, type OptStatus, type StatusTab } from './qcOptData';
import { pushToast } from '../../components/toast';
import QcDashboard from './QcDashboard.vue';
import QcSeriesList, { DEFAULT_SERIES_FILTER, type SeriesFilter, type SortKey } from './QcSeriesList.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import QcChatModal from './QcChatModal.vue';
import QcTrendModal from './QcTrendModal.vue';
import QcCreateOptModal from './QcCreateOptModal.vue';
import OptTaskView from './qcOptPage.vue';
import './style.css';
import './qcCenter.css';
/* React 版 App.tsx 静态引入 OpsCenter 使 sg-* 筛选样式全局生效，此处对齐 */
import '../ops-center/OpsCenter.css';

type View = 'dashboard' | 'series' | 'opt';

defineProps<{ sidebarCollapsed: boolean }>();

const view = ref<View>('dashboard');
const sortKey = ref<SortKey>('orders');
const sortDesc = ref(true);
const detail = ref<{ series: QcCenterSeries; code?: string } | null>(null);
const chatCtx = ref<{ codes: QcCenterCode[]; platforms: Platform[]; platform: Platform } | null>(null);
/** 趋势图弹层上下文：系列维度 / 平台维度（数据口径不同，交互一致） */
const trendCtx = ref<{ title: string; totals: ScopeTotals; seriesCode: string } | null>(null);
/** 优化任务数据与状态 tab（概览点击可跳转列表对应状态） */
const optTasks = ref<OptTask[]>(QC_OPT_TASKS);
const optStatusTab = ref<StatusTab>('all');
/** 创建优化任务弹层上下文（监控列表操作列 / 详情抽屉入口） */
const createCtx = ref<QcCenterSeries | null>(null);
/** 聊天会话（上提：全屏弹窗修改命中类型后卡片 / 统计同步闭环） */
const chatSessions = ref<ChatSession[]>(CHAT_SESSIONS);
const updateSessionHits = (id: string, hits: ChatHit[]) => {
  chatSessions.value = chatSessions.value.map((x) => (x.id === id ? { ...x, hits } : x));
};
const draft = ref<SeriesFilter>(DEFAULT_SERIES_FILTER);
const applied = ref<SeriesFilter>(DEFAULT_SERIES_FILTER);
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

/** 创建优化任务：仅采集问题点/需求/凭证，写入优化任务列表（待认领），监控列表关联数同步 */
const submitCreateOpt = (form: { problem: string; demand: string; evidence: string[] }) => {
  if (!createCtx.value) return;
  const series = createCtx.value;
  const prev = optTasks.value;
  const nextId = prev.reduce((m, t) => {
    const n = parseInt(t.id.replace('OT-', ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 1000) + 1;
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  const task: OptTask = {
    id: `OT-${nextId}`,
    createdAt: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
    seriesCode: series.seriesCode,
    seriesName: series.name,
    status: 'pendingClaim',
    optType: form.problem,
    optDirection: form.demand,
    optLevel: 'P1',
    picker: OPT_PICKERS[0],
    orders30d: series.orders,
    gross30d: Math.round(series.orders * 0.52),
    refundRate: series.refundRate,
    group: OPT_GROUPS[0],
    assignStatus: '待处理',
    evidence: form.evidence,
  };
  optTasks.value = [task, ...prev];
  createCtx.value = null;
  pushToast('已创建优化任务，可在「优化任务」列表查看');
};

const viewSeries = computed(() => QC_CENTER_SERIES
  .map((s) => applySeriesView(s, {
    platform: applied.value.platform === '全部平台' ? null : (applied.value.platform as Platform),
    range: applied.value.range,
    custom: applied.value.custom,
    problemType: applied.value.type === '全部类型' ? null : applied.value.type,
  }))
  .filter((x): x is QcCenterSeries => x !== null));

const filtered = computed(() => {
  let list = viewSeries.value;
  if (applied.value.dept !== '全部部门') {
    list = list.filter((s) => deptsOfTypes(s.problemHits.map((h) => h.type)).includes(applied.value.dept));
  }
  if (applied.value.duty !== '全部部门') {
    list = list.filter((s) => (dutyMap.value[s.seriesCode] ?? defaultDutyDept(s)) === applied.value.duty);
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

const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const diff = a[sortKey.value] - b[sortKey.value];
  return sortDesc.value ? -diff : diff;
}));

const toggleSort = (key: SortKey) => {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value;
  else { sortKey.value = key; sortDesc.value = true; }
};

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
  <div class="pm-page qc-page qc-center-page">
    <aside class="qc-side" :class="sidebarCollapsed ? 'collapsed' : ''">
      <div class="qc-side-brand">
        品控中心
        <span>问题类型驱动 · 系列编码追踪</span>
      </div>
      <div
        class="qc-nav"
        :class="view === 'dashboard' ? 'active' : ''"
        @click="view = 'dashboard'; draft = { ...draft, q: '' }"
      >
        <span class="qc-nav-ico">▦</span>
        <span class="qc-nav-text">数据概览</span>
      </div>
      <div
        class="qc-nav"
        :class="view === 'series' ? 'active' : ''"
        @click="view = 'series'; draft = { ...draft, q: '' }"
      >
        <span class="qc-nav-ico">▤</span>
        <span class="qc-nav-text">监控列表</span>
      </div>
      <div
        class="qc-nav"
        :class="view === 'opt' ? 'active' : ''"
        @click="view = 'opt'"
      >
        <span class="qc-nav-ico">⚑</span>
        <span class="qc-nav-text">优化任务</span>
      </div>
    </aside>

    <div class="qc-main">
      <QcDashboard
        v-if="view === 'dashboard'"
        :opt-tasks="optTasks"
        :on-open-opt-status="(s: OptStatus) => { optStatusTab = s; view = 'opt'; }"
        :on-pick-type="(t: string) => {
          draft = { ...draft, type: t };
          applied = { ...applied, type: t };
          view = 'series';
        }"
        :on-open-code="(seriesCode: string, code: string) => {
          const s = QC_CENTER_SERIES.find((x) => x.seriesCode === seriesCode);
          if (s) detail = { series: s, code };
        }"
      />
      <QcSeriesList
        v-else-if="view === 'series'"
        :series="sorted"
        :sort-key="sortKey"
        :sort-desc="sortDesc"
        :on-toggle-sort="toggleSort"
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
        :opt-tasks="optTasks"
        :on-create-opt="(s: QcCenterSeries) => (createCtx = s)"
      />
      <OptTaskView
        v-else
        :tasks="optTasks"
        :set-tasks="(up: (ts: OptTask[]) => OptTask[]) => (optTasks = up(optTasks))"
        :status-tab="optStatusTab"
        :set-status-tab="(s: StatusTab) => (optStatusTab = s)"
      />
    </div>

    <QcSeriesDrawer
      v-if="detail"
      :key="`${detail.series.seriesCode}-${detail.code ?? 'all'}`"
      :series="detail.series"
      :initial-code="detail.code"
      :opt-tasks="optTasks.filter((t) => t.seriesCode === detail!.series.seriesCode)"
      :on-create-opt="() => (createCtx = detail!.series)"
      :on-close="() => (detail = null)"
      :all-sessions="chatSessions"
      :on-update-hits="updateSessionHits"
    />
    <QcChatModal
      v-if="chatCtx"
      :codes="chatCtx.codes"
      :platforms="chatCtx.platforms"
      :initial-platform="chatCtx.platform"
      :sessions="chatSessions"
      :on-update-hits="updateSessionHits"
      :on-close="() => (chatCtx = null)"
    />
    <QcTrendModal
      v-if="trendCtx"
      :title="trendCtx.title"
      :totals="trendCtx.totals"
      :opt-tasks="optTasks.filter((t) => t.seriesCode === trendCtx!.seriesCode)"
      :on-close="() => (trendCtx = null)"
    />
    <QcCreateOptModal
      v-if="createCtx"
      :series="createCtx"
      :on-close="() => (createCtx = null)"
      :on-submit="submitCreateOpt"
    />
  </div>
</template>
