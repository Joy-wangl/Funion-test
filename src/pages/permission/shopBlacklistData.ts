/* =========================================================
   店铺配置 › 店铺黑品限制：按店铺维度限制 商品编码（系列编码为父项）/ 商品ID 两类标识
   系列编码与商品编码同列一棵两级树：指定系列编码＝其下全部商品编码一并选中（随系列限制）
   系列编码＝纯文字内容、商品编码＝英文字母+数字组合，二者均与商品无关（商品仅出现在商品ID维度）
   命中限制的商品不可发布到本店铺（全局黑品库管理页已下线，本限制仅对本店铺生效）
   商品ID 数据源同店铺商品口径＝qcShopGoods.id
   ========================================================= */
import { reactive } from 'vue';
import { qcShopGoods } from '../quality/qcOnlineData';

export type ShopBlDim = '商品编码' | '系列编码' | '商品ID';

export interface ShopBlEntry {
  id: number;
  shopId: string;
  dim: ShopBlDim;
  /** 限制标识值：商品编码 / 系列编码 / 商品ID */
  value: string;
  /** 商品名称（仅商品ID 维度回显；编码类为纯标识不带名称） */
  name: string;
  /** 商品编码条目归属的系列编码（父项；系列编码/商品ID 条目留空） */
  series?: string;
  /** 关联商品ID（仅商品ID 维度：供缩略图与副行回显） */
  goodsId?: string;
  addBy: string;
  addTime: string;
}

/* ---------- 系列→商品编码目录（两级树骨架）：系列编码为纯文字、商品编码为字母+数字组合，独立于商品 ---------- */
export interface ShopBlSeries { series: string; codes: string[]; }
const SERIES_TEXTS = ['香氛系列', '收纳系列', '灯饰系列', '户外系列', '布艺系列', '餐厨系列', '洗护系列', '文具系列'];
const CODE_PREFIX = ['XF', 'SN', 'DS', 'HW', 'BY', 'CC', 'XH', 'WJ'];
const CATALOG: ShopBlSeries[] = SERIES_TEXTS.map((s, i) => ({
  series: s,
  codes: Array.from({ length: 8 }, (_, k) => `${CODE_PREFIX[i]}${1001 + k}`),
}));
export const shopBlCatalog = (): ShopBlSeries[] => CATALOG;
export const shopBlSeriesOf = (series: string): ShopBlSeries | null => CATALOG.find((s) => s.series === series) ?? null;
/** 添加/编辑弹窗下拉候选：系列编码全量、指定系列下的商品编码（含「全部」整系列档） */
export const shopBlSeriesOptions = () => CATALOG.map((s) => ({ value: s.series, label: s.series }));
export const shopBlCodeOptions = (series: string) => [
  { value: '', label: '全部商品编码（整系列限制）' },
  ...(shopBlSeriesOf(series)?.codes ?? []).map((c) => ({ value: c, label: c })),
];

const store = reactive<Record<string, ShopBlEntry[]>>({});

let seq = 1;
const nowText = () => new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-');
const hashOf = (s: string) => {
  let h = 7;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

const SEED_PEOPLE = ['七妮妮', '王龙', '周梦琪'];
/** 种子添加时间：以 2026-10 为基准按序往前推日，保持店铺间稳定可复现 */
const seedTime = (h: number, i: number) => {
  const day = 28 - ((h + i * 3) % 26);
  const hh = String(9 + ((h + i * 5) % 10)).padStart(2, '0');
  const mm = String((h + i * 17) % 60).padStart(2, '0');
  return `2026-10-${String(day).padStart(2, '0')} ${hh}:${mm}:12`;
};

function seed(shopId: string): ShopBlEntry[] {
  const goods = qcShopGoods.value;
  const h = hashOf(shopId);
  const out: ShopBlEntry[] = [];
  const push = (dim: ShopBlDim, value: string, name: string, i: number, series?: string, goodsId?: string) => {
    out.push({ id: seq++, shopId, dim, value, name, series, goodsId, addBy: SEED_PEOPLE[(h + i) % SEED_PEOPLE.length], addTime: seedTime(h, i) });
  };
  /* 商品ID：整品维度限制（唯一与商品相关的维度） */
  for (let i = 0; i < 2 && goods.length; i += 1) {
    const g = goods[(h + i * 5) % goods.length];
    push('商品ID', g.id, g.name, i, undefined, g.id);
  }
  /* 商品编码：字母+数字组合的单独编码限制（挂其归属系列为父项） */
  for (let i = 0; i < 2; i += 1) {
    const se = CATALOG[(h + i * 3) % CATALOG.length];
    push('商品编码', se.codes[(h + i) % se.codes.length], '', i + 2, se.series);
  }
  /* 系列编码：整系列限制（其下全部商品编码随系列选中；避开已被单独编码占用的系列以免重复） */
  for (let i = 0; i < 2; i += 1) {
    const se = CATALOG[(h + i * 5 + 2) % CATALOG.length];
    if (out.some((x) => x.series === se.series)) continue;
    push('系列编码', se.series, '', i + 4);
  }
  return out;
}

/** 取本店铺黑品限制清单（首次访问按店铺ID确定性播种） */
export const shopBlacklistOf = (shopId: string): ShopBlEntry[] => {
  if (!store[shopId]) store[shopId] = seed(shopId);
  return store[shopId];
};

/** 子 tab 计数：商品编码 tab＝受限商品编码数（整系列条目按其下全部编码计）＋商品ID 条目数分列 */
export const shopBlCounts = (shopId: string): { code: number; goods: number } => {
  const list = shopBlacklistOf(shopId);
  const seriesSet = new Set(list.filter((x) => x.dim === '系列编码').map((x) => x.value));
  let code = 0;
  list.forEach((x) => {
    if (x.dim === '商品ID') return;
    if (x.dim === '系列编码') { code += shopBlSeriesOf(x.value)?.codes.length ?? 0; return; }
    /* 商品编码：其归属系列已整系列受限时不重复计数 */
    if (x.series && seriesSet.has(x.series)) return;
    code += 1;
  });
  return { code, goods: list.filter((x) => x.dim === '商品ID').length };
};

/** 同店铺同维度下标识是否已存在（编辑时排除自身） */
export const hasShopBlacklist = (shopId: string, dim: ShopBlDim, value: string, ignoreId?: number) =>
  shopBlacklistOf(shopId).some((x) => x.dim === dim && x.value === value && x.id !== ignoreId);

export const addShopBlacklist = (shopId: string, dim: ShopBlDim, value: string, extra: { name?: string; series?: string; goodsId?: string } = {}): ShopBlEntry => {
  const e: ShopBlEntry = { id: seq++, shopId, dim, value, name: extra.name ?? '', series: extra.series, goodsId: extra.goodsId, addBy: '七妮妮', addTime: nowText() };
  shopBlacklistOf(shopId).unshift(e);
  return e;
};

export const updateShopBlacklist = (shopId: string, id: number, patch: { dim: ShopBlDim; value: string; name?: string; series?: string; goodsId?: string }) => {
  const e = shopBlacklistOf(shopId).find((x) => x.id === id);
  if (!e) return;
  e.dim = patch.dim;
  e.value = patch.value;
  e.name = patch.name ?? '';
  e.series = patch.series;
  e.goodsId = patch.goodsId;
};

export const removeShopBlacklist = (shopId: string, id: number) => {
  const list = shopBlacklistOf(shopId);
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list.splice(i, 1);
};

/** 系列级保存（编辑抽屉）：选中集=其下全部编码→归并为整系列条目；部分→同步单独编码条目；空→清除该系列限制 */
export const saveShopBlSeriesCodes = (shopId: string, series: string, codes: string[]) => {
  const list = shopBlacklistOf(shopId);
  const all = shopBlSeriesOf(series)?.codes ?? [];
  const sel = all.filter((c) => codes.includes(c));
  const seriesEntry = list.find((x) => x.dim === '系列编码' && x.value === series) ?? null;
  if (sel.length === all.length && all.length > 0) {
    if (!seriesEntry) list.unshift({ id: seq++, shopId, dim: '系列编码', value: series, name: '', addBy: '七妮妮', addTime: nowText() });
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i].dim === '商品编码' && list[i].series === series) list.splice(i, 1);
    }
    return;
  }
  if (seriesEntry) list.splice(list.indexOf(seriesEntry), 1);
  all.forEach((c) => {
    const own = list.find((x) => x.dim === '商品编码' && x.series === series && x.value === c) ?? null;
    if (sel.includes(c) && !own) list.unshift({ id: seq++, shopId, dim: '商品编码', value: c, name: '', series, addBy: '七妮妮', addTime: nowText() });
    else if (!sel.includes(c) && own) list.splice(list.indexOf(own), 1);
  });
};

/** 删除系列级限制：整系列条目与其下单独编码条目一并清除 */
export const removeShopBlSeries = (shopId: string, series: string) => {
  const list = shopBlacklistOf(shopId);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const x = list[i];
    if ((x.dim === '系列编码' && x.value === series) || (x.dim === '商品编码' && x.series === series)) list.splice(i, 1);
  }
};

/** 添加弹窗快捷检索：输入即模糊匹配 系列编码 与 商品编码（系列在前），返回带维度与父系列的候选 */
export interface ShopBlHit { dim: '系列编码' | '商品编码'; value: string; series?: string; }
export const shopBlSearch = (kw: string, limit = 30): ShopBlHit[] => {
  const k = kw.trim().toLowerCase();
  if (!k) return [];
  const out: ShopBlHit[] = [];
  CATALOG.forEach((s) => {
    if (s.series.toLowerCase().includes(k)) out.push({ dim: '系列编码', value: s.series });
    s.codes.forEach((c) => { if (c.toLowerCase().includes(k)) out.push({ dim: '商品编码', value: c, series: s.series }); });
  });
  return out.slice(0, limit);
};

/** 商品ID 回查商品名称 */
export const shopBlGoodsName = (goodsId: string) => qcShopGoods.value.find((g) => g.id === goodsId)?.name ?? '';
