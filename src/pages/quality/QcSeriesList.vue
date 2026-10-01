<script lang="ts">
import { DEFAULT_CUSTOM_RANGE, type DateRange, type RangeKey } from './qcCenterData';

export type SortKey =
  | 'orders' | 'refundRate' | 'afterSales' | 'chatRiskHits'
  | 'refundCount' | 'afterRate'
  | 'chatTotal' | 'chatRisk' | 'chatRate';

/** 订单数据复合列可选排序指标 */
export const ORDER_SORT_METRICS: { key: SortKey; label: string }[] = [
  { key: 'orders', label: '订单量' },
  { key: 'refundCount', label: '退款订单数' },
  { key: 'refundRate', label: '退款率' },
  { key: 'afterSales', label: '售后单数' },
  { key: 'afterRate', label: '售后率' },
];

/** 聊天数据复合列可选排序指标 */
export const CHAT_SORT_METRICS: { key: SortKey; label: string }[] = [
  { key: 'chatTotal', label: '会话总数' },
  { key: 'chatRisk', label: '风险会话' },
  { key: 'chatRate', label: '风险率' },
];

/** 系列编码列表筛选条件（草稿/生效分离，与任务中心等模块交互一致）；标签四维与品控 2.0 编码标签同源 */
export type SeriesFilter = {
  q: string;
  platform: string;
  type: string;
  dept: string;
  duty: string;
  range: RangeKey;
  custom: DateRange;
  /** 标签级联多选：一级大类名 / 二级标签名混选，并集语义；空 = 不限 */
  tags: string[];
  tagHealth: string;
  tagJudge: string;
  /** 线上壳：组别 / 运维人员归属筛选 */
  group: string;
  operator: string;
  /** 线上壳：数值区间（空串 = 不限），订单量/退款率(%)/售后单/聊天风险 */
  ordersMin: string;
  ordersMax: string;
  rateMin: string;
  rateMax: string;
  asMin: string;
  asMax: string;
  crMin: string;
  crMax: string;
};

export const DEFAULT_SERIES_FILTER: SeriesFilter = {
  q: '',
  platform: '全部平台',
  type: '全部类型',
  dept: '全部部门',
  duty: '全部部门',
  range: 'custom',
  custom: DEFAULT_CUSTOM_RANGE,
  tags: [],
  tagHealth: '全部等级',
  tagJudge: '全部方式',
  group: '全部组别',
  operator: '全部运维',
  ordersMin: '',
  ordersMax: '',
  rateMin: '',
  rateMax: '',
  asMin: '',
  asMax: '',
  crMin: '',
  crMax: '',
};
</script>

<script setup lang="ts">
/* ---------- 系列编码列表 ---------- */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  PROBLEM_DEPT,
  QC_DEPTS,
  QC_PLATFORMS,
  QC_PROBLEM_TYPES,
  RANGE_LABELS,
  defaultDutyDept,
  type QcCenterCode,
  type QcCenterSeries,
} from './qcCenterData';
import { JUDGE_LABEL, QC2_CATS, qc2Labels } from '../quality2/qc2Data';
import { pushToast } from '../../components/toast';
import type { Platform, PlatformStat } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import CascadeSelect from '../../components/CascadeSelect.vue';
import SortTh from '../../components/SortTh.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';
import QcGroupShuttle from './QcGroupShuttle.vue';
import QcSeriesRow from './QcSeriesRow.vue';

const props = defineProps<{
  series: QcCenterSeries[];
  /** null = 未排序（数据默认顺序） */
  sortKey: SortKey | null;
  sortDesc: boolean;
  onToggleSort: (key: SortKey) => void;
  onSetSort: (key: SortKey, desc: boolean) => void;
  /** 复合列气泡清除排序：恢复默认顺序 */
  onClearSort: () => void;
  draft: SeriesFilter;
  onDraft: (patch: Partial<SeriesFilter>) => void;
  onQuery: () => void;
  onReset: () => void;
  onDetail: (s: QcCenterSeries) => void;
  onChat: (codes: QcCenterCode[], platforms: Platform[], platform: Platform) => void;
  onTrend: (s: QcCenterSeries) => void;
  onTrendStat: (stat: PlatformStat, label: string, seriesCode: string) => void;
  dutyMap: Record<string, string>;
  onDuty: (code: string, dept: string | null) => void;
  /** 品控-线上壳：无标签筛选/标签列，列序对齐线上，启用分页 */
  online?: boolean;
  /** 品控-线上：已生效的问题涉及部门；命中类型/部门列按该部门收敛展示 */
  scopeDept?: string;
  /** 命中类型标签点击：打开详情抽屉并选中该类型 */
  onPickType?: (s: QcCenterSeries, type: string) => void;
  /** 问题涉及部门标签点击：打开详情抽屉并选中该部门关联的全部问题类型 */
  onPickDept?: (s: QcCenterSeries, dept: string) => void;
}>();

const expanded = ref<Set<string>>(new Set());
const toggle = (key: string) => {
  const next = new Set(expanded.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expanded.value = next;
};

const sortState = (key: SortKey | null): 'none' | 'desc' | 'asc' =>
  !key || props.sortKey !== key ? 'none' : props.sortDesc ? 'desc' : 'asc';

/* 复合列当前排序指标：未排序或排序键不属于本列时为 null（列头图标灰双箭、气泡无选中项） */
const orderMetric = computed<SortKey | null>(() => {
  const k = props.sortKey;
  return k && ORDER_SORT_METRICS.some((m) => m.key === k) ? k : null;
});
const chatMetric = computed<SortKey | null>(() => {
  const k = props.sortKey;
  return k && CHAT_SORT_METRICS.some((m) => m.key === k) ? k : null;
});
/* 复合列头点击出指标气泡：再点列头或点外部收起，选定后隐藏；同指标再选＝切换升降序 */
const openPick = ref<'order' | 'chat' | null>(null);
const onPickDoc = (e: MouseEvent) => {
  if (openPick.value && !(e.target as Element).closest('.qc-pick-th')) openPick.value = null;
};
onMounted(() => document.addEventListener('mousedown', onPickDoc));
onBeforeUnmount(() => document.removeEventListener('mousedown', onPickDoc));
const onPickMetric = (k: string) => { props.onToggleSort(k as SortKey); openPick.value = null; };
/* 气泡内升降序分段：对本列当前指标直接指定方向；再点已选中方向＝清除排序恢复默认顺序 */
const onPickDir = (k: SortKey, desc: boolean) => {
  if (props.sortKey === k && props.sortDesc === desc) props.onClearSort();
  else props.onSetSort(k, desc);
  openPick.value = null;
};

/* 问题涉及部门联动（线上壳）：问题类型下拉仅列该部门负责类型，行命中类型/部门列按该部门收敛 */
const typesOfDept = (d: string) => QC_PROBLEM_TYPES.filter((t) => PROBLEM_DEPT[t] === d);
const typeOptions = computed(() => (!props.online || props.draft.dept === '全部部门'
  ? ['全部类型', ...QC_PROBLEM_TYPES]
  : ['全部类型', ...typesOfDept(props.draft.dept)]));
const onDeptChange = (v: string) => {
  const stale = props.online && v !== '全部部门' && props.draft.type !== '全部类型' && !typesOfDept(v).includes(props.draft.type);
  props.onDraft(stale ? { dept: v, type: '全部类型' } : { dept: v });
};
const rowScope = computed(() => (props.online && props.scopeDept && props.scopeDept !== '全部部门' ? props.scopeDept : undefined));

/* 标签级联多选选项：一级 = 大类（可勾选），二级 = 启用中标签（可单独勾选） */
const tagGroups = computed(() => QC2_CATS.map((cat) => ({
  name: cat,
  children: qc2Labels.value.filter((l) => l.enabled && l.cat === cat).map((l) => l.name),
})).filter((g) => g.children.length > 0));

/* 分页（仅线上壳）：项目统一 ib-pagination 模式，页码窗 = 首页窗/居中窗 + 省略号 + 末页 */
const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const pageCount = computed(() => Math.max(1, Math.ceil(props.series.length / pageSize.value)));
const rows = computed(() => (props.online
  ? props.series.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
  : props.series));
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
watch([() => props.series, () => props.online], () => { page.value = 1; jumpVal.value = '1'; });
watch(page, (v) => { jumpVal.value = String(v); });
</script>

<template>
  <div class="qc-head">
    <div class="qc-title">
      监控列表
      <span class="qc-desc">共 {{ series.length }} 个系列 · 展开查看各平台数据与下属商品编码</span>
    </div>
  </div>
  <div class="sg-filter">
    <div class="sg-grid">
      <div class="sg-field">
        <label>搜索</label>
        <input
          class="sg-input"
          placeholder="请输入店铺 / 系列编码 / 商品编码"
          :value="draft.q"
          @input="props.onDraft({ q: ($event.target as HTMLInputElement).value })"
        >
      </div>
      <div class="sg-field">
        <label>平台</label>
        <BubbleSelect class-name="sg-select" :value="draft.platform" :options="['全部平台', ...QC_PLATFORMS]" @change="(v: string) => props.onDraft({ platform: v })" />
      </div>
      <div v-if="!online" class="sg-field">
        <label>标签</label>
        <CascadeSelect
          class-name="sg-select"
          multiple
          searchable
          :groups="tagGroups"
          :values="draft.tags"
          all-label="全部标签"
          @multi-change="(v: string[]) => props.onDraft({ tags: v })"
        />
      </div>
      <div v-if="!online" class="sg-field">
        <label>健康等级</label>
        <BubbleSelect class-name="sg-select" :value="draft.tagHealth" :options="['全部等级', 'A', 'B', 'C', 'D']" @change="(v: string) => props.onDraft({ tagHealth: v })" />
      </div>
      <div v-if="!online" class="sg-field">
        <label>判定方式</label>
        <BubbleSelect class-name="sg-select" :value="draft.tagJudge" :options="['全部方式', JUDGE_LABEL.rule, JUDGE_LABEL.ai]" @change="(v: string) => props.onDraft({ tagJudge: v })" />
      </div>
      <div class="sg-field">
        <label>问题类型</label>
        <BubbleSelect class-name="sg-select" :value="draft.type" :options="typeOptions" @change="(v: string) => props.onDraft({ type: v })" />
      </div>
      <div class="sg-field">
        <label>问题涉及部门</label>
        <BubbleSelect class-name="sg-select" :value="draft.dept" :options="['全部部门', ...QC_DEPTS]" @change="onDeptChange" />
      </div>
      <div class="sg-field">
        <label>责任部门</label>
        <BubbleSelect class-name="sg-select" :value="draft.duty" :options="['全部部门', ...QC_DEPTS]" @change="(v: string) => props.onDraft({ duty: v })" />
      </div>
      <div v-if="online" class="sg-field">
        <label>组别 / 运维人员</label>
        <QcGroupShuttle
          class-name="sg-select"
          :group="draft.group"
          :operator="draft.operator"
          @change="(g: string, o: string) => props.onDraft({ group: g, operator: o })"
        />
      </div>
      <div v-if="online" class="sg-field">
        <label>订单量</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.ordersMin" @input="props.onDraft({ ordersMin: ($event.target as HTMLInputElement).value })">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.ordersMax" @input="props.onDraft({ ordersMax: ($event.target as HTMLInputElement).value })">
        </span>
      </div>
      <div v-if="online" class="sg-field">
        <label>退款率（%）</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.rateMin" @input="props.onDraft({ rateMin: ($event.target as HTMLInputElement).value })">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.rateMax" @input="props.onDraft({ rateMax: ($event.target as HTMLInputElement).value })">
        </span>
      </div>
      <div v-if="online" class="sg-field">
        <label>售后单</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.asMin" @input="props.onDraft({ asMin: ($event.target as HTMLInputElement).value })">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.asMax" @input="props.onDraft({ asMax: ($event.target as HTMLInputElement).value })">
        </span>
      </div>
      <div v-if="online" class="sg-field">
        <label>聊天风险</label>
        <span class="qc-numpair">
          <input class="sg-input" placeholder="最小" :value="draft.crMin" @input="props.onDraft({ crMin: ($event.target as HTMLInputElement).value })">
          <i>~</i>
          <input class="sg-input" placeholder="最大" :value="draft.crMax" @input="props.onDraft({ crMax: ($event.target as HTMLInputElement).value })">
        </span>
      </div>
      <div class="sg-field">
        <label>时间范围</label>
        <BubbleSelect
          class-name="sg-select"
          :value="RANGE_LABELS.find((r) => r.key === draft.range)?.label ?? '自定义'"
          :options="RANGE_LABELS.map((r) => r.label)"
          @change="(v: string) => props.onDraft({ range: RANGE_LABELS.find((r) => r.label === v)?.key ?? 'custom' })"
        />
      </div>
      <div v-if="draft.range === 'custom'" class="sg-field">
        <label>日期区间</label>
        <QcDateRangePicker :custom="draft.custom" :on-change="(d) => props.onDraft({ custom: d })" />
      </div>
      <div class="sg-field-actions" :class="{ 'sg-acts-row': online }">
        <button v-if="online" class="sg-btn" @click="pushToast('已下载导入模板，上传后自动解析')">
          导入
        </button>
        <button v-if="online" class="sg-btn" @click="pushToast(`已导出 ${props.series.length} 条系列数据`)">
          导出
        </button>
        <button class="sg-btn" @click="props.onReset">
          重置
        </button>
        <button class="sg-btn primary" @click="props.onQuery">
          查询
        </button>
      </div>
    </div>
  </div>
  <div class="qc-body">
    <table class="table qc-wide">
      <thead>
        <tr>
          <th style="width: 40px" />
          <th style="width: 140px">系列编码</th>
          <template v-if="online">
            <SortTh class="qc-pick-th" label="订单数据" width="190px" :state="sortState(orderMetric)" @sort="openPick = openPick === 'order' ? null : 'order'">
              <span v-if="openPick === 'order'" class="qc-sort-pick-menu">
                <span
                  v-for="m in ORDER_SORT_METRICS" :key="m.key"
                  class="qc-sort-pick-opt" :class="{ active: m.key === orderMetric }"
                  @click.stop="onPickMetric(m.key)"
                >
                  {{ m.label }}
                  <span class="qc-sort-pick-dir">
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir(m.key, false)">升序</span>
                    <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir(m.key, true)">降序</span>
                  </span>
                </span>
                <span v-if="sortState(orderMetric) !== 'none'" class="qc-sort-pick-clear" @click.stop="props.onClearSort(); openPick = null">清除排序</span>
              </span>
            </SortTh>
          </template>
          <template v-else>
            <SortTh label="订单量" width="110px" :state="sortState('orders')" @sort="props.onToggleSort('orders')" />
            <SortTh label="退款率" width="90px" :state="sortState('refundRate')" @sort="props.onToggleSort('refundRate')" />
            <SortTh label="售后单" width="90px" :state="sortState('afterSales')" @sort="props.onToggleSort('afterSales')" />
          </template>
          <SortTh v-if="online" class="qc-pick-th" label="聊天数据" width="150px" :state="sortState(chatMetric)" @sort="openPick = openPick === 'chat' ? null : 'chat'">
            <span v-if="openPick === 'chat'" class="qc-sort-pick-menu">
              <span
                v-for="m in CHAT_SORT_METRICS" :key="m.key"
                class="qc-sort-pick-opt" :class="{ active: m.key === chatMetric }"
                @click.stop="onPickMetric(m.key)"
              >
                {{ m.label }}
                <span class="qc-sort-pick-dir">
                  <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'asc' }" @click.stop="onPickDir(m.key, false)">升序</span>
                  <span class="qc-dir-txt" :class="{ on: sortState(m.key) === 'desc' }" @click.stop="onPickDir(m.key, true)">降序</span>
                </span>
              </span>
              <span v-if="sortState(chatMetric) !== 'none'" class="qc-sort-pick-clear" @click.stop="props.onClearSort(); openPick = null">清除排序</span>
            </span>
          </SortTh>
          <template v-else>
            <SortTh label="聊天风险" width="90px" :state="sortState('chatRiskHits')" @sort="props.onToggleSort('chatRiskHits')" />
            <th style="width: 110px">聊天风险率</th>
          </template>
          <th style="width: 230px">上架平台</th>
          <th>命中问题类型</th>
          <th v-if="!online" style="width: 90px">健康等级</th>
          <th v-if="!online" style="width: 180px">命中标签</th>
          <th style="width: 230px">问题涉及部门</th>
          <th style="width: 110px">责任部门</th>
          <th v-if="online" style="width: 100px">运维归属</th>
          <th style="width: 120px">操作</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="s in rows" :key="s.seriesCode">
          <QcSeriesRow
            :series="s"
            :open="expanded.has(s.seriesCode)"
            :on-toggle="() => toggle(s.seriesCode)"
            :on-detail="() => props.onDetail(s)"
            :on-chat="(codes, platforms, platform) => props.onChat(codes, platforms, platform)"
            :on-trend="() => props.onTrend(s)"
            :on-trend-stat="props.onTrendStat"
            :duty="dutyMap[s.seriesCode] ?? defaultDutyDept(s)"
            :has-override="!!dutyMap[s.seriesCode]"
            :on-duty="props.onDuty"
            :online="online"
            :scope-dept="rowScope"
            :on-pick-type="(t: string) => props.onPickType?.(s, t)"
            :on-pick-dept="(d: string) => props.onPickDept?.(s, d)"
          />
        </template>
        <tr v-if="rows.length === 0">
          <td :colspan="online ? 10 : 14" style="text-align: center; color: var(--text-4); padding: 40px 0">无匹配系列</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div v-if="online" class="ib-pagination">
    <div class="ib-pageinfo">共 {{ series.length }} 条</div>
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
</template>
