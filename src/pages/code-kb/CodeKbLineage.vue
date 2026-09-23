<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  cbSeries, cbProducts, cbMaterials, cbSeriesMap, cbProductMap, cbMaterialMap,
  productsOfSeries, materialsOfProduct, topMaterialsOfSeries, cbLogs,
  seriesColor, productColor, materialColor, statusChipCls, materialTypeIcon, fmtSales,
  NODE_COLOR, type CbSeries, type CbProduct, type CbMaterial,
} from './codeKbData';

/**
 * 系列编码血缘图谱（重构版）
 * 三列流向：系列编码 → 关联商品ID → 商品ID 下的素材
 * 点击系列看其商品与 TOP10 推荐；点击商品看其素材；点击素材反向溯源到商品与系列
 */

type NodeSel =
  | { kind: 'series'; id: string }
  | { kind: 'product'; id: string }
  | { kind: 'material'; id: string };

/* ---------- 搜索 ---------- */
const kw = ref('');
const searchHits = computed(() => {
  const k = kw.value.trim().toLowerCase();
  if (!k) return [];
  const hits: { kind: 'series' | 'product' | 'material'; id: string; label: string; sub: string }[] = [];
  cbSeries.forEach((c) => { if (c.id.toLowerCase().includes(k) || c.name.toLowerCase().includes(k)) hits.push({ kind: 'series', id: c.id, label: c.id, sub: c.name }); });
  cbProducts.forEach((p) => { if (p.id.toLowerCase().includes(k) || p.name.toLowerCase().includes(k)) hits.push({ kind: 'product', id: p.id, label: p.id, sub: p.name }); });
  cbMaterials.forEach((m) => { if (m.id.toLowerCase().includes(k) || m.name.toLowerCase().includes(k)) hits.push({ kind: 'material', id: m.id, label: m.id, sub: m.name }); });
  return hits.slice(0, 20);
});
const searchOpen = ref(false);
const pickHit = (h: { kind: 'series' | 'product' | 'material'; id: string }) => {
  searchOpen.value = false; kw.value = '';
  if (h.kind === 'series') { curSeries.value = h.id; selProduct.value = productsOfSeries(h.id)[0]?.id || ''; sel.value = { kind: 'series', id: h.id }; }
  else if (h.kind === 'product') { const p = cbProductMap[h.id]; if (!p) return; curSeries.value = p.seriesId; selProduct.value = p.id; sel.value = { kind: 'product', id: p.id }; }
  else { const m = cbMaterialMap[h.id]; if (!m) return; const p = cbProductMap[m.productId]; curSeries.value = p.seriesId; selProduct.value = p.id; sel.value = { kind: 'material', id: h.id }; }
  resetView();
};

/* ---------- 筛选 ---------- */
const categories = Array.from(new Set(cbSeries.map((c) => c.category)));
const shops = Array.from(new Set(cbProducts.map((p) => p.shop)));
const filterCategory = ref('');
const filterShop = ref('');

/* ---------- 当前系列 / 选中商品 ---------- */
const curSeries = ref(cbSeries[2].id); // 默认风险系列，便于演示
const seriesObj = computed<CbSeries>(() => cbSeriesMap[curSeries.value]);
const seriesProducts = computed<CbProduct[]>(() => {
  let list = productsOfSeries(curSeries.value);
  if (filterShop.value) list = list.filter((p) => p.shop === filterShop.value);
  return list;
});
const selProduct = ref<string>(productsOfSeries(cbSeries[2].id)[0]?.id || '');
const selProductObj = computed(() => cbProductMap[selProduct.value]);
const productMaterials = computed<CbMaterial[]>(() => materialsOfProduct(selProduct.value));
const top10 = computed(() => topMaterialsOfSeries(curSeries.value, 10));

/* ---------- 折叠 ---------- */
const foldProducts = ref(false);
const foldMaterials = ref(false);

/* ---------- 选中节点 ---------- */
const sel = ref<NodeSel | null>({ kind: 'series', id: curSeries.value });
watch(curSeries, (v) => { sel.value = { kind: 'series', id: v }; });

/* ---------- 画布 pan/zoom ---------- */
const view = ref({ k: 1, tx: 0, ty: 0 });
const svgRef = ref<SVGSVGElement | null>(null);
const resetView = () => { view.value = { k: 1, tx: 0, ty: 0 }; };
const zoomBy = (d: number) => { view.value = { ...view.value, k: Math.max(0.4, Math.min(2.2, view.value.k * (1 + d))) }; };
const onWheel = (e: WheelEvent) => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 0.1 : -0.1); };
const dragging = ref(false);
const dragStart = ref({ x: 0, y: 0, tx: 0, ty: 0 });
const onMouseDown = (e: MouseEvent) => { dragging.value = true; dragStart.value = { x: e.clientX, y: e.clientY, tx: view.value.tx, ty: view.value.ty }; };
const onMouseMove = (e: MouseEvent) => { if (!dragging.value) return; view.value = { ...view.value, tx: dragStart.value.tx + (e.clientX - dragStart.value.x), ty: dragStart.value.ty + (e.clientY - dragStart.value.y) }; };
const onMouseUp = () => { dragging.value = false; };

/* ---------- 布局：三列 系列(左) → 商品(中) → 素材(右) ---------- */
const VB = { w: 1400, h: 780 };
const COL = { series: 200, product: 660, material: 1140 };
const CY = VB.h / 2;
const layout = computed(() => {
  const prods = foldProducts.value ? [] : seriesProducts.value;
  const pStep = prods.length > 1 ? Math.min(110, (VB.h - 160) / (prods.length - 1)) : 0;
  const pStart = CY - ((prods.length - 1) * pStep) / 2;
  const prodNodes = prods.map((p, i) => ({ p, x: COL.product, y: pStart + i * pStep, color: productColor(p) }));
  const mats = foldMaterials.value ? [] : productMaterials.value;
  const mStep = mats.length > 1 ? Math.min(96, (VB.h - 160) / (mats.length - 1)) : 0;
  const mStart = CY - ((mats.length - 1) * mStep) / 2;
  const matNodes = mats.map((m, i) => ({ m, x: COL.material, y: mStart + i * mStep, color: materialColor(m) }));
  return { prodNodes, matNodes };
});

/* ---------- 交互 ---------- */
const pickNode = (n: NodeSel) => {
  sel.value = n;
  if (n.kind === 'series') { curSeries.value = n.id; selProduct.value = productsOfSeries(n.id)[0]?.id || ''; }
  else if (n.kind === 'product') { const p = cbProductMap[n.id]; if (p) { curSeries.value = p.seriesId; selProduct.value = p.id; } }
  else { const m = cbMaterialMap[n.id]; if (m) { const p = cbProductMap[m.productId]; curSeries.value = p.seriesId; selProduct.value = p.id; } }
};

/* 风险定位 */
const locateRisk = () => {
  const riskSeries = cbSeries.find((c) => c.status === '风险');
  const riskMat = cbMaterials.find((m) => m.status === '违规');
  const riskProd = cbProducts.find((p) => p.status === '违规预警');
  if (!riskSeries && !riskMat && !riskProd) { pushToast('当前无风险节点'); return; }
  if (riskMat) { const p = cbProductMap[riskMat.productId]; curSeries.value = p.seriesId; selProduct.value = p.id; sel.value = { kind: 'material', id: riskMat.id }; }
  else if (riskProd) { curSeries.value = riskProd.seriesId; selProduct.value = riskProd.id; sel.value = { kind: 'product', id: riskProd.id }; }
  else if (riskSeries) { curSeries.value = riskSeries.id; sel.value = { kind: 'series', id: riskSeries.id }; }
  resetView();
  pushToast('已定位到风险节点');
};

/* 导出 */
const exportShot = () => {
  const svg = svgRef.value; if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `血缘图谱_${curSeries.value}.svg`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  pushToast('图谱已导出（SVG）');
};

/* 右侧详情 */
const selSeries = computed(() => sel.value?.kind === 'series' ? cbSeriesMap[sel.value.id] : undefined);
const selProd = computed(() => sel.value?.kind === 'product' ? cbProductMap[sel.value.id] : undefined);
const selMat = computed(() => sel.value?.kind === 'material' ? cbMaterialMap[sel.value.id] : undefined);
const selMatProduct = computed(() => selMat.value ? cbProductMap[selMat.value.productId] : undefined);
const selMatSeries = computed(() => selMatProduct.value ? cbSeriesMap[selMatProduct.value.seriesId] : undefined);
const selMatRank = computed(() => {
  if (!selMat.value || !selMatProduct.value) return -1;
  return topMaterialsOfSeries(selMatProduct.value.seriesId, 10).findIndex((m) => m.id === selMat.value!.id) + 1;
});

/* 关系留痕（与当前系列相关） */
const relatedLogs = computed(() => {
  const pids = new Set(seriesProducts.value.map((p) => p.id));
  const mids = new Set(seriesProducts.value.flatMap((p) => materialsOfProduct(p.id).map((m) => m.id)));
  return cbLogs.filter((l) => l.subject === curSeries.value || l.target === curSeries.value || pids.has(l.subject) || pids.has(l.target) || mids.has(l.subject));
});

const legend = [
  { color: NODE_COLOR.normal, label: '生效' },
  { color: NODE_COLOR.warn, label: '待审' },
  { color: NODE_COLOR.off, label: '停用/下架' },
  { color: NODE_COLOR.risk, label: '风险/违规' },
];
const gotoRisk = () => pushToast('跳转平台风险模块查看对应工单（Demo 模拟）');

/* 层级 */
const expandLevel = ref(2);
watch(expandLevel, (v) => { foldProducts.value = v < 1; foldMaterials.value = v < 2; });
</script>

<template>
  <div class="sg-page cb-lin">
    <div class="cb-head">
      <span class="cb-head-t">系列编码血缘图谱</span>
      <span class="cb-head-sub">系列编码 → 商品ID → 素材 三向血缘，支持双向溯源与发布推荐</span>
    </div>

    <!-- 顶部筛选&搜索 -->
    <div class="sg-filter">
      <div class="sg-grid cb-lin-grid">
        <div class="sg-field cb-search">
          <label>搜索</label>
          <div class="cb-search-wrap">
            <input class="sg-input" placeholder="系列编码 / 商品ID / 素材名称" v-model="kw" @focus="searchOpen = true" @input="searchOpen = true" />
            <div v-if="searchOpen && kw && searchHits.length" class="cb-search-pop">
              <div v-for="h in searchHits" :key="h.kind + h.id" class="cb-search-hit" @click="pickHit(h)">
                <span class="cb-hit-kind" :class="'k-' + h.kind">{{ h.kind === 'series' ? '系列' : h.kind === 'product' ? '商品' : '素材' }}</span>
                <b>{{ h.label }}</b>
                <span class="cb-hit-sub">{{ h.sub }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="sg-field">
          <label>类目</label>
          <BubbleSelect class-name="sg-select" default-value="全部类目" :options="categories" @change="(v: string) => (filterCategory = v)" />
        </div>
        <div class="sg-field">
          <label>店铺</label>
          <BubbleSelect class-name="sg-select" default-value="全部店铺" :options="shops" @change="(v: string) => (filterShop = v)" />
        </div>
        <div class="sg-actions">
          <div class="cb-level">
            <span class="cb-level-lbl">展开层级</span>
            <button v-for="lv in [0, 1, 2]" :key="lv" class="cb-level-btn" :class="expandLevel === lv ? 'on' : ''" @click="expandLevel = lv">L{{ lv }}</button>
          </div>
          <button class="sg-btn" @click="foldProducts = !foldProducts">{{ foldProducts ? '展开商品ID' : '折叠商品ID' }}</button>
          <button class="sg-btn" @click="foldMaterials = !foldMaterials">{{ foldMaterials ? '展开素材' : '折叠素材' }}</button>
          <button class="sg-btn danger-ghost" @click="locateRisk">定位风险节点</button>
          <button class="sg-btn primary" @click="exportShot">导出截图</button>
        </div>
      </div>
    </div>

    <div class="cb-lin-body">
      <div class="cb-canvas-wrap">
        <div class="cb-legend">
          <span v-for="l in legend" :key="l.label" class="cb-legend-item"><span class="cb-legend-dot" :style="{ background: l.color }" />{{ l.label }}</span>
        </div>
        <div class="cb-zoom">
          <button @click="zoomBy(0.15)">+</button>
          <button @click="zoomBy(-0.15)">−</button>
          <button @click="resetView">⟲</button>
          <span class="cb-zoom-val">{{ Math.round(view.k * 100) }}%</span>
        </div>

        <svg ref="svgRef" class="cb-canvas" :viewBox="`0 0 ${VB.w} ${VB.h}`" preserveAspectRatio="xMidYMid meet" @wheel="onWheel" @mousedown="onMouseDown">
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3c4" />
            </marker>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#eef1f7" stroke-width="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <g :transform="`translate(${view.tx},${view.ty}) scale(${view.k})`">
            <!-- 列标题 -->
            <text :x="COL.series" :y="40" text-anchor="middle" class="cb-col-t">系列编码</text>
            <text :x="COL.product" :y="40" text-anchor="middle" class="cb-col-t">商品ID</text>
            <text :x="COL.material" :y="40" text-anchor="middle" class="cb-col-t">素材</text>

            <!-- 系列 → 商品 -->
            <g v-for="pn in layout.prodNodes" :key="'e-' + pn.p.id">
              <line :x1="COL.series + 100" :y1="CY" :x2="pn.x - 100" :y2="pn.y" stroke="#94a3c4" stroke-width="1.5" marker-end="url(#arr)" />
              <text :x="(COL.series + 100 + pn.x - 100) / 2" :y="(CY + pn.y) / 2 - 4" text-anchor="middle" class="cb-lbl">归属系列</text>
            </g>
            <!-- 选中商品 → 素材 -->
            <g v-for="mn in layout.matNodes" :key="'em-' + mn.m.id">
              <line :x1="COL.product + 100" :y1="(layout.prodNodes.find((x) => x.p.id === selProduct)?.y) ?? CY" :x2="mn.x - 100" :y2="mn.y" stroke="#94a3c4" stroke-width="1.5" marker-end="url(#arr)" />
              <text :x="(COL.product + 100 + mn.x - 100) / 2" :y="(((layout.prodNodes.find((x) => x.p.id === selProduct)?.y) ?? CY) + mn.y) / 2 - 4" text-anchor="middle" class="cb-lbl">资产归属</text>
            </g>

            <!-- 系列节点 -->
            <g class="cb-node cb-node-center" :class="{ 'is-sel': sel?.kind === 'series' && sel.id === curSeries }" @click.stop="pickNode({ kind: 'series', id: curSeries })">
              <rect :x="COL.series - 100" :y="CY - 44" width="200" height="88" rx="14" fill="#4f7cff" :stroke="seriesColor(seriesObj)" stroke-width="3" />
              <text :x="COL.series" :y="CY - 16" text-anchor="middle" class="cb-node-ct">{{ seriesObj?.id }}</text>
              <text :x="COL.series" :y="CY + 4" text-anchor="middle" class="cb-node-cs">{{ seriesObj?.name }}</text>
              <text :x="COL.series" :y="CY + 24" text-anchor="middle" class="cb-node-cs">{{ seriesProducts.length }} 商品 · {{ seriesObj?.status }}</text>
            </g>

            <!-- 商品节点 -->
            <g v-for="pn in layout.prodNodes" :key="'p-' + pn.p.id" class="cb-node" :class="{ 'is-sel': (sel?.kind === 'product' && sel.id === pn.p.id) || selProduct === pn.p.id, 'is-risk': pn.p.status === '违规预警' }" @click.stop="pickNode({ kind: 'product', id: pn.p.id })">
              <rect :x="pn.x - 100" :y="pn.y - 30" width="200" height="60" rx="10" fill="#fff" :stroke="pn.color" stroke-width="2" />
              <text :x="pn.x" :y="pn.y - 8" text-anchor="middle" class="cb-node-t">{{ pn.p.id }}</text>
              <text :x="pn.x" :y="pn.y + 10" text-anchor="middle" class="cb-node-s">{{ pn.p.platform }} · 销量 {{ fmtSales(pn.p.sales) }}</text>
              <circle :cx="pn.x + 88" :cy="pn.y - 18" r="5" :fill="pn.color" />
            </g>

            <!-- 素材节点 -->
            <g v-for="mn in layout.matNodes" :key="'m-' + mn.m.id" class="cb-node" :class="{ 'is-sel': sel?.kind === 'material' && sel.id === mn.m.id, 'is-risk': mn.m.status === '违规' }" @click.stop="pickNode({ kind: 'material', id: mn.m.id })">
              <rect :x="mn.x - 100" :y="mn.y - 28" width="200" height="56" rx="10" fill="#fff" :stroke="mn.color" stroke-width="2" />
              <text :x="mn.x" :y="mn.y - 6" text-anchor="middle" class="cb-node-t">{{ mn.m.id }}</text>
              <text :x="mn.x" :y="mn.y + 12" text-anchor="middle" class="cb-node-s">{{ mn.m.type }} · 销量 {{ fmtSales(mn.m.sales) }}</text>
              <circle :cx="mn.x + 88" :cy="mn.y - 16" r="5" :fill="mn.color" />
            </g>
          </g>
        </svg>
      </div>

      <!-- 右侧详情 -->
      <aside class="cb-panel">
        <div class="cb-panel-head">
          <b>节点详情</b>
          <span v-if="sel" class="cb-panel-kind">{{ sel.kind === 'series' ? '系列编码' : sel.kind === 'product' ? '商品ID' : '素材' }}</span>
        </div>
        <div class="cb-panel-scroll">
          <!-- 系列编码 -->
          <div v-if="selSeries" class="cb-panel-body">
            <div class="cb-sec">
              <div class="cb-sec-t">系列基础信息</div>
              <div class="cb-kv"><span>系列编码</span><b>{{ selSeries.id }}</b></div>
              <div class="cb-kv"><span>名称</span><b>{{ selSeries.name }}</b></div>
              <div class="cb-kv"><span>类目</span><b>{{ selSeries.category }}</b></div>
              <div class="cb-kv"><span>状态</span><b><span class="cb-chip" :class="statusChipCls(selSeries.status)">{{ selSeries.status }}</span></b></div>
              <div class="cb-kv"><span>负责人</span><b>{{ selSeries.owner }}</b></div>
              <div class="cb-kv"><span>标签</span><b><span v-for="t in selSeries.tags" :key="t" class="cb-tag">{{ t }}</span></b></div>
              <div v-if="selSeries.riskNote" class="cb-risk-box"><span class="cb-risk-dot" />{{ selSeries.riskNote }}<a class="sg-link danger" href="javascript:void(0)" @click.prevent="gotoRisk">查看工单</a></div>
            </div>
            <div class="cb-sec">
              <div class="cb-sec-t">发布推荐 TOP{{ top10.length }}<span class="cb-sec-cnt">按素材销量</span></div>
              <div class="cb-list">
                <div v-for="(m, i) in top10" :key="m.id" class="cb-list-item" @click="pickNode({ kind: 'material', id: m.id })">
                  <span class="cb-mini-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
                  <div class="cb-list-l">
                    <div class="cb-list-id">{{ materialTypeIcon(m.type) }} {{ m.id }}</div>
                    <div class="cb-list-name">{{ m.name }}</div>
                    <div class="cb-list-meta">{{ m.productId }} · 销量 {{ fmtSales(m.sales) }}</div>
                  </div>
                </div>
                <div v-if="top10.length === 0" class="cb-list-empty">暂无生效素材</div>
              </div>
            </div>
            <div class="cb-sec">
              <div class="cb-sec-t">关联商品ID <span class="cb-sec-cnt">{{ productsOfSeries(selSeries.id).length }}</span></div>
              <div class="cb-list">
                <div v-for="p in productsOfSeries(selSeries.id)" :key="p.id" class="cb-list-item" @click="pickNode({ kind: 'product', id: p.id })">
                  <div class="cb-list-l">
                    <div class="cb-list-id">{{ p.id }}</div>
                    <div class="cb-list-name">{{ p.name }}</div>
                    <div class="cb-list-meta">{{ p.shop }} · 销量 {{ fmtSales(p.sales) }}</div>
                  </div>
                  <span class="cb-chip" :class="statusChipCls(p.status)">{{ p.status }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 商品ID -->
          <div v-else-if="selProd" class="cb-panel-body">
            <div class="cb-sec">
              <div class="cb-sec-t">商品基础信息</div>
              <div class="cb-kv"><span>商品ID</span><b>{{ selProd.id }}</b></div>
              <div class="cb-kv"><span>名称</span><b>{{ selProd.name }}</b></div>
              <div class="cb-kv"><span>店铺</span><b>{{ selProd.shop }}</b></div>
              <div class="cb-kv"><span>平台</span><b>{{ selProd.platform }}</b></div>
              <div class="cb-kv"><span>销量</span><b>{{ selProd.sales }}</b></div>
              <div class="cb-kv"><span>状态</span><b><span class="cb-chip" :class="statusChipCls(selProd.status)">{{ selProd.status }}</span></b></div>
              <div v-if="selProd.riskNote" class="cb-risk-box"><span class="cb-risk-dot" />{{ selProd.riskNote }}<a class="sg-link danger" href="javascript:void(0)" @click.prevent="gotoRisk">查看工单</a></div>
            </div>
            <div class="cb-sec">
              <div class="cb-sec-t">归属系列编码</div>
              <div class="cb-list-item solo" @click="pickNode({ kind: 'series', id: selProd.seriesId })">
                <div class="cb-list-l">
                  <div class="cb-list-id">{{ selProd.seriesId }}</div>
                  <div class="cb-list-name">{{ cbSeriesMap[selProd.seriesId]?.name }}</div>
                </div>
                <span class="cb-chip" :class="statusChipCls(cbSeriesMap[selProd.seriesId]?.status || '')">{{ cbSeriesMap[selProd.seriesId]?.status }}</span>
              </div>
            </div>
            <div class="cb-sec">
              <div class="cb-sec-t">商品素材 <span class="cb-sec-cnt">{{ materialsOfProduct(selProd.id).length }}</span></div>
              <div class="cb-list">
                <div v-for="m in materialsOfProduct(selProd.id)" :key="m.id" class="cb-list-item" @click="pickNode({ kind: 'material', id: m.id })">
                  <div class="cb-list-l">
                    <div class="cb-list-id">{{ materialTypeIcon(m.type) }} {{ m.id }}</div>
                    <div class="cb-list-name">{{ m.name }}</div>
                    <div class="cb-list-meta">{{ m.type }} · 销量 {{ fmtSales(m.sales) }}</div>
                  </div>
                  <span class="cb-chip" :class="statusChipCls(m.status)">{{ m.status }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 素材 -->
          <div v-else-if="selMat" class="cb-panel-body">
            <div class="cb-sec">
              <div class="cb-sec-t">素材详情</div>
              <div class="cb-mat-preview">
                <img v-if="selMat.thumb" :src="selMat.thumb" :alt="selMat.name" />
                <div v-else class="cb-mat-ph">{{ materialTypeIcon(selMat.type) }}</div>
              </div>
              <div class="cb-kv"><span>素材ID</span><b>{{ selMat.id }}</b></div>
              <div class="cb-kv"><span>名称</span><b>{{ selMat.name }}</b></div>
              <div class="cb-kv"><span>类型</span><b>{{ selMat.type }}</b></div>
              <div class="cb-kv"><span>贡献销量</span><b>{{ selMat.sales }}</b></div>
              <div class="cb-kv"><span>状态</span><b><span class="cb-chip" :class="statusChipCls(selMat.status)">{{ selMat.status }}</span></b></div>
              <div v-if="selMatRank > 0" class="cb-kv"><span>系列推荐</span><b><span class="cb-chip chip-rank">NO.{{ selMatRank }}</span></b></div>
              <div v-if="selMat.riskNote" class="cb-risk-box"><span class="cb-risk-dot" />{{ selMat.riskNote }}<a class="sg-link danger" href="javascript:void(0)" @click.prevent="gotoRisk">查看工单</a></div>
            </div>
            <div class="cb-sec">
              <div class="cb-sec-t">反向溯源</div>
              <div class="cb-chain">
                <span class="cb-chain-node series" @click="pickNode({ kind: 'series', id: selMatSeries?.id || '' })">{{ selMatSeries?.id }}</span>
                <span class="cb-chain-arrow">→</span>
                <span class="cb-chain-node product" @click="pickNode({ kind: 'product', id: selMatProduct?.id || '' })">{{ selMatProduct?.id }}</span>
                <span class="cb-chain-arrow">→</span>
                <span class="cb-chain-node material">{{ selMat.id }}</span>
              </div>
              <div class="cb-kv"><span>系列名称</span><b>{{ selMatSeries?.name }}</b></div>
              <div class="cb-kv"><span>商品名称</span><b>{{ selMatProduct?.name }}</b></div>
            </div>
          </div>

          <!-- 留痕 -->
          <div class="cb-sec cb-sec-logs">
            <div class="cb-sec-t">关系变更留痕</div>
            <div class="cb-logs">
              <div v-for="l in relatedLogs" :key="l.id" class="cb-log">
                <span class="cb-log-act" :class="'a-' + l.action">{{ l.action }}</span>
                <div class="cb-log-body">
                  <div class="cb-log-line"><b>{{ l.subject }}</b> → <b>{{ l.target }}</b></div>
                  <div class="cb-log-meta">{{ l.actor }} · {{ l.at }}</div>
                  <div v-if="l.note" class="cb-log-note">{{ l.note }}</div>
                </div>
              </div>
              <div v-if="relatedLogs.length === 0" class="cb-list-empty">暂无变更记录</div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.cb-lin { padding: 0; }
.cb-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cb-head-t { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #202532; }
.cb-head-t::before { content: ''; width: 3px; height: 14px; background: #4f7cff; border-radius: 2px; }
.cb-head-sub { font-size: 12px; color: #8b92a1; }

.sg-grid.cb-lin-grid { grid-template-columns: 1.4fr repeat(2, minmax(0, 1fr)); }
.sg-grid.cb-lin-grid .sg-actions { grid-column: 1 / -1; justify-content: flex-end; flex-wrap: wrap; }
.cb-search-wrap { position: relative; }
.cb-search-pop { position: absolute; left: 0; right: 0; top: calc(100% + 4px); background: #fff; border: 1px solid #e8ebf1; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); z-index: 20; max-height: 280px; overflow: auto; }
.cb-search-hit { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
.cb-search-hit:hover { background: #f5f7fb; }
.cb-hit-kind { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: #eef2ff; color: #4f7cff; flex: none; }
.cb-hit-kind.k-product { background: #e8f5ee; color: #16a34a; }
.cb-hit-kind.k-material { background: #fff4e0; color: #d97706; }
.cb-hit-sub { color: #8b92a1; margin-left: auto; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

.cb-level { display: inline-flex; align-items: center; gap: 6px; margin-right: 8px; }
.cb-level-lbl { font-size: 12px; color: #8b92a1; }
.cb-level-btn { border: 1px solid #e0e4ec; background: #fff; border-radius: 6px; padding: 3px 8px; font-size: 12px; color: #5b6478; cursor: pointer; }
.cb-level-btn.on { background: #4f7cff; border-color: #4f7cff; color: #fff; }
.sg-btn.danger-ghost { background: #fff; border-color: #f7c9cb; color: #e5484d; }
.sg-btn.danger-ghost:hover { background: #fdeced; }

.cb-lin-body { display: grid; grid-template-columns: 1fr 360px; gap: 16px; align-items: start; }
.cb-canvas-wrap { position: relative; background: #fff; border: 1px solid #e8ebf1; border-radius: 10px; overflow: hidden; height: calc(100vh - 240px); min-height: 520px; }
.cb-canvas { width: 100%; height: 100%; display: block; cursor: grab; user-select: none; }
.cb-canvas:active { cursor: grabbing; }
.cb-legend { position: absolute; left: 12px; top: 12px; background: rgba(255,255,255,0.94); border: 1px solid #e8ebf1; border-radius: 8px; padding: 8px 12px; display: flex; gap: 12px; z-index: 5; font-size: 12px; color: #5b6478; }
.cb-legend-item { display: inline-flex; align-items: center; gap: 4px; }
.cb-legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.cb-zoom { position: absolute; right: 12px; top: 12px; background: rgba(255,255,255,0.94); border: 1px solid #e8ebf1; border-radius: 8px; padding: 4px; display: flex; gap: 2px; z-index: 5; align-items: center; }
.cb-zoom button { border: 0; background: transparent; width: 26px; height: 26px; font-size: 14px; color: #5b6478; cursor: pointer; border-radius: 4px; }
.cb-zoom button:hover { background: #f0f2f7; color: #202532; }
.cb-zoom-val { font-size: 11px; color: #8b92a1; padding: 0 6px; min-width: 42px; text-align: center; }

.cb-canvas :deep(.cb-node) { cursor: pointer; }
.cb-canvas :deep(.cb-node:hover rect) { filter: brightness(0.98) drop-shadow(0 4px 8px rgba(0,0,0,0.1)); }
.cb-canvas :deep(.cb-node.is-sel rect) { stroke-width: 3.5; filter: drop-shadow(0 4px 12px rgba(79,124,255,0.28)); }
.cb-canvas :deep(.cb-node.is-risk rect) { animation: cbPulse 1.6s ease-in-out infinite; }
@keyframes cbPulse { 0%, 100% { filter: drop-shadow(0 0 0 rgba(229,72,77,0)); } 50% { filter: drop-shadow(0 0 8px rgba(229,72,77,0.55)); } }
.cb-canvas :deep(.cb-col-t) { font-size: 12px; fill: #a6adbc; letter-spacing: 2px; }
.cb-canvas :deep(.cb-node-t) { font-size: 13px; font-weight: 600; fill: #202532; font-family: 'SF Mono', Consolas, monospace; }
.cb-canvas :deep(.cb-node-s) { font-size: 11px; fill: #8b92a1; }
.cb-canvas :deep(.cb-node-ct) { font-size: 15px; font-weight: 700; fill: #fff; font-family: 'SF Mono', Consolas, monospace; }
.cb-canvas :deep(.cb-node-cs) { font-size: 11px; fill: rgba(255,255,255,0.9); }
.cb-canvas :deep(.cb-lbl) { font-size: 11px; fill: #8b92a1; }

.cb-panel { background: #fff; border: 1px solid #e8ebf1; border-radius: 10px; overflow: hidden; height: calc(100vh - 240px); min-height: 520px; display: flex; flex-direction: column; }
.cb-panel-head { padding: 12px 16px; border-bottom: 1px solid #eef0f5; display: flex; align-items: center; gap: 8px; font-size: 14px; background: #fafbfd; }
.cb-panel-kind { font-size: 11px; padding: 1px 8px; border-radius: 10px; background: #eef2ff; color: #4f7cff; }
.cb-panel-scroll { flex: 1; overflow: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
.cb-panel-body { flex: none; display: flex; flex-direction: column; gap: 12px; }
.cb-sec { border: 1px solid #eef0f5; border-radius: 8px; padding: 10px 12px; }
.cb-sec-logs { flex: none; }
.cb-sec-t { font-size: 13px; font-weight: 600; color: #202532; margin-bottom: 8px; display: flex; align-items: center; gap: 6px; }
.cb-sec-cnt { background: #eef2ff; color: #4f7cff; border-radius: 8px; padding: 0 6px; font-size: 11px; font-weight: 500; }
.cb-kv { display: flex; gap: 8px; font-size: 12px; color: #202532; padding: 3px 0; }
.cb-kv span { color: #8b92a1; flex: none; width: 68px; }
.cb-kv b { font-weight: 500; flex: 1; word-break: break-all; }
.cb-tag { display: inline-block; padding: 1px 8px; font-size: 11px; background: #f0f2f7; color: #5b6478; border-radius: 10px; margin-right: 4px; }
.cb-chip { display: inline-block; padding: 1px 8px; font-size: 11px; border-radius: 10px; line-height: 18px; }
.cb-chip.chip-ok { background: #e8f5ee; color: #16a34a; }
.cb-chip.chip-warn { background: #fff4e0; color: #d97706; }
.cb-chip.chip-off { background: #f0f2f7; color: #8b92a1; }
.cb-chip.chip-risk { background: #fdeced; color: #e5484d; }
.cb-chip.chip-rank { background: #fff1e6; color: #f0762b; }

.cb-list { display: flex; flex-direction: column; gap: 4px; }
.cb-list-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: #fafbfd; border-radius: 6px; cursor: pointer; border: 1px solid transparent; }
.cb-list-item:hover { background: #eef2ff; border-color: #d7dfff; }
.cb-list-item.solo { background: #eef2ff; border-color: #d7dfff; }
.cb-mini-rank { flex: none; width: 18px; height: 18px; border-radius: 5px; background: #cfd6e4; color: #fff; font-size: 11px; font-weight: 700; display: grid; place-items: center; }
.cb-mini-rank.hot { background: #f0762b; }
.cb-list-l { flex: 1; min-width: 0; }
.cb-list-id { font-family: 'SF Mono', Consolas, monospace; font-size: 11px; color: #4f7cff; }
.cb-list-name { font-size: 12px; color: #202532; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-list-meta { font-size: 11px; color: #8b92a1; }
.cb-list-empty { padding: 12px; text-align: center; color: #a6adbc; font-size: 12px; }

.cb-risk-box { margin-top: 8px; background: #fdeced; color: #c93036; padding: 8px 10px; border-radius: 6px; font-size: 12px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.cb-risk-box .sg-link { margin-left: auto; }
.cb-risk-dot { width: 6px; height: 6px; border-radius: 50%; background: #e5484d; display: inline-block; }

.cb-mat-preview { background: #f5f7fb; border-radius: 6px; margin-bottom: 8px; overflow: hidden; display: grid; place-items: center; min-height: 100px; }
.cb-mat-preview img { max-width: 100%; max-height: 160px; object-fit: contain; }
.cb-mat-ph { font-size: 22px; }

.cb-chain { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.cb-chain-node { font-family: 'SF Mono', Consolas, monospace; font-size: 11px; padding: 2px 8px; border-radius: 6px; cursor: pointer; }
.cb-chain-node.series { background: #eef2ff; color: #4f7cff; }
.cb-chain-node.product { background: #e8f5ee; color: #16a34a; }
.cb-chain-node.material { background: #fff4e0; color: #d97706; }
.cb-chain-arrow { color: #a6adbc; font-size: 11px; }

.cb-logs { display: flex; flex-direction: column; gap: 6px; }
.cb-log { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; border-bottom: 1px dashed #eef0f5; }
.cb-log:last-child { border-bottom: 0; }
.cb-log-act { font-size: 11px; padding: 1px 6px; border-radius: 4px; background: #eef2ff; color: #4f7cff; flex: none; }
.cb-log-act.a-解绑 { background: #fdeced; color: #e5484d; }
.cb-log-act.a-上传 { background: #e8f5ee; color: #16a34a; }
.cb-log-act.a-状态变更 { background: #f0f2f7; color: #5b6478; }
.cb-log-body { flex: 1; min-width: 0; }
.cb-log-line { font-size: 12px; color: #202532; }
.cb-log-line b { font-family: 'SF Mono', Consolas, monospace; }
.cb-log-meta { font-size: 11px; color: #8b92a1; }
.cb-log-note { font-size: 11px; color: #5b6478; margin-top: 2px; }
</style>
