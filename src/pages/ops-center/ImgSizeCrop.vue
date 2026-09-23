<script setup lang="ts">
/** 预览图「修改尺寸」共享组件（淘宝/视频号详情、京麦详情、素材中心生成图查看器同款）：
 *  预设尺寸→调整裁剪：固定比例裁剪框内拖拽平移图片、滚轮与按钮缩放，确认后裁出目标尺寸；
 *  自由裁剪→PS 式选区：图上拖拽画选区（按住 Shift 为 1:1）、八向手柄调整（按住 Shift 等比）、
 *  选区内部拖拽移动，确认后按选区裁出；填写自定义输出宽高时选区锁定该比例并按该尺寸输出；
 *  工作层开启时隐藏底层预览图与工具条避免双层重叠；面板与工作层均 Teleport 到预览暗幕。 */
import { computed, onUnmounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';

const props = defineProps<{
  /** 面板开合（v-model:open，由父级工具条「修改尺寸」按钮控制） */
  open: boolean;
  /** 当前预览图 src */
  src: string;
  /** 预览缩放（父级工具条倍率；工作层独立渲染于暗幕，不受其影响） */
  zoom: number;
  /** 预览 <img> 元素（面板/工作层 Teleport 锚点） */
  imgEl: HTMLImageElement | null;
  /** 裁剪完成回写：(新图 url, 输出宽, 输出高) */
  commit: (url: string, w: number, h: number) => void;
}>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

/* 面板 Teleport 目标：预览暗幕（bottom 76px 悬浮于工具条上方） */
const maskEl = computed(() => (props.imgEl?.closest('.cpd-preview-mask') as HTMLElement | null) ?? null);

/* 市场常见尺寸预设：尺寸＋比例两行展示，点击进调整裁剪 */
const SIZE_PRESETS = [
  { w: 800, h: 800, note: '1:1' },
  { w: 750, h: 1000, note: '3:4' },
  { w: 1080, h: 1620, note: '2:3' },
  { w: 1280, h: 720, note: '16:9' },
  { w: 750, h: 750, note: '1:1' },
  { w: 640, h: 640, note: '1:1' },
  { w: 1920, h: 1080, note: '16:9' },
  { w: 1080, h: 608, note: '16:9' },
];
const sizeBusy = ref(false);
const sizeOrigin = ref<{ w: number; h: number } | null>(null);
const customW = ref('');
const customH = ref('');
/* 自定义输出宽高两者均有效填写时：锁定选区比例并作为输出尺寸 */
const lockRatio = computed(() => {
  const w = Math.round(Number(customW.value));
  const h = Math.round(Number(customH.value));
  if (!customW.value || !customH.value) return null;
  if (!w || !h || w < 10 || h < 10 || w > 5000 || h > 5000) return null;
  return w / h;
});

/* ---------- 工作层总开关：开启时暗幕加类隐藏底层预览图与工具条，避免双层图重叠 ---------- */
const adjust = ref(false);
const selecting = ref(false);
watch(() => adjust.value || selecting.value, (on) => {
  maskEl.value?.classList.toggle('cpd-crop-on', on);
});
onUnmounted(() => { maskEl.value?.classList.remove('cpd-crop-on'); });

const maskPos = () => {
  const r = maskEl.value!.getBoundingClientRect();
  return { x: r.left, y: r.top };
};

/* ---------- 预设调整裁剪：固定比例裁剪框＋图片平移/缩放；坐标空间＝暗幕 px ---------- */
const adjOut = ref({ w: 0, h: 0 });
const frame = ref({ x: 0, y: 0, w: 0, h: 0 });
/* 原图自然尺寸；base＝图片在裁剪框内 contain 的显示宽高，s0＝恰好 cover 裁剪框的初始倍率 */
const adjNat = ref({ w: 0, h: 0 });
const adjBase = ref({ bw: 0, bh: 0, s0: 1, tx0: 0, ty0: 0 });
/* 当前变换：倍率 s＋图左上角 tx/ty */
const adj = ref({ s: 1, tx: 0, ty: 0 });
const adjPct = computed(() => Math.round((adj.value.s / (adjBase.value.s0 || 1)) * 100));
let adjImgEl: HTMLImageElement | null = null;
let panDrag: { px: number; py: number; tx: number; ty: number } | null = null;

/* 平移约束：图片矩形必须始终覆盖裁剪框（框内不露空） */
const clampPan = (tx: number, ty: number, s: number) => {
  const { bw, bh } = adjBase.value;
  const f = frame.value;
  const iw = bw * s;
  const ih = bh * s;
  return {
    tx: Math.min(Math.max(tx, f.x + f.w - iw), f.x),
    ty: Math.min(Math.max(ty, f.y + f.h - ih), f.y),
  };
};
const enterAdjust = (w: number, h: number) => {
  if (sizeBusy.value || !props.src || !maskEl.value) return;
  const mr = maskEl.value.getBoundingClientRect();
  /* 裁剪框：目标比例下可用区最大矩形；水平居中、垂直上偏避开底部工具条与调整条 */
  const availW = Math.max(200, mr.width - 240);
  const availH = Math.max(200, mr.height - 260);
  let fw = availW;
  let fh = fw / (w / h);
  if (fh > availH) { fh = availH; fw = fh * (w / h); }
  const f = { x: (mr.width - fw) / 2, y: (mr.height - 100 - fh) / 2 + 20, w: fw, h: fh };
  const img = new Image();
  img.onload = () => {
    adjImgEl = img;
    adjNat.value = { w: img.naturalWidth, h: img.naturalHeight };
    let bw = f.w;
    let bh = bw / (img.naturalWidth / img.naturalHeight);
    if (bh > f.h) { bh = f.h; bw = bh * (img.naturalWidth / img.naturalHeight); }
    const s0 = Math.max(f.w / bw, f.h / bh);
    const tx0 = f.x + (f.w - bw * s0) / 2;
    const ty0 = f.y + (f.h - bh * s0) / 2;
    adjBase.value = { bw, bh, s0, tx0, ty0 };
    frame.value = f;
    adjOut.value = { w, h };
    adj.value = { s: s0, tx: tx0, ty: ty0 };
    adjust.value = true;
  };
  img.onerror = () => pushToast('图片加载失败，无法裁剪', 'error');
  img.src = props.src;
};
/* 缩放：锚点不动（滚轮=指针处，按钮=裁剪框中心），倍率限 [s0, 8×s0] */
const zoomAt = (px: number, py: number, factor: number) => {
  const { s, tx, ty } = adj.value;
  const ns = Math.min(Math.max(s * factor, adjBase.value.s0), adjBase.value.s0 * 8);
  const k = ns / s;
  const c = clampPan(px - (px - tx) * k, py - (py - ty) * k, ns);
  adj.value = { s: ns, tx: c.tx, ty: c.ty };
};
const onWheel = (e: WheelEvent) => {
  const m = maskPos();
  zoomAt(e.clientX - m.x, e.clientY - m.y, e.deltaY < 0 ? 1.1 : 1 / 1.1);
};
const zoomBtn = (factor: number) => {
  const f = frame.value;
  zoomAt(f.x + f.w / 2, f.y + f.h / 2, factor);
};
const onPanDown = (e: MouseEvent) => {
  panDrag = { px: e.clientX, py: e.clientY, tx: adj.value.tx, ty: adj.value.ty };
  window.addEventListener('mousemove', onPanMove);
  window.addEventListener('mouseup', endPan);
};
const onPanMove = (e: MouseEvent) => {
  if (!panDrag) return;
  const c = clampPan(panDrag.tx + (e.clientX - panDrag.px), panDrag.ty + (e.clientY - panDrag.py), adj.value.s);
  adj.value = { s: adj.value.s, tx: c.tx, ty: c.ty };
};
const endPan = () => {
  window.removeEventListener('mousemove', onPanMove);
  window.removeEventListener('mouseup', endPan);
  panDrag = null;
};
const resetAdj = () => {
  const b = adjBase.value;
  adj.value = { s: b.s0, tx: b.tx0, ty: b.ty0 };
};
/* 确认裁剪：裁剪框区域换算原图像素 → canvas 输出目标尺寸 */
const confirmCrop = () => {
  if (sizeBusy.value || !adjImgEl) return;
  const { bw, bh } = adjBase.value;
  const { s, tx, ty } = adj.value;
  const f = frame.value;
  const iw = bw * s;
  const ih = bh * s;
  const nw = adjNat.value.w;
  const nh = adjNat.value.h;
  let sx = ((f.x - tx) / iw) * nw;
  let sy = ((f.y - ty) / ih) * nh;
  let sw = (f.w / iw) * nw;
  let sh = (f.h / ih) * nh;
  sx = Math.max(0, Math.min(sx, nw - 1));
  sy = Math.max(0, Math.min(sy, nh - 1));
  sw = Math.max(1, Math.min(sw, nw - sx));
  sh = Math.max(1, Math.min(sh, nh - sy));
  const ow = adjOut.value.w;
  const oh = adjOut.value.h;
  sizeBusy.value = true;
  const cv = document.createElement('canvas');
  cv.width = ow;
  cv.height = oh;
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.drawImage(adjImgEl, sx, sy, sw, sh, 0, 0, ow, oh);
    const url = cv.toDataURL('image/png');
    sizeOrigin.value = { w: ow, h: oh };
    props.commit(url, ow, oh);
    pushToast(`已修改尺寸为 ${ow}×${oh}`);
  }
  sizeBusy.value = false;
  adjust.value = false;
  emit('update:open', false);
};

/* ---------- 自由选区裁剪：PS 式拖拽画选区＋Shift 等比；坐标空间＝暗幕 px ---------- */
type Rect = { x: number; y: number; w: number; h: number };
const SEL_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HD_POS: Record<string, string> = {
  nw: 'left:0;top:0', n: 'left:50%;top:0', ne: 'left:100%;top:0', e: 'left:100%;top:50%',
  se: 'left:100%;top:100%', s: 'left:50%;top:100%', sw: 'left:0;top:100%', w: 'left:0;top:50%',
};
/* 图片 contain 显示矩形＋显示/自然像素比 */
const selImg = ref({ x: 0, y: 0, w: 0, h: 0, scale: 1 });
const selRect = ref<Rect | null>(null);
const drawing = ref(false);
const selNat = computed(() => {
  const r = selRect.value;
  if (!r) return { w: 0, h: 0 };
  return { w: Math.max(1, Math.round(r.w / selImg.value.scale)), h: Math.max(1, Math.round(r.h / selImg.value.scale)) };
});
let selImgEl: HTMLImageElement | null = null;
let selDrag: { mode: 'draw' | 'move' | string; px: number; py: number; rect: Rect } | null = null;

const clampNum = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
/* 进入选区态：图片 contain 于可用区；填了自定义宽高则校验并锁定比例 */
const enterSelect = () => {
  if (sizeBusy.value || !props.src || !maskEl.value) return;
  if (customW.value || customH.value) {
    const w = Math.round(Number(customW.value));
    const h = Math.round(Number(customH.value));
    if (!customW.value || !customH.value || !w || !h || w < 10 || h < 10 || w > 5000 || h > 5000) { pushToast('自定义尺寸需在 10–5000px 之间', 'warning'); return; }
  }
  const mr = maskEl.value.getBoundingClientRect();
  const availW = Math.max(200, mr.width - 240);
  const availH = Math.max(200, mr.height - 260);
  const img = new Image();
  img.onload = () => {
    selImgEl = img;
    let w = availW;
    let h = w / (img.naturalWidth / img.naturalHeight);
    if (h > availH) { h = availH; w = h * (img.naturalWidth / img.naturalHeight); }
    selImg.value = { x: (mr.width - w) / 2, y: (mr.height - 100 - h) / 2 + 20, w, h, scale: w / img.naturalWidth };
    selRect.value = null;
    drawing.value = false;
    selecting.value = true;
  };
  img.onerror = () => pushToast('图片加载失败，无法裁剪', 'error');
  img.src = props.src;
};
const addSelListeners = () => {
  window.addEventListener('mousemove', onSelMove);
  window.addEventListener('mouseup', onSelUp);
};
/* 空白处按下＝画新选区 */
const onSelDown = (e: MouseEvent) => {
  const m = maskPos();
  const px = e.clientX - m.x;
  const py = e.clientY - m.y;
  selDrag = { mode: 'draw', px, py, rect: { x: px, y: py, w: 0, h: 0 } };
  selRect.value = { x: px, y: py, w: 0, h: 0 };
  drawing.value = true;
  addSelListeners();
};
/* 选区内部按下＝整体移动 */
const onSelMoveDown = (e: MouseEvent) => {
  if (!selRect.value) return;
  const m = maskPos();
  selDrag = { mode: 'move', px: e.clientX - m.x, py: e.clientY - m.y, rect: { ...selRect.value } };
  addSelListeners();
};
/* 手柄按下＝按该向调整 */
const onHandleDown = (hd: string, e: MouseEvent) => {
  if (!selRect.value) return;
  const m = maskPos();
  selDrag = { mode: hd, px: e.clientX - m.x, py: e.clientY - m.y, rect: { ...selRect.value } };
  addSelListeners();
};
/* 手柄调整：角手柄以对角为锚、边手柄以中心为锚；Shift 或锁定比例时等比 */
const resizeByHandle = (hd: string, px: number, py: number, shift: boolean, r0: Rect): Rect => {
  const g = selImg.value;
  const ratio = shift || lockRatio.value !== null ? r0.w / r0.h : 0;
  if (ratio && hd.length === 2) {
    const ax = hd.includes('w') ? r0.x + r0.w : r0.x;
    const ay = hd.includes('n') ? r0.y + r0.h : r0.y;
    const sgnX = hd.includes('w') ? -1 : 1;
    const sgnY = hd.includes('n') ? -1 : 1;
    let nw = Math.abs(px - ax);
    let nh = Math.abs(py - ay);
    if (nw / ratio > nh) nh = nw / ratio; else nw = nh * ratio;
    const maxW = sgnX > 0 ? g.x + g.w - ax : ax - g.x;
    const maxH = sgnY > 0 ? g.y + g.h - ay : ay - g.y;
    if (nw > maxW) { nw = maxW; nh = nw / ratio; }
    if (nh > maxH) { nh = maxH; nw = nh * ratio; }
    return { x: sgnX > 0 ? ax : ax - nw, y: sgnY > 0 ? ay : ay - nh, w: nw, h: nh };
  }
  if (ratio) {
    const cx = r0.x + r0.w / 2;
    const cy = r0.y + r0.h / 2;
    const vert = hd === 'n' || hd === 's';
    let k = vert ? Math.abs(py - cy) / (r0.h / 2) : Math.abs(px - cx) / (r0.w / 2);
    const maxK = vert
      ? Math.min(cy - g.y, g.y + g.h - cy) / (r0.h / 2)
      : Math.min(cx - g.x, g.x + g.w - cx) / (r0.w / 2);
    k = Math.min(k, maxK);
    return { x: cx - (r0.w * k) / 2, y: cy - (r0.h * k) / 2, w: r0.w * k, h: r0.h * k };
  }
  let x1 = r0.x;
  let y1 = r0.y;
  let x2 = r0.x + r0.w;
  let y2 = r0.y + r0.h;
  if (hd.includes('w')) x1 = px;
  if (hd.includes('e')) x2 = px;
  if (hd.includes('n')) y1 = py;
  if (hd.includes('s')) y2 = py;
  x1 = clampNum(x1, g.x, g.x + g.w);
  x2 = clampNum(x2, g.x, g.x + g.w);
  y1 = clampNum(y1, g.y, g.y + g.h);
  y2 = clampNum(y2, g.y, g.y + g.h);
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) };
};
const onSelMove = (e: MouseEvent) => {
  if (!selDrag) return;
  const m = maskPos();
  const px = e.clientX - m.x;
  const py = e.clientY - m.y;
  const g = selImg.value;
  if (selDrag.mode === 'draw') {
    const sx0 = clampNum(selDrag.px, g.x, g.x + g.w);
    const sy0 = clampNum(selDrag.py, g.y, g.y + g.h);
    let dx = clampNum(px, g.x, g.x + g.w) - sx0;
    let dy = clampNum(py, g.y, g.y + g.h) - sy0;
    let w = Math.abs(dx);
    let h = Math.abs(dy);
    if (e.shiftKey) { const s = Math.min(w, h); w = s; h = s; }
    else if (lockRatio.value) {
      h = w / lockRatio.value;
      const maxH = dy >= 0 ? g.y + g.h - sy0 : sy0 - g.y;
      if (h > maxH) { h = maxH; w = h * lockRatio.value; }
    }
    dx = dx < 0 ? -w : w;
    dy = dy < 0 ? -h : h;
    selRect.value = { x: dx < 0 ? sx0 - w : sx0, y: dy < 0 ? sy0 - h : sy0, w, h };
  } else if (selDrag.mode === 'move') {
    const r0 = selDrag.rect;
    const nx = clampNum(r0.x + (px - selDrag.px), g.x, g.x + g.w - r0.w);
    const ny = clampNum(r0.y + (py - selDrag.py), g.y, g.y + g.h - r0.h);
    selRect.value = { ...r0, x: nx, y: ny };
  } else {
    selRect.value = resizeByHandle(selDrag.mode, px, py, e.shiftKey, selDrag.rect);
  }
};
const onSelUp = () => {
  window.removeEventListener('mousemove', onSelMove);
  window.removeEventListener('mouseup', onSelUp);
  if (selDrag?.mode === 'draw' && selRect.value && (selRect.value.w < 8 || selRect.value.h < 8)) selRect.value = null;
  selDrag = null;
  drawing.value = false;
};
/* 确认选区裁剪：选区换算原图像素 → canvas 输出（自定义宽高或选区原生尺寸） */
const confirmSelect = () => {
  if (sizeBusy.value || !selImgEl || !selRect.value) return;
  const sc = selImg.value.scale;
  const r = selRect.value;
  const sx = (r.x - selImg.value.x) / sc;
  const sy = (r.y - selImg.value.y) / sc;
  const sw = Math.max(1, r.w / sc);
  const sh = Math.max(1, r.h / sc);
  const ow = lockRatio.value !== null ? Math.round(Number(customW.value)) : Math.max(1, Math.round(sw));
  const oh = lockRatio.value !== null ? Math.round(Number(customH.value)) : Math.max(1, Math.round(sh));
  sizeBusy.value = true;
  const cv = document.createElement('canvas');
  cv.width = ow;
  cv.height = oh;
  const ctx = cv.getContext('2d');
  if (ctx) {
    ctx.drawImage(selImgEl, sx, sy, sw, sh, 0, 0, ow, oh);
    const url = cv.toDataURL('image/png');
    sizeOrigin.value = { w: ow, h: oh };
    props.commit(url, ow, oh);
    pushToast(`已修改尺寸为 ${ow}×${oh}`);
  }
  sizeBusy.value = false;
  selecting.value = false;
  emit('update:open', false);
};

/* 面板开合：开时读当前图原尺寸并清空输出宽高；关时退出工作层 */
watch(() => props.open, (v) => {
  adjust.value = false;
  selecting.value = false;
  if (!v) return;
  customW.value = '';
  customH.value = '';
  const img = new Image();
  img.onload = () => { sizeOrigin.value = { w: img.naturalWidth, h: img.naturalHeight }; };
  img.src = props.src;
});
/* 切图：退出工作层并重读当前尺寸 */
watch(() => props.src, () => {
  adjust.value = false;
  selecting.value = false;
  if (!props.open) return;
  const img = new Image();
  img.onload = () => { sizeOrigin.value = { w: img.naturalWidth, h: img.naturalHeight }; };
  img.src = props.src;
});
</script>

<template>
  <!-- 预设调整裁剪层：固定比例裁剪框（框外压暗＋三分线），拖拽平移图片、滚轮/按钮缩放，确认裁出目标尺寸 -->
  <Teleport v-if="maskEl" :to="maskEl">
    <div v-if="adjust" class="cpd-crop-stage" @mousedown.prevent="onPanDown" @wheel.prevent="onWheel">
      <img
        class="cpd-crop-img"
        :src="src"
        draggable="false"
        alt=""
        :style="{ left: `${adj.tx}px`, top: `${adj.ty}px`, width: `${adjBase.bw * adj.s}px` }"
      />
      <div class="cpd-crop-frame" :style="{ left: `${frame.x}px`, top: `${frame.y}px`, width: `${frame.w}px`, height: `${frame.h}px` }" />
      <div class="cpd-crop-bar" @mousedown.stop @wheel.stop>
        <button type="button" class="cpd-crop-zbtn" title="缩小" @click="zoomBtn(1 / 1.15)">−</button>
        <span class="cpd-crop-pct">{{ adjPct }}%</span>
        <button type="button" class="cpd-crop-zbtn" title="放大" @click="zoomBtn(1.15)">＋</button>
        <button type="button" class="cpd-crop-rbtn" @click="resetAdj">重置</button>
        <button type="button" class="cpd-crop-rbtn" @click="adjust = false">取消</button>
        <button type="button" class="cpd-crop-ok" :disabled="sizeBusy" @click="confirmCrop">裁剪</button>
      </div>
    </div>

    <!-- 自由选区裁剪层：PS 式拖拽画选区（Shift 等比），八向手柄调整、选区内拖拽移动，确认按选区裁出 -->
    <div v-else-if="selecting" class="cpd-crop-stage sel" @mousedown.prevent="onSelDown">
      <img
        class="cpd-crop-selimg"
        :src="src"
        draggable="false"
        alt=""
        :style="{ left: `${selImg.x}px`, top: `${selImg.y}px`, width: `${selImg.w}px` }"
      />
      <div v-if="!selRect" class="cpd-crop-tip">拖拽选取裁剪区域，按住 Shift 等比</div>
      <template v-else>
        <div
          class="cpd-crop-sel"
          :style="{ left: `${selRect.x}px`, top: `${selRect.y}px`, width: `${selRect.w}px`, height: `${selRect.h}px` }"
          @mousedown.stop.prevent="onSelMoveDown"
        >
          <button
            v-for="hd in SEL_HANDLES"
            v-show="!drawing"
            :key="hd"
            type="button"
            :class="`cpd-crop-hd hd-${hd}`"
            :style="HD_POS[hd]"
            @mousedown.stop.prevent="onHandleDown(hd, $event)"
          />
        </div>
        <div v-show="!drawing" class="cpd-crop-bar" @mousedown.stop @wheel.stop>
          <span class="cpd-crop-pct">{{ selNat.w }}×{{ selNat.h }}</span>
          <button type="button" class="cpd-crop-rbtn" @click="selRect = null">重选</button>
          <button type="button" class="cpd-crop-rbtn" @click="selecting = false">取消</button>
          <button type="button" class="cpd-crop-ok" :disabled="sizeBusy" @click="confirmSelect">裁剪</button>
        </div>
      </template>
    </div>
  </Teleport>

  <!-- 修改尺寸面板：Teleport 到预览暗幕，工具条上方悬浮暗卡；市场常见尺寸预设＋自由选区裁剪 -->
  <Teleport v-if="maskEl" :to="maskEl">
    <div v-if="open && !adjust && !selecting" class="cpd-size-panel" @click.stop>
      <div class="cpd-size-head">
        <b>修改图片尺寸</b>
        <span v-if="sizeOrigin">当前 {{ sizeOrigin.w }}×{{ sizeOrigin.h }}</span>
        <button type="button" class="cpd-size-close" title="关闭" @click="emit('update:open', false)">✕</button>
      </div>
      <div class="cpd-size-sub">市场常见尺寸</div>
      <div class="cpd-size-grid">
        <button v-for="p in SIZE_PRESETS" :key="`${p.w}x${p.h}`" type="button" class="cpd-size-chip" :disabled="sizeBusy" @click="enterAdjust(p.w, p.h)">
          <b>{{ p.w }}×{{ p.h }}</b>
          <span>{{ p.note }}</span>
        </button>
      </div>
      <div class="cpd-size-sub">自由裁剪</div>
      <div class="cpd-size-custom">
        <input v-model="customW" type="number" min="10" max="5000" placeholder="输出宽" />
        <span class="cpd-size-x">×</span>
        <input v-model="customH" type="number" min="10" max="5000" placeholder="输出高" />
        <span class="cpd-size-x">px</span>
        <button type="button" class="cpd-size-apply" :disabled="sizeBusy" @click="enterSelect">选取裁剪区域</button>
      </div>
    </div>
  </Teleport>
</template>
