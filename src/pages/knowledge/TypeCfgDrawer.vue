<script setup lang="ts">
/* 场景类型配置抽屉（V1/V2 共享）：命中链路的类型级配置流——类型名称 → ①条件定义
 * （场景阶段单块：三行阶段，每行=阶段三态勾选+该段订单状态叶子直选，类型级粗闸门，空=不限）
 * → ②用户问法（类型级代表问法，编辑器口径与配置抽屉提示语一致）→ ③场景定义（语义定义：告知 AI 符合何等语义时命中本类型）
 * 保存直接落 sceneConfigData 种子（与列表同源）；校验=名称必填去重 + 场景定义必填；Esc/暗幕关闭 emit close */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { pushToast } from '../../components/toast';
import {
  SC_SCENE_STAGES, SC_SCENE_STAGE_STATES, CUR_USER, todayStr, fbScenes, type FbScene,
} from './sceneConfigData';
import './KbForm.css';
import './SceneCfgDrawer.css';

const props = defineProps<{ open: boolean; target: FbScene | null }>();
const emit = defineEmits<{ (e: 'close'): void }>();

/* 表单态：target 非空=编辑态（回填），空=新建态（清空） */
const dName = ref('');
const dStages = ref<string[]>([]);
const dStates = ref<string[]>([]);
const dQs = ref<string[]>([]);
const dSem = ref('');

/* 场景阶段单块（用户 2026-09-19 合并，与配置抽屉同构）：一段一行=阶段三态勾选+该段订单状态叶子常显直选；
 * 多选值只存叶子（dStates），dStages 由叶子派生（syncStages），空=不限 */
const stageLeaves = (st: string) => SC_SCENE_STAGE_STATES[st] ?? [];
const stageSelCount = (st: string) => stageLeaves(st).filter((c) => dStates.value.includes(c)).length;
const stageCls = (st: string) => {
  const n = stageSelCount(st);
  const all = stageLeaves(st).length;
  return { on: all > 0 && n === all, mid: n > 0 && n < all };
};
const syncStages = () => { dStages.value = SC_SCENE_STAGES.filter((st) => stageSelCount(st) > 0); };
const toggleStage = (st: string) => {
  const ls = stageLeaves(st);
  dStates.value = stageSelCount(st) === ls.length
    ? dStates.value.filter((v) => !ls.includes(v))
    : [...new Set([...dStates.value, ...ls])];
  syncStages();
};
const toggleLeaf = (lv: string) => {
  const i = dStates.value.indexOf(lv);
  if (i > -1) dStates.value.splice(i, 1);
  else dStates.value.push(lv);
  syncStages();
};
/* 用户问法编辑器（与配置抽屉提示语一致）：回车添加、Shift+回车换行、铅笔行内编辑、✕移除 */
const qDraft = ref('');
const qAdding = ref(false);
const qAddRef = ref<HTMLTextAreaElement | null>(null);
const startQAdd = () => { qAdding.value = true; nextTick(() => qAddRef.value?.focus()); };
const endQAdd = (commit: boolean) => {
  if (commit) {
    const v = qDraft.value.trim();
    if (v && !dQs.value.includes(v)) dQs.value.push(v);
  }
  qDraft.value = '';
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
  const v = qEditDraft.value.trim();
  if (commit && v && v !== old && !dQs.value.includes(v)) dQs.value = dQs.value.map((x) => (x === old ? v : x));
};

watch(() => props.open, (v) => {
  if (!v) return;
  const t = props.target;
  dName.value = t?.name ?? '';
  dStages.value = [...(t?.condDef.stages ?? [])];
  dStates.value = [...(t?.condDef.states ?? [])];
  dQs.value = [...(t?.questions ?? [])];
  dSem.value = t?.semDef ?? '';
  qDraft.value = ''; qAdding.value = false; qEditKey.value = '';
  /* 旧数据物化：仅勾阶段无叶子=整段生效→补全该段叶子；阶段统一由叶子派生 */
  for (const st of [...dStages.value]) if (stageSelCount(st) === 0) dStates.value.push(...stageLeaves(st));
  syncStages();
});

const submitType = () => {
  const name = dName.value.trim();
  if (!name) { pushToast('请填写场景类型名称', 'warning'); return; }
  const sem = dSem.value.trim();
  if (!sem) { pushToast('请填写场景定义，告知 AI 命中语义', 'warning'); return; }
  if (fbScenes.some((x) => x !== props.target && x.name === name)) { pushToast(`场景类型「${name}」已存在`, 'warning'); return; }
  const condDef = { stages: [...dStages.value], states: [...dStates.value] };
  const questions = [...dQs.value];
  if (props.target) {
    Object.assign(props.target, { name, condDef, semDef: sem, questions });
    pushToast(`场景类型「${name}」已更新`);
  } else {
    fbScenes.push({ id: `FS${Date.now()}`, name, condDef, semDef: sem, questions, creator: CUR_USER, createdAt: todayStr(), subs: [] });
    pushToast(`场景类型「${name}」已新建`);
  }
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
        <b>{{ target ? '编辑场景类型' : '新建场景类型' }}</b>
        <button class="kb-x" title="关闭" @click="emit('close')">✕</button>
      </div>
      <div class="sc-cfg-body">
        <!-- 类型名称：基本标识 -->
        <div class="sc-cg">
          <div class="sc-sec-head"><span>场景类型名称<i class="sc-req">*</i></span></div>
          <input v-model="dName" class="kb-input" placeholder="如：物流信息咨询">
        </div>

        <!-- ① 先配条件定义：场景阶段单块（一段一行=阶段勾选+该段订单状态叶子直选，类型级粗闸门，空=不限） -->
        <div class="sc-block">
          <div class="sc-block-head"><i>1</i><b>条件定义</b></div>
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
                  class="sc-ck sm" :class="{ on: dStates.includes(lv) }"
                  @click.prevent="toggleLeaf(lv)"
                ><i></i><span :title="lv">{{ lv }}</span></label>
              </div>
            </div>
          </div>
        </div>

        <!-- ② 再配用户问法：类型级代表问法，行式编辑器与配置抽屉提示语一致 -->
        <div class="sc-block">
          <div class="sc-block-head"><i>2</i><b>用户问法</b></div>
          <div class="qa-simlist">
            <div v-for="s in dQs" :key="s" class="qa-simrow">
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
                <button class="kb-row-del" title="删除" type="button" @click="dQs.splice(dQs.indexOf(s), 1)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
                </button>
              </template>
            </div>
            <textarea
              v-if="qAdding" :ref="(el) => { qAddRef = el as HTMLTextAreaElement | null; }" v-model="qDraft" class="qa-textarea" rows="2" placeholder="输入用户问法，回车添加，Shift+回车换行"
              @keydown.enter.exact.prevent="endQAdd(true)" @keydown.esc="endQAdd(false)" @blur="endQAdd(true)"
            />
            <button v-if="!qAdding" class="kb-btn" type="button" @click="startQAdd">新增</button>
          </div>
        </div>

        <!-- ③ 再配场景定义：语义定义，通过条件定义后 AI 按此语义命中本类型 -->
        <div class="sc-block">
          <div class="sc-block-head"><i>3</i><b>场景定义</b></div>
          <textarea
            v-model="dSem" class="qa-textarea" rows="3" maxlength="200"
            placeholder="如：客户询问物流进度、配送时效、快递承运等物流履约类问题，AI 按此语义判定命中该类型"
          />
        </div>
      </div>
      <div class="sc-d-foot">
        <button class="kb-btn" @click="emit('close')">取消</button>
        <button class="kb-btn primary" @click="submitType">保存</button>
      </div>
    </aside>
  </template>
</template>
