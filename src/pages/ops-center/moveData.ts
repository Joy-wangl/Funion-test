/** 自动化中心-自动化任务：店铺 / 任务 静态数据（搬家为任务类型之一，另有自动下架） */

/** 任务类型：搬家=跨店搬运发布；自动下架=命中规则商品自动下架 */
export type MvKind = '搬家' | '自动下架';
/** 执行方式：循环=指定时间循环；条件触发=满足条件即时触发（长期）；一次性=配置条件只执行一次 */
export type MvMethod = '循环' | '条件触发' | '一次性';
export type MvTaskStatus = '未开始' | '进行中' | '已暂停' | '已完成';
/** 选店铺模式：关联=什么店铺关联这个任务；裂变=满足条件后把符合规则的品裂变到哪些店铺 */
export type MvShopMode = '关联' | '裂变';

/** 触发条件：商品销量在 days 天内 OR 销量 > sales，则执行 */
export interface MvCondition {
  days: number;
  sales: number;
}
export const mvCondSummary = (c: MvCondition) => `销量${c.days}天内 OR 销量>${c.sales}`;

export interface MvShop {
  id: string;
  platform: string;
  name: string;
  shopId: string;
  online: boolean;
}

export interface MvTask {
  id: string;
  name: string;
  kind: MvKind;
  method: MvMethod;
  /** 循环方式的循环周期与执行时间 */
  cycle?: '每天' | '每周';
  cycleTime?: string;
  /** 条件触发 / 一次性方式的触发条件 */
  cond?: MvCondition;
  shopMode: MvShopMode;
  /** 关联=关联店铺；裂变=裂变目标店铺 */
  shopIds: string[];
  creator: string;
  status: MvTaskStatus;
  createdAt: string;
}

export const MV_KINDS: MvKind[] = ['搬家', '自动下架'];
export const MV_METHODS: MvMethod[] = ['循环', '条件触发', '一次性'];

/** 执行配置摘要（列表列直展，与抽屉配置同源） */
export const mvRunSummary = (t: MvTask) => {
  if (t.method === '循环') return `${t.cycle ?? '每天'} ${t.cycleTime ?? '02:00'} 循环执行`;
  const tail = t.method === '一次性' ? '执行一次' : '即时触发 · 长期';
  return `${mvCondSummary(t.cond ?? { days: 0, sales: 0 })} → ${tail}`;
};

/* 店铺池：各平台自有店 + 视频号店；店铺管理同源口径 */
export const mvShops: MvShop[] = [
  { id: 's1', platform: '淘宝', name: '淘宝心选店', shopId: '15074719', online: true },
  { id: 's2', platform: '淘宝', name: 'AAA小店', shopId: '668808746', online: true },
  { id: 's3', platform: '天猫', name: '天猫Funion旗舰店', shopId: '269190799', online: true },
  { id: 's4', platform: '拼多多', name: '拼多多优品店', shopId: '172420524', online: false },
  { id: 's5', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', shopId: '15074742', online: true },
  { id: 's6', platform: '淘宝', name: '淘系C店-雅集臻品 Greenery', shopId: '20886632', online: true },
  { id: 's7', platform: '淘宝', name: '淘系C店-泰有钱百货店', shopId: '319800402', online: true },
  { id: 's8', platform: '淘宝', name: '淘系C店-環球甄选好物店', shopId: '305428412', online: true },
  { id: 'v1', platform: '视频号', name: '快乐小店-佰得小站', shopId: 'wx88213301', online: true },
  { id: 'v2', platform: '视频号', name: '快乐小店-歪歪轩', shopId: 'wx88213302', online: true },
  { id: 'v3', platform: '视频号', name: '快乐小店-Funion官方旗舰店', shopId: 'wx88213303', online: true },
];
export const mvShopOf = (id: string) => mvShops.find((s) => s.id === id);

export const mvTasks: MvTask[] = [
  {
    id: 'at-01', name: '搬家-淘宝心选店全店循环', kind: '搬家', method: '循环',
    cycle: '每天', cycleTime: '02:00', shopMode: '关联', shopIds: ['s1', 's8'],
    creator: '七妮妮', status: '进行中', createdAt: '2026-08-02 10:24',
  },
  {
    id: 'at-02', name: '搬家-天猫旗舰店动销款裂变', kind: '搬家', method: '一次性',
    cond: { days: 30, sales: 50 }, shopMode: '裂变', shopIds: ['v1', 'v3'],
    creator: '李珊珊', status: '未开始', createdAt: '2026-09-01 15:40',
  },
  {
    id: 'at-03', name: '上新同步-拼多多优品店', kind: '搬家', method: '条件触发',
    cond: { days: 7, sales: 20 }, shopMode: '关联', shopIds: ['s4'],
    creator: '七妮妮', status: '进行中', createdAt: '2026-08-11 09:12',
  },
  {
    id: 'at-04', name: '滞销下架-AAA小店与泰有钱', kind: '自动下架', method: '条件触发',
    cond: { days: 90, sales: 5 }, shopMode: '关联', shopIds: ['s2', 's7'],
    creator: '王越', status: '已暂停', createdAt: '2026-07-22 18:03',
  },
  {
    id: 'at-05', name: '视频号滞销款循环下架', kind: '自动下架', method: '循环',
    cycle: '每天', cycleTime: '03:00', shopMode: '关联', shopIds: ['v2'],
    creator: '王越', status: '进行中', createdAt: '2026-08-25 09:40',
  },
  {
    id: 'at-06', name: '搬家-雅集臻品爆款裂变', kind: '搬家', method: '一次性',
    cond: { days: 30, sales: 100 }, shopMode: '裂变', shopIds: ['v1', 'v2', 'v3'],
    creator: '七妮妮', status: '已完成', createdAt: '2026-08-18 11:26',
  },
  {
    id: 'at-07', name: '下架-义乌日用家居超期款', kind: '自动下架', method: '一次性',
    cond: { days: 180, sales: 3 }, shopMode: '关联', shopIds: ['s5'],
    creator: '李珊珊', status: '未开始', createdAt: '2026-09-05 14:12',
  },
  {
    id: 'at-08', name: '动销裂变-淘系C店至视频号', kind: '搬家', method: '条件触发',
    cond: { days: 14, sales: 30 }, shopMode: '裂变', shopIds: ['v2', 'v3'],
    creator: '李珊珊', status: '已暂停', createdAt: '2026-07-30 14:55',
  },
];
