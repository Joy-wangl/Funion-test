<script lang="ts">
import type { OptTask } from './qcOptData';

type OptFilter = {
  start: string;
  end: string;
  picker: string;
  codes: string;
  assignee: string;
  group: string;
  level: string;
  direction: string;
  assignStatus: string;
};

const F_ALL = {
  picker: '全部选品人',
  assignee: '全部运维',
  group: '全部组别',
  level: '全部级别',
  direction: '全部需求',
  assignStatus: '全部分配状态',
};
const DEFAULT_FILTER: OptFilter = { start: '', end: '', codes: '', ...F_ALL };

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
</script>

<script setup lang="ts">
/* =========================================================
   优化任务列表（简单版）
   - 顶部状态 tab（全部 + 六状态，含计数）替代「优化状态」筛选条件
   - 筛选表单：草稿/生效分离 + BubbleSelect 全局规范
   - 批量分配 / 批量拒绝（仅待认领任务可勾选）
   字段呈现判断：
   - 优化状态筛选不下发（tab 已覆盖）
   - 待认领 tab：隐藏「分配运维」筛选；分配运维/分配时间列恒为 —
   - 拒绝原因列仅在「拒绝」tab 呈现
   - 原系统「组别/运维组别」重复字段合并为「运维组别」
   ========================================================= */
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import MoreActions from '../../components/MoreActions.vue';
import Modal from '../../components/Modal.vue';
import { PROBLEM_TYPE_COLOR, pct, rateCls } from './qcCenterData';
import {
  OPT_ASSIGNEES,
  OPT_DEMANDS,
  OPT_GROUPS,
  OPT_LEVELS,
  OPT_PICKERS,
  OPT_PROBLEMS,
  OPT_STATUS_LABELS,
  type OptStatus,
  type StatusTab,
} from './qcOptData';

const props = defineProps<{
  tasks: OptTask[];
  setTasks: (updater: (ts: OptTask[]) => OptTask[]) => void;
  statusTab: StatusTab;
  setStatusTab: (s: StatusTab) => void;
}>();

const draft = ref<OptFilter>(DEFAULT_FILTER);
const applied = ref<OptFilter>(DEFAULT_FILTER);
const selected = ref<Set<string>>(new Set());
/** 弹层上下文（空数组 / null = 关闭） */
const assignIds = ref<string[]>([]);
const rejectIds = ref<string[]>([]);
const deleteIds = ref<string[]>([]);
const editTask = ref<OptTask | null>(null);
const aAssignee = ref(OPT_ASSIGNEES[0]);
const aGroup = ref(OPT_GROUPS[0]);
const reason = ref('');
const eForm = ref({ problem: OPT_PROBLEMS[0], direction: OPT_DEMANDS[0], level: OPT_LEVELS[0], group: OPT_GROUPS[0], picker: OPT_PICKERS[0] });

const patchDraft = (patch: Partial<OptFilter>) => { draft.value = { ...draft.value, ...patch }; };

/* 条件筛选（不含状态 tab）→ tab 计数与列表共用 */
const condFiltered = computed(() => props.tasks.filter((t) => {
  const day = t.createdAt.slice(0, 10);
  if (applied.value.start && day < applied.value.start) return false;
  if (applied.value.end && day > applied.value.end) return false;
  if (applied.value.picker !== F_ALL.picker && t.picker !== applied.value.picker) return false;
  if (applied.value.assignee !== F_ALL.assignee && t.assignee !== applied.value.assignee) return false;
  if (applied.value.group !== F_ALL.group && t.group !== applied.value.group) return false;
  if (applied.value.level !== F_ALL.level && t.optLevel !== applied.value.level) return false;
  if (applied.value.direction !== F_ALL.direction && t.optDirection !== applied.value.direction) return false;
  if (applied.value.assignStatus !== F_ALL.assignStatus && t.assignStatus !== applied.value.assignStatus) return false;
  const kws = applied.value.codes.split(/[\s,，]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (kws.length && !kws.every((k) => t.seriesCode.toLowerCase().includes(k) || t.seriesName.toLowerCase().includes(k))) return false;
  return true;
}));

const counts = computed(() => {
  const m: Record<string, number> = { all: condFiltered.value.length };
  for (const s of OPT_STATUS_LABELS) m[s.key] = condFiltered.value.filter((t) => t.status === s.key).length;
  return m;
});

const rows = computed(
  () => (props.statusTab === 'all' ? condFiltered.value : condFiltered.value.filter((t) => t.status === props.statusTab)),
);

const selectable = computed(() => rows.value.filter((t) => t.status === 'pendingClaim'));
const allSel = computed(() => selectable.value.length > 0 && selectable.value.every((t) => selected.value.has(t.id)));
const toggleAll = () => {
  if (allSel.value) {
    selected.value = new Set([...selected.value].filter((id) => !selectable.value.some((t) => t.id === id)));
    return;
  }
  const next = new Set(selected.value);
  selectable.value.forEach((t) => next.add(t.id));
  selected.value = next;
};
const toggleOne = (id: string) => {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
};
const selCount = computed(() => rows.value.filter((t) => selected.value.has(t.id)).length);

const doAssign = () => {
  const ids = new Set(assignIds.value);
  props.setTasks((ts) => ts.map((t) => (ids.has(t.id) && t.status === 'pendingClaim'
    ? { ...t, status: 'pendingOpt', assignStatus: '已分配', assignee: aAssignee.value, group: aGroup.value, assignTime: nowStr() }
    : t)));
  selected.value = new Set();
  assignIds.value = [];
};
const doReject = () => {
  const ids = new Set(rejectIds.value);
  props.setTasks((ts) => ts.map((t) => (ids.has(t.id) && t.status === 'pendingClaim'
    ? { ...t, status: 'rejected', rejectReason: reason.value.trim() || '—' }
    : t)));
  selected.value = new Set();
  reason.value = '';
  rejectIds.value = [];
};
const doDelete = () => {
  const ids = new Set(deleteIds.value);
  props.setTasks((ts) => ts.filter((t) => !ids.has(t.id)));
  selected.value = new Set();
  deleteIds.value = [];
};
const openEdit = (t: OptTask) => {
  eForm.value = { problem: t.optType, direction: t.optDirection, level: t.optLevel, group: t.group, picker: t.picker };
  editTask.value = t;
};
const doEditSave = () => {
  if (!editTask.value) return;
  const et = editTask.value;
  props.setTasks((ts) => ts.map((t) => (t.id === et.id
    ? { ...t, optType: eForm.value.problem, optDirection: eForm.value.direction, optLevel: eForm.value.level, group: eForm.value.group, picker: eForm.value.picker }
    : t)));
  editTask.value = null;
};

const statusMeta = (s: OptStatus) => OPT_STATUS_LABELS.find((x) => x.key === s)!;
</script>

<template>
  <div class="qc-head">
    <div class="qc-title">
      优化任务
      <span class="qc-desc">命中问题商品的优化治理闭环 · 共 {{ counts.all }} 条任务</span>
    </div>
  </div>

  <!-- 状态 tab：替代「优化状态」筛选条件 -->
  <div class="qc-range-toggle opt-status-tabs">
    <button type="button" :class="statusTab === 'all' ? 'active' : ''" @click="props.setStatusTab('all')">
      全部<span class="n">{{ counts.all }}</span>
    </button>
    <button
      v-for="s in OPT_STATUS_LABELS"
      :key="s.key"
      type="button"
      :class="statusTab === s.key ? 'active' : ''"
      @click="props.setStatusTab(s.key)"
    >
      {{ s.label }}<span class="n">{{ counts[s.key] }}</span>
    </button>
  </div>

  <div class="sg-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>生成开始时间</label>
        <input type="date" class="sg-input" :value="draft.start" @input="patchDraft({ start: ($event.target as HTMLInputElement).value })">
      </div>
      <div class="sg-field">
        <label>生成结束时间</label>
        <input type="date" class="sg-input" :value="draft.end" @input="patchDraft({ end: ($event.target as HTMLInputElement).value })">
      </div>
      <div class="sg-field">
        <label>选品人</label>
        <BubbleSelect class-name="sg-select" :value="draft.picker" :options="[F_ALL.picker, ...OPT_PICKERS]" @change="(v: string) => patchDraft({ picker: v })" />
      </div>
      <div class="sg-field">
        <label>系列编码</label>
        <input
          class="sg-input"
          placeholder="系列编码/名称，多条空格分隔"
          :value="draft.codes"
          @input="patchDraft({ codes: ($event.target as HTMLInputElement).value })"
        >
      </div>
      <div v-if="statusTab !== 'pendingClaim'" class="sg-field">
        <label>分配运维</label>
        <BubbleSelect class-name="sg-select" :value="draft.assignee" :options="[F_ALL.assignee, ...OPT_ASSIGNEES]" @change="(v: string) => patchDraft({ assignee: v })" />
      </div>
      <div class="sg-field">
        <label>运维组别</label>
        <BubbleSelect class-name="sg-select" :value="draft.group" :options="[F_ALL.group, ...OPT_GROUPS]" @change="(v: string) => patchDraft({ group: v })" />
      </div>
      <div class="sg-field">
        <label>优化级别</label>
        <BubbleSelect class-name="sg-select" :value="draft.level" :options="[F_ALL.level, ...OPT_LEVELS]" @change="(v: string) => patchDraft({ level: v })" />
      </div>
      <div class="sg-field">
        <label>需求</label>
        <BubbleSelect class-name="sg-select" :value="draft.direction" :options="[F_ALL.direction, ...OPT_DEMANDS]" @change="(v: string) => patchDraft({ direction: v })" />
      </div>
    </div>
    <!-- 末行：剩余条件 + 操作/重置/搜索 同排，右对齐 -->
    <div class="sg-grid opt-actions-row">
      <div class="sg-field">
        <label>分配状态</label>
        <BubbleSelect class-name="sg-select" :value="draft.assignStatus" :options="[F_ALL.assignStatus, '待处理', '已分配']" @change="(v: string) => patchDraft({ assignStatus: v })" />
      </div>
      <div class="opt-actions-cell">
        <template v-if="statusTab === 'all' || statusTab === 'pendingClaim'">
          <span v-if="selCount > 0" class="sel-info">已选 {{ selCount }} 条待认领任务</span>
          <button class="sg-btn primary" :disabled="selCount === 0" @click="assignIds = [...selected]">批量分配</button>
          <button class="sg-btn danger" :disabled="selCount === 0" @click="rejectIds = [...selected]">批量拒绝</button>
        </template>
        <button class="sg-btn" @click="draft = DEFAULT_FILTER; applied = DEFAULT_FILTER">重置</button>
        <button class="sg-btn primary" @click="applied = draft">搜索</button>
      </div>
    </div>
  </div>

  <div class="qc-body">
    <table class="table qc-wide">
      <thead>
        <tr>
          <th style="width: 36px">
            <input type="checkbox" :checked="allSel" :disabled="selectable.length === 0" @change="toggleAll">
          </th>
          <th>系列编码</th>
          <th v-if="statusTab === 'all'">优化状态</th>
          <th>优化级别</th>
          <th>问题点</th>
          <th>发退率</th>
          <th>近一个月订单</th>
          <th>近一个月毛六</th>
          <th>需求</th>
          <th>分配状态</th>
          <th>分配运维</th>
          <th>运维组别</th>
          <th>分配时间</th>
          <th>选品人</th>
          <th>登记日期</th>
          <th v-if="statusTab === 'rejected'">拒绝原因</th>
          <th style="width: 90px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in rows" :key="t.id">
          <td>
            <input
              type="checkbox"
              :disabled="t.status !== 'pendingClaim'"
              :checked="selected.has(t.id)"
              @change="toggleOne(t.id)"
            >
          </td>
          <td class="col-name">
            <div>{{ t.seriesCode }}</div>
            <div style="color: var(--text-3); font-size: 12px">{{ t.seriesName }}</div>
          </td>
          <td v-if="statusTab === 'all'">
            <span class="tag" :style="{ background: `${statusMeta(t.status).color}1a`, color: statusMeta(t.status).color }">{{ statusMeta(t.status).label }}</span>
          </td>
          <td>{{ t.optLevel }}</td>
          <td>
            <span
              class="tag"
              :style="{ background: `${PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff' }"
            >{{ t.optType }}</span>
          </td>
          <td><span class="rate" :class="rateCls(t.refundRate)">{{ pct(t.refundRate) }}</span></td>
          <td>{{ t.orders30d.toLocaleString() }}</td>
          <td>{{ t.gross30d.toLocaleString() }}</td>
          <td>{{ t.optDirection }}</td>
          <td>{{ t.assignStatus }}</td>
          <td>{{ t.assignee ?? '—' }}</td>
          <td>{{ t.group }}</td>
          <td>{{ t.assignTime ?? '—' }}</td>
          <td>{{ t.picker }}</td>
          <td>{{ t.createdAt }}</td>
          <td v-if="statusTab === 'rejected'" style="color: var(--text-3)">{{ t.rejectReason ?? '—' }}</td>
          <td>
            <div v-if="t.status === 'pendingClaim'" class="qc-op-col">
              <a @click="openEdit(t)">编辑</a>
              <a @click="assignIds = [t.id]">分配</a>
              <MoreActions
                :items="[
                  { label: '删除', danger: true, onClick: () => (deleteIds = [t.id]) },
                  { label: '拒绝', danger: true, onClick: () => (rejectIds = [t.id]) },
                ]"
              />
            </div>
            <template v-else>—</template>
          </td>
        </tr>
        <tr v-if="rows.length === 0">
          <td :colspan="statusTab === 'all' ? 16 : statusTab === 'rejected' ? 16 : 15" style="text-align: center; color: var(--text-4); padding: 40px 0">无匹配任务</td>
        </tr>
      </tbody>
    </table>
  </div>

  <Modal
    v-if="assignIds.length > 0"
    title="批量分配"
    :sub="`将 ${assignIds.length} 条待认领任务分配给运维`"
    size="md"
    @close="assignIds = []"
  >
    <div class="opt-form">
      <div class="sg-field">
        <label>分配运维</label>
        <BubbleSelect class-name="sg-select" :value="aAssignee" :options="OPT_ASSIGNEES" @change="(v: string) => (aAssignee = v)" />
      </div>
      <div class="sg-field">
        <label>运维组别</label>
        <BubbleSelect class-name="sg-select" :value="aGroup" :options="OPT_GROUPS" @change="(v: string) => (aGroup = v)" />
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="assignIds = []">取消</button>
      <button class="btn primary" @click="doAssign">确认分配</button>
    </template>
  </Modal>

  <Modal
    v-if="rejectIds.length > 0"
    title="批量拒绝"
    :sub="`拒绝 ${rejectIds.length} 条待认领任务`"
    size="md"
    @close="rejectIds = []"
  >
    <textarea
      class="sg-input opt-reason"
      rows="3"
      placeholder="请输入拒绝原因"
      :value="reason"
      @input="reason = ($event.target as HTMLTextAreaElement).value"
    />
    <template #foot>
      <button class="btn" @click="rejectIds = []">取消</button>
      <button class="btn primary" @click="doReject">确认拒绝</button>
    </template>
  </Modal>

  <Modal
    v-if="deleteIds.length > 0"
    title="删除任务"
    :sub="`删除后不可恢复，确认删除 ${deleteIds.length} 条任务？`"
    size="md"
    @close="deleteIds = []"
  >
    <div style="color: var(--text-3); font-size: 13px">删除仅移除优化任务记录，不影响监控列表中的系列与问题统计数据。</div>
    <template #foot>
      <button class="btn" @click="deleteIds = []">取消</button>
      <button class="btn danger" @click="doDelete">确认删除</button>
    </template>
  </Modal>

  <Modal
    v-if="editTask"
    title="编辑任务"
    :sub="`${editTask.seriesCode} · ${editTask.seriesName}`"
    size="md"
    @close="editTask = null"
  >
    <div class="opt-form">
      <div class="sg-field">
        <label>问题点</label>
        <BubbleSelect class-name="sg-select" :value="eForm.problem" :options="OPT_PROBLEMS" @change="(v: string) => (eForm = { ...eForm, problem: v })" />
      </div>
      <div class="sg-field">
        <label>需求</label>
        <BubbleSelect class-name="sg-select" :value="eForm.direction" :options="OPT_DEMANDS" @change="(v: string) => (eForm = { ...eForm, direction: v })" />
      </div>
      <div class="sg-field">
        <label>优化级别</label>
        <BubbleSelect class-name="sg-select" :value="eForm.level" :options="OPT_LEVELS" @change="(v: string) => (eForm = { ...eForm, level: v })" />
      </div>
      <div class="sg-field">
        <label>运维组别</label>
        <BubbleSelect class-name="sg-select" :value="eForm.group" :options="OPT_GROUPS" @change="(v: string) => (eForm = { ...eForm, group: v })" />
      </div>
      <div class="sg-field">
        <label>选品人</label>
        <BubbleSelect class-name="sg-select" :value="eForm.picker" :options="OPT_PICKERS" @change="(v: string) => (eForm = { ...eForm, picker: v })" />
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="editTask = null">取消</button>
      <button class="btn primary" @click="doEditSave">保存</button>
    </template>
  </Modal>
</template>
