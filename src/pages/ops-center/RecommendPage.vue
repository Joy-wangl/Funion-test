<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import MoreActions from '../../components/MoreActions.vue';
import { pushToast } from '../../components/toast';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';
import { PLATFORM_LOGO } from './data';
import {
  REC_VIEWS, REC_LIVES, REC_TAG_GROUPS, REC_STATS, REC_ASOF, REC_DESC, REC_ROWS, recReasons,
} from './recommendData';
import type { RecRow } from './recommendData';

const copy = (t: string) => { navigator.clipboard?.writeText(t).catch(() => undefined); };

/* ---------- 分段胶囊：候选视图 + 生命周期 ---------- */
const view = ref('all');
const life = ref('all');

/* ---------- 快捷标签：多选切换 ---------- */
const pickedTags = ref<Set<string>>(new Set());
const toggleTag = (label: string) => {
  const s = new Set(pickedTags.value);
  if (s.has(label)) s.delete(label); else s.add(label);
  pickedTags.value = s;
};

/* ---------- 条件筛选 ---------- */
interface Cond { cat: string; minScore: number; minDays: number; kw: string; }
const emptyCond = (): Cond => ({ cat: '全部类目', minScore: 0, minDays: 0, kw: '' });
const cond = reactive<Cond>(emptyCond());
const applied = reactive<Cond>(emptyCond());
const collapsed = ref(false);
const doQuery = () => { Object.assign(applied, cond); };
const doReset = () => { Object.assign(cond, emptyCond()); Object.assign(applied, emptyCond()); pickedTags.value = new Set(); view.value = 'all'; life.value = 'all'; };

/* ---------- 列表字段管理：横向可滚表，勾选+商品左钉，操作右钉 ---------- */
const cf = useColField('recommend', {
  fixedLeft: [{ key: 'check', width: 44 }, { key: 'product', label: '商品信息', width: 320 }],
  fields: [
    { key: 'score', label: '推荐分', width: 96 },
    { key: 'days', label: '上架天数', width: 128 },
    { key: 'basis', label: '入池依据', width: 110 },
    { key: 'windowSales', label: '窗口销量', width: 108 },
    { key: 'trend', label: '趋势强度', width: 108 },
    { key: 'lastYear', label: '去年同期', width: 108 },
    { key: 'curve30', label: '今年30天', width: 124 },
    { key: 'curveLy', label: '去年前后30天', width: 140 },
    { key: 'curve18m', label: '近18月趋势', width: 132 },
    { key: 'timing', label: '铺货时机', width: 104 },
    { key: 'refund', label: '退款率', width: 92 },
    { key: 'activeDays', label: '动销天', width: 88 },
    { key: 'traffic', label: '流量结构', width: 168 },
    { key: 'season', label: '季节标签', width: 140 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', width: 156 }],
  sticky: true,
});
const { midCols, stickCls, stickStyle, pinL, pinR } = cf;

/* 固定列恒冻结（横向滚动时商品左钉、操作右钉）：表恒 fixed 布局＋总宽保底，产生横向滚动 */
const CHECK_W = 44;
const PRODUCT_W = 320;
const ACTIONS_W = 110;
const totalW = computed(() => CHECK_W + PRODUCT_W + midCols.value.reduce((s, c) => s + (c.width ?? 150), 0) + ACTIONS_W);

/* ---------- 排序 ---------- */
type SortKey = 'score' | 'days' | 'windowSales' | 'trend' | 'lastYear' | 'refund' | 'activeDays';
/* 数值指标列统一挂 SortTh（同款排序 icon）；曲线/文本列不挂，避免 icon 有无不一致 */
const SORT_KEYS: SortKey[] = ['score', 'days', 'windowSales', 'trend', 'lastYear', 'refund', 'activeDays'];
const isSortable = (k: string): k is SortKey => (SORT_KEYS as string[]).includes(k);
const sortKey = ref<SortKey>('score');
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: SortKey) => {
  if (sortKey.value === k) sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc';
  else { sortKey.value = k; sortDir.value = 'desc'; }
};
const sortState = (k: SortKey): 'none' | 'asc' | 'desc' => (sortKey.value === k ? sortDir.value : 'none');

/* ---------- 过滤 + 排序 ---------- */
const rows = computed<RecRow[]>(() => {
  let list = REC_ROWS.filter((r) => {
    if (life.value !== 'all' && r.life !== life.value) return false;
    if (view.value === 'season' || view.value === 'lastSeason') { if (!r.season.startsWith('冬季')) return false; }
    else if (view.value === 'lastYear') { if (r.basis !== '去年同期' && r.days < 365) return false; }
    else if (view.value === 'newest') { if (r.days > 90) return false; }
    else if (view.value === 'regular') { if (r.basis !== '常规在售') return false; }
    if (applied.kw && !(r.name.includes(applied.kw) || r.goodsId.includes(applied.kw))) return false;
    if (r.score * 100 < applied.minScore) return false;
    if (r.days < applied.minDays) return false;
    if (applied.cat !== '全部类目' && applied.cat !== '全部平台') return true;
    return true;
  });
  if (pickedTags.value.size) {
    list = list.filter((r) => {
      for (const t of pickedTags.value) {
        if (r.timing === t) return true;
        if (r.traffic.some((x) => x.type === t)) return true;
      }
      return false;
    });
  }
  const dir = sortDir.value === 'desc' ? -1 : 1;
  const val = (r: RecRow) => r[sortKey.value] as number;
  return [...list].sort((a, b) => (val(a) - val(b)) * dir);
});

/* ---------- 勾选 ---------- */
const checked = ref<Set<string>>(new Set());
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((r) => checked.value.has(r.id)));
const toggleAll = () => {
  checked.value = allChecked.value ? new Set() : new Set(rows.value.map((r) => r.id));
};
const toggleOne = (id: string) => {
  const s = new Set(checked.value);
  if (s.has(id)) s.delete(id); else s.add(id);
  checked.value = s;
};
const selCount = computed(() => checked.value.size);

/* ---------- 迷你曲线 ---------- */
const SW = 108;
const SH = 30;
const sparkPts = (arr: number[], w = SW, h = SH): string => {
  if (arr.length < 2) return '';
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const span = max - min || 1;
  return arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * w;
    const y = h - 2 - ((v - min) / span) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
};

/* ---------- 详情抽屉：推荐依据 ---------- */
const detail = ref<RecRow | null>(null);
const openDetail = (r: RecRow) => { detail.value = r; };

/* ---------- 选品（本页只做选品，铺货动作已下线） ---------- */
const ADD_TARGETS = ['淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '视频号'];
const addTo = (r: RecRow, plat: string) => pushToast(`已添加到${plat}：「${r.name.slice(0, 12)}…」`);
const quickPick = () => pushToast('快速选品：已按当前推荐分排序锁定 Top 商品');

/* ---------- 展示格式化 ---------- */
const num = (n: number) => n.toLocaleString('en-US');
/* 推荐分表层统一百分制（数据层仍为 0–1） */
const scoreTxt = (n: number) => (n * 100).toFixed(1);
const trendTxt = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(3)}`;

/* ---------- 抽屉派生展示：时机文案 / 经营指标行 / 曲线点映射 ---------- */
const publish = (r: RecRow) => pushToast(`已发布到店铺：「${r.name.slice(0, 12)}…」`);
const timingKind = (t: string) => (t === '立即铺' ? 'green' : t === '提前布局' || t === '低客单' ? 'blue' : 'gray');
const timingText = (r: RecRow) => `今年近30天趋势强度 ${trendTxt(r.trend)}，${r.timing === '立即铺' ? '需求已启动' : '需求未启动'}；铺货前请核对SKU库存和目标店铺适配。`;
const planText = (r: RecRow) => (r.timing === '立即铺'
  ? '需求已启动，可优先选择动销稳定的 SKU 铺货。'
  : r.timing === '提前布局'
    ? '需求尚未启动，建议提前备货并观察趋势确认后再铺。'
    : '需求偏弱，暂不建议铺货，先优化主图与价格带。');
interface RecMetric { label: string; value: string; cls?: string; }
const metricsOf = (r: RecRow): RecMetric[] => [
  { label: '当前窗口销量（最多30天）', value: num(r.windowSales) },
  { label: '去年同期30天销量', value: num(r.lastYear) },
  { label: '今年近30天趋势', value: trendTxt(r.trend), cls: r.trend >= 0 ? 'rec-up' : 'rec-down' },
  { label: '去年同期趋势', value: trendTxt(r.lyTrend), cls: r.lyTrend >= 0 ? 'rec-up' : 'rec-down' },
  { label: '去年向后趋势', value: trendTxt(r.afterTrend), cls: r.afterTrend >= 0 ? 'rec-up' : 'rec-down' },
  { label: '退款率', value: `${r.refund.toFixed(1)}%` },
  { label: '广告成交占比', value: `${r.adPct.toFixed(1)}%` },
  { label: '动销天数', value: `${r.activeDays} 天` },
  { label: '上架天数', value: `${r.days} 天` },
];
/* 双曲线共用 60 天横轴：点映射到指定 x 区间，纵轴各自归一仅比走势 */
const ptsIn = (arr: number[], x0: number, x1: number, h = 150): string => {
  if (arr.length < 2) return '';
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const span = max - min || 1;
  return arr.map((v, i) => {
    const x = x0 + (i / (arr.length - 1)) * (x1 - x0);
    const y = h - 8 - ((v - min) / span) * (h - 16);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
};
</script>

<template>
  <div class="rec-page">
    <!-- 筛选卡 -->
    <div class="sg-filter">
      <!-- 条件行：层级在候选视图上方 -->
      <div class="sg-grid">
        <div class="sg-field">
          <label>经营类目</label>
          <div class="rec-cat">
            <BubbleSelect class-name="sg-select" default-value="全部平台" :options="['全部平台', '淘宝', '天猫', '拼多多', '抖音', '视频号']" />
            <BubbleSelect class-name="sg-select" :value="cond.cat" :options="['全部类目', '家居日用', '厨房用品', '服饰配件', '家纺布艺']" @change="(v: string) => cond.cat = v" />
          </div>
        </div>
        <div class="sg-field">
          <label>最低推荐分</label>
          <!-- 滑块与当前值同处一个 40px 控件盒，与左右输入/下拉等高对齐 -->
          <div class="rec-scorebox">
            <input type="range" min="0" max="100" step="1" v-model.number="cond.minScore" />
            <b>{{ cond.minScore }}</b>
          </div>
        </div>
        <div class="sg-field">
          <label>最小上架天数</label>
          <input class="sg-input" type="number" min="0" v-model.number="cond.minDays" placeholder="0" />
        </div>
        <div class="sg-field">
          <label>搜索商品</label>
          <div class="sg-inputwrap">
            <input class="sg-input" placeholder="商品名 / ProCode" :value="cond.kw" @input="cond.kw = ($event.target as HTMLInputElement).value" />
            <button v-if="cond.kw" class="sg-clear" title="清除" @click="cond.kw = ''">✕</button>
          </div>
        </div>
        <div class="sg-actions">
          <ColFieldPop :st="cf" />
          <button class="sg-btn" @click="collapsed = !collapsed">{{ collapsed ? '展开 ∨' : '收起 ∧' }}</button>
          <button class="sg-btn" @click="doReset">重置</button>
          <button class="sg-btn primary" @click="doQuery">查询</button>
        </div>
      </div>

      <!-- 快捷区：分段全宽，标签组与看板带（浅灰面板）同排，收起时整体隐藏 -->
      <div v-if="!collapsed" class="rec-quick">
        <!-- 分段胶囊 -->
        <div class="rec-segs">
          <div class="rec-seg-group">
            <span class="rec-seg-label">候选视图</span>
            <div class="dash-dim-seg">
              <button
                v-for="v in REC_VIEWS" :key="v.key" type="button"
                class="dash-dim-seg-item" :class="view === v.key ? 'active' : ''"
                @click="view = v.key"
              >{{ v.label }} {{ v.count }}</button>
            </div>
          </div>
          <div class="rec-seg-group">
            <span class="rec-seg-label">生命周期</span>
            <div class="dash-dim-seg">
              <button
                v-for="l in REC_LIVES" :key="l.key" type="button"
                class="dash-dim-seg-item" :class="life === l.key ? 'active' : ''"
                @click="life = l.key"
              >{{ l.label }}<template v-if="l.hint"> {{ l.hint }}</template></button>
            </div>
          </div>
        </div>

        <div class="rec-quick-row">
          <div class="rec-quick-left">
            <!-- 快捷标签 -->
            <div class="rec-tags">
              <div v-for="g in REC_TAG_GROUPS" :key="g.name" class="rec-tag-group">
                <span class="rec-tag-name">{{ g.name }}</span>
                <button
                  v-for="t in g.tags" :key="t.label" type="button"
                  class="rec-tag" :class="{ active: pickedTags.has(t.label) }"
                  @click="toggleTag(t.label)"
                >{{ t.label }}</button>
              </div>
            </div>
          </div>
          <aside class="rec-band">
            <div class="rec-head">
              <h2 class="rec-title">上品推荐看板</h2>
              <span class="rec-meta-chip">数据截至 {{ REC_ASOF.data }}</span>
              <span class="rec-meta-chip">评分更新 {{ REC_ASOF.score }}</span>
              <a class="rec-help" href="javascript:void(0)" @click.prevent="pushToast('使用说明：推荐分综合动销/趋势/季节表现计算')">使用说明</a>
            </div>
            <div class="rec-stats">
              <div v-for="s in REC_STATS" :key="s.label" class="rec-stat">
                <b>{{ s.value }}</b>
                <span>{{ s.label }}</span>
              </div>
            </div>
            <p class="rec-desc">{{ REC_DESC }}</p>
          </aside>
        </div>
      </div>
    </div>

    <!-- 榜单工具行 -->
    <div class="rec-listbar">
      <span class="rec-hint">双击行或点击「详情」查看推荐依据</span>
      <div class="rec-listbar-right">
        <span v-if="selCount" class="rec-selmini">已选 <b>{{ selCount }}</b> 件</span>
        <MoreActions :items="[{ label: '按推荐分选品', onClick: quickPick }, { label: '按销量选品', onClick: quickPick }, { label: '按趋势选品', onClick: quickPick }]">
          <template #trigger><button class="sg-btn">快速选品 ▾</button></template>
        </MoreActions>
      </div>
    </div>

    <!-- 表格 -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table cf-pin" :style="{ minWidth: `${totalW}px` }">
          <thead>
            <tr>
              <th :class="[stickCls('check'), 'cf-stick-l']" :style="{ width: `${CHECK_W}px`, left: '0', ...stickStyle('check') }">
                <input type="checkbox" :checked="allChecked" @change="toggleAll" />
              </th>
              <th :class="[stickCls('product'), 'cf-stick-l', pinL.length ? '' : 'cf-stick-edge']" :style="{ width: `${PRODUCT_W}px`, left: `${CHECK_W}px`, ...stickStyle('product') }">商品信息</th>
              <template v-for="c in midCols" :key="c.key">
                <SortTh
                  v-if="isSortable(c.key)"
                  :class="stickCls(c.key)" :style="stickStyle(c.key)"
                  :label="c.label" :width="`${c.width}px`" :state="sortState(c.key as SortKey)" @sort="toggleSort(c.key as SortKey)"
                />
                <th v-else :class="stickCls(c.key)" :style="{ width: `${c.width}px`, ...stickStyle(c.key) }">{{ c.label }}</th>
              </template>
              <th :class="[stickCls('actions'), 'cf-stick-r', pinR.length ? '' : 'cf-stick-edge-r']" :style="{ width: `${ACTIONS_W}px`, right: '0', ...stickStyle('actions') }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id" @dblclick="openDetail(r)">
              <td :class="[stickCls('check'), 'cf-stick-l']" :style="{ left: '0', ...stickStyle('check') }">
                <input type="checkbox" :checked="checked.has(r.id)" @change="toggleOne(r.id)" />
              </td>
              <td :class="[stickCls('product'), 'cf-stick-l', pinL.length ? '' : 'cf-stick-edge']" :style="{ left: `${CHECK_W}px`, ...stickStyle('product') }">
                <div class="sg-goods">
                  <img class="sg-thumb" :src="r.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle"><Ellipsis :text="r.name" /></div>
                    <div class="sg-gid">
                      商品ID：<span>{{ r.goodsId }}</span>
                      <button class="sg-copy" title="复制" @click.stop="copy(r.goodsId)">⧉</button>
                    </div>
                    <div class="sg-gid">
                      店铺：
                      <span class="store-logo"><img :src="PLATFORM_LOGO[r.plat]" alt="" /></span>
                      <span>{{ r.store }}</span>
                    </div>
                  </div>
                </div>
              </td>
              <template v-for="c in midCols" :key="c.key">
                <td v-if="c.key === 'score'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <span class="rec-score">{{ scoreTxt(r.score) }}</span>
                </td>
                <td v-else-if="c.key === 'days'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <span class="rec-days"><span v-if="r.life === 'old'" class="rec-oldchip">老品</span>{{ r.days }}天</span>
                </td>
                <td v-else-if="c.key === 'basis'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <span class="rec-basis">{{ r.basis }}</span>
                </td>
                <td v-else-if="c.key === 'windowSales'" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ num(r.windowSales) }}</td>
                <td v-else-if="c.key === 'trend'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <span :class="r.trend >= 0 ? 'rec-up' : 'rec-down'">{{ trendTxt(r.trend) }}</span>
                </td>
                <td v-else-if="c.key === 'lastYear'" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ num(r.lastYear) }}</td>
                <td v-else-if="c.key === 'curve30'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <svg class="rec-spark" :width="SW" :height="SH" :viewBox="`0 0 ${SW} ${SH}`"><polyline :points="sparkPts(r.curve30)" fill="none" stroke="#e5484d" stroke-width="1.6" /></svg>
                </td>
                <td v-else-if="c.key === 'curveLy'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <svg class="rec-spark" :width="SW" :height="SH" :viewBox="`0 0 ${SW} ${SH}`"><polyline :points="sparkPts(r.curveLy)" fill="none" stroke="#e5484d" stroke-width="1.6" /></svg>
                </td>
                <td v-else-if="c.key === 'curve18m'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <svg class="rec-spark" :width="SW" :height="SH" :viewBox="`0 0 ${SW} ${SH}`"><polyline :points="sparkPts(r.curve18m)" fill="none" stroke="#2fa36b" stroke-width="1.6" /></svg>
                </td>
                <td v-else-if="c.key === 'timing'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <span class="rec-timing" :data-t="r.timing">{{ r.timing }}</span>
                </td>
                <td v-else-if="c.key === 'refund'" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ r.refund.toFixed(1) }}%</td>
                <td v-else-if="c.key === 'activeDays'" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ r.activeDays }}</td>
                <td v-else-if="c.key === 'traffic'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                  <div class="rec-traffic">
                    <span v-for="t in r.traffic" :key="t.type" class="rec-tchip" :data-t="t.type">
                      {{ t.type }}<template v-if="t.pct != null"> {{ t.pct }}%</template>
                    </span>
                  </div>
                </td>
                <td v-else-if="c.key === 'season'" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ r.season }}</td>
              </template>
              <td :class="[stickCls('actions'), 'cf-stick-r', pinR.length ? '' : 'cf-stick-edge-r']" :style="{ right: '0', ...stickStyle('actions') }">
                <div class="sg-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="openDetail(r)">详情</a>
                  <!-- 本页只做选品：铺货动作下线，统一走「添加到」进入各平台商品创建 -->
                  <MoreActions :items="ADD_TARGETS.map((p) => ({ label: p, onClick: () => addTo(r, p) }))">
                    <template #trigger><a class="sg-link" href="javascript:void(0)" @click.prevent>添加到 ▾</a></template>
                  </MoreActions>
                </div>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="midCols.length + 3" class="rec-empty">无符合条件的候选商品</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">显示 1–{{ rows.length }} / 共 121,446 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn">2</button>
          <button class="ib-pagebtn">3</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <!-- 推荐依据抽屉：结构对标参考详情（评分卡/时机判断/七维/双曲线/经营指标/SKU/方案建议） -->
    <Teleport to="body">
      <div v-if="detail" class="cp-drawer-mask" @click="detail = null">
        <div class="cp-drawer rec-drawer" @click.stop>
          <div class="cp-drawer-head rec-d2-head">
            <div class="rec-d2-headtxt">
              <h3 class="rec-d2-name">{{ detail.name }}</h3>
              <div class="rec-d2-meta">ProCode {{ detail.goodsId }} · {{ detail.cat }} · {{ detail.season }}</div>
            </div>
            <div class="rec-d2-headact">
              <button class="rec-d2-publish" @click="publish(detail)">发布到店铺</button>
              <button title="关闭" @click="detail = null">✕</button>
            </div>
          </div>
          <div class="cp-drawer-body rec-d2-body">
            <!-- 评分卡：主图 + 综合推荐分 + 命中标签 -->
            <div class="rec-d2-score">
              <img :src="detail.img" alt="" />
              <div class="rec-d2-scorenum">
                <b>{{ detail.score.toFixed(3) }}</b>
                <span>综合推荐分</span>
              </div>
              <div class="rec-d2-chips">
                <span class="rec-d2-chip gray">{{ detail.basis }}</span>
                <span class="rec-d2-chip" :class="timingKind(detail.timing)">{{ detail.timing }}</span>
                <span v-for="rs in recReasons(detail.id)" :key="rs.tag" class="rec-d2-chip blue" :title="rs.desc">{{ rs.tag }}</span>
              </div>
            </div>

            <!-- 铺货时机判断 -->
            <div class="rec-d2-note">
              <b>铺货时机判断</b>
              <p>{{ timingText(detail) }}</p>
            </div>

            <!-- 七维推荐依据 -->
            <div class="rec-d2-card">
              <div class="rec-d2-cardhead"><b>七维推荐依据</b></div>
              <div class="rec-d2-dims">
                <div
                  v-for="d in detail.dims" :key="d.name" class="rec-d2-dim"
                  :title="`${d.name}：权重 ${d.w.toFixed(2)} × 分值 ${d.v.toFixed(3)} = 贡献 ${(d.w * d.v).toFixed(3)}`"
                >
                  <div class="rec-d2-dimrow">
                    <span class="rec-d2-dimname">{{ d.name }}</span>
                    <span class="rec-d2-dimw">权重 {{ d.w.toFixed(2) }}</span>
                    <span class="rec-d2-dimv">{{ d.v.toFixed(3) }}</span>
                  </div>
                  <div class="rec-d2-bar"><i :style="{ width: `${d.v * 100}%` }" /></div>
                </div>
              </div>
              <p class="rec-d2-footnote">综合分反映候选商品质量；SKU 详情仅展示主图、标题、ID 和 SKU 列表。</p>
            </div>

            <!-- 今年最近30天曲线（右半段留空对照去年） -->
            <div class="rec-d2-card">
              <div class="rec-d2-cardhead">
                <b>今年最近30天曲线</b>
                <span class="rec-d2-legend"><i class="dash blue" />最新数据日</span>
              </div>
              <svg v-if="detail.curve30.length > 1" class="rec-d2-chart" viewBox="0 0 600 150" preserveAspectRatio="none">
                <polyline :points="ptsIn(detail.curve30, 0, 300)" fill="none" stroke="#e5484d" stroke-width="2" />
                <line x1="300" y1="0" x2="300" y2="150" stroke="#4c8dff" stroke-width="1.4" stroke-dasharray="4 4" />
              </svg>
              <div v-else class="rec-d2-nochart">暂无曲线数据</div>
              <div class="rec-d2-axis"><span>30天前</span><span>最新数据日</span><span>未来30天（留空）</span></div>
              <p class="rec-d2-footnote">两图共用同一条60天横轴；今年最新数据日与去年同期锚点对齐，右半段留空用于对照去年后续走势。</p>
            </div>

            <!-- 去年同期前后30天曲线 -->
            <div class="rec-d2-card">
              <div class="rec-d2-cardhead">
                <b>去年同期前后30天曲线</b>
                <span class="rec-d2-legend"><i class="dash orange" />去年同期锚点</span>
              </div>
              <svg v-if="detail.curveLy.length > 1" class="rec-d2-chart" viewBox="0 0 600 150" preserveAspectRatio="none">
                <polyline :points="ptsIn(detail.curveLy, 0, 600)" fill="none" stroke="#8a94a6" stroke-width="2" />
                <line x1="300" y1="0" x2="300" y2="150" stroke="#f5a623" stroke-width="1.4" stroke-dasharray="4 4" />
              </svg>
              <div v-else class="rec-d2-nochart">暂无曲线数据</div>
              <div class="rec-d2-axis"><span>锚点前30天</span><span>去年同期锚点</span><span>锚点后30天</span></div>
              <p class="rec-d2-footnote">虚线与上图最新数据日处于同一位置；右侧抬升说明去年同期之后需求进入上升阶段。纵轴各自归一，仅比较走势与时点。</p>
            </div>

            <!-- 真实经营指标 -->
            <div class="rec-d2-card">
              <div class="rec-d2-cardhead"><b>真实经营指标</b></div>
              <div class="rec-d2-metrics">
                <div v-for="m in metricsOf(detail)" :key="m.label" class="rec-d2-metric">
                  <span class="rec-d2-mlabel" :title="m.label">{{ m.label }}</span>
                  <b :class="m.cls">{{ m.value }}</b>
                </div>
              </div>
            </div>

            <!-- SKU 明细 -->
            <div class="rec-d2-card">
              <div class="rec-d2-cardhead"><b>SKU 明细</b></div>
              <table v-if="detail.skus.length" class="rec-d2-skus">
                <thead>
                  <tr><th>SKU 图</th><th>SKU 名称</th><th>SKU ID</th></tr>
                </thead>
                <tbody>
                  <tr v-for="s in detail.skus" :key="s.id">
                    <td><img :src="s.img" alt="" /></td>
                    <td><span class="rec-d2-skuname" :title="s.name">{{ s.name }}</span></td>
                    <td class="rec-d2-skuid">{{ s.id }}</td>
                  </tr>
                </tbody>
              </table>
              <div v-else class="rec-d2-nochart">暂无 SKU 明细</div>
            </div>

            <!-- 铺货方案建议 -->
            <div class="rec-d2-plan">
              <b>📦 铺货方案建议</b>
              <div class="rec-d2-planrow">
                <span class="rec-d2-chip solid" :class="timingKind(detail.timing)">{{ detail.timing }}</span>
                <span>{{ timingText(detail) }}</span>
              </div>
              <div class="rec-d2-planrow">
                <span class="rec-d2-planlabel">操作建议</span>
                <span>{{ planText(detail) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.rec-page { padding: 4px 2px 24px; }
.rec-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.rec-title { font-size: 20px; font-weight: 700; color: #1c2434; margin: 0; }
.rec-meta-chip { font-size: 12px; color: #667080; background: #f2f5fa; border-radius: 999px; padding: 4px 12px; }
.rec-help { margin-left: auto; font-size: 13px; color: var(--color-primary); text-decoration: none; }

.rec-stats { display: flex; gap: 12px; margin-bottom: 8px; }
.rec-stat { flex: 1; background: #fff; border: 1px solid #e8ebf1; border-radius: 14px; padding: 14px 18px; display: flex; flex-direction: column; gap: 6px; box-shadow: 0 8px 28px rgba(26,34,56,.045); }
.rec-stat b { font-size: 24px; font-weight: 700; color: #1c2434; line-height: 1; }
.rec-stat span { font-size: 12px; color: #8a94a6; }
.rec-desc { margin: 0 0 14px; font-size: 12px; color: #8a94a6; }

/* 快捷区：分段全宽；标签组 + 右看板带浅灰面板同排（指针落点：筛选卡右侧空区） */
.rec-quick { display: flex; flex-direction: column; margin-top: 14px; }
.rec-quick-row { display: flex; align-items: stretch; gap: 16px; padding-top: 12px; border-top: 1px dashed #e8ebf1; }
.rec-quick-left { flex: 1; min-width: 0; }
.rec-band { flex: none; width: 660px; background: #f7f8fa; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
.rec-band .rec-head { margin-bottom: 0; flex-wrap: wrap; gap: 8px 10px; }
.rec-band .rec-title { font-size: 15px; }
.rec-band .rec-meta-chip { padding: 2px 10px; font-size: 11px; }
.rec-band .rec-help { font-size: 12px; }
.rec-band .rec-stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 0; }
.rec-band .rec-stat { padding: 10px; border-radius: 10px; box-shadow: none; gap: 4px; }
.rec-band .rec-stat b { font-size: 17px; }
.rec-band .rec-stat span { font-size: 11px; }
.rec-band .rec-desc { margin: 0; font-size: 11px; line-height: 1.6; }

.rec-segs { display: flex; flex-direction: column; gap: 10px; }
.rec-seg-group { display: flex; align-items: center; gap: 12px; }
.rec-seg-label { flex: none; width: 60px; font-size: 13px; color: #667080; }

.rec-tags { display: flex; flex-direction: column; gap: 8px; }
.rec-tag-group { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rec-tag-name { flex: none; width: 60px; font-size: 12px; color: #8a94a6; }
.rec-tag { border: 1px solid #e4e8ef; background: #f8fafc; color: #667080; border-radius: 999px; padding: 4px 12px; font-size: 12px; cursor: pointer; transition: .15s; }
.rec-tag:hover { border-color: #d7e3ff; color: var(--color-primary); }
.rec-tag.active { background: #eef4ff; color: var(--color-primary); border-color: #d7e3ff; font-weight: 500; }

.rec-cat { display: flex; gap: 8px; }
.rec-cat > * { flex: 1; min-width: 0; }
/* 条件与动作同排：四列条件 + 末列动作组右对齐，消除原先按钮独占一行的空白带 */
.rec-page .sg-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) auto; }
@media (max-width: 1300px) {
  .rec-page .sg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .rec-page .sg-grid .sg-actions { grid-column: auto / -1; }
}
/* 最低推荐分：滑块与当前值同处一个 40px 控件盒，与 .sg-input/.sg-select 等高同底 */
.rec-scorebox { display: flex; align-items: center; gap: 10px; height: 40px; border: 1px solid var(--color-border); background: var(--color-fill); border-radius: var(--radius-lg); padding: 0 12px; }
.rec-scorebox:focus-within { border-color: #a9bcff; box-shadow: 0 0 0 3px rgba(79, 124, 255, 0.07); background: #fff; }
.rec-scorebox input[type="range"] { flex: 1; min-width: 0; accent-color: var(--color-primary); }
.rec-scorebox b { flex: none; min-width: 28px; text-align: right; font-size: var(--fs-base); font-weight: 500; color: var(--color-text-2); }

.rec-listbar { display: flex; align-items: center; margin-bottom: 10px; }
.rec-hint { font-size: 12px; color: #8a94a6; }
.rec-listbar-right { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.rec-selmini { font-size: 12px; color: #667080; }
.rec-selmini b { color: var(--color-primary); }

.rec-score { color: #2fa36b; font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
.rec-up { color: #e5484d; font-weight: 600; }
.rec-down { color: #2fa36b; font-weight: 600; }
.rec-days { white-space: nowrap; }
.rec-oldchip { display: inline-block; margin-right: 6px; font-size: 11px; color: #9a6b1f; background: #fdf3e0; border-radius: 4px; padding: 1px 6px; }
.rec-basis { display: inline-block; font-size: 12px; color: #4f7cff; background: #eef4ff; border-radius: 6px; padding: 2px 8px; }
.rec-spark { display: block; }
.rec-timing { display: inline-block; font-size: 12px; border-radius: 6px; padding: 3px 10px; background: #eef4ff; color: var(--color-primary); cursor: default; }
.rec-timing[data-t="立即铺"] { background: #e7f7ef; color: #2fa36b; font-weight: 600; }
.rec-timing[data-t="观望"], .rec-timing[data-t="错货时机"] { background: #f2f5fa; color: #8a94a6; }
.rec-traffic { display: flex; gap: 6px; flex-wrap: wrap; }
.rec-tchip { font-size: 11px; border-radius: 4px; padding: 2px 7px; background: #e7f7ef; color: #2fa36b; }
.rec-tchip[data-t="广告铺"], .rec-tchip[data-t="广告流"] { background: #fdf6e3; color: #b8860b; }
.rec-empty { text-align: center; color: #8a94a6; padding: 40px 0; }

.rec-drawer { width: min(860px, 96vw); }
.rec-d2-head { align-items: flex-start; gap: 16px; }
.rec-d2-headtxt { flex: 1; min-width: 0; }
.rec-d2-name { margin: 0; font-size: 16px; font-weight: 700; color: #1c2434; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rec-d2-meta { margin-top: 6px; font-size: 12px; color: #8a94a6; font-weight: 400; }
.rec-d2-headact { flex: none; display: flex; align-items: center; gap: 10px; }
.rec-drawer .rec-d2-publish { border: 0; border-radius: 8px; background: var(--color-primary); color: #fff; font-size: 13px; font-weight: 500; padding: 8px 16px; cursor: pointer; }
.rec-drawer .rec-d2-publish:hover { opacity: .9; }
.rec-d2-body { display: flex; flex-direction: column; gap: 14px; scrollbar-width: none; }
.rec-d2-body::-webkit-scrollbar { display: none; }

.rec-d2-score { display: flex; align-items: center; gap: 18px; background: #f4f7ff; border-radius: 12px; padding: 16px 18px; }
.rec-d2-score img { flex: none; width: 92px; height: 92px; border-radius: 10px; object-fit: cover; background: #fff; }
.rec-d2-scorenum { flex: none; min-width: 96px; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.rec-d2-scorenum b { font-size: 30px; font-weight: 700; color: #3d6bff; line-height: 1; font-variant-numeric: tabular-nums; }
.rec-d2-scorenum span { font-size: 12px; color: #8a94a6; }
.rec-d2-chips { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.rec-d2-chip { font-size: 12px; border-radius: 6px; padding: 3px 10px; border: 1px solid transparent; white-space: nowrap; }
.rec-d2-chip.gray { color: #667080; background: #eef1f6; }
.rec-d2-chip.blue { color: var(--color-primary); background: #eef4ff; border-color: #cfdfff; }
.rec-d2-chip.green { color: #2fa36b; background: #eaf7f0; border-color: #bfe6d2; }
.rec-d2-chip.solid.gray { color: #fff; background: #98a0b3; border-color: #98a0b3; }
.rec-d2-chip.solid.blue { color: #fff; background: var(--color-primary); border-color: var(--color-primary); }
.rec-d2-chip.solid.green { color: #fff; background: #52c41a; border-color: #52c41a; }

.rec-d2-note { background: #f0f6ff; border: 1px solid #dbe8ff; border-radius: 12px; padding: 14px 16px; }
.rec-d2-note b { display: block; font-size: 14px; color: #2b6de0; margin-bottom: 6px; }
.rec-d2-note p { margin: 0; font-size: 13px; color: #4a5468; line-height: 1.7; }

.rec-d2-card { background: #fff; border: 1px solid #e8ebf1; border-radius: 12px; padding: 14px 16px; }
.rec-d2-cardhead { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.rec-d2-cardhead b { font-size: 14px; color: #1c2434; }
.rec-d2-legend { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: #8a94a6; }
.rec-d2-legend .dash { width: 14px; height: 0; border-top: 2px dashed #4c8dff; }
.rec-d2-legend .dash.orange { border-top-color: #f5a623; }

.rec-d2-dims { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 28px; }
.rec-d2-dim { cursor: default; }
.rec-d2-dimrow { display: flex; align-items: baseline; gap: 8px; }
.rec-d2-dimname { font-size: 13px; color: #4a5468; }
.rec-d2-dimw { margin-left: auto; font-size: 11px; color: #98a0b3; }
.rec-d2-dimv { flex: none; width: 44px; text-align: right; font-size: 13px; font-weight: 600; color: #1c2434; font-variant-numeric: tabular-nums; }
.rec-d2-bar { margin-top: 6px; height: 6px; border-radius: 999px; background: #edf0f5; overflow: hidden; }
.rec-d2-bar i { display: block; height: 100%; border-radius: 999px; background: #3d8bfd; }
.rec-d2-footnote { margin: 12px 0 0; font-size: 12px; color: #98a0b3; line-height: 1.6; }

.rec-d2-chart { display: block; width: 100%; height: 150px; }
.rec-d2-nochart { height: 150px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #98a0b3; background: #f8fafc; border-radius: 8px; }
.rec-d2-axis { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: #98a0b3; }

.rec-d2-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 14px; }
.rec-d2-metric { display: flex; align-items: center; gap: 12px; background: #f8fafc; border-radius: 8px; padding: 10px 14px; }
.rec-d2-mlabel { flex: 1; min-width: 0; font-size: 12px; color: #667080; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-d2-metric b { flex: none; font-size: 14px; font-weight: 700; color: #1c2434; font-variant-numeric: tabular-nums; }

.rec-d2-skus { width: 100%; border-collapse: collapse; table-layout: fixed; }
.rec-d2-skus th { text-align: left; font-size: 12px; color: #667080; font-weight: 600; padding: 8px 10px; background: #f8fafc; }
.rec-d2-skus th:nth-child(1) { width: 72px; }
.rec-d2-skus th:nth-child(3) { width: 160px; }
.rec-d2-skus td { padding: 8px 10px; border-top: 1px solid #f0f2f6; vertical-align: middle; }
.rec-d2-skus tbody tr:hover td { background: #f8fafc; }
.rec-d2-skus img { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; background: #f2f5fa; display: block; }
.rec-d2-skuname { display: block; font-size: 13px; color: #303948; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-d2-skuid { font-size: 12px; color: #8a94a6; }

.rec-d2-plan { background: #f0f6ff; border: 1px solid #dbe8ff; border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; }
.rec-d2-plan > b { font-size: 14px; color: #1c2434; }
.rec-d2-planrow { display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #4a5468; line-height: 1.7; }
.rec-d2-planlabel { flex: none; color: #2b6de0; font-weight: 600; }
</style>
