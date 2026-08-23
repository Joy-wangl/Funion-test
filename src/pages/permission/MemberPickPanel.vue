<script setup lang="ts">
import { computed, ref } from 'vue';
import { DEPT_MGMT_TREE, avaColor, membersOfDept } from './data';
import type { DeptNode, Member } from './data';
import Checkbox from './Checkbox.vue';
import { IconDept, IconSearch } from './permIcons';

/* 组织树路径：根 → 目标部门 */
function deptPathOf(id: string): DeptNode[] {
  const walk = (ns: DeptNode[]): DeptNode[] => {
    for (const n of ns) {
      if (n.id === id) return [n];
      const sub = walk(n.children);
      if (sub.length) return [n, ...sub];
    }
    return [];
  };
  return walk(DEPT_MGMT_TREE);
}

/* ---------- 成员选择面板：钻取式组织树（子部门 + 成员混排） ----------
   disabledIds：禁选成员（灰显不可勾）；noDeptPick：仅可选人，组织/全选不可勾 */
const props = defineProps<{
  members: Member[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onBulk: (ids: string[], checked: boolean) => void;
  disabledIds?: Set<string>;
  noDeptPick?: boolean;
}>();

const q = ref('');
const path = ref<DeptNode[]>(deptPathOf('c1'));

const cur = computed(() => path.value[path.value.length - 1]);
const kw = computed(() => q.value.trim().toLowerCase());
const searching = computed(() => kw.value !== '');

const childDepts = computed(() => (searching.value ? [] : cur.value.children));
const directMembers = computed(() => searching.value
  ? props.members.filter((m) => m.name.toLowerCase().includes(kw.value) || m.account.toLowerCase().includes(kw.value))
  : props.members.filter((m) => m.deptId === cur.value.id));
const allUnderIds = computed(() => (searching.value ? [] : membersOfDept(cur.value.id, props.members).map((m) => m.id)));

const selCount = (ids: string[]) => ids.reduce((n, id) => n + (props.selectedIds.has(id) ? 1 : 0), 0);
</script>

<template>
  <div class="member-transfer-left">
    <div class="mtr-head">
      <div class="input-icon">
        <span class="ic"><IconSearch /></span>
        <input v-model="q" class="input" placeholder="搜索成员" />
      </div>
    </div>

    <div v-if="!searching" class="mtr-breadcrumb">
      <span class="seg" @click="path = deptPathOf('c1')">通讯录</span>
      <span v-for="(n, i) in path" :key="n.id">
        <span class="sep">&gt;</span>
        <span
          class="seg"
          :class="i === path.length - 1 ? 'cur' : ''"
          @click="i < path.length - 1 && (path = path.slice(0, i + 1))"
        >{{ n.name }}</span>
      </span>
    </div>

    <div
      v-if="!searching && !noDeptPick && allUnderIds.length > 0"
      class="mtr-selectall"
      @click="onBulk(allUnderIds, selCount(allUnderIds) < allUnderIds.length)"
    >
      <span @click.stop>
        <Checkbox
          :checked="selCount(allUnderIds) === allUnderIds.length"
          :indeterminate="selCount(allUnderIds) > 0 && selCount(allUnderIds) < allUnderIds.length"
          @change="() => onBulk(allUnderIds, selCount(allUnderIds) < allUnderIds.length)"
        />
      </span>
      全选
    </div>

    <div class="mtr-member-list">
      <div v-for="d in childDepts" :key="d.id" class="mtr-row" @click="path = [...path, d]">
        <span v-if="!noDeptPick" @click.stop>
          <Checkbox
            :checked="membersOfDept(d.id, members).length > 0 && selCount(membersOfDept(d.id, members).map((m) => m.id)) === membersOfDept(d.id, members).length"
            :indeterminate="selCount(membersOfDept(d.id, members).map((m) => m.id)) > 0 && selCount(membersOfDept(d.id, members).map((m) => m.id)) < membersOfDept(d.id, members).length"
            @change="(c: boolean) => onBulk(membersOfDept(d.id, members).map((m) => m.id), c)"
          />
        </span>
        <span class="mtr-dept-ic"><IconDept /></span>
        <div class="mtr-m-info">
          <div class="nm">{{ d.name }}</div>
          <div class="dp">{{ membersOfDept(d.id, members).length }}人</div>
        </div>
        <span v-if="d.children.length > 0" class="mtr-drill">下级</span>
      </div>

      <div
        v-for="m in directMembers"
        :key="m.id"
        class="mtr-row"
        :class="(disabledIds?.has(m.id) ?? false) ? 'disabled' : ''"
        @click="!(disabledIds?.has(m.id) ?? false) && onToggle(m.id)"
      >
        <span @click.stop>
          <Checkbox
            :checked="selectedIds.has(m.id)"
            :disabled="disabledIds?.has(m.id) ?? false"
            @change="() => { if (!(disabledIds?.has(m.id) ?? false)) onToggle(m.id); }"
          />
        </span>
        <span class="og-ava" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
        <div class="mtr-m-info">
          <div class="nm">{{ m.name }}</div>
          <div class="dp">{{ m.account }}</div>
        </div>
      </div>

      <div v-if="!childDepts.length && !directMembers.length" class="mtr-empty">
        {{ searching ? '无匹配成员' : '暂无成员' }}
      </div>
    </div>
  </div>
</template>
