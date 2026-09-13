<script setup lang="ts">
/* =========================================================
   品控中心 v3
   1. 问题类型看板：数据总览 · 问题类型占比 · 问题趋势（今日/近7天/自定义）
   2. 系列编码列表：复刻品控管理系列维度 · 展开各平台数据 · 命中问题类型列
   ========================================================= */
import { computed, ref, watch } from 'vue';
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
import { codesMatchTagFilter } from '../quality2/qc2Data';
import { onlineSeries, onlineSeriesOfCode, onlineSessionsOf, patchOnlineSession } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import QcDashboard from './QcDashboard.vue';
import QcSeriesList, { DEFAULT_SERIES_FILTER, type SeriesFilter, type SortKey } from './QcSeriesList.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import Qc2Dashboard from '../quality2/Qc2Dashboard.vue';
import Qc2Config from '../quality2/Qc2Config.vue';
import QcChatModal from './QcChatModal.vue';
import QcTrendModal from './QcTrendModal.vue';
import QcCreateOptModal from './QcCreateOptModal.vue';
import OptTaskView from './qcOptPage.vue';
import './style.css';
import './qcCenter.css';
import '../quality2/qc2.css';
/* React 版 App.tsx 静态引入 OpsCenter 使 sg-* 筛选样式全局生效，此处对齐 */
import '../ops-center/OpsCenter.css';

type View = 'dashboard' | 'series' | 'opt' | 'cfg';
/** 壳级模式：原功能（问题类型驱动）/ 商品标签（数据概览的标签模块切换，左侧菜单不变） */
type Mode = 'legacy' | 'tags';

const props = defineProps<{ sidebarCollapsed: boolean; online?: boolean }>();

/* 深链：hash 第二段指定初始视图（分享 HTML 直落监控列表等）；线上壳 cfg 由下方 watch 回落 */
const readInitialView = (): View => {
  const seg = location.hash.replace(/^#/, '').split('/')[1];
  return seg === 'series' || seg === 'opt' || seg === 'cfg' ? seg : 'dashboard';
};

const view = ref<View>(readInitialView());
const mode = ref<Mode>('legacy');
/* 模板分支内直接比较会被 TS 窄化报错，统一走 helper */
const modeIs = (m: Mode) => mode.value === m;
const sortKey = ref<SortKey>('orders');
const sortDesc = ref(true);
const detail = ref<{ series: QcCenterSeries; code?: string } | null>(null);
const chatCtx = ref<{ codes: QcCenterCode[]; platforms: Platform[]; platform: Platform } | null>(null);
/** 趋势图弹层上下文：系列维度 / 平台维度（数据口径不同，交互一致） */
const trendCtx = ref<{ title: string; totals: ScopeTotals; seriesCode: string } | null>(null);
/** 优化任务数据与状态 tab（概览点击可跳转列表对应状态） */
const optTasks = ref<OptTask[]>(QC_OPT_TASKS);
/* 品控-线上壳无标签配置菜单：切入线上态时若停留在该视图回退数据概览；优化任务线上为 0 条 */
watch(() => props.online, (v) => {
  if (v) { if (view.value === 'cfg') view.value = 'dashboard'; optTasks.value = []; }
  else optTasks.value = QC_OPT_TASKS;
}, { immediate: true });
const optStatusTab = ref<StatusTab>('all');
/** 创建优化任务弹层上下文（监控列表操作列 / 详情抽屉入口） */
const createCtx = ref<QcCenterSeries | null>(null);
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

const viewSeries = computed(() => (props.online ? onlineSeries() : QC_CENTER_SERIES)
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
        <span v-if="!online" class="qc-nav-ico">▦</span>
        <span class="qc-nav-text">数据概览</span>
      </div>
      <div
        class="qc-nav"
        :class="view === 'series' ? 'active' : ''"
        @click="view = 'series'; draft = { ...draft, q: '' }"
      >
        <span v-if="!online" class="qc-nav-ico">▤</span>
        <span class="qc-nav-text">监控列表</span>
      </div>
      <div
        class="qc-nav"
        :class="view === 'opt' ? 'active' : ''"
        @click="view = 'opt'"
      >
        <span v-if="!online" class="qc-nav-ico">⚑</span>
        <span class="qc-nav-text">优化任务</span>
      </div>
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
        :opt-tasks="optTasks"
        :online="online"
        :on-open-opt-status="(s: OptStatus) => { optStatusTab = s; view = 'opt'; }"
        :on-pick-type="(t: string) => {
          draft = { ...draft, type: t };
          applied = { ...applied, type: t };
          view = 'series';
        }"
        :on-open-code="(seriesCode: string, code: string) => {
          const s = (online ? onlineSeries() : QC_CENTER_SERIES).find((x) => x.seriesCode === seriesCode);
          if (s) detail = { series: s, code };
        }"
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
        :online="online"
      />
      <OptTaskView
        v-else-if="view === 'opt'"
        :tasks="optTasks"
        :set-tasks="(up: (ts: OptTask[]) => OptTask[]) => (optTasks = up(optTasks))"
        :status-tab="optStatusTab"
        :set-status-tab="(s: StatusTab) => (optStatusTab = s)"
      />
      <Qc2Config
        v-else
        :on-pick-label="pickTagLabel"
      />
      </div>
    </div>

    <QcSeriesDrawer
      v-if="detail"
      :key="`${detail.series.seriesCode}-${detail.code ?? 'all'}`"
      :series="detail.series"
      :initial-code="detail.code"
      :opt-tasks="optTasks.filter((t) => t.seriesCode === detail!.series.seriesCode)"
      :on-create-opt="() => (createCtx = detail!.series)"
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
