<script setup lang="ts">
/* ---------- 系列编码详情抽屉（无任务/审核维度） ---------- */
import { computed, ref } from 'vue';
import { AFTER_SALES_ORDERS, type ChatHit, type ChatSession } from './data';
import {
  PROBLEM_TYPE_COLOR,
  pct,
  platformProblemHits,
  rateCls,
  type QcCenterSeries,
} from './qcCenterData';
import { OPT_STATUS_LABELS, type OptTask } from './qcOptData';
import TypeBars from './TypeBars.vue';
import PlatformMatrix from './PlatformMatrix.vue';
import SessionCard from './SessionCard.vue';
import ChatFullModal from './ChatFullModal.vue';

const props = defineProps<{
  series: QcCenterSeries;
  initialCode?: string;
  onClose: () => void;
  optTasks: OptTask[];
  onCreateOpt: () => void;
  allSessions: ChatSession[];
  onUpdateHits: (id: string, hits: ChatHit[]) => void;
}>();

const codeTab = ref<string>(props.initialCode ?? 'all');
const chatTab = ref<string>('all');
const fullId = ref<string | null>(null);
const selCode = computed(() => (codeTab.value === 'all' ? null : props.series.codes.find((c) => c.code === codeTab.value) ?? null));
const selCodes = computed(() => (selCode.value ? [selCode.value] : props.series.codes));

const stats = computed(() => {
  const orders = selCodes.value.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.orders, 0), 0);
  const refundWeighted = selCodes.value.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.refundRate * p.orders, 0), 0);
  const afterSales = selCodes.value.reduce((s, c) => s + c.platforms.reduce((x, p) => x + p.afterSales, 0), 0);
  return { orders, refundRate: orders ? refundWeighted / orders : 0, afterSales };
});

const codeSet = computed(() => new Set(selCodes.value.map((c) => c.code)));
const sessions = computed(() => props.allSessions.filter((s) => codeSet.value.has(s.code)));
const sessionTabs = computed(() => {
  const counts = new Map<string, number>();
  sessions.value.forEach((s) => counts.set(s.platform, (counts.get(s.platform) ?? 0) + 1));
  return [...counts.entries()];
});
const shownSessions = computed(() => (chatTab.value === 'all' ? sessions.value : sessions.value.filter((s) => s.platform === chatTab.value)));
const problemHits = computed(() => (selCode.value ? selCode.value.problemHits : props.series.problemHits));
const hitsTotal = computed(() => problemHits.value.reduce((s, h) => s + h.count, 0));
const hits = computed(() => platformProblemHits(selCodes.value));
</script>

<template>
  <div class="drawer-mask" @click="props.onClose" />
  <div class="drawer">
    <div class="drawer-head">
      <div class="d-title">系列编码详情</div>
      <span class="x" @click="props.onClose">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </span>
    </div>
    <div class="drawer-body">
      <div class="detail-hero">
        <div class="av">{{ series.name.slice(0, 1) }}</div>
        <div class="info">
          <div class="n">{{ series.seriesCode }} · {{ series.name }}</div>
          <div class="m">{{ series.codes.length }} 个商品编码 · {{ series.platforms.length }} 个平台</div>
        </div>
      </div>

      <div class="qc-range-toggle qc-code-tabs">
        <button type="button" :class="codeTab === 'all' ? 'active' : ''" @click="codeTab = 'all'; chatTab = 'all'">全部</button>
        <button
          v-for="c in series.codes"
          :key="c.code"
          type="button"
          :class="codeTab === c.code ? 'active' : ''"
          @click="codeTab = c.code; chatTab = 'all'"
        >
          {{ c.code }}
        </button>
      </div>

      <div class="section-title">核心指标（近30天）</div>
      <div class="desc-list">
        <div class="row"><span class="k">订单量</span><span class="v">{{ stats.orders.toLocaleString() }}</span></div>
        <div class="row"><span class="k">综合退款率</span><span class="v"><span class="rate" :class="rateCls(stats.refundRate)">{{ pct(stats.refundRate) }}</span></span></div>
        <div class="row"><span class="k">售后单</span><span class="v">{{ stats.afterSales }} 单</span></div>
        <div class="row"><span class="k">聊天会话</span><span class="v">{{ sessions.length }} 个 · 命中 {{ sessions.filter((s) => s.hits.length).length }} 个</span></div>
      </div>

      <div class="section-title">问题类型命中</div>
      <TypeBars
        v-if="problemHits.length"
        :types="problemHits.map((h) => [h.type, h.count] as [string, number])"
        :total="hitsTotal"
      />
      <div v-else style="color: var(--text-4); font-size: 12px">暂无问题命中</div>

      <div class="section-title">关联优化任务（{{ optTasks.length }}）</div>
      <div v-if="optTasks.length" class="qc-opt-mini">
        <div v-for="t in optTasks" :key="t.id" class="qc-opt-mini-item">
          <template v-if="OPT_STATUS_LABELS.find((x) => x.key === t.status)">
            <span class="tid">{{ t.id }}</span>
            <span
              class="tag"
              :style="{ background: `${OPT_STATUS_LABELS.find((x) => x.key === t.status)!.color}1a`, color: OPT_STATUS_LABELS.find((x) => x.key === t.status)!.color }"
            >{{ OPT_STATUS_LABELS.find((x) => x.key === t.status)!.label }}</span>
            <span>{{ t.optLevel }}</span>
            <span
              class="tag"
              :style="{ background: `${PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[t.optType] || '#4f7cff' }"
            >{{ t.optType }}</span>
            <span>{{ t.optDirection }}</span>
            <span class="who">{{ t.assignStatus === '已分配' ? `${t.assignee ?? ''} · ${t.group}` : t.group }}</span>
            <span class="at">{{ t.createdAt }}</span>
          </template>
        </div>
      </div>
      <div v-else style="color: var(--text-4); font-size: 12px">暂无关联优化任务，可点击底部操作栏「创建优化任务」发起</div>

      <div class="section-title">聊天记录核查（命中短语高亮）</div>
      <template v-if="sessions.length">
        <div class="qc-range-toggle qc-code-tabs" style="margin: 0 0 12px">
          <button type="button" :class="chatTab === 'all' ? 'active' : ''" @click="chatTab = 'all'">全部 {{ sessions.length }}</button>
          <button
            v-for="[p, n] in sessionTabs"
            :key="p"
            type="button"
            :class="chatTab === p ? 'active' : ''"
            @click="chatTab = p"
          >{{ p }} {{ n }}</button>
        </div>
        <div class="drawer-sessions">
          <SessionCard
            v-for="s in shownSessions"
            :key="s.id"
            :s="s"
            :orders="AFTER_SALES_ORDERS.filter((o) => o.sessionId === s.id).map((o) => o.id)"
            :on-full-screen="() => (fullId = s.id)"
            :on-update-hits="props.onUpdateHits"
          />
        </div>
      </template>
      <div v-else style="color: var(--text-4); font-size: 12px">暂无聊天会话</div>

      <div class="section-title">各平台数据</div>
      <PlatformMatrix
        :stats="selCode ? selCode.platforms : series.merged"
        :threshold="0.25"
        :problem-hits="hits"
        :show-last-order="false"
      />
    </div>
    <div class="drawer-foot">
      <button class="btn primary" @click="props.onCreateOpt">创建优化任务</button>
      <button class="btn" @click="props.onClose">关闭</button>
    </div>
  </div>
  <ChatFullModal
    v-if="fullId"
    :sessions="shownSessions"
    :current-id="fullId"
    :on-nav="(id: string) => (fullId = id)"
    :on-close="() => (fullId = null)"
    :on-update-hits="props.onUpdateHits"
  />
</template>
