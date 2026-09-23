<script setup lang="ts">
import { computed } from 'vue';
import type { ProductRow } from './data';
import { PLATFORM_LOGO, platformOfStore } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import { SG_STATUS_META, sgOffTagOfStatus } from './shopGoodsData';
import type { SgStatus } from './shopGoodsData';
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
  colOrder?: { key: string; label?: string }[];
  /** 钉住列 key（按钉住序，须与 colOrder 前缀一致）：列冻结在列表最左随横向滚动不消失 */
  pinned?: string[];
  /** 右钉列 key（按钉住序，须与 colOrder 后缀一致）：列冻结在列表最右（操作列之左）随横向滚动不消失 */
  pinnedRight?: string[];
  /** 数字列 key：表头渲染 SortTh 支持排序（不传则全部普通表头） */
  sortKeys?: string[];
  /** 当前排序状态（单列激活） */
  sortState?: { key: string; dir: 'asc' | 'desc' } | null;
  /** 操作列动作（运营管理传入：与店铺商品操作列同步；不传则详情/添加到） */
  actions?: (row: ProductRow) => string[];
  /** 管理权限判定（内部商机权限控制传入）：true=该行店铺不在可管理范围，「添加到」置灰且点击提示 */
  manageDenied?: (row: ProductRow) => boolean;
}>();
const emit = defineEmits<{ (e: 'checkChange', index: number, checked: boolean): void; (e: 'sort', key: string): void; (e: 'action', row: ProductRow, action: string): void }>();

const isSortable = (k: string) => (props.sortKeys ?? []).includes(k);
const thState = (k: string): 'none' | 'asc' | 'desc' => (props.sortState?.key === k ? props.sortState.dir : 'none');

const isHidden = (k: string) => (props.hidden ?? []).includes(k);

/* 钉住冻结：有钉住列时表格切 fixed 布局（冻结偏移才精确），勾选/序号/商品信息＋左钉列 sticky 左冻结，右钉列＋操作列 sticky 右冻结；
   left 偏移＝前置冻结列累计宽（勾选+序号+商品信息 320+左钉列各 140）；right 偏移＝操作列 120＋其后右钉列累计宽 */
const PRODUCT_W = 320;
const PIN_W = 140;
const ACT_W = 120;
const pinActive = computed(() => (props.pinned ?? []).length > 0 || (props.pinnedRight ?? []).length > 0);
const pinIdx = (k: string) => (props.pinned ?? []).indexOf(k);
const pinRIdx = (k: string) => (props.pinnedRight ?? []).indexOf(k);
const pinRActive = computed(() => (props.pinnedRight ?? []).length > 0);
const stickCls = (k: string) => {
  if (pinIdx(k) >= 0) return { 'ib-stick-l': true, 'ib-stick-edge': pinIdx(k) === (props.pinned ?? []).length - 1 };
  if (pinRIdx(k) >= 0) return { 'ib-stick-r': true, 'ib-stick-edge-r': pinRIdx(k) === 0 };
  return undefined;
};
const stickLeft = (k: string) => `${props.checkWidth + props.indexWidth + PRODUCT_W + pinIdx(k) * PIN_W}px`;
const stickRight = (k: string) => `${ACT_W + ((props.pinnedRight ?? []).length - 1 - pinRIdx(k)) * PIN_W}px`;
const stickStyle = (k: string) => {
  if (pinIdx(k) >= 0) return { left: stickLeft(k), width: `${PIN_W}px` };
  if (pinRIdx(k) >= 0) return { right: stickRight(k), width: `${PIN_W}px` };
  return undefined;
};
/* fixed 布局下未定宽列均分剩余宽：min-width 保底每列 150 防压窄 */
const pinMinW = computed(() => {
  const rest = middleCols.value.filter((c) => !isHidden(c.key) && pinIdx(c.key) < 0 && pinRIdx(c.key) < 0).length;
  return props.checkWidth + props.indexWidth + PRODUCT_W + (props.pinned ?? []).length * PIN_W + (props.pinnedRight ?? []).length * PIN_W + rest * 150 + ACT_W;
});

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
/* 状态列：行带店铺商品同源 sg（运营管理行）时按店铺商品「商品状态」样式渲染；内部商机无 sg 保留在售徽章 */
const sgStatusOf = (row: ProductRow): SgStatus | null => (row as { sg?: { status: SgStatus } }).sg?.status ?? null;
const sgMetaOf = (row: ProductRow) => {
  const s = sgStatusOf(row);
  return s ? SG_STATUS_META[s] : null;
};
const sgOffTag = (row: ProductRow) => {
  const s = sgStatusOf(row);
  return s ? sgOffTagOfStatus(s) : null;
};
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
      <table class="ib-table ib-loose" :class="{ 'ib-pin': pinActive }" :style="pinActive ? { minWidth: `${pinMinW}px` } : undefined">
        <thead>
          <tr>
            <th :class="{ 'ib-stick-l': pinActive }" :style="{ width: props.checkWidth + 'px', left: pinActive ? '0px' : undefined }">
              <input type="checkbox" class="ib-check" />
            </th>
            <th :class="{ 'ib-stick-l': pinActive }" :style="{ width: props.indexWidth + 'px', left: pinActive ? `${props.checkWidth}px` : undefined }">序号</th>
            <th :class="{ 'ib-stick-l': pinActive }" :style="{ width: pinActive ? `${PRODUCT_W}px` : undefined, left: pinActive ? `${props.checkWidth + props.indexWidth}px` : undefined }">商品信息</th>
            <template v-for="c in middleCols" :key="`h-${c.key}`">
              <SortTh
                v-if="!isHidden(c.key) && isSortable(c.key)"
                :class="stickCls(c.key)"
                :style="stickStyle(c.key)"
                :width="pinIdx(c.key) >= 0 || pinRIdx(c.key) >= 0 ? `${PIN_W}px` : undefined"
                :label="c.label ?? ''" :state="thState(c.key)" @sort="emit('sort', c.key)"
              />
              <th v-else-if="!isHidden(c.key)" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ c.label }}</th>
            </template>
            <th :class="{ 'ib-stick-r': pinRActive }" :style="pinRActive ? { right: '0px', width: `${ACT_W}px` } : undefined">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, i) in props.rows" :key="row.pid">
            <td :class="{ 'ib-stick-l': pinActive }" :style="pinActive ? { left: '0px' } : undefined">
              <input
                type="checkbox"
                class="ib-check"
                :checked="props.checked ? props.checked[i] : undefined"
                @change="emit('checkChange', i, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <!-- 序号列与表头同左缘对齐（规范：表头与内容左对齐），不再居中 -->
            <td :class="{ 'ib-stick-l': pinActive }" :style="pinActive ? { left: `${props.checkWidth}px` } : undefined">{{ i + 1 }}</td>
            <td :class="{ 'ib-stick-l': pinActive }" :style="pinActive ? { left: `${props.checkWidth + props.indexWidth}px` } : undefined">
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
              <td v-if="!isHidden(c.key) && c.key === 'trend'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                <svg class="spark" viewBox="0 0 90 32">
                  <polyline fill="none" stroke="#68a1ff" stroke-width="2" :points="row.spark" />
                </svg>
              </td>
              <td v-else-if="!isHidden(c.key) && c.key === 'status'" :class="stickCls(c.key)" :style="stickStyle(c.key)">
                <template v-if="sgMetaOf(row)">
                  <div class="sg-status">
                    <span class="sg-dot" :style="{ background: sgMetaOf(row)!.dot }" />
                    <span :style="{ color: sgMetaOf(row)!.color }">{{ sgMetaOf(row)!.label }}</span>
                  </div>
                  <div v-if="sgStatusOf(row) === 'auditFail'" class="sg-failtag">
                    审核未通过 <i class="sg-fail-i">i</i>
                  </div>
                  <div v-else-if="sgOffTag(row)" class="sg-offtag" :class="sgOffTag(row)!.fail ? 'fail' : 'normal'">
                    {{ sgOffTag(row)!.text }}
                  </div>
                </template>
                <span v-else class="badge-green">在售</span>
              </td>
              <td v-else-if="!isHidden(c.key)" :class="stickCls(c.key)" :style="stickStyle(c.key)">{{ cellText(row, c.key) }}</td>
            </template>
            <td class="actions-col" :class="{ 'ib-stick-r': pinRActive }" :style="pinRActive ? { right: '0px' } : undefined">
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
                  v-if="!manageDenied?.(row)"
                  href="#"
                  @click.prevent.stop="openAddTip"
                >
                  添加到
                </a>
                <a
                  v-else
                  href="#"
                  class="link-denied"
                  @click.prevent="emit('action', row, '添加到')"
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
