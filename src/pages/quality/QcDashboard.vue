<script setup lang="ts">
/* ---------- 问题类型看板 ---------- */
import { computed, ref } from 'vue';
import {
  DEPT_COLOR,
  DEFAULT_CUSTOM_RANGE,
  PROBLEM_TYPE_COLOR,
  QC_DEPTS,
  QC_PLATFORMS,
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
  type DateRange,
  type RangeKey,
} from './qcCenterData';
import {
  ONLINE_DEPT_COUNTS,
  ONLINE_OV,
  ONLINE_PLAT_DEPT_COUNTS,
  ONLINE_PLAT_TYPE_COUNTS,
  ONLINE_TYPE_COUNTS,
  deptShareTypeCounts,
  onlineAfterBrief,
  onlineAfterSessionBrief,
  onlineHitCats,
  onlineOrderTrend,
  onlineTopCodes,
  onlineTrend,
  type AfterJump,
} from './qcOnlineData';
import PieChart from './PieChart.vue';
import ProblemTrendChart from './ProblemTrendChart.vue';
import StatusTag from './StatusTag.vue';
import QcSectionHead from './QcSectionHead.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

const props = defineProps<{
  /** 品控-线上壳：看板走线上固定口径，不随时间范围变化 */
  online?: boolean;
  onOpenCode: (seriesCode: string, code: string) => void;
  onPickType: (type: string) => void;
  /** 品控-线上：部门卡点击跳转监控列表并预设责任部门 */
  onPickDept?: (dept: string) => void;
  /** 品控-线上：售后数据卡点击跳转售后列表并预选类型 / 状态 */
  onPickAfter?: (seed: AfterJump) => void;
}>();

const rangeOv = ref<RangeKey>('custom');
const rangeShare = ref<RangeKey>('custom');
const rangeTrend = ref<RangeKey>('custom');
const customOv = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });
const customShare = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });
const customTrend = ref<DateRange>({ ...DEFAULT_CUSTOM_RANGE });

const ranking = computed(() => problemTypeRanking());
const topKey = ref<'refundRate' | 'chatRate'>('refundRate');
const top = computed(() => (props.online ? onlineTopCodes(5, topKey.value) : topProblemCodes(5, topKey.value)));
const ovCodes = computed(() => (props.online ? ONLINE_OV.codes : totalCodes()));
const ovJunk = computed(() => (props.online ? ONLINE_OV.junk : markedJunkCount()));
const ovTotals = computed(() => (props.online
  ? { orders: ONLINE_OV.orders, chatHits: ONLINE_OV.chatHits }
  : rangeEventTotals(rangeOv.value, customOv.value)));
const shareCounts = computed(() => (props.online ? ONLINE_TYPE_COUNTS : rangeTypeCounts(rangeShare.value, customShare.value)));
const shareTotals = computed(() => (props.online
  ? { orders: ONLINE_OV.orders }
  : rangeEventTotals(rangeShare.value, customShare.value)));
const deptCounts = computed(() => (props.online ? ONLINE_DEPT_COUNTS : rangeDeptCounts(rangeShare.value, customShare.value)));
/* 部门下拉（品控-线上）：只看当前部门的问题类型占比与部门占比，默认全部 */
const shareDept = ref('全部');
const deptOpts = ['全部', ...QC_DEPTS];
const onShareDept = (v: string) => { shareDept.value = v; detailType.value = null; };
/* 平台下拉（品控-线上）：与部门下拉同排，只看当前平台的问题类型占比与部门占比，默认全部平台 */
const sharePlat = ref('全部平台');
const platOpts = ['全部平台', ...QC_PLATFORMS];
const onSharePlat = (v: string) => { sharePlat.value = v; detailType.value = null; };
const trend = computed(() => (props.online ? onlineTrend() : problemTrendData(rangeTrend.value, customTrend.value)));
const trendOrders = computed(() => (props.online ? onlineOrderTrend() : orderTrendData(rangeTrend.value, customTrend.value)));

/* 线上类型占比口径：部门、平台双下拉组合收敛（未选则回全局口径）；
   部门选中＝只展示该部门负责的问题类型（deptShareTypeCounts），平台选中＝按平台拆分 */
const onlineShareSource = computed(() => {
  const dept = shareDept.value;
  const plat = sharePlat.value;
  if (dept !== '全部') return deptShareTypeCounts(dept, plat);
  return plat === '全部平台' ? ONLINE_TYPE_COUNTS : (ONLINE_PLAT_TYPE_COUNTS[plat] ?? {});
});
/* 线上部门占比口径：平台下拉收敛（未选回全局部门口径） */
const onlineDeptView = computed(() => (sharePlat.value === '全部平台' ? ONLINE_DEPT_COUNTS : ONLINE_PLAT_DEPT_COUNTS[sharePlat.value]));

const shareItems = computed(() => (props.online
  ? Object.entries(onlineShareSource.value).map(([label, value]) => ({
    label,
    value,
    color: PROBLEM_TYPE_COLOR[label] || '#4f7cff',
  }))
  : ranking.value.map((r) => ({
    label: r.type,
    value: shareCounts.value[r.type] ?? 0,
    color: PROBLEM_TYPE_COLOR[r.type] || '#4f7cff',
  }))));
const deptItems = computed(() => QC_DEPTS
  .filter((d) => !props.online || shareDept.value === '全部' || d === shareDept.value)
  .map((d) => ({
    label: d,
    value: props.online ? (onlineDeptView.value[d] ?? 0) : (deptCounts.value[d] ?? 0),
    color: DEPT_COLOR[d] || '#4f7cff',
  })));
const deptTotal = computed(() => deptItems.value.reduce((s, i) => s + i.value, 0));

/* 问题类型占比明细态（2026-10-15 下钻定稿）：大类视图点击卡片/扇区下钻，标题改「←返回 + 当前大类名」，
   卡片区/环图展示该大类全部小类的数量/占比；返回恢复大类视图。下钻态全局口径，不随平台/部门筛选 */
const SUB_COLORS = ['#e5484d', '#f76b15', '#7c3aed', '#4f7cff', '#12a594', '#e93d82', '#d46b08', '#1f9d55'];
const detailType = ref<string | null>(null);
const detailItems = computed(() => {
  if (!props.online || !detailType.value) return null;
  const cat = onlineHitCats().find((c) => c.name === detailType.value);
  if (!cat) return null;
  // 明细态标题已标大类，卡片/图例只展示子名，去掉「XX类-」前缀避免重复
  const prefix = `${cat.name}类-`;
  return cat.subs.map((s, i) => ({ label: s.name.startsWith(prefix) ? s.name.slice(prefix.length) : s.name, value: s.hits, color: SUB_COLORS[i % SUB_COLORS.length] }));
});
const pieItems = computed(() => detailItems.value ?? shareItems.value);
const cardTotal = computed(() => pieItems.value.reduce((s, i) => s + i.value, 0));
const trendSeries = computed(() => trend.value.series.map((s) => ({ ...s, color: PROBLEM_TYPE_COLOR[s.type] || '#4f7cff' })));

/* 售后模块（品控-线上固定口径）：「售后数据」块已整体下线（2026-10-06）；原两张售后类型卡 2026-10-07 按用户
   「合并改为售后订单数，现在有点重复了」并为单卡：值＝售后单总数，子行＝关联会话数量＋问题会话预警占比 */
const afterBrief = computed(() => onlineAfterBrief());
const afterSess = computed(() => onlineAfterSessionBrief());
const afterCard = computed(() => {
  const s = afterSess.value;
  const sess = s.refund + s.exchReship;
  const prob = s.probRefund + s.probExchReship;
  return {
    value: afterBrief.value.total,
    sess,
    prob,
    rate: sess ? (prob / sess) * 100 : 0,
    tip: '查看售后单明细',
  };
});
</script>

<template>
  <!-- 数据总览 + 问题类型占比：共用一块白色面板 -->
  <div class="qc-ov-panel">
    <QcSectionHead title="数据总览" :range="rangeOv" :custom="customOv" :on-range="(r: RangeKey) => (rangeOv = r)" :on-custom="(d: DateRange) => (customOv = d)" />
    <div class="qc-flat-grid cols-5">
      <div class="flat-card">
        <div class="k">监控系列编码数</div>
        <div class="v">{{ ovCodes.toLocaleString() }}</div>
      </div>
      <div class="flat-card">
        <div class="k">监控编码订单量</div>
        <div class="v">{{ ovTotals.orders.toLocaleString() }}</div>
      </div>
      <div
        class="flat-card after-card"
        :class="{ clickable: !!props.onPickAfter }"
        :title="props.onPickAfter ? afterCard.tip : undefined"
        @click="props.onPickAfter?.({})"
      >
        <div class="k">售后订单数</div>
        <div class="v">{{ afterCard.value.toLocaleString() }}</div>
        <div class="after-sess sess-row">
          <span>关联会话数量 <b>{{ afterCard.sess.toLocaleString() }}</b></span>
          <span class="sess-warn" :title="`问题会话数量 ${afterCard.prob.toLocaleString()}`"><i class="sess-warn-ico">!</i>{{ afterCard.rate.toFixed(1) }}%</span>
        </div>
      </div>
      <div class="flat-card" title="聊天风险率 = 聊天问题命中次数 ÷ 周期订单量">
        <div class="k">聊天问题命中次数</div>
        <div class="v">
          {{ ovTotals.chatHits }}
          <span class="dept-pct">{{ ovTotals.orders ? `${((ovTotals.chatHits / ovTotals.orders) * 100).toFixed(1)}%` : '0.0%' }}</span>
        </div>
      </div>
      <div class="flat-card" title="风险占比 = 风险品数量 ÷ 监控系列编码数">
        <div class="k">风险品数量</div>
        <div class="v">
          {{ ovJunk.toLocaleString() }}
          <span class="dept-pct">{{ `${((ovJunk / ovCodes) * 100).toFixed(1)}%` }}</span>
        </div>
      </div>
    </div>
    <div class="qc-ov-divider" />
    <QcSectionHead title="问题类型占比" :range="rangeShare" :custom="customShare" :on-range="(r: RangeKey) => (rangeShare = r)" :on-custom="(d: DateRange) => (customShare = d)">
      <template #title>
        <template v-if="detailType">
          <button type="button" class="qc-detail-back" title="返回全部大类" @click="detailType = null">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <b class="qc-detail-name">{{ detailType }}</b>
        </template>
        <template v-else>问题类型占比</template>
      </template>
      <template v-if="online && !detailType">
        <BubbleSelect class-name="sg-select qc-share-plat" :value="sharePlat" :options="platOpts" @change="onSharePlat" />
        <BubbleSelect class-name="sg-select qc-share-dept" :value="shareDept" :options="deptOpts" @change="onShareDept" />
      </template>
    </QcSectionHead>
    <div class="qc-share-row">
      <div class="qc-flat-grid cols-3 qc-share-cards">
        <div
          v-for="i in pieItems"
          :key="i.label"
          class="flat-card type-card"
          :title="detailType ? `查看「${detailType}」相关系列编码` : `查看「${i.label}」问题小类`"
          @click="detailType ? props.onPickType(detailType) : (detailType = i.label)"
        >
          <button
            v-if="online && !detailType"
            type="button"
            class="qc-card-detail"
            title="选中该问题类型进入列表"
            @click.stop="props.onPickType(i.label)"
          >明细</button>
          <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
          <div class="v">
            {{ i.value }}
            <span class="dept-pct">{{ cardTotal ? `${((i.value / cardTotal) * 100).toFixed(1)}%` : '0.0%' }}</span>
          </div>
        </div>
      </div>
      <div class="qc-share-pie">
        <PieChart
          :items="pieItems"
          :total-orders="shareTotals.orders"
          :drillable="!!online && !detailType"
          :on-drill="(l: string) => (detailType = l)"
        />
      </div>
    </div>
    <div class="qc-ov-divider" />
    <div class="qc-sec-head"><div class="qc-sec-title">问题涉及部门占比</div></div>
    <div class="qc-flat-grid cols-6">
      <div
        v-for="i in deptItems"
        :key="i.label"
        class="flat-card dept-card"
        :class="{ clickable: !!props.onPickDept }"
        :title="props.onPickDept ? `查看「${i.label}」相关系列编码` : undefined"
        @click="props.onPickDept?.(i.label)"
      >
        <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
        <div class="v">
          {{ i.value }}
          <span class="dept-pct">{{ deptTotal ? `${((i.value / deptTotal) * 100).toFixed(1)}%` : '0.0%' }}</span>
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
