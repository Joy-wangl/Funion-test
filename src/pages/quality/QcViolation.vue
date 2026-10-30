<script setup lang="ts">
/* ---------- 品控-线上 · 违规监控（一级路由，店铺监控下方）：看板 + 列表两级 ----------
   看板：违规数据总览（违规总数/封店清退店铺/受限冻结店铺/累计扣分/累计违约金）
        ＋违规类型占比（大类→小类下钻，环形）＋处置结果分布（7 档）＋违规趋势（按处置严重度）与 TOP 违规店铺；
   列表：违规记录明细（店铺/编号/时间/类型/处置/扣分违约金/状态/商品/运营组/操作），操作列「详情」打开整改建议抽屉。
   口径来源：拼多多/淘系/抖音三份违规梳理文档 ＋各平台规则中心，归一为 9 大类 × 小类、7 档处置。 ---------- */
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import PieChart from './PieChart.vue';
import ProblemTrendChart from './ProblemTrendChart.vue';
import PlatLogo from './PlatLogo.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';
import QcTypeShuttle from './QcTypeShuttle.vue';
import type { DateRange } from './qcCenterData';
import { qcGet } from './qcApi';
import {
  QC_VIOLATIONS, VIO_TYPES, VIO_TYPE_COLOR, VIO_SUB_BIG, vioSubsOf,
  VIO_SEVERITY, VIO_SEVERITY_COLOR, VIO_BLOCK_SEVERITY,
  VIO_STATUS, VIO_STATUS_COLOR, VIO_PLAT_GROUPS, vioPlatGroup,
  VIO_FIX_ADVICE, type VioRecord,
} from './qcViolationData';

const props = defineProps<{ sub: 'board' | 'list' }>();
const emit = defineEmits<{ (e: 'nav', v: 'board' | 'list'): void }>();

const RANGE_FULL: DateRange = { start: '2026-07-01', end: '2026-10-31' };
const blankF = () => ({
  platform: '全部', range: { ...RANGE_FULL }, shopName: '',
  ptype: null as string | null, sub: null as string | null,
  severity: '全部', status: '全部', productId: '', seriesCode: '',
});
const applied = ref(blankF());
const draft = ref(blankF());
const tier = ref<'board' | 'list'>(props.sub);
const ovSnap = ref<ReturnType<typeof blankF> | null>(null);

/* 侧栏二级子路由 ⇄ 内部 tier：切回看板时恢复下钻前口径 */
watch(() => props.sub, (s) => {
  tier.value = s;
  if (s === 'board' && ovSnap.value) { applied.value = { ...ovSnap.value }; draft.value = { ...ovSnap.value }; ovSnap.value = null; }
});
watch(draft, (v) => { applied.value = { ...v }; }, { deep: true });

const PLATFORM_OPTIONS = ['全部', ...VIO_PLAT_GROUPS] as string[];
const SEVERITY_OPTIONS = ['全部', ...VIO_SEVERITY] as string[];
const STATUS_OPTIONS = ['全部', ...VIO_STATUS] as string[];

/* 平台条件：值＝平台组（淘系合并天猫/淘宝；抖音、拼多多各自一组） */
const platMatch = (r: VioRecord, v: string) => v === '全部' || vioPlatGroup(r.platform) === v;

const filtered = computed(() => {
  const f = applied.value;
  return QC_VIOLATIONS.filter((r) => {
    if (!platMatch(r, f.platform)) return false;
    if (f.shopName && !r.shopName.includes(f.shopName)) return false;
    if (f.sub) { if (r.sub !== f.sub) return false; }
    else if (f.ptype) { if (r.type !== f.ptype) return false; }
    if (f.severity !== '全部' && r.severity !== f.severity) return false;
    if (f.status !== '全部' && r.status !== f.status) return false;
    if (f.productId && !(r.productId ?? '').includes(f.productId)) return false;
    if (f.seriesCode && !(r.seriesCode ?? '').includes(f.seriesCode)) return false;
    if (r.time !== '--' && (r.time < f.range.start || r.time > f.range.end)) return false;
    return true;
  });
});

/* ---------- 看板指标 ---------- */
const distinctShops = (list: VioRecord[]) => new Set(list.map((r) => r.shopId)).size;
const banList = computed(() => filtered.value.filter((r) => r.severity === '封店/清退'));
const restrictList = computed(() => filtered.value.filter((r) => r.severity === '店铺限制/冻结'));
const kpi = computed(() => {
  const list = filtered.value;
  return {
    total: list.length,
    banShops: distinctShops(banList.value),
    restrictShops: distinctShops(restrictList.value),
    pts: list.reduce((s, r) => s + r.deductPts, 0),
    fine: list.reduce((s, r) => s + r.fineAmt, 0),
  };
});

/* ---------- 违规类型占比：大类 → 小类下钻 ---------- */
const vioDetailType = ref<string | null>(null);
const countBy = (list: VioRecord[], key: (r: VioRecord) => string) => {
  const m: Record<string, number> = {};
  for (const r of list) { const k = key(r); m[k] = (m[k] ?? 0) + 1; }
  return m;
};
const bigTypeItems = computed(() => {
  const m = countBy(filtered.value, (r) => r.type);
  return VIO_TYPES
    .filter((b) => m[b])
    .map((b) => ({ label: b, value: m[b], color: VIO_TYPE_COLOR[b] ?? '#8891a2' }));
});
const subTypeItems = computed(() => {
  if (!vioDetailType.value) return null;
  const m = countBy(filtered.value.filter((r) => r.type === vioDetailType.value), (r) => r.sub);
  return vioSubsOf(vioDetailType.value)
    .filter((s) => m[s])
    .map((s) => ({ label: s, value: m[s], color: VIO_TYPE_COLOR[vioDetailType.value!] ?? '#8891a2' }));
});
const displayItems = computed(() => subTypeItems.value ?? bigTypeItems.value);
const pieItems = computed(() => displayItems.value);
const pieTotal = computed(() => displayItems.value.reduce((s, i) => s + i.value, 0));
/* 单卡来源：该类型（大类态按大类、小类态按小类）命中记录的去重店铺/商品数 */
const srcOf = (label: string) => {
  const list = filtered.value.filter((r) => (vioDetailType.value ? r.sub === label : r.type === label));
  return { shops: new Set(list.map((r) => r.shopId)).size, goods: new Set(list.filter((r) => r.productId).map((r) => r.productId)).size };
};

/* ---------- 处置结果分布（7 档） ---------- */
const severityCards = computed(() => {
  const m = countBy(filtered.value, (r) => r.severity);
  const total = filtered.value.length || 1;
  return VIO_SEVERITY.map((s) => ({
    label: s, count: m[s] ?? 0, color: VIO_SEVERITY_COLOR[s],
    pct: (((m[s] ?? 0) / total) * 100).toFixed(1),
  }));
});

/* ---------- 违规趋势：按自然月 × 处置严重度分桶 ---------- */
const monthsOf = (range: DateRange) => {
  const out: string[] = [];
  let y = Number(range.start.slice(0, 4));
  let m = Number(range.start.slice(5, 7));
  const ey = Number(range.end.slice(0, 4));
  const em = Number(range.end.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1; if (m > 12) { m = 1; y += 1; }
  }
  return out;
};
const TREND_BUCKETS = [
  { key: '封店/清退', color: '#a8071a' },
  { key: '店铺限制/冻结', color: '#f5222d' },
  { key: '店铺降权', color: '#fa541c' },
  { key: '其他处置', color: '#86909c' },
];
const monthOf = (r: VioRecord) => (r.time === '--' ? '' : r.time.slice(0, 7));
const trend = computed(() => {
  const months = monthsOf(applied.value.range);
  const series = TREND_BUCKETS.map((b) => ({ type: b.key, color: b.color, points: months.map(() => 0) }));
  for (const r of filtered.value) {
    const mi = months.indexOf(monthOf(r));
    if (mi < 0) continue;
    const bucket = r.severity === '封店/清退' || r.severity === '店铺限制/冻结' || r.severity === '店铺降权' ? r.severity : '其他处置';
    const s = series.find((x) => x.type === bucket);
    if (s) s.points[mi] += 1;
  }
  return { months, series };
});

/* ---------- TOP 违规店铺：按违规条数降序（并列按受限/封店条数） ---------- */
const shopRank = computed(() => {
  const m = new Map<string, { shop: string; shopId: string; platform: VioRecord['platform']; total: number; block: number }>();
  for (const r of filtered.value) {
    const e = m.get(r.shopId) ?? { shop: r.shopName, shopId: r.shopId, platform: r.platform, total: 0, block: 0 };
    e.total += 1;
    if (VIO_BLOCK_SEVERITY.has(r.severity)) e.block += 1;
    m.set(r.shopId, e);
  }
  return [...m.values()].sort((a, b) => b.block - a.block || b.total - a.total).slice(0, 8);
});

/* ---------- 看板卡片点击：代入条件进列表（快照当前口径，切回看板恢复） ---------- */
const gotoList = (patch: Partial<ReturnType<typeof blankF>>) => {
  ovSnap.value = { ...applied.value };
  const next = { ...applied.value, ...patch };
  applied.value = next;
  draft.value = { ...next };
  tier.value = 'list';
  emit('nav', 'list');
};

/* ---------- 违规类型穿梭回显 ---------- */
const hitPtype = computed(() => {
  if (applied.value.sub) return VIO_SUB_BIG[applied.value.sub] ?? null;
  return applied.value.ptype;
});
const hitSub = computed(() => applied.value.sub);

/* ---------- 列表：接口读取 + 分页 ---------- */
const listRowsCalc = computed(() => [...filtered.value].sort((a, b) => (a.time < b.time ? 1 : -1)));
const listRows = ref<VioRecord[]>([]);
const loading = ref(false);
watch(listRowsCalc, async (v) => {
  loading.value = true;
  const res = await qcGet('/qc/violation/list', applied.value, () => v);
  listRows.value = res.data;
  loading.value = false;
}, { immediate: true });

const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(listRows.value.length / pageSize.value)));
const pageRows = computed(() => listRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageList = computed((): (number | 'gap')[] => {
  const total = pageCount.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cur = page.value;
  if (cur <= 6) return [1, 2, 3, 4, 5, 6, 'gap', total];
  if (cur >= total - 5) return [1, 'gap', total - 5, total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap', cur - 1, cur, cur + 1, 'gap', total];
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 20; page.value = 1; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};
watch([applied, tier], () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });

/* ---------- 详情抽屉：违规原因 + 整改建议 ---------- */
const detail = ref<VioRecord | null>(null);
const fixAdvice = computed(() => (detail.value ? VIO_FIX_ADVICE[detail.value.type] ?? [] : []));
const sevColor = (s: string) => VIO_SEVERITY_COLOR[s] ?? '#86909c';
const typeColor = (t: string) => VIO_TYPE_COLOR[t] ?? '#8891a2';
const statusColor = (s: string) => VIO_STATUS_COLOR[s] ?? '#86909c';
</script>

<template>
  <div class="qc-ss-page qc-vio-page">
    <!-- 一级：违规数据看板 -->
    <div v-if="tier === 'board'" class="qc-rv-ov">
      <div class="qc-ov-panel">
        <div class="qc-sec-head">
          <div class="qc-sec-title">违规数据总览</div>
          <div class="qc-rv-ov-tools">
            <span class="qc-rv-ov-lb">平台</span>
            <BubbleSelect class-name="sg-select" :value="applied.platform" :options="PLATFORM_OPTIONS" @change="(v: string) => (applied.platform = v)" />
            <span class="qc-rv-ov-lb">时间</span>
            <QcDateRangePicker :custom="applied.range" :on-change="(d: DateRange) => (applied.range = d)" :min="RANGE_FULL.start" :max="RANGE_FULL.end" />
          </div>
        </div>
        <div class="qc-flat-grid cols-5">
          <div class="flat-card clickable" title="当前筛选下的违规记录总数 · 点击查看全部" @click="gotoList({})">
            <div class="k">违规总数</div>
            <div class="v">{{ kpi.total.toLocaleString() }}</div>
          </div>
          <div class="flat-card clickable" title="被封店/清退的去重店铺数 · 点击查看" @click="gotoList({ severity: '封店/清退' })">
            <div class="k">封店/清退店铺</div>
            <div class="v" style="color: #a8071a">{{ kpi.banShops.toLocaleString() }}</div>
          </div>
          <div class="flat-card clickable" title="被限制/冻结的去重店铺数 · 点击查看" @click="gotoList({ severity: '店铺限制/冻结' })">
            <div class="k">受限/冻结店铺</div>
            <div class="v" style="color: #f5222d">{{ kpi.restrictShops.toLocaleString() }}</div>
          </div>
          <div class="flat-card" title="当前筛选下累计违规扣分">
            <div class="k">累计扣分</div>
            <div class="v">{{ kpi.pts.toLocaleString() }}<span class="dept-pct">分</span></div>
          </div>
          <div class="flat-card" title="当前筛选下累计违约金/罚款">
            <div class="k">累计违约金</div>
            <div class="v">{{ kpi.fine.toLocaleString() }}<span class="dept-pct">元</span></div>
          </div>
        </div>

        <div class="qc-ov-divider" />
        <div class="qc-sec-head">
          <div class="qc-sec-title">
            <template v-if="vioDetailType">
              <button type="button" class="qc-detail-back" title="返回全部大类" @click="vioDetailType = null">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <b class="qc-detail-name">{{ vioDetailType }}</b>
            </template>
            <template v-else>违规类型占比</template>
          </div>
        </div>
        <div class="qc-share-row">
          <div class="qc-flat-grid cols-3 qc-share-cards">
            <div
              v-for="t in displayItems"
              :key="t.label"
              class="flat-card type-card"
              :title="vioDetailType ? `查看「${t.label}」违规记录` : `查看「${t.label}」下小类`"
              @click="vioDetailType ? gotoList({ ptype: vioDetailType, sub: t.label }) : (vioDetailType = t.label)"
            >
              <button
                v-if="!vioDetailType"
                type="button"
                class="qc-card-detail"
                title="选中该违规大类进入列表"
                @click.stop="gotoList({ ptype: t.label, sub: null })"
              >明细</button>
              <div class="k"><i class="type-dot" :style="{ background: t.color }" />{{ t.label }}</div>
              <div class="v">{{ t.value }}<span class="dept-pct">{{ pieTotal ? `${((t.value / pieTotal) * 100).toFixed(1)}%` : '0.0%' }}</span></div>
              <div class="qc-rv-src" title="该违规类型涉及的去重店铺数 / 商品数">
                <span>涉及店铺：<b>{{ srcOf(t.label).shops }}</b></span>
                <span class="sep">/</span>
                <span>涉及商品：<b>{{ srcOf(t.label).goods }}</b></span>
              </div>
            </div>
            <div v-if="!displayItems.length" class="qc-rv-board-empty">当前筛选下暂无违规记录</div>
          </div>
          <div class="qc-share-pie">
            <PieChart :items="pieItems" total-label="违规条数" show-value value-unit="条" :pickable="!vioDetailType" :on-pick="(l: string) => (vioDetailType = l)" />
          </div>
        </div>

        <div class="qc-ov-divider" />
        <div class="qc-sec-head"><div class="qc-sec-title">处置结果分布</div></div>
        <div class="qc-vio-sev-grid">
          <div
            v-for="s in severityCards"
            :key="s.label"
            class="flat-card clickable"
            :title="`查看「${s.label}」处置的违规记录`"
            @click="gotoList({ severity: s.label })"
          >
            <div class="k"><i class="type-dot" :style="{ background: s.color }" />{{ s.label }}</div>
            <div class="v" :style="{ color: s.count ? s.color : undefined }">{{ s.count }}<span class="dept-pct">{{ s.pct }}%</span></div>
          </div>
        </div>
      </div>

      <!-- 面板二：违规趋势（按处置严重度）+ TOP 违规店铺 -->
      <div v-if="kpi.total" class="qc-ov-panel qc-trend-ov">
        <div class="qc-sec-head">
          <div class="qc-sec-title">违规趋势与 TOP 违规店铺</div>
          <div class="qc-rv-ov-tools">
            <span class="qc-rv-ov-lb">平台</span>
            <BubbleSelect class-name="sg-select" :value="applied.platform" :options="PLATFORM_OPTIONS" @change="(v: string) => (applied.platform = v)" />
          </div>
        </div>
        <div class="qc-trend-row">
          <div class="qc-trend-panel">
            <ProblemTrendChart :labels="trend.months" :series="trend.series" />
          </div>
          <div class="qc-panel qc-rv-top-panel">
            <div class="p-title top-head">TOP 违规店铺</div>
            <div
              v-for="(s, i) in shopRank"
              :key="s.shopId"
              class="top-row"
              :title="`${s.shop}：${s.total} 条违规，其中 ${s.block} 条受限/封店 · 点击查看`"
              @click="gotoList({ shopName: s.shop })"
            >
              <span class="top-rank" :class="i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''">{{ i + 1 }}</span>
              <div class="top-info">
                <div class="n"><PlatLogo :platform="s.platform" />{{ s.shop }}</div>
                <div class="m">违规 {{ s.total }} 条 · 受限/封店 {{ s.block }} 条</div>
              </div>
              <span class="top-val"><b>{{ s.total }}</b><i>条</i></span>
            </div>
            <div v-if="!shopRank.length" class="qc-rv-board-empty">当前筛选下暂无违规记录</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 二级：违规记录列表 -->
    <section v-if="tier === 'list'" class="qc-ss-sec">
      <div class="sg-filter">
        <div class="sg-grid">
          <div class="sg-field">
            <label>平台</label>
            <BubbleSelect class-name="sg-select" :value="draft.platform" :options="PLATFORM_OPTIONS" @change="(v: string) => (draft.platform = v)" />
          </div>
          <div class="sg-field">
            <label>店铺名称</label>
            <input v-model="draft.shopName" type="text" class="sg-input" placeholder="输入店铺名称搜索">
          </div>
          <div class="sg-field">
            <label>违规类型</label>
            <QcTypeShuttle
              class-name="sg-select"
              :ptype="hitPtype"
              :sub="hitSub"
              :types="[...VIO_TYPES]"
              :subs-of="vioSubsOf"
              @change="(t: string | null, s: string | null) => { draft.ptype = t; draft.sub = s; }"
            />
          </div>
          <div class="sg-field">
            <label>处置结果</label>
            <BubbleSelect class-name="sg-select" :value="draft.severity" :options="SEVERITY_OPTIONS" @change="(v: string) => (draft.severity = v)" />
          </div>
          <div class="sg-field">
            <label>处理状态</label>
            <BubbleSelect class-name="sg-select" :value="draft.status" :options="STATUS_OPTIONS" @change="(v: string) => (draft.status = v)" />
          </div>
          <div class="sg-field">
            <label>商品ID</label>
            <input v-model="draft.productId" type="text" class="sg-input" placeholder="输入商品ID搜索">
          </div>
          <div class="sg-field">
            <label>系列编码</label>
            <input v-model="draft.seriesCode" type="text" class="sg-input" placeholder="输入系列编码搜索">
          </div>
          <div class="sg-field">
            <label>违规时间</label>
            <QcDateRangePicker :custom="draft.range" :on-change="(d: DateRange) => (draft.range = d)" :min="RANGE_FULL.start" :max="RANGE_FULL.end" />
          </div>
        </div>
      </div>
      <table class="qc-rv-table qc-vio-table" :class="{ 'is-loading': loading }">
        <thead>
          <tr>
            <th>店铺信息</th>
            <th>违规编号 / 时间</th>
            <th>违规类型</th>
            <th>处置结果 / 状态</th>
            <th>扣分 / 违约金</th>
            <th>商品信息</th>
            <th>运营组 / 专员</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in pageRows" :key="r.id">
            <td class="qc-rv-shop">
              <div class="qc-rv-shop-name"><PlatLogo :platform="r.platform" />{{ r.shopName }}</div>
              <div class="qc-rv-shop-id mono">店铺ID：{{ r.shopId }}</div>
            </td>
            <td class="qc-vio-id mono">
              <div>{{ r.id }}</div>
              <div class="qc-vio-time">{{ r.time }}</div>
            </td>
            <td class="qc-vio-type">
              <div class="prob-tags">
                <span class="tag" :style="{ background: `${typeColor(r.type)}1a`, color: typeColor(r.type) }">{{ r.type }}</span>
                <span class="tag sub" :style="{ background: `${typeColor(r.type)}14`, color: typeColor(r.type) }">{{ r.sub }}</span>
              </div>
              <div class="qc-vio-degree">{{ r.degree }}</div>
            </td>
            <td class="qc-vio-sev">
              <span class="tag" :style="{ background: `${sevColor(r.severity)}1a`, color: sevColor(r.severity) }">{{ r.severity }}</span>
              <div v-if="r.restrict" class="qc-vio-restrict">{{ r.restrict }}</div>
              <span class="tag qc-vio-status" :style="{ background: `${statusColor(r.status)}1a`, color: statusColor(r.status) }">{{ r.status }}</span>
            </td>
            <td class="qc-vio-penalty">
              <div><span class="lb">扣分</span>{{ r.deductPts ? `${r.deductPts} 分` : '无扣分' }}</div>
              <div><span class="lb">违约金</span>{{ r.fineAmt ? `${r.fineAmt.toLocaleString()} 元` : '—' }}</div>
            </td>
            <td class="qc-vio-goods">
              <template v-if="r.productId">
                <div class="qc-vio-goods-id mono">商品ID：{{ r.productId }}</div>
                <div v-if="r.seriesCode" class="qc-vio-goods-code mono">系列编码：{{ r.seriesCode }}</div>
              </template>
              <span v-else class="qc-vio-none">—</span>
            </td>
            <td class="qc-vio-ops">
              <div class="qc-vio-ops-group">{{ r.opsGroup }}</div>
              <div class="qc-vio-ops-sub">专员 {{ r.opsSpecialist }} · 助理 {{ r.opsAssistant }}</div>
            </td>
            <td class="qc-rv-op">
              <div class="qc-op-col">
                <a @click="detail = r">详情</a>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !listRows.length">
            <td colspan="8">
              <div class="sg-empty-wrap">
                <div class="sg-empty-icon">◌</div>
                <div>暂无数据，请调整筛选条件</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="pageCount > 1" class="ib-pagination">
        <div class="ib-pageinfo">共 {{ listRows.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" :value="`${pageSize}条/页`" :options="['20条/页', '50条/页', '100条/页']" @change="onPageSize" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
          <template v-for="(p, i) in pageList" :key="i">
            <span v-if="p === 'gap'" class="ib-pagedots">…</span>
            <button v-else class="ib-pagebtn" :class="p === page ? 'active' : ''" @click="page = p">{{ p }}</button>
          </template>
          <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input v-model="jumpVal" class="ib-jump-input" @keyup.enter="onJump">
          <span>页</span>
        </div>
      </div>
    </section>

    <!-- 违规详情抽屉：完整违规原因 + 按大类的整改建议 -->
    <template v-if="detail">
      <div class="drawer-mask" @click="detail = null" />
      <div class="drawer qc-vio-drawer">
        <div class="drawer-head">
          <span class="d-title">违规详情</span>
          <span class="qc-vio-head-id mono">{{ detail.id }}</span>
          <span class="tag qc-vio-head-sev" :style="{ background: `${sevColor(detail.severity)}1a`, color: sevColor(detail.severity) }">{{ detail.severity }}</span>
          <span class="x" @click="detail = null">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </span>
        </div>
        <div class="drawer-body">
          <div class="qc-vio-shop-head">
            <PlatLogo :platform="detail.platform" />
            <div>
              <div class="qc-vio-shop-name">{{ detail.shopName }}</div>
              <div class="qc-vio-shop-id mono">店铺ID：{{ detail.shopId }}</div>
            </div>
          </div>
          <div class="qc-vio-fields">
            <div class="f"><span class="lb">违规时间</span><span class="vl mono">{{ detail.time }}</span></div>
            <div class="f"><span class="lb">违规类型</span><span class="vl">{{ detail.type }} / {{ detail.sub }}</span></div>
            <div class="f"><span class="lb">违规程度</span><span class="vl">{{ detail.degree }}</span></div>
            <div class="f"><span class="lb">处置结果</span><span class="vl" :style="{ color: sevColor(detail.severity) }">{{ detail.severity }}<template v-if="detail.restrict">（{{ detail.restrict }}）</template></span></div>
            <div class="f"><span class="lb">扣分</span><span class="vl">{{ detail.deductPts ? `${detail.deductPts} 分` : '无扣分' }}</span></div>
            <div class="f"><span class="lb">违约金</span><span class="vl">{{ detail.fineAmt ? `${detail.fineAmt.toLocaleString()} 元` : '—' }}</span></div>
            <div class="f"><span class="lb">处理状态</span><span class="vl" :style="{ color: statusColor(detail.status) }">{{ detail.status }}</span></div>
            <div class="f"><span class="lb">商品ID</span><span class="vl mono">{{ detail.productId || '—' }}</span></div>
            <div class="f"><span class="lb">系列编码</span><span class="vl mono">{{ detail.seriesCode || '—' }}</span></div>
            <div class="f"><span class="lb">运营组</span><span class="vl">{{ detail.opsGroup }}</span></div>
            <div class="f"><span class="lb">运营专员</span><span class="vl">{{ detail.opsSpecialist }}</span></div>
            <div class="f"><span class="lb">运营助理</span><span class="vl">{{ detail.opsAssistant }}</span></div>
          </div>
          <div class="qc-vio-block">
            <div class="qc-vio-block-title">违规原因</div>
            <div class="qc-vio-reason">{{ detail.reason }}</div>
          </div>
          <div class="qc-vio-block">
            <div class="qc-vio-block-title">整改建议</div>
            <ul class="qc-vio-fix">
              <li v-for="(a, i) in fixAdvice" :key="i">{{ a }}</li>
              <li v-if="!fixAdvice.length">暂无该类型整改建议，请结合平台规则中心最新条款处理。</li>
            </ul>
          </div>
        </div>
        <div class="drawer-foot">
          <button type="button" class="qc-vio-btn" @click="detail = null">关闭</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.qc-vio-sev-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
.qc-vio-sev-grid .flat-card .v { font-size: 22px; }
/* 违规大类共 9 项，图例列多于评价看板：环形面板改为「环上 + 图例横排换行于下」，避免图例列溢出白卡 */
.qc-vio-page .qc-share-pie { width: 620px; }
.qc-vio-page :deep(.pie-wrap) { flex-direction: column; gap: 12px; }
.qc-vio-page :deep(.pie-legend) { flex-direction: row; flex-wrap: wrap; justify-content: center; width: auto; max-height: none; gap: 6px 16px; }

.qc-vio-table .qc-vio-id { font-size: 12px; color: var(--text-2); white-space: nowrap; }
.qc-vio-table .qc-vio-time { font-size: 12px; color: var(--text-2); white-space: nowrap; }
/* 违规列表为 8 列，覆盖 .qc-rv-table 面向评价列表的 7 列定宽（fixed 布局下末列会被挤没） */
.qc-vio-page .qc-vio-table th:nth-child(1) { width: 16%; }
.qc-vio-page .qc-vio-table th:nth-child(2) { width: 12%; }
.qc-vio-page .qc-vio-table th:nth-child(3) { width: 16%; }
.qc-vio-page .qc-vio-table th:nth-child(4) { width: 13%; }
.qc-vio-page .qc-vio-table th:nth-child(5) { width: 10%; }
.qc-vio-page .qc-vio-table th:nth-child(6) { width: 15%; }
.qc-vio-page .qc-vio-table th:nth-child(7) { width: 12%; }
.qc-vio-page .qc-vio-table th:nth-child(8) { width: 6%; }
.qc-vio-type .prob-tags { display: flex; flex-wrap: wrap; gap: 4px; }
.qc-vio-type .prob-tags .tag.sub { font-weight: 400; }
.qc-vio-degree { margin-top: 4px; font-size: 11px; color: var(--text-3); }
.qc-vio-sev .qc-vio-restrict { margin-top: 4px; font-size: 11px; color: var(--text-3); }
.qc-vio-sev .qc-vio-status { display: block; width: fit-content; margin-top: 4px; }
.qc-vio-penalty { font-size: 12px; color: var(--text-2); white-space: nowrap; }
.qc-vio-penalty .lb { display: inline-block; width: 48px; color: var(--text-3); }
.qc-vio-goods { font-size: 12px; color: var(--text-2); white-space: nowrap; }
.qc-vio-goods .qc-vio-goods-code { margin-top: 2px; color: var(--text-3); }
.qc-vio-none { color: var(--text-4, #c9cdd4); }
.qc-vio-ops { font-size: 12px; white-space: nowrap; }
.qc-vio-ops .qc-vio-ops-group { color: var(--text-2); }
.qc-vio-ops .qc-vio-ops-sub { margin-top: 2px; color: var(--text-3); font-size: 11px; }

.qc-vio-drawer { width: 600px; }
.qc-vio-head-id { margin-left: 12px; font-size: 12px; color: var(--text-3); }
.qc-vio-head-sev { margin-left: 10px; }
.qc-vio-shop-head { display: flex; align-items: center; gap: 10px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border-2); }
.qc-vio-shop-name { font-size: 15px; font-weight: 600; color: var(--text-1); }
.qc-vio-shop-id { font-size: 12px; color: var(--text-3); margin-top: 2px; }
.qc-vio-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
.qc-vio-fields .f { display: flex; align-items: baseline; font-size: 13px; }
.qc-vio-fields .lb { width: 72px; flex: none; color: var(--text-3); }
.qc-vio-fields .vl { color: var(--text-1); }
.qc-vio-block { margin-top: 20px; }
.qc-vio-block-title { font-size: 13px; font-weight: 600; color: var(--text-1); margin-bottom: 8px; }
.qc-vio-reason { font-size: 13px; line-height: 1.7; color: var(--text-2); background: #f7f8fa; border-radius: 8px; padding: 12px 14px; }
.qc-vio-fix { margin: 0; padding-left: 18px; }
.qc-vio-fix li { font-size: 13px; line-height: 1.9; color: var(--text-2); }
.qc-vio-btn { height: 32px; padding: 0 18px; border: 1px solid var(--border-2); background: #fff; border-radius: 8px; font-size: 13px; color: var(--text-2); cursor: pointer; }
.qc-vio-btn:hover { color: var(--text-1); border-color: var(--border-3, #c9cdd4); }
</style>
