<script setup lang="ts">
/* 会话挖掘：聚类历史会话中「未命中商品知识/场景」的买家问法，暴露需补齐的知识与场景缺口；
 * 一键新增场景＝复用 SceneCfgDrawer 并预填归属/细分名/问法/AI 提示语；一键新增知识＝本页弹窗预填问法/关键词/内容，
 * 保存写入商品知识库 V2 对应编码；补充后聚类状态流转为已补充，动作替换为去向提示防重复补充 */
import { computed, reactive, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import SceneCfgDrawer, { type SceneCfgPrefill } from './SceneCfgDrawer.vue';
import { kbV2Products } from './goodsKbV2Data';
import { fbScenes } from './sceneConfigData';
import { KB_KNOWLEDGE_TYPES } from './data';
import './KbForm.css';
import './ConversationMining.css';

interface MineCluster {
  key: string;
  question: string;
  similars: string[];
  count: number;
  sessions: number;
  lastTime: string;
  handling: string;
  direction: '商品知识' | '场景';
  kn: { code: string; type: string };
  sc: { type: string; name: string };
  kws: string[];
  draft: string;
  prompt: string;
  status: '待补充' | '已补充';
  filled: string;
}
const clusters = reactive<MineCluster[]>([
  {
    key: 'CM1', question: '脚宽要买大一码吗', similars: ['脚偏宽选什么码', '有偏宽的尺码吗'],
    count: 18, sessions: 9, lastTime: '2026-09-25 10:25', handling: '转人工',
    direction: '商品知识', kn: { code: 'FEN-24', type: '尺码选购' }, sc: { type: '物流信息咨询', name: '尺码建议咨询' },
    kws: ['脚宽', '大一码'], draft: '该款鞋楦为标准宽度，脚型偏宽或需穿厚袜时建议加大一码；可对照商品页尺码表的脚长区间选择。',
    prompt: '先安抚选码顾虑，再按脚长与脚宽给出选码建议，引导对照尺码表', status: '待补充', filled: '',
  },
  {
    key: 'CM2', question: '尺码不合适退换货运费谁出', similars: ['退货要运费吗', '换货有运费险吗'],
    count: 32, sessions: 21, lastTime: '2026-09-25 10:26', handling: '致歉兜底',
    direction: '场景', kn: { code: 'FEN-24', type: '售后保障' }, sc: { type: '服务政策咨询', name: '退换运费咨询' },
    kws: ['退换', '运费'], draft: '质量问题退换由店铺承担运费；个人原因退换由买家承担寄回运费，有运费险可按保单理赔。',
    prompt: '先说明退换时效与条件，再区分质量问题与个人原因的运费承担方，有运费险时补充理赔路径', status: '待补充', filled: '',
  },
  {
    key: 'CM3', question: '鞋子带鞋垫吗', similars: ['鞋垫要单独买吗', '包装里有鞋垫吗'],
    count: 12, sessions: 8, lastTime: '2026-09-24 16:40', handling: '未发送回复',
    direction: '商品知识', kn: { code: 'FEN-24', type: '常见问答' }, sc: { type: '通用兜底', name: '随箱配件咨询' },
    kws: ['鞋垫', '配件'], draft: '随箱附赠标准鞋垫一副；如需加支撑或替换，可在店铺单独选购适配鞋垫。',
    prompt: '告知随箱配件清单，并说明配件单独选购方式', status: '待补充', filled: '',
  },
  {
    key: 'CM4', question: '可以指定发顺丰吗', similars: '能发顺丰吗,默认发什么快递'.split(','),
    count: 9, sessions: 6, lastTime: '2026-09-24 11:12', handling: '转人工',
    direction: '场景', kn: { code: 'FEN-24', type: '发货包装' }, sc: { type: '物流信息咨询', name: '指定快递咨询' },
    kws: ['顺丰', '快递'], draft: '默认按店铺合作快递发出；如需指定顺丰可补差价升级，下单后联系客服备注。',
    prompt: '先告知默认快递与时效，再说明指定快递的升级与备注方式', status: '待补充', filled: '',
  },
  {
    key: 'CM5', question: '会员积分怎么查询', similars: ['买东西积分吗', '积分能抵钱吗'],
    count: 7, sessions: 5, lastTime: '2026-09-23 15:20', handling: '致歉兜底',
    direction: '场景', kn: { code: 'FEN-24', type: '常见问答' }, sc: { type: '服务政策咨询', name: '会员积分咨询' },
    kws: ['积分', '会员'], draft: '下单按实付金额累计积分，积分可在会员页查询并抵扣现金。',
    prompt: '告知积分累计规则与查询入口', status: '已补充', filled: '已补充至场景配置 · 服务政策咨询',
  },
]);

const keyword = ref('');
const statusFilter = ref<'全部' | '待补充' | '已补充'>('全部');
const shown = computed(() => clusters.filter((c) => {
  if (statusFilter.value !== '全部' && c.status !== statusFilter.value) return false;
  const kw = keyword.value.trim();
  return !kw || [c.question, ...c.similars].some((q) => q.includes(kw));
}));
const metrics = computed(() => {
  const pending = clusters.filter((c) => c.status === '待补充');
  return {
    pending: pending.length,
    count: pending.reduce((n, c) => n + c.count, 0),
    sessions: pending.reduce((n, c) => n + c.sessions, 0),
    filled: clusters.length - pending.length,
  };
});

/* 一键新增场景：预填后交给既有场景配置抽屉；关闭时按细分名回查落库结果流转状态 */
const scOpen = ref(false);
const scKey = ref('');
const scPrefill = ref<SceneCfgPrefill | null>(null);
const addScene = (c: MineCluster) => {
  scKey.value = c.key;
  scPrefill.value = { type: c.sc.type, name: c.sc.name, questions: [c.question, ...c.similars], kws: [...c.kws], aiPrompt: c.prompt };
  scOpen.value = true;
};
const onScClose = () => {
  scOpen.value = false;
  const name = scPrefill.value?.name ?? '';
  const type = scPrefill.value?.type ?? '';
  scPrefill.value = null;
  if (!name || !fbScenes.some((g) => g.subs.some((s) => s.name === name))) return;
  const c = clusters.find((x) => x.key === scKey.value);
  if (c && c.status === '待补充') { c.status = '已补充'; c.filled = `已补充至场景配置 · ${type}`; }
};

/* 一键新增知识：预填弹窗，保存写入商品知识库 V2 对应编码的知识列表 */
const knOpen = ref(false);
const knKey = ref('');
const knForm = reactive({ code: '', type: '', text: '', questions: [] as string[], keywords: [] as string[] });
const knQDraft = ref('');
const knKwDraft = ref('');
const productName = (code: string) => kbV2Products.find((p) => p.codes.some((c) => c.code === code))?.name ?? '';
const codeOptions = computed(() => kbV2Products.flatMap((p) => p.codes.map((c) => `${c.code} · ${p.name}`)));
const knTypeOptions = computed(() => (knForm.type && !KB_KNOWLEDGE_TYPES.includes(knForm.type) ? [...KB_KNOWLEDGE_TYPES, knForm.type] : KB_KNOWLEDGE_TYPES));
const addKnowledge = (c: MineCluster) => {
  knKey.value = c.key;
  Object.assign(knForm, {
    code: `${c.kn.code} · ${productName(c.kn.code)}`,
    type: c.kn.type,
    text: c.draft,
    questions: [c.question, ...c.similars],
    keywords: [...c.kws],
  });
  knQDraft.value = '';
  knKwDraft.value = '';
  knOpen.value = true;
};
const pushTag = (list: string[], draft: string) => {
  const v = draft.trim().replace(/[,，]+$/, '');
  if (v && !list.includes(v)) list.push(v);
};
const onTagKey = (e: KeyboardEvent, list: string[], draft: () => string, clear: () => void) => {
  if (e.key === 'Enter' || e.key === ',' || e.key === '，') { e.preventDefault(); pushTag(list, draft()); clear(); }
  else if (e.key === 'Backspace' && !draft() && list.length) list.pop();
};
const saveKnowledge = () => {
  const code = knForm.code.split(' · ')[0];
  const product = kbV2Products.find((p) => p.codes.some((c) => c.code === code));
  const target = product?.codes.find((c) => c.code === code);
  if (!product || !target) { pushToast('请选择归属系列编码', 'warning'); return; }
  if (!knForm.type.trim()) { pushToast('请选择或填写知识类型', 'warning'); return; }
  if (!knForm.questions.length) { pushToast('请添加客户问法', 'warning'); return; }
  if (!knForm.text.trim()) { pushToast('请填写知识内容', 'warning'); return; }
  target.knowledge.push({
    id: `KN${Date.now()}`, type: knForm.type.trim(), text: knForm.text.trim(), materials: [], link: '', scenes: [],
    questions: [...knForm.questions], keywords: [...knForm.keywords],
  });
  knOpen.value = false;
  const c = clusters.find((x) => x.key === knKey.value);
  if (c && c.status === '待补充') { c.status = '已补充'; c.filled = `已补充至商品知识库 · ${code}`; }
  pushToast(`已新增商品知识「${knForm.type.trim()}」`);
};
</script>

<template>
  <div class="cm-wrap">
    <header class="kb-main-head">
      <div>
        <h2>会话挖掘</h2>
        <p class="kb-breadcrumb">知识库<span> / 会话挖掘</span></p>
      </div>
    </header>

    <div class="cm-body">
      <div class="cm-metrics">
        <span>待补充问法聚类<b>{{ metrics.pending }}</b></span>
        <span>累计发生<b>{{ metrics.count }}</b></span>
        <span>涉及会话<b>{{ metrics.sessions }}</b></span>
        <span>已补充<b>{{ metrics.filled }}</b></span>
      </div>

      <div class="cm-filter">
        <input v-model="keyword" class="kb-input cm-kw" placeholder="搜索代表问法 / 相似问法" />
        <div class="cm-seg">
          <button v-for="s in (['全部', '待补充', '已补充'] as const)" :key="s" type="button" :class="{ active: statusFilter === s }" @click="statusFilter = s">{{ s }}</button>
        </div>
      </div>

      <div class="kb-table-wrap cm-table-wrap">
        <table class="kb-table cm-table">
          <thead>
            <tr>
              <th>代表问法</th><th>发生次数</th><th>涉及会话</th><th>最近发生</th><th>当前处理</th><th>建议补充</th><th>状态</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in shown" :key="c.key">
              <td>
                <div class="cm-q">
                  <b>{{ c.question }}</b>
                  <span class="cm-sims"><em v-for="s in c.similars" :key="s">{{ s }}</em></span>
                </div>
              </td>
              <td>{{ c.count }}</td>
              <td>{{ c.sessions }}</td>
              <td>{{ c.lastTime }}</td>
              <td>{{ c.handling }}</td>
              <td>
                <span class="cm-dir" :class="c.direction === '商品知识' ? 'kn' : 'sc'">{{ c.direction }}</span>
                <span class="cm-target">{{ c.direction === '商品知识' ? `${c.kn.type} · ${c.kn.code}` : c.sc.type }}</span>
              </td>
              <td><span class="cm-state" :class="c.status === '已补充' ? 'ok' : 'wait'">{{ c.status }}</span></td>
              <td>
                <div v-if="c.status === '待补充'" class="cm-ops">
                  <a class="kb-link" href="#" @click.prevent="addKnowledge(c)">一键新增知识</a>
                  <a class="kb-link" href="#" @click.prevent="addScene(c)">一键新增场景</a>
                </div>
                <span v-else class="cm-filled">{{ c.filled }}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!shown.length" class="cm-empty">没有符合筛选条件的问法聚类。</p>
      </div>
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
            <div class="cm-tags">
              <em v-for="q in knForm.questions" :key="q" class="kb-scene-tag">{{ q }}<i title="移除" @click="knForm.questions = knForm.questions.filter((x) => x !== q)">✕</i></em>
              <input
                v-model="knQDraft" class="cm-tag-input" placeholder="输入后回车添加"
                @keydown="onTagKey($event, knForm.questions, () => knQDraft, () => { knQDraft = ''; })"
              >
            </div>
          </div>
          <div class="cm-kn-row">
            <span class="cm-lb">关键词</span>
            <div class="cm-tags">
              <em v-for="k in knForm.keywords" :key="k" class="kb-scene-tag">{{ k }}<i title="移除" @click="knForm.keywords = knForm.keywords.filter((x) => x !== k)">✕</i></em>
              <input
                v-model="knKwDraft" class="cm-tag-input" placeholder="输入后回车添加"
                @keydown="onTagKey($event, knForm.keywords, () => knKwDraft, () => { knKwDraft = ''; })"
              >
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
