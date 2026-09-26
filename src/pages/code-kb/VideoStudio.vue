<script setup lang="ts">
/* 素材中心（演示版）：创作首页 + 资产 + 历史创作
   创作＝商品/商品图片出视频（生成）、参考视频换商品出同款（复刻）；生成走演示模拟 */
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import VsEmptyArt from './VsEmptyArt.vue';
import { pushToast } from '../../components/toast';
import { cbMaterials, cbProducts, type CbProduct } from './codeKbData';
import './VideoStudio.css';

type View = 'create' | 'assets' | 'history';
type Tab = '生成' | '复刻';
const view = ref<View>('create');
const tab = ref<Tab>('生成');

const RATIOS = ['智能', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
const DURATIONS = ['5秒', '10秒', '15秒'];
const FPS = ['24fps', '30fps', '60fps'];
const ratio = ref('16:9');
const duration = ref(DURATIONS[0]);
const fps = ref(FPS[1]);
const prefOpen = ref(false);
const ratioCls = (r: string) => (r === '智能' ? 'smart' : 'r' + r.replace(':', 'x'));

const prompt = ref('');
const promptPh = computed(() => (tab.value === '生成' ? '描述想要的视频效果，例如：突出卖点、节奏轻快' : '描述要替换的内容，例如：把视频中的商品换成所选商品'));
const product = ref<CbProduct | null>(null);
const pickOpen = ref(false);
const pickKw = ref('');
const pickList = computed(() => {
  const kw = pickKw.value.trim().toLowerCase();
  return kw ? cbProducts.filter((p) => p.name.toLowerCase().includes(kw) || p.id.toLowerCase().includes(kw)) : cbProducts;
});
interface Shot { url: string; name: string }
const productImagesOf = (p: CbProduct): Shot[] => {
  const mats = cbMaterials.filter((m) => m.productId === p.id && m.type !== '视频').map((m) => ({ url: m.thumb, name: m.name }));
  return mats.length ? mats : [{ url: p.cover, name: p.name }];
};
const productImgs = ref<Shot[]>([]);
const prodExpanded = ref(false);
const pickProduct = (p: CbProduct) => {
  product.value = p;
  productImgs.value = productImagesOf(p);
  prodExpanded.value = false;
  pickOpen.value = false;
  addMenuOpen.value = false;
};
const clearProduct = () => { product.value = null; productImgs.value = []; prodExpanded.value = false; };
const dropProductImg = (i: number) => {
  productImgs.value.splice(i, 1);
  if (!productImgs.value.length) clearProduct();
};

interface UpImage { id: number; url: string; name: string }
const images = ref<UpImage[]>([]);
let imgSeq = 0;
const imgInput = ref<HTMLInputElement | null>(null);
const onImages = (e: Event) => {
  const input = e.target as HTMLInputElement;
  for (const file of Array.from(input.files || [])) {
    if (!file || !file.type.startsWith('image/') || images.value.length >= 9) continue;
    images.value.push({ id: ++imgSeq, url: URL.createObjectURL(file), name: file.name });
  }
  input.value = '';
  addMenuOpen.value = false;
};
const dropImage = (i: number) => {
  const it = images.value[i];
  if (!it) return;
  URL.revokeObjectURL(it.url);
  images.value.splice(i, 1);
};

interface UpVideo { url: string; name: string }
const video = ref<UpVideo | null>(null);
const videoInput = ref<HTMLInputElement | null>(null);
const onVideo = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !file.type.startsWith('video/')) return;
  if (video.value) URL.revokeObjectURL(video.value.url);
  video.value = { url: URL.createObjectURL(file), name: file.name };
  addMenuOpen.value = false;
};
const dropVideo = () => {
  if (video.value) URL.revokeObjectURL(video.value.url);
  video.value = null;
};

const addMenuOpen = ref(false);
const addOptions = computed(() => (tab.value === '生成' ? ['上传图片', '选择商品'] : ['上传参考视频', '选择商品']));
const onAddOption = (opt: string) => {
  if (opt === '上传图片') imgInput.value?.click();
  else if (opt === '上传参考视频') videoInput.value?.click();
  else { pickOpen.value = true; }
  if (opt !== '选择商品') addMenuOpen.value = false;
};

const closePops = () => { prefOpen.value = false; pickOpen.value = false; addMenuOpen.value = false; moreId.value = null; };
const togglePref = () => { prefOpen.value = !prefOpen.value; pickOpen.value = false; addMenuOpen.value = false; };
const toggleAdd = () => { addMenuOpen.value = !addMenuOpen.value; prefOpen.value = false; pickOpen.value = false; };

/* ---------- 演示生成与历史创作 ---------- */
interface GenRecord {
  id: string;
  mode: Tab;
  prompt: string;
  ratio: string;
  duration: string;
  fps: string;
  createdAt: string;
  productId: string | null;
  productName: string | null;
  productCover: string | null;
  productImages: Shot[];
  images: Shot[];
  video: Shot | null;
  resultImages: Shot[];
  resultVideo: Shot | null;
  kind: '视频' | '图片';
}
const records = ref<GenRecord[]>([]);
let recSeq = 0;
const generating = ref<string | null>(null);

const doGenerate = (src: {
  mode: Tab; prompt: string; ratio: string; duration: string; fps: string;
  product: CbProduct | null; productImages: Shot[]; images: Shot[]; video: Shot | null;
}, key: string) => {
  generating.value = key;
  window.setTimeout(() => {
    generating.value = null;
    const resultImages = src.mode === '生成'
      ? (src.images.length ? src.images : src.productImages)
      : [];
    records.value = [{
      id: `gen-${++recSeq}`,
      mode: src.mode,
      prompt: src.prompt,
      ratio: src.ratio,
      duration: src.duration,
      fps: src.fps,
      createdAt: new Date().toISOString(),
      productId: src.product?.id ?? null,
      productName: src.product?.name ?? null,
      productCover: src.product?.cover ?? null,
      productImages: src.productImages,
      images: src.images,
      video: src.video,
      resultImages,
      resultVideo: src.mode === '复刻' ? src.video : null,
      kind: src.mode === '生成' && !src.product && src.images.length ? '图片' : '视频',
    }, ...records.value];
    pushToast('演示生成完成，可在历史创作查看');
  }, 2200);
};

const generate = () => {
  if (generating.value) return;
  if (tab.value === '生成') {
    if (!product.value && !images.value.length) { pushToast('请先选择商品或上传商品图片', 'error'); return; }
  } else {
    if (!video.value) { pushToast('请先上传参考视频', 'error'); return; }
    if (!product.value) { pushToast('请选择要替换的商品', 'error'); return; }
  }
  doGenerate({
    mode: tab.value, prompt: prompt.value.trim(), ratio: ratio.value, duration: duration.value, fps: fps.value,
    product: product.value, productImages: productImgs.value, images: images.value.map((im) => ({ url: im.url, name: im.name })), video: video.value,
  }, 'main');
};

const regen = (r: GenRecord) => {
  if (generating.value) return;
  doGenerate({
    mode: r.mode, prompt: r.prompt, ratio: r.ratio, duration: r.duration, fps: r.fps,
    product: cbProducts.find((p) => p.id === r.productId) ?? null, productImages: r.productImages, images: r.images, video: r.video,
  }, r.id);
};

const reedit = (r: GenRecord) => {
  tab.value = r.mode;
  prompt.value = r.prompt;
  ratio.value = r.ratio;
  duration.value = r.duration;
  fps.value = r.fps;
  product.value = cbProducts.find((p) => p.id === r.productId) ?? null;
  productImgs.value = r.productImages.map((im) => ({ ...im }));
  prodExpanded.value = false;
  images.value = r.images.map((im) => ({ id: ++imgSeq, url: im.url, name: im.name }));
  video.value = r.video;
  composerOn.value = true;
  nextTick(() => promptEl.value?.focus());
};

const moreId = ref<string | null>(null);
const deleteTarget = ref<GenRecord | null>(null);
const confirmDelete = () => {
  const t = deleteTarget.value;
  if (!t) return;
  records.value = records.value.filter((r) => r.id !== t.id);
  deleteTarget.value = null;
  pushToast('已删除该创作记录');
};

/* ---------- 资产与历史的分组、筛选 ---------- */
const dayLabel = (iso: string) => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
};
const timeLabel = (iso: string) => new Date(iso).toLocaleString('zh-CN', { hour12: false });
const groupByDay = <T extends { createdAt: string }>(list: T[]) => {
  const groups: { label: string; items: T[] }[] = [];
  for (const it of list) {
    const label = dayLabel(it.createdAt);
    const g = groups.find((x) => x.label === label);
    if (g) g.items.push(it);
    else groups.push({ label, items: [it] });
  }
  return groups;
};

const ASSET_TYPES = ['图片', '视频'];
const RANGES = ['全部', '今天', '近7天'];
const SORTS = ['时间降序', '时间升序'];
const assetType = ref('图片');
const assetRange = ref('全部');
const assetSort = ref('时间降序');

interface AssetItem { kind: string; url: string; name: string; createdAt: string; video: boolean }
const assetItems = computed<AssetItem[]>(() => {
  const now = Date.now();
  const list: AssetItem[] = [];
  for (const r of records.value) {
    for (const im of r.resultImages) list.push({ kind: '图片', url: im.url, name: im.name, createdAt: r.createdAt, video: false });
    if (r.resultVideo) list.push({ kind: '视频', url: r.resultVideo.url, name: r.resultVideo.name, createdAt: r.createdAt, video: true });
  }
  const filtered = list.filter((it) => {
    if (it.kind !== assetType.value) return false;
    if (assetRange.value === '今天') return dayLabel(it.createdAt) === dayLabel(new Date().toISOString());
    if (assetRange.value === '近7天') return now - Date.parse(it.createdAt) <= 7 * 86400_000;
    return true;
  });
  filtered.sort((a, b) => (assetSort.value === '时间降序' ? Date.parse(b.createdAt) - Date.parse(a.createdAt) : Date.parse(a.createdAt) - Date.parse(b.createdAt)));
  return filtered;
});
const assetGroups = computed(() => groupByDay(assetItems.value));
const historyGroups = computed(() => groupByDay(records.value));

const recCover = (r: GenRecord) => r.resultImages[0]?.url ?? r.productCover ?? r.productImages[0]?.url ?? r.images[0]?.url ?? null;
const recTitle = (r: GenRecord) => r.productName || r.prompt || r.mode;
const gotoRecord = (id: string) => {
  view.value = 'history';
  closePops();
  nextTick(() => {
    document.getElementById(`vs-rec-${id}`)?.scrollIntoView({ block: 'center' });
  });
};

/* ---------- 停靠输入卡双态 / 回到顶部 / 附件扇堆展开 ---------- */
const promptEl = ref<HTMLTextAreaElement | null>(null);
const composerOn = ref(false);
const openComposer = () => {
  composerOn.value = true;
  nextTick(() => promptEl.value?.focus());
};
const onCardBlur = (e: FocusEvent) => {
  const next = e.relatedTarget as Node | null;
  if (next && e.currentTarget instanceof Node && e.currentTarget.contains(next)) return;
  composerOn.value = false;
};
const pillAtt = computed<RecAtt | null>(() => {
  const p = productImgs.value[0];
  if (p) return { url: p.url, video: false, name: p.name };
  const im = images.value[0];
  if (im) return { url: im.url, video: false, name: im.name };
  if (video.value) return { url: null, video: true, name: video.value.name };
  return null;
});
const fanOpen = ref<Record<string, boolean>>({});
const toggleFan = (id: string) => { fanOpen.value[id] = !fanOpen.value[id]; };
const groupAllOpen = (items: GenRecord[]) => items.every((r) => !recAtts(r).length || fanOpen.value[r.id]);
const toggleGroupFans = (items: GenRecord[]) => {
  const on = !groupAllOpen(items);
  for (const r of items) if (recAtts(r).length) fanOpen.value[r.id] = on;
};
const showTop = ref(false);
const onAppScroll = () => { const el = document.querySelector('.app-content'); showTop.value = (el?.scrollTop ?? 0) > 80; };
onMounted(() => document.querySelector('.app-content')?.addEventListener('scroll', onAppScroll, { passive: true }));
onUnmounted(() => document.querySelector('.app-content')?.removeEventListener('scroll', onAppScroll));
const toTop = () => document.querySelector('.app-content')?.scrollTo({ top: 0, behavior: 'smooth' });
const feedback = (r: GenRecord) => {
  moreId.value = null;
  pushToast(`已反馈「${recTitle(r)}」的生成问题`, 'success');
};

interface RecAtt { url: string | null; video: boolean; name: string }
const recAtts = (r: GenRecord): RecAtt[] => {
  const list: RecAtt[] = [];
  const srcs = r.productImages.length ? r.productImages : r.productCover ? [{ url: r.productCover, name: r.productName || '商品' }] : [];
  for (const im of srcs) list.push({ url: im.url, video: false, name: im.name });
  for (const im of r.images) list.push({ url: im.url, video: false, name: im.name });
  if (r.video) list.push({ url: null, video: true, name: r.video.name });
  return list.slice(0, 9);
};

const playState = ref<{ id: string; t: number; on: boolean } | null>(null);
let playTimer: ReturnType<typeof setInterval> | null = null;
const stopPlayTimer = () => {
  if (playTimer !== null) {
    clearInterval(playTimer);
    playTimer = null;
  }
};
onUnmounted(stopPlayTimer);
const durSec = (r: GenRecord) => parseInt(r.duration, 10) || 5;
const playT = (r: GenRecord) => (playState.value && playState.value.id === r.id ? playState.value.t : 0);
const isPlaying = (r: GenRecord) => !!playState.value && playState.value.id === r.id && playState.value.on;
const playIdx = (r: GenRecord) => {
  const len = r.resultImages.length;
  if (!len) return 0;
  return Math.min(Math.floor((playT(r) / durSec(r)) * len), len - 1);
};
const togglePlay = (r: GenRecord) => {
  const cur = playState.value;
  if (cur && cur.id === r.id && cur.on) {
    cur.on = false;
    stopPlayTimer();
    return;
  }
  if (cur && cur.id === r.id) {
    if (cur.t >= durSec(r)) cur.t = 0;
    cur.on = true;
  } else {
    playState.value = { id: r.id, t: 0, on: true };
  }
  stopPlayTimer();
  playTimer = setInterval(() => {
    const s = playState.value;
    if (!s || !s.on) {
      stopPlayTimer();
      return;
    }
    s.t = Math.min(s.t + 0.1, durSec(r));
    if (s.t >= durSec(r)) {
      s.on = false;
      stopPlayTimer();
    }
  }, 100);
};
const fmtSec = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const starred = ref<string[]>([]);
const toggleStar = (id: string) => {
  const i = starred.value.indexOf(id);
  if (i >= 0) starred.value.splice(i, 1);
  else starred.value.push(id);
};

interface PvItem { url: string; name: string; video: boolean }
const previewList = ref<PvItem[]>([]);
const previewIdx = ref(0);
const preview = computed(() => previewList.value[previewIdx.value] ?? null);
const previewError = ref(false);
const openPreviewList = (list: PvItem[], idx: number) => { previewError.value = false; previewList.value = list; previewIdx.value = idx; };
const openPreview = (it: AssetItem) => openPreviewList([{ url: it.url, name: it.name, video: it.video }], 0);
const openProdPreview = (i: number) => openPreviewList(productImgs.value.map((im) => ({ url: im.url, name: im.name, video: false })), i);
const switchPv = (i: number) => { previewIdx.value = i; previewError.value = false; };
const closePreview = () => { previewList.value = []; previewIdx.value = 0; };
</script>

<template>
  <div class="vs-home" @click="closePops">
    <div class="vs-views" @click.stop>
      <button type="button" class="vs-view" :class="view === 'create' ? 'on' : ''" @click="view = 'create'; closePops()">创作</button>
      <button type="button" class="vs-view" :class="view === 'assets' ? 'on' : ''" @click="view = 'assets'; closePops()">资产</button>
      <button type="button" class="vs-view" :class="view === 'history' ? 'on' : ''" @click="view = 'history'; closePops()">历史创作</button>
    </div>

    <!-- 创作：顶部动效装饰 + 生成/复刻 + 输入卡 -->
    <template v-if="view === 'create'">
      <div class="vs-hero">
        <span class="vs-spark s1" /><span class="vs-spark s2" /><span class="vs-spark s3" /><span class="vs-spark s4" />
        <h1 class="vs-hero-t">你好，今天想要创作什么？</h1>
        <div class="vs-modes" @click.stop>
          <button type="button" class="vs-mode" :class="tab === '生成' ? 'on' : ''" @click="tab = '生成'; closePops()">
            <span class="vs-mode-t">生成</span>
          </button>
          <button type="button" class="vs-mode" :class="tab === '复刻' ? 'on' : ''" @click="tab = '复刻'; closePops()">
            <span class="vs-mode-t">复刻</span>
          </button>
        </div>
      </div>

    </template>

    <!-- 资产：类型分段 + 时间/排序 + 按日分组的素材卡 -->
    <template v-else-if="view === 'assets'">
      <div class="vs-toolbar" @click.stop>
        <div class="vs-seg small">
          <button v-for="t in ASSET_TYPES" :key="t" type="button" class="vs-seg-btn" :class="assetType === t ? 'on' : ''" @click="assetType = t">{{ t }}</button>
        </div>
        <div class="vs-toolright">
          <BubbleSelect class-name="vs-sel" :value="assetRange" :options="RANGES" @change="(v: string) => (assetRange = v)" />
          <BubbleSelect class-name="vs-sel" :value="assetSort" :options="SORTS" @change="(v: string) => (assetSort = v)" />
        </div>
      </div>
      <div v-if="assetGroups.length" class="vs-groups">
        <div v-for="g in assetGroups" :key="g.label" class="vs-group">
          <div class="vs-group-t">{{ g.label }}</div>
          <div class="vs-assetgrid">
            <button v-for="(it, i) in g.items" :key="it.url + i" type="button" class="vs-asset" @click="openPreview(it)">
              <span class="vs-asset-thumb">
                <img v-if="!it.video" :src="it.url" :alt="it.name" />
                <video v-else :src="it.url" preload="metadata" muted playsinline />
                <span v-if="it.video" class="vs-play">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                </span>
              </span>
              <span class="vs-asset-name" :title="it.name">{{ it.name }}</span>
              <span class="vs-asset-meta">{{ timeLabel(it.createdAt) }}</span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="vs-empty">
        <div class="vs-empty-art"><VsEmptyArt /></div>
        <div class="vs-empty-t">暂无{{ assetType }}资产</div>
      </div>
    </template>

    <!-- 历史创作：按日分组的创作记录（附件/描述/参数/状态/操作/结果） -->
    <template v-else>
      <div v-if="historyGroups.length" class="vs-groups">
        <div v-for="g in historyGroups" :key="g.label" class="vs-group">
          <div class="vs-group-t date">
            {{ g.label }}
            <button
              v-if="g.items.some((r) => recAtts(r).length)"
              type="button"
              class="vs-refchip"
              :class="groupAllOpen(g.items) ? 'on' : ''"
              @click="toggleGroupFans(g.items)"
            >{{ groupAllOpen(g.items) ? '收起参考' : '全部参考' }}</button>
          </div>
          <div v-for="(r, i) in g.items" :key="r.id" :id="`vs-rec-${r.id}`" class="vs-rec" :style="{ animationDelay: `${i * 60}ms` }">
            <div class="vs-rec-head">
              <span v-if="recAtts(r).length" class="vs-rec-fan" :class="fanOpen[r.id] ? 'open' : ''" :style="{ '--n': recAtts(r).length }">
                <button
                  v-for="(a, j) in recAtts(r)"
                  :key="j"
                  type="button"
                  class="vs-fan-card"
                  :class="a.video ? 'video' : ''"
                  :style="{ '--j': j, zIndex: j + 1 }"
                  :title="a.name"
                  @click="openPreviewList(recAtts(r).map((x) => ({ url: x.url || '', name: x.name, video: x.video })), j)"
                >
                  <img v-if="!a.video" :src="a.url || ''" :alt="a.name" />
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                </button>
                <span class="vs-fan-quote" aria-hidden="true">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M10 8H6a3 3 0 0 0-3 3v5h7v-7H7.5A2.5 2.5 0 0 1 10 6.5zm11 0h-4a3 3 0 0 0-3 3v5h7v-7h-2.5A2.5 2.5 0 0 1 21 6.5z" /></svg>
                </span>
                <button type="button" class="vs-fan-more" :title="fanOpen[r.id] ? '收起附件' : '展开附件'" @click="toggleFan(r.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </span>
              <div class="vs-rec-body">
                <p class="vs-rec-prompt">
                  {{ r.prompt || '—' }}
                  <span class="vs-rec-meta">
                    <span>{{ r.mode }}</span>
                    <template v-if="r.productName"><i></i><span>{{ r.productName }}</span></template>
                    <i></i><span>{{ r.duration }}</span>
                    <i></i><span>{{ r.ratio }}</span>
                    <template v-if="r.fps"><i></i><span>{{ r.fps }}</span></template>
                    <i></i><time :datetime="r.createdAt">{{ timeLabel(r.createdAt) }}</time>
                  </span>
                </p>
              </div>
            </div>
            <div class="vs-rec-status"><span class="dot" />演示生成完成</div>
            <div v-if="r.resultVideo" class="vs-rec-result">
              <video :src="r.resultVideo.url" controls playsinline preload="metadata" @error="($event.target as HTMLVideoElement).style.display = 'none'" />
            </div>
            <div v-else-if="r.kind === '图片' && r.resultImages.length" class="vs-rec-grid">
              <button v-for="(im, gi) in r.resultImages.slice(0, 4)" :key="im.url + gi" type="button" :title="im.name" @click="openPreviewList(r.resultImages.map((x) => ({ url: x.url, name: x.name, video: false })), gi)">
                <img :src="im.url" :alt="im.name" />
              </button>
            </div>
            <div v-else-if="r.resultImages.length" class="vs-player" @click="togglePlay(r)">
              <img class="vs-player-frame" :src="r.resultImages[playIdx(r)].url" :alt="r.resultImages[playIdx(r)].name" />
              <span v-if="!isPlaying(r)" class="vs-player-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
              </span>
              <div class="vs-player-tools" @click.stop>
                <a :href="r.resultImages[playIdx(r)].url" :download="r.resultImages[playIdx(r)].name" title="下载">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 19h16" /></svg>
                </a>
                <button type="button" :class="starred.includes(r.id) ? 'on' : ''" :title="starred.includes(r.id) ? '取消收藏' : '收藏'" @click="toggleStar(r.id)">
                  <svg width="14" height="14" viewBox="0 0 24 24" :fill="starred.includes(r.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" /></svg>
                </button>
                <button type="button" title="预览" @click="openPreviewList(r.resultImages.map((x) => ({ url: x.url, name: x.name, video: false })), playIdx(r))">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                </button>
              </div>
              <div class="vs-player-bar" @click.stop>
                <button type="button" class="vs-pp" :title="isPlaying(r) ? '暂停' : '播放'" @click="togglePlay(r)">
                  <svg v-if="!isPlaying(r)" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5h4v14H7z" /><path d="M13 5h4v14h-4z" /></svg>
                </button>
                <span class="vs-time">{{ fmtSec(playT(r)) }} / {{ fmtSec(durSec(r)) }}</span>
                <span class="vs-track"><i :style="{ width: `${(playT(r) / durSec(r)) * 100}%` }" /></span>
              </div>
            </div>
            <div class="vs-rec-actions" @click.stop>
              <button type="button" class="vs-act" @click="reedit(r)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                重新编辑
              </button>
              <button type="button" class="vs-act" :disabled="generating !== null" @click="regen(r)">
                <svg v-if="generating !== r.id" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
                <span v-else class="vs-spin small" />
                再次生成
              </button>
              <span class="vs-morewrap">
                <button type="button" class="vs-act icon" :class="moreId === r.id ? 'open' : ''" title="更多" @click="moreId = moreId === r.id ? null : r.id">···</button>
                <div v-if="moreId === r.id" class="vs-pop more-pop">
                  <button type="button" class="vs-pop-item" @click="feedback(r)">反馈生成问题</button>
                  <button type="button" class="vs-pop-item danger" @click="deleteTarget = r; moreId = null">删除</button>
                </div>
              </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="vs-empty">
        <div class="vs-empty-art"><VsEmptyArt /></div>
        <div class="vs-empty-t">暂无历史创作</div>
      </div>
    </template>

    <div v-if="view === 'history' && records.length && showTop" class="vs-totop-row">
      <button type="button" class="vs-totop" @click="toTop">
        回到顶部
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6" /></svg>
      </button>
    </div>

    <div v-if="view === 'history' && records.length && !composerOn" class="vs-pill" @click="openComposer">
      <span v-if="pillAtt" class="vs-pill-att">
        <img v-if="!pillAtt.video" :src="pillAtt.url || ''" :alt="pillAtt.name" />
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
      </span>
      <span class="vs-pill-t">{{ prompt || promptPh }}</span>
      <button type="button" class="vs-pill-go" title="生成" :disabled="generating === 'main'" @click.stop="generate">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
      </button>
    </div>

    <div v-if="view === 'create' || (view === 'history' && records.length && composerOn)" class="vs-card" :class="view === 'history' ? 'docked' : ''" @click.stop @focusout="onCardBlur">
      <div class="vs-inputrow" :class="product && prodExpanded ? 'stacked' : ''">
        <div class="vs-tiles">
          <span class="vs-tilewrap">
            <button type="button" class="vs-tile add" title="添加图片、商品或参考视频" @click="toggleAdd">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
            <div v-if="addMenuOpen" class="vs-pop add-pop">
              <button v-for="opt in addOptions" :key="opt" type="button" class="vs-pop-item" @click="onAddOption(opt)">{{ opt }}</button>
            </div>
          </span>
          <span v-if="product" class="vs-tilewrap prod">
            <template v-if="!prodExpanded">
              <button type="button" class="vs-stack" :title="`${product.name} · 共 ${productImgs.length} 张，点击展开`" @click="prodExpanded = true">
                <span v-for="(im, i) in productImgs.slice(0, 3)" :key="i" class="vs-stack-card" :class="'c' + i"><img :src="im.url" :alt="im.name" /></span>
                <span class="vs-stack-n">{{ productImgs.length }}</span>
              </button>
              <button type="button" class="vs-tile-x" title="移除商品" @click="clearProduct">×</button>
            </template>
            <template v-else>
              <span v-for="(im, i) in productImgs" :key="im.url + i" class="vs-tilewrap">
                <button type="button" class="vs-tile img" :title="im.name" @click="openProdPreview(i)">
                  <img :src="im.url" :alt="im.name" />
                  <span class="vs-tile-tag">商品</span>
                </button>
                <button type="button" class="vs-tile-x" title="移除该图片" @click="dropProductImg(i)">×</button>
              </span>
              <button type="button" class="vs-fold" title="收起商品图片" @click="prodExpanded = false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><g transform="rotate(180 12 12)"><path d="M5.1 13.4a1.2 1.2 0 0 1 1.7-1.66l5.2 4.86 5.2-4.86a1.2 1.2 0 0 1 1.7 1.66l-6 5.6a1.2 1.2 0 0 1-1.8 0z" /></g></svg>
              </button>
            </template>
          </span>
          <span v-for="(im, i) in images" :key="im.id" class="vs-tilewrap">
            <span class="vs-tile img" :title="im.name">
              <img :src="im.url" :alt="im.name" />
            </span>
            <button type="button" class="vs-tile-x" title="移除图片" @click="dropImage(i)">×</button>
          </span>
          <span v-if="video" class="vs-tilewrap">
            <span class="vs-tile video" :title="video.name">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
            </span>
            <button type="button" class="vs-tile-x" title="移除参考视频" @click="dropVideo">×</button>
          </span>
        </div>
        <textarea
          ref="promptEl"
          v-model="prompt"
          class="vs-prompt"
          rows="2"
          :placeholder="promptPh"
          @click="prefOpen = false; pickOpen = false; addMenuOpen = false"
        />
      </div>

      <div class="vs-bar">
        <div class="vs-prefwrap">
          <button type="button" class="vs-pref" :class="prefOpen ? 'open' : ''" @click="togglePref">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /></svg>
            生成偏好
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
          </button>
          <div v-if="prefOpen" class="vs-pop pref-pop" @click.stop>
            <div class="vs-pop-t">选择比例</div>
            <div class="vs-ratiogrid">
              <button v-for="r in RATIOS" :key="r" type="button" class="vs-ratio-cell" :class="ratio === r ? 'on' : ''" @click="ratio = r">
                <span class="vs-rframeslot"><span class="vs-rframe" :class="ratioCls(r)" /></span>
                {{ r }}
              </button>
            </div>
            <div class="vs-pop-t gap">其他设置</div>
            <div class="vs-prefrow">
              <BubbleSelect class-name="vs-sel" :value="duration" :options="DURATIONS" @change="(v: string) => (duration = v)" />
              <BubbleSelect class-name="vs-sel" :value="fps" :options="FPS" @change="(v: string) => (fps = v)" />
            </div>
          </div>
        </div>
        <button type="button" class="vs-go" :class="generating === 'main' ? 'busy' : ''" title="生成" :disabled="generating === 'main'" @click="generate">
          <svg v-if="generating !== 'main'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
          <span v-else class="vs-spin" />
        </button>
      </div>

      <div v-if="pickOpen" class="vs-pop pick-pop" @click.stop>
        <input v-model="pickKw" class="vs-pick-search" placeholder="搜索商品名称或编码" />
        <div class="vs-pick-list">
          <button v-for="p in pickList" :key="p.id" type="button" class="vs-pick-row" :class="product?.id === p.id ? 'on' : ''" @click="pickProduct(p)">
            <img :src="p.cover" :alt="p.name" />
            <span class="vs-pick-txt">
              <span class="vs-pick-name">{{ p.name }}</span>
              <span class="vs-pick-meta">{{ p.id }} · {{ p.shop }}</span>
            </span>
          </button>
          <div v-if="!pickList.length" class="vs-pick-empty">暂无匹配商品</div>
        </div>
      </div>
    </div>

    <!-- 最近创作：横向视频卡行，点击定位到历史创作对应记录 -->
    <div v-if="view === 'create' && records.length" class="vs-recent">
      <div class="vs-recent-t">最近创作</div>
      <div class="vs-recent-row">
        <button v-for="r in records" :key="r.id" type="button" class="vs-recent-card" :title="recTitle(r)" @click="gotoRecord(r.id)">
          <img v-if="recCover(r)" :src="recCover(r)!" :alt="recTitle(r)" />
          <span v-else class="vs-recent-ph" />
          <span class="vs-recent-txt">
            <span class="vs-recent-name">{{ recTitle(r) }}</span>
            <span class="vs-recent-sub">{{ r.mode }}｜{{ r.duration }}｜{{ r.ratio }}｜{{ dayLabel(r.createdAt) }}</span>
          </span>
        </button>
      </div>
    </div>

    <input ref="imgInput" type="file" accept="image/*" multiple hidden @change="onImages" />
    <input ref="videoInput" type="file" accept="video/*" hidden @change="onVideo" />

    <Teleport to="body">
      <div v-if="preview" class="vs-pvmask" role="dialog" aria-modal="true" :aria-label="preview.name" @click.self="closePreview">
        <button type="button" class="vs-pvclose" title="关闭（Esc）" @click="closePreview">×</button>
        <div class="vs-pvstage" @click.self="closePreview">
          <div v-if="previewError" class="vs-pvph">无法播放</div>
          <video v-else-if="preview.video" :src="preview.url" controls autoplay playsinline @error="previewError = true" />
          <img v-else :src="preview.url" :alt="preview.name" @error="previewError = true" />
        </div>
        <div v-if="previewList.length > 1" class="vs-pvstrip">
          <button v-for="(p, i) in previewList" :key="p.url + i" type="button" class="vs-pvthumb" :class="i === previewIdx ? 'on' : ''" :title="p.name" @click="switchPv(i)">
            <img v-if="!p.video" :src="p.url" :alt="p.name" />
            <video v-else :src="p.url" preload="metadata" muted playsinline />
          </button>
        </div>
      </div>
    </Teleport>

    <div v-if="deleteTarget" class="pm-page pm-host">
      <Modal title="删除创作记录" sub="删除后该记录及其资产将不再展示" @close="deleteTarget = null">
        <div class="vs-delbody">确认删除「{{ deleteTarget.prompt || deleteTarget.mode }}」这条创作记录？</div>
        <template #foot>
          <button type="button" class="sg-btn" @click="deleteTarget = null">取消</button>
          <button type="button" class="sg-btn primary" @click="confirmDelete">删除</button>
        </template>
      </Modal>
    </div>
  </div>
</template>
