<script setup lang="ts">
/* ---------- 问题类型看板 ---------- */
import { computed, ref } from 'vue';
import {
  DATE_AXIS,
  DEPT_COLOR,
  DEFAULT_CUSTOM_RANGE,
  PROBLEM_TYPE_COLOR,
  QC_DEPTS,
  junkStatusOf,
  markedJunkCount,
  orderTrendData,
  pct,
  problemTrendData,
  problemTypeRanking,
  rangeDeptCounts,
  rangeEventTotals,
  rangeTypeCounts,
  rateCls,
  topProblemCodes,
  totalCodes,
  windowOf,
  type DateRange,
  type RangeKey,
} from './qcCenterData';
import { OPT_STATUS_LABELS, type OptStatus, type OptTask } from './qcOptData';
import PieChart from './PieChart.vue';
import ProblemTrendChart from './ProblemTrendChart.vue';
import StatusTag from './StatusTag.vue';
import QcSectionHead from './QcSectionHead.vue';

const props = defineProps<{
  optTasks: OptTask[];
  onOpenOptStatus: (s: OptStatus) => void;
  onOpenCode: (seriesCode: string, code: string) => void;
  onPickType: (type: string) => void;
}>();

const rangeOv = ref<RangeKey>('custom');
const rangeShare = ref<RangeKey>('custom');
const rangeTrend = ref<RangeKey>('custom');
const rangeOpt = ref<RangeKey>('custom');
const customOv = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });
const customShare = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });
const customTrend = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });
const customOpt = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });

const ranking = computed(() => problemTypeRanking());
const topKey = ref<'refundRate' | 'chatRate'>('refundRate');
const top = computed(() => topProblemCodes(5, topKey.value));
const ovTotals = computed(() => rangeEventTotals(rangeOv.value, customOv.value));
const shareCounts = computed(() => rangeTypeCounts(rangeShare.value, customShare.value));
const shareTotals = computed(() => rangeEventTotals(rangeShare.value, customShare.value));
const deptCounts = computed(() => rangeDeptCounts(rangeShare.value, customShare.value));
const trend = computed(() => problemTrendData(rangeTrend.value, customTrend.value));
const trendOrders = computed(() => orderTrendData(rangeTrend.value, customTrend.value));

const shareItems = computed(() => ranking.value.map((r) => ({
  label: r.type,
  value: shareCounts.value[r.type] ?? 0,
  color: PROBLEM_TYPE_COLOR[r.type] || '#4f7cff',
})));
const deptItems = computed(() => QC_DEPTS.map((d) => ({
  label: d,
  value: deptCounts.value[d] ?? 0,
  color: DEPT_COLOR[d] || '#4f7cff',
})));
const deptTotal = computed(() => deptItems.value.reduce((s, i) => s + i.value, 0));
const shareTotal = computed(() => shareItems.value.reduce((s, i) => s + i.value, 0));
const trendSeries = computed(() => trend.value.series.map((s) => ({ ...s, color: PROBLEM_TYPE_COLOR[s.type] || '#4f7cff' })));

/* 优化数据概览：周期内各状态任务分布，点击跳转优化任务列表对应状态 */
const optWin = computed(() => windowOf(rangeOpt.value, customOpt.value));
const optInWin = computed(() => props.optTasks.filter((t) => {
  const day = t.createdAt.slice(0, 10);
  return day >= DATE_AXIS[optWin.value[0]] && day <= DATE_AXIS[optWin.value[1]];
}));
const optItems = computed(() => OPT_STATUS_LABELS.map((s) => ({
  ...s,
  value: optInWin.value.filter((t) => t.status === s.key).length,
})));
const optTotal = computed(() => optInWin.value.length);
</script>

<template>
  <!-- 数据总览 + 问题类型占比：共用一块白色面板 -->
  <div class="qc-ov-panel">
    <QcSectionHead title="数据总览" :range="rangeOv" :custom="customOv" :on-range="(r: RangeKey) => (rangeOv = r)" :on-custom="(d: DateRange) => (customOv = d)" />
    <div class="qc-flat-grid cols-4">
      <div class="flat-card">
        <div class="k">监控系列编码数</div>
        <div class="v">{{ totalCodes() }}</div>
      </div>
      <div class="flat-card" title="风险占比 = 风险品数量 ÷ 监控系列编码数">
        <div class="k">风险品数量</div>
        <div class="v">
          {{ markedJunkCount() }}
          <span class="dept-pct">{{ `${((markedJunkCount() / totalCodes()) * 100).toFixed(1)}%` }}</span>
        </div>
      </div>
      <div class="flat-card">
        <div class="k">监控编码订单量</div>
        <div class="v">{{ ovTotals.orders.toLocaleString() }}</div>
      </div>
      <div class="flat-card" title="聊天风险率 = 聊天问题命中次数 ÷ 周期订单量">
        <div class="k">聊天问题命中次数</div>
        <div class="v">
          {{ ovTotals.chatHits }}
          <span class="dept-pct">{{ ovTotals.orders ? `${((ovTotals.chatHits / ovTotals.orders) * 100).toFixed(1)}%` : '0.0%' }}</span>
        </div>
      </div>
    </div>
    <div class="qc-ov-divider" />
    <QcSectionHead title="问题类型占比" :range="rangeShare" :custom="customShare" :on-range="(r: RangeKey) => (rangeShare = r)" :on-custom="(d: DateRange) => (customShare = d)" />
    <div class="qc-share-row">
      <div class="qc-flat-grid cols-3 qc-share-cards">
        <div
          v-for="i in shareItems"
          :key="i.label"
          class="flat-card type-card"
          :title="`查看「${i.label}」相关系列编码`"
          @click="props.onPickType(i.label)"
        >
          <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
          <div class="v">
            {{ i.value }}
            <span class="dept-pct">{{ shareTotal ? `${((i.value / shareTotal) * 100).toFixed(1)}%` : '0.0%' }}</span>
          </div>
        </div>
      </div>
      <div class="qc-share-pie">
        <PieChart :items="shareItems" :total-orders="shareTotals.orders" />
      </div>
    </div>
    <div class="qc-ov-divider" />
    <div class="qc-sec-head"><div class="qc-sec-title">问题涉及部门占比</div></div>
    <div class="qc-flat-grid cols-6">
      <div v-for="i in deptItems" :key="i.label" class="flat-card dept-card">
        <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
        <div class="v">
          {{ i.value }}
          <span class="dept-pct">{{ deptTotal ? `${((i.value / deptTotal) * 100).toFixed(1)}%` : '0.0%' }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 优化数据概览：独立白底模块，卡片点击跳转优化任务列表对应状态 -->
  <div class="qc-ov-panel">
    <QcSectionHead title="优化数据概览" :range="rangeOpt" :custom="customOpt" :on-range="(r: RangeKey) => (rangeOpt = r)" :on-custom="(d: DateRange) => (customOpt = d)" />
    <div class="qc-flat-grid cols-6">
      <div
        v-for="i in optItems"
        :key="i.key"
        class="flat-card dept-card opt-ov-card"
        :title="`查看「${i.label}」状态任务`"
        @click="props.onOpenOptStatus(i.key)"
      >
        <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
        <div class="v">
          {{ i.value }}
          <span class="dept-pct">{{ optTotal ? `${((i.value / optTotal) * 100).toFixed(1)}%` : '0.0%' }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 问题趋势与 TOP 问题商品：整体置入白底模块，与上方模块一致 -->
  <div class="qc-ov-panel qc-trend-ov">
    <QcSectionHead title="问题趋势与 TOP 问题商品" :range="rangeTrend" :custom="customTrend" :on-range="(r: RangeKey) => (rangeTrend = r)" :on-custom="(d: DateRange) => (customTrend = d)" />
    <div class="qc-trend-row">
      <div class="qc-trend-panel">
        <ProblemTrendChart :labels="trend.labels" :series="trendSeries" :orders="trendOrders.points" />
      </div>
      <div class="qc-panel">
        <div class="p-title top-head">TOP 问题商品
          <div class="qc-range-toggle">
            <button type="button" :class="topKey === 'refundRate' ? 'active' : ''" @click="topKey = 'refundRate'">按退款率</button>
            <button type="button" :class="topKey === 'chatRate' ? 'active' : ''" @click="topKey = 'chatRate'">按聊天风险率</button>
          </div>
        </div>
        <div v-for="(v, i) in top" :key="v.code.code" class="top-row" @click="props.onOpenCode(v.seriesCode, v.code.code)">
          <span class="top-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
          <div class="top-info">
            <div class="n">{{ v.code.code }}</div>
            <div class="m">{{ v.code.name }}</div>
          </div>
          <span v-if="topKey === 'refundRate'" class="rate" :class="rateCls(v.refundRate)">{{ pct(v.refundRate) }}</span>
          <span v-else class="rate" :class="v.chatRate > 0 ? 'bad' : ''">{{ pct(v.chatRate) }}</span>
          <StatusTag :status="junkStatusOf(v.refundRate)" />
        </div>
      </div>
    </div>
  </div>
</template>
