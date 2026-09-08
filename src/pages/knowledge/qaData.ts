/**
 * QA 管理模块数据层：标准问答对（Q→A）优先匹配层
 * 背景：纯 AI 语义自动回复 / 纯知识库检索的覆盖率与准确率不足，
 *       由客服主管自持一套「标准问题 → 标准答案」问答库供智能回复优先命中（高准确），未命中再回落 AI/知识库。
 * 三个子页共用：问答库（核心资产）/ 会话挖掘（接待问题闭环）/ 行业模板（行业常见咨询闭环）
 * 维度约定：命中场景复用知识库两级模型（KB_SCENE_GROUPS）；答案素材复用 KbMaterial
 */
import { reactive } from 'vue';
import type { KbMaterial } from './data';

/** 问答状态：仅「启用中」进入智能回复匹配池；列表以开关切换 */
export type QaStatus = 'enabled' | 'disabled';
export const QA_STATUS_META: Record<QaStatus, { label: string; dot: string }> = {
  enabled: { label: '启用中', dot: '#22c07b' },
  disabled: { label: '已停用', dot: '#b3bac6' },
};

/** 问答来源：手动录入 / 会话挖掘转化 / 行业模板启用 */
export type QaSource = 'manual' | 'mining' | 'template';
export const QA_SOURCE_META: Record<QaSource, string> = {
  manual: '手动录入',
  mining: '会话挖掘',
  template: '行业模板',
};

/** 标准问答对（智能回复优先匹配资产） */
export interface QaEntry {
  id: string;
  /** 标准问题（匹配主语料） */
  question: string;
  /** 相似问法（扩充召回面，客户原声归一） */
  similars: string[];
  /** 关键词（精确匹配辅助） */
  keywords: string[];
  /** 命中场景（细分场景，两级模型结构化过滤面；选填多选） */
  scenes: string[];
  /** 标准答案文字 */
  answer: string;
  /** 答案素材（图片/视频） */
  materials: KbMaterial[];
  /** 答案链接 */
  link?: string;
  /** 状态 */
  status: QaStatus;
  /** 来源 */
  source: QaSource;
  /** 近30日命中次数 */
  hits: number;
  /** 客服采纳率（命中后未改写占比） */
  adoptRate: string;
  updatedAt: string;
}

/** 会话挖掘候选：真实接待中未答好/低置信的客户原声（聚合），供主管转 QA */
export interface QaCandidate {
  id: string;
  /** 客户原声问题 */
  question: string;
  scene: string;
  shop: string;
  platform: string;
  /** 未命中/不准确原因 */
  reason: string;
  /** 近7日出现次数 */
  count: number;
  capturedAt: string;
}

/** 行业通用问题模板已并入问答库（source='template'），不再单设模块 */

let qaSeq = 0;
const qa = (
  question: string,
  answer: string,
  opt: Partial<Omit<QaEntry, 'id' | 'question' | 'answer'>> = {},
): QaEntry => ({
  id: `QA${String(++qaSeq).padStart(3, '0')}`,
  question,
  answer,
  similars: [],
  keywords: [],
  scenes: [],
  materials: [],
  status: 'enabled',
  source: 'manual',
  hits: 0,
  adoptRate: '-',
  updatedAt: '2026-09-06 10:00',
  ...opt,
});

const nowStamp = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 复制问答：新 id、默认停用（避免重复进入匹配池）、清空命中统计 */
export const cloneQaEntry = (src: QaEntry): QaEntry => ({
  ...src,
  id: `QA${String(++qaSeq).padStart(3, '0')}`,
  similars: [...src.similars],
  keywords: [...src.keywords],
  scenes: [...src.scenes],
  materials: [...src.materials],
  status: 'disabled',
  source: 'manual',
  hits: 0,
  adoptRate: '-',
  updatedAt: nowStamp(),
});

export const qaEntries = reactive<QaEntry[]>([
  qa('这款鞋偏码吗？平时穿37要拍多大？', '亲亲这款偏半码哦～平时穿37建议拍37.5或38，脚宽或脚背高建议拍大一码，可对照商品页尺码表按脚长选择更准确。', {
    similars: ['鞋子码数准吗', '偏大还是偏小', '37的脚拍几码', '要不要买大一码'],
    keywords: ['偏码', '尺码', '码数'],
    scenes: ['尺码咨询'],
    hits: 328,
    adoptRate: '92%',
    updatedAt: '2026-09-06 15:20',
  }),
  qa('什么时候发货？今天拍能今天发吗？', '现货商品16:00前下单当天发出，16:00后次日发出；预售商品以商品页标注的发货时间为准哦～', {
    similars: ['多久发货', '几天能发', '催发货', '今天能发吗'],
    keywords: ['发货', '几天'],
    scenes: ['催发货'],
    hits: 512,
    adoptRate: '88%',
    updatedAt: '2026-09-06 14:02',
  }),
  qa('可以开发票吗？', '支持开具电子普通发票，确认收货后在订单页申请，1-3个工作日开出并发送至预留邮箱。', {
    similars: ['能开票吗', '发票怎么开'],
    keywords: ['发票'],
    scenes: ['发票开具'],
    hits: 96,
    adoptRate: '90%',
    updatedAt: '2026-09-05 18:40',
  }),
  qa('收到货不满意可以退吗？运费谁出？', '支持7天无理由退换（不影响二次销售）；质量问题运费我们承担，非质量问题运费需自理哦～', {
    similars: ['退换货运费谁出', '七天无理由吗', '不想要了能退吗'],
    keywords: ['退货', '运费'],
    scenes: ['退换退款'],
    hits: 441,
    adoptRate: '85%',
    updatedAt: '2026-09-05 11:15',
  }),
  qa('鞋子怎么清洗保养？', '建议用软毛刷蘸中性清洁剂轻刷鞋面，避免浸泡与暴晒，阴干后塞纸团定型更耐穿哦～', {
    similars: ['怎么洗鞋', '如何保养'],
    keywords: ['清洗', '保养'],
    scenes: ['养护维修'],
    hits: 58,
    adoptRate: '80%',
    updatedAt: '2026-09-04 09:30',
  }),
  qa('和另一款有什么区别？哪个好？', '两款主要差异在鞋底材质与重量：轻便款更透气适合日常，老爹款增厚底更增高显腿长，可按穿着场景选择哦～', {
    similars: ['两款对比', '哪个更划算'],
    keywords: ['对比', '区别'],
    scenes: ['对比推荐'],
    status: 'disabled',
    hits: 0,
    adoptRate: '-',
    updatedAt: '2026-09-03 20:12',
  }),
  qa('有优惠吗？能便宜点吗？', '亲亲价格已经是很优惠的活动价啦～店铺首页可领满减券，叠加下单更划算哦～', {
    similars: ['砍价', '有优惠券吗', '能少点吗'],
    keywords: ['优惠', '便宜'],
    scenes: ['商品咨询'],
    source: 'template',
    hits: 210,
    adoptRate: '76%',
    updatedAt: '2026-09-03 16:45',
  }),
  qa('物流一直不动是怎么回事？', '已为您催促快递核实，一般24小时内更新；如超48小时仍未更新，我们可为您补发或退款哦～', {
    similars: ['快递不更新', '物流卡住了'],
    keywords: ['物流', '不动'],
    scenes: ['物流查询'],
    source: 'mining',
    hits: 133,
    adoptRate: '82%',
    updatedAt: '2026-09-02 13:08',
  }),
  qa('会员有什么权益？', '会员可享生日券、专属客服与优先发货权益，积分可抵现，详情见会员中心页哦～', {
    scenes: ['会员权益'],
    status: 'disabled',
    hits: 12,
    adoptRate: '60%',
    updatedAt: '2026-08-28 10:00',
  }),
  qa('商品是正品吗？', '亲亲我们是品牌官方授权店铺，正品保障，支持专柜验货，假一赔十哦～', {
    similars: ['是不是正品', '有授权吗', '保证真货吗'],
    keywords: ['正品'],
    scenes: ['商品咨询'],
    source: 'template',
    hits: 389,
    adoptRate: '94%',
    updatedAt: '2026-08-26 15:30',
  }),
  /* 原「行业模板」模块内容并入问答库（通用·启用中·来源=行业模板） */
  qa('快递可以指定吗？', '默认中通/圆通随机发，如需指定顺丰可补运费差价哦～', { keywords: ['物流'], scenes: ['物流查询'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('可以送到乡下/村镇吗？', '大部分地区可送达，偏远村镇以快递网点覆盖为准，下单前可咨询客服确认～', { keywords: ['物流'], scenes: ['物流查询'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('商品破损/少件怎么办？', '请提供开箱视频/照片，核实后为您补发或退差价，运费我们承担～', { keywords: ['售后'], scenes: ['质量问题'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('超过7天还能退吗？', '超7天无质量问题暂不支持无理由退换；如存在质量问题请提供凭证，我们为您特殊申请～', { keywords: ['售后'], scenes: ['退换退款'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('为什么比别家贵/便宜？', '我们是官方授权直营，价格含正品保障与售后服务的哦～', { keywords: ['价格'], scenes: ['商品咨询'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('衣服/鞋子尺码表在哪看？', '商品详情页中部有尺码对照表，按脚长/身高体重选择更准确哦～', { keywords: ['尺码'], scenes: ['尺码咨询'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('什么时候有活动/降价吗？', '关注店铺首页与会员日，大促节点会有满减与券哦～', { keywords: ['活动'], scenes: ['商品咨询'], source: 'template', updatedAt: '2026-09-07 10:00' }),
  qa('能开专票吗？', '支持开具增值税专用发票，需提供纳税人资质信息，确认收货后申请～', { keywords: ['发票'], scenes: ['发票开具'], source: 'template', updatedAt: '2026-09-07 10:00' }),
]);

export const qaCandidates = reactive<QaCandidate[]>([
  { id: 'CD001', question: '宝宝脚长16.5cm拍多大？', scene: '尺码咨询', shop: '优品店', platform: '拼多多', reason: 'AI 回复与尺码表不符，被客服改写', count: 27, capturedAt: '2026-09-06' },
  { id: 'CD002', question: '拼单成功后还能改地址吗？', scene: '改址拦截', shop: '文杰神店', platform: '拼多多', reason: '知识库无匹配，AI 无把握未自动回复', count: 19, capturedAt: '2026-09-06' },
  { id: 'CD003', question: '防晒精华孕妇能用吗？', scene: '商品咨询', shop: '美妆旗舰店', platform: '天猫', reason: 'AI 回复缺资质说明，主管判定不准确', count: 14, capturedAt: '2026-09-05' },
  { id: 'CD004', question: '退款后优惠券会退吗？', scene: '退换退款', shop: '优品店', platform: '淘宝', reason: '回复被客服改写', count: 11, capturedAt: '2026-09-05' },
  { id: 'CD005', question: '面霜开封后保质期多久？', scene: '使用指导', shop: '美妆旗舰店', platform: '抖音', reason: '知识库无匹配', count: 9, capturedAt: '2026-09-04' },
  { id: 'CD006', question: '老爹鞋能机洗吗？', scene: '养护维修', shop: '文杰神店', platform: '淘宝', reason: 'AI 无把握未自动回复', count: 7, capturedAt: '2026-09-04' },
]);
