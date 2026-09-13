/**
 * 商品知识库 V2 数据层：深拷贝商品知识库种子形成独立数据源（与旧模块互不影响），
 * 知识条目与素材在原版字段之上扩展 QA 式匹配两件套：问法（多条）/ 关键词
 */
import { reactive } from 'vue';
import { kbProducts, type KbCode, type KbItem, type KbKnowledgeEntry, type KbMedia, type KbProduct } from './data';

/** V2 知识条目：原商品知识字段 + 问法匹配字段 */
export interface KbV2Knowledge extends KbKnowledgeEntry {
  /** 问法：客户问句表述（多条，命中召回语料） */
  questions: string[];
  /** 关键词：命中关键词（灰标签展示） */
  keywords: string[];
}
/** V2 素材（图片/视频）：与知识条目同构——问法（多条）/ 关键词两个命中维度（原单条内容描述字段取消） */
export interface KbV2Media extends Omit<KbMedia, 'desc'> {
  questions: string[];
  keywords: string[];
}
export type KbV2Code = Omit<KbCode, 'knowledge' | 'images' | 'videos'> & { knowledge: KbV2Knowledge[]; images: KbV2Media[]; videos: KbV2Media[]; guides: KbV2Media[] };
/** V2 SKU（ID 维度下二级）：SKU 下挂其关联的商品编码（与系列编码同源实体）；主图取首关联编码头图，售价按 ID 售价 × 规格系数派生 */
export interface KbV2Sku {
  /** SKU 唯一标识（店铺商品ID 派生） */
  id: string;
  /** SKU 规格名（编码规格 × 尺码/包装） */
  name: string;
  /** SKU 主图 */
  img: string;
  /** SKU 售价 */
  price: string;
  /** SKU 下关联的商品编码 */
  codes: KbV2Code[];
}
export type KbV2Item = Omit<KbItem, 'codes'> & { codes: KbV2Code[]; skus: KbV2Sku[] };
export type KbV2Product = Omit<KbProduct, 'codes' | 'items'> & { codes: KbV2Code[]; items: KbV2Item[] };

/* 问法匹配种子：按知识条目 id 回填（首条对齐 QA 管理演示口径），未回填条目匹配字段为空 */
const KN_MATCH_SEED: Record<string, { questions: string[]; keywords: string[] }> = {
  KN001: {
    questions: ['这款鞋偏码吗？平时穿37要拍多大？', '鞋子码数准吗', '偏大还是偏小', '37的脚拍几码', '要不要买大一码'],
    keywords: ['偏码', '尺码', '码数'],
  },
  KN002: { questions: ['新鞋第一次穿要注意什么？', '新鞋怎么磨合', '胶水味正常吗'], keywords: ['磨合', '气味'] },
  KN004: { questions: ['介于两个码之间怎么选？', '大童要不要拍大一码'], keywords: ['尺码', '大童'] },
  KN005: { questions: ['云感休闲鞋码数标准吗？', '鞋底软不软', '两码之间选哪个'], keywords: ['云感', '码数'] },
  KN008: { questions: ['是否情侣同款？', '男女能穿同一款吗', '码段范围是多少'], keywords: ['情侣', '同款'] },
  KN010: { questions: ['发货包装是什么样的？', '可以定制礼盒包装吗'], keywords: ['包装', '礼盒'] },
  KN012: { questions: ['儿童保湿面霜怎么涂抹？', '一次用多少量', '每天涂几次'], keywords: ['使用方法', '涂抹'] },
  KN018: { questions: ['老爹鞋楦型偏宽吗？', '脚瘦需要加鞋垫吗'], keywords: ['楦型', '偏宽'] },
};

/* 素材问法匹配种子：按素材类型回填（外包装图仅单条问法，呈现部分维度态） */
const MEDIA_Q_SEED: Record<string, { questions: string[]; keywords: string[] }> = {
  商品图片: { questions: ['能发下商品正面整体图吗？', '有正面整体图吗', '能看下商品全貌吗'], keywords: ['整体图', '外观'] },
  实物图片: { questions: ['能发下实物实拍图吗？', '是实拍图吗', '实物长什么样'], keywords: ['实拍', '实物'] },
  外包装图: { questions: ['发货外包装是什么样的？'], keywords: [] },
  商品视频: { questions: ['能发下商品使用演示视频吗？', '有使用视频吗', '能看下上身效果吗'], keywords: ['视频', '演示'] },
  安装视频: { questions: ['能发下商品安装视频吗？', '有安装教程吗', '怎么组装'], keywords: ['安装', '组装'] },
  使用视频: { questions: ['能发下商品使用教程视频吗？', '有使用教程吗', '第一次用要注意什么'], keywords: ['使用', '教程'] },
};
const withMediaMatch = (list: Omit<KbMedia, 'desc'>[]): KbV2Media[] => list.map((m) => ({
  label: m.label,
  src: m.src,
  name: m.name,
  scenes: [...m.scenes],
  questions: [...(MEDIA_Q_SEED[m.label]?.questions ?? [])],
  keywords: [...(MEDIA_Q_SEED[m.label]?.keywords ?? [])],
}));
/* SKU 规格种子：按系列的销售规格（尺码/包装）生成 ID 下 SKU；pick = 该 SKU 可供编码在 ID 内编码中的下标（缺省全量）；mul = 售价相对 ID 售价的系数（包装规格加价） */
const SKU_SPEC_SEED: Record<string, { spec: string; pick?: number[]; mul?: number }[]> = {
  K001: [{ spec: '32码' }, { spec: '33码', pick: [0], mul: 1.1 }],
  K002: [{ spec: '30码' }, { spec: '31码', pick: [0], mul: 1.1 }],
  K003: [{ spec: '39码' }, { spec: '40码', pick: [0], mul: 1.1 }],
  K004: [{ spec: '单支装' }, { spec: '两支礼盒装', pick: [0], mul: 1.9 }],
  K005: [{ spec: '单支装' }, { spec: '两支装', mul: 1.9 }],
  K006: [{ spec: '41码' }, { spec: '42码', mul: 1.1 }],
};

/* 独立数据源：JSON 深拷贝后 item.codes 与系列编码成为独立对象，按 code 重映射恢复同源引用（编辑互通口径与旧模块一致） */
const cloned = JSON.parse(JSON.stringify(kbProducts)) as KbProduct[];
for (const p of cloned) {
  for (const c of p.codes as unknown as KbV2Code[]) {
    c.images = withMediaMatch(c.images);
    c.videos = withMediaMatch(c.videos);
    /* 商品安装/使用视频：每编码安装+使用两条，封面复用编码首图，问法匹配按类型回填 */
    c.guides = withMediaMatch(['安装视频', '使用视频'].map((label) => ({
      label, src: c.images[0]?.src ?? '', scenes: ['咨询定制'],
    })));
    c.knowledge = (c.knowledge as KbKnowledgeEntry[]).map((k) => ({
      ...k,
      questions: [...(KN_MATCH_SEED[k.id]?.questions ?? [])],
      keywords: [...(KN_MATCH_SEED[k.id]?.keywords ?? [])],
    }));
  }
  for (const it of p.items) {
    it.codes = it.codes.map((c) => p.codes.find((x) => x.code === c.code)!).filter(Boolean);
    /* SKU 维度：ID 下按销售规格生成 SKU 选择卡（主图/名称/售价/关联编码数），SKU 内挂其可供编码（同源实体引用） */
    const codes = it.codes as unknown as KbV2Code[];
    (it as unknown as KbV2Item).skus = (SKU_SPEC_SEED[p.id] ?? [{ spec: '默认规格' }]).map((d, si) => {
      const picked = (d.pick ?? codes.map((_, i) => i)).map((i) => codes[i]).filter(Boolean);
      const use = picked.length ? picked : codes;
      const basePrice = parseFloat(it.price) || 0;
      return {
        id: `${it.id}-S${si + 1}`,
        name: d.spec,
        img: use[0]?.images[0]?.src ?? it.img,
        price: `${(basePrice * (d.mul ?? 1)).toFixed(2)}元`,
        codes: use,
      };
    });
  }
}
export const kbV2Products = reactive(cloned) as unknown as KbV2Product[];
