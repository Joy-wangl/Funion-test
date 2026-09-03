<script setup lang="ts">
import { computed } from 'vue';
import type { ProductRow } from './data';
import { PLATFORM_LOGO, platformOfStore } from './data';
import BubbleSelect, { BUBBLE_ICON_PATHS, COLOR_ENUM } from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { useAnchorPop } from '../../hooks/useAnchorPop';

const props = defineProps<{
  rows: ProductRow[];
  /** 勾选列宽度：内部商机 48px，运营管理 56px（含加宽留白） */
  checkWidth: number;
  /** 序号列宽度：内部商机 52px，运营管理 60px */
  indexWidth: number;
  /** 行勾选状态（受控）；不传则为非受控原生 checkbox */
  checked?: boolean[];
  /** 操作列「详情」回调；不传时详情链接不响应 */
  onDetail?: (row: ProductRow) => void;
  /** 列管理：隐藏的列 key（运营管理页 ▦ 气泡控制；不传则全列展示） */
  hidden?: string[];
  /** 查询条件扩展列（运营管理传入：key 与筛选标签一致，值取 row.extra[key]；不传则仅基础 13 列） */
  extraCols?: { key: string; label: string }[];
  /** 中列完整有序列表（运营管理 ▦ 气泡拖拽排序后传入；不传则基础序 + 扩展列） */
  colOrder?: { key: string; label: string }[];
  /** 数字列 key：表头渲染 SortTh 支持排序（不传则全部普通表头） */
  sortKeys?: string[];
  /** 当前排序状态（单列激活） */
  sortState?: { key: string; dir: 'asc' | 'desc' } | null;
  /** 操作列动作（运营管理传入：与店铺商品操作列同步；不传则详情/添加到） */
  actions?: (row: ProductRow) => string[];
}>();
const emit = defineEmits<{ (e: 'checkChange', index: number, checked: boolean): void; (e: 'sort', key: string): void; (e: 'action', row: ProductRow, action: string): void }>();

const isSortable = (k: string) => (props.sortKeys ?? []).includes(k);
const thState = (k: string): 'none' | 'asc' | 'desc' => (props.sortState?.key === k ? props.sortState.dir : 'none');

const isHidden = (k: string) => (props.hidden ?? []).includes(k);

/* 基础可隐藏列（内部商机默认序）；运营管理经 colOrder 传入全量有序列 */
const BASE_COLS = [
  { key: 'category', label: '商品类目' },
  { key: 'trend', label: '近30天销量趋势' },
  { key: 'yesterday', label: '昨日销量' },
  { key: 'week7', label: '近7日销量' },
  { key: 'refund', label: '退款率' },
  { key: 'refundAfter', label: '发货后退款率' },
  { key: 'publisher', label: '发布人' },
  { key: 'created', label: '创建时间' },
  { key: 'status', label: '状态' },
];
/* 中列（商品信息与操作之间）：colOrder 优先（可排序），否则基础序 + 扩展列 */
const middleCols = computed(() => props.colOrder ?? [...BASE_COLS, ...(props.extraCols ?? [])]);
/* 星星/旗帜 列表按标注「使用图标样式」：颜色名→色值，空白不渲染 */
const COLOR_OF: Record<string, string> = Object.fromEntries(COLOR_ENUM.map((c) => [c.name, c.color]));
const iconColorOf = (row: ProductRow, key: string) => COLOR_OF[row.extra?.[key] ?? ''] ?? '';
const cellText = (row: ProductRow, key: string): string => {
  switch (key) {
    case 'category': return row.category;
    case 'yesterday': return `${row.yesterday}`;
    case 'week7': return `${row.week7}`;
    case 'refund': return row.refundRate;
    case 'refundAfter': return row.refundAfter;
    case 'publisher': return row.publisher;
    case 'created': return row.created;
    default: return row.extra?.[key] ?? '—';
  }
};

/* 添加到：点击后气泡展示平台选项（滚动时跟随触发链接） */
const { pos: addTip, open, close: closeAddTip } = useAnchorPop();
const openAddTip = (e: MouseEvent) => open(e.currentTarget as HTMLElement);
</script>

<template>
  <!-- 内部商机 / 运营管理共用的商品表格（中列顺序由 colOrder 驱动）+ 分页 -->
  <div class="ib-table-card">
    <div class="ib-table-wrap">
      <table class="ib-table">
        <thead>
          <tr>
            <th :style="{ width: props.checkWidth + 'px' }">
              <input type="checkbox" class="ib-check" />
            </th>
            <th :style="{ width: props.indexWidth + 'px' }">序号</th>
            <th>商品信息</th>
            <template v-for="c in middleCols" :key="`h-${c.key}`">
              <SortTh v-if="!isHidden(c.key) && isSortable(c.key)" :label="c.label" :state="thState(c.key)" @sort="emit('sort', c.key)" />
              <th v-else-if="!isHidden(c.key)">{{ c.label }}</th>
            </template>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in props.rows" :key="row.pid">
            <td>
              <input
                type="checkbox"
                class="ib-check"
                :checked="props.checked ? props.checked[i] : undefined"
                @change="emit('checkChange', i, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td class="ib-center">{{ i + 1 }}</td>
            <td>
              <div class="ib-product">
                <img class="ib-thumb" :src="row.thumb" />
                <div>
                  <div class="ib-pname"><Ellipsis :text="row.pname" /></div>
                  <div class="ib-meta">商品ID：{{ row.pid }}</div>
                  <div class="ib-meta">
                    店铺：
                    <span class="store-logo">
                      <img :src="PLATFORM_LOGO[platformOfStore(row.storeMeta.text)]" alt="" />
                    </span>
                    {{ row.storeMeta.text }}
                  </div>
                </div>
              </div>
            </td>
            <template v-for="c in middleCols" :key="`c-${c.key}`">
              <td v-if="!isHidden(c.key) && c.key === 'trend'">
                <svg class="spark" viewBox="0 0 90 32">
                  <polyline fill="none" stroke="#68a1ff" stroke-width="2" :points="row.spark" />
                </svg>
              </td>
              <td v-else-if="!isHidden(c.key) && c.key === 'status'">
                <span class="badge-green">在售</span>
              </td>
              <td v-else-if="!isHidden(c.key) && (c.key === '星星' || c.key === '旗帜')" class="ib-center">
                <svg
                  v-if="iconColorOf(row, c.key)"
                  class="cell-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  :style="{ color: iconColorOf(row, c.key) }"
                  aria-hidden="true"
                ><path :d="BUBBLE_ICON_PATHS[c.key === '星星' ? 'star' : 'flag']" fill="currentColor" /></svg>
              </td>
              <td v-else-if="!isHidden(c.key)">{{ cellText(row, c.key) }}</td>
            </template>
            <td class="actions-col">
              <div v-if="props.actions" class="sg-acts">
                <a
                  v-for="a in props.actions(row)"
                  :key="a"
                  class="sg-link"
                  href="javascript:void(0)"
                  @click.prevent="emit('action', row, a)"
                >
                  {{ a }}
                </a>
              </div>
              <template v-else>
                <a
                  href="#"
                  @click.prevent="onDetail ? onDetail(row) : null"
                >
                  详情
                </a>
                <a
                  href="#"
                  @click.prevent.stop="openAddTip"
                >
                  添加到
                </a>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="ib-pagination">
      <div class="ib-pageinfo">共 15001662 条</div>
      <BubbleSelect class-name="ib-page-size" default-value="50条/页" :options="['50条/页', '100条/页', '300条/页', '500条/页']" />
      <div class="ib-pages">
        <button class="ib-pagebtn nav">‹</button>
        <button class="ib-pagebtn active">1</button>
        <button class="ib-pagebtn">2</button>
        <button class="ib-pagebtn">3</button>
        <button class="ib-pagebtn">4</button>
        <button class="ib-pagebtn">5</button>
        <button class="ib-pagebtn">6</button>
        <button class="ib-pagebtn">…</button>
        <button class="ib-pagebtn">300034</button>
        <button class="ib-pagebtn nav">›</button>
      </div>
      <div class="ib-jump">
        <span>前往</span>
        <input class="ib-jump-input" value="1" />
        <span>页</span>
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
