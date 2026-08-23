<script setup lang="ts">
import type { MenuItem } from '../config/navigation';

const props = defineProps<{
  item: MenuItem;
  depth: number;
  activeKey: string;
  expandedKeys: string[];
}>();

const emit = defineEmits<{
  (e: 'toggle', key: string): void;
  (e: 'select', key: string): void;
}>();

const hasChildren = () => Boolean(props.item.children?.length);
const isExpanded = () => props.expandedKeys.includes(props.item.key);
const isActive = () => props.item.key === props.activeKey;

const handleClick = () => {
  if (hasChildren()) emit('toggle', props.item.key);
  else emit('select', props.item.key);
};
</script>

<template>
  <div>
    <button
      type="button"
      class="sidebar-item"
      :class="[{ 'is-active': isActive(), 'is-child': depth > 0 }]"
      @click="handleClick"
    >
      <span class="sidebar-item-label">{{ item.label }}</span>
      <span v-if="hasChildren()" class="sidebar-item-arrow" :class="{ 'is-open': isExpanded() }">
        ▾
      </span>
    </button>
    <div v-if="hasChildren() && isExpanded()" class="sidebar-submenu">
      <SidebarItem
        v-for="child in item.children"
        :key="child.key"
        :item="child"
        :depth="depth + 1"
        :active-key="activeKey"
        :expanded-keys="expandedKeys"
        @toggle="(k: string) => emit('toggle', k)"
        @select="(k: string) => emit('select', k)"
      />
    </div>
  </div>
</template>
