<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { kpiItems, lossRows, metricNames, stockRows } from './data';
import TrendModal from './TrendModal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

const pad = (n: number) => String(n).padStart(2, '0');
const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const same = (a: Date | null, b: Date | null) =>
  Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
const dayMs = (d: Date) => +new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysDiff = (a: Date, b: Date) => Math.round((dayMs(b) - dayMs(a)) / 86400000) + 1;

const profitOptions = [
  { key: 'all', text: '全部' },
  { key: 'negative', text: '新毛六利润负' },
  { key: 'positive', text: '新毛六利润正' },
];

/* ----- 时间栏 / 日历 ----- */
const mode = ref('realtime');
const gran = ref('d');
const dateText = ref('2026-08-12');
const active = ref(new Date(2026, 7, 12));
const cursor = ref(new Date(2026, 7, 1));
const start = ref<Date | null>(null);
const end = ref<Date | null>(null);
const calOpen = ref(false);

/* ----- 指标选择 / 平台 / 利润分析 ----- */
const metricOpen = ref(false);
const selectedMetrics = ref<string[]>([...metricNames]);
const profitOpen = ref(false);
const profitFilter = ref('all');
const profitText = ref<string | null>('全部');

/* ----- 趋势弹窗 ----- */
const trendMetric = ref<string | null>(null);

const timebarRef = ref<HTMLDivElement | null>(null);
const metricWrapRef = ref<HTMLDivElement | null>(null);
const profitRef = ref<HTMLDivElement | null>(null);

const onDocClick = (e: MouseEvent) => {
  const t = e.target as Node;
  if (timebarRef.value && !timebarRef.value.contains(t)) calOpen.value = false;
  if (metricWrapRef.value && !metricWrapRef.value.contains(t)) metricOpen.value = false;
  if (profitRef.value && !profitRef.value.contains(t)) profitOpen.value = false;
};
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

function pickDate(d: Date) {
  let s = start.value;
  let e = end.value;
  if (!s || e) {
    s = d;
    e = null;
  } else {
    if (d < s) {
      e = s;
      s = d;
    } else e = d;
    if (daysDiff(s, e) > 31) {
      if (d >= s) {
        e = new Date(s);
        e.setDate(s.getDate() + 30);
      } else {
        s = new Date(e);
        s.setDate(e.getDate() - 30);
      }
      alert('最多选择 31 天');
    }
  }
  start.value = s;
  end.value = e;
  const base = s ?? d;
  cursor.value = new Date(base.getFullYear(), base.getMonth(), 1);
}

const onMode = (m: string) => {
  mode.value = m;
  if (m === 'realtime') dateText.value = '2026-08-12';
  if (m === '7') dateText.value = '2026-08-06 ~ 2026-08-12';
  if (m === '30') dateText.value = '2026-07-14 ~ 2026-08-12';
};

const onApply = () => {
  if (!start.value) return;
  let e = end.value;
  if (!e) {
    e = new Date(start.value);
    end.value = e;
  }
  dateText.value = same(start.value, e) ? fmt(start.value) : `${fmt(start.value)} ~ ${fmt(e)}`;
  calOpen.value = false;
  mode.value = 'custom';
};

const onPrevDay = () => {
  const d = new Date(active.value);
  d.setDate(d.getDate() - 1);
  active.value = d;
  dateText.value = fmt(d);
};
const onNextDay = () => {
  const d = new Date(active.value);
  d.setDate(d.getDate() + 1);
  active.value = d;
  dateText.value = fmt(d);
};

const toggleMetric = (name: string) => {
  selectedMetrics.value = selectedMetrics.value.includes(name)
    ? selectedMetrics.value.filter((m) => m !== name)
    : [...selectedMetrics.value, name];
};

const pickProfit = (key: string, text: string) => {
  profitFilter.value = key;
  profitText.value = text;
  profitOpen.value = false;
};

/* 渲染单个月份面板的 42 天 */
function daysOf(base: Date) {
  const y = base.getFullYear();
  const m = base.getMonth();
  const first = new Date(y, m, 1);
  const off = (first.getDay() + 6) % 7;
  const gs = new Date(y, m, 1 - off);
  const cells: { key: string; cls: string; label: number; date: Date }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gs);
    d.setDate(gs.getDate() + i);
    let cls = 'day' + (d.getMonth() !== m ? ' muted' : '');
    const t = dayMs(d);
    const a = start.value ? dayMs(start.value) : 0;
    const b = end.value ? dayMs(end.value) : 0;
    if (same(d, start.value) || same(d, end.value)) cls += ' sel';
    else if (start.value && end.value && t > Math.min(a, b) && t < Math.max(a, b)) cls += ' range';
    cells.push({ key: `d-${y}-${m}-${i}`, cls, label: d.getDate(), date: d });
  }
  return cells;
}

const cursorDays = computed(() => daysOf(cursor.value));
const nextMonthBase = computed(() => new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1));
const nextMonthDays = computed(() => daysOf(nextMonthBase.value));

const rangeText = computed(() => {
  if (start.value && end.value) return `已选择：${fmt(start.value)} 至 ${fmt(end.value)}`;
  if (start.value) return `已选择：${fmt(start.value)}`;
  return '已选择：--';
});

const trendKpi = computed(() => (trendMetric.value ? kpiItems.find((k) => k.metric === trendMetric.value) : undefined));
</script>

<template>
  <div class="dash-toolbar">
    <div ref="timebarRef" class="timebar">
      <span class="label">统计时间</span>
      <span class="date">{{ dateText }}</span>
      <button class="tb mode" :class="mode === 'realtime' ? 'active' : ''" @click="onMode('realtime')">
        实时
      </button>
      <button class="tb mode" :class="mode === '7' ? 'active' : ''" @click="onMode('7')">
        7天
      </button>
      <button class="tb mode" :class="mode === '30' ? 'active' : ''" @click="onMode('30')">
        30天
      </button>
      <button class="tb gran" :class="gran === 'd' ? 'active' : ''" @click="gran = 'd'">
        日
      </button>
      <button class="tb gran" :class="gran === 'w' ? 'active' : ''" @click="gran = 'w'">
        周
      </button>
      <button class="tb gran" :class="gran === 'm' ? 'active' : ''" @click="gran = 'm'">
        月
      </button>
      <button
        class="tb"
        @click="calOpen = !calOpen"
      >
        自定义ⓘ
      </button>
      <button class="tb" @click="onPrevDay">
        ‹
      </button>
      <button class="tb" @click="onNextDay">
        ›
      </button>
      <div class="calendar" :class="calOpen ? 'show' : ''">
        <div class="calendar-panels">
          <div class="cal-panel">
            <div class="chead">
              <div>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)"
                >
                  «
                </button>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)"
                >
                  ‹
                </button>
              </div>
              <div class="ctitle">
                <span>{{ cursor.getFullYear() }}年</span>
                <span>{{ cursor.getMonth() + 1 }}月</span>
              </div>
              <div />
            </div>
            <div class="week">
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
              <span>日</span>
            </div>
            <div class="days">
              <button v-for="cell in cursorDays" :key="cell.key" :class="cell.cls" @click="pickDate(cell.date)">
                {{ cell.label }}
              </button>
            </div>
          </div>
          <div class="cal-panel">
            <div class="chead">
              <div />
              <div class="ctitle">
                <span>{{ nextMonthBase.getFullYear() }}年</span>
                <span>{{ nextMonthBase.getMonth() + 1 }}月</span>
              </div>
              <div>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)"
                >
                  ›
                </button>
                <button
                  class="cnav"
                  @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)"
                >
                  »
                </button>
              </div>
            </div>
            <div class="week">
              <span>一</span>
              <span>二</span>
              <span>三</span>
              <span>四</span>
              <span>五</span>
              <span>六</span>
              <span>日</span>
            </div>
            <div class="days">
              <button v-for="cell in nextMonthDays" :key="cell.key" :class="cell.cls" @click="pickDate(cell.date)">
                {{ cell.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="cnote">* 最少选择 1 天 最多选择 31 天</div>
        <div class="cfoot">
          <div class="rangeText">{{ rangeText }}</div>
          <div>
            <button
              class="smallBtn"
              @click.stop="start = null; end = null"
            >
              清除
            </button>
            <button
              class="smallBtn primary"
              @click.stop="onApply()"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
    <button class="refresh">刷新数据</button>
    <div ref="metricWrapRef" class="metric-wrap">
      <button
        class="metric-toggle"
        @click.stop="metricOpen = !metricOpen"
      >
        指标选择 ▾
      </button>
      <div class="metric-dropdown" :class="metricOpen ? 'show' : ''">
        <div class="metrics">
          <span class="mtitle">指标选择</span>
          <button
            v-for="name in metricNames"
            :key="name"
            class="chip"
            :class="selectedMetrics.includes(name) ? 'active' : ''"
            @click.stop="toggleMetric(name)"
          >
            {{ name }}
          </button>
        </div>
      </div>
    </div>
    <div>
      <BubbleSelect
        class-name="platformSelect"
        default-value="视图模式"
        :options="['视图模式', '列表模式']"
        @change="(v: string) => {
          if (v && v !== '视图模式') {
            console.log('已切换视图模式：' + v);
          }
        }"
      />
    </div>
    <div>
      <BubbleSelect
        class-name="platformSelect"
        default-value="平台"
        :options="['平台', '全部', '淘宝C店', '视频号']"
        @change="(v: string) => {
          if (v && v !== '平台') {
            console.log('已切换平台：' + v);
          }
        }"
      />
    </div>
    <div ref="profitRef" class="profit-filter">
      <button
        class="profit-btn"
        @click.stop="profitOpen = !profitOpen"
      >
        {{ profitText ? `利润分析：${profitText} ▾` : '利润分析 ▾' }}
      </button>
      <div class="profit-menu" :class="profitOpen ? 'show' : ''">
        <div
          v-for="opt in profitOptions"
          :key="opt.key"
          class="profit-option"
          :class="profitFilter === opt.key ? 'active' : ''"
          @click.stop="pickProfit(opt.key, opt.text)"
        >
          {{ opt.text }}
        </div>
      </div>
    </div>
  </div>

  <div class="kpis">
    <div
      v-for="kpi in kpiItems"
      :key="kpi.metric"
      class="card kpi"
      :class="selectedMetrics.includes(kpi.metric) ? '' : 'hidden'"
      @click="trendMetric = kpi.metric"
    >
      <div class="klabel">{{ kpi.metric }}</div>
      <div class="kval">{{ kpi.value }}</div>
      <div v-for="(seg, i) in kpi.foot" :key="i" class="kfoot" :class="seg.cls ?? ''">
        <span v-for="(line, j) in seg.lines" :key="j">
          <br v-if="j > 0" />
          {{ line }}
        </span>
      </div>
    </div>
  </div>

  <div class="dashboard-lists">
    <div class="list-card">
      <div class="list-head">
        <div>
          <h3>亏损商品</h3>
          <div class="sub">仅展示利润异常商品，便于快速排查和处理</div>
        </div>
      </div>
      <table class="list-table">
        <thead>
          <tr>
            <th :style="{ width: '56px' }">序号</th>
            <th>商品信息</th>
            <th>店铺</th>
            <th>平台</th>
            <th>销售金额</th>
            <th>新毛六利润</th>
            <th>新毛六利润率</th>
            <th>核心问题</th>
            <th>状态</th>
            <th :style="{ width: '90px' }">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in lossRows" :key="i">
            <td>{{ i + 1 }}</td>
            <td class="item-info">
              <div class="item-title">{{ row.title }}</div>
              <div class="item-meta">
                {{ row.meta[0] }}
                <br />
                {{ row.meta[1] }}
              </div>
            </td>
            <td>{{ row.store }}</td>
            <td>{{ row.platform }}</td>
            <td>{{ row.amount }}</td>
            <td>
              <span class="badge-red">{{ row.profit }}</span>
            </td>
            <td>
              <span class="badge-red">{{ row.rate }}</span>
            </td>
            <td>{{ row.problem }}</td>
            <td>
              <span :class="row.statusCls">{{ row.status }}</span>
            </td>
            <td>
              <a class="action-link" href="javascript:void(0)">
                查看
              </a>
              <a class="action-link" href="javascript:void(0)">
                处理
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="list-card">
      <div class="list-head">
        <div>
          <h3>缺货商品</h3>
          <div class="sub">仅展示库存紧张或已缺货商品，便于补货跟进</div>
        </div>
      </div>
      <table class="list-table">
        <thead>
          <tr>
            <th :style="{ width: '56px' }">序号</th>
            <th>商品信息</th>
            <th>店铺</th>
            <th>平台</th>
            <th>昨日销量</th>
            <th>近7日销量</th>
            <th>库存数</th>
            <th>风险说明</th>
            <th>状态</th>
            <th :style="{ width: '90px' }">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in stockRows" :key="i">
            <td>{{ i + 1 }}</td>
            <td class="item-info">
              <div class="item-title">{{ row.title }}</div>
              <div class="item-meta">
                {{ row.meta[0] }}
                <br />
                {{ row.meta[1] }}
              </div>
            </td>
            <td>{{ row.store }}</td>
            <td>{{ row.platform }}</td>
            <td>{{ row.yesterday }}</td>
            <td>{{ row.week7 }}</td>
            <td>
              <span :class="row.stockCls">{{ row.stock }}</span>
            </td>
            <td>{{ row.risk }}</td>
            <td>
              <span :class="row.statusCls">{{ row.status }}</span>
            </td>
            <td>
              <a class="action-link" href="javascript:void(0)">
                查看
              </a>
              <a class="action-link" href="javascript:void(0)">
                补货
              </a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <TrendModal
    v-if="trendMetric && trendKpi"
    :metric="trendMetric"
    :kpi-value-text="trendKpi.value"
    :date-text="dateText"
    :mode="mode"
    @close="trendMetric = null"
  />
</template>
