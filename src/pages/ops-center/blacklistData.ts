import { reactive } from 'vue';

/* ---------- 黑品库（设置 › 黑品库）：商品编码 / 系列编码 / 内部商机（链接商品ID）三类黑名单 ----------
   发布商品到店铺前按三类标识匹配；命中则发布任务失败，失败原因见 blFailReason */

export type BlType = '商品编码' | '系列编码' | '内部商机';
export const BL_TYPES: BlType[] = ['商品编码', '系列编码', '内部商机'];

export interface BlEntry {
  id: number;
  type: BlType;
  /** 商品编码 / 系列编码 / 链接商品ID */
  value: string;
  /** 商品名称（内部商机自动带出；编码类留空） */
  name: string;
  addBy: string;
  addTime: string;
}

export const blacklist = reactive<BlEntry[]>([]);

let seq = 1;
export const addBlacklist = (type: BlType, value: string, name = ''): BlEntry => {
  const e: BlEntry = {
    id: seq++,
    type,
    value,
    name,
    addBy: '七妮妮',
    addTime: new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-'),
  };
  blacklist.unshift(e);
  return e;
};

export const removeBlacklist = (id: number) => {
  const i = blacklist.findIndex((x) => x.id === id);
  if (i >= 0) blacklist.splice(i, 1);
};

export const hasBlacklist = (type: BlType, value: string) =>
  blacklist.some((x) => x.type === type && x.value === value);

/** 发布前匹配：按 商品编码 → 系列编码 → 内部商机 顺序返回命中类型，未命中返回 null */
export const matchBlacklist = (codes: string[], series: string[], linkId: string): BlType | null => {
  const hit = (type: BlType, vals: string[]) =>
    blacklist.some((x) => x.type === type && vals.includes(x.value));
  if (hit('商品编码', codes)) return '商品编码';
  if (hit('系列编码', series)) return '系列编码';
  if (linkId && hit('内部商机', [linkId])) return '内部商机';
  return null;
};

/** 发布任务失败原因文案 */
export const blFailReason = (type: BlType) => `商品命中黑名单（${type}），无法发布到店铺`;
