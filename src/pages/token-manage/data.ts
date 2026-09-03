/* 令牌管理：应用令牌信息与状态管理 */

export type TokenPlatform = '淘宝' | '天猫' | '拼多多' | '抖音' | '快手';

export const TOKEN_PLATFORMS: TokenPlatform[] = ['淘宝', '天猫', '拼多多', '抖音', '快手'];

export const TOKEN_PLATFORM_LOGO: Record<TokenPlatform, string> = {
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  拼多多: '/logos/pinduoduo.png',
  抖音: '/logos/douyin.png',
  快手: '/logos/kuaishou.png',
};

export interface TokenRow {
  /** 令牌 ID：八位数字 */
  id: string;
  /** 令牌名称 */
  name: string;
  /** 创建人 */
  creator: string;
  platform: TokenPlatform;
  createdAt: string;
  /** 最近更新时间 */
  updatedAt: string;
}

export const tokenRows: TokenRow[] = [
  {
    id: '26031210', name: 'OPS 主同步令牌', creator: '周梦琪',
    platform: '淘宝', createdAt: '2026-03-12 10:24', updatedAt: '2026-08-29 09:12',
  },
  {
    id: '26051816', name: '拼多多铺货专用', creator: '陈鑫',
    platform: '拼多多', createdAt: '2026-05-18 16:40', updatedAt: '2026-08-25 18:03',
  },
  {
    id: '26020709', name: '抖音直播数据令牌', creator: '张三',
    platform: '抖音', createdAt: '2026-02-07 09:05', updatedAt: '2026-02-10 15:30',
  },
  {
    id: '25082014', name: '天猫客服机器人', creator: '李四',
    platform: '天猫', createdAt: '2025-08-20 14:12', updatedAt: '2025-09-02 10:18',
  },
  {
    id: '26061111', name: '快手短视频同步', creator: '王五',
    platform: '快手', createdAt: '2026-06-11 11:30', updatedAt: '2026-08-30 08:40',
  },
  {
    id: '26010508', name: '财务对账只读令牌', creator: '赵六',
    platform: '淘宝', createdAt: '2026-01-05 08:00', updatedAt: '2026-07-15 11:20',
  },
  {
    id: '25073017', name: '旧系统迁移过渡', creator: '孙七',
    platform: '天猫', createdAt: '2025-07-30 17:45', updatedAt: '2025-07-30 17:45',
  },
];
