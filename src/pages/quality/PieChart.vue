<script lang="ts">
export interface ShareItem {
  label: string;
  value: number;
  color: string;
}
</script>

<script setup lang="ts">
/* ---------- 问题类型占比：环形饼图（中心问题总数；图例点击显隐；悬浮色块气泡展示类型/占比/订单风险率） ---------- */
import { computed, ref } from 'vue';

const props = defineProps<{ items: ShareItem[]; totalOrders?: number }>();

const hidden = ref<Set<string>>(new Set());
const tip = ref<{ label: string; x: number; y: number } | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);

const toggle = (label: string) => {
  const next = new Set(hidden.value);
  if (next.has(label)) next.delete(label);
  else next.add(label);
  hidden.value = next;
};
const moveTip = (label: string) => (e: MouseEvent) => {
  const rect = wrapRef.value?.getBoundingClientRect();
  if (!rect) return;
  tip.value = { label, x: e.clientX - rect.left, y: e.clientY - rect.top };
};
const size = 190;
const cx = size / 2;
const cy = size / 2;
const R = 88;
const r = 54;
const allTotal = computed(() => props.items.reduce((s, i) => s + i.value, 0));
const visible = computed(() => props.items.filter((i) => !hidden.value.has(i.label) && i.value > 0));
const total = computed(() => visible.value.reduce((s, i) => s + i.value, 0));
const sharePct = (v: number) => `${allTotal.value ? ((v / allTotal.value) * 100).toFixed(1) : '0.0'}%`;
const riskPct = (v: number) => `${props.totalOrders ? ((v / props.totalOrders) * 100).toFixed(1) : '0.0'}%`;
const slices = computed(() => {
  let angle = -Math.PI / 2;
  return visible.value.map((i) => {
    const a0 = angle;
    const a1 = angle + (i.value / total.value) * Math.PI * 2;
    angle = a1;
    return { ...i, a0, a1 };
  });
});
const wedge = (a0: number, a1: number) => {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + R * Math.cos(a0);
  const y0 = cy + R * Math.sin(a0);
  const x1 = cx + R * Math.cos(a1);
  const y1 = cy + R * Math.sin(a1);
  return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${R},${R} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
};
const tipItem = computed(() => {
  if (!tip.value || hidden.value.has(tip.value.label)) return null;
  return props.items.find((i) => i.label === tip.value!.label) ?? null;
});
</script>

<template>
  <div ref="wrapRef" class="pie-wrap">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="pie-svg">
      <circle v-if="total === 0" :cx="cx" :cy="cy" :r="R" fill="#eef0f4" />
      <circle
        v-else-if="slices.length === 1"
        :cx="cx"
        :cy="cy"
        :r="R"
        :fill="slices[0].color"
        class="pie-slice"
        @click="toggle(slices[0].label)"
        @mousemove="moveTip(slices[0].label)"
        @mouseleave="tip = null"
      />
      <template v-else>
        <path
          v-for="s in slices"
          :key="s.label"
          :d="wedge(s.a0, s.a1)"
          :fill="s.color"
          class="pie-slice"
          @click="toggle(s.label)"
          @mousemove="moveTip(s.label)"
          @mouseleave="tip = null"
        />
      </template>
      <circle :cx="cx" :cy="cy" :r="r" fill="#f7f8fa" pointer-events="none" />
      <text :x="cx" :y="cy - 2" text-anchor="middle" class="pie-total">{{ total }}</text>
      <text :x="cx" :y="cy + 16" text-anchor="middle" class="pie-sub">问题数</text>
    </svg>
    <div v-if="tip && tipItem" class="pie-tip" :style="{ left: tip.x, top: tip.y }">
      <div class="pie-tip-line">
        <i :style="{ background: tipItem.color }" />
        {{ tipItem.label }}
        <b>{{ sharePct(tipItem.value) }}</b>
      </div>
      <div v-if="totalOrders" class="pie-tip-risk">订单风险率 {{ riskPct(tipItem.value) }}</div>
    </div>
    <div class="pie-legend">
      <span
        v-for="i in items"
        :key="i.label"
        class="pie-leg"
        :class="{ off: hidden.has(i.label) }"
        :title="hidden.has(i.label) ? `显示「${i.label}」` : `隐藏「${i.label}」`"
        @click="toggle(i.label)"
      >
        <i :style="{ background: hidden.has(i.label) ? '#d5d9e0' : i.color }" />
        {{ i.label }}
      </span>
    </div>
  </div>
</template>
