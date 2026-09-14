/** 智能运营中心复刻页的全部静态数据（与 preview.html 一一对应） */
import { reactive } from 'vue';
import type { SgProduct, SgStatus } from './shopGoodsData';

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
  /** 商品状态：与店铺商品列表同源枚举（SG_STATUS_META） */
  goodsStatus: SgStatus;
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
    goodsStatus: 'selling',
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
    goodsStatus: 'selling',
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
    goodsStatus: 'offManual',
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
  /** 商品状态：与店铺商品列表同源枚举（SG_STATUS_META） */
  goodsStatus: SgStatus;
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
    goodsStatus: 'selling',
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
    goodsStatus: 'selling',
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
    goodsStatus: 'offManual',
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
  /** 发布人 */
  publisher: string;
  created: string;
  /** 查询条件扩展列演示值（key 与筛选器标签一致；运营管理列表专用） */
  extra?: Record<string, string>;
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
    publisher: '王龙',
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
    publisher: '周梦琪',
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
    publisher: '李四',
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
    publisher: '王龙',
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
    publisher: '七妮妮',
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
    publisher: '周梦琪',
    created: '2026/07/25 19:10',
  },
];

/** 运营管理（待上架 / ID数据）表格数据：与原 HTML 一致，音响行缩略图保留 height=440 原样；附带查询条件列演示值 */
const OM_EXTRAS: Record<string, string>[] = internalProducts.map((row, i) => ({
  系列编码: `XL-220${i + 1}`,
  运营组: ['运营一组', '运营二组', '运营三组'][i % 3],
  运营专员: ['王芳', '李娜', '赵磊'][i % 3],
  运营助理: i % 2 ? '吴倩' : '孙悦',
  出仓利润: i % 2 ? '亏损' : '盈利',
  备注: i === 1 ? '注意补货' : '-',
  毛六利润率: '25%',
  /* 运营毛利列按标注「都用具体值」展示小数（如 0.31）；key 与列头全角括号保持一致 */
  运营毛六利: (0.31 + i * 0.02).toFixed(2),
  '运营毛四（减税）': (0.14 + i * 0.01).toFixed(2),
  '运营毛六（减税）': (0.18 + i * 0.01).toFixed(2),
  总广告费: `¥${200 + i * 49}`,
  经营大类: row.category.split('/')[0] || '-',
  一级类目: row.category.split('/')[0] || '-',
  二级类目: row.category.split('/')[1] || '-',
  }));
/** 运营管理行：与店铺商品列表同步，区分淘宝 / 视频号渠道与商品状态（操作列按状态生成） */
/* 店铺商品同源状态：两平台枚举有差别——视频号含「审核待处理」，淘宝无；下架两平台均分 手动/平台 */
const OM_SG: { channel: '淘宝' | '视频号'; status: SgStatus }[] = [
  { channel: '视频号', status: 'selling' },
  { channel: '淘宝', status: 'selling' },
  { channel: '视频号', status: 'auditing' },
  { channel: '淘宝', status: 'offManual' },
  { channel: '视频号', status: 'auditFail' },
  { channel: '淘宝', status: 'offSystem' },
];
export type OmProduct = ProductRow & { sg: { channel: '淘宝' | '视频号'; status: SgStatus } };
export const omProducts: OmProduct[] = internalProducts.map((row, i) => ({
  ...(i === 2 ? { ...row, thumb: svgThumb('#dfe8ff', '音响', 56, 440) } : row),
  extra: OM_EXTRAS[i],
  sg: OM_SG[i],
}));

/** 商机 / 运营管理行 → 店铺商品详情模型（复用店铺商品详情页样式） */
export function toSgProduct(r: ProductRow, over?: Partial<Pick<SgProduct, 'status' | 'source'>>): SgProduct {
  const cats = r.category.split('/').map((s) => s.trim().replace(/\.{3}|…$/, ''));
  const t = r.created.replace(/\//g, '-');
  return {
    id: r.pid, title: r.pname, img: r.thumb, linkId: r.pid, seriesCode: '-',
    status: over?.status ?? 'selling', strategy: '未关联', sales: r.week7, reviews: '-',
    publisher: '-', store: r.storeMeta.text, storePlatform: platformOfStore(r.storeMeta.text),
    source: over?.source ?? '内部商机', version: r.pid, operator: '-',
    sold30: '-', exposure: '-',
    category: [cats[0] || '-', cats[1] || '-', cats[2] || '-'],
    publishTime: t, shelfTime: t, createTime: t,
  };
}

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
/* 视频号平台无 logo 资源：橙底「视」字 SVG 占位（data-uri） */
const wxLogo = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#fa9a3e"/><text x="16" y="22" font-size="15" fill="#fff" text-anchor="middle" font-family="sans-serif">视</text></svg>');
export const PLATFORM_LOGO: Record<string, string> = {
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  拼多多: '/logos/pinduoduo.png',
  抖音: '/logos/douyin.png',
  快手: '/logos/kuaishou.png',
  京麦: '/logos/jd.png',
  京东: '/logos/jd.png',
  视频号: wxLogo,
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

/* ---------- 商品创建（京麦） ---------- */
export const createJmRows: CreateRow[] = [
  {
    thumb: createThumb('#ffe1e0', '刀具'),
    platformBadge: '京麦',
    title: '水果刀削皮刀便携刨刀苹果去皮神器家用不锈钢刀具',
    link: 'https://item.jd.com/100012345601.html?template=JM20260815-01',
    store: '-',
    person: '周梦琪',
    time: '2026-08-15 10:24:10',
  },
  {
    thumb: createThumb('#dfe8ff', '音响'),
    platformBadge: '京麦',
    title: '迷你随身小钢炮音响强劲无线蓝牙便携式重低音炮',
    link: 'https://item.jd.com/100012345602.html?template=JM20260815-02',
    store: '-',
    person: '周梦琪',
    time: '2026-08-15 10:24:02',
  },
  {
    thumb: createThumb('#d9f4e7', '精华'),
    platformBadge: '京麦',
    title: 'PERDORA 玻尿酸修护精华液 补水保湿舒缓敏感肌 30ml 装',
    link: 'https://item.jd.com/100012345603.html?template=JM20260815-03',
    store: '-',
    person: '陈鑫',
    time: '2026-08-15 10:23:54',
  },
  {
    thumb: createThumb('#fff0c9', '挂钩'),
    platformBadge: '京麦',
    title: '挂钩强力粘胶粘钩强承重免打孔门后墙壁透明勾塑料款',
    link: 'https://item.jd.com/100012345604.html?template=JM20260815-04',
    store: '-',
    person: '陈鑫',
    time: '2026-08-15 10:23:47',
  },
];

/* ---------- 任务中心 ---------- */
const p2 = (n: number) => String(n).padStart(2, '0');
/** 今日日期串：任务详情创建时间筛选默认区间与今日批次种子共用 */
export const TC_TODAY = `${new Date().getFullYear()}-${p2(new Date().getMonth() + 1)}-${p2(new Date().getDate())}`;
const wcTime = (h: number, m: number, s: number) => `${TC_TODAY} ${p2(h)}:${p2(m)}:${p2(s)}`;
/** n 天前日期串：批次种子按日散布（概览时间窗口切片有数据） */
const dateDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
/** 运行时当前时刻串：重试/通过/拒绝等动作回写时间 */
const nowStr = () => `${TC_TODAY} ${new Date().toTimeString().slice(0, 8)}`;
const taskThumb = (bg: string, text: string) =>
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2748%27%20height%3D%2748%27%3E%0A%20%20%20%20%3Crect%20width%3D%2748%27%20height%3D%2748%27%20rx%3D%279%27%20fill%3D%27" +
  encodeURIComponent(bg).replace(/'/g, '%27') +
  "%27/%3E%0A%20%20%20%20%3Crect%20x%3D%276%27%20y%3D%276%27%20width%3D%2736%27%20height%3D%2736%27%20rx%3D%277%27%20fill%3D%27white%27%20fill-opacity%3D%27.92%27/%3E%0A%20%20%20%20%3Ctext%20x%3D%2724%27%20y%3D%2728%27%20text-anchor%3D%27middle%27%20font-size%3D%2711%27%20font-family%3D%27Arial%27%20fill%3D%27%23596273%27%3E" +
  encodeURIComponent(text).replace(/'/g, '%27') +
  '%3C/text%3E%0A%20%20%20%20%3C/svg%3E';

export type ParentStatus = 'queued' | 'running' | 'done';
/** confirm=风控待二次确认；cancelled=已取消（取消方式见 cancelType） */
export type SubStatus = 'queued' | 'running' | 'success' | 'failed' | 'confirm' | 'cancelled';
/** 取消方式：risk=风控自动取消 / manual=手动取消执行 */
export type CancelType = 'risk' | 'manual';
/** 风控取消原因（品控中心垃圾品口径） */
export const RISK_JUNK_REASON = '商品命中公司垃圾品管控，不允许上架';
/** 风险管控失败原因（校验管控商品节点命中禁止上架商品） */
export const RISK_CTRL_REASON = '命中我司风险管控商品，该商品禁止上架';

/** 店铺发布结果（任务节点三集合元素）：商品发到不同店铺时各自的独立结果 */
export interface ShopResult {
  platform: string;
  shop: string;
  status: SubStatus;
  /** 失败原因（失败tab筛选 chips：发品受限/价格异常/母链接同步失败/风控拦截/材料缺失/系列编码异常/其它） */
  reason: string;
  retried: boolean;
  startTime: string;
  endTime: string;
}

export interface SubTask {
  id: number;
  /** 全局唯一任务ID：任务中心列表/详情 与 个人商品库-关联发布任务抽屉 联动展示（字符串避免 18 位雪花ID 精度丢失） */
  taskId: string;
  templateNo: string;
  name: string;
  thumb: string;
  linkId: string;
  /** 发布人（商品创建-关联发布任务抽屉「发布信息」列） */
  publisher?: string;
  /** 任务状态（聚合：统一节点失败 > 店铺结果集） */
  status: SubStatus;
  /** 失败节点（0 起，统一节点索引：含校验管控商品节点）：该节点失败则店铺集合未触达 */
  failStep?: number;
  /** 校验管控商品节点结果（发布/铺货类任务）：总数/通过/失败/待确认 */
  verify?: { total: number; pass: number; fail: number; pending: number };
  /** 取消方式（仅 cancelled）：区分风控自动取消/手动取消（已取消 tab 子状态） */
  cancelType?: CancelType;
  /** 风险说明（confirm/cancelled）：弹窗与取消原因展示 */
  riskReason?: string;
  /** 一品一店一任务：单店发布结果集（长度恒为 1） */
  shops: ShopResult[];
  startTime: string;
  endTime: string;
}

/** 任务状态聚合规则：统一节点（一/二）失败优先；否则看店铺集合——全待执行=队列中、含失败=执行失败、全成功=已完成、其余=执行中 */
export function taskStatusOf(s: { failStep?: number; shops: ShopResult[] }): SubStatus {
  if (s.failStep !== undefined) return 'failed';
  const st = s.shops.map((x) => x.status);
  if (st.every((x) => x === 'queued')) return 'queued';
  if (st.some((x) => x === 'failed')) return 'failed';
  if (st.every((x) => x === 'success')) return 'success';
  return 'running';
}

export interface ParentTask {
  id: number;
  creator: string;
  createTime: string;
  type: string;
  status: ParentStatus;
  /** 渠道：智能 / 蜂联 */
  channel: string;
  /** 发布方式：蜂联发布 / 插件发布 */
  pubWay: string;
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
const failReasons = ['发品受限', '价格异常', '母链接同步失败', '风控拦截', '材料缺失', '系列编码异常', '其它'];

/** 种子状态：在 SubStatus 基础上区分取消来源（风控/手动），建模时归一为 cancelled */
type SubSeed = SubStatus | 'risk_cancelled' | 'manual_cancelled';
const seedStatus = (st: SubSeed): SubStatus => (st === 'risk_cancelled' || st === 'manual_cancelled' ? 'cancelled' : st);

/** 各父任务状态下的子任务状态序列（含风控样本：confirm=待二次确认 / risk_cancelled=风控取消 / manual_cancelled=手动取消） */
const subPattern: Record<ParentStatus, SubSeed[]> = {
  queued: Array.from({ length: 10 }, () => 'queued' as SubStatus),
  running: ['success', 'confirm', 'failed', 'success', 'running', 'risk_cancelled', 'running', 'success', 'queued', 'queued'],
  done: ['success', 'failed', 'success', 'manual_cancelled', 'failed', 'success', 'success', 'risk_cancelled', 'success', 'confirm'],
};

/* 个人商品库-关联发布任务：该商品在任务中心的发布批次（与任务列表同源，状态联动） */
const PUB_PATTERN: SubStatus[] = ['success', 'failed', 'success', 'success', 'failed', 'success'];
/* 店铺池：按平台分组；单个发布任务不跨平台，店铺均取自同一平台 */
const PLATFORM_SHOPS: { platform: string; shops: string[] }[] = [
  { platform: '淘宝', shops: ['小二的店铺', '小二女装店', '小二鞋包专营店', '小二母婴店'] },
  { platform: '天猫', shops: ['小二旗舰店', '小二官方旗舰店', '小二美妆专营店', '小二家电专营店'] },
  { platform: '拼多多', shops: ['小二专营店', '小二百货店', '小二日用优选店', '小二生鲜店'] },
  { platform: '抖音', shops: ['小二小店', '小二直播店', '小二优选店', '小二潮玩店'] },
  { platform: '快手', shops: ['小二优选店', '小二老铁店', '小二严选店', '小二特产店'] },
];
/* 按任务取同一平台的 2-4 个店铺（循环取该平台店铺） */
const pickShops = (seed: number, i: number) => {
  const g = PLATFORM_SHOPS[(seed + i) % PLATFORM_SHOPS.length];
  const n = 2 + ((seed + i) % 3);
  const start = (seed + i) % g.shops.length;
  return Array.from({ length: n }, (_, k) => ({ platform: g.platform, shop: g.shops[(start + k) % g.shops.length] }));
};
/* 店铺结果集：按任务状态推导各店独立结果（失败且统一节点失败=未触达；节点三失败=部分店失败） */
function buildShops(seed: number, i: number, st: SubStatus, day: string): ShopResult[] {
  const pools = pickShops(seed, i);
  const failReason = failReasons[(seed + i) % failReasons.length];
  const retried = (seed + i) % 2 === 0;
  const unifiedFailed = st === 'failed' && (seed + i) % 3 < 2;
  const allFailed = st === 'failed' && (seed + i) % 4 === 0;
  return pools.map((p, k) => {
    let status: SubStatus = st;
    /* 风控态（待确认/已取消）：任务未进入店铺发布，全部店铺保持待执行 */
    if (st === 'confirm' || st === 'cancelled') status = 'queued';
    if (st === 'running') status = k === 0 ? 'success' : k === 1 ? 'running' : 'queued';
    if (st === 'failed') status = unifiedFailed ? 'queued' : allFailed ? 'failed' : k === pools.length - 1 ? 'failed' : 'success';
    return {
      platform: p.platform,
      shop: p.shop,
      status,
      reason: status === 'failed' ? failReason : '',
      retried: status === 'failed' ? retried : false,
      startTime: status === 'queued' ? '' : `${day} 12:01:00`,
      endTime: status === 'success' || status === 'failed' ? `${day} 12:04:00` : '',
    };
  });
}
function buildPubBatch(row: CreateRow, seed: number): ParentTask {
  const m = row.link.match(/[?&]id=(\d+)/);
  const day = row.time.slice(0, 10);
  /* 一品一店一任务：单平台店铺池逐店生成任务（六店 = 六个任务，taskId 60000 段） */
  const g = PLATFORM_SHOPS[seed % PLATFORM_SHOPS.length];
  const subs: SubTask[] = PUB_PATTERN.map((st, idx) => {
    const shop: ShopResult = {
      platform: g.platform,
      shop: g.shops[idx % g.shops.length],
      status: st,
      reason: st === 'failed' ? failReasons[(seed + idx) % failReasons.length] : '',
      retried: false,
      startTime: st === 'success' || st === 'failed' ? `${day} 12:0${idx}:00` : '',
      endTime: st === 'success' || st === 'failed' ? `${day} 12:0${idx + 1}:00` : '',
    };
    return {
      id: idx,
      taskId: String(60000 + seed * 100 + idx),
      templateNo: `V${String(seed).padStart(4, '0')}-0${idx + 1}`,
      name: row.title,
      thumb: row.thumb,
      linkId: m?.[1] ?? '888877776666',
      publisher: row.person ?? '周梦琪',
      status: st,
      shops: [shop],
      startTime: shop.startTime,
      endTime: shop.endTime,
    };
  });
  return {
    id: 50 + seed,
    creator: row.person,
    createTime: row.time,
    type: '商品发布',
    status: 'done',
    channel: '智能',
    pubWay: '蜂联发布',
    shops: subs.length,
    links: subs.length,
    success: subs.filter((s) => s.status === 'success').length,
    failed: subs.filter((s) => s.status === 'failed').length,
    running: 0,
    startTime: `${day} 12:00:00`,
    endTime: `${day} 12:06:00`,
    subs,
    pubFor: row.link,
  };
}

/* 一品一店一任务：状态种子逐店展开，每店一个独立子任务（taskId=父批次*1000+槽位*10+店序） */
function buildSubs(seed: number, status: ParentStatus, day: string): SubTask[] {
  const subs: SubTask[] = [];
  subPattern[status].forEach((sd, i) => {
    const st = seedStatus(sd);
    /* 风控态：待确认（风险管控，可能亏损）/ 已取消（垃圾品管控或手动取消），店铺未触达 */
    const risk = st === 'confirm' || st === 'cancelled';
    /* 失败样本分流：统一节点失败（0/1，店铺未触达）与店铺级失败（failStep 缺省）按槽位交替 */
    const failStep = st === 'failed' && (seed + i) % 3 < 2 ? (seed + i) % 2 : undefined;
    const shops = buildShops(seed, i, risk ? 'queued' : st, day);
    const cancelType: CancelType | undefined = sd === 'risk_cancelled' ? 'risk' : sd === 'manual_cancelled' ? 'manual' : undefined;
    shops.forEach((sp, k) => {
      const rowSt: SubStatus = risk ? st : taskStatusOf({ failStep, shops: [sp] });
      subs.push({
        id: i * 10 + k,
        taskId: String(seed * 1000 + i * 10 + k),
        templateNo: `V${String(seed).padStart(4, '0')}-${String(i + 1).padStart(2, '0')}`,
        name: SUB_NAME,
        thumb: subThumb,
        linkId: '888877776666',
        status: rowSt,
        failStep,
        cancelType,
        riskReason: risk ? RISK_JUNK_REASON : undefined,
        shops: [sp],
        startTime: rowSt === 'queued' || rowSt === 'confirm' ? '' : sp.startTime || `${day} 12:01:00`,
        endTime: rowSt === 'success' || rowSt === 'failed' || rowSt === 'cancelled' ? sp.endTime || `${day} 12:04:00` : '',
      });
    });
  });
  return subs;
}

function buildParent(id: number, status: ParentStatus, day?: string): ParentTask {
  /* 批次日期按 id 散布近 30 天（含今日/昨日），概览时间窗口切片有数据 */
  const d = day ?? dateDaysAgo((id * 7) % 30);
  return {
    id,
    creator: makers[id % 3],
    createTime: `${d} 12:00:00`,
    type: '快速铺货',
    status,
    channel: id % 2 === 0 ? '蜂联' : '智能',
    pubWay: id % 2 === 0 ? '蜂联发布' : '插件发布',
    shops: 56,
    links: 560,
    /* 队列中=全部子任务未执行，成功/失败/执行中均为 0 */
    success: status === 'queued' ? 0 : 504,
    failed: status === 'queued' ? 0 : 56,
    running: status === 'running' ? 400 : 0,
    startTime: status === 'queued' ? '' : `${d} 12:01:00`,
    endTime: status === 'done' ? `${d} 12:04:00` : '',
    subs: buildSubs(id, status, d),
  };
}

/** 父任务（批次）列表：前 3 行对应原型（已完成/执行中/队列中），共 50 批 = 15 队列 + 20 执行中 + 15 完成；
    末尾追加个人商品库发布批次（pubFor），与关联发布任务抽屉同源 */
export const parentTasks = reactive<ParentTask[]>([
  { ...buildParent(1, 'done', '2026-04-04'), creator: '张三', createTime: '2026-04-04 12:00:00' },
  { ...buildParent(2, 'running', '2026-04-04'), creator: '张三', createTime: '2026-04-04 12:00:00' },
  { ...buildParent(3, 'queued', '2026-04-04'), creator: '张三', createTime: '2026-04-04 12:00:00' },
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

/* ---- 参照版（客户端 v1.0.3）任务详情种子：微信小店今日商品发布批次（执行失败 98 条，前 4 行对齐参照截图） ---- */
const wcProducts = [
  { name: '盒装100根数数棒数学小学一年级计算棒算术教具', thumb: taskThumb('#e8f4e6', '数'), linkId: '3840586443' },
  { name: '卡皮巴拉硅胶拍拍小夜灯充电款创意可爱玩具', thumb: taskThumb('#f6e7dc', '灯'), linkId: '2696075564' },
  { name: '家用高压水枪喷头卫浴手持花洒套装', thumb: taskThumb('#e6f0f6', '水'), linkId: '2696088794' },
  { name: '乒乓球批发100个三星级b训练球', thumb: taskThumb('#fdf3e0', '球'), linkId: '3842240765' },
  { name: '不锈钢保温杯大容量便携水杯定制logo', thumb: taskThumb('#eef0f6', '杯'), linkId: '3840112266' },
  { name: '儿童益智积木拼装玩具男孩女孩礼物', thumb: taskThumb('#f6ece8', '积'), linkId: '2696118823' },
];
const wcShopOf = (i: number) => ((i + 1) % 4 === 0 ? '真子名品' : '首力茹愕小店');

function buildWcParents(): ParentTask[] {
  const makerOf = ['陈葛豪', '张晋菘', '张晋菘', '陈葛豪', '张晋菘', '陈葛豪', '张晋菘', '陈葛豪'];
  const createOf = [wcTime(9, 30, 41), wcTime(9, 29, 45), wcTime(9, 28, 12), wcTime(9, 27, 36), wcTime(9, 26, 5), wcTime(9, 25, 48), wcTime(9, 24, 19), wcTime(9, 23, 52)];
  const groups: SubTask[][] = Array.from({ length: 8 }, () => []);
  const mk = (
    pi: number,
    taskId: string,
    prodIdx: number,
    status: SubStatus,
    start: string,
    end: string,
    reason: string,
    retried: boolean,
    shop: string,
    opts?: { failStep?: number; verify?: SubTask['verify']; shopStatus?: SubStatus; riskReason?: string },
  ): SubTask => {
    const p = wcProducts[prodIdx % wcProducts.length];
    return {
      id: groups[pi].length,
      taskId,
      templateNo: `V0913-${p2(pi + 1)}`,
      name: p.name,
      thumb: p.thumb,
      linkId: p.linkId,
      publisher: makerOf[pi],
      status,
      failStep: opts?.failStep,
      verify: opts?.verify,
      riskReason: opts?.riskReason,
      shops: [{ platform: '微信小店', shop, status: opts?.shopStatus ?? status, reason, retried, startTime: start, endTime: end }],
      startTime: start,
      endTime: end,
    };
  };
  /* 前 4 行：任务ID/店铺/创建人/执行起止时间逐一对齐参照截图 */
  groups[0].push(mk(0, '224460576923043006', 0, 'failed', wcTime(9, 30, 41), wcTime(9, 39, 43), '发品受限', false, '首力茹愕小店'));
  groups[1].push(mk(1, '224823860986230464', 1, 'failed', wcTime(9, 29, 45), wcTime(9, 38, 37), '价格异常', false, '首力茹愕小店'));
  groups[1].push(mk(1, '224823860986230380', 2, 'failed', wcTime(9, 29, 45), wcTime(9, 37, 57), '母链接同步失败', false, '首力茹愕小店'));
  groups[1].push(mk(1, '224823860986230280', 3, 'failed', wcTime(9, 29, 45), wcTime(9, 38, 0), '风控拦截', false, '真子名品'));
  /* 待确认样本：命中待确认商品，暂停在校验管控商品节点（操作列 通过/拒绝） */
  groups[0].push(mk(0, '224823860986230195', 4, 'confirm', '', '', '', false, '首力茹愕小店', { verify: { total: 4, pass: 0, fail: 0, pending: 1 }, shopStatus: 'queued', riskReason: RISK_CTRL_REASON }));
  groups[2].push(mk(2, '224823860986230171', 5, 'confirm', '', '', '', false, '真子名品', { verify: { total: 4, pass: 0, fail: 0, pending: 2 }, shopStatus: 'queued', riskReason: RISK_CTRL_REASON }));
  /* 其余样本：失败 94（合计 98）+ 完成 40 + 执行中 12 + 队列中 10，落入批次 3-8 */
  let i = 0;
  const plan: [SubStatus, number][] = [['failed', 94], ['success', 40], ['running', 12], ['queued', 10]];
  for (const [st, n] of plan) {
    for (let k = 0; k < n; k++, i++) {
      const pi = 2 + (i % 6);
      const start = st === 'queued' ? '' : wcTime(9, 20 + (i % 9), (i * 7) % 60);
      const end = st === 'failed' || st === 'success' ? wcTime(9, 30 + (i % 9), (i * 11) % 60) : '';
      /* 风险管控失败样本：校验管控商品节点失败（0/4 通过 1 失败），失败类型 风险管控 */
      const riskFail = st === 'failed' && i % 7 === 3;
      groups[pi].push(
        mk(
          pi,
          `2248238609862${String(30280 - (i + 1) * 4).padStart(5, '0')}`,
          i,
          st,
          start,
          end,
          riskFail ? '风险管控' : st === 'failed' ? failReasons[i % failReasons.length] : '',
          st === 'failed' && i % 5 === 0,
          wcShopOf(i),
          riskFail ? { failStep: 1, verify: { total: 4, pass: 0, fail: 1, pending: 0 }, riskReason: RISK_CTRL_REASON } : undefined,
        ),
      );
    }
  }
  return groups.map((subs, pi) => ({
    id: 100 + pi,
    creator: makerOf[pi],
    createTime: createOf[pi],
    type: '商品发布',
    status: (subs.some((s) => s.status === 'running') ? 'running' : subs.every((s) => s.status === 'queued') ? 'queued' : 'done') as ParentStatus,
    channel: '智能',
    pubWay: '蜂联发布',
    shops: subs.length,
    links: subs.length,
    success: subs.filter((s) => s.status === 'success').length,
    failed: subs.filter((s) => s.status === 'failed').length,
    running: subs.filter((s) => s.status === 'running').length,
    startTime: createOf[pi],
    endTime: subs.every((s) => s.status === 'success' || s.status === 'failed') ? wcTime(9, 40, 0) : '',
    subs,
  }));
}
parentTasks.unshift(...buildWcParents());

/** 风控二次确认-继续上架：待确认任务清风险态进入执行中，店铺集合开始发布，1.2s 后跑完同步批次聚合 */
export function confirmSub(sub: SubTask): void {
  if (sub.status !== 'confirm') return;
  const parent = parentTasks.find((p) => p.subs.includes(sub));
  sub.status = 'running';
  sub.riskReason = undefined;
  /* 通过：校验管控商品节点全部通过，任务进入下一步 */
  if (sub.verify) sub.verify = { ...sub.verify, pass: sub.verify.total, fail: 0, pending: 0 };
  sub.startTime = sub.startTime || nowStr();
  sub.shops.forEach((sh) => {
    sh.status = 'running';
    sh.startTime = sh.startTime || nowStr();
  });
  if (parent) parent.running += sub.shops.length;
  window.setTimeout(() => {
    sub.shops.forEach((sh) => {
      sh.status = 'success';
      sh.endTime = nowStr();
    });
    sub.status = taskStatusOf(sub);
    sub.endTime = nowStr();
    if (parent) {
      parent.running = Math.max(0, parent.running - sub.shops.length);
      parent.success += sub.shops.length;
    }
  }, 1200);
}

/** 待确认-拒绝发布：审核拒绝后校验管控商品节点失败，任务执行失败（失败类型 风险管控） */
export function rejectSub(sub: SubTask): void {
  if (sub.status !== 'confirm') return;
  const parent = parentTasks.find((p) => p.subs.includes(sub));
  const t = `${TC_TODAY} ${new Date().toTimeString().slice(0, 8)}`;
  sub.status = 'failed';
  sub.failStep = 1;
  sub.verify = { total: sub.verify?.total ?? 4, pass: sub.verify?.pass ?? 0, fail: Math.max(1, sub.verify?.fail ?? 0), pending: 0 };
  sub.riskReason = RISK_CTRL_REASON;
  sub.startTime = sub.startTime || t;
  sub.endTime = t;
  sub.shops.forEach((sh) => {
    sh.status = 'failed';
    sh.reason = '风险管控';
    sh.startTime = sh.startTime || t;
    sh.endTime = t;
  });
  if (parent) parent.failed += sub.shops.length;
}

/** 取消任务：待确认弹窗选「取消任务」（risk）或列表手动取消队列中/执行中任务（manual）；批次聚合不变（仅统计成功/失败/执行中） */
export function cancelSub(sub: SubTask, type: CancelType): void {
  if (sub.status !== 'confirm' && sub.status !== 'queued' && sub.status !== 'running') return;
  const parent = parentTasks.find((p) => p.subs.includes(sub));
  if (parent && sub.status === 'running') parent.running = Math.max(0, parent.running - sub.shops.filter((sh) => sh.status !== 'success').length);
  sub.status = 'cancelled';
  sub.cancelType = type;
  if (type === 'risk') sub.riskReason = sub.riskReason || RISK_JUNK_REASON;
  sub.endTime = nowStr();
  sub.shops.forEach((sh) => {
    if (sh.status !== 'success') {
      sh.status = 'queued';
      sh.startTime = '';
      sh.endTime = '';
    }
  });
}

/** 重试/重新发布：失败店铺（或未触达店铺）重跑→成功，并同步更新所属批次聚合（任务中心与关联发布任务抽屉联动） */
export function retrySub(sub: SubTask): void {
  if (sub.status !== 'failed') return;
  const parent = parentTasks.find((p) => p.subs.includes(sub));
  const n = Math.max(1, sub.shops.filter((sh) => sh.status === 'failed').length);
  sub.failStep = undefined;
  if (sub.verify) sub.verify = { ...sub.verify, pass: sub.verify.total, fail: 0, pending: 0 };
  sub.shops.forEach((sh) => {
    if (sh.status === 'failed' || sh.status === 'queued') {
      sh.status = 'running';
      sh.endTime = '';
      sh.startTime = sh.startTime || nowStr();
    }
  });
  sub.status = 'running';
  sub.endTime = '';
  if (parent) {
    parent.failed = Math.max(0, parent.failed - n);
    parent.running += n;
  }
  window.setTimeout(() => {
    sub.shops.forEach((sh) => {
      if (sh.status === 'running') {
        sh.status = 'success';
        sh.reason = '';
        sh.retried = true;
        sh.endTime = nowStr();
      }
    });
    sub.status = taskStatusOf(sub);
    sub.endTime = nowStr();
    if (parent) {
      parent.running = Math.max(0, parent.running - n);
      parent.success += n;
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
  /** 策略定义的上架方式：直接上架 / 放入仓库 */
  pubMethod: string;
  /** 策略定义的发布方式：蜂联发布 / 插件发布 */
  pubWay: string;
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
  { name: '13245', pubMethod: '放入仓库', pubWay: '插件发布', profitMode: '控利润率', profitRate: '1%', promote: '-', bidMode: '-', bidTarget: '-', roi: '-', budgetType: '-', dailyBudget: '-' },
  { name: '8801', pubMethod: '直接上架', pubWay: '蜂联发布', profitMode: '控利润率', profitRate: '5%', promote: '是', bidMode: '控投产比', bidTarget: '点击量', roi: '2.5', budgetType: '每日预算', dailyBudget: '100元' },
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

/* ================= 商机中心-竞价商品 静态数据 ================= */
/** 必报SKU 维度行：一个商品ID 下可含多个 SKU */
export interface BiddingSku {
  /** SKU名称 */
  sku: string;
  /** 是否必报SKU（名称后展示「必报」标签） */
  required?: boolean;
  /** 门槛价 */
  threshold: string;
  stock: '有货' | '缺货';
  /** 商品编码（标签样式展示） */
  code: string;
  /** 预估利润 */
  profit: string;
}
export interface BiddingRow {
  img: string;
  name: string;
  link: string;
  pid: string;
  /** 必报SKU 列表（展开子表展示） */
  skus: BiddingSku[];
  /** 导入时间 */
  imported: string;
  /** 商品抓取状态：待抓取行操作列仅「抓取」，已抓取行展示详情/添加到 */
  fetchStatus: '待抓取' | '已抓取';
  /** 竞价类型 */
  bidType: '基准竞价' | '排名竞价';
  /** 招募/活动起止时间：招募状态由当前时间对照推导，不存静态值 */
  recruitStart: string;
  recruitEnd: string;
  actStart: string;
  actEnd: string;
}
export const biddingRows: BiddingRow[] = [
  {
    img: svgThumb('#ffd9cf', '刀具'),
    name: '水果刀削皮刀便携倒钩苹果去皮神器家用拼多多功能款...',
    link: 'https://item.taobao.com/item.htm?id=2670779935129',
    pid: '2670779935129',
    skus: [
      { sku: '颜色:原色|规格:标准', required: true, threshold: '¥9.90', stock: '有货', code: 'DJ-2201', profit: '¥3.20' },
      { sku: '颜色:原色|规格:升级款', threshold: '¥12.90', stock: '有货', code: 'DJ-2202', profit: '¥4.10' },
    ],
    imported: '2026-08-13 18:24',
    fetchStatus: '已抓取',
    bidType: '基准竞价',
    recruitStart: '2026-09-05 00:00:00',
    recruitEnd: '2026-09-12 17:00:00',
    actStart: '2026-09-15 10:00:00',
    actEnd: '2026-09-25 03:00:00',
  },
  {
    img: svgThumb('#d9f4e7', '益智'),
    name: '益智魔块3d立体拼图3到6岁动物趣味恐龙模型儿童手工...',
    link: 'https://item.taobao.com/item.htm?id=26701928017129',
    pid: '26701928017129',
    skus: [
      { sku: '款式:随机|年龄:3-6岁', threshold: '¥15.50', stock: '缺货', code: 'WJ-035', profit: '¥5.80' },
      { sku: '款式:恐龙|年龄:3-6岁', required: true, threshold: '¥18.50', stock: '有货', code: 'WJ-036', profit: '¥6.80' },
    ],
    imported: '2026-08-13 18:24',
    fetchStatus: '待抓取',
    bidType: '排名竞价',
    recruitStart: '2026-09-15 00:00:00',
    recruitEnd: '2026-09-20 17:00:00',
    actStart: '2026-09-22 10:00:00',
    actEnd: '2026-09-30 23:59:59',
  },
  {
    img: svgThumb('#dfe8ff', '音响'),
    name: '迷你随身小烟炮音响驱动无线蓝牙便携式重低音抽绳全...',
    link: 'https://v.douyin.com/item.htm?id=3773095122930106470',
    pid: '3773095122930106470',
    skus: [
      { sku: '颜色:黑色', required: true, threshold: '¥22.00', stock: '有货', code: 'SM-118', profit: '¥8.40' },
      { sku: '颜色:白色', threshold: '¥22.00', stock: '有货', code: 'SM-119', profit: '¥8.40' },
    ],
    imported: '2026-08-12 09:41',
    fetchStatus: '已抓取',
    bidType: '基准竞价',
    recruitStart: '2026-09-07 00:00:00',
    recruitEnd: '2026-09-10 17:00:00',
    actStart: '2026-09-11 15:00:00',
    actEnd: '2026-09-25 03:00:00',
  },
  {
    img: svgThumb('#fff0c9', '挂钩'),
    name: '挂钩强力粘胶粘钩强承重免打孔门后墙壁透明勾塑...',
    link: 'https://mobile.yangkeduo.com/goods.html?goods_id=977051807853',
    pid: '977051807853',
    skus: [
      { sku: '规格:10只装', threshold: '¥6.80', stock: '有货', code: 'SY-042', profit: '¥2.10' },
      { sku: '规格:20只装', required: true, threshold: '¥12.80', stock: '有货', code: 'SY-043', profit: '¥3.60' },
    ],
    imported: '2026-08-11 16:05',
    fetchStatus: '已抓取',
    bidType: '基准竞价',
    recruitStart: '2026-08-20 00:00:00',
    recruitEnd: '2026-08-30 17:00:00',
    actStart: '2026-09-12 10:00:00',
    actEnd: '2026-09-22 23:59:59',
  },
  {
    img: svgThumb('#ffe1eb', '卡套'),
    name: '【6个装】证件防丢卡套卡套防窥身份证银行卡保护隐...',
    link: 'https://kwaishop.kuaishou.com/item.htm?id=25969737568832',
    pid: '25969737568832',
    skus: [
      { sku: '图案:混发', required: true, threshold: '¥4.50', stock: '缺货', code: 'KQ-006', profit: '¥1.60' },
    ],
    imported: '2026-08-10 11:32',
    fetchStatus: '待抓取',
    bidType: '排名竞价',
    recruitStart: '2026-07-15 00:00:00',
    recruitEnd: '2026-07-25 17:00:00',
    actStart: '2026-07-28 10:00:00',
    actEnd: '2026-08-15 23:59:59',
  },
  {
    img: svgThumb('#e6f0ff', '胶泥'),
    name: '密封胶泥空调孔填缝堵洞防虫防水家用耐高温下水道...',
    link: 'https://mobile.yangkeduo.com/goods.html?goods_id=981543753220',
    pid: '981543753220',
    skus: [
      { sku: '规格:10包装', required: true, threshold: '¥3.90', stock: '有货', code: 'JN-233', profit: '¥1.20' },
      { sku: '规格:20包装', threshold: '¥6.90', stock: '有货', code: 'JN-234', profit: '¥2.00' },
    ],
    imported: '2026-08-08 15:47',
    fetchStatus: '已抓取',
    bidType: '基准竞价',
    recruitStart: '2026-08-28 00:00:00',
    recruitEnd: '2026-09-06 17:00:00',
    actStart: '2026-09-10 15:00:00',
    actEnd: '2026-09-18 03:00:00',
  },
  {
    img: svgThumb('#e9e2ff', '面霜'),
    name: '保湿面霜补水滋润秋冬护肤乳液敏感肌可用男女通用...',
    link: 'https://item.tmall.com/item.htm?id=881543753221',
    pid: '881543753221',
    skus: [
      { sku: '容量:50g', required: true, threshold: '¥19.90', stock: '有货', code: 'MF-501', profit: '¥6.50' },
      { sku: '容量:30g', threshold: '¥12.90', stock: '有货', code: 'MF-502', profit: '¥4.20' },
    ],
    imported: '2026-08-07 10:12',
    fetchStatus: '已抓取',
    bidType: '基准竞价',
    recruitStart: '2026-08-25 00:00:00',
    recruitEnd: '2026-09-01 17:00:00',
    actStart: '2026-09-05 15:00:00',
    actEnd: '2026-09-20 03:00:00',
  },
];

/* =========================================================
   概览页：店铺池与发布受限情况（四类分组，店铺名与发布任务店铺池同源）
   ========================================================= */
/** 概览店铺池：发布任务店铺池按「平台+店铺」去重（与任务中心口径一致） */
export const ovShops: { platform: string; shop: string }[] = PLATFORM_SHOPS.flatMap((g) => g.shops.map((s) => ({ platform: g.platform, shop: s })));

/** 店铺发布受限分类：发品数量受限 / 类目受限 / 保证金不足 / 店铺异常 */
export type OvLimitKind = 'quota' | 'category' | 'deposit' | 'abnormal';
/** 受限类目：类目名 + 该类目各自的受限原因（同类目受限店多类目原因可能不一致） */
export interface OvLimitCat { name: string; note: string }
export interface OvLimitRow { platform: string; shop: string; note: string; cats?: OvLimitCat[]; time: string }
/** 分组标题与色档（橙=受限提醒 / 红=阻断类） */
export const OV_LIMIT_META: Record<OvLimitKind, { label: string; cls: string }> = {
  quota: { label: '发品数量受限', cls: 'warn' },
  category: { label: '类目受限', cls: 'warn' },
  deposit: { label: '保证金不足', cls: 'bad' },
  abnormal: { label: '店铺异常', cls: 'bad' },
};
export const ovLimits: Record<OvLimitKind, OvLimitRow[]> = {
  quota: [
    { platform: '淘宝', shop: '小二女装店', note: '今日发品额度 20/20 已用完，0 点重置', time: '09-09 09:40' },
    { platform: '拼多多', shop: '小二百货店', note: '今日发品额度 50/50 已用完，0 点重置', time: '09-09 08:15' },
    { platform: '抖音', shop: '小二小店', note: '本周新品 300/300，超平台新品上限', time: '09-08 16:47' },
  ],
  category: [
    { platform: '天猫', shop: '小二美妆专营店', note: '', cats: [{ name: '美妆个护', note: '平台类目资质审核未通过' }, { name: '香水', note: '香水类目需补充备案资质' }], time: '09-08 14:32' },
    { platform: '快手', shop: '小二特产店', note: '', cats: [{ name: '食品', note: '类目未开通，需补交资质' }], time: '09-07 10:18' },
    { platform: '淘宝', shop: '小二母婴店', note: '', cats: [{ name: '母婴', note: '类目发布权限到期' }, { name: '玩具', note: '玩具类目资质审核未通过' }], time: '09-06 09:26' },
  ],
  deposit: [
    { platform: '拼多多', shop: '小二生鲜店', note: '保证金缺口 ¥2,000，发品已冻结', time: '09-08 11:02' },
    { platform: '抖音', shop: '小二潮玩店', note: '类目保证金未缴纳（¥5,000）', time: '09-05 15:44' },
  ],
  abnormal: [
    { platform: '天猫', shop: '小二官方旗舰店', note: '店铺处罚期中，全店禁止发布', time: '09-07 20:31' },
    { platform: '快手', shop: '小二老铁店', note: '营业执照过期，店铺已冻结', time: '09-03 09:12' },
  ],
};

/** 概览·今日发布总览关键因子（当日口径；delta 为较昨日增幅 % / pp） */
export const OV_TODAY = {
  date: '09-09',
  pub: 128, pubDelta: 12,
  success: 118, rate: 92.2, rateDelta: 1.0,
  failed: 10, failedOpen: 6,
  limitShops: 10,
};
/** 概览·商品维度库存与动销快照（存量口径：不随时间查询变化；split 为卡头平台 chips 口径拆分，视频号/淘宝 为全部子集，逐行求和等于合计） */
export const OV_GOODS = {
  onSale: 1286, offShelf: 342, active: 894,
  split: {
    视频号: { onSale: 486, offShelf: 128, active: 352 },
    淘宝: { onSale: 800, offShelf: 214, active: 542 },
  },
};
/** 概览·近 30 日发布趋势（发品/成功 件数，末日=今日与 OV_TODAY 同源）；头部 16 天为扩展段，供近30天/自定义时间窗口切片 */
const OV_TREND_HEAD: { d: string; pub: number; success: number }[] = [
  { d: '08-11', pub: 78, success: 71 },
  { d: '08-12', pub: 84, success: 77 },
  { d: '08-13', pub: 90, success: 82 },
  { d: '08-14', pub: 76, success: 69 },
  { d: '08-15', pub: 88, success: 80 },
  { d: '08-16', pub: 95, success: 87 },
  { d: '08-17', pub: 82, success: 75 },
  { d: '08-18', pub: 87, success: 79 },
  { d: '08-19', pub: 92, success: 84 },
  { d: '08-20', pub: 79, success: 72 },
  { d: '08-21', pub: 96, success: 88 },
  { d: '08-22', pub: 85, success: 78 },
  { d: '08-23', pub: 99, success: 91 },
  { d: '08-24', pub: 83, success: 76 },
  { d: '08-25', pub: 94, success: 86 },
  { d: '08-26', pub: 89, success: 81 },
];
const OV_TREND_TAIL: { d: string; pub: number; success: number }[] = [
  { d: '08-27', pub: 86, success: 79 },
  { d: '08-28', pub: 91, success: 84 },
  { d: '08-29', pub: 98, success: 91 },
  { d: '08-30', pub: 81, success: 74 },
  { d: '08-31', pub: 93, success: 86 },
  { d: '09-01', pub: 102, success: 95 },
  { d: '09-02', pub: 88, success: 82 },
  { d: '09-03', pub: 96, success: 88 },
  { d: '09-04', pub: 104, success: 97 },
  { d: '09-05', pub: 88, success: 79 },
  { d: '09-06', pub: 112, success: 105 },
  { d: '09-07', pub: 90, success: 84 },
  { d: '09-08', pub: 114, success: 104 },
  { d: '09-09', pub: 128, success: 118 },
];
export const OV_TREND = [...OV_TREND_HEAD, ...OV_TREND_TAIL];
/** 扩展段逐日拆分：五平台固定占比、快手兜底余数，保证逐日合计与 OV_TREND 总口径对齐 */
const splitDay = (pub: number, success: number) => {
  const pt = Math.round(pub * 0.28);
  const pm = Math.round(pub * 0.23);
  const pp = Math.round(pub * 0.19);
  const pd = Math.round(pub * 0.16);
  const st = Math.round(success * 0.28);
  const sm = Math.round(success * 0.23);
  const sp = Math.round(success * 0.19);
  const sd = Math.round(success * 0.16);
  return {
    淘宝: { pub: pt, success: st },
    天猫: { pub: pm, success: sm },
    拼多多: { pub: pp, success: sp },
    抖音: { pub: pd, success: sd },
    快手: { pub: pub - pt - pm - pp - pd, success: success - st - sm - sp - sd },
  };
};
/** 概览·近 30 日发布趋势分平台拆分（尾段 14 日为逐日实录，头段 16 日由 splitDay 生成；五平台逐日合计与 OV_TREND 总口径对齐，供趋势图平台维度切换） */
const BY_PLAT_TAIL: Record<string, { pub: number; success: number }[]> = {
  淘宝: [{ pub: 24, success: 22 }, { pub: 25, success: 23 }, { pub: 27, success: 25 }, { pub: 23, success: 21 }, { pub: 26, success: 24 }, { pub: 28, success: 26 }, { pub: 25, success: 23 }, { pub: 26, success: 24 }, { pub: 28, success: 26 }, { pub: 24, success: 22 }, { pub: 30, success: 28 }, { pub: 25, success: 23 }, { pub: 31, success: 28 }, { pub: 34, success: 31 }],
  天猫: [{ pub: 20, success: 18 }, { pub: 21, success: 19 }, { pub: 23, success: 21 }, { pub: 19, success: 17 }, { pub: 22, success: 20 }, { pub: 24, success: 22 }, { pub: 21, success: 20 }, { pub: 22, success: 20 }, { pub: 24, success: 22 }, { pub: 20, success: 18 }, { pub: 26, success: 24 }, { pub: 21, success: 20 }, { pub: 26, success: 24 }, { pub: 29, success: 27 }],
  拼多多: [{ pub: 16, success: 15 }, { pub: 17, success: 16 }, { pub: 18, success: 17 }, { pub: 15, success: 14 }, { pub: 17, success: 16 }, { pub: 19, success: 18 }, { pub: 16, success: 15 }, { pub: 18, success: 16 }, { pub: 20, success: 19 }, { pub: 16, success: 14 }, { pub: 22, success: 21 }, { pub: 17, success: 16 }, { pub: 22, success: 20 }, { pub: 25, success: 23 }],
  抖音: [{ pub: 14, success: 13 }, { pub: 15, success: 14 }, { pub: 16, success: 15 }, { pub: 13, success: 12 }, { pub: 15, success: 14 }, { pub: 17, success: 16 }, { pub: 14, success: 13 }, { pub: 16, success: 15 }, { pub: 18, success: 17 }, { pub: 15, success: 13 }, { pub: 19, success: 18 }, { pub: 15, success: 14 }, { pub: 20, success: 18 }, { pub: 22, success: 20 }],
  快手: [{ pub: 12, success: 11 }, { pub: 13, success: 12 }, { pub: 14, success: 13 }, { pub: 11, success: 10 }, { pub: 13, success: 12 }, { pub: 14, success: 13 }, { pub: 12, success: 11 }, { pub: 14, success: 13 }, { pub: 14, success: 13 }, { pub: 13, success: 12 }, { pub: 15, success: 14 }, { pub: 12, success: 11 }, { pub: 15, success: 14 }, { pub: 18, success: 17 }],
};
export const OV_TREND_BY_PLAT: Record<string, { pub: number; success: number }[]> = Object.fromEntries(
  Object.keys(BY_PLAT_TAIL).map((p) => [
    p,
    [...OV_TREND_HEAD.map((x) => splitDay(x.pub, x.success)[p as keyof ReturnType<typeof splitDay>]), ...BY_PLAT_TAIL[p]],
  ]),
);
/** 概览·个人贡献榜（今日口径：全员展示不截断，按发布 ID 件数降序；合计与 OV_TODAY 同源对齐：ids=128=ok118+bad10；发品与任务同义仅留发布总数 ids；split 为平台维度拆分，视频号+淘宝逐行求和等于行合计） */
export interface OvMemberStat { ids: number; ok: number; bad: number }
export interface OvMemberRow { name: string; group: string; ids: number; ok: number; bad: number; split: Record<'视频号' | '淘宝', OvMemberStat> }
export const OV_MEMBER_RANK: OvMemberRow[] = [
  { name: '陈默', group: '运营A组', ids: 30, ok: 28, bad: 2, split: { 视频号: { ids: 12, ok: 11, bad: 1 }, 淘宝: { ids: 18, ok: 17, bad: 1 } } },
  { name: '林悦', group: '运营A组', ids: 24, ok: 22, bad: 2, split: { 视频号: { ids: 10, ok: 9, bad: 1 }, 淘宝: { ids: 14, ok: 13, bad: 1 } } },
  { name: '周舟', group: '运营B组', ids: 20, ok: 18, bad: 2, split: { 视频号: { ids: 8, ok: 7, bad: 1 }, 淘宝: { ids: 12, ok: 11, bad: 1 } } },
  { name: '吴桐', group: '运营B组', ids: 16, ok: 15, bad: 1, split: { 视频号: { ids: 6, ok: 6, bad: 0 }, 淘宝: { ids: 10, ok: 9, bad: 1 } } },
  { name: '郑楠', group: '选品组', ids: 12, ok: 11, bad: 1, split: { 视频号: { ids: 5, ok: 4, bad: 1 }, 淘宝: { ids: 7, ok: 7, bad: 0 } } },
  { name: '孙倩', group: '运营A组', ids: 8, ok: 6, bad: 2, split: { 视频号: { ids: 3, ok: 2, bad: 1 }, 淘宝: { ids: 5, ok: 4, bad: 1 } } },
  { name: '何静', group: '运营B组', ids: 6, ok: 6, bad: 0, split: { 视频号: { ids: 2, ok: 2, bad: 0 }, 淘宝: { ids: 4, ok: 4, bad: 0 } } },
  { name: '苏芮', group: '运营C组', ids: 4, ok: 4, bad: 0, split: { 视频号: { ids: 2, ok: 2, bad: 0 }, 淘宝: { ids: 2, ok: 2, bad: 0 } } },
  { name: '唐薇', group: '选品组', ids: 3, ok: 3, bad: 0, split: { 视频号: { ids: 1, ok: 1, bad: 0 }, 淘宝: { ids: 2, ok: 2, bad: 0 } } },
  { name: '罗成', group: '运营C组', ids: 3, ok: 3, bad: 0, split: { 视频号: { ids: 2, ok: 2, bad: 0 }, 淘宝: { ids: 1, ok: 1, bad: 0 } } },
  { name: '冯雪', group: '运营A组', ids: 2, ok: 2, bad: 0, split: { 视频号: { ids: 1, ok: 1, bad: 0 }, 淘宝: { ids: 1, ok: 1, bad: 0 } } },
];
/** 概览·店铺发布榜 TOP5（今日发品件数与成功率；platform 与店铺池口径一致） */
export const OV_SHOP_RANK: { shop: string; platform: string; pub: number; rate: number }[] = [
  { shop: '小二官方旗舰店', platform: '天猫', pub: 24, rate: 95.8 },
  { shop: '小二女装店', platform: '淘宝', pub: 21, rate: 90.5 },
  { shop: '小二美妆专营店', platform: '天猫', pub: 18, rate: 94.4 },
  { shop: '小二百货店', platform: '拼多多', pub: 16, rate: 87.5 },
  { shop: '小二母婴店', platform: '淘宝', pub: 13, rate: 92.3 },
];
