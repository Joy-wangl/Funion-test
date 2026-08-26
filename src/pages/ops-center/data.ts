/** 智能运营中心复刻页的全部静态数据（与 preview.html 一一对应） */
import { reactive } from 'vue';

/* ---------- 驾驶舱 KPI ---------- */
export interface KpiFootSeg {
  lines: string[];
  cls?: 'up' | 'down';
}
export interface KpiItem {
  metric: string;
  value: string;
  foot: KpiFootSeg[];
}

export const metricNames = [
  '销售金额',
  '店铺数',
  '订单量',
  '总销售成本',
  '出仓利润',
  '扣减项合计',
  '链接总数',
  '上架链接数',
  '下架链接数',
  '出单链接数',
  '广告费',
  '快递费',
  '毛一利润',
  '毛一利润率',
  '毛二利润',
  '毛二利润率',
  '毛六利润',
  '毛六利润率',
  '新毛六利润',
  '新毛六利润率',
];

export const kpiItems: KpiItem[] = [
  { metric: '销售金额', value: '¥8,833', foot: [{ cls: 'up', lines: ['▼ 8.23%', '上期 9,625'] }] },
  { metric: '店铺数', value: '39.00', foot: [{ cls: 'up', lines: ['▼ 7.14%', '上期 42.00'] }] },
  { metric: '订单量', value: '1,932', foot: [{ cls: 'up', lines: ['▼ 11%'] }, { lines: ['上期 2,179'] }] },
  { metric: '总销售成本', value: '¥4,089', foot: [{ cls: 'up', lines: ['▼ 6.02%', '上期 4,351'] }] },
  { metric: '出仓利润', value: '¥1,818', foot: [{ cls: 'up', lines: ['▼ 11%', '上期 2,050'] }] },
  { metric: '扣减项合计', value: '4,473', foot: [{ cls: 'up', lines: ['▼ 9.96%', '上期 4,968'] }] },
  { metric: '链接总数', value: '468,716', foot: [{ cls: 'down', lines: ['▲ 1.18%', '上期 546.33万'] }] },
  { metric: '上架链接数', value: '5,195', foot: [{ cls: 'down', lines: ['▲ 1.17%', '上期 5,135'] }] },
  { metric: '下架链接数', value: '11.00', foot: [{ cls: 'up', lines: ['▼ 8.33%', '上期 12.00'] }] },
  { metric: '出单链接数', value: '280', foot: [{ cls: 'up', lines: ['▼ 5.72%', '上期 297'] }] },
  { metric: '广告费', value: '¥249', foot: [{ cls: 'up', lines: ['▼ 15%', '上期 292'] }] },
  { metric: '快递费', value: '¥2,926', foot: [{ cls: 'up', lines: ['▼ 9.24%', '上期 3,224'] }] },
  { metric: '毛一利润', value: '¥4,704', foot: [{ cls: 'up', lines: ['▼ 9.71%', '上期 5,210'] }] },
  { metric: '毛一利润率', value: '53%', foot: [{ cls: 'up', lines: ['▼ 1.63%', '上期 54%'] }] },
  { metric: '毛二利润', value: '¥1,344', foot: [{ cls: 'up', lines: ['▼ 9.32%', '上期 1,482'] }] },
  { metric: '毛二利润率', value: '15%', foot: [{ cls: 'up', lines: ['▼ 0.75%', '上期 15%'] }] },
  { metric: '毛六利润', value: '¥1,290', foot: [{ cls: 'up', lines: ['▼ 8.90%', '上期 1,416'] }] },
  { metric: '毛六利润率', value: '15%', foot: [{ cls: 'up', lines: ['▼ 0.75%', '上期 15%'] }] },
  { metric: '新毛六利润', value: '¥26,320', foot: [{ cls: 'up', lines: ['▲ 8.4%', '上期 24,280'] }] },
  { metric: '新毛六利润率', value: '20.5%', foot: [{ cls: 'up', lines: ['▲ 1.6%', '上期 18.9%'] }] },
];

/* ---------- 驾驶舱：亏损商品 ---------- */
export interface LossRow {
  title: string;
  meta: string[];
  store: string;
  platform: string;
  amount: string;
  profit: string;
  rate: string;
  problem: string;
  status: string;
  statusCls: 'badge-red' | 'badge-orange' | 'badge-green';
}
export const lossRows: LossRow[] = [
  {
    title: '水具刀削皮刀便携倒钩苹果去皮神器家用拼多多功能款',
    meta: ['商品ID：267079935129', '近7日销量：12087'],
    store: '快乐小店-佰得小站',
    platform: '淘宝C店',
    amount: '¥8,833',
    profit: '-¥326',
    rate: '-3.7%',
    problem: '广告费偏高 / 利润倒挂',
    status: '亏损中',
    statusCls: 'badge-red',
  },
  {
    title: '益智魔块3D立体拼图3到6岁动物趣味恐龙模型儿童手工',
    meta: ['商品ID：26701928017129', '近7日销量：11875'],
    store: '快乐小店-佰得小站',
    platform: '视频号',
    amount: '¥6,540',
    profit: '-¥185',
    rate: '-2.8%',
    problem: '退款率偏高 / 客诉增加',
    status: '亏损中',
    statusCls: 'badge-red',
  },
  {
    title: '迷你随身小烟炮音响驱动无线蓝牙便携式重低音抽绳盒',
    meta: ['商品ID：3773095122930106470', '近7日销量：11179'],
    store: '抖音小店-BB丽居佳/健身弹专区',
    platform: '淘宝C店',
    amount: '¥5,116',
    profit: '-¥92',
    rate: '-1.8%',
    problem: '快递费过高',
    status: '待优化',
    statusCls: 'badge-orange',
  },
];

/* ---------- 驾驶舱：缺货商品 ---------- */
export interface StockRow {
  title: string;
  meta: string[];
  store: string;
  platform: string;
  yesterday: string;
  week7: string;
  stock: string;
  stockCls: 'badge-red' | 'badge-orange' | 'badge-green';
  risk: string;
  status: string;
  statusCls: 'badge-red' | 'badge-orange' | 'badge-green';
}
export const stockRows: StockRow[] = [
  {
    title: '挂钩强力粘胶粘钩强承重免打孔门后墙壁透明勾塑料款',
    meta: ['商品ID：977051807853', '创建时间：2026/07/13 17:07'],
    store: '拼多多-朝妮优选的小百货',
    platform: '视频号',
    yesterday: '0',
    week7: '10438',
    stock: '0',
    stockCls: 'badge-red',
    risk: '库存已清零，建议立即补货',
    status: '缺货',
    statusCls: 'badge-red',
  },
  {
    title: '密封胶泥空调孔填缝堵洞防虫防水家用耐高温下水道修补',
    meta: ['商品ID：981543753220', '创建时间：2026/07/25 19:10'],
    store: '拼多多-阿涛弄弄',
    platform: '淘宝C店',
    yesterday: '0',
    week7: '9515',
    stock: '8',
    stockCls: 'badge-orange',
    risk: '库存偏低，预计 1 天内售罄',
    status: '库存紧张',
    statusCls: 'badge-orange',
  },
  {
    title: '证件防丢卡套卡套防复制身份证银行卡保护隐私便携款',
    meta: ['商品ID：25969737568832', '创建时间：2026/01/24 21:02'],
    store: '快乐小店-歪歪轩',
    platform: '视频号',
    yesterday: '0',
    week7: '10307',
    stock: '12',
    stockCls: 'badge-orange',
    risk: '销量增长明显，库存不足',
    status: '待补货',
    statusCls: 'badge-orange',
  },
];

/* ---------- 内部商机 / 运营管理 商品行 ---------- */
const svgThumb = (bg: string, text: string, size = 56, rectH = 40) =>
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%27" +
  size +
  "%27%20height%3D%27" +
  size +
  "%27%20viewBox%3D%270%200%20" +
  size +
  '%20' +
  size +
  "%27%3E%3Crect%20width%3D%27" +
  size +
  "%27%20height%3D%27" +
  size +
  "%27%20rx%3D%2710%27%20fill%3D%27" +
  encodeURIComponent(bg).replace(/'/g, '%27') +
  "%27/%3E%3Crect%20x%3D%278%27%20y%3D%278%27%20width%3D%2740%27%20height%3D%27" +
  rectH +
  "%27%20rx%3D%278%27%20fill%3D%27white%27%20fill-opacity%3D%270.92%27/%3E%3Ctext%20x%3D%2728%27%20y%3D%2731%27%20text-anchor%3D%27middle%27%20font-size%3D%2712%27%20font-family%3D%27Arial%27%20fill%3D%27%235b6475%27%3E" +
  encodeURIComponent(text).replace(/'/g, '%27') +
  '%3C/text%3E%3C/svg%3E';

export interface ProductRow {
  thumb: string;
  pname: string;
  pid: string;
  storeMeta: { text: string };
  category: string;
  spark: string;
  cloudRatio: string;
  yesterday: string;
  week7: string;
  refundRate: string;
  refundAfter: string;
  created: string;
}

const spark1 = '2,26 18,26 30,26 42,25 54,25 63,24 68,10 71,25 76,5 80,20 87,26';
const spark2 = '2,24 18,23 30,24 42,23 50,12 58,10 62,6 66,15 72,9 78,20 86,24';
const spark3 = '2,24 14,24 23,24 32,23 40,24 52,23 60,8 68,15 76,14 86,28';
const spark4 = '2,28 12,18 22,15 32,17 42,14 52,16 62,15 72,18 82,16 86,31';
const spark5 = '2,26 14,26 26,26 38,26 48,25 56,25 62,10 64,26 74,12 86,26';
const spark6 = '2,28 16,28 30,28 44,28 56,18 62,14 68,10 74,12 80,8 86,30';

/** 内部商机表格数据 */
export const internalProducts: ProductRow[] = [
  {
    thumb: svgThumb('#ffd9cf', '刀具'),
    pname: '水果刀削皮刀便携倒钩苹果去皮神器家用拼多多功能款...',
    pid: '2670779935129',
    storeMeta: { text: '快乐小店-佰得小站' },
    category: '厨房/烹饪用具/刀...',
    spark: spark1,
    cloudRatio: '-',
    yesterday: '0',
    week7: '12087',
    refundRate: '8.37%',
    refundAfter: '2.62%',
    created: '2026/07/10 17:39',
  },
  {
    thumb: svgThumb('#d9f4e7', '益智'),
    pname: '益智魔块3d立体拼图3到6岁动物趣味恐龙模型儿童手工...',
    pid: '26701928017129',
    storeMeta: { text: '快乐小店-佰得小站' },
    category: '拼玩用品/礼品/创...',
    spark: spark2,
    cloudRatio: '-',
    yesterday: '0',
    week7: '11875',
    refundRate: '9.58%',
    refundAfter: '3.56%',
    created: '2026/07/09 11:34',
  },
  {
    thumb: svgThumb('#dfe8ff', '音响'),
    pname: '迷你随身小烟炮音响驱动无线蓝牙便携式重低音抽绳全...',
    pid: '3773095122930106470',
    storeMeta: { text: '抖音小店-丽丽居住/健身弹专卖店' },
    category: '运动休闲用品/场...',
    spark: spark3,
    cloudRatio: '92.37%',
    yesterday: '0',
    week7: '11179',
    refundRate: '15.70%',
    refundAfter: '3.13%',
    created: '2025/09/04 19:21',
  },
  {
    thumb: svgThumb('#fff0c9', '挂钩'),
    pname: '挂钩强力粘胶粘钩强承重免打孔门后墙壁透明勾塑...',
    pid: '977051807853',
    storeMeta: { text: '拼多多-萌妮优选的小百货' },
    category: '收纳整理/家居用...',
    spark: spark4,
    cloudRatio: '3.46%',
    yesterday: '0',
    week7: '10438',
    refundRate: '3.49%',
    refundAfter: '1.77%',
    created: '2026/07/13 17:07',
  },
  {
    thumb: svgThumb('#ffe1eb', '卡套'),
    pname: '【6个装】证件防丢卡套卡套防窥身份证银行卡保护隐...',
    pid: '25969737568832',
    storeMeta: { text: '快乐小店-歪歪轩' },
    category: '居家日用/其他家...',
    spark: spark5,
    cloudRatio: '-',
    yesterday: '0',
    week7: '10307',
    refundRate: '8.81%',
    refundAfter: '4.73%',
    created: '2026/01/24 21:02',
  },
  {
    thumb: svgThumb('#e6f0ff', '胶泥'),
    pname: '密封胶泥空调孔填缝堵洞防虫防水家用耐高温下水道...',
    pid: '981543753220',
    storeMeta: { text: '拼多多-阿涛弄弄' },
    category: '-',
    spark: spark6,
    cloudRatio: '-',
    yesterday: '0',
    week7: '9515',
    refundRate: '0',
    refundAfter: '0',
    created: '2026/07/25 19:10',
  },
];

/** 运营管理（待上架 / ID数据）表格数据：与原 HTML 一致，音响行缩略图保留 height=440 原样 */
export const omProducts: ProductRow[] = internalProducts.map((row, i) =>
  i === 2 ? { ...row, thumb: svgThumb('#dfe8ff', '音响', 56, 440) } : row,
);

/** 根据店铺名称前缀识别平台 */
export function platformOfStore(store: string): string {
  if (store.startsWith('拼多多')) return '拼多多';
  if (store.startsWith('抖音')) return '抖音';
  if (store.startsWith('快乐小店')) return '快手';
  if (store.startsWith('天猫')) return '天猫';
  if (store.startsWith('淘宝')) return '淘宝';
  return '';
}

/** 平台 LOGO（店铺前圆角正方形展示） */
export const PLATFORM_LOGO: Record<string, string> = {
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  拼多多: '/logos/pinduoduo.png',
  抖音: '/logos/douyin.png',
  快手: '/logos/kuaishou.png',
};

/* ---------- 商品创建（淘宝） ---------- */
const createThumb = (bg: string, text: string) =>
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2752%27%20height%3D%2752%27%20viewBox%3D%270%200%2052%2052%27%3E%3Crect%20width%3D%2752%27%20height%3D%2752%27%20rx%3D%2710%27%20fill%3D%27" +
  encodeURIComponent(bg).replace(/'/g, '%27') +
  "%27/%3E%3Crect%20x%3D%277%27%20y%3D%277%27%20width%3D%2738%27%20height%3D%2738%27%20rx%3D%278%27%20fill%3D%27white%27%20fill-opacity%3D%270.92%27/%3E%3Ctext%20x%3D%2726%27%20y%3D%2729%27%20text-anchor%3D%27middle%27%20font-size%3D%2711%27%20font-family%3D%27Arial%27%20fill%3D%27%235b6475%27%3E" +
  encodeURIComponent(text).replace(/'/g, '%27') +
  '%3C/text%3E%3C/svg%3E';

export interface CreateRow {
  thumb: string;
  platformBadge: string;
  title: string;
  link: string;
  store: string;
  person: string;
  time: string;
}

export const createTaobaoRows: CreateRow[] = [
  {
    thumb: createThumb('#ffd9cf', '耳钉'),
    platformBadge: '天猫',
    title: '玫瑰小众轻奢复古耳钉，法式通勤百搭精致耳饰',
    link: 'https://detail.tmall.com/item.htm?id=809971029607&template=V20260813-01',
    store: '-',
    person: '周梦琪',
    time: '2026-08-13 18:24:10',
  },
  {
    thumb: createThumb('#fff0c9', '耳夹'),
    platformBadge: '天猫',
    title: '法式复古设计不对称方块流苏耳环，轻奢个性耳饰',
    link: 'https://detail.tmall.com/item.htm?id=804439001798&template=V20260813-02',
    store: '-',
    person: '周梦琪',
    time: '2026-08-13 18:24:02',
  },
  {
    thumb: createThumb('#d9f4e7', '项链'),
    platformBadge: '天猫',
    title: '双面可戴微镶满钻花朵珍珠耳环，少女心设计耳钉',
    link: 'https://detail.tmall.com/item.htm?id=889073036521&template=V20260813-03',
    store: '-',
    person: '周梦琪',
    time: '2026-08-13 18:23:54',
  },
  {
    thumb: createThumb('#dfe8ff', '手链'),
    platformBadge: '天猫',
    title: '手作新中古天然石串珠耳环，复古文艺耳饰套装',
    link: 'https://detail.tmall.com/item.htm?id=989730773601&template=V20260813-04',
    store: '-',
    person: '周梦琪',
    time: '2026-08-13 18:23:47',
  },
  {
    thumb: createThumb('#ffe1eb', '耳饰'),
    platformBadge: '天猫',
    title: '高级感小珍珠耳圈耳环，轻奢气质小众设计感耳饰',
    link: 'https://detail.tmall.com/item.htm?id=806181170343&template=V20260813-05',
    store: '-',
    person: '周梦琪',
    time: '2026-08-13 18:23:40',
  },
  {
    thumb: createThumb('#e6f0ff', '挂件'),
    platformBadge: '天猫',
    title: '家用门把手免打孔挂钩，厨房浴室收纳神器',
    link: 'https://detail.tmall.com/item.htm?id=106164978734&template=V20260813-06',
    store: '-',
    person: '陈鑫',
    time: '2026-08-13 18:05:52',
  },
];

/* ---------- 任务中心 ---------- */
const taskThumb = (bg: string, text: string) =>
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2748%27%20height%3D%2748%27%3E%0A%20%20%20%20%3Crect%20width%3D%2748%27%20height%3D%2748%27%20rx%3D%279%27%20fill%3D%27" +
  encodeURIComponent(bg).replace(/'/g, '%27') +
  "%27/%3E%0A%20%20%20%20%3Crect%20x%3D%276%27%20y%3D%276%27%20width%3D%2736%27%20height%3D%2736%27%20rx%3D%277%27%20fill%3D%27white%27%20fill-opacity%3D%27.92%27/%3E%0A%20%20%20%20%3Ctext%20x%3D%2724%27%20y%3D%2728%27%20text-anchor%3D%27middle%27%20font-size%3D%2711%27%20font-family%3D%27Arial%27%20fill%3D%27%23596273%27%3E" +
  encodeURIComponent(text).replace(/'/g, '%27') +
  '%3C/text%3E%0A%20%20%20%20%3C/svg%3E';

export type ParentStatus = 'queued' | 'running' | 'done';
export type SubStatus = 'queued' | 'running' | 'success' | 'failed';

export interface SubTask {
  id: number;
  /** 全局唯一任务ID：任务中心列表/详情 与 个人商品库-关联发布任务抽屉 联动展示 */
  taskId: number;
  templateNo: string;
  name: string;
  thumb: string;
  linkId: string;
  platform: string;
  shop: string;
  /** 发布人（商品创建-关联发布任务抽屉「发布信息」列） */
  publisher?: string;
  status: SubStatus;
  /** 失败原因（失败tab筛选 chips：发品超限/库存不足/其它） */
  reason: string;
  /** 失败节点（0 起）：该节点及其后续节点均失败 */
  failStep?: number;
  retried: boolean;
  startTime: string;
  endTime: string;
}

export interface ParentTask {
  id: number;
  creator: string;
  createTime: string;
  type: string;
  status: ParentStatus;
  /** 渠道：智能 / 蜂联 */
  channel: string;
  shops: number;
  links: number;
  success: number;
  failed: number;
  running: number;
  /** 执行起止时间：仅执行中/已完成有值 */
  startTime: string;
  endTime: string;
  subs: SubTask[];
  /** 个人商品库商品链接：该批次子任务与「关联发布任务」抽屉同源联动 */
  pubFor?: string;
}

const SUB_NAME = 'Nike Sock durk 男子运动鞋采用优质舒适休闲设计';
const subThumb = taskThumb('#f6e7dc', '鞋');
const makers = ['张三', '李四', '王五'];
const failReasons = ['发品超限', '库存不足', '其它'];

/** 各父任务状态下的子任务状态序列 */
const subPattern: Record<ParentStatus, SubStatus[]> = {
  queued: Array.from({ length: 10 }, () => 'queued' as SubStatus),
  running: ['success', 'success', 'failed', 'success', 'running', 'failed', 'running', 'success', 'queued', 'queued'],
  done: ['success', 'failed', 'success', 'success', 'failed', 'success', 'success', 'failed', 'success', 'success'],
};

/* 个人商品库-关联发布任务：该商品在任务中心的发布批次（与任务列表同源，状态联动） */
const PUB_PATTERN: SubStatus[] = ['success', 'failed', 'success', 'success', 'failed', 'success'];
function buildPubBatch(row: CreateRow, seed: number): ParentTask {
  const m = row.link.match(/[?&]id=(\d+)/);
  const subs: SubTask[] = PUB_PATTERN.map((st, i) => ({
    id: seed * 100 + i,
    taskId: seed * 100 + i,
    templateNo: `V${String(seed).padStart(4, '0')}-0${i + 1}`,
    name: row.title,
    thumb: row.thumb,
    linkId: m?.[1] ?? '888877776666',
    platform: '淘宝',
    shop: '小二的店铺',
    publisher: row.person ?? '周梦琪',
    status: st,
    reason: st === 'failed' ? failReasons[(seed + i) % 3] : '',
    failStep: st === 'failed' ? 2 : undefined,
    retried: false,
    startTime: `2026-04-04 12:0${i}:00`,
    endTime: `2026-04-04 12:0${i + 1}:00`,
  }));
  return {
    id: 50 + seed,
    creator: row.person,
    createTime: row.time,
    type: '商品发布',
    status: 'done',
    channel: '智能',
    shops: 6,
    links: 6,
    success: subs.filter((s) => s.status === 'success').length,
    failed: subs.filter((s) => s.status === 'failed').length,
    running: 0,
    startTime: '2026-04-04 12:00:00',
    endTime: '2026-04-04 12:06:00',
    subs,
    pubFor: row.link,
  };
}

function buildSubs(seed: number, status: ParentStatus): SubTask[] {
  return subPattern[status].map((st, i) => ({
    id: seed * 100 + i,
    taskId: 1000 + (seed - 1) * 10 + i,
    templateNo: `V${String(seed).padStart(4, '0')}-${String(i + 1).padStart(2, '0')}`,
    name: SUB_NAME,
    thumb: subThumb,
    linkId: '888877776666',
    platform: '淘宝',
    shop: '小二的店铺',
    status: st,
    reason: st === 'failed' ? failReasons[(seed + i) % 3] : '',
    failStep: st === 'failed' ? (seed + i) % 3 : undefined,
    retried: st === 'failed' && (seed + i) % 2 === 0,
    startTime: st === 'queued' ? '' : '2026-04-04 12:01:00',
    endTime: st === 'success' || st === 'failed' ? '2026-04-04 12:04:00' : '',
  }));
}

function buildParent(id: number, status: ParentStatus): ParentTask {
  return {
    id,
    creator: makers[id % 3],
    createTime: `2026-04-0${(id % 9) + 1} 12:00:00`,
    type: '快速铺货',
    status,
    channel: id % 2 === 0 ? '蜂联' : '智能',
    shops: 56,
    links: 560,
    /* 队列中=全部子任务未执行，成功/失败/执行中均为 0 */
    success: status === 'queued' ? 0 : 504,
    failed: status === 'queued' ? 0 : 56,
    running: status === 'running' ? 400 : 0,
    startTime: status === 'queued' ? '' : '2026-04-04 12:01:00',
    endTime: status === 'done' ? '2026-04-04 12:04:00' : '',
    subs: buildSubs(id, status),
  };
}

/** 父任务（批次）列表：前 3 行对应原型（已完成/执行中/队列中），共 50 批 = 15 队列 + 20 执行中 + 15 完成；
    末尾追加个人商品库发布批次（pubFor），与关联发布任务抽屉同源 */
export const parentTasks = reactive<ParentTask[]>([
  { ...buildParent(1, 'done'), creator: '张三', createTime: '2026-04-04 12:00:00' },
  { ...buildParent(2, 'running'), creator: '张三', createTime: '2026-04-04 12:00:00' },
  { ...buildParent(3, 'queued'), creator: '张三', createTime: '2026-04-04 12:00:00' },
]);
{
  const need: [ParentStatus, number][] = [
    ['done', 14],
    ['running', 19],
    ['queued', 14],
  ];
  let nextId = 4;
  for (const [st, n] of need) {
    for (let k = 0; k < n; k++) parentTasks.push(buildParent(nextId++, st));
  }
  createTaobaoRows.forEach((row, ri) => parentTasks.push(buildPubBatch(row, ri + 1)));
}

/** 重试/重新发布：执行中→完成，并同步更新所属批次聚合（任务中心与关联发布任务抽屉联动） */
export function retrySub(sub: SubTask): void {
  if (sub.status !== 'failed') return;
  const parent = parentTasks.find((p) => p.subs.includes(sub));
  sub.status = 'running';
  sub.endTime = '';
  if (parent) {
    parent.failed = Math.max(0, parent.failed - 1);
    parent.running += 1;
  }
  window.setTimeout(() => {
    sub.status = 'success';
    sub.failStep = undefined;
    sub.reason = '';
    sub.retried = true;
    sub.endTime = '2026-04-04 12:09:00';
    if (parent) {
      parent.running = Math.max(0, parent.running - 1);
      parent.success += 1;
    }
  }, 1200);
}

/* ================= 商品创建详情（静态素材，淘宝/视频号列表共用） ================= */
export const createDetail = {
  category: ['一级类目', '二级类目', '三级类目'],
  checkStatus: '待审核',
  thumbs: ['/products/main.png', '/products/main.png', '/products/main.png', '/products/main.png', '/products/main.png', '/products/main.png'],
  specs: [
    { name: '颜色分类', values: ['黑色', '白色'] },
    { name: '款式', values: ['a款', 'b款'] },
  ],
  skus: [
    { color: '黑色', style: 'a款', name: '黑a款', code: 'JSUZJDAO-001*2', series: '编码A', cost: '99.00', other: '20', price: '2026.00', profit: '2026.00', rate: '10' },
    { color: '黑色', style: 'b款', name: '黑b款', code: 'ZH-ZJDAO-007*1', series: '编码B', cost: '99.00', other: '20', price: '2026.00', profit: '2026.00', rate: '10' },
    { color: '白色', style: 'a款', name: '白a款', code: 'JSUZJDAO-001*2', series: '编码C', cost: '99.00', other: '20', price: '2026.00', profit: '2026.00', rate: '10' },
    { color: '白色', style: 'b款', name: '白b款', code: 'JSUZJDAO-003*2', series: '编码D', cost: '99.00', other: '20', price: '2026.00', profit: '', rate: '10' },
  ],
  price: '2026',
  mainImgs: ['/products/serum.png', '/products/main.png', '/products/serum.png', '/products/main.png'],
  detailImgs: [
    '/products/serum.png', '/products/main.png', '/products/serum.png', '/products/main.png',
    '/products/serum.png', '/products/main.png', '/products/serum.png', '/products/main.png',
  ],
  videos: ['/products/serum.png', '/products/main.png', '/products/serum.png'],
  whiteImg: '/products/serum.png',
  sceneImg: '/products/serum.png',
};

/* ================= 选择版本（详情页版本选择全屏页静态素材） ================= */
export interface CreateVersion {
  id: string;
  title: string;
  thumb: string;
  versionNo: string;
  /** 商品模板平台标签 */
  platform: '淘宝' | '视频号';
  verName: string;
  verDesc: string;
  pubPlatform: '淘宝' | '视频号';
  person: string;
  time: string;
  current?: boolean;
}

const VER_TITLE = '迷你随身小钢炮音响强劲无线蓝牙便携式重低音炮全向通用音响小型';
const verDescOf = (person: string, time: string) => `由 ${person} 于 ${time} 发布自动生成`;

export const createVersions: CreateVersion[] = [
  { id: 'v1', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787207508609', platform: '视频号', verName: '肖桃-20260820143133', verDesc: verDescOf('肖桃', '2026-08-20 14:31:33'), pubPlatform: '视频号', person: '肖桃', time: '2026-08-20 14:31:48' },
  { id: 'v2', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787207504637', platform: '视频号', verName: '肖桃-20260820143133', verDesc: verDescOf('肖桃', '2026-08-20 14:31:33'), pubPlatform: '视频号', person: '肖桃', time: '2026-08-20 14:31:44' },
  { id: 'v3', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787207496149', platform: '视频号', verName: '肖桃-20260820143133', verDesc: verDescOf('肖桃', '2026-08-20 14:31:33'), pubPlatform: '视频号', person: '肖桃', time: '2026-08-20 14:31:36' },
  { id: 'v4', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787206182732', platform: '淘宝', verName: '王龙 20260820140932', verDesc: '—', pubPlatform: '淘宝', person: '王龙', time: '2026-08-20 14:09:42', current: true },
  { id: 'v5', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787205281874', platform: '视频号', verName: '吴安雄-20260820135440', verDesc: verDescOf('吴安雄', '2026-08-20 13:54:40'), pubPlatform: '视频号', person: '吴安雄', time: '2026-08-20 13:54:41' },
  { id: 'v6', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787118716626', platform: '淘宝', verName: '叶润柱-20260819135154', verDesc: verDescOf('叶润柱', '2026-08-19 13:51:54'), pubPlatform: '淘宝', person: '叶润柱', time: '2026-08-19 13:51:56' },
  { id: 'v7', title: VER_TITLE, thumb: '/products/main.png', versionNo: '1787118715818', platform: '淘宝', verName: '叶润柱-20260819135153', verDesc: verDescOf('叶润柱', '2026-08-19 13:51:53'), pubPlatform: '淘宝', person: '叶润柱', time: '2026-08-19 13:51:55' },
];

/* ================= 发布到抽屉（选择策略 → 选择店铺）静态数据 ================= */
export interface PubStrategy {
  name: string;
  /** 策略定义的发布方式：直接上架 / 放入仓库 */
  pubMethod: string;
  profitMode: string;
  profitRate: string;
  promote: string;
  bidMode: string;
  bidTarget: string;
  roi: string;
  budgetType: string;
  dailyBudget: string;
}
export const PUB_NO_STRATEGY = '不使用策略发布';
export const PUB_STRATEGIES: PubStrategy[] = [
  { name: '13245', pubMethod: '放入仓库', profitMode: '控利润率', profitRate: '1%', promote: '-', bidMode: '-', bidTarget: '-', roi: '-', budgetType: '-', dailyBudget: '-' },
  { name: '8801', pubMethod: '直接上架', profitMode: '控利润率', profitRate: '5%', promote: '是', bidMode: '控投产比', bidTarget: '点击量', roi: '2.5', budgetType: '每日预算', dailyBudget: '100元' },
];

export interface PubShop {
  id: number;
  platform: string;
  name: string;
}
export const PUB_SHOP_PLATFORMS = ['淘宝', '天猫', '拼多多', '抖音', '快手'];
/** 发布到第二步：未分组店铺（平台筛选 + 名称搜索） */
export const PUB_SHOPS: PubShop[] = [
  { id: 1, platform: '淘宝', name: '1111' },
  { id: 2, platform: '淘宝', name: '一点就到百货' },
  { id: 3, platform: '淘宝', name: '万品家居源头直供店的小店42' },
  { id: 4, platform: '淘宝', name: '万品家居源头直供店的小店42' },
  { id: 5, platform: '淘宝', name: '万福日用百货' },
  { id: 6, platform: '淘宝', name: '义乌日用家居直供店' },
  { id: 7, platform: '淘宝', name: '云朵礼遇' },
  { id: 8, platform: '淘宝', name: '云深不知好物馆' },
  { id: 9, platform: '淘宝', name: '优家日用百货店' },
  { id: 10, platform: '淘宝', name: '优家百货严选' },
  { id: 11, platform: '淘宝', name: '佳音日用百货商城' },
  { id: 12, platform: '淘宝', name: '全家百货行' },
  { id: 13, platform: '淘宝', name: '全家百货行' },
  { id: 14, platform: '淘宝', name: '全球好物严选PU' },
  { id: 15, platform: '天猫', name: 'Funion旗舰店' },
  { id: 16, platform: '天猫', name: 'Funion专营店' },
];
