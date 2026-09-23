<script setup lang="ts">
import { computed, ref } from 'vue';
import { motherLinkRows, createTaobaoRows } from './data';
import type { CreateRow } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import MoreActions from '../../components/MoreActions.vue';
import CreateDetailPage from './CreateDetailPage.vue';
import { pushToast } from '../../components/toast';
import ColFieldPop from './ColFieldPop.vue';
import { useColField } from './colFields';

/** 竞对商机（商机中心/内部商机下方，原母链商机）：复刻商品创建列表（筛选卡＋表格＋分页）；状态均待完善；详情仅查看不可编辑；
    列表支持选择并导入到商品创建（淘宝/视频号，原位写入创建列表联动），支持批量导入/批量删除 */
const rows = ref<CreateRow[]>([...motherLinkRows]);

/* 列表字段管理：百分比宽表不横向溢出，sticky=false 钉住仅置顶/置尾 */
const cf = useColField('motherLink', {
  fixedLeft: [{ key: 'check', pct: 4 }],
  fields: [
    { key: 'product', label: '商品信息', pct: 46 },
    { key: 'sales', label: '销量', pct: 14 },
    { key: 'created', label: '创建时间', pct: 20 },
  ],
  fixedRight: [{ key: 'actions', label: '操作', pct: 16 }],
  sticky: false,
});
const { midCols } = cf;
/* 详情查看态（仅查看） */
const detail = ref<CreateRow | null>(null);
/* 选择列：勾选后批量导入/批量删除 */
const selLinks = ref<Set<string>>(new Set());
const allChecked = computed(() => rows.value.length > 0 && rows.value.every((r) => selLinks.value.has(r.link)));
const toggleSel = (link: string, on: boolean) => {
  const next = new Set(selLinks.value);
  if (on) next.add(link);
  else next.delete(link);
  selLinks.value = next;
};
const toggleSelAll = (on: boolean) => {
  selLinks.value = on ? new Set(rows.value.map((r) => r.link)) : new Set();
};
const selRows = computed(() => rows.value.filter((r) => selLinks.value.has(r.link)));
/* 销量排序（三态循环）：升/降序切换，无排序保持导入序 */
const salesSort = ref<'none' | 'asc' | 'desc'>('none');
const viewRows = computed(() => {
  if (salesSort.value === 'none') return rows.value;
  return [...rows.value].sort((a, b) => ((a.sales ?? 0) - (b.sales ?? 0)) * (salesSort.value === 'asc' ? 1 : -1));
});
/* 导入到商品创建：原位写入淘宝创建列表（淘宝/视频号页同源联动）；重复导入提示并跳过 */
const IMPORT_PLATS = ['淘宝', '视频号'];
const imported = ref<Set<string>>(new Set());
const importTo = (targets: CreateRow[], plat: string, batch: boolean) => {
  const fresh = targets.filter((r) => !imported.value.has(`${r.link}|${plat}`));
  const dup = targets.length - fresh.length;
  fresh.forEach((r) => {
    imported.value.add(`${r.link}|${plat}`);
    createTaobaoRows.push({ ...r });
  });
  if (fresh.length) pushToast(`已导入 ${fresh.length} 条到「${plat}」商品创建`);
  if (dup) pushToast(`${dup} 条商机已导入过${plat}，自动跳过`, 'warning');
  if (batch) selLinks.value = new Set();
};
/* 删除二次确认（单条/批量共用弹窗） */
const delRow = ref<CreateRow | null>(null);
const delBatch = ref(false);
const confirmDelete = () => {
  if (delBatch.value) {
    const n = selLinks.value.size;
    rows.value = rows.value.filter((r) => !selLinks.value.has(r.link));
    selLinks.value = new Set();
    pushToast(`已删除 ${n} 条商机`);
  } else if (delRow.value) {
    const link = delRow.value.link;
    rows.value = rows.value.filter((r) => r.link !== link);
    selLinks.value = new Set([...selLinks.value].filter((l) => l !== link));
  }
  delRow.value = null;
  delBatch.value = false;
};
</script>

<template>
  <CreateDetailPage v-if="detail" :row="detail" readonly @back="detail = null" />
  <div v-else class="create-page">
    <div class="ib-filters create-filter mother-filter">
      <div class="ib-grid">
        <div class="ib-field">
          <label>来源平台</label>
          <BubbleSelect
            class-name="ib-select"
            default-value="淘宝"
            :options="['全部平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴']"
          />
        </div>
        <div class="ib-field">
          <label>商品名称</label>
          <input class="ib-input" placeholder="请输入商品名称" />
        </div>
        <div class="ib-field">
          <label>创建时间</label>
          <div class="ib-range">
            <input class="ib-input" value="2026-08-13" />
            <span>→</span>
            <input class="ib-input" value="2026-08-13" />
          </div>
        </div>
        <div class="create-actions-inline">
          <div class="create-act-left">
            <MoreActions :items="IMPORT_PLATS.map((p) => ({ label: p, onClick: () => importTo(selRows, p, true) }))">
              <template #trigger>
                <button class="primaryBtn" :disabled="selLinks.size === 0">批量导入</button>
              </template>
            </MoreActions>
            <button class="lightBtn" :disabled="selLinks.size === 0" @click="delBatch = true">批量删除</button>
          </div>
          <div class="create-act-right">
            <!-- 列表字段管理 ▦：居按钮组最左（规范） -->
            <ColFieldPop :st="cf" />
            <button class="lightBtn">重置</button>
            <button class="primaryBtn">查询</button>
          </div>
        </div>
      </div>
    </div>

    <div class="ib-table-card">
      <div class="ib-table-wrap">
        <table class="ib-table create-table">
          <thead>
            <tr>
              <th :style="{ width: '4%' }">
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="allChecked"
                  @change="toggleSelAll(($event.target as HTMLInputElement).checked)"
                />
              </th>
              <!-- 列宽占比均衡（fixed 布局合计 100%，余宽会被首列吸收） -->
              <template v-for="c in midCols" :key="c.key">
                <SortTh v-if="c.key === 'sales'" label="销量" width="14%" :state="salesSort" @sort="salesSort = salesSort === 'asc' ? 'desc' : 'asc'" />
                <th v-else :style="{ width: `${c.pct}%` }">{{ c.label }}</th>
              </template>
              <th :style="{ width: '16%' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in viewRows" :key="row.link">
              <td>
                <input
                  type="checkbox"
                  class="ib-check"
                  :checked="selLinks.has(row.link)"
                  @change="toggleSel(row.link, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <template v-for="c in midCols" :key="c.key">
                <td v-if="c.key === 'product'">
                  <div class="create-product">
                    <img class="create-thumb" :src="row.thumb" alt="thumb" />
                    <div>
                      <div class="create-product-title">
                        <span class="create-platform-badge sm taobao">{{ row.platformBadge }}</span>
                        <Ellipsis class-name="create-title-ell" :text="row.title" />
                      </div>
                      <div class="create-link">
                        竞品链接：<a href="#"><Ellipsis class-name="create-link-ell" :text="row.link" /></a>
                      </div>
                    </div>
                  </div>
                </td>
                <td v-else-if="c.key === 'sales'">{{ row.sales ?? 0 }}</td>
                <td v-else-if="c.key === 'created'">
                  <div class="create-time">{{ row.time }}</div>
                </td>
              </template>
              <td class="create-ops">
                <a href="#" @click.prevent="detail = row">详情</a>
                <MoreActions :items="IMPORT_PLATS.map((p) => ({ label: p, onClick: () => importTo([row], p, false) }))">
                  <template #trigger>
                    <a href="#" @click.prevent>导入到</a>
                  </template>
                </MoreActions>
                <a class="cp-del" href="#" @click.prevent="delRow = row">删除</a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ rows.length }} 条</div>
        <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav">‹</button>
          <button class="ib-pagebtn active">1</button>
          <button class="ib-pagebtn nav">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" value="1" />
          <span>页</span>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="delRow || delBatch" class="cp-modal-mask">
        <div class="cp-modal">
          <div class="cp-modal-title">删除确认</div>
          <div class="cp-modal-text">
            {{ delBatch ? `确认删除所选 ${selLinks.size} 条商机？商机删除后无法恢复。` : '商机删除后无法恢复，是否确认删除？' }}
          </div>
          <div class="cp-modal-foot">
            <button class="cp-btn" @click="delRow = null; delBatch = false">取消</button>
            <button class="cp-btn danger" @click="confirmDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
