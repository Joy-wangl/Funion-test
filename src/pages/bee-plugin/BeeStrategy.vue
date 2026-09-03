<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { BEE_PLATFORMS, BEE_PLATFORM_LOGO, beeStrategies, SHIP_TIMES } from './data';
import type { BeeStrategy, ShipTime } from './data';

const emit = defineEmits<{ (e: 'close'): void }>();

const rows = ref<BeeStrategy[]>([...beeStrategies]);

/* 表单态：null = 列表视图；编辑/新建共用一套配置表单（铺货快速定价，按平台区分） */
interface StrategyForm {
  id: string;
  name: string;
  platforms: string[];
  priceMode: 'rate' | 'profit';
  rate: string;
  profit: string;
  shipTime: ShipTime;
  itemType: 'new' | 'used';
}
const form = ref<StrategyForm | null>(null);
const formErr = ref<{ platform?: string; name?: string; value?: string }>({});

const openCreate = () => {
  formErr.value = {};
  form.value = { id: '', name: '', platforms: [], priceMode: 'rate', rate: '', profit: '', shipTime: '48h', itemType: 'new' };
};
const openEdit = (s: BeeStrategy) => {
  formErr.value = {};
  form.value = { id: s.id, name: s.name, platforms: [...s.platforms], priceMode: s.priceMode, rate: s.priceMode === 'rate' ? String(s.rate) : '', profit: s.priceMode === 'profit' ? String(s.profit) : '', shipTime: s.shipTime, itemType: s.itemType };
};

/* 可用平台多选：气泡菜单 + 选择框，点选不关闭，外部点击收起 */
const platOpen = ref(false);
const platRef = ref<HTMLDivElement | null>(null);
const togglePlat = (p: string) => {
  const f = form.value;
  if (!f) return;
  f.platforms = f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p];
  formErr.value.platform = undefined;
};
const onPlatDocDown = (e: MouseEvent) => {
  if (!platRef.value?.contains(e.target as Node)) platOpen.value = false;
};
watch(platOpen, (v) => {
  if (v) document.addEventListener('mousedown', onPlatDocDown);
  else document.removeEventListener('mousedown', onPlatDocDown);
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onPlatDocDown));

const save = () => {
  const f = form.value;
  if (!f) return;
  const e: typeof formErr.value = {};
  if (f.platforms.length === 0) e.platform = '请选择策略可用平台';
  if (!f.name.trim()) e.name = '请输入策略名称';
  const num = f.priceMode === 'rate' ? f.rate : f.profit;
  if (!num.trim() || Number.isNaN(Number(num)) || Number(num) <= 0) e.value = f.priceMode === 'rate' ? '请输入大于 0 的利润率' : '请输入大于 0 的利润';
  formErr.value = e;
  if (Object.keys(e).length > 0) return;
  const old = f.id ? rows.value.find((r) => r.id === f.id) : undefined;
  const pad = (n: number) => String(n).padStart(2, '0');
  const now = new Date();
  const data: BeeStrategy = {
    id: f.id || `S-${Date.now()}`,
    name: f.name.trim(),
    platforms: [...f.platforms],
    priceMode: f.priceMode,
    rate: f.priceMode === 'rate' ? Number(f.rate) : 0,
    profit: f.priceMode === 'profit' ? Number(f.profit) : 0,
    shipTime: f.shipTime,
    itemType: f.itemType,
    creator: old?.creator ?? '蜜蜂用户',
    createTime: old?.createTime ?? `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
  };
  if (f.id) {
    rows.value = rows.value.map((r) => (r.id === f.id ? data : r));
    pushToast('策略已保存');
  } else {
    rows.value = [data, ...rows.value];
    pushToast('策略已创建，铺货时将按平台匹配定价');
  }
  form.value = null;
};

/* 创建时间排序：none → 降序（最新在前） → 升序 → none 循环 */
const timeSort = ref<'none' | 'asc' | 'desc'>('none');
const viewRows = computed(() => {
  if (timeSort.value === 'none') return rows.value;
  const list = [...rows.value].sort((a, b) => a.createTime.localeCompare(b.createTime));
  return timeSort.value === 'desc' ? list.reverse() : list;
});
const toggleTimeSort = () => { timeSort.value = timeSort.value === 'none' ? 'desc' : timeSort.value === 'desc' ? 'asc' : 'none'; };

/* 删除：危险操作二次确认 */
const delTarget = ref<BeeStrategy | null>(null);
const confirmDel = () => {
  if (!delTarget.value) return;
  rows.value = rows.value.filter((r) => r.id !== delTarget.value!.id);
  pushToast(`已删除策略「${delTarget.value.name}」`);
  delTarget.value = null;
};
</script>

<template>
  <div class="bp-page">
    <!-- 顶栏 -->
    <div class="bp-head">
      <span class="bee-logo">🐝</span>
      <span class="bp-title">蜜蜂搬家 · 策略管理</span>
      <div class="bp-head-r">
        <button class="bp-close" title="关闭" @click="emit('close')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>

    <div class="bp-body">
      <!-- 列表视图 -->
      <template v-if="!form">
        <div class="st-toolbar">
          <button class="bp-btn primary" @click="openCreate">新建策略</button>
        </div>
        <div class="bp-card">
          <table class="bp-table st-table">
            <thead>
              <tr>
                <th>策略名称</th>
                <th style="width: 100px">创建人</th>
                <SortTh label="创建时间" width="150px" :state="timeSort" @sort="toggleTimeSort" />
                <th style="width: 110px">可用平台</th>
                <th style="width: 150px">SKU定价方式</th>
                <th style="width: 110px">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in viewRows" :key="s.id">
                <td><div class="bp-name">{{ s.name }}</div></td>
                <td>{{ s.creator }}</td>
                <td class="st-time">{{ s.createTime }}</td>
                <td>
                  <span class="st-plats">
                    <span v-for="p in s.platforms" :key="p" class="bp-plat">
                      <img :src="BEE_PLATFORM_LOGO[p]" alt="" />
                      {{ p }}
                    </span>
                  </span>
                </td>
                <td>{{ s.priceMode === 'rate' ? `控利润率 ${s.rate}%` : `控利润 ¥${s.profit}` }}</td>
                <td>
                  <div class="bp-acts">
                    <a href="javascript:void(0)" @click.prevent="openEdit(s)">编辑</a>
                    <a class="del" href="javascript:void(0)" @click.prevent="delTarget = s">删除</a>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="rows.length === 0" class="bp-empty">
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3l2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8L12 3z" /></svg>
            <div class="bp-empty-t">暂无铺货策略</div>
            <div class="bp-empty-s">新建策略后，铺货发布时将按平台自动匹配快速定价</div>
          </div>
        </div>
      </template>

      <!-- 配置表单视图 -->
      <template v-else>
        <button class="st-back" @click="form = null">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6l-6 6 6 6" /><path d="M4 12h16" /></svg>
          返回
        </button>

        <div class="st-form">
          <!-- 策略类型 -->
          <div class="qd-sec">
            <div class="qd-sec-t">策略类型</div>
            <div class="st-field">
              <label class="st-label"><i>*</i>策略可用平台</label>
              <div ref="platRef" class="bselect st-select" :class="{ open: platOpen }">
                <button type="button" class="bselect-trigger" @click="platOpen = !platOpen">
                  <span class="bselect-text" :class="{ ph: form.platforms.length === 0 }">{{ form.platforms.length > 0 ? form.platforms.join(' / ') : '请选择' }}</span>
                  <svg class="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>
                </button>
                <div v-if="platOpen" class="bselect-menu st-plat-menu">
                  <div v-for="p in BEE_PLATFORMS" :key="p" class="bselect-opt" :class="{ selected: form.platforms.includes(p) }" @click="togglePlat(p)">
                    <span class="st-cb"><i v-if="form.platforms.includes(p)">✓</i></span>
                    <span class="bselect-label">{{ p }}</span>
                  </div>
                </div>
              </div>
              <div v-if="formErr.platform" class="st-err">{{ formErr.platform }}</div>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="qd-sec">
            <div class="qd-sec-t">基本信息</div>
            <div class="st-field">
              <label class="st-label"><i>*</i>策略名称</label>
              <input v-model="form.name" class="st-input name" placeholder="请输入" @input="formErr.name = undefined" />
              <div v-if="formErr.name" class="st-err">{{ formErr.name }}</div>
            </div>
            <div class="st-field">
              <label class="st-label"><i>*</i>SKU定价方式</label>
              <div class="st-cards">
                <label class="st-card" :class="{ on: form.priceMode === 'rate' }">
                  <b><input type="radio" name="st-mode" :checked="form.priceMode === 'rate'" @change="form!.priceMode = 'rate'; formErr.value = undefined" />控利润率</b>
                  <i>设置商品SKU售价时将保持所配置的利润率</i>
                </label>
                <label class="st-card" :class="{ on: form.priceMode === 'profit' }">
                  <b><input type="radio" name="st-mode" :checked="form.priceMode === 'profit'" @change="form!.priceMode = 'profit'; formErr.value = undefined" />控利润</b>
                  <i>设置商品SKU售价时将保持所配置的利润</i>
                </label>
              </div>
            </div>
            <div class="st-field">
              <label class="st-label"><i>*</i>{{ form.priceMode === 'rate' ? '设置利润率' : 'SKU利润' }}</label>
              <span class="st-inputwrap">
                <input v-if="form.priceMode === 'rate'" v-model="form.rate" class="st-input" placeholder="请输入" @input="formErr.value = undefined" />
                <input v-else v-model="form.profit" class="st-input" placeholder="请输入" @input="formErr.value = undefined" />
                <em class="st-u">{{ form.priceMode === 'rate' ? '%' : '元' }}</em>
              </span>
              <div v-if="formErr.value" class="st-err">{{ formErr.value }}</div>
            </div>
          </div>

          <!-- 其它信息 -->
          <div class="qd-sec">
            <div class="qd-sec-t">其它信息</div>
            <div class="st-field">
              <label class="st-label"><i>*</i>发货时效</label>
              <div class="st-radios">
                <label v-for="t in SHIP_TIMES" :key="t.value" class="st-radio" :class="{ on: form.shipTime === t.value }">
                  <input type="radio" name="st-ship" :checked="form.shipTime === t.value" @change="form!.shipTime = t.value" />{{ t.label }}
                </label>
              </div>
            </div>
            <div class="st-field">
              <label class="st-label"><i>*</i>宝贝类型</label>
              <div class="st-radios">
                <label class="st-radio" :class="{ on: form.itemType === 'new' }">
                  <input type="radio" name="st-item" :checked="form.itemType === 'new'" @change="form!.itemType = 'new'" />全新
                </label>
                <label class="st-radio" :class="{ on: form.itemType === 'used' }">
                  <input type="radio" name="st-item" :checked="form.itemType === 'used'" @change="form!.itemType = 'used'" />二手
                </label>
              </div>
            </div>
          </div>

          <div class="st-foot">
            <button class="bp-btn" @click="form = null">取消</button>
            <button class="bp-btn primary" @click="save">保存</button>
          </div>
        </div>
      </template>
    </div>

    <!-- 删除策略二次确认 -->
    <div v-if="delTarget" class="bee-mask" @click.self="delTarget = null">
      <div class="bee-modal small">
        <div class="bm-head"><b>删除策略</b></div>
        <p class="st-del-t">确认删除策略「{{ delTarget.name }}」？删除后铺货将不再匹配该策略</p>
        <div class="bm-foot">
          <button class="bp-btn" @click="delTarget = null">取消</button>
          <button class="bp-btn danger" @click="confirmDel">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>
