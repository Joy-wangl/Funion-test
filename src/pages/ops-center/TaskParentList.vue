<script setup lang="ts">
import { computed, ref } from 'vue';
import { parentTasks, type ParentTask } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import TcRange from './TcRange.vue';

const emit = defineEmits<{ (e: 'detail', p: ParentTask): void }>();

const platformOptions = ['发布平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];
const typeOptions = ['任务类型', '快速铺货', '商品铺货', '商品发布', '批量上架', '自动定价', '自动换图'];
const channelOptions = ['全部', '智能', '蜂联'];

const parentStatusText: Record<ParentTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  done: '已完成',
};

/* 任务状态：圆环占比 + 中心数字 */
const RING_C = 2 * Math.PI * 15;
const ringPct = (p: ParentTask) => {
  const total = p.success + p.failed + p.running;
  return total > 0 ? Math.round(((p.success + p.failed) / total) * 100) : 0;
};

/* ================= 父任务列表（一级页） ================= */
interface ListFilter {
  tab: string;
  platform: string;
  channel: string;
  creator: string;
  type: string;
  shop: string;
}
const defaultListFilter: ListFilter = { tab: 'all', platform: '发布平台', channel: '全部', creator: '', type: '任务类型', shop: '' };

const tab = ref('all');
const platform = ref('发布平台');
const channel = ref('全部');
const creator = ref('');
const type = ref('任务类型');
const shop = ref('');
const applied = ref<ListFilter>({ ...defaultListFilter });

const count = (st: ParentTask['status']) => parentTasks.filter((p) => p.status === st).length;
const tabs = [
  { key: 'all', text: '全部', n: parentTasks.length },
  { key: 'queued', text: '队列中', n: count('queued') },
  { key: 'running', text: '执行中', n: count('running') },
  { key: 'done', text: '已完成', n: count('done') },
];

const snapshot = (nextTab: string): ListFilter => ({
  tab: nextTab,
  platform: platform.value,
  channel: channel.value,
  creator: creator.value.trim(),
  type: type.value,
  shop: shop.value.trim(),
});
const onTab = (key: string) => {
  tab.value = key;
  applied.value = snapshot(key);
};
const onSearch = () => { applied.value = snapshot(tab.value); };
const onReset = () => {
  platform.value = '发布平台';
  channel.value = '全部';
  creator.value = '';
  type.value = '任务类型';
  shop.value = '';
  tab.value = 'all';
  applied.value = { ...defaultListFilter };
};

const visible = computed(() => parentTasks.filter((p) => {
  const okTab = applied.value.tab === 'all' || p.status === applied.value.tab;
  const okPlatform = applied.value.platform === '发布平台' || p.subs.some((s) => s.platform === applied.value.platform);
  const okChannel = applied.value.channel === '全部' || p.channel === applied.value.channel;
  const okCreator = !applied.value.creator || p.creator.indexOf(applied.value.creator) > -1;
  const okType = applied.value.type === '任务类型' || p.type === applied.value.type;
  const okShop = !applied.value.shop || p.subs.some((s) => s.shop.indexOf(applied.value.shop) > -1);
  return okTab && okPlatform && okChannel && okCreator && okType && okShop;
}));
</script>

<template>
  <div class="tc-tabs">
    <button v-for="t in tabs" :key="t.key" class="tc-tab" :class="tab === t.key ? 'active' : ''" @click="onTab(t.key)">
      {{ t.text }}({{ t.n }})
    </button>
  </div>

  <div class="tc-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>发布平台</label>
        <BubbleSelect class-name="sg-select" :value="platform" :options="platformOptions" @change="(v: string) => (platform = v)" />
      </div>
      <div class="sg-field">
        <label>渠道</label>
        <BubbleSelect class-name="sg-select" :value="channel" :options="channelOptions" @change="(v: string) => (channel = v)" />
      </div>
      <div class="sg-field">
        <label>创建人</label>
        <input v-model="creator" class="sg-input" placeholder="请输入创建人" />
      </div>
      <div class="sg-field">
        <label>任务类型</label>
        <BubbleSelect class-name="sg-select" :value="type" :options="typeOptions" @change="(v: string) => (type = v)" />
      </div>
      <div class="sg-field">
        <label>创建时间</label>
        <TcRange />
      </div>
      <div class="sg-field">
        <label>发布店铺名称</label>
        <input v-model="shop" class="sg-input" placeholder="请输入发布店铺名称" />
      </div>
      <div class="sg-actions">
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
            <th>
              创建人/创建时间 <span class="tc-sort">⇅</span>
            </th>
            <th>任务类型</th>
            <th>任务状态</th>
            <th>发布信息</th>
            <th>执行信息</th>
            <th>渠道</th>
            <th>
              执行起止时间 <span class="tc-sort">⇅</span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visible" :key="p.id">
            <td>{{ parentTasks.indexOf(p) + 1 }}</td>
            <td>
              <div class="tc-cell-lines">
                <div>{{ p.creator }}</div>
                <div>{{ p.createTime }}</div>
              </div>
            </td>
            <td>{{ p.type }}</td>
            <td>
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
            <td>
              <div class="tc-cell-lines">
                <div>发布店铺数：{{ p.shops }}</div>
                <div>发布链接数：{{ p.links }}</div>
              </div>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div>任务成功：{{ p.success }}</div>
                <div>任务失败：{{ p.failed }}</div>
                <div>执行中：{{ p.running }}</div>
              </div>
            </td>
            <td>{{ p.channel }}</td>
            <td>
              <div class="tc-cell-lines">
                <div>起：{{ p.startTime || '–' }}</div>
                <div>止：{{ p.endTime || '–' }}</div>
              </div>
            </td>
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
