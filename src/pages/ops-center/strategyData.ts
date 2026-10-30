/** 商品策略页：策略管理列表数据（冲量相关字段按需求删除） */
export interface StStrategy {
  id: string;
  name: string;
  /** 策略类型：淘宝平台策略 / 视频号平台策略 / 通用类型 */
  type: string;
  /** 适用平台（列表名称列子行展示；通用类型＝全平台） */
  platforms: string[];
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
  /** 是否使用优惠券（策略层仅开关，具体券在商品创建发布时按店铺选择） */
  useCoupon: '是' | '否';
  creator: string;
  createdAt: string;
}

/** 活动类型词表按平台区分：淘宝/通用＝顺买/秒杀，视频号＝限时抢购/优惠券；列表/筛选/抽屉三处共用单一出口 */
export const ACT_TYPES_DEFAULT = ['顺买', '秒杀'];
export const ACT_TYPES_SHIPINHAO = ['限时抢购', '优惠券'];
export const actTypesOf = (platform: string) => (platform === '视频号' ? ACT_TYPES_SHIPINHAO : ACT_TYPES_DEFAULT);

/** 发布策略适用平台词表（全平台） */
export const ST_PLATS = ['淘宝', '京东', '拼多多', '抖音', '快手', '视频号'];

/** 动销策略（控价玩法）适用平台词表：仅视频号；筛选/列表/新建共用单一出口 */
export const DS_PLATS = ['视频号'];

/** 涨价条件行：连接词（首行展示「当」）＋指标＋运算符＋阈值；单位随指标固定 */
export interface DsCond {
  conj: '且' | '或';
  metric: string;
  op: string;
  val: string;
  unit: string;
}
/** 再涨价判断指标词表（单位：多数指标固定，销量涨幅支持 %/件 二选一） */
export const DS_COND_METRICS: { name: string; units: string[] }[] = [
  { name: '销量涨幅', units: ['%', '件'] },
  { name: '动销天数', units: ['天'] },
];
export const DS_COND_OPS = ['≥', '>', '≤', '<', '='];

/** 降价判断指标词表（单位：多数指标固定，销量降幅支持 %/件 二选一） */
export const DS_CUT_METRICS: { name: string; units: string[] }[] = [
  { name: '无订单天数', units: ['天'] },
  { name: '销量降幅', units: ['%', '件'] },
  { name: '无动销天数', units: ['天'] },
];

/** 动销策略：控价玩法配置（利润率阶梯 → 涨价条件 → 回退与退出），与发布策略并列的策略类型 */
export interface DsStrategy {
  id: string;
  name: string;
  /** 适用平台（可多平台） */
  platforms: string[];
  status: '启用中' | '停用';
  /** 利润率阶梯：最低利润 / 最高利润率 / 每档涨幅（%）；起步利润率已下线不展示 */
  floorRate: string;
  targetRate: string;
  stepRate: string;
  /** 再涨价判断：每次调价后观察，满足条件则继续涨一档（行式条件组） */
  riseConds: DsCond[];
  /** 降价判断：观察期内触发任一条件则回退一档（行式条件组） */
  cutConds: DsCond[];
  /** 回退与退出：涨价后观察(天) / 回退跌幅阈值(%) / 未破零超时(天) */
  observeDays: string;
  rollbackPct: string;
  zeroTimeoutDays: string;
  remark: string;
  creator: string;
  createdAt: string;
}

export const dsStrategies: DsStrategy[] = [
  { id: 'ds01', name: '新品低价起量·稳步提利', platforms: ['视频号'], status: '启用中', floorRate: '0.00', targetRate: '20.00', stepRate: '2.00', riseConds: [{ conj: '且', metric: '销量涨幅', op: '≥', val: '10', unit: '%' }, { conj: '且', metric: '动销天数', op: '≥', val: '2', unit: '天' }], cutConds: [{ conj: '且', metric: '无订单天数', op: '≥', val: '2', unit: '天' }, { conj: '或', metric: '销量降幅', op: '≥', val: '30', unit: '%' }, { conj: '或', metric: '无动销天数', op: '≥', val: '3', unit: '天' }], observeDays: '3', rollbackPct: '30', zeroTimeoutDays: '10', remark: '', creator: '李四', createdAt: '2026/04/12 12:00:00' },
  { id: 'ds02', name: '视频号爆款控价·快速回利', platforms: ['视频号'], status: '停用', floorRate: '2.00', targetRate: '25.00', stepRate: '3.00', riseConds: [{ conj: '且', metric: '销量涨幅', op: '≥', val: '15', unit: '%' }, { conj: '且', metric: '动销天数', op: '≥', val: '3', unit: '天' }], cutConds: [{ conj: '且', metric: '无订单天数', op: '≥', val: '3', unit: '天' }, { conj: '或', metric: '销量降幅', op: '≥', val: '40', unit: '%' }, { conj: '或', metric: '无动销天数', op: '≥', val: '5', unit: '天' }], observeDays: '5', rollbackPct: '25', zeroTimeoutDays: '7', remark: '大促期间暂停提价', creator: '张三', createdAt: '2026/04/12 12:00:00' },
  { id: 'ds03', name: '短视频渠道动销提价', platforms: ['视频号'], status: '启用中', floorRate: '1.00', targetRate: '18.00', stepRate: '1.50', riseConds: [{ conj: '且', metric: '销量涨幅', op: '≥', val: '8', unit: '%' }, { conj: '且', metric: '动销天数', op: '≥', val: '4', unit: '天' }], cutConds: [{ conj: '且', metric: '销量降幅', op: '≥', val: '25', unit: '%' }, { conj: '或', metric: '无动销天数', op: '≥', val: '4', unit: '天' }], observeDays: '4', rollbackPct: '35', zeroTimeoutDays: '14', remark: '', creator: '李四', createdAt: '2026/04/12 12:00:00' },
];

export const stStrategies: StStrategy[] = [
  { id: 'st01', name: 'Nike Sock durk 男子运动鞋采用高端材质制作的商品', type: '通用类型', platforms: ['淘宝', '京东', '拼多多', '抖音', '快手', '视频号'], status: '启用中', joinActivity: '-', activityType: '-', mode: '控活动价利润', rate: '4元', promoted: '-', promoType: '-', useCoupon: '否', creator: '李四', createdAt: '2026/04/12 12:00:00' },
  { id: 'st02', name: 'Nike Sock durk 男子运动鞋采用高端材质制作的商品', type: '淘宝平台策略', platforms: ['淘宝'], status: '停用', joinActivity: '否', activityType: '-', mode: '控利润率', rate: '10%', promoted: '否', promoType: '-', useCoupon: '否', creator: '张三', createdAt: '2026/04/12 12:00:00' },
  { id: 'st03', name: 'Nike Sock durk 男子运动鞋采用高端材质制作的商品', type: '视频号平台策略', platforms: ['视频号'], status: '启用中', joinActivity: '是', activityType: '限时抢购', mode: '控活动价利润', rate: '20%', promoted: '-', promoType: '-', useCoupon: '是', creator: '李四', createdAt: '2026/04/12 12:00:00' },
];

/** 优惠券：自建券实体（优惠信息 + 基础信息 + 领取进度），与发布/动销策略并列 */
export interface CpStrategy {
  id: string;
  name: string;
  /** 所属店铺（券在店铺内创建） */
  shop: string;
  /** 券ID（平台生成，列表可复制） */
  couponId: string;
  /** 优惠方式：统一折扣 */
  mode: string;
  /** 折扣值（折） */
  discount: string;
  /** 适用范围：全店商品 / 部分商品 */
  scope: '全店商品' | '部分商品';
  /** 部分商品时的适用商品数 */
  goodsCount: string;
  /** 商品范围：手动选择 / 批量导入（部分商品时有效） */
  goodsMode: '手动选择' | '批量导入';
  /** 推广场景 */
  scene: string;
  /** 发放张数 */
  issueCount: string;
  /** 已领取张数 */
  claimed: string;
  /** 每人限领 */
  perLimit: string;
  claimFrom: string;
  claimTo: string;
  /** 使用时间：和领取时间一致 / 领取后N天内有效 / 自定义 */
  useMode: '和领取时间一致' | '领取后天内有效' | '自定义';
  useDays: string;
  useFrom: string;
  useTo: string;
  /** 券状态：按领取时间派生＋作废 */
  status: '生效中' | '未开始' | '已结束' | '已作废';
}

export const cpStrategies: CpStrategy[] = [
  { id: 'cp01', name: '通用券10/27', shop: 'Funion旗舰店', couponId: '169968741', mode: '统一折扣', discount: '9', scope: '部分商品', goodsCount: '10', goodsMode: '手动选择', scene: '全场景', issueCount: '1000', claimed: '326', perLimit: '1', claimFrom: '2026/10/27', claimTo: '2026/11/11', useMode: '和领取时间一致', useDays: '', useFrom: '', useTo: '', status: '生效中' },
  { id: 'cp02', name: '双十一大促券', shop: 'Funion京麦自营店', couponId: '170233854', mode: '统一折扣', discount: '8.5', scope: '全店商品', goodsCount: '', goodsMode: '手动选择', scene: '双十一大促', issueCount: '5000', claimed: '0', perLimit: '2', claimFrom: '2026/11/01', claimTo: '2026/11/11', useMode: '领取后天内有效', useDays: '7', useFrom: '', useTo: '', status: '未开始' },
  { id: 'cp03', name: '新品体验券', shop: '一点就到百货', couponId: '168554207', mode: '统一折扣', discount: '9.5', scope: '部分商品', goodsCount: '6', goodsMode: '批量导入', scene: '新品体验', issueCount: '800', claimed: '762', perLimit: '1', claimFrom: '2026/09/01', claimTo: '2026/09/30', useMode: '自定义', useDays: '', useFrom: '2026/09/01', useTo: '2026/10/15', status: '已结束' },
];
