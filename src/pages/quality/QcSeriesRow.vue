<script setup lang="ts">
/* ---------- 监控列表行（展开各平台数据 + 责任部门编辑气泡） ---------- */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  PROBLEM_TYPE_COLOR,
  QC_DEPTS,
  deptsOfTypes,
  pct,
  platformProblemHits,
  rateCls,
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
import type { Platform, PlatformStat } from './data';
import PlatLogo from './PlatLogo.vue';
import PlatformMatrix from './PlatformMatrix.vue';
import MoreActions from '../../components/MoreActions.vue';

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
  optCount: number;
  onCreateOpt: () => void;
  /** 品控-线上壳：列序对齐线上（关联优化任务数前置）、无健康等级/命中标签列 */
  online?: boolean;
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
const hits = computed(() => platformProblemHits(selCode.value ? [selCode.value] : props.series.codes));

/* 标签合并口径：系列维度聚合；展开区按「该平台在售编码」聚合后并入平台矩阵列 */
const tag = computed(() => seriesTagBrief(props.series.seriesCode));
const platTagBrief = (pl: Platform): TagBrief | null => {
  const scope = selCode.value ? [selCode.value.code] : props.series.codes.map((c) => c.code);
  const codes = QC2_CODES.filter((c) => scope.includes(c.code) && c.platforms.includes(pl));
  return codes.length ? briefOf(codes) : null;
};

/* 操作列菜单：责任部门列两壳均保留，修改入口一致 */
const menuItems = computed(() => [
  { label: '创建优化任务', onClick: props.onCreateOpt },
  { label: '修改责任部门', onClick: () => (dutyOpen.value = true) },
]);
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
      <div style="color: var(--text-3); font-size: 12px">{{ series.name }}</div>
    </td>
    <td class="td-num-right">{{ series.orders.toLocaleString() }}</td>
    <td><span class="rate" :class="rateCls(series.refundRate)">{{ pct(series.refundRate) }}</span></td>
    <td>{{ series.afterSales }}</td>
    <td><span v-if="series.chatRiskHits" class="rate bad">{{ series.chatRiskHits }}</span><template v-else>0</template></td>
    <td>{{ series.orders ? pct(series.chatRiskHits / series.orders) : '0.0%' }}</td>
    <td v-if="online"><span v-if="optCount > 0" class="opt-cnt">{{ optCount }}</span><span v-else style="color: var(--text-4)">0</span></td>
    <td>
      <div class="plat-chips">
        <span v-for="p in series.platforms" :key="p" class="plat-chip">
          <PlatLogo :platform="p" />
          {{ p }}
        </span>
      </div>
    </td>
    <td>
      <div class="prob-tags">
        <span
          v-for="h in series.problemHits"
          :key="h.type"
          class="tag"
          :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
        >
          {{ h.type }} {{ h.count }}
        </span>
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
        <span v-for="d in deptsOfTypes(series.problemHits.map((h) => h.type))" :key="d" class="tag">{{ d }}</span>
      </div>
    </td>
    <td>
      <div class="prob-tags">
        <span class="tag duty-tag" :title="hasOverride ? '已手动绑定' : '默认责任部门（问题数最多部门）'">{{ duty }}</span>
      </div>
    </td>
    <td v-if="!online"><span v-if="optCount > 0" class="opt-cnt">{{ optCount }}</span><span v-else style="color: var(--text-4)">0</span></td>
    <td>
      <div class="qc-op-col">
        <a @click="props.onDetail">查看详情</a>
        <a @click="props.onTrend">趋势图</a>
        <MoreActions :items="menuItems" />
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
    <td :colspan="online ? 13 : 15">
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
        :stats="selCode ? selCode.platforms : series.merged"
        :threshold="0.25"
        :problem-hits="hits"
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
</template>
