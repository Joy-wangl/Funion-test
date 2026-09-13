<script setup lang="ts">
/* ---------- 系列编码详情抽屉（无任务/审核维度） ---------- */
import { computed, ref } from 'vue';
import { AFTER_SALES_ORDERS, type ChatHit, type ChatSession, type Platform } from './data';
import {
  PROBLEM_TYPE_COLOR,
  pct,
  platformProblemHits,
  rateCls,
  type QcCenterSeries,
} from './qcCenterData';
import { OPT_STATUS_LABELS, type OptTask } from './qcOptData';
import { CAT_COLOR, QC2_CATS, QC2_CODES, briefOf, seriesTagBrief, type Qc2Code } from '../quality2/qc2Data';
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
  /** 品控-线上壳：无商品标签维度，隐藏标签模块 */
  online?: boolean;
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

/* 商品标签维度：标签命中按「该平台在售编码」聚合；健康度各平台不一致不做跨平台聚合，只展示情况不展示规则 */
const qc2Scope = computed(() => {
  const scope = new Set(selCodes.value.map((c) => c.code));
  return QC2_CODES.filter((c) => scope.has(c.code));
});
/* 平台页签切换：全部态看系列各编码在该平台的命中情况；具体编码态看该编码在该平台的命中情况 */
const platTab = ref<string>(props.series.platforms[0] ?? '');
const activePlat = computed(() => (props.series.platforms.includes(platTab.value as Platform) ? platTab.value : props.series.platforms[0] ?? '') as Platform);
const platTabCounts = computed(() => props.series.platforms.map((pl) => {
  const codes = qc2Scope.value.filter((c) => c.platforms.includes(pl));
  return { pl, count: codes.length ? briefOf(codes).labels.length : 0 };
}));
const platScopeCodes = computed(() => qc2Scope.value.filter((c) => c.platforms.includes(activePlat.value)));
/* 标签按大类分组分行，避免多 chips 无序换行显得杂乱 */
const groupsOf = (codes: Qc2Code[]) => {
  const labels = codes.length ? briefOf(codes).labels : [];
  return QC2_CATS.map((cat) => ({ cat, items: labels.filter((l) => l.cat === cat) })).filter((g) => g.items.length);
};
/* 具体编码态：该编码在当前平台内的命中分组 */
const platTagGroups = computed(() => groupsOf(platScopeCodes.value));
/* 全部态：系列维度聚合（编码命中 ∪ 系列维度命中，按标签 id 去重；系列维度标签仅在此展示，编码态不重复） */
const allTagGroups = computed(() => {
  const labels = seriesTagBrief(props.series.seriesCode).labels;
  return QC2_CATS.map((cat) => ({ cat, items: labels.filter((l) => l.cat === cat) })).filter((g) => g.items.length);
});
const visibleGroups = computed(() => (selCode.value ? platTagGroups.value : allTagGroups.value));
const noneText = computed(() => (selCode.value
  ? (platScopeCodes.value.length ? '暂无标签命中' : '该编码未在此平台上架')
  : '暂无标签命中'));
</script>

<template>
  <div class="drawer-mask" @click="props.onClose" />
  <div class="drawer qc-series-drawer">
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

      <!-- 商品标签：模块置底；全部态看所有编码各平台去重后汇总，具体编码态平台页签看该编码在各平台的命中情况 -->
      <template v-if="!online">
        <div class="section-title">商品标签</div>
        <div v-if="selCode" class="qc-range-toggle qc-code-tabs qc-tag-plat-tabs">
          <button
            v-for="t in platTabCounts"
            :key="t.pl"
            type="button"
            :class="activePlat === t.pl ? 'active' : ''"
            @click="platTab = t.pl"
          >{{ t.pl }} {{ t.count }}</button>
        </div>
        <div class="qc-tag-plat-card">
          <div v-if="visibleGroups.length" class="qc-tag-cat-rows">
            <div v-for="g in visibleGroups" :key="g.cat" class="qc-tag-cat-row">
              <span class="qc-tag-cat-k" :title="g.cat"><i :style="{ background: CAT_COLOR[g.cat] || '#4f7cff' }" />{{ g.cat }}</span>
              <div class="prob-tags">
                <span
                  v-for="l in g.items"
                  :key="l.id"
                  class="tag"
                  :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
                >{{ l.name }}</span>
              </div>
            </div>
          </div>
          <div v-else class="qc-tag-none">{{ noneText }}</div>
        </div>
      </template>
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
