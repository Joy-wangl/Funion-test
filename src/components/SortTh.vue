<script setup lang="ts">
/** 全局列表排序表头：点击切换升/降序，激活方向三角高亮（所有列表排序统一使用） */
withDefaults(
  defineProps<{
    label: string;
    state?: 'none' | 'asc' | 'desc';
    align?: 'left' | 'right' | 'center';
    width?: string;
    tip?: string;
    /** 渲染标签：默认 th 独立成列；span 用于合并列内嵌排序头 */
    as?: 'th' | 'span';
  }>(),
  { state: 'none', align: 'left', tip: '点击排序', as: 'th' },
);
defineEmits<{ (e: 'sort'): void }>();
</script>

<template>
  <component :is="as" class="sort-th" :style="{ textAlign: align, width }" :title="tip" @click="$emit('sort')">
    <span class="sort-th-in">
      {{ label }}
      <svg class="sort-th-ico" width="12" height="14" viewBox="0 0 12 14" aria-hidden="true">
        <path d="M6 1.2l3.4 4H2.6l3.4-4z" :fill="state === 'asc' ? 'var(--color-primary)' : '#c3c9d4'" />
        <path d="M6 12.8l-3.4-4h6.8l-3.4 4z" :fill="state === 'desc' ? 'var(--color-primary)' : '#c3c9d4'" />
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
