<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import MoreActions from '../../components/MoreActions.vue';
import { pushToast } from '../../components/toast';
import { MV_KINDS, MV_METHODS, MV_STATUSES, mvRunSummary, mvShopOf, mvShops, mvStatusDot, type MvTask, type MvTaskStatus } from './moveData';

/** 任务列表：自动搬家 / 自动下架两类任务的统一配置清单（状态 + 创建人入列） */
const props = defineProps<{ tasks: MvTask[] }>();
const emit = defineEmits<{ (e: 'create'): void; (e: 'edit', t: MvTask): void }>();

const chip = ref<'全部' | MvTaskStatus>('全部');
const CHIPS: ('全部' | MvTaskStatus)[] = ['全部', ...MV_STATUSES];
const countOf = (k: (typeof CHIPS)[number]) => (k === '全部' ? props.tasks.length : props.tasks.filter((t) => t.status === k).length);

const emptyFilter = { name: '', kind: '全部', method: '全部', shop: '全部', creator: '', dateFrom: '', dateTo: '' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value } };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter } };

const rows = computed(() => props.tasks.filter((t) => {
  if (chip.value !== '全部' && t.status !== chip.value) return false;
  if (applied.value.name && !t.name.includes(applied.value.name) && !t.id.includes(applied.value.name)) return false;
  if (applied.value.kind !== '全部' && t.kind !== applied.value.kind) return false;
  if (applied.value.method !== '全部' && t.method !== applied.value.method) return false;
  if (applied.value.shop !== '全部' && ![...t.shopIds, ...(t.targetShopIds ?? [])].some((id) => mvShopOf(id)?.name === applied.value.shop)) return false;
  if (applied.value.creator && !t.creator.includes(applied.value.creator)) return false;
  if (applied.value.dateFrom && t.createdAt < applied.value.dateFrom) return false;
  if (applied.value.dateTo && t.createdAt > applied.value.dateTo + ' 23:59:59') return false;
  return true;
}));

/* 徽章口径：方式 3 形态 / 状态 4 态；任务类型改纯文字入「任务类型」列 */
const methodBadge = (m: MvTask['method']) => (m === '循环' ? 'badge-gray' : m === '条件触发' ? 'badge-orange' : 'badge-green');

/* 生命周期按执行方式差异化：循环=启动/禁用/启用；一次性=仅待执行可启动；条件=启用/禁用互切 */
const runAct = (t: MvTask): { label: string; to: MvTaskStatus; msg: string } | null => {
  if (t.method === '条件触发') {
    return t.status === '启用中'
      ? { label: '禁用', to: '已禁用', msg: `已禁用：任务「${t.name}」停止条件监听` }
      : { label: '启用', to: '启用中', msg: `已启用：任务「${t.name}」恢复条件监听` };
  }
  if (t.method === '循环') {
    return t.status === '已启用'
      ? { label: '禁用', to: '已禁用', msg: `已禁用：任务「${t.name}」停止循环` }
      : { label: '启用', to: '已启用', msg: `已启用：任务「${t.name}」恢复循环执行` };
  }
  return t.status === '待执行' ? { label: '启动', to: '执行中', msg: `已启动：任务「${t.name}」开始执行` } : null;
};
const applyRun = (t: MvTask) => {
  const act = runAct(t);
  if (!act) return;
  t.status = act.to;
  pushToast(act.msg);
};

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
          <input class="sg-input" placeholder="任务名称 / 任务ID" :value="filter.name" @input="filter.name = ($event.target as HTMLInputElement).value" />
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
          <BubbleSelect class-name="sg-select" :value="filter.shop" :options="['全部', ...mvShops.map((s) => s.name)]" @change="(v: string) => (filter.shop = v)" />
        </div>
        <div class="sg-field">
          <label>创建人</label>
          <input class="sg-input" placeholder="请输入创建人" :value="filter.creator" @input="filter.creator = ($event.target as HTMLInputElement).value" />
        </div>
        <div class="sg-field">
          <label>创建时间</label>
          <DateRangePicker v-model:from="filter.dateFrom" v-model:to="filter.dateTo" placeholder="请选择日期范围" />
        </div>
        <div class="sg-actions">
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
              <th :style="{ width: '280px' }">任务信息</th>
              <th :style="{ width: '100px' }">任务类型</th>
              <th v-if="chip === '全部'" :style="{ width: '90px' }">状态</th>
              <th :style="{ width: '170px' }">创建信息</th>
              <th :style="{ width: '130px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.id">
              <td>
                <Ellipsis :text="t.name" class-name="mv-name" />
                <div class="mv-sub">任务ID：{{ t.id }}</div>
              </td>
              <td>
                <div>{{ t.kind }}</div>
                <div class="mv-methodline"><span :class="methodBadge(t.method)">{{ t.method }}</span></div>
              </td>
              <td v-if="chip === '全部'">
                <span class="sg-status">
                  <span class="sg-dot" :class="mvStatusDot(t.status)" />
                  <span>{{ t.status }}</span>
                </span>
              </td>
              <td>
                <div>{{ t.creator }}</div>
                <div class="mv-sub">{{ t.createdAt }}</div>
              </td>
              <td>
                <div class="sg-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="emit('edit', t)">编辑</a>
                  <a v-if="runAct(t)" class="sg-link" href="javascript:void(0)" @click.prevent="applyRun(t)">{{ runAct(t)!.label }}</a>
                  <MoreActions :items="[{ label: '删除', danger: true, onClick: () => (delTarget = t) }]" />
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
