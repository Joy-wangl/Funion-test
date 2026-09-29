<script setup lang="ts">
/* ---------- 售后列表（品控-线上）：系列维度售后单 / 售后率，详情与趋势复用监控列表弹层 ---------- */
import { computed, ref, watch } from 'vue';
import { DEFAULT_CUSTOM_RANGE, RANGE_LABELS, type DateRange, type RangeKey, type QcCenterSeries } from './qcCenterData';
import { ONLINE_GROUPS, ONLINE_OPERATORS, onlineAfterRows, onlineSeries } from './qcOnlineData';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';

const props = defineProps<{
  onDetail: (s: QcCenterSeries) => void;
  onTrend: (s: QcCenterSeries) => void;
}>();

type SortKey = 'afterSales' | 'rate';
const GO_DEFAULT = '全部组别 / 全部运维';
const GO_OPTIONS = (() => {
  const opts = [GO_DEFAULT];
  for (const g of ONLINE_GROUPS) {
    opts.push(`${g} / 全部运维`);
    for (const o of ONLINE_OPERATORS) opts.push(`${g} / ${o}`);
  }
  return opts;
})();
const draft = ref({ q: '', go: GO_DEFAULT, range: 'custom' as RangeKey, custom: { ...DEFAULT_CUSTOM_RANGE } });
const applied = ref({ ...draft.value });
const sortKey = ref<SortKey>('afterSales');
const sortDesc = ref(true);

const toggleSort = (k: SortKey) => {
  if (sortKey.value === k) sortDesc.value = !sortDesc.value;
  else { sortKey.value = k; sortDesc.value = true; }
};
const sortState = (k: SortKey): 'none' | 'desc' | 'asc' => (sortKey.value !== k ? 'none' : sortDesc.value ? 'desc' : 'asc');

const filtered = computed(() => {
  const f = applied.value;
  const [g, o] = f.go.split(' / ');
  const kw = f.q.trim().toLowerCase();
  return onlineAfterRows().filter((r) => {
    if (g !== '全部组别' && r.group !== g) return false;
    if (o !== '全部运维' && r.operator !== o) return false;
    if (kw && !r.seriesCode.toLowerCase().includes(kw) && !r.name.toLowerCase().includes(kw)) return false;
    return true;
  });
});
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  const diff = sortKey.value === 'afterSales' ? a.afterSales - b.afterSales : a.rate - b.rate;
  return sortDesc.value ? -diff : diff;
}));

const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(sorted.value.length / pageSize.value)));
const rows = computed(() => sorted.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageList = computed((): (number | 'gap')[] => {
  const total = pageCount.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cur = page.value;
  if (cur <= 6) return [1, 2, 3, 4, 5, 6, 'gap', total];
  if (cur >= total - 5) return [1, 'gap', total - 5, total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap', cur - 1, cur, cur + 1, 'gap', total];
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 20; page.value = 1; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};
watch(sorted, () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });

const seriesOf = (code: string) => onlineSeries().find((s) => s.seriesCode === code) ?? null;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const rateClass = (v: number) => (v < 0.03 ? 'ok' : v < 0.05 ? 'warn' : 'bad');
</script>

<template>
  <div class="qc-head">
    <div class="qc-title">
      售后列表
      <span class="qc-desc">共 {{ filtered.length }} 个系列</span>
    </div>
  </div>
  <div class="sg-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>搜索</label>
        <input class="sg-input" placeholder="请输入系列编码 / 商品名称" :value="draft.q" @input="draft.q = ($event.target as HTMLInputElement).value">
      </div>
      <div class="sg-field">
        <label>组别 / 运维人员</label>
        <BubbleSelect class-name="sg-select" :value="draft.go" :options="GO_OPTIONS" @change="(v: string) => (draft.go = v)" />
      </div>
      <div class="sg-field">
        <label>时间范围</label>
        <BubbleSelect
          class-name="sg-select"
          :value="RANGE_LABELS.find((r) => r.key === draft.range)?.label ?? '自定义'"
          :options="RANGE_LABELS.map((r) => r.label)"
          @change="(v: string) => (draft.range = RANGE_LABELS.find((r) => r.label === v)?.key ?? 'custom')"
        />
      </div>
      <div v-if="draft.range === 'custom'" class="sg-field">
        <label>日期区间</label>
        <QcDateRangePicker :custom="draft.custom" :on-change="(d: DateRange) => (draft.custom = d)" />
      </div>
      <div class="sg-field-actions">
        <button class="sg-btn" @click="draft = { q: '', go: GO_DEFAULT, range: 'custom', custom: draft.custom }">
          重置
        </button>
        <button class="sg-btn primary" @click="applied = { ...draft }">
          查询
        </button>
      </div>
    </div>
  </div>
  <div class="qc-body">
    <table class="table qc-wide">
      <thead>
        <tr>
          <th>系列编码</th>
          <th>组别</th>
          <th>运维人员</th>
          <SortTh label="售后单" :state="sortState('afterSales')" @sort="toggleSort('afterSales')" />
          <SortTh label="售后率" :state="sortState('rate')" @sort="toggleSort('rate')" />
          <th style="width: 140px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.seriesCode">
          <td class="col-name">
            <div class="qc-mono">{{ r.seriesCode }}</div>
            <div style="color: var(--text-3); font-size: 12px">{{ r.name }}</div>
          </td>
          <td>{{ r.group }}</td>
          <td>{{ r.operator }}</td>
          <td>{{ r.afterSales }}</td>
          <td><span class="rate" :class="rateClass(r.rate)">{{ pct(r.rate) }}</span></td>
          <td>
            <div class="qc-op-col">
              <a @click="seriesOf(r.seriesCode) && props.onDetail(seriesOf(r.seriesCode)!)">查看详情</a>
              <a @click="seriesOf(r.seriesCode) && props.onTrend(seriesOf(r.seriesCode)!)">趋势图</a>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="6">
            <div class="sg-empty-wrap">
              <div class="sg-empty-icon">◌</div>
              <div>暂无数据，请调整筛选条件</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="ib-pagination">
      <div class="ib-pageinfo">共 {{ sorted.length }} 个系列</div>
      <BubbleSelect class-name="ib-page-size" :default-value="pageSize + '条/页'" :options="['5条/页', '10条/页', '20条/页']" @change="onPageSize" />
      <div class="ib-pages">
        <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
        <template v-for="(p, i) in pageList" :key="i">
          <span v-if="p === 'gap'" class="ib-pagedots">…</span>
          <button v-else class="ib-pagebtn" :class="p === page ? 'active' : ''" @click="page = p">{{ p }}</button>
        </template>
        <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
      </div>
      <div class="ib-jump">
        <span>前往</span>
        <input class="ib-jump-input" :value="jumpVal" @input="jumpVal = ($event.target as HTMLInputElement).value" @keyup.enter="onJump">
        <span>页</span>
      </div>
    </div>
  </div>
</template>
