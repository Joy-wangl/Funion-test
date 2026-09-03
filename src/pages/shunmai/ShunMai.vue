<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  genTaskId,
  makeRecord,
  nowTime,
  SM_RECORD_STATUS_META,
  SM_TASK_STATUS_META,
  smRecordsSeed,
  smTasksSeed,
  type SmRecord,
  type SmRecordStatus,
  type SmTask,
  type SmTaskStatus,
} from './data';
import './ShunMai.css';

/* ---------- 登录态 ---------- */
const authed = ref(false);
const scanLoading = ref(false);
const scanText = ref('请使用淘宝 APP 扫描二维码登录');
const refreshQr = () => {
  scanLoading.value = true;
  scanText.value = '二维码刷新中…';
  setTimeout(() => {
    scanLoading.value = false;
    scanText.value = '请使用淘宝 APP 扫描二维码登录';
    pushToast('二维码已刷新');
  }, 800);
};
const onScanSuccess = () => {
  authed.value = true;
  pushToast('淘宝账号登录成功');
};

/* ---------- 侧边栏导航 ---------- */
type SmPage = 'dashboard' | 'task' | 'data';
const page = ref<SmPage>('dashboard');
const setPage = (p: SmPage) => { page.value = p; };
const dataTaskFilter = ref<SmTask | null>(null);
const taskDetail = ref<SmTask | null>(null);
const openTaskDetail = (t: SmTask) => {
  if (t.status !== 'running') return;
  taskDetail.value = t;
};
const viewTaskData = (t: SmTask) => {
  dataTaskFilter.value = t;
  recordStatus.value = 'all';
  dataPage.value = 1;
  page.value = 'data';
};

/* ---------- 任务模块 ---------- */
const tasks = ref<SmTask[]>([...smTasksSeed]);
const createOpen = ref(false);
const createName = ref('');
const createTopic = ref('');
const createCount = ref(30);

const submitCreate = () => {
  const name = createName.value.trim();
  const topic = createTopic.value.trim();
  if (!name) { pushToast('请输入任务名称', 'error'); return; }
  if (!topic) { pushToast('请输入搜索主题', 'error'); return; }
  if (!createCount.value || createCount.value <= 0) { pushToast('抓取条数需大于 0', 'error'); return; }
  tasks.value.unshift({
    id: genTaskId(),
    name,
    topic,
    targetCount: createCount.value,
    status: 'pending',
    successCount: 0,
    failCount: 0,
    createdAt: nowTime(),
  });
  createName.value = '';
  createTopic.value = '';
  createCount.value = 30;
  createOpen.value = false;
  page.value = 'task';
  pushToast('抓取任务创建成功');
};

const startNextPending = () => {
  const next = [...tasks.value].reverse().find((x) => x.status === 'pending');
  if (next) runTask(next.id);
};

const runTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  if (!t) return;
  if (t.status === 'running') { pushToast('任务正在抓取中', 'error'); return; }
  const hasRunning = tasks.value.some((x) => x.status === 'running');
  if (hasRunning) {
    t.status = 'pending';
    pushToast('已有任务执行中，已加入队列');
    return;
  }
  t.status = 'running';
  t.successCount = 0;
  t.failCount = 0;
  t.startedAt = nowTime();
  t.finishedAt = undefined;
  const timer = setInterval(() => {
    const remaining = t.targetCount - t.successCount - t.failCount;
    if (remaining <= 0) {
      clearInterval(timer);
      t.status = 'success';
      t.finishedAt = nowTime();
      pushToast(`任务 ${t.name} 已完成`);
      setTimeout(startNextPending, 300);
      return;
    }
    if (Math.random() < 0.04) {
      clearInterval(timer);
      t.status = 'fail';
      t.finishedAt = nowTime();
      pushToast(`任务 ${t.name} 抓取失败`, 'error');
      setTimeout(startNextPending, 300);
      return;
    }
    const batch = Math.min(remaining, Math.floor(Math.random() * 4) + 2);
    const fresh: SmRecord[] = [];
    for (let i = 0; i < batch; i++) {
      const ok = Math.random() > 0.15;
      if (ok) t.successCount++; else t.failCount++;
      fresh.push(makeRecord(t, ok));
    }
    records.value.unshift(...fresh);
  }, 400);
};

/* 进度辅助：百分比 / 待抓取 / 分段宽度 */
const progressPct = (t: SmTask) => (t.targetCount ? Math.round(((t.successCount + t.failCount) / t.targetCount) * 100) : 0);
const remainingOf = (t: SmTask) => Math.max(0, t.targetCount - t.successCount - t.failCount);
const segWidth = (n: number, t: SmTask) => (t.targetCount ? `${(n / t.targetCount) * 100}%` : '0%');

const deleteTask = (id: string) => {
  tasks.value = tasks.value.filter((x) => x.id !== id);
  pushToast('任务已删除');
};

/* 任务筛选 */
const taskKeyword = ref('');
const taskStatus = ref<'all' | SmTaskStatus>('all');
const taskStatusOpts = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待抓取' },
  { value: 'running', label: '抓取中' },
  { value: 'success', label: '已完成' },
  { value: 'fail', label: '失败' },
];
const resetTaskFilter = () => { taskKeyword.value = ''; taskStatus.value = 'all'; };
const filteredTasks = computed(() => {
  let list = tasks.value;
  const kw = taskKeyword.value.trim();
  if (kw) list = list.filter((t) => t.name.includes(kw) || t.topic.includes(kw));
  if (taskStatus.value !== 'all') list = list.filter((t) => t.status === taskStatus.value);
  return list;
});

/* ---------- 数据模块 ---------- */
const records = ref<SmRecord[]>([...smRecordsSeed]);
const recordStatus = ref<'all' | SmRecordStatus>('all');
const recordStatusOpts = [
  { value: 'all', label: '全部状态' },
  { value: 'success', label: '成功' },
  { value: 'fail', label: '失败' },
];
const dataKeyword = ref('');
const dataScraper = ref('all');
const dataTaskOpts = computed(() => [
  { value: 'all', label: '全部任务' },
  ...tasks.value.map((t) => ({ value: t.id, label: t.name })),
]);
const scraperOpts = computed(() => [
  { value: 'all', label: '全部抓取人' },
  ...[...new Set(records.value.map((r) => r.scraper))].map((s) => ({ value: s, label: s })),
]);
const onDataTaskChange = (v: string) => {
  dataTaskFilter.value = v === 'all' ? null : tasks.value.find((x) => x.id === v) || null;
};
const resetDataFilter = () => {
  recordStatus.value = 'all';
  dataTaskFilter.value = null;
  dataKeyword.value = '';
  dataScraper.value = 'all';
};
watch([dataKeyword, dataScraper, recordStatus, dataTaskFilter], () => { dataPage.value = 1; });

const filteredRecords = computed(() => {
  let list = records.value;
  if (dataTaskFilter.value) list = list.filter((r) => r.taskId === dataTaskFilter.value!.id);
  if (dataScraper.value !== 'all') list = list.filter((r) => r.scraper === dataScraper.value);
  const kw = dataKeyword.value.trim();
  if (kw) list = list.filter((r) => r.title.includes(kw) || r.shop.includes(kw));
  if (recordStatus.value !== 'all') list = list.filter((r) => r.status === recordStatus.value);
  return list;
});

const pageSize = ref(10);
const dataPage = ref(1);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / pageSize.value)));
const pagedRecords = computed(() => {
  const start = (dataPage.value - 1) * pageSize.value;
  return filteredRecords.value.slice(start, start + pageSize.value);
});

const viewRecord = (r: SmRecord) => pushToast(`查看记录：${r.title}`);
const importRecord = (r: SmRecord) => {
  pushToast(`已将 ${r.title} 导入到商品库`);
};
const taskNameOf = (r: SmRecord) => {
  if (!r.taskId) return '-';
  const t = tasks.value.find((x) => x.id === r.taskId);
  return t ? t.name : '-';
};
const jumpToTask = (r: SmRecord) => {
  if (!r.taskId) return;
  const t = tasks.value.find((x) => x.id === r.taskId);
  if (!t) { pushToast('关联任务不存在', 'error'); return; }
  page.value = 'task';
  taskDetail.value = t;
};
const execRange = (t: SmTask) => {
  if (!t.startedAt) return '-';
  return `${t.startedAt} ~ ${t.finishedAt || '执行中'}`;
};
const deleteRecord = (id: string) => {
  records.value = records.value.filter((r) => r.id !== id);
  pushToast('记录已删除');
};

/* ---------- 工作台概览 ---------- */
const taskStats = computed(() => ({
  total: tasks.value.length,
  pending: tasks.value.filter((t) => t.status === 'pending').length,
  running: tasks.value.filter((t) => t.status === 'running').length,
  success: tasks.value.filter((t) => t.status === 'success').length,
  fail: tasks.value.filter((t) => t.status === 'fail').length,
}));
const recordStats = computed(() => ({
  total: records.value.length,
  success: records.value.filter((r) => r.status === 'success').length,
  fail: records.value.filter((r) => r.status === 'fail').length,
}));
const recentTasks = computed(() => tasks.value.slice(0, 4));

/* ---------- 运行状态展示 ---------- */
const phoneConnected = ref(true);
const taobaoAppOpen = ref(true);
const deviceUpdating = ref(false);
const deviceUpdatedAt = ref('');
const refreshDeviceStatus = () => {
  if (deviceUpdating.value) return;
  deviceUpdating.value = true;
  setTimeout(() => {
    phoneConnected.value = Math.random() > 0.1;
    taobaoAppOpen.value = Math.random() > 0.1;
    deviceUpdatedAt.value = nowTime();
    deviceUpdating.value = false;
    pushToast('设备状态已更新');
  }, 600);
};

/* ---------- 使用教程 ---------- */
const tutorialOpen = ref(false);
const overviewItems = computed(() => [
  { label: '任务总数', value: taskStats.value.total },
  { label: '待抓取', value: taskStats.value.pending },
  { label: '抓取中', value: taskStats.value.running },
  { label: '已完成', value: taskStats.value.success },
  { label: '抓取数据', value: recordStats.value.total },
  { label: '成功记录', value: recordStats.value.success },
]);

</script>

<template>
  <div class="sm-page">
    <!-- 扫码登录 -->
    <div v-if="!authed" class="sm-login">
      <div class="sm-login-card">
        <div class="sm-login-head">
          <h1>顺买商机</h1>
          <p>淘宝顺手买 · 店铺/类目抓取与手机联动</p>
        </div>
        <div class="sm-qr-wrap" :class="{ loading: scanLoading }">
          <div class="sm-qr">
            <svg viewBox="0 0 100 100" class="sm-qr-svg">
              <rect x="10" y="10" width="25" height="25" fill="currentColor" />
              <rect x="65" y="10" width="25" height="25" fill="currentColor" />
              <rect x="10" y="65" width="25" height="25" fill="currentColor" />
              <rect x="40" y="40" width="8" height="8" fill="currentColor" />
              <rect x="55" y="55" width="8" height="8" fill="currentColor" />
              <rect x="40" y="55" width="8" height="8" fill="currentColor" />
              <rect x="70" y="70" width="8" height="8" fill="currentColor" />
              <rect x="82" y="82" width="8" height="8" fill="currentColor" />
            </svg>
          </div>
          <p class="sm-qr-tip">{{ scanText }}</p>
        </div>
        <div class="sm-login-actions">
          <button class="sm-btn" @click="refreshQr">刷新二维码</button>
          <button class="sm-btn primary" @click="onScanSuccess">模拟扫码成功</button>
        </div>
      </div>
    </div>

    <!-- 主应用：侧边栏 + 工作台 -->
    <div v-else class="sm-layout">
      <aside class="sm-sidebar">
        <div class="sm-side-head">
          <div class="sm-side-logo">顺买商机</div>
          <div class="sm-side-sub">店铺/类目抓取</div>
        </div>
        <nav class="sm-side-nav">
          <div class="sm-nav-item" :class="{ active: page === 'dashboard' }" @click="setPage('dashboard')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>
            <span>工作台</span>
          </div>
          <div class="sm-nav-item" :class="{ active: page === 'task' }" @click="setPage('task')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            <span>抓取任务</span>
          </div>
          <div class="sm-nav-item" :class="{ active: page === 'data' }" @click="dataTaskFilter = null; setPage('data')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" /><path d="M3 7l9 6 9-6" /></svg>
            <span>抓取数据</span>
          </div>

        </nav>
        <div class="sm-side-foot">
          <button class="sm-btn ghost" @click="authed = false">退出登录</button>
        </div>
      </aside>

      <main class="sm-main">
        <!-- 头部 -->
        <header class="sm-main-head">
          <div>
            <h2>{{ { dashboard: '工作台', task: '抓取任务', data: '抓取数据' }[page] }}</h2>
            <p class="sm-breadcrumb">
              顺买商机
              <span> / {{ { dashboard: '工作台', task: '抓取任务', data: '抓取数据' }[page] }}</span>
            </p>
          </div>
          <div class="sm-head-actions">
            <button class="sm-btn" @click="tutorialOpen = true">使用教程</button>
            <button class="sm-btn primary" @click="createOpen = true">新建任务</button>
          </div>
        </header>

        <!-- 工作台 -->
        <div v-if="page === 'dashboard'" class="sm-content">
          <div class="sm-dashboard-top">
            <div class="sm-ov-panel">
              <div class="sm-panel-head">数据概览</div>
              <div class="sm-flat-grid">
                <div v-for="item in overviewItems" :key="item.label" class="sm-flat-card">
                  <div class="k">{{ item.label }}</div>
                  <div class="v">{{ item.value }}</div>
                </div>
              </div>
            </div>
            <div class="sm-device-panel">
              <div class="sm-panel-head">
                <span>设备状态</span>
                <button class="sm-refresh-btn" :class="{ spinning: deviceUpdating }" @click="refreshDeviceStatus">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                  更新状态
                </button>
              </div>
              <div class="sm-device-list">
                <div class="sm-device-card" :class="{ ok: phoneConnected }">
                  <div class="sm-device-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
                  </div>
                  <div class="sm-device-info">
                    <div class="k"><i class="status-dot" :style="{ background: phoneConnected ? '#16a34a' : '#dc2626' }" />手机连接状态</div>
                    <div class="v">{{ phoneConnected ? '已连接' : '未连接' }}</div>
                  </div>
                </div>
                <div class="sm-device-card" :class="{ ok: taobaoAppOpen }">
                  <div class="sm-device-icon">
                    <img class="sm-taobao-logo" :class="{ off: !taobaoAppOpen }" src="/logos/taobao.png" alt="淘宝" />
                  </div>
                  <div class="sm-device-info">
                    <div class="k"><i class="status-dot" :style="{ background: taobaoAppOpen ? '#16a34a' : '#dc2626' }" />淘宝应用打开状态</div>
                    <div class="v">{{ taobaoAppOpen ? '已打开' : '未打开' }}</div>
                  </div>
                </div>
              </div>
              <div class="sm-device-foot">更新于 {{ deviceUpdatedAt || '--' }}</div>
            </div>
          </div>

          <div class="sm-section-title">最近任务</div>
          <div class="sm-card">
            <div class="sm-table-wrap">
              <table class="sm-table sm-table-compact">
                <thead>
                  <tr><th>任务名称</th><th>搜索主题</th><th>状态</th><th>进度</th><th>创建时间</th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in recentTasks" :key="t.id">
                    <td>{{ t.name }}</td>
                    <td>{{ t.topic }}</td>
                    <td>
                      <span class="sm-tag" :style="{ color: SM_TASK_STATUS_META[t.status].color, background: SM_TASK_STATUS_META[t.status].bg }">
                        {{ SM_TASK_STATUS_META[t.status].label }}
                      </span>
                    </td>
                    <td>
                      <div class="sm-progress">
                        <div class="sm-progress-track stacked">
                          <div class="seg ok" :style="{ width: segWidth(t.successCount, t) }" />
                          <div class="seg fail" :style="{ width: segWidth(t.failCount, t) }" />
                          <div class="seg pend" :style="{ width: segWidth(remainingOf(t), t) }" />
                        </div>
                        <span>{{ progressPct(t) }}%</span>
                      </div>
                      <div class="sm-progress-meta">
                        <span>总 {{ t.targetCount }}</span>
                        <span class="ok">成 {{ t.successCount }}</span>
                        <span class="fail">败 {{ t.failCount }}</span>
                        <span class="pend">待 {{ remainingOf(t) }}</span>
                      </div>
                    </td>
                    <td>{{ t.createdAt }}</td>
                  </tr>
                  <tr v-if="recentTasks.length === 0">
                    <td colspan="5" class="sm-empty-cell">暂无任务</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="sm-card-foot">
              <a href="javascript:void(0)" @click="setPage('task')">查看全部任务 →</a>
            </div>
          </div>
        </div>

        <!-- 抓取任务 -->
        <div v-if="page === 'task'" class="sm-content">
          <div class="sm-card">
            <div class="sm-card-head">
              <h3>任务列表</h3>
              <div class="sm-filter-inline">
                <input v-model="taskKeyword" class="sm-input sm-input-search" placeholder="搜索任务名称/主题" />
                <BubbleSelect class-name="sm-select" :value="taskStatus" :options="taskStatusOpts" @change="(v) => taskStatus = v as 'all' | SmTaskStatus" />
                <button class="sm-btn" @click="resetTaskFilter">重置</button>
                <span class="sm-count">共 {{ filteredTasks.length }} 个任务</span>
              </div>
            </div>
            <div class="sm-table-wrap">
              <table class="sm-table">
                <thead>
                  <tr><th>任务名称</th><th>搜索主题</th><th>状态</th><th>进度</th><th>抓取条数</th><th>创建时间</th><th>执行时间</th><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="t in filteredTasks" :key="t.id">
                    <td>{{ t.name }}</td>
                    <td>{{ t.topic }}</td>
                    <td>
                      <span
                        class="sm-tag"
                        :class="{ clickable: t.status === 'running' }"
                        :style="{ color: SM_TASK_STATUS_META[t.status].color, background: SM_TASK_STATUS_META[t.status].bg }"
                        @click="openTaskDetail(t)"
                      >
                        {{ SM_TASK_STATUS_META[t.status].label }}
                      </span>
                    </td>
                    <td>
                      <div class="sm-progress">
                        <div class="sm-progress-track stacked">
                          <div class="seg ok" :style="{ width: segWidth(t.successCount, t) }" />
                          <div class="seg fail" :style="{ width: segWidth(t.failCount, t) }" />
                          <div class="seg pend" :style="{ width: segWidth(remainingOf(t), t) }" />
                        </div>
                        <span>{{ progressPct(t) }}%</span>
                      </div>
                      <div class="sm-progress-meta">
                        <span>总 {{ t.targetCount }}</span>
                        <span class="ok">成 {{ t.successCount }}</span>
                        <span class="fail">败 {{ t.failCount }}</span>
                        <span class="pend">待 {{ remainingOf(t) }}</span>
                      </div>
                    </td>
                    <td>{{ t.targetCount }}</td>
                    <td>{{ t.createdAt }}</td>
                    <td class="sm-time-range">{{ execRange(t) }}</td>
                    <td>
                      <div class="sm-acts">
                        <a v-if="t.status === 'pending'" href="javascript:void(0)" @click="runTask(t.id)">开始</a>
                        <a v-if="t.status === 'running'" class="disabled" href="javascript:void(0)">执行中</a>
                        <a v-if="t.status === 'success'" href="javascript:void(0)" @click="viewTaskData(t)">查看</a>
                        <a v-if="t.status === 'fail'" href="javascript:void(0)" @click="runTask(t.id)">重试</a>
                        <a class="danger" href="javascript:void(0)" @click="deleteTask(t.id)">删除</a>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="tasks.length === 0">
                    <td colspan="8" class="sm-empty-cell">暂无抓取任务，点击右上角「新建任务」创建</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 抓取数据 -->
        <div v-if="page === 'data'" class="sm-content">
          <div class="sm-card">
            <div class="sm-card-head">
              <h3>抓取数据</h3>
              <div class="sm-filter-inline">
                <input v-model="dataKeyword" class="sm-input sm-input-search" placeholder="搜索商品/店铺" />
                <BubbleSelect class-name="sm-select" :value="dataTaskFilter?.id ?? 'all'" :options="dataTaskOpts" @change="onDataTaskChange" />
                <BubbleSelect class-name="sm-select" :value="dataScraper" :options="scraperOpts" @change="(v) => dataScraper = v" />
                <BubbleSelect class-name="sm-select" :value="recordStatus" :options="recordStatusOpts" @change="(v) => recordStatus = v as 'all' | SmRecordStatus" />
                <button class="sm-btn" @click="resetDataFilter">重置</button>
              </div>
            </div>
            <div class="sm-table-wrap">
              <table class="sm-table">
                <thead>
                  <tr><th>商品信息</th><th>店铺名称</th><th>任务名称</th><th>抓取人</th><th>抓取时间</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in pagedRecords" :key="r.id">
                    <td>
                      <div class="sm-goods">
                        <div class="sm-goods-img">{{ r.title.charAt(0) }}</div>
                        <div class="sm-goods-info">
                          <div class="sm-goods-title">{{ r.title }}</div>
                          <div class="sm-goods-price">顺买价：{{ r.price.toFixed(2) }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ r.shop }}</td>
                    <td>
                      <a v-if="r.taskId" class="sm-link" href="javascript:void(0)" @click="jumpToTask(r)">{{ taskNameOf(r) }}</a>
                      <span v-else>-</span>
                    </td>
                    <td>{{ r.scraper }}</td>
                    <td>{{ r.time }}</td>
                    <td>
                      <span class="sm-dot" :style="{ background: SM_RECORD_STATUS_META[r.status].color }" />
                      <span :style="{ color: SM_RECORD_STATUS_META[r.status].color }">{{ SM_RECORD_STATUS_META[r.status].label }}</span>
                    </td>
                    <td>
                      <div class="sm-acts">
                        <a href="javascript:void(0)" @click="viewRecord(r)">查看</a>
                        <a href="javascript:void(0)" @click="importRecord(r)">导入到</a>
                        <a class="danger" href="javascript:void(0)" @click="deleteRecord(r.id)">删除</a>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="pagedRecords.length === 0">
                    <td colspan="7" class="sm-empty-cell">暂无抓取数据</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="sm-pagination">
              <span>共 {{ filteredRecords.length }} 条</span>
              <BubbleSelect class-name="sm-select sm-page-size" :value="String(pageSize)" :options="['10', '50']" @change="(v) => { pageSize = Number(v); dataPage = 1; }" />
              <button class="sm-btn" :disabled="dataPage <= 1" @click="dataPage--">上一页</button>
              <span class="sm-page-num">{{ dataPage }} / {{ totalPages }}</span>
              <button class="sm-btn" :disabled="dataPage >= totalPages" @click="dataPage++">下一页</button>
            </div>
          </div>
        </div>

      </main>

      <!-- 任务详情 -->
      <div v-if="taskDetail" class="sm-modal-overlay" @click.self="taskDetail = null">
        <div class="sm-modal">
          <h3>任务详情</h3>
          <div class="sm-modal-body">
            <div class="sm-detail-row"><span>任务ID</span><b>{{ taskDetail.id }}</b></div>
            <div class="sm-detail-row"><span>任务名称</span><b>{{ taskDetail.name }}</b></div>
            <div class="sm-detail-row"><span>搜索主题</span><b>{{ taskDetail.topic }}</b></div>
            <div class="sm-detail-row"><span>抓取条数</span><b>{{ taskDetail.targetCount }}</b></div>
            <div class="sm-detail-row"><span>当前进度</span><b>{{ progressPct(taskDetail) }}%（成 {{ taskDetail.successCount }} / 败 {{ taskDetail.failCount }} / 待 {{ remainingOf(taskDetail) }}）</b></div>
            <div class="sm-detail-row"><span>当前状态</span><b>{{ SM_TASK_STATUS_META[taskDetail.status].label }}</b></div>
            <div class="sm-detail-row"><span>创建时间</span><b>{{ taskDetail.createdAt }}</b></div>
            <div class="sm-detail-row"><span>开始执行</span><b>{{ taskDetail.startedAt || '-' }}</b></div>
            <div class="sm-detail-row"><span>执行结束</span><b>{{ taskDetail.finishedAt || '-' }}</b></div>
          </div>
          <div class="sm-modal-foot">
            <button class="sm-btn" @click="taskDetail = null">关闭</button>
          </div>
        </div>
      </div>

      <!-- 新建任务弹窗 -->
      <div v-if="createOpen" class="sm-modal-overlay" @click.self="createOpen = false">
        <div class="sm-modal">
          <h3>新建抓取任务</h3>
          <div class="sm-modal-body">
            <div class="sm-field">
              <label>任务名称</label>
              <input v-model="createName" class="sm-input" placeholder="请输入任务名称" @keydown.enter="submitCreate" />
            </div>
            <div class="sm-field">
              <label>搜索主题</label>
              <input v-model="createTopic" class="sm-input" placeholder="请输入搜索主题" @keydown.enter="submitCreate" />
            </div>
            <div class="sm-field">
              <label>抓取条数</label>
              <input v-model.number="createCount" type="number" min="1" class="sm-input" placeholder="请输入抓取条数" @keydown.enter="submitCreate" />
            </div>
          </div>
          <div class="sm-modal-foot">
            <button class="sm-btn" @click="createOpen = false">取消</button>
            <button class="sm-btn primary" @click="submitCreate">创建</button>
          </div>
        </div>
      </div>

      <!-- 使用教程弹窗 -->
      <div v-if="tutorialOpen" class="sm-modal-overlay" @click.self="tutorialOpen = false">
        <div class="sm-modal sm-modal-wide">
          <h3>使用教程</h3>
          <div class="sm-modal-body sm-tutorial-body">
            <p class="sm-tutorial-placeholder">教程内容待补充，敬请期待。</p>
          </div>
          <div class="sm-modal-foot">
            <button class="sm-btn primary" @click="tutorialOpen = false">我知道了</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
