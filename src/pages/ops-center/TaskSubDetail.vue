<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ParentTask, SubTask } from './data';
import { retrySub } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import TcRange from './TcRange.vue';
import { stepsOf, stepLabels } from './tcSteps';

const props = defineProps<{ parent: ParentTask }>();

const platformOptions = ['全部', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];

/* ================= 子任务详情（二级页） ================= */
interface DetailFilter {
  tab: string;
  chip: string;
  templateNo: string;
  linkId: string;
  platform: string;
  shop: string;
  retried: string;
}
const defaultDetailFilter: DetailFilter = {
  tab: 'all',
  chip: '全部',
  templateNo: '',
  linkId: '',
  platform: '全部',
  shop: '',
  retried: '全部',
};

const tab = ref('all');
const chip = ref('全部');
const templateNo = ref('');
const linkId = ref('');
const platform = ref('全部');
const shop = ref('');
const retried = ref('全部');
const applied = ref<DetailFilter>({ ...defaultDetailFilter });
const checked = ref<number[]>([]);

const subs = computed(() => props.parent.subs);
const count = (st: SubTask['status']) => subs.value.filter((s) => s.status === st).length;
const tabs = computed(() => [
  { key: 'all', text: '全部', n: subs.value.length },
  { key: 'queued', text: '队列中', n: count('queued') },
  { key: 'running', text: '执行中', n: count('running') },
  { key: 'done', text: '已完成', n: count('success') },
  { key: 'failed', text: '执行失败', n: count('failed') },
]);

const snapshot = (nextTab: string, nextChip?: string): DetailFilter => ({
  tab: nextTab,
  chip: nextChip ?? chip.value,
  templateNo: templateNo.value.trim(),
  linkId: linkId.value.trim(),
  platform: platform.value,
  shop: shop.value.trim(),
  retried: retried.value,
});
const onTab = (key: string) => {
  tab.value = key;
  checked.value = [];
  applied.value = snapshot(key);
};
const onChip = (c: string) => {
  chip.value = c;
  checked.value = [];
  applied.value = snapshot(tab.value, c);
};
const onSearch = () => { applied.value = snapshot(tab.value); };
const onReset = () => {
  chip.value = '全部';
  templateNo.value = '';
  linkId.value = '';
  platform.value = '全部';
  shop.value = '';
  retried.value = '全部';
  tab.value = 'all';
  checked.value = [];
  applied.value = { ...defaultDetailFilter };
};

const visible = computed(() => subs.value.filter((s) => {
  const okTab =
    applied.value.tab === 'all' ||
    (applied.value.tab === 'done' ? s.status === 'success' : applied.value.tab === 'failed' ? s.status === 'failed' : s.status === applied.value.tab);
  const okChip = applied.value.tab !== 'failed' || applied.value.chip === '全部' || s.reason === applied.value.chip;
  const okTpl = !applied.value.templateNo || s.templateNo.indexOf(applied.value.templateNo) > -1;
  const okLink = !applied.value.linkId || s.linkId.indexOf(applied.value.linkId) > -1;
  const okPlatform = applied.value.platform === '全部' || s.platform === applied.value.platform;
  const okShop = !applied.value.shop || s.shop.indexOf(applied.value.shop) > -1;
  const okRetried = applied.value.retried === '全部' || (applied.value.retried === '是') === s.retried;
  return okTab && okChip && okTpl && okLink && okPlatform && okShop && okRetried;
}));

const isFailed = computed(() => tab.value === 'failed');
const isQueued = computed(() => tab.value === 'queued');
const allChecked = computed(() => visible.value.length > 0 && visible.value.every((s) => checked.value.includes(s.id)));
const toggleAll = () => { checked.value = allChecked.value ? [] : visible.value.map((s) => s.id); };
const toggleOne = (id: number, on: boolean) => { checked.value = on ? [...checked.value, id] : checked.value.filter((x) => x !== id); };
const onBatchRetry = () => {
  if (!checked.value.length) {
    alert('请先勾选需要重试的任务');
    return;
  }
  const subs = visible.value.filter((s) => checked.value.includes(s.id));
  checked.value = [];
  subs.forEach((s) => retrySub(s));
  pushToast(`重试中…（${subs.length} 个任务）`);
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
/* 单条重试：与个人商品库-关联发布任务抽屉同源联动 */
const retryOne = (s: SubTask) => {
  retrySub(s);
  pushToast('重试中…');
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
</script>

<template>
  <div class="tc-tabs">
    <button v-for="t in tabs" :key="t.key" class="tc-tab" :class="tab === t.key ? 'active' : ''" @click="onTab(t.key)">
      {{ t.text }}({{ t.n }})
    </button>
  </div>

  <div class="tc-filter">
    <div v-if="isFailed" class="tc-chips">
      <button v-for="c in ['全部', '发品超限', '库存不足', '其它']" :key="c" class="tc-chip" :class="chip === c ? 'active' : ''" @click="onChip(c)">
        {{ c }}
      </button>
    </div>
    <div class="sg-grid">
      <div class="sg-field">
        <label>模版号</label>
        <input v-model="templateNo" class="sg-input" placeholder="请输入模版号" />
      </div>
      <div class="sg-field">
        <label>链接商品ID</label>
        <input v-model="linkId" class="sg-input" placeholder="请输入链接商品ID" />
      </div>
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform" :options="platformOptions" @change="(v: string) => (platform = v)" />
      </div>
      <div class="sg-field">
        <label>发布店铺名称</label>
        <input v-model="shop" class="sg-input" placeholder="请输入发布店铺名称" />
      </div>
      <div v-if="tab !== 'queued'" class="sg-field">
        <label>{{ tab === 'all' ? '创建时间' : '执行时间' }}</label>
        <TcRange />
      </div>
      <div v-if="isFailed" class="sg-field">
        <label>是否重试</label>
        <BubbleSelect class-name="sg-select" :value="retried" :options="['全部', '是', '否']" @change="(v: string) => (retried = v)" />
      </div>
    </div>
    <div class="sg-actions">
      <div class="sg-mini" />
      <div class="sg-rightacts">
        <button v-if="isFailed" class="sg-btn primary" @click="onBatchRetry">
          批量重试
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

  <div class="tc-table-card">
    <div class="tc-table-wrap">
      <table class="tc-table tc-detail">
        <thead>
          <tr>
            <th v-if="isFailed" :style="{ width: '72px' }">
              <label class="tc-check">
                <input type="checkbox" class="ib-check" :checked="allChecked" @change="toggleAll" />
                选择
              </label>
            </th>
            <th :style="{ width: '64px' }">序号</th>
            <th :style="{ width: '90px' }">任务ID</th>
            <th>商品信息</th>
            <th>任务状态</th>
            <th>发布信息</th>
            <th>
              执行起止时间 <span class="tc-sort">⇅</span>
            </th>
            <th v-if="!isQueued">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in visible" :key="s.id">
            <td v-if="isFailed">
              <input
                type="checkbox"
                class="ib-check"
                :checked="checked.includes(s.id)"
                @change="toggleOne(s.id, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td>{{ subs.indexOf(s) + 1 }}</td>
            <td>{{ String(s.taskId).padStart(6, '0') }}</td>
            <td>
              <div class="tc-product">
                <img class="tc-thumb" :src="s.thumb" />
                <div>
                  <div class="tc-pname">{{ s.name }}</div>
                  <div class="tc-pmeta">竞品链接：{{ s.linkId }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="tc-steps" :class="s.status === 'queued' ? 'gray' : ''">
                <div v-for="(st, i) in stepsOf(s)" :key="stepLabels[i]" class="tc-step">
                  <i :class="st.dot" />
                  <span>{{ stepLabels[i] }}：</span>
                  <span class="v" :class="st.cls">{{ st.v }}</span>
                </div>
              </div>
            </td>
            <td>
              <div class="tc-pf">
                <span>平台名称</span>
                <span class="tc-pf-shop">
                  <i class="tc-pf-badge">淘</i>
                  {{ s.shop }}
                </span>
              </div>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div>起：{{ s.startTime || '–' }}</div>
                <div>止：{{ s.endTime || '–' }}</div>
              </div>
            </td>
            <td v-if="!isQueued" class="actions-col">
              <a v-if="s.status === 'failed'" class="tc-link" @click.prevent="retryOne(s)">重试</a>
              <span v-else class="tc-dash">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
