/** 店铺商品模块数据：列表行 + 状态元信息 + 详情素材 */

export type SgStatus = 'selling' | 'auditing' | 'auditFail' | 'offSystem' | 'offManual' | 'offDeposit' | 'offBrand' | 'offBan' | 'draft';

/** 下架类型（已下架 tab 下的筛选维度） */
export type SgOffType = '自主下架' | '平台下架' | '保证金违规下架' | '品牌到期下架' | '封禁下架' | '库存不足自动下架' | '长期无动销下架';
export const SG_OFF_TYPES: SgOffType[] = ['自主下架', '平台下架', '保证金违规下架', '品牌到期下架', '封禁下架', '库存不足自动下架', '长期无动销下架'];
/** 需展示失败原因标签的下架类型 */
export const SG_OFF_FAIL_TYPES: SgOffType[] = ['平台下架', '保证金违规下架', '封禁下架', '库存不足自动下架', '长期无动销下架'];
/** 已下架状态下方展示分组：手动下架 / 平台下架（含品牌到期·保证金违规·封禁）/ 风控自动下架（长期无动销·库存不足） */
export const SG_OFF_GROUP: Record<SgOffType, string> = {
  自主下架: '手动下架',
  平台下架: '平台下架',
  品牌到期下架: '平台下架',
  保证金违规下架: '平台下架',
  封禁下架: '平台下架',
  库存不足自动下架: '风控自动下架',
  长期无动销下架: '风控自动下架',
};
/** 下架类型筛选选项（三组） */
export const SG_OFF_GROUPS: string[] = ['手动下架', '平台下架', '风控自动下架'];
/** 下架原因级联选择结构：组 → 具体原因 */
export const SG_OFF_CASCADE: { name: string; children: SgOffType[] }[] = SG_OFF_GROUPS.map((g) => ({
  name: g,
  children: SG_OFF_TYPES.filter((t) => SG_OFF_GROUP[t] === g),
}));

/** 预警类型枚举（用户给定五种）：仅这五类下架有预警；手动下架/平台下架无预警 */
export const SG_WARN_TYPES: SgOffType[] = ['保证金违规下架', '品牌到期下架', '封禁下架', '库存不足自动下架', '长期无动销下架'];

/** 预警类型：命中五类预警取下架类型本身，其余（手动下架/平台下架）无预警 */
export function sgWarnType(p: Pick<SgProduct, 'offType'>): string | null {
  if (!p.offType) return null;
  return SG_WARN_TYPES.includes(p.offType) ? p.offType : null;
}

export interface SgProduct {
  id: string;
  title: string;
  img: string;
  linkId: string;
  /** 系列编码 */
  seriesCode: string;
  status: SgStatus;
  strategy: string;
  sales: string;
  reviews: string;
  /** 近30天销量 / 曝光 */
  sold30: string;
  exposure: string;
  publisher: string;
  store: string;
  storePlatform: string;
  source: string;
  /** 发布方式：蜂联 / 店铺发布 */
  publishMode?: '蜂联' | '店铺发布';
  version: string;
  operator: string;
  category: [string, string, string];
  publishTime: string;
  shelfTime?: string;
  submitTime?: string;
  offTime?: string;
  /** 下架类型（已下架行） */
  offType?: SgOffType;
  offReason?: string;
  rejectReason?: string;
  createTime?: string;
}

export const SG_STATUS_META: Record<SgStatus, { label: string; dot: string; color: string }> = {
  selling: { label: '销售中', dot: '#22c07b', color: '#3d4657' },
  auditing: { label: '审核中', dot: '#4f7cff', color: '#3d4657' },
  auditFail: { label: '销售中', dot: '#22c07b', color: '#3d4657' },
  offSystem: { label: '已下架', dot: '#b3bac6', color: '#3d4657' },
  offManual: { label: '已下架', dot: '#b3bac6', color: '#3d4657' },
  offDeposit: { label: '已下架', dot: '#b3bac6', color: '#3d4657' },
  offBrand: { label: '已下架', dot: '#b3bac6', color: '#3d4657' },
  offBan: { label: '已下架', dot: '#b3bac6', color: '#3d4657' },
  draft: { label: '草稿', dot: '#f6a54c', color: '#8a92a1' },
};

/** 列表行操作：按商品状态给出（店铺商品 / 运营管理操作列共用，保持同步） */
export function sgRowActions(status: SgStatus): string[] {
  switch (status) {
    case 'selling':
    case 'auditFail':
      return ['商品详情', '下架'];
    case 'auditing':
      return ['商品详情', '撤销审核'];
    case 'offSystem':
    case 'offManual':
    case 'offDeposit':
    case 'offBrand':
    case 'offBan':
      return ['商品详情', '立即上架'];
    case 'draft':
      return ['商品详情', '发布'];
  }
}

/** 下架状态 → 下架类型映射（列表行下架副标签用） */
const STATUS_OFF_TYPE: Partial<Record<SgStatus, SgOffType>> = {
  offSystem: '平台下架',
  offManual: '自主下架',
  offDeposit: '保证金违规下架',
  offBrand: '品牌到期下架',
  offBan: '封禁下架',
};
/** 按状态给出下架副标签（分组名 + 是否失败样式）；非下架状态返回 null */
export function sgOffTagOfStatus(s: SgStatus): { text: string; fail: boolean } | null {
  const t = STATUS_OFF_TYPE[s];
  return t ? { text: SG_OFF_GROUP[t], fail: SG_OFF_FAIL_TYPES.includes(t) } : null;
}

/** 状态 chip 分组：审核待处理=auditFail；已下架=offSystem+offManual */
export const SG_CHIPS: { key: string; label: string; match: (s: SgStatus) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'selling', label: '销售中', match: (s) => s === 'selling' },
  { key: 'auditing', label: '审核中', match: (s) => s === 'auditing' },
  { key: 'pending', label: '审核待处理', match: (s) => s === 'auditFail' },
  { key: 'off', label: '已下架', match: (s) => s === 'offSystem' || s === 'offManual' || s === 'offDeposit' || s === 'offBrand' || s === 'offBan' },
  { key: 'draft', label: '草稿箱', match: (s) => s === 'draft' },
];

const T_MAIN = '德国指甲剪刀套装全套耳勺指甲刀指甲钳修剪专用斜口指甲钳剪刀';
const T_SERUM = 'PERDORA 玻尿酸修护精华液 补水保湿舒缓敏感肌 30ml 装';

const addSeriesCode = (rows: Omit<SgProduct, 'seriesCode'>[]) => rows.map((r) => ({ ...r, seriesCode: `XL-${r.id.slice(-6)}` }));

const sgProductBase: Record<'视频号' | '淘宝', Omit<SgProduct, 'seriesCode'>[]> = {
  视频号: [
    {
      id: '8888777776666', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776666',
      status: 'selling', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736834', operator: '张三', category: ['美妆个护', '面部护理', '精华液'], publishMode: '店铺发布',
      publishTime: '2026-04-12 12:00:00', shelfTime: '2026-04-12 12:00:00',
    },
    {
      id: '8888777776667', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776667',
      status: 'auditing', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736835', operator: '张三', category: ['美妆个护', '面部护理', '精华液'], publishMode: '店铺发布',
      publishTime: '2026-08-14 09:30:00', submitTime: '2026-08-14 09:30:00',
    },
    {
      id: '8888777776668', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776668',
      status: 'auditFail', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736836', operator: '张三', category: ['美妆个护', '面部护理', '精华液'], publishMode: '蜂联',
      publishTime: '2026-04-12 12:00:00', shelfTime: '2026-04-12 12:00:00',
      rejectReason: '商品主图不符合规范：存在营销文案牛皮癣，请更换纯商品图后重新提交',
    },
    {
      id: '8888777776669', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776669',
      status: 'offSystem', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736837', operator: '李四', category: ['美妆个护', '面部护理', '精华液'], publishMode: '蜂联',
      publishTime: '2026-04-12 12:00:00', offTime: '2026-07-02 18:20:00',
      offType: '平台下架', offReason: '平台质检不合格，平台自动下架',
    },
    {
      id: '8888777776670', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776670',
      status: 'offManual', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736838', operator: '李四', category: ['美妆个护', '面部护理', '精华液'], publishMode: '店铺发布',
      publishTime: '2026-04-12 12:00:00', offTime: '2026-06-18 10:05:00',
      offType: '自主下架', offReason: '库存不足，人工手动下架',
    },
    {
      id: '8888777776674', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776674',
      status: 'offDeposit', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736842', operator: '李四', category: ['美妆个护', '面部护理', '精华液'], publishMode: '蜂联',
      publishTime: '2026-04-12 12:00:00', offTime: '2026-07-30 11:00:00',
      offType: '保证金违规下架', offReason: '保证金余额不足且存在违规记录，平台强制下架',
    },
    {
      id: '8888777776675', title: T_MAIN, img: '/products/main.png', linkId: '8888777776675',
      status: 'offBrand', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '链接商品库',
      version: '7887998736843', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'], publishMode: '蜂联',
      publishTime: '2026-03-02 10:00:00', offTime: '2026-08-01 09:00:00',
      offType: '品牌到期下架', offReason: '品牌授权到期，商品自动下架',
    },
    {
      id: '8888777776676', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776676',
      status: 'offBan', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736844', operator: '李四', category: ['美妆个护', '面部护理', '精华液'], publishMode: '店铺发布',
      publishTime: '2026-04-12 12:00:00', offTime: '2026-08-05 16:30:00',
      offType: '封禁下架', offReason: '店铺涉嫌售假被平台封禁，商品强制下架',
    },
    {
      id: '8888777776677', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776677',
      status: 'offSystem', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736845', operator: '李四', category: ['美妆个护', '面部护理', '精华液'], publishMode: '蜂联',
      publishTime: '2026-04-12 12:00:00', offTime: '2026-08-10 09:40:00',
      offType: '库存不足自动下架', offReason: '系列编码可用库存为 0，已自动下架',
    },
    {
      id: '8888777776678', title: T_MAIN, img: '/products/main.png', linkId: '8888777776678',
      status: 'offSystem', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '内部商机',
      version: '7887998736846', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'], publishMode: '蜂联',
      publishTime: '2026-03-02 10:00:00', offTime: '2026-08-12 10:20:00',
      offType: '长期无动销下架', offReason: '商品20天内无动销，已自动下架',
    },
    {
      id: '8888777776671', title: T_MAIN, img: '/products/main.png', linkId: '8888777776671',
      status: 'selling', strategy: '默认发布策略', sales: '1,286', reviews: '342', sold30: '126', exposure: '5,602',
      publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '内部商机',
      version: '7887998736839', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'], publishMode: '蜂联',
      publishTime: '2026-03-02 10:00:00', shelfTime: '2026-03-02 10:00:00',
    },
    {
      id: '8888777776672', title: T_MAIN, img: '/products/main.png', linkId: '8888777776672',
      status: 'draft', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '链接商品库',
      version: '7887998736840', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'], publishMode: '店铺发布',
      publishTime: '-', createTime: '2026-08-10 15:20:00',
    },
    {
      id: '8888777776673', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776673',
      status: 'selling', strategy: '高利润策略', sales: '866', reviews: '120', sold30: '98', exposure: '3,208',
      publisher: '李四', store: '拼多多优品店', storePlatform: '拼多多', source: '市场商机',
      version: '7887998736841', operator: '李四', category: ['美妆个护', '面部护理', '精华液'], publishMode: '蜂联',
      publishTime: '2026-05-20 08:00:00', shelfTime: '2026-05-20 08:00:00',
    },
  ],
  淘宝: [
    {
      id: '9911223344551', title: T_MAIN, img: '/products/main.png', linkId: '9911223344551',
      status: 'selling', strategy: '默认发布策略', sales: '2,050', reviews: '518', sold30: '210', exposure: '8,431',
      publisher: '自己', store: '淘宝心选店', storePlatform: '淘宝', source: '内部商机',
      version: '7887998736851', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '2026-02-11 09:00:00', shelfTime: '2026-02-11 09:00:00',
    },
    {
      id: '9911223344552', title: T_SERUM, img: '/products/serum.png', linkId: '9911223344552',
      status: 'auditing', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '链接商品库',
      version: '7887998736852', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-08-13 16:40:00', submitTime: '2026-08-13 16:40:00',
    },
    {
      id: '9911223344553', title: T_SERUM, img: '/products/serum.png', linkId: '9911223344553',
      status: 'offManual', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: '拼多多优品店', storePlatform: '拼多多', source: '市场商机',
      version: '7887998736853', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-03-30 12:00:00', offTime: '2026-07-22 14:00:00',
      offType: '自主下架', offReason: '活动结束，人工手动下架',
    },
    {
      id: '9911223344554', title: T_MAIN, img: '/products/main.png', linkId: '9911223344554',
      status: 'draft', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: '淘宝心选店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736854', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '-', createTime: '2026-08-08 11:12:00',
    },
  ],
};

export type SgTab = '视频号' | '淘宝' | '京喜' | '得物' | '京麦';
/* 京喜/得物 内容与视频号保持一致；京麦为京东 POP 平台独立数据 */
export const sgProducts: Record<SgTab, SgProduct[]> = {
  视频号: addSeriesCode(sgProductBase.视频号),
  淘宝: addSeriesCode(sgProductBase.淘宝),
  京喜: addSeriesCode(sgProductBase.视频号),
  得物: addSeriesCode(sgProductBase.视频号),
  京麦: addSeriesCode([
    {
      id: '100012345678', title: T_MAIN, img: '/products/main.png', linkId: '100012345678',
      status: 'selling', strategy: '默认发布策略', sales: '1,866', reviews: '426', sold30: '186', exposure: '7,208',
      publisher: '自己', store: '京东Funion旗舰店', storePlatform: '京麦', source: '内部商机',
      version: '7887998736861', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '2026-03-12 10:00:00', shelfTime: '2026-03-12 10:00:00',
    },
    {
      id: '100012345679', title: T_SERUM, img: '/products/serum.png', linkId: '100012345679',
      status: 'auditing', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: '京东Funion旗舰店', storePlatform: '京麦', source: '链接商品库',
      version: '7887998736862', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-08-16 09:30:00', submitTime: '2026-08-16 09:30:00',
    },
    {
      id: '100012345680', title: T_SERUM, img: '/products/serum.png', linkId: '100012345680',
      status: 'auditFail', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '李四', store: '京东Funion旗舰店', storePlatform: '京麦', source: '链接商品库',
      version: '7887998736863', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-05-12 12:00:00', shelfTime: '2026-05-12 12:00:00',
      rejectReason: '主图存在营销文案牛皮癣，不符合京东商品发布规范，请更换纯商品图后重新提交',
    },
    {
      id: '100012345681', title: T_MAIN, img: '/products/main.png', linkId: '100012345681',
      status: 'offManual', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: '京东Funion旗舰店', storePlatform: '京麦', source: '内部商机',
      version: '7887998736864', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '2026-02-20 12:00:00', offTime: '2026-07-18 10:05:00',
      offType: '自主下架', offReason: '库存不足，人工手动下架',
    },
    {
      id: '100012345682', title: T_SERUM, img: '/products/serum.png', linkId: '100012345682',
      status: 'draft', strategy: '未关联', sales: '-', reviews: '-', sold30: '0', exposure: '0',
      publisher: '自己', store: '京东Funion旗舰店', storePlatform: '京麦', source: '链接商品库',
      version: '7887998736865', operator: '张三', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '-', createTime: '2026-08-11 15:20:00',
    },
  ]),
};

/** 详情静态素材（规格/SKU/图集）；SKU = 颜色分类 × 规格 笛卡尔积，名称为两维规格组合（同淘宝发布页规格信息） */
export const sgDetail = {
  colors: ['黑色', '白色'],
  styles: ['a款', 'b款'],
  skus: [
    { color: '黑色', style: 'a款', name: '黑色 a款', code: 'JSZJDAO-001' },
    { color: '黑色', style: 'b款', name: '黑色 b款', code: 'JSZJDAO-002' },
    { color: '白色', style: 'a款', name: '白色 a款', code: 'JSZJDAO-003' },
    { color: '白色', style: 'b款', name: '白色 b款', code: 'JSZJDAO-004' },
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

/** 京麦（京东 POP）详情静态素材：字段映射京麦开放平台 SP-API 商品接口
 *  主图=material.mainImages；长图=rectangleImages；透明图=transparentImages；白底图=whiteBackGroundImages；
 *  场景图=SKU素材 sku-materials；详情图=productDetailDesc.desc(PC)/mobileDesc(APP)；SKU=skuList */
export const sgJmDetail = {
  productId: '100012345678',
  itemNum: 'JM-2201',
  brand: 'Funion',
  colType: 'SOP',
  saleAttrs: [
    { name: '颜色', values: ['黑色', '白色'] },
    { name: '规格', values: ['标准款', '升级款'] },
  ],
  skus: [
    { name: '黑色 标准款', attrs: '颜色:黑色 规格:标准款', jdPrice: '39.90', marketPrice: '59.90', stock: '120', outerId: 'JM-2201-B', upc: '6901234567890', status: '上架' },
    { name: '黑色 升级款', attrs: '颜色:黑色 规格:升级款', jdPrice: '49.90', marketPrice: '69.90', stock: '86', outerId: 'JM-2201-S', upc: '6901234567891', status: '上架' },
    { name: '白色 标准款', attrs: '颜色:白色 规格:标准款', jdPrice: '39.90', marketPrice: '59.90', stock: '0', outerId: 'JM-2202-B', upc: '6901234567892', status: '下架' },
    { name: '白色 升级款', attrs: '颜色:白色 规格:升级款', jdPrice: '49.90', marketPrice: '69.90', stock: '64', outerId: 'JM-2202-S', upc: '6901234567893', status: '上架' },
  ],
  mainImgs: ['/products/main.png', '/products/serum.png', '/products/main.png', '/products/serum.png'],
  rectImgs: ['/products/serum.png', '/products/main.png'],
  detailPc: ['/products/main.png', '/products/serum.png', '/products/main.png', '/products/serum.png'],
  detailApp: ['/products/serum.png', '/products/main.png', '/products/serum.png', '/products/main.png'],
  whiteImg: '/products/serum.png',
  transparentImg: '/products/main.png',
  sceneImg: '/products/main.png',
  videos: ['/products/main.png', '/products/serum.png'],
  delivery: '浙江杭州',
  transport: '运费模板-默认（1021）',
  packListing: '主机 ×1、说明书 ×1',
  afterService: '7天无理由退货，整机保修1年',
  weight: '0.85',
  dims: '120 × 90 × 60',
};
