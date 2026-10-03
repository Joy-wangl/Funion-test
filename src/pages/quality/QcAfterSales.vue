<script setup lang="ts">
/* ---------- 售后列表（品控-线上）：逐单售后单明细（查询条件 + 明细表） ---------- */
import { computed, ref, watch } from 'vue';
import {
  AFTER_STATUSES, AFTER_TYPES, AFTER_PLATFORMS, AFTER_TYPE_EXCH_RESHIP, ONLINE_GROUPS, ONLINE_OPERATORS,
  afterJumpSeed, scanAfterOrders, sliceAfterOrders, onlineSeriesOfCode, onlineSessionsOf, patchOnlineSession,
  type AfterScan, type AfterOrderRow,
} from './qcOnlineData';
import type { ChatHit, ChatMessage, ChatSession } from './data';
import PlatLogo from './PlatLogo.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import QcTypeShuttle from './QcTypeShuttle.vue';
import ChatFullModal from './ChatFullModal.vue';

const ALL = { type: '全部类型', platform: '全部平台', status: '全部状态', sess: '全部' };
const SESS_OPTIONS = [ALL.sess, '有会话', '无会话'];
const GO_DEFAULT = '全部组别 / 全部运维';
const GO_OPTIONS = (() => {
  const opts = [GO_DEFAULT];
  for (const g of ONLINE_GROUPS) {
    opts.push(`${g} / 全部运维`);
    for (const o of ONLINE_OPERATORS) opts.push(`${g} / ${o}`);
  }
  return opts;
})();
const blank = () => ({ q: '', go: GO_DEFAULT, type: ALL.type, platform: ALL.platform, status: ALL.status, sess: ALL.sess, ptype: null as string | null, sub: null as string | null, from: '', to: '' });
const draft = ref(blank());
const applied = ref(blank());

/* 数据概览售后数据卡跳转：预选类型 / 状态后立即生效，消费后清空种子（侧栏直达不带筛选） */
watch(afterJumpSeed, (s) => {
  if (!s) return;
  draft.value = { ...blank(), ...s };
  applied.value = { ...blank(), ...s };
  afterJumpSeed.value = null;
}, { immediate: true });

const toQuery = (f: ReturnType<typeof blank>) => {
  const [g, o] = f.go.split(' / ');
  return { kw: f.q, group: g, operator: o, type: f.type, platform: f.platform, status: f.status, sess: f.sess, ptype: f.ptype, sub: f.sub, from: f.from, to: f.to };
};

/* 查询生效时全量扫描一次：累计命中数 / 小类计数 / 每系列命中数，分页切片再回生成取行 */
const scan = ref<AfterScan>(scanAfterOrders(toQuery(applied.value)));

const page = ref(1);
const pageSize = ref(20);
const jumpVal = ref('1');
watch(applied, (v) => { scan.value = scanAfterOrders(toQuery(v)); page.value = 1; jumpVal.value = '1'; });
const pageCount = computed(() => Math.max(1, Math.ceil(scan.value.total / pageSize.value)));
const rows = computed(() => sliceAfterOrders(toQuery(applied.value), scan.value.cum, (page.value - 1) * pageSize.value, page.value * pageSize.value));
const pageList = computed((): (number | 'gap')[] => {
  const total = pageCount.value;
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const cur = page.value;
  if (cur <= 6) return [1, 2, 3, 4, 5, 6, 'gap', total];
  if (cur >= total - 5) return [1, 'gap', total - 5, total - 4, total - 3, total - 2, total - 1, total];
  return [1, 'gap', cur - 1, cur, cur + 1, 'gap', total];
});
const onPageSize = (v: string) => { pageSize.value = parseInt(v, 10) || 20; page.value = 1; };
const onJump = () => {
  const n = parseInt(jumpVal.value, 10);
  if (!Number.isNaN(n)) page.value = Math.min(Math.max(1, n), pageCount.value);
  jumpVal.value = String(page.value);
};
watch(page, (v) => { jumpVal.value = String(v); });

const onQuery = () => { applied.value = { ...draft.value }; };
const onReset = () => { draft.value = blank(); applied.value = blank(); };

const statusTag = (s: string) => (s === '已处理' ? 'green' : s === '已拒绝' ? 'red' : 'orange');

/* 关联会话：由会话发起的售后单数据层已挂 sessionId，操作列点开聊天记录全屏弹窗（与售后单抽屉同源回写） */
const sessionModalId = ref<string | null>(null);
/* 会话按商品编码回查所属系列（onlineSeriesOfCode 以编码为键） */
const modalCode = ref<string | null>(null);
const sessVer = ref(0);
const openSession = (o: AfterOrderRow) => {
  modalCode.value = o.code;
  sessionModalId.value = o.sessionId ?? null;
};
const modalSessions = computed((): ChatSession[] => {
  void sessVer.value;
  if (!modalCode.value) return [];
  const s = onlineSeriesOfCode(modalCode.value);
  return s ? onlineSessionsOf(s).slice() : [];
});
const onModalHits = (id: string, hits: ChatHit[]) => {
  patchOnlineSession(id, hits);
  sessVer.value += 1;
};

/* 导出会话内容：逐消息展平为行（带 BOM，Excel 可直接打开） */
const ROLE_TEXT: Record<ChatMessage['role'], string> = { buyer: '买家', support: '人工客服', ai: 'AI 回复' };
const exportSession = () => {
  const s = modalSessions.value.find((x) => x.id === sessionModalId.value);
  if (!s) return;
  const head = ['会话编号', '平台', '关联订单', '消息时间', '发送方', '消息内容'];
  const body = s.messages.map((m) => [s.id, s.platform, s.orderId, m.time, ROLE_TEXT[m.role], m.text]);
  const csv = [head, ...body].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `会话记录-${s.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <div class="qc-head">
    <div class="qc-title">
      售后列表
      <span class="qc-desc">共 {{ scan.total.toLocaleString() }} 单 · {{ scan.cum.length.toLocaleString() }} 个系列</span>
    </div>
  </div>
  <div class="qc-ao-panel qc-as-page">
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>搜索</label>
          <input class="sg-input" placeholder="系列编码 / 商品名称 / 售后单号 / 订单号 / 商品编码" :value="draft.q" @input="draft.q = ($event.target as HTMLInputElement).value">
        </div>
        <div class="sg-field">
          <label>组别 / 运维人员</label>
          <BubbleSelect class-name="sg-select" :value="draft.go" :options="GO_OPTIONS" @change="(v: string) => (draft.go = v)" />
        </div>
        <div class="sg-field">
          <label>售后类型</label>
          <BubbleSelect class-name="sg-select" :value="draft.type" :options="[ALL.type, ...AFTER_TYPES, AFTER_TYPE_EXCH_RESHIP]" @change="(v: string) => (draft.type = v)" />
        </div>
        <div class="sg-field">
          <label>问题类型</label>
          <QcTypeShuttle
            class-name="sg-select"
            :ptype="draft.ptype"
            :sub="draft.sub"
            @change="(t: string | null, s: string | null) => { draft.ptype = t; draft.sub = s; }"
          />
        </div>
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="draft.platform" :options="[ALL.platform, ...AFTER_PLATFORMS]" @change="(v: string) => (draft.platform = v)" />
        </div>
        <div class="sg-field">
          <label>状态</label>
          <BubbleSelect class-name="sg-select" :value="draft.status" :options="[ALL.status, ...AFTER_STATUSES]" @change="(v: string) => (draft.status = v)" />
        </div>
        <div class="sg-field">
          <label>是否有会话</label>
          <BubbleSelect class-name="sg-select" :value="draft.sess" :options="SESS_OPTIONS" @change="(v: string) => (draft.sess = v)" />
        </div>
        <div class="sg-field">
          <label>申请时间</label>
          <span class="ao-range">
            <input type="date" class="ao-date" :value="draft.from" @input="draft.from = ($event.target as HTMLInputElement).value">
            <i>-</i>
            <input type="date" class="ao-date" :value="draft.to" @input="draft.to = ($event.target as HTMLInputElement).value">
          </span>
        </div>
        <div class="sg-field-actions">
          <button type="button" class="sg-btn" @click="onReset">重置</button>
          <button type="button" class="sg-btn primary" @click="onQuery">查询</button>
        </div>
      </div>
    </div>

    <div class="qc-body">
      <table class="table ao-table">
        <thead>
          <tr>
            <th>系列编码</th>
            <th>组别 / 运维人员</th>
            <th>订单号</th>
            <th>售后单号</th>
            <th>平台</th>
            <th>售后类型 / 售后原因</th>
            <th>问题小类</th>
            <th>金额</th>
            <th>状态</th>
            <th>申请时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in rows" :key="o.afterNo">
            <td class="col-name">
              <div class="qc-mono">{{ o.seriesCode }}</div>
              <div class="qc-mono">{{ o.code }}</div>
            </td>
            <td>{{ o.group === '—' ? '—' : `${o.group} / ${o.operator}` }}</td>
            <td class="qc-mono ao-wrap">{{ o.orderNo }}</td>
            <td class="qc-mono">{{ o.afterNo }}</td>
            <td>
              <span class="ao-plat"><PlatLogo :platform="o.platform" />{{ o.platform }}</span>
            </td>
            <td class="col-name">
              <div><span class="tag">{{ o.type }}</span></div>
              <div class="ao-reason" :title="o.reason">{{ o.reason }}</div>
            </td>
            <td><span class="tag">{{ o.psub || o.ptype }}</span></td>
            <td>¥{{ o.amount }}</td>
            <td><span class="tag" :class="statusTag(o.status)">{{ o.status }}</span></td>
            <td class="ao-wrap">{{ o.appliedAt }}</td>
            <td>
              <div class="qc-op-col">
                <a v-if="o.sessionId" @click="openSession(o)">查看会话</a>
                <span v-else class="ao-dim">—</span>
              </div>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td colspan="11">
              <div class="sg-empty-wrap">
                <div class="sg-empty-icon">◌</div>
                <div>暂无数据，请调整筛选条件</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="ib-pagination">
        <div class="ib-pageinfo">共 {{ scan.total.toLocaleString() }} 单</div>
        <BubbleSelect class-name="ib-page-size" :default-value="pageSize + '条/页'" :options="['5条/页', '10条/页', '20条/页']" @change="onPageSize" />
        <div class="ib-pages">
          <button class="ib-pagebtn nav" :disabled="page <= 1" @click="page--">‹</button>
          <template v-for="(p, i) in pageList" :key="i">
            <span v-if="p === 'gap'" class="ib-pagedots">…</span>
            <button v-else class="ib-pagebtn" :class="p === page ? 'active' : ''" @click="page = p">{{ p }}</button>
          </template>
          <button class="ib-pagebtn nav" :disabled="page >= pageCount" @click="page++">›</button>
        </div>
        <div class="ib-jump">
          <span>前往</span>
          <input class="ib-jump-input" :value="jumpVal" @input="jumpVal = ($event.target as HTMLInputElement).value" @keyup.enter="onJump">
          <span>页</span>
        </div>
      </div>
    </div>
  </div>

  <ChatFullModal
    v-if="sessionModalId"
    :sessions="modalSessions"
    :current-id="sessionModalId"
    :on-nav="(id: string) => (sessionModalId = id)"
    :on-close="() => (sessionModalId = null)"
    :on-update-hits="onModalHits"
    :on-export="exportSession"
    show-sub
  />
</template>
