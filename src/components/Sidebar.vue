<script setup lang="ts">
import { ref, watch } from 'vue';
import type { MenuItem } from '../config/navigation';
import SidebarItem from './SidebarItem.vue';
import './Sidebar.css';

const props = defineProps<{
  menus: MenuItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  className?: string;
}>();

/** 查找目标菜单项的父级 key（用于自动展开所在分组） */
function findParentKey(menus: MenuItem[], targetKey: string): string | undefined {
  for (const item of menus) {
    if (item.children?.some((child) => child.key === targetKey)) return item.key;
    if (item.children) {
      const found = findParentKey(item.children, targetKey);
      if (found) return found;
    }
  }
  return undefined;
}

const expandedKeys = ref<string[]>([]);

// 选中项变化时（如切换 Tab），自动展开其所在的分组
watch(
  () => [props.menus, props.activeKey] as const,
  ([menus, activeKey]) => {
    const parentKey = findParentKey(menus, activeKey);
    if (parentKey && !expandedKeys.value.includes(parentKey)) {
      expandedKeys.value = [...expandedKeys.value, parentKey];
    }
  },
  { immediate: true },
);

const toggleExpand = (key: string) => {
  expandedKeys.value = expandedKeys.value.includes(key)
    ? expandedKeys.value.filter((k) => k !== key)
    : [...expandedKeys.value, key];
};
</script>

<script lang="ts">
import type { MenuItem as _MenuItem } from '../config/navigation';

/** 深度优先查找第一个叶子菜单项（供外部 import） */
export function findFirstLeaf(menus: _MenuItem[]): _MenuItem | undefined {
  for (const item of menus) {
    if (!item.children?.length) return item;
    const leaf = findFirstLeaf(item.children);
    if (leaf) return leaf;
  }
  return undefined;
}
</script>

<template>
  <aside class="sidebar" :class="className ?? ''">
    <nav class="sidebar-menu">
      <SidebarItem
        v-for="item in menus"
        :key="item.key"
        :item="item"
        :depth="0"
        :active-key="activeKey"
        :expanded-keys="expandedKeys"
        @toggle="toggleExpand"
        @select="onSelect"
      />
    </nav>
  </aside>
</template>
