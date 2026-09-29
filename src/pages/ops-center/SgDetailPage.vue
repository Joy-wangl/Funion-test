<script setup lang="ts">
import { computed, reactive, ref, toRaw } from 'vue';
import Modal from '../../components/Modal.vue';
import { PLATFORM_LOGO } from './data';
import { getSgDetail, sgDetail, sgOpsLogCls, sgOpsLogOf, sgOpsSalesOf } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';
import { pushToast } from '../../components/toast';
import CpdMediaSec from './CpdMediaSec.vue';
import KbPickDrawer from '../code-kb/KbPickDrawer.vue';
import SkuMatchView from './SkuMatchView.vue';
import type { SkmSku } from './SkuMatchView.vue';
import type { CbMaterial, MaterialType } from '../code-kb/codeKbData';

const props = defineProps<{
  product: SgProduct;
  /** 覆盖底部主操作（不传按商品状态推断；内部商机等复用场景传入，支持多个按钮） */
  foot?: { text: string; cls: string }[];
  /** 隐藏右上「编辑」按钮（商机等不可编辑场景） */
  hideEdit?: boolean;
  /** 右上「操作日志」入口（运营管理 / 店铺商品详情） */
  showLog?: boolean;
}>();
const emit = defineEmits<{ (e: 'back'): void }>();

/** 详情底部主操作：按商品状态给出 */
function footAction(p: SgProduct): { text: string; cls: string } {
  switch (p.status) {
    case 'selling':
    case 'auditFail':
      return { text: '下架', cls: 'warn' };
    case 'auditing':
      return { text: '撤销审核', cls: 'danger' };
    case 'offSystem':
    case 'offManual':
    case 'offDeposit':
    case 'offBrand':
    case 'offBan':
      return { text: '立即上架', cls: 'primary' };
    case 'draft':
      return { text: '发布上架', cls: 'primary' };
    default:
      return { text: '立即上架', cls: 'primary' };
  }
}

/* ================= 详情页 ================= */
const editing = ref(false);
const specOpen = ref(true);
const skuShow = ref(true);
const p = computed(() => props.product);
const foot = computed(() => props.foot ?? [footAction(p.value)]);

const statusTag = computed(() =>
  p.value.status === 'selling' ? { text: '出售中', cls: 'green' }
  : p.value.status === 'auditing' ? { text: '审核中', cls: 'blue' }
  : p.value.status === 'auditFail' ? { text: '审核未通过', cls: 'red' }
  : p.value.status === 'draft' ? { text: '草稿', cls: 'orange' }
  : { text: '已下架', cls: 'gray' });

const thumbs = computed(() => [p.value.img, ...sgDetail.mainImgs.slice(0, 4)]);

/* 操作日志：全流程（创建/上下架/改标题/改价/改SKU）倒序弹层；双 tab：操作明细（日志表）/ 销量变化（节点增量＋累计） */
const logOpen = ref(false);
const logTab = ref<'detail' | 'sales'>('detail');
const logs = computed(() => sgOpsLogOf(p.value));
const salesNodes = computed(() => sgOpsSalesOf(p.value));

/* 详情数据按商品持久化（key = linkId）：与列表「详」快捷编辑弹窗共用同一份种子，改一处两边同步 */
const d = reactive(getSgDetail(p.value.linkId));

/* SKU「查看」→ 商品匹配视图（聚水潭/竞品/条件三 tab） */
const matchSku = ref<SkmSku | null>(null);
const openMatch = (s: SgSku) => { matchSku.value = { code: s.src.code, series: s.src.series, name: s.src.name, cost: s.src.cost, price: s.src.price }; };

/* ---------- 推荐素材（素材库选用） ---------- */
/* 演示映射：店铺商品详情关联素材库商品ID TB-5101（XL-C300 系列下淘宝ID），抽屉按其系列展开商品编码与类型素材 */
const KB_PRODUCT_ID = 'TB-5101';
type KbTarget = 'mainImgs' | 'detailImgs' | 'videos' | 'whiteImg' | 'sceneImg';
const kbPick = ref<{ type: MaterialType; target: KbTarget; title: string } | null>(null);
const openKbPick = (type: MaterialType, target: KbTarget, title: string) => { kbPick.value = { type, target, title }; };
/* 确认选用：选中素材回填对应模块（单图位取首张覆盖，图集/视频追加） */
const onKbConfirm = (list: CbMaterial[]) => {
  const pick = kbPick.value;
  kbPick.value = null;
  if (!pick || !list.length) return;
  const urls = list.map((m) => m.thumb);
  if (pick.target === 'whiteImg') d.whiteImg = urls[0];
  else if (pick.target === 'sceneImg') d.sceneImg = urls[0];
  else if (pick.target === 'mainImgs') d.mainImgs.push(...urls);
  else if (pick.target === 'detailImgs') d.detailImgs.push(...urls);
  else if (pick.target === 'videos') d.videos.push(...urls);
  pushToast(`已添加 ${list.length} 个素材至「${pick.title}」`);
};
/* ---------- 规格/SKU 联动模型：SKU 行＝种子（d.skus）投影，字段编辑直写种子 ----------
   快捷弹窗里复制/新增只落一条种子，详情表格里就只有一行；详情改的值写回种子，弹窗再开即同步 */
interface SgSpec { name: string; values: string[] }
type SgSeed = (typeof d.skus)[number];
interface SgSku { key: string; vals: Record<string, string>; name: string; src: SgSeed }
/* 颜色分类/款式两维取自种子 colors/styles；维度与字段的对应按稳定 id 建档，规格拖拽重排不会对调 */
const specs = reactive<SgSpec[]>([
  { name: '颜色分类', values: [...d.colors] },
  { name: '款式', values: [...d.styles] },
]);
const specIds = ref<string[]>(specs.map((_, i) => `sgp${i}`));
let specIdSeed = specs.length;
const dimField = new Map<string, 'color' | 'style'>();
specIds.value.forEach((id, si) => { if (si === 0) dimField.set(id, 'color'); else if (si === 1) dimField.set(id, 'style'); });
/* 第三维起种子无对应字段，属性值记在侧表（key＝种子原对象） */
const extraVals = new WeakMap<object, Record<string, string>>();
const tSkus = ref<SgSku[]>([]);
const skuKeyOf = (vals: Record<string, string>) => [...specIds.value].sort().map((id) => vals[id]).filter(Boolean).join(' / ');
const comboOf = (vals: Record<string, string>) => specIds.value.map((id) => vals[id]).filter(Boolean).join(' + ');
const filledSpecCount = computed(() => specs.filter((s) => s.values.length > 0).length);
const seedVals = (s: SgSeed): Record<string, string> => {
  const vals: Record<string, string> = { ...(extraVals.get(toRaw(s)) ?? {}) };
  for (const id of specIds.value) {
    const f = dimField.get(id);
    if (f) vals[id] = s[f] ?? '';
  }
  return vals;
};
const writeSeedVals = (s: SgSeed, vals: Record<string, string>) => {
  const extra: Record<string, string> = {};
  for (const id of specIds.value) {
    const f = dimField.get(id);
    if (f) (s as Record<string, string>)[f] = vals[id] ?? '';
    else if (vals[id]) extra[id] = vals[id];
  }
  extraVals.set(toRaw(s), extra);
};
/* 维度增删改后把两维属性值写回种子 colors/styles，快捷弹窗与详情读到同一批值 */
const writeDims = () => {
  const next: Record<'color' | 'style', string[]> = { color: [], style: [] };
  specIds.value.forEach((id, si) => { const f = dimField.get(id); if (f) next[f] = [...specs[si].values]; });
  d.colors = next.color;
  d.styles = next.style;
};
/* 结构变更（改名/删值/删维度）前先快照种子与其属性值，改完按快照写回，剔除已失效的维度与属性值 */
const snapSeeds = () => d.skus.map((s) => ({ s, vals: seedVals(s) }));
const allCombos = (): Record<string, string>[] => {
  let combos: Record<string, string>[] = [{}];
  specs.forEach((s, si) => {
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
  if (filledSpecCount.value === 0) { tSkus.value = []; return; }
  /* 仅有种子支撑的组合出行：不再按笛卡尔积补空行 */
  tSkus.value = allCombos()
    .map((vals) => {
      const src = findSeed(vals);
      return src ? { key: skuKeyOf(vals), vals, name: comboOf(vals), src } : null;
    })
    .filter((r): r is SgSku => r !== null);
};
syncSkus();
/* 新增属性值：为含该值的新组合补建种子 SKU（默认值可继续编辑），保留「加值即出行」的创建流程 */
const mkSeed = (vals: Record<string, string>): SgSeed => {
  const n = d.skus.length;
  return {
    color: '', style: '', name: comboOf(vals), code: `SKU-${String(n + 1).padStart(3, '0')}`,
    series: `编码${String.fromCharCode(65 + (n % 26))}`, cost: '0', price: d.price, stock: '0',
  };
};
const materialize = (id?: string, val?: string) => {
  for (const vals of allCombos()) {
    if (id && vals[id] !== val) continue;
    if (findSeed(vals)) continue;
    d.skus.push(mkSeed(vals));
    writeSeedVals(d.skus[d.skus.length - 1], vals);
  }
};
/* rowspan 合并 */
const samePrefix = (a: SgSku, b: SgSku, di: number) => {
  for (let k = 0; k <= di; k++) {
    const id = specIds.value[k];
    if (a.vals[id] !== b.vals[id]) return false;
  }
  return true;
};
const skuMerge = computed(() => {
  const rows = tSkus.value;
  const grid: { show: boolean; span: number }[][] = rows.map(() => specs.map(() => ({ show: false, span: 1 })));
  for (let di = 0; di < specs.length; di++) {
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
  const [m] = specs.splice(from, 1);
  specs.splice(i, 0, m);
  const [mid] = specIds.value.splice(from, 1);
  specIds.value.splice(i, 0, mid);
  specDrag.value = i;
};
const askRemoveSpec = (si: number) => {
  const sp = specs[si];
  askConfirm('删除规格', `删除规格「${sp.name || `规格${si + 1}`}」将同时删除其下全部属性值（${sp.values.length} 个），SKU 列表将按剩余规格重新生成，是否继续？`, () => {
    const snap = snapSeeds();
    const dropId = specIds.value[si];
    snap.forEach(({ vals }) => { delete vals[dropId]; });
    specs.splice(si, 1);
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
      writeSeedVals(s, vals);
      s.name = comboOf(vals) || s.name;
    });
    d.skus = keep.map(({ s }) => s);
    writeDims();
    syncSkus();
    pushToast('规格已删除，SKU 已按剩余规格重新生成');
  });
};
const addSpec = () => {
  specs.push({ name: `规格${specs.length + 1}`, values: [] });
  specIds.value.push(`sgp${specIdSeed++}`);
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
  const [m] = specs[si].values.splice(fv, 1);
  specs[si].values.splice(vi, 0, m);
  valDrag.value = `${si}-${vi}`;
};
const askRemoveSpecValue = (si: number, vi: number) => {
  const v = specs[si].values[vi];
  const id = specIds.value[si];
  const last = specs[si].values.length === 1;
  const snap = snapSeeds();
  const n = snap.filter(({ vals }) => vals[id] === v).length;
  askConfirm('删除属性值', last
    ? `删除属性值「${v}」后规格「${specs[si].name || `规格${si + 1}`}」将无属性值，SKU 列表暂隐该规格列，其余 SKU 保留，是否继续？`
    : `删除属性值「${v}」将同步删除包含该属性值的 ${n} 个 SKU，是否继续？`, () => {
      specs[si].values.splice(vi, 1);
      /* 非末值：连带删除引用该值的种子 SKU；末值：保留 SKU，仅摘掉该维度的属性值 */
      const keep = last ? snap : snap.filter(({ vals }) => vals[id] !== v);
      keep.forEach(({ s, vals }) => {
        if (vals[id] === v) delete vals[id];
        writeSeedVals(s, vals);
      });
      d.skus = keep.map(({ s }) => s);
      writeDims();
      syncSkus();
      pushToast(last ? `属性值「${v}」已删除，规格「${specs[si].name || `规格${si + 1}`}」无属性值暂隐于 SKU 列表` : `属性值「${v}」及关联的 ${n} 个 SKU 已删除`);
    });
};
/* 属性值改名：写回种子 color/style，SKU 名称跟随自动组合名 */
const onSpecValChange = (si: number, vi: number, e: Event) => {
  const input = e.target as HTMLInputElement;
  const nv = input.value.trim();
  const ov = specs[si].values[vi];
  if (nv === ov) { input.value = ov; return; }
  if (!nv) { pushToast('属性值不能为空', 'warning'); input.value = ov; return; }
  if (specs[si].values.includes(nv)) { pushToast('该属性值已存在', 'warning'); input.value = ov; return; }
  const id = specIds.value[si];
  const snap = snapSeeds();
  specs[si].values[vi] = nv;
  snap.forEach(({ s, vals }) => {
    if (vals[id] !== ov) return;
    vals[id] = nv;
    writeSeedVals(s, vals);
    s.name = comboOf(vals) || s.name;
  });
  writeDims();
  syncSkus();
};
const addSpecValue = (si: number) => {
  const v = (specAddVals.value[si] ?? '').trim();
  if (!v) return;
  if (specs[si].values.includes(v)) { pushToast('该属性值已存在', 'warning'); return; }
  specs[si].values.push(v);
  specAddVals.value[si] = '';
  /* 新值对应的组合在种子里落地为真实 SKU 行（可继续编辑），与快捷弹窗口径一致 */
  writeDims();
  materialize(specIds.value[si], v);
  syncSkus();
};
/* 删除 SKU：删种子行，孤立属性值联动删除 */
const askRemoveSku = (sku: SgSku) => {
  const others = tSkus.value.filter((s) => s.key !== sku.key);
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
        const idx = specs[si].values.indexOf(v);
        if (idx >= 0) specs[si].values.splice(idx, 1);
      });
      keep.forEach(({ s, vals }) => {
        orphans.forEach(({ id }) => { if (vals[id]) delete vals[id]; });
        writeSeedVals(s, vals);
      });
      d.skus = keep.map(({ s }) => s);
      writeDims();
      syncSkus();
      pushToast(orphans.length ? `SKU「${sku.name}」及属性值${orphanTxt}已删除` : `SKU「${sku.name}」已删除`);
    },
  );
};
</script>

<template>
  <div class="sg-page sgd-page">
    <div class="sgd-hero">
      <div class="sgd-top">
        <div class="sgd-top-left">
          <button class="sgd-back" title="返回" @click="emit('back')">←</button>
          <span class="sgd-top-title">商品详情</span>
        </div>
        <div class="cpd-top-acts">
          <template v-if="editing">
            <button class="sg-btn" @click="editing = false">取消编辑</button>
            <button class="sg-btn primary" @click="editing = false; pushToast('版本已保存')">保存版本</button>
          </template>
          <template v-else>
            <button v-if="showLog" class="sg-btn" @click="logOpen = true">操作日志</button>
            <button v-if="!hideEdit" class="sg-btn" @click="editing = true">编辑</button>
          </template>
        </div>
      </div>

      <div v-if="p.offType" class="sgd-offnotice">
        <span class="sgd-offnotice-t">下架原因：</span>
        <span>{{ p.offReason }}</span>
      </div>

      <div class="sgd-cat">
        <span class="sgd-cat-label">当前类目<i>*</i></span>
        <span>{{ p.category.join(' / ') }}</span>
      </div>
      <div class="sgd-head">
        <div class="sgd-gallery">
          <div class="sgd-thumbs">
            <img v-for="(t, i) in thumbs" :key="i" class="sgd-thumb" :class="i === 0 ? 'active' : ''" :src="t" alt="" />
          </div>
          <img class="sgd-main" :src="p.img" alt="" />
        </div>
        <div class="sgd-info">
          <h2>{{ p.title }}</h2>
          <div class="sgd-fields">
            <div class="sgd-frow"><span>商品来源：</span><b>{{ p.source }}</b></div>
            <div class="sgd-frow"><span>版本号：</span><b>{{ p.version }}</b></div>
            <div class="sgd-frow"><span>商品ID：</span><b>{{ p.id }}</b></div>
            <div class="sgd-frow"><span>操作人：</span><b>{{ p.operator }}</b></div>
            <div v-if="p.status !== 'draft' && p.status !== 'auditing'" class="sgd-frow">
              <span>上架店铺：</span>
              <b class="sgd-store">
                <span class="store-logo"><img :src="PLATFORM_LOGO[p.storePlatform]" alt="" /></span>
                {{ p.store }}
              </b>
            </div>
            <div v-if="p.shelfTime" class="sgd-frow"><span>上架时间：</span><b>{{ p.shelfTime }}</b></div>
            <div v-if="p.submitTime" class="sgd-frow"><span>提交审核时间：</span><b>{{ p.submitTime }}</b></div>
            <div v-if="p.createTime" class="sgd-frow"><span>创建时间：</span><b>{{ p.createTime }}</b></div>
            <div v-if="p.offTime" class="sgd-frow"><span>下架时间：</span><b>{{ p.offTime }}</b></div>
            <div v-if="p.offReason" class="sgd-frow"><span>下架原因：</span><b class="sgd-red">{{ p.offReason }}</b></div>
            <div v-if="p.rejectReason" class="sgd-frow"><span>驳回原因：</span><b class="sgd-red">{{ p.rejectReason }}</b></div>
            <div class="sgd-frow">
              <span>商品状态：</span>
              <b><span class="sgd-tag" :class="statusTag.cls">{{ statusTag.text }}</span></b>
            </div>
            <div v-if="p.status !== 'draft'" class="sgd-frow"><span>商品策略：</span><b>{{ p.strategy }}</b></div>
          </div>
        </div>
      </div>
    </div>

    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品规格</div>
        <button class="sgd-collapse" @click="specOpen = !specOpen">{{ specOpen ? '∨ 收起' : '∧ 展开' }}</button>
      </div>
      <div v-if="specOpen" class="sgd-sec-body">
        <template v-if="editing">
          <div
            v-for="(sp, si) in specs"
            :key="specIds[si]"
            class="cpd-spec-card"
            :class="specDrag === si ? 'dragging' : ''"
            :draggable="specArm === si"
            @dragstart="specDrag = si"
            @dragover.prevent="onSpecDragOver(si)"
            @dragend="specArm = null; specDrag = null; syncSkus()"
          >
            <div class="cpd-spec-head">
              <span class="cpd-drag" title="拖动排序规格" @mousedown="specArm = si" @mouseup="specArm = null">⋮</span>
              <input v-model="sp.name" class="cpd-vspec-name" placeholder="规格名" />
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
          <div v-for="sp in specs" :key="sp.name" class="cpd-spec-card cpd-spec-view">
            <div class="cpd-spec-head"><span class="cpd-vspec-name">{{ sp.name }}</span></div>
            <div class="cpd-vspec-vals">
              <span v-for="v in sp.values" :key="v" class="cpd-vspec-chip">{{ v }}</span>
              <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
            </div>
          </div>
        </template>
      </div>
    </div>

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
          <table :class="['sg-table', 'cpd-sku-table', 'cpd-tsku', skuShow ? 'cpd-tsku-x' : '']">
            <thead>
              <tr>
                <th>排序</th>
                <th>SKU图</th>
                <th>编码图片</th>
                <template v-for="(sp, di) in specs" :key="specIds[di]"><th v-if="sp.values.length">{{ sp.name || `规格${di + 1}` }}</th></template>
                <th>组合</th>
                <th>SKU名称</th>
                <th>商品编码</th>
                <th>系列编码</th>
                <th>库存数</th>
                <template v-if="skuShow">
                  <th>成本价</th>
                </template>
                <th>售价</th>
                <th v-if="editing">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, ri) in tSkus" :key="s.key">
                <td>{{ ri + 1 }}</td>
                <td><img class="sgd-sku-img" :src="p.img" alt="" /></td>
                <td><img class="sgd-sku-img" :src="p.img" alt="" /></td>
                <template v-for="(sid, di) in specIds" :key="sid">
                  <td v-if="specs[di].values.length && skuMerge[ri][di].show" class="cpd-merge-cell" :rowspan="skuMerge[ri][di].span">{{ s.vals[specIds[di]] }}</td>
                </template>
                <td>{{ s.name }}</td>
                <td>
                  <input v-if="editing" v-model="s.src.name" class="cpd-cell-input cpd-cell-wide" />
                  <template v-else>{{ s.src.name }}</template>
                </td>
                <td><span class="cpd-code-outline">{{ s.src.code }}</span></td>
                <td><span v-if="s.src.series" class="sgd-code">{{ s.src.series }}</span><template v-else>0</template></td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.src.stock" class="cpd-cell-input" /><i>件</i></span>
                  <template v-else>{{ s.src.stock }}</template>
                </td>
                <template v-if="skuShow">
                  <td>{{ s.src.cost ? `${s.src.cost} 元` : '0 元' }}</td>
                </template>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.src.price" class="cpd-cell-input" /><i>元</i></span>
                  <template v-else>{{ s.src.price }} 元</template>
                </td>
                <td v-if="editing" class="cpd-row-ops">
                  <a href="#" @click.prevent="openMatch(s)">查看</a>
                  <a class="danger" href="#" @click.prevent="askRemoveSku(s)">删除</a>
                </td>
              </tr>
              <tr v-if="tSkus.length === 0"><td :colspan="(skuShow ? 11 : 10) + filledSpecCount - (editing ? 0 : 1)" class="cpd-vsku-empty">—</td></tr>
            </tbody>
          </table>
        </div>
        <div class="sgd-price">
          <span>一口价<i>*</i></span>
          <input v-if="editing" class="sg-input sgd-price-input" :value="d.price" />
          <b v-else>{{ d.price }}</b>
        </div>
      </div>
    </div>

    <CpdMediaSec
      title="3:4主图"
      note="最多上传5张图片，支持最小尺寸750*1000，固定宽高比例为3:4，大小20M以内"
      :imgs="d.mainImgs"
      :ratio34="true"
      :editing="editing"
      kb-pick
      :on-kb-pick="() => openKbPick('主图', 'mainImgs', '3:4主图')"
    />

    <CpdMediaSec
      title="商品详情"
      note="宝贝详情图【高度≤2】，超出将被裁剪，建议宽度≥1440像素以确保清晰，拖动模块可排序"
      :imgs="d.detailImgs"
      :editing="editing"
      kb-pick
      :on-kb-pick="() => openKbPick('详情图', 'detailImgs', '商品详情')"
    />

    <CpdMediaSec
      title="商品视频"
      note="视频要求：时长5秒~5分钟；宽高比支持1:1、3:4、9:16（9:16视频商品详情页不展示，可在首页推荐、微详情等展示）最多可上传5个"
      :imgs="d.videos"
      :video="true"
      :editing="editing"
      kb-pick
      :on-kb-pick="() => openKbPick('视频', 'videos', '商品视频')"
    />

    <CpdMediaSec
      title="通用商品白底图"
      note="宽高800*800，所报名商品台的白底图，纯白边，图片饱满（上下贴边或左右贴边），将作为个性化素材展示"
      :imgs="[d.whiteImg]"
      :editing="editing"
      kb-pick
      :on-kb-pick="() => openKbPick('白底图', 'whiteImg', '通用商品白底图')"
    />

    <CpdMediaSec
      title="通用商品场景图(非必填)"
      note="基本要求：带有背景，无牛皮癣，主体清晰完整不变形、不拼图、不含图、不留白边，建议主体突出与背景和谐。背景不宜过于复杂，色调自然。格式要求：800*800px，JPG/JPEG、小于3M"
      :imgs="[d.sceneImg]"
      :editing="editing"
      kb-pick
      :on-kb-pick="() => openKbPick('场景图', 'sceneImg', '通用商品场景图')"
    />

    <div class="sgd-foot">
      <button v-for="f in foot" :key="f.text" class="sgd-foot-btn" :class="f.cls">{{ f.text }}</button>
    </div>

    <!-- 操作日志弹层：当前商品全流程操作（时间/操作人/类型/明细）；Modal 样式挂 .pm-page 作用域需 pm-host 容器 -->
    <div v-if="logOpen" class="pm-page pm-host">
      <Modal title="操作日志" :sub="p.title" size="xl" @close="logOpen = false">
        <div class="sg-tabs sgd-log-tabs">
          <button type="button" class="sg-tab" :class="logTab === 'detail' ? 'active' : ''" @click="logTab = 'detail'">操作明细</button>
          <button type="button" class="sg-tab" :class="logTab === 'sales' ? 'active' : ''" @click="logTab = 'sales'">销量变化</button>
        </div>
        <table v-if="logTab === 'detail'" class="sg-table sgd-log-table">
          <thead>
            <tr>
              <th :style="{ width: '170px' }">操作时间</th>
              <th :style="{ width: '90px' }">操作人</th>
              <th :style="{ width: '110px' }">操作类型</th>
              <th>操作明细</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(l, i) in logs" :key="i">
              <td>{{ l.time }}</td>
              <td>{{ l.person }}</td>
              <td><span :class="sgOpsLogCls(l.type)">{{ l.type }}</span></td>
              <td>{{ l.detail }}</td>
            </tr>
          </tbody>
        </table>
        <!-- 销量变化：按操作节点正序展示增量与累计（下架后停增） -->
        <table v-else class="sg-table sgd-log-table">
          <thead>
            <tr>
              <th :style="{ width: '170px' }">操作时间</th>
              <th :style="{ width: '90px' }">操作人</th>
              <th :style="{ width: '110px' }">操作类型</th>
              <th :style="{ width: '110px' }">销量变化</th>
              <th>累计销量</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(n, i) in salesNodes" :key="i">
              <td>{{ n.time }}</td>
              <td>{{ n.person }}</td>
              <td><span :class="sgOpsLogCls(n.type)">{{ n.type }}</span></td>
              <td><span :class="n.delta > 0 ? 'sgd-delta-up' : 'sgd-delta-flat'">{{ n.delta > 0 ? `+${n.delta}` : '0' }}</span></td>
              <td>{{ n.total }}</td>
            </tr>
          </tbody>
        </table>
      </Modal>
    </div>

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

    <!-- SKU 商品匹配视图（编辑态「查看」入口） -->
    <SkuMatchView
      :open="!!matchSku"
      :sku="matchSku"
      :product="{ title: p.title, thumb: p.img, category: p.category.join('/'), price: d.skus[0]?.price ?? '' }"
      @close="matchSku = null"
      @saved="matchSku = null"
    />

    <!-- 推荐素材选用抽屉（素材库） -->
    <KbPickDrawer
      :open="!!kbPick"
      :type="kbPick?.type ?? '主图'"
      :product-id="KB_PRODUCT_ID"
      @close="kbPick = null"
      @confirm="onKbConfirm"
    />
  </div>
</template>
