<script setup lang="ts">
/* ---------- 主图外露标签（插件 demo） ----------
   真实使用场景是浮在浏览器其它平台页之上，故不做页内直出：全局悬浮球（跨顶部 tab 常驻）点开编辑弹窗，
   弹窗内预览合成主图并编辑；Ctrl+V 粘贴图片、Ctrl+Z 撤销（输入框内聚焦时让位原生行为）。
   画布按 1000 单位归一化绘制，预览与导出同一份逻辑；选中层蓝虚线框仅预览有，导出图不带。 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { STAGE, TEMPLATES, FONT_OPTIONS, DEFAULT_FONT_KEY, drawComposite, layerBox, layersOf, makePngTemplate, type FrameLayer, type FrameTemplate, type ImgTransform, DEFAULT_IMG_TF } from './frameTemplates';
import './MainImgPlugin.css';

const props = defineProps<{ activeTab: string }>();

/* ── 合成状态 ── */
const img = ref<HTMLImageElement | null>(null);
const imgName = ref('');
let imgUrl = '';
/* 模板：内置 4 套 ＋ 用户上传 PNG（会话内维护，可增删） */
const userTemplates = ref<FrameTemplate[]>([]);
const allTemplates = computed<FrameTemplate[]>(() => [...TEMPLATES, ...userTemplates.value]);
const resolveTpl = (id: string): FrameTemplate => allTemplates.value.find((t) => t.id === id) ?? allTemplates.value[0];
const tplId = ref(TEMPLATES[0].id);
const tpl = computed(() => resolveTpl(tplId.value));
const layers = ref<FrameLayer[]>(layersOf(TEMPLATES[0]));
const selId = ref(layers.value[0]?.id ?? '');
/* 商品图变换：画布空白处拖动平移、滚轮/步进缩放；换图时复位 */
const imgTf = ref<ImgTransform>({ ...DEFAULT_IMG_TF });

/* ── 撤销栈：按编辑手势入栈（换模板 / 改文案 / 步进字号 / 拖动文字 / 移动缩放图片 / 换图），Ctrl+Z 逐条回退 ── */
interface Snap { tplId: string; layers: FrameLayer[]; img: HTMLImageElement | null; imgName: string; tf: ImgTransform }
const history = ref<Snap[]>([]);
const snap = (): Snap => ({ tplId: tplId.value, layers: layers.value.map((l) => ({ ...l })), img: img.value, imgName: imgName.value, tf: { ...imgTf.value } });
const pushHistory = (s?: Snap) => {
  history.value.push(s ?? snap());
  if (history.value.length > 50) history.value.shift();
};
const undo = () => {
  const s = history.value.pop();
  if (!s) { pushToast('没有可撤销的操作', 'warning'); return; }
  tplId.value = s.tplId;
  layers.value = s.layers;
  img.value = s.img;
  imgName.value = s.imgName;
  imgTf.value = { ...s.tf };
  selId.value = layers.value[0]?.id ?? '';
};
/* 文案输入：聚焦时先取快照，首次输入才入栈，避免空手势污染撤销栈 */
let pendingSnap: Snap | null = null;
const onTextFocus = () => { pendingSnap = snap(); };
const onTextInput = () => {
  if (pendingSnap) { pushHistory(pendingSnap); pendingSnap = null; }
};
const onTextBlur = () => { pendingSnap = null; };

/* ── 预览画布 ── */
const cv = ref<HTMLCanvasElement | null>(null);
const render = () => {
  const ctx = cv.value?.getContext('2d');
  if (!ctx) return;
  drawComposite(ctx, STAGE, img.value, tpl.value, layers.value, imgTf.value);
  /* 预览画布边长即 STAGE，绘制单位与画布像素 1:1，选中框直接按 stage 坐标描 */
  const sel = layers.value.find((l) => l.id === selId.value);
  if (sel && sel.text.trim()) {
    const b = layerBox(ctx, sel);
    ctx.strokeStyle = '#4f7cff';
    ctx.lineWidth = 4;
    ctx.setLineDash([14, 10]);
    ctx.strokeRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
    ctx.setLineDash([]);
  }
};
watch([img, tplId, layers, imgTf], render, { deep: true });

/* ── 模板缩略图：与预览同一份绘制逻辑，无商品图时走底板色 ── */
const thumbEls: Record<string, HTMLCanvasElement | null> = {};
const setThumb = (id: string, el: unknown) => { thumbEls[id] = (el as HTMLCanvasElement | null) ?? null; };
const renderThumbs = () => {
  allTemplates.value.forEach((t) => {
    const c = thumbEls[t.id];
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    drawComposite(ctx, c.width, null, t, layersOf(t));
  });
};
const pickTemplate = (id: string) => {
  if (id === tplId.value) return;
  pushHistory();
  tplId.value = id;
  layers.value = layersOf(resolveTpl(id));
  selId.value = layers.value[0]?.id ?? '';
};

/* ── 模板管理：上传 PNG ＋ 删除（二次确认，仅用户模板可删） ── */
const tplFileInp = ref<HTMLInputElement | null>(null);
const pickTplFile = () => tplFileInp.value?.click();
const onTplFile = (e: Event) => {
  const inp = e.target as HTMLInputElement;
  const f = inp.files?.[0];
  inp.value = '';
  if (!f) return;
  if (f.type !== 'image/png' && !/\.png$/i.test(f.name)) { pushToast('模板仅支持 PNG 格式', 'error'); return; }
  const url = URL.createObjectURL(f);
  const im = new Image();
  im.onload = () => {
    const name = f.name.replace(/\.png$/i, '') || '自定义模板';
    const id = `user-${Date.now()}`;
    userTemplates.value = [...userTemplates.value, makePngTemplate(id, name, im)];
    nextTick(() => { renderThumbs(); pickTemplate(id); });
    pushToast('模板已上传');
  };
  im.onerror = () => { URL.revokeObjectURL(url); pushToast('模板解析失败，请更换 PNG 文件', 'error'); };
  im.src = url;
};
const pendingDelId = ref('');
const askDel = (id: string) => { pendingDelId.value = id; };
const cancelDel = () => { pendingDelId.value = ''; };
const delTemplate = (id: string) => {
  const t = userTemplates.value.find((x) => x.id === id);
  userTemplates.value = userTemplates.value.filter((x) => x.id !== id);
  pendingDelId.value = '';
  if (tplId.value === id) {
    tplId.value = TEMPLATES[0].id;
    layers.value = layersOf(TEMPLATES[0]);
    selId.value = layers.value[0]?.id ?? '';
  }
  nextTick(renderThumbs);
  pushToast(`模板「${t?.name ?? ''}」已删除`);
};
const isUserTpl = (id: string) => id.startsWith('user-');

/* ── 图片来源：本地选择 / 剪贴板读取 / Ctrl+V 粘贴 / 拖拽落图 / 示例主图 ── */
const fileInp = ref<HTMLInputElement | null>(null);
const pickFile = () => fileInp.value?.click();
const loadBlob = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const im = new Image();
  im.onload = () => {
    pushHistory();
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    imgUrl = url;
    img.value = im;
    imgName.value = name;
    imgTf.value = { ...DEFAULT_IMG_TF };
    pushToast('主图已载入');
  };
  im.onerror = () => { URL.revokeObjectURL(url); pushToast('图片解析失败，请更换文件', 'error'); };
  im.src = url;
};
const onFile = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) loadBlob(f, f.name);
  (e.target as HTMLInputElement).value = '';
};
const pasteImage = async () => {
  try {
    const items = await navigator.clipboard.read();
    for (const it of items) {
      const type = it.types.find((t) => t.startsWith('image/'));
      if (!type) continue;
      loadBlob(await it.getType(type), '剪贴板图片');
      return;
    }
    pushToast('剪贴板中没有图片', 'warning');
  } catch {
    pushToast('读取剪贴板失败，可改用选择图片或 Ctrl+V 粘贴', 'error');
  }
};
const onPaste = (e: ClipboardEvent) => {
  if (!open.value) return;
  const t = e.target as HTMLElement;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
  const f = item?.getAsFile();
  if (f) { e.preventDefault(); loadBlob(f, '剪贴板图片'); }
};
const onDrop = (e: DragEvent) => {
  const f = e.dataTransfer?.files?.[0];
  if (f && f.type.startsWith('image/')) loadBlob(f, f.name);
};
const useSample = () => {
  const im = new Image();
  im.onload = () => {
    pushHistory();
    if (imgUrl) { URL.revokeObjectURL(imgUrl); imgUrl = ''; }
    img.value = im;
    imgName.value = '示例主图.png';
    imgTf.value = { ...DEFAULT_IMG_TF };
    pushToast('主图已载入');
  };
  im.src = '/samples/main-img-demo.png';
};

/* ── 文字层：字号步进 ＋ 画布拖拽定位；商品图：缩放步进 ＋ 空白处拖动平移 ── */
const stepSize = (l: FrameLayer, d: number) => {
  pushHistory();
  l.size = Math.min(220, Math.max(20, l.size + d));
};
/* 商品图缩放：相对 cover 基准 50%~300%，步进 10% */
const stepZoom = (d: number) => {
  pushHistory();
  imgTf.value.scale = Math.min(3, Math.max(0.5, Math.round((imgTf.value.scale + d) * 100) / 100));
};
/* 画布滚轮缩放：上滚放大、下滚缩小；一段连续滚动聚合为一条撤销记录（停滚 350ms 后入栈） */
let wheelSnap: Snap | null = null;
let wheelTimer: number | null = null;
const onWheel = (e: WheelEvent) => {
  if (!img.value) return;
  e.preventDefault();
  if (!wheelSnap) wheelSnap = snap();
  const d = e.deltaY < 0 ? 0.1 : -0.1;
  imgTf.value.scale = Math.min(3, Math.max(0.5, Math.round((imgTf.value.scale + d) * 100) / 100));
  if (wheelTimer) window.clearTimeout(wheelTimer);
  wheelTimer = window.setTimeout(() => {
    if (wheelSnap && wheelSnap.tf.scale !== imgTf.value.scale) pushHistory(wheelSnap);
    wheelSnap = null;
    wheelTimer = null;
  }, 350);
};
const toStage = (e: PointerEvent) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: ((e.clientX - r.left) / r.width) * STAGE, y: ((e.clientY - r.top) / r.height) * STAGE };
};
const hitLayer = (sx: number, sy: number) => {
  const ctx = cv.value?.getContext('2d');
  if (!ctx) return null;
  for (let i = layers.value.length - 1; i >= 0; i--) {
    const l = layers.value[i];
    if (!l.text.trim()) continue;
    const b = layerBox(ctx, l);
    if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) return l;
  }
  return null;
};
type DragState =
  | { kind: 'layer'; id: string; dx: number; dy: number }
  | { kind: 'img'; sx: number; sy: number; ox: number; oy: number };
const drag = ref<DragState | null>(null);
const cur = ref<'grab' | 'grabbing' | 'move'>('grab');
/* 拖拽手势快照：按下时取、首次真实位移才入栈，空点击不污染撤销栈 */
let gestureSnap: Snap | null = null;
const onCanvasDown = (e: PointerEvent) => {
  const p = toStage(e);
  const l = hitLayer(p.x, p.y);
  gestureSnap = snap();
  if (l) {
    selId.value = l.id;
    drag.value = { kind: 'layer', id: l.id, dx: p.x - l.x * STAGE, dy: p.y - l.y * STAGE };
  } else {
    drag.value = { kind: 'img', sx: p.x, sy: p.y, ox: imgTf.value.x, oy: imgTf.value.y };
  }
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
};
const onCanvasMove = (e: PointerEvent) => {
  const p = toStage(e);
  const d = drag.value;
  if (d) {
    if (gestureSnap) { pushHistory(gestureSnap); gestureSnap = null; }
    if (d.kind === 'layer') {
      const l = layers.value.find((x) => x.id === d.id);
      if (l) {
        l.x = Math.min(0.98, Math.max(0.02, (p.x - d.dx) / STAGE));
        l.y = Math.min(0.98, Math.max(0.02, (p.y - d.dy) / STAGE));
      }
      cur.value = 'move';
    } else {
      imgTf.value.x = Math.min(400, Math.max(-400, d.ox + (p.x - d.sx)));
      imgTf.value.y = Math.min(400, Math.max(-400, d.oy + (p.y - d.sy)));
      cur.value = 'grabbing';
    }
    return;
  }
  cur.value = hitLayer(p.x, p.y) ? 'move' : 'grab';
};
const onCanvasUp = () => { drag.value = null; gestureSnap = null; };

/* ── 文字字体：免费可商用 webfont 按需加载（首次选用才拉取，加载完成重绘画布） ── */
const fontLoaders: Record<string, Promise<void> | undefined> = {};
const googleCss = new Set<string>();
const ensureFont = (key: string): Promise<void> => {
  const cached = fontLoaders[key];
  if (cached) return cached;
  const opt = FONT_OPTIONS.find((f) => f.key === key);
  if (!opt?.src) { const done = Promise.resolve(); fontLoaders[key] = done; return done; }
  const src = opt.src;
  const family = opt.family.split(',')[0].replace(/"/g, '');
  const p = (async () => {
    try {
      if (src.type === 'url') {
        const face = new FontFace(family, `url(${src.url})`);
        document.fonts.add(await face.load());
      } else {
        if (!googleCss.has(src.css)) {
          googleCss.add(src.css);
          await new Promise<void>((res) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = src.css;
            link.onload = () => res();
            link.onerror = () => res();
            document.head.appendChild(link);
          });
        }
        await Promise.all([400, 500, 600, 700].map((w) => document.fonts.load(`${w} 72px "${family}"`).then(() => undefined).catch(() => undefined)));
      }
    } catch { /* 字体加载失败回退系统字体，不阻断合成 */ }
  })();
  fontLoaders[key] = p;
  return p;
};
const fontOptions = FONT_OPTIONS.map((f) => ({ value: f.key, label: f.label }));
const setLayerFont = (l: FrameLayer, key: string) => {
  if ((l.font ?? DEFAULT_FONT_KEY) === key) return;
  pushHistory();
  l.font = key;
  void ensureFont(key).then(() => render());
};

/* ── 复制到粘贴板：离屏画布重绘（不带选中虚线框）→ PNG；先确保所用字体已加载 ── */
const copyOut = async () => {
  const keys = Array.from(new Set(layers.value.map((l) => l.font ?? DEFAULT_FONT_KEY)));
  await Promise.all(keys.map(ensureFont));
  const c = document.createElement('canvas');
  c.width = STAGE;
  c.height = STAGE;
  const ctx = c.getContext('2d');
  if (!ctx) return;
  drawComposite(ctx, STAGE, img.value, tpl.value, layers.value, imgTf.value);
  c.toBlob(async (blob) => {
    if (!blob) { pushToast('图片生成失败', 'error'); return; }
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      pushToast('合成主图已复制到粘贴板');
    } catch {
      pushToast('复制失败，请检查浏览器剪贴板权限', 'error');
    }
  }, 'image/png');
};

/* ── 悬浮球：全局常驻可拖拽（位移超 4px 抑制点击），点击开合编辑弹窗 ── */
const open = ref(false);
const fabPos = ref<{ x: number; y: number } | null>(null);
const fabDragged = ref(false);
const onFabDown = (e: PointerEvent) => {
  const wrap = (e.currentTarget as HTMLElement).closest('.mip-fab-wrap') as HTMLElement;
  const r = wrap.getBoundingClientRect();
  const st = { px: e.clientX, py: e.clientY, ox: r.left, oy: r.top, moved: false };
  const move = (ev: PointerEvent) => {
    const dx = ev.clientX - st.px;
    const dy = ev.clientY - st.py;
    if (!st.moved && Math.hypot(dx, dy) < 4) return;
    st.moved = true;
    fabPos.value = {
      x: Math.min(Math.max(st.ox + dx, 8), window.innerWidth - wrap.offsetWidth - 8),
      y: Math.min(Math.max(st.oy + dy, 8), window.innerHeight - wrap.offsetHeight - 8),
    };
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    fabDragged.value = st.moved;
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
};
const onFabClick = () => {
  if (fabDragged.value) { fabDragged.value = false; return; }
  open.value = !open.value;
};

/* ── 快捷键：弹窗开启时 Ctrl+V 粘贴图片 / Ctrl+Z 撤销；输入框内聚焦让位原生 ── */
const onKey = (e: KeyboardEvent) => {
  if (!open.value || !(e.ctrlKey || e.metaKey) || e.shiftKey || e.altKey) return;
  const t = e.target as HTMLElement;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const k = e.key.toLowerCase();
  if (k === 'v') { e.preventDefault(); pasteImage(); }
  else if (k === 'z') { e.preventDefault(); undo(); }
};

/* 落到插件 tab 时自动展开弹窗（该 tab 即插件入口页）；切走其它 tab 顺手收起，避免浮层跨页滞留 */
watch(() => props.activeTab, (v) => { open.value = v === 'main-img-plugin'; });

onMounted(() => {
  if (props.activeTab === 'main-img-plugin') open.value = true;
  render();
  renderThumbs();
  window.addEventListener('paste', onPaste);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  window.removeEventListener('paste', onPaste);
  window.removeEventListener('keydown', onKey);
  if (wheelTimer) window.clearTimeout(wheelTimer);
});
</script>

<template>
  <Teleport to="body">
    <!-- 插件悬浮球：跨顶部 tab 常驻，任意平台页上均可唤起 -->
    <div class="mip-fab-wrap" :style="fabPos ? { left: `${fabPos.x}px`, top: `${fabPos.y}px`, right: 'auto', bottom: 'auto' } : null">
      <button type="button" class="mip-fab" :class="{ on: open }" title="主图外露标签" @pointerdown="onFabDown" @click="onFabClick">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
        <i class="mip-fab-dot" />
      </button>
    </div>

    <!-- 编辑弹窗：左预览右控制，浮于当前平台页之上 -->
    <div v-show="open" class="mip-mask" @click.self="open = false">
      <div class="mip-modal">
        <div class="mip-modal-head">
          <span class="mip-title">主图外露标签</span>
          <button type="button" class="mip-x" title="关闭" @click="open = false">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="mip-modal-body">
          <div class="mip-preview" title="滚轮缩放图片，空白处拖动移动图片，文字上拖动调整文字位置" @dragover.prevent @drop.prevent="onDrop">
            <canvas
              ref="cv"
              class="mip-canvas"
              width="1000"
              height="1000"
              :style="{ cursor: drag ? 'grabbing' : cur }"
              @pointerdown="onCanvasDown"
              @pointermove="onCanvasMove"
              @pointerup="onCanvasUp"
              @pointerleave="onCanvasUp"
              @wheel="onWheel"
            />
          </div>
          <div class="mip-side">
            <div class="mip-sec">
              <div class="mip-sec-t">商品主图</div>
              <div class="mip-img-acts">
                <button type="button" class="mip-btn" @click="pickFile">选择图片</button>
                <button type="button" class="mip-btn" title="也可直接 Ctrl+V 粘贴" @click="pasteImage">粘贴图片</button>
                <button type="button" class="mip-link" @click="useSample">示例主图</button>
              </div>
              <div v-if="imgName" class="mip-img-name" :title="imgName">{{ imgName }}</div>
              <div v-if="img" class="mip-zoom">
                <span class="mip-zoom-t">图片缩放</span>
                <div class="mip-step">
                  <button type="button" title="缩小图片" @click.stop="stepZoom(-0.1)">−</button>
                  <b>{{ Math.round(imgTf.scale * 100) }}%</b>
                  <button type="button" title="放大图片" @click.stop="stepZoom(0.1)">+</button>
                </div>
              </div>
            </div>

            <div class="mip-sec">
              <div class="mip-sec-t">外边框模板</div>
              <div class="mip-tpl-grid">
                <div v-for="t in allTemplates" :key="t.id" class="mip-tpl-cell">
                  <button
                    type="button"
                    class="mip-tpl"
                    :class="{ on: t.id === tplId }"
                    @click="pickTemplate(t.id)"
                  >
                    <canvas :ref="(el) => setThumb(t.id, el)" width="180" height="180" />
                    <span>{{ t.name }}</span>
                  </button>
                  <button
                    v-if="isUserTpl(t.id)"
                    type="button"
                    class="mip-tpl-del"
                    title="删除该模板"
                    @click.stop="askDel(t.id)"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>
                  </button>
                  <div v-if="pendingDelId === t.id" class="mip-del-pop" @click.stop>
                    <span>删除模板「{{ t.name }}」？</span>
                    <div class="mip-del-acts">
                      <button type="button" @click="cancelDel">取消</button>
                      <button type="button" class="danger" @click="delTemplate(t.id)">删除</button>
                    </div>
                  </div>
                </div>
                <!-- 末格：上传模板占位 ＋ 下方上传按钮 -->
                <div class="mip-tpl-cell">
                  <button type="button" class="mip-tpl mip-tpl-add" title="上传 PNG 模板" @click="pickTplFile">
                    <span class="mip-tpl-add-box">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                    </span>
                    <span>上传模板</span>
                  </button>
                  <button type="button" class="mip-btn mip-tpl-upbtn" @click="pickTplFile">上传模板</button>
                </div>
              </div>
            </div>

            <div class="mip-sec">
              <div class="mip-sec-t">遮罩文字</div>
              <div
                v-for="l in layers"
                :key="l.id"
                class="mip-layer"
                :class="{ on: l.id === selId }"
                title="在画布上拖动该文字可调整展示位置"
                @click="selId = l.id"
              >
                <input
                  v-model="l.text"
                  class="mip-inp"
                  type="text"
                  placeholder="文字内容"
                  @focus="onTextFocus(); selId = l.id"
                  @input="onTextInput"
                  @blur="onTextBlur"
                >
                <div class="mip-layer-sub">
                  <BubbleSelect
                    class="mip-sel"
                    :value="l.font ?? DEFAULT_FONT_KEY"
                    :options="fontOptions"
                    @change="(v) => setLayerFont(l, v)"
                  />
                  <div class="mip-step">
                    <button type="button" title="缩小字号" @click.stop="stepSize(l, -2)">−</button>
                    <b>{{ l.size }}</b>
                    <button type="button" title="放大字号" @click.stop="stepSize(l, 2)">+</button>
                  </div>
                </div>
              </div>
            </div>

            <button type="button" class="mip-btn primary mip-copy" @click="copyOut">复制到粘贴板</button>
          </div>
        </div>
      </div>
    </div>
    <input ref="fileInp" class="mip-file" type="file" accept="image/*" @change="onFile">
    <input ref="tplFileInp" class="mip-file" type="file" accept="image/png" @change="onTplFile">
  </Teleport>
</template>
