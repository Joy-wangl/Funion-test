<script setup lang="ts">
/* 使用趋势弹窗：参考品控中心趋势图——指标 pills + 周期切换 + 双线趋势（1:1 移植自 Dashboard.tsx） */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { AppItem } from './data';
import { RANGES, daySeries, factorOf, fmt, iso, noise, type Range } from './dashUtil';
import ApDateRangePicker from './ApDateRangePicker.vue';

const props = defineProps<{
  app: AppItem;
  onClose: () => void;
}>();

const tr = ref<Range | 'custom'>(30);
/* 自定义区间（限近 90 天内） */
const custom = ref((() => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: iso(start), end: iso(end) };
})());
/* 指标显隐（参考品控：chip 点击切换） */
const hidden = ref<Set<'use' | 'new'>>(new Set());
const toggle = (k: 'use' | 'new') => {
  const next = new Set(hidden.value);
  if (next.has(k)) next.delete(k);
  else next.add(k);
  hidden.value = next;
};

const data = computed(() => {
  const app = props.app;
  /* 窗口：预设=近 N 天；自定义=选定区间（钳制近 90 天、反序交换） */
  let n: number;
  let off: number;
  if (tr.value !== 'custom') {
    n = tr.value; off = 0;
  } else {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const parse = (s: string) => { const d = new Date(`${s}T00:00:00`); return Number.isNaN(+d) ? new Date(today) : d; };
    let s = parse(custom.value.start);
    let e = parse(custom.value.end);
    const min = new Date(today); min.setDate(min.getDate() - 89);
    if (+s < +min) s = min;
    if (+e > +today) e = today;
    if (+s > +e) { const t = s; s = e; e = t; }
    n = Math.max(2, Math.round((+e - +s) / 86400000) + 1);
    off = Math.round((+today - +e) / 86400000);
  }
  const useN = Math.round(app.users * factorOf(n) * noise(app.id));
  const usePts = daySeries(app.id, useN, n, off);
  const newPts = daySeries(`${app.id}:new`, Math.round(useN * 0.18), n, off);
  const labels: string[] = [];
  const end = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - (off + i));
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  const sum = (a: number[]) => Math.round(a.reduce((s, v) => s + v, 0));
  /* 版本上线日在图表窗口内的下标：之前=旧版完成带，之后=当前版本运行中带 */
  const first = new Date();
  first.setDate(first.getDate() - (off + n - 1));
  const relIdx = Math.round((new Date(props.app.release).getTime() - first.getTime()) / 86400000);
  return { usePts, newPts, labels, useSum: sum(usePts), newSum: sum(newPts), relIdx, n };
});

const W = 960;
const H = 300;
const L = 48;
const R = 16;
const T = 18;
const B = 34;
const n = computed(() => data.value.n);
/* 悬浮提示（与品控趋势图交互一致）：竖向参考线 + 暗色 tooltip */
const hover = ref<{ i: number; px: number; py: number } | null>(null);
const wrapRef = ref<HTMLDivElement | null>(null);
watch(data, () => { hover.value = null; });
const mx = computed(() => Math.max(...(hidden.value.has('use') ? [] : data.value.usePts), ...(hidden.value.has('new') ? [] : data.value.newPts), 1) * 1.15);
const x = (i: number) => L + (i * (W - L - R)) / (n.value - 1);
const y = (v: number) => T + (1 - v / mx.value) * (H - T - B);
const step = computed(() => Math.max(1, Math.ceil(n.value / 8)));
const line = (pts: number[]) => pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
const onMove = (e: MouseEvent) => {
  const wrap = wrapRef.value;
  const rect = wrap?.querySelector('svg')?.getBoundingClientRect();
  if (!wrap || !rect) return;
  const fx = ((e.clientX - rect.left) / rect.width) * W;
  const i = Math.max(0, Math.min(n.value - 1, Math.round(((fx - L) / (W - L - R)) * (n.value - 1))));
  const wr = wrap.getBoundingClientRect();
  hover.value = { i, px: (x(i) / W) * rect.width, py: Math.max(8, Math.min(e.clientY - wr.top, wr.height - 8)) };
};

/* 鼠标滚轮切换时间范围（与品控趋势图交互一致） */
const bodyRef = ref<HTMLDivElement | null>(null);
let lastWheel = 0;
const onWheel = (e: WheelEvent) => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastWheel < 260) return;
  lastWheel = now;
  const prev = tr.value;
  const idx = prev === 'custom' ? -1 : RANGES.indexOf(prev);
  tr.value = RANGES[(idx + (e.deltaY > 0 ? 1 : 2)) % RANGES.length];
};
onMounted(() => bodyRef.value?.addEventListener('wheel', onWheel, { passive: false }));
onBeforeUnmount(() => bodyRef.value?.removeEventListener('wheel', onWheel));
</script>

<template>
  <div class="ap-trend-mask" @click.self="onClose()">
    <div ref="bodyRef" class="ap-trend-modal">
      <div class="ap-trend-head">
        <div>
          <b>趋势图</b>
          <i>{{ app.name }} · {{ app.category }}</i>
        </div>
        <button type="button" class="ap-trend-close" @click="onClose()">×</button>
      </div>
      <div class="ap-trend-bar">
        <div class="ap-trend-chips">
          <button
            type="button"
            class="ap-trend-chip"
            :class="hidden.has('new') ? 'off' : ''"
            :title="hidden.has('new') ? '显示「新增人数」' : '隐藏「新增人数」'"
            @click="toggle('new')"
          >
            <i :style="{ background: hidden.has('new') ? '#d5d9e0' : '#22a06b' }" />新增人数<b>{{ fmt(data.newSum) }}</b>
          </button>
          <button
            type="button"
            class="ap-trend-chip"
            :class="hidden.has('use') ? 'off' : ''"
            :title="hidden.has('use') ? '显示「总使用人次」' : '隐藏「总使用人次」'"
            @click="toggle('use')"
          >
            <i :style="{ background: hidden.has('use') ? '#d5d9e0' : '#4f7cff' }" />总使用人次<b>{{ fmt(data.useSum) }}</b>
          </button>
        </div>
        <span class="ap-dash-range">
          <button v-for="r in RANGES" :key="r" type="button" :class="tr === r ? 'on' : ''" @click="tr = r">近{{ r }}天</button>
          <button type="button" :class="tr === 'custom' ? 'on' : ''" @click="tr = 'custom'">自定义</button>
        </span>
        <ApDateRangePicker v-if="tr === 'custom'" :value="custom" :on-change="(v) => (custom = v)" />
      </div>
      <div ref="wrapRef" class="ap-trend-chartwrap">
        <svg class="ap-trend-svg" :viewBox="`0 0 ${W} ${H}`" @mousemove="onMove" @mouseleave="hover = null">
          <g v-for="f in [0, 0.25, 0.5, 0.75, 1]" :key="f">
            <line :x1="L" :x2="W - R" :y1="T + (1 - f) * (H - T - B)" :y2="T + (1 - f) * (H - T - B)" stroke="#e7eaf0" stroke-dasharray="3 4" />
            <text :x="L - 8" :y="T + (1 - f) * (H - T - B) + 3" text-anchor="end" class="ax">{{ Math.round(f * mx) }}</text>
          </g>
          <!-- 版本时间段色带：参考品控中心趋势图（完成=绿 / 运行中=蓝），垫在折线下 -->
          <g v-if="data.relIdx > 0">
            <rect :x="x(0)" :y="T" :width="Math.max(2, x(Math.min(data.relIdx, n - 1)) - x(0))" :height="H - T - B" fill="#22a06b" opacity="0.08" />
            <line :x1="x(0)" :x2="x(0)" :y1="T" :y2="H - B" stroke="#22a06b" stroke-dasharray="4 4" opacity="0.6" />
            <line v-if="data.relIdx < n" :x1="x(data.relIdx)" :x2="x(data.relIdx)" :y1="T" :y2="H - B" stroke="#22a06b" opacity="0.6" />
            <text :x="x(0) + 4" :y="T + 10" fill="#22a06b" class="band-lb">上一版·完成</text>
          </g>
          <g v-if="data.relIdx < n">
            <rect :x="x(Math.max(data.relIdx, 0))" :y="T" :width="Math.max(2, W - R - x(Math.max(data.relIdx, 0)))" :height="H - T - B" fill="#4f7cff" opacity="0.08" />
            <line :x1="x(Math.max(data.relIdx, 0))" :x2="x(Math.max(data.relIdx, 0))" :y1="T" :y2="H - B" stroke="#4f7cff" stroke-dasharray="4 4" opacity="0.6" />
            <text :x="x(Math.max(data.relIdx, 0)) + 4" :y="T + 10" fill="#4f7cff" class="band-lb">v{{ app.version ?? '1.0.0' }}·运行中</text>
          </g>
          <polyline v-if="!hidden.has('use')" :points="line(data.usePts)" fill="none" stroke="#4f7cff" stroke-width="2.2" />
          <polyline v-if="!hidden.has('new')" :points="line(data.newPts)" fill="none" stroke="#22a06b" stroke-width="2.2" />
          <template v-if="!hidden.has('use')">
            <circle v-for="(v, i) in data.usePts" :key="`u${i}`" :cx="x(i)" :cy="y(v)" :r="hover?.i === i ? 4 : 2.4" fill="#4f7cff" />
          </template>
          <template v-if="!hidden.has('new')">
            <circle v-for="(v, i) in data.newPts" :key="`n${i}`" :cx="x(i)" :cy="y(v)" :r="hover?.i === i ? 4 : 2.4" fill="#22a06b" />
          </template>
          <line
            v-if="hover && (!hidden.has('use') || !hidden.has('new'))"
            :x1="x(hover.i)"
            :x2="x(hover.i)"
            :y1="T"
            :y2="H - B"
            stroke="#8a94a6"
            stroke-dasharray="4 4"
            opacity="0.5"
          />
          <template v-for="(lb, i) in data.labels" :key="`${lb}-${i}`">
            <text v-if="i % step === 0 || i === n - 1" :x="x(i)" :y="H - 10" text-anchor="middle" class="ax">{{ lb }}</text>
          </template>
        </svg>
        <div
          v-if="hover && (!hidden.has('use') || !hidden.has('new'))"
          class="ap-trend-tip"
          :style="{
            left: `${hover.px}px`,
            top: `${hover.py}px`,
            transform: hover.px > (wrapRef ? wrapRef.clientWidth : 800) - 190 ? 'translate(calc(-100% - 12px), -50%)' : 'translate(12px, -50%)',
          }"
        >
          <div class="ap-trend-tip-date">{{ data.labels[hover.i] }}</div>
          <div v-if="!hidden.has('use')" class="ap-trend-tip-line"><i style="background:#4f7cff" />总使用人次<b>{{ fmt(Math.round(data.usePts[hover.i])) }}</b></div>
          <div v-if="!hidden.has('new')" class="ap-trend-tip-line"><i style="background:#22a06b" />新增人数<b>{{ fmt(Math.round(data.newPts[hover.i])) }}</b></div>
        </div>
      </div>
      <div class="ap-trend-foot">
        <span class="pd">{{ data.labels[0] }} → {{ data.labels[n - 1] }}</span>
        <button type="button" class="ap-trend-closebtn" @click="onClose()">关闭</button>
      </div>
    </div>
  </div>
</template>
