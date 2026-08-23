<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { IconCheck, IconDept, IconSearch, IconXsm } from './permIcons';
import RpDeptPickerRow from './RpDeptPickerRow.vue';
import { DEPT_PICKER } from './data';
import type { PickerDeptNode } from './data';

/* ---------- 指定部门选择弹窗 ---------- */
const emit = defineEmits<{ (e: 'close'): void }>();

const findName = (id: string, nodes: PickerDeptNode[]): string | null => {
  for (const n of nodes) {
    if (n.id === id) return n.name;
    if (n.children) {
      const f = findName(id, n.children);
      if (f) return f;
    }
  }
  return null;
};

const sel = ref<Map<string, string>>((() => {
  const m = new Map<string, string>();
  ['d1', 'd3'].forEach((id) => {
    const name = findName(id, DEPT_PICKER.depts);
    if (name) m.set(id, name);
  });
  return m;
})());
const expandedIds = ref<Set<string>>(new Set());
const query = ref('');

const hit = (name: string) => name.toLowerCase().includes(query.value.toLowerCase());

const filterTree = (nodes: PickerDeptNode[]): PickerDeptNode[] => {
  if (!query.value) return nodes;
  const res: PickerDeptNode[] = [];
  nodes.forEach((n) => {
    const kids = n.children ? filterTree(n.children) : [];
    if (hit(n.name) || kids.length) {
      res.push({ ...n, children: kids.length ? kids : (hit(n.name) ? (n.children || []) : []) });
    }
  });
  return res;
};

const tree = computed(() => filterTree(DEPT_PICKER.depts));

const toggleCheck = (id: string, checked: boolean) => {
  const next = new Map(sel.value);
  if (checked) {
    const name = findName(id, DEPT_PICKER.depts);
    if (name) next.set(id, name);
  } else next.delete(id);
  sel.value = next;
};

const toggleSub = (id: string) => {
  const next = new Set(expandedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedIds.value = next;
};

/* 全选：作用于当前可见节点 */
const visibleIds = computed(() => {
  const ids: string[] = [];
  const collect = (nodes: PickerDeptNode[]) => {
    nodes.forEach((n) => {
      ids.push(n.id);
      const open = query.value ? true : expandedIds.value.has(n.id);
      if (n.children?.length && open) collect(n.children);
    });
  };
  collect(tree.value);
  return ids;
});
const allChecked = computed(() => visibleIds.value.length > 0 && visibleIds.value.every((id) => sel.value.has(id)));

const toggleAllVisible = (checked: boolean) => visibleIds.value.forEach((id) => toggleCheck(id, checked));

const ok = () => { pushToast(`已选择 ${sel.value.size} 个部门`); emit('close'); };

const selEntries = computed(() => [...sel.value.entries()]);
</script>

<template>
  <Modal title="指定部门" sub="选择指定的部门" size="lg" @close="emit('close')">
    <div class="picker">
      <div class="picker-left">
        <div class="input-icon">
          <span class="ic"><IconSearch /></span>
          <input v-model="query" class="input" placeholder="搜索" />
        </div>
        <div class="pk-company">{{ DEPT_PICKER.company }}</div>
        <label class="checkbox pk-all">
          <input type="checkbox" :checked="allChecked" @change="toggleAllVisible(($event.target as HTMLInputElement).checked)" />
          <span class="box"><IconCheck /></span>全选
        </label>
        <div class="pk-list">
          <template v-if="tree.length">
            <RpDeptPickerRow
              v-for="d in tree"
              :key="d.id"
              :node="d"
              :depth="0"
              :query="query"
              :expanded-ids="expandedIds"
              :sel="sel"
              @check="toggleCheck"
              @sub="toggleSub"
            />
          </template>
          <div v-else class="empty md">无匹配部门</div>
        </div>
      </div>
      <div class="picker-right">
        <div class="pk-selhead">已选择(<b>{{ sel.size }}</b>/10000)</div>
        <div class="pk-tags">
          <span v-if="sel.size === 0" class="dash">暂未选择</span>
          <span v-for="[id, name] in selEntries" :key="id" class="pk-tag">
            <span class="d-ic"><IconDept /></span>
            {{ name }}
            <span class="rm" @click="toggleCheck(id, false)"><IconXsm /></span>
          </span>
        </div>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="ok">确定</button>
    </template>
  </Modal>
</template>
