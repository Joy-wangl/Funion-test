/* =========================================================
   品控中心 v3 · 独立数据层
   1. 问题类型看板：数据总览 · 问题类型占比 · 问题趋势（今日/近7天/自定义）
   2. 系列编码列表：商品编码级平台数据聚合 · 展开各平台矩阵
   ========================================================= */

export type Platform = '抖音' | '快手' | '拼多多' | '淘宝' | '天猫' | '京东';

export const QC_PLATFORMS: Platform[] = ['抖音', '快手', '拼多多', '淘宝', '天猫', '京东'];

export const PLATFORM_COLOR: Record<Platform, string> = {
  抖音: '#1F2126',
  快手: '#FF4906',
  拼多多: '#E02E24',
  淘宝: '#FF5000',
  天猫: '#FF0036',
  京东: '#C91623',
};

/** 品控中心问题类型（v3） */
export const QC_PROBLEM_TYPES = [
  '少发',
  '错发',
  '包装破损',
  '质量问题',
  '描述/宣传不符',
  '物流问题',
  '价格/活动类问题',
  '服务类问题',
];

/** 问题类型色板 */
export const PROBLEM_TYPE_COLOR: Record<string, string> = {
  少发: '#f53f3f',
  错发: '#ff7d00',
  包装破损: '#722ed1',
  质量问题: '#e6455c',
  '描述/宣传不符': '#ff9a2e',
  物流问题: '#4f7cff',
  '价格/活动类问题': '#0fc6c2',
  服务类问题: '#86909c',
  /* 优化任务·问题点枚举配色 */
  成本高: '#ff7d00',
  品质差: '#e6455c',
  仓库错发: '#722ed1',
  仓库漏发: '#f53f3f',
  快递费用异常: '#0fc6c2',
  包材成本偏高: '#ff9a2e',
  评分差: '#eb2f96',
  破损高: '#4f7cff',
};

export interface QcPlatformStat {
  platform: Platform;
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

export interface QcCenterCode {
  code: string;
  name: string;
  platforms: QcPlatformStat[];
  /** 各问题类型命中次数（编码级） */
  problemHits: { type: string; count: number }[];
}

export interface QcCenterSeries {
  seriesCode: string;
  name: string;
  codes: QcCenterCode[];
  /** 按平台合并后的平台数据 */
  merged: QcPlatformStat[];
  platforms: Platform[];
  orders: number;
  refundRate: number;
  afterSales: number;
  chatRiskHits: number;
  /** 系列下所有商品编码的问题汇总（降序） */
  problemHits: { type: string; count: number }[];
}

/* ---------- 商品编码级 mock（平台数据与品控管理同源口径） ---------- */

const RAW: { seriesCode: string; code: QcCenterCode }[] = [
  {
    seriesCode: 'XL-2001',
    code: {
      code: 'SP-20101', name: '保温杯 500ml',
      platforms: [
        { platform: '抖音', productIds: ['DY880131'], orders: 1260, refundRate: 0.06, afterSales: 14, chatRisks: 3, lastOrderAt: '2026-08-13 18:42' },
        { platform: '淘宝', productIds: ['TB55021'], orders: 830, refundRate: 0.05, afterSales: 9, chatRisks: 2, lastOrderAt: '2026-08-13 16:05' },
        { platform: '天猫', productIds: ['TM33012'], orders: 450, refundRate: 0.04, afterSales: 5, chatRisks: 1, lastOrderAt: '2026-08-12 20:11' },
      ],
      problemHits: [
        { type: '少发', count: 3 }, { type: '包装破损', count: 8 }, { type: '质量问题', count: 5 },
        { type: '描述/宣传不符', count: 4 }, { type: '物流问题', count: 8 }, { type: '服务类问题', count: 2 },
      ],
    },
  },
  {
    seriesCode: 'XL-2001',
    code: {
      code: 'SP-20102', name: '保温杯 750ml',
      platforms: [
        { platform: '抖音', productIds: ['DY880212'], orders: 640, refundRate: 0.09, afterSales: 10, chatRisks: 2, lastOrderAt: '2026-08-13 12:30' },
        { platform: '拼多多', productIds: ['PDD61021'], orders: 510, refundRate: 0.12, afterSales: 11, chatRisks: 4, lastOrderAt: '2026-08-13 15:47' },
        { platform: '京东', productIds: ['JD77021'], orders: 320, refundRate: 0.07, afterSales: 4, chatRisks: 1, lastOrderAt: '2026-08-12 09:18' },
      ],
      problemHits: [
        { type: '少发', count: 4 }, { type: '错发', count: 2 }, { type: '包装破损', count: 3 },
        { type: '质量问题', count: 8 }, { type: '描述/宣传不符', count: 4 }, { type: '物流问题', count: 3 },
      ],
    },
  },
  {
    seriesCode: 'XL-2001',
    code: {
      code: 'SP-20103', name: '儿童水壶',
      platforms: [
        { platform: '快手', productIds: ['KS41013'], orders: 280, refundRate: 0.2, afterSales: 9, chatRisks: 5, lastOrderAt: '2026-08-11 19:26' },
        { platform: '拼多多', productIds: ['PDD61033'], orders: 460, refundRate: 0.29, afterSales: 21, chatRisks: 12, lastOrderAt: '2026-08-13 10:02' },
      ],
      problemHits: [
        { type: '少发', count: 4 }, { type: '包装破损', count: 2 }, { type: '质量问题', count: 16 },
        { type: '描述/宣传不符', count: 9 }, { type: '服务类问题', count: 3 },
      ],
    },
  },
  {
    seriesCode: 'XL-2002',
    code: {
      code: 'SP-20201', name: '毛绒玩具熊 40cm',
      platforms: [
        { platform: '抖音', productIds: ['DY89001'], orders: 720, refundRate: 0.31, afterSales: 41, chatRisks: 19, lastOrderAt: '2026-08-13 14:12' },
        { platform: '快手', productIds: ['KS42001'], orders: 300, refundRate: 0.22, afterSales: 12, chatRisks: 7, lastOrderAt: '2026-08-10 21:40' },
        { platform: '拼多多', productIds: ['PDD62001', 'PDD62002'], orders: 980, refundRate: 0.34, afterSales: 58, chatRisks: 26, lastOrderAt: '2026-08-13 17:55' },
      ],
      problemHits: [
        { type: '少发', count: 7 }, { type: '包装破损', count: 12 }, { type: '质量问题', count: 62 },
        { type: '描述/宣传不符', count: 30 }, { type: '价格/活动类问题', count: 4 }, { type: '服务类问题', count: 5 },
      ],
    },
  },
  {
    seriesCode: 'XL-2002',
    code: {
      code: 'SP-20202', name: '毛绒玩具兔 30cm',
      platforms: [
        { platform: '淘宝', productIds: ['TB56011'], orders: 260, refundRate: 0.11, afterSales: 6, chatRisks: 2, lastOrderAt: '2026-08-11 10:44' },
        { platform: '拼多多', productIds: ['PDD62011'], orders: 540, refundRate: 0.32, afterSales: 26, chatRisks: 14, lastOrderAt: '2026-08-12 22:08' },
      ],
      problemHits: [
        { type: '少发', count: 2 }, { type: '错发', count: 3 }, { type: '包装破损', count: 4 },
        { type: '质量问题', count: 18 }, { type: '描述/宣传不符', count: 8 },
      ],
    },
  },
  {
    seriesCode: 'XL-2003',
    code: {
      code: 'SP-20301', name: '收纳架三层',
      platforms: [
        { platform: '淘宝', productIds: ['TB57001'], orders: 410, refundRate: 0.08, afterSales: 7, chatRisks: 2, lastOrderAt: '2026-08-13 11:20' },
        { platform: '天猫', productIds: ['TM34001'], orders: 280, refundRate: 0.06, afterSales: 4, chatRisks: 1, lastOrderAt: '2026-08-12 15:33' },
        { platform: '京东', productIds: ['JD78001'], orders: 190, refundRate: 0.05, afterSales: 2, chatRisks: 0, lastOrderAt: '2026-08-11 08:57' },
      ],
      problemHits: [
        { type: '少发', count: 2 }, { type: '包装破损', count: 4 }, { type: '质量问题', count: 1 }, { type: '物流问题', count: 7 },
      ],
    },
  },
  {
    seriesCode: 'XL-2003',
    code: {
      code: 'SP-20302', name: '收纳盒套装',
      platforms: [
        { platform: '快手', productIds: ['KS43001'], orders: 210, refundRate: 0.13, afterSales: 5, chatRisks: 2, lastOrderAt: '2026-08-10 17:26' },
        { platform: '拼多多', productIds: ['PDD63001'], orders: 620, refundRate: 0.16, afterSales: 15, chatRisks: 6, lastOrderAt: '2026-08-13 13:08' },
      ],
      problemHits: [
        { type: '少发', count: 2 }, { type: '包装破损', count: 3 }, { type: '质量问题', count: 10 }, { type: '物流问题', count: 6 },
      ],
    },
  },
  {
    seriesCode: 'XL-2003',
    code: {
      code: 'SP-20303', name: '挂钩套装',
      platforms: [
        { platform: '抖音', productIds: ['DY90003'], orders: 400, refundRate: 0.21, afterSales: 12, chatRisks: 6, lastOrderAt: '2026-08-12 19:44' },
        { platform: '拼多多', productIds: ['PDD63003'], orders: 890, refundRate: 0.28, afterSales: 34, chatRisks: 15, lastOrderAt: '2026-08-13 16:29' },
      ],
      problemHits: [
        { type: '少发', count: 5 }, { type: '包装破损', count: 6 }, { type: '质量问题', count: 26 },
        { type: '描述/宣传不符', count: 11 }, { type: '价格/活动类问题', count: 4 },
      ],
    },
  },
  {
    seriesCode: 'XL-2004',
    code: {
      code: 'SP-20401', name: '车载手机支架',
      platforms: [
        { platform: '抖音', productIds: ['DY91001'], orders: 1500, refundRate: 0.07, afterSales: 18, chatRisks: 4, lastOrderAt: '2026-08-13 19:02' },
        { platform: '淘宝', productIds: ['TB58001'], orders: 600, refundRate: 0.06, afterSales: 8, chatRisks: 2, lastOrderAt: '2026-08-13 10:41' },
        { platform: '天猫', productIds: ['TM35001'], orders: 310, refundRate: 0.05, afterSales: 3, chatRisks: 1, lastOrderAt: '2026-08-12 14:19' },
        { platform: '京东', productIds: ['JD79001'], orders: 240, refundRate: 0.08, afterSales: 3, chatRisks: 1, lastOrderAt: '2026-08-11 20:36' },
      ],
      problemHits: [
        { type: '少发', count: 3 }, { type: '包装破损', count: 2 }, { type: '质量问题', count: 6 },
        { type: '物流问题', count: 8 }, { type: '服务类问题', count: 2 },
      ],
    },
  },
  {
    seriesCode: 'XL-2004',
    code: {
      code: 'SP-20402', name: '桌面手机支架',
      platforms: [
        { platform: '快手', productIds: ['KS44001'], orders: 180, refundRate: 0.1, afterSales: 4, chatRisks: 1, lastOrderAt: '2026-08-10 12:14' },
        { platform: '拼多多', productIds: ['PDD64001'], orders: 350, refundRate: 0.14, afterSales: 9, chatRisks: 3, lastOrderAt: '2026-08-12 17:58' },
      ],
      problemHits: [
        { type: '少发', count: 2 }, { type: '错发', count: 1 }, { type: '包装破损', count: 1 },
        { type: '质量问题', count: 4 }, { type: '物流问题', count: 2 },
      ],
    },
  },
];

/* ---------- 聚合构建 ---------- */

function mergeByPlatform(lists: QcPlatformStat[][]): QcPlatformStat[] {
  return QC_PLATFORMS.map((plat) => {
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
    };
  }).filter((x): x is QcPlatformStat => x !== null);
}

function buildSeries(seriesCode: string, name: string, codes: QcCenterCode[]): QcCenterSeries {
  const merged = mergeByPlatform(codes.map((c) => c.platforms));
  const orders = merged.reduce((s, p) => s + p.orders, 0);
  const refunds = merged.reduce((s, p) => s + p.orders * p.refundRate, 0);
  const aggMap = new Map<string, number>();
  codes.forEach((c) => c.problemHits.forEach((h) => aggMap.set(h.type, (aggMap.get(h.type) ?? 0) + h.count)));
  return {
    seriesCode,
    name,
    codes,
    merged,
    platforms: merged.map((p) => p.platform),
    orders,
    refundRate: orders ? refunds / orders : 0,
    afterSales: merged.reduce((s, p) => s + p.afterSales, 0),
    chatRiskHits: merged.reduce((s, p) => s + p.chatRisks, 0),
    problemHits: [...aggMap.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export const QC_CENTER_SERIES: QcCenterSeries[] = [
  buildSeries('XL-2001', '保温杯系列', RAW.filter((r) => r.seriesCode === 'XL-2001').map((r) => r.code)),
  buildSeries('XL-2002', '毛绒玩具系列', RAW.filter((r) => r.seriesCode === 'XL-2002').map((r) => r.code)),
  buildSeries('XL-2003', '厨房收纳系列', RAW.filter((r) => r.seriesCode === 'XL-2003').map((r) => r.code)),
  buildSeries('XL-2004', '手机支架系列', RAW.filter((r) => r.seriesCode === 'XL-2004').map((r) => r.code)),
];

/* ---------- 全局指标 ---------- */

export function pct(r: number): string {
  return `${(r * 100).toFixed(1)}%`;
}

export function rateCls(r: number, threshold = 0.25): string {
  if (r >= threshold) return 'bad';
  if (r >= 0.1) return 'warn';
  return 'ok';
}

export function totalCodes(): number {
  return QC_CENTER_SERIES.reduce((s, x) => s + x.codes.length, 0);
}

/** 已标记垃圾品：综合退款率 ≥ 25% 的商品编码数 */
export function markedJunkCount(): number {
  return QC_CENTER_SERIES.flatMap((s) => s.codes).filter((c) => {
    const orders = c.platforms.reduce((s2, p) => s2 + p.orders, 0);
    const refunds = c.platforms.reduce((s2, p) => s2 + p.orders * p.refundRate, 0);
    return orders ? refunds / orders >= 0.25 : false;
  }).length;
}

/** 商品编码聚合订单量 */
export function codeOrders(c: QcCenterCode): number {
  return c.platforms.reduce((s, p) => s + p.orders, 0);
}

/** 商品编码聚合聊天风险条数 */
export function codeChatRisks(c: QcCenterCode): number {
  return c.platforms.reduce((s, p) => s + p.chatRisks, 0);
}

/** 商品编码综合退款率（按订单量加权） */
export function codeRefundRate(c: QcCenterCode): number {
  const orders = codeOrders(c);
  const refunds = c.platforms.reduce((s, p) => s + p.orders * p.refundRate, 0);
  return orders ? refunds / orders : 0;
}

/** 垃圾品状态：与品控管理 TOP 问题商品同口径 */
export function junkStatusOf(rate: number): 'junk' | 'suspect' | 'normal' {
  if (rate >= 0.3) return 'junk';
  if (rate >= 0.25) return 'suspect';
  return 'normal';
}

/** TOP 问题商品：按综合退款率或聊天风险率降序 */
export function topProblemCodes(
  limit = 5,
  key: 'refundRate' | 'chatRate' = 'refundRate',
): { seriesCode: string; code: QcCenterCode; refundRate: number; chatRate: number }[] {
  return QC_CENTER_SERIES
    .flatMap((s) => s.codes.map((c) => {
      const orders = codeOrders(c);
      return {
        seriesCode: s.seriesCode,
        code: c,
        refundRate: codeRefundRate(c),
        chatRate: orders ? codeChatRisks(c) / orders : 0,
      };
    }))
    .sort((a, b) => b[key] - a[key])
    .slice(0, limit);
}

export function totalOrders(): number {
  return QC_CENTER_SERIES.reduce((s, x) => s + x.orders, 0);
}

export function totalChatRiskHits(): number {
  return QC_CENTER_SERIES.reduce((s, x) => s + x.chatRiskHits, 0);
}

export function totalProblemHits(): number {
  return QC_CENTER_SERIES.reduce((s, x) => s + x.problemHits.reduce((h, p) => h + p.count, 0), 0);
}

/** 按问题类型聚合命中次数（降序） */
export function problemTypeRanking(): { type: string; count: number; seriesCount: number }[] {
  const map = new Map<string, { count: number; seriesCount: Set<string> }>();
  QC_PROBLEM_TYPES.forEach((t) => map.set(t, { count: 0, seriesCount: new Set() }));
  QC_CENTER_SERIES.forEach((s) => s.problemHits.forEach(({ type, count }) => {
    const e = map.get(type);
    if (e) {
      e.count += count;
      e.seriesCount.add(s.seriesCode);
    }
  }));
  return [...map.entries()]
    .map(([type, e]) => ({ type, count: e.count, seriesCount: e.seriesCount.size }))
    .sort((a, b) => b.count - a.count);
}

/** 平台维度：按订单占比分摊聚合各问题类型命中次数（降序） */
export function platformProblemHits(codes: QcCenterCode[]): Partial<Record<Platform, [string, number][]>> {
  const acc = new Map<Platform, Map<string, number>>();
  for (const c of codes) {
    const total = c.platforms.reduce((s, p) => s + p.orders, 0) || 1;
    for (const p of c.platforms) {
      let m = acc.get(p.platform);
      if (!m) { m = new Map(); acc.set(p.platform, m); }
      for (const h of c.problemHits) {
        const add = Math.round((h.count * p.orders) / total);
        if (add > 0) m.set(h.type, (m.get(h.type) ?? 0) + add);
      }
    }
  }
  const out: Partial<Record<Platform, [string, number][]>> = {};
  for (const [plat, m] of acc) out[plat] = [...m.entries()].sort((a, b) => b[1] - a[1]);
  return out;
}

/* ---------- 时间范围聚合（今日 / 近7天 / 自定义=近30天） ---------- */

export type RangeKey = 'today' | '7d' | 'custom';

export const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '7d', label: '近7天' },
  { key: 'custom', label: '自定义' },
];

/** 自定义日期区间（YYYY-MM-DD，闭区间） */
export type DateRange = { start: string; end: string };

/** 近30天日期轴（ISO，末位为今天） */
export const DATE_AXIS: string[] = (() => {
  const out: string[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  }
  return out;
})();

export const DEFAULT_CUSTOM_RANGE: DateRange = { start: DATE_AXIS[0], end: DATE_AXIS[DATE_AXIS.length - 1] };

/** 范围 → 日期轴下标窗口；自定义区间越界/反序时自动钳制与交换 */
export function windowOf(range: RangeKey, custom?: DateRange): [number, number] {
  if (range === 'today') return [DATE_AXIS.length - 1, DATE_AXIS.length - 1];
  if (range === '7d') return [DATE_AXIS.length - 7, DATE_AXIS.length - 1];
  if (!custom) return [0, DATE_AXIS.length - 1];
  let i0 = DATE_AXIS.findIndex((d) => d >= custom.start);
  if (i0 < 0) i0 = 0;
  let i1 = DATE_AXIS.length - 1;
  for (let i = DATE_AXIS.length - 1; i >= 0; i--) {
    if (DATE_AXIS[i] <= custom.end) { i1 = i; break; }
  }
  if (i0 > i1) [i0, i1] = [i1, i0];
  return [i0, i1];
}

/** 确定性日权重（近30天，和为1） */
function shapeWeights(phase: number): number[] {
  const raw = Array.from({ length: 30 }, (_, i) => 1 + 0.35 * Math.sin(i / 4.1 + phase) + 0.2 * Math.sin(i / 8.7 + phase * 1.7));
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / s);
}

function dailyCounts(total: number, phase = 0): number[] {
  const out = shapeWeights(phase).map((v) => Math.round(v * total));
  out[29] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

function hourlySplit(total: number): number[] {
  const raw = Array.from({ length: 24 }, (_, h) => Math.max(0.06, Math.sin(((h - 7) / 15) * Math.PI)));
  const s = raw.reduce((a, b) => a + b, 0);
  const out = raw.map((v) => Math.round((v / s) * total));
  out[12] += total - out.reduce((a, b) => a + b, 0);
  return out;
}

/** 各问题类型近30天逐日命中矩阵（确定性 mock，与 DATE_AXIS 对齐） */
function typeDailyMatrix(): { type: string; days: number[] }[] {
  const n = DATE_AXIS.length;
  return problemTypeRanking().map((r, idx) => {
    const phase = idx * 1.3;
    const raw = Array.from({ length: n }, (_, i) => 1 + 0.5 * Math.sin(i / 3.4 + phase) + 0.3 * Math.sin(i / 7.9 + phase * 0.6));
    const s = raw.reduce((a, b) => a + b, 0);
    const days = raw.map((v) => Math.round((v / s) * r.count));
    days[n - 1] += r.count - days.reduce((a, b) => a + b, 0);
    return { type: r.type, days };
  });
}

/** 范围内订单量 / 聊天问题命中次数（自定义=按选定日期区间聚合） */
export function rangeEventTotals(range: RangeKey, custom?: DateRange): { orders: number; chatHits: number } {
  const [i0, i1] = windowOf(range, custom);
  const ordersDays = dailyCounts(totalOrders(), 0.7);
  const chatDays = dailyCounts(totalChatRiskHits(), 2.1);
  const sum = (arr: number[]) => arr.slice(i0, i1 + 1).reduce((a, b) => a + b, 0);
  return { orders: sum(ordersDays), chatHits: sum(chatDays) };
}

/** 范围内各问题类型命中次数（自定义=按选定日期区间聚合） */
export function rangeTypeCounts(range: RangeKey, custom?: DateRange): Record<string, number> {
  const [i0, i1] = windowOf(range, custom);
  const out: Record<string, number> = {};
  typeDailyMatrix().forEach((m) => {
    out[m.type] = m.days.slice(i0, i1 + 1).reduce((a, b) => a + b, 0);
  });
  return out;
}

/** 问题类型 → 责任部门（部门占比 = 其负责类型的问题数总和） */
export const PROBLEM_DEPT: Record<string, string> = {
  质量问题: '品质',
  '描述/宣传不符': '运营',
  包装破损: '快递/品质',
  少发: '仓库',
  错发: '仓库',
  物流问题: '快递',
  '价格/活动类问题': '运营',
  '服务类问题': '客服',
};

/** 责任部门展示顺序 */
export const QC_DEPTS = ['品质', '运营', '仓库', '快递', '快递/品质', '客服'];

export const DEPT_COLOR: Record<string, string> = {
  品质: '#e5484d',
  运营: '#f76b15',
  仓库: '#8e4ec6',
  快递: '#3e63dd',
  '快递/品质': '#12a594',
  客服: '#65758b',
};

/** 由问题类型集合取去重后的责任部门（按 QC_DEPTS 顺序） */
export function deptsOfTypes(types: string[]): string[] {
  return QC_DEPTS.filter((d) => types.some((t) => PROBLEM_DEPT[t] === d));
}

/** 默认责任部门：系列全量问题数最多的部门（全量口径，不受筛选影响） */
export function defaultDutyDept(series: QcCenterSeries): string {
  const counts: Record<string, number> = {};
  series.problemHits.forEach((h) => {
    const d = PROBLEM_DEPT[h.type];
    if (d) counts[d] = (counts[d] || 0) + h.count;
  });
  let best = QC_DEPTS[0];
  let max = -1;
  QC_DEPTS.forEach((d) => {
    const v = counts[d] || 0;
    if (v > max) { max = v; best = d; }
  });
  return best;
}

/** 时间范围内按责任部门聚合问题数 */
export function rangeDeptCounts(range: RangeKey, custom?: DateRange): Record<string, number> {
  const tc = rangeTypeCounts(range, custom);
  const out: Record<string, number> = {};
  for (const [t, n] of Object.entries(tc)) {
    const d = PROBLEM_DEPT[t];
    if (!d) continue;
    out[d] = (out[d] ?? 0) + n;
  }
  return out;
}

/** 时间范围对数量指标的缩放占比（自定义=选定区间日权重之和） */
export function rangeRatio(range: RangeKey, custom?: DateRange): number {
  const [i0, i1] = windowOf(range, custom);
  const w = shapeWeights(0.7);
  return w.slice(i0, i1 + 1).reduce((a, b) => a + b, 0);
}

/** 系列筛选视图：平台筛选 + 时间缩放 + 问题类型筛选；无匹配数据时返回 null */
export function applySeriesView(
  s: QcCenterSeries,
  f: { platform?: Platform | null; range?: RangeKey; custom?: DateRange; problemType?: string | null },
): QcCenterSeries | null {
  const ratio = rangeRatio(f.range ?? 'custom', f.custom);
  const scaleStats = (ps: QcPlatformStat[]): QcPlatformStat[] => ps
    .filter((p) => !f.platform || p.platform === f.platform)
    .map((p) => ({
      ...p,
      orders: Math.round(p.orders * ratio),
      afterSales: Math.round(p.afterSales * ratio),
      chatRisks: Math.round(p.chatRisks * ratio),
    }));
  const scaleHits = (hs: { type: string; count: number }[]) => hs
    .filter((h) => !f.problemType || h.type === f.problemType)
    .map((h) => ({ type: h.type, count: Math.round(h.count * ratio) }))
    .filter((h) => h.count > 0);

  let codes: QcCenterCode[] = s.codes
    .map((c) => ({ ...c, platforms: scaleStats(c.platforms), problemHits: scaleHits(c.problemHits) }));
  if (f.problemType) codes = codes.filter((c) => c.problemHits.length > 0);
  codes = codes.filter((c) => c.platforms.length > 0);
  if (!codes.length) return null;
  return buildSeries(s.seriesCode, s.name, codes);
}

/** 问题趋势数据：单日=24小时，多日=逐日（自定义区间同口径） */
export function problemTrendData(range: RangeKey, custom?: DateRange): { labels: string[]; series: { type: string; points: number[] }[] } {
  const matrix = typeDailyMatrix();
  const [i0, i1] = windowOf(range, custom);
  if (i0 === i1) {
    return {
      labels: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
      series: matrix.map((m) => ({ type: m.type, points: hourlySplit(m.days[i0]) })),
    };
  }
  return {
    labels: DATE_AXIS.slice(i0, i1 + 1).map((d) => d.slice(5).replace('-', '/')),
    series: matrix.map((m) => ({ type: m.type, points: m.days.slice(i0, i1 + 1) })),
  };
}

/** 订单量趋势（与数据总览订单量同口径，供趋势图对照曲线） */
export function orderTrendData(range: RangeKey, custom?: DateRange): { labels: string[]; points: number[] } {
  const days = dailyCounts(totalOrders(), 0.7);
  const [i0, i1] = windowOf(range, custom);
  if (i0 === i1) {
    return {
      labels: Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`),
      points: hourlySplit(days[i0]),
    };
  }
  return {
    labels: DATE_AXIS.slice(i0, i1 + 1).map((d) => d.slice(5).replace('-', '/')),
    points: days.slice(i0, i1 + 1),
  };
}

/* ---------- 指标趋势（趋势图弹层：系列 / 平台维度，昨日/前3日/前7日/自定义） ---------- */
export type TrendRangeKey = 'yesterday' | 'd3' | 'd7' | 'custom';
export const TREND_RANGE_LABELS: { key: TrendRangeKey; label: string }[] = [
  { key: 'yesterday', label: '昨日' },
  { key: 'd3', label: '前3日' },
  { key: 'd7', label: '前7日' },
  { key: 'custom', label: '自定义' },
];

/** 趋势范围口径统计（订单量/退款率/售后单/聊天风险） */
export interface ScopeTotals { orders: number; refundRate: number; afterSales: number; chatRisks: number; }

export type MetricKey = 'orders' | 'refundRate' | 'afterSales' | 'chatRisks' | 'chatRatio';

function trendWindowOf(range: TrendRangeKey, custom?: DateRange): [number, number] {
  const n = DATE_AXIS.length;
  if (range === 'yesterday') return [n - 2, n - 2];
  if (range === 'd3') return [n - 4, n - 2];
  if (range === 'd7') return [n - 8, n - 2];
  if (!custom) return [0, n - 2];
  let i0 = DATE_AXIS.findIndex((d) => d >= custom.start);
  if (i0 < 0) i0 = 0;
  let i1 = n - 2;
  for (let i = n - 1; i >= 0; i--) {
    if (DATE_AXIS[i] <= custom.end) { i1 = Math.min(i, n - 2); break; }
  }
  if (i0 > i1) [i0, i1] = [i1, i0];
  return [i0, i1];
}

/** 范围内五指标逐日（昨日=逐时）序列与周期汇总 */
export function metricTrend(t: ScopeTotals, range: TrendRangeKey, custom?: DateRange, seed = 0): {
  labels: string[];
  series: Record<MetricKey, number[]>;
  sums: Record<MetricKey, number>;
} {
  const n = DATE_AXIS.length;
  const dOrders = dailyCounts(t.orders, 0.7 + seed);
  const dAfter = dailyCounts(t.afterSales, 1.9 + seed);
  const dChat = dailyCounts(t.chatRisks, 2.8 + seed);
  const dRate = Array.from({ length: n }, (_, i) => t.refundRate * (0.8 + 0.4 * Math.abs(Math.sin(i / 2.6 + seed + 1))));
  const [i0, i1] = trendWindowOf(range, custom);
  let labels: string[];
  let orders: number[];
  let afterSales: number[];
  let chatRisks: number[];
  let refundRate: number[];
  if (i0 === i1) {
    labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`);
    orders = hourlySplit(dOrders[i0]);
    afterSales = hourlySplit(dAfter[i0]);
    chatRisks = hourlySplit(dChat[i0]);
    refundRate = Array.from({ length: 24 }, (_, h) => t.refundRate * (0.8 + 0.4 * Math.abs(Math.sin(h / 3.1 + seed + 1))));
  } else {
    labels = DATE_AXIS.slice(i0, i1 + 1).map((d) => d.slice(5).replace('-', '/'));
    orders = dOrders.slice(i0, i1 + 1);
    afterSales = dAfter.slice(i0, i1 + 1);
    chatRisks = dChat.slice(i0, i1 + 1);
    refundRate = dRate.slice(i0, i1 + 1);
  }
  const chatRatio = orders.map((o, i) => (o ? chatRisks[i] / o : 0));
  const sumO = orders.reduce((a, b) => a + b, 0);
  const sumA = afterSales.reduce((a, b) => a + b, 0);
  const sumC = chatRisks.reduce((a, b) => a + b, 0);
  const sums: Record<MetricKey, number> = {
    orders: sumO,
    afterSales: sumA,
    chatRisks: sumC,
    refundRate: sumO ? refundRate.reduce((s, r, i) => s + r * orders[i], 0) / sumO : 0,
    chatRatio: sumO ? sumC / sumO : 0,
  };
  return { labels, series: { orders, refundRate, afterSales, chatRisks, chatRatio }, sums };
}
