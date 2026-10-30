/* ---------- 品控-线上 · 违规监控 数据模块 ----------
   口径来源：拼多多问题梳理.xlsx / 问题梳理-淘系10.16.xlsx / 抖音.xlsx ＋各平台规则中心。
   三平台违规规则高度共通，此处归一为 9 个违规大类 × 小类，处置结果 7 档，供看板与列表统一消费。 ---------- */
import type { Platform } from './data';

export interface VioRecord {
  /** 违规编号（平台处罚单号） */
  id: string;
  shopName: string;
  shopId: string;
  platform: Platform;
  /** 违规时间 YYYY-MM-DD（未披露为 '--'） */
  time: string;
  /** 违规大类（归一后） */
  type: string;
  /** 违规小类 */
  sub: string;
  /** 处置结果档位 */
  severity: string;
  /** 违规程度（平台口径：违规扣分/一般违规/市场管理/严重违规） */
  degree: string;
  /** 扣分（0＝无扣分） */
  deductPts: number;
  /** 违约金/罚款（元，0＝无） */
  fineAmt: number;
  /** 处理状态 */
  status: string;
  /** 限制/冻结时长说明（如「限制7天」「封店」） */
  restrict?: string;
  productId?: string;
  seriesCode?: string;
  /** 违规原因（平台原文摘要） */
  reason: string;
  opsGroup: string;
  opsSpecialist: string;
  opsAssistant: string;
}

/* ---------- 违规大类归一（三平台共通口径） ---------- */
export const VIO_TYPES = [
  '发货物流违规',
  '商品品质与描述不符',
  '侵权与知识产权',
  '虚假交易与信誉',
  '违禁与禁售信息',
  '滥发信息',
  '资质合规',
  '客服违规',
  '扰乱市场秩序',
] as const;

export const VIO_TYPE_COLOR: Record<string, string> = {
  发货物流违规: '#f5222d',
  商品品质与描述不符: '#fa8c16',
  侵权与知识产权: '#722ed1',
  虚假交易与信誉: '#13c2c2',
  违禁与禁售信息: '#a8071a',
  滥发信息: '#faad14',
  资质合规: '#2f54eb',
  客服违规: '#eb2f96',
  扰乱市场秩序: '#86909c',
};

/* 大类 → 小类（合并三平台词表） */
export const VIO_SUBS: Record<string, string[]> = {
  发货物流违规: ['延迟发货', '虚假发货', '欺诈发货', '物流轨迹异常', '缺货未履约'],
  商品品质与描述不符: ['质量问题', '描述不符/货不对板', '材质不符', '效果虚假', '抽检不合格', '假冒商品'],
  侵权与知识产权: ['盗用图片', '盗用商标', '侵犯专利', '侵犯著作权', '蹭品牌词', '仿冒名人'],
  虚假交易与信誉: ['刷单炒信', '异常订单', '虚假销量评价'],
  违禁与禁售信息: ['发布违禁品', '危险化学品', '禁售信息', '非法用途信息'],
  滥发信息: ['滥发信息', '规避平台规则', '混淆信息', '错误描述信息'],
  资质合规: ['营业执照异常', '执照注吊销', '信息未更新', '资质缺失'],
  客服违规: ['辱骂买家', '超时不回复', '引导站外交易', '骚扰威胁'],
  扰乱市场秩序: ['违背承诺', '不正当获取资源', '扰乱市场秩序'],
};

export const VIO_SUB_BIG: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const big of VIO_TYPES) for (const s of VIO_SUBS[big]) m[s] = big;
  return m;
})();

export const vioSubsOf = (big: string): string[] => VIO_SUBS[big] ?? [];

/* ---------- 处置结果 7 档（按严重度从重到轻） ---------- */
export const VIO_SEVERITY = [
  '封店/清退',
  '店铺限制/冻结',
  '店铺降权',
  '商品处置',
  '违规扣分',
  '罚款/违约金',
  '警告/公示',
] as const;

export const VIO_SEVERITY_COLOR: Record<string, string> = {
  '封店/清退': '#a8071a',
  '店铺限制/冻结': '#f5222d',
  店铺降权: '#fa541c',
  商品处置: '#fa8c16',
  违规扣分: '#faad14',
  '罚款/违约金': '#1890ff',
  '警告/公示': '#86909c',
};

/* 处置档位是否构成「店铺受限/封禁」（用于看板核心指标与筛选） */
export const VIO_BLOCK_SEVERITY = new Set(['封店/清退', '店铺限制/冻结', '店铺降权']);

/* ---------- 处理状态 ---------- */
export const VIO_STATUS = ['待处罚', '处罚中', '处罚完成'] as const;
export const VIO_STATUS_COLOR: Record<string, string> = {
  待处罚: '#faad14',
  处罚中: '#1890ff',
  处罚完成: '#86909c',
};

/* ---------- 违规程度（平台口径） ---------- */
export const VIO_DEGREE = ['违规扣分', '一般违规', '市场管理', '严重违规'] as const;

/* ---------- 平台分组（淘系合并天猫/淘宝；抖音、拼多多各自一组） ---------- */
export type VioPlatGroup = '淘系' | '抖音' | '拼多多';
export const VIO_PLAT_GROUPS: VioPlatGroup[] = ['淘系', '抖音', '拼多多'];
export const vioPlatGroup = (p: Platform): VioPlatGroup | null => {
  if (p === '天猫' || p === '淘宝') return '淘系';
  if (p === '抖音') return '抖音';
  if (p === '拼多多') return '拼多多';
  return null;
};

/* ---------- 整改建议（按违规大类，直接服务「基于原因去整改」目标） ---------- */
export const VIO_FIX_ADVICE: Record<string, string[]> = {
  发货物流违规: [
    '核对承诺发货时效，异常 SKU 调整预售/现货标记，避免超时。',
    '排查虚假/欺诈发货订单，督促仓库真实揽收并回传物流单号。',
    '缺货链接及时下架或改库存，杜绝拍下不发。',
  ],
  商品品质与描述不符: [
    '复检问题链接详情页，材质/规格/效果描述与实物对齐。',
    '抽检不合格批次暂停推广并溯源供应商，整改后再上架。',
    '假冒/侵权商品立即下架，核验品牌授权链路。',
  ],
  侵权与知识产权: [
    '下架盗图/盗标链接，替换为自有素材或已授权内容。',
    '蹭品牌词的标题/属性/关键词全部清理，规避搜索违规。',
    '涉及专利/著作权的款式做规避设计或取得授权。',
  ],
  虚假交易与信誉: [
    '停止刷单炒信行为，清理异常订单与虚假评价。',
    '排查同 IP/同收货信息批量下单，防范平台判定虚假交易。',
  ],
  违禁与禁售信息: [
    '违禁/危险化学品类目链接立即下架，核验经营范围资质。',
    '全站关键词扫描禁售词，防止误发布。',
  ],
  滥发信息: [
    '合并重复铺货链接，清理规避平台规则的变体商品。',
    '修正错误描述信息，标题/类目/属性规范填写。',
  ],
  资质合规: [
    '营业执照异常/注吊销尽快完成工商变更并同步平台。',
    '主体信息、经营资质到期前更新，避免限制提现与经营。',
  ],
  客服违规: [
    '规范客服话术，禁止辱骂、威胁、引导站外交易。',
    '设置超时未回复预警，保障响应时效。',
  ],
  扰乱市场秩序: [
    '履行活动承诺，杜绝不正当获取平台资源行为。',
    '排查价格/销量异常操作，避免判定扰乱市场秩序。',
  ],
};

/* ---------- 违规记录种子（淘系 26 行改编自真实附件-违规记录；拼多多/抖音按文档口径补足）
   违规时间跨 2026-07~2026-10，供看板违规趋势按自然月呈现。 ---------- */
export const QC_VIOLATIONS: VioRecord[] = [
  /* ===== 淘系（天猫/淘宝）——改编自真实「附件-违规记录」 ===== */
  { id: 'TM-2026101501', shopName: '首力家居专营店', shopId: 'TM-2041', platform: '天猫', time: '2026-10-15', type: '发货物流违规', sub: '延迟发货', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-100231', seriesCode: 'XL-家居收纳', reason: '未按约定时间发货，近90天累计延迟发货订单超阈值。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026101502', shopName: '真子旗舰店', shopId: 'TM-2057', platform: '天猫', time: '2026-10-15', type: '商品品质与描述不符', sub: '描述不符/货不对板', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚中', productId: 'P-100884', seriesCode: 'XL-厨房用品', reason: '出售描述不符或品质存在问题的商品，买家举证与详情页不符。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026101403', shopName: '朋意旗舰店', shopId: 'TM-2063', platform: '天猫', time: '2026-10-14', type: '侵权与知识产权', sub: '盗用图片', severity: '违规扣分', degree: '违规扣分', deductPts: 12, fineAmt: 5000, status: '处罚完成', productId: 'P-101220', seriesCode: 'XL-家纺布艺', reason: '不当使用他人权利，盗用品牌方商品主图被投诉。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026101404', shopName: '富旭旗舰店', shopId: 'TM-2088', platform: '天猫', time: '2026-10-14', type: '虚假交易与信誉', sub: '刷单炒信', severity: '店铺降权', degree: '一般违规', deductPts: 0, fineAmt: 1000, status: '处罚中', productId: 'P-101566', seriesCode: 'XL-清洁工具', reason: '虚假交易，系统识别异常订单集中成交、评价雷同。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026101305', shopName: '朋意家居用品旗舰店', shopId: 'TM-2095', platform: '天猫', time: '2026-10-13', type: '滥发信息', sub: '滥发信息', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-102013', seriesCode: 'XL-家居收纳', reason: '滥发信息一般，同款式重复铺货、SKU 堆砌关键词。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026101306', shopName: '首力家居专营店', shopId: 'TM-2041', platform: '天猫', time: '2026-10-13', type: '违禁与禁售信息', sub: '发布违禁品', severity: '商品处置', degree: '违规扣分', deductPts: 12, fineAmt: 5000, status: '待处罚', productId: 'P-102477', seriesCode: 'XL-厨房用品', reason: '发布违禁信息，商品含平台禁售成分被系统拦截。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026101207', shopName: '真子旗舰店', shopId: 'TM-2057', platform: '天猫', time: '2026-10-12', type: '虚假交易与信誉', sub: '虚假销量评价', severity: '店铺降权', degree: '市场管理', deductPts: 0, fineAmt: 0, status: '处罚完成', reason: '天猫销量评价管理规则，异常销量与评价被清理并降权。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026101208', shopName: '朋意旗舰店', shopId: 'TM-2063', platform: '天猫', time: '2026-10-12', type: '发货物流违规', sub: '虚假发货', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 24, fineAmt: 50000, status: '处罚中', restrict: '限制营销活动', productId: 'P-103102', seriesCode: 'XL-家纺布艺', reason: '虚假发货情节严重，上传单号无真实揽收轨迹，累计三次以上。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026101109', shopName: '富旭旗舰店', shopId: 'TM-2088', platform: '天猫', time: '2026-10-11', type: '商品品质与描述不符', sub: '质量问题', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-103588', seriesCode: 'XL-清洁工具', reason: '出售品质存在问题商品，退货退款率高于同类均值。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026101110', shopName: '朋意家居用品旗舰店', shopId: 'TM-2095', platform: '天猫', time: '2026-10-11', type: '滥发信息', sub: '错误描述信息', severity: '警告/公示', degree: '市场管理', deductPts: 0, fineAmt: 0, status: '处罚完成', productId: 'P-103920', seriesCode: 'XL-家居收纳', reason: '发布错误描述信息，首次公示警告。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TB-2026092811', shopName: '青野家居', shopId: 'TB-2041', platform: '淘宝', time: '2026-09-28', type: '发货物流违规', sub: '缺货未履约', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-200118', seriesCode: 'XL-家居收纳', reason: '拍下缺货未履约，买家投诉发货超时。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TB-2026092612', shopName: '沐辰优选', shopId: 'TB-2057', platform: '淘宝', time: '2026-09-26', type: '扰乱市场秩序', sub: '违背承诺', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚中', reason: '违背承诺，活动价未按报名执行被判定扰乱市场秩序。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TB-2026092413', shopName: '知夏工作室', shopId: 'TB-2063', platform: '淘宝', time: '2026-09-24', type: '侵权与知识产权', sub: '蹭品牌词', severity: '店铺降权', degree: '一般违规', deductPts: 0, fineAmt: 1000, status: '处罚完成', productId: 'P-200733', seriesCode: 'XL-家纺布艺', reason: '标题蹭知名品牌词，搜索违规被降权。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TB-2026092114', shopName: '寻悦坊', shopId: 'TB-2088', platform: '淘宝', time: '2026-09-21', type: '客服违规', sub: '引导站外交易', severity: '违规扣分', degree: '违规扣分', deductPts: 12, fineAmt: 5000, status: '待处罚', reason: '客服引导买家站外交易，旺旺聊天记录取证。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026091815', shopName: '首力家居专营店', shopId: 'TM-2041', platform: '天猫', time: '2026-09-18', type: '商品品质与描述不符', sub: '材质不符', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-104255', seriesCode: 'XL-家纺布艺', reason: '材质与描述不符，抽检成分与详情页标注差异。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026091516', shopName: '真子旗舰店', shopId: 'TM-2057', platform: '天猫', time: '2026-09-15', type: '资质合规', sub: '信息未更新', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '限制主体变更', reason: '营业执照信息未更新，累计扣分达24分限制营销活动与主体变更。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026091017', shopName: '朋意旗舰店', shopId: 'TM-2063', platform: '天猫', time: '2026-09-10', type: '发货物流违规', sub: '物流轨迹异常', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-104610', seriesCode: 'XL-厨房用品', reason: '物流轨迹长时间无更新，判定发货物流违规。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TB-2026090618', shopName: '青野家居', shopId: 'TB-2041', platform: '淘宝', time: '2026-09-06', type: '虚假交易与信誉', sub: '异常订单', severity: '警告/公示', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚完成', reason: '异常订单集中成交，首次公示警告。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026082619', shopName: '富旭旗舰店', shopId: 'TM-2088', platform: '天猫', time: '2026-08-26', type: '滥发信息', sub: '规避平台规则', severity: '店铺降权', degree: '市场管理', deductPts: 0, fineAmt: 1000, status: '处罚完成', productId: 'P-105022', seriesCode: 'XL-清洁工具', reason: '变体商品规避平台规则，被判滥发信息严重。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026082020', shopName: '朋意家居用品旗舰店', shopId: 'TM-2095', platform: '天猫', time: '2026-08-20', type: '违禁与禁售信息', sub: '禁售信息', severity: '商品处置', degree: '违规扣分', deductPts: 12, fineAmt: 5000, status: '待处罚', productId: 'P-105388', seriesCode: 'XL-家居收纳', reason: '发布平台禁售信息，商品强制下架。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TB-2026081421', shopName: '沐辰优选', shopId: 'TB-2057', platform: '淘宝', time: '2026-08-14', type: '商品品质与描述不符', sub: '效果虚假', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚完成', productId: 'P-201402', seriesCode: 'XL-清洁工具', reason: '功效宣传与实物不符，买家举证效果虚假。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TB-2026080822', shopName: '知夏工作室', shopId: 'TB-2063', platform: '淘宝', time: '2026-08-08', type: '发货物流违规', sub: '延迟发货', severity: '违规扣分', degree: '违规扣分', deductPts: 6, fineAmt: 2500, status: '处罚中', productId: 'P-201777', seriesCode: 'XL-家纺布艺', reason: '多次延迟发货，近30天发货时效低于考核线。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026073023', shopName: '首力家居专营店', shopId: 'TM-2041', platform: '天猫', time: '2026-07-30', type: '侵权与知识产权', sub: '侵犯著作权', severity: '违规扣分', degree: '违规扣分', deductPts: 12, fineAmt: 5000, status: '处罚完成', productId: 'P-105744', seriesCode: 'XL-家纺布艺', reason: '不当使用他人权利，图案侵犯著作权被投诉成立。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TM-2026072224', shopName: '真子旗舰店', shopId: 'TM-2057', platform: '天猫', time: '2026-07-22', type: '客服违规', sub: '辱骂买家', severity: '违规扣分', degree: '违规扣分', deductPts: 12, fineAmt: 5000, status: '处罚中', reason: '客服辱骂买家，服务违规扣分。', opsGroup: '淘系一组', opsSpecialist: '李婧', opsAssistant: '王雪' },
  { id: 'TB-2026071525', shopName: '寻悦坊', shopId: 'TB-2088', platform: '淘宝', time: '2026-07-15', type: '资质合规', sub: '营业执照异常', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '限制提现', reason: '营业执照列入异常经营名录，限制店铺资金提现。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },
  { id: 'TM-2026070826', shopName: '朋意旗舰店', shopId: 'TM-2063', platform: '天猫', time: '2026-07-08', type: '扰乱市场秩序', sub: '不正当获取资源', severity: '店铺降权', degree: '市场管理', deductPts: 0, fineAmt: 1000, status: '处罚完成', reason: '不正当获取平台资源，活动坑位作弊被降权。', opsGroup: '淘系二组', opsSpecialist: '赵启', opsAssistant: '孙宁' },

  /* ===== 拼多多——按「店铺受限档位」口径 ===== */
  { id: 'PDD-2026101501', shopName: '暮野', shopId: 'PDD-6012', platform: '拼多多', time: '2026-10-15', type: '发货物流违规', sub: '欺诈发货', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '一级限制7天', productId: 'P-300115', seriesCode: 'XL-家居收纳', reason: '欺诈发货，上传单号无真实物流轨迹，触发一级限制。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026101402', shopName: '澜庭优选', shopId: 'PDD-6025', platform: '拼多多', time: '2026-10-14', type: '商品品质与描述不符', sub: '假冒商品', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚完成', restrict: '二级限制7天', productId: 'P-300620', seriesCode: 'XL-厨房用品', reason: '假货违规，售卖假冒商品触发二级限制并扣罚保证金。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026093003', shopName: '柚白', shopId: 'PDD-6033', platform: '拼多多', time: '2026-09-30', type: '侵权与知识产权', sub: '蹭品牌词', severity: '店铺降权', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '二级限制15天', productId: 'P-300988', seriesCode: 'XL-家纺布艺', reason: '滥发蹭品牌词，商品降权并限制推广。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026092504', shopName: '霜序工作室', shopId: 'PDD-6047', platform: '拼多多', time: '2026-09-25', type: '商品品质与描述不符', sub: '描述不符/货不对板', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '待处罚', restrict: '二级限制1个月', productId: 'P-301244', seriesCode: 'XL-清洁工具', reason: '描述不符或交易风险，触发二级限制一个月。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026091205', shopName: '暮野', shopId: 'PDD-6012', platform: '拼多多', time: '2026-09-12', type: '违禁与禁售信息', sub: '危险化学品', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚完成', restrict: '二级限制7天', productId: 'P-301570', seriesCode: 'XL-清洁工具', reason: '发布易燃易爆危险品，触发二级限制。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026082806', shopName: '澜庭优选', shopId: 'PDD-6025', platform: '拼多多', time: '2026-08-28', type: '资质合规', sub: '营业执照异常', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '三级限制', reason: '营业执照列入异常经营名录，触发三级限制。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026081507', shopName: '柚白', shopId: 'PDD-6033', platform: '拼多多', time: '2026-08-15', type: '发货物流违规', sub: '缺货未履约', severity: '店铺限制/冻结', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚完成', restrict: '二级限制3天', productId: 'P-301833', seriesCode: 'XL-家居收纳', reason: '缺货未履约，触发二级限制3天。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026080208', shopName: '霜序工作室', shopId: 'PDD-6047', platform: '拼多多', time: '2026-08-02', type: '商品品质与描述不符', sub: '抽检不合格', severity: '店铺降权', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '降权3个月', productId: 'P-302109', seriesCode: 'XL-厨房用品', reason: '品质指标异常，抽检不合格降权3个月。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },
  { id: 'PDD-2026071809', shopName: '暮野', shopId: 'PDD-6012', platform: '拼多多', time: '2026-07-18', type: '虚假交易与信誉', sub: '刷单炒信', severity: '商品处置', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚完成', productId: 'P-302455', seriesCode: 'XL-清洁工具', reason: '虚假交易，商品推广受限并扣罚保证金。', opsGroup: '拼多多组', opsSpecialist: '周琳', opsAssistant: '吴桐' },

  /* ===== 抖音——按「冻结/封禁/停业整顿」口径 ===== */
  { id: 'DY-2026101501', shopName: '初晴日记', shopId: 'DY-3012', platform: '抖音', time: '2026-10-15', type: '发货物流违规', sub: '虚假发货', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '店铺冻结', productId: 'P-400118', seriesCode: 'XL-家居收纳', reason: '批量违规发货（拍A发B/空包），店铺货款冻结。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026101402', shopName: '半山优选', shopId: 'DY-3026', platform: '抖音', time: '2026-10-14', type: '商品品质与描述不符', sub: '质量问题', severity: '封店/清退', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '待处罚', restrict: '停业整顿', productId: 'P-400522', seriesCode: 'XL-厨房用品', reason: '大量品质差、描述不符商品，触发停业整顿/清退。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026092903', shopName: '明野', shopId: 'DY-3039', platform: '抖音', time: '2026-09-29', type: '商品品质与描述不符', sub: '描述不符/货不对板', severity: '商品处置', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚完成', restrict: '商品冻结', productId: 'P-400933', seriesCode: 'XL-家纺布艺', reason: '款式颜色图案与描述不符，商品冻结。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026092204', shopName: '风屿工作室', shopId: 'DY-3051', platform: '抖音', time: '2026-09-22', type: '侵权与知识产权', sub: '仿冒名人', severity: '商品处置', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '商品封禁7天', productId: 'P-401287', seriesCode: 'XL-清洁工具', reason: '仿冒名人形象，商品封禁7天。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026091005', shopName: '初晴日记', shopId: 'DY-3012', platform: '抖音', time: '2026-09-10', type: '滥发信息', sub: '混淆信息', severity: '商品处置', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚完成', restrict: '商品下架', productId: 'P-401640', seriesCode: 'XL-家居收纳', reason: '低价SKU引流、混淆品牌信息，商品下架。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026082506', shopName: '半山优选', shopId: 'DY-3026', platform: '抖音', time: '2026-08-25', type: '发货物流违规', sub: '延迟发货', severity: '商品处置', degree: '一般违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '每日限单', productId: 'P-401955', seriesCode: 'XL-厨房用品', reason: '发货超时，链接每日限单受限。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026081007', shopName: '明野', shopId: 'DY-3039', platform: '抖音', time: '2026-08-10', type: '客服违规', sub: '骚扰威胁', severity: '店铺限制/冻结', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '待处罚', restrict: '店铺冻结', reason: '客服骚扰辱骂威胁买家，店铺冻结。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
  { id: 'DY-2026072008', shopName: '风屿工作室', shopId: 'DY-3051', platform: '抖音', time: '2026-07-20', type: '资质合规', sub: '执照注吊销', severity: '封店/清退', degree: '严重违规', deductPts: 0, fineAmt: 0, status: '处罚中', restrict: '清退封店', reason: '关联主体营业执照注销/吊销，清退封店。', opsGroup: '抖音组', opsSpecialist: '陈曦', opsAssistant: '林悦' },
];
