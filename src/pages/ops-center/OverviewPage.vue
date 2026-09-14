<script setup lang="ts">
/* =========================================================
   概览页（运营驾驶舱之上）：数据总览（按业务概览拆两张卡：商品概览无时间查询 / 任务概览带时间查询 · 每个指标只出现一次）/
   趋势与榜单 / 个人贡献与店铺预警同一白卡大模块（预警仅展示，类目受限行可查看明细弹窗）/ 店铺发布明细
   任务四态计数与任务中心子任务实时同源聚合；受限店铺与发布任务店铺池同源
   ========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { OV_LIMIT_META, ovLimits, ovShops, parentTasks, OV_TODAY, OV_GOODS, OV_TREND, OV_TREND_BY_PLAT, OV_MEMBER_RANK, type OvLimitKind, type OvLimitRow, type OvLimitCat } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import SortTh from '../../components/SortTh.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';

/** 平台维度：商品/任务/贡献等卡各一套 chips（全部/视频号/淘宝），各自仅过滤本卡数据 */
const OV_PLATS = ['全部', '视频号', '淘宝'] as const;
type OvPlat = (typeof OV_PLATS)[number];
/* 商品/任务概览拆两张卡后平台口径各自独立：商品卡存量快照、任务卡随时间窗口聚合 */
const platGoods = ref<OvPlat>('全部');
const platTask = ref<OvPlat>('全部');
/* 贡献+预警大模块统一平台口径：卡头 chips 同时驱动两列 */
const platDuo = ref<OvPlat>('全部');

/* 时间查询（数据总览卡头）：今日/昨日/近3天/近7天/近30天/自定义；只统计数据总览的任务口径，趋势图与其它模块不随之变化 */
type OvRangeKey = '0' | '1' | '3' | '7' | '30' | 'custom';
const OV_RANGES: { key: OvRangeKey; label: string }[] = [
  { key: '0', label: '今日' },
  { key: '1', label: '昨日' },
  { key: '3', label: '近3天' },
  { key: '7', label: '近7天' },
  { key: '30', label: '近30天' },
  { key: 'custom', label: '自定义时间' },
];
const ovRange = ref<OvRangeKey>('7');
const customOpen = ref(false);
const customDraft = ref({ s: '', e: '' });
const customRange = ref<{ s: string; e: string } | null>(null);
/** n 天前日期串（YYYY-MM-DD）：时间窗口边界与任务批次日期同源比较 */
const ymd = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** 时间窗口起止：今日/昨日为单日，近 N 天含今日回溯，自定义取选定区间 */
const winBounds = computed<{ s: string; e: string }>(() => {
  if (ovRange.value === 'custom') return customRange.value ?? { s: '', e: '' };
  if (ovRange.value === '0') return { s: ymd(0), e: ymd(0) };
  if (ovRange.value === '1') return { s: ymd(1), e: ymd(1) };
  return { s: ymd(Number(ovRange.value) - 1), e: ymd(0) };
});

/** 发布任务四态计数：聚合任务中心子任务（与任务列表口径一致）并按时间窗口切片；单任务不跨平台，平台口径归 shops[0]；风控态（待确认/已取消）不计入四态 */
const taskCounts = computed(() => {
  const c = { success: 0, failed: 0, running: 0, queued: 0 };
  const { s: from, e: to } = winBounds.value;
  for (const p of parentTasks) for (const s of p.subs) {
    if (s.status === 'confirm' || s.status === 'cancelled') continue;
    if (platTask.value !== '全部' && s.shops[0]?.platform !== platTask.value) continue;
    const day = (s.startTime || p.createTime).slice(0, 10);
    if (day < from || day > to) continue;
    c[s.status] += 1;
  }
  return c;
});
const taskTotal = computed(() => taskCounts.value.success + taskCounts.value.failed + taskCounts.value.running + taskCounts.value.queued);
const TASK_CARDS = computed(() => [
  { key: 'success', label: '成功', cls: 'ok', n: taskCounts.value.success },
  { key: 'failed', label: '失败', cls: 'bad', n: taskCounts.value.failed },
  { key: 'running', label: '执行中', cls: 'run', n: taskCounts.value.running },
  { key: 'queued', label: '队列中', cls: 'wait', n: taskCounts.value.queued },
]);
const pctOf = (n: number) => (taskTotal.value ? `${Math.round((n / taskTotal.value) * 100)}%` : '0%');

/** 个人贡献榜：成功率为成功 ID / 发布 ID */
const memberRate = (m: { ok: number; ids: number }) => ((m.ok / m.ids) * 100).toFixed(1);
/** 个人贡献榜行：随大模块平台口径取 split 拆分（零件成员隐藏），按 ID 件数重排 */
const memberRows = computed(() => OV_MEMBER_RANK.map((m) => {
  if (platDuo.value === '全部') return m;
  const s = m.split[platDuo.value as '视频号' | '淘宝'];
  return { ...m, ids: s.ids, ok: s.ok, bad: s.bad };
}).filter((m) => m.ids > 0).sort((a, b) => b.ids - a.ids));
/* 类目受限明细弹窗：仅类目受限行提供查看入口，展示检测时间 + 逐类目原因 */
const catDetail = ref<OvLimitRow | null>(null);
/** 预警行行2：类目受限展示“N 个类目受限”（多类目明细见查看弹窗），其它类型展示场景描述 */
const limitNote = (r: { kind: OvLimitKind; cats?: OvLimitCat[]; note: string }) => (r.kind === 'category' ? `${r.cats?.length ?? 0} 个类目受限` : r.note);
/** 覆盖平台数（店铺池去重）；店铺数 tile 随平台口径过滤 */
const platformCount = computed(() => new Set(ovShops.map((s) => s.platform)).size);
const kpiShops = computed(() => (platGoods.value === '全部' ? ovShops : ovShops.filter((s) => s.platform === platGoods.value)));
const kpiShopSub = computed(() => (platGoods.value === '全部' ? `覆盖 ${platformCount.value} 个平台` : `占全部店铺 ${ovShops.length ? Math.round((kpiShops.value.length / ovShops.length) * 100) : 0}%`));

/** 商品维度口径：库存与动销快照随本卡平台 chips 切换，不参与时间查询聚合（存量口径） */
const goodsKpi = computed(() => (platGoods.value === '全部' ? OV_GOODS : { ...OV_GOODS.split[platGoods.value as '视频号' | '淘宝'] }));
/** 商品总数 = 出售中 + 下架（动销为出售中子集，不计入分母） */
const goodsTotal = computed(() => goodsKpi.value.onSale + goodsKpi.value.offShelf);
const goodsPct = (n: number) => (goodsTotal.value ? `${Math.round((n / goodsTotal.value) * 100)}%` : '0%');
/** 动销率 = 动销商品数 / 出售中商品数 */
const activeRate = computed(() => (goodsKpi.value.onSale ? Math.round((goodsKpi.value.active / goodsKpi.value.onSale) * 100) : 0));

const LIMIT_ORDER: OvLimitKind[] = ['quota', 'category', 'deposit', 'abnormal'];
/* 解除预警：二次确认后移除该行（演示态仅本地记录，不回写种子） */
const limitKey = (k: OvLimitKind, r: OvLimitRow) => `${k}|${r.platform}|${r.shop}`;
const removedLimits = ref<string[]>([]);
const releaseTarget = ref<{ kind: OvLimitKind; row: OvLimitRow } | null>(null);
const confirmRelease = () => {
  if (releaseTarget.value) removedLimits.value.push(limitKey(releaseTarget.value.kind, releaseTarget.value.row));
  releaseTarget.value = null;
};
/** 平台口径下的四类受限行（已解除的行不再展示） */
const limitsByKind = computed(() => {
  const out = {} as Record<OvLimitKind, OvLimitRow[]>;
  for (const k of LIMIT_ORDER) {
    const base = platDuo.value === '全部' ? ovLimits[k] : ovLimits[k].filter((r) => r.platform === platDuo.value);
    out[k] = base.filter((r) => !removedLimits.value.includes(limitKey(k, r)));
  }
  return out;
});
const limitedTotal = computed(() => LIMIT_ORDER.reduce((n, k) => n + limitsByKind.value[k].length, 0));
/** 店铺发布情况：全部 + 四类受限单模块内 tab 切换（带计数，同任务中心 tab 语言） */
type OvLimitTab = 'all' | OvLimitKind;
const limitTab = ref<OvLimitTab>('all');
const LIMIT_TABS = computed<{ key: OvLimitTab; label: string; n: number }[]>(() => [
  { key: 'all', label: '全部', n: limitedTotal.value },
  ...LIMIT_ORDER.map((k) => ({ key: k as OvLimitTab, label: OV_LIMIT_META[k].label, n: limitsByKind.value[k].length })),
]);
/** 当前 tab 行：全部=四类按严重度拍平并带分类标签；分类 tab=该类行 */
const limitRows = computed(() => {
  if (limitTab.value !== 'all') return limitsByKind.value[limitTab.value].map((r) => ({ ...r, kind: limitTab.value as OvLimitKind }));
  return LIMIT_ORDER.flatMap((k) => limitsByKind.value[k].map((r) => ({ ...r, kind: k })));
});

/** 店铺级发布明细：按店铺聚合任务中心店铺结果集（成功/失败/执行中/队列中），并挂受限分类标签（类目受限带具体类目） */
interface OvShopWarn { kind: OvLimitKind; cats?: OvLimitCat[] }
interface OvShopRow { platform: string; shop: string; total: number; success: number; failed: number; running: number; queued: number; limits: OvShopWarn[] }
const shopRows = computed<OvShopRow[]>(() => {
  const map = new Map<string, OvShopRow>();
  for (const s of ovShops) map.set(`${s.platform}::${s.shop}`, { platform: s.platform, shop: s.shop, total: 0, success: 0, failed: 0, running: 0, queued: 0, limits: [] });
  for (const p of parentTasks) {
    for (const sub of p.subs) {
      for (const sh of sub.shops) {
        const row = map.get(`${sh.platform}::${sh.shop}`);
        if (!row) continue;
        /* 风控态店铺行不会出现（未派发），防御性跳过保四态口径 */
        if (sh.status === 'confirm' || sh.status === 'cancelled') continue;
        row.total += 1;
        row[sh.status] += 1;
      }
    }
  }
  for (const r of map.values()) {
    r.limits = LIMIT_ORDER
      .filter((k) => ovLimits[k].some((x) => x.platform === r.platform && x.shop === r.shop))
      .map((k) => ({ kind: k, cats: ovLimits[k].find((x) => x.platform === r.platform && x.shop === r.shop)?.cats }));
  }
  /* 受限/异常店置顶（按分类严重度），其次失败数降序、任务量降序 */
  const sev = (r: OvShopRow) => (r.limits.length ? LIMIT_ORDER.indexOf(r.limits[0].kind) + 1 : 99);
  return [...map.values()].sort((a, b) => sev(a) - sev(b) || b.failed - a.failed || b.total - a.total);
});
/** 店铺发布概览：随分区平台口径过滤，按发布任务数降序（条宽按 TOP1 归一，成功率=成功/任务） */
const platTrend = ref('全部');
const trendPlats = computed(() => ['全部', ...[...new Set(ovShops.map((s) => s.platform))]]);
const timeWrapRef = ref<HTMLElement | null>(null);
const pickRange = (k: OvRangeKey) => {
  if (k === 'custom') {
    customOpen.value = !customOpen.value;
    if (customOpen.value && customRange.value) customDraft.value = { ...customRange.value };
    return;
  }
  ovRange.value = k;
  customOpen.value = false;
};
const applyCustom = () => {
  let { s, e } = customDraft.value;
  if (!s || !e) { pushToast('请先选择开始与结束日期', 'warning'); return; }
  if (s > e) [s, e] = [e, s];
  customRange.value = { s, e };
  ovRange.value = 'custom';
  customOpen.value = false;
  pushToast(`已应用自定义时间 ${s.slice(5)} ~ ${e.slice(5)}`);
};
/* 清除：清空草稿；已有生效区间时一并解除回落到近 7 天，保证每次点击都有可见结果 */
const clearCustom = () => {
  customDraft.value = { s: '', e: '' };
  if (customRange.value) {
    customRange.value = null;
    ovRange.value = '7';
    pushToast('已清除自定义时间');
  }
};
/* 无草稿且无生效区间时清除置灰，避免「点了没反应」 */
const clearDisabled = computed(() => !customDraft.value.s && !customDraft.value.e && !customRange.value);
/* 点击日期框任意位置即拉起原生日期选择器（不限日历小图标） */
const openPicker = (e: Event) => {
  const el = e.target as HTMLInputElement;
  try { el.showPicker?.(); } catch { /* 无用户手势等场景降级为手动输入 */ }
};
const onTimeDocDown = (e: MouseEvent) => {
  if (timeWrapRef.value && !timeWrapRef.value.contains(e.target as Node)) customOpen.value = false;
};
const onTimeKey = (e: KeyboardEvent) => { if (e.key === 'Escape') customOpen.value = false; };
onMounted(() => {
  document.addEventListener('click', onTimeDocDown);
  window.addEventListener('keydown', onTimeKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onTimeDocDown);
  window.removeEventListener('keydown', onTimeKey);
});
/* 趋势图与时间条件解耦：恒展示种子近 30 日全量，仅随本卡平台 chips 切换口径 */
const trendSeries = computed(() => OV_TREND.map((t, i) => (platTrend.value === '全部' ? t : { d: t.d, ...OV_TREND_BY_PLAT[platTrend.value][i] })));
const trendTitle = `近 ${OV_TREND.length} 天发布趋势`;
/* 柱组几何随天数自适应：组距=画布宽/天数，柱宽按组距比例钳制；标签抽稀保最多 14 个 */
const trendPitch = computed(() => 560 / Math.max(1, trendSeries.value.length));
const trendBarW = computed(() => Math.max(3, Math.min(8, trendPitch.value * 0.22)));
const trendLabelStep = computed(() => Math.max(1, Math.ceil(trendSeries.value.length / 14)));
/** 柱高系数：按当前口径峰值归一到 150px，平台口径量级小也不至于矮柱难辨 */
const trendK = computed(() => 150 / Math.max(1, ...trendSeries.value.map((t) => t.pub)));
const shopDist = computed(() => [...shopRows.value].filter((r) => platTrend.value === '全部' || r.platform === platTrend.value).sort((a, b) => b.total - a.total));
const distMax = computed(() => Math.max(...shopDist.value.map((s) => s.total), 1));
const distPct = (n: number) => `${Math.round((n / distMax.value) * 100)}%`;
const distRate = (r: { total: number; success: number }) => (r.total ? Math.round((r.success / r.total) * 100) : 0);
/* 趋势图悬浮：按日分组高亮 + 指标气泡（发品/成功/成功率） */
const hoverDay = ref<number | null>(null);
const tipRate = computed(() => {
  const t = hoverDay.value !== null ? trendSeries.value[hoverDay.value] : undefined;
  return t && t.pub ? Math.round((t.success / t.pub) * 100) : 0;
});

/* 查询条件（草稿/生效分离：点查询生效，重置恢复默认）：平台 / 店铺名称 / 店铺预警 */
interface OvFilter { plat: string; shop: string; warn: string }
const defaultFilter: OvFilter = { plat: '全部', shop: '', warn: '全部' };
const filter = ref<OvFilter>({ ...defaultFilter });
const applied = ref<OvFilter>({ ...defaultFilter });
/** 平台下拉：全部 + 店铺池去重平台（带计数） */
const platOpts = computed(() => [
  { value: '全部', label: '全部' },
  ...[...new Set(ovShops.map((s) => s.platform))].map((p) => ({ value: p, label: `${p}(${shopRows.value.filter((r) => r.platform === p).length})` })),
]);
const warnOpts = computed(() => [
  { value: '全部', label: '全部' },
  { value: 'normal', label: '正常' },
  ...LIMIT_ORDER.map((k) => ({ value: k, label: OV_LIMIT_META[k].label })),
]);
const onQuery = () => { applied.value = { plat: filter.value.plat, shop: filter.value.shop.trim(), warn: filter.value.warn }; };
const onReset = () => {
  filter.value = { ...defaultFilter };
  applied.value = { ...defaultFilter };
  sort.value = null;
};

/* 排序：五个数值列点击 降→升→取消（取消后回默认序：受限置顶） */
type OvSortKey = 'total' | 'success' | 'failed' | 'running' | 'queued';
const sort = ref<{ key: OvSortKey; dir: 'asc' | 'desc' } | null>(null);
const toggleSort = (key: OvSortKey) => {
  if (sort.value?.key !== key) sort.value = { key, dir: 'desc' };
  else if (sort.value.dir === 'desc') sort.value = { key, dir: 'asc' };
  else sort.value = null;
};
const sortState = (key: OvSortKey): 'none' | 'asc' | 'desc' => (sort.value?.key === key ? sort.value.dir : 'none');

/** 列表数据每日 0:00 更新：展示口径文案 + 最近一次更新时间（当日 0:00） */
const updatedAt = computed(() => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00`;
});

/** 筛选 + 排序后的可见行（平台 tab 即时生效，名称/预警走查询生效） */
const visibleRows = computed(() => {
  const f = applied.value;
  const rows = shopRows.value.filter((r) => {
    const okPlat = f.plat === '全部' || r.platform === f.plat;
    const okShop = !f.shop || r.shop.indexOf(f.shop) > -1;
    const okWarn = f.warn === '全部' || (f.warn === 'normal' ? r.limits.length === 0 : r.limits.some((w) => w.kind === f.warn));
    return okPlat && okShop && okWarn;
  });
  if (sort.value) {
    const { key, dir } = sort.value;
    rows.sort((a, b) => (dir === 'desc' ? b[key] - a[key] : a[key] - b[key]));
  }
  return rows;
});

/* 分页：项目统一 ib-pagination 模式（总条数/每页条数/页码/前往） */
const page = ref(1);
const pageSize = ref(10);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(visibleRows.value.length / pageSize.value)));
const pagedRows = computed(() => visibleRows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageSizeText = computed(() => `${pageSize.value}条/页`);
/* 页码窗口：当前页居中，最多 5 个 */
const pageList = computed(() => {
  const total = pageCount.value;
  const end = Math.min(total, Math.max(1, page.value - 2) + 4);
  const start = Math.max(1, end - 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 10; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};
watch([applied, pageSize, sort], () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });
watch(pageCount, (v) => { if (page.value > v) page.value = v; });
</script>

<template>
  <div class="ov-page">
    <!-- 商品概览：独立白卡置顶（存量快照口径，无时间查询），平台 chips 右置卡头 -->
    <section class="ov-card ov-hero">
      <div class="ov-sec-head">
        <b>商品概览</b>
        <span class="ov-plat-chips">
          <button
            v-for="p in OV_PLATS"
            :key="p"
            type="button"
            class="ov-plat-chip"
            :class="platGoods === p ? 'active' : ''"
            @click="platGoods = p"
          >{{ p }}</button>
        </span>
      </div>
      <div class="ov-tiles ov-tiles-goods">
        <div class="ov-tile">
          <span class="ov-klabel">店铺数</span>
          <b class="ov-kval">{{ kpiShops.length }}</b>
          <span class="ov-ksub">{{ kpiShopSub }}</span>
        </div>
        <div class="ov-tile">
          <span class="ov-klabel">出售中商品数</span>
          <b class="ov-kval">{{ goodsKpi.onSale.toLocaleString() }}</b>
          <span class="ov-ksub">占比 {{ goodsPct(goodsKpi.onSale) }}</span>
        </div>
        <div class="ov-tile">
          <span class="ov-klabel">下架商品数</span>
          <b class="ov-kval">{{ goodsKpi.offShelf.toLocaleString() }}</b>
          <span class="ov-ksub">占比 {{ goodsPct(goodsKpi.offShelf) }}</span>
        </div>
        <div class="ov-tile">
          <span class="ov-klabel">动销商品数</span>
          <b class="ov-kval">{{ goodsKpi.active.toLocaleString() }}</b>
          <span class="ov-ksub">动销率 {{ activeRate }}%</span>
        </div>
      </div>
    </section>

    <!-- 任务概览：独立白卡（随时间查询窗口聚合切片），时间 chips + 平台 chips 右置卡头 -->
    <section class="ov-card ov-hero">
      <div class="ov-sec-head">
        <b>任务概览</b>
        <!-- 时间查询：与平台 chips 同语言，右置平台 chips 之前；自定义展开日期区间浮层 -->
        <span ref="timeWrapRef" class="ov-time-wrap">
          <button
            v-for="r in OV_RANGES"
            :key="r.key"
            type="button"
            class="ov-plat-chip"
            :class="ovRange === r.key ? 'active' : ''"
            @click="pickRange(r.key)"
          >{{ r.label }}</button>
          <div v-if="customOpen" class="ov-time-pop" @click.stop>
            <input v-model="customDraft.s" type="date" class="ov-date-input" @click="openPicker" />
            <span class="ov-date-sep">至</span>
            <input v-model="customDraft.e" type="date" class="ov-date-input" @click="openPicker" />
            <button class="sg-btn" :disabled="clearDisabled" @click="clearCustom">
              清除
            </button>
            <button class="sg-btn primary" @click="applyCustom">
              确定
            </button>
          </div>
        </span>
        <span class="ov-plat-chips">
          <button
            v-for="p in OV_PLATS"
            :key="p"
            type="button"
            class="ov-plat-chip"
            :class="platTask === p ? 'active' : ''"
            @click="platTask = p"
          >{{ p }}</button>
        </span>
      </div>
      <div class="ov-tiles ov-tiles-task">
        <div class="ov-tile">
          <span class="ov-klabel">发布商品总数</span>
          <b class="ov-kval">{{ taskTotal }}</b>
          <span class="ov-ksub">成功率 {{ pctOf(taskCounts.success) }}</span>
        </div>
        <div v-for="t in TASK_CARDS" :key="t.key" class="ov-tile">
          <span class="ov-klabel">发布商品 · {{ t.label }}</span>
          <b class="ov-kval" :class="t.cls">{{ t.n }}</b>
          <span class="ov-ksub">占比 {{ pctOf(t.n) }}</span>
        </div>
        <div class="ov-tile">
          <span class="ov-klabel">今日成功率</span>
          <b class="ov-kval ok">{{ OV_TODAY.rate }}<i class="ov-kunit">%</i></b>
          <span class="ov-ksub"><em class="up">+{{ OV_TODAY.rateDelta }}pp</em> 较昨日</span>
        </div>
        <div class="ov-tile">
          <span class="ov-klabel">受限店铺</span>
          <b class="ov-kval bad">{{ OV_TODAY.limitShops }}<i class="ov-kunit">个</i></b>
          <span class="ov-ksub">明细见下方店铺预警</span>
        </div>
      </div>
    </section>

    <!-- 发布趋势与店铺概览：与数据总览一致的单一白卡大模块，组说明与平台 chips 收进卡头；内双列趋势/概览，发丝线分隔，概览列表自滚与趋势列等高 -->
    <section class="ov-card ov-trend-card">
      <div class="ov-sec-head">
        <b>发布趋势与店铺概览</b>
        <span class="ov-plat-chips">
          <button
            v-for="p in trendPlats"
            :key="p"
            type="button"
            class="ov-plat-chip"
            :class="platTrend === p ? 'active' : ''"
            @click="platTrend = p"
          >{{ p }}</button>
        </span>
      </div>
      <div class="ov-charts">
        <div class="ov-chart-col">
          <div class="ov-sec-head">
            <b>{{ trendTitle }}</b>
            <span class="ov-legend"><span><i class="lg-pub" />发品</span><span><i class="lg-ok" />成功</span></span>
          </div>
          <!-- 双柱：组距随窗口天数自适应；透明热区接管 hover，组高亮 + 指标气泡跟随 -->
          <div v-if="trendSeries.length" class="ov-trend-wrap">
            <svg class="ov-trend" viewBox="0 0 560 196">
              <line x1="8" y1="160" x2="552" y2="160" class="ax-line" />
              <g v-for="(t, i) in trendSeries" :key="t.d">
                <rect v-if="hoverDay === i" :x="i * trendPitch + 1" y="6" :width="trendPitch - 2" height="154" rx="6" class="hover-bg" />
                <rect :x="i * trendPitch + trendPitch / 2 - trendBarW - 1.5" :y="160 - t.pub * trendK" :width="trendBarW" :height="t.pub * trendK" rx="2.5" class="bar-pub" />
                <rect :x="i * trendPitch + trendPitch / 2 + 1.5" :y="160 - t.success * trendK" :width="trendBarW" :height="t.success * trendK" rx="2.5" class="bar-ok" />
                <text v-if="i % trendLabelStep === 0 || i === trendSeries.length - 1" :x="i * trendPitch + trendPitch / 2" y="180" class="ax">{{ t.d }}</text>
                <rect :x="i * trendPitch" y="0" :width="trendPitch" height="196" fill="transparent" @mouseenter="hoverDay = i" @mouseleave="hoverDay = null" />
              </g>
            </svg>
            <div
              v-if="hoverDay !== null && trendSeries[hoverDay]"
              class="ov-trend-tip"
              :style="{ left: `clamp(70px, ${((hoverDay + 0.5) / trendSeries.length) * 100}%, calc(100% - 70px))` }"
            >
              <div class="tp-date">{{ trendSeries[hoverDay].d }}</div>
              <div class="tp-row"><i class="tp-pub" />发品 <b>{{ trendSeries[hoverDay].pub }}</b></div>
              <div class="tp-row"><i class="tp-ok" />成功 <b>{{ trendSeries[hoverDay].success }}</b></div>
              <div class="tp-row tp-rate">成功率 <b>{{ tipRate }}%</b></div>
            </div>
          </div>
          <div v-else class="ov-empty ov-trend-empty">该时间段无发布数据</div>
        </div>
        <!-- 店铺维度：全部店铺发布概览（按发布任务数降序），带平台标与成功率色档，列表自滚与趋势列等高 -->
        <div class="ov-rank-col">
          <div class="ov-sec-head"><b>店铺发布概览</b></div>
          <div class="ov-rank-list">
            <div v-for="(s, i) in shopDist" :key="s.platform + s.shop" class="ov-rank-row">
              <i class="ov-rank-no" :class="i < 3 ? `top${i + 1}` : ''">{{ i + 1 }}</i>
              <span class="ov-rank-name" :title="s.shop">{{ s.shop }}</span>
              <i class="ov-tag ov-rank-plat">{{ s.platform }}</i>
              <span class="ov-bar"><i :style="{ width: distPct(s.total) }" /></span>
              <b class="ov-dist-n">{{ s.total }}</b>
              <span class="ov-rank-rate" :class="distRate(s) >= 90 ? 'ok' : 'warn'">{{ distRate(s) }}%</span>
            </div>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 个人贡献与店铺预警：与数据总览/趋势模块一致的单一白卡大模块；平台 chips 上收卡头统一驱动双列；内双列贡献榜/预警，预警列自滚与贡献列等高 -->
    <section class="ov-card ov-duo-card">
      <div class="ov-sec-head">
        <b>个人贡献与店铺预警</b>
        <span class="ov-plat-chips">
          <button
            v-for="p in OV_PLATS"
            :key="p"
            type="button"
            class="ov-plat-chip"
            :class="platDuo === p ? 'active' : ''"
            @click="platDuo = p"
          >{{ p }}</button>
        </span>
      </div>
      <div class="ov-duo">
        <div class="ov-member-col">
          <div class="ov-sec-head"><b>个人贡献榜</b></div>
          <!-- 紧凑单行表格式：成员 | 发布总数 | 成功 | 失败 | 成功率，成员/发品数多时限高自滚不撑破排版 -->
          <div class="ov-member-head">
            <span>成员</span><span>发布总数</span><span>成功</span><span>失败</span><span>成功率</span>
          </div>
          <div class="ov-member-list">
            <div v-for="(m, i) in memberRows" :key="m.name" class="ov-member-row">
              <span class="ov-member-who">
                <i class="ov-rank-no" :class="i < 3 ? `top${i + 1}` : ''">{{ i + 1 }}</i>
                <span class="ov-member-avatar">{{ m.name[0] }}</span>
                <span class="ov-member-name">{{ m.name }}</span>
                <i class="ov-tag">{{ m.group }}</i>
              </span>
              <b class="ov-member-n">{{ m.ids }}</b>
              <span class="ov-member-n ok">{{ m.ok }}</span>
              <span class="ov-member-n bad">{{ m.bad }}</span>
              <span class="ov-rank-rate" :class="m.ok / m.ids >= 0.9 ? 'ok' : 'warn'">{{ memberRate(m) }}%</span>
            </div>
          </div>
        </div>
        <div class="ov-limit-col">
          <div class="ov-sec-head">
            <b>店铺预警</b>
          </div>
          <div class="ov-limit-tabs">
            <button
              v-for="t in LIMIT_TABS"
              :key="t.key"
              type="button"
              class="ov-limit-tab"
              :class="limitTab === t.key ? 'active' : ''"
              @click="limitTab = t.key"
            >{{ t.label }}({{ t.n }})</button>
          </div>
          <div v-if="limitRows.length" class="ov-limit-list">
            <!-- 仅展示双行：行1 店铺名左对齐、检测时间右置；行2 类型徽标置于店铺名下方左对齐、原因右置；类目受限行提供查看弹窗（时间/类目/原因） -->
            <div v-for="r in limitRows" :key="r.kind + r.platform + r.shop" class="ov-limit-row">
              <span class="ov-limit-line1">
                <span class="ov-limit-shop" :title="r.shop">{{ r.shop }}</span>
                <span class="ov-limit-time">{{ r.time }}</span>
              </span>
              <span class="ov-limit-line2">
                <i class="ov-limit-kind" :class="OV_LIMIT_META[r.kind].cls">{{ OV_LIMIT_META[r.kind].label }}</i>
                <span class="ov-limit-note" :title="limitNote(r)">{{ limitNote(r) }}</span>
                <a v-if="r.kind === 'category'" class="ov-limit-op" href="javascript:void(0)" @click.prevent="catDetail = r">查看</a>
                <a class="ov-limit-op" href="javascript:void(0)" @click.prevent="releaseTarget = { kind: r.kind, row: r }">解除预警</a>
              </span>
            </div>
          </div>
          <div v-else class="ov-empty">暂无受限店铺</div>
        </div>
      </div>
    </section>

    <!-- 类目受限明细：检测时间 + 逐类目原因（每个类目原因可能不一致，点击预警行“查看”打开）；pm-host 宿主层复用 .pm-page 弹窗基础样式 -->
    <div class="pm-page pm-host">
      <Modal v-if="catDetail" :title="`${catDetail.shop} · 类目受限`" sub="受限时间与逐类目原因明细" @close="catDetail = null">
        <div class="bp-rows">
          <div class="bp-row"><span class="bp-label">检测时间</span><b>{{ catDetail.time }}</b></div>
          <div v-for="c in catDetail.cats ?? []" :key="c.name" class="bp-row">
            <span class="bp-label"><i class="ov-tag warn">{{ c.name }}</i></span>
            <b>{{ c.note }}</b>
          </div>
        </div>
        <template #foot>
          <button class="sg-btn primary" @click="catDetail = null">知道了</button>
        </template>
      </Modal>
      <!-- 解除预警：不可逆操作二次确认，确认后该行从预警列表与 tab 计数中移除 -->
      <Modal
        v-if="releaseTarget"
        title="解除预警"
        :sub="`解除后该店铺的${OV_LIMIT_META[releaseTarget.kind].label}预警将不再展示`"
        @close="releaseTarget = null"
      >
        <div class="bp-rows">
          <div class="bp-row"><span class="bp-label">店铺</span><b>{{ releaseTarget.row.shop }}</b></div>
          <div class="bp-row"><span class="bp-label">预警类型</span><b>{{ OV_LIMIT_META[releaseTarget.kind].label }}</b></div>
          <div class="bp-row"><span class="bp-label">预警内容</span><b>{{ limitNote({ ...releaseTarget.row, kind: releaseTarget.kind }) }}</b></div>
        </div>
        <template #foot>
          <button class="sg-btn" @click="releaseTarget = null">取消</button>
          <button class="sg-btn primary" @click="confirmRelease">确认解除</button>
        </template>
      </Modal>
    </div>

    <!-- 店铺发布明细：标题/查询/列表同一白卡背景，表格 edge-to-edge -->
    <section class="ov-card ov-detail-card">
      <div class="ov-sec-head ov-detail-head">
        <b>店铺发布明细</b>
        <span class="ov-sec-sub ov-sec-right">每日 0:00 更新 · 最近更新 {{ updatedAt }}</span>
      </div>
      <div class="ov-detail-filter">
        <div class="sg-grid">
          <div class="sg-field">
            <label>平台</label>
            <BubbleSelect class-name="sg-select" :value="filter.plat" :options="platOpts" @change="(v: string) => (filter.plat = v)" />
          </div>
          <div class="sg-field">
            <label>店铺名称</label>
            <input v-model="filter.shop" class="sg-input" placeholder="请输入店铺名称" @keydown.enter="onQuery" />
          </div>
          <div class="sg-field">
            <label>店铺预警</label>
            <BubbleSelect class-name="sg-select" :value="filter.warn" :options="warnOpts" @change="(v: string) => (filter.warn = v)" />
          </div>
          <div class="sg-actions">
            <button class="sg-btn" @click="onReset">
              重置
            </button>
            <button class="sg-btn primary" @click="onQuery">
              查询
            </button>
          </div>
        </div>
      </div>
      <div class="ov-table-wrap">
        <table class="sg-table ov-shop-table">
          <thead>
            <tr>
              <th>店铺</th>
              <SortTh label="发布任务" :state="sortState('total')" @sort="toggleSort('total')" />
              <SortTh label="成功" :state="sortState('success')" @sort="toggleSort('success')" />
              <SortTh label="失败" :state="sortState('failed')" @sort="toggleSort('failed')" />
              <SortTh label="执行中" :state="sortState('running')" @sort="toggleSort('running')" />
              <SortTh label="队列中" :state="sortState('queued')" @sort="toggleSort('queued')" />
              <th>店铺预警</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in pagedRows" :key="r.platform + r.shop">
              <td><b class="ov-shop-name">{{ r.shop }}</b></td>
              <td>{{ r.total }}</td>
              <td class="ok">{{ r.success }}</td>
              <td :class="{ bad: r.failed > 0 }">{{ r.failed }}</td>
              <td class="run">{{ r.running }}</td>
              <td>{{ r.queued }}</td>
              <td>
                <span class="ov-limit-cats">
                  <i v-if="!r.limits.length" class="ov-tag ok">正常</i>
                  <i v-for="w in r.limits" :key="w.kind" class="ov-tag" :class="OV_LIMIT_META[w.kind].cls">{{ OV_LIMIT_META[w.kind].label }}{{ w.cats?.length ? `：${w.cats.map((c) => c.name).join('、')}` : '' }}</i>
                </span>
              </td>
            </tr>
            <tr v-if="!visibleRows.length">
              <td colspan="7" class="ov-empty">无匹配店铺</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ visibleRows.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" :value="pageSizeText" :options="['10条/页', '20条/页', '50条/页']" @change="(v: string) => onPageSize(v)" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
          <button v-for="n in pageList" :key="n" class="ib-pagebtn" :class="n === page ? 'active' : ''" @click="page = n">{{ n }}</button>
          <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input v-model="jumpVal" class="ib-jump-input" @keyup.enter="onJump" />
          <span>页</span>
        </div>
      </div>
    </section>
  </div>
</template>
