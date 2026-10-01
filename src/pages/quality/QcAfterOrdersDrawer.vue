<script setup lang="ts">
/* ---------- 售后单列表抽屉（售后列表「查看详情」）：抽屉壳 + 复用售后单列表面板 ---------- */
import { computed, ref } from 'vue';
import type { QcCenterSeries } from './qcCenterData';
import { onlineAfterOrdersOf } from './qcOnlineData';
import QcAfterOrdersPanel from './QcAfterOrdersPanel.vue';

const props = defineProps<{
  series: QcCenterSeries;
  onClose: () => void;
}>();

const panelRef = ref<InstanceType<typeof QcAfterOrdersPanel> | null>(null);
const count = computed(() => onlineAfterOrdersOf(props.series).length);
</script>

<template>
  <div class="drawer-mask" @click="props.onClose" />
  <div class="drawer qc-after-orders-drawer">
    <div class="drawer-head">
      <div class="d-title">售后单列表 · {{ series.seriesCode }} {{ series.name }}</div>
      <span class="ao-count">共 {{ count.toLocaleString() }} 单</span>
      <button type="button" class="sg-btn ao-export" @click="panelRef?.exportCsv()">导出</button>
      <span class="x" @click="props.onClose">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </span>
    </div>
    <div class="drawer-body">
      <QcAfterOrdersPanel ref="panelRef" :series="series" />
    </div>
  </div>
</template>
