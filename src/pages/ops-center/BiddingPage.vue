<script setup lang="ts">
import { computed, ref } from 'vue';
import { biddingRows } from './data';
import type { BiddingRow, CreateRow } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import CreateDetailPage from './CreateDetailPage.vue';
import { pushToast } from '../../components/toast';
import { useAnchorPop } from '../../hooks/useAnchorPop';

/** 商机中心-竞价商品：筛选 + 列表 */
const empty = {
  name: '',
  pid: '',
  code: '',
  stock: '全部',
  status: '全部',
  thMin: '',
  thMax: '',
  pfMin: '',
  pfMax: '',
  tStart: '',
  tEnd: '',
};
const filter = ref({ ...empty });
const applied = ref({ ...empty });

const num = (s: string) => {
  const n = parseFloat(s.replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
};
/* 招募状态筛选选项 + 徽标配色 */
const STATUS_OPTIONS = ['全部', '报名待开启', '报名中', '待开始'];
const statusCls = (s: string) => (s === '报名中' ? 'badge-green' : s === '待开始' ? 'badge-orange' : 'badge-gray');

const list = computed(() =>
  biddingRows.filter((r) => {
    const a = applied.value;
    if (a.status !== '全部' && r.status !== a.status) return false;
    if (a.name && !r.name.includes(a.name)) return false;
    if (a.pid && !r.pid.includes(a.pid)) return false;
    if (a.code && !r.skus.some((s) => s.code.toLowerCase().includes(a.code.toLowerCase()))) return false;
    if (a.stock !== '全部' && !r.skus.some((s) => s.stock === a.stock)) return false;
    /* 门槛价 / 预估利润 为 SKU 维度：任一 SKU 命中区间即保留该商品 */
    const thMin = num(a.thMin);
    const thMax = num(a.thMax);
    if ((thMin !== null || thMax !== null) && !r.skus.some((s) => {
      const th = num(s.threshold);
      return th !== null && (thMin === null || th >= thMin) && (thMax === null || th <= thMax);
    })) return false;
    const pfMin = num(a.pfMin);
    const pfMax = num(a.pfMax);
    if ((pfMin !== null || pfMax !== null) && !r.skus.some((s) => {
      const pf = num(s.profit);
      return pf !== null && (pfMin === null || pf >= pfMin) && (pfMax === null || pf <= pfMax);
    })) return false;
    if (a.tStart && r.imported < a.tStart) return false;
    if (a.tEnd && r.imported > `${a.tEnd} 23:59`) return false;
    return true;
  }),
);

/* 预估利润区间：当前商品ID 内 SKU 利润最小-最大 */
const profitRange = (r: BiddingRow) => {
  const vs = r.skus.map((s) => num(s.profit)).filter((v): v is number => v !== null);
  if (!vs.length) return '-';
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  return lo === hi ? `¥${lo.toFixed(2)}` : `¥${lo.toFixed(2)} - ¥${hi.toFixed(2)}`;
};

/* 行展开：必报SKU 维度子表（一个商品ID 下多个 SKU） */
const expanded = ref<Set<string>>(new Set());
const toggleExpand = (pid: string) => {
  const next = new Set(expanded.value);
  if (next.has(pid)) next.delete(pid);
  else next.add(pid);
  expanded.value = next;
};

/* 添加到：点击后气泡展示平台选项（与内部商机列表操作一致） */
const { pos: addTip, open, close: closeAddTip } = useAnchorPop();
const openAddTip = (e: MouseEvent) => open(e.currentTarget as HTMLElement);

/* 行勾选 + 导出 CSV（带 BOM，Excel 可直接打开） */
const checked = ref<Set<string>>(new Set());
const allChecked = computed(() => list.value.length > 0 && list.value.every((r) => checked.value.has(r.pid)));
const toggleCheck = (pid: string) => {
  if (checked.value.has(pid)) checked.value.delete(pid);
  else checked.value.add(pid);
};
const toggleAll = () => {
  if (allChecked.value) list.value.forEach((r) => checked.value.delete(r.pid));
  else list.value.forEach((r) => checked.value.add(r.pid));
};
const doExport = () => {
  /* 导出按 SKU 维度展平：一个商品ID 多个 SKU 则多行 */
  const rows = list.value.filter((r) => checked.value.has(r.pid)).flatMap((r) => r.skus.map((s) => ({ r, s })));
  if (!rows.length) {
    pushToast('请先勾选需要导出的商品', 'error');
    return;
  }
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const head = '商品ID,商品名称,招募状态,SKU名称,是否必报,门槛价,是否有货,商品编码,预估利润,导入时间';
  const csv = [head, ...rows.map(({ r, s }) => [r.pid, r.name, r.status, s.sku, s.required ? '是' : '否', s.threshold, s.stock, s.code, s.profit, r.imported].map(esc).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = '竞价商品.csv';
  link.click();
  URL.revokeObjectURL(url);
  pushToast(`已导出 ${rows.length} 条数据`);
};

/* 详情：复用商品创建-淘宝平台商品详情页 */
const detail = ref<BiddingRow | null>(null);
const toCreateRow = (r: BiddingRow): CreateRow => ({
  thumb: r.img,
  platformBadge: '淘宝',
  title: r.name,
  link: r.link,
  store: '-',
  person: '-',
  time: r.imported,
});
</script>

<template>
  <CreateDetailPage v-if="detail" :row="toCreateRow(detail)" @back="detail = null" />
  <div v-else>
    <div class="ib-filters">
      <div class="ib-grid">
        <div class="ib-field">
          <label>商品名称</label>
          <input class="ib-input" placeholder="请输入商品名称" :value="filter.name" @input="filter = { ...filter, name: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="ib-field">
          <label>商品ID</label>
          <input class="ib-input" placeholder="请输入商品ID" :value="filter.pid" @input="filter = { ...filter, pid: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="ib-field">
          <label>商品编码</label>
          <input class="ib-input" placeholder="请输入商品编码" :value="filter.code" @input="filter = { ...filter, code: ($event.target as HTMLInputElement).value }" />
        </div>
        <div class="ib-field">
          <label>是否有货</label>
          <BubbleSelect class-name="ib-select" :value="filter.stock" :options="['全部', '有货', '缺货']" @change="(v: string) => filter = { ...filter, stock: v }" />
        </div>
        <div class="ib-field">
          <label>招募状态</label>
          <BubbleSelect class-name="ib-select" :value="filter.status" :options="STATUS_OPTIONS" @change="(v: string) => filter = { ...filter, status: v }" />
        </div>

        <div class="ib-field">
          <label>门槛价</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="最小值" :value="filter.thMin" @input="filter = { ...filter, thMin: ($event.target as HTMLInputElement).value }" />
            <span>至</span>
            <input class="ib-input" placeholder="最大值" :value="filter.thMax" @input="filter = { ...filter, thMax: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
        <div class="ib-field">
          <label>预估利润</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="最小值" :value="filter.pfMin" @input="filter = { ...filter, pfMin: ($event.target as HTMLInputElement).value }" />
            <span>至</span>
            <input class="ib-input" placeholder="最大值" :value="filter.pfMax" @input="filter = { ...filter, pfMax: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
        <div class="ib-field">
          <label>导入时间</label>
          <div class="ib-range">
            <input class="ib-input" placeholder="开始时间" :value="filter.tStart" @input="filter = { ...filter, tStart: ($event.target as HTMLInputElement).value }" />
            <span>→</span>
            <input class="ib-input" placeholder="结束时间" :value="filter.tEnd" @input="filter = { ...filter, tEnd: ($event.target as HTMLInputElement).value }" />
          </div>
        </div>
      </div>

      <div class="ib-actions">
        <div class="ib-rightacts">
          <BubbleSelect class-name="ib-select" :style="{ width: '120px' }" default-value="快速选品" :options="['快速选品', '淘宝C店', '视频号']" />
          <button class="lightBtn" @click="doExport">
            导出
          </button>
          <button class="lightBtn" @click="filter = { ...empty }; applied = { ...empty }">
            重置
          </button>
          <button class="primaryBtn" @click="applied = { ...filter }">
            查询
          </button>
        </div>
      </div>
    </div>

    <div class="ib-table-card">
      <div class="ib-table-wrap">
        <table class="ib-table bd-table">
          <thead>
            <tr>
              <th style="width: 64px">
                <span class="ib-caret ghost"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg></span>
                <input type="checkbox" class="ib-check" :checked="allChecked" @change="toggleAll" />
              </th>
              <th>商品信息</th>
              <th>招募状态</th>
              <th>预估利润区间</th>
              <th>导入时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in list" :key="r.pid">
              <tr>
                <td>
                  <span class="ib-caret" :class="{ open: expanded.has(r.pid) }" @click="toggleExpand(r.pid)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
                  </span>
                  <input type="checkbox" class="ib-check" :checked="checked.has(r.pid)" @change="toggleCheck(r.pid)" />
                </td>
                <td>
                  <div class="ib-product">
                    <img class="ib-thumb bd-thumb" :src="r.img" alt="" />
                    <div>
                      <a class="ib-pname bd-name" :href="r.link" target="_blank" rel="noreferrer"><Ellipsis :text="r.name" /></a>
                      <div class="ib-meta">商品ID：{{ r.pid }}</div>
                    </div>
                  </div>
                </td>
                <td><span :class="statusCls(r.status)">{{ r.status }}</span></td>
                <td>{{ profitRange(r) }}</td>
                <td>{{ r.imported }}</td>
                <td class="actions-col">
                  <a href="#" @click.prevent="detail = r">详情</a>
                  <a href="#" @click.prevent.stop="openAddTip">添加到</a>
                </td>
              </tr>
              <tr v-if="expanded.has(r.pid)" class="ib-expand-row">
                <td colspan="6">
                  <table class="ib-subtable">
                    <thead>
                      <tr>
                        <th>SKU名称</th>
                        <th>门槛价</th>
                        <th>是否有货</th>
                        <th>商品编码</th>
                        <th>预估利润</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="s in r.skus" :key="s.code">
                        <td>{{ s.sku }}<span v-if="s.required" class="badge-orange ib-req-tag">必报</span></td>
                        <td>{{ s.threshold }}</td>
                        <td><span :class="s.stock === '有货' ? 'badge-green' : 'badge-red'">{{ s.stock }}</span></td>
                        <td><span class="badge-gray">{{ s.code }}</span></td>
                        <td>{{ s.profit }}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        <div v-if="list.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ list.length }} 条</div>
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
      <div
        v-if="addTip"
        class="add-pop"
        :style="{ left: `${addTip.x}px`, top: `${addTip.y}px` }"
        @mousedown.stop
      >
        <div v-for="t in ['淘宝', '视频号']" :key="t" class="add-pop-item" @click="closeAddTip()">
          {{ t }}
        </div>
      </div>
    </Teleport>
  </div>
</template>
