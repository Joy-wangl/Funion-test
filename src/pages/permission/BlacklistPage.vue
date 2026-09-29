<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect, { type BubbleOption } from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import SortTh from '../../components/SortTh.vue';
import { pushToast } from '../../components/toast';
import { internalProducts } from '../ops-center/data';
import { BL_TYPES, addBlacklist, blacklist, hasBlacklist, removeBlacklist } from '../ops-center/blacklistData';
import type { BlEntry, BlType } from '../ops-center/blacklistData';
import './style.css';

/* =========================================================
   设置 › 黑品库（商品编码 / 系列编码 / 内部商机链接商品ID 黑名单）
   命中黑名单的商品发布到店铺时发布任务失败，任务列表展示失败原因
   筛选：类型 / 关键词（即效）；添加：弹窗（类型 + 编码或内部商机）；移除：二次确认
   ========================================================= */

/* ---------- 筛选（即效，无查询按钮） ---------- */
const fType = ref<'全部' | BlType>('全部');
const fKw = ref('');
const typeOpts = computed(() => ['全部', ...BL_TYPES]);
const filtered = computed(() => {
  const out = blacklist.filter((r) => {
    if (fType.value !== '全部' && r.type !== fType.value) return false;
    const kw = fKw.value.trim();
    if (!kw) return true;
    return r.value.includes(kw) || r.name.includes(kw);
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

/* ---------- 移除：二次确认 ---------- */
const delRow = ref<BlEntry | null>(null);
const confirmDel = () => {
  if (!delRow.value) return;
  removeBlacklist(delRow.value.id);
  pushToast('已移出黑名单');
  delRow.value = null;
};
</script>

<template>
  <div class="sg-page bl-page">
    <!-- 筛选卡：类型 + 关键词条件即效，添加入口同排右对齐 -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>黑名单类型</label>
          <BubbleSelect class-name="sg-select" :value="fType" :options="typeOpts" @change="(v: string) => (fType = v as BlType | '全部')" />
        </div>
        <div class="sg-field">
          <label>关键词</label>
          <input v-model="fKw" class="sg-input" placeholder="请输入编码或商品ID" />
        </div>
        <div class="sg-actions">
          <button type="button" class="sg-btn primary" @click="openAdd">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>添加黑名单</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 黑名单列表 -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table bl-table">
          <thead>
            <tr>
              <th>黑名单类型</th>
              <th>编码 / 商品ID</th>
              <th>商品名称</th>
              <th>添加人</th>
              <SortTh label="添加时间" :state="sortState()" @sort="onSort" />
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td><span class="bl-type" :class="typeCls(r.type)">{{ r.type }}</span></td>
              <td>{{ r.value }}</td>
              <td><Ellipsis :text="r.name || '-'" /></td>
              <td>{{ r.addBy }}</td>
              <td>{{ r.addTime }}</td>
              <td>
                <div class="sg-acts">
                  <a class="sg-link danger" href="javascript:void(0)" @click.prevent="delRow = r">移除</a>
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
            <BubbleSelect :value="aType" :options="BL_TYPES" @change="(v: string) => (aType = v as BlType)" />
          </div>
          <div v-if="aType === '内部商机'" class="di-field">
            <label>内部商机（链接商品ID）</label>
            <BubbleSelect :value="aOpp" :options="oppOpts" searchable @change="(v: string) => (aOpp = v)" />
          </div>
          <div v-else class="di-field">
            <label>{{ aType }}</label>
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

      <!-- 移除二次确认 -->
      <Modal v-if="delRow" title="移除黑名单" sub="移除后该商品可正常发布到店铺" @close="delRow = null">
        <div class="di-form">
          <div class="di-field">
            <div class="di-val">确认将「{{ delRow.type }}：{{ delRow.value }}」移出黑名单？</div>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="delRow = null">取消</button>
          <button class="btn danger" @click="confirmDel">确认移除</button>
        </template>
      </Modal>
    </div>
  </div>
</template>
