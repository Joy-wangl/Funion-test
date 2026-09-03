<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import MoreActions from '../../components/MoreActions.vue';
import { pushToast } from '../../components/toast';
import {
  genTaskId,
  makeRecord,
  nowTime,
  SM_RECORD_STATUS_META,
  SM_TASK_STATUS_META,
  smRecordsSeed,
  smStepsSeed,
  smTasksSeed,
  type SmRecord,
  type SmRecordStatus,
  type SmStep,
  type SmStepMark,
  type SmTask,
  type SmTaskStatus,
} from './data';
import './ShunMai.css';

/* ---------- 登录态 ---------- */
const authed = ref(false);
const scanLoading = ref(false);
const scanText = ref('打开淘宝 App 扫一扫，快速登录顺买商机');
const refreshQr = () => {
  scanLoading.value = true;
  scanText.value = '二维码刷新中…';
  setTimeout(() => {
    scanLoading.value = false;
    scanText.value = '打开淘宝 App 扫一扫，快速登录顺买商机';
    pushToast('二维码已刷新');
  }, 800);
};
const onScanSuccess = () => {
  authed.value = true;
  pushToast('淘宝账号登录成功');
};

/* ---------- 侧边栏导航 ---------- */
type SmPage = 'dashboard' | 'task' | 'data' | 'detail';
const page = ref<SmPage>('dashboard');
const setPage = (p: SmPage) => { page.value = p; };
/* 侧栏底部 LOGO 入口：跨应用切换顶层 tab 回智能运营中心（App 层 provide） */
const goApp = inject<(key: string) => void>('goApp');
const detailTask = ref<SmTask | null>(null);
const selectedStep = ref(0);
const openTaskDetail = (t: SmTask) => {
  if (t.status !== 'running' && t.status !== 'paused') return;
  detailTask.value = t;
  selectedStep.value = 0;
  page.value = 'detail';
};
const viewTaskData = (t: SmTask) => {
  dataKeyword.value = '';
  dataTaskKw.value = t.name;
  dataStatus.value = 'all';
  searchData();
  page.value = 'data';
};
const openDataPage = () => {
  dataTaskKw.value = '';
  appliedDataTaskKw.value = '';
  page.value = 'data';
};

/* ---------- 任务详情：执行步骤监控（实时画面 / 步骤流 / 操作前后截图） ---------- */
const steps = ref<SmStep[]>([...smStepsSeed]);
const redBox = ref(true);
const greenBox = ref(true);
const STEP_MARKS: SmStepMark[] = ['成功', '异常', '失败', '无效'];
const MARK_CLASS: Record<SmStepMark, string> = { 成功: 'ok', 异常: 'warn', 失败: 'fail', 无效: 'mute' };

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

/* 真正占用执行位开始抓取（重置计数 + 启动定时器） */
const beginTask = (t: SmTask) => {
  t.status = 'running';
  t.successCount = 0;
  t.failCount = 0;
  t.startedAt = nowTime();
  t.finishedAt = undefined;
  startTicking(t);
};

const startNextQueued = () => {
  if (isOccupied()) return;
  const next = [...tasks.value].reverse().find((x) => x.status === 'queued');
  if (next) beginTask(next);
};

/* 执行器占用：抓取中 / 已暂停（暂停保留执行位，中止才释放） */
const taskTimers = new Map<string, ReturnType<typeof setInterval>>();
const stopTimer = (id: string) => {
  const timer = taskTimers.get(id);
  if (timer) {
    clearInterval(timer);
    taskTimers.delete(id);
  }
};
const isOccupied = () => tasks.value.some((x) => x.status === 'running' || x.status === 'paused');

/* 任务结束：仅当抓取数据全部失败才记为失败，否则完成 */
const finishTask = (t: SmTask) => {
  stopTimer(t.id);
  const ok = t.successCount > 0;
  t.status = ok ? 'success' : 'fail';
  t.finishedAt = nowTime();
  if (ok) pushToast(`任务 ${t.name} 已完成`);
  else pushToast(`任务 ${t.name} 抓取数据全部失败`, 'error');
  setTimeout(startNextQueued, 300);
};

const startTicking = (t: SmTask) => {
  const timer = setInterval(() => {
    const remaining = t.targetCount - t.successCount - t.failCount;
    if (remaining <= 0) {
      finishTask(t);
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
    if (t.successCount + t.failCount >= t.targetCount) finishTask(t);
  }, 400);
  taskTimers.set(t.id, timer);
};

const runTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  if (!t) return;
  if (t.status === 'running') { pushToast('任务正在抓取中', 'error'); return; }
  if (t.status === 'queued') { pushToast('任务已在队列中', 'error'); return; }
  if (t.status === 'paused') { pushToast('任务已暂停，请点击继续', 'error'); return; }
  if (isOccupied()) {
    t.status = 'queued';
    pushToast('已有任务执行中，已加入队列');
    return;
  }
  beginTask(t);
};

/* 暂停：保留执行位，停止出数 */
const pauseTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  if (!t || t.status !== 'running') return;
  stopTimer(id);
  t.status = 'paused';
  pushToast(`任务 ${t.name} 已暂停`);
};

/* 继续：从当前进度恢复抓取 */
const resumeTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  if (!t || t.status !== 'paused') return;
  t.status = 'running';
  pushToast(`任务 ${t.name} 继续抓取`);
  startTicking(t);
};

/* 中止：释放执行位，任务记为已取消（重点操作，二次确认） */
const abortTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  if (!t || (t.status !== 'running' && t.status !== 'paused')) return;
  askConfirm('中止任务', `中止任务「${t.name}」？中止后记为已取消`, () => {
    stopTimer(id);
    t.status = 'canceled';
    t.finishedAt = nowTime();
    pushToast(`任务 ${t.name} 已中止`);
    setTimeout(startNextQueued, 300);
  });
};

/* 取消：队列中的任务出队，记为已取消 */
const cancelTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  if (!t || t.status !== 'queued') return;
  t.status = 'canceled';
  pushToast(`任务 ${t.name} 已取消`);
};

/* 进度辅助：百分比 / 待抓取 / 分段宽度 */
const progressPct = (t: SmTask) => (t.targetCount ? Math.round(((t.successCount + t.failCount) / t.targetCount) * 100) : 0);
const remainingOf = (t: SmTask) => Math.max(0, t.targetCount - t.successCount - t.failCount);
const segWidth = (n: number, t: SmTask) => (t.targetCount ? `${(n / t.targetCount) * 100}%` : '0%');

/* ---------- 重点操作二次确认（删除/中止等不可逆操作统一走确认弹窗） ---------- */
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => {
  confirmBox.value = { title, message, onOk };
};
const doConfirm = () => {
  confirmBox.value?.onOk();
  confirmBox.value = null;
};

const deleteTask = (id: string) => {
  const t = tasks.value.find((x) => x.id === id);
  askConfirm('删除任务', `删除任务「${t?.name || id}」？`, () => {
    stopTimer(id);
    tasks.value = tasks.value.filter((x) => x.id !== id);
    pushToast('任务已删除');
  });
};

/* 操作列：默认最多展示 3 个按钮（含「更多」），超出项收进「更多」悬浮气泡 */
interface TaskAct {
  label: string;
  danger?: boolean;
  run: () => void;
}
const TASK_ACT_MAX = 3;
const taskActs = (t: SmTask): TaskAct[] => {
  const acts: TaskAct[] = [];
  if (t.status === 'pending') acts.push({ label: '开始', run: () => runTask(t.id) });
  if (t.status === 'queued') acts.push({ label: '取消', run: () => cancelTask(t.id) });
  if (t.status === 'running' || t.status === 'paused') acts.push({ label: '详情', run: () => openTaskDetail(t) });
  if (t.status === 'running') acts.push({ label: '暂停', run: () => pauseTask(t.id) });
  if (t.status === 'paused') acts.push({ label: '继续', run: () => resumeTask(t.id) });
  if (t.status === 'running' || t.status === 'paused') acts.push({ label: '中止', run: () => abortTask(t.id) });
  if (t.status === 'success') acts.push({ label: '查看', run: () => viewTaskData(t) });
  if (t.status === 'fail' || t.status === 'canceled') acts.push({ label: '重试', run: () => runTask(t.id) });
  acts.push({ label: '删除', danger: true, run: () => deleteTask(t.id) });
  return acts;
};
const visibleActs = (t: SmTask) => {
  const acts = taskActs(t);
  return acts.length > TASK_ACT_MAX ? acts.slice(0, TASK_ACT_MAX - 1) : acts;
};
const overflowActs = (t: SmTask) => {
  const acts = taskActs(t);
  return acts.length > TASK_ACT_MAX
    ? acts.slice(TASK_ACT_MAX - 1).map((a) => ({ label: a.label, danger: a.danger, onClick: a.run }))
    : [];
};

/* 任务筛选（草稿 + 查询生效，与智能运营中心统一筛选表单一致） */
const taskKeyword = ref('');
const taskStatus = ref<'all' | SmTaskStatus>('all');
const appliedTaskKw = ref('');
const appliedTaskStatus = ref<'all' | SmTaskStatus>('all');
const taskStatusOpts = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '待抓取' },
  { value: 'queued', label: '队列中' },
  { value: 'running', label: '抓取中' },
  { value: 'paused', label: '已暂停' },
  { value: 'success', label: '已完成' },
  { value: 'fail', label: '失败' },
  { value: 'canceled', label: '已取消' },
];
const searchTasks = () => {
  appliedTaskKw.value = taskKeyword.value;
  appliedTaskStatus.value = taskStatus.value;
};
const resetTaskFilter = () => {
  taskKeyword.value = '';
  taskStatus.value = 'all';
  appliedTaskKw.value = '';
  appliedTaskStatus.value = 'all';
};
const filteredTasks = computed(() => {
  let list = tasks.value;
  const kw = appliedTaskKw.value.trim();
  if (kw) list = list.filter((t) => t.name.includes(kw) || t.topic.includes(kw));
  if (appliedTaskStatus.value !== 'all') list = list.filter((t) => t.status === appliedTaskStatus.value);
  return list;
});

/* ---------- 数据模块 ---------- */
const records = ref<SmRecord[]>([...smRecordsSeed]);
/* 当前详情任务的已抓取数据（执行监控右侧只读展示；条数与头部成功数一致，不足部分用种子商品循环补齐） */
const detailRecords = computed(() => {
  const t = detailTask.value;
  if (!t) return [] as SmRecord[];
  const list = records.value.filter((r) => r.taskId === t.id && r.status === 'success');
  const tpl = smRecordsSeed.filter((r) => r.status === 'success');
  for (let i = list.length; i < t.successCount; i++) {
    list.push({ ...tpl[i % tpl.length], id: `${t.id}-D${i}` });
  }
  return list;
});
const recordStatusOpts = [
  { value: 'all', label: '全部状态' },
  { value: 'success', label: '成功' },
  { value: 'fail', label: '失败' },
];
const dataKeyword = ref('');
const dataTaskKw = ref('');
const dataStatus = ref<'all' | SmRecordStatus>('all');
const appliedDataKw = ref('');
const appliedDataTaskKw = ref('');
const appliedStatus = ref<'all' | SmRecordStatus>('all');
const searchData = () => {
  appliedDataKw.value = dataKeyword.value;
  appliedDataTaskKw.value = dataTaskKw.value;
  appliedStatus.value = dataStatus.value;
  dataPage.value = 1;
  selectedIds.value = [];
};
const resetDataFilter = () => {
  dataKeyword.value = '';
  dataTaskKw.value = '';
  dataStatus.value = 'all';
  searchData();
};

const filteredRecords = computed(() => {
  let list = records.value;
  const tkw = appliedDataTaskKw.value.trim();
  if (tkw) list = list.filter((r) => taskNameOf(r).includes(tkw));
  const kw = appliedDataKw.value.trim();
  if (kw) list = list.filter((r) => r.title.includes(kw) || r.shop.includes(kw));
  if (appliedStatus.value !== 'all') list = list.filter((r) => r.status === appliedStatus.value);
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
const taskNameOf = (r: SmRecord) => {
  if (!r.taskId) return '-';
  const t = tasks.value.find((x) => x.id === r.taskId);
  return t ? t.name : '-';
};
/* 商品缩略图配色：按记录 ID 哈希循环取色（与图二 pastel 色块同款语言） */
const toneOf = (r: SmRecord) => {
  const code = r.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return code % 5;
};
const execRange = (t: SmTask) => {
  if (!t.startedAt) return '-';
  return `${t.startedAt} ~ ${t.finishedAt || '执行中'}`;
};
const deleteRecord = (id: string) => {
  const r = records.value.find((x) => x.id === id);
  askConfirm('删除记录', `删除商机「${r?.title || id}」？`, () => {
    records.value = records.value.filter((x) => x.id !== id);
    selectedIds.value = selectedIds.value.filter((x) => x !== id);
    pushToast('记录已删除');
  });
};

/* ---------- 商机选择与批量操作（全部可选；失败仅支持删除且不计入批量条数，可操作上限 50） ---------- */
const SELECT_LIMIT = 50;
const selectedIds = ref<string[]>([]);
const isSelected = (id: string) => selectedIds.value.includes(id);
const isOperableId = (id: string) => {
  const r = records.value.find((x) => x.id === id);
  return !!r && r.status !== 'fail';
};
/* 可操作选中：失败记录不计入批量删除的条数 */
const operableSelected = computed(() => selectedIds.value.filter(isOperableId));
const toggleRow = (r: SmRecord) => {
  if (isSelected(r.id)) {
    selectedIds.value = selectedIds.value.filter((x) => x !== r.id);
    return;
  }
  if (r.status !== 'fail' && operableSelected.value.length >= SELECT_LIMIT) {
    pushToast(`最多可选 ${SELECT_LIMIT} 条可操作记录`, 'error');
    return;
  }
  selectedIds.value = [...selectedIds.value, r.id];
};
const pageAllChecked = computed(() => pagedRecords.value.length > 0 && pagedRecords.value.every((r) => isSelected(r.id)));
const togglePage = () => {
  if (pageAllChecked.value) {
    const ids = new Set(pagedRecords.value.map((r) => r.id));
    selectedIds.value = selectedIds.value.filter((x) => !ids.has(x));
    return;
  }
  const merged = [...selectedIds.value];
  let operable = operableSelected.value.length;
  let capped = false;
  for (const r of pagedRecords.value) {
    if (merged.includes(r.id)) continue;
    if (r.status !== 'fail') {
      if (operable >= SELECT_LIMIT) { capped = true; continue; }
      operable++;
    }
    merged.push(r.id);
  }
  selectedIds.value = merged;
  if (capped) pushToast(`最多可选 ${SELECT_LIMIT} 条可操作记录`, 'error');
};

const batchDelete = () => {
  const ids = operableSelected.value;
  if (!ids.length) return;
  askConfirm('批量删除', `删除选中的 ${ids.length} 条商机记录？`, () => {
    const set = new Set(ids);
    records.value = records.value.filter((r) => !set.has(r.id));
    selectedIds.value = selectedIds.value.filter((x) => !set.has(x));
    pushToast(`已删除 ${ids.length} 条记录`);
  });
};

/* ---------- 工作台概览 ---------- */
const taskStats = computed(() => ({
  total: tasks.value.length,
  queued: tasks.value.filter((t) => t.status === 'queued').length,
  running: tasks.value.filter((t) => t.status === 'running').length,
  success: tasks.value.filter((t) => t.status === 'success').length,
  fail: tasks.value.filter((t) => t.status === 'fail').length,
}));
const recordStats = computed(() => ({
  total: records.value.length,
  success: records.value.filter((r) => r.status === 'success').length,
  fail: records.value.filter((r) => r.status === 'fail').length,
}));
/* 工作台最近任务查询条件（草稿 + 查询生效） */
const dashKeyword = ref('');
const dashStatus = ref<'all' | SmTaskStatus>('all');
const appliedDashKw = ref('');
const appliedDashStatus = ref<'all' | SmTaskStatus>('all');
const searchRecent = () => {
  appliedDashKw.value = dashKeyword.value;
  appliedDashStatus.value = dashStatus.value;
};
const resetRecentFilter = () => {
  dashKeyword.value = '';
  dashStatus.value = 'all';
  appliedDashKw.value = '';
  appliedDashStatus.value = 'all';
};
const recentTasks = computed(() => {
  let list = tasks.value;
  const kw = appliedDashKw.value.trim();
  if (kw) list = list.filter((t) => t.name.includes(kw) || t.topic.includes(kw));
  if (appliedDashStatus.value !== 'all') list = list.filter((t) => t.status === appliedDashStatus.value);
  return list.slice(0, 10);
});

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

/* ---------- 使用教程（public 下独立引导页，新标签打开） ---------- */
const openTutorial = () => window.open('/mobile-connect-guide.html', '_blank');
const overviewItems = computed(() => [
  { label: '任务总数', value: taskStats.value.total },
  { label: '队列中', value: taskStats.value.queued },
  { label: '抓取中', value: taskStats.value.running },
  { label: '已完成', value: taskStats.value.success },
  { label: '抓取次数', value: recordStats.value.total },
  { label: '已抓取商品数', value: recordStats.value.success },
]);

</script>

<template>
  <div class="sm-page">
    <!-- 扫码登录 -->
    <div v-if="!authed" class="sm-login">
      <div class="sm-login-card">
        <div class="sm-login-brand">
          <div class="sm-brand-ico">顺</div>
          <div class="sm-brand-info">
            <h1>顺买商机</h1>
            <p>店铺/类目抓取</p>
          </div>
        </div>
        <div class="sm-qr-frame">
          <i class="sm-qr-corner tl" />
          <i class="sm-qr-corner tr" />
          <i class="sm-qr-corner bl" />
          <i class="sm-qr-corner br" />
          <div class="sm-qr" :class="{ loading: scanLoading }">
            <svg viewBox="0 0 100 100" class="sm-qr-svg">
              <rect x="0" y="0" width="26" height="26" fill="currentColor" />
              <rect x="4" y="4" width="18" height="18" fill="#fff" />
              <rect x="8" y="8" width="10" height="10" fill="currentColor" />
              <rect x="74" y="0" width="26" height="26" fill="currentColor" />
              <rect x="78" y="4" width="18" height="18" fill="#fff" />
              <rect x="82" y="8" width="10" height="10" fill="currentColor" />
              <rect x="0" y="74" width="26" height="26" fill="currentColor" />
              <rect x="4" y="78" width="18" height="18" fill="#fff" />
              <rect x="8" y="82" width="10" height="10" fill="currentColor" />
              <rect x="36" y="4" width="6" height="6" fill="currentColor" />
              <rect x="48" y="10" width="6" height="6" fill="currentColor" />
              <rect x="60" y="4" width="6" height="6" fill="currentColor" />
              <rect x="36" y="16" width="6" height="6" fill="currentColor" />
              <rect x="54" y="16" width="6" height="6" fill="currentColor" />
              <rect x="66" y="12" width="6" height="6" fill="currentColor" />
              <rect x="4" y="36" width="6" height="6" fill="currentColor" />
              <rect x="12" y="42" width="6" height="6" fill="currentColor" />
              <rect x="20" y="36" width="6" height="6" fill="currentColor" />
              <rect x="4" y="52" width="6" height="6" fill="currentColor" />
              <rect x="16" y="56" width="6" height="6" fill="currentColor" />
              <rect x="36" y="36" width="6" height="6" fill="currentColor" />
              <rect x="44" y="44" width="6" height="6" fill="currentColor" />
              <rect x="52" y="36" width="6" height="6" fill="currentColor" />
              <rect x="60" y="44" width="6" height="6" fill="currentColor" />
              <rect x="68" y="36" width="6" height="6" fill="currentColor" />
              <rect x="36" y="60" width="6" height="6" fill="currentColor" />
              <rect x="48" y="66" width="6" height="6" fill="currentColor" />
              <rect x="60" y="60" width="6" height="6" fill="currentColor" />
              <rect x="76" y="40" width="6" height="6" fill="currentColor" />
              <rect x="84" y="48" width="6" height="6" fill="currentColor" />
              <rect x="76" y="56" width="6" height="6" fill="currentColor" />
              <rect x="88" y="64" width="6" height="6" fill="currentColor" />
              <rect x="40" y="76" width="6" height="6" fill="currentColor" />
              <rect x="52" y="84" width="6" height="6" fill="currentColor" />
              <rect x="64" y="76" width="6" height="6" fill="currentColor" />
              <rect x="76" y="76" width="6" height="6" fill="currentColor" />
              <rect x="88" y="88" width="6" height="6" fill="currentColor" />
              <rect x="70" y="88" width="6" height="6" fill="currentColor" />
              <rect x="34" y="88" width="6" height="6" fill="currentColor" />
            </svg>
            <div class="sm-qr-logo">顺</div>
          </div>
        </div>
        <div class="sm-login-title">淘宝扫码登录</div>
        <p class="sm-login-sub">{{ scanText }}</p>
        <button class="sm-btn primary sm-login-btn" @click="onScanSuccess">模拟扫码成功（演示）</button>
        <button type="button" class="sm-login-refresh" @click="refreshQr">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
          刷新二维码
        </button>
        <p class="sm-login-agree">登录即代表同意《用户协议》与《隐私政策》</p>
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
          <div class="sm-nav-item" :class="{ active: page === 'data' }" @click="openDataPage">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" /><path d="M3 7l9 6 9-6" /></svg>
            <span>商机列表</span>
          </div>
          <div class="sm-nav-item" :class="{ active: page === 'task' || page === 'detail' }" @click="setPage('task')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            <span>任务列表</span>
          </div>

        </nav>
        <div class="sm-side-foot">
          <span class="sm-side-avatar">七</span>
          <button class="sm-btn ghost" @click="authed = false">退出登录</button>
        </div>
      </aside>

      <main class="sm-main">
        <!-- 头部 -->
        <header class="sm-main-head">
          <!-- 详情页头部：返回在左（与右侧信息对调），右侧任务名称在上、成功/失败/总数在下，不放进度条 -->
          <template v-if="page === 'detail' && detailTask">
            <button class="sm-btn" @click="setPage('task')">返回</button>
            <div class="sm-detail-info">
              <span class="sm-detail-name">{{ detailTask.name }}</span>
              <span class="sm-progress-meta">
                <span class="ok">成功 {{ detailTask.successCount }}</span>
                <span class="fail">失败 {{ detailTask.failCount }}</span>
                <span class="pend">总数 {{ detailTask.targetCount }}</span>
              </span>
            </div>
          </template>
          <template v-else>
            <div>
              <h2>{{ { dashboard: '工作台', task: '任务列表', data: '商机列表', detail: '任务详情' }[page] }}</h2>
              <p class="sm-breadcrumb">
                顺买商机
                <span> / {{ { dashboard: '工作台', task: '任务列表', data: '商机列表', detail: '任务详情' }[page] }}</span>
              </p>
            </div>
            <div class="sm-head-actions">
              <!-- 跨应用入口：LOGO + 文字按钮，点击切换顶层 tab 回智能运营中心 -->
              <button class="sm-btn sm-ops-go" @click="goApp?.('ops-center')">
                <img src="/logos/ops-logo.png" alt="" />
                前往智能运营中心
              </button>
              <button class="sm-btn" @click="openTutorial">使用教程</button>
              <button class="sm-btn primary" @click="createOpen = true">新建任务</button>
            </div>
          </template>
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
                <div class="sm-device-row">
                  <div class="sm-device-ico">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
                  </div>
                  <span class="sm-device-name">手机连接</span>
                  <span class="sm-device-pill" :class="phoneConnected ? 'ok' : 'off'"><i />{{ phoneConnected ? '已连接' : '未连接' }}</span>
                </div>
                <div class="sm-device-row">
                  <div class="sm-device-ico">
                    <img class="sm-taobao-logo" :class="{ off: !taobaoAppOpen }" src="/logos/taobao.png" alt="淘宝" />
                  </div>
                  <span class="sm-device-name">淘宝应用</span>
                  <span class="sm-device-pill" :class="taobaoAppOpen ? 'ok' : 'off'"><i />{{ taobaoAppOpen ? '已打开' : '未打开' }}</span>
                </div>
              </div>
              <div class="sm-device-foot">更新于 {{ deviceUpdatedAt || '--' }}</div>
            </div>
          </div>

          <div class="sm-card sm-recent-card">
            <div class="sm-panel-head sm-recent-head">最近任务</div>
            <div class="sm-filter-grid sm-recent-filter">
              <div class="sm-field">
                <label>任务名称/主题</label>
                <input v-model="dashKeyword" class="sm-input" placeholder="请输入任务名称/主题" @keyup.enter="searchRecent" />
              </div>
              <div class="sm-field">
                <label>状态</label>
                <BubbleSelect class-name="sm-select" :value="dashStatus" :options="taskStatusOpts" @change="(v) => dashStatus = v as 'all' | SmTaskStatus" />
              </div>
              <div class="sm-actions">
                <button class="sm-btn" @click="resetRecentFilter">重置</button>
                <button class="sm-btn primary" @click="searchRecent">查询</button>
              </div>
            </div>
            <div class="sm-table-wrap">
              <table class="sm-table sm-table-compact">
                <thead>
                  <tr><th>任务名称</th><th>搜索主题</th><th>状态</th><th>进度</th><th>创建时间</th><th>操作</th></tr>
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
                        <span class="sm-progress-frac">{{ t.successCount + t.failCount }}/{{ t.targetCount }}</span>
                        <div class="sm-progress-track stacked">
                          <div class="seg ok" :style="{ width: segWidth(t.successCount, t) }" />
                          <div class="seg fail" :style="{ width: segWidth(t.failCount, t) }" />
                          <div class="seg pend" :style="{ width: segWidth(remainingOf(t), t) }" />
                        </div>
                        <span class="sm-progress-pct">{{ progressPct(t) }}%</span>
                      </div>
                      <div class="sm-progress-meta">
                        <span class="ok">成功 {{ t.successCount }}</span>
                        <span class="fail">失败 {{ t.failCount }}</span>
                        <span class="pend">待抓取 {{ remainingOf(t) }}</span>
                      </div>
                    </td>
                    <td>{{ t.createdAt }}</td>
                    <td>
                      <div class="sm-acts">
                        <a href="javascript:void(0)" @click="setPage('task')">查看</a>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="recentTasks.length === 0">
                    <td colspan="6" class="sm-empty-cell">暂无任务</td>
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
          <div class="sm-card sm-filter">
            <div class="sm-filter-grid">
              <div class="sm-field">
                <label>任务名称/主题</label>
                <input v-model="taskKeyword" class="sm-input" placeholder="请输入任务名称/主题" @keyup.enter="searchTasks" />
              </div>
              <div class="sm-field">
                <label>状态</label>
                <BubbleSelect class-name="sm-select" :value="taskStatus" :options="taskStatusOpts" @change="(v) => taskStatus = v as 'all' | SmTaskStatus" />
              </div>
              <div class="sm-actions">
                <button class="sm-btn" @click="resetTaskFilter">重置</button>
                <button class="sm-btn primary" @click="searchTasks">查询</button>
              </div>
            </div>
          </div>
          <div class="sm-card">
            <div class="sm-table-wrap">
              <table class="sm-table">
                <thead>
                  <tr><th>任务名称</th><th>搜索主题</th><th>状态</th><th>进度</th><th>创建时间</th><th>执行时间</th><th>操作</th></tr>
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
                        <span class="sm-progress-frac">{{ t.successCount + t.failCount }}/{{ t.targetCount }}</span>
                        <div class="sm-progress-track stacked">
                          <div class="seg ok" :style="{ width: segWidth(t.successCount, t) }" />
                          <div class="seg fail" :style="{ width: segWidth(t.failCount, t) }" />
                          <div class="seg pend" :style="{ width: segWidth(remainingOf(t), t) }" />
                        </div>
                        <span class="sm-progress-pct">{{ progressPct(t) }}%</span>
                      </div>
                      <div class="sm-progress-meta">
                        <span class="ok">成功 {{ t.successCount }}</span>
                        <span class="fail">失败 {{ t.failCount }}</span>
                        <span class="pend">待抓取 {{ remainingOf(t) }}</span>
                      </div>
                    </td>
                    <td>{{ t.createdAt }}</td>
                    <td class="sm-time-range">{{ execRange(t) }}</td>
                    <td>
                      <div class="sm-acts">
                        <a
                          v-for="act in visibleActs(t)"
                          :key="act.label"
                          :class="{ danger: act.danger }"
                          href="javascript:void(0)"
                          @click="act.run()"
                        >{{ act.label }}</a>
                        <MoreActions v-if="overflowActs(t).length" :items="overflowActs(t)" />
                      </div>
                    </td>
                  </tr>
                  <tr v-if="tasks.length === 0">
                    <td colspan="7" class="sm-empty-cell">暂无抓取任务，点击右上角「新建任务」创建</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 抓取数据 -->
        <div v-if="page === 'data'" class="sm-content">
          <div class="sm-card sm-filter">
            <div class="sm-filter-grid">
              <div class="sm-field">
                <label>商品/店铺</label>
                <input v-model="dataKeyword" class="sm-input" placeholder="请输入商品/店铺" @keyup.enter="searchData" />
              </div>
              <div class="sm-field">
                <label>任务名称</label>
                <input v-model="dataTaskKw" class="sm-input" placeholder="请输入任务名称" @keyup.enter="searchData" />
              </div>
              <div class="sm-field">
                <label>状态</label>
                <BubbleSelect class-name="sm-select" :value="dataStatus" :options="recordStatusOpts" @change="(v) => dataStatus = v as 'all' | SmRecordStatus" />
              </div>
              <div class="sm-actions">
                <!-- 导入到已移除：批量仅保留删除，勾选后直接展示批量删除按钮（二次确认兜底） -->
                <button
                  v-if="selectedIds.length > 0"
                  class="sm-btn danger"
                  :disabled="operableSelected.length === 0"
                  @click="batchDelete"
                >
                  批量删除 {{ operableSelected.length }}/{{ SELECT_LIMIT }}
                </button>
                <button class="sm-btn" @click="resetDataFilter">重置</button>
                <button class="sm-btn primary" @click="searchData">查询</button>
              </div>
            </div>
          </div>
          <div class="sm-card">
            <div class="sm-table-wrap">
              <table class="sm-table">
                <thead>
                  <tr><th class="sm-check-col"><input type="checkbox" :checked="pageAllChecked" @change="togglePage" /></th><th>任务名称</th><th>商品信息</th><th>店铺名称</th><th>抓取人</th><th>抓取时间</th><th>状态</th><th>操作</th></tr>
                </thead>
                <tbody>
                  <tr v-for="r in pagedRecords" :key="r.id">
                    <td><input type="checkbox" :checked="isSelected(r.id)" @change="toggleRow(r)" /></td>
                    <td>{{ taskNameOf(r) }}</td>
                    <td>
                      <div class="sm-goods">
                        <div class="sm-goods-img" :class="`tone-${toneOf(r)}`">{{ r.title.slice(0, 2) }}</div>
                        <div class="sm-goods-info">
                          <div class="sm-goods-title">{{ r.title }}</div>
                          <div class="sm-goods-price">顺买价：{{ r.price.toFixed(2) }}</div>
                        </div>
                      </div>
                    </td>
                    <td>{{ r.shop }}</td>
                    <td>{{ r.scraper }}</td>
                    <td>{{ r.time }}</td>
                    <td>
                      <span class="sm-tag" :style="{ color: SM_RECORD_STATUS_META[r.status].color, background: SM_RECORD_STATUS_META[r.status].bg }">{{ SM_RECORD_STATUS_META[r.status].label }}</span>
                    </td>
                    <td>
                      <div class="sm-acts">
                        <a v-if="r.status !== 'fail'" href="javascript:void(0)" @click="viewRecord(r)">查看</a>
                        <a class="danger" href="javascript:void(0)" @click="deleteRecord(r.id)">删除</a>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="pagedRecords.length === 0">
                    <td colspan="8" class="sm-empty-cell">暂无抓取数据</td>
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

        <!-- 任务详情：执行监控 -->
        <div v-if="page === 'detail' && detailTask" class="sm-content">
          <div class="sm-exec-layout">
            <aside class="sm-exec-left">
              <div class="sm-exec-feed-head">
                <span class="t">实时画面</span>
                <label class="ck"><input v-model="redBox" type="checkbox" />红框(策略)</label>
                <label class="ck"><input v-model="greenBox" type="checkbox" />绿框(动作)</label>
              </div>
              <div class="sm-exec-feed" />
            </aside>
            <div class="sm-exec-right">
              <div class="sm-exec-cols">
                <div class="sm-card sm-exec-steps">
                  <div class="sm-exec-steps-head">步骤</div>
                  <div class="sm-exec-steps-list">
                    <div
                      v-for="(s, i) in steps"
                      :key="i"
                      class="sm-step"
                      :class="{ current: i === selectedStep }"
                      @click="selectedStep = i"
                    >
                      <div class="sm-step-title">
                        <span class="idx">第 {{ i + 1 }} 步</span>
                        <span class="st" :class="{ running: s.status === '执行中' }">{{ s.status }}</span>
                        <span class="act">{{ s.action }}</span>
                        <span v-if="s.params" class="params">{{ s.params }}</span>
                      </div>
                      <div v-if="s.note" class="sm-step-note">{{ s.note }}</div>
                      <div class="sm-step-foot">
                        <!-- 结果标记仅展示，不做功能按钮 -->
                        <div class="sm-step-marks">
                          <span
                            v-for="m in STEP_MARKS"
                            :key="m"
                            class="sm-chip"
                            :class="{ on: s.result === m, [MARK_CLASS[m]]: s.result === m }"
                          >{{ m }}</span>
                        </div>
                      </div>
                      <div v-if="s.predict" class="sm-step-predict">【{{ s.predict.label }}】（截图差异 {{ s.predict.diff }}）</div>
                    </div>
                  </div>
                </div>
                <!-- 右侧已抓取数据：仅查看（商品图/名称/店铺名） -->
                <div class="sm-card sm-exec-data">
                  <div class="sm-exec-steps-head">已抓取数据</div>
                  <div class="sm-exec-data-list">
                    <div v-for="r in detailRecords" :key="r.id" class="sm-data-row">
                      <div class="sm-goods-img" :class="`tone-${toneOf(r)}`">{{ r.title.slice(0, 2) }}</div>
                      <div class="sm-data-info">
                        <div class="sm-data-title">{{ r.title }}</div>
                        <div class="sm-data-shop">{{ r.shop }}</div>
                      </div>
                    </div>
                    <div v-if="!detailRecords.length" class="sm-data-empty">暂无已抓取数据</div>
                  </div>
                </div>
              </div>
              <div class="sm-exec-shots">
                <div class="sm-card sm-shot-card">
                  <div class="sm-shot-title">操作前</div>
                  <div class="sm-shot-img" />
                </div>
                <div class="sm-card sm-shot-card">
                  <div class="sm-shot-title">操作后</div>
                  <div class="sm-shot-img" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>

      <!-- 重点操作二次确认弹窗 -->
      <div v-if="confirmBox" class="sm-modal-overlay" @click.self="confirmBox = null">
        <div class="sm-modal sm-modal-confirm">
          <h3>{{ confirmBox.title }}</h3>
          <div class="sm-modal-body">{{ confirmBox.message }}</div>
          <div class="sm-modal-foot">
            <button class="sm-btn" @click="confirmBox = null">取消</button>
            <button class="sm-btn primary" @click="doConfirm">确认</button>
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

    </div>
  </div>
</template>
