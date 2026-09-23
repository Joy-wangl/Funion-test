<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  cbSeries, cbProductMap,
  productsOfSeries, materialsOfSeries,
  distinctIdCountOfSeries, rawIdCountOfSeries,
  materialTypeCountsOfSeries, materialCountOfSeries,
  topMaterialsByType, rankInType,
  materialTypeIcon, statusChipCls, fmtSales, MATERIAL_TYPES,
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
  distinctId: number; rawId: number;
  counts: Record<MaterialType, number>;
  matTotal: number;
}
const allRows = computed<SeriesRow[]>(() => cbSeries.map((s) => ({
  s,
  distinctId: distinctIdCountOfSeries(s.id),
  rawId: rawIdCountOfSeries(s.id),
  counts: materialTypeCountsOfSeries(s.id),
  matTotal: materialCountOfSeries(s.id),
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
const openDrawer = (s: CbSeries) => { drawer.value = s; drawerMode.value = 'top'; curType.value = '全部'; allPage.value = 1; };
const closeDrawer = () => { drawer.value = null; };

const drawerDistinct = computed(() => drawer.value ? distinctIdCountOfSeries(drawer.value.id) : 0);
const drawerRaw = computed(() => drawer.value ? rawIdCountOfSeries(drawer.value.id) : 0);
const drawerMatTotal = computed(() => drawer.value ? materialCountOfSeries(drawer.value.id) : 0);
const drawerCounts = computed(() => drawer.value ? materialTypeCountsOfSeries(drawer.value.id) : null);

/* 按类型 TOP10（销量最高的十张推荐，仅生效素材） */
const topOf = (t: MaterialType) => drawer.value ? topMaterialsByType(drawer.value.id, t, 10) : [];
const typesWithData = computed<MaterialType[]>(() =>
  drawer.value ? MATERIAL_TYPES.filter((t) => (drawerCounts.value?.[t] || 0) > 0) : []);

/* 全部素材（分页） */
const allList = computed<CbMaterial[]>(() => {
  if (!drawer.value) return [];
  let list = materialsOfSeries(drawer.value.id);
  if (curType.value !== '全部') list = list.filter((m) => m.type === curType.value);
  return list.slice().sort((a, b) => b.sales - a.sales);
});
const allPage = ref(1);
const allPageSize = 12;
const allTotalPages = computed(() => Math.max(1, Math.ceil(allList.value.length / allPageSize)));
const allPaged = computed(() => allList.value.slice((allPage.value - 1) * allPageSize, allPage.value * allPageSize));
const goAllPage = (n: number) => { allPage.value = Math.min(Math.max(1, n), allTotalPages.value); };
watch(curType, () => { allPage.value = 1; });
watch(drawerMode, () => { allPage.value = 1; });

/* ---------- 素材预览 ---------- */
const preview = ref<CbMaterial | null>(null);
const openPreview = (m: CbMaterial) => { preview.value = m; };
const previewProduct = computed(() => preview.value ? cbProductMap[preview.value.productId] : undefined);
const previewSeries = computed(() => previewProduct.value ? cbSeries.find((s) => s.id === previewProduct.value!.seriesId) : undefined);
const previewRank = computed(() => {
  if (!preview.value || !previewProduct.value) return -1;
  return rankInType(previewProduct.value.seriesId, preview.value.type, preview.value.id);
});

/* 引用素材到新发布商品（Demo 模拟） */
const reuseMaterial = (m: CbMaterial) => pushToast(`已引用素材 ${m.id} 到新发布商品（Demo 模拟）`);
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
              <th style="width: 110px">系列编码</th>
              <th style="min-width: 180px">系列名称</th>
              <th style="width: 110px">类目</th>
              <th style="width: 92px">关联ID<em>去重</em></th>
              <th v-for="t in MATERIAL_TYPES" :key="t" style="width: 62px" class="cb-th-type">
                <span class="cb-th-ico">{{ materialTypeIcon(t) }}</span>{{ t }}
              </th>
              <th style="width: 78px">状态</th>
              <th style="width: 84px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in pagedRows" :key="r.s.id" @click="openDrawer(r.s)">
              <td><span class="cb-code" @click.stop="openDrawer(r.s)">{{ r.s.id }}</span></td>
              <td>
                <div class="cb-name">{{ r.s.name }}</div>
                <div class="cb-sub">负责人 {{ r.s.owner }} · 素材 {{ r.matTotal }}</div>
              </td>
              <td>{{ r.s.category }}</td>
              <td>
                <b class="cb-idnum">{{ r.distinctId }}</b>
                <span v-if="r.rawId > r.distinctId" class="cb-iddup" :title="`原始关联 ${r.rawId} 个商品ID，按商品详情去重后 ${r.distinctId} 个`">原{{ r.rawId }}</span>
              </td>
              <td v-for="t in MATERIAL_TYPES" :key="t" class="cb-td-num" :class="{ zero: !r.counts[t] }">{{ r.counts[t] || '—' }}</td>
              <td><span class="cb-chip" :class="statusChipCls(r.s.status)">{{ r.s.status }}</span></td>
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
              <b class="cb-code">{{ drawer.id }}</b>
              <span>{{ drawer.name }}</span>
              <span class="cb-chip" :class="statusChipCls(drawer.status)">{{ drawer.status }}</span>
              <span class="cb-dh-cat">{{ drawer.category }}</span>
            </div>
            <button class="cb-drawer-close" @click="closeDrawer">×</button>
          </div>

          <div class="cb-drawer-summary">
            <span>关联ID <b>{{ drawerDistinct }}</b>（去重）<i v-if="drawerRaw > drawerDistinct">原 {{ drawerRaw }}</i></span>
            <span class="cb-dot">·</span>
            <span>素材总数 <b>{{ drawerMatTotal }}</b></span>
            <span class="cb-dot">·</span>
            <span>负责人 <b>{{ drawer.owner }}</b></span>
            <div class="cb-seg">
              <button :class="drawerMode === 'top' ? 'on' : ''" @click="drawerMode = 'top'">类型推荐 TOP10</button>
              <button :class="drawerMode === 'all' ? 'on' : ''" @click="drawerMode = 'all'">全部素材</button>
            </div>
          </div>

          <!-- 类型 tab -->
          <div class="cb-typetabs">
            <button class="cb-ttab" :class="curType === '全部' ? 'on' : ''" @click="curType = '全部'">全部</button>
            <button v-for="t in typesWithData" :key="t" class="cb-ttab" :class="curType === t ? 'on' : ''" @click="curType = t">
              {{ t }}<i>{{ drawerCounts?.[t] }}</i>
            </button>
          </div>

          <div class="cb-drawer-body">
            <!-- 模式一：按类型 TOP10 推荐 -->
            <template v-if="drawerMode === 'top'">
              <div v-if="curType === '全部'">
                <div v-for="t in typesWithData" :key="t" class="cb-sec">
                  <div class="cb-sec-t"><span class="cb-sec-ico">{{ materialTypeIcon(t) }}</span>{{ t }} · 销量 TOP{{ topOf(t).length }}</div>
                  <div v-if="topOf(t).length" class="cb-grid">
                    <div v-for="(m, i) in topOf(t)" :key="m.id" class="cb-card" @click="openPreview(m)">
                      <span class="cb-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
                      <div class="cb-thumb"><img v-if="m.thumb" :src="m.thumb" :alt="m.name" /><div v-else class="cb-ph">{{ materialTypeIcon(m.type) }}</div></div>
                      <div class="cb-card-info">
                        <div class="cb-card-name" :title="m.name">{{ m.name }}</div>
                        <div class="cb-card-meta">销量 {{ fmtSales(m.sales) }} · {{ m.productId }}</div>
                      </div>
                      <button class="cb-use" type="button" @click.stop="reuseMaterial(m)">引用</button>
                    </div>
                  </div>
                  <div v-else class="cb-empty-inline">该类型暂无「生效」素材可推荐</div>
                </div>
              </div>
              <div v-else class="cb-sec">
                <div class="cb-sec-t"><span class="cb-sec-ico">{{ materialTypeIcon(curType as MaterialType) }}</span>{{ curType }} · 销量 TOP{{ topOf(curType as MaterialType).length }}</div>
                <div v-if="topOf(curType as MaterialType).length" class="cb-grid">
                  <div v-for="(m, i) in topOf(curType as MaterialType)" :key="m.id" class="cb-card" @click="openPreview(m)">
                    <span class="cb-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
                    <div class="cb-thumb"><img v-if="m.thumb" :src="m.thumb" :alt="m.name" /><div v-else class="cb-ph">{{ materialTypeIcon(m.type) }}</div></div>
                    <div class="cb-card-info">
                      <div class="cb-card-name" :title="m.name">{{ m.name }}</div>
                      <div class="cb-card-meta">销量 {{ fmtSales(m.sales) }} · {{ m.productId }}</div>
                    </div>
                    <button class="cb-use" type="button" @click.stop="reuseMaterial(m)">引用</button>
                  </div>
                </div>
                <div v-else class="cb-empty-inline">该类型暂无「生效」素材可推荐</div>
              </div>
            </template>

            <!-- 模式二：全部素材（分页） -->
            <template v-else>
              <div v-if="allList.length" class="cb-grid all">
                <div v-for="m in allPaged" :key="m.id" class="cb-card" :class="{ 'is-risk': m.status === '违规' }" @click="openPreview(m)">
                  <span class="cb-state" :class="statusChipCls(m.status)">{{ m.status }}</span>
                  <div class="cb-thumb"><img v-if="m.thumb" :src="m.thumb" :alt="m.name" /><div v-else class="cb-ph">{{ materialTypeIcon(m.type) }}</div></div>
                  <div class="cb-card-info">
                    <div class="cb-card-name" :title="m.name">{{ m.name }}</div>
                    <div class="cb-card-meta">{{ m.type }} · {{ m.version }} · 销量 {{ fmtSales(m.sales) }}</div>
                    <div class="cb-card-from">{{ m.productId }}</div>
                  </div>
                  <button class="cb-use" type="button" @click.stop="reuseMaterial(m)">引用</button>
                </div>
              </div>
              <div v-else class="cb-empty-inline">该系列暂无匹配素材</div>
              <div v-if="allTotalPages > 1" class="cb-mini-pager">
                <span class="cb-mp-info">共 {{ allList.length }} 个素材</span>
                <button class="ib-pagebtn nav" :disabled="allPage === 1" @click="goAllPage(allPage - 1)">‹</button>
                <button v-for="n in allTotalPages" :key="n" class="ib-pagebtn" :class="allPage === n ? 'active' : ''" @click="goAllPage(n)">{{ n }}</button>
                <button class="ib-pagebtn nav" :disabled="allPage === allTotalPages" @click="goAllPage(allPage + 1)">›</button>
              </div>
            </template>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 素材预览弹窗 -->
    <Teleport to="body">
      <div v-if="preview" class="cb-mask" @click.self="preview = null">
        <div class="cb-modal">
          <div class="cb-modal-head">
            <div class="cb-modal-title">
              <span class="cb-mt-ico">{{ materialTypeIcon(preview.type) }}</span>
              <b>{{ preview.name }}</b>
              <span class="cb-chip" :class="statusChipCls(preview.status)">{{ preview.status }}</span>
              <span v-if="previewRank > 0" class="cb-chip chip-rank">{{ preview.type }}推荐 NO.{{ previewRank }}</span>
            </div>
            <button class="cb-modal-close" @click="preview = null">×</button>
          </div>
          <div class="cb-modal-body">
            <div class="cb-preview">
              <img v-if="preview.thumb" :src="preview.thumb" :alt="preview.name" />
              <div v-else class="cb-preview-ph">{{ materialTypeIcon(preview.type) }} {{ preview.type }}</div>
              <div v-if="preview.status === '违规'" class="cb-preview-risk"><span class="cb-risk-dot" />{{ preview.riskNote }}</div>
            </div>
            <div class="cb-side">
              <div class="cb-sec">
                <div class="cb-sec-t">素材信息</div>
                <div class="cb-kv"><span>素材ID</span><b>{{ preview.id }}</b></div>
                <div class="cb-kv"><span>类型</span><b>{{ preview.type }}</b></div>
                <div class="cb-kv"><span>版本</span><b>{{ preview.version }}</b></div>
                <div class="cb-kv"><span>贡献销量</span><b>{{ preview.sales }}</b></div>
                <div class="cb-kv"><span>上传人</span><b>{{ preview.uploader }}</b></div>
                <div class="cb-kv"><span>上传时间</span><b>{{ preview.uploadedAt }}</b></div>
                <div class="cb-kv"><span>合规标签</span><b><span v-for="t in preview.compliance" :key="t" class="cb-tag">{{ t }}</span></b></div>
              </div>
              <div class="cb-sec">
                <div class="cb-sec-t">归属链</div>
                <div class="cb-chain">
                  <span class="cb-chain-node series">{{ previewSeries?.id }}</span>
                  <span class="cb-chain-arrow">→</span>
                  <span class="cb-chain-node product">{{ previewProduct?.id }}</span>
                  <span class="cb-chain-arrow">→</span>
                  <span class="cb-chain-node material">{{ preview.id }}</span>
                </div>
                <div class="cb-kv"><span>系列编码</span><b>{{ previewSeries?.name }}</b></div>
                <div class="cb-kv"><span>商品ID</span><b>{{ previewProduct?.name }}</b></div>
              </div>
              <div class="cb-sec">
                <div class="cb-sec-t">版本历史</div>
                <div class="cb-vers">
                  <div v-for="(v, i) in preview.versions.slice().reverse()" :key="v.version" class="cb-ver" :class="{ 'is-cur': i === 0 }">
                    <div class="cb-ver-dot" />
                    <div class="cb-ver-body">
                      <div class="cb-ver-line"><b>{{ v.version }}</b><span v-if="i === 0" class="cb-chip chip-ok">当前</span></div>
                      <div class="cb-ver-meta">{{ v.uploader }} · {{ v.uploadedAt }}</div>
                      <div class="cb-ver-note">{{ v.note }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="cb-modal-foot">
            <button class="sg-btn" @click="preview = null">关闭</button>
            <button class="sg-btn primary" @click="reuseMaterial(preview); preview = null">引用到新发布商品</button>
          </div>
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
.cb-th-type { text-align: center; }
.cb-th-type em { display: block; font-style: normal; font-size: 10px; color: #f0762b; font-weight: 500; }
.cb-th-ico { margin-right: 2px; }
.cb-td-num { text-align: center; font-variant-numeric: tabular-nums; color: #202532; }
.cb-td-num.zero { color: #c3c9d6; }
.cb-code { font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: #4f7cff; font-weight: 600; cursor: pointer; }
.cb-name { font-size: 13px; color: #202532; font-weight: 500; }
.cb-sub { font-size: 11px; color: #8b92a1; margin-top: 2px; }
.cb-idnum { font-size: 14px; color: #202532; }
.cb-iddup { display: block; font-size: 10px; color: #f0762b; cursor: help; }

/* 抽屉 */
.cb-drawer-mask { position: fixed; inset: 0; background: rgba(31, 35, 41, 0.45); z-index: 1500; }
.cb-drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(1080px, 94vw); background: #fff; z-index: 1501; display: flex; flex-direction: column; box-shadow: -12px 0 40px rgba(26, 34, 56, 0.18); animation: cb-dr-in .22s ease; }
@keyframes cb-dr-in { from { transform: translateX(40px); opacity: .5; } to { transform: none; opacity: 1; } }
.cb-drawer-head { display: flex; align-items: center; padding: 16px 24px; border-bottom: 1px solid #edf0f5; }
.cb-dh-title { display: flex; align-items: center; gap: 10px; font-size: 15px; }
.cb-dh-title .cb-code { font-size: 15px; }
.cb-dh-title span { color: #202532; font-weight: 500; }
.cb-dh-cat { font-size: 12px; color: #8b92a1; font-weight: 400; }
.cb-drawer-close { margin-left: auto; border: 0; background: transparent; font-size: 24px; line-height: 1; color: #8a94a6; cursor: pointer; }
.cb-drawer-close:hover { color: #232b3a; }

.cb-drawer-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 24px; font-size: 13px; color: #5b6478; border-bottom: 1px solid #f2f4f8; }
.cb-drawer-summary b { color: #202532; font-size: 14px; }
.cb-drawer-summary i { font-style: normal; color: #f0762b; font-size: 11px; margin-left: 2px; }
.cb-dot { color: #c3c9d6; }
.cb-seg { margin-left: auto; display: inline-flex; border: 1px solid #e3e7ef; border-radius: 8px; overflow: hidden; }
.cb-seg button { height: 32px; padding: 0 16px; border: 0; background: #fff; font-size: 13px; color: #5b6478; cursor: pointer; }
.cb-seg button.on { background: #4f7cff; color: #fff; }

.cb-typetabs { display: flex; gap: 8px; flex-wrap: wrap; padding: 12px 24px; border-bottom: 1px solid #f2f4f8; }
.cb-ttab { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 14px; border: 1px solid #e3e7ef; border-radius: 16px; background: #fff; font-size: 13px; color: #5b6478; cursor: pointer; }
.cb-ttab i { font-style: normal; font-size: 11px; color: #8b92a1; background: #f0f2f7; border-radius: 8px; padding: 0 6px; }
.cb-ttab.on { border-color: #4f7cff; background: #eef2ff; color: #4f7cff; font-weight: 500; }
.cb-ttab.on i { background: #dbe4ff; color: #4f7cff; }

.cb-drawer-body { flex: 1; overflow: auto; padding: 16px 24px 24px; }
.cb-sec { margin-bottom: 22px; }
.cb-sec-t { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #202532; margin-bottom: 12px; }
.cb-sec-ico { font-size: 14px; }

.cb-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.cb-grid.all { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.cb-card { position: relative; background: #fafbfd; border: 1px solid #eef0f5; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform .15s, box-shadow .15s; }
.cb-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, .07); }
.cb-card.is-risk { border-color: #f7c9cb; background: #fffbfb; }
.cb-rank { position: absolute; left: 6px; top: 6px; z-index: 2; width: 20px; height: 20px; border-radius: 6px; background: #cfd6e4; color: #fff; font-size: 12px; font-weight: 700; display: grid; place-items: center; }
.cb-rank.hot { background: #f0762b; }
.cb-state { position: absolute; right: 6px; top: 6px; z-index: 2; }
.cb-thumb { aspect-ratio: 1 / 1; background: #eef0f5; display: grid; place-items: center; overflow: hidden; }
.cb-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cb-ph { font-size: 24px; }
.cb-card-info { padding: 8px 10px 10px; }
.cb-card-name { font-size: 12px; color: #202532; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cb-card-meta { font-size: 11px; color: #8b92a1; margin-top: 2px; }
.cb-card-from { font-size: 11px; color: #4f7cff; font-family: 'SF Mono', Consolas, monospace; margin-top: 2px; }
.cb-use { position: absolute; right: 6px; bottom: 6px; border: 0; background: #4f7cff; color: #fff; font-size: 11px; padding: 3px 10px; border-radius: 6px; cursor: pointer; opacity: 0; transition: opacity .15s; }
.cb-card:hover .cb-use { opacity: 1; }
.cb-use:hover { background: #3f6ae0; }

.cb-empty-inline { padding: 28px; text-align: center; color: #a6adbc; font-size: 13px; background: #fafbfd; border-radius: 8px; }

.cb-mini-pager { display: flex; align-items: center; gap: 6px; justify-content: flex-end; margin-top: 16px; }
.cb-mp-info { margin-right: auto; font-size: 12px; color: #8b92a1; }

/* chip / tag */
.cb-chip { display: inline-block; padding: 1px 8px; font-size: 11px; border-radius: 10px; line-height: 18px; }
.cb-chip.chip-ok { background: #e8f5ee; color: #16a34a; }
.cb-chip.chip-warn { background: #fff4e0; color: #d97706; }
.cb-chip.chip-off { background: #f0f2f7; color: #8b92a1; }
.cb-chip.chip-risk { background: #fdeced; color: #e5484d; }
.cb-chip.chip-rank { background: #fff1e6; color: #f0762b; }
.cb-tag { display: inline-block; padding: 1px 8px; font-size: 11px; background: #f0f2f7; color: #5b6478; border-radius: 10px; margin-right: 4px; }

/* 预览弹窗 */
.cb-mask { position: fixed; inset: 0; background: rgba(20, 25, 40, 0.42); display: grid; place-items: center; z-index: 2000; }
.cb-modal { width: 900px; max-width: 92vw; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 40px rgba(0, 0, 0, 0.16); }
.cb-modal-head { display: flex; align-items: center; padding: 14px 20px; border-bottom: 1px solid #eef0f5; }
.cb-modal-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
.cb-mt-ico { font-size: 15px; }
.cb-modal-close { margin-left: auto; border: 0; background: transparent; font-size: 22px; line-height: 1; color: #8b92a1; cursor: pointer; }
.cb-modal-body { padding: 16px 20px; display: grid; grid-template-columns: 380px 1fr; gap: 20px; max-height: 70vh; overflow: auto; }
.cb-modal-foot { padding: 12px 20px; border-top: 1px solid #eef0f5; display: flex; justify-content: flex-end; gap: 8px; background: #fafbfd; }
.cb-preview { background: #f5f7fb; border-radius: 8px; overflow: hidden; display: grid; place-items: center; min-height: 320px; position: relative; }
.cb-preview img { max-width: 100%; max-height: 400px; object-fit: contain; }
.cb-preview-ph { font-size: 14px; color: #8b92a1; }
.cb-preview-risk { position: absolute; left: 12px; right: 12px; bottom: 12px; background: #fdeced; color: #c93036; border-radius: 6px; padding: 8px 12px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
.cb-risk-dot { width: 6px; height: 6px; border-radius: 50%; background: #e5484d; display: inline-block; }
.cb-side { display: flex; flex-direction: column; gap: 14px; }
.cb-side .cb-sec { border: 1px solid #eef0f5; border-radius: 8px; padding: 12px 14px; margin-bottom: 0; }
.cb-kv { display: flex; gap: 8px; font-size: 12px; color: #202532; padding: 3px 0; }
.cb-kv span { color: #8b92a1; flex: none; width: 68px; }
.cb-kv b { font-weight: 500; flex: 1; word-break: break-all; }
.cb-chain { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
.cb-chain-node { font-family: 'SF Mono', Consolas, monospace; font-size: 11px; padding: 2px 8px; border-radius: 6px; }
.cb-chain-node.series { background: #eef2ff; color: #4f7cff; }
.cb-chain-node.product { background: #e8f5ee; color: #16a34a; }
.cb-chain-node.material { background: #fff4e0; color: #d97706; }
.cb-chain-arrow { color: #a6adbc; font-size: 11px; }
.cb-vers { position: relative; padding-left: 12px; }
.cb-vers::before { content: ''; position: absolute; left: 4px; top: 6px; bottom: 6px; width: 1px; background: #e8ebf1; }
.cb-ver { position: relative; padding: 6px 0 6px 8px; }
.cb-ver-dot { position: absolute; left: -12px; top: 12px; width: 9px; height: 9px; border-radius: 50%; background: #fff; border: 2px solid #cfd6e4; }
.cb-ver.is-cur .cb-ver-dot { border-color: #4f7cff; }
.cb-ver-line { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.cb-ver-meta { font-size: 11px; color: #8b92a1; margin-top: 2px; }
.cb-ver-note { font-size: 11px; color: #5b6478; margin-top: 2px; }
</style>
