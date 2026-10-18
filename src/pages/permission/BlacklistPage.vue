<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect, { type BubbleOption } from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { PLATFORM_LOGO, internalProducts, platformOfStore, productSeriesCode } from '../ops-center/data';
import { BL_TYPES, addBlacklist, blacklist, hasBlacklist, removeBlacklist } from '../ops-center/blacklistData';
import type { BlEntry, BlType } from '../ops-center/blacklistData';
import './style.css';

/* =========================================================
   设置 › 黑品库（商品编码 / 系列编码 / 内部商机链接商品ID 黑名单）
   命中黑名单的商品发布到店铺时发布任务失败，任务列表展示失败原因
   列表四列：商品信息（图/名称/商品ID/店铺）· 类型 · 添加人/添加时间 · 操作（详情/取消标记）
   筛选：类型 / 商品编码 / 系列编码（即效）；添加：弹窗（类型 + 编码或内部商机）；取消标记：二次确认
   ========================================================= */

/* ---------- 类型展示：内部商机即「黑品链接」（商品链接维度黑名单） ---------- */
const typeLabel = (t: BlType) => (t === '内部商机' ? '黑品链接' : t);
const typeOpts = computed<BubbleOption[]>(() => ['全部', ...BL_TYPES].map((t) => (t === '全部' ? { value: t, label: '全部' } : { value: t, label: typeLabel(t as BlType) })));
const blTypeOpts = computed<BubbleOption[]>(() => BL_TYPES.map((t) => ({ value: t, label: typeLabel(t) })));

/* ---------- 商品回显：按类型把黑名单条目解析为内部商机商品行（图/名称/商品ID/店铺） ---------- */
const productOf = (r: BlEntry) => {
  if (r.type === '系列编码') return internalProducts.find((p) => productSeriesCode(p.pid) === r.value) ?? null;
  return internalProducts.find((p) => p.pid === r.value) ?? null;
};
const codeOf = (r: BlEntry) => productOf(r)?.pid ?? (r.type === '商品编码' ? r.value : '');
const seriesOf = (r: BlEntry) => {
  const p = productOf(r);
  return p ? productSeriesCode(p.pid) : r.type === '系列编码' ? r.value : '';
};

/* ---------- 筛选（即效，无查询按钮）：类型 + 商品编码 + 系列编码 ---------- */
const fType = ref<'全部' | BlType>('全部');
const fCode = ref('');
const fSeries = ref('');
const filtered = computed(() => {
  const out = blacklist.filter((r) => {
    if (fType.value !== '全部' && r.type !== fType.value) return false;
    const fc = fCode.value.trim();
    if (fc && !codeOf(r).includes(fc) && !r.value.includes(fc)) return false;
    const fs = fSeries.value.trim();
    if (fs && !seriesOf(r).includes(fs) && !r.value.includes(fs)) return false;
    return true;
  });
  /* 添加时间列头排序：addTime 为非补零本地格式，按解析时间戳比较 */
  if (sortDir.value !== 'none') {
    const dir = sortDir.value === 'asc' ? 1 : -1;
    const ts = (s: string) => new Date(s.replace(' ', 'T')).getTime() || 0;
    return [...out].sort((a, b) => (ts(a.addTime) - ts(b.addTime)) * dir);
  }
  return out;
});
/* 排序状态：单列（添加时间）激活，点击循环 desc → asc → 取消 */
const sortDir = ref<'none' | 'asc' | 'desc'>('none');
const onSort = () => {
  if (sortDir.value === 'none') sortDir.value = 'desc';
  else if (sortDir.value === 'desc') sortDir.value = 'asc';
  else sortDir.value = 'none';
};
const sortState = () => sortDir.value;

/* 类型芯片配色映射 */
const typeCls = (t: BlType) => (t === '商品编码' ? 't-code' : t === '系列编码' ? 't-series' : 't-opp');

/* ---------- 添加黑名单弹窗 ---------- */
const addOpen = ref(false);
const aType = ref<BlType>(BL_TYPES[0]);
const aCode = ref('');
const aOpp = ref('');
/* 内部商机下拉：值为链接商品ID，标签为商品名 */
const oppOpts = computed<BubbleOption[]>(() => internalProducts.map((p) => ({ value: p.pid, label: p.pname })));
const openAdd = () => {
  aType.value = BL_TYPES[0];
  aCode.value = '';
  aOpp.value = '';
  addOpen.value = true;
};
const submitAdd = () => {
  if (aType.value === '内部商机') {
    if (!aOpp.value) { pushToast('请选择内部商机', 'warning'); return; }
    if (hasBlacklist('内部商机', aOpp.value)) { pushToast('该内部商机已在黑名单中', 'warning'); return; }
    const p = internalProducts.find((x) => x.pid === aOpp.value);
    addBlacklist('内部商机', aOpp.value, p?.pname ?? '');
    pushToast('已加入黑名单');
  } else {
    const v = aCode.value.trim();
    if (!v) { pushToast(aType.value === '商品编码' ? '请输入商品编码' : '请输入系列编码', 'warning'); return; }
    if (hasBlacklist(aType.value, v)) { pushToast('该编码已在黑名单中', 'warning'); return; }
    addBlacklist(aType.value, v);
    pushToast('已加入黑名单');
  }
  addOpen.value = false;
};

/* ---------- 详情弹窗 ---------- */
const detailRow = ref<BlEntry | null>(null);

/* ---------- 取消标记：二次确认 ---------- */
const delRow = ref<BlEntry | null>(null);
const confirmDel = () => {
  if (!delRow.value) return;
  removeBlacklist(delRow.value.id);
  pushToast('已取消黑品标记');
  delRow.value = null;
};
</script>

<template>
  <div class="sg-page bl-page">
    <!-- 筛选卡：类型 + 商品编码 + 系列编码条件即效，添加入口同排右对齐 -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>黑名单类型</label>
          <BubbleSelect class-name="sg-select" :value="fType" :options="typeOpts" @change="(v: string) => (fType = v as BlType | '全部')" />
        </div>
        <div class="sg-field">
          <label>商品编码</label>
          <input v-model="fCode" class="sg-input" placeholder="请输入商品编码" />
        </div>
        <div class="sg-field">
          <label>系列编码</label>
          <input v-model="fSeries" class="sg-input" placeholder="请输入系列编码" />
        </div>
        <div class="sg-actions">
          <button type="button" class="sg-btn primary" @click="openAdd">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>添加黑名单</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 黑名单列表：商品信息 / 类型 / 添加人·添加时间 / 操作 -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table bl-table">
          <thead>
            <tr>
              <th>商品信息</th>
              <th>类型</th>
              <SortTh label="添加人 / 添加时间" :state="sortState()" @sort="onSort" />
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td>
                <div class="ib-product">
                  <img v-if="productOf(r)" class="ib-thumb" :src="productOf(r)!.thumb" alt="" />
                  <div v-else class="ib-thumb bl-thumb-ph"></div>
                  <div class="bl-pinfo">
                    <div class="ib-pname"><Ellipsis :text="productOf(r)?.pname || r.name || '-'" /></div>
                    <div class="ib-meta">商品ID：{{ productOf(r)?.pid || r.value }}</div>
                    <div class="ib-meta">
                      店铺：
                      <span v-if="productOf(r)" class="store-logo">
                        <img :src="PLATFORM_LOGO[platformOfStore(productOf(r)!.storeMeta.text)]" alt="" />
                      </span>
                      {{ productOf(r)?.storeMeta.text || '-' }}
                    </div>
                  </div>
                </div>
              </td>
              <td><span class="bl-type" :class="typeCls(r.type)">{{ typeLabel(r.type) }}</span></td>
              <td>
                <div class="bl-who">{{ r.addBy }}</div>
                <div class="ib-meta">{{ r.addTime }}</div>
              </td>
              <td>
                <div class="sg-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="detailRow = r">详情</a>
                  <a class="sg-link danger" href="javascript:void(0)" @click.prevent="delRow = r">取消标记</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filtered.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无黑名单数据</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加黑名单弹窗 -->
    <div class="pm-page pm-host">
      <Modal v-if="addOpen" title="添加黑名单" sub="命中黑名单的商品将无法发布到店铺" @close="addOpen = false">
        <div class="di-form">
          <div class="di-field">
            <label>黑名单类型</label>
            <BubbleSelect class-name="sg-select" :value="aType" :options="blTypeOpts" @change="(v: string) => (aType = v as BlType)" />
          </div>
          <div v-if="aType === '内部商机'" class="di-field">
            <label>内部商机（链接商品ID）</label>
            <BubbleSelect class-name="sg-select" :value="aOpp" :options="oppOpts" searchable @change="(v: string) => (aOpp = v)" />
          </div>
          <div v-else class="di-field">
            <label>{{ typeLabel(aType) }}</label>
            <input v-model="aCode" class="sg-input" :placeholder="aType === '商品编码' ? '请输入商品编码' : '请输入系列编码'" />
          </div>
          <div class="di-field">
            <label>添加人</label>
            <div class="di-val">七妮妮</div>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="addOpen = false">取消</button>
          <button class="btn primary" @click="submitAdd">确认添加</button>
        </template>
      </Modal>

      <!-- 黑品详情 -->
      <Modal v-if="detailRow" title="黑品详情" :sub="productOf(detailRow)?.pname || detailRow.name || detailRow.value" @close="detailRow = null">
        <div class="di-form">
          <div class="di-field">
            <label>商品信息</label>
            <div class="ib-product bl-detail-prod">
              <img v-if="productOf(detailRow)" class="ib-thumb" :src="productOf(detailRow)!.thumb" alt="" />
              <div v-else class="ib-thumb bl-thumb-ph"></div>
              <div class="bl-pinfo">
                <div class="ib-pname"><Ellipsis :text="productOf(detailRow)?.pname || detailRow.name || '-'" /></div>
                <div class="ib-meta">商品ID：{{ productOf(detailRow)?.pid || detailRow.value }}</div>
                <div class="ib-meta">
                  店铺：
                  <span v-if="productOf(detailRow)" class="store-logo">
                    <img :src="PLATFORM_LOGO[platformOfStore(productOf(detailRow)!.storeMeta.text)]" alt="" />
                  </span>
                  {{ productOf(detailRow)?.storeMeta.text || '-' }}
                </div>
              </div>
            </div>
          </div>
          <div class="di-field">
            <label>类型</label>
            <div><span class="bl-type" :class="typeCls(detailRow.type)">{{ typeLabel(detailRow.type) }}</span></div>
          </div>
          <div class="di-field">
            <label>{{ detailRow.type === '系列编码' ? '系列编码' : '商品编码' }}</label>
            <div class="di-val">{{ detailRow.value }}</div>
          </div>
          <div class="di-field">
            <label>添加人 / 添加时间</label>
            <div class="di-val">{{ detailRow.addBy }}　{{ detailRow.addTime }}</div>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="detailRow = null">关闭</button>
        </template>
      </Modal>

      <!-- 取消标记二次确认 -->
      <Modal v-if="delRow" title="取消标记" sub="取消后该商品可正常发布到店铺" @close="delRow = null">
        <div class="di-form">
          <div class="di-field">
            <div class="di-val">确认取消「{{ typeLabel(delRow.type) }}：{{ delRow.value }}」的黑品标记？</div>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="delRow = null">取消</button>
          <button class="btn danger" @click="confirmDel">确认取消</button>
        </template>
      </Modal>
    </div>
  </div>
</template>
