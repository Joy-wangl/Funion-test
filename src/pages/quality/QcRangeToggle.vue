<script setup lang="ts">
/* ---------- 时间范围切换（自定义=点击触发器弹出日期组件选择区间） ---------- */
import { RANGE_LABELS, type DateRange, type RangeKey } from './qcCenterData';
import QcDateRangePicker from './QcDateRangePicker.vue';

defineProps<{
  value: RangeKey;
  custom: DateRange;
  onChange: (r: RangeKey) => void;
  onCustom: (d: DateRange) => void;
}>();
</script>

<template>
  <div class="qc-range-wrap">
    <div class="qc-range-toggle">
      <button
        v-for="r in RANGE_LABELS"
        :key="r.key"
        type="button"
        :class="value === r.key ? 'active' : ''"
        @click="onChange(r.key)"
      >
        {{ r.label }}
      </button>
    </div>
    <QcDateRangePicker v-if="value === 'custom'" :custom="custom" :on-change="onCustom" />
  </div>
</template>
