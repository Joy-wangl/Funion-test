<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import type { CreateRow } from './data';
import { sgJmDetail } from './shopGoodsData';
import { pushToast } from '../../components/toast';
import { requestVsImg } from '../../components/globalMsgData';
import CpdMediaSec from './CpdMediaSec.vue';
import ImgSizeCrop from './ImgSizeCrop.vue';
import MaterialCenter from './MaterialCenter.vue';
import KbPickDrawer from '../code-kb/KbPickDrawer.vue';
import SkuMatchView from './SkuMatchView.vue';
import type { SkmSku } from './SkuMatchView.vue';
import type { CbMaterial, MaterialType } from '../code-kb/codeKbData';

const props = defineProps<{ row: CreateRow; startEdit?: boolean }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'openPub'): void }>();

/** 京麦（京东 POP）商品创建详情页：展示形式与淘宝/视频号详情一致（sgd- 与 cpd- 类名同构）；
 *  规格/SKU 交互与淘宝版一致：拖拽排序、属性值改名、删除联动、rowspan 合并、笛卡尔积自动生成 */
const editing = ref(!!props.startEdit);
const showMaterial = ref(false);
const specOpen = ref(true);
const skuShow = ref(true);
/* 从父级详情缓存取当前行数据，保证同行动作闭环（编辑→返回→再进仍保留） */
const getJmDetail = inject<(link: string) => any>('getJmDetail');
const d = reactive(getJmDetail ? getJmDetail(props.row.link) : JSON.parse(JSON.stringify(sgJmDetail))) as typeof sgJmDetail;

/* 右栏 Ai作图：本商品全部主图带入素材中心生图态 */
const opsGo = inject<(t: string) => void>('opsGo');
const goAiImg = () => {
  if (!d.mainImgs.length) { pushToast('该商品暂无主图可带入', 'warning'); return; }
  requestVsImg([...d.mainImgs], { id: d.productId, name: props.row.title, platform: '京麦', shop: props.row.store });
  opsGo?.('videoStudio');
};

/* ---------- 规格/SKU 联动模型：SKU 行＝种子（d.skus）投影，字段编辑直写种子 ----------
   与快捷编辑弹窗、发布流程同源同对象：弹窗复制/新增只落一条种子，详情即只出一行；详情改值弹窗再开即同步 */
type JmSeed = (typeof d.skus)[number];
interface JmSkuRow { key: string; vals: Record<string, string>; name: string; src: JmSeed }
/* 规格维度稳定 id：拖拽重排不改变 SKU key */
const specIds = ref<string[]>(d.saleAttrs.map((_, i) => `jsp${i}`));
let specIdSeed = d.saleAttrs.length;
const jmSkus = ref<JmSkuRow[]>([]);
const skuKeyOf = (vals: Record<string, string>) => [...specIds.value].sort().map((id) => vals[id]).filter(Boolean).join(' / ');
const comboOf = (vals: Record<string, string>) => specIds.value.map((id) => vals[id]).filter(Boolean).join(' ');
const filledSpecCount = computed(() => d.saleAttrs.filter((s) => s.values.length > 0).length);
/* 种子 attrs 串 ↔ 属性值：先按维度名对号，缺名/改名再按顺序兜底，维度重排与改名均不失配 */
const seedVals = (s: JmSeed): Record<string, string> => {
  const vals: Record<string, string> = {};
  const pairs = s.attrs.split(' ').filter(Boolean).map((kv) => {
    const i = kv.indexOf(':');
    return i > 0 ? [kv.slice(0, i), kv.slice(i + 1)] : ['', kv];
  });
  const filled: number[] = [];
  d.saleAttrs.forEach((sp, si) => { if (sp.values.length) filled.push(si); });
  const used = new Set<number>();
  for (const si of filled) {
    const at = pairs.findIndex(([k], idx) => k === d.saleAttrs[si].name && !used.has(idx));
    if (at >= 0) { used.add(at); vals[specIds.value[si]] = pairs[at][1]; }
  }
  const rest = pairs.filter((_, idx) => !used.has(idx)).map(([, v]) => v);
  let ri = 0;
  for (const si of filled) if (vals[specIds.value[si]] === undefined && ri < rest.length) vals[specIds.value[si]] = rest[ri++];
  return vals;
};
const attrsStr = (vals: Record<string, string>) => specIds.value
  .map((id, si) => (vals[id] && d.saleAttrs[si]?.values.includes(vals[id]) ? `${d.saleAttrs[si]?.name || `规格${si + 1}`}:${vals[id]}` : ''))
  .filter(Boolean)
  .join(' ');
/* 结构变更（改名/删值/删维度）前先快照种子与其属性值，改完按快照重写 attrs，剔除已失效的维度与属性值 */
const snapSeeds = () => d.skus.map((s) => ({ s, vals: seedVals(s) }));
const normalizeSeeds = () => { snapSeeds().forEach(({ s, vals }) => { s.attrs = attrsStr(vals); }); };
const allCombos = (): Record<string, string>[] => {
  let combos: Record<string, string>[] = [{}];
  d.saleAttrs.forEach((s, si) => {
    if (s.values.length === 0) return;
    const id = specIds.value[si];
    const next: Record<string, string>[] = [];
    for (const c of combos) for (const v of s.values) next.push({ ...c, [id]: v });
    combos = next;
  });
  return combos;
};
const findSeed = (vals: Record<string, string>) => {
  const texts = Object.values(vals).filter(Boolean);
  return d.skus.find((s) => {
    const sv = Object.values(seedVals(s)).filter(Boolean);
    return sv.length === texts.length && texts.every((t) => sv.includes(t));
  });
};
const syncSkus = () => {
  /* 无规格维度：单 SKU 商品，种子即行 */
  if (d.saleAttrs.length === 0) {
    jmSkus.value = d.skus.map((src, i) => ({ key: `__single${i}`, vals: {}, name: src.name, src }));
    return;
  }
  if (filledSpecCount.value === 0) { jmSkus.value = []; return; }
  /* 仅有种子支撑的组合出行：不再按笛卡尔积补空行，弹窗里的一条 SKU 在详情就是一条 */
  jmSkus.value = allCombos()
    .map((vals) => {
      const src = findSeed(vals);
      return src ? { key: skuKeyOf(vals), vals, name: comboOf(vals), src } : null;
    })
    .filter((r): r is JmSkuRow => r !== null);
};
syncSkus();
/* 新增属性值：为含该值的新组合补建种子 SKU（默认值可继续编辑），保留「加值即出行」的创建流程 */
const mkSeed = (vals: Record<string, string>): JmSeed => {
  const n = d.skus.length;
  return {
    name: comboOf(vals), attrs: attrsStr(vals), jdPrice: '0.00', marketPrice: '0.00', stock: '0',
    outerId: `${d.itemNum}-N${n + 1}`, series: `编码${String.fromCharCode(65 + (n % 26))}`,
    cost: '0.00', upc: `69012345678${String(90 + n).slice(-2)}`, status: '上架',
  };
};
const materialize = (id?: string, val?: string) => {
  for (const vals of allCombos()) {
    if (id && vals[id] !== val) continue;
    if (!findSeed(vals)) d.skus.push(mkSeed(vals));
  }
};
/* 售价联动：以 SKU 存储的京东价（jdPrice）为准，与快捷编辑弹窗/发布流程同源同字段——弹窗改价详情即同步；
   出仓成本 0.7/单位；未定价（jdPrice 为 0/空，如详情新增规格生成的种子）时按成本加成 (成本+0.7)/0.8 兜底建议价；
   出仓总成本、利润、利润率均由实际售价派生 */
const SHIP_FEE = 0.7;
const num = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const saleOf = (s: JmSkuRow) => {
  const p = num(s.src.jdPrice);
  return p > 0 ? p : (num(s.src.cost) + SHIP_FEE) / 0.8;
};
const shipCostOf = (s: JmSkuRow) => (num(s.src.cost) + SHIP_FEE).toFixed(2);
const salePriceOf = (s: JmSkuRow) => saleOf(s).toFixed(2);
const profitOf = (s: JmSkuRow) => (saleOf(s) - num(s.src.cost) - SHIP_FEE).toFixed(2);
const profitRateOf = (s: JmSkuRow) => `${(((saleOf(s) - num(s.src.cost) - SHIP_FEE) / saleOf(s)) * 100).toFixed(1)}%`;
const skmOf = (s: JmSkuRow): SkmSku => ({ code: s.src.outerId, series: s.src.series, name: s.src.name, cost: s.src.cost, price: salePriceOf(s) });

/* SKU「查看」→ 商品匹配视图（京麦入口两 tab：聚水潭匹配 / 商品匹配） */
const matchSku = ref<SkmSku | null>(null);
const openMatch = (s: JmSkuRow) => { matchSku.value = skmOf(s); };
/* 一键匹配：把本商品全部 SKU 传入匹配视图，左侧切换列逐个查看匹配状态 */
const matchSkus = computed<SkmSku[]>(() => jmSkus.value.map(skmOf));
/* rowspan 合并 */
const samePrefix = (a: JmSkuRow, b: JmSkuRow, di: number) => {
  for (let k = 0; k <= di; k++) {
    const id = specIds.value[k];
    if (a.vals[id] !== b.vals[id]) return false;
  }
  return true;
};
const skuMerge = computed(() => {
  const rows = jmSkus.value;
  const grid: { show: boolean; span: number }[][] = rows.map(() => d.saleAttrs.map(() => ({ show: false, span: 1 })));
  for (let di = 0; di < d.saleAttrs.length; di++) {
    let i = 0;
    while (i < rows.length) {
      let j = i + 1;
      while (j < rows.length && samePrefix(rows[i], rows[j], di)) j++;
      grid[i][di] = { show: true, span: j - i };
      i = j;
    }
  }
  return grid;
});

/* 二次确认弹窗 */
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const doConfirm = () => { confirmBox.value?.onOk(); confirmBox.value = null; };

/* 拖拽排序规格 */
const specArm = ref<number | null>(null);
const specDrag = ref<number | null>(null);
const specAddVals = ref<string[]>([]);
const onSpecDragOver = (i: number) => {
  const from = specDrag.value;
  if (from === null || from === i) return;
  const [m] = d.saleAttrs.splice(from, 1);
  d.saleAttrs.splice(i, 0, m);
  const [mid] = specIds.value.splice(from, 1);
  specIds.value.splice(i, 0, mid);
  specDrag.value = i;
};
const askRemoveSpec = (si: number) => {
  const sp = d.saleAttrs[si];
  askConfirm('删除规格', `删除规格「${sp.name || `规格${si + 1}`}」将同时删除其下全部属性值（${sp.values.length} 个），SKU 列表将按剩余规格重新生成，是否继续？`, () => {
    const snap = snapSeeds();
    const dropId = specIds.value[si];
    snap.forEach(({ vals }) => { delete vals[dropId]; });
    d.saleAttrs.splice(si, 1);
    specIds.value.splice(si, 1);
    specAddVals.value.splice(si, 1);
    /* 剩余规格下属性值完全相同的种子合并为一条，避免删维度后出现重复 SKU */
    const seen = new Set<string>();
    const keep = snap.filter(({ vals }) => {
      const k = skuKeyOf(vals);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    keep.forEach(({ s, vals }) => {
      s.attrs = attrsStr(vals);
      s.name = comboOf(vals) || s.name;
    });
    d.skus = keep.map(({ s }) => s);
    syncSkus();
    pushToast('规格已删除，SKU 已按剩余规格重新生成');
  });
};
const addSpec = () => {
  d.saleAttrs.push({ name: `规格${d.saleAttrs.length + 1}`, values: [] });
  specIds.value.push(`jsp${specIdSeed++}`);
  specAddVals.value.push('');
  syncSkus();
};
/* 拖拽排序属性值 */
const valArm = ref<string | null>(null);
const valDrag = ref<string | null>(null);
const onValDragOver = (si: number, vi: number) => {
  const from = valDrag.value;
  if (!from || from === `${si}-${vi}`) return;
  const [fs, fv] = from.split('-').map(Number);
  if (fs !== si) return;
  const [m] = d.saleAttrs[si].values.splice(fv, 1);
  d.saleAttrs[si].values.splice(vi, 0, m);
  valDrag.value = `${si}-${vi}`;
};
const askRemoveSpecValue = (si: number, vi: number) => {
  const v = d.saleAttrs[si].values[vi];
  const id = specIds.value[si];
  const last = d.saleAttrs[si].values.length === 1;
  const snap = snapSeeds();
  const n = snap.filter(({ vals }) => vals[id] === v).length;
  askConfirm('删除属性值', last
    ? `删除属性值「${v}」后规格「${d.saleAttrs[si].name || `规格${si + 1}`}」将无属性值，SKU 列表暂隐该规格列，其余 SKU 保留，是否继续？`
    : `删除属性值「${v}」将同步删除包含该属性值的 ${n} 个 SKU，是否继续？`, () => {
      d.saleAttrs[si].values.splice(vi, 1);
      /* 非末值：连带删除引用该值的种子 SKU；末值：保留 SKU，仅重写 attrs 摘掉该维度 */
      const keep = last ? snap : snap.filter(({ vals }) => vals[id] !== v);
      keep.forEach(({ s, vals }) => { s.attrs = attrsStr(vals); });
      d.skus = keep.map(({ s }) => s);
      syncSkus();
      pushToast(last ? `属性值「${v}」已删除，规格「${d.saleAttrs[si].name || `规格${si + 1}`}」无属性值暂隐于 SKU 列表` : `属性值「${v}」及关联的 ${n} 个 SKU 已删除`);
    });
};
/* 属性值改名：同步种子 attrs 与 SKU 名称（改名后 SKU 名称跟随自动组合名） */
const onSpecValChange = (si: number, vi: number, e: Event) => {
  const input = e.target as HTMLInputElement;
  const nv = input.value.trim();
  const ov = d.saleAttrs[si].values[vi];
  if (nv === ov) { input.value = ov; return; }
  if (!nv) { pushToast('属性值不能为空', 'warning'); input.value = ov; return; }
  if (d.saleAttrs[si].values.includes(nv)) { pushToast('该属性值已存在', 'warning'); input.value = ov; return; }
  const id = specIds.value[si];
  const snap = snapSeeds();
  d.saleAttrs[si].values[vi] = nv;
  snap.forEach(({ s, vals }) => {
    if (vals[id] !== ov) return;
    vals[id] = nv;
    s.attrs = attrsStr(vals);
    s.name = comboOf(vals) || s.name;
  });
  syncSkus();
};
/* 规格维度改名：种子 attrs 串按新维度名重写，保持弹窗/发布口径一致 */
const onSpecNameChange = () => { normalizeSeeds(); syncSkus(); };
const addSpecValue = (si: number) => {
  const v = (specAddVals.value[si] ?? '').trim();
  if (!v) return;
  if (d.saleAttrs[si].values.includes(v)) { pushToast('该属性值已存在', 'warning'); return; }
  d.saleAttrs[si].values.push(v);
  specAddVals.value[si] = '';
  /* 新值对应的组合在种子里落地为真实 SKU 行（可继续编辑），与快捷弹窗口径一致 */
  materialize(specIds.value[si], v);
  syncSkus();
};
/* 删除 SKU：删种子行，孤立属性值联动删除 */
const askRemoveSku = (sku: JmSkuRow) => {
  const others = jmSkus.value.filter((s) => s.key !== sku.key);
  const orphans = specIds.value
    .map((id, si) => ({ si, id, v: sku.vals[id] }))
    .filter(({ id, v }) => v && !others.some((s) => s.vals[id] === v));
  const orphanTxt = orphans.map((o) => `「${o.v}」`).join('、');
  askConfirm(
    '删除 SKU',
    orphans.length
      ? `删除 SKU「${sku.name}」后，属性值${orphanTxt}未被其它 SKU 引用，将一并删除，是否继续？`
      : `确认删除 SKU「${sku.name}」？其属性值仍被其它 SKU 引用，将予以保留。`,
    () => {
      const at = d.skus.indexOf(sku.src);
      const snap = snapSeeds();
      const keep = snap.filter((_, i) => i !== at);
      orphans.forEach(({ si, v }) => {
        const idx = d.saleAttrs[si].values.indexOf(v);
        if (idx >= 0) d.saleAttrs[si].values.splice(idx, 1);
      });
      keep.forEach(({ s, vals }) => { s.attrs = attrsStr(vals); });
      d.skus = keep.map(({ s }) => s);
      syncSkus();
      pushToast(orphans.length ? `SKU「${sku.name}」及属性值${orphanTxt}已删除` : `SKU「${sku.name}」已删除`);
    },
  );
};

/* ---------- 推荐素材（素材库选用） ---------- */
/* 演示映射：京麦详情关联素材库商品ID JM-5301（XL-C300 系列下京麦ID），抽屉按其系列展开商品编码与类型素材 */
const KB_PRODUCT_ID = 'JM-5301';
type KbTarget = 'mainImgs' | 'rectImgs' | 'detailPc' | 'detailApp' | 'whiteImg' | 'transparentImg' | 'sceneImg' | 'videos';
const kbPick = ref<{ type: MaterialType; target: KbTarget; title: string } | null>(null);
const openKbPick = (type: MaterialType, target: KbTarget, title: string) => { kbPick.value = { type, target, title }; };
/* 确认选用：选中素材回填对应模块（单图位取首张覆盖，图集/视频追加） */
const onKbConfirm = (list: CbMaterial[]) => {
  const pick = kbPick.value;
  kbPick.value = null;
  if (!pick || !list.length) return;
  const urls = list.map((m) => m.thumb);
  if (pick.target === 'whiteImg') d.whiteImg = urls[0];
  else if (pick.target === 'transparentImg') d.transparentImg = urls[0];
  else if (pick.target === 'sceneImg') d.sceneImg = urls[0];
  else if (pick.target === 'mainImgs') d.mainImgs.push(...urls);
  else if (pick.target === 'rectImgs') d.rectImgs.push(...urls);
  else if (pick.target === 'detailPc') d.detailPc.push(...urls);
  else if (pick.target === 'detailApp') d.detailApp.push(...urls);
  else if (pick.target === 'videos') d.videos.push(...urls);
  pushToast(`已添加 ${list.length} 个素材至「${pick.title}」`);
};

/* ---------- 图片预览 ---------- */
const previewList = ref<string[]>([]);
const previewIdx = ref(0);
const curPreview = computed(() => previewList.value[previewIdx.value] ?? '');
const zoom = ref(1);
const zoomBy = (v: number) => { zoom.value = Math.min(3, Math.max(0.5, Math.round((zoom.value + v) * 100) / 100)); };
const openPreview = (list: string[], i: number) => { previewList.value = list; previewIdx.value = i; zoom.value = 1; };
const closePreview = () => { previewList.value = []; previewIdx.value = 0; zoom.value = 1; sizePanel.value = false; };
const stepPreview = (v: number) => {
  const n = previewList.value.length;
  previewIdx.value = (previewIdx.value + v + n) % n;
  zoom.value = 1;
  sizePanel.value = false;
};
const sizePanel = ref(false);
const previewImgRef = ref<HTMLImageElement | null>(null);
const commitSize = (url: string) => { previewList.value[previewIdx.value] = url; };
const previewMaskRef = ref<HTMLDivElement | null>(null);
const isFull = ref(false);
const syncFull = () => { isFull.value = !!document.fullscreenElement; };
onMounted(() => document.addEventListener('fullscreenchange', syncFull));
const toggleFull = () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void previewMaskRef.value?.requestFullscreen();
};
const onKeydown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (document.fullscreenElement) { void document.exitFullscreen(); return; }
  closePreview();
};
watch(previewList, (v) => {
  if (v.length) document.addEventListener('keydown', onKeydown);
  else document.removeEventListener('keydown', onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener('fullscreenchange', syncFull);
});
</script>

<template>
  <MaterialCenter v-if="showMaterial" @back="showMaterial = false" />
  <div v-else class="sg-page sgd-page cpd-page jm-detail">
    <div class="sgd-hero">
      <div class="sgd-top">
        <div class="sgd-top-left">
          <button class="sgd-back" title="返回" @click="emit('back')">←</button>
          <span class="sgd-top-title">商品详情</span>
          <span class="jm-plat-tag">京麦</span>
        </div>
        <div class="cpd-top-acts">
          <template v-if="editing">
            <button class="sg-btn" @click="editing = false">取消编辑</button>
            <button class="sg-btn primary" @click="editing = false; pushToast('版本已保存')">保存版本</button>
          </template>
          <template v-else>
            <button class="cpd-pub-link" @click="emit('openPub')">关联发布任务 &gt;</button>
            <button class="sg-btn" @click="editing = true">编辑</button>
          </template>
        </div>
      </div>

      <div class="sgd-cat">
        <span class="sgd-cat-label">当前类目<i>*</i></span>
        <span>居家用品 / 厨房用具 / 刀具</span>
        <a v-if="editing" class="cpd-cat-edit" href="#" @click.prevent>修改</a>
      </div>

      <div class="sgd-head">
        <div class="sgd-gallery">
          <div class="sgd-thumbs">
            <img
              v-for="(t, i) in d.mainImgs"
              :key="i"
              class="sgd-thumb cpd-previewable"
              :class="i === 0 ? 'active' : ''"
              :src="t"
              alt=""
              @click="openPreview(d.mainImgs, i)"
            />
          </div>
          <img class="sgd-main cpd-previewable" :src="props.row.thumb" alt="" @click="openPreview([props.row.thumb], 0)" />
        </div>
        <div class="sgd-info">
          <h2>{{ props.row.title }}</h2>
          <div class="sgd-fields">
            <div class="sgd-frow"><span>商品ID：</span><b>{{ d.productId }}</b></div>
            <div class="sgd-frow"><span>品牌：</span><b>{{ d.brand }}</b></div>
            <div class="sgd-frow"><span>创建时间：</span><b>{{ props.row.time }}</b></div>
            <div class="sgd-frow"><span>创建人：</span><b>{{ props.row.person }}</b></div>
          </div>
        </div>
        <div class="cpd-side-acts">
          <button class="cpd-side-btn" @click="pushToast('手机预览：演示环境暂不可用', 'warning')">
            <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 18.5h3" /></svg></span>手机预览
          </button>
          <button class="cpd-side-btn" @click="pushToast('AI审查完成：未发现合规问题')">
            <span class="ic ai"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="2.4" /><circle cx="12" cy="12" r="5.6" /><circle cx="12" cy="12" r="8.8" /></svg></span>AI审查
          </button>
          <button v-if="editing" class="cpd-side-btn" @click="showMaterial = true">
            <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4.5 16.5l4.5-4 3.5 3 3-2.5 4 3.5" /></svg></span>素材
          </button>
          <button class="cpd-side-btn" title="将本商品全部主图带入素材中心生图" @click="goAiImg">
            <span class="ic ai"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M12 9.2l1 2.3 2.3 1-2.3 1-1 2.3-1-2.3-2.3-1 2.3-1z" /></svg></span>Ai作图
          </button>
        </div>
      </div>
    </div>

    <!-- 商品规格（与淘宝版一致：拖拽排序＋属性值改名＋删除联动） -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品规格</div>
        <button class="sgd-collapse" @click="specOpen = !specOpen">{{ specOpen ? '∨ 收起' : '∧ 展开' }}</button>
      </div>
      <div v-if="specOpen" class="sgd-sec-body">
        <template v-if="editing">
          <div
            v-for="(sp, si) in d.saleAttrs"
            :key="specIds[si]"
            class="cpd-spec-card"
            :class="specDrag === si ? 'dragging' : ''"
            :draggable="specArm === si"
            @dragstart="specDrag = si"
            @dragover.prevent="onSpecDragOver(si)"
            @dragend="specArm = null; specDrag = null; onSpecNameChange()"
          >
            <div class="cpd-spec-head">
              <span class="cpd-drag" title="拖动排序规格" @mousedown="specArm = si" @mouseup="specArm = null">⋮</span>
              <input v-model="sp.name" class="cpd-vspec-name" placeholder="规格名" @change="onSpecNameChange" />
              <span class="cpd-spec-ics">
                <i class="danger" title="删除该规格" @click="askRemoveSpec(si)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" /></svg>
                </i>
              </span>
            </div>
            <div class="cpd-vspec-vals">
              <span
                v-for="(v, vi) in sp.values"
                :key="vi"
                class="cpd-vspec-chip cpd-tchip"
                :class="valDrag === `${si}-${vi}` ? 'dragging' : ''"
                :draggable="valArm === `${si}-${vi}`"
                @dragstart="valDrag = `${si}-${vi}`"
                @dragover.prevent="onValDragOver(si, vi)"
                @dragend="valArm = null; valDrag = null; syncSkus()"
              >
                <i class="cpd-chip-grip" title="拖动排序属性值" @mousedown="valArm = `${si}-${vi}`" @mouseup="valArm = null">⋮</i>
                <input class="cpd-chip-input" :value="v" @change="onSpecValChange(si, vi, $event)" />
                <i class="cpd-chip-del" title="删除该属性值" @click="askRemoveSpecValue(si, vi)">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" /></svg>
                </i>
              </span>
              <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
              <input class="cpd-val-add" v-model="specAddVals[si]" placeholder="输入属性值，点击空白处保存" @blur="addSpecValue(si)" @keyup.enter="addSpecValue(si)" />
            </div>
          </div>
          <button class="cpd-add-spec" @click="addSpec">⊕ 添加规格</button>
        </template>
        <template v-else>
          <div v-for="sp in d.saleAttrs" :key="sp.name" class="cpd-spec-card cpd-spec-view">
            <div class="cpd-spec-head"><span class="cpd-vspec-name">{{ sp.name }}</span></div>
            <div class="cpd-vspec-vals">
              <span v-for="v in sp.values" :key="v" class="cpd-vspec-chip">{{ v }}</span>
              <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
            </div>
          </div>
          <div v-if="!d.saleAttrs.length" class="cpd-vsku-empty">该商品无规格，按单 SKU 管理</div>
        </template>
      </div>
    </div>

    <!-- 商品SKU（与淘宝版一致：rowspan 合并＋全字段编辑＋删除联动） -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品SKU</div>
        <div class="cpd-sku-acts">
          <label class="sgd-sku-toggle">
            <input v-model="skuShow" type="checkbox" />
            展开明细
          </label>
        </div>
      </div>
      <div class="sgd-sec-body">
        <div class="cpd-sku-wrap">
          <table :class="['sg-table', 'cpd-sku-table', 'cpd-tsku', 'jm-sku-table', skuShow ? 'cpd-tsku-x' : '']">
            <thead>
              <tr>
                <th>排序</th>
                <th>SKU图</th>
                <template v-for="(sp, di) in d.saleAttrs" :key="specIds[di]"><th v-if="sp.values.length">{{ sp.name || `规格${di + 1}` }}</th></template>
                <th>组合</th>
                <th>SKU名称</th>
                <th>售价</th>
                <th>库存</th>
                <th>商品编码</th>
                <th>系列编码</th>
                <th>条码</th>
                <th v-if="skuShow">成本价</th>
                <th v-if="skuShow">出仓总成本</th>
                <th v-if="skuShow">利润</th>
                <th v-if="skuShow">利润率</th>
                <th>状态</th>
                <th v-if="editing">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, ri) in jmSkus" :key="s.key">
                <td>{{ ri + 1 }}</td>
                <td><img class="sgd-sku-img" :src="props.row.thumb" alt="" /></td>
                <template v-for="(sid, di) in specIds" :key="sid">
                  <td v-if="d.saleAttrs[di].values.length && skuMerge[ri][di].show" class="cpd-merge-cell" :rowspan="skuMerge[ri][di].span">{{ s.vals[specIds[di]] }}</td>
                </template>
                <td>{{ s.name }}</td>
                <td>
                  <input v-if="editing" v-model="s.src.name" class="cpd-cell-input cpd-cell-wide" />
                  <template v-else>{{ s.src.name }}</template>
                </td>
                <td>¥{{ salePriceOf(s) }}</td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.src.stock" class="cpd-cell-input" /><i>件</i></span>
                  <template v-else>{{ s.src.stock }}</template>
                </td>
                <td><span class="cpd-code-outline">{{ s.src.outerId }}</span></td>
                <td><span class="sgd-code">{{ s.src.series }}</span></td>
                <td><span class="sgd-code">{{ s.src.upc }}</span></td>
                <td v-if="skuShow">¥{{ s.src.cost }}</td>
                <td v-if="skuShow">¥{{ shipCostOf(s) }}</td>
                <td v-if="skuShow">¥{{ profitOf(s) }}</td>
                <td v-if="skuShow">{{ profitRateOf(s) }}</td>
                <td><span class="sgd-tag" :class="s.src.status === '上架' ? 'green' : 'gray'">{{ s.src.status }}</span></td>
                <td v-if="editing" class="cpd-row-ops">
                  <a href="#" @click.prevent="openMatch(s)">查看</a>
                  <a class="danger" href="#" @click.prevent="askRemoveSku(s)">删除</a>
                </td>
              </tr>
              <tr v-if="jmSkus.length === 0"><td :colspan="(skuShow ? 15 : 11) + filledSpecCount - (editing ? 0 : 1)" class="cpd-vsku-empty">—</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 素材区 -->
    <CpdMediaSec
      title="主图（方图）*"
      note="商品主图 material.mainImages：必填，最少1张、最多10张，比例1:1，尺寸480*480~1500*1500px，小于3M，JPG/JPEG/PNG，首图须为白底实物图"
      :imgs="d.mainImgs"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.mainImgs, i)"
      kb-pick
      :on-kb-pick="() => openKbPick('主图', 'mainImgs', '主图（方图）')"
    />
    <CpdMediaSec
      title="长图"
      note="商品长图 material.rectangleImages：非必填，最多1张，比例3:4（部分类目可使用），尺寸480*640~1125*1500px，小于3M"
      :imgs="d.rectImgs"
      :ratio34="true"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.rectImgs, i)"
      kb-pick
      :on-kb-pick="() => openKbPick('主图', 'rectImgs', '长图')"
    />
    <CpdMediaSec
      title="商品详情（PC端）*"
      note="PC端商详 productDetailDesc.desc：必填，最少1张，详情描述图，图片宽度750~1500px、单图高度≤1500px、小于3M，总高度建议≤15000px"
      :imgs="d.detailPc"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailPc, i)"
      kb-pick
      :on-kb-pick="() => openKbPick('详情图', 'detailPc', '商品详情（PC端）')"
    />
    <CpdMediaSec
      title="商品详情（APP端）(非必填)"
      note="APP端商详 productDetailDesc.mobileDesc：非必填，0~8张，移动端详情描述，京麦移动端支持装修0~8张图、文本不超过500字"
      :imgs="d.detailApp"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailApp, i)"
      kb-pick
      :on-kb-pick="() => openKbPick('详情图', 'detailApp', '商品详情（APP端）')"
    />
    <CpdMediaSec
      title="白底图"
      note="白底图 material.whiteBackGroundImages：非必填，最多1张，纯白边、无牛皮癣/logo/阴影，图片饱满，将作为个性化素材展示"
      :imgs="[d.whiteImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.whiteImg], i)"
      kb-pick
      :on-kb-pick="() => openKbPick('白底图', 'whiteImg', '白底图')"
    />
    <CpdMediaSec
      title="透明图"
      note="透明图 material.transparentImages：非必填，最多1张，透明背景商品图，用于搜索/活动素材"
      :imgs="[d.transparentImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.transparentImg], i)"
      kb-pick
      :on-kb-pick="() => openKbPick('白底图', 'transparentImg', '透明图')"
    />
    <CpdMediaSec
      title="场景图(非必填)"
      note="场景图 SKU素材 sku-materials：非必填，最多1张，带有背景、无牛皮癣、主体清晰完整，建议800*800px，JPG/JPEG、小于3M"
      :imgs="[d.sceneImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.sceneImg], i)"
      kb-pick
      :on-kb-pick="() => openKbPick('场景图', 'sceneImg', '场景图')"
    />
    <CpdMediaSec
      title="商品视频"
      note="主图视频 material.videos：非必填，0~5个，时长5秒~60秒，宽高比支持1:1、3:4、9:16，最多可上传5个"
      :imgs="d.videos"
      :video="true"
      :editing="editing"
      add-label="添加视频"
      kb-pick
      :on-kb-pick="() => openKbPick('视频', 'videos', '商品视频')"
    />

    <!-- 图片预览 -->
    <div v-if="previewList.length" ref="previewMaskRef" class="cpd-preview-mask">
      <button type="button" class="cpd-preview-close" title="关闭（Esc）" @click="closePreview">✕</button>
      <div class="cpd-preview-stage" @click.self="closePreview">
        <div class="cpd-preview-imgwrap" :style="{ transform: `scale(${zoom})` }">
          <img ref="previewImgRef" :src="curPreview" alt="" />
          <ImgSizeCrop v-model:open="sizePanel" :src="curPreview" :zoom="zoom" :img-el="previewImgRef" :commit="commitSize" />
        </div>
      </div>
      <div class="cpd-preview-bar">
        <button type="button" class="cpd-bar-btn" title="上一张" :disabled="previewList.length < 2" @click="stepPreview(-1)">‹</button>
        <span class="cpd-bar-count">{{ previewIdx + 1 }} / {{ previewList.length }}</span>
        <button type="button" class="cpd-bar-btn" title="下一张" :disabled="previewList.length < 2" @click="stepPreview(1)">›</button>
        <i class="cpd-bar-div" />
        <button type="button" class="cpd-bar-btn" title="缩小" :disabled="zoom <= 0.5" @click="zoomBy(-0.25)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M7.5 10.5h6" /></svg>
        </button>
        <button type="button" class="cpd-bar-btn" title="放大" :disabled="zoom >= 3" @click="zoomBy(0.25)">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" /></svg>
        </button>
        <button type="button" class="cpd-bar-btn" :title="isFull ? '退出全屏' : '全屏'" @click="toggleFull">
          <svg v-if="!isFull" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /></svg>
        </button>
        <template v-if="editing">
          <i class="cpd-bar-div" />
          <button type="button" class="cpd-bar-size" :class="sizePanel ? 'on' : ''" title="修改图片尺寸" @click="sizePanel = !sizePanel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5" /><path d="M20 15v5h-5" /><path d="m4 4 7 7" /><path d="m20 20-7 7" /></svg>
            修改尺寸
          </button>
        </template>
      </div>
    </div>

    <!-- 推荐素材选用抽屉（素材库） -->
    <KbPickDrawer
      :open="!!kbPick"
      :type="kbPick?.type ?? '主图'"
      :product-id="KB_PRODUCT_ID"
      @close="kbPick = null"
      @confirm="onKbConfirm"
    />

    <!-- 删除规格/属性值/SKU 二次确认 -->
    <Teleport to="body">
      <div v-if="confirmBox" class="mk-create-mask mk-confirm-mask" @click.self="confirmBox = null">
        <div class="mk-confirm-modal">
          <div class="mk-confirm-head">{{ confirmBox.title }}</div>
          <div class="mk-confirm-body">{{ confirmBox.message }}</div>
          <div class="mk-confirm-foot">
            <button class="sg-btn" @click="confirmBox = null">取消</button>
            <button class="sg-btn danger" @click="doConfirm">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- SKU 商品匹配视图（编辑态「查看」入口；京麦入口合并竞品/条件为「商品匹配」单工作区） -->
    <SkuMatchView
      :open="!!matchSku"
      :sku="matchSku"
      :skus="matchSkus"
      merged
      :product="{ title: props.row.title, thumb: props.row.thumb, category: d.brand, price: d.skus[0]?.jdPrice ?? '' }"
      @close="matchSku = null"
      @saved="matchSku = null"
    />
  </div>
</template>
