<script setup lang="ts">
/* ---------- 时间范围切换（自定义=点击触发器弹出日期组件选择区间） ---------- */
import { RANGE_LABELS, type DateRange, type RangeKey } from './qcCenterData';
import QcDateRangePicker from './QcDateRangePicker.vue';

defineProps<{
  value: RangeKey;
  custom: DateRange;
  onChange: (r: RangeKey) => void;
  onCustom: (d: DateRange) => void;
  /** 档位列表可覆写（系列详情抽屉含近30天档）；缺省 今日/近7天/自定义 */
  labels?: { key: RangeKey; label: string }[];
  /** 自定义区间可选日期边界（透传日期组件） */
  min?: string;
  max?: string;
}>();
</script>

<template>
  <div class="qc-range-wrap">
    <div class="qc-range-toggle">
      <button
        v-for="r in (labels ?? RANGE_LABELS)"
        :key="r.key"
        type="button"
        :class="value === r.key ? 'active' : ''"
        @click="onChange(r.key)"
      >
        {{ r.label }}
      </button>
    </div>
    <QcDateRangePicker v-if="value === 'custom'" :custom="custom" :on-change="onCustom" :min="min" :max="max" />
  </div>
</template>
