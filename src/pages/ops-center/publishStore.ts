import { ref } from 'vue';

export interface PublishItem {
  id: number;
  shop: string;
  platform: string;
  /** confirm=命中风险管控待二次确认；cancelled=风控取消（逐店铺条目粒度，与任务中心一品一店一任务口径一致） */
  status: 'pending' | 'success' | 'failed' | 'confirm' | 'cancelled';
  reason?: string;
}

/** 人工介入信息：RPA 发布遇验证码等需人工处理场景 */
export interface PublishIntervene {
  /** 弹出验证码的店铺 */
  shop: string;
  platform: string;
  /** 演示用验证码（介入弹窗输入一致即通过） */
  code: string;
}

/** 风控命中：发布任务命中公司风险项（垃圾品管控） */
export interface PublishRisk {
  /** confirm=待二次确认（风险管控商品，上架可能亏损）；cancelled=风控自动取消（不允许上架） */
  status: 'confirm' | 'cancelled';
  reason: string;
}

export interface PublishTask {
  id: number;
  productName: string;
  createdAt: number;
  items: PublishItem[];
  /** 需人工介入：任务暂停，处理完成后自动恢复发布 */
  intervene?: PublishIntervene | null;
  /** 风控态：命中风险项时任务暂停（待确认）或终止（风控取消） */
  risk?: PublishRisk | null;
}

/* 模块级单例：任务列表跨组件重挂载 / 面板关闭均保留，支持多商品多任务累积 */
export const publishTasks = ref<PublishTask[]>([]);
export const publishVisible = ref(false);

let seq = 0;

/* 新建一个发布任务并返回响应式引用（后续状态变更须用返回值，勿用入参原始对象） */
export const addPublishTask = (productName: string, items: PublishItem[]): PublishTask => {
  const task: PublishTask = { id: ++seq, productName, createdAt: Date.now(), items };
  publishTasks.value.push(task);
  publishVisible.value = true;
  return publishTasks.value[publishTasks.value.length - 1];
};

export const clearPublishTasks = () => { publishTasks.value = []; };
export const closePublishPanel = () => { publishVisible.value = false; };

/* ===== 人工介入：创建侧登记续跑钩子，验证通过后清介入态并恢复发布 ===== */
const resumeHooks = new Map<number, () => void>();
export const setPublishResume = (taskId: number, fn: () => void) => { resumeHooks.set(taskId, fn); };
export const resolvePublishIntervene = (taskId: number) => {
  const t = publishTasks.value.find((x) => x.id === taskId);
  if (!t) return;
  t.intervene = null;
  const fn = resumeHooks.get(taskId);
  if (fn) {
    resumeHooks.delete(taskId);
    fn();
  }
};

/* ===== 风控二次确认（条目级）：待确认条目「继续上架」恢复发布 / 「取消任务」终止整个任务，未发布条目一并风控取消 ===== */
const riskHooks = new Map<number, () => void>();
export const setPublishRiskResume = (taskId: number, fn: () => void) => { riskHooks.set(taskId, fn); };
export const resolvePublishRisk = (taskId: number) => {
  const t = publishTasks.value.find((x) => x.id === taskId);
  if (!t) return;
  const item = t.items.find((i) => i.status === 'confirm');
  if (item) {
    item.status = 'pending';
    item.reason = undefined;
  }
  const fn = riskHooks.get(taskId);
  if (fn) {
    riskHooks.delete(taskId);
    fn();
  }
};
export const cancelPublishRisk = (taskId: number, reason: string) => {
  const t = publishTasks.value.find((x) => x.id === taskId);
  if (!t) return;
  for (const i of t.items) {
    if (i.status === 'pending' || i.status === 'confirm') {
      i.status = 'cancelled';
      i.reason = reason;
    }
  }
  riskHooks.delete(taskId);
};
