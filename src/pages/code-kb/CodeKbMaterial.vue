<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import {
  cbSeries,
  productsOfSeries, materialsOfProduct, materialsOfSeries,
  distinctIdCountOfSeries,
  materialTypeCountsOfSeries, materialCountOfSeries,
  totalSalesOfSeries,
  materialTypeIcon, fmtSales, MATERIAL_TYPES,
  type CbMaterial, type CbSeries, type MaterialType,
} from './codeKbData';

/**
 * 系列编码素材库（重构版）
 * 维度：以「系列编码」为行的分页列表（公司有百万级系列编码，不能平铺展示素材）
 * 每行展示：去重后关联ID数 + 各类型素材数（主图/详情图/SKU图/白底图/场景图/视频）
 * 点击「查看详情」打开右侧抽屉：按类型看销量 TOP10 推荐，或分页查看该系列全部素材
 * 关联ID去重：同一商品详情(spuId)发布到多个店铺产生的多个ID只计一个
 */

const CATEGORIES = Array.from(new Set(cbSeries.map((s) => s.category)));
const STATUSES = ['生效', '待审', '停用', '风险'];
type TypeSel = '全部' | MaterialType;

/* ---------- 列表筛选 ---------- */
const emptyFilter = { kw: '', category: '', status: '' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value }; page.value = 1; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; page.value = 1; };

interface SeriesRow {
  s: CbSeries;
  distinctId: number;
  totalSales: number;
  counts: Record<MaterialType, number>;
}
const allRows = computed<SeriesRow[]>(() => cbSeries.map((s) => ({
  s,
  distinctId: distinctIdCountOfSeries(s.id),
  totalSales: totalSalesOfSeries(s.id),
  counts: materialTypeCountsOfSeries(s.id),
})));
const rows = computed(() => allRows.value.filter((r) => {
  const f = applied.value;
  if (f.kw) { const k = f.kw.trim().toLowerCase(); if (!(r.s.id.toLowerCase().includes(k) || r.s.name.toLowerCase().includes(k))) return false; }
  if (f.category && r.s.category !== f.category) return false;
  if (f.status && r.s.status !== f.status) return false;
  return true;
}));

/* ---------- 列表分页 ---------- */
const page = ref(1);
const pageSize = ref(5);
const totalPages = computed(() => Math.max(1, Math.ceil(rows.value.length / pageSize.value)));
const pagedRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const goPage = (n: number) => { page.value = Math.min(Math.max(1, n), totalPages.value); };
const onPageSize = (v: string) => { const n = parseInt(v, 10); if (n) { pageSize.value = n; page.value = 1; } };
watch(totalPages, (t) => { if (page.value > t) page.value = t; });

/* ---------- 详情抽屉 ---------- */
const drawer = ref<CbSeries | null>(null);
const drawerMode = ref<'top' | 'all'>('top');
const curType = ref<TypeSel>('全部');
const openDrawer = (s: CbSeries) => { drawer.value = s; drawerMode.value = 'top'; curType.value = '全部'; curCode.value = '全部'; curId.value = null; idKw.value = ''; idSearchOpen.value = false; idSort.value = 'desc'; };
const closeDrawer = () => { drawer.value = null; };

const drawerDistinct = computed(() => drawer.value ? distinctIdCountOfSeries(drawer.value.id) : 0);
const drawerMatTotal = computed(() => drawer.value ? materialCountOfSeries(drawer.value.id) : 0);

/* 商品编码豆腐块：全部 / 单编码；顶部选择层，两种模式共用 */
const idList = computed(() => (drawer.value ? productsOfSeries(drawer.value.id) : []));
const curCode = ref<string>('全部');
const codeMaterialsOf = (code: string): CbMaterial[] => {
  if (!drawer.value) return [];
  const list = code === '全部' ? materialsOfSeries(drawer.value.id) : materialsOfProduct(code);
  return list.slice().sort((a, b) => b.sales - a.sales);
};
const codeMaterials = computed<CbMaterial[]>(() => codeMaterialsOf(curCode.value));
const codeCounts = computed<Record<string, number>>(() => {
  const c: Record<string, number> = {};
  for (const m of codeMaterials.value) c[m.type] = (c[m.type] || 0) + 1;
  return c;
});
watch(drawer, () => { curCode.value = '全部'; curId.value = null; });

/* 按类型 TOP10（当前编码下销量最高的十张推荐，仅生效素材） */
const topOf = (t: MaterialType) => codeMaterials.value.filter((m) => m.type === t && m.status === '生效').slice(0, 10);
const typesWithData = computed<MaterialType[]>(() =>
  drawer.value ? MATERIAL_TYPES.filter((t) => (codeCounts.value[t] || 0) > 0) : []);

/* 全部素材：编码关联的商品ID（堆叠卡）＋点击展开该ID素材按类型分组 */
const curId = ref<string | null>(null);
const idCards = computed(() => {
  if (!drawer.value) return [];
  let list = productsOfSeries(drawer.value.id);
  if (curCode.value !== '全部') list = list.filter((p) => p.id === curCode.value);
  const kw = idKw.value.trim();
  if (kw) list = list.filter((p) => p.name.includes(kw));
  return list.slice().sort((a, b) => (idSort.value === 'desc' ? b.sales - a.sales : a.sales - b.sales));
});
const idThumbs = (pid: string) => materialsOfProduct(pid).slice().sort((a, b) => b.sales - a.sales).slice(0, 3);
const expandSections = computed(() =>
  !curId.value ? [] : MATERIAL_TYPES.map((t) => ({
    type: t,
    list: materialsOfProduct(curId.value!).filter((m) => m.type === t).sort((a, b) => b.sales - a.sales),
  })).filter((s) => s.list.length > 0));
const VIEW_OPTIONS = ['按推荐', '全部素材'];
const onViewChange = (v: string) => {
  drawerMode.value = v === '按推荐' ? 'top' : 'all';
  curId.value = null;
};
/* 全部素材工具：商品名称搜索（隐藏式：默认仅图标，点击展开输入框）＋销量升/降序 */
const idKw = ref('');
const idSearchOpen = ref(false);
const idSearchRef = ref<HTMLInputElement | null>(null);
const toggleIdSearch = () => {
  idSearchOpen.value = !idSearchOpen.value;
  if (idSearchOpen.value) void nextTick(() => idSearchRef.value?.focus());
  else idKw.value = '';
};
const idSort = ref<'desc' | 'asc'>('desc');
const SORT_OPTIONS = ['销量降序', '销量升序'];
const onSortChange = (v: string) => { idSort.value = v === '销量升序' ? 'asc' : 'desc'; };
watch(curCode, () => { curId.value = null; });

/* ---------- 素材看图：全屏暗幕查看器（规范同商品创建详情/知识库） ---------- */
const pvList = ref<CbMaterial[]>([]);
const pvIdx = ref(0);
const pvZoom = ref(1);
const previewOpen = computed(() => pvList.value.length > 0);
const curPv = computed<CbMaterial | null>(() => pvList.value[pvIdx.value] ?? null);
const openPreview = (list: CbMaterial[], m: CbMaterial) => { pvList.value = list; pvIdx.value = Math.max(0, list.indexOf(m)); pvZoom.value = 1; };
const closePreview = () => { pvList.value = []; pvIdx.value = 0; pvZoom.value = 1; };
const stepPv = (v: number) => { const n = pvList.value.length; pvIdx.value = (pvIdx.value + v + n) % n; pvZoom.value = 1; };
const pvZoomBy = (d: number) => { pvZoom.value = Math.min(3, Math.max(0.5, +(pvZoom.value + d).toFixed(2))); };
const onPvKey = (e: KeyboardEvent) => {
  if (!previewOpen.value) return;
  if (e.key === 'Escape') closePreview();
  else if (e.key === 'ArrowLeft') stepPv(-1);
  else if (e.key === 'ArrowRight') stepPv(1);
};
watch(previewOpen, (v) => {
  if (v) document.addEventListener('keydown', onPvKey);
  else document.removeEventListener('keydown', onPvKey);
});
onBeforeUnmount(() => document.removeEventListener('keydown', onPvKey));
</script>

<template>
  <div class="sg-page cb-page">
    <div class="cb-head">
      <span class="cb-head-t">系列编码素材库</span>
      <span class="cb-head-sub">以系列编码为维度；关联ID按商品详情去重，点击查看详情看各类型销量TOP10推荐</span>
    </div>

    <!-- 筛选 -->
    <div class="sg-filter">
      <div class="sg-grid cb-lib-grid">
        <div class="sg-field">
          <label>系列编码/名称</label>
          <input class="sg-input" placeholder="输入系列编码或名称" :value="filter.kw" @input="filter.kw = ($event.target as HTMLInputElement).value" @keyup.enter="doSearch" />
        </div>
        <div class="sg-field">
          <label>类目</label>
          <BubbleSelect class-name="sg-select" default-value="全部类目" :options="CATEGORIES" @change="(v: string) => (filter.category = v)" />
        </div>
        <div class="sg-field">
          <label>状态</label>
          <BubbleSelect class-name="sg-select" default-value="全部状态" :options="STATUSES" @change="(v: string) => (filter.status = v)" />
        </div>
        <div class="sg-actions">
          <button class="sg-btn" @click="doReset">重置</button>
          <button class="sg-btn primary" @click="doSearch">查询</button>
        </div>
      </div>
    </div>

    <!-- 系列编码列表 -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table cb-lib-table">
          <thead>
            <tr>
              <th style="width: 120px">系列编码</th>
              <th style="width: 100px">关联ID数量</th>
              <th style="width: 100px">ID总销量</th>
              <th v-for="t in MATERIAL_TYPES" :key="t" style="width: 72px" class="cb-th-type">{{ t }}</th>
              <th style="width: 84px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in pagedRows" :key="r.s.id" @click="openDrawer(r.s)">
              <td><span class="cb-code" @click.stop="openDrawer(r.s)">{{ r.s.id }}</span></td>
              <td class="cb-td-num"><b class="cb-idnum">{{ r.distinctId }}</b></td>
              <td class="cb-td-num"><b class="cb-salesnum">{{ fmtSales(r.totalSales) }}</b></td>
              <td v-for="t in MATERIAL_TYPES" :key="t" class="cb-td-num" :class="{ zero: !r.counts[t] }">{{ r.counts[t] || '—' }}</td>
              <td><a class="sg-link" href="javascript:void(0)" @click.stop="openDrawer(r.s)">查看详情</a></td>
            </tr>
          </tbody>
        </table>
        <div v-if="rows.length === 0" class="sg-empty">
          <div class="sg-empty-wrap"><div class="sg-empty-icon">◌</div><div>暂无匹配的系列编码</div></div>
        </div>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ rows.length }} 个系列编码</div>
        <BubbleSelect class-name="ib-page-size" :default-value="pageSize + '条/页'" :options="['5条/页', '10条/页', '20条/页']" @change="onPageSize" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav" :disabled="page === 1" @click="goPage(page - 1)">‹</button>
          <button v-for="n in totalPages" :key="n" class="ib-pagebtn" :class="page === n ? 'active' : ''" @click="goPage(n)">{{ n }}</button>
          <button class="ib-pagebtn nav" :disabled="page === totalPages" @click="goPage(page + 1)">›</button>
        </div>
      </div>
    </div>

    <!-- 详情抽屉 -->
    <Teleport to="body">
      <div v-if="drawer" class="cb-drawer-mask" @click.self="closeDrawer">
        <div class="cb-drawer">
          <div class="cb-drawer-head">
            <div class="cb-dh-title">
              <span>{{ drawer.name }}</span>
            </div>
            <button class="cb-drawer-close" @click="closeDrawer">×</button>
          </div>

          <div class="cb-drawer-summary">
            <span>关联ID <b>{{ drawerDistinct }}</b></span>
            <span class="cb-dot">·</span>
            <span>素材总数 <b>{{ drawerMatTotal }}</b></span>
          </div>

          <!-- 顶部：全部 + 系列下各商品编码豆腐块（两种模式共用选择层） -->
          <div class="cb-codeblocks">
            <button class="cb-cblock" :class="curCode === '全部' ? 'on' : ''" @click="curCode = '全部'">
              <b>全部</b>
              <span>全部商品编码 · {{ idList.length }}</span>
            </button>
            <button v-for="p in idList" :key="p.id" class="cb-cblock" :class="curCode === p.id ? 'on' : ''" @click="curCode = p.id">
              <b>{{ p.id }}</b>
              <span>素材 {{ materialsOfProduct(p.id).length }}</span>
            </button>
          </div>

          <div class="cb-drawer-body">
            <!-- 工具行：左＝类型tab（按推荐）/ 搜索+排序（全部素材），右＝查看类型下拉，同一行对齐 -->
            <div class="cb-toolbar">
              <div v-if="drawerMode === 'top'" class="cb-typetabs">
                <button class="cb-ttab" :class="curType === '全部' ? 'on' : ''" @click="curType = '全部'">全部</button>
                <button v-for="t in typesWithData" :key="t" class="cb-ttab" :class="curType === t ? 'on' : ''" @click="curType = t">{{ t }}</button>
              </div>
              <div v-else-if="drawerMode === 'all'" class="cb-idtools">
                <!-- 隐藏式搜索：默认仅图标；展开后图标收入输入框内右侧 -->
                <div v-if="idSearchOpen" class="cb-idsearchwrap">
                  <input ref="idSearchRef" class="cb-idsearch" :value="idKw" placeholder="搜索商品名称" @input="idKw = ($event.target as HTMLInputElement).value" />
                  <button type="button" class="cb-idsearchbtn on" title="搜索商品名称" @click="toggleIdSearch">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>
                  </button>
                </div>
                <button v-else type="button" class="cb-idsearchbtn" title="搜索商品名称" @click="toggleIdSearch">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>
                </button>
              </div>
              <!-- 右侧：排序（仅全部素材）＋查看类型，同组靠右 -->
              <div class="cb-toolright">
                <BubbleSelect v-if="drawerMode === 'all'" class-name="cb-viewsel" :value="idSort === 'desc' ? '销量降序' : '销量升序'" :options="SORT_OPTIONS" @change="onSortChange" />
                <BubbleSelect class-name="cb-viewsel" :value="drawerMode === 'top' ? '按推荐' : '全部素材'" :options="VIEW_OPTIONS" @change="onViewChange" />
              </div>
            </div>
            <!-- 模式一：按类型 TOP10 推荐 -->
            <template v-if="drawerMode === 'top'">
              <div v-if="curType === '全部'">
                <div v-for="t in typesWithData" :key="t" class="cb-sec">
                  <div class="cb-sec-t">{{ t }} · 销量 TOP{{ topOf(t).length }}</div>
                  <div v-if="topOf(t).length" class="cb-grid">
                    <div v-for="(m, i) in topOf(t)" :key="m.id" class="cb-card" @click="openPreview(topOf(t), m)">
                      <span class="cb-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
                      <span class="cb-risk" :class="m.status === '违规' ? 'risk' : 'ok'">{{ m.status === '违规' ? '风险' : '正常' }}</span>
                      <div class="cb-thumb"><img v-if="m.thumb" :src="m.thumb" :alt="m.name" /><div v-else class="cb-ph">{{ materialTypeIcon(m.type) }}</div></div>
                      <div class="cb-card-info">
                        <div class="cb-card-name" :title="m.name">{{ m.name }}</div>
                        <div class="cb-card-meta">销量 {{ fmtSales(m.sales) }}</div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="cb-empty-inline">该类型暂无「生效」素材可推荐</div>
                </div>
              </div>
              <div v-else class="cb-sec">
                <div class="cb-sec-t">{{ curType }} · 销量 TOP{{ topOf(curType as MaterialType).length }}</div>
                <div v-if="topOf(curType as MaterialType).length" class="cb-grid">
                  <div v-for="(m, i) in topOf(curType as MaterialType)" :key="m.id" class="cb-card" @click="openPreview(topOf(curType as MaterialType), m)">
                    <span class="cb-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
                    <span class="cb-risk" :class="m.status === '违规' ? 'risk' : 'ok'">{{ m.status === '违规' ? '风险' : '正常' }}</span>
                    <div class="cb-thumb"><img v-if="m.thumb" :src="m.thumb" :alt="m.name" /><div v-else class="cb-ph">{{ materialTypeIcon(m.type) }}</div></div>
                    <div class="cb-card-info">
                      <div class="cb-card-name" :title="m.name">{{ m.name }}</div>
                      <div class="cb-card-meta">销量 {{ fmtSales(m.sales) }}</div>
                    </div>
                  </div>
                </div>
                <div v-else class="cb-empty-inline">该类型暂无「生效」素材可推荐</div>
              </div>
            </template>

            <!-- 模式二：全部素材＝编码关联的商品ID堆叠卡，点击展开该ID素材 -->
            <template v-else-if="drawerMode === 'all'">
              <div class="cb-idgrid">
                <template v-for="p in idCards" :key="p.id">
                  <div class="cb-idcard" :class="curId === p.id ? 'on' : ''" @click="curId = curId === p.id ? null : p.id">
                    <div class="cb-stack">
                      <img v-for="(m, i) in idThumbs(p.id)" :key="m.id" :class="'s' + i" :src="m.thumb" :alt="m.name" />
                      <span class="cb-stack-badge">{{ materialsOfProduct(p.id).length }}</span>
                    </div>
                    <div class="cb-idcard-id">{{ p.id }}</div>
                    <div class="cb-idcard-name" :title="p.shop + ' · ' + p.platform">{{ p.shop }} · {{ p.platform }}</div>
                    <div class="cb-idcard-meta">销量 {{ fmtSales(p.sales) }}</div>
                  </div>
                  <!-- 展开内联在网格中：占整行并把后续ID卡挤下，不单独开模块 -->
                  <div v-if="curId === p.id" class="cb-expand">
                    <div v-for="sec in expandSections" :key="sec.type" class="cb-sec">
                      <div class="cb-sec-t">{{ sec.type }} · {{ sec.list.length }}</div>
                      <div class="cb-grid">
                        <div v-for="m in sec.list" :key="m.id" class="cb-card" @click="openPreview(sec.list, m)">
                          <span class="cb-risk" :class="m.status === '违规' ? 'risk' : 'ok'">{{ m.status === '违规' ? '风险' : '正常' }}</span>
                          <div class="cb-thumb"><img v-if="m.thumb" :src="m.thumb" :alt="m.name" /><div v-else class="cb-ph">{{ materialTypeIcon(m.type) }}</div></div>
                          <div class="cb-card-info">
                            <div class="cb-card-name" :title="m.name">{{ m.name }}</div>
                            <div class="cb-card-meta">销量 {{ fmtSales(m.sales) }}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
              </div>
              <div v-if="!idCards.length" class="cb-empty-inline">该编码下暂无关联商品ID</div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 素材看图：全屏暗幕查看器（暗幕＋右上关闭＋底部翻页/缩放工具条，规范同商品创建详情） -->
    <Teleport to="body">
      <div v-if="previewOpen" class="cb-pvmask">
        <button type="button" class="cb-pvclose" title="关闭（Esc）" @click="closePreview">✕</button>
        <div class="cb-pvstage" @click.self="closePreview">
          <div class="cb-pvwrap" :style="{ transform: `scale(${pvZoom})` }">
            <img v-if="curPv && curPv.thumb" :src="curPv.thumb" :alt="curPv.name" />
            <div v-else class="cb-pvph">{{ curPv?.type }}</div>
          </div>
        </div>
        <div class="cb-pvbar">
          <button type="button" class="cb-pvbtn" title="上一张" :disabled="pvList.length < 2" @click="stepPv(-1)">‹</button>
          <span class="cb-pvcount">{{ pvIdx + 1 }} / {{ pvList.length }}</span>
          <button type="button" class="cb-pvbtn" title="下一张" :disabled="pvList.length < 2" @click="stepPv(1)">›</button>
          <i class="cb-pvdiv" />
          <button type="button" class="cb-pvbtn" title="缩小" :disabled="pvZoom <= 0.5" @click="pvZoomBy(-0.25)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M7.5 10.5h6" /></svg>
          </button>
          <button type="button" class="cb-pvbtn" title="放大" :disabled="pvZoom >= 3" @click="pvZoomBy(0.25)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21M7.5 10.5h6M10.5 7.5v6" /></svg>
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cb-page { padding: 0; }
.cb-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cb-head-t { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #202532; }
.cb-head-t::before { content: ''; width: 3px; height: 14px; background: #4f7cff; border-radius: 2px; }
.cb-head-sub { font-size: 12px; color: #8b92a1; }

/* 筛选 */
.sg-grid.cb-lib-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.sg-grid.cb-lib-grid .sg-actions { grid-column: 1 / -1; justify-content: flex-end; }

/* 列表 */
.cb-lib-table tbody tr { cursor: pointer; }
.cb-lib-table tbody tr:hover { background: #f7f9ff; }
.cb-th-type { text-align: left; }
.cb-td-num { text-align: left; font-variant-numeric: tabular-nums; color: #202532; }
.cb-td-num.zero { color: #c3c9d6; }
.cb-code { font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: #4f7cff; font-weight: 600; cursor: pointer; }
.cb-idnum { font-size: 14px; color: #202532; }
.cb-salesnum { font-size: 14px; color: #f0762b; }

/* 抽屉 */
.cb-drawer-mask { position: fixed; inset: 0; background: rgba(31, 35, 41, 0.45); z-index: 1500; }
.cb-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(1080px, 94vw); background: #fff; z-index: 1501; display: flex; flex-direction: column; box-shadow: -12px 0 40px rgba(26, 34, 56, 0.18); animation: cb-dr-in .22s ease; }
@keyframes cb-dr-in { from { transform: translateX(40px); opacity: .5; } to { transform: none; opacity: 1; } }
.cb-drawer-head { display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid #edf0f5; }
.cb-dh-title { display: flex; align-items: center; gap: 10px; font-size: 15px; }
.cb-dh-title span { color: #202532; font-weight: 500; }
.cb-drawer-close { margin-left: auto; border: 0; background: transparent; font-size: 24px; line-height: 1; color: #8a94a6; cursor: pointer; }
.cb-drawer-close:hover { color: #232b3a; }

.cb-drawer-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 24px; font-size: 13px; color: #5b6478; border-bottom: 1px solid #f2f4f8; }
.cb-drawer-summary b { color: #202532; font-size: 14px; }
.cb-drawer-summary i { font-style: normal; color: #f0762b; font-size: 11px; margin-left: 2px; }
.cb-dot { color: #c3c9d6; }

/* 查看类型/排序下拉：无底色，文字右对齐＋间距＋箭头 */
.cb-viewsel { min-width: 88px; }
.cb-viewsel :deep(.bselect-trigger) { justify-content: flex-end; gap: 8px; font-size: 13px; color: #202532; }
.cb-viewsel :deep(.bselect-text) { flex: none; }

/* 工具行：左工具 + 右查看下拉，同一行对齐；下划线 tab 压在行底分隔线上 */
.cb-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; border-bottom: 1px solid #edf0f5; margin-bottom: 24px; }
.cb-idtools { display: flex; align-items: center; gap: 16px; height: 40px; }
.cb-toolright { display: flex; align-items: center; gap: 16px; }
.cb-idsearch { width: 220px; height: 32px; padding: 0 34px 0 12px; border: 1px solid #e3e7ef; border-radius: 8px; background: #fff; font-size: 13px; color: #202532; outline: none; }
.cb-idsearch::placeholder { color: #a6adbc; }
.cb-idsearch:focus { border-color: #4f7cff; }
.cb-idsearchwrap { position: relative; }
.cb-idsearchwrap .cb-idsearchbtn { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); }
.cb-idsearchwrap .cb-idsearchbtn:hover { background: transparent; }
.cb-idsearchbtn { width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: #596070; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.cb-idsearchbtn:hover { background: #f5f7fb; color: #202532; }
.cb-idsearchbtn.on { color: #4f7cff; }

/* 类型 tab：下划线式 */
.cb-typetabs { display: flex; gap: 32px; }
.cb-ttab { position: relative; height: 40px; padding: 0 4px; border: 0; background: transparent; font-size: 14px; color: #596070; cursor: pointer; }
.cb-ttab.on { color: #4f7cff; font-weight: 600; }
.cb-ttab.on::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 1px; background: #4f7cff; }

.cb-drawer-body { flex: 1; overflow: auto; padding: 0 24px 32px; scrollbar-gutter: stable; }
.cb-sec { margin-bottom: 32px; }
.cb-sec-t { font-size: 14px; font-weight: 600; color: #202532; margin-bottom: 16px; }

.cb-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
.cb-card { position: relative; background: #fafbfd; border: 1px solid #eef0f5; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.cb-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, .07); }
.cb-rank { position: absolute; left: 6px; top: 6px; z-index: 2; width: 20px; height: 20px; border-radius: 6px; background: #cfd6e4; color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.cb-rank.hot { background: #f0762b; }
.cb-risk { position: absolute; right: 6px; top: 6px; z-index: 2; padding: 1px 8px; border-radius: 10px; font-size: 11px; line-height: 18px; color: #fff; }
.cb-risk.ok { background: #22a06b; }
.cb-risk.risk { background: #e5484d; }
.cb-thumb { aspect-ratio: 1 / 1; background: #eef0f5; display: grid; place-items: center; overflow: hidden; }
.cb-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cb-ph { font-size: 24px; }
.cb-card-info { padding: 10px 12px 12px; }
.cb-card-name { font-size: 12px; color: #202532; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-card-meta { font-size: 11px; color: #8b92a1; margin-top: 2px; }
.cb-empty-inline { padding: 28px; text-align: center; color: #a6adbc; font-size: 13px; background: #fafbfd; border-radius: 8px; }

/* 全部素材：商品ID堆叠卡（小倾角/居中/副行省略）＋内联展开区 */
.cb-idgrid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px; }
.cb-idcard { text-align: center; cursor: pointer; padding: 12px 6px; border-radius: 10px; transition: background .15s; }
.cb-idcard:hover { background: #f5f7fb; }
.cb-idcard.on { background: #eef2ff; }
.cb-stack { position: relative; width: 124px; height: 86px; margin: 0 auto 10px; }
.cb-stack img { position: absolute; width: 72px; height: 72px; object-fit: cover; border-radius: 8px; background: #eef0f5; box-shadow: 0 2px 6px rgba(0, 0, 0, .12); }
.cb-stack img.s0 { z-index: 3; left: 0; top: 8px; transform: rotate(-3deg); border: 2px solid #4f7cff; }
.cb-stack img.s1 { z-index: 2; left: 24px; top: 3px; transform: rotate(2deg); }
.cb-stack img.s2 { z-index: 1; left: 44px; top: 0; transform: rotate(5deg); }
.cb-stack-badge { position: absolute; z-index: 4; right: 0; top: -4px; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 11px; background: #3a4152; color: #fff; font-size: 12px; font-weight: 600; display: grid; place-items: center; }
.cb-idcard-id { font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #4f7cff; font-weight: 600; }
.cb-idcard-name { font-size: 11px; color: #8b92a1; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-idcard-meta { font-size: 11px; color: #8b92a1; margin-top: 2px; }
.cb-expand { grid-column: 1 / -1; margin-top: 4px; padding: 16px 16px 4px; background: #f7f9fc; border-radius: 10px; }
.cb-expand .cb-sec { margin-bottom: 20px; }

/* 顶部商品编码豆腐块：全部 + 各编码，选中蓝底蓝字；副行仅素材数量 */
.cb-codeblocks { display: flex; gap: 12px; overflow-x: auto; padding: 12px 24px 14px; border-bottom: 1px solid #edf0f5; }
.cb-cblock { flex: none; min-width: 148px; max-width: 220px; padding: 10px 16px; border: 0; border-radius: 8px; background: #f0f2f7; cursor: pointer; text-align: center; transition: background .15s; }
.cb-cblock b { display: block; font-size: 13px; color: #202532; font-weight: 600; font-family: 'SF Mono', Consolas, monospace; }
.cb-cblock span { display: block; font-size: 11px; color: #8b92a1; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-cblock:hover { background: #e8ebf3; }
.cb-cblock.on { background: #eef2ff; }
.cb-cblock.on b { color: #4f7cff; }
.cb-cblock.on span { color: #7b96e8; }

/* 看图查看器：全屏暗幕＋右上关闭＋底部工具条（规范同 cpd-preview） */
.cb-pvmask { position: fixed; inset: 0; z-index: 2000; background: rgba(16, 17, 20, 0.92); display: flex; align-items: center; justify-content: center; }
.cb-pvclose { position: absolute; top: 16px; right: 16px; z-index: 2; width: 40px; height: 40px; border: none; border-radius: 6px; background: rgba(90, 94, 102, 0.9); color: #fff; font-size: 16px; line-height: 1; cursor: pointer; }
.cb-pvclose:hover { background: rgba(122, 127, 136, 0.95); }
.cb-pvstage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.cb-pvwrap { position: relative; transition: transform 0.15s ease; }
.cb-pvwrap > img { display: block; width: auto; height: auto; min-width: min(480px, calc(100vw - 240px)); min-height: min(480px, calc(100vh - 280px)); max-width: calc(100vw - 160px); max-height: calc(100vh - 160px); object-fit: contain; }
.cb-pvph { min-width: 320px; min-height: 320px; display: grid; place-items: center; color: rgba(255, 255, 255, 0.6); font-size: 14px; }
.cb-pvbar { position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 2; display: flex; align-items: center; gap: 4px; padding: 8px 12px; border-radius: 10px; background: rgba(30, 32, 37, 0.92); }
.cb-pvbtn { width: 32px; height: 32px; border: none; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; background: transparent; color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.cb-pvbtn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.14); }
.cb-pvbtn:disabled { opacity: 0.35; cursor: not-allowed; }
.cb-pvcount { min-width: 52px; text-align: center; font-size: 13px; color: rgba(255, 255, 255, 0.92); }
.cb-pvdiv { width: 1px; height: 18px; background: rgba(255, 255, 255, 0.22); margin: 0 6px; }
</style>
