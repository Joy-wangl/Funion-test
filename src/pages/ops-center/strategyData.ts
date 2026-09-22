/** 商品策略页：策略管理列表数据（冲量相关字段按需求删除） */
export interface StStrategy {
  id: string;
  name: string;
  /** 策略类型：淘宝平台策略 / 视频号平台策略 / 通用类型 */
  type: string;
  status: '启用中' | '停用';
  /** 报入活动 */
  joinActivity: string;
  /** 活动类型 */
  activityType: string;
  /** 控制模式 */
  mode: string;
  /** 利润设置 */
  rate: string;
  /** 是否推广 */
  promoted: string;
  /** 推广类型 */
  promoType: string;
  creator: string;
  createdAt: string;
}

export const stStrategies: StStrategy[] = [
  { id: 'st01', name: 'Nike Sock durk 男子运动鞋采用高端材质制作的商品', type: '通用类型', status: '启用中', joinActivity: '-', activityType: '-', mode: '控活动价利润', rate: '4元', promoted: '-', promoType: '-', creator: '李四', createdAt: '2026/04/12 12:00:00' },
  { id: 'st02', name: 'Nike Sock durk 男子运动鞋采用高端材质制作的商品', type: '淘宝平台策略', status: '停用', joinActivity: '否', activityType: '-', mode: '控利润率', rate: '10%', promoted: '否', promoType: '-', creator: '张三', createdAt: '2026/04/12 12:00:00' },
  { id: 'st03', name: 'Nike Sock durk 男子运动鞋采用高端材质制作的商品', type: '视频号平台策略', status: '启用中', joinActivity: '-', activityType: '-', mode: '控活动价利润', rate: '20%', promoted: '-', promoType: '-', creator: '李四', createdAt: '2026/04/12 12:00:00' },
];
