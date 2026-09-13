<script lang="ts">
export interface MoreActionItem {
  label: string;
  /** 危险操作（红色） */
  danger?: boolean;
  onClick: () => void;
}
</script>

<script setup lang="ts">
import { useAnchorPop } from '../hooks/useAnchorPop';
import './MoreActions.css';
withDefaults(defineProps<{ items: MoreActionItem[]; /** 三个点图标触发器（表格操作列收口） */ dot?: boolean; /** 竖排三个点（卡片头收口，配合 dot 使用） */ vertical?: boolean }>(), { dot: false, vertical: false });

/* 气泡锚定触发元素，滚动/resize 时跟随 */
const { pos, open, close } = useAnchorPop();

const openAt = (el: HTMLElement) => open(el);

const pick = (it: MoreActionItem) => {
  close();
  it.onClick();
};
</script>

<template>
  <!-- 操作列全局规范：最多直出两个操作，超出项收进「更多」，点击气泡展开。
       trigger：可选自定义触发器（如「⋯」图标），不传时默认渲染「更多」文字链接。 -->
  <span
    v-if="$slots.trigger"
    style="display: inline-flex; cursor: pointer"
    @click.prevent.stop="openAt(($event.currentTarget as HTMLElement))"
  >
    <slot name="trigger" />
  </span>
  <span
    v-else-if="dot"
    class="more-dot"
    title="更多操作"
    @click.prevent.stop="openAt(($event.currentTarget as HTMLElement))"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <template v-if="vertical">
        <circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" />
      </template>
      <template v-else>
        <circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" />
      </template>
    </svg>
  </span>
  <a v-else href="#" @click.prevent.stop="openAt(($event.currentTarget as HTMLElement))">更多</a>
  <Teleport to="body">
    <div v-if="pos" class="add-pop" :style="{ left: `${pos.x}px`, top: `${pos.y}px` }" @mousedown.stop>
      <div
        v-for="it in items"
        :key="it.label"
        class="add-pop-item"
        :class="{ danger: it.danger }"
        @click="pick(it)"
      >
        {{ it.label }}
      </div>
    </div>
  </Teleport>
</template>
