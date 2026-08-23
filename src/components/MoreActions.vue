<script lang="ts">
export interface MoreActionItem {
  label: string;
  /** 危险操作（红色） */
  danger?: boolean;
  onClick: () => void;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';

defineProps<{ items: MoreActionItem[] }>();

const pos = ref<{ x: number; y: number } | null>(null);

const close = () => { pos.value = null; };
const onDocDown = () => close();

const openAt = (el: HTMLElement) => {
  const r = el.getBoundingClientRect();
  pos.value = { x: Math.max(8, Math.min(r.left, window.innerWidth - 130)), y: r.bottom + 6 };
  document.addEventListener('mousedown', onDocDown);
};

const pick = (it: MoreActionItem) => {
  close();
  document.removeEventListener('mousedown', onDocDown);
  it.onClick();
};

onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown));
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
