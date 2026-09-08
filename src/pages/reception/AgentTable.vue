<script setup lang="ts">
/* =========================================================
   聚合接待 · 视图①「宝妈接待」表格页（面包屑：基础数据 › 客服管理）
   多公司树形表：公司父行（可展开）→ 分组标签 → 成员子表
   筛选 / 分页（按公司行）/ 导出 / 转移会话
   ========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  RC_COMPANY, RC_COMPANIES, RC_COMPANY_GROUPS, RC_ALL_GROUPS,
  RC_GROUP_STRATEGY_INIT, RC_STRATEGIES,
  rcAgentLabel, rcCompanySumOf, rcCsvOf, rcDutyOf, rcHoursLabel, rcOrderOf, rcSalesLabel, rcTimeoutOf, rcTimelineOf, type RcAgent,
} from './data';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import MoreActions from '../../components/MoreActions.vue';
import CascadeSelect from '../../components/CascadeSelect.vue';
import SortTh from '../../components/SortTh.vue';
import RecordModal from './RecordModal.vue';
import RealtimeData from './RealtimeData.vue';
import RcMonChartModal, { type MonChartScope } from './RcMonChartModal.vue';

interface Props {
  agents: RcAgent[];
  setAgents: (v: RcAgent[]) => void;
  toggleAgentStrategy: (id: number) => void;
  pushToast: (msg: string, type?: 'success' | 'error') => void;
  /** 关联策略点击：跳转智能分流页并打开对应策略卡抽屉 */
  onGoStrategy: (cardId: number) => void;
}
const props = defineProps<Props>();

type Filter = { company: string; group: string; name: string; status: string };
const EMPTY_FILTER: Filter = { company: '', group: '', name: '', status: '' };

/** 子表可排序数值列 */
type SortKey = 'sessions' | 'aiRate' | 'resp' | 'unreplied' | 'r3m' | 'r30s' | 'hours' | 'rank' | 'conv' | 'sales' | 'refund';
const sortValOf = (a: RcAgent, k: SortKey): number => {
  switch (k) {
    case 'sessions': return a.human + a.ai;
    case 'aiRate': return aiRateOf(a.ai, a.human);
    case 'resp': return a.resp;
    case 'unreplied': return a.unreplied;
    case 'r3m': return a.r3m;
    case 'r30s': return a.r30s;
    case 'hours': return a.hours;
    case 'rank': return a.rank;
    case 'conv': return rcOrderOf(a).conv;
    case 'sales': return rcOrderOf(a).sales;
    case 'refund': return rcOrderOf(a).refund;
  }
};

const STATUS_CLS: Record<string, string> = { 在线: 'rc-st on', 小休: 'rc-st rest', 离线: 'rc-st off' };

/** AI 回复占比 = AI 回复数 ÷ 总会话数（人工+AI） */
function aiRateOf(ai: number, human: number) { return ai + human > 0 ? Math.round((ai / (ai + human)) * 100) : 0; }

const draft = ref<Filter>({ ...EMPTY_FILTER });
const applied = ref<Filter>({ ...EMPTY_FILTER });
const page = ref(1);
const pageSize = ref(10);
const sel = ref<Set<number>>(new Set());
/** 各公司行展开状态（默认展开宝妈） */
const openMap = ref<Record<string, boolean>>({ [RC_COMPANY]: true });
/** 各公司子表分组维度标签 */
const tabMap = ref<Record<string, string>>({});
/** 分组级策略总开关（key: 公司::分组；关闭后组内客服不可开启） */
const initGroupStrategy = () => {
  const m: Record<string, boolean> = {};
  RC_COMPANIES.forEach((c) => (RC_COMPANY_GROUPS[c] ?? []).forEach((g) => {
    m[`${c}::${g}`] = RC_GROUP_STRATEGY_INIT[g] ?? true;
  }));
  return m;
};
const groupStrategy = ref<Record<string, boolean>>(initGroupStrategy());
/** 子表「接待状态」列头筛选菜单 */
const statusMenu = ref(false);
/** 子表列头排序（默认降序，再点切换升/降） */
const sortKey = ref<SortKey | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: SortKey) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortIco = (k: SortKey): 'none' | 'asc' | 'desc' => (sortKey.value === k ? sortDir.value : 'none');

const transfer = ref<{ mode: 'single'; agent: RcAgent } | { mode: 'batch' } | null>(null);
/** 转移目标：组（组内在线均摊） 或 组内成员（单选） */
const pick = ref<{ kind: 'group'; group: string } | { kind: 'agent'; id: number } | null>(null);
/** 转移目标搜索关键字（按成员名过滤分组区块） */
const transferKw = ref('');
/** 值班监控弹窗：操作列入口=单人块；分组头入口=当前分组内全员堆叠（全部 tab=公司全员） */
type MonState = { kind: 'agent'; agent: RcAgent } | { kind: 'group'; company: string; group: string };
const monitor = ref<MonState | null>(null);
/** 接待记录弹窗（操作列第一位入口，预选该客服定位） */
const recordAgent = ref<RcAgent | null>(null);
/** 接待记录弹窗公司级入口（公司行：分组/客服默认全部） */
const recordCompany = ref<string | null>(null);
/** 内容区主 tab：绩效指标（本页）/ 实时数据（实时指标列表） */
const mainTab = ref<'kpi' | 'rt'>('kpi');
/** 实时监控图表弹窗：公司行 / 分组头 / 客服行三维度入口 */
const monChart = ref<MonChartScope | null>(null);
/** 分组头入口：全部 tab 下等同公司维度 */
const openGroupChart = (c: string) => {
  const g = tabMap.value[c] ?? 'all';
  monChart.value = g === 'all' ? { kind: 'company', company: c } : { kind: 'group', company: c, group: g };
};
const openGroupMon = (c: string) => { monitor.value = { kind: 'group', company: c, group: tabMap.value[c] ?? 'all' }; };
/** 值班监控抽屉查询条件：分组/客服两级级联多选（值=客服叶子集，组行✓=整组全选，空选=不限）+ 名称关键字；查询按钮生效（每次开抽屉重置） */
const monSel = ref<string[]>([]);
const monKw = ref('');
/** 已提交的查询口径（monPersons 依此统计） */
const monQuery = ref<{ sel: string[]; kw: string }>({ sel: [], kw: '' });
/** 组内客服名（入口公司口径） */
const monAgentsOfGroup = (g: string) => {
  const m = monitor.value;
  if (!m) return [] as string[];
  /* 单人态公司挂在 agent 上，分组态在顶层：先归一再过滤 */
  const company = m.kind === 'agent' ? m.agent.company : m.company;
  return props.agents.filter((a) => a.company === company && a.group === g).map((a) => a.name);
};
watch(monitor, (m) => {
  const g = m?.kind === 'group' && m.group !== 'all' ? m.group : '';
  monSel.value = g ? monAgentsOfGroup(g) : [];
  monKw.value = '';
  monQuery.value = { sel: [...monSel.value], kw: '' };
});
/** 级联分组：入口公司下属各组为左列、组内客服名为右列 */
const monCascGroups = computed(() => {
  const m = monitor.value;
  if (!m || m.kind === 'agent') return [] as { name: string; children: string[] }[];
  return (RC_COMPANY_GROUPS[m.company] ?? []).map((g) => ({ name: g, children: monAgentsOfGroup(g) }));
});
const doMonQuery = () => {
  monQuery.value = { sel: [...monSel.value], kw: monKw.value.trim() };
};
/** 多人态（分组入口）：显示查询行与逐人头部 */
const monIsGroup = computed(() => monitor.value?.kind === 'group');
const monPersons = computed<RcAgent[]>(() => {
  const m = monitor.value;
  if (!m) return [];
  if (m.kind === 'agent') return [m.agent];
  const q = monQuery.value;
  const selSet = new Set(q.sel);
  return props.agents.filter((a) => a.company === m.company
    && (!selSet.size || selSet.has(a.name))
    && (!q.kw || a.name.includes(q.kw)));
});
const monSub = computed(() => {
  const m = monitor.value;
  if (!m) return '';
  if (m.kind === 'agent') return `${m.agent.name}（${m.agent.group}） · ID: ${m.agent.id}`;
  /* 整组全选的组折叠回显组名；部分勾选不入副标题 */
  const q = monQuery.value;
  const full = monCascGroups.value.filter((g) => g.children.length > 0 && g.children.every((c) => q.sel.includes(c))).map((g) => g.name);
  return full.length ? `${m.company} · ${full.join('、')}` : m.company;
});
const monStatsOf = (a: RcAgent) => {
  const m = rcDutyOf(a);
  return [
    { label: '在线时长', value: m.online, color: 'var(--color-success)' },
    { label: '小休时长', value: m.rest, color: 'var(--color-warning)' },
    { label: '离线时长', value: m.offline, color: 'var(--color-text-4)' },
    { label: '登录时长', value: m.login, color: 'var(--color-success)' },
    { label: '登出时长', value: m.logout, color: 'var(--color-text-4)' },
    { label: 'WS在线时长', value: m.wsOn, color: 'var(--color-success)' },
    { label: 'WS离线时长', value: m.wsOff, color: 'var(--color-text-4)' },
  ];
};
/** 三条时间线：值班/登录/WS（登录 lane 的 in/out 映射 on/off 色类） */
const MON_LANES = [
  { key: 'duty', title: '值班状态', legend: [{ cls: 'on', label: '在线' }, { cls: 'off', label: '离线' }, { cls: 'rest', label: '小休' }] },
  { key: 'login', title: '登录状态', legend: [{ cls: 'on', label: '登录' }, { cls: 'off', label: '登出' }] },
  { key: 'ws', title: 'WS状态', legend: [{ cls: 'on', label: '在线' }, { cls: 'off', label: '离线' }] },
] as const;
const monLanesOf = (a: RcAgent) => {
  const t = rcTimelineOf(a);
  return MON_LANES.map((l) => ({
    ...l,
    segs: t[l.key].map((s) => ({ ...s, cls: s.cls === 'in' ? 'on' : s.cls === 'out' ? 'off' : s.cls })),
  }));
};
const MON_AXIS = ['0:00', '4:00', '8:00', '12:00', '16:00', '20:00', '23:00'];

const filtered = computed(() => props.agents.filter((a) => {
  if (applied.value.company !== '' && a.company !== applied.value.company) return false;
  if (applied.value.group !== '' && a.group !== applied.value.group) return false;
  if (applied.value.name !== '' && !a.name.includes(applied.value.name)) return false;
  if (applied.value.status !== '' && a.status !== applied.value.status) return false;
  return true;
}));

/* 外层公司行（公司筛选后），分页按公司行数 */
const companies = computed(() => RC_COMPANIES.filter((c) => applied.value.company === '' || c === applied.value.company));
const pages = computed(() => Math.max(1, Math.ceil(companies.value.length / pageSize.value)));
const safePage = computed(() => Math.min(page.value, pages.value));
const pageCompanies = computed(() => companies.value.slice((safePage.value - 1) * pageSize.value, safePage.value * pageSize.value));

/** 展开子表行：本公司 + 分组标签 + 名称/状态筛选 */
const rowsOf = (c: string) => {
  const tab = tabMap.value[c] ?? 'all';
  return filtered.value.filter((a) => a.company === c && (tab === 'all' || a.group === tab));
};
/** 子表排序后行 */
const sortedRowsOf = (c: string) => {
  const rowsRaw = rowsOf(c);
  const k = sortKey.value;
  return k
    ? [...rowsRaw].sort((x, y) => (sortDir.value === 'desc'
      ? sortValOf(y, k) - sortValOf(x, k)
      : sortValOf(x, k) - sortValOf(y, k)))
    : rowsRaw;
};

const idsOf = (list: RcAgent[]) => list.map((a) => a.id);
const toggleIds = (ids: number[]) => {
  const next = new Set(sel.value);
  const all = ids.length > 0 && ids.every((id) => next.has(id));
  ids.forEach((id) => (all ? next.delete(id) : next.add(id)));
  sel.value = next;
};
const toggleOne = (id: number) => {
  const next = new Set(sel.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  sel.value = next;
};

/** 分组级策略总开关：关闭后组内客服统一停用且不可开启（个人设置保留，开启后恢复） */
const toggleGroupStrategy = (c: string, tab: string) => {
  const key = `${c}::${tab}`;
  const next = !groupStrategy.value[key];
  groupStrategy.value = { ...groupStrategy.value, [key]: next };
  props.pushToast(`已${next ? '启用' : '禁用'}「${tab}」的策略状态${next ? '，组内客服策略已恢复' : '，组内客服已同步停用'}`);
};

const openTransfer = (t: typeof transfer.value) => {
  pick.value = null;
  transferKw.value = '';
  trfActive.value = '';
  transfer.value = t;
};

/** Esc：关闭转移会话 / 值班监控 / 接待记录弹窗 */
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') { transfer.value = null; monitor.value = null; recordAgent.value = null; recordCompany.value = null; }
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

/* ---------- 导出 / 批量分流 ---------- */
const doExport = () => {
  if (!filtered.value.length) { props.pushToast('暂无数据可导出', 'error'); return; }
  const blob = new Blob([rcCsvOf(filtered.value)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '宝妈接待-客服数据.csv';
  link.click();
  URL.revokeObjectURL(url);
  props.pushToast(`已导出 ${filtered.value.length} 条数据`);
};
const doBatchRoute = () => {
  if (sel.value.size === 0) { props.pushToast('请先勾选需要批量转移会话的客服', 'error'); return; }
  openTransfer({ mode: 'batch' });
};

/* ---------- 转移会话确认 ---------- */
const confirmTransfer = () => {
  if (!transfer.value) return;
  const t = transfer.value;
  if (!pick.value) { props.pushToast('请选择转移客服', 'error'); return; }
  const sources = t.mode === 'single' ? [t.agent] : props.agents.filter((a) => sel.value.has(a.id));
  const n = sources.reduce((t2, a) => t2 + a.unreplied, 0);
  if (n === 0) { props.pushToast('暂无会话可转移', 'error'); return; }
  const pk = pick.value;
  const targetName = pk.kind === 'group' ? pk.group : (props.agents.find((a) => a.id === pk.id)?.name ?? '');
  props.setAgents(props.agents.map((a) => (sources.some((s) => s.id === a.id) ? { ...a, unreplied: 0 } : a)));
  props.pushToast(`已将 ${n} 个会话转移给「${targetName}」`);
  transfer.value = null;
  if (t.mode === 'batch') sel.value = new Set();
};

/* ---------- 操作列：竖排直出（接待记录/实时监控/转移会话/关联策略/值班监控） ---------- */
interface Op { label: string; kind: 'btn' | 'link'; cls?: string; onClick: () => void }
const opsOf = (a: RcAgent): Op[] => {
  const relOk = (groupStrategy.value[`${a.company}::${a.group}`] ?? true) && a.strategy && RC_STRATEGIES.some((s) => s.group === a.group);
  const ops: Op[] = [
    { label: '接待记录', kind: 'link', onClick: () => { recordAgent.value = a; } },
    { label: '实时监控', kind: 'link', onClick: () => { monChart.value = { kind: 'agent', company: a.company, group: a.group, name: a.name, id: a.id }; } },
    { label: '转移会话', kind: 'btn', onClick: () => openTransfer({ mode: 'single', agent: a }) },
  ];
  if (relOk) ops.push({
    label: '关联策略', kind: 'link',
    onClick: () => { const rel = RC_STRATEGIES.find((s) => s.group === a.group); if (rel) props.onGoStrategy(rel.id); },
  });
  ops.push({ label: '值班监控', kind: 'link', cls: 'rc-op-mon', onClick: () => { monitor.value = { kind: 'agent', agent: a }; } });
  return ops;
};
/* 操作列规范：直出最多 3 个动作，超出项收进「更多」气泡 */
const flatOps = (a: RcAgent) => opsOf(a).slice(0, 3);
const moreOps = (a: RcAgent) => opsOf(a).slice(3).map((o) => ({ label: o.label, onClick: o.onClick }));

/* ---------- 转移弹窗目标数据 ----------
   离线/小休客服无法承接业务，不进入可选目标；源客服禁选 */
const cascGroups = computed(() => RC_COMPANIES.flatMap((c) => (RC_COMPANY_GROUPS[c] ?? []).map((g) => ({ c, g }))));
/** 转移源：单人=该客服；批量=勾选集 */
const transferSources = computed<RcAgent[]>(() => {
  const t = transfer.value;
  if (!t) return [];
  return t.mode === 'single' ? [t.agent] : props.agents.filter((a) => sel.value.has(a.id));
});
const sourceIds = computed(() => new Set(transferSources.value.map((a) => a.id)));
const batchUnreplied = computed(() => transferSources.value.reduce((s, a) => s + a.unreplied, 0));
/** 目标客服分组区块：直接过滤非在线客服，左列仅含有在线成员的组；搜索按成员名过滤 */
const transferSections = computed(() => {
  const k = transferKw.value.trim();
  return cascGroups.value.map(({ c, g }) => {
    const members = props.agents
      .filter((a) => a.company === c && a.group === g && a.status === '在线' && (!k || a.name.includes(k)))
      .map((a) => ({ a, selectable: !sourceIds.value.has(a.id) }));
    return { key: `${c}::${g}`, group: g, members, onlineCount: members.filter((m) => m.selectable).length, pickable: members.some((m) => m.selectable) };
  }).filter((s) => s.members.length > 0);
});
/** 右列当前展示组：跟随左列点击；搜索过滤后不在结果中则回落首组 */
const trfActive = ref('');
const activeSec = computed(() => transferSections.value.find((s) => s.group === trfActive.value) ?? transferSections.value[0] ?? null);
/** 左列组行：切换右列成员 + 单选该组（组内在线均摊），再点取消；无可选成员组不可选 */
const pickGroupSec = (sec: (typeof transferSections.value)[number]) => {
  trfActive.value = sec.group;
  if (!sec.pickable) return;
  pick.value = pick.value?.kind === 'group' && pick.value.group === sec.group ? null : { kind: 'group', group: sec.group };
};

const STATUS_MENU_OPTS = [{ v: '', t: '全部' }, { v: '在线', t: '在线' }, { v: '小休', t: '小休' }, { v: '离线', t: '离线' }];
</script>

<template>
  <div class="rc-view">
    <!-- 内容区主 tab：绩效指标（当前页）/ 实时数据 -->
    <div class="rc-main-tabs">
      <button type="button" :class="{ active: mainTab === 'kpi' }" @click="mainTab = 'kpi'">绩效指标</button>
      <button type="button" :class="{ active: mainTab === 'rt' }" @click="mainTab = 'rt'">实时数据</button>
    </div>

    <!-- 筛选区（独立白卡，与列表卡以灰色间隙分隔） -->
    <div v-show="mainTab === 'kpi'" class="qc-body rc-filter-card">
      <div class="qc-filters rc-filter-row">
        <BubbleSelect
          class-name="input rc-bs"
          :value="draft.company || '公司'"
          :options="[...RC_COMPANIES]"
          @change="(v: string) => (draft.company = v)"
        />
        <BubbleSelect
          class-name="input rc-bs"
          :value="draft.group || '分组'"
          :options="[...RC_ALL_GROUPS]"
          @change="(v: string) => (draft.group = v)"
        />
        <input
          v-model="draft.name"
          class="input rc-input"
          placeholder="请输入客服名称"
          @keydown.enter="applied = { ...draft }; page = 1"
        />
        <BubbleSelect
          class-name="input rc-bs"
          :value="draft.status || '接待状态'"
          :options="['在线', '小休', '离线']"
          @change="(v: string) => (draft.status = v)"
        />
        <div class="rc-actions">
          <button type="button" class="btn primary" @click="applied = { ...draft }; page = 1">查询</button>
          <button type="button" class="btn" @click="draft = { ...EMPTY_FILTER }; applied = { ...EMPTY_FILTER }; page = 1; props.pushToast('筛选条件已重置')">重置</button>
          <button type="button" class="btn" @click="doExport">导出</button>
          <button type="button" class="btn" @click="doBatchRoute">批量转移会话</button>
        </div>
      </div>
    </div>

    <!-- 列表区（独立白卡）：树形表格 + 分页 -->
    <div v-show="mainTab === 'kpi'" class="qc-body rc-table-card">
      <!-- 树形表格：公司父行 × N -->
      <div class="rc-wide">
        <table class="table rc-tree">
          <thead>
            <tr>
              <th class="check" />
              <th>所属公司</th>
              <th>接待会话数</th>
              <th>接待数据(条)</th>
              <th>AI回复平均占比</th>
              <th>平均均响</th>
              <th>未回复</th>
              <th>3分钟平均回复率</th>
              <th>30秒平均响应率</th>
              <th>平均转化率</th>
              <th>销售额</th>
              <th>平均退款率</th>
              <th>平均在线时长</th>
              <th>接待排名</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="c in pageCompanies" :key="c">
              <tr class="rc-row-company">
                <td class="check">
                  <span
                    class="rc-caret"
                    :class="{ open: !!openMap[c] }"
                    title="展开/收起"
                    @click="openMap = { ...openMap, [c]: !openMap[c] }"
                  >▾</span>
                  <input
                    type="checkbox"
                    :title="`全选/空${c}客服`"
                    :checked="idsOf(filtered.filter((a) => a.company === c)).length > 0 && idsOf(filtered.filter((a) => a.company === c)).every((id) => sel.has(id))"
                    @change="toggleIds(idsOf(filtered.filter((a) => a.company === c)))"
                  />
                </td>
                <td><b>{{ c }}</b></td>
                <td>{{ rcCompanySumOf(c, filtered).human + rcCompanySumOf(c, filtered).ai }}</td>
                <td>
                  <div class="rc-duo"><span class="tag green rc-tagw">人工</span>{{ rcCompanySumOf(c, filtered).human }}</div>
                  <div class="rc-duo"><span class="tag orange rc-tagw">AI</span>{{ rcCompanySumOf(c, filtered).ai }}</div>
                </td>
                <td>{{ aiRateOf(rcCompanySumOf(c, filtered).ai, rcCompanySumOf(c, filtered).human) }}%</td>
                <td>{{ rcCompanySumOf(c, filtered).resp }}s</td>
                <td>{{ rcCompanySumOf(c, filtered).unreplied }}</td>
                <td>{{ rcCompanySumOf(c, filtered).r3m }}%</td>
                <td>{{ rcCompanySumOf(c, filtered).r30s }}%</td>
                <td>{{ rcCompanySumOf(c, filtered).conv }}%</td>
                <td>{{ rcSalesLabel(rcCompanySumOf(c, filtered).sales) }}</td>
                <td>{{ rcCompanySumOf(c, filtered).refund }}%</td>
                <td>{{ rcCompanySumOf(c, filtered).hours }}</td>
                <td>{{ rcCompanySumOf(c, filtered).rank }}</td>
                <td>
                  <div class="rc-ops">
                    <a class="rc-rel-link" @click="recordCompany = c">接待记录</a>
                    <a class="rc-rel-link" @click="monChart = { kind: 'company', company: c }">实时监控</a>
                  </div>
                </td>
              </tr>
              <tr v-if="openMap[c]" class="expand-row">
                <td colspan="15">
                  <div class="rc-expand-head">
                    <div class="qc-range-toggle rc-group-tabs">
                      <button
                        type="button"
                        :class="{ active: (tabMap[c] ?? 'all') === 'all' }"
                        @click="tabMap = { ...tabMap, [c]: 'all' }"
                      >全部</button>
                      <button
                        v-for="g in (RC_COMPANY_GROUPS[c] ?? [])"
                        :key="g"
                        type="button"
                        :class="{ active: tabMap[c] === g }"
                        @click="tabMap = { ...tabMap, [c]: g }"
                      >{{ g }}</button>
                    </div>
                    <div class="rc-head-right">
                      <div v-if="(tabMap[c] ?? 'all') !== 'all'" class="rc-group-strategy">
                        <span>策略状态</span>
                        <span
                          class="rc-switch"
                          :class="{ on: groupStrategy[`${c}::${tabMap[c]}`] }"
                          :title="`启用/禁用${tabMap[c]}策略`"
                          @click="toggleGroupStrategy(c, tabMap[c] ?? 'all')"
                        ><i /></span>
                      </div>
                      <button type="button" class="btn" @click="openGroupChart(c)">实时监控</button>
                      <button type="button" class="btn" @click="openGroupMon(c)">值班监控</button>
                    </div>
                  </div>
                  <table class="matrix rc-sub">
                    <thead>
                      <tr>
                        <th class="check">
                          <input
                            type="checkbox"
                            title="全选子表"
                            :checked="sortedRowsOf(c).length > 0 && sortedRowsOf(c).every((a) => sel.has(a.id))"
                            :ref="(el) => { if (el) (el as HTMLInputElement).indeterminate = sortedRowsOf(c).length > 0 && !sortedRowsOf(c).every((a) => sel.has(a.id)) && sortedRowsOf(c).some((a) => sel.has(a.id)); }"
                            @change="toggleIds(idsOf(sortedRowsOf(c)))"
                          />
                        </th>
                        <th>客服</th>
                        <th class="rc-th-st">
                          接待状态
                          <span
                            class="rc-col-filter"
                            :class="{ on: !!applied.status }"
                            title="筛选接待状态"
                            @click="statusMenu = !statusMenu"
                          >
                            <svg viewBox="0 0 1024 1024" width="12" height="12" aria-hidden="true">
                              <path fill="currentColor" d="M880 128H144c-13.3 0-20 16-10.7 25.4L416 448v320c0 12.7 10.3 23 23 23h146c12.7 0 23-10.3 23-23V448l282.7-294.6C900 144 893.3 128 880 128z" />
                            </svg>
                          </span>
                          <template v-if="statusMenu">
                            <div class="rc-col-mask" @click="statusMenu = false" />
                            <div class="rc-col-menu">
                              <div
                                v-for="o in STATUS_MENU_OPTS"
                                :key="o.t"
                                class="rc-col-opt"
                                :class="{ cur: applied.status === o.v }"
                                @click="draft = { ...draft, status: o.v }; applied = { ...applied, status: o.v }; page = 1; statusMenu = false"
                              >{{ o.t }}</div>
                            </div>
                          </template>
                        </th>
                        <SortTh label="接待会话数" :state="sortIco('sessions')" @sort="toggleSort('sessions')" />
                        <th>接待数据(条)</th>
                        <SortTh label="AI回复占比" :state="sortIco('aiRate')" @sort="toggleSort('aiRate')" />
                        <SortTh label="均响" :state="sortIco('resp')" @sort="toggleSort('resp')" />
                        <SortTh label="未回复" :state="sortIco('unreplied')" @sort="toggleSort('unreplied')" />
                        <th>三分钟回复数据(条)</th>
                        <SortTh label="3分钟回复率" :state="sortIco('r3m')" @sort="toggleSort('r3m')" />
                        <SortTh label="30秒响应率" :state="sortIco('r30s')" @sort="toggleSort('r30s')" />
                        <SortTh label="转化率" :state="sortIco('conv')" @sort="toggleSort('conv')" />
                        <SortTh label="销售额" :state="sortIco('sales')" @sort="toggleSort('sales')" />
                        <SortTh label="退款率" :state="sortIco('refund')" @sort="toggleSort('refund')" />
                        <SortTh label="在线时长(h)" :state="sortIco('hours')" @sort="toggleSort('hours')" />
                        <SortTh label="接待排名" :state="sortIco('rank')" @sort="toggleSort('rank')" />
                        <th>策略状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="a in sortedRowsOf(c)" :key="a.id" class="rc-row-agent">
                        <td class="check">
                          <input type="checkbox" :checked="sel.has(a.id)" @change="toggleOne(a.id)" />
                        </td>
                        <td>{{ a.name }}</td>
                        <td><span :class="STATUS_CLS[a.status]">{{ a.status }}</span></td>
                        <td>{{ a.human + a.ai }}</td>
                        <td>
                          <div class="rc-duo"><span class="tag green rc-tagw">人工</span>{{ a.human }}</div>
                          <div class="rc-duo"><span class="tag orange rc-tagw">AI</span>{{ a.ai }}</div>
                        </td>
                        <td>{{ aiRateOf(a.ai, a.human) }}%</td>
                        <td>{{ a.resp }}s</td>
                        <td>{{ a.unreplied }}</td>
                        <td>
                          <div class="rc-duo"><span class="tag green rc-tagw">未回复</span>{{ a.unreplied }}</div>
                          <div class="rc-duo"><span class="tag orange rc-tagw">超时</span>{{ rcTimeoutOf(a) }}</div>
                        </td>
                        <td>{{ a.r3m }}%</td>
                        <td>{{ a.r30s }}%</td>
                        <td>{{ rcOrderOf(a).conv }}%</td>
                        <td>{{ rcSalesLabel(rcOrderOf(a).sales) }}</td>
                        <td>{{ rcOrderOf(a).refund }}%</td>
                        <td>{{ rcHoursLabel(a) }}</td>
                        <td>{{ a.rank }}</td>
                        <td>
                          <span
                            class="rc-switch"
                            :class="(groupStrategy[`${a.company}::${a.group}`] ?? true) ? (a.strategy ? 'on' : '') : 'disabled'"
                            :title="(groupStrategy[`${a.company}::${a.group}`] ?? true) ? '启用/禁用策略' : '分组策略已关闭，请先开启分组策略状态'"
                            @click="() => {
                              if (!(groupStrategy[`${a.company}::${a.group}`] ?? true)) {
                                props.pushToast('该分组策略已关闭，请先开启分组策略状态', 'error');
                                return;
                              }
                              props.toggleAgentStrategy(a.id);
                            }"
                          ><i /></span>
                        </td>
                        <td>
                          <div class="rc-ops">
                            <template v-for="o in flatOps(a)" :key="o.label">
                              <button v-if="o.kind === 'btn'" type="button" class="rc-btn-manual" @click="o.onClick()">{{ o.label }}</button>
                              <a v-else class="rc-rel-link" :class="o.cls ?? ''" @click="o.onClick()">{{ o.label }}</a>
                            </template>
                            <MoreActions v-if="moreOps(a).length" :items="moreOps(a)" />
                          </div>
                        </td>
                      </tr>
                      <tr v-if="sortedRowsOf(c).length === 0"><td colspan="18" class="rc-sub-empty">暂无数据</td></tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- 表尾：分页器（按公司行） -->
      <div class="rc-table-foot">
        <div class="rc-pager">
          <span class="rc-pg-total">共{{ companies.length }}条</span>
          <BubbleSelect
            class-name="select rc-pg-size"
            :value="String(pageSize)"
            :options="[
              { value: '10', label: '10条/页' },
              { value: '20', label: '20条/页' },
              { value: '50', label: '50条/页' },
            ]"
            @change="(v: string) => { pageSize = Number(v); page = 1; }"
          />
          <button type="button" class="rc-pg-btn" :disabled="safePage <= 1" @click="page = Math.max(1, page - 1)">‹</button>
          <button
            v-for="p in pages"
            :key="p"
            type="button"
            class="rc-pg-btn"
            :class="{ cur: p === safePage }"
            @click="page = p"
          >{{ p }}</button>
          <button type="button" class="rc-pg-btn" :disabled="safePage >= pages" @click="page = Math.min(pages, page + 1)">›</button>
          <span class="rc-pg-jump">
            前往
            <input
              :key="`${safePage}-${companies.length}-${pageSize}`"
              :value="safePage"
              @keydown.enter="(e: KeyboardEvent) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (Number.isFinite(v)) page = Math.min(pages, Math.max(1, Math.round(v)));
              }"
            />
            页
          </span>
        </div>
      </div>
    </div>

    <!-- ---------- 实时数据 tab（列表形式：筛选+统计 chip+评判着色+分页） ---------- -->
    <RealtimeData v-show="mainTab === 'rt'" :agents="props.agents" :push-toast="props.pushToast" />

    <!-- ---------- 转移会话弹窗（单人/批量）：源信息条 + 目标客服左右两栏单选（左分组/右在线成员，非在线直接过滤） ---------- -->
    <Modal
      v-if="transfer"
      title="转移会话"
      size="md"
      @close="transfer = null"
    >
      <div class="rc-trf-src">
        <template v-if="transfer.mode === 'single'">
          <span class="rc-trf-ava">{{ transfer.agent.name[0] }}</span>
          <b>{{ rcAgentLabel(transfer.agent) }}</b>
          <i>未回复会话 {{ transfer.agent.unreplied }} 个</i>
        </template>
        <template v-else>
          <b>已选 {{ sel.size }} 名客服（批量转移）</b>
          <i>未回复会话共 {{ batchUnreplied }} 个</i>
        </template>
      </div>
      <div class="input-icon rc-trf-search">
        <span class="ic">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input v-model="transferKw" class="input" placeholder="搜索目标客服" />
      </div>
      <div class="rc-trf-list">
        <div class="rc-trf-col left">
          <div
            v-for="sec in transferSections"
            :key="sec.key"
            class="rc-trf-row rc-trf-group"
            :class="{ on: pick?.kind === 'group' && pick.group === sec.group, active: activeSec?.key === sec.key, dim: !sec.pickable }"
            :title="sec.pickable ? '转移给该分组（组内在线客服均摊）' : '该组在线客服仅为源本人'"
            @click="pickGroupSec(sec)"
          >
            <span class="rc-trf-gname">{{ sec.group }}</span>
            <span class="rc-trf-count">在线 {{ sec.onlineCount }}</span>
            <span class="rc-trf-check">{{ pick?.kind === 'group' && pick.group === sec.group ? '✓' : '' }}</span>
          </div>
          <div v-if="transferSections.length === 0" class="rc-trf-empty">无匹配客服</div>
        </div>
        <div class="rc-trf-col right">
          <template v-if="activeSec">
            <div
              v-for="m in activeSec.members"
              :key="m.a.id"
              class="rc-trf-row rc-trf-member"
              :class="{ on: pick?.kind === 'agent' && pick.id === m.a.id, disabled: !m.selectable }"
              :title="m.selectable ? `转移给 ${m.a.name}` : '源客服不可承接'"
              @click="m.selectable && (pick = (pick?.kind === 'agent' && pick.id === m.a.id) ? null : { kind: 'agent', id: m.a.id })"
            >
              <span class="rc-trf-ava sm">{{ m.a.name[0] }}</span>
              <span class="rc-trf-name">{{ m.a.name }}</span>
              <span v-if="sourceIds.has(m.a.id)" class="rc-trf-srctag">源</span>
              <span class="rc-trf-check">{{ pick?.kind === 'agent' && pick.id === m.a.id ? '✓' : '' }}</span>
            </div>
            <div v-if="activeSec.members.length === 0" class="rc-trf-empty">无在线客服</div>
          </template>
        </div>
      </div>
      <template #foot>
        <button type="button" class="btn" @click="transfer = null">取消</button>
        <button type="button" class="btn primary" :disabled="!pick" @click="confirmTransfer">确定转移</button>
      </template>
    </Modal>

    <!-- ---------- 接待记录弹窗（大：三维度筛选 + 三栏客服/会话/聊天） ---------- -->
    <RecordModal
      v-if="recordAgent || recordCompany"
      :agent="recordAgent ?? undefined"
      :company="recordCompany ?? undefined"
      @close="recordAgent = null; recordCompany = null"
    />

    <!-- ---------- 实时监控图表弹窗（公司/分组/客服三维度入口） ---------- -->
    <RcMonChartModal v-if="monChart" :scope="monChart" @close="monChart = null" />

    <!-- ---------- 值班监控抽屉（分组维度下拉 + 客服搜索显隐；左时长指标 + 右 24h 时间线） ---------- -->
    <div v-if="monitor" class="rc-mon-mask" @click="monitor = null" />
    <aside v-if="monitor" class="rc-mon-drawer">
      <div class="rc-mon-head">
        <div>
          <b>值班监控</b>
          <span class="rc-mon-sub">{{ monSub }}</span>
        </div>
        <button type="button" class="rc-mon-x" title="关闭" @click="monitor = null">✕</button>
      </div>
      <div class="rc-mon-body">
        <div v-if="monIsGroup" class="rc-mon-tools">
          <!-- 分组/客服合并为单个级联条件：左列分组（✓整组全选）/右列客服，全部行=清除 -->
          <CascadeSelect
            class-name="rc-mon-sel"
            :groups="monCascGroups"
            multiple
            :values="monSel"
            all-label="全部"
            searchable
            @multi-change="(v: string[]) => (monSel = v)"
          />
          <div class="rc-mon-kwwrap">
            <input v-model="monKw" class="rc-mon-search" placeholder="搜索客服名称" @keydown.enter="doMonQuery" />
            <!-- 清除 icon 复用知识库实心灰圆×：有值才显，点击清空并立即重查 -->
            <button v-if="monKw" type="button" class="rc-mon-clear" title="清除" @click="monKw = ''; doMonQuery()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </div>
          <button type="button" class="btn primary" @click="doMonQuery">查询</button>
        </div>
        <div class="rc-duty-list">
          <div v-for="a in monPersons" :key="a.id" class="rc-duty-person">
            <!-- 单人态身份已在副标题呈现，仅堆叠多人时逐人重复头部 -->
            <div v-if="monIsGroup" class="rc-duty-person-hd">{{ a.name }}（{{ a.group }}） · ID: {{ a.id }}</div>
            <div class="rc-duty">
              <div class="rc-duty-stats">
                <div v-for="s in monStatsOf(a)" :key="s.label" class="rc-duty-stat">
                  <i :style="{ background: s.color }" />
                  <span class="k">{{ s.label }}</span>
                  <b>{{ s.value.toFixed(2) }}h</b>
                </div>
              </div>
              <div class="rc-duty-tl">
                <div v-for="lane in monLanesOf(a)" :key="lane.key" class="rc-duty-lane">
                  <div class="rc-duty-tl-head">
                    <span class="t">{{ lane.title }}</span>
                    <span class="rc-duty-legend">
                      <span v-for="lg in lane.legend" :key="lg.cls + lg.label"><i :class="lg.cls" />{{ lg.label }}</span>
                    </span>
                  </div>
                  <div class="rc-duty-bar">
                    <span
                      v-for="(s, i) in lane.segs"
                      :key="i"
                      class="rc-duty-seg"
                      :class="s.cls"
                      :style="{ left: (s.from / 24) * 100 + '%', width: ((s.to - s.from) / 24) * 100 + '%' }"
                    />
                  </div>
                  <div class="rc-duty-axis">
                    <span v-for="t in MON_AXIS" :key="t">{{ t }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="monIsGroup && monPersons.length === 0" class="rc-mon-empty">暂无匹配的客服</div>
        </div>
      </div>
      <div class="rc-mon-foot">
        <button type="button" class="btn" @click="monitor = null">关闭</button>
      </div>
    </aside>
  </div>
</template>
