<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { createDetail } from './data';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';

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

/* 左栏主图点选：选中蓝框 + 气泡「替换/添加」（使用右栏勾选的素材） */
const selMain = ref(-1);
const pickMain = (i: number) => { selMain.value = selMain.value === i ? -1 : i; };
const removeMain = (i: number) => { mainImgs.value.splice(i, 1); if (selMain.value === i) selMain.value = -1; };
const removeDetail = (i: number) => detailImgs.value.splice(i, 1);

/* 右栏素材图多选（批量拖拽换图的数据源） */
const selRight = ref<number[]>([]);
const pickRight = (i: number) => {
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

/* 查看预览：遮罩点击 / ESC 关闭 */
const preview = ref('');
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') preview.value = ''; };
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => { window.removeEventListener('keydown', onKey); if (tickTimer != null) clearInterval(tickTimer); });

/* 拖拽：同类（主图/详情图）内部排序；右栏选中素材拖到左栏批量换图 */
const dragging = ref<{ kind: 'main' | 'detail' | 'right'; index: number; items: string[] } | null>(null);
const dropHint = ref('');
const isDragSrc = (kind: 'main' | 'detail' | 'right', i: number) => !!dragging.value && dragging.value.kind === kind && dragging.value.index === i;
const onDragLeft = (kind: 'main' | 'detail', i: number) => { dragging.value = { kind, index: i, items: [] }; };
const onDragRight = (i: number) => {
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

/* ================= 一键美化：提示词 + 生成控制 + 任务列表（生成中/失败/完成） ================= */
interface TaskImg { src: string; pos: string }
interface BeautyTask {
  id: number; desc: string; kind: 'beauty' | 'swap'; time: string; owner: string;
  status: 'running' | 'failed' | 'done'; percent: number; imgs: TaskImg[]; open: boolean;
}
const tImgs = (from: number, n: number): TaskImg[] => Array.from({ length: n }, (_, k) => LIB_IMGS[(from + k) % LIB_IMGS.length]);
const tasks = ref<BeautyTask[]>([
  { id: 3, desc: '任务描述一 占位', kind: 'beauty', time: '2026/08/27 12:00:00', owner: '王龙', status: 'running', percent: 66, imgs: [], open: false },
  { id: 1, desc: '生成一张猴子吃香蕉的图片', kind: 'swap', time: '2026/08/26 12:00:00', owner: '王龙', status: 'failed', percent: 70, imgs: [], open: false },
  { id: 2, desc: '商品更换为浴室场景风格，背景浅蓝色调，光线柔和', kind: 'beauty', time: '2026/08/25 12:00:00', owner: '王龙', status: 'done', percent: 100, imgs: tImgs(0, 6), open: false },
]);

/* 提示词：空→生成；有→优化（追加调整段） */
const prompt = ref('');
const genPrompt = () => {
  if (!prompt.value.trim()) prompt.value = '将商品更换为清新浴室场景，背景浅蓝色调，光线柔和，保持商品形态与比例不变，与背景色调、风格协调';
  else prompt.value += '\n\n调整内容如下： 将这个产品颜色改为天蓝色！要求不可更改我的产品形态';
};

/* 生成进度模拟：running 任务百分比递增，到 100 转 done 并产出结果图 */
let tickTimer: number | null = null;
const ensureTick = () => {
  if (tickTimer != null) return;
  tickTimer = window.setInterval(() => {
    let any = false;
    tasks.value.forEach((t) => {
      if (t.status !== 'running') return;
      any = true;
      t.percent = Math.min(100, t.percent + 2 + Math.floor(Math.random() * 6));
      if (t.percent >= 100) { t.status = 'done'; t.imgs = tImgs(t.id % LIB_IMGS.length, 6); pushToast('美化任务完成'); }
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
const pushTask = (desc: string) => {
  tasks.value.unshift({ id: taskId++, desc, kind: 'beauty', time: nowStr(), owner: '七妮妮', status: 'running', percent: 5, imgs: [], open: false });
  ensureTick();
};
const startGen = () => {
  if (!prompt.value.trim()) { pushToast('请先填写美化需求，或点击「生成提示词」'); return; }
  pushTask(prompt.value.split('\n')[0].slice(0, 24));
  pushToast('美化任务已提交');
};
const regen = (t: BeautyTask) => { t.status = 'running'; t.percent = 5; ensureTick(); };

/* 任务结果图操作：查看/美化/替换/添加/删除 */
const tBeauty = (t: BeautyTask) => pushTask(`美化：${t.desc.slice(0, 16)}`);
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
      <div class="mc-top">
        <div class="mc-head">
          <button class="mc-back" title="返回" @click="emit('back')">←</button>
          <span class="mc-title">素材中心</span>
          <span class="mc-sub">商品图片管理 · 保存后生效</span>
        </div>
        <div class="mc-acts">
          <button class="sg-btn" @click="emit('back')">取消</button>
          <button class="sg-btn primary" @click="pushToast('素材修改已保存'); emit('back')">保存修改</button>
        </div>
      </div>

      <div class="mc-tabs">
        <div class="mc-seg">
          <div class="mc-tab" :class="tab === 'swap' ? 'active' : ''" @click="tab = 'swap'">选图换图</div>
          <div class="mc-tab" :class="tab === 'beauty' ? 'active' : ''" @click="tab = 'beauty'">一键美化</div>
        </div>
        <span v-if="tab === 'beauty'" class="mc-tab-hint">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" /></svg>
          更换商品风格
        </span>
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
            <div v-for="(im, i) in mainImgs" :key="`m${i}`" class="mc-img" :class="{ selected: selMain === i, dragging: isDragSrc('main', i), 'drop-hint': dropHint === `main-${i}` }" draggable="true" @click="pickMain(i)" @dragstart="onDragLeft('main', i)" @dragend="onDragEnd" @dragover.prevent="dropHint = `main-${i}`" @drop.prevent="onDropLeft('main', i)">
              <img :src="im" alt="" />
              <span class="mc-drag" aria-hidden="true">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
              </span>
              <div v-if="selMain === i" class="mc-bubble s">
                <a href="#" @click.prevent.stop="applySwap">替换</a>
                <a href="#" @click.prevent.stop="applyAdd">添加</a>
              </div>
              <div v-else class="mc-bubble h">
                <a href="#" @click.prevent.stop="preview = im">查看</a>
                <a href="#" @click.prevent.stop="pushToast('更换图片：演示环境暂不可用')">更换</a>
                <a href="#" @click.prevent.stop="removeMain(i)">删除</a>
              </div>
            </div>
            <button class="mc-upload" @click="pushToast('上传图片：演示环境暂不可用')"><i>+</i>上传图片</button>
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
            <div v-for="(im, i) in detailImgs" :key="`d${i}`" class="mc-img" :class="{ dragging: isDragSrc('detail', i), 'drop-hint': dropHint === `detail-${i}` }" draggable="true" @dragstart="onDragLeft('detail', i)" @dragend="onDragEnd" @dragover.prevent="dropHint = `detail-${i}`" @drop.prevent="onDropLeft('detail', i)">
              <img :src="im" alt="" />
              <span class="mc-drag" aria-hidden="true">
                <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
              </span>
              <div class="mc-bubble h">
                <a href="#" @click.prevent.stop="preview = im">查看</a>
                <a href="#" @click.prevent.stop="pushToast('更换图片：演示环境暂不可用')">更换</a>
                <a href="#" @click.prevent.stop="removeDetail(i)">删除</a>
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
                <div v-for="(im, i) in LIB_IMGS" :key="i" class="mc-rimg" :class="{ sel: selRight.includes(i), dragging: isDragSrc('right', i) }" draggable="true" @click="pickRight(i)" @dragstart="onDragRight(i)" @dragend="onDragEnd">
                  <img :src="im.src" alt="" :style="{ objectPosition: im.pos }" />
                  <span class="mc-drag" aria-hidden="true">
                    <svg width="10" height="16" viewBox="0 0 10 16" fill="#fff"><circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" /><circle cx="2.5" cy="8" r="1.5" /><circle cx="7.5" cy="8" r="1.5" /><circle cx="2.5" cy="13.5" r="1.5" /><circle cx="7.5" cy="13.5" r="1.5" /></svg>
                  </span>
                  <div class="mc-bubble h">
                    <a href="#" @click.prevent.stop="preview = im.src">查看</a>
                    <a href="#" @click.prevent.stop="pickRight(i)">选择</a>
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
    <!-- 一键美化：左 商品图+生成控制 / 右 美化任务列表 -->
    <div v-else class="mc-body">
      <div class="mc-left" ref="leftRef" @scroll="onLeftScroll">
        <div class="mc-anchor">
          <button v-for="s in SECS" :key="s.key" :class="{ on: activeSec === s.key }" @click="goSec(s.key)">{{ s.label }}</button>
        </div>
        <div class="mc-left-body">
          <div class="mc-sec-title" data-sec="main">商品主图<span class="mc-count">{{ mainImgs.length }}</span></div>
          <div class="mc-imgs">
            <div v-for="(im, i) in mainImgs" :key="`bm${i}`" class="mc-img">
              <img :src="im" alt="" />
              <div class="mc-bubble h"><a href="#" @click.prevent.stop="preview = im">查看</a></div>
            </div>
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
            <div v-for="(im, i) in detailImgs" :key="`bd${i}`" class="mc-img">
              <img :src="im" alt="" />
              <div class="mc-bubble h"><a href="#" @click.prevent.stop="preview = im">查看</a></div>
            </div>
          </div>

          <div class="mc-sec-title" data-sec="white">通用商品白底图</div>
          <div class="mc-imgs two">
            <div class="mc-img">
              <img :src="d.whiteImg" alt="" />
              <button class="mc-prompt-chip" @click="genPrompt">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /><circle cx="12" cy="12" r="3.5" /></svg>
                {{ prompt.trim() ? '优化提示词' : '生成提示词' }}
              </button>
            </div>
          </div>

          <!-- 生成控制卡：提示词 + 上传参考图/模型/比例 + 仅生成 -->
          <div class="mc-gen-card">
            <textarea v-model="prompt" class="mc-gen-input" placeholder="上传你想要的商品场景风格图片，一键更换商品中的场景风格样式" />
            <div class="mc-gen-bar">
              <button class="sg-btn" @click="pushToast('上传参考图：演示环境暂不可用')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 15V4M7.5 8L12 3.5 16.5 8M4 20h16" /></svg>
                上传参考图
              </button>
              <BubbleSelect class-name="mc-gen-select" default-value="doubao" :options="['doubao', '即梦', 'SDXL']" />
              <BubbleSelect class-name="mc-gen-select" default-value="3:4" :options="['3:4', '1:1', '4:3', '原图比例']" />
              <span class="mc-gen-spacer" />
              <button class="sg-btn primary" @click="startGen">
                仅生成
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右栏：美化任务列表 -->
      <div class="mc-right mc-tasks">
        <div v-for="t in tasks" :key="t.id" class="mc-task">
          <div class="mc-task-head">
            <div class="mc-task-title">{{ t.desc }}</div>
            <div v-if="t.status === 'running'" class="mc-task-pct">{{ t.percent }}%<span>正在生成...</span></div>
            <button v-else-if="t.status === 'failed'" class="mc-regen" @click="regen(t)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
              重新生成
            </button>
            <button v-else class="mc-fold" @click="t.open = !t.open">{{ t.open ? '收起 ▴' : '展开 ▾' }}</button>
          </div>
          <div class="mc-task-meta">
            <span class="mc-task-tag" :class="t.kind">{{ t.kind === 'beauty' ? '一键美化' : '选图美化' }}</span>
            <span>{{ t.time }}</span>
            <span>{{ t.owner }}</span>
          </div>
          <div v-if="t.status === 'running'" class="mc-task-progress">
            <div class="mc-task-bar"><i :style="{ width: t.percent + '%' }" /></div>
          </div>
          <div v-else-if="t.status === 'failed'" class="mc-task-progress fail">
            <div class="mc-task-bar"><i :style="{ width: t.percent + '%' }" /></div>
            <span class="mc-fail-txt">失败</span>
          </div>
          <div v-else :class="t.open ? 'mc-task-grid' : 'mc-task-strip'">
            <div v-for="(im, i) in (t.open ? t.imgs : t.imgs.slice(0, 4))" :key="i" class="mc-thwrap">
              <div class="mc-img">
                <img :src="im.src" alt="" :style="{ objectPosition: im.pos }" />
                <span v-if="!t.open && i === 3 && t.imgs.length > 4" class="mc-strip-more">+{{ t.imgs.length - 3 }}</span>
              </div>
              <div class="mc-float-bubble">
                <a href="#" @click.prevent.stop="preview = im.src">查看</a>
                <a href="#" @click.prevent.stop="tBeauty(t)">美化</a>
                <a href="#" @click.prevent.stop="tReplace(t, i)">替换</a>
                <a href="#" @click.prevent.stop="tAdd(t)">添加</a>
                <a href="#" @click.prevent.stop="tDel(t, i)">删除</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 查看预览：遮罩 -->
    <div v-if="preview" class="mc-preview" @click="preview = ''">
      <img :src="preview" alt="" />
    </div>
  </div>
</template>
