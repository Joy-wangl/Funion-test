<script setup lang="ts">
import type { OrgNode } from './data';
import { IconArrow, IconMore } from './permIcons';

defineProps<{
  node: OrgNode;
  depth: number;
  expanded: Set<string>;
  currentOrg: string;
}>();
const emit = defineEmits<{
  (e: 'toggle', id: string): void;
  (e: 'pick', id: string): void;
  (e: 'ctx', ev: MouseEvent, node: OrgNode): void;
}>();
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-item"
      :class="node.id === currentOrg ? 'active' : ''"
      @click="emit('pick', node.id)"
      @contextmenu.prevent.stop="emit('ctx', $event, node)"
    >
      <span
        class="arrow"
        :class="node.children.length > 0 ? (expanded.has(node.id) ? 'open' : '') : 'leaf'"
        @click.stop="node.children.length > 0 && emit('toggle', node.id)"
      >
        <IconArrow />
      </span>
      <span class="label">{{ node.name }}</span>
      <span class="node-more" @click.stop="emit('ctx', $event, node)"><IconMore /></span>
    </div>
    <div v-if="node.children.length > 0" class="tree-children" :class="expanded.has(node.id) ? '' : 'collapsed'">
      <MmOrgNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :expanded="expanded"
        :current-org="currentOrg"
        @toggle="(id: string) => emit('toggle', id)"
        @pick="(id: string) => emit('pick', id)"
        @ctx="(ev: MouseEvent, n: OrgNode) => emit('ctx', ev, n)"
      />
    </div>
  </div>
</template>
