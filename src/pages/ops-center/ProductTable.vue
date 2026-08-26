<script setup lang="ts">
import type { ProductRow } from './data';
import { PLATFORM_LOGO, platformOfStore } from './data';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
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
}>();
const emit = defineEmits<{ (e: 'checkChange', index: number, checked: boolean): void }>();

const isHidden = (k: string) => (props.hidden ?? []).includes(k);

/* 添加到：点击后气泡展示平台选项（滚动时跟随触发链接） */
const { pos: addTip, open, close: closeAddTip } = useAnchorPop();
const openAddTip = (e: MouseEvent) => open(e.currentTarget as HTMLElement);
</script>

<template>
  <!-- 内部商机 / 运营管理共用的 13 列商品表格 + 分页（与 preview.html 一致） -->
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
            <th v-if="!isHidden('category')">商品类目</th>
            <th v-if="!isHidden('trend')">近30天销量趋势</th>
            <th v-if="!isHidden('cloud')">云仓占比</th>
            <th v-if="!isHidden('yesterday')">昨日销量</th>
            <th v-if="!isHidden('week7')">近7日销量</th>
            <th v-if="!isHidden('refund')">退款率</th>
            <th v-if="!isHidden('refundAfter')">发货后退款率</th>
            <th v-if="!isHidden('created')">创建时间</th>
            <th v-if="!isHidden('status')">状态</th>
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
            <td v-if="!isHidden('category')">{{ row.category }}</td>
            <td v-if="!isHidden('trend')">
              <svg class="spark" viewBox="0 0 90 32">
                <polyline fill="none" stroke="#68a1ff" stroke-width="2" :points="row.spark" />
              </svg>
            </td>
            <td v-if="!isHidden('cloud')">{{ row.cloudRatio }}</td>
            <td v-if="!isHidden('yesterday')">{{ row.yesterday }}</td>
            <td v-if="!isHidden('week7')">{{ row.week7 }}</td>
            <td v-if="!isHidden('refund')">{{ row.refundRate }}</td>
            <td v-if="!isHidden('refundAfter')">{{ row.refundAfter }}</td>
            <td v-if="!isHidden('created')">{{ row.created }}</td>
            <td v-if="!isHidden('status')">
              <span class="badge-green">在售</span>
            </td>
            <td class="actions-col">
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
