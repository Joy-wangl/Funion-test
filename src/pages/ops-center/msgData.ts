import { computed, ref } from 'vue';
import { sgProducts, SG_OFF_GROUP, SG_WARN_TYPES } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';

/** 消息通知：仅推送五类预警下架消息；第一层按下架运营组（风控自动下架/平台下架）、第二层按预警类型切换 */
export interface OpsMsg {
  id: string;
  /** 预警类型 = 下架类型本名（五类之一） */
  warnType: string;
  /** 下架运营组：平台下架 / 风控自动下架 */
  group: string;
  /** 关联商品（含平台/店铺/主图，面板集成展示） */
  p: SgProduct;
  time: string;
  read: boolean;
}

/* 数据源与列表页同源：取视频号五类预警商品 */
const vn = sgProducts['视频号'];
const byId = (id: string) => vn.find((x) => x.id === id)!;
const offMsg = (id: string, read: boolean): OpsMsg => {
  const p = byId(id);
  return { id: `m-${id}`, warnType: p.offType!, group: SG_OFF_GROUP[p.offType!], p, time: p.offTime ?? '', read };
};

/* 按时间倒序排列 */
export const msgs = ref<OpsMsg[]>([
  offMsg('8888777776678', false),
  offMsg('8888777776677', false),
  offMsg('8888777776674', false),
  offMsg('8888777776675', true),
  offMsg('8888777776676', true),
]);

export const unreadCount = computed(() => msgs.value.filter((m) => !m.read).length);

/** 第一层 tab：下架运营组（仅有预警的两组） */
export const MSG_GROUPS: string[] = ['风控自动下架', '平台下架'];
/** 第二层 tab：组内预警类型（五类枚举，不得自造） */
export const warnTypesOf = (group: string) => SG_WARN_TYPES.filter((t) => SG_OFF_GROUP[t] === group);
