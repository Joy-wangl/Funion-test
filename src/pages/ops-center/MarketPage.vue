<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CSSProperties, Ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { SM_TASK_STATUS_META, genTaskId, nowTime, smRecordsSeed, smTasks } from '../shunmai/data';
import type { SmTask, SmTaskStatus } from '../shunmai/data';
import { PLATFORM_LOGO, ecMain } from './data';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

interface MkRow {
  id: string;
  name: string;
  img: string;
  plat: string;
  shop: string;
  sales: number;
  crawler: string;
  time: string;
  /** 顺买价（元，两位小数展示） */
  price: number;
  /** 是否完善：商品信息字段齐全度（已完善/未完善） */
  complete: boolean;
  /** 内部匹配：高置信度内部商品命中清单（平台/店铺/商品名称/商品ID/主卖系列编码/融合分/SKU 匹配度），空数组=无命中 */
  match: MkMatch[];
}
/** 命中内部商品：抽屉列表行字段（img 为内部商品主图） */
interface MkMatch {
  img: string;
  plat: string;
  shop: string;
  title: string;
  goodsId: string;
  series: string;
  fuse: number;
  sku: number;
}

/* 市场商机：顶 tab 淘宝顺买 / 视频号商机 / 竞店商品；视频号商机聚合小店商机＋推荐商机两模块，下方子 tab 切换 */
const TABS = [
  { key: 'taobao', label: '淘宝顺买' },
  { key: 'shunmai', label: '视频号商机' },
  { key: 'jd', label: '竞店商品' },
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
/* 竞店商品子 tab：竞店任务 / 店铺商品 两模块各自一套筛选＋列表 */
const JD_SUBS = [
  { key: 'task', label: '竞店任务' },
  { key: 'goods', label: '店铺商品' },
] as const;
type JdSubKey = (typeof JD_SUBS)[number]['key'];
const jdSub = ref<JdSubKey>('task');
const jdPaneRef = ref<HTMLElement | null>(null);
/* 切 tab 后列表高度变化，滚回内容区顶部，避免停在上一个 tab 的半截列表中间 */
const jdScrollTop = () => {
  const sc = jdPaneRef.value?.closest('.app-content') as HTMLElement | null;
  if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
};
const switchJdSub = (k: JdSubKey) => {
  if (jdSub.value === k) return;
  jdSub.value = k;
  nextTick(jdScrollTop);
};

/* 列表字段管理：非视频号（淘宝顺买/小店）与视频号推荐两表独立 scope；百分比宽表 sticky=false；小店独有列随 tab 动态增删 */
const cf = useColField('market', {
  fixedLeft: [{ key: 'check', pct: 4 }],
  get fields() {
    return isXd.value
      ? [
          { key: 'product', label: '商品信息', pct: 28 },
          { key: 'complete', label: '是否完善', pct: 7 },
          { key: 'price', label: '顺买价', pct: 7 },
          { key: 'sales', label: '销量', pct: 8 },
          { key: 'ct', label: '创建人/创建时间', pct: 12 },
          { key: 'match', label: '内部匹配', pct: 22 },
        ]
      : [
          { key: 'product', label: '商品信息', pct: 28 },
          { key: 'complete', label: '是否完善', pct: 7 },
          { key: 'price', label: '顺买价', pct: 7 },
          { key: 'sales', label: '销量', pct: 8 },
          { key: 'ct', label: '抓取人/抓取时间', pct: 12 },
          { key: 'match', label: '内部匹配', pct: 22 },
        ];
  },
  fixedRight: [{ key: 'actions', label: '操作', pct: 12 }],
  sticky: false,
});
const cfVh = useColField('marketVh', {
  fixedLeft: [],
  fields: [
    { key: 'product', label: '商品信息', pct: 32 },
    { key: 'category', label: '商品类目', pct: 10 },
    { key: 'price', label: '价格', pct: 12 },
    { key: 'top', label: '同类目近期推荐top', pct: 12 },
    { key: 'exposure', label: '曝光热度指数', pct: 12 },
    { key: 'deal', label: '成交热度指数', pct: 12 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', pct: 10 }],
  sticky: false,
});
const { midCols } = cf;
const { midCols: vhMid } = cfVh;

const taobaoRows: MkRow[] = [
  { id: 't1', name: '【10A抗菌】桂枫3.0Pro玻尿酸凉感深睡重力被 夏凉被', img: ecMain(0), plat: '淘宝', shop: '白屿家居小铺', sales: 1286, crawler: '李昀川', time: '2026-08-23 18:42:10', price: 19.9, complete: true, match: [
    { img: ecMain(7), plat: '抖音', shop: '锦致生活旗舰店', title: '休闲宽松连帽卫衣女秋季新款外套上衣 百搭通勤', goodsId: 'SP-10284752', series: 'ZH-LMWD-0921', fuse: 86.4, sku: 72.1 },
    { img: ecMain(9), plat: '淘宝', shop: '云朵优品旗舰店', title: '连帽卫衣女宽松bf风长袖上衣 慵懒风外套', goodsId: 'SP-10284509', series: 'ZH-LMWD-0921', fuse: 65.3, sku: 51.8 },
  ] },
  { id: 't2', name: '免打孔置物架卫生间浴室壁挂收纳架厨房杂物架', img: ecMain(1), plat: '淘宝', shop: '乐居家品旗舰店', sales: 3542, crawler: '王思远', time: '2026-08-23 16:21:33', price: 9.9, complete: true, match: [] },
  { id: 't3', name: '316不锈钢保温杯大容量车载水杯男女便携直饮', img: ecMain(2), plat: '淘宝', shop: '臻品厨具专营店', sales: 867, crawler: '王思远', time: '2026-08-23 11:35:20', price: 15.8, complete: false, match: [
    { img: ecMain(6), plat: '拼多多', shop: '谷麦甄选旗舰店', title: '坚果燕麦片早餐代餐冲饮 500g×2袋 无蔗糖', goodsId: 'SP-10451263', series: 'ZH-JGYM-0512', fuse: 78.2, sku: 61.5 },
  ] },
];
const xiaodianRows: MkRow[] = [
  { id: 'x1', name: '致奇（送辅助液）明星同款叶黄素艾草蒸汽眼罩20贴', img: ecMain(3), plat: '视频号', shop: '朵拉优选日用', sales: 2173, crawler: '李昀川', time: '2026-08-23 18:40:55', price: 12.9, complete: true, match: [] },
  { id: 'x2', name: '智能感应夜灯人体感应小夜灯卧室床头起夜灯', img: ecMain(4), plat: '视频号', shop: '暖光照明工厂店', sales: 489, crawler: '陈晓', time: '2026-08-23 15:07:48', price: 6.8, complete: false, match: [
    { img: ecMain(8), plat: '抖音', shop: '轻享好物旗舰店', title: '便携式迷你榨汁杯家用小型果汁机', goodsId: 'SP-10763211', series: 'ZH-ZBJ-0331', fuse: 74.6, sku: 58.9 },
  ] },
];
/* 销量展示口径同市场商机工作台：百位取整「已售N+」，过万取整「已售N万+」 */
const salesTxt = (n: number) => (n >= 10000 ? `已售${Math.floor(n / 10000)}万+` : `已售${Math.floor(n / 100) * 100}+`);
/* 内部匹配列表态命中数：match 为高置信度内部商品命中清单，命中计清单长度（列表仅展示 命中：N / 无命中） */
const hitCount = (r: MkRow) => r.match.length;
/* 查看内部商品：抽屉展示命中内部商品清单 */
type MatchDrawerPayload = { name: string; match: MkMatch[] };
const matchDrawer = ref<MatchDrawerPayload | null>(null);

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

/* 筛选：商品信息 / 店铺名称 / 抓取人 / 抓取时间 / 是否完善 / 匹配状态 */
const empty = { info: '', shop: '', crawler: '', from: '2026-08-23', to: '2026-08-29', complete: '全部', match: '全部状态' };
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
  matchDrawer.value = null;
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
    if (applied.value.complete === '已完善' && !r.complete) return false;
    if (applied.value.complete === '未完善' && r.complete) return false;
    if (applied.value.match === '已匹配' && !r.match.length) return false;
    if (applied.value.match === '未匹配' && r.match.length) return false;
    return true;
  });
  if (salesSort.value !== 'none') arr.sort((a, b) => (a.sales - b.sales) * (salesSort.value === 'asc' ? 1 : -1));
  if (timeSort.value !== 'none') arr.sort((a, b) => (a.time < b.time ? -1 : 1) * (timeSort.value === 'asc' ? 1 : -1));
  return arr;
});

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
const tasks = smTasks;
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
const filteredTasks = computed(() => {
  const out = tasks.value.filter((t) => {
    if (appliedStatus.value !== 'all' && t.status !== appliedStatus.value) return false;
    if (appliedKw.value && !t.name.includes(appliedKw.value) && !t.topic.includes(appliedKw.value)) return false;
    return true;
  });
  /* 创建时间 / 执行时间 列头排序（时间串 localeCompare，执行时间为空排末尾） */
  const k = taskSortKey.value;
  if (k && taskSortDir.value !== 'none') {
    const dir = taskSortDir.value === 'asc' ? 1 : -1;
    const val = (t: SmTask) => (k === 'created' ? t.createdAt : t.startedAt || '');
    return [...out].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (!va || !vb) return (va ? -1 : vb ? 1 : 0) * dir;
      return va.localeCompare(vb) * dir;
    });
  }
  return out;
});
/* 任务表排序状态：单列激活，点击循环 desc → asc → 取消 */
const taskSortKey = ref<'created' | 'exec' | ''>('');
const taskSortDir = ref<'none' | 'asc' | 'desc'>('none');
const onTaskSort = (k: 'created' | 'exec') => {
  if (taskSortKey.value !== k) {
    taskSortKey.value = k;
    taskSortDir.value = 'desc';
  } else if (taskSortDir.value === 'desc') {
    taskSortDir.value = 'asc';
  } else if (taskSortDir.value === 'asc') {
    taskSortKey.value = '';
    taskSortDir.value = 'none';
  } else {
    taskSortDir.value = 'desc';
  }
};
const taskSortState = (k: string) => (taskSortKey.value === k ? taskSortDir.value : 'none');
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

/* ── 竞店商品：外部数据 tab；竞店任务＋店铺商品同页上下两段（不再分子 tab，只保留顶栏一级 tab） ── */

/* 竞店任务：任务＝输入店铺名称后到该店监控商品销量；状态/最近更新时间给监控链路状态感 */
type JdTaskStatus = '监控中' | '已停止';
interface JdTaskRow {
  id: string;
  name: string;
  count: number;
  status: JdTaskStatus;
  updated: string;
  creator: string;
  time: string;
}
const jdTaskRows = ref<JdTaskRow[]>([
  { id: 'jt01', name: '义乌居家日用源头直供旗舰', count: 0, status: '监控中', updated: '2026-10-29 09:02:11', creator: '大侠', time: '2026-10-27 17:52:27' },
  { id: 'jt02', name: '果奇旗舰店', count: 3, status: '监控中', updated: '2026-10-29 09:12:44', creator: '大侠', time: '2026-10-27 17:52:12' },
  { id: 'jt03', name: '爱摩尼旗舰店', count: 3, status: '监控中', updated: '2026-10-29 08:57:03', creator: '大侠', time: '2026-10-27 17:51:58' },
  { id: 'jt04', name: '米卡博旗舰店', count: 46, status: '监控中', updated: '2026-10-29 09:10:26', creator: '大侠', time: '2026-10-27 17:51:33' },
  { id: 'jt05', name: '好管家旗舰店', count: 58, status: '监控中', updated: '2026-10-29 09:05:52', creator: '大侠', time: '2026-10-27 17:51:15' },
  { id: 'jt06', name: '小鹿家生活馆', count: 37, status: '已停止', updated: '2026-10-28 22:40:19', creator: '大侠', time: '2026-10-27 17:21:04' },
  { id: 'jt07', name: '万宝绿旗舰店', count: 25, status: '监控中', updated: '2026-10-29 08:49:37', creator: '大侠', time: '2026-10-27 17:20:51' },
  { id: 'jt08', name: '蘑菇小队日用百货创意小商品', count: 61, status: '监控中', updated: '2026-10-29 09:11:08', creator: '大侠', time: '2026-10-27 17:20:35' },
  { id: 'jt09', name: '俏俏家居精品日用百货小商品', count: 0, status: '已停止', updated: '2026-10-26 18:03:45', creator: '大侠', time: '2026-10-27 17:20:17' },
  { id: 'jt10', name: '可可尚佳家居旗舰店', count: 44, status: '监控中', updated: '2026-10-29 09:08:15', creator: '大侠', time: '2026-10-27 17:19:51' },
  { id: 'jt11', name: '诠艺旗舰店', count: 19, status: '监控中', updated: '2026-10-29 08:36:59', creator: '大侠', time: '2026-10-27 17:10:22' },
]);
const jdTaskEmpty = { name: '', creator: '', from: '', to: '' };
const jdTaskFilter = ref({ ...jdTaskEmpty });
const jdTaskApplied = ref({ ...jdTaskEmpty });
/* 筛选区收起/展开：收起态仅留操作行（参考图「收起^」） */
const jdTaskFold = ref(false);
const jdTaskList = computed(() => jdTaskRows.value.filter((r) => {
  if (jdTaskApplied.value.name && !r.name.includes(jdTaskApplied.value.name)) return false;
  if (jdTaskApplied.value.creator && !r.creator.includes(jdTaskApplied.value.creator)) return false;
  if (jdTaskApplied.value.from && r.time.slice(0, 10) < jdTaskApplied.value.from) return false;
  if (jdTaskApplied.value.to && r.time.slice(0, 10) > jdTaskApplied.value.to) return false;
  return true;
}));
/* 删除任务：不可逆，统一二次确认 */
const jdDeleteTask = (r: JdTaskRow) => askConfirm('删除任务', `删除竞店任务「${r.name}」？删除后不可恢复`, () => {
  jdTaskRows.value = jdTaskRows.value.filter((x) => x.id !== r.id);
  pushToast('任务已删除');
});

/* 创建竞店任务：筛选操作行主入口；弹窗仅店铺名称（必填）＋备注（选填） */
const jdCreateModal = ref(false);
const jdCreateForm = ref({ shop: '', note: '' });
const openJdCreate = () => { jdCreateForm.value = { shop: '', note: '' }; jdCreateModal.value = true; };
const confirmJdCreate = () => {
  const name = jdCreateForm.value.shop.trim();
  if (!name) { pushToast('请输入店铺名称', 'error'); return; }
  if (jdTaskRows.value.some((r) => r.name === name)) { pushToast(`竞店任务「${name}」已存在`, 'error'); return; }
  jdTaskRows.value.unshift({ id: `jt${Date.now()}`, name, count: 0, status: '监控中', updated: nowTime(), creator: '大侠', time: nowTime() });
  jdCreateModal.value = false;
  pushToast(`竞店任务「${name}」已创建，监控中`);
};

/* 店铺商品：售价红数 / 近两日销量（前日→当日＋涨幅）/ 更新时间 / 店铺副行按截图口径；种子均未完善 */
interface JdGoodsRow {
  id: string;
  name: string;
  img: string;
  shop: string;
  complete: boolean;
  price: number;
  /** 前一日销量 */
  salesPrev: number;
  /** 当日销量；涨幅＝当日－前日（筛选与排序同口径） */
  salesToday: number;
  /* 内部匹配命中清单（空数组=无命中），列表态仅暴露计数 */
  match: MkMatch[];
  time: string;
  /** 竞品链接（外部商品详情页），空=不展示 */
  link?: string;
}
const jdGrowth = (r: JdGoodsRow) => r.salesToday - r.salesPrev;
const fmtSales = (n: number) => n.toLocaleString('en-US');
const jdGoodsRows: JdGoodsRow[] = [
  { id: 'jg01', name: '哈兰德擦手巾挂式世界足球赛周边擦手帕卫生间厨房吸水速干毛巾', img: ecMain(0), shop: '嘉晨日用百货', complete: false, price: 12.9, salesPrev: 1200, salesToday: 7200, match: [
    { img: ecMain(7), plat: '抖音', shop: '锦致生活旗舰店', title: '休闲宽松连帽卫衣女秋季新款外套上衣 百搭通勤', goodsId: 'SP-10284752', series: 'ZH-LMWD-0921', fuse: 86.4, sku: 72.1 },
    { img: ecMain(8), plat: '抖音', shop: '轻享好物旗舰店', title: '便携式迷你榨汁杯家用小型果汁机', goodsId: 'SP-10763211', series: 'ZH-ZBJ-0331', fuse: 74.6, sku: 58.9 },
  ], time: '2026-10-28 21:09:10', link: 'https://detail.tmall.com/item.htm?id=809971029607&template=ML20260813-01' },
  { id: 'jg02', name: '煤气灶防滑支架厨房锅炉架通用防风罩炒锅加高灶台架托燃气灶支架', img: ecMain(1), shop: '嘉晨日用百货', complete: false, price: 14.3, salesPrev: 1800, salesToday: 7800, match: [], time: '2026-10-28 21:09:10', link: 'https://detail.tmall.com/item.htm?id=809971029608&template=ML20260813-01' },
  { id: 'jg03', name: '冰箱贴磁贴置物架侧面可爱磁吸收纳盒厨房壁挂免打孔多功能磁力贴', img: ecMain(2), shop: '嘉晨日用百货', complete: false, price: 12.9, salesPrev: 2000, salesToday: 8000, match: [
    { img: ecMain(6), plat: '拼多多', shop: '谷麦甄选旗舰店', title: '坚果燕麦片早餐代餐冲饮 500g×2袋 无蔗糖', goodsId: 'SP-10451263', series: 'ZH-JGYM-0512', fuse: 78.2, sku: 61.5 },
  ], time: '2026-10-28 21:09:10', link: 'https://detail.tmall.com/item.htm?id=809971029609&template=ML20260813-01' },
  { id: 'jg04', name: '葡萄香皂整串纯手工串香薰皂家用洗手持久留香肥皂伴手礼生日礼物', img: ecMain(3), shop: '嘉晨日用百货', complete: false, price: 18.8, salesPrev: 950, salesToday: 6950, match: [], time: '2026-10-28 21:09:10', link: 'https://detail.tmall.com/item.htm?id=809971029610&template=ML20260813-01' },
  { id: 'jg05', name: '新款升级版高颜值山型凸面宽头软毛牙刷护眼清洁情侣家用学生清洁', img: ecMain(4), shop: '嘉晨日用百货', complete: false, price: 11.9, salesPrev: 1400, salesToday: 7400, match: [
    { img: ecMain(9), plat: '淘宝', shop: '云朵优品旗舰店', title: '连帽卫衣女宽松bf风长袖上衣 慵懒风外套', goodsId: 'SP-10284509', series: 'ZH-LMWD-0921', fuse: 65.3, sku: 51.8 },
  ], time: '2026-10-28 21:09:10', link: 'https://detail.tmall.com/item.htm?id=809971029611&template=ML20260813-01' },
  { id: 'jg06', name: '果奇不锈钢厨房置物架台面调料收纳架多功能刀架砧板架一体收纳架', img: ecMain(5), shop: '果奇旗舰店', complete: true, price: 39.9, salesPrev: 2100, salesToday: 3300, match: [
    { img: ecMain(0), plat: '淘宝', shop: '白屿家居小铺', title: '【10A抗菌】桂枫3.0Pro玻尿酸凉感深睡重力被 夏凉被', goodsId: 'SP-10284001', series: 'ZH-ZLBT-0823', fuse: 88.5, sku: 76.3 },
    { img: ecMain(2), plat: '淘宝', shop: '臻品厨具专营店', title: '316不锈钢保温杯大容量车载水杯男女便携直饮', goodsId: 'SP-10284023', series: 'ZH-BWB-0618', fuse: 71.2, sku: 64.8 },
  ], time: '2026-10-29 09:12:44', link: 'https://detail.tmall.com/item.htm?id=809971029612&template=ML20260813-01' },
  { id: 'jg07', name: '果奇壁挂式厨房垃圾桶家用橱柜门挂式厨余垃圾筒折叠带盖收纳桶', img: ecMain(6), shop: '果奇旗舰店', complete: true, price: 25.8, salesPrev: 640, salesToday: 1500, match: [], time: '2026-10-29 09:12:44', link: 'https://detail.tmall.com/item.htm?id=809971029613&template=ML20260813-01' },
  { id: 'jg08', name: '果奇密封罐食品级塑料储物罐五谷杂粮收纳盒厨房干货咖啡豆保存罐', img: ecMain(7), shop: '果奇旗舰店', complete: false, price: 19.9, salesPrev: 410, salesToday: 840, match: [
    { img: ecMain(4), plat: '视频号', shop: '暖光照明工厂店', title: '智能感应夜灯人体感应小夜灯卧室床头起夜灯', goodsId: 'SP-10764004', series: 'ZH-YD-0315', fuse: 82.1, sku: 69.4 },
  ], time: '2026-10-29 09:12:44', link: 'https://detail.tmall.com/item.htm?id=809971029614&template=ML20260813-01' },
  { id: 'jg09', name: '爱摩尼轻奢浴室地垫吸水速干卫生间门口防滑脚垫家用厕所卫浴地毯', img: ecMain(8), shop: '爱摩尼旗舰店', complete: true, price: 29.9, salesPrev: 900, salesToday: 3000, match: [
    { img: ecMain(5), plat: '视频号', shop: '朵拉优选日用', title: '【秋冬养护】玻尿酸补水修护精华液 30ml 保湿面部 serum', goodsId: 'SP-10765005', series: 'ZH-JHS-0928', fuse: 79.8, sku: 66.7 },
  ], time: '2026-10-29 08:57:03', link: 'https://detail.tmall.com/item.htm?id=809971029615&template=ML20260813-01' },
  { id: 'jg10', name: '爱摩尼马桶刷无死角家用洗厕所神器壁挂式洁厕刷套装卫生间清洁刷', img: ecMain(9), shop: '爱摩尼旗舰店', complete: true, price: 15.8, salesPrev: 520, salesToday: 1500, match: [], time: '2026-10-29 08:57:03', link: 'https://detail.tmall.com/item.htm?id=809971029616&template=ML20260813-01' },
  { id: 'jg11', name: '爱摩尼淋浴花洒软管防爆加厚热水器出水管子卫生间洗澡莲蓬头配件', img: ecMain(10), shop: '爱摩尼旗舰店', complete: false, price: 12.5, salesPrev: 230, salesToday: 580, match: [
    { img: ecMain(3), plat: '视频号', shop: '朵拉优选日用', title: '叶黄素艾草蒸汽眼罩 20贴 缓解眼疲劳热敷', goodsId: 'SP-10763003', series: 'ZH-YZ-0420', fuse: 68.5, sku: 55.2 },
  ], time: '2026-10-29 08:57:03', link: 'https://detail.tmall.com/item.htm?id=809971029617&template=ML20260813-01' },
];
const jdGoodsEmpty = { name: '', shop: '', from: '', to: '', gmin: '', gmax: '', complete: '全部' };
const jdGoodsFilter = ref({ ...jdGoodsEmpty });
const jdGoodsApplied = ref({ ...jdGoodsEmpty });
/* 售价 / 销量涨幅 单列排序：三态循环（降 → 升 → 取消），单列激活 */
const jdGoodsSortKey = ref<'price' | 'growth' | ''>('');
const jdGoodsSortDir = ref<'none' | 'asc' | 'desc'>('none');
const onJdGoodsSort = (k: 'price' | 'growth') => {
  if (jdGoodsSortKey.value !== k) { jdGoodsSortKey.value = k; jdGoodsSortDir.value = 'desc'; }
  else if (jdGoodsSortDir.value === 'desc') jdGoodsSortDir.value = 'asc';
  else if (jdGoodsSortDir.value === 'asc') { jdGoodsSortKey.value = ''; jdGoodsSortDir.value = 'none'; }
  else jdGoodsSortDir.value = 'desc';
};
const jdGoodsSortState = (k: string) => (jdGoodsSortKey.value === k ? jdGoodsSortDir.value : 'none');
const jdGoodsList = computed(() => {
  const arr = jdGoodsRows.filter((r) => {
    if (jdGoodsApplied.value.name && !r.name.includes(jdGoodsApplied.value.name)) return false;
    if (jdGoodsApplied.value.shop && !r.shop.includes(jdGoodsApplied.value.shop)) return false;
    if (jdGoodsBlockedShops.value.includes(r.shop)) return false;
    if (jdGoodsApplied.value.from && r.time.slice(0, 10) < jdGoodsApplied.value.from) return false;
    if (jdGoodsApplied.value.to && r.time.slice(0, 10) > jdGoodsApplied.value.to) return false;
    if (jdGoodsApplied.value.gmin && jdGrowth(r) < Number(jdGoodsApplied.value.gmin)) return false;
    if (jdGoodsApplied.value.gmax && jdGrowth(r) > Number(jdGoodsApplied.value.gmax)) return false;
    if (jdGoodsApplied.value.complete === '已完善' && !r.complete) return false;
    if (jdGoodsApplied.value.complete === '未完善' && r.complete) return false;
    return true;
  });
  if (jdGoodsSortKey.value && jdGoodsSortDir.value !== 'none') {
    const dir = jdGoodsSortDir.value === 'asc' ? 1 : -1;
    arr.sort((a, b) => (jdGoodsSortKey.value === 'growth' ? jdGrowth(a) - jdGrowth(b) : a.price - b.price) * dir);
  }
  return arr;
});
/* 查询/重置：任务与商品两段各自独立生效 */
const jdTaskApply = () => { jdTaskApplied.value = { ...jdTaskFilter.value }; };
const jdTaskReset = () => {
  jdTaskFilter.value = { ...jdTaskEmpty };
  jdTaskApplied.value = { ...jdTaskEmpty };
};
const jdGoodsApply = () => { jdGoodsApplied.value = { ...jdGoodsFilter.value }; };
const jdGoodsReset = () => {
  jdGoodsFilter.value = { ...jdGoodsEmpty };
  jdGoodsApplied.value = { ...jdGoodsEmpty };
  jdGoodsBlockedShops.value = [];
};

/* 屏蔽店铺：在筛选区提供店铺多选入口，选中店铺从当前商品列表排除 */
const jdGoodsBlockedShops = ref<string[]>([]);
const jdGoodsShopOpts = computed(() => Array.from(new Set(jdGoodsRows.map((r) => r.shop))).sort());
const toggleBlockShop = (shop: string) => {
  jdGoodsBlockedShops.value = jdGoodsBlockedShops.value.includes(shop)
    ? jdGoodsBlockedShops.value.filter((s) => s !== shop)
    : [...jdGoodsBlockedShops.value, shop];
};
const jdShopBlockOpen = ref(false);
const shopBlockRef = ref<HTMLDivElement | null>(null);
const shopBlockMenuRef = ref<HTMLDivElement | null>(null);
const shopBlockPos = ref<{ top: number; left: number; width: number; up: boolean } | null>(null);
const updateShopBlockPos = () => {
  const el = shopBlockRef.value;
  if (!el) return;
  const r = el.getBoundingClientRect();
  const rows = jdGoodsShopOpts.value.length;
  const contentH = rows * 33 + 52 + 12;
  const spaceBelow = window.innerHeight - r.bottom - 6;
  const spaceAbove = r.top - 6;
  const up = contentH > spaceBelow && spaceAbove > spaceBelow;
  shopBlockPos.value = { top: up ? r.top - 6 : r.bottom + 6, left: r.left, width: Math.max(r.width, 160), up };
};
const onShopBlockDocDown = (e: MouseEvent) => {
  const t = e.target as Node;
  if (shopBlockRef.value?.contains(t) || shopBlockMenuRef.value?.contains(t)) return;
  jdShopBlockOpen.value = false;
};
const shopBlockMenuStyle = computed<CSSProperties>(() => (shopBlockPos.value
  ? {
      position: 'fixed',
      top: `${shopBlockPos.value.top}px`,
      left: `${shopBlockPos.value.left}px`,
      minWidth: `${shopBlockPos.value.width}px`,
      zIndex: 4100,
      transform: shopBlockPos.value.up ? 'translateY(-100%)' : undefined,
    }
  : { position: 'fixed', visibility: 'hidden' }));
watch(jdShopBlockOpen, (v) => {
  if (!v) { shopBlockPos.value = null; return; }
  requestAnimationFrame(updateShopBlockPos);
  window.addEventListener('resize', updateShopBlockPos);
  window.addEventListener('scroll', updateShopBlockPos, true);
  document.addEventListener('mousedown', onShopBlockDocDown);
}, { flush: 'post' });
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateShopBlockPos);
  window.removeEventListener('scroll', updateShopBlockPos, true);
  document.removeEventListener('mousedown', onShopBlockDocDown);
});

/* 任务行「店铺商品」：切到店铺商品子 tab 并按该店过滤 */
const jdViewGoods = (r: JdTaskRow) => {
  jdGoodsFilter.value = { ...jdGoodsEmpty, shop: r.name };
  jdGoodsApplied.value = { ...jdGoodsFilter.value };
  jdSub.value = 'goods';
  nextTick(jdScrollTop);
};

/* 全网搜索：跳转商机中心-全网搜索页 */
const opsGo = inject<(target: 'search') => void>('opsGo');
/* 前往顺买商机应用：跨应用切换顶层 tab（App 层 provide） */
const goApp = inject<(key: string) => void>('goApp');
</script>

<template>
  <div class="sg-page mk-page">
    <div class="mk2-top" :class="{ solo: tab === 'taobao' }">
      <div class="mk2-seg">
        <div v-for="t in TABS" :key="t.key" class="mk2-tab" :class="{ active: tab === t.key }" @click="switchTab(t.key)">{{ t.label }}</div>
      </div>
      <div class="mk2-top-acts">
        <button v-if="tab !== 'jd'" class="sg-btn" @click="goApp?.('shunmai')">前往顺买商机应用</button>
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

    <!-- 竞店商品子 tab：同款药丸 chip，切换竞店任务 / 店铺商品两模块（各自一套筛选＋列表） -->
    <div v-if="tab === 'jd'" class="mk2-subseg">
      <div v-for="s in JD_SUBS" :key="s.key" class="mk2-subtab" :class="{ active: jdSub === s.key }" @click="switchJdSub(s.key)">{{ s.label }}</div>
    </div>

    <template v-if="tab !== 'jd'">
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
          <div class="sg-field">
            <label>是否完善</label>
            <BubbleSelect class-name="sg-select" :value="filter.complete" :options="['全部', '已完善', '未完善']" @change="(v) => filter = { ...filter, complete: v }" />
          </div>
          <div class="sg-field">
            <label>匹配状态</label>
            <BubbleSelect class-name="sg-select" :value="filter.match" :options="['全部状态', '已匹配', '未匹配']" @change="(v) => filter = { ...filter, match: v }" />
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
          <!-- 列表字段管理 ▦：居按钮组最左（规范）；随视图切换对应表的列集 -->
          <ColFieldPop :st="isVh ? cfVh : cf" />
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
              <template v-for="c in midCols" :key="c.key">
                <SortTh v-if="c.key === 'sales'" label="销量" width="8%" :state="salesSort" @sort="toggleSalesSort" />
                <SortTh v-else-if="c.key === 'ct'" :label="(isXd ? '创建人/创建时间' : '抓取人/抓取时间')" width="12%" :state="timeSort" @sort="toggleTimeSort" />
                <th v-else :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
              </template>
              <th :style="{ width: '12%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td><input type="checkbox" /></td>
              <template v-for="c in midCols" :key="c.key">
                <td v-if="c.key === 'product'">
                  <div class="sg-goods">
                    <img class="sg-thumb" :src="r.img" alt="" />
                    <div class="sg-ginfo">
                      <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                      <!-- 店铺副行＝平台 LOGO＋店铺名（「店铺：」标签文字已按用户指令删除，勿恢复标签） -->
                      <div class="ib-meta">
                        <span class="store-logo"><img :src="PLATFORM_LOGO[r.plat]" alt="" /></span>
                        {{ r.shop }}
                      </div>
                    </div>
                  </div>
                </td>
                <td v-else-if="c.key === 'complete'">
                  <span class="mk-cmp-tag" :class="r.complete ? 'ok' : 'off'">{{ r.complete ? '已完善' : '未完善' }}</span>
                </td>
                <td v-else-if="c.key === 'price'"><span class="mk-price">{{ r.price.toFixed(2) }}</span></td>
                <td v-else-if="c.key === 'sales'">{{ salesTxt(r.sales) }}</td>
                <td v-else-if="c.key === 'ct'">
                  <div>{{ r.crawler }}</div>
                  <div class="mk-ct-t">{{ r.time }}</div>
                </td>
                <td v-else-if="c.key === 'match'">
                  <!-- 内部匹配列表态：仅暴露命中数量（命中：N / 无命中），命中清单通过操作列「查看内部商品」抽屉查看 -->
                  <span v-if="r.match.length" class="mk-hits">命中：{{ hitCount(r) }}</span>
                  <span v-else class="mk-nomatch">无命中</span>
                </td>
              </template>
              <td class="actions-col">
                <!-- 操作随完善/匹配态分发：已完善=详情+添加到，未完善=全网搜索；查看内部商品仅命中时展示，打开命中清单抽屉 -->
                <template v-if="r.complete">
                  <a href="#" @click.prevent="pushToast('商品详情：演示环境暂不可用')">详情</a>
                  <a href="#" @click.prevent="pushToast('已添加到商品创建')">添加到</a>
                </template>
                <a v-else href="#" @click.prevent="opsGo?.('search')">全网搜索</a>
                <a v-if="r.match.length" href="#" @click.prevent="matchDrawer = r">查看内部商品</a>
              </td>
            </tr>
          </tbody>
        </table>
        <!-- 视频号推荐商机：商品信息（图+名+店铺名副行）/商品类目/价格/同类目近期推荐top/双热度指数（ⓘ 悬浮说明）/操作（全网搜索），列序按业务序号 -->
        <table v-else class="sg-table mk-table">
          <thead>
            <tr>
              <template v-for="c in vhMid" :key="c.key">
                <SortTh v-if="c.key === 'price'" label="价格" width="12%" :state="vhSortState('price')" @sort="toggleVhSort('price')" />
                <SortTh v-else-if="c.key === 'top'" label="同类目近期推荐top" width="12%" :state="vhSortState('top')" @sort="toggleVhSort('top')" />
                <SortTh v-else-if="c.key === 'exposure'" label="曝光热度指数" width="12%" :state="vhSortState('exposure')" @sort="toggleVhSort('exposure')">
                  <i class="sg-sales-hd-i" title="商品近30日在视频号渠道的曝光热度，按区间展示；区间越高曝光越热" @click.stop>ⓘ</i>
                </SortTh>
                <SortTh v-else-if="c.key === 'deal'" label="成交热度指数" width="12%" :state="vhSortState('deal')" @sort="toggleVhSort('deal')">
                  <i class="sg-sales-hd-i" title="商品近30日在视频号渠道的成交热度，按区间展示；区间越高成交越热" @click.stop>ⓘ</i>
                </SortTh>
                <th v-else :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
              </template>
              <th :style="{ width: '10%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in vhList" :key="r.id">
              <template v-for="c in vhMid" :key="c.key">
                <td v-if="c.key === 'product'">
                  <div class="sg-goods">
                    <img class="sg-thumb" :src="r.img" alt="" />
                    <div class="sg-ginfo">
                      <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                      <div class="ib-meta">{{ r.shop }}</div>
                    </div>
                  </div>
                </td>
                <td v-else-if="c.key === 'category'">{{ r.category }}</td>
                <td v-else-if="c.key === 'price'">{{ r.price }}</td>
                <td v-else-if="c.key === 'top'">
                  <span v-if="r.top" class="mk-vh-top" :class="{ hot: r.top <= 3 }">TOP {{ r.top }}</span>
                  <span v-else class="sg-dash">-</span>
                </td>
                <td v-else-if="c.key === 'exposure'">{{ r.exposure }}</td>
                <td v-else-if="c.key === 'deal'">{{ r.deal }}</td>
              </template>
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
    </template>

    <!-- 竞店商品：竞店任务 / 店铺商品 双 tab 切换（两模块各自一套筛选＋列表＋分页，保留全部原有功能） -->
    <template v-else>
      <div ref="jdPaneRef" class="mk-jd-pane">
        <!-- 竞店任务 -->
        <template v-if="jdSub === 'task'">
          <div class="sg-filter">
            <div class="sg-grid">
              <template v-if="!jdTaskFold">
                <div class="sg-field">
                  <label>竞店名称</label>
                  <input class="sg-input" placeholder="请输入竞店名称" :value="jdTaskFilter.name" @input="jdTaskFilter = { ...jdTaskFilter, name: ($event.target as HTMLInputElement).value }" />
                </div>
                <div class="sg-field">
                  <label>创建人</label>
                  <input class="sg-input" placeholder="请输入创建人" :value="jdTaskFilter.creator" @input="jdTaskFilter = { ...jdTaskFilter, creator: ($event.target as HTMLInputElement).value }" />
                </div>
                <div class="sg-field">
                  <label>创建时间</label>
                  <DateRangePicker v-model:from="jdTaskFilter.from" v-model:to="jdTaskFilter.to" placeholder="请选择日期范围" />
                </div>
              </template>
              <div class="sg-actions">
                <button type="button" class="mk-jd-fold" @click="jdTaskFold = !jdTaskFold">{{ jdTaskFold ? '展开' : '收起' }}<svg :class="{ up: !jdTaskFold }" width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg></button>
                <button class="sg-btn primary" @click="openJdCreate">创建任务</button>
                <button class="sg-btn" @click="jdTaskReset">重置</button>
                <button class="sg-btn primary" @click="jdTaskApply">查询</button>
              </div>
            </div>
          </div>

          <div class="sg-card">
            <div :style="{ overflow: 'auto' }">
              <!-- 竞店任务表：监控商品数蓝数；操作＝店铺商品（切到商品 tab 并按该店过滤）·编辑·删除任务（红） -->
              <table class="sg-table mk-table mk-jd-table">
                <thead>
                  <tr>
                    <th :style="{ width: '4%' }"><input type="checkbox" /></th>
                    <th :style="{ width: '28%' }">竞店名称</th>
                    <th :style="{ width: '18%' }">监控商品数</th>
                    <th :style="{ width: '15%' }">创建人</th>
                    <th :style="{ width: '23%' }">创建时间</th>
                    <th :style="{ width: '12%' }">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in jdTaskList" :key="r.id">
                    <td><input type="checkbox" /></td>
                    <td :title="r.name">{{ r.name }}</td>
                    <td><span class="mk-jd-count">{{ r.count }}</span></td>
                    <td>{{ r.creator }}</td>
                    <td>{{ r.time }}</td>
                    <td class="actions-col">
                      <a href="#" @click.prevent="jdViewGoods(r)">店铺商品</a>
                      <a href="#" @click.prevent="pushToast('编辑：演示环境暂不可用')">编辑</a>
                      <a href="#" class="danger" @click.prevent="jdDeleteTask(r)">删除任务</a>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="jdTaskList.length === 0" class="sg-empty">
                <div class="sg-empty-wrap">
                  <div class="sg-empty-icon">◌</div>
                  <div>暂无数据，请调整筛选条件</div>
                </div>
              </div>
            </div>
            <!-- 分页按截图口径静态呈现（外部数据池） -->
            <div class="ib-pagination">
              <div class="ib-pageinfo">共 22 条</div>
              <BubbleSelect class-name="ib-page-size" default-value="20" :options="['10', '20', '50']" />
              <div class="ib-pages">
                <button class="ib-pagebtn nav">‹</button>
                <button class="ib-pagebtn active">1</button>
                <button class="ib-pagebtn">2</button>
                <button class="ib-pagebtn nav">›</button>
              </div>
              <div class="ib-jump">
                <span>前往</span>
                <input class="ib-jump-input" value="1" />
                <span>页</span>
              </div>
            </div>
          </div>
        </template>

        <!-- 店铺商品 -->
        <template v-else>
          <div class="sg-filter">
            <div class="sg-grid">
              <div class="sg-field">
                <label>商品名称</label>
                <input class="sg-input" placeholder="请输入商品名称" :value="jdGoodsFilter.name" @input="jdGoodsFilter = { ...jdGoodsFilter, name: ($event.target as HTMLInputElement).value }" />
              </div>
              <div class="sg-field">
                <label>店铺名称</label>
                <input class="sg-input" placeholder="请输入店铺名称" :value="jdGoodsFilter.shop" @input="jdGoodsFilter = { ...jdGoodsFilter, shop: ($event.target as HTMLInputElement).value }" />
              </div>
              <div class="sg-field">
                <label>更新时间</label>
                <DateRangePicker v-model:from="jdGoodsFilter.from" v-model:to="jdGoodsFilter.to" placeholder="请选择日期范围" />
              </div>
              <div class="sg-field">
                <label>销量涨幅</label>
                <div class="sg-range">
                  <input class="sg-input" placeholder="最小值" :value="jdGoodsFilter.gmin" @input="jdGoodsFilter = { ...jdGoodsFilter, gmin: ($event.target as HTMLInputElement).value }" />
                  <span>至</span>
                  <input class="sg-input" placeholder="最大值" :value="jdGoodsFilter.gmax" @input="jdGoodsFilter = { ...jdGoodsFilter, gmax: ($event.target as HTMLInputElement).value }" />
                </div>
              </div>
              <div class="sg-field">
                <label>是否完善</label>
                <BubbleSelect class-name="sg-select" :value="jdGoodsFilter.complete" :options="['全部', '已完善', '未完善']" @change="(v) => jdGoodsFilter = { ...jdGoodsFilter, complete: v }" />
              </div>
              <div class="sg-actions">
                <div ref="shopBlockRef" class="mk-shop-block">
                  <button type="button" class="mk-shop-block-btn" :class="{ active: jdGoodsBlockedShops.length > 0 }" title="屏蔽店铺" @click="jdShopBlockOpen = !jdShopBlockOpen">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M1 1l22 22" />
                    </svg>
                    <span v-if="jdGoodsBlockedShops.length" class="mk-shop-block-count">{{ jdGoodsBlockedShops.length }}</span>
                  </button>
                  <Teleport to="body">
                    <div v-if="jdShopBlockOpen" ref="shopBlockMenuRef" class="msel-menu mk-shop-block-menu" :style="shopBlockMenuStyle" @click.stop>
                      <div class="msel-head">
                        <span class="msel-head-btn" @click="jdGoodsBlockedShops = [...jdGoodsShopOpts]">全选</span>
                        <span class="msel-head-btn" @click="jdGoodsBlockedShops = []">清空</span>
                      </div>
                      <div v-for="shop in jdGoodsShopOpts" :key="shop" class="msel-opt" :class="{ on: jdGoodsBlockedShops.includes(shop) }" @click="toggleBlockShop(shop)">
                        <span class="msel-check">{{ jdGoodsBlockedShops.includes(shop) ? '✓' : '' }}</span>
                        <span class="msel-label">{{ shop }}</span>
                      </div>
                    </div>
                  </Teleport>
                </div>
                <button class="sg-btn" disabled>一键匹配</button>
                <button class="sg-btn" @click="jdGoodsReset">重置</button>
                <button class="sg-btn primary" @click="jdGoodsApply">查询</button>
              </div>
            </div>
          </div>

          <div class="sg-card">
            <div :style="{ overflow: 'auto' }">
              <!-- 店铺商品表：售价/销量涨幅可排序；内部匹配仅暴露命中计数；操作随完善态分发（已完善=详情+添加到，未完善=全网搜索），竖排展示 -->
              <table class="sg-table mk-table mk-jd-table mk-jd-goods-table">
                <thead>
                  <tr>
                    <th :style="{ width: '4%' }"><input type="checkbox" /></th>
                    <th :style="{ width: '30%' }">商品信息</th>
                    <th :style="{ width: '8%' }">是否完善</th>
                    <SortTh label="售价" width="10%" :state="jdGoodsSortState('price')" @sort="onJdGoodsSort('price')" />
                    <SortTh label="销量涨幅" width="11%" tip="前一日 → 当日销量，下方为两日涨量" :state="jdGoodsSortState('growth')" @sort="onJdGoodsSort('growth')" />
                    <th :style="{ width: '10%' }">内部匹配</th>
                    <th :style="{ width: '17%' }">更新时间</th>
                    <th :style="{ width: '10%' }">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="r in jdGoodsList" :key="r.id">
                    <td><input type="checkbox" /></td>
                    <td>
                      <div class="sg-goods">
                        <img class="sg-thumb" :src="r.img" alt="" />
                        <div class="sg-ginfo">
                          <div class="sg-gtitle mk-gtitle"><Ellipsis :text="r.name" /></div>
                          <div class="ib-meta">{{ r.shop }}</div>
                          <div v-if="r.link" class="mk-link-row">
                            <span class="mk-link-label">竞品链接：</span>
                            <a class="mk-link" :href="r.link" target="_blank" rel="noopener noreferrer">{{ r.link }}</a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span class="mk-cmp-tag" :class="r.complete ? 'ok' : 'off'">{{ r.complete ? '已完善' : '未完善' }}</span></td>
                    <td><span class="mk-price">{{ r.price.toFixed(2) }}</span></td>
                    <td>
                      <div class="mk-sales">
                        <div class="mk-sales-row">
                          <span class="mk-sales-label">前日</span>
                          <span class="mk-sales-value">{{ fmtSales(r.salesPrev) }}</span>
                        </div>
                        <div class="mk-sales-row">
                          <span class="mk-sales-label">当日</span>
                          <span class="mk-sales-value mk-sales-now">{{ fmtSales(r.salesToday) }}</span>
                        </div>
                        <div class="mk-sales-row">
                          <span class="mk-sales-label">涨幅</span>
                          <span class="mk-sales-delta" :class="{ down: jdGrowth(r) < 0 }">
                            {{ jdGrowth(r) >= 0 ? '↑' : '↓' }} {{ fmtSales(Math.abs(jdGrowth(r))) }}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span v-if="r.match.length > 0" class="mk-hits">命中：{{ r.match.length }}</span>
                      <span v-else class="mk-nomatch">无命中</span>
                    </td>
                    <td>{{ r.time }}</td>
                    <td class="actions-col">
                      <template v-if="r.complete">
                        <a href="#" @click.prevent="pushToast('商品详情：演示环境暂不可用')">详情</a>
                        <a href="#" @click.prevent="pushToast('已添加到商品创建')">添加到</a>
                      </template>
                      <a v-else href="#" @click.prevent="opsGo?.('search')">全网搜索</a>
                      <a v-if="r.match.length > 0" href="#" @click.prevent="matchDrawer = { name: r.name, match: r.match }">查看内部商品</a>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div v-if="jdGoodsList.length === 0" class="sg-empty">
                <div class="sg-empty-wrap">
                  <div class="sg-empty-icon">◌</div>
                  <div>暂无数据，请调整筛选条件</div>
                </div>
              </div>
            </div>
            <div class="ib-pagination">
              <div class="ib-pageinfo">共 6872 条</div>
              <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['10条/页', '20条/页', '50条/页']" />
              <div class="ib-pages">
                <button class="ib-pagebtn nav">‹</button>
                <button class="ib-pagebtn active">1</button>
                <button class="ib-pagebtn">2</button>
                <button class="ib-pagebtn">3</button>
                <button class="ib-pagebtn">4</button>
                <button class="ib-pagebtn">5</button>
                <button class="ib-pagebtn">6</button>
                <button class="ib-pagebtn">…</button>
                <button class="ib-pagebtn">138</button>
                <button class="ib-pagebtn nav">›</button>
              </div>
              <div class="ib-jump">
                <span>前往</span>
                <input class="ib-jump-input" value="1" />
                <span>页</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </template>
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

    <!-- 创建竞店任务弹窗：店铺名称必填＋备注选填；确认后任务进列表并置为监控中 -->
    <Teleport to="body">
      <div v-if="jdCreateModal" class="mk-create-mask" @click.self="jdCreateModal = false">
        <div class="mk-create-modal">
          <div class="mk-create-head">创建竞店任务</div>
          <div class="mk-create-body">
            <div class="sg-field">
              <label>店铺名称</label>
              <input class="sg-input" placeholder="请输入要监控的竞店名称" :value="jdCreateForm.shop" @input="jdCreateForm = { ...jdCreateForm, shop: ($event.target as HTMLInputElement).value }" />
            </div>
            <div class="sg-field">
              <label>备注</label>
              <input class="sg-input" placeholder="选填，如监控目的/关注品类" :value="jdCreateForm.note" @input="jdCreateForm = { ...jdCreateForm, note: ($event.target as HTMLInputElement).value }" />
            </div>
          </div>
          <div class="mk-create-foot">
            <button class="sg-btn" @click="jdCreateModal = false">取消</button>
            <button class="sg-btn primary" @click="confirmJdCreate">创建</button>
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
                    <SortTh label="创建时间" width="13%" :state="taskSortState('created')" @sort="onTaskSort('created')" />
                    <SortTh label="执行时间" width="17%" :state="taskSortState('exec')" @sort="onTaskSort('exec')" />
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

    <!-- 内部商品命中抽屉：查看内部商品打开；行按图二复合格样式＝主图＋标题＋商品ID＋平台LOGO店铺名，其余列主卖系列编码/融合分/SKU匹配度/操作（详情+添加到，同列表口径）；点击空白遮罩关闭；表列均分 -->
    <div v-if="matchDrawer" class="mk-hit-mask" @click="matchDrawer = null"></div>
    <div v-if="matchDrawer" class="mk-hit-drawer">
      <div class="mk-hit-head">
        <div class="mk-hit-tt">
          <h3>内部商品命中</h3>
          <span>{{ matchDrawer.name }} · 命中 {{ matchDrawer.match.length }} 个内部商品</span>
        </div>
        <button class="mk-hit-close" title="关闭" @click="matchDrawer = null">×</button>
      </div>
      <div class="mk-hit-body">
        <table class="sg-table mk-hit-table">
          <thead>
            <tr>
              <th>商品信息</th>
              <th>主卖系列编码</th>
              <th>融合分</th>
              <th>SKU匹配度</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in matchDrawer.match" :key="i">
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="m.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle mk-gtitle"><Ellipsis :text="m.title" /></div>
                    <div class="ib-meta">商品ID：{{ m.goodsId }}</div>
                    <div class="ib-meta">
                      <span class="store-logo"><img :src="PLATFORM_LOGO[m.plat]" alt="" /></span>
                      {{ m.shop }}
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ m.series }}</td>
              <td><span class="mk-hit-score">{{ m.fuse.toFixed(1) }}%</span></td>
              <td><span class="mk-hit-score">{{ m.sku.toFixed(1) }}%</span></td>
              <td class="actions-col">
                <a href="#" @click.prevent="pushToast('商品详情：演示环境暂不可用')">详情</a>
                <a href="#" @click.prevent="pushToast('已添加到商品创建')">添加到</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
