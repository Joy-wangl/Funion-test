<script setup lang="ts">
/* 配置抽屉（场景配置 V1/V2 共享）：纵向配置流——归属（类型+细分名）→①触发条件（场景阶段单块：三行阶段，每行=阶段三态勾选+该段订单状态叶子直选）
 * →②客户问法（提示语多条+关键词）→③命中后处置（处置方式+AI 提示语；回复内容不前置配置，由处置决定输出）
 * props：open=显隐；scene=编辑目标（null=新建态）；defaultType=新建态默认归属类型
 * 保存直接落 sceneConfigData 种子（与列表同源），校验拦截口径与 V1 原抽屉一致；Esc/暗幕关闭 emit close */
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  FB_ACTS, SC_SCENE_STAGES, SC_SCENE_STAGE_STATES,
  CUR_USER, todayStr, defaultConds, defaultTypeDef, fbScenes,
  type FbAct, type FbSub, type ScConditions,
} from './sceneConfigData';
import './KbForm.css';
import './SceneCfgDrawer.css';

const props = defineProps<{ open: boolean; scene: FbSub | null; defaultType: string }>();
const emit = defineEmits<{ (e: 'close'): void }>();

/* ---------- 标签编辑器工厂（提示语/关键词共用）：回车或逗号添加、✕移除、空值退格删末项、自动去重去空 ---------- */
const makeTags = () => {
  const state = reactive({ tags: [] as string[], draft: '' });
  const add = () => {
    const v = state.draft.trim().replace(/[,，]+$/, '');
    if (v && !state.tags.includes(v)) state.tags.push(v);
    state.draft = '';
  };
  const remove = (t: string) => { state.tags = state.tags.filter((x) => x !== t); };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !state.draft && state.tags.length) { state.tags.pop(); }
  };
  const set = (list: string[]) => { state.tags = [...list]; state.draft = ''; };
  const rename = (old: string, v: string) => {
    if (!v || v === old || state.tags.includes(v)) return;
    state.tags = state.tags.map((x) => (x === old ? v : x));
  };
  return { state, add, remove, onKey, set, rename };
};
const qTags = makeTags();
const kwTags = makeTags();
/* 提示语：新增输入默认隐藏，点「新增」后展示并聚焦（回车落入并收起、Shift+回车换行）；已有提示语铅笔 icon 行内编辑 */
const qAdding = ref(false);
const qAddRef = ref<HTMLTextAreaElement | null>(null);
const startQAdd = () => { qAdding.value = true; nextTick(() => qAddRef.value?.focus()); };
const endQAdd = (commit: boolean) => {
  if (commit) qTags.add();
  qTags.state.draft = '';
  qAdding.value = false;
};
const qEditKey = ref('');
const qEditDraft = ref('');
const qEditRef = ref<HTMLTextAreaElement | null>(null);
const startQEdit = (t: string) => { qEditKey.value = t; qEditDraft.value = t; nextTick(() => qEditRef.value?.focus()); };
const endQEdit = (commit: boolean) => {
  const old = qEditKey.value;
  if (!old) return;
  qEditKey.value = '';
  if (commit) qTags.rename(old, qEditDraft.value.trim());
};
/* 关键词：场景标签式（灰标签+✕移除），＋虚线标签内联输入新增（回车/逗号确认） */
const kwCreating = ref(false);
const kwInputRef = ref<HTMLInputElement | null>(null);
const startKwCreate = () => { kwCreating.value = true; kwTags.state.draft = ''; nextTick(() => kwInputRef.value?.focus()); };
const endKwCreate = () => { if (kwTags.state.draft.trim()) kwTags.add(); kwCreating.value = false; };

/* ---------- 表单态：scene 非空=编辑态（回填），空=新建态（清空+归属预填 defaultType） ---------- */
const editingKey = ref<{ groupId: string; subId: string } | null>(null);
const dType = ref('');
const dName = ref('');
const dAct = ref<FbAct>('智能回复');
/* AI 回复提示语：处置为智能回复时必填，引导 AI 如何生成回复 */
const dAiPrompt = ref('');
const dConds = reactive<ScConditions>(defaultConds());
/* 场景阶段单块（用户 2026-09-19 合并）：一段一行=阶段三态勾选（整段叶子全选/全清，部分=半选）+该段订单状态叶子常显直选；
 * 多选值只存叶子（orderStates），sceneStages 由叶子派生（syncStages），空=不限 */
const stageLeaves = (st: string) => SC_SCENE_STAGE_STATES[st] ?? [];
const stageSelCount = (st: string) => stageLeaves(st).filter((c) => dConds.orderStates.includes(c)).length;
const stageCls = (st: string) => {
  const n = stageSelCount(st);
  const all = stageLeaves(st).length;
  return { on: all > 0 && n === all, mid: n > 0 && n < all };
};
const syncStages = () => { dConds.sceneStages = SC_SCENE_STAGES.filter((st) => stageSelCount(st) > 0); };
const toggleStage = (st: string) => {
  const ls = stageLeaves(st);
  dConds.orderStates = stageSelCount(st) === ls.length
    ? dConds.orderStates.filter((v) => !ls.includes(v))
    : [...new Set([...dConds.orderStates, ...ls])];
  syncStages();
};
const toggleLeaf = (lv: string) => {
  const i = dConds.orderStates.indexOf(lv);
  if (i > -1) dConds.orderStates.splice(i, 1);
  else dConds.orderStates.push(lv);
  syncStages();
};
/* 场景类型选项：刚输入的新类型尚未落库时并入，避免触发器灰显 */
const groupNames = computed(() => fbScenes.map((g) => g.name));
const dTypeOptions = computed(() => (dType.value && !groupNames.value.includes(dType.value) ? [...groupNames.value, dType.value] : groupNames.value));

watch(() => props.open, (v) => {
  if (!v) return;
  const s = props.scene;
  const g = s ? fbScenes.find((x) => x.subs.some((y) => y.id === s.id)) : null;
  editingKey.value = g && s ? { groupId: g.id, subId: s.id } : null;
  dType.value = g?.name ?? props.defaultType ?? fbScenes[0]?.name ?? '';
  dName.value = s?.name ?? '';
  dAct.value = s?.act ?? '智能回复';
  dAiPrompt.value = s?.aiPrompt ?? '';
  qTags.set(s?.questions ?? []);
  kwTags.set(s?.kws ?? []);
  if (s) Object.assign(dConds, { ...s.conds, sceneStages: [...s.conds.sceneStages], orderStates: [...s.conds.orderStates], autoSend: [...s.conds.autoSend] });
  else Object.assign(dConds, defaultConds());
  /* 旧数据物化：仅勾阶段无叶子=整段生效→补全该段叶子；阶段统一由叶子派生 */
  for (const st of [...dConds.sceneStages]) if (stageSelCount(st) === 0) dConds.orderStates.push(...stageLeaves(st));
  syncStages();
  qAdding.value = false; qEditKey.value = ''; kwCreating.value = false;
});

const submitScene = () => {
  const typeName = dType.value.trim();
  if (!typeName) { pushToast('请选择或填写场景类型', 'warning'); return; }
  const name = dName.value.trim();
  if (!name) { pushToast('请填写场景名称', 'warning'); return; }
  if (!qTags.state.tags.length) { pushToast('请添加提示语', 'warning'); return; }
  const aiPrompt = dAiPrompt.value.trim();
  if (dAct.value === '智能回复' && !aiPrompt) { pushToast('请填写 AI 回复提示语', 'warning'); return; }
  const conds = { ...dConds, sceneStages: [...dConds.sceneStages], orderStates: [...dConds.orderStates], autoSend: [...dConds.autoSend] };
  /* 新建态：落到目标场景类型（不存在则新建类型） */
  if (!editingKey.value) {
    if (fbScenes.some((x) => x.subs.some((y) => y.name === name))) { pushToast(`场景「${name}」已存在`, 'warning'); return; }
    let g = fbScenes.find((x) => x.name === typeName);
    if (!g) { g = { id: `FS${Date.now()}`, name: typeName, condDef: defaultTypeDef(), semDef: '', questions: [], creator: CUR_USER, createdAt: todayStr(), subs: [] }; fbScenes.push(g); }
    g.subs.push({ id: `FB${Date.now()}`, name, questions: [...qTags.state.tags], kws: [...kwTags.state.tags], conds, act: dAct.value, aiPrompt, hits: 0, enabled: true, creator: CUR_USER, createdAt: todayStr(), refs: 0 });
    pushToast(`场景「${name}」已新建`);
    emit('close');
    return;
  }
  const srcG = fbScenes.find((x) => x.id === editingKey.value?.groupId);
  const s = srcG?.subs.find((x) => x.id === editingKey.value?.subId);
  if (!srcG || !s) return;
  if (fbScenes.some((x) => x.subs.some((y) => y.id !== s.id && y.name === name))) { pushToast(`场景「${name}」已存在`, 'warning'); return; }
  Object.assign(s, {
    name,
    questions: [...qTags.state.tags],
    kws: [...kwTags.state.tags],
    conds,
    act: dAct.value,
    aiPrompt,
  });
  /* 大场景变更：迁移到目标大场景（不存在则新建） */
  if (typeName !== srcG.name) {
    let g = fbScenes.find((x) => x.name === typeName);
    if (!g) { g = { id: `FS${Date.now()}`, name: typeName, condDef: defaultTypeDef(), semDef: '', questions: [], creator: CUR_USER, createdAt: todayStr(), subs: [] }; fbScenes.push(g); }
    srcG.subs.splice(srcG.subs.indexOf(s), 1);
    g.subs.push(s);
    editingKey.value = { groupId: g.id, subId: s.id };
  }
  pushToast(`场景「${name}」已更新`);
  emit('close');
};

/* Esc 关闭抽屉（与宿主页 Esc 链各管各层） */
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && props.open) emit('close'); };
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <template v-if="open">
    <div class="kb-mask" @click="emit('close')"></div>
    <aside class="kb-drawer sc-drawer">
      <div class="sc-d-head">
        <b>{{ scene ? '配置场景' : '新建场景' }}</b>
        <button class="kb-x" title="关闭" @click="emit('close')">✕</button>
      </div>
      <div class="sc-cfg-body">
          <!-- 归属：场景类型（可换/可新建）+ 细分场景名称，每行一个 -->
          <div class="sc-base-grid">
            <div class="sc-cg">
              <div class="sc-sec-head"><span>场景类型<i class="sc-req">*</i></span></div>
              <BubbleSelect
                class-name="kb-select"
                creatable
                :options="dTypeOptions"
                :value="dType"
                @change="(v: string) => (dType = v)"
              />
            </div>
            <div class="sc-cg">
              <div class="sc-sec-head"><span>细分场景名称<i class="sc-req">*</i></span></div>
              <input v-model="dName" class="kb-input" placeholder="如：物流到哪里了">
            </div>
          </div>

          <!-- ① 先配触发条件：场景阶段单块（一段一行=阶段勾选+该段订单状态叶子直选，空=不限） -->
          <div class="sc-block">
            <div class="sc-block-head"><i>1</i><b>触发条件</b></div>
            <div class="sc-cfg-conds">
              <div v-for="st in SC_SCENE_STAGES" :key="st" class="sc-ck-line">
                <label
                  class="sc-ck" :class="stageCls(st)"
                  :title="`勾选=整个${st}阶段（含其全部订单状态）`"
                  @click.prevent="toggleStage(st)"
                ><i></i><span>{{ st }}</span></label>
                <div class="sc-ck-row">
                  <label
                    v-for="lv in stageLeaves(st)" :key="lv"
                    class="sc-ck sm" :class="{ on: dConds.orderStates.includes(lv) }"
                    @click.prevent="toggleLeaf(lv)"
                  ><i></i><span :title="lv">{{ lv }}</span></label>
                </div>
              </div>
            </div>
          </div>

          <!-- ② 再配客户问法：提示语（多条归一）在上 + 关键词（精确辅助）在下，每行一个 -->
          <div class="sc-block">
            <div class="sc-block-head"><i>2</i><b>客户问法</b></div>
            <div class="sc-qa-grid">
              <div class="sc-cg">
                <div class="sc-sec-head"><span>提示语<i class="sc-req">*</i></span></div>
                <div class="qa-simlist">
                  <div v-for="s in qTags.state.tags" :key="s" class="qa-simrow">
                    <textarea
                      v-if="qEditKey === s" :ref="(el) => { qEditRef = el as HTMLTextAreaElement | null; }"
                      v-model="qEditDraft" class="qa-simbox edit" rows="2"
                      @keydown.enter.exact.prevent="endQEdit(true)" @keydown.esc="endQEdit(false)" @blur="endQEdit(true)"
                    />
                    <span v-else class="qa-simbox">{{ s }}</span>
                    <template v-if="qEditKey !== s">
                      <button class="kb-row-edit" title="修改" type="button" @click="startQEdit(s)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                      </button>
                      <button class="kb-row-del" title="删除" type="button" @click="qTags.remove(s)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
                      </button>
                    </template>
                  </div>
                  <textarea
                    v-if="qAdding" :ref="(el) => { qAddRef = el as HTMLTextAreaElement | null; }" v-model="qTags.state.draft" class="qa-textarea" rows="2" placeholder="输入提示语，回车添加，Shift+回车换行"
                    @keydown.enter.exact.prevent="endQAdd(true)" @keydown.esc="endQAdd(false)" @blur="endQAdd(true)"
                  />
                  <button v-if="!qAdding" class="kb-btn" type="button" @click="startQAdd">新增</button>
                </div>
              </div>
              <div class="sc-cg">
                <div class="sc-sec-head"><span>关键词</span></div>
                <div class="qa-kwtags">
                  <em v-for="s in kwTags.state.tags" :key="s" class="kb-scene-tag">
                    {{ s }}<i title="移除" @click="kwTags.remove(s)">✕</i>
                  </em>
                  <input
                    v-if="kwCreating"
                    :ref="(el) => { kwInputRef = el as HTMLInputElement | null; }"
                    v-model="kwTags.state.draft" class="kb-scene-create" placeholder="输入后回车或逗号添加"
                    @keydown="kwTags.onKey"
                    @keyup.esc="kwCreating = false"
                    @blur="endKwCreate"
                  >
                  <button v-else type="button" class="kb-scene-tag add" title="新增关键词" @click="startKwCreate">＋</button>
                </div>
              </div>
            </div>
          </div>

          <!-- ③ 命中后处置：处置方式 + AI 回复提示语（智能回复必填）；回复内容不前置配置 -->
          <div class="sc-block">
            <div class="sc-block-head"><i>3</i><b>命中后处置</b></div>
            <div class="sc-act-pick">
              <button
                v-for="a in FB_ACTS"
                :key="a"
                type="button"
                :class="{ active: dAct === a }"
                @click="dAct = a"
              >{{ a }}</button>
            </div>
            <!-- 智能回复：引导 AI 如何生成回复的提示语（必填） -->
            <template v-if="dAct === '智能回复'">
              <div class="sc-sec-head"><span>AI 回复提示语<i class="sc-req">*</i></span></div>
              <textarea v-model="dAiPrompt" class="qa-textarea sc-ai-prompt" rows="3" maxlength="500" placeholder="如：先安抚等件情绪，再告知订单页查询路径，承诺长时间未更新可代催" />
            </template>
          </div>
        </div>
      <div class="sc-d-foot">
        <button class="kb-btn" @click="emit('close')">取消</button>
        <button class="kb-btn primary" @click="submitScene">保存</button>
      </div>
    </aside>
  </template>
</template>
