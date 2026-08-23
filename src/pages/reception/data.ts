/* =========================================================
   聚合接待（宝妈接待）· 数据层
   多公司：3 公司 / 36 客服 / 公司·分组汇总 / 6 策略卡
   ========================================================= */

export const RC_COMPANY = '宝妈接待有限公司';
export const RC_COMPANY2 = '天猫接待有限公司';
export const RC_COMPANY3 = '星辰接待有限公司';
export const RC_COMPANIES = [RC_COMPANY, RC_COMPANY2, RC_COMPANY3];

export const RC_GROUPS = ['宝妈一组', '宝妈二组', '宝妈三组', '宝妈四组'] as const;
export type RcGroup = string;
export type RcStatus = '在线' | '小休' | '离线';

/** 各公司下属分组（有序） */
export const RC_COMPANY_GROUPS: Record<string, string[]> = {
  [RC_COMPANY]: [...RC_GROUPS],
  [RC_COMPANY2]: ['天猫一组', '天猫二组'],
  [RC_COMPANY3]: ['星辰一组', '星辰二组'],
};
export const RC_ALL_GROUPS = RC_COMPANIES.flatMap((c) => RC_COMPANY_GROUPS[c] ?? []);

/* ---------- 客服 ---------- */
export interface RcAgent {
  id: number;
  company: string;
  name: string;
  group: string;
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
  /** 接待排名（公司内） */
  rank: number;
  /** 策略状态 */
  strategy: boolean;
}

const ag = (
  company: string, id: number, name: string, group: string, status: RcStatus,
  ai: number, human: number, resp: number, unreplied: number,
  r3m: number, r30s: number, hours: number, rank: number, strategy: boolean,
): RcAgent => ({ company, id, name, group, status, ai, human, resp, unreplied, r3m, r30s, hours, rank, strategy });

export const RC_AGENTS: RcAgent[] = [
  /* 宝妈接待有限公司（线上 22 行逐字转录） */
  ag(RC_COMPANY, 1, '王强', '宝妈一组', '小休', 23, 21, 2, 7, 67, 67, 10, 4, true),
  ag(RC_COMPANY, 2, '刘芳', '宝妈一组', '在线', 45, 89, 9, 1, 45, 45, 20, 3, true),
  ag(RC_COMPANY, 3, '陈浩', '宝妈一组', '离线', 11, 45, 1, 9, 89, 89, 30, 2, false),
  ag(RC_COMPANY, 4, '赵敏', '宝妈一组', '小休', 68, 66, 5, 4, 12, 12, 40, 1, true),
  ag(RC_COMPANY, 5, '吴婷', '宝妈二组', '离线', 34, 94, 8, 2, 34, 34, 8, 5, false),
  ag(RC_COMPANY, 6, '徐磊', '宝妈二组', '小休', 57, 37, 4, 8, 58, 56, 6, 6, true),
  ag(RC_COMPANY, 7, '孙莉', '宝妈二组', '在线', 82, 58, 6, 5, 91, 91, 6, 7, true),
  ag(RC_COMPANY, 8, '高原', '宝妈二组', '在线', 40, 52, 5, 2, 70, 70, 15, 8, true),
  ag(RC_COMPANY, 9, '林晓芸', '宝妈二组', '小休', 29, 41, 4, 3, 62, 61, 12, 9, true),
  ag(RC_COMPANY, 10, '马超', '宝妈二组', '离线', 8, 20, 2, 6, 40, 39, 5, 10, true),
  ag(RC_COMPANY, 11, '周洁', '宝妈三组', '在线', 61, 70, 5, 2, 82, 82, 25, 11, true),
  ag(RC_COMPANY, 12, '郑爽', '宝妈三组', '小休', 33, 48, 4, 4, 64, 64, 14, 12, true),
  ag(RC_COMPANY, 13, '汪洋', '宝妈三组', '在线', 52, 63, 6, 1, 77, 77, 22, 13, true),
  ag(RC_COMPANY, 14, '冯雪', '宝妈三组', '离线', 6, 18, 1, 8, 18, 18, 4, 20, false),
  ag(RC_COMPANY, 15, '蒋芸', '宝妈三组', '在线', 70, 80, 4, 1, 90, 90, 28, 14, true),
  ag(RC_COMPANY, 16, '沈月', '宝妈三组', '小休', 26, 40, 3, 5, 55, 55, 10, 16, true),
  ag(RC_COMPANY, 17, '韩磊', '宝妈三组', '在线', 48, 59, 5, 2, 71, 71, 19, 15, true),
  ag(RC_COMPANY, 18, '曹颖', '宝妈三组', '离线', 9, 22, 2, 7, 26, 26, 6, 21, true),
  ag(RC_COMPANY, 19, '谢娜', '宝妈三组', '在线', 66, 74, 5, 1, 88, 88, 26, 17, true),
  ag(RC_COMPANY, 20, '邓超', '宝妈三组', '小休', 30, 44, 4, 4, 49, 49, 12, 18, false),
  ag(RC_COMPANY, 21, '杨幂', '宝妈四组', '在线', 55, 66, 5, 2, 84, 84, 24, 19, true),
  ag(RC_COMPANY, 22, '秦岚', '宝妈四组', '小休', 31, 45, 4, 3, 57, 57, 13, 22, true),
  /* 天猫接待有限公司 */
  ag(RC_COMPANY2, 101, '苏芮', '天猫一组', '在线', 60, 72, 4, 2, 80, 80, 22, 1, true),
  ag(RC_COMPANY2, 102, '陆遥', '天猫一组', '小休', 44, 51, 5, 4, 63, 62, 14, 3, true),
  ag(RC_COMPANY2, 103, '宋倩', '天猫一组', '在线', 52, 64, 4, 2, 74, 74, 20, 2, true),
  ag(RC_COMPANY2, 104, '胡歌', '天猫一组', '离线', 15, 30, 2, 6, 45, 44, 6, 6, false),
  ag(RC_COMPANY2, 105, '黄妍', '天猫二组', '在线', 48, 55, 5, 3, 69, 68, 18, 4, true),
  ag(RC_COMPANY2, 106, '金晨', '天猫二组', '小休', 30, 41, 4, 5, 58, 57, 12, 5, true),
  ag(RC_COMPANY2, 107, '潘岳', '天猫二组', '在线', 26, 38, 6, 3, 52, 52, 16, 7, true),
  ag(RC_COMPANY2, 108, '佟娅', '天猫二组', '离线', 9, 21, 2, 7, 30, 30, 5, 8, false),
  /* 星辰接待有限公司 */
  ag(RC_COMPANY3, 201, '秦昊', '星辰一组', '在线', 35, 42, 5, 3, 61, 60, 17, 1, true),
  ag(RC_COMPANY3, 202, '李沁', '星辰一组', '在线', 28, 36, 4, 2, 57, 56, 15, 2, true),
  ag(RC_COMPANY3, 203, '杜江', '星辰一组', '小休', 18, 27, 4, 4, 48, 47, 11, 4, true),
  ag(RC_COMPANY3, 204, '霍燕', '星辰一组', '离线', 7, 16, 2, 6, 28, 28, 4, 6, false),
  ag(RC_COMPANY3, 205, '安熙', '星辰二组', '在线', 24, 31, 5, 3, 54, 53, 13, 3, true),
  ag(RC_COMPANY3, 206, '岳朋', '星辰二组', '小休', 12, 20, 3, 5, 40, 40, 9, 5, false),
];

export const rcAgentLabel = (a: RcAgent) => `${a.name}（${a.group}）`;

/* ---------- 汇总口径（数量列实时聚合；均响/比率有线上转录值时用转录值，其余按成员均值；排名按接待量排序） ---------- */
export interface RcSum { ai: number; human: number; resp: number; unreplied: number; r3m: number; r30s: number; hours: number; rank: number }

const RC_GROUP_SUM_FIXED: Record<string, Pick<RcSum, 'resp' | 'r3m' | 'r30s' | 'rank'>> = {
  宝妈一组: { resp: 4, r3m: 53, r30s: 53, rank: 1 },
  宝妈二组: { resp: 5, r3m: 59, r30s: 59, rank: 2 },
  宝妈三组: { resp: 4, r3m: 62, r30s: 62, rank: 3 },
  宝妈四组: { resp: 5, r3m: 71, r30s: 71, rank: 4 },
};
const RC_COMPANY_SUM_FIXED: Record<string, Pick<RcSum, 'resp' | 'r3m' | 'r30s'>> = {
  [RC_COMPANY]: { resp: 4, r3m: 60, r30s: 60 },
};

const rcTotalsOf = (list: RcAgent[]) => list.reduce(
  (t, a) => ({ ai: t.ai + a.ai, human: t.human + a.human, unreplied: t.unreplied + a.unreplied, hours: t.hours + a.hours }),
  { ai: 0, human: 0, unreplied: 0, hours: 0 },
);

const avgOf = (list: RcAgent[], k: 'resp' | 'r3m' | 'r30s') =>
  (list.length ? Math.round(list.reduce((t, a) => t + a[k], 0) / list.length) : 0);

/** 按接待量（AI+人工）降序排名 */
const ranksByTotal = (keys: string[], list: RcAgent[], keyOf: (a: RcAgent) => string): Record<string, number> => {
  const sorted = keys
    .map((k) => ({ k, n: list.filter((a) => keyOf(a) === k).reduce((t, a) => t + a.ai + a.human, 0) }))
    .sort((x, y) => y.n - x.n);
  return Object.fromEntries(sorted.map((x, i) => [x.k, i + 1]));
};

export const rcGroupSumOf = (company: string, group: string, agents: RcAgent[]): RcSum => {
  const list = agents.filter((a) => a.company === company && a.group === group);
  const fixed = RC_GROUP_SUM_FIXED[group];
  const ranks = ranksByTotal(RC_COMPANY_GROUPS[company] ?? [], agents.filter((a) => a.company === company), (a) => a.group);
  return {
    ...rcTotalsOf(list),
    resp: fixed?.resp ?? avgOf(list, 'resp'),
    r3m: fixed?.r3m ?? avgOf(list, 'r3m'),
    r30s: fixed?.r30s ?? avgOf(list, 'r30s'),
    rank: fixed?.rank ?? ranks[group] ?? 0,
  };
};

export const rcCompanySumOf = (company: string, agents: RcAgent[]): RcSum => {
  const list = agents.filter((a) => a.company === company);
  const fixed = RC_COMPANY_SUM_FIXED[company];
  return {
    ...rcTotalsOf(list),
    resp: fixed?.resp ?? avgOf(list, 'resp'),
    r3m: fixed?.r3m ?? avgOf(list, 'r3m'),
    r30s: fixed?.r30s ?? avgOf(list, 'r30s'),
    rank: ranksByTotal(RC_COMPANIES, agents, (a) => a.company)[company] ?? 0,
  };
};

/* ---------- 分组策略状态初始值（线上：一/二/三组开，四组关） ---------- */
export const RC_GROUP_STRATEGY_INIT: Record<string, boolean> = { 宝妈一组: true, 宝妈二组: true, 宝妈三组: true, 宝妈四组: false };

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

/* ---------- 转移会话：目标客服选项序列（公司 › 分组 › 客服） ---------- */
export const rcTargetOptions = (agents: RcAgent[]): string[] => RC_COMPANIES.flatMap((c) => [
  c,
  ...(RC_COMPANY_GROUPS[c] ?? []).flatMap((g) => [
    g,
    ...agents.filter((a) => a.company === c && a.group === g).map(rcAgentLabel),
  ]),
]);

/* ---------- 值班监控：时间指标（王强为线上实测值，其余按 ID 种子确定生成） ---------- */
export interface RcDuty { online: number; rest: number; offline: number; login: number; logout: number; wsOn: number; wsOff: number }

const seedRand = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = r + Math.imul(r ^ (r >>> 7), 61 | r) ^ r;
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
    a.company, a.group, a.name, a.status, a.ai, a.human, `${a.resp}s`, a.unreplied, `${a.r3m}%`, `${a.r30s}%`, a.hours, a.rank, a.strategy ? '启用' : '禁用',
  ].join(','));
  return `\ufeff${[head, ...rows].join('\n')}`;
};
