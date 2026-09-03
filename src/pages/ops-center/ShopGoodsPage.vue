<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO } from './data';
import { sgProducts, SG_CHIPS, SG_STATUS_META, sgRowActions, SG_OFF_FAIL_TYPES, SG_OFF_GROUP, SG_OFF_GROUPS, sgWarnType } from './shopGoodsData';
import type { SgProduct, SgTab } from './shopGoodsData';
import SgDetailPage from './SgDetailPage.vue';
import JmCreateDetailPage from './JmCreateDetailPage.vue';
import SgBatchPriceModal from './SgBatchPriceModal.vue';
import CwRelDrawer from './CwRelDrawer.vue';

const copy = (text: string) => {
  navigator.clipboard?.writeText(text).catch(() => undefined);
};

/** 列表行操作：与运营管理操作列共用 sgRowActions，保持同步 */
const rowActions = (p: SgProduct) => sgRowActions(p.status);

const tab = ref<SgTab>('视频号');
const chip = ref('all');
/* 已下架 tab 下的下架类型筛选 */
const offType = ref('全部');
const onChip = (k: string) => { chip.value = k; offType.value = '全部'; };
const collapsed = ref(false);
const detail = ref<SgProduct | null>(null);
/* 风险预警：关联商品抽屉 */
const relTarget = ref<SgProduct | null>(null);
/* 京麦商品详情：走京麦接口字段页（SgProduct → CreateRow 适配，字段映射 getProduct/material） */
const jmDetailRow = computed(() => detail.value && detail.value.storePlatform === '京麦'
  ? { thumb: detail.value.img, title: detail.value.title, link: detail.value.linkId, store: detail.value.store, person: detail.value.operator, time: detail.value.createTime ?? detail.value.publishTime, platformBadge: '京麦' }
  : null);
/* 批量调价：勾选 + 弹窗 + toast */
const checked = ref<Set<string>>(new Set());
const bpOpen = ref(false);

/* 筛选 */
const emptyFilter = { store: '', title: '', goodsId: '', seriesCode: '', tpl: '', linkId: '', source: '全部来源', publisher: '', strategy: '全部策略', publishMode: '全部', hitWarn: '全部' };
const filter = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const patchFilter = (patch: Partial<typeof emptyFilter>) => { filter.value = { ...filter.value, ...patch }; };

/* 消息通知跳转定位：收到令牌后回全部态并按商品ID自动查询 */
const props = defineProps<{ locate?: { id: string; ts: number } | null }>();
watch(() => props.locate, (v) => {
  if (!v) return;
  chip.value = 'all';
  filter.value = { ...emptyFilter, goodsId: v.id };
  applied.value = { ...filter.value };
});
/* 预警相关查询条件（发布方式/下架时间）展示状态：全部/销售中/已下架 */
const warnConds = computed(() => ['all', 'selling', 'off'].includes(chip.value));

const isFailOff = (p: SgProduct) => !!p.offType && SG_OFF_FAIL_TYPES.includes(p.offType);

const rows = computed(() => {
  const chipDef = SG_CHIPS.find((c) => c.key === chip.value) ?? SG_CHIPS[0];
  const list = sgProducts[tab.value].filter((p) => {
    if (!chipDef.match(p.status)) return false;
    if (chip.value === 'off' && offType.value !== '全部' && (!p.offType || SG_OFF_GROUP[p.offType] !== offType.value)) return false;
    if (applied.value.store && !p.store.includes(applied.value.store)) return false;
    if (applied.value.title && !p.title.includes(applied.value.title)) return false;
    if (applied.value.goodsId && !p.id.includes(applied.value.goodsId)) return false;
    if (applied.value.seriesCode && !p.seriesCode.includes(applied.value.seriesCode)) return false;
    if (applied.value.publishMode !== '全部' && p.publishMode !== applied.value.publishMode) return false;
    if (applied.value.hitWarn === '命中预警' && !sgWarnType(p)) return false;
    if (applied.value.hitWarn === '未命中预警' && sgWarnType(p)) return false;
    if (applied.value.linkId && !p.linkId.includes(applied.value.linkId)) return false;
    if (applied.value.publisher && !p.publisher.includes(applied.value.publisher)) return false;
    if (applied.value.source !== '全部来源' && p.source !== applied.value.source) return false;
    if (applied.value.strategy !== '全部策略' && p.strategy !== applied.value.strategy) return false;
    return true;
  });
  const k = sortKey.value;
  if (!k) return list;
  const val = (p: SgProduct): number | string => {
    if (k === 'sold') return numOf(p.sold30);
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

/* 排序：单列激活，点击循环 降序→升序→取消 */
type SgSortKey = 'sold' | 'pub';
const sortKey = ref<SgSortKey | null>(null);
const sortDir = ref<'asc' | 'desc'>('desc');
const toggleSort = (k: SgSortKey) => {
  if (sortKey.value !== k) { sortKey.value = k; sortDir.value = 'desc'; }
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else { sortKey.value = null; sortDir.value = 'desc'; }
};
const sortIco = (k: SgSortKey): 'none' | 'asc' | 'desc' => (sortKey.value === k ? sortDir.value : 'none');
const numOf = (s: string) => Number(s.replace(/,/g, '')) || 0;
/* 销量数据块：无数据展示 0（对齐微信小店经营概览） */
const zero = (v: string) => (v === '-' ? '0' : v);

/* 下架原因悬浮气泡：fixed 定位挂在页面层，不被表格容器裁剪、悬浮不抖动 */
const offPop = reactive({ show: false, x: 0, y: 0, text: '' });
const showOffPop = (e: MouseEvent, text: string) => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const h = 76;
  offPop.text = text;
  offPop.x = r.left;
  offPop.y = r.bottom + 6 + h > window.innerHeight ? r.top - 6 - h : r.bottom + 6;
  offPop.show = true;
};
const hideOffPop = () => { offPop.show = false; };

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

const onTab = (t: SgTab) => { tab.value = t; chip.value = 'all'; offType.value = '全部'; checked.value = new Set(); };
</script>

<template>
  <JmCreateDetailPage v-if="detail && jmDetailRow" :row="jmDetailRow" @back="detail = null" @open-pub="pushToast('已关联发布任务')" />
  <SgDetailPage v-else-if="detail" :product="detail" @back="detail = null" />
  <div v-else class="sg-page">
    <div class="sg-tabs">
      <button v-for="t in (['视频号', '淘宝', '京喜', '得物', '京麦'] as SgTab[])" :key="t" class="sg-tab" :class="tab === t ? 'active' : ''" @click="onTab(t)">
        {{ t }}
      </button>
    </div>

    <div class="sg-statusbar">
      <button v-for="c in SG_CHIPS" :key="c.key" class="sg-chip" :class="chip === c.key ? 'active' : ''" @click="onChip(c.key)">
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
        <template v-if="!collapsed">
          <div class="sg-field">
            <label>系列编码</label>
            <input class="sg-input" placeholder="请输入系列编码" :value="filter.seriesCode" @input="patchFilter({ seriesCode: ($event.target as HTMLInputElement).value })" />
          </div>
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
            <label>发布方式</label>
            <BubbleSelect class-name="sg-select" :value="filter.publishMode" :options="['全部', '蜂联', '店铺发布']" @change="(v: string) => patchFilter({ publishMode: v })" />
          </div>
          <div class="sg-field">
            <label>上架开始时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <div v-if="chip === 'off'" class="sg-field">
            <label>下架类型</label>
            <BubbleSelect class-name="sg-select" :value="offType" :options="['全部', ...SG_OFF_GROUPS]" @change="(v: string) => offType = v" />
          </div>
          <div v-if="warnConds" class="sg-field">
            <label>下架时间</label>
            <div class="sg-range">
              <input class="sg-input" placeholder="开始时间" />
              <span>→</span>
              <input class="sg-input" placeholder="结束时间" />
            </div>
          </div>
          <!-- 销量 XX 日 大于/等于/小于 XXX：销量查询（与运营管理同款形式） -->
          <div class="sg-field">
            <label>销量</label>
            <div class="sg-compact">
              <input class="sg-input" placeholder="销量" />
              <span>日</span>
              <BubbleSelect class-name="sg-select" default-value="请选择" :options="['大于', '等于', '小于']" />
              <input class="sg-input" placeholder="请输入值" />
            </div>
          </div>
          <div class="sg-field">
            <label>是否命中预警</label>
            <BubbleSelect class-name="sg-select" :value="filter.hitWarn" :options="['全部', '命中预警', '未命中预警']" @change="(v: string) => patchFilter({ hitWarn: v })" />
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
              <th :style="{ width: '380px' }">商品信息</th>
              <SortTh label="近20日销量概览" width="140px" :state="sortIco('sold')" @sort="toggleSort('sold')" />
              <th :style="{ width: '150px' }">商品状态</th>
              <th :style="{ width: '120px' }">商品策略</th>
              <th :style="{ width: '150px' }">预警</th>
              <SortTh label="发布信息" width="240px" :state="sortIco('pub')" @sort="toggleSort('pub')" />
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
                <div class="sg-biz sg-biz-1col">
                  <div><span>销量</span><b>{{ zero(p.sold30) }}</b></div>
                  <div><span>总销量</span><b>{{ zero(p.sales) }}</b></div>
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
                  {{ SG_OFF_GROUP[p.offType] }}
                </div>
              </td>
              <td>{{ p.strategy }}</td>
              <td>
                <div v-if="p.offType && sgWarnType(p)" class="sg-offtag" :class="isFailOff(p) ? 'fail' : 'normal'" @mouseenter="showOffPop($event, p.offReason ?? '')" @mouseleave="hideOffPop">
                  {{ sgWarnType(p) }} <i class="sg-fail-i">i</i>
                </div>
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
                    @click.prevent="a === '商品详情' ? (detail = p) : null"
                  >
                    {{ a }}
                  </a>
                  <a
                    v-if="sgWarnType(p)"
                    class="sg-link"
                    href="javascript:void(0)"
                    @click.prevent="relTarget = p"
                  >关联商品</a>
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
    </div>

    <div v-if="offPop.show" class="sg-fail-pop" :style="{ left: offPop.x + 'px', top: offPop.y + 'px' }">
      <p>{{ offPop.text }}</p>
    </div>

    <CwRelDrawer :product="relTarget" @close="relTarget = null" />
  </div>
</template>
