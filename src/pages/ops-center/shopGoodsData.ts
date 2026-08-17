/** 店铺商品模块数据：列表行 + 状态元信息 + 详情素材 */

export type SgStatus = 'selling' | 'auditing' | 'auditFail' | 'offSystem' | 'offManual' | 'draft';

export interface SgProduct {
  id: string;
  title: string;
  img: string;
  linkId: string;
  status: SgStatus;
  strategy: string;
  sales: string;
  reviews: string;
  publisher: string;
  store: string;
  storePlatform: string;
  source: string;
  version: string;
  operator: string;
  category: [string, string, string];
  publishTime: string;
  shelfTime?: string;
  submitTime?: string;
  offTime?: string;
  offReason?: string;
  rejectReason?: string;
  createTime?: string;
}

export const SG_STATUS_META: Record<SgStatus, { label: string; dot: string; color: string }> = {
  selling: { label: '销售中', dot: '#22c07b', color: '#3d4657' },
  auditing: { label: '审核中', dot: '#4f7cff', color: '#3d4657' },
  auditFail: { label: '销售中', dot: '#22c07b', color: '#3d4657' },
  offSystem: { label: '系统下架', dot: '#b3bac6', color: '#8a92a1' },
  offManual: { label: '手动下架', dot: '#b3bac6', color: '#8a92a1' },
  draft: { label: '草稿', dot: '#f6a54c', color: '#8a92a1' },
};

/** 状态 chip 分组：审核待处理=auditFail；已下架=offSystem+offManual */
export const SG_CHIPS: { key: string; label: string; match: (s: SgStatus) => boolean }[] = [
  { key: 'all', label: '全部', match: () => true },
  { key: 'selling', label: '销售中', match: (s) => s === 'selling' },
  { key: 'auditing', label: '审核中', match: (s) => s === 'auditing' },
  { key: 'pending', label: '审核待处理', match: (s) => s === 'auditFail' },
  { key: 'off', label: '已下架', match: (s) => s === 'offSystem' || s === 'offManual' },
  { key: 'draft', label: '草稿箱', match: (s) => s === 'draft' },
];

const T_MAIN = '德国指甲剪刀套装全套耳勺指甲刀指甲钳修剪专用斜口指甲钳剪刀';
const T_SERUM = 'PERDORA 玻尿酸修护精华液 补水保湿舒缓敏感肌 30ml 装';

export const sgProducts: Record<'视频号' | '淘宝', SgProduct[]> = {
  视频号: [
    {
      id: '8888777776666', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776666',
      status: 'selling', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '自己', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736834', operator: '张三', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-04-12 12:00:00', shelfTime: '2026-04-12 12:00:00',
    },
    {
      id: '8888777776667', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776667',
      status: 'auditing', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '自己', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736835', operator: '张三', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-08-14 09:30:00', submitTime: '2026-08-14 09:30:00',
    },
    {
      id: '8888777776668', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776668',
      status: 'auditFail', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '自己', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736836', operator: '张三', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-04-12 12:00:00', shelfTime: '2026-04-12 12:00:00',
      rejectReason: '商品主图不符合规范：存在营销文案牛皮癣，请更换纯商品图后重新提交',
    },
    {
      id: '8888777776669', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776669',
      status: 'offSystem', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736837', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-04-12 12:00:00', offTime: '2026-07-02 18:20:00',
      offReason: '平台质检不合格，系统自动下架',
    },
    {
      id: '8888777776670', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776670',
      status: 'offManual', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '李四', store: 'AAA小店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736838', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-04-12 12:00:00', offTime: '2026-06-18 10:05:00',
      offReason: '库存不足，人工手动下架',
    },
    {
      id: '8888777776671', title: T_MAIN, img: '/products/main.png', linkId: '8888777776671',
      status: 'selling', strategy: '默认发布策略', sales: '1,286', reviews: '342',
      publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '内部商机',
      version: '7887998736839', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '2026-03-02 10:00:00', shelfTime: '2026-03-02 10:00:00',
    },
    {
      id: '8888777776672', title: T_MAIN, img: '/products/main.png', linkId: '8888777776672',
      status: 'draft', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '链接商品库',
      version: '7887998736840', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '-', createTime: '2026-08-10 15:20:00',
    },
    {
      id: '8888777776673', title: T_SERUM, img: '/products/serum.png', linkId: '8888777776673',
      status: 'selling', strategy: '高利润策略', sales: '866', reviews: '120',
      publisher: '李四', store: '拼多多优品店', storePlatform: '拼多多', source: '市场商机',
      version: '7887998736841', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-05-20 08:00:00', shelfTime: '2026-05-20 08:00:00',
    },
  ],
  淘宝: [
    {
      id: '9911223344551', title: T_MAIN, img: '/products/main.png', linkId: '9911223344551',
      status: 'selling', strategy: '默认发布策略', sales: '2,050', reviews: '518',
      publisher: '自己', store: '淘宝心选店', storePlatform: '淘宝', source: '内部商机',
      version: '7887998736851', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '2026-02-11 09:00:00', shelfTime: '2026-02-11 09:00:00',
    },
    {
      id: '9911223344552', title: T_SERUM, img: '/products/serum.png', linkId: '9911223344552',
      status: 'auditing', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '李四', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '链接商品库',
      version: '7887998736852', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-08-13 16:40:00', submitTime: '2026-08-13 16:40:00',
    },
    {
      id: '9911223344553', title: T_SERUM, img: '/products/serum.png', linkId: '9911223344553',
      status: 'offManual', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '李四', store: '拼多多优品店', storePlatform: '拼多多', source: '市场商机',
      version: '7887998736853', operator: '李四', category: ['美妆个护', '面部护理', '精华液'],
      publishTime: '2026-03-30 12:00:00', offTime: '2026-07-22 14:00:00',
      offReason: '活动结束，人工手动下架',
    },
    {
      id: '9911223344554', title: T_MAIN, img: '/products/main.png', linkId: '9911223344554',
      status: 'draft', strategy: '未关联', sales: '-', reviews: '-',
      publisher: '自己', store: '淘宝心选店', storePlatform: '淘宝', source: '链接商品库',
      version: '7887998736854', operator: '张三', category: ['厨房电器', '料理机', '多功能料理机'],
      publishTime: '-', createTime: '2026-08-08 11:12:00',
    },
  ],
};

/** 详情静态素材（规格/SKU/图集） */
export const sgDetail = {
  colors: ['黑色', '白色'],
  styles: ['a款', 'b款'],
  skus: [
    { color: '黑色', style: 'a款', name: '黑a款', code: 'JSZJDAO-006' },
    { color: '黑色', style: 'a款', name: '黑a款', code: 'JSZJDAO-006' },
    { color: '白色', style: 'a款', name: '黑a款', code: 'JSZJDAO-006' },
    { color: '白色', style: 'b款', name: '黑a款', code: 'JSZJDAO-006' },
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
