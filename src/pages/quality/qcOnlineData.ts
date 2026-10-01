/* =========================================================
   品控-线上（线上版复刻）· 独立数据层
   - 无商品标签维度：列表无标签筛选/标签列，抽屉无标签模块
   - 数据口径复刻线上截图：共 21,584 个系列 · 优化任务 0 条
   - 看板为固定口径（不随时间范围变化）；监控列表首页与线上截图一致，其余页确定性生成
   ========================================================= */
import { DATE_AXIS, QC_PLATFORMS, QC_PROBLEM_TYPES, type DateRange, type QcCenterCode, type QcCenterSeries, type QcPlatformStat, type RangeKey } from './qcCenterData';
import { type ChatHit, type ChatMessage, type ChatSession, type Platform } from './data';

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
  /* 同类型命中合并，避免类型命中条出现重复行 */
  const mergedHits = hits.reduce((m, [t, c]) => {
    const e = m.find((x) => x[0] === t);
    if (e) e[1] += c;
    else m.push([t, c]);
    return m;
  }, [] as [string, number][]);
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
      problemHits: mergedHits.map(([type, count]) => ({ type, count: splitInt(count, codeCount)[i] })),
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
    problemHits: mergedHits.map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
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

/** 大类下二级子问题清单（与命中问题管理同源），供详情下钻按子问题过滤 */
export const subsOfType = (t: string): string[] => onlineHitCats().find((c) => c.name === t)?.subs.map((x) => x.name) ?? [];

const BUYER_TAILS = ['，要求处理！', '，麻烦尽快核实。', '，这个问题一直没解决。', '，再不处理就投诉了。'];
/** 会话消息由命中逐条生成：每个命中必有一条含其短语的买家消息作为证据，杜绝「有命中无证据」 */
const buildSessionMessages = (hits: ChatHit[], startedAt: string, seed: number): ChatMessage[] => {
  const [day, hm] = startedAt.split(' ');
  const [h0, m0] = hm.split(':').map(Number);
  const at = (add: number) => {
    const tot = m0 + add;
    return `${day} ${String(h0 + Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
  };
  if (!hits.length) {
    return [
      { role: 'buyer', time: at(0), text: '商品问题要求处理！' },
      { role: 'ai', time: at(4), text: '抱歉给您带来困扰，请问方便提供一下订单号与商品照片吗？' },
    ];
  }
  const msgs: ChatMessage[] = hits.map((h, k) => ({
    role: 'buyer' as const,
    time: at(k * 5),
    text: `${h.phrase}${BUYER_TAILS[k % BUYER_TAILS.length]}`,
  }));
  msgs.splice(1, 0, { role: 'ai', time: at(3), text: '抱歉给您带来困扰，请问方便提供一下订单号与商品照片吗？' });
  msgs.push({ role: 'support', time: at(hits.length * 5 + 2), text: CHAT_REPLIES[seed % CHAT_REPLIES.length] });
  return msgs;
};

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
      const dd = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
      const hh = String(9 + Math.floor(rnd() * 12)).padStart(2, '0');
      const mm = Math.floor(rnd() * 50);
      const tAt = (add: number) => `2026-08-${dd} ${hh}:${String(mm + add).padStart(2, '0')}`;
      const pool = (t: string) => CHAT_PHRASES[t] || ['商品问题要求处理'];
      const phrases = types.map((t) => pool(t)[Math.floor(rnd() * pool(t).length)]);
      const startedAt = tAt(0);
      const hits: ChatHit[] = types.map((t, k) => {
        const ss = subsOfType(t);
        return { type: t, phrase: phrases[k], sub: ss.length ? ss[(k + i) % ss.length] : undefined };
      });
      out.push({
        id: `CS-${s.seriesCode.slice(3)}-${i + 1}`,
        code: s.codes[i % s.codes.length].code,
        platform,
        startedAt,
        orderId: `SO-08${dd}-${1000 + Math.floor(rnd() * 9000)}`,
        messages: buildSessionMessages(hits, startedAt, i),
        hits,
      });
    }
  }
  sessionCache.set(s.seriesCode, out);
  return out;
};

/** 聊天数据列口径：风险会话=命中会话数（与会话打包口径同源：每会话≤6次命中、至多12个），
    会话总数按订单量确定性折算（不低于风险会话），风险率=风险会话/会话总数 */
export const onlineChatBrief = (s: QcCenterSeries): { total: number; risk: number; rate: number } => {
  const risk = s.chatRiskHits > 0 && s.codes.length && s.platforms.length
    ? Math.max(1, Math.min(12, Math.ceil(s.chatRiskHits / 6)))
    : 0;
  const h = Number(s.seriesCode.slice(3)) || 0;
  const total = Math.max(risk, Math.round(s.orders * (0.0008 + ((h * 31) % 23) / 10000)));
  return { total, risk, rate: total ? risk / total : 0 };
};

/** 全屏弹窗修改命中类型后回写缓存（保持重开抽屉口径一致；消息证据随命中同步重建） */
export const patchOnlineSession = (id: string, hits: ChatHit[]) => {
  for (const list of sessionCache.values()) {
    const i = list.findIndex((x) => x.id === id);
    if (i >= 0) list[i] = { ...list[i], hits, messages: buildSessionMessages(hits, list[i].startedAt, 0) };
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

/* ---------- 组别 / 运维人员归属（监控列表、售后列表、问题商品共用口径） ---------- */

export const ONLINE_GROUPS = ['运维一组', '运维二组', '运维三组'];
export const ONLINE_OPERATORS = ['李强', '王芳'];

/** 首页固定归属（与线上截图一致；null = 未分配显示 —） */
const PAGE1_OWNER: ({ group: string; operator: string } | null)[] = [
  { group: '运维一组', operator: '李强' }, null, null,
  { group: '运维三组', operator: '李强' }, { group: '运维三组', operator: '李强' }, { group: '运维一组', operator: '李强' },
];

/** 系列归属组别/运维：确定性生成，约四成未分配 */
export const onlineOwnerOf = (seriesCode: string): { group: string; operator: string } | null => {
  const n = Number(seriesCode.replace(/\D/g, ''));
  const fixed = PAGE1_OWNER[n - 1001];
  if (fixed !== undefined) return fixed;
  const rnd = mulberry32(n * 31 + 7);
  if (rnd() < 0.4) return null;
  return { group: ONLINE_GROUPS[Math.floor(rnd() * ONLINE_GROUPS.length)], operator: ONLINE_OPERATORS[Math.floor(rnd() * ONLINE_OPERATORS.length)] };
};

/** 各组在编运维：由系列归属反推，穿梭选择右栏按当前组呈现成员 */
export const ONLINE_GROUP_MEMBERS = ((): Record<string, string[]> => {
  const m: Record<string, string[]> = {};
  for (const g of ONLINE_GROUPS) m[g] = [];
  for (const s of onlineSeries()) {
    const o = onlineOwnerOf(s.seriesCode);
    if (o && !m[o.group].includes(o.operator)) m[o.group].push(o.operator);
  }
  for (const g of ONLINE_GROUPS) m[g].sort((a, b) => ONLINE_OPERATORS.indexOf(a) - ONLINE_OPERATORS.indexOf(b));
  return m;
})();

/* ---------- 售后列表：系列维度售后单 / 售后率 ---------- */

export interface OnlineAfterRow { seriesCode: string; name: string; group: string; operator: string; afterSales: number; rate: number; }

export const onlineAfterRows = (): OnlineAfterRow[] => onlineSeries().map((s) => {
  const o = onlineOwnerOf(s.seriesCode);
  return { seriesCode: s.seriesCode, name: s.name, group: o?.group ?? '—', operator: o?.operator ?? '—', afterSales: s.afterSales, rate: s.orders ? s.afterSales / s.orders : 0 };
});

/* ---------- 售后单列表（售后列表「查看详情」抽屉）：按系列确定性生成逐单明细 ---------- */

export type AfterOrderStatus = '已处理' | '已拒绝' | '待处理';
export interface OnlineAfterOrder {
  afterNo: string;
  code: string;
  orderNo: string;
  platform: Platform;
  type: string;
  reason: string;
  amount: number;
  status: AfterOrderStatus;
  appliedAt: string;
  /** 关联问题类型大类（售后单场景的问题类型占比口径） */
  ptype: string;
  /** 关联问题类型小类（售后单场景按小类快速筛选） */
  psub?: string;
  /** 售后起因会话（存在时会话卡右侧展示关联售后） */
  sessionId?: string;
}
export const AFTER_TYPES = ['退货退款/退款', '换货', '补发'];
export const AFTER_STATUSES: AfterOrderStatus[] = ['已处理', '已拒绝', '待处理'];
/** 售后单平台轮转序（对齐线上：拼多多起、天猫收尾） */
export const AFTER_PLATFORMS: Platform[] = ['拼多多', '抖音', '京东', '淘宝', '快手', '天猫'];
const AFTER_REASONS: Record<string, string[]> = {
  '退货退款/退款': ['质量问题', '商品与描述不符', '尺码不合适', '材质与描述不符', '不想要了/七天无理由'],
  换货: ['尺码不合适', '颜色与描述不符', '配件缺失'],
  补发: ['少件漏发', '外包装破损补发'],
};
const afterOrderCache = new Map<string, OnlineAfterOrder[]>();
/** 逐单明细确定性生成（不缓存）：供售后列表页全量扫描，避免缓存全系列售后单撑爆内存 */
const genAfterOrders = (series: QcCenterSeries): OnlineAfterOrder[] => {
  const total = series.afterSales;
  const rnd = mulberry32(Number(series.seriesCode.slice(3)) * 104729 + 31);
  const refund = Math.round(total * 0.5238);
  const exchange = Math.round(total * 0.2981);
  const codes = series.codes.map((c) => c.code);
  const num = series.seriesCode.slice(3);
  /* 问题类型按系列占比拆包洗乱，逐单挂载（售后单场景占比口径） */
  const weights = series.problemHits.length ? series.problemHits : [{ type: QC_PROBLEM_TYPES[0], count: 1 }];
  const wSum = weights.reduce((sum, w) => sum + w.count, 0);
  const pbag: string[] = [];
  let pleft = total;
  weights.forEach((w, i) => {
    const n = i === weights.length - 1 ? pleft : Math.min(pleft, Math.round((w.count / wSum) * total));
    pleft -= n;
    for (let k = 0; k < n; k++) pbag.push(w.type);
  });
  for (let i = pbag.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pbag[i], pbag[j]] = [pbag[j], pbag[i]];
  }
  const list: OnlineAfterOrder[] = [];
  for (let i = 0; i < total; i++) {
    const type = i < refund ? AFTER_TYPES[0] : i < refund + exchange ? AFTER_TYPES[1] : AFTER_TYPES[2];
    const dd = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
    const mins = (9 * 60 + 7 + i * 67) % (24 * 60);
    const pool = AFTER_REASONS[type];
    const pt = pbag[i] ?? weights[0].type;
    const ss = subsOfType(pt);
    list.push({
      afterNo: `AS-${num}-${String(i + 1).padStart(5, '0')}`,
      code: codes.length ? codes[i % codes.length] : '—',
      orderNo: `SO-08${dd}-${1037 + i * 37}`,
      platform: AFTER_PLATFORMS[i % AFTER_PLATFORMS.length],
      type,
      reason: pool[Math.floor(rnd() * pool.length)],
      amount: 30 + Math.floor(rnd() * 170),
      status: AFTER_STATUSES[i % AFTER_STATUSES.length],
      appliedAt: `2026-08-${dd} ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`,
      ptype: pt,
      psub: ss.length ? ss[i % ss.length] : undefined,
    });
  }
  /* 售后起因会话：约四成会话由售后发起（同平台同订单），会话卡据此展示关联售后 */
  const sessions = onlineSessionsOf(series);
  sessions.forEach((sess, i) => {
    if (i % 5 > 1) return;
    const o = list.find((x) => !x.sessionId && x.platform === sess.platform);
    if (!o) return;
    o.sessionId = sess.id;
    o.orderNo = sess.orderId;
  });
  return list;
};
export const onlineAfterOrdersOf = (series: QcCenterSeries): OnlineAfterOrder[] => {
  const hit = afterOrderCache.get(series.seriesCode);
  if (hit) return hit;
  const list = genAfterOrders(series);
  afterOrderCache.set(series.seriesCode, list);
  return list;
};

/* ---------- 售后列表页（系列维度之外的逐单口径）：全量扫描 + 分页切片 ----------
   售后单总量约数十万条，不能一次性物化：扫描只累计计数与每系列命中数，
   分页时按累计区间回生成对应系列的售后单取行，避免内存与首屏开销 */

export interface AfterOrderQuery {
  kw: string;
  group: string;
  operator: string;
  type: string;
  platform: string;
  status: string;
  /** 问题大类（未选小类时按大类口径过滤） */
  ptype: string | null;
  sub: string | null;
  from: string;
  to: string;
}
/** 页面行 = 售后单 + 系列/归属上下文 */
export type AfterOrderRow = OnlineAfterOrder & { seriesCode: string; seriesName: string; group: string; operator: string };
export interface AfterScan {
  total: number;
  /** 每系列命中数（分页切片按累计区间回生成） */
  cum: { code: string; count: number }[];
}
const matchAfter = (o: OnlineAfterOrder, f: AfterOrderQuery, seriesCode: string, seriesName: string): boolean => {
  if (f.type !== '全部类型' && o.type !== f.type) return false;
  if (f.platform !== '全部平台' && o.platform !== f.platform) return false;
  if (f.status !== '全部状态' && o.status !== f.status) return false;
  if (f.sub) { if (o.psub !== f.sub) return false; }
  else if (f.ptype && o.ptype !== f.ptype) return false;
  if (f.kw) {
    const k = f.kw.trim().toLowerCase();
    if (k && !o.afterNo.toLowerCase().includes(k) && !o.orderNo.toLowerCase().includes(k) && !o.code.toLowerCase().includes(k)
      && !seriesCode.toLowerCase().includes(k) && !seriesName.toLowerCase().includes(k)) return false;
  }
  const day = o.appliedAt.slice(0, 10);
  if (f.from && day < f.from) return false;
  if (f.to && day > f.to) return false;
  return true;
};
export const scanAfterOrders = (f: AfterOrderQuery): AfterScan => {
  const cum: { code: string; count: number }[] = [];
  let total = 0;
  for (const s of onlineSeries()) {
    const ow = onlineOwnerOf(s.seriesCode);
    if (f.group !== '全部组别' && (ow?.group ?? '—') !== f.group) continue;
    if (f.operator !== '全部运维' && (ow?.operator ?? '—') !== f.operator) continue;
    let c = 0;
    for (const o of genAfterOrders(s)) {
      if (!matchAfter(o, f, s.seriesCode, s.name)) continue;
      c += 1;
    }
    if (c) { total += c; cum.push({ code: s.seriesCode, count: c }); }
  }
  return { total, cum };
};
export const sliceAfterOrders = (f: AfterOrderQuery, cum: { code: string; count: number }[], start: number, end: number): AfterOrderRow[] => {
  const out: AfterOrderRow[] = [];
  let offset = 0;
  for (const seg of cum) {
    if (offset >= end) break;
    if (offset + seg.count <= start) { offset += seg.count; continue; }
    const s = onlineSeries().find((x) => x.seriesCode === seg.code);
    if (!s) { offset += seg.count; continue; }
    const ow = onlineOwnerOf(s.seriesCode);
    for (const o of genAfterOrders(s)) {
      if (!matchAfter(o, f, s.seriesCode, s.name)) continue;
      if (offset >= start) out.push({ ...o, seriesCode: s.seriesCode, seriesName: s.name, group: ow?.group ?? '—', operator: ow?.operator ?? '—' });
      offset += 1;
      if (offset >= end) break;
    }
  }
  return out;
};

/* ---------- 系列详情抽屉时间口径：今日 / 近3天 / 近7天 / 近14天 / 近30天 / 近三个月 / 自定义 ----------
   证据日期固定落在 2026-08-01~28，窗口按数据日期锚定（今日=数据末日），避免按真实今天过滤后全空；
   近三个月超出证据跨度时钳制为全跨度 */

export const DRAWER_RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: '3d', label: '近3天' },
  { key: '7d', label: '近7天' },
  { key: '14d', label: '近14天' },
  { key: '30d', label: '近30天' },
  { key: '90d', label: '近三个月' },
  { key: 'custom', label: '自定义' },
];
const EVIDENCE_END = '2026-08-28';
const EVIDENCE_START = '2026-08-01';
const shiftDay = (d: string, n: number) => {
  const t = new Date(`${d}T00:00:00`);
  t.setDate(t.getDate() + n);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};
/** 抽屉时间范围 → 闭区间日期窗口；自定义越界/反序时钳制与交换 */
export function drawerRangeWindow(range: RangeKey, custom?: DateRange): [string, string] {
  if (range === 'today') return [EVIDENCE_END, EVIDENCE_END];
  if (range === '3d') return [shiftDay(EVIDENCE_END, -2), EVIDENCE_END];
  if (range === '7d') return [shiftDay(EVIDENCE_END, -6), EVIDENCE_END];
  if (range === '14d') return [shiftDay(EVIDENCE_END, -13), EVIDENCE_END];
  if (range === '30d' || range === '90d') return [EVIDENCE_START, EVIDENCE_END];
  let start = custom?.start || EVIDENCE_START;
  let end = custom?.end || EVIDENCE_END;
  if (start > end) [start, end] = [end, start];
  return [start, end];
}
/** 默认自定义区间（近30天档全量数据日期） */
export const DRAWER_DEFAULT_CUSTOM: DateRange = { start: EVIDENCE_START, end: EVIDENCE_END };
/** 数量指标随时间窗口的缩放占比（窗口天数 / 数据全跨度天数） */
export function drawerRangeRatio(range: RangeKey, custom?: DateRange): number {
  const [s, e] = drawerRangeWindow(range, custom);
  const days = Math.round((new Date(`${e}T00:00:00`).getTime() - new Date(`${s}T00:00:00`).getTime()) / 86400000) + 1;
  return Math.min(1, Math.max(0, days / 28));
}

/* ---------- 线上问题评价：按系列惰性生成，问题类型占比与系列命中同权重 ---------- */

export interface OnlineReview {
  id: string;
  code: string;
  platform: Platform;
  ptype: string;
  /** 关联问题类型小类（评价场景按小类快速筛选） */
  psub?: string;
  /** 平台商品ID（同编码同平台恒定，评价行展示） */
  goodsId: string;
  content: string;
  rating: number;
  reviewedAt: string;
}

const REVIEW_PHRASES: Record<string, string[]> = {
  质量问题: ['用了不到一周就开胶断裂', '做工粗糙边缘全是毛刺', '材质异味重不敢用'],
  '描述/宣传不符': ['实物颜色和图片差很多', '标注的尺寸和实际量出来不符', '宣传的功能一个都没有'],
  包装破损: ['外箱压扁角上全磕坏了', '拆开包装里面商品裂了', '没有任何缓冲填充裸装发货'],
  少发: ['套餐里少了一件配件', '数量核对不上少发一份', '漏发赠品联系补发'],
  物流问题: ['物流信息五天不更新', '显示签收但根本没收到', '发货拖了四天才揽收'],
  服务类问题: ['客服已读不回问题没人管', '售后推诿让找平台', '处理态度敷衍拖了一周'],
  '价格/活动类问题': ['活动价比日常还贵', '优惠券下单用不了', '保价期内降价不给退差'],
  错发: ['收到的颜色和下单不一样', '发错型号完全用不了', '收到的是别人退回来的旧件'],
};

const reviewCache = new Map<string, OnlineReview[]>();

/** 平台商品ID：按编码+平台哈希确定性生成（同商品跨评价恒定） */
const goodsIdOf = (code: string, pl: Platform): string => {
  const h = [...(code + pl)].reduce((x, c) => (x * 31 + c.charCodeAt(0)) % 1000000007, 7);
  return String(100000000 + (h % 900000000));
};

/** 系列问题评价（抽屉评价场景）：条数按订单量确定性折算，问题类型按系列占比拆包 */
export const onlineReviewsOf = (s: QcCenterSeries): OnlineReview[] => {
  const cached = reviewCache.get(s.seriesCode);
  if (cached) return cached;
  const out: OnlineReview[] = [];
  if (s.orders > 0 && s.codes.length && s.platforms.length) {
    const rnd = mulberry32(Number(s.seriesCode.slice(3)) * 6151 + 53);
    const total = Math.max(4, Math.min(30, Math.round(s.orders * 0.00012)));
    const weights = s.problemHits.length ? s.problemHits : [{ type: QC_PROBLEM_TYPES[0], count: 1 }];
    const wSum = weights.reduce((sum, w) => sum + w.count, 0);
    const bag: string[] = [];
    let left = total;
    weights.forEach((w, i) => {
      const n = i === weights.length - 1 ? left : Math.min(left, Math.round((w.count / wSum) * total));
      left -= n;
      for (let k = 0; k < n; k++) bag.push(w.type);
    });
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    bag.forEach((t, i) => {
      const dd = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
      const hh = String(8 + Math.floor(rnd() * 13)).padStart(2, '0');
      const mm = String(Math.floor(rnd() * 60)).padStart(2, '0');
      const pool = REVIEW_PHRASES[t] || ['商品有问题体验很差'];
      const ss = subsOfType(t);
      out.push({
        id: `RV-${s.seriesCode.slice(3)}-${String(i + 1).padStart(3, '0')}`,
        code: s.codes[i % s.codes.length].code,
        platform: s.platforms[i % s.platforms.length],
        ptype: t,
        psub: ss.length ? ss[i % ss.length] : undefined,
        goodsId: goodsIdOf(s.codes[i % s.codes.length].code, s.platforms[i % s.platforms.length]),
        content: pool[i % pool.length],
        rating: 1 + Math.floor(rnd() * 2),
        reviewedAt: `2026-08-${dd} ${hh}:${mm}`,
      });
    });
  }
  reviewCache.set(s.seriesCode, out);
  return out;
};

/* ---------- 问题商品：编码维度垃圾品清单（按退款率 / 聊天风险率双序） ---------- */

export interface OnlineProblemCode { code: string; codeName: string; seriesCode: string; group: string; operator: string; orders: number; refundRate: number; afterSales: number; chatRate: number; status: string; }

let problemCache: OnlineProblemCode[] | null = null;

/** 问题商品全量（退款率 45%~52% 垃圾品口径，确定性生成 480 条） */
export const onlineProblemCodes = (): OnlineProblemCode[] => {
  if (problemCache) return problemCache;
  const rnd = mulberry32(8801);
  const rows: OnlineProblemCode[] = [];
  for (let i = 0; i < 480; i++) {
    const base = 1000 + Math.floor(rnd() * 240000);
    const code = `SP-${base}`;
    const seriesCode = `XL-${1001 + (base % (ONLINE_TOTAL - 1))}`;
    const refundRate = Math.round((0.52 - (i / 480) * 0.07 - rnd() * 0.002) * 1000) / 1000;
    const orders = 300 + Math.floor(rnd() * 1500);
    const afterSales = Math.max(3, Math.round(orders * (0.02 + rnd() * 0.03)));
    const o = onlineOwnerOf(seriesCode);
    rows.push({
      code,
      codeName: `${NAME_POOL[Math.floor(rnd() * NAME_POOL.length)]}${SPEC_POOL[Math.floor(rnd() * SPEC_POOL.length)] || ' 标准款'}`,
      seriesCode,
      group: o?.group ?? '—',
      operator: o?.operator ?? '—',
      orders,
      refundRate,
      afterSales,
      chatRate: 0.002 + rnd() * 0.02,
      status: '垃圾品',
    });
  }
  rows.sort((a, b) => b.refundRate - a.refundRate);
  problemCache = rows;
  return problemCache;
};

/* ---------- 命中问题管理：12 大类 / 31 小类（二级清单同步自《命中问题分类-维护表》） ---------- */

export interface OnlineHitSub { id: string; name: string; desc: string; keywords: string[]; depts: string[]; on: boolean; adder: string; addedAt: string; hits: number; }
export interface OnlineHitCat { name: string; desc: string; subs: OnlineHitSub[]; }

const HIT_CAT_DEF: { name: string; dept: string; subs: string[] }[] = [
  { name: '少发', dept: '仓库', subs: ['数量不足', '缺件漏发'] },
  { name: '错发', dept: '仓库', subs: ['型号错发', '颜色错发'] },
  { name: '包装破损', dept: '快递', subs: ['外箱破损', '内物污损', '缓冲缺失'] },
  { name: '质量问题', dept: '品质', subs: ['功能故障', '材质不符', '做工瑕疵', '异味问题', '尺寸偏差', '耐用性差'] },
  { name: '描述/宣传不符', dept: '运营', subs: ['功能宣传不符', '尺寸标注不符', '材质宣传不符'] },
  { name: '物流问题', dept: '快递', subs: ['时效超时', '轨迹不更新', '签收未收到'] },
  { name: '价格/活动类问题', dept: '运营', subs: ['活动价争议', '保价退差'] },
  { name: '服务类问题', dept: '客服', subs: ['响应超时', '推诿未处理', '态度敷衍'] },
  { name: '退换货类问题', dept: '客服', subs: ['退货拒收', '换货超时'] },
  { name: '安装/使用指导类问题', dept: '客服', subs: ['安装指导缺失', '使用说明不清'] },
  { name: '发票类问题', dept: '客服', subs: ['发票开具超时'] },
  { name: '快递指定/代收类问题', dept: '快递', subs: ['指定快递未履约', '代收点误签'] },
];

const HIT_KW: Record<string, string[]> = {
  少发类_数量不足: ['数量不够', '数量不足', '不够数', '数量少了', '没发够', '短少', '还差', '不够', '少了一件', '数目不对', '缺数量', '补数量'],
  少发类_缺件漏发: ['漏发', '少发', '缺件', '少件', '缺货', '只收到', '只有', '实际收到', '没发全', '差一件', '漏了', '缺配件'],
};

const HIT_ADDERS = ['系统同步', '王五', '李四', '赵六'];

/* 小类责任部门覆盖（可多部门共担）：默认随大类，个别小类按业务归口另配（大类卡标签＝小类责任部门去重汇总） */
const HIT_SUB_DEPT: Record<string, string[]> = {
  包装破损类_内物污损: ['品质', '仓库'],
  包装破损类_缓冲缺失: ['品质'],
  '描述/宣传不符类_材质宣传不符': ['品质', '运营'],
  退换货类问题类_退货拒收: ['仓库', '客服'],
  '安装/使用指导类问题类_使用说明不清': ['运营'],
};

let hitCache: OnlineHitCat[] | null = null;

/** 命中问题分类清单（大类下小类带关键词 / 责任部门 / 启停 / 添加信息） */
export const onlineHitCats = (): OnlineHitCat[] => {
  if (hitCache) return hitCache;
  const catCounts = { ...ONLINE_TYPE_COUNTS } as Record<string, number>;
  hitCache = HIT_CAT_DEF.map((c, ci) => {
    const total = catCounts[c.name] ?? 600 + ci * 37;
    const rnd = mulberry32(4300 + ci);
    const weights = c.subs.map(() => 0.5 + rnd());
    const wSum = weights.reduce((s, x) => s + x, 0);
    const subs: OnlineHitSub[] = c.subs.map((sub, si) => {
      const key = `${c.name}类_${sub}`;
      const kws = HIT_KW[key] ?? [sub, `${sub}怎么办`, `遇到${sub}`, sub.slice(0, 2), `${sub}处理`, sub.slice(-2), '要求处理', '投诉' + sub];
      return {
        id: `HS-${ci + 1}-${si + 1}`,
        name: sub,
        desc: `识别会话中客户描述与图片凭证，匹配「${sub}」特征即判定命中`,
        keywords: kws,
        depts: [...(HIT_SUB_DEPT[key] ?? [c.dept])],
        on: (ci + si) % 7 !== 1,
        adder: HIT_ADDERS[(ci + si) % HIT_ADDERS.length],
        addedAt: `2026/${String(1 + ((ci + si) % 8)).padStart(2, '0')}/${String(1 + ((ci * 3 + si * 5) % 27)).padStart(2, '0')} ${String(9 + ((ci + si) % 9)).padStart(2, '0')}:${String((si * 17 + ci * 7) % 60).padStart(2, '0')}:00`,
        hits: si === c.subs.length - 1 ? 0 : Math.round((weights[si] / wSum) * total),
      };
    });
    subs[subs.length - 1].hits = total - subs.reduce((s, x) => s + x.hits, 0);
    return { name: c.name, desc: `识别会话中客户描述与图片凭证，匹配「${c.name}」大类下任一子问题特征即判定命中`, subs };
  });
  return hitCache;
};

/* ---------- 权限管理：组织树 + 成员 ---------- */

export interface OnlineMember { name: string; status: '正常' | '冻结' | '未添加'; dept: string; roles: string[]; addedAt: string; }

export const ONLINE_ORG = [
  { name: '一级组织A', children: [{ name: '二级组织', children: ['三级组织'] }] },
  { name: '一级组织B', children: [{ name: '二级组织B', children: [] as string[] }] },
];

export const ONLINE_MEMBERS: OnlineMember[] = [
  { name: '张三', status: '正常', dept: '一级部门/二级部门', roles: ['组长', '角色C'], addedAt: '2026-02-18 12:00:00' },
  { name: '李四', status: '冻结', dept: '一级部门/二级部门', roles: ['专员'], addedAt: '2026-02-18 12:00:00' },
  { name: '王五', status: '未添加', dept: '-', roles: [], addedAt: '-' },
  { name: '赵六', status: '正常', dept: '二级部门/三级部门', roles: ['超级管理员'], addedAt: '2026-02-17 09:30:00' },
  { name: '黄亚芳', status: '正常', dept: '视频号/黄亚芳大组', roles: ['组长', '角色A'], addedAt: '2026-02-16 15:20:00' },
  { name: '孙倩', status: '正常', dept: '淘宝/绿佳华大组', roles: ['专员'], addedAt: '2026-02-15 11:10:00' },
  { name: '周杰', status: '冻结', dept: '拼多多/推广模版', roles: ['角色B'], addedAt: '2026-02-14 18:45:00' },
  { name: '吴敏', status: '正常', dept: '一级部门/二级部门', roles: ['只读成员'], addedAt: '2026-02-13 08:00:00' },
  { name: '徐佳华', status: '正常', dept: '江西南昌分公司/运营组', roles: ['组长'], addedAt: '2026-02-12 10:00:00' },
  { name: '郑婷', status: '正常', dept: '江西南昌分公司/运营组', roles: ['专员'], addedAt: '2026-02-12 09:30:00' },
  { name: '刘洋', status: '正常', dept: '江西南昌分公司/客服组', roles: ['专员'], addedAt: '2026-02-11 16:40:00' },
  { name: '陈晓', status: '正常', dept: '浙江杭州分公司', roles: [], addedAt: '2026-02-11 11:20:00' },
  { name: '杨帆', status: '正常', dept: '湖南长沙分公司/直播组', roles: ['专员'], addedAt: '2026-02-10 15:20:00' },
  { name: '何静', status: '正常', dept: '默认部门/子部门A', roles: [], addedAt: '2026-02-10 10:10:00' },
  { name: '罗彬', status: '正常', dept: '江西南昌分公司/客服组', roles: [], addedAt: '2026-02-09 14:25:00' },
  { name: '高翔', status: '正常', dept: '浙江杭州分公司', roles: [], addedAt: '2026-02-09 09:00:00' },
];

/* ---------- 权限管理 · 部门管理（线上版子页） ---------- */

export interface QcDeptMember { name: string; roles: string[]; adder: string; at: string; }

export const QC_PERM_DEPTS: { name: string; members: QcDeptMember[] }[] = [
  {
    name: '运维一组',
    members: [
      { name: '张三', roles: ['角色A', '角色B', '角色C', '角色D'], adder: '张三', at: '2026/02/18 12:00:00' },
      { name: '李四', roles: ['角色A', '角色B'], adder: '管理员', at: '2026/02/18 12:00:00' },
      { name: '李四', roles: ['角色A', '角色B'], adder: '管理员', at: '2026/02/18 12:00:00' },
      { name: '张三', roles: ['角色A', '角色B', '角色C', '角色D'], adder: '管理员', at: '2026/02/18 12:00:00' },
    ],
  },
  {
    name: '运维二组',
    members: [
      { name: '王五', roles: ['角色B'], adder: '张三', at: '2026/02/17 09:30:00' },
      { name: '赵六', roles: ['角色C'], adder: '管理员', at: '2026/02/17 09:30:00' },
    ],
  },
];

/* ---------- 权限管理 · 角色管理（线上版子页） ---------- */

export const QC_ROLE_GROUPS = ['运维一组', '运维二组', '运维三组'];
export const QC_ROLE_NAMES = ['超级管理员', '组长', '专员'];

export interface QcRoleMember { name: string; dept: string; adder: string; at: string; }

export const QC_ROLE_MEMBERS: QcRoleMember[] = [
  { name: '张三', dept: '浙江杭州分公司-IT部-项目组-产品组', adder: '18733748895', at: '2026/07/13 12:00:00' },
  { name: '李四', dept: '江西南昌分公司-运营组', adder: '18733748895', at: '2026/07/13 12:00:00' },
  { name: '王五', dept: '湖南长沙分公司-直播组', adder: '18733748895', at: '2026/07/13 12:00:00' },
];

/* ---------- 权限管理 · 权限配置矩阵（线上版子页） ---------- */

export const QC_PERM_OPTS = ['全部数据', '本级及下级部门', '本部门', '仅自己'];

export interface QcPermMenuRow { name: string; sub?: string; view: number | null; manage: number | null; funcs: string[]; }

export const QC_PERM_MENU: QcPermMenuRow[] = [
  { name: '数据概览', view: 0, manage: 0, funcs: [] },
  { name: '监控列表', view: 0, manage: 0, funcs: ['导出列表', '责任部门编辑'] },
  { name: '问题商品', view: 0, manage: 0, funcs: ['导出列表'] },
  { name: '标签配置', view: 0, manage: 0, funcs: ['新建标签', '编辑标签', '删除标签'] },
  { name: '权限管理', sub: '成员管理', view: 0, manage: 0, funcs: ['添加成员', '移除成员', '钉钉同步'] },
  { name: '权限管理', sub: '部门管理', view: 0, manage: 0, funcs: ['新建根部门', '添加下级部门', '编辑部门信息', '删除部门', '添加部门成员'] },
  { name: '权限管理', sub: '角色管理', view: null, manage: null, funcs: ['全部权限'] },
];
