<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import MoreActions from '../../components/MoreActions.vue';
import { pushToast } from '../../components/toast';
import { mvPickFilters, mvShopOf, mvShops, MV_STRATEGIES, type MvTask, type MvTaskStatus } from './moveData';

/** Tab1 搬家任务：展示用配置清单（不承载执行过程信息：执行规则/具体店铺/搬家进度不入列） */
const props = defineProps<{ tasks: MvTask[]; kw: { kw: string; ts: number } }>();
const emit = defineEmits<{ (e: 'create'): void; (e: 'edit', t: MvTask): void }>();

const chip = ref<'全部' | MvTaskStatus>('全部');
const CHIPS: ('全部' | MvTaskStatus)[] = ['全部', '未开始', '进行中', '已暂停', '已完成'];
const countOf = (k: (typeof CHIPS)[number]) => (k === '全部' ? props.tasks.length : props.tasks.filter((t) => t.status === k).length);

const emptyFilter = { name: '', type: '全部', shop: '全部', strategy: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };

/* 跨 tab 跳转：店铺关联「查看任务」带入任务名过滤（ts 令牌同值也触发） */
watch(() => props.kw, (v) => { filter.value = { ...emptyFilter, name: v.kw }; applied.value = { ...emptyFilter, name: v.kw }; }, { immediate: true });

const rows = computed(() => props.tasks.filter((t) => {
  if (chip.value !== '全部' && t.status !== chip.value) return false;
  if (applied.value.name && !t.name.includes(applied.value.name) && !t.id.includes(applied.value.name)) return false;
  if (applied.value.type !== '全部' && t.type !== applied.value.type) return false;
  if (applied.value.shop !== '全部' && ![...t.sourceShopIds, t.targetShopId].some((id) => mvShopOf(id)?.name === applied.value.shop)) return false;
  if (applied.value.strategy !== '全部' && t.strategy !== applied.value.strategy) return false;
  return true;
}));

/* 徽章口径：类型 4 形态 / 状态 4 态 */
const typeBadge = (t: MvTask) => t.type === '定时'
  ? { label: `定时-${t.scheduleMode}`, cls: t.scheduleMode === '一次性' ? 'mv-badge-blue' : 'badge-green' }
  : t.type === '条件触发' ? { label: '条件触发', cls: 'badge-orange' } : { label: '循环', cls: 'badge-gray' };
const stBadge = (s: MvTaskStatus) => s === '进行中' ? 'mv-badge-blue' : s === '已暂停' ? 'badge-orange' : s === '已完成' ? 'badge-green' : 'badge-gray';

/* 生命周期：未开始/已暂停→启动；进行中→暂停 */
const toggleRun = (t: MvTask) => {
  if (t.status === '进行中') { t.status = '已暂停'; pushToast(`已暂停：任务「${t.name}」停止后续执行`); }
  else { t.status = '进行中'; pushToast(`已启动：任务「${t.name}」按配置执行抓取与发布`); }
};

/* 操作列：直出 2 + 更多[删除]；删除强提醒二次确认 */
const delTarget = ref<MvTask | null>(null);
const confirmDel = () => {
  const t = delTarget.value;
  if (!t) return;
  const i = props.tasks.findIndex((x) => x.id === t.id);
  if (i >= 0) props.tasks.splice(i, 1);
  pushToast(`已删除：搬家任务「${t.name}」及其执行记录已移除`);
  delTarget.value = null;
};
</script>

<template>
  <div>
    <div class="sg-statusbar">
      <button v-for="c in CHIPS" :key="c" class="sg-chip" :class="chip === c ? 'active' : ''" @click="chip = c">
        {{ c }}({{ countOf(c) }})
      </button>
    </div>

    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>任务名称</label>
          <input class="sg-input" placeholder="任务名称 / 任务ID" :value="filter.name" @input="filter.name = ($event.target as HTMLInputElement).value" />
        </div>
        <div class="sg-field">
          <label>任务类型</label>
          <BubbleSelect class-name="sg-select" :value="filter.type" :options="['全部', '定时', '条件触发', '循环']" @change="(v: string) => (filter.type = v)" />
        </div>
        <div class="sg-field">
          <label>关联店铺</label>
          <BubbleSelect class-name="sg-select" :value="filter.shop" :options="['全部', ...mvShops.map((s) => s.name)]" @change="(v: string) => (filter.shop = v)" />
        </div>
        <div class="sg-field">
          <label>关联策略</label>
          <BubbleSelect class-name="sg-select" :value="filter.strategy" :options="['全部', ...MV_STRATEGIES]" @change="(v: string) => (filter.strategy = v)" />
        </div>
        <div class="sg-actions">
          <button class="sg-btn primary" @click="emit('create')">新建搬家任务</button>
          <button class="sg-btn" @click="doReset">重置</button>
          <button class="sg-btn primary" @click="doSearch">查询</button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table">
          <thead>
            <tr>
              <th :style="{ width: '220px' }">任务信息</th>
              <th :style="{ width: '110px' }">任务类型</th>
              <th :style="{ width: '170px' }">选品规则</th>
              <th :style="{ width: '120px' }">关联店铺</th>
              <th :style="{ width: '120px' }">关联策略</th>
              <th v-if="chip === '全部'" :style="{ width: '90px' }">状态</th>
              <th :style="{ width: '130px' }">创建时间</th>
              <th :style="{ width: '130px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in rows" :key="t.id">
              <td>
                <div class="mv-name">{{ t.name }}</div>
                <div class="mv-sub">任务ID：{{ t.id }}</div>
              </td>
              <td><span :class="typeBadge(t).cls">{{ typeBadge(t).label }}</span></td>
              <td>
                <div>{{ t.pick.sort }}</div>
                <div class="mv-sub" :title="`${t.pick.sort} · ${mvPickFilters(t.pick)}`">{{ mvPickFilters(t.pick) }}</div>
              </td>
              <!-- 关联店铺只展数量不展具体店名：明细在店铺关联 tab 查看 -->
              <td>
                <div>源 {{ t.sourceShopIds.length }} → 目标 1</div>
                <div class="mv-sub">共 {{ t.sourceShopIds.length + 1 }} 个关联店铺</div>
              </td>
              <td>{{ t.strategy }}</td>
              <td v-if="chip === '全部'"><span :class="stBadge(t.status)">{{ t.status }}</span></td>
              <td>{{ t.createdAt }}</td>
              <td>
                <div class="sg-acts">
                  <a v-if="t.status === '进行中'" class="sg-link" href="javascript:void(0)" @click.prevent="toggleRun(t)">暂停</a>
                  <a v-else-if="t.status === '未开始' || t.status === '已暂停'" class="sg-link" href="javascript:void(0)" @click.prevent="toggleRun(t)">启动</a>
                  <a v-if="t.status !== '进行中'" class="sg-link" href="javascript:void(0)" @click.prevent="emit('edit', t)">编辑</a>
                  <MoreActions :items="[{ label: '删除', danger: true, onClick: () => (delTarget = t) }]" />
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
    </div>

    <!-- 删除强提醒：危险操作二次确认 -->
    <Modal v-if="delTarget" title="删除搬家任务" :sub="`删除后不可恢复，请谨慎确认`" @close="delTarget = null">
      <div class="bp-rows">
        <div class="bp-row"><span class="bp-label">任务</span><b>{{ delTarget.name }}（{{ delTarget.id }}）</b></div>
        <div class="bp-row"><span class="bp-label">类型与规则</span><b>{{ typeBadge(delTarget).label }} · {{ delTarget.runRule }}</b></div>
        <div class="bp-row"><span class="bp-label">影响</span><b>该任务的执行批次与发布记录将一并移除，已发布商品不受影响</b></div>
      </div>
      <template #foot>
        <button class="btn" @click="delTarget = null">取消</button>
        <button class="btn danger" @click="confirmDel">确认删除</button>
      </template>
    </Modal>
  </div>
</template>
