<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import { pushToast } from '../../components/toast';
import { cpStrategies, type CpStrategy } from './strategyData';
import { PUB_SHOPS } from './data';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';
import CpStrategyDrawer from './CpStrategyDrawer.vue';

/** 商品营销›优惠券：原商品策略「优惠券策略」tab 整体迁出为独立页面 */
/* 券状态词表（按领取时间派生＋作废） */
const CP_STATUS_OPTIONS = ['生效中', '未开始', '已结束', '已作废'];
const SCOPE_OPTIONS = ['全店商品', '部分商品'];
/* 店铺词表：与发布任务店铺同源（PUB_SHOPS 去重） */
const CP_SHOP_OPTIONS = [...new Set(PUB_SHOPS.map((s) => s.name))];

const cpEmpty = { shop: '', name: '', scope: '', status: '', dateFrom: '', dateTo: '' };
const cpFilter = ref({ ...cpEmpty });
const cpApplied = ref({ ...cpEmpty });
const doCpSearch = () => { cpApplied.value = { ...cpFilter.value }; };
const doCpReset = () => { cpFilter.value = { ...cpEmpty }; cpApplied.value = { ...cpEmpty }; };

const cpList = ref<CpStrategy[]>([...cpStrategies]);
/* 列表六列：优惠信息/推广场景/领取·发放/领取时间/状态/操作 */
const cfCp = useColField('strategyCp', {
  fixedLeft: [],
  fields: [
    { key: 'info', label: '优惠信息', pct: 16.66 },
    { key: 'scene', label: '推广场景', pct: 16.66 },
    { key: 'take', label: '领取/发放', pct: 16.66 },
    { key: 'time', label: '领取时间', pct: 16.66 },
    { key: 'status', label: '状态', pct: 16.66 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', pct: 16.66 }],
  sticky: false,
});

const cpRows = computed(() => cpList.value.filter((s) => {
  if (cpApplied.value.shop && s.shop !== cpApplied.value.shop) return false;
  if (cpApplied.value.name && !s.name.includes(cpApplied.value.name)) return false;
  if (cpApplied.value.scope && s.scope !== cpApplied.value.scope) return false;
  if (cpApplied.value.status && s.status !== cpApplied.value.status) return false;
  /* 领取时间与筛选区间有交集即命中 */
  if (cpApplied.value.dateFrom && s.claimTo.replace(/\//g, '-') < cpApplied.value.dateFrom) return false;
  if (cpApplied.value.dateTo && s.claimFrom.replace(/\//g, '-') > cpApplied.value.dateTo) return false;
  return true;
}));

/* 券状态按领取时间派生：未到期＝未开始、已过期＝已结束、区间内＝生效中 */
const todayStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())}`;
};
const cpStatusFor = (from: string, to: string): CpStrategy['status'] => {
  const t = todayStr();
  if (from > t) return '未开始';
  if (to < t) return '已结束';
  return '生效中';
};
const CP_DOT: Record<CpStrategy['status'], string> = { 生效中: '#16a34a', 未开始: '#4f7cff', 已结束: '#8b92a1', 已作废: '#ef4444' };

/* 领取率＝已领取÷发放张数，去尾零 */
const cpRate = (s: CpStrategy) => {
  const total = Number(s.issueCount);
  if (!total || Number.isNaN(total)) return '0';
  return String(parseFloat(((Number(s.claimed) / total) * 100).toFixed(1)));
};

const cpCopyId = (s: CpStrategy) => {
  if (navigator.clipboard) navigator.clipboard.writeText(s.couponId).catch(() => undefined);
  pushToast('券ID已复制');
};
/* 复制＝按原券再建一张：新券ID、领取归零、状态按领取时间重派生 */
const cpCopy = (s: CpStrategy) => {
  cpList.value.push({ ...s, id: `cp${Date.now()}`, couponId: String(Math.floor(1e8 + Math.random() * 9e8)), claimed: '0', status: cpStatusFor(s.claimFrom, s.claimTo) });
  pushToast('优惠券已复制');
};
const cpVoid = (s: CpStrategy) => {
  if (!window.confirm(`作废后券「${s.name}」不可再领取，确认作废？`)) return;
  s.status = '已作废';
  pushToast('优惠券已作废');
};

const cpOpen = ref(false);
const cpModel = ref<CpStrategy | null>(null);
const openCpCreate = () => { cpModel.value = null; cpOpen.value = true; };
const openCpDetail = (s: CpStrategy) => { cpModel.value = s; cpOpen.value = true; };
const onCpSave = (d: Omit<CpStrategy, 'id' | 'couponId' | 'claimed' | 'status'>) => {
  cpList.value.push({ id: `cp${Date.now()}`, couponId: String(Math.floor(1e8 + Math.random() * 9e8)), claimed: '0', status: cpStatusFor(d.claimFrom, d.claimTo), ...d });
  cpOpen.value = false;
};
</script>

<template>
  <div class="sg-page st-page">
    <!-- 页头 -->
    <div class="cp-head">
      <span class="cp-head-t">优惠券</span>
    </div>

    <div class="sg-filter">
      <div class="sg-grid st-grid">
        <div class="sg-field">
          <label>店铺</label>
          <BubbleSelect class-name="sg-select" default-value="店铺" :options="CP_SHOP_OPTIONS" @change="(v: string) => (cpFilter.shop = v)" />
        </div>
        <div class="sg-field">
          <label>券名称</label>
          <span class="sg-inputwrap">
            <input class="sg-input" placeholder="券名称" :value="cpFilter.name" @input="cpFilter.name = ($event.target as HTMLInputElement).value" />
            <button v-if="cpFilter.name" type="button" class="sg-clear" title="清除" @click="cpFilter.name = ''; doCpSearch()">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
            </button>
          </span>
        </div>
        <div class="sg-field">
          <label>适用范围</label>
          <BubbleSelect class-name="sg-select" default-value="适用范围" :options="SCOPE_OPTIONS" @change="(v: string) => (cpFilter.scope = v)" />
        </div>
        <div class="sg-field">
          <label>券状态</label>
          <BubbleSelect class-name="sg-select" default-value="券状态" :options="CP_STATUS_OPTIONS" @change="(v: string) => (cpFilter.status = v)" />
        </div>
        <div class="sg-field">
          <label>领取时间</label>
          <DateRangePicker v-model:from="cpFilter.dateFrom" v-model:to="cpFilter.dateTo" placeholder="领取开始时间 → 领取结束时间" />
        </div>
        <div class="sg-actions">
          <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
          <ColFieldPop :st="cfCp" />
          <button class="sg-btn primary" @click="openCpCreate">新增</button>
          <button class="sg-btn" @click="doCpReset">重置</button>
          <button class="sg-btn primary" @click="doCpSearch">查询</button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table st-table">
          <thead>
            <tr>
              <th v-for="c in cfCp.midCols.value" :key="c.key" :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
              <th :style="{ width: '16.66%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in cpRows" :key="s.id">
              <template v-for="c in cfCp.midCols.value" :key="c.key">
                <td v-if="c.key === 'info'">
                  <!-- 优惠信息复合列：名称+折扣空心chip / 类型与适用范围子行 / 券ID+复制 -->
                  <div class="cp-namerow">
                    <span class="st-name">{{ s.name }}</span>
                    <span class="cp-disc">{{ s.discount }}折</span>
                  </div>
                  <div class="cp-subrow">商品折扣券 | {{ s.scope === '全店商品' ? '适用全店商品' : `适用商品 ${s.goodsCount}件` }}</div>
                  <div class="cp-subrow">适用店铺 {{ s.shop }}</div>
                  <div class="cp-idrow">
                    <span>券ID {{ s.couponId }}</span>
                    <button type="button" class="cp-copybtn" title="复制券ID" @click="cpCopyId(s)">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                    </button>
                  </div>
                </td>
                <td v-else-if="c.key === 'scene'">{{ s.scene }}</td>
                <td v-else-if="c.key === 'take'">
                  <div class="cp-take">{{ s.claimed }}/{{ s.issueCount }}</div>
                  <div class="cp-subrow">领取率{{ cpRate(s) }}%</div>
                </td>
                <td v-else-if="c.key === 'time'">
                  <div class="st-kv"><span>起：</span><b>{{ s.claimFrom }}</b></div>
                  <div class="st-kv"><span>止：</span><b>{{ s.claimTo }}</b></div>
                </td>
                <td v-else-if="c.key === 'status'">
                  <div class="sg-status">
                    <span class="sg-dot" :style="{ background: CP_DOT[s.status] }" />
                    <span>{{ s.status }}</span>
                  </div>
                </td>
              </template>
              <td>
                <div class="st-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="openCpDetail(s)">详情</a>
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="cpCopy(s)">复制</a>
                  <a class="sg-link danger" href="javascript:void(0)" @click.prevent="cpVoid(s)">作废</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="cpRows.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ cpRows.length }} 条</div>
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

    <!-- 新建与详情抽屉 -->
    <CpStrategyDrawer v-if="cpOpen" :model="cpModel" @close="cpOpen = false" @save="onCpSave" />
  </div>
</template>

<style scoped>
/* 页头：蓝竖条标题（同商品策略页头语言） */
.cp-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.cp-head-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #202532);
}

.cp-head-t::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary, #4f7cff);
  border-radius: 2px;
}

/* 优惠信息复合列：名称+折扣空心chip、说明子行、券ID+复制钮 */
.cp-namerow {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-disc {
  flex: none;
  height: 20px;
  padding: 0 6px;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  background: #fff;
  font-size: var(--fs-aux);
  line-height: 18px;
  color: #ef4444;
}

.cp-subrow {
  margin-top: 4px;
  font-size: var(--fs-aux);
  color: var(--color-text-3, #8b92a1);
}

.cp-idrow {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: var(--fs-aux);
  color: var(--color-text-3, #8b92a1);
}

.cp-copybtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-3, #8b92a1);
  cursor: pointer;
}

.cp-copybtn:hover {
  background: var(--color-fill-1, #f7f8fa);
  color: var(--color-primary, #4f7cff);
}

.cp-take {
  font-size: var(--fs-base);
  color: var(--color-text, #202532);
}

/* 操作列竖排 */
.st-acts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
</style>
