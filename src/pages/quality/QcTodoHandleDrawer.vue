<script setup lang="ts">
/* ---------- 待办·待处理·右侧抽屉（参考图 待办/待处理/处理）----------
   处理态＝已有内容只读呈现（消息id 灰带→标题+特急→发起人→发起时间→事项/处理流程页签→正文/附件/图片）
   ＋底部固定「处理」输入区（灰底分区＋文本域＋上传附件/上传图片）＋取消/提交；
   查看态＝同结构只读（无输入区），底栏为待处理动作。提交回写由父组件完成。 */
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import { avaColor, INITIAL_MEMBERS } from '../permission/data';
import { qcShops, SHOP_LOGO, type ShopGood, type ShopPlat } from './qcOnlineData';
import { todoFileMetaOf, todoOptRows, todoSizeTxt, type QcTodo, type TodoFile } from './qcTodoData';

const props = defineProps<{ todo: QcTodo; mode: 'handle' | 'view'; onClose: () => void; initialAct?: '驳回' | '转交' }>();
const emit = defineEmits<{ (e: 'submit', p: { reply: string; files: TodoFile[] }): void; (e: 'act', a: string): void; (e: 'actSubmit', p: { act: '驳回' | '转交'; reason: string; transferTo: string; files: TodoFile[] }): void; (e: 'open-good', g: ShopGood): void }>();

const prioOf = (t: QcTodo) => t.priority ?? '普通';
/* 发起人（收件待办的详情人行的既有口径：姓名–组） */
const person = computed(() => ({ name: props.todo.from?.name ?? '', chain: props.todo.from?.group ?? '' }));

/* 附件芯片：优先详情附件网格 atts；否则卡附件中的文档类按「类型 大小」折成芯片 */
const docAtts = computed(() => {
  if (props.todo.atts?.length) return props.todo.atts;
  return (props.todo.files ?? [])
    .filter((f) => f.kind === 'file')
    .map((f) => ({ name: f.name, sub: `${todoFileMetaOf(f.name).lab} ${todoSizeTxt(f.size)}` }));
});
/* 图片行：图/视缩略图（视频带播放标） */
const mediaFiles = computed(() => (props.todo.files ?? []).filter((f) => f.kind !== 'file'));
/* 图片与视频分两行展示（图片行／视频行），不混排同一行 */
const imgFiles = computed(() => mediaFiles.value.filter((f) => f.kind === 'image'));
const vidFiles = computed(() => mediaFiles.value.filter((f) => f.kind === 'video'));
/* 关联商品（创建任务时选定）：点击跳店铺商品并按商品ID查询，与卡面商品同语言 */
const goods = computed<ShopGood[]>(() => props.todo.goods ?? []);
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const goodThumb = (g: ShopGood) => GOOD_THUMBS[Number(g.id) % GOOD_THUMBS.length];
const goodShop = (g: ShopGood) => qcShops.value.find((s) => s.id === g.shopId);
const goodPlat = (g: ShopGood): ShopPlat => goodShop(g)?.platform ?? '淘宝';

/* 页签组随实例态：驳回(有原因)＝驳回原因/事项/处理流程；转交给我＝事项/转交原因/处理流程；已处理＝处理结果/事项/处理流程；其余＝事项/处理流程 */
const dIsReject = computed(() => props.todo.status === '驳回' && !!props.todo.rejectReason);
const dIsDone = computed(() => props.todo.flow === '已处理');
/* 别人转交给我：状态转交且转入人是本人（仍待处理）；区别于「我转交出去」(transferTo 为他人且已完结) */
const ME_NAME = '七妮妮';
const isTransferToMe = computed(() => props.todo.status === '转交' && props.todo.transferTo === ME_NAME);
/* 转交人（姓名–链路串拆两截） */
const transferPerson = computed(() => {
  const s = props.todo.transferFrom ?? '';
  const i = s.indexOf('–');
  return i > 0 ? { name: s.slice(0, i), chain: s.slice(i + 1) } : { name: s, chain: '' };
});
const dTabs = computed(() => (dIsReject.value ? ['驳回原因', '事项', '处理流程'] : isTransferToMe.value ? ['事项', '转交原因', '处理流程'] : dIsDone.value ? ['处理结果', '事项', '处理流程'] : ['事项', '处理流程']));
/* 查看态底栏：转交给我＝转交/驳回/提交(主)；其余待处理＝处理(主)/转交/驳回 */
const viewActs = computed<string[]>(() => (isTransferToMe.value ? ['转交', '驳回', '提交'] : ['处理', '转交', '驳回']));
const viewPrimary = computed<string>(() => (isTransferToMe.value ? '提交' : '处理'));
const dTab = ref(dIsReject.value ? '驳回原因' : isTransferToMe.value ? '转交原因' : dIsDone.value ? '处理结果' : '事项');
/* 查看态驳回/转交内联表单态（须在 watch 之前声明：immediate 回调同步访问） */
const actForm = ref<'' | '驳回' | '转交'>(props.mode === 'view' ? (props.initialAct ?? '') : '');
/* 进入处理态时回到事项页签（参考图一处理态默认事项）；须在 dTab 声明之后，immediate 回调会同步访问 */
watch(() => props.mode, (m) => { if (m === 'handle') { dTab.value = '事项'; actForm.value = ''; } }, { immediate: true });

/* 处理流程时间轴（单实例口径，与待办页详情同构）：接收待办的处理人＝本人 */
interface FlowNode { title: string; time?: string; person?: { name: string; chain: string }; desc?: string; /** 转交原因：独立成行展示（原因必填，处理流程留痕） */ reason?: string; state: 'done' | 'current' | 'reject' | 'revoke'; }
const ME = { name: '七妮妮', chain: '杭州分公司–项目组–产品部' };
const flowNodes = computed<FlowNode[]>(() => {
  const t = props.todo;
  const nodes: FlowNode[] = [{ title: '发起待办', time: t.time, person: t.mine ? ME : { name: t.from?.name ?? '', chain: t.from?.group ?? '' }, state: 'done' }];
  const who = t.mine ? { name: (t.toList ?? (t.to ? [t.to] : [])).join('、'), chain: ME.chain } : ME;
  if (t.status === '转交') nodes.push({ title: '转交', time: t.transferTime, person: isTransferToMe.value ? transferPerson.value : ME, desc: `转交给 ${t.transferTo ?? ''}`, reason: t.transferReason, state: 'done' });
  if (t.status === '驳回') nodes.push({ title: '驳回', time: t.rejectTime, person: ME, desc: t.rejectReason, state: 'reject' });
  if (t.flow === '已处理') nodes.push({ title: '处理完成', time: t.doneTime, person: who, state: 'done' });
  if (t.status === '已撤销') nodes.push({ title: '已撤销', time: t.revokeTime, person: ME, state: 'revoke' });
  if (!t.done && t.status !== '驳回' && !(t.status === '转交' && !isTransferToMe.value)) nodes.push({ title: '待处理中', person: who, state: 'current' });
  return nodes;
});

/* ---------- 处理输入区：回复＋真实文件选择（按 mime 归类 图/视/文） ---------- */
const reply = ref('');
const upFiles = ref<TodoFile[]>([]);
const attInput = ref<HTMLInputElement | null>(null);
const imgInput = ref<HTMLInputElement | null>(null);
const onFiles = (e: Event, forceImage: boolean, list?: TodoFile[]) => {
  const input = e.target as HTMLInputElement;
  const target = list ?? upFiles.value;
  [...(input.files ?? [])].forEach((f, i) => {
    const kind: TodoFile['kind'] = forceImage || f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file';
    target.push({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, kind, url: URL.createObjectURL(f) });
  });
  input.value = '';
};
const dropFile = (id: string, box: { value: TodoFile[] } = upFiles) => {
  const f = box.value.find((x) => x.id === id);
  if (f) URL.revokeObjectURL(f.url);
  box.value = box.value.filter((x) => x.id !== id);
};
const submit = () => {
  if (!reply.value.trim()) { pushToast('请输入处理内容', 'error'); return; }
  emit('submit', { reply: reply.value.trim(), files: upFiles.value });
};

/* ---------- 查看态驳回/转交：与处理态同语言直接在抽屉底部灰底分区填写（原因必填＋可传附件），转交另加转交人选择 ---------- */
const actReason = ref('');
const transferTo = ref('');
const actFiles = ref<TodoFile[]>([]);
const memberNames = computed(() => INITIAL_MEMBERS.map((m) => m.name).filter((n) => n !== ME_NAME));
const onViewAct = (a: string) => {
  if (a === '转交' || a === '驳回') {
    actForm.value = a;
    actReason.value = '';
    transferTo.value = '';
    actFiles.value = [];
    return;
  }
  emit('act', a);
};
const submitAct = () => {
  const act = actForm.value;
  if (!act) return;
  if (act === '转交' && !transferTo.value) { pushToast('请选择转交人', 'error'); return; }
  if (!actReason.value.trim()) { pushToast(act === '驳回' ? '请填写驳回原因' : '请填写转交原因', 'error'); return; }
  emit('actSubmit', { act, reason: actReason.value.trim(), transferTo: transferTo.value, files: actFiles.value });
};
/* 查看态优化信息行（优化类型/优化方案/结束方式或优化任务周期），与关联待办详情抽屉同口径 */
const optRows = computed(() => todoOptRows(props.todo));
/* 模板内 ref 自动解包，移除芯片须显式传 ref 盒 */
const dropActFile = (id: string) => dropFile(id, actFiles);
</script>

<template>
  <div class="drawer-mask" @click="props.onClose" />
  <div class="drawer qc-todo-handle-drawer">
    <div class="qhd-idbar">消息id： {{ props.todo.msgId }}</div>
    <div class="drawer-body qhd-body">
      <div class="qd-title">
        {{ props.todo.title }}
        <span v-if="prioOf(props.todo) === '特急'" class="qd-urgent"><i>🔥</i>特急</span>
        <span v-if="isTransferToMe" class="qd-st zf">转交</span>
      </div>
      <div class="qd-sender">
        <span class="qd-ava" :style="{ background: avaColor(person.name) }">{{ person.name.charAt(0) }}</span>
        <b>{{ person.name }}–{{ person.chain }}</b>
      </div>
      <div class="qd-lab">发起时间</div>
      <div class="qd-val">{{ props.todo.time }}</div>
      <template v-for="r in optRows" :key="r.lab">
        <div class="qd-lab">{{ r.lab }}</div>
        <div class="qd-val">{{ r.val }}</div>
      </template>
      <template v-if="isTransferToMe">
        <div class="qd-lab">转交人</div>
        <div class="qd-val">{{ props.todo.transferFrom }}</div>
        <div class="qd-lab">转交时间</div>
        <div class="qd-val">{{ props.todo.transferTime }}</div>
      </template>
      <div class="qd-tabs">
        <button v-for="tb in dTabs" :key="tb" type="button" :class="{ on: dTab === tb }" @click="dTab = tb">{{ tb }}</button>
      </div>
      <div v-if="dTab === '驳回原因'" class="qd-body">
        <div class="qd-text">{{ props.todo.rejectReason }}</div>
        <template v-if="props.todo.rejectAtt?.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in props.todo.rejectAtt" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
      </div>
      <div v-else-if="dTab === '处理结果'" class="qd-body">
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
      <div v-else-if="dTab === '事项' || dTab === '转交原因'" class="qd-body">
        <div class="qd-text">{{ dTab === '转交原因' ? (props.todo.transferReason ?? '') : props.todo.body }}</div>
        <template v-if="dTab === '转交原因' && props.todo.transferAtt?.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in props.todo.transferAtt" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
        <template v-if="docAtts.length">
          <div class="qhd-div" />
          <div class="qd-lab2">附件：</div>
          <div class="qd-atts">
            <span v-for="(a, i) in docAtts" :key="`${a.name}-${i}`" class="qd-att">
              <svg class="ic" :style="{ color: todoFileMetaOf(a.name).color }" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              <span class="tx"><b :title="a.name">{{ a.name }}</b><i>{{ a.sub }}</i></span>
            </span>
          </div>
        </template>
        <template v-if="mediaFiles.length">
          <div class="qhd-div" />
          <template v-if="imgFiles.length">
            <div class="qd-lab2">图片：</div>
            <div class="qhd-imgs">
              <img v-for="f in imgFiles" :key="f.id" class="qhd-img" :src="f.url" :alt="f.name" :title="f.name">
            </div>
          </template>
          <template v-if="vidFiles.length">
            <div class="qd-lab2">视频：</div>
            <div class="qhd-imgs">
              <span v-for="f in vidFiles" :key="f.id" class="qhd-img video" :title="f.name">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>
              </span>
            </div>
          </template>
        </template>
        <template v-if="goods.length">
          <div class="qhd-div" />
          <div class="qd-lab2">关联商品：</div>
          <div class="qd-goods">
            <button
              v-for="g in goods"
              :key="g.id"
              type="button"
              class="td-good"
              :title="`在店铺商品中查看 ${g.name}`"
              @click="emit('open-good', g)"
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
    <!-- 底部固定：处理态＝处理输入区＋取消/提交；查看态＝待处理三动作（处理/转交/驳回），闭环由父组件接线 -->
    <div v-if="props.mode === 'handle'" class="qhd-fix">
      <div class="qhd-fixlab">处理</div>
      <div class="qhd-compose">
        <textarea v-model="reply" placeholder="请输入内容" />
        <div class="qhd-uprow">
          <button type="button" class="qhd-up" @click="attInput?.click()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" />
            </svg>
            上传附件
          </button>
          <button type="button" class="qhd-up" @click="imgInput?.click()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
            上传图片
          </button>
        </div>
        <div v-if="upFiles.length" class="qhd-chips">
          <span v-for="f in upFiles" :key="f.id" class="qhd-chip">
            <b :title="f.name">{{ f.name }}</b><i>{{ todoSizeTxt(f.size) }}</i>
            <em title="移除" @click="dropFile(f.id)">×</em>
          </span>
        </div>
      </div>
      <div class="qhd-foot">
        <button type="button" class="btn" @click="props.onClose">取消</button>
        <button type="button" class="btn primary" @click="submit">提交</button>
      </div>
    </div>
    <!-- 查看态驳回/转交：与处理态同语言在底部灰底分区直接填写（原因必填＋可传附件），转交另加转交人选择；回写由父组件完成 -->
    <div v-else-if="actForm" class="qhd-fix">
      <div class="qhd-fixlab">{{ actForm }}</div>
      <div v-if="actForm === '转交'" class="qhd-pick">
        <span class="qhd-picklab">转交人<i class="qhd-star">*</i></span>
        <BubbleSelect :options="memberNames" :value="transferTo || '请选择转交人'" class-name="qhd-pickbs" @change="(v: string) => (transferTo = v)" />
      </div>
      <div class="qhd-compose">
        <textarea v-model="actReason" :placeholder="actForm === '驳回' ? '请填写驳回原因' : '请填写转交原因（被转交人可见）'" />
        <div class="qhd-uprow">
          <button type="button" class="qhd-up" @click="attInput?.click()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" />
            </svg>
            上传附件
          </button>
          <button type="button" class="qhd-up" @click="imgInput?.click()">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
            上传图片
          </button>
        </div>
        <div v-if="actFiles.length" class="qhd-chips">
          <span v-for="f in actFiles" :key="f.id" class="qhd-chip">
            <b :title="f.name">{{ f.name }}</b><i>{{ todoSizeTxt(f.size) }}</i>
            <em title="移除" @click="dropActFile(f.id)">×</em>
          </span>
        </div>
      </div>
      <div class="qhd-foot">
        <button type="button" class="btn" @click="actForm = ''">取消</button>
        <button type="button" class="btn primary" @click="submitAct">提交</button>
      </div>
    </div>
    <div v-else class="qhd-bar">
      <div class="qhd-foot">
        <button v-for="a in viewActs" :key="a" type="button" class="btn" :class="{ primary: a === viewPrimary }" @click="onViewAct(a)">{{ a }}</button>
      </div>
    </div>
    <input ref="attInput" type="file" multiple hidden @change="(e) => onFiles(e, false, actForm ? actFiles : undefined)">
    <input ref="imgInput" type="file" multiple accept="image/*" hidden @change="(e) => onFiles(e, true, actForm ? actFiles : undefined)">
  </div>
</template>
