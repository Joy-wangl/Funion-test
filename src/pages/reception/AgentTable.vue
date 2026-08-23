<script setup lang="ts">
/* =========================================================
   聚合接待 · 视图①「宝妈接待」表格页（面包屑：基础数据 › 客服管理）
   多公司树形表：公司父行（可展开）→ 分组标签 → 成员子表
   筛选 / 分页（按公司行）/ 导出 / 转移会话
   ========================================================= */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import {
  RC_COMPANY, RC_COMPANIES, RC_COMPANY_GROUPS, RC_ALL_GROUPS,
  RC_GROUP_STRATEGY_INIT, RC_STRATEGIES,
  rcAgentLabel, rcCompanySumOf, rcCsvOf, rcHoursLabel, rcMonitorOf, rcOrderOf, rcSalesLabel, rcTimeoutOf, type RcAgent,
} from './data';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import MoreActions from '../../components/MoreActions.vue';

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

/** 饼图扇形 path（起/止角为弧度） */
const piePath = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const x0 = (cx + r * Math.cos(a0)).toFixed(3);
  const y0 = (cy + r * Math.sin(a0)).toFixed(3);
  const x1 = (cx + r * Math.cos(a1)).toFixed(3);
  const y1 = (cy + r * Math.sin(a1)).toFixed(3);
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
};

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
const sortIco = (k: SortKey) => (sortKey.value === k ? (sortDir.value === 'desc' ? '↓' : '↑') : '⇅');

const transfer = ref<{ mode: 'single'; agent: RcAgent } | { mode: 'batch' } | null>(null);
/** 转移目标级联选择：组 或 组内成员（单选） */
const pick = ref<{ kind: 'group'; group: string } | { kind: 'agent'; id: number } | null>(null);
/** 级联：右栏当前预览的分组（默认第一组） */
const cascActive = ref<string>(RC_COMPANY_GROUPS[RC_COMPANY]?.[0] ?? '');
/** 值班监控弹窗（操作列点击） */
const monitor = ref<RcAgent | null>(null);
/** 值班监控饼图 tab：值班/登录/WS */
const monTab = ref<'duty' | 'login' | 'ws'>('duty');

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
  transfer.value = t;
};

/** Esc：关闭转移会话 / 值班监控弹窗 */
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') { transfer.value = null; monitor.value = null; }
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

/* ---------- 操作列：直出最多 3 个，超出收进「更多」气泡 ---------- */
interface Op { label: string; kind: 'btn' | 'link'; cls?: string; onClick: () => void }
const opsOf = (a: RcAgent): Op[] => {
  const relOk = (groupStrategy.value[`${a.company}::${a.group}`] ?? true) && a.strategy && RC_STRATEGIES.some((s) => s.group === a.group);
  const ops: Op[] = [
    { label: '转移会话', kind: 'btn', onClick: () => openTransfer({ mode: 'single', agent: a }) },
  ];
  if (relOk) ops.push({
    label: '关联策略', kind: 'link',
    onClick: () => { const rel = RC_STRATEGIES.find((s) => s.group === a.group); if (rel) props.onGoStrategy(rel.id); },
  });
  ops.push({ label: '值班监控', kind: 'link', cls: 'rc-op-mon', onClick: () => { monTab.value = 'duty'; monitor.value = a; } });
  return ops;
};
const directOpsOf = (a: RcAgent) => { const o = opsOf(a); return o.length > 3 ? o.slice(0, 3) : o; };
const moreOpsOf = (a: RcAgent) => { const o = opsOf(a); return o.length > 3 ? o.slice(3) : []; };

/* ---------- 转移弹窗级联数据 ----------
   离线/小休客服无法承接业务，不进入可转移目标（组计数与成员列表仅统计在线） */
const cascExcl = computed(() => {
  if (!transfer.value) return new Set<number>();
  return transfer.value.mode === 'single' ? new Set([transfer.value.agent.id]) : sel.value;
});
const cascGroups = computed(() => RC_COMPANIES.flatMap((c) => (RC_COMPANY_GROUPS[c] ?? []).map((g) => ({ c, g }))));
const cascCountOf = (c: string, g: string) => props.agents.filter((a) => a.company === c && a.group === g && a.status === '在线' && !cascExcl.value.has(a.id)).length;
const cascMembers = computed(() => props.agents.filter((a) => a.group === cascActive.value && a.status === '在线' && !cascExcl.value.has(a.id)));

/* ---------- 值班监控弹窗数据 ---------- */
const monInfo = computed(() => {
  if (!monitor.value) return null;
  const m = rcMonitorOf(monitor.value);
  const segs = monTab.value === 'duty' ? [
    { label: '在线', value: m.online, color: '#00b42a' },
    { label: '小休', value: m.rest, color: '#ff7d00' },
    { label: '离线', value: m.offline, color: '#c9cdd4' },
  ] : monTab.value === 'login' ? [
    { label: '登录', value: m.login, color: '#00b42a' },
    { label: '登出', value: m.logout, color: '#c9cdd4' },
  ] : [
    { label: '在线', value: m.wsOn, color: '#00b42a' },
    { label: '离线', value: m.wsOff, color: '#c9cdd4' },
  ];
  const total = segs.reduce((t, s) => t + s.value, 0) || 1;
  const live = segs.filter((s) => s.value > 0);
  let ang = -Math.PI / 2;
  const arcs = live.map((s) => {
    const a0 = ang;
    const a1 = ang + (s.value / total) * Math.PI * 2;
    ang = a1;
    return { ...s, a0, a1 };
  });
  const stats = [
    { label: '在线时长', value: m.online, color: '#00b42a' },
    { label: '小休时长', value: m.rest, color: '#ff7d00' },
    { label: '离线时长', value: m.offline, color: '#c9cdd4' },
    { label: '登录时长', value: m.login, color: '#00b42a' },
    { label: '登出时长', value: m.logout, color: '#c9cdd4' },
    { label: 'WS在线时长', value: m.wsOn, color: '#00b42a' },
    { label: 'WS离线时长', value: m.wsOff, color: '#c9cdd4' },
  ];
  return { segs, total, live, arcs, stats };
});

const STATUS_MENU_OPTS = [{ v: '', t: '全部' }, { v: '在线', t: '在线' }, { v: '小休', t: '小休' }, { v: '离线', t: '离线' }];
const MON_TABS = [{ k: 'duty', t: '值班状态' }, { k: 'login', t: '登录状态' }, { k: 'ws', t: 'WS状态' }] as const;
</script>

<template>
  <div class="rc-view">
    <div class="qc-body rc-table-card">
      <!-- 筛选区 -->
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
              </tr>
              <tr v-if="openMap[c]" class="expand-row">
                <td colspan="14">
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
                    <div v-if="(tabMap[c] ?? 'all') !== 'all'" class="rc-group-strategy">
                      <span>策略状态</span>
                      <span
                        class="rc-switch"
                        :class="{ on: groupStrategy[`${c}::${tabMap[c]}`] }"
                        :title="`启用/禁用${tabMap[c]}策略`"
                        @click="toggleGroupStrategy(c, tabMap[c] ?? 'all')"
                      ><i /></span>
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
                        <th class="rc-th-sort" :class="{ on: sortKey === 'sessions' }" @click="toggleSort('sessions')">接待会话数<span class="rc-sort-ico">{{ sortIco('sessions') }}</span></th>
                        <th>接待数据(条)</th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'aiRate' }" @click="toggleSort('aiRate')">AI回复占比<span class="rc-sort-ico">{{ sortIco('aiRate') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'resp' }" @click="toggleSort('resp')">均响<span class="rc-sort-ico">{{ sortIco('resp') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'unreplied' }" @click="toggleSort('unreplied')">未回复<span class="rc-sort-ico">{{ sortIco('unreplied') }}</span></th>
                        <th>三分钟回复数据(条)</th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'r3m' }" @click="toggleSort('r3m')">3分钟回复率<span class="rc-sort-ico">{{ sortIco('r3m') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'r30s' }" @click="toggleSort('r30s')">30秒响应率<span class="rc-sort-ico">{{ sortIco('r30s') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'conv' }" @click="toggleSort('conv')">转化率<span class="rc-sort-ico">{{ sortIco('conv') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'sales' }" @click="toggleSort('sales')">销售额<span class="rc-sort-ico">{{ sortIco('sales') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'refund' }" @click="toggleSort('refund')">退款率<span class="rc-sort-ico">{{ sortIco('refund') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'hours' }" @click="toggleSort('hours')">在线时长(h)<span class="rc-sort-ico">{{ sortIco('hours') }}</span></th>
                        <th class="rc-th-sort" :class="{ on: sortKey === 'rank' }" @click="toggleSort('rank')">接待排名<span class="rc-sort-ico">{{ sortIco('rank') }}</span></th>
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
                            <template v-for="o in directOpsOf(a)" :key="o.label">
                              <button v-if="o.kind === 'btn'" type="button" class="rc-btn-manual" @click="o.onClick()">{{ o.label }}</button>
                              <a v-else class="rc-rel-link" :class="o.cls ?? ''" @click="o.onClick()">{{ o.label }}</a>
                            </template>
                            <MoreActions v-if="moreOpsOf(a).length > 0" :items="moreOpsOf(a).map((o) => ({ label: o.label, onClick: o.onClick }))" />
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

    <!-- ---------- 转移会话弹窗（单人 / 批量） ---------- -->
    <Modal
      v-if="transfer"
      title="转移会话"
      size="lg"
      @close="transfer = null"
    >
      <div class="rc-form">
        <div class="f-row">
          <span class="f-label">目标客服：</span>
          <BubbleSelect
            v-if="transfer.mode === 'single'"
            class-name="select"
            disabled
            :value="rcAgentLabel(transfer.agent)"
            :options="[rcAgentLabel(transfer.agent)]"
          />
          <BubbleSelect
            v-else
            class-name="select"
            disabled
            :value="`已选 ${sel.size} 名客服（批量）`"
            :options="[`已选 ${sel.size} 名客服（批量）`]"
          />
        </div>
        <div class="f-row">
          <span class="f-label">转移客服：</span>
          <div class="rc-casc">
            <div class="rc-casc-col rc-casc-groups">
              <div
                v-for="{ c, g } in cascGroups"
                :key="`${c}::${g}`"
                class="rc-casc-g"
                :class="{ on: cascActive === g }"
                @click="cascActive = g"
              >
                <input
                  type="checkbox"
                  :checked="pick?.kind === 'group' && pick.group === g"
                  @change="pick = (pick?.kind === 'group' && pick.group === g) ? null : { kind: 'group', group: g }"
                />
                <span class="rc-casc-gname">{{ g }}</span>
                <span class="rc-casc-count">{{ cascCountOf(c, g) }}</span>
              </div>
            </div>
            <div class="rc-casc-col rc-casc-members">
              <div v-if="cascMembers.length === 0" class="empty tight">暂无在线成员</div>
              <template v-else>
                <label v-for="a in cascMembers" :key="a.id" class="rc-casc-m">
                  <input
                    type="checkbox"
                    :checked="pick?.kind === 'agent' && pick.id === a.id"
                    @change="pick = (pick?.kind === 'agent' && pick.id === a.id) ? null : { kind: 'agent', id: a.id }"
                  />
                  {{ a.name }}
                </label>
              </template>
            </div>
          </div>
        </div>
      </div>
      <template #foot>
        <button type="button" class="btn" @click="transfer = null">取消</button>
        <button type="button" class="btn primary" @click="confirmTransfer">确定转移</button>
      </template>
    </Modal>

    <!-- ---------- 值班监控弹窗（头部人员信息 + tab 切换饼图 + 右侧时长统计） ---------- -->
    <Modal
      v-if="monitor && monInfo"
      title="值班监控"
      :sub="`${monitor.name}（${monitor.group}） · ID: ${monitor.id}`"
      size="lg"
      @close="monitor = null"
    >
      <div class="rc-mon">
        <div class="rc-mon-tabs">
          <button
            v-for="t in MON_TABS"
            :key="t.k"
            type="button"
            class="rc-mon-tab"
            :class="{ on: monTab === t.k }"
            @click="monTab = t.k"
          >{{ t.t }}</button>
        </div>
        <div class="rc-mon-body">
          <div class="rc-mon-pie">
            <svg viewBox="0 0 200 200" width="190" height="190">
              <circle v-if="monInfo.live.length === 1" cx="100" cy="100" r="88" :fill="monInfo.live[0].color" />
              <template v-else><path v-for="s in monInfo.arcs" :key="s.label" :d="piePath(100, 100, 88, s.a0, s.a1)" :fill="s.color" /></template>
            </svg>
            <div class="rc-mon-legend">
              <div v-for="s in monInfo.segs" :key="s.label" class="rc-mon-lg">
                <i :style="{ background: s.color }" />
                <span>{{ s.label }}</span>
                <b>{{ s.value.toFixed(2) }}h</b>
                <em>{{ Math.round((s.value / monInfo.total) * 100) }}%</em>
              </div>
            </div>
          </div>
          <div class="rc-mon-stats">
            <div v-for="s in monInfo.stats" :key="s.label" class="rc-mon-stat">
              <i :style="{ background: s.color }" />
              <span>{{ s.label }}</span>
              <b>{{ s.value.toFixed(2) }}h</b>
            </div>
          </div>
        </div>
      </div>
      <template #foot>
        <button type="button" class="btn" @click="monitor = null">关闭</button>
      </template>
    </Modal>
  </div>
</template>
