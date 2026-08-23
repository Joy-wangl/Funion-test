/* 应用中心共享辅助（图标/时间/文案拆条）—— 1:1 移植自 AppCenter.tsx */
import type { AppItem, IconSpec, Preview } from './data';

export const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
};

/* 评论时间：x 天前 / x 个月前 / x 年前 */
export const agoText = (date: string): string => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date.replace(/\//g, '-')).getTime()) / 86400000));
  if (days < 1) return '今天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
};

/* 新功能/更新内容拆条（一次只发一条，按逗号拆成多条变更点） */
export const featLinesOf = (a: AppItem): string[] => {
  const lines = (a.releaseNote ?? '性能优化与体验改进。').split(/[，,、]/).map((s) => s.trim()).filter(Boolean);
  return lines.length ? lines : ['性能优化与体验改进。'];
};

/* ---------- 小图标 ---------- */
export const IC = {
  search: 'M11 4a7 7 0 110 14 7 7 0 010-14zm9 16l-4.35-4.35',
  clear: 'M6 6l12 12M18 6L6 18',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M15 5l-7 7 7 7',
  chevR: 'M9 5l7 7-7 7',
  caret: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  sort: 'M8 5v14M8 5L5 8m3-3l3 3m8 11V5m0 14l-3-3m3 3l3-3',
  cat: 'M4 5h16v14H4V5zm0 4h16M9 9v10',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  trash: 'M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v13a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z',
  check: 'M20 6L9 17l-5-5',
  home: 'M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5',
  all: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  /* 类目专属图标（iconfont 风格内联） */
  db: 'M12 3c4.42 0 8 1.34 8 3s-3.58 3-8 3-8-1.34-8-3 3.58-3 8-3zM4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3',
  plug: 'M9 3v5m6-5v5M6 8h12v3a6 6 0 01-6 6 6 6 0 01-6-6V8zm6 9v4',
  pen: 'M17 3l4 4L8 20l-5 1 1-5L17 3z',
  tool: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z',
  robot: 'M12 2v3M9 5h6a5 5 0 015 5v5a5 5 0 01-5 5H9a5 5 0 01-5-5v-5a5 5 0 015-5zM9.5 12.5h.01M14.5 12.5h.01M10 16h4',
  star: 'M12 3l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.9l-5.8 3 1.1-6.45L2.6 9.85l6.5-.95L12 3z',
  /* 收藏星：iconfont 圆角实心星（1024 视图） */
  starFill: 'M908.1 353.1l-253.9-36.9L540.7 86.1c-3.1-6.3-8.2-11.4-14.5-14.5-15.8-7.8-35-1.3-42.9 14.5L369.8 316.2l-253.9 36.9c-7 1-13.4 4.3-18.3 9.3a32.05 32.05 0 00.6 45.3l183.7 179.1-43.4 252.9a32.07 32.07 0 0046.5 33.8L512 754l227.1 119.4c6.2 3.3 13.4 4.4 20.3 3.2 17.4-3 29.1-19.5 26.1-36.9l-43.4-252.9 183.7-179.1c5-4.9 8.3-11.3 9.3-18.3 2.5-17.5-9.6-33.7-27-36.3z',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0',
  trophy: 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 01-10 0V4zm0 1H4v2a3 3 0 003 3m10-5h3v2a3 3 0 01-3 3',
  clock: 'M12 3a9 9 0 109 9 9 9 0 00-9-9zm0 4v5l3 2',
  flame: 'M12 3s5 4.5 5 9a5 5 0 01-10 0c0-4.5 5-9 5-9zm0 8s-2 1.8-2 3.5a2 2 0 004 0c0-1.7-2-3.5-2-3.5z',
  mail: 'M4 6h16v12H4V6zm0 2l8 6 8-6',
  folder: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z',
};

/* 类目 → 专属图标映射 */
export const CAT_ICONS: Record<string, string> = {
  数据管理类: IC.db,
  浏览器插件: IC.plug,
  绘图工具: IC.pen,
  实用小工具: IC.tool,
  Agent工具: IC.robot,
};

/* 类目图标库：iconfont 风格内联图形 + 支持上传自定义 */
export const ICON_LIB: { k: string; d: string }[] = [
  { k: 'folder', d: IC.folder }, { k: 'home', d: IC.home }, { k: 'all', d: IC.all }, { k: 'db', d: IC.db },
  { k: 'plug', d: IC.plug }, { k: 'pen', d: IC.pen }, { k: 'tool', d: IC.tool }, { k: 'robot', d: IC.robot },
  { k: 'star', d: IC.star }, { k: 'bell', d: IC.bell }, { k: 'trophy', d: IC.trophy }, { k: 'clock', d: IC.clock },
  { k: 'flame', d: IC.flame }, { k: 'mail', d: IC.mail },
];
export const GLYPHS: Record<string, string> = Object.fromEntries(ICON_LIB.map((g) => [g.k, g.d]));
export const isImgIcon = (s: string) => s.startsWith('data:') || s.startsWith('/');
export interface CatDraft { n: string; ic: string }

/* 上传新创作 / 编辑应用：表单提交载荷（校验与应用在 AppCenter.vue 内，等价 React submitCreate） */
export interface AcForm {
  name: string;
  desc: string;
  icon: IconSpec | null;
  previews: Preview[];
  cat: string;
  note: string;
  tags: string[];
  type: string;
  deploy: 'link' | 'file';
  link: string;
  file: string;
  run: string;
  version: string;
  publish: 'online' | 'test';
  perm: string;
}
