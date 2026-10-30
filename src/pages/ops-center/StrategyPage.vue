<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { stStrategies, dsStrategies, ACT_TYPES_DEFAULT, ACT_TYPES_SHIPINHAO, ST_PLATS, DS_PLATS, type StStrategy, type DsStrategy } from './strategyData';
import { PLATFORM_LOGO } from './data';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';
import DsStrategyDrawer from './DsStrategyDrawer.vue';

/** 商品策略页：发布策略 / 动销策略 两 tab（优惠券策略已迁至 商品营销›优惠券） */
const tab = ref<'pub' | 'ds'>('pub');

const STATUS_OPTIONS = ['启用中', '停用'];
const ACT_TYPE_OPTIONS = [...ACT_TYPES_DEFAULT, ...ACT_TYPES_SHIPINHAO];
const MODE_OPTIONS = ['控利润率', '控利润', '控活动价利润'];
const PROMO_OPTIONS = ['是', '否'];

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};
/* 日期区间命中：创建日（YYYY/MM/DD 归一为 ISO）落在 from~to 内 */
const dayIn = (createdAt: string, from: string, to: string) => {
  const day = createdAt.slice(0, 10).replace(/\//g, '-');
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
};

/* ---------- 发布策略 ---------- */
const emptyFilter = { name: '', plat: '', creator: '', status: '', activityType: '', mode: '', promoted: '', dateFrom: '', dateTo: '' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };

/* 导航到策略表单页 */
const opsGo = inject<(target: string) => void>('opsGo', () => {});
const opsEditStrategy = inject<(s: StStrategy | undefined) => void>('opsEditStrategy', () => {});
const openStrategyForm = () => { opsEditStrategy(undefined); opsGo('strategyForm' as any); };
const openDetail = (s: StStrategy) => { opsEditStrategy(s); opsGo('strategyForm' as any); };

const list = ref<StStrategy[]>([...stStrategies]);

/* 列表字段管理：无勾选列，全部数据列可管；百分比宽表 sticky=false */
const cf = useColField('strategy', {
  fixedLeft: [],
  fields: [
    { key: 'name', label: '策略名称', pct: 16.66 },
    { key: 'status', label: '状态', pct: 16.66 },
    { key: 'activity', label: '活动信息', pct: 16.66 },
    { key: 'mode', label: '控利模式', pct: 16.66 },
    { key: 'created', label: '创建信息', pct: 16.66 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', pct: 16 }],
  sticky: false,
});
const { midCols } = cf;

const rows = computed(() => {
  const out = list.value.filter((s) => {
    if (applied.value.name && !s.name.includes(applied.value.name)) return false;
    if (applied.value.plat && !s.platforms.includes(applied.value.plat)) return false;
    if (applied.value.creator && !s.creator.includes(applied.value.creator)) return false;
    if (applied.value.status && s.status !== applied.value.status) return false;
    if (applied.value.activityType && s.activityType !== applied.value.activityType) return false;
    if (applied.value.mode && s.mode !== applied.value.mode) return false;
    if (applied.value.promoted && s.promoted !== applied.value.promoted) return false;
    return true;
  });
  /* 创建信息列按创建时间排序（点击循环 降序 → 升序 → 取消） */
  if (sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir);
  }
  return out;
});

/* 排序状态：单列（创建时间）激活，点击循环 desc → asc → 取消 */
const sortDir = ref<'none' | 'asc' | 'desc'>('none');
const onSort = () => {
  if (sortDir.value === 'none') sortDir.value = 'desc';
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else sortDir.value = 'none';
};
const sortState = () => sortDir.value;

const toggleStatus = (s: StStrategy) => {
  s.status = s.status === '启用中' ? '停用' : '启用中';
  pushToast(s.status === '启用中' ? '策略已启用' : '策略已停用');
};

const removeRow = (s: StStrategy) => {
  list.value = list.value.filter((x) => x.id !== s.id);
  pushToast('策略已删除');
};

/* ---------- 动销策略 ---------- */
const dsEmpty = { name: '', plat: '', creator: '', status: '', dateFrom: '', dateTo: '' };
const dsFilter = ref({ ...dsEmpty });
const dsApplied = ref({ ...dsEmpty });
const doDsSearch = () => { dsApplied.value = { ...dsFilter.value }; };
const doDsReset = () => { dsFilter.value = { ...dsEmpty }; dsApplied.value = { ...dsEmpty }; };

const dsList = ref<DsStrategy[]>([...dsStrategies]);
const cfDs = useColField('strategyDs', {
  fixedLeft: [],
  fields: [
    { key: 'name', label: '策略名称/状态', pct: 12.5 },
    { key: 'ladder', label: '利润率设置', pct: 12.5 },
    { key: 'firstRise', label: '初始涨价', pct: 12.5 },
    { key: 'rise', label: '再涨价判断', pct: 12.5 },
    { key: 'cut', label: '降价判断', pct: 12.5 },
    { key: 'back', label: '回退规则', pct: 12.5 },
    { key: 'created', label: '创建人/创建时间', pct: 12.5 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', pct: 12.5 }],
  sticky: false,
});

const dsRows = computed(() => {
  const out = dsList.value.filter((s) => {
    if (dsApplied.value.name && !s.name.includes(dsApplied.value.name)) return false;
    if (dsApplied.value.plat && !s.platforms.includes(dsApplied.value.plat)) return false;
    if (dsApplied.value.creator && !s.creator.includes(dsApplied.value.creator)) return false;
    if (dsApplied.value.status && s.status !== dsApplied.value.status) return false;
    if (!dayIn(s.createdAt, dsApplied.value.dateFrom, dsApplied.value.dateTo)) return false;
    return true;
  });
  if (dsSortDir.value !== 'none') {
    const dir = dsSortDir.value === 'asc' ? 1 : -1;
    return [...out].sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir);
  }
  return out;
});
const dsSortDir = ref<'none' | 'asc' | 'desc'>('none');
const onDsSort = () => {
  if (dsSortDir.value === 'none') dsSortDir.value = 'desc';
  else if (dsSortDir.value === 'desc') dsSortDir.value = 'asc';
  else dsSortDir.value = 'none';
};
const dsSortState = () => dsSortDir.value;

/* 利润率阶梯不强制两位小数：去尾零显示（5.00 → 5、1.50 → 1.5） */
const trimNum = (v: string) => (v.trim() === '' || Number.isNaN(Number(v)) ? v : String(parseFloat(v)));

const dsToggle = (s: DsStrategy) => {
  s.status = s.status === '启用中' ? '停用' : '启用中';
  pushToast(s.status === '启用中' ? '策略已启用' : '策略已停用');
};
const dsRemove = (s: DsStrategy) => {
  dsList.value = dsList.value.filter((x) => x.id !== s.id);
  pushToast('策略已删除');
};

/* 新建/详情抽屉：model 为空＝新建态 */
const dsOpen = ref(false);
const dsModel = ref<DsStrategy | null>(null);
const openDsCreate = () => { dsModel.value = null; dsOpen.value = true; };
const openDsDetail = (s: DsStrategy) => { dsModel.value = s; dsOpen.value = true; };
const onDsSave = (d: Omit<DsStrategy, 'id' | 'creator' | 'createdAt' | 'status' | 'platforms'>) => {
  dsList.value.push({ id: `ds${Date.now()}`, platforms: [...DS_PLATS], status: '启用中', creator: '七妮妮', createdAt: nowStr(), ...d });
  dsOpen.value = false;
};

/* tab 计数：各列表当前条数 */
const TABS = [
  { key: 'pub' as const, label: '发布策略' },
  { key: 'ds' as const, label: '动销策略' },
];
</script>

<template>
  <div class="sg-page st-page">
    <!-- 页头 -->
    <div class="st-head">
      <span class="st-head-t">商品策略</span>
    </div>

    <!-- 策略类型 tab：发布 / 动销（下划线式，复用全局 .sg-tabs/.sg-tab） -->
    <div class="sg-tabs st-tabs">
      <button v-for="t in TABS" :key="t.key" type="button" class="sg-tab" :class="{ active: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
    </div>

    <!-- ========== 发布策略 ========== -->
    <template v-if="tab === 'pub'">
      <div class="sg-filter">
        <div class="sg-grid st-grid">
          <div class="sg-field">
            <label>策略名称</label>
            <span class="sg-inputwrap">
              <input class="sg-input" placeholder="策略名称" :value="filter.name" @input="filter.name = ($event.target as HTMLInputElement).value" />
              <button v-if="filter.name" type="button" class="sg-clear" title="清除" @click="filter.name = ''; doSearch()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="sg-field">
            <label>适用平台</label>
            <BubbleSelect class-name="sg-select" default-value="适用平台" :options="ST_PLATS" @change="(v: string) => (filter.plat = v)" />
          </div>
          <div class="sg-field">
            <label>创建人名称</label>
            <span class="sg-inputwrap">
              <input class="sg-input" placeholder="创建人名称" :value="filter.creator" @input="filter.creator = ($event.target as HTMLInputElement).value" />
              <button v-if="filter.creator" type="button" class="sg-clear" title="清除" @click="filter.creator = ''; doSearch()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="sg-field">
            <label>策略状态</label>
            <BubbleSelect class-name="sg-select" default-value="策略状态" :options="STATUS_OPTIONS" @change="(v: string) => (filter.status = v)" />
          </div>
          <div class="sg-field">
            <label>活动类型</label>
            <BubbleSelect class-name="sg-select" default-value="活动类型" :options="ACT_TYPE_OPTIONS" @change="(v: string) => (filter.activityType = v)" />
          </div>
          <div class="sg-field">
            <label>控利模式</label>
            <BubbleSelect class-name="sg-select" default-value="控利模式" :options="MODE_OPTIONS" @change="(v: string) => (filter.mode = v)" />
          </div>
          <div class="sg-field">
            <label>是否推广</label>
            <BubbleSelect class-name="sg-select" default-value="是否推广" :options="PROMO_OPTIONS" @change="(v: string) => (filter.promoted = v)" />
          </div>
          <div class="sg-field">
            <label>创建时间</label>
            <DateRangePicker v-model:from="filter.dateFrom" v-model:to="filter.dateTo" placeholder="创建开始时间 → 创建结束时间" />
          </div>
          <div class="sg-actions">
            <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
            <ColFieldPop :st="cf" />
            <button class="sg-btn primary" @click="openStrategyForm">新建策略</button>
            <button class="sg-btn" @click="doReset">重置</button>
            <button class="sg-btn primary" @click="doSearch">查询</button>
          </div>
        </div>
      </div>

      <div class="sg-card">
        <div :style="{ overflow: 'auto' }">
          <table class="sg-table st-table">
            <thead>
              <tr>
                <template v-for="c in midCols" :key="c.key">
                  <SortTh v-if="c.key === 'created'" :label="c.label" :width="`${c.pct}%`" :state="sortState()" @sort="onSort" />
                  <th v-else :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
                </template>
                <th :style="{ width: '16.66%' }">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in rows" :key="s.id">
                <template v-for="c in midCols" :key="c.key">
                  <td v-if="c.key === 'name'">
                    <div class="st-name">{{ s.name }}</div>
                    <div class="st-plats">
                      <img v-for="p in s.platforms" :key="p" :src="PLATFORM_LOGO[p]" :title="p" />
                      <span v-if="s.platforms.length === 0">—</span>
                    </div>
                  </td>
                  <td v-else-if="c.key === 'status'">
                    <div class="sg-status">
                      <span class="sg-dot" :style="{ background: s.status === '启用中' ? '#16a34a' : '#ef4444' }" />
                      <span>{{ s.status }}</span>
                    </div>
                  </td>
                  <td v-else-if="c.key === 'activity'">
                    <div class="st-kv"><span>报入活动：</span><b>{{ s.joinActivity }}</b></div>
                    <div class="st-kv"><span>活动类型：</span><b>{{ s.activityType }}</b></div>
                  </td>
                  <td v-else-if="c.key === 'mode'">
                    <div class="st-kv"><span>控制模式：</span><b>{{ s.mode }}</b></div>
                    <div class="st-kv"><span>利润设置：</span><b>{{ s.rate }}</b></div>
                  </td>
                  <td v-else-if="c.key === 'created'">
                    <div class="st-created" :title="'创建人：' + s.creator + '　创建时间：' + s.createdAt"><span>{{ s.creator }}</span><span>{{ s.createdAt }}</span></div>
                  </td>
                </template>
                <td>
                  <div class="st-acts">
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="openDetail(s)">详情</a>
                    <a class="sg-link" :class="{ danger: s.status === '启用中' }" href="javascript:void(0)" @click.prevent="toggleStatus(s)">{{ s.status === '启用中' ? '禁用' : '启用' }}</a>
                    <a class="sg-link danger" href="javascript:void(0)" @click.prevent="removeRow(s)">删除</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="rows.length === 0" class="sg-empty">
            <div class="sg-empty-wrap">
              <div class="sg-empty-icon">◌</div>
              <div>暂无数据，请调整筛选条件</div>
            </div>
          </div>
        </div>
        <div class="ib-pagination">
          <div class="ib-pageinfo">共 {{ rows.length }} 条</div>
          <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
          <div class="ib-pages">
            <button class="ib-pagebtn nav">‹</button>
            <button class="ib-pagebtn active">1</button>
            <button class="ib-pagebtn nav">›</button>
          </div>
          <div class="ib-jump">
            <span>前往</span>
            <input class="ib-jump-input" value="1" />
            <span>页</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ========== 动销策略 ========== -->
    <template v-else-if="tab === 'ds'">
      <div class="sg-filter">
        <div class="sg-grid st-grid">
          <div class="sg-field">
            <label>策略名称</label>
            <span class="sg-inputwrap">
              <input class="sg-input" placeholder="策略名称" :value="dsFilter.name" @input="dsFilter.name = ($event.target as HTMLInputElement).value" />
              <button v-if="dsFilter.name" type="button" class="sg-clear" title="清除" @click="dsFilter.name = ''; doDsSearch()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="sg-field">
            <label>适用平台</label>
            <BubbleSelect class-name="sg-select" default-value="适用平台" :options="DS_PLATS" @change="(v: string) => (dsFilter.plat = v)" />
          </div>
          <div class="sg-field">
            <label>策略状态</label>
            <BubbleSelect class-name="sg-select" default-value="策略状态" :options="STATUS_OPTIONS" @change="(v: string) => (dsFilter.status = v)" />
          </div>
          <div class="sg-field">
            <label>创建人名称</label>
            <span class="sg-inputwrap">
              <input class="sg-input" placeholder="创建人名称" :value="dsFilter.creator" @input="dsFilter.creator = ($event.target as HTMLInputElement).value" />
              <button v-if="dsFilter.creator" type="button" class="sg-clear" title="清除" @click="dsFilter.creator = ''; doDsSearch()">
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
              </button>
            </span>
          </div>
          <div class="sg-field">
            <label>创建时间</label>
            <DateRangePicker v-model:from="dsFilter.dateFrom" v-model:to="dsFilter.dateTo" placeholder="创建开始时间 → 创建结束时间" />
          </div>
          <div class="sg-actions">
            <ColFieldPop :st="cfDs" />
            <button class="sg-btn primary" @click="openDsCreate">新建策略</button>
            <button class="sg-btn" @click="doDsReset">重置</button>
            <button class="sg-btn primary" @click="doDsSearch">查询</button>
          </div>
        </div>
      </div>

      <div class="sg-card">
        <div :style="{ overflow: 'auto' }">
          <table class="sg-table st-table">
            <thead>
              <tr>
                <template v-for="c in cfDs.midCols.value" :key="c.key">
                  <SortTh v-if="c.key === 'created'" :label="c.label" :width="`${c.pct}%`" :state="dsSortState()" @sort="onDsSort" />
                  <th v-else :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
                </template>
                <th :style="{ width: '12.5%' }">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in dsRows" :key="s.id">
                <template v-for="c in cfDs.midCols.value" :key="c.key">
                  <td v-if="c.key === 'name'">
                    <div class="st-name">{{ s.name }}</div>
                    <!-- 状态下沉到名称下方＝开关形式（开=启用中/关=停用，点击即启停）；动销仅视频号，首列不展示平台图标 -->
                    <span class="st-switchrow">
                      <button
                        type="button"
                        class="st-switch"
                        :class="{ on: s.status === '启用中' }"
                        :title="s.status === '启用中' ? '点击停用' : '点击启用'"
                        :aria-label="s.status === '启用中' ? '停用策略' : '启用策略'"
                        @click="dsToggle(s)"
                      ><i /></button>
                      <span class="st-switchtext">{{ s.status }}</span>
                    </span>
                  </td>
                  <td v-else-if="c.key === 'ladder'">
                    <div class="st-kv w72"><span>最低利润：</span><b>{{ trimNum(s.floorRate) }}%</b></div>
                    <div class="st-kv w72"><span>最高利润率：</span><b>{{ trimNum(s.targetRate) }}%</b></div>
                    <div class="st-kv w72"><span>每档涨幅：</span><b>{{ trimNum(s.stepRate) }}%</b></div>
                  </td>
                  <td v-else-if="c.key === 'firstRise'">
                    <div class="st-kv w72"><span>触发条件：</span><b>出单即涨</b></div>
                    <div class="st-kv w72"><span>涨幅：</span><b>{{ trimNum(s.stepRate) }}%</b></div>
                  </td>
                  <td v-else-if="c.key === 'rise'">
                    <div v-for="(rc, ri) in s.riseConds" :key="ri" class="st-kv w72"><span>{{ rc.metric }}：</span><b>{{ rc.op }} {{ trimNum(rc.val) }}{{ rc.unit }}</b></div>
                  </td>
                  <td v-else-if="c.key === 'cut'">
                    <div v-for="(cc, ci) in s.cutConds" :key="ci" class="st-kv w72"><span>{{ cc.metric }}：</span><b>{{ cc.op }} {{ trimNum(cc.val) }}{{ cc.unit }}</b></div>
                  </td>
                  <td v-else-if="c.key === 'back'">
                    <div class="st-kv w72"><span>调价后观察：</span><b>{{ s.observeDays }}天</b></div>
                    <div class="st-kv w72"><span>回退幅度：</span><b>{{ s.rollbackPct }}%</b></div>
                    <div class="st-kv w72"><span>停止调价：</span><b>{{ s.zeroTimeoutDays }}天</b></div>
                  </td>
                  <td v-else-if="c.key === 'created'">
                    <!-- 创建信息按图二两行叠排：创建人在上、创建时间在下 -->
                    <div class="st-created stack"><span>{{ s.creator }}</span><span>{{ s.createdAt }}</span></div>
                  </td>
                </template>
                <td>
                  <!-- 启停已由名称下开关接管，操作列保留详情/删除 -->
                  <div class="st-acts">
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="openDsDetail(s)">详情</a>
                    <a class="sg-link danger" href="javascript:void(0)" @click.prevent="dsRemove(s)">删除</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="dsRows.length === 0" class="sg-empty">
            <div class="sg-empty-wrap">
              <div class="sg-empty-icon">◌</div>
              <div>暂无数据，请调整筛选条件</div>
            </div>
          </div>
        </div>
        <div class="ib-pagination">
          <div class="ib-pageinfo">共 {{ dsRows.length }} 条</div>
          <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
          <div class="ib-pages">
            <button class="ib-pagebtn nav">‹</button>
            <button class="ib-pagebtn active">1</button>
            <button class="ib-pagebtn nav">›</button>
          </div>
          <div class="ib-jump">
            <span>前往</span>
            <input class="ib-jump-input" value="1" />
            <span>页</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 动销 新建与详情抽屉 -->
    <DsStrategyDrawer v-if="dsOpen" :model="dsModel" @close="dsOpen = false" @save="onDsSave" />
  </div>
</template>

<style scoped>
/* 页头：蓝竖条标题 + 灰色副说明 */
.st-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.st-head-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #202532);
}

.st-head-t::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary, #4f7cff);
  border-radius: 2px;
}

/* 策略类型 tab：下划线式，样式复用全局 .ops-center .sg-tabs / .sg-tab（图二） */

/* 适用平台子行：官方图标横排，不加文字标签 */
.st-plats {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.st-plats img {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

/* 五字标签列：定宽贴最长标签（全局 60px 仅够四字） */
.st-kv.w72 span {
  width: 72px;
}

/* 创建信息单行：创建人＋时间不换行，悬浮 title 看带标签全文 */
.st-created {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}

.st-created span + span {
  color: var(--color-text-3, #8b92a1);
}

/* 创建信息两行叠排（图二）：创建人在上、创建时间在下（次级字号） */
.st-created.stack {
  flex-direction: column;
  gap: 4px;
}

.st-created.stack span + span {
  font-size: var(--fs-aux);
}

/* 名称/状态合并列：状态行与名称行、平台行同呼吸间距 */
.st-name + .sg-status {
  margin-top: 4px;
}

/* 名称下状态开关：同 mv-switch 规格（34x18 圆轨/14 圆钮/开=成功色），右侧状态文字次级色 */
.st-switchrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.st-switch {
  position: relative;
  width: 34px;
  height: 18px;
  flex: none;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: #c6ccd8;
  cursor: pointer;
  transition: background 0.15s;
}

.st-switch i {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(31, 39, 51, 0.2);
  transition: left 0.15s;
}

.st-switch.on {
  background: var(--color-success);
}

.st-switch.on i {
  left: 18px;
}

.st-switchtext {
  font-size: var(--fs-aux);
  color: var(--color-text-2, #445066);
}

/* 操作列竖排 */
.st-acts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
</style>
