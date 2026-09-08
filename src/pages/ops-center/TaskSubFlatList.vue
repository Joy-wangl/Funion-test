<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue';
import { parentTasks, retrySub, retryShop, PLATFORM_LOGO, type ParentTask, type SubTask, type ShopResult } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import TcRange from './TcRange.vue';
import { firstStepFailed, createPageOf, shopStatusText, type CreatePageKey } from './tcSteps';
import TcExecInfo from './TcExecInfo.vue';

const platformOptions = ['全部', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];
const typeOptions = ['全部', '快速铺货', '商品铺货', '商品发布', '批量上架', '自动定价', '自动换图'];
const channelOptions = ['全部', '智能', '蜂联'];

/* ================= 按任务详情（扁平子任务列表） ================= */
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
  platform: '全部',
  channel: '全部',
  type: '全部',
  shop: '',
  retried: '全部',
};

const tab = ref('all');
const chip = ref('全部');
const creator = ref('');
const platform = ref('全部');
const channel = ref('全部');
const type = ref('全部');
const shop = ref('');
const retried = ref('全部');
const applied = ref<FlatFilter>({ ...defaultFlatFilter });
const checked = ref<string[]>([]);

const count = (st: SubTask['status']) => flatAll.value.filter((r) => r.sub.status === st).length;
const tabs = computed(() => [
  { key: 'all', text: '全部', n: flatAll.value.length },
  { key: 'queued', text: '队列中', n: count('queued') },
  { key: 'running', text: '执行中', n: count('running') },
  { key: 'done', text: '已完成', n: count('success') },
  { key: 'failed', text: '执行失败', n: count('failed') },
]);

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
  platform.value = '全部';
  channel.value = '全部';
  type.value = '全部';
  shop.value = '';
  retried.value = '全部';
  tab.value = 'all';
  checked.value = [];
  applied.value = { ...defaultFlatFilter };
};
const onBatchRetry = () => {
  if (!checked.value.length) {
    alert('请先勾选需要重试的任务');
    return;
  }
  const subs = visible.value.filter((r) => checked.value.includes(`${r.parent.id}-${r.sub.id}`));
  checked.value = [];
  subs.forEach((r) => retrySub(r.sub));
  pushToast(`重试中…（${subs.length} 个任务）`);
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
/* 单条重试：与个人商品库-关联发布任务抽屉同源联动 */
const retryOne = (s: SubTask) => {
  retrySub(s);
  pushToast('重试中…');
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
/* 店铺级重试：仅重跑该失败店铺 */
const retryShopOne = (s: SubTask, sp: ShopResult) => {
  retryShop(s, sp);
  pushToast('重试中…');
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
/* 详情：除首节点失败外的任务可跳商品创建（按首个发布店铺平台映射子页） */
const opsGo = inject<(target: CreatePageKey) => void>('opsGo');
const goCreate = (s: SubTask) => opsGo?.(createPageOf(s.shops[0]?.platform ?? '淘宝'));

const visible = computed(() => flatAll.value.filter((r) => {
  const okTab =
    applied.value.tab === 'all' ||
    (applied.value.tab === 'done' ? r.sub.status === 'success' : applied.value.tab === 'failed' ? r.sub.status === 'failed' : r.sub.status === applied.value.tab);
  /* 失败原因/是否重试：任一店铺结果命中即可 */
  const okChip = applied.value.tab !== 'failed' || applied.value.chip === '全部' || r.sub.shops.some((x) => x.reason === applied.value.chip);
  const okCreator = !applied.value.creator || r.parent.creator.indexOf(applied.value.creator) > -1;
  const okPlatform = applied.value.platform === '全部' || r.sub.shops.some((x) => x.platform === applied.value.platform);
  const okChannel = applied.value.channel === '全部' || r.parent.channel === applied.value.channel;
  const okType = applied.value.type === '全部' || r.parent.type === applied.value.type;
  const okShop = !applied.value.shop || r.sub.shops.some((x) => x.shop.indexOf(applied.value.shop) > -1);
  const okRetried = applied.value.retried === '全部' || r.sub.shops.some((x) => (applied.value.retried === '是') === x.retried);
  return okTab && okChip && okCreator && okPlatform && okChannel && okType && okShop && okRetried;
}));

const isFailed = computed(() => tab.value === 'failed');
const allChecked = computed(() => paged.value.length > 0 && paged.value.every((r) => checked.value.includes(`${r.parent.id}-${r.sub.id}`)));
const toggleAll = () => { checked.value = allChecked.value ? [] : paged.value.map((r) => `${r.parent.id}-${r.sub.id}`); };
const toggleOne = (key: string, on: boolean) => { checked.value = on ? [...checked.value, key] : checked.value.filter((x) => x !== key); };

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
watch([applied, pageSize], () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });
watch(pageCount, (v) => { if (page.value > v) page.value = v; });

/* 商品维度展开：查看每个店铺的发布任务执行情况（含失败原因） */
const expanded = ref<string[]>([]);
const rowKey = (r: FlatRow) => `${r.parent.id}-${r.sub.id}`;
const toggleExpand = (k: string) => { expanded.value = expanded.value.includes(k) ? expanded.value.filter((x) => x !== k) : [...expanded.value, k]; };
/* 失败 tab：当前页自动展开店铺级失败明细，免逐行点开即可定位原因与重试 */
watch([applied, page, pageSize], () => {
  if (applied.value.tab === 'failed') expanded.value = paged.value.map((r) => rowKey(r));
});
const shopStCls: Record<SubTask['status'], string> = { queued: 'queued', running: 'running', success: 'done', failed: 'failed' };
const colSpan = computed(() => (isFailed.value ? 10 : 9));
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
            <th class="tc-expander-th" />
            <th :style="{ width: '64px' }">序号</th>
            <th>商品信息</th>
            <th>任务信息</th>
            <th>执行信息</th>
            <th>任务状态</th>
            <th>创建信息</th>
            <th>
              执行起止时间 <span class="tc-sort">⇅</span>
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(r, i) in paged" :key="`${r.parent.id}-${r.sub.id}`">
          <tr>
            <td v-if="isFailed">
              <input
                type="checkbox"
                class="ib-check"
                :checked="checked.includes(`${r.parent.id}-${r.sub.id}`)"
                @change="toggleOne(`${r.parent.id}-${r.sub.id}`, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td>
              <button
                type="button"
                class="tc-expander-btn"
                :class="expanded.includes(rowKey(r)) ? 'open' : ''"
                :title="expanded.includes(rowKey(r)) ? '收起' : '展开发布店铺任务'"
                @click="toggleExpand(rowKey(r))"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            </td>
            <td>{{ pageNo + i + 1 }}</td>
            <td>
              <div class="tc-product">
                <img class="tc-thumb" :src="r.sub.thumb" />
                <div>
                  <div class="tc-pname">{{ r.sub.name }}</div>
                  <div class="tc-pmeta">竞品链接：{{ r.sub.linkId }}</div>
                </div>
              </div>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div><span class="k">任务类型</span>：{{ r.parent.type }}</div>
                <div><span class="k">任务ID</span>：{{ String(r.sub.taskId).padStart(6, '0') }}</div>
              </div>
            </td>
            <td>
              <TcExecInfo :sub="r.sub" />
            </td>
            <td>
              <span class="tc-st" :class="subStatusCls[r.sub.status]">
                <i />
                {{ subStatusText[r.sub.status] }}
              </span>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div><span class="k">创建人</span>：{{ r.parent.creator }}</div>
                <div><span class="k">创建时间</span>：{{ r.parent.createTime }}</div>
                <div><span class="k">渠道来源</span>：{{ r.parent.channel }}</div>
              </div>
            </td>
            <td>
              <div class="tc-cell-lines">
                <div>起：{{ r.sub.startTime || '–' }}</div>
                <div>止：{{ r.sub.endTime || '–' }}</div>
              </div>
            </td>
            <td class="actions-col">
              <a v-if="!firstStepFailed(r.sub)" class="tc-link" @click.prevent="goCreate(r.sub)">详情</a>
              <a v-if="r.sub.status === 'failed'" class="tc-link" @click.prevent="retryOne(r.sub)">重试</a>
              <span v-if="firstStepFailed(r.sub) && r.sub.status !== 'failed'" class="tc-dash">–</span>
            </td>
          </tr>
          <tr v-if="expanded.includes(rowKey(r))" class="tc-expand-tr">
            <td :colspan="colSpan">
              <table class="tc-matrix">
                <thead>
                  <tr>
                    <th :style="{ width: '120px' }">平台</th>
                    <th>店铺名称</th>
                    <th :style="{ width: '110px' }">任务状态</th>
                    <th>失败原因</th>
                    <th :style="{ width: '220px' }">执行起止时间</th>
                    <th :style="{ width: '70px' }">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="sp in r.sub.shops" :key="sp.platform + sp.shop">
                    <td>
                      <span class="tc-plat-chip">
                        <img :src="PLATFORM_LOGO[sp.platform]" :alt="sp.platform" />
                        {{ sp.platform }}
                      </span>
                    </td>
                    <td>{{ sp.shop }}</td>
                    <td>
                      <span class="tc-st" :class="shopStCls[sp.status]"><i />{{ shopStatusText[sp.status] }}</span>
                    </td>
                    <td>
                      <span class="tc-expand-reason" :class="sp.status === 'failed' ? 'fail' : ''">{{ sp.status === 'failed' ? sp.reason || '其它' : '–' }}</span>
                    </td>
                    <td>
                      <span class="tc-expand-time">
                        <span>起：{{ sp.startTime || '–' }}</span>
                        <span>止：{{ sp.endTime || '–' }}</span>
                      </span>
                    </td>
                    <td>
                      <a v-if="sp.status === 'failed'" class="tc-link" @click.prevent="retryShopOne(r.sub, sp)">重试</a>
                      <span v-else class="tc-dash">–</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          </template>
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
</template>
