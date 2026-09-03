<script setup lang="ts">
import { computed, ref } from 'vue';
import { createTaobaoRows, createJmRows, parentTasks, retrySub, PUB_NO_STRATEGY, PUB_STRATEGIES, PUB_SHOPS, PUB_SHOP_PLATFORMS } from './data';
import type { CreateRow, SubTask } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import MoreActions from '../../components/MoreActions.vue';
import SortTh from '../../components/SortTh.vue';
import CreateDetailPage from './CreateDetailPage.vue';
import JmCreateDetailPage from './JmCreateDetailPage.vue';
import { pushToast } from '../../components/toast';
import { stepsOf, stepLabels } from './tcSteps';

/** 商品创建页（jm=京麦平台：列表同源结构，详情走京麦接口字段页） */
const props = defineProps<{ jm?: boolean }>();
const rows = ref<CreateRow[]>(props.jm ? createJmRows : createTaobaoRows);
/* 详情态：复用内部商机/店铺商品详情样式 */
const detail = ref<CreateRow | null>(null);
/* 发布到：两步抽屉（第一步选择策略 → 第二步选择店铺） */
const pubTo = ref<CreateRow | null>(null);
const pubStep = ref<1 | 2>(1);
const pubStrategy = ref(PUB_NO_STRATEGY);
const pubMethod = ref('');
const pubShopQ = ref('');
const pubShopPlatform = ref(PUB_SHOP_PLATFORMS[0]);
const pubGroupOpen = ref(true);
const pubShopChecked = ref<number[]>([]);
const openPubTo = (row: CreateRow) => {
  pubTo.value = row;
  pubStep.value = 1;
  pubStrategy.value = PUB_NO_STRATEGY;
  pubMethod.value = '';
  pubShopQ.value = '';
  pubShopPlatform.value = PUB_SHOP_PLATFORMS[0];
  pubGroupOpen.value = true;
  pubShopChecked.value = [];
};
/* 选中策略后展示策略定义的发布/利润/推广信息；不使用策略时发布方式必填 */
const pubStrategyInfo = computed(() => PUB_STRATEGIES.find((s) => s.name === pubStrategy.value) ?? null);
const pubNextEnabled = computed(() => !!pubStrategyInfo.value || pubMethod.value !== '');
const pubShopsVisible = computed(() => {
  const q = pubShopQ.value.trim();
  return PUB_SHOPS.filter((s) => s.platform === pubShopPlatform.value && (!q || s.name.includes(q) || '未分组店铺'.includes(q)));
});
const pubAllChecked = computed(() => pubShopsVisible.value.length > 0 && pubShopsVisible.value.every((s) => pubShopChecked.value.includes(s.id)));
const togglePubShop = (id: number, on: boolean) => {
  pubShopChecked.value = on ? [...pubShopChecked.value, id] : pubShopChecked.value.filter((x) => x !== id);
};
const toggleAllPubShops = (on: boolean) => {
  const ids = pubShopsVisible.value.map((s) => s.id);
  pubShopChecked.value = on ? [...new Set([...pubShopChecked.value, ...ids])] : pubShopChecked.value.filter((x) => !ids.includes(x));
};
const submitPub = () => {
  const n = pubShopChecked.value.length;
  pubTo.value = null;
  pushToast(`已发布到 ${n} 个店铺`);
};
const PUB_LOGOS: Record<string, string> = { 淘宝: 'taobao', 天猫: 'tmall', 拼多多: 'pinduoduo', 抖音: 'douyin', 快手: 'kuaishou' };
const pubLogo = (p: string) => `/logos/${PUB_LOGOS[p] ?? 'taobao'}.png`;
/* 删除二次确认 */
const delRow = ref<CreateRow | null>(null);
/* 关联发布任务：抽屉展示该商品在任务中心的发布批次（同源联动，重试同步任务列表状态） */
const pubRow = ref<CreateRow | null>(null);
const pubTasks = computed<SubTask[]>(() => parentTasks.find((p) => p.pubFor === pubRow.value?.link)?.subs ?? []);
const pubSortAsc = ref(true);
const openPubDrawer = (row: CreateRow) => {
  pubRow.value = row;
  pubSortAsc.value = true;
  resetPubFilter();
  pubChecked.value = [];
};
const sortedPubTasks = computed(() => [...pubTasks.value].sort((a, b) => (pubSortAsc.value ? a.startTime.localeCompare(b.startTime) : b.startTime.localeCompare(a.startTime))));
/* 商品全局唯一，抽到列表上方摘要区；表格留变化列，任务状态 tab 即切即筛 */
const pubLinkId = computed(() => pubTasks.value[0]?.linkId ?? '');
const pubLastUpdate = computed(() => {
  const ts = pubTasks.value.map((t) => t.endTime).filter(Boolean).sort();
  return ts.length ? ts[ts.length - 1] : '–';
});
const pubTab = ref('all');
const pubTabs = computed(() => [
  { key: 'all', text: '全部', n: pubTasks.value.length },
  { key: 'queued', text: '队列中', n: pubTasks.value.filter((s) => s.status === 'queued').length },
  { key: 'running', text: '执行中', n: pubTasks.value.filter((s) => s.status === 'running').length },
  { key: 'done', text: '已完成', n: pubTasks.value.filter((s) => s.status === 'success').length },
  { key: 'failed', text: '执行失败', n: pubTasks.value.filter((s) => s.status === 'failed').length },
]);
const visiblePubTasks = computed(() => sortedPubTasks.value.filter((s) => {
  return pubTab.value === 'all' || (pubTab.value === 'done' ? s.status === 'success' : s.status === pubTab.value);
}));
const resetPubFilter = () => {
  pubTab.value = 'all';
};
/* 选择列：仅失败任务可勾选，勾选后支持批量重新发布 */
const pubChecked = ref<number[]>([]);
const failedVisible = computed(() => visiblePubTasks.value.filter((s) => s.status === 'failed'));
const allFailedChecked = computed(() => failedVisible.value.length > 0 && failedVisible.value.every((s) => pubChecked.value.includes(s.id)));
const togglePubCheck = (id: number, on: boolean) => {
  pubChecked.value = on ? [...pubChecked.value, id] : pubChecked.value.filter((x) => x !== id);
};
const toggleAllFailed = (on: boolean) => {
  const ids = failedVisible.value.map((s) => s.id);
  pubChecked.value = on ? [...new Set([...pubChecked.value, ...ids])] : pubChecked.value.filter((x) => !ids.includes(x));
};
const batchRetryPub = () => {
  if (!pubChecked.value.length) {
    pushToast('请先勾选需要重新发布的任务');
    return;
  }
  const subs = pubTasks.value.filter((s) => pubChecked.value.includes(s.id));
  pubChecked.value = [];
  subs.forEach((s) => retrySub(s));
  pushToast('重新发布中…');
  window.setTimeout(() => pushToast(`重新发布成功（${subs.length} 个任务）`), 1200);
};
const pubStatusText: Record<SubTask['status'], string> = { queued: '队列中', running: '执行中', success: '已完成', failed: '执行失败' };
const pubStatusCls: Record<SubTask['status'], string> = { queued: 'queued', running: 'running', success: 'done', failed: 'failed' };
const retryPub = (sub: SubTask) => {
  pubChecked.value = pubChecked.value.filter((x) => x !== sub.id);
  retrySub(sub);
  pushToast('重新发布中…');
  window.setTimeout(() => pushToast('重新发布成功'), 1200);
};

/* 详情查看态入口：打开同一抽屉 */
const openPubFromDetail = () => {
  if (detail.value) openPubDrawer(detail.value);
};

const copyRow = (row: CreateRow) => {
  rows.value = rows.value.flatMap((r) => (r.link === row.link ? [r, { ...r, link: `${row.link}-copy-${Date.now()}` }] : [r]));
};
const confirmDelete = () => {
  if (!delRow.value) return;
  const link = delRow.value.link;
  rows.value = rows.value.filter((r) => r.link !== link);
  delRow.value = null;
};
</script>

<template>
  <JmCreateDetailPage v-if="detail && props.jm" :row="detail" @back="detail = null" @open-pub="openPubFromDetail" />
  <CreateDetailPage v-else-if="detail" :row="detail" @back="detail = null" @open-pub="openPubFromDetail" />
  <div v-else class="create-page">
    <div class="ib-filters create-filter">
      <div class="ib-grid">
        <div class="ib-field">
          <label>商机来源</label>
          <BubbleSelect class-name="ib-select" default-value="全部" :options="['全部', '内部商机', '市场商机', '链接商品库']" />
        </div>
        <div class="ib-field">
          <label>来源平台</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="淘宝"
            :options="['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴']"
          />
        </div>
        <div class="ib-field">
          <label>链接商品ID</label>
          <input class="ib-input" placeholder="请输入链接商品ID" />
        </div>
        <div class="ib-field">
          <label>商品名称</label>
          <input class="ib-input" placeholder="请输入商品名称" />
        </div>
        <div class="ib-field">
          <label>状态</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="全部"
            :options="['全部', '已完善', '待完善']"
          />
        </div>
        <div class="ib-field">
          <label>发布店铺名</label>
          <input class="ib-input" placeholder="请输入发布店铺名" />
        </div>
        <div class="ib-field">
          <label>创建人名称</label>
          <input class="ib-input" placeholder="请输入创建人名称" />
        </div>
        <div class="ib-field">
          <label>创建时间</label>
          <div class="ib-range">
            <input class="ib-input" value="2026-08-13" />
            <span>→</span>
            <input class="ib-input" value="2026-08-13" />
          </div>
        </div>
        <div class="create-actions-inline">
          <div class="create-act-left">
            <button class="primaryBtn">快速铺货</button>
            <button class="primaryBtn">竞品导入</button>
          </div>
          <div class="create-act-right">
            <button class="lightBtn">重置</button>
            <button class="primaryBtn">查询</button>
          </div>
        </div>
      </div>
    </div>

    <div class="ib-table-card">
      <div class="ib-table-wrap">
        <table class="ib-table create-table">
          <thead>
            <tr>
              <th>商品信息</th>
              <th>上架店铺</th>
              <th>状态</th>
              <th>创建人 / 创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="row.link">
              <td>
                <div class="create-product">
                  <img class="create-thumb" :src="row.thumb" alt="thumb" />
                  <div>
                    <div class="create-product-title">
                      <span class="create-platform-badge sm" :class="props.jm ? 'jm' : 'taobao'">
                        {{ row.platformBadge }}
                      </span>
                      <Ellipsis class-name="create-title-ell" :text="row.title" />
                    </div>
                    <div class="create-link">
                      竞品链接：<a href="#"><Ellipsis class-name="create-link-ell" :text="row.link" /></a>
                    </div>
                  </div>
                </div>
              </td>
              <td class="create-store-text">{{ row.store }}</td>
              <td>
                <span class="sgd-tag" :class="i % 2 ? 'orange' : 'green'">{{ i % 2 ? '待完善' : '已完善' }}</span>
              </td>
              <td>
                <div class="create-person">{{ row.person }}</div>
                <div class="create-time">{{ row.time }}</div>
              </td>
              <td class="create-ops">
                <a href="#" @click.prevent="detail = row">详情</a>
                <a
                  href="#"
                  @click.prevent="openPubTo(row)"
                >
                  发布到
                </a>
                <MoreActions
                  :items="[
                    { label: '关联发布任务', onClick: () => openPubDrawer(row) },
                    { label: '复制', onClick: () => copyRow(row) },
                    { label: '删除', danger: true, onClick: () => (delRow = row) },
                  ]"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 128 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn">2</button>
          <button class="ib-pagebtn">3</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="delRow" class="cp-modal-mask">
        <div class="cp-modal">
          <div class="cp-modal-title">删除确认</div>
          <div class="cp-modal-text">商品模版删除后无法恢复，是否确认删除？</div>
          <div class="cp-modal-foot">
            <button class="cp-btn" @click="delRow = null">取消</button>
            <button
              class="cp-btn danger"
              @click="confirmDelete"
            >
              确认删除
            </button>
          </div>
        </div>
      </div>

    </Teleport>
  </div>

  <!-- 关联发布任务抽屉：置于 .ops-center 内复用 tc-table 样式；与列表/详情并列，详情查看态亦可打开 -->
  <div v-if="pubRow" class="cp-drawer-mask" @click="pubRow = null" />
    <div v-if="pubRow" class="cp-drawer">
      <div class="cp-drawer-head">
        <span>关联发布任务</span>
        <button type="button" title="关闭" @click="pubRow = null">✕</button>
      </div>
      <div class="cp-drawer-body">
        <div class="cp-drawer-summary">
          <img class="tc-thumb" :src="pubRow.thumb" />
          <div class="cp-sum-main">
            <div class="cp-sum-name">{{ pubRow.title }}</div>
            <div class="cp-sum-meta">竞品链接：{{ pubLinkId }}</div>
          </div>
          <div class="cp-sum-item">
            <label>最近更新时间</label>
            <span>{{ pubLastUpdate }}</span>
          </div>
        </div>
        <div class="cp-drawer-filter">
          <div class="tc-tabs cp-f-tabs">
            <button
              v-for="t in pubTabs"
              :key="t.key"
              class="tc-tab"
              :class="pubTab === t.key ? 'active' : ''"
              @click="pubTab = t.key"
            >
              {{ t.text }}<span class="tc-count">{{ t.n }}</span>
            </button>
          </div>
          <button class="cp-repub-btn" @click="batchRetryPub">重新发布</button>
        </div>
        <table class="tc-table tc-detail">
          <thead>
            <tr>
              <th :style="{ width: '48px' }">
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="allFailedChecked"
                  @change="toggleAllFailed(($event.target as HTMLInputElement).checked)"
                />
              </th>
              <th>任务ID</th>
              <th>发布信息</th>
              <th>任务状态</th>
              <th>节点状态</th>
              <SortTh label="执行起止时间" :state="pubSortAsc ? 'asc' : 'desc'" @sort="pubSortAsc = !pubSortAsc" />
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in visiblePubTasks" :key="s.id">
              <td>
                <input
                  v-if="s.status === 'failed'"
                  type="checkbox"
                  class="ib-check"
                  :checked="pubChecked.includes(s.id)"
                  @change="togglePubCheck(s.id, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td>{{ String(s.taskId).padStart(6, '0') }}</td>
              <td>
                <div class="tc-cell-lines">
                  <div>{{ s.publisher || '–' }}</div>
                  <div>{{ s.shop }}</div>
                </div>
              </td>
              <td>
                <span class="tc-st" :class="pubStatusCls[s.status]"><i />{{ pubStatusText[s.status] }}</span>
              </td>
              <td>
                <div class="tc-steps" :class="s.status === 'queued' ? 'gray' : ''">
                  <div v-for="(st, si) in stepsOf(s)" :key="stepLabels[si]" class="tc-step">
                    <i :class="st.dot" />
                    <span>{{ stepLabels[si] }}：</span>
                    <span class="v" :class="st.cls">{{ st.v }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="tc-cell-lines">
                  <div>起：{{ s.startTime || '–' }}</div>
                  <div>止：{{ s.endTime || '–' }}</div>
                </div>
              </td>
              <td class="actions-col">
                <a v-if="s.status === 'failed'" class="tc-link" @click.prevent="retryPub(s)">重试</a>
                <span v-else class="tc-dash">–</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  <!-- 发布到抽屉：第一步选择策略 → 第二步选择店铺 -->
  <div v-if="pubTo" class="cp-drawer-mask" @click="pubTo = null" />
  <div v-if="pubTo" class="cp-pub-drawer">
    <template v-if="pubStep === 1">
      <div class="cp-pub-head">选择策略</div>
      <div class="cp-pub-body">
        <div class="cp-pub-label">策略名称<i>*</i></div>
        <BubbleSelect
          class-name="ib-select cp-pub-select"
          :value="pubStrategy"
          :options="[PUB_NO_STRATEGY, ...PUB_STRATEGIES.map((s) => s.name)]"
          @change="(v) => (pubStrategy = v)"
        />
        <template v-if="pubStrategyInfo">
          <div class="cp-pub-sec">发布信息</div>
          <div class="cp-pub-kv-row">
            <div class="cp-pub-kv"><label>发布方式：</label><b>{{ pubStrategyInfo.pubMethod }}</b></div>
          </div>
          <div class="cp-pub-sec">利润信息</div>
          <div class="cp-pub-kv-row">
            <div class="cp-pub-kv"><label>控利方式：</label><b>{{ pubStrategyInfo.profitMode }}</b></div>
            <div class="cp-pub-kv"><label>利润率：</label><b>{{ pubStrategyInfo.profitRate }}</b></div>
          </div>
          <div class="cp-pub-sec">推广信息</div>
          <div class="cp-pub-kv-row">
            <div class="cp-pub-kv"><label>是否推广：</label><b>{{ pubStrategyInfo.promote }}</b></div>
            <div class="cp-pub-kv"><label>出价方式：</label><b>{{ pubStrategyInfo.bidMode }}</b></div>
            <div class="cp-pub-kv"><label>出价目标：</label><b>{{ pubStrategyInfo.bidTarget }}</b></div>
            <div class="cp-pub-kv"><label>目标投产比：</label><b>{{ pubStrategyInfo.roi }}</b></div>
            <div class="cp-pub-kv"><label>预算类型：</label><b>{{ pubStrategyInfo.budgetType }}</b></div>
            <div class="cp-pub-kv"><label>每日预算：</label><b>{{ pubStrategyInfo.dailyBudget }}</b></div>
          </div>
        </template>
        <template v-else>
          <div class="cp-pub-label mt">发布方式<i>*</i></div>
          <div class="cp-pub-radios">
            <label><input v-model="pubMethod" type="radio" value="直接上架" />直接上架</label>
            <label><input v-model="pubMethod" type="radio" value="放入仓库" />放入仓库</label>
          </div>
        </template>
      </div>
      <div class="cp-pub-foot">
        <button class="cp-btn" @click="pubTo = null">取消</button>
        <button class="cp-btn primary" :disabled="!pubNextEnabled" @click="pubStep = 2">下一步</button>
      </div>
    </template>
    <template v-else>
      <div class="cp-pub-head">批量铺货（1 件商品）</div>
      <div class="cp-pub-body">
        <div class="cp-pub-shopbar">
          <div class="cp-pub-search">
            <input v-model="pubShopQ" class="ib-input" placeholder="店铺名称/分组名称" />
            <svg class="cp-pub-search-ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M11 4a7 7 0 110 14 7 7 0 010-14zm9 16l-4.35-4.35" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </div>
          <BubbleSelect
            class-name="ib-select cp-pub-plat"
            :value="pubShopPlatform"
            :options="PUB_SHOP_PLATFORMS"
            @change="(v) => (pubShopPlatform = v)"
          />
        </div>
        <div class="cp-pub-group">
          <div class="cp-pub-group-head">
            <label>
              <input
                type="checkbox"
                class="ib-check"
                :checked="pubAllChecked"
                @change="toggleAllPubShops(($event.target as HTMLInputElement).checked)"
              />
              <b>未分组店铺</b>
            </label>
            <button type="button" class="cp-pub-caret" @click="pubGroupOpen = !pubGroupOpen">{{ pubGroupOpen ? '▼' : '►' }}</button>
          </div>
          <template v-if="pubGroupOpen">
            <label v-for="s in pubShopsVisible" :key="s.id" class="cp-pub-shop">
              <input
                type="checkbox"
                class="ib-check"
                :checked="pubShopChecked.includes(s.id)"
                @change="togglePubShop(s.id, ($event.target as HTMLInputElement).checked)"
              />
              <img :src="pubLogo(s.platform)" alt="" />
              <span class="plat">{{ s.platform }}</span>
              <span class="name">{{ s.name }}</span>
            </label>
            <div v-if="pubShopsVisible.length === 0" class="cp-pub-empty">暂无店铺</div>
          </template>
        </div>
      </div>
      <div class="cp-pub-foot">
        <button class="cp-btn" @click="pubStep = 1">上一步</button>
        <button class="cp-btn primary" :disabled="pubShopChecked.length === 0" @click="submitPub">立即发布</button>
      </div>
    </template>
  </div>
</template>
