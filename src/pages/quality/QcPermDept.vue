<script setup lang="ts">
/* ---------- 部门管理（品控-线上）：部门清单 + 成员归属 + 分配成员/移除 ---------- */
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
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

/* 分页：项目统一 ib-pagination 模式，默认 20 条/页（行源＝当前部门成员表） */
const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
const deptMembers = computed(() => curDept.value?.members ?? []);
const pageCount = computed(() => Math.max(1, Math.ceil(deptMembers.value.length / pageSize.value)));
const pageMembers = computed(() => deptMembers.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageList = computed((): (number | 'gap')[] => {
  const total = pageCount.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cur = page.value;
  if (cur <= 6) return [1, 2, 3, 4, 5, 6, 'gap', total];
  if (cur >= total - 5) return [1, 'gap', total - 5, total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap', cur - 1, cur, cur + 1, 'gap', total];
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 20; page.value = 1; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};
watch(cur, () => { page.value = 1; jumpVal.value = '1'; });
/* 成员移除后若当前页超界则回退到末页 */
watch(pageCount, () => { if (page.value > pageCount.value) page.value = pageCount.value; });
watch(page, (v) => { jumpVal.value = String(v); });

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
              <tr v-for="(m, i) in pageMembers" :key="`${m.name}-${i}`">
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
              <tr v-if="!deptMembers.length">
                <td colspan="5"><div class="empty tight">暂无成员</div></td>
              </tr>
            </tbody>
          </table>
          <div v-if="pageCount > 1" class="ib-pagination">
            <div class="ib-pageinfo">共 {{ deptMembers.length }} 条</div>
            <BubbleSelect class-name="ib-page-size" :value="`${pageSize}条/页`" :options="['20条/页', '50条/页', '100条/页']" @change="onPageSize" />
            <div class="ib-pages">
              <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
              <template v-for="(p, i) in pageList" :key="i">
                <span v-if="p === 'gap'" class="ib-pagedots">…</span>
                <button v-else class="ib-pagebtn" :class="p === page ? 'active' : ''" @click="page = p">{{ p }}</button>
              </template>
              <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
            </div>
            <div class="ib-jump">
              <span>前往</span>
              <input v-model="jumpVal" class="ib-jump-input" @keyup.enter="onJump">
              <span>页</span>
            </div>
          </div>
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
