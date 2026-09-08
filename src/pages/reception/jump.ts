/* 聚合接待跨模块跳转信号（模块级单例）：
   知识库侧「宝妈接待 › 智能分流」按钮写入 { 策略卡 id, 递增 seq }，
   ReceptionCenter 监听后切到智能分流视图并打开对应策略卡抽屉 */
import { ref } from 'vue';

export const receptionJump = ref<{ id: number | null; seq: number }>({ id: null, seq: 0 });
