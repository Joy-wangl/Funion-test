/**
 * 蜜蜂插件 · 电商搬家：mock 数据与工具
 * 平台 logo 复用 public/logos；商品主图复用 public/products + SVG 占位图
 */
import { ref } from 'vue';

export interface BeeProduct {
  id: string;
  /** 商品名称 */
  title: string;
  /** 商品主图 */
  img: string;
  /** 商品链接 */
  link: string;
  /** 平台 */
  platform: string;
  /** 导入时间 */
  importTime: string;
  /** 完善状态：true=已完善 */
  complete: boolean;
}

export type ShopLogin = 'ok' | 'expired' | 'off';

export interface BeeShop {
  /** 店铺ID */
  id: string;
  /** 店铺名称 */
  name: string;
  platform: string;
  /** 账号名称 */
  account: string;
  /** 登录状态 */
  login: ShopLogin;
}

export const BEE_PLATFORMS = ['淘宝', '天猫', '拼多多', '抖音', '快手'];

export const BEE_PLATFORM_LOGO: Record<string, string> = {
  淘宝: '/logos/taobao.png',
  天猫: '/logos/tmall.png',
  拼多多: '/logos/pinduoduo.png',
  抖音: '/logos/douyin.png',
  快手: '/logos/kuaishou.png',
};

/* SVG 占位主图（与 ops-center 同款生成方式） */
export const thumb = (bg: string, text: string) =>
  "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%27http%3A//www.w3.org/2000/svg%27%20width%3D%2796%27%20height%3D%2796%27%20viewBox%3D%270%200%2096%2096%27%3E%3Crect%20width%3D%2796%27%20height%3D%2796%27%20rx%3D%2712%27%20fill%3D%27" +
  encodeURIComponent(bg).replace(/'/g, '%27') +
  '%27/%3E%3Ctext%20x%3D%2748%27%20y%3D%2754%27%20text-anchor%3D%27middle%27%20font-size%3D%2720%27%20font-family%3D%27Arial%27%20fill%3D%27white%27%20fill-opacity%3D%270.92%27%3E' +
  encodeURIComponent(text).replace(/'/g, '%27') +
  '%3C/text%3E%3C/svg%3E';

export const beeProducts: BeeProduct[] = [
  { id: 'p-1', title: '韩版珍珠发夹女气质简约发卡边夹刘海夹子头饰', img: '/products/hairpin.png', link: 'https://item.taobao.com/item.htm?id=72910031', platform: '淘宝', importTime: '2026-08-26 14:32', complete: true },
  { id: 'p-2', title: '烟酰胺焕亮精华液 30ml 补水保湿淡斑提亮肤色', img: '/products/serum.png', link: 'https://detail.tmall.com/item.htm?id=66120984', platform: '天猫', importTime: '2026-08-26 10:05', complete: true },
  { id: 'p-3', title: 'ins 风简约陶瓷马克杯带盖勺办公室情侣水杯', img: thumb('#7b8cff', '杯'), link: 'https://mobile.yangkeduo.com/goods.html?goods_id=391020', platform: '拼多多', importTime: '2026-08-25 18:47', complete: false },
  { id: 'p-4', title: '高腰垂感阔腿裤女秋季显瘦休闲直筒拖地长裤', img: thumb('#38b2ff', '裤'), link: 'https://haohuo.jinritemai.com/ecommerce/trade/detail/index.html?id=361102', platform: '抖音', importTime: '2026-08-25 09:21', complete: true },
  { id: 'p-5', title: '儿童积木玩具男女孩拼装益智力 1000 颗粒套装', img: thumb('#ffb443', '积'), link: 'https://k.kwaixiaodian.com/item/520031', platform: '快手', importTime: '2026-08-24 20:13', complete: false },
  { id: 'p-6', title: '防晒衣女夏季薄款防紫外线户外透气防晒服外套', img: thumb('#4fd0c0', '防'), link: 'https://item.taobao.com/item.htm?id=72910032', platform: '淘宝', importTime: '2026-08-24 15:40', complete: true },
  { id: 'p-7', title: '北欧简约台灯卧室床头灯温馨浪漫遥控小夜灯', img: thumb('#f7709b', '灯'), link: 'https://mobile.yangkeduo.com/goods.html?goods_id=391021', platform: '拼多多', importTime: '2026-08-23 11:26', complete: false },
  { id: 'p-8', title: '氨基酸洗面奶温和清洁毛孔控油洁面乳男女学生', img: '/products/main.png', link: 'https://detail.tmall.com/item.htm?id=66120985', platform: '天猫', importTime: '2026-08-22 17:58', complete: true },
  { id: 'p-9', title: '户外折叠椅便携式露营钓鱼凳美术生写生小马扎', img: thumb('#69c77e', '椅'), link: 'https://haohuo.jinritemai.com/ecommerce/trade/detail/index.html?id=361103', platform: '抖音', importTime: '2026-08-21 08:12', complete: false },
];

export const beeShops: BeeShop[] = [
  { id: '88231456', name: '小贝精选店', platform: '淘宝', account: 'bee_xiaobei', login: 'ok' },
  { id: '10023984', name: 'Funion 旗舰店', platform: '天猫', account: 'funion_flagship', login: 'ok' },
  { id: '55210098', name: '蜜蜂优选平价店', platform: '拼多多', account: 'bee_pdd01', login: 'expired' },
  { id: '77120345', name: '小贝直播间', platform: '抖音', account: 'bee_dy_live', login: 'off' },
  { id: '33980217', name: '蜜蜂好物馆', platform: '快手', account: 'bee_ks02', login: 'off' },
  /* 已登录店铺扩充：模拟多店铺场景，铺货弹窗需支持搜索/平台筛选/分组折叠 */
  { id: '61002384', name: '一点就到百货', platform: '淘宝', account: 'bee_ydd', login: 'ok' },
  { id: '61002385', name: '万品家居源头直供店', platform: '淘宝', account: 'bee_wpjj', login: 'ok' },
  { id: '61002386', name: '万福日用百货', platform: '淘宝', account: 'bee_wfry', login: 'ok' },
  { id: '61002387', name: '义乌用家家居直供店', platform: '淘宝', account: 'bee_ywyj', login: 'ok' },
  { id: '61002388', name: '云朵礼遇', platform: '淘宝', account: 'bee_ydlx', login: 'ok' },
  { id: '61002389', name: '优家日用百货店', platform: '淘宝', account: 'bee_yjry', login: 'ok' },
  { id: '61002390', name: 'Funion 自营专卖店', platform: '天猫', account: 'funion_zy', login: 'ok' },
  { id: '61002391', name: '蜜蜂家居旗舰店', platform: '天猫', account: 'bee_jjqj', login: 'ok' },
];

/* 铺货策略：按平台配置快速定价/发布方式/发货时效，各平台配置相互独立 */
export type ShipTime = 'today' | '24h' | '48h' | 'over48h';
export const SHIP_TIMES: { value: ShipTime; label: string }[] = [
  { value: 'today', label: '今日发' },
  { value: '24h', label: '24小时内发货' },
  { value: '48h', label: '48小时内发货' },
  { value: 'over48h', label: '大于48小时发货' },
];
export const shipTimeLabel = (v: ShipTime) => SHIP_TIMES.find((x) => x.value === v)?.label ?? v;

export interface BeeStrategy {
  id: string;
  name: string;
  /* 可用平台：一条策略可同时服务于多个平台 */
  platforms: string[];
  /* 定价方式：控利润率(%) / 控利润(元) */
  priceMode: 'rate' | 'profit';
  rate: number;
  profit: number;
  shipTime: ShipTime;
  itemType: 'new' | 'used';
  /* 创建人 / 创建时间（列表可排序） */
  creator: string;
  createTime: string;
}

export const beeStrategies: BeeStrategy[] = [
  { id: 'S-001', name: '淘宝标准快速定价', platforms: ['淘宝'], priceMode: 'rate', rate: 30, profit: 0, shipTime: '48h', itemType: 'new', creator: '蜜蜂用户', createTime: '2026-08-02 10:24' },
  { id: 'S-002', name: '天猫旗舰控利润', platforms: ['天猫'], priceMode: 'profit', rate: 0, profit: 25, shipTime: '24h', itemType: 'new', creator: '蜜蜂用户', createTime: '2026-08-11 15:40' },
  { id: 'S-003', name: '拼多多低价走量', platforms: ['拼多多', '抖音'], priceMode: 'rate', rate: 15, profit: 0, shipTime: 'today', itemType: 'new', creator: '蜜蜂用户', createTime: '2026-08-20 09:12' },
];

export const SHOP_LOGIN_META: Record<ShopLogin, { label: string; color: string }> = {
  ok: { label: '已登录', color: 'var(--color-success)' },
  expired: { label: '登录失效', color: 'var(--color-danger)' },
  off: { label: '未登录', color: 'var(--color-text-3)' },
};

/** 生成伪二维码矩阵（含三处定位角），seed 变化时图案刷新 */
export const qrMatrix = (seed: number, n = 25): boolean[][] => {
  let s = (seed >>> 0) || 1;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const m = Array.from({ length: n }, () => Array.from({ length: n }, () => rnd() > 0.52));
  const finder = (r: number, c: number) => {
    for (let i = -1; i < 8; i++) {
      for (let j = -1; j < 8; j++) {
        const rr = r + i; const cc = c + j;
        if (rr < 0 || cc < 0 || rr >= n || cc >= n) continue;
        const inBox = i >= 0 && i < 7 && j >= 0 && j < 7;
        const edge = inBox && (i === 0 || i === 6 || j === 0 || j === 6);
        const core = inBox && i >= 2 && i <= 4 && j >= 2 && j <= 4;
        m[rr][cc] = inBox ? edge || core : false;
      }
    }
  };
  finder(0, 0);
  finder(0, n - 7);
  finder(n - 7, 0);
  return m;
};

/* ───────────────── 任务管理：商品维度（1 商品 → N 店铺） ─────────────────
 * 沿用智能运营中心任务状态机（running → success / failed），
 * 但主表以商品为维度聚合，展开看该商品发布到各店铺的子任务数据。
 */
export type BeeSubStatus = 'running' | 'success' | 'failed';

export interface BeePubSub {
  id: string;
  shopName: string;
  platform: string;
  status: BeeSubStatus;
  /** 状态说明 / 失败原因 */
  msg: string;
  time: string;
}

export interface BeePubTask {
  id: string;
  title: string;
  img: string;
  /** 来源平台 */
  platform: string;
  createTime: string;
  subs: BeePubSub[];
}

export type BeePubStatus = 'running' | 'partial' | 'success' | 'failed';

export const PUB_STATUS_META: Record<BeePubStatus, { label: string; cls: string }> = {
  running: { label: '发布中', cls: 'run' },
  partial: { label: '部分成功', cls: 'part' },
  success: { label: '全部成功', cls: 'ok' },
  failed: { label: '全部失败', cls: 'fail' },
};

/* 聚合：一个商品在各店的发布进度与整体状态 */
export const pubTaskMeta = (t: BeePubTask) => {
  const total = t.subs.length;
  const ok = t.subs.filter((s) => s.status === 'success').length;
  const fail = t.subs.filter((s) => s.status === 'failed').length;
  const running = total - ok - fail;
  const status: BeePubStatus = running > 0 ? 'running' : fail === 0 ? 'success' : ok === 0 ? 'failed' : 'partial';
  return { total, ok, fail, running, status };
};

const mkSub = (id: string, shop: BeeShop, status: BeeSubStatus, msg: string, time: string): BeePubSub =>
  ({ id, shopName: shop.name, platform: shop.platform, status, msg, time });

export const beePubTasks = ref<BeePubTask[]>([
  {
    id: 'T-1004', title: beeProducts[0].title, img: beeProducts[0].img, platform: beeProducts[0].platform, createTime: '2026-08-27 09:32',
    subs: [
      mkSub('T-1004-1', beeShops[0], 'success', '发布成功', '2026-08-27 09:33'),
      mkSub('T-1004-2', beeShops[1], 'success', '发布成功', '2026-08-27 09:34'),
      mkSub('T-1004-3', beeShops[2], 'failed', '店铺登录失效，请重新登录后重试', '2026-08-27 09:33'),
    ],
  },
  {
    id: 'T-1003', title: beeProducts[1].title, img: beeProducts[1].img, platform: beeProducts[1].platform, createTime: '2026-08-26 16:20',
    subs: [
      mkSub('T-1003-1', beeShops[0], 'success', '发布成功', '2026-08-26 16:21'),
      mkSub('T-1003-2', beeShops[1], 'success', '发布成功', '2026-08-26 16:22'),
    ],
  },
  {
    id: 'T-1002', title: beeProducts[3].title, img: beeProducts[3].img, platform: beeProducts[3].platform, createTime: '2026-08-26 11:02',
    subs: [
      mkSub('T-1002-1', beeShops[3], 'failed', '店铺未登录，请先完成授权', '2026-08-26 11:03'),
      mkSub('T-1002-2', beeShops[4], 'failed', '店铺未登录，请先完成授权', '2026-08-26 11:03'),
    ],
  },
  {
    id: 'T-1001', title: beeProducts[7].title, img: beeProducts[7].img, platform: beeProducts[7].platform, createTime: '2026-08-25 15:44',
    subs: [mkSub('T-1001-1', beeShops[1], 'success', '发布成功', '2026-08-25 15:45')],
  },
]);

let pubSeq = 1005;
const fmtNow = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** 发起铺货任务：每个商品生成 1 个任务，各目标店铺 1 个子任务，模拟异步发布 */
export const createPubTasks = (items: { title: string; img: string; platform: string }[], shops: BeeShop[]) => {
  items.forEach((it) => {
    const id = `T-${pubSeq++}`;
    const subs = shops.map((s, i) => mkSub(`${id}-${i + 1}`, s, 'running', '发布中…', '-'));
    beePubTasks.value.unshift({ id, title: it.title, img: it.img, platform: it.platform, createTime: fmtNow(), subs });
    subs.forEach((s, i) => {
      setTimeout(() => { s.status = 'success'; s.msg = '发布成功'; s.time = fmtNow(); }, 1500 + i * 600);
    });
  });
};

/** 子任务重试 / 任务级重试失败店铺 */
export const retrySub = (s: BeePubSub) => {
  s.status = 'running'; s.msg = '重新发布中…'; s.time = '-';
  setTimeout(() => { s.status = 'success'; s.msg = '发布成功'; s.time = fmtNow(); }, 1500);
};
export const retryFailed = (t: BeePubTask) => t.subs.filter((s) => s.status === 'failed').forEach(retrySub);
