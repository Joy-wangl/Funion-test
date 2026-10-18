/* ---------- 评价列表数据层（品控·线上·评价列表）：商品ID → SKU 两级聚合种子。
   沿用评价申诉原 6 条评价（首条 SKU 计数含原评价），其余按商品/SKU 确定性生成；
   评级含「挺好的」与「不够好」，差评带平台差评小类标签（品质/运营/快递三分，共 9 类） ---------- */
import { raReviews } from '../ops-center/reviewAppealData';
import type { Platform } from './data';
import { reviewSkuCodesOf } from './qcOnlineData';

export interface QcReview {
  id: string;
  shopName: string;
  shopId: string;
  platform: Platform;
  userName: string;
  /** 评价时间：MM/DD HH:mm（2026） */
  ratedAt: string;
  rating: '挺好的' | '不够好';
  /** 星级 1-5：好评 4-5 星，差评 1-2 星 */
  stars: number;
  types?: string[];
  content: string;
  images: string[];
  productTitle: string;
  productSku: string;
  productId: string;
  productThumb: string;
  /** 商品销量（商品维度演示值，各 SKU 销量均小于该值） */
  productSales: number;
  /** SKU 主图：按商品主图池错开轮转，与商品列主图不重复 */
  skuThumb: string;
  /** SKU 销量：按「商品ID-SKU名」哈希的确定性演示值 */
  skuSales: number;
  /** 评价 SKU 关联的商品编码（同店铺商品 SKU 表商品编码口径） */
  goodsCode: string;
  /** 评价 SKU 关联的系列编码（系列简称，一个 SKU 可关联多个系列） */
  seriesCodes: string[];
}

/* 确定性演示销量：商品 2000–19999，SKU 120–1979（口径同店铺商品抽屉 SKU 卡销量） */
const hashOf = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return h;
};
export const rvProductSales = (productId: string) => 2000 + (hashOf(productId) % 18000);
export const rvSkuSales = (productId: string, sku: string) => 120 + (hashOf(`${productId}-${sku}`) % 1860);
/** 商品 SKU 名称清单（种子口径，与评价行 productSku 同源）：供商品详情抽屉 SKU 导轨与默认选中 */
export const rvProductSkus = (productId: string): string[] => (RV_PRODUCTS.find((p) => p.id === productId)?.skus ?? []).map((s) => s.name);
/** 评价关联商品种子（标题/主图/平台/SKU）：供评价列表「详情」打开商品详情抽屉 */
export const rvProductOf = (productId: string): RvProductSeed | null => RV_PRODUCTS.find((p) => p.id === productId) ?? null;

/** 评价问题小类词表（平台差评标签口径）：按责任部门三分 —— 品质 / 运营 / 快递 */
export const RV_TYPES = [
  '质量差', '做工粗糙', '功能故障',
  '与宣传不符', '色差严重', '客服态度差',
  '发货慢', '物流破损', '少件漏发',
];

/** 差评涉及问题小类色板（点状标 + 标签底色 + 环形扇区同源） */
export const RV_TYPE_COLORS: Record<string, string> = {
  质量差: '#e5484d',
  做工粗糙: '#f76707',
  功能故障: '#d6336c',
  与宣传不符: '#f59f00',
  色差严重: '#9775fa',
  客服态度差: '#e64980',
  发货慢: '#4f7cff',
  物流破损: '#15aabf',
  少件漏发: '#12b886',
};

/** 评价问题 小类→大类 映射：默认展示大类占比，大类归属同数据概览 ONLINE_TYPE_COUNTS 八类口径 */
export const RV_BIG_TYPE: Record<string, string> = {
  质量差: '质量问题', 做工粗糙: '质量问题', 功能故障: '质量问题',
  与宣传不符: '描述/宣传不符', 色差严重: '描述/宣传不符',
  客服态度差: '服务类问题',
  发货慢: '物流问题', 物流破损: '物流问题',
  少件漏发: '少发',
};
/** 大类降序排列（按当前数据实际有命中的大类优先） */
export const RV_BIG_TYPES: string[] = ['质量问题', '描述/宣传不符', '物流问题', '服务类问题', '少发'];

/** 店铺ID 映射（种子店铺固定 ID，列表第一列展示） */
export const RV_SHOP_IDS: Record<string, string> = {
  '旗舰店 A': '66201',
  '旗舰店 B': '66312',
  '旗舰店 C': '66428',
  '旗舰店 D': '66539',
  '旗舰店 E': '66647',
};

const NAMES = ['别来无恙', '匿名', '印象@慢学', '黄二', '用户_9527', '小鹿乱撞', '清风徐来', '爱吃鱼的猫', '山茶', '蓝鲸', 'momo', '阿白'];
const GOOD_PHRASES = ['质量不错做工也细致', '和描述一致用着挺顺手', '发货快包装严实没磕碰', '客服回复及时处理也利落', '回购第二次了体验一直稳定', '做工扎实对得起价格', '颜色正没有色差', '大小合适家里人都说好'];
const BAD_PHRASES: Record<string, string[]> = {
  质量差: ['做工粗糙有瑕疵', '用了两次就坏了', '材质和图片差距很大'],
  做工粗糙: ['接缝处毛刺很多', '边角处理得很敷衍', '缝隙大合不严实'],
  功能故障: ['开机没反应用不了', '用几天就失灵了', '功能键按了没作用'],
  与宣传不符: ['实物和宣传图差距大', '描述的功能根本用不了', '尺寸和标注的不一样'],
  色差严重: ['颜色和图差太多了', '实物发灰一点都不正', '色差大到像两件货'],
  客服态度差: ['问半天不回消息', '客服态度很不耐烦', '催了几次都没人管'],
  发货慢: ['等了一周才发货', '物流太慢催了好几次', '迟迟不发货也不说明'],
  物流破损: ['到手箱子已经压烂', '运输途中磕出凹陷', '外包装破损里面也脏'],
  少件漏发: ['少了配件没发齐', '数量对不上少发一件', '赠品和零件都漏发了'],
};
const IMGS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];

interface RvSkuSeed { name: string; total: number; bad: number }
interface RvProductSeed {
  id: string; title: string; shop: string; platform: Platform; thumb: string;
  skus: RvSkuSeed[];
}

/* 各商品 SKU 计数：首个 SKU 的 total 含沿用原评价 1 条，生成时减 1 */
const RV_PRODUCTS: RvProductSeed[] = [
  { id: '401736', title: '防水防潮可套拉杆箱', shop: '旗舰店 A', platform: '淘宝', thumb: '/products/main.png',
    skus: [{ name: '紫色【中号40*17*36cm】', total: 10, bad: 1 }, { name: '黑色【大号45*22*40cm】', total: 9, bad: 1 }, { name: '蓝色【小号35*15*30cm】', total: 6, bad: 0 }] },
  { id: '225001', title: '紧致腰腹/平坦...', shop: '旗舰店 A', platform: '淘宝', thumb: '/products/serum.png',
    skus: [{ name: '木槿紫（100g）【直径25cm】', total: 12, bad: 1 }, { name: '薄荷绿（100g）【直径25cm】', total: 10, bad: 1 }] },
  { id: '330012', title: '至尊款【三档调节三重保护】送充电线', shop: '旗舰店 B', platform: '京东', thumb: '/products/hairpin.png',
    skus: [{ name: '至尊款【送标准充电线】', total: 12, bad: 1 }, { name: '至尊款【送快充线】', total: 10, bad: 1 }] },
  { id: '440088', title: '【多功能灶台架】通用型.旗舰品质：加厚材质（...', shop: '旗舰店 B', platform: '京东', thumb: '/products/main.png',
    skus: [{ name: '通用型【加厚材质】', total: 9, bad: 1 }, { name: '通用型【标准款】', total: 7, bad: 1 }] },
  { id: '550023', title: '便携式收纳盒', shop: '旗舰店 C', platform: '拼多多', thumb: '/products/serum.png',
    skus: [{ name: '灰色（大号）', total: 11, bad: 1 }, { name: '白色（中号）', total: 8, bad: 1 }, { name: '蓝色（小号）', total: 6, bad: 0 }] },
  { id: '660045', title: '家用置物架', shop: '旗舰店 C', platform: '拼多多', thumb: '/products/hairpin.png',
    skus: [{ name: '白色三层', total: 10, bad: 2 }, { name: '黑色五层', total: 7, bad: 0 }, { name: '原木色四层', total: 5, bad: 0 }] },
  { id: '770058', title: '折叠露营椅', shop: '旗舰店 D', platform: '抖音', thumb: '/products/main.png',
    skus: [{ name: '卡其色【标准款】', total: 12, bad: 1 }, { name: '军绿色【加宽款】', total: 9, bad: 1 }] },
  { id: '880061', title: '香薰加湿器', shop: '旗舰店 D', platform: '抖音', thumb: '/products/serum.png',
    skus: [{ name: '白色【300ml】', total: 10, bad: 1 }, { name: '粉色【500ml】', total: 9, bad: 1 }] },
  { id: '990077', title: '纯棉四件套', shop: '旗舰店 E', platform: '快手', thumb: '/products/hairpin.png',
    skus: [{ name: '灰色【1.5m床】', total: 14, bad: 1 }, { name: '蓝色【1.8m床】', total: 9, bad: 1 }, { name: '米色【2.0m床】', total: 8, bad: 0 }] },
  { id: '111088', title: '陶瓷马克杯', shop: '旗舰店 E', platform: '快手', thumb: '/products/main.png',
    skus: [{ name: '白色【350ml】', total: 9, bad: 1 }, { name: '黑色【350ml】', total: 6, bad: 1 }] },
];

const genReviews = (): QcReview[] => {
  const out: QcReview[] = [];
  let idx = 0;
  /* 差评小类按 badSeq 轮转，保证扩充后的全部小类都被覆盖（而非集中在前几类） */
  let badSeq = 0;
  const n = RV_TYPES.length;
  for (const p of RV_PRODUCTS) {
    let first = true;
    p.skus.forEach((s, si) => {
      /* 首个 SKU 计数含沿用原评价 1 条（rating 不够好 时 bad 亦含） */
      const extra = first ? s.total - 1 : s.total;
      const extraBad = first ? Math.max(0, s.bad - 1) : s.bad;
      const skuThumb = IMGS[(IMGS.indexOf(p.thumb) + si + 1) % IMGS.length];
      const skuCodes = reviewSkuCodesOf(p.id, si);
      for (let i = 0; i < extra; i++) {
        const bad = i < extraBad;
        const seq = idx++;
        const mm = seq % 5 === 0 ? '10' : '09';
        const dd = mm === '09'
          ? String(5 + ((seq * 3) % 24)).padStart(2, '0')
          : String(1 + ((seq * 2) % 8)).padStart(2, '0');
        const hh = String(9 + (seq % 12)).padStart(2, '0');
        const mi = String((seq * 7) % 60).padStart(2, '0');
        const t1 = RV_TYPES[bad ? badSeq % n : seq % n];
        const t2 = RV_TYPES[bad ? (badSeq + 1) % n : (seq + 1) % n];
        const types = bad ? (t1 === t2 ? [t1] : badSeq % 4 === 3 ? [t1, t2] : [t1]) : undefined;
        if (bad) badSeq++;
        out.push({
          id: `RL${String(seq + 1).padStart(3, '0')}`,
          shopName: p.shop,
          shopId: RV_SHOP_IDS[p.shop] ?? p.shop,
          platform: p.platform,
          userName: NAMES[seq % NAMES.length],
          ratedAt: `${mm}/${dd} ${hh}:${mi}`,
          rating: bad ? '不够好' : '挺好的',
          stars: bad ? 1 + (seq % 2) : 4 + (seq % 3 === 0 ? 1 : 0),
          ...(types ? { types } : {}),
          content: bad ? BAD_PHRASES[t1][seq % 3] : GOOD_PHRASES[seq % GOOD_PHRASES.length],
          images: seq % 3 === 1 ? [IMGS[seq % 3]] : [],
          productTitle: p.title,
          productSku: s.name,
          productId: p.id,
          productThumb: p.thumb,
          productSales: rvProductSales(p.id),
          skuThumb,
          skuSales: rvSkuSales(p.id, s.name),
          goodsCode: skuCodes.code,
          seriesCodes: skuCodes.series,
        });
      }
      first = false;
    });
  }
  return out;
};

/** 沿用原评价申诉 6 条（产品/SKU 与种子首 SKU 对应）+ 确定性生成的补充评价 */
export const qcReviews: QcReview[] = [
  ...raReviews.map((r) => {
    const seed = RV_PRODUCTS.find((p) => p.id === r.productId);
    const sku = r.productSku || seed?.skus[0]?.name || '默认规格';
    const thumb = r.productThumb || seed?.thumb || '';
    const skuCodes = reviewSkuCodesOf(r.productId, seed ? Math.max(0, seed.skus.findIndex((k) => k.name === sku)) : 0);
    return {
      id: r.id,
      shopName: r.shopName,
      shopId: RV_SHOP_IDS[r.shopName] ?? r.shopName,
      platform: r.platform,
      userName: r.userName,
      ratedAt: r.ratedAt,
      rating: r.rating,
      stars: r.rating === '挺好的' ? 5 : 1,
      ...(r.types?.length ? { types: [...r.types] } : {}),
      content: r.content,
      images: [...r.images],
      productTitle: r.productTitle,
      productSku: sku,
      productId: r.productId,
      productThumb: thumb,
      productSales: rvProductSales(r.productId),
      skuThumb: IMGS[(IMGS.indexOf(thumb) + 1) % IMGS.length],
      skuSales: rvSkuSales(r.productId, sku),
      goodsCode: skuCodes.code,
      seriesCodes: skuCodes.series,
    };
  }),
  ...genReviews(),
];
