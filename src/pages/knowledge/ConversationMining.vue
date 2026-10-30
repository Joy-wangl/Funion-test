<script setup lang="ts">
/* 会话挖掘（场景配置式双栏）：左栏=用户咨询场景类型卡（商品信息咨询固定命中商品知识库，其余为待补充场景归属），
 * 右栏=当前类型下的咨询类型卡（商品=按系列编码区分的商品知识缺口；场景=待补充细分场景），
 * 卡内=用户问法（可展开会话记录）+ 补充动作：一键新增场景（预填全部问法交场景配置抽屉）/ 一键新增知识（预填问法写入商品知识库 V2）；
 * 商品知识类问题统一归入「商品信息咨询」，场景已在场景配置固定存在，只需按商品区分补充知识 */
import { computed, nextTick, reactive, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import SceneCfgDrawer, { type SceneCfgPrefill } from './SceneCfgDrawer.vue';
import { kbV2Products } from './goodsKbV2Data';
import { fbScenes } from './sceneConfigData';
import { KB_KNOWLEDGE_TYPES } from './data';
import './KbForm.css';
import './SceneConfig.css';
import './SceneConfigV2.css';
import './ConversationMining.css';

interface MineRecord {
  time: string;
  buyer: string;
  handling: string;
}
interface MineQuestion {
  key: string;
  question: string;
  similars: string[];
  count: number;
  lastTime: string;
  records: MineRecord[];
}
interface MineItem {
  key: string;
  /** 咨询类型名（细分场景名 / 商品编码名） */
  name: string;
  /** 副标：归属类型 / 系列编码 */
  sub: string;
  /** 商品信息咨询下=true，只补知识不建场景 */
  product?: boolean;
  questions: MineQuestion[];
  /** 涉及会话（该类型下去重估算） */
  sessions: number;
  handling: string;
  /** 建议补充方向：场景/商品知识 */
  direction: '商品知识' | '场景';
  kn: { code: string; type: string };
  kws: string[];
  draft: string;
  prompt: string;
  /** 一键新增场景预填的归属类型 */
  scType: string;
  status: '待补充' | '已补充';
  filled: string;
}
interface MineType {
  key: string;
  name: string;
  def: string;
  /** 商品信息咨询：固定命中商品知识库 */
  goodsKb?: boolean;
  items: MineItem[];
}

const TYPES = reactive<MineType[]>([
  {
    key: 'MT1', name: '商品信息咨询', goodsKb: true,
    def: '用户咨询商品参数、材质、尺码、配件等商品本身信息；统一命中场景配置中已固定的「商品信息咨询」，此处按商品区分待补充的商品知识。',
    items: [
      {
        key: 'MI1', name: '儿童轻便运动鞋·白', sub: 'FEN-24 · 儿童轻便运动鞋系列', product: true,
        questions: [
          {
            key: 'MI1Q1', question: '脚宽要买大一码吗', similars: ['脚偏宽选什么码', '有偏宽的尺码吗'], count: 18, lastTime: '2026-09-25 10:25',
            records: [
              { time: '09-25 10:20', buyer: '脚偏宽，平时穿35，这款要拍36吗？', handling: '转人工' },
              { time: '09-25 09:10', buyer: '孩子脚胖，有偏宽的尺码吗？', handling: '转人工' },
            ],
          },
          {
            key: 'MI1Q2', question: '尺码表在哪里看', similars: ['脚长怎么量', '有尺码对照表吗'], count: 11, lastTime: '2026-09-25 09:02',
            records: [
              { time: '09-25 08:46', buyer: '商品页没找到尺码表，脚长21cm选几码？', handling: '转人工' },
            ],
          },
        ],
        sessions: 14, handling: '转人工', direction: '商品知识',
        kn: { code: 'FEN-24', type: '尺码选购' }, kws: ['脚宽', '大一码', '尺码表'],
        draft: '该款鞋楦为标准宽度，脚型偏宽或需穿厚袜时建议加大一码；可对照商品页尺码表的脚长区间选择。',
        prompt: '先安抚选码顾虑，再按脚长与脚宽给出选码建议，引导对照尺码表',
        scType: '商品信息咨询', status: '待补充', filled: '',
      },
      {
        key: 'MI2', name: '女童云感休闲鞋·粉', sub: 'FEN-31 · 女童云感休闲鞋系列', product: true,
        questions: [
          {
            key: 'MI2Q1', question: '云感鞋防水吗', similars: ['下雨天能穿吗', '鞋面防水吗'], count: 10, lastTime: '2026-09-24 17:31',
            records: [
              { time: '09-24 17:20', buyer: '下雨天给孩子穿可以吗？', handling: '致歉兜底' },
            ],
          },
          {
            key: 'MI2Q2', question: '鞋底是什么材质', similars: ['鞋底软吗', '防滑吗'], count: 6, lastTime: '2026-09-24 15:08',
            records: [
              { time: '09-24 15:02', buyer: '鞋底软不软？跑跳防滑吗？', handling: '未发送回复' },
            ],
          },
        ],
        sessions: 9, handling: '致歉兜底', direction: '商品知识',
        kn: { code: 'FEN-31', type: '常见问答' }, kws: ['防水', '鞋底', '材质'],
        draft: '云感鞋面为超纤皮，日常防泼水可应对轻微雨水；鞋底为轻质 EVA，柔软缓震，湿态地面建议减速慢行。',
        prompt: '先说明鞋面防泼水能力与适用场景，再介绍鞋底材质与防滑表现',
        scType: '商品信息咨询', status: '待补充', filled: '',
      },
    ],
  },
  {
    key: 'MT2', name: '服务政策咨询',
    def: '用户咨询退换运费承担、会员积分规则等服务政策类问题；当前缺少对应细分场景，命中后多转人工或致歉兜底。',
    items: [
      {
        key: 'MI3', name: '退换运费咨询', sub: '归属类型：服务政策咨询',
        questions: [
          {
            key: 'MI3Q1', question: '尺码不合适退换货运费谁出', similars: ['退货要运费吗', '换货有运费险吗'], count: 32, lastTime: '2026-09-25 10:26',
            records: [
              { time: '09-25 10:18', buyer: '尺码买小了，退货运费谁承担？', handling: '致歉兜底' },
              { time: '09-25 09:40', buyer: '换货有运费险吗？', handling: '转人工' },
            ],
          },
        ],
        sessions: 21, handling: '致歉兜底', direction: '场景',
        kn: { code: 'FEN-24', type: '售后保障' }, kws: ['退换', '运费'],
        draft: '质量问题退换由店铺承担运费；个人原因退换由买家承担寄回运费，有运费险可按保单理赔。',
        prompt: '先说明退换时效与条件，再区分质量问题与个人原因的运费承担方，有运费险时补充理赔路径',
        scType: '服务政策咨询', status: '待补充', filled: '',
      },
      {
        key: 'MI4', name: '会员积分咨询', sub: '归属类型：服务政策咨询',
        questions: [
          {
            key: 'MI4Q1', question: '会员积分怎么查询', similars: ['买东西积分吗', '积分能抵钱吗'], count: 7, lastTime: '2026-09-23 15:20',
            records: [
              { time: '09-23 15:12', buyer: '下单有积分吗？在哪查？', handling: '致歉兜底' },
            ],
          },
        ],
        sessions: 5, handling: '致歉兜底', direction: '场景',
        kn: { code: 'FEN-24', type: '常见问答' }, kws: ['积分', '会员'],
        draft: '下单按实付金额累计积分，积分可在会员页查询并抵扣现金。',
        prompt: '告知积分累计规则与查询入口',
        scType: '服务政策咨询', status: '已补充', filled: '已补充至场景配置 · 服务政策咨询',
      },
    ],
  },
  {
    key: 'MT3', name: '物流信息咨询',
    def: '用户咨询快递指定、发货时效等物流类问题；当前缺少对应细分场景，多转人工处理。',
    items: [
      {
        key: 'MI5', name: '指定快递咨询', sub: '归属类型：物流信息咨询',
        questions: [
          {
            key: 'MI5Q1', question: '可以指定发顺丰吗', similars: ['能发顺丰吗', '默认发什么快递'], count: 9, lastTime: '2026-09-24 11:12',
            records: [
              { time: '09-24 11:05', buyer: '能发顺丰吗？急用。', handling: '转人工' },
            ],
          },
        ],
        sessions: 6, handling: '转人工', direction: '场景',
        kn: { code: 'FEN-24', type: '发货包装' }, kws: ['顺丰', '快递'],
        draft: '默认按店铺合作快递发出；如需指定顺丰可补差价升级，下单后联系客服备注。',
        prompt: '先告知默认快递与时效，再说明指定快递的升级与备注方式',
        scType: '物流信息咨询', status: '待补充', filled: '',
      },
    ],
  },
]);

/* ---------- 左栏：场景类型卡（关键词按类型名/咨询类型/问法过滤）；cur=右栏当前类型 ---------- */
const fKw = ref('');
const visibleTypes = computed(() => {
  const kw = fKw.value.trim();
  if (!kw) return TYPES;
  return TYPES.filter((t) => t.name.includes(kw)
    || t.items.some((it) => it.name.includes(kw) || it.questions.some((q) => q.question.includes(kw) || q.similars.some((s) => s.includes(kw)))));
});
const cur = ref<MineType | null>(TYPES[0] ?? null);

const allQuestions = (it: MineItem) => it.questions.flatMap((q) => [q.question, ...q.similars]);
const totalCount = (it: MineItem) => it.questions.reduce((n, q) => n + q.count, 0);
const lastTimeOf = (it: MineItem) => it.questions.reduce((m, q) => (q.lastTime > m ? q.lastTime : m), it.questions[0]?.lastTime ?? '');
const pendingOf = (t: MineType) => t.items.filter((it) => it.status === '待补充').length;

/* 全页指标：场景=咨询类型（商品/细分场景）口径 */
const metrics = computed(() => {
  const items = TYPES.flatMap((t) => t.items);
  const pending = items.filter((it) => it.status === '待补充');
  return {
    pending: pending.length,
    pendingQs: pending.reduce((n, it) => n + it.questions.length, 0),
    count: pending.reduce((n, it) => n + totalCount(it), 0),
    sessions: pending.reduce((n, it) => n + it.sessions, 0),
    filled: items.length - pending.length,
  };
});

/* 状态筛选（右栏咨询类型卡） */
const statusFilters = ['全部', '待补充', '已补充'] as const;
const fStatus = ref<(typeof statusFilters)[number]>('全部');
const visibleItems = computed(() => {
  if (!cur.value) return [];
  return cur.value.items.filter((it) => fStatus.value === '全部' || it.status === fStatus.value);
});

/* 会话记录展开态 */
const recOpen = reactive<Record<string, boolean>>({});
const toggleRec = (key: string) => { recOpen[key] = !recOpen[key]; };

/* 一键新增场景：预填后交给既有场景配置抽屉（带上该类型下全部问法）；关闭时按细分名回查落库结果流转状态 */
const scOpen = ref(false);
const scKey = ref('');
const scPrefill = ref<SceneCfgPrefill | null>(null);
const addScene = (it: MineItem) => {
  scKey.value = it.key;
  scPrefill.value = { type: it.scType, name: it.name, questions: allQuestions(it), kws: [...it.kws], aiPrompt: it.prompt };
  scOpen.value = true;
};
const onScClose = () => {
  scOpen.value = false;
  const name = scPrefill.value?.name ?? '';
  const type = scPrefill.value?.type ?? '';
  scPrefill.value = null;
  if (!name || !fbScenes.some((g) => g.subs.some((s) => s.name === name))) return;
  const it = TYPES.flatMap((t) => t.items).find((x) => x.key === scKey.value);
  if (it && it.status === '待补充') { it.status = '已补充'; it.filled = `已补充至场景配置 · ${type}`; }
};

/* 一键新增知识：预填弹窗（带上全部问法），保存写入商品知识库 V2 对应编码的知识列表 */
const knOpen = ref(false);
const knKey = ref('');
const knForm = reactive({ code: '', type: '', text: '' });
const productName = (code: string) => kbV2Products.find((p) => p.codes.some((c) => c.code === code))?.name ?? '';
const codeOptions = computed(() => kbV2Products.flatMap((p) => p.codes.map((c) => `${c.code} · ${p.name}`)));
const knTypeOptions = computed(() => (knForm.type && !KB_KNOWLEDGE_TYPES.includes(knForm.type) ? [...KB_KNOWLEDGE_TYPES, knForm.type] : KB_KNOWLEDGE_TYPES));

/* 问法/关键词标签编辑器：与商品知识库 V2（GoodsKbV2）同款交互——
 * 问法行式列表（铅笔行内修改/删除）+「新增」展开输入回车收起；关键词标签流 + ＋虚线标签内联输入 */
const makeTags = () => {
  const state = reactive({ tags: [] as string[], draft: '' });
  const add = () => {
    const v = state.draft.trim().replace(/[,，]+$/, '');
    if (v && !state.tags.includes(v)) state.tags.push(v);
    state.draft = '';
  };
  const remove = (t: string) => { state.tags = state.tags.filter((x) => x !== t); };
  const set = (list: string[]) => { state.tags = [...list]; state.draft = ''; };
  const rename = (old: string, v: string) => {
    if (!v || v === old || state.tags.includes(v)) return;
    state.tags = state.tags.map((x) => (x === old ? v : x));
  };
  return { state, add, remove, set, rename };
};
const qTags = makeTags();
const kwTags = makeTags();
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
const kwCreating = ref(false);
const kwInputRef = ref<HTMLInputElement | null>(null);
const startKwCreate = () => { kwCreating.value = true; kwTags.state.draft = ''; nextTick(() => kwInputRef.value?.focus()); };
const endKwCreate = () => { if (kwTags.state.draft.trim()) kwTags.add(); kwCreating.value = false; };
const kwOnKey = (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); kwTags.add(); }
  else if (e.key === 'Backspace' && !kwTags.state.draft && kwTags.state.tags.length) kwTags.state.tags.pop();
};

const addKnowledge = (it: MineItem) => {
  knKey.value = it.key;
  Object.assign(knForm, {
    code: `${it.kn.code} · ${productName(it.kn.code)}`,
    type: it.kn.type,
    text: it.draft,
  });
  qTags.set(allQuestions(it));
  kwTags.set([...it.kws]);
  qAdding.value = false;
  qEditKey.value = '';
  kwCreating.value = false;
  knOpen.value = true;
};
const saveKnowledge = () => {
  const code = knForm.code.split(' · ')[0];
  const product = kbV2Products.find((p) => p.codes.some((c) => c.code === code));
  const target = product?.codes.find((c) => c.code === code);
  if (!product || !target) { pushToast('请选择归属系列编码', 'warning'); return; }
  if (!knForm.type.trim()) { pushToast('请选择或填写知识类型', 'warning'); return; }
  if (!qTags.state.tags.length) { pushToast('请添加客户问法', 'warning'); return; }
  if (!knForm.text.trim()) { pushToast('请填写知识内容', 'warning'); return; }
  target.knowledge.push({
    id: `KN${Date.now()}`, type: knForm.type.trim(), text: knForm.text.trim(), materials: [], link: '', scenes: [],
    questions: [...qTags.state.tags], keywords: [...kwTags.state.tags],
  });
  knOpen.value = false;
  const it = TYPES.flatMap((t) => t.items).find((x) => x.key === knKey.value);
  if (it && it.status === '待补充') { it.status = '已补充'; it.filled = `已补充至商品知识库 · ${code}`; }
  pushToast(`已新增商品知识「${knForm.type.trim()}」`);
};

/* 商品信息咨询类型：右上直达商品知识库（与场景配置同款出口） */
const emit = defineEmits<{ 'go-goods-kb': [] }>();
</script>

<template>
  <div class="sc2-wrap">
    <header class="kb-main-head sc2-head">
      <div>
        <h2>会话挖掘</h2>
        <p class="kb-breadcrumb">知识库<span> / 会话挖掘</span></p>
      </div>
      <div class="cm-metrics">
        <span>待补充场景<b>{{ metrics.pending }}</b></span>
        <span>待补充问法<b>{{ metrics.pendingQs }}</b></span>
        <span>累计发生<b>{{ metrics.count }}</b></span>
        <span>涉及会话<b>{{ metrics.sessions }}</b></span>
        <span>已补充场景<b>{{ metrics.filled }}</b></span>
      </div>
    </header>

    <div class="sc2-body">
      <!-- 左栏：用户咨询场景类型卡（商品信息咨询固定命中商品知识库；卡上回显待补充/已补充数） -->
      <aside class="sc2-rail">
        <div class="sc2-rail-head">
          <input v-model="fKw" class="kb-input" placeholder="搜索场景类型 / 咨询类型 / 问法">
        </div>
        <div class="sc2-rail-list">
          <div
            v-for="t in visibleTypes" :key="t.key"
            class="sc2-type-card" :class="{ active: cur?.key === t.key }"
            @click="cur = t"
          >
            <div class="sc2-tc-head">
              <b :title="t.name">{{ t.name }}</b>
              <span class="sc2-tc-count">{{ t.items.length }} 类型</span>
            </div>
            <p class="sc2-tc-def" :title="t.def">{{ t.def }}</p>
            <div class="sc2-tc-chips">
              <em v-if="t.goodsKb" class="sc2-stage kb">商品知识库</em>
              <em v-if="pendingOf(t)" class="sc2-stage cm-pend">待补充 {{ pendingOf(t) }}</em>
              <em v-if="t.items.length - pendingOf(t)" class="sc2-stage cm-done">已补充 {{ t.items.length - pendingOf(t) }}</em>
            </div>
          </div>
          <div v-if="!visibleTypes.length" class="kb-empty">无匹配场景类型</div>
        </div>
      </aside>

      <!-- 右栏：当前场景类型下的咨询类型卡（用户问法+会话记录+补充动作） -->
      <main class="sc2-main">
        <template v-if="cur">
          <div class="sc2-main-head">
            <div>
              <b>{{ cur.name }}</b>
              <span class="s">共 {{ cur.items.length }} 个咨询类型 · 待补充 {{ pendingOf(cur) }}</span>
            </div>
            <button v-if="cur.goodsKb" class="kb-btn primary" type="button" @click="emit('go-goods-kb')">前往商品知识库</button>
          </div>
          <p class="cm-type-def">{{ cur.def }}</p>

          <!-- 状态筛选：按待补充/已补充快速定位咨询类型 -->
          <div class="sc2-filter">
            <span>状态</span>
            <button
              v-for="f in statusFilters" :key="f" type="button"
              class="sc2-fchip" :class="{ active: fStatus === f }"
              @click="fStatus = f"
            >{{ f }}</button>
          </div>

          <div class="sc2-cards">
            <section v-for="it in visibleItems" :key="it.key" class="sc2-sub-card">
              <div class="sc2-sc-head">
                <b :title="it.name">{{ it.name }}</b>
                <span class="cm-state" :class="it.status === '已补充' ? 'ok' : 'wait'">{{ it.status }}</span>
                <span v-if="it.status === '待补充'" class="sc2-sc-ops cm-ops-row">
                  <a class="kb-link" href="#" @click.prevent="addKnowledge(it)">一键新增知识</a>
                  <a v-if="!it.product" class="kb-link" href="#" @click.prevent="addScene(it)">一键新增场景</a>
                </span>
                <span v-else class="cm-filled">{{ it.filled }}</span>
              </div>
              <p class="cm-item-meta">
                <span>{{ it.sub }}</span>
                <i>累计发生 {{ totalCount(it) }}</i>
                <i>涉及会话 {{ it.sessions }}</i>
                <i>最近发生 {{ lastTimeOf(it) }}</i>
                <i>当前处理 {{ it.handling }}</i>
                <em class="cm-dir" :class="it.direction === '商品知识' ? 'kn' : 'sc'">{{ it.direction }}</em>
              </p>
              <!-- 用户问法盒：代表问法 + 相似问法 + 次数；展开看会话记录 -->
              <div v-for="q in it.questions" :key="q.key" class="cm-q-card">
                <div class="cm-q-row">
                  <b>{{ q.question }}</b>
                  <span class="cm-sims"><em v-for="s in q.similars" :key="s">{{ s }}</em></span>
                  <span class="cm-q-meta">{{ q.count }} 次 · 最近 {{ q.lastTime }}</span>
                  <button type="button" class="cm-rec-toggle" :class="{ open: recOpen[q.key] }" @click="toggleRec(q.key)">
                    会话记录 {{ q.records.length }}<i>∨</i>
                  </button>
                </div>
                <div v-if="recOpen[q.key]" class="cm-recs">
                  <div v-for="(r, i) in q.records" :key="i" class="cm-rec">
                    <span class="cm-rec-time">{{ r.time }}</span>
                    <span class="cm-rec-buyer" :title="r.buyer">买家：{{ r.buyer }}</span>
                    <span class="cm-rec-act">{{ r.handling }}</span>
                  </div>
                </div>
              </div>
            </section>
            <div v-if="!visibleItems.length" class="kb-empty">该状态下暂无咨询类型</div>
          </div>
        </template>
        <div v-else class="kb-empty">请在左侧选择场景类型</div>
      </main>
    </div>

    <SceneCfgDrawer :open="scOpen" :scene="null" :default-type="scPrefill?.type ?? ''" :prefill="scPrefill" @close="onScClose" />

    <div v-if="knOpen" class="kb-modal-mask" @click.self="knOpen = false">
      <div class="kb-modal cm-kn-modal">
        <div class="kb-modal-head"><b>新增商品知识</b><button class="kb-x" title="关闭" @click="knOpen = false">✕</button></div>
        <div class="cm-kn-body">
          <div class="cm-kn-row">
            <span class="cm-lb">归属系列编码<i>*</i></span>
            <BubbleSelect class-name="kb-select" :options="codeOptions" :value="knForm.code" @change="(v: string) => (knForm.code = v)" />
          </div>
          <div class="cm-kn-row">
            <span class="cm-lb">知识类型<i>*</i></span>
            <BubbleSelect class-name="kb-select" creatable :options="knTypeOptions" :value="knForm.type" @change="(v: string) => (knForm.type = v)" />
          </div>
          <div class="cm-kn-row">
            <span class="cm-lb">客户问法<i>*</i></span>
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
                v-if="qAdding" :ref="(el) => { qAddRef = el as HTMLTextAreaElement | null; }" v-model="qTags.state.draft" class="qa-textarea" rows="2" placeholder="输入问法，回车添加，Shift+回车换行"
                @keydown.enter.exact.prevent="endQAdd(true)" @keydown.esc="endQAdd(false)" @blur="endQAdd(true)"
              />
              <button v-if="!qAdding" class="kb-btn" type="button" @click="startQAdd">新增</button>
            </div>
          </div>
          <div class="cm-kn-row">
            <span class="cm-lb">关键词</span>
            <div class="qa-kwtags">
              <em v-for="s in kwTags.state.tags" :key="s" class="kb-scene-tag">
                {{ s }}<i title="移除" @click="kwTags.remove(s)">✕</i>
              </em>
              <input
                v-if="kwCreating"
                :ref="(el) => { kwInputRef = el as HTMLInputElement | null; }"
                v-model="kwTags.state.draft" class="kb-scene-create" placeholder="输入后回车或逗号添加"
                @keydown="kwOnKey"
                @keyup.esc="kwCreating = false"
                @blur="endKwCreate"
              >
              <button v-else type="button" class="kb-scene-tag add" title="新增关键词" @click="startKwCreate">＋</button>
            </div>
          </div>
          <div class="cm-kn-row">
            <span class="cm-lb">知识内容<i>*</i></span>
            <textarea v-model="knForm.text" class="qa-textarea" rows="4" maxlength="500" placeholder="如：该款鞋楦为标准宽度，脚型偏宽建议加大一码" />
          </div>
        </div>
        <div class="cm-kn-foot">
          <button class="kb-btn" @click="knOpen = false">取消</button>
          <button class="kb-btn primary" @click="saveKnowledge">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>
