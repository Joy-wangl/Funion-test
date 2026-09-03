/** 异常编码预警-关联商品：三种关联关系的其它商品数据 */
import type { SgProduct } from './shopGoodsData';

export type CwRelType = '系列编码关联' | '链接商品关联' | '竞品链接关联';
export const CW_REL_TYPES: CwRelType[] = ['系列编码关联', '链接商品关联', '竞品链接关联'];

const mk = (over: Partial<SgProduct> & Pick<SgProduct, 'id' | 'title' | 'img' | 'status'>): SgProduct => ({
  linkId: over.id,
  seriesCode: `XL-${over.id.slice(-6)}`,
  strategy: '未关联',
  sales: '-',
  reviews: '-',
  sold30: '0',
  exposure: '0',
  publisher: '李四',
  store: 'AAA小店',
  storePlatform: '淘宝',
  source: '链接商品库',
  version: `788799873${over.id.slice(-4)}`,
  operator: '李四',
  category: ['美妆个护', '面部护理', '精华液'],
  publishMode: '蜂联',
  publishTime: '2026-04-12 12:00:00',
  ...over,
});

/* 同系列不同规格标题：含「ml 装」的替换容量，其余追加款式后缀 */
const specTitle = (t: string, spec: string) => (t.includes('ml 装') ? t.replace(/\d+ml 装/, `${spec}ml 装`) : `${t} ${spec}款`);

/** 当前商品的关联商品：
 *  系列编码关联=同系列编码的其它规格；链接商品关联=同链接商品发布到其它店铺；竞品链接关联=竞品店铺的相似商品 */
export function cwRelatedOf(p: SgProduct): Record<CwRelType, SgProduct[]> {
  const tail = p.id.slice(-4);
  return {
    系列编码关联: [
      mk({
        id: `888877779${tail}`, title: specTitle(p.title, '50'), img: p.img, status: 'selling',
        seriesCode: p.seriesCode, linkId: p.linkId, publisher: '自己',
        sales: '903', reviews: '128', sold30: '86', exposure: '2,306', shelfTime: '2026-05-06 10:00:00',
      }),
      mk({
        id: `888877780${tail}`, title: specTitle(p.title, '100'), img: p.img, status: 'offManual',
        seriesCode: p.seriesCode, linkId: p.linkId, publishMode: '店铺发布',
        offTime: '2026-08-02 09:30:00', offType: '自主下架', offReason: '规格调整，人工手动下架',
      }),
    ],
    链接商品关联: [
      mk({
        id: `888877781${tail}`, title: p.title, img: p.img, status: 'selling', linkId: p.linkId,
        publisher: '自己', store: '天猫Funion旗舰店', storePlatform: '天猫', source: '内部商机',
        sales: '486', reviews: '76', sold30: '52', exposure: '1,808', shelfTime: '2026-06-01 09:00:00',
      }),
      mk({
        id: `888877782${tail}`, title: p.title, img: p.img, status: 'auditing', linkId: p.linkId,
        store: '拼多多优品店', storePlatform: '拼多多', source: '市场商机', publishMode: '店铺发布',
        publishTime: '2026-08-18 10:20:00', submitTime: '2026-08-18 10:20:00',
      }),
    ],
    竞品链接关联: [
      mk({
        id: `665544321${tail}`, title: 'MYSKIN 玻尿酸精华液 补水修护敏感肌适用 30ml 装', img: p.img, status: 'selling',
        publisher: '竞品', store: '竞品美妆专营店', storePlatform: '抖音', source: '竞品链接',
        sales: '2,318', reviews: '606', sold30: '231', exposure: '9,102', shelfTime: '2026-01-18 10:00:00',
      }),
      mk({
        id: `665544322${tail}`, title: 'BEAUTYLAB 修护精华原液 保湿舒缓紧致 30ml 装', img: p.img, status: 'offSystem',
        publisher: '竞品', store: '竞品优选小店', storePlatform: '快手', source: '竞品链接',
        offTime: '2026-07-12 15:40:00', offType: '平台下架', offReason: '平台质检不合格，平台自动下架',
      }),
    ],
  };
}
