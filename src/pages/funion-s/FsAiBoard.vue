<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import { beeProducts, type BeeProduct } from '../bee-plugin/data';

const props = defineProps<{
  userName: string;
  product: BeeProduct | null;
  spend: (n: number) => boolean;
  productImgs: { name: string; imgs: string[] }[];
}>();
const emit = defineEmits<{
  (e: 'view', v: 'list' | 'detail'): void;
  (e: 'replace', p: { group: string; idx: number; url: string }): void;
  (e: 'replace-all', list: { group: string; idx: number; url: string }[]): void;
  (e: 'beautify', img: string): void;
}>();

/* 套图/多图无尺寸概念（套图各图型固定规格、多图跟随原图） */

/* 任务制图板：任务与商品关联——左侧选定商品后，右栏展示该商品的生成任务 */
type Kind = 'set' | 'multi' | 'single';
interface TaskImg { state: 'running' | 'done' | 'fail'; progress: number; img: string; label?: string; willFail?: boolean; }
interface FsTask {
  id: number; code: string; kind: Kind; method: string; title: string;
  time: string; user: string; ratio: string; srcImgs?: string[];
  productId: string; productImg: string; productTitle: string; platform: string;
  imgs: TaskImg[];
}
const KIND_LABEL: Record<Kind, string> = { set: '整品生成', multi: '多图生成', single: '单图生成' };
/* 套图生成：按图片类型分区，各类型自有张数 */
const SET_SECTIONS = [
  { label: '主图', n: 2 }, { label: 'SKU图', n: 2 }, { label: '详情图', n: 2 }, { label: '白底图', n: 1 }, { label: '场景图', n: 1 },
];
const SET_LABELS = SET_SECTIONS.map((s) => s.label);

/* 任务状态：生成中 / 成功 / 部分完成 / 失败 */
type TaskState = 'running' | 'done' | 'partial' | 'fail';
const stateOf = (t: FsTask): TaskState => {
  if (t.imgs.some((i) => i.state === 'running')) return 'running';
  const f = t.imgs.filter((i) => i.state === 'fail').length;
  if (f === t.imgs.length) return 'fail';
  return f > 0 ? 'partial' : 'done';
};
const progressOf = (t: FsTask) => Math.round(t.imgs.reduce((s, i) => s + i.progress, 0) / Math.max(1, t.imgs.length));
const stateText = (t: FsTask) => {
  const s = stateOf(t);
  if (s === 'running') return `生成中 ${progressOf(t)}%`;
  if (s === 'partial') return `部分完成 ${t.imgs.filter((i) => i.state === 'done').length}/${t.imgs.length}`;
  return s === 'done' ? '成功' : '失败';
};

const now = () => {
  const n = new Date();
  const p = (x: number) => `${x}`.padStart(2, '0');
  return `${n.getFullYear()}/${p(n.getMonth() + 1)}/${p(n.getDate())} ${p(n.getHours())}:${p(n.getMinutes())}`;
};
const genCode = () => Math.random().toString(36).slice(2, 8);

/* 结果图与选品库同源：套图=按类型分区成套，多图=4 张，单图=1 张 */
const buildImgs = (kind: Kind, srcImg?: string, fails = 0): TaskImg[] => {
  const base = Math.max(0, beeProducts.findIndex((p) => p.img === (srcImg || props.product?.img)));
  const at = (o: number) => beeProducts[(base + o) % beeProducts.length].img;
  if (kind === 'set') {
    const out: TaskImg[] = [];
    let o = 0;
    for (const s of SET_SECTIONS) for (let k = 0; k < s.n; k++) out.push({ state: 'running', progress: 0, img: at(o++), label: s.label, willFail: false });
    return out;
  }
  const urls = kind === 'multi' ? [at(1), at(2), at(3), at(4)] : [at(5)];
  return urls.map((img, i) => ({ state: 'running' as const, progress: 0, img, willFail: i >= urls.length - fails }));
};

const tasks = ref<FsTask[]>([]);
/* 种子任务（绑定当前商品）：覆盖 生成中/成功/部分完成/失败 四态，便于演示与回归 */
const seed = () => {
  const p = props.product;
  if (!p) return;
  const mk = (kind: Kind, method: string, title: string, imgs: TaskImg[]): FsTask => ({
    id: Date.now() + Math.floor(Math.random() * 1000), code: genCode(), kind, method, title,
    time: now(), user: props.userName, ratio: kind === 'single' ? '3:4' : '1:1',
    productId: p.id, productImg: p.img, productTitle: p.title, platform: p.platform, imgs,
  });
  tasks.value = [
    mk('set', '套图生成', `商品整品套图生成 · ${p.title}`, buildImgs('set').map((i): TaskImg => ({ ...i, progress: 24 }))),
    mk('multi', '图片美化', '商品主图批量图片美化（4张）', buildImgs('multi').map((i): TaskImg => ({ ...i, state: 'done', progress: 100 }))),
    mk('multi', '图片复刻', '复刻竞品主图构图，生成 4 张', buildImgs('multi', undefined, 1).map((i): TaskImg => ({ ...i, state: i.willFail ? 'fail' : 'done', progress: 100 }))),
    mk('single', '单图改图', '商品更换为浴室场景风格，背景浅蓝色调，光线柔和', buildImgs('single', undefined, 1).map((i): TaskImg => ({ ...i, state: 'fail', progress: 100 }))),
  ];
};

/* 进度引擎：逐图推进，满百按 willFail 判定成功/失败；整任务脱离生成中时提示 */
let timer: ReturnType<typeof setInterval> | null = null;
const tick = () => {
  for (const t of tasks.value) {
    if (!t.imgs.some((i) => i.state === 'running')) continue;
    let finished = false;
    for (const i of t.imgs) {
      if (i.state !== 'running') continue;
      i.progress = Math.min(100, i.progress + 6 + Math.round(Math.random() * 4));
      if (i.progress >= 100) { i.state = i.willFail ? 'fail' : 'done'; finished = true; }
    }
    if (finished && !t.imgs.some((i) => i.state === 'running')) pushToast('AI 生成完成（演示）');
  }
};

/* 创建任务：套图/多图 8 算力，单图改图 3 算力；算力校验交给父级 spend */
const view = ref<'list' | 'detail'>('list');
const activeId = ref<number | null>(null);
const active = computed(() => tasks.value.find((t) => t.id === activeId.value) || null);
/* 列表仅展示当前商品的任务 */
const listTasks = computed(() => tasks.value.filter((t) => props.product && t.productId === props.product.id));

const createTask = (kind: Kind, method: string, opts?: { title?: string; srcImgs?: string[]; ratio?: string }) => {
  const p = props.product;
  if (!p) return;
  const cost = kind === 'single' ? 3 : 8;
  if (!props.spend(cost)) return;
  const title = opts?.title || (kind === 'set'
    ? `商品整品套图生成 · ${p.title}`
    : `商品图片批量${method}（4张）`);
  tasks.value.unshift({
    id: Date.now(), code: genCode(), kind, method, title, time: now(), user: props.userName,
    /* 套图/多图无尺寸概念；单图用弹窗所选尺寸 */
    ratio: opts?.ratio || '1:1', srcImgs: opts?.srcImgs,
    productId: p.id, productImg: p.img, productTitle: p.title, platform: p.platform,
    imgs: buildImgs(kind, opts?.srcImgs?.[0]),
  });
  view.value = 'list';
  activeId.value = null;
};
defineExpose({ createTask });

/* 列表 ↔ 详情 */
const openTask = (t: FsTask) => { activeId.value = t.id; view.value = 'detail'; emit('view', 'detail'); };
const back = () => { view.value = 'list'; activeId.value = null; emit('view', 'list'); };
/* 套图详情：按图片类型分区 */
const setSections = (t: FsTask) => SET_LABELS.map((lb) => ({ label: lb, imgs: t.imgs.filter((x) => x.label === lb) }));
const gridCls = (t: FsTask) => `r${t.ratio.replace(':', '')}`;
/* 切换商品：回到列表，展示新商品的任务 */
watch(() => props.product?.id, back);

/* 失败/部分完成：重新生成（免费），仅重置失败图 */
const regen = (t: FsTask) => {
  for (const i of t.imgs) if (i.state === 'fail') { i.state = 'running'; i.progress = 0; i.willFail = false; }
  pushToast('已重新发起生成任务');
};

/* 预览 / 美化 / 重新生成 / 拖拽替换 */
const previewImg = ref<string | null>(null);
const openPreview = (img: string) => { previewImg.value = img; };
const onDragStart = (e: DragEvent, img: string) => {
  e.dataTransfer && (e.dataTransfer.setData('text/plain', JSON.stringify({ url: img })), e.dataTransfer.effectAllowed = 'move');
};
const beautify = (img: string) => { emit('beautify', img); };
const mapSetReplaceAll = (t: FsTask) => {
  const list: { group: string; idx: number; url: string }[] = [];
  for (const sec of setSections(t)) {
    const g = props.productImgs.find((x) => x.name === sec.label);
    if (!g) continue;
    sec.imgs.forEach((im, i) => {
      if (im.state === 'done' && g.imgs[i]) list.push({ group: g.name, idx: i, url: im.img });
    });
  }
  return list;
};
const mapSrcReplaceAll = (t: FsTask) => {
  const list: { group: string; idx: number; url: string }[] = [];
  if (!t.srcImgs) return list;
  t.srcImgs.forEach((src, i) => {
    const gen = t.imgs[i];
    if (!gen || gen.state !== 'done') return;
    for (const g of props.productImgs) {
      const idx = g.imgs.indexOf(src);
      if (idx >= 0) { list.push({ group: g.name, idx, url: gen.img }); break; }
    }
  });
  return list;
};
const replaceAll = (t: FsTask) => {
  const list = t.kind === 'set' ? mapSetReplaceAll(t) : mapSrcReplaceAll(t);
  if (list.length === 0) { pushToast('没有可替换的成功图片', 'warning'); return; }
  emit('replace-all', list);
};
const regenOne = (im: TaskImg) => {
  if (im.state === 'running') return;
  im.state = 'running'; im.progress = 0; im.willFail = false;
  pushToast('已重新发起该图片生成');
};

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && previewImg.value) previewImg.value = null;
};
onMounted(() => {
  seed();
  timer = setInterval(tick, 300);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  window.removeEventListener('keydown', onKey);
});
</script>

<template>
  <div class="fb-board">
    <!-- 任务列表：状态标签（生成中/成功/部分完成/失败），点进看详情 -->
    <template v-if="view === 'list'">
      <div v-if="listTasks.length === 0" class="fb-empty">该商品暂无生成任务，选择生成方式后点击上方生成按钮开始创作</div>

      <div v-for="t in listTasks" :key="t.id" class="fb-task" @click="openTask(t)">
        <div class="fb-t-head">
          <b class="fb-t-title">{{ t.title }}</b>
          <span class="fb-tag" :class="stateOf(t)">{{ stateText(t) }}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </div>
        <div class="fb-t-meta">
          <span class="fb-kind" :class="t.kind">{{ KIND_LABEL[t.kind] }}</span>
          <span class="fb-method">{{ t.method }}</span>
          <span>{{ t.code }}</span>
          <span>{{ t.time }}</span>
          <span>{{ t.user }}</span>
        </div>
        <div v-if="stateOf(t) === 'running'" class="fb-barwrap">
          <div class="fb-bar"><i :style="{ width: `${progressOf(t)}%` }" /></div>
        </div>
        <div v-else class="fb-thumbs">
          <img v-for="(im, i) in t.imgs.filter((x) => x.state === 'done').slice(0, 5)" :key="i" :src="im.img" alt="" />
          <span v-if="stateOf(t) === 'fail'" class="fb-th-fail">全部图片生成失败</span>
        </div>
      </div>
    </template>

    <!-- 任务详情：顶部商品信息；套图生成按图片类型区分，多图/单图为卡片宫格 -->
    <div v-else-if="active" class="fb-detail">
      <div class="fb-d-top">
        <button class="fb-back" @click="back">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
          返回任务列表
        </button>
        <span class="fb-tag" :class="stateOf(active)">{{ stateText(active) }}</span>
      </div>

      <div class="fb-d-prod">
        <img :src="active.productImg" alt="" />
        <b>{{ active.productTitle }}</b>
        <span class="fb-plat">{{ active.platform }}</span>
      </div>

      <div class="fb-t-meta">
        <span class="fb-kind" :class="active.kind">{{ KIND_LABEL[active.kind] }}</span>
        <span class="fb-method">{{ active.method }}</span>
        <span>{{ active.time }}</span>
        <span>{{ active.code }}</span>
        <span>{{ active.user }}</span>
        <button v-if="stateOf(active) === 'fail' || stateOf(active) === 'partial'" class="fb-re" @click="regen(active)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 6.3" /><path d="M20 4v7h-7" /></svg>
          重新生成
        </button>
      </div>

      <!-- 替换操作栏：右侧为预览态，确认后同步到左侧商品图（编辑态） -->
      <div v-if="active && stateOf(active) !== 'running'" class="fb-replace-bar">
        <button class="bp-btn primary" @click="replaceAll(active)">全部替换到商品</button>
      </div>

      <!-- 套图生成：按图片类型分区排版；多图/单图：卡片宫格 -->
      <template v-if="active.kind === 'set'">
        <div v-for="sec in setSections(active)" :key="sec.label" class="fb-sec">
          <div class="fb-sec-t">{{ sec.label }}<span>{{ sec.imgs.length }} 张</span></div>
          <div class="fb-grid" :class="gridCls(active)">
            <div
              v-for="(im, i) in sec.imgs"
              :key="i"
              class="fb-card"
              :class="im.state"
              :draggable="im.state === 'done'"
              @dragstart="im.state === 'done' && onDragStart($event, im.img)"
            >
              <template v-if="im.state === 'running'">
                <i class="fb-spin" />
                <span class="fb-cpct">{{ im.progress }}%</span>
              </template>
              <template v-else-if="im.state === 'fail'">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>
                <span>失败</span>
                <button class="fb-reone" @click.stop="regenOne(im)">重新生成</button>
              </template>
              <template v-else>
                <img :src="im.img" alt="" />
                <div class="fb-img-acts">
                  <button title="查看" @click.stop="openPreview(im.img)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" /></svg>
                  </button>
                  <button title="美化" @click.stop="beautify(im.img)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" /></svg>
                  </button>
                  <button title="下载" @click.stop="pushToast('已开始下载（演示）')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M6 11l6 6 6-6" /><path d="M4 21h16" /></svg>
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="fb-grid" :class="gridCls(active)">
        <div
          v-for="(im, i) in active.imgs"
          :key="i"
          class="fb-card"
          :class="im.state"
          :draggable="im.state === 'done'"
          @dragstart="im.state === 'done' && onDragStart($event, im.img)"
        >
          <template v-if="im.state === 'running'">
            <i class="fb-spin" />
            <span class="fb-cpct">{{ im.progress }}%</span>
          </template>
          <template v-else-if="im.state === 'fail'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></svg>
            <span>失败</span>
            <button class="fb-reone" @click.stop="regenOne(im)">重新生成</button>
          </template>
          <template v-else>
            <img :src="im.img" alt="" />
            <div class="fb-img-acts">
              <button title="查看" @click.stop="openPreview(im.img)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" /></svg>
              </button>
              <button title="美化" @click.stop="beautify(im.img)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /><path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9z" /></svg>
              </button>
              <button title="下载" @click.stop="pushToast('已开始下载（演示）')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12" /><path d="M6 11l6 6 6-6" /><path d="M4 21h16" /></svg>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 生成结果大图预览 -->
    <div v-if="previewImg" class="bee-mask img-preview" @click="previewImg = null">
      <img :src="previewImg" alt="" />
    </div>


  </div>
</template>
