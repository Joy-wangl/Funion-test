<script setup lang="ts">
import { computed, ref } from 'vue';
import { createTaobaoRows, buildCreatePubTasks } from './data';
import type { CreateRow, SubTask } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import MoreActions from '../../components/MoreActions.vue';
import CreateDetailPage from './CreateDetailPage.vue';
import { useAnchorPop } from '../../hooks/useAnchorPop';
import { pushToast } from '../../components/toast';
import { stepsOf, stepLabels } from './tcSteps';

/** 商品创建页 */
const rows = ref<CreateRow[]>(createTaobaoRows);
/* 详情态：复用内部商机/店铺商品详情样式 */
const detail = ref<CreateRow | null>(null);
/* 发布到：点击后气泡展示平台选项（滚动时跟随触发链接） */
const { pos: pubTip, open, close: closePubTip } = useAnchorPop();
/* 删除二次确认 */
const delRow = ref<CreateRow | null>(null);
/* 关联发布任务：抽屉展示该商品的发布任务列表，失败可重试重新发布 */
const pubRow = ref<CreateRow | null>(null);
const pubTasks = ref<SubTask[]>([]);
const pubSortAsc = ref(true);
const openPubDrawer = (row: CreateRow) => {
  pubRow.value = row;
  pubTasks.value = buildCreatePubTasks(row, rows.value.indexOf(row) + 1);
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
  subs.forEach((s) => {
    s.status = 'running';
    s.endTime = '';
  });
  pushToast('重新发布中…');
  window.setTimeout(() => {
    subs.forEach((s) => {
      s.status = 'success';
      s.failStep = undefined;
      s.reason = '';
      s.endTime = '2026-04-04 12:09:00';
    });
    pushToast(`重新发布成功（${subs.length} 个任务）`);
  }, 1200);
};
const pubStatusText: Record<SubTask['status'], string> = { queued: '队列中', running: '执行中', success: '已完成', failed: '执行失败' };
const pubStatusCls: Record<SubTask['status'], string> = { queued: 'queued', running: 'running', success: 'done', failed: 'failed' };
const retryPub = (sub: SubTask) => {
  sub.status = 'running';
  sub.endTime = '';
  pubChecked.value = pubChecked.value.filter((x) => x !== sub.id);
  pushToast('重新发布中…');
  window.setTimeout(() => {
    sub.status = 'success';
    sub.failStep = undefined;
    sub.reason = '';
    sub.endTime = '2026-04-04 12:09:00';
    pushToast('重新发布成功');
  }, 1200);
};

const openPubTip = (e: MouseEvent) => {
  e.stopPropagation();
  open(e.currentTarget as HTMLElement);
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
  <CreateDetailPage v-if="detail" :row="detail" @back="detail = null" />
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
                      <span class="create-platform-badge taobao sm">
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
                  @click.prevent="openPubTip"
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
      <div
        v-if="pubTip"
        class="add-pop"
        :style="{ left: `${pubTip.x}px`, top: `${pubTip.y}px` }"
        @mousedown.stop
      >
        <div class="add-pop-title">发布到指定店铺</div>
        <div v-for="t in ['淘宝心选店', '天猫Funion旗舰店', 'AAA小店']" :key="t" class="add-pop-item" @click="closePubTip()">
          {{ t }}
        </div>
      </div>

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

    <!-- 关联发布任务抽屉：置于 .ops-center 内以复用 tc-table 表格样式 -->
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
          <button class="primaryBtn cp-repub-btn" @click="batchRetryPub">重新发布</button>
        </div>
        <table class="tc-table tc-detail">
          <thead>
            <tr>
              <th :style="{ width: '64px' }">
                <label class="tc-check">
                  <input
                    type="checkbox"
                    class="ib-check"
                    :checked="allFailedChecked"
                    @change="toggleAllFailed(($event.target as HTMLInputElement).checked)"
                  />
                  选择
                </label>
              </th>
              <th>任务ID</th>
              <th>任务状态</th>
              <th>节点状态</th>
              <th class="cp-sort-th" @click="pubSortAsc = !pubSortAsc">执行起止时间 <span class="tc-sort">⇅</span></th>
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
              <td class="cp-task-id">{{ String(s.id).padStart(6, '0') }}</td>
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
  </div>
</template>
