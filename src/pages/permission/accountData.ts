/* =========================================================
   权限设置 › 账号管理 数据层：账号清单（卖家/买家）与在线状态
   离线（掉店）计数同源共享：账号管理页状态 tab + 运营中心侧边栏未读徽标（权限设置组 / 账号管理项）
   ========================================================= */
import { computed, ref } from 'vue';

export interface AmRow {
  acctId: string;
  /** 店铺ID：仅卖家账号有店铺归属；买家账号为空不展示 */
  shopId: string;
  /** 店铺名称口径：卖家账号对应店铺（与发布到抽屉店铺同名），买家账号为空 */
  shopName?: string;
  platform: string;
  /** 账号名称（卖家=店铺名口径；买家=采购号名称） */
  name: string;
  /** 登录账号（主账号 或 主账号:成员） */
  login: string;
  acctType: '买家账号' | '卖家账号';
  status: 'online' | 'offline';
  /** 账号更新时间 */
  updatedAt: string;
}

/* 静态行（卖家账号带店铺ID；买家账号无店铺ID；掉店提醒桥接 15742/15739 为离线买家账号） */
export const amRows = ref<AmRow[]>([
  { acctId: '15769', shopId: '305428412', shopName: '環球甄选好物店', platform: '淘宝', name: '淘系C店-環球甄选好物店', login: 'tb6688087462', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-11 08:12' },
  { acctId: '15768', shopId: '269190799', shopName: '一点就到百货', platform: '淘宝', name: '淘系C店-一点就到百货', login: 'frand956666:小孔', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-11 07:58' },
  { acctId: '15753', shopId: '319800402', shopName: '泰有钱百货店', platform: '淘宝', name: '淘系C店-泰有钱百货店', login: 'tb709930255172:熊博韬', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-10 22:41' },
  { acctId: '15741', shopId: '15074719', shopName: '义乌日用家居直供店', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', login: '义乌日用家居直供店:奉天', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-10 19:05' },
  { acctId: '15740', shopId: '15074719', shopName: '义乌日用家居直供店', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', login: '义乌日用家居直供店:八一', acctType: '卖家账号', status: 'offline', updatedAt: '2026-09-09 18:26' },
  { acctId: '15771', shopId: '269190811', shopName: '万福日用百货', platform: '淘宝', name: '淘系C店-万福日用百货', login: 'wanfu6688:周梦琪', acctType: '卖家账号', status: 'offline', updatedAt: '2026-09-09 12:03' },
  { acctId: '15770', shopId: '319800517', shopName: '云朵礼遇', platform: '淘宝', name: '淘系C店-云朵礼遇', login: 'yunduo3366:陈彝', acctType: '卖家账号', status: 'offline', updatedAt: '2026-09-08 16:44' },
  { acctId: '15767', shopId: '', platform: '淘宝', name: '悦勤家居采购号', login: '狂宠每个热粉:孔意飞', acctType: '买家账号', status: 'offline', updatedAt: '2026-09-09 08:30' },
  { acctId: '15742', shopId: '', platform: '淘宝', name: '义乌日用家居采购号', login: '义乌日用家居直供店:乐游原', acctType: '买家账号', status: 'offline', updatedAt: '2026-09-09 08:30' },
  { acctId: '15739', shopId: '', platform: '淘宝', name: '天天有百货采购号', login: '天天有百货直供店:梓昌', acctType: '买家账号', status: 'offline', updatedAt: '2026-09-08 21:12' },
  { acctId: '15738', shopId: '', platform: '京东', name: '京东家居优选采购号', login: 'jd_home38:熊博韬', acctType: '买家账号', status: 'online', updatedAt: '2026-09-11 06:47' },
  { acctId: '15734', shopId: '', platform: '拼多多', name: '拼多多百货集采号', login: 'pdd_baihuo:竹林', acctType: '买家账号', status: 'online', updatedAt: '2026-09-10 15:20' },
]);

/** 离线（掉店）账号数：侧边栏未读徽标数字，为 0 时不展示 */
export const amOfflineCount = computed(() => amRows.value.filter((r) => r.status === 'offline').length);

/** 店铺离线（RPA 发布场景）：该店卖家账号全部离线则店铺离线；发布到抽屉据此禁选并引导前往登录 */
export const amOfflineShopNames = computed(() => {
  const sellers = amRows.value.filter((r) => r.acctType === '卖家账号' && r.shopName);
  return [...new Set(sellers.map((s) => s.shopName as string))]
    .filter((n) => !sellers.some((s) => s.shopName === n && s.status === 'online'));
});
/** 指定店铺的离线卖家账号（发布到抽屉「前往登录」桥接账号管理用；无则 undefined） */
export const amOfflineSellerOfShop = (shopName: string) =>
  amRows.value.find((r) => r.acctType === '卖家账号' && r.shopName === shopName && r.status === 'offline');
