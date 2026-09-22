<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { Ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SgDetailPage from './SgDetailPage.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { SM_TASK_STATUS_META, genTaskId, nowTime, smRecordsSeed, smTasksSeed } from '../shunmai/data';
import type { SmTask, SmTaskStatus } from '../shunmai/data';
import { PLATFORM_LOGO, ecMain } from './data';
import type { SgProduct } from './shopGoodsData';

type CrawlStatus = '待完善' | '已完善' | '已导入';
interface MkRow {
  id: string;
  /** 商品ID（详情展示） */
  pid: string;
  name: string;
  img: string;
  plat: string;
  shop: string;
  sales: number;
  crawler: string;
  time: string;
  status: CrawlStatus;
}

/* 市场商机：顶 tab 淘宝顺买 / 视频号商机；视频号商机聚合小店商机＋推荐商机两模块，下方子 tab 切换 */
const TABS = [
  { key: 'taobao', label: '淘宝顺买' },
  { key: 'shunmai', label: '视频号商机' },
] as const;
type TabKey = (typeof TABS)[number]['key'];
const tab = ref<TabKey>('taobao');
/* 视频号商机子 tab：小店商机 / 推荐商机 两个模块 */
const SUB_TABS = [
  { key: 'xiaodian', label: '小店商机' },
  { key: 'shipinhao', label: '推荐商机' },
] as const;
type SubTabKey = (typeof SUB_TABS)[number]['key'];
const subTab = ref<SubTabKey>('xiaodian');
/* 视图判定：视频号模式＝顺买商机＋视频号子 tab；小店模式＝顺买商机＋小店子 tab */
const isVh = computed(() => tab.value === 'shunmai' && subTab.value === 'shipinhao');
const isXd = computed(() => tab.value === 'shunmai' && subTab.value === 'xiaodian');

const taobaoRows: MkRow[] = [
  { id: 't1', pid: '726184905531', name: '【10A抗菌】桂枫3.0Pro玻尿酸凉感深睡重力被 夏凉被', img: ecMain(0), plat: '淘宝', shop: '白屿家居小铺', sales: 1286, crawler: '李昀川', time: '2026-08-23 18:42:10', status: '待完善' },
  { id: 't2', pid: '718493026674', name: '免打孔置物架卫生间浴室壁挂收纳架厨房杂物架', img: ecMain(1), plat: '淘宝', shop: '乐居家品旗舰店', sales: 3542, crawler: '王思远', time: '2026-08-23 16:21:33', status: '已完善' },
  { id: 't3', pid: '709261483355', name: '316不锈钢保温杯大容量车载水杯男女便携直饮', img: ecMain(2), plat: '淘宝', shop: '臻品厨具专营店', sales: 867, crawler: '王思远', time: '2026-08-23 11:35:20', status: '已导入' },
];
const xiaodianRows: MkRow[] = [
  { id: 'x1', pid: '731650298842', name: '致奇（送辅助液）明星同款叶黄素艾草蒸汽眼罩20贴', img: ecMain(3), plat: '视频号', shop: '朵拉优选日用', sales: 2173, crawler: '李昀川', time: '2026-08-23 18:40:55', status: '待完善' },
  { id: 'x2', pid: '715908362247', name: '智能感应夜灯人体感应小夜灯卧室床头起夜灯', img: ecMain(4), plat: '视频号', shop: '暖光照明工厂店', sales: 489, crawler: '陈晓', time: '2026-08-23 15:07:48', status: '待完善' },
];

/* 视频号推荐商机：热度指数为近30日区间值（如 51-55）；top 为同类目近期推荐排名，null 未上榜 */
interface VhRow {
  id: string;
  name: string;
  img: string;
  /** 价格：具体值或区间（如 ¥29.90 ~ ¥59.90） */
  price: string;
  exposure: string;
  deal: string;
  shop: string;
  top: number | null;
  category: string;
}
const vhRows: VhRow[] = [
  { id: 'v1', name: '【秋冬养护】玻尿酸补水修护精华液 30ml 保湿面部 serum', img: ecMain(5), price: '¥39.90', exposure: '51-55', deal: '96-100', shop: '朵拉优选日用', top: 1, category: '美妆个护' },
  { id: 'v2', name: '叶黄素艾草蒸汽眼罩 20贴 缓解眼疲劳热敷', img: ecMain(3), price: '¥29.90 ~ ¥45.90', exposure: '56-60', deal: '96-100', shop: '朵拉优选日用', top: 2, category: '美妆个护' },
  { id: 'v3', name: '智能感应夜灯人体感应小夜灯卧室床头起夜灯', img: ecMain(4), price: '¥19.90 ~ ¥29.90', exposure: '46-50', deal: '91-95', shop: '暖光照明工厂店', top: 3, category: '家居日用' },
  { id: 'v4', name: '316不锈钢保温杯大容量车载水杯男女便携直饮', img: ecMain(2), price: '¥49.90', exposure: '51-55', deal: '91-95', shop: '臻品厨具专营店', top: null, category: '家居日用' },
  { id: 'v5', name: '坚果燕麦片早餐代餐冲饮 500g×2袋 无蔗糖', img: ecMain(6), price: '¥35.80 ~ ¥42.80', exposure: '56-60', deal: '91-95', shop: '乐居家品旗舰店', top: null, category: '食品生鲜' },
  { id: 'v6', name: '休闲宽松连帽卫衣女秋季新款外套上衣', img: ecMain(7), price: '¥89.00', exposure: '41-45', deal: '86-90', shop: '白屿家居小铺', top: 5, category: '服饰鞋包' },
  { id: 'v7', name: '重力被夏凉被深睡空调被可机洗四季通用', img: ecMain(0), price: '¥129.00 ~ ¥189.00', exposure: '46-50', deal: '86-90', shop: '白屿家居小铺', top: null, category: '家居日用' },
  { id: 'v8', name: '便携式迷你榨汁杯家用小型果汁机', img: ecMain(8), price: '¥79.90', exposure: '36-40', deal: '81-85', shop: '臻品厨具专营店', top: 8, category: '数码家电' },
];
/* 排序取值：价格/区间均取首个数字（区间下限） */
const loOf = (s: string) => { const m = s.match(/\d+(\.\d+)?/); return m ? parseFloat(m[0]) : 0; };

/* 筛选：商品信息 / 店铺名称 / 抓取人 / 抓取时间 */
const empty = { info: '', shop: '', crawler: '', from: '2026-08-23', to: '2026-08-29' };
const filter = ref({ ...empty });
const applied = ref({ ...empty });
const timeSort = ref<'none' | 'asc' | 'desc'>('none');
const salesSort = ref<'none' | 'asc' | 'desc'>('none');
/* 销量/时间单列排序互斥：启用其一时重置另一列 */
const toggleSalesSort = () => {
  timeSort.value = 'none';
  salesSort.value = salesSort.value === 'asc' ? 'desc' : 'asc';
};
const toggleTimeSort = () => {
  salesSort.value = 'none';
  timeSort.value = timeSort.value === 'asc' ? 'desc' : 'asc';
};

const switchTab = (k: TabKey) => {
  tab.value = k;
  filter.value = { ...empty };
  applied.value = { ...empty };
  timeSort.value = 'none';
  salesSort.value = 'none';
  vhFilter.value = { ...vhEmpty };
  vhApplied.value = { ...vhEmpty };
  vhSortKey.value = null;
  vhSortDir.value = 'asc';
};

/* 视频号推荐商机：筛选（草稿＋查询生效）＋单列排序（价格/曝光热度/成交热度/top，三态循环） */
const vhEmpty = { info: '', shop: '', category: '全部类目' };
const vhFilter = ref({ ...vhEmpty });
const vhApplied = ref({ ...vhEmpty });
const vhCatOpts = computed(() => ['全部类目', ...Array.from(new Set(vhRows.map((r) => r.category)))]);
type VhSortKey = 'price' | 'exposure' | 'deal' | 'top';
const vhSortKey = ref<VhSortKey | null>(null);
const vhSortDir = ref<'asc' | 'desc'>('asc');
const toggleVhSort = (k: VhSortKey) => {
  if (vhSortKey.value !== k) { vhSortKey.value = k; vhSortDir.value = 'asc'; return; }
  if (vhSortDir.value === 'asc') { vhSortDir.value = 'desc'; return; }
  vhSortKey.value = null;
  vhSortDir.value = 'asc';
};
const vhSortState = (k: VhSortKey): 'none' | 'asc' | 'desc' => (vhSortKey.value === k ? vhSortDir.value : 'none');
const vhList = computed(() => {
  const arr = vhRows.filter((r) => {
    if (vhApplied.value.info && !r.name.includes(vhApplied.value.info)) return false;
    if (vhApplied.value.shop && !r.shop.includes(vhApplied.value.shop)) return false;
    if (vhApplied.value.category !== '全部类目' && r.category !== vhApplied.value.category) return false;
    return true;
  });
  if (vhSortKey.value) {
    const val = (r: VhRow) => (vhSortKey.value === 'top' ? (r.top ?? Number.MAX_SAFE_INTEGER) : vhSortKey.value === 'price' ? loOf(r.price) : vhSortKey.value === 'exposure' ? loOf(r.exposure) : loOf(r.deal));
    arr.sort((a, b) => (val(a) - val(b)) * (vhSortDir.value === 'asc' ? 1 : -1));
  }
  return arr;
});
/* 筛选/重置按钮：按当前 tab 生效对应草稿（互不干扰） */
const applyFilter = () => { applied.value = { ...filter.value }; vhApplied.value = { ...vhFilter.value }; };
const resetFilter = () => {
  filter.value = { ...empty }; applied.value = { ...empty };
  vhFilter.value = { ...vhEmpty }; vhApplied.value = { ...vhEmpty };
  vhSortKey.value = null; vhSortDir.value = 'asc';
};
/* 分页计数：按当前 tab 取对应列表长度 */
const totalRows = computed(() => (isVh.value ? vhList.value.length : list.value.length));

const list = computed(() => {
  const rows = tab.value === 'taobao' ? taobaoRows : xiaodianRows;
  const arr = rows.filter((r) => {
    if (applied.value.info && !r.name.includes(applied.value.info)) return false;
    if (applied.value.shop && !r.shop.includes(applied.value.shop)) return false;
    if (applied.value.crawler && !r.crawler.includes(applied.value.crawler)) return false;
    if (applied.value.from && r.time.slice(0, 10) < applied.value.from) return false;
    if (applied.value.to && r.time.slice(0, 10) > applied.value.to) return false;
    return true;
  });
  if (salesSort.value !== 'none') arr.sort((a, b) => (a.sales - b.sales) * (salesSort.value === 'asc' ? 1 : -1));
  if (timeSort.value !== 'none') arr.sort((a, b) => (a.time < b.time ? -1 : 1) * (timeSort.value === 'asc' ? 1 : -1));
  return arr;
});

const statusCls = (s: CrawlStatus) => (s === '已完善' ? 'green' : s === '已导入' ? 'blue' : 'orange');

/* 详情：复用内部商机同款店铺商品详情（仅查看）；商机行缺失字段以 '-' 占位 */
const detail = ref<MkRow | null>(null);
const toSg = (r: MkRow): SgProduct => ({
  id: r.pid, title: r.name, img: r.img, linkId: r.pid, seriesCode: '-',
  status: 'selling', strategy: '未关联', sales: String(r.sales), reviews: '-',
  publisher: '-', store: r.shop, storePlatform: r.plat, source: '市场商机',
  version: r.pid, operator: r.crawler, sold30: '-', exposure: '-',
  category: ['-', '-', '-'],
  publishTime: r.time, createTime: r.time,
});

/* 导入到：与竞价商品同款 add-pop 气泡（淘宝 / 视频号） */
const addTip = ref<{ x: number; y: number } | null>(null);
const openAddTip = (e: MouseEvent) => {
  addTip.value = { x: e.clientX + 4, y: e.clientY + 4 };
};

/* 创建任务弹窗 */
const createModal = ref(false);
const createForm = ref({ name: '', topic: '', count: '30' });
const openCreate = () => {
  /* 设备门禁：手机连接与淘宝应用均未就绪时不允许创建任务 */
  if (!phoneConnected.value && !taobaoAppOpen.value) { pushToast('手机连接与淘宝应用均未就绪，暂不允许创建任务', 'error'); return; }
  createForm.value = { name: '', topic: '', count: '30' }; createModal.value = true;
};
const confirmCreate = () => {
  if (!createForm.value.name.trim()) { pushToast('请输入任务名称', 'error'); return; }
  if (!createForm.value.topic.trim()) { pushToast('请输入搜索主题', 'error'); return; }
  const count = parseInt(createForm.value.count, 10);
  if (!count || count <= 0) { pushToast('抓取条数需大于 0', 'error'); return; }
  /* 新任务入执行管道：设备面板「任务执行」弹窗实时可见 */
  tasks.value.unshift({
    id: genTaskId(), name: createForm.value.name.trim(), topic: createForm.value.topic.trim(),
    targetCount: count, status: 'queued', successCount: 0, failCount: 0, createdAt: nowTime(),
  });
  createModal.value = false;
  pushToast('任务创建成功');
};

/* 设备状态：与顺买商机工作台同源（手机连接 / 淘宝应用），悬浮球展开面板展示并可手动更新 */
const phoneConnected = ref(true);
const taobaoAppOpen = ref(true);
const deviceUpdating = ref(false);
const deviceUpdatedAt = ref('');
/* 悬浮球展开态；deviceReady 驱动角标颜色（红=两项均未就绪，即创建门禁触发态） */
const devOpen = ref(false);
/* 当前展示页：悬浮球仅市场商机页展示（页面 v-show 保活，Teleport 到 body 不加门禁会漏到其它页）；离页顺手收起面板 */
const opsPage = inject<Ref<string>>('opsPage');
watch(() => opsPage?.value, (v) => { if (v !== 'market') devOpen.value = false; });
const deviceReady = computed(() => phoneConnected.value && taobaoAppOpen.value);
/* 悬浮球拖拽：pointerdown 后位移超 4px 进入拖拽（clamp 在视口内），并抑制随后的点击展开 */
const fabPos = ref<{ x: number; y: number } | null>(null);
const fabDragged = ref(false);
const onFabDown = (e: PointerEvent) => {
  const wrap = (e.currentTarget as HTMLElement).closest('.mk-dev-fab-wrap') as HTMLElement;
  const r = wrap.getBoundingClientRect();
  const st = { px: e.clientX, py: e.clientY, ox: r.left, oy: r.top, moved: false };
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - st.px;
    const dy = ev.clientY - st.py;
    if (!st.moved && Math.hypot(dx, dy) < 4) return;
    st.moved = true;
    const x = Math.min(Math.max(st.ox + dx, 8), window.innerWidth - wrap.offsetWidth - 8);
    const y = Math.min(Math.max(st.oy + dy, 8), window.innerHeight - wrap.offsetHeight - 8);
    fabPos.value = { x, y };
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    fabDragged.value = st.moved;
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
};
const onFabClick = () => {
  if (fabDragged.value) { fabDragged.value = false; return; }
  devOpen.value = !devOpen.value;
};
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

/* ── 任务执行情况：与顺买商机任务同模型（种子快照＋本地单执行位管道），入口在设备状态面板 ── */
const tasks = ref<SmTask[]>(smTasksSeed.map((t) => ({ ...t })));
const taskModal = ref(false);
/* 进度辅助：百分比 / 待抓取 / 分段宽度 / 执行时间区间（口径同顺买商机任务列表） */
const progressPct = (t: SmTask) => (t.targetCount ? Math.round(((t.successCount + t.failCount) / t.targetCount) * 100) : 0);
const remainingOf = (t: SmTask) => Math.max(0, t.targetCount - t.successCount - t.failCount);
const segWidth = (n: number, t: SmTask) => (t.targetCount ? `${(n / t.targetCount) * 100}%` : '0%');
const execRange = (t: SmTask) => (!t.startedAt ? '-' : `${t.startedAt} ~ ${t.finishedAt || '执行中'}`);
const finishTask = (t: SmTask) => {
  t.status = t.successCount > 0 ? 'success' : 'fail';
  t.finishedAt = nowTime();
};
/* 执行管道：单执行位（暂停保留执行位），空位时队列任务自动晋升；抓取中按tick出数，满额结算已完成/失败 */
const tickTasks = () => {
  let running = tasks.value.find((t) => t.status === 'running');
  if (!running) {
    if (tasks.value.some((t) => t.status === 'paused')) return;
    const next = tasks.value.find((t) => t.status === 'queued');
    if (!next) return;
    next.status = 'running';
    next.startedAt = nowTime();
    running = next;
  }
  const remaining = running.targetCount - running.successCount - running.failCount;
  if (remaining <= 0) { finishTask(running); return; }
  const batch = Math.min(remaining, 1 + Math.floor(Math.random() * 3));
  for (let i = 0; i < batch; i++) {
    /* 失败尝试仅计数（体现在任务进度），不产生商机记录 */
    if (Math.random() > 0.15) running.successCount += 1; else running.failCount += 1;
  }
  if (running.successCount + running.failCount >= running.targetCount) finishTask(running);
};
let taskTimer = 0;
onMounted(() => { taskTimer = window.setInterval(tickTasks, 800); });
onBeforeUnmount(() => { window.clearInterval(taskTimer); });
/* 设备面板入口pill：执行中 > 已暂停 > 队列中 > 空闲 */
const taskPill = computed(() => {
  if (tasks.value.some((t) => t.status === 'running')) return { text: '执行中', cls: 'ok' };
  if (tasks.value.some((t) => t.status === 'paused')) return { text: '已暂停', cls: 'warn' };
  if (tasks.value.some((t) => t.status === 'queued')) return { text: '队列中', cls: 'blue' };
  return { text: '空闲', cls: 'off' };
});
/* 执行中任务数：驱动悬浮球执行态样式（呼吸蓝环＋计数角标），面板收起时状态也一眼可见 */
const runningCount = computed(() => tasks.value.filter((t) => t.status === 'running').length);
/* 弹窗筛选（草稿 + 查询生效） */
const taskStatusOpts = [
  { value: 'all', label: '全部状态' },
  { value: 'queued', label: '队列中' },
  { value: 'running', label: '抓取中' },
  { value: 'paused', label: '已暂停' },
  { value: 'success', label: '已完成' },
  { value: 'fail', label: '失败' },
  { value: 'canceled', label: '已取消' },
];
const taskKw = ref('');
const taskStatus = ref<'all' | SmTaskStatus>('all');
const appliedKw = ref('');
const appliedStatus = ref<'all' | SmTaskStatus>('all');
const applyTaskFilter = () => { appliedKw.value = taskKw.value.trim(); appliedStatus.value = taskStatus.value; };
const resetTaskFilter = () => {
  taskKw.value = ''; taskStatus.value = 'all';
  appliedKw.value = ''; appliedStatus.value = 'all';
};
const filteredTasks = computed(() => tasks.value.filter((t) => {
  if (appliedStatus.value !== 'all' && t.status !== appliedStatus.value) return false;
  if (appliedKw.value && !t.name.includes(appliedKw.value) && !t.topic.includes(appliedKw.value)) return false;
  return true;
}));
/* 重点操作二次确认（终止/删除不可逆，统一走确认弹窗） */
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const doConfirm = () => { confirmBox.value?.onOk(); confirmBox.value = null; };
/* 查看/详情：行内展开该任务抓取成功的记录（口径同顺买商机查看抓取数据） */
const expanded = ref<string | null>(null);
const toggleExpand = (t: SmTask) => { expanded.value = expanded.value === t.id ? null : t.id; };
const recTpl = smRecordsSeed.filter((r) => r.status === 'success');
const recordsOf = (t: SmTask) => Array.from({ length: t.successCount }, (_, i) => ({ ...recTpl[i % recTpl.length], id: `${t.id}-D${i}` }));
/* 操作列：按状态分发（暂停/继续/终止/取消/重试/删除操作本地管道） */
interface MkTaskAct { label: string; danger?: boolean; run: () => void; }
const taskActs = (t: SmTask): MkTaskAct[] => {
  const acts: MkTaskAct[] = [];
  if (t.status === 'queued') acts.push({ label: '取消', run: () => { t.status = 'canceled'; pushToast(`任务 ${t.name} 已取消`); } });
  if (t.status === 'running' || t.status === 'paused') acts.push({ label: '详情', run: () => toggleExpand(t) });
  if (t.status === 'running') acts.push({ label: '暂停', run: () => { t.status = 'paused'; pushToast(`任务 ${t.name} 已暂停`); } });
  if (t.status === 'paused') acts.push({ label: '继续', run: () => { t.status = 'running'; pushToast(`任务 ${t.name} 继续抓取`); } });
  if (t.status === 'running' || t.status === 'paused') acts.push({
    label: '终止', danger: true,
    run: () => askConfirm('终止任务', `终止任务「${t.name}」？终止后记为已取消`, () => {
      t.status = 'canceled';
      t.finishedAt = nowTime();
      pushToast(`任务 ${t.name} 已终止`);
    }),
  });
  if (t.status === 'success') acts.push({ label: '查看', run: () => toggleExpand(t) });
  if (t.status === 'fail' || t.status === 'canceled') acts.push({
    label: '重试',
    run: () => {
      t.successCount = 0; t.failCount = 0; t.startedAt = undefined; t.finishedAt = undefined;
      const occupied = tasks.value.some((x) => x.status === 'running' || x.status === 'paused');
      if (occupied) { t.status = 'queued'; pushToast('已有任务执行中，已加入队列'); }
      else { t.status = 'running'; t.startedAt = nowTime(); pushToast(`任务 ${t.name} 已重试`); }
    },
  });
  /* 抓取中/队列中不提供删除（先终止或取消） */
  if (t.status !== 'running' && t.status !== 'queued') acts.push({
    label: '删除', danger: true,
    run: () => askConfirm('删除任务', `删除任务「${t.name}」？任务删除后并不会删除已抓取的商机数据`, () => {
      tasks.value = tasks.value.filter((x) => x.id !== t.id);
      pushToast('任务已删除');
    }),
  });
  return acts;
};

/* 全网搜索：跳转商机中心-全网搜索页 */
const opsGo = inject<(target: 'search') => void>('opsGo');
/* 前往顺买商机应用：跨应用切换顶层 tab（App 层 provide） */
const goApp = inject<(key: string) => void>('goApp');
</script>

<template>
  <SgDetailPage
    v-if="detail"
    :product="toSg(detail)"
    hide-edit
    :foot="[{ text: '添加到淘宝', cls: 'primary' }, { text: '添加到视频号', cls: 'primary' }]"
    @back="detail = null"
  />
  <div v-else class="sg-page mk-page">
    <div class="mk2-top" :class="{ solo: tab !== 'shunmai' }">
      <div class="mk2-seg">
        <div v-for="t in TABS" :key="t.key" class="mk2-tab" :class="{ active: tab === t.key }" @click="switchTab(t.key)">{{ t.label }}</div>
      </div>
      <div class="mk2-top-acts">
        <button class="sg-btn" @click="goApp?.('shunmai')">前往顺买商机应用</button>
        <button class="sg-btn primary" @click="pushToast('列表已刷新')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
          刷新
        </button>
      </div>
    </div>

    <!-- 视频号商机子 tab：卡二层药丸 chip（灰底 / 选中浅主色底），切换小店商机 / 推荐商机两模块 -->
    <div v-if="tab === 'shunmai'" class="mk2-subseg">
      <div v-for="s in SUB_TABS" :key="s.key" class="mk2-subtab" :class="{ active: subTab === s.key }" @click="subTab = s.key">{{ s.label }}</div>
    </div>

    <div class="sg-filter">
      <div class="sg-grid" :class="{ 'mk-vh-grid': isVh }">
        <template v-if="!isVh">
          <div class="sg-field">
            <label>商品信息</label>
            <input class="sg-input" placeholder="请输入商品信息" :value="filter.info" @input="filter = { ...filter, info: ($event.target as HTMLInputElement).value }" />
          </div>
          <div class="sg-field">
            <label>店铺名称</label>
            <input class="sg-input" placeholder="请输入店铺名称" :value="filter.shop" @input="filter = { ...filter, shop: ($event.target as HTMLInputElement).value }" />
          </div>
          <div class="sg-field">
            <label>{{ isXd ? '创建人' : '抓取人' }}</label>
            <input class="sg-input" :placeholder="isXd ? '请输入创建人' : '请输入抓取人'" :value="filter.crawler" @input="filter = { ...filter, crawler: ($event.target as HTMLInputElement).value }" />
          </div>
          <div class="sg-field">
            <label>{{ isXd ? '创建时间' : '抓取时间' }}</label>
            <DateRangePicker v-model:from="filter.from" v-model:to="filter.to" placeholder="请选择日期范围" />
          </div>
        </template>
        <!-- 视频号推荐商机：独立查询条件（商品信息/店铺名称/商品类目） -->
        <template v-else>
          <div class="sg-field">
            <label>商品信息</label>
            <input class="sg-input" placeholder="请输入商品信息" :value="vhFilter.info" @input="vhFilter = { ...vhFilter, info: ($event.target as HTMLInputElement).value }" />
          </div>
          <div class="sg-field">
            <label>店铺名称</label>
            <input class="sg-input" placeholder="请输入店铺名称" :value="vhFilter.shop" @input="vhFilter = { ...vhFilter, shop: ($event.target as HTMLInputElement).value }" />
          </div>
          <div class="sg-field">
            <label>商品类目</label>
            <BubbleSelect class-name="sg-select" :value="vhFilter.category" :options="vhCatOpts" @change="(v) => vhFilter = { ...vhFilter, category: v }" />
          </div>
        </template>
        <div class="sg-actions">
          <button v-if="!isVh" class="sg-btn" @click="pushToast('批量导入：演示环境暂不可用')">
            批量导入
          </button>
          <button class="sg-btn" @click="resetFilter">
            重置
          </button>
          <button class="sg-btn primary" @click="applyFilter">
            查询
          </button>
          <!-- 创建任务：置于查询右侧（筛选操作行内） -->
          <button v-if="!isVh" class="sg-btn primary" @click="openCreate">创建任务</button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table v-if="!isVh" class="sg-table mk-table">
          <thead>
            <tr>
              <th :style="{ width: '4%' }"><input type="checkbox" /></th>
              <!-- 列占比均衡：各列宽度和恒为 100%（fixed 布局余宽会被首列吸收），商品信息按 tab 微调 -->
              <th :style="{ width: isXd ? '40%' : '50%' }">商品信息</th>
              <SortTh label="销量" width="13%" :state="salesSort" @sort="toggleSalesSort" />
              <SortTh :label="(isXd ? '创建人/创建时间' : '抓取人/抓取时间')" width="21%" :state="timeSort" @sort="toggleTimeSort" />
              <th v-if="isXd" :style="{ width: '10%' }">抓取状态</th>
              <th :style="{ width: '12%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td><input type="checkbox" /></td>
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="r.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                    <!-- 商品信息单元格样式同内部商机（图二）：标题黑色单行＋店铺灰字行带平台 LOGO；不展示商品ID/竞品链接 -->
                    <div class="ib-meta">
                      店铺：
                      <span class="store-logo"><img :src="PLATFORM_LOGO[r.plat]" alt="" /></span>
                      {{ r.shop }}
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ r.sales }}</td>
              <td>
                <div class="mk-ct">{{ r.crawler }}</div>
                <div class="mk-ct-t">{{ r.time }}</div>
              </td>
              <td v-if="isXd"><span class="sgd-tag" :class="statusCls(r.status)">{{ r.status }}</span></td>
              <td class="actions-col">
                <a href="#" @click.prevent="detail = r">详情</a>
                <a href="#" @click.prevent="opsGo?.('search')">全网搜索</a>
                <a href="#" @click.prevent.stop="openAddTip">导入到</a>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 视频号推荐商机：商品信息（图+名+店铺名副行）/商品类目/价格/同类目近期推荐top/双热度指数（ⓘ 悬浮说明）/操作（全网搜索），列序按业务序号 -->
        <table v-else class="sg-table mk-table">
          <thead>
            <tr>
              <th :style="{ width: '32%' }">商品信息</th>
              <th :style="{ width: '10%' }">商品类目</th>
              <SortTh label="价格" width="12%" :state="vhSortState('price')" @sort="toggleVhSort('price')" />
              <SortTh label="同类目近期推荐top" width="12%" :state="vhSortState('top')" @sort="toggleVhSort('top')" />
              <SortTh label="曝光热度指数" width="12%" :state="vhSortState('exposure')" @sort="toggleVhSort('exposure')">
                <i class="sg-sales-hd-i" title="商品近30日在视频号渠道的曝光热度，按区间展示；区间越高曝光越热" @click.stop>ⓘ</i>
              </SortTh>
              <SortTh label="成交热度指数" width="12%" :state="vhSortState('deal')" @sort="toggleVhSort('deal')">
                <i class="sg-sales-hd-i" title="商品近30日在视频号渠道的成交热度，按区间展示；区间越高成交越热" @click.stop>ⓘ</i>
              </SortTh>
              <th :style="{ width: '10%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in vhList" :key="r.id">
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="r.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                    <div class="ib-meta">{{ r.shop }}</div>
                  </div>
                </div>
              </td>
              <td>{{ r.category }}</td>
              <td>{{ r.price }}</td>
              <td>
                <span v-if="r.top" class="mk-vh-top" :class="{ hot: r.top <= 3 }">TOP {{ r.top }}</span>
                <span v-else class="sg-dash">-</span>
              </td>
              <td>{{ r.exposure }}</td>
              <td>{{ r.deal }}</td>
              <td class="actions-col">
                <a href="#" @click.prevent="opsGo?.('search')">全网搜索</a>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="totalRows === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ totalRows }} 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="10条/页" :options="['10条/页', '20条/页', '50条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <!-- 设备状态：整页悬浮球＋展开面板（fixed 悬浮不占页面布局、可拖拽定位；Teleport 到 body） -->
    <Teleport to="body">
      <div v-if="opsPage === 'market'" class="mk-dev-fab-wrap" :style="fabPos ? { left: `${fabPos.x}px`, top: `${fabPos.y}px`, right: 'auto', bottom: 'auto' } : null">
        <div v-if="devOpen" class="mk-device-panel" :class="{ flip: !!fabPos && fabPos.x < 280, drop: !!fabPos && fabPos.y < 340 }">
          <div class="mk-device-head">
            <span>设备状态</span>
            <div class="mk-head-acts">
              <button class="mk-refresh-btn" :class="{ spinning: deviceUpdating }" @click="refreshDeviceStatus">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></svg>
                更新状态
              </button>
              <button class="mk-close-btn" title="关闭" @click="devOpen = false">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <div class="mk-device-list">
            <div class="mk-device-row">
              <div class="mk-device-ico">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
              </div>
              <span class="mk-device-name">手机连接</span>
              <span class="mk-device-pill" :class="phoneConnected ? 'ok' : 'off'"><i />{{ phoneConnected ? '已连接' : '未连接' }}</span>
            </div>
            <div class="mk-device-row">
              <div class="mk-device-ico">
                <img class="mk-taobao-logo" :class="{ off: !taobaoAppOpen }" src="/logos/taobao.png" alt="淘宝" />
              </div>
              <span class="mk-device-name">淘宝应用</span>
              <span class="mk-device-pill" :class="taobaoAppOpen ? 'ok' : 'off'"><i />{{ taobaoAppOpen ? '已打开' : '未打开' }}</span>
            </div>
          </div>
          <!-- 任务执行子区：同面板但与设备状态区分形态——分隔线＋子区标题（带实时状态 pill）＋着色可点卡片入口，点击开执行情况弹窗 -->
          <div class="mk-task-sec">
            <div class="mk-task-sec-head">
              <span>任务执行</span>
              <span class="mk-device-pill" :class="taskPill.cls"><i />{{ taskPill.text }}</span>
            </div>
            <button class="mk-task-card" title="查看任务执行情况" @click="taskModal = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
              查看执行情况
              <span class="mk-task-chev">›</span>
            </button>
          </div>
          <div class="mk-device-foot">更新于 {{ deviceUpdatedAt || '--' }}</div>
        </div>
        <button class="mk-dev-fab" :class="{ warn: !deviceReady, run: runningCount > 0 }" :title="deviceReady ? '设备状态' : '设备未就绪'" @pointerdown="onFabDown" @click="onFabClick">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>
          <i class="mk-dev-dot" :class="deviceReady ? 'ok' : 'off'" />
          <i v-if="runningCount > 0" class="mk-dev-run-badge">{{ runningCount }}</i>
        </button>
      </div>
    </Teleport>

    <!-- 创建任务弹窗 -->
    <Teleport to="body">
      <div v-if="createModal" class="mk-create-mask" @click.self="createModal = false">
        <div class="mk-create-modal">
          <div class="mk-create-head">新建抓取任务</div>
          <div class="mk-create-body">
            <div class="sg-field">
              <label>任务名称</label>
              <input class="sg-input" placeholder="请输入任务名称" :value="createForm.name" @input="createForm = { ...createForm, name: ($event.target as HTMLInputElement).value }" />
            </div>
            <div class="sg-field">
              <label>搜索主题</label>
              <input class="sg-input" placeholder="请输入搜索主题" :value="createForm.topic" @input="createForm = { ...createForm, topic: ($event.target as HTMLInputElement).value }" />
            </div>
            <div class="sg-field">
              <label>抓取条数</label>
              <input class="sg-input" :value="createForm.count" @input="createForm = { ...createForm, count: ($event.target as HTMLInputElement).value }" />
            </div>
          </div>
          <div class="mk-create-foot">
            <button class="sg-btn" @click="createModal = false">取消</button>
            <button class="sg-btn primary" @click="confirmCreate">创建</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 任务执行情况弹窗：入口为设备面板「任务执行」行；内容同顺买商机任务列表（筛选＋进度表） -->
    <Teleport to="body">
      <div v-if="taskModal" class="mk-create-mask mk-task-mask" @click.self="taskModal = false">
        <div class="mk-task-modal">
          <div class="mk-task-head">
            <span>任务执行情况</span>
            <button class="mk-task-close" title="关闭" @click="taskModal = false">×</button>
          </div>
          <div class="mk-task-body">
            <div class="mk-task-filter">
              <div class="sg-field kw">
                <label>任务名称/主题</label>
                <input class="sg-input" placeholder="请输入任务名称/主题" :value="taskKw" @input="taskKw = ($event.target as HTMLInputElement).value" @keyup.enter="applyTaskFilter" />
              </div>
              <div class="sg-field">
                <label>状态</label>
                <BubbleSelect class-name="sg-select" :value="taskStatus" :options="taskStatusOpts" @change="(v) => taskStatus = v as 'all' | SmTaskStatus" />
              </div>
              <div class="mk-task-btns">
                <button class="sg-btn" @click="resetTaskFilter">重置</button>
                <button class="sg-btn primary" @click="applyTaskFilter">查询</button>
              </div>
            </div>
            <div class="mk-task-table-wrap">
              <table class="mk-task-table">
                <thead>
                  <tr>
                    <th :style="{ width: '15%' }">任务名称</th>
                    <th :style="{ width: '15%' }">搜索主题</th>
                    <th :style="{ width: '8%' }">状态</th>
                    <th :style="{ width: '22%' }">进度</th>
                    <th :style="{ width: '13%' }">创建时间</th>
                    <th :style="{ width: '17%' }">执行时间</th>
                    <th :style="{ width: '10%' }">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="t in filteredTasks" :key="t.id">
                    <tr>
                      <!-- 名称/主题完整展示不截断：弹窗加宽后换行排布 -->
                      <td>{{ t.name }}</td>
                      <td>{{ t.topic }}</td>
                      <td>
                        <span class="mk-task-tag" :style="{ color: SM_TASK_STATUS_META[t.status].color, background: SM_TASK_STATUS_META[t.status].bg }">{{ SM_TASK_STATUS_META[t.status].label }}</span>
                      </td>
                      <td>
                        <div class="mk-task-prog">
                          <span class="frac">{{ t.successCount + t.failCount }}/{{ t.targetCount }}</span>
                          <div class="track">
                            <div class="seg ok" :style="{ width: segWidth(t.successCount, t) }" />
                            <div class="seg fail" :style="{ width: segWidth(t.failCount, t) }" />
                            <div class="seg pend" :style="{ width: segWidth(remainingOf(t), t) }" />
                          </div>
                          <span class="pct">{{ progressPct(t) }}%</span>
                        </div>
                        <div class="mk-task-meta">
                          <span class="ok">成功 {{ t.successCount }}</span>
                          <span class="fail">失败 {{ t.failCount }}</span>
                          <span class="pend">待抓取 {{ remainingOf(t) }}</span>
                        </div>
                      </td>
                      <td>{{ t.createdAt }}</td>
                      <td>{{ execRange(t) }}</td>
                      <td class="mk-task-acts">
                        <a v-for="act in taskActs(t)" :key="act.label" :class="{ danger: act.danger }" href="#" @click.prevent="act.run()">{{ act.label }}</a>
                      </td>
                    </tr>
                    <!-- 查看/详情：行内展开抓取成功记录 -->
                    <tr v-if="expanded === t.id" class="mk-task-expand">
                      <td colspan="7">
                        <div class="mk-task-recs">
                          <table>
                            <thead>
                              <tr>
                                <th :style="{ width: '40%' }">商品标题</th>
                                <th :style="{ width: '30%' }">店铺</th>
                                <th :style="{ width: '10%' }">顺买价</th>
                                <th :style="{ width: '20%' }">抓取时间</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-for="r in recordsOf(t)" :key="r.id">
                                <td><Ellipsis :text="r.title" /></td>
                                <td><Ellipsis :text="r.shop" /></td>
                                <td>{{ r.price.toFixed(2) }}</td>
                                <td>{{ r.time }}</td>
                              </tr>
                              <tr v-if="t.successCount === 0">
                                <td colspan="4" class="mk-task-empty">暂无抓取成功数据</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  </template>
                  <tr v-if="filteredTasks.length === 0">
                    <td colspan="7" class="mk-task-empty">暂无任务</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 重点操作二次确认（终止/删除） -->
    <Teleport to="body">
      <div v-if="confirmBox" class="mk-create-mask mk-confirm-mask" @click.self="confirmBox = null">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">{{ confirmBox.title }}</div>
          <div class="mk-confirm-body">{{ confirmBox.message }}</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="confirmBox = null">取消</button>
            <button class="sg-btn primary" @click="doConfirm">确认</button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="addTip"
        class="add-pop"
        :style="{ left: `${addTip.x}px`, top: `${addTip.y}px` }"
        @mousedown.stop
      >
        <div v-for="t in ['淘宝', '视频号']" :key="t" class="add-pop-item" @click="addTip = null; pushToast(`已导入到${t}`)">
          {{ t }}
        </div>
      </div>
    </Teleport>
  </div>
</template>
