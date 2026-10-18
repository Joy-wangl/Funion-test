<script setup lang="ts">
/* ---------- 品控·线上·待办任务（任务待办 · 待处理）----------
   高还原参考图：顶部页签（消息通知/任务待办；动态表单已按用户指令删除）＋三桶胶囊（待处理的/已处理的/我发起的）
   ＋类型下划线页签行（含搜索/日期/状态/发起待办）＋待办卡列表（状态芯片/特急/附件/发起人/动作钮）。
   三桶（待处理/已处理/我发起）列表数据均可点卡进右侧详情分栏。 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { INITIAL_MEMBERS, type Member } from '../permission/data';
import QcTodoCreateDrawer, { type TodoCreatePayload } from './QcTodoCreateDrawer.vue';
import QcTodoHandleDrawer from './QcTodoHandleDrawer.vue';
import { qcShops, shopGoodsJumpSeed, SHOP_LOGO, type ShopGood, type ShopPlat } from './qcOnlineData';
import { QC_TODOS, TODO_PRIORITIES, TODO_TYPES, todoBuckets, todoFileMetaOf, todoFromDraft, todoOptRows, todoSizeTxt, type QcTodo, type TodoFile, type TodoPriority, type TodoShop } from './qcTodoData';

type TopTab = '消息通知' | '任务待办';
type Pill = '待处理' | '已处理' | '我发起';

/* 详情「关联商品」点击：上抛壳层跳店铺监控·店铺商品并按商品ID查询（跨模块查看复用现有页面） */
const emit = defineEmits<{ (e: 'jump-goods', g: ShopGood): void }>();

const TOP_TABS: TopTab[] = ['消息通知', '任务待办'];
const PILLS: { key: Pill; label: string }[] = [
  { key: '待处理', label: '待处理的' },
  { key: '已处理', label: '已处理的' },
  { key: '我发起', label: '我发起的' },
];

const topTab = ref<TopTab>('任务待办');
const pill = ref<Pill>('待处理');
const typeTab = ref('全部');
const kw = ref('');
/* 右下拉随桶切换口径：我发起的＝流程状态五档（全部/待处理/已处理/已逾期/已拒绝）；待处理/已处理＝优先级（全部＋五档） */
const STATUS_OPTS = ['全部', '待处理', '已处理', '已逾期', '已拒绝'];
const PRIO_OPTS = ['全部', ...TODO_PRIORITIES];
const sel = ref('全部');
const selOpts = computed(() => (pill.value === '我发起' ? STATUS_OPTS : PRIO_OPTS));
watch(pill, () => { sel.value = '全部'; });
const prioOf = (t: QcTodo): TodoPriority => t.priority ?? '普通';
const PRIO_CLS: Record<string, string> = { 紧急: 'jj', 高优: 'gy', 低优: 'dy' };
/* 搜索口径随桶切换：我发起的搜收件人，其余搜发件人（用户定稿） */
const kwPh = computed(() => (pill.value === '我发起' ? '请输入收件人、标题名称' : '请输入发件人、标题名称'));
/* 筛选收起（用户定稿「默认是收起的，点击以后才会展示全部的输入框」）：同系列抽屉关联商品合并搜索语言——
   收起＝图标钮（图标＋下划线）；点击展开搜索框＋时间＋状态全部输入；无生效筛选时点簇外收回 */
const filtOpen = ref(false);
const filtWrapRef = ref<HTMLElement | null>(null);
const kwRef = ref<HTMLInputElement | null>(null);
const openFilt = () => { filtOpen.value = true; nextTick(() => kwRef.value?.focus()); };
const filtActive = computed(() => kw.value.trim() !== '' || sel.value !== '全部');
const onFiltOutside = (e: MouseEvent) => {
  if (!filtOpen.value || filtActive.value) return;
  const el = e.target as HTMLElement | null;
  if (!el) return;
  if (filtWrapRef.value?.contains(el) || el.closest('.bselect-menu')) return;
  filtOpen.value = false;
};
/* 发起待办抽屉开关；提交口径见 onCreated（重新提交回填列表） */
const createOpen = ref(false);

/* ---------- 三桶详情（参考图一/二/三）：任一桶点卡→右侧详情分栏；多人任务→中栏钻取处理人列表 ----------
   收件态（待处理/已处理）详情首行展示发起人链路、纯查看无底栏；我发起态未完结带 发送提醒/下派 底栏。 */
const detailId = ref<string | null>(null);
const detailTodo = computed(() => QC_TODOS.find((t) => t.id === detailId.value) ?? null);
/* 多人任务＝发送给多个人（抽屉内带处理人列）；单人收件（含 toList 仅 1 人）走单人查看态 */
const recipCount = (t: QcTodo | null) => (t ? t.toList?.length ?? (t.to ? 1 : 0) : 0);
const isMulti = computed(() => recipCount(detailTodo.value) > 1);
const dTab = ref('事项');
/* 处理人钻取：搜索＋状态＋选中 */
const hKw = ref('');
const hSt = ref('全部');
const H_OPTS = ['全部', '待处理', '已处理', '驳回', '已撤销'];
const hIdx = ref(0);
const hRows = computed(() => {
  const q = hKw.value.trim();
  return (detailTodo.value?.handlers ?? []).filter((h) => (!q || h.name.includes(q)) && (hSt.value === '全部' || h.flow === hSt.value));
});
/* 计数口径（参考图 2/5）：转交转入人不计入需处理总数 */
const hDone = computed(() => (detailTodo.value?.handlers ?? []).filter((h) => h.flow === '已处理' && !h.transferFrom).length);
const hTotal = computed(() => (detailTodo.value?.handlers ?? []).filter((h) => !h.transferFrom).length);
/* 详情当前实例：多人态＝选中处理人卡；单人态＝待办本身 */
const dHandler = computed(() => {
  if (!isMulti.value) return null;
  const rows = hRows.value;
  return rows[Math.min(hIdx.value, rows.length - 1)] ?? null;
});
const dPerson = computed(() => {
  const h = dHandler.value;
  if (h) return { name: h.name, chain: h.chain };
  const t = detailTodo.value;
  if (!t) return { name: '', chain: '' };
  /* 收件态详情首行展示发起人链路；我发起态展示收件人（单人含 toList 仅 1 人） */
  return t.mine
    ? { name: t.to ?? t.toList?.[0] ?? '', chain: '杭州分公司–项目组–产品部' }
    : { name: t.from?.name ?? '', chain: t.from?.group ?? '杭州分公司–项目组–产品部' };
});
/* 详情状态芯片（图一实心紫转交/图二实心红驳回），其余态不展示 */
const dStatus = computed<'转交' | '驳回' | null>(() => {
  const h = dHandler.value;
  if (h) return h.transferFrom ? '转交' : h.flow === '驳回' ? '驳回' : null;
  const s = detailTodo.value?.status;
  return s === '转交' || s === '驳回' ? s : null;
});
/* 详情字段行：发起时间恒在；转交补 原处理人/转交时间；驳回补 驳回时间；已处理补 处理时间 */
const dRows = computed(() => {
  const t = detailTodo.value;
  if (!t) return [] as { lab: string; val: string }[];
  const h = dHandler.value;
  const rows = [{ lab: '发起时间', val: t.time }, ...todoOptRows(t)];
  if (h?.transferFrom) rows.push({ lab: '原处理人', val: h.transferFrom }, { lab: '转交时间', val: h.transferTime ?? '' });
  if (h?.flow === '驳回') rows.push({ lab: '驳回人', val: h.name }, { lab: '驳回时间', val: h.sub ?? '' });
  if (h?.flow === '已处理') rows.push({ lab: '处理时间', val: h.sub ?? '' });
  if (!h && t.status === '转交') rows.push({ lab: '原处理人', val: '我' }, { lab: '转交时间', val: t.transferTime ?? '' });
  /* 驳回人明示方向：我发起被驳回＝对方姓名（再次提交入口在同底栏）；我驳回的＝我（流程闭环只看详情） */
  if (!h && t.status === '驳回') rows.push({ lab: '驳回人', val: t.mine ? (t.to ?? t.toList?.[0] ?? '') : '我' }, { lab: '驳回时间', val: t.rejectTime ?? '' });
  if (!h && t.flow === '已处理') rows.push({ lab: '处理时间', val: t.doneTime ?? '' });
  /* 空值行整段隐藏（如驳回态无处理时间），禁空标签露出 */
  return rows.filter((r) => r.val);
});
const dRejectReason = computed(() => dHandler.value?.rejectReason ?? detailTodo.value?.rejectReason ?? '');
/* 事项页签附件/图片：优先详情自有 atts；收件态无 atts 时回落卡面发起附件 files（同芯片语言），图片/视频取 files 缩略图 */
const dAtts = computed(() => {
  const t = detailTodo.value;
  if (!t) return [] as { name: string; sub: string }[];
  if (t.atts?.length) return t.atts;
  return (t.files ?? []).filter((f) => f.kind === 'file').map((f) => ({ name: f.name, sub: `${todoFileMetaOf(f.name).lab} ${todoSizeTxt(f.size)}` }));
});
const dImgs = computed(() => (detailTodo.value?.files ?? []).filter((f) => f.kind === 'image'));
const dVids = computed(() => (detailTodo.value?.files ?? []).filter((f) => f.kind === 'video'));
/* 页签组随实例态：驳回＝驳回原因/事项/处理流程；已处理＝处理结果/事项/处理流程；其余＝事项/处理流程；
   存在转交原因时（我转交出去 / 别人转交给我 / 多人任务中被转交的处理人）插入「转交原因」页签 */
const dIsReject = computed(() => (dHandler.value ? dHandler.value.flow === '驳回' : detailTodo.value?.status === '驳回'));
const dIsDone = computed(() => (dHandler.value ? dHandler.value.flow === '已处理' : detailTodo.value?.flow === '已处理'));
const dTransferReason = computed(() => {
  const h = dHandler.value;
  if (h) return h.transferFrom ? h.transferReason ?? '' : '';
  const t = detailTodo.value;
  return t?.status === '转交' ? t.transferReason ?? '' : '';
});
const dTabs = computed(() => {
  const tabs: string[] = [];
  if (dIsReject.value) tabs.push('驳回原因');
  else if (dIsDone.value) tabs.push('处理结果');
  tabs.push('事项');
  if (dTransferReason.value) tabs.push('转交原因');
  tabs.push('处理流程');
  return tabs;
});
const defaultTab = () => (dIsReject.value ? '驳回原因' : dIsDone.value ? '处理结果' : '事项');
/* 事项页签「关联商品」：创建任务时选定的商品，点击跳店铺监控·店铺商品并按商品ID查询 */
const dGoods = computed<ShopGood[]>(() => detailTodo.value?.goods ?? []);
const openGood = (g: ShopGood) => {
  shopGoodsJumpSeed.value = { q: g.id };
  emit('jump-goods', g);
};
watch(detailId, () => {
  hKw.value = '';
  hSt.value = '全部';
  hIdx.value = 0;
  dTab.value = defaultTab();
});
watch(hIdx, () => { dTab.value = defaultTab(); });

/* ---------- 处理流程时间轴（参考钉钉：节点名＋时间＋处理人＋说明） ---------- */
interface FlowNode { title: string; time?: string; person?: { name: string; chain: string }; desc?: string; /** 转交原因：独立成行展示（原因必填，处理流程留痕） */ reason?: string; state: 'done' | 'current' | 'reject' | 'revoke'; }
const ME = { name: '七妮妮', chain: '杭州分公司–项目组–产品部' };
const splitWho = (s: string) => ({ name: s.split('–')[0], chain: s.split('–').slice(1).join('–') });
const flowNodes = computed<FlowNode[]>(() => {
  const t = detailTodo.value;
  if (!t) return [];
  const nodes: FlowNode[] = [{ title: '发起待办', time: t.time, person: t.mine ? ME : { name: t.from?.name ?? '', chain: t.from?.group ?? '' }, state: 'done' }];
  const h = dHandler.value;
  const who = h ? { name: h.name, chain: h.chain } : { name: t.to ?? t.toList?.[0] ?? '', chain: '杭州分公司–项目组–产品部' };
  if (h?.transferFrom) nodes.push({ title: '转交', time: h.transferTime, person: splitWho(h.transferFrom), desc: `转交给 ${h.name}`, reason: h.transferReason, state: 'done' });
  if (!h && t.status === '转交') nodes.push({ title: '转交', time: t.transferTime, person: ME, desc: `转交给 ${t.transferTo ?? ''}`, reason: t.transferReason, state: 'done' });
  if (h?.flow === '驳回') nodes.push({ title: '驳回', time: h.sub, person: who, desc: h.rejectReason, state: 'reject' });
  if (!h && t.status === '驳回') nodes.push({ title: '驳回', time: t.rejectTime, person: ME, desc: t.rejectReason, state: 'reject' });
  if (h?.flow === '已处理') nodes.push({ title: '处理完成', time: h.sub, person: who, state: 'done' });
  if (!h && t.flow === '已处理') nodes.push({ title: '处理完成', time: t.doneTime, person: who, state: 'done' });
  if (h?.flow === '已撤销') nodes.push({ title: '已撤销', time: h.sub, person: who, state: 'revoke' });
  if (!h && t.status === '已撤销') nodes.push({ title: '已撤销', time: t.revokeTime, person: ME, state: 'revoke' });
  const pending = h ? h.flow === '待处理' : !t.done && t.status !== '转交' && t.status !== '驳回';
  if (pending) nodes.push({ title: '待处理中', person: who, state: 'current' });
  return nodes;
});
/* 卡芯片色档：驳回红/转交紫实心（收件桶），处理中蓝/已完成绿/已撤销灰 浅底（我发起桶，参考图） */
const ST_CLS: Record<string, string> = { 转交: 'zf', 驳回: 'bh', 处理中: 'cz', 已完成: 'wc', 已撤销: 'yx' };
const HF_CLS: Record<string, string> = { 待处理: 'dcl', 已处理: 'ycl', 驳回: 'bcl', 已撤销: 'xcl' };
const HA_CLS: Record<string, string> = { 转: 'zf', 驳: 'bh', 撤: 'yx' };
/* 我发起卡收件人：多收件人叠头像前三＋「a、b、c等N人」 */
const toAvs = (t: QcTodo) => (t.toList ?? (t.to ? [t.to] : [])).slice(0, 3);
const toNames = (t: QcTodo) => (t.toList ? (t.toList.length > 1 ? `${t.toList.slice(0, 3).join('、')}等${t.toList.length}人` : t.toList[0]) : (t.to ?? ''));

/* ---------- 待办生命周期动作（用户定稿闭环）----------
   撤销＝发起人侧、接收人未处理时可用，二次确认后卡变已撤销态且动作换「修改/再次提交」；
   转交/驳回＝接收人侧（待处理桶），转交单人选人＋必填转交原因（转入人可见、处理流程留痕）、驳回必填原因，完成后卡进已处理；
   修改/再次提交＝被驳回或已撤销后重新发起，一律**另建新任务**（原任务留档在已处理桶，不改写历史）。 */
const pad2 = (n: number) => String(n).padStart(2, '0');
const nowStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
const revokeTarget = ref<QcTodo | null>(null);
const resubmitId = ref<string | null>(null);

const confirmRevoke = () => {
  const t = revokeTarget.value;
  if (!t) return;
  t.status = '已撤销';
  t.flow = '已撤销';
  t.revokeTime = nowStr();
  t.acts = ['修改', '再次提交'];
  (t.handlers ?? []).forEach((h) => {
    if (h.flow === '待处理' && !h.transferFrom) { h.flow = '已撤销'; h.subLabel = '撤销时间'; h.sub = t.revokeTime; h.act = undefined; }
  });
  revokeTarget.value = null;
  pushToast('待办已撤销');
};
/* 驳回/转交＝抽屉内联表单提交（与处理同语言）：原因必填、附件随原因留痕（rejectAtt/transferAtt），完成后卡进已处理 */
const onHandleActSubmit = (p: { act: '驳回' | '转交'; reason: string; transferTo: string; files: TodoFile[] }) => {
  const t = handleTodo.value;
  if (!t) return;
  const atts = p.files.map((f) => ({ name: f.name, sub: `${todoFileMetaOf(f.name).lab} ${todoSizeTxt(f.size)}` }));
  t.done = true;
  t.acts = [];
  if (p.act === '驳回') {
    t.status = '驳回';
    t.rejectReason = p.reason;
    t.rejectAtt = atts.length ? atts : undefined;
    t.rejectTime = nowStr();
    handleTodo.value = null;
    pushToast('已驳回');
  } else {
    t.status = '转交';
    t.transferTo = p.transferTo;
    t.transferReason = p.reason;
    t.transferAtt = atts.length ? atts : undefined;
    t.transferTime = nowStr();
    handleTodo.value = null;
    pushToast(`已转交给 ${p.transferTo}`);
  }
};
const onAct = (t: QcTodo, a: string) => {
  if (a === '撤销') revokeTarget.value = t;
  else if (a === '修改') openResubmit(t);
  else if (a === '再次提交') resubmitDirect(t);
  else if (a === '转交') { handleMode.value = 'view'; handleInitAct.value = '转交'; handleTodo.value = t; }
  else if (a === '驳回') { handleMode.value = 'view'; handleInitAct.value = '驳回'; handleTodo.value = t; }
  else if (a === '处理') { handleMode.value = 'handle'; handleTodo.value = t; }
};
/* ---------- 详情底栏五态闭环（用户定稿）：待处理=处理/转交/驳回(待处理抽屉)；已处理=关闭；
   我发起别人待处理=撤销/催办/关闭；我发起别人已处理=关闭；我发起别人驳回(含撤销)=修改/再次提交/关闭 ---------- */
/* 再次提交（不进抽屉）：以原待办信息**另建一条新任务**，原任务保持驳回/撤销态留档，历史不被改写 */
const resubmitDirect = (t: QcTodo) => {
  const names = t.toList ?? (t.to ? [t.to] : []);
  const nt = todoFromDraft({
    title: t.title,
    priority: prioOf(t),
    body: t.body,
    files: (t.files ?? []).map((f) => ({ ...f })),
    goods: [...(t.goods ?? [])],
    shops: t.shops ? [...t.shops] : undefined,
    senders: names.map((n) => ({ name: n })),
    deadline: t.deadline ?? '',
    type: t.type,
  });
  QC_TODOS.push(nt);
  if (detailId.value === t.id) detailId.value = nt.id;
  pushToast(`已重新发起（新任务 ${nt.id}）`);
};
const dFootActs = computed<string[]>(() => {
  const t = detailTodo.value;
  if (!t) return [];
  if (!t.mine) return ['关闭'];
  if (t.status === '驳回' || t.status === '已撤销') return ['修改', '再次提交', '关闭'];
  if (t.flow === '已处理') return ['关闭'];
  return ['撤销', '催办', '关闭'];
});
const onDetailAct = (a: string) => {
  const t = detailTodo.value;
  if (!t) return;
  if (a === '关闭') detailId.value = null;
  else if (a === '撤销') revokeTarget.value = t;
  else if (a === '修改') openResubmit(t);
  else if (a === '再次提交') resubmitDirect(t);
  else if (a === '催办') pushToast(`已催办 ${toNames(t)}`);
};
/* 待处理查看态动作接线：处理/提交切处理态；转交/驳回由抽屉内联表单填写（不再弹窗） */
const onHandleAct = (a: string) => {
  const t = handleTodo.value;
  if (!t) return;
  if (a === '处理' || a === '提交') { handleInitAct.value = ''; handleMode.value = 'handle'; }
};
/* ---------- 待处理右抽屉（参考图 待办/待处理/处理）：处理钮＝处理态（含输入区），待处理卡点击＝查看态（只读） ----------
   与新增（发起待办抽屉）、我发起详情抽屉三者入口互不混用 */
const handleTodo = ref<QcTodo | null>(null);
const handleMode = ref<'handle' | 'view'>('view');
/* 卡侧转交/驳回钮：直接开查看态抽屉并预开对应内联表单（与抽屉内点钮同一路径） */
const handleInitAct = ref<'' | '驳回' | '转交'>('');
const onCardClick = (t: QcTodo) => {
  if (pill.value === '待处理') { handleMode.value = 'view'; handleInitAct.value = ''; handleTodo.value = t; return; }
  detailId.value = t.id;
};
/* 提交处理：回写完结态，卡离开待处理进入已处理 */
const onHandled = (p: { reply: string; files: TodoFile[] }) => {
  const t = handleTodo.value;
  if (!t) return;
  t.done = true;
  t.status = '已完成';
  t.flow = '已处理';
  t.doneTime = nowStr();
  t.result = p.reply;
  t.resultAtt = p.files.map((f) => ({ name: f.name, sub: todoSizeTxt(f.size) }));
  t.acts = [];
  handleTodo.value = null;
  pushToast('已处理');
};
/* 重新提交回填：取该待办上次发起的信息；收件人按姓名回通讯录匹配，通讯录外的历史收件人按姓名占位保留 */
const asMember = (name: string): Member => ({
  id: `todo-${name}`,
  name,
  account: '',
  phone: '',
  status: 'normal',
  dept: '',
  deptId: null,
  roles: [],
  addBy: '',
  addAt: '',
});
/* 修改＝打开发起抽屉并回填上次信息（标题/内容/优先级/附件/关联商品/发送人/最迟时间），提交后**另建新任务** */
const openResubmit = (t: QcTodo) => {
  const names = t.toList ?? (t.to ? [t.to] : []);
  resubmitId.value = t.id;
  resubmitInit.value = {
    title: t.title,
    body: t.body,
    priority: prioOf(t),
    files: (t.files ?? []).map((f) => ({ ...f })),
    goods: [...(t.goods ?? [])],
    shops: t.shops ? [...t.shops] : undefined,
    senders: names.map((n) => INITIAL_MEMBERS.find((m) => m.name === n) ?? asMember(n)),
    deadline: t.deadline ?? '',
  };
  createOpen.value = true;
};
const resubmitInit = ref<Partial<TodoCreatePayload> | null>(null);
/* 发起待办 / 修改后提交：统一新建一条「我发起·待处理」待办（快捷创建入口同构），
   并把列表切到「我发起的」让新建结果即时可见；抽屉内修改后提交同样新建，原任务留档 */
const onCreated = (p: TodoCreatePayload) => {
  createOpen.value = false;
  const src = QC_TODOS.find((x) => x.id === resubmitId.value);
  resubmitId.value = null;
  resubmitInit.value = null;
  const nt = todoFromDraft({
    title: p.title,
    priority: p.priority,
    body: p.body,
    files: p.files,
    goods: p.goods,
    senders: p.senders,
    deadline: p.deadline,
    type: p.type || src?.type,
    optPlan: p.optPlan,
    optEnd: p.optEnd,
    optCycle: p.optCycle,
    shops: p.shops,
    autoTo: p.senders.length ? undefined : '接待段',
  });
  QC_TODOS.push(nt);
  /* 优化任务周期/放宽售后区间写回商品（挂优化中标签＋趋势色带），与监控列表/店铺商品入口同口径 */
  if (p.optCycle) p.goods.forEach((gd) => { gd.optTask = { ...p.optCycle!, todoId: nt.id }; });
  detailId.value = nt.id;
  pill.value = '我发起';
};

/* 待处理角标＝未完结且非本人发起（对齐参考图红标「3」） */
const pendingBadge = computed(() => QC_TODOS.filter((t) => !t.done && !t.mine).length);

const list = computed(() =>
  QC_TODOS.filter((t) => todoBuckets(t).includes(pill.value))
    .filter((t) => typeTab.value === '全部' || t.type === typeTab.value)
    .filter((t) => {
      if (sel.value === '全部') return true;
      return pill.value === '我发起' ? (t.flow ?? '待处理') === sel.value : prioOf(t) === sel.value;
    })
    .filter((t) => {
      const q = kw.value.trim();
      if (!q) return true;
      const who = pill.value === '我发起' ? (t.toList ?? (t.to ? [t.to] : [])) : [t.from?.group ?? '', t.from?.name ?? ''];
      return [t.title, ...who].some((s) => s.includes(q));
    }),
);

/* 头像：无照片素材池，取姓氏首字色块圆（22px） */
const AVA_COLORS = ['#5b8ff9', '#61c0a2', '#f0a868', '#9270ca'];
const avaColor = (name: string) => AVA_COLORS[(name.charCodeAt(0) || 0) % AVA_COLORS.length];
/* 卡面商品展示（商品优化关联商品）：商品图取模素材池、平台官方图标、店铺名、商品名称 */
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const goodThumb = (g: ShopGood) => GOOD_THUMBS[Number(g.id) % GOOD_THUMBS.length];
const goodShop = (g: ShopGood) => qcShops.value.find((s) => s.id === g.shopId);
const goodPlat = (g: ShopGood): ShopPlat => goodShop(g)?.platform ?? '淘宝';
/* 卡面素材单类型展示：有范围（商品优化＝商品卡、店铺优化＝店铺芯片）只展示范围行；
   未选商品/店铺的任务才展示附件行（文件＞视频＞图片）；各行至多五个，超出第五块黑遮罩＋N */
interface MatTile { key: string; kind: 'good' | 'shop' | 'file' | 'video' | 'image'; g?: ShopGood; s?: TodoShop; f?: TodoFile; mask?: boolean; maskN?: number; }
const MAT_MAX = 5;
const capTiles = (list: MatTile[]): MatTile[] => {
  if (list.length <= MAT_MAX) return list;
  const shown = list.slice(0, MAT_MAX);
  shown[MAT_MAX - 1] = { ...shown[MAT_MAX - 1], mask: true, maskN: list.length - MAT_MAX };
  return shown;
};
const scopeTiles = (t: QcTodo): MatTile[] => capTiles(
  t.type === '店铺优化'
    ? (t.shops ?? []).map((s) => ({ key: `s-${s.id}`, kind: 'shop' as const, s }))
    : (t.goods ?? []).map((g) => ({ key: `g-${g.id}`, kind: 'good' as const, g })),
);
const attTiles = (t: QcTodo): MatTile[] => {
  const fs = t.files ?? [];
  return capTiles([
    ...fs.filter((f) => f.kind === 'file').map((f) => ({ key: f.id, kind: 'file' as const, f })),
    ...fs.filter((f) => f.kind === 'video').map((f) => ({ key: f.id, kind: 'video' as const, f })),
    ...fs.filter((f) => f.kind === 'image').map((f) => ({ key: f.id, kind: 'image' as const, f })),
  ]);
};
const isPrimary = (t: QcTodo, i: number) => i === t.acts.length - 1;

/* ---------- 类型页签溢出折叠（参考图「待办类型 ≡ ···」）：仅当类型展示不完时出现折叠态 ----------
   折叠态＝「待办类型」文字标＋列设置 icon＋「···」更多钮（点开气泡列出被收起的类型）；
   宽度足够时全部类型平铺、折叠态整体隐藏。测量口径：筛选行可用宽＝行宽－右侧操作组宽，
   逐类型累加页签宽（26px 间距）直到放不下即截断。 */
const filterRef = ref<HTMLElement | null>(null);
const typerowRef = ref<HTMLElement | null>(null);
const fitCount = ref(TODO_TYPES.length);
const typesOverflow = computed(() => fitCount.value < TODO_TYPES.length);
const moreOpen = ref(false);
/* 折叠态自身占宽（待办类型标 + 两 icon + 间距），测量时为它预留 */
const MORE_W = 108;
/* 页签宽只在全量可见时测一次缓存（折叠后 display:none 测宽为 0 会致往复抖动） */
const tabWs = ref<number[]>([]);
const recalcFit = (depth = 0) => {
  const row = typerowRef.value;
  const box = filterRef.value;
  if (!row || !box) return;
  if (!tabWs.value.length) tabWs.value = [...row.querySelectorAll<HTMLElement>('.tc-typeitem')].map((el) => el.getBoundingClientRect().width);
  const right = box.querySelector('.qc-todo-fright');
  /* 三分栏换行态：页签独占一行（操作组顶边落到页签行底边之下），可用宽＝整行宽，不再扣右侧操作组；
     同排时两组因居中对齐顶边本就有几像素差，故以「行底边」判定而非顶边相等 */
  const wrapped = right ? right.getBoundingClientRect().top >= row.getBoundingClientRect().bottom - 4 : false;
  const avail = wrapped ? box.clientWidth : box.clientWidth - (right ? right.getBoundingClientRect().width : 0) - 10;
  const gap = 26;
  /* 折叠簇实测宽（待办类型标＋列设置 icon＋···钮＋间距）；未渲染时取保守常量 */
  const lab = row.querySelector<HTMLElement>('.qc-todo-morelabel');
  const colIc = row.querySelector<HTMLElement>('.qc-todo-ficon[disabled]');
  const wrap = row.querySelector<HTMLElement>('.qc-todo-morewrap');
  const moreW = lab && wrap ? lab.getBoundingClientRect().width + (colIc?.getBoundingClientRect().width ?? 0) + wrap.getBoundingClientRect().width + gap * 2 : MORE_W;
  const sumAll = tabWs.value.reduce((a, w, i) => a + w + (i ? gap : 0), 0);
  /* 折叠簇渲染前后实测宽不同（常量估算偏小）：计数变化后再补一帧重算直至收敛，避免页签溢出压到操作组 */
  const settle = (next: number) => {
    if (next === fitCount.value) return;
    fitCount.value = next;
    if (depth < 3) requestAnimationFrame(() => recalcFit(depth + 1));
  };
  if (sumAll <= avail) {
    settle(tabWs.value.length);
    return;
  }
  let used = 0;
  let n = 0;
  for (let i = 0; i < tabWs.value.length; i++) {
    const next = used + (i ? gap : 0) + tabWs.value[i];
    if (next + gap + moreW > avail) break;
    used = next;
    n = i + 1;
  }
  settle(Math.max(1, n));
};
const onMoreOutside = (e: MouseEvent) => {
  if (!moreOpen.value) return;
  const el = e.target as HTMLElement;
  if (!el.closest('.qc-todo-morewrap')) moreOpen.value = false;
};
const onResize = () => recalcFit();
onMounted(() => {
  recalcFit();
  requestAnimationFrame(() => recalcFit(1));
  window.addEventListener('resize', onResize);
  document.addEventListener('mousedown', onMoreOutside);
  document.addEventListener('mousedown', onFiltOutside);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  document.removeEventListener('mousedown', onMoreOutside);
  document.removeEventListener('mousedown', onFiltOutside);
});
</script>

<template>
  <div class="qc-todo-page">
    <div class="qc-todo-main">
    <!-- 顶部页签：居中下划线语言（消息中心壳；动态表单已删） -->
    <div class="qc-todo-toptabs">
      <button
        v-for="t in TOP_TABS"
        :key="t"
        type="button"
        class="qc-todo-toptab"
        :class="{ active: topTab === t }"
        @click="topTab = t"
      >{{ t }}</button>
    </div>

    <template v-if="topTab === '任务待办'">
      <!-- 三桶胶囊：待处理带红角标，其余带人形 icon -->
      <div class="qc-todo-pillrow">
        <div class="qc-todo-pill">
          <button
            v-for="p in PILLS"
            :key="p.key"
            type="button"
            :class="{ active: pill === p.key }"
            @click="pill = p.key"
          >
            <span v-if="p.key === '待处理' && pendingBadge" class="bdg">{{ pendingBadge }}</span>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            {{ p.label }}
          </button>
        </div>
      </div>

      <!-- 筛选行：左类型下划线页签（展示不完时折叠为「待办类型 ≡ ···」）＋右搜索/日期/状态/发起待办 -->
      <div ref="filterRef" class="qc-todo-filter">
        <div ref="typerowRef" class="tc-typerow">
          <button
            v-for="(t, i) in TODO_TYPES"
            :key="t"
            v-show="i < fitCount"
            type="button"
            class="tc-typeitem"
            :class="{ active: typeTab === t }"
            @click="typeTab = t"
          >{{ t }}</button>
          <!-- 折叠态：类型展示不完时出现；「···」点开气泡选被收起的类型 -->
          <template v-if="typesOverflow">
            <span class="qc-todo-morelabel">待办类型</span>
            <button type="button" class="qc-todo-ficon" disabled title="列设置">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </button>
            <span class="qc-todo-morewrap">
              <button type="button" class="qc-todo-ficon" title="更多待办类型" @click="moreOpen = !moreOpen">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
                </svg>
              </button>
              <div v-if="moreOpen" class="qc-todo-moremenu">
                <button
                  v-for="t in TODO_TYPES"
                  :key="t"
                  type="button"
                  :class="{ active: typeTab === t }"
                  @click="typeTab = t; moreOpen = false"
                >{{ t }}</button>
              </div>
            </span>
          </template>
        </div>
        <div class="qc-todo-fright">
          <button v-if="!filtOpen" type="button" class="qc-todo-fs-fold" title="发件人、标题名称 / 时间范围 / 状态" @click="openFilt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>
          </button>
          <span v-else ref="filtWrapRef" class="qc-todo-filt">
            <span class="sg-inputwrap qc-todo-search">
              <input ref="kwRef" v-model="kw" class="sg-input" :placeholder="kwPh" />
              <button v-if="kw" type="button" class="sg-clear" title="清除" @click="kw = ''">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
              <svg class="mag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <button type="button" class="qc-todo-ficon qc-todo-cal" title="时间范围">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            </button>
            <BubbleSelect class-name="sg-select" :value="sel" :options="selOpts" @change="(v: string) => (sel = v)" />
          </span>
          <button type="button" class="qc-todo-new" @click="createOpen = true">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
            发起待办
          </button>
        </div>
      </div>

      <!-- 待办卡列表 -->
      <div class="qc-todo-list">
        <div
          v-for="t in list"
          :key="t.id"
          class="qc-todo-card clickable"
          @click="onCardClick(t)"
        >
          <div class="td-head">
            <span v-if="t.status" class="td-st" :class="ST_CLS[t.status] ?? 'bh'">{{ t.status }}</span>
            <b class="td-title">{{ t.title }}</b>
            <span v-if="prioOf(t) !== '普通'" class="td-urgent" :class="PRIO_CLS[prioOf(t)] ?? ''">
              <i v-if="prioOf(t) === '特急'">🔥</i>{{ prioOf(t) }}
            </span>
            <!-- 卡右列：时间在上；多人处理任务带处理进度（进度条 + 已处理/需处理） -->
            <span class="td-right">
              <span class="td-time">{{ t.time }}</span>
              <span
                v-if="t.progress"
                class="td-prog"
                :title="`多人处理进度：已处理 ${t.progress.done} / 需处理 ${t.progress.total}`"
              >
                <i class="td-prog-bar"><b :style="{ width: `${Math.min(100, (t.progress.done / t.progress.total) * 100)}%` }" /></i>
                <em>{{ t.progress.done }}/{{ t.progress.total }}</em>
              </span>
            </span>
          </div>
          <div class="td-body">{{ t.body }}</div>
          <div class="td-foot">
            <div class="td-main">
              <!-- 卡面素材单类型：范围行（商品卡/店铺芯片）与附件行互斥——有范围只展示范围，未选商品才展示文件/视频/图片 -->
              <div v-if="scopeTiles(t).length || attTiles(t).length" class="td-meta">
                <div v-if="scopeTiles(t).length" class="td-row">
                  <span v-for="m in scopeTiles(t)" :key="m.key" class="td-tile" :class="{ more: m.mask }">
                    <div v-if="m.kind === 'good' && m.g" class="td-good">
                      <img class="tg-thumb" :src="goodThumb(m.g)" :alt="m.g.name" :title="m.g.name">
                      <span class="tg-info">
                        <span class="tg-name" :title="m.g.name">{{ m.g.name }}</span>
                        <span class="tg-sub"><em>商品ID：</em><b>{{ m.g.id }}</b></span>
                        <span class="tg-sub">
                          <em>店铺：</em>
                          <span class="tg-plat"><img :src="SHOP_LOGO[goodPlat(m.g)]" :alt="goodPlat(m.g)"></span>
                          <span class="tg-shop">{{ goodShop(m.g)?.name ?? '' }}</span>
                        </span>
                      </span>
                    </div>
                    <span v-else-if="m.kind === 'shop' && m.s" class="td-shop" :title="m.s.name">
                      <span class="ts-plat"><img :src="SHOP_LOGO[m.s.platform]" :alt="m.s.platform"></span>
                      <b>{{ m.s.name }}</b>
                    </span>
                    <i v-if="m.mask" class="td-more">+{{ m.maskN }}</i>
                  </span>
                </div>
                <div v-else-if="attTiles(t).length" class="td-row">
                  <span v-for="m in attTiles(t)" :key="m.key" class="td-tile" :class="{ more: m.mask }">
                    <img v-if="m.kind === 'image' && m.f" class="td-thumb" :src="m.f.url" :alt="m.f.name" :title="m.f.name">
                    <span v-else-if="m.kind === 'video' && m.f" class="td-thumb video" :title="m.f.name">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
                    </span>
                    <span v-else-if="m.f" class="td-file" :title="m.f.name">
                      <svg class="tf-ic" :style="{ color: todoFileMetaOf(m.f.name).color }" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                      <span class="tf-tx"><b>{{ m.f.name }}</b><i>{{ todoFileMetaOf(m.f.name).lab }} {{ todoSizeTxt(m.f.size) }}</i></span>
                    </span>
                    <i v-if="m.mask" class="td-more">+{{ m.maskN }}</i>
                  </span>
                </div>
              </div>
              <div class="td-who">
                <template v-if="t.mine">
                  <span class="td-send">发送至</span>
                  <span class="td-avas">
                    <span v-for="(n, i) in toAvs(t)" :key="`${n}-${i}`" class="td-ava" :style="{ background: avaColor(n) }">{{ n.charAt(0) }}</span>
                  </span>
                  <span class="td-name">{{ toNames(t) }}</span>
                </template>
                <template v-else>
                  <span class="td-ava" :style="{ background: avaColor(t.from?.name ?? '') }">{{ (t.from?.name ?? '').charAt(0) }}</span>
                  <span class="td-name">{{ t.from?.group }} {{ t.from?.name }}</span>
                </template>
                <span v-if="t.tag" class="td-tag ai">{{ t.tag }}</span>
              </div>
            </div>
            <div class="td-acts">
              <button
                v-for="(a, i) in t.acts"
                :key="a"
                type="button"
                :class="{ primary: isPrimary(t, i) }"
                @click.stop="onAct(t, a)"
              >{{ a }}</button>
            </div>
          </div>
        </div>
      </div>
    </template>
    </div>

    <!-- 任务详情统一抽屉展示（用户定稿「所有任务都是抽屉的形式展示」）：遮罩＋右抽屉；
         多人任务抽屉内左侧处理人列（图二结构移入抽屉），右侧详情本体 -->
    <div v-if="detailTodo" class="drawer-mask" @click="detailId = null"></div>
    <div v-if="detailTodo" class="drawer qc-todo-page-drawer" :class="{ multi: isMulti }">
      <div v-if="isMulti" class="qc-todo-handlers">
        <div class="qh-head"><b>{{ detailTodo?.title }}</b><span class="qh-cnt">{{ hDone }}/{{ hTotal }}</span></div>
        <div class="qh-filter">
          <span class="sg-inputwrap qc-todo-search">
            <input v-model="hKw" class="sg-input" placeholder="搜索">
            <svg class="mag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <BubbleSelect class-name="sg-select" :value="hSt" :options="H_OPTS" @change="(v: string) => (hSt = v)" />
        </div>
        <div class="qh-list">
          <div v-for="(h, i) in hRows" :key="h.name" class="qh-card" :class="{ on: hIdx === i }" @click="hIdx = i">
            <div class="qh-who">
              <span class="td-ava" :style="{ background: avaColor(h.name) }">{{ h.name.charAt(0) }}</span>
              <b>{{ h.name }}–{{ h.chain }}</b>
            </div>
            <div class="qh-t">发起时间:{{ h.faqi }}</div>
            <div v-if="h.sub" class="qh-sub">{{ h.subLabel }}:{{ h.sub }}</div>
            <div class="qh-strow">
              <span class="qh-st" :class="HF_CLS[h.flow]">{{ h.flow }}</span>
              <span v-if="h.act" class="qh-act" :class="HA_CLS[h.act]">{{ h.act }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="qc-todo-detail">
      <button type="button" class="qd-close" title="关闭" @click="detailId = null">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
      <div class="qd-id">消息id： {{ detailTodo.msgId }}</div>
      <div class="qd-title">
        {{ detailTodo.title }}
        <span v-if="prioOf(detailTodo) === '特急'" class="qd-urgent"><i>🔥</i>特急</span>
        <span v-if="dStatus" class="qd-st" :class="dStatus === '转交' ? 'zf' : 'bh'">{{ dStatus }}</span>
      </div>
      <div class="qd-sender">
        <span class="qd-ava" :style="{ background: avaColor(dPerson.name) }">{{ dPerson.name.charAt(0) }}</span>
        <b>{{ dPerson.name }}–{{ dPerson.chain }}</b>
      </div>
      <template v-for="r in dRows" :key="r.lab">
        <div class="qd-lab">{{ r.lab }}</div>
        <div class="qd-val">{{ r.val }}</div>
      </template>
      <div class="qd-tabs">
        <button v-for="tb in dTabs" :key="tb" type="button" :class="{ on: dTab === tb }" @click="dTab = tb">{{ tb }}</button>
      </div>
      <div v-if="dTab === '驳回原因'" class="qd-body">
        <div class="qd-text">{{ dRejectReason }}</div>
        <template v-if="detailTodo.rejectAtt?.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in detailTodo.rejectAtt" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
      </div>
      <div v-else-if="dTab === '处理结果'" class="qd-body">
        <div class="qd-text">{{ detailTodo.result }}</div>
        <template v-if="detailTodo.resultAtt?.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in detailTodo.resultAtt" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
      </div>
      <div v-else-if="dTab === '转交原因'" class="qd-body">
        <div class="qd-text">{{ dTransferReason }}</div>
        <template v-if="detailTodo.transferAtt?.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in detailTodo.transferAtt" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
      </div>
      <div v-else-if="dTab === '事项'" class="qd-body">
        <div class="qd-text">{{ detailTodo.body }}</div>
        <template v-if="dAtts.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in dAtts" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
        <template v-if="dImgs.length || dVids.length">
          <div class="qhd-div" />
          <template v-if="dImgs.length">
            <div class="qd-lab2">图片：</div>
            <div class="qd-imgs">
              <img v-for="f in dImgs" :key="f.id" class="qd-img real" :src="f.url" :alt="f.name" :title="f.name">
            </div>
          </template>
          <template v-if="dVids.length">
            <div class="qd-lab2">视频：</div>
            <div class="qd-imgs">
              <span v-for="f in dVids" :key="f.id" class="td-thumb video" :title="f.name">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </div>
          </template>
        </template>
        <template v-if="dGoods.length">
          <div class="qhd-div" />
          <div class="qd-lab2">关联商品：</div>
          <div class="qd-goods">
            <button
              v-for="g in dGoods"
              :key="g.id"
              type="button"
              class="td-good"
              :title="`在店铺商品中查看 ${g.name}`"
              @click="openGood(g)"
            >
              <img class="tg-thumb" :src="goodThumb(g)" :alt="g.name">
              <span class="tg-info">
                <span class="tg-name" :title="g.name">{{ g.name }}</span>
                <span class="tg-sub"><em>商品ID：</em><b>{{ g.id }}</b></span>
                <span class="tg-sub">
                  <em>店铺：</em>
                  <span class="tg-plat"><img :src="SHOP_LOGO[goodPlat(g)]" :alt="goodPlat(g)"></span>
                  <span class="tg-shop">{{ goodShop(g)?.name ?? '' }}</span>
                </span>
              </span>
            </button>
          </div>
        </template>
      </div>
      <div v-else class="qd-body">
        <!-- 处理流程时间轴（钉钉节点式）：头像即节点＋状态角标＋竖线；节点名＋时间右对齐；处理人＋括号说明 -->
        <div class="qf-list">
          <div v-for="(n, i) in flowNodes" :key="`${n.title}-${i}`" class="qf-node" :class="n.state">
            <div class="qf-ava">
              <span class="td-ava" :style="{ background: avaColor(n.person?.name ?? '') }">{{ (n.person?.name ?? '').charAt(0) }}</span>
              <i class="qf-badge" />
              <b v-if="i < flowNodes.length - 1" class="qf-line" />
            </div>
            <div class="qf-main">
              <div class="qf-head"><b>{{ n.title }}</b><span v-if="n.time">{{ n.time }}</span></div>
              <div v-if="n.person" class="qf-person">{{ n.person.name }}–{{ n.person.chain }}<i v-if="n.desc">（{{ n.desc }}）</i></div>
              <div v-if="n.reason" class="qf-reason">转交原因：{{ n.reason }}</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 底栏五态（用户定稿）：按钮置底、按实例态出动作，全部接线闭环 -->
      <div class="qd-foot">
        <button v-for="a in dFootActs" :key="a" type="button" class="btn" :class="{ primary: a === '关闭' }" @click="onDetailAct(a)">{{ a }}</button>
      </div>
      </div>
    </div>

    <!-- 发起待办抽屉（重新提交时回填上次信息） -->
    <!-- 待处理右抽屉：处理态（参考图含AI反馈表单与处理输入区）/查看态只读 -->
    <QcTodoHandleDrawer v-if="handleTodo" :todo="handleTodo" :mode="handleMode" :initial-act="handleInitAct || undefined" @close="handleTodo = null; handleInitAct = ''" @submit="onHandled" @act="onHandleAct" @act-submit="onHandleActSubmit" @open-good="openGood" />

    <!-- 发起待办抽屉（重新提交时回填上次信息） -->
    <QcTodoCreateDrawer v-if="createOpen" :initial="resubmitInit ?? undefined" @close="createOpen = false; resubmitId = null; resubmitInit = null" @created="onCreated" />

    <!-- 撤销二次确认（不可逆动作防误触） -->
    <Modal v-if="revokeTarget" title="撤销待办" @close="revokeTarget = null">
      <div class="qc-todo-confirm">撤销后该待办将从接收人的待处理中移除，你可重新提交。确认撤销「{{ revokeTarget.title }}」？</div>
      <template #foot>
        <button class="btn" @click="revokeTarget = null">取消</button>
        <button class="btn primary" @click="confirmRevoke">确认撤销</button>
      </template>
    </Modal>
  </div>
</template>
