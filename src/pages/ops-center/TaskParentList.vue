<script setup lang="ts">
import { computed, ref } from 'vue';
import { parentTasks, typeColor, type ParentTask } from './data';
import { mvTaskNameOf } from './moveData';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import TcRange from './TcRange.vue';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

const emit = defineEmits<{ (e: 'detail', p: ParentTask): void }>();

/* 列表字段管理：序号固定左、操作固定右；自适应宽表 sticky=false */
const cf = useColField('taskParent', {
  fixedLeft: [{ key: 'index', label: '序号', width: 64 }],
  fields: [
    { key: 'creator', label: '创建人/创建时间' },
    { key: 'type', label: '任务类型' },
    { key: 'status', label: '任务状态' },
    { key: 'publish', label: '发布信息' },
    { key: 'exec', label: '执行信息' },
    { key: 'execTime', label: '执行起止时间' },
  ],
  fixedRight: [{ key: 'actions', label: '操作' }],
  sticky: false,
});
const { midCols } = cf;
/* 选定具体类型后类型列冗余隐藏（全部态恢复） */
const shownCols = computed(() => (applied.value.type ? midCols.value.filter((c) => c.key !== 'type') : midCols.value));
/* 列宽定值（fixed 布局）：宽度不随 tab 切换的内容变化，占比按内容需要分配 */
const COL_W: Record<string, string> = { creator: '160px', type: '120px', status: '140px', publish: '200px', exec: '160px', execTime: '200px' };

const platformOptions = ['全部', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];
/** 类型行（下划线+括号计数）：不含「全部」，全部项单独置首 */
const PARENT_TYPES = ['快速铺货', '批量铺货', '商品发布', '批量调价', '批量涨价', '批量下架', '自动搬家', '自动下架', '自动发布'];
const pubWayOptions = ['全部', '插件发布', '蜂联发布'];

const parentStatusText: Record<ParentTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  done: '已完成',
};
/** 状态行（胶囊）固定顺序：仅列当前类型实际存在的状态 */
const STATUS_ORDER: ParentTask['status'][] = ['queued', 'running', 'done'];

/* 任务状态：圆环占比 + 中心数字 */
const RING_C = 2 * Math.PI * 15;
const ringPct = (p: ParentTask) => {
  /* 闭环口径：分母=全部子任务（含待确认/队列中），分子=已终结子任务，避免进行中批次显示满环 */
  const total = p.subs.length;
  const done = p.subs.filter((s) => s.status === 'success' || s.status === 'failed').length;
  return total > 0 ? Math.round((done / total) * 100) : 0;
};

/* ================= 父任务列表（一级页） ================= */
interface ListFilter {
  tab: string;
  platform: string;
  creator: string;
  type: string;
  shop: string;
  pubWay: string;
  linkId: string;
  taskId: string;
  mvId: string;
  retrying: string;
}
const defaultListFilter: ListFilter = { tab: 'all', platform: '全部', creator: '', type: '', shop: '', pubWay: '全部', linkId: '', taskId: '', mvId: '', retrying: '' };

const tab = ref('all');
const platform = ref('全部');
const creator = ref('');
const type = ref('');
const shop = ref('');
const pubWay = ref('全部');
const linkId = ref('');
const taskId = ref('');
const mvId = ref('');
const retrying = ref('');
const applied = ref<ListFilter>({ ...defaultListFilter });

/* 条件匹配：skip 用于计数口径（类型行计数忽略类型、状态行选项忽略状态），与按任务详情同范式 */
const passCond = (p: ParentTask, f: ListFilter, skip: 'type' | 'status' | null): boolean => {
  const okStatus = skip === 'status' || f.tab === 'all' || p.status === f.tab;
  const okType = skip === 'type' || !f.type || p.type === f.type;
  const okPlatform = f.platform === '全部' || p.subs.some((s) => s.shops.some((x) => x.platform === f.platform));
  const okCreator = !f.creator || p.creator.indexOf(f.creator) > -1;
  const okShop = !f.shop || p.subs.some((s) => s.shops.some((x) => x.shop.indexOf(f.shop) > -1));
  const okPubWay = f.pubWay === '全部' || p.pubWay === f.pubWay;
  /* 批次维度按「含任一子任务命中」判定，与按任务详情同字段同口径 */
  const okLinkId = !f.linkId || p.subs.some((s) => s.linkId.indexOf(f.linkId) > -1);
  const okTaskId = !f.taskId || p.subs.some((s) => String(s.taskId).padStart(6, '0').indexOf(f.taskId) > -1);
  /* 自动化任务为批次自身字段（自动化三类型溯源）：按展示口径匹配任务名称子串，兼容 at-xx 任务ID */
  const okMvId = !f.mvId || mvTaskNameOf(p.mvId).indexOf(f.mvId) > -1 || (p.mvId ?? '').indexOf(f.mvId) > -1;
  const okRetry = !f.retrying
    || (f.retrying === '是'
      ? p.subs.some((s) => s.shops.some((x) => x.retried))
      : p.subs.every((s) => s.shops.every((x) => !x.retried)));
  return okStatus && okType && okPlatform && okCreator && okShop && okPubWay && okLinkId && okTaskId && okMvId && okRetry;
};

const typeCountRows = computed(() => parentTasks.filter((p) => passCond(p, applied.value, 'type')));
const typeCounts = computed(() => {
  const m: Record<string, number> = {};
  for (const p of typeCountRows.value) m[p.type] = (m[p.type] ?? 0) + 1;
  return m;
});
const allCount = computed(() => typeCountRows.value.length);
/** 状态行：固定全枚举，不随类型收敛（与详情视图同规则） */
const statusOpts = STATUS_ORDER;
/* 是否重试中：仅全部状态存在（重试只发生在失败任务上，批次维度无失败状态） */
const showRetryFilter = computed(() => tab.value === 'all');

const snapshot = (nextTab: string): ListFilter => ({
  tab: nextTab,
  platform: platform.value,
  creator: creator.value.trim(),
  type: type.value,
  shop: shop.value.trim(),
  pubWay: pubWay.value,
  linkId: linkId.value.trim(),
  taskId: taskId.value.trim(),
  mvId: mvId.value.trim(),
  retrying: retrying.value,
});
const onType = (t: string) => {
  type.value = t;
  /* 状态行固定全枚举：切类型保留已选状态，组合无数据时列表空态即可 */
  applied.value = snapshot(tab.value);
};
const onTab = (key: string) => {
  tab.value = key;
  /* 是否重试中字段切走后隐藏，隐藏条件须一并清空以免继续过滤列表 */
  if (key !== 'all') retrying.value = '';
  applied.value = snapshot(key);
};
const onSearch = () => { applied.value = snapshot(tab.value); };
const onReset = () => {
  platform.value = '全部';
  creator.value = '';
  type.value = '';
  shop.value = '';
  pubWay.value = '全部';
  linkId.value = '';
  taskId.value = '';
  mvId.value = '';
  retrying.value = '';
  tab.value = 'all';
  applied.value = { ...defaultListFilter };
};

/* 排序状态：单列激活，点击循环 desc → asc → 取消 */
const sortKey = ref<'creator' | 'execTime' | ''>('');
const sortDir = ref<'none' | 'asc' | 'desc'>('none');
const onSort = (k: 'creator' | 'execTime') => {
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
const sortState = (k: string) => (sortKey.value === k ? sortDir.value : 'none');
/* 起止时间去年份（与按任务详情同口径）：仅显 MM-DD HH:mm:ss */
const shortTime = (t: string) => (t ? t.slice(5) : t);

const visible = computed(() => {
  const rows = parentTasks.filter((p) => passCond(p, applied.value, null));
  /* 创建人列按创建时间排序；执行起止时间列按开始时间排序 */
  const k = sortKey.value;
  if (k && sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    const val = (p: ParentTask) => (k === 'creator' ? p.createTime : p.startTime);
    return [...rows].sort((a, b) => val(a).localeCompare(val(b)) * dir);
  }
  return rows;
});
</script>

<template>
  <div class="tc-segwrap">
    <div class="tc-typerow">
      <button type="button" class="tc-typeitem" :class="applied.type === '' ? 'active' : ''" @click="onType('')">
        全部({{ allCount }})
      </button>
      <button
        v-for="t in PARENT_TYPES"
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
        :key="s"
        type="button"
        class="tc-statuspill"
        :class="applied.tab === s ? 'active' : ''"
        @click="onTab(s)"
      >
        {{ parentStatusText[s] }}
      </button>
    </div>
  </div>

  <div class="tc-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform" :options="platformOptions" @change="(v: string) => (platform = v)" />
      </div>
      <div class="sg-field">
        <label>创建人</label>
        <span class="sg-inputwrap">
          <input v-model="creator" class="sg-input" placeholder="请输入创建人" />
          <button v-if="creator" type="button" class="sg-clear" title="清除" @click="creator = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>创建时间</label>
        <TcRange />
      </div>
      <div class="sg-field">
        <label>发布店铺名称</label>
        <span class="sg-inputwrap">
          <input v-model="shop" class="sg-input" placeholder="请输入发布店铺名称" />
          <button v-if="shop" type="button" class="sg-clear" title="清除" @click="shop = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>发布方式</label>
        <BubbleSelect class-name="sg-select" :value="pubWay" :options="pubWayOptions" @change="(v: string) => (pubWay = v)" />
      </div>
      <div class="sg-field">
        <label>链接商品ID</label>
        <span class="sg-inputwrap">
          <input v-model="linkId" class="sg-input" placeholder="请输入链接商品ID" />
          <button v-if="linkId" type="button" class="sg-clear" title="清除" @click="linkId = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>任务ID</label>
        <span class="sg-inputwrap">
          <input v-model="taskId" class="sg-input" placeholder="请输入任务ID" />
          <button v-if="taskId" type="button" class="sg-clear" title="清除" @click="taskId = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div class="sg-field">
        <label>自动化任务</label>
        <span class="sg-inputwrap">
          <input v-model="mvId" class="sg-input" placeholder="请输入自动化任务" />
          <button v-if="mvId" type="button" class="sg-clear" title="清除" @click="mvId = ''; onSearch()">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
      </div>
      <div v-if="showRetryFilter" class="sg-field">
        <label>是否重试中</label>
        <BubbleSelect class-name="sg-select" :value="retrying || '全部'" :options="['全部', '是', '否']" @change="(v: string) => (retrying = v === '全部' ? '' : v)" />
      </div>
      <div class="sg-actions">
        <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
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

  <div class="tc-table-card">
    <div class="tc-table-wrap">
      <table class="tc-table tc-list">
        <thead>
          <tr>
            <th :style="{ width: '64px' }">序号</th>
            <template v-for="c in shownCols" :key="c.key">
              <SortTh v-if="c.key === 'creator' || c.key === 'execTime'" :label="c.label" :width="COL_W[c.key]" :state="sortState(c.key)" @sort="onSort(c.key as 'creator' | 'execTime')" />
              <th v-else :style="{ width: COL_W[c.key] }">{{ c.label }}</th>
            </template>
            <th :style="{ width: '100px' }">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id">
            <td>{{ parentTasks.indexOf(p) + 1 }}</td>
            <template v-for="c in shownCols" :key="c.key">
              <td v-if="c.key === 'creator'">
                <div class="tc-cell-lines">
                  <div>{{ p.creator }}</div>
                  <div>{{ p.createTime }}</div>
                </div>
              </td>
              <td v-else-if="c.key === 'type'">
                <span class="tc-type-tag" :style="{ background: `${typeColor(p.type)}1a`, color: typeColor(p.type) }">{{ p.type }}</span>
              </td>
              <td v-else-if="c.key === 'status'">
                <span class="tc-ring-cell">
                  <span class="tc-ring-wrap">
                    <svg class="tc-ring" width="36" height="36" viewBox="0 0 36 36">
                      <circle class="track" cx="18" cy="18" r="15" />
                      <circle
                        class="bar"
                        :class="p.status"
                        cx="18"
                        cy="18"
                        r="15"
                        :stroke-dasharray="`${(RING_C * ringPct(p)) / 100} ${RING_C}`"
                      />
                    </svg>
                    <b>{{ ringPct(p) }}%</b>
                  </span>
                  <span class="tc-ring-text">{{ parentStatusText[p.status] }}</span>
                </span>
              </td>
              <td v-else-if="c.key === 'publish'">
                <div class="tc-cell-lines">
                  <div>店铺数量：{{ p.shops }}</div>
                  <div>链接数量：{{ p.links }}</div>
                  <div>创建方式：{{ p.pubWay }}</div>
                </div>
              </td>
              <td v-else-if="c.key === 'exec'">
                <div class="tc-cell-lines">
                  <div><span class="k">任务成功</span>：{{ p.success }}</div>
                  <div><span class="k">任务失败</span>：{{ p.failed }}</div>
                  <div><span class="k">执行中</span>：{{ p.running }}</div>
                </div>
              </td>
              <td v-else-if="c.key === 'execTime'">
                <div class="tc-cell-lines">
                  <div>起：{{ shortTime(p.startTime) || '–' }}</div>
                  <div>止：{{ shortTime(p.endTime) || '–' }}</div>
                </div>
              </td>
            </template>
            <td class="actions-col">
              <a class="tc-link" @click="emit('detail', p)">
                查看详情
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
