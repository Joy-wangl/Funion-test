<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  cbSeries, cbProducts, cbMaterials, cbSeriesMap, cbProductMap,
  topMaterialsOfSeries, statusChipCls,
} from './codeKbData';

/**
 * 血缘关系列表页（重构版）
 * 关系：商品ID—归属系列→系列编码；素材—归属商品→商品ID；素材—系列推荐→系列编码(TOP10)
 */

type SubKind = '商品ID' | '系列编码' | '素材';
type RelKind = '归属系列' | '归属商品' | '系列推荐';

interface RelRow {
  id: string;
  subKind: SubKind; subId: string; subName: string;
  objKind: SubKind; objId: string; objName: string;
  rel: RelKind;
  createdAt: string;
  status: string;
  rank?: number;
}

const allRows = computed<RelRow[]>(() => {
  const rows: RelRow[] = [];
  /* 商品ID → 系列编码 */
  cbProducts.forEach((p) => {
    const s = cbSeriesMap[p.seriesId];
    rows.push({ id: 'R-P-' + p.id, subKind: '商品ID', subId: p.id, subName: p.name, objKind: '系列编码', objId: p.seriesId, objName: s?.name || '', rel: '归属系列', createdAt: p.publishedAt, status: p.status });
  });
  /* 素材 → 商品ID */
  cbMaterials.forEach((m) => {
    const p = cbProductMap[m.productId];
    rows.push({ id: 'R-M-' + m.id, subKind: '素材', subId: m.id, subName: m.name, objKind: '商品ID', objId: m.productId, objName: p?.name || '', rel: '归属商品', createdAt: m.uploadedAt, status: m.status });
  });
  /* 素材 → 系列编码（TOP10 推荐） */
  cbSeries.forEach((s) => {
    topMaterialsOfSeries(s.id, 10).forEach((m, i) => {
      rows.push({ id: 'R-T-' + m.id, subKind: '素材', subId: m.id, subName: m.name, objKind: '系列编码', objId: s.id, objName: s.name, rel: '系列推荐', createdAt: m.uploadedAt, status: m.status, rank: i + 1 });
    });
  });
  return rows;
});

const emptyFilter = { kw: '', subKind: '', objKind: '', rel: '', status: '' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };

const rows = computed(() => allRows.value.filter((r) => {
  const f = applied.value;
  if (f.kw) { const k = f.kw.trim().toLowerCase(); if (![r.subId, r.subName, r.objId, r.objName].some((s) => s.toLowerCase().includes(k))) return false; }
  if (f.subKind && r.subKind !== f.subKind) return false;
  if (f.objKind && r.objKind !== f.objKind) return false;
  if (f.rel && r.rel !== f.rel) return false;
  if (f.status && r.status !== f.status) return false;
  return true;
}));

const checked = ref<string[]>([]);
const toggleRow = (id: string) => { const i = checked.value.indexOf(id); if (i >= 0) checked.value.splice(i, 1); else checked.value.push(id); };
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((r) => checked.value.includes(r.id)));
const toggleAll = () => { checked.value = allChecked.value ? [] : rows.value.map((r) => r.id); };

const doExport = (onlyChecked: boolean) => {
  const target = onlyChecked ? rows.value.filter((r) => checked.value.includes(r.id)) : rows.value;
  if (target.length === 0) { pushToast('无可导出数据'); return; }
  const headers = ['主体类型', '主体ID', '主体名称', '关联对象类型', '关联对象编号', '关联对象名称', '关联关系', '推荐名次', '关系创建时间', '状态'];
  const lines = [headers.join('\t')];
  target.forEach((r) => lines.push([r.subKind, r.subId, r.subName, r.objKind, r.objId, r.objName, r.rel, r.rank ? String(r.rank) : '', r.createdAt, r.status].join('\t')));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/tab-separated-values;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `血缘关系_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  pushToast(`已导出 ${target.length} 条血缘关系（Demo 模拟）`);
};
</script>

<template>
  <div class="sg-page cb-rel">
    <div class="cb-head">
      <span class="cb-head-t">血缘关系列表</span>
      <span class="cb-head-sub">系列编码 / 商品ID / 素材 三层血缘扁平化，方便导出核对</span>
    </div>

    <div class="sg-filter">
      <div class="sg-grid cb-rel-grid">
        <div class="sg-field">
          <label>关键词</label>
          <input class="sg-input" placeholder="主体/对象 ID 或名称" :value="filter.kw" @input="filter.kw = ($event.target as HTMLInputElement).value" />
        </div>
        <div class="sg-field">
          <label>主体类型</label>
          <BubbleSelect class-name="sg-select" default-value="全部主体" :options="['商品ID', '系列编码', '素材']" @change="(v: string) => (filter.subKind = v)" />
        </div>
        <div class="sg-field">
          <label>对象类型</label>
          <BubbleSelect class-name="sg-select" default-value="全部对象" :options="['商品ID', '系列编码', '素材']" @change="(v: string) => (filter.objKind = v)" />
        </div>
        <div class="sg-field">
          <label>关联关系</label>
          <BubbleSelect class-name="sg-select" default-value="全部关系" :options="['归属系列', '归属商品', '系列推荐']" @change="(v: string) => (filter.rel = v)" />
        </div>
        <div class="sg-field">
          <label>状态</label>
          <BubbleSelect class-name="sg-select" default-value="全部状态" :options="['在售', '下架', '待审', '违规预警', '草稿', '生效', '失效', '违规', '停用', '风险']" @change="(v: string) => (filter.status = v)" />
        </div>
        <div class="sg-actions">
          <button class="sg-btn" @click="doExport(true)">导出选中</button>
          <button class="sg-btn primary" @click="doExport(false)">导出全部</button>
          <button class="sg-btn" @click="doReset">重置</button>
          <button class="sg-btn primary" @click="doSearch">查询</button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table cb-rel-table">
          <thead>
            <tr>
              <th style="width: 40px"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th style="width: 9%">主体类型</th>
              <th style="width: 20%">主体ID</th>
              <th style="width: 9%">关联对象类型</th>
              <th style="width: 20%">关联对象编号</th>
              <th style="width: 11%">关联关系</th>
              <th style="width: 13%">关系创建时间</th>
              <th style="width: 9%">状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td><input type="checkbox" :checked="checked.includes(r.id)" @change="toggleRow(r.id)" /></td>
              <td><span class="cb-kind" :class="'k-' + r.subKind">{{ r.subKind }}</span></td>
              <td>
                <div class="cb-rel-id">{{ r.subId }}</div>
                <div class="cb-rel-name">{{ r.subName }}</div>
              </td>
              <td><span class="cb-kind" :class="'k-' + r.objKind">{{ r.objKind }}</span></td>
              <td>
                <div class="cb-rel-id">{{ r.objId }}</div>
                <div class="cb-rel-name">{{ r.objName }}</div>
              </td>
              <td>
                <span class="cb-rel-tag" :class="'r-' + r.rel">{{ r.rel }}</span>
                <span v-if="r.rank" class="cb-rel-rank">NO.{{ r.rank }}</span>
              </td>
              <td>{{ r.createdAt }}</td>
              <td><span class="cb-chip" :class="statusChipCls(r.status)">{{ r.status }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-if="rows.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ rows.length }} 条<template v-if="checked.length">｜已选 {{ checked.length }} 条</template></div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cb-rel { padding: 0; }
.cb-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.cb-head-t { display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; color: #202532; }
.cb-head-t::before { content: ''; width: 3px; height: 14px; background: #4f7cff; border-radius: 2px; }
.cb-head-sub { font-size: 12px; color: #8b92a1; }

.sg-grid.cb-rel-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.sg-grid.cb-rel-grid .sg-actions { grid-column: 1 / -1; justify-content: flex-end; }

.cb-rel-table td { vertical-align: top; }
.cb-rel-id { font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: #4f7cff; }
.cb-rel-name { font-size: 12px; color: #5b6478; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }

.cb-kind { display: inline-block; padding: 1px 8px; font-size: 11px; border-radius: 4px; background: #eef2ff; color: #4f7cff; }
.cb-kind.k-商品ID { background: #e8f5ee; color: #16a34a; }
.cb-kind.k-素材 { background: #fff4e0; color: #d97706; }
.cb-kind.k-系列编码 { background: #eef2ff; color: #4f7cff; }

.cb-rel-tag { display: inline-block; padding: 2px 10px; font-size: 12px; border-radius: 12px; background: #f0f2f7; color: #5b6478; }
.cb-rel-tag.r-归属系列 { background: #e8f5ee; color: #16a34a; }
.cb-rel-tag.r-归属商品 { background: #fff4e0; color: #d97706; }
.cb-rel-tag.r-系列推荐 { background: #fff1e6; color: #f0762b; }
.cb-rel-rank { display: inline-block; margin-left: 6px; font-size: 11px; color: #f0762b; font-weight: 600; }

.cb-chip { display: inline-block; padding: 1px 8px; font-size: 11px; border-radius: 10px; line-height: 18px; }
.cb-chip.chip-ok { background: #e8f5ee; color: #16a34a; }
.cb-chip.chip-warn { background: #fff4e0; color: #d97706; }
.cb-chip.chip-off { background: #f0f2f7; color: #8b92a1; }
.cb-chip.chip-risk { background: #fdeced; color: #e5484d; }
</style>
