import type { SubTask } from './data';

/** 子任务三节点状态（获取链接信息/定价策略计算/商品发布店铺），由任务状态推导 */
export function stepsOf(s: SubTask) {
  const ok = { dot: 'ok', v: '成功', cls: '' };
  const dash = { dot: 'wait', v: '–', cls: 'wait' };
  /* 队列中：首节点待执行，后续未触及 */
  if (s.status === 'queued') return [{ dot: 'wait', v: '待执行', cls: 'wait' }, dash, dash];
  if (s.status === 'running') return [ok, ok, { dot: 'ok', v: '执行中', cls: '' }];
  /* 已完成：三节点全部通过 */
  if (s.status === 'success') return [ok, ok, ok];
  /* 执行失败：失败节点及其后续节点均失败 */
  const f = s.failStep ?? 2;
  return [0, 1, 2].map((i) => (i < f ? ok : { dot: 'fail', v: '执行失败', cls: 'fail' }));
}

export const stepLabels = ['获取链接信息', '定价策略计算', '商品发布店铺'];
