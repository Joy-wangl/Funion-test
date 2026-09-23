<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { TabConfig } from '../config/navigation';
import '../components/TopTabs.css';

const props = defineProps<{
  tabs: TabConfig[];
  activeKey: string;
  onChange: (key: string) => void;
}>();

/* 拖拽排序＋超量收「更多」：顶栏最多展示 VISIBLE_MAX 个，其余收入气泡；气泡内展示全部 tab 支持拖拽重排 */
const VISIBLE_MAX = 5;
const ORDER_KEY = 'funion:topTabsOrder';
const readOrder = (): string[] => {
  const keys = props.tabs.map((t) => t.key);
  try {
    const saved = JSON.parse(localStorage.getItem(ORDER_KEY) ?? '[]') as string[];
    const order = saved.filter((k) => keys.includes(k));
    keys.forEach((k) => { if (!order.includes(k)) order.push(k); });
    return order;
  } catch { return keys; }
};
const order = ref<string[]>(readOrder());
const saveOrder = () => {
  try { localStorage.setItem(ORDER_KEY, JSON.stringify(order.value)); } catch { /* 忽略隐私模式异常 */ }
};
const orderedTabs = computed(() => order.value
  .map((k) => props.tabs.find((t) => t.key === k))
  .filter((t): t is TabConfig => !!t));
const visibleTabs = computed(() => orderedTabs.value.slice(0, VISIBLE_MAX));
const overflowTabs = computed(() => orderedTabs.value.slice(VISIBLE_MAX));
/* 选中 tab 落在收口区时「更多」入口着选中色 */
const moreActive = computed(() => overflowTabs.value.some((t) => t.key === props.activeKey));

/* 气泡内拖拽重排：任意位置拖到任意位置 */
const dragKey = ref<string | null>(null);
const popMoveTo = (target: string) => {
  const from = dragKey.value;
  if (!from || from === target) return;
  const list = order.value;
  const fi = list.indexOf(from);
  const ti = list.indexOf(target);
  if (fi < 0 || ti < 0) return;
  const [m] = list.splice(fi, 1);
  list.splice(ti, 0, m);
  saveOrder();
};

/* 更多气泡：Teleport 到 body，避免被父级堆叠上下文裁剪；点击外部关闭 */
const moreOpen = ref(false);
const moreBtn = ref<HTMLButtonElement | null>(null);
const popStyle = ref<Record<string, string>>({});
const updatePopPosition = () => {
  if (!moreBtn.value) return;
  const rect = moreBtn.value.getBoundingClientRect();
  popStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    right: `${window.innerWidth - rect.right}px`,
  };
};
const toggleMore = () => {
  moreOpen.value = !moreOpen.value;
  if (moreOpen.value) nextTick(() => updatePopPosition());
};
const moreWrap = ref<HTMLElement | null>(null);
const onDocClick = (e: MouseEvent) => {
  if (moreOpen.value && !moreWrap.value?.contains(e.target as Node)) moreOpen.value = false;
};
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));

/* 图标字标：取 label 首字符 */
const badgeChar = (label: string) => label.charAt(0);
/* 图标配色：按配置序稳定取色（不随拖拽重排变色） */
const BADGE_PALETTE = ['#6b5bff', '#3d7cff', '#00a870', '#f7861a', '#12b8c8', '#e0489a', '#8a4dff', '#2f6bff', '#f4581c', '#3fbf3f'];
const badgeColor = (tab: TabConfig) => {
  const i = props.tabs.findIndex((t) => t.key === tab.key);
  return BADGE_PALETTE[(i < 0 ? 0 : i) % BADGE_PALETTE.length];
};
</script>

<template>
  <div class="top-tabs">
    <button
      v-for="tab in visibleTabs"
      :key="tab.key"
      type="button"
      class="top-tabs-item"
      :class="{ 'is-active': tab.key === activeKey }"
      @click="onChange(tab.key)"
    >
      <span class="top-tabs-chip-icon" :style="{ background: badgeColor(tab) }">{{ badgeChar(tab.label) }}</span>
      <span class="top-tabs-chip-label">{{ tab.label }}</span>
    </button>
    <!-- 展开/收纳入口：置最后 -->
    <div v-if="overflowTabs.length" ref="moreWrap" class="top-tabs-more-wrap">
      <button
        ref="moreBtn"
        type="button"
        class="top-tabs-more"
        :class="{ 'is-active': moreActive }"
        @click.stop="toggleMore"
      >
        <svg class="top-tabs-more-icon" :class="{ open: moreOpen }" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
    </div>
    <!-- 气泡：Teleport 到 body，展示全部 tab + 拖拽重排 -->
    <Teleport to="body">
      <div
        v-if="moreOpen"
        class="top-tabs-more-pop"
        :style="popStyle"
        @click.stop
      >
        <div class="top-tabs-pop-header">
          顶部应用（{{ orderedTabs.length }}）· 拖拽行调整顺序 · 顶栏最多展示 10 个，超出收纳于此
        </div>
        <button
          v-for="tab in orderedTabs"
          :key="tab.key"
          type="button"
          class="top-tabs-pop-row"
          :class="{ 'is-active': tab.key === activeKey, dragging: dragKey === tab.key }"
          draggable="true"
          @dragstart="dragKey = tab.key"
          @dragover.prevent="popMoveTo(tab.key)"
          @dragend="dragKey = null"
          @click="moreOpen = false; onChange(tab.key)"
        >
          <span class="top-tabs-pop-badge" :style="{ background: badgeColor(tab) }">{{ badgeChar(tab.label) }}</span>
          <span class="top-tabs-pop-label">{{ tab.label }}</span>
          <span class="top-tabs-pop-grip" title="拖拽调整顺序">⋮⋮</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>
