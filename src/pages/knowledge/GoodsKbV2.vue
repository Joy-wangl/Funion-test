<script setup lang="ts">
/* 商品知识库 V2：完整复刻「商品知识库」（系列列表 / 关联ID 二级页 / 详情抽屉 / 各弹窗 / 素材预览），
   并在商品知识条目与素材上增加 QA 式匹配两件套：问法（多条）/ 关键词；数据源独立（goodsKbV2Data），与旧模块互不影响 */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import CascadeSelect from '../../components/CascadeSelect.vue';
import { pushToast } from '../../components/toast';
import KbCatSelect from './KbCatSelect.vue';
import PlatLogo from '../quality/PlatLogo.vue';
import type { Platform } from '../quality/data';
import { KB_GUIDE_TYPES, KB_IMAGE_TYPES, KB_ITEM_STATUS_META, KB_KNOWLEDGE_TYPES, KB_SCENE_GROUPS, KB_VIDEO_TYPES, type KbMaterial } from './data';
import { kbV2Products, type KbV2Code, type KbV2Item, type KbV2Knowledge, type KbV2Product, type KbV2Sku } from './goodsKbV2Data';
import './Knowledge.css';
import './KbForm.css';
import './GoodsKbV2.css';

/* 页内视图：系列列表 / 关联ID（关联ID 为系列行钻取的二级列表页，非导航入口） */
type V2View = 'base' | 'ids';
const v2View = ref<V2View>('base');

/* ---------- 条件查询模块：全部条件为草稿、「查询」统一生效；类目为三级级联多选 ---------- */
const keyword = ref('');
const shopKw = ref('');
const itemKw = ref('');
const codeKw = ref('');
const platSel = ref('');
const costMin = ref('');
const costMax = ref('');
const catSel = ref<string[][]>([]);
interface KbQuery { kw: string; shop: string; item: string; code: string; plat: string; cost: { min: number | null; max: number | null }; cats: string[][] }
const applied = ref<KbQuery>({ kw: '', shop: '', item: '', code: '', plat: '', cost: { min: null, max: null }, cats: [] });
const search = () => {
  /* 成本价区间：非法数字拦截；最低>最高拦截 */
  const pm = costMin.value.trim() === '' ? null : Number(costMin.value);
  const px = costMax.value.trim() === '' ? null : Number(costMax.value);
  if ((pm !== null && Number.isNaN(pm)) || (px !== null && Number.isNaN(px))) { pushToast('成本价请输入数字', 'warning'); return; }
  if (pm !== null && px !== null && pm > px) { pushToast('成本价最低价不能高于最高价', 'warning'); return; }
  applied.value = {
    kw: keyword.value.trim(),
    shop: shopKw.value.trim(),
    item: itemKw.value.trim(),
    code: codeKw.value.trim(),
    plat: platSel.value,
    cost: { min: pm, max: px },
    cats: catSel.value.map((p) => [...p]),
  };
};
const resetFilter = () => {
  keyword.value = '';
  shopKw.value = '';
  itemKw.value = '';
  codeKw.value = '';
  platSel.value = '';
  costMin.value = '';
  costMax.value = '';
  catSel.value = [];
  applied.value = { kw: '', shop: '', item: '', code: '', plat: '', cost: { min: null, max: null }, cats: [] };
};
/* 条件区收起/展开（默认展开）：收起后仅保留已生效条件摘要 + 展开入口 */
const queryCollapsed = ref(false);
const appliedSummary = computed(() => {
  const a = applied.value;
  const parts: string[] = [];
  if (a.cats.length) parts.push(`类目：${a.cats[0].join('/')}${a.cats.length > 1 ? ` 等 ${a.cats.length} 项` : ''}`);
  if (a.kw) parts.push(`系列名称/编码：${a.kw}`);
  if (a.plat) parts.push(`上架平台：${a.plat}`);
  if (a.shop) parts.push(`店铺名称：${a.shop}`);
  if (a.item) parts.push(`商品ID：${a.item}`);
  if (a.code) parts.push(`编码ID：${a.code}`);
  if (a.cost.min !== null || a.cost.max !== null) parts.push(`成本价：${a.cost.min ?? '不限'}-${a.cost.max ?? '不限'}元`);
  return parts.length ? parts.join('；') : '无筛选条件';
});
/* 类目全路径集合（去重，供级联下拉三列展示） */
const catPaths = computed(() => {
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const p of kbV2Products) {
    const k = p.cat.join('/');
    if (!seen.has(k)) { seen.add(k); out.push([...p.cat]); }
  }
  return out;
});
/* 上架平台选项：系列下店铺商品去重平台 + 「全部」 */
const platOptions = computed(() => ['全部', ...new Set(kbV2Products.flatMap((p) => p.items.map((it) => it.platform)))]);
/* 成本价（系列维度）：取系列下各编码基础信息成本价区间，与编码同源；单值不展区间 */
const codeCost = (c: KbV2Code) => parseFloat((c.base.find((b) => b.label === '成本价')?.value ?? '').replace('元', '')) || 0;
const costRangeOf = (p: KbV2Product): [number, number] => {
  const xs = p.codes.map(codeCost);
  return [Math.min(...xs), Math.max(...xs)];
};
const costText = (p: KbV2Product) => {
  const [mn, mx] = costRangeOf(p);
  return mn === mx ? `${mn.toFixed(2)}元` : `${mn.toFixed(2)}～${mx.toFixed(2)}元`;
};
const products = computed(() => kbV2Products.filter((p) => {
  const a = applied.value;
  /* 类目多选：任一已选路径为商品类目路径前缀即命中（选一级覆盖其下全部） */
  if (a.cats.length && !a.cats.some((path) => path.every((c, i) => p.cat[i] === c))) return false;
  if (a.kw && !(p.name.includes(a.kw) || p.codes.some((c) => c.code.includes(a.kw.toUpperCase())))) return false;
  if (a.plat && !p.items.some((it) => it.platform === a.plat)) return false;
  if (a.shop && !p.items.some((it) => it.shop.includes(a.shop) || it.platform.includes(a.shop))) return false;
  if (a.item && !p.items.some((it) => it.id.includes(a.item))) return false;
  if (a.code && !p.codes.some((c) => c.code.includes(a.code.toUpperCase()))) return false;
  /* 成本价区间：与系列成本区间有交集即命中（单边不限） */
  const [cmn, cmx] = costRangeOf(p);
  if (a.cost.min !== null && cmx < a.cost.min) return false;
  if (a.cost.max !== null && cmn > a.cost.max) return false;
  return true;
}));

/* ---------- 关联ID 二级列表页：各平台 ID 维度（字段承原展开子列表）；唯一入口 = 系列行钻入（预填并生效系列条件，页头返回钮回上级） ---------- */
interface IdsQuery { series: string; item: string; name: string; plat: string; shop: string; status: string; code: string }
const emptyIds = (): IdsQuery => ({ series: '', item: '', name: '', plat: '', shop: '', status: '全部', code: '' });
const idsDraft = ref<IdsQuery>(emptyIds());
const idsApplied = ref<IdsQuery>(emptyIds());
const idsSearch = () => { idsApplied.value = { ...idsDraft.value }; };
const idsReset = () => { idsDraft.value = emptyIds(); idsApplied.value = emptyIds(); };
/* 入口：系列行「关联ID」预填系列条件并生效，以二级页进入 */
const openIdsView = (seriesId: string) => {
  const p = kbV2Products.find((x) => x.id === seriesId);
  idsDraft.value = { ...emptyIds(), series: p?.name ?? '' };
  idsApplied.value = { ...idsDraft.value };
  v2View.value = 'ids';
};
/* 二级页返回：回系列列表（两级条件态各自独立保留） */
const backToBase = () => { v2View.value = 'base'; };
/* 商品状态筛选选项：按 label（与状态圆点口径一致） */
const idsStatusOptions = ['全部', ...Object.values(KB_ITEM_STATUS_META).map((m) => m.label)];
/* 列表行：系列 × ID 展平，按已生效条件过滤 */
const idRows = computed(() => {
  const a = idsApplied.value;
  const out: { p: KbV2Product; it: KbV2Item }[] = [];
  for (const p of kbV2Products) {
    if (a.series && !(p.name.includes(a.series) || p.codes.some((c) => c.code.includes(a.series.toUpperCase())))) continue;
    for (const it of p.items) {
      if (a.item && !it.id.includes(a.item)) continue;
      if (a.name && !it.name.includes(a.name)) continue;
      if (a.plat && it.platform !== a.plat) continue;
      if (a.shop && !it.shop.includes(a.shop)) continue;
      if (a.status !== '全部' && KB_ITEM_STATUS_META[it.status].label !== a.status) continue;
      if (a.code && !it.codes.some((c) => c.code.includes(a.code.toUpperCase()))) continue;
      out.push({ p, it });
    }
  }
  return out;
});
/* 上架平台列 chip 复用品控 PlatLogo（platform prop 为联合类型） */
const itemPlatforms = (p: KbV2Product) => [...new Set(p.items.map((it) => it.platform))];
const platList = (p: KbV2Product) => itemPlatforms(p) as Platform[];

/* ---------- 详情抽屉：系列编码 / 店铺商品 ID 双维度（同页结构），编码切换 ---------- */
type KbDetail = { kind: 'series'; p: KbV2Product } | { kind: 'item'; item: KbV2Item; series: KbV2Product };
const detail = ref<KbDetail | null>(null);
const activeCode = ref('');
/* ID 维度选中态按「SKU + 编码」收敛（同一编码挂多个 SKU 时不高亮兄弟块） */
const activeSku = ref('');
const openDetail = (p: KbV2Product) => {
  detail.value = { kind: 'series', p };
  activeCode.value = p.codes[0]?.code ?? '';
};
const openItemDetail = (series: KbV2Product, item: KbV2Item) => {
  detail.value = { kind: 'item', item, series };
  activeSku.value = item.skus[0]?.id ?? '';
  activeCode.value = item.skus[0]?.codes[0]?.code ?? item.codes[0]?.code ?? '';
};
const closeDetail = () => { detail.value = null; };
/* 当前维度编码列表：系列 = 系列下全部编码；ID = 该 ID 内编码（与系列同源实体） */
const detailCodes = computed<KbV2Code[]>(() => {
  const d = detail.value;
  if (!d) return [];
  return d.kind === 'series' ? d.p.codes : d.item.codes;
});
const currentCode = computed(() => detailCodes.value.find((c) => c.code === activeCode.value));
/* ID 维度 SKU 分组：ID → SKU 页签 → 当前 SKU 下关联商品编码（系列维度仍平铺编码卡） */
const detailSkus = computed<KbV2Sku[]>(() => (detail.value?.kind === 'item' ? detail.value.item.skus : []));
const activeSkuCodes = computed<KbV2Code[]>(() => detailSkus.value.find((s) => s.id === activeSku.value)?.codes ?? []);
const selectSku = (s: KbV2Sku) => {
  activeSku.value = s.id;
  activeCode.value = s.codes[0]?.code ?? '';
};
/* 抽屉头部数据源：按维度取系列元信息 / 商品元信息 */
const detailHead = computed(() => {
  const d = detail.value;
  if (!d) return { img: '', name: '', price: '' };
  return d.kind === 'series'
    ? { img: d.p.img, name: d.p.name, price: d.p.price }
    : { img: d.item.img, name: d.item.name, price: d.item.price };
});
const onEsc = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (document.fullscreenElement) { void document.exitFullscreen(); return; }
  if (confirmBox.value) confirmBox.value = null;
  else if (previewOpen.value) closePreview();
  else if (createOpen.value) createOpen.value = false;
  else if (mediaModal.value) mediaModal.value = null;
  else if (baseEditOpen.value) baseEditOpen.value = false;
  else if (detail.value) closeDetail();
};
onMounted(() => {
  window.addEventListener('keydown', onEsc);
  document.addEventListener('fullscreenchange', syncFull);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onEsc);
  document.removeEventListener('fullscreenchange', syncFull);
});

/* 演示环境：视频/外链不真实打开 */
const playVideo = () => pushToast('演示环境：暂不支持视频播放', 'warning');
const openLink = () => pushToast('演示环境：外链不真实打开', 'warning');

/* ---------- 素材查看：上方气泡「查看」开全屏暗幕查看器（规范同商品创建详情预览）；右侧编码维度图片切换 ---------- */
interface KbPreviewItem { kind: 'image' | 'video'; src: string; label: string; q: string }
const previewList = computed<KbPreviewItem[]>(() => {
  const c = currentCode.value;
  if (!c) return [];
  return [
    ...c.images.map((m) => ({ kind: 'image' as const, src: m.src, label: m.label, q: m.questions[0] ?? '' })),
    ...c.videos.map((m) => ({ kind: 'video' as const, src: m.src, label: m.label, q: m.questions[0] ?? '' })),
    ...c.guides.map((m) => ({ kind: 'video' as const, src: m.src, label: m.label, q: m.questions[0] ?? '' })),
  ];
});
const previewIdx = ref(-1);
const previewOpen = computed(() => previewIdx.value >= 0 && previewIdx.value < previewList.value.length);
const curPreview = computed(() => previewList.value[previewIdx.value]);
/* 工具条缩放：0.5–3 倍，切图/开闭时复位 */
const zoom = ref(1);
const zoomBy = (d: number) => { zoom.value = Math.min(3, Math.max(0.5, Math.round((zoom.value + d) * 100) / 100)); };
const openPreview = (kind: 'image' | 'video' | 'guide', i: number) => {
  const c = currentCode.value;
  const imgs = c?.images.length ?? 0;
  const vids = c?.videos.length ?? 0;
  previewIdx.value = kind === 'image' ? i : kind === 'video' ? imgs + i : imgs + vids + i;
  zoom.value = 1;
};
const closePreview = () => { previewIdx.value = -1; zoom.value = 1; };
const stepPreview = (d: number) => {
  const n = previewList.value.length;
  if (!n) return;
  previewIdx.value = (previewIdx.value + d + n) % n;
  zoom.value = 1;
};
const pickPreview = (i: number) => { previewIdx.value = i; zoom.value = 1; };
/* 预览全屏切换（工具条末位图标） */
const previewMaskRef = ref<HTMLDivElement | null>(null);
const isFull = ref(false);
const syncFull = () => { isFull.value = !!document.fullscreenElement; };
const toggleFull = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void previewMaskRef.value?.requestFullscreen();
};

/* ---------- 内部数据维护：基础信息编辑、图片/视频增删改闭环 ---------- */
const baseEditOpen = ref(false);
const baseDraft = ref<{ label: string; value: string }[]>([]);
/* 字段行拖动排序：dragover 目标行时实时换位 */
const dragIdx = ref<number | null>(null);
const onRowDragOver = (i: number) => {
  const from = dragIdx.value;
  if (from === null || from === i) return;
  const arr = baseDraft.value;
  const [m] = arr.splice(from, 1);
  arr.splice(i, 0, m);
  dragIdx.value = i;
};
const openBaseEdit = () => {
  baseDraft.value = (currentCode.value?.base ?? []).map((b) => ({ ...b }));
  baseEditOpen.value = true;
};
const saveBase = () => {
  if (!currentCode.value) return;
  currentCode.value.base = baseDraft.value
    .map((r) => ({ label: r.label.trim(), value: r.value.trim() }))
    .filter((r) => r.label || r.value);
  baseEditOpen.value = false;
  pushToast('基础信息已更新');
};
/* ---------- 重点操作二次确认（删除等不可逆操作统一走确认弹窗） ---------- */
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const doConfirm = () => { confirmBox.value?.onOk(); confirmBox.value = null; };

/* ---------- 图片/视频/安装使用视频新增/编辑弹窗：与新建商品知识同构（类型/命中场景/问法/关键词），仅上传限定对应类型文件 ---------- */
type MediaKind = 'image' | 'video' | 'guide';
const mediaModal = ref<{ kind: MediaKind; index: number | null } | null>(null);
const mediaType = ref('');
/* 弹窗内文案与选项随素材组切换：图片 / 视频 / 安装使用视频 */
const mediaKindName = computed(() => (mediaModal.value?.kind === 'image' ? '图片' : mediaModal.value?.kind === 'video' ? '视频' : '安装/使用视频'));
/* 问法（多条，必填至少一条）与命中场景（选填多选）；问法空值行内报错 */
const qErr = ref(false);
/* 命中场景树模型（场景类型→细分场景→子组，枚举见 data.ts KB_SCENE_GROUPS）：会话级分组状态；自建场景并入所建组行尾，不单设自定义组 */
const sceneGroups = ref(KB_SCENE_GROUPS.map((g) => ({ group: g.group, scenes: [...g.scenes] })));
const sceneCascGroups = computed(() => sceneGroups.value.map((g) => ({ name: g.group, children: g.scenes })));
/* 级联下拉多选场景选择工厂（素材与知识两弹窗共用）：值只存细分场景 */
const makeSceneSel = () => {
  const selected = ref<string[]>([]);
  return { selected };
};
const { selected: mediaScenes } = makeSceneSel();
const { selected: knScenes } = makeSceneSel();
/* 类型枚举：下拉内支持新建类型，新建后并入当前会话选项列表 */
const imageTypes = ref<string[]>([...KB_IMAGE_TYPES]);
const videoTypes = ref<string[]>([...KB_VIDEO_TYPES]);
const guideTypes = ref<string[]>([...KB_GUIDE_TYPES]);
const typeListOf = (kind: MediaKind) => (kind === 'image' ? imageTypes : kind === 'video' ? videoTypes : guideTypes);
const mediaTypeOptions = computed(() => typeListOf(mediaModal.value?.kind ?? 'image').value);
const onMediaTypeChange = (v: string) => {
  const list = typeListOf(mediaModal.value?.kind ?? 'image');
  if (v && !list.value.includes(v)) {
    list.value = [...list.value, v];
    pushToast(`已新建类型「${v}」`);
  }
  mediaType.value = v;
};
/* 修改已有类型：枚举列表换名 + 全量素材 label 同步（避免存量素材持旧名成孤儿），重名拦截 */
const onTypeRename = (oldV: string, newV: string) => {
  const list = typeListOf(mediaModal.value?.kind ?? 'image');
  if (list.value.includes(newV)) { pushToast(`类型「${newV}」已存在`, 'warning'); return; }
  list.value = list.value.map((t) => (t === oldV ? newV : t));
  for (const p of kbV2Products) {
    for (const c of p.codes) {
      for (const m of [...c.images, ...c.videos, ...c.guides]) if (m.label === oldV) m.label = newV;
    }
  }
  if (mediaType.value === oldV) mediaType.value = newV;
  pushToast(`类型「${oldV}」已改为「${newV}」`);
};
const openMediaModal = (kind: MediaKind, index: number | null = null) => {
  const c = currentCode.value;
  const m = index !== null ? (kind === 'image' ? c?.images[index] : kind === 'video' ? c?.videos[index] : c?.guides[index]) : undefined;
  mediaType.value = m?.label ?? '';
  /* 编辑态回显场景；新增态空 */
  mediaScenes.value = m ? [...m.scenes] : [];
  /* V2：素材持问法（多条）/关键词两个命中维度，编辑态回显、新增态空 */
  loadMediaMatch(m?.questions ?? [], m?.keywords ?? []);
  qErr.value = false;
  /* 编辑态预填当前素材（文件名优先取上传时记录名，种子素材取 src 末段）；新增态空上传位 */
  mediaFile.value = m ? { name: m.name ?? m.src.split('/').pop() ?? '当前素材', url: m.src } : null;
  mediaModal.value = { kind, index };
};
/* 上传入口：选择本地文件后 objectURL 预览（演示环境不真实上传） */
const mediaFile = ref<{ name: string; url: string } | null>(null);
const fileRef = ref<HTMLInputElement | null>(null);
const onFilePicked = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const f = input.files?.[0];
  input.value = '';
  if (!f) return;
  mediaFile.value = { name: f.name, url: URL.createObjectURL(f) };
};
const submitMedia = () => {
  const c = currentCode.value;
  if (!c || !mediaModal.value) return;
  const { kind, index } = mediaModal.value;
  const kindName = mediaKindName.value;
  if (!mediaType.value) { pushToast(`请选择${kindName}类型`, 'warning'); return; }
  /* 问法必填至少一条：空值行内报错（全局表单规范），不弹 toast；校验序随字段序（类型→问法→文件） */
  if (!mQTags.state.tags.length) { qErr.value = true; return; }
  if (!mediaFile.value) { pushToast(`请上传${kindName}文件`, 'warning'); return; }
  const pool = kind === 'image' ? c.images : kind === 'video' ? c.videos : c.guides;
  if (index === null) {
    pool.push({
      label: mediaType.value, src: mediaFile.value.url, name: mediaFile.value.name,
      scenes: [...mediaScenes.value], questions: [...mQTags.state.tags], keywords: [...mKwTags.state.tags],
    });
    pushToast(`${kindName}「${mediaType.value}」已新增`);
  } else {
    const mm = pool[index];
    if (mm) {
      mm.label = mediaType.value; mm.src = mediaFile.value.url; mm.name = mediaFile.value.name;
      mm.scenes = [...mediaScenes.value]; mm.questions = [...mQTags.state.tags]; mm.keywords = [...mKwTags.state.tags];
    }
    pushToast(`${kindName}「${mediaType.value}」已更新`);
  }
  mediaModal.value = null;
};
const removeImage = (i: number) => {
  const m = currentCode.value?.images[i];
  if (!m) return;
  askConfirm('删除图片', `删除图片「${m.label}」？删除后不可恢复`, () => {
    currentCode.value?.images.splice(i, 1);
    pushToast('图片已删除');
  });
};
const removeVideo = (i: number) => {
  const m = currentCode.value?.videos[i];
  if (!m) return;
  askConfirm('删除视频', `删除视频「${m.label}」？删除后不可恢复`, () => {
    currentCode.value?.videos.splice(i, 1);
    pushToast('视频已删除');
  });
};
const removeGuide = (i: number) => {
  const m = currentCode.value?.guides[i];
  if (!m) return;
  askConfirm('删除安装/使用视频', `删除安装/使用视频「${m.label}」？删除后不可恢复`, () => {
    currentCode.value?.guides.splice(i, 1);
    pushToast('安装/使用视频已删除');
  });
};

/* ---------- 标签编辑器工厂（问法/关键词共用，复刻 QA 管理同款交互）：回车或逗号添加、✕移除、空值退格删末项、自动去重去空 ---------- */
const makeTags = () => {
  /* state 用 reactive：模板直取 qTags.state.tags（嵌套 ref 在模板不自动解包） */
  const state = reactive({ tags: [] as string[], draft: '' });
  const add = () => {
    const v = state.draft.trim().replace(/[,，]+$/, '');
    if (v && !state.tags.includes(v)) state.tags.push(v);
    state.draft = '';
  };
  const remove = (t: string) => { state.tags = state.tags.filter((x) => x !== t); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !state.draft && state.tags.length) { state.tags.pop(); }
  };
  const set = (list: string[]) => { state.tags = [...list]; state.draft = ''; };
  const rename = (old: string, v: string) => {
    if (!v || v === old || state.tags.includes(v)) return;
    state.tags = state.tags.map((x) => (x === old ? v : x));
  };
  return { state, add, remove, onKey, set, rename };
};
/* 问法匹配编辑器套件工厂：知识弹窗与素材弹窗各持一份实例（问法 + 关键词两套交互） */
const makeMatchEditors = () => {
  const qTags = makeTags();
  const kwTags = makeTags();
  /* 问法：新增输入默认隐藏，点「新增」后展示并聚焦（回车落入并收起、Shift+回车换行）；已有问法铅笔 icon 行内编辑 */
  const qAdding = ref(false);
  const qAddRef = ref<HTMLTextAreaElement | null>(null);
  const startQAdd = () => { qAdding.value = true; nextTick(() => qAddRef.value?.focus()); };
  const endQAdd = (commit: boolean) => {
    if (commit) qTags.add();
    qTags.state.draft = '';
    qAdding.value = false;
  };
  const qEditKey = ref('');
  const qEditDraft = ref('');
  const qEditRef = ref<HTMLTextAreaElement | null>(null);
  const startQEdit = (t: string) => { qEditKey.value = t; qEditDraft.value = t; nextTick(() => qEditRef.value?.focus()); };
  const endQEdit = (commit: boolean) => {
    const old = qEditKey.value;
    if (!old) return;
    qEditKey.value = '';
    if (commit) qTags.rename(old, qEditDraft.value.trim());
  };
  /* 关键词：场景标签式（灰标签+✕移除），＋虚线标签内联输入新增 */
  const kwCreating = ref(false);
  const kwInputRef = ref<HTMLInputElement | null>(null);
  const startKwCreate = () => { kwCreating.value = true; kwTags.state.draft = ''; nextTick(() => kwInputRef.value?.focus()); };
  /* 收拢内联输入：有草稿先落入标签再关闭（点击空白不丢输入） */
  const endKwCreate = () => { if (kwTags.state.draft.trim()) kwTags.add(); kwCreating.value = false; };
  /* 打开弹窗：回显存量 + 复位交互态 */
  const load = (questions: string[], keywords: string[]) => {
    qTags.set(questions);
    kwTags.set(keywords);
    qAdding.value = false;
    qEditKey.value = '';
    kwCreating.value = false;
  };
  return {
    qTags, kwTags, qAdding, qAddRef, startQAdd, endQAdd,
    qEditKey, qEditDraft, qEditRef, startQEdit, endQEdit,
    kwCreating, kwInputRef, startKwCreate, endKwCreate, load,
  };
};
/* 知识弹窗实例：沿用原命名（模板已引用） */
const {
  qTags, kwTags, qAdding, qAddRef, startQAdd, endQAdd,
  qEditKey, qEditDraft, qEditRef, startQEdit, endQEdit,
  kwCreating, kwInputRef, startKwCreate, endKwCreate, load: loadKnMatch,
} = makeMatchEditors();
/* 素材弹窗实例：m 前缀命名避免与知识实例冲撞 */
const {
  qTags: mQTags, kwTags: mKwTags, qAdding: mQAdding, qAddRef: mQAddRef,
  startQAdd: startMQAdd, endQAdd: endMQAdd,
  qEditKey: mQEditKey, qEditDraft: mQEditDraft, qEditRef: mQEditRef,
  startQEdit: startMQEdit, endQEdit: endMQEdit,
  kwCreating: mKwCreating, kwInputRef: mKwInputRef,
  startKwCreate: startMKwCreate, endKwCreate: endMKwCreate, load: loadMediaMatch,
} = makeMatchEditors();
/* 问法落入标签后清除行内报错 */
watch(() => mQTags.state.tags.length, () => { qErr.value = false; });

/* ---------- 新建/编辑商品知识：类型 + 问法（多条）/关键词 + 内容（文字/素材/链接），归属当前编码 ---------- */
const createOpen = ref(false);
const createEditId = ref<string | null>(null);
/* 类型枚举响应式化，支持行内改名（与素材类型下拉一致） */
const knTypeOptions = ref([...KB_KNOWLEDGE_TYPES]);
const knType = ref('');
const knText = ref('');
const knMats = ref<KbMaterial[]>([]);
const knLink = ref('');
const openCreate = (entry?: KbV2Knowledge) => {
  createEditId.value = entry?.id ?? null;
  /* 新建时类型默认取当前选中 tab 类型，仍可下拉修改；编辑时预填原类型 */
  knType.value = entry?.type ?? activeKnTab.value ?? '';
  loadKnMatch(entry?.questions ?? [], entry?.keywords ?? []);
  knText.value = entry?.text ?? '';
  knMats.value = [...(entry?.materials ?? [])];
  knLink.value = entry?.link ?? '';
  knScenes.value = entry ? [...entry.scenes] : [];
  createOpen.value = true;
};
/* 知识素材上传：图片/视频/任意文件三态；演示环境 objectURL 预览不真实上传 */
const knFileRef = ref<HTMLInputElement | null>(null);
const onKnFilePicked = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = '';
  for (const f of files) {
    const kind: KbMaterial['kind'] = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file';
    knMats.value.push({ name: f.name, url: URL.createObjectURL(f), kind });
  }
};
const removeKnMat = (i: number) => { knMats.value.splice(i, 1); };
/* 知识类型改名：枚举换名 + 全量知识条目 type 同步 + 弹窗选中值与当前 tab 同步；重名拦截 */
const onKnTypeRename = (oldV: string, newV: string) => {
  if (knTypeOptions.value.includes(newV)) { pushToast(`类型「${newV}」已存在`, 'warning'); return; }
  knTypeOptions.value = knTypeOptions.value.map((t) => (t === oldV ? newV : t));
  for (const p of kbV2Products) for (const c of p.codes) for (const k of c.knowledge) if (k.type === oldV) k.type = newV;
  if (knType.value === oldV) knType.value = newV;
  if (knTab.value === oldV) knTab.value = newV;
  pushToast(`类型「${oldV}」已改为「${newV}」`);
};
const submitCreate = () => {
  const c = currentCode.value;
  if (!c) return;
  if (!knType.value) { pushToast('请选择知识类型', 'warning'); return; }
  if (!knText.value.trim() && !knMats.value.length && !knLink.value.trim()) { pushToast('请填写知识内容（文字、素材或链接）', 'warning'); return; }
  if (createEditId.value) {
    const k = c.knowledge.find((x) => x.id === createEditId.value);
    if (k) {
      k.type = knType.value;
      k.questions = [...qTags.state.tags];
      k.keywords = [...kwTags.state.tags];
      k.text = knText.value.trim();
      k.materials = [...knMats.value];
      k.link = knLink.value.trim();
      k.scenes = [...knScenes.value];
    }
    knTab.value = knType.value;
    createOpen.value = false;
    pushToast(`商品知识「${knType.value}」已更新`);
    return;
  }
  const entry: KbV2Knowledge = {
    id: `KN${Date.now()}`,
    type: knType.value,
    questions: [...qTags.state.tags],
    keywords: [...kwTags.state.tags],
    text: knText.value.trim(),
    materials: [...knMats.value],
    link: knLink.value.trim(),
    scenes: [...knScenes.value],
  };
  c.knowledge.push(entry);
  knTab.value = entry.type;
  createOpen.value = false;
  pushToast(`商品知识「${entry.type}」已新建`);
};
/* 知识条目删除：不可逆操作统一走二次确认 */
const deleteKnowledge = (entry: KbV2Knowledge) => {
  askConfirm('删除商品知识', `删除知识「${entry.type}」？删除后 AI 智能回复将不再引用该条知识`, () => {
    const c = currentCode.value;
    if (!c) return;
    const i = c.knowledge.findIndex((k) => k.id === entry.id);
    if (i > -1) c.knowledge.splice(i, 1);
    pushToast('商品知识已删除');
  });
};
/* ---------- 商品知识类型 tab：无数据的类型不展示 ---------- */
const knTypes = computed(() => {
  const list: string[] = [];
  for (const k of currentCode.value?.knowledge ?? []) if (!list.includes(k.type)) list.push(k.type);
  return list;
});
const knTab = ref('');
const activeKnTab = computed(() => (knTypes.value.includes(knTab.value) ? knTab.value : knTypes.value[0] ?? ''));
const shownKnowledge = computed(() => (currentCode.value?.knowledge ?? []).filter((k) => k.type === activeKnTab.value));
</script>

<template>
  <!-- 系列列表主区（复刻商品知识库列表，标题/面包屑挂 V2 名） -->
  <main v-if="v2View === 'base'" class="kb-main">
    <header class="kb-main-head">
      <div>
        <h2>商品知识库 V2</h2>
        <p class="kb-breadcrumb">知识库<span> / 商品知识库 V2</span></p>
      </div>
    </header>

    <!-- 工作区：条件卡 + 列表卡两张独立白卡（对齐监控列表双卡布局），铺满到底部 -->
    <div class="kb-panel">
      <!-- 条件查询模块：类目（三级级联多选）+ 系列/店铺/商品ID/编码ID，查询统一生效；按钮组末排右对齐；
           支持收起/展开（默认展开）：收起后仅保留条件摘要条 + 展开入口 -->
      <div class="kb-query">
        <template v-if="!queryCollapsed">
          <div class="kb-field">
            <label>类目</label>
            <KbCatSelect :paths="catPaths" :value="catSel" @change="(v: string[][]) => (catSel = v)" />
          </div>
          <div class="kb-field">
            <label>系列名称/编码</label>
            <span class="kb-kwwrap">
              <input v-model="keyword" class="kb-input" placeholder="请输入系列名称/编码" @keyup.enter="search" />
              <!-- 清除钮：框内右侧实心灰圆× 有值才显，点击清空并立即重查（全局查询清除规范） -->
              <button v-if="keyword" type="button" class="kb-clear" title="清除" @click="keyword = ''; search()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="kb-field">
            <label>上架平台</label>
            <BubbleSelect
              class-name="kb-select"
              :options="platOptions"
              :value="platSel || '全部'"
              @change="(v: string) => (platSel = v === '全部' ? '' : v)"
            />
          </div>
          <div class="kb-field">
            <label>店铺名称</label>
            <span class="kb-kwwrap">
              <input v-model="shopKw" class="kb-input" placeholder="请输入店铺名称" @keyup.enter="search" />
              <button v-if="shopKw" type="button" class="kb-clear" title="清除" @click="shopKw = ''; search()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="kb-field">
            <label>商品ID</label>
            <span class="kb-kwwrap">
              <input v-model="itemKw" class="kb-input" placeholder="请输入商品ID" @keyup.enter="search" />
              <button v-if="itemKw" type="button" class="kb-clear" title="清除" @click="itemKw = ''; search()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="kb-field">
            <label>编码ID</label>
            <span class="kb-kwwrap">
              <input v-model="codeKw" class="kb-input" placeholder="请输入编码ID" @keyup.enter="search" />
              <button v-if="codeKw" type="button" class="kb-clear" title="清除" @click="codeKw = ''; search()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="kb-field">
            <label>成本价</label>
            <!-- 区间式：最低-最高，单边不限；两输入各自带清除 -->
            <div class="kb-range">
              <span class="kb-kwwrap">
                <input v-model="costMin" class="kb-input" placeholder="最低价" @keyup.enter="search" />
                <button v-if="costMin" type="button" class="kb-clear" title="清除" @click="costMin = ''; search()">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
                </button>
              </span>
              <span class="kb-range-sep">-</span>
              <span class="kb-kwwrap">
                <input v-model="costMax" class="kb-input" placeholder="最高价" @keyup.enter="search" />
                <button v-if="costMax" type="button" class="kb-clear" title="清除" @click="costMax = ''; search()">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
                </button>
              </span>
            </div>
          </div>
          <div class="kb-query-actions">
            <button class="kb-btn" @click="resetFilter">重置</button>
            <button class="kb-btn primary" @click="search">查询</button>
            <button class="kb-toggle" @click="queryCollapsed = true">
              收起
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
            </button>
          </div>
        </template>
        <div v-else class="kb-query-bar">
          <span class="kb-query-sum">{{ appliedSummary }}</span>
          <button class="kb-toggle" @click="queryCollapsed = false">
            展开
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
      </div>

      <!-- 系列列表：表格形式（系列维度行；店铺商品 ID 维度后续层级展开） -->
      <div class="kb-table-wrap">
        <table class="kb-table">
          <thead>
            <tr>
              <th>系列编码</th>
              <th>类目</th>
              <th>关联ID数</th>
              <th>上架店铺数</th>
              <th>上架平台</th>
              <th>退款率</th>
              <th>成本价</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="p in products" :key="p.id">
              <tr>
                <td>
                  <div class="kb-td-series">
                    <span class="kb-td-item">
                      <b :title="p.name">{{ p.name }}</b>
                      <!-- 副行灰底标签：编码数量（编码数列已改为上架平台） -->
                      <span class="kb-td-tags">
                        <span class="kb-tag">编码数量：{{ p.codes.length }}</span>
                      </span>
                    </span>
                  </div>
                </td>
                <td>{{ p.cat.join(' / ') }}</td>
                <td>{{ p.relIds }}</td>
                <td>{{ p.shops }}</td>
                <!-- 上架平台：系列下店铺商品去重平台，chip 样式对齐运维管理后台/编码列表 -->
                <td>
                  <span class="kb-td-plats">
                    <span v-for="pl in platList(p)" :key="pl" class="kb-plat-chip">
                      <PlatLogo :platform="pl" />
                      {{ pl }}
                    </span>
                  </span>
                </td>
                <td class="kb-td-rate">{{ p.refundRate }}</td>
                <td class="kb-td-price">{{ costText(p) }}</td>
                <td>
                  <span class="kb-td-ops">
                    <a class="kb-link" href="#" @click.prevent="openDetail(p)">详情</a>
                    <a class="kb-link" href="#" @click.prevent="openIdsView(p.id)">关联ID</a>
                  </span>
                </td>
              </tr>
            </template>
            <tr v-if="!products.length">
              <td colspan="8" class="kb-empty">无匹配系列</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- 关联ID：系列行钻入的二级列表页（各平台 ID 维度，字段承原展开子列表；返回钮+三级面包屑） -->
  <main v-else-if="v2View === 'ids'" class="kb-main">
    <header class="kb-main-head">
      <div>
        <h2>
          <button class="kb-back" title="返回商品知识库 V2" @click="backToBase">←</button>
          关联ID
        </h2>
        <p class="kb-breadcrumb">知识库<span> / 商品知识库 V2</span><span> / 关联ID</span></p>
      </div>
    </header>

    <div class="kb-panel">
      <!-- 查询条件：系列/商品ID/名称/平台/店铺/状态/编码，查询统一生效 -->
      <div class="kb-query">
        <div class="kb-field">
          <label>系列名称/编码</label>
          <span class="kb-kwwrap">
            <input v-model="idsDraft.series" class="kb-input" placeholder="请输入系列名称/编码" @keyup.enter="idsSearch" />
            <button v-if="idsDraft.series" type="button" class="kb-clear" title="清除" @click="idsDraft.series = ''; idsSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="kb-field">
          <label>商品ID</label>
          <span class="kb-kwwrap">
            <input v-model="idsDraft.item" class="kb-input" placeholder="请输入商品ID" @keyup.enter="idsSearch" />
            <button v-if="idsDraft.item" type="button" class="kb-clear" title="清除" @click="idsDraft.item = ''; idsSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="kb-field">
          <label>商品名称</label>
          <span class="kb-kwwrap">
            <input v-model="idsDraft.name" class="kb-input" placeholder="请输入商品名称" @keyup.enter="idsSearch" />
            <button v-if="idsDraft.name" type="button" class="kb-clear" title="清除" @click="idsDraft.name = ''; idsSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="kb-field">
          <label>上架平台</label>
          <BubbleSelect
            class-name="kb-select"
            :options="platOptions"
            :value="idsDraft.plat || '全部'"
            @change="(v: string) => (idsDraft.plat = v === '全部' ? '' : v)"
          />
        </div>
        <div class="kb-field">
          <label>店铺名称</label>
          <span class="kb-kwwrap">
            <input v-model="idsDraft.shop" class="kb-input" placeholder="请输入店铺名称" @keyup.enter="idsSearch" />
            <button v-if="idsDraft.shop" type="button" class="kb-clear" title="清除" @click="idsDraft.shop = ''; idsSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="kb-field">
          <label>商品状态</label>
          <BubbleSelect
            class-name="kb-select"
            :options="idsStatusOptions"
            :value="idsDraft.status"
            @change="(v: string) => (idsDraft.status = v)"
          />
        </div>
        <div class="kb-field">
          <label>商品编码</label>
          <span class="kb-kwwrap">
            <input v-model="idsDraft.code" class="kb-input" placeholder="请输入商品编码" @keyup.enter="idsSearch" />
            <button v-if="idsDraft.code" type="button" class="kb-clear" title="清除" @click="idsDraft.code = ''; idsSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="kb-query-actions">
          <button class="kb-btn" @click="idsReset">重置</button>
          <button class="kb-btn primary" @click="idsSearch">查询</button>
        </div>
      </div>

      <!-- ID 维度列表：商品信息/系列编码/上架平台/上架店铺/商品状态/商品编码数/操作 -->
      <div class="kb-table-wrap">
        <table class="kb-table">
          <thead>
            <tr>
              <th>商品信息</th>
              <th>系列编码</th>
              <th>上架平台</th>
              <th>上架店铺</th>
              <th>商品状态</th>
              <th>商品编码数</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in idRows" :key="row.it.id">
              <td>
                <div class="kb-td-series">
                  <img :src="row.it.img" alt="" />
                  <span class="kb-td-item">
                    <b :title="row.it.name">{{ row.it.name }}</b>
                    <i>ID：{{ row.it.id }}</i>
                  </span>
                </div>
              </td>
              <td>{{ row.p.name }}</td>
              <td>
                <span class="kb-td-plats">
                  <span class="kb-plat-chip">
                    <PlatLogo :platform="row.it.platform as Platform" />
                    {{ row.it.platform }}
                  </span>
                </span>
              </td>
              <td>{{ row.it.shop }}</td>
              <td>
                <span class="kb-status">
                  <i class="kb-status-dot" :style="{ background: KB_ITEM_STATUS_META[row.it.status].dot }" />
                  {{ KB_ITEM_STATUS_META[row.it.status].label }}
                </span>
              </td>
              <td>{{ row.it.codes.length }}</td>
              <td><a class="kb-link" href="#" @click.prevent="openItemDetail(row.p, row.it)">详情</a></td>
            </tr>
            <tr v-if="!idRows.length">
              <td colspan="7" class="kb-empty">无匹配关联ID</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>

  <!-- 详情：右置宽抽屉 + 暗幕（空白处点击 / Esc 关闭） -->
  <template v-if="detail">
    <div class="kb-mask" @click="closeDetail" />
    <aside class="kb-drawer" :class="{ 'kb-v2-split': detail.kind === 'item' }">
      <!-- 头部：ID/系列数据 + 售价 + 关闭（与全局抽屉规范统一：头部右侧幽灵 ✕）；ID 维度通顶全宽置于 SKU 区上方，系列维度随内容滚动 -->
      <div class="kb-d-head">
        <img :src="detailHead.img" alt="" />
        <div class="kb-d-title">
          <span class="n">{{ detailHead.name }}</span>
          <span class="m">
            <template v-if="detail.kind === 'series'">
              <i>关联ID数：{{ detail.p.relIds }}</i><em />
              <i>上架店铺数：{{ detail.p.shops }}</i><em />
              <i>退款率：{{ detail.p.refundRate }}</i>
            </template>
            <template v-else>
              <i>商品ID：{{ detail.item.id }}</i><em />
              <i>上架店铺：{{ detail.item.platform }} · {{ detail.item.shop }}</i><em />
              <i class="kb-d-status">
                <span class="kb-status-dot" :style="{ background: KB_ITEM_STATUS_META[detail.item.status].dot }" />
                {{ KB_ITEM_STATUS_META[detail.item.status].label }}
              </i>
            </template>
          </span>
        </div>
        <div class="kb-d-price">
          <span class="p">{{ detailHead.price }}</span>
          <span class="s">售价</span>
        </div>
        <button class="kb-x" title="关闭" @click="closeDetail">✕</button>
      </div>

      <!-- ID 维度下方左右分栏之左列：SKU 选择卡（主图/名称/价格/关联编码数），点选切换右列关联编码与下方内容 -->
      <div v-if="detail.kind === 'item'" class="kb-d-skurail">
        <div class="kb-d-skurail-lb">SKU</div>
        <div
          v-for="s in detailSkus"
          :key="s.id"
          class="kb-sku-card"
          :class="{ active: s.id === activeSku }"
          @click="selectSku(s)"
        >
          <span class="kb-sku-top">
            <img :src="s.img" alt="" />
            <span class="kb-sku-info">
              <span class="n">{{ s.name }}</span>
              <span class="p">价格：{{ s.price }}</span>
            </span>
          </span>
          <span class="kb-sku-codes">关联编码：{{ s.codes.length }}</span>
        </div>
      </div>
      <div class="kb-d-body">
        <!-- 编码切换卡：系列维度=系列下全部编码平铺；ID 维度=当前 SKU 下关联编码横排（头部已通顶，SKU 选择在左列）；编码卡副行仅写关联系列名（一码只属一系列） -->
        <div v-if="detail.kind === 'item'" class="kb-d-codes">
          <div
            v-for="c in activeSkuCodes"
            :key="c.code"
            class="kb-code"
            :class="{ active: c.code === activeCode }"
            @click="activeCode = c.code"
          >
            <span class="c">{{ c.code }}</span>
            <span class="s">{{ detail.series.name }}</span>
          </div>
        </div>
        <div v-else class="kb-d-codes">
          <div
            v-for="c in detailCodes"
            :key="c.code"
            class="kb-code"
            :class="{ active: c.code === activeCode }"
            @click="activeCode = c.code"
          >
            <span class="c">{{ c.code }}</span>
            <span class="n">{{ c.name }}</span>
          </div>
        </div>

        <template v-if="currentCode">
          <div class="kb-d-sec"><span>基础信息</span><button class="kb-sec-btn" @click="openBaseEdit">编辑</button></div>
          <div class="kb-d-base">
            <div v-for="b in currentCode.base" :key="b.label" class="kb-base-item">
              <span class="l">{{ b.label }}：</span>
              <span class="v">{{ b.value }}</span>
            </div>
          </div>
          <div class="kb-d-sec"><span>图片信息</span></div>
          <div class="kb-d-media">
            <div v-for="(m, i) in currentCode.images" :key="`${m.label}-${i}`" class="kb-media">
              <img :src="m.src" alt="" />
              <span class="kb-media-ops">
                <button @click="openPreview('image', i)">查看</button>
                <button @click="openMediaModal('image', i)">编辑</button>
                <button class="del" @click="removeImage(i)">删除</button>
              </span>
              <!-- V2：tile 默认仅展示图片/视频类型；命中维度（精准/相似/关键词/场景）在编辑弹窗内查看与维护，不在 tile 铺开 -->
              <span class="kb-media-label">{{ m.label }}</span>
            </div>
            <button class="kb-media-add" @click="openMediaModal('image')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>新增</span>
            </button>
          </div>
          <div class="kb-d-sec"><span>商品视频</span></div>
          <div class="kb-d-media">
            <div v-for="(m, i) in currentCode.videos" :key="`${m.label}-${i}`" class="kb-media">
              <span class="kb-video" @click="playVideo">
                <img :src="m.src" alt="" />
                <i class="kb-play">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                </i>
              </span>
              <span class="kb-media-ops">
                <button @click="openPreview('video', i)">查看</button>
                <button @click="openMediaModal('video', i)">编辑</button>
                <button class="del" @click="removeVideo(i)">删除</button>
              </span>
              <!-- V2：tile 默认仅展示图片/视频类型；命中维度（精准/相似/关键词/场景）在编辑弹窗内查看与维护，不在 tile 铺开 -->
              <span class="kb-media-label">{{ m.label }}</span>
            </div>
            <button class="kb-media-add" @click="openMediaModal('video')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>新增</span>
            </button>
          </div>
          <!-- 商品安装/使用视频：独立素材组（安装/使用教程导向），交互同商品视频（查看/编辑/删除/新增） -->
          <div class="kb-d-sec"><span>商品安装/使用视频</span></div>
          <div class="kb-d-media">
            <div v-for="(m, i) in currentCode.guides" :key="`${m.label}-${i}`" class="kb-media">
              <span class="kb-video" @click="playVideo">
                <img :src="m.src" alt="" />
                <i class="kb-play">
                  <svg width="14" height="14" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
                </i>
              </span>
              <span class="kb-media-ops">
                <button @click="openPreview('guide', i)">查看</button>
                <button @click="openMediaModal('guide', i)">编辑</button>
                <button class="del" @click="removeGuide(i)">删除</button>
              </span>
              <span class="kb-media-label">{{ m.label }}</span>
            </div>
            <button class="kb-media-add" @click="openMediaModal('guide')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
              <span>新增</span>
            </button>
          </div>
        </template>

        <!-- 商品知识：编码维度，类型 tab 分组（无数据的类型不展示）；V2 增补问法匹配三件套展示 -->
        <template v-if="currentCode">
          <div class="kb-d-sec"><span>商品知识</span></div>
          <!-- 类型 tab + 新建按钮同排：tab 左、按钮右；无数据的类型不展示 tab -->
          <div class="kb-kn-bar">
            <div v-if="knTypes.length" class="kb-kn-tabs">
              <button
                v-for="t in knTypes"
                :key="t"
                :class="{ active: t === activeKnTab }"
                @click="knTab = t"
              >{{ t }}</button>
            </div>
            <button class="kb-btn primary kb-kn-act" @click="openCreate()">新建商品知识</button>
          </div>
          <div class="kb-kn-list">
            <div v-for="k in shownKnowledge" :key="k.id" class="kb-kn">
              <div class="kb-kn-head">
                <span class="kb-kn-type">{{ k.type }}</span>
                <span v-if="k.scenes.length" class="kb-kn-scenes" :title="k.scenes.join(' / ')">{{ k.scenes.join(' / ') }}</span>
                <!-- V2：问法计数归入头行右侧簇（编辑/删除 icon 左侧，与 chip/icon 垂直居中），不再与关键词标签混排副行 -->
                <i v-if="k.questions.length" class="kb-kn-sim">问法 {{ k.questions.length }}</i>
                <span class="kb-kn-acts">
                  <button title="编辑" @click="openCreate(k)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  </button>
                  <button class="del" title="删除" @click="deleteKnowledge(k)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
                  </button>
                </span>
              </div>
              <!-- V2：问法首条主行（全量问法 title 悬浮）+ 关键词标签副行（问法计数已上移头行右侧） -->
              <p v-if="k.questions.length" class="kb-kn-exact" :title="k.questions.join(' / ')">{{ k.questions[0] }}</p>
              <div v-if="k.keywords.length" class="kb-kn-match">
                <span class="kb-kn-kws"><em v-for="w in k.keywords" :key="w">{{ w }}</em></span>
              </div>
              <p v-if="k.text" class="kb-kn-text">{{ k.text }}</p>
              <div v-if="k.materials.length" class="kb-kn-imgs">
                <template v-for="(m, i) in k.materials" :key="i">
                  <img v-if="m.kind === 'image'" :src="m.url" alt="" :title="m.name" />
                  <span v-else-if="m.kind === 'video'" class="kb-kn-video">
                    <video :src="m.url" muted preload="metadata" :title="m.name" />
                  </span>
                  <span v-else class="kb-kn-file" :title="m.name">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                    {{ m.name }}
                  </span>
                </template>
              </div>
              <a v-if="k.link" class="kb-kn-link" @click.prevent="openLink">{{ k.link }}</a>
            </div>
            <div v-if="!currentCode.knowledge.length" class="kb-empty">暂无商品知识，点击「新建商品知识」创建</div>
          </div>
        </template>
      </div>
    </aside>
  </template>

  <!-- 新建/编辑商品知识弹窗：类型 + 命中场景 + V2 问法匹配三件套 + 内容（文字/素材/链接） -->
  <template v-if="createOpen">
    <div class="kb-modal-mask" @click="createOpen = false">
      <div class="kb-modal kb-kn-modal" @click.stop>
        <div class="kb-modal-head">
          <b>{{ createEditId ? '编辑商品知识' : '新建商品知识' }}</b>
          <button class="kb-x" title="关闭" @click="createOpen = false">✕</button>
        </div>
        <div class="kb-modal-body">
          <div class="kb-m-field">
            <label>知识类型</label>
            <BubbleSelect
              class-name="kb-select"
              :options="knTypeOptions"
              :value="knType || '选择知识类型'"
              creatable
              renamable
              @change="(v: string) => (knType = v)"
              @rename="onKnTypeRename"
            />
          </div>
          <div class="kb-m-field">
            <label>命中场景（选填）</label>
            <!-- 统一级联下拉多选：左列场景类型/右列细分场景 -->
            <CascadeSelect
              class-name="kb-select" :groups="sceneCascGroups" multiple :values="knScenes" all-label="不限" searchable
              @multi-change="(v: string[]) => (knScenes = v)"
            />
          </div>

          <!-- V2：问法（多条，复刻 QA 相似问法同款交互）/ 关键词两个命中维度 -->
          <div class="kb-m-field">
            <label>问法</label>
            <div class="qa-simlist">
              <div v-for="s in qTags.state.tags" :key="s" class="qa-simrow">
                <textarea
                  v-if="qEditKey === s" :ref="(el) => { qEditRef = el as HTMLTextAreaElement | null; }"
                  v-model="qEditDraft" class="qa-simbox edit" rows="2"
                  @keydown.enter.exact.prevent="endQEdit(true)" @keydown.esc="endQEdit(false)" @blur="endQEdit(true)"
                />
                <span v-else class="qa-simbox">{{ s }}</span>
                <template v-if="qEditKey !== s">
                  <button class="kb-row-edit" title="修改" type="button" @click="startQEdit(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  </button>
                  <button class="kb-row-del" title="删除" type="button" @click="qTags.remove(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
                  </button>
                </template>
              </div>
              <textarea
                v-if="qAdding" :ref="(el) => { qAddRef = el as HTMLTextAreaElement | null; }" v-model="qTags.state.draft" class="qa-textarea" rows="2" placeholder="输入问法，回车添加，Shift+回车换行"
                @keydown.enter.exact.prevent="endQAdd(true)" @keydown.esc="endQAdd(false)" @blur="endQAdd(true)"
              />
              <button v-if="!qAdding" class="kb-btn" type="button" @click="startQAdd">新增</button>
            </div>
          </div>
          <!-- 关键词：场景标签式（灰标签+✕移除），＋虚线标签内联输入新增（回车/逗号确认） -->
          <div class="kb-m-field">
            <label>关键词</label>
            <div class="qa-kwtags">
              <em v-for="s in kwTags.state.tags" :key="s" class="kb-scene-tag">
                {{ s }}<i title="移除" @click="kwTags.remove(s)">✕</i>
              </em>
              <input
                v-if="kwCreating"
                :ref="(el) => { kwInputRef = el as HTMLInputElement | null; }"
                v-model="kwTags.state.draft" class="kb-scene-create" placeholder="输入后回车或逗号添加"
                @keydown="kwTags.onKey"
                @keyup.esc="kwCreating = false"
                @blur="endKwCreate"
              >
              <button v-else type="button" class="kb-scene-tag add" title="新增关键词" @click="startKwCreate">＋</button>
            </div>
          </div>

          <div class="kb-m-field">
            <label>内容文字</label>
            <textarea v-model="knText" class="kb-textarea" placeholder="请输入知识内容文字，如尺码建议、养护方法、注意事项等" />
          </div>
          <div class="kb-m-field">
            <label>知识素材</label>
            <div class="kb-m-imgs">
              <span v-for="(m, i) in knMats" :key="i" class="kb-m-img" :class="m.kind">
                <img v-if="m.kind === 'image'" :src="m.url" alt="" />
                <video v-else-if="m.kind === 'video'" :src="m.url" muted preload="metadata" />
                <span v-else class="kb-m-filecard" :title="m.name">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                  <b>{{ m.name }}</b>
                </span>
                <button title="移除" @click="removeKnMat(i)">✕</button>
              </span>
              <button class="kb-m-addimg" @click="knFileRef?.click()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                <span>添加素材</span>
              </button>
              <input ref="knFileRef" type="file" multiple hidden @change="onKnFilePicked">
            </div>
          </div>
          <div class="kb-m-field">
            <label>内容链接</label>
            <input v-model="knLink" class="kb-input wide" placeholder="请输入链接地址（可选）" />
          </div>
        </div>
        <div class="kb-modal-foot">
          <button class="kb-btn" @click="createOpen = false">取消</button>
          <button class="kb-btn primary" @click="submitCreate">保存</button>
        </div>
      </div>
    </div>
  </template>

  <!-- 编辑基础信息弹窗：字段行增删改 + 拖动排序 -->
  <template v-if="baseEditOpen">
    <div class="kb-modal-mask" @click="baseEditOpen = false">
      <div class="kb-modal" @click.stop>
        <div class="kb-modal-head">
          <b>编辑基础信息</b>
          <button class="kb-x" title="关闭" @click="baseEditOpen = false">✕</button>
        </div>
        <div class="kb-modal-body">
          <div
            v-for="(r, i) in baseDraft"
            :key="i"
            class="kb-base-row"
            :class="{ drag: dragIdx === i }"
            draggable="true"
            @dragstart="dragIdx = i"
            @dragover.prevent="onRowDragOver(i)"
            @dragend="dragIdx = null"
          >
            <span class="kb-grip" title="拖动排序">
              <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true"><circle cx="2.5" cy="2.5" r="1.3" /><circle cx="7.5" cy="2.5" r="1.3" /><circle cx="2.5" cy="7" r="1.3" /><circle cx="7.5" cy="7" r="1.3" /><circle cx="2.5" cy="11.5" r="1.3" /><circle cx="7.5" cy="11.5" r="1.3" /></svg>
            </span>
            <input v-model="r.label" class="kb-input lab" placeholder="字段名" />
            <input v-model="r.value" class="kb-input val" placeholder="字段值" />
            <button class="kb-row-del" title="删除" @click="baseDraft.splice(i, 1)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
            </button>
          </div>
          <button class="kb-m-addrow" @click="baseDraft.push({ label: '', value: '' })">＋ 添加字段</button>
        </div>
        <div class="kb-modal-foot">
          <button class="kb-btn" @click="baseEditOpen = false">取消</button>
          <button class="kb-btn primary" @click="saveBase">保存</button>
        </div>
      </div>
    </div>
  </template>

  <!-- 新增/编辑图片视频弹窗：字段序对齐新建商品知识——类型/命中场景/问法/关键词 + 上传对应类型文件（图片与视频交互一致） -->
  <template v-if="mediaModal">
    <div class="kb-modal-mask" @click="mediaModal = null">
      <div class="kb-modal" @click.stop>
        <div class="kb-modal-head">
          <b>{{ mediaModal.index === null ? `新增${mediaKindName}` : `编辑${mediaKindName}` }}</b>
          <button class="kb-x" title="关闭" @click="mediaModal = null">✕</button>
        </div>
        <div class="kb-modal-body">
          <div class="kb-m-field">
            <label>{{ mediaKindName }}类型</label>
            <BubbleSelect
              class-name="kb-select"
              :options="mediaTypeOptions"
              :value="mediaType || '选择素材类型'"
              creatable
              renamable
              @change="onMediaTypeChange"
              @rename="onTypeRename"
            />
          </div>
          <div class="kb-m-field">
            <label>命中场景（选填）</label>
            <CascadeSelect
              class-name="kb-select" :groups="sceneCascGroups" multiple :values="mediaScenes" all-label="不限" searchable
              @multi-change="(v: string[]) => (mediaScenes = v)"
            />
          </div>
          <!-- V2：问法（多条，必填至少一条）/ 关键词两个命中维度（交互同知识弹窗） -->
          <div class="kb-m-field">
            <label>问法<i class="kb-m-req">*</i></label>
            <div class="qa-simlist">
              <div v-for="s in mQTags.state.tags" :key="s" class="qa-simrow">
                <textarea
                  v-if="mQEditKey === s" :ref="(el) => { mQEditRef = el as HTMLTextAreaElement | null; }"
                  v-model="mQEditDraft" class="qa-simbox edit" rows="2"
                  @keydown.enter.exact.prevent="endMQEdit(true)" @keydown.esc="endMQEdit(false)" @blur="endMQEdit(true)"
                />
                <span v-else class="qa-simbox">{{ s }}</span>
                <template v-if="mQEditKey !== s">
                  <button class="kb-row-edit" title="修改" type="button" @click="startMQEdit(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  </button>
                  <button class="kb-row-del" title="删除" type="button" @click="mQTags.remove(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
                  </button>
                </template>
              </div>
              <textarea
                v-if="mQAdding" :ref="(el) => { mQAddRef = el as HTMLTextAreaElement | null; }" v-model="mQTags.state.draft" class="qa-textarea" rows="2" placeholder="输入问法，回车添加，Shift+回车换行"
                @keydown.enter.exact.prevent="endMQAdd(true)" @keydown.esc="endMQAdd(false)" @blur="endMQAdd(true)"
              />
              <button v-if="!mQAdding" class="kb-btn" type="button" @click="startMQAdd">新增</button>
            </div>
            <span v-if="qErr" class="kb-m-err">请添加问法</span>
          </div>
          <div class="kb-m-field">
            <label>关键词</label>
            <div class="qa-kwtags">
              <em v-for="s in mKwTags.state.tags" :key="s" class="kb-scene-tag">
                {{ s }}<i title="移除" @click="mKwTags.remove(s)">✕</i>
              </em>
              <input
                v-if="mKwCreating"
                :ref="(el) => { mKwInputRef = el as HTMLInputElement | null; }"
                v-model="mKwTags.state.draft" class="kb-scene-create" placeholder="输入后回车或逗号添加"
                @keydown="mKwTags.onKey"
                @keyup.esc="mKwCreating = false"
                @blur="endMKwCreate"
              >
              <button v-else type="button" class="kb-scene-tag add" title="新增关键词" @click="startMKwCreate">＋</button>
            </div>
          </div>
          <div class="kb-m-field">
            <label>{{ mediaKindName }}文件</label>
            <div class="kb-m-upload">
              <button v-if="!mediaFile" type="button" class="kb-media-add kb-m-add" @click="fileRef?.click()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
                <span>上传{{ mediaKindName }}</span>
              </button>
              <template v-else>
                <span class="kb-m-thumb">
                  <video v-if="mediaModal.kind !== 'image' && mediaFile.url.startsWith('blob:')" :src="mediaFile.url" muted preload="metadata" />
                  <img v-else :src="mediaFile.url" alt="" />
                </span>
                <span class="kb-m-file">
                  <b>{{ mediaFile.name }}</b>
                  <a href="#" @click.prevent="fileRef?.click()">重新选择</a>
                </span>
              </template>
              <input
                ref="fileRef"
                type="file"
                hidden
                :accept="mediaModal.kind === 'image' ? 'image/*' : 'video/*'"
                @change="onFilePicked"
              />
            </div>
          </div>
        </div>
        <div class="kb-modal-foot">
          <button class="kb-btn" @click="mediaModal = null">取消</button>
          <button class="kb-btn primary" @click="submitMedia">保存</button>
        </div>
      </div>
    </div>
  </template>

  <!-- 素材查看：全屏暗幕查看器（规范同商品创建详情预览）；右侧编码维度图片切换，工具条翻页/缩放/全屏 -->
  <div v-if="previewOpen" ref="previewMaskRef" class="kb-preview-mask">
    <button type="button" class="kb-preview-close" title="关闭（Esc）" @click="closePreview">✕</button>
    <div class="kb-preview-stage" @click.self="closePreview">
      <div class="kb-preview-imgwrap" :style="{ transform: `scale(${zoom})` }">
        <img :src="curPreview.src" alt="" />
        <button v-if="curPreview.kind === 'video'" class="kb-preview-play" title="播放" @click="playVideo">
          <svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        </button>
      </div>
    </div>
    <!-- 编码维度图片切换：当前编码下全部图片/视频，点任一项切换主图，选中项主色描边 -->
    <aside class="kb-preview-list">
      <div class="kb-pvlist-head">编码图片<span>{{ previewList.length }} 张</span></div>
      <div class="kb-pvlist-body">
        <button
          v-for="(m, i) in previewList"
          :key="`${m.kind}-${m.src}-${i}`"
          type="button"
          class="kb-pvlist-item"
          :class="i === previewIdx ? 'active' : ''"
          @click="pickPreview(i)"
        >
          <span class="kb-pvlist-thumb">
            <img :src="m.src" alt="" />
            <i v-if="m.kind === 'video'" class="kb-pvlist-play">
              <svg width="10" height="10" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
            </i>
          </span>
          <span class="kb-pvlist-info">
            <b>{{ m.label }}</b>
            <span :title="m.q">{{ m.q || (m.kind === 'video' ? '视频' : '图片') }}</span>
          </span>
        </button>
      </div>
    </aside>
    <div class="kb-preview-bar">
      <button type="button" class="kb-bar-btn" title="上一张" :disabled="previewList.length < 2" @click="stepPreview(-1)">‹</button>
      <span class="kb-bar-count">{{ previewIdx + 1 }} / {{ previewList.length }}</span>
      <button type="button" class="kb-bar-btn" title="下一张" :disabled="previewList.length < 2" @click="stepPreview(1)">›</button>
      <i class="kb-bar-div" />
      <button type="button" class="kb-bar-btn" title="缩小" :disabled="zoom <= 0.5" @click="zoomBy(-0.25)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M7.5 10.5h6" /></svg>
      </button>
      <button type="button" class="kb-bar-btn" title="放大" :disabled="zoom >= 3" @click="zoomBy(0.25)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg>
      </button>
      <button type="button" class="kb-bar-btn" :title="isFull ? '退出全屏' : '全屏'" @click="toggleFull">
        <svg v-if="!isFull" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
      </button>
    </div>
  </div>

  <!-- 重点操作二次确认弹窗（删除等不可逆操作） -->
  <template v-if="confirmBox">
    <div class="kb-modal-mask" @click="confirmBox = null">
      <div class="kb-modal kb-confirm" @click.stop>
        <div class="kb-modal-head">
          <b>{{ confirmBox.title }}</b>
          <button class="kb-x" title="关闭" @click="confirmBox = null">✕</button>
        </div>
        <div class="kb-confirm-body">{{ confirmBox.message }}</div>
        <div class="kb-modal-foot">
          <button class="kb-btn" @click="confirmBox = null">取消</button>
          <button class="kb-btn primary" @click="doConfirm">确认</button>
        </div>
      </div>
    </div>
  </template>
</template>
