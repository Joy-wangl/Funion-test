<script setup lang="ts">
/* QA 管理：标准问答对（Q→A）优先匹配层，供智能回复场景使用
 * 两个子页：问答库（核心资产，含原行业模板并入内容）/ 会话挖掘（接待问题闭环）
 * 新建/编辑走右置抽屉；状态在列表以开关切换；仅「启用中」进入匹配池
 * 命中场景复用知识库两级模型；答案素材复用 KbMaterial
 */
import { computed, nextTick, reactive, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import CascadeSelect from '../../components/CascadeSelect.vue';
import { pushToast } from '../../components/toast';
import { KB_SCENE_GROUPS, type KbMaterial } from './data';
import {
  QA_STATUS_META,
  qaCandidates, qaEntries,
  type QaCandidate, type QaEntry,
} from './qaData';
import './QaManage.css';

/* ---------- 子页切换：问答库 / 会话挖掘 ---------- */
type QaTab = 'lib' | 'mining';
const tab = ref<QaTab>('lib');

/* ---------- 问答库筛选：全部草稿、「查询」统一生效 ---------- */
const kw = ref('');
const sceneSel = ref<string[]>([]);
const statusSel = ref('');
const applied = ref<{ kw: string; scene: string[]; status: string }>({ kw: '', scene: [], status: '' });
/* 命中场景两级模型（筛选与抽屉共用）：级联下拉多选；自建场景并入所建组行尾，不单设自定义组 */
const sceneGroups = ref(KB_SCENE_GROUPS.map((g) => ({ group: g.group, scenes: [...g.scenes] })));
const cascGroups = computed(() => sceneGroups.value.map((g) => ({ name: g.group, children: g.scenes })));
const doQuery = () => {
  applied.value = { kw: kw.value.trim(), scene: [...sceneSel.value], status: statusSel.value };
};
const resetFilter = () => {
  kw.value = ''; sceneSel.value = []; statusSel.value = '';
  applied.value = { kw: '', scene: [], status: '' };
};
/* 多选值即细分场景集合（组全选在组件内已展开为叶子），按交集匹配 */
const sceneFilterSet = computed(() => new Set(applied.value.scene));
const filtered = computed(() => qaEntries.filter((q) => {
  const a = applied.value;
  if (a.kw) {
    const hay = `${q.question} ${q.answer} ${q.similars.join(' ')} ${q.keywords.join(' ')}`.toLowerCase();
    if (!hay.includes(a.kw.toLowerCase())) return false;
  }
  if (sceneFilterSet.value.size && !q.scenes.some((s) => sceneFilterSet.value.has(s))) return false;
  if (a.status && QA_STATUS_META[q.status].label !== a.status) return false;
  return true;
}));

/* ---------- 标签编辑器工厂（相似问法/关键词共用）：回车或逗号添加、✕移除、空值退格删末项、自动去重去空 ---------- */
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
  const set = (list: string[]) => { state.tags = [...list]; state.draft = '' };
  const rename = (old: string, v: string) => {
    if (!v || v === old || state.tags.includes(v)) return;
    state.tags = state.tags.map((x) => (x === old ? v : x));
  };
  return { state, add, remove, onKey, set, rename };
};
const simTags = makeTags();
const kwTags = makeTags();
/* 相似问法：新增输入默认隐藏，点「新增」后展示并聚焦（回车落入并收起、Shift+回车换行）；已有问法铅笔 icon 行内编辑 */
const simAdding = ref(false);
const simAddRef = ref<HTMLTextAreaElement | null>(null);
const startSimAdd = () => { simAdding.value = true; nextTick(() => simAddRef.value?.focus()); };
const endSimAdd = (commit: boolean) => {
  if (commit) simTags.add();
  simTags.state.draft = '';
  simAdding.value = false;
};
const simEditKey = ref('');
const simEditDraft = ref('');
const simEditRef = ref<HTMLTextAreaElement | null>(null);
const startSimEdit = (t: string) => { simEditKey.value = t; simEditDraft.value = t; nextTick(() => simEditRef.value?.focus()); };
const endSimEdit = (commit: boolean) => {
  const old = simEditKey.value;
  if (!old) return;
  simEditKey.value = '';
  if (commit) simTags.rename(old, simEditDraft.value.trim());
};

/* ---------- 新建/编辑抽屉 ---------- */
const drawerOpen = ref(false);
const editId = ref('');
/* 转 QA 时记录的候选 id：保存后从挖掘列表移除 */
const fromCandidate = ref('');
const fQuestion = ref('');
const fScenes = ref<string[]>([]);
const fAnswer = ref('');
const fMaterials = ref<KbMaterial[]>([]);
const qErr = ref(false);
const aErr = ref(false);

const onPickFiles = (e: Event) => {
  const input = e.target as HTMLInputElement;
  for (const file of Array.from(input.files ?? [])) {
    fMaterials.value.push({ name: file.name, url: URL.createObjectURL(file), kind: 'image' });
  }
  input.value = '';
};
const openCreate = () => {
  editId.value = ''; fromCandidate.value = '';
  fQuestion.value = ''; simTags.set([]); kwTags.set([]);
  simAdding.value = false; simEditKey.value = '';
  fScenes.value = []; fAnswer.value = ''; fMaterials.value = [];
  qErr.value = false; aErr.value = false;
  drawerOpen.value = true;
};
/* 会话挖掘转 QA：预填客户原声与场景 */
const openFromCandidate = (c: QaCandidate) => {
  openCreate();
  fromCandidate.value = c.id;
  fQuestion.value = c.question;
  fScenes.value = c.scene ? [c.scene] : [];
};
const openEdit = (q: QaEntry) => {
  editId.value = q.id; fromCandidate.value = '';
  fQuestion.value = q.question; simTags.set(q.similars); kwTags.set(q.keywords);
  simAdding.value = false; simEditKey.value = '';
  fScenes.value = [...q.scenes]; fAnswer.value = q.answer; fMaterials.value = [...q.materials];
  qErr.value = false; aErr.value = false;
  drawerOpen.value = true;
};
const saveQa = () => {
  qErr.value = !fQuestion.value.trim();
  aErr.value = !fAnswer.value.trim();
  if (qErr.value || aErr.value) return;
  if (editId.value) {
    const q = qaEntries.find((x) => x.id === editId.value);
    if (q) {
      Object.assign(q, {
        question: fQuestion.value.trim(), similars: [...simTags.state.tags], keywords: [...kwTags.state.tags],
        scenes: [...fScenes.value],
        answer: fAnswer.value.trim(), materials: [...fMaterials.value],
        updatedAt: '2026-09-07 10:00',
      });
    }
    pushToast('问答已保存');
  } else {
    qaEntries.unshift({
      id: `QA${Date.now()}`, question: fQuestion.value.trim(), similars: [...simTags.state.tags],
      keywords: [...kwTags.state.tags], scenes: [...fScenes.value],
      answer: fAnswer.value.trim(), materials: [...fMaterials.value], link: '',
      status: 'enabled', source: fromCandidate.value ? 'mining' : 'manual',
      hits: 0, adoptRate: '-', updatedAt: '2026-09-07 10:00',
    });
    pushToast('问答已新建并进入匹配池');
  }
  if (fromCandidate.value) {
    const i = qaCandidates.findIndex((c) => c.id === fromCandidate.value);
    if (i > -1) qaCandidates.splice(i, 1);
  }
  drawerOpen.value = false;
};

/* ---------- 列表状态开关 / 删除（二次确认） ---------- */
const toggleStatus = (q: QaEntry) => {
  q.status = q.status === 'enabled' ? 'disabled' : 'enabled';
  pushToast(q.status === 'enabled' ? `问答「${q.question}」已启用` : `问答「${q.question}」已停用`);
};
const confirmBox = ref<{ title: string; message: string; onOk: () => void } | null>(null);
const askConfirm = (title: string, message: string, onOk: () => void) => { confirmBox.value = { title, message, onOk }; };
const doConfirm = () => { confirmBox.value?.onOk(); confirmBox.value = null; };
const deleteQa = (q: QaEntry) => {
  askConfirm('删除问答', `删除问答「${q.question}」？删除后智能回复将不再命中该条`, () => {
    const i = qaEntries.findIndex((x) => x.id === q.id);
    if (i > -1) qaEntries.splice(i, 1);
    pushToast('问答已删除');
  });
};

/* ---------- 关键词：场景标签式（灰标签+✕移除），＋虚线标签内联输入新增 ---------- */
const kwCreating = ref(false);
const kwInputRef = ref<HTMLInputElement | null>(null);
const startKwCreate = () => { kwCreating.value = true; kwTags.state.draft = ''; nextTick(() => kwInputRef.value?.focus()); };
/* 收拢内联输入：有草稿先落入标签再关闭（点击空白不丢输入） */
const endKwCreate = () => { if (kwTags.state.draft.trim()) kwTags.add(); kwCreating.value = false; };

/* ---------- 会话挖掘 ---------- */
const ignoreCandidate = (c: QaCandidate) => {
  const i = qaCandidates.findIndex((x) => x.id === c.id);
  if (i > -1) qaCandidates.splice(i, 1);
  pushToast('已忽略该候选问题');
};

</script>

<template>
  <div class="qa-wrap">
    <!-- 子页切换：问答库 / 会话挖掘 -->
    <div class="qa-tabs">
      <button :class="{ on: tab === 'lib' }" @click="tab = 'lib'">问答库</button>
      <button :class="{ on: tab === 'mining' }" @click="tab = 'mining'">
        会话挖掘<span v-if="qaCandidates.length" class="qa-tabs-badge">{{ qaCandidates.length }}</span>
      </button>
    </div>

    <!-- ============ 问答库 ============ -->
    <div v-if="tab === 'lib'" class="kb-panel">
      <div class="kb-query qa-query">
        <div class="kb-field">
          <label>关键词</label>
          <input v-model="kw" class="kb-input" placeholder="问题/答案/相似问法/关键词" @keyup.enter="doQuery">
        </div>
        <div class="kb-field">
          <label>命中场景</label>
          <CascadeSelect
            class-name="kb-select" :groups="cascGroups" multiple :values="sceneSel" searchable
            @multi-change="(v: string[]) => (sceneSel = v)"
          />
        </div>
        <div class="kb-field">
          <label>状态</label>
          <BubbleSelect class-name="kb-select" :options="['启用中', '已停用']" :value="statusSel || '全部'" @change="(v: string) => (statusSel = v === '全部' ? '' : v)" />
        </div>
        <div class="kb-query-actions">
          <button class="kb-btn" @click="resetFilter">重置</button>
          <button class="kb-btn primary" @click="doQuery">查询</button>
        </div>
        <button class="kb-btn primary qa-create" @click="openCreate">新建QA</button>
      </div>

      <div class="kb-table-wrap">
        <table class="kb-table qa-table">
          <thead>
            <tr>
              <th>标准问题</th>
              <th>命中场景</th>
              <th>标准答案</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in filtered" :key="q.id">
              <td>
                <div class="qa-td-q">
                  <b :title="q.question">{{ q.question }}</b>
                  <i v-if="q.similars.length">相似问法 {{ q.similars.length }}</i>
                </div>
              </td>
              <td>
                <span v-if="q.scenes.length" class="qa-scenes">
                  <em v-for="s in q.scenes.slice(0, 2)" :key="s">{{ s }}</em>
                  <em v-if="q.scenes.length > 2" class="more" :title="q.scenes.join('、')">+{{ q.scenes.length - 2 }}</em>
                </span>
                <span v-else class="qa-dim">-</span>
              </td>
              <td><span class="qa-td-a" :title="q.answer">{{ q.answer }}</span></td>
              <td>
                <button
                  class="qa-switch" :class="{ on: q.status === 'enabled' }"
                  :title="q.status === 'enabled' ? '启用中，点击停用' : '已停用，点击启用'"
                  @click="toggleStatus(q)"
                />
              </td>
              <td>{{ q.updatedAt }}</td>
              <td>
                <span class="qa-ops">
                  <a class="kb-link" href="#" @click.prevent="openEdit(q)">编辑</a>
                  <a class="kb-link danger" href="#" @click.prevent="deleteQa(q)">删除</a>
                </span>
              </td>
            </tr>
            <tr v-if="!filtered.length">
              <td colspan="6" class="kb-empty">暂无问答，点击「新建QA」沉淀第一条标准问答</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 会话挖掘 ============ -->
    <div v-else class="kb-panel">
      <div class="kb-table-wrap">
        <table class="kb-table qa-table">
          <thead>
            <tr>
              <th>客户原声问题</th>
              <th>命中场景</th>
              <th>来源店铺</th>
              <th>平台</th>
              <th>未命中/不准确原因</th>
              <th>近7日次数</th>
              <th>捕获时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in qaCandidates" :key="c.id">
              <td><b class="qa-td-q-b" :title="c.question">{{ c.question }}</b></td>
              <td><span class="qa-scenes"><em>{{ c.scene }}</em></span></td>
              <td>{{ c.shop }}</td>
              <td>{{ c.platform }}</td>
              <td><span class="qa-reason">{{ c.reason }}</span></td>
              <td class="qa-count">{{ c.count }}</td>
              <td>{{ c.capturedAt }}</td>
              <td>
                <span class="qa-ops">
                  <a class="kb-link" href="#" @click.prevent="openFromCandidate(c)">转QA</a>
                  <a class="kb-link dim" href="#" @click.prevent="ignoreCandidate(c)">忽略</a>
                </span>
              </td>
            </tr>
            <tr v-if="!qaCandidates.length">
              <td colspan="8" class="kb-empty">暂无待处理候选，接待问题已全部沉淀</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============ 新建/编辑问答抽屉 ============ -->
    <template v-if="drawerOpen">
      <div class="kb-mask" @click="drawerOpen = false" />
      <aside class="qa-drawer" @click.stop>
        <div class="qa-d-head">
          <b>{{ editId ? '编辑问答' : '新建问答' }}</b>
          <button class="kb-x" title="关闭" @click="drawerOpen = false">✕</button>
        </div>
        <div class="qa-d-body">
          <!-- 命中场景前置第一位：级联下拉多选（左列场景类型/右列细分场景） -->
          <div class="kb-m-field qa-full">
            <label>命中场景</label>
            <CascadeSelect
              class-name="kb-select" :groups="cascGroups" multiple :values="fScenes" all-label="不限" searchable
              @multi-change="(v: string[]) => (fScenes = v)"
            />
          </div>
          <div class="kb-m-field qa-full">
            <label>标准问题<i class="kb-m-req">*</i></label>
            <textarea v-model="fQuestion" class="qa-textarea" rows="2" placeholder="客户通常会怎么问（标准问法），支持多行" />
            <span v-if="qErr" class="kb-m-err">请填写标准问题</span>
          </div>
          <!-- 相似问法：纯文本逐行分隔+铅笔编辑/垃圾桶删除；新增输入默认隐藏，点下方按钮才展示并聚焦 -->
          <div class="kb-m-field qa-full">
            <label>相似问法</label>
            <div class="qa-simlist">
              <div v-for="s in simTags.state.tags" :key="s" class="qa-simrow">
                <textarea
                  v-if="simEditKey === s" :ref="(el) => { simEditRef = el as HTMLTextAreaElement | null; }"
                  v-model="simEditDraft" class="qa-simbox edit" rows="2"
                  @keydown.enter.exact.prevent="endSimEdit(true)" @keydown.esc="endSimEdit(false)" @blur="endSimEdit(true)"
                />
                <span v-else class="qa-simbox">{{ s }}</span>
                <template v-if="simEditKey !== s">
                  <button class="kb-row-edit" title="修改" type="button" @click="startSimEdit(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                  </button>
                  <button class="kb-row-del" title="删除" type="button" @click="simTags.remove(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12z" /></svg>
                  </button>
                </template>
              </div>
              <textarea
                v-if="simAdding" ref="simAddRef" v-model="simTags.state.draft" class="qa-textarea" rows="2" placeholder="输入相似问法，回车添加，Shift+回车换行"
                @keydown.enter.exact.prevent="endSimAdd(true)" @keydown.esc="endSimAdd(false)" @blur="endSimAdd(true)"
              />
              <button v-if="!simAdding" class="kb-btn" type="button" @click="startSimAdd">新增</button>
            </div>
          </div>
          <!-- 关键词：场景标签式（灰标签+✕移除），＋虚线标签内联输入新增（回车/逗号确认） -->
          <div class="kb-m-field qa-full">
            <label>关键词</label>
            <div class="qa-kwtags">
              <em v-for="s in kwTags.state.tags" :key="s" class="kb-scene-tag">
                {{ s }}<i title="移除" @click="kwTags.remove(s)">✕</i>
              </em>
              <input
                v-if="kwCreating"
                ref="kwInputRef"
                v-model="kwTags.state.draft" class="kb-scene-create" placeholder="输入后回车或逗号添加"
                @keydown="kwTags.onKey"
                @keyup.esc="kwCreating = false"
                @blur="endKwCreate"
              >
              <button v-else type="button" class="kb-scene-tag add" title="新增关键词" @click="startKwCreate">＋</button>
            </div>
          </div>
          <div class="kb-m-field qa-full">
            <label>标准答案<i class="kb-m-req">*</i></label>
            <textarea v-model="fAnswer" class="qa-textarea" rows="5" placeholder="命中后直接回复的标准话术" />
            <span v-if="aErr" class="kb-m-err">请填写标准答案</span>
          </div>
          <div class="kb-m-field qa-full">
            <label>答案素材</label>
            <div class="qa-mats">
              <span v-for="(m, i) in fMaterials" :key="m.url" class="qa-mat">
                <img :src="m.url" alt="">
                <i title="移除" @click="fMaterials.splice(i, 1)">✕</i>
              </span>
              <label class="qa-mat add">
                ＋
                <input type="file" accept="image/*" multiple hidden @change="onPickFiles">
              </label>
            </div>
          </div>
        </div>
        <div class="qa-d-foot">
          <button class="kb-btn" @click="drawerOpen = false">取消</button>
          <button class="kb-btn primary" @click="saveQa">保存</button>
        </div>
      </aside>
    </template>

    <!-- 删除二次确认 -->
    <template v-if="confirmBox">
      <div class="kb-modal-mask" @click="confirmBox = null">
        <div class="kb-modal qa-confirm" @click.stop>
          <div class="kb-modal-head">
            <b>{{ confirmBox.title }}</b>
            <button class="kb-x" title="关闭" @click="confirmBox = null">✕</button>
          </div>
          <div class="kb-modal-body"><p>{{ confirmBox.message }}</p></div>
          <div class="qa-foot">
            <button class="kb-btn" @click="confirmBox = null">取消</button>
            <button class="kb-btn primary" @click="doConfirm">确认</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
