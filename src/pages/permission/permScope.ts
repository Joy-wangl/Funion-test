/* =========================================================
   权限配置 · 平台/店铺数据范围（可见 / 可管理）
   权限矩阵（角色权限页）配置，业务页（内部商机等）读取生效
   ========================================================= */
import { reactive } from 'vue';

/** 平台-店铺池：平台口径与内部商机筛选一致；店铺含业务列表真实店铺 + 演示店铺 */
export interface PermPlatShops {
  platform: string;
  shops: string[];
}

export const PERM_PLAT_SHOPS: PermPlatShops[] = [
  { platform: '阿里巴巴', shops: ['阿里批发-裂缝贸易行', '义乌晗贸甄选店'] },
  { platform: '抖音', shops: ['抖音小店-丽丽居住/健身弹专卖店', '抖音小店-云端优选专营店'] },
  { platform: '京东', shops: ['京东Funion旗舰店', '京东Funion专营店'] },
  { platform: '快手', shops: ['快乐小店-佰得小站', '快乐小店-歪歪轩', '快乐小店-好物集合'] },
  { platform: '拼多多', shops: ['拼多多-萌妮优选的小百货', '拼多多-阿涛弄弄', '拼多多-朝妮优选的小百货'] },
  { platform: '淘宝', shops: ['淘宝心选店', '淘宝小家百货店'] },
  { platform: '天猫', shops: ['天猫Funion旗舰店', '天猫Funion美妆专营店'] },
  { platform: '微信视频号小店', shops: ['视频号-Funion官方店', '视频号-甄选好物店'] },
];

export const ALL_PERM_SHOPS: string[] = PERM_PLAT_SHOPS.flatMap((p) => p.shops);

/** 范围选择：以店铺为最小粒度；平台由已选店铺派生（含 ≥1 店铺即视为该平台入选） */
export interface ScopeSel {
  shops: string[];
}

export interface MenuScope {
  view: ScopeSel;
  manage: ScopeSel;
}

/** 菜单key（二级菜单名）→ 可见/可管理范围；缺省全平台全店铺（不受限） */
export const permScope = reactive<Record<string, MenuScope>>({});

export function scopeOf(key: string): MenuScope {
  if (!permScope[key]) {
    permScope[key] = { view: { shops: [...ALL_PERM_SHOPS] }, manage: { shops: [...ALL_PERM_SHOPS] } };
  }
  return permScope[key];
}

/** 已选店铺覆盖的平台名列表 */
export function platsOfShops(shops: string[]): string[] {
  return PERM_PLAT_SHOPS.filter((p) => p.shops.some((s) => shops.includes(s))).map((p) => p.platform);
}

/** 范围摘要文案：全选=全部平台/店铺；否则 已选 N 平台 · M 店铺 */
export function scopeSummary(shops: string[]): string {
  if (shops.length >= ALL_PERM_SHOPS.length) return '全部平台/店铺';
  return `已选 ${platsOfShops(shops).length} 平台 · ${shops.length} 店铺`;
}
