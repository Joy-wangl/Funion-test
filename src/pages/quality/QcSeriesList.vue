<script lang="ts">
import { DEFAULT_CUSTOM_RANGE, type DateRange, type RangeKey } from './qcCenterData';

export type SortKey = 'orders' | 'refundRate' | 'afterSales' | 'chatRiskHits';

/** 系列编码列表筛选条件（草稿/生效分离，与任务中心等模块交互一致）；标签四维与品控 2.0 编码标签同源 */
export type SeriesFilter = {
  q: string;
  platform: string;
  type: string;
  dept: string;
  duty: string;
  range: RangeKey;
  custom: DateRange;
  /** 标签级联多选：一级大类名 / 二级标签名混选，并集语义；空 = 不限 */
  tags: string[];
  tagHealth: string;
  tagJudge: string;
};

export const DEFAULT_SERIES_FILTER: SeriesFilter = {
  q: '',
  platform: '全部平台',
  type: '全部类型',
  dept: '全部部门',
  duty: '全部部门',
  range: 'custom',
  custom: DEFAULT_CUSTOM_RANGE,
  tags: [],
  tagHealth: '全部等级',
  tagJudge: '全部方式',
};
</script>

<script setup lang="ts">
/* ---------- 系列编码列表 ---------- */
import { computed, ref } from 'vue';
import {
  QC_DEPTS,
  QC_PLATFORMS,
  QC_PROBLEM_TYPES,
  RANGE_LABELS,
  defaultDutyDept,
  type QcCenterCode,
  type QcCenterSeries,
} from './qcCenterData';
import { JUDGE_LABEL, QC2_CATS, qc2Labels } from '../quality2/qc2Data';
import type { Platform, PlatformStat } from './data';
import type { OptTask } from './qcOptData';
import BubbleSelect from '../../components/BubbleSelect.vue';
import CascadeSelect from '../../components/CascadeSelect.vue';
import SortTh from '../../components/SortTh.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';
import QcSeriesRow from './QcSeriesRow.vue';

const props = defineProps<{
  series: QcCenterSeries[];
  sortKey: SortKey;
  sortDesc: boolean;
  onToggleSort: (key: SortKey) => void;
  draft: SeriesFilter;
  onDraft: (patch: Partial<SeriesFilter>) => void;
  onQuery: () => void;
  onReset: () => void;
  onDetail: (s: QcCenterSeries) => void;
  onChat: (codes: QcCenterCode[], platforms: Platform[], platform: Platform) => void;
  onTrend: (s: QcCenterSeries) => void;
  onTrendStat: (stat: PlatformStat, label: string, seriesCode: string) => void;
  dutyMap: Record<string, string>;
  onDuty: (code: string, dept: string | null) => void;
  optTasks: OptTask[];
  onCreateOpt: (s: QcCenterSeries) => void;
}>();

const expanded = ref<Set<string>>(new Set());
const toggle = (key: string) => {
  const next = new Set(expanded.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expanded.value = next;
};

const sortState = (key: SortKey): 'none' | 'desc' | 'asc' =>
  props.sortKey !== key ? 'none' : props.sortDesc ? 'desc' : 'asc';

/* 标签级联多选选项：一级 = 大类（可勾选），二级 = 启用中标签（可单独勾选） */
const tagGroups = computed(() => QC2_CATS.map((cat) => ({
  name: cat,
  children: qc2Labels.value.filter((l) => l.enabled && l.cat === cat).map((l) => l.name),
})).filter((g) => g.children.length > 0));
</script>

<template>
  <div class="qc-head">
    <div class="qc-title">
      监控列表
      <span class="qc-desc">共 {{ series.length }} 个系列 · 展开查看各平台数据与下属商品编码</span>
    </div>
  </div>
  <div class="sg-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>搜索</label>
        <input
          class="sg-input"
          placeholder="请输入店铺 / 系列编码 / 商品编码"
          :value="draft.q"
          @input="props.onDraft({ q: ($event.target as HTMLInputElement).value })"
        >
      </div>
      <div class="sg-field">
        <label>平台</label>
        <BubbleSelect class-name="sg-select" :value="draft.platform" :options="['全部平台', ...QC_PLATFORMS]" @change="(v: string) => props.onDraft({ platform: v })" />
      </div>
      <div class="sg-field">
        <label>标签</label>
        <CascadeSelect
          class-name="sg-select"
          multiple
          searchable
          :groups="tagGroups"
          :values="draft.tags"
          all-label="全部标签"
          @multi-change="(v: string[]) => props.onDraft({ tags: v })"
        />
      </div>
      <div class="sg-field">
        <label>健康等级</label>
        <BubbleSelect class-name="sg-select" :value="draft.tagHealth" :options="['全部等级', 'A', 'B', 'C', 'D']" @change="(v: string) => props.onDraft({ tagHealth: v })" />
      </div>
      <div class="sg-field">
        <label>判定方式</label>
        <BubbleSelect class-name="sg-select" :value="draft.tagJudge" :options="['全部方式', JUDGE_LABEL.rule, JUDGE_LABEL.ai]" @change="(v: string) => props.onDraft({ tagJudge: v })" />
      </div>
      <div class="sg-field">
        <label>问题类型</label>
        <BubbleSelect class-name="sg-select" :value="draft.type" :options="['全部类型', ...QC_PROBLEM_TYPES]" @change="(v: string) => props.onDraft({ type: v })" />
      </div>
      <div class="sg-field">
        <label>问题涉及部门</label>
        <BubbleSelect class-name="sg-select" :value="draft.dept" :options="['全部部门', ...QC_DEPTS]" @change="(v: string) => props.onDraft({ dept: v })" />
      </div>
      <div class="sg-field">
        <label>责任部门</label>
        <BubbleSelect class-name="sg-select" :value="draft.duty" :options="['全部部门', ...QC_DEPTS]" @change="(v: string) => props.onDraft({ duty: v })" />
      </div>
      <div class="sg-field">
        <label>时间范围</label>
        <BubbleSelect
          class-name="sg-select"
          :value="RANGE_LABELS.find((r) => r.key === draft.range)?.label ?? '自定义'"
          :options="RANGE_LABELS.map((r) => r.label)"
          @change="(v: string) => props.onDraft({ range: RANGE_LABELS.find((r) => r.label === v)?.key ?? 'custom' })"
        />
      </div>
      <div v-if="draft.range === 'custom'" class="sg-field">
        <label>日期区间</label>
        <QcDateRangePicker :custom="draft.custom" :on-change="(d) => props.onDraft({ custom: d })" />
      </div>
      <div class="sg-field-actions">
        <button class="sg-btn" @click="props.onReset">
          重置
        </button>
        <button class="sg-btn primary" @click="props.onQuery">
          查询
        </button>
      </div>
    </div>
  </div>
  <div class="qc-body">
    <table class="table qc-wide">
      <thead>
        <tr>
          <th style="width: 40px" />
          <th>系列编码</th>
          <SortTh label="订单量" align="right" :state="sortState('orders')" @sort="props.onToggleSort('orders')" />
          <SortTh label="退款率" :state="sortState('refundRate')" @sort="props.onToggleSort('refundRate')" />
          <SortTh label="售后单" :state="sortState('afterSales')" @sort="props.onToggleSort('afterSales')" />
          <SortTh label="聊天风险" :state="sortState('chatRiskHits')" @sort="props.onToggleSort('chatRiskHits')" />
          <th>聊天风险率</th>
          <th>上架平台</th>
          <th>命中问题类型</th>
          <th>健康等级</th>
          <th>命中标签</th>
          <th>问题涉及部门</th>
          <th>责任部门</th>
          <th>关联优化任务数</th>
          <th style="width: 140px">操作</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="s in series" :key="s.seriesCode">
          <QcSeriesRow
            :series="s"
            :open="expanded.has(s.seriesCode)"
            :on-toggle="() => toggle(s.seriesCode)"
            :on-detail="() => props.onDetail(s)"
            :on-chat="(codes, platforms, platform) => props.onChat(codes, platforms, platform)"
            :on-trend="() => props.onTrend(s)"
            :on-trend-stat="props.onTrendStat"
            :duty="dutyMap[s.seriesCode] ?? defaultDutyDept(s)"
            :has-override="!!dutyMap[s.seriesCode]"
            :on-duty="props.onDuty"
            :opt-count="optTasks.filter((t) => t.seriesCode === s.seriesCode).length"
            :on-create-opt="() => props.onCreateOpt(s)"
          />
        </template>
        <tr v-if="series.length === 0">
          <td colspan="15" style="text-align: center; color: var(--text-4); padding: 40px 0">无匹配系列</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
