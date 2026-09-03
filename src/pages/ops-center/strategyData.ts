/** 商品策略页：策略商品列表数据（筛选/策略 tab/批量操作） */
export interface StProduct {
  id: string;
  title: string;
  img: string;
  store: string;
  strategy: '默认发布策略' | '高利润策略';
  sold30: string;
  sales: string;
  exposure: string;
  reviews: string;
  /** 近30天是否有动销 */
  hasDx: boolean;
  stStatus: '启用' | '停用';
}

const T_SERUM = 'PERDORA 玻尿酸修护精华液 补水保湿舒缓敏感...';
const T_TOOL = '德国指甲剪刀套装全套耳勺指甲刀指甲钳修剪专用...';

export const stProducts: StProduct[] = [
  { id: '8888777776669', title: T_SERUM, img: '/products/serum.png', store: 'AAA小店', strategy: '默认发布策略', sold30: '0', sales: '0', exposure: '0', reviews: '0', hasDx: false, stStatus: '启用' },
  { id: '8888777776670', title: T_SERUM, img: '/products/serum.png', store: 'AAA小店', strategy: '默认发布策略', sold30: '0', sales: '0', exposure: '0', reviews: '0', hasDx: false, stStatus: '启用' },
  { id: '8888777776671', title: T_SERUM, img: '/products/serum.png', store: '天猫Funion旗舰店', strategy: '默认发布策略', sold30: '126', sales: '1,286', exposure: '5,602', reviews: '342', hasDx: true, stStatus: '启用' },
  { id: '8888777776675', title: T_TOOL, img: '/products/main.png', store: 'AAA小店', strategy: '默认发布策略', sold30: '0', sales: '0', exposure: '0', reviews: '0', hasDx: false, stStatus: '启用' },
  { id: '8888777776676', title: T_SERUM, img: '/products/serum.png', store: '拼多多优品店', strategy: '默认发布策略', sold30: '98', sales: '866', exposure: '3,208', reviews: '120', hasDx: true, stStatus: '启用' },
  { id: '8888777776680', title: T_SERUM, img: '/products/serum.png', store: 'AAA小店', strategy: '高利润策略', sold30: '45', sales: '520', exposure: '1,902', reviews: '86', hasDx: true, stStatus: '启用' },
  { id: '8888777776681', title: T_TOOL, img: '/products/main.png', store: '天猫Funion旗舰店', strategy: '高利润策略', sold30: '0', sales: '0', exposure: '0', reviews: '0', hasDx: false, stStatus: '停用' },
];
