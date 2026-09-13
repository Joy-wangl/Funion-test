import type { SubTask } from './data';

/** 统一节点展示态：dot=圆点样式，v=结果文案，cls=文案样式 */
export interface StepView {
  dot: string;
  v: string;
  cls: string;
}

const ok: StepView = { dot: 'ok', v: '成功', cls: '' };
const dash: StepView = { dot: 'wait', v: '–', cls: 'wait' };
/* 参照版：节点结果文案统一黑字，红/蓝仅体现在圆点 */
const fail: StepView = { dot: 'fail', v: '失败', cls: '' };
const wait: StepView = { dot: 'wait', v: '待执行', cls: 'wait' };
const confirmV: StepView = { dot: 'confirm', v: '待确认', cls: 'confirm' };
const cancelledV: StepView = { dot: 'wait', v: '已取消', cls: 'wait' };

/** 发布/铺货类任务：获取链接信息下增加「校验管控商品」节点 */
const PUB_TYPES = ['商品发布', '商品铺货', '快速铺货'];
/** 节点标签集：发布/铺货类四节点（含校验管控商品），其余三节点 */
export const stepLabelsOf = (type: string): string[] =>
  PUB_TYPES.includes(type)
    ? ['获取链接信息', '校验管控商品', '定价策略计算', '商品发布店铺']
    : ['获取链接信息', '定价策略计算', '商品发布店铺'];
const isPub = (type: string) => PUB_TYPES.includes(type);

/** 校验管控商品节点结果：x/y 通过；失败/待确认时追加计数 */
function verifyOf(s: SubTask, state: 'ok' | 'fail' | 'confirm'): StepView {
  const v =
    s.verify ??
    (state === 'ok'
      ? { total: 4, pass: 4, fail: 0, pending: 0 }
      : state === 'fail'
        ? { total: 4, pass: 0, fail: 1, pending: 0 }
        : { total: 4, pass: 0, fail: 0, pending: 1 });
  const txt =
    state === 'ok'
      ? `${v.pass}/${v.total} 通过`
      : state === 'fail'
        ? `${v.pass}/${v.total} 通过 ${v.fail} 失败`
        : `${v.pass}/${v.total} 通过 ${v.pending} 待确认`;
  return { dot: state === 'ok' ? 'ok' : state === 'fail' ? 'fail' : 'confirm', v: txt, cls: '' };
}

/** 统一节点（除末节点外）：校验管控商品节点位置随任务类型 */
export function headStepsOf(s: SubTask, type = ''): StepView[] {
  const n = stepLabelsOf(type).length - 1;
  const rest = (k: number) => Array.from({ length: k }, () => dash);
  /* 队列中：首节点待执行，后续节点未触及 */
  if (s.status === 'queued') return [wait, ...rest(n - 1)];
  /* 待确认：发布/铺货类暂停在校验管控商品节点（命中待确认商品），其余暂停在首节点 */
  if (s.status === 'confirm') return isPub(type) ? [ok, verifyOf(s, 'confirm'), ...rest(n - 2)] : [confirmV, ...rest(n - 1)];
  /* 已取消（风控/手动）：任务终止，店铺集合未触达 */
  if (s.status === 'cancelled') return [cancelledV, ...rest(n - 1)];
  /* 执行失败且失败在统一节点：失败节点及其后续统一节点均失败（校验节点展示通过/失败计数） */
  if (s.status === 'failed' && s.failStep !== undefined && s.failStep < n) {
    return Array.from({ length: n }, (_, i) => (i < s.failStep! ? ok : i === s.failStep && i === 1 ? verifyOf(s, 'fail') : fail));
  }
  /* 已进入末节点：统一节点均通过 */
  return Array.from({ length: n }, (_, i) => (i === 1 && isPub(type) ? verifyOf(s, 'ok') : ok));
}

/** 末节点（商品发布店铺）：一品一店一任务，直接取单店行状态 */
export function step3Of(s: SubTask, type = ''): StepView {
  if (s.status === 'queued') return wait;
  /* 待确认：发布/铺货类暂停在校验节点，店铺未触达 */
  if (s.status === 'confirm') return isPub(type) ? dash : confirmV;
  if (s.status === 'cancelled') return cancelledV;
  /* 统一节点失败：店铺未触达 */
  if (s.status === 'failed' && s.failStep !== undefined) return dash;
  if (s.status === 'running') return { dot: '', v: '执行中', cls: '' };
  if (s.status === 'success') return ok;
  return fail;
}

/** 首节点（获取链接信息）是否失败：失败任务不提供商品创建详情入口 */
export const firstStepFailed = (s: SubTask, type = '') => headStepsOf(s, type)[0].dot === 'fail';

/** 商品创建子页键：与侧边栏商品创建分组一致 */
export type CreatePageKey = 'createTaobao' | 'createVideo' | 'createJm';
/** 按发布平台映射商品创建子页（微信视频号小店→视频号、京东→京麦、其余→淘宝） */
export const createPageOf = (platform: string): CreatePageKey =>
  (platform === '微信视频号小店' ? 'createVideo' : platform === '京东' ? 'createJm' : 'createTaobao');
