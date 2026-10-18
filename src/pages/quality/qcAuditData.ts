/* =========================================================
   稽查模型配置（品控-线上）· 数据模型
   评分口径：总分 = 商品分/物流分/服务分 三维加权（对标平台体验分三小分）
   维度分 = 指标得分(0-100) × 指标权重；指标得分 = 实际值对满分线/零分线线性折算
   平台规则出处见 PLATFORM_RULES（数据依据）
   ========================================================= */

export type AuditDim = '商品' | '物流' | '服务';

export interface AuditIndicator {
  key: string;
  /** 指标名（业务口径） */
  name: string;
  dim: AuditDim;
  /** 内部数据来源：订单数据 / 会话数据 / 评价数据 */
  src: '订单数据' | '会话数据' | '评价数据';
  /** 维度内权重 %（同维度合计 100） */
  weight: number;
  /** 满分线：实际值 ≤ 该值 得 100 分 */
  fullLine: number;
  /** 零分线：实际值 ≥ 该值 得 0 分（区间内线性折算） */
  zeroLine: number;
  /** 对标平台指标名 */
  platform: string;
}

export interface AuditGate {
  /** 考核周期（天） */
  cycleDays: number;
  /** 出分门槛：周期最小订单数 */
  minOrders: number;
  /** 出分门槛：评价样本数（差评率参与计算的最低评价量） */
  minReviews: number;
  /** 出分门槛：会话样本数（会话占比参与计算的最低咨询量） */
  minChats: number;
}

export interface AuditWeights {
  /** 总分三维权重 %（合计 100） */
  dims: Record<AuditDim, number>;
  /** 出分门槛按维度配置：切到对应维度页签即配置该维度的门槛 */
  gates: Record<AuditDim, AuditGate>;
  indicators: AuditIndicator[];
}

export const DEFAULT_WEIGHTS: AuditWeights = {
  dims: { 商品: 50, 物流: 20, 服务: 30 },
  gates: {
    商品: { cycleDays: 30, minOrders: 30, minReviews: 30, minChats: 100 },
    物流: { cycleDays: 30, minOrders: 30, minReviews: 30, minChats: 100 },
    服务: { cycleDays: 30, minOrders: 30, minReviews: 30, minChats: 100 },
  },
  indicators: [
    { key: 'prod-badrate', name: '商品差评率', dim: '商品', src: '评价数据', weight: 40, fullLine: 1, zeroLine: 6, platform: '淘宝 宝贝质量·商品差评率 / 抖音 商品体验·综合负向反馈率' },
    { key: 'prod-prerefund', name: '发货后退款率', dim: '商品', src: '订单数据', weight: 25, fullLine: 0.5, zeroLine: 5, platform: '淘宝 宝贝质量·首次品退率 / 抖音 物流品退率' },
    { key: 'prod-chatq', name: '会话质量类问题占比', dim: '商品', src: '会话数据', weight: 20, fullLine: 2, zeroLine: 12, platform: '抖音 CCR 商品品质标签（负向反馈）' },
    { key: 'prod-chatafter', name: '咨询订单售后转化·质量', dim: '商品', src: '会话数据', weight: 15, fullLine: 1, zeroLine: 10, platform: '平台品退/负向反馈率的会话侧验证' },
    { key: 'logi-badrate', name: '物流类差评占比', dim: '物流', src: '评价数据', weight: 40, fullLine: 0.3, zeroLine: 3, platform: '淘宝 物流速度·物流差评率 / 抖音 物流体验' },
    { key: 'logi-chat', name: '会话物流类问题占比', dim: '物流', src: '会话数据', weight: 30, fullLine: 1, zeroLine: 10, platform: '淘宝 物流异常率 / 到货时长 的会话侧验证' },
    { key: 'logi-postrefund', name: '发货后退款率·物流', dim: '物流', src: '订单数据', weight: 30, fullLine: 1, zeroLine: 8, platform: '淘宝 物流速度·到货时长超期 / 抖音 订单配送时长' },
    { key: 'serv-badrate', name: '服务类差评占比', dim: '服务', src: '评价数据', weight: 30, fullLine: 0.3, zeroLine: 3, platform: '抖音 服务体验·IM不满意率' },
    { key: 'serv-chat', name: '会话服务类问题占比', dim: '服务', src: '会话数据', weight: 25, fullLine: 2, zeroLine: 12, platform: '淘宝 旺旺3分钟人工响应率 / 旺旺满意度' },
    { key: 'serv-after', name: '售后单率', dim: '服务', src: '订单数据', weight: 30, fullLine: 2, zeroLine: 10, platform: '抖音 仅退款/退货退款自主完结时长 / 纠纷商责率' },
    { key: 'serv-postrefund', name: '发货后退款率·服务', dim: '服务', src: '订单数据', weight: 15, fullLine: 1, zeroLine: 6, platform: '淘宝 服务保障·退款处理时长 / 平台求助率' },
  ],
};

/* ---------- 平台维度权重预设（权重配置页页首平台切换：各平台权重不一致） ----------
   淘宝＝默认口径（近30天）；抖音对标商家体验分（近90天滚动、CCR/IM 回复侧指标加权）；
   视频号会话样本门槛下调；快手物流维度加权。维度内指标权重合计恒 100。 */
export type AuditPlat = '淘宝' | '抖音' | '视频号' | '快手';
export const AUDIT_PLATS: AuditPlat[] = ['淘宝', '抖音', '视频号', '快手'];

const preset = (dims: Record<AuditDim, number>, weights: Record<string, number>, gates?: Partial<AuditGate>): AuditWeights => {
  const base = structuredClone(DEFAULT_WEIGHTS);
  base.dims = { ...dims };
  for (const ind of base.indicators) if (weights[ind.key] != null) ind.weight = weights[ind.key];
  if (gates) for (const d of ['商品', '物流', '服务'] as AuditDim[]) base.gates[d] = { ...base.gates[d], ...gates };
  return base;
};

export const PLATFORM_PRESETS: Record<AuditPlat, AuditWeights> = {
  淘宝: structuredClone(DEFAULT_WEIGHTS),
  抖音: preset(
    { 商品: 40, 物流: 25, 服务: 35 },
    {
      'prod-badrate': 30, 'prod-prerefund': 25, 'prod-chatq': 30, 'prod-chatafter': 15,
      'logi-badrate': 30, 'logi-chat': 30, 'logi-postrefund': 40,
      'serv-badrate': 25, 'serv-chat': 30, 'serv-after': 30, 'serv-postrefund': 15,
    },
    { cycleDays: 90 },
  ),
  视频号: preset(
    { 商品: 45, 物流: 25, 服务: 30 },
    {
      'prod-badrate': 45, 'prod-prerefund': 25, 'prod-chatq': 15, 'prod-chatafter': 15,
      'logi-badrate': 40, 'logi-chat': 30, 'logi-postrefund': 30,
      'serv-badrate': 30, 'serv-chat': 25, 'serv-after': 30, 'serv-postrefund': 15,
    },
    { minChats: 50 },
  ),
  快手: preset(
    { 商品: 40, 物流: 30, 服务: 30 },
    {
      'prod-badrate': 35, 'prod-prerefund': 30, 'prod-chatq': 20, 'prod-chatafter': 15,
      'logi-badrate': 30, 'logi-chat': 30, 'logi-postrefund': 40,
      'serv-badrate': 30, 'serv-chat': 20, 'serv-after': 35, 'serv-postrefund': 15,
    },
    { minOrders: 20 },
  ),
};

/** 实际值 → 0-100 得分：≤满分线=100，≥零分线=0，区间线性 */
export const scoreOf = (v: number, fullLine: number, zeroLine: number): number => {
  if (v <= fullLine) return 100;
  if (v >= zeroLine) return 0;
  return Math.round((1 - (v - fullLine) / (zeroLine - fullLine)) * 100);
};

/** 维度分：指标得分 × 指标权重（按维度内指标归一） */
export const dimScoreOf = (w: AuditWeights, dim: AuditDim, metrics: Record<string, number>): number | null => {
  let acc = 0;
  let total = 0;
  for (const ind of w.indicators) {
    if (ind.dim !== dim) continue;
    const v = metrics[ind.key];
    if (v == null) continue;
    acc += scoreOf(v, ind.fullLine, ind.zeroLine) * ind.weight;
    total += ind.weight;
  }
  return total ? Math.round((acc / total) * 10) / 10 : null;
};

/** 总分 = 各维度分 × 总分权重 / 100 */
export const totalScoreOf = (w: AuditWeights, metrics: Record<string, number>): number | null => {
  let acc = 0;
  let total = 0;
  (['商品', '物流', '服务'] as AuditDim[]).forEach((dim) => {
    const d = dimScoreOf(w, dim, metrics);
    if (d == null) return;
    acc += d * w.dims[dim];
    total += w.dims[dim];
  });
  return total ? Math.round((acc / total) * 10) / 10 : null;
};

/** 档位：优秀 ≥85 / 良好 70-85 / 预警 60-70 / 风险 <60 */
export const gradeOf = (s: number): { name: string; color: string } => {
  if (s >= 85) return { name: '优秀', color: '#1f9d55' };
  if (s >= 70) return { name: '良好', color: '#4f7cff' };
  if (s >= 60) return { name: '预警', color: '#d46b08' };
  return { name: '风险', color: '#e5484d' };
};

/* ---------- 豁免机制 ---------- */

export const EXEMPT_TYPES = ['新品豁免', '新店豁免', '新链接豁免', '低样本豁免'] as const;
export type ExemptType = (typeof EXEMPT_TYPES)[number];

export const EXEMPT_MODES = ['免考核', '减权系数', '延迟考核'] as const;
export type ExemptMode = (typeof EXEMPT_MODES)[number];

export interface ExemptMetricDef {
  key: string;
  /** 条件全称（豁免条件语句） */
  label: string;
  /** 简称（规则名称） */
  short: string;
  unit: string;
  def: number;
}
/* 条件指标按类型枚举：配置式条件 = 指标 + 比较符 + 阈值，不再手填文字 */
export const EXEMPT_METRICS: Record<ExemptType, ExemptMetricDef[]> = {
  新品豁免: [{ key: 'shelfDays', label: '商品首次上架', short: '首次上架', unit: '天', def: 15 }],
  新店豁免: [{ key: 'openDays', label: '店铺开店时间', short: '开店时间', unit: '天', def: 90 }],
  新链接豁免: [
    { key: 'linkDays', label: '链接创建', short: '链接创建', unit: '天', def: 7 },
    { key: 'linkOrders', label: '累计订单', short: '累计订单', unit: '笔', def: 10 },
  ],
  低样本豁免: [{ key: 'cycleOrders', label: '考核周期内有效支付订单', short: '周期订单', unit: '笔', def: 30 }],
};
export const METRIC_BY_KEY: Record<string, ExemptMetricDef> = Object.values(EXEMPT_METRICS)
  .flat()
  .reduce((acc, m) => ({ ...acc, [m.key]: m }), {} as Record<string, ExemptMetricDef>);

export const EXEMPT_OPS = ['≤', '<', '≥', '>'] as const;
export type ExemptOp = (typeof EXEMPT_OPS)[number];

export interface ExemptCond {
  metric: string;
  op: ExemptOp;
  value: number;
}
export const defaultCondOf = (m: ExemptMetricDef): ExemptCond => ({ metric: m.key, op: '≤', value: m.def });
export const defaultCondsOf = (t: ExemptType): ExemptCond[] => EXEMPT_METRICS[t].slice(0, 1).map(defaultCondOf);
/* 配置生成文案：规则名称取简称+阈值，豁免条件取指标全称+比较符+阈值，多条件以「或」连接 */
export const exemptCondText = (conds: ExemptCond[]): string =>
  conds
    .map((c) => {
      const d = METRIC_BY_KEY[c.metric];
      if (!d) return '';
      return `${d.label} ${c.op} ${c.value} ${d.unit}`;
    })
    .filter(Boolean)
    .join(' 或 ');
export const exemptNameText = (conds: ExemptCond[]): string =>
  conds
    .map((c) => {
      const d = METRIC_BY_KEY[c.metric];
      if (!d) return '';
      return `${d.short}${c.op === '≥' || c.op === '>' ? '超过' : '不足'}${c.value}${d.unit}`;
    })
    .filter(Boolean)
    .join('或');

export interface ExemptRule {
  id: string;
  type: ExemptType;
  /** 适用平台：商品/店铺维度规则按平台独立配置（各平台豁免标准不一致）；缺省＝全平台通用（系列编码/商品编码维度预留，不区分平台） */
  plat?: AuditPlat;
  name: string;
  /** 豁免条件描述（按 conds 配置生成） */
  cond: string;
  /** 配置式豁免条件：指标 + 比较符 + 阈值（多条件为「或」关系） */
  conds: ExemptCond[];
  mode: ExemptMode;
  /** 减权系数(0-1) 或 延迟天数；免考核不生效 */
  value: number;
  enabled: boolean;
  updatedAt: string;
}

/* 默认规则按平台挂接：同类型每平台各一条、阈值独立（各平台豁免标准不一致）；编码维度规则不区分平台，暂不预设 */
export const DEFAULT_EXEMPTS: ExemptRule[] = [
  { id: 'ex1', type: '新品豁免', plat: '淘宝', name: '首次上架不足15天', cond: '商品首次上架 ≤ 15 天', conds: [{ metric: 'shelfDays', op: '≤', value: 15 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
  { id: 'ex1b', type: '新品豁免', plat: '抖音', name: '首次上架不足14天', cond: '商品首次上架 ≤ 14 天', conds: [{ metric: 'shelfDays', op: '≤', value: 14 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
  { id: 'ex2', type: '新链接豁免', plat: '淘宝', name: '链接创建不足7天或累计订单不足10笔', cond: '链接创建 ≤ 7 天 或 累计订单 < 10 笔', conds: [{ metric: 'linkDays', op: '≤', value: 7 }, { metric: 'linkOrders', op: '<', value: 10 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
  { id: 'ex2b', type: '新链接豁免', plat: '抖音', name: '链接创建不足5天或累计订单不足15笔', cond: '链接创建 ≤ 5 天 或 累计订单 < 15 笔', conds: [{ metric: 'linkDays', op: '≤', value: 5 }, { metric: 'linkOrders', op: '<', value: 15 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
  { id: 'ex3', type: '低样本豁免', plat: '淘宝', name: '周期订单不足30笔', cond: '考核周期内有效支付订单 < 30 笔', conds: [{ metric: 'cycleOrders', op: '<', value: 30 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
  { id: 'ex3b', type: '低样本豁免', plat: '快手', name: '周期订单不足20笔', cond: '考核周期内有效支付订单 < 20 笔', conds: [{ metric: 'cycleOrders', op: '<', value: 20 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-12 09:00:00' },
  { id: 'ex5', type: '新店豁免', plat: '淘宝', name: '开店时间不足90天', cond: '店铺开店时间 ≤ 90 天', conds: [{ metric: 'openDays', op: '≤', value: 90 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-14 09:00:00' },
  { id: 'ex5b', type: '新店豁免', plat: '视频号', name: '开店时间不足60天', cond: '店铺开店时间 ≤ 60 天', conds: [{ metric: 'openDays', op: '≤', value: 60 }], mode: '免考核', value: 0, enabled: true, updatedAt: '2026-10-14 09:00:00' },
];

/* ---------- 示例商品（计算说明页） ---------- */

export interface AuditSample {
  name: string;
  meta: string;
  orders: number;
  /** 指标 key → 实际值（%） */
  metrics: Record<string, number>;
  /** 雷达图行业基准（对应 AXIS 顺序，0-100 得分） */
  baseline: number[];
}

export const AUDIT_SAMPLE: AuditSample = {
  name: 'Nike Sock durk 男子运动鞋',
  meta: '淘宝 · 近30天 · 订单 214 笔 · 评价 96 条 · 咨询会话 186 轮',
  orders: 214,
  metrics: {
    'prod-badrate': 3.6,
    'prod-prerefund': 1.2,
    'prod-chatq': 4.8,
    'prod-chatafter': 3.8,
    'logi-badrate': 1.0,
    'logi-chat': 2.7,
    'logi-postrefund': 1.4,
    'serv-badrate': 3.1,
    'serv-chat': 3.2,
    'serv-after': 5.6,
    'serv-postrefund': 1.2,
  },
  baseline: [60, 65, 62, 70, 68, 70],
};

/* ---------- 平台规则依据（调研结论，展示于计算说明页） ---------- */

export interface PlatformRule {
  platform: string;
  system: string;
  dims: string;
  cycle: string;
  audit: string;
  source: string;
}

export const PLATFORM_RULES: PlatformRule[] = [
  {
    platform: '淘宝',
    system: '店铺真实体验分（2025）',
    dims: '宝贝质量（首次品退率、商品差评率）＋ 物流速度（48h揽收及时率、到货时长、物流异常率、物流差评率）＋ 服务保障（旺旺3分钟人工响应率、旺旺满意度、退款处理时长、平台求助率），三维加权＋附加分',
    cycle: '近30天滚动（部分类目近90天）每日更新；近30天有效支付订单 ≥ 30 才出分；客服会话 ≥ 100 轮、评价 ≥ 30 笔纳入单项计算',
    audit: '刷单/虚构交易等 → 剔除异常数据、暂停评分展示、延长账期、提高保证金、追缴违约金或关店',
    source: '淘宝规则中心《店铺真实体验分规范》',
  },
  {
    platform: '抖音',
    system: '商家体验分',
    dims: '商品体验（商品基础分＋综合负向反馈率CCR品质标签）＋ 物流体验（揽收及时率、订单配送时长、物流品退率）＋ 服务体验（投诉率、纠纷商责率、IM三分钟回复率、仅退款/退货退款自主完结时长、IM不满意率）',
    cycle: '近90天滚动，按行业排名计算，近期数据加权更高；权重比例按行业动态调整、官方未公开固定值',
    audit: '负向反馈（CCR）按标签判责到商品品质/物流/服务；行业排名决定资源位与流量倾斜',
    source: '抖音电商学习中心《商家体验分规范》',
  },
  {
    platform: '拼多多',
    system: '消费者服务体验分',
    dims: '商品体验 ＋ 物流体验 ＋ 售后体验 ＋ 纠纷体验（多维构成，按行业排名出分）',
    cycle: '滚动周期按行业排名计算，官方未公开固定权重与统一文档',
    audit: '平台介入/纠纷按商责判定，纳入体验分并影响活动门槛与资源位',
    source: '拼多多商家后台 · 数据中心 · 消费者服务体验分',
  },
];
