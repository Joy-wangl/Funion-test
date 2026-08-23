<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  ORG_TREE,
  INITIAL_MEMBERS,
  MEMBER_LOGS,
  STATUS_TEXT,
  buildOrgPath,
  initialExpandedOrgIds,
  renameOrgNode,
  roleById,
} from './data';
import type { Member, OrgNode } from './data';
import ToastWrap from '../../components/ToastWrap.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import './style.css';
import { IconSearch, IconSync, IconWarn, IconX } from './permIcons';
import MmOrgNode from './MmOrgNode.vue';
import MmInputModal from './MmInputModal.vue';
import MmAssignRoleModal from './MmAssignRoleModal.vue';
import MmMoveDeptModal from './MmMoveDeptModal.vue';
import MmEditMemberModal from './MmEditMemberModal.vue';

/* ---------- 弹窗状态（msg 为结构化富文本：pre + <b>bold</b> + post） ---------- */
type ConfirmMsg = { pre: string; bold?: string; post?: string };
type ModalState =
  | { kind: 'confirm'; title: string; msg: ConfirmMsg; okText: string; danger?: boolean; onOk: () => void }
  | { kind: 'input'; title: string; value: string; onOk: (v: string) => void }
  | { kind: 'assignRole'; ids: string[] }
  | { kind: 'moveDept'; ids: string[]; onPick?: (name: string) => void }
  | { kind: 'edit'; id: string };

/* 组织树 */
const orgTree = ref<OrgNode[]>(ORG_TREE);
const expanded = ref<Set<string>>(initialExpandedOrgIds(ORG_TREE));
const currentOrg = ref('o1-1-1');
/* 成员与选择 */
const members = ref<Member[]>(INITIAL_MEMBERS);
const selected = ref<Set<string>>(new Set());
/* 覆盖层 */
const modals = ref<ModalState[]>([]);
const drawerId = ref<string | null>(null);
const ctx = ref<{ x: number; y: number; id: string; name: string } | null>(null);

const pushModal = (m: ModalState) => { modals.value = [...modals.value, m]; };
const closeModalAt = (idx: number) => { modals.value = modals.value.filter((_, i) => i !== idx); };

/* 右键菜单外点击关闭 */
const closeCtxDoc = () => { ctx.value = null; };
watch(ctx, (v) => {
  if (v) document.addEventListener('click', closeCtxDoc);
  else document.removeEventListener('click', closeCtxDoc);
});
onBeforeUnmount(() => document.removeEventListener('click', closeCtxDoc));

/* ---------- 成员操作 ---------- */
const updateMembers = (ids: string[], patch: (m: Member) => Member) => {
  const set = new Set(ids);
  members.value = members.value.map((m) => (set.has(m.id) ? patch(m) : m));
};
const removeMembers = (ids: string[]) => {
  const set = new Set(ids);
  members.value = members.value.filter((m) => !set.has(m.id));
  const next = new Set(selected.value);
  ids.forEach((i) => next.delete(i));
  selected.value = next;
};
const clearSelected = () => { selected.value = new Set(); };

const confirmRemove = (ids: string[]) => {
  pushModal({
    kind: 'confirm', title: '移除成员', danger: true, okText: '移除',
    msg: ids.length === 1
      ? { pre: '将从当前组织移除「', bold: members.value.find((m) => m.id === ids[0])?.name, post: '」，成员账号本身不会被删除。确定移除？' }
      : { pre: '将从当前组织移除选中的 ', bold: String(ids.length), post: ' 名成员，成员账号本身不会被删除。确定移除？' },
    onOk: () => { removeMembers(ids); pushToast('已移除'); },
  });
};

const handleBatch = (type: string) => {
  const ids = [...selected.value];
  if (!ids.length) return;
  if (type === 'cancel') { clearSelected(); return; }
  if (type === 'role') { pushModal({ kind: 'assignRole', ids }); return; }
  if (type === 'dept') { pushModal({ kind: 'moveDept', ids }); return; }
  if (type === 'freeze') {
    pushModal({
      kind: 'confirm', title: '批量冻结', danger: true, okText: '冻结',
      msg: { pre: '确定冻结选中的 ', bold: String(ids.length), post: ' 名成员？' },
      onOk: () => {
        updateMembers(ids, (m) => (m.status !== 'pending' ? { ...m, status: 'frozen' } : m));
        clearSelected(); pushToast('已批量冻结');
      },
    });
    return;
  }
  if (type === 'restore') {
    pushModal({
      kind: 'confirm', title: '批量恢复', okText: '恢复',
      msg: { pre: '确定恢复选中的 ', bold: String(ids.length), post: ' 名成员？' },
      onOk: () => {
        updateMembers(ids, (m) => (m.status === 'frozen' ? { ...m, status: 'normal' } : m));
        clearSelected(); pushToast('已批量恢复');
      },
    });
    return;
  }
  if (type === 'remove') confirmRemove(ids);
};

/* ---------- 组织树 ---------- */
const toggleOrg = (id: string) => {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
};

const showOrgCtx = (e: MouseEvent, node: OrgNode) => {
  e.stopPropagation();
  e.preventDefault();
  ctx.value = { x: e.clientX, y: e.clientY, id: node.id, name: node.name };
};

const handleOrgCtxAct = (act: string) => {
  if (!ctx.value) return;
  const { id, name } = ctx.value;
  ctx.value = null;
  if (act === 'addSub') {
    pushModal({
      kind: 'input', title: '添加下级组织', value: '',
      onOk: (v) => pushToast(`已在「${name}」下添加「${v}」`),
    });
  }
  if (act === 'rename') {
    pushModal({
      kind: 'input', title: '重命名组织', value: name,
      onOk: (v) => { orgTree.value = renameOrgNode(orgTree.value, id, v); pushToast('已重命名'); },
    });
  }
  if (act === 'del') {
    pushModal({
      kind: 'confirm', title: '删除组织', danger: true, okText: '删除',
      msg: { pre: '确定删除组织「', bold: name, post: '」？其下成员将移动到上级组织。' },
      onOk: () => pushToast('已删除'),
    });
  }
};

/* ---------- 表格派生 ---------- */
const list = computed(() => members.value);
const drawerMember = computed(() => drawerId.value ? members.value.find((m) => m.id === drawerId.value) : null);

/* 确认弹窗确定 / 抽屉底部快捷入口 */
const okConfirm = (modal: Extract<ModalState, { kind: 'confirm' }>, idx: number) => {
  modal.onOk();
  closeModalAt(idx);
};
const drawerAssignRole = () => {
  if (!drawerMember.value) return;
  const id = drawerMember.value.id;
  drawerId.value = null;
  pushModal({ kind: 'assignRole', ids: [id] });
};
const drawerEdit = () => {
  if (!drawerMember.value) return;
  const id = drawerMember.value.id;
  drawerId.value = null;
  pushModal({ kind: 'edit', id });
};
</script>

<template>
  <div class="workspace">
    <!-- 左：组织树 -->
    <div class="tree-panel">
      <div class="tree-search">
        <div class="input-icon">
          <span class="ic"><IconSearch /></span>
          <input class="input" placeholder="搜索组织" />
        </div>
      </div>
      <div class="tree-body">
        <MmOrgNode
          v-for="n in orgTree"
          :key="n.id"
          :node="n"
          :depth="0"
          :expanded="expanded"
          :current-org="currentOrg"
          @toggle="toggleOrg"
          @pick="(id: string) => currentOrg = id"
          @ctx="showOrgCtx"
        />
      </div>
    </div>

    <!-- 右：内容 -->
    <div class="content-panel">
      <div class="content-head">
        <span class="title">{{ buildOrgPath(currentOrg, orgTree) || currentOrg }}</span>
        <div class="actions">
          <button
            class="btn"
            @click="pushModal({
              kind: 'confirm', title: '钉钉同步', okText: '开始同步',
              msg: { pre: '将从钉钉通讯录同步组织架构与成员信息，已存在成员的角色配置会保留。确定同步？' },
              onOk: () => pushToast('同步任务已提交，预计 1 分钟完成'),
            })"
          >
            <IconSync />
            钉钉同步
          </button>
        </div>
      </div>

      <div class="content-body">
        <!-- 批量操作条 -->
        <div v-if="selected.size > 0" class="batchbar">
          <span class="cnt">已选择 <b>{{ selected.size }}</b> 项</span>
          <div class="ops">
            <button class="btn sm" @click="handleBatch('role')">批量分配角色</button>
            <button class="btn sm" @click="handleBatch('dept')">批量移动部门</button>
            <button class="btn sm" @click="handleBatch('freeze')">批量冻结</button>
            <button class="btn sm" @click="handleBatch('restore')">批量恢复</button>
            <button class="btn sm danger" @click="handleBatch('remove')">移除</button>
            <button class="btn sm" @click="handleBatch('cancel')">取消</button>
          </div>
        </div>

        <!-- 表格 -->
        <table class="table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>账号状态</th>
              <th>部门</th>
              <th>角色</th>
              <th>添加人</th>
              <th>添加时间</th>
              <th :style="{ width: '150px' }">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in list" :key="m.id">
              <td class="col-name"><span class="link" @click="drawerId = m.id">{{ m.name }}</span></td>
              <td><span class="status" :class="m.status"><span class="dot"></span>{{ STATUS_TEXT[m.status] }}</span></td>
              <td>{{ m.dept }}</td>
              <td>
                <div v-if="m.roles.length" class="tags-wrap">
                  <span v-for="rid in m.roles" :key="rid" class="tag" :class="roleById(rid)?.color || ''">
                    {{ roleById(rid)?.name || rid }}
                  </span>
                </div>
                <span v-else :style="{ color: 'var(--text-4)' }">-</span>
              </td>
              <td>{{ m.addBy }}</td>
              <td :style="{ color: 'var(--text-3)' }">{{ m.addAt }}</td>
              <td>
                <div class="op">
                  <a v-if="m.status !== 'pending'" class="danger" @click="confirmRemove([m.id])">移除</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="list.length === 0" class="empty">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#C9CDD4" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></svg>
          <div class="t">暂无匹配的成员</div>
          <div>调整筛选条件，或点击「添加成员」</div>
        </div>

        <div v-if="list.length > 0" class="pagination">
          <span class="total">共 <b>{{ list.length }}</b> 名成员</span>
          <span class="pg">‹</span>
          <span class="pg active">1</span>
          <span class="pg">2</span>
          <span class="pg">3</span>
          <span class="pg">›</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 右键菜单：组织节点 -->
  <div v-if="ctx" class="ctx-menu" :style="{ left: `${ctx.x}px`, top: `${ctx.y}px` }">
    <div class="item" @click="handleOrgCtxAct('addSub')">添加下级组织</div>
    <div class="item" @click="handleOrgCtxAct('rename')">重命名</div>
    <div class="item danger" @click="handleOrgCtxAct('del')">删除组织</div>
  </div>

  <!-- 弹窗栈 -->
  <template v-for="(modal, idx) in modals" :key="idx">
    <Modal
      v-if="modal.kind === 'confirm'"
      :title="modal.title"
      @close="closeModalAt(idx)"
    >
      <div :style="{ display: 'flex', gap: '12px', alignItems: 'flex-start' }">
        <span :style="{ color: modal.danger ? 'var(--danger)' : 'var(--warning)', flexShrink: 0 }"><IconWarn /></span>
        <div :style="{ color: 'var(--text-2)', lineHeight: 1.6, paddingTop: '1px' }">
          {{ modal.msg.pre }}<b v-if="modal.msg.bold">{{ modal.msg.bold }}</b>{{ modal.msg.post }}
        </div>
      </div>
      <template #foot>
        <button class="btn" @click="closeModalAt(idx)">取消</button>
        <button class="btn" :class="modal.danger ? 'danger' : 'primary'" @click="okConfirm(modal, idx)">{{ modal.okText }}</button>
      </template>
    </Modal>
    <MmInputModal
      v-else-if="modal.kind === 'input'"
      :title="modal.title"
      :value="modal.value"
      @ok="modal.onOk"
      @close="closeModalAt(idx)"
    />
    <MmAssignRoleModal
      v-else-if="modal.kind === 'assignRole'"
      :ids="modal.ids"
      :members="members"
      @confirm="(roles: string[]) => {
        updateMembers(modal.ids, (m) => ({ ...m, roles: [...roles] }));
        clearSelected();
        pushToast(modal.ids.length > 1 ? '已批量分配角色' : '已更新角色');
      }"
      @close="closeModalAt(idx)"
    />
    <MmMoveDeptModal
      v-else-if="modal.kind === 'moveDept'"
      :ids="modal.ids"
      :members="members"
      @confirm="(name: string) => {
        if (modal.onPick) { modal.onPick(name); return; }
        updateMembers(modal.ids, (m) => ({ ...m, dept: name }));
        clearSelected();
        pushToast('已移动部门');
      }"
      @close="closeModalAt(idx)"
    />
    <MmEditMemberModal
      v-else
      :id="modal.id"
      :members="members"
      @save="(patch: Partial<Member>) => { updateMembers([modal.id], (m) => ({ ...m, ...patch })); pushToast('已保存'); }"
      @open-move-dept="(onPick: (name: string) => void) => pushModal({ kind: 'moveDept', ids: [modal.id], onPick })"
      @close="closeModalAt(idx)"
    />
  </template>

  <!-- 成员详情抽屉 -->
  <template v-if="drawerMember">
    <div class="drawer-mask" @click="drawerId = null" />
    <div class="drawer">
      <div class="drawer-head">
        <div class="d-title">成员详情</div>
        <span class="x" @click="drawerId = null"><IconX /></span>
      </div>
      <div class="drawer-body">
        <div class="detail-hero">
          <div class="av">{{ drawerMember.name.slice(0, 1) }}</div>
          <div class="info">
            <div class="n">{{ drawerMember.name }}</div>
            <div class="m">@{{ drawerMember.account }} · <span class="status" :class="drawerMember.status"><span class="dot"></span>{{ STATUS_TEXT[drawerMember.status] }}</span></div>
          </div>
        </div>
        <div class="section-title">基本信息</div>
        <div class="desc-list">
          <div class="row"><span class="k">手机号</span><span class="v">{{ drawerMember.phone }}</span></div>
          <div class="row"><span class="k">所属部门</span><span class="v">{{ drawerMember.dept }}</span></div>
          <div class="row"><span class="k">添加人</span><span class="v">{{ drawerMember.addBy }}</span></div>
          <div class="row"><span class="k">添加时间</span><span class="v">{{ drawerMember.addAt }}</span></div>
        </div>
        <div class="section-title">已分配角色</div>
        <div class="tags-wrap">
          <template v-if="drawerMember.roles.length">
            <span v-for="rid in drawerMember.roles" :key="rid" class="tag" :class="roleById(rid)?.color || ''">
              {{ roleById(rid)?.name || rid }}
            </span>
          </template>
          <span v-else :style="{ color: 'var(--text-4)' }">暂无角色（默认只读）</span>
        </div>
        <div class="section-title">数据权限范围</div>
        <div class="desc-list">
          <div class="row"><span class="k">查看数据</span><span class="v">本部门及下级部门</span></div>
          <div class="row"><span class="k">管理数据</span><span class="v">仅本部门</span></div>
        </div>
        <div class="section-title">操作记录</div>
        <div class="timeline">
          <div v-for="(l, i) in MEMBER_LOGS" :key="i" class="tl-item">
            <span class="d"></span>
            <div class="c">
              <div class="t">{{ l.t }}</div>
              <div class="time">{{ l.time }} · {{ l.by }}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="drawer-foot">
        <button class="btn" @click="drawerId = null">关闭</button>
        <button class="btn" @click="drawerAssignRole">分配角色</button>
        <button class="btn primary" @click="drawerEdit">编辑成员</button>
      </div>
    </div>
  </template>

  <!-- toast -->
  <ToastWrap />
</template>
