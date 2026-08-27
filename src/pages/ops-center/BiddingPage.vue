<script setup lang="ts">
import { computed, ref } from 'vue';
import { biddingRows } from './data';
import type { BiddingRow, CreateRow } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import CreateDetailPage from './CreateDetailPage.vue';

/** 商机中心-竞价商品：筛选 + 列表 */
const empty = {
  name: '',
  pid: '',
  code: '',
  stock: '全部',
  thMin: '',
  thMax: '',
  pfMin: '',
  pfMax: '',
  tStart: '',
  tEnd: '',
};
const filter = ref({ ...empty });
const applied = ref({ ...empty });

const num = (s: string) => {
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
const list = computed(() =>
  biddingRows.filter((r) => {
    const a = applied.value;
    if (a.name && !r.name.includes(a.name)) return false;
    if (a.pid && !r.pid.includes(a.pid)) return false;
    if (a.code && !r.code.toLowerCase().includes(a.code.toLowerCase())) return false;
    if (a.stock !== '全部' && r.stock !== a.stock) return false;
    const th = num(r.threshold);
    const thMin = num(a.thMin);
    const thMax = num(a.thMax);
    if (thMin !== null && (th === null || th < thMin)) return false;
    if (thMax !== null && (th === null || th > thMax)) return false;
    const pf = num(r.profit);
    const pfMin = num(a.pfMin);
    const pfMax = num(a.pfMax);
    if (pfMin !== null && (pf === null || pf < pfMin)) return false;
    if (pfMax !== null && (pf === null || pf > pfMax)) return false;
    if (a.tStart && r.imported < a.tStart) return false;
    if (a.tEnd && r.imported > `${a.tEnd} 23:59`) return false;
    return true;
  }),
);

/* 门槛价 / 预估利润 列排序 */
const sortKey = ref<'' | 'threshold' | 'profit'>('');
const sortAsc = ref(true);
const toggleSort = (k: 'threshold' | 'profit') => {
  if (sortKey.value === k) sortAsc.value = !sortAsc.value;
  else {
    sortKey.value = k;
    sortAsc.value = true;
  }
};
const sorted = computed(() => {
  if (!sortKey.value) return list.value;
  const k = sortKey.value;
  const dir = sortAsc.value ? 1 : -1;
  return [...list.value].sort((a, b) => ((num(a[k]) ?? 0) - (num(b[k]) ?? 0)) * dir);
});
const sortIcon = (k: 'threshold' | 'profit') => (sortKey.value === k ? (sortAsc.value ? '▲' : '▼') : '⇅');

/* 详情：复用商品创建-淘宝平台商品详情页 */
const detail = ref<BiddingRow | null>(null);
const toCreateRow = (r: BiddingRow): CreateRow => ({
  thumb: r.img,
  platformBadge: '淘宝',
  title: r.name,
  link: r.link,
  store: '-',
  person: '-',
  time: r.imported,
});
</script>

<template>
  <CreateDetailPage v-if="detail" :row="toCreateRow(detail)" @back="detail = null" />
  <div v-else>
    <div class="ib-filters">
      <div class="ib-grid">
        <div class="ib-field">
          <label>商品名称</label>
          <input class="ib-input" placeholder="请输入商品名称" :value="filter.name" @input="filter = { ...filter, name: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="ib-field">
          <label>商品ID</label>
          <input class="ib-input" placeholder="请输入商品ID" :value="filter.pid" @input="filter = { ...filter, pid: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="ib-field">
          <label>商品编码</label>
          <input class="ib-input" placeholder="请输入商品编码" :value="filter.code" @input="filter = { ...filter, code: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="ib-field">
          <label>是否有货</label>
          <BubbleSelect class-name="ib-select" :value="filter.stock" :options="['全部', '有货', '缺货']" @change="(v: string) => filter = { ...filter, stock: v }" />
        </div>

        <div class="ib-field">
          <label>门槛价</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="最小值" :value="filter.thMin" @input="filter = { ...filter, thMin: ($event.target as HTMLInputElement).value }" />
            <span>至</span>
            <input class="ib-input" placeholder="最大值" :value="filter.thMax" @input="filter = { ...filter, thMax: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
        <div class="ib-field">
          <label>预估利润</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="最小值" :value="filter.pfMin" @input="filter = { ...filter, pfMin: ($event.target as HTMLInputElement).value }" />
            <span>至</span>
            <input class="ib-input" placeholder="最大值" :value="filter.pfMax" @input="filter = { ...filter, pfMax: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
        <div class="ib-field">
          <label>导入时间</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="开始时间" :value="filter.tStart" @input="filter = { ...filter, tStart: ($event.target as HTMLInputElement).value }" />
            <span>→</span>
            <input class="ib-input" placeholder="结束时间" :value="filter.tEnd" @input="filter = { ...filter, tEnd: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
      </div>

      <div class="ib-actions">
        <div class="ib-rightacts">
          <button class="lightBtn" @click="filter = { ...empty }; applied = { ...empty }">
            重置
          </button>
          <button class="primaryBtn" @click="applied = { ...filter }">
            查询
          </button>
        </div>
      </div>
    </div>

    <div class="ib-table-card">
      <div class="ib-table-wrap">
        <table class="ib-table bd-table">
          <thead>
            <tr>
              <th>商品图片</th>
              <th>商品名称</th>
              <th>必报SKU</th>
              <th class="cp-sort-th" @click="toggleSort('threshold')">门槛价 <span class="tc-sort">{{ sortIcon('threshold') }}</span></th>
              <th>是否有货</th>
              <th>商品编码</th>
              <th class="cp-sort-th" @click="toggleSort('profit')">预估利润 <span class="tc-sort">{{ sortIcon('profit') }}</span></th>
              <th>导入时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sorted" :key="r.pid">
              <td><img class="ib-thumb bd-thumb" :src="r.img" alt="" /></td>
              <td>
                <a class="bd-name" :href="r.link" target="_blank" rel="noreferrer"><Ellipsis :text="r.name" /></a>
                <div class="ib-meta bd-code">{{ r.pid }}</div>
              </td>
              <td>{{ r.sku }}</td>
              <td>{{ r.threshold }}</td>
              <td>
                <span :class="r.stock === '有货' ? 'badge-green' : 'badge-red'">{{ r.stock }}</span>
              </td>
              <td><span class="badge-gray">{{ r.code }}</span></td>
              <td>{{ r.profit }}</td>
              <td>{{ r.imported }}</td>
              <td class="actions-col">
                <a href="#" @click.prevent="detail = r">详情</a>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="list.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ list.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
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
