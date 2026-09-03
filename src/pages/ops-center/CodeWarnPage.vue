<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import CwRelDrawer from './CwRelDrawer.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from './data';
import { sgProducts, SG_STATUS_META, sgRowActions, SG_OFF_FAIL_TYPES, SG_OFF_CASCADE, SG_CHIPS } from './shopGoodsData';
import type { SgProduct } from './shopGoodsData';
import CascadeSelect from '../../components/CascadeSelect.vue';

/** 异常编码预警：视频号小店商品列表；预警原因 = 已下架商品的下架原因（offReason） */
const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

const rowActions = (p: SgProduct) => sgRowActions(p.status);
const isFailOff = (p: SgProduct) => !!p.offType && SG_OFF_FAIL_TYPES.includes(p.offType);

/* 排序：单列激活，点击循环 降序→升序→取消（同店铺商品） */
type CwSortKey = 'sold' | 'data' | 'pub';
const sortKey = ref<CwSortKey | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: CwSortKey) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortIco = (k: CwSortKey): 'none' | 'asc' | 'desc' => (sortKey.value === k ? sortDir.value : 'none');
const numOf = (s: string) => Number(s.replace(/,/g, '')) || 0;
/* 销量数据块：无数据展示 0 */
const zero = (v: string) => (v === '-' ? '0' : v);

/* 筛选：本页仅已下架商品；查询条件含系列编码/下架原因/发布方式/下架时间 */
const emptyFilter = { store: '', title: '', goodsId: '', seriesCode: '', offReason: '全部原因', publishMode: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const collapsed = ref(false);
const patchFilter = (p: Partial<typeof emptyFilter>) => { filter.value = { ...filter.value, ...p }; };
const doSearch = () => { applied.value = { ...filter.value }; };
const doReset = () => { filter.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; };
const offChip = SG_CHIPS.find((c) => c.key === 'off')!;

const rows = computed(() => {
  const list = sgProducts['视频号'].filter((p) => {
    if (!offChip.match(p.status)) return false;
    if (applied.value.store && !p.store.includes(applied.value.store)) return false;
    if (applied.value.title && !p.title.includes(applied.value.title)) return false;
    if (applied.value.goodsId && !p.id.includes(applied.value.goodsId)) return false;
    if (applied.value.seriesCode && !p.seriesCode.includes(applied.value.seriesCode)) return false;
    if (applied.value.offReason !== '全部原因' && p.offType !== applied.value.offReason) return false;
    if (applied.value.publishMode !== '全部' && p.publishMode !== applied.value.publishMode) return false;
    return true;
  });
  const k = sortKey.value;
  if (!k) return list;
  const val = (p: SgProduct): number | string => {
    if (k === 'sold') return numOf(p.sold30);
    if (k === 'data') return numOf(p.sales);
    const t = p.shelfTime ?? p.publishTime;
    return t === '-' ? '' : t;
  };
  return [...list].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return sortDir.value === 'desc' ? -d : d;
  });
});

/* 勾选（本页无批量操作，仅列表勾选态） */
const checked = ref<Set<string>>(new Set());
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

/* 关联商品抽屉 */
const relTarget = ref<SgProduct | null>(null);
</script>

<template>
  <div class="cw-page">
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>店铺名</label>
          <input class="sg-input" placeholder="请输入店铺名" :value="filter.store" @input="patchFilter({ store: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品名</label>
          <input class="sg-input" placeholder="请输入商品名" :value="filter.title" @input="patchFilter({ title: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>商品ID</label>
          <input class="sg-input" placeholder="请输入商品ID" :value="filter.goodsId" @input="patchFilter({ goodsId: ($event.target as HTMLInputElement).value })" />
        </div>
        <div class="sg-field">
          <label>系列编码</label>
          <input class="sg-input" placeholder="请输入系列编码" :value="filter.seriesCode" @input="patchFilter({ seriesCode: ($event.target as HTMLInputElement).value })" />
        </div>
        <template v-if="!collapsed">
          <div class="sg-field">
            <label>下架原因</label>
            <CascadeSelect class-name="sg-select" :value="filter.offReason" :groups="SG_OFF_CASCADE" all-label="全部原因" @change="(v: string) => patchFilter({ offReason: v })" />
          </div>
          <div class="sg-field">
            <label>发布方式</label>
            <BubbleSelect class-name="sg-select" :value="filter.publishMode" :options="['全部', '蜂联', '店铺发布']" @change="(v: string) => patchFilter({ publishMode: v })" />
          </div>
          <div class="sg-field">
            <label>下架时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
        </template>
        <div class="sg-actions">
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
              <th :style="{ width: '380px' }">商品信息</th>
              <SortTh label="销量数据" width="200px" :state="sortIco('sold')" @sort="toggleSort('sold')" />
              <th :style="{ width: '150px' }">商品状态</th>
              <SortTh label="商品数据" width="130px" :state="sortIco('data')" @sort="toggleSort('data')" />
              <th :style="{ width: '150px' }">预警原因</th>
              <SortTh label="发布信息" width="240px" :state="sortIco('pub')" @sort="toggleSort('pub')" />
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
              <td>
                <div class="sg-biz">
                  <div><span>销量</span><b>{{ zero(p.sold30) }}</b></div>
                  <div><span>曝光</span><b>{{ zero(p.exposure) }}</b></div>
                  <div><span>总销量</span><b>{{ zero(p.sales) }}</b></div>
                  <div><span>评价</span><b>{{ zero(p.reviews) }}</b></div>
                </div>
              </td>
              <td>
                <div class="sg-status">
                  <span class="sg-dot" :style="{ background: SG_STATUS_META[p.status].dot }" />
                  <span :style="{ color: SG_STATUS_META[p.status].color }">{{ SG_STATUS_META[p.status].label }}</span>
                </div>
                <div v-if="p.status === 'auditFail'" class="sg-failtag" :title="p.rejectReason">
                  审核未通过 <i class="sg-fail-i" :title="p.rejectReason">i</i>
                </div>
                <div v-else-if="p.offType" class="sg-offtag" :class="isFailOff(p) ? 'fail' : 'normal'">
                  {{ p.offType }}
                </div>
              </td>
              <td>
                <div class="sg-kv">总销量：<b>{{ p.sales }}</b></div>
                <div class="sg-kv">评价数：<b>{{ p.reviews }}</b></div>
              </td>
              <td>
                <span v-if="p.offReason" class="sg-warn">{{ p.offReason }}</span>
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
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="relTarget = p">关联商品</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <CwRelDrawer :product="relTarget" @close="relTarget = null" />
  </div>
</template>
