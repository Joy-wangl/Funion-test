<script setup lang="ts">
/* ---------- 品控·线上·评价列表：两级结构 ——
   一级「评价看板」：照搬数据概览白面板语言 —— 数据总览(监控商品数/评价订单数/差评订单数/评价问题命中次数/风险品数量)
   ＋评价问题小类占比(卡片+环形)＋问题涉及部门占比(卡片)＋评价问题趋势(责任部门筛选)与TOP店铺排行；卡片点击代入条件进列表；
   二级「评价列表」：扁平评价明细（店铺信息/商品/SKU/用户/评价时间/命中问题类型/评价内容/操作），返回按钮恢复看板口径；
   筛选：看板头部「平台（下拉）＋时间区间」，卡片点击代入评价类型/店铺进列表 ---------- */
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import PieChart from './PieChart.vue';
import ProblemTrendChart from './ProblemTrendChart.vue';
import PlatLogo from './PlatLogo.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';
import QcTypeShuttle from './QcTypeShuttle.vue';
import QcSeriesDrawer from './QcSeriesDrawer.vue';
import { DEPT_COLOR, PROBLEM_TYPE_COLOR, type DateRange, type QcCenterSeries } from './qcCenterData';
import { qcReviews, RV_TYPES, RV_TYPE_COLORS, RV_BIG_TYPE, RV_BIG_TYPES, rvProductOf, rvSkuSales, type QcReview } from './qcReviewListData';
import { PLATFORMS, type ChatSession, type ChatHit, type Platform } from './data';
import { qcGet } from './qcApi';
import {
  onlineSessionsOf, patchOnlineSession,
  onlineSeries,
  AFTER_TYPES, AFTER_STATUSES, REVIEW_MISS_TYPE,
  type OnlineAfterOrder, type OnlineReview,
} from './qcOnlineData';

const RANGE_FULL: DateRange = { start: '2026-01-01', end: '2026-12-31' };
const blankF = () => ({ platform: '全部', range: { ...RANGE_FULL }, type: '全部', shopName: '', productId: '', hitType: '全部', dept: '全部部门' });
const applied = ref(blankF());
const tier = ref<'board' | 'list'>('board');
const ovSnap = ref(blankF());

/* 命中问题类型穿梭框回显：hitType＝大类或评价小类（小类反查所属大类作左列选中） */
const hitPtype = computed(() => {
  const v = applied.value.hitType;
  if (RV_BIG_TYPES.includes(v)) return v;
  return RV_BIG_TYPE[v] ?? null;
});
const hitSub = computed(() => (RV_TYPES.includes(applied.value.hitType) ? applied.value.hitType : null));
/* 右列小类词表：评价平台口径（小类→大类映射反查），与列表命中词表同源 */
const rvSubsOf = (t: string) => RV_TYPES.filter((s) => RV_BIG_TYPE[s] === t);

/* 平台下拉选项：仅列当前评价数据实际涉及的平台 */
const PLATFORM_OPTIONS = ['全部', ...PLATFORMS.filter((p) => qcReviews.some((r) => r.platform === p))] as string[];

const reviewDate = (r: QcReview) => `2026-${r.ratedAt.slice(0, 5).replace('/', '-')}`;
const filteredReviews = computed(() => {
  const f = applied.value;
  return qcReviews.filter((r) => {
    if (f.platform !== '全部' && r.platform !== f.platform) return false;
    if (f.shopName && !r.shopName.includes(f.shopName)) return false;
    if (f.productId && !r.productId.includes(f.productId)) return false;
    if (f.hitType !== '全部') {
      const types = r.types ?? [];
      if (RV_BIG_TYPES.includes(f.hitType)) {
        if (!types.some((t) => RV_BIG_TYPE[t] === f.hitType)) return false;
      } else {
        if (!types.includes(f.hitType)) return false;
      }
    }
    if (f.dept !== '全部部门' && !(r.types ?? []).some((t) => RV_TYPE_DEPT[t] === f.dept)) return false;
    if (f.type !== '全部') {
      if (f.type === '好评') { if (r.rating !== '挺好的') return false; }
      else if (f.type === '差评') { if (r.rating !== '不够好') return false; }
      else if (!(r.types ?? []).some((t) => t === f.type || RV_BIG_TYPE[t] === f.type)) return false;
    }
    const d = reviewDate(r);
    if (d < f.range.start || d > f.range.end) return false;
    return true;
  });
});

/* 看板扫描：指标（总/好评/差评/TOP问题类型）＋问题类型占比（差评类型命中次数）＋星级分布（5→1星） */
const pctOf = (n: number) => {
  const t = filteredReviews.value.length;
  return t ? `${((n / t) * 100).toFixed(1)}%` : '0.0%';
};
const scan = computed(() => {
  const list = filteredReviews.value;
  const total = list.length;
  const good = list.filter((r) => r.rating === '挺好的').length;
  const bad = total - good;
  const typeMap: Record<string, number> = {};
  const stars = [0, 0, 0, 0, 0];
  for (const r of list) {
    if (r.rating === '不够好') for (const t of r.types ?? []) typeMap[t] = (typeMap[t] ?? 0) + 1;
    stars[5 - r.stars] += 1;
  }
  const typeCards = Object.entries(typeMap)
    .map(([label, count]) => ({ label, count, color: RV_TYPE_COLORS[label] ?? '#8891a2', pct: pctOf(count) }))
    .sort((a, b) => b.count - a.count || RV_TYPES.indexOf(a.label) - RV_TYPES.indexOf(b.label));
  return { total, good, bad, typeCards, topType: typeCards[0] ?? null, stars };
});

/* 问题类型占比：默认展示大类聚合（评价小类→大类）；点击大类下钻展示该大类小类，标题返回按钮回大类 */
const rvDetailType = ref<string | null>(null);
const bigTypeItems = computed(() => {
  const m: Record<string, number> = {};
  for (const t of scan.value.typeCards) {
    const big = RV_BIG_TYPE[t.label];
    if (big) m[big] = (m[big] ?? 0) + t.count;
  }
  /* 空口径（无命中）仍全量枚举大类置 0，保证卡片正常展示而非整块隐藏 */
  if (!hitTotal.value) return RV_BIG_TYPES.map((b) => ({ label: b, value: 0, color: PROBLEM_TYPE_COLOR[b] ?? '#8891a2' }));
  return RV_BIG_TYPES
    .filter((b) => m[b])
    .map((b) => ({ label: b, value: m[b], color: PROBLEM_TYPE_COLOR[b] ?? '#8891a2' }));
});
const subTypeItems = computed(() => {
  if (!rvDetailType.value) return null;
  /* 空口径下钻同样全量枚举该大类小类置 0 */
  if (!hitTotal.value) return rvSubsOf(rvDetailType.value).map((s) => ({ label: s, value: 0, color: PROBLEM_TYPE_COLOR[s] ?? '#8891a2' }));
  return scan.value.typeCards
    .filter((t) => RV_BIG_TYPE[t.label] === rvDetailType.value)
    .map((t) => ({ label: t.label, value: t.count, color: PROBLEM_TYPE_COLOR[t.label] ?? '#8891a2' }));
});
const displayItems = computed(() => subTypeItems.value ?? bigTypeItems.value);
const pieItems = computed(() => displayItems.value);
const pieTotal = computed(() => displayItems.value.reduce((s, i) => s + i.value, 0));

/* 评价趋势＝时间序列 → 折线/面积趋势图：按自然月统计评价量与差评量（口径同当前筛选） */
const monthsOf = (range: DateRange) => {
  const out: string[] = [];
  let y = Number(range.start.slice(0, 4));
  let m = Number(range.start.slice(5, 7));
  const ey = Number(range.end.slice(0, 4));
  const em = Number(range.end.slice(5, 7));
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
};
/* 店铺评价排行：按店铺统计「评价问题命中」条数（差评且带问题类型）降序取 TOP8；点击代入店铺进列表 */
const shopRank = computed(() => {
  const m = new Map<string, number>();
  for (const r of filteredReviews.value) {
    if (r.rating !== '不够好' || !r.types?.length) continue;
    m.set(r.shopName, (m.get(r.shopName) ?? 0) + 1);
  }
  return [...m.entries()].map(([shop, count]) => ({ shop, count })).sort((a, b) => b.count - a.count).slice(0, 8);
});
const gotoShop = (shop: string) => {
  ovSnap.value = { ...applied.value };
  applied.value = { ...applied.value, shopName: shop };
  tier.value = 'list';
};

/* 问题类型趋势＝时间序列 → 折线/面积趋势图：按自然月分问题类型统计差评命中条数；支持责任部门筛选（部门→其负责类型） */
const RV_TYPE_DEPT: Record<string, string> = {
  质量差: '品质', 做工粗糙: '品质', 功能故障: '品质',
  与宣传不符: '运营', 色差严重: '运营', 客服态度差: '运营',
  发货慢: '快递', 物流破损: '快递', 少件漏发: '快递',
};
const RV_DEPTS = ['全部部门', '品质', '运营', '快递'];
const trendDept = ref('全部部门');
const trendPlat = ref('全部');
const typeTrend = computed(() => {
  const months = monthsOf(applied.value.range);
  const series = RV_TYPES
    .filter((t) => trendDept.value === '全部部门' || RV_TYPE_DEPT[t] === trendDept.value)
    .map((t) => ({ type: t, color: RV_TYPE_COLORS[t] ?? '#8891a2', points: months.map(() => 0) }));
  for (const r of filteredReviews.value) {
    if (trendPlat.value !== '全部' && r.platform !== trendPlat.value) continue;
    if (r.rating !== '不够好' || !r.types?.length) continue;
    const mi = months.indexOf(`2026-${r.ratedAt.slice(0, 2)}`);
    if (mi < 0) continue;
    for (const t of r.types) {
      const s = series.find((x) => x.type === t);
      if (s) s.points[mi] += 1;
    }
  }
  return { months, series };
});
/* 数据总览指标：监控商品数（去重商品）／评价问题命中次数（差评类型命中总数）／风险品数量（命中问题的去重商品） */
const goodsCount = computed(() => new Set(filteredReviews.value.map((r) => r.productId)).size);
const hitTotal = computed(() => scan.value.typeCards.reduce((s, t) => s + t.count, 0));
const riskGoods = computed(() => new Set(
  filteredReviews.value.filter((r) => r.rating === '不够好' && r.types?.length).map((r) => r.productId),
).size);
/* 评价问题占比来源两字段：问题命中评价（差评且带类型）去重店铺/商品数；下钻某大类时收敛到该大类小类命中 */
const hitScopeReviews = computed(() => {
  const list = filteredReviews.value.filter((r) => r.rating === '不够好' && r.types?.length);
  if (!rvDetailType.value) return list;
  return list.filter((r) => r.types!.some((t) => RV_BIG_TYPE[t] === rvDetailType.value));
});
/* 单卡来源两字段：该问题类型（大类态按大类旗下小类、小类态按该小类）命中评价的去重店铺/商品数 */
const srcOf = (label: string) => {
  const list = hitScopeReviews.value.filter((r) => (rvDetailType.value
    ? (r.types ?? []).includes(label)
    : (r.types ?? []).some((t) => RV_BIG_TYPE[t] === label)));
  return { shops: new Set(list.map((r) => r.shopName)).size, goods: new Set(list.map((r) => r.productId)).size };
};
/* 部门占比：按责任部门归集差评问题命中次数（部门→其负责类型），占比口径＝命中总次数 */
const RV_DEPT_ORDER = ['品质', '运营', '快递'];
const deptCards = computed(() => {
  const m: Record<string, number> = {};
  for (const t of scan.value.typeCards) {
    const d = RV_TYPE_DEPT[t.label];
    if (d) m[d] = (m[d] ?? 0) + t.count;
  }
  const total = hitTotal.value || 1;
  /* 空口径仍全量枚举三部门置 0，保证卡片正常展示而非整块隐藏 */
  if (!hitTotal.value) return RV_DEPT_ORDER.map((d) => ({ label: d, count: 0, color: DEPT_COLOR[d] ?? '#8891a2', pct: '0.0' }));
  return RV_DEPT_ORDER.filter((d) => m[d]).map((d) => ({
    label: d, count: m[d], color: DEPT_COLOR[d] ?? '#8891a2', pct: ((m[d] / total) * 100).toFixed(1),
  }));
});

/* 看板卡片点击：代入对应评价类型条件进入列表（快照当前口径，返回时恢复） */
const gotoList = (type: string) => {
  ovSnap.value = { ...applied.value };
  applied.value = { ...applied.value, type };
  tier.value = 'list';
};
/* 部门卡点击：代入责任部门条件进列表（展示该部门下关联问题小类的评价），列表筛选回显该部门 */
const gotoDept = (dept: string) => {
  ovSnap.value = { ...applied.value };
  applied.value = { ...applied.value, dept };
  draft.value = { ...applied.value };
  tier.value = 'list';
};
const backToBoard = () => {
  applied.value = { ...ovSnap.value };
  tier.value = 'board';
};

/* 查询条件：draft 编辑即生效（无查询/重置按钮） */
const draft = ref(blankF());
watch(draft, (v) => { applied.value = { ...v }; }, { deep: true });

/* 商品详情抽屉：评价列表操作列「详情」打开当前评价关联的商品详情（商品维度），并默认选中当前评价 SKU */
const drawerBox = ref<{ productId: string; series: QcCenterSeries; initTypes: string[]; sku: string; afters: OnlineAfterOrder[]; reviews: OnlineReview[] } | null>(null);
const drawerSessions = ref<ChatSession[]>([]);
/* 系列归属：按商品ID哈希从在线系列中选取（优先同平台且聊天命中充足，保证会话数据非空） */
const ONLINE_SERIES = onlineSeries();
const chatRich = (s: QcCenterSeries) => s.codes.length > 0 && s.chatRiskHits >= 6 * s.platforms.length;
const chatAny = (s: QcCenterSeries) => s.codes.length > 0 && s.chatRiskHits > 0;
const hashOfId = (id: string) => { let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 9973; return h; };
const seriesOfProduct = (id: string, plat: string): QcCenterSeries => {
  const onPlat = plat ? ONLINE_SERIES.filter((s) => (s.platforms as string[]).includes(plat)) : [];
  const pick = (arr: QcCenterSeries[]) => arr[hashOfId(id) % arr.length];
  const onPlatRich = onPlat.filter(chatRich);
  if (onPlatRich.length) return pick(onPlatRich);
  const onPlatChat = onPlat.filter(chatAny);
  if (onPlatChat.length) return pick(onPlatChat);
  const globalRich = ONLINE_SERIES.filter(chatRich);
  if (globalRich.length) return pick(globalRich);
  const list = onPlat.length ? onPlat : ONLINE_SERIES;
  return pick(list);
};
const openDrawer = (r: QcReview, type?: string) => {
  const seed = rvProductOf(r.productId);
  if (!seed) return;
  const series = seriesOfProduct(r.productId, seed.platform);
  const scene = seedScenes(series, r.productId, seed.skus.map((s) => s.name), r.productSku, seed.platform);
  drawerBox.value = { productId: r.productId, series, initTypes: type ? [type] : [], sku: r.productSku, afters: scene.afters, reviews: scene.reviews };
  drawerSessions.value = [...onlineSessionsOf(series), ...scene.sessions];
};
const closeDrawer = () => { drawerBox.value = null; };
const updateSessionHits = (id: string, hits: ChatHit[]) => {
  patchOnlineSession(id, hits);
  drawerSessions.value = drawerSessions.value.map((x) => (x.id === id ? { ...x, hits } : x));
};
/* 抽屉商品上下文：取评价关联商品种子（标题/主图/平台/SKU 与评价行同源），SKU 导轨名称即评价行 SKU，保证默认选中可命中 */
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const drawerProduct = computed(() => {
  if (!drawerBox.value) return null;
  const seed = rvProductOf(drawerBox.value.productId);
  if (!seed) return null;
  const skus = seed.skus.map((s) => s.name);
  const skuThumbs: Record<string, string> = {};
  const skuSales: Record<string, number> = {};
  skus.forEach((name, i) => {
    skuThumbs[name] = GOOD_THUMBS[i % GOOD_THUMBS.length];
    skuSales[name] = rvSkuSales(seed.id, name);
  });
  return { name: seed.title, thumb: seed.thumb, skus, skuThumbs, skuSales, skuCodeCount: skus.length, platform: seed.platform, goodId: seed.id, listedAt: listedAtOf(seed.id) };
});
/* 上架时间：按商品ID哈希确定性回推一个 2026 年内日期（演示口径），供抽屉头部上架时间/天数 */
const listedAtOf = (id: string) => {
  const d = new Date(2026, 0, 1);
  d.setDate(d.getDate() + (hashOfId(id) % 250));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
/* 商品维度三会话语景明细种子（会话/售后/评价）：按全局问题类型逐大类造数（会话命中＋售后单＋好评/差评），
   日期落在近 30 天内、编码取归属系列、平台取系列首平台，保证抽屉明细与占比非空且口径与数据概览一致 */
const daysAgo = (n: number, hh: number, mm: number) => {
  const d = new Date(2026, 7, 28);
  d.setDate(d.getDate() - n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(hh)}:${p(mm)}`;
};
const seedScenes = (series: QcCenterSeries, productId: string, skus: string[], targetSku: string, productPlat: Platform) => {
  const codes = series.codes.map((c) => c.code);
  const plat = productPlat;
  /* 记录 id 决定其在抽屉 SKU 导轨的归属（哈希取模），逐条crafting后缀使其落在默认选中 SKU，保证三场景明细全类型可见 */
  const skuOfKeyLocal = (key: string) => { let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0; return skus[h % skus.length]; };
  const craftSkuKey = (base: string) => {
    if (!skus.length || !targetSku) return base;
    for (let n = 0; n < 400; n++) { const id = n === 0 ? base : `${base}-${n}`; if (skuOfKeyLocal(id) === targetSku) return id; }
    return base;
  };
  const sessions: ChatSession[] = [];
  const afters: OnlineAfterOrder[] = [];
  const reviews: OnlineReview[] = [];
  RV_BIG_TYPES.forEach((big, bi) => {
    const subs = RV_TYPES.filter((t) => RV_BIG_TYPE[t] === big);
    const code = codes[bi % (codes.length || 1)] ?? 'SP-20101';
    let firstSessionId: string | undefined;
    for (let k = 0; k < 2; k++) {
      const sub = subs[k % (subs.length || 1)] ?? big;
      const at = daysAgo(2 + bi * 4 + k * 2, 10 + k * 3, 20 + bi);
      const sid = craftSkuKey(`RV-${productId}-S${bi}-${k}`);
      if (k === 0) firstSessionId = sid;
      sessions.push({
        id: sid, code, platform: plat, startedAt: at, orderId: `SO-RV-${productId}-${bi}${k}`,
        messages: [
          { role: 'buyer', time: at, text: `你好，买的这款${sub}，属于${big}，麻烦处理一下。` },
          { role: 'support', time: at, text: `已登记「${sub}」，为您跟进${big}相关售后。` },
        ],
        hits: [{ type: sub, phrase: sub, sub }],
      });
      afters.push({
        afterNo: craftSkuKey(`RV-${productId}-A${bi}-${k}`), code, orderNo: `SO-RV-A-${productId}-${bi}${k}`, platform: plat,
        type: AFTER_TYPES[k % AFTER_TYPES.length], reason: `${sub}：商品存在${big}，申请${AFTER_TYPES[k % AFTER_TYPES.length]}`,
        amount: 39 + bi * 12 + k * 7, status: AFTER_STATUSES[(bi + k) % AFTER_STATUSES.length], appliedAt: daysAgo(2 + bi * 4 + k * 2, 15, 10 + k),
        ptype: big, psub: sub, csTag: k === 0 ? sub : undefined, sessionId: k === 0 ? firstSessionId : undefined,
      });
    }
    reviews.push({ id: craftSkuKey(`RV-${productId}-R${bi}-b`), code, platform: plat, ptype: big, psub: subs[0], goodsId: productId, content: `${subs[0] ?? big}，体验很差不会再买`, rating: 1 + (bi % 2), reviewedAt: daysAgo(3 + bi * 4, 18, 5) });
    reviews.push({ id: craftSkuKey(`RV-${productId}-R${bi}-g`), code, platform: plat, ptype: REVIEW_MISS_TYPE, goodsId: productId, content: '质量不错做工也细致，和描述一致', rating: 5, reviewedAt: daysAgo(4 + bi * 4, 20, 15) });
  });
  return { sessions, afters, reviews };
};

/* 列表：按评价时间倒序 */
const listRowsCalc = computed(() => [...filteredReviews.value].sort((a, b) => (a.ratedAt < b.ratedAt ? 1 : -1)));
/* 模拟接口读取：评价明细行经 /qc/review/list 返回（入参＝生效筛选），界面只消费响应 data */
const listRows = ref<QcReview[]>([]);
const loading = ref(false);
watch(listRowsCalc, async (v) => {
  loading.value = true;
  const res = await qcGet('/qc/review/list', applied.value, () => v);
  listRows.value = res.data;
  loading.value = false;
}, { immediate: true });

/* 分页：项目统一 ib-pagination 模式，默认 20 条/页（行源＝接口返回的评价明细行） */
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
</script>

<template>
  <div class="qc-ss-page qc-rv-page">
    <!-- 一级页面：评价看板；照搬「数据概览」白面板语言 —— 总览指标带 / 问题小类占比（卡+环形）/ 部门占比 / 趋势+TOP -->
    <div v-if="tier === 'board'" class="qc-rv-ov">
      <!-- 面板一：评价数据总览 + 问题小类占比 + 问题涉及部门占比 -->
      <div class="qc-ov-panel">
        <div class="qc-sec-head">
          <div class="qc-sec-title">评价数据总览</div>
          <div class="qc-rv-ov-tools">
            <span class="qc-rv-ov-lb">平台</span>
            <BubbleSelect class-name="sg-select" :value="applied.platform" :options="PLATFORM_OPTIONS" @change="(v: string) => (applied.platform = v)" />
            <span class="qc-rv-ov-lb">时间</span>
            <QcDateRangePicker :custom="applied.range" :on-change="(d: DateRange) => (applied.range = d)" :min="RANGE_FULL.start" :max="RANGE_FULL.end" />
            <span class="qc-rv-ov-lb">责任部门</span>
            <BubbleSelect class-name="sg-select" :value="applied.dept" :options="RV_DEPTS" @change="(v: string) => (applied.dept = v)" />
          </div>
        </div>
        <div class="qc-flat-grid cols-5">
          <div class="flat-card" title="当前筛选下涉及的去重商品数">
            <div class="k">监控商品数</div>
            <div class="v">{{ goodsCount.toLocaleString() }}</div>
          </div>
          <div class="flat-card clickable" title="点击查看全部评价" @click="gotoList('全部')">
            <div class="k">评价订单数</div>
            <div class="v">{{ scan.total.toLocaleString() }}</div>
          </div>
          <div class="flat-card clickable" title="差评 = 1-2 星评价 · 点击查看差评" @click="gotoList('差评')">
            <div class="k">差评订单数</div>
            <div class="v">{{ scan.bad.toLocaleString() }}<span class="dept-pct">{{ pctOf(scan.bad) }}</span></div>
          </div>
          <div class="flat-card" title="差评命中问题类型的总次数 · 一条差评可涉及多个类型">
            <div class="k">评价问题命中次数</div>
            <div class="v">{{ hitTotal.toLocaleString() }}</div>
          </div>
          <div class="flat-card" title="命中评价问题的去重商品数">
            <div class="k">风险品数量</div>
            <div class="v">{{ riskGoods.toLocaleString() }}<span class="dept-pct">{{ goodsCount ? `${((riskGoods / goodsCount) * 100).toFixed(1)}%` : '0.0%' }}</span></div>
          </div>
        </div>

        <!-- 空口径（时间范围等无命中）不隐藏卡片：占比/部门卡全量枚举置 0 正常展示 -->
        <div class="qc-ov-divider" />
        <div class="qc-sec-head">
          <div class="qc-sec-title">
            <template v-if="rvDetailType">
              <button type="button" class="qc-detail-back" title="返回全部大类" @click="rvDetailType = null">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <b class="qc-detail-name">{{ rvDetailType }}</b>
            </template>
            <template v-else>评价问题占比</template>
          </div>
        </div>
        <div class="qc-share-row">
          <div class="qc-flat-grid cols-3 qc-share-cards">
            <div
              v-for="t in displayItems"
              :key="t.label"
              class="flat-card type-card"
              :title="rvDetailType ? `查看「${t.label}」相关评价` : `查看「${t.label}」问题小类`"
              @click="rvDetailType ? gotoList(t.label) : (rvDetailType = t.label)"
            >
              <button
                v-if="!rvDetailType"
                type="button"
                class="qc-card-detail"
                title="选中该问题类型进入列表"
                @click.stop="gotoList(t.label)"
              >明细</button>
              <div class="k"><i class="type-dot" :style="{ background: t.color }" />{{ t.label }}</div>
              <div class="v">{{ t.value }}<span class="dept-pct">{{ pieTotal ? `${((t.value / pieTotal) * 100).toFixed(1)}%` : '0.0%' }}</span></div>
              <div class="qc-rv-src" title="该问题类型命中评价涉及的去重店铺数 / 商品数（这些问题由哪些店的哪些品产生）">
                <span>关联店铺数：<b>{{ srcOf(t.label).shops }}</b></span>
                <span class="sep">/</span>
                <span>关联商品数：<b>{{ srcOf(t.label).goods }}</b></span>
              </div>
            </div>
          </div>
          <div class="qc-share-pie">
            <PieChart :items="pieItems" total-label="命中次数" show-value value-unit="次" :pickable="!rvDetailType" :on-pick="(l: string) => (rvDetailType = l)" />
          </div>
        </div>

        <div class="qc-ov-divider" />
        <div class="qc-sec-head"><div class="qc-sec-title">问题涉及部门占比</div></div>
        <div class="qc-flat-grid cols-3">
          <div
            v-for="d in deptCards"
            :key="d.label"
            class="flat-card dept-card clickable"
            :title="`查看「${d.label}」部门下关联问题小类的评价`"
            @click="gotoDept(d.label)"
          >
            <div class="k"><i class="type-dot" :style="{ background: d.color }" />{{ d.label }}</div>
            <div class="v">{{ d.count }}<span class="dept-pct">{{ d.pct }}%</span></div>
          </div>
        </div>
      </div>

      <!-- 面板二：评价问题趋势（支持平台/责任部门筛选）+ TOP 店铺评价排行 -->
      <div v-if="scan.total" class="qc-ov-panel qc-trend-ov">
        <div class="qc-sec-head">
          <div class="qc-sec-title">评价问题趋势与 TOP 店铺</div>
          <div class="qc-rv-ov-tools">
            <span class="qc-rv-ov-lb">平台</span>
            <BubbleSelect class-name="sg-select" :value="trendPlat" :options="PLATFORM_OPTIONS" @change="(v: string) => (trendPlat = v)" />
            <span class="qc-rv-ov-lb">责任部门</span>
            <BubbleSelect class-name="sg-select" :value="trendDept" :options="RV_DEPTS" @change="(v: string) => (trendDept = v)" />
          </div>
        </div>
        <div class="qc-trend-row">
          <div class="qc-trend-panel">
            <ProblemTrendChart :labels="typeTrend.months" :series="typeTrend.series" />
          </div>
          <div class="qc-panel">
            <div class="p-title top-head">TOP 店铺评价</div>
            <div
              v-for="(s, i) in shopRank"
              :key="s.shop"
              class="top-row"
              :title="`${s.shop}：${s.count.toLocaleString()} 条问题命中评价 · 点击查看该店铺评价`"
              @click="gotoShop(s.shop)"
            >
              <span class="top-rank" :class="i < 3 ? 'hot' : ''">{{ i + 1 }}</span>
              <div class="top-info">
                <div class="n">{{ s.shop }}</div>
                <div class="m">问题命中评价 {{ s.count.toLocaleString() }} 条</div>
              </div>
              <span class="rate bad">{{ s.count.toLocaleString() }}</span>
            </div>
            <div v-if="!shopRank.length" class="qc-rv-board-empty">当前筛选下暂无问题命中评价</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 二级页面：扁平评价明细列表（店铺信息→商品→SKU→用户→时间→命中问题类型→内容） -->
    <section v-if="tier === 'list'" class="qc-ss-sec">
      <!-- 查询条件：与监控列表筛选区同结构（sg-filter + sg-grid + sg-field） -->
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
            <label>商品ID</label>
            <input v-model="draft.productId" type="text" class="sg-input" placeholder="输入商品ID搜索">
          </div>
          <div class="sg-field">
            <label>命中问题类型</label>
            <QcTypeShuttle
              class-name="sg-select"
              :ptype="hitPtype"
              :sub="hitSub"
              :subs-of="rvSubsOf"
              @change="(t: string | null, s: string | null) => (draft.hitType = s ?? t ?? '全部')"
            />
          </div>
          <div class="sg-field">
            <label>评价类型</label>
            <BubbleSelect class-name="sg-select" :value="draft.type" :options="['全部', '好评', '差评', ...RV_BIG_TYPES]" @change="(v: string) => (draft.type = v)" />
          </div>
          <div class="sg-field">
            <label>责任部门</label>
            <BubbleSelect class-name="sg-select" :value="draft.dept" :options="RV_DEPTS" @change="(v: string) => (draft.dept = v)" />
          </div>
          <div class="sg-field">
            <label>时间区间</label>
            <QcDateRangePicker :custom="draft.range" :on-change="(d: DateRange) => (draft.range = d)" :min="RANGE_FULL.start" :max="RANGE_FULL.end" />
          </div>
        </div>
      </div>
      <table class="qc-rv-table" :class="{ 'is-loading': loading }">
        <thead>
          <tr>
            <th>商品</th>
            <th>店铺信息</th>
            <th>SKU</th>
            <th>用户 / 评价时间</th>
            <th>评价内容</th>
            <th class="qc-rv-hits-th">命中问题类型</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in pageRows" :key="r.id">
            <td>
              <div class="qc-sg-prod">
                <img class="qc-sg-prod-thumb" :src="r.productThumb || '/products/main.png'" :alt="r.productTitle">
                <div class="qc-sg-prod-info">
                  <div class="qc-sg-prod-name" :title="r.productTitle">{{ r.productTitle }}</div>
                  <div class="qc-sg-prod-meta"><span class="qc-sg-prod-lb">商品ID：</span>{{ r.productId }}</div>
                  <div class="qc-sg-prod-meta"><span class="qc-sg-prod-lb">销量：</span>{{ r.productSales.toLocaleString() }}</div>
                </div>
              </div>
            </td>
            <!-- 店铺信息：平台官方图标＋店铺名称主行 + 店铺ID 灰行（原所属平台/店铺两列合并单列） -->
            <td class="qc-rv-shop">
              <div class="qc-rv-shop-name"><PlatLogo :platform="r.platform" />{{ r.shopName }}</div>
              <div class="qc-rv-shop-id mono">店铺ID：{{ r.shopId }}</div>
            </td>
            <!-- SKU：主图 + SKU 名称 + 销量（复合列，同商品列主图语言） -->
            <td class="qc-rv-sku">
              <div class="qc-sku-cell">
                <img class="qc-sku-thumb" :src="r.skuThumb" :alt="r.productSku">
                <div class="qc-sku-info">
                  <div class="qc-sku-name" :title="r.productSku">{{ r.productSku }}</div>
                  <span class="qc-sku-sale">销量 {{ r.skuSales.toLocaleString() }}</span>
                </div>
              </div>
            </td>
            <td class="qc-rv-user-time">
              <div class="qc-rv-user">{{ r.userName }}</div>
              <div class="qc-rv-time mono">{{ r.ratedAt }}</div>
            </td>
            <!-- 评价内容：星级主行 + 正文 + 附图脚行（原星级/评价内容两列合并单列） -->
            <td class="qc-rv-content">
              <span class="qc-rv-stars"><i v-for="n in 5" :key="n" :class="{ on: n <= r.stars }">★</i></span>
              <div class="qc-rv-ctext" :title="r.content">{{ r.content }}</div>
              <div v-if="r.images.length" class="qc-rv-cfoot">
                <span v-for="(img, i) in r.images" :key="i" class="qc-rv-cimg"><img :src="img" alt="评价图片"></span>
              </div>
            </td>
            <!-- 命中问题类型：独立列，芯片同全局 .tag 语言（类型色 tint 底 + 同色文字） -->
            <td class="qc-rv-hits">
              <div class="prob-tags">
                <span
                  v-for="t in r.types"
                  :key="t"
                  class="tag"
                  :style="{ background: `${RV_TYPE_COLORS[t] ?? '#8891a2'}1a`, color: RV_TYPE_COLORS[t] ?? '#8891a2' }"
                >{{ t }}</span>
              </div>
            </td>
            <!-- 操作列：商品详情按钮，点击打开商品维度抽屉 -->
            <td class="qc-rv-op">
              <div class="qc-op-col">
                <a @click="openDrawer(r)">详情</a>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !listRows.length">
            <td colspan="7">
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

    <!-- 商品详情抽屉：复用系列编码详情抽屉（商品维度），入口为评价列表操作列「详情」 -->
    <QcSeriesDrawer
      v-if="drawerBox"
      :key="`${drawerBox.productId}-${drawerBox.sku}-${drawerBox.initTypes.join(',')}`"
      :series="drawerBox.series"
      :product="drawerProduct"
      :initial-types="drawerBox.initTypes"
      :initial-sku="drawerBox.sku"
      :on-close="closeDrawer"
      :all-sessions="drawerSessions"
      :all-after-orders="drawerBox.afters"
      :all-reviews="drawerBox.reviews"
      :on-update-hits="updateSessionHits"
      :online="true"
    />
  </div>
</template>
