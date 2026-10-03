<script setup lang="ts">
/* ---------- 监控列表行（展开各平台数据 + 责任部门编辑气泡） ---------- */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  PROBLEM_DEPT,
  PROBLEM_TYPE_COLOR,
  QC_DEPTS,
  deptsOfTypes,
  pct,
  platformProblemHits,
  rateCls,
  seriesHasProblemCode,
  type QcCenterCode,
  type QcCenterSeries,
} from './qcCenterData';
import {
  CAT_COLOR,
  HEALTH_META,
  QC2_CODES,
  briefOf,
  seriesTagBrief,
  type TagBrief,
} from '../quality2/qc2Data';
import { cancelHitCodes, isHitCanceled, onlineChatBrief, onlineOwnerOf, onlineProblemCodes, onlineSessionsOf, seriesHitCodes } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import type { Platform, PlatformStat } from './data';
import PlatLogo from './PlatLogo.vue';
import PlatformMatrix from './PlatformMatrix.vue';
import Modal from '../../components/Modal.vue';

const props = defineProps<{
  series: QcCenterSeries;
  open: boolean;
  onToggle: () => void;
  onDetail: () => void;
  onChat: (codes: QcCenterCode[], platforms: Platform[], platform: Platform) => void;
  onTrend: () => void;
  onTrendStat: (stat: PlatformStat, label: string, seriesCode: string) => void;
  duty: string;
  hasOverride: boolean;
  onDuty: (code: string, dept: string | null) => void;
  /** 品控-线上壳：列序对齐线上、无健康等级/命中标签列 */
  online?: boolean;
  /** 品控-线上：已生效的问题涉及部门，命中类型/部门列/矩阵命中按该部门收敛 */
  scopeDept?: string;
  /** 点击命中类型标签：打开详情抽屉并选中该类型 */
  onPickType?: (type: string) => void;
  /** 点击问题涉及部门标签：打开详情抽屉并选中该部门关联的全部问题类型 */
  onPickDept?: (dept: string) => void;
}>();

const codeTab = ref<string>('all');
const dutyOpen = ref(false);
const dutyRef = ref<HTMLDivElement | null>(null);

const onDoc = (e: MouseEvent) => {
  if (dutyRef.value && !dutyRef.value.contains(e.target as Node)) dutyOpen.value = false;
};
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dutyOpen.value = false; };
watch(dutyOpen, (v) => {
  if (v) {
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
  } else {
    document.removeEventListener('mousedown', onDoc);
    document.removeEventListener('keydown', onKey);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDoc);
  document.removeEventListener('keydown', onKey);
});

const selCode = computed(() => (codeTab.value === 'all' ? null : props.series.codes.find((c) => c.code === codeTab.value) ?? null));
const owner = computed(() => onlineOwnerOf(props.series.seriesCode));
/* 取消命中重判：已取消命中的商品编码不再计入命中问题商品，线上壳首列标识 / 命中聚合 / 矩阵命中同源取未取消口径
   （运维壳无取消命中入口，保持 qcCenterData 原口径） */
const liveCodes = computed(() => (props.online ? props.series.codes.filter((c) => !isHitCanceled(c.code)) : props.series.codes));
const hitCodes = computed(() => liveCodes.value.filter((c) => c.problemHits.some((h) => h.count > 0)));
const hasProblemCode = computed(() => (props.online ? hitCodes.value.length > 0 : seriesHasProblemCode(props.series)));
/* 售后率口径与售后列表一致：售后单 / 订单量 */
const afterRate = computed(() => (props.series.orders ? props.series.afterSales / props.series.orders : 0));
/* 退款订单数：系列仅存退款率，单数按 订单量 × 退款率 还原（与平台矩阵口径一致） */
const refundCount = computed(() => Math.round(props.series.orders * props.series.refundRate));
/* 聊天数据三口径（会话总数/风险会话/风险率），与抽屉会话同源 */
const chatBrief = computed(() => onlineChatBrief(props.series));
/* 线上壳矩阵聊天风险与行内「聊天数据」同口径：各平台风险会话合计=行风险会话，
   会话总数按订单占比最大余数法精确拆分，风险率=风险会话/该平台会话总数 */
const chatMatrix = computed(() => {
  const stats = selCode.value ? selCode.value.platforms : props.series.merged;
  const scopeOrders = stats.reduce((s, p) => s + p.orders, 0) || 1;
  const scopeTotal = selCode.value
    ? Math.round((chatBrief.value.total * scopeOrders) / (props.series.orders || 1))
    : chatBrief.value.total;
  const risk = new Map<string, number>();
  onlineSessionsOf(props.series)
    .filter((s) => (!selCode.value || s.code === selCode.value.code) && s.hits.length)
    .forEach((s) => risk.set(s.platform, (risk.get(s.platform) ?? 0) + 1));
  const raw = stats.map((p) => (scopeTotal * p.orders) / scopeOrders);
  const share = raw.map((v) => Math.floor(v));
  let rem = scopeTotal - share.reduce((s, v) => s + v, 0);
  const byFrac = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) share[byFrac[k % byFrac.length][1]] += 1;
  const totals: Partial<Record<Platform, number>> = {};
  stats.forEach((p, i) => { totals[p.platform] = share[i]; });
  return { stats: stats.map((p) => ({ ...p, chatRisks: risk.get(p.platform) ?? 0 })), totals };
});
const afterRateCls = (v: number) => (v < 0.03 ? 'ok' : v < 0.05 ? 'warn' : 'bad');
/* 问题涉及部门生效时：命中类型 / 涉及部门 / 平台矩阵命中仅保留该部门负责类型的数据 */
const seriesHitsLive = computed(() => {
  if (!props.online) return props.series.problemHits;
  const m: Record<string, number> = {};
  for (const c of liveCodes.value) for (const h of c.problemHits) if (h.count > 0) m[h.type] = (m[h.type] ?? 0) + h.count;
  return Object.entries(m).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
});
const shownHits = computed(() => (props.scopeDept
  ? seriesHitsLive.value.filter((h) => PROBLEM_DEPT[h.type] === props.scopeDept)
  : seriesHitsLive.value));
const shownDepts = computed(() => deptsOfTypes(shownHits.value.map((h) => h.type)));
const hits = computed(() => {
  const all = platformProblemHits(selCode.value ? (isHitCanceled(selCode.value.code) ? [] : [selCode.value]) : liveCodes.value);
  if (!props.scopeDept) return all;
  const out: Partial<Record<Platform, [string, number][]>> = {};
  (Object.keys(all) as Platform[]).forEach((p) => {
    out[p] = (all[p] ?? []).filter(([t]) => PROBLEM_DEPT[t] === props.scopeDept);
  });
  return out;
});

/* ---------- 取消命中：仅系列维度入口（系列行操作列），不细分到商品编码；
   取消＝系列下命中编码与该系列问题商品清单编码同步取消，
   取消后重判系列下是否仍有命中问题商品编码（首列标识 / 筛选联动） ---------- */
const cancelOpen = ref(false);
const openCancel = () => { cancelOpen.value = true; };
const cancelCodes = computed(() => [
  ...hitCodes.value.map((c) => c.code),
  ...onlineProblemCodes().filter((r) => r.seriesCode === props.series.seriesCode).map((r) => r.code),
]);
const doCancel = () => {
  const n = cancelCodes.value.length;
  cancelHitCodes(cancelCodes.value);
  cancelOpen.value = false;
  const left = seriesHitCodes(props.series).length;
  pushToast(left ? `已取消命中 ${n} 个商品编码，系列下仍有 ${left} 个命中问题商品编码` : `已取消命中 ${n} 个商品编码，系列下已无命中问题商品编码，问题编码标识已移除`);
};

/* 标签合并口径：系列维度聚合；展开区按「该平台在售编码」聚合后并入平台矩阵列 */
const tag = computed(() => seriesTagBrief(props.series.seriesCode));
const platTagBrief = (pl: Platform): TagBrief | null => {
  const scope = selCode.value ? [selCode.value.code] : props.series.codes.map((c) => c.code);
  const codes = QC2_CODES.filter((c) => scope.includes(c.code) && c.platforms.includes(pl));
  return codes.length ? briefOf(codes) : null;
};

/* 操作列仅三个动作，直接平铺不收纳（修改责任部门入口触发气泡） */
</script>

<template>
  <tr>
    <td>
      <span class="arrow" :class="{ open }" style="cursor: pointer; display: inline-flex" @click="props.onToggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </span>
    </td>
    <td class="col-name">
      <div>{{ series.seriesCode }}</div>
      <!-- 线上壳名称为生成占位（无效字段），改示关联商品编码数 -->
      <div v-if="online">关联ID数：{{ series.codes.length }}</div>
      <!-- 问题编码标识：仅系列存在问题编码命中时在关联ID数下方示红芯片，无问题不占行（用户定案 2026-10-01） -->
      <div v-if="online && hasProblemCode">
        <span class="tag rv red">问题编码</span>
      </div>
      <div v-if="!online">{{ series.name }}</div>
    </td>
    <td v-if="online" class="col-name qc-order-data">
      <div><span class="qc-cd-lb">订单总数：</span><span class="qc-cd-v">{{ series.orders.toLocaleString() }}</span></div>
      <div><span class="qc-cd-lb">售后订单：</span><span class="qc-cd-v">{{ series.afterSales.toLocaleString() }}</span><span class="rate" :class="afterRateCls(afterRate)">{{ pct(afterRate) }}</span></div>
      <div><span class="qc-cd-lb">退款订单：</span><span class="qc-cd-v">{{ refundCount.toLocaleString() }}</span><span class="rate" :class="rateCls(series.refundRate)">{{ pct(series.refundRate) }}</span></div>
    </td>
    <template v-else>
      <td>{{ series.orders.toLocaleString() }}</td>
      <td><span class="rate" :class="rateCls(series.refundRate)">{{ pct(series.refundRate) }}</span></td>
      <td>{{ series.afterSales }}</td>
    </template>
    <td v-if="online" class="col-name qc-chat-data">
      <div><span class="qc-cd-lb">会话总数：</span><span class="qc-cd-v">{{ chatBrief.total.toLocaleString() }}</span></div>
      <div><span class="qc-cd-lb">风险会话：</span><span class="qc-cd-v"><span :class="chatBrief.risk ? 'rate bad' : ''">{{ chatBrief.risk }}</span></span></div>
      <div><span class="qc-cd-lb">风险率：</span><span class="qc-cd-v"><span class="rate" :class="afterRateCls(chatBrief.rate)">{{ pct(chatBrief.rate) }}</span></span></div>
    </td>
    <template v-else>
      <td><span v-if="series.chatRiskHits" class="rate bad">{{ series.chatRiskHits }}</span><template v-else>0</template></td>
      <td>{{ series.orders ? pct(series.chatRiskHits / series.orders) : '0.0%' }}</td>
    </template>
    <td>
      <div class="plat-chips">
        <span v-for="p in series.platforms" :key="p" class="plat-chip">
          <PlatLogo :platform="p" />
          {{ p }}
        </span>
      </div>
    </td>
    <td>
      <div v-if="shownHits.length" class="prob-tags">
        <span
          v-for="h in shownHits"
          :key="h.type"
          class="tag"
          :class="{ pick: !!props.onPickType }"
          :title="props.onPickType ? `查看「${h.type}」命中详情` : undefined"
          :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
          @click="props.onPickType?.(h.type)"
        >
          {{ h.type }} {{ h.count }}
        </span>
      </div>
      <div v-else class="prob-tags">
        <!-- 空值芯片与常规灰标签同款同交互（用户定案 2026-10-01）：可点，点入系列详情 -->
        <span class="tag pick" title="暂无问题命中，点击查看系列详情" @click="props.onDetail">无命中</span>
      </div>
    </td>
    <td v-if="!online">
      <span
        v-if="tag.health"
        class="qc-health-tag"
        :title="HEALTH_META[tag.health].label"
        :style="{ color: HEALTH_META[tag.health].color, borderColor: HEALTH_META[tag.health].color }"
      >{{ tag.health }}</span>
      <span v-else style="color: var(--text-4)">-</span>
    </td>
    <td v-if="!online">
      <div v-if="tag.chips.length" class="prob-tags">
        <span
          v-for="l in tag.chips"
          :key="l.id"
          class="tag"
          :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
        >{{ l.name }}</span>
        <span v-if="tag.extra" class="tag prob-more">
          +{{ tag.extra }}
          <span class="prob-bubble">
            <span
              v-for="l in tag.labels"
              :key="l.id"
              class="tag"
              :style="{ background: `${CAT_COLOR[l.cat] || '#4f7cff'}1a`, color: CAT_COLOR[l.cat] || '#4f7cff' }"
            >{{ l.name }}</span>
          </span>
        </span>
      </div>
      <span v-else style="color: var(--text-4)">-</span>
    </td>
    <td>
      <div class="prob-tags">
        <span
          v-for="d in shownDepts"
          :key="d"
          class="tag"
          :class="{ pick: !!props.onPickDept }"
          :title="props.onPickDept ? `查看「${d}」关联问题命中详情` : undefined"
          @click="props.onPickDept?.(d)"
        >{{ d }}</span>
      </div>
    </td>
    <td>
      <!-- 无任何命中且未手动绑定时不给默认责任部门，无命中芯片与常规灰标签同款同交互 -->
      <div v-if="hasOverride || series.problemHits.length" class="prob-tags">
        <span class="tag duty-tag" :title="hasOverride ? '已手动绑定' : '默认责任部门（问题数最多部门）'">{{ duty }}</span>
      </div>
      <div v-else class="prob-tags">
        <span class="tag pick" title="暂无问题命中，点击查看系列详情" @click="props.onDetail">无命中</span>
      </div>
    </td>
    <td v-if="online" class="col-name">
      <template v-if="owner">
        <div>{{ owner.operator }}</div>
        <div>{{ owner.group }}</div>
      </template>
      <div v-else class="prob-tags">
        <span class="tag pick" title="暂无组别 / 运维归属，点击查看系列详情" @click="props.onDetail">无归属</span>
      </div>
    </td>
    <td>
      <div class="qc-op-col">
        <a @click="props.onDetail">查看详情</a>
        <a @click="props.onTrend">趋势图</a>
        <a @click="dutyOpen = !dutyOpen">修改责任部门</a>
        <a v-if="online && hitCodes.length" @click="openCancel">取消命中</a>
        <div ref="dutyRef" class="duty-edit">
          <div v-if="dutyOpen" class="duty-pop">
            <span
              v-for="d in QC_DEPTS"
              :key="d"
              class="duty-opt"
              :class="{ active: d === duty }"
              @click="props.onDuty(series.seriesCode, d); dutyOpen = false"
            >
              {{ d }}
            </span>
            <span v-if="hasOverride" class="duty-opt reset" @click="props.onDuty(series.seriesCode, null); dutyOpen = false">恢复默认</span>
          </div>
        </div>
      </div>
    </td>
  </tr>
  <tr v-if="open" class="expand-row">
    <td :colspan="online ? 10 : 14">
      <div class="qc-range-toggle qc-code-tabs">
        <button type="button" :class="codeTab === 'all' ? 'active' : ''" @click="codeTab = 'all'">全部</button>
        <button
          v-for="c in series.codes"
          :key="c.code"
          type="button"
          :class="codeTab === c.code ? 'active' : ''"
          @click="codeTab = c.code"
        >
          {{ c.code }}
        </button>
      </div>
      <PlatformMatrix
        :stats="online ? chatMatrix.stats : (selCode ? selCode.platforms : series.merged)"
        :threshold="0.25"
        :problem-hits="hits"
        :chat-totals="online ? chatMatrix.totals : undefined"
        :show-last-order="false"
        :tag-brief="online ? undefined : platTagBrief"
        :on-chat="(p: Platform) => props.onChat(
          selCode ? [selCode] : series.codes,
          selCode ? selCode.platforms.map((x) => x.platform) : series.platforms,
          p,
        )"
        :on-trend="(st: PlatformStat) => props.onTrendStat(st, selCode ? selCode.code : series.seriesCode, series.seriesCode)"
      />
    </td>
  </tr>
  <Teleport to=".qc-center-page">
    <Modal
      v-if="cancelOpen"
      title="取消命中"
      sub="取消后该系列编码下的命中问题商品编码同步取消命中"
      size="md"
      @close="cancelOpen = false"
    >
      <div class="qc-pc-confirm">确认取消系列 {{ series.seriesCode }} 下全部 {{ hitCodes.length }} 个命中问题商品编码的命中标记？</div>
      <template #foot>
        <button class="btn" @click="cancelOpen = false">取消</button>
        <button class="btn primary" @click="doCancel">确认取消</button>
      </template>
    </Modal>
  </Teleport>
</template>
