<script setup lang="ts">
/* ---------- 售后列表（品控-线上）：逐单售后单明细（查询条件 + 明细表） ---------- */
import { computed, ref, watch } from 'vue';
import {
  AFTER_TYPES, AFTER_PLATFORMS, EVIDENCE_START, EVIDENCE_END, afterJumpSeed, scanAfterOrders, sliceAfterOrders, onlineSeriesOfCode, onlineSessionsOf, patchOnlineSession, hitSubDepts, subsOfType,
  shopGoodOfCode, shopGoodSkus, type AfterScan, type AfterOrderRow, type ShopGood,
} from './qcOnlineData';
import { DEPT_COLOR, PROBLEM_TYPE_COLOR, QC_PROBLEM_TYPES, QC_DEPTS, type DateRange, type RangeKey } from './qcCenterData';
import { SHOP_NAME, type ChatHit, type ChatMessage, type ChatSession } from './data';
import { qcGet } from './qcApi';
import PlatLogo from './PlatLogo.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import ChatFullModal from './ChatFullModal.vue';
import PieChart from './PieChart.vue';
import QcSectionHead from './QcSectionHead.vue';
import QcRangeToggle from './QcRangeToggle.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import QcTypeShuttle from './QcTypeShuttle.vue';

const ALL = { type: '全部类型', platform: '全部平台', sess: '全部' };
const GO_DEFAULT = '全部组别 / 全部运维';
const blank = () => ({ go: GO_DEFAULT, type: ALL.type, platform: ALL.platform, sess: ALL.sess, ptype: null as string | null, sub: null as string | null, dept: '全部部门', from: '', to: '', kw: '' });
const applied = ref(blank());

/* 问题大类占比下钻态：null＝大类视图，值＝当前下钻的问题大类（与监控列表/评价列表同交互） */
const asDetail = ref<string | null>(null);

/* 两级页面：一级＝售后概览看板，点概览入口代入对应条件进二级列表页；返回恢复一级口径 */
const tier = ref<'ov' | 'list'>('ov');
const ovSnap = ref(blank());
const openList = (seed: Partial<ReturnType<typeof blank>> = {}) => {
  ovSnap.value = { ...applied.value };
  const next = { ...applied.value, ...seed };
  applied.value = { ...next };
  tier.value = 'list';
  syncDraft();
};
const backToOv = () => {
  applied.value = { ...ovSnap.value };
  tier.value = 'ov';
};

/* 二级列表页查询条件（按列表列内容配置）：单号/编码关键词、平台、售后类型、问题类型、问题小类（随类型级联）、申请时间；查询/重置同排右对齐。
   草稿态独立于生效条件：概览入口代入的维度（大类/部门/会话）不被查询/重置覆盖 */
const blankDraft = () => ({ kw: '', platform: ALL.platform, type: ALL.type, ptype: null as string | null, sub: null as string | null, from: '', to: '' });
const draft = ref(blankDraft());
const syncDraft = () => {
  const a = applied.value;
  draft.value = { kw: a.kw, platform: a.platform, type: a.type, ptype: a.ptype, sub: a.sub, from: a.from, to: a.to };
};
const onAsQuery = () => {
  applied.value = { ...applied.value, kw: draft.value.kw.trim(), platform: draft.value.platform, type: draft.value.type, ptype: draft.value.ptype, sub: draft.value.sub, from: draft.value.from, to: draft.value.to };
};
const onAsReset = () => { draft.value = blankDraft(); onAsQuery(); };

/* 数据概览售后数据卡跳转：预选类型 / 状态后立即生效，消费后清空种子（侧栏直达不带筛选）；跳转即入二级列表页 */
watch(afterJumpSeed, (s) => {
  if (!s) return;
  ovSnap.value = blank();
  applied.value = { ...blank(), ...s };
  tier.value = 'list';
  syncDraft();
  afterJumpSeed.value = null;
}, { immediate: true });

const toQuery = (f: ReturnType<typeof blank>) => {
  const [g, o] = f.go.split(' / ');
  /* 状态/关键词筛选已下线，但查询口径仍需显式传「全部状态」/空串，否则 matchAfter 会按未定义状态过滤掉全部售后单 */
  return { group: g, operator: o, type: f.type, platform: f.platform, status: '全部状态', kw: f.kw, sess: f.sess, ptype: f.ptype, sub: f.sub, dept: f.dept, from: f.from, to: f.to };
};

/* 查询生效时全量扫描一次：累计命中数 / 小类计数 / 每系列命中数，分页切片再回生成取行 */
const scan = ref<AfterScan>(scanAfterOrders(toQuery(applied.value)));

const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
watch(applied, (v) => { scan.value = scanAfterOrders(toQuery(v)); page.value = 1; jumpVal.value = '1'; asDetail.value = null; });
const pageCount = computed(() => Math.max(1, Math.ceil(scan.value.total / pageSize.value)));
const rowsCalc = computed(() => sliceAfterOrders(toQuery(applied.value), scan.value.cum, (page.value - 1) * pageSize.value, page.value * pageSize.value));
/* 模拟接口读取：售后列表行经 /qc/after/list 返回（入参＝生效筛选＋分页），界面只消费响应 data */
const rows = ref<ReturnType<typeof sliceAfterOrders>>([]);
const loading = ref(false);
watch(rowsCalc, async (v) => {
  loading.value = true;
  const res = await qcGet('/qc/after/list', { filter: applied.value, page: page.value, pageSize: pageSize.value }, () => v);
  rows.value = res.data;
  loading.value = false;
}, { immediate: true });
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
watch(page, (v) => { jumpVal.value = String(v); });

/* ---------- 售后概览看板：全部指标与列表查询条件同口径 ---------- */
/* 模块级查询条件（照搬编码监控·数据总览/问题类型占比头部语言）：售后概览＝时间范围；问题大类占比＝时间范围＋平台＋责任部门。
   售后数据日期域为证据窗口（EVIDENCE_START..END），范围档位按该轴取窗，禁套用编码监控 DATE_AXIS（今日轴会滤空） */
const AFTER_AXIS: string[] = (() => {
  const out: string[] = [];
  const d = new Date(`${EVIDENCE_START}T00:00:00`);
  const end = new Date(`${EVIDENCE_END}T00:00:00`);
  const p = (n: number) => String(n).padStart(2, '0');
  while (d <= end) { out.push(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`); d.setDate(d.getDate() + 1); }
  return out;
})();
const AFTER_FULL_RANGE: DateRange = { start: EVIDENCE_START, end: EVIDENCE_END };
const afterWindow = (range: RangeKey, custom: DateRange): [string, string] => {
  const n = AFTER_AXIS.length;
  let i0 = 0;
  let i1 = n - 1;
  if (range === 'today') i0 = n - 1;
  else if (range === '7d') i0 = Math.max(0, n - 7);
  else if (range === 'custom') {
    const a = AFTER_AXIS.findIndex((x) => x >= custom.start);
    if (a >= 0) i0 = a;
    for (let i = n - 1; i >= 0; i--) if (AFTER_AXIS[i] <= custom.end) { i1 = i; break; }
    if (i0 > i1) [i0, i1] = [i1, i0];
  }
  return [AFTER_AXIS[i0], AFTER_AXIS[i1]];
};
const ovRange = ref<RangeKey>('custom');
const ovCustom = ref<DateRange>({ ...AFTER_FULL_RANGE });
/* 概览头部平台切换（下拉 BubbleSelect，与其它模块一致）：只滤概览四卡与其钻取入口；占比带/右列各有独立平台口径 */
const ovPlat = ref<'全部平台' | (typeof AFTER_PLATFORMS)[number]>('全部平台');
const OV_PLAT_OPTS: ('全部平台' | (typeof AFTER_PLATFORMS)[number])[] = ['全部平台', ...AFTER_PLATFORMS];
const onOvPlat = (v: string) => { ovPlat.value = v as '全部平台' | (typeof AFTER_PLATFORMS)[number]; };
const catRange = ref<RangeKey>('custom');
const catCustom = ref<DateRange>({ ...AFTER_FULL_RANGE });
const catPlat = ref('全部平台');
const catDept = ref('全部');
const CAT_PLAT_OPTS = OV_PLAT_OPTS;
const CAT_DEPT_OPTS = ['全部', ...QC_DEPTS];
const onCatPlat = (v: string) => { catPlat.value = v; asDetail.value = null; };
const onCatDept = (v: string) => { catDept.value = v; asDetail.value = null; };
const ovScan = computed(() => {
  const [from, to] = afterWindow(ovRange.value, ovCustom.value);
  return scanAfterOrders(toQuery({ ...applied.value, platform: ovPlat.value, from, to }));
});
const catScan = computed(() => {
  const [from, to] = afterWindow(catRange.value, catCustom.value);
  return scanAfterOrders(toQuery({ ...applied.value, platform: catPlat.value, from, to }));
});
const OV_PLAT_COLORS: Record<string, string> = {
  天猫: '#f2555f', 拼多多: '#ff9f43', 抖音: '#5b6472', 京东: '#4f7cff', 淘宝: '#9b6bff', 快手: '#2ec7a5',
};
const ov = computed(() => scan.value.ov);
const pctOf = (n: number) => (ovScan.value.total ? `${((n / ovScan.value.total) * 100).toFixed(1)}%` : '0.0%');
const topType = computed(() => [...ovScan.value.ov.types].sort((a, b) => b.count - a.count)[0] ?? null);
const topSub = computed(() => ovScan.value.ov.psubs[0] ?? null);
/* 问题大类占比卡：色点＋单量＋占比（占各大类命中合计），顺序同数据总览；责任部门筛选时由小类回卷大类 */
const catSubs = computed(() => (catDept.value === '全部'
  ? catScan.value.ov.psubs
  : catScan.value.ov.psubs.filter((p) => hitSubDepts(p.label).includes(catDept.value))));
const catCats = computed(() => {
  if (catDept.value === '全部') return catScan.value.ov.pcats;
  const m = new Map<string, number>();
  for (const p of catSubs.value) {
    const t = QC_PROBLEM_TYPES.find((x) => subsOfType(x).includes(p.label));
    if (t) m.set(t, (m.get(t) ?? 0) + p.count);
  }
  return [...m.entries()].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || QC_PROBLEM_TYPES.indexOf(a.label) - QC_PROBLEM_TYPES.indexOf(b.label));
});
const catTotal = computed(() => catCats.value.reduce((s, i) => s + i.count, 0));
const catCards = computed(() => catCats.value.map((i) => ({
  label: i.label,
  count: i.count,
  pct: catTotal.value ? `${((i.count / catTotal.value) * 100).toFixed(1)}%` : '0.0%',
  color: PROBLEM_TYPE_COLOR[i.label] ?? '#4f7cff',
})));
/* 下钻小类卡：仅取当前大类命中的小类，占比＝小类命中 ÷ 该大类小类合计；色板循环同数据总览 */
const SUB_COLORS = ['#e5484d', '#f76b15', '#7c3aed', '#4f7cff', '#12a594', '#e93d82', '#d46b08', '#1f9d55'];
const subCards = computed(() => {
  if (!asDetail.value) return [];
  const subs = catSubs.value.filter((p) => subsOfType(asDetail.value!).includes(p.label));
  const sum = subs.reduce((s, i) => s + i.count, 0);
  return subs.map((i, idx) => ({
    label: i.label,
    count: i.count,
    pct: sum ? `${((i.count / sum) * 100).toFixed(1)}%` : '0.0%',
    color: SUB_COLORS[idx % SUB_COLORS.length],
  }));
});
/* 责任部门占比卡：小类命中数按其责任部门归集（共担小类各部门全计）；占比＝部门命中 ÷ 各部门命中合计 */
const deptCards = computed(() => {
  const m = new Map<string, number>();
  for (const p of catSubs.value) {
    for (const d of hitSubDepts(p.label)) m.set(d, (m.get(d) ?? 0) + p.count);
  }
  const sum = [...m.values()].reduce((s, n) => s + n, 0);
  return [...m.entries()].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1))
    .map((i) => ({
      label: i.label,
      count: i.count,
      pct: sum ? `${((i.count / sum) * 100).toFixed(1)}%` : '0.0%',
      color: DEPT_COLOR[i.label] ?? '#98a0b3',
    }));
});
/* 售后趋势：总量 + 各售后类型分线（viewBox 100x100 铺满、non-scaling-stroke；统一 0–max 归一，线间可比） */
const TREND_TYPE_COLORS: Record<string, string> = { '退货退款/退款': '#f2555f', 换货: '#ff9f43', 补发: '#7c3aed' };
const trendLabels = computed(() => ov.value.days.map((d) => d.label));
const trendSeries = computed(() => {
  const labels = trendLabels.value;
  const series: { key: string; label: string; color: string; counts: number[] }[] = [
    { key: '__all', label: '全部', color: '#4f7cff', counts: ov.value.days.map((d) => d.count) },
  ];
  for (const t of AFTER_TYPES) {
    const arr = ov.value.tdays[t] ?? [];
    series.push({ key: t, label: t, color: TREND_TYPE_COLORS[t] ?? '#12a594', counts: labels.map((lb) => arr.find((x) => x.label === lb)?.count ?? 0) });
  }
  return series;
});
const trendMax = computed(() => Math.max(1, ...trendSeries.value.flatMap((s) => s.counts)));
const trendPath = (counts: number[]) => {
  const n = counts.length;
  if (n < 2) return '';
  return `M${counts.map((v, i) => `${((i / (n - 1)) * 100).toFixed(2)},${(6 + (1 - v / trendMax.value) * 88).toFixed(2)}`).join('L')}`;
};
const allPath = computed(() => trendPath(ov.value.days.map((d) => d.count)));
const allAreaPath = computed(() => (allPath.value ? `${allPath.value}L100,100L0,100Z` : ''));
/* 趋势悬浮：定位最近日期索引，展示竖向导引 + 深色气泡（当日各序列单量） */
const trendWrap = ref<HTMLDivElement | null>(null);
const trendHover = ref<{ i: number; px: number; py: number } | null>(null);
const trendGuideX = computed(() => {
  const n = trendLabels.value.length;
  return trendHover.value && n > 1 ? (trendHover.value.i / (n - 1)) * 100 : 0;
});
const onTrendMove = (e: MouseEvent) => {
  const el = trendWrap.value;
  const n = trendLabels.value.length;
  if (!el || n < 2) return;
  const rect = el.getBoundingClientRect();
  const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - rect.left) / rect.width) * (n - 1))));
  trendHover.value = { i, px: (i / (n - 1)) * rect.width, py: e.clientY - rect.top };
};
const dayAxis = computed(() => {
  const d = ov.value.days;
  return { first: d.length ? d[0].label.slice(5) : '', last: d.length > 1 ? d[d.length - 1].label.slice(5) : '' };
});
/* 平台售后占比饼图：周期内各平台申请单量（色同平台口径 OV_PLAT_COLORS） */
const platPieItems = computed(() => ov.value.plats.map((p) => ({ label: p.label, value: p.count, color: OV_PLAT_COLORS[p.label] ?? '#4f7cff' })));

/* 概览入口点入二级列表：代入对应维度条件（会话/类型/小类/大类/平台/申请日），小类回查所属大类供穿梭控件回显；
   概览四卡入口另代入头部平台切换口径，保证钻取列表与卡面数字同口径 */
const ptypeOfSub = (s: string) => QC_PROBLEM_TYPES.find((t) => subsOfType(t).includes(s)) ?? null;
const listAll = () => openList({ platform: ovPlat.value });
const listSess = () => openList({ sess: '有会话', platform: ovPlat.value });
const listTopType = () => { if (topType.value) openList({ type: topType.value.label, platform: ovPlat.value }); };
const listTopSub = () => {
  const s = topSub.value;
  if (!s) return;
  const pt = ptypeOfSub(s.label);
  openList(pt ? { ptype: pt, sub: s.label, platform: ovPlat.value } : { ptype: s.label, sub: null, platform: ovPlat.value });
};
const listCat = (label: string) => openList({ ptype: label, sub: null });
/* 责任部门卡点击：代入责任部门条件进列表（展示该部门下关联问题小类的售后单），同评价列表部门卡交互 */
const listDept = (label: string) => openList({ dept: label });
const listPlat = (label: string) => openList({ platform: label });
const listDay = (label: string) => openList({ from: label, to: label });

/* 关联会话：由会话发起的售后单数据层已挂 sessionId，操作列点开聊天记录全屏弹窗（与售后单抽屉同源回写） */
const sessionModalId = ref<string | null>(null);
/* 会话按商品编码回查所属系列（onlineSeriesOfCode 以编码为键） */
const modalCode = ref<string | null>(null);
const sessVer = ref(0);
const openSession = (o: AfterOrderRow) => {
  modalCode.value = o.code;
  sessionModalId.value = o.sessionId ?? null;
};
const modalSessions = computed((): ChatSession[] => {
  void sessVer.value;
  if (!modalCode.value) return [];
  const s = onlineSeriesOfCode(modalCode.value);
  return s ? onlineSessionsOf(s).slice() : [];
});
const onModalHits = (id: string, hits: ChatHit[]) => {
  patchOnlineSession(id, hits);
  sessVer.value += 1;
};

/* 操作列「商品详情」：售后单商品编码经 shopGoodOfCode 归属店铺商品，复用系列详情抽屉的商品维度（SKU 导轨/三场景明细） */
const prodRow = ref<AfterOrderRow | null>(null);
const prodSeries = computed(() => (prodRow.value ? onlineSeriesOfCode(prodRow.value.code) : null));
const prodGood = computed(() => (prodRow.value ? shopGoodOfCode(prodRow.value.code) : null));
const prodSessions = computed(() => (prodSeries.value ? onlineSessionsOf(prodSeries.value).slice() : []));
const AS_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const prodCtx = computed(() => {
  const g = prodGood.value as ShopGood | null;
  if (!g) return null;
  const skuRows = shopGoodSkus(g);
  const skuSeries: Record<string, string[]> = {};
  const skuThumbs: Record<string, string> = {};
  skuRows.forEach((r, i) => {
    (skuSeries[r.name] ||= []).push(...r.series);
    skuThumbs[r.name] = AS_THUMBS[i % AS_THUMBS.length];
  });
  Object.keys(skuSeries).forEach((k) => { skuSeries[k] = [...new Set(skuSeries[k])]; });
  const skuSales: Record<string, number> = {};
  Object.keys(skuSeries).forEach((k) => {
    let h = 0;
    const s = `${g.id}-${k}`;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    skuSales[k] = 120 + (h % 1860);
  });
  return {
    name: g.name,
    thumb: AS_THUMBS[Number(g.id) % AS_THUMBS.length],
    skus: [...new Set(skuRows.map((r) => r.name))],
    skuSeries,
    skuThumbs,
    skuSales,
    skuCodeCount: skuRows.length,
    platform: prodRow.value?.platform ?? '',
    goodId: g.id,
    listedAt: g.listedAt,
  };
});

/* 客服打标映射：sessionId → csTag（供 ChatFullModal 左栏只读展示，取当前页售后单） */
const csTagMap = computed(() => {
  const map: Record<string, string> = {};
  rows.value.forEach((o) => { if (o.sessionId && o.csTag) map[o.sessionId] = o.csTag; });
  return map;
});

/* 导出会话内容：逐消息展平为行（带 BOM，Excel 可直接打开） */
const ROLE_TEXT: Record<ChatMessage['role'], string> = { buyer: '买家', support: '人工客服', ai: 'AI 回复' };
const exportSession = () => {
  const s = modalSessions.value.find((x) => x.id === sessionModalId.value);
  if (!s) return;
  const head = ['会话编号', '平台', '关联订单', '消息时间', '发送方', '消息内容'];
  const body = s.messages.map((m) => [s.id, s.platform, s.orderId, m.time, ROLE_TEXT[m.role], m.text]);
  const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `会话记录-${s.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div v-if="tier === 'list'" class="qc-head qc-as-head">
    <button type="button" class="qc-as-back" @click="backToOv">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
      返回售后概览
    </button>
  </div>
  <div class="qc-ao-panel qc-as-page">
    <!-- 一级页面：售后概览看板（与列表同口径）；无命中时不展示（空态文案兜底）
         原排版形态：整宽指标卡带在上、占比拆解在左、趋势分布在右；三个维度各自成豆腐块、块间留间隔
         概览各入口可点：代入对应维度条件进入二级列表页 -->
    <div v-if="tier === 'ov' && scan.total" class="qc-as-ov">
      <div class="qc-as-block">
        <QcSectionHead title="售后概览" :range="ovRange" :custom="ovCustom" :on-range="(r: RangeKey) => (ovRange = r)" :on-custom="(d: DateRange) => (ovCustom = d)">
          <!-- 平台切换：与其它模块一致的下拉（BubbleSelect），选项同问题大类占比卡平台下拉 -->
          <BubbleSelect class-name="sg-select" :value="ovPlat" :options="OV_PLAT_OPTS" @change="onOvPlat" />
        </QcSectionHead>
        <div class="qc-flat-grid cols-4">
          <div class="flat-card clickable" title="点击查看售后列表" @click="listAll">
            <div class="k">售后单量</div>
            <div class="v">{{ ovScan.total.toLocaleString() }}</div>
            <div class="after-sess">涉及系列编码<b>{{ ovScan.cum.length.toLocaleString() }}</b>个</div>
          </div>
          <div class="flat-card clickable" title="关联会话单量 = 由会话发起的售后单 · 点击查看有会话的售后单" @click="listSess">
            <div class="k">关联会话单量</div>
            <div class="v">
              {{ ovScan.ov.sess.toLocaleString() }}
              <span class="dept-pct">{{ pctOf(ovScan.ov.sess) }}</span>
            </div>
            <div class="after-sess sess-row">
              <span>风险会话数量 <b>{{ ovScan.ov.riskSess.toLocaleString() }}</b></span>
              <span class="sess-warn" title="风险会话占比 = 风险会话 ÷ 关联会话"><i class="sess-warn-ico">!</i>{{ ovScan.ov.sess ? `${((ovScan.ov.riskSess / ovScan.ov.sess) * 100).toFixed(1)}%` : '0.0%' }}</span>
            </div>
          </div>
          <div class="flat-card clickable" title="单量最高的售后类型 · 点击查看该类型售后单" @click="listTopType">
            <div class="k">TOP 售后类型</div>
            <div class="v qc-as-ov-txt">{{ topType ? topType.label : '—' }}</div>
            <div class="after-sess">
              <b>{{ topType ? topType.count.toLocaleString() : 0 }}</b>单 · {{ topType ? pctOf(topType.count) : '0.0%' }}
            </div>
          </div>
          <div class="flat-card clickable" title="单量最高的问题小类 · 点击查看该小类售后单" @click="listTopSub">
            <div class="k">TOP 问题小类</div>
            <div class="v qc-as-ov-txt">{{ topSub ? topSub.label : '—' }}</div>
            <div class="after-sess">
              <b>{{ topSub ? topSub.count.toLocaleString() : 0 }}</b>单 · {{ topSub ? pctOf(topSub.count) : '0.0%' }}
            </div>
          </div>
        </div>
      </div>

      <div class="qc-as-block">
        <div class="qc-as-ov-sec">
          <div class="qc-as-box-h">
            <template v-if="asDetail">
              <button type="button" class="qc-detail-back" title="返回全部大类" @click="asDetail = null">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <b class="qc-detail-name">{{ asDetail }}</b>
            </template>
            <template v-else>问题大类占比</template>
            <div class="qc-as-box-tools">
              <QcRangeToggle :value="catRange" :custom="catCustom" :on-change="(r: RangeKey) => (catRange = r)" :on-custom="(d: DateRange) => (catCustom = d)" />
              <BubbleSelect class-name="sg-select" :value="catPlat" :options="CAT_PLAT_OPTS" @change="onCatPlat" />
              <BubbleSelect class-name="sg-select" :value="catDept" :options="CAT_DEPT_OPTS" @change="onCatDept" />
            </div>
          </div>
          <div class="qc-flat-grid cols-3">
            <template v-if="!asDetail">
              <div
                v-for="i in catCards"
                :key="i.label"
                class="flat-card type-card"
                :title="`${i.label} ${i.count.toLocaleString()} 单 · ${i.pct} · 点击查看问题小类`"
                @click="asDetail = i.label"
              >
                <button type="button" class="qc-card-detail" title="选中该问题大类进入列表" @click.stop="listCat(i.label)">明细</button>
                <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
                <div class="v">{{ i.count.toLocaleString() }}<span class="dept-pct">{{ i.pct }}</span></div>
              </div>
            </template>
            <template v-else>
              <div
                v-for="i in subCards"
                :key="i.label"
                class="flat-card clickable"
                :title="`${i.label} ${i.count.toLocaleString()} 单 · ${i.pct} · 点击查看该小类售后单`"
                @click="openList({ ptype: asDetail, sub: i.label })"
              >
                <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
                <div class="v">{{ i.count.toLocaleString() }}<span class="dept-pct">{{ i.pct }}</span></div>
              </div>
            </template>
          </div>
        </div>
        <div class="qc-as-ov-sec">
          <div class="qc-as-box-h">责任部门占比</div>
          <div class="qc-flat-grid cols-3">
            <div
              v-for="i in deptCards"
              :key="i.label"
              class="flat-card dept-card clickable"
              :title="`${i.label}：小类命中 ${i.count.toLocaleString()} 单 · ${i.pct} · 点击查看该部门关联问题小类的售后单`"
              @click="listDept(i.label)"
            >
              <div class="k"><i class="type-dot" :style="{ background: i.color }" />{{ i.label }}</div>
              <div class="v">{{ i.count.toLocaleString() }}<span class="dept-pct">{{ i.pct }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="qc-as-block">
        <div class="qc-as-box">
          <div class="qc-as-box-h">售后趋势</div>
          <div class="qc-as-trend-legend">
            <span v-for="s in trendSeries" :key="s.key" class="qc-as-trend-leg"><i :style="{ background: s.color }" />{{ s.label }}</span>
          </div>
          <div ref="trendWrap" class="qc-as-days" @mousemove="onTrendMove" @mouseleave="trendHover = null">
            <svg class="qc-as-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="qc-as-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stop-color="#4f7cff" stop-opacity="0.18" />
                  <stop offset="1" stop-color="#4f7cff" stop-opacity="0" />
                </linearGradient>
              </defs>
              <path v-if="allAreaPath" :d="allAreaPath" fill="url(#qc-as-trend-fill)" />
              <path
                v-for="s in trendSeries"
                :key="s.key"
                :d="trendPath(s.counts)"
                fill="none"
                :stroke="s.color"
                :stroke-width="s.key === '__all' ? 2 : 1.6"
                stroke-linejoin="round"
                stroke-linecap="round"
                vector-effect="non-scaling-stroke"
              />
            </svg>
            <div v-for="d in ov.days" :key="d.label" class="d" title="点击查看当日售后单" @click="listDay(d.label)" />
            <div v-if="trendHover" class="qc-as-trend-guide" :style="{ left: trendGuideX + '%' }" />
            <div
              v-if="trendHover"
              class="mt-tip"
              :style="{
                left: trendHover.px + 'px',
                top: trendHover.py + 'px',
                transform: trendHover.px > (trendWrap?.clientWidth ?? 0) - 180 ? 'translate(calc(-100% - 10px), -50%)' : 'translate(10px, -50%)',
              }"
            >
              <div class="mt-tip-date">{{ trendLabels[trendHover.i] }}</div>
              <div v-for="s in trendSeries" :key="s.key" class="mt-tip-line">
                <i :style="{ background: s.color }" />{{ s.label }}<b>{{ s.counts[trendHover.i].toLocaleString() }} 单</b>
              </div>
            </div>
          </div>
          <div class="qc-as-days-axis">
            <span>{{ dayAxis.first }}</span>
            <span>{{ dayAxis.last }}</span>
          </div>
        </div>
        <div class="qc-as-box">
          <div class="qc-as-box-h">平台售后占比</div>
          <PieChart :items="platPieItems" total-label="售后单量" show-value value-unit="单" pickable :on-pick="listPlat" />
        </div>
      </div>
    </div>
    <div v-if="tier === 'ov' && !scan.total" class="qc-as-ov-empty">当前查询条件下无售后数据</div>

    <div v-if="tier === 'list'" class="qc-body">
      <!-- 列表页查询条件（按列内容配置）：单号/编码、平台、售后类型、问题类型、问题小类（级联）、申请时间；查询/重置同排右对齐 -->
      <div class="sg-filter qc-as-filter">
        <div class="sg-grid">
          <div class="sg-field">
            <label>单号/编码</label>
            <span class="sg-inputwrap">
              <input
                class="sg-input"
                placeholder="订单 / 售后单号 / 系列编码"
                :value="draft.kw"
                @input="draft.kw = ($event.target as HTMLInputElement).value"
                @keyup.enter="onAsQuery"
              >
              <button v-if="draft.kw" type="button" class="sg-clear" title="清除" @click="(draft.kw = '', onAsQuery())">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="sg-field">
            <label>平台</label>
            <BubbleSelect class-name="sg-select" clearable :value="draft.platform" :options="['全部平台', ...AFTER_PLATFORMS]" @change="(v: string) => (draft.platform = v)" @clear="onAsQuery" />
          </div>
          <div class="sg-field">
            <label>售后类型</label>
            <BubbleSelect class-name="sg-select" clearable :value="draft.type" :options="['全部类型', ...AFTER_TYPES]" @change="(v: string) => (draft.type = v)" @clear="onAsQuery" />
          </div>
          <!-- 问题类型/小类两级：左列大类、右列小类穿梭（同监控列表/店铺列表口径） -->
          <div class="sg-field">
            <label>问题类型</label>
            <span class="sg-inputwrap">
              <QcTypeShuttle
                class-name="sg-select"
                :ptype="draft.ptype"
                :sub="draft.sub"
                @change="(t: string | null, s: string | null) => { draft.ptype = t; draft.sub = s; }"
              />
              <button v-if="draft.ptype || draft.sub" type="button" class="sg-clear" title="清除" @click="draft.ptype = null; draft.sub = null; onAsQuery()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="sg-field">
            <label>申请时间</label>
            <QcDateRangePicker
              :custom="{ start: draft.from || EVIDENCE_START, end: draft.to || EVIDENCE_END }"
              :min="EVIDENCE_START"
              :max="EVIDENCE_END"
              :on-change="(d: DateRange) => { draft.from = d.start; draft.to = d.end; }"
            />
          </div>
          <div class="sg-field-actions">
            <button class="sg-btn" @click="onAsReset">重置</button>
            <button class="sg-btn primary" @click="onAsQuery">查询</button>
          </div>
        </div>
      </div>
      <table class="table ao-table" :class="{ 'is-loading': loading }">
        <thead>
          <tr>
            <th>平台</th>
            <th>订单/售后单号</th>
            <th>系列编码</th>
            <th>售后类型 / 售后原因</th>
            <th>客服标签</th>
            <th>问题类型</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in rows" :key="o.afterNo">
            <td>
              <span class="ao-plat"><PlatLogo :platform="o.platform" />{{ o.platform }}</span>
              <div class="ao-shop">{{ SHOP_NAME[o.platform] }}</div>
            </td>
            <!-- 订单号与售后单号合并单列：上订单、下售后，标签等长使单号左缘对齐 -->
            <td class="ao-nos">
              <div><span class="ao-no-lb">订单</span><span class="qc-mono">{{ o.orderNo }}</span></div>
              <div><span class="ao-no-lb">售后</span><span class="qc-mono">{{ o.afterNo }}</span></div>
            </td>
            <!-- 系列编码＝商品系列简称（袜子、冬季手套等），标签形式；字母+数字为商品编码 -->
            <td>
              <span class="tag">{{ o.seriesName }}</span>
            </td>
            <td class="col-name">
              <div><span class="tag">{{ o.type }}</span></div>
              <div class="ao-reason" :title="o.reason">{{ o.reason }}</div>
            </td>
            <td class="ao-cs"><span v-if="o.csTag" class="tag">{{ o.csTag }}</span><span v-else class="ao-dim">—</span></td>
            <td><span class="tag">{{ o.ptype || o.psub }}</span></td>
            <td class="ao-wrap">{{ o.appliedAt }}</td>
            <td>
              <div class="qc-op-col">
                <a @click="prodRow = o">商品详情</a>
                <a v-if="o.sessionId" @click="openSession(o)">查看会话</a>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !rows.length">
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
        <div class="ib-pageinfo">共 {{ scan.total.toLocaleString() }} 单</div>
        <BubbleSelect class-name="ib-page-size" :default-value="pageSize + '条/页'" :options="['5条/页', '10条/页', '20条/页']" @change="onPageSize" />
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
          <input class="ib-jump-input" :value="jumpVal" @input="jumpVal = ($event.target as HTMLInputElement).value" @keyup.enter="onJump">
          <span>页</span>
        </div>
      </div>
    </div>
  </div>

  <ChatFullModal
    v-if="sessionModalId"
    :sessions="modalSessions"
    :current-id="sessionModalId"
    :on-nav="(id: string) => (sessionModalId = id)"
    :on-close="() => (sessionModalId = null)"
    :on-update-hits="onModalHits"
    :on-export="exportSession"
    :cs-tag-map="csTagMap"
    show-sub
  />

  <!-- 商品详情抽屉：操作列「商品详情」按售后单商品编码归属店铺商品，商品维度打开 -->
  <QcSeriesDrawer
    v-if="prodRow && prodSeries && prodCtx"
    :key="`${prodRow.afterNo}-${prodRow.code}`"
    :series="prodSeries"
    :product="prodCtx"
    :on-close="() => (prodRow = null)"
    :all-sessions="prodSessions"
    :on-update-hits="onModalHits"
    :online="true"
  />
</template>
