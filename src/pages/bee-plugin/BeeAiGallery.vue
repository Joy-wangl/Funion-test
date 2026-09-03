<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import { beeProducts, BEE_PLATFORM_LOGO, type BeeProduct } from './data';
import FsAiBoard from '../funion-s/FsAiBoard.vue';

const emit = defineEmits<{ (e: 'close'): void; (e: 'logout'): void }>();
/* tone=fs：Funion s 复用工作台（品牌标题/渐变 logo）；initial=预置商品；showLogout=独立退出钮（走插件自身登录时隐藏） */
const props = withDefaults(defineProps<{ userName: string; tone?: 'bee' | 'fs'; initial?: BeeProduct | null; showLogout?: boolean }>(), {
  tone: 'bee',
  initial: null,
  showLogout: true,
});

const soon = (t: string) => pushToast(`演示环境：${t}即将上线`, 'warning');

/* ── 商品链接：与选品库同源，我的商品/解析链接均落到选品库数据 ── */
const compImg = ref('');
const compLink = ref('');
const picked = ref<BeeProduct | null>(null);
const pickerOpen = ref(false);
const pickProduct = (p: BeeProduct) => {
  picked.value = p;
  compImg.value = p.img;
  compLink.value = p.link;
  pickerOpen.value = false;
};
/* 清除已选：回到默认空状态（右栏恢复默认工作台），形成选品闭环 */
const clearPick = () => {
  picked.value = null;
  compImg.value = '';
  compLink.value = '';
};
const parseLink = () => {
  const v = compLink.value.trim();
  if (!v) { pushToast('请输入商品链接或id', 'warning'); return; }
  const hit = beeProducts.find((p) => p.link === v || p.id === v);
  if (hit) { picked.value = hit; compImg.value = hit.img; pushToast('解析成功'); }
  else pushToast('未解析到商品，请检查链接', 'warning');
};

/* ── 生成范围 + 生成方式：与右侧任务标签完全对齐（整品/多图/单图 + 套图/美化/水印/复刻/改图） ── */
type Scope = 'set' | 'multi' | 'single';
const SCOPE_LABEL: Record<Scope, string> = { set: '整品生成', multi: '多图生成', single: '单图生成' };
const SCOPES: Scope[] = ['set', 'multi', 'single'];
/* 蜜蜂插件（非 Funion s）保持原四方式一行展示 */
const METHODS = ['套图生成', '图片美化', '水印去除', '图片复刻'];
const METHODS_BY_SCOPE: Record<Scope, string[]> = {
  set: ['套图生成'],
  multi: ['图片美化', '水印去除', '图片复刻'],
  single: ['图片美化', '水印去除', '图片复刻', '单图改图'],
};
const scope = ref<Scope>('set');
const subMethod = ref('套图生成');
watch(scope, (s) => { subMethod.value = METHODS_BY_SCOPE[s][0]; });
/* 单图生成可选尺寸；模型选择；描述词/修改描述 */
const SIZES = [{ key: '1:1', label: '方图1:1' }, { key: '3:4', label: '竖图3:4' }, { key: '2:3', label: '竖图2:3' }];
const singleRatio = ref('1:1');
const prompt = ref('');
const model = ref('图片 5.0 Lite');
const modelOpen = ref(false);
const sizeOpen = ref(false);
const MODELS = ['图片 5.0 Lite', '图片 5.0 Pro', '图片 4.0'];
/* 图片选择：单图单选、多图多选、整品不选 */
const leftSelected = ref<string[]>([]);
const selectedImgs = ref<string[]>([]);
const syncSelected = () => { selectedImgs.value = [...leftSelected.value]; };
const cost = computed(() => scope.value === 'single' ? 3 : 8);
const placeholder = computed(() => {
  if (scope.value === 'single' && subMethod.value === '单图改图') return selectedImgs.value.length ? '请输入修改描述，如：背景更换为浅蓝色调，光线柔和' : '请先选择左侧一张图片';
  if (scope.value === 'single') return selectedImgs.value.length ? '描述你想如何生成这张图片' : '请先选择左侧一张图片';
  if (scope.value === 'multi') return selectedImgs.value.length ? '描述你想如何批量处理选中的图片' : '请先选择左侧图片';
  return '描述你想如何生成套图（可选）';
});
watch(scope, () => { leftSelected.value = []; selectedImgs.value = []; prompt.value = ''; modelOpen.value = false; sizeOpen.value = false; });
watch(subMethod, () => { prompt.value = ''; });
const toggleImg = (img: string) => {
  if (scope.value === 'single') { leftSelected.value = leftSelected.value[0] === img ? [] : [img]; }
  else if (scope.value === 'multi') {
    const idx = leftSelected.value.indexOf(img);
    if (idx >= 0) leftSelected.value.splice(idx, 1);
    else leftSelected.value.push(img);
  }
  syncSelected();
};
const removeSelected = (idx: number) => {
  const img = selectedImgs.value[idx];
  const li = leftSelected.value.indexOf(img);
  if (li >= 0) leftSelected.value.splice(li, 1);
  selectedImgs.value.splice(idx, 1);
};
interface ImgGroup { name: string; imgs: string[]; }
const buildImgGroups = (p: BeeProduct): ImgGroup[] => {
  const base = beeProducts.findIndex((x) => x.id === p.id);
  const at = (o: number) => beeProducts[(base + o) % beeProducts.length].img;
  return [
    { name: '主图', imgs: [p.img] },
    { name: 'SKU图', imgs: [at(1), at(2), at(3)] },
    { name: '详情图', imgs: [at(4), at(5), at(6), at(7)] },
  ];
};
const productImgs = ref<ImgGroup[]>([]);
watch(picked, (p) => { productImgs.value = p ? buildImgGroups(p) : []; }, { immediate: true });
/* 商品图片分组与创意灵感：所有生成方式通用，切换方式下方内容保持一致 */
const imgGroups = computed(() => productImgs.value);

/* ── 创意灵感：快捷创作=模板驱动（选模板自动填描述）；高级创作=自由描述+描述词推荐点选 ── */
const insMode = ref<'quick' | 'adv'>('quick');
const CATS = ['平台优选', '展台橱窗', '自然景观', '节日氛围', '人文建筑', '抽象概念', '室内空间'];
const TEMPLATES = [
  { cat: '展台橱窗', img: beeProducts[1].img, name: '暗调石台', desc: '深色石质展台，侧光打亮商品轮廓' },
  { cat: '展台橱窗', img: beeProducts[8].img, name: '方台黑白', desc: '黑白方台极简构图，高级质感' },
  { cat: '展台橱窗', img: beeProducts[0].img, name: '古朴石台', desc: '古朴石台搭配布艺背景，温润自然' },
  { cat: '自然景观', img: beeProducts[5].img, name: '草地晨光', desc: '清晨草地自然光，通透清新' },
  { cat: '自然景观', img: beeProducts[3].img, name: '海边日落', desc: '日落海边暖调氛围，度假感' },
  { cat: '节日氛围', img: beeProducts[4].img, name: '红橙渐变', desc: '红橙渐变背景，节日促销氛围' },
  { cat: '人文建筑', img: beeProducts[6].img, name: '极简枯木', desc: '枯木与留白，东方人文意境' },
  { cat: '抽象概念', img: beeProducts[2].img, name: '金台球盘', desc: '金属球体几何构成，抽象高级' },
  { cat: '室内空间', img: beeProducts[7].img, name: '暖居一角', desc: '温馨室内场景，生活化表达' },
];
const tplCat = ref('平台优选');
const tplList = computed(() => (tplCat.value === '平台优选' ? TEMPLATES : TEMPLATES.filter((t) => t.cat === tplCat.value)));
const tplPick = ref('');
const quickDesc = ref('');
const pickTpl = (t: (typeof TEMPLATES)[number]) => { tplPick.value = t.name; quickDesc.value = t.desc; };

const WORDS: Record<string, string[]> = {
  展台橱窗: ['暗调石台', '方台黑白', '古朴石台', '金台球盘'],
  自然景观: ['草地晨光', '海边日落', '森林雾气', '雪山背景'],
  节日氛围: ['红橙渐变', '礼盒堆叠', '暖灯串光'],
  人文建筑: ['极简枯木', '白墙光影', '庭院一角'],
  抽象概念: ['几何构成', '流体渐变', '悬浮失重'],
  室内空间: ['暖居一角', '窗边逆光', '原木桌面'],
};
const wordCat = ref('展台橱窗');
const advDesc = ref('');
const addWord = (w: string) => { advDesc.value = advDesc.value ? `${advDesc.value}，${w}` : w; };

/* ── 算力值与生成：单次 8 算力（演示环境默认充足） ── */
const credits = ref(100);
const COST = 8;
const generating = ref(false);
const TONES = ['', 't1', 't2', 't3'];
interface DwRec { id: number; method: string; time: string; cost: number; free: boolean; img: string; }
const records = ref<DwRec[]>([]);
const view = ref<'work' | 'hist'>('work');
const generate = () => {
  /* Funion s：任务制——根据范围/方式创建任务；单图/多图需先选图，单图改图需描述 */
  if (props.tone === 'fs') {
    if (!picked.value && !compImg.value) { pushToast('请先解析商品链接或选择我的商品', 'warning'); return; }
    if ((scope.value === 'single' || scope.value === 'multi') && selectedImgs.value.length === 0) { pushToast('请先选择图片', 'warning'); return; }
    if (scope.value === 'single' && subMethod.value === '单图改图' && !prompt.value.trim()) { pushToast('请输入修改描述', 'warning'); return; }
    const kind: 'set' | 'multi' | 'single' = scope.value;
    const m = subMethod.value;
    const srcImgs = kind === 'set' ? undefined : selectedImgs.value;
    let title = prompt.value.trim();
    if (!title) {
      if (kind === 'set') title = `商品整品套图生成 · ${picked.value?.title || ''}`;
      else if (kind === 'multi') title = `商品${m}批量处理（${selectedImgs.value.length}张）`;
      else title = `商品主图${m}`;
    }
    boardRef.value?.createTask(kind, m, { title, srcImgs, ratio: kind === 'single' ? singleRatio.value : undefined });
    return;
  }
  if (generating.value) return;
  if (!picked.value && !compImg.value) { pushToast('请先解析商品链接或选择我的商品', 'warning'); return; }
  if (credits.value < COST) { pushToast('算力值不足，请先购买', 'warning'); return; }
  generating.value = true;
  view.value = 'hist';
  setTimeout(() => {
    const n = new Date();
    const pad = (x: number) => `${x}`.padStart(2, '0');
    records.value.unshift({
      id: Date.now(),
      method: subMethod.value,
      time: `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())} ${pad(n.getHours())}:${pad(n.getMinutes())}`,
      cost: COST,
      free: records.value.length === 0,
      img: picked.value?.img || compImg.value,
    });
    credits.value -= COST;
    generating.value = false;
    pushToast('AI 画图完成（演示）');
  }, 1200);
};
const buy = () => { credits.value += 10; pushToast('购买成功，算力值 +10（演示）'); };

/* ── Funion s 任务制工作台：算力消耗入口 + 任务图板引用（套图/多图无尺寸概念，尺寸仅在单图改图弹窗内选择） ── */
const boardRef = ref<InstanceType<typeof FsAiBoard> | null>(null);
/* 图板列表/详情：详情态隐藏顶部「生成任务」pill */
const boardView = ref<'list' | 'detail'>('list');
watch(picked, () => { boardView.value = 'list'; });
const spend = (n: number) => {
  if (credits.value < n) { pushToast('算力值不足，请先购买', 'warning'); return false; }
  credits.value -= n;
  return true;
};

/* ── 商品图片替换闭环：右侧生成结果 -> 左侧商品图位（预览态 -> 编辑态同步） ── */
const onReplaceImg = (payload: { group: string; idx: number; url: string }) => {
  const g = productImgs.value.find((x) => x.name === payload.group);
  if (g && g.imgs[payload.idx] !== undefined) {
    g.imgs[payload.idx] = payload.url;
    pushToast('已替换商品图片');
  }
};
const onReplaceAll = (list: { group: string; idx: number; url: string }[]) => {
  if (list.length === 0) return;
  for (const p of list) {
    const g = productImgs.value.find((x) => x.name === p.group);
    if (g && g.imgs[p.idx] !== undefined) g.imgs[p.idx] = p.url;
  }
  pushToast(`已同步 ${list.length} 张图片到商品详情`);
};
const onBeautify = (img: string) => {
  scope.value = 'single';
  subMethod.value = '图片美化';
  nextTick(() => { selectedImgs.value = [img]; });
  pushToast('已将该图片加入输入框');
};
const previewImg = ref<string | null>(null);
const openPreview = (img: string) => { previewImg.value = img; };
const dragOverKey = ref<string | null>(null);
const dropKey = (group: string, idx: number) => `${group}-${idx}`;
const onDrop = (e: DragEvent, group: string, idx: number) => {
  dragOverKey.value = null;
  const data = e.dataTransfer?.getData('text/plain');
  if (!data) return;
  try {
    const payload = JSON.parse(data);
    if (payload.url) onReplaceImg({ group, idx, url: payload.url });
  } catch { /* 忽略非法拖拽数据 */ }
};
const isSelectable = (groupName: string) => scope.value !== 'set' && groupName !== '';

/* ── 工作台右侧：横幅图 / 历史记录添加 ── */
const bannerImgs = beeProducts.slice(0, 3).map((p) => p.img);
const fromHistory = () => {
  if (records.value.length === 0) { pushToast('暂无历史记录', 'warning'); return; }
  compImg.value = records.value[0].img;
  pushToast('已从历史记录添加构图');
};

/* 内层 picker 打开时 ESC 优先交给内层 */
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && pickerOpen.value) pickerOpen.value = false; };
onMounted(() => {
  window.addEventListener('keydown', onKey);
  /* Funion s 选品库行内 AI美化：打开即预置该商品 */
  if (props.initial) pickProduct(props.initial);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="bp-page dw-page">
    <div class="bp-head">
      <span class="bee-logo" :class="{ fs: tone === 'fs' }">{{ tone === 'fs' ? 'S' : '🐝' }}</span>
      <span class="bp-title">{{ tone === 'fs' ? 'Funion s · AI美化' : '蜜蜂搬家 · AI画图' }}</span>
      <div class="bp-head-r">
        <span class="ag-user"><i class="bee-dot" />{{ userName }}</span>
        <a v-if="showLogout" class="ag-out" @click="emit('logout')">退出</a>
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="dw-wrap" :class="{ 'fs-wrap': tone === 'fs' }">
      <!-- 左栏：表单 -->
      <aside class="dw-side">
        <div class="dw-scroll">
          <div class="dw-sec">
            <div class="dw-label">商品链接</div>
            <div class="dw-linkrow">
              <input v-model="compLink" placeholder="输入商品链接或id" @keyup.enter="parseLink" />
              <button class="mini" @click="pickerOpen = true">我的商品</button>
            </div>
            <!-- 已选商品条：可清除，清除后右栏回默认空状态 -->
            <div v-if="picked" class="dw-picked">
              <img :src="picked.img" alt="" />
              <span class="t">{{ picked.title }}</span>
              <button class="dw-clear" title="清除已选" @click="clearPick">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          <!-- Funion s：生成范围 + 生成方式，与右侧任务标签完全对齐 -->
          <template v-if="tone === 'fs'">
            <div class="dw-sec">
              <div class="dw-label"><i>*</i>生成范围</div>
              <div class="dw-methods">
                <button v-for="s in SCOPES" :key="s" :class="{ on: scope === s }" @click="scope = s"><i class="mic" />{{ SCOPE_LABEL[s] }}</button>
              </div>
            </div>

            <div class="dw-sec">
              <div class="dw-label"><i>*</i>生成方式</div>
              <div class="dw-methods">
                <button v-for="m in METHODS_BY_SCOPE[scope]" :key="m" :class="{ on: subMethod === m }" @click="subMethod = m"><i class="mic" />{{ m }}</button>
              </div>
            </div>

            <!-- 单图生成可选尺寸（套图/多图无尺寸概念） -->
            <div v-if="scope === 'single'" class="dw-sec">
              <div class="dw-label"><i>*</i>生成尺寸</div>
              <div class="dw-methods">
                <button v-for="s in SIZES" :key="s.key" :class="{ on: singleRatio === s.key }" @click="singleRatio = s.key">{{ s.label }}</button>
              </div>
            </div>

          </template>

          <!-- 蜜蜂插件：保持原四方式一行展示 -->
          <div v-else class="dw-sec">
            <div class="dw-label"><i>*</i>生成方式</div>
            <div class="dw-methods">
              <button v-for="m in METHODS" :key="m" :class="{ on: subMethod === m }" @click="subMethod = m"><i class="mic" />{{ m }}</button>
            </div>
          </div>

          <div class="dw-sec">
            <div class="dw-label"><i>*</i>商品图片</div>
            <div v-if="!picked" class="dw-empty-g">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-4)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="9" cy="11" r="1.8" /><path d="M3 17l5-4 4 3 4-4 5 5" /></svg>
              <b>还未选择商品</b>
              <span>选择商品后自动展示 主图 / SKU图 / 详情图</span>
              <button class="mini" @click="pickerOpen = true">去选品</button>
            </div>
            <div v-else class="dw-groups">
              <div v-for="g in imgGroups" :key="g.name" class="dw-group">
                <div class="dw-g-head">{{ g.name }}<span>{{ g.imgs.length }}</span></div>
                <div class="dw-g-grid">
                  <div
                    v-for="(s, i) in g.imgs"
                    :key="i"
                    class="dw-g-img"
                    :class="{ on: leftSelected.includes(s), disabled: !isSelectable(g.name), 'drag-over': dragOverKey === dropKey(g.name, i) }"
                    @click="isSelectable(g.name) ? toggleImg(s) : openPreview(s)"
                    @dragenter.prevent="dragOverKey = dropKey(g.name, i)"
                    @dragleave="dragOverKey = null"
                    @dragover.prevent
                    @drop="onDrop($event, g.name, i)"
                  >
                    <img :src="s" alt="" />
                    <span v-if="leftSelected.includes(s)" class="dw-g-check">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6 10-14" /></svg>
                    </span>
                    <button v-else class="dw-g-preview" title="查看大图" @click.stop="openPreview(s)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 创意灵感：全生成方式通用，不随方式切换变化；Funion s 轻量版不做该模块 -->
          <div v-if="tone === 'bee'" class="dw-sec">
            <div class="dw-label"><i>*</i>创意灵感</div>
            <div class="dw-ins">
              <div class="dw-ins-tabs">
                <button :class="{ on: insMode === 'quick' }" @click="insMode = 'quick'">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>
                  快捷创作<em class="hot">HOT</em>
                </button>
                <button :class="{ on: insMode === 'adv' }" @click="insMode = 'adv'">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 4.6 4.6 1.9-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z" /></svg>
                  高级创作
                </button>
              </div>

              <!-- 快捷创作：模板驱动，选模板自动带入创意描述 -->
              <div v-if="insMode === 'quick'" class="dw-ins-body">
                <div class="dw-ins-head"><span>选择模板</span><a @click="soon('模板库')">查看全部 ›</a></div>
                <div class="dw-cats-h">
                  <a v-for="c in CATS" :key="c" :class="{ on: tplCat === c }" @click="tplCat = c">{{ c }}</a>
                </div>
                <div class="dw-tpls">
                  <div v-for="t in tplList" :key="t.name" class="dw-tpl" :class="{ on: tplPick === t.name }" @click="pickTpl(t)">
                    <img :src="t.img" alt="" /><span>{{ t.name }}</span>
                  </div>
                </div>
                <div class="dw-ins-desc">创意描述</div>
                <textarea v-model="quickDesc" placeholder="自由输入背景描述，或从模板库中选择" />
              </div>

              <!-- 高级创作：自由描述 + 分类描述词点选追加 -->
              <div v-else class="dw-ins-body">
                <div class="dw-ins-desc">创意描述</div>
                <textarea v-model="advDesc" placeholder="自由输入背景描述，或点选下方描述词" />
                <div class="dw-ins-head"><span>描述词推荐：</span></div>
                <div class="dw-cats-h">
                  <a v-for="c in CATS.slice(1)" :key="c" :class="{ on: wordCat === c }" @click="wordCat = c">{{ c }}</a>
                </div>
                <div class="dw-words">
                  <a v-for="w in WORDS[wordCat]" :key="w" @click="addWord(w)">{{ w }}</a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 蜜蜂插件：保持原底部生成按钮 -->
        <div v-if="tone !== 'fs'" class="dw-foot">
          <button class="dw-gen" :disabled="generating" @click="generate">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /></svg>
            {{ generating ? '生成中…' : `立即生成 ${cost}算力值` }}
          </button>
        </div>

        <!-- 生成尺寸对话框：仅在单图场景下需要 -->
        <div v-if="tone === 'fs' && sizeOpen" class="bee-mask" @click.self="sizeOpen = false">
          <div class="bee-modal dw-size-modal">
            <div class="bm-head">
              <b>生成尺寸</b>
              <button class="bp-close" title="关闭" @click="sizeOpen = false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div class="dw-methods dw-size-btns">
              <button v-for="s in SIZES" :key="s.key" :class="{ on: singleRatio === s.key }" @click="singleRatio = s.key">{{ s.label }}</button>
            </div>
            <div class="bm-foot">
              <button class="bp-btn" @click="sizeOpen = false">取消</button>
              <button class="bp-btn primary" @click="sizeOpen = false">确定</button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右栏：工作台 / 历史记录 -->
      <main class="dw-main">
        <div class="dw-top">
          <button v-if="tone !== 'fs'" class="dw-pill" @click="view = view === 'hist' ? 'work' : 'hist'">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
            历史记录
          </button>
          <span v-else-if="boardView === 'list'" class="dw-pill">生成任务</span>
          <!-- Funion s：算力购买下沉到创作条，顶部不再展示 credits pill -->
          <div v-if="tone !== 'fs'" class="dw-top-r">
            <span class="dw-pill">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /></svg>
              {{ credits }}<a @click="buy">购买</a>
            </span>
          </div>
        </div>

        <!-- Funion s：选定商品后右栏才展示该商品的任务图板；未选商品保留默认工作台 -->
        <FsAiBoard
          v-if="tone === 'fs' && picked"
          ref="boardRef"
          :user-name="userName"
          :product="picked"
          :spend="spend"
          :product-imgs="productImgs"
          @view="boardView = $event"
          @replace="onReplaceImg"
          @replace-all="onReplaceAll"
          @beautify="onBeautify"
        />
        <div v-else-if="view === 'work' || tone === 'fs'" class="dw-work">
          <div class="dw-banner">
            <div class="dw-banner-t">
              <b>轻松上手</b>
              <span>看看上架商品图更出彩的秘诀！</span>
            </div>
            <div class="dw-banner-imgs">
              <img v-for="(s, i) in bannerImgs" :key="i" :class="`r${i}`" :src="s" alt="" />
            </div>
          </div>

          <div class="dw-up-t">上传图片开始制作吧<em @click="soon('上传规范')">上传规范</em></div>

          <div class="dw-upcard">
            <div class="dw-up-main" :class="{ has: !!compImg }" @click="pickerOpen = true">
              <template v-if="compImg">
                <img :src="compImg" alt="" />
                <div class="dw-up-mask">点击重选商品（选品库）</div>
              </template>
              <template v-else>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17l5-4 4 3 4-4 5 5" /><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M12 3v6M9.5 5.5L12 3l2.5 2.5" /></svg>
                点击选择商品（选品库），或拖拽/粘贴上传图片
              </template>
            </div>
            <div class="dw-up-subs">
              <button class="dw-up-sub" @click="soon('素材库')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="9" cy="11" r="1.8" /><path d="M3 17l5-4 4 3 4-4 5 5" /></svg>
                从素材库选择
              </button>
              <button class="dw-up-sub" @click="fromHistory">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                从历史记录添加
              </button>
            </div>
          </div>
        </div>

        <div v-else class="dw-hist">
          <div class="dw-div">历史生成记录</div>
          <div v-if="generating" class="dw-rec">
            <div class="dw-rec-imgs">
              <div v-for="n in 4" :key="n" class="dw-sk" />
            </div>
          </div>
          <div v-for="r in records" :key="r.id" class="dw-rec">
            <div class="dw-rec-h">
              <span class="dw-rec-m">{{ r.method }}<template v-if="r.free">(本次免费生成)</template></span>
              <span class="dw-rec-t">{{ r.time }} | {{ r.cost }}di</span>
              <button class="dw-rec-re" title="重新生成" @click="soon('重新生成')">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 6.3" /><path d="M20 4v7h-7" /></svg>
              </button>
            </div>
            <div class="dw-rec-imgs">
              <img v-for="(tn, i) in TONES" :key="i" :class="tn" :src="r.img" alt="" />
            </div>
          </div>
          <div v-if="records.length === 0 && !generating" class="dw-empty">暂无历史生成记录，回到工作台开始创作吧</div>
        </div>

        <!-- Funion s：聊天式创作条固定底部，上方内容区独立滚动 -->
        <div v-if="tone === 'fs' && (picked || compImg)" class="dw-composer">
          <div class="dw-c-body">
            <div v-if="selectedImgs.length" class="dw-c-imgs">
              <div v-for="(img, i) in selectedImgs" :key="i" class="dw-c-img">
                <img :src="img" alt="" />
                <button class="dw-c-rm" title="取消选择" @click="removeSelected(i)">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <textarea v-model="prompt" class="dw-c-input" :placeholder="placeholder" rows="2" />
          </div>
          <div class="dw-c-tools">
            <div class="dw-c-model">
              <button @click="modelOpen = !modelOpen">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l7 4v6c0 5-3.5 9-7 10-3.5-1-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" /></svg>
                {{ model }}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <div v-if="modelOpen" class="dw-c-pop">
                <a v-for="m in MODELS" :key="m" :class="{ on: model === m }" @click="model = m; modelOpen = false">{{ m }}</a>
              </div>
            </div>
            <button v-if="scope === 'single'" class="dw-c-size" @click="sizeOpen = true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>
              {{ SIZES.find((s) => s.key === singleRatio)?.label }}
            </button>
            <span class="dw-c-credits">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z" /><path d="M2 9h20" /></svg>
              {{ credits }}
            </span>
            <button class="dw-c-send" :disabled="generating" @click="generate">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              {{ generating ? '生成中…' : `${cost} 算力` }}
            </button>
          </div>
        </div>
      </main>
    </div>

    <!-- 我的商品：选品库同源 picker -->
    <div v-if="pickerOpen" class="bee-mask">
      <div class="bee-modal dw-pick">
        <div class="bm-head">
          <b>我的商品</b>
          <span class="dw-pick-count">共 {{ beeProducts.length }} 件</span>
          <button class="bp-close" title="关闭" @click="pickerOpen = false">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="dw-pick-list">
          <div v-for="p in beeProducts" :key="p.id" class="dw-pick-row" @click="pickProduct(p)">
            <img :src="p.img" alt="" />
            <span class="t">{{ p.title }}</span>
            <img class="pl" :src="BEE_PLATFORM_LOGO[p.platform]" alt="" />
          </div>
        </div>
      </div>
    </div>

    <!-- 左侧商品图 / 右侧生成结果：大图预览 -->
    <div v-if="previewImg" class="bee-mask img-preview" @click="previewImg = null">
      <img :src="previewImg" alt="" />
    </div>
  </div>
</template>
