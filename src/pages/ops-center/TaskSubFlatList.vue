<script setup lang="ts">
import { computed, ref } from 'vue';
import { parentTasks, type ParentTask, type SubTask } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import TcRange from './TcRange.vue';
import { stepsOf, stepLabels } from './tcSteps';

const platformOptions = ['发布平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];
const typeOptions = ['任务类型', '快速铺货', '商品铺货', '商品发布', '批量上架', '自动定价', '自动换图'];
const channelOptions = ['全部', '智能', '蜂联'];

/* ================= 按任务详情（扁平子任务列表） ================= */
interface FlatRow {
  sub: SubTask;
  parent: ParentTask;
}
const flatAll: FlatRow[] = parentTasks.flatMap((p) => p.subs.map((sub) => ({ sub, parent: p })));

const subStatusText: Record<SubTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  success: '已完成',
  failed: '执行失败',
};
const subStatusCls: Record<SubTask['status'], string> = {
  queued: 'queued',
  running: 'running',
  success: 'done',
  failed: 'failed',
};

interface FlatFilter {
  tab: string;
  chip: string;
  creator: string;
  platform: string;
  channel: string;
  type: string;
  shop: string;
  retried: string;
}
const defaultFlatFilter: FlatFilter = {
  tab: 'all',
  chip: '全部',
  creator: '',
  platform: '发布平台',
  channel: '全部',
  type: '任务类型',
  shop: '',
  retried: '是否重试',
};

const tab = ref('all');
const chip = ref('全部');
const creator = ref('');
const platform = ref('发布平台');
const channel = ref('全部');
const type = ref('任务类型');
const shop = ref('');
const retried = ref('是否重试');
const applied = ref<FlatFilter>({ ...defaultFlatFilter });
const checked = ref<string[]>([]);

const count = (st: SubTask['status']) => flatAll.filter((r) => r.sub.status === st).length;
const tabs = [
  { key: 'all', text: '全部', n: flatAll.length },
  { key: 'queued', text: '队列中', n: count('queued') },
  { key: 'running', text: '执行中', n: count('running') },
  { key: 'done', text: '已完成', n: count('success') },
  { key: 'failed', text: '执行失败', n: count('failed') },
];

const snapshot = (nextTab: string, nextChip?: string): FlatFilter => ({
  tab: nextTab,
  chip: nextChip ?? chip.value,
  creator: creator.value.trim(),
  platform: platform.value,
  channel: channel.value,
  type: type.value,
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
  creator.value = '';
  platform.value = '发布平台';
  channel.value = '全部';
  type.value = '任务类型';
  shop.value = '';
  retried.value = '是否重试';
  tab.value = 'all';
  checked.value = [];
  applied.value = { ...defaultFlatFilter };
};
const onBatchRetry = () => {
  if (!checked.value.length) {
    alert('请先勾选需要重试的任务');
    return;
  }
  alert(`已发起 ${checked.value.length} 个任务的批量重试（演示）`);
};

const visible = computed(() => flatAll.filter((r) => {
  const okTab =
    applied.value.tab === 'all' ||
    (applied.value.tab === 'done' ? r.sub.status === 'success' : applied.value.tab === 'failed' ? r.sub.status === 'failed' : r.sub.status === applied.value.tab);
  const okChip = applied.value.tab !== 'failed' || applied.value.chip === '全部' || r.sub.reason === applied.value.chip;
  const okCreator = !applied.value.creator || r.parent.creator.indexOf(applied.value.creator) > -1;
  const okPlatform = applied.value.platform === '发布平台' || r.sub.platform === applied.value.platform;
  const okChannel = applied.value.channel === '全部' || r.parent.channel === applied.value.channel;
  const okType = applied.value.type === '任务类型' || r.parent.type === applied.value.type;
  const okShop = !applied.value.shop || r.sub.shop.indexOf(applied.value.shop) > -1;
  const okRetried = applied.value.retried === '是否重试' || (applied.value.retried === '是') === r.sub.retried;
  return okTab && okChip && okCreator && okPlatform && okChannel && okType && okShop && okRetried;
}));

const isFailed = computed(() => tab.value === 'failed');
const allChecked = computed(() => visible.value.length > 0 && visible.value.every((r) => checked.value.includes(`${r.parent.id}-${r.sub.id}`)));
const toggleAll = () => { checked.value = allChecked.value ? [] : visible.value.map((r) => `${r.parent.id}-${r.sub.id}`); };
const toggleOne = (key: string, on: boolean) => { checked.value = on ? [...checked.value, key] : checked.value.filter((x) => x !== key); };
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
        <label>创建人</label>
        <input v-model="creator" class="sg-input" placeholder="请输入创建人" />
      </div>
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform" :options="platformOptions" @change="(v: string) => (platform = v)" />
      </div>
      <div class="sg-field">
        <label>渠道</label>
        <BubbleSelect class-name="sg-select" :value="channel" :options="channelOptions" @change="(v: string) => (channel = v)" />
      </div>
      <div class="sg-field">
        <label>任务类型</label>
        <BubbleSelect class-name="sg-select" :value="type" :options="typeOptions" @change="(v: string) => (type = v)" />
      </div>
      <div class="sg-field">
        <label>发布店铺名称</label>
        <input v-model="shop" class="sg-input" placeholder="请输入发布店铺名称" />
      </div>
      <div class="sg-field">
        <label>创建时间</label>
        <TcRange />
      </div>
      <div v-if="tab !== 'queued'" class="sg-field">
        <label>执行时间</label>
        <TcRange />
      </div>
      <div v-if="isFailed" class="sg-field">
        <label>是否重试</label>
        <BubbleSelect class-name="sg-select" :value="retried" :options="['是否重试', '是', '否']" @change="(v: string) => (retried = v)" />
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
            <th>商品信息</th>
            <th>任务类型</th>
            <th>节点状态</th>
            <th>任务状态</th>
            <th>平台/店铺</th>
            <th>创建人</th>
            <th>渠道</th>
            <th>
              执行起止时间 <span class="tc-sort">⇅</span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in visible" :key="`${r.parent.id}-${r.sub.id}`">
            <td v-if="isFailed">
              <input
                type="checkbox"
                class="ib-check"
                :checked="checked.includes(`${r.parent.id}-${r.sub.id}`)"
                @change="toggleOne(`${r.parent.id}-${r.sub.id}`, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td>{{ i + 1 }}</td>
            <td>
              <div class="tc-product">
                <img class="tc-thumb" :src="r.sub.thumb" />
                <div>
                  <div class="tc-pname">{{ r.sub.name }}</div>
                  <div class="tc-pmeta">竞品链接：{{ r.sub.linkId }}</div>
                </div>
              </div>
            </td>
            <td>{{ r.parent.type }}</td>
            <td>
              <div class="tc-steps" :class="r.sub.status === 'queued' ? 'gray' : ''">
                <div v-for="(st, si) in stepsOf(r.sub)" :key="stepLabels[si]" class="tc-step">
                  <i :class="st.dot" />
                  <span>{{ stepLabels[si] }}：</span>
                  <span class="v" :class="st.cls">{{ st.v }}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="tc-st" :class="subStatusCls[r.sub.status]">
                <i />
                {{ subStatusText[r.sub.status] }}
              </span>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div>{{ r.sub.platform }}</div>
                <div>{{ r.sub.shop }}</div>
              </div>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div>{{ r.parent.creator }}</div>
                <div>{{ r.parent.createTime }}</div>
              </div>
            </td>
            <td>{{ r.parent.channel }}</td>
            <td>
              <div class="tc-cell-lines">
                <div>起：{{ r.sub.startTime || '–' }}</div>
                <div>止：{{ r.sub.endTime || '–' }}</div>
              </div>
            </td>
            <td class="actions-col">
              <a v-if="r.sub.status === 'failed'" class="tc-link">重试</a>
              <span v-else class="tc-dash">–</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
