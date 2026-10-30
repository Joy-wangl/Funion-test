<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import {
  ACTIONS, actionOf, scenes, SCENE_CATS, styles, startTask, buildResult, emptyDraft,
  AS_MATERIAL_TYPES, AS_MATERIAL_PRESET, fmtNow,
} from '../ai-studio/data';
import type { ActionKey, GenDraft, GenResult, GenTask, Picked, AsMaterialType } from '../ai-studio/data';
import {
  cbProducts, cbMaterials, cbProductMap,
  type CbProduct, type CbMaterial, type MaterialType,
} from './codeKbData';
import ProductPickModal from '../ai-studio/ProductPickModal.vue';

/* ---------- 页面状态 ---------- */
const draft = reactive<GenDraft>(emptyDraft('allMaterials'));
const view = ref<'edit' | 'run' | 'result'>('edit');
const curTask = ref<GenTask | null>(null);
const meta = computed(() => actionOf(draft.action));
const isBatch = computed(() => draft.action === 'allMaterials');

/* ---------- 折叠面板 ---------- */
const openScene = ref(false);
const openStyle = ref(false);
const openOutput = ref(false);
watch(() => draft.action, () => {
  openScene.value = false;
  openStyle.value = false;
  openOutput.value = false;
});

/* ---------- 左侧能力 ---------- */
const capabilityGroups: { name: string; items: ActionKey[] }[] = [
  { name: '批量替换', items: ['allMaterials'] },
  { name: 'AI 换图', items: ['changeTheme', 'changeSubject', 'changeScene', 'replicate'] },
  { name: '一键生成', items: ['mainImg', 'detailImg'] },
  { name: '抠图清理', items: ['whiteBg', 'clipKeep', 'clipClean'] },
];
const switchAction = (k: ActionKey) => {
  if (draft.action === k) return;
  const keep = draft.product;
  Object.assign(draft, emptyDraft(k), { product: keep });
  view.value = 'edit';
};

/* ---------- 商品选择 ---------- */
const pickOpen = ref(false);
const pickTarget = ref<'product' | 'subject'>('product');
const openPick = (t: 'product' | 'subject') => { pickTarget.value = t; pickOpen.value = true; };
const onPicked = (p: Picked) => {
  if (pickTarget.value === 'product') draft.product = p;
  else draft.subject = p;
  pickOpen.value = false;
};

const extractKeywords = (s: string) => {
  const words = s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ').split(/\s+/).filter((w) => w.length >= 2);
  return Array.from(new Set(words));
};
const matchedProducts = computed<CbProduct[]>(() => {
  if (!draft.product?.title) return [];
  const t = draft.product.title.trim();
  const idMatch = cbProducts.filter((p) => p.id === draft.product?.id || t.includes(p.id));
  if (idMatch.length) return idMatch;
  const exact = cbProducts.filter((p) => p.name === t || t.includes(p.name) || p.name.includes(t));
  if (exact.length) return exact;
  const kw = extractKeywords(t);
  return cbProducts.filter((p) => kw.some((k) => p.name.includes(k) || p.seriesId.includes(k)));
});
const targetProduct = ref<CbProduct | null>(null);
watch(matchedProducts, (list) => { targetProduct.value = list[0] ?? null; }, { immediate: true });

/* ---------- 场景 / 风格 ---------- */
const sceneCat = ref('全部');
const sceneList = computed(() => scenes.filter((s) => s.enabled && (sceneCat.value === '全部' || s.cat === sceneCat.value)));
const styleTag = computed(() => (draft.action === 'mainImg' ? '主图' : draft.action === 'detailImg' ? '详情图' : '场景图'));
const styleList = computed(() => styles.filter((s) => s.enabled && (isBatch.value || s.tags.includes(styleTag.value))));

/* ---------- 生成 ---------- */
const missing = computed(() => {
  const m: string[] = [];
  const a = meta.value;
  if (!draft.product) m.push('请选择商品图片');
  if (a.needSubject && !draft.subject) m.push('请选择新的商品主体');
  if (a.sceneKind === 'theme' && !draft.sceneId) m.push('请选择目标主题');
  if (a.sceneKind === 'scene' && (draft.sceneMode === 'lib' ? !draft.sceneId : !draft.refImg)) m.push(draft.sceneMode === 'lib' ? '请选择目标场景' : '请上传竞品参考图');
  if (a.needRect && !draft.rects.length) m.push(a.needRect === 'keep' ? '请框选保留区域' : '请框选清除区域');
  if (a.needStyle && draft.styleOn && !draft.styleId) m.push('请选择出图风格');
  if (isBatch.value && !draft.materialTypes.length) m.push('请至少选择一种素材类型');
  return m;
});
const generate = () => {
  if (missing.value.length) return;
  const t = startTask({ ...draft, rects: draft.rects.map((r) => ({ ...r })) });
  curTask.value = t;
  view.value = 'run';
};
watch(() => curTask.value?.status, (s) => { if (s && s !== 'running') view.value = 'result'; });
const resetDraft = () => { Object.assign(draft, emptyDraft(draft.action)); view.value = 'edit'; };

/* ---------- 结果操作 ---------- */
const previewR = ref<GenResult | null>(null);
const regenIdx = ref(-1);
const saveOne = (r: GenResult) => {
  if (r.saved) return;
  r.saved = true;
  pushToast('已存入素材库');
};
const regenOne = (i: number) => {
  const t = curTask.value;
  if (!t?.draft || regenIdx.value >= 0) return;
  regenIdx.value = i;
  const old = t.results[i];
  setTimeout(() => {
    t.results[i] = { ...buildResult(t.draft!, old.w, old.h, old.bg, old.tint, old.seed + 3), saved: false, id: old.id };
    regenIdx.value = -1;
    pushToast('单张重生成完成');
  }, 900);
};

/* ---------- 应用到系列编码素材库 ---------- */
const saveToCodeOpen = ref(false);
const saveToCodeTarget = ref<CbProduct | null>(null);
watch(() => saveToCodeOpen.value, (open) => {
  if (open) saveToCodeTarget.value = targetProduct.value ?? cbProducts[0] ?? null;
});
const seriesProductOptions = computed(() => cbProducts.map((p) => ({ label: `${p.id} · ${p.name} · ${p.seriesId}`, value: p.id })));
const applyToCodeKb = () => {
  const p = saveToCodeTarget.value;
  const list = curTask.value?.results.filter((r) => r.materialType) ?? [];
  if (!p || !list.length) return;
  let n = 0;
  list.forEach((r) => {
    const type = r.materialType as MaterialType;
    const cm: CbMaterial = {
      id: `MT-${p.id}-${Date.now()}-${n}`,
      name: `${p.name}·${type}·AI生成`,
      type,
      productId: p.id,
      version: 'v1',
      uploader: '智能作图',
      uploadedAt: fmtNow(),
      status: '草稿',
      compliance: ['AI生成待审'],
      sales: 0,
      thumb: r.src,
      versions: [{ version: 'v1', uploader: '智能作图', uploadedAt: fmtNow(), note: `由智能作图生成，风格 ${curTask.value?.styleName ?? '—'}` }],
    };
    cbMaterials.push(cm);
    n += 1;
  });
  saveToCodeOpen.value = false;
  pushToast(`${n} 张素材已写入「${p.seriesId}」系列编码素材库`);
};

/* ---------- 预览合成 ---------- */
const curScene = computed(() => scenes.find((s) => s.id === draft.sceneId));
const curStyle = computed(() => (draft.styleOn ? styles.find((s) => s.id === draft.styleId) : undefined));
const prevBg = computed(() => {
  const a = draft.action;
  if (a === 'whiteBg' || a === 'clipKeep') return draft.bgColor === 'transparent' ? 'checker' : 'white';
  if (a === 'mainImg' || a === 'detailImg') return 'tint';
  if (a === 'changeTheme' || a === 'changeScene' || a === 'allMaterials') return curScene.value?.bg ?? '';
  if (a === 'replicate') return 'cover';
  return 'linear-gradient(165deg,#f2efe9 0%,#d9d2c6 100%)';
});
const prevSrc = computed(() => (draft.action === 'changeSubject' ? draft.subject?.img : draft.product?.img) ?? '');

/* ---------- 上传 ---------- */
const upTarget = ref<'product' | 'subject' | 'ref'>('product');
const fileInput = ref<HTMLInputElement | null>(null);
const triggerUpload = (t: 'product' | 'subject' | 'ref') => { upTarget.value = t; fileInput.value?.click(); };
const onFile = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  (e.target as HTMLInputElement).value = '';
  if (!f) return;
  if (!f.type.startsWith('image/')) { pushToast('仅支持图片文件', 'error'); return; }
  const picked: Picked = { title: f.name.replace(/\.[^.]+$/, ''), img: URL.createObjectURL(f) };
  if (upTarget.value === 'product') draft.product = picked;
  else if (upTarget.value === 'subject') draft.subject = picked;
  else draft.refImg = picked.img;
  pushToast('本地图片已载入');
};

/* ---------- 右侧任务分组 ---------- */
const resultGroups = computed(() => {
  const list = curTask.value?.results ?? [];
  if (!isBatch.value) return [{ label: '', items: list }];
  const map: Record<string, GenResult[]> = {};
  list.forEach((r) => { const k = r.materialType ?? '其他'; (map[k] ||= []).push(r); });
  return AS_MATERIAL_TYPES.filter((t) => map[t]).map((t) => ({ label: t, items: map[t] }));
});
const taskHint = computed(() => {
  if (view.value === 'run') return '生成中，请稍候…';
  if (view.value === 'result' && curTask.value) return `共 ${curTask.value.results.length} 张`;
  return '配置左侧参数并点击开始生成';
});
</script>

<template>
  <div class="si-studio">
    <input ref="fileInput" type="file" accept="image/*" hidden @change="onFile" />

    <!-- 左侧能力列表 -->
    <aside class="si-side">
      <div class="si-brand">
        <span class="si-logo">AI</span>
        <span>智能作图</span>
      </div>
      <div class="si-cap-list">
        <template v-for="g in capabilityGroups" :key="g.name">
          <div class="si-cap-group">{{ g.name }}</div>
          <button
            v-for="k in g.items"
            :key="k"
            type="button"
            class="si-cap"
            :class="{ on: draft.action === k }"
            @click="switchAction(k)"
          >
            <span class="si-cap-name">{{ actionOf(k).name }}</span>
            <span class="si-cap-desc">{{ actionOf(k).desc }}</span>
          </button>
        </template>
      </div>
    </aside>

    <!-- 中间画布 -->
    <section class="si-main">
      <div class="si-topbar">
        <div class="si-title">{{ meta.name }}</div>
        <div class="si-subtitle">{{ meta.desc }}</div>
      </div>

      <div class="si-canvas-wrap">
        <div
          class="si-canvas"
          :class="prevBg === 'checker' ? 'checker' : prevBg === 'white' ? 'white' : ''"
          :style="prevBg.startsWith('linear') ? { background: prevBg } : prevBg === 'cover' && draft.product ? { backgroundImage: `url(${draft.product.img})`, backgroundSize: 'cover', backgroundPosition: 'center' } : prevBg === 'tint' && curStyle ? { background: `linear-gradient(160deg,#fff 0%,${curStyle.tint} 130%)` } : {}"
        >
          <img v-if="prevSrc && draft.action !== 'replicate'" class="si-canvas-img" :class="{ pad: draft.action === 'whiteBg' || draft.action === 'clipKeep' || draft.action === 'mainImg' }" :src="prevSrc" alt="" />
          <div v-else-if="!prevSrc" class="si-canvas-ph">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
            <span>选择商品后预览合成效果</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 右侧：折叠参数 + 生成任务 -->
    <aside class="si-props">
      <!-- 当前商品 -->
      <div class="si-prop-sec flat">
        <div class="si-prop-title">当前商品</div>
        <div v-if="!draft.product" class="si-upload-row">
          <button type="button" class="si-upload-btn" @click="openPick('product')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
            选择店铺商品
          </button>
          <button type="button" class="si-upload-btn" @click="triggerUpload('product')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            本地上传
          </button>
        </div>
        <div v-else class="si-prod-card">
          <img :src="draft.product.img" alt="" />
          <div class="si-prod-info">
            <div class="si-prod-name">{{ draft.product.title }}</div>
            <div class="si-prod-series">{{ targetProduct ? targetProduct.seriesId : '未匹配到系列编码' }}</div>
          </div>
          <button type="button" class="si-prod-change" @click="openPick('product')">更换</button>
        </div>
      </div>

      <!-- 新商品主体 -->
      <div v-if="meta.needSubject" class="si-prop-sec flat">
        <div class="si-prop-title">新商品主体</div>
        <div v-if="!draft.subject" class="si-upload-row">
          <button type="button" class="si-upload-btn" @click="openPick('subject')">选择店铺商品</button>
          <button type="button" class="si-upload-btn" @click="triggerUpload('subject')">本地上传</button>
        </div>
        <div v-else class="si-prod-card">
          <img :src="draft.subject.img" alt="" />
          <div class="si-prod-info">
            <div class="si-prod-name">{{ draft.subject.title }}</div>
          </div>
          <button type="button" class="si-prod-change" @click="openPick('subject')">更换</button>
        </div>
      </div>

      <!-- 场景选择（默认收起） -->
      <div v-if="meta.sceneKind" class="si-prop-sec flat">
        <button type="button" class="si-prop-title collapse" @click="openScene = !openScene">
          <span>场景选择</span>
          <span v-if="curScene" class="si-prop-badge">{{ curScene.name }}</span>
          <span class="si-arrow" :class="{ open: openScene }">▶</span>
        </button>
        <div v-show="openScene" class="si-prop-body">
          <div v-if="meta.sceneKind === 'scene'" class="si-seg">
            <button type="button" :class="{ on: draft.sceneMode === 'lib' }" @click="draft.sceneMode = 'lib'">场景库</button>
            <button type="button" :class="{ on: draft.sceneMode === 'ref' }" @click="draft.sceneMode = 'ref'">竞品参考图</button>
          </div>
          <div v-if="meta.sceneKind === 'scene' && draft.sceneMode === 'ref'" class="si-upload-row">
            <button type="button" class="si-upload-btn wide" @click="triggerUpload('ref')">上传竞品 / 参考商品图</button>
          </div>
          <div v-else class="si-scene-list">
            <button
              v-for="s in sceneList"
              :key="s.id"
              type="button"
              class="si-scene-pill"
              :class="{ on: draft.sceneId === s.id }"
              @click="draft.sceneId = draft.sceneId === s.id ? null : s.id"
            >
              <span class="si-scene-sw" :style="{ background: s.bg }" />
              <span>{{ s.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 风格选择（默认收起） -->
      <div v-if="meta.needStyle" class="si-prop-sec flat">
        <button type="button" class="si-prop-title collapse" @click="openStyle = !openStyle">
          <span>出图风格</span>
          <span v-if="curStyle" class="si-prop-badge">{{ curStyle.name }}</span>
          <span class="si-arrow" :class="{ open: openStyle }">▶</span>
        </button>
        <div v-show="openStyle" class="si-prop-body">
          <div class="si-style-list">
            <button
              v-for="s in styleList"
              :key="s.id"
              type="button"
              class="si-style-card"
              :class="{ on: draft.styleId === s.id }"
              @click="draft.styleId = draft.styleId === s.id ? null : s.id"
            >
              <img :src="s.thumb" alt="" />
              <span>{{ s.name }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 输出设置（默认收起） -->
      <div class="si-prop-sec flat">
        <button type="button" class="si-prop-title collapse" @click="openOutput = !openOutput">
          <span>{{ isBatch ? '替换素材类型' : '输出尺寸' }}</span>
          <span v-if="isBatch && draft.materialTypes.length" class="si-prop-badge">已选 {{ draft.materialTypes.length }} 类</span>
          <span class="si-arrow" :class="{ open: openOutput }">▶</span>
        </button>
        <div v-show="openOutput" class="si-prop-body">
          <div v-if="isBatch" class="si-mat-grid">
            <button
              v-for="t in AS_MATERIAL_TYPES"
              :key="t"
              type="button"
              class="si-mat-cell"
              :class="{ on: draft.materialTypes.includes(t) }"
              @click="draft.materialTypes = draft.materialTypes.includes(t) ? draft.materialTypes.filter((x) => x !== t) : [...draft.materialTypes, t]"
            >
              <span>{{ t }}</span>
              <em>{{ AS_MATERIAL_PRESET[t].w }}×{{ AS_MATERIAL_PRESET[t].h }}</em>
            </button>
          </div>
          <div v-else-if="meta.ratios[0] !== 'source'" class="si-chips">
            <button
              v-for="k in meta.ratios"
              :key="k"
              type="button"
              class="si-chip"
              :class="{ on: draft.ratioKey === k }"
              @click="draft.ratioKey = k"
            >{{ k }}</button>
          </div>
          <div v-else class="si-hint">跟随原图尺寸</div>
        </div>
      </div>

      <div class="si-prop-foot">
        <button type="button" class="si-gen-btn" :disabled="!!missing.length" @click="generate">
          {{ view === 'run' ? '生成中…' : '开始生成' }}
        </button>
        <div v-if="missing.length" class="si-gen-hint">{{ missing[0] }}</div>
      </div>

      <!-- 右侧生成任务 -->
      <div class="si-task-panel">
        <div class="si-task-head">
          <span>生成任务</span>
          <span class="si-task-status">{{ taskHint }}</span>
        </div>
        <div v-if="!curTask" class="si-task-empty">
          暂无任务，选择商品与场景/风格后点击「开始生成」
        </div>
        <div v-else class="si-task-body">
          <template v-for="g in resultGroups" :key="g.label || 'all'">
            <div v-if="g.label" class="si-task-group">{{ g.label }}</div>
            <div class="si-task-row">
              <div
                v-for="(r, i) in g.items"
                :key="r.id"
                class="si-task-tile"
                :class="{ saving: r.saved }"
                @click="previewR = r"
              >
                <img :src="r.src" alt="" />
                <div class="si-task-meta">{{ r.w }}×{{ r.h }}</div>
                <div class="si-task-overlay">
                  <button type="button" class="si-task-act" @click.stop="saveOne(r)">{{ r.saved ? '已保存' : '存素材库' }}</button>
                  <button type="button" class="si-task-act" @click.stop="regenOne(i)">重生成</button>
                </div>
              </div>
            </div>
          </template>
          <div v-if="isBatch && view === 'result'" class="si-task-actions">
            <button type="button" class="si-task-btn primary" @click="saveToCodeOpen = true">批量应用到系列编码素材库</button>
            <button type="button" class="si-task-btn" @click="resetDraft">再建一单</button>
          </div>
        </div>
      </div>
    </aside>

    <!-- 弹窗 -->
    <ProductPickModal v-if="pickOpen" @close="pickOpen = false" @pick="onPicked" />
    <Modal v-if="previewR" title="结果预览" size="lg" @close="previewR = null">
      <div class="si-preview"><img :src="previewR.src" alt="" /></div>
    </Modal>
    <Modal v-if="saveToCodeOpen" title="应用到系列编码素材库" size="md" @close="saveToCodeOpen = false">
      <div class="si-form">
        <label>
          <span>入库商品ID</span>
          <select v-model="saveToCodeTarget">
            <option v-for="opt in seriesProductOptions" :key="opt.value" :value="cbProductMap[opt.value]">{{ opt.label }}</option>
          </select>
        </label>
        <p class="si-form-hint">将本批次 {{ curTask?.results.filter((r) => r.materialType).length ?? 0 }} 张生成素材按类型写入该商品ID。</p>
      </div>
      <template #foot>
        <button type="button" class="si-modal-btn" @click="saveToCodeOpen = false">取消</button>
        <button type="button" class="si-modal-btn primary" :disabled="!saveToCodeTarget" @click="applyToCodeKb">确认写入</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.si-studio { display: flex; height: 100%; background: #f7f8fa; overflow: hidden; }

/* 左侧能力 */
.si-side { width: 188px; flex-shrink: 0; background: #fff; border-right: 1px solid #ebedf2; display: flex; flex-direction: column; }
.si-brand { display: flex; align-items: center; gap: 10px; padding: 16px 14px; font-size: 15px; font-weight: 600; color: #1f2733; border-bottom: 1px solid #f0f2f6; }
.si-logo { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #6b5bff, #4f7cff); color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; }
.si-cap-list { flex: 1; overflow: auto; padding: 10px; }
.si-cap-group { font-size: 11px; color: #98a0b3; padding: 10px 8px 6px; text-transform: uppercase; letter-spacing: .4px; }
.si-cap { width: 100%; text-align: left; border: none; background: transparent; border-radius: 8px; padding: 9px 8px; margin-bottom: 4px; cursor: pointer; transition: background .15s; }
.si-cap:hover { background: #f4f6fa; }
.si-cap.on { background: #eef2ff; }
.si-cap-name { display: block; font-size: 13px; font-weight: 600; color: #1f2733; }
.si-cap.on .si-cap-name { color: #4f7cff; }
.si-cap-desc { display: block; font-size: 11px; color: #98a0b3; margin-top: 2px; line-height: 1.3; }

/* 中间画布 */
.si-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.si-topbar { display: flex; align-items: baseline; gap: 12px; padding: 18px 24px; background: #fff; border-bottom: 1px solid #ebedf2; }
.si-title { font-size: 16px; font-weight: 600; color: #1f2733; }
.si-subtitle { font-size: 12px; color: #98a0b3; }

.si-canvas-wrap { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; overflow: auto; }
.si-canvas { width: 560px; height: 560px; border-radius: 16px; background: #fff; box-shadow: 0 8px 32px rgba(20,26,40,.08); display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
.si-canvas.white { background: #fff; }
.si-canvas.checker { background: repeating-conic-gradient(#fff 0 25%, #ebedf2 0 50%) 0 0 / 20px 20px; }
.si-canvas-img { max-width: 92%; max-height: 92%; object-fit: contain; }
.si-canvas-img.pad { padding: 8%; background: #fff; border-radius: 12px; }
.si-canvas-ph { display: flex; flex-direction: column; align-items: center; gap: 10px; color: #98a0b3; font-size: 13px; }

/* 右侧参数 + 任务 */
.si-props { width: 320px; flex-shrink: 0; background: #fff; border-left: 1px solid #ebedf2; display: flex; flex-direction: column; overflow: hidden; }
.si-prop-sec { padding: 14px 16px; border-bottom: 1px solid #f0f2f6; }
.si-prop-sec.flat { padding: 0; }
.si-prop-title { display: flex; align-items: center; gap: 8px; padding: 14px 16px; font-size: 13px; font-weight: 600; color: #1f2733; }
.si-prop-title.collapse { width: 100%; border: none; background: transparent; cursor: pointer; transition: background .15s; }
.si-prop-title.collapse:hover { background: #f9fafc; }
.si-prop-badge { margin-left: auto; font-size: 11px; font-weight: 400; color: #4f7cff; background: #eef2ff; padding: 2px 8px; border-radius: 10px; }
.si-arrow { margin-left: auto; font-size: 10px; color: #98a0b3; transition: transform .2s; }
.si-arrow.open { transform: rotate(90deg); }
.si-prop-body { padding: 0 16px 14px; }

.si-upload-row { display: flex; gap: 8px; padding: 0 16px 14px; }
.si-upload-btn { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 1px dashed #d8dde8; border-radius: 10px; background: #f9fafc; color: #5a6372; font-size: 12px; cursor: pointer; transition: border-color .15s, background .15s; }
.si-upload-btn:hover { border-color: #4f7cff; background: #f4f7ff; }
.si-upload-btn.wide { flex: none; width: 100%; }
.si-prod-card { display: flex; align-items: center; gap: 10px; margin: 0 16px 14px; padding: 10px; border: 1px solid #e6e9ef; border-radius: 10px; background: #f9fafc; }
.si-prod-card img { width: 44px; height: 44px; border-radius: 6px; object-fit: cover; background: #fff; }
.si-prod-info { flex: 1; min-width: 0; }
.si-prod-name { font-size: 12px; color: #1f2733; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.si-prod-series { font-size: 11px; color: #98a0b3; margin-top: 3px; }
.si-prod-change { padding: 4px 10px; border: 1px solid #e6e9ef; border-radius: 6px; background: #fff; font-size: 12px; color: #5a6372; cursor: pointer; }

.si-seg { display: inline-flex; border: 1px solid #e6e9ef; border-radius: 8px; overflow: hidden; margin-bottom: 10px; }
.si-seg button { padding: 5px 12px; border: none; background: #fff; font-size: 12px; color: #5a6372; cursor: pointer; }
.si-seg button.on { background: #4f7cff; color: #fff; }
.si-scene-list { display: flex; flex-wrap: wrap; gap: 8px; }
.si-scene-pill { display: flex; align-items: center; gap: 6px; padding: 5px 10px; border: 1px solid #e6e9ef; border-radius: 6px; background: #fff; font-size: 12px; cursor: pointer; }
.si-scene-pill.on { border-color: #4f7cff; background: #eef2ff; color: #4f7cff; }
.si-scene-sw { width: 16px; height: 16px; border-radius: 4px; }

.si-style-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.si-style-card { display: flex; flex-direction: column; gap: 6px; padding: 6px; border: 1px solid #e6e9ef; border-radius: 10px; background: #fff; cursor: pointer; }
.si-style-card img { width: 100%; height: 64px; object-fit: cover; border-radius: 6px; }
.si-style-card span { font-size: 12px; color: #1f2733; text-align: center; }
.si-style-card.on { border-color: #4f7cff; background: #eef2ff; }
.si-style-card.on span { color: #4f7cff; font-weight: 600; }

.si-mat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.si-mat-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border: 1px solid #e6e9ef; border-radius: 8px; background: #fff; font-size: 12px; cursor: pointer; }
.si-mat-cell.on { border-color: #4f7cff; background: #eef2ff; color: #4f7cff; }
.si-mat-cell em { font-size: 10px; color: #98a0b3; font-style: normal; }
.si-mat-cell.on em { color: #4f7cff; }

.si-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.si-chip { padding: 5px 12px; border: 1px solid #e6e9ef; border-radius: 6px; background: #fff; font-size: 12px; cursor: pointer; }
.si-chip.on { border-color: #4f7cff; background: #eef2ff; color: #4f7cff; }
.si-hint { font-size: 12px; color: #98a0b3; }

.si-prop-foot { padding: 14px 16px; border-bottom: 1px solid #f0f2f6; }
.si-gen-btn { width: 100%; padding: 12px; border: none; border-radius: 10px; background: #4f7cff; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.si-gen-btn:disabled { background: #c9d8ff; cursor: not-allowed; }
.si-gen-hint { margin-top: 8px; font-size: 12px; color: #f7861a; text-align: center; }

/* 右侧生成任务 */
.si-task-panel { flex: 1; display: flex; flex-direction: column; min-height: 0; background: #fafbfc; }
.si-task-head { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; font-size: 13px; font-weight: 600; color: #1f2733; border-bottom: 1px solid #f0f2f6; }
.si-task-status { font-size: 11px; font-weight: 400; color: #98a0b3; }
.si-task-empty { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; font-size: 12px; color: #98a0b3; text-align: center; line-height: 1.6; }
.si-task-body { flex: 1; overflow: auto; padding: 12px 16px; }
.si-task-group { font-size: 11px; color: #98a0b3; margin: 8px 0 6px; }
.si-task-group:first-child { margin-top: 0; }
.si-task-row { display: flex; flex-wrap: wrap; gap: 10px; }
.si-task-tile { width: calc(50% - 5px); aspect-ratio: 1; border-radius: 10px; overflow: hidden; border: 1px solid #e6e9ef; cursor: pointer; position: relative; background: #fff; }
.si-task-tile img { width: 100%; height: 100%; object-fit: cover; }
.si-task-tile.saving { border-color: #52c41a; }
.si-task-meta { position: absolute; bottom: 0; left: 0; right: 0; padding: 4px 6px; font-size: 10px; color: #fff; background: rgba(0,0,0,.45); }
.si-task-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; background: rgba(0,0,0,.45); opacity: 0; transition: opacity .15s; }
.si-task-tile:hover .si-task-overlay { opacity: 1; }
.si-task-act { padding: 5px 10px; border: none; border-radius: 6px; background: #fff; font-size: 11px; color: #1f2733; cursor: pointer; }
.si-task-act:hover { color: #4f7cff; }

.si-task-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 14px; padding-top: 14px; border-top: 1px solid #e6e9ef; }
.si-task-btn { width: 100%; padding: 9px; border: 1px solid #e6e9ef; border-radius: 8px; background: #fff; font-size: 12px; color: #1f2733; cursor: pointer; }
.si-task-btn.primary { background: #4f7cff; color: #fff; border-color: #4f7cff; }

.si-preview { display: flex; align-items: center; justify-content: center; padding: 20px; }
.si-preview img { max-width: 100%; max-height: 70vh; border-radius: 10px; }
.si-form { padding: 20px; }
.si-form label { display: block; margin-bottom: 12px; }
.si-form label span { display: block; font-size: 12px; color: #5a6372; margin-bottom: 6px; }
.si-form select { width: 100%; padding: 8px 10px; border: 1px solid #e6e9ef; border-radius: 8px; font-size: 13px; }
.si-form-hint { font-size: 12px; color: #98a0b3; line-height: 1.5; }
.si-modal-btn { padding: 8px 16px; border: 1px solid #e6e9ef; border-radius: 8px; background: #fff; font-size: 13px; cursor: pointer; }
.si-modal-btn.primary { background: #4f7cff; color: #fff; border-color: #4f7cff; }
.si-modal-btn:disabled { opacity: .6; cursor: not-allowed; }
</style>
