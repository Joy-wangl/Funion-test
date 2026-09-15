<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { createDetail } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';

/** 素材中心：1:1 原型还原 + 同类拖拽排序 / 右→左批量拖拽换图 / 查看预览 / 条目单展开 */
const emit = defineEmits<{ (e: 'back'): void }>();

const d = createDetail;
const tab = ref<'swap' | 'beauty'>('swap');
const mainImgs = ref<string[]>([...d.mainImgs]);
const detailImgs = ref<string[]>([...d.detailImgs]);
const SKU_DESC = '德国指甲剪刀套装全套耳勺指甲刀指甲钳修剪专用斜口指甲钳剪刀 用起来还算不错哦';

/* 分区定位 tab：左卡吸顶，点击滚动定位 + 滚动同步高亮 */
const SECS = [
  { key: 'main', label: '商品主图' },
  { key: 'sku', label: 'SKU图片' },
  { key: 'detail', label: '详情图' },
  { key: 'white', label: '白底图' },
];
const leftRef = ref<HTMLElement | null>(null);
const activeSec = ref('main');
let lockSec = '';
let lockUntil = 0;
const goSec = (k: string) => {
  const box = leftRef.value; if (!box) return;
  const el = box.querySelector<HTMLElement>(`[data-sec="${k}"]`); if (!el) return;
  activeSec.value = k;
  lockSec = k; lockUntil = Date.now() + 900; /* 平滑滚动期间锁定高亮，避免被滚动监听抢走 */
  box.scrollTo({ top: Math.max(0, el.offsetTop - 52), behavior: 'smooth' });
};
const onLeftScroll = () => {
  const box = leftRef.value; if (!box) return;
  if (lockSec && Date.now() < lockUntil) { activeSec.value = lockSec; return; }
  lockSec = '';
  const els = Array.from(box.querySelectorAll<HTMLElement>('[data-sec]'));
  if (!els.length) return;
  let cur = els[0].dataset.sec || 'main';
  for (const el of els) {
    if (el.offsetTop - 64 <= box.scrollTop) cur = el.dataset.sec || cur;
  }
  /* 滚到底时末尾分区无法到顶，补偿高亮最后一个已进入视口的分区 */
  if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) {
    const bottomLine = box.scrollTop + box.clientHeight;
    for (const el of els) {
      if (el.offsetTop < bottomLine - 60) cur = el.dataset.sec || cur;
    }
  }
  activeSec.value = cur;
};
watch(tab, () => { activeSec.value = 'main'; });

/* 素材库条目：同一商品多角度图 */
const LIB_IMGS = [
  { src: '/products/hairpin.png', pos: 'center 15%' },
  { src: '/products/main.png', pos: 'center center' },
  { src: '/products/serum.png', pos: 'center 40%' },
  { src: '/products/hairpin.png', pos: 'center 70%' },
  { src: '/products/main.png', pos: 'center 90%' },
];
const LIB_ENTRIES = ref([
  { title: '韩系波点缎面裙摆马尾抓夹女高级感半扎发后脑勺气质发夹头饰发卡', time: '2026-08-27 14:18:12', person: '王龙', open: false },
  { title: '同款缎面抓夹银色系列 半扎发后脑勺气质发夹头饰发卡', time: '2026-08-25 10:02:44', person: '王龙', open: false },
  { title: '同款缎面抓夹金色系列 马尾抓夹女高级感发夹头饰', time: '2026-08-21 16:40:03', person: '王龙', open: false },
]);

/* 左栏主图点选：选中蓝框 + 气泡「替换/添加」（使用右栏勾选的素材）；仅编辑态可选 */
const selMain = ref(-1);
const pickMain = (i: number) => { if (!editing.value) return; selMain.value = selMain.value === i ? -1 : i; };
const removeMain = (i: number) => { mainImgs.value.splice(i, 1); if (selMain.value === i) selMain.value = -1; };
const removeDetail = (i: number) => detailImgs.value.splice(i, 1);

/* 右栏素材图多选（批量拖拽换图的数据源）；仅编辑态可选 */
const selRight = ref<number[]>([]);
const pickRight = (i: number) => {
  if (!editing.value) return;
  const a = selRight.value;
  const k = a.indexOf(i);
  if (k >= 0) a.splice(k, 1); else a.push(i);
};
const rightSrcs = () => selRight.value.slice().sort((a, b) => a - b).map((n) => LIB_IMGS[n].src);

/* 条目单展开：展开一条时其余收起（手风琴） */
const toggleEntry = (idx: number) => {
  LIB_ENTRIES.value.forEach((e, i) => { e.open = i === idx ? !e.open : false; });
  selRight.value = [];
};

/* 查看预览：遮罩点击 / ESC 关闭；ESC 同时可关闭取消编辑确认弹窗 */
const preview = ref('');
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (preview.value) preview.value = '';
  else if (cancelOpen.value) cancelOpen.value = false;
};
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  if (tickTimer != null) clearInterval(tickTimer);
});

/* 拖拽：同类（主图/详情图）内部排序；右栏选中素材拖到左栏批量换图 */
const dragging = ref<{ kind: 'main' | 'detail' | 'right'; index: number; items: string[] } | null>(null);
const dropHint = ref('');
const isDragSrc = (kind: 'main' | 'detail' | 'right', i: number) => !!dragging.value && dragging.value.kind === kind && dragging.value.index === i;
const onDragLeft = (kind: 'main' | 'detail', i: number) => { if (!editing.value) return; dragging.value = { kind, index: i, items: [] }; };
const onDragRight = (i: number) => {
  if (!editing.value) return;
  if (!selRight.value.includes(i)) pickRight(i);
  dragging.value = { kind: 'right', index: i, items: rightSrcs() };
};
const onDragEnd = () => { dragging.value = null; dropHint.value = ''; };
const onDropLeft = (kind: 'main' | 'detail', j: number) => {
  const p = dragging.value;
  dropHint.value = '';
  if (!p) return;
  const arr = kind === 'main' ? mainImgs.value : detailImgs.value;
  if (p.kind === kind) {
    arr.splice(j, 0, arr.splice(p.index, 1)[0]);
    pushToast('已调整顺序');
  } else if (p.kind === 'right') {
    p.items.forEach((s, k) => { if (j + k < arr.length) arr[j + k] = s; else arr.push(s); });
    pushToast(`已换图 ${p.items.length} 张`);
  }
  dragging.value = null;
};

/* 选中主图气泡：替换/添加（应用右栏勾选素材） */
const applySwap = () => {
  if (selMain.value < 0) return;
  const srcs = rightSrcs();
  if (!srcs.length) { pushToast('请先在右侧素材库勾选要替换的图片'); return; }
  mainImgs.value[selMain.value] = srcs[0];
  pushToast('已替换');
};
const applyAdd = () => {
  const srcs = rightSrcs();
  if (!srcs.length) { pushToast('请先在右侧素材库勾选要添加的图片'); return; }
  mainImgs.value.push(...srcs);
  pushToast(`已添加 ${srcs.length} 张`);
};

/* 编辑态：查看态仅展示「编辑」；进入编辑后展示 保存修改/取消，选图换图操作仅编辑态可用并记为未保存 */
const editing = ref(false);
const dirty = ref(false);
const saving = ref(false);
const cancelOpen = ref(false);
let snapMain: string[] = [];
let snapDetail: string[] = [];
const enterEdit = () => {
  snapMain = [...mainImgs.value];
  snapDetail = [...detailImgs.value];
  selMain.value = -1;
  selRight.value = [];
  editing.value = true;
  dirty.value = false;
};
watch([mainImgs, detailImgs], () => { if (editing.value) dirty.value = true; }, { deep: true });
const doSave = () => {
  if (saving.value) return;
  saving.value = true;
  setTimeout(() => {
    saving.value = false;
    editing.value = false;
    dirty.value = false;
    selMain.value = -1;
    selRight.value = [];
    pushToast('素材修改已保存');
  }, 400);
};
const askCancel = () => {
  if (dirty.value) cancelOpen.value = true;
  else editing.value = false;
};
const confirmCancel = () => {
  cancelOpen.value = false;
  editing.value = false;
  dirty.value = false;
  selMain.value = -1;
  selRight.value = [];
  mainImgs.value = [...snapMain];
  detailImgs.value = [...snapDetail];
  pushToast('已取消编辑，未保存修改已丢弃');
};

/* 导入素材弹层：竞品链接多行，可增删，必填校验 */
const importOpen = ref(false);
const importLinks = ref<string[]>(['']);
const importErr = ref(false);
const addLinkRow = () => importLinks.value.push('');
const rmLinkRow = (i: number) => {
  importLinks.value.splice(i, 1);
  if (!importLinks.value.length) importLinks.value.push('');
};
const doImport = () => {
  if (importLinks.value.some((l) => !l.trim())) { importErr.value = true; return; }
  LIB_ENTRIES.value.unshift({ title: `新导入竞品（${importLinks.value.length} 条链接，待同步主图）`, time: '2026-08-28 10:24:36', person: '七妮妮', open: false });
  pushToast('开始导入，同步完成后自动关联至素材库');
  importOpen.value = false;
  importLinks.value = [''];
  importErr.value = false;
};

/* ========= 一键美化：复刻 AI美化功能（生成模式/商品图片勾选 + 任务四态列表 + 算力提交栏） ========= */
interface TaskImg { src: string; pos: string; failed?: boolean; retrying?: boolean }
type BtMode = 'set' | 'beauty';
type BtStatus = 'running' | 'done' | 'partial' | 'failed';
interface BeautyTask {
  id: number; desc: string; mode: BtMode; code: string; time: string; owner: string;
  status: BtStatus; percent: number; total: number; doneCount: number; outcome: BtStatus; imgs: TaskImg[]; open: boolean;
}
const BT_MODES: { key: BtMode; label: string }[] = [
  { key: 'set', label: '套图生成' },
  { key: 'beauty', label: '图片美化' },
];
const MODE_LABEL: Record<BtMode, string> = { set: '套图生成', beauty: '图片美化' };
const tImgs = (from: number, n: number): TaskImg[] => Array.from({ length: n }, (_, k) => LIB_IMGS[(from + k) % LIB_IMGS.length]);
/* 失败占位槽：src 为空 + failed 标记，渲染为可单张重新生成的失败瓦片 */
const fImgs = (n: number): TaskImg[] => Array.from({ length: n }, () => ({ src: '', pos: '', failed: true }));
/* 种子任务覆盖四态：生成中（带进度）/ 成功 / 部分完成 3/4 / 失败（全部图片生成失败） */
const tasks = ref<BeautyTask[]>([
  { id: 4, desc: '商品整品套图生成 · 韩系珍珠发夹女气质简约发卡边夹刘海夹子头饰', mode: 'set', code: 'q6nkn2', time: '2026-09-13 15:38', owner: '王龙', status: 'running', percent: 55, total: 8, doneCount: 0, outcome: 'done', imgs: [], open: false },
  { id: 3, desc: '商品主图批量图片美化（4张）', mode: 'beauty', code: '9h8dmu', time: '2026-09-13 15:38', owner: '王龙', status: 'done', percent: 100, total: 4, doneCount: 4, outcome: 'done', imgs: tImgs(0, 4), open: false },
  { id: 2, desc: '详情图色调统一美化，生成 4 张', mode: 'beauty', code: 'qcx89w', time: '2026-09-13 15:38', owner: '王龙', status: 'partial', percent: 100, total: 4, doneCount: 3, outcome: 'partial', imgs: [...tImgs(1, 3), ...fImgs(1)], open: false },
  { id: 1, desc: '商品更换为浴室场景风格，背景浅蓝色调，光线柔和', mode: 'set', code: 'ni14on', time: '2026-09-13 15:38', owner: '王龙', status: 'failed', percent: 100, total: 4, doneCount: 0, outcome: 'failed', imgs: fImgs(4), open: false },
]);

/* 生成模式：套图生成默认用全部商品图；图片美化支持左栏单选/多选，选中图展示到右侧输入框 */
const btMode = ref<BtMode>('set');
const btSel = ref<string[]>([]);
const btGroups = computed(() => [
  { label: '主图', items: mainImgs.value.map((src, i) => ({ key: `m${i}`, src })) },
  { label: 'SKU图', items: d.skus.map((_s, i) => ({ key: `s${i}`, src: d.mainImgs[i % d.mainImgs.length] })) },
  { label: '详情图', items: detailImgs.value.map((src, i) => ({ key: `d${i}`, src })) },
]);
const btAllItems = computed(() => btGroups.value.flatMap((g) => g.items));
const pickBt = (key: string) => {
  if (btMode.value === 'set') { pushToast('套图生成默认使用全部商品图，无需勾选'); return; }
  const k = btSel.value.indexOf(key);
  if (k >= 0) btSel.value.splice(k, 1); else btSel.value.push(key);
};
const unpickBt = (key: string) => {
  const k = btSel.value.indexOf(key);
  if (k >= 0) btSel.value.splice(k, 1);
};
watch(btMode, () => { btSel.value = []; });
/** 本次参与生成的图片：套图=三组全部；美化=勾选项 */
const btSources = computed<TaskImg[]>(() => {
  const picked = btMode.value === 'set' ? btAllItems.value : btAllItems.value.filter((t) => btSel.value.includes(t.key));
  return picked.map((t) => ({ src: t.src, pos: 'center center' }));
});
/** 美化模式勾选项（带 key，供输入框内缩略图展示与移除） */
const btPicked = computed(() => btAllItems.value.filter((t) => btSel.value.includes(t.key)));

/* 参考图：弹层多选候选，选中结果展示在按钮下方指定行，可移除 */
const btRefs = ref<TaskImg[]>([]);
const btRefOpen = ref(false);
const refKey = (r: TaskImg) => `${r.src}|${r.pos}`;
const toggleRef = (r: TaskImg) => {
  const k = btRefs.value.findIndex((x) => refKey(x) === refKey(r));
  if (k >= 0) btRefs.value.splice(k, 1); else btRefs.value.push({ src: r.src, pos: r.pos });
};
const onDocDownRef = (e: MouseEvent) => {
  if (!btRefOpen.value) return;
  const t = e.target as HTMLElement;
  if (!t.closest?.('.mc-bt-refzone')) btRefOpen.value = false;
};
onMounted(() => document.addEventListener('mousedown', onDocDownRef));
onUnmounted(() => document.removeEventListener('mousedown', onDocDownRef));

/* 算力：每张图 2 算力，提交扣减；模型可选 */
const btBalance = ref(100);
const btModel = ref('图片 5.0 Lite');
const btCost = computed(() => btSources.value.length * 2);
const prompt = ref('');

/* 生成进度模拟：running 百分比递增，到 100 按预设 outcome 落定（成功/部分完成/失败） */
let tickTimer: number | null = null;
const finalize = (t: BeautyTask) => {
  if (t.outcome === 'failed') { t.status = 'failed'; t.imgs = fImgs(t.total); pushToast('美化任务失败：全部图片生成失败'); return; }
  if (t.outcome === 'partial') {
    t.status = 'partial';
    t.doneCount = Math.max(1, Math.round(t.total * 0.75));
    /* 成功图 + 失败占位槽并列展示，失败槽支持单张重新生成 */
    t.imgs = [...tImgs(t.id % LIB_IMGS.length, t.doneCount), ...fImgs(t.total - t.doneCount)];
    pushToast(`美化任务部分完成 ${t.doneCount}/${t.total}`);
    return;
  }
  t.status = 'done'; t.doneCount = t.total;
  t.imgs = tImgs(t.id % LIB_IMGS.length, Math.max(1, t.total));
  pushToast('美化任务完成');
};
const ensureTick = () => {
  if (tickTimer != null) return;
  tickTimer = window.setInterval(() => {
    let any = false;
    tasks.value.forEach((t) => {
      if (t.status !== 'running') return;
      any = true;
      t.percent = Math.min(100, t.percent + 2 + Math.floor(Math.random() * 6));
      if (t.percent >= 100) finalize(t);
    });
    if (!any && tickTimer != null) { clearInterval(tickTimer); tickTimer = null; }
  }, 400);
};

const nowStr = () => {
  const p = (n: number) => String(n).padStart(2, '0');
  const x = new Date();
  return `${x.getFullYear()}/${p(x.getMonth() + 1)}/${p(x.getDate())} ${p(x.getHours())}:${p(x.getMinutes())}:${p(x.getSeconds())}`;
};
let taskId = 10;
const randCode = () => Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
const pushTask = (desc: string, mode: BtMode, total: number, outcome: BtStatus) => {
  tasks.value.unshift({ id: taskId++, desc, mode, code: randCode(), time: nowStr(), owner: '七妮妮', status: 'running', percent: 5, total, doneCount: 0, outcome, imgs: [], open: false });
  ensureTick();
};
/* 新任务结果轮转预设：保证三态都能演示到 */
const BT_OUTCOMES: BtStatus[] = ['done', 'partial', 'failed'];
const startBt = () => {
  if (btMode.value === 'beauty' && !btSel.value.length) { pushToast('请先在左侧选择要美化的图片'); return; }
  const n = btSources.value.length;
  if (!n) { pushToast('暂无可参与生成的商品图片'); return; }
  const cost = btCost.value;
  if (cost > btBalance.value) { pushToast('算力余额不足', 'warning'); return; }
  btBalance.value -= cost;
  const desc = prompt.value.trim() ? prompt.value.split('\n')[0].slice(0, 28) : `${MODE_LABEL[btMode.value]} · ${n}张`;
  pushTask(desc, btMode.value, n, BT_OUTCOMES[taskId % 3]);
  pushToast(`美化任务已提交，消耗 ${cost} 算力`);
};
const regen = (t: BeautyTask) => { t.status = 'running'; t.percent = 5; t.outcome = 'done'; ensureTick(); };
/* 单张失败图重新生成：占位槽转重试态，落定后回填图片并按槽位重算任务状态 */
const recalcTask = (t: BeautyTask) => {
  const doneN = t.imgs.filter((x) => x.src && !x.retrying).length;
  const failN = t.imgs.filter((x) => x.failed).length;
  const busyN = t.imgs.filter((x) => x.retrying).length;
  t.doneCount = doneN;
  if (!failN && !busyN) { t.status = 'done'; t.doneCount = t.total; }
  else if (doneN > 0) t.status = 'partial';
  else t.status = 'failed';
};
const retryImg = (t: BeautyTask, i: number) => {
  const im = t.imgs[i];
  if (!im || !im.failed) return;
  im.failed = false;
  im.retrying = true;
  window.setTimeout(() => {
    const cur = t.imgs[i];
    if (!cur || !cur.retrying) return;
    cur.retrying = false;
    cur.src = LIB_IMGS[(t.id + i) % LIB_IMGS.length].src;
    cur.pos = 'center center';
    recalcTask(t);
    pushToast('失败图片已重新生成');
  }, 1200);
};

/* 任务结果图操作：查看/美化/替换/添加/删除 */
const tBeauty = (t: BeautyTask) => pushTask(`美化：${t.desc.slice(0, 16)}`, 'beauty', Math.max(1, t.imgs.length), 'done');
const tReplace = (t: BeautyTask, i: number) => {
  const cur = LIB_IMGS.findIndex((l) => l.src === t.imgs[i].src);
  t.imgs[i] = LIB_IMGS[(cur + 1) % LIB_IMGS.length];
  pushToast('已替换');
};
const tAdd = (t: BeautyTask) => { t.imgs.push(LIB_IMGS[t.imgs.length % LIB_IMGS.length]); pushToast('已添加 1 张'); };
const tDel = (t: BeautyTask, i: number) => { t.imgs.splice(i, 1); };
</script>

<template>
  <div class="mc-page">
    <div class="mc-headcard">
      <!-- 单行头部：返回 + 下划线 tab + 右侧操作（随编辑态切换） -->
      <div class="mc-top">
        <div class="mc-head">
          <button class="mc-back" title="返回" @click="emit('back')">←</button>
        </div>
        <div class="mc-seg">
          <button class="mc-tab" :class="tab === 'swap' ? 'active' : ''" @click="tab = 'swap'">选图换图</button>
          <button class="mc-tab" :class="tab === 'beauty' ? 'active' : ''" @click="tab = 'beauty'">一键美化</button>
        </div>
        <span v-if="tab === 'beauty'" class="mc-tab-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" /></svg>
          更换商品风格
        </span>
        <div class="mc-acts">
          <template v-if="tab === 'swap'">
            <button v-if="!editing" class="sg-btn primary" @click="enterEdit">编辑</button>
            <template v-else>
              <button class="sg-btn" :disabled="saving" @click="askCancel">取消</button>
              <button class="sg-btn primary" :disabled="saving" @click="doSave">{{ saving ? '保存中…' : '保存修改' }}</button>
            </template>
          </template>
        </div>
      </div>
    </div>

    <div v-if="tab === 'swap'" class="mc-body">
      <!-- 左栏 48%：当前商品素材 -->
      <div class="mc-left" ref="leftRef" @scroll="onLeftScroll">
        <div class="mc-anchor">
          <button v-for="s in SECS" :key="s.key" :class="{ on: activeSec === s.key }" @click="goSec(s.key)">{{ s.label }}</button>
        </div>
        <div class="mc-left-body">
          <div class="mc-sec-title" data-sec="main">商品主图<span class="mc-count">{{ mainImgs.length }}</span></div>
          <div class="mc-imgs">
            <div v-for="(im, i) in mainImgs" :key="`m${i}`" class="mc-img" :class="{ selected: selMain === i, dragging: isDragSrc('main', i), 'drop-hint': dropHint === `main-${i}` }" :draggable="editing" @click="pickMain(i)" @dragstart="onDragLeft('main', i)" @dragend="onDragEnd" @dragover.prevent="dropHint = `main-${i}`" @drop.prevent="onDropLeft('main', i)">
              <img :src="im" alt="" />
              <span class="mc-drag" aria-hidden="true">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
              </span>
              <div v-if="editing && selMain === i" class="mc-bubble s">
                <a href="#" @click.prevent.stop="applySwap">替换</a>
                <a href="#" @click.prevent.stop="applyAdd">添加</a>
              </div>
              <div v-else class="mc-bubble h">
                <a href="#" @click.prevent.stop="preview = im">查看</a>
                <template v-if="editing">
                  <a href="#" @click.prevent.stop="pushToast('更换图片：演示环境暂不可用')">更换</a>
                  <a class="del" href="#" @click.prevent.stop="removeMain(i)">删除</a>
                </template>
              </div>
            </div>
            <button v-if="editing" class="mc-upload" @click="pushToast('上传图片：演示环境暂不可用')"><i>+</i>上传图片</button>
          </div>

          <div class="mc-sec-title" data-sec="sku">SKU图片</div>
          <div class="mc-sku-list">
            <div v-for="(_s, i) in d.skus" :key="i" class="mc-sku-row" :title="SKU_DESC">
              <img class="mc-sku-img" :src="d.mainImgs[i % d.mainImgs.length]" alt="" />
              <div class="mc-sku-name">{{ SKU_DESC }}</div>
            </div>
          </div>

          <div class="mc-sec-title" data-sec="detail">详情图<span class="mc-count">{{ detailImgs.length }}</span></div>
          <div class="mc-imgs two">
            <div v-for="(im, i) in detailImgs" :key="`d${i}`" class="mc-img" :class="{ dragging: isDragSrc('detail', i), 'drop-hint': dropHint === `detail-${i}` }" :draggable="editing" @dragstart="onDragLeft('detail', i)" @dragend="onDragEnd" @dragover.prevent="dropHint = `detail-${i}`" @drop.prevent="onDropLeft('detail', i)">
              <img :src="im" alt="" />
              <span class="mc-drag" aria-hidden="true">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
              </span>
              <div class="mc-bubble h">
                <a href="#" @click.prevent.stop="preview = im">查看</a>
                <template v-if="editing">
                  <a href="#" @click.prevent.stop="pushToast('更换图片：演示环境暂不可用')">更换</a>
                  <a class="del" href="#" @click.prevent.stop="removeDetail(i)">删除</a>
                </template>
              </div>
            </div>
          </div>

          <div class="mc-sec-title" data-sec="white">通用商品白底图</div>
          <div class="mc-imgs two">
            <div class="mc-img">
              <img :src="d.whiteImg" alt="" />
              <div class="mc-bubble h"><a href="#" @click.prevent.stop="preview = d.whiteImg">查看</a></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏 52%：素材库（仅选图换图流程） -->
      <div class="mc-right">
        <div class="mc-right-head">
          <span class="mc-right-title">素材库</span>
          <button class="sg-btn primary" @click="importOpen = !importOpen; importErr = false">导入素材</button>
          <div v-if="importOpen" class="mc-import-pop">
            <div class="mc-pop-title">导入素材</div>
            <div class="mc-pop-label">竞品链接</div>
            <div v-for="(l, i) in importLinks" :key="i" class="mc-pop-row" :class="importErr && !l.trim() ? 'err' : ''">
              <input v-model="importLinks[i]" placeholder="https://mobile.yangkeduo.com/..." />
              <button class="mc-pop-x" title="移除" @click="rmLinkRow(i)">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="6" /><path d="M5 5l4 4M9 5l-4 4" /></svg>
              </button>
              <button v-if="i === importLinks.length - 1" class="mc-pop-add" title="添加" @click="addLinkRow">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="7" cy="7" r="6" /><path d="M7 4.5v5M4.5 7h5" /></svg>
              </button>
            </div>
            <div class="mc-pop-acts">
              <button class="sg-btn" @click="importOpen = false">取消</button>
              <button class="sg-btn primary" @click="doImport">开始导入</button>
            </div>
          </div>
        </div>

        <div class="mc-lib-list">
          <div v-for="(e, idx) in LIB_ENTRIES" :key="idx" class="mc-lib">
            <div class="mc-lib-top">
              <div class="mc-lib-title">{{ e.title }}</div>
              <button class="mc-fold" @click="toggleEntry(idx)">{{ e.open ? '收起 ▴' : '展开 ▾' }}</button>
            </div>
            <!-- 创建人/前往查看 与平台标签同一排，位于展开下方 -->
            <div class="mc-lib-meta">
              <span class="mc-lib-tag">淘宝</span>
              <span>{{ e.time }}</span>
              <span class="mc-lib-person">{{ e.person }}</span>
              <a class="mc-lib-link" href="#" @click.prevent="pushToast('前往查看：演示环境暂不可用')">前往查看&gt;&gt;</a>
            </div>

            <!-- 收起态：响应式等宽图墙，全部展示不遮罩 -->
            <div v-if="!e.open" class="mc-lib-strip">
              <div v-for="(im, i) in LIB_IMGS" :key="i" class="mc-strip-th"><img :src="im.src" alt="" :style="{ objectPosition: im.pos }" /></div>
            </div>

            <!-- 展开态：灰底容器内 主图/SKU/详情 三区 -->
            <div v-else class="mc-lib-open">
              <div class="mc-sec-title">商品主图<span class="mc-count">{{ LIB_IMGS.length }}</span></div>
              <div class="mc-rgrid">
                <div v-for="(im, i) in LIB_IMGS" :key="i" class="mc-rimg" :class="{ sel: selRight.includes(i), dragging: isDragSrc('right', i) }" :draggable="editing" @click="pickRight(i)" @dragstart="onDragRight(i)" @dragend="onDragEnd">
                  <img :src="im.src" alt="" :style="{ objectPosition: im.pos }" />
                  <span class="mc-drag" aria-hidden="true">
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
                  </span>
                  <div class="mc-bubble h">
                    <a href="#" @click.prevent.stop="preview = im.src">查看</a>
                    <a v-if="editing" href="#" @click.prevent.stop="pickRight(i)">选择</a>
                  </div>
                </div>
              </div>

              <div class="mc-sec-title">SKU图片<span class="mc-count">3</span></div>
              <div class="mc-rgrid sku">
                <div v-for="n in 3" :key="n" class="mc-rimg">
                  <img :src="d.mainImgs[n % d.mainImgs.length]" alt="" />
                  <div class="mc-bubble h"><a href="#" @click.prevent.stop="preview = d.mainImgs[n % d.mainImgs.length]">查看</a></div>
                </div>
              </div>

              <div class="mc-sec-title">详情图<span class="mc-count">{{ detailImgs.slice(0, 4).length }}</span></div>
              <div class="mc-rgrid two">
                <div v-for="(im, i) in detailImgs.slice(0, 4)" :key="i" class="mc-rimg">
                  <img :src="im" alt="" />
                  <div class="mc-bubble h"><a href="#" @click.prevent.stop="preview = im">查看</a></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 一键美化：左 生成控制面板 / 右 任务四态列表 + 底部提交栏 -->
    <div v-else class="mc-body bt">
      <div class="mc-bt-left">
        <!-- 生成模式：套图生成 / 图片美化 -->
        <div class="mc-bt-sec">
          <div class="mc-bt-label req">生成模式</div>
          <div class="mc-bt-radios">
            <button v-for="m in BT_MODES" :key="m.key" class="mc-bt-radio" :class="{ on: btMode === m.key }" @click="btMode = m.key"><i />{{ m.label }}</button>
          </div>
        </div>

        <!-- 商品图片：主图/SKU图/详情图 三组；套图默认全部，美化模式可单选/多选 -->
        <div class="mc-bt-sec">
          <div class="mc-bt-label req">商品图片<span class="mc-bt-selnote">{{ btMode === 'set' ? `默认使用全部商品图，共 ${btAllItems.length} 张` : `已选 ${btSel.length} 张` }}</span></div>
          <div v-for="g in btGroups" :key="g.label" class="mc-bt-group">
            <div class="mc-bt-ghead">{{ g.label }}<span class="mc-count">{{ g.items.length }}</span></div>
            <div class="mc-bt-thumbs">
              <div v-for="it in g.items" :key="it.key" class="mc-bt-th" :class="{ sel: btSel.includes(it.key), pickable: btMode === 'beauty' }" @click="pickBt(it.key)">
                <img :src="it.src" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：任务四态列表（生成中/成功/部分完成/失败）+ 底部提交栏 -->
      <div class="mc-right mc-tasks bt-right">
        <div class="mc-bt-tasklist">
          <div v-for="t in tasks" :key="t.id" class="mc-task">
            <div class="mc-task-head">
              <div class="mc-task-title">{{ t.desc }}</div>
              <div class="mc-task-side">
                <button v-if="t.status === 'failed'" class="mc-regen" @click="regen(t)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
                  重新生成
                </button>
                <span class="mc-task-state" :class="t.status">{{ t.status === 'running' ? `生成中 ${t.percent}%` : t.status === 'failed' ? '失败' : t.status === 'partial' ? `部分完成 ${t.doneCount}/${t.total}` : '成功' }}</span>
                <button v-if="t.status === 'done' || t.status === 'partial'" class="mc-task-chev" :class="{ open: t.open }" @click="t.open = !t.open">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
              </div>
            </div>
            <div class="mc-task-meta">
              <span class="mc-task-tag mode">{{ MODE_LABEL[t.mode] }}</span>
              <span class="mc-task-code">{{ t.code }}</span>
              <span>{{ t.time }}</span>
              <span>{{ t.owner }}</span>
            </div>
            <div v-if="t.status === 'running'" class="mc-task-progress">
              <div class="mc-task-bar"><i :style="{ width: t.percent + '%' }" /></div>
            </div>
            <div v-else-if="t.status === 'failed'">
              <div class="mc-task-progress fail">
                <div class="mc-task-bar"><i style="width: 100%" /></div>
              </div>
              <!-- 全失败：失败占位槽全展示，每槽可单张重新生成 -->
              <div class="mc-task-grid">
                <div v-for="(im, i) in t.imgs" :key="i" class="mc-thwrap">
                  <div v-if="im.retrying" class="mc-th-fail retrying"><i class="mc-th-spin" />重新生成中…</div>
                  <div v-else-if="!im.failed" class="mc-img"><img :src="im.src" alt="" :style="{ objectPosition: im.pos }" /></div>
                  <div v-else class="mc-th-fail">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                    <span>生成失败</span>
                    <button class="mc-th-retry" @click.stop="retryImg(t, i)">重新生成</button>
                  </div>
                </div>
              </div>
              <div class="mc-fail-note">全部图片生成失败</div>
            </div>
            <template v-else>
              <!-- 收起 5 列大图 +N 蒙层 / 展开大图密铺；失败槽与重试槽穿插展示 -->
              <div :class="t.open ? 'mc-task-grid' : 'mc-task-strip'">
                <div v-for="(im, i) in (t.open ? t.imgs : t.imgs.slice(0, 5))" :key="i" class="mc-thwrap">
                  <div v-if="im.failed" class="mc-th-fail">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></svg>
                    <span>生成失败</span>
                    <button class="mc-th-retry" @click.stop="retryImg(t, i)">重新生成</button>
                  </div>
                  <div v-else-if="im.retrying" class="mc-th-fail retrying"><i class="mc-th-spin" />重新生成中…</div>
                  <template v-else>
                    <div class="mc-img">
                      <img :src="im.src" alt="" :style="{ objectPosition: im.pos }" />
                      <span v-if="!t.open && i === 4 && t.imgs.length > 5" class="mc-strip-more">+{{ t.imgs.length - 4 }}</span>
                    </div>
                    <div class="mc-float-bubble">
                      <a href="#" @click.prevent.stop="preview = im.src">查看</a>
                      <a href="#" @click.prevent.stop="tBeauty(t)">美化</a>
                      <a href="#" @click.prevent.stop="tReplace(t, i)">替换</a>
                      <a href="#" @click.prevent.stop="tAdd(t)">添加</a>
                      <a class="del" href="#" @click.prevent.stop="tDel(t, i)">删除</a>
                    </div>
                  </template>
                </div>
              </div>
              <div v-if="t.status === 'partial'" class="mc-fail-note part">仍有 {{ t.imgs.filter((x) => x.failed).length }} 张图片生成失败</div>
            </template>
          </div>
        </div>

        <!-- 底部提交栏：模式附加区（套图=图片数量+上传参考图 / 美化=已选图片）+ 描述 + 模型 + 算力 -->
        <div class="mc-bt-composer">
          <div v-if="btMode === 'set'" class="mc-bt-refzone">
            <div class="mc-bt-crow">
              <span class="mc-bt-count">图片数量 {{ btSources.length }}</span>
              <button class="sg-btn mc-bt-upload" @click="btRefOpen = !btRefOpen">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15V4M7.5 8L12 3.5 16.5 8M4 20h16" /></svg>
                上传参考图
              </button>
              <!-- 参考图候选弹层：多选，选中结果落到按钮下方指定行 -->
              <div v-if="btRefOpen" class="mc-bt-refpop">
                <div v-for="(r, i) in LIB_IMGS" :key="i" class="mc-bt-refopt" :class="{ sel: btRefs.some((x) => x.src === r.src && x.pos === r.pos) }" @click="toggleRef(r)">
                  <img :src="r.src" alt="" :style="{ objectPosition: r.pos }" />
                </div>
              </div>
            </div>
            <div v-if="btRefs.length" class="mc-bt-refrow">
              <div v-for="(r, i) in btRefs" :key="i" class="mc-bt-refth">
                <img :src="r.src" alt="" :style="{ objectPosition: r.pos }" />
                <button class="mc-bt-pickx" title="移除参考图" @click="btRefs.splice(i, 1)">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="mc-bt-crow pick">
            <div v-for="it in btPicked" :key="it.key" class="mc-bt-pickth">
              <img :src="it.src" alt="" />
              <button class="mc-bt-pickx" title="移除" @click="unpickBt(it.key)">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
              </button>
            </div>
            <span v-if="!btPicked.length" class="mc-bt-pickempty">左侧选择的商品图片将展示在这里，支持单选或多选</span>
          </div>
          <textarea v-model="prompt" class="mc-bt-input" rows="2" :placeholder="btMode === 'set' ? '描述你想如何生成套图（可选）' : '描述你想如何美化图片（可选）'" />
          <div class="mc-bt-cbar">
            <BubbleSelect class-name="mc-gen-select" :value="btModel" :options="['图片 5.0 Lite', '图片 4.6', '图片 4.0']" @change="(v: string) => { btModel = v; }" />
            <span class="mc-gen-spacer" />
            <span class="mc-bt-credit" title="算力余额">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" /></svg>
              {{ btBalance }}
            </span>
            <button class="sg-btn primary mc-bt-submit" @click="startBt">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2z" /></svg>
              {{ btCost }} 算力
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看预览：遮罩 -->
    <div v-if="preview" class="mc-preview" @click="preview = ''">
      <img :src="preview" alt="" />
    </div>

    <!-- 取消编辑二次确认：未保存修改将丢失 -->
    <Modal v-if="cancelOpen" title="取消编辑" sub="未保存的素材修改将会丢失" @close="cancelOpen = false">
      <div class="mc-cancel-tip">您已对商品图片进行换图 / 添加 / 删除等操作且尚未保存，取消编辑将恢复到本次编辑前的图片状态。</div>
      <template #foot>
        <button class="sg-btn" @click="cancelOpen = false">继续编辑</button>
        <button class="sg-btn danger" @click="confirmCancel">丢弃修改</button>
      </template>
    </Modal>
  </div>
</template>
