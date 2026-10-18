/* ---------- 待办任务数据层（品控·线上·待办任务）：任务待办 · 待处理列表种子。
   口径对齐参考图：待办卡＝状态芯片(驳回/转交)＋标题＋优先级标记(特急🔥/紧急/高优/低优)＋时间＋正文＋附件＋发起人/收件人＋动作钮。
   桶归属：待处理/已处理＝别人发给我（未完结/已完结，含已驳回·已转交·已处理）；我发起＝我创建的（需要别人处理）。
   种子为响应式数组：生命周期动作（撤销/重新提交/转交/驳回）就地改写后列表与角标须即时重算。 */
import { reactive } from 'vue';
import { mkProductName, qcShopGoods, type ShopGood, type ShopPlat } from './qcOnlineData';

export type TodoStatus = '驳回' | '转交' | '处理中' | '已完成' | '已撤销';
export type TodoBucket = '待处理' | '已处理' | '我发起';
/** 流程状态（我发起的桶状态筛选口径）：缺省视为待处理 */
export type TodoFlow = '待处理' | '已处理' | '已逾期' | '已拒绝' | '已撤销';
/** 多人任务处理人卡（我发起/多人任务钻取列表，参考图三） */
export interface TodoHandler {
  name: string;
  /** 姓名后链路：分公司–组–部门 */
  chain: string;
  faqi: string;
  flow: '待处理' | '已处理' | '驳回' | '已撤销';
  /** 次行时间标签＋值（驳回/处理/撤销时间） */
  subLabel?: string;
  sub?: string;
  /** 右侧动作芯片 */
  act?: '转' | '驳' | '撤';
  /** 转交转入：原处理人（姓名–链路）＋转交时间（详情「原处理人/转交时间」两行） */
  transferFrom?: string;
  transferTime?: string;
  /** 转交原因（转入人可见＋处理流程节点说明） */
  transferReason?: string;
  /** 驳回原因（详情「驳回原因」页签） */
  rejectReason?: string;
}
/** 优先级（待处理/已处理桶筛选口径，同发起待办抽屉五档）：缺省普通 */
export type TodoPriority = '特急' | '紧急' | '高优' | '低优' | '普通';
export const TODO_PRIORITIES: TodoPriority[] = ['特急', '紧急', '高优', '低优', '普通'];

/** 发起待办时上传的附件（卡面 chips 与抽屉上传区同源）：图缩略／视／文 */
export interface TodoFile {
  id: string;
  name: string;
  size: number;
  kind: 'image' | 'video' | 'file';
  url: string;
}
/** 附件大小展示：≥1MB 一位小数 MB，其余取整 KB */
export const todoSizeTxt = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);

/** 文档芯片类型口径（常见文件类型）：扩展名→类型名＋图标色；图标统一描边文档形，色随类型 */
export const TODO_FILE_META: Record<string, { lab: string; color: string }> = {
  doc: { lab: 'Word', color: '#4d8df6' },
  docx: { lab: 'Word', color: '#4d8df6' },
  xls: { lab: 'Excel', color: '#00b42a' },
  xlsx: { lab: 'Excel', color: '#00b42a' },
  csv: { lab: 'Excel', color: '#00b42a' },
  pdf: { lab: 'PDF', color: '#f5484d' },
  ppt: { lab: 'PPT', color: '#ff7d00' },
  pptx: { lab: 'PPT', color: '#ff7d00' },
  txt: { lab: '文本', color: '#86909c' },
  md: { lab: '文本', color: '#86909c' },
  zip: { lab: '压缩包', color: '#86909c' },
  rar: { lab: '压缩包', color: '#86909c' },
  '7z': { lab: '压缩包', color: '#86909c' },
};
export const todoFileMetaOf = (name: string): { lab: string; color: string } =>
  TODO_FILE_META[name.split('.').pop()?.toLowerCase() ?? ''] ?? { lab: '文档', color: '#4d8df6' };

/** 优化方案（发起待办·优化类型下级）：商品优化＝商品下架/放宽售后/商品整改；编码优化＝编码禁用/放宽售后/编码整改；店铺优化＝放宽售后 */
export const OPT_PLANS: Record<string, string[]> = {
  商品优化: ['商品下架', '放宽售后', '商品整改'],
  编码优化: ['编码禁用', '放宽售后', '编码整改'],
  店铺优化: ['放宽售后'],
};
/** 放宽售后结束方式：达到指标后结束（目标商品/店铺体验分＋分值，开放式无结束日）／周期整改（自定义天数或自定义日期区间） */
export interface TodoOptEnd {
  mode: '达到指标后结束' | '周期整改';
  metric?: '商品体验分' | '店铺体验分';
  score?: number;
  days?: number;
  start?: string;
  end?: string;
  /** 达到指标后结束：无固定结束日（趋势色带画到窗口末、状态恒优化中直至达标） */
  openEnd?: boolean;
}

/** 店铺优化关联店铺（卡面范围行展示店铺芯片，替代商品卡） */
export interface TodoShop {
  id: string;
  name: string;
  platform: ShopPlat;
}
export interface QcTodo {
  id: string;
  /** 标题前状态芯片；缺省不展示 */
  status?: TodoStatus;
  title: string;
  /** 优先级标记：特急带🔥，紧急/高优/低优同档色文字；缺省普通不展示 */
  priority?: TodoPriority;
  time: string;
  body: string;
  /** 发起待办时上传的附件（图/视/文 chips）；缺省无附件 */
  files?: TodoFile[];
  /** 商品优化关联商品（卡面商品展示：商品图/平台/店铺名/商品名称，与附件同位） */
  goods?: ShopGood[];
  /** 店铺优化关联店铺（卡面范围行展示店铺芯片；店铺优化不展示商品卡） */
  shops?: TodoShop[];
  /** 发件人：组＋姓名（非我发起态展示） */
  from?: { group: string; name: string };
  /** 我发起态的收件人姓名 */
  to?: string;
  /** 业务标签（AI分析 等） */
  tag?: string;
  /** 动作钮（末位为主色） */
  acts: string[];
  /** 待办类型（类型页签过滤口径） */
  type: string;
  /** 优化方案（优化类型下级；放宽售后走接待段自动请求口径） */
  optPlan?: string;
  /** 放宽售后结束方式配置（查看态展示） */
  optEnd?: TodoOptEnd;
  /** 优化任务周期（查看态展示＋商品挂标签/趋势色带同源） */
  optCycle?: { start: string; end: string; openEnd?: boolean };
  /** 多人处理进度：已处理人数 / 需处理人数（卡右侧时间下方进度条） */
  progress?: { done: number; total: number };
  /** 流程状态（状态筛选口径）；缺省待处理 */
  flow?: TodoFlow;
  /** 消息id（详情顶行灰字） */
  msgId?: string;
  /** 多收件人（我发起/多人任务）；与 to 二选一 */
  toList?: string[];
  /** 详情「事项」附件网格（文档芯片组） */
  atts?: { name: string; sub: string }[];
  /** 别人已处理：处理时间＋处理结果回复＋结果附件 */
  doneTime?: string;
  result?: string;
  resultAtt?: { name: string; sub: string }[];
  /** 多人任务处理人卡列表（存在即多人任务钻取态） */
  handlers?: TodoHandler[];
  /** 接收人转交：转交给谁＋转交时间（详情「原处理人/转交时间」两行） */
  transferTo?: string;
  transferTime?: string;
  /** 别人转交给我：转交人（姓名–链路）＋转交原因（待处理查看态「转交人/转交时间/转交原因」） */
  transferFrom?: string;
  transferReason?: string;
  /** 接收人驳回：原因＋驳回时间（详情「驳回原因」页签） */
  rejectReason?: string;
  rejectTime?: string;
  /** 驳回/转交时上传的附件（抽屉内联表单提交回写，原因页签展示） */
  rejectAtt?: { name: string; sub: string }[];
  transferAtt?: { name: string; sub: string }[];
  /** 发起人撤销时间（撤销态卡与处理流程节点） */
  revokeTime?: string;
  /** 发起时填写的最迟处理时间（重新提交回填用） */
  deadline?: string;
  done?: boolean;
  mine?: boolean;
}

/** 查看态优化信息行：优化类型（提交三值回落下拉档）/优化方案/结束方式或优化任务周期；空值不露行 */
export const todoOptRows = (t: QcTodo): { lab: string; val: string }[] => {
  const rows: { lab: string; val: string }[] = [];
  const kind = t.type === '系列编码优化' || t.type === '商品编码优化' ? '编码优化' : t.type === '商品优化' || t.type === '店铺优化' ? t.type : '';
  if (kind) rows.push({ lab: '优化类型', val: kind });
  if (t.optPlan) rows.push({ lab: '优化方案', val: t.optPlan });
  const e = t.optEnd;
  if (e?.mode === '达到指标后结束') rows.push({ lab: '结束方式', val: `达到指标后结束：${e.metric ?? ''} ≥ ${e.score ?? ''} 分` });
  else if (e?.mode === '周期整改') rows.push({ lab: '结束方式', val: `周期整改：${e.days ? `${e.days} 天（` : ''}${e.start ?? ''} ~ ${e.end ?? ''}${e.days ? '）' : ''}` });
  else if (t.optCycle) rows.push({ lab: '优化任务周期', val: `${t.optCycle.start} ~ ${t.optCycle.openEnd ? '至今' : t.optCycle.end}` });
  return rows;
};

/** 类型页签词表（参考图筛选行）；「待办类型 ≡ ···」为类型展示不完时的折叠态，非页签 */
export const TODO_TYPES = ['全部', '商品优化', '店铺优化', '系列编码优化', '商品编码优化'];

const BODY =
  '该商品近期差评与售后集中于主图与详情页描述不符， 请在优化任务周期内完成主图实拍替换、详情页卖点校正与规格说明补充， 完成后在商品趋势中回填优化成效， 明天下班前给我出一个处理结果， 找到原因， 立即发给我知道， 快点处理';

/* 发起待办时上传的附件种子：覆盖 图/文/视 混合、单文档、双图、单视频、文档+图、无附件 六种情形 */
const FILES_MIX = [
  { id: 'TF-101', name: '主图问题截图.png', size: 254 * 1024, kind: 'image', url: '/products/main.png' },
  { id: 'TF-102', name: '差评明细导出.xlsx', size: 86 * 1024, kind: 'file', url: '' },
  { id: 'TF-103', name: '优化核查录屏.mp4', size: 12.6 * 1048576, kind: 'video', url: '' },
] as TodoFile[];
const FILES_DOC = [{ id: 'TF-201', name: '优化明细表.xlsx', size: 46 * 1024, kind: 'file', url: '' }] as TodoFile[];
const FILES_IMGS = [
  { id: 'TF-301', name: '问题截图-实物色差.png', size: 182 * 1024, kind: 'image', url: '/products/serum.png' },
  { id: 'TF-302', name: '问题截图-包装破损.png', size: 205 * 1024, kind: 'image', url: '/products/hairpin.png' },
] as TodoFile[];
const FILES_VIDEO = [{ id: 'TF-401', name: '处理过程录屏.mp4', size: 8.4 * 1048576, kind: 'video', url: '' }] as TodoFile[];
const FILES_DOC_IMG = [
  { id: 'TF-601', name: '下派说明.docx', size: 32 * 1024, kind: 'file', url: '' },
  { id: 'TF-602', name: '流程示意.png', size: 156 * 1024, kind: 'image', url: '/products/main.png' },
] as TodoFile[];

/** 详情附件网格种子（参考图：文档名称.doc ×3） */
const DOCS3 = [
  { name: '文档名称.doc', sub: 'Excel 20KB' },
  { name: '文档名称.doc', sub: 'Excel 20KB' },
  { name: '文档名称.doc', sub: 'Excel 20KB' },
];

/* 已完成态处理结果种子（详情「处理结果」块＋结果附件，避免已完成详情内容空白） */
const RES_107 = '已联系供应商更换滑轨批次并复检留样，抽屉异响消除，商品趋势回填优化成效：异响类差评七日未新增';
const RES_108 = '包装加固方案已落地并更换承运商，近一周物流破损售后归零，商品趋势回填优化成效：破损类差评清零';
const RES_109 = '主图已替换为实拍图并补充详情页色差说明，色差类差评未再新增，商品趋势回填优化成效：色差咨询下降八成';
const RES_110 = '整系列主图与详情页已整改完成并复核通过，系列差评率回落至优化前水平，商品趋势回填优化成效';
const RES_111 = '指定编码包装加固与承重说明已整改完成并复检合格，其余编码未受影响，商品趋势回填优化成效：破损类售后归零';
const RES_119 = '店铺旗下折叠收纳箱、阳台休闲椅已统一放宽售后处置口径（极速退款、放宽举证），售后纠纷与差评明显回落，店铺体验分回升至目标分值，放宽售后监控已结束';

/* 商品优化关联商品种子：取目录中与标题同名的店铺商品（店铺ID＋名称前缀定位，与优化任务 optTask 挂接同件）；
   「车载手机支架」目录无此商品，单列补充商品仅供卡面展示 */
const goodOf = (shopId: string, base: string) => qcShopGoods.value.find((g) => g.shopId === shopId && g.name.startsWith(base));
const GOOD_CAR_MOUNT: ShopGood = {
  id: '680000000999', shopId: 'DY-3012', name: mkProductName('车载手机支架', 4), listedAt: '2026-01-22',
  skuCount: 9, specs: ['颜色', '尺寸'], orders: 680, sessions: 132, riskSessions: 3,
  reviews: 540, badReviews: 26, afterSales: 15, afterRatio: 0.022,
};

export const QC_TODOS: QcTodo[] = reactive([
  {
    id: 'TD-001',
    title: '保温杯主图与详情页专项优化',
    priority: '特急',
    time: '2026-01-15 12:00:00',
    body: BODY,
    files: FILES_MIX,
    goods: [goodOf('DY-3012', '保温杯')!],
    from: { group: '运营A组', name: '熊立群' },
    acts: ['驳回', '转交', '处理'],
    type: '商品优化',
    progress: { done: 5, total: 10 },
    msgId: '219098763901',
  },
  {
    /* 已处理·我已驳回：驳回原因必填，卡离开待处理进已处理（查看态只读） */
    id: 'TD-002',
    status: '驳回',
    title: '陶瓷餐具整系列编码整改',
    priority: '紧急',
    time: '2026-01-15 12:00:00',
    body: BODY,
    files: FILES_DOC,
    from: { group: '运营A组', name: '熊立群' },
    acts: [],
    type: '系列编码优化',
    msgId: '219098763902',
    done: true,
    flow: '已处理',
    rejectReason: '这个系列的编码归属类目运营维护，不在我的处理范围内，请转给对应的运营同学跟进。',
    rejectTime: '2026-01-15 14:20:00',
  },
  {
    /* 待处理·别人转交给我（已逾期）：转交芯片＋转交人/转交时间/转交原因＋底栏 转交/驳回/提交 */
    id: 'TD-003',
    status: '转交',
    title: '折叠收纳箱指定编码包装加固',
    priority: '高优',
    time: '2026-01-15 12:00:00',
    body: BODY,
    files: FILES_IMGS,
    from: { group: '运营A组', name: '熊立群' },
    transferFrom: '李恩俊–杭州分公司–项目组–开发部',
    transferTo: '七妮妮',
    transferTime: '2026-01-15 16:40:00',
    transferReason: '包装加固要同步改承重说明，我这边只维护商品编码，转给你跟进详情页与包装方案。',
    acts: ['驳回', '转交', '处理'],
    type: '商品编码优化',
    flow: '已逾期',
    deadline: '2026-01-16 18:00',
    msgId: '219098763903',
  },
  {
    id: 'TD-004',
    status: '处理中',
    title: '车载手机支架差评专项优化',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    files: FILES_VIDEO,
    goods: [GOOD_CAR_MOUNT],
    to: '朱超',
    acts: ['撤销'],
    type: '商品优化',
    mine: true,
    flow: '待处理',
    msgId: '219098763920',
    atts: DOCS3,
    deadline: '2026-02-18 18:00',
  },
  {
    id: 'TD-005',
    status: '已完成',
    title: '厨房收纳系列编码详情页整改',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    to: '朱超',
    acts: [],
    type: '系列编码优化',
    mine: true,
    flow: '已处理',
    done: true,
    msgId: '219098763920',
    atts: DOCS3,
    doneTime: '2026-02-18 12:30:00',
    result: '好的，我知道了，已经解决了这个问题',
    resultAtt: [
      { name: '文档名称.doc', sub: 'Excel 20KB' },
      { name: '文档名称.doc', sub: 'Excel 20KB' },
      { name: '文档名称.doc', sub: 'Excel 20KB' },
    ],
    files: FILES_DOC_IMG,
  },
  {
    id: 'TD-006',
    status: '处理中',
    title: '毛绒玩具指定编码承重整改',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    files: FILES_DOC_IMG,
    toList: ['朱超', '杨宗华', '郭三连', '李恩俊', '刘亚军', '鲁梦男', '文杰', '郭三语', '郑婷', '刘洋'],
    acts: ['撤销'],
    type: '商品编码优化',
    mine: true,
    flow: '待处理',
    progress: { done: 2, total: 5 },
    msgId: '219098763920',
    atts: DOCS3,
    handlers: [
      { name: '朱超', chain: '杭州分公司–项目组–产品部', faqi: '2026-02-16 12:00:00', flow: '待处理' },
      { name: '鲁梦男', chain: '杭州分公司–项目组–测试部', faqi: '2026-02-16 12:00:00', flow: '待处理', act: '转', transferFrom: '文杰–杭州分公司–项目组–测试部', transferTime: '2026-02-17 12:30:00', transferReason: '承重整改要做实物测试，我手上排期满了，转给梦男跟进测试与复检留样。' },
      { name: '文杰', chain: '杭州分公司–项目组–测试部', faqi: '2026-02-16 12:00:00', flow: '驳回', subLabel: '驳回时间', sub: '2026-02-16 13:00:00', act: '驳', rejectReason: '这个东西不归我测试，你应该找梦男处理的' },
      { name: '李恩俊', chain: '杭州分公司–项目组–开发部', faqi: '2026-02-16 12:00:00', flow: '已处理', subLabel: '处理时间', sub: '2026-02-16 13:00:00', act: '转' },
      { name: '刘亚军', chain: '杭州分公司–项目组–开发部', faqi: '2026-02-16 12:00:00', flow: '已处理', subLabel: '处理时间', sub: '2026-02-16 13:00:00' },
      { name: '郭三连', chain: '杭州分公司–项目组–开发部', faqi: '2026-02-16 12:00:00', flow: '已撤销', subLabel: '撤销时间', sub: '2026-02-16 13:00:00', act: '撤' },
    ],
  },
  {
    id: 'TD-007',
    status: '已完成',
    title: '实木收纳柜抽屉滑轨异响优化',
    priority: '高优',
    time: '2026-10-10 09:30:00',
    body: '该商品近期差评集中于抽屉滑轨异响，请在优化任务周期内完成供应商整改与复检，并在商品趋势中回填优化成效。',
    goods: [goodOf('TB-2041', '实木收纳柜')!],
    result: RES_107,
    resultAtt: DOCS3,
    atts: DOCS3,
    files: FILES_DOC_IMG,
    to: '朱超',
    acts: [],
    type: '商品优化',
    mine: true,
    flow: '已处理',
    done: true,
    doneTime: '2026-10-12 15:20:00',
    msgId: '219098764105',
  },
  {
    id: 'TD-008',
    status: '已完成',
    title: '岩板餐桌物流破损专项优化',
    priority: '紧急',
    time: '2026-10-05 10:20:00',
    body: '该商品售后原因集中于物流破损，优化任务周期内完成包装加固与承运商更换，完成后进入优化观察期。',
    goods: [goodOf('TB-2041', '岩板餐桌')!],
    result: RES_108,
    resultAtt: DOCS3,
    atts: DOCS3,
    files: FILES_DOC_IMG,
    toList: ['李恩俊'],
    acts: [],
    type: '商品优化',
    mine: true,
    flow: '已处理',
    done: true,
    doneTime: '2026-10-06 09:40:00',
    msgId: '219098764106',
    handlers: [
      { name: '李恩俊', chain: '杭州分公司–项目组–开发部', faqi: '2026-10-05 10:20:00', flow: '已处理', subLabel: '处理时间', sub: '2026-10-06 09:40:00' },
    ],
  },
  {
    id: 'TD-009',
    status: '已完成',
    title: '云感布艺沙发色差差评优化',
    priority: '高优',
    time: '2026-10-13 14:10:00',
    body: '该商品差评集中于实物色差，优化任务周期内完成主图实拍替换与详情页色差说明补充。',
    goods: [goodOf('TB-2057', '云感布艺沙发')!],
    result: RES_109,
    resultAtt: DOCS3,
    atts: DOCS3,
    files: FILES_DOC_IMG,
    toList: ['鲁梦男'],
    acts: [],
    type: '商品优化',
    mine: true,
    flow: '已处理',
    done: true,
    doneTime: '2026-10-14 10:05:00',
    msgId: '219098764107',
    handlers: [
      { name: '鲁梦男', chain: '杭州分公司–项目组–测试部', faqi: '2026-10-13 14:10:00', flow: '已处理', subLabel: '处理时间', sub: '2026-10-14 10:05:00' },
    ],
  },
  {
    id: 'TD-010',
    status: '已完成',
    title: '陶瓷餐具套装整系列编码优化',
    priority: '高优',
    time: '2026-10-12 09:00:00',
    body: '该系列下全部商品编码近期差评与售后集中，已在编码监控-监控列表按「系列编码优化」发起，默认覆盖系列下全部商品编码，优化任务周期内完成整系列主图与详情页整改。',
    result: RES_110,
    resultAtt: DOCS3,
    atts: DOCS3,
    files: FILES_DOC_IMG,
    toList: ['朱超'],
    acts: [],
    type: '系列编码优化',
    mine: true,
    flow: '已处理',
    done: true,
    doneTime: '2026-10-14 16:00:00',
    msgId: '219098764108',
    handlers: [
      { name: '朱超', chain: '杭州分公司–项目组–产品部', faqi: '2026-10-12 09:00:00', flow: '已处理', subLabel: '处理时间', sub: '2026-10-14 16:00:00' },
    ],
  },
  {
    id: 'TD-011',
    status: '已完成',
    title: '折叠收纳箱指定商品编码优化',
    priority: '紧急',
    time: '2026-10-08 10:30:00',
    body: '仅针对该系列下命中承重与包装问题的指定商品编码，按「商品编码优化」发起，优化任务周期内完成包装加固与承重说明整改，系列内其余编码不受影响。',
    result: RES_111,
    resultAtt: DOCS3,
    atts: DOCS3,
    files: FILES_DOC_IMG,
    toList: ['李恩俊'],
    acts: [],
    type: '商品编码优化',
    mine: true,
    flow: '已处理',
    done: true,
    doneTime: '2026-10-10 11:20:00',
    msgId: '219098764109',
    handlers: [
      { name: '李恩俊', chain: '杭州分公司–项目组–开发部', faqi: '2026-10-08 10:30:00', flow: '已处理', subLabel: '处理时间', sub: '2026-10-10 11:20:00' },
    ],
  },
  {
    /* 别人转交给我（待处理查看态：转交芯片＋转交人/转交时间/转交原因＋底栏 转交/驳回/提交） */
    id: 'TD-012',
    status: '转交',
    title: '客服聊天稽查分析结果',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    files: [
      { id: 'TF-701', name: '文档名称.doc', size: 20 * 1024, kind: 'file', url: '' },
      { id: 'TF-702', name: '文档名称.doc', size: 20 * 1024, kind: 'file', url: '' },
      { id: 'TF-703', name: '文档名称.doc', size: 20 * 1024, kind: 'file', url: '' },
      { id: 'TF-704', name: '问题截图.png', size: 156 * 1024, kind: 'image', url: '/products/main.png' },
    ],
    from: { group: '测试部', name: '鲁梦男' },
    transferFrom: '文杰–杭州分公司–项目组–测试部',
    transferTo: '七妮妮',
    transferTime: '2026-02-17 12:30:00',
    transferReason: '这部分稽查结果归属客服会话口径，我这边只负责测试环境数据，转给七妮妮跟进处理。',
    acts: ['驳回', '转交', '处理'],
    type: '商品优化',
    msgId: '219098763920',
  },
  {
    /* 待处理·别人发我（无附件、普通优先级、未逾期）：最小信息量卡面 */
    id: 'TD-013',
    title: '宠物饮水机滤芯咨询话术核对',
    time: '2026-10-15 09:10:00',
    body: '近期客服咨询集中在滤芯更换周期与适配型号，请核对现有话术与知识库口径是否一致，明天下班前给我处理结果。',
    from: { group: '运营B组', name: '邵雨薇' },
    acts: ['驳回', '转交', '处理'],
    type: '商品优化',
    deadline: '2026-10-20 18:00',
    msgId: '219098763921',
  },
  {
    /* 已处理·我已处理（处理结果＋结果附件，查看态只读） */
    id: 'TD-014',
    status: '已完成',
    title: '实木收纳柜承重说明补充',
    priority: '高优',
    time: '2026-10-11 10:00:00',
    body: '承重说明缺失导致售后集中，请在优化任务周期内补充详情页承重参数与使用限制说明，完成后回填优化成效。',
    goods: [goodOf('TB-2041', '实木收纳柜')!],
    files: FILES_DOC_IMG,
    from: { group: '运营A组', name: '熊立群' },
    acts: [],
    type: '商品优化',
    flow: '已处理',
    done: true,
    doneTime: '2026-10-12 17:05:00',
    result: '详情页已补充承重参数与使用限制说明，售后咨询量回落，优化成效已回填商品趋势。',
    resultAtt: DOCS3,
    msgId: '219098763922',
  },
  {
    /* 已处理·我已转交出去（转交给谁＋转交原因，查看态只读） */
    id: 'TD-015',
    status: '转交',
    title: '云感布艺沙发色差判定复核',
    priority: '紧急',
    time: '2026-10-13 15:30:00',
    body: '色差类差评需要对照实物样卡判定，请在优化任务周期内完成复核并给出结论。',
    goods: [goodOf('TB-2057', '云感布艺沙发')!],
    files: FILES_IMGS,
    from: { group: '运营B组', name: '邵雨薇' },
    transferTo: '文杰',
    transferTime: '2026-10-13 16:10:00',
    transferReason: '色差判定要对照实物样卡，我这边没有样卡，转给测试部文杰复核后再出结论。',
    acts: [],
    type: '商品优化',
    flow: '已处理',
    done: true,
    msgId: '219098763923',
  },
  {
    /* 我发起·被别人驳回（底栏 修改/再次提交/关闭；再次发起＝创建新任务，原任务留档已处理桶） */
    id: 'TD-016',
    status: '驳回',
    title: '岩板餐桌包装加固二次优化',
    priority: '高优',
    time: '2026-02-16 09:20:00',
    body: '破损类售后仍有零星反馈，请在优化任务周期内二次加固包装并复核承运商装卸环节。',
    goods: [goodOf('TB-2041', '岩板餐桌')!],
    files: FILES_DOC,
    to: '朱超',
    acts: ['修改', '再次提交'],
    type: '商品优化',
    mine: true,
    flow: '已拒绝',
    done: true,
    rejectReason: '破损原因已定位为承运商装卸，包装加固方案上一版已经落地，这条内容重复了，请核对后再发起。',
    rejectTime: '2026-02-16 11:05:00',
    deadline: '2026-02-18 18:00',
    msgId: '219098763924',
    handlers: [
      { name: '朱超', chain: '杭州分公司–项目组–产品部', faqi: '2026-02-16 09:20:00', flow: '驳回', subLabel: '驳回时间', sub: '2026-02-16 11:05:00', act: '驳', rejectReason: '破损原因已定位为承运商装卸，包装加固方案上一版已经落地，这条内容重复了，请核对后再发起。' },
    ],
  },
  {
    /* 我发起·我已撤销（撤销后只能修改或再次提交，均创建新任务） */
    id: 'TD-017',
    status: '已撤销',
    title: '保温杯杯盖密封性专项优化',
    priority: '紧急',
    time: '2026-02-15 14:00:00',
    body: '杯盖密封性差评集中，请在优化任务周期内完成密封圈整改与复检。',
    goods: [goodOf('DY-3012', '保温杯')!],
    files: FILES_MIX,
    to: '李恩俊',
    acts: ['修改', '再次提交'],
    type: '商品优化',
    mine: true,
    flow: '已撤销',
    done: true,
    revokeTime: '2026-02-15 15:30:00',
    deadline: '2026-02-17 18:00',
    msgId: '219098763925',
  },
  {
    /* 我发起·已逾期（收件人未处理且超最迟时间：底栏 撤销/催办/关闭） */
    id: 'TD-018',
    status: '处理中',
    title: '车载手机支架安装说明优化',
    priority: '特急',
    time: '2026-02-08 10:00:00',
    body: '安装说明不清导致咨询与售后上升，请补充图文安装步骤并核对适配车型清单。',
    goods: [GOOD_CAR_MOUNT],
    files: FILES_DOC_IMG,
    to: '朱超',
    acts: ['撤销'],
    type: '商品优化',
    mine: true,
    flow: '已逾期',
    deadline: '2026-02-10 18:00',
    msgId: '219098763926',
  },
  {
    id: 'TD-019',
    status: '已完成',
    title: '浅语坊店铺整体体验优化',
    priority: '高优',
    time: '2026-10-11 09:20:00',
    body: '浅语坊店铺体验分持续偏低，售后纠纷与差评集中，已在店铺分监控-店铺列表按「店铺优化」发起，默认覆盖店铺旗下全部商品，对售后处置放宽口径（极速退款、放宽举证），待店铺体验分回升至目标分值后结束监控。',
    goods: [goodOf('SP-4033', '折叠收纳箱')!, goodOf('SP-4033', '阳台休闲椅')!],
    shops: [{ id: 'SP-4033', name: '浅语坊', platform: '视频号' }],
    result: RES_119,
    resultAtt: DOCS3,
    atts: DOCS3,
    files: FILES_DOC_IMG,
    toList: ['朱超'],
    acts: [],
    type: '店铺优化',
    mine: true,
    flow: '已处理',
    done: true,
    doneTime: '2026-10-14 17:30:00',
    msgId: '219098764119',
    handlers: [
      { name: '朱超', chain: '杭州分公司–项目组–产品部', faqi: '2026-10-11 09:20:00', flow: '已处理', subLabel: '处理时间', sub: '2026-10-14 17:30:00' },
    ],
  },
]);

/** 三桶归属（用户定稿）：待处理/已处理＝别人发给我（未完结/已完结，含已驳回·已转交·已处理）；我发起＝我创建的 */
export const todoBuckets = (t: QcTodo): TodoBucket[] => {
  const b: TodoBucket[] = [];
  if (t.mine) b.push('我发起');
  else b.push(t.done ? '已处理' : '待处理');
  return b;
};

/* ---------- 创建待办统一工厂（三入口同构：待办任务「发起待办」/店铺商品「创建任务」/监控列表「优化任务」）----------
   落一条「我发起」待办：收件人＝发送人（多于一人即多人任务，生成处理人卡与进度），初始态＝别人待处理，
   发起人侧动作＝撤销；被驳回/撤销后再次发起走 onCreated 另建新任务（原任务留档）。 */
export interface TodoDraft {
  title: string;
  priority: TodoPriority;
  body: string;
  files: TodoFile[];
  goods: ShopGood[];
  shops?: TodoShop[];
  senders: { name: string }[];
  deadline: string;
  type?: string;
  optPlan?: string;
  optEnd?: TodoOptEnd;
  optCycle?: { start: string; end: string; openEnd?: boolean };
  /** 放宽售后等无发送人任务的自动收件方（接待段） */
  autoTo?: string;
}
const HANDLER_CHAIN = '杭州分公司–项目组–产品部';
/** 新任务 id：取现有最大序号 +1（种子与运行期新建不冲突） */
export const todoNextId = () => {
  const max = QC_TODOS.reduce((m, t) => Math.max(m, Number(t.id.replace(/\D/g, '')) || 0), 0);
  return `TD-${String(max + 1).padStart(3, '0')}`;
};
export const todoNowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
export const todoFromDraft = (d: TodoDraft): QcTodo => {
  const names = d.senders.map((m) => m.name);
  const now = todoNowStr();
  const multi = names.length > 1;
  return {
    id: todoNextId(),
    status: '处理中',
    title: d.title,
    priority: d.priority,
    time: now,
    body: d.body,
    files: d.files.length ? d.files : undefined,
    goods: d.goods.length ? d.goods : undefined,
    shops: d.shops?.length ? d.shops : undefined,
    to: multi ? undefined : (names[0] ?? d.autoTo),
    toList: multi ? names : undefined,
    acts: ['撤销'],
    type: d.type ?? '',
    optPlan: d.optPlan,
    optEnd: d.optEnd,
    optCycle: d.optCycle,
    mine: true,
    flow: '待处理',
    deadline: d.deadline || undefined,
    msgId: String(219098765000 + QC_TODOS.length),
    progress: multi ? { done: 0, total: names.length } : undefined,
    handlers: multi ? names.map((n) => ({ name: n, chain: HANDLER_CHAIN, faqi: now, flow: '待处理' as const })) : undefined,
  };
};
