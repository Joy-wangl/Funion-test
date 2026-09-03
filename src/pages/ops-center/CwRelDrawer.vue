<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from './data';
import { sgRowActions, SG_OFF_CASCADE, sgWarnType } from './shopGoodsData';
import type { SgProduct, SgStatus } from './shopGoodsData';
import { CW_REL_TYPES, cwRelatedOf } from './cwRelatedData';
import CascadeSelect from '../../components/CascadeSelect.vue';

/** 关联商品抽屉：关联关系作查询条件、列表带关联关系字段；字段与功能对齐视频号列表 */
const props = defineProps<{ product: SgProduct | null }>();
defineEmits<{ (e: 'close'): void }>();

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};
/* 批量下架：勾选商品置为已下架（本地态，状态/操作列随行） */
const offIds = ref<Set<string>>(new Set());
const effStatus = (p: SgProduct): SgStatus => (offIds.value.has(p.id) ? 'offManual' : p.status);
const rowActions = (p: SgProduct) => sgRowActions(effStatus(p));
/* 商品状态 / 预警类型：参考商品创建列表页，用彩色标签渲染 */
const statusTag = (s: SgStatus): { cls: string; text: string } => {
  if (s === 'selling') return { cls: 'green', text: '销售中' };
  if (s === 'auditing') return { cls: 'blue', text: '审核中' };
  if (s === 'auditFail') return { cls: 'red', text: '审核未通过' };
  if (s === 'draft') return { cls: 'gray', text: '草稿' };
  return { cls: 'gray', text: '已下架' };
};

/* 排序：单列激活，点击循环 降序→升序→取消（同视频号列表） */
type DrSortKey = 'sold' | 'data' | 'pub';
const sortKey = ref<DrSortKey | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: DrSortKey) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortIco = (k: DrSortKey): 'none' | 'asc' | 'desc' => (sortKey.value === k ? sortDir.value : 'none');
const numOf = (s: string) => Number(s.replace(/,/g, '')) || 0;
const zero = (v: string) => (v === '-' ? '0' : v);

const relData = computed(() => (props.product ? cwRelatedOf(props.product) : null));
/* 查询条件（同视频号列表形式）：店铺名/商品ID/系列编码/关联关系/发布方式/下架原因 */
const emptyFilter = { store: '', goodsId: '', seriesCode: '', relType: '全部', publishMode: '全部', offReason: '全部原因' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const patchFilter = (p: Partial<typeof emptyFilter>) => { filter.value = { ...filter.value, ...p }; };
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };
/* 三种关联关系拍平为单列表（带关联关系字段），再按查询条件过滤、排序 */
const rows = computed(() => {
  const rd = relData.value;
  const list = rd
    ? CW_REL_TYPES.flatMap((t) => rd[t].map((p) => ({ p, rel: t }))).filter(({ p, rel }) => {
        if (applied.value.relType !== '全部' && rel !== applied.value.relType) return false;
        if (applied.value.store && !p.store.includes(applied.value.store)) return false;
        if (applied.value.goodsId && !p.id.includes(applied.value.goodsId)) return false;
        if (applied.value.seriesCode && !p.seriesCode.includes(applied.value.seriesCode)) return false;
        if (applied.value.publishMode !== '全部' && p.publishMode !== applied.value.publishMode) return false;
        if (applied.value.offReason !== '全部原因' && p.offType !== applied.value.offReason) return false;
        return true;
      })
    : [];
  const k = sortKey.value;
  if (!k) return list;
  const val = (p: SgProduct): number | string => {
    if (k === 'sold') return numOf(p.sold30);
    if (k === 'data') return numOf(p.sales);
    const t = p.shelfTime ?? p.publishTime;
    return t === '-' ? '' : t;
  };
  return [...list].sort((a, b) => {
    const va = val(a.p);
    const vb = val(b.p);
    const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sortDir.value === 'desc' ? -d : d;
  });
});

/* 勾选（仅列表勾选态） */
const checked = ref<Set<string>>(new Set());
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((r) => checked.value.has(r.p.id)));
const toggleCheck = (id: string) => {
  const n = new Set(checked.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  checked.value = n;
};
const toggleAll = () => {
  const n = new Set(checked.value);
  rows.value.forEach((r) => { if (allChecked.value) n.delete(r.p.id); else n.add(r.p.id); });
  checked.value = n;
};
const batchOff = () => {
  if (!checked.value.size) { pushToast('请先勾选需要操作的商品', 'error'); return; }
  const n = checked.value.size;
  const next = new Set(offIds.value);
  checked.value.forEach((id) => next.add(id));
  offIds.value = next;
  checked.value = new Set();
  pushToast(`已下架 ${n} 件商品`);
};

/* 打开抽屉时复位排序/勾选/筛选 */
watch(() => props.product, (p) => {
  if (p) {
    sortKey.value = null;
    sortDir.value = 'desc';
    checked.value = new Set();
    filter.value = { ...emptyFilter };
    applied.value = { ...emptyFilter };
  }
});
</script>

<template>
  <template v-if="product">
    <div class="cw-drawer-mask" @click="$emit('close')" />
    <div class="cw-drawer">
      <div class="cw-drawer-head">
        <h3>关联商品</h3>
        <button class="cw-close" title="关闭" @click="$emit('close')">✕</button>
      </div>
      <div class="cw-drawer-body">
        <div class="sg-filter">
          <div class="sg-grid">
            <div class="sg-field">
              <label>店铺名</label>
              <input class="sg-input" placeholder="请输入店铺名" :value="filter.store" @input="patchFilter({ store: ($event.target as HTMLInputElement).value })" />
            </div>
            <div class="sg-field">
              <label>商品ID</label>
              <input class="sg-input" placeholder="请输入商品ID" :value="filter.goodsId" @input="patchFilter({ goodsId: ($event.target as HTMLInputElement).value })" />
            </div>
            <div class="sg-field">
              <label>系列编码</label>
              <input class="sg-input" placeholder="请输入系列编码" :value="filter.seriesCode" @input="patchFilter({ seriesCode: ($event.target as HTMLInputElement).value })" />
            </div>
            <div class="sg-field">
              <label>关联关系</label>
              <BubbleSelect class-name="sg-select" :value="filter.relType" :options="['全部', ...CW_REL_TYPES]" @change="(v: string) => patchFilter({ relType: v })" />
            </div>
            <div class="sg-field">
              <label>发布方式</label>
              <BubbleSelect class-name="sg-select" :value="filter.publishMode" :options="['全部', '蜂联', '店铺发布']" @change="(v: string) => patchFilter({ publishMode: v })" />
            </div>
            <div class="sg-field">
              <label>下架原因</label>
              <CascadeSelect class-name="sg-select" :value="filter.offReason" :groups="SG_OFF_CASCADE" all-label="全部原因" @change="(v: string) => patchFilter({ offReason: v })" />
            </div>
            <div class="sg-actions">
              <button class="sg-btn" @click="doReset">重置</button>
              <button class="sg-btn primary" @click="doSearch">查询</button>
              <button class="sg-btn" @click="batchOff">批量下架</button>
            </div>
          </div>
        </div>
        <div class="sg-card">
          <div :style="{ overflow: 'auto' }">
            <table class="sg-table">
              <thead>
                <tr>
                  <th :style="{ width: '44px' }"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
                  <th :style="{ width: '320px' }">商品信息</th>
                  <th :style="{ width: '110px' }">关联关系</th>
                  <SortTh label="销量数据" width="180px" :state="sortIco('sold')" @sort="toggleSort('sold')" />
                  <th :style="{ width: '110px' }">商品状态</th>
                  <SortTh label="商品数据" width="120px" :state="sortIco('data')" @sort="toggleSort('data')" />
                  <th :style="{ width: '150px' }">预警类型</th>
                  <SortTh label="发布信息" width="240px" :state="sortIco('pub')" @sort="toggleSort('pub')" />
                  <th :style="{ width: '100px' }">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="{ p, rel } in rows" :key="p.id">
                  <td><input type="checkbox" :checked="checked.has(p.id)" @change="toggleCheck(p.id)" /></td>
                  <td>
                    <div class="sg-goods">
                      <img class="sg-thumb" :src="p.img" alt="" />
                      <div class="sg-ginfo">
                        <div class="sg-gtitle"><Ellipsis :text="p.title" /></div>
                        <div class="sg-gid">
                          链接商品ID：<span>{{ p.linkId }}</span>
                          <button class="sg-copy" title="复制" @click="copy(p.linkId)">⧉</button>
                        </div>
                        <div class="sg-gid">
                          商品ID：<span>{{ p.id }}</span>
                          <button class="sg-copy" title="复制" @click="copy(p.id)">⧉</button>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>{{ rel }}</td>
                  <td>
                    <div class="sg-biz">
                      <div><span>销量</span><b>{{ zero(p.sold30) }}</b></div>
                      <div><span>曝光</span><b>{{ zero(p.exposure) }}</b></div>
                      <div><span>总销量</span><b>{{ zero(p.sales) }}</b></div>
                      <div><span>评价</span><b>{{ zero(p.reviews) }}</b></div>
                    </div>
                  </td>
                  <td>
                    <span class="sgd-tag" :class="statusTag(effStatus(p)).cls">{{ statusTag(effStatus(p)).text }}</span>
                  </td>
                  <td>
                    <div class="sg-kv">总销量：<b>{{ p.sales }}</b></div>
                    <div class="sg-kv">评价数：<b>{{ p.reviews }}</b></div>
                  </td>
                  <td>
                    <span v-if="p.offType && sgWarnType(p)" class="sgd-tag red">{{ sgWarnType(p) }}</span>
                    <span v-else class="sg-dash">-</span>
                  </td>
                  <td>
                    <div class="sg-kv"><span class="sg-kv-l">发布人：</span><b>{{ p.publisher }}</b></div>
                    <div class="sg-kv sg-kv-store">
                      <span class="sg-kv-l">发布店铺：</span>
                      <span class="store-logo"><img :src="PLATFORM_LOGO[p.storePlatform]" alt="" /></span>
                      <b>{{ p.store }}</b>
                    </div>
                    <div class="sg-kv"><span class="sg-kv-l">发布方式：</span><b>{{ p.publishMode ?? '-' }}</b></div>
                    <div class="sg-kv">
                      <span class="sg-kv-l">{{ p.offTime ? '下架时间：' : p.shelfTime ? '上架时间：' : '发布时间：' }}</span>
                      <b>{{ p.offTime ?? p.shelfTime ?? p.publishTime }}</b>
                    </div>
                  </td>
                  <td>
                    <div class="sg-acts">
                      <a
                        v-for="a in rowActions(p)"
                        :key="a"
                        class="sg-link"
                        href="javascript:void(0)"
                        @click.prevent="pushToast(a === '商品详情' ? '已打开商品详情' : `已${a}`)"
                      >
                        {{ a }}
                      </a>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </template>
</template>
