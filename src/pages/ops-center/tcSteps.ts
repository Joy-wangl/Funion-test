import type { ShopResult, SubTask } from './data';

/** 统一节点展示态：dot=圆点样式，v=结果文案，cls=文案样式 */
export interface StepView {
  dot: string;
  v: string;
  cls: string;
}

const ok: StepView = { dot: 'ok', v: '成功', cls: '' };
const dash: StepView = { dot: 'wait', v: '–', cls: 'wait' };
const fail: StepView = { dot: 'fail', v: '执行失败', cls: 'fail' };

/** 节点一/二（获取链接信息、定价策略计算）：任务级统一步骤，不区分店铺 */
export function headStepsOf(s: SubTask): StepView[] {
  /* 队列中：首节点待执行，次节点未触及 */
  if (s.status === 'queued') return [{ dot: 'wait', v: '待执行', cls: 'wait' }, dash];
  /* 执行失败且失败在统一节点（failStep<2）：失败节点及其后续统一节点均失败 */
  if (s.status === 'failed' && s.failStep !== undefined && s.failStep < 2) {
    return [0, 1].map((i) => (i < s.failStep! ? ok : fail));
  }
  /* 已进入节点三：两个统一节点均通过 */
  return [ok, ok];
}

/** 节点三（商品发布店铺）：店铺结果集汇总（含未触达/待执行/汇总文案与状态点） */
export interface Step3View extends StepView {
  /** 汇总文案，如「3店 · 成功2 失败1」 */
  sum: string;
}
export function step3Of(s: SubTask): Step3View {
  if (s.status === 'queued') return { dot: 'wait', v: '待执行', cls: 'wait', sum: '' };
  /* 统一节点失败：尚未触达任何店铺 */
  if (s.status === 'failed' && s.failStep !== undefined && s.failStep < 2) return { dot: 'wait', v: '未触达', cls: 'wait', sum: '' };
  const n = s.shops.length;
  const succ = s.shops.filter((x) => x.status === 'success').length;
  const bad = s.shops.filter((x) => x.status === 'failed').length;
  const sum = `${n}店 · 成功${succ}${bad ? ` 失败${bad}` : ''}`;
  if (s.status === 'running') return { dot: 'ok', v: '执行中', cls: '', sum };
  if (s.status === 'success') return { dot: 'ok', v: '成功', cls: '', sum };
  return { dot: 'fail', v: '部分失败', cls: 'fail', sum };
}

/** 店铺结果行文案：成功/执行中/队列中/失败 */
export const shopStatusText: Record<ShopResult['status'], string> = {
  queued: '队列中',
  running: '执行中',
  success: '成功',
  failed: '失败',
};
/** 店铺结果行样式：v=文案样式，dot=圆点样式（ok=成功绿 / run=执行中蓝 / fail=红 / wait=灰） */
export function shopStatusMeta(st: ShopResult['status']): { cls: string; dot: string } {
  if (st === 'success') return { cls: '', dot: 'ok' };
  if (st === 'failed') return { cls: 'fail', dot: 'fail' };
  if (st === 'running') return { cls: '', dot: 'run' };
  return { cls: 'wait', dot: 'wait' };
}

export const stepLabels = ['获取链接信息', '定价策略计算', '商品发布店铺'];

/** 首节点（获取链接信息）是否失败：失败任务不提供商品创建详情入口 */
export const firstStepFailed = (s: SubTask) => headStepsOf(s)[0].dot === 'fail';

/** 商品创建子页键：与侧边栏商品创建分组一致 */
export type CreatePageKey = 'createTaobao' | 'createVideo' | 'createJm';
/** 按发布平台映射商品创建子页（微信视频号小店→视频号、京东→京麦、其余→淘宝） */
export const createPageOf = (platform: string): CreatePageKey =>
  (platform === '微信视频号小店' ? 'createVideo' : platform === '京东' ? 'createJm' : 'createTaobao');
