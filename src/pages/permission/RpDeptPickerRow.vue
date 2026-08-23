<script setup lang="ts">
import { computed } from 'vue';
import Checkbox from './Checkbox.vue';
import { IconDept } from './permIcons';
import type { PickerDeptNode } from './data';

const props = defineProps<{
  node: PickerDeptNode;
  depth: number;
  query: string;
  expandedIds: Set<string>;
  sel: Map<string, string>;
}>();
const emit = defineEmits<{
  (e: 'check', id: string, checked: boolean): void;
  (e: 'sub', id: string): void;
}>();

const hasChild = !!(props.node.children && props.node.children.length > 0);
const open = computed(() => (props.query ? true : props.expandedIds.has(props.node.id)));
</script>

<template>
  <div>
    <div class="pk-row" :style="{ paddingLeft: depth * 18 + 'px' }">
      <Checkbox :checked="sel.has(node.id)" @change="(c: boolean) => emit('check', node.id, c)" />
      <span class="d-ic"><IconDept /></span>
      <span class="d-name">{{ node.name }}</span>
      <span v-if="hasChild" class="sub" @click="emit('sub', node.id)">{{ open ? '收起' : '下级' }}</span>
    </div>
    <div v-if="hasChild" class="pk-children" :class="open ? '' : 'collapsed'">
      <RpDeptPickerRow
        v-for="c in node.children"
        :key="c.id"
        :node="c"
        :depth="depth + 1"
        :query="query"
        :expanded-ids="expandedIds"
        :sel="sel"
        @check="(id: string, checked: boolean) => emit('check', id, checked)"
        @sub="(id: string) => emit('sub', id)"
      />
    </div>
  </div>
</template>
