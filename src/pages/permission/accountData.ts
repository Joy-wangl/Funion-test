/* =========================================================
   权限设置 › 账号管理 数据层：账号清单（卖家/买家）与在线状态
   离线（掉店）计数同源共享：账号管理页状态 tab + 运营中心侧边栏未读徽标（权限设置组 / 账号管理项）
   ========================================================= */
import { computed, ref } from 'vue';

export interface AmRow {
  acctId: string;
  /** 店铺ID：仅卖家账号有店铺归属；买家账号为空不展示 */
  shopId: string;
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
  { acctId: '15769', shopId: '305428412', platform: '淘宝', name: '淘系C店-環球甄选好物店', login: 'tb6688087462', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-11 08:12' },
  { acctId: '15768', shopId: '269190799', platform: '淘宝', name: '淘系C店-一点就到百货', login: 'frand956666:小孔', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-11 07:58' },
  { acctId: '15753', shopId: '319800402', platform: '淘宝', name: '淘系C店-泰有钱百货店', login: 'tb709930255172:熊博韬', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-10 22:41' },
  { acctId: '15741', shopId: '15074719', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', login: '义乌日用家居直供店:奉天', acctType: '卖家账号', status: 'online', updatedAt: '2026-09-10 19:05' },
  { acctId: '15740', shopId: '15074719', platform: '淘宝', name: '淘系C店-义乌日用家居直供店', login: '义乌日用家居直供店:八一', acctType: '卖家账号', status: 'offline', updatedAt: '2026-09-09 18:26' },
  { acctId: '15767', shopId: '', platform: '淘宝', name: '悦勤家居采购号', login: '狂宠每个热粉:孔意飞', acctType: '买家账号', status: 'offline', updatedAt: '2026-09-09 08:30' },
  { acctId: '15742', shopId: '', platform: '淘宝', name: '义乌日用家居采购号', login: '义乌日用家居直供店:乐游原', acctType: '买家账号', status: 'offline', updatedAt: '2026-09-09 08:30' },
  { acctId: '15739', shopId: '', platform: '淘宝', name: '天天有百货采购号', login: '天天有百货直供店:梓昌', acctType: '买家账号', status: 'offline', updatedAt: '2026-09-08 21:12' },
  { acctId: '15738', shopId: '', platform: '京东', name: '京东家居优选采购号', login: 'jd_home38:熊博韬', acctType: '买家账号', status: 'online', updatedAt: '2026-09-11 06:47' },
  { acctId: '15734', shopId: '', platform: '拼多多', name: '拼多多百货集采号', login: 'pdd_baihuo:竹林', acctType: '买家账号', status: 'online', updatedAt: '2026-09-10 15:20' },
]);

/** 离线（掉店）账号数：侧边栏未读徽标数字，为 0 时不展示 */
export const amOfflineCount = computed(() => amRows.value.filter((r) => r.status === 'offline').length);
