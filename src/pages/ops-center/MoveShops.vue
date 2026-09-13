<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { mvShops, type MvShop, type MvTask } from './moveData';
import { PLATFORM_LOGO } from './data';

/** Tab2 店铺关联：店铺视角；未关联店一键配置，已关联店查看任务 */
const props = defineProps<{ tasks: MvTask[] }>();
const emit = defineEmits<{ (e: 'configure', shopId: string): void; (e: 'viewTask', name: string): void }>();

const emptyFilter = { name: '', platform: '全部', rel: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };

/* 店铺 ↔ 任务：源店或目标店命中即关联 */
const taskOf = (s: MvShop) => props.tasks.find((t) => t.sourceShopIds.includes(s.id) || t.targetShopId === s.id);

const rows = computed(() => mvShops.filter((s) => {
  if (applied.value.name && !s.name.includes(applied.value.name) && !s.shopId.includes(applied.value.name)) return false;
  if (applied.value.platform !== '全部' && s.platform !== applied.value.platform) return false;
  const rel = !!taskOf(s);
  if (applied.value.rel === '已关联' && !rel) return false;
  if (applied.value.rel === '未关联' && rel) return false;
  return true;
}));
</script>

<template>
  <div>
    <div class="mv-desc">同一店铺可关联多个不同搬家任务；关联后按任务配置（类型 / 策略 / 发布方式）自动抓取并发布。</div>

    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>店铺名称</label>
          <input class="sg-input" placeholder="店铺名称 / 店铺ID" :value="filter.name" @input="filter.name = ($event.target as HTMLInputElement).value" />
        </div>
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="filter.platform" :options="['全部', '淘宝', '天猫', '拼多多', '视频号']" @change="(v: string) => (filter.platform = v)" />
        </div>
        <div class="sg-field">
          <label>关联状态</label>
          <BubbleSelect class-name="sg-select" :value="filter.rel" :options="['全部', '已关联', '未关联']" @change="(v: string) => (filter.rel = v)" />
        </div>
        <div class="sg-actions">
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
              <th :style="{ width: '280px' }">店铺信息</th>
              <th :style="{ width: '90px' }">平台</th>
              <th :style="{ width: '100px' }">店铺状态</th>
              <th :style="{ width: '240px' }">关联搬家任务</th>
              <th :style="{ width: '100px' }">任务状态</th>
              <th :style="{ width: '150px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in rows" :key="s.id">
              <td>
                <div class="mv-shopline">
                  <span class="store-logo"><img :src="PLATFORM_LOGO[s.platform]" alt="" /></span>
                  <span class="mv-name">{{ s.name }}</span>
                </div>
                <div class="mv-sub">店铺ID：{{ s.shopId }}</div>
              </td>
              <td>{{ s.platform }}</td>
              <td>
                <span class="sg-status">
                  <span class="sg-dot" :style="{ background: s.online ? '#1eaf72' : '#c3cad4' }" />
                  <span>{{ s.online ? '在线' : '离线' }}</span>
                </span>
              </td>
              <td>
                <span v-if="taskOf(s)" class="mv-name">{{ taskOf(s)!.name }}</span>
                <span v-else class="mv-sub">—</span>
              </td>
              <td>
                <span v-if="taskOf(s)" :class="taskOf(s)!.status === '进行中' ? 'mv-badge-blue' : taskOf(s)!.status === '已暂停' ? 'badge-orange' : taskOf(s)!.status === '已完成' ? 'badge-green' : 'badge-gray'">
                  {{ taskOf(s)!.status }}
                </span>
                <span v-else class="mv-sub">—</span>
              </td>
              <td>
                <div class="sg-acts">
                  <template v-if="taskOf(s)">
                    <a class="sg-link" href="javascript:void(0)" @click.prevent="emit('viewTask', taskOf(s)!.name)">查看任务</a>
                  </template>
                  <a v-else class="sg-link" href="javascript:void(0)" @click.prevent="emit('configure', s.id)">配置搬家任务</a>
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
  </div>
</template>
