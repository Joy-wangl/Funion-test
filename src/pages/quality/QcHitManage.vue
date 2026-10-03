<script setup lang="ts">
/* ---------- 命中问题管理（品控-线上）：12 大类 / 31 小类二级清单维护
 * 场景配置 V2 同构左右卡布局：左=大类卡栏（搜索＋新建瓦片＋卡头⋮编辑删除＋责任部门实心标＝小类责任部门去重汇总）；
 * 右=大类头＋状态筛选＋子问题卡（启停开关/编辑删除/提示语+关键词同盒/责任部门空心标+命中+添加信息）；
 * 责任部门配在小类上且支持多选（概览/监控列表的问题责任部门同口径 QC_DEPTS） ---------- */
import { computed, nextTick, reactive, ref } from 'vue';
import { DEPT_COLOR, QC_DEPTS } from './qcCenterData';
import { onlineHitCats, type OnlineHitCat, type OnlineHitSub } from './qcOnlineData';
import { pushToast } from '../../components/toast';
import MultiSelect from '../../components/MultiSelect.vue';
import Modal from '../../components/Modal.vue';
import MoreActions, { type MoreActionItem } from '../../components/MoreActions.vue';
/* 复用知识库共享表单样式（关键词标签编辑器/多行文本域）与场景配置 V2 左右卡布局样式 */
import '../knowledge/KbForm.css';
import '../knowledge/Knowledge.css';
import '../knowledge/SceneConfig.css';
import '../knowledge/SceneConfigV2.css';

/** 本地可编辑副本（会话内持久）：大类/小类的新增 / 编辑 / 启停 / 删除均作用于该副本 */
const cats = ref<OnlineHitCat[]>(onlineHitCats().map((c) => ({ name: c.name, desc: c.desc, subs: c.subs.map((s) => ({ ...s, keywords: [...s.keywords], depts: [...s.depts] })) })));
const active = ref(cats.value[0]?.name ?? '');
const cur = computed(() => cats.value.find((c) => c.name === active.value) ?? cats.value[0]);
/** 大类责任部门＝其下小类责任部门去重汇总（保持首现顺序） */
const catDepts = (c: OnlineHitCat) => [...new Set(c.subs.flatMap((s) => s.depts))];

/* 左栏大类搜索（名称/责任部门）；右栏子问题搜索 + 启停状态筛选 */
const catQ = ref('');
const subQ = ref('');
const ON_FILTERS = ['全部', '启用', '停用'] as const;
type OnFilter = (typeof ON_FILTERS)[number];
const fOn = ref<OnFilter>('全部');
const visibleCats = computed(() => {
  const kw = catQ.value.trim();
  return cats.value.filter((c) => !kw || c.name.includes(kw) || catDepts(c).some((d) => d.includes(kw)));
});
const visibleSubs = computed(() => {
  const kw = subQ.value.trim();
  return (cur.value?.subs ?? []).filter((s) =>
    (fOn.value === '全部' || (fOn.value === '启用') === s.on) &&
    (!kw || s.name.includes(kw) || s.desc.includes(kw) || s.keywords.some((k) => k.includes(kw))));
});
const catHits = computed(() => (cur.value?.subs ?? []).reduce((s, x) => s + x.hits, 0));

/* 责任部门标：左栏大类卡实心、右栏子问题元信息行空心（色档同概览 DEPT_COLOR） */
const deptColor = (d: string) => DEPT_COLOR[d] ?? '#65758b';
const deptSolid = (d: string) => ({ background: `${deptColor(d)}1a`, color: deptColor(d) });
const deptHollow = (d: string) => ({ background: '#fff', border: `1px solid ${deptColor(d)}`, color: deptColor(d) });

/* ---------- 大类管理：＋瓦片新建、卡头竖排三点编辑/删除；删除守卫=大类下无子问题 ---------- */
const catFormOpen = ref(false);
const catTarget = ref<string | null>(null);
const catName = ref('');
const catDesc = ref('');
const openCatCreate = () => {
  catTarget.value = null;
  catName.value = '';
  catDesc.value = '';
  catFormOpen.value = true;
};
const openCatEdit = (c: OnlineHitCat) => {
  catTarget.value = c.name;
  catName.value = c.name;
  catDesc.value = c.desc;
  catFormOpen.value = true;
};
const saveCatForm = () => {
  const name = catName.value.trim();
  if (!name) return;
  if (catTarget.value) {
    const c = cats.value.find((x) => x.name === catTarget.value);
    if (!c) return;
    if (name !== c.name && cats.value.some((x) => x.name === name)) { pushToast('同名大类已存在', 'warning'); return; }
    if (active.value === c.name) active.value = name;
    c.name = name;
    c.desc = catDesc.value.trim();
    pushToast('已保存大类修改');
  } else {
    if (cats.value.some((x) => x.name === name)) { pushToast('同名大类已存在', 'warning'); return; }
    cats.value.push({ name, desc: catDesc.value.trim(), subs: [] });
    active.value = name;
    pushToast('已新增大类');
  }
  catFormOpen.value = false;
};
const delCatTarget = ref<OnlineHitCat | null>(null);
const doDeleteCat = () => {
  if (!delCatTarget.value) return;
  cats.value = cats.value.filter((x) => x.name !== delCatTarget.value!.name);
  if (active.value === delCatTarget.value.name) active.value = cats.value[0]?.name ?? '';
  pushToast(`已删除 ${delCatTarget.value.name}`);
  delCatTarget.value = null;
};
const catMenu = (c: OnlineHitCat): MoreActionItem[] => [
  { label: '编辑', onClick: () => openCatEdit(c) },
  {
    label: '删除',
    danger: true,
    onClick: () => {
      if (c.subs.length) { pushToast(`大类「${c.name}」下还有 ${c.subs.length} 个子问题，请先删除`, 'warning'); return; }
      delCatTarget.value = c;
    },
  },
];

/* ---------- 子问题表单：关键词标签编辑（同知识库素材弹窗交互）；责任部门多选 ---------- */
const form = ref<OnlineHitSub | null>(null);
const formDepts = ref<string[]>([QC_DEPTS[0]]);
const delTarget = ref<OnlineHitSub | null>(null);

const kwTags = reactive({ tags: [] as string[] });
const kwDraft = ref('');
const kwCreating = ref(false);
const kwInputRef = ref<HTMLInputElement | null>(null);
const kwAdd = () => {
  const v = kwDraft.value.trim().replace(/[,，、]+$/, '');
  if (v && !kwTags.tags.includes(v)) kwTags.tags.push(v);
  kwDraft.value = '';
};
const kwRemove = (t: string) => {
  kwTags.tags = kwTags.tags.filter((x) => x !== t);
};
const kwOnKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，' || e.key === '、') {
    e.preventDefault();
    kwAdd();
  } else if (e.key === 'Backspace' && !kwDraft.value && kwTags.tags.length) kwTags.tags.pop();
};
const kwStartCreate = () => {
  kwCreating.value = true;
  kwDraft.value = '';
  nextTick(() => kwInputRef.value?.focus());
};
const kwEndCreate = () => {
  if (kwDraft.value.trim()) kwAdd();
  kwCreating.value = false;
};

const openCreate = () => {
  form.value = { id: '', name: '', desc: '', keywords: [], depts: [QC_DEPTS[0]], on: true, adder: '七妮妮', addedAt: '2026-09-28 10:00:00', hits: 0 };
  kwTags.tags = [];
  kwCreating.value = false;
  formDepts.value = [QC_DEPTS[0]];
};
const openEdit = (s: OnlineHitSub) => {
  form.value = { ...s, keywords: [...s.keywords], depts: [...s.depts] };
  kwTags.tags = [...s.keywords];
  kwCreating.value = false;
  formDepts.value = [...s.depts];
};
const saveForm = () => {
  if (!form.value || !cur.value) return;
  const kws = [...kwTags.tags];
  const depts = [...formDepts.value];
  if (form.value.id) {
    const list = cur.value.subs;
    const i = list.findIndex((x) => x.id === form.value!.id);
    if (i >= 0) list[i] = { ...form.value, keywords: kws, depts };
    pushToast('已保存子问题修改');
  } else {
    cur.value.subs.push({ ...form.value, id: `HS-${Date.now()}`, keywords: kws, depts });
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
</script>

<template>
  <div class="qc-hm-wrap">
    <!-- 左栏：大类卡（名称+子问题数+⋮；责任部门实心标） -->
    <aside class="sc2-rail">
      <div class="sc2-rail-head">
        <input v-model="catQ" class="kb-input" placeholder="搜索大类 / 责任部门">
        <button class="sc2-add-type" type="button" title="新建大类" aria-label="新建大类" @click="openCatCreate">＋</button>
      </div>
      <div class="sc2-rail-list">
        <div
          v-for="c in visibleCats" :key="c.name"
          class="sc2-type-card" :class="{ active: cur?.name === c.name }"
          @click="active = c.name"
        >
          <div class="sc2-tc-head">
            <b :title="c.name">{{ c.name }}</b>
            <span class="sc2-tc-count">{{ c.subs.length }} 子问题</span>
            <MoreActions dot vertical :items="catMenu(c)" />
          </div>
          <p v-if="c.desc" class="qc-hm-cat-desc">{{ c.desc }}</p>
          <div class="sc2-tc-chips">
            <em v-for="d in catDepts(c)" :key="d" class="qc-hm-dept" :style="deptSolid(d)" :title="`责任部门：${d}`">{{ d }}</em>
          </div>
        </div>
        <div v-if="!visibleCats.length" class="kb-empty">无匹配大类</div>
      </div>
    </aside>

    <!-- 右栏：大类头 + 定义带 + 状态筛选 + 子问题卡流 -->
    <main class="sc2-main">
      <template v-if="cur">
        <div class="sc2-main-head">
          <div>
            <b>{{ cur.name }}</b>
            <span class="s">同步自《命中问题分类-维护表》 · 共 {{ cur.subs.length }} 个子问题 · 命中 {{ catHits.toLocaleString() }}</span>
          </div>
          <button class="kb-btn primary" type="button" @click="openCreate">新建子问题</button>
        </div>
        <div class="sc2-filter">
          <span>状态</span>
          <button
            v-for="f in ON_FILTERS" :key="f" type="button"
            class="sc2-fchip" :class="{ active: fOn === f }"
            @click="fOn = f"
          >{{ f }}</button>
          <input v-model="subQ" class="kb-input qc-hm-subsearch" placeholder="搜索子问题 / 关键词">
        </div>
        <div class="sc2-cards">
          <section v-for="s in visibleSubs" :key="s.id" class="sc2-sub-card" :class="{ off: !s.on }">
            <div class="sc2-sc-head">
              <b :title="s.name">{{ s.name }}</b>
              <span class="sc-switch" :class="{ on: s.on }" :title="s.on ? '停用' : '启用'" @click="toggleOn(s)"><i /></span>
              <span class="sc2-sc-ops">
                <a class="kb-link" href="#" @click.prevent="openEdit(s)">编辑</a>
                <a class="kb-link danger" href="#" @click.prevent="delTarget = s">删除</a>
              </span>
            </div>
            <div class="sc2-sc-qa">
              <p v-if="s.desc" class="qc-hm-ai">{{ s.desc }}</p>
              <div class="sc2-sc-qa-tags">
                <em v-for="k in s.keywords" :key="k">{{ k }}</em>
              </div>
            </div>
            <div class="sc2-sc-meta">
              <em v-for="d in s.depts" :key="d" class="qc-hm-dept" :style="deptHollow(d)" :title="`责任部门：${d}`">{{ d }}</em>
              <i>命中 {{ s.hits.toLocaleString() }}</i>
              <i>添加 {{ s.adder }} · {{ s.addedAt }}</i>
            </div>
          </section>
          <div v-if="!visibleSubs.length" class="kb-empty">{{ cur.subs.length ? '该状态下暂无匹配子问题' : '该大类下暂无子问题，点右上「新建子问题」创建' }}</div>
        </div>
      </template>
      <div v-else class="kb-empty">请在左侧选择大类</div>
    </main>
  </div>

  <!-- 子问题新建/编辑：名称 → 关键词标签 → 责任部门 -->
  <Modal v-if="form" :title="form.id ? '编辑子问题' : '新增子问题'" :sub="form.id ? form.name : `归属大类：${active}`" size="md" @close="form = null">
    <div class="opt-form">
      <div class="sg-field">
        <label>子问题名称</label>
        <input class="sg-input" :value="form.name" placeholder="如：数量不足" @input="form.name = ($event.target as HTMLInputElement).value">
      </div>
      <div class="sg-field">
        <label>关键词</label>
        <div class="qa-kwtags">
          <em v-for="t in kwTags.tags" :key="t" class="kb-scene-tag">{{ t }}<i title="移除" @click="kwRemove(t)">✕</i></em>
          <input
            v-if="kwCreating" :ref="(el) => { kwInputRef = el as HTMLInputElement | null; }" v-model="kwDraft" class="kb-scene-create" placeholder="请输入"
            @keydown="kwOnKey" @keyup.esc="kwCreating = false" @blur="kwEndCreate"
          >
          <button v-else type="button" class="kb-scene-tag add" title="新增关键词" @click="kwStartCreate">＋</button>
        </div>
      </div>
      <div class="sg-field">
        <label>责任部门</label>
        <MultiSelect class-name="sg-select" :value="formDepts" :options="QC_DEPTS" placeholder="选择责任部门（可多选）" @change="(v: string[]) => (formDepts = v)" />
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="form = null">取消</button>
      <button class="btn primary" :disabled="!form.name.trim() || !formDepts.length" @click="saveForm">保存</button>
    </template>
  </Modal>

  <!-- 大类新建/编辑：名称 + AI分析提示语 + 责任部门 -->
  <Modal v-if="catFormOpen" :title="catTarget ? '编辑大类' : '新增大类'" :sub="catTarget ?? '创建后可在大类下新增子问题'" size="md" @close="catFormOpen = false">
    <div class="opt-form">
      <div class="sg-field">
        <label>大类名称</label>
        <input v-model="catName" class="sg-input" placeholder="如：少发">
      </div>
      <div class="sg-field">
        <label>AI分析提示语</label>
        <textarea v-model="catDesc" class="qa-textarea" rows="4" placeholder="命中判定口径说明"></textarea>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="catFormOpen = false">取消</button>
      <button class="btn primary" :disabled="!catName.trim()" @click="saveCatForm">保存</button>
    </template>
  </Modal>

  <Modal v-if="delTarget" title="删除子问题" :sub="`删除后 ${delTarget.name} 不再参与命中判定`" size="md" @close="delTarget = null">
    <div class="qc-pc-confirm">确认删除该子问题？删除后不可恢复。</div>
    <template #foot>
      <button class="btn" @click="delTarget = null">取消</button>
      <button class="btn primary" @click="doDelete">确认删除</button>
    </template>
  </Modal>

  <Modal v-if="delCatTarget" title="删除大类" :sub="`删除后 ${delCatTarget.name} 不再参与命中判定`" size="md" @close="delCatTarget = null">
    <div class="qc-pc-confirm">确认删除该大类？删除后不可恢复。</div>
    <template #foot>
      <button class="btn" @click="delCatTarget = null">取消</button>
      <button class="btn primary" @click="doDeleteCat">确认删除</button>
    </template>
  </Modal>
</template>
