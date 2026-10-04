<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { parentTasks, retrySub, confirmSub, rejectSub, TC_TODAY, PLATFORM_LOGO, failCatsOfType, failCatOf, typeColor, type ParentTask, type SubTask } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import SortTh from '../../components/SortTh.vue';
import TcNodeCell from './TcNodeCell.vue';
import { firstStepFailed, createPageOf, type CreatePageKey } from './tcSteps';
import { mvTaskNameOf } from './moveData';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/** 批次钻入复用：传 parent 时仅看该批次子任务（类型/发布方式恒定，对应筛选与列隐藏），交互与样式与详情列表完全同源 */
const props = defineProps<{ parent?: ParentTask }>();

/* 列表字段管理：勾选+序号固定左、操作固定右；自适应宽表 sticky=false */
const cf = useColField('taskSub', {
  fixedLeft: [{ key: 'check' }, { key: 'index', label: '序号', width: 64 }],
  fields: [
    { key: 'product', label: '商品信息' },
    { key: 'taskType', label: '任务类型' },
    { key: 'node', label: '节点状态' },
    { key: 'create', label: '发布信息' },
    { key: 'exec', label: '执行起止时间' },
  ],
  fixedRight: [{ key: 'actions', label: '操作' }],
  sticky: false,
});
const { midCols } = cf;
/* 列宽定值（fixed 布局）：宽度不随 tab 切换的内容变化，占比按内容需要分配 */
const COL_W: Record<string, string> = { product: '300px', taskType: '120px', node: '280px', create: '200px', exec: '200px' };
/* 状态行已由节点状态胶囊表达，本列仅余类型标签；选定具体类型后标签冗余，整列隐藏（与批次视图同规则） */
const shownCols = computed(() => (applied.value.type || props.parent ? midCols.value.filter((c) => c.key !== 'taskType') : midCols.value));

const platformOptions = ['全部', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店', '微信小店'];
const typeOptions = ['商品发布', '批量调价', '批量涨价', '批量下架', '自动搬家', '自动下架', '自动发布'];
/** 发布方式（与批次视图同枚举）：取所属批次的发布方式 */
const pubWayOptions = ['全部', '插件发布', '蜂联发布'];
/** 失败大类 chips（执行失败 tab）：按已应用的任务类型收敛词表，其它=兜底置最后 */
const failChips = computed(() => ['全部', ...failCatsOfType(props.parent?.type ?? applied.value.type)]);

/* ================= 按任务详情（一品一店一任务扁平列表） ================= */
interface FlatRow {
  sub: SubTask;
  parent: ParentTask;
}
const flatAll = computed<FlatRow[]>(() => props.parent
  ? props.parent.subs.map((sub) => ({ sub, parent: props.parent as ParentTask }))
  : parentTasks.flatMap((p) => p.subs.map((sub) => ({ sub, parent: p }))));

/* 执行起止时间：去年单位，仅保留月/日 时:分:秒 */
const shortTime = (t: string) => (t ? t.slice(5) : t);

interface FlatFilter {
  tab: string;
  chip: string;
  type: string;
  linkId: string;
  shop: string;
  platform: string;
  pubWay: string;
  creator: string;
  taskId: string;
  mvId: string;
  compete: string;
  retrying: string;
  start: string;
  end: string;
}
const defaultFlatFilter = (): FlatFilter => ({
  tab: 'all',
  chip: '全部',
  type: '',
  linkId: '',
  shop: '',
  platform: '',
  pubWay: '',
  creator: '',
  taskId: '',
  mvId: '',
  compete: '',
  retrying: '',
  start: `${TC_TODAY} 00:00:00`,
  end: `${TC_TODAY} 23:59:59`,
});

const tab = ref('all');
const chip = ref('全部');
const type = ref('');
const linkId = ref('');
const shop = ref('');
const platform = ref('');
const pubWay = ref('');
const creator = ref('');
const taskId = ref('');
const mvId = ref('');
const compete = ref('');
const retrying = ref('');
const rangeStart = ref(`${TC_TODAY} 00:00:00`);
const rangeEnd = ref(`${TC_TODAY} 23:59:59`);
// DateRangePicker 用纯日期，拼接时间部分
const rangeDateFrom = ref(TC_TODAY);
const rangeDateTo = ref(TC_TODAY);
const onRangeDateFrom = (v: string) => { rangeDateFrom.value = v; rangeStart.value = v ? `${v} 00:00:00` : ''; };
const onRangeDateTo = (v: string) => { rangeDateTo.value = v; rangeEnd.value = v ? `${v} 23:59:59` : ''; };
const applied = ref<FlatFilter>(defaultFlatFilter());

/* 结构（参照版客户端）：上方任务类型行（带计数）→ 下方该类型的状态行 → 条件 → 列表 */
const STATUS_ORDER: { key: SubTask['status']; text: string }[] = [
  { key: 'confirm', text: '待确认' },
  { key: 'queued', text: '队列中' },
  { key: 'running', text: '执行中' },
  { key: 'success', text: '已完成' },
  { key: 'failed', text: '执行失败' },
];
/* 条件匹配：skip 用于计数口径（类型行计数忽略类型、状态行选项忽略状态） */
const passCond = (r: FlatRow, f: FlatFilter, skip: 'type' | 'status' | null): boolean => {
  const okStatus = skip === 'status' || f.tab === 'all' || r.sub.status === f.tab;
  const okType = skip === 'type' || !f.type || r.parent.type === f.type;
  const okChip = f.tab !== 'failed' || f.chip === '全部' || failCatOf(r.sub) === f.chip;
  const okLinkId = !f.linkId || r.sub.linkId.indexOf(f.linkId) > -1;
  const okShop = !f.shop || (r.sub.shops[0]?.shop ?? '').indexOf(f.shop) > -1;
  const okPlatform = !f.platform || r.sub.shops[0]?.platform === f.platform;
  const okPubWay = !f.pubWay || r.parent.pubWay === f.pubWay;
  const okCreator = !f.creator || r.parent.creator.indexOf(f.creator) > -1;
  const okTaskId = !f.taskId || String(r.sub.taskId).padStart(6, '0').indexOf(f.taskId) > -1;
  /* 自动化任务条件按展示口径匹配：任务名称子串优先，兼容直接输入 at-xx 任务ID */
  const okMvId = !f.mvId || mvTaskNameOf(r.parent.mvId).indexOf(f.mvId) > -1 || (r.parent.mvId ?? '').indexOf(f.mvId) > -1;
  const okCompete = !f.compete || r.sub.linkId.indexOf(f.compete) > -1;
  const okRetry = !f.retrying || (f.retrying === '是' ? !!r.sub.shops[0]?.retried : !r.sub.shops[0]?.retried);
  const okRange = (!f.start || r.parent.createTime >= f.start) && (!f.end || r.parent.createTime <= f.end);
  return okStatus && okType && okChip && okLinkId && okShop && okPlatform && okPubWay && okCreator && okTaskId && okMvId && okCompete && okRetry && okRange;
};

/* 类型行计数忽略 chip 维度：失败原因 chips 为最底层筛选，选 chip 不反噬上层类型计数（避免计数跳变与页面抖动） */
const typeCountRows = computed(() => flatAll.value.filter((r) => passCond(r, { ...applied.value, chip: '全部' }, 'type')));
const typeCounts = computed(() => {
  const m: Record<string, number> = {};
  for (const r of typeCountRows.value) m[r.parent.type] = (m[r.parent.type] ?? 0) + 1;
  return m;
});
const allCount = computed(() => typeCountRows.value.length);
/* 失败原因 chips 计数（仅执行失败 tab 呈现）：分母忽略 chip 维度自身，与类型行计数同范式 */
const chipCountRows = computed(() => flatAll.value.filter((r) => passCond(r, { ...applied.value, chip: '全部' }, null)));
const chipCounts = computed(() => {
  const m: Record<string, number> = {};
  for (const r of chipCountRows.value) {
    const c = failCatOf(r.sub);
    m[c] = (m[c] ?? 0) + 1;
  }
  return m;
});
const chipAllCount = computed(() => chipCountRows.value.length);
/** 状态行：固定全枚举，不随类型收敛（切类型 tab 后执行状态维度恒在，避免「状态消失」观感） */
const statusOpts = STATUS_ORDER;

const snapshot = (nextTab: string, nextChip?: string): FlatFilter => ({
  tab: nextTab,
  chip: nextChip ?? chip.value,
  type: type.value,
  linkId: linkId.value.trim(),
  shop: shop.value.trim(),
  platform: platform.value,
  pubWay: pubWay.value,
  creator: creator.value.trim(),
  taskId: taskId.value.trim(),
  mvId: mvId.value.trim(),
  compete: compete.value.trim(),
  retrying: retrying.value,
  start: rangeStart.value.trim(),
  end: rangeEnd.value.trim(),
});
const onType = (t: string) => {
  type.value = t;
  /* 状态行固定全枚举：切类型保留已选状态，组合无数据时列表空态即可 */
  chip.value = '全部';
  applied.value = snapshot(tab.value);
};
const onTab = (key: string) => {
  tab.value = key;
  /* 失败原因 chips 仅执行失败 tab 有效，切 tab 重置 */
  chip.value = '全部';
  /* 是否重试中字段切走后隐藏，隐藏条件须一并清空以免继续过滤列表 */
  if (key !== 'all' && key !== 'failed') retrying.value = '';
  applied.value = snapshot(key);
};
const onChip = (c: string) => {
  chip.value = c;
  applied.value = snapshot(tab.value, c);
};
/* 是否重试中：仅全部/执行失败两个状态存在（重试只发生在失败任务上）；勾选即生效（与状态/chips 同即时口径），不等查询按钮 */
const showRetryFilter = computed(() => tab.value === 'all' || tab.value === 'failed');
const onRetrying = (v: string) => {
  retrying.value = v === '全部' ? '' : v;
  applied.value = { ...applied.value, retrying: retrying.value };
};
const onSearch = () => { applied.value = snapshot(tab.value); };
const onReset = () => {
  const d = defaultFlatFilter();
  chip.value = '全部';
  type.value = '';
  linkId.value = '';
  shop.value = '';
  platform.value = '';
  pubWay.value = '';
  creator.value = '';
  taskId.value = '';
  mvId.value = '';
  compete.value = '';
  retrying.value = '';
  rangeStart.value = d.start;
  rangeEnd.value = d.end;
  rangeDateFrom.value = TC_TODAY;
  rangeDateTo.value = TC_TODAY;
  tab.value = 'all';
  applied.value = d;
};
/* 单条重试：与个人商品库-关联发布任务抽屉同源联动 */
const retryOne = (s: SubTask) => {
  retrySub(s);
  pushToast('重试中…');
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
/* 详情：除首节点失败外的任务可跳商品创建（按发布店铺平台映射子页） */
const opsGo = inject<(target: CreatePageKey) => void>('opsGo');
const goCreate = (s: SubTask) => opsGo?.(createPageOf(s.shops[0]?.platform ?? '淘宝'));

/* 待确认-通过/拒绝：二次确认弹窗（通过→下一步；拒绝→任务失败）；subs 支持单条与批量共用 */
const dlg = ref<{ subs: SubTask[]; kind: 'approve' | 'reject' } | null>(null);
const dlgText = computed(() =>
  (dlg.value?.kind === 'approve' ? '命中我司风险管控商品，请确认是否继续上架？' : '审核拒绝后发布任务失败，是否确认拒绝发布'));
const onDlgOk = () => {
  const d = dlg.value;
  if (!d) return;
  dlg.value = null;
  if (d.kind === 'approve') {
    d.subs.forEach((s) => confirmSub(s));
    pushToast(`已通过 ${d.subs.length} 个任务，进入下一步`);
  } else {
    d.subs.forEach((s) => rejectSub(s));
    pushToast(`已拒绝 ${d.subs.length} 个任务，发布任务失败`);
  }
};

const visible = computed(() => {
  const rows = flatAll.value.filter((r) => passCond(r, applied.value, null));
  /* 创建时间 / 执行起止时间排序（SortTh：首点降序 → 再点升序 → 三击取消） */
  const k = sortKey.value;
  if (k && sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    const val = (r: FlatRow) => (k === 'create' ? r.parent.createTime : r.sub.startTime);
    return [...rows].sort((a, b) => val(a).localeCompare(val(b)) * dir);
  }
  return rows;
});

const isFailed = computed(() => tab.value === 'failed');

/* 排序状态：单列激活，点击循环 desc → asc → 取消 */
const sortKey = ref<'create' | 'exec' | ''>('');
const sortDir = ref<'none' | 'asc' | 'desc'>('none');
const onSort = (k: 'create' | 'exec') => {
  if (sortKey.value !== k) {
    sortKey.value = k;
    sortDir.value = 'desc';
  } else if (sortDir.value === 'desc') {
    sortDir.value = 'asc';
  } else if (sortDir.value === 'asc') {
    sortKey.value = '';
    sortDir.value = 'none';
  } else {
    sortDir.value = 'desc';
  }
};

/* 分页：项目统一 ib-pagination 模式（总条数/每页条数/页码/前往） */
const page = ref(1);
const pageSize = ref(50);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(visible.value.length / pageSize.value)));
const paged = computed(() => visible.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageNo = computed(() => (page.value - 1) * pageSize.value);
const pageSizeText = computed(() => `${pageSize.value}条/页`);
/* 页码窗口：当前页居中，最多 5 个 */
const pageList = computed(() => {
  const total = pageCount.value;
  const end = Math.min(total, Math.max(1, page.value - 2) + 4);
  const start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 50; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};

/* 批量勾选资格按行状态校验：仅执行失败/待确认可勾选（与当前状态 tab 无关）；其余行勾选列留空但保留 40px 列宽防抖动 */
const canCheck = (s: SubTask) => s.status === 'failed' || s.status === 'confirm';
const checked = ref<string[]>([]);
const selectableInPage = computed(() => paged.value.filter((r) => canCheck(r.sub)));
const allChecked = computed(() => selectableInPage.value.length > 0 && selectableInPage.value.every((r) => checked.value.includes(r.sub.taskId)));
const toggleAll = () => {
  checked.value = allChecked.value
    ? checked.value.filter((id) => !selectableInPage.value.some((r) => r.sub.taskId === id))
    : [...new Set([...checked.value, ...selectableInPage.value.map((r) => r.sub.taskId)])];
};
const toggleCheck = (s: SubTask) => {
  checked.value = checked.value.includes(s.taskId) ? checked.value.filter((v) => v !== s.taskId) : [...checked.value, s.taskId];
};
const checkedRows = (status: SubTask['status']) => flatAll.value.filter((r) => r.sub.status === status && checked.value.includes(r.sub.taskId));
const batchRepub = () => {
  const rows = checkedRows('failed');
  if (!rows.length) { pushToast('请先勾选执行失败的任务'); return; }
  rows.forEach((r) => retrySub(r.sub));
  checked.value = [];
  pushToast(`已重新发布 ${rows.length} 个任务`);
};
const batchApprove = () => {
  const rows = checkedRows('confirm');
  if (!rows.length) { pushToast('请先勾选待确认的任务'); return; }
  dlg.value = { subs: rows.map((r) => r.sub), kind: 'approve' };
};
const batchReject = () => {
  const rows = checkedRows('confirm');
  if (!rows.length) { pushToast('请先勾选待确认的任务'); return; }
  dlg.value = { subs: rows.map((r) => r.sub), kind: 'reject' };
};
/* 批量操作气泡：按钮锚定、外部 mousedown 关闭（同 ▦ 气泡）；选中项后关闭气泡再走对应动作 */
const batchPop = ref(false);
const closeBatchPop = () => { batchPop.value = false; };
watch(batchPop, (v) => {
  if (v) document.addEventListener('mousedown', closeBatchPop);
  else document.removeEventListener('mousedown', closeBatchPop);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', closeBatchPop));
/* 批量操作项随当前状态 tab 收敛：执行失败仅重试、待确认仅确认/拒绝、全部态三者并列；其余状态无批量能力则不显示入口。条数＝已勾选的对应状态任务数 */
const batchItems = computed<{ key: 'retry' | 'approve' | 'reject'; label: string }[]>(() => {
  const t = applied.value.tab;
  const items: { key: 'retry' | 'approve' | 'reject'; label: string }[] = [];
  if (t === 'all' || t === 'failed') items.push({ key: 'retry', label: `批量重试(${checkedRows('failed').length})` });
  if (t === 'all' || t === 'confirm') {
    const n = checkedRows('confirm').length;
    items.push({ key: 'approve', label: `批量确认(${n})` });
    items.push({ key: 'reject', label: `批量拒绝(${n})` });
  }
  return items;
});
const pickBatch = (key: 'retry' | 'approve' | 'reject') => {
  batchPop.value = false;
  if (key === 'retry') batchRepub();
  else if (key === 'approve') batchApprove();
  else batchReject();
};
watch([applied, pageSize, sortKey, sortDir], () => { page.value = 1; jumpVal.value = '1'; checked.value = []; });
watch(page, (v) => { jumpVal.value = String(v); });
watch(pageCount, (v) => { if (page.value > v) page.value = v; });
</script>

<template>
  <div class="tc-segwrap">
    <div v-if="!parent" class="tc-typerow">
      <button type="button" class="tc-typeitem" :class="applied.type === '' ? 'active' : ''" @click="onType('')">
        全部({{ allCount }})
      </button>
      <button
        v-for="t in typeOptions"
        :key="t"
        type="button"
        class="tc-typeitem"
        :class="applied.type === t ? 'active' : ''"
        @click="onType(t)"
      >
        {{ t }}({{ typeCounts[t] ?? 0 }})
      </button>
    </div>
    <div class="tc-statusrow">
      <button type="button" class="tc-statuspill" :class="applied.tab === 'all' ? 'active' : ''" @click="onTab('all')">全部</button>
      <button
        v-for="s in statusOpts"
        :key="s.key"
        type="button"
        class="tc-statuspill"
        :class="applied.tab === s.key ? 'active' : ''"
        @click="onTab(s.key)"
      >
        {{ s.text }}
      </button>
    </div>
  </div>

  <div class="tc-filter tc-filter-solo">
    <div class="sg-grid">
      <div class="sg-field">
        <label>创建时间</label>
        <DateRangePicker :from="rangeDateFrom" :to="rangeDateTo" @update:from="onRangeDateFrom" @update:to="onRangeDateTo" placeholder="请选择日期范围" />
      </div>
      <div class="sg-field">
        <label>链接商品ID</label>
        <span class="sg-inputwrap">
          <input v-model="linkId" class="sg-input" placeholder="链接商品ID" />
          <button v-if="linkId" type="button" class="sg-clear" title="清除" @click="linkId = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>发布店铺</label>
        <span class="sg-inputwrap">
          <input v-model="shop" class="sg-input" placeholder="请输入发布店铺名称" />
          <button v-if="shop" type="button" class="sg-clear" title="清除" @click="shop = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform || '发布平台'" :options="platformOptions" @change="(v: string) => (platform = v === '全部' ? '' : v)" />
      </div>
      <div v-if="!parent" class="sg-field">
        <label>发布方式</label>
        <BubbleSelect class-name="sg-select" :value="pubWay || '发布方式'" :options="pubWayOptions" @change="(v: string) => (pubWay = v === '全部' ? '' : v)" />
      </div>
      <div class="sg-field">
        <label>创建人</label>
        <span class="sg-inputwrap">
          <input v-model="creator" class="sg-input" placeholder="创建人" />
          <button v-if="creator" type="button" class="sg-clear" title="清除" @click="creator = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>任务ID</label>
        <span class="sg-inputwrap">
          <input v-model="taskId" class="sg-input" placeholder="任务ID" />
          <button v-if="taskId" type="button" class="sg-clear" title="清除" @click="taskId = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>自动化任务</label>
        <span class="sg-inputwrap">
          <input v-model="mvId" class="sg-input" placeholder="自动化任务" />
          <button v-if="mvId" type="button" class="sg-clear" title="清除" @click="mvId = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>竞品链接</label>
        <span class="sg-inputwrap">
          <input v-model="compete" class="sg-input" placeholder="竞品链接" />
          <button v-if="compete" type="button" class="sg-clear" title="清除" @click="compete = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div v-if="showRetryFilter" class="sg-field">
        <label>是否重试中</label>
        <BubbleSelect class-name="sg-select" :value="retrying || '是否重试中'" :options="['全部', '是', '否']" @change="onRetrying" />
      </div>
      <!-- 按钮组作为筛选网格最后一个子项嵌入（规范）：靠 grid 行距与条件行保持疏远，末排右对齐、与输入框底边对齐 -->
      <div class="sg-actions">
        <div class="sg-mini" />
        <div class="sg-rightacts">
          <!-- 批量操作：入口与菜单项均随状态 tab 收敛（无批量能力的状态不显示入口）；勾选资格按行状态校验（失败/待确认） -->
          <span v-if="batchItems.length" class="tc-batch-anchor">
            <button class="sg-btn" @mousedown.stop @click="batchPop = !batchPop">
              批量操作
            </button>
            <div v-if="batchPop" class="tc-batch-pop" @mousedown.stop>
              <div v-for="it in batchItems" :key="it.key" class="add-pop-item" @click="pickBatch(it.key)">
                {{ it.label }}
              </div>
            </div>
          </span>
          <!-- 列表字段管理 ▦ -->
          <ColFieldPop :st="cf" />
          <button class="sg-btn" @click="onReset">
            重置
          </button>
          <button class="sg-btn primary" @click="onSearch">
            查询
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="tc-table-card">
    <!-- 失败原因 chips（带计数）置于查询条件下方、列表上方：计数口径含已应用的查询条件 -->
    <div v-if="isFailed" class="tc-chips">
      <button v-for="c in failChips" :key="c" class="tc-chip" :class="chip === c ? 'active' : ''" @click="onChip(c)">
        {{ c }}({{ c === '全部' ? chipAllCount : chipCounts[c] ?? 0 }})
      </button>
    </div>
    <div class="tc-table-wrap">
      <table class="tc-table tc-detail">
        <thead>
          <tr>
            <th class="tc-check">
              <input v-if="selectableInPage.length" type="checkbox" :checked="allChecked" @change="toggleAll" />
            </th>
            <th :style="{ width: '64px' }">序号</th>
            <template v-for="c in shownCols" :key="c.key">
              <th v-if="c.key === 'create'" :style="{ width: COL_W[c.key] }">
                <SortTh as="span" label="发布信息" :state="sortKey === 'create' ? sortDir : 'none'" @sort="onSort('create')" />
              </th>
              <SortTh v-else-if="c.key === 'exec'" :width="COL_W[c.key]" label="执行起止时间" :state="sortKey === 'exec' ? sortDir : 'none'" @sort="onSort('exec')" />
              <th v-else :style="{ width: COL_W[c.key] }">{{ c.label }}</th>
            </template>
            <th :style="{ width: '100px' }">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in paged" :key="`${r.parent.id}-${r.sub.taskId}`">
            <td class="tc-check">
              <input v-if="canCheck(r.sub)" type="checkbox" :checked="checked.includes(r.sub.taskId)" @change="toggleCheck(r.sub)" />
            </td>
            <td>{{ pageNo + i + 1 }}</td>
            <template v-for="c in shownCols" :key="c.key">
              <td v-if="c.key === 'product'">
                <div class="tc-product">
                  <img class="tc-thumb" :src="r.sub.thumb" />
                  <div>
                    <div class="tc-pname" :title="r.sub.name">{{ r.sub.name }}</div>
                    <!-- 各类型统一口径：链接商品ID＋任务ID；自动化三类型追加自动化任务ID溯源（不展示来源信息） -->
                    <div class="tc-pmeta"><span class="tc-pmeta-k">链接商品ID：</span>{{ r.sub.linkId }}</div>
                    <div class="tc-pmeta"><span class="tc-pmeta-k">任务ID：</span>{{ String(r.sub.taskId).padStart(6, '0') }}</div>
                    <div v-if="r.parent.mvId" class="tc-pmeta"><span class="tc-pmeta-k">自动化任务：</span>{{ mvTaskNameOf(r.parent.mvId) }}</div>
                  </div>
                </div>
              </td>
              <td v-else-if="c.key === 'taskType'">
                <span class="tc-type-tag" :style="{ background: `${typeColor(r.parent.type)}1a`, color: typeColor(r.parent.type) }">{{ r.parent.type }}</span>
              </td>
              <td v-else-if="c.key === 'node'">
                <TcNodeCell :sub="r.sub" :type="r.parent.type" />
              </td>
              <td v-else-if="c.key === 'create'">
                <div class="tc-cell-lines">
                  <div>
                    <span class="tc-shop">
                      <img v-if="PLATFORM_LOGO[r.sub.shops[0]?.platform ?? '']" :src="PLATFORM_LOGO[r.sub.shops[0]?.platform ?? '']" :alt="r.sub.shops[0]?.platform" />
                      {{ r.sub.shops[0]?.shop ?? '–' }}
                    </span>
                  </div>
                  <div>{{ r.parent.creator }}</div>
                  <div>{{ r.parent.createTime }}</div>
                </div>
              </td>
              <td v-else-if="c.key === 'exec'">
                <div class="tc-cell-lines">
                  <div>开始：{{ shortTime(r.sub.startTime) || '–' }}</div>
                  <div>结束：{{ shortTime(r.sub.endTime) || '–' }}</div>
                </div>
              </td>
            </template>
            <td class="actions-col">
              <a v-if="!firstStepFailed(r.sub, r.parent.type) && r.sub.status !== 'confirm'" class="tc-link" @click.prevent="goCreate(r.sub)">详情</a>
              <a v-if="r.sub.status === 'failed'" class="tc-link" @click.prevent="retryOne(r.sub)">重试</a>
              <template v-if="r.sub.status === 'confirm'">
                <a class="tc-link" @click.prevent="dlg = { subs: [r.sub], kind: 'approve' }">通过</a>
                <a class="tc-link" @click.prevent="dlg = { subs: [r.sub], kind: 'reject' }">拒绝</a>
              </template>
              <span v-if="firstStepFailed(r.sub, r.parent.type) && r.sub.status !== 'failed'" class="tc-dash">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="ib-pagination">
      <div class="ib-pageinfo">共 {{ visible.length }} 条</div>
      <BubbleSelect class-name="ib-page-size" :value="pageSizeText" :options="['50条/页', '100条/页', '300条/页']" @change="(v: string) => onPageSize(v)" />
      <div class="ib-pages">
        <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
        <button v-for="n in pageList" :key="n" class="ib-pagebtn" :class="n === page ? 'active' : ''" @click="page = n">{{ n }}</button>
        <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
      </div>
      <div class="ib-jump">
        <span>前往</span>
        <input v-model="jumpVal" class="ib-jump-input" @keyup.enter="onJump" />
        <span>页</span>
      </div>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="dlg" class="tc-dlg-mask" @click.self="dlg = null">
      <div class="tc-dlg">
        <div class="tc-dlg-head">
          <b>风险提示</b>
          <button type="button" title="关闭" @click="dlg = null">✕</button>
        </div>
        <div class="tc-dlg-body">{{ dlgText }}</div>
        <div class="tc-dlg-foot">
          <button type="button" @click="dlg = null">取消</button>
          <button type="button" class="primary" @click="onDlgOk">确认</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
