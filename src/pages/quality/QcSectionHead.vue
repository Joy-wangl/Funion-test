<script setup lang="ts">
/* ---------- 区块标题 + 时间范围 ---------- */
import type { DateRange, RangeKey } from './qcCenterData';
import QcRangeToggle from './QcRangeToggle.vue';

defineProps<{
  title: string;
  range: RangeKey;
  custom: DateRange;
  onRange: (r: RangeKey) => void;
  onCustom: (d: DateRange) => void;
}>();
</script>

<template>
  <div class="qc-sec-head">
    <div class="qc-sec-title">{{ title }}</div>
    <QcRangeToggle :value="range" :custom="custom" :on-change="onRange" :on-custom="onCustom" />
  </div>
</template>
