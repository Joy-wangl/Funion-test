<script setup lang="ts">
import { computed, ref } from 'vue';
import type { SubTask } from './data';
import { retrySub } from './data';
import { pushToast } from '../../components/toast';
import { headStepsOf, step3Of, shopStatusMeta, shopStatusText, stepLabels } from './tcSteps';

/** 节点状态单元格：节点一/二统一 + 节点三汇总；逐店结果经「查看」以气泡浮层展示 */
const props = defineProps<{ sub: SubTask }>();
const head = computed(() => headStepsOf(props.sub));
const step3 = computed(() => step3Of(props.sub));
/* 已进入节点三（有汇总）才提供查看入口 */
const canExpand = computed(() => props.sub.shops.length > 0 && step3.value.sum !== '');

/* 气泡坐标（浮层坐标属行内样式白名单）；Teleport 至 body 避免被表格 overflow 裁剪 */
const BUBBLE_W = 232;
const bubble = ref<{ x: number; y: number } | null>(null);
const taskIdText = computed(() => String(props.sub.taskId).padStart(6, '0'));
const onToggle = (e: MouseEvent) => {
  if (bubble.value) { bubble.value = null; return; }
  const btn = e.currentTarget as HTMLElement;
  const r = btn.getBoundingClientRect();
  /* 气泡顶边对齐被点击行顶边、置于入口右侧，避免浮在下方行上被误读为他行内容 */
  const rowTop = btn.closest('tr')?.getBoundingClientRect().top ?? r.bottom + 6;
  const h = props.sub.shops.length * 30 + 76;
  const x = Math.max(8, Math.min(r.right + 8, window.innerWidth - BUBBLE_W - 8));
  const y = Math.max(8, Math.min(rowTop + 2, window.innerHeight - h - 8));
  bubble.value = { x, y };
};
const onRetry = () => {
  retrySub(props.sub);
  pushToast('重试中…');
  window.setTimeout(() => pushToast('重试成功，任务状态已同步'), 1200);
};
</script>

<template>
  <div class="tc-steps" :class="sub.status === 'queued' ? 'gray' : ''">
    <div v-for="(st, i) in head" :key="stepLabels[i]" class="tc-step">
      <i :class="st.dot" />
      <span>{{ stepLabels[i] }}：</span>
      <span class="v" :class="st.cls">{{ st.v }}</span>
    </div>
    <div class="tc-step">
      <i :class="step3.dot" />
      <span>{{ stepLabels[2] }}：</span>
      <span class="v" :class="step3.cls">{{ step3.v }}</span>
      <button
        v-if="canExpand"
        type="button"
        class="tc-step-toggle"
        :class="bubble ? 'open' : ''"
        title="查看店铺结果"
        @click="onToggle"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </button>
    </div>
  </div>

  <Teleport to="body">
    <template v-if="bubble">
      <div class="tc-bubble-mask" @click="bubble = null" />
      <div class="tc-bubble" :style="{ left: `${bubble.x}px`, top: `${bubble.y}px` }">
        <div class="tc-bubble-title">商品发布店铺 · {{ taskIdText }}</div>
        <div v-for="sp in sub.shops" :key="sp.platform + sp.shop" class="tc-bubble-row">
          <i :class="shopStatusMeta(sp.status).dot" />
          <span class="tc-bubble-name">{{ sp.shop }}</span>
          <span class="tc-bubble-val" :class="shopStatusMeta(sp.status).cls">{{ shopStatusText[sp.status] }}</span>
          <a v-if="sp.status === 'failed'" class="tc-bubble-retry" @click.prevent="onRetry">重试</a>
        </div>
      </div>
    </template>
  </Teleport>
</template>
