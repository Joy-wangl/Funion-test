<script setup lang="ts">
/* 素材中心（演示版）：创作首页 + 创作中心 + 资产
   创作＝商品/商品图片出视频（生成）、参考视频换商品出同款（复刻）；生成走演示模拟 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import MoreActions from '../../components/MoreActions.vue';
import VsEmptyArt from './VsEmptyArt.vue';
import { pushToast } from '../../components/toast';
import { vsImgHandoff } from '../../components/globalMsgData';
import { cbMaterials, cbProducts, type CbProduct } from './codeKbData';
import './VideoStudio.css';

type View = 'create' | 'assets' | 'history' | 'library';
type Tab = '生成' | '复刻';
const view = ref<View>('create');
const tab = ref<Tab>('生成');

const RATIOS = ['智能', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
const IMG_RATIOS = ['智能', '1:1', '3:4', '16:9', '4:3', '9:16', '2:3', '3:2', '21:9'];
const RESOLUTIONS = ['标清 1.5K', '高清 2K', '超清 4K'];
const RES_LONG: Record<string, number> = { '标清 1.5K': 1536, '高清 2K': 2560, '超清 4K': 3840 };
const DURATIONS = ['5秒', '10秒', '15秒'];
const FPS = ['24fps', '30fps', '60fps'];
const ratio = ref('16:9');
const duration = ref(DURATIONS[0]);
const fps = ref(FPS[1]);
type OutKind = '视频' | '生图';
const outKind = ref<OutKind>('视频');
const isImg = computed(() => outKind.value === '生图');
const ratioEditable = computed(() => !(tab.value === '复刻' && isImg.value && !!product.value));
const resolution = ref(RESOLUTIONS[1]);
const imgCount = ref(2);
const customCount = ref('');
const customOn = computed(() => customCount.value !== '');
const genCount = computed(() => (customOn.value ? Number(customCount.value) : imgCount.value));
const sizeLink = ref(true);
const sizeW = ref(2560);
const sizeH = ref(1440);
const applySize = () => {
  if (ratio.value === '智能') return;
  const [rw, rh] = ratio.value.split(':').map(Number);
  const long = RES_LONG[resolution.value] ?? 2560;
  if (rw >= rh) {
    sizeW.value = long;
    sizeH.value = Math.max(2, Math.round((long * rh / rw) / 2) * 2);
  } else {
    sizeH.value = long;
    sizeW.value = Math.max(2, Math.round((long * rw / rh) / 2) * 2);
  }
};
const pickRatio = (r: string) => {
  ratio.value = r;
  if (isImg.value && r !== '智能') applySize();
};
const pickRes = (res: string) => { resolution.value = res; applySize(); };
const onCustomCount = () => {
  customCount.value = customCount.value.replace(/\D/g, '').slice(0, 1);
  if (customCount.value === '0') customCount.value = '';
};
const onSizeW = (e: Event) => {
  sizeW.value = Math.min(9999, Number((e.target as HTMLInputElement).value.replace(/\D/g, '')) || 0);
  if (sizeLink.value && ratio.value !== '智能') {
    const [rw, rh] = ratio.value.split(':').map(Number);
    sizeH.value = Math.max(2, Math.round((sizeW.value * rh / rw) / 2) * 2);
  }
};
const onSizeH = (e: Event) => {
  sizeH.value = Math.min(9999, Number((e.target as HTMLInputElement).value.replace(/\D/g, '')) || 0);
  if (sizeLink.value && ratio.value !== '智能') {
    const [rw, rh] = ratio.value.split(':').map(Number);
    sizeW.value = Math.max(2, Math.round((sizeH.value * rw / rh) / 2) * 2);
  }
};
const prefOpen = ref(false);
const ratioCls = (r: string) => (r === '智能' ? 'smart' : 'r' + r.replace(':', 'x'));

const prompt = ref('');
const promptPh = computed(() => (isImg.value ? '描述想要的画面效果，例如：突出卖点、干净背景' : tab.value === '复刻' ? '描述要替换的内容，例如：把视频中的商品换成所选商品' : '描述想要的视频效果，例如：突出卖点、节奏轻快'));
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
  const files = Array.from(input.files || []);
  input.value = '';
  for (const file of files) {
    if (!file || !file.type.startsWith('image/') || images.value.length >= 9) continue;
    const fr = new FileReader();
    fr.onload = () => images.value.push({ id: ++imgSeq, url: String(fr.result), name: file.name });
    fr.readAsDataURL(file);
  }
  addMenuOpen.value = false;
};
const dropImage = (i: number) => {
  const it = images.value[i];
  if (!it) return;
  if (isBlob(it.url)) URL.revokeObjectURL(it.url);
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
  if (video.value && isBlob(video.value.url)) URL.revokeObjectURL(video.value.url);
  if (file.size <= 3 * 1024 * 1024) {
    const fr = new FileReader();
    fr.onload = () => { video.value = { url: String(fr.result), name: file.name }; };
    fr.readAsDataURL(file);
  } else {
    video.value = { url: URL.createObjectURL(file), name: file.name };
  }
  addMenuOpen.value = false;
};
const dropVideo = () => {
  if (video.value && isBlob(video.value.url)) URL.revokeObjectURL(video.value.url);
  video.value = null;
};

/* 商品详情「Ai作图」带入：切创作视图生图态；带商品身份时走「选择商品」同一模型（叠堆卡展示），保证两入口展示一致 */
watch(vsImgHandoff, (v) => {
  if (!v) return;
  view.value = 'create';
  tab.value = '生成';
  outKind.value = '生图';
  const urls = v.urls.slice(0, 9);
  if (v.meta) {
    const m = v.meta;
    product.value = { id: m.id, spuId: m.id, name: m.name, seriesId: '', shop: m.shop, platform: m.platform, status: '在售', publishedAt: '', sales: 0, cover: urls[0] ?? '' };
    productImgs.value = urls.map((url, i) => ({ url, name: `${m.name}·图${i + 1}` }));
    prodExpanded.value = false;
    images.value = [];
  } else {
    clearProduct();
    images.value = urls.map((url, i) => ({ id: ++imgSeq, url, name: url.split('/').pop() || `商品图${i + 1}` }));
  }
  pushToast(`已带入 ${urls.length} 张商品图到生图`);
});

const addMenuOpen = ref(false);
const libPopOpen = ref(false);
const addOptions = computed(() => (tab.value === '生成' || isImg.value ? ['上传图片', '选择商品'] : ['上传参考视频', '上传图片', '选择商品']));
const onAddOption = (opt: string) => {
  if (opt === '上传图片') imgInput.value?.click();
  else if (opt === '上传参考视频') videoInput.value?.click();
  else { pickOpen.value = true; }
  if (opt !== '选择商品') addMenuOpen.value = false;
};

const closePops = () => { prefOpen.value = false; pickOpen.value = false; addMenuOpen.value = false; libPopOpen.value = false; };
const togglePref = () => { prefOpen.value = !prefOpen.value; pickOpen.value = false; addMenuOpen.value = false; libPopOpen.value = false; };
const toggleAdd = () => { addMenuOpen.value = !addMenuOpen.value; prefOpen.value = false; pickOpen.value = false; libPopOpen.value = false; };
const toggleLib = () => { libPopOpen.value = !libPopOpen.value; prefOpen.value = false; pickOpen.value = false; addMenuOpen.value = false; };

/* ---------- 演示生成与历史创作 ---------- */
interface GenRecord {
  id: string;
  mode: Tab;
  prompt: string;
  ratio: string | null;
  duration: string;
  fps: string;
  resolution: string | null;
  count: number | null;
  sizeW: number | null;
  sizeH: number | null;
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
  status: '生成中' | '已完成';
}
const REC_STORE = 'vs-records-v2';
const REC_STORE_V1 = 'vs-records-v1';
const SEED_FLAG = 'vs-seeded-v1';
const SEED_IDS = 'vs-seed-ids-v1';
const BASE_SEED_IDS = ['gen-9001', 'gen-9002', 'gen-9003', 'gen-9004'];
const isBlob = (u: string) => u.startsWith('blob:');
const persistShot = (s: Shot | null): Shot | null => (s && !isBlob(s.url) ? s : null);
/* 历史创作落盘：刷新/热更新后仍在；blob 上传资源无法跨会话保留，落盘时剔除 */
const scrubRecord = (r: GenRecord): GenRecord => ({
  ...r,
  video: persistShot(r.video),
  resultVideo: persistShot(r.resultVideo),
  images: r.images.filter((s) => !isBlob(s.url)),
  resultImages: r.resultImages.filter((s) => !isBlob(s.url)),
});
const saveRecords = (list: GenRecord[]) => {
  let rest = list;
  for (;;) {
    try {
      localStorage.setItem(REC_STORE, JSON.stringify(rest));
      return;
    } catch {
      if (!rest.length) return;
      rest = rest.slice(0, -1);
    }
  }
};
const validRecords = (list: unknown): GenRecord[] =>
  Array.isArray(list) ? (list as GenRecord[]).filter((r) => r && r.id && r.status === '已完成') : [];
/* 读盘：v2 不存在返回 null（首次），存在则返回已完成记录（可能为空＝用户已全删） */
const loadStored = (): GenRecord[] | null => {
  const raw = localStorage.getItem(REC_STORE);
  if (raw === null) {
    const v1 = localStorage.getItem(REC_STORE_V1);
    if (v1 !== null) {
      try { return validRecords(JSON.parse(v1)); } catch { return []; }
    }
    return null;
  }
  try { return validRecords(JSON.parse(raw)); } catch { return []; }
};

/* ---------- 演示历史种子：覆盖 生成图/复刻图/生成视频/复刻视频 四类 ---------- */
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();

/* ---------- 模型选择与语料库 ---------- */
const VIDEO_MODELS = ['Funion Video 1.0', 'Funion Video 1.0 Pro'];
const IMG_MODELS = ['Funion Image 2.0', 'Funion Image 2.0 Pro'];
const modelChoices = computed(() => (isImg.value ? IMG_MODELS : VIDEO_MODELS));
const pickedModel = ref({ video: VIDEO_MODELS[0], img: IMG_MODELS[0] });
const model = computed(() => (isImg.value ? pickedModel.value.img : pickedModel.value.video));
const pickModel = (m: string) => {
  if (isImg.value) pickedModel.value.img = m;
  else pickedModel.value.video = m;
};

interface PromptItem { id: string; name: string; text: string; mode: Tab; kind: '视频' | '图片'; createdAt: string; creator?: string; on?: boolean; }
const PROMPT_STORE = 'vs-prompts-v1';
const PROMPT_SEEDED = 'vs-prompts-seeded-v2';
/* 语料种子：百货全品类 × 生成/复刻 × 视频/图片，结合素材中心功能（开箱/使用演示、佩戴场景、主图/详情/SKU/白底图套图、口播换商品、同款复刻、大促卖点节奏） */
const seedPrompts = (): PromptItem[] => [
  /* 生成·视频 */
  { id: 'pt-9001', name: '礼盒开箱演示', mode: '生成', kind: '视频', text: '礼盒开箱演示，节奏轻快，逐件展示六件套，突出仪式感与全套配置', createdAt: hoursAgo(30), creator: '张三' },
  { id: 'pt-9002', name: '榨汁杯使用演示', mode: '生成', kind: '视频', text: '便携榨汁杯使用演示，鲜果入杯到一键启动，突出大功率与可拆洗，清凉色调', createdAt: hoursAgo(33), creator: '李四' },
  { id: 'pt-9003', name: '抓夹佩戴展示', mode: '生成', kind: '视频', text: '缎面抓夹佩戴场景，模特 360° 转身展示发饰贴合与缎面光泽，暖色打光', createdAt: hoursAgo(3), creator: '王五' },
  { id: 'pt-9004', name: '精华质地特写', mode: '生成', kind: '视频', text: '玻尿酸精华质地特写，慢镜滴管拉丝＋上手推开吸收，突出深层保湿卖点', createdAt: hoursAgo(5), creator: '赵六' },
  { id: 'pt-9005', name: '保暖内衣上身', mode: '生成', kind: '视频', text: '秋冬保暖内衣模特上身走动，强调贴身不臃肿与蓄热锁温，节奏舒缓', createdAt: hoursAgo(8), creator: '孙七' },
  { id: 'pt-9006', name: '四件套铺床演示', mode: '生成', kind: '视频', text: '纯棉四件套铺床过程演示，突出亲肤面料与整套搭配，明亮家居场景', createdAt: hoursAgo(12), creator: '周梦琪' },
  { id: 'pt-9007', name: '大促快切短视频', mode: '生成', kind: '视频', text: '大促爆款短视频，前 3 秒抛价格锚点＋核心卖点字幕，快切运镜促转化', createdAt: hoursAgo(20), creator: '吴孝朝' },
  /* 生成·图片 */
  { id: 'pt-9011', name: '缎面抓夹主图', mode: '生成', kind: '图片', text: '突出缎面质感，干净背景，模特佩戴场景，主图构图居中留白', createdAt: hoursAgo(2), creator: '张三' },
  { id: 'pt-9012', name: '奥莱白底特写', mode: '生成', kind: '图片', text: '奥莱店主图，白底加佩戴细节特写，突出材质与做工', createdAt: hoursAgo(9), creator: '李四' },
  { id: 'pt-9013', name: '精华保湿主图', mode: '生成', kind: '图片', text: '玻尿酸精华主图，水润质感＋成分分子视觉，突出保湿修护卖点', createdAt: hoursAgo(4), creator: '王五' },
  { id: 'pt-9014', name: '榨汁杯场景图', mode: '生成', kind: '图片', text: '榨汁杯场景图，鲜果入杯瞬间＋清凉色调，突出一键便捷与容量', createdAt: hoursAgo(7), creator: '赵六' },
  { id: 'pt-9015', name: 'SKU 色系平铺', mode: '生成', kind: '图片', text: 'SKU 色系全览平铺图，多色整齐排列并标注色号，纯白底高清', createdAt: hoursAgo(15), creator: '孙七' },
  { id: 'pt-9016', name: '卖点详情长图', mode: '生成', kind: '图片', text: '详情长图，卖点分区＋使用步骤＋规格参数，图文层级清晰便于滑动浏览', createdAt: hoursAgo(22), creator: '周梦琪' },
  { id: 'pt-9017', name: '内衣详情微距', mode: '生成', kind: '图片', text: '保暖内衣详情图，面料微距＋蓄热示意，突出版型与材质克重', createdAt: hoursAgo(26), creator: '吴孝朝' },
  /* 复刻·视频 */
  { id: 'pt-9021', name: '口播换商品', mode: '复刻', kind: '视频', text: '把口播视频中的商品换成视频号小店同款，保留口播节奏与运镜', createdAt: hoursAgo(52), creator: '张三' },
  { id: 'pt-9022', name: '爆款节奏复刻', mode: '复刻', kind: '视频', text: '按爆款短视频节奏复刻，替换为本店商品与卖点字幕，保持卡点与转场', createdAt: hoursAgo(34), creator: '李四' },
  { id: 'pt-9023', name: '竞品开箱复刻', mode: '复刻', kind: '视频', text: '复刻竞品开箱视频结构，换成本店礼盒与包装，保留悬念铺陈节奏', createdAt: hoursAgo(40), creator: '王五' },
  { id: 'pt-9024', name: '使用演示复刻', mode: '复刻', kind: '视频', text: '同款使用演示复刻，替换商品外观与品牌标识，动作分镜保持一致', createdAt: hoursAgo(46), creator: '赵六' },
  /* 复刻·图片 */
  { id: 'pt-9031', name: '成套主图复刻', mode: '复刻', kind: '图片', text: '按商品图 1:1 复刻成套主图，统一构图与色调', createdAt: hoursAgo(6), creator: '孙七' },
  { id: 'pt-9032', name: '跨平台套图复刻', mode: '复刻', kind: '图片', text: '按淘宝同款主图复刻视频号小店套图，适配平台尺寸与规范', createdAt: hoursAgo(28), creator: '周梦琪' },
  { id: 'pt-9033', name: '竞品构图复刻', mode: '复刻', kind: '图片', text: '复刻竞品主图构图与配色，替换为本店商品，保留视觉风格', createdAt: hoursAgo(36), creator: '吴孝朝' },
  { id: 'pt-9034', name: '详情版式复刻', mode: '复刻', kind: '图片', text: '按同款详情图版式复刻，换商品图与文案，保持卖点分区结构', createdAt: hoursAgo(44), creator: '张三' },
  { id: 'pt-9035', name: '白底图规范复刻', mode: '复刻', kind: '图片', text: '复刻白底图规范，抠图去背＋统一尺寸，满足多店铺主图上架要求', createdAt: hoursAgo(50), creator: '李四' },
];
/* 旧数据无名称：优先按文案回填种子名称，否则截取文案作标题 */
const deriveName = (text: string) => (text.length > 14 ? `${text.slice(0, 14)}…` : text);
const withNames = (list: PromptItem[]): PromptItem[] => {
  const seeds = seedPrompts();
  return list.map((p) => {
    if (p.name) return p;
    const hit = seeds.find((s) => s.text === p.text && s.mode === p.mode && s.kind === p.kind);
    return { ...p, name: hit ? hit.name : deriveName(p.text) };
  });
};
const initPrompts = (): PromptItem[] => {
  const raw = localStorage.getItem(PROMPT_STORE);
  if (raw === null) {
    const seeds = seedPrompts();
    localStorage.setItem(PROMPT_STORE, JSON.stringify(seeds));
    localStorage.setItem(PROMPT_SEEDED, '1');
    return seeds;
  }
  let list: PromptItem[] = [];
  try {
    const parsed: unknown = JSON.parse(raw);
    list = Array.isArray(parsed) ? (parsed as PromptItem[]).filter((p) => p && p.id && p.text) : [];
  } catch { list = []; }
  /* 已有本地语料：按「文案+模式+输出类型」去重合并一次新种子，不覆盖不复活用户自建条目 */
  if (!localStorage.getItem(PROMPT_SEEDED)) {
    const seen = new Set(list.map((p) => `${p.mode}|${p.kind}|${p.text}`));
    const usedIds = new Set(list.map((p) => p.id));
    let bump = 9100;
    const add = seedPrompts()
      .filter((s) => !seen.has(`${s.mode}|${s.kind}|${s.text}`))
      .map((s) => {
        if (!usedIds.has(s.id)) { usedIds.add(s.id); return s; }
        let id = `pt-${++bump}`;
        while (usedIds.has(id)) id = `pt-${++bump}`;
        usedIds.add(id);
        return { ...s, id };
      });
    list = [...add, ...list];
    /* 立即落盘合并结果，否则重载时标记已置而合并丢失 */
    localStorage.setItem(PROMPT_STORE, JSON.stringify(list));
    localStorage.setItem(PROMPT_SEEDED, '1');
  }
  return withNames(list);
};
const prompts = ref<PromptItem[]>(initPrompts());
watch(prompts, (v) => localStorage.setItem(PROMPT_STORE, JSON.stringify(v)), { deep: true });
let promptSeq = prompts.value.reduce((m, p) => {
  const n = Number(p.id.replace(/\D/g, ''));
  return Number.isFinite(n) && n > m ? n : m;
}, 0);
/* 发送自动入库：同文案同分类不重复 */
const savePromptToLib = (text: string, mode: Tab, kind: '视频' | '图片') => {
  if (!text || prompts.value.some((p) => p.text === text && p.mode === mode && p.kind === kind)) return false;
  prompts.value = [{ id: `pt-${++promptSeq}`, name: deriveName(text), text, mode, kind, createdAt: new Date().toISOString(), creator: '七妮妮' }, ...prompts.value];
  return true;
};

/* 语料库管理页：左栏为可编辑的语料类型（标题+描述），右栏提示词卡（对标知识库场景配置） */
interface LibType { key: string; mode: Tab; kind: '视频' | '图片'; title: string; desc: string }
const LIB_TYPE_SEED: LibType[] = [
  { key: 'gi', mode: '生成', kind: '图片', title: '图片生成', desc: '按提示词生成商品图片' },
  { key: 'ci', mode: '复刻', kind: '图片', title: '图片复刻', desc: '参考图复刻商品图片' },
  { key: 'gv', mode: '生成', kind: '视频', title: '视频生成', desc: '按提示词生成商品视频' },
  { key: 'cv', mode: '复刻', kind: '视频', title: '视频复刻', desc: '参考视频复刻成片节奏' },
];
const LIB_TYPE_STORE = 'vs-lib-types-v1';
const initLibTypes = (): LibType[] => {
  const raw = localStorage.getItem(LIB_TYPE_STORE);
  if (raw) {
    try {
      const list = JSON.parse(raw) as LibType[];
      if (Array.isArray(list) && list.length) return list;
    } catch { /* 存档损坏回退种子 */ }
  }
  return LIB_TYPE_SEED.map((t) => ({ ...t }));
};
const libTypes = ref<LibType[]>(initLibTypes());
watch(libTypes, (v) => localStorage.setItem(LIB_TYPE_STORE, JSON.stringify(v)), { deep: true });
const LIB_STATUS = ['全部', '已启用', '已停用'];
const libGroup = ref('gi');
const libKw = ref('');
const libStatus = ref('全部');
const libGroups = computed(() => libTypes.value.map((g) => {
  const items = prompts.value.filter((p) => p.mode === g.mode && p.kind === g.kind);
  return { ...g, count: items.length };
}));
const curGroup = computed(() => libGroups.value.find((g) => g.key === libGroup.value) ?? libGroups.value[0]);
const libRows = computed(() => {
  const kw = libKw.value.trim();
  return prompts.value
    .filter((p) => p.mode === curGroup.value.mode && p.kind === curGroup.value.kind)
    .filter((p) => (libStatus.value === '已启用' ? p.on !== false : libStatus.value === '已停用' ? p.on === false : true))
    .filter((p) => !kw || p.text.includes(kw))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});
const togglePromptOn = (p: PromptItem) => { p.on = p.on === false; };
/* 语料表单只配标题+描述：归属类型取左栏当前选中类型 */
const promptForm = ref<{ id: string | null; name: string; text: string } | null>(null);
const openPromptForm = (p: PromptItem | null) => {
  promptForm.value = p ? { id: p.id, name: p.name, text: p.text } : { id: null, name: '', text: '' };
};
const savePromptForm = () => {
  const f = promptForm.value;
  if (!f || !f.text.trim()) return;
  const text = f.text.trim();
  const name = f.name.trim() || deriveName(text);
  if (f.id) {
    const t = prompts.value.find((p) => p.id === f.id);
    if (t) { t.text = text; t.name = name; }
    pushToast('语料已更新');
  } else {
    prompts.value = [{ id: `pt-${++promptSeq}`, name, text, mode: curGroup.value.mode, kind: curGroup.value.kind, createdAt: new Date().toISOString(), creator: '七妮妮' }, ...prompts.value];
    pushToast('已新增语料');
  }
  promptForm.value = null;
};
/* 类型表单：仅标题+描述 */
const typeForm = ref<{ key: string; title: string; desc: string } | null>(null);
const openTypeForm = (g: LibType) => { typeForm.value = { key: g.key, title: g.title, desc: g.desc }; };
const saveTypeForm = () => {
  const f = typeForm.value;
  if (!f || !f.title.trim()) return;
  const t = libTypes.value.find((x) => x.key === f.key);
  if (t) { t.title = f.title.trim(); t.desc = f.desc.trim(); }
  typeForm.value = null;
  pushToast('类型已更新');
};
/* 删除类型：连同该类型（模式×输出类型）下语料一并删除，二次确认；至少保留一个类型 */
const typeDel = ref<LibType | null>(null);
const typeDelCount = computed(() => {
  const t = typeDel.value;
  return t ? prompts.value.filter((p) => p.mode === t.mode && p.kind === t.kind).length : 0;
});
const confirmTypeDel = () => {
  const t = typeDel.value;
  if (!t) return;
  if (libTypes.value.length <= 1) { pushToast('至少保留一个语料类型', 'warning'); typeDel.value = null; return; }
  libTypes.value = libTypes.value.filter((x) => x.key !== t.key);
  prompts.value = prompts.value.filter((p) => !(p.mode === t.mode && p.kind === t.kind));
  if (libGroup.value === t.key) libGroup.value = libTypes.value[0]?.key ?? '';
  typeDel.value = null;
  pushToast('已删除该类型');
};
const promptDel = ref<PromptItem | null>(null);
const confirmPromptDel = () => {
  const t = promptDel.value;
  if (!t) return;
  prompts.value = prompts.value.filter((p) => p.id !== t.id);
  promptDel.value = null;
  pushToast('已删除该语料');
};

/* 卡内语料选择气泡：仅列当前模式 × 输出类型的启用语料 */
const pickPrompts = computed(() => prompts.value.filter((p) => p.on !== false && p.mode === tab.value && p.kind === (isImg.value ? '图片' : '视频')));
/* 使用：回填创作输入并同步模式/输出类型 */
const usePrompt = (p: PromptItem) => {
  prompt.value = p.text;
  tab.value = p.mode;
  outKind.value = p.kind === '图片' ? '生图' : '视频';
  view.value = 'create';
  libPopOpen.value = false;
  nextTick(() => promptEl.value?.focus());
};

const prodById = (id: string) => cbProducts.find((p) => p.id === id) ?? null;
const seedRecords = (): GenRecord[] => {
  const base = (id: string, pid: string, o: Partial<GenRecord>): GenRecord => {
    const p = prodById(pid);
    const pImgs = p ? productImagesOf(p) : [];
    return {
      id, mode: '生成', prompt: '', ratio: null, duration: '5秒', fps: '30fps',
      resolution: null, count: null, sizeW: null, sizeH: null,
      createdAt: hoursAgo(1), productId: pid, productName: p?.name ?? null, productCover: p?.cover ?? null,
      productImages: pImgs.map((s) => ({ ...s })), images: [], video: null,
      resultImages: [], resultVideo: null, kind: '图片', status: '已完成',
      ...o,
    } as GenRecord;
  };
  const cyc = (pool: Shot[], n: number) => Array.from({ length: n }, (_, i) => ({ ...pool[i % pool.length] }));
  // 生成 + 图片
  const p8801 = prodById('TB-8801');
  const pool8801 = p8801 ? productImagesOf(p8801) : [];
  // 复刻 + 图片
  const p7201 = prodById('TB-7201');
  const pool7201 = p7201 ? productImagesOf(p7201) : [];
  // 生成 + 视频
  const p5101 = prodById('TB-5101');
  const pool5101 = p5101 ? productImagesOf(p5101) : [];
  // 复刻 + 视频
  const p9101 = prodById('SP-9101');
  const pool9101 = p9101 ? productImagesOf(p9101) : [];
  // 同日多条（供按日收起演示）
  const p8802 = prodById('TB-8802');
  const pool8802 = p8802 ? productImagesOf(p8802) : [];
  const p5201 = prodById('SP-5201');
  const pool5201 = p5201 ? productImagesOf(p5201) : [];
  const p3101 = prodById('TB-3101');
  const pool3101 = p3101 ? productImagesOf(p3101) : [];
  const refVideo = cbMaterials.find((m) => m.id === 'MT-910102');
  return [
    base('gen-9001', 'TB-8801', {
      mode: '生成', kind: '图片', prompt: '突出缎面质感，干净背景，模特佩戴场景', ratio: '3:4',
      resolution: '高清 2K', count: 4, sizeW: 1920, sizeH: 2560, createdAt: hoursAgo(2),
      resultImages: cyc(pool8801, 4),
    }),
    base('gen-9002', 'TB-7201', {
      mode: '复刻', kind: '图片', prompt: '按商品图 1:1 复刻成套主图', ratio: null,
      resolution: '标清 1.5K', count: pool7201.length, createdAt: hoursAgo(6),
      resultImages: pool7201.map((s) => ({ ...s })),
    }),
    base('gen-9003', 'TB-5101', {
      mode: '生成', kind: '视频', prompt: '礼盒开箱演示，节奏轻快，突出六件套', ratio: '16:9',
      duration: '10秒', fps: '30fps', createdAt: hoursAgo(30),
      resultImages: pool5101.map((s) => ({ ...s })),
    }),
    base('gen-9004', 'SP-9101', {
      mode: '复刻', kind: '视频', prompt: '把口播视频中的商品换成视频号小店同款', ratio: '9:16',
      duration: '10秒', fps: '30fps', createdAt: hoursAgo(52),
      video: { url: refVideo?.thumb ?? p9101?.cover ?? '', name: refVideo?.name ?? '9101 视频·口播' },
      resultImages: [...pool9101.map((s) => ({ ...s })), { url: refVideo?.thumb ?? '', name: '9101 视频·口播' }].filter((s) => s.url),
    }),
    base('gen-9005', 'TB-8802', {
      mode: '生成', kind: '图片', prompt: '奥莱店主图，白底加佩戴细节特写', ratio: '1:1',
      resolution: '高清 2K', count: 3, sizeW: 1600, sizeH: 1600, createdAt: hoursAgo(9),
      resultImages: cyc(pool8802, 3),
    }),
    base('gen-9006', 'SP-5201', {
      mode: '复刻', kind: '图片', prompt: '按淘宝同款主图复刻视频号小店套图', ratio: null,
      resolution: '标清 1.5K', count: pool5201.length, createdAt: hoursAgo(28),
      resultImages: pool5201.map((s) => ({ ...s })),
    }),
    base('gen-9007', 'TB-3101', {
      mode: '生成', kind: '视频', prompt: '榨汁杯使用演示，突出一键启动与拆洗', ratio: '9:16',
      duration: '10秒', fps: '30fps', createdAt: hoursAgo(33),
      resultImages: pool3101.map((s) => ({ ...s })),
    }),
  ];
};

/* 种子按 id 记账合并：新增种子可补进老环境，用户删过的种子不再复活 */
let seedPersistNeeded = false;
let seededIds: string[] | null = null;
const initRecords = (): GenRecord[] => {
  const stored = loadStored();
  localStorage.removeItem(REC_STORE_V1);
  const seeds = seedRecords();
  if (stored === null) { seededIds = seeds.map((r) => r.id); seedPersistNeeded = true; return seeds; }
  let done: string[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SEED_IDS) ?? 'null');
    if (Array.isArray(parsed)) done = parsed.filter((x): x is string => typeof x === 'string');
  } catch { done = []; }
  if (!done.length && localStorage.getItem(SEED_FLAG)) done = [...BASE_SEED_IDS];
  const have = new Set(stored.map((r) => r.id));
  const missing = seeds.filter((r) => !done.includes(r.id) && !have.has(r.id));
  seededIds = [...done, ...missing.map((r) => r.id)];
  if (!missing.length) return stored;
  const merged = [...stored, ...missing];
  merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  seedPersistNeeded = true;
  return merged;
};
const records = ref<GenRecord[]>(initRecords());
let recSeq = records.value.reduce((m, r) => {
  const n = Number(r.id.replace(/\D/g, ''));
  return Number.isFinite(n) && n > m ? n : m;
}, 0);
watch(records, (v) => saveRecords(v.map(scrubRecord)), { deep: true });
if (seedPersistNeeded) {
  localStorage.removeItem(SEED_FLAG);
  if (seededIds) localStorage.setItem(SEED_IDS, JSON.stringify(seededIds));
  saveRecords(records.value.map(scrubRecord));
}
const generating = ref<string | null>(null);

const doGenerate = (src: {
  mode: Tab; prompt: string; ratio: string | null; duration: string; fps: string;
  product: CbProduct | null; productImages: Shot[]; images: Shot[]; video: Shot | null;
  kind: '视频' | '图片'; resolution: string | null; count: number | null; sizeW: number | null; sizeH: number | null;
}, key: string) => {
  generating.value = key;
  const id = `gen-${++recSeq}`;
  records.value = [{
    id,
    mode: src.mode,
    prompt: src.prompt,
    ratio: src.ratio,
    duration: src.duration,
    fps: src.fps,
    resolution: src.resolution,
    count: src.count,
    sizeW: src.sizeW,
    sizeH: src.sizeH,
    createdAt: new Date().toISOString(),
    productId: src.product?.id ?? null,
    productName: src.product?.name ?? null,
    productCover: src.product?.cover ?? null,
    productImages: src.productImages.map((s) => ({ ...s })),
    images: src.images.map((s) => ({ ...s })),
    video: src.video ? { ...src.video } : null,
    resultImages: [],
    resultVideo: null,
    kind: src.kind,
    status: '生成中',
  }, ...records.value];
  view.value = 'history';
  foldedDays.value[dayLabel(new Date().toISOString())] = false;
  nextTick(() => document.getElementById(`vs-rec-${id}`)?.scrollIntoView({ block: 'center' }));
  window.setTimeout(() => {
    generating.value = null;
    const target = records.value.find((x) => x.id === id);
    if (!target) return;
    target.status = '已完成';
    const pool = target.images.length ? target.images : target.productImages;
    if (src.kind === '图片') {
      if (src.mode === '复刻') {
        target.resultImages = pool.map((s) => ({ ...s }));
        target.count = target.resultImages.length;
      } else {
        target.resultImages = Array.from({ length: src.count ?? 1 }, (_, i) => pool[i % pool.length]);
      }
    }
    else target.resultImages = src.mode === '生成' ? pool : [];
    target.resultVideo = src.mode === '复刻' && src.kind === '视频' ? target.video : null;
    pushToast('演示生成完成');
  }, 2200);
};

/* 内容不完整（缺图/视频源）时生成按钮不可点，首页与创作中心停靠条一致 */
const canSend = computed(() => {
  if (tab.value === '生成' || isImg.value) return !!product.value || images.value.length > 0;
  return !!video.value && !!product.value;
});
const generate = () => {
  if (generating.value || !canSend.value) return;
  const saved = savePromptToLib(prompt.value.trim(), tab.value, isImg.value ? '图片' : '视频');
  doGenerate({
    mode: tab.value, prompt: prompt.value.trim(), ratio: ratioEditable.value ? ratio.value : null, duration: duration.value, fps: fps.value,
    product: product.value, productImages: productImgs.value, images: images.value.map((im) => ({ url: im.url, name: im.name })), video: video.value,
    kind: isImg.value ? '图片' : '视频',
    resolution: isImg.value ? resolution.value : null,
    count: isImg.value && tab.value === '生成' ? genCount.value : null,
    sizeW: isImg.value && ratioEditable.value ? sizeW.value : null,
    sizeH: isImg.value && ratioEditable.value ? sizeH.value : null,
  }, 'main');
  prompt.value = '';
  if (saved) pushToast('提示词已存入语料库');
};

const regen = (r: GenRecord) => {
  if (generating.value) return;
  doGenerate({
    mode: r.mode, prompt: r.prompt, ratio: r.ratio, duration: r.duration, fps: r.fps,
    product: cbProducts.find((p) => p.id === r.productId) ?? null, productImages: r.productImages, images: r.images, video: r.video,
    kind: r.kind, resolution: r.resolution, count: r.count, sizeW: r.sizeW, sizeH: r.sizeH,
  }, r.id);
};

const reedit = (r: GenRecord) => {
  tab.value = r.mode;
  prompt.value = r.prompt;
  duration.value = r.duration;
  fps.value = r.fps;
  if (r.resolution) resolution.value = r.resolution;
  if (r.ratio) ratio.value = r.ratio;
  if (r.sizeW) sizeW.value = r.sizeW;
  if (r.sizeH) sizeH.value = r.sizeH;
  product.value = cbProducts.find((p) => p.id === r.productId) ?? null;
  productImgs.value = r.productImages.map((im) => ({ ...im }));
  prodExpanded.value = false;
  images.value = r.images.map((im) => ({ id: ++imgSeq, url: im.url, name: im.name }));
  video.value = r.video;
  outKind.value = r.kind === '图片' ? '生图' : '视频';
  if (r.count) {
    if (r.count <= 4) { imgCount.value = r.count; customCount.value = ''; } else customCount.value = String(r.count);
  }
  composerOn.value = true;
  nextTick(() => promptEl.value?.focus());
};

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

interface AssetItem { kind: string; url: string; name: string; createdAt: string; video: boolean; frames?: Shot[] }
const assetItems = computed<AssetItem[]>(() => {
  const now = Date.now();
  const list: AssetItem[] = [];
  for (const r of records.value) {
    for (const im of r.resultImages) list.push({ kind: '图片', url: im.url, name: im.name, createdAt: r.createdAt, video: false });
    if (r.resultVideo) list.push({ kind: '视频', url: r.resultVideo.url, name: r.resultVideo.name, createdAt: r.createdAt, video: true });
    else if (r.kind === '视频' && r.resultImages.length) list.push({ kind: '视频', url: r.resultImages[0].url, name: recTitle(r), createdAt: r.createdAt, video: true, frames: r.resultImages });
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
/* 按日收起：仅天内多条的组可折叠，状态会话内保留 */
const foldedDays = ref<Record<string, boolean>>({});
const toggleDay = (label: string) => {
  foldedDays.value = { ...foldedDays.value, [label]: !foldedDays.value[label] };
};
/* 资产按日收起：收起仅留一行，末位错位叠堆＋数量角标；列数按容器宽实测 */
const foldedAssetDays = ref<Record<string, boolean>>({});
const toggleAssetDay = (label: string) => {
  foldedAssetDays.value = { ...foldedAssetDays.value, [label]: !foldedAssetDays.value[label] };
};
const assetWrapEl = ref<HTMLElement | null>(null);
const assetCols = ref(4);
let assetRO: ResizeObserver | null = null;
const measureAssetCols = () => {
  const el = assetWrapEl.value;
  if (el) assetCols.value = Math.max(1, Math.floor((el.clientWidth + 16) / 196));
};
watch(view, (v) => {
  nextTick(() => {
    assetRO?.disconnect();
    assetRO = null;
    if (v === 'assets' && assetWrapEl.value) {
      measureAssetCols();
      assetRO = new ResizeObserver(measureAssetCols);
      assetRO.observe(assetWrapEl.value);
    }
  });
});
const assetVisible = (g: { label: string; items: AssetItem[] }) =>
  foldedAssetDays.value[g.label] ? g.items.slice(0, Math.max(1, assetCols.value - 1)) : g.items;

const recCover = (r: GenRecord) => r.resultImages[0]?.url ?? r.productCover ?? r.productImages[0]?.url ?? r.images[0]?.url ?? null;
const recTitle = (r: GenRecord) => r.productName || r.prompt || r.mode;
const gotoRecord = (id: string) => {
  view.value = 'history';
  closePops();
  const rec = records.value.find((r) => r.id === id);
  if (rec) foldedDays.value[dayLabel(rec.createdAt)] = false;
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
const showTop = ref(false);
const onAppScroll = () => { const el = document.querySelector('.vs-scroll'); showTop.value = (el?.scrollTop ?? 0) > 80; };
onMounted(() => document.querySelector('.vs-scroll')?.addEventListener('scroll', onAppScroll, { passive: true }));
onUnmounted(() => {
  document.querySelector('.vs-scroll')?.removeEventListener('scroll', onAppScroll);
  assetRO?.disconnect();
});
const toTop = () => document.querySelector('.vs-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });

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
const openPreview = (it: AssetItem) => {
  if (it.frames) openPreviewList(it.frames.map((x) => ({ url: x.url, name: x.name, video: false })), 0);
  else openPreviewList([{ url: it.url, name: it.name, video: it.video }], 0);
};
const openProdPreview = (i: number) => openPreviewList(productImgs.value.map((im) => ({ url: im.url, name: im.name, video: false })), i);
const switchPv = (i: number) => { previewIdx.value = i; previewError.value = false; };
const closePreview = () => { previewList.value = []; previewIdx.value = 0; };
</script>

<template>
  <div class="vs-home" @click="closePops">
    <div class="vs-views" @click.stop>
      <template v-if="view === 'library'">
        <button type="button" class="vs-back" @click="view = 'create'; closePops()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          返回
        </button>
      </template>
      <template v-else>
        <span class="vs-views-tabs">
          <button type="button" class="vs-view" :class="view === 'create' ? 'on' : ''" @click="view = 'create'; closePops()">创作</button>
          <button type="button" class="vs-view" :class="view === 'history' ? 'on' : ''" @click="view = 'history'; closePops()">创作中心</button>
          <button type="button" class="vs-view" :class="view === 'assets' ? 'on' : ''" @click="view = 'assets'; closePops()">资产</button>
        </span>
        <button type="button" class="vs-libentry" @click="view = 'library'; closePops()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
          语料库
        </button>
      </template>
    </div>

    <!-- 创作：顶部动效装饰 + 生成/复刻 + 输入卡 -->
    <div class="vs-scroll">
    <template v-if="view === 'create'">
      <div class="vs-hero">
        <span class="vs-spark s1" /><span class="vs-spark s2" /><span class="vs-spark s3" /><span class="vs-spark s4" />
        <span class="vs-deco" aria-hidden="true">
          <i class="d-sq b1" /><i class="d-sq b2" /><i class="d-oq b3" /><i class="d-oq b4" /><i class="d-star b5" /><i class="d-star b6" /><i class="d-ring b7" />
        </span>
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
      <div v-if="assetGroups.length" ref="assetWrapEl" class="vs-groups">
        <div v-for="g in assetGroups" :key="g.label" class="vs-group">
          <button
            type="button"
            class="vs-group-t date"
            :class="{ folded: foldedAssetDays[g.label], solo: g.items.length <= assetCols }"
            :disabled="g.items.length <= assetCols"
            @click="toggleAssetDay(g.label)"
          >
            <span>{{ g.label }}</span>
            <i class="vs-date-line" />
            <span v-if="g.items.length > assetCols" class="vs-fold-act" :class="foldedAssetDays[g.label] ? '' : 'expanded'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>{{ foldedAssetDays[g.label] ? '展开' : '收起' }}
            </span>
          </button>
          <div class="vs-assetgrid">
            <button v-for="(it, i) in assetVisible(g)" :key="it.url + i" type="button" class="vs-asset" @click="openPreview(it)">
              <span class="vs-asset-thumb">
                <img v-if="!it.video || it.frames" :src="it.url" :alt="it.name" />
                <video v-else :src="it.url" preload="metadata" muted playsinline />
                <span v-if="it.video" class="vs-play">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                </span>
              </span>
              <span class="vs-asset-name" :title="it.name">{{ it.name }}</span>
              <span class="vs-asset-meta">{{ timeLabel(it.createdAt) }}</span>
            </button>
            <button
              v-if="foldedAssetDays[g.label] && g.items.length > assetCols"
              type="button"
              class="vs-asset vs-asset-more"
              title="展开"
              @click="toggleAssetDay(g.label)"
            >
              <span class="vs-asset-thumb more">
                <span class="vs-astack">
                  <span v-for="(s, j) in g.items.slice(assetCols - 1, assetCols + 2)" :key="j" class="vs-stack-card" :class="`c${j}`">
                    <img v-if="!s.video || s.frames" :src="s.url" :alt="s.name" />
                    <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
                  </span>
                  <span class="vs-stack-n">{{ g.items.length - assetCols + 1 }}</span>
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="vs-empty">
        <div class="vs-empty-art"><VsEmptyArt /></div>
        <div class="vs-empty-t">暂无{{ assetType }}资产</div>
      </div>
    </template>

    <!-- 创作中心：按日分组的创作记录（附件/描述/参数/状态/操作/结果） -->
    <template v-else-if="view === 'history'">
      <div v-if="historyGroups.length" class="vs-groups">
        <div v-for="g in historyGroups" :key="g.label" class="vs-group">
          <button
            type="button"
            class="vs-group-t date"
            :class="{ folded: foldedDays[g.label], solo: g.items.length < 2 }"
            :disabled="g.items.length < 2"
            @click="toggleDay(g.label)"
          >
            <span>{{ g.label }}</span>
            <i class="vs-date-line" />
            <span v-if="g.items.length > 1" class="vs-fold-act" :class="foldedDays[g.label] ? '' : 'expanded'">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>{{ foldedDays[g.label] ? '展开' : '收起' }}
            </span>
          </button>
          <template v-if="!foldedDays[g.label]">
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
                    <template v-if="r.kind === '图片'">
                      <template v-if="r.resolution"><i></i><span>{{ r.resolution }}</span></template>
                      <template v-if="r.ratio"><i></i><span>{{ r.ratio }}</span></template>
                      <template v-if="r.count"><i></i><span>{{ r.count }}张</span></template>
                    </template>
                    <template v-else>
                      <i></i><span>{{ r.duration }}</span>
                      <i></i><span>{{ r.ratio }}</span>
                      <template v-if="r.fps"><i></i><span>{{ r.fps }}</span></template>
                    </template>
                    <i></i><time :datetime="r.createdAt">{{ timeLabel(r.createdAt) }}</time>
                  </span>
                </p>
              </div>
            </div>
            <div class="vs-rec-status" :class="r.status === '生成中' ? 'busy' : ''">
              <span v-if="r.status === '生成中'" class="vs-spin small" />
              <span v-else class="dot" />
              {{ r.status === '生成中' ? '生成中' : '演示生成完成' }}
            </div>
            <div v-if="r.resultVideo" class="vs-rec-result">
              <video :src="r.resultVideo.url" controls playsinline preload="metadata" @error="($event.target as HTMLVideoElement).style.display = 'none'" />
              <a class="vs-rec-dl solid" :href="r.resultVideo.url" :download="r.resultVideo.name" title="保存到本地" @click.stop>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 19h16" /></svg>
              </a>
            </div>
            <div v-else-if="r.kind === '图片' && r.resultImages.length" class="vs-rec-grid">
              <span v-for="(im, gi) in r.resultImages" :key="im.url + gi" class="vs-rec-cell">
                <button type="button" :title="im.name" @click="openPreviewList(r.resultImages.map((x) => ({ url: x.url, name: x.name, video: false })), gi)">
                  <img :src="im.url" :alt="im.name" />
                </button>
                <a class="vs-rec-dl" :href="im.url" :download="im.name" title="保存到本地" @click.stop>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 19h16" /></svg>
                </a>
              </span>
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
            <div v-if="r.status !== '生成中'" class="vs-rec-actions" @click.stop>
              <button type="button" class="vs-act" @click="reedit(r)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                重新编辑
              </button>
              <button type="button" class="vs-act" :disabled="generating !== null" @click="regen(r)">
                <svg v-if="generating !== r.id" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>
                <span v-else class="vs-spin small" />
                再次生成
              </button>
              <button type="button" class="vs-act danger" @click="deleteTarget = r">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                删除
              </button>
            </div>
          </div>
          </template>
        </div>
      </div>
      <div v-else class="vs-empty">
        <div class="vs-empty-art"><VsEmptyArt /></div>
        <div class="vs-empty-t">暂无创作记录</div>
      </div>
    </template>

    <!-- 语料库：左栏四类卡组 + 右栏提示词卡（开关/编辑/删除/使用），对标知识库场景配置 -->
    <template v-else-if="view === 'library'">
      <div class="vs-lib2">
        <div class="vs-lib2-side">
          <div class="vs-lib2-sidetop">
            <input v-model="libKw" class="vs-lib2-search" placeholder="搜索提示词文案" />
            <button type="button" class="vs-lib2-plus" title="新增语料" @click="openPromptForm(null)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
          <div v-for="g in libGroups" :key="g.key" class="vs-lib2-grp" :class="libGroup === g.key ? 'on' : ''" @click="libGroup = g.key">
            <span class="vs-lib2-grp-head">
              <span class="vs-lib2-grp-t">{{ g.title }}</span>
              <span class="vs-lib2-grp-n">{{ g.count }} 条语料</span>
              <MoreActions
                dot
                :items="[
                  { label: '编辑', onClick: () => openTypeForm(g) },
                  { label: '删除', danger: true, onClick: () => (typeDel = g) },
                ]"
              />
            </span>
            <span class="vs-lib2-grp-d">{{ g.desc || '暂无描述' }}</span>
          </div>
        </div>
        <span class="vs-lib2-divider" aria-hidden="true" />
        <div class="vs-lib2-main">
          <div class="vs-lib2-head">
            <span class="vs-lib2-t">{{ curGroup.title }}</span>
            <span class="vs-lib2-meta">共 {{ curGroup.count }} 条语料</span>
            <button type="button" class="vs-lib-add" @click="openPromptForm(null)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              新增语料
            </button>
          </div>
          <div class="vs-lib2-stages">
            <button v-for="s in LIB_STATUS" :key="s" type="button" class="vs-lib2-stage" :class="libStatus === s ? 'on' : ''" @click="libStatus = s">{{ s }}</button>
          </div>
          <div v-if="libRows.length" class="vs-lib2-list">
            <div v-for="p in libRows" :key="p.id" class="vs-lib2-card" :class="p.on === false ? 'off' : ''">
              <div class="vs-lib2-card-head">
                <span class="vs-lib2-card-t">{{ p.name }}</span>
                <span class="vs-lib2-card-ops">
                  <button type="button" class="vs-lib2-switch" :class="p.on === false ? '' : 'on'" :title="p.on === false ? '启用' : '停用'" @click="togglePromptOn(p)"><i /></button>
                  <button type="button" class="vs-lib2-link" @click="openPromptForm(p)">编辑</button>
                  <button type="button" class="vs-lib2-link danger" @click="promptDel = p">删除</button>
                </span>
              </div>
              <div class="vs-lib2-card-body">
                <span class="vs-lib2-card-label">提示语</span>
                <div class="vs-lib2-card-text">{{ p.text }}</div>
              </div>
              <div class="vs-lib2-card-foot">
                <span class="vs-lib2-card-meta">{{ p.creator ? `${p.creator} · ` : '' }}创建于 {{ timeLabel(p.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="vs-empty">
            <div class="vs-empty-art"><VsEmptyArt /></div>
            <div class="vs-empty-t">{{ libKw ? '无匹配语料' : '该分类下暂无语料' }}</div>
          </div>
        </div>
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
      <button type="button" class="vs-pill-go" :class="generating === 'main' ? 'busy' : ''" title="生成" :disabled="generating === 'main' || !canSend" @click.stop="generate">
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
        <div class="vs-barleft">
          <span class="vs-seg">
            <button type="button" class="vs-seg-btn" :class="outKind === '视频' ? 'on' : ''" @click="outKind = '视频'">视频</button>
            <button type="button" class="vs-seg-btn" :class="outKind === '生图' ? 'on' : ''" @click="outKind = '生图'">生图</button>
          </span>
          <div class="vs-prefwrap">
            <button type="button" class="vs-pref" :class="prefOpen ? 'open' : ''" @click="togglePref">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2.2" /><circle cx="10" cy="17" r="2.2" /></svg>
              生成偏好
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-if="prefOpen" class="vs-pop pref-pop" :class="isImg ? 'img' : ''" @click.stop>
              <template v-if="!isImg || ratioEditable">
                <div class="vs-pop-t">选择比例</div>
                <div class="vs-ratiogrid" :class="isImg ? 'nine' : ''">
                  <button v-for="r in (isImg ? IMG_RATIOS : RATIOS)" :key="r" type="button" class="vs-ratio-cell" :class="ratio === r ? 'on' : ''" @click="pickRatio(r)">
                    <span class="vs-rframeslot"><span class="vs-rframe" :class="ratioCls(r)" /></span>
                    {{ r }}
                  </button>
                </div>
              </template>
              <template v-if="isImg">
                <div class="vs-pop-t gap">选择分辨率</div>
                <div class="vs-resrow">
                  <button v-for="res in RESOLUTIONS" :key="res" type="button" class="vs-res-cell" :class="resolution === res ? 'on' : ''" @click="pickRes(res)">
                    {{ res }}
                    <svg v-if="res !== '标清 1.5K'" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="vs-res-spark" aria-hidden="true"><path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z" /></svg>
                  </button>
                </div>
                <template v-if="tab === '生成'">
                  <div class="vs-pop-t gap">选择生成数量</div>
                  <div class="vs-countrow">
                    <button v-for="n in 4" :key="n" type="button" class="vs-count-cell" :class="!customOn && imgCount === n ? 'on' : ''" @click="imgCount = n; customCount = ''">{{ n }}</button>
                    <span class="vs-count-cell custom" :class="customOn ? 'on' : ''">
                      <input v-model="customCount" maxlength="1" inputmode="numeric" placeholder="自定义" @input="onCustomCount" />
                    </span>
                  </div>
                </template>
                <template v-if="ratioEditable">
                  <div class="vs-pop-t gap">尺寸</div>
                  <div class="vs-sizerow">
                    <span class="vs-sizefield"><i>W</i><input :value="sizeW" inputmode="numeric" @input="onSizeW" /></span>
                    <button type="button" class="vs-sizelink" :class="sizeLink ? 'on' : ''" :title="sizeLink ? '取消比例联动' : '按比例联动'" @click="sizeLink = !sizeLink">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>
                    </button>
                    <span class="vs-sizefield"><i>H</i><input :value="sizeH" inputmode="numeric" @input="onSizeH" /></span>
                    <span class="vs-sizeunit">PX</span>
                  </div>
                </template>
              </template>
              <template v-else>
                <div class="vs-pop-t gap">其他设置</div>
                <div class="vs-prefrow">
                  <BubbleSelect class-name="vs-sel" :value="duration" :options="DURATIONS" @change="(v: string) => (duration = v)" />
                  <BubbleSelect class-name="vs-sel" :value="fps" :options="FPS" @change="(v: string) => (fps = v)" />
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="vs-barright">
          <BubbleSelect class-name="vs-sel vs-model" :value="model" :options="modelChoices" @change="(v: string) => pickModel(v)" />
          <div class="vs-libwrap">
            <button type="button" class="vs-pref" :class="libPopOpen ? 'open' : ''" @click="toggleLib">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
              语料库
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            <div v-if="libPopOpen" class="vs-pop lib-pop" @click.stop>
              <div class="vs-libpop-list">
                <button v-for="p in pickPrompts" :key="p.id" type="button" class="vs-libpop-item" :title="p.text" @click="usePrompt(p)">{{ p.name }}</button>
                <div v-if="!pickPrompts.length" class="vs-pick-empty">当前分类暂无语料</div>
              </div>
              <button type="button" class="vs-libpop-manage" @click="view = 'library'; libPopOpen = false">管理语料库</button>
            </div>
          </div>
          <button type="button" class="vs-go" :class="generating === 'main' ? 'busy' : ''" title="生成" :disabled="generating === 'main' || !canSend" @click="generate">
            <svg v-if="generating !== 'main'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
            <span v-else class="vs-spin" />
          </button>
        </div>
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

    <!-- 最近创作：一排四卡，点击定位到创作中心对应记录 -->
    <div v-if="view === 'create' && records.length" class="vs-recent">
      <div class="vs-recent-t">最近创作</div>
      <div class="vs-recent-row">
        <button v-for="r in records.slice(0, 4)" :key="r.id" type="button" class="vs-recent-card" :title="recTitle(r)" @click="gotoRecord(r.id)">
          <img v-if="recCover(r)" :src="recCover(r)!" :alt="recTitle(r)" />
          <span v-else class="vs-recent-ph" />
          <span class="vs-recent-txt">
            <span class="vs-recent-name">{{ recTitle(r) }}</span>
            <span class="vs-recent-sub">{{ r.mode }}｜{{ r.kind === '图片' && r.count ? `${r.count}张` : r.duration }}｜{{ r.ratio || r.resolution }}｜{{ dayLabel(r.createdAt) }}</span>
          </span>
        </button>
      </div>
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

    <div v-if="promptForm" class="pm-page pm-host">
      <Modal :title="promptForm.id ? '编辑语料' : '新增语料'" @close="promptForm = null">
        <div class="vs-pform">
          <div class="vs-pform-row col">
            <span class="vs-pform-l">语料名称</span>
            <input v-model="promptForm.name" class="vs-pform-i" placeholder="输入名称，例如：礼盒开箱演示" />
          </div>
          <div class="vs-pform-row col">
            <span class="vs-pform-l">提示词文案</span>
            <textarea v-model="promptForm.text" class="vs-pform-t" rows="4" placeholder="输入提示词，例如：突出卖点、干净背景" />
          </div>
        </div>
        <template #foot>
          <button type="button" class="sg-btn" @click="promptForm = null">取消</button>
          <button type="button" class="sg-btn primary" :disabled="!promptForm.text.trim()" @click="savePromptForm">保存</button>
        </template>
      </Modal>
    </div>

    <!-- 编辑类型：仅标题+描述 -->
    <div v-if="typeForm" class="pm-page pm-host">
      <Modal title="编辑类型" @close="typeForm = null">
        <div class="vs-pform">
          <div class="vs-pform-row col">
            <span class="vs-pform-l">类型标题</span>
            <input v-model="typeForm.title" class="vs-pform-i" placeholder="输入类型标题，例如：图片生成" />
          </div>
          <div class="vs-pform-row col">
            <span class="vs-pform-l">类型描述</span>
            <textarea v-model="typeForm.desc" class="vs-pform-t" rows="3" placeholder="输入类型描述，例如：按提示词生成商品图片" />
          </div>
        </div>
        <template #foot>
          <button type="button" class="sg-btn" @click="typeForm = null">取消</button>
          <button type="button" class="sg-btn primary" :disabled="!typeForm.title.trim()" @click="saveTypeForm">保存</button>
        </template>
      </Modal>
    </div>

    <div v-if="promptDel" class="pm-page pm-host">
      <Modal title="删除语料" sub="删除后创作时将无法再选用该提示词" @close="promptDel = null">
        <div class="vs-delbody">确认删除语料「{{ promptDel.text }}」？</div>
        <template #foot>
          <button type="button" class="sg-btn" @click="promptDel = null">取消</button>
          <button type="button" class="sg-btn primary" @click="confirmPromptDel">删除</button>
        </template>
      </Modal>
    </div>

    <div v-if="typeDel" class="pm-page pm-host">
      <Modal title="删除类型" :sub="typeDelCount ? `该类型下 ${typeDelCount} 条语料将一并删除` : '该类型下暂无语料'" @close="typeDel = null">
        <div class="vs-delbody">确认删除语料类型「{{ typeDel.title }}」？</div>
        <template #foot>
          <button type="button" class="sg-btn" @click="typeDel = null">取消</button>
          <button type="button" class="sg-btn primary" @click="confirmTypeDel">删除</button>
        </template>
      </Modal>
    </div>
  </div>
</template>
