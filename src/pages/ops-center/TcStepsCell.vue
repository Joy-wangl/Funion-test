<script setup lang="ts">
import { computed, ref } from 'vue';
import { RISK_CTRL_REASON, type SubTask } from './data';
import { headStepsOf, step3Of, stepLabelsOf } from './tcSteps';

/** 节点状态单元格：一品一店一任务，节点竖排（发布/铺货类含校验管控商品）；失败节点提供失败原因气泡 */
const props = defineProps<{ sub: SubTask; type?: string }>();
const labels = computed(() => stepLabelsOf(props.type ?? ''));
const head = computed(() => headStepsOf(props.sub, props.type ?? ''));
const step3 = computed(() => step3Of(props.sub, props.type ?? ''));
/* 校验管控商品节点失败原因（风险管控口径） */
const verifyReason = computed(() =>
  (props.sub.status === 'failed' && props.sub.failStep === 1 ? props.sub.riskReason || RISK_CTRL_REASON : ''),
);
/* 店铺节点失败原因（统一节点失败无店铺原因，不展示入口） */
const shopReason = computed(() =>
  (props.sub.status === 'failed' && props.sub.failStep === undefined ? props.sub.shops[0]?.reason || '其它' : ''),
);

/* 气泡坐标（浮层坐标属行内样式白名单）；Teleport 至 body 避免被表格 overflow 裁剪 */
const BUBBLE_W = 232;
const bubble = ref<{ x: number; y: number; kind: 'verify' | 'shop' } | null>(null);
const bubbleReason = computed(() => (bubble.value?.kind === 'verify' ? verifyReason.value : shopReason.value));
const taskIdText = computed(() => String(props.sub.taskId).padStart(6, '0'));
const onToggle = (e: MouseEvent, kind: 'verify' | 'shop') => {
  if (bubble.value) { bubble.value = null; return; }
  const btn = e.currentTarget as HTMLElement;
  const r = btn.getBoundingClientRect();
  /* 气泡顶边对齐被点击行顶边、置于入口右侧，避免浮在下方行上被误读为他行内容 */
  const rowTop = btn.closest('tr')?.getBoundingClientRect().top ?? r.bottom + 6;
  const h = 84;
  const x = Math.max(8, Math.min(r.right + 8, window.innerWidth - BUBBLE_W - 8));
  const y = Math.max(8, Math.min(rowTop + 2, window.innerHeight - h - 8));
  bubble.value = { x, y, kind };
};
</script>

<template>
  <div class="tc-steps" :class="sub.status === 'queued' ? 'gray' : ''">
    <div v-for="(st, i) in head" :key="labels[i]" class="tc-step">
      <i :class="st.dot" />
      <span>{{ labels[i] }}：</span>
      <span class="v" :class="st.cls">{{ st.v }}</span>
      <button
        v-if="i === 1 && verifyReason"
        type="button"
        class="tc-step-toggle"
        :class="bubble ? 'open' : ''"
        title="查看失败原因"
        @click="onToggle($event, 'verify')"
      >
        <i class="tc-help-q">?</i>
      </button>
    </div>
    <div class="tc-step">
      <i :class="step3.dot" />
      <span>{{ labels[labels.length - 1] }}：</span>
      <span class="v" :class="step3.cls">{{ step3.v }}</span>
      <button
        v-if="shopReason"
        type="button"
        class="tc-step-toggle"
        :class="bubble ? 'open' : ''"
        title="查看失败原因"
        @click="onToggle($event, 'shop')"
      >
        <i class="tc-help-q">?</i>
      </button>
    </div>
  </div>

  <Teleport to="body">
    <template v-if="bubble">
      <div class="tc-bubble-mask" @click="bubble = null" />
      <div class="tc-bubble" :style="{ left: `${bubble.x}px`, top: `${bubble.y}px` }">
        <div class="tc-bubble-title">失败原因 · {{ taskIdText }}</div>
        <div class="tc-bubble-reason">{{ bubbleReason }}</div>
      </div>
    </template>
  </Teleport>
</template>
