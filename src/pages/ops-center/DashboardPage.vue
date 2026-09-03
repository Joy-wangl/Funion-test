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
/* 日历类型：day=单日日历 week=周选日历 month=月选日历 range=自定义区间双面板 */
const calType = ref<'' | 'day' | 'week' | 'month' | 'range'>('');
const yearCursor = ref(new Date(2026, 0, 1));
const selWeek = ref<{ s: Date; e: Date } | null>(null);
const selMonth = ref<Date | null>(null);
const hoverWeek = ref(0);

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
  if (timebarRef.value && !timebarRef.value.contains(t)) calType.value = '';
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
  calType.value = '';
  active.value = new Date(2026, 7, 12);
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
  calType.value = '';
  mode.value = 'custom';
};

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

/* 日/周/月：打开对应日历（再点收起），交互与风格同图一 */
const onGran = (g: 'd' | 'w' | 'm') => {
  gran.value = g;
  const t = g === 'd' ? 'day' : g === 'w' ? 'week' : 'month';
  calType.value = calType.value === t ? '' : t;
  hoverWeek.value = 0;
  cursor.value = new Date(active.value.getFullYear(), active.value.getMonth(), 1);
  yearCursor.value = new Date(active.value.getFullYear(), 0, 1);
};

/* 日：单日日历点选一天 */
const pickDay = (d: Date) => {
  active.value = d;
  dateText.value = fmt(d);
  mode.value = 'day';
  gran.value = 'd';
  calType.value = '';
};

/* 周：点选所在周 周一~周日 */
const pickWeek = (d: Date) => {
  const s = mondayOf(d);
  const e = addDays(s, 6);
  selWeek.value = { s, e };
  active.value = e;
  dateText.value = `${fmt(s)} ~ ${fmt(e)}`;
  mode.value = 'week';
  gran.value = 'w';
  calType.value = '';
};

/* 月：点选自然月 */
const pickMonth = (mi: number) => {
  const d = new Date(yearCursor.value.getFullYear(), mi, 1);
  selMonth.value = d;
  active.value = d;
  dateText.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  mode.value = 'month';
  gran.value = 'm';
  calType.value = '';
};

/* 周选日历单元格：悬停/选中周 两端实心+中间浅色（图一样式） */
const weekCellCls = (d: Date) => {
  let cls = 'day' + (d.getMonth() !== cursor.value.getMonth() ? ' muted' : '');
  const wm = hoverWeek.value || (selWeek.value ? +mondayOf(selWeek.value.s) : 0);
  if (wm && +mondayOf(d) === wm) {
    const wd = (d.getDay() + 6) % 7;
    cls += wd === 0 || wd === 6 ? ' sel' : ' range';
  }
  return cls;
};

/* ‹ ›：按当前模式粒度前后移（日±1天 / 周±7天 / 月±1月 / 区间±1天） */
const shift = (dir: number) => {
  if (mode.value === 'month') {
    const [y, mo] = dateText.value.split('-').map(Number);
    const d = new Date(y || 2026, ((mo || 1) - 1) + dir, 1);
    selMonth.value = d;
    active.value = d;
    dateText.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    return;
  }
  if (mode.value === 'week' && selWeek.value) {
    const s = addDays(selWeek.value.s, dir * 7);
    const e = addDays(s, 6);
    selWeek.value = { s, e };
    active.value = e;
    dateText.value = `${fmt(s)} ~ ${fmt(e)}`;
    return;
  }
  if (mode.value === '7' || mode.value === '30') {
    const e = addDays(active.value, dir);
    active.value = e;
    dateText.value = `${fmt(addDays(e, mode.value === '7' ? -6 : -29))} ~ ${fmt(e)}`;
    return;
  }
  if (mode.value === 'custom' && start.value && end.value) {
    start.value = addDays(start.value, dir);
    end.value = addDays(end.value, dir);
    active.value = end.value;
    dateText.value = `${fmt(start.value)} ~ ${fmt(end.value)}`;
    return;
  }
  const d = addDays(active.value, dir);
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
    <div class="dash-line">
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
      <button class="tb gran" :class="gran === 'd' ? 'active' : ''" @click="onGran('d')">
        日
      </button>
      <button class="tb gran" :class="gran === 'w' ? 'active' : ''" @click="onGran('w')">
        周
      </button>
      <button class="tb gran" :class="gran === 'm' ? 'active' : ''" @click="onGran('m')">
        月
      </button>
      <button
        class="tb"
        @click="calType = calType === 'range' ? '' : 'range'"
      >
        自定义ⓘ
      </button>
      <button class="tb" @click="shift(-1)">
        ‹
      </button>
      <button class="tb" @click="shift(1)">
        ›
      </button>
      <div class="calendar" :class="{ show: !!calType, narrow: calType !== '' && calType !== 'range' }">
        <!-- 日：单日日历，点选一天 -->
        <div v-if="calType === 'day'" class="cal-panel">
          <div class="chead">
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
            </div>
            <div class="ctitle">
              <span>{{ cursor.getFullYear() }}年</span>
              <span>{{ cursor.getMonth() + 1 }}月</span>
            </div>
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
            </div>
          </div>
          <div class="week">
            <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
          </div>
          <div class="days">
            <button v-for="cell in cursorDays" :key="cell.key" :class="cell.cls" @click="pickDay(cell.date)">
              {{ cell.label }}
            </button>
          </div>
        </div>

        <!-- 周：周选日历，悬停整周高亮、点选 周一~周日（图一样式） -->
        <div v-else-if="calType === 'week'" class="cal-panel">
          <div class="chead">
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() - 1, cursor.getMonth(), 1)">«</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1)">‹</button>
            </div>
            <div class="ctitle">
              <span>{{ cursor.getFullYear() }}年</span>
              <span>{{ cursor.getMonth() + 1 }}月</span>
            </div>
            <div>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)">›</button>
              <button class="cnav" @click.stop="cursor = new Date(cursor.getFullYear() + 1, cursor.getMonth(), 1)">»</button>
            </div>
          </div>
          <div class="week">
            <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
          </div>
          <div class="days" @mouseleave="hoverWeek = 0">
            <button v-for="cell in cursorDays" :key="cell.key" :class="weekCellCls(cell.date)" @mouseenter="hoverWeek = +mondayOf(cell.date)" @click="pickWeek(cell.date)">
              {{ cell.label }}
            </button>
          </div>
        </div>

        <!-- 月：月选日历，点选自然月 -->
        <div v-else-if="calType === 'month'" class="cal-panel">
          <div class="chead">
            <div>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() - 1, 0, 1)">«</button>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() - 1, 0, 1)">‹</button>
            </div>
            <div class="ctitle">
              <span>{{ yearCursor.getFullYear() }}年</span>
            </div>
            <div>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() + 1, 0, 1)">›</button>
              <button class="cnav" @click.stop="yearCursor = new Date(yearCursor.getFullYear() + 1, 0, 1)">»</button>
            </div>
          </div>
          <div class="months">
            <button
              v-for="mi in 12" :key="mi"
              :class="{ on: !!selMonth && selMonth.getFullYear() === yearCursor.getFullYear() && selMonth.getMonth() === mi - 1 }"
              @click="pickMonth(mi - 1)"
            >{{ mi }}月</button>
          </div>
        </div>

        <!-- 自定义区间：双面板日历 -->
        <template v-else>
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
        </template>
      </div>
    </div>
    <div class="dash-spacer" />
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
    </div>
    <div class="dash-line">
      <BubbleSelect
        class-name="platformSelect"
        default-value="数据模式"
        :options="['视图模式', '列表模式', '对比模式']"
        @change="(v: string) => {
          if (v && v !== '数据模式') {
            console.log('已切换视图模式：' + v);
          }
        }"
      />
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
      <BubbleSelect
        class-name="platformSelect"
        default-value="店铺"
        :options="['全部店铺', '快乐小店-佰得小站', '抖音小店-BB丽居佳/健身弹专区', '拼多多-潮眼优选的小百货']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="主管"
        :options="['全部主管', '黄亚芳', '周梦琪', '张三']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="组长"
        :options="['全部组长', '李四', '王五', '赵六']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="运营"
        :options="['全部运营', '陈鑫', '小李', '小周']"
      />
      <BubbleSelect
        class-name="platformSelect"
        default-value="助理"
        :options="['全部助理', '小陈', '小吴', '小林']"
      />
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
