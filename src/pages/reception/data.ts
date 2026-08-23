/* =========================================================
   聚合接待（宝妈接待）· 数据层
   按线上演示页逐字转录：22 客服 / 4 分组 / 公司汇总 / 6 策略卡
   ========================================================= */

export const RC_COMPANY = '宝妈接待有限公司';
export const RC_GROUPS = ['宝妈一组', '宝妈二组', '宝妈三组', '宝妈四组'] as const;
export type RcGroup = (typeof RC_GROUPS)[number];
export type RcStatus = '在线' | '小休' | '离线';

/* ---------- 客服（线上表格 22 行逐字转录） ---------- */
export interface RcAgent {
  id: number;
  name: string;
  group: RcGroup;
  status: RcStatus;
  /** AI接待量 */
  ai: number;
  /** 人工接待量 */
  human: number;
  /** 均响（秒） */
  resp: number;
  /** 未回复 */
  unreplied: number;
  /** 3分钟回复率 % */
  r3m: number;
  /** 30秒响应率 % */
  r30s: number;
  /** 在线时长（小时） */
  hours: number;
  /** 接待排名 */
  rank: number;
  /** 策略状态 */
  strategy: boolean;
}

export const RC_AGENTS: RcAgent[] = [
  { id: 1, name: '王强', group: '宝妈一组', status: '小休', ai: 23, human: 21, resp: 2, unreplied: 7, r3m: 67, r30s: 67, hours: 10, rank: 4, strategy: true },
  { id: 2, name: '刘芳', group: '宝妈一组', status: '在线', ai: 45, human: 89, resp: 9, unreplied: 1, r3m: 45, r30s: 45, hours: 20, rank: 3, strategy: true },
  { id: 3, name: '陈浩', group: '宝妈一组', status: '离线', ai: 11, human: 45, resp: 1, unreplied: 9, r3m: 89, r30s: 89, hours: 30, rank: 2, strategy: false },
  { id: 4, name: '赵敏', group: '宝妈一组', status: '小休', ai: 68, human: 66, resp: 5, unreplied: 4, r3m: 12, r30s: 12, hours: 40, rank: 1, strategy: true },
  { id: 5, name: '吴婷', group: '宝妈二组', status: '离线', ai: 34, human: 94, resp: 8, unreplied: 2, r3m: 34, r30s: 34, hours: 8, rank: 5, strategy: false },
  { id: 6, name: '徐磊', group: '宝妈二组', status: '小休', ai: 57, human: 37, resp: 4, unreplied: 8, r3m: 58, r30s: 56, hours: 6, rank: 6, strategy: true },
  { id: 7, name: '孙莉', group: '宝妈二组', status: '在线', ai: 82, human: 58, resp: 6, unreplied: 5, r3m: 91, r30s: 91, hours: 6, rank: 7, strategy: true },
  { id: 8, name: '高原', group: '宝妈二组', status: '在线', ai: 40, human: 52, resp: 5, unreplied: 2, r3m: 70, r30s: 70, hours: 15, rank: 8, strategy: true },
  { id: 9, name: '林晓芸', group: '宝妈二组', status: '小休', ai: 29, human: 41, resp: 4, unreplied: 3, r3m: 62, r30s: 61, hours: 12, rank: 9, strategy: true },
  { id: 10, name: '马超', group: '宝妈二组', status: '离线', ai: 8, human: 20, resp: 2, unreplied: 6, r3m: 40, r30s: 39, hours: 5, rank: 10, strategy: true },
  { id: 11, name: '周洁', group: '宝妈三组', status: '在线', ai: 61, human: 70, resp: 5, unreplied: 2, r3m: 82, r30s: 82, hours: 25, rank: 11, strategy: true },
  { id: 12, name: '郑爽', group: '宝妈三组', status: '小休', ai: 33, human: 48, resp: 4, unreplied: 4, r3m: 64, r30s: 64, hours: 14, rank: 12, strategy: true },
  { id: 13, name: '汪洋', group: '宝妈三组', status: '在线', ai: 52, human: 63, resp: 6, unreplied: 1, r3m: 77, r30s: 77, hours: 22, rank: 13, strategy: true },
  { id: 14, name: '冯雪', group: '宝妈三组', status: '离线', ai: 6, human: 18, resp: 1, unreplied: 8, r3m: 18, r30s: 18, hours: 4, rank: 20, strategy: false },
  { id: 15, name: '蒋芸', group: '宝妈三组', status: '在线', ai: 70, human: 80, resp: 4, unreplied: 1, r3m: 90, r30s: 90, hours: 28, rank: 14, strategy: true },
  { id: 16, name: '沈月', group: '宝妈三组', status: '小休', ai: 26, human: 40, resp: 3, unreplied: 5, r3m: 55, r30s: 55, hours: 10, rank: 16, strategy: true },
  { id: 17, name: '韩磊', group: '宝妈三组', status: '在线', ai: 48, human: 59, resp: 5, unreplied: 2, r3m: 71, r30s: 71, hours: 19, rank: 15, strategy: true },
  { id: 18, name: '曹颖', group: '宝妈三组', status: '离线', ai: 9, human: 22, resp: 2, unreplied: 7, r3m: 26, r30s: 26, hours: 6, rank: 21, strategy: true },
  { id: 19, name: '谢娜', group: '宝妈三组', status: '在线', ai: 66, human: 74, resp: 5, unreplied: 1, r3m: 88, r30s: 88, hours: 26, rank: 17, strategy: true },
  { id: 20, name: '邓超', group: '宝妈三组', status: '小休', ai: 30, human: 44, resp: 4, unreplied: 4, r3m: 49, r30s: 49, hours: 12, rank: 18, strategy: false },
  { id: 21, name: '杨幂', group: '宝妈四组', status: '在线', ai: 55, human: 66, resp: 5, unreplied: 2, r3m: 84, r30s: 84, hours: 24, rank: 19, strategy: true },
  { id: 22, name: '秦岚', group: '宝妈四组', status: '小休', ai: 31, human: 45, resp: 4, unreplied: 3, r3m: 57, r30s: 57, hours: 13, rank: 22, strategy: true },
];

export const rcAgentLabel = (a: RcAgent) => `${a.name}（${a.group}）`;

/* ---------- 汇总口径（数量列实时聚合；均响/比率/排名按线上转录固定） ---------- */
export interface RcSum { ai: number; human: number; resp: number; unreplied: number; r3m: number; r30s: number; hours: number; rank: number }

const RC_GROUP_SUM_FIXED: Record<RcGroup, Pick<RcSum, 'resp' | 'r3m' | 'r30s' | 'rank'>> = {
  宝妈一组: { resp: 4, r3m: 53, r30s: 53, rank: 1 },
  宝妈二组: { resp: 5, r3m: 59, r30s: 59, rank: 2 },
  宝妈三组: { resp: 4, r3m: 62, r30s: 62, rank: 3 },
  宝妈四组: { resp: 5, r3m: 71, r30s: 71, rank: 4 },
};
const RC_COMPANY_SUM_FIXED: Pick<RcSum, 'resp' | 'r3m' | 'r30s' | 'rank'> = { resp: 4, r3m: 60, r30s: 60, rank: 1 };

const rcTotalsOf = (list: RcAgent[]) => list.reduce(
  (t, a) => ({ ai: t.ai + a.ai, human: t.human + a.human, unreplied: t.unreplied + a.unreplied, hours: t.hours + a.hours }),
  { ai: 0, human: 0, unreplied: 0, hours: 0 },
);

export const rcGroupSumOf = (group: RcGroup, agents: RcAgent[]): RcSum => ({ ...rcTotalsOf(agents.filter((a) => a.group === group)), ...RC_GROUP_SUM_FIXED[group] });
export const rcCompanySumOf = (agents: RcAgent[]): RcSum => ({ ...rcTotalsOf(agents), ...RC_COMPANY_SUM_FIXED });

/* ---------- 分组策略状态初始值（线上：一/二/三组开，四组关） ---------- */
export const RC_GROUP_STRATEGY_INIT: Record<RcGroup, boolean> = { 宝妈一组: true, 宝妈二组: true, 宝妈三组: true, 宝妈四组: false };

/* ---------- 智能分流策略卡（线上 6 张逐字转录） ---------- */
export interface RcStrategy {
  id: number;
  name: string;
  group: RcGroup;
  on: boolean;
  tags: ('自营' | '下发')[];
  /** 会话次数 */
  sessions: number;
  /** 店铺数量 */
  shops: number;
  /** 包含人数 */
  people: number;
  /** 系列编码数量 */
  codes: number;
  /** 优先级 */
  priority: number;
}

export const RC_STRATEGIES: RcStrategy[] = [
  { id: 22, name: '王强/宝妈一组', group: '宝妈一组', on: true, tags: ['自营', '下发'], sessions: 174, shops: 3, people: 4, codes: 0, priority: 1 },
  { id: 23, name: '刘芳/宝妈一组', group: '宝妈一组', on: true, tags: ['自营'], sessions: 892, shops: 3, people: 4, codes: 0, priority: 2 },
  { id: 24, name: '吴婷/宝妈二组', group: '宝妈二组', on: true, tags: ['下发'], sessions: 7764, shops: 2, people: 6, codes: 0, priority: 1 },
  { id: 25, name: '徐磊/宝妈二组', group: '宝妈二组', on: false, tags: ['下发'], sessions: 0, shops: 2, people: 6, codes: 0, priority: 3 },
  { id: 26, name: '周洁/宝妈三组', group: '宝妈三组', on: true, tags: ['下发'], sessions: 12027, shops: 1, people: 10, codes: 0, priority: 6 },
  { id: 27, name: '杨幂/宝妈四组', group: '宝妈四组', on: true, tags: ['下发'], sessions: 15646, shops: 1, people: 2, codes: 0, priority: 1 },
];

/* ---------- 转移会话：目标客服选项序列（线上 27 项原顺序） ---------- */
export const rcTargetOptions = (agents: RcAgent[]): string[] => [
  RC_COMPANY,
  ...RC_GROUPS.flatMap((g) => [g, ...agents.filter((a) => a.group === g).map(rcAgentLabel)]),
];

/* ---------- 值班监控：时间指标（王强为线上实测值，其余按 ID 种子确定生成） ---------- */
export interface RcDuty { online: number; rest: number; offline: number; login: number; logout: number; wsOn: number; wsOff: number }

const seedRand = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const rcDutyOf = (a: RcAgent): RcDuty => {
  if (a.id === 1) return { online: 4.78, rest: 0.08, offline: 19.14, login: 4.97, logout: 19.03, wsOn: 4.36, wsOff: 19.64 };
  const r = seedRand(a.id * 7919);
  const online = +(1 + r() * 9).toFixed(2);
  const rest = +(r() * 1.5).toFixed(2);
  const login = +(online + r() * 1.5).toFixed(2);
  const wsOn = +(Math.max(0.2, online - r() * 1.2)).toFixed(2);
  return { online, rest, offline: +(24 - online - rest).toFixed(2), login, logout: +(24 - login).toFixed(2), wsOn, wsOff: +(24 - wsOn).toFixed(2) };
};

/* ---------- 值班监控：24h 时间轴分段（ID 种子确定生成） ---------- */
export interface RcSeg { from: number; to: number; cls: string }
export interface RcTimeline { duty: RcSeg[]; login: RcSeg[]; ws: RcSeg[] }

const laneOf = (seed: number, pool: string[]): RcSeg[] => {
  const r = seedRand(seed);
  const segs: RcSeg[] = [];
  let cur = r() * 2.5;
  while (cur < 24) {
    const len = 1 + r() * 5;
    const to = Math.min(24, cur + len);
    segs.push({ from: cur, to, cls: pool[Math.floor(r() * pool.length)] });
    cur = to + r() * 1.8;
  }
  return segs;
};

export const rcTimelineOf = (a: RcAgent): RcTimeline => ({
  duty: laneOf(a.id * 31 + 1, ['on', 'rest', 'off']),
  login: laneOf(a.id * 31 + 2, ['in', 'out']),
  ws: laneOf(a.id * 31 + 3, ['on', 'off']),
});

/* ---------- CSV 导出（表头与线上逐字一致，带 BOM） ---------- */
export const rcCsvOf = (list: RcAgent[]): string => {
  const head = '所属公司,分组,客服,接待状态,AI接待量,人工接待量,均响,未回复,3分钟回复率,30秒响应率,在线时长,接待排名,策略状态';
  const rows = list.map((a) => [
    RC_COMPANY, a.group, a.name, a.status, a.ai, a.human, `${a.resp}s`, a.unreplied, `${a.r3m}%`, `${a.r30s}%`, a.hours, a.rank, a.strategy ? '启用' : '禁用',
  ].join(','));
  return `\ufeff${[head, ...rows].join('\n')}`;
};
