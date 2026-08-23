<script setup lang="ts">
import { ref } from 'vue';
import type { DeptNode } from './data';
import Checkbox from './Checkbox.vue';
import { IconArrow } from './permIcons';

const props = defineProps<{
  node: DeptNode;
  depth: number;
  picked: Map<string, string>;
}>();
const emit = defineEmits<{ (e: 'check', id: string, name: string, checked: boolean): void }>();

const collapsed = ref(false);
const hasChild = props.node.children.length > 0;
const isCompany = props.node.type === 'company';
</script>

<template>
  <div class="tree-node">
    <div class="tree-item" :style="{ paddingLeft: `${8 + depth * 14}px` }">
      <span
        class="arrow"
        :class="hasChild ? (!collapsed ? 'open' : '') : 'leaf'"
        @click="hasChild && (collapsed = !collapsed)"
      >
        <IconArrow />
      </span>
      <Checkbox
        v-if="!isCompany"
        :checked="picked.has(node.id)"
        @change="(c: boolean) => emit('check', node.id, node.name, c)"
      />
      <span class="label dt-label">{{ node.name }}</span>
      <span v-if="node.desc" class="dt-desc">{{ node.desc }}</span>
    </div>
    <div v-if="hasChild && !collapsed" class="tree-children">
      <DeptTransferNode
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :picked="picked"
        @check="(id: string, name: string, checked: boolean) => emit('check', id, name, checked)"
      />
    </div>
  </div>
</template>
