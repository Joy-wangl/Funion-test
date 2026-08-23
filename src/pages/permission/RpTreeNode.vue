<script setup lang="ts">
import { computed } from 'vue';
import type { RoleGroupNode } from './data';
import { IconMore } from './permIcons';

const props = defineProps<{
  node: RoleGroupNode;
  depth: number;
  collapsed: Set<string>;
  curRoleId: string;
}>();
const emit = defineEmits<{
  (e: 'pick', id: string): void;
  (e: 'toggle', id: string): void;
  (e: 'ctx', ev: MouseEvent, type: 'role' | 'group', id: string, name: string): void;
}>();

const isGroup = Array.isArray(props.node.children);
const hasChild = isGroup && props.node.children!.length > 0;
const open = computed(() => !props.collapsed.has(props.node.id));

const showCtx = (ev: MouseEvent) => emit('ctx', ev, isGroup ? 'group' : 'role', props.node.id, props.node.name);
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-item"
      :class="node.id === curRoleId ? 'active' : ''"
      @click="!isGroup && emit('pick', node.id)"
      @contextmenu.prevent.stop="showCtx"
    >
      <span
        class="arrow"
        :class="hasChild ? (open ? 'open' : '') : 'leaf'"
        @click.stop="hasChild && emit('toggle', node.id)"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" /></svg>
      </span>
      <span class="label">{{ node.name }}</span>
      <span class="node-more" @click="showCtx"><IconMore /></span>
    </div>
    <div v-if="hasChild" class="tree-children" :class="open ? '' : 'collapsed'">
      <RpTreeNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :collapsed="collapsed"
        :cur-role-id="curRoleId"
        @pick="(id: string) => emit('pick', id)"
        @toggle="(id: string) => emit('toggle', id)"
        @ctx="(ev: MouseEvent, t: 'role' | 'group', id: string, name: string) => emit('ctx', ev, t, id, name)"
      />
    </div>
  </div>
</template>
