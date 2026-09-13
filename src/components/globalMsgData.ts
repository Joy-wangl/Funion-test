import { computed, ref } from 'vue';

/** 全局站内信：区分应用推送，应用下分「订单消息通知 / 任务完成通知 / 掉店提醒 / 人工介入提醒」四类 */
export type GMsgKind = '订单消息通知' | '任务完成通知' | '掉店提醒' | '人工介入提醒';

export interface GlobalMsg {
  id: string;
  /** 来源应用（第一层分组） */
  app: string;
  /** 消息类别（第二层分组） */
  kind: GMsgKind;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  /** 点击后跳转的顶部 tab key */
  target: string;
  /** 单号/店铺等 kv 信息（可选） */
  kvs?: { k: string; v: string }[];
  /** 掉店提醒前往：目标账号ID（打开店铺管理-管理账号抽屉） */
  acct?: string;
}

/** 第一层 tab：有站内信推送的应用 */
export const GMSG_APPS = ['顺买商机', '蜜蜂插件', '运维管理后台', '智能运营中心'];
/** 第二层 tab：应用下消息类别 */
export const GMSG_KINDS: GMsgKind[] = ['订单消息通知', '任务完成通知', '掉店提醒', '人工介入提醒'];

export const gmsgs = ref<GlobalMsg[]>([
  {
    id: 'gm-1', app: '运维管理后台', kind: '任务完成通知', title: '运维管理后台每日风险品推送通知',
    desc: '今日共 3 个风险品：库存异常 2 个、价格异常 1 个，请及时核查处理',
    time: '2026-09-04 09:00', read: false, target: 'qc-center',
  },
  {
    id: 'gm-2', app: '顺买商机', kind: '订单消息通知', title: '订单消息通知',
    desc: '顺买订单 202609031345 已支付，请在 48 小时内安排发货',
    time: '2026-09-03 13:45', read: false, target: 'shunmai',
    kvs: [{ k: '订单号', v: '202609031345' }, { k: '店铺', v: '天猫Funion旗舰店' }],
  },
  {
    id: 'gm-3', app: '蜜蜂插件', kind: '订单消息通知', title: '订单消息通知',
    desc: '天猫Funion旗舰店 新增 3 笔订单待发货，其中 1 笔存在发货超时风险',
    time: '2026-09-03 10:20', read: false, target: 'bee-plugin',
    kvs: [{ k: '店铺', v: '天猫Funion旗舰店' }, { k: '待发货', v: '3 笔' }],
  },
  {
    id: 'gm-4', app: '顺买商机', kind: '任务完成通知', title: '顺买商机通知',
    desc: '「家居收纳」类目竞价商机更新完成，本次新增 12 条商机',
    time: '2026-09-03 08:00', read: false, target: 'shunmai',
  },
  {
    id: 'gm-5', app: '蜜蜂插件', kind: '任务完成通知', title: '蜜蜂插件任务完成通知',
    desc: '商品发布任务已完成：成功 12 个、失败 0 个，可在任务中心查看详情',
    time: '2026-09-02 18:30', read: true, target: 'bee-plugin',
  },
  {
    id: 'gm-6', app: '顺买商机', kind: '订单消息通知', title: '订单消息通知',
    desc: '顺买订单 202609020879 买家发起退款申请，请在 24 小时内处理',
    time: '2026-09-02 09:12', read: true, target: 'shunmai',
    kvs: [{ k: '订单号', v: '202609020879' }, { k: '店铺', v: 'AAA小店' }],
  },
  /* 掉店提醒：店铺登录掉线（与店铺管理离线口径同源），含平台/店铺名称与提醒内容 */
  {
    id: 'gm-7', app: '智能运营中心', kind: '掉店提醒', title: '掉店提醒',
    desc: '店铺登录状态已掉线，发布任务暂停派发，请及时重新登录恢复在线',
    time: '2026-09-09 08:30', read: false, target: 'ops-center',
    kvs: [{ k: '平台', v: '淘宝' }, { k: '店铺名称', v: '淘系C店-义乌日用家居直供店' }],
    acct: '15742',
  },
  {
    id: 'gm-8', app: '智能运营中心', kind: '掉店提醒', title: '掉店提醒',
    desc: '店铺登录状态已掉线，发布任务暂停派发，请及时重新登录恢复在线',
    time: '2026-09-08 21:12', read: false, target: 'ops-center',
    kvs: [{ k: '平台', v: '淘宝' }, { k: '店铺名称', v: '淘系C店-天天有百货直供店' }],
    acct: '15739',
  },
  /* 人工介入提醒：RPA 发布商品遇验证码等需人工处理场景，含店铺名称/商品名称 */
  {
    id: 'gm-9', app: '智能运营中心', kind: '人工介入提醒', title: '商品发布需人工介入',
    desc: 'RPA 发布商品过程中弹出验证码，发布任务已暂停，请人工完成验证后恢复发布',
    time: '2026-09-11 10:26', read: false, target: 'ops-center',
    kvs: [{ k: '店铺名称', v: '淘系C店-义乌日用家居直供店' }, { k: '商品名称', v: '日式简约桌面收纳盒三件套' }],
  },
  {
    id: 'gm-10', app: '智能运营中心', kind: '人工介入提醒', title: '商品发布需人工介入',
    desc: 'RPA 发布商品过程中弹出验证码，发布任务已暂停，请人工完成验证后恢复发布',
    time: '2026-09-11 09:48', read: false, target: 'ops-center',
    kvs: [{ k: '店铺名称', v: '淘系C店-天天有百货直供店' }, { k: '商品名称', v: '加厚防滑浸塑衣架10支装' }],
  },
]);

/* 掉店提醒「前往」跨组件桥：铃铛发起 → 运营中心切账号管理页 + AccountManagement 打开管理账号抽屉 */
export const shopAcctReq = ref<{ acct: string; nonce: number } | null>(null);
export const requestShopAcct = (acct: string) => { shopAcctReq.value = { acct, nonce: Date.now() }; };

export const gUnreadCount = computed(() => gmsgs.value.filter((m) => !m.read).length);

export const gMarkAll = () => { gmsgs.value.forEach((m) => { m.read = true; }); };

/* 运行期新推送（如 RPA 发布遇验证码触发的人工介入提醒）：id/未读/时间自动生成 */
export const pushGMsg = (m: Omit<GlobalMsg, 'id' | 'read' | 'time'>) => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  gmsgs.value.push({
    ...m,
    id: `gm-${d.getTime()}`,
    read: false,
    time: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`,
  });
};
