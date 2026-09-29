<script setup lang="ts">
/* ---------- 命中问题管理（品控-线上）：12 大类 / 31 小类二级清单维护（关键词 / 责任部门 / 启停） ---------- */
import { computed, ref } from 'vue';
import { QC_DEPTS } from './qcCenterData';
import { onlineHitCats, type OnlineHitSub } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';

/** 本地可编辑副本（会话内持久）：新增 / 编辑 / 启停 / 删除均作用于该副本 */
const cats = ref(onlineHitCats().map((c) => ({ name: c.name, subs: c.subs.map((s) => ({ ...s, keywords: [...s.keywords] })) })));
const active = ref(cats.value[0]?.name ?? '');
const cur = computed(() => cats.value.find((c) => c.name === active.value) ?? cats.value[0]);

const form = ref<OnlineHitSub | null>(null);
const formKw = ref('');
const formDept = ref(QC_DEPTS[0]);
const delTarget = ref<OnlineHitSub | null>(null);

const openCreate = () => {
  form.value = { id: '', name: '', desc: '', keywords: [], dept: QC_DEPTS[0], on: true, adder: '七妮妮', addedAt: '2026-09-28 10:00:00', hits: 0 };
  formKw.value = '';
  formDept.value = QC_DEPTS[0];
};
const openEdit = (s: OnlineHitSub) => {
  form.value = { ...s, keywords: [...s.keywords] };
  formKw.value = s.keywords.join('、');
  formDept.value = s.dept;
};
const saveForm = () => {
  if (!form.value || !cur.value) return;
  const kws = formKw.value.split(/[、,，\s]+/).filter(Boolean);
  if (form.value.id) {
    const list = cur.value.subs;
    const i = list.findIndex((x) => x.id === form.value!.id);
    if (i >= 0) list[i] = { ...form.value, keywords: kws, dept: formDept.value };
    pushToast('已保存子问题修改');
  } else {
    cur.value.subs.push({ ...form.value, id: `HS-${Date.now()}`, keywords: kws, dept: formDept.value });
    pushToast('已新增子问题');
  }
  form.value = null;
};
const toggleOn = (s: OnlineHitSub) => {
  s.on = !s.on;
  pushToast(s.on ? `已启用 ${s.name}` : `已停用 ${s.name}`);
};
const doDelete = () => {
  if (!delTarget.value || !cur.value) return;
  cur.value.subs = cur.value.subs.filter((x) => x.id !== delTarget.value!.id);
  pushToast(`已删除 ${delTarget.value.name}`);
  delTarget.value = null;
};

const KW_SHOW = 8;

/** 左列一级问题搜索、右列子问题搜索（查询按钮生效） */
const catQ = ref('');
const subQ = ref('');
const subApplied = ref('');
const visibleCats = computed(() => {
  const kw = catQ.value.trim();
  return cats.value.filter((c) => !kw || c.name.includes(kw));
});
const visibleSubs = computed(() => {
  const kw = subApplied.value.trim();
  return (cur.value?.subs ?? []).filter((s) => !kw || s.name.includes(kw) || s.desc.includes(kw) || s.keywords.some((k) => k.includes(kw)));
});
const shownHits = computed(() => visibleSubs.value.reduce((s, x) => s + x.hits, 0));
</script>

<template>
  <div class="qc-hm-wrap">
    <div class="qc-hm-side">
      <input class="sg-input qc-hm-search" placeholder="搜索一级问题" :value="catQ" @input="catQ = ($event.target as HTMLInputElement).value">
      <button v-for="c in visibleCats" :key="c.name" type="button" class="qc-hm-cat" :class="c.name === active ? 'on' : ''" @click="active = c.name">
        <span>{{ c.name }}</span><span class="n">{{ c.subs.length }}</span>
      </button>
    </div>
    <div class="qc-hm-main">
      <div class="qc-hm-top">
        <input class="sg-input qc-hm-search" placeholder="搜索子问题" :value="subQ" @input="subQ = ($event.target as HTMLInputElement).value">
        <button type="button" class="sg-btn primary" @click="subApplied = subQ">查询</button>
        <span class="qc-hm-note">二级清单同步自《命中问题分类-维护表》· {{ cats.length }} 大类 / {{ cats.reduce((s, c) => s + c.subs.length, 0) }} 小类</span>
        <button type="button" class="sg-btn primary" @click="openCreate">+ 新增子问题</button>
      </div>
      <div class="qc-body">
        <table class="table">
          <thead>
            <tr>
              <th>二级子问题</th>
              <th style="width: 100px">责任部门</th>
              <th style="width: 80px">状态</th>
              <th style="width: 90px">添加人</th>
              <th style="width: 160px">添加时间</th>
              <th style="width: 130px">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in visibleSubs" :key="s.id">
              <td>
                <div class="qc-hm-name">{{ s.name }}</div>
                <div class="qc-hm-desc">{{ s.desc }}</div>
                <div class="qc-hm-kws">
                  <span v-for="k in s.keywords.slice(0, KW_SHOW)" :key="k" class="qc-hm-kw">{{ k }}</span>
                  <span v-if="s.keywords.length > KW_SHOW" class="qc-hm-kw more">+{{ s.keywords.length - KW_SHOW }}</span>
                </div>
              </td>
              <td>{{ s.dept }}</td>
              <td><span class="qc-hm-dot" :class="s.on ? 'on' : 'off'"><i />{{ s.on ? '启用' : '停用' }}</span></td>
              <td>{{ s.adder }}</td>
              <td>{{ s.addedAt }}</td>
              <td>
                <div class="qc-hm-ops">
                  <a @click="openEdit(s)">编辑</a>
                  <a @click="toggleOn(s)">{{ s.on ? '停用' : '启用' }}</a>
                  <a class="danger" @click="delTarget = s">删除</a>
                </div>
              </td>
            </tr>
            <tr v-if="!visibleSubs.length">
              <td colspan="6">
                <div class="sg-empty-wrap">
                  <div class="sg-empty-icon">◌</div>
                  <div>该大类下暂无子问题</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="qc-hm-foot">共 {{ visibleSubs.length }} 个子问题 · 命中 {{ shownHits.toLocaleString() }}</div>
      </div>
    </div>
  </div>

  <Modal v-if="form" :title="form.id ? '编辑子问题' : '新增子问题'" :sub="form.id ? form.name : `归属大类：${active}`" size="md" @close="form = null">
    <div class="opt-form">
      <div class="sg-field">
        <label>子问题名称</label>
        <input class="sg-input" :value="form.name" placeholder="如：少发类-数量不足" @input="form.name = ($event.target as HTMLInputElement).value">
      </div>
      <div class="sg-field">
        <label>责任部门</label>
        <BubbleSelect class-name="sg-select" :value="formDept" :options="QC_DEPTS" @change="(v: string) => (formDept = v)" />
      </div>
      <div class="sg-field">
        <label>判定描述</label>
        <input class="sg-input" :value="form.desc" placeholder="命中判定口径说明" @input="form.desc = ($event.target as HTMLInputElement).value">
      </div>
      <div class="sg-field">
        <label>关键词</label>
        <input class="sg-input" :value="formKw" placeholder="多个关键词以顿号分隔" @input="formKw = ($event.target as HTMLInputElement).value">
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="form = null">取消</button>
      <button class="btn primary" :disabled="!form.name.trim()" @click="saveForm">保存</button>
    </template>
  </Modal>

  <Modal v-if="delTarget" title="删除子问题" :sub="`删除后 ${delTarget.name} 不再参与命中判定`" size="md" @close="delTarget = null">
    <div class="qc-pc-confirm">确认删除该子问题？删除后不可恢复。</div>
    <template #foot>
      <button class="btn" @click="delTarget = null">取消</button>
      <button class="btn primary" @click="doDelete">确认删除</button>
    </template>
  </Modal>
</template>
