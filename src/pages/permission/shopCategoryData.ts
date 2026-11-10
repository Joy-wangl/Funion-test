/* 视频号小店类目申请：类目树（/shop/ec/category/all 口径：cat_id/f_cat_id 三级树＋类目资质）
   与店铺审核单（getbizcatflowlist）、类目权限（get_category_relation_list）三态模型 */
import { reactive } from 'vue';

export interface CatNode {
  catId: string;
  name: string;
  children?: CatNode[];
  /* 叶子（三级类目）专属：保证金（元）与申请所需资质 */
  deposit?: number;
  quals?: string[];
}

export type CatFlowStatus = 'applied' | 'auditing' | 'failed' | 'canceled';

export interface ShopCatFlow {
  flowId: string;
  catId: string;
  status: CatFlowStatus;
  deposit: number;
  quals: string[];
  /* 提交时逐份上传的资质材料文件名（材料名→文件名） */
  qualFiles?: Record<string, string>;
  submitTime: string;
  auditTime?: string;
  effectiveTime?: string;
  expireTime?: string;
  failReason?: string;
  cancelTime?: string;
}

const Q_FOOD = ['营业执照', '食品经营许可证'];
const Q_BEAUTY = ['营业执照', '化妆品备案凭证'];
const Q_BASE = ['营业执照'];
const Q_BRAND = ['营业执照', '品牌授权书'];
const Q_3C = ['营业执照', '3C 认证证书'];
/* 部分类目平台不要求补充资质（基础营业执照已在入驻时提交），申请时无需再传材料 */
const Q_NONE: string[] = [];

/* 各材料的提交要求（平台类目资质口径），用于材料条目的悬浮说明 */
export const QUAL_REQ: Record<string, string> = {
  营业执照: '需在有效期内，经营范围须涵盖所申请类目商品',
  食品经营许可证: '需在有效期内，经营项目须含预包装食品销售',
  化妆品备案凭证: '所售商品需完成国产/进口化妆品备案，凭证与商品名称一致',
  品牌授权书: '需以商标权利人为源头的授权链路，注明授权期限与销售平台',
  '3C 认证证书': '证书需覆盖所售型号，且在有效期内',
};

export const CAT_TREE: CatNode[] = [
  {
    catId: '1001', name: '食品饮料', children: [
      {
        catId: '100101', name: '休闲零食', children: [
          { catId: '10010101', name: '坚果炒货', deposit: 5000, quals: Q_FOOD },
          { catId: '10010102', name: '膨化饼干', deposit: 5000, quals: Q_FOOD },
        ],
      },
      {
        catId: '100102', name: '粮油调味', children: [
          { catId: '10010201', name: '方便速食', deposit: 5000, quals: Q_FOOD },
          { catId: '10010202', name: '调味品', deposit: 5000, quals: Q_FOOD },
        ],
      },
      {
        catId: '100103', name: '茶饮冲调', children: [
          { catId: '10010301', name: '茶叶', deposit: 10000, quals: Q_FOOD },
          { catId: '10010302', name: '咖啡冲饮', deposit: 10000, quals: Q_FOOD },
        ],
      },
    ],
  },
  {
    catId: '1002', name: '美妆个护', children: [
      {
        catId: '100201', name: '护肤', children: [
          { catId: '10020101', name: '面部护肤', deposit: 10000, quals: Q_BEAUTY },
          { catId: '10020102', name: '面膜', deposit: 10000, quals: Q_BEAUTY },
        ],
      },
      {
        catId: '100202', name: '彩妆香水', children: [
          { catId: '10020201', name: '彩妆', deposit: 10000, quals: Q_BEAUTY },
          { catId: '10020202', name: '香水', deposit: 20000, quals: Q_BEAUTY },
        ],
      },
    ],
  },
  {
    catId: '1003', name: '家居厨用', children: [
      {
        catId: '100301', name: '厨房餐饮', children: [
          { catId: '10030101', name: '烹饪锅具', deposit: 2000, quals: Q_BASE },
          { catId: '10030102', name: '餐具水具', deposit: 2000, quals: Q_NONE },
        ],
      },
      {
        catId: '100302', name: '家庭清洁', children: [
          { catId: '10030201', name: '清洁用品', deposit: 2000, quals: Q_NONE },
        ],
      },
    ],
  },
  {
    catId: '1004', name: '服饰鞋包', children: [
      {
        catId: '100401', name: '女装', children: [
          { catId: '10040101', name: '连衣裙', deposit: 5000, quals: Q_BRAND },
          { catId: '10040102', name: '羽绒服', deposit: 5000, quals: Q_BRAND },
        ],
      },
      {
        catId: '100402', name: '鞋靴', children: [
          { catId: '10040201', name: '休闲鞋', deposit: 5000, quals: Q_BRAND },
        ],
      },
    ],
  },
  {
    catId: '1005', name: '数码家电', children: [
      {
        catId: '100501', name: '家用电器', children: [
          { catId: '10050101', name: '厨房电器', deposit: 10000, quals: Q_3C },
          { catId: '10050102', name: '生活电器', deposit: 10000, quals: Q_3C },
        ],
      },
      {
        catId: '100502', name: '数码配件', children: [
          { catId: '10050201', name: '手机配件', deposit: 10000, quals: Q_3C },
        ],
      },
    ],
  },
  {
    catId: '1006', name: '运动户外', children: [
      {
        catId: '100601', name: '户外装备', children: [
          { catId: '10060101', name: '帐篷天幕', deposit: 5000, quals: Q_BASE },
          { catId: '10060102', name: '登山装备', deposit: 5000, quals: Q_NONE },
        ],
      },
    ],
  },
];

const LEAF_MAP = new Map<string, { leaf: CatNode; path: string[] }>();
(function walk(nodes: CatNode[], path: string[]) {
  nodes.forEach((n) => {
    if (n.children?.length) walk(n.children, [...path, n.name]);
    else LEAF_MAP.set(n.catId, { leaf: n, path: [...path, n.name] });
  });
})(CAT_TREE, []);

export const catLeaf = (catId: string) => LEAF_MAP.get(catId)?.leaf ?? null;
export const catPathText = (catId: string) => (LEAF_MAP.get(catId)?.path ?? []).join(' > ');

/* 店铺审核单/权限按店铺隔离：首次读取时落默认种子（已申请2＋审核中1＋审核失败1）；reactive 保证撤销/重报即时刷新 */
const FLOW_STORE = reactive<Record<string, ShopCatFlow[]>>({});
const seedFlows = (shopId: string): ShopCatFlow[] => {
  const mk = (catId: string, over: Partial<ShopCatFlow>): ShopCatFlow => {
    const leaf = catLeaf(catId)!;
    return { flowId: '', catId, deposit: leaf.deposit ?? 0, quals: [...(leaf.quals ?? [])], submitTime: '', ...over };
  };
  return [
    mk('10030101', { flowId: 'CF20260512003', status: 'applied', submitTime: '2026-05-10 10:22', auditTime: '2026-05-12 09:40', effectiveTime: '2026-05-12 09:40', expireTime: '2027-05-12 09:40' }),
    mk('10020101', { flowId: 'CF20260601008', status: 'applied', submitTime: '2026-05-28 15:03', auditTime: '2026-06-01 11:18', effectiveTime: '2026-06-01 11:18', expireTime: '2027-06-01 11:18' }),
    mk('10010101', { flowId: 'CF20261106001', status: 'auditing', submitTime: '2026-11-06 14:35' }),
    mk('10020202', { flowId: 'CF20261102004', status: 'failed', submitTime: '2026-10-30 09:12', auditTime: '2026-11-02 16:47', failReason: '品牌授权书已过期，请上传有效期内的授权文件后重新申请' }),
  ];
};
export const catFlowsOf = (shopId: string): ShopCatFlow[] => {
  if (!FLOW_STORE[shopId]) FLOW_STORE[shopId] = seedFlows(shopId);
  return FLOW_STORE[shopId];
};

export const nowText = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
let flowSeq = 10;
export const nextFlowId = () => `CF${nowText().slice(0, 10).replace(/-/g, '')}${String(flowSeq++).padStart(3, '0')}`;

export const CAT_STATUS_TEXT: Record<CatFlowStatus, string> = {
  applied: '已申请',
  auditing: '审核中',
  failed: '审核失败',
  canceled: '已撤销',
};

/* 类目是否需要提交资质材料（无补充材料要求的类目申请时直接提交） */
export const catNeedQual = (leaf: CatNode | null) => !!leaf && (leaf.quals?.length ?? 0) > 0;
export const CAT_LEVEL_NAMES = ['一级类目', '二级类目', '三级类目'];
