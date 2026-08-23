/* =========================================================
   Funion 权限管理 · 公共图标（对应 shared.tsx 图标组件）
   ========================================================= */
import { h } from 'vue';

export const IconCheck = () =>
  h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '3' }, [
    h('path', { d: 'M20 6L9 17l-5-5' }),
  ]);

export const IconX = () =>
  h('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, [
    h('path', { d: 'M18 6L6 18M6 6l12 12' }),
  ]);

export const IconXsm = () =>
  h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.4' }, [
    h('path', { d: 'M18 6L6 18M6 6l12 12' }),
  ]);

export const IconArrow = () =>
  h('svg', { width: '12', height: '12', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2.4' }, [
    h('path', { d: 'M9 6l6 6-6 6' }),
  ]);

export const IconMore = () =>
  h('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'currentColor' }, [
    h('circle', { cx: '5', cy: '12', r: '1.6' }),
    h('circle', { cx: '12', cy: '12', r: '1.6' }),
    h('circle', { cx: '19', cy: '12', r: '1.6' }),
  ]);

export const IconSearch = () =>
  h('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, [
    h('circle', { cx: '11', cy: '11', r: '7' }),
    h('path', { d: 'M21 21l-4-4' }),
  ]);

export const IconOk = () =>
  h('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, [
    h('circle', { cx: '12', cy: '12', r: '9' }),
    h('path', { d: 'M8 12l3 3 5-6' }),
  ]);

export const IconWarn = () =>
  h('svg', { width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, [
    h('path', { d: 'M12 9v4M12 17h.01' }),
    h('path', { d: 'M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z' }),
  ]);

export const IconSync = () =>
  h('svg', { class: 'ic', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, [
    h('path', { d: 'M21 12a9 9 0 11-3-6.7L21 8' }),
    h('path', { d: 'M21 3v5h-5' }),
  ]);

export const IconDept = () =>
  h('svg', { width: '14', height: '14', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' }, [
    h('rect', { x: '9', y: '3', width: '6', height: '5', rx: '1' }),
    h('rect', { x: '3', y: '16', width: '6', height: '5', rx: '1' }),
    h('rect', { x: '15', y: '16', width: '6', height: '5', rx: '1' }),
    h('path', { d: 'M12 8v4M6 16v-4h12v4' }),
  ]);
