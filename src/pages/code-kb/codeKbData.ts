/**
 * 编码知识库 Demo 种子数据（重构版）
 * 血缘方向：系列编码 → 关联商品ID → 商品ID 下的素材（主图/详情图/SKU图/白底图/视频）
 * 素材归属主体是「商品ID」；系列编码聚合其下所有商品的素材资产
 * 发布商品选择系列编码时，按「素材贡献销量」做 TOP10 推荐
 * 仅用于原型演示，不接入任何后端
 */

export type MaterialType = '主图' | '详情图' | 'SKU图' | '白底图' | '场景图' | '视频';
export const MATERIAL_TYPES: MaterialType[] = ['主图', '详情图', 'SKU图', '白底图', '场景图', '视频'];
export type MaterialStatus = '草稿' | '待审' | '生效' | '失效' | '违规';
export type CodeStatus = '生效' | '待审' | '停用' | '风险';

export interface CbSeries {
  id: string;              // 系列编码 e.g. XL-A100
  name: string;
  category: string;
  status: CodeStatus;
  tags: string[];
  owner: string;
  createdAt: string;
  riskNote?: string;
}

export interface CbProduct {
  id: string;              // 商品ID（店铺维度，一个商品详情发到多店铺会产生多个ID）
  spuId: string;           // 商品详情去重键：同一详情跨店铺发布共用同一 spuId
  name: string;
  seriesId: string;        // 归属系列编码
  shop: string;
  platform: '淘宝' | '视频号' | '京麦';
  status: '在售' | '下架' | '待审' | '违规预警';
  publishedAt: string;
  sales: number;           // 商品累计销量
  cover: string;
  riskNote?: string;
}

export interface CbMaterial {
  id: string;              // 素材ID
  name: string;
  type: MaterialType;
  productId: string;       // 归属商品ID
  version: string;
  uploader: string;
  uploadedAt: string;
  status: MaterialStatus;
  compliance: string[];
  sales: number;           // 该素材贡献销量（TOP10 推荐依据）
  thumb: string;
  riskNote?: string;
  versions: { version: string; uploader: string; uploadedAt: string; note: string }[];
}

const img = [
  '/materials/ec-01.webp', '/materials/ec-02.webp', '/materials/ec-03.webp', '/materials/ec-04.webp',
  '/materials/ec-05.webp', '/materials/ec-06.webp', '/materials/ec-07.webp', '/materials/ec-08.webp',
  '/materials/ec-09.webp', '/materials/ec-10.webp', '/materials/ec-11.webp', '/materials/ec-12.webp',
];

/* ---------- 系列编码 ---------- */
export const cbSeries: CbSeries[] = [
  { id: 'XL-A100', name: '韩系缎面抓夹系列', category: '饰品/发饰', status: '生效', tags: ['主推', '四季款'], owner: '王龙', createdAt: '2026-03-12' },
  { id: 'XL-B200', name: '玻尿酸保湿精华系列', category: '美妆/精华', status: '生效', tags: ['常销'], owner: '林悦', createdAt: '2025-11-04' },
  { id: 'XL-C300', name: '德系指甲修剪套装系列', category: '个护/修剪工具', status: '风险', tags: ['礼盒', '高风险'], owner: '陈默', createdAt: '2026-01-25', riskNote: '系列下存在违规详情图，命中平台合规规则' },
  { id: 'XL-D400', name: '便携榨汁杯系列', category: '小家电/厨房', status: '生效', tags: ['新品'], owner: '苏晓', createdAt: '2026-06-01' },
  { id: 'XL-E500', name: '纯棉床品四件套系列', category: '家纺/床品', status: '停用', tags: ['已归档'], owner: '周舟', createdAt: '2024-09-10' },
  { id: 'XL-F600', name: '秋冬保暖内衣系列', category: '服饰/内衣', status: '待审', tags: ['秋冬', '合规复核中'], owner: '李欣', createdAt: '2026-08-19' },
];

/* ---------- 商品ID（归属系列编码） ---------- */
export const cbProducts: CbProduct[] = [
  { id: 'TB-8801', spuId: 'SPU-A1', name: '韩系缎面抓夹·旗舰店主推', seriesId: 'XL-A100', shop: '悦己饰品旗舰店', platform: '淘宝', status: '在售', publishedAt: '2026-03-16 09:00', sales: 12800, cover: img[0] },
  { id: 'TB-8802', spuId: 'SPU-A1', name: '韩系缎面抓夹·奥莱店', seriesId: 'XL-A100', shop: '悦己奥莱店', platform: '淘宝', status: '在售', publishedAt: '2026-03-18 11:30', sales: 6400, cover: img[1] },
  { id: 'SP-9101', spuId: 'SPU-A2', name: '缎面抓夹·视频号小店', seriesId: 'XL-A100', shop: '悦己视频号小店', platform: '视频号', status: '在售', publishedAt: '2026-04-02 15:00', sales: 3200, cover: img[2] },

  { id: 'TB-7201', spuId: 'SPU-B1', name: '玻尿酸精华 30ml·旗舰', seriesId: 'XL-B200', shop: '颜研美妆旗舰店', platform: '淘宝', status: '在售', publishedAt: '2025-11-08 10:00', sales: 9800, cover: img[4] },
  { id: 'JM-6301', spuId: 'SPU-B1', name: '玻尿酸精华 30ml·京麦', seriesId: 'XL-B200', shop: '颜研京麦店', platform: '京麦', status: '在售', publishedAt: '2025-12-02 09:30', sales: 4100, cover: img[4] },
  { id: 'TB-7202', spuId: 'SPU-B2', name: '玻尿酸精华 50ml 大促装·预售', seriesId: 'XL-B200', shop: '颜研美妆旗舰店', platform: '淘宝', status: '待审', publishedAt: '2026-08-20 10:00', sales: 1500, cover: img[6] },

  { id: 'TB-5101', spuId: 'SPU-C1', name: '指甲剪 6 件套·礼盒装', seriesId: 'XL-C300', shop: '居家优选旗舰店', platform: '淘宝', status: '在售', publishedAt: '2026-02-01 09:00', sales: 7600, cover: img[7] },
  { id: 'SP-5201', spuId: 'SPU-C1', name: '指甲剪 6 件套·视频号', seriesId: 'XL-C300', shop: '居家视频号小店', platform: '视频号', status: '在售', publishedAt: '2026-02-15 15:30', sales: 2800, cover: img[8] },
  { id: 'TB-5102', spuId: 'SPU-C2', name: '指甲剪 12 件套·大促爆款', seriesId: 'XL-C300', shop: '居家优选旗舰店', platform: '淘宝', status: '违规预警', publishedAt: '2026-05-20 09:20', sales: 15200, cover: img[10], riskNote: '系列下素材 MT-510202 违规，商品被平台预警' },
  { id: 'JM-5301', spuId: 'SPU-C2', name: '指甲剪 12 件套·京麦', seriesId: 'XL-C300', shop: '居家京麦店', platform: '京麦', status: '在售', publishedAt: '2026-06-08 14:20', sales: 5200, cover: img[11] },

  { id: 'TB-3101', spuId: 'SPU-D1', name: '便携榨汁杯·旗舰', seriesId: 'XL-D400', shop: '轻厨小电旗舰店', platform: '淘宝', status: '在售', publishedAt: '2026-06-08 10:00', sales: 4300, cover: img[0] },

  { id: 'TB-2001', spuId: 'SPU-E1', name: '纯棉四件套（已归档）', seriesId: 'XL-E500', shop: '暖居家纺店', platform: '淘宝', status: '下架', publishedAt: '2024-10-01 09:00', sales: 900, cover: img[2] },

  { id: 'TB-6101', spuId: 'SPU-F1', name: '秋冬保暖内衣套装·预售', seriesId: 'XL-F600', shop: '暖居服饰旗舰店', platform: '淘宝', status: '待审', publishedAt: '2026-08-25 10:00', sales: 0, cover: img[3] },
];

/* ---------- 素材（归属商品ID） ---------- */
export const cbMaterials: CbMaterial[] = [
  /* TB-8801 */
  { id: 'MT-880101', name: '8801 主图·缎面质感', type: '主图', productId: 'TB-8801', version: 'v3', uploader: '王龙', uploadedAt: '2026-03-15 10:22', status: '生效', compliance: ['合规', '无水印'], sales: 8200, thumb: img[0], versions: [
    { version: 'v1', uploader: '王龙', uploadedAt: '2026-03-12 15:04', note: '首版·白底' },
    { version: 'v2', uploader: '李欣', uploadedAt: '2026-03-13 11:40', note: '换模特图' },
    { version: 'v3', uploader: '王龙', uploadedAt: '2026-03-15 10:22', note: '增加手持场景' },
  ] },
  { id: 'MT-880102', name: '8801 详情图·佩戴场景', type: '详情图', productId: 'TB-8801', version: 'v2', uploader: '李欣', uploadedAt: '2026-03-16 09:10', status: '生效', compliance: ['合规'], sales: 5100, thumb: img[1], versions: [{ version: 'v1', uploader: '李欣', uploadedAt: '2026-03-13 09:15', note: '首版' }, { version: 'v2', uploader: '李欣', uploadedAt: '2026-03-16 09:10', note: '补场景图' }] },
  { id: 'MT-880103', name: '8801 SKU图·色系全览', type: 'SKU图', productId: 'TB-8801', version: 'v1', uploader: '李欣', uploadedAt: '2026-03-13 09:15', status: '生效', compliance: ['合规'], sales: 3000, thumb: img[2], versions: [{ version: 'v1', uploader: '李欣', uploadedAt: '2026-03-13 09:15', note: '首版' }] },
  { id: 'MT-880104', name: '8801 白底图·单品', type: '白底图', productId: 'TB-8801', version: 'v1', uploader: '王龙', uploadedAt: '2026-03-12 15:30', status: '生效', compliance: ['合规'], sales: 2600, thumb: img[3], versions: [{ version: 'v1', uploader: '王龙', uploadedAt: '2026-03-12 15:30', note: '首版' }] },
  { id: 'MT-880105', name: '8801 视频·15s 场景', type: '视频', productId: 'TB-8801', version: 'v1', uploader: '张宁', uploadedAt: '2026-03-20 16:44', status: '生效', compliance: ['合规'], sales: 4300, thumb: img[4], versions: [{ version: 'v1', uploader: '张宁', uploadedAt: '2026-03-20 16:44', note: '首版' }] },
  /* TB-8802 */
  { id: 'MT-880201', name: '8802 主图·奥莱款', type: '主图', productId: 'TB-8802', version: 'v1', uploader: '王龙', uploadedAt: '2026-03-18 10:00', status: '生效', compliance: ['合规'], sales: 3800, thumb: img[5], versions: [{ version: 'v1', uploader: '王龙', uploadedAt: '2026-03-18 10:00', note: '首版' }] },
  { id: 'MT-880202', name: '8802 详情图·对比', type: '详情图', productId: 'TB-8802', version: 'v1', uploader: '李欣', uploadedAt: '2026-03-18 11:00', status: '生效', compliance: ['合规'], sales: 2100, thumb: img[6], versions: [{ version: 'v1', uploader: '李欣', uploadedAt: '2026-03-18 11:00', note: '首版' }] },
  { id: 'MT-880203', name: '8802 白底图', type: '白底图', productId: 'TB-8802', version: 'v1', uploader: '王龙', uploadedAt: '2026-03-18 10:20', status: '生效', compliance: ['合规'], sales: 1500, thumb: img[7], versions: [{ version: 'v1', uploader: '王龙', uploadedAt: '2026-03-18 10:20', note: '首版' }] },
  /* SP-9101 */
  { id: 'MT-910101', name: '9101 主图·视频号', type: '主图', productId: 'SP-9101', version: 'v1', uploader: '张宁', uploadedAt: '2026-04-02 14:00', status: '生效', compliance: ['合规'], sales: 2400, thumb: img[8], versions: [{ version: 'v1', uploader: '张宁', uploadedAt: '2026-04-02 14:00', note: '首版' }] },
  { id: 'MT-910102', name: '9101 视频·口播', type: '视频', productId: 'SP-9101', version: 'v1', uploader: '张宁', uploadedAt: '2026-04-02 15:20', status: '生效', compliance: ['合规'], sales: 1900, thumb: img[9], versions: [{ version: 'v1', uploader: '张宁', uploadedAt: '2026-04-02 15:20', note: '首版' }] },

  /* TB-7201 */
  { id: 'MT-720101', name: '7201 主图·实验室风', type: '主图', productId: 'TB-7201', version: 'v4', uploader: '林悦', uploadedAt: '2026-02-18 09:20', status: '生效', compliance: ['合规', '医械边界'], sales: 7600, thumb: img[4], versions: [{ version: 'v1', uploader: '林悦', uploadedAt: '2025-11-04 10:00', note: '首版' }, { version: 'v2', uploader: '林悦', uploadedAt: '2025-12-01 14:00', note: '换瓶身角度' }, { version: 'v3', uploader: '苏晓', uploadedAt: '2026-01-16 11:20', note: '去水印' }, { version: 'v4', uploader: '林悦', uploadedAt: '2026-02-18 09:20', note: '加实验室背景' }] },
  { id: 'MT-720102', name: '7201 详情图·成分讲解', type: '详情图', productId: 'TB-7201', version: 'v2', uploader: '苏晓', uploadedAt: '2026-01-20 16:10', status: '生效', compliance: ['合规'], sales: 4800, thumb: img[5], versions: [{ version: 'v1', uploader: '苏晓', uploadedAt: '2025-11-06 09:00', note: '首版' }, { version: 'v2', uploader: '苏晓', uploadedAt: '2026-01-20 16:10', note: '补充成分表' }] },
  { id: 'MT-720103', name: '7201 SKU图·规格', type: 'SKU图', productId: 'TB-7201', version: 'v1', uploader: '林悦', uploadedAt: '2025-11-04 10:30', status: '生效', compliance: ['合规'], sales: 2200, thumb: img[6], versions: [{ version: 'v1', uploader: '林悦', uploadedAt: '2025-11-04 10:30', note: '首版' }] },
  { id: 'MT-720104', name: '7201 白底图', type: '白底图', productId: 'TB-7201', version: 'v2', uploader: '苏晓', uploadedAt: '2026-01-16 11:30', status: '生效', compliance: ['合规'], sales: 1800, thumb: img[7], versions: [{ version: 'v1', uploader: '林悦', uploadedAt: '2025-11-04 10:40', note: '首版' }, { version: 'v2', uploader: '苏晓', uploadedAt: '2026-01-16 11:30', note: '去水印' }] },
  /* JM-6301 */
  { id: 'MT-630101', name: '6301 主图·京麦', type: '主图', productId: 'JM-6301', version: 'v1', uploader: '林悦', uploadedAt: '2025-12-02 09:00', status: '生效', compliance: ['合规'], sales: 2600, thumb: img[8], versions: [{ version: 'v1', uploader: '林悦', uploadedAt: '2025-12-02 09:00', note: '首版' }] },
  { id: 'MT-630102', name: '6301 详情图·京麦', type: '详情图', productId: 'JM-6301', version: 'v1', uploader: '苏晓', uploadedAt: '2025-12-02 09:30', status: '生效', compliance: ['合规'], sales: 1400, thumb: img[9], versions: [{ version: 'v1', uploader: '苏晓', uploadedAt: '2025-12-02 09:30', note: '首版' }] },
  /* TB-7202 (待审) */
  { id: 'MT-720201', name: '7202 主图·大促氛围', type: '主图', productId: 'TB-7202', version: 'v1', uploader: '林悦', uploadedAt: '2026-08-19 14:00', status: '待审', compliance: ['待复核'], sales: 600, thumb: img[10], versions: [{ version: 'v1', uploader: '林悦', uploadedAt: '2026-08-19 14:00', note: '首版·待审' }] },

  /* TB-5101 */
  { id: 'MT-510101', name: '5101 主图·礼盒开箱', type: '主图', productId: 'TB-5101', version: 'v2', uploader: '陈默', uploadedAt: '2026-01-28 10:40', status: '生效', compliance: ['合规'], sales: 5200, thumb: img[7], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-01-25 11:00', note: '首版' }, { version: 'v2', uploader: '陈默', uploadedAt: '2026-01-28 10:40', note: '换开箱图' }] },
  { id: 'MT-510102', name: '5101 详情图·开箱', type: '详情图', productId: 'TB-5101', version: 'v1', uploader: '陈默', uploadedAt: '2026-01-25 11:20', status: '生效', compliance: ['合规'], sales: 3100, thumb: img[8], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-01-25 11:20', note: '首版' }] },
  { id: 'MT-510103', name: '5101 视频·功能演示', type: '视频', productId: 'TB-5101', version: 'v1', uploader: '张宁', uploadedAt: '2026-02-04 15:10', status: '生效', compliance: ['合规'], sales: 2700, thumb: img[9], versions: [{ version: 'v1', uploader: '张宁', uploadedAt: '2026-02-04 15:10', note: '首版' }] },
  /* SP-5201 */
  { id: 'MT-520101', name: '5201 主图·视频号', type: '主图', productId: 'SP-5201', version: 'v1', uploader: '陈默', uploadedAt: '2026-02-15 15:00', status: '生效', compliance: ['合规'], sales: 1700, thumb: img[10], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-02-15 15:00', note: '首版' }] },
  /* TB-5102 (含违规素材) */
  { id: 'MT-510201', name: '5102 主图·全套平铺', type: '主图', productId: 'TB-5102', version: 'v1', uploader: '陈默', uploadedAt: '2026-05-16 09:20', status: '生效', compliance: ['合规'], sales: 9800, thumb: img[10], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-05-16 09:20', note: '首版' }] },
  { id: 'MT-510202', name: '5102 详情图·医疗级宣传（违规）', type: '详情图', productId: 'TB-5102', version: 'v2', uploader: '外包·小林', uploadedAt: '2026-06-11 14:32', status: '违规', compliance: ['夸大宣传', '医械边界'], sales: 8600, thumb: img[11], riskNote: '含"医疗级""治疗灰指甲"等违规词，已被平台抽检通报', versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-05-16 09:40', note: '首版' }, { version: 'v2', uploader: '外包·小林', uploadedAt: '2026-06-11 14:32', note: '违规版本·待替换' }] },
  { id: 'MT-510203', name: '5102 视频·演示', type: '视频', productId: 'TB-5102', version: 'v1', uploader: '张宁', uploadedAt: '2026-05-20 10:00', status: '生效', compliance: ['合规'], sales: 4200, thumb: img[0], versions: [{ version: 'v1', uploader: '张宁', uploadedAt: '2026-05-20 10:00', note: '首版' }] },
  { id: 'MT-510204', name: '5102 白底图', type: '白底图', productId: 'TB-5102', version: 'v1', uploader: '陈默', uploadedAt: '2026-05-16 10:00', status: '生效', compliance: ['合规'], sales: 3000, thumb: img[1], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-05-16 10:00', note: '首版' }] },
  /* JM-5301 */
  { id: 'MT-530101', name: '5301 主图·京麦', type: '主图', productId: 'JM-5301', version: 'v1', uploader: '陈默', uploadedAt: '2026-06-08 14:00', status: '生效', compliance: ['合规'], sales: 3300, thumb: img[2], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-06-08 14:00', note: '首版' }] },

  /* TB-3101 */
  { id: 'MT-310101', name: '3101 主图·便携场景', type: '主图', productId: 'TB-3101', version: 'v1', uploader: '苏晓', uploadedAt: '2026-06-01 11:00', status: '生效', compliance: ['合规'], sales: 2900, thumb: img[3], versions: [{ version: 'v1', uploader: '苏晓', uploadedAt: '2026-06-01 11:00', note: '首版' }] },
  { id: 'MT-310102', name: '3101 视频·榨汁演示', type: '视频', productId: 'TB-3101', version: 'v1', uploader: '张宁', uploadedAt: '2026-06-05 15:20', status: '生效', compliance: ['合规'], sales: 2100, thumb: img[4], versions: [{ version: 'v1', uploader: '张宁', uploadedAt: '2026-06-05 15:20', note: '首版' }] },

  /* TB-2001 (归档) */
  { id: 'MT-200101', name: '2001 主图·四件套陈列', type: '主图', productId: 'TB-2001', version: 'v1', uploader: '周舟', uploadedAt: '2024-09-10 10:00', status: '失效', compliance: ['已归档'], sales: 500, thumb: img[5], versions: [{ version: 'v1', uploader: '周舟', uploadedAt: '2024-09-10 10:00', note: '归档' }] },

  /* TB-6101 (草稿) */
  { id: 'MT-610101', name: '6101 主图·内衣', type: '主图', productId: 'TB-6101', version: 'v1', uploader: '李欣', uploadedAt: '2026-08-25 09:00', status: '草稿', compliance: ['待提交'], sales: 0, thumb: img[6], versions: [{ version: 'v1', uploader: '李欣', uploadedAt: '2026-08-25 09:00', note: '首版·草稿' }] },

  /* ---------- 场景图 + 补充素材（丰富各系列素材量，便于分页演示） ---------- */
  /* XL-A100 */
  { id: 'MT-880106', name: '8801 场景图·梳妆台', type: '场景图', productId: 'TB-8801', version: 'v1', uploader: '李欣', uploadedAt: '2026-03-17 10:00', status: '生效', compliance: ['合规'], sales: 3400, thumb: img[5], versions: [{ version: 'v1', uploader: '李欣', uploadedAt: '2026-03-17 10:00', note: '首版' }] },
  { id: 'MT-880107', name: '8801 详情图·尺寸说明', type: '详情图', productId: 'TB-8801', version: 'v1', uploader: '王龙', uploadedAt: '2026-03-17 11:00', status: '生效', compliance: ['合规'], sales: 2200, thumb: img[6], versions: [{ version: 'v1', uploader: '王龙', uploadedAt: '2026-03-17 11:00', note: '首版' }] },
  { id: 'MT-880204', name: '8802 场景图·奥莱陈列', type: '场景图', productId: 'TB-8802', version: 'v1', uploader: '王龙', uploadedAt: '2026-03-19 09:00', status: '生效', compliance: ['合规'], sales: 1600, thumb: img[7], versions: [{ version: 'v1', uploader: '王龙', uploadedAt: '2026-03-19 09:00', note: '首版' }] },
  /* XL-B200 */
  { id: 'MT-720105', name: '7201 场景图·浴室使用', type: '场景图', productId: 'TB-7201', version: 'v1', uploader: '苏晓', uploadedAt: '2026-01-22 10:00', status: '生效', compliance: ['合规'], sales: 2600, thumb: img[8], versions: [{ version: 'v1', uploader: '苏晓', uploadedAt: '2026-01-22 10:00', note: '首版' }] },
  { id: 'MT-720106', name: '7201 SKU图·容量对比', type: 'SKU图', productId: 'TB-7201', version: 'v1', uploader: '林悦', uploadedAt: '2026-01-23 10:00', status: '生效', compliance: ['合规'], sales: 1500, thumb: img[9], versions: [{ version: 'v1', uploader: '林悦', uploadedAt: '2026-01-23 10:00', note: '首版' }] },
  /* XL-C300（素材量最多，演示分页） */
  { id: 'MT-510104', name: '5101 场景图·礼盒开箱', type: '场景图', productId: 'TB-5101', version: 'v1', uploader: '陈默', uploadedAt: '2026-01-29 10:00', status: '生效', compliance: ['合规'], sales: 2400, thumb: img[9], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-01-29 10:00', note: '首版' }] },
  { id: 'MT-510105', name: '5101 白底图·单品', type: '白底图', productId: 'TB-5101', version: 'v1', uploader: '陈默', uploadedAt: '2026-01-26 10:00', status: '生效', compliance: ['合规'], sales: 1900, thumb: img[3], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-01-26 10:00', note: '首版' }] },
  { id: 'MT-520102', name: '5201 场景图·视频号', type: '场景图', productId: 'SP-5201', version: 'v1', uploader: '陈默', uploadedAt: '2026-02-16 10:00', status: '生效', compliance: ['合规'], sales: 1300, thumb: img[4], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-02-16 10:00', note: '首版' }] },
  { id: 'MT-520103', name: '5201 详情图·材质', type: '详情图', productId: 'SP-5201', version: 'v1', uploader: '陈默', uploadedAt: '2026-02-16 11:00', status: '生效', compliance: ['合规'], sales: 1100, thumb: img[5], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-02-16 11:00', note: '首版' }] },
  { id: 'MT-510205', name: '5102 场景图·家用', type: '场景图', productId: 'TB-5102', version: 'v1', uploader: '陈默', uploadedAt: '2026-05-18 10:00', status: '生效', compliance: ['合规'], sales: 3600, thumb: img[6], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-05-18 10:00', note: '首版' }] },
  { id: 'MT-510206', name: '5102 详情图·尺寸说明', type: '详情图', productId: 'TB-5102', version: 'v1', uploader: '陈默', uploadedAt: '2026-05-18 11:00', status: '生效', compliance: ['合规'], sales: 2900, thumb: img[7], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-05-18 11:00', note: '首版' }] },
  { id: 'MT-510207', name: '5102 SKU图·件数规格', type: 'SKU图', productId: 'TB-5102', version: 'v1', uploader: '陈默', uploadedAt: '2026-05-18 12:00', status: '生效', compliance: ['合规'], sales: 2100, thumb: img[8], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-05-18 12:00', note: '首版' }] },
  { id: 'MT-530102', name: '5301 场景图·京麦', type: '场景图', productId: 'JM-5301', version: 'v1', uploader: '陈默', uploadedAt: '2026-06-09 10:00', status: '生效', compliance: ['合规'], sales: 1500, thumb: img[9], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-06-09 10:00', note: '首版' }] },
  { id: 'MT-530103', name: '5301 详情图·京麦', type: '详情图', productId: 'JM-5301', version: 'v1', uploader: '陈默', uploadedAt: '2026-06-09 11:00', status: '生效', compliance: ['合规'], sales: 1200, thumb: img[10], versions: [{ version: 'v1', uploader: '陈默', uploadedAt: '2026-06-09 11:00', note: '首版' }] },
  /* XL-D400 */
  { id: 'MT-310103', name: '3101 场景图·户外', type: '场景图', productId: 'TB-3101', version: 'v1', uploader: '苏晓', uploadedAt: '2026-06-02 10:00', status: '生效', compliance: ['合规'], sales: 1800, thumb: img[11], versions: [{ version: 'v1', uploader: '苏晓', uploadedAt: '2026-06-02 10:00', note: '首版' }] },
];

/* ---------- 派生查询 ---------- */
export const cbSeriesMap: Record<string, CbSeries> = Object.fromEntries(cbSeries.map((c) => [c.id, c]));
export const cbProductMap: Record<string, CbProduct> = Object.fromEntries(cbProducts.map((p) => [p.id, p]));
export const cbMaterialMap: Record<string, CbMaterial> = Object.fromEntries(cbMaterials.map((m) => [m.id, m]));

export const productsOfSeries = (seriesId: string) => cbProducts.filter((p) => p.seriesId === seriesId);
export const materialsOfProduct = (productId: string) => cbMaterials.filter((m) => m.productId === productId);
/* 系列编码聚合素材：其下所有商品的素材 */
export const materialsOfSeries = (seriesId: string) =>
  productsOfSeries(seriesId).flatMap((p) => materialsOfProduct(p.id));

/** 发布推荐：系列编码下按素材贡献销量 TOP N（仅推荐「生效」素材） */
export const topMaterialsOfSeries = (seriesId: string, n = 10) =>
  materialsOfSeries(seriesId)
    .filter((m) => m.status === '生效')
    .sort((a, b) => b.sales - a.sales)
    .slice(0, n);

/** 关联ID原始数（店铺维度商品ID总数） */
export const rawIdCountOfSeries = (seriesId: string) => productsOfSeries(seriesId).length;

/** 关联ID去重数：同一商品详情(spuId)跨店铺发布只计一个 */
export const distinctIdCountOfSeries = (seriesId: string) =>
  new Set(productsOfSeries(seriesId).map((p) => p.spuId)).size;

/** 系列下按类型统计素材数（全量，含各状态） */
export const materialTypeCountsOfSeries = (seriesId: string): Record<MaterialType, number> => {
  const acc = Object.fromEntries(MATERIAL_TYPES.map((t) => [t, 0])) as Record<MaterialType, number>;
  materialsOfSeries(seriesId).forEach((m) => { acc[m.type] = (acc[m.type] || 0) + 1; });
  return acc;
};

/** 系列下素材总数 */
export const materialCountOfSeries = (seriesId: string) => materialsOfSeries(seriesId).length;

/** 按类型的销量 TOP N 推荐（仅「生效」素材） */
export const topMaterialsByType = (seriesId: string, type: MaterialType, n = 10) =>
  materialsOfSeries(seriesId)
    .filter((m) => m.status === '生效' && m.type === type)
    .sort((a, b) => b.sales - a.sales)
    .slice(0, n);

/** 某素材在其系列同类型 TOP10 中的名次（未入榜返回 -1） */
export const rankInType = (seriesId: string, type: MaterialType, materialId: string) =>
  topMaterialsByType(seriesId, type, 10).findIndex((m) => m.id === materialId) + 1;

/* 关系变更留痕（模拟日志） */
export interface CbLog {
  id: string;
  at: string;
  actor: string;
  action: '绑定' | '解绑' | '上传' | '状态变更';
  subject: string;
  target: string;
  note?: string;
}
export const cbLogs: CbLog[] = [
  { id: 'LOG-001', at: '2026-08-25 09:00', actor: '李欣', action: '上传', subject: 'MT-610101', target: 'TB-6101', note: '保暖内衣主图草稿' },
  { id: 'LOG-002', at: '2026-08-20 10:00', actor: '林悦', action: '绑定', subject: 'TB-7202', target: 'XL-B200', note: '大促装预售归入精华系列' },
  { id: 'LOG-003', at: '2026-06-11 14:32', actor: '外包·小林', action: '上传', subject: 'MT-510202', target: 'TB-5102', note: 'v2 违规版本（后续被通报）' },
  { id: 'LOG-004', at: '2026-06-08 14:20', actor: '陈默', action: '绑定', subject: 'JM-5301', target: 'XL-C300', note: '京麦店铺归入修剪套装系列' },
  { id: 'LOG-005', at: '2026-05-20 09:20', actor: '陈默', action: '绑定', subject: 'TB-5102', target: 'XL-C300', note: '大促爆款归入修剪套装系列' },
  { id: 'LOG-006', at: '2026-02-18 09:20', actor: '林悦', action: '上传', subject: 'MT-720101', target: 'TB-7201', note: '主图升级 v4' },
  { id: 'LOG-007', at: '2024-12-01 10:00', actor: '周舟', action: '状态变更', subject: 'XL-E500', target: '停用', note: '系列归档' },
];

/* ---------- 节点颜色规范 ---------- */
export const NODE_COLOR = { normal: '#4f7cff', warn: '#f0a020', off: '#a6adbc', risk: '#e5484d' };
export const seriesColor = (c: CbSeries) =>
  c.status === '风险' ? NODE_COLOR.risk : c.status === '待审' ? NODE_COLOR.warn : c.status === '停用' ? NODE_COLOR.off : NODE_COLOR.normal;
export const productColor = (p: CbProduct) =>
  p.status === '违规预警' ? NODE_COLOR.risk : p.status === '待审' ? NODE_COLOR.warn : p.status === '下架' ? NODE_COLOR.off : NODE_COLOR.normal;
export const materialColor = (m: CbMaterial) =>
  m.status === '违规' ? NODE_COLOR.risk : m.status === '待审' || m.status === '草稿' ? NODE_COLOR.warn : m.status === '失效' ? NODE_COLOR.off : NODE_COLOR.normal;

export const statusChipCls = (s: string) => {
  if (['违规', '风险', '违规预警'].includes(s)) return 'chip-risk';
  if (['待审', '草稿'].includes(s)) return 'chip-warn';
  if (['停用', '失效', '下架', '已归档'].includes(s)) return 'chip-off';
  return 'chip-ok';
};

export const materialTypeIcon = (t: MaterialType) => {
  switch (t) {
    case '主图': return '🖼';
    case '详情图': return '📄';
    case 'SKU图': return '🎨';
    case '白底图': return '⬜';
    case '场景图': return '🌄';
    case '视频': return '🎬';
  }
};

/* 销量格式化 */
export const fmtSales = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}w` : String(n));
