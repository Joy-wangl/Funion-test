/* =========================================================
   品控中心 2.0 · 数据层
   商品标签维度：标签体系（源自《商品数据稽查》修订版）+ 编码命中 mock + 可配置 store
   - 一个商品编码 / 系列编码可命中多个标签
   - 每个标签可配置：启用开关 / 判定方式（通用数据判断 · AI 分析）/ 命中规则文本 / 阈值参数（规则）/ 综合评定维度（AI）
   - 配置写入 localStorage，概览页与编码页实时生效
   ========================================================= */
import { ref, watch } from 'vue';
import { QC_CENTER_SERIES, QC_PLATFORMS, type Platform } from '../quality/qcCenterData';

/* 平台枚举转出口（编码页筛选用，与品控中心同源） */
export { QC_PLATFORMS };
export type { Platform };

/* ---------- 类型 ---------- */

/** 判定方式：通用数据直接判断 / 需 AI 分析 */
export type JudgeKind = 'rule' | 'ai';

/** 适用维度：code = 商品编码维度判定 / series = 系列编码维度判定（命中挂系列，不逐编码复制） */
export type LabelScope = 'code' | 'series';

/** 阈值运算符 */
export type ParamOp = '>' | '>=' | '<' | '<=' | '=' | '进入前';

export const PARAM_OPS: ParamOp[] = ['>', '>=', '<', '<=', '=', '进入前'];

/** 可做阈值的数据维度（源自《商品数据稽查.xlsx》口径） */
export const PARAM_METRICS = [
  '订单量', '订单量占比', '销售金额', '付款金额', '退款率', '退款金额占比', '取消单量', '刷单金额',
  '类目排名', '较周期均值涨幅', '较周期均值跌幅', '周末订单占比', '客单价较类目均值', '店铺订单贡献占比',
  '毛利润', '快递成本', '平台扣点', '零动销天数',
];

/** 阈值单位 */
export const PARAM_UNITS = ['%', '单', '元', '天', '倍'];

/** 数据维度 → 默认单位（条件行阈值后缀自动跟随维度，无需单独选择） */
export const METRIC_UNIT: Record<string, string> = {
  订单量: '单', 订单量占比: '%', 销售金额: '元', 付款金额: '元', 退款率: '%', 退款金额占比: '%',
  取消单量: '单', 刷单金额: '元', 类目排名: '%', 较周期均值涨幅: '%', 较周期均值跌幅: '%',
  周末订单占比: '%', 客单价较类目均值: '倍', 店铺订单贡献占比: '%', 毛利润: '元', 快递成本: '元',
  平台扣点: '%', 零动销天数: '天',
};

export const unitOfMetric = (metric: string): string => METRIC_UNIT[metric] ?? '%';

/** 阈值参数逻辑关系：且 = 同时满足 / 或 = 任一满足 */
export type LogicKind = 'and' | 'or';

export const LOGIC_LABEL: Record<LogicKind, string> = { and: '且', or: '或' };

/** 健康等级综合评定维度池（多维综合评定，不用数值阈值表达） */
export const HEALTH_DIMS = ['销售表现', '利润表现', '退款表现', '成本管控', '信息质量', '渠道适配', '运营人效', '订单异常'];

export interface LabelParam {
  key: string;
  /** 行前连接词（首行忽略）：且 = 同时满足 / 或 = 任一满足 */
  conj?: LogicKind;
  /** 数据维度 */
  metric: string;
  /** 统计周期（天，null = 不限周期） */
  days: number | null;
  /** 运算符 */
  op: ParamOp;
  /** 阈值 */
  value: number;
  /** 单位 */
  unit: string;
}

/** 阈值参数展示文案：如「退款率 近 30 天 > 20%」「类目排名 进入前 10%」 */
export const formatParam = (p: LabelParam): string => {
  const win = p.days ? ` 近 ${p.days} 天` : '';
  return p.op === '进入前'
    ? `${p.metric}${win} 进入前 ${p.value}${p.unit}`
    : `${p.metric}${win} ${p.op} ${p.value}${p.unit}`;
};

/** 条件行连接词（旧存档缺省回落「且」） */
export const paramConj = (p: LabelParam): LogicKind => p.conj ?? 'and';

/** 阈值参数行按各行连接词串联：「A 且 B 或 C」 */
export const joinParamTexts = (params: LabelParam[]): string =>
  params.map((p, i) => (i ? `${LOGIC_LABEL[paramConj(p)]} ${formatParam(p)}` : formatParam(p))).join(' ');

export interface Qc2Label {
  id: string;
  /** 大类 */
  cat: string;
  /** 目标（标签名） */
  name: string;
  /** 命中规则（可配置） */
  rule: string;
  /** 判定方式（可配置） */
  judge: JudgeKind;
  /** 启用（可配置） */
  enabled: boolean;
  /** 阈值参数（可配置，量化规则才有） */
  params: LabelParam[];
  /** 综合评定维度（可配置，健康等级等多维综合评定标签才有，不用数值阈值） */
  dims: string[];
  /** 评估周期（时间维度）：每日/每周/每月/每 N 天/周/月 */
  cycle: LabelCycle;
  /** 适用维度（种子固定）：系列维度标签命中挂系列，编码明细不重复展示 */
  scope: LabelScope;
}

export type Health = 'A' | 'B' | 'C' | 'D';

/* ---------- 评估周期（时间维度）：每日 / 每周 / 每月 / 指定天数 / 每 X 周 / 每 X 月 ---------- */

export interface LabelCycle {
  /** 周期单位 */
  unit: 'day' | 'week' | 'month';
  /** 每 N 个单位评估一次（每日/每周/每月 即 every=1） */
  every: number;
}
export type CycleKind = 'daily' | 'weekly' | 'monthly' | 'days' | 'weeks' | 'months';
export const CYCLE_OPTS: { v: CycleKind; t: string; unit: LabelCycle['unit']; fixed: number | null }[] = [
  { v: 'daily', t: '每日', unit: 'day', fixed: 1 },
  { v: 'weekly', t: '每周', unit: 'week', fixed: 1 },
  { v: 'monthly', t: '每月', unit: 'month', fixed: 1 },
  { v: 'days', t: '指定天数', unit: 'day', fixed: null },
  { v: 'weeks', t: '每 X 周', unit: 'week', fixed: null },
  { v: 'months', t: '每 X 月', unit: 'month', fixed: null },
];
export const UNIT_TEXT: Record<LabelCycle['unit'], string> = { day: '天', week: '周', month: '月' };
/** 周期值 → 表单枚举（every=1 归入每日/每周/每月，其余归入每 N 形式） */
export const cycleKindOf = (c: LabelCycle): CycleKind =>
  CYCLE_OPTS.find((o) => o.unit === c.unit && o.fixed === c.every)?.v
  ?? (c.unit === 'day' ? 'days' : c.unit === 'week' ? 'weeks' : 'months');
export const cycleText = (c: LabelCycle): string => {
  const opt = CYCLE_OPTS.find((o) => o.v === cycleKindOf(c));
  return opt?.fixed ? opt.t : `每 ${c.every} ${UNIT_TEXT[c.unit]}`;
};

export interface Qc2Hit {
  labelId: string;
  /** 命中时间 */
  at: string;
  /** 判定来源说明 */
  source: string;
}

export interface Qc2Code {
  code: string;
  name: string;
  seriesCode: string;
  seriesName: string;
  platforms: Platform[];
  /** 近30天订单量 */
  orders: number;
  refundRate: number;
  /** 健康等级（同时以「健康等级」大类标签形式命中）；null = 未命中任何标签（新品 / 长尾，数据未达判定窗口） */
  health: Health | null;
  hits: Qc2Hit[];
}

/* ---------- 大类与配色 ---------- */

export const QC2_CATS = [
  '销量层级款', '订单结构款', '商品合规款', '季节款', '事件驱动款', '利润层级款',
  '订单异常款', '成本管控款', '团队运营人效', '渠道适配款', '类目系列结构',
  '时间周期特征', '运营决策款', '健康等级', '补充分析项',
];

export const CAT_COLOR: Record<string, string> = {
  销量层级款: '#4f7cff',
  订单结构款: '#0fc6c2',
  商品合规款: '#f53f3f',
  季节款: '#00b42a',
  事件驱动款: '#ff7d00',
  利润层级款: '#722ed1',
  订单异常款: '#e6455c',
  成本管控款: '#ff9a2e',
  团队运营人效: '#3491fa',
  渠道适配款: '#eb2f96',
  类目系列结构: '#14c9c9',
  时间周期特征: '#86909c',
  运营决策款: '#2f54eb',
  健康等级: '#52c41a',
  补充分析项: '#a05df6',
};

export const HEALTH_META: Record<Health, { label: string; color: string; desc: string }> = {
  A: { label: 'A 级 · 优质', color: '#00b42a', desc: '各维度表现均优，店铺核心优质资产' },
  B: { label: 'B 级 · 稳定', color: '#4f7cff', desc: '整体稳定，存在少量非致命问题' },
  C: { label: 'C 级 · 观察', color: '#ff7d00', desc: '存在较明显风险项，需重点观察并优化' },
  D: { label: 'D 级 · 风险', color: '#f53f3f', desc: '继续经营价值低，应优先汰换' },
};

/* ---------- 标签种子（《商品数据稽查.xlsx》修订后 sheet 全量） ---------- */

const P = (key: string, metric: string, days: number | null, op: ParamOp, value: number, unit: string): LabelParam => ({ key, metric, days, op, value, unit });

/** [大类, 标签名, 判定方式, 命中规则, 阈值参数, 综合评定维度] */
type SeedRow = [string, string, JudgeKind, string, LabelParam[]?, string[]?];

const SEED_ROWS: SeedRow[] = [
  ['销量层级款', '平台爆款', 'rule', '对应平台同二级类目下，SKU或商品编码或ID订单量、销售金额排名进入前 10%，同 ID下SKU或系列编码关联订单占比靠前，客单价稳定，全平台流量承接能力强，属于平台层级头部热销商品。', [P('topPct', '类目排名', null, '进入前', 10, '%')]],
  ['销量层级款', '店铺级爆款', 'rule', '在所属店铺全量ID或系列编码中，订单量、付款金额占比超 10%，为店铺核心销量支柱，出仓稳定，利润贡献位居前列，是店铺主力热销爆款。', [P('sharePct', '订单量占比', null, '>', 10, '%')]],
  ['销量层级款', '类目头部款', 'rule', '在店铺所属一级 / 二级类目内，ID或SKU、系列编码关联订单订单量、订单占比位居类目前 20%，销售表现优于同店铺同类目绝大多数 编码，为类目层级核心热销款', [P('topPct', '类目排名', null, '进入前', 20, '%')]],
  ['销量层级款', '热销稳定款', 'rule', '近 3 日ID或SKU、系列编码关联订单订单量趋势平稳无大幅涨跌，ID、SKU、系列编码订单占比位居前列，客单价处于类目均值以上，销售金额剔除刷单、全部退款后数值稳定，经营大类、二级类目流量转化正常，无异常订单取消记录', [P('flatPct', '较周期均值涨幅', 3, '<=', 10, '%')]],
  ['销量层级款', '销量爆发款', 'rule', '当日ID或系列编码、商品编码订单量、付款金额、销售金额较近 7 日均值涨幅超 30%，订单占比同步提升，无大额刷单金额、无大批量退款，仓库出仓正常，无成本异常偏差。', [P('risePct', '较周期均值涨幅', 7, '>', 30, '%')]],
  ['销量层级款', '销量下滑滞销款', 'rule', '当日ID或系列编码、商品编码订单量、销售金额较近 3 日均值跌幅超 40%，订单占比持续走低，无新增付款订单，发货前、发货后退款占比升高，连续多日无有效出仓记录', [P('dropPct', '较周期均值跌幅', 3, '>', 40, '%')]],
  ['销量层级款', '零动销沉睡款', 'rule', '近 7 天ID或系列编码、商品编码订单量为 0，无付款金额、无出仓记录，持续占用上架资源与库存成本，无有效销售产出，属于沉睡无动销商品。', [P('zeroOrders', '订单量', 7, '=', 0, '单')]],
  ['订单结构款', '均衡盈利款', 'rule', '同店铺下ID或系列编码、SKU订单占比分配均匀，无单一垄断流量，各规格均有动销、利润均衡，整体商品抗风险能力强、品类结构健康。'],
  ['订单结构款', '独大款', 'rule', '同店铺下仅1个ID或系列编码，或同ID下仅1个SKU订单占比超 90%，其余ID、SKU、系列编码零动销、零订单、纯成本占用，商品品类结构极度单一，流量利用低效。', [P('sharePct', '订单量占比', null, '>', 90, '%')]],
  ['订单结构款', '长尾动销款', 'rule', 'SKU或商品编码或ID，订单量单日订单量偏低但持续有稳定成交，无长时间断档，单编码订单量占店铺总单量比例低于 1%，多规格分散贡献销量，属于长尾型稳健动销商品。', [P('sharePct', '订单量占比', null, '<', 1, '%')]],
  ['商品合规款', '标题违禁 / 违规风险款', 'ai', '基于商品名称、颜色规格、系列编码字段筛查，商品标题及规格描述中包含平台禁限词、极限词、虚假宣传词汇，不符合对应平台上架规则，存在店铺违规扣分、商品下架风险'],
  ['商品合规款', '知识产权侵权风险款', 'ai', '商品名称、系列编码、商品 ID 对应商品信息，存在冒用品牌词汇、仿款描述、专利侵权、图案侵权相关特征，结合行业侵权对标规则，判定存在潜在侵权投诉风险'],
  ['商品合规款', '商品信息缺失不完善款', 'rule', '商品编码、系列编码、颜色规格、商品名称、图片字段存在空值或信息不全，一级 / 二级类目归属模糊，小组、运营归属信息缺失，商品基础档案不完整，影响数据统计及平台收录'],
  ['商品合规款', '图文不符异常款', 'ai', '商品图片展示内容与商品名称、颜色规格、系列编码实际属性不匹配，图片展示款式、规格、色系和后台登记的 编码 信息存在偏差，易引发用户退款、投诉、差评'],
  ['商品合规款', '类目错放违规款', 'ai', '商品实际属性、系列品类与经营大类、一级类目、二级类目归属不符，存在跨类目错放、挂靠高流量类目行为，违反平台类目摆放规则，存在流量异常、处罚风险'],
  ['商品合规款', '编码规格重复冗余款', 'ai', '同一商品编码、同系列编码下，存在多个店铺编码颜色规格高度重合、参数一致的冗余编码，无差异化属性，造成店铺商品数据冗余、库存及订单统计混乱'],
  ['季节款', '春季款', 'ai', '商品名称、颜色规格描述包含踏青、碎花、轻薄、透气、春日、早春、换季等春季专属关键词，一级 / 二级类目归属春日服饰、春游用品、春季家居换季品类，为春季时令主推商品'],
  ['季节款', '夏季款', 'ai', '商品名称、颜色规格描述包含扇子、凉席、短袖、遮阳、冰丝等夏季专属关键词，一级 / 二级类目归属夏季服饰、夏日家居、消暑用品类目'],
  ['季节款', '秋季款', 'ai', '商品名称、颜色规格描述包含秋款、早秋、薄绒、防风、秋收、简约秋装等秋季专属关键词，经营大类归属秋日穿搭、秋季居家用品类目，适配秋季降温、换季消费场景'],
  ['季节款', '冬季款', 'ai', '商品名称、颜色规格描述包含保暖、加绒、羽绒服、棉服、取暖等冬季专属关键词，经营大类归属冬季保暖类目，秋冬季节主推商品'],
  ['事件驱动款', '大促节点爆发款', 'rule', '基于订单时间匹配平台 618、双 11、年货节等大促活动周期，该ID、SKU、系列编码订单量、付款金额较日常均值涨幅超 50%，销售金额同步提升，退款率低于日常水平，为大促事件驱动型热销商品', [P('risePct', '较周期均值涨幅', null, '>', 50, '%')]],
  ['事件驱动款', '节日应景款', 'ai', '商品名称、颜色规格包含情人节、中秋、圣诞、开学季、毕业季等节日 / 节点关键词，订单时间集中在对应节日前后一周，订单量呈周期性脉冲式增长，为节日专属事件驱动商品'],
  ['事件驱动款', '热点跟风款', 'ai', '订单时间与社会热点、影视综艺、网红带货事件时间高度重合，短时间内订单量暴涨，商品名称包含同款、网红、明星同款等关键词，事件热度消退后销量快速回落，具备典型短期事件驱动特征'],
  ['事件驱动款', '高客单精品款', 'rule', '系列编码/SKU/ID客单价高于店铺类目均值 2 倍以上，商品 ID 对应系列编码为高端系列，颜色规格为定制稀缺规格，无低价竞品规格，销售质量高', [P('aovTimes', '客单价较类目均值', null, '>=', 2, '倍')]],
  ['利润层级款', '高盈利爆款', 'rule', 'ID、SKU、系列编码的毛一、毛二、毛三利润、毛三利润新均为正向高位，出仓利润可观，总销售成本、快递费、平台扣点成本可控，无高额补发、赠品、代发成本，采购成本差价、定制成本差为正向或无偏差'],
  ['利润层级款', '微利保本款', 'rule', 'ID或SKU、系列编码关联订单各项利润指标趋近于 0，销售金额可覆盖基础出仓成本、平台服务费、快递费，无大额亏损，薪资分摊、道具费、产品运费成本持平'],
  ['利润层级款', '亏损款', 'rule', 'ID或SKU、系列编码关联订单毛一、毛二、毛三利润为负值，销售金额无法覆盖总销售成本、真实出仓成本，存在高额平台扣点、补发成本、赠品成本，采购成本差价偏高，取消单返还、销退仓返还成本不足以弥补亏损'],
  ['订单异常款', '高退款风险款', 'rule', 'ID或SKU、系列编码关联订单总退款金额占付款金额比例超 20%，发货前退款、发货后退款订单量偏高，销售金额因退款大幅折损，出仓利润大幅缩水，多次出现退款订单记录', [P('refundPct', '退款率', null, '>', 20, '%')]],
  ['订单异常款', '刷单异常款', 'rule', 'ID或SKU、系列编码关联订单刷单金额不为 0，剔除刷单金额后真实销售订单、付款金额大幅下降，存在虚假订单数据，订单量虚高但真实利润偏低', [P('brushAmt', '刷单金额', null, '>', 0, '元')]],
  ['订单异常款', '高频取消单款', 'rule', 'ID或SKU、系列编码关联订单取消单数量多，取消单返还成本、销退仓返还成本频繁产生，已生成出仓成本、预估成本但订单未成交，无效成本损耗较高'],
  ['订单异常款', '返还成本对冲盈利款', 'rule', 'ID或SKU、系列编码关联订单取消单返还成本、销退仓返还成本较高，可有效对冲该 编码 部分销售亏损、成本损耗，降低整体单品亏损幅度'],
  ['订单异常款', '有退款无成本返还款', 'rule', 'ID或SKU、系列编码关联订单存在大量发货前、发货后退款及取消订单，但取消单返还成本、销退仓返还成本为 0，退款损耗完全由店铺承担，无任何成本回流补偿'],
  ['成本管控款', '成本合规优质款', 'rule', 'ID或SKU、系列编码关联订单真实出仓成本与预估出仓成本基本持平，总销售成本、代发成本、补发成本、赠品成本偏低，快递费、包装材料、平台服务费无异常溢价，采购运费分摊合理，无额外加工、样品、道具费用损耗。'],
  ['成本管控款', '成本异常偏高款', 'rule', 'ID或SKU、系列编码关联订单真实出仓成本远超预估出仓成本，快递费、实际快递费偏差较大，平台扣点、平台服务费偏高，存在高额补发、赠品、代发成本，采购成本差价、定制款成本差异常，仓库及运营相关成本损耗超标。'],
  ['成本管控款', '高频样品损耗款', 'rule', 'ID或SKU、系列编码关联订单持续产生样品费、拿样费、道具费、加工费，常规销售订单利润无法覆盖小众杂费支出，长期处于杂费损耗大于销售盈利的状态'],
  ['成本管控款', '高额运费损耗款', 'rule', 'ID或SKU、系列编码关联订单产品运费、实际快递费远超预估快递费，采购运费分摊导致采购成本差价偏高，无对应销售额增量，纯运费成本异常损耗'],
  ['成本管控款', '高赠品投入低转化款', 'rule', 'ID或SKU、系列编码关联订单赠品成本居高不下，但客单价、复购、订单占比无正向提升，赠品投入未带来销售增益，纯成本浪费。'],
  ['团队运营人效', '优质运营产出款', 'rule', '对应小组、运营专员、运营助理负责的ID或SKU、系列编码关联订单，订单量、客单价、销售数据优质，利润指标达标，退款率、异常订单率低，人力薪资分摊成本性价比高，小组整体产出优异'],
  ['团队运营人效', '低效运营管控款', 'rule', '对应运营人员负责的ID或SKU、系列编码关联订单长期滞销、亏损，退款异常、成本损耗高，订单占比持续低迷，人力薪资分摊后无正向收益，小组产出偏低'],
  ['团队运营人效', '低人力成本高产出款', 'rule', '对应小组、运营、客服、仓库薪资分摊成本低，ID或SKU、系列编码关联订单订单量、销售额、利润表现优异，单薪资成本产出效益高，小组运营投产比优质。'],
  ['团队运营人效', '高人力成本空耗款', 'rule', 'ID或SKU、系列编码关联订单长期滞销、无有效销售利润，但持续分摊仓库薪资、运营薪资、客服薪资，人力成本空耗，无产出收益，占用团队运营精力'],
  ['渠道适配款', '核心渠道爆款', 'rule', '指定平台、核心店铺上架ID或SKU、系列编码关联订单，对应专属仓库发货，订单量、付款金额、销售金额位居渠道前列，出仓效率高，成本损耗低，渠道适配性强。'],
  ['渠道适配款', '单渠道独占爆款', 'rule', '同一ID或SKU、系列编码关联订单仅在单一平台 / 单一店铺产生有效订单、销售利润，其他平台、店铺上架后零动销、零订单，渠道适配性单一，仅适配特定平台流量规则'],
  ['渠道适配款', '多渠道分化不均款', 'rule', '同款ID或SKU、系列编码关联订单在不同平台、不同店铺的客单价、订单占比、退款率、利润数据差异极大，部分渠道盈利、部分渠道亏损，渠道运营适配度不均衡'],
  ['渠道适配款', '高扣点低效渠道款', 'rule', '依托平台、店铺字段匹配，该ID或SKU、系列编码关联订单所在平台平台扣点、平台服务费偏高，销售金额可观但利润被平台费用大幅压缩，投入产出比偏低'],
  ['渠道适配款', '仓储适配异常款', 'rule', 'ID或SKU、系列编码关联订单绑定仓库出仓成本异常，出仓效率低，频繁产生补发成本、销退成本，不同平台、店铺同款 编码 数据差异极大，仓储适配度差，库存周转低效。'],
  ['类目系列结构', '类目标杆款', 'rule', '同一一级、二级类目、同ID或SKU、系列编码关联订单下，该ID或SKU、系列编码关联订单订单占比、销售额、利润排名靠前，客单价优于类目同类 编码，成本管控最优，异常订单最少，为类目核心主推款'],
  ['类目系列结构', '系列短板款', 'rule', '同ID或SKU、系列编码关联订单，同经营大类商品中，订单量、销售金额、利润垫底，退款率、成本损耗最高，拖累整体系列类目数据，无市场竞争力'],
  ['类目系列结构', '店铺销量高度集中款', 'rule', '店铺内前 20% 的ID或SKU、系列编码关联订单贡献了全店 80% 以上的订单量，销量高度集中于少数头部爆款，长尾ID或SKU、系列编码关联订单几乎无动销，店铺整体抗风险能力弱，订单结构失衡', [P('topPct', '订单量占比', null, '进入前', 20, '%'), P('contributePct', '店铺订单贡献占比', null, '>', 80, '%')]],
  ['类目系列结构', '店铺销量过于分散款', 'rule', '店铺ID或SKU、系列编码关联订单数量众多，但单ID或SKU、系列编码关联订单平均订单量极低，无明确头部爆款，订单过于分散，运营、仓储、库存成本分摊后单ID或SKU、系列编码关联订单盈利薄弱，投入产出效率偏低'],
  ['时间周期特征', '周末高爆发款', 'rule', '基于订单时间、发生时间字段统计，该ID或SKU、系列编码关联订单周末订单量、付款金额占本周总数据占比超 60%，工作日销量低迷，呈现典型周末集中出单的时段特征，适配周末流量消费场景', [P('weekendPct', '周末订单占比', null, '>', 60, '%')]],
  ['时间周期特征', '工作日稳定动销款', 'rule', '基于订单时间统计，ID或SKU、系列编码关联订单工作日每日订单量均匀稳定，无大幅空档，周末销量无明显波动，属于全周期稳定动销、受众消费无时段偏好的常规刚需款'],
  ['时间周期特征', '夜间异常出单款', 'rule', 'ID或SKU、系列编码关联订单关联订单时间集中在凌晨深夜时段，与店铺常规客流时段不符，订单占比异常偏高，结合刷单金额字段，大概率存在夜间刷单、异常补单操作，数据真实性存疑'],
  ['运营决策款', '重点主推款', 'ai', 'ID或SKU、系列编码关联订单关联订单同时满足订单量高、销售金额高、利润正向、退款率低、成本可控、渠道适配性强，可列为店铺重点主推商品，优先分配流量、库存、运营资源'],
  ['运营决策款', '观察优化款', 'ai', 'ID或SKU、系列编码关联订单关联订单销售表现一般但未出现明显亏损，订单量、客单价、转化率、退款率处于中间区间，可通过优化标题、主图、价格、赠品、客服话术进一步提升表现'],
  ['运营决策款', '限制投放款', 'ai', 'ID或SKU、系列编码关联订单关联订单存在高退款、高刷单、高成本、低利润、低动销等一项或多项风险指标，继续投放会消耗运营资源与库存成本，应限制推广投入并进行整改评估'],
  ['运营决策款', '清仓汰换款', 'ai', 'ID或SKU、系列编码关联订单关联订单长期零动销、持续亏损、退款率高、成本异常、信息违规或库存积压严重，无明显改善空间，应纳入清仓、下架、汰换或替换规划'],
  /* 健康等级 = 多维综合评定：配置评定维度组合，不用数值阈值表达 */
  ['健康等级', '健康度 A 级-优质', 'ai', 'ID或SKU、系列编码关联订单关联订单在销售、利润、退款、成本、信息质量、渠道适配、运营效率等维度表现均优，无明显风险项，为店铺核心优质资产', undefined, ['销售表现', '利润表现', '退款表现', '成本管控', '信息质量', '渠道适配', '运营人效']],
  ['健康等级', '健康度 B 级-稳定', 'ai', 'ID或SKU、系列编码关联订单关联订单整体销售和利润表现稳定，存在少量非致命问题，如信息待完善、成本略高、动销一般，但仍具备继续经营价值', undefined, ['销售表现', '利润表现', '成本管控', '信息质量']],
  ['健康等级', '健康度 C 级-观察', 'ai', 'ID或SKU、系列编码关联订单关联订单存在较明显风险项，如销量下滑、利润偏弱、退款偏高、成本异常、信息违规，需要重点观察并制定优化方案', undefined, ['销售表现', '利润表现', '退款表现', '成本管控', '信息质量']],
  ['健康等级', '健康度 D 级-风险', 'ai', 'ID或SKU、系列编码关联订单关联订单长期滞销、亏损严重、退款率高、刷单嫌疑明显、信息严重违规或成本失控，继续经营价值低，应优先汰换', undefined, ['销售表现', '利润表现', '退款表现', '成本管控', '信息质量', '订单异常']],
  /* 修订后 sheet 末尾 3 条补充分析项（无大类，归入「补充分析项」） */
  ['补充分析项', '投产比', 'rule', '产品利润降低，成本负增长同时，商品编码、系列编码、SKU或ID的单量未增长'],
  ['补充分析项', '采购成本', 'rule', '本年采购成本高于去年平均，导致同等销量稳定情况下，利润低于往年'],
  ['补充分析项', '产品适合售卖平台', 'ai', '通过数据对比，全平台低利润原因（个别平台操作拉底平均值，资源占有）'],
];

/* 种子评估周期错落取值，覆盖每日/每周/每月三档展示 */
const SEED_CYCLES: LabelCycle[] = [
  { unit: 'day', every: 1 },
  { unit: 'week', every: 1 },
  { unit: 'month', every: 1 },
];

/* 维度复盘结论（用户拍板）：属性型 / 结构型标签升系列编码维度判定，命中直接挂系列；其余保持商品编码维度 */
const SERIES_SCOPE_NAMES = new Set(['春季款', '夏季款', '秋季款', '冬季款', '节日应景款', '热点跟风款', '均衡盈利款', '独大款']);

export const QC2_LABEL_SEED: Qc2Label[] = SEED_ROWS.map(([cat, name, judge, rule, params, dims], i) => ({
  id: `LB-${String(i + 1).padStart(3, '0')}`,
  cat,
  name,
  rule,
  judge,
  enabled: true,
  params: params ?? [],
  dims: dims ?? [],
  cycle: SEED_CYCLES[i % SEED_CYCLES.length],
  scope: SERIES_SCOPE_NAMES.has(name) ? 'series' : 'code',
}));

/* ---------- 配置 store（自动持久化） ---------- */

const LS_KEY = 'funion:qc2Labels';

const cloneSeed = (): Qc2Label[] => JSON.parse(JSON.stringify(QC2_LABEL_SEED)) as Qc2Label[];

/** 旧存档无周期字段时回填默认每日，保证结构完整 */
const normCycle = (c: Partial<LabelCycle> | undefined, fallback: LabelCycle): LabelCycle => {
  const unit = c?.unit === 'week' || c?.unit === 'month' ? c.unit : c?.unit === 'day' ? 'day' : null;
  if (!unit) return { ...fallback };
  const every = typeof c?.every === 'number' && c.every >= 1 ? Math.floor(c.every) : 1;
  return { unit, every };
};

/** 旧版参数结构（label 文案式）迁移为「维度/周期/运算符/阈值/单位」结构 */
const normParam = (p: Partial<LabelParam> & { key: string }): LabelParam => ({
  key: p.key,
  metric: typeof p.metric === 'string' && p.metric ? p.metric : PARAM_METRICS[0],
  days: typeof p.days === 'number' ? p.days : null,
  op: PARAM_OPS.includes(p.op as ParamOp) ? (p.op as ParamOp) : '>',
  value: typeof p.value === 'number' ? p.value : 0,
  unit: typeof p.unit === 'string' && p.unit ? p.unit : PARAM_UNITS[0],
});

const loadLabels = (): Qc2Label[] => {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null') as Qc2Label[] | null;
    if (!saved?.length) return cloneSeed();
    /* 种子新增标签合并：以 id 对齐，本地仅覆盖可配置字段 */
    const merged = cloneSeed().map((seed) => {
      const hit = saved.find((s) => s.id === seed.id);
      if (!hit) return seed;
      return {
        ...seed,
        rule: hit.rule,
        judge: hit.judge,
        enabled: hit.enabled,
        params: seed.params.map((p) => ({ ...p, value: hit.params?.find((x) => x.key === p.key)?.value ?? p.value })),
        dims: Array.isArray(hit.dims) ? hit.dims.filter((d) => typeof d === 'string') : seed.dims,
        cycle: normCycle(hit.cycle, seed.cycle),
      };
    });
    /* 本地新建标签（种子外 id）恢复 */
    const extra = saved
      .filter((s) => !QC2_LABEL_SEED.some((seed) => seed.id === s.id))
      .map((s) => ({ ...s, params: (s.params ?? []).map((p) => normParam(p)), dims: Array.isArray(s.dims) ? s.dims : [], cycle: normCycle(s.cycle, { unit: 'day', every: 1 }), scope: s.scope === 'series' ? 'series' : 'code' as LabelScope }));
    return [...merged, ...extra];
  } catch { return cloneSeed(); }
};

export const qc2Labels = ref<Qc2Label[]>(loadLabels());

watch(qc2Labels, (v) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(v)); } catch { /* 忽略隐私模式异常 */ }
}, { deep: true });

/* ---------- AI 分析状态：AI 标签保存后自动同步分析结果，记录最近分析时间 ---------- */

export interface Qc2AiState {
  /** 最近一次 AI 分析完成时间 */
  lastRunAt: string | null;
}

const AI_LS_KEY = 'funion:qc2AiState';

const loadAiState = (): Qc2AiState => {
  try {
    const saved = JSON.parse(localStorage.getItem(AI_LS_KEY) || 'null') as Qc2AiState | null;
    if (saved?.lastRunAt) return { lastRunAt: saved.lastRunAt };
  } catch { /* 忽略 */ }
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return { lastRunAt: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 08:30` };
};

export const qc2AiState = ref<Qc2AiState>(loadAiState());

watch(qc2AiState, (v) => {
  try { localStorage.setItem(AI_LS_KEY, JSON.stringify(v)); } catch { /* 忽略隐私模式异常 */ }
}, { deep: true });

/** AI 标签配置保存 → 分析结果同步刷新 */
export const touchAiRun = () => {
  qc2AiState.value = { lastRunAt: fmtDay(new Date()) };
};

/** 新建标签（编辑 / 新建统一表单，判定方式可随时切换） */
export interface NewLabelInput { cat: string; name: string; judge: JudgeKind; rule: string; params: LabelParam[]; dims: string[]; cycle: LabelCycle }

export const createQc2Label = (input: NewLabelInput): Qc2Label => {
  const seq = qc2Labels.value.filter((l) => l.id.startsWith('LB-N')).length + 1;
  const lb: Qc2Label = {
    id: `LB-N${String(seq).padStart(2, '0')}`,
    cat: input.cat,
    name: input.name,
    rule: input.rule,
    judge: input.judge,
    enabled: true,
    params: input.params,
    dims: input.dims,
    cycle: input.cycle,
    scope: 'code',
  };
  qc2Labels.value = [...qc2Labels.value, lb];
  if (lb.judge === 'ai') touchAiRun();
  return lb;
};

export const labelById = (id: string): Qc2Label | undefined => qc2Labels.value.find((l) => l.id === id);

export const JUDGE_LABEL: Record<JudgeKind, string> = { rule: '通用数据', ai: 'AI 分析' };

/* ---------- 编码维度 mock（品控中心系列数据同源扩展） ---------- */

/** 字符串哈希（确定性伪随机） */
const h32 = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
};

/* 品控中心现有系列直接摊平复用（口径同源） */
const baseCodes: Omit<Qc2Code, 'health' | 'hits'>[] = QC_CENTER_SERIES.flatMap((s) => s.codes.map((c) => {
  const orders = c.platforms.reduce((t, p) => t + p.orders, 0);
  const refunds = c.platforms.reduce((t, p) => t + p.orders * p.refundRate, 0);
  return {
    code: c.code,
    name: c.name,
    seriesCode: s.seriesCode,
    seriesName: s.name,
    platforms: c.platforms.map((p) => p.platform),
    orders,
    refundRate: orders ? Math.round((refunds / orders) * 1000) / 1000 : 0,
  };
}));

/* 追加系列：贴合「什么时候能做什么品」的季节 / 事件品类 */
const EXTRA_SERIES: [string, string, string[]][] = [
  ['XL-2005', '防晒衣系列', ['防晒衣 冰丝款-白 M', '防晒衣 冰丝款-黑 L', '防晒衣 UPF50+-粉', '儿童防晒外套']],
  ['XL-2006', '冰丝凉席系列', ['冰丝凉席 1.8m', '冰丝凉席 1.5m', '凉席三件套-蓝']],
  ['XL-2007', '校园文具系列', ['开学季文具礼盒', '中性笔 12支装', '错题打印机']],
  ['XL-2008', '中秋礼盒系列', ['中秋月饼礼盒-高端', '月饼礼盒-团圆款', '中秋灯笼摆件']],
  ['XL-2009', '加绒卫衣系列', ['加绒卫衣-灰 M', '加绒卫衣-黑 XL', '情侣款加绒上衣', '加绒卫裤-深蓝']],
  ['XL-2010', '桌面收纳系列', ['桌面收纳盒 三层', '亚克力化妆品收纳', '抽屉分隔收纳格']],
];

const extraCodes: Omit<Qc2Code, 'health' | 'hits'>[] = EXTRA_SERIES.flatMap(([seriesCode, seriesName, names]) => names.map((name, i) => {
  const h = h32(seriesCode + name);
  const platPool: Platform[] = ['抖音', '快手', '拼多多', '淘宝', '天猫', '京东'];
  const platforms = platPool.filter((_, pi) => (h >> pi) % 3 !== 0).slice(0, 3);
  return {
    code: `SP-${seriesCode.slice(3)}${String(i + 1).padStart(2, '0')}`,
    name,
    seriesCode,
    seriesName,
    platforms: platforms.length ? platforms : ['抖音'],
    orders: 60 + (h % 2400),
    refundRate: Math.round((0.02 + (h % 26) / 100) * 1000) / 1000,
  };
}));

const HEALTH_PICK: Health[] = ['A', 'B', 'B', 'C', 'A', 'D', 'B', 'C', 'C', 'A', 'B', 'D'];

/** 运营决策标签按健康等级映射（决策建议与等级自洽） */
const DECISION_BY_HEALTH: Record<Health, string> = {
  A: '重点主推款', B: '观察优化款', C: '限制投放款', D: '清仓汰换款',
};

const fmtDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const buildCode = (base: Omit<Qc2Code, 'health' | 'hits'>): Qc2Code => {
  const h = h32(base.code);
  /* 约 1/5 编码为新品 / 长尾：数据未达判定窗口，不命中任何标签（含健康等级与运营决策） */
  if (h % 5 === 0) return { ...base, health: null, hits: [] };
  const health = HEALTH_PICK[h % HEALTH_PICK.length];
  /* 系列维度标签不逐编码判定（命中挂系列），编码池仅含编码维度标签 */
  const pool = QC2_LABEL_SEED.filter((l) => l.cat !== '健康等级' && l.cat !== '运营决策款' && l.cat !== '补充分析项' && l.scope === 'code');
  /* 每编码命中 4~9 个常规标签（确定性），叠加健康等级 + 运营决策标签 */
  const n = 4 + (h % 6);
  const picked = new Set<string>();
  for (let k = 0; picked.size < n; k += 1) {
    const cand = pool[(h >> 3) * (k + 7) % pool.length];
    picked.add(cand.id);
  }
  const healthLabel = QC2_LABEL_SEED.find((l) => l.cat === '健康等级' && l.name.includes(`${health} 级`));
  if (healthLabel) picked.add(healthLabel.id);
  const decision = QC2_LABEL_SEED.find((l) => l.cat === '运营决策款' && l.name === DECISION_BY_HEALTH[health]);
  if (decision) picked.add(decision.id);
  const now = Date.now();
  const hits: Qc2Hit[] = [...picked].map((id, i) => {
    const lb = labelById(id)!;
    return {
      labelId: id,
      at: fmtDay(new Date(now - ((h >> (i % 8)) % 168) * 3600 * 1000)),
      source: lb.judge === 'ai' ? `AI 分析引擎 · 置信度 ${78 + (h >> i) % 20}%` : '订单宽表 · 数据规则引擎',
    };
  }).sort((a, b) => b.at.localeCompare(a.at));
  return { ...base, health, hits };
};

export const QC2_CODES: Qc2Code[] = [...baseCodes, ...extraCodes].map(buildCode);

/* ---------- 系列编码维度命中（系列维度标签：命中直接挂系列，不逐编码复制） ---------- */

/* 季节 / 事件型系列标签：按系列确定性映射（保证「时机」维度有真实命中） */
const SERIES_SCOPE_LABELS: Record<string, string[]> = {
  'XL-2005': ['夏季款'],
  'XL-2006': ['夏季款'],
  'XL-2007': ['节日应景款', '春季款'],
  'XL-2008': ['节日应景款', '秋季款'],
  'XL-2009': ['冬季款', '秋季款'],
};

/* 结构型 / 事件型系列标签：按系列编号确定性 mock（保证每个标签均有命中） */
const seriesScopeExtra = (seriesCode: string): string[] => {
  const n = Number(seriesCode.slice(-2));
  const out: string[] = [];
  if (n % 4 === 1) out.push('均衡盈利款');
  if (n % 5 === 2) out.push('独大款');
  if (n % 3 === 0) out.push('热点跟风款');
  return out;
};

export const QC2_SERIES_HITS: Record<string, Qc2Hit[]> = {};
[...new Set(QC2_CODES.map((c) => c.seriesCode))].forEach((sc) => {
  const now = Date.now();
  QC2_SERIES_HITS[sc] = [...(SERIES_SCOPE_LABELS[sc] ?? []), ...seriesScopeExtra(sc)]
    .map((name) => QC2_LABEL_SEED.find((l) => l.name === name && l.scope === 'series'))
    .filter((l): l is Qc2Label => !!l)
    .map((lb, i) => ({
      labelId: lb.id,
      at: fmtDay(new Date(now - (i + 2) * 26 * 3600 * 1000)),
      source: '系列维度判定 · 整线命中',
    }));
});

/** 系列有效命中（系列维度标签，过滤已停用），配置调整后全模块实时生效 */
export const effectiveSeriesHits = (seriesCode: string): Qc2Hit[] =>
  (QC2_SERIES_HITS[seriesCode] ?? []).filter((h) => labelById(h.labelId)?.enabled);

/** 编码有效命中（过滤已停用标签），配置调整后全模块实时生效 */
export const effectiveHits = (c: Qc2Code): Qc2Hit[] => c.hits.filter((hit) => labelById(hit.labelId)?.enabled);

/* ---------- 概览派生统计 ---------- */

export interface CatStat { cat: string; color: string; labels: number; enabled: number; hits: number; codes: number; }

export const catStats = (): CatStat[] => QC2_CATS.map((cat) => {
  const labels = qc2Labels.value.filter((l) => l.cat === cat);
  const ids = new Set(labels.filter((l) => l.enabled).map((l) => l.id));
  /* 命中 = 编码命中 + 系列维度命中（系列标签整线计 1 次） */
  const hits = QC2_CODES.reduce((t, c) => t + c.hits.filter((hit) => ids.has(hit.labelId)).length, 0)
    + Object.values(QC2_SERIES_HITS).flat().filter((hit) => ids.has(hit.labelId)).length;
  /* 涉及编码：编码命中 ∪ 命中系列覆盖的全部编码 */
  const seriesCodes = new Set(Object.entries(QC2_SERIES_HITS)
    .filter(([, hs]) => hs.some((hit) => ids.has(hit.labelId)))
    .flatMap(([sc]) => QC2_CODES.filter((c) => c.seriesCode === sc).map((c) => c.code)));
  const codes = QC2_CODES.filter((c) => c.hits.some((hit) => ids.has(hit.labelId)) || seriesCodes.has(c.code)).length;
  return { cat, color: CAT_COLOR[cat], labels: labels.length, enabled: labels.filter((l) => l.enabled).length, hits, codes };
}).filter((s) => s.labels > 0);

/* ---------- 时机建议（什么时候能做什么品） ---------- */

export interface TimingSuggest { labelName: string; cat: string; why: string; }

/** 月份 → 时机建议（季节款 / 事件驱动款 前置备货窗口） */
const TIMING_MAP: Record<number, TimingSuggest[]> = {
  1: [
    { labelName: '冬季款', cat: '季节款', why: '深冬保暖品类正处销售旺季，加绒 / 羽绒 / 取暖类可持续主推' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '年货节大促周期，礼盒 / 囤货类编码提前 2 周备货' },
    { labelName: '节日应景款', cat: '事件驱动款', why: '情人节前置备货窗口开启，礼品向编码开始起量' },
  ],
  2: [
    { labelName: '春季款', cat: '季节款', why: '早春换季上新窗口，踏青 / 轻薄品类开始动销' },
    { labelName: '节日应景款', cat: '事件驱动款', why: '情人节当周，礼品向编码脉冲式增长' },
  ],
  3: [
    { labelName: '春季款', cat: '季节款', why: '春装 / 春游用品旺季，碎花、透气类主推' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '3.8 大促节点，女性向品类爆发窗口' },
  ],
  4: [
    { labelName: '春季款', cat: '季节款', why: '春游出行场景高峰，春季家居换季品类收尾冲量' },
  ],
  5: [
    { labelName: '夏季款', cat: '季节款', why: '消暑品类前置备货，冰丝 / 遮阳类开始起量' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '618 预售周期开启，头部编码优先分配库存' },
  ],
  6: [
    { labelName: '夏季款', cat: '季节款', why: '夏季品类全面旺季，凉席 / 短袖 / 风扇类主推' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '618 大促正周期，全店爆发峰值' },
    { labelName: '节日应景款', cat: '事件驱动款', why: '毕业季节点，礼品 / 纪念向编码脉冲增长' },
  ],
  7: [
    { labelName: '夏季款', cat: '季节款', why: '盛夏消暑高峰，冰丝 / 降温品类持续出单' },
  ],
  8: [
    { labelName: '秋季款', cat: '季节款', why: '早秋上新窗口，薄绒 / 防风类前置备货' },
    { labelName: '节日应景款', cat: '事件驱动款', why: '开学季当周，文具 / 校园用品脉冲式增长' },
  ],
  9: [
    { labelName: '秋季款', cat: '季节款', why: '秋装旺季开启，秋季降温 / 换季消费场景主推' },
    { labelName: '节日应景款', cat: '事件驱动款', why: '中秋节点前后一周，礼盒 / 应景摆件集中出单' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '双 11 蓄水期启动，头部编码提前锁定库存与流量资源' },
  ],
  10: [
    { labelName: '秋季款', cat: '季节款', why: '秋装销售高峰，简约秋装持续主推' },
    { labelName: '冬季款', cat: '季节款', why: '保暖品类前置备货窗口，加绒 / 棉服开始起量' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '双 11 预售周期，爆发款优先分配推广预算' },
  ],
  11: [
    { labelName: '冬季款', cat: '季节款', why: '保暖品类旺季开启，羽绒 / 取暖类全面主推' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '双 11 正周期，全店爆发峰值' },
  ],
  12: [
    { labelName: '冬季款', cat: '季节款', why: '深冬保暖高峰，加绒 / 羽绒持续出单' },
    { labelName: '节日应景款', cat: '事件驱动款', why: '圣诞 / 跨年节点，礼品向编码脉冲增长' },
    { labelName: '大促节点爆发款', cat: '事件驱动款', why: '双 12 与年货节蓄水，礼盒类提前备货' },
  ],
};

export const timingNow = (): { month: number; list: TimingSuggest[] } => {
  const month = new Date().getMonth() + 1;
  return { month, list: TIMING_MAP[month] ?? [] };
};

/** 各标签当前命中编码数（配置页影响面可见 / 钻取用）；系列维度标签换算为命中系列覆盖的编码数 */
export const labelHitCounts = (): Map<string, number> => {
  const m = new Map<string, number>();
  QC2_CODES.forEach((c) => effectiveHits(c).forEach((h) => m.set(h.labelId, (m.get(h.labelId) ?? 0) + 1)));
  Object.keys(QC2_SERIES_HITS).forEach((sc) => {
    const n = QC2_CODES.filter((c) => c.seriesCode === sc).length;
    effectiveSeriesHits(sc).forEach((h) => m.set(h.labelId, (m.get(h.labelId) ?? 0) + n));
  });
  return m;
};

/* ---------- 品控中心 1.0 合并口径（监控列表 / 数据概览共用） ---------- */

export interface TagBrief {
  /** 健康等级（系列维度取下属编码最高风险） */
  health: Health | null;
  /** 命中次数合计（规则 + AI） */
  total: number;
  rule: number;
  ai: number;
  /** 命中数 Top3 标签（明细列展示） */
  chips: Qc2Label[];
  /** Top3 之外未展示标签数 */
  extra: number;
  /** 全部命中标签（筛选判定用） */
  labels: Qc2Label[];
}

const HEALTH_RANK: Health[] = ['A', 'B', 'C', 'D'];

const briefOfHits = (codes: Qc2Code[], extraHits: Qc2Hit[]): TagBrief => {
  const counts = new Map<string, number>();
  let total = 0;
  let rule = 0;
  let ai = 0;
  let health: Health | null = null;
  const consume = (h: Qc2Hit) => {
    const lb = labelById(h.labelId);
    if (!lb) return;
    total += 1;
    if (lb.judge === 'ai') ai += 1;
    else rule += 1;
    counts.set(lb.id, (counts.get(lb.id) ?? 0) + 1);
  };
  codes.forEach((c) => {
    if (c.health && (!health || HEALTH_RANK.indexOf(c.health) > HEALTH_RANK.indexOf(health))) health = c.health;
    effectiveHits(c).forEach(consume);
  });
  extraHits.forEach(consume);
  const labels = [...counts.keys()]
    .map((id) => labelById(id)!)
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
  return { health, total, rule, ai, chips: labels.slice(0, 3), extra: Math.max(0, labels.length - 3), labels };
};

/** 商品编码维度标签聚合 */
export const briefOf = (codes: Qc2Code[]): TagBrief => briefOfHits(codes, []);

/** 商品编码维度标签聚合（单编码） */
export const codeTagBrief = (code: string): TagBrief => briefOf(QC2_CODES.filter((c) => c.code === code));

/** 系列编码维度标签聚合：健康等级取下属编码最高风险，命中取编码命中 ∪ 系列维度命中 */
export const seriesTagBrief = (seriesCode: string): TagBrief =>
  briefOfHits(QC2_CODES.filter((c) => c.seriesCode === seriesCode), effectiveSeriesHits(seriesCode));

/** 编码是否命中监控列表标签筛选：级联多选为并集语义（一级大类 / 二级标签任一命中即真），健康等级与判定方式仍为 AND */
export const codeMatchTagFilter = (c: Qc2Code, tags: string[], health: string, judge: string): boolean => {
  if (health !== '全部等级' && c.health !== health) return false;
  const cats = tags.filter((t) => QC2_CATS.includes(t));
  const names = tags.filter((t) => !QC2_CATS.includes(t));
  if (!cats.length && !names.length && judge === '全部方式') return true;
  const labels = effectiveHits(c).map((h) => labelById(h.labelId)).filter((x): x is Qc2Label => !!x);
  if ((cats.length || names.length) && !labels.some((l) => cats.includes(l.cat) || names.includes(l.name))) return false;
  if (judge !== '全部方式' && !labels.some((l) => JUDGE_LABEL[l.judge] === judge)) return false;
  return true;
};

/** 系列下属任一商品编码命中标签筛选即真（监控列表系列维度过滤用）；系列维度标签按系列粒度判定 */
export const codesMatchTagFilter = (seriesCode: string, tags: string[], health: string, judge: string): boolean => {
  const codes = QC2_CODES.filter((c) => c.seriesCode === seriesCode);
  const cats = tags.filter((t) => QC2_CATS.includes(t));
  const names = tags.filter((t) => !QC2_CATS.includes(t));
  const sLabels = effectiveSeriesHits(seriesCode).map((h) => labelById(h.labelId)).filter((x): x is Qc2Label => !!x);
  const seriesTagOk = sLabels.some((l) => cats.includes(l.cat) || names.includes(l.name));
  return codes.some((c) => {
    if (health !== '全部等级' && c.health !== health) return false;
    const labels = effectiveHits(c).map((h) => labelById(h.labelId)).filter((x): x is Qc2Label => !!x);
    if (judge !== '全部方式' && !labels.some((l) => JUDGE_LABEL[l.judge] === judge)) return false;
    if (!cats.length && !names.length) return true;
    return seriesTagOk || labels.some((l) => cats.includes(l.cat) || names.includes(l.name));
  });
};
