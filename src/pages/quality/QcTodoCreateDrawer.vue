<script setup lang="ts">
/* ---------- 发起待办抽屉（品控-线上 待办任务）----------
   字段：标题(30字内) / 优先级(普通·特急分段) / 文字内容(200字内) / 上传文件·图片·视频 /
   关联商品(商品列表多选) / 发送人(多选，通讯录选人) / 最迟处理时间(日历+时分，超出即逾期)。
   必填未齐「发起」置灰；提交后 toast 反馈并关闭（列表侧展示口径后续再定）。 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Modal from '../../components/Modal.vue';
import Checkbox from '../permission/Checkbox.vue';
import { pushToast } from '../../components/toast';
import { avaColor, INITIAL_MEMBERS, type Member } from '../permission/data';
import { qcShopGoods, qcShops, SHOP_LOGO, type ShopGood, type ShopPlat } from './qcOnlineData';
import { TODO_PRIORITIES, todoSizeTxt, type TodoFile, type TodoPriority } from './qcTodoData';
import QcAssignModal from './QcAssignModal.vue';

export type { TodoPriority, TodoFile };
export interface TodoCreatePayload {
  title: string;
  priority: TodoPriority;
  body: string;
  files: TodoFile[];
  goods: ShopGood[];
  senders: Member[];
  deadline: string;
}

const emit = defineEmits<{ (e: 'close'): void; (e: 'created', p: TodoCreatePayload): void }>();
/* 重新提交回填：initial 带入上次发起的标题/优先级/内容/附件/发送人/最迟时间 */
const props = defineProps<{ initial?: Partial<TodoCreatePayload> }>();

const TITLE_MAX = 30;
const BODY_MAX = 200;
const title = ref(props.initial?.title ?? '');
const priority = ref<TodoPriority>(props.initial?.priority ?? '普通');
const body = ref(props.initial?.body ?? '');
const files = ref<TodoFile[]>(props.initial?.files ? props.initial.files.map((f) => ({ ...f })) : []);
const goods = ref<ShopGood[]>(props.initial?.goods ? [...props.initial.goods] : []);
const senders = ref<Member[]>(props.initial?.senders ? [...props.initial.senders] : []);
const dlDate = ref(props.initial?.deadline ? props.initial.deadline.slice(0, 10) : '');
const dlTime = ref(props.initial?.deadline ? props.initial.deadline.slice(11) : '');
const deadline = computed(() => (dlDate.value && dlTime.value ? `${dlDate.value} ${dlTime.value}` : ''));

const canSubmit = computed(() => !!title.value.trim() && !!body.value.trim() && senders.value.length > 0 && !!deadline.value);

/* ---------- 上传：真实文件选择，按 mime 归类 图/视/文 ---------- */
const fileInput = ref<HTMLInputElement | null>(null);
const onFiles = (e: Event) => {
  const input = e.target as HTMLInputElement;
  [...(input.files ?? [])].forEach((f, i) => {
    const kind: TodoFile['kind'] = f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file';
    files.value.push({ id: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, kind, url: URL.createObjectURL(f) });
  });
  input.value = '';
};
const dropFile = (id: string) => {
  const f = files.value.find((x) => x.id === id);
  if (f) URL.revokeObjectURL(f.url);
  files.value = files.value.filter((x) => x.id !== id);
};

/* ---------- 关联商品：弹窗内商品列表多选（搜索＋勾选） ---------- */
const goodsOpen = ref(false);
const goodsQ = ref('');
const goodsPick = ref<Set<string>>(new Set());
const openGoods = () => {
  goodsQ.value = '';
  goodsPick.value = new Set(goods.value.map((g) => g.id));
  goodsOpen.value = true;
};
const goodsRows = computed(() => {
  const q = goodsQ.value.trim();
  return qcShopGoods.value.filter((g) => !q || g.name.includes(q) || g.id.includes(q));
});
/* 行内商品信息复用店铺商品列表复合格：主图（/products 素材按商品ID取模轮转，同页口径）＋商品名＋商品ID＋平台官方图标店铺名 */
const GOOD_THUMBS = ['/products/main.png', '/products/serum.png', '/products/hairpin.png'];
const thumbOf = (id: string) => GOOD_THUMBS[Number(id) % GOOD_THUMBS.length];
const shopOf = (id: string) => qcShops.value.find((s) => s.id === id);
const shopName = (id: string) => shopOf(id)?.name ?? id;
const shopPlat = (id: string): ShopPlat => shopOf(id)?.platform ?? '淘宝';
const confirmGoods = () => {
  goods.value = qcShopGoods.value.filter((g) => goodsPick.value.has(g.id));
  goodsOpen.value = false;
};

/* ---------- 发送人：通讯录选人弹窗（MemberPickPanel 单一出口） ---------- */
const senderOpen = ref(false);
const senderIds = computed(() => new Set(senders.value.map((m) => m.id)));

/* ---------- 最迟处理时间：月历单日＋时/分双列滚选 ---------- */
const dlOpen = ref(false);
const dlBox = ref<HTMLDivElement | null>(null);
const pad = (n: number) => String(n).padStart(2, '0');
const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; })();
const viewY = ref(Number(todayIso.slice(0, 4)));
const viewM = ref(Number(todayIso.slice(5, 7)) - 1);
const viewLabel = computed(() => `${viewY.value} 年 ${viewM.value + 1} 月`);
const navMonth = (d: number) => {
  let m = viewM.value + d;
  let y = viewY.value;
  if (m < 0) { m = 11; y--; }
  if (m > 11) { m = 0; y++; }
  viewM.value = m;
  viewY.value = y;
};
const WEEK_HEAD = ['日', '一', '二', '三', '四', '五', '六'];
const calCells = computed((): (string | null)[] => {
  const lead = new Date(viewY.value, viewM.value, 1).getDay();
  const days = new Date(viewY.value, viewM.value + 1, 0).getDate();
  const out: (string | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) out.push(`${viewY.value}-${pad(viewM.value + 1)}-${pad(d)}`);
  return out;
});
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINS = Array.from({ length: 60 }, (_, i) => pad(i));
const onDoc = (e: MouseEvent) => {
  if (dlOpen.value && dlBox.value && !dlBox.value.contains(e.target as Node)) dlOpen.value = false;
};
watch(dlOpen, (v) => {
  if (v) {
    const base = dlDate.value || todayIso;
    viewY.value = Number(base.slice(0, 4));
    viewM.value = Number(base.slice(5, 7)) - 1;
  }
});
onBeforeUnmount(() => document.removeEventListener('mousedown', onDoc));
watch(dlOpen, (v) => {
  if (v) document.addEventListener('mousedown', onDoc);
  else document.removeEventListener('mousedown', onDoc);
});

/* ---------- 提交 ---------- */
const submit = () => {
  if (!canSubmit.value) return;
  emit('created', { title: title.value.trim(), priority: priority.value, body: body.value.trim(), files: files.value, goods: goods.value, senders: senders.value, deadline: deadline.value });
  pushToast('待办已发起');
  emit('close');
};
</script>

<template>
  <div class="drawer-mask" @click="emit('close')" />
  <div class="drawer qc-todo-create">
    <div class="drawer-head">
      <div class="d-title">发起待办</div>
      <span class="x" @click="emit('close')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </span>
    </div>
    <div class="drawer-body">
      <div class="sg-field">
        <label>标题<span class="qc-tc-req">*</span><span class="qc-tc-count">{{ title.length }}/{{ TITLE_MAX }}</span></label>
        <input v-model="title" class="sg-input" :maxlength="TITLE_MAX" placeholder="请输入待办标题">
      </div>
      <div class="sg-field">
        <label>优先级</label>
        <div class="qc-tc-prio">
          <button v-for="p in TODO_PRIORITIES" :key="p" type="button" :class="[p, { on: priority === p }]" @click="priority = p">
            <i v-if="p === '特急'">🔥</i>{{ p }}
          </button>
        </div>
      </div>
      <div class="sg-field">
        <label>文字内容<span class="qc-tc-req">*</span><span class="qc-tc-count">{{ body.length }}/{{ BODY_MAX }}</span></label>
        <textarea v-model="body" class="sg-input qc-tc-textarea" :maxlength="BODY_MAX" placeholder="请输入待办内容" />
      </div>
      <div class="sg-field">
        <label>上传文件/图片/视频</label>
        <input ref="fileInput" type="file" multiple hidden @change="onFiles">
        <button type="button" class="qc-tc-up" @click="fileInput?.click()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 16V4m0 0 4 4m-4-4-4 4" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
          </svg>
          点击上传
        </button>
        <div v-if="files.length" class="qc-tc-files">
          <div v-for="f in files" :key="f.id" class="qc-tc-file">
            <img v-if="f.kind === 'image'" class="th" :src="f.url" :alt="f.name">
            <span v-else class="th kind" :class="f.kind">{{ f.kind === 'video' ? '视' : '文' }}</span>
            <span class="nm" :title="f.name">{{ f.name }}</span>
            <span class="sz">{{ todoSizeTxt(f.size) }}</span>
            <button type="button" class="rm" title="移除" @click="dropFile(f.id)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="sg-field">
        <label>关联商品</label>
        <div class="qc-tc-pickbox" @click="openGoods">
          <template v-if="goods.length">
            <span v-for="g in goods.slice(0, 3)" :key="g.id" class="qc-tc-chip">{{ g.name }}</span>
            <span v-if="goods.length > 3" class="qc-tc-chip more">+{{ goods.length - 3 }}</span>
          </template>
          <span v-else class="qc-tc-ph">选择商品</span>
          <span class="qc-tc-n">{{ goods.length ? `${goods.length} 件` : '' }}</span>
        </div>
      </div>
      <div class="sg-field">
        <label>发送人<span class="qc-tc-req">*</span></label>
        <div class="qc-tc-pickbox" @click="senderOpen = true">
          <template v-if="senders.length">
            <span v-for="m in senders.slice(0, 6)" :key="m.id" class="qc-tc-ava" :style="{ background: avaColor(m.name) }" :title="m.name">{{ m.name.slice(0, 1) }}</span>
            <span v-if="senders.length > 6" class="qc-tc-chip more">+{{ senders.length - 6 }}</span>
          </template>
          <span v-else class="qc-tc-ph">选择发送人（支持多选）</span>
          <span class="qc-tc-n">{{ senders.length ? `${senders.length} 人` : '' }}</span>
        </div>
      </div>
      <div class="sg-field">
        <label>最迟处理时间<span class="qc-tc-req">*</span></label>
        <div ref="dlBox" class="qc-tc-dlbox">
          <div class="qc-tc-pickbox" @click="dlOpen = !dlOpen">
            <span :class="deadline ? 'qc-tc-val' : 'qc-tc-ph'">{{ deadline || '选择日期与时间（超出即逾期）' }}</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div v-if="dlOpen" class="qc-date-pop qc-tc-dlpop">
            <div class="qc-cal">
              <div class="qc-cal-head">
                <button type="button" class="qc-cal-nav" title="上一月" @click="navMonth(-1)">‹</button>
                <span class="qc-cal-title">{{ viewLabel }}</span>
                <button type="button" class="qc-cal-nav" title="下一月" @click="navMonth(1)">›</button>
              </div>
              <div class="qc-cal-week">
                <span v-for="w in WEEK_HEAD" :key="w">{{ w }}</span>
              </div>
              <div class="qc-cal-grid">
                <template v-for="(c, i) in calCells" :key="i">
                  <span v-if="!c" class="qc-cal-blank" />
                  <button v-else type="button" class="qc-cal-day" :class="{ off: c < todayIso, start: c === dlDate }" :disabled="c < todayIso" @click="dlDate = c">{{ Number(c.slice(8)) }}</button>
                </template>
              </div>
            </div>
            <div class="qc-tc-tm">
              <div class="col">
                <button v-for="h in HOURS" :key="h" type="button" :class="{ on: dlTime.slice(0, 2) === h }" @click="dlTime = `${h}:${dlTime.slice(3) || '00'}`">{{ h }}</button>
              </div>
              <div class="col">
                <button v-for="m in MINS" :key="m" type="button" :class="{ on: dlTime.slice(3) === m }" @click="dlTime = `${dlTime.slice(0, 2) || '00'}:${m}`">{{ m }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="drawer-foot">
      <button type="button" class="btn" @click="emit('close')">取消</button>
      <button type="button" class="btn primary" :disabled="!canSubmit" @click="submit">发起</button>
    </div>

    <!-- 关联商品弹窗：商品列表多选（搜索＋勾选） -->
    <Modal v-if="goodsOpen" title="关联商品" sub="选择商品" size="lg" @close="goodsOpen = false">
      <div class="qc-tc-goods">
        <span class="sg-inputwrap qc-tc-gsearch">
          <input v-model="goodsQ" class="sg-input" placeholder="搜索商品名称 / 商品ID">
          <button v-if="goodsQ" type="button" class="sg-clear" title="清除" @click="goodsQ = ''">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" /><path d="m9 9 6 6M15 9-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
          </button>
        </span>
        <div class="qc-tc-glist">
          <label v-for="g in goodsRows" :key="g.id" class="qc-tc-grow">
            <Checkbox :checked="goodsPick.has(g.id)" @change="() => { const n = new Set(goodsPick); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); goodsPick = n; }" />
            <img class="qc-sg-prod-thumb" :src="thumbOf(g.id)" :alt="g.name">
            <div class="qc-sg-prod-info">
              <div class="qc-sg-prod-name" :title="g.name">{{ g.name }}</div>
              <div class="qc-sg-prod-meta"><span class="qc-sg-prod-lb">商品ID：</span>{{ g.id }}</div>
              <div class="qc-sg-prod-meta">
                <span class="qc-sg-prod-logo"><img :src="SHOP_LOGO[shopPlat(g.shopId)]" :alt="shopPlat(g.shopId)"></span>{{ shopName(g.shopId) }} · 上架 {{ g.listedAt }}
              </div>
            </div>
          </label>
          <div v-if="!goodsRows.length" class="qc-tc-gempty">无匹配商品</div>
        </div>
      </div>
      <template #foot>
        <button class="btn" @click="goodsOpen = false">取消</button>
        <button class="btn primary" @click="confirmGoods">确定({{ goodsPick.size }})</button>
      </template>
    </Modal>

    <!-- 发送人弹窗：通讯录多选 -->
    <QcAssignModal
      v-if="senderOpen"
      title="选择发送人"
      :source="INITIAL_MEMBERS"
      :initial-ids="senderIds"
      @close="senderOpen = false"
      @confirm="(ms: Member[]) => (senders = ms)"
    />
  </div>
</template>
