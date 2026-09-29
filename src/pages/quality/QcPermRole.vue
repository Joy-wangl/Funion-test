<script setup lang="ts">
/* ---------- 角色管理（品控-线上）：角色分组树 + 角色成员 / 权限配置 ---------- */
import { computed, ref } from 'vue';
import {
  QC_PERM_MENU,
  QC_PERM_OPTS,
  QC_ROLE_GROUPS,
  QC_ROLE_MEMBERS,
  QC_ROLE_NAMES,
  type QcRoleMember,
} from './qcOnlineData';
import { INITIAL_MEMBERS } from '../permission/data';
import type { Member } from '../permission/data';
import { IconCheck, IconSearch, IconWarn } from '../permission/permIcons';
import RpPermCheckbox from '../permission/RpPermCheckbox.vue';
import RpNameFormModal from '../permission/RpNameFormModal.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import QcAssignModal from './QcAssignModal.vue';

interface MenuRow {
  name: string;
  sub?: string;
  view: number | null;
  manage: number | null;
  funcs: string[];
  checked: boolean;
  viewSel: number | null;
  manageSel: number | null;
  funcOn: boolean[];
}

const rows = ref<MenuRow[]>(QC_PERM_MENU.map((r) => ({
  ...r,
  checked: true,
  viewSel: r.view,
  manageSel: r.manage,
  funcOn: r.funcs.map(() => false),
})));

/* 连续同名一级菜单合并为一组（首行 rowspan 跨行） */
const menuGroups = computed(() => {
  const out: { name: string; rows: MenuRow[] }[] = [];
  for (const r of rows.value) {
    const last = out[out.length - 1];
    if (last && last.name === r.name) last.rows.push(r);
    else out.push({ name: r.name, rows: [r] });
  }
  return out;
});

const setView = (r: MenuRow, i: number) => { r.viewSel = i; };
const setManage = (r: MenuRow, i: number) => { r.manageSel = i; };
const toggleFunc = (r: MenuRow, i: number) => { r.funcOn[i] = !r.funcOn[i]; };

/* ---------- 左树 ---------- */
const q = ref('');
const collapsed = ref<Set<string>>(new Set(QC_ROLE_GROUPS.slice(1)));
const cur = ref(`${QC_ROLE_GROUPS[0]}/${QC_ROLE_NAMES[1]}`);
const tab = ref<'member' | 'perm'>('member');

const groups = computed(() => {
  const kw = q.value.trim();
  return QC_ROLE_GROUPS
    .map((g) => ({ name: g, roles: kw && !g.includes(kw) ? QC_ROLE_NAMES.filter((r) => r.includes(kw)) : QC_ROLE_NAMES }))
    .filter((g) => g.roles.length || g.name.includes(kw));
});
const isOpen = (g: string) => q.value.trim() !== '' || !collapsed.value.has(g);
const toggleGroup = (g: string) => {
  const next = new Set(collapsed.value);
  if (next.has(g)) next.delete(g);
  else next.add(g);
  collapsed.value = next;
};

/* ---------- 角色成员 ---------- */
const roleMembers = ref<QcRoleMember[]>(QC_ROLE_MEMBERS.map((m) => ({ ...m })));
const assignOpen = ref(false);
const removeTarget = ref<QcRoleMember | null>(null);

const nowAt = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

const onAssign = (members: Member[]) => {
  members.forEach((m) => roleMembers.value.unshift({ name: m.name, dept: m.dept, adder: '七妮妮', at: nowAt() }));
  pushToast(`已添加 ${members.length} 名成员到当前角色`);
};
const doRemove = () => {
  const t = removeTarget.value;
  if (!t) return;
  const i = roleMembers.value.indexOf(t);
  if (i >= 0) roleMembers.value.splice(i, 1);
  removeTarget.value = null;
  pushToast('已移除');
};

/* ---------- 添加角色组 ---------- */
const groupFormOpen = ref(false);
</script>

<template>
  <div class="qc-head qc-head-col">
    <div class="qc-title">角色管理</div>
    <div class="qc-pm-sub">角色分组与功能权限配置</div>
  </div>
  <div class="qc-perm-embed qc-perm-scope">
    <div class="workspace">
      <div class="tree-panel">
        <div class="panel-title">角色管理</div>
        <div class="role-search">
          <div class="input-icon">
            <span class="ic"><IconSearch /></span>
            <input v-model="q" class="input" placeholder="搜索角色分组或角色">
          </div>
          <button type="button" class="icon-btn" @click="groupFormOpen = true">+</button>
        </div>
        <div class="tree-body">
          <div v-for="g in groups" :key="g.name" class="qc-role-group">
            <button type="button" class="qc-role-g" @click="toggleGroup(g.name)">
              <span class="qc-role-caret" :class="{ open: isOpen(g.name) }">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </span>
              {{ g.name }}
            </button>
            <template v-if="isOpen(g.name)">
              <button
                v-for="r in g.roles"
                :key="r"
                type="button"
                class="qc-role-r"
                :class="{ on: cur === `${g.name}/${r}` }"
                @click="cur = `${g.name}/${r}`"
              >{{ r }}</button>
            </template>
          </div>
          <div v-if="!groups.length" class="empty tight">无匹配角色</div>
        </div>
      </div>
      <div class="content-panel">
        <div class="content-head">
          <span class="title">{{ cur }}</span>
        </div>
        <div class="tab-bar">
          <div class="og-tabs">
            <button type="button" class="og-tab" :class="tab === 'member' ? 'active' : ''" @click="tab = 'member'">角色成员</button>
            <button type="button" class="og-tab" :class="tab === 'perm' ? 'active' : ''" @click="tab = 'perm'">权限配置</button>
          </div>
          <button v-if="tab === 'member'" type="button" class="btn primary ml-auto" @click="assignOpen = true">添加成员</button>
        </div>

        <div v-if="tab === 'member'" class="content-body">
          <table class="pm-table">
            <thead>
              <tr>
                <th class="th-14">姓名</th>
                <th class="th-24">部门</th>
                <th class="th-14">添加人</th>
                <th class="th-24">添加时间</th>
                <th class="th-14">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(m, i) in roleMembers" :key="`${m.name}-${i}`">
                <td class="c-name">{{ m.name }}</td>
                <td>{{ m.dept }}</td>
                <td>{{ m.adder }}</td>
                <td>{{ m.at }}</td>
                <td><a class="qc-perm-rm" @click="removeTarget = m">移除</a></td>
              </tr>
              <tr v-if="!roleMembers.length">
                <td colspan="5"><div class="empty tight">暂无成员</div></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="content-body">
          <table class="pm-table">
            <thead>
              <tr>
                <th class="th-14">一级菜单</th>
                <th class="th-14">二级菜单</th>
                <th class="th-24">查看数据权限</th>
                <th class="th-24">管理数据权限</th>
                <th class="th-24">功能权限</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(g, gi) in menuGroups" :key="g.name">
                <tr v-for="(r, ri) in g.rows" :key="`${gi}-${ri}`">
                  <td v-if="ri === 0" :rowspan="g.rows.length" class="c-name">
                    <RpPermCheckbox :checked="r.checked" /> {{ g.name }}
                  </td>
                  <td class="c-name"><span v-if="r.sub">{{ r.sub }}</span><span v-else class="dash">–</span></td>
                  <td>
                    <span v-if="r.view === null" class="dash">–</span>
                    <div v-else class="perm-list">
                      <label v-for="(opt, i) in QC_PERM_OPTS" :key="opt" class="radio">
                        <input type="radio" :name="`qc-v-${gi}-${ri}`" :checked="r.viewSel === i" @change="setView(r, i)">
                        <span class="dot" />
                        {{ opt }}
                      </label>
                      <div class="perm-nodata">
                        <label class="checkbox disabled">
                          <input type="checkbox" checked disabled>
                          <span class="box"><IconCheck /></span>
                          无归属数据
                        </label>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span v-if="r.manage === null" class="dash">–</span>
                    <div v-else class="perm-list">
                      <label v-for="(opt, i) in QC_PERM_OPTS" :key="opt" class="radio">
                        <input type="radio" :name="`qc-m-${gi}-${ri}`" :checked="r.manageSel === i" @change="setManage(r, i)">
                        <span class="dot" />
                        {{ opt }}
                      </label>
                      <div class="perm-nodata">
                        <label class="checkbox disabled">
                          <input type="checkbox" checked disabled>
                          <span class="box"><IconCheck /></span>
                          无归属数据
                        </label>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span v-if="!r.funcs.length" class="dash">–</span>
                    <div v-else :class="r.funcs.length > 3 ? 'func-list cols' : 'func-list'">
                      <label v-for="(f, fi) in r.funcs" :key="f" class="checkbox">
                        <input type="checkbox" :checked="r.funcOn[fi]" @change="toggleFunc(r, fi)">
                        <span class="box"><IconCheck /></span>
                        {{ f }}
                      </label>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
          <div class="qc-perm-save">
            <button type="button" class="btn primary" @click="pushToast('权限配置已保存')">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="qc-perm-scope">
    <QcAssignModal v-if="assignOpen" :source="INITIAL_MEMBERS" @close="assignOpen = false" @confirm="onAssign" />
    <RpNameFormModal
      v-if="groupFormOpen"
      title="添加角色组"
      value=""
      @ok="(v: string) => { groupFormOpen = false; pushToast(`已添加角色组「${v}」`); }"
      @close="groupFormOpen = false"
    />
    <Modal v-if="removeTarget" title="移除成员" @close="removeTarget = null">
      <div class="modal-warn">
        <span class="modal-warn-ic danger"><IconWarn /></span>
        <div class="modal-warn-txt">将把「<b>{{ removeTarget.name }}</b>」从当前角色移除，成员账号本身不会被删除。确定移除？</div>
      </div>
      <template #foot>
        <button class="btn" @click="removeTarget = null">取消</button>
        <button class="btn danger" @click="doRemove">移除</button>
      </template>
    </Modal>
  </div>
</template>
