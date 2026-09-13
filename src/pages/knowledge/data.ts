/**
 * 知识库模块数据层：商品知识库（系列 → 编码 → 内部数据/商品知识）
 * 与业务层解耦：种子数据以 reactive 包裹（演示环境原地增删改需驱动 computed 重算），供列表卡片与详情抽屉展示
 * 维度约定：图片信息/商品视频/商品知识 均归属「商品编码」维度
 */
import { reactive } from 'vue';

export interface KbMedia {
  /** 图片/视频类型（商品图片/实物图片/商品视频 等） */
  label: string;
  src: string;
  /** 上传文件名（上传素材时记录，编辑态回显；种子素材无） */
  name?: string;
  /** 内容描述（一句话内容与发送时机描述，RAG 向量检索语料；新增/编辑必填） */
  desc: string;
  /** 命中场景（细分场景，快递咨询/商品破损 等结构化过滤面；选填多选，会话维度场景推断不依赖该字段） */
  scenes: string[];
}

/** 知识素材（支持上传：图片 / 视频 / 任意文件） */
export interface KbMaterial {
  /** 原始文件名 */
  name: string;
  /** 地址（演示环境为 objectURL 或内置资产） */
  url: string;
  /** 素材形态：图片缩略图 / 视频缩略 / 文件卡片 */
  kind: 'image' | 'video' | 'file';
}

/** 商品知识条目（供 AI 智能回复知识库）：内容 = 文字 + 素材 + 链接 */
export interface KbKnowledgeEntry {
  id: string;
  /** 知识类型（安装视频/注意事项/尺码选购 等） */
  type: string;
  /** 内容文字 */
  text: string;
  /** 知识素材（图片/视频/文件） */
  materials: KbMaterial[];
  /** 内容链接（可选） */
  link: string;
  /** 命中场景（细分场景，快递咨询/商品破损 等结构化过滤面；选填多选） */
  scenes: string[];
}

/** 新建知识可选类型：覆盖百货类目常见商品知识分类 */
export const KB_KNOWLEDGE_TYPES = ['安装视频', '使用方法', '注意事项', '尺码选购', '材质养护', '发货包装', '售后保障', '常见问答'];
/** 新增图片可选类型 */
export const KB_IMAGE_TYPES = ['商品图片', '实物图片', '外包装图', '白底图', '透明图', '场景图', '详情长图', '尺码表'];
/** 新增视频可选类型 */
export const KB_VIDEO_TYPES = ['商品视频', '穿戴视频', '安装视频', '详情视频', '质检视频'];
/** 商品安装/使用视频可选类型（独立素材组，与商品视频区分：安装/使用教程导向） */
export const KB_GUIDE_TYPES = ['安装视频', '使用视频'];
/** 命中场景树模型：场景类型（一级）+ 细分场景（二级）+ 二级子组（三级，如 售前›特殊要求›指定备注）；
 *  枚举以业务场景树为准（售前/售中/售后三型）；自建场景并入所建组行尾 */
export interface KbSceneSub {
  name: string;
  children: string[];
}
export type KbSceneEntry = string | KbSceneSub;
export interface KbSceneGroup {
  group: string;
  scenes: KbSceneEntry[];
}
export const KB_SCENE_GROUPS: KbSceneGroup[] = [
  { group: '售前', scenes: ['快递咨询', '包邮咨询', '发货时效', '发货地址', { name: '特殊要求', children: ['指定备注', '指定快递', '指定款式'] }, '预售规则', '优惠折扣', '支付方式', '咨询定制'] },
  { group: '售中', scenes: ['物流异常', '签收异常', '取消订单'] },
  { group: '售后', scenes: ['运费险咨询', '商品错漏发', '商品破损', '快递破损', '商品补寄', '退货物流查询', '好评返现', '催开票'] },
];

export interface KbCode {
  /** 商品编码（如 FEN-24） */
  code: string;
  /** 商品编码名称 */
  name: string;
  /** 基础信息（成本价/材质/测量尺寸/适用年龄） */
  base: { label: string; value: string }[];
  /** 图片信息 */
  images: KbMedia[];
  /** 商品视频 */
  videos: KbMedia[];
  /** 商品知识（AI 智能回复知识库，编码维度） */
  knowledge: KbKnowledgeEntry[];
}

/** 店铺商品状态（ID 维度）：圆点色与店铺商品状态口径一致 */
export type KbItemStatus = 'selling' | 'auditing' | 'off';
export const KB_ITEM_STATUS_META: Record<KbItemStatus, { label: string; dot: string }> = {
  selling: { label: '在售', dot: '#22c07b' },
  auditing: { label: '审核中', dot: '#4f7cff' },
  off: { label: '已下架', dot: '#b3bac6' },
};

/** 店铺商品（ID 维度）：一个 ID 内含多个商品编码，编码与系列同源实体（发布时选择归组） */
export interface KbItem {
  /** 店铺商品ID */
  id: string;
  /** 商品名称 */
  name: string;
  /** 商品主图 */
  img: string;
  /** 上架平台（官方图标展示） */
  platform: string;
  /** 上架店铺名 */
  shop: string;
  status: KbItemStatus;
  /** 售价 */
  price: string;
  /** ID 内商品编码（系列编码的引用） */
  codes: KbCode[];
}

export interface KbProduct {
  id: string;
  /** 系列编码名称 */
  name: string;
  /** 类目：[一级类目, 二级类目, 三级类目] */
  cat: [string, string, string];
  img: string;
  /** 关联ID数 */
  relIds: number;
  /** 上架店铺数 */
  shops: number;
  /** 退款率 */
  refundRate: string;
  /** 售价区间 */
  price: string;
  codes: KbCode[];
  /** 店铺商品（ID 维度）：系列行展开子列表 */
  items: KbItem[];
}

const SHOES = '/products/main.png';
const SERUM = '/products/serum.png';

const base = (cost: string, material: string, weight: string, len: string, width: string, height: string, age: string) => [
  { label: '成本价', value: cost },
  { label: '材质', value: material },
  { label: '测量重', value: weight },
  { label: '测量长', value: len },
  { label: '测量宽', value: width },
  { label: '测量高', value: height },
  { label: '适用年龄', value: age },
];

/* 种子素材内容描述与命中场景回填（描述含发送时机口径，场景取新枚举；检索链路与演示展示不空） */
const SEED_MEDIA_META: Record<string, { desc: string; scenes: string[] }> = {
  商品图片: { desc: '正面整体商品图，白底无道具无模特，客户咨询款式或定制时发送', scenes: ['咨询定制', '指定款式'] },
  实物图片: { desc: '实物手持细节图，自然光拍摄，客户签收质疑材质做工或反馈破损时发送', scenes: ['签收异常', '商品破损'] },
  外包装图: { desc: '外包装展开图，含规格参数与条码，客户反馈错漏发或快递破损时核对发送', scenes: ['商品错漏发', '快递破损'] },
  商品视频: { desc: '商品整体展示视频，环绕拍摄含使用演示，客户咨询使用方法或定制时发送', scenes: ['咨询定制'] },
};
const imgs = (src: string): KbMedia[] => ['商品图片', '实物图片', '外包装图'].map((label) => ({
  label, src, desc: SEED_MEDIA_META[label].desc, scenes: [...SEED_MEDIA_META[label].scenes],
}));

const videos = (src: string): KbMedia[] => [{ label: '商品视频', src, desc: SEED_MEDIA_META['商品视频'].desc, scenes: [...SEED_MEDIA_META['商品视频'].scenes] }];

let knSeq = 0;
/** 内置资产转图片素材（种子数据用） */
const mat = (url: string): KbMaterial => ({ name: url.split('/').pop() ?? '知识素材', url, kind: 'image' });
/* 种子知识命中场景回填（按类型映射新枚举，未命中类型为空） */
const SEED_KN_SCENES: Record<string, string[]> = {
  尺码选购: ['咨询定制', '指定款式'],
  注意事项: ['咨询定制'],
  材质养护: ['商品破损'],
  使用方法: ['咨询定制'],
  常见问答: ['咨询定制'],
  发货包装: ['指定备注', '咨询定制'],
  售后保障: ['运费险咨询', '商品补寄'],
  安装视频: ['咨询定制'],
};
const know = (type: string, text: string, materials: KbMaterial[] = [], link = ''): KbKnowledgeEntry =>
  ({ id: `KN${String(++knSeq).padStart(3, '0')}`, type, text, materials, link, scenes: [...(SEED_KN_SCENES[type] ?? [])] });

const kbSeed: Omit<KbProduct, 'items'>[] = [
  {
    id: 'K001',
    name: '儿童轻便运动鞋系列',
    cat: ['童鞋', '运动鞋', '轻便鞋'],
    img: SHOES,
    relIds: 298,
    shops: 298,
    refundRate: '30%',
    price: '15.00～25.00元',
    codes: [
      {
        code: 'FEN-24',
        name: '儿童轻便运动鞋·白',
        base: base('12.00元', '聚酯纤维', '12g', '8cm', '12cm', '24cm', '6岁'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('尺码选购', '本系列偏小半码，脚背偏高或脚型偏胖建议拍大一码；尺码段 26-32 码，可参考商品页尺码对照表。', [], 'https://example.com/size-chart'),
          know('注意事项', '新鞋初次穿着建议搭配棉袜磨合 1-2 天；鞋底胶水味属正常现象，通风处放置一晚即可消散。'),
        ],
      },
      {
        code: 'FEN-23',
        name: '儿童轻便运动鞋·黑',
        base: base('12.50元', '网布', '13g', '8cm', '12cm', '24cm', '7岁'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('材质养护', '鞋面为聚酯纤维网布，清水软刷清洁即可，避免机洗与暴晒；阴凉处晾干后存放。', [mat(SHOES)]),
        ],
      },
      {
        code: 'FEN-22',
        name: '儿童轻便运动鞋·蓝',
        base: base('12.50元', '聚酯纤维', '13g', '9cm', '12cm', '24cm', '8岁'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('尺码选购', '大童尺码段，测量数据以实物抽样为准；介于两码之间时选大一码。'),
        ],
      },
    ],
  },
  {
    id: 'K002',
    name: '女童云感休闲鞋系列',
    cat: ['童鞋', '休闲鞋', '云感鞋'],
    img: SHOES,
    relIds: 186,
    shops: 152,
    refundRate: '18%',
    price: '29.00～39.00元',
    codes: [
      {
        code: 'FEN-31',
        name: '女童云感休闲鞋·粉',
        base: base('18.00元', '超纤皮', '15g', '9cm', '13cm', '26cm', '5岁'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('尺码选购', '云感鞋底偏软，标准码即可；介于两码之间时选小码更跟脚。'),
          know('注意事项', '超纤皮鞋面忌酒精擦拭，污渍用湿布轻擦。', [mat(SHOES)]),
        ],
      },
      {
        code: 'FEN-30',
        name: '女童云感休闲鞋·米',
        base: base('18.00元', '超纤皮', '15g', '9cm', '13cm', '26cm', '6岁'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('材质养护', '米色配色易染色，避免与深色衣物混放；污渍用湿布轻擦，忌酒精擦拭。'),
        ],
      },
    ],
  },
  {
    id: 'K003',
    name: '情侣经典帆布鞋系列',
    cat: ['男女鞋', '帆布鞋', '经典款'],
    img: SHOES,
    relIds: 412,
    shops: 305,
    refundRate: '12%',
    price: '35.00～49.00元',
    codes: [
      {
        code: 'FEN-18',
        name: '情侣经典帆布鞋·白',
        base: base('22.00元', '帆布', '18g', '10cm', '14cm', '28cm', '成人'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('常见问答', 'Q：是否情侣同款？A：男女同款，35-44 码全码段。Q：是否防滑？A：橡胶大底日常防滑，雨天瓷砖面注意缓行。'),
          know('材质养护', '帆布鞋面可清水手洗，勿用洗衣粉浸泡超过 10 分钟；洗后塞纸团定型阴干。', [mat(SHOES)]),
        ],
      },
      {
        code: 'FEN-17',
        name: '情侣经典帆布鞋·黑',
        base: base('22.00元', '帆布', '18g', '10cm', '14cm', '28cm', '成人'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('发货包装', '默认牛皮纸盒＋防潮袋包装，整箱 20 双；支持定制礼盒包装，需提前报备客服。'),
        ],
      },
      {
        code: 'FEN-16',
        name: '情侣经典帆布鞋·灰',
        base: base('21.50元', '帆布', '17g', '10cm', '14cm', '28cm', '成人'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('注意事项', '季节性配色，售完不补；复购需求建议客服引导至 FEN-18 白色常销款。'),
        ],
      },
    ],
  },
  {
    id: 'K004',
    name: '儿童保湿面霜系列',
    cat: ['美妆个护', '面部护理', '面霜'],
    img: SERUM,
    relIds: 96,
    shops: 88,
    refundRate: '6%',
    price: '19.90～29.90元',
    codes: [
      {
        code: 'HUF-09',
        name: '儿童保湿面霜·50g',
        base: base('8.00元', '甘油/角鲨烷', '120g', '6cm', '6cm', '7cm', '3岁+'),
        images: imgs(SERUM),
        videos: videos(SERUM),
        knowledge: [
          know('使用方法', '洁面后取黄豆大小面霜点涂于两颊、额头、下巴，轻柔按摩至吸收；早晚各一次。', [mat(SERUM)]),
          know('注意事项', '首次使用建议在耳后或手腕内侧做敏感测试；如出现红痒立即停用并清水冲洗。'),
        ],
      },
      {
        code: 'HUF-08',
        name: '儿童保湿面霜·30g',
        base: base('6.00元', '甘油/角鲨烷', '80g', '5cm', '5cm', '6cm', '3岁+'),
        images: imgs(SERUM),
        videos: videos(SERUM),
        knowledge: [
          know('常见问答', 'Q：成人能否使用？A：配方温和，成人敏感肌亦可使用；完整成分表与备案信息见链接。', [], 'https://example.com/ingredients'),
        ],
      },
    ],
  },
  {
    id: 'K005',
    name: '男士清爽防晒精华系列',
    cat: ['美妆个护', '防晒', '防晒精华'],
    img: SERUM,
    relIds: 143,
    shops: 120,
    refundRate: '9%',
    price: '39.00～59.00元',
    codes: [
      {
        code: 'HUF-12',
        name: '男士清爽防晒精华·SPF50',
        base: base('16.00元', '化学防晒剂', '90g', '4cm', '4cm', '12cm', '成人'),
        images: imgs(SERUM),
        videos: videos(SERUM),
        knowledge: [
          know('使用方法', '出门前 15 分钟涂抹于面部及颈部，单次约 1 泵；长时间户外每 2-3 小时补涂一次。', [mat(SERUM)]),
          know('常见问答', 'Q：SPF50 与 SPF30 如何选？A：SPF50 款适合户外强光场景，SPF30 款适合日常通勤，详见链接说明。', [], 'https://example.com/spf-guide'),
        ],
      },
      {
        code: 'HUF-11',
        name: '男士清爽防晒精华·SPF30',
        base: base('14.00元', '化学防晒剂', '88g', '4cm', '4cm', '12cm', '成人'),
        images: imgs(SERUM),
        videos: videos(SERUM),
        knowledge: [
          know('注意事项', '本品含化学防晒剂，敏感肌慎用；避免接触眼周，如不慎入眼立即清水冲洗。'),
        ],
      },
    ],
  },
  {
    id: 'K006',
    name: '复古老爹鞋系列',
    cat: ['女鞋', '老爹鞋', '厚底鞋'],
    img: SHOES,
    relIds: 265,
    shops: 210,
    refundRate: '15%',
    price: '45.00～69.00元',
    codes: [
      {
        code: 'FEN-35',
        name: '复古老爹鞋·米灰',
        base: base('28.00元', '头层牛皮', '26g', '11cm', '15cm', '30cm', '成人'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('尺码选购', '老爹鞋楦型偏宽，标准码即可；脚型偏瘦建议加半码鞋垫。'),
          know('材质养护', '头层牛皮鞋面忌水洗，使用专用皮革护理膏每月保养一次。', [mat(SHOES)]),
        ],
      },
      {
        code: 'FEN-34',
        name: '复古老爹鞋·黑银',
        base: base('28.00元', '头层牛皮', '26g', '11cm', '15cm', '30cm', '成人'),
        images: imgs(SHOES),
        videos: videos(SHOES),
        knowledge: [
          know('安装视频', '鞋带快速穿法与厚底防滑演示视频，可供客服在售前咨询场景直接引用发送。', [], 'https://example.com/video-lacing'),
          know('注意事项', '反光条工艺，避免刮擦；夜拍素材需补光说明。'),
        ],
      },
    ],
  },
];

/* ---------- ID 维度种子：店铺商品按「发布时选择的商品编码」归组 ----------
   codes 自系列切片引用，两维度同源实体（编辑互通）；商品主图随系列 */
interface KbItemDef { id: string; name: string; platform: string; shop: string; status: KbItemStatus; price: string; at: number[] }
const KB_ITEM_DEFS: Record<string, KbItemDef[]> = {
  K001: [
    { id: '7261558803412', name: '儿童轻便运动鞋春秋网面透气休闲鞋白黑', platform: '淘宝', shop: 'AAA小店', status: 'selling', price: '19.90元', at: [0, 1] },
    { id: '7261558803458', name: '儿童轻便运动鞋大童网面蓝', platform: '拼多多', shop: '优品店', status: 'auditing', price: '22.00元', at: [2] },
  ],
  K002: [
    { id: '6688012345901', name: '女童云感休闲鞋软底公主鞋粉', platform: '天猫', shop: 'Funion旗舰店', status: 'selling', price: '35.00元', at: [0] },
    { id: '6688012345902', name: '女童云感休闲鞋百搭米', platform: '淘宝', shop: '心选店', status: 'off', price: '32.00元', at: [1] },
  ],
  K003: [
    { id: '5523098771204', name: '情侣经典帆布鞋男女同款四季白黑', platform: '淘宝', shop: 'AAA小店', status: 'selling', price: '42.00元', at: [0, 1] },
    { id: '5523098771288', name: '情侣经典帆布鞋季节款灰', platform: '拼多多', shop: '优品店', status: 'off', price: '39.00元', at: [2] },
  ],
  K004: [
    { id: '4410276650033', name: '儿童保湿面霜温和配方50g家庭装', platform: '天猫', shop: 'Funion旗舰店', status: 'selling', price: '26.90元', at: [0, 1] },
  ],
  K005: [
    { id: '3398745512076', name: '男士清爽防晒精华SPF50户外款', platform: '淘宝', shop: '心选店', status: 'selling', price: '52.00元', at: [0] },
    { id: '3398745512077', name: '男士清爽防晒精华SPF30通勤款', platform: '抖音', shop: 'Funion旗舰店', status: 'auditing', price: '45.00元', at: [1] },
  ],
  K006: [
    { id: '8871203344590', name: '复古老爹鞋厚底增高米灰', platform: '天猫', shop: 'Funion旗舰店', status: 'selling', price: '59.00元', at: [0] },
    { id: '8871203344591', name: '复古老爹鞋反光黑银', platform: '拼多多', shop: '优品店', status: 'off', price: '55.00元', at: [1] },
  ],
};
export const kbProducts = reactive<KbProduct[]>(kbSeed.map((p) => ({
  ...p,
  items: (KB_ITEM_DEFS[p.id] ?? []).map((d) => ({
    id: d.id, name: d.name, img: p.img, platform: d.platform, shop: d.shop, status: d.status, price: d.price,
    codes: d.at.map((i) => p.codes[i]),
  })),
})));
