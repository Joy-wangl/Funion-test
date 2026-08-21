/* =========================================================
   优化任务列表 · 数据层
   状态机：待认领 → 待优化 → 优化中 → 待审核 → 优化完结
                 └→ 拒绝
   ========================================================= */

export type OptStatus = 'pendingClaim' | 'pendingOpt' | 'optimizing' | 'pendingReview' | 'done' | 'rejected';

/** 优化任务列表状态 tab（全部 + 六状态） */
export type StatusTab = 'all' | OptStatus;

export const OPT_STATUS_LABELS: { key: OptStatus; label: string; color: string }[] = [
  { key: 'pendingClaim', label: '待认领', color: '#86909c' },
  { key: 'pendingOpt', label: '待优化', color: '#ff9a2e' },
  { key: 'optimizing', label: '优化中', color: '#4f7cff' },
  { key: 'pendingReview', label: '待审核', color: '#722ed1' },
  { key: 'done', label: '优化完结', color: '#00b42a' },
  { key: 'rejected', label: '拒绝', color: '#e6455c' },
];

export const OPT_LEVELS = ['P0', 'P1', 'P2'];
/** 问题点（创建/编辑/筛选统一枚举） */
export const OPT_PROBLEMS = ['成本高', '品质差', '仓库错发', '仓库漏发', '快递费用异常', '包材成本偏高', '评分差', '破损高'];
/** 需求（原优化方向字段统一枚举） */
export const OPT_DEMANDS = ['降本', '改善包装', '提升质量', '维护品质', '优化售后', '原厂发货慢', '包材成本偏高', '利润低', '对标同行规格'];
export const OPT_GROUPS = ['运维一组', '运维二组', '运维三组'];
export const OPT_PICKERS = ['李桂兰', '杨晓雨', '陈思琪'];
export const OPT_ASSIGNEES = ['李强', '张伟', '王芳', '赵敏'];

export interface OptTask {
  id: string;
  /** 登记日期 */
  createdAt: string;
  seriesCode: string;
  seriesName: string;
  status: OptStatus;
  /** 问题点 */
  optType: string;
  /** 需求（原优化方向） */
  optDirection: string;
  optLevel: string;
  /** 选品人 */
  picker: string;
  /** 近一个月订单 */
  orders30d: number;
  /** 近一个月毛六（毛利） */
  gross30d: number;
  refundRate: number;
  /** 运维组别 */
  group: string;
  /** 分配状态 */
  assignStatus: '待处理' | '已分配';
  assignee?: string;
  assignTime?: string;
  rejectReason?: string;
  /** 优化开始时间（进入优化中） */
  optStartAt?: string;
  /** 优化完成时间（提交审核/完结） */
  optEndAt?: string;
  /** 凭证（上传文件名列表） */
  evidence?: string[];
}

export const QC_OPT_TASKS: OptTask[] = [
  { id: 'OT-1001', createdAt: '2026-08-19 08:53:25', seriesCode: 'XL-2003', seriesName: '厨房收纳系列', status: 'pendingClaim', optType: '破损高', optDirection: '改善包装', optLevel: 'P1', picker: '李桂兰', orders30d: 46690, gross30d: 24644, refundRate: 0.0332, group: '运维三组', assignStatus: '待处理' },
  { id: 'OT-1002', createdAt: '2026-08-18 18:37:32', seriesCode: 'XL-2001', seriesName: '保温杯系列', status: 'pendingClaim', optType: '品质差', optDirection: '维护品质', optLevel: 'P0', picker: '杨晓雨', orders30d: 99, gross30d: 91, refundRate: 0.0354, group: '运维三组', assignStatus: '待处理' },
  { id: 'OT-1003', createdAt: '2026-08-18 18:36:48', seriesCode: 'XL-2004', seriesName: '手机支架系列', status: 'pendingClaim', optType: '评分差', optDirection: '优化售后', optLevel: 'P1', picker: '杨晓雨', orders30d: 23916, gross30d: 11385, refundRate: 0.0597, group: '运维三组', assignStatus: '待处理' },
  { id: 'OT-1004', createdAt: '2026-08-17 09:12:10', seriesCode: 'XL-2002', seriesName: '毛绒玩具系列', status: 'pendingClaim', optType: '仓库漏发', optDirection: '降本', optLevel: 'P2', picker: '陈思琪', orders30d: 15230, gross30d: 8600, refundRate: 0.041, group: '运维二组', assignStatus: '待处理' },
  { id: 'OT-1005', createdAt: '2026-08-16 15:20:44', seriesCode: 'XL-2001', seriesName: '保温杯系列', status: 'pendingOpt', optType: '品质差', optDirection: '维护品质', optLevel: 'P0', picker: '李桂兰', orders30d: 13730, gross30d: 7200, refundRate: 0.076, group: '运维一组', assignStatus: '已分配', assignee: '李强', assignTime: '2026-08-17 09:00' },
  { id: 'OT-1006', createdAt: '2026-08-16 10:02:19', seriesCode: 'XL-2003', seriesName: '厨房收纳系列', status: 'pendingOpt', optType: '仓库错发', optDirection: '降本', optLevel: 'P1', picker: '杨晓雨', orders30d: 9800, gross30d: 4100, refundRate: 0.052, group: '运维二组', assignStatus: '已分配', assignee: '张伟', assignTime: '2026-08-16 14:00' },
  { id: 'OT-1007', createdAt: '2026-08-15 20:41:05', seriesCode: 'XL-2004', seriesName: '手机支架系列', status: 'pendingOpt', optType: '成本高', optDirection: '对标同行规格', optLevel: 'P2', picker: '陈思琪', orders30d: 6400, gross30d: 2900, refundRate: 0.028, group: '运维一组', assignStatus: '已分配', assignee: '王芳', assignTime: '2026-08-16 09:30' },
  { id: 'OT-1008', createdAt: '2026-08-14 11:26:37', seriesCode: 'XL-2002', seriesName: '毛绒玩具系列', status: 'optimizing', optType: '品质差', optDirection: '维护品质', optLevel: 'P0', picker: '李桂兰', orders30d: 15230, gross30d: 8600, refundRate: 0.049, group: '运维一组', assignStatus: '已分配', assignee: '赵敏', assignTime: '2026-08-14 15:00', optStartAt: '2026-08-15' },
  { id: 'OT-1009', createdAt: '2026-08-13 09:48:52', seriesCode: 'XL-2003', seriesName: '厨房收纳系列', status: 'optimizing', optType: '破损高', optDirection: '改善包装', optLevel: 'P1', picker: '杨晓雨', orders30d: 9800, gross30d: 4100, refundRate: 0.055, group: '运维二组', assignStatus: '已分配', assignee: '李强', assignTime: '2026-08-13 14:20', optStartAt: '2026-08-14' },
  { id: 'OT-1010', createdAt: '2026-08-12 17:05:26', seriesCode: 'XL-2001', seriesName: '保温杯系列', status: 'optimizing', optType: '快递费用异常', optDirection: '降本', optLevel: 'P2', picker: '陈思琪', orders30d: 13730, gross30d: 7200, refundRate: 0.071, group: '运维三组', assignStatus: '已分配', assignee: '张伟', assignTime: '2026-08-13 09:00', optStartAt: '2026-08-13' },
  { id: 'OT-1011', createdAt: '2026-08-10 10:22:14', seriesCode: 'XL-2004', seriesName: '手机支架系列', status: 'pendingReview', optType: '评分差', optDirection: '对标同行规格', optLevel: 'P0', picker: '李桂兰', orders30d: 6400, gross30d: 2900, refundRate: 0.031, group: '运维一组', assignStatus: '已分配', assignee: '王芳', assignTime: '2026-08-10 14:00', optStartAt: '2026-08-11', optEndAt: '2026-08-16' },
  { id: 'OT-1012', createdAt: '2026-08-09 16:40:33', seriesCode: 'XL-2002', seriesName: '毛绒玩具系列', status: 'pendingReview', optType: '评分差', optDirection: '优化售后', optLevel: 'P1', picker: '杨晓雨', orders30d: 15230, gross30d: 8600, refundRate: 0.045, group: '运维二组', assignStatus: '已分配', assignee: '赵敏', assignTime: '2026-08-10 09:10', optStartAt: '2026-08-10', optEndAt: '2026-08-15' },
  { id: 'OT-1013', createdAt: '2026-08-06 09:15:47', seriesCode: 'XL-2001', seriesName: '保温杯系列', status: 'done', optType: '品质差', optDirection: '维护品质', optLevel: 'P0', picker: '陈思琪', orders30d: 13730, gross30d: 7200, refundRate: 0.076, group: '运维一组', assignStatus: '已分配', assignee: '李强', assignTime: '2026-08-06 11:00', optStartAt: '2026-08-07', optEndAt: '2026-08-12' },
  { id: 'OT-1014', createdAt: '2026-08-05 14:33:08', seriesCode: 'XL-2003', seriesName: '厨房收纳系列', status: 'done', optType: '仓库漏发', optDirection: '降本', optLevel: 'P1', picker: '李桂兰', orders30d: 9800, gross30d: 4100, refundRate: 0.05, group: '运维二组', assignStatus: '已分配', assignee: '张伟', assignTime: '2026-08-05 16:00', optStartAt: '2026-08-06', optEndAt: '2026-08-11' },
  { id: 'OT-1015', createdAt: '2026-08-08 13:57:21', seriesCode: 'XL-2002', seriesName: '毛绒玩具系列', status: 'rejected', optType: '品质差', optDirection: '维护品质', optLevel: 'P2', picker: '杨晓雨', orders30d: 15230, gross30d: 8600, refundRate: 0.047, group: '运维三组', assignStatus: '待处理', rejectReason: '优化方案无实质改进，驳回重新评估' },
  { id: 'OT-1016', createdAt: '2026-08-07 10:12:56', seriesCode: 'XL-2004', seriesName: '手机支架系列', status: 'rejected', optType: '成本高', optDirection: '对标同行规格', optLevel: 'P1', picker: '陈思琪', orders30d: 6400, gross30d: 2900, refundRate: 0.029, group: '运维一组', assignStatus: '待处理', rejectReason: '商品已列入下架计划，无需优化' },
];
