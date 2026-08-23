<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';
import Checkbox from './Checkbox.vue';
import { IconCheck, IconDept, IconSearch, IconXsm } from './permIcons';
import { DEPT_MGMT_TREE, INITIAL_MEMBERS, avaColor, findDeptNode, membersOfDept } from './data';
import type { DeptNode, Member } from './data';

/* ---------- 选择成员弹窗（成员+部门混合，右侧已选标签） ---------- */
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', added: Member[]): void;
}>();

const cur = ref('c1');
const mq = ref('');
const selM = ref<Map<string, Member>>(new Map());
const selD = ref<Map<string, string>>(new Map());

const hit = (s: string) => s.toLowerCase().includes(mq.value.toLowerCase());

const pathTo = (id: string): DeptNode[] => {
  let path: DeptNode[] = [];
  const dfs = (ns: DeptNode[], trail: DeptNode[]): boolean => {
    for (const n of ns) {
      const t = [...trail, n];
      if (n.id === id) { path = t; return true; }
      if (n.children && dfs(n.children, t)) return true;
    }
    return false;
  };
  dfs(DEPT_MGMT_TREE, []);
  return path;
};

const directMembers = (id: string) => INITIAL_MEMBERS.filter((x) => (x.deptId || 'c1') === id);

const node = computed(() => findDeptNode(cur.value));
const mems = computed(() => directMembers(cur.value).filter((x) => hit(x.name) || hit(x.account)));
const kids = computed(() => (node.value?.children || []).filter((d) => hit(d.name)));
const total = computed(() => mems.value.length + kids.value.length);
const allChecked = computed(() => total.value > 0
  && mems.value.every((x) => selM.value.has(x.id))
  && kids.value.every((d) => selD.value.has(d.id)));

const toggleMember = (m: Member, checked: boolean) => {
  const next = new Map(selM.value);
  if (checked) next.set(m.id, m);
  else next.delete(m.id);
  selM.value = next;
};
const toggleDept = (d: DeptNode, checked: boolean) => {
  const nextMap = new Map(selD.value);
  if (checked) nextMap.set(d.id, d.name);
  else nextMap.delete(d.id);
  selD.value = nextMap;
};
const toggleAll = (checked: boolean) => {
  mems.value.forEach((x) => toggleMember(x, checked));
  kids.value.forEach((d) => toggleDept(d, checked));
};

const confirm = () => {
  const ids = new Set<string>();
  const added: Member[] = [];
  [...selM.value.values()].forEach((x) => { if (!ids.has(x.id)) { ids.add(x.id); added.push(x); } });
  [...selD.value.keys()].forEach((did) => membersOfDept(did, INITIAL_MEMBERS).forEach((x) => {
    if (!ids.has(x.id)) { ids.add(x.id); added.push(x); }
  }));
  emit('confirm', added);
  emit('close');
};

const removeDeptTag = (id: string) => {
  const d = findDeptNode(id);
  if (d) toggleDept(d, false);
};

const crumbPath = computed(() => pathTo(cur.value));
const selMList = computed(() => [...selM.value.values()]);
const selDEntries = computed(() => [...selD.value.entries()]);
</script>

<template>
  <Modal title="选择成员" sub="从部门成员中选择" size="lg" @close="emit('close')">
    <div class="picker">
      <div class="picker-left">
        <div class="input-icon rt">
          <span class="ic"><IconSearch /></span>
          <input v-model="mq" class="input" placeholder="搜索" />
        </div>
        <div class="mp-crumb">
          <span v-for="(n, i) in crumbPath" :key="n.id">
            <span class="seg" :class="i === crumbPath.length - 1 ? 'cur' : ''" @click="cur = n.id">{{ n.name }}</span>
            <span v-if="i < crumbPath.length - 1" class="sep">&gt;</span>
          </span>
        </div>
        <label class="checkbox mp-all">
          <input type="checkbox" :checked="allChecked" @change="toggleAll(($event.target as HTMLInputElement).checked)" />
          <span class="box"><IconCheck /></span>全选
        </label>
        <div class="pk-list">
          <div v-if="total === 0" class="empty tight">无匹配结果</div>
          <div v-for="m in mems" :key="m.id" class="pk-row mp-member">
            <Checkbox :checked="selM.has(m.id)" @change="(c: boolean) => toggleMember(m, c)" />
            <span class="ava-sm" :style="{ background: avaColor(m.name) }">{{ m.name.slice(0, 1) }}</span>
            <span class="d-name">{{ m.name }}</span>
          </div>
          <div v-for="d in kids" :key="d.id" class="pk-row mp-dept">
            <Checkbox :checked="selD.has(d.id)" @change="(c: boolean) => toggleDept(d, c)" />
            <span class="d-ic"><IconDept /></span>
            <span class="d-col">
              <span class="d-name">{{ d.name }}</span>
              <span class="d-cnt">{{ d.desc || '' }}</span>
            </span>
            <span class="sub" @click="cur = d.id">下级</span>
          </div>
        </div>
      </div>
      <div class="picker-right">
        <div class="pk-selhead">已选择(<b>{{ selM.size + selD.size }}</b>/10000)</div>
        <div class="pk-tags">
          <span v-if="selM.size + selD.size === 0" class="dash">暂未选择</span>
          <span v-for="x in selMList" :key="x.id" class="pk-tag">
            <span class="ava-sm" :style="{ background: avaColor(x.name) }">{{ x.name.slice(0, 1) }}</span>
            {{ x.name }}
            <span class="rm" @click="toggleMember(x, false)"><IconXsm /></span>
          </span>
          <span v-for="[id, name] in selDEntries" :key="id" class="pk-tag">
            <span class="d-ic"><IconDept /></span>
            {{ name }}
            <span class="rm" @click="removeDeptTag(id)"><IconXsm /></span>
          </span>
        </div>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">确定</button>
    </template>
  </Modal>
</template>
