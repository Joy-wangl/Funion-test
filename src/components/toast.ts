/* 全局 toast（模块级单例，等价 React useToasts） */
import { ref } from 'vue';

export interface ToastItem { id: number; msg: string; type: 'success' | 'error' }

let toastSeq = 0;
export const toasts = ref<ToastItem[]>([]);

export const pushToast = (msg: string, type: 'success' | 'error' = 'success') => {
  const id = ++toastSeq;
  toasts.value = [...toasts.value, { id, msg, type }];
  setTimeout(() => { toasts.value = toasts.value.filter((t) => t.id !== id); }, 2400);
};
