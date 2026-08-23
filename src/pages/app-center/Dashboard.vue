<script setup lang="ts">
/* 数据看板：领导视角——哪些应用好用、范围内总人次与使用占比（1:1 移植自 Dashboard.tsx） */
import { computed, ref } from 'vue';
import type { AppItem, AppReview } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { FACTOR, RANGES, fmt, noise, type Range, type Row } from './dashUtil';
import AppTrendModal from './AppTrendModal.vue';

/* Ic：看板头部返回小图标 */
const Ic = { d: 'M15 19l-7-7 7-7' };

const props = defineProps<{
  apps: AppItem[];
  reviews: AppReview[];
  onBack: () => void;
  onOpenApp: (id: string) => void;
}>();

const range = ref<Range>(30);
const sort = ref<'use' | 'rate'>('use');
const cat = ref('全部');
const trendApp = ref<AppItem | null>(null);

/* 按应用聚合评价：均分 / 条数 / 好评率 */
const rateByApp = computed(() => {
  const m = new Map<string, { sum: number; cnt: number; good: number }>();
  props.reviews.forEach((r) => {
    const s = m.get(r.appId) ?? { sum: 0, cnt: 0, good: 0 };
    s.sum += r.stars;
    s.cnt += 1;
    if (r.stars >= 4) s.good += 1;
    m.set(r.appId, s);
  });
  return m;
});

const rows = computed<Row[]>(() => {
  const raw = props.apps.map((a) => {
    const s = rateByApp.value.get(a.id);
    return {
      app: a,
      use: Math.round(a.users * FACTOR[range.value] * noise(a.id)),
      share: 0,
      avg: s && s.cnt ? s.sum / s.cnt : 0,
      cnt: s?.cnt ?? 0,
      goodRate: s && s.cnt ? s.good / s.cnt : 0,
    };
  });
  const total = raw.reduce((x, r) => x + r.use, 0) || 1;
  raw.forEach((r) => { r.share = r.use / total; });
  raw.sort(sort.value === 'use'
    ? (a, b) => b.use - a.use
    : (a, b) => (b.avg || -1) - (a.avg || -1) || b.use - a.use);
  return raw;
});

const rangeTotal = computed(() => rows.value.reduce((s, r) => s + r.use, 0));
/* 全局人次排序 → 排名 */
const useSorted = computed(() => [...rows.value].sort((a, b) => b.use - a.use));
const rankOf = computed(() => new Map(useSorted.value.map((r, i) => [r.app.id, i + 1] as const)));
const top10 = computed(() => useSorted.value.slice(0, 10));
const maxUsers = computed(() => Math.max(1, ...props.apps.map((a) => a.users)));
const cats = computed(() => [...new Set(props.apps.map((a) => a.category))]);

/* 类目筛选改下拉（BubbleSelect）：默认全部 */
const view = computed(() => rows.value.filter((r) => cat.value === '全部' || r.app.category === cat.value));
const allTotal = computed(() => props.apps.reduce((s, a) => s + a.users, 0));
const avgAll = computed(() => props.reviews.length ? props.reviews.reduce((s, r) => s + r.stars, 0) / props.reviews.length : 0);
const goodAll = computed(() => props.reviews.length ? props.reviews.filter((r) => r.stars >= 4).length / props.reviews.length : 0);
const goodApps = computed(() => rows.value.filter((r) => r.avg >= 4.5 && r.cnt >= 3));

/* 应用数据概览：新增按上线日期判、更新按名称去重、蒙尘=日均使用不足 2 人次 */
const newApps = computed(() => props.apps.filter((a) => Date.now() - new Date(a.release).getTime() <= range.value * 86400000).length);
const updatedApps = computed(() => new Set(props.apps.filter((a) => a.hasUpdate || a.releaseNote).map((a) => a.name)).size);
const dustApps = computed(() => rows.value.filter((r) => r.use / range.value < 2).length);
</script>

<template>
  <div class="ap-dash">
    <div class="ap-dash-head">
      <button type="button" class="ap-back" @click="onBack()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path :d="Ic.d" />
        </svg>
      </button>
      <h2>数据概览</h2>
      <span class="ap-dash-range">
        <button v-for="d in RANGES" :key="d" type="button" :class="range === d ? 'on' : ''" @click="range = d">近{{ d }}天</button>
      </span>
    </div>

    <div class="ap-dash-ovcard">
      <section class="ap-dash-ovmod">
        <h3>应用数据概览</h3>
        <div class="ap-dash-kpis">
          <div class="ap-dash-kpi">
            <span class="lb">应用总数</span>
            <span class="vl">{{ apps.length }}</span>
            <span class="sb">覆盖 <b>{{ cats.length }}</b> 个类目</span>
          </div>
          <div class="ap-dash-kpi">
            <span class="lb">新增应用数</span>
            <span class="vl">{{ newApps }}</span>
            <span class="sb">近{{ range }}天新上线</span>
          </div>
          <div class="ap-dash-kpi">
            <span class="lb">更新应用数（去重后）</span>
            <span class="vl">{{ updatedApps }}</span>
            <span class="sb">按应用名去重的版本更新</span>
          </div>
          <div class="ap-dash-kpi">
            <span class="lb">蒙尘应用数</span>
            <span class="vl">{{ dustApps }}</span>
            <span class="sb">近{{ range }}天日均使用 &lt; 2 人次</span>
          </div>
        </div>
      </section>

      <section class="ap-dash-ovmod">
        <h3>使用情况概览</h3>
        <div class="ap-dash-kpis">
          <div class="ap-dash-kpi">
            <span class="lb">近{{ range }}天总使用人次</span>
            <span class="vl">{{ fmt(rangeTotal) }}</span>
            <span class="sb">日均约 <b>{{ fmt(Math.round(rangeTotal / range)) }}</b> 人次</span>
          </div>
          <div class="ap-dash-kpi">
            <span class="lb">累计总人次</span>
            <span class="vl">{{ fmt(allTotal) }}</span>
            <span class="sb">近{{ range }}天新增占 <b>{{ allTotal ? Math.round((rangeTotal / allTotal) * 100) : 0 }}%</b></span>
          </div>
          <div class="ap-dash-kpi">
            <span class="lb">总体平均评分</span>
            <span class="vl">{{ avgAll ? avgAll.toFixed(1) : '--' }}</span>
            <span class="sb">整体好评率 <b>{{ Math.round(goodAll * 100) }}%</b></span>
          </div>
          <div class="ap-dash-kpi">
            <span class="lb">好评应用</span>
            <span class="vl">{{ goodApps.length }}</span>
            <span class="sb">均分 ≥ 4.5 且评价 ≥ 3 条</span>
          </div>
        </div>
      </section>
    </div>

    <div class="ap-dash-duo">
      <section class="ap-dash-card ap-dash-top3-mod">
        <div class="ap-dash-top3-head">
          <h3>近{{ range }}天使用 TOP10</h3>
          <span>按使用人次排出的头部应用</span>
        </div>
        <div class="ap-dash-top3-list">
          <div v-for="(r, i) in top10" :key="r.app.id" class="ap-dash-top3-row" :class="`r${i + 1}`">
            <span class="medal">{{ i + 1 }}</span>
            <span class="inf">
              <b>{{ r.app.name }}</b>
              <i>{{ r.app.category }}</i>
            </span>
            <span class="nums">
              <b>{{ r.use }}<em>人次 / 近{{ range }}天</em></b>
              <i>占全盘使用 {{ (r.share * 100).toFixed(1) }}% · 均分 {{ r.cnt ? r.avg.toFixed(1) : '--' }}</i>
            </span>
          </div>
        </div>
      </section>

      <div class="ap-dash-duo-right">
        <section class="ap-dash-card">
          <h3>
            应用使用明细
            <span class="ap-dash-head-right">
              <BubbleSelect class-name="ap-dash-cat-select" :options="['全部', ...cats]" :value="cat" @change="(v) => (cat = v)" />
              <span class="ap-dash-range">
                <button type="button" :class="sort === 'use' ? 'on' : ''" @click="sort = 'use'">按使用人次</button>
                <button type="button" :class="sort === 'rate' ? 'on' : ''" @click="sort = 'rate'">按评分</button>
              </span>
            </span>
          </h3>
          <div class="ap-dash-scroll">
            <div class="ap-dash-thead">
              <span>排名</span>
              <span>应用</span>
              <span>近{{ range }}天使用人次</span>
              <span>应用总人次 / 日均占比</span>
              <span>平均评分</span>
              <span>好评率</span>
              <span>使用趋势</span>
            </div>
            <div v-for="r in view" :key="r.app.id" class="ap-dash-trow" @click="onOpenApp(r.app.id)">
              <span class="rk" :class="(rankOf.get(r.app.id) ?? 0) <= 3 ? ' top' : ''">{{ rankOf.get(r.app.id) }}</span>
              <span class="nm">
                <b>{{ r.app.name }}</b>
                <i>{{ r.app.category }}</i>
              </span>
              <span class="ct-strong">{{ r.use }} 人次<i class="ap-dash-dayavg">日均 {{ Math.round(r.use / range) }}</i></span>
              <span class="ap-dash-share">
                <span class="tr"><i :style="{ width: `${Math.max(2, Math.round((r.app.users / maxUsers) * 100))}%` }" /></span>
                <span class="pc">总 {{ fmt(r.app.users) }} 人次 · 日均占 {{ (r.share * 100).toFixed(1) }}%</span>
              </span>
              <span class="ct-strong">{{ r.cnt ? r.avg.toFixed(1) : '--' }}</span>
              <span class="ct-strong">{{ r.cnt ? `${Math.round(r.goodRate * 100)}%` : '--' }}</span>
              <button type="button" class="ap-dash-trendcell" title="点击查看使用趋势" @click.stop="trendApp = r.app">趋势图</button>
            </div>
            <div v-if="view.length === 0" class="ap-dash-empty">未找到匹配应用，调整类目试试</div>
          </div>
        </section>
      </div>
    </div>

    <AppTrendModal v-if="trendApp" :app="trendApp" :on-close="() => (trendApp = null)" />
  </div>
</template>
