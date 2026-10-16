/* ---------- 待办任务数据层（品控·线上·待办任务）：任务待办 · 待处理列表种子。
   口径对齐参考图：待办卡＝状态芯片(驳回/转交)＋标题＋优先级标记(特急🔥/紧急/高优/低优)＋时间＋正文＋附件＋发起人/收件人＋动作钮。
   桶归属：待处理=!done；已处理=done；我发起=mine（被驳回回到发起人，仍计待处理）。 */

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
  /** 接收人驳回：原因＋驳回时间（详情「驳回原因」页签） */
  rejectReason?: string;
  rejectTime?: string;
  /** 发起人撤销时间（撤销态卡与处理流程节点） */
  revokeTime?: string;
  /** 发起时填写的最迟处理时间（重新提交回填用） */
  deadline?: string;
  done?: boolean;
  mine?: boolean;
}

/** 类型页签词表（参考图筛选行）；「待办类型 ≡ ···」为类型展示不完时的折叠态，非页签 */
export const TODO_TYPES = ['全部', '聊天稽查', 'AI分析结果', '采购通知', '库存不足通知', '每周报表'];

const BODY =
  '这是你们部门的聊天记录稽查分析结果， 有些同学的回复比较敷衍， 你看一下是什么问题导致的， 明天下班前给我出一个处理结果， 请立刻检查你的成员是怎么个事情， 找到原因， 立即发给我知道， 快点处理';

/* 发起待办时上传的附件种子：覆盖 图/文/视 混合、单文档、双图、单视频、文档+图、无附件 六种情形 */
const FILES_MIX = [
  { id: 'TF-101', name: '稽查问题截图.png', size: 254 * 1024, kind: 'image', url: '/products/main.png' },
  { id: 'TF-102', name: '聊天记录导出.xlsx', size: 86 * 1024, kind: 'file', url: '' },
  { id: 'TF-103', name: '客服现场核查.mp4', size: 12.6 * 1048576, kind: 'video', url: '' },
] as TodoFile[];
const FILES_DOC = [{ id: 'TF-201', name: '稽查明细表.xlsx', size: 46 * 1024, kind: 'file', url: '' }] as TodoFile[];
const FILES_IMGS = [
  { id: 'TF-301', name: '问题截图-回复敷衍.png', size: 182 * 1024, kind: 'image', url: '/products/serum.png' },
  { id: 'TF-302', name: '问题截图-未回复.png', size: 205 * 1024, kind: 'image', url: '/products/hairpin.png' },
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

export const QC_TODOS: QcTodo[] = [
  {
    id: 'TD-001',
    title: '客服聊天稽查分析结果',
    priority: '特急',
    time: '2026-01-15 12:00:00',
    body: BODY,
    files: FILES_MIX,
    from: { group: '运营A组', name: '熊立群' },
    tag: 'AI分析',
    acts: ['驳回', '转交', '处理'],
    type: '聊天稽查',
    progress: { done: 5, total: 10 },
  },
  {
    id: 'TD-002',
    status: '驳回',
    title: '客服聊天稽查分析结果',
    priority: '紧急',
    time: '2026-01-15 12:00:00',
    body: BODY,
    files: FILES_DOC,
    from: { group: '运营A组', name: '熊立群' },
    tag: 'AI分析',
    acts: ['转交', '处理'],
    type: '聊天稽查',
  },
  {
    id: 'TD-003',
    status: '转交',
    title: '客服聊天稽查分析结果',
    priority: '高优',
    time: '2026-01-15 12:00:00',
    body: BODY,
    files: FILES_IMGS,
    from: { group: '运营A组', name: '熊立群' },
    tag: 'AI分析',
    acts: ['驳回', '转交', '处理'],
    type: '聊天稽查',
    flow: '已逾期',
  },
  {
    id: 'TD-004',
    status: '处理中',
    title: '客服聊天稽查分析结果',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    files: FILES_VIDEO,
    to: '朱超',
    tag: 'AI分析',
    acts: ['撤销'],
    type: '聊天稽查',
    mine: true,
    flow: '待处理',
    msgId: '219098763920',
    atts: DOCS3,
    deadline: '2026-02-18 18:00',
  },
  {
    id: 'TD-005',
    status: '已完成',
    title: '客服聊天稽查分析结果',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    to: '朱超',
    tag: 'AI分析',
    acts: [],
    type: '聊天稽查',
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
  },
  {
    id: 'TD-006',
    status: '处理中',
    title: '客服聊天稽查分析结果',
    priority: '特急',
    time: '2026-02-17 12:00:00',
    body: BODY,
    files: FILES_DOC_IMG,
    toList: ['朱超', '杨宗华', '郭三连', '李恩俊', '刘亚军', '鲁梦男', '文杰', '郭三语', '郑婷', '刘洋'],
    tag: '工作流',
    acts: ['撤销'],
    type: '聊天稽查',
    mine: true,
    flow: '待处理',
    msgId: '219098763920',
    atts: DOCS3,
    handlers: [
      { name: '朱超', chain: '杭州分公司–项目组–产品部', faqi: '2026-02-16 12:00:00', flow: '待处理' },
      { name: '鲁梦男', chain: '杭州分公司–项目组–测试部', faqi: '2026-02-16 12:00:00', flow: '待处理', act: '转', transferFrom: '文杰–杭州分公司–项目组–测试部', transferTime: '2026-02-17 12:30:00' },
      { name: '文杰', chain: '杭州分公司–项目组–测试部', faqi: '2026-02-16 12:00:00', flow: '驳回', subLabel: '驳回时间', sub: '2026-02-16 13:00:00', act: '驳', rejectReason: '这个东西不归我测试，你应该找梦男处理的' },
      { name: '李恩俊', chain: '杭州分公司–项目组–开发部', faqi: '2026-02-16 12:00:00', flow: '已处理', subLabel: '处理时间', sub: '2026-02-16 13:00:00', act: '转' },
      { name: '刘亚军', chain: '杭州分公司–项目组–开发部', faqi: '2026-02-16 12:00:00', flow: '已处理', subLabel: '处理时间', sub: '2026-02-16 13:00:00' },
      { name: '郭三连', chain: '杭州分公司–项目组–开发部', faqi: '2026-02-16 12:00:00', flow: '已撤销', subLabel: '撤销时间', sub: '2026-02-16 13:00:00', act: '撤' },
    ],
  },
];

/** 三桶归属：待处理=未完结；已处理=已完结；我发起=本人发起 */
export const todoBuckets = (t: QcTodo): TodoBucket[] => {
  const b: TodoBucket[] = [];
  if (!t.done) b.push('待处理');
  if (t.done) b.push('已处理');
  if (t.mine) b.push('我发起');
  return b;
};
