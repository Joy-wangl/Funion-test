/* =========================================================
   Funion 品控管理中心 · Mock 数据（v2 独立模块）
   维度：系列编码 → 商品编码 → 平台（商品ID 关联）
   v2 新增：多轮聊天会话 / 售后单明细 / 预审核·审核人·审核状态
   ========================================================= */

export type Platform = '抖音' | '快手' | '拼多多' | '淘宝' | '天猫' | '京东';

export const PLATFORMS: Platform[] = ['抖音', '快手', '拼多多', '淘宝', '天猫', '京东'];

export const PLATFORM_COLOR: Record<Platform, string> = {
  抖音: '#1F2126',
  快手: '#FF4906',
  拼多多: '#E02E24',
  淘宝: '#FF5000',
  天猫: '#FF0036',
  京东: '#C91623',
};

/** 各平台店铺名称（会话 / 售后单展示） */
export const SHOP_NAME: Record<Platform, string> = {
  抖音: 'Funion 抖音旗舰店',
  快手: 'Funion 快手官方店',
  拼多多: 'Funion 拼多多旗舰店',
  淘宝: 'Funion 淘宝企业店',
  天猫: 'Funion 天猫旗舰店',
  京东: 'Funion 京东自营店',
};

export const AFTER_SALES_TYPES = ['质量问题', '描述不符', '物流破损', '少件漏发', '七天无理由'];

/** 退款率 ≥ 该阈值自动标记为疑似垃圾品（默认阈值，可在阈值配置调整） */
export const JUNK_RATE_THRESHOLD = 0.25;

/** 多维度疑似判定阈值（规则配置 · 阈值配置 可调） */
export interface QcThresholds {
  /** 综合退款率阈值（0.25 = 25%） */
  refundRate: number;
  /** 问题数量阈值：售后单总数 ≥ N 判疑似 */
  problemCount: number;
  /** 类型命中阈值：单一问题类型命中 ≥ N 次判疑似 */
  typeHitCount: number;
}

export const DEFAULT_THRESHOLDS: QcThresholds = {
  refundRate: JUNK_RATE_THRESHOLD,
  problemCount: 40,
  typeHitCount: 20,
};

export interface PlatformStat {
  platform: Platform;
  /** 使用该编码在对应平台发布后生成的商品ID */
  productIds: string[];
  /** 订单量（近30天） */
  orders: number;
  /** 退款率 */
  refundRate: number;
  /** 售后单数 */
  afterSales: number;
  /** 聊天记录风险条数 */
  chatRisks: number;
  /** 最近订单时间 */
  lastOrderAt: string;
}

export interface ProductCodeRow {
  code: string;
  seriesCode: string;
  name: string;
  platforms: PlatformStat[];
  /** 售后单类型分布 */
  afterSalesTypes: [string, number][];
}

export interface SeriesRow {
  seriesCode: string;
  name: string;
}

export const SERIES: SeriesRow[] = [
  { seriesCode: 'XL-2001', name: '保温杯系列' },
  { seriesCode: 'XL-2002', name: '毛绒玩具系列' },
  { seriesCode: 'XL-2003', name: '厨房收纳系列' },
  { seriesCode: 'XL-2004', name: '手机支架系列' },
];

export const PRODUCT_CODES: ProductCodeRow[] = [
  {
    code: 'SP-20101', seriesCode: 'XL-2001', name: '保温杯 500ml',
    platforms: [
      { platform: '抖音', productIds: ['DY880131'], orders: 1260, refundRate: 0.06, afterSales: 14, chatRisks: 3, lastOrderAt: '2026-08-13 18:42' },
      { platform: '淘宝', productIds: ['TB55021'], orders: 830, refundRate: 0.05, afterSales: 9, chatRisks: 2, lastOrderAt: '2026-08-13 16:05' },
      { platform: '天猫', productIds: ['TM33012'], orders: 450, refundRate: 0.04, afterSales: 5, chatRisks: 1, lastOrderAt: '2026-08-12 20:11' },
    ],
    afterSalesTypes: [['七天无理由', 12], ['物流破损', 8], ['质量问题', 5], ['少件漏发', 3]],
  },
  {
    code: 'SP-20102', seriesCode: 'XL-2001', name: '保温杯 750ml',
    platforms: [
      { platform: '抖音', productIds: ['DY880212'], orders: 640, refundRate: 0.09, afterSales: 10, chatRisks: 2, lastOrderAt: '2026-08-13 12:30' },
      { platform: '拼多多', productIds: ['PDD61021'], orders: 510, refundRate: 0.12, afterSales: 11, chatRisks: 4, lastOrderAt: '2026-08-13 15:47' },
      { platform: '京东', productIds: ['JD77021'], orders: 320, refundRate: 0.07, afterSales: 4, chatRisks: 1, lastOrderAt: '2026-08-12 09:18' },
    ],
    afterSalesTypes: [['七天无理由', 10], ['质量问题', 8], ['描述不符', 4], ['物流破损', 3]],
  },
  {
    code: 'SP-20103', seriesCode: 'XL-2001', name: '儿童水壶',
    platforms: [
      { platform: '快手', productIds: ['KS41013'], orders: 280, refundRate: 0.2, afterSales: 9, chatRisks: 5, lastOrderAt: '2026-08-11 19:26' },
      { platform: '拼多多', productIds: ['PDD61033'], orders: 460, refundRate: 0.29, afterSales: 21, chatRisks: 12, lastOrderAt: '2026-08-13 10:02' },
    ],
    afterSalesTypes: [['质量问题', 16], ['描述不符', 9], ['七天无理由', 6], ['少件漏发', 4]],
  },
  {
    code: 'SP-20201', seriesCode: 'XL-2002', name: '毛绒玩具熊 40cm',
    platforms: [
      { platform: '抖音', productIds: ['DY89001'], orders: 720, refundRate: 0.31, afterSales: 41, chatRisks: 19, lastOrderAt: '2026-08-13 14:12' },
      { platform: '快手', productIds: ['KS42001'], orders: 300, refundRate: 0.22, afterSales: 12, chatRisks: 7, lastOrderAt: '2026-08-10 21:40' },
      { platform: '拼多多', productIds: ['PDD62001', 'PDD62002'], orders: 980, refundRate: 0.34, afterSales: 58, chatRisks: 26, lastOrderAt: '2026-08-13 17:55' },
    ],
    afterSalesTypes: [['质量问题', 62], ['描述不符', 30], ['七天无理由', 18], ['少件漏发', 7]],
  },
  {
    code: 'SP-20202', seriesCode: 'XL-2002', name: '毛绒玩具兔 30cm',
    platforms: [
      { platform: '淘宝', productIds: ['TB56011'], orders: 260, refundRate: 0.11, afterSales: 6, chatRisks: 2, lastOrderAt: '2026-08-11 10:44' },
      { platform: '拼多多', productIds: ['PDD62011'], orders: 540, refundRate: 0.32, afterSales: 26, chatRisks: 14, lastOrderAt: '2026-08-12 22:08' },
    ],
    afterSalesTypes: [['质量问题', 18], ['描述不符', 8], ['七天无理由', 6]],
  },
  {
    code: 'SP-20301', seriesCode: 'XL-2003', name: '收纳架三层',
    platforms: [
      { platform: '淘宝', productIds: ['TB57001'], orders: 410, refundRate: 0.08, afterSales: 7, chatRisks: 2, lastOrderAt: '2026-08-13 11:20' },
      { platform: '天猫', productIds: ['TM34001'], orders: 280, refundRate: 0.06, afterSales: 4, chatRisks: 1, lastOrderAt: '2026-08-12 15:33' },
      { platform: '京东', productIds: ['JD78001'], orders: 190, refundRate: 0.05, afterSales: 2, chatRisks: 0, lastOrderAt: '2026-08-11 08:57' },
    ],
    afterSalesTypes: [['物流破损', 7], ['七天无理由', 4], ['少件漏发', 2]],
  },
  {
    code: 'SP-20302', seriesCode: 'XL-2003', name: '收纳盒套装',
    platforms: [
      { platform: '快手', productIds: ['KS43001'], orders: 210, refundRate: 0.13, afterSales: 5, chatRisks: 2, lastOrderAt: '2026-08-10 17:26' },
      { platform: '拼多多', productIds: ['PDD63001'], orders: 620, refundRate: 0.16, afterSales: 15, chatRisks: 6, lastOrderAt: '2026-08-13 13:08' },
    ],
    afterSalesTypes: [['质量问题', 10], ['物流破损', 6], ['七天无理由', 5]],
  },
  {
    code: 'SP-20303', seriesCode: 'XL-2003', name: '挂钩套装',
    platforms: [
      { platform: '抖音', productIds: ['DY90003'], orders: 400, refundRate: 0.21, afterSales: 12, chatRisks: 6, lastOrderAt: '2026-08-12 19:44' },
      { platform: '拼多多', productIds: ['PDD63003'], orders: 890, refundRate: 0.28, afterSales: 34, chatRisks: 15, lastOrderAt: '2026-08-13 16:29' },
    ],
    afterSalesTypes: [['质量问题', 26], ['描述不符', 11], ['七天无理由', 9]],
  },
  {
    code: 'SP-20401', seriesCode: 'XL-2004', name: '车载手机支架',
    platforms: [
      { platform: '抖音', productIds: ['DY91001'], orders: 1500, refundRate: 0.07, afterSales: 18, chatRisks: 4, lastOrderAt: '2026-08-13 19:02' },
      { platform: '淘宝', productIds: ['TB58001'], orders: 600, refundRate: 0.06, afterSales: 8, chatRisks: 2, lastOrderAt: '2026-08-13 10:41' },
      { platform: '天猫', productIds: ['TM35001'], orders: 310, refundRate: 0.05, afterSales: 3, chatRisks: 1, lastOrderAt: '2026-08-12 14:19' },
      { platform: '京东', productIds: ['JD79001'], orders: 240, refundRate: 0.08, afterSales: 3, chatRisks: 1, lastOrderAt: '2026-08-11 20:36' },
    ],
    afterSalesTypes: [['七天无理由', 16], ['物流破损', 8], ['质量问题', 6], ['少件漏发', 2]],
  },
  {
    code: 'SP-20402', seriesCode: 'XL-2004', name: '桌面手机支架',
    platforms: [
      { platform: '快手', productIds: ['KS44001'], orders: 180, refundRate: 0.1, afterSales: 4, chatRisks: 1, lastOrderAt: '2026-08-10 12:14' },
      { platform: '拼多多', productIds: ['PDD64001'], orders: 350, refundRate: 0.14, afterSales: 9, chatRisks: 3, lastOrderAt: '2026-08-12 17:58' },
    ],
    afterSalesTypes: [['七天无理由', 7], ['质量问题', 4], ['物流破损', 2]],
  },
];

export interface SeriesView {
  series: SeriesRow;
  codes: ProductCodeRow[];
  agg: AggStat;
  merged: PlatformStat[];
  status: JunkStatus;
}

/* ---------- 聚合与判定 ---------- */

export interface AggStat {
  orders: number;
  refundRate: number;
  afterSales: number;
  chatRisks: number;
  productIdCount: number;
  platforms: Platform[];
}

export function aggPlatformStats(list: PlatformStat[]): AggStat {
  const orders = list.reduce((s, p) => s + p.orders, 0);
  const refunds = list.reduce((s, p) => s + p.orders * p.refundRate, 0);
  return {
    orders,
    refundRate: orders ? refunds / orders : 0,
    afterSales: list.reduce((s, p) => s + p.afterSales, 0),
    chatRisks: list.reduce((s, p) => s + p.chatRisks, 0),
    productIdCount: list.reduce((s, p) => s + p.productIds.length, 0),
    platforms: list.map((p) => p.platform),
  };
}

/** 系列维度：将多个商品编码的平台数据按平台合并 */
export function mergeByPlatform(lists: PlatformStat[][]): PlatformStat[] {
  return PLATFORMS.map((plat) => {
    const items = lists.flat().filter((p) => p.platform === plat);
    if (!items.length) return null;
    const orders = items.reduce((s, p) => s + p.orders, 0);
    const refunds = items.reduce((s, p) => s + p.orders * p.refundRate, 0);
    return {
      platform: plat,
      productIds: items.flatMap((p) => p.productIds),
      orders,
      refundRate: orders ? refunds / orders : 0,
      afterSales: items.reduce((s, p) => s + p.afterSales, 0),
      chatRisks: items.reduce((s, p) => s + p.chatRisks, 0),
      lastOrderAt: items.map((p) => p.lastOrderAt).sort().reverse()[0],
    } as PlatformStat;
  }).filter((x): x is PlatformStat => x !== null);
}

/** 平台维度：按订单占比分摊聚合各问题类型命中次数（降序） */
export function platformProblemHits(codes: ProductCodeRow[]): Partial<Record<Platform, [string, number][]>> {
  const acc = new Map<Platform, Map<string, number>>();
  for (const c of codes) {
    const total = c.platforms.reduce((s, p) => s + p.orders, 0) || 1;
    for (const p of c.platforms) {
      let m = acc.get(p.platform);
      if (!m) { m = new Map(); acc.set(p.platform, m); }
      for (const [t, n] of c.afterSalesTypes) {
        const add = Math.round((n * p.orders) / total);
        if (add > 0) m.set(t, (m.get(t) ?? 0) + add);
      }
    }
  }
  const out: Partial<Record<Platform, [string, number][]>> = {};
  for (const [plat, m] of acc) out[plat] = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return out;
}

export type JunkStatus = 'junk' | 'suspect' | 'normal';

export interface TypeMetrics {
  /** 售后单总数（问题数量） */
  problemCount: number;
  /** 单一问题类型最大命中次数 */
  maxTypeHit: number;
}

/** 问题数量聚合：售后单总数 + 单类型最大命中（支持多编码合并） */
export function typeMetricsOfCodes(codes: ProductCodeRow[]): TypeMetrics {
  const per = new Map<string, number>();
  let problemCount = 0;
  codes.forEach((c) => c.afterSalesTypes.forEach(([t, n]) => {
    per.set(t, (per.get(t) ?? 0) + n);
    problemCount += n;
  }));
  let maxTypeHit = 0;
  per.forEach((n) => { if (n > maxTypeHit) maxTypeHit = n; });
  return { problemCount, maxTypeHit };
}

/** 疑似判定：任一维度（退款率 / 问题数量 / 单类型命中）超阈值即疑似 */
export function junkStatus(marked: boolean, agg: AggStat, tm: TypeMetrics, th: QcThresholds): JunkStatus {
  if (marked) return 'junk';
  if (agg.refundRate >= th.refundRate || tm.problemCount >= th.problemCount || tm.maxTypeHit >= th.typeHitCount) return 'suspect';
  return 'normal';
}

export const JUNK_TEXT: Record<JunkStatus, string> = {
  junk: '垃圾品',
  suspect: '疑似垃圾品',
  normal: '正常',
};

export function pct(r: number): string {
  return `${(r * 100).toFixed(1)}%`;
}

export function rateCls(r: number, threshold: number): string {
  if (r >= threshold) return 'bad';
  if (r >= 0.1) return 'warn';
  return 'ok';
}

/* ---------- 问题诊断 ---------- */

export type Severity = 'severe' | 'medium' | 'minor';

export const SEVERITY_TEXT: Record<Severity, string> = {
  severe: '严重',
  medium: '中等',
  minor: '轻微',
};

/** 问题类型严重度：质量问题绝对数优先，其余按售后单占比 */
export function severityOf(type: string, count: number, total: number): Severity {
  if (type === '质量问题') return count >= 15 ? 'severe' : 'medium';
  const share = total ? count / total : 0;
  if (share >= 0.4) return 'severe';
  if (share >= 0.2) return 'medium';
  return 'minor';
}

/** 问题类型 → 优化建议策略库 */
export const OPT_SUGGESTIONS: Record<string, string[]> = {
  质量问题: ['下架抽检库存品质', '联系供应商整改或更换', '增加出货前质检环节'],
  描述不符: ['修正详情页与主图描述', '直播/视频话术与实物拉齐', '详情页显著标注尺寸/材质参数'],
  物流破损: ['升级包装防护等级', '更换低破损率物流商'],
  少件漏发: ['优化仓库打包质检流程', '增加打包称重校验环节'],
  七天无理由: ['优化尺码指引与使用说明，降低预期差'],
};

/** 优化建议（自定义类型走通用兜底建议，保证闭环可用） */
export function suggestionsOf(type: string): string[] {
  return OPT_SUGGESTIONS[type] ?? ['梳理客诉证据，明确问题成因', '制定专项优化动作并跟踪落实', '优化后复评品控状态'];
}

/* ---------- 优化任务闭环 ---------- */

export const OWNERS = ['七妮妮', '张三', '李四', '王五'];

export type TaskStatus = 'todo' | 'doing' | 'verifying' | 'closed';

export const TASK_STATUS_TEXT: Record<TaskStatus, string> = {
  todo: '待处理',
  doing: '优化中',
  verifying: '效果验证中',
  closed: '已关闭',
};

export interface OptTask {
  id: string;
  code: string;
  seriesCode: string;
  problemType: string;
  action: string;
  owner: string;
  deadline: string;
  status: TaskStatus;
  createdAt: string;
  /** 优化前退款率（完成优化时记录） */
  beforeRate?: number;
  /** 优化后退款率（验证期观测值） */
  afterRate?: number;
}

export const INITIAL_TASKS: OptTask[] = [
  { id: 'T-0812-01', code: 'SP-20201', seriesCode: 'XL-2002', problemType: '质量问题', action: '下架抽检库存品质', owner: '张三', deadline: '2026-08-16', status: 'doing', createdAt: '2026-08-12 10:20' },
  { id: 'T-0810-02', code: 'SP-20303', seriesCode: 'XL-2003', problemType: '质量问题', action: '联系供应商整改或更换', owner: '李四', deadline: '2026-08-15', status: 'verifying', createdAt: '2026-08-10 15:44', beforeRate: 0.258, afterRate: 0.112 },
  { id: 'T-0808-03', code: 'SP-20103', seriesCode: 'XL-2001', problemType: '描述不符', action: '直播/视频话术与实物拉齐', owner: '王五', deadline: '2026-08-12', status: 'closed', createdAt: '2026-08-08 09:12', beforeRate: 0.256, afterRate: 0.141 },
];

/* =========================================================
   v2 · 聊天记录核查（多轮会话 + 问题命中高亮）
   ========================================================= */

export interface ChatMessage {
  /** 回复角色：买家 / 人工客服 / AI 回复 */
  role: 'buyer' | 'support' | 'ai';
  time: string;
  text: string;
}

export interface ChatHit {
  /** 命中的售后/问题类型 */
  type: string;
  /** 会话原文中需高亮的问题短语 */
  phrase: string;
}

export interface ChatSession {
  id: string;
  code: string;
  platform: Platform;
  startedAt: string;
  /** 关联订单号 */
  orderId: string;
  messages: ChatMessage[];
  hits: ChatHit[];
}

export const CHAT_SESSIONS: ChatSession[] = [
  {
    id: 'CS-0812-01', code: 'SP-20103', platform: '拼多多', startedAt: '2026-08-12 14:20', orderId: 'SO-0812-3385',
    messages: [
      { role: 'buyer', time: '2026-08-12 14:20', text: '在吗？儿童水壶的吸管咬几下就裂了，这是什么劣质品，要求退款！' },
      { role: 'ai', time: '2026-08-12 14:24', text: '抱歉给您带来困扰，请问方便拍一下吸管开裂的照片吗？' },
      { role: 'buyer', time: '2026-08-12 14:27', text: '照片发了，而且容量比页面标注少很多，最多 300ml，你们标 500ml。' },
      { role: 'support', time: '2026-08-12 14:33', text: '已登记质量问题与描述差异，为您办理仅退款，无需退货。' },
    ],
    hits: [
      { type: '质量问题', phrase: '吸管咬几下就裂了' },
      { type: '描述不符', phrase: '容量比页面标注少很多' },
    ],
  },
  {
    id: 'CS-0811-02', code: 'SP-20103', platform: '快手', startedAt: '2026-08-11 20:01', orderId: 'SO-0809-2210',
    messages: [
      { role: 'buyer', time: '2026-08-11 20:01', text: '实物和直播间介绍的完全不一样，容量差太多了' },
      { role: 'ai', time: '2026-08-11 20:06', text: '亲，直播间展示的是 500ml 款，您拍的是 350ml 款哦。' },
      { role: 'buyer', time: '2026-08-11 20:09', text: '链接标题写的就是 500ml，你们这是虚假宣传，我要投诉。' },
    ],
    hits: [{ type: '描述不符', phrase: '和直播间介绍的完全不一样' }],
  },
  {
    id: 'CS-0813-03', code: 'SP-20201', platform: '拼多多', startedAt: '2026-08-13 09:38', orderId: 'SO-0811-4502',
    messages: [
      { role: 'buyer', time: '2026-08-13 09:38', text: '掉毛严重，孩子摸一手毛，什么垃圾玩意，退钱！' },
      { role: 'ai', time: '2026-08-13 09:45', text: '非常抱歉，毛绒类商品轻微浮毛属正常现象，您先拍打通风试试？' },
      { role: 'buyer', time: '2026-08-13 09:49', text: '不是浮毛，是一揪掉一把，缝线也是开的，这品控太离谱了。' },
      { role: 'support', time: '2026-08-13 09:57', text: '已为您申请退货退款并承担运费，同时反馈品控部门抽检。' },
    ],
    hits: [
      { type: '质量问题', phrase: '掉毛严重' },
      { type: '质量问题', phrase: '缝线也是开的' },
    ],
  },
  {
    id: 'CS-0812-04', code: 'SP-20201', platform: '抖音', startedAt: '2026-08-12 22:12', orderId: 'SO-0810-1873',
    messages: [
      { role: 'buyer', time: '2026-08-12 22:12', text: '味道太大刺鼻，质检肯定不达标，不敢给小孩玩' },
      { role: 'ai', time: '2026-08-12 22:18', text: '新品出厂包装味通风 2-3 天会消散，介意的话支持七天无理由。' },
      { role: 'buyer', time: '2026-08-12 22:23', text: '通风三天还是刺鼻，这根本不是味道问题，是材质问题。' },
    ],
    hits: [{ type: '质量问题', phrase: '味道太大刺鼻' }],
  },
  {
    id: 'CS-0812-05', code: 'SP-20201', platform: '抖音', startedAt: '2026-08-12 18:35', orderId: 'SO-0809-3327',
    messages: [
      { role: 'buyer', time: '2026-08-12 18:35', text: '实物和视频里差太多了，小了一整圈，脸还是歪的' },
      { role: 'ai', time: '2026-08-12 18:41', text: '手工缝制存在 1-2cm 误差，脸型问题可为您换货一个。' },
      { role: 'buyer', time: '2026-08-12 18:46', text: '换货可以，但你们详情页尺寸写 40cm，实测 34cm，这算欺诈吧？' },
    ],
    hits: [
      { type: '描述不符', phrase: '小了一整圈，脸还是歪的' },
      { type: '描述不符', phrase: '写 40cm，实测 34cm' },
    ],
  },
  {
    id: 'CS-0810-06', code: 'SP-20201', platform: '拼多多', startedAt: '2026-08-10 15:12', orderId: 'SO-0808-2954',
    messages: [
      { role: 'buyer', time: '2026-08-10 15:12', text: '包裹里说好的收纳袋没有，玩具的吊牌合格证也缺失。' },
      { role: 'support', time: '2026-08-10 15:20', text: '收纳袋为赠品，漏放可补寄；吊牌问题已记录反馈仓库。' },
      { role: 'buyer', time: '2026-08-10 15:24', text: '没有合格证我怎么确认是正品？补寄可以，先给我个说法。' },
    ],
    hits: [{ type: '少件漏发', phrase: '收纳袋没有，玩具的吊牌合格证也缺失' }],
  },
  {
    id: 'CS-0812-07', code: 'SP-20202', platform: '拼多多', startedAt: '2026-08-12 16:47', orderId: 'SO-0811-1208',
    messages: [
      { role: 'buyer', time: '2026-08-12 16:47', text: '缝线是开的，棉花都露出来了，这品控也太差了' },
      { role: 'support', time: '2026-08-12 16:55', text: '抱歉，支持退货退款或补偿 5 元自行缝补，您看哪种合适？' },
      { role: 'buyer', time: '2026-08-12 16:58', text: '退货吧，这质量送人都拿不出手。' },
    ],
    hits: [{ type: '质量问题', phrase: '缝线是开的，棉花都露出来了' }],
  },
  {
    id: 'CS-0812-08', code: 'SP-20303', platform: '拼多多', startedAt: '2026-08-12 21:10', orderId: 'SO-0810-4419',
    messages: [
      { role: 'buyer', time: '2026-08-12 21:10', text: '挂钩一点都不粘，贴一晚上全掉了，墙上还留胶' },
      { role: 'ai', time: '2026-08-12 21:16', text: '建议粘贴后静置 12 小时再挂重物，墙面材质也会影响粘性。' },
      { role: 'buyer', time: '2026-08-12 21:21', text: '完全按说明操作的，瓷砖墙面，空钩子都挂不住，别找借口。' },
    ],
    hits: [{ type: '质量问题', phrase: '一点都不粘，贴一晚上全掉了' }],
  },
  {
    id: 'CS-0813-09', code: 'SP-20401', platform: '淘宝', startedAt: '2026-08-13 10:05', orderId: 'SO-0812-1050',
    messages: [
      { role: 'buyer', time: '2026-08-13 10:05', text: '请问这款支架支持折叠屏手机吗？' },
      { role: 'ai', time: '2026-08-13 10:09', text: '支持的，夹臂最大开合 9cm，折叠屏展开状态也可以使用。' },
      { role: 'buyer', time: '2026-08-13 10:12', text: '好的，谢谢。' },
    ],
    hits: [],
  },
  {
    id: 'CS-0811-10', code: 'SP-20301', platform: '天猫', startedAt: '2026-08-11 09:30', orderId: 'SO-0809-2761',
    messages: [
      { role: 'buyer', time: '2026-08-11 09:30', text: '收到的收纳架有一层板角是变形的，螺丝也少了一颗。' },
      { role: 'support', time: '2026-08-11 09:36', text: '抱歉，可补寄配件包（含备用板），或整单退货，您选一下。' },
      { role: 'buyer', time: '2026-08-11 09:40', text: '补寄配件吧，退货太麻烦。' },
    ],
    hits: [
      { type: '物流破损', phrase: '板角是变形的' },
      { type: '少件漏发', phrase: '螺丝也少了一颗' },
    ],
  },
];

export function sessionsOf(code: string): ChatSession[] {
  return CHAT_SESSIONS.filter((s) => s.code === code);
}

/** 会话命中类型去重列表 */
export function hitTypesOf(s: ChatSession): string[] {
  return [...new Set(s.hits.map((h) => h.type))];
}

/* =========================================================
   v2 · 售后单明细（与 afterSalesTypes 统计同源生成）
   ========================================================= */

export type AfterSalesStatus = '已退款' | '处理中' | '退货中' | '已驳回';

export const AFTER_SALES_STATUSES: AfterSalesStatus[] = ['已退款', '处理中', '退货中', '已驳回'];

export interface AfterSalesOrder {
  id: string;
  code: string;
  platform: Platform;
  type: string;
  amount: number;
  status: AfterSalesStatus;
  appliedAt: string;
  /** 原始订单号 */
  orderId: string;
  /** 关联聊天会话（存在时可在聊天核查中查看原文） */
  sessionId?: string;
}

export const AFTER_SALES_ORDERS: AfterSalesOrder[] = (() => {
  const orders = PRODUCT_CODES.flatMap((c, ci) => {
    let seq = 0;
    return c.afterSalesTypes.flatMap(([type, count]) =>
      Array.from({ length: count }, (_, i) => {
        seq += 1;
        const plat = c.platforms[(ci + seq) % c.platforms.length].platform;
        const day = 13 - ((seq + ci) % 10);
        const hh = String(8 + ((seq * 3) % 12)).padStart(2, '0');
        const mm = String((seq * 7) % 60).padStart(2, '0');
        return {
          id: `AS-${c.code.slice(3)}-${String(seq).padStart(3, '0')}`,
          code: c.code,
          platform: plat,
          type,
          amount: 19 + ((seq * 13 + ci * 7) % 180),
          status: AFTER_SALES_STATUSES[(seq + i) % 4],
          appliedAt: `2026-08-${String(day).padStart(2, '0')} ${hh}:${mm}`,
          orderId: `SO-08${String(day).padStart(2, '0')}-${String(1000 + ((seq * 37 + ci * 13) % 900))}`,
        } as AfterSalesOrder;
      }),
    );
  });
  /* 层级规范：售后单为父级，会话为子级证据——一个会话至多关联一张售后单 */
  CHAT_SESSIONS.forEach((s) => {
    const o = orders.find((x) => !x.sessionId && x.code === s.code && x.platform === s.platform);
    if (o) o.sessionId = s.id;
  });
  return orders;
})();

/** 售后类型命中排行：类型 / 命中次数 / 涉及商品数 */
export function typeHitRanking(types?: string[]): { type: string; count: number; codes: number }[] {
  const m = new Map<string, { count: number; codes: Set<string> }>();
  (types ?? []).forEach((t) => m.set(t, { count: 0, codes: new Set<string>() }));
  PRODUCT_CODES.forEach((c) =>
    c.afterSalesTypes.forEach(([t, n]) => {
      const e = m.get(t) ?? { count: 0, codes: new Set<string>() };
      e.count += n;
      e.codes.add(c.code);
      m.set(t, e);
    }),
  );
  return [...m.entries()]
    .map(([type, e]) => ({ type, count: e.count, codes: e.codes.size }))
    .sort((a, b) => b.count - a.count);
}

/* =========================================================
   v2 · 审核流：预审核（系统）→ 审核人复核 → 审核状态
   ========================================================= */

export type PreReview = '建议标记垃圾品' | '建议优化' | '建议通过';

export const PRE_REVIEWS: PreReview[] = ['建议标记垃圾品', '建议优化', '建议通过'];

export type ReviewStatus = '待审核' | '审核中' | '已通过' | '已驳回';

export const REVIEW_STATUSES: ReviewStatus[] = ['待审核', '审核中', '已通过', '已驳回'];

export type ReviewDecision = '标记垃圾品' | '维持观察';

export interface Review {
  code: string;
  /** 系统预审核建议 */
  preReview: PreReview;
  preReviewAt: string;
  /** 审核人（空串=未指派） */
  reviewer: string;
  status: ReviewStatus;
  submittedAt: string;
  opinion?: string;
  reviewedAt?: string;
  /** 审核通过时的最终决定 */
  decision?: ReviewDecision;
}

/** 预审核规则引擎：任一维度超阈值 → 建议标记垃圾品；有风险命中 → 建议优化；否则建议通过 */
export function preReviewOf(c: ProductCodeRow, th: QcThresholds): PreReview {
  const agg = aggPlatformStats(c.platforms);
  const tm = typeMetricsOfCodes([c]);
  if (agg.refundRate >= th.refundRate || tm.problemCount >= th.problemCount || tm.maxTypeHit >= th.typeHitCount) return '建议标记垃圾品';
  if (agg.chatRisks > 0 || tm.problemCount > 0) return '建议优化';
  return '建议通过';
}

const RV_INIT: { status: ReviewStatus; reviewer: string; decision?: ReviewDecision; opinion?: string }[] = [
  { status: '已通过', reviewer: '七妮妮', decision: '维持观察' },
  { status: '待审核', reviewer: '' },
  { status: '审核中', reviewer: '张三' },
  { status: '已通过', reviewer: '七妮妮', decision: '标记垃圾品' },
  { status: '已驳回', reviewer: '李四', opinion: '聊天与售后证据不足，请补充近 7 天会话原文后重新提交。' },
  { status: '待审核', reviewer: '' },
  { status: '审核中', reviewer: '王五' },
  { status: '已驳回', reviewer: '张三', opinion: '退款率偏高但供应商已出具整改承诺，建议先建优化任务观察一期。' },
  { status: '已通过', reviewer: '李四', decision: '维持观察' },
  { status: '待审核', reviewer: '' },
];

export const INITIAL_REVIEWS: Review[] = PRODUCT_CODES.map((c, i) => {
  const cfg = RV_INIT[i % RV_INIT.length];
  const done = cfg.status === '已通过' || cfg.status === '已驳回';
  return {
    code: c.code,
    preReview: preReviewOf(c, DEFAULT_THRESHOLDS),
    preReviewAt: '2026-08-13 09:00',
    reviewer: cfg.reviewer,
    status: cfg.status,
    submittedAt: `2026-08-13 09:${String(5 + i).padStart(2, '0')}`,
    opinion: cfg.opinion,
    reviewedAt: done ? '2026-08-13 15:30' : undefined,
    decision: cfg.decision,
  };
});

/** 审核通过且决定为标记垃圾品的编码集合（品控状态联动） */
export function markedByReviews(reviews: Review[]): Set<string> {
  return new Set(
    reviews.filter((r) => r.status === '已通过' && r.decision === '标记垃圾品').map((r) => r.code),
  );
}

/* =========================================================
   v2 · 近30天综合退款率趋势（确定性 mock，供概览趋势图）
   ========================================================= */

export interface TrendPoint {
  date: string;
  rate: number;
  orders: number;
}

export const REFUND_TREND: TrendPoint[] = (() => {
  const out: TrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(2026, 7, 13);
    d.setDate(d.getDate() - i);
    const t = 29 - i;
    const wave = Math.sin(t / 4.2) * 0.018 + Math.sin(t / 9 + 1.3) * 0.014;
    const rate = Math.round((0.148 + wave + ((t * 7) % 5) * 0.004) * 1000) / 1000;
    const orders = 400 + ((t * 37) % 130) + Math.round(Math.sin(t / 3) * 40 + 40);
    out.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, rate, orders });
  }
  return out;
})();

/* =========================================================
   v2 · 近30天各问题类型命中趋势（确定性 mock，供问题类型趋势图）
   ========================================================= */

export interface TypeTrendSeries {
  type: string;
  total: number;
  points: { date: string; count: number }[];
}

export function problemTypeTrend(types?: string[]): TypeTrendSeries[] {
  return typeHitRanking(types).map((r, idx) => {
    const points: { date: string; count: number }[] = [];
    const base = r.count / 30;
    for (let i = 29; i >= 0; i--) {
      const d = new Date(2026, 7, 13);
      d.setDate(d.getDate() - i);
      const t = 29 - i;
      const seed = Math.sin((idx + 1) * 12.9898 + t * 78.233) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const count = Math.max(0, Math.round(base * (0.3 + frac * 1.6)));
      points.push({ date: `${d.getMonth() + 1}/${d.getDate()}`, count });
    }
    return { type: r.type, total: r.count, points };
  });
}
