<script lang="ts">
import { DEFAULT_CUSTOM_RANGE, type DateRange, type RangeKey } from './qcCenterData';

export type SortKey = 'orders' | 'refundRate' | 'afterSales' | 'chatRiskHits';

/** 系列编码列表筛选条件（草稿/生效分离，与任务中心等模块交互一致） */
export type SeriesFilter = { q: string; platform: string; type: string; dept: string; duty: string; range: RangeKey; custom: DateRange };

export const DEFAULT_SERIES_FILTER: SeriesFilter = { q: '', platform: '全部平台', type: '全部类型', dept: '全部部门', duty: '全部部门', range: 'custom', custom: DEFAULT_CUSTOM_RANGE };
</script>

<script setup lang="ts">
/* ---------- 系列编码列表 ---------- */
import { ref } from 'vue';
import {
  QC_DEPTS,
  QC_PLATFORMS,
  QC_PROBLEM_TYPES,
  RANGE_LABELS,
  defaultDutyDept,
  type QcCenterCode,
  type QcCenterSeries,
} from './qcCenterData';
import type { Platform, PlatformStat } from './data';
import type { OptTask } from './qcOptData';
import BubbleSelect from '../../components/BubbleSelect.vue';
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
          <th style="cursor: pointer; user-select: none; text-align: right" title="点击排序" @click="props.onToggleSort('orders')">
            <span class="th-sort">
              订单量
              <svg class="sort-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                <path d="M6 1.2l3.4 4H2.6l3.4-4z" :fill="sortState('orders') === 'asc' ? 'var(--primary)' : '#c3c9d4'" />
                <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" :fill="sortState('orders') === 'desc' ? 'var(--primary)' : '#c3c9d4'" />
              </svg>
            </span>
          </th>
          <th style="cursor: pointer; user-select: none; text-align: left" title="点击排序" @click="props.onToggleSort('refundRate')">
            <span class="th-sort">
              退款率
              <svg class="sort-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                <path d="M6 1.2l3.4 4H2.6l3.4-4z" :fill="sortState('refundRate') === 'asc' ? 'var(--primary)' : '#c3c9d4'" />
                <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" :fill="sortState('refundRate') === 'desc' ? 'var(--primary)' : '#c3c9d4'" />
              </svg>
            </span>
          </th>
          <th style="cursor: pointer; user-select: none; text-align: left" title="点击排序" @click="props.onToggleSort('afterSales')">
            <span class="th-sort">
              售后单
              <svg class="sort-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                <path d="M6 1.2l3.4 4H2.6l3.4-4z" :fill="sortState('afterSales') === 'asc' ? 'var(--primary)' : '#c3c9d4'" />
                <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" :fill="sortState('afterSales') === 'desc' ? 'var(--primary)' : '#c3c9d4'" />
              </svg>
            </span>
          </th>
          <th style="cursor: pointer; user-select: none; text-align: left" title="点击排序" @click="props.onToggleSort('chatRiskHits')">
            <span class="th-sort">
              聊天风险
              <svg class="sort-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
                <path d="M6 1.2l3.4 4H2.6l3.4-4z" :fill="sortState('chatRiskHits') === 'asc' ? 'var(--primary)' : '#c3c9d4'" />
                <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" :fill="sortState('chatRiskHits') === 'desc' ? 'var(--primary)' : '#c3c9d4'" />
              </svg>
            </span>
          </th>
          <th>聊天风险率</th>
          <th>关联优化任务数</th>
          <th>上架平台</th>
          <th>命中问题类型</th>
          <th>问题涉及部门</th>
          <th>责任部门</th>
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
          <td colspan="13" style="text-align: center; color: var(--text-4); padding: 40px 0">无匹配系列</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
