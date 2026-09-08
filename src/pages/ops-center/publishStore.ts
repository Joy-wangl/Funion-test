import { ref } from 'vue';

export interface PublishItem {
  id: number;
  shop: string;
  platform: string;
  status: 'pending' | 'success' | 'failed';
  reason?: string;
}

export interface PublishTask {
  id: number;
  productName: string;
  createdAt: number;
  items: PublishItem[];
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
