<script setup lang="ts">
/* 场景配置（定版 V2）：左右结构
 * 左栏=场景类型卡（类型名+场景定义摘要+细分场景快捷 chips，点 chip 右栏定位闪标）；
 * 右栏=类型定义带（条件定义+场景定义，命中链路回显）+ 所选类型下的场景卡；
 * 场景配置抽屉复用 SceneCfgDrawer；类型新建/编辑复用 TypeCfgDrawer（条件定义→场景定义） */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { pushToast } from '../../components/toast';
import MoreActions, { type MoreActionItem } from '../../components/MoreActions.vue';
import SceneCfgDrawer from './SceneCfgDrawer.vue';
import TypeCfgDrawer from './TypeCfgDrawer.vue';
import { SC_SCENE_STAGES, typeCondText, fbScenes, type FbScene, type FbSub } from './sceneConfigData';
import './KbForm.css';
import './SceneConfig.css';
import './SceneConfigV2.css';

/* ---------- 左栏：类型卡列表（关键词按类型名/创建人过滤）；cur=右栏当前类型 ---------- */
const fKw = ref('');
const visibleTypes = computed(() => {
  const kw = fKw.value.trim();
  return fbScenes.filter((g) => !kw || g.name.includes(kw) || g.creator.includes(kw));
});
const cur = ref<FbScene | null>(fbScenes[0] ?? null);

/* 场景阶段筛选（快速定位）：不限阶段的场景在各筛选下均可见 */
const stageFilters = ['全部', ...SC_SCENE_STAGES];
const fStage = ref('全部');
const visibleSubs = computed(() => {
  if (!cur.value) return [];
  return cur.value.subs.filter((s) => fStage.value === '全部' || !s.conds.sceneStages.length || s.conds.sceneStages.includes(fStage.value));
});

/* 左卡阶段覆盖：聚合类型下全部细分场景的 sceneStages（售前/售中/售后），按规范序输出；无覆盖=不限 */
const groupStages = (g: FbScene) => {
  const set = new Set<string>();
  g.subs.forEach((s) => s.conds.sceneStages.forEach((st) => set.add(st)));
  return SC_SCENE_STAGES.filter((st) => set.has(st));
};

/* ---------- 配置抽屉（共享组件）：cfgScene=null 新建态（归属预填当前类型），非空=编辑态 ---------- */
const cfgOpen = ref(false);
const cfgScene = ref<FbSub | null>(null);
const openCreate = () => { cfgScene.value = null; cfgOpen.value = true; };
const openEdit = (s: FbSub) => { cfgScene.value = s; cfgOpen.value = true; };
const typeCards = ref<HTMLElement | null>(null);
const sceneCards = ref<HTMLElement | null>(null);
const openScene = async (group: FbScene, scene: FbSub) => {
  fKw.value = '';
  fStage.value = '全部';
  cur.value = group;
  await nextTick();
  typeCards.value?.querySelector('.sc2-type-card.active')?.scrollIntoView({ block: 'nearest' });
  const card = Array.from(sceneCards.value?.querySelectorAll<HTMLElement>('[data-scene-id]') ?? [])
    .find((element) => element.dataset.sceneId === scene.id);
  card?.scrollIntoView({ block: 'nearest' });
  card?.querySelector<HTMLAnchorElement>('.sc2-sc-ops .kb-link')?.focus({ preventScroll: true });
};
defineExpose({ openScene });

/* ---------- 启停 / 删除：细分场景级；系统默认兜底不可停用/删除 ---------- */
const toggleScene = (s: FbSub) => {
  if (s.system) { pushToast('系统默认兜底场景不可停用', 'warning'); return; }
  s.enabled = !s.enabled;
  pushToast(`场景「${s.name}」已${s.enabled ? '启用' : '停用'}${s.enabled ? '' : '，不再参与兜底匹配'}`);
};
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const removeScene = (s: FbSub) => {
  if (s.system) { pushToast('系统默认兜底场景不可删除', 'warning'); return; }
  askConfirm('删除细分场景', `删除场景「${s.name}」？删除后该场景不再参与兜底匹配，命中提示语将落入默认兜底`, () => {
    const g = fbScenes.find((x) => x.subs.some((y) => y.id === s.id));
    if (!g) return;
    const i = g.subs.findIndex((x) => x.id === s.id);
    if (i > -1) g.subs.splice(i, 1);
    pushToast('场景已删除');
  });
};

/* ---------- 场景类型管理：新建/编辑走共享 TypeCfgDrawer（条件定义→场景定义）；删除守卫=类型下无场景；删当前类型回落到列表首项 ---------- */
const typeCfgOpen = ref(false);
const typeCfgTarget = ref<FbScene | null>(null);
const openTypeCreate = () => { typeCfgTarget.value = null; typeCfgOpen.value = true; };
const openTypeEdit = (g: FbScene) => { typeCfgTarget.value = g; typeCfgOpen.value = true; };
const removeType = (g: FbScene) => {
  if (g.subs.length) { pushToast(`类型「${g.name}」下还有 ${g.subs.length} 个场景，请先删除或迁移`, 'warning'); return; }
  askConfirm('删除场景类型', `删除场景类型「${g.name}」？删除后不可恢复`, () => {
    const i = fbScenes.indexOf(g);
    if (i > -1) fbScenes.splice(i, 1);
    if (cur.value === g) cur.value = fbScenes[0] ?? null;
    pushToast('场景类型已删除');
  });
};
/* 左卡竖排三点菜单：编辑/删除（删除危险红） */
const typeMenu = (g: FbScene): MoreActionItem[] => [
  { label: '编辑', onClick: () => openTypeEdit(g) },
  { label: '删除', danger: true, onClick: () => removeType(g) },
];

/* ---------- Esc：确认弹窗（配置抽屉 Esc 由共享组件自管） ---------- */
const onEsc = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (confirmBox.value) confirmBox.value = null;
};
onMounted(() => window.addEventListener('keydown', onEsc));
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc));
</script>

<template>
  <div class="sc2-wrap">
    <header class="kb-main-head sc2-head">
      <div>
        <h2>场景配置</h2>
        <p class="kb-breadcrumb">知识库<span> / 场景配置</span></p>
      </div>
    </header>

    <div class="sc2-body">
      <!-- 左栏：场景类型卡（名称+场景数+细分场景快捷 chips；类型级编辑/删除收卡头竖排三点） -->
      <aside class="sc2-rail">
        <div class="sc2-rail-head">
          <input v-model="fKw" class="kb-input" placeholder="搜索场景类型 / 创建人">
          <button class="sc2-add-type" type="button" title="新建类型" aria-label="新建类型" @click="openTypeCreate">＋</button>
        </div>
        <div ref="typeCards" class="sc2-rail-list">
          <div
            v-for="g in visibleTypes" :key="g.id"
            class="sc2-type-card" :class="{ active: cur?.id === g.id }"
            @click="cur = g"
          >
            <div class="sc2-tc-head">
              <b :title="g.name">{{ g.name }}</b>
              <span class="sc2-tc-count">{{ g.subs.length }} 场景</span>
              <MoreActions dot vertical :items="typeMenu(g)" />
            </div>
            <p v-if="g.semDef" class="sc2-tc-def" :title="g.semDef">{{ g.semDef }}</p>
            <div class="sc2-tc-chips">
              <em v-for="st in groupStages(g)" :key="st" class="sc2-stage" :class="st">{{ st }}</em>
              <span v-if="g.subs.length && !groupStages(g).length" class="sc2-stage 不限">不限</span>
              <span v-if="!g.subs.length" class="sc2-tc-empty">暂无场景</span>
            </div>
          </div>
          <div v-if="!visibleTypes.length" class="kb-empty">无匹配场景类型</div>
        </div>
      </aside>

      <!-- 右栏：所选类型下的场景卡（问法盒+回复摘要+处置元信息） -->
      <main class="sc2-main">
        <template v-if="cur">
          <div class="sc2-main-head">
            <div>
              <b>{{ cur.name }}</b>
              <span class="s">{{ cur.creator }} · 创建于 {{ cur.createdAt }} · 共 {{ cur.subs.length }} 个场景</span>
            </div>
            <button class="kb-btn primary" type="button" @click="openCreate">新建场景</button>
          </div>
          <!-- 类型定义带：命中链路回显（条件定义把关 → 场景定义语义命中 → 下挂细分场景） -->
          <div class="sc-def-band">
            <span class="sc-def-item"><b>条件定义</b><em>{{ typeCondText(cur) }}</em></span>
            <span class="sc-def-item"><b>场景定义</b><em>{{ cur.semDef || '未设置' }}</em></span>
          </div>
          <!-- 场景阶段筛选：按售前/售中/售后快速定位场景 -->
          <div class="sc2-filter">
            <span>场景阶段</span>
            <button
              v-for="f in stageFilters" :key="f" type="button"
              class="sc2-fchip" :class="{ active: fStage === f }"
              @click="fStage = f"
            >{{ f }}</button>
          </div>
          <div ref="sceneCards" class="sc2-cards">
            <section
              v-for="s in visibleSubs" :key="s.id" :data-scene-id="s.id"
              class="sc2-sub-card" :class="{ off: !s.enabled }"
            >
              <div class="sc2-sc-head">
                <b :title="s.name">{{ s.name }}</b>
                <span v-if="s.system" class="sc2-sys">系统默认兜底</span>
                <span class="sc-switch" :class="{ on: s.enabled }" :title="s.enabled ? '停用' : '启用'" @click="toggleScene(s)"><i /></span>
                <span class="sc2-sc-ops">
                  <a class="kb-link" href="#" @click.prevent="openEdit(s)">编辑</a>
                  <a v-if="!s.system" class="kb-link danger" href="#" @click.prevent="removeScene(s)">删除</a>
                </span>
              </div>
              <div class="sc2-sc-qa">
                <span class="sc2-sc-qa-label">用户问法</span>
                <div class="sc2-sc-qa-tags">
                  <em v-for="q in s.questions" :key="q">{{ q }}</em>
                </div>
              </div>
              <div class="sc2-sc-meta">
                <em v-for="st in s.conds.sceneStages" :key="st" class="sc2-stage" :class="st" :title="`场景阶段：${st}`">{{ st }}</em>
                <span class="sc2-act">{{ s.act }}</span>
                <i>命中 {{ s.hits }}</i>
                <i>引用 {{ s.refs }}</i>
              </div>
            </section>
            <div v-if="!visibleSubs.length" class="kb-empty">{{ cur.subs.length ? '该阶段下暂无匹配场景' : '该类型下暂无场景，点右上「新建场景」创建' }}</div>
          </div>
        </template>
        <div v-else class="kb-empty">请在左侧选择场景类型</div>
      </main>
    </div>

    <!-- 场景类型新建/编辑抽屉：共享组件（条件定义→场景定义） -->
    <TypeCfgDrawer :open="typeCfgOpen" :target="typeCfgTarget" @close="typeCfgOpen = false" />

    <!-- 配置抽屉：共享组件（纵向配置流，新建/编辑同构） -->
    <SceneCfgDrawer :open="cfgOpen" :scene="cfgScene" :default-type="cur?.name ?? ''" @close="cfgOpen = false" />

    <!-- 二次确认弹窗（删除等不可逆操作） -->
    <template v-if="confirmBox">
      <div class="kb-modal-mask" @click="confirmBox = null">
        <div class="kb-modal sc-confirm" @click.stop>
          <div class="kb-modal-head">
            <b>{{ confirmBox.title }}</b>
            <button class="kb-x" title="关闭" @click="confirmBox = null">✕</button>
          </div>
          <div class="sc-confirm-body">{{ confirmBox.message }}</div>
          <div class="kb-modal-foot">
            <button class="kb-btn" @click="confirmBox = null">取消</button>
            <button class="kb-btn primary" @click="confirmBox.onOk(); confirmBox = null">确认</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
