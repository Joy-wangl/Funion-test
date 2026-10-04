<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import SortTh from '../../components/SortTh.vue';
import PlatLogo from '../quality/PlatLogo.vue';
import ReplyRouteTrace from './ReplyRouteTrace.vue';
import { ROUTE_HIT_LABELS, ROUTE_OUTCOME_LABELS, formatRouteDuration, type ReplyRouteRecord, type RouteConfigTarget, type RouteSession, type RouteStep } from './replyRouteTypes';
import '../quality/style.css';
import './SmartReplyRoute.css';

const emit = defineEmits<{ (e: 'configuration', target: RouteConfigTarget): void }>();

const received: RouteStep = { name: '收到用户消息', state: 'pass', reason: '已收到买家的咨询消息。', ms: 8 };
const admitted: RouteStep = { name: '确认回复方式', state: 'pass', reason: '店铺已开启智能回复，当前由 AI 接待。', ms: 12 };
const productContext: RouteStep = { name: '了解咨询信息', state: 'pass', reason: '咨询商品编码为 FEN-24；买家处于售前阶段，尚未下单。', ms: 20 };
/* 处理链路定稿（2026-10-04 领导口径）：优先匹配场景 → 命中导向型场景（商品信息咨询）后按场景内信息查询商品知识库 → 确定回复方式；
   不导向知识库的场景直接按场景配置答复（查找商品知识=未执行）；未命中任何场景则不查知识库、走默认兜底 */
const sceneNoKb: RouteStep = { name: '查找商品知识', state: 'skip', reason: '命中的场景不导向商品知识库，直接按场景配置的回复要求答复，无需查询商品知识。' };
const sceneCandidate = {
  id: 'FB01', kind: 'scene' as const, name: '店铺地址咨询', parent: '店铺信息咨询', result: '采用' as const,
  reason: '与配置问法“有实体店吗”一致；店铺信息咨询不限阶段和订单状态，店铺地址咨询场景已启用且不限阶段。',
  evidence: [
    { field: '场景类型适用条件', expected: '不限咨询阶段和订单状态', actual: '售前咨询，尚未下单', result: '通过' as const },
    { field: '咨询内容', expected: '咨询店铺地址、实体店等店铺基础信息', actual: '买家询问是否有实体店', result: '通过' as const },
    { field: '问法匹配', expected: '有实体店吗', actual: '有实体店吗', result: '通过' as const },
    { field: '场景适用条件', expected: '场景已启用，不限咨询阶段', actual: '场景已启用，买家正在售前咨询', result: '通过' as const },
  ],
  snapshot: '场景：店铺地址咨询\n用户问法：你们店铺在哪里 / 有实体店吗 / 门店地址在哪\n关键词：实体店 / 门店 / 地址\n处理方式：智能回复\n回复要求：先明确线上店铺属性，再说明仓库直发与正品保障，打消客户顾虑',
};
const baseContext = [
  { field: '平台', value: '淘宝' }, { field: '店铺', value: '童鞋旗舰店' },
  { field: '咨询商品编码', value: 'FEN-24' }, { field: '商品识别依据', value: '买家咨询的商品卡片' },
  { field: '咨询阶段', value: '售前' }, { field: '订单状态', value: '未下单' },
  { field: '回复模式', value: '智能回复' }, { field: '人工接管', value: '否' },
];
const records: ReplyRouteRecord[] = [
  {
    id: 'PREVIEW-001', sessionId: 'SESSION-01', messageId: 'MSG-001', time: '2026-09-25 10:20:00',
    text: '鞋子码数准吗', hit: '商品知识', outcome: 'AI已回复', reason: '先命中场景「商品信息咨询」，再按场景查询商品知识库命中“尺码选购”，回复已成功发送给买家。', reasonCode: 'KNOWLEDGE_REPLY_SENT', elapsed: 1240,
    reply: '这款偏小半码，脚背偏高或脚型偏胖建议拍大一码，您可以参考商品页的尺码对照表选择。', context: baseContext,
    steps: [received, admitted, productContext,
      { name: '匹配咨询场景', state: 'pass', reason: '优先匹配场景：咨询内容为尺码等商品本身信息，命中场景类型「商品信息咨询」，该场景导向商品知识库。', ms: 60 },
      { name: '查找商品知识', state: 'pass', reason: '按场景「商品信息咨询」查询商品知识库：与“尺码选购”的配置问法“鞋子码数准吗”一致，咨询商品 FEN-24 也符合该知识的商品范围。', ms: 100 },
      { name: '确定回复方式', state: 'pass', reason: '采用“尺码选购”商品知识作为回复依据。', ms: 20 },
      { name: '生成回复内容', state: 'pass', reason: '已根据“尺码选购”商品知识生成尺码建议。', ms: 980 },
      { name: '发送给买家', state: 'pass', reason: '平台确认回复已成功发送给买家。', ms: 100 }],
    candidates: [{ id: 'KN001', kind: 'knowledge', productId: 'K001', code: 'FEN-24', name: '尺码选购', parent: '儿童轻便运动鞋系列 / FEN-24', result: '采用', reason: '由场景「商品信息咨询」导向查询商品知识库：买家提问与配置问法一致，咨询商品也符合该知识的商品范围；并非仅凭关键词采用其他商品的知识。', evidence: [
      { field: '商品范围', expected: '商品编码 FEN-24', actual: '咨询商品编码 FEN-24', result: '通过' },
      { field: '配置问法', expected: '鞋子码数准吗', actual: '鞋子码数准吗', result: '通过' },
      { field: '关键词', expected: '偏码 / 尺码 / 码数', actual: '码数', result: '通过' },
    ], snapshot: '商品知识：尺码选购\n本系列偏小半码，脚背偏高或脚型偏胖建议拍大一码；尺码段 26-32 码，可参考商品页尺码对照表。' }],
  },
  {
    id: 'PREVIEW-002', sessionId: 'SESSION-01', messageId: 'MSG-003', time: '2026-09-25 10:21:00',
    text: '有实体店吗', hit: '场景', outcome: 'AI已回复', reason: '优先命中“店铺地址咨询”场景（不导向商品知识库），回复已发送给买家。', reasonCode: 'SCENE_REPLY_SENT', elapsed: 1160,
    reply: '我们是线上店铺，商品由仓库直接发出，您可以在店铺内选购。', context: baseContext,
    steps: [received, admitted, productContext,
      { name: '匹配咨询场景', state: 'pass', reason: '符合“店铺信息咨询”的适用条件，且与“店铺地址咨询”的配置问法一致。', ms: 140 },
      sceneNoKb,
      { name: '确定回复方式', state: 'pass', reason: '采用“店铺地址咨询”场景，按设置由 AI 回复。', ms: 20 },
      { name: '生成回复内容', state: 'pass', reason: '已根据“店铺地址咨询”的回复要求生成店铺说明。', ms: 780 },
      { name: '发送给买家', state: 'pass', reason: '平台确认回复已成功发送给买家。', ms: 100 }],
    candidates: [sceneCandidate],
  },
  {
    id: 'PREVIEW-003', sessionId: 'SESSION-01', messageId: 'MSG-005', time: '2026-09-25 10:22:00',
    text: '能开发票吗', hit: '未命中', outcome: '转人工', reason: '“发票咨询”仅适用于售后已签收订单；买家尚未下单，因此未采用该场景，已转人工。', reasonCode: 'SCENE_CONDITION_MISMATCH', elapsed: 360,
    reply: '', context: baseContext,
    steps: [received, admitted, productContext,
      { name: '匹配咨询场景', state: 'miss', reason: '符合“服务政策咨询”的适用条件，问法也与“发票咨询”一致；但该场景仅适用于售后已签收订单，买家正在售前咨询且尚未下单，因此未采用。', ms: 140 },
      { name: '查找商品知识', state: 'skip', reason: '未命中导向商品知识库的场景，未查询商品知识。' },
      { name: '确定回复方式', state: 'pass', reason: '没有可用的商品知识或场景，按默认设置转人工。', ms: 100 },
      { name: '生成回复内容', state: 'skip', reason: '已转人工接待，无需生成 AI 回复。' },
      { name: '发送给买家', state: 'skip', reason: '本条咨询转人工接待，未发送 AI 回复。' }],
    candidates: [
      { id: 'FB04', kind: 'scene', name: '发票咨询', parent: '服务政策咨询', result: '淘汰', reason: '买家提问与配置问法一致，但“发票咨询”仅适用于售后已签收订单；当前为售前且尚未下单，因此未采用。', evidence: [
        { field: '场景类型适用条件', expected: '售前或售后咨询均可', actual: '售前咨询', result: '通过' },
        { field: '配置问法', expected: '能开发票吗', actual: '能开发票吗', result: '通过' },
        { field: '场景阶段', expected: '售后咨询', actual: '售前咨询', result: '不通过' },
        { field: '订单状态', expected: '订单已签收', actual: '买家尚未下单', result: '不通过' },
      ], snapshot: '场景：发票咨询\n所属场景类型：服务政策咨询\n场景类型适用条件：售前或售后咨询均可\n场景适用条件：售后咨询且订单已签收\n问法：能开发票吗 / 怎么开发票 / 支持专票吗\n处理方式：智能回复' },
      { id: 'FB12', kind: 'scene', name: '默认转人工', parent: '默认处理', result: '兜底', reason: '没有可用的商品知识或场景，按默认设置转人工；未匹配到业务场景。', evidence: [
        { field: '转人工条件', expected: '无可用商品知识或场景', actual: '未匹配商品知识；发票咨询的适用条件不满足', result: '通过' },
      ], snapshot: '默认处理：转人工（已启用）\n适用于所有未找到可用商品知识或场景的咨询\n处理方式：转人工' },
    ],
  },
  {
    id: 'PREVIEW-004', sessionId: 'SESSION-02', messageId: 'MSG-008', time: '2026-09-25 10:24:00',
    text: '有实体店吗', hit: '场景', outcome: '发送失败', reason: '已匹配“店铺地址咨询”并生成回复，但平台发送失败，买家未收到这条 AI 回复。', reasonCode: 'PLATFORM_SEND_FAILED', elapsed: 1450,
    reply: '我们是线上店铺，商品由仓库直接发出。', context: baseContext,
    steps: [received, admitted, productContext,
      { name: '匹配咨询场景', state: 'pass', reason: '已匹配“店铺地址咨询”场景。', ms: 140 },
      sceneNoKb,
      { name: '确定回复方式', state: 'pass', reason: '采用“店铺地址咨询”场景，按设置由 AI 回复。', ms: 20 },
      { name: '生成回复内容', state: 'pass', reason: '回复内容已生成。', ms: 870 },
      { name: '发送给买家', state: 'error', reason: '平台发送失败，买家未收到这条 AI 回复。', ms: 300 }],
    candidates: [sceneCandidate],
  },
  {
    id: 'PREVIEW-005', sessionId: 'SESSION-02', messageId: 'MSG-010', time: '2026-09-25 10:25:00',
    text: '那我想问一下怎么选码', hit: '未执行', outcome: '人工接管', reason: '李四已接管会话，本条消息由客服继续回复，不再进行商品知识或场景匹配，也不生成 AI 回复。', reasonCode: 'HUMAN_TAKEOVER', elapsed: 20,
    reply: '', context: [...baseContext.filter((c) => c.field !== '人工接管'), { field: '人工接管', value: '是 · 李四于 10:24:30 接管' }],
    steps: [received,
      { name: '确认回复方式', state: 'miss', reason: '李四已接管会话，由客服继续回复，AI 不再自动回复。', ms: 12 },
      { name: '了解咨询信息', state: 'skip', reason: '客服已接管，无需重新识别咨询信息；此处显示此前已有的会话信息。' },
      { name: '匹配咨询场景', state: 'skip', reason: '客服已接管，无需匹配咨询场景。' },
      { name: '查找商品知识', state: 'skip', reason: '客服已接管，无需查找商品知识。' },
      { name: '确定回复方式', state: 'skip', reason: '客服已接管，无需再确定 AI 回复方式。' },
      { name: '生成回复内容', state: 'skip', reason: '客服已接管，无需生成 AI 回复。' },
      { name: '发送给买家', state: 'skip', reason: '客服已接管，无需发送 AI 回复。' }], candidates: [],
  },
  {
    id: 'PREVIEW-006', sessionId: 'SESSION-03', messageId: 'MSG-012', time: '2026-09-25 10:26:00',
    text: '有实体店吗', hit: '场景', outcome: '生成失败', reason: '已匹配“店铺地址咨询”，但等待 30 秒仍未生成回复，因此未发送。', reasonCode: 'MODEL_TIMEOUT', elapsed: 30280,
    reply: '', context: baseContext,
    steps: [received, admitted, productContext,
      { name: '匹配咨询场景', state: 'pass', reason: '已匹配“店铺地址咨询”场景。', ms: 140 },
      sceneNoKb,
      { name: '确定回复方式', state: 'pass', reason: '采用“店铺地址咨询”场景，按设置由 AI 回复。', ms: 20 },
      { name: '生成回复内容', state: 'error', reason: '等待 30 秒仍未生成完整回复，已停止等待。', ms: 30000 },
      { name: '发送给买家', state: 'skip', reason: '未能生成回复内容，因此未向买家发送消息。' }], candidates: [sceneCandidate],
  },
  {
    id: 'PREVIEW-007', sessionId: 'SESSION-03', messageId: 'MSG-013', time: '2026-09-25 10:27:00',
    text: '请问有实体店吗', hit: '场景', outcome: '处理中', reason: '已匹配“店铺地址咨询”，AI 正在生成回复，尚未发送给买家。', reasonCode: 'GENERATION_IN_PROGRESS', elapsed: null,
    reply: '', context: baseContext,
    steps: [received, admitted, productContext,
      { name: '匹配咨询场景', state: 'pass', reason: '买家在咨询实体店，提问包含“店铺地址咨询”的关键词“实体店”。', ms: 140 },
      sceneNoKb,
      { name: '确定回复方式', state: 'pass', reason: '采用“店铺地址咨询”场景，按设置由 AI 回复。', ms: 20 },
      { name: '生成回复内容', state: 'running', reason: '正在生成回复内容。' },
      { name: '发送给买家', state: 'unknown', reason: '等待回复生成后再发送。' }],
    candidates: [{ ...sceneCandidate, reason: '符合“店铺信息咨询”和“店铺地址咨询”的适用条件，提问包含关键词“实体店”。', evidence: [
      { field: '场景类型适用条件', expected: '不限咨询阶段和订单状态', actual: '售前咨询，尚未下单', result: '通过' },
      { field: '关键词', expected: '实体店 / 门店 / 地址', actual: '实体店', result: '通过' },
    ] }],
  },
];
const sessions: RouteSession[] = [
  { id: 'SESSION-01', buyer: '小鹿', shop: '童鞋旗舰店', agent: '黄亚芳', messages: [
    { id: 'MSG-001', side: 'buyer', time: '10:20:00', text: records[0]!.text, traceId: 'PREVIEW-001' },
    { id: 'MSG-002', side: 'bot', time: '10:20:02', text: records[0]!.reply, traceId: 'PREVIEW-001' },
    { id: 'MSG-003', side: 'buyer', time: '10:21:00', text: records[1]!.text, traceId: 'PREVIEW-002' },
    { id: 'MSG-004', side: 'bot', time: '10:21:02', text: records[1]!.reply, traceId: 'PREVIEW-002' },
    { id: 'MSG-005', side: 'buyer', time: '10:22:00', text: records[2]!.text, traceId: 'PREVIEW-003' },
    { id: 'MSG-006', side: 'system', time: '10:22:01', text: '未找到可用回复内容，已转人工接待' },
    { id: 'MSG-007', side: 'agent', time: '10:22:30', text: '可以的，下单后的发票申请方式我来为您说明。' },
  ] },
  { id: 'SESSION-02', buyer: '柚子', shop: '童鞋旗舰店', agent: '李四', messages: [
    { id: 'MSG-008', side: 'buyer', time: '10:24:00', text: records[3]!.text, traceId: 'PREVIEW-004' },
    { id: 'MSG-009', side: 'system', time: '10:24:30', text: 'AI 消息发送失败；李四接管会话' },
    { id: 'MSG-009-A', side: 'agent', time: '10:24:40', text: '您好，我们是线上店铺，商品从仓库直接发出。' },
    { id: 'MSG-010', side: 'buyer', time: '10:25:00', text: records[4]!.text, traceId: 'PREVIEW-005' },
    { id: 'MSG-011', side: 'agent', time: '10:25:30', text: '请问您平时穿多大的鞋码，脚背偏高吗？' },
  ] },
  { id: 'SESSION-03', buyer: '晴天', shop: '童鞋旗舰店', agent: '黄亚芳', messages: [
    { id: 'MSG-012', side: 'buyer', time: '10:26:00', text: records[5]!.text, traceId: 'PREVIEW-006' },
    { id: 'MSG-012-S', side: 'system', time: '10:26:31', text: 'AI 未能及时生成回复，未发出消息' },
    { id: 'MSG-013', side: 'buyer', time: '10:27:00', text: records[6]!.text, traceId: 'PREVIEW-007' },
  ] },
];
const hitOptions = [{ value: '全部', label: '全部' }, ...Object.entries(ROUTE_HIT_LABELS).map(([value, label]) => ({ value, label }))];
const outcomeOptions = [{ value: '全部', label: '全部' }, ...Object.entries(ROUTE_OUTCOME_LABELS).map(([value, label]) => ({ value, label }))];
const emptyFilter = { keyword: '', from: '', to: '', shop: '全部', agent: '全部', ai: '全部', hit: '全部', outcome: '全部' };
const draft = ref({ ...emptyFilter });
const applied = ref({ ...emptyFilter });
const dateError = computed(() => draft.value.from && !draft.value.to ? '请选择结束日期' : draft.value.from > draft.value.to && draft.value.to ? '开始日期不能晚于结束日期' : '');
const quick = ref('全部消息');
const page = ref(1);
const pageSize = ref('10');
const order = ref<'asc' | 'desc'>('desc');
const sortKey = ref<'time' | 'elapsed'>('time');
const drawer = ref<ReplyRouteRecord | null>(null);
const chatSessionId = ref('');
const activeMessageId = ref('');
const drawerClose = ref<HTMLButtonElement | null>(null);
const chatClose = ref<HTMLButtonElement | null>(null);
const chatBody = ref<HTMLElement | null>(null);
let returnFocus: HTMLElement | null = null;
let chatReturnFocus: HTMLElement | null = null;
const sessionOf = (r: ReplyRouteRecord) => sessions.find((s) => s.id === r.sessionId)!;
const aiLabel = (r: ReplyRouteRecord) => r.outcome === 'AI已回复' ? '已回复' : r.outcome === '处理中' ? '处理中' : '未回复';
const tone = (r: ReplyRouteRecord) => r.outcome === 'AI已回复' ? 'ok' : r.outcome.endsWith('失败') ? 'bad' : r.outcome === '处理中' ? 'progress' : 'warn';
const scoped = computed(() => records.filter((r) => {
  const f = applied.value;
  const s = sessionOf(r);
  const words = [r.id, r.messageId, r.sessionId, r.text, r.reason, r.reasonCode, ROUTE_HIT_LABELS[r.hit], ROUTE_OUTCOME_LABELS[r.outcome], aiLabel(r), s.buyer, ...r.candidates.map((c) => `${c.id} ${c.name}`)].join(' ').toLowerCase();
  return (!f.keyword || words.includes(f.keyword.toLowerCase()))
    && (!f.from || r.time.slice(0, 10) >= f.from) && (!f.to || r.time.slice(0, 10) <= f.to)
    && (f.shop === '全部' || s.shop === f.shop) && (f.agent === '全部' || s.agent === f.agent)
    && (f.ai === '全部' || aiLabel(r) === f.ai) && (f.hit === '全部' || r.hit === f.hit)
    && (f.outcome === '全部' || r.outcome === f.outcome);
}));
const metrics = computed(() => [
  { label: '全部消息', count: scoped.value.length },
  { label: 'AI 已回复', count: scoped.value.filter((r) => r.outcome === 'AI已回复').length },
  { label: '匹配商品知识', count: scoped.value.filter((r) => r.hit === '商品知识').length },
  { label: '匹配场景', count: scoped.value.filter((r) => r.hit === '场景').length },
  { label: '需要关注', count: scoped.value.filter((r) => r.outcome.endsWith('失败') || r.hit === '未命中').length },
]);
const filtered = computed(() => scoped.value.filter((r) => quick.value === '全部消息'
  || (quick.value === 'AI 已回复' && r.outcome === 'AI已回复')
  || (quick.value === '匹配商品知识' && r.hit === '商品知识')
  || (quick.value === '匹配场景' && r.hit === '场景')
  || (quick.value === '需要关注' && (r.outcome.endsWith('失败') || r.hit === '未命中'))));
const sorted = computed(() => [...filtered.value].sort((a, b) => {
  if (sortKey.value === 'elapsed') {
    if (a.elapsed === null) return b.elapsed === null ? 0 : 1;
    if (b.elapsed === null) return -1;
    return (a.elapsed - b.elapsed) * (order.value === 'asc' ? 1 : -1);
  }
  return a.time.localeCompare(b.time) * (order.value === 'asc' ? 1 : -1);
}));
const pages = computed(() => Math.max(1, Math.ceil(sorted.value.length / Number(pageSize.value))));
const visible = computed(() => sorted.value.slice((page.value - 1) * Number(pageSize.value), page.value * Number(pageSize.value)));
const chatSessions = computed(() => sessions.filter((s) => filtered.value.some((r) => r.sessionId === s.id)));
const activeSession = computed(() => chatSessions.value.find((s) => s.id === chatSessionId.value));
const chatIndex = computed(() => chatSessions.value.findIndex((s) => s.id === chatSessionId.value));
const roles = { buyer: '买家', bot: 'AI 回复', agent: '客服', system: '系统' };
const traceOfMessage = (id?: string) => records.find((r) => r.id === id);
watch([filtered, pageSize], () => { page.value = 1; });
const search = () => {
  if (dateError.value) return;
  applied.value = { ...draft.value, keyword: draft.value.keyword.trim() };
  quick.value = '全部消息';
};
const reset = () => { draft.value = { ...emptyFilter }; applied.value = { ...emptyFilter }; quick.value = '全部消息'; };
const sort = (key: 'time' | 'elapsed') => { order.value = sortKey.value === key && order.value === 'desc' ? 'asc' : 'desc'; sortKey.value = key; page.value = 1; };
const openTrace = async (r: ReplyRouteRecord) => {
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  drawer.value = r;
  await nextTick();
  drawerClose.value?.focus();
};
const closeTrace = async () => {
  drawer.value = null;
  await nextTick();
  returnFocus?.focus();
};
const scrollMessage = async (id: string) => {
  activeMessageId.value = id;
  await nextTick();
  const message = document.getElementById(`rr-${id}`);
  if (message && chatBody.value) {
    const body = chatBody.value;
    body.scrollTop += message.getBoundingClientRect().top - body.getBoundingClientRect().top - (body.clientHeight - message.clientHeight) / 2;
  }
};
const openChat = async (r: ReplyRouteRecord) => {
  if (!chatSessionId.value) chatReturnFocus = drawer.value ? returnFocus : document.activeElement instanceof HTMLElement ? document.activeElement : null;
  drawer.value = null;
  chatSessionId.value = r.sessionId;
  await scrollMessage(r.messageId);
  chatClose.value?.focus();
};
const closeChat = async () => {
  chatSessionId.value = '';
  await nextTick();
  chatReturnFocus?.focus();
};
const navigateChat = async (offset: number) => {
  const session = chatSessions.value[chatIndex.value + offset];
  if (!session) return;
  chatSessionId.value = session.id;
  await scrollMessage(filtered.value.find((r) => r.sessionId === session.id)!.messageId);
  chatClose.value?.focus();
};
const openMessageTrace = (messageId: string, traceId: string) => {
  activeMessageId.value = messageId;
  const record = traceOfMessage(traceId);
  if (record) void openTrace(record);
};
const onOverlayKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    e.preventDefault();
    if (drawer.value) void closeTrace();
    else void closeChat();
    return;
  }
  if (!drawer.value && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    e.preventDefault();
    void navigateChat(e.key === 'ArrowLeft' ? -1 : 1);
    return;
  }
  if (e.key !== 'Tab') return;
  const overlay = document.querySelector(drawer.value ? '.rr-drawer' : '.rr-chat-modal');
  const nodes = Array.from(overlay?.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), [tabindex="0"]') ?? []).filter((el) => el.getClientRects().length);
  const first = nodes[0]; const last = nodes.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
};
watch(() => !!drawer.value || !!activeSession.value, (open) => {
  if (open) window.addEventListener('keydown', onOverlayKey);
  else window.removeEventListener('keydown', onOverlayKey);
});
onBeforeUnmount(() => window.removeEventListener('keydown', onOverlayKey));
</script>

<template>
  <main class="rr-page" :inert="!!drawer || !!activeSession">
    <header class="kb-main-head rr-head">
      <div><h2>智能回复路由</h2><p class="kb-breadcrumb">知识库<span> / 智能回复路由</span></p></div>
    </header>
    <div class="rr-body">
      <form class="kb-query rr-query" @submit.prevent="search">
        <div class="kb-field"><label for="rr-keyword">关键词</label><div class="kb-kwwrap"><input id="rr-keyword" v-model="draft.keyword" class="kb-input" placeholder="用户 / 消息 / 知识或场景名称" /><button v-if="draft.keyword" type="button" class="kb-clear" aria-label="清除关键词" @click="draft.keyword = ''">×</button></div></div>
        <div class="kb-field"><label>消息时间</label><DateRangePicker v-model:from="draft.from" v-model:to="draft.to" placeholder="全部日期" /><span v-if="dateError" class="rr-error" role="alert">{{ dateError }}</span></div>
        <div class="kb-field"><label>店铺</label><BubbleSelect class-name="kb-input" :value="draft.shop" :options="['全部', ...new Set(sessions.map((s) => s.shop))]" @change="draft.shop = $event" /></div>
        <div class="kb-field"><label>客服</label><BubbleSelect class-name="kb-input" :value="draft.agent" :options="['全部', ...new Set(sessions.map((s) => s.agent))]" @change="draft.agent = $event" /></div>
        <div class="kb-field"><label>AI 回复</label><BubbleSelect class-name="kb-input" :value="draft.ai" :options="['全部', '已回复', '未回复', '处理中']" @change="draft.ai = $event" /></div>
        <div class="kb-field"><label>匹配结果</label><BubbleSelect class-name="kb-input" :value="draft.hit" :options="hitOptions" @change="draft.hit = $event" /></div>
        <div class="kb-field"><label>处理结果</label><BubbleSelect class-name="kb-input" :value="draft.outcome" :options="outcomeOptions" @change="draft.outcome = $event" /></div>
        <div class="kb-query-actions"><button type="button" class="kb-btn" @click="reset">重置</button><button type="submit" class="kb-btn primary" :disabled="!!dateError">查询</button></div>
      </form>
      <div class="rr-metrics">
        <button v-for="m in metrics" :key="m.label" type="button" :class="{ active: quick === m.label }" :aria-pressed="quick === m.label" @click="quick = m.label">
          <span>{{ m.label }}</span><strong>{{ m.count }}</strong>
        </button>
      </div>
      <section class="rr-list" aria-label="消息处理记录">
        <div class="rr-list-head"><b>消息处理记录</b><span>共 {{ filtered.length }} 条</span><span class="rr-snapshot-time">示例日期 2026-09-25</span></div>
        <div class="rr-table-scroll">
          <table class="kb-table rr-table">
            <thead><tr><SortTh label="消息时间" :state="sortKey === 'time' ? order : 'none'" @sort="sort('time')" /><th>用户消息</th><th>店铺 / 客服</th><th>AI 回复</th><th>匹配结果</th><th>处理结果</th><SortTh label="处理用时" :state="sortKey === 'elapsed' ? order : 'none'" @sort="sort('elapsed')" /><th>操作</th></tr></thead>
            <tbody><tr v-for="r in visible" :key="r.id" :data-trace="r.id">
              <td><div class="rr-cell"><span>{{ r.time.slice(11) }}</span><small>{{ r.time.slice(0, 10) }}</small></div></td>
              <td><div class="rr-cell"><b>{{ sessionOf(r).buyer }}</b><Ellipsis :text="r.text" /></div></td>
              <td><div class="rr-cell"><span class="rr-shop"><PlatLogo platform="淘宝" /><Ellipsis :text="sessionOf(r).shop" /></span><small>{{ sessionOf(r).agent }}</small></div></td>
              <td><span class="rr-state" :class="r.outcome === 'AI已回复' ? 'ok' : r.outcome === '处理中' ? 'progress' : 'neutral'">{{ aiLabel(r) }}</span></td>
              <td><div class="rr-cell"><span>{{ ROUTE_HIT_LABELS[r.hit] }}</span><Ellipsis :text="r.candidates.find((c) => c.result === '采用')?.name ?? (r.hit === '未命中' ? '默认转人工' : '客服已接管')" /></div></td>
              <td><div class="rr-cell"><span class="rr-state" :class="tone(r)">{{ ROUTE_OUTCOME_LABELS[r.outcome] }}</span><Ellipsis :text="r.reason" /></div></td>
              <td>{{ formatRouteDuration(r.elapsed) }}</td>
              <td><div class="rr-ops"><button type="button" class="kb-link" @click="openTrace(r)">查看详情</button><button type="button" class="kb-link" @click="openChat(r)">聊天记录</button></div></td>
            </tr></tbody>
          </table>
          <div v-if="!visible.length" class="rr-empty"><b>暂无匹配的消息</b><button type="button" class="kb-btn" @click="reset">重置筛选</button></div>
        </div>
        <footer class="rr-pagination"><span>共 {{ filtered.length }} 条</span><BubbleSelect class-name="kb-input rr-size" :value="pageSize" :options="[{ value: '5', label: '5 条 / 页' }, { value: '10', label: '10 条 / 页' }, { value: '20', label: '20 条 / 页' }]" @change="pageSize = $event" /><button class="kb-btn" type="button" :disabled="page <= 1" @click="page--">上一页</button><span>{{ page }} / {{ pages }}</span><button class="kb-btn" type="button" :disabled="page >= pages" @click="page++">下一页</button></footer>
      </section>
    </div>
    <Teleport to="body">
      <div v-if="activeSession" class="pm-page qc-page chat-modal-mask rr-chat-mask" :inert="!!drawer" @click.self="closeChat">
        <section class="chat-modal rr-chat-modal" :data-session-id="activeSession.id" role="dialog" :aria-modal="drawer ? undefined : true" aria-labelledby="rr-chat-title">
          <header class="chat-modal-head">
            <div class="rr-chat-title"><h3 id="rr-chat-title">聊天记录</h3><button ref="chatClose" type="button" class="x" aria-label="关闭聊天记录" @click="closeChat"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg></button></div>
            <span class="s-meta"><PlatLogo platform="淘宝" />{{ activeSession.shop }}</span>
            <span class="s-meta"><i>买家</i>{{ activeSession.buyer }}</span>
            <span class="s-meta"><i>客服</i>{{ activeSession.agent }}</span>
            <span class="s-meta"><i>会话时间</i>2026-09-25 {{ activeSession.messages[0]?.time }}</span>
            <span class="s-meta"><i>消息数</i>{{ activeSession.messages.length }} 条</span>
          </header>
          <div ref="chatBody" class="chat-modal-body">
            <div class="session-bubbles">
              <div class="b-list">
                <article v-for="m in activeSession.messages" :key="m.id" :id="`rr-${m.id}`" class="bubble-row" :class="[m.side === 'buyer' ? 'buyer' : m.side === 'system' ? 'system' : 'support', { ai: m.side === 'bot', selected: m.id === activeMessageId }]">
                  <template v-if="m.side === 'system'"><div class="rr-system-message">{{ m.time }} · {{ m.text }}</div></template>
                  <template v-else>
                    <div class="b-av">{{ m.side === 'buyer' ? '买' : m.side === 'bot' ? 'AI' : '服' }}</div>
                    <div class="b-main">
                      <div class="b-meta">{{ roles[m.side] }}{{ m.side === 'buyer' ? ` · ${activeSession.buyer}` : m.side === 'agent' ? ` · ${activeSession.agent}` : '' }} · {{ m.time }}</div>
                      <button v-if="m.traceId" type="button" class="b-text" :aria-label="`${m.text}，查看回复详情`" @click="openMessageTrace(m.id, m.traceId)">{{ m.text }}</button><div v-else class="b-text">{{ m.text }}</div>
                      <button v-if="m.side === 'buyer' && m.traceId" type="button" class="rr-message-route" @click="openMessageTrace(m.id, m.traceId)">{{ traceOfMessage(m.traceId) ? ROUTE_OUTCOME_LABELS[traceOfMessage(m.traceId)!.outcome] : '' }} · 查看详情 →</button>
                    </div>
                  </template>
                </article>
              </div>
            </div>
          </div>
          <footer class="chat-modal-foot">
            <span class="rr-preview">示例数据 · 仅供查看</span>
            <div class="cm-nav"><button type="button" :disabled="chatIndex <= 0" @click="navigateChat(-1)">‹ 上一个</button><span class="cm-idx">{{ chatIndex + 1 }} / {{ chatSessions.length }}</span><button type="button" :disabled="chatIndex >= chatSessions.length - 1" @click="navigateChat(1)">下一个 ›</button></div>
          </footer>
        </section>
      </div>
      <div v-if="drawer" class="rr-overlay" @click.self="closeTrace"><section class="rr-drawer" role="dialog" aria-modal="true" aria-label="回复处理详情"><button ref="drawerClose" type="button" class="rr-close" aria-label="关闭回复详情" @click="closeTrace">×</button><ReplyRouteTrace :record="drawer" @conversation="openChat(drawer)" @configuration="emit('configuration', $event)" /></section></div>
    </Teleport>
  </main>
</template>
