/**
 * 场景配置模块数据层：非商品范畴咨询的兜底场景库
 * 定位：用户咨询优先由商品知识库（商品范畴）解答；脱离商品范畴（如「你们店铺在哪里」）
 *       知识库无法命中时，由此处的额外场景兜底：按提示语匹配场景 → 输出回复内容；
 *       仍未命中走系统默认兜底（转人工）。
 * 结构对齐配置范式：大场景（场景类型）⊃ 细分场景；细分场景上配置 命中条件（状态/其他因子）+
 * 提示语（多条）/关键词 + 回复内容；列表按大场景分组呈现层级
 * AI 命中链路：类型条件定义把关（阶段/订单状态细分）→ 类型场景定义语义命中 → 钻入类型下细分场景（自身条件+问法细配）
 */
import { reactive } from 'vue';

/** 命中后处置方式 */
export const FB_ACTS = ['智能回复', '转人工', '致歉引导'] as const;
export type FbAct = (typeof FB_ACTS)[number];

/** 当前演示登录人：新建场景类型/场景的创建人；todayStr=当日串（创建时间） */
export const CUR_USER = '黄亚芳';
export const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------- 命中条件枚举（配置弹窗左列「当满足以下条件时」：状态 + 其他因子） ---------- */
/** 场景阶段（售前/售中/售后）：场景归属阶段配置，与订单状态配合快速定位场景；多选空=不限 */
export const SC_SCENE_STAGES = ['售前', '售中', '售后'] as const;
/** 订单状态大类（状态条件第一层） */
export const SC_STAGES = ['售前', '发货前', '发货后', '售后'] as const;
/** 具体订单状态：大类下细分（级联第二层叶子） */
export const SC_STAGE_STATES: Record<string, string[]> = {
  售前: ['未下单', '未付款', '待付尾款', '订单取消'],
  发货前: ['待发货'],
  发货后: ['部分发货', '待签收'],
  售后: ['已签收', '货到付款已签收', '顾客申请退款', '商家同意退款', '等待顾客退货', '顾客已退货', '商家拒绝退款', '退款成功', '已评价', '顾客申请换货', '退款关闭', '换货中，等待顾客确认收货', '交易关闭', '售后理由修改'],
};
/** 场景阶段→订单状态叶子映射（用户 2026-09-19 合并单块：阶段与订单状态同一块配置，售中=发货前+发货后） */
export const SC_SCENE_STAGE_STATES: Record<string, string[]> = {
  售前: [...SC_STAGE_STATES['售前']],
  售中: [...SC_STAGE_STATES['发货前'], ...SC_STAGE_STATES['发货后']],
  售后: [...SC_STAGE_STATES['售后']],
};
/** 订单状态大类→归属场景阶段（摘要折叠与阶段派生用） */
const SC_STAGE_TO_SCENE: Record<string, string> = { 售前: '售前', 发货前: '售中', 发货后: '售中', 售后: '售后' };
export const SC_BINDS = ['指定商品', '指定分类', '不绑定'] as const;
export const SC_TITLES = ['不限', '包含', '不包含'] as const;
export const SC_VALIDITY = ['永久有效', '指定时效'] as const;
export const SC_PRESALE = ['所有状态', '定金尾款状态'] as const;
export const SC_SERVICE = ['全部客服', '指定客服组'] as const;
export const SC_AUTO = ['人机协同', '智能转接', '夜间值守'] as const;

/** 命中条件：订单状态（级联多选叶子集）+ 其他因子；多选条件空集=不限 */
export interface ScConditions {
  bind: (typeof SC_BINDS)[number];
  title: (typeof SC_TITLES)[number];
  /** 场景阶段多选（售前/售中/售后；空=不限） */
  sceneStages: string[];
  /** 订单状态多选（级联叶子集：整组全选回显折叠为大类；空=不限） */
  orderStates: string[];
  validity: (typeof SC_VALIDITY)[number];
  presale: (typeof SC_PRESALE)[number];
  service: (typeof SC_SERVICE)[number];
  /** 自动发送模式多选（空=不限） */
  autoSend: string[];
}
/** 默认条件：全部不限（多选条件空集=不限定任何因子） */
export const defaultConds = (): ScConditions => ({
  bind: '不绑定', title: '不限', sceneStages: [], orderStates: [],
  validity: '永久有效', presale: '所有状态', service: '全部客服', autoSend: [],
});

/** 细分场景：处理实体——命中条件 + 提示语（多条）/关键词 → 回复内容 + 命中后处置 */
export interface FbSub {
  id: string;
  /** 细分场景名称 */
  name: string;
  /** 提示语（多条）：客户问法归一，命中匹配依据 */
  questions: string[];
  /** 关键词：精确匹配辅助 */
  kws: string[];
  /** 命中条件：状态 + 其他因子 */
  conds: ScConditions;
  /** 命中后处置 */
  act: FbAct;
  /** AI 回复提示语：处置为智能回复时引导 AI 如何生成回复 */
  aiPrompt: string;
  /** 近30日兜底命中次数 */
  hits: number;
  /** 创建人：二级列表字段 */
  creator: string;
  /** 创建时间：二级列表字段 */
  createdAt: string;
  /** 引用次数：知识库条目选用该场景的次数 */
  refs: number;
  /** 状态：仅启用中场景参与兜底匹配 */
  enabled: boolean;
  /** 系统默认兜底场景：承接全部未识别咨询，不可删除/停用 */
  system?: boolean;
}

/** 场景类型定义：条件定义（类型级粗闸门）+ 场景定义（语义定义，告知 AI 何等语义命中本类型） */
export interface ScTypeDef {
  /** 场景阶段多选（售前/售中/售后；空=不限） */
  stages: string[];
  /** 订单状态多选（细分叶子集：整组全选回显折叠为大类；空=不限） */
  states: string[];
}
/** 默认条件定义：全部不限 */
export const defaultTypeDef = (): ScTypeDef => ({ stages: [], states: [] });
/** 条件定义摘要（列表列/定义带回显）：整组全选折叠为大类、部分选中列叶子；空=不限 */
export const typeCondText = (g: { condDef: ScTypeDef }): string => {
  const parts: string[] = [];
  if (g.condDef.stages.length) parts.push(`场景阶段 ${g.condDef.stages.join('/')}`);
  const stParts: string[] = [];
  for (const grp of SC_STAGES) {
    const leaves = SC_STAGE_STATES[grp] ?? [];
    const sel = leaves.filter((lv) => g.condDef.states.includes(lv));
    if (!sel.length) continue;
    /* 整段全选且归属阶段已列于场景阶段=冗余信息，折叠进阶段不再重复列 */
    if (sel.length === leaves.length && g.condDef.stages.includes(SC_STAGE_TO_SCENE[grp])) continue;
    stParts.push(sel.length === leaves.length ? grp : sel.join('/'));
  }
  if (stParts.length) parts.push(`订单状态 ${stParts.join('/')}`);
  return parts.length ? parts.join(' · ') : '不限';
};

/** 大场景（场景类型）：条件定义把关 + 场景定义语义命中后，钻入下挂细分场景；一级列表按类型呈现（场景数量/创建人），详情钻入二级场景列表 */
export interface FbScene {
  id: string;
  /** 场景类型名称（宽泛定义） */
  name: string;
  /** 条件定义：类型级粗闸门（场景阶段+订单状态大类；空=不限），AI 命中第一道把关 */
  condDef: ScTypeDef;
  /** 场景定义：语义定义，告知 AI 符合何等语义时命中本类型；命中后钻入类型下细分场景 */
  semDef: string;
  /** 用户问法：类型级代表问法（与细分场景问法口径一致），类型配置抽屉展示与编辑 */
  questions: string[];
  /** 创建人：一级列表字段 */
  creator: string;
  /** 创建时间：一级列表字段 */
  createdAt: string;
  /** 该场景类型下的具体场景 */
  subs: FbSub[];
}

const sub = (
  id: string, name: string, questions: string[], kws: string[],
  act: FbAct, hits: number, opt: Partial<FbSub> = {},
): FbSub => ({ id, name, questions, kws, conds: defaultConds(), act, hits, enabled: true, creator: '黄亚芳', createdAt: '2026-07-12', refs: 0, aiPrompt: '用亲切自然的语气回答客户，控制在 100 字内', ...opt });

export const fbScenes = reactive<FbScene[]>([
  {
    id: 'FS01', name: '店铺信息咨询', condDef: defaultTypeDef(), semDef: '客户询问店铺地址、实体店、营业时间、品牌资质等店铺基础信息', questions: ['你们店铺在哪里', '你们几点上班', '你们是官方店吗'], creator: '黄亚芳', createdAt: '2026-07-12', subs: [
      sub('FB01', '店铺地址咨询', ['你们店铺在哪里', '有实体店吗', '门店地址在哪'], ['实体店', '门店', '地址'], '智能回复', 86, { refs: 6, aiPrompt: '先明确线上店铺属性，再说明仓库直发与正品保障，打消客户顾虑' }),
      sub('FB02', '营业时间咨询', ['你们几点上班', '客服在线时间是几点', '晚上有人接待吗'], ['营业时间', '在线时间'], '智能回复', 64, { refs: 3 }),
      sub('FB03', '品牌资质咨询', ['你们是官方店吗', '公司叫什么名字', '是品牌授权的吗'], ['官方', '授权', '资质'], '智能回复', 41, { refs: 2 }),
    ],
  },
  {
    id: 'FS02', name: '服务政策咨询', condDef: { stages: ['售前', '售后'], states: [...SC_STAGE_STATES['售前'], ...SC_STAGE_STATES['售后']] }, semDef: '客户询问发票开具、优惠活动、会员权益等店铺服务政策', questions: ['能开发票吗', '有没有优惠券', '会员有什么优惠'], creator: '李四', createdAt: '2026-07-18', subs: [
      sub('FB04', '发票咨询', ['能开发票吗', '怎么开发票', '支持专票吗'], ['发票', '专票'], '智能回复', 58, { creator: '李四', createdAt: '2026-07-18', refs: 5, aiPrompt: '按电子发票口径答复，专票场景补充纳税人资质信息要求', conds: { ...defaultConds(), sceneStages: ['售后'], orderStates: ['已签收'] } }),
      sub('FB05', '优惠活动咨询', ['有没有优惠券', '什么时候有活动', '新人有优惠吗'], ['优惠', '券', '活动'], '智能回复', 73, { creator: '李四', createdAt: '2026-07-19', refs: 4, conds: { ...defaultConds(), sceneStages: ['售前'], orderStates: [...SC_STAGE_STATES['售前']], presale: '定金尾款状态' } }),
      sub('FB06', '会员权益咨询', ['会员有什么优惠', '怎么加入会员'], ['会员', '权益'], '智能回复', 22, { creator: '李四', createdAt: '2026-07-20', refs: 1 }),
    ],
  },
  {
    id: 'FS03', name: '物流信息咨询', condDef: { stages: ['售前', '售中'], states: [...SC_STAGE_STATES['售前'], ...SC_STAGE_STATES['发货前'], ...SC_STAGE_STATES['发货后']] }, semDef: '客户询问物流进度、快递承运、能否指定快递、发货范围等物流履约信息', questions: ['我的包裹到哪里了', '可以指定快递吗', '能发新疆吗'], creator: '黄亚芳', createdAt: '2026-07-25', subs: [
      sub('FB13', '物流到哪里了', ['我的包裹到哪里了', '物流怎么还不更新', '帮我查下物流进度'], ['物流', '快递', '到哪'], '智能回复', 66, { createdAt: '2026-07-25', refs: 8, aiPrompt: '先安抚等件情绪，告知订单页查询路径，承诺长时间未更新可代催快递', conds: { ...defaultConds(), sceneStages: ['售中'], orderStates: ['待签收', '部分发货'] } }),
      sub('FB14', '能否指定物流', ['可以指定快递吗', '能发顺丰吗', '你们用什么快递'], ['指定', '快递', '顺丰'], '智能回复', 29, { createdAt: '2026-07-26', refs: 2, conds: { ...defaultConds(), sceneStages: ['售前', '售中'], orderStates: ['未下单', '待发货'] } }),
      sub('FB07', '发货范围咨询', ['能发新疆吗', '哪些地区不发货', '可以发到港澳台吗'], ['发货范围', '偏远', '地区'], '智能回复', 35, { createdAt: '2026-07-28', refs: 3, conds: { ...defaultConds(), sceneStages: ['售前'], orderStates: ['未下单'] } }),
    ],
  },
  {
    id: 'FS04', name: '转人工', condDef: defaultTypeDef(), semDef: '客户明确要求转人工客服，或表达投诉、建议等升级诉求', questions: ['转人工', '我要投诉'], creator: '系统', createdAt: '2026-06-30', subs: [
      sub('FB08', '转人工', ['转人工', '找人工客服', '我要投诉转人工'], ['人工', '客服'], '转人工', 112, { creator: '系统', createdAt: '2026-06-30', refs: 9 }),
      sub('FB09', '投诉建议', ['我要投诉', '怎么投诉', '给你们提个建议'], ['投诉', '建议'], '转人工', 18, { creator: '系统', createdAt: '2026-06-30', refs: 1 }),
    ],
  },
  {
    id: 'FS05', name: '通用兜底', condDef: defaultTypeDef(), semDef: '问候寒暄、无关话题及全部未识别咨询的兜底承接', questions: ['你好', '在吗'], creator: '张三', createdAt: '2026-08-02', subs: [
      sub('FB10', '问候寒暄', ['你好', '在吗', '有人吗'], [], '智能回复', 95, { creator: '张三', createdAt: '2026-08-02', refs: 4 }),
      sub('FB11', '无关话题', ['你们老板是谁', '今天天气真好'], [], '致歉引导', 27, { creator: '张三', createdAt: '2026-08-03' }),
      sub('FB12', '未识别兜底', ['（承接全部未识别咨询）'], [], '转人工', 143, { creator: '系统', createdAt: '2026-06-30', refs: 12, system: true }),
    ],
  },
]);
