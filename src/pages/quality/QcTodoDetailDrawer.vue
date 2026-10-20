<script setup lang="ts">
/* ---------- 优化任务关联待办详情抽屉（店铺商品操作列「优化任务」入口）----------
   与待办任务页详情为同一实体：结构/字段/页签/时间轴逐条对齐 QcTodoList 详情分栏；
   多人任务在顶部附处理人卡选择（含已处理计数），点卡切换右侧实例。 */
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { avaColor } from '../permission/data';
import { qcShops, qcShopGoods, SHOP_LOGO, type ShopGood, type ShopPlat } from './qcOnlineData';
import { todoFileMetaOf, todoOptRows, todoSizeTxt, type QcTodo } from './qcTodoData';

const props = defineProps<{ todo: QcTodo; onClose: () => void; /** 关联商品点击：由入口页决定跳转口径（店铺商品按商品ID查询） */ onOpenGood?: (g: ShopGood) => void }>();

const ME = { name: '七妮妮', chain: '杭州分公司–项目组–产品部' };
const prioOf = (t: QcTodo) => t.priority ?? '普通';

/* 多人态钻取：与待办页同口径（搜索/状态/选中卡） */
const hKw = ref('');
const hSt = ref('全部');
const H_OPTS = ['全部', '待处理', '已处理', '驳回', '已撤销'];
const hIdx = ref(0);
const isMulti = computed(() => (props.todo.toList?.length ?? (props.todo.to ? 1 : 0)) > 1);
const hRows = computed(() => {
  const q = hKw.value.trim();
  return (props.todo.handlers ?? []).filter((h) => (!q || h.name.includes(q)) && (hSt.value === '全部' || h.flow === hSt.value));
});
/* 计数口径：转交转入人不计入需处理总数 */
const hDone = computed(() => (props.todo.handlers ?? []).filter((h) => h.flow === '已处理' && !h.transferFrom).length);
const hTotal = computed(() => (props.todo.handlers ?? []).filter((h) => !h.transferFrom).length);
/* 详情当前实例：多人态＝选中处理人卡；单人态＝待办本身 */
const dHandler = computed(() => {
  if (!isMulti.value) return null;
  const rows = hRows.value;
  return rows[Math.min(hIdx.value, rows.length - 1)] ?? null;
});
const dPerson = computed(() => {
  const h = dHandler.value;
  if (h) return { name: h.name, chain: h.chain };
  return { name: props.todo.to ?? props.todo.toList?.[0] ?? '', chain: '杭州分公司–项目组–产品部' };
});
/* 详情状态芯片（实心紫转交/实心红驳回），其余态不展示 */
const dStatus = computed<'转交' | '驳回' | null>(() => {
  const h = dHandler.value;
  if (h) return h.transferFrom ? '转交' : h.flow === '驳回' ? '驳回' : null;
  const s = props.todo.status;
  return s === '转交' || s === '驳回' ? s : null;
});
/* 详情字段行：发起时间恒在；转交补 原处理人/转交时间；驳回补 驳回时间；已处理补 处理时间 */
const dRows = computed(() => {
  const t = props.todo;
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
const dRejectReason = computed(() => dHandler.value?.rejectReason ?? props.todo.rejectReason ?? '');
/* 事项页签附件/图片（与待办页查看态同口径）：附件优先 atts，否则卡面文档类折芯片；图片/视频取 files 缩略图 */
const dAtts = computed(() => {
  const t = props.todo;
  if (t.atts?.length) return t.atts;
  return (t.files ?? []).filter((f) => f.kind === 'file').map((f) => ({ name: f.name, sub: `${todoFileMetaOf(f.name).lab} ${todoSizeTxt(f.size)}` }));
});
const dImgs = computed(() => (props.todo.files ?? []).filter((f) => f.kind === 'image'));
const dVids = computed(() => (props.todo.files ?? []).filter((f) => f.kind === 'video'));
/* 关联商品（创建任务时选定）：点击回入口页跳店铺商品并按商品ID查询 */
const dGoods = computed<ShopGood[]>(() => props.todo.goods ?? []);
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const goodThumb = (g: ShopGood) => GOOD_THUMBS[Number(g.id) % GOOD_THUMBS.length];
const goodShop = (g: ShopGood) => qcShops.value.find((s) => s.id === g.shopId);
const goodPlat = (g: ShopGood): ShopPlat => goodShop(g)?.platform ?? '淘宝';
/* 页签组随实例态：驳回＝驳回原因/事项/处理流程；已处理＝处理结果/事项/处理流程；其余＝事项/处理流程；
   存在转交原因时插入「转交原因」页签（转入人可见口径） */
const dIsReject = computed(() => (dHandler.value ? dHandler.value.flow === '驳回' : props.todo.status === '驳回'));
const dIsDone = computed(() => (dHandler.value ? dHandler.value.flow === '已处理' : props.todo.flow === '已处理'));
const dTransferReason = computed(() => {
  const h = dHandler.value;
  if (h) return h.transferFrom ? h.transferReason ?? '' : '';
  return props.todo.status === '转交' ? props.todo.transferReason ?? '' : '';
});
/* ---------- 历史优化任务页签：当前关联优化任务（本待办）＋主体商品 optHistory 历史周期；
   任务维度左列（复用多人钻取卡语言），点击切换右侧任务详情 ---------- */
interface HistTask {
  id: string; title: string; kind: string; plan?: string;
  start: string; end: string; openEnd?: boolean; status: '优化中' | '已结束';
  owner: string; from: string; faqi: string; doneTime?: string; result?: string; resultAtt?: { name: string; sub: string }[];
}
const kindOf = (t: QcTodo) => (t.type === '系列编码优化' || t.type === '商品编码优化' ? '编码优化' : t.type === '商品优化' || t.type === '店铺优化' ? t.type : '');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/* 主体商品：关联商品优先，否则按 optTask.todoId 反查（编码/店铺优化入口待办无关联商品时） */
const subjectGoods = computed<ShopGood[]>(() => {
  if (props.todo.goods?.length) return props.todo.goods;
  return qcShopGoods.value.filter((g) => g.optTask?.todoId === props.todo.id);
});
const histTasks = computed<HistTask[]>(() => {
  const t = props.todo;
  const list: HistTask[] = [];
  const cur = subjectGoods.value.map((g) => g.optTask).find((k) => k?.todoId === t.id)
    ?? (t.optCycle ? { start: t.optCycle.start, end: t.optCycle.end, openEnd: t.optCycle.openEnd, todoId: t.id } : undefined);
  if (cur && kindOf(t)) {
    const h = t.handlers?.[0];
    list.push({
      id: t.id, title: t.title, kind: kindOf(t), plan: t.optPlan, start: cur.start, end: cur.end, openEnd: cur.openEnd,
      status: cur.openEnd || todayStr() <= cur.end ? '优化中' : '已结束',
      owner: h ? `${h.name}–${h.chain}` : `${t.to ?? t.toList?.[0] ?? ''}–杭州分公司–项目组–产品部`,
      from: t.mine ? '我' : `${t.from?.name ?? ''}–${t.from?.group ?? ''}`,
      faqi: t.time, doneTime: t.doneTime, result: t.result, resultAtt: t.resultAtt,
    });
  }
  for (const g of subjectGoods.value) {
    for (const h of g.optHistory ?? []) {
      list.push({ id: h.id, title: h.title, kind: kindOf(t), plan: h.plan, start: h.start, end: h.end, status: '已结束', owner: h.owner, from: h.from, faqi: h.faqi, doneTime: h.doneTime, result: h.result, resultAtt: h.resultAtt });
    }
  }
  return list.sort((a, b) => (a.start < b.start ? 1 : -1));
});
const histIdx = ref(0);
/** 历史优化任务面板：由详情区右上角入口点击展开/收起（不再占用页签） */
const histOpen = ref(false);
const selHist = computed(() => histTasks.value[Math.min(histIdx.value, histTasks.value.length - 1)]);
watch(() => props.todo.id, () => { histIdx.value = 0; histOpen.value = false; });

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
const dTab = ref(defaultTab());
watch(hIdx, () => { dTab.value = defaultTab(); });

/* 处理流程时间轴（与待办页同构）：节点名＋时间＋处理人＋说明 */
interface FlowNode { title: string; time?: string; person?: { name: string; chain: string }; desc?: string; /** 转交原因：独立成行展示（原因必填，处理流程留痕） */ reason?: string; state: 'done' | 'current' | 'reject' | 'revoke'; }
const splitWho = (s: string) => ({ name: s.split('–')[0], chain: s.split('–').slice(1).join('–') });
const flowNodes = computed<FlowNode[]>(() => {
  const t = props.todo;
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
const HF_CLS: Record<string, string> = { 待处理: 'dcl', 已处理: 'ycl', 驳回: 'bcl', 已撤销: 'xcl' };
const HA_CLS: Record<string, string> = { 转: 'zf', 驳: 'bh', 撤: 'yx' };
</script>

<template>
  <div class="drawer-mask" @click="props.onClose" />
  <div class="drawer qc-todo-detail-drawer" :class="{ 'qdh-wide': histOpen && !!selHist, 'qdh-row': histOpen && !!selHist }">
    <!-- 历史优化任务入口：详情区右上角，点击展开/收起左轨＋任务详情 -->
    <button
      v-if="histTasks.length"
      type="button"
      class="qdh-toggle"
      :class="{ on: histOpen }"
      :title="histOpen ? '收起历史优化任务' : '展开历史优化任务'"
      @click="histOpen = !histOpen"
    >
      <span class="qt-tx">历史优化任务</span>
      <span class="qt-cnt">{{ histTasks.length }}</span>
      <svg class="qt-ar" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
    </button>
    <!-- 历史优化任务：最左侧全高选择轨（图二结构），点卡切换右侧任务详情 -->
    <div v-if="histOpen && selHist" class="qdh-rail">
      <div class="qh-list">
        <div v-for="(h, i) in histTasks" :key="h.id" class="qh-card" :class="{ on: histIdx === i }" @click="histIdx = i">
          <div class="qdh-title" :title="h.title">{{ h.title }}</div>
          <div class="qh-t">周期：{{ h.start }} ~ {{ h.openEnd ? '至今' : h.end }}</div>
          <div class="qh-t">处理人：{{ h.owner.split('–')[0] }}</div>
          <div class="qh-strow">
            <span class="qh-st" :class="h.status === '优化中' ? 'dcl' : 'ycl'">{{ h.status }}</span>
          </div>
        </div>
      </div>
    </div>
    <div class="drawer-body">
      <!-- 查看态图一：消息id灰带贴顶（关闭走遮罩点击/底栏关闭，与处理抽屉查看态一致） -->
      <div class="qd-id">消息id： {{ props.todo.msgId }}</div>
      <!-- 多人任务：处理人卡选择（与待办页左栏同卡型），点卡切换下方详情实例 -->
      <div v-if="isMulti" class="qdd-handlers">
        <div class="qh-head"><b>处理人</b><span class="qh-cnt">{{ hDone }}/{{ hTotal }}</span></div>
        <div class="qh-filter">
          <span class="sg-inputwrap qc-todo-search">
            <input v-model="hKw" class="sg-input" placeholder="搜索">
            <svg class="mag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
          </span>
          <BubbleSelect class-name="sg-select" :value="hSt" :options="H_OPTS" @change="(v: string) => (hSt = v)" />
        </div>
        <div class="qh-list qdd-hlist">
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

      <!-- 详情主体：与待办任务页详情分栏逐条同构 -->
      <div class="qd-title">
        {{ props.todo.title }}
        <span v-if="prioOf(props.todo) === '特急'" class="qd-urgent"><i>🔥</i>特急</span>
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
      <div v-if="!histOpen" class="qd-tabs">
        <button v-for="tb in dTabs" :key="tb" type="button" :class="{ on: dTab === tb }" @click="dTab = tb">{{ tb }}</button>
      </div>
      <div v-if="!histOpen && dTab === '驳回原因'" class="qd-body">
        <div class="qd-text">{{ dRejectReason }}</div>
      </div>
      <div v-else-if="!histOpen && dTab === '处理结果'" class="qd-body">
        <div class="qd-text">{{ props.todo.result }}</div>
        <template v-if="props.todo.resultAtt?.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in props.todo.resultAtt" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
      </div>
      <div v-else-if="!histOpen && dTab === '转交原因'" class="qd-body">
        <div class="qd-text">{{ dTransferReason }}</div>
      </div>
      <div v-else-if="!histOpen && dTab === '事项'" class="qd-body">
        <div class="qd-text">{{ props.todo.body }}</div>
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
              @click="props.onOpenGood?.(g)"
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
      <!-- 历史优化任务：展开态右侧＝选中任务详情（可选列表在抽屉最左轨 qdh-rail） -->
      <div v-else-if="histOpen && selHist" class="qd-body qdh-detail">
        <div class="qd-title">{{ selHist.title }}</div>
        <div class="qd-lab">发起人</div>
        <div class="qd-val">{{ selHist.from }}</div>
        <div class="qd-lab">发起时间</div>
        <div class="qd-val">{{ selHist.faqi }}</div>
        <div class="qd-lab">优化类型</div>
        <div class="qd-val">{{ selHist.kind }}</div>
        <template v-if="selHist.plan">
          <div class="qd-lab">优化方案</div>
          <div class="qd-val">{{ selHist.plan }}</div>
        </template>
        <div class="qd-lab">任务周期</div>
        <div class="qd-val">{{ selHist.start }} ~ {{ selHist.openEnd ? '至今（达到指标后结束）' : selHist.end }}</div>
        <div class="qd-lab">处理人</div>
        <div class="qd-val">{{ selHist.owner }}</div>
        <template v-if="selHist.doneTime">
          <div class="qd-lab">处理时间</div>
          <div class="qd-val">{{ selHist.doneTime }}</div>
        </template>
        <template v-if="selHist.result">
          <div class="qhd-div" />
          <div class="qd-lab2">处理结果：</div>
          <div class="qd-text">{{ selHist.result }}</div>
          <template v-if="selHist.resultAtt?.length">
            <div class="qd-lab2">附件：</div>
            <div class="qd-atts">
              <span v-for="(a, i) in selHist.resultAtt" :key="`${a.name}-${i}`" class="qd-att">
                <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
              </span>
            </div>
          </template>
        </template>
      </div>
      <div v-else-if="!histOpen" class="qd-body">
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
    </div>
    <div class="drawer-foot">
      <button class="btn primary" @click="props.onClose">关闭</button>
    </div>
  </div>
</template>
