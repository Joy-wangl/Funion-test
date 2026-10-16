import { computed, ref } from 'vue';
import { sgProducts } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';
import { amRows, type AmRow } from '../permission/accountData';

/** 消息通知：三类消息（商品下架预警 / 店铺预警 / 账号掉线通知）；第一层按消息类型、第二层按预警类型切换 */
export type MsgKind = 'goods' | 'shop' | 'acct';

export interface OpsMsg {
  id: string;
  /** 消息类型：goods=商品下架预警 shop=店铺预警 acct=账号掉线通知 */
  kind: MsgKind;
  /** 预警/通知类型本名 */
  warnType: string;
  /** 卡片左上角标签（店铺预警=采集失败、账号掉线=掉线；商品下架不展示标签） */
  tag?: string;
  /** 商品下架关联商品（含平台/店铺/主图，面板集成展示） */
  p?: SgProduct;
  /** 店铺预警 / 账号掉线 归属与正文 */
  shopName?: string;
  shopId?: string;
  acctName?: string;
  login?: string;
  acctType?: string;
  platform?: string;
  reason?: string;
  time: string;
  read: boolean;
}

/* 商品下架预警：数据源与列表页同源，取视频号五类预警商品 */
const vn = sgProducts['视频号'];
const byId = (id: string) => vn.find((x) => x.id === id)!;
const offMsg = (id: string, read: boolean): OpsMsg => {
  const p = byId(id);
  return { id: `m-${id}`, kind: 'goods', warnType: p.offType!, p, time: p.offTime ?? '', read };
};

/* 店铺预警：违规预警采集失败（店铺登录态/采集通道异常） */
const shopWarn = (shopName: string, shopId: string, reason: string, read: boolean): OpsMsg =>
  ({ id: `ms-${shopId}`, kind: 'shop', warnType: '违规预警采集失败', tag: '采集失败', shopName, shopId, reason, time: '2026-10-16 15:00', read });

/* 账号掉线通知：与账号管理离线口径同源（amRows status=offline） */
const acctMsg = (r: AmRow, read: boolean): OpsMsg =>
  ({ id: `ma-${r.acctId}`, kind: 'acct', warnType: '账号掉线', tag: '掉线', platform: r.platform, acctName: r.name, login: r.login, acctType: r.acctType, reason: '账号登录态已失效，发布与采集任务暂停派发，请及时重新登录恢复在线', time: r.updatedAt, read });

/* 按时间倒序排列 */
export const msgs = ref<OpsMsg[]>([
  offMsg('8888777776678', false),
  offMsg('8888777776677', false),
  offMsg('8888777776674', false),
  offMsg('8888777776675', true),
  offMsg('8888777776676', true),
  shopWarn('瑞气盈门百货', '15810', '微信小店后台提示“登录超时，请重新登录”，需通过“进入后台”重新扫码登录后恢复采集', false),
  shopWarn('惠选居家日用百货', '15809', '微信小店后台提示“登录超时，请重新登录”，需通过“进入后台”重新扫码登录后恢复采集', false),
  shopWarn('朋意想观小店', '13715', 'Union 登录态缺少 Cookie（店铺账号 13905），需先补齐登录 Cookie 后恢复采集', false),
  ...amRows.value.filter((r) => r.status === 'offline').map((r, i) => acctMsg(r, i > 2)),
].sort((a, b) => b.time.localeCompare(a.time)));

export const unreadCount = computed(() => msgs.value.filter((m) => !m.read).length);
