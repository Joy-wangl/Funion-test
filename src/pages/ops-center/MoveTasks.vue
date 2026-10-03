<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import MoreActions from '../../components/MoreActions.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { MV_KINDS, MV_METHODS, MV_PLATFORMS, MV_EXEC_STATUSES, MV_TASK_STATUS_FILTERS, mvRunSummary, mvShopOf, mvTaskStatusDot, mvTaskStatusText, mvExecDot, type MvTask, type MvExecStatus } from './moveData';
import { PLATFORM_LOGO } from './data';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/** 列表字段管理：操作固定右；执行状态列仅「全部」chip 下出现（与 chip 同维度冗余隐藏），任务状态列常驻；窄表 sticky=false */
const cf = useColField('move', {
  fixedLeft: [],
  get fields() {
    const base = [
      { key: 'name', label: '任务信息', width: 300 },
      { key: 'kind', label: '任务类型', width: 120 },
      { key: 'taskStatus', label: '任务状态', width: 110 },
    ];
    const tail = [{ key: 'created', label: '创建信息', width: 180 }];
    return chip.value === '全部' ? [...base, { key: 'execStatus', label: '执行状态', width: 110 }, ...tail] : [...base, ...tail];
  },
  fixedRight: [{ key: 'actions', label: '操作', width: 130 }],
  sticky: false,
});
const { midCols } = cf;

/** 任务列表：自动搬家 / 自动下架两类任务的统一配置清单（状态 + 创建人入列） */
const props = defineProps<{ tasks: MvTask[] }>();
const emit = defineEmits<{ (e: 'create'): void; (e: 'edit', t: MvTask): void }>();

/** 顶部 chips=执行状态维度（参考版口径）；任务状态走筛选下拉 */
const chip = ref<'全部' | MvExecStatus>('全部');
const CHIPS: ('全部' | MvExecStatus)[] = ['全部', ...MV_EXEC_STATUSES];
const countOf = (k: (typeof CHIPS)[number]) => (k === '全部' ? props.tasks.length : props.tasks.filter((t) => t.execStatus === k).length);

const emptyFilter = { name: '', platform: '全部', kind: '全部', method: '全部', shop: '', taskStatus: '全部', creator: '', dateFrom: '', dateTo: '' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value } };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter } };

const rows = computed(() => {
  const out = props.tasks.filter((t) => {
    if (chip.value !== '全部' && t.execStatus !== chip.value) return false;
    if (applied.value.taskStatus !== '全部' && mvTaskStatusText(t) !== applied.value.taskStatus) return false;
    if (applied.value.name && !t.name.includes(applied.value.name) && !t.id.includes(applied.value.name)) return false;
    if (applied.value.platform !== '全部' && t.platform !== applied.value.platform) return false;
    if (applied.value.kind !== '全部' && t.kind !== applied.value.kind) return false;
    if (applied.value.method !== '全部' && t.method !== applied.value.method) return false;
    if (applied.value.shop && ![...t.shopIds, ...(t.targetShopIds ?? [])].some((id) => mvShopOf(id)?.name.includes(applied.value.shop))) return false;
    if (applied.value.creator && !t.creator.includes(applied.value.creator)) return false;
    if (applied.value.dateFrom && t.createdAt < applied.value.dateFrom) return false;
    if (applied.value.dateTo && t.createdAt > applied.value.dateTo + ' 23:59:59') return false;
    return true;
  });
  /* 创建信息列按创建时间排序（点击循环 降序 → 升序 → 取消） */
  if (sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir);
  }
  return out;
});

/* 排序状态：单列（创建时间）激活，点击循环 desc → asc → 取消 */
const sortDir = ref<'none' | 'asc' | 'desc'>('none');
const onSort = () => {
  if (sortDir.value === 'none') sortDir.value = 'desc';
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else sortDir.value = 'none';
};
const sortState = () => sortDir.value;

/* 执行方式标签：复用全局 .tag 系统（循环=灰 / 条件触发=橙 / 一次性=绿），与品控等模块标签同款 */
const methodTag = (m: MvTask['method']) => (m === '条件触发' ? 'tag orange' : m === '一次性' ? 'tag green' : 'tag');

/* 生命周期按维度拆分：启用/禁用作用于任务状态（条件/循环），立即执行作用于执行状态（一次性，原「启动」改名）；
   双维耦合：已禁用即无执行状态（禁用收口在途并清空排队），重新启用后回到待执行；
   在途执行（执行中）不可禁用：禁用入口隐藏，待本轮执行结束（待执行/已完成）后才可禁用 */
const stopPatch = (): Partial<MvTask> => ({ taskStatus: '已禁用', execStatus: undefined });
const runAct = (t: MvTask): { label: string; patch: Partial<MvTask>; msg: string } | null => {
  if (t.method === '条件触发') {
    if (t.taskStatus === '启用中') {
      return t.execStatus === '执行中'
        ? null
        : { label: '禁用', patch: stopPatch(), msg: `已禁用：任务「${t.name}」停止条件监听` };
    }
    return { label: '启用', patch: { taskStatus: '启用中', execStatus: '待执行' }, msg: `已启用：任务「${t.name}」恢复条件监听` };
  }
  if (t.method === '循环') {
    if (t.taskStatus === '已启用') {
      return t.execStatus === '执行中'
        ? null
        : { label: '禁用', patch: stopPatch(), msg: `已禁用：任务「${t.name}」停止循环` };
    }
    return { label: '启用', patch: { taskStatus: '已启用', execStatus: '待执行' }, msg: `已启用：任务「${t.name}」恢复循环执行` };
  }
  return t.execStatus === '待执行'
    ? { label: '立即执行', patch: { execStatus: '执行中' }, msg: `已立即执行：任务「${t.name}」开始执行` }
    : null;
};
const applyRun = (t: MvTask) => {
  const act = runAct(t);
  if (!act) return;
  Object.assign(t, act.patch);
  pushToast(act.msg);
};

/* 操作矩阵全表（2026-10-02 用户拍板）：执行中＝在途保护态——删除隐藏（在途批次不可无主）、循环/条件可编辑（改动下一轮生效）、
   一次性禁编辑（本轮即唯一轮，改配置无生效落点）；一次性已完成配置已消耗——编辑撤掉、仅留删除作归档清理；
   「更多」仅含删除，删除隐藏时整个按钮隐藏不留空气泡 */
const canEdit = (t: MvTask) => !(t.method === '一次性' && t.execStatus !== '待执行');
const canDel = (t: MvTask) => t.execStatus !== '执行中';

/* 操作列：直出 2 + 更多[删除]；删除强提醒二次确认 */
const delTarget = ref<MvTask | null>(null);
const confirmDel = () => {
  const t = delTarget.value;
  if (!t) return;
  const i = props.tasks.findIndex((x) => x.id === t.id);
  if (i >= 0) props.tasks.splice(i, 1);
  pushToast(`已删除：任务「${t.name}」及其执行记录已移除`);
  delTarget.value = null;
};
</script>

<template>
  <div>
    <div class="sg-statusbar">
      <button v-for="c in CHIPS" :key="c" class="sg-chip" :class="chip === c ? 'active' : ''" @click="chip = c">
        {{ c }}({{ countOf(c) }})
      </button>
    </div>

    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>任务名称</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="任务名称 / 任务ID" :value="filter.name" @input="filter.name = ($event.target as HTMLInputElement).value" />
            <button v-if="filter.name" type="button" class="sg-clear" title="清除" @click="filter.name = ''; doSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>执行平台</label>
          <BubbleSelect class-name="sg-select" :value="filter.platform" :options="['全部', ...MV_PLATFORMS]" @change="(v: string) => (filter.platform = v)" />
        </div>
        <div class="sg-field">
          <label>任务类型</label>
          <BubbleSelect class-name="sg-select" :value="filter.kind" :options="['全部', ...MV_KINDS]" @change="(v: string) => (filter.kind = v)" />
        </div>
        <div class="sg-field">
          <label>执行方式</label>
          <BubbleSelect class-name="sg-select" :value="filter.method" :options="['全部', ...MV_METHODS]" @change="(v: string) => (filter.method = v)" />
        </div>
        <div class="sg-field">
          <label>店铺</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="请输入店铺名称" :value="filter.shop" @input="filter.shop = ($event.target as HTMLInputElement).value" />
            <button v-if="filter.shop" type="button" class="sg-clear" title="清除" @click="filter.shop = ''; doSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>任务状态</label>
          <BubbleSelect class-name="sg-select" :value="filter.taskStatus" :options="['全部', ...MV_TASK_STATUS_FILTERS]" @change="(v: string) => (filter.taskStatus = v)" />
        </div>
        <div class="sg-field">
          <label>创建人</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="请输入创建人" :value="filter.creator" @input="filter.creator = ($event.target as HTMLInputElement).value" />
            <button v-if="filter.creator" type="button" class="sg-clear" title="清除" @click="filter.creator = ''; doSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>创建时间</label>
          <DateRangePicker v-model:from="filter.dateFrom" v-model:to="filter.dateTo" placeholder="请选择日期范围" />
        </div>
        <div class="sg-actions">
          <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
          <ColFieldPop :st="cf" />
          <button class="sg-btn primary" @click="emit('create')">新建任务</button>
          <button class="sg-btn" @click="doReset">重置</button>
          <button class="sg-btn primary" @click="doSearch">查询</button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table">
          <thead>
            <tr>
              <template v-for="c in midCols" :key="c.key">
                <SortTh v-if="c.key === 'created'" :label="c.label" :width="`${c.width}px`" :state="sortState()" @sort="onSort" />
                <th v-else :style="{ width: `${c.width}px` }">{{ c.label }}</th>
              </template>
              <th :style="{ width: '130px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.id">
              <template v-for="c in midCols" :key="c.key">
                <td v-if="c.key === 'name'">
                  <Ellipsis :text="t.name" class-name="mv-name" />
                  <div class="mv-sub mv-sub-col">
                    <span class="mv-plat"><img :src="PLATFORM_LOGO[t.platform]" :alt="t.platform" />{{ t.platform }}</span>
                    <span>任务ID：{{ t.id }}</span>
                  </div>
                </td>
                <td v-else-if="c.key === 'kind'">
                  <div>{{ t.kind }}</div>
                  <div class="mv-methodline"><span :class="methodTag(t.method)">{{ t.method }}</span></div>
                </td>
                <td v-else-if="c.key === 'taskStatus'">
                  <span class="sg-status">
                    <span class="sg-dot" :class="mvTaskStatusDot(t)" />
                    <span>{{ mvTaskStatusText(t) }}</span>
                  </span>
                </td>
                <td v-else-if="c.key === 'execStatus'">
                  <span v-if="t.execStatus" class="sg-status">
                    <span class="sg-dot" :class="mvExecDot(t.execStatus)" />
                    <span>{{ t.execStatus }}</span>
                  </span>
                  <span v-else class="mv-none">—</span>
                </td>
                <td v-else-if="c.key === 'created'">
                  <div>{{ t.creator }}</div>
                  <div class="mv-sub">{{ t.createdAt }}</div>
                </td>
              </template>
              <td>
                <div class="sg-acts">
                  <a v-if="canEdit(t)" class="sg-link" href="javascript:void(0)" @click.prevent="emit('edit', t)">编辑</a>
                  <a v-if="runAct(t)" class="sg-link" href="javascript:void(0)" @click.prevent="applyRun(t)">{{ runAct(t)!.label }}</a>
                  <MoreActions v-if="canDel(t)" :items="[{ label: '删除', danger: true, onClick: () => (delTarget = t) }]" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="rows.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除强提醒：危险操作二次确认 -->
    <Modal v-if="delTarget" title="删除任务" :sub="`删除后不可恢复，请谨慎确认`" @close="delTarget = null">
      <div class="bp-rows">
        <div class="bp-row"><span class="bp-label">任务</span><b>{{ delTarget.name }}（{{ delTarget.id }}）</b></div>
        <div class="bp-row"><span class="bp-label">类型与配置</span><b>{{ delTarget.kind }} · {{ delTarget.method }} · {{ mvRunSummary(delTarget) }}</b></div>
        <div class="bp-row"><span class="bp-label">影响</span><b>该任务的执行批次记录将一并移除，已发布 / 已下架商品不受影响</b></div>
      </div>
      <template #foot>
        <button class="btn" @click="delTarget = null">取消</button>
        <button class="btn danger" @click="confirmDel">确认删除</button>
      </template>
    </Modal>
  </div>
</template>
