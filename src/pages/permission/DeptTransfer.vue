<script setup lang="ts">
import { DEPT_TREE } from './data';
import { IconSearch, IconXsm } from './permIcons';
import DeptTransferNode from './DeptTransferNode.vue';

const props = defineProps<{ picked: Map<string, string> }>();
const emit = defineEmits<{ (e: 'pickedChange', next: Map<string, string>): void }>();

const setChecked = (id: string, name: string, checked: boolean) => {
  const next = new Map(props.picked);
  if (checked) next.set(id, name);
  else next.delete(id);
  emit('pickedChange', next);
};
</script>

<template>
  <div class="transfer">
    <div class="side">
      <div class="s-head">
        <div class="input-icon grow">
          <span class="ic"><IconSearch /></span>
          <input class="input" placeholder="搜索部门" />
        </div>
      </div>
      <div class="s-body">
        <DeptTransferNode
          v-for="n in DEPT_TREE"
          :key="n.id"
          :node="n"
          :depth="0"
          :picked="picked"
          @check="setChecked"
        />
      </div>
    </div>
    <div class="side">
      <div class="s-head">
        已选择 <b class="dt-count">{{ picked.size }}</b>/10000
        <span class="clear" @click="emit('pickedChange', new Map())">清空</span>
      </div>
      <div class="s-body">
        <template v-if="picked.size === 0">
          <div class="dt-empty">暂未选择</div>
        </template>
        <template v-else>
          <div v-for="[id, name] in picked.entries()" :key="id" class="selected-item">
            <span class="av">{{ name.slice(0, 1) }}</span>
            <span>{{ name }}</span>
            <span class="rm" @click="setChecked(id, name, false)"><IconXsm /></span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
