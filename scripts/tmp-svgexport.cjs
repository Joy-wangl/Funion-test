/* 临时脚本：导出运营中心侧边栏 10 个图标的 默认/选中 双态 SVG */
const fs = require('fs');

const OUT = 'd:/Qoder/Funion/ops-side-icons';
const DEFAULT = '#667082';
const ACTIVE = '#ff5f62';

/* 与 OpsCenter.vue 侧边栏 nav-ico 内联 SVG 一一对应 */
const icons = [
  ['运营驾驶舱', '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'],
  ['运营管理', '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 12h18"/>'],
  ['商机中心', '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/>'],
  ['店铺商品', '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>'],
  ['商品创建', '<circle cx="12" cy="12" r="9"/><path d="M12 8v8"/><path d="M8 12h8"/>'],
  ['任务中心', '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 13 2 2 4-4"/>'],
  ['商品策略', '<path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 5-6"/>'],
  ['AI助手', '<path d="M12 4l1.8 4.7 4.7 1.8-4.7 1.8L12 17l-1.8-4.7-4.7-1.8 4.7-1.8Z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>'],
  ['自动化中心', '<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/>'],
  ['权限设置', '<path d="M12 3l7 3v6c0 4.4-2.9 7.5-7 9-4.1-1.5-7-4.6-7-9V6Z"/><path d="m9.3 11.8 2 2 3.4-3.6"/>'],
];

const svgOf = (inner, color) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner.replaceAll('currentColor', color)}</svg>\n`;

fs.mkdirSync(OUT, { recursive: true });
let n = 0;
for (const [name, inner] of icons) {
  fs.writeFileSync(`${OUT}/${name}-默认.svg`, svgOf(inner, DEFAULT));
  fs.writeFileSync(`${OUT}/${name}-选中.svg`, svgOf(inner, ACTIVE));
  n += 2;
}
console.log(`exported ${n} svg files -> ${OUT}`);
