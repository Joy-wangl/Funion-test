<script setup lang="ts">
/* ---------- 问题商品（品控-线上）：清单内容已下线，取消命中统一在监控列表系列行 / 展开区操作列办理并同源同步；
   本页保留查询壳与问题商品编码计数口径 ---------- */
import { computed, ref } from 'vue';
import { ONLINE_GROUPS, ONLINE_OPERATORS, onlineProblemCodes } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';

const cfgOpen = ref(true);
const GO_DEFAULT = '全部组别 / 全部运维';
const GO_OPTIONS = (() => {
  const opts = [GO_DEFAULT];
  for (const g of ONLINE_GROUPS) {
    opts.push(`${g} / 全部运维`);
    for (const o of ONLINE_OPERATORS) opts.push(`${g} / ${o}`);
  }
  return opts;
})();
const draft = ref({ q: '', go: GO_DEFAULT, ordersMin: '', ordersMax: '', rateMin: '', rateMax: '', asMin: '', asMax: '', from: '', to: '' });
const applied = ref({ ...draft.value });

const num = (v: string) => (v.trim() === '' ? null : Number(v));
const inRange = (val: number, min: string, max: string) => {
  const lo = num(min); const hi = num(max);
  if (lo === null && hi === null) return true;
  if (lo !== null && Number.isNaN(lo)) return true;
  if (hi !== null && Number.isNaN(hi)) return true;
  if (lo !== null && val < lo) return false;
  if (hi !== null && val > hi) return false;
  return true;
};

/* 时间口径：数据窗口固定 2026-08-01~28；订单量 / 售后单按所选区间天数等比折算，比率类指标不随时间缩放 */
const DATA_START = '2026-08-01';
const DATA_END = '2026-08-28';
const FULL_DAYS = 28;
const windowDays = (from: string, to: string) => {
  let s = from || DATA_START;
  let e = to || DATA_END;
  if (s < DATA_START) s = DATA_START;
  if (e > DATA_END) e = DATA_END;
  if (s > e) return 0;
  return Math.round((Date.parse(e) - Date.parse(s)) / 86400000) + 1;
};

const filtered = computed(() => {
  const f = applied.value;
  const [g, o] = f.go.split(' / ');
  const kw = f.q.trim().toLowerCase();
  const scale = windowDays(f.from, f.to) / FULL_DAYS;
  const base = onlineProblemCodes()
    .map((r) => ({ ...r, orders: Math.round(r.orders * scale), afterSales: Math.round(r.afterSales * scale) }));
  return base.filter((r) => {
    if (g !== '全部组别' && r.group !== g) return false;
    if (o !== '全部运维' && r.operator !== o) return false;
    if (!inRange(r.orders, f.ordersMin, f.ordersMax)) return false;
    if (!inRange(Math.round(r.refundRate * 1000) / 10, f.rateMin, f.rateMax)) return false;
    if (!inRange(r.afterSales, f.asMin, f.asMax)) return false;
    if (kw && !r.code.toLowerCase().includes(kw) && !r.seriesCode.toLowerCase().includes(kw) && !r.codeName.toLowerCase().includes(kw)) return false;
    return true;
  });
});
</script>

<template>
  <div class="qc-pc-tabs">
    <button type="button" class="qc-pc-cfg" :class="cfgOpen ? 'on' : ''" @click="cfgOpen = !cfgOpen">条件配置</button>
  </div>
  <div class="qc-head">
    <div class="qc-title">
      问题商品
      <span class="qc-desc">共 {{ filtered.length }} 个问题商品编码</span>
    </div>
  </div>
  <div v-if="cfgOpen" class="sg-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>搜索</label>
        <input class="sg-input" placeholder="请输入商品编码 / 系列编码" :value="draft.q" @input="draft.q = ($event.target as HTMLInputElement).value">
      </div>
      <div class="sg-field">
        <label>组别 / 运维人员</label>
        <BubbleSelect class-name="sg-select" :value="draft.go" :options="GO_OPTIONS" @change="(v: string) => (draft.go = v)" />
      </div>
      <div class="sg-field">
        <label>订单量</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.ordersMin" @input="draft.ordersMin = ($event.target as HTMLInputElement).value">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.ordersMax" @input="draft.ordersMax = ($event.target as HTMLInputElement).value">
        </span>
      </div>
      <div class="sg-field">
        <label>退款率（%）</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.rateMin" @input="draft.rateMin = ($event.target as HTMLInputElement).value">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.rateMax" @input="draft.rateMax = ($event.target as HTMLInputElement).value">
        </span>
      </div>
      <div class="sg-field">
        <label>售后单</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.asMin" @input="draft.asMin = ($event.target as HTMLInputElement).value">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.asMax" @input="draft.asMax = ($event.target as HTMLInputElement).value">
        </span>
      </div>
      <div class="sg-field">
        <label>时间范围</label>
        <span class="pc-daterange">
          <input type="date" class="pc-date" :value="draft.from" :min="DATA_START" :max="DATA_END" @input="draft.from = ($event.target as HTMLInputElement).value">
          <i>-</i>
          <input type="date" class="pc-date" :value="draft.to" :min="DATA_START" :max="DATA_END" @input="draft.to = ($event.target as HTMLInputElement).value">
        </span>
      </div>
      <div class="sg-field-actions">
        <button class="sg-btn" @click="draft = { q: '', go: GO_DEFAULT, ordersMin: '', ordersMax: '', rateMin: '', rateMax: '', asMin: '', asMax: '', from: '', to: '' }">
          重置
        </button>
        <button class="sg-btn primary" @click="applied = { ...draft }">
          查询
        </button>
        <button class="sg-btn" @click="pushToast(`已导出 ${filtered.length} 条问题商品`)">
          导出
        </button>
      </div>
    </div>
  </div>
</template>
