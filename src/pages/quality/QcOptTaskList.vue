<!-- 任务中心·优化任务：商品优化/编码优化/店铺优化三型优化中任务清单；
     行内「数据指标对比」＝优化周期起点 vs 当前（同商品趋势 metricTrend 口径），降好升坏着色；
     创建任务复用发起抽屉（提交后周期写回商品挂标签），详情复用待办详情抽屉 -->
<template>
  <section class="qc-opt-page">
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>优化类型</label>
          <BubbleSelect class-name="sg-select" :value="f.kind" :options="KIND_OPTS" @change="(v: string) => (f.kind = v)" />
        </div>
        <div class="sg-field">
          <label>状态</label>
          <BubbleSelect class-name="sg-select" :value="f.st" :options="ST_OPTS" @change="(v: string) => (f.st = v)" />
        </div>
        <div class="sg-field">
          <label>搜索</label>
          <span class="sg-inputwrap">
            <input v-model="f.kw" class="sg-input" placeholder="任务标题 / 优化对象">
            <button v-if="f.kw" type="button" class="kb-clear" title="清空" @click="f.kw = ''">×</button>
          </span>
        </div>
        <div class="sg-field-actions">
          <button type="button" class="sg-btn primary" @click="createOpen = true">创建任务</button>
        </div>
      </div>
    </div>

    <section class="qc-ss-sec qo-sec">
    <table class="qc-sg-table qo-table">
      <thead>
        <tr>
          <th style="width: 280px">优化任务</th>
          <th style="width: 100px">优化类型</th>
          <th style="width: 220px">优化对象</th>
          <th style="width: 90px">处理人</th>
          <th style="width: 300px">数据指标对比（起点 → 当前）</th>
          <th style="width: 90px">状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in rows" :key="r.t.id">
          <td>
            <div class="qo-title" :title="r.t.title">{{ r.t.title }}</div>
            <div class="qo-sub">周期：{{ r.cycle.start }} ~ {{ r.cycle.openEnd ? '至今' : r.cycle.end }}</div>
          </td>
          <td>
            <span class="tag" :style="{ background: `${KIND_COLOR[r.kind]}1a`, color: KIND_COLOR[r.kind] }">{{ r.kind }}</span>
          </td>
          <td>
            <div class="qo-title" :title="r.subject">{{ r.subject }}</div>
            <div v-if="r.subjectSub" class="qo-sub">{{ r.subjectSub }}</div>
          </td>
          <td><span class="qo-sub">{{ r.owner }}</span></td>
          <td class="qo-mx-cell">
            <div v-for="m in r.metrics" :key="m.lab" class="qo-mx">
              <span class="qc-cd-lb">{{ m.lab }}：</span>
              <span class="qc-cd-v">
                <s class="qo-base">{{ m.baseTxt }}</s>
                <span class="qo-arrow">→</span>
                <b class="qo-cur">{{ m.curTxt }}</b>
                <span class="qo-delta" :class="m.cls">{{ m.deltaTxt }}</span>
              </span>
            </div>
          </td>
          <td><span class="qo-st" :class="ST_CLS[r.status]">{{ r.status }}</span></td>
          <td class="qo-op">
            <div class="qc-op-col">
              <a @click="detailId = r.t.id">详情</a>
              <a @click="openTrend(r)">趋势图</a>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td colspan="7">
            <div class="sg-empty-wrap">
              <div class="sg-empty-icon">◌</div>
              <div>暂无优化任务，可点击右上角创建</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    </section>

    <QcTodoCreateDrawer v-if="createOpen" @close="createOpen = false" @created="onCreated" />
    <QcTodoDetailDrawer v-if="detail" :todo="detail" :on-close="() => (detailId = null)" />

    <!-- 趋势图：商品/编码优化复用商品·系列趋势弹层（带优化周期色带）；店铺优化复用店铺评分趋势（体验分四维＋周期色带） -->
    <QcTrendModal
      v-if="goodTrend"
      :title="goodTrend.title"
      :totals="goodTrend.totals"
      :good-types="goodTrend.goodTypes"
      :series-code="goodTrend.seriesCode"
      :online="goodTrend.online"
      :opt-range="goodTrend.optRange"
      :on-close="() => (goodTrend = null)"
    />
    <QcShopScoreTrend v-if="shopTrend" :shop="shopTrend.shop" :opt-range="shopTrend.cycle" :on-close="() => (shopTrend = null)" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import QcTodoCreateDrawer, { type TodoCreatePayload } from './QcTodoCreateDrawer.vue';
import QcTodoDetailDrawer from './QcTodoDetailDrawer.vue';
import QcTrendModal from './QcTrendModal.vue';
import QcShopScoreTrend from './QcShopScoreTrend.vue';
import { QC_TODOS, todoFromDraft, type QcTodo } from './qcTodoData';
import { qcShopGoods, qcShops, shopGoodHitTypes, shopGoodOfCode, onlineSeries, type OnlineShop, type ShopGood } from './qcOnlineData';
import { metricTrend, type ScopeTotals } from './qcCenterData';

type Kind = '商品优化' | '编码优化' | '店铺优化';
type St = '优化中' | '已结束' | '未开始';
const KIND_OPTS = ['全部', '商品优化', '编码优化', '店铺优化'];
const ST_OPTS = ['全部', '优化中', '已结束', '未开始'];
const KIND_COLOR: Record<Kind, string> = { 商品优化: '#4f7cff', 编码优化: '#9b6bff', 店铺优化: '#2ec7a5' };
const ST_CLS: Record<St, string> = { 优化中: 'run', 已结束: 'done', 未开始: 'wait' };

const kindOf = (t: QcTodo): Kind | null =>
  t.type === '商品优化' ? '商品优化'
    : t.type === '系列编码优化' || t.type === '商品编码优化' ? '编码优化'
      : t.type === '店铺优化' ? '店铺优化' : null;

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
/* 关联商品：待办自带 goods 优先；编码优化种子周期写在系列商品 optTask（todoId 回链），待办无 goods 时回查 */
const goodsOf = (t: QcTodo): ShopGood[] => (t.goods?.length ? t.goods : qcShopGoods.value.filter((g) => g.optTask?.todoId === t.id));
/* 优化周期：待办自带 optCycle 优先；种子口径周期写在关联商品 optTask（todoId 回链），店铺型回查旗下商品 */
interface Cycle { start: string; end: string; openEnd?: boolean; }
const cycleOf = (t: QcTodo): Cycle | null => {
  if (t.optCycle) return t.optCycle;
  const fromGoods = goodsOf(t).map((g) => g.optTask).find((k) => k && (!k.todoId || k.todoId === t.id));
  if (fromGoods) return fromGoods;
  if (t.shops?.length) {
    const ids = new Set(t.shops.map((s) => s.id));
    const g = qcShopGoods.value.find((x) => ids.has(x.shopId) && x.optTask && (!x.optTask.todoId || x.optTask.todoId === t.id));
    if (g?.optTask) return g.optTask;
  }
  return null;
};
const statusOf = (c: Cycle): St => {
  const now = todayIso();
  if (now < c.start) return '未开始';
  if (!c.openEnd && now > c.end) return '已结束';
  return '优化中';
};

/* 优化对象口径统计：商品/编码型取关联商品汇总，店铺型取旗下商品汇总（售后占比＝售后单÷订单） */
const totalsOf = (t: QcTodo): ScopeTotals => {
  let goods: ShopGood[] = goodsOf(t);
  if (kindOf(t) === '店铺优化' && t.shops?.length) {
    const ids = new Set(t.shops.map((s) => s.id));
    goods = qcShopGoods.value.filter((g) => ids.has(g.shopId));
  }
  const orders = goods.reduce((s, g) => s + g.orders, 0);
  const afterSales = goods.reduce((s, g) => s + g.afterSales, 0);
  const chatRisks = goods.reduce((s, g) => s + g.riskSessions, 0);
  return { orders, refundRate: orders ? (afterSales / orders) * 100 : 0, afterSales, chatRisks };
};
const hashOf = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h % 7; };

interface Mx { lab: string; baseTxt: string; curTxt: string; deltaTxt: string; cls: string; }
/* 店铺体验分四维：店铺体验分/商品体验/物流体验/服务体验（分值越高越好，升好降坏，与售后类降好升坏相反） */
const SHOP_DIMS: { key: 'score' | 'goods' | 'logistics' | 'service'; lab: string }[] = [
  { key: 'score', lab: '店铺体验分' },
  { key: 'goods', lab: '商品体验' },
  { key: 'logistics', lab: '物流体验' },
  { key: 'service', lab: '服务体验' },
];
/* 体验分序列：同店铺分监控趋势弹窗 seriesOfN 确定性口径（末端锚定当前分值，回推起点） */
const seedOf = (key: string) => (([...key].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 89) + 3);
const scoreSeries = (n: number, key: string, cur: number): number[] => {
  const seed = seedOf('shop-' + key);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(n - 1, 1);
    const wave = Math.sin(seed * 1.3 + i * 0.55) * 0.5 + Math.sin(seed * 2.7 + i * 0.21) * 0.5;
    out.push(cur + wave * 0.05 - (1 - t) * 0.06 * (seed % 2 ? 1 : -1));
  }
  out[n - 1] = cur;
  return out.map((v) => Math.round(v * 100) / 100);
};
const daySpan = (start: string) => {
  const s = new Date(`${start}T00:00:00`).getTime();
  const e = new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.max(2, Math.round((e - s) / 86400000) + 1);
};
/* 店铺优化：取关联店铺体验分四维，起点日 vs 当前（分值升好降坏） */
const shopMetricsOf = (t: QcTodo, c: Cycle): Mx[] | null => {
  const id = t.shops?.[0]?.id;
  const shop = id ? qcShops.value.find((s) => s.id === id) : null;
  if (!shop) return null;
  const n = daySpan(c.start);
  return SHOP_DIMS.map((d) => {
    const cur = shop[d.key];
    const base = scoreSeries(n, `${shop.id}-${d.key}`, cur)[0];
    const delta = Math.round((cur - base) * 100) / 100;
    const cls = Math.abs(delta) < 1e-9 ? 'flat' : delta > 0 ? 'good' : 'bad';
    const deltaTxt = Math.abs(delta) < 1e-9 ? '持平' : `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`;
    return { lab: d.lab, baseTxt: base.toFixed(2), curTxt: cur.toFixed(2), deltaTxt, cls };
  });
};
/* 指标对比：优化周期起点日 vs 昨日（当前）。店铺优化＝体验分四维（升好降坏）；商品/编码优化＝售后占比/售后单/风险会话（降好升坏） */
const metricsOf = (t: QcTodo, c: Cycle): Mx[] => {
  if (kindOf(t) === '店铺优化') {
    const sm = shopMetricsOf(t, c);
    if (sm) return sm;
  }
  const tr = metricTrend(totalsOf(t), 'custom', { start: c.start, end: todayIso() }, hashOf(t.id));
  const pick = (k: 'refundRate' | 'afterSales' | 'chatRisks') => {
    const s = tr.series[k];
    return { base: s[0] ?? 0, cur: s[s.length - 1] ?? 0 };
  };
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;
  const fmtInt = (v: number) => String(Math.round(v));
  const build = (lab: string, p: { base: number; cur: number }, fmt: (v: number) => string, pct: boolean): Mx => {
    const d = p.cur - p.base;
    const cls = Math.abs(d) < 1e-9 ? 'flat' : d < 0 ? 'good' : 'bad';
    const deltaTxt = Math.abs(d) < 1e-9 ? '持平' : `${d > 0 ? '+' : ''}${pct ? d.toFixed(1) : Math.round(d)}`;
    return { lab, baseTxt: fmt(p.base), curTxt: fmt(p.cur), deltaTxt, cls };
  };
  return [
    build('售后占比', pick('refundRate'), fmtPct, true),
    build('售后单', pick('afterSales'), fmtInt, false),
    build('风险会话', pick('chatRisks'), fmtInt, false),
  ];
};

const f = ref({ kind: '全部', st: '全部', kw: '' });
const rows = computed(() => {
  const kw = f.value.kw.trim();
  return QC_TODOS
    .map((t) => ({ t, kind: kindOf(t), cycle: cycleOf(t) }))
    .filter((x): x is { t: QcTodo; kind: Kind; cycle: Cycle } => !!x.kind && !!x.cycle)
    .map((x) => {
      const status = statusOf(x.cycle);
      let subject = '';
      let subjectSub = '';
      if (x.kind === '店铺优化') {
        subject = x.t.shops?.[0]?.name ?? '—';
        subjectSub = x.t.shops && x.t.shops.length > 1 ? `等 ${x.t.shops.length} 家店铺` : '';
      } else if (x.kind === '编码优化') {
        const gs = goodsOf(x.t);
        subject = gs[0]?.name ?? '—';
        subjectSub = gs.length > 1 ? `等 ${gs.length} 个商品编码` : '';
      } else {
        subject = goodsOf(x.t)[0]?.name ?? '—';
      }
      const owner = x.t.handlers?.[0]?.name ?? x.t.to ?? x.t.toList?.[0] ?? '—';
      return { t: x.t, kind: x.kind, cycle: x.cycle, status, subject, subjectSub, owner, metrics: metricsOf(x.t, x.cycle) };
    })
    .filter((r) => (f.value.kind === '全部' || r.kind === f.value.kind))
    .filter((r) => (f.value.st === '全部' || r.status === f.value.st))
    .filter((r) => !kw || r.t.title.includes(kw) || r.subject.includes(kw));
});

/* 创建任务：提交后生成待办并把优化周期写回关联商品（挂「优化中」标签），与店铺商品入口同闭环 */
const createOpen = ref(false);
const onCreated = (p: TodoCreatePayload) => {
  if (p.optCycle) {
    const todo = todoFromDraft({
      title: p.title, priority: p.priority, body: p.body, files: p.files, goods: p.goods,
      senders: p.senders, deadline: p.deadline, type: p.type || '商品优化',
      optPlan: p.optPlan, optEnd: p.optEnd, optCycle: p.optCycle, shops: p.shops,
      autoTo: p.senders.length ? undefined : '接待段',
    });
    QC_TODOS.push(todo);
    p.goods.forEach((gd) => { gd.optTask = { ...p.optCycle!, todoId: todo.id }; });
  }
  createOpen.value = false;
};

const detailId = ref<string | null>(null);
const detail = computed(() => QC_TODOS.find((t) => t.id === detailId.value) ?? null);

/* 操作列「趋势图」＝各类型对应列表的趋势图，叠加优化周期色带看优化前后对比：
   商品优化→店铺商品列表·商品趋势；编码优化→编码监控列表·系列趋势；店铺优化→店铺列表·评分趋势（体验分四维） */
interface GoodTrend { title: string; totals: ScopeTotals; goodTypes?: { type: string; count: number }[]; seriesCode?: string; online?: boolean; optRange: Cycle; }
const goodTrend = ref<GoodTrend | null>(null);
const shopTrend = ref<{ shop: OnlineShop; cycle: Cycle } | null>(null);
const openTrend = (r: { t: QcTodo; kind: Kind; cycle: Cycle }) => {
  if (r.kind === '店铺优化') {
    const shop = qcShops.value.find((s) => s.id === r.t.shops?.[0]?.id);
    if (shop) shopTrend.value = { shop, cycle: r.cycle };
    return;
  }
  const g = goodsOf(r.t)[0];
  if (!g) return;
  if (r.kind === '编码优化') {
    const s = onlineSeries().find((x) => x.codes.some((c) => shopGoodOfCode(c.code)?.id === g.id));
    if (s) {
      goodTrend.value = {
        title: `系列 ${s.name}`,
        totals: { orders: s.orders, refundRate: s.refundRate, afterSales: s.afterSales, chatRisks: s.chatRiskHits },
        seriesCode: s.seriesCode,
        online: true,
        optRange: r.cycle,
      };
      return;
    }
  }
  goodTrend.value = {
    title: `商品 ${g.name}`,
    totals: { orders: g.orders, refundRate: g.afterRatio, afterSales: g.afterSales, chatRisks: g.riskSessions },
    goodTypes: shopGoodHitTypes(g),
    optRange: r.cycle,
  };
};
</script>

<style scoped>
.qc-opt-page { padding: 4px 0 24px; }
.qo-title { font-size: 13px; font-weight: 500; color: var(--color-text-1); line-height: 20px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.qo-sub { font-size: 12px; color: var(--color-text-3); line-height: 18px; margin-top: 2px; }
/* 数据指标对比：与其它列表复合列同口径（标签定宽＋值紧随，行间 8px） */
.qo-mx-cell { font-size: var(--fs-aux); color: #445066; }
.qo-mx-cell .qo-mx { display: flex; align-items: baseline; line-height: 20px; white-space: nowrap; }
.qo-mx-cell .qo-mx + .qo-mx { margin-top: 8px; }
.qo-mx-cell .qc-cd-lb { display: inline-block; width: 76px; flex: none; color: var(--color-text-3); }
.qo-mx-cell .qc-cd-v { display: inline-flex; align-items: baseline; gap: 6px; }
.qo-mx .qo-base { color: var(--color-text-3); text-decoration: line-through; }
.qo-mx .qo-arrow { color: var(--color-text-4); }
.qo-mx .qo-cur { color: var(--color-text-1); font-weight: 600; }
.qo-mx .qo-delta { font-size: 11px; }
.qo-mx .qo-delta.good { color: #00b42a; }
.qo-mx .qo-delta.bad { color: #f53f3f; }
.qo-mx .qo-delta.flat { color: var(--color-text-4); }
.qo-st { font-size: 12px; font-weight: 500; }
.qo-st.run { color: #4f7cff; }
.qo-st.done { color: var(--color-text-3); }
.qo-st.wait { color: #ff7d00; }
</style>
