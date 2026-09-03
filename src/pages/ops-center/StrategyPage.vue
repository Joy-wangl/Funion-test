<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import { pushToast } from '../../components/toast';
import { stProducts } from './strategyData';

/** 商品策略页：策略商品列表（筛选含「是否有动销」/ 策略 tab / 批量操作） */
const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

const emptyFilter = { store: '', title: '', goodsId: '', strategy: '', dx: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const collapsed = ref(false);
const patchFilter = (p: Partial<typeof emptyFilter>) => { filter.value = { ...filter.value, ...p }; };
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };

const tab = ref<'all' | 'default' | 'high'>('all');
const rows = computed(() => stProducts.filter((p) => {
  if (tab.value === 'default' && p.strategy !== '默认发布策略') return false;
  if (tab.value === 'high' && p.strategy !== '高利润策略') return false;
  if (applied.value.store && !p.store.includes(applied.value.store)) return false;
  if (applied.value.title && !p.title.includes(applied.value.title)) return false;
  if (applied.value.goodsId && !p.id.includes(applied.value.goodsId)) return false;
  if (applied.value.strategy && !p.strategy.includes(applied.value.strategy)) return false;
  if (applied.value.dx === '有动销' && !p.hasDx) return false;
  if (applied.value.dx === '无动销' && p.hasDx) return false;
  return true;
}));

/* 批量勾选（上限 10000，同截图「已选 x/10000」） */
const checked = ref<Set<string>>(new Set([stProducts[0].id]));
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((p) => checked.value.has(p.id)));
const toggleCheck = (id: string) => {
  const n = new Set(checked.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  checked.value = n;
};
const toggleAll = () => {
  const n = new Set(checked.value);
  rows.value.forEach((p) => { if (allChecked.value) n.delete(p.id); else n.add(p.id); });
  checked.value = n;
};
</script>

<template>
  <div class="sg-page st-page">
    <div class="st-head">策略商品列表</div>
    <div class="sg-statusbar">
      <button class="sg-chip" :class="tab === 'all' ? 'active' : ''" @click="tab = 'all'">全部(1,254)</button>
      <button class="sg-chip" :class="tab === 'default' ? 'active' : ''" @click="tab = 'default'">默认发布策略(856)</button>
      <button class="sg-chip" :class="tab === 'high' ? 'active' : ''" @click="tab = 'high'">高利润策略(398)</button>
      <span class="st-sel">已选 {{ checked.size }}/10000</span>
    </div>

    <div class="sg-filter">
      <div class="sg-grid st-grid">
        <div class="sg-field">
          <label>店铺名称</label>
          <input class="sg-input" placeholder="请输入" :value="filter.store" @input="patchFilter({ store: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品名称</label>
          <input class="sg-input" placeholder="请输入" :value="filter.title" @input="patchFilter({ title: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品ID</label>
          <input class="sg-input" placeholder="请输入" :value="filter.goodsId" @input="patchFilter({ goodsId: ($event.target as HTMLInputElement).value })" />
        </div>
        <template v-if="!collapsed">
          <div class="sg-field">
            <label>策略名称</label>
            <input class="sg-input" placeholder="请输入" :value="filter.strategy" @input="patchFilter({ strategy: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>创建时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <div class="sg-field">
            <label>是否有动销</label>
            <BubbleSelect class-name="sg-select" :value="filter.dx" :options="['全部', '有动销', '无动销']" @change="(v: string) => patchFilter({ dx: v })" />
          </div>
        </template>
        <div class="sg-actions">
          <button class="sg-btn" :disabled="checked.size === 0" @click="pushToast('已删除勾选商品')">批量删除</button>
          <button class="sg-btn" :disabled="checked.size === 0" @click="pushToast('已停用勾选商品策略')">批量停用</button>
          <button class="sg-btn" :disabled="checked.size === 0" @click="pushToast('已启用勾选商品策略')">批量启用</button>
          <button class="sg-btn" @click="collapsed = !collapsed">{{ collapsed ? '展开' : '收起' }} {{ collapsed ? '∨' : '∧' }}</button>
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
              <th :style="{ width: '44px' }"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th>商品信息</th>
              <th :style="{ width: '140px' }">关联策略</th>
              <th :style="{ width: '140px' }">销量数据</th>
              <th :style="{ width: '140px' }">商品数据</th>
              <th :style="{ width: '110px' }">策略状态</th>
              <th :style="{ width: '110px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.id">
              <td><input type="checkbox" :checked="checked.has(p.id)" @change="toggleCheck(p.id)" /></td>
              <td>
                <div class="sg-goods">
                  <img class="sg-thumb" :src="p.img" alt="" />
                  <div class="sg-ginfo">
                    <div class="sg-gtitle"><Ellipsis :text="p.title" /></div>
                    <div class="sg-gid">
                      商品ID：<span>{{ p.id }}</span>
                      <button class="sg-copy" title="复制" @click="copy(p.id)">⧉</button>
                    </div>
                  </div>
                </div>
              </td>
              <td>{{ p.strategy }}</td>
              <td>
                <div class="st-kv"><span>销量</span><b>{{ p.sold30 }}</b></div>
                <div class="st-kv"><span>总销量</span><b>{{ p.sales }}</b></div>
              </td>
              <td>
                <div class="st-kv"><span>曝光</span><b>{{ p.exposure }}</b></div>
                <div class="st-kv"><span>评价</span><b>{{ p.reviews }}</b></div>
              </td>
              <td>{{ p.stStatus }}</td>
              <td>
                <div class="sg-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="pushToast('已取消关联')">取消关联</a>
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="pushToast('已打开商品详情')">商品详情</a>
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
