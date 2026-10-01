<script setup lang="ts">
/** 全局列表排序表头：点击切换升/降序，激活方向三角高亮（所有列表排序统一使用） */
withDefaults(
  defineProps<{
    label?: string;
    state?: 'none' | 'asc' | 'desc';
    align?: 'left' | 'right' | 'center';
    width?: string;
    tip?: string;
    /** 渲染标签：默认 th 独立成列；span 用于合并列内嵌排序头 */
    as?: 'th' | 'span';
  }>(),
  { label: '', state: 'none', align: 'left', tip: '点击排序', as: 'th' },
);
defineEmits<{ (e: 'sort'): void }>();
</script>

<template>
  <component :is="as" class="sort-th" :style="{ textAlign: align, width }" :title="tip" @click="$emit('sort')">
    <span class="sort-th-in">
      {{ label }}
      <!-- 未排序灰双箭；已排序仅渲染当前方向单箭并垂直居中，避免双箭只亮一半造成图标视觉偏移 -->
      <svg class="sort-th-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
        <template v-if="state === 'none'">
          <path d="M6 1.2l3.4 4H2.6l3.4-4z" fill="#c3c9d4" />
          <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" fill="#c3c9d4" />
        </template>
        <path v-else-if="state === 'asc'" d="M6 4.2l4.2 5.2H1.8L6 4.2z" fill="var(--color-primary)" />
        <path v-else d="M6 9.8L1.8 4.6h8.4L6 9.8z" fill="var(--color-primary)" />
      </svg>
      <!-- 列头附加内容（如筛选漏斗）；插槽内自行 @click.stop 防触发排序 -->
      <slot />
    </span>
  </component>
</template>

<style>
.sort-th { cursor: pointer; user-select: none; white-space: nowrap; }
.sort-th:hover { color: var(--color-primary); }
.sort-th-in { display: inline-flex; align-items: center; gap: 4px; }
.sort-th-ico { flex: none; display: block; }
</style>
