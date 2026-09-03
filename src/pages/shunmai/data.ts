/**
 * 顺买商机 - 数据层
 * 与业务层解耦：设备连接态、账号登录态、抓取任务、抓取数据各自独立
 */

export type SmTaskStatus = 'pending' | 'running' | 'success' | 'fail';
export interface SmTask {
  id: string;
  /** 任务名称 */
  name: string;
  /** 搜索主题 */
  topic: string;
  /** 抓取条数（目标总数） */
  targetCount: number;
  status: SmTaskStatus;
  /** 已成功抓取条数 */
  successCount: number;
  /** 抓取失败条数 */
  failCount: number;
  createdAt: string;
  /** 开始执行时间 */
  startedAt?: string;
  /** 执行结束时间 */
  finishedAt?: string;
}

export type SmRecordStatus = 'success' | 'fail';
export interface SmRecord {
  id: string;
  /** 平台 */
  platform: string;
  /** 商品标题 */
  title: string;
  /** 顺买价 */
  price: number;
  /** 店铺名称 */
  shop: string;
  /** 抓取人 */
  scraper: string;
  /** 抓取时间 */
  time: string;
  status: SmRecordStatus;
  /** 所属任务 ID */
  taskId?: string;
}

export interface SmDevice {
  connected: boolean;
  name: string;
  lastHeartbeat: string;
}

export interface SmAccount {
  loggedIn: boolean;
  name: string;
  authExpiredAt: string;
}

export const SM_TASK_STATUS_META: Record<SmTaskStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待抓取', color: '#667080', bg: '#f2f4f7' },
  running: { label: '抓取中', color: '#2563eb', bg: '#eef4ff' },
  success: { label: '已完成', color: '#16a34a', bg: '#ecfdf3' },
  fail: { label: '失败', color: '#dc2626', bg: '#fef2f2' },
};

export const SM_RECORD_STATUS_META: Record<SmRecordStatus, { label: string; color: string }> = {
  success: { label: '成功', color: '#16a34a' },
  fail: { label: '失败', color: '#dc2626' },
};

export const smTasksSeed: SmTask[] = [
  { id: 'T001', name: '纯棉打底T恤抓取', topic: '纯棉打底T恤', targetCount: 36, status: 'success', successCount: 30, failCount: 6, createdAt: '2026-09-01 10:23', startedAt: '2026-09-01 10:24', finishedAt: '2026-09-01 10:40' },
  { id: 'T002', name: '法式碎花连衣裙抓取', topic: '法式碎花连衣裙', targetCount: 50, status: 'running', successCount: 31, failCount: 0, createdAt: '2026-09-02 14:05', startedAt: '2026-09-02 14:06' },
  { id: 'T003', name: '高腰阔腿牛仔裤抓取', topic: '高腰阔腿牛仔裤', targetCount: 40, status: 'pending', successCount: 0, failCount: 0, createdAt: '2026-09-03 09:17' },
  { id: 'T004', name: '工装夹克外套抓取', topic: '工装夹克外套', targetCount: 30, status: 'fail', successCount: 12, failCount: 4, createdAt: '2026-09-03 11:42', startedAt: '2026-09-03 11:43', finishedAt: '2026-09-03 11:50' },
];

export const smRecordsSeed: SmRecord[] = [
  { id: 'R001', platform: '淘宝顺买', title: '无印良品毛巾超强吸水速干7A抗菌', price: 14.8, shop: '天猫无印良品赫图专卖店', scraper: '白语', time: '2026-09-03 16:04:32', status: 'success', taskId: 'T001' },
  { id: 'R002', platform: '淘宝顺买', title: '【秋冬养护】滋润补水润唇膏正品', price: 2.9, shop: '天猫健美创研官方旗舰店', scraper: '白语', time: '2026-09-03 16:04:32', status: 'success', taskId: 'T001' },
  { id: 'R003', platform: '淘宝顺买', title: '山姆同款软毛加宽深洁牙刷', price: 3.58, shop: '淘宝名汇百货10店', scraper: '白语', time: '2026-09-03 16:04:21', status: 'fail', taskId: 'T001' },
  { id: 'R004', platform: '淘宝顺买', title: '比比赞_原米芡实糕15包_健康糕点', price: 5.1, shop: '天猫比比赞旗舰店', scraper: '白语', time: '2026-09-03 16:04:21', status: 'success', taskId: 'T002' },
  { id: 'R005', platform: '淘宝顺买', title: '【肖战同款】舒客冷光美白牙膏', price: 7.9, shop: '天猫saky舒客专卖店', scraper: '白语', time: '2026-09-02 14:51:21', status: 'fail', taskId: 'T004' },
];

export const smDeviceSeed: SmDevice = {
  connected: true,
  name: 'iPhone 15 Pro（顺买助手）',
  lastHeartbeat: '2026-09-03 12:00',
};

export const smAccountSeed: SmAccount = {
  loggedIn: true,
  name: 'tb_shop_001',
  authExpiredAt: '2026-09-10 12:00',
};

/** 生成任务 ID：SM + 时间戳后四位 + 随机两位 */
export const genTaskId = () => {
  const now = Date.now().toString().slice(-4);
  const rand = Math.floor(Math.random() * 90 + 10);
  return `SM${now}${rand}`;
};

const SM_SHOPS = ['天猫无印良品赫图专卖店', '天猫健美创研官方旗舰店', '淘宝名汇百货10店', '天猫比比赞旗舰店', '天猫saky舒客专卖店'];
const SM_SUFFIXES = ['男款', '女款', '经典款', '新款'];
const SM_SCRAPERS = ['白语', '顺买助手'];

/** 为任务生成单条抓取记录 */
export const makeRecord = (task: SmTask, ok: boolean): SmRecord => ({
  id: `R${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 900 + 100)}`,
  platform: '淘宝顺买',
  title: `${task.topic}${SM_SUFFIXES[Math.floor(Math.random() * SM_SUFFIXES.length)]}`,
  price: Math.round((Math.random() * 20 + 1) * 100) / 100,
  shop: SM_SHOPS[Math.floor(Math.random() * SM_SHOPS.length)],
  scraper: SM_SCRAPERS[Math.floor(Math.random() * SM_SCRAPERS.length)],
  time: nowTime(),
  status: ok ? 'success' : 'fail',
  taskId: task.id,
});

/** 当前格式化时间 */
export const nowTime = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
