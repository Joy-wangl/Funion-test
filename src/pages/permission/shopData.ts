/* =========================================================
   店铺级黑品限制的店铺池：镜像 设置›店铺管理 店铺行的 shopId/平台/名称
   （shopBlacklistData 以 shopId 为键分店铺存储限制条目，店铺配置页按同键回显）
   跨模块选用（商机中心「添加到黑品库」选店铺等），勿在各页各自复制
   ========================================================= */
export interface BlShopOption {
  shopId: string;
  platform: string;
  name: string;
}

export const BL_SHOP_OPTIONS: BlShopOption[] = [
  { shopId: '305428412', platform: '淘宝', name: '淘系C店-環球甄选好物店' },
  { shopId: '269190799', platform: '淘宝', name: '淘系C店-一点就到百货' },
  { shopId: '172420524', platform: '淘宝', name: '淘系C店-悦勤家居' },
  { shopId: '319800402', platform: '淘宝', name: '淘系C店-泰有钱百货店' },
  { shopId: '15074719', platform: '淘宝', name: '淘系C店-义乌日用家居直供店' },
  { shopId: '15074742', platform: '淘宝', name: '淘系C店-天天有百货直供店' },
  { shopId: '20886632', platform: '淘宝', name: '淘系C店-雅集臻品 Greenery' },
  { shopId: '319800403', platform: '天猫', name: '雅集臻品天猫旗舰店' },
  { shopId: '172420526', platform: '天猫', name: '悦勤家居天猫旗舰店' },
  { shopId: '220886633', platform: '拼多多', name: '义乌日用拼多多专营店' },
  { shopId: '220886634', platform: '拼多多', name: '天天有拼多多直供店' },
  { shopId: '430542841', platform: '抖音', name: '泰有钱抖音旗舰店' },
  { shopId: '430542842', platform: '抖音', name: '環球甄选抖音小店' },
  { shopId: '519800402', platform: '快手', name: '天天有快手小店' },
  { shopId: '605428412', platform: '视频号', name: '雅集臻品视频号小店' },
  { shopId: '605428413', platform: '视频号', name: '一点就到视频号小店' },
];
