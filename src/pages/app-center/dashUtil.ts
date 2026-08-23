/* 数据看板共享工具（1:1 移植自 Dashboard.tsx 模块级辅助） */
import type { AppItem } from './data';

/* 全局时间范围：所有指标按范围联动 */
export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const FACTOR: Record<Range, number> = { 7: 0.12, 30: 0.35, 90: 0.72 };

export const fmt = (n: number) => (n >= 10000 ? `${(n / 10000).toFixed(1)}w` : `${n}`);

/* 按应用确定性扰动：不同范围的人次拆分稳定且有差异 */
export const noise = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997;
  return 0.8 + (h % 40) / 100;
};

/* 按应用确定性每日波动：同一日期同一值，任意窗口下曲线稳定 */
export const dayFactor = (id: string, daysAgo: number) => {
  let h = 0;
  const s = `${id}:${daysAgo}`;
  for (let c = 0; c < s.length; c++) h = (h * 31 + s.charCodeAt(c)) % 997;
  return 0.5 + (h % 100) / 100;
};

export const daySeries = (id: string, use: number, n: number, off: number) => {
  const avg = use / n || 0;
  return Array.from({ length: n }, (_, i) => avg * dayFactor(id, off + n - 1 - i));
};

/* 任意天数的总人次折算系数（7/30/90 锚点分段线性插值） */
export const factorOf = (n: number) => (n <= 7 ? 0.12 : n <= 30 ? 0.12 + ((n - 7) / 23) * 0.23 : n <= 90 ? 0.35 + ((n - 30) / 60) * 0.37 : 0.72);

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type Row = { app: AppItem; use: number; share: number; avg: number; cnt: number; goodRate: number };
