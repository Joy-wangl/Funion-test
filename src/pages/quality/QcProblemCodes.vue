<script setup lang="ts">
/* ---------- 问题商品（品控-线上）：垃圾品编码清单，按退款率 / 聊天风险率双序，取消命中二次确认 ---------- */
import { computed, ref, watch } from 'vue';
import type { QcCenterSeries } from './qcCenterData';
import { ONLINE_GROUPS, ONLINE_OPERATORS, onlineProblemCodes, onlineSeries, type OnlineProblemCode } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import Modal from '../../components/Modal.vue';

const props = defineProps<{ onDetail: (s: QcCenterSeries) => void }>();

type SortKey = 'orders' | 'refundRate' | 'afterSales' | 'chatRate';
const tab = ref<'refundRate' | 'chatRate'>('refundRate');
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
const draft = ref({ q: '', go: GO_DEFAULT, ordersMin: '', ordersMax: '', rateMin: '', rateMax: '', asMin: '', asMax: '' });
const applied = ref({ ...draft.value });
const sortKey = ref<SortKey>('refundRate');
const sortDesc = ref(true);
/** 已取消命中的编码（本地态，取消后不再进入清单） */
const canceled = ref<Set<string>>(new Set());
const cancelTarget = ref<OnlineProblemCode | null>(null);

const toggleSort = (k: SortKey) => {
  if (sortKey.value === k) sortDesc.value = !sortDesc.value;
  else { sortKey.value = k; sortDesc.value = true; }
};
const sortState = (k: SortKey): 'none' | 'desc' | 'asc' => (sortKey.value !== k ? 'none' : sortDesc.value ? 'desc' : 'asc');

const num = (v: string) => (v.trim() === '' ? null : Number(v));
const inRange = (val: number, min: string, max: string) => {
  const lo = num(min); const hi = num(max);
  return (lo === null || Number.isNaN(lo) || val >= lo) && (hi === null || Number.isNaN(hi) || val <= hi);
};

const filtered = computed(() => {
  const f = applied.value;
  const [g, o] = f.go.split(' / ');
  const kw = f.q.trim().toLowerCase();
  const base = onlineProblemCodes().filter((r) => !canceled.value.has(r.code));
  const list = base.filter((r) => {
    if (g !== '全部组别' && r.group !== g) return false;
    if (o !== '全部运维' && r.operator !== o) return false;
    if (!inRange(r.orders, f.ordersMin, f.ordersMax)) return false;
    if (!inRange(Math.round(r.refundRate * 1000) / 10, f.rateMin, f.rateMax)) return false;
    if (!inRange(r.afterSales, f.asMin, f.asMax)) return false;
    if (kw && !r.code.toLowerCase().includes(kw) && !r.seriesCode.toLowerCase().includes(kw) && !r.codeName.toLowerCase().includes(kw)) return false;
    return true;
  });
  return [...list].sort((a, b) => {
    const diff = sortKey.value === 'orders' ? a.orders - b.orders
      : sortKey.value === 'afterSales' ? a.afterSales - b.afterSales
        : sortKey.value === 'chatRate' ? a.chatRate - b.chatRate
          : a.refundRate - b.refundRate;
    return sortDesc.value ? -diff : diff;
  });
});

const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)));
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
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
watch(filtered, () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });

const doCancel = () => {
  if (!cancelTarget.value) return;
  canceled.value = new Set([...canceled.value, cancelTarget.value.code]);
  pushToast(`已取消命中 ${cancelTarget.value.code}`);
  cancelTarget.value = null;
};
const openSeries = (r: OnlineProblemCode) => {
  const s = onlineSeries().find((x) => x.seriesCode === r.seriesCode);
  if (s) props.onDetail(s);
};
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
</script>

<template>
  <div class="qc-pc-tabs">
    <button type="button" :class="tab === 'refundRate' ? 'on' : ''" @click="tab = 'refundRate'; sortKey = 'refundRate'; sortDesc = true">按退款率</button>
    <button type="button" :class="tab === 'chatRate' ? 'on' : ''" @click="tab = 'chatRate'; sortKey = 'chatRate'; sortDesc = true">按聊天风险率</button>
    <button type="button" class="qc-pc-cfg" :class="cfgOpen ? 'on' : ''" @click="cfgOpen = !cfgOpen">条件配置</button>
  </div>
  <div class="qc-head">
    <div class="qc-title">
      问题商品
      <span class="qc-desc">共 {{ filtered.length }} 个问题商品编码 · 点击行查看系列详情</span>
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
      <div class="sg-field-actions">
        <button class="sg-btn" @click="draft = { q: '', go: GO_DEFAULT, ordersMin: '', ordersMax: '', rateMin: '', rateMax: '', asMin: '', asMax: '' }">
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
  <div class="qc-body">
    <table class="table qc-wide">
      <thead>
        <tr>
          <th>商品编码</th>
          <th>系列编码</th>
          <th>组别</th>
          <th>运维人员</th>
          <SortTh label="订单量" :state="sortState('orders')" @sort="toggleSort('orders')" />
          <SortTh label="退款率" :state="sortState('refundRate')" @sort="toggleSort('refundRate')" />
          <SortTh label="售后单" :state="sortState('afterSales')" @sort="toggleSort('afterSales')" />
          <th>状态</th>
          <th style="width: 100px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.code" class="qc-pc-row" @click="openSeries(r)">
          <td class="qc-mono">{{ r.code }}</td>
          <td class="qc-mono">{{ r.seriesCode }}</td>
          <td>{{ r.group }}</td>
          <td>{{ r.operator }}</td>
          <td>{{ r.orders.toLocaleString() }}</td>
          <td><span class="rate bad">{{ pct(r.refundRate) }}</span></td>
          <td>{{ r.afterSales }}</td>
          <td><span class="tag" style="background: #ffece8; color: #e5484d">{{ r.status }}</span></td>
          <td @click.stop>
            <div class="qc-op-col">
              <a @click="cancelTarget = r">取消命中</a>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="9">
            <div class="sg-empty-wrap">
              <div class="sg-empty-icon">◌</div>
              <div>暂无数据，请调整筛选条件</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="ib-pagination">
      <div class="ib-pageinfo">共 {{ filtered.length }} 条</div>
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

  <Modal v-if="cancelTarget" title="取消命中" :sub="`取消后 ${cancelTarget.code} 不再进入问题商品清单`" size="md" @close="cancelTarget = null">
    <div class="qc-pc-confirm">确认取消该商品编码的命中标记？</div>
    <template #foot>
      <button class="btn" @click="cancelTarget = null">取消</button>
      <button class="btn primary" @click="doCancel">确认取消</button>
    </template>
  </Modal>
</template>
