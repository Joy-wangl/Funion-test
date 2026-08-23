<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  INITIAL_ROLE_MEMBERS,
  PERMISSION_MENU,
  ROLE_GROUPS,
} from './data';
import type { Member, RoleGroupNode, RoleMember } from './data';
import ToastWrap from '../../components/ToastWrap.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import './style.css';
import { IconSearch, IconWarn } from './permIcons';
import RpTreeNode from './RpTreeNode.vue';
import RpPermCheckbox from './RpPermCheckbox.vue';
import RpPermCells from './RpPermCells.vue';
import RpNameFormModal from './RpNameFormModal.vue';
import RpMemberPickerModal from './RpMemberPickerModal.vue';
import RpDeptPickerModal from './RpDeptPickerModal.vue';

/* ---------- 弹窗状态（msg 为结构化富文本：pre + <b>bold</b> + post） ---------- */
type ConfirmMsg = { pre: string; bold?: string; post: string };
type ModalState =
  | { kind: 'nameForm'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'confirm'; title: string; msg: ConfirmMsg; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'memberPicker' }
  | { kind: 'deptPicker' };

/** 重命名角色树节点（组或角色） */
function renameRoleNode(tree: RoleGroupNode[], id: string, name: string): RoleGroupNode[] {
  return tree.map((n) =>
    n.id === id
      ? { ...n, name }
      : { ...n, children: n.children ? renameRoleNode(n.children, id, name) : undefined },
  );
}

const groups = ref<RoleGroupNode[]>(ROLE_GROUPS);
const curRoleId = ref('r2');
const collapsed = ref<Set<string>>(new Set());
const tab = ref<'member' | 'perm'>('member');
const roleMembers = ref<RoleMember[]>(INITIAL_ROLE_MEMBERS);
const ctx = ref<{ x: number; y: number; type: 'role' | 'group'; id: string; name: string } | null>(null);
const modal = ref<ModalState | null>(null);

/* 右键菜单外点击关闭 */
const closeCtxDoc = () => { ctx.value = null; };
watch(ctx, (v) => {
  if (v) document.addEventListener('click', closeCtxDoc);
  else document.removeEventListener('click', closeCtxDoc);
});
onBeforeUnmount(() => document.removeEventListener('click', closeCtxDoc));

/* 面包屑：组名/角色名 */
const crumb = computed(() => {
  const crumbGroup = groups.value.find((g) => g.children?.some((c) => c.id === curRoleId.value));
  const crumbRole = crumbGroup?.children?.find((c) => c.id === curRoleId.value);
  return (crumbGroup ? crumbGroup.name + '/' : '') + (crumbRole ? crumbRole.name : '');
});

const showCtx = (e: MouseEvent, type: 'role' | 'group', id: string, name: string) => {
  e.stopPropagation();
  e.preventDefault();
  ctx.value = { x: e.clientX, y: e.clientY, type, id, name };
};

const handleCtxAct = (act: string) => {
  if (!ctx.value) return;
  const { id, name } = ctx.value;
  ctx.value = null;
  if (act === 'edit') {
    modal.value = {
      kind: 'nameForm', title: '编辑角色', value: name,
      onOk: (v) => { groups.value = renameRoleNode(groups.value, id, v); pushToast('已保存'); },
    };
  }
  if (act === 'del') {
    modal.value = {
      kind: 'confirm', title: '删除角色', danger: true, okText: '删除',
      msg: { pre: '确定删除角色「', bold: name, post: '」？' },
      onOk: () => pushToast('已删除'),
    };
  }
  if (act === 'editGroup') {
    modal.value = {
      kind: 'nameForm', title: '编辑角色组', value: name,
      onOk: (v) => { groups.value = renameRoleNode(groups.value, id, v); pushToast('已保存'); },
    };
  }
  if (act === 'addRole') {
    modal.value = {
      kind: 'nameForm', title: '添加下级角色', value: '',
      onOk: (v) => pushToast(`已在「${name}」下添加角色「${v}」`),
    };
  }
};

const toggleGroup = (id: string) => {
  const next = new Set(collapsed.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  collapsed.value = next;
};

const closeModal = () => { modal.value = null; };
const okConfirm = (m: Extract<ModalState, { kind: 'confirm' }>) => { m.onOk(); closeModal(); };
/* 名称表单确定（模板内联合类型无法在回调中收窄，统一在此守卫） */
const onNameFormOk = (v: string) => {
  if (modal.value?.kind === 'nameForm') modal.value.onOk(v);
};

const openMemberPicker = () => { modal.value = { kind: 'memberPicker' }; };
const openDeptPicker = () => { modal.value = { kind: 'deptPicker' }; };
const openAddGroup = () => {
  modal.value = {
    kind: 'nameForm', title: '添加角色组', value: '',
    onOk: (v) => pushToast(`已添加角色组「${v}」`),
  };
};

const onMemberPickerConfirm = (added: Member[]) => {
  roleMembers.value = [
    ...added.map((x) => ({ name: x.name, dept: x.dept, adder: '七彩虹', at: '2026-08-13 12:00:00' })),
    ...roleMembers.value,
  ];
  pushToast(`已添加 ${added.length} 名成员到当前角色`);
};
</script>

<template>
  <div class="workspace">
    <!-- 左：角色管理树 -->
    <div class="tree-panel">
      <div class="panel-title">角色管理</div>
      <div class="role-search">
        <div class="input-icon">
          <span class="ic"><IconSearch /></span>
          <input class="input" placeholder="搜索角色分组或角色名" />
        </div>
        <button class="icon-btn" title="添加角色组" @click="openAddGroup">+</button>
      </div>
      <div class="tree-body">
        <RpTreeNode
          v-for="g in groups"
          :key="g.id"
          :node="g"
          :depth="0"
          :collapsed="collapsed"
          :cur-role-id="curRoleId"
          @pick="(id: string) => curRoleId = id"
          @toggle="toggleGroup"
          @ctx="showCtx"
        />
      </div>
    </div>

    <!-- 右：内容 -->
    <div class="content-panel">
      <div class="content-head">
        <span class="title">{{ crumb }}</span>
      </div>
      <div class="tab-bar">
        <div class="og-tabs">
          <button class="og-tab" :class="tab === 'member' ? 'active' : ''" @click="tab = 'member'">角色成员</button>
          <button class="og-tab" :class="tab === 'perm' ? 'active' : ''" @click="tab = 'perm'">权限配置</button>
        </div>
        <button v-if="tab === 'member'" class="btn primary" :style="{ marginLeft: 'auto' }" @click="openMemberPicker">添加成员</button>
      </div>

      <div v-if="tab === 'member'" class="content-body">
        <table class="table">
          <thead><tr><th>姓名</th><th>部门</th><th>添加人</th><th>添加时间</th><th :style="{ width: '80px' }">操作</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in roleMembers" :key="i">
              <td class="col-name">{{ r.name }}</td>
              <td>{{ r.dept }}</td>
              <td>{{ r.adder }}</td>
              <td :style="{ color: 'var(--text-3)' }">{{ r.at }}</td>
              <td><div class="op"><a class="danger" @click="pushToast('已移除')">移除</a></div></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="tab === 'perm'" class="content-body">
        <table class="pm-table">
          <thead>
            <tr>
              <th :style="{ width: '14%' }">一级菜单</th>
              <th :style="{ width: '14%' }">二级菜单</th>
              <th :style="{ width: '24%' }">查看数据权限</th>
              <th :style="{ width: '24%' }">管理数据权限</th>
              <th :style="{ width: '24%' }">功能权限</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(item, pi) in PERMISSION_MENU" :key="pi">
              <template v-if="item.children">
                <tr v-for="(child, ci) in item.children" :key="`${pi}-${ci}`">
                  <td v-if="ci === 0" :rowspan="item.children.length" class="c-name">
                    <RpPermCheckbox :checked="item.checked" /> {{ item.name }}
                  </td>
                  <td class="c-name"><RpPermCheckbox :checked="child.checked" /> {{ child.name }}</td>
                  <RpPermCells :cfg="child" :key-prefix="`p${pi}c${ci}`" @pick="openDeptPicker" />
                </tr>
              </template>
              <tr v-else>
                <td class="c-name"><RpPermCheckbox :checked="item.checked" /> {{ item.name }}</td>
                <td class="dash">–</td>
                <RpPermCells :cfg="item" :key-prefix="`p${pi}`" @pick="openDeptPicker" />
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- 右键菜单 -->
  <div v-if="ctx" class="ctx-menu" :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }">
    <template v-if="ctx.type === 'role'">
      <div class="item" @click="handleCtxAct('edit')">编辑角色</div>
      <div class="item danger" @click="handleCtxAct('del')">删除角色</div>
    </template>
    <template v-else>
      <div class="item" @click="handleCtxAct('editGroup')">编辑角色组</div>
      <div class="item" @click="handleCtxAct('addRole')">添加下级角色</div>
    </template>
  </div>

  <!-- 弹窗 -->
  <RpNameFormModal
    v-if="modal?.kind === 'nameForm'"
    :title="modal.title"
    :value="modal.value"
    @ok="onNameFormOk"
    @close="closeModal"
  />
  <Modal v-else-if="modal?.kind === 'confirm'" :title="modal.title" @close="closeModal">
    <div :style="{ display: 'flex', gap: '12px', alignItems: 'flex-start' }">
      <span :style="{ color: modal.danger ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }"><IconWarn /></span>
      <div :style="{ color: 'var(--text-2)', lineHeight: 1.6, paddingTop: '1px' }">
        {{ modal.msg.pre }}<b>{{ modal.msg.bold }}</b>{{ modal.msg.post }}
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="closeModal">取消</button>
      <button class="btn" :class="modal.danger ? 'danger' : 'primary'" @click="okConfirm(modal)">{{ modal.okText }}</button>
    </template>
  </Modal>
  <RpMemberPickerModal v-else-if="modal?.kind === 'memberPicker'" @close="closeModal" @confirm="onMemberPickerConfirm" />
  <RpDeptPickerModal v-else-if="modal?.kind === 'deptPicker'" @close="closeModal" />

  <!-- toast -->
  <ToastWrap />
</template>
