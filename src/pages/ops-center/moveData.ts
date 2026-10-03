/** 自动化中心-视频号自动化：店铺 / 任务 静态数据（自动搬家为任务类型之一，另有自动下架） */

/** 任务执行平台：任务归属的店铺平台，决定选店池；新建可选、编辑锁定 */
export type MvPlatform = '视频号' | '淘宝';
export const MV_PLATFORMS: MvPlatform[] = ['视频号', '淘宝'];

/** 任务类型：自动搬家=跨店搬运发布；自动下架=命中规则商品自动下架；自动发品=自动发布商品（无被搬店铺） */
export type MvKind = '自动搬家' | '自动下架' | '自动发品';
/** 商品来源（仅自动发品展示）：内部商机/店铺商品 */
export type MvSource = '内部商机' | '店铺商品';
export const MV_SOURCES: MvSource[] = ['内部商机', '店铺商品'];
/** 执行方式：循环=指定时间循环；条件触发=满足条件即时触发（长期）；一次性=配置条件只执行一次 */
export type MvMethod = '循环' | '条件触发' | '一次性';
/** 任务状态（启用维度）：循环=已启用/已禁用；条件=启用中/已禁用；一次性恒已启用 */
export type MvTaskStatus = '已启用' | '启用中' | '已禁用';
/** 执行状态（执行维度）：待执行 → 执行中 → 已完成 */
export type MvExecStatus = '待执行' | '执行中' | '已完成';
/** 条件配置：行式条件组（当/且或 + 条件指标 + 运算符 + 阈值）；日期型指标取 v1/v2 为区间起止 */
export type MvCondMetric = '销量' | '销量较昨日' | '销量排行' | '利润率' | '库存' | '上架天数' | '上架时间' | '近X日内';
/** 上架时间的时间预设：非自定义时不展示日期输入件（相对窗口即近期语义） */
export type MvDatePreset = '自定义时间' | '今天' | '本周' | '昨天' | '本月';
export const MV_DATE_PRESETS: MvDatePreset[] = ['自定义时间', '今天', '本周', '昨天', '本月'];
/** 销量排行的统计时间范围：昨天或指定起止（v1/v2） */
export type MvRankRange = '昨天' | '指定时间范围';
export const MV_RANK_RANGES: MvRankRange[] = ['昨天', '指定时间范围'];
/** 循环周期的周几/几号候选（每周=周几、每月=几号） */
export const MV_WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const MV_MONTH_DAYS = Array.from({ length: 31 }, (_, i) => `${i + 1}号`);
export interface MvCondRow {
  key: string;
  /** 行际连接词（首行展示为「当」，不取此值） */
  conj: '且' | '或';
  metric: MvCondMetric;
  op: string;
  v1: string;
  /** 区间第二端（上架时间自定义时间恒为起止范围） */
  v2: string;
  /** 上架时间的时间预设（默认自定义时间） */
  preset?: MvDatePreset;
  /** 销量较昨日的阈值单位（件/%，未设取指标默认单位） */
  unit?: '件' | '%';
  /** 销量排行的统计时间范围（默认昨天） */
  rankRange?: MvRankRange;
  /** 销量排行前 N 名 */
  topN?: string;
}
export type MvCondition = MvCondRow[];

/** 条件指标元数据：数值型配阈值+单位、日期型配日期（区间）、排行型配时间范围+前N——选定条件后带出对应约束控件 */
export const MV_COND_METRICS: { name: MvCondMetric; kind: 'num' | 'date' | 'rank'; unit: string; ops: string[]; units?: string[] }[] = [
  { name: '销量', kind: 'num', unit: '件', ops: ['>', '≥', '=', '≤', '<'] },
  { name: '销量较昨日', kind: 'num', unit: '件', units: ['件', '%'], ops: ['上升', '下降'] },
  { name: '销量排行', kind: 'rank', unit: '名', ops: ['前'] },
  { name: '利润率', kind: 'num', unit: '%', ops: ['≥', '>', '≤', '<'] },
  { name: '库存', kind: 'num', unit: '件', ops: ['≤', '<', '≥', '>'] },
  { name: '上架天数', kind: 'num', unit: '天', ops: ['>', '≥', '≤', '<'] },
  { name: '上架时间', kind: 'date', unit: '', ops: ['=', '介于'] },
  { name: '近X日内', kind: 'num', unit: '日', ops: ['近'] },
];
export const MV_COND_METRIC_NAMES = MV_COND_METRICS.map((x) => x.name);
export const mvMetricMeta = (m: MvCondMetric) => MV_COND_METRICS.find((x) => x.name === m) ?? MV_COND_METRICS[0];
export const mvCondRowText = (r: MvCondRow) => {
  const meta = mvMetricMeta(r.metric);
  if (r.metric === '近X日内') return `近${r.v1}日内`;
  if (meta.kind === 'rank') {
    const range = (r.rankRange ?? '昨天') === '昨天' ? '昨天' : `${r.v1}~${r.v2}`;
    return `${r.metric}${range}前${r.topN}名`;
  }
  if (meta.kind === 'date') {
    if ((r.preset ?? '自定义时间') !== '自定义时间') return `${r.metric}${r.op}${r.preset}`;
    return `${r.metric}${r.op}${r.v1}~${r.v2}`;
  }
  return `${r.metric}${r.op}${r.v1}${r.unit ?? meta.unit}`;
};
export const mvCondSummary = (rows: MvCondition) =>
  rows.map((r, i) => `${i === 0 ? '' : ` ${r.conj} `}${mvCondRowText(r)}`).join('') || '未配置条件';

export interface MvShop {
  id: string;
  platform: string;
  name: string;
  shopId: string;
  online: boolean;
}

export interface MvTask {
  id: string;
  name: string;
  /** 任务执行平台（视频号/淘宝）：决定选店池，编辑时不可更改 */
  platform: MvPlatform;
  kind: MvKind;
  method: MvMethod;
  /** 循环方式的循环周期、周几/几号（非每天必填）与执行时间 */
  cycle?: '每天' | '每周' | '每月';
  cycleDay?: string;
  cycleTime?: string;
  /** 一次性任务的执行方式：immediate=立即执行，scheduled=定时执行 */
  execMode?: 'immediate' | 'scheduled';
  /** 一次性任务定时执行的日期（YYYY-MM-DD） */
  execDate?: string;
  /** 一次性任务定时执行的时间（HH:MM） */
  execTime?: string;
  /** 条件配置行组（全任务必填：圈定命中商品；循环方式对命中品按周期执行） */
  cond: MvCondition;
  /** 自动搬家=被搬店铺（多选）；自动下架=任务关联店铺（多选） */
  shopIds: string[];
  /** 自动搬家=发布店铺（多选，步骤二先选发布策略再选发布店铺） */
  targetShopIds?: string[];
  /** 发布策略（自动搬家必填，复用商品策略枚举 PUB_STRATEGIES 名称） */
  strategy?: string;
  /** 商品来源（仅自动发品：内部商机/店铺商品） */
  source?: MvSource;
  /** 最大数量（仅自动发品：单次发品上限，0-999） */
  maxQty?: number;
  creator: string;
  /** 任务状态（启用维度）与执行状态（执行维度）分列展示；已禁用无执行状态（缺省，列表显 —）；
      一次性无启用维度（缺省），任务状态列改展执行方式（立即执行/定时执行） */
  taskStatus?: MvTaskStatus;
  execStatus?: MvExecStatus;
  createdAt: string;
}

export const MV_KINDS: MvKind[] = ['自动搬家', '自动下架', '自动发品'];
export const MV_METHODS: MvMethod[] = ['循环', '条件触发', '一次性'];

/** 各执行方式的任务状态枚举：循环=已启用/已禁用；条件=启用中/已禁用；一次性无启用维度（空枚举） */
export const MV_METHOD_TASK_STATUS: Record<MvMethod, MvTaskStatus[]> = {
  循环: ['已启用', '已禁用'],
  一次性: [],
  条件触发: ['启用中', '已禁用'],
};
export const MV_TASK_STATUSES: MvTaskStatus[] = ['已启用', '启用中', '已禁用'];
export const MV_EXEC_STATUSES: MvExecStatus[] = ['待执行', '执行中', '已完成'];
/** 双维耦合矩阵（任务状态影响执行状态，2026-10-02 用户定案，三轮修正）：已禁用＝无执行状态（列表显 —，禁用即在途收口、不再排队）；
 *  一次性＝无任务状态（启用/禁用不适用），任务状态列改展执行方式（立即执行/定时执行），执行维度 {待执行,执行中,已完成}；
 *  循环=已启用×{待执行,执行中}；条件触发=启用中×{待执行,执行中}。
 *  长期任务（循环/条件触发）启用态永不落终态已完成：条件满足即再触发，只有「一次性」执行完毕才收敛为已完成。
 *  种子列表须枚举全部有效组合供核对 */
/** 新建任务初始状态：循环创建即已启用、条件触发启用中、一次性无启用维度；执行维度一律待执行 */
export const mvInitTaskStatus = (m: MvMethod): MvTaskStatus | undefined => (m === '条件触发' ? '启用中' : m === '一次性' ? undefined : '已启用');
export const mvInitExecStatus = (): MvExecStatus => '待执行';
/** 状态圆点色档（圆点+文字形态）：任务状态 已禁用红/其余绿；执行状态 待执行黄/执行中蓝/已完成灰 */
export const mvTaskDot = (s: MvTaskStatus) => (s === '已禁用' ? 'mv-dot-red' : 'mv-dot-green');
export const mvExecDot = (s: MvExecStatus) => (s === '待执行' ? 'mv-dot-yellow' : s === '执行中' ? 'mv-dot-blue' : 'mv-dot-gray');
/** 一次性执行方式展示（与抽屉立即执行/定时执行单选同源）：蓝=立即执行、黄=定时执行 */
export const mvModeText = (t: MvTask) => (t.execMode === 'scheduled' ? '定时执行' : '立即执行');
export const mvModeDot = (t: MvTask) => (t.execMode === 'scheduled' ? 'mv-dot-yellow' : 'mv-dot-blue');
/** 任务状态列统一取值/圆点：一次性取执行方式，其余取 taskStatus */
export const mvTaskStatusText = (t: MvTask) => (t.method === '一次性' ? mvModeText(t) : t.taskStatus ?? '');
export const mvTaskStatusDot = (t: MvTask) => (t.method === '一次性' ? mvModeDot(t) : mvTaskDot(t.taskStatus ?? '已启用'));
/** 任务状态筛选选项：启用维度三态 + 一次性执行方式两态（与列展示值同源，所见即可筛） */
export const MV_TASK_STATUS_FILTERS: string[] = [...MV_TASK_STATUSES, '立即执行', '定时执行'];

/** 执行配置摘要（列表列直展，与抽屉配置同源） */
export const mvRunSummary = (t: MvTask) => {
  if (t.method === '循环') {
    const cy = t.cycle ?? '每天';
    const day = cy === '每周' ? (t.cycleDay ?? '周一') : cy === '每月' ? `每月${t.cycleDay ?? '1号'}` : '每天';
    return `${mvCondSummary(t.cond)} → ${day} ${t.cycleTime ?? '02:00'} 循环执行`;
  }
  const tail = t.method === '一次性' ? '执行一次' : '即时触发 · 长期';
  return `${mvCondSummary(t.cond)} → ${tail}`;
};

/* 店铺池：各平台自有店 + 视频号店；店铺管理同源口径 */
export const mvShops: MvShop[] = [
  { id: 's1', platform: '淘宝', name: '淘宝心选店', shopId: '15074719', online: true },
  { id: 's2', platform: '淘宝', name: 'AAA小店', shopId: '668808746', online: true },
  { id: 's3', platform: '天猫', name: '天猫Funion旗舰店', shopId: '269190799', online: true },
  { id: 's4', platform: '拼多多', name: '拼多多优品店', shopId: '172420524', online: false },
  { id: 's5', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', shopId: '15074742', online: true },
  { id: 's6', platform: '淘宝', name: '淘系C店-雅集臻品 Greenery', shopId: '20886632', online: true },
  { id: 's7', platform: '淘宝', name: '淘系C店-泰有钱百货店', shopId: '319800402', online: true },
  { id: 's8', platform: '淘宝', name: '淘系C店-環球甄选好物店', shopId: '305428412', online: true },
  { id: 'v1', platform: '视频号', name: '快乐小店-佰得小站', shopId: 'wx88213301', online: true },
  { id: 'v2', platform: '视频号', name: '快乐小店-歪歪轩', shopId: 'wx88213302', online: true },
  { id: 'v3', platform: '视频号', name: '快乐小店-Funion官方旗舰店', shopId: 'wx88213303', online: true },
];
export const mvShopOf = (id: string) => mvShops.find((s) => s.id === id);
/** 任务中心溯源展示：按自动化任务ID取任务名称（无命中返回空串） */
export const mvTaskNameOf = (id?: string) => (id ? mvTasks.find((t) => t.id === id)?.name ?? '' : '');

export const mvTasks: MvTask[] = [
  {
    id: 'at-01', name: '自动搬家-淘宝心选店全店循环', platform: '视频号', kind: '自动搬家', method: '循环',
    cycle: '每天', cycleTime: '02:00', shopIds: ['s1'], targetShopIds: ['v1'], strategy: '13245',
    cond: [{ key: 'c1', conj: '且', metric: '上架天数', op: '≥', v1: '7', v2: '' }],
    creator: '七妮妮', taskStatus: '已启用', execStatus: '待执行', createdAt: '2026-08-02 10:24',
  },
  {
    id: 'at-02', name: '自动搬家-天猫旗舰店动销款至视频号', platform: '视频号', kind: '自动搬家', method: '一次性',
    cond: [{ key: 'c1', conj: '且', metric: '销量', op: '>', v1: '50', v2: '' }], shopIds: ['s3'], targetShopIds: ['v1', 'v3'], strategy: '8801',
    creator: '李珊珊', execMode: 'immediate', execStatus: '执行中', createdAt: '2026-09-01 15:40',
  },
  {
    id: 'at-03', name: '上新同步-拼多多优品店', platform: '视频号', kind: '自动搬家', method: '条件触发',
    cond: [
      { key: 'c1', conj: '且', metric: '销量', op: '>', v1: '20', v2: '' },
      { key: 'c2', conj: '且', metric: '上架时间', op: '=', v1: '', v2: '', preset: '本月' },
    ],
    shopIds: ['s4'], targetShopIds: ['s1', 's5'], strategy: '13245',
    creator: '七妮妮', taskStatus: '启用中', execStatus: '执行中', createdAt: '2026-08-11 09:12',
  },
  {
    id: 'at-04', name: '滞销下架-AAA小店与泰有钱', platform: '视频号', kind: '自动下架', method: '条件触发',
    cond: [
      { key: 'c1', conj: '且', metric: '销量', op: '<', v1: '5', v2: '' },
      { key: 'c2', conj: '且', metric: '上架天数', op: '>', v1: '90', v2: '' },
    ],
    shopIds: ['s2', 's7'],
    creator: '王越', taskStatus: '已禁用', createdAt: '2026-07-22 18:03',
  },
  {
    id: 'at-05', name: '视频号滞销款循环下架', platform: '视频号', kind: '自动下架', method: '循环',
    cycle: '每周', cycleDay: '周一', cycleTime: '03:00', shopIds: ['v2'],
    cond: [{ key: 'c1', conj: '且', metric: '销量', op: '<', v1: '5', v2: '' }],
    creator: '王越', taskStatus: '已禁用', createdAt: '2026-08-25 09:40',
  },
  {
    id: 'at-06', name: '自动搬家-雅集臻品爆款至视频号', platform: '视频号', kind: '自动搬家', method: '一次性',
    cond: [
      { key: 'c1', conj: '且', metric: '销量', op: '>', v1: '100', v2: '' },
      { key: 'c2', conj: '且', metric: '利润率', op: '≥', v1: '15', v2: '' },
    ],
    shopIds: ['s6'], targetShopIds: ['v2'], strategy: '8801',
    creator: '七妮妮', execMode: 'immediate', execStatus: '已完成', createdAt: '2026-08-18 11:26',
  },
  {
    id: 'at-07', name: '下架-义乌日用家居超期款', platform: '视频号', kind: '自动下架', method: '一次性',
    cond: [
      { key: 'c1', conj: '且', metric: '上架天数', op: '>', v1: '180', v2: '' },
      { key: 'c2', conj: '或', metric: '销量', op: '<', v1: '3', v2: '' },
    ],
    shopIds: ['s5'],
    creator: '李珊珊', execMode: 'scheduled', execDate: '2026-10-05', execTime: '10:00', execStatus: '待执行', createdAt: '2026-09-05 14:12',
  },
  {
    id: 'at-08', name: '动销裂变-淘系C店至视频号', platform: '视频号', kind: '自动搬家', method: '条件触发',
    cond: [
      { key: 'c1', conj: '且', metric: '销量', op: '>', v1: '30', v2: '' },
      { key: 'c2', conj: '且', metric: '利润率', op: '≥', v1: '20', v2: '' },
    ],
    shopIds: ['s7'], targetShopIds: ['v3'], strategy: '13245',
    creator: '李珊珊', taskStatus: '启用中', execStatus: '执行中', createdAt: '2026-07-30 14:55',
  },
  {
    id: 'at-09', name: '自动发品-视频号新品上架', platform: '视频号', kind: '自动发品', method: '循环',
    cycle: '每天', cycleTime: '08:00',
    cond: [
      { key: 'c1', conj: '且', metric: '近X日内', op: '近', v1: '7', v2: '' },
      { key: 'c2', conj: '且', metric: '销量', op: '>', v1: '10', v2: '' },
    ],
    shopIds: [],
    source: '内部商机',
    maxQty: 30,
    creator: '七妮妮', taskStatus: '已启用', execStatus: '执行中', createdAt: '2026-09-10 09:00',
  },
  {
    id: 'at-10', name: '自动搬家-淘宝心选店动销款至C店', platform: '淘宝', kind: '自动搬家', method: '循环',
    cycle: '每天', cycleTime: '02:30', shopIds: ['s1'], targetShopIds: ['s5', 's6'], strategy: '13245',
    cond: [{ key: 'c1', conj: '且', metric: '上架天数', op: '≥', v1: '7', v2: '' }],
    creator: '李珊珊', taskStatus: '已启用', execStatus: '待执行', createdAt: '2026-09-12 10:20',
  },
  {
    id: 'at-11', name: '滞销下架-泰有钱百货店', platform: '淘宝', kind: '自动下架', method: '条件触发',
    cond: [
      { key: 'c1', conj: '且', metric: '销量', op: '<', v1: '3', v2: '' },
      { key: 'c2', conj: '且', metric: '上架天数', op: '>', v1: '120', v2: '' },
    ],
    shopIds: ['s7'],
    creator: '王越', taskStatus: '启用中', execStatus: '待执行', createdAt: '2026-09-11 16:45',
  },
];
