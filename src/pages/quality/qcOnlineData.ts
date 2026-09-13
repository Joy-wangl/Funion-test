/* =========================================================
   品控-线上（线上版复刻）· 独立数据层
   - 无商品标签维度：列表无标签筛选/标签列，抽屉无标签模块
   - 数据口径复刻线上截图：共 21,584 个系列 · 优化任务 0 条
   - 看板为固定口径（不随时间范围变化）；监控列表首页与线上截图一致，其余页确定性生成
   ========================================================= */
import { DATE_AXIS, QC_PLATFORMS, QC_PROBLEM_TYPES, type QcCenterCode, type QcCenterSeries, type QcPlatformStat } from './qcCenterData';
import type { ChatHit, ChatSession, Platform } from './data';

/** 监控系列编码数（= 系列总数） */
export const ONLINE_TOTAL = 21584;

/** 数据总览固定口径 */
export const ONLINE_OV = { codes: 21584, junk: 5388, orders: 30825366, chatHits: 27953 };

/** 问题类型占比固定口径（合计 27,953 = 聊天问题命中次数） */
export const ONLINE_TYPE_COUNTS: Record<string, number> = {
  质量问题: 6073,
  '描述/宣传不符': 3474,
  包装破损: 1298,
  少发: 3257,
  物流问题: 5520,
  服务类问题: 5768,
  '价格/活动类问题': 810,
  错发: 1753,
};

/** 问题涉及部门占比固定口径 */
export const ONLINE_DEPT_COUNTS: Record<string, number> = {
  品质: 6031,
  运营: 4239,
  仓库: 4999,
  快递: 5504,
  '快递/品质': 1293,
  客服: 5756,
};

/* ---------- 确定性随机（mulberry32）：保证每次进入页面数据一致 ---------- */
const mulberry32 = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const NAME_POOL = [
  '收纳箱', '卫衣', '保温杯', '台灯', '浴巾', '整理盒', '帆布鞋', '羽绒服', '餐具套装', '墙贴',
  '窗帘', '地毯', '双肩包', '雨伞', '烧水壶', '垃圾桶', '晾衣架', '化妆镜', '鞋架', '抱枕',
  '围裙', '手套', '马克笔', '纸巾盒', '挂钩排', '密封罐', '烤盘', '蒸架', '杯刷', '门垫',
];
const SPEC_POOL = ['', '', '', '(2件装)', '(4)', '(大号)', '(加粗)', '(套装)'];

/** 首页固定行（与线上截图一致；平台枚举沿用原型六平台口径） */
const PAGE1: { name: string; orders: number; refundRate: number; afterSales: number; chatRiskHits: number; platforms: Platform[]; hits: [string, number][] }[] = [
  {
    name: '无痕粘钩', orders: 210242, refundRate: 0.029, afterSales: 6065, chatRiskHits: 93,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['质量问题', 14], ['服务类问题', 27], ['描述/宣传不符', 6], ['物流问题', 32], ['包装破损', 5], ['少发', 11], ['价格/活动类问题', 3], ['错发', 2]],
  },
  {
    name: '图画本(4)', orders: 199008, refundRate: 0.021, afterSales: 4105, chatRiskHits: 95,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['错发', 6], ['物流问题', 24], ['价格/活动类问题', 6], ['描述/宣传不符', 22], ['包装破损', 2], ['少发', 12], ['质量问题', 9], ['服务类问题', 4]],
  },
  {
    name: '强力大挂钩', orders: 160069, refundRate: 0.024, afterSales: 3871, chatRiskHits: 194,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['少发', 34], ['描述/宣传不符', 28], ['包装破损', 9], ['价格/活动类问题', 10], ['错发', 11], ['物流问题', 52], ['质量问题', 7], ['服务类问题', 5]],
  },
  {
    name: '赠品', orders: 126925, refundRate: 0.033, afterSales: 4183, chatRiskHits: 3,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['少发', 3], ['包装破损', 1]],
  },
  {
    name: '卷装姓名贴', orders: 116074, refundRate: 0.023, afterSales: 2687, chatRiskHits: 15,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['服务类问题', 7], ['包装破损', 1], ['质量问题', 1], ['描述/宣传不符', 1], ['物流问题', 7]],
  },
  {
    name: '水龙头过滤棉(4)', orders: 105520, refundRate: 0.028, afterSales: 2944, chatRiskHits: 66,
    platforms: ['天猫', '拼多多', '抖音', '淘宝', '快手'],
    hits: [['少发', 9], ['价格/活动类问题', 2], ['描述/宣传不符', 5], ['包装破损', 1], ['服务类问题', 6], ['物流问题', 30], ['质量问题', 4]],
  },
];

const LAST_ORDER_AT = '2026-09-12 18:26';

const mkStat = (pl: Platform, orders: number, refundRate: number, afterSales: number, chatRisks: number): QcPlatformStat => ({
  platform: pl,
  productIds: [`${pl.slice(0, 1)}${orders}01`],
  orders,
  refundRate,
  afterSales,
  chatRisks,
  lastOrderAt: LAST_ORDER_AT,
});

/** 由编码平台数据合并系列级平台矩阵 */
const mergeStats = (codes: QcCenterCode[]): QcPlatformStat[] => {
  const map = new Map<Platform, QcPlatformStat>();
  for (const c of codes) {
    for (const p of c.platforms) {
      const cur = map.get(p.platform);
      if (!cur) map.set(p.platform, { ...p });
      else {
        cur.orders += p.orders;
        cur.afterSales += p.afterSales;
        cur.chatRisks += p.chatRisks;
        cur.refundRate = (cur.refundRate + p.refundRate) / 2;
        cur.productIds = [...cur.productIds, ...p.productIds];
      }
    }
  }
  return [...map.values()];
};

/** 整数精确拆分：k 份之和恒等于 total（余数前置进位），避免逐份取整造成系列级汇总漂移 */
const splitInt = (total: number, k: number): number[] => {
  const base = Math.floor(total / k);
  const rem = total - base * k;
  return Array.from({ length: k }, (_, i) => base + (i < rem ? 1 : 0));
};

const buildSeries = (
  seriesCode: string,
  name: string,
  orders: number,
  refundRate: number,
  afterSales: number,
  chatRiskHits: number,
  platforms: Platform[],
  hits: [string, number][],
  codeCount: number,
): QcCenterSeries => {
  /* 两级精确拆分（系列→编码→平台）：各平台 stat 汇总恒等于系列级种子值，
     经 applySeriesView（全量口径 ratio=1）重聚合后展示数字与线上截图一致 */
  const ordersByCode = splitInt(orders, codeCount);
  const asByCode = splitInt(afterSales, codeCount);
  const chatByCode = splitInt(chatRiskHits, codeCount);
  const codes: QcCenterCode[] = [];
  for (let i = 0; i < codeCount; i++) {
    const oByPlat = splitInt(ordersByCode[i], platforms.length);
    const aByPlat = splitInt(asByCode[i], platforms.length);
    const cByPlat = splitInt(chatByCode[i], platforms.length);
    codes.push({
      code: `SP-${seriesCode.slice(3)}${i + 1}`,
      name: `${name}${SPEC_POOL[i % SPEC_POOL.length] || ' 标准款'}`,
      platforms: platforms.map((pl, j) => mkStat(pl, oByPlat[j], refundRate, aByPlat[j], cByPlat[j])),
      problemHits: hits.map(([type, count]) => ({ type, count: splitInt(count, codeCount)[i] })),
    });
  }
  return {
    seriesCode,
    name,
    codes,
    merged: mergeStats(codes),
    platforms,
    orders,
    refundRate,
    afterSales,
    chatRiskHits,
    problemHits: hits.map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
  };
};

let cache: QcCenterSeries[] | null = null;

/** 线上版系列全量（惰性生成 + 缓存）：首页固定行 + 其余确定性生成，订单总量归一化至线上口径 */
export const onlineSeries = (): QcCenterSeries[] => {
  if (cache) return cache;
  const rnd = mulberry32(20260913);
  const out: QcCenterSeries[] = PAGE1.map((r, i) => buildSeries(
    `XL-${1001 + i}`, r.name, r.orders, r.refundRate, r.afterSales, r.chatRiskHits, r.platforms, r.hits, 1 + Math.floor(rnd() * 2),
  ));
  /* 首页已消耗的类型次数，从固定口径中扣除后分配给生成行 */
  const remain: Record<string, number> = { ...ONLINE_TYPE_COUNTS };
  for (const r of PAGE1) for (const [t, c] of r.hits) remain[t] = (remain[t] ?? 0) - c;
  const types = QC_PROBLEM_TYPES.filter((t) => (remain[t] ?? 0) > 0);
  /* 第一遍：先生成属性与权重，订单量按权重归一化，保证总量精确且单行不为负 */
  const attrs: { name: string; ratio: number; refundRate: number; chatRiskHits: number; plats: Platform[]; hits: [string, number][]; codeCount: number; w: number }[] = [];
  for (let i = out.length; i < ONLINE_TOTAL; i++) {
    const name = `${NAME_POOL[Math.floor(rnd() * NAME_POOL.length)]}${SPEC_POOL[Math.floor(rnd() * SPEC_POOL.length)]}`;
    const refundRate = Math.round((0.005 + rnd() * 0.055) * 1000) / 1000;
    const ratio = 0.01 + rnd() * 0.03;
    const chatRiskHits = rnd() < 0.6 ? 0 : Math.floor(rnd() * 60);
    const plats = [...QC_PLATFORMS].sort(() => rnd() - 0.5).slice(0, 2 + Math.floor(rnd() * 4)) as Platform[];
    const hits: [string, number][] = [];
    const n = rnd() < 0.3 ? 0 : 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < n && types.length; k++) {
      const t = types[Math.floor(rnd() * types.length)];
      const c = Math.min(remain[t], 1 + Math.floor(rnd() * 12));
      remain[t] -= c;
      if (remain[t] <= 0) types.splice(types.indexOf(t), 1);
      hits.push([t, c]);
    }
    attrs.push({ name: `${name}(${i})`, ratio, refundRate, chatRiskHits, plats, hits, codeCount: 1 + Math.floor(rnd() * 2), w: 0.4 + rnd() });
  }
  const page1Sum = out.reduce((s, x) => s + x.orders, 0);
  const genTarget = ONLINE_OV.orders - page1Sum;
  const wSum = attrs.reduce((s, a) => s + a.w, 0);
  let genSum = 0;
  attrs.forEach((a, idx) => {
    const orders = idx === attrs.length - 1 ? genTarget - genSum : Math.max(1, Math.round((a.w / wSum) * genTarget));
    genSum += orders;
    out.push(buildSeries(
      `XL-${1001 + out.length}`,
      a.name,
      orders,
      a.refundRate,
      Math.max(0, Math.round(orders * a.ratio)),
      a.chatRiskHits,
      a.plats,
      a.hits,
      a.codeCount,
    ));
  });
  cache = out;
  return out;
};

/* ---------- 看板趋势 / TOP：由线上系列确定性聚合 ---------- */

/** 问题趋势：各类型固定口径按日分布（权重抖动 + 末日补差） */
export const onlineTrend = (): { labels: string[]; series: { type: string; points: number[] }[] } => {
  const rnd = mulberry32(7788);
  const labels = DATE_AXIS;
  const series = Object.entries(ONLINE_TYPE_COUNTS).map(([type, total]) => {
    const w = labels.map(() => 0.6 + rnd());
    const ws = w.reduce((s, x) => s + x, 0);
    const points = w.map((x) => Math.round((x / ws) * total));
    points[points.length - 1] += total - points.reduce((s, x) => s + x, 0);
    return { type, points };
  });
  return { labels, series };
};

/** 订单趋势：总量按日分布 */
export const onlineOrderTrend = (): { points: number[] } => {
  const rnd = mulberry32(9911);
  const w = DATE_AXIS.map(() => 0.7 + rnd());
  const ws = w.reduce((s, x) => s + x, 0);
  const points = w.map((x) => Math.round((x / ws) * ONLINE_OV.orders));
  points[points.length - 1] += ONLINE_OV.orders - points.reduce((s, x) => s + x, 0);
  return { points };
};

/** TOP 问题商品：与 legacy topProblemCodes 同构（seriesCode/code/退款率/聊天风险率） */
export const onlineTopCodes = (n: number, key: 'refundRate' | 'chatRate') => {
  const rows: { seriesCode: string; code: QcCenterCode; refundRate: number; chatRate: number }[] = [];
  for (const s of onlineSeries()) {
    for (const c of s.codes) {
      const orders = c.platforms.reduce((sum, p) => sum + p.orders, 0);
      const risks = c.platforms.reduce((sum, p) => sum + p.chatRisks, 0);
      const refundRate = c.platforms.reduce((sum, p) => sum + p.refundRate, 0) / (c.platforms.length || 1);
      rows.push({ seriesCode: s.seriesCode, code: c, refundRate, chatRate: orders ? risks / orders : 0 });
    }
  }
  rows.sort((a, b) => (key === 'refundRate' ? b.refundRate - a.refundRate : b.chatRate - a.chatRate));
  return rows.slice(0, n);
};

/* ---------- 线上聊天会话：按系列惰性生成，会话命中总数 = 系列聊天风险（与列表口径一致） ---------- */

const CHAT_PHRASES: Record<string, string[]> = {
  质量问题: ['用两次就坏了，质量太差', '做工粗糙还有瑕疵', '材质和手感都不对劲'],
  '描述/宣传不符': ['实物和页面描述完全不一样', '宣传的功能根本没有', '尺寸和详情页标注差太多'],
  包装破损: ['收到时外箱都压烂了', '包装破了里面商品也脏了', '缓冲填充都没有直接裸发'],
  少发: ['少发了一件要求补发', '数量不对套餐里缺了一样', '核对后发现漏发了配件'],
  物流问题: ['物流一周不更新', '包裹显示签收但没收到', '发货太慢催了三次才发'],
  服务类问题: ['客服一直不回复', '售后推诿没人处理', '态度敷衍问题没解决'],
  '价格/活动类问题': ['活动价比平时还贵', '优惠券用不了要求退差价', '保价期内降价不退差'],
  错发: ['颜色和下单的完全不一样', '发错型号要求换货', '收到别人的退货件'],
};
const CHAT_REPLIES = [
  '抱歉给您带来困扰，这边马上为您登记处理。',
  '已为您反馈相关部门，会在 24 小时内给您答复。',
  '支持退货退款并承担运费，您看可以吗？',
];

const sessionCache = new Map<string, ChatSession[]>();

/** 系列聊天会话（抽屉/平台聊天弹窗同源）：命中包按问题类型占比拆分聊天风险次数，再打包为 ≤12 个会话 */
export const onlineSessionsOf = (s: QcCenterSeries): ChatSession[] => {
  const cached = sessionCache.get(s.seriesCode);
  if (cached) return cached;
  const out: ChatSession[] = [];
  if (s.chatRiskHits > 0 && s.codes.length && s.platforms.length) {
    const rnd = mulberry32(Number(s.seriesCode.slice(3)) * 7919 + 17);
    const weights = s.problemHits.length ? s.problemHits : [{ type: QC_PROBLEM_TYPES[0], count: 1 }];
    const wSum = weights.reduce((sum, w) => sum + w.count, 0);
    const bag: string[] = [];
    let left = s.chatRiskHits;
    weights.forEach((w, i) => {
      const n = i === weights.length - 1 ? left : Math.min(left, Math.round((w.count / wSum) * s.chatRiskHits));
      left -= n;
      for (let k = 0; k < n; k++) bag.push(w.type);
    });
    /* 洗乱命中顺序，避免同类型命中集中在同一会话 */
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    const sessCount = Math.max(1, Math.min(12, Math.ceil(bag.length / 6)));
    const base = Math.floor(bag.length / sessCount);
    const rem = bag.length - base * sessCount;
    let cur = 0;
    for (let i = 0; i < sessCount; i++) {
      const n = base + (i < rem ? 1 : 0);
      const types = bag.slice(cur, cur + n);
      cur += n;
      const platform = s.platforms[i % s.platforms.length];
      const dd = String(10 + Math.floor(rnd() * 28)).padStart(2, '0');
      const hh = String(9 + Math.floor(rnd() * 12)).padStart(2, '0');
      const mm = Math.floor(rnd() * 50);
      const tAt = (add: number) => `2026-08-${dd} ${hh}:${String(mm + add).padStart(2, '0')}`;
      const pool = (t: string) => CHAT_PHRASES[t] || ['商品问题要求处理'];
      const phrases = types.map((t) => pool(t)[Math.floor(rnd() * pool(t).length)]);
      out.push({
        id: `CS-${s.seriesCode.slice(3)}-${i + 1}`,
        code: s.codes[i % s.codes.length].code,
        platform,
        startedAt: tAt(0),
        orderId: `SO-08${dd}-${1000 + Math.floor(rnd() * 9000)}`,
        messages: [
          { role: 'buyer', time: tAt(0), text: `${phrases[0]}，要求处理！` },
          { role: 'ai', time: tAt(4), text: '抱歉给您带来困扰，请问方便提供一下订单号与商品照片吗？' },
          { role: 'buyer', time: tAt(9), text: phrases.length > 1 ? `${phrases[1]}，尽快给我个说法。` : '照片和订单号都发了，尽快处理。' },
          { role: 'support', time: tAt(15), text: CHAT_REPLIES[i % CHAT_REPLIES.length] },
        ],
        hits: types.map((t, k) => ({ type: t, phrase: phrases[k] })),
      });
    }
  }
  sessionCache.set(s.seriesCode, out);
  return out;
};

/** 全屏弹窗修改命中类型后回写缓存（保持重开抽屉口径一致） */
export const patchOnlineSession = (id: string, hits: ChatHit[]) => {
  for (const list of sessionCache.values()) {
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = { ...list[i], hits };
  }
};

let codeIndex: Map<string, QcCenterSeries> | null = null;

/** 由商品编码反查线上系列（平台聊天弹窗按编码 scope 取会话） */
export const onlineSeriesOfCode = (code: string): QcCenterSeries | null => {
  if (!codeIndex) {
    codeIndex = new Map();
    for (const s of onlineSeries()) for (const c of s.codes) codeIndex.set(c.code, s);
  }
  return codeIndex.get(code) ?? null;
};
