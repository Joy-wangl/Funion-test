<script setup lang="ts">
/* ---------- 部门管理（品控-线上）：部门清单 + 成员归属 + 分配成员/移除 ---------- */
import { computed, ref } from 'vue';
import { QC_PERM_DEPTS, type QcDeptMember } from './qcOnlineData';
import { INITIAL_MEMBERS } from '../permission/data';
import type { Member } from '../permission/data';
import { IconSearch, IconWarn } from '../permission/permIcons';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import QcAssignModal from './QcAssignModal.vue';

const depts = ref(QC_PERM_DEPTS.map((d) => ({ name: d.name, members: d.members.map((m) => ({ ...m, roles: [...m.roles] })) })));
const cur = ref(depts.value[0]?.name ?? '');
const q = ref('');

const list = computed(() => {
  const kw = q.value.trim();
  return depts.value.filter((d) => !kw || d.name.includes(kw));
});
const curDept = computed(() => depts.value.find((d) => d.name === cur.value) ?? null);

const assignOpen = ref(false);
const removeTarget = ref<QcDeptMember | null>(null);

const nowAt = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const onAssign = (members: Member[]) => {
  if (!curDept.value) return;
  members.forEach((m) => curDept.value!.members.push({ name: m.name, roles: [], adder: '七妮妮', at: nowAt() }));
  pushToast(`已添加 ${members.length} 名成员到「${curDept.value.name}」`);
};

const doRemove = () => {
  const t = removeTarget.value;
  if (!t || !curDept.value) return;
  const i = curDept.value.members.indexOf(t);
  if (i >= 0) curDept.value.members.splice(i, 1);
  removeTarget.value = null;
  pushToast('已移除');
};
</script>

<template>
  <div class="qc-head qc-head-col">
    <div class="qc-title">部门管理</div>
    <div class="qc-pm-sub">部门架构与成员归属</div>
  </div>
  <div class="qc-perm-embed qc-perm-scope">
    <div class="workspace">
      <div class="tree-panel">
        <div class="dept-search">
          <div class="input-icon">
            <span class="ic"><IconSearch /></span>
            <input v-model="q" class="input" placeholder="搜索部门名称">
          </div>
          <button type="button" class="icon-btn" @click="assignOpen = true">+</button>
        </div>
        <div class="tree-body">
          <button
            v-for="d in list"
            :key="d.name"
            type="button"
            class="qc-dept-row"
            :class="{ on: d.name === cur }"
            @click="cur = d.name"
          >{{ d.name }}</button>
          <div v-if="!list.length" class="empty tight">无匹配部门</div>
        </div>
      </div>
      <div class="content-panel">
        <div class="content-head">
          <span class="title">{{ cur }}</span>
          <div class="actions">
            <button type="button" class="btn primary" @click="assignOpen = true">添加成员</button>
          </div>
        </div>
        <div class="content-body">
          <table class="pm-table">
            <thead>
              <tr>
                <th class="th-14">姓名</th>
                <th class="th-24">角色</th>
                <th class="th-14">添加人</th>
                <th class="th-24">添加时间</th>
                <th class="th-14">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in curDept?.members ?? []" :key="`${m.name}-${i}`">
                <td class="c-name">{{ m.name }}</td>
                <td>
                  <div v-if="m.roles.length" class="role-tags">
                    <span v-for="(r, ri) in m.roles.slice(0, 3)" :key="ri" class="tag">{{ r }}</span>
                    <span v-if="m.roles.length > 3" class="more">···</span>
                  </div>
                  <span v-else class="dash">-</span>
                </td>
                <td>{{ m.adder }}</td>
                <td>{{ m.at }}</td>
                <td><a class="qc-perm-rm" @click="removeTarget = m">移除</a></td>
              </tr>
              <tr v-if="!curDept?.members.length">
                <td colspan="5"><div class="empty tight">暂无成员</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <div class="qc-perm-scope">
    <QcAssignModal v-if="assignOpen" :source="INITIAL_MEMBERS" @close="assignOpen = false" @confirm="onAssign" />
    <Modal v-if="removeTarget" title="移除成员" @close="removeTarget = null">
      <div class="modal-warn">
        <span class="modal-warn-ic danger"><IconWarn /></span>
        <div class="modal-warn-txt">将把「<b>{{ removeTarget.name }}</b>」从当前部门移除，成员账号本身不会被删除。确定移除？</div>
      </div>
      <template #foot>
        <button class="btn" @click="removeTarget = null">取消</button>
        <button class="btn danger" @click="doRemove">移除</button>
      </template>
    </Modal>
  </div>
</template>
