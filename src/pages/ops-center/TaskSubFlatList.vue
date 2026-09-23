<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { parentTasks, retrySub, cancelSub, confirmSub, rejectSub, ovShops, TC_TODAY, type ParentTask, type SubTask } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import SortTh from '../../components/SortTh.vue';
import TcStepsCell from './TcStepsCell.vue';
import { firstStepFailed, createPageOf, type CreatePageKey } from './tcSteps';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/* 列表字段管理：勾选+序号固定左、操作固定右；自适应宽表 sticky=false */
const cf = useColField('taskSub', {
  fixedLeft: [{ key: 'check' }, { key: 'index', label: '序号', width: 64 }],
  fields: [
    { key: 'product', label: '商品信息' },
    { key: 'taskType', label: '任务类型/状态' },
    { key: 'node', label: '节点状态' },
    { key: 'create', label: '创建信息' },
    { key: 'exec', label: '发布店铺/执行起止时间' },
  ],
  fixedRight: [{ key: 'actions', label: '操作' }],
  sticky: false,
});
const { midCols } = cf;

const platformOptions = ['全部', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店', '微信小店'];
const typeOptions = ['快速铺货', '商品铺货', '商品发布', '批量上架', '自动定价', '自动换图', '商品搬家', '自动下架'];
const shopOptions = ['全部', ...new Set([...ovShops.map((s) => s.shop), '首力茹愕小店', '真子名品'])];
/** 失败原因 chips（执行失败 tab）：参照版客户端 v1.0.3 词表 + 风险管控（校验管控商品节点命中） */
const failChips = ['全部', '发品受限', '价格异常', '母链接同步失败', '风控拦截', '风险管控', '材料缺失', '系列编码异常', '其它'];

/* ================= 按任务详情（一品一店一任务扁平列表） ================= */
interface FlatRow {
  sub: SubTask;
  parent: ParentTask;
}
const flatAll = computed<FlatRow[]>(() => parentTasks.flatMap((p) => p.subs.map((sub) => ({ sub, parent: p }))));

const subStatusText: Record<SubTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  success: '已完成',
  failed: '执行失败',
  confirm: '待确认',
  cancelled: '已取消',
};
const subStatusCls: Record<SubTask['status'], string> = {
  queued: 'queued',
  running: 'running',
  success: 'done',
  failed: 'failed',
  confirm: 'confirm',
  cancelled: 'cancelled',
};

interface FlatFilter {
  tab: string;
  chip: string;
  types: string[];
  linkId: string;
  shop: string;
  platform: string;
  creator: string;
  taskId: string;
  compete: string;
  retrying: string;
  start: string;
  end: string;
}
const defaultFlatFilter = (): FlatFilter => ({
  tab: 'all',
  chip: '全部',
  types: ['商品发布'],
  linkId: '',
  shop: '',
  platform: '',
  creator: '',
  taskId: '',
  compete: '',
  retrying: '',
  start: `${TC_TODAY} 00:00:00`,
  end: `${TC_TODAY} 23:59:59`,
});

const tab = ref('all');
const chip = ref('全部');
const types = ref<string[]>(['商品发布']);
const typesOpen = ref(false);
const linkId = ref('');
const shop = ref('');
const platform = ref('');
const creator = ref('');
const taskId = ref('');
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

/* 参照版 tabs：无计数下划线式（全部/队列中/执行中/已完成/执行失败） */
const tabs = [
  { key: 'all', text: '全部' },
  { key: 'queued', text: '队列中' },
  { key: 'running', text: '执行中' },
  { key: 'done', text: '已完成' },
  { key: 'failed', text: '执行失败' },
];

/* 任务类型多选：标签可逐个移除，下拉勾选切换 */
const toggleType = (t: string) => {
  types.value = types.value.includes(t) ? types.value.filter((v) => v !== t) : [...types.value, t];
};
const removeType = (t: string) => { types.value = types.value.filter((v) => v !== t); };

const snapshot = (nextTab: string, nextChip?: string): FlatFilter => ({
  tab: nextTab,
  chip: nextChip ?? chip.value,
  types: [...types.value],
  linkId: linkId.value.trim(),
  shop: shop.value,
  platform: platform.value,
  creator: creator.value.trim(),
  taskId: taskId.value.trim(),
  compete: compete.value.trim(),
  retrying: retrying.value,
  start: rangeStart.value.trim(),
  end: rangeEnd.value.trim(),
});
const onTab = (key: string) => {
  tab.value = key;
  /* 失败原因 chips 仅执行失败 tab 有效，切 tab 重置 */
  chip.value = '全部';
  applied.value = snapshot(key);
};
const onChip = (c: string) => {
  chip.value = c;
  applied.value = snapshot(tab.value, c);
};
const onSearch = () => { applied.value = snapshot(tab.value); };
const onReset = () => {
  const d = defaultFlatFilter();
  chip.value = '全部';
  types.value = [...d.types];
  linkId.value = '';
  shop.value = '';
  platform.value = '';
  creator.value = '';
  taskId.value = '';
  compete.value = '';
  retrying.value = '';
  rangeStart.value = d.start;
  rangeEnd.value = d.end;
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

/* 手动取消：队列中/执行中任务可取消执行 */
const cancelOne = (s: SubTask) => {
  cancelSub(s, 'manual');
  pushToast('任务已取消');
};

/* 待确认-通过/拒绝：二次确认弹窗（通过→下一步；拒绝→任务失败） */
const dlg = ref<{ sub: SubTask; kind: 'approve' | 'reject' } | null>(null);
const dlgText = computed(() =>
  (dlg.value?.kind === 'approve' ? '命中我司风险管控商品，请确认是否继续上架？' : '审核拒绝后发布任务失败，是否确认拒绝发布'));
const onDlgOk = () => {
  const d = dlg.value;
  if (!d) return;
  dlg.value = null;
  if (d.kind === 'approve') {
    confirmSub(d.sub);
    pushToast('已通过，任务进入下一步');
  } else {
    rejectSub(d.sub);
    pushToast('已拒绝，发布任务失败');
  }
};

const visible = computed(() => {
  const rows = flatAll.value.filter((r) => {
    const okTab =
      applied.value.tab === 'all' ||
      (applied.value.tab === 'done' ? r.sub.status === 'success' : applied.value.tab === 'failed' ? r.sub.status === 'failed' : r.sub.status === applied.value.tab);
    /* 失败原因 chips（仅执行失败 tab） */
    const okChip = applied.value.tab !== 'failed' || applied.value.chip === '全部' || (r.sub.shops[0]?.reason || '其它') === applied.value.chip;
    const okTypes = !applied.value.types.length || applied.value.types.includes(r.parent.type);
    const okLinkId = !applied.value.linkId || r.sub.linkId.indexOf(applied.value.linkId) > -1;
    const okShop = !applied.value.shop || r.sub.shops[0]?.shop === applied.value.shop;
    const okPlatform = !applied.value.platform || r.sub.shops[0]?.platform === applied.value.platform;
    const okCreator = !applied.value.creator || r.parent.creator.indexOf(applied.value.creator) > -1;
    const okTaskId = !applied.value.taskId || String(r.sub.taskId).padStart(6, '0').indexOf(applied.value.taskId) > -1;
    const okCompete = !applied.value.compete || r.sub.linkId.indexOf(applied.value.compete) > -1;
    const okRetry = !applied.value.retrying || (applied.value.retrying === '是' ? !!r.sub.shops[0]?.retried : !r.sub.shops[0]?.retried);
    const okRange = (!applied.value.start || r.parent.createTime >= applied.value.start) && (!applied.value.end || r.parent.createTime <= applied.value.end);
    return okTab && okChip && okTypes && okLinkId && okShop && okPlatform && okCreator && okTaskId && okCompete && okRetry && okRange;
  });
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

/* 勾选批量重新发布：仅执行失败行可勾选 */
const checked = ref<string[]>([]);
const failedInPage = computed(() => paged.value.filter((r) => r.sub.status === 'failed'));
const allChecked = computed(() => failedInPage.value.length > 0 && failedInPage.value.every((r) => checked.value.includes(r.sub.taskId)));
const toggleAll = () => {
  checked.value = allChecked.value
    ? checked.value.filter((id) => !failedInPage.value.some((r) => r.sub.taskId === id))
    : [...new Set([...checked.value, ...failedInPage.value.map((r) => r.sub.taskId)])];
};
const toggleCheck = (s: SubTask) => {
  checked.value = checked.value.includes(s.taskId) ? checked.value.filter((v) => v !== s.taskId) : [...checked.value, s.taskId];
};
const batchRepub = () => {
  const rows = flatAll.value.filter((r) => r.sub.status === 'failed' && checked.value.includes(r.sub.taskId));
  if (!rows.length) { pushToast('请先勾选执行失败的任务'); return; }
  rows.forEach((r) => retrySub(r.sub));
  checked.value = [];
  pushToast(`已重新发布 ${rows.length} 个任务`);
};
watch([applied, pageSize, sortKey, sortDir], () => { page.value = 1; jumpVal.value = '1'; checked.value = []; });
watch(page, (v) => { jumpVal.value = String(v); });
watch(pageCount, (v) => { if (page.value > v) page.value = v; });
</script>

<template>
  <div class="tc-tabs">
    <button v-for="t in tabs" :key="t.key" class="tc-tab" :class="tab === t.key ? 'active' : ''" @click="onTab(t.key)">
      {{ t.text }}
    </button>
  </div>

  <div class="tc-filter">
    <div v-if="isFailed" class="tc-chips">
      <button v-for="c in failChips" :key="c" class="tc-chip" :class="chip === c ? 'active' : ''" @click="onChip(c)">
        {{ c }}
      </button>
    </div>
    <div class="sg-grid">
      <div class="sg-field">
        <label>创建时间</label>
        <DateRangePicker :from="rangeDateFrom" :to="rangeDateTo" @update:from="onRangeDateFrom" @update:to="onRangeDateTo" placeholder="请选择日期范围" />
      </div>
      <div class="sg-field">
        <label>任务类型</label>
        <div class="tc-types">
          <button type="button" class="tc-types-trigger" @click="typesOpen = !typesOpen">
            <span v-if="!types.length" class="ph">任务类型</span>
            <span v-for="t in types" :key="t" class="tc-types-tag">{{ t }}<i title="移除" @click.stop="removeType(t)">×</i></span>
            <svg class="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <div v-if="typesOpen" class="tc-types-menu">
            <div v-for="o in typeOptions" :key="o" class="tc-types-opt" :class="types.includes(o) ? 'on' : ''" @click="toggleType(o)">
              <span class="tc-types-ck">{{ types.includes(o) ? '✓' : '' }}</span>{{ o }}
            </div>
          </div>
        </div>
      </div>
      <div class="sg-field">
        <label>链接商品ID</label>
        <input v-model="linkId" class="sg-input" placeholder="链接商品ID" />
      </div>
      <div class="sg-field">
        <label>发布店铺</label>
        <BubbleSelect class-name="sg-select" :value="shop || '发布店铺'" :options="shopOptions" @change="(v: string) => (shop = v === '全部' ? '' : v)" />
      </div>
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform || '发布平台'" :options="platformOptions" @change="(v: string) => (platform = v === '全部' ? '' : v)" />
      </div>
      <div class="sg-field">
        <label>创建人</label>
        <input v-model="creator" class="sg-input" placeholder="创建人" />
      </div>
      <div class="sg-field">
        <label>任务ID</label>
        <input v-model="taskId" class="sg-input" placeholder="任务ID" />
      </div>
      <div class="sg-field">
        <label>竞品链接</label>
        <input v-model="compete" class="sg-input" placeholder="竞品链接" />
      </div>
      <div class="sg-field">
        <label>是否重试中</label>
        <BubbleSelect class-name="sg-select" :value="retrying || '是否重试中'" :options="['全部', '是', '否']" @change="(v: string) => (retrying = v === '全部' ? '' : v)" />
      </div>
    </div>
    <div class="sg-actions">
      <div class="sg-mini" />
      <div class="sg-rightacts">
        <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
        <ColFieldPop :st="cf" />
        <button class="sg-btn primary" @click="batchRepub">
          批量重新发布
        </button>
        <button class="sg-btn" @click="onReset">
          重置
        </button>
        <button class="sg-btn primary" @click="onSearch">
          查询
        </button>
      </div>
    </div>
  </div>
  <div v-if="typesOpen" class="tc-types-mask" @click="typesOpen = false" />

  <div class="tc-table-card">
    <div class="tc-table-wrap">
      <table class="tc-table tc-detail">
        <thead>
          <tr>
            <th class="tc-check">
              <input type="checkbox" :checked="allChecked" @change="toggleAll" />
            </th>
            <th :style="{ width: '64px' }">序号</th>
            <template v-for="c in midCols" :key="c.key">
              <th v-if="c.key === 'create'" :style="{ width: '140px' }">
                <SortTh as="span" label="创建信息" :state="sortKey === 'create' ? sortDir : 'none'" @sort="onSort('create')" />
              </th>
              <SortTh v-else-if="c.key === 'exec'" label="发布店铺/执行起止时间" :state="sortKey === 'exec' ? sortDir : 'none'" @sort="onSort('exec')" />
              <th v-else>{{ c.label }}</th>
            </template>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in paged" :key="`${r.parent.id}-${r.sub.taskId}`">
            <td class="tc-check">
              <input type="checkbox" :disabled="r.sub.status !== 'failed'" :checked="checked.includes(r.sub.taskId)" @change="toggleCheck(r.sub)" />
            </td>
            <td>{{ pageNo + i + 1 }}</td>
            <template v-for="c in midCols" :key="c.key">
              <td v-if="c.key === 'product'">
                <div class="tc-product">
                  <img class="tc-thumb" :src="r.sub.thumb" />
                  <div>
                    <div class="tc-pname">{{ r.sub.name }}</div>
                    <template v-if="r.parent.type === '商品搬家'">
                      <div class="tc-pmeta">来源店铺：{{ r.sub.sourceShop || '–' }}</div>
                      <div class="tc-pmeta">来源商品ID：{{ r.sub.sourceProductId || '–' }}</div>
                    </template>
                    <template v-else-if="r.parent.type === '自动下架'">
                      <div class="tc-pmeta">店铺：{{ r.sub.sourceShop || '–' }}</div>
                      <div class="tc-pmeta">商品ID：{{ r.sub.sourceProductId || '–' }}</div>
                    </template>
                    <template v-else>
                      <div class="tc-pmeta">链接商品ID：{{ r.sub.linkId }}</div>
                    </template>
                    <div class="tc-pmeta">任务ID：{{ String(r.sub.taskId).padStart(6, '0') }}</div>
                  </div>
                </div>
              </td>
              <td v-else-if="c.key === 'taskType'">
                <div class="tc-cell-lines">
                  <div>{{ r.parent.type }}</div>
                  <div>
                    <span class="tc-st" :class="subStatusCls[r.sub.status]">
                      <i />
                      {{ subStatusText[r.sub.status] }}
                    </span>
                  </div>
                </div>
              </td>
              <td v-else-if="c.key === 'node'">
                <TcStepsCell :sub="r.sub" :type="r.parent.type" />
              </td>
              <td v-else-if="c.key === 'create'">
                <div class="tc-cell-lines">
                  <div>{{ r.parent.creator }}</div>
                  <div>{{ r.parent.createTime }}</div>
                </div>
              </td>
              <td v-else-if="c.key === 'exec'">
                <div class="tc-cell-lines">
                  <div>{{ r.sub.shops[0]?.shop ?? '–' }}</div>
                  <div>{{ r.sub.startTime ? `${r.sub.startTime} 至` : '–' }}</div>
                  <div>{{ r.sub.endTime || '–' }}</div>
                </div>
              </td>
            </template>
            <td class="actions-col">
              <a v-if="!firstStepFailed(r.sub, r.parent.type) && r.sub.status !== 'cancelled' && r.sub.status !== 'confirm'" class="tc-link" @click.prevent="goCreate(r.sub)">详情</a>
              <a v-if="r.sub.status === 'failed'" class="tc-link" @click.prevent="retryOne(r.sub)">重试</a>
              <a v-if="r.sub.status === 'queued' || r.sub.status === 'running'" class="tc-link" @click.prevent="cancelOne(r.sub)">取消</a>
              <template v-if="r.sub.status === 'confirm'">
                <a class="tc-link" @click.prevent="dlg = { sub: r.sub, kind: 'approve' }">通过</a>
                <a class="tc-link" @click.prevent="dlg = { sub: r.sub, kind: 'reject' }">拒绝</a>
              </template>
              <span v-if="(firstStepFailed(r.sub, r.parent.type) || r.sub.status === 'cancelled') && r.sub.status !== 'failed'" class="tc-dash">–</span>
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
