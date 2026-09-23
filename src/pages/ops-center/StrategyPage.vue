<script setup lang="ts">
import { computed, inject, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import { pushToast } from '../../components/toast';
import { stStrategies, type StStrategy } from './strategyData';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/** 商品策略页：策略管理列表（冲量相关字段按需求删除） */
const TYPE_OPTIONS = ['淘宝平台策略', '视频号平台策略', '通用类型'];
const STATUS_OPTIONS = ['启用中', '停用'];
const ACT_TYPE_OPTIONS = ['顺买', '秒杀'];
const MODE_OPTIONS = ['控利润率', '控利润', '控活动价利润'];
const PROMO_OPTIONS = ['是', '否'];

const emptyFilter = { name: '', type: '', creator: '', status: '', activityType: '', mode: '', promoted: '', dateFrom: '', dateTo: '' };
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
    { key: 'name', label: '策略名称', pct: 24 },
    { key: 'status', label: '状态', pct: 8 },
    { key: 'activity', label: '活动信息', pct: 14 },
    { key: 'mode', label: '控利模式', pct: 18 },
    { key: 'created', label: '创建信息', pct: 20 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', pct: 16 }],
  sticky: false,
});
const { midCols } = cf;

const rows = computed(() => list.value.filter((s) => {
  if (applied.value.name && !s.name.includes(applied.value.name)) return false;
  if (applied.value.type && s.type !== applied.value.type) return false;
  if (applied.value.creator && !s.creator.includes(applied.value.creator)) return false;
  if (applied.value.status && s.status !== applied.value.status) return false;
  if (applied.value.activityType && s.activityType !== applied.value.activityType) return false;
  if (applied.value.mode && s.mode !== applied.value.mode) return false;
  if (applied.value.promoted && s.promoted !== applied.value.promoted) return false;
  return true;
}));

const toggleStatus = (s: StStrategy) => {
  s.status = s.status === '启用中' ? '停用' : '启用中';
  pushToast(s.status === '启用中' ? '策略已启用' : '策略已停用');
};

const removeRow = (s: StStrategy) => {
  list.value = list.value.filter((x) => x.id !== s.id);
  pushToast('策略已删除');
};
</script>

<template>
  <div class="sg-page st-page">
    <!-- 页头 -->
    <div class="st-head">
      <span class="st-head-t">商品策略</span>
      <span class="st-head-sub">商品导入时选择策略玩法，一键填充价格配置信息</span>
    </div>

    <div class="sg-filter">
      <div class="sg-grid st-grid">
        <div class="sg-field">
          <label>策略名称</label>
          <input class="sg-input" placeholder="策略名称" :value="filter.name" @input="filter.name = ($event.target as HTMLInputElement).value" />
        </div>
        <div class="sg-field">
          <label>策略类型</label>
          <BubbleSelect class-name="sg-select" default-value="策略类型" :options="TYPE_OPTIONS" @change="(v: string) => (filter.type = v)" />
        </div>
        <div class="sg-field">
          <label>创建人名称</label>
          <input class="sg-input" placeholder="创建人名称" :value="filter.creator" @input="filter.creator = ($event.target as HTMLInputElement).value" />
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
                <th :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
              </template>
              <th :style="{ width: '16%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in rows" :key="s.id">
              <template v-for="c in midCols" :key="c.key">
                <td v-if="c.key === 'name'">
                  <div class="st-name">{{ s.name }}</div>
                  <div class="st-kv"><span>策略类型：</span><b>{{ s.type }}</b></div>
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
                  <div class="st-kv"><span>创建人：</span><b>{{ s.creator }}</b></div>
                  <div class="st-kv"><span>创建时间：</span><b>{{ s.createdAt }}</b></div>
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

.st-head-sub {
  font-size: var(--fs-aux, 12px);
  color: var(--color-text-3, #8b92a1);
}

/* 操作列竖排 */
.st-acts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
</style>
