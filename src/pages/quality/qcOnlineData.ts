/* =========================================================
   品控-线上（线上版复刻）· 独立数据层
   - 无商品标签维度：列表无标签筛选/标签列，抽屉无标签模块
   - 数据口径复刻线上截图：共 21,584 个系列 · 优化任务 0 条
   - 看板为固定口径（不随时间范围变化）；监控列表首页与线上截图一致，其余页确定性生成
   ========================================================= */
import { ref, shallowRef } from 'vue';
import { DATE_AXIS, PROBLEM_DEPT, QC_PLATFORMS, QC_PROBLEM_TYPES, type DateRange, type QcCenterCode, type QcCenterSeries, type QcPlatformStat, type RangeKey } from './qcCenterData';
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

/* 部门维度下问题类型分布固定口径（数据总览「部门」下拉筛选用）：每部门内八类型权重，
   取值合计恒等于该部门总量（ONLINE_DEPT_COUNTS），末位类型吸收取整差 */
const DEPT_TYPE_W: Record<string, number[]> = {
  品质: [0.62, 0.1, 0.1, 0.02, 0.02, 0.06, 0.02, 0.06],
  运营: [0.12, 0.44, 0.04, 0.02, 0.06, 0.22, 0.08, 0.02],
  仓库: [0.1, 0.02, 0.06, 0.44, 0.02, 0.04, 0.02, 0.3],
  快递: [0.04, 0.02, 0.42, 0.02, 0.44, 0.04, 0.01, 0.01],
  '快递/品质': [0.34, 0.02, 0.52, 0.02, 0.06, 0.02, 0.01, 0.01],
  客服: [0.1, 0.06, 0.02, 0.04, 0.06, 0.62, 0.06, 0.04],
};
export const ONLINE_DEPT_TYPE_COUNTS: Record<string, Record<string, number>> = (() => {
  const types = Object.keys(ONLINE_TYPE_COUNTS);
  const out: Record<string, Record<string, number>> = {};
  for (const [dept, total] of Object.entries(ONLINE_DEPT_COUNTS)) {
    const w = DEPT_TYPE_W[dept];
    const ws = w.reduce((s, x) => s + x, 0);
    const m: Record<string, number> = {};
    let acc = 0;
    types.forEach((t, i) => {
      const v = i === types.length - 1 ? total - acc : Math.round((total * w[i]) / ws);
      m[t] = v;
      acc += v;
    });
    out[dept] = m;
  }
  return out;
})();

/* ---------- 平台维度（数据总览「问题类型占比」头平台下拉筛选用） ---------- */
/** 各平台问题量占比：同一权重拆分全局类型量与部门类型量，平台间口径一致（合计 1.00） */
const PLAT_SHARE: Record<string, number> = {
  抖音: 0.34,
  拼多多: 0.22,
  快手: 0.16,
  淘宝: 0.13,
  天猫: 0.09,
  京东: 0.06,
};
/** 平台×问题类型：各类型按平台权重拆分，类型列合计恒等于 ONLINE_TYPE_COUNTS，末位平台吸收取整差 */
export const ONLINE_PLAT_TYPE_COUNTS: Record<string, Record<string, number>> = (() => {
  const types = Object.keys(ONLINE_TYPE_COUNTS);
  const plats = Object.keys(PLAT_SHARE);
  const out: Record<string, Record<string, number>> = {};
  for (const p of plats) out[p] = {};
  types.forEach((t) => {
    const total = ONLINE_TYPE_COUNTS[t];
    let acc = 0;
    plats.forEach((p, i) => {
      const v = i === plats.length - 1 ? total - acc : Math.round(total * PLAT_SHARE[p]);
      out[p][t] = v;
      acc += v;
    });
  });
  return out;
})();
/** 平台×部门×问题类型：部门类型量按同一平台权重拆分，部门类型列合计恒等于 ONLINE_DEPT_TYPE_COUNTS */
export const ONLINE_PLAT_DEPT_TYPE_COUNTS: Record<string, Record<string, Record<string, number>>> = (() => {
  const types = Object.keys(ONLINE_TYPE_COUNTS);
  const plats = Object.keys(PLAT_SHARE);
  const depts = Object.keys(ONLINE_DEPT_COUNTS);
  const out: Record<string, Record<string, Record<string, number>>> = {};
  for (const p of plats) {
    out[p] = {};
    for (const d of depts) out[p][d] = {};
  }
  types.forEach((t) => {
    for (const d of depts) {
      const total = ONLINE_DEPT_TYPE_COUNTS[d][t] ?? 0;
      let acc = 0;
      plats.forEach((p, i) => {
        const v = i === plats.length - 1 ? total - acc : Math.round(total * PLAT_SHARE[p]);
        out[p][d][t] = v;
        acc += v;
      });
    }
  });
  return out;
})();
/** 平台×部门合计：部门口径平台量（该平台各部门类型量之和），与部门×平台类型卡合计一致 */
export const ONLINE_PLAT_DEPT_COUNTS: Record<string, Record<string, number>> = (() => {
  const out: Record<string, Record<string, number>> = {};
  for (const [p, dm] of Object.entries(ONLINE_PLAT_DEPT_TYPE_COUNTS)) {
    out[p] = {};
    for (const [d, tm] of Object.entries(dm)) out[p][d] = Object.values(tm).reduce((s, x) => s + x, 0);
  }
  return out;
})();

/* 部门筛选口径（数据总览「部门」下拉）：部门只展示其负责的问题类型（PROBLEM_DEPT 精确归属），
   各类型值＝全局/平台类型量按该部门总量等比缩放，类型合计恒等于部门总量（与部门占比卡、环图中心一致） */
const scaleTo = (base: Record<string, number>, total: number): Record<string, number> => {
  const keys = Object.keys(base);
  const sum = keys.reduce((s, k) => s + base[k], 0);
  const out: Record<string, number> = {};
  if (!sum) { keys.forEach((k) => { out[k] = 0; }); return out; }
  let acc = 0;
  keys.forEach((k, i) => {
    const v = i === keys.length - 1 ? total - acc : Math.round((base[k] * total) / sum);
    out[k] = v;
    acc += v;
  });
  return out;
};
export const deptShareTypeCounts = (dept: string, plat = '全部平台'): Record<string, number> => {
  const owned = Object.keys(ONLINE_TYPE_COUNTS).filter((t) => PROBLEM_DEPT[t] === dept);
  const base: Record<string, number> = {};
  for (const t of owned) base[t] = plat === '全部平台' ? ONLINE_TYPE_COUNTS[t] : (ONLINE_PLAT_TYPE_COUNTS[plat]?.[t] ?? 0);
  const total = plat === '全部平台' ? (ONLINE_DEPT_COUNTS[dept] ?? 0) : (ONLINE_PLAT_DEPT_COUNTS[plat]?.[dept] ?? 0);
  return scaleTo(base, total);
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
/* ---------- 字段规范（品控-线上 mock 数据统一口径） ----------
   商品编码：字母+数字、固定 8 位（3 位大写字母 + '-' + 4 位数字，如 ABC-0001）；
   商品名称：16-20 字，界面超出以 … 截断展示；
   系列编码：4-7 个纯中文字（如 无痕挂钩）。 */
const codeLetters = (n: number): string => {
  let x = Math.abs(n) % 17576; /* 26^3 */
  let s = '';
  for (let i = 0; i < 3; i++) { s = String.fromCharCode(65 + (x % 26)) + s; x = Math.floor(x / 26); }
  return s;
};
export const mkProductCode = (seed: number, seq: number): string => `${codeLetters(seed)}-${String(seq).padStart(4, '0')}`;
const NAME_DESC = ['北欧简约', '多层抽屉式', '大容量', '加厚耐用', '家用客厅', '卧室收纳', '防潮防尘', '可折叠便携', '轻奢原木风', '免安装多功能'];
export const mkProductName = (base: string, seed: number): string => {
  const target = 16 + (Math.abs(seed) % 5); /* 16..20 */
  let s = base;
  let k = Math.abs(seed) % NAME_DESC.length;
  while (s.length < target) { s += NAME_DESC[k % NAME_DESC.length]; k++; }
  return s.slice(0, target);
};
/* SKU 名称规范：10-20 字；规格组合拼接版本/装规词后按目标长度截断 */
const SKU_DESC = ['标准版', '升级款', '礼盒装', '家庭装', '便携装', '加厚型', '轻量型', '经典款', '限定款', '组合装', '尊享版', '实用装'];
export const mkSkuName = (base: string, seed: number): string => {
  const target = 10 + (Math.abs(seed) % 11); /* 10..20 */
  let s = base;
  let k = Math.abs(seed) % SKU_DESC.length;
  while (s.length < target) { s += SKU_DESC[k % SKU_DESC.length]; k++; }
  return s.slice(0, target);
};
/* 系列编码＝商品系列简称（如 袜子、冬季手套）：前缀+品类词+规格后缀；XL-/SP- 为内部主键与商品编码，不作系列编码展示 */
const SERIES_PREFIX = ['冬季', '夏季', '加厚', '轻薄', '家用', '户外', '儿童', '创意'];

/** 首页固定行（与线上截图一致；平台枚举沿用原型六平台口径） */
const PAGE1: { name: string; orders: number; refundRate: number; afterSales: number; chatRiskHits: number; platforms: Platform[]; hits: [string, number][] }[] = [
  {
    name: '无痕粘钩', orders: 210242, refundRate: 0.029, afterSales: 6065, chatRiskHits: 93,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['质量问题', 14], ['服务类问题', 27], ['描述/宣传不符', 6], ['物流问题', 32], ['包装破损', 5], ['少发', 11], ['价格/活动类问题', 3], ['错发', 2]],
  },
  {
    name: '儿童图画本', orders: 199008, refundRate: 0.021, afterSales: 4105, chatRiskHits: 95,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['错发', 6], ['物流问题', 24], ['价格/活动类问题', 6], ['描述/宣传不符', 22], ['包装破损', 2], ['少发', 12], ['质量问题', 9], ['服务类问题', 4]],
  },
  {
    name: '强力大挂钩', orders: 160069, refundRate: 0.024, afterSales: 3871, chatRiskHits: 194,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['少发', 34], ['描述/宣传不符', 28], ['包装破损', 9], ['价格/活动类问题', 10], ['错发', 11], ['物流问题', 52], ['质量问题', 7], ['服务类问题', 5]],
  },
  {
    name: '赠品套装', orders: 126925, refundRate: 0.033, afterSales: 4183, chatRiskHits: 3,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['少发', 3], ['包装破损', 1]],
  },
  {
    name: '卷装姓名贴', orders: 116074, refundRate: 0.023, afterSales: 2687, chatRiskHits: 15,
    platforms: ['天猫', '拼多多', '抖音', '京东', '淘宝', '快手'],
    hits: [['服务类问题', 7], ['包装破损', 1], ['质量问题', 1], ['描述/宣传不符', 1], ['物流问题', 7]],
  },
  {
    name: '水龙头过滤棉', orders: 105520, refundRate: 0.028, afterSales: 2944, chatRiskHits: 66,
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
      code: mkProductCode(Number(seriesCode.slice(3)), i + 1),
      name: mkProductName(name, Number(seriesCode.slice(3)) * 3 + i),
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
    const name = `${SERIES_PREFIX[Math.floor(rnd() * SERIES_PREFIX.length)]}${NAME_POOL[Math.floor(rnd() * NAME_POOL.length)]}`;
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
    attrs.push({ name, ratio, refundRate, chatRiskHits, plats, hits, codeCount: 1 + Math.floor(rnd() * 2), w: 0.4 + rnd() });
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

/** 大类下二级子问题清单（与命中问题管理同源），供详情下钻按子问题过滤；系统兜底小类「其它」不参与下钻/指派 */
export const subsOfType = (t: string): string[] => onlineHitCats().find((c) => c.name === t)?.subs.filter((x) => !x.fixed).map((x) => x.name) ?? [];

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

/** 评价数据列口径：系列编码关联商品ID的评价；评价数按订单量确定性折算，
    差评数按系列差评率推算（差评=命中问题类型的负向评价），差评占比=差评数/评价数 */
export const onlineReviewBrief = (s: QcCenterSeries): { total: number; bad: number; rate: number } => {
  const h = Number(s.seriesCode.slice(3)) || 0;
  const total = s.orders > 0 ? Math.max(1, Math.round(s.orders * (0.02 + ((h * 37) % 31) / 1000))) : 0;
  const bad = total ? Math.round(total * (0.01 + ((h * 53) % 50) / 1000)) : 0;
  return { total, bad, rate: total ? bad / total : 0 };
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
  /** 客服处理打标（取值＝问题小类词表；仅有关联会话的售后单才有） */
  csTag?: string;
  /** 售后起因会话（存在时会话卡右侧展示关联售后） */
  sessionId?: string;
}
export const AFTER_TYPES = ['退货退款/退款', '换货', '补发'];
export const AFTER_STATUSES: AfterOrderStatus[] = ['已处理', '已拒绝', '待处理'];
/** 售后单平台轮转序（对齐线上：拼多多起、天猫收尾） */
export const AFTER_PLATFORMS: Platform[] = ['拼多多', '抖音', '京东', '淘宝', '快手', '天猫'];
/** 售后类型组合口径（数据概览「换货/补发」卡与列表筛选同源） */
export const AFTER_TYPE_EXCH_RESHIP = '换货/补发';
/** 数据概览售后数据卡跳转售后列表的预选筛选；消费后即清空，避免侧栏直达误带筛选 */
export interface AfterJump { type?: string; status?: string }
export const afterJumpSeed = shallowRef<AfterJump | null>(null);
const AFTER_REASONS: Record<string, string[]> = {
  '退货退款/退款': [
    '质量问题',
    '商品与描述不符',
    '尺码不合适',
    '材质与描述不符',
    '不想要了/七天无理由',
    '收到后用不到两天粘胶面就起边脱胶，跟客服承诺的完全不一样，页面标注的尺寸也和实物对不上，要求全额退款并补偿寄回运费，希望尽快处理',
    '开箱后有明显刺鼻异味，晾了三天散不掉，家里老人小孩用了都过敏，不敢继续用，申请退货退款并要求商家提供材质检测说明',
  ],
  换货: [
    '尺码不合适',
    '颜色与描述不符',
    '配件缺失',
    '收到的实物比下单规格大一号，安装孔位对不上没法上墙，已跟客服确认过批次发错，申请换回正确规格并承担来回寄送的运费',
  ],
  补发: [
    '少件漏发',
    '外包装破损补发',
    '运输途中外箱被压变形开裂，开箱清点后发现底座和螺丝包两件配件缺失，商品主体暂无损坏，申请尽快补发缺失配件并告知补发单号',
  ],
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
    /* 客服打标仅有关联会话的售后单才有（取同大类小类词表、与命中小类错位一轮） */
    const ss = subsOfType(o.ptype);
    if (ss.length) o.csTag = ss[(i + 1) % ss.length];
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
  /** 是否有会话：全部/有会话/无会话（售后单是否由会话发起） */
  sess: string;
  /** 问题大类（未选小类时按大类口径过滤） */
  ptype: string | null;
  sub: string | null;
  /** 责任部门：'全部部门' 或部门名（按问题小类责任部门是否包含过滤，共担小类多部门均命中） */
  dept: string;
  from: string;
  to: string;
}
/** 页面行 = 售后单 + 系列/归属上下文 */
export type AfterOrderRow = OnlineAfterOrder & { seriesCode: string; seriesName: string; group: string; operator: string };
/** 概览聚合项：label 计数 */
export interface AfterOvEntry { label: string; count: number }
/** 概览口径聚合（与列表查询条件同口径，扫描时一并累计，避免二次全量遍历） */
export interface AfterOv {
  /** 关联会话单量（由会话发起的售后单） */
  sess: number;
  /** 风险会话单量（关联会话中命中问题者，同数据概览问题会话口径：会话索引 i%3<=1） */
  riskSess: number;
  /** 平台分布（AFTER_PLATFORMS 序） */
  plats: AfterOvEntry[];
  /** 售后类型分布（AFTER_TYPES 序） */
  types: AfterOvEntry[];
  /** 问题小类分布（按单量降序） */
  psubs: AfterOvEntry[];
  /** 问题大类分布（ONLINE_TYPE_COUNTS 序） */
  pcats: AfterOvEntry[];
  /** 组别 / 运维分布（按单量降序） */
  groups: AfterOvEntry[];
  /** 申请时间趋势（按日升序） */
  days: AfterOvEntry[];
  /** 售后时间趋势分平台（key=平台名，值按日升序），供趋势平台维度切换 */
  pdays: Record<string, AfterOvEntry[]>;
  /** 售后时间趋势分售后类型（key=售后类型名，值按日升序），供趋势售后类型维度切换 */
  tdays: Record<string, AfterOvEntry[]>;
  /** 售后时间趋势分问题类型（key=问题大类名，值按日升序），供趋势问题类型维度切换 */
  qdays: Record<string, AfterOvEntry[]>;
}
export interface AfterScan {
  total: number;
  /** 每系列命中数（分页切片按累计区间回生成） */
  cum: { code: string; count: number }[];
  ov: AfterOv;
}
const matchAfter = (o: OnlineAfterOrder, f: AfterOrderQuery, seriesCode: string, seriesName: string): boolean => {
  if (f.type !== '全部类型') {
    const hit = f.type === AFTER_TYPE_EXCH_RESHIP ? (o.type === '换货' || o.type === '补发') : o.type === f.type;
    if (!hit) return false;
  }
  if (f.platform !== '全部平台' && o.platform !== f.platform) return false;
  if (f.status !== '全部状态' && o.status !== f.status) return false;
  if (f.sess === '有会话' && !o.sessionId) return false;
  if (f.sess === '无会话' && o.sessionId) return false;
  if (f.sub) { if (o.psub !== f.sub) return false; }
  else if (f.ptype && o.ptype !== f.ptype) return false;
  if (f.dept && f.dept !== '全部部门' && !hitSubDepts(o.psub ?? '').includes(f.dept)) return false;
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
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const plats = new Map<string, number>();
  const types = new Map<string, number>();
  const psubs = new Map<string, number>();
  const pcats = new Map<string, number>();
  const groups = new Map<string, number>();
  const days = new Map<string, number>();
  /* 分维度按日序列（平台/售后类型/问题类型），趋势切换共用单趟累计 */
  const pdays = new Map<string, Map<string, number>>();
  const tdays = new Map<string, Map<string, number>>();
  const qdays = new Map<string, Map<string, number>>();
  const bumpDay = (m: Map<string, Map<string, number>>, k: string, day: string) => {
    let dm = m.get(k);
    if (!dm) { dm = new Map<string, number>(); m.set(k, dm); }
    bump(dm, day);
  };
  let total = 0;
  let sess = 0;
  let riskSess = 0;
  for (const s of onlineSeries()) {
    const ow = onlineOwnerOf(s.seriesCode);
    const g = ow?.group ?? '—';
    const op = ow?.operator ?? '—';
    if (f.group !== '全部组别' && g !== f.group) continue;
    if (f.operator !== '全部运维' && op !== f.operator) continue;
    const gLabel = g === '—' ? '未归属' : `${g} / ${op}`;
    let c = 0;
    let probIds: Set<string> | null = null;
    for (const o of genAfterOrders(s)) {
      if (!matchAfter(o, f, s.seriesCode, s.name)) continue;
      c += 1;
      if (o.sessionId) {
        sess += 1;
        if (!probIds) probIds = new Set(onlineSessionsOf(s).filter((_, i) => i % 3 <= 1).map((x) => x.id));
        if (probIds.has(o.sessionId)) riskSess += 1;
      }
      bump(plats, o.platform);
      bump(types, o.type);
      bump(psubs, o.psub || o.ptype);
      bump(pcats, o.ptype);
      bump(groups, gLabel);
      const day = o.appliedAt.slice(0, 10);
      bump(days, day);
      bumpDay(pdays, o.platform, day);
      bumpDay(tdays, o.type, day);
      bumpDay(qdays, o.ptype, day);
    }
    if (c) { total += c; cum.push({ code: s.seriesCode, count: c }); }
  }
  const desc = (m: Map<string, number>): AfterOvEntry[] => [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1));
  const ordered = (m: Map<string, number>, seq: readonly string[]): AfterOvEntry[] => desc(m)
    .sort((a, b) => seq.indexOf(a.label) - seq.indexOf(b.label));
  const daysList = [...days.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => (a.label < b.label ? -1 : 1));
  /* 问题大类按数据总览同序（ONLINE_TYPE_COUNTS 插入序），未收录大类排末位 */
  const catSeq = Object.keys(ONLINE_TYPE_COUNTS);
  const catIdx = (l: string) => { const i = catSeq.indexOf(l); return i < 0 ? catSeq.length : i; };
  /* 分维度按日序列出参：每维度值按日升序 */
  const daysBy = (m: Map<string, Map<string, number>>): Record<string, AfterOvEntry[]> => Object.fromEntries(
    [...m.entries()].map(([k, dm]) => [k, [...dm.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => (a.label < b.label ? -1 : 1))]),
  );
  return {
    total,
    cum,
    ov: {
      sess,
      riskSess,
      plats: ordered(plats, AFTER_PLATFORMS),
      types: ordered(types, AFTER_TYPES),
      psubs: desc(psubs),
      pcats: desc(pcats).sort((a, b) => catIdx(a.label) - catIdx(b.label)),
      groups: desc(groups),
      days: daysList,
      pdays: daysBy(pdays),
      tdays: daysBy(tdays),
      qdays: daysBy(qdays),
    },
  };
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
export const EVIDENCE_END = '2026-08-28';
export const EVIDENCE_START = '2026-08-01';
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
  /** 问题大类；「未命中」= 非差评（未命中任何问题类型） */
  ptype: string;
  /** 关联问题类型小类（评价场景按小类快速筛选） */
  psub?: string;
  /** 平台商品ID（同编码同平台恒定，评价行展示） */
  goodsId: string;
  content: string;
  rating: number;
  reviewedAt: string;
  /** 评价晒图（materials 素材，确定性挂载，部分评价带图） */
  images?: string[];
  /** 评价视频封面（有值即带视频，行内展示播放角标） */
  videoPoster?: string;
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

/** 非差评（未命中任何问题类型）的类型名：评价场景大类列置于「全部」之后 */
export const REVIEW_MISS_TYPE = '未命中';
const REVIEW_GOOD_PHRASES = ['质量不错做工也细致', '和描述一致用着挺顺手', '发货快包装严实没磕碰', '客服回复及时处理也利落', '回购第二次了体验一直稳定'];

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
    /* 非差评混入明细：未命中任何问题类型，与问题评价同列展示 */
    const missCount = Math.max(2, Math.round(total * 0.6));
    for (let k = 0; k < missCount; k++) bag.push(REVIEW_MISS_TYPE);
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    bag.forEach((t, i) => {
      const miss = t === REVIEW_MISS_TYPE;
      const dd = String(1 + Math.floor(rnd() * 28)).padStart(2, '0');
      const hh = String(8 + Math.floor(rnd() * 13)).padStart(2, '0');
      const mm = String(Math.floor(rnd() * 60)).padStart(2, '0');
      const pool = miss ? REVIEW_GOOD_PHRASES : REVIEW_PHRASES[t] || ['商品有问题体验很差'];
      const ss = miss ? [] : subsOfType(t);
      /* 评价晒图/视频：确定性挂载 materials 素材，约半数评价带媒体，其中三成带视频封面 */
      const imgBase = i % 24;
      const ecImg = (k: number) => `/materials/ec-${String(1 + ((imgBase + k) % 24)).padStart(2, '0')}.webp`;
      const hasMedia = rnd() < 0.55;
      const isVideo = hasMedia && rnd() < 0.3;
      const imgCount = hasMedia && !isVideo ? 1 + Math.floor(rnd() * 3) : 0;
      out.push({
        id: `RV-${s.seriesCode.slice(3)}-${String(i + 1).padStart(3, '0')}`,
        code: s.codes[i % s.codes.length].code,
        platform: s.platforms[i % s.platforms.length],
        ptype: t,
        psub: ss.length ? ss[i % ss.length] : undefined,
        goodsId: goodsIdOf(s.codes[i % s.codes.length].code, s.platforms[i % s.platforms.length]),
        content: pool[i % pool.length],
        rating: miss ? 4 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 2),
        reviewedAt: `2026-08-${dd} ${hh}:${mm}`,
        images: imgCount ? Array.from({ length: imgCount }, (_, k) => ecImg(k)) : undefined,
        videoPoster: isVideo ? ecImg(0) : undefined,
      });
    });
  }
  reviewCache.set(s.seriesCode, out);
  return out;
};

/* ---------- 首页售后/评价模块：系列维度聚合（与逐单生成口径一致，避免逐单物化） ---------- */
export interface OnlineSceneBrief {
  total: number;
  types: Record<string, number>;
  platforms: Record<string, number>;
  statuses: Record<string, number>;
}
const cycleCounts = (total: number, len: number, k: number) => (k < total ? Math.floor((total - k + len - 1) / len) : 0);
let afterBrief: OnlineSceneBrief | null = null;
export const onlineAfterBrief = (): OnlineSceneBrief => {
  if (afterBrief) return afterBrief;
  const b: OnlineSceneBrief = { total: 0, types: {}, platforms: {}, statuses: {} };
  onlineSeries().forEach((s) => {
    const total = s.afterSales;
    if (!total) return;
    b.total += total;
    const refund = Math.round(total * 0.5238);
    const exchange = Math.round(total * 0.2981);
    b.types[AFTER_TYPES[0]] = (b.types[AFTER_TYPES[0]] ?? 0) + refund;
    b.types[AFTER_TYPES[1]] = (b.types[AFTER_TYPES[1]] ?? 0) + exchange;
    b.types[AFTER_TYPES[2]] = (b.types[AFTER_TYPES[2]] ?? 0) + (total - refund - exchange);
    AFTER_PLATFORMS.forEach((p, k) => {
      const c = cycleCounts(total, AFTER_PLATFORMS.length, k);
      if (c) b.platforms[p] = (b.platforms[p] ?? 0) + c;
    });
    AFTER_STATUSES.forEach((st, k) => {
      const c = cycleCounts(total, AFTER_STATUSES.length, k);
      if (c) b.statuses[st] = (b.statuses[st] ?? 0) + c;
    });
  });
  afterBrief = b;
  return b;
};

/** 首页售后模块：关联会话数量（订单发生退换货时是否存在会话）
    口径：会话按命中打包，约四成会话（索引 i%5<=1）由售后起因并挂链；
    挂链数按各系列售后类型占比分摊到「退货退款/仅退款」与「换货/补发」两组。
    仅用系列级聚合量确定性推算，避免物化 2 万余系列逐单。 */
let afterSessionBrief: { sessions: number; refund: number; exchReship: number; probSessions: number; probRefund: number; probExchReship: number } | null = null;
export const onlineAfterSessionBrief = (): { sessions: number; refund: number; exchReship: number; probSessions: number; probRefund: number; probExchReship: number } => {
  if (afterSessionBrief) return afterSessionBrief;
  let sessions = 0;
  let refund = 0;
  let exchReship = 0;
  let probSessions = 0;
  let probRefund = 0;
  let probExchReship = 0;
  onlineSeries().forEach((s) => {
    const total = s.afterSales;
    if (!total) return;
    const L = s.chatRiskHits > 0 && s.codes.length && s.platforms.length
      ? Math.max(1, Math.min(12, Math.ceil(s.chatRiskHits / 6)))
      : 0;
    if (!L) return;
    sessions += L;
    /* 约四成会话（索引 i%5<=1）由售后起因并挂链；按本系列售后类型占比分摊到各类型组 */
    const cand = 2 * Math.floor(L / 5) + Math.min(2, L % 5);
    const linked = Math.min(cand, total);
    const rf = Math.round(total * 0.5238);
    const toRf = Math.round((linked * rf) / total);
    refund += toRf;
    exchReship += linked - toRf;
    /* 问题会话数口径：关联会话中约三分之二（索引 i%3<=1）同时命中问题；
       类型组按与挂链数相同的退款占比拆分，保证问题会话数恒不大于关联会话数 */
    probSessions += 2 * Math.floor(L / 3) + Math.min(2, L % 3);
    const probLinked = 2 * Math.floor(linked / 3) + Math.min(2, linked % 3);
    const toRfProb = Math.round((probLinked * rf) / total);
    probRefund += toRfProb;
    probExchReship += probLinked - toRfProb;
  });
  afterSessionBrief = { sessions, refund, exchReship, probSessions, probRefund, probExchReship };
  return afterSessionBrief;
};

/* ---------- 问题商品：编码维度垃圾品清单（按退款率 / 聊天风险率双序） ----------
   取消命中 / 标记问题商品：商品编码级会话态；取消后不再计入命中问题商品，标记后无命中也保留标识，
   系列首列问题编码标识、监控列表筛选、问题商品清单与首页 TOP 问题商品同源重判 */

export interface OnlineProblemCode { code: string; codeName: string; seriesCode: string; group: string; operator: string; orders: number; refundRate: number; afterSales: number; chatRate: number; status: string; }

const hitCanceled = shallowRef<Set<string>>(new Set());
export const isHitCanceled = (code: string) => hitCanceled.value.has(code);
export const cancelHitCodes = (codes: string[]) => {
  if (!codes.length) return;
  hitCanceled.value = new Set([...hitCanceled.value, ...codes]);
};

/* 标记问题商品：会话态标记，支持三种粒度——
   ① 系列编码级（scope=series，整系列为问题编码）；② 商品编码级（scope=code，单个关联ID）；
   ③ 平台内（任一粒度附 platforms，仅这些平台内为问题编码；platforms 空=全平台）。
   人工标记后即使无问题命中也保留问题编码标识（与取消命中互不覆盖，取消命中的编码不入标识） */
export interface ProblemMark { scope: 'series' | 'code'; seriesCode: string; code?: string; platforms: Platform[]; }
const problemMarks = shallowRef<ProblemMark[]>([]);

/** 标记生效平台归并：'all'=全平台；数组=仅这些平台；null=未标记 */
const mergePlats = (ms: ProblemMark[]): Platform[] | 'all' | null => {
  if (!ms.length) return null;
  if (ms.some((m) => !m.platforms.length)) return 'all';
  return [...new Set(ms.flatMap((m) => m.platforms))];
};
/** 系列级（整系列）标记生效平台 */
export const seriesMarkPlatforms = (seriesCode: string): Platform[] | 'all' | null =>
  mergePlats(problemMarks.value.filter((m) => m.scope === 'series' && m.seriesCode === seriesCode));
/** 商品编码级标记生效平台（含其所属系列的整系列标记） */
export const codeMarkPlatforms = (seriesCode: string, code: string): Platform[] | 'all' | null =>
  mergePlats(problemMarks.value.filter((m) => m.seriesCode === seriesCode && (m.scope === 'series' || m.code === code)));
/** 商品编码级标记生效平台（不含整系列标记，供弹窗逐编码勾选回显） */
export const codeOwnMarkPlatforms = (seriesCode: string, code: string): Platform[] | 'all' | null =>
  mergePlats(problemMarks.value.filter((m) => m.scope === 'code' && m.seriesCode === seriesCode && m.code === code));
/** 某商品编码是否被标记：platform 缺省=任意平台标记即算；给定=仅当该平台的标记生效 */
export const isProblemMarked = (seriesCode: string, code: string, platform?: Platform): boolean => {
  const p = codeMarkPlatforms(seriesCode, code);
  if (p === null) return false;
  if (p === 'all') return true;
  return platform ? p.includes(platform) : true;
};
/** 整系列替换标记（弹窗确认时一次性写入该系列全部粒度标记） */
export const setSeriesProblemMarks = (seriesCode: string, marks: ProblemMark[]) => {
  problemMarks.value = [...problemMarks.value.filter((m) => m.seriesCode !== seriesCode), ...marks];
};

/** 系列下计入问题编码的商品编码（问题命中 > 0 或人工标记，且未取消命中）；
    platform 给定时命中按该编码在售平台收敛、标记按平台内口径收敛 */
export const seriesProblemCodes = (s: QcCenterSeries, platform?: Platform) => s.codes.filter((c) => {
  if (hitCanceled.value.has(c.code)) return false;
  const hit = (!platform || c.platforms.some((p) => p.platform === platform)) && c.problemHits.some((h) => h.count > 0);
  return hit || isProblemMarked(s.seriesCode, c.code, platform);
});

/* ---------- 问题来源（问题小类的标记来源）：客服打标＝会话挂链售后单的客服处理打标；系统稽查＝系统命中 ---------- */
const subCatCache = new Map<string, string>();
const catOfSub = (sub: string): string => {
  const hit = subCatCache.get(sub);
  if (hit !== undefined) return hit;
  const cat = onlineHitCats().find((c) => c.subs.some((x) => x.name === sub));
  const name = cat ? cat.name : '';
  subCatCache.set(sub, name);
  return name;
};
const csHitCache = new Map<string, { type: string; count: number }[]>();
/** 编码的客服打标命中：本编码会话的客服打标小类归大类计数（无打标＝空数组） */
export const codeCsHits = (code: string): { type: string; count: number }[] => {
  const hit = csHitCache.get(code);
  if (hit) return hit;
  const s = onlineSeriesOfCode(code);
  const out: { type: string; count: number }[] = [];
  if (s) {
    const tagBySess = new Map<string, string>();
    onlineAfterOrdersOf(s).forEach((o) => { if (o.sessionId && o.csTag) tagBySess.set(o.sessionId, o.csTag); });
    const m = new Map<string, number>();
    onlineSessionsOf(s).forEach((x) => {
      if (x.code !== code) return;
      const tag = tagBySess.get(x.id);
      if (!tag) return;
      const cat = catOfSub(tag);
      if (cat) m.set(cat, (m.get(cat) ?? 0) + 1);
    });
    out.push(...[...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count));
  }
  csHitCache.set(code, out);
  return out;
};

let problemCache: OnlineProblemCode[] | null = null;

/** 问题商品全量（退款率 45%~52% 垃圾品口径，确定性生成 480 条；已取消命中的编码不再入清单） */
export const onlineProblemCodes = (): OnlineProblemCode[] => {
  if (!problemCache) problemCache = buildProblemCodes();
  return problemCache.filter((r) => !hitCanceled.value.has(r.code));
};
const buildProblemCodes = (): OnlineProblemCode[] => {
  const rnd = mulberry32(8801);
  const rows: OnlineProblemCode[] = [];
  for (let i = 0; i < 480; i++) {
    const base = 1000 + Math.floor(rnd() * 240000);
    const code = mkProductCode(base, i + 1);
    const seriesCode = `XL-${1001 + (base % (ONLINE_TOTAL - 1))}`;
    const refundRate = Math.round((0.52 - (i / 480) * 0.07 - rnd() * 0.002) * 1000) / 1000;
    const orders = 300 + Math.floor(rnd() * 1500);
    const afterSales = Math.max(3, Math.round(orders * (0.02 + rnd() * 0.03)));
    const o = onlineOwnerOf(seriesCode);
    rows.push({
      code,
      codeName: mkProductName(NAME_POOL[Math.floor(rnd() * NAME_POOL.length)], base + i),
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

export interface OnlineHitSub { id: string; name: string; desc: string; keywords: string[]; depts: string[]; on: boolean; adder: string; addedAt: string; hits: number; fixed?: boolean; /** 稽查数据类型（参与命中分析的数据源，未选=不参与；缺省=全部三类） */ auditSources?: string[]; }
export interface OnlineHitCat { name: string; desc: string; subs: OnlineHitSub[]; }

/* 大类/小类＝各部门应关注问题口径（2026-10-14 按部门×数据来源补全）：小类责任部门见 HIT_SUB_DEPT、参与分析的数据源见 HIT_SUB_AUDIT（聊天记录=客服会话／售后原因=售后单／评价数据=商品评价） */
export const HIT_CAT_DEF: { name: string; dept: string; subs: string[] }[] = [
  { name: '少发', dept: '仓库', subs: ['数量不足', '缺件漏发', '赠品漏发'] },
  { name: '错发', dept: '仓库', subs: ['型号错发', '颜色错发', '版本错发'] },
  { name: '包装破损', dept: '快递', subs: ['外箱破损', '内物污损', '缓冲缺失', '封箱开裂'] },
  { name: '质量问题', dept: '品质', subs: ['功能故障', '材质不符', '做工瑕疵', '异味问题', '尺寸偏差', '耐用性差', '安全风险', '配件易损'] },
  { name: '描述/宣传不符', dept: '运营', subs: ['功能宣传不符', '尺寸标注不符', '材质宣传不符', '赠品宣传不符'] },
  { name: '物流问题', dept: '快递', subs: ['时效超时', '轨迹不更新', '签收未收到', '派送超时', '运输丢失'] },
  { name: '价格/活动类问题', dept: '运营', subs: ['活动价争议', '保价退差', '优惠券无法使用', '满减未生效'] },
  { name: '服务类问题', dept: '客服', subs: ['响应超时', '推诿未处理', '态度敷衍', '承诺未履约'] },
  { name: '退换货类问题', dept: '客服', subs: ['退货拒收', '换货超时', '退款到账超时'] },
  { name: '安装/使用指导类问题', dept: '客服', subs: ['安装指导缺失', '使用说明不清'] },
  { name: '发票类问题', dept: '客服', subs: ['发票开具超时'] },
  { name: '快递指定/代收类问题', dept: '快递', subs: ['指定快递未履约', '代收点误签', '未经同意放代收'] },
];

const HIT_KW: Record<string, string[]> = {
  少发类_数量不足: ['数量不够', '数量不足', '不够数', '数量少了', '没发够', '短少', '还差', '不够', '少了一件', '数目不对', '缺数量', '补数量'],
  少发类_缺件漏发: ['漏发', '少发', '缺件', '少件', '缺货', '只收到', '只有', '实际收到', '没发全', '差一件', '漏了', '缺配件'],
  少发类_赠品漏发: ['赠品没发', '赠品漏发', '没有赠品', '赠品少了', '说好的赠品', '赠品没收到', '缺赠品'],
  错发类_版本错发: ['发错版本', '版本不对', '型号版本不符', '旧版', '发的版本', '版本错了', '不是这个版本'],
  包装破损类_封箱开裂: ['箱子开裂', '封箱开了', '胶带开了', '箱口敞开', '开胶', '封口裂开', '箱子炸开'],
  质量问题类_安全风险: ['漏电', '扎手', '割伤', '尖锐', '安全隐患', '不安全', '刺手', '带电', '烧焦味'],
  质量问题类_配件易损: ['配件坏了', '配件易损', '小件容易坏', '配件断了', '配件松动', '配件质量差'],
  '描述/宣传不符类_赠品宣传不符': ['赠品不一样', '赠品和页面不符', '宣传的赠品', '赠品不对', '页面说送', '赠品与描述不符'],
  物流问题类_派送超时: ['派送慢', '派送超时', '一直派送中', '快递员没送', '不派送', '派送好几天', '派送异常', '末端派送慢'],
  物流问题类_运输丢失: ['包裹丢了', '丢件', '快递丢失', '件丢了', '物流说丢了', '没收到包裹', '丢包裹', '运输途中丢失'],
  '价格/活动类问题类_优惠券无法使用': ['优惠券用不了', '券无法使用', '用不了券', '优惠券失效', '券不让用', '领的券用不到'],
  '价格/活动类问题类_满减未生效': ['满减没生效', '满减不对', '没减钱', '满减未生效', '凑单没减', '活动价没算上'],
  服务类问题类_承诺未履约: ['承诺没做到', '说好的补偿', '答应回电', '承诺未兑现', '说话不算', '约定的处理没做'],
  退换货类问题类_退款到账超时: ['退款没到账', '退款太慢', '钱没退回来', '退款超时', '多久退到账', '退款迟迟不到'],
  '快递指定/代收类问题类_未经同意放代收': ['没同意放驿站', '擅自放代收', '未经同意放快递柜', '没通知我放代收', '直接放驿站', '没问我就放代收点'],
};

const HIT_ADDERS = ['系统同步', '王五', '李四', '赵六'];

/* 小类责任部门覆盖（可多部门共担）：默认随大类，个别小类按业务归口另配（大类卡标签＝小类责任部门去重汇总）；
   2026-10-14 补：运输/封箱类破损归口快递/品质共担，与数据层 PROBLEM_DEPT「包装破损→快递/品质」同口径 */
const HIT_SUB_DEPT: Record<string, string[]> = {
  包装破损类_内物污损: ['品质', '仓库'],
  包装破损类_缓冲缺失: ['品质'],
  包装破损类_外箱破损: ['快递', '快递/品质'],
  包装破损类_封箱开裂: ['快递/品质'],
  '描述/宣传不符类_材质宣传不符': ['品质', '运营'],
  退换货类问题类_退货拒收: ['仓库', '客服'],
  '安装/使用指导类问题类_使用说明不清': ['运营'],
  物流问题类_运输丢失: ['快递', '快递/品质'],
};

/* 小类参与命中分析的数据源（稽查数据类型）：聊天记录=客服会话、售后原因=售后单、评价数据=商品评价；
   未收录小类缺省=三类全参与。按部门关注点与数据来源可得性配置（服务承诺/发票类仅会话可得，退款/丢件类以售后单为主） */
const HIT_SUB_AUDIT: Record<string, string[]> = {
  少发类_赠品漏发: ['售后原因', '聊天记录'],
  错发类_版本错发: ['售后原因', '聊天记录', '评价数据'],
  包装破损类_封箱开裂: ['售后原因', '评价数据', '聊天记录'],
  质量问题类_安全风险: ['评价数据', '售后原因', '聊天记录'],
  质量问题类_配件易损: ['评价数据', '聊天记录'],
  '描述/宣传不符类_赠品宣传不符': ['聊天记录', '评价数据'],
  物流问题类_派送超时: ['聊天记录', '售后原因'],
  物流问题类_运输丢失: ['售后原因', '聊天记录'],
  '价格/活动类问题类_优惠券无法使用': ['聊天记录'],
  '价格/活动类问题类_满减未生效': ['聊天记录', '售后原因'],
  服务类问题类_响应超时: ['聊天记录', '评价数据'],
  服务类问题类_推诿未处理: ['聊天记录'],
  服务类问题类_态度敷衍: ['聊天记录', '评价数据'],
  服务类问题类_承诺未履约: ['聊天记录'],
  退换货类问题类_退款到账超时: ['售后原因', '聊天记录'],
  '安装/使用指导类问题类_安装指导缺失': ['聊天记录'],
  '安装/使用指导类问题类_使用说明不清': ['聊天记录', '评价数据'],
  发票类问题类_发票开具超时: ['聊天记录'],
  '快递指定/代收类问题类_未经同意放代收': ['聊天记录', '评价数据'],
};

let hitCache: OnlineHitCat[] | null = null;

/** 命中问题分类清单（大类下小类带关键词 / 责任部门 / 启停 / 添加信息） */
export const onlineHitCats = (): OnlineHitCat[] => {
  if (hitCache) return hitCache;
  const catCounts = { ...ONLINE_TYPE_COUNTS } as Record<string, number>;
  hitCache = HIT_CAT_DEF.map((c, ci) => {
    const total = catCounts[c.name] ?? 600 + ci * 37;
    const rnd = mulberry32(4300 + ci);
    /* 系统兜底小类「其它」吸收命中大类但未命中任一可配置小类的差值；可配置小类拆分余下命中 */
    const otherHits = Math.round(total * (0.06 + rnd() * 0.08));
    const subTotal = total - otherHits;
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
        auditSources: HIT_SUB_AUDIT[key] ? [...HIT_SUB_AUDIT[key]] : undefined,
        on: (ci + si) % 7 !== 1,
        adder: HIT_ADDERS[(ci + si) % HIT_ADDERS.length],
        addedAt: `2026/${String(1 + ((ci + si) % 8)).padStart(2, '0')}/${String(1 + ((ci * 3 + si * 5) % 27)).padStart(2, '0')} ${String(9 + ((ci + si) % 9)).padStart(2, '0')}:${String((si * 17 + ci * 7) % 60).padStart(2, '0')}:00`,
        hits: si === c.subs.length - 1 ? 0 : Math.round((weights[si] / wSum) * subTotal),
      };
    });
    if (subs.length) subs[subs.length - 1].hits = subTotal - subs.reduce((s, x) => s + x.hits, 0);
    subs.push({
      id: `HS-${ci + 1}-0`,
      name: '其它',
      desc: `命中「${c.name}」大类但未命中其下任一子问题的会话归入本小类`,
      keywords: [],
      depts: [c.dept],
      on: true,
      adder: '系统同步',
      addedAt: '2026-01-01 09:00:00',
      hits: otherHits,
      fixed: true,
    });
    return { name: c.name, desc: `识别会话中客户描述与图片凭证，匹配「${c.name}」大类下任一子问题特征即判定命中`, subs };
  });
  return hitCache;
};

/** 问题小类 → 责任部门清单（默认随大类、个别覆盖可多部门共担；未收录小类返回空） */
export const hitSubDepts = (sub: string): string[] => {
  for (const c of onlineHitCats()) {
    const s = c.subs.find((x) => x.name === sub);
    if (s) return s.depts;
  }
  return [];
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

/* ---------- 店铺分评级配置（问题商品定义页配置、店铺分监控页共用）：各平台分值阈值对应 S/A/B/C/D，
   S 最优质、D 最高风险；阈值在问题商品定义页保存后就地改写，店铺分监控评级随之生效 ---------- */
export type ShopGradePlat = '淘宝' | '抖音' | '视频号' | '快手';
export interface ShopGradeCfg { minS: number; minA: number; minB: number; minC: number; }
export const SHOP_GRADE_PLATS: ShopGradePlat[] = ['淘宝', '抖音', '视频号', '快手'];
export const SHOP_GRADES = ['S', 'A', 'B', 'C', 'D'];
export const SHOP_GRADE_CFG: Record<ShopGradePlat, ShopGradeCfg> = {
  淘宝: { minS: 4.9, minA: 4.8, minB: 4.7, minC: 4.5 },
  抖音: { minS: 4.9, minA: 4.8, minB: 4.7, minC: 4.6 },
  视频号: { minS: 4.9, minA: 4.8, minB: 4.7, minC: 4.6 },
  快手: { minS: 4.9, minA: 4.8, minB: 4.7, minC: 4.6 },
};
export const shopGradeOf = (p: ShopGradePlat, score: number) => {
  const c = SHOP_GRADE_CFG[p];
  return score >= c.minS ? 'S' : score >= c.minA ? 'A' : score >= c.minB ? 'B' : score >= c.minC ? 'C' : 'D';
};
export const shopGradeRows = (p: ShopGradePlat): [string, string][] => {
  const c = SHOP_GRADE_CFG[p];
  return [['S', `${c.minS}以上`], ['A', `${c.minA}以上`], ['B', `${c.minB}以上`], ['C', `${c.minC}以上`], ['D', `${c.minC}以下`]];
};
/* 档位语义色单一出口：店铺列表/店铺分监控/商品详情抽屉体验分共用，禁各处再复制色表 */
export const GRADE_COLOR: Record<string, string> = { S: '#00b42a', A: '#4f7cff', B: '#ff7d00', C: '#86909c', D: '#f53f3f' };

/* ---------- 店铺分监控·店铺种子（数据概览 / 店铺列表 双子路由同源）：优化任务挂店铺，创建任务会话内写回 ---------- */
export type ShopPlat = '淘宝' | '抖音' | '视频号' | '快手';
export const SHOP_PLATS: ShopPlat[] = ['淘宝', '抖音', '视频号', '快手'];
export type ShopHandle = '待处理' | '紧急处理' | '优化中' | '结束监控';
export type ShopTaskStatus = '优化中' | '待启动' | '已完成';
export interface ShopTask { id: string; name: string; status: ShopTaskStatus; }
export interface OnlineShop {
  id: string; name: string; platform: ShopPlat; score: number; resp: string;
  goods: number; logistics: number; service: number;
  openAt: string; handle: ShopHandle; endedAt?: string; endReason?: string; endScore?: number;
  isNew?: boolean; tasks: ShopTask[];
}

export const qcShops = ref<OnlineShop[]>([
  { id: 'TB-2041', name: '青野家居', platform: '淘宝', score: 4.8, resp: '', goods: 4.9, logistics: 4.9, service: 4.6, openAt: '2024-03-12', handle: '结束监控', endedAt: '10-08', endReason: '评分回升至 A 级', endScore: 4.7, tasks: [{ id: 'ST-01', name: '服务分优化·售后响应时效', status: '已完成' }] },
  { id: 'TB-2057', name: '沐辰优选', platform: '淘宝', score: 4.7, resp: '', goods: 4.8, logistics: 4.8, service: 4.4, openAt: '2023-11-08', handle: '结束监控', endedAt: '10-05', endReason: '人工确认结案', endScore: 4.8, tasks: [] },
  { id: 'TB-2063', name: '知夏工作室', platform: '淘宝', score: 4.53, resp: '', goods: 4.6, logistics: 4.6, service: 4.3, openAt: '2025-06-20', handle: '优化中', tasks: [{ id: 'ST-02', name: '服务分优化·售后响应时效', status: '优化中' }] },
  { id: 'TB-2088', name: '寻悦坊', platform: '淘宝', score: 4.3, resp: '退货退款', goods: 4.4, logistics: 4.4, service: 4.1, openAt: '2024-09-05', handle: '优化中', tasks: [{ id: 'ST-03', name: '退货退款纠纷专项优化', status: '优化中' }] },
  { id: 'DY-3012', name: '初晴日记', platform: '抖音', score: 4.9, resp: '', goods: 5.0, logistics: 4.7, service: 5.0, openAt: '2025-03-18', handle: '结束监控', endedAt: '09-28', endReason: '评分回升至 S 级', endScore: 4.8, tasks: [] },
  { id: 'DY-3026', name: '半山优选', platform: '抖音', score: 4.7, resp: '', goods: 4.8, logistics: 4.5, service: 4.8, openAt: '2023-07-22', handle: '结束监控', endedAt: '10-02', endReason: '评分持平结案', endScore: 4.7, tasks: [] },
  { id: 'DY-3039', name: '明野', platform: '抖音', score: 4.6, resp: '', goods: 4.7, logistics: 4.4, service: 4.7, openAt: '2024-11-14', handle: '待处理', tasks: [] },
  { id: 'DY-3051', name: '风屿工作室', platform: '抖音', score: 4.4, resp: '小额打款', goods: 4.5, logistics: 4.2, service: 4.5, openAt: '2025-01-27', handle: '待处理', tasks: [] },
  { id: 'SP-4018', name: '云序优选', platform: '视频号', score: 4.8, resp: '', goods: 4.6, logistics: 4.9, service: 4.9, openAt: '2024-05-30', handle: '结束监控', endedAt: '10-06', endReason: '评分回升至 A 级', endScore: 4.7, tasks: [] },
  { id: 'SP-4025', name: '江南记', platform: '视频号', score: 4.7, resp: '', goods: 4.5, logistics: 4.8, service: 4.8, openAt: '2023-08-16', handle: '结束监控', endedAt: '09-30', endReason: '人工确认结案', endScore: 4.8, tasks: [] },
  { id: 'SP-4033', name: '浅语坊', platform: '视频号', score: 4.6, resp: '', goods: 4.4, logistics: 4.7, service: 4.7, openAt: '2025-04-09', handle: '待处理', tasks: [] },
  { id: 'SP-4047', name: '拾光里', platform: '视频号', score: 4.5, resp: '退货退款', goods: 4.3, logistics: 4.6, service: 4.6, openAt: '2024-12-25', handle: '紧急处理', tasks: [{ id: 'ST-04', name: '物流停滞紧急响应专项', status: '待启动' }] },
  { id: 'KS-5014', name: '星野优选', platform: '快手', score: 4.9, resp: '', goods: 5.0, logistics: 5.0, service: 4.7, openAt: '2025-02-14', handle: '结束监控', endedAt: '10-01', endReason: '评分回升至 S 级', endScore: 4.8, tasks: [] },
  { id: 'KS-5028', name: '风羽家居', platform: '快手', score: 4.8, resp: '', goods: 4.9, logistics: 4.9, service: 4.6, openAt: '2024-07-07', handle: '结束监控', endedAt: '10-07', endReason: '评分回升至 A 级', endScore: 4.7, tasks: [] },
  { id: 'KS-5036', name: '蓝悦日记', platform: '快手', score: 4.65, resp: '', goods: 4.7, logistics: 4.7, service: 4.4, openAt: '2025-09-01', handle: '优化中', tasks: [{ id: 'ST-05', name: '物流体验优化·发货时效', status: '优化中' }] },
  { id: 'KS-5042', name: '山茶工作室', platform: '快手', score: 4.2, resp: '小额打款', goods: 4.3, logistics: 4.3, service: 4.0, openAt: '2024-01-19', handle: '紧急处理', tasks: [{ id: 'ST-06', name: '服务体验紧急优化专项', status: '待启动' }] },
  /* 新店：评分观察期，不计入评级分布/占比/均值口径，单独以「新店」卡呈现 */
  { id: 'TB-2095', name: '栖迟家居', platform: '淘宝', score: 4.8, resp: '', goods: 4.8, logistics: 4.8, service: 4.7, openAt: '2026-08-18', handle: '待处理', isNew: true, tasks: [] },
  { id: 'KS-5058', name: '南屿优选', platform: '快手', score: 4.7, resp: '', goods: 4.7, logistics: 4.7, service: 4.6, openAt: '2026-09-02', handle: '待处理', isNew: true, tasks: [] },
]);

/* ---------- 店铺分监控·店铺商品种子（子路由③）：商品维度挂店铺，会话/评价/售后口径由数据侧提供；
   差评占比＝差评数/评价条数 就地计算，售后占比＝售后数/支付订单数（订单数不在本页展示，随数据直给） ---------- */
export interface ShopGood {
  id: string; shopId: string; name: string; listedAt: string;
  skuCount: number; specs: string[];
  orders: number;
  sessions: number; riskSessions: number;
  reviews: number; badReviews: number;
  afterSales: number; afterRatio: number;
}
const GOOD_SPECS: string[][] = [
  ['颜色', '尺寸'], ['尺寸', '容量'], ['颜色', '规格'], ['香味', '装规'], ['颜色', '尺寸', '高度'], ['型号', '颜色'],
];
/* [店铺ID, 商品名称, 上架时间, SKU 数, 规格组, 关联会话, 风险会话, 评价条数, 差评数, 售后数, 售后占比] */
type GoodRow = [string, string, string, number, number, number, number, number, number, number, number];
const GOOD_ROWS: GoodRow[] = [
  ['TB-2041', '实木收纳柜', '2026-03-14', 12, 0, 186, 2, 1240, 38, 26, 0.021],
  ['TB-2041', '岩板餐桌', '2026-05-02', 8, 1, 94, 1, 620, 21, 12, 0.019],
  ['TB-2041', '极简落地灯', '2026-07-19', 6, 2, 58, 0, 410, 9, 6, 0.015],
  ['TB-2057', '云感布艺沙发', '2026-02-08', 10, 4, 142, 1, 860, 26, 18, 0.021],
  ['TB-2057', '棉麻四件套', '2026-04-23', 16, 1, 120, 0, 980, 24, 14, 0.014],
  ['TB-2063', '陶瓷餐具套装', '2026-01-17', 9, 2, 168, 4, 720, 41, 22, 0.030],
  ['TB-2063', '折叠收纳箱', '2026-06-06', 14, 0, 88, 2, 530, 27, 11, 0.021],
  ['TB-2063', '玄关换鞋凳', '2026-08-11', 7, 4, 46, 1, 260, 14, 7, 0.027],
  ['TB-2088', '阳台休闲椅', '2026-03-29', 8, 4, 210, 9, 640, 58, 34, 0.053],
  ['TB-2088', '乳胶枕', '2026-05-16', 6, 1, 174, 7, 820, 63, 29, 0.035],
  ['TB-2088', '香薰蜡烛礼盒', '2026-07-30', 10, 3, 64, 2, 380, 22, 9, 0.024],
  ['DY-3012', '保温杯', '2026-02-14', 12, 1, 240, 1, 1560, 32, 21, 0.013],
  ['DY-3012', '便携榨汁杯', '2026-06-21', 8, 5, 150, 0, 940, 18, 9, 0.010],
  ['DY-3026', '原木书架', '2026-01-25', 9, 4, 132, 2, 710, 25, 13, 0.018],
  ['DY-3026', '磨砂玻璃花瓶', '2026-04-09', 6, 2, 76, 1, 450, 16, 8, 0.018],
  ['DY-3039', '轻量化羽绒服', '2026-09-02', 18, 1, 98, 3, 360, 21, 10, 0.028],
  ['DY-3039', '记忆棉坐垫', '2026-07-07', 10, 0, 64, 1, 420, 19, 7, 0.017],
  ['DY-3051', '实木衣架套装', '2026-03-05', 6, 2, 158, 6, 580, 44, 24, 0.041],
  ['DY-3051', '厨房置物架', '2026-05-27', 12, 0, 126, 5, 490, 39, 19, 0.039],
  ['SP-4018', '柔光小夜灯', '2026-02-20', 8, 5, 118, 1, 760, 17, 9, 0.012],
  ['SP-4018', '陶瓷餐具套装', '2026-06-13', 9, 2, 84, 0, 520, 12, 6, 0.012],
  ['SP-4025', '棉麻四件套', '2026-01-09', 16, 1, 142, 2, 880, 26, 15, 0.017],
  ['SP-4025', '极简落地灯', '2026-08-03', 6, 2, 52, 0, 310, 8, 4, 0.013],
  ['SP-4033', '折叠收纳箱', '2026-04-17', 14, 0, 96, 3, 560, 28, 12, 0.021],
  ['SP-4033', '阳台休闲椅', '2026-07-25', 8, 4, 58, 2, 290, 17, 8, 0.028],
  ['SP-4047', '乳胶枕', '2026-03-22', 6, 1, 188, 8, 740, 47, 31, 0.042],
  ['SP-4047', '保温杯', '2026-05-09', 12, 1, 146, 6, 690, 41, 26, 0.038],
  ['KS-5014', '云感布艺沙发', '2026-02-27', 10, 4, 164, 0, 920, 19, 11, 0.012],
  ['KS-5014', '实木收纳柜', '2026-06-30', 12, 0, 102, 1, 540, 13, 6, 0.011],
  ['KS-5028', '岩板餐桌', '2026-01-31', 8, 1, 88, 1, 470, 14, 8, 0.017],
  ['KS-5028', '玄关换鞋凳', '2026-07-14', 7, 4, 44, 0, 240, 7, 3, 0.013],
  ['KS-5036', '便携榨汁杯', '2026-04-05', 8, 5, 124, 4, 610, 33, 17, 0.028],
  ['KS-5036', '柔光小夜灯', '2026-08-19', 8, 5, 66, 2, 350, 16, 9, 0.026],
  ['KS-5042', '记忆棉坐垫', '2026-03-11', 10, 0, 176, 8, 520, 46, 28, 0.054],
  ['KS-5042', '香薰蜡烛礼盒', '2026-06-02', 10, 3, 92, 4, 410, 31, 16, 0.039],
  ['KS-5042', '厨房置物架', '2026-08-27', 12, 0, 58, 3, 230, 18, 10, 0.043],
  ['TB-2095', '磨砂玻璃花瓶', '2026-09-12', 6, 2, 36, 0, 120, 4, 2, 0.017],
  ['TB-2095', '原木书架', '2026-09-20', 9, 4, 28, 0, 90, 3, 1, 0.011],
  ['KS-5058', '轻量化羽绒服', '2026-09-16', 18, 1, 42, 1, 140, 5, 2, 0.014],
  ['KS-5058', '陶瓷餐具套装', '2026-09-24', 9, 2, 31, 0, 100, 3, 1, 0.010],
];
export const qcShopGoods = ref<ShopGood[]>(GOOD_ROWS.map((r, i) => ({
  id: String(680000000127 + i * 9173),
  shopId: r[0], name: mkProductName(r[1], i), listedAt: r[2],
  skuCount: r[3], specs: GOOD_SPECS[r[4]],
  /* 订单数由售后数÷售后占比还原取整，售后占比展示同口径回算（订单数据复合列首行） */
  orders: Math.round(r[9] / r[10]),
  sessions: r[5], riskSessions: r[6],
  reviews: r[7], badReviews: r[8],
  afterSales: r[9], afterRatio: r[10],
})));

/* ---------- 店铺商品 SKU 明细（只读弹窗）：按商品规格维度确定性展开，行数＝min(SKU 数, 维度笛卡尔积)；
   字段＝SKU 名称/商品编码/系列编码(数组，一个 SKU 可关联多个系列)/成本价/售价/库存数（同快捷编辑 SKU 弹窗口径，去编辑态专属字段） ---------- */
export interface ShopGoodSku { name: string; code: string; series: string[]; cost: string; price: string; stock: number; }
const SKU_SPEC_VALUES: Record<string, string[]> = {
  颜色: ['黑色', '白色', '米色', '浅灰'],
  尺寸: ['S', 'M', 'L', 'XL'],
  容量: ['350ml', '500ml', '750ml'],
  规格: ['标准款', '升级款'],
  香味: ['无香', '薰衣草', '木质'],
  装规: ['1装', '2装', '4装'],
  高度: ['低款', '高款'],
  型号: ['A款', 'B款', 'C款'],
};
/* 系列编码展示取系列简称（全局口径）：店铺商品按商品ID确定性归属一个系列 */
const SKU_SERIES = ['收纳系列', '餐厨系列', '灯饰系列', '布艺系列', '户外系列', '香氛系列'];
export const shopGoodSkus = (g: ShopGood): ShopGoodSku[] => {
  const pools = g.specs.map((s) => SKU_SPEC_VALUES[s] ?? ['标准款', '升级款']);
  const total = pools.reduce((m, p) => m * p.length, 1);
  const rows = Math.min(g.skuCount, total);
  const base = 29 + ((Number(g.id) % 60) + 7);
  const primarySeries = SKU_SERIES[Number(g.id) % SKU_SERIES.length];
  /* 按 SKU 名归组，收集每个 SKU 关联的所有系列编码 */
  const seriesMap = new Map<string, { code: string; cost: string; price: string; stock: number; series: Set<string> }>();
  const addSeries = (name: string, code: string, cost: string, price: string, stock: number, series: string) => {
    let entry = seriesMap.get(name);
    if (!entry) {
      entry = { code, cost, price, stock, series: new Set() };
      seriesMap.set(name, entry);
    }
    entry.series.add(series);
  };
  /* 基础 SKU 行：每行归属主系列 */
  for (let i = 0; i < rows; i++) {
    let rest = i;
    const vals = pools.map((p) => { const v = p[rest % p.length]; rest = Math.floor(rest / p.length); return v; });
    const cost = base + (i % 4) * 6;
    const name = mkSkuName(vals.join(''), Number(g.id) + i);
    const code = mkProductCode(Number(g.id) % 17576, i + 1);
    addSeries(name, code, cost.toFixed(2), (cost * 2.2 + (i % 4) * 10).toFixed(2), (i * 29 + 12) % 120, primarySeries);
  }
  /* 一个 SKU 可关联多个系列编码：部分 SKU 名确定性追加其它系列的额外编码（首 SKU 挂 5 个系列供两行折叠演示） */
  const skuNames = [...seriesMap.keys()];
  skuNames.forEach((name, i) => {
    const n = i === 0 ? 4 : i % 3 === 0 ? 1 : 0;
    for (let j = 0; j < n; j++) {
      const se = SKU_SERIES[(Number(g.id) + j + 2) % SKU_SERIES.length];
      const entry = seriesMap.get(name);
      if (entry && se !== primarySeries) entry.series.add(se);
    }
  });
  return [...seriesMap.entries()].map(([name, e]) => ({
    name, code: e.code, series: [...e.series], cost: e.cost, price: e.price, stock: e.stock,
  }));
};

/* ---------- 店铺商品·问题命中类型（操作列）：风险项＝风险会话＋差评数＋售后数，
   类型按全局问题类型占比（ONLINE_TYPE_COUNTS）确定性拆包（商品ID哈希微调分布），按计数降序 ---------- */
export const shopGoodHitTypes = (g: ShopGood): { type: string; count: number }[] => {
  const n = g.riskSessions + g.badReviews + g.afterSales;
  if (!n) return [];
  const weights = Object.entries(ONLINE_TYPE_COUNTS);
  const wSum = weights.reduce((s, [, c]) => s + c, 0) || 1;
  const rnd = mulberry32(Number(g.id) * 131 + 9);
  const m = new Map<string, number>();
  let left = n;
  weights.forEach(([type, w], i) => {
    const base = (w / wSum) * n;
    const jitter = i === weights.length - 1 ? 0 : (rnd() - 0.5) * 2 * Math.max(1, Math.round(base * 0.25));
    const c = i === weights.length - 1 ? left : Math.max(0, Math.min(left, Math.round(base + jitter)));
    left -= c;
    if (c > 0) m.set(type, c);
  });
  return [...m.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
};

/* ---------- 店铺商品·运营信息：运营组长→专员→助理挂靠链，名单沿用运营组管理口径，按店铺编号确定性归属 ---------- */
export interface ShopOpsTrio { assistant: string; specialist: string; leader: string; }
const SHOP_OPS_TRIOS: ShopOpsTrio[] = [
  { assistant: '何静', specialist: '孙倩', leader: '黄亚芳' },
  { assistant: '罗彬', specialist: '孙倩', leader: '黄亚芳' },
  { assistant: '陈晓', specialist: '刘洋', leader: '黄亚芳' },
  { assistant: '高翔', specialist: '郑婷', leader: '黄亚芳' },
  { assistant: '李四', specialist: '杨帆', leader: '徐佳华' },
];
export const shopOpsOf = (shopId: string): ShopOpsTrio => {
  const n = Number(shopId.replace(/\D/g, ''));
  return SHOP_OPS_TRIOS[n % SHOP_OPS_TRIOS.length];
};

/* ---------- 店铺商品 跳转种子：店铺列表「店铺商品」带入「店铺（+平台）」；监控列表「关联ID」带入商品编码查询；消费后即清空 ---------- */
export const shopGoodsJumpSeed = shallowRef<{ shopId?: string; q?: string; openDetail?: boolean } | null>(null);

/* ---------- 商品编码 → 店铺商品：编码按稳定哈希确定性归属一件店铺商品（演示口径），
   使监控列表「关联ID」跳转后店铺商品搜索按商品编码可查到对应商品 ---------- */
export const shopGoodIndexOfCode = (code: string): number => {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) % 9973;
  return h % qcShopGoods.value.length;
};
export const shopGoodOfCode = (code: string): ShopGood | null => qcShopGoods.value[shopGoodIndexOfCode(code)] ?? null;

/* ---------- 系列编码 → 关联商品：旗下各商品编码经 shopGoodOfCode 归属店铺商品的并集（去重保序），
   与监控列表「关联ID」跳转、店铺商品搜索同源口径 ---------- */
export const seriesGoodsOf = (codes: string[]): ShopGood[] => {
  const seen = new Set<string>();
  const out: ShopGood[] = [];
  codes.forEach((c) => {
    const g = shopGoodOfCode(c);
    if (g && !seen.has(g.id)) {
      seen.add(g.id);
      out.push(g);
    }
  });
  return out;
};

/* ---------- 平台官方图标：复用 /logos 官方资源；视频号无素材，同运营中心 wxLogo 口径圆角矩形字标 data-uri ---------- */
const wxLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fa9a3e"/><text x="16" y="22" font-size="15" fill="#fff" text-anchor="middle" font-family="sans-serif">视</text></svg>');
export const SHOP_LOGO: Record<ShopPlat, string> = { 淘宝: '/logos/taobao.png', 抖音: '/logos/douyin.png', 视频号: wxLogo, 快手: '/logos/kuaishou.png' };
