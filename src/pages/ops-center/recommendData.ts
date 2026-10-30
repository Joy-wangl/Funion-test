import { ecMain } from './data';

/* =========================================================
   上品推荐看板 数据种子
   综合动销、趋势、季节表现筛选候选池；推荐分排序，供铺货选品参考
   ========================================================= */

/** 候选视图分段：全部 / 常规在售 / 当季季节 / 去年同期 / 去年季节 / 最新上架 */
export interface RecView {
  key: string;
  label: string;
  count: string;
}
export const REC_VIEWS: RecView[] = [
  { key: 'all', label: '全部', count: '12.1万' },
  { key: 'regular', label: '常规在售', count: '9.5万' },
  { key: 'season', label: '当季季节', count: '2051' },
  { key: 'lastYear', label: '去年同期', count: '10.3万' },
  { key: 'lastSeason', label: '去年季节', count: '7761' },
  { key: 'newest', label: '最新上架', count: '2.4万' },
];

/** 生命周期分段：全部 / 存量老品 / 成长期 / 新品 */
export interface RecLife {
  key: string;
  label: string;
  hint?: string;
}
export const REC_LIVES: RecLife[] = [
  { key: 'all', label: '全部' },
  { key: 'old', label: '存量老品', hint: '>1年' },
  { key: 'grow', label: '成长期', hint: '90–365天' },
  { key: 'new', label: '新品', hint: '≤90天' },
];

/** 快捷标签分组：铺货时机 / 流量结构 / 推荐理由 */
export interface RecTagGroup {
  name: string;
  tags: { label: string }[];
}
export const REC_TAG_GROUPS: RecTagGroup[] = [
  {
    name: '铺货时机',
    tags: [
      { label: '错货时机' },
      { label: '立即铺' },
      { label: '提前布局' },
      { label: '观望' },
      { label: '低客单' },
    ],
  },
  {
    name: '流量结构',
    tags: [{ label: '自然流' }, { label: '广告铺' }, { label: '广告流' }],
  },
  {
    name: '推荐理由',
    tags: [
      { label: '规模领先' },
      { label: '快速起量' },
      { label: '正趋势' },
      { label: '低退款' },
      { label: '动销稳定' },
      { label: '动销均匀' },
      { label: '经验证存量' },
      { label: '上新时机佳' },
      { label: '在季契合' },
    ],
  },
];

/** 顶部统计条 */
export interface RecStat {
  value: string;
  label: string;
}
export const REC_STATS: RecStat[] = [
  { value: '121,446', label: '符合筛选' },
  { value: '121,446', label: '候选池总量' },
  { value: '57.6', label: '平均推荐分' },
  { value: '12.7%', label: '存量老品占比' },
  { value: '6.0%', label: '在季契合率' },
];
/** 数据时效 */
export const REC_ASOF = { data: '2026-10-25', score: '2026-10-27 09:12' };
export const REC_DESC = '综合动销、趋势和季节表现筛选候选；铺货前请核对 SKU 库存及目标店铺适配。';

/** 流量结构：类型 + 占比（%） */
export interface RecTraffic {
  type: '自然流' | '广告铺' | '广告流';
  pct?: number;
}

/** 铺货时机档位 */
export type RecTiming = '立即铺' | '提前布局' | '观望' | '错货时机' | '低客单';

/** 七维推荐依据单维：权重合计 1，分值 0–1 */
export interface RecDim { name: string; w: number; v: number; }
/** SKU 明细行 */
export interface RecSku { img: string; name: string; id: string; }

export interface RecRow {
  id: string;
  name: string;
  img: string;
  goodsId: string;
  /** 上架平台（商品信息列店铺行 LOGO 真源） */
  plat: string;
  /** 店铺名称 */
  store: string;
  /** 推荐分（0–1，三位小数） */
  score: number;
  /** 上架天数 */
  days: number;
  /** 入池依据（候选视图归属） */
  basis: string;
  /** 窗口销量 */
  windowSales: number;
  /** 趋势强度（正负，三位小数） */
  trend: number;
  /** 去年同期销量 */
  lastYear: number;
  /** 今年近30天曲线 */
  curve30: number[];
  /** 去年前后30天曲线 */
  curveLy: number[];
  /** 近18月趋势曲线 */
  curve18m: number[];
  /** 铺货时机 */
  timing: RecTiming;
  /** 退款率（%） */
  refund: number;
  /** 动销天 */
  activeDays: number;
  /** 流量结构 */
  traffic: RecTraffic[];
  /** 季节标签 */
  season: string;
  /** 生命周期归属 */
  life: 'old' | 'grow' | 'new';
  /** 类目（抽屉头部 meta 行） */
  cat: string;
  /** 七维推荐依据 */
  dims: RecDim[];
  /** 去年同期趋势 */
  lyTrend: number;
  /** 去年向后趋势 */
  afterTrend: number;
  /** 广告成交占比（%） */
  adPct: number;
  /** SKU 明细 */
  skus: RecSku[];
}

/* 曲线生成：以末值为锚点的伪随机平滑序列，保证同 id 稳定 */
const wave = (seed: number, n: number, base: number, amp: number, up: number): number[] => {
  let s = seed;
  const rnd = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const arr: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    arr.push(Math.max(0, base + amp * Math.sin(t * Math.PI * 2 + seed) + up * t * base + (rnd() - 0.5) * amp * 0.6));
  }
  return arr;
};

/* 抽屉派生字段（cat/dims/锚点趋势/广告占比/SKU）由 REC_RAW 统一生成，保证同 id 稳定 */
type RecBase = Omit<RecRow, 'cat' | 'dims' | 'lyTrend' | 'afterTrend' | 'adPct' | 'skus'>;
const REC_RAW: RecBase[] = [
  {
    id: 'r1',
    name: '地暖地热分水器排水管暖气管地暖管清洗排水软管',
    img: ecMain(0),
    goodsId: '3703440870318669895',
    plat: '快手',
    store: '快乐小店-佰得小站',
    score: 0.895,
    days: 791,
    basis: '常规在售',
    windowSales: 7358,
    trend: 0.904,
    lastYear: 884,
    curve30: wave(11, 30, 60, 22, 0.5),
    curveLy: wave(23, 30, 40, 18, 0.2),
    curve18m: wave(31, 18, 55, 20, 0.6),
    timing: '立即铺',
    refund: 4.2,
    activeDays: 30,
    traffic: [{ type: '广告铺', pct: 11 }, { type: '自然流' }],
    season: '四季款（常年）',
    life: 'old',
  },
  {
    id: 'r2',
    name: '竹牙签家用一次性剔牙居餐厅饭店专用批发竹制牙签',
    img: ecMain(1),
    goodsId: '3751163499531862285',
    plat: '抖音',
    store: '抖音小店-丽丽居住/健身弹专卖店',
    score: 0.884,
    days: 421,
    basis: '常规在售',
    windowSales: 6210,
    trend: 0.612,
    lastYear: 1024,
    curve30: wave(13, 30, 55, 18, 0.3),
    curveLy: wave(27, 30, 44, 15, 0.1),
    curve18m: wave(37, 18, 50, 16, 0.4),
    timing: '立即铺',
    refund: 2.8,
    activeDays: 29,
    traffic: [{ type: '自然流' }],
    season: '四季款（常年）',
    life: 'grow',
  },
  {
    id: 'r3',
    name: '【加宽款】冬季窗户吸水条玻璃门窗缝隙挡风密封条',
    img: ecMain(2),
    goodsId: '3715311416702533813',
    plat: '淘宝',
    store: 'AAA小店',
    score: 0.877,
    days: 96,
    basis: '当季季节',
    windowSales: 5148,
    trend: 1.204,
    lastYear: 640,
    curve30: wave(17, 30, 48, 20, 0.9),
    curveLy: wave(29, 30, 30, 14, 0.3),
    curve18m: wave(41, 18, 42, 18, 0.7),
    timing: '提前布局',
    refund: 3.5,
    activeDays: 28,
    traffic: [{ type: '广告流', pct: 18 }, { type: '自然流' }],
    season: '冬季款（9月起）',
    life: 'new',
  },
  {
    id: 'r4',
    name: '毛绒绒耳罩冬季男女通用保暖防风骑行加绒加厚护耳',
    img: ecMain(3),
    goodsId: '3654845571061121810',
    plat: '天猫',
    store: '天猫Funion旗舰店',
    score: 0.875,
    days: 128,
    basis: '当季季节',
    windowSales: 4890,
    trend: 0.998,
    lastYear: 712,
    curve30: wave(19, 30, 45, 19, 0.8),
    curveLy: wave(33, 30, 32, 15, 0.25),
    curve18m: wave(43, 18, 40, 17, 0.65),
    timing: '立即铺',
    refund: 5.1,
    activeDays: 27,
    traffic: [{ type: '广告铺', pct: 9 }, { type: '自然流' }],
    season: '冬季款（9月起）',
    life: 'new',
  },
  {
    id: 'r5',
    name: '环保100个无纺布煲汤袋熬药炖肉过滤袋卤料包空袋',
    img: ecMain(4),
    goodsId: '3737068615162265881',
    plat: '拼多多',
    store: '拼多多优品店',
    score: 0.873,
    days: 356,
    basis: '常规在售',
    windowSales: 4302,
    trend: 0.418,
    lastYear: 905,
    curve30: wave(21, 30, 50, 14, 0.35),
    curveLy: wave(35, 30, 42, 13, 0.15),
    curve18m: wave(47, 18, 48, 14, 0.3),
    timing: '观望',
    refund: 1.9,
    activeDays: 30,
    traffic: [{ type: '自然流' }],
    season: '四季款（常年）',
    life: 'grow',
  },
  {
    id: 'r6',
    name: '【松紧带】高弹力裤子橡筋腰松紧绳服装辅料扁松紧',
    img: ecMain(5),
    goodsId: '3698204471185390244',
    plat: '京麦',
    store: '京东Funion旗舰店',
    score: 0.871,
    days: 812,
    basis: '常规在售',
    windowSales: 3980,
    trend: 0.302,
    lastYear: 1180,
    curve30: wave(23, 30, 46, 12, 0.2),
    curveLy: wave(37, 30, 44, 12, 0.1),
    curve18m: wave(51, 18, 47, 12, 0.15),
    timing: '低客单',
    refund: 2.2,
    activeDays: 26,
    traffic: [{ type: '广告铺', pct: 14 }, { type: '自然流' }],
    season: '四季款（常年）',
    life: 'old',
  },
  {
    id: 'r7',
    name: '厨房置物架免打孔壁挂调料架台面收纳架多层储物架',
    img: ecMain(6),
    goodsId: '3620184455120938811',
    plat: '淘宝',
    store: '淘宝心选店',
    score: 0.864,
    days: 534,
    basis: '去年同期',
    windowSales: 3720,
    trend: 0.521,
    lastYear: 2140,
    curve30: wave(25, 30, 44, 15, 0.4),
    curveLy: wave(39, 30, 40, 14, 0.2),
    curve18m: wave(53, 18, 45, 15, 0.35),
    timing: '立即铺',
    refund: 3.1,
    activeDays: 28,
    traffic: [{ type: '自然流' }],
    season: '四季款（常年）',
    life: 'grow',
  },
  {
    id: 'r8',
    name: '加厚垃圾袋家用手提式背心厨房塑料袋特厚耐用大号',
    img: ecMain(7),
    goodsId: '3588201144590382277',
    plat: '视频号',
    store: '快乐小店-佰得小站',
    score: 0.858,
    days: 1043,
    basis: '常规在售',
    windowSales: 9120,
    trend: 0.188,
    lastYear: 3260,
    curve30: wave(27, 30, 58, 16, 0.15),
    curveLy: wave(41, 30, 55, 15, 0.1),
    curve18m: wave(57, 18, 57, 14, 0.1),
    timing: '观望',
    refund: 1.4,
    activeDays: 30,
    traffic: [{ type: '广告流', pct: 22 }, { type: '自然流' }],
    season: '四季款（常年）',
    life: 'old',
  },
  {
    id: 'r9',
    name: '冬季法兰绒毛毯加厚珊瑚绒毯子办公室午休披肩盖毯',
    img: ecMain(8),
    goodsId: '3611904482257130099',
    plat: '抖音',
    store: '抖音小店-BB丽居佳/健身弹专区',
    score: 0.851,
    days: 74,
    basis: '当季季节',
    windowSales: 2860,
    trend: 1.432,
    lastYear: 480,
    curve30: wave(29, 30, 38, 18, 1.1),
    curveLy: wave(43, 30, 26, 13, 0.4),
    curve18m: wave(59, 18, 34, 16, 0.85),
    timing: '提前布局',
    refund: 4.8,
    activeDays: 25,
    traffic: [{ type: '广告铺', pct: 12 }, { type: '自然流' }],
    season: '冬季款（9月起）',
    life: 'new',
  },
  {
    id: 'r10',
    name: '不锈钢衣架家用晾衣撑防滑无痕撑子晒衣挂衣架子',
    img: ecMain(9),
    goodsId: '3544218809334127755',
    plat: '拼多多',
    store: '拼多多-潮眼优选的小百货',
    score: 0.843,
    days: 668,
    basis: '常规在售',
    windowSales: 3410,
    trend: -0.104,
    lastYear: 1520,
    curve30: wave(31, 30, 42, 13, -0.1),
    curveLy: wave(45, 30, 45, 13, 0.05),
    curve18m: wave(61, 18, 44, 13, -0.05),
    timing: '错货时机',
    refund: 2.6,
    activeDays: 24,
    traffic: [{ type: '自然流' }],
    season: '四季款（常年）',
    life: 'old',
  },
];

/* ---------- 抽屉派生字段：七维 / 锚点趋势 / 广告占比 / SKU 明细 ---------- */
const DIM_WEIGHTS: { name: string; w: number }[] = [
  { name: '规模', w: 0.18 },
  { name: '趋势', w: 0.23 },
  { name: '稳定', w: 0.10 },
  { name: '季节时机', w: 0.14 },
  { name: '生命周期', w: 0.13 },
  { name: '需求质量', w: 0.13 },
  { name: '去年同期', w: 0.09 },
];
const clamp3 = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;
const dimsOf = (r: RecBase): RecDim[] => DIM_WEIGHTS.map((d) => {
  let v = 1;
  if (d.name === '规模') v = r.windowSales / 6000;
  else if (d.name === '趋势') v = (r.trend + 1) / 2;
  else if (d.name === '稳定') v = r.refund <= 2 ? 1 : 0.6;
  else if (d.name === '季节时机') v = r.season.startsWith('冬季') ? 0.9 : 0.6;
  else if (d.name === '去年同期') v = r.lastYear > 500 ? 1 : 0.5;
  return { ...d, v: clamp3(v) };
});

const SKU_SPECS = ['15*20抽线', '20*30抽线', '16*21抽线', '8*10抽线', '10x15cm', '20*25抽线', '8*12抽线', '13*18抽线', '9*10抽线', '6*8抽线', '12*16抽线', '5.5x7cm'];
const skusOf = (r: RecBase): RecSku[] => {
  const seed = Number(r.id.slice(1)) || 1;
  return SKU_SPECS.slice(0, 8 + (seed % 5)).map((s, i) => ({
    img: r.img,
    name: `${s}【100个装】`,
    id: `QJYCXCB-${String(i + 1).padStart(2, '0')}`,
  }));
};

export const REC_ROWS: RecRow[] = REC_RAW.map((r) => ({
  ...r,
  cat: '未分类',
  dims: dimsOf(r),
  lyTrend: Math.round(r.trend * 62) / 1000,
  afterTrend: -Math.round(r.trend * 110) / 1000,
  adPct: Math.round(6 + (r.windowSales % 7)) / 10,
  skus: skusOf(r),
}));

/** 推荐依据抽屉：详情行命中的推荐理由与关键指标 */
export interface RecReason {
  tag: string;
  desc: string;
}
export const REC_REASON_BY_ID: Record<string, RecReason[]> = {
  r1: [
    { tag: '规模领先', desc: '近30天窗口销量 7,358，位于同类目 Top 5%' },
    { tag: '正趋势', desc: '趋势强度 +0.904，近18月稳步上行' },
    { tag: '经验证存量', desc: '上架 791 天，动销天 30/30，退款率 4.2% 低于均值' },
  ],
  r3: [
    { tag: '在季契合', desc: '冬季款当季契合，去年同期后进入放量窗口' },
    { tag: '快速起量', desc: '上架 96 天，趋势强度 +1.204' },
    { tag: '上新时机佳', desc: '建议提前布局，锁定 9 月起季节流量' },
  ],
  default: [
    { tag: '动销稳定', desc: '近30天动销天充足，销量波动小' },
    { tag: '低退款', desc: '退款率处于同类目低位，履约风险可控' },
  ],
};
export const recReasons = (id: string): RecReason[] => REC_REASON_BY_ID[id] ?? REC_REASON_BY_ID.default;
