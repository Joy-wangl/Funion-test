/* =========================================================
   聚合接待 · 实时客服接待（平台账号接待监控）数据层
   按用户截图逐字转录：拼多多 3 店铺 / 账号卡 / 不分流账号
   ========================================================= */

export const LIVE_PLATFORMS = ['拼多多', '抖音', '淘宝', '天猫', '灵犀', '淘工厂', '阿里1688', '淘宝-用户端'] as const;
export type LivePlatform = (typeof LIVE_PLATFORMS)[number];

export interface LiveAccount {
  id: number;
  name: string;
  /** PC 在线 */
  pc: boolean;
  /** 移动在线 */
  mobile: boolean;
  /** 显示「拉取未回复」按钮 */
  pull: boolean;
  /** 接待 */
  recv: number;
  /** 未回复 */
  unreplied: number;
  /** 接待开关 */
  recvSwitch: boolean;
  /** 登录开关 */
  loginSwitch: boolean;
  /** 转移角标 */
  transfer?: boolean;
  /** 完整卡（含开关行）/ 简化卡 */
  full: boolean;
}

export interface LiveStore {
  name: string;
  recv: number;
  unreplied: number;
  /** 回复率（空串=不显示值） */
  rate: string;
  /** 账号总数 */
  total: number;
  /** 不分流账号名单 */
  noRoute: string[];
  accounts: LiveAccount[];
}

const acc = (
  id: number,
  name: string,
  opt: Partial<LiveAccount> = {},
): LiveAccount => ({
  id, name, pc: false, mobile: false, pull: false, recv: 0, unreplied: 0,
  recvSwitch: false, loginSwitch: true, full: false, ...opt,
});

/** 简化账号卡（查看更多内） */
const simple = (id: number, name: string) => acc(id, name);

export const LIVE_STORES_PDD: LiveStore[] = [
  {
    name: '蒸蒸日上的小卖铺',
    recv: 35,
    unreplied: 1,
    rate: '100%',
    total: 22,
    noRoute: ['蒸蒸日上的小卖铺售前麒彤', '蒸蒸日上的小卖铺售后于琳', '蒸蒸日上的小卖铺运营吴', '蒸蒸日上的小卖铺售后小珂', '蒸蒸日上的小卖铺售前小路', '蒸蒸日上的小卖铺IT'],
    accounts: [
      acc(7618, '蒸蒸日上的小卖铺售前麒彤', { pull: true, full: true }),
      acc(700, '主账号:主账号', { pull: true, full: true }),
      acc(2334, '蒸蒸日上的小卖铺售前麒翠', { pc: true, pull: true, recv: 35, unreplied: 1, recvSwitch: true, transfer: true, full: true }),
      simple(3001, '蒸蒸日上的小卖铺售后小珂'),
      simple(3002, '蒸蒸日上的小卖铺售前小路'),
      simple(3003, '蒸蒸日上的小卖铺IT'),
      simple(3004, '蒸蒸日上的小卖铺售后于琳'),
      simple(3005, '蒸蒸日上的小卖铺运营吴'),
      simple(3006, '蒸蒸日上的小卖铺售前麒芳'),
      simple(3007, '蒸蒸日上的小卖铺售前麒玲'),
      simple(3008, '蒸蒸日上的小卖铺售后小楠'),
      simple(3009, '蒸蒸日上的小卖铺运营周'),
      simple(3010, '蒸蒸日上的小卖铺售前麒勇'),
      simple(3011, '蒸蒸日上的小卖铺售后小婷'),
      simple(3012, '蒸蒸日上的小卖铺售前麒建'),
      simple(3013, '蒸蒸日上的小卖铺售后小慧'),
      simple(3014, '蒸蒸日上的小卖铺运营郑'),
      simple(3015, '蒸蒸日上的小卖铺售前麒霞'),
      simple(3016, '蒸蒸日上的小卖铺售后小峰'),
      simple(3017, '蒸蒸日上的小卖铺售前麒敏'),
      simple(3018, '蒸蒸日上的小卖铺运营王'),
      simple(3019, '蒸蒸日上的小卖铺售后小丽'),
    ],
  },
  {
    name: '三石百货工厂',
    recv: 0,
    unreplied: 0,
    rate: '',
    total: 7,
    noRoute: ['三石百货工厂售前樟轩', '三石百货工厂IT', '主账号', '三石百货工厂售前樟政', '三石百货工厂运营小黑'],
    accounts: [
      acc(7562, '三石百货工厂售前樟轩', { pull: true, full: true }),
      acc(2329, '三石百货工厂售前樟杨', { pc: true, pull: true, recvSwitch: true, full: true }),
      acc(1675, '主账号:主账号', { pull: true, full: true }),
      simple(3101, '三石百货工厂IT'),
      simple(3102, '三石百货工厂运营小黑'),
      simple(3103, '三石百货工厂售前樟政'),
      simple(3104, '三石百货工厂售后小玲'),
    ],
  },
  {
    name: '越来越精彩的小店',
    recv: 4,
    unreplied: 0,
    rate: '100%',
    total: 7,
    noRoute: ['越来越精彩的小店售前樟瑞', '越来越精彩的小店泉', '越来越精彩的小店售前樟政', '越来越精彩的小店IT', '主账号'],
    accounts: [
      acc(7484, '越来越精彩的小店售前樟瑞', { pull: true, full: true }),
      acc(2331, '越来越精彩的小店售前樟欣', { pc: true, pull: true, recv: 4, recvSwitch: true, full: true }),
      acc(2216, '主账号:主账号', { pull: true, full: true }),
      simple(3201, '越来越精彩的小店IT'),
      simple(3202, '越来越精彩的小店泉'),
      simple(3203, '越来越精彩的小店售前樟政'),
      simple(3204, '越来越精彩的小店售后小芳'),
    ],
  },
];

/** 其他平台暂无数据 */
export const liveStoresOf = (platform: LivePlatform): LiveStore[] => (platform === '拼多多' ? LIVE_STORES_PDD : []);
