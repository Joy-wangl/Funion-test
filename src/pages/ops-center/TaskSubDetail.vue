<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import type { ParentTask, SubTask } from './data';
import { retrySub, confirmSub, rejectSub, cancelSub, PLATFORM_LOGO } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import TcRange from './TcRange.vue';
import TcStepsCell from './TcStepsCell.vue';
import { firstStepFailed, createPageOf, type CreatePageKey } from './tcSteps';

const props = defineProps<{ parent: ParentTask }>();

const platformOptions = ['全部', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];
const typeOptions = ['全部', '快速铺货', '商品铺货', '商品发布', '批量上架', '自动定价', '自动换图'];

/* ================= 子任务详情（批次钻入，与按任务详情列表同构） ================= */
interface DetailFilter {
  tab: string;
  chip: string;
  type: string;
  linkId: string;
  shop: string;
  platform: string;
  creator: string;
  taskId: string;
  compete: string;
}
const defaultDetailFilter: DetailFilter = {
  tab: 'all',
  chip: '全部',
  type: '全部',
  linkId: '',
  shop: '',
  platform: '全部',
  creator: '',
  taskId: '',
  compete: '',
};

const tab = ref('all');
const chip = ref('全部');
const type = ref('全部');
const linkId = ref('');
const shop = ref('');
const platform = ref('全部');
const creator = ref('');
const taskId = ref('');
const compete = ref('');
const applied = ref<DetailFilter>({ ...defaultDetailFilter });

const subs = computed(() => props.parent.subs);

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

/* 参考版 tabs：无计数下划线式 */
const tabs = [
  { key: 'all', text: '全部' },
  { key: 'queued', text: '队列中' },
  { key: 'running', text: '执行中' },
  { key: 'confirm', text: '待确认' },
  { key: 'done', text: '已完成' },
  { key: 'failed', text: '执行失败' },
  { key: 'cancelled', text: '已取消' },
];

const snapshot = (nextTab: string, nextChip?: string): DetailFilter => ({
  tab: nextTab,
  chip: nextChip ?? chip.value,
  type: type.value,
  linkId: linkId.value.trim(),
  shop: shop.value.trim(),
  platform: platform.value,
  creator: creator.value.trim(),
  taskId: taskId.value.trim(),
  compete: compete.value.trim(),
});
const onTab = (key: string) => {
  tab.value = key;
  /* 子状态 chips 含义随 tab 切换（失败原因/取消方式），切 tab 重置 */
  chip.value = '全部';
  applied.value = snapshot(key);
};
const onChip = (c: string) => {
  chip.value = c;
  applied.value = snapshot(tab.value, c);
};
const onSearch = () => { applied.value = snapshot(tab.value); };
const onReset = () => {
  chip.value = '全部';
  type.value = '全部';
  linkId.value = '';
  shop.value = '';
  platform.value = '全部';
  creator.value = '';
  taskId.value = '';
  compete.value = '';
  tab.value = 'all';
  applied.value = { ...defaultDetailFilter };
};

const visible = computed(() => {
  const rows = subs.value.filter((s) => {
    const okTab =
      applied.value.tab === 'all' ||
      (applied.value.tab === 'done' ? s.status === 'success' : applied.value.tab === 'failed' ? s.status === 'failed' : s.status === applied.value.tab);
    /* 失败原因 / 取消方式 chips */
    const okChip = applied.value.tab === 'cancelled'
      ? applied.value.chip === '全部' || s.cancelType === (applied.value.chip === '风控取消' ? 'risk' : 'manual')
      : applied.value.tab !== 'failed' || applied.value.chip === '全部' || (s.shops[0]?.reason || '其它') === applied.value.chip;
    const okType = applied.value.type === '全部' || props.parent.type === applied.value.type;
    const okLink = !applied.value.linkId || s.linkId.indexOf(applied.value.linkId) > -1;
    const okShop = !applied.value.shop || (s.shops[0]?.shop ?? '').indexOf(applied.value.shop) > -1;
    const okPlatform = applied.value.platform === '全部' || s.shops[0]?.platform === applied.value.platform;
    const okCreator = !applied.value.creator || props.parent.creator.indexOf(applied.value.creator) > -1;
    const okTaskId = !applied.value.taskId || String(s.taskId).padStart(6, '0').indexOf(applied.value.taskId) > -1;
    const okCompete = !applied.value.compete || s.linkId.indexOf(applied.value.compete) > -1;
    return okTab && okChip && okType && okLink && okShop && okPlatform && okCreator && okTaskId && okCompete;
  });
  /* 创建时间 / 执行起止时间排序（SortTh：首点降序 → 再点升序 → 三击取消） */
  const k = sortKey.value;
  if (k && sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    const val = (s: SubTask) => (k === 'create' ? props.parent.createTime : s.startTime);
    return [...rows].sort((a, b) => val(a).localeCompare(val(b)) * dir);
  }
  return rows;
});

const isFailed = computed(() => tab.value === 'failed');
const isCancelled = computed(() => tab.value === 'cancelled');

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

/* 单条重试：与个人商品库-关联发布任务抽屉同源联动 */
const retryOne = (s: SubTask) => {
  retrySub(s);
  pushToast('重试中…');
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
/* 详情：除首节点失败外的任务可跳商品创建（按发布店铺平台映射子页） */
const opsGo = inject<(target: CreatePageKey) => void>('opsGo');
const goCreate = (s: SubTask) => opsGo?.(createPageOf(s.shops[0]?.platform ?? '淘宝'));

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
/* 手动取消：队列中/执行中任务可取消执行，记入已取消(手动) */
const cancelOne = (s: SubTask) => {
  cancelSub(s, 'manual');
  pushToast('任务已取消');
};
</script>

<template>
  <div class="tc-tabs">
    <button v-for="t in tabs" :key="t.key" class="tc-tab" :class="tab === t.key ? 'active' : ''" @click="onTab(t.key)">
      {{ t.text }}
    </button>
  </div>

  <div class="tc-filter">
    <div v-if="isFailed" class="tc-chips">
      <button v-for="c in ['全部', '发品受限', '价格异常', '母链接同步失败', '风控拦截', '风险管控', '材料缺失', '系列编码异常', '其它']" :key="c" class="tc-chip" :class="chip === c ? 'active' : ''" @click="onChip(c)">
        {{ c }}
      </button>
    </div>
    <!-- 已取消 tab：子状态区分风控自动取消 / 手动取消执行 -->
    <div v-if="isCancelled" class="tc-chips">
      <button v-for="c in ['全部', '风控取消', '手动取消']" :key="c" class="tc-chip" :class="chip === c ? 'active' : ''" @click="onChip(c)">
        {{ c }}
      </button>
    </div>
    <div class="sg-grid">
      <div class="sg-field">
        <label>创建时间</label>
        <TcRange />
      </div>
      <div class="sg-field">
        <label>任务类型</label>
        <BubbleSelect class-name="sg-select" :value="type" :options="typeOptions" @change="(v: string) => (type = v)" />
      </div>
      <div class="sg-field">
        <label>链接商品ID</label>
        <input v-model="linkId" class="sg-input" placeholder="请输入链接商品ID" />
      </div>
      <div class="sg-field">
        <label>发布店铺</label>
        <input v-model="shop" class="sg-input" placeholder="请输入发布店铺名称" />
      </div>
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform" :options="platformOptions" @change="(v: string) => (platform = v)" />
      </div>
      <div class="sg-field">
        <label>创建人</label>
        <input v-model="creator" class="sg-input" placeholder="请输入创建人" />
      </div>
      <div class="sg-field">
        <label>任务ID</label>
        <input v-model="taskId" class="sg-input" placeholder="请输入任务ID" />
      </div>
      <div class="sg-field">
        <label>竞品链接</label>
        <input v-model="compete" class="sg-input" placeholder="请输入竞品链接" />
      </div>
    </div>
    <div class="sg-actions">
      <div class="sg-mini" />
      <div class="sg-rightacts">
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
      <table class="tc-table tc-detail">
        <thead>
          <tr>
            <th :style="{ width: '64px' }">序号</th>
            <th :style="{ width: '96px' }">任务ID</th>
            <th>商品信息</th>
            <th>任务类型</th>
            <th>节点状态</th>
            <th>任务状态</th>
            <th>发布店铺</th>
            <th>发布平台</th>
            <th>创建人</th>
            <SortTh label="创建时间" :state="sortKey === 'create' ? sortDir : 'none'" @sort="onSort('create')" />
            <SortTh label="执行起止时间" :state="sortKey === 'exec' ? sortDir : 'none'" @sort="onSort('exec')" />
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in visible" :key="s.taskId">
            <td>{{ subs.indexOf(s) + 1 }}</td>
            <td>{{ String(s.taskId).padStart(6, '0') }}</td>
            <td>
              <div class="tc-product">
                <img class="tc-thumb" :src="s.thumb" />
                <div>
                  <div class="tc-pname">{{ s.name }}</div>
                  <div class="tc-pmeta">链接商品ID：{{ s.linkId }}</div>
                </div>
              </div>
            </td>
            <td>{{ parent.type }}</td>
            <td>
              <TcStepsCell :sub="s" :type="parent.type" />
            </td>
            <td>
              <span class="tc-st" :class="subStatusCls[s.status]">
                <i />
                {{ subStatusText[s.status] }}
              </span>
            </td>
            <td>{{ s.shops[0]?.shop ?? '–' }}</td>
            <td>
              <span class="tc-plat-chip">
                <img :src="PLATFORM_LOGO[s.shops[0]?.platform ?? '']" :alt="s.shops[0]?.platform" />
                {{ s.shops[0]?.platform ?? '–' }}
              </span>
            </td>
            <td>{{ parent.creator }}</td>
            <td>{{ parent.createTime }}</td>
            <td>
              <div class="tc-cell-lines">
                <div>起：{{ s.startTime || '–' }}</div>
                <div>止：{{ s.endTime || '–' }}</div>
              </div>
            </td>
            <td class="actions-col">
              <template v-if="s.status === 'confirm'">
                <a class="tc-link" @click.prevent="dlg = { sub: s, kind: 'approve' }">通过</a>
                <a class="tc-link" @click.prevent="dlg = { sub: s, kind: 'reject' }">拒绝</a>
              </template>
              <template v-else>
                <a v-if="!firstStepFailed(s, parent.type) && s.status !== 'cancelled'" class="tc-link" @click.prevent="goCreate(s)">详情</a>
                <a v-if="s.status === 'failed'" class="tc-link" @click.prevent="retryOne(s)">重试</a>
                <a v-if="s.status === 'queued' || s.status === 'running'" class="tc-link" @click.prevent="cancelOne(s)">取消</a>
                <span v-if="(firstStepFailed(s, parent.type) || s.status === 'cancelled') && s.status !== 'failed'" class="tc-dash">–</span>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 待确认 通过/拒绝 二次确认弹窗 -->
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
