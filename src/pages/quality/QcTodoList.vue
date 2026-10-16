<script setup lang="ts">
/* ---------- 品控·线上·待办任务（任务待办 · 待处理）----------
   高还原参考图：顶部页签（消息通知/任务待办；动态表单已按用户指令删除）＋三桶胶囊（待处理的/已处理的/我发起的）
   ＋类型下划线页签行（含搜索/日期/状态/发起待办）＋待办卡列表（状态芯片/特急/附件/发起人/动作钮）。
   当前仅还原「待处理」页；其余页签/桶为后续页面，切换后列表区暂空。 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import { INITIAL_MEMBERS, type Member } from '../permission/data';
import QcAssignModal from './QcAssignModal.vue';
import QcTodoCreateDrawer, { type TodoCreatePayload } from './QcTodoCreateDrawer.vue';
import { QC_TODOS, TODO_PRIORITIES, TODO_TYPES, todoBuckets, todoSizeTxt, type QcTodo, type TodoPriority } from './qcTodoData';

type TopTab = '消息通知' | '任务待办';
type Pill = '待处理' | '已处理' | '我发起';

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
/* 发起待办抽屉开关；提交口径见 onCreated（重新提交回填列表） */
const createOpen = ref(false);

/* ---------- 我发起三态（参考图一/二/三）：点我发起卡→右侧详情分栏；多人任务→左栏钻取处理人列表 ----------
   图一 别人已处理：详情首签「处理结果」(回复＋处理时间)；图二 待人未处理：首签「事项」＋底栏 发送提醒/下派；
   图三 多人任务：左栏＝标题+已处理/总数＋搜索+状态＋处理人卡(发起时间/次行时间/状态字/动作芯片)，右栏详情。 */
const detailId = ref<string | null>(null);
const detailTodo = computed(() => QC_TODOS.find((t) => t.id === detailId.value) ?? null);
const isMulti = computed(() => (detailTodo.value?.handlers?.length ?? 0) > 0);
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
  return { name: detailTodo.value?.to ?? '', chain: '杭州分公司–项目组–产品部' };
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
  const rows = [{ lab: '发起时间', val: t.time }];
  if (h?.transferFrom) rows.push({ lab: '原处理人', val: h.transferFrom }, { lab: '转交时间', val: h.transferTime ?? '' });
  if (h?.flow === '驳回') rows.push({ lab: '驳回时间', val: h.sub ?? '' });
  if (h?.flow === '已处理') rows.push({ lab: '处理时间', val: h.sub ?? '' });
  if (!h && t.status === '转交') rows.push({ lab: '原处理人', val: '我' }, { lab: '转交时间', val: t.transferTime ?? '' });
  if (!h && t.status === '驳回') rows.push({ lab: '驳回时间', val: t.rejectTime ?? '' });
  if (!h && t.flow === '已处理') rows.push({ lab: '处理时间', val: t.doneTime ?? '' });
  return rows;
});
const dRejectReason = computed(() => dHandler.value?.rejectReason ?? detailTodo.value?.rejectReason ?? '');
/* 页签组随实例态：驳回＝驳回原因/事项/处理流程；已处理＝处理结果/事项/处理流程；其余＝事项/处理流程 */
const dIsReject = computed(() => (dHandler.value ? dHandler.value.flow === '驳回' : detailTodo.value?.status === '驳回'));
const dIsDone = computed(() => (dHandler.value ? dHandler.value.flow === '已处理' : detailTodo.value?.flow === '已处理'));
const dTabs = computed(() => (dIsReject.value ? ['驳回原因', '事项', '处理流程'] : dIsDone.value ? ['处理结果', '事项', '处理流程'] : ['事项', '处理流程']));
const defaultTab = () => (dIsReject.value ? '驳回原因' : dIsDone.value ? '处理结果' : '事项');
watch(detailId, () => {
  hKw.value = '';
  hSt.value = '全部';
  hIdx.value = 0;
  dTab.value = defaultTab();
});
watch(hIdx, () => { dTab.value = defaultTab(); });

/* ---------- 处理流程时间轴（参考钉钉：节点名＋时间＋处理人＋说明） ---------- */
interface FlowNode { title: string; time?: string; person?: { name: string; chain: string }; desc?: string; state: 'done' | 'current' | 'reject' | 'revoke'; }
const ME = { name: '七妮妮', chain: '杭州分公司–项目组–产品部' };
const splitWho = (s: string) => ({ name: s.split('–')[0], chain: s.split('–').slice(1).join('–') });
const flowNodes = computed<FlowNode[]>(() => {
  const t = detailTodo.value;
  if (!t) return [];
  const nodes: FlowNode[] = [{ title: '发起待办', time: t.time, person: t.mine ? ME : { name: t.from?.name ?? '', chain: t.from?.group ?? '' }, state: 'done' }];
  const h = dHandler.value;
  const who = h ? { name: h.name, chain: h.chain } : { name: t.to ?? '', chain: '杭州分公司–项目组–产品部' };
  if (h?.transferFrom) nodes.push({ title: '转交', time: h.transferTime, person: splitWho(h.transferFrom), desc: `转交给 ${h.name}`, state: 'done' });
  if (!h && t.status === '转交') nodes.push({ title: '转交', time: t.transferTime, person: ME, desc: `转交给 ${t.transferTo}`, state: 'done' });
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
const toNames = (t: QcTodo) => (t.toList ? `${t.toList.slice(0, 3).join('、')}等${t.toList.length}人` : (t.to ?? ''));

/* ---------- 待办生命周期动作（用户六条需求 1/2/3）----------
   撤销＝发起人侧、接收人未处理时可用，二次确认后卡变已撤销态且动作换「重新提交」；
   重新提交＝打开发起抽屉并回填上次信息（标题/内容/优先级/附件/发送人/最迟时间）；
   转交/驳回＝接收人侧（待处理桶），转交单人选人、驳回必填原因，完成后卡离开待处理。 */
const pad2 = (n: number) => String(n).padStart(2, '0');
const nowStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
};
const revokeTarget = ref<QcTodo | null>(null);
const rejectTarget = ref<QcTodo | null>(null);
const rejectReason = ref('');
const transferTarget = ref<QcTodo | null>(null);
const resubmitId = ref<string | null>(null);

const confirmRevoke = () => {
  const t = revokeTarget.value;
  if (!t) return;
  t.status = '已撤销';
  t.flow = '已撤销';
  t.revokeTime = nowStr();
  t.acts = ['重新提交'];
  (t.handlers ?? []).forEach((h) => {
    if (h.flow === '待处理' && !h.transferFrom) { h.flow = '已撤销'; h.subLabel = '撤销时间'; h.sub = t.revokeTime; h.act = undefined; }
  });
  revokeTarget.value = null;
  pushToast('待办已撤销');
};
const confirmReject = () => {
  const t = rejectTarget.value;
  const rs = rejectReason.value.trim();
  if (!t) return;
  if (!rs) { pushToast('请填写驳回原因', 'error'); return; }
  t.status = '驳回';
  t.rejectReason = rs;
  t.rejectTime = nowStr();
  t.done = true;
  t.acts = [];
  rejectTarget.value = null;
  pushToast('已驳回');
};
const confirmTransfer = (ms: Member[]) => {
  const t = transferTarget.value;
  if (!t || !ms.length) return;
  t.status = '转交';
  t.transferTo = ms[0].name;
  t.transferTime = nowStr();
  t.done = true;
  t.acts = [];
  transferTarget.value = null;
  pushToast(`已转交给 ${ms[0].name}`);
};
const onAct = (t: QcTodo, a: string) => {
  if (a === '撤销') revokeTarget.value = t;
  else if (a === '重新提交') openResubmit(t);
  else if (a === '转交') transferTarget.value = t;
  else if (a === '驳回') { rejectReason.value = ''; rejectTarget.value = t; }
};
/* 重新提交回填：取该待办上次发起的信息（发送人按姓名回通讯录匹配） */
const openResubmit = (t: QcTodo) => {
  const names = t.toList ?? (t.to ? [t.to] : []);
  resubmitId.value = t.id;
  resubmitInit.value = {
    title: t.title,
    body: t.body,
    priority: prioOf(t),
    files: (t.files ?? []).map((f) => ({ ...f })),
    senders: INITIAL_MEMBERS.filter((m) => names.includes(m.name)),
    deadline: t.deadline ?? '',
  };
  createOpen.value = true;
};
const resubmitInit = ref<Partial<TodoCreatePayload> | null>(null);
const onCreated = (p: TodoCreatePayload) => {
  createOpen.value = false;
  const t = QC_TODOS.find((x) => x.id === resubmitId.value);
  resubmitId.value = null;
  resubmitInit.value = null;
  if (!t) return;
  t.title = p.title;
  t.body = p.body;
  t.priority = p.priority;
  t.files = p.files;
  t.deadline = p.deadline;
  const names = p.senders.map((m) => m.name);
  t.to = names.length === 1 ? names[0] : undefined;
  t.toList = names.length === 1 ? undefined : names;
  t.status = '处理中';
  t.flow = '待处理';
  t.done = false;
  t.revokeTime = undefined;
  t.acts = ['撤销'];
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
      const who = pill.value === '我发起' ? [t.to ?? ''] : [t.from?.group ?? '', t.from?.name ?? ''];
      return [t.title, ...who].some((s) => s.includes(q));
    }),
);

/* 头像：无照片素材池，取姓氏首字色块圆（22px） */
const AVA_COLORS = ['#5b8ff9', '#61c0a2', '#f0a868', '#9270ca'];
const avaColor = (name: string) => AVA_COLORS[(name.charCodeAt(0) || 0) % AVA_COLORS.length];
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
const recalcFit = () => {
  const row = typerowRef.value;
  const box = filterRef.value;
  if (!row || !box) return;
  if (!tabWs.value.length) tabWs.value = [...row.querySelectorAll<HTMLElement>('.tc-typeitem')].map((el) => el.getBoundingClientRect().width);
  const right = box.querySelector('.qc-todo-fright');
  const avail = box.clientWidth - (right ? right.getBoundingClientRect().width : 0) - 10;
  const gap = 26;
  const sumAll = tabWs.value.reduce((a, w, i) => a + w + (i ? gap : 0), 0);
  if (sumAll <= avail) {
    fitCount.value = tabWs.value.length;
    return;
  }
  let used = 0;
  let n = 0;
  for (let i = 0; i < tabWs.value.length; i++) {
    const next = used + (i ? gap : 0) + tabWs.value[i];
    if (next + gap + MORE_W > avail) break;
    used = next;
    n = i + 1;
  }
  fitCount.value = Math.max(1, n);
};
const onMoreOutside = (e: MouseEvent) => {
  if (!moreOpen.value) return;
  const el = e.target as HTMLElement;
  if (!el.closest('.qc-todo-morewrap')) moreOpen.value = false;
};
onMounted(() => {
  recalcFit();
  requestAnimationFrame(recalcFit);
  window.addEventListener('resize', recalcFit);
  document.addEventListener('mousedown', onMoreOutside);
});
onBeforeUnmount(() => {
  window.removeEventListener('resize', recalcFit);
  document.removeEventListener('mousedown', onMoreOutside);
});
</script>

<template>
  <div class="qc-todo-page" :class="{ split: !!detailTodo }">
    <div class="qc-todo-main">
    <!-- 多人任务钻取（图三左）：处理人列表替代主页；标题+已处理/总数＋搜索＋状态 -->
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
    <template v-else>
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
          <span class="sg-inputwrap qc-todo-search">
            <input v-model="kw" class="sg-input" :placeholder="kwPh" />
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
          class="qc-todo-card"
          :class="{ clickable: pill === '我发起' }"
          @click="pill === '我发起' && (detailId = t.id)"
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
          <!-- 附件 chips：展示发起待办时上传的附件（图缩略/视/文＋名称＋大小，同抽屉上传区语言）；无附件不展示 -->
          <div v-if="t.files?.length" class="td-files">
            <span v-for="f in t.files" :key="f.id" class="td-file">
              <img v-if="f.kind === 'image'" class="th" :src="f.url" :alt="f.name">
              <span v-else class="th kind" :class="f.kind">{{ f.kind === 'video' ? '视' : '文' }}</span>
              <span class="nm" :title="f.name">{{ f.name }}</span>
              <span class="sz">{{ todoSizeTxt(f.size) }}</span>
            </span>
          </div>
          <div class="td-foot">
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
    </template>
    </div>

    <!-- 右侧详情分栏（图一/二/三右）：消息id→标题+特急→发起人链路→发起/处理时间→页签→内容→底栏 -->
    <aside v-if="detailTodo" class="qc-todo-detail">
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
      </div>
      <div v-else-if="dTab === '处理结果'" class="qd-body">
        <div class="qd-text">{{ detailTodo.result }}</div>
        <div class="qd-lab2">附件：</div>
        <div class="qd-atts">
          <span v-for="(a, i) in detailTodo.resultAtt" :key="`${a.name}-${i}`" class="qd-att">
            <span class="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
              </svg>
            </span>
            <span class="tx"><b>{{ a.name }}</b><i>{{ a.sub }}</i></span>
          </span>
        </div>
        <div class="qd-lab2">图片：</div>
        <div class="qd-imgs"><span class="qd-img" /></div>
      </div>
      <div v-else-if="dTab === '事项'" class="qd-body">
        <div class="qd-text">{{ detailTodo.body }}</div>
        <div class="qd-lab2">附件：</div>
        <div class="qd-atts">
          <span v-for="(a, i) in detailTodo.atts" :key="`${a.name}-${i}`" class="qd-att">
            <span class="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
              </svg>
            </span>
            <span class="tx"><b>{{ a.name }}</b><i>{{ a.sub }}</i></span>
          </span>
        </div>
        <div class="qd-lab2">图片：</div>
        <div class="qd-imgs"><span class="qd-img" /></div>
      </div>
      <div v-else class="qd-body">
        <!-- 处理流程时间轴（参考钉钉）：节点名＋时间＋处理人头像/链路＋说明（转交去向/驳回原因） -->
        <div class="qf-list">
          <div v-for="(n, i) in flowNodes" :key="`${n.title}-${i}`" class="qf-node" :class="n.state">
            <span class="qf-rail"><i /><b v-if="i < flowNodes.length - 1" /></span>
            <div class="qf-main">
              <div class="qf-head"><b>{{ n.title }}</b><span v-if="n.time">{{ n.time }}</span></div>
              <div v-if="n.person" class="qf-person">
                <span class="td-ava" :style="{ background: avaColor(n.person.name) }">{{ n.person.name.charAt(0) }}</span>
                <span>{{ n.person.name }}–{{ n.person.chain }}</span>
              </div>
              <div v-if="n.desc" class="qf-desc">{{ n.desc }}</div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="!isMulti && detailTodo.flow !== '已处理' && detailTodo.status !== '已撤销'" class="qd-foot">
        <button type="button" class="btn">发送提醒</button>
        <button type="button" class="btn primary">下派</button>
      </div>
    </aside>

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

    <!-- 驳回原因弹窗（必填） -->
    <Modal v-if="rejectTarget" title="驳回待办" @close="rejectTarget = null">
      <div class="sg-field">
        <label>驳回原因<span class="qc-tc-req">*</span></label>
        <textarea v-model="rejectReason" class="sg-input qc-tc-textarea qc-todo-rejta" maxlength="100" placeholder="请填写驳回原因" />
      </div>
      <template #foot>
        <button class="btn" @click="rejectTarget = null">取消</button>
        <button class="btn primary" @click="confirmReject">确认驳回</button>
      </template>
    </Modal>

    <!-- 转交选人（单选） -->
    <QcAssignModal
      v-if="transferTarget"
      title="转交给"
      single
      :source="INITIAL_MEMBERS"
      @close="transferTarget = null"
      @confirm="confirmTransfer"
    />
  </div>
</template>
