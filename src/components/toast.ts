/* 全局 toast（模块级单例，等价 React useToasts）
   标准横幅式提示，按场景区分四型：
   success=操作完成确认 / error=失败或校验拦截 / warning=功能不可用·需注意 / info=中性系统通知 */
import { ref } from 'vue';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem { id: number; msg: string; type: ToastType }

let toastSeq = 0;
export const toasts = ref<ToastItem[]>([]);

export const pushToast = (msg: string, type: ToastType = 'success') => {
  const id = ++toastSeq;
  toasts.value = [...toasts.value, { id, msg, type }];
  setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id); }, 2600);
};
