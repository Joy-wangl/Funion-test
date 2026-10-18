<script setup lang="ts">
/* ---------- 监控列表行（展开各平台数据 + 责任部门编辑气泡） ---------- */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import { codeMarkPlatforms, codeOwnMarkPlatforms, isHitCanceled, onlineChatBrief, onlineOwnerOf, onlineReviewBrief, onlineSessionsOf, seriesMarkPlatforms, seriesOptOf, seriesProblemCodes, setSeriesProblemMarks, type ProblemMark } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import type { Platform, PlatformStat } from './data';
import PlatLogo from './PlatLogo.vue';
import PlatformMatrix from './PlatformMatrix.vue';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

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
  /** 品控-线上：点击操作列「关联ID」，按系列下商品编码跳转店铺商品列表查询 */
  onCodes?: (codes: string[]) => void;
  /** 品控-线上：点击操作列「优化任务」，按该系列发起编码优化待办 */
  onOpt?: () => void;
  /** 品控-线上：优化中行点击操作列「查看优化任务」，打开关联待办详情抽屉 */
  onViewOpt?: () => void;
}>();

const codeTab = ref<string>('all');

/* 系列级优化任务态：系列下任一商品优化中＝挂「优化任务」标签＋操作列「查看优化任务」；无标签＝「创建优化任务」 */
const optInfo = computed(() => seriesOptOf(props.series));

const selCode = computed(() => (codeTab.value === 'all' ? null : props.series.codes.find((c) => c.code === codeTab.value) ?? null));
const owner = computed(() => onlineOwnerOf(props.series.seriesCode));
/* 问题编码重判：已取消命中的编码不再计入，人工标记问题商品的编码无命中也计入；
   线上壳首列标识 / 命中聚合 / 矩阵命中同源取该口径（运维壳无处理入口，保持 qcCenterData 原口径） */
const liveCodes = computed(() => (props.online ? props.series.codes.filter((c) => !isHitCanceled(c.code)) : props.series.codes));
const hasProblemCode = computed(() => (props.online ? seriesProblemCodes(props.series).length > 0 : seriesHasProblemCode(props.series)));

/* ---------- 问题处理人工标记：标记生效平台在列表内可视（首列标记平台 + 展开矩阵平台行标识） ----------
   整系列标记取其生效平台；指定商品编码标记按编码归并；限定平台时仅这些平台计入问题编码 */
const platScopeTxt = (p: Platform[] | 'all') => (p === 'all' ? '全部平台' : `仅 ${p.join('/')} 生效`);
const markScopes = computed<Platform[] | 'all' | null>(() => {
  if (!props.online) return null;
  const sc = props.series.seriesCode;
  const list: (Platform[] | 'all')[] = [];
  const s = seriesMarkPlatforms(sc);
  if (s !== null) list.push(s);
  for (const c of liveCodes.value) {
    const p = codeOwnMarkPlatforms(sc, c.code);
    if (p !== null) list.push(p);
  }
  if (!list.length) return null;
  if (list.some((p) => p === 'all')) return 'all';
  return [...new Set(list.flatMap((p) => p as Platform[]))];
});
/* 展开矩阵标记口径随商品编码 tab 收敛：全部=系列下各标记归并，选中编码=该编码（含整系列）标记 */
const tabMarkScopes = computed<Platform[] | 'all' | null>(() => {
  if (!props.online) return null;
  return selCode.value ? codeMarkPlatforms(props.series.seriesCode, selCode.value.code) : markScopes.value;
});
/* 标记明细悬浮说明：粒度 + 生效平台逐条列出 */
const markDesc = computed(() => {
  const sc = props.series.seriesCode;
  const parts: string[] = [];
  const s = seriesMarkPlatforms(sc);
  if (s !== null) parts.push(`整系列标记：${platScopeTxt(s)}`);
  for (const c of liveCodes.value) {
    const p = codeOwnMarkPlatforms(sc, c.code);
    if (p !== null) parts.push(`${c.code}：${platScopeTxt(p)}`);
  }
  return parts.join('；');
});
/* 首列标记平台芯片：全平台标记归并为「全部平台」一枚，限定平台逐枚展示 */
const markChips = computed<string[]>(() => {
  const m = markScopes.value;
  if (!m) return [];
  return m === 'all' ? ['全部平台'] : [...m];
});
/* 售后率口径与售后列表一致：售后单 / 订单量 */
const afterRate = computed(() => (props.series.orders ? props.series.afterSales / props.series.orders : 0));
/* 聊天数据三口径（会话总数/风险会话/风险率），与抽屉会话同源 */
const chatBrief = computed(() => onlineChatBrief(props.series));
/* 评价数据三口径（评价数/差评数/差评占比）：系列编码关联商品ID的评价，与抽屉评价场景同源 */
const reviewBrief = computed(() => onlineReviewBrief(props.series));
/* 上架平台芯片默认只展示前 3 个，超出折叠为「+N」灰芯片（悬浮气泡展示剩余平台） */
const PLAT_CHIP_MAX = 3;
const shownPlats = computed(() => props.series.platforms.slice(0, PLAT_CHIP_MAX));
const extraPlats = computed(() => props.series.platforms.slice(PLAT_CHIP_MAX));
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
/* 线上壳矩阵评价数据与行内「评价数据」同口径：各平台评价数/差评数按订单占比最大余数法精确拆分，
   各平台合计恒等于行级评价数/差评数；差评占比=该平台差评数/评价数 */
const reviewMatrix = computed(() => {
  const stats = selCode.value ? selCode.value.platforms : props.series.merged;
  const scopeOrders = stats.reduce((s, p) => s + p.orders, 0) || 1;
  const scale = (v: number) => (selCode.value ? Math.round((v * scopeOrders) / (props.series.orders || 1)) : v);
  const split = (total: number) => {
    const raw = stats.map((p) => (total * p.orders) / scopeOrders);
    const share = raw.map((v) => Math.floor(v));
    let rem = total - share.reduce((s, v) => s + v, 0);
    const byFrac = raw.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
    for (let k = 0; k < rem; k++) share[byFrac[k % byFrac.length][1]] += 1;
    return share;
  };
  const totals = split(scale(reviewBrief.value.total));
  const bads = split(scale(reviewBrief.value.bad));
  const out: Partial<Record<Platform, { total: number; bad: number }>> = {};
  stats.forEach((p, i) => { out[p.platform] = { total: totals[i], bad: bads[i] }; });
  return out;
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
/* 命中问题类型：按数量降序最多展示三行，超出折叠为「+N」灰芯片，悬浮气泡展示剩余（同上架平台 +N 口径）；
   行数按实际换行测量：末行留一位给 +N（+N 窄于任何类型芯片，留位必放得下） */
const HITS_MAX_ROWS = 3;
const hitsWrap = ref<HTMLElement | null>(null);
const hitsLimit = ref<number | null>(null);
const visibleHits = computed(() => (hitsLimit.value == null ? shownHits.value : shownHits.value.slice(0, hitsLimit.value)));
const extraHits = computed(() => (hitsLimit.value == null ? [] : shownHits.value.slice(hitsLimit.value)));
const measureHitsRows = () => {
  const el = hitsWrap.value;
  if (!el || hitsLimit.value != null) return;
  const chips = [...el.children] as HTMLElement[];
  const tops = [...new Set(chips.map((c) => c.offsetTop))].sort((a, b) => a - b);
  if (tops.length <= HITS_MAX_ROWS) return;
  const inRows = chips.filter((c) => c.offsetTop <= tops[HITS_MAX_ROWS - 1]).length;
  hitsLimit.value = Math.max(inRows - 1, 1);
};
const resetHitsMeasure = () => { hitsLimit.value = null; nextTick(measureHitsRows); };
watch(shownHits, resetHitsMeasure, { immediate: true });
onMounted(() => window.addEventListener('resize', resetHitsMeasure));
onBeforeUnmount(() => window.removeEventListener('resize', resetHitsMeasure));
const shownDepts = computed(() => deptsOfTypes(shownHits.value.map((h) => h.type)));
/* 合并列口径：涉及部门标签与责任部门同列呈现，责任部门标签带星标记；
   条件查询收敛后若责任部门不在已展示标签中，则追加到选中部门标签之后 */
const dutyShown = computed(() => (props.hasOverride || props.series.problemHits.length ? props.duty : ''));
const mergedDepts = computed(() => {
  const list = [...shownDepts.value];
  if (dutyShown.value && !list.includes(dutyShown.value)) list.push(dutyShown.value);
  return list;
});
const dutyTitle = computed(() => (props.hasOverride ? '责任部门（已手动绑定）' : '责任部门（问题数最多部门）'));
const hits = computed(() => {
  const all = platformProblemHits(selCode.value ? (isHitCanceled(selCode.value.code) ? [] : [selCode.value]) : liveCodes.value);
  if (!props.scopeDept) return all;
  const out: Partial<Record<Platform, [string, number][]>> = {};
  (Object.keys(all) as Platform[]).forEach((p) => {
    out[p] = (all[p] ?? []).filter(([t]) => PROBLEM_DEPT[t] === props.scopeDept);
  });
  return out;
});

/* ---------- 问题处理：责任部门归属 + 命中处理（标记问题编码）融合到同一弹窗 ----------
   标记粒度二选一（互斥）：整系列 / 指定商品编码；点选平台即标记，全不选＝取消标记，
   限定平台后该编码仅在所选平台内为问题编码；确认后一次性生效，首列问题编码标识与筛选同源重判 */
const actOpen = ref(false);
const dutySel = ref('');
const dutyInit = ref('');
/* 责任部门下拉：首项自动归属（括号内点明「问题数最多」口径＋当前归属部门），其余为可选部门 */
const dutyOptions = computed(() => [
  { value: '', label: `自动归属${!props.hasOverride && props.duty ? `（问题数最多·${props.duty}）` : ''}` },
  ...QC_DEPTS.map((d) => ({ value: d, label: d })),
]);
type MarkScope = 'all' | Platform[];
type MarkMode = 'series' | 'code';
const MODE_OPTS = [{ value: 'series', label: '整系列' }, { value: 'code', label: '指定商品编码' }];
const scopePlats = (s: MarkScope): Platform[] => (s === 'all' ? [] : s);
const scopeOn = (s: MarkScope) => s === 'all' || s.length > 0;
const scopeAllOn = (s: MarkScope) => s === 'all';
const scopePlatOn = (s: MarkScope, p: Platform) => Array.isArray(s) && s.includes(p);
/* 半选态（仅展示）：非全选且已选部分平台时「全部平台」全选位显示半选勾，点选语义不变 */
const scopeSomeOn = (s: MarkScope, plats: Platform[]) => !scopeAllOn(s) && plats.some((p) => scopePlatOn(s, p));
/* 点「全部」＝全平台标记，再点＝取消；点具体平台＝收窄到该平台（原为全部时即从该平台起） */
const toggleScopeAll = (s: MarkScope): MarkScope => (s === 'all' ? [] : 'all');
const flipScopePlat = (s: MarkScope, p: Platform): MarkScope => {
  if (s === 'all') return [p];
  return s.includes(p) ? s.filter((x) => x !== p) : [...s, p];
};
const toScope = (p: Platform[] | 'all' | null): MarkScope => (p === null ? [] : p === 'all' ? 'all' : [...p]);

const markMode = ref<MarkMode>('code');
const seriesScope = ref<MarkScope>([]);
const codeScope = ref<Record<string, MarkScope>>({});
const marksInit = ref<ProblemMark[]>([]);
const openAct = () => {
  dutySel.value = props.hasOverride ? props.duty : '';
  dutyInit.value = dutySel.value;
  const s = toScope(seriesMarkPlatforms(props.series.seriesCode));
  markMode.value = scopeOn(s) ? 'series' : 'code';
  seriesScope.value = s;
  const sc: Record<string, MarkScope> = {};
  liveCodes.value.forEach((c) => { sc[c.code] = toScope(codeOwnMarkPlatforms(props.series.seriesCode, c.code)); });
  codeScope.value = sc;
  marksInit.value = buildMarks();
  actOpen.value = true;
};
const scopeOf = (code: string) => codeScope.value[code] ?? [];
const setCodeScope = (code: string, s: MarkScope) => { codeScope.value = { ...codeScope.value, [code]: s }; };
/* 编码级标记只在该编码在售平台内可选 */
const codePlats = (c: QcCenterCode): Platform[] => c.platforms.map((p) => p.platform);
const buildMarks = (): ProblemMark[] => {
  const sc = props.series.seriesCode;
  if (markMode.value === 'series') {
    return scopeOn(seriesScope.value) ? [{ scope: 'series', seriesCode: sc, platforms: scopePlats(seriesScope.value) }] : [];
  }
  return liveCodes.value
    .filter((c) => scopeOn(scopeOf(c.code)))
    .map((c) => ({ scope: 'code' as const, seriesCode: sc, code: c.code, platforms: scopePlats(scopeOf(c.code)) }));
};
const sameMarks = (a: ProblemMark[], b: ProblemMark[]) => JSON.stringify(a) === JSON.stringify(b);
const markChanged = computed(() => !sameMarks(buildMarks(), marksInit.value));
const actDirty = computed(() => dutySel.value !== dutyInit.value || markChanged.value);
const scopeTxt = (s: MarkScope, base: string) => (Array.isArray(s) && s.length ? `${base}（仅${s.join('/')}生效）` : base);
const doAct = () => {
  const marks = buildMarks();
  const changed = markChanged.value;
  const parts: string[] = [];
  if (changed) {
    setSeriesProblemMarks(props.series.seriesCode, marks);
    if (markMode.value === 'series') {
      parts.push(scopeOn(seriesScope.value)
        ? scopeTxt(seriesScope.value, `已将「${props.series.name}」整系列标记为问题编码`)
        : '已取消整系列问题编码标记');
    } else if (marks.length) {
      const scoped = marks.filter((m) => m.platforms.length > 0).length;
      parts.push(`已标记 ${marks.length} 个商品编码为问题编码`);
      if (scoped) parts.push(`其中 ${scoped} 个限定平台内生效`);
    } else {
      parts.push('已取消全部商品编码的问题编码标记');
    }
  }
  if (dutySel.value !== dutyInit.value) {
    props.onDuty(props.series.seriesCode, dutySel.value || null);
    parts.push(dutySel.value ? `责任部门已改为「${dutySel.value}」` : '责任部门已恢复自动归属');
  }
  actOpen.value = false;
  if (changed) {
    const left = seriesProblemCodes(props.series).length;
    parts.push(left ? `系列下仍有 ${left} 个问题商品编码` : '系列下已无问题商品编码，问题编码标识已移除');
  }
  pushToast(parts.join('，'));
};
/* 关联ID：系列下全部商品编码，点击跳店铺分监控·店铺商品并按编码查询 */
const onCodesJump = () => props.onCodes?.(props.series.codes.map((c) => c.code));
/* 矩阵行操作列「关联ID」：随商品编码 tab 收敛——选中某编码按该编码查询，全部 tab 同系列级口径（系列下全部编码） */
const onCodesJumpTab = () => props.onCodes?.(selCode.value ? [selCode.value.code] : props.series.codes.map((c) => c.code));

/* 标签合并口径：系列维度聚合；展开区按「该平台在售编码」聚合后并入平台矩阵列 */
const tag = computed(() => seriesTagBrief(props.series.seriesCode));
const platTagBrief = (pl: Platform): TagBrief | null => {
  const scope = selCode.value ? [selCode.value.code] : props.series.codes.map((c) => c.code);
  const codes = QC2_CODES.filter((c) => scope.includes(c.code) && c.platforms.includes(pl));
  return codes.length ? briefOf(codes) : null;
};

/* 操作列动作平铺：查看详情 / 趋势图 / 问题处理（责任部门 + 命中处理弹窗）/ 关联ID（跳店铺商品查询） */
</script>

<template>
  <tr>
    <td>
      <span class="arrow" :class="{ open }" style="cursor: pointer; display: inline-flex" @click="props.onToggle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </span>
    </td>
    <td class="col-name">
      <!-- 系列编码＝商品系列简称（袜子、冬季手套等）；字母+数字为商品编码，不在此展示 -->
      <div>{{ series.name }}</div>
      <div v-if="online">关联ID数：{{ series.codes.length }}</div>
      <!-- 问题编码标识：仅系列存在问题编码命中时在关联ID数下方示红芯片，无问题不占行（用户定案 2026-10-01） -->
      <div v-if="online && hasProblemCode">
        <span class="tag rv red">问题编码</span>
      </div>
      <!-- 优化任务标签：系列下任一商品优化中时挂橙标签（同店铺商品口径），title 悬浮优化周期 -->
      <div v-if="online && optInfo?.status === '优化中'">
        <span class="qc-sg-opttag" :title="`优化任务周期 ${optInfo.task.start} ~ ${optInfo.task.openEnd ? '至今（达到指标后结束）' : optInfo.task.end}`"><i></i>优化任务</span>
      </div>
    </td>
    <td v-if="online" class="col-name qc-order-data">
      <div><span class="qc-cd-lb">订单总数：</span><span class="qc-cd-v">{{ series.orders.toLocaleString() }}</span></div>
      <div><span class="qc-cd-lb">售后订单：</span><span class="qc-cd-v">{{ series.afterSales.toLocaleString() }}</span></div>
      <div><span class="qc-cd-lb">售后率：</span><span class="qc-cd-v"><span class="rate" :class="afterRateCls(afterRate)">{{ pct(afterRate) }}</span></span></div>
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
    <td v-if="online" class="col-name qc-review-data">
      <div><span class="qc-cd-lb">评价数：</span><span class="qc-cd-v">{{ reviewBrief.total.toLocaleString() }}</span></div>
      <div><span class="qc-cd-lb">差评数：</span><span class="qc-cd-v"><span :class="reviewBrief.bad ? 'rate bad' : ''">{{ reviewBrief.bad }}</span></span></div>
      <div><span class="qc-cd-lb">差评占比：</span><span class="qc-cd-v"><span class="rate" :class="afterRateCls(reviewBrief.rate)">{{ pct(reviewBrief.rate) }}</span></span></div>
    </td>
    <td>
      <div class="plat-chips">
        <span v-for="p in shownPlats" :key="p" class="plat-chip">
          <PlatLogo :platform="p" />
          {{ p }}
        </span>
        <span v-if="extraPlats.length" class="tag prob-more plat-more">
          +{{ extraPlats.length }}
          <span class="prob-bubble">
            <span v-for="p in extraPlats" :key="p" class="plat-chip">
              <PlatLogo :platform="p" />
              {{ p }}
            </span>
          </span>
        </span>
      </div>
    </td>
    <td>
      <div v-if="shownHits.length" ref="hitsWrap" class="prob-tags">
        <span
          v-for="h in visibleHits"
          :key="h.type"
          class="tag"
          :class="{ pick: !!props.onPickType }"
          :title="props.onPickType ? `查看「${h.type}」命中详情` : undefined"
          :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
          @click="props.onPickType?.(h.type)"
        >
          {{ h.type }} {{ h.count }}
        </span>
        <span v-if="extraHits.length" class="tag prob-more hit-more">
          +{{ extraHits.length }}
          <span class="prob-bubble">
            <span
              v-for="h in extraHits"
              :key="h.type"
              class="tag"
              :style="{ background: `${PROBLEM_TYPE_COLOR[h.type] || '#4f7cff'}1a`, color: PROBLEM_TYPE_COLOR[h.type] || '#4f7cff' }"
            >{{ h.type }} {{ h.count }}</span>
          </span>
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
      <div v-if="mergedDepts.length" class="prob-tags">
        <span
          v-for="d in mergedDepts"
          :key="d"
          class="tag"
          :class="{ pick: !!props.onPickDept, 'duty-tag': d === dutyShown }"
          :title="d === dutyShown ? dutyTitle : (props.onPickDept ? `查看「${d}」关联问题命中详情` : undefined)"
          @click="props.onPickDept?.(d)"
        >
          <svg v-if="d === dutyShown" class="duty-star" width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-label="责任部门"><path d="M12 2.6l2.8 6 6.6.7-4.9 4.4 1.4 6.5-5.9-3.4-5.9 3.4 1.4-6.5L2.6 9.3l6.6-.7z" /></svg>{{ d }}
        </span>
      </div>
      <!-- 无任何命中且未手动绑定时不给默认责任部门，无命中芯片与常规灰标签同款同交互 -->
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
        <a @click="openAct">问题处理</a>
        <a v-if="online" :title="`按系列下 ${series.codes.length} 个关联ID 查询对应商品`" @click="onCodesJump">关联ID</a>
        <a v-if="online && optInfo?.status === '优化中' && props.onViewOpt" title="查看优化任务关联待办的发起人与处理人" @click="props.onViewOpt">查看优化任务</a>
        <a v-else-if="online && props.onOpt" title="发起编码优化任务" @click="props.onOpt">创建优化任务</a>
      </div>
    </td>
  </tr>
  <tr v-if="open" class="expand-row">
    <td :colspan="online ? 10 : 13">
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
        :rate-col="online ? 'after' : 'refund'"
        :grouped="online"
        :problem-hits="hits"
        :mark-scopes="tabMarkScopes"
        :duty-dept="dutyShown"
        :on-pick-dept="props.onPickDept"
        :chat-totals="online ? chatMatrix.totals : undefined"
        :reviews="online ? reviewMatrix : undefined"
        :show-last-order="false"
        :tag-brief="online ? undefined : platTagBrief"
        :on-chat="(p: Platform) => props.onChat(
          selCode ? [selCode] : series.codes,
          selCode ? selCode.platforms.map((x) => x.platform) : series.platforms,
          p,
        )"
        :on-trend="(st: PlatformStat) => props.onTrendStat(st, selCode ? selCode.code : series.seriesCode, series.seriesCode)"
        :on-codes="online && props.onCodes ? onCodesJumpTab : undefined"
      />
    </td>
  </tr>
  <Teleport to=".qc-center-page">
    <Modal
      v-if="actOpen"
      title="问题处理"
      :sub="`系列编码「${series.name}」· 商品编码 ${series.codes.length} 个`"
      size="lg"
      @close="actOpen = false"
    >
      <div class="qc-act" :class="{ 'qc-act-on': online }">
        <section class="qc-act-sec">
          <div class="qc-act-hd">
            <span class="qc-act-t">责任部门</span>
            <BubbleSelect class-name="qc-act-sel" :value="dutySel" :options="dutyOptions" @change="(v: string) => (dutySel = v)" />
          </div>
        </section>
        <section v-if="online" class="qc-act-sec">
          <div class="qc-act-hd">
            <span class="qc-act-t">命中处理</span>
            <span class="qc-act-mode">
              <span class="qc-act-mode-lb">标记粒度</span>
              <BubbleSelect class-name="qc-act-sel sm" :value="markMode" :options="MODE_OPTS" @change="(v: string) => (markMode = v as MarkMode)" />
            </span>
          </div>
          <div v-if="markMode === 'series'" class="qc-act-series">
            <div class="qc-act-series-t">
              {{ series.name }}
              <span class="qc-act-state" :class="scopeOn(seriesScope) ? 'red' : ''">{{ scopeOn(seriesScope) ? '已标记' : '未标记' }}</span>
              <span class="qc-act-series-sub">系列编码级 · 对旗下 {{ liveCodes.length }} 个商品编码统一生效</span>
            </div>
            <div class="qc-act-plats">
              <span
                class="qc-act-plat qc-act-all"
                :class="{ on: scopeAllOn(seriesScope), part: scopeSomeOn(seriesScope, series.platforms) }"
                @click="seriesScope = toggleScopeAll(seriesScope)"
              ><i class="qc-act-ck ck"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l4.8 4.8L19.5 7" /></svg></i><i class="qc-act-ck dk"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M5 12h14" /></svg></i>全部平台</span>
              <i class="qc-act-vdiv"></i>
              <span
                v-for="p in series.platforms"
                :key="p"
                class="qc-act-plat"
                :class="{ on: scopePlatOn(seriesScope, p) }"
                @click="seriesScope = flipScopePlat(seriesScope, p)"
              ><i class="qc-act-ck ck"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l4.8 4.8L19.5 7" /></svg></i>{{ p }}</span>
            </div>
          </div>
          <table v-else class="qc-act-tb">
            <thead>
              <tr>
                <th style="width: 220px">商品编码</th>
                <th>问题命中平台</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in liveCodes" :key="c.code">
                <td>
                  <div class="qc-act-code">{{ c.code }}</div>
                  <div class="qc-act-name">{{ series.name }}</div>
                </td>
                <td>
                  <div class="qc-act-plats">
                    <span class="qc-act-state" :class="scopeOn(scopeOf(c.code)) ? 'red' : ''">{{ scopeOn(scopeOf(c.code)) ? '已标记' : '未标记' }}</span>
                    <span
                      class="qc-act-plat qc-act-all"
                      :class="{ on: scopeAllOn(scopeOf(c.code)), part: scopeSomeOn(scopeOf(c.code), codePlats(c)) }"
                      @click="setCodeScope(c.code, toggleScopeAll(scopeOf(c.code)))"
                    ><i class="qc-act-ck ck"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l4.8 4.8L19.5 7" /></svg></i><i class="qc-act-ck dk"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M5 12h14" /></svg></i>全部平台</span>
                    <i class="qc-act-vdiv"></i>
                    <span
                      v-for="p in codePlats(c)"
                      :key="p"
                      class="qc-act-plat"
                      :class="{ on: scopePlatOn(scopeOf(c.code), p) }"
                      @click="setCodeScope(c.code, flipScopePlat(scopeOf(c.code), p))"
                    ><i class="qc-act-ck ck"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l4.8 4.8L19.5 7" /></svg></i>{{ p }}</span>
                  </div>
                </td>
              </tr>
              <tr v-if="!liveCodes.length">
                <td colspan="2" class="qc-act-empty">该系列下暂无商品编码</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
      <template #foot>
        <button class="btn" @click="actOpen = false">取消</button>
        <button class="btn primary" :disabled="!actDirty" @click="doAct">确认</button>
      </template>
    </Modal>
  </Teleport>
</template>
