/* =========================================================
   接待记录弹窗 · 数据层：会话与聊天消息（公司/分组/客服三维度 + 回复状态）
   回复状态三档：已回复（3 分钟内）/ 3分钟未回复（超 3 分钟才回复）/ 超时未回复（至今未回复）
   派生值按客服 ID 种子确定生成，刷新不变
   ========================================================= */
import type { RcAgent } from './data';

/** 会话回复状态 */
export type RcReplyState = 'replied' | 'min3' | 'timeout';

/** 会话栏状态 tab（含全部） */
export const RC_REPLY_TABS: { key: RcReplyState | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'replied', label: '已回复' },
  { key: 'min3', label: '3分钟未回复' },
  { key: 'timeout', label: '超时未回复' },
];

/** 状态标签文案与色档（绿/橙/红） */
export const RC_REPLY_META: Record<RcReplyState, { label: string; cls: string }> = {
  replied: { label: '已回复', cls: 'ok' },
  min3: { label: '3分钟未回复', cls: 'warn' },
  timeout: { label: '超时未回复', cls: 'bad' },
};

export interface RcOrderInfo { no: string; emoji: string; title: string; price: string }
export interface RcMsg {
  id: string;
  /** buyer 买家（左白泡 + 浅蓝「买」chip）/ bot AI（右浅绿泡 + 「AI」chip）/ agent 客服（右浅蓝泡 + 主色 chip） */
  side: 'buyer' | 'bot' | 'agent';
  text: string;
  /** 消息元信息行时间（日期 + 时分） */
  time: string;
  order?: RcOrderInfo;
  invoice?: boolean;
}
export interface RcSession {
  id: string;
  agentId: number;
  buyer: string;
  /** 会话头平台标签（小写口径，如 pdd） */
  plat: string;
  shop: string;
  /** 会话列表展示时间 */
  time: string;
  /** 会话列表最后一条消息预览 */
  preview: string;
  reply: RcReplyState;
  msgs: RcMsg[];
}

/* ---------- 种子随机（与 reception/data.ts 同族实现，保证派生数据确定可复现） ---------- */
const seedRand = (seed: number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = r + Math.imul(r ^ (r >>> 7), 61 | r) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const PLAT_POOL = ['pdd', 'taobao', 'tmall', 'douyin', 'kuaishou'];
const SHOP_OF: Record<string, string> = {
  pdd: '小二专营店', taobao: '小二的店铺', tmall: '小二旗舰店', douyin: '小二小店', kuaishou: '小二优选店',
};
const BUYER_POOL = [
  '甜心妈咪', '小鹿乱撞', '糯米团子', '晴天娃娃', '柚子茶', '小确幸', '棉花糖', '星星点灯',
  '薄荷微凉', '橘子汽水', '奶茶三分甜', '樱桃小丸子', '月亮邮递员', '草莓味的风', '阳光正好',
];
const GOODS_POOL = [
  { emoji: '🧴', title: '婴幼儿保湿润肤乳 200ml 温和补水' },
  { emoji: '🧸', title: '安抚毛绒玩偶 30cm 生日礼物' },
  { emoji: '👶', title: '纯棉连体哈衣 春秋款 3件装' },
  { emoji: '🍼', title: '防胀气宽口径奶瓶 240ml' },
  { emoji: '🧦', title: '婴儿地板袜 防滑保暖 5双装' },
];

/** 聊天剧本：text=文本轮（买家问→己方答），card=订单卡轮，inv=发票申请卡轮；bot 轮由机器人应答 */
type PlanItem =
  | { kind: 'text'; bot?: boolean; b: string; a: string; ack?: string }
  | { kind: 'card' }
  | { kind: 'inv' };
const PLANS: PlanItem[][] = [
  [
    { kind: 'text', bot: true, b: '在吗？这款润肤乳新生儿可以用吗？', a: '亲亲，这款是温和配方，新生儿也可以用的哦～' },
    { kind: 'text', b: '好的，成分安全吗？宝宝皮肤有点敏感', a: '成分都是食品级的，无香精无酒精，敏感肌宝宝可以放心用哈' },
    { kind: 'card' },
    { kind: 'text', b: '已经拍下了，什么时候发货呀？', a: '亲亲，今天 16 点前付款的订单当天发出哦～' },
  ],
  [
    { kind: 'text', bot: true, b: '你好，请问哈衣有 73 码吗？', a: '有的亲，73/80/90 码都有现货呢' },
    { kind: 'text', b: '面料是纯棉的吗？会不会起球', a: '是 100% 纯棉 A 类面料，经过预缩水处理，不易起球变形的哈' },
    { kind: 'card' },
    { kind: 'text', b: '麻烦帮我开张发票', a: '好的亲，麻烦提供一下发票抬头和税号哦～', ack: '收到，电子发票会在 48 小时内开出并发到您手机上' },
    { kind: 'inv' },
  ],
  [
    { kind: 'text', bot: true, b: '奶瓶是玻璃的吗？会不会容易摔碎', a: '瓶身是高硼硅玻璃的，耐冷耐热，正常清洗不会炸裂哦～' },
    { kind: 'card' },
    { kind: 'text', b: '好的，那我拍两件，有优惠吗？', a: '两件立减 10 元哦，再送奶瓶刷一个～', ack: '好嘞，谢谢亲～' },
  ],
];

const pad2 = (n: number) => `${n}`.padStart(2, '0');
/** 基准分钟数 ± off，跨天时钳制在当天内 */
const hmOf = (base: number, off: number) => {
  const m = Math.max(0, Math.min(23 * 60 + 59, base + off));
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
};
/** 消息元信息行日期（当天，与知识库侧口径一致） */
const RC_NOW = new Date();
const RC_DAY = `${RC_NOW.getFullYear()}-${pad2(RC_NOW.getMonth() + 1)}-${pad2(RC_NOW.getDate())}`;
/** 消息时间：日期 + 时分 */
const dtOf = (base: number, off: number) => `${RC_DAY} ${hmOf(base, off)}`;

const buildSession = (a: RcAgent, si: number, r: () => number): RcSession => {
  const plat = PLAT_POOL[Math.floor(r() * PLAT_POOL.length)];
  const buyer = BUYER_POOL[Math.floor(r() * BUYER_POOL.length)];
  const plan = PLANS[Math.floor(r() * PLANS.length)];
  const base = 8 * 60 + Math.floor(r() * 190);
  const no = `PDD${260907000 + a.id * 100 + si}`;
  const goods = GOODS_POOL[(a.id + si) % GOODS_POOL.length];
  /* 回复状态：约六成按时回复、两成半超 3 分钟才回复、其余至今未回复 */
  const roll = r();
  const reply: RcReplyState = roll < 0.6 ? 'replied' : roll < 0.85 ? 'min3' : 'timeout';

  const msgs: RcMsg[] = [];
  let t = -Math.floor(r() * 4);
  const push = (m: RcMsg) => { msgs.push(m); t += 1 + Math.floor(r() * 3); };
  plan.forEach((it, k) => {
    const key = `rc-${a.id}-${si}-${k}`;
    if (it.kind === 'inv') {
      push({ id: `${key}-inv`, side: 'buyer', text: '申请发票', time: dtOf(base, t), invoice: true });
      return;
    }
    if (it.kind === 'card') {
      push({
        id: `${key}-ord`, side: 'buyer', text: '[订单消息]',
        time: dtOf(base, t),
        order: { no, emoji: goods.emoji, title: goods.title, price: '¥2.80' },
      });
      return;
    }
    push({ id: `${key}-b`, side: 'buyer', text: it.b, time: dtOf(base, t) });
    push({ id: `${key}-a`, side: it.bot ? 'bot' : 'agent', text: it.a, time: dtOf(base, t) });
    if (it.ack) push({ id: `${key}-k`, side: 'buyer', text: it.ack, time: dtOf(base, t) });
  });

  /* 已回复/超3分钟：末尾若停在买家（确认语/发票申请），补一条客服收尾回复，保证会话以己方应答结束 */
  if (reply !== 'timeout' && msgs[msgs.length - 1].side === 'buyer') {
    push({
      id: `rc-${a.id}-${si}-end`, side: 'agent',
      text: '亲亲，这边已经为您处理好了哦，还有其他问题随时找我～',
      time: dtOf(base, t),
    });
  }

  /* 超时未回复：截到最后一条买家消息为止（人工始终未应答） */
  let list = msgs;
  if (reply === 'timeout') {
    for (let i = msgs.length - 1; i >= 0; i -= 1) {
      if (msgs[i].side === 'buyer') { list = msgs.slice(0, i + 1); break; }
    }
  }
  const last = list[list.length - 1];
  return {
    id: `rc-${a.id}-${si}`,
    agentId: a.id,
    buyer,
    plat,
    shop: SHOP_OF[plat],
    time: hmOf(base, t - 1 - Math.floor(r() * 3)),
    preview: last.order ? '[订单消息]' : last.text,
    reply,
    msgs: list,
  };
};

const sessionsCache = new Map<number, RcSession[]>();
/** 客服全部会话（按时间倒序，新会话在前） */
export const rcSessionsOf = (a: RcAgent): RcSession[] => {
  const hit = sessionsCache.get(a.id);
  if (hit) return hit;
  const r = seedRand(a.id * 31337);
  const n = 8 + (a.id % 5);
  const list = Array.from({ length: n }, (_, i) => buildSession(a, i + 1, r));
  list.sort((x, y) => (x.time < y.time ? 1 : -1));
  sessionsCache.set(a.id, list);
  return list;
};
