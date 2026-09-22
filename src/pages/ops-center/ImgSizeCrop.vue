<script setup lang="ts">
/** 预览图「修改尺寸 + 自由裁剪」共享组件（淘宝/视频号详情、京麦详情、素材中心生成图查看器同款）：
 *  父级放进 .cpd-preview-imgwrap 内；选区层就地渲染覆盖预览图，面板 Teleport 到预览暗幕保持悬浮定位。
 *  预设芯片直接输出；自由裁剪支持拖拽画框 / 框内移动 / 八向手柄缩放（框外压暗，实时回显选区原图像素），
 *  canvas 裁剪后经 commit 交回父级回写；不填输出宽高时按选区原尺寸输出。 */
import { computed, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';

const props = defineProps<{
  /** 面板开合（v-model:open，由父级工具条「修改尺寸」按钮控制） */
  open: boolean;
  /** 当前预览图 src */
  src: string;
  /** 预览缩放（选区坐标换算用） */
  zoom: number;
  /** 预览 <img> 元素（原图/显示尺寸换算、面板 Teleport 锚点） */
  imgEl: HTMLImageElement | null;
  /** 裁剪完成回写：(新图 url, 输出宽, 输出高) */
  commit: (url: string, w: number, h: number) => void;
}>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

/* 面板 Teleport 目标：预览暗幕（bottom 76px 悬浮于工具条上方） */
const maskEl = computed(() => (props.imgEl?.closest('.cpd-preview-mask') as HTMLElement | null) ?? null);

/* 市场常见尺寸预设：尺寸＋比例两行展示，点击直接应用 */
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

/* 自由裁剪：预览图上拖拽画新框 / 框内拖动整体移动 / 八向手柄缩放；框坐标为预览容器 px，裁剪时换算原图像素 */
const cropMode = ref(false);
const cropRect = ref<{ x: number; y: number; w: number; h: number } | null>(null);
const cropLayerRef = ref<HTMLElement | null>(null);
const CROP_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
let cropDrag: { mode: 'new' | 'move' | 'resize'; hd?: string; px: number; py: number; orig: { x: number; y: number; w: number; h: number } } | null = null;
const resetCrop = () => { cropMode.value = false; cropRect.value = null; cropDrag = null; };
const toggleCropMode = () => { cropMode.value = !cropMode.value; cropRect.value = null; };
const cropLocal = (e: MouseEvent) => {
  const r = cropLayerRef.value!.getBoundingClientRect();
  const z = props.zoom || 1;
  return { x: (e.clientX - r.left) / z, y: (e.clientY - r.top) / z };
};
const clampCrop = (rc: { x: number; y: number; w: number; h: number }) => {
  const bw = cropLayerRef.value?.clientWidth ?? 0;
  const bh = cropLayerRef.value?.clientHeight ?? 0;
  rc.w = Math.min(rc.w, bw);
  rc.h = Math.min(rc.h, bh);
  rc.x = Math.max(0, Math.min(rc.x, bw - rc.w));
  rc.y = Math.max(0, Math.min(rc.y, bh - rc.h));
  return rc;
};
const onCropDrag = (e: MouseEvent) => {
  if (!cropDrag) return;
  const p = cropLocal(e);
  const o = cropDrag.orig;
  let rc = { ...o };
  if (cropDrag.mode === 'new') {
    rc = { x: Math.min(p.x, cropDrag.px), y: Math.min(p.y, cropDrag.py), w: Math.abs(p.x - cropDrag.px), h: Math.abs(p.y - cropDrag.py) };
  } else if (cropDrag.mode === 'move') {
    rc.x = o.x + (p.x - cropDrag.px);
    rc.y = o.y + (p.y - cropDrag.py);
  } else {
    const hd = cropDrag.hd ?? '';
    let x1 = o.x; let y1 = o.y; let x2 = o.x + o.w; let y2 = o.y + o.h;
    if (hd.includes('w')) x1 = Math.min(p.x, x2 - 10);
    if (hd.includes('e')) x2 = Math.max(p.x, x1 + 10);
    if (hd.includes('n')) y1 = Math.min(p.y, y2 - 10);
    if (hd.includes('s')) y2 = Math.max(p.y, y1 + 10);
    rc = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  cropRect.value = clampCrop(rc);
};
const endCropDrag = () => {
  window.removeEventListener('mousemove', onCropDrag);
  window.removeEventListener('mouseup', endCropDrag);
  if (cropDrag?.mode === 'new' && cropRect.value && (cropRect.value.w < 8 || cropRect.value.h < 8)) cropRect.value = null;
  cropDrag = null;
};
const startCropDrag = (mode: 'new' | 'move' | 'resize', e: MouseEvent, hd?: string) => {
  const p = cropLocal(e);
  cropDrag = { mode, hd, px: p.x, py: p.y, orig: { ...(cropRect.value ?? { x: p.x, y: p.y, w: 0, h: 0 }) } };
  window.addEventListener('mousemove', onCropDrag);
  window.addEventListener('mouseup', endCropDrag);
};
const onCropLayerDown = (e: MouseEvent) => {
  const p = cropLocal(e);
  cropRect.value = { x: p.x, y: p.y, w: 0, h: 0 };
  startCropDrag('new', e);
};
const onCropBoxDown = (e: MouseEvent) => startCropDrag('move', e);
const onCropHandleDown = (e: MouseEvent, hd: string) => startCropDrag('resize', e, hd);
/* 选区原图像素尺寸回显（预览容器 px × 原图/容器比例） */
const cropScale = () => {
  const el = props.imgEl;
  return el && el.clientWidth ? el.naturalWidth / el.clientWidth : 1;
};
const cropNatSize = computed(() => {
  const r = cropRect.value;
  if (!r) return null;
  const k = cropScale();
  return { w: Math.round(r.w * k), h: Math.round(r.h * k) };
});

/* 面板开合：开时读当前图原尺寸并清空输出宽高，关时退出选取 */
watch(() => props.open, (v) => {
  resetCrop();
  if (!v) return;
  customW.value = '';
  customH.value = '';
  const img = new Image();
  img.onload = () => { sizeOrigin.value = { w: img.naturalWidth, h: img.naturalHeight }; };
  img.src = props.src;
});
/* 切图：退出选取并重读当前尺寸 */
watch(() => props.src, () => {
  resetCrop();
  if (!props.open) return;
  const img = new Image();
  img.onload = () => { sizeOrigin.value = { w: img.naturalWidth, h: img.naturalHeight }; };
  img.src = props.src;
});

/* 自由裁剪提交：有选区→按选区裁（填了输出宽高则缩放到该尺寸，否则选区原尺寸输出）；无选区→填宽高居中裁 */
const applyCustom = () => {
  const hasW = customW.value !== '';
  const hasH = customH.value !== '';
  const w = Math.round(Number(customW.value));
  const h = Math.round(Number(customH.value));
  if (hasW !== hasH) { pushToast('输出宽和高需同时填写或同时留空', 'warning'); return; }
  if (hasW && (!w || !h || w < 10 || h < 10 || w > 5000 || h > 5000)) { pushToast('自定义尺寸需在 10–5000px 之间', 'warning'); return; }
  if (!cropRect.value && !hasW) { pushToast('请在图片上拖拽选取裁剪区域，或填写输出宽高', 'warning'); return; }
  let src: { x: number; y: number; w: number; h: number } | null = null;
  if (cropRect.value) {
    const k = cropScale();
    src = { x: cropRect.value.x * k, y: cropRect.value.y * k, w: cropRect.value.w * k, h: cropRect.value.h * k };
  }
  applySize(hasW ? w : 0, hasH ? h : 0, src);
};
/* 尺寸修改统一出口：src 选区（原图像素）有值按选区裁剪（未填输出尺寸时按选区原尺寸），否则等比缩放居中裁剪；canvas 输出 png */
const applySize = (w: number, h: number, src?: { x: number; y: number; w: number; h: number } | null) => {
  if (sizeBusy.value || !props.src) return;
  sizeBusy.value = true;
  const srcUrl = props.src;
  const img = new Image();
  img.onload = () => {
    const sw = img.naturalWidth;
    const sh = img.naturalHeight;
    let sx = 0; let sy = 0; let cw = sw; let ch = sh;
    let ow = w; let oh = h;
    if (src) {
      /* 自由裁剪：拖拽选区为源；未填输出尺寸时按选区原尺寸输出 */
      sx = Math.max(0, Math.min(src.x, sw - 1));
      sy = Math.max(0, Math.min(src.y, sh - 1));
      cw = Math.max(1, Math.min(src.w, sw - sx));
      ch = Math.max(1, Math.min(src.h, sh - sy));
      if (!ow || !oh) { ow = Math.round(cw); oh = Math.round(ch); }
    } else {
      const ratio = ow / oh;
      if (sw / sh > ratio) cw = sh * ratio;
      else ch = sw / ratio;
      sx = (sw - cw) / 2;
      sy = (sh - ch) / 2;
    }
    const cv = document.createElement('canvas');
    cv.width = ow;
    cv.height = oh;
    const ctx = cv.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, sx, sy, cw, ch, 0, 0, ow, oh);
      const url = cv.toDataURL('image/png');
      sizeOrigin.value = { w: ow, h: oh };
      props.commit(url, ow, oh);
      pushToast(`已修改尺寸为 ${ow}×${oh}`);
    }
    resetCrop();
    sizeBusy.value = false;
    emit('update:open', false);
  };
  img.onerror = () => {
    sizeBusy.value = false;
    pushToast('图片加载失败，无法修改尺寸', 'error');
  };
  img.src = srcUrl;
};
</script>

<template>
  <!-- 自由裁剪选区层：拖拽画新框 / 框内拖动移动 / 八向手柄缩放；框外压暗、框上回显原图像素尺寸 -->
  <div v-if="cropMode" ref="cropLayerRef" class="cpd-crop-layer" @mousedown.prevent="onCropLayerDown">
    <div
      v-if="cropRect"
      class="cpd-crop-box"
      :style="{ left: `${cropRect.x}px`, top: `${cropRect.y}px`, width: `${cropRect.w}px`, height: `${cropRect.h}px` }"
      @mousedown.prevent.stop="onCropBoxDown"
    >
      <span class="cpd-crop-size">{{ cropNatSize?.w ?? 0 }}×{{ cropNatSize?.h ?? 0 }}</span>
      <i v-for="hd in CROP_HANDLES" :key="hd" :class="`cpd-crop-hd hd-${hd}`" @mousedown.prevent.stop="onCropHandleDown($event, hd)" />
    </div>
    <span v-else class="cpd-crop-tip">按住拖拽选取裁剪区域</span>
  </div>

  <!-- 修改尺寸面板：Teleport 到预览暗幕，工具条上方悬浮暗卡；市场常见尺寸预设＋自由裁剪 -->
  <Teleport v-if="maskEl" :to="maskEl">
    <div v-if="open" class="cpd-size-panel" @click.stop>
      <div class="cpd-size-head">
        <b>修改图片尺寸</b>
        <span v-if="sizeOrigin">当前 {{ sizeOrigin.w }}×{{ sizeOrigin.h }}</span>
        <button type="button" class="cpd-size-close" title="关闭" @click="emit('update:open', false)">✕</button>
      </div>
      <div class="cpd-size-sub">市场常见尺寸</div>
      <div class="cpd-size-grid">
        <button v-for="p in SIZE_PRESETS" :key="`${p.w}x${p.h}`" type="button" class="cpd-size-chip" :disabled="sizeBusy" @click="applySize(p.w, p.h)">
          <b>{{ p.w }}×{{ p.h }}</b>
          <span>{{ p.note }}</span>
        </button>
      </div>
      <div class="cpd-size-sub">自由裁剪</div>
      <div class="cpd-size-croprow">
        <button type="button" class="cpd-size-croptoggle" :class="cropMode ? 'on' : ''" :disabled="sizeBusy" @click="toggleCropMode">
          {{ cropMode ? '退出选取' : '选取裁剪区域' }}
        </button>
        <span v-if="cropNatSize" class="cpd-size-cropinfo">选区 {{ cropNatSize.w }}×{{ cropNatSize.h }}</span>
        <span v-else-if="cropMode" class="cpd-size-cropinfo">在图片上按住拖拽选取</span>
      </div>
      <div class="cpd-size-custom">
        <input v-model="customW" type="number" min="10" max="5000" placeholder="输出宽" />
        <span class="cpd-size-x">×</span>
        <input v-model="customH" type="number" min="10" max="5000" placeholder="输出高" />
        <span class="cpd-size-x">px</span>
        <button type="button" class="cpd-size-apply" :disabled="sizeBusy" @click="applyCustom">裁剪</button>
      </div>
    </div>
  </Teleport>
</template>
