/* ---------- 品控-线上 模拟接口层（仅本模块使用）：种子数据视作 mock 数据库，列表/看板读取统一走 qcGet 模拟接口——
   带网络延时、响应信封（code/msg/data/traceId/cost）与调用日志（console 分组＋qcApiLog 环形记录），
   便于逐接口核对响应与界面取值是否准确、 drill-down 入参是否关联 ---------- */
import { ref } from 'vue';

export interface QcRes<T> { code: number; msg: string; data: T; traceId: string; cost: number; }
export interface QcApiCall { traceId: string; path: string; params: unknown; cost: number; summary: string; time: string; }

export const qcApiLog = ref<QcApiCall[]>([]);
let seq = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const qcGet = async <T>(path: string, params: unknown, compute: () => T): Promise<QcRes<T>> => {
  const t0 = performance.now();
  await sleep(120 + Math.round(Math.random() * 160));
  const data = compute();
  const cost = Math.round(performance.now() - t0);
  const traceId = `qc-${Date.now().toString(36)}-${(++seq).toString(36)}`;
  const summary = Array.isArray(data) ? `${data.length} 条` : data && typeof data === 'object' ? 'object' : String(data);
  console.groupCollapsed(`[品控-mock] GET ${path} · ${cost}ms · ${summary}`);
  console.log('params', params);
  console.log('data', data);
  console.groupEnd();
  qcApiLog.value = [{ traceId, path, params, cost, summary, time: new Date().toLocaleTimeString() }, ...qcApiLog.value].slice(0, 50);
  return { code: 0, msg: 'success', data, traceId, cost };
};
