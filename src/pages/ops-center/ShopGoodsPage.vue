<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import ToastWrap from '../../components/ToastWrap.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from './data';
import { sgProducts, SG_CHIPS, SG_STATUS_META } from './shopGoodsData';
import type { SgProduct, SgTab } from './shopGoodsData';
import SgDetailPage from './SgDetailPage.vue';
import SgBatchPriceModal from './SgBatchPriceModal.vue';

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

/** 列表行操作：按商品状态给出 */
function rowActions(p: SgProduct): string[] {
  switch (p.status) {
    case 'selling':
    case 'auditFail':
      return ['商品详情', '下架'];
    case 'auditing':
      return ['商品详情', '撤销审核'];
    case 'offSystem':
    case 'offManual':
      return ['商品详情', '立即上架'];
    case 'draft':
      return ['商品详情', '发布'];
  }
}

const tab = ref<SgTab>('视频号');
const chip = ref('all');
const collapsed = ref(false);
const detail = ref<SgProduct | null>(null);
/* 批量调价：勾选 + 弹窗 + toast */
const checked = ref<Set<string>>(new Set());
const bpOpen = ref(false);

/* 筛选 */
const emptyFilter = { store: '', title: '', goodsId: '', sku: '', tpl: '', linkId: '', source: '全部来源', publisher: '', strategy: '全部策略' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const patchFilter = (patch: Partial<typeof emptyFilter>) => { filter.value = { ...filter.value, ...patch }; };

const rows = computed(() => {
  const chipDef = SG_CHIPS.find((c) => c.key === chip.value) ?? SG_CHIPS[0];
  return sgProducts[tab.value].filter((p) => {
    if (!chipDef.match(p.status)) return false;
    if (applied.value.store && !p.store.includes(applied.value.store)) return false;
    if (applied.value.title && !p.title.includes(applied.value.title)) return false;
    if (applied.value.goodsId && !p.id.includes(applied.value.goodsId)) return false;
    if (applied.value.linkId && !p.linkId.includes(applied.value.linkId)) return false;
    if (applied.value.publisher && !p.publisher.includes(applied.value.publisher)) return false;
    if (applied.value.source !== '全部来源' && p.source !== applied.value.source) return false;
    if (applied.value.strategy !== '全部策略' && p.strategy !== applied.value.strategy) return false;
    return true;
  });
});

const countOf = (key: string) => {
  const def = SG_CHIPS.find((c) => c.key === key)!;
  return sgProducts[tab.value].filter((p) => def.match(p.status)).length;
};

/* 批量调价除淘宝外各 TAB 提供，且仅「销售中」状态商品可勾选调价 */
const canPrice = computed(() => tab.value !== '淘宝');
const sellingSel = computed(() => sgProducts[tab.value].filter((p) => checked.value.has(p.id) && p.status === 'selling').length);
const sellRows = computed(() => rows.value.filter((p) => p.status === 'selling'));
const allChecked = computed(() => sellRows.value.length > 0 && sellRows.value.every((p) => checked.value.has(p.id)));
const toggleCheck = (id: string) => {
  const n = new Set(checked.value);
  if (n.has(id)) n.delete(id); else n.add(id);
  checked.value = n;
};
const toggleAll = () => {
  const n = new Set(checked.value);
  sellRows.value.forEach((p) => { if (allChecked.value) n.delete(p.id); else n.add(p.id); });
  checked.value = n;
};

const onTab = (t: SgTab) => { tab.value = t; chip.value = 'all'; checked.value = new Set(); };
</script>

<template>
  <SgDetailPage v-if="detail" :product="detail" @back="detail = null" />
  <div v-else class="sg-page">
    <div class="sg-tabs">
      <button v-for="t in (['视频号', '淘宝', '京喜', '得物'] as SgTab[])" :key="t" class="sg-tab" :class="tab === t ? 'active' : ''" @click="onTab(t)">
        {{ t }}
      </button>
    </div>

    <div class="sg-statusbar">
      <button v-for="c in SG_CHIPS" :key="c.key" class="sg-chip" :class="chip === c.key ? 'active' : ''" @click="chip = c.key">
        {{ c.label }}({{ countOf(c.key) }})
      </button>
    </div>

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
          <label>SKU名称</label>
          <input class="sg-input" placeholder="请输入SKU名称" :value="filter.sku" @input="patchFilter({ sku: ($event.target as HTMLInputElement).value })" />
        </div>
        <template v-if="!collapsed">
          <div class="sg-field">
            <label>模板号</label>
            <input class="sg-input" placeholder="请输入模板号" :value="filter.tpl" @input="patchFilter({ tpl: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>链接商品ID</label>
            <input class="sg-input" placeholder="请输入链接商品ID" :value="filter.linkId" @input="patchFilter({ linkId: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>发布商品来源</label>
            <BubbleSelect class-name="sg-select" :value="filter.source" :options="['全部来源', '链接商品库', '内部商机', '市场商机']" @change="(v: string) => patchFilter({ source: v })" />
          </div>
          <div class="sg-field">
            <label>发布人</label>
            <input class="sg-input" placeholder="请输入发布人" :value="filter.publisher" @input="patchFilter({ publisher: ($event.target as HTMLInputElement).value })" />
          </div>
          <div class="sg-field">
            <label>关联策略</label>
            <BubbleSelect class-name="sg-select" :value="filter.strategy" :options="['全部策略', '未关联', '默认发布策略', '高利润策略']" @change="(v: string) => patchFilter({ strategy: v })" />
          </div>
          <div class="sg-field">
            <label>发布开始时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <div class="sg-field">
            <label>上架开始时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
        </template>
        <div class="sg-actions">
          <div v-if="canPrice && sellingSel > 0" class="sg-mini">已选 <b>{{ sellingSel }}</b> 件出售中商品</div>
          <button
            v-if="canPrice"
            class="sg-btn primary"
            :disabled="sellingSel === 0"
            :title="sellingSel === 0 ? '请先勾选出售中的商品' : '对勾选的出售中商品批量调价'"
            @click="bpOpen = true"
          >
            批量调价
          </button>
          <button class="sg-btn" @click="collapsed = !collapsed">
            {{ collapsed ? '展开 ∨' : '收起 ∧' }}
          </button>
          <button class="sg-btn" @click="filter = { ...emptyFilter }; applied = { ...emptyFilter }">
            重置
          </button>
          <button class="sg-btn primary" @click="applied = { ...filter }">
            查询
          </button>
        </div>
      </div>
    </div>

    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table">
          <thead>
            <tr>
              <th v-if="canPrice" :style="{ width: '44px' }"><input type="checkbox" :checked="allChecked" @change="toggleAll" /></th>
              <th>商品信息</th>
              <th :style="{ width: '130px' }">商品状态</th>
              <th :style="{ width: '120px' }">商品策略</th>
              <th :style="{ width: '130px' }">商品数据 ⇅</th>
              <th :style="{ width: '240px' }">发布信息 ⇅</th>
              <th :style="{ width: '110px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.id">
              <td v-if="canPrice">
                <input v-if="p.status === 'selling'" type="checkbox" :checked="checked.has(p.id)" @change="toggleCheck(p.id)" />
              </td>
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
                <div class="sg-status">
                  <span class="sg-dot" :style="{ background: SG_STATUS_META[p.status].dot }" />
                  <span :style="{ color: SG_STATUS_META[p.status].color }">{{ SG_STATUS_META[p.status].label }}</span>
                </div>
                <div v-if="p.status === 'auditFail'" class="sg-failtag" :title="p.rejectReason">
                  审核未通过 <i class="sg-fail-i" :title="p.rejectReason">i</i>
                </div>
              </td>
              <td>{{ p.strategy }}</td>
              <td>
                <div class="sg-kv">总销量：<b>{{ p.sales }}</b></div>
                <div class="sg-kv">评价数：<b>{{ p.reviews }}</b></div>
              </td>
              <td>
                <div class="sg-kv"><span class="sg-kv-l">发布人：</span><b>{{ p.publisher }}</b></div>
                <div class="sg-kv sg-kv-store">
                  <span class="sg-kv-l">发布店铺：</span>
                  <span class="store-logo"><img :src="PLATFORM_LOGO[p.storePlatform]" alt="" /></span>
                  <b>{{ p.store }}</b>
                </div>
                <div class="sg-kv"><span class="sg-kv-l">{{ p.shelfTime ? '上架时间：' : '发布时间：' }}</span><b>{{ p.shelfTime ?? p.publishTime }}</b></div>
              </td>
              <td>
                <div class="sg-acts">
                  <a
                    v-for="a in rowActions(p)"
                    :key="a"
                    class="sg-link"
                    href="javascript:void(0)"
                    @click.prevent="a === '商品详情' ? (detail = p) : null"
                  >
                    {{ a }}
                  </a>
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

    <div class="pm-page pm-host">
      <SgBatchPriceModal
        v-if="bpOpen && sellingSel > 0"
        :count="sellingSel"
        @close="bpOpen = false"
        @ok="pushToast"
      />
      <ToastWrap />
    </div>
  </div>
</template>
