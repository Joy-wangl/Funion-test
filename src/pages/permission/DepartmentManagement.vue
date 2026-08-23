<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { DP_TREE, DP_MEMBERS, INITIAL_MEMBERS, findDpNode, renameDpNode, roleById } from './data';
import type { DpTreeNode, Member } from './data';
import ToastWrap from '../../components/ToastWrap.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import './style.css';
import { IconSearch, IconWarn } from './permIcons';
import DmTreeNode from './DmTreeNode.vue';
import DmDeptFormModal from './DmDeptFormModal.vue';
import AddMemberModal from './AddMemberModal.vue';
import {
  INITIAL_OPS_GROUPS,
  INITIAL_OPS_MEMBERS,
  OPS_ROLE_LABEL,
  getMemberAllAssignments,
  nowStamp,
  type OpsChannelGroups,
  type OpsChannelMembers,
} from './opsGroupData';

/* ---------- 弹窗状态（msg 为结构化富文本：pre + <b>bold</b> + post） ---------- */
type ConfirmMsg = { pre: string; bold?: string; post: string };
type ModalState =
  | { kind: 'deptForm'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'confirm'; title: string; msg: ConfirmMsg; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'addMember' };

interface DeptMember {
  id: string;
  name: string;
  roles: string[];
  adder: string;
  at: string;
}

/** 部门成员池：同步自成员管理，添加时从该池选择 */
const SOURCE_MEMBERS: Member[] = INITIAL_MEMBERS;

/** 搜索过滤（保留命中节点及其祖先，命中节点保留原 children） */
function filterTree(nodes: DpTreeNode[], dq: string): DpTreeNode[] {
  if (!dq) return nodes;
  const hit = (s: string) => s.toLowerCase().includes(dq.toLowerCase());
  const res: DpTreeNode[] = [];
  nodes.forEach((n) => {
    const kids = n.children ? filterTree(n.children, dq) : [];
    if (hit(n.name) || kids.length) {
      res.push({ ...n, children: kids.length ? kids : (hit(n.name) ? (n.children || []) : []) });
    }
  });
  return res;
}

const tree = ref<DpTreeNode[]>(DP_TREE);
const curDeptId = ref('t1-1-1');
const expanded = ref<Set<string>>(new Set(['t1', 't1-1', 't1-1-1', 't1-1-1-1']));
const dq = ref('');
const ctx = ref<{ x: number; y: number; id: string; name: string } | null>(null);
const addCtx = ref<{ x: number; y: number } | null>(null);
const modal = ref<ModalState | null>(null);
/* 部门成员列表（本地维护，添加成员时从 SOURCE_MEMBERS 选择）
   注：本地行 id 用 dm* 命名空间，避免与全局成员 id（m*）冲撞导致归属串改 */
const deptMembers = ref<DeptMember[]>(DP_MEMBERS.map((m, i) => ({ ...m, id: `dm${i + 1}` })));

/* 运营组数据（作为全局状态提升，后续可抽离到上层 context） */
const opsGroups = ref<OpsChannelGroups>(INITIAL_OPS_GROUPS);
const opsMembers = ref<OpsChannelMembers>(INITIAL_OPS_MEMBERS);

const curDept = computed(() => findDpNode(curDeptId.value, tree.value));

/* 菜单外点击关闭 */
const closeMenus = () => { ctx.value = null; addCtx.value = null; };
watch([ctx, addCtx], ([c, a]) => {
  if (!c && !a) document.removeEventListener('click', closeMenus);
  else document.addEventListener('click', closeMenus);
});
onBeforeUnmount(() => document.removeEventListener('click', closeMenus));

const toggleExpand = (id: string) => {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
};

const showDeptCtx = (e: MouseEvent, node: DpTreeNode) => {
  e.stopPropagation();
  e.preventDefault();
  addCtx.value = null;
  ctx.value = { x: e.clientX, y: e.clientY, id: node.id, name: node.name };
};

const handleCtxAct = (act: string) => {
  if (!ctx.value) return;
  const { id, name } = ctx.value;
  ctx.value = null;
  if (act === 'edit') {
    modal.value = {
      kind: 'deptForm', title: '编辑部门', value: name,
      onOk: (v) => { tree.value = renameDpNode(tree.value, id, v); pushToast('已保存'); },
    };
  }
  if (act === 'addSub') {
    modal.value = {
      kind: 'deptForm', title: '添加部门', value: '',
      onOk: (v) => pushToast(`已在「${name}」下添加「${v}」`),
    };
  }
  if (act === 'del') {
    modal.value = {
      kind: 'confirm', title: '删除部门', danger: true, okText: '删除',
      msg: { pre: '确定删除部门「', bold: name, post: '」？成员将移至上级部门。' },
      onOk: () => pushToast('已删除'),
    };
  }
};

const openAddCtx = (e: MouseEvent) => {
  e.stopPropagation();
  ctx.value = null;
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  addCtx.value = { x: r.left, y: r.bottom + 6 };
};

const addCtxAct = () => {
  addCtx.value = null;
  modal.value = {
    kind: 'deptForm', title: '添加部门', value: '',
    onOk: (v) => pushToast(`已添加部门「${v}」`),
  };
};

const filtered = computed(() => filterTree(tree.value, dq.value.trim()));
const closeModal = () => { modal.value = null; };

/* 确认弹窗确定 */
const okConfirm = (m: Extract<ModalState, { kind: 'confirm' }>) => { m.onOk(); closeModal(); };
/* 弹窗确定入口（模板内联合类型无法收窄，统一在此守卫） */
const onDeptFormOk = (v: string) => {
  if (modal.value?.kind === 'deptForm') modal.value.onOk(v);
};
/* 添加成员确定（归属在添加时前置分配，列表必有归属） */
const onAddMemberConfirm = (members: Member[], roles: string[], opsPatch?: { groups: OpsChannelGroups; members: OpsChannelMembers }) => {
    if (opsPatch) {
      opsGroups.value = opsPatch.groups;
      opsMembers.value = opsPatch.members;
    }
    deptMembers.value = [
      ...deptMembers.value,
      ...members.map((member) => ({
        id: member.id,
        name: member.name,
        roles: roles.map((rid) => roleById(rid)?.name ?? rid),
        adder: '管理员',
        at: nowStamp(),
      })),
    ];
    pushToast(`已添加 ${members.length} 名成员到当前部门`);
  };

const assignmentsOf = (memberId: string) => getMemberAllAssignments(memberId, opsGroups.value, opsMembers.value);

const pickNode = (id: string) => { curDeptId.value = id; };
</script>

<template>
  <div class="workspace">
    <!-- 左：部门树 -->
    <div class="tree-panel">
      <div class="dept-search">
        <div class="input-icon">
          <span class="ic"><IconSearch /></span>
          <input v-model="dq" class="input" placeholder="搜索部门名称" />
        </div>
        <button class="icon-btn" title="添加部门" @click="openAddCtx">+</button>
      </div>
      <div class="tree-body">
        <template v-if="filtered.length">
          <DmTreeNode
            v-for="n in filtered"
            :key="n.id"
            :node="n"
            :depth="0"
            :dq="dq.trim()"
            :expanded="expanded"
            :cur-dept-id="curDeptId"
            @pick="pickNode"
            @toggle="toggleExpand"
            @ctx="showDeptCtx"
          />
        </template>
        <div v-else class="empty tight">无匹配部门</div>
      </div>
    </div>

    <!-- 右：部门成员 -->
    <div class="content-panel">
      <div class="content-head">
        <span class="title">{{ curDept?.name || '' }}</span>
        <div class="actions">
          <button class="btn primary" @click="modal = { kind: 'addMember' }">添加成员</button>
        </div>
      </div>
      <div class="content-body">
        <table class="table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>角色</th>
              <th>运营归属</th>
              <th>添加人</th>
              <th>添加时间</th>
              <th class="th-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in deptMembers" :key="m.id">
              <td class="col-name">{{ m.name }}</td>
              <td>
                <div v-if="m.roles.length" class="role-tags">
                  <span v-for="(r, ri) in m.roles.slice(0, 3)" :key="ri" class="tag">{{ r }}</span>
                  <span v-if="m.roles.length > 3" class="more">···</span>
                </div>
                <span v-else class="td-dim">-</span>
              </td>
              <td>
                <div v-if="assignmentsOf(m.id).length" class="og-assign-cell">
                  <div v-for="a in assignmentsOf(m.id)" :key="a.channel" class="og-assign-row">
                    <span class="og-assign-channel">{{ a.channelLabel }}</span>
                    <span class="og-assign-group">{{ a.group.name }}</span>
                    <span class="og-assign-role">{{ OPS_ROLE_LABEL[a.role] }}</span>
                  </div>
                </div>
              </td>
              <td>{{ m.adder }}</td>
              <td class="td-time">{{ m.at }}</td>
              <td>
                <div class="op">
                  <a class="danger" @click="pushToast('已移除')">移除</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- 右键/更多菜单：部门 -->
  <div v-if="ctx" class="ctx-menu" :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }">
    <div class="item" @click="handleCtxAct('edit')">编辑部门</div>
    <div class="item" @click="handleCtxAct('addSub')">添加下级部门</div>
    <div class="item danger" @click="handleCtxAct('del')">删除部门</div>
  </div>
  <!-- 「+」下拉：添加部门 -->
  <div v-if="addCtx" class="ctx-menu" :style="{ left: addCtx.x + 'px', top: addCtx.y + 'px' }">
    <div class="item" @click="addCtxAct">添加部门</div>
  </div>

  <!-- 弹窗 -->
  <DmDeptFormModal
    v-if="modal?.kind === 'deptForm'"
    :title="modal.title"
    :value="modal.value"
    @ok="onDeptFormOk"
    @close="closeModal"
  />
  <Modal v-else-if="modal?.kind === 'confirm'" :title="modal.title" @close="closeModal">
    <div class="modal-warn">
      <span class="modal-warn-ic" :class="{ danger: modal.danger }"><IconWarn /></span>
      <div class="modal-warn-txt">
        {{ modal.msg.pre }}<b>{{ modal.msg.bold }}</b>{{ modal.msg.post }}
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="closeModal">取消</button>
      <button class="btn" :class="modal.danger ? 'danger' : 'primary'" @click="okConfirm(modal)">{{ modal.okText }}</button>
    </template>
  </Modal>
  <AddMemberModal
    v-else-if="modal?.kind === 'addMember'"
    :ops-groups="opsGroups"
    :ops-members="opsMembers"
    :source-members="SOURCE_MEMBERS"
    @close="closeModal"
    @confirm="onAddMemberConfirm"
  />

  <!-- toast -->
  <ToastWrap />
</template>
