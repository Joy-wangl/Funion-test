<script setup lang="ts">
/* ---------- 权限管理（品控-线上）：组织树钻取 + 成员角色与账号状态 ---------- */
import { computed, ref } from 'vue';
import { ONLINE_MEMBERS } from './qcOnlineData';
import { pushToast } from '../../components/toast';

/** 组织树由成员部门路径派生（两级），选中节点按下钻前缀过滤成员 */
const tree = computed(() => {
  const map = new Map<string, Set<string>>();
  for (const m of ONLINE_MEMBERS) {
    if (m.dept === '-') continue;
    const [l1, l2] = m.dept.split('/');
    if (!map.has(l1)) map.set(l1, new Set());
    if (l2) map.get(l1)!.add(l2);
  }
  return [...map.entries()].map(([name, children]) => ({ name, children: [...children] }));
});
const sel = ref<string>('');
const toggleSel = (name: string) => { sel.value = sel.value === name ? '' : name; };

const orgQ = ref('');
const visibleTree = computed(() => {
  const kw = orgQ.value.trim();
  return tree.value.filter((g) => !kw || g.name.includes(kw) || [...g.children].some((c) => c.includes(kw)));
});

const members = computed(() => (sel.value
  ? ONLINE_MEMBERS.filter((m) => m.dept === sel.value || m.dept.startsWith(`${sel.value}/`))
  : ONLINE_MEMBERS));

const STATUS_DOT: Record<string, string> = { 正常: '#1f9d55', 冻结: '#e5484d', 未添加: '#b6bcc8' };
const ROLE_META: Record<string, { bg: string; color: string }> = {
  超级管理员: { bg: '#ffece8', color: '#e5484d' },
  只读成员: { bg: '#f2f3f5', color: '#8b92a1' },
  角色A: { bg: '#eef4ff', color: '#4f7cff' },
  角色B: { bg: '#e8f7ee', color: '#1f9d55' },
  角色C: { bg: '#fff3e8', color: '#d46b08' },
};
const roleMeta = (r: string) => ROLE_META[r] ?? { bg: '#eef4ff', color: '#4f7cff' };
</script>

<template>
  <div class="qc-head qc-head-col">
    <div class="qc-title">成员管理</div>
    <div class="qc-pm-sub">组织成员 · 角色与账号状态</div>
  </div>
  <div class="qc-pm-wrap">
    <div class="qc-pm-side">
      <input class="sg-input qc-pm-search" placeholder="搜索组织" :value="orgQ" @input="orgQ = ($event.target as HTMLInputElement).value">
      <div v-for="g in visibleTree" :key="g.name" class="qc-pm-node">
        <button type="button" class="qc-pm-l1" :class="sel === g.name ? 'on' : ''" @click="toggleSel(g.name)">
          <span v-if="g.children.length" class="caret">▾</span>{{ g.name }}
        </button>
        <button
          v-for="c in g.children"
          :key="c"
          type="button"
          class="qc-pm-l2"
          :class="sel === `${g.name}/${c}` ? 'on' : ''"
          @click="toggleSel(`${g.name}/${c}`)"
        >{{ c }}</button>
      </div>
    </div>
    <div class="qc-pm-main">
      <div class="qc-pm-head">
        <span class="qc-pm-crumb">{{ sel || '全部组织' }}</span>
        <button type="button" class="sg-btn" @click="pushToast('已发起钉钉组织同步，完成后自动刷新成员')">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9M13.5 2.5v3h-3" /></svg>
          钉钉同步
        </button>
      </div>
      <div class="qc-body">
        <table class="table">
          <thead>
            <tr>
              <th>姓名</th>
              <th style="width: 110px">账号状态</th>
              <th>部门</th>
              <th>角色</th>
              <th style="width: 170px">添加时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.name">
              <td class="col-name"><div>{{ m.name }}</div></td>
              <td><span class="qc-pm-dot" :style="{ color: STATUS_DOT[m.status] }"><i :style="{ background: STATUS_DOT[m.status] }" /><b>{{ m.status }}</b></span></td>
              <td>{{ m.dept }}</td>
              <td>
                <div class="qc-pm-roles">
                  <span v-for="r in m.roles" :key="r" class="qc-pm-role" :style="{ background: roleMeta(r).bg, color: roleMeta(r).color }">{{ r }}</span>
                  <span v-if="!m.roles.length" style="color: var(--text-4)">-</span>
                </div>
              </td>
              <td>{{ m.addedAt }}</td>
            </tr>
            <tr v-if="!members.length">
              <td colspan="5">
                <div class="sg-empty-wrap">
                  <div class="sg-empty-icon">◌</div>
                  <div>该组织下暂无成员</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
