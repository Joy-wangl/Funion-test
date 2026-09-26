<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue';
import { ROUTE_HIT_LABELS, ROUTE_OUTCOME_LABELS, ROUTE_STEP_META, formatRouteDuration, type ReplyRouteRecord, type RouteCandidate, type RouteConfigTarget, type RouteOutcome, type RouteStep } from './replyRouteTypes';
import './ReplyRouteTrace.css';

const props = defineProps<{ record: ReplyRouteRecord }>();
const emit = defineEmits<{
  (e: 'conversation'): void;
  (e: 'configuration', target: RouteConfigTarget): void;
}>();
const uid = useId();
const tabs = [
  { key: 'timeline', label: '处理过程' },
  { key: 'candidates', label: '匹配依据' },
  { key: 'context', label: '当时会话信息' },
] as const;
type TabKey = (typeof tabs)[number]['key'];
type Tone = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

const activeTab = ref<TabKey>('timeline');
const body = ref<HTMLElement | null>(null);
const tabList = ref<HTMLElement | null>(null);
const text = (value: string, empty = '未提供') => value.trim() ? value : empty;
const kindLabel = (kind: RouteCandidate['kind']) => kind === 'knowledge' ? '商品知识' : '场景';
const candidateTone = (result: RouteCandidate['result']): Tone => result === '采用' ? 'success' : result === '兜底' ? 'warning' : 'neutral';
const candidateLabel = (result: RouteCandidate['result']) => ({ 采用: '已采用', 淘汰: '未采用', 兜底: '默认处理' })[result];
const evidenceTone = (result: RouteCandidate['evidence'][number]['result']): Tone => result === '通过' ? 'success' : result === '不通过' ? 'danger' : 'neutral';
const evidenceLabel = (result: RouteCandidate['evidence'][number]['result']) => ({ 通过: '满足', 不通过: '不满足', 未评估: '未判断' })[result];
const stepLabel = (step: RouteStep) => step.name === '确认回复方式' && step.state === 'miss' ? '由人工回复' : ROUTE_STEP_META[step.state].label;
const matchSummary = computed(() => {
  const adopted = props.record.candidates.find((candidate) => candidate.result === '采用');
  return adopted ? `${kindLabel(adopted.kind)} · ${adopted.name}` : ROUTE_HIT_LABELS[props.record.hit];
});

const outcomeMeta: Record<RouteOutcome, { tone: Tone; title: string; description: string; replyLabel?: string; empty?: string }> = {
  AI已回复: { tone: 'success', title: '回复已发送给买家', description: '平台已确认发送成功，不代表买家已读。', replyLabel: '已发送的回复', empty: '未记录回复内容。' },
  发送失败: { tone: 'danger', title: '回复已生成，但未发送成功', description: '买家未收到以下回复内容。', replyLabel: '未发送成功的内容', empty: '未记录生成的回复内容。' },
  生成失败: { tone: 'danger', title: '未生成回复内容', description: 'AI 未能生成回复，因此没有向买家发送消息。' },
  处理中: { tone: 'info', title: '正在生成回复，尚未发送', description: '本次处理尚未完成，暂时没有最终结果。' },
  转人工: { tone: 'warning', title: '已转人工接待', description: '本条消息已转交人工接待，AI 不生成或发送回复。' },
  人工接管: { tone: 'warning', title: '由客服继续接待', description: '客服已接管会话，本条消息由客服回复，AI 不再回复。' },
};
const replyState = computed(() => outcomeMeta[props.record.outcome]);

function onTabKeydown(event: KeyboardEvent) {
  const index = tabs.findIndex((tab) => tab.key === activeTab.value);
  let next = index;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;
  event.preventDefault();
  activeTab.value = tabs[next]!.key;
  nextTick(() => tabList.value?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
}

watch(() => props.record.id, () => {
  activeTab.value = 'timeline';
  nextTick(() => { if (body.value) body.value.scrollTop = 0; });
}, { flush: 'sync' });
</script>

<template>
  <section class="rr-trace" :data-record-id="record.id" aria-label="回复处理详情">
    <header class="rr-trace-header">
      <div class="rr-trace-heading">
        <h2 class="rr-trace-title">回复详情</h2>
      </div>
      <button type="button" class="rr-trace-button" @click="emit('conversation')">聊天记录</button>
    </header>

    <div ref="body" class="rr-trace-body">
      <section class="rr-trace-summary" aria-label="处理结果">
        <div class="rr-trace-summary-top">
          <span class="rr-trace-badge">示例数据 · 非真实会话</span>
          <span v-if="record.elapsed !== null" class="rr-trace-hint">处理用时 {{ formatRouteDuration(record.elapsed) }}</span>
        </div>
        <div class="rr-trace-msg">
          <span class="rr-trace-stat-label">买家消息</span>
          <h3 class="rr-trace-section-title">{{ record.text }}</h3>
        </div>
        <div class="rr-trace-summary-status">
          <div class="rr-trace-stat">
            <span class="rr-trace-stat-label">处理状态</span>
            <span class="rr-trace-badge" :class="`rr-trace-tone--${replyState.tone}`">{{ ROUTE_OUTCOME_LABELS[record.outcome] }}</span>
          </div>
          <div class="rr-trace-stat">
            <span class="rr-trace-stat-label">匹配结果</span>
            <span class="rr-trace-badge">{{ matchSummary }}</span>
          </div>
        </div>
        <div class="rr-trace-reason">
          <span class="rr-trace-stat-label">处理说明</span>
          <p class="rr-trace-text">{{ record.reason }}</p>
        </div>
      </section>

      <div ref="tabList" class="rr-trace-tabs" role="tablist" aria-label="回复详情" @keydown="onTabKeydown">
        <button
          v-for="tab in tabs" :id="`${uid}-tab-${tab.key}`" :key="tab.key" type="button" role="tab"
          class="rr-trace-tab" :aria-selected="activeTab === tab.key" :aria-controls="`${uid}-panel-${tab.key}`"
          :tabindex="activeTab === tab.key ? 0 : -1" @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <section v-show="activeTab === 'timeline'" :id="`${uid}-panel-timeline`" class="rr-trace-panel" role="tabpanel" :aria-labelledby="`${uid}-tab-timeline`" tabindex="0">
        <h3 class="rr-trace-section-title">处理过程 <span class="rr-trace-hint">{{ record.steps.length }} 步</span></h3>
        <ol v-if="record.steps.length" class="rr-trace-timeline">
          <li v-for="(step, index) in record.steps" :key="index" class="rr-trace-step">
            <span class="rr-trace-step-mark" :class="`rr-trace-state--${step.state}`" aria-hidden="true">{{ ROUTE_STEP_META[step.state].mark }}</span>
            <div class="rr-trace-step-content">
              <div class="rr-trace-step-heading">
                <h4 class="rr-trace-step-name">{{ step.name }}</h4>
                <span class="rr-trace-badge" :class="`rr-trace-state--${step.state}`">{{ stepLabel(step) }}</span>
              </div>
              <p class="rr-trace-text">{{ text(step.reason, '未记录此步骤的处理原因。') }}</p>
            </div>
          </li>
        </ol>
        <p v-else class="rr-trace-empty">未记录具体处理过程。</p>
      </section>

      <section v-show="activeTab === 'candidates'" :id="`${uid}-panel-candidates`" class="rr-trace-panel" role="tabpanel" :aria-labelledby="`${uid}-tab-candidates`" tabindex="0">
        <h3 class="rr-trace-section-title">匹配依据 <span class="rr-trace-hint">{{ record.candidates.length }} 项</span></h3>
        <article v-for="(candidate, index) in record.candidates" :key="`${candidate.kind}:${candidate.id}:${index}`" class="rr-trace-candidate">
          <div class="rr-trace-card-heading">
            <span class="rr-trace-badge">{{ candidate.result === '兜底' ? '默认处理' : kindLabel(candidate.kind) }}</span>
            <span v-if="candidate.result !== '兜底'" class="rr-trace-badge" :class="`rr-trace-tone--${candidateTone(candidate.result)}`">{{ candidateLabel(candidate.result) }}</span>
          </div>
          <h4 class="rr-trace-candidate-name">{{ candidate.name }}</h4>
          <dl class="rr-trace-facts">
            <div class="rr-trace-field rr-trace-field--wide"><dt>所属分类</dt><dd>{{ text(candidate.parent) }}</dd></div>
            <div class="rr-trace-field rr-trace-field--wide"><dt>{{ candidate.result === '采用' ? '采用原因' : candidate.result === '淘汰' ? '未采用原因' : '处理原因' }}</dt><dd>{{ text(candidate.reason) }}</dd></div>
          </dl>
          <section v-for="(evidence, evidenceIndex) in candidate.evidence" :key="evidenceIndex" class="rr-trace-evidence">
            <h5 class="rr-trace-evidence-title">{{ evidence.field }}</h5>
            <dl class="rr-trace-evidence-grid">
              <div class="rr-trace-field"><dt>配置要求</dt><dd>{{ text(evidence.expected) }}</dd></div>
              <div class="rr-trace-field"><dt>本次情况</dt><dd>{{ text(evidence.actual) }}</dd></div>
              <div class="rr-trace-field"><dt>是否满足</dt><dd><span class="rr-trace-badge" :class="`rr-trace-tone--${evidenceTone(evidence.result)}`">{{ evidenceLabel(evidence.result) }}</span></dd></div>
            </dl>
          </section>
          <p v-if="!candidate.evidence.length" class="rr-trace-hint">未记录具体的条件判断。</p>
          <div class="rr-trace-snapshot">
            <h5 class="rr-trace-evidence-title">当时的配置</h5>
            <p class="rr-trace-text">{{ text(candidate.snapshot, '未保存当时的配置。') }}</p>
          </div>
          <button type="button" class="rr-trace-link rr-trace-source-button" :data-source-key="`${candidate.kind}:${candidate.id}`" :aria-label="`查看当前配置：${candidate.name}`" @click="emit('configuration', candidate)">查看当前配置</button>
        </article>
        <p v-if="!record.candidates.length" class="rr-trace-empty">{{ record.hit === '未执行' ? '本次由人工接待，未进行知识或场景匹配。' : '未记录匹配的知识或场景。' }}</p>
      </section>

      <section v-show="activeTab === 'context'" :id="`${uid}-panel-context`" class="rr-trace-panel" role="tabpanel" :aria-labelledby="`${uid}-tab-context`" tabindex="0">
        <h3 class="rr-trace-section-title">当时会话信息</h3>
        <dl class="rr-trace-facts rr-trace-context">
          <div class="rr-trace-field rr-trace-field--wide"><dt>消息时间</dt><dd>{{ record.time }}</dd></div>
          <div v-for="(item, index) in record.context" :key="index" class="rr-trace-field"><dt>{{ item.field }}</dt><dd>{{ text(item.value) }}</dd></div>
        </dl>
      </section>

      <section class="rr-trace-reply" aria-label="回复结果">
        <div class="rr-trace-card-heading">
          <h3 class="rr-trace-section-title">回复结果</h3>
          <span class="rr-trace-badge" :class="`rr-trace-tone--${replyState.tone}`">{{ ROUTE_OUTCOME_LABELS[record.outcome] }}</span>
        </div>
        <h4 class="rr-trace-reply-title">{{ replyState.title }}</h4>
        <p class="rr-trace-text">{{ replyState.description }}</p>
        <dl v-if="replyState.replyLabel" class="rr-trace-facts">
          <div class="rr-trace-field rr-trace-field--wide"><dt>{{ replyState.replyLabel }}</dt><dd class="rr-trace-reply-content">{{ text(record.reply, replyState.empty) }}</dd></div>
        </dl>
      </section>
    </div>
  </section>
</template>
