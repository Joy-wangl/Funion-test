<script setup lang="ts">
import type { DpTreeNode } from './data';
import { IconArrow, IconMore } from './permIcons';

const props = defineProps<{
  node: DpTreeNode;
  depth: number;
  dq: string;
  expanded: Set<string>;
  curDeptId: string;
}>();
const emit = defineEmits<{
  (e: 'pick', id: string): void;
  (e: 'toggle', id: string): void;
  (e: 'ctx', ev: MouseEvent, node: DpTreeNode): void;
}>();

const hasChild = props.node.children.length > 0;
</script>

<template>
  <div class="tree-node">
    <div
      class="tree-item dept-item"
      :class="node.id === curDeptId ? 'active' : ''"
      @click="emit('pick', node.id)"
      @contextmenu.prevent.stop="emit('ctx', $event, node)"
    >
      <span
        class="arrow"
        :class="hasChild ? ((dq ? true : expanded.has(node.id)) ? 'open' : '') : 'leaf'"
        @click.stop="hasChild && emit('toggle', node.id)"
      >
        <IconArrow />
      </span>
      <span class="label">{{ node.name }}</span>
      <span class="node-more" @click.stop="emit('ctx', $event, node)"><IconMore /></span>
    </div>
    <div v-if="hasChild" class="tree-children" :class="(dq ? true : expanded.has(node.id)) ? '' : 'collapsed'">
      <DmTreeNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :dq="dq"
        :expanded="expanded"
        :cur-dept-id="curDeptId"
        @pick="(id: string) => emit('pick', id)"
        @toggle="(id: string) => emit('toggle', id)"
        @ctx="(ev: MouseEvent, n: DpTreeNode) => emit('ctx', ev, n)"
      />
    </div>
  </div>
</template>
