<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { RISK_CTRL_REASON, TC_FAIL_REASON_UNKNOWN, type SubTask } from './data';
import { headStepsOf, step3Of, stepLabelsOf } from './tcSteps';

/** 节点状态单元格：主状态行＋节点步进器＋当前节点行；悬浮展开全节点时间线（失败卡点/原因闭环可见） */
const props = defineProps<{ sub: SubTask; type?: string }>();

const labels = computed(() => stepLabelsOf(props.type ?? ''));
const steps = computed(() => [...headStepsOf(props.sub, props.type ?? ''), step3Of(props.sub, props.type ?? '')]);

const MAIN_TEXT: Record<SubTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  success: '已完成',
  failed: '执行失败',
  confirm: '待确认',
};
const mainText = computed(() => MAIN_TEXT[props.sub.status]);

/* 当前节点＝首个未成功节点；已完成无当前节点 */
const curIdx = computed(() => {
  if (props.sub.status === 'success') return -1;
  return steps.value.findIndex((st) => st.dot !== 'ok');
});

type NodeState = 'ok' | 'run' | 'fail' | 'confirm' | 'wait' | 'todo';
const STATE_TEXT: Record<NodeState, string> = {
  ok: '已完成',
  run: '执行中',
  fail: '失败',
  confirm: '待确认',
  wait: '待执行',
  todo: '未开始',
};
const stateOf = (i: number): NodeState => {
  const s = props.sub.status;
  const d = steps.value[i].dot;
  if (d === 'ok') return 'ok';
  if (d === 'fail') return 'fail';
  if (d === 'confirm') return 'confirm';
  if (i === curIdx.value) return s === 'running' ? 'run' : 'wait';
  return 'todo';
};
const glyph = (i: number) => {
  const st = stateOf(i);
  if (st === 'ok') return '✓';
  if (st === 'fail' || st === 'confirm') return '!';
  return String(i + 1);
};
/* 当前节点行：失败显式标出卡在第几步 */
const curLine = computed(() => {
  const s = props.sub.status;
  if (s === 'success') return `${labels.value[labels.value.length - 1]} ·完成`;
  const i = curIdx.value;
  const verb = STATE_TEXT[stateOf(i)];
  return s === 'failed' ? `第${i + 1}步 ${labels.value[i]} ·${verb}` : `${labels.value[i]} ·${verb}`;
});
const curKind = computed(() => {
  const s = props.sub.status;
  if (s === 'success') return 'ok';
  if (s === 'running') return 'run';
  if (s === 'failed') return 'fail';
  if (s === 'confirm') return 'confirm';
  return 'wait';
});
const reason = computed(() => {
  const s = props.sub;
  if (s.status !== 'failed') return '';
  if (s.failStep !== undefined) return s.failStep === 1 ? s.riskReason || RISK_CTRL_REASON : '';
  return s.shops[0]?.reason || TC_FAIL_REASON_UNKNOWN;
});

/* 悬浮时间线：贴单元格右侧展开，越界翻到左侧/收进视口 */
const POP_W = 300;
const pop = ref(false);
const pos = ref({ x: 0, y: 0 });
let timer = 0;
const onEnter = (e: MouseEvent) => {
  window.clearTimeout(timer);
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const h = steps.value.length * 52 + 28;
  let x = r.right + 10;
  if (x + POP_W > window.innerWidth - 8) x = r.left - POP_W - 10;
  pos.value = {
    x: Math.max(8, x),
    y: Math.max(8, Math.min(r.top - 4, window.innerHeight - h - 8)),
  };
  pop.value = true;
};
const onLeave = () => {
  timer = window.setTimeout(() => { pop.value = false; }, 160);
};
/* 移入弹窗本体只续期不重定位（若按弹窗自身矩形重算会跳位） */
const keepOpen = () => {
  window.clearTimeout(timer);
};
onBeforeUnmount(() => window.clearTimeout(timer));
</script>

<template>
  <div class="tc-nodecell">
    <div class="nc-head">
      <i class="nc-mdot" :class="sub.status" />
      <span class="nc-mtext" :class="sub.status">{{ mainText }}</span>
    </div>
    <!-- 悬浮热区收窄：仅步进/当前节点/原因块触发时间线，主状态行不触发 -->
    <div class="nc-hover" @mouseenter="onEnter" @mouseleave="onLeave">
      <div class="nc-steps">
        <template v-for="(lb, i) in labels" :key="lb">
          <i class="nc-sd" :class="stateOf(i)">{{ glyph(i) }}</i>
          <i v-if="i < labels.length - 1" class="nc-sl" :class="stateOf(i)" />
        </template>
      </div>
      <div v-if="curLine" class="nc-cur" :class="curKind">
        <span>{{ curLine }}</span>
        <span v-if="sub.status === 'running'" class="nc-dots"><i /><i /><i /></span>
        <i v-if="sub.status === 'running' || sub.status === 'failed'" class="nc-arrow" title="查看节点明细">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path d="M4.2 2.4l4 3.6-4 3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </i>
      </div>
      <div v-if="reason" class="nc-reason">原因：{{ reason }}</div>
    </div>

    <Teleport to="body">
      <div v-if="pop" class="nc-pop" :style="{ left: `${pos.x}px`, top: `${pos.y}px` }" @mouseenter="keepOpen" @mouseleave="onLeave">
        <div v-for="(lb, i) in labels" :key="lb" class="nc-pop-item">
          <div class="nc-pop-rail">
            <i v-if="i > 0" class="nc-pop-line top" :class="stateOf(i - 1)" />
            <i v-if="i < labels.length - 1" class="nc-pop-line bottom" :class="stateOf(i)" />
            <i class="nc-pop-ico" :class="stateOf(i)">{{ glyph(i) }}</i>
          </div>
          <div class="nc-pop-card" :class="stateOf(i)">
            <div class="nc-pop-t">
              {{ lb }}<span class="nc-pop-st" :class="stateOf(i)">{{ STATE_TEXT[stateOf(i)] }}</span>
            </div>
            <div v-if="stateOf(i) === 'fail' && reason" class="nc-pop-reason">原因：{{ reason }}</div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
