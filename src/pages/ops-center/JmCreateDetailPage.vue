<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, toRaw, watch } from 'vue';
import type { CreateRow } from './data';
import { sgJmDetail } from './shopGoodsData';
import { pushToast } from '../../components/toast';
import CpdMediaSec from './CpdMediaSec.vue';
import ImgSizeCrop from './ImgSizeCrop.vue';
import MaterialCenter from './MaterialCenter.vue';

const props = defineProps<{ row: CreateRow; startEdit?: boolean }>();
const emit = defineEmits<{ (e: 'back'): void; (e: 'openPub'): void }>();

/** 京麦（京东 POP）商品创建详情页：展示形式与淘宝/视频号详情一致（sgd- 与 cpd- 类名同构）；
 *  规格/SKU 交互与淘宝版一致：拖拽排序、属性值改名、删除联动、rowspan 合并、笛卡尔积自动生成 */
const editing = ref(!!props.startEdit);
const showMaterial = ref(false);
const specOpen = ref(true);
const skuShow = ref(true);
/* 深拷贝防污染共用种子 */
const d = reactive(JSON.parse(JSON.stringify(sgJmDetail)) as typeof sgJmDetail);

/* ---------- 规格/SKU 联动模型（与淘宝版一致） ---------- */
interface JmSkuRow { key: string; vals: Record<string, string>; name: string; skuName: string; attrs: string; jdPrice: string; marketPrice: string; stock: string; outerId: string; series: string; cost: string; upc: string; status: string }
/* 规格维度稳定 id：拖拽重排不改变 SKU key */
const specIds = ref<string[]>(d.saleAttrs.map((_, i) => `jsp${i}`));
let specIdSeed = d.saleAttrs.length;
/* 手动删除的 SKU key：笛卡尔积重算时过滤 */
const skuDeleted = ref<string[]>([]);
const jmSkus = ref<JmSkuRow[]>([]);
const skuKeyOf = (vals: Record<string, string>) => [...specIds.value].sort().map((id) => vals[id]).filter(Boolean).join(' / ');
const skuNameOf = (vals: Record<string, string>) => specIds.value.map((id) => vals[id]).filter(Boolean).join(' ');
const filledSpecCount = computed(() => d.saleAttrs.filter((s) => s.values.length > 0).length);
const syncSkus = () => {
  if (filledSpecCount.value === 0) { jmSkus.value = []; return; }
  let combos: Record<string, string>[] = [{}];
  d.saleAttrs.forEach((s, si) => {
    if (s.values.length === 0) return;
    const id = specIds.value[si];
    const next: Record<string, string>[] = [];
    for (const c of combos) for (const v of s.values) next.push({ ...c, [id]: v });
    combos = next;
  });
  const old = new Map(jmSkus.value.map((s) => [s.key, s]));
  const deleted = new Set(skuDeleted.value);
  jmSkus.value = combos
    .map((vals, i) => {
      const key = skuKeyOf(vals);
      const prev = old.get(key);
      if (prev) return { ...prev, vals, key, name: skuNameOf(vals) };
      const texts = Object.values(vals);
      const base = d.skus.find((s) => texts.every((t) => s.name.includes(t)));
      const attrs = specIds.value.map((id) => {
        const si = specIds.value.indexOf(id);
        return `${d.saleAttrs[si]?.name ?? ''}:${vals[id] ?? ''}`;
      }).join(' ');
      return {
        key, vals, name: skuNameOf(vals),
        skuName: base?.name ?? skuNameOf(vals),
        attrs,
        jdPrice: base?.jdPrice ?? '39.90',
        marketPrice: base?.marketPrice ?? '59.90',
        stock: base?.stock ?? '0',
        outerId: base?.outerId ?? `${d.itemNum}-N${i + 1}`,
        series: base?.series ?? `编码${String.fromCharCode(65 + (i % 26))}`,
        cost: base?.cost ?? '0',
        upc: base?.upc ?? `69012345678${String(90 + i).slice(-2)}`,
        status: base?.status ?? '上架',
      };
    })
    .filter((s) => !deleted.has(s.key));
};
syncSkus();
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
    skuDeleted.value = skuDeleted.value.filter((k) => !k.split(' / ').some((v) => sp.values.includes(v)));
    d.saleAttrs.splice(si, 1);
    specIds.value.splice(si, 1);
    specAddVals.value.splice(si, 1);
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
  const n = jmSkus.value.filter((s) => s.vals[id] === v).length;
  askConfirm('删除属性值', last
    ? `删除属性值「${v}」后规格「${d.saleAttrs[si].name || `规格${si + 1}`}」将无属性值，SKU 列表暂隐该规格列，其余 SKU 保留，是否继续？`
    : `删除属性值「${v}」将同步删除包含该属性值的 ${n} 个 SKU，是否继续？`, () => {
      d.saleAttrs[si].values.splice(vi, 1);
      skuDeleted.value = skuDeleted.value.filter((k) => !k.includes(v));
      syncSkus();
      pushToast(last ? `属性值「${v}」已删除，规格「${d.saleAttrs[si].name || `规格${si + 1}`}」无属性值暂隐于 SKU 列表` : `属性值「${v}」及关联的 ${n} 个 SKU 已删除`);
    });
};
/* 属性值改名 */
const onSpecValChange = (si: number, vi: number, e: Event) => {
  const input = e.target as HTMLInputElement;
  const nv = input.value.trim();
  const ov = d.saleAttrs[si].values[vi];
  if (nv === ov) { input.value = ov; return; }
  if (!nv) { pushToast('属性值不能为空', 'warning'); input.value = ov; return; }
  if (d.saleAttrs[si].values.includes(nv)) { pushToast('该属性值已存在', 'warning'); input.value = ov; return; }
  d.saleAttrs[si].values[vi] = nv;
  const id = specIds.value[si];
  skuDeleted.value = skuDeleted.value.map((k) => k.replace(ov, nv));
  jmSkus.value.forEach((s) => {
    if (s.vals[id] !== ov) return;
    s.vals = { ...s.vals, [id]: nv };
    s.key = skuKeyOf(s.vals);
    s.name = skuNameOf(s.vals);
    s.attrs = specIds.value.map((sid) => {
      const idx = specIds.value.indexOf(sid);
      return `${d.saleAttrs[idx]?.name ?? ''}:${s.vals[sid] ?? ''}`;
    }).join(' ');
  });
};
const addSpecValue = (si: number) => {
  const v = (specAddVals.value[si] ?? '').trim();
  if (!v) return;
  if (d.saleAttrs[si].values.includes(v)) { pushToast('该属性值已存在', 'warning'); return; }
  d.saleAttrs[si].values.push(v);
  specAddVals.value[si] = '';
  syncSkus();
};
/* 删除 SKU：孤立属性值联动删除 */
const askRemoveSku = (sku: JmSkuRow) => {
  const others = jmSkus.value.filter((s) => s.key !== sku.key);
  const orphans = specIds.value
    .map((id, si) => ({ si, id, v: sku.vals[id] }))
    .filter(({ id, v }) => !others.some((s) => s.vals[id] === v));
  const orphanTxt = orphans.map((o) => `「${o.v}」`).join('、');
  askConfirm(
    '删除 SKU',
    orphans.length
      ? `删除 SKU「${sku.name}」后，属性值${orphanTxt}未被其它 SKU 引用，将一并删除，是否继续？`
      : `确认删除 SKU「${sku.name}」？其属性值仍被其它 SKU 引用，将予以保留。`,
    () => {
      skuDeleted.value.push(sku.key);
      orphans.forEach(({ si, v }) => {
        const idx = d.saleAttrs[si].values.indexOf(v);
        if (idx >= 0) d.saleAttrs[si].values.splice(idx, 1);
      });
      syncSkus();
      pushToast(orphans.length ? `SKU「${sku.name}」及属性值${orphanTxt}已删除` : `SKU「${sku.name}」已删除`);
    },
  );
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
            <span class="ic">▯</span>手机预览
          </button>
          <button class="cpd-side-btn" @click="pushToast('AI审查完成：未发现合规问题')">
            <span class="ic">◉</span>AI审查
          </button>
          <button v-if="editing" class="cpd-side-btn" @click="showMaterial = true">
            <span class="ic">❐</span>素材
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
          <div v-for="sp in d.saleAttrs" :key="sp.name" class="cpd-spec-card cpd-spec-view">
            <div class="cpd-spec-head"><span class="cpd-vspec-name">{{ sp.name }}</span></div>
            <div class="cpd-vspec-vals">
              <span v-for="v in sp.values" :key="v" class="cpd-vspec-chip">{{ v }}</span>
              <span v-if="sp.values.length === 0" class="cpd-vsku-empty">—</span>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- 商品SKU（与淘宝版一致：rowspan 合并＋全字段编辑＋删除联动） -->
    <div class="sgd-sec">
      <div class="sgd-sec-head">
        <div class="sgd-sec-title">商品SKU</div>
        <label class="sgd-sku-toggle">
          <input v-model="skuShow" type="checkbox" />
          展开明细
        </label>
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
                <th>京东价</th>
                <th>市场价</th>
                <th>库存</th>
                <th>商品编码</th>
                <th>系列编码</th>
                <th>条码</th>
                <th v-if="skuShow">成本价</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(s, ri) in jmSkus" :key="s.key">
                <td>{{ ri + 1 }}</td>
                <td><img class="sgd-sku-img" :src="row.thumb" alt="" /></td>
                <template v-for="(sid, di) in specIds" :key="sid">
                  <td v-if="d.saleAttrs[di].values.length && skuMerge[ri][di].show" class="cpd-merge-cell" :rowspan="skuMerge[ri][di].span">{{ s.vals[specIds[di]] }}</td>
                </template>
                <td>{{ s.name }}</td>
                <td>
                  <input v-if="editing" v-model="s.skuName" class="cpd-cell-input cpd-cell-wide" />
                  <template v-else>{{ s.skuName }}</template>
                </td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.jdPrice" class="cpd-cell-input" /><i>元</i></span>
                  <template v-else>¥{{ s.jdPrice }}</template>
                </td>
                <td>¥{{ s.marketPrice }}</td>
                <td>
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.stock" class="cpd-cell-input" /><i>件</i></span>
                  <template v-else>{{ s.stock }}</template>
                </td>
                <td><span class="cpd-code-outline">{{ s.outerId }}</span></td>
                <td><span class="sgd-code">{{ s.series }}</span></td>
                <td><span class="sgd-code">{{ s.upc }}</span></td>
                <td v-if="skuShow">
                  <span v-if="editing" class="cpd-cell-num"><input v-model="s.cost" class="cpd-cell-input" /><i>元</i></span>
                  <template v-else>{{ s.cost ? `${s.cost} 元` : '0 元' }}</template>
                </td>
                <td><span class="sgd-tag" :class="s.status === '上架' ? 'green' : 'gray'">{{ s.status }}</span></td>
                <td class="cpd-row-ops">
                  <a href="#" @click.prevent>查看</a>
                  <a v-if="editing" class="danger" href="#" @click.prevent="askRemoveSku(s)">删除</a>
                </td>
              </tr>
              <tr v-if="jmSkus.length === 0"><td :colspan="(skuShow ? 14 : 13) + filledSpecCount" class="cpd-vsku-empty">—</td></tr>
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
    />
    <CpdMediaSec
      title="长图"
      note="商品长图 material.rectangleImages：非必填，最多1张，比例3:4（部分类目可使用），尺寸480*640~1125*1500px，小于3M"
      :imgs="d.rectImgs"
      :ratio34="true"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.rectImgs, i)"
    />
    <CpdMediaSec
      title="商品详情（PC端）*"
      note="PC端商详 productDetailDesc.desc：必填，最少1张，详情描述图，图片宽度750~1500px、单图高度≤1500px、小于3M，总高度建议≤15000px"
      :imgs="d.detailPc"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailPc, i)"
    />
    <CpdMediaSec
      title="商品详情（APP端）(非必填)"
      note="APP端商详 productDetailDesc.mobileDesc：非必填，0~8张，移动端详情描述，京麦移动端支持装修0~8张图、文本不超过500字"
      :imgs="d.detailApp"
      :editing="editing"
      add-label="添加图片"
      :on-preview="(i) => openPreview(d.detailApp, i)"
    />
    <CpdMediaSec
      title="白底图"
      note="白底图 material.whiteBackGroundImages：非必填，最多1张，纯白边、无牛皮癣/logo/阴影，图片饱满，将作为个性化素材展示"
      :imgs="[d.whiteImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.whiteImg], i)"
    />
    <CpdMediaSec
      title="透明图"
      note="透明图 material.transparentImages：非必填，最多1张，透明背景商品图，用于搜索/活动素材"
      :imgs="[d.transparentImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.transparentImg], i)"
    />
    <CpdMediaSec
      title="场景图(非必填)"
      note="场景图 SKU素材 sku-materials：非必填，最多1张，带有背景、无牛皮癣、主体清晰完整，建议800*800px，JPG/JPEG、小于3M"
      :imgs="[d.sceneImg]"
      :editing="editing"
      :on-preview="(i) => openPreview([d.sceneImg], i)"
    />
    <CpdMediaSec
      title="商品视频"
      note="主图视频 material.videos：非必填，0~5个，时长5秒~60秒，宽高比支持1:1、3:4、9:16，最多可上传5个"
      :imgs="d.videos"
      :video="true"
      :editing="editing"
      add-label="添加视频"
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
  </div>
</template>
