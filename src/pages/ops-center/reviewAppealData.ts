/** 评价申诉模块数据层：视频号平台评价申诉列表（用户 2026-09-20 新增） */
import { reactive } from 'vue';

/** 评价类型枚举 */
export type RaRating = '挺好的' | '不够好';
/** 可见范围枚举 */
export type RaVisibility = '展示中' | '已折叠' | '未展示';
/** 申诉状态枚举（用户 2026-09-20：待申诉/已申诉/不予申诉） */
export type RaAppealStatus = '待申诉' | '已申诉' | '不予申诉';
/** 审核状态枚举：提交申诉后的平台审核结果 */
export type RaAuditStatus = '审核中' | '已通过' | '未通过' | '已撤回';

/** 评价申诉行 */
export interface RaReview {
  id: string;
  /** 店铺名称 */
  shopName: string;
  /** 评价人昵称 */
  userName: string;
  /** 评价时间 */
  ratedAt: string;
  /** 评价类型 */
  rating: RaRating;
  /** 评价正文 */
  content: string;
  /** 评价附图（可选） */
  images: string[];
  /** 商品标题 */
  productTitle: string;
  /** 商品 SKU 描述 */
  productSku: string;
  /** 商品 ID */
  productId: string;
  /** 商品缩略图 */
  productThumb: string;
  /** 可见范围 */
  visibility: RaVisibility;
  /** 申诉状态 */
  appealStatus: RaAppealStatus;
  /** 实际选择的申诉原因 */
  appealCause?: string;
  /** 实际发起的投诉说明（已申诉时展示） */
  appealReason?: string;
  /** 已上传的凭证名称 */
  appealEvidenceName?: string;
  /** 已上传的凭证图片（缩略图 URL） */
  appealEvidenceImages?: string[];
  /** 申诉提交时间 */
  appealTime?: string;
  /** 审核状态：提交申诉后的平台审核结果 */
  auditStatus?: RaAuditStatus;
}

/** 种子数据：仅「不够好」评价（用户要求默认筛选） */
export const raReviews = reactive<RaReview[]>([
  {
    id: 'RA001',
    shopName: '旗舰店 A',
    userName: '别来无恙',
    ratedAt: '09/19 16:12',
    rating: '不够好',
    content: '质量好，很牢固',
    images: [],
    productTitle: '防水防潮可套拉杆箱',
    productSku: '紫色【中号40*17*36cm】',
    productId: '401736',
    productThumb: '',
    visibility: '展示中',
    appealStatus: '待申诉',
    appealCause: '评价内容与商品无关',
  },
  {
    id: 'RA002',
    shopName: '旗舰店 A',
    userName: '匿名',
    ratedAt: '09/19 10:13',
    rating: '不够好',
    content: '没有气，不是球，无法用啊',
    images: ['/products/main.png', '/products/serum.png'],
    productTitle: '紧致腰腹/平坦...',
    productSku: '木槿紫（100g）【直径25cm】',
    productId: '225001',
    productThumb: '',
    visibility: '展示中',
    appealStatus: '已申诉',
    appealCause: '消费者买错导致差评',
    appealReason: '评价内容与订单无关，疑似恶意差评',
    appealEvidenceName: '物流截图.png',
    appealEvidenceImages: ['/products/main.png', '/products/serum.png'],
    appealTime: '09/19 11:30',
    auditStatus: '未通过',
  },
  {
    id: 'RA003',
    shopName: '旗舰店 B',
    userName: '印象@慢学',
    ratedAt: '09/18 23:08',
    rating: '不够好',
    content: '发货慢，与宣传不符，质量差\n用户觉得不够好。',
    images: [],
    productTitle: '至尊款【三档调节三重保护】送充电线',
    productSku: '',
    productId: '330012',
    productThumb: '',
    visibility: '未展示',
    appealStatus: '待申诉',
    appealCause: '平台活动导致差评',
  },
  {
    id: 'RA004',
    shopName: '旗舰店 B',
    userName: '黄二',
    ratedAt: '09/18 19:45',
    rating: '不够好',
    content: '根本没什么作用',
    images: [],
    productTitle: '【多功能灶台架】通用型.旗舰品质：加厚材质（...',
    productSku: '',
    productId: '440088',
    productThumb: '',
    visibility: '展示中',
    appealStatus: '不予申诉',
  },
  {
    id: 'RA005',
    shopName: '旗舰店 C',
    userName: '用户_9527',
    ratedAt: '09/18 14:22',
    rating: '不够好',
    content: '材质一般，和描述有差距',
    images: ['/products/serum.png'],
    productTitle: '便携式收纳盒',
    productSku: '灰色（大号）',
    productId: '550023',
    productThumb: '',
    visibility: '展示中',
    appealStatus: '已申诉',
    appealCause: '未收到货的虚假评价',
    appealReason: '买家未收到货即差评，物流在途',
    appealEvidenceName: '物流凭证.jpg',
    appealEvidenceImages: ['/products/main.png'],
    appealTime: '09/18 15:00',
    auditStatus: '审核中',
  },
  {
    id: 'RA006',
    shopName: '旗舰店 C',
    userName: '匿名',
    ratedAt: '09/17 21:30',
    rating: '不够好',
    content: '物流太慢了，等了一周',
    images: [],
    productTitle: '家用置物架',
    productSku: '白色三层',
    productId: '660045',
    productThumb: '',
    visibility: '已折叠',
    appealStatus: '待申诉',
    appealCause: '未收到货的虚假评价',
  },
]);
