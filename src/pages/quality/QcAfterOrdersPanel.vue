<script setup lang="ts">
/* ---------- 售后单列表面板：标准查询条件表单 + 逐单明细（售后抽屉与系列详情 Tab 共用） ---------- */
import { computed, nextTick, ref, watch } from 'vue';
import type { DateRange, QcCenterSeries, RangeKey } from './qcCenterData';
import { DEFAULT_CUSTOM_RANGE, PROBLEM_TYPE_COLOR } from './qcCenterData';
import { SHOP_NAME, type ChatHit, type ChatSession } from './data';
import { AFTER_STATUSES, AFTER_TYPES, drawerRangeWindow, onlineAfterOrdersOf, onlineSessionsOf, patchOnlineSession, type OnlineAfterOrder } from './qcOnlineData';
import PlatLogo from './PlatLogo.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import ChatFullModal from './ChatFullModal.vue';
import QcDateRangePicker from './QcDateRangePicker.vue';

const props = defineProps<{
  series: QcCenterSeries;
  /** 问题类型大类（系列详情售后单场景点占比条传入），缺省不限 */
  ptype?: string | null;
  /** 问题类型小类（系列详情售后单场景小类快选传入），缺省不限 */
  psub?: string | null;
  /** 平台初值（系列详情总览矩阵点格前往传入），缺省不限 */
  initPlatform?: string | null;
  /** 问题小类列（系列详情售后单场景传入：最终命中口径为小类），缺省不展示 */
  showPsub?: boolean;
  /** 商品编码切换由外部宿主（系列详情顶部编码 tab）接管：undefined=面板自带编码筛选；null=外部全部；字符串=外部指定编码 */
  codeScope?: string | null;
  /** 时间范围由外部宿主（系列详情头部）接管：传入后面板隐藏自带申请时间条件，按宿主窗口过滤 */
  range?: RangeKey;
  custom?: DateRange;
  /** 抽屉内嵌态：隐藏查询表单与状态列，平台/售后类型由外部 pill 行传入并即时生效 */
  embedded?: boolean;
  platform?: string | null;
  atype?: string | null;
  /** 商品维度内嵌（已在店铺内）：隐藏平台列与导出平台字段，单平台上下文无需重复展示 */
  hidePlat?: boolean;
  /** 关联会话弹窗内修改命中类型时回传宿主（与列表会话卡同源回写），缺省面板自行回写缓存 */
  onUpdateHits?: (id: string, hits: ChatHit[]) => void;
  /** 会话卡「售后单」按钮前往：跳到该售后单所在页并高亮该行 */
  focusNo?: string | null;
  /** 商品维度 SKU 归属解析（缺省＝无 SKU 维度，保持商品编码口径） */
  skuOf?: (key: string) => string | null;
  /** 当前 SKU 下钻：null=全部SKU（编码列改 SKU 复合列）；字符串=指定 SKU（编码列保持商品编码，一个 SKU 可对应多个编码） */
  skuScope?: string | null;
  /** SKU 主图/销量（全部SKU 态复合列展示） */
  skuMeta?: (sk: string) => { thumb: string; sales: number };
}>();

const orders = computed(() => {
  let list = onlineAfterOrdersOf(props.series);
  if (props.codeScope) list = list.filter((o) => o.code === props.codeScope);
  if (props.skuOf && props.skuScope) list = list.filter((o) => props.skuOf!(o.afterNo) === props.skuScope);
  if (props.range) {
    const [from, to] = drawerRangeWindow(props.range, props.custom);
    list = list.filter((o) => {
      const day = o.appliedAt.slice(0, 10);
      return day >= from && day <= to;
    });
  }
  return list;
});

/* 申请时间日历可选边界：取该系列售后单实际跨度（空数据回退默认近30天轴） */
const aoBounds = computed(() => {
  const days = onlineAfterOrdersOf(props.series).map((o) => o.appliedAt.slice(0, 10)).sort();
  return days.length
    ? { min: days[0], max: days[days.length - 1] }
    : { min: DEFAULT_CUSTOM_RANGE.start, max: DEFAULT_CUSTOM_RANGE.end };
});

/* 查询条件：与监控列表筛选区同语言（sg-grid 字段 + 草稿/生效分离，点查询生效） */
const AO_ALL = { code: '全部', type: '全部类型', platform: '全部平台', status: '全部状态' };
const AO_PLATS = ['拼多多', '抖音', '京东', '淘宝', '快手', '天猫'];
const blank = (platform = AO_ALL.platform) => ({ code: AO_ALL.code, type: AO_ALL.type, platform, status: AO_ALL.status, q: '', from: '', to: '' });
const draft = ref(blank(props.initPlatform ?? undefined));
const applied = ref(blank(props.initPlatform ?? undefined));

const filtered = computed(() => {
  if (props.embedded) {
    return orders.value.filter((o) => {
      if (props.ptype && o.ptype !== props.ptype) return false;
      if (props.psub && o.psub !== props.psub) return false;
      if (props.platform && o.platform !== props.platform) return false;
      if (props.atype && o.type !== props.atype) return false;
      return true;
    });
  }
  const a = applied.value;
  const kw = a.q.trim().toLowerCase();
  return orders.value.filter((o) => {
    if (props.ptype && o.ptype !== props.ptype) return false;
    if (props.psub && o.psub !== props.psub) return false;
    if (a.code !== AO_ALL.code && o.code !== a.code) return false;
    if (a.type !== AO_ALL.type && o.type !== a.type) return false;
    if (a.platform !== AO_ALL.platform && o.platform !== a.platform) return false;
    if (a.status !== AO_ALL.status && o.status !== a.status) return false;
    if (kw && !o.afterNo.toLowerCase().includes(kw) && !o.orderNo.toLowerCase().includes(kw) && !o.code.toLowerCase().includes(kw)) return false;
    const day = o.appliedAt.slice(0, 10);
    if (a.from && day < a.from) return false;
    if (a.to && day > a.to) return false;
    return true;
  });
});

const page = ref(1);
const pageSize = 20;
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const rows = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));
/* 外部大类/小类快选、内嵌态 pill 条件与头部时间范围变化后收敛，页码回到首页避免停在空页 */
watch(() => [props.ptype, props.psub, props.range, props.custom, props.platform, props.atype], () => { page.value = 1; });
/* 外部平台初值变化（总览矩阵点格前往）直接生效到草稿与生效条件 */
watch(() => props.initPlatform, (v) => {
  const p = v ?? AO_ALL.platform;
  draft.value.platform = p;
  applied.value.platform = p;
  page.value = 1;
});
const onQuery = () => { applied.value = { ...draft.value }; page.value = 1; };
const onReset = () => { draft.value = blank(); applied.value = blank(); page.value = 1; };

/* 会话卡「售后单」按钮前往：定位该单所在页并滚动高亮（内嵌态条件由宿主收敛为全部，确保可见） */
watch(() => props.focusNo, (no) => {
  if (!no) return;
  const idx = filtered.value.findIndex((o) => o.afterNo === no);
  if (idx >= 0) page.value = Math.floor(idx / pageSize) + 1;
  nextTick(() => {
    document.querySelector('.qc-ao-panel tr.ao-focus')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}, { immediate: true });

const statusTag = (s: string) => (s === '已处理' ? 'green' : s === '已拒绝' ? 'red' : 'orange');

/* 商品维度全部SKU 态：编码列改 SKU 复合列（主图/名称/销量）；指定 SKU 或系列维度保持商品编码 */
const skuColMode = computed(() => !!props.skuOf && props.skuScope === null);
const skuCellOf = (o: OnlineAfterOrder) => {
  const sk = props.skuOf?.(o.afterNo) ?? '—';
  const meta = props.skuMeta?.(sk) ?? { thumb: '', sales: 0 };
  return { name: sk, thumb: meta.thumb, sales: meta.sales };
};
/* 问题小类芯片：同监控列表命中问题类型语言（所属大类色 tint 底 + 同色文字） */
const psubColor = (o: OnlineAfterOrder) => PROBLEM_TYPE_COLOR[o.ptype] || '#4f7cff';

/* 关联会话：部分售后单由会话发起（数据层已挂 sessionId），操作列点开对应聊天记录全屏弹窗 */
const sessionModalId = ref<string | null>(null);
const sessVer = ref(0);
const seriesSessions = computed((): ChatSession[] => {
  void sessVer.value;
  return onlineSessionsOf(props.series).slice();
});
const onModalHits = (id: string, hits: ChatHit[]) => {
  if (props.onUpdateHits) props.onUpdateHits(id, hits);
  else patchOnlineSession(id, hits);
  sessVer.value += 1;
};

/* 客服打标映射：sessionId → csTag（供 ChatFullModal 左栏只读展示） */
const csTagMap = computed(() => {
  const map: Record<string, string> = {};
  orders.value.forEach((o) => { if (o.sessionId && o.csTag) map[o.sessionId] = o.csTag; });
  return map;
});

const exportCsv = () => {
  const head = props.hidePlat
    ? ['商品编码', '订单号', '售后单号', '售后类型', '售后原因', '金额', '状态', '申请时间']
    : ['商品编码', '订单号', '售后单号', '平台', '售后类型', '售后原因', '金额', '状态', '申请时间'];
  const body = filtered.value.map((o) => (props.hidePlat
    ? [o.code, o.orderNo, o.afterNo, o.type, o.reason, o.amount, o.status, o.appliedAt]
    : [o.code, o.orderNo, o.afterNo, o.platform, o.type, o.reason, o.amount, o.status, o.appliedAt]));
  const csv = [head, ...body].map((r) => r.join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `售后单列表-${props.series.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
defineExpose({ exportCsv });
</script>

<template>
  <div class="qc-ao-panel" :class="{ 'ao-has-psub': showPsub, 'ao-compact': hidePlat && embedded, 'ao-sku-col': skuColMode }">
    <div v-if="!embedded" class="sg-filter">
      <div class="sg-grid">
        <div v-if="codeScope === undefined" class="sg-field">
          <label>商品编码</label>
          <BubbleSelect class-name="sg-select" :value="draft.code" :options="[AO_ALL.code, ...series.codes.map((c) => c.code)]" @change="(v: string) => (draft.code = v)" />
        </div>
        <div class="sg-field">
          <label>售后类型</label>
          <BubbleSelect class-name="sg-select" :value="draft.type" :options="[AO_ALL.type, ...AFTER_TYPES]" @change="(v: string) => (draft.type = v)" />
        </div>
        <div class="sg-field">
          <label>平台</label>
          <BubbleSelect class-name="sg-select" :value="draft.platform" :options="[AO_ALL.platform, ...AO_PLATS]" @change="(v: string) => (draft.platform = v)" />
        </div>
        <div class="sg-field">
          <label>状态</label>
          <BubbleSelect class-name="sg-select" :value="draft.status" :options="[AO_ALL.status, ...AFTER_STATUSES]" @change="(v: string) => (draft.status = v)" />
        </div>
        <div class="sg-field">
          <label>搜索</label>
          <input
            class="sg-input"
            placeholder="售后单号 / 原始单号 / 商品编码"
            :value="draft.q"
            @input="draft.q = ($event.target as HTMLInputElement).value"
          >
        </div>
        <div v-if="range === undefined" class="sg-field">
          <label>申请时间</label>
          <QcDateRangePicker
            :custom="{ start: draft.from || aoBounds.min, end: draft.to || aoBounds.max }"
            :min="aoBounds.min"
            :max="aoBounds.max"
            :on-change="(d: DateRange) => { draft.from = d.start; draft.to = d.end; }"
          />
        </div>
        <div class="sg-field-actions">
          <button type="button" class="sg-btn" @click="onReset">重置</button>
          <button type="button" class="sg-btn primary" @click="onQuery">查询</button>
        </div>
      </div>
    </div>

    <slot />

    <table class="table ao-table">
      <thead>
        <tr>
          <th v-if="!hidePlat">平台</th>
          <th>订单/售后单号</th>
          <th>{{ skuColMode ? 'SKU' : '商品编码' }}</th>
          <th>售后类型 / 售后原因</th>
          <th>客服标签</th>
          <th v-if="showPsub">问题小类</th>
          <th>申请时间</th>
          <th v-if="!embedded">状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="o in rows" :key="o.afterNo" :class="{ 'ao-focus': o.afterNo === focusNo }">
          <td v-if="!hidePlat">
            <span class="ao-plat"><PlatLogo :platform="o.platform" />{{ o.platform }}</span>
            <div class="ao-shop">{{ SHOP_NAME[o.platform] }}</div>
          </td>
          <td class="ao-nos">
            <div><span class="ao-no-lb">订单</span><span class="qc-mono">{{ o.orderNo }}</span></div>
            <div><span class="ao-no-lb">售后</span><span class="qc-mono">{{ o.afterNo }}</span></div>
          </td>
          <!-- 全部SKU 态：编码列改 SKU 复合列（主图/名称/销量，同评价列表 SKU 列语言）；其余态保持商品编码芯片 -->
          <td v-if="skuColMode">
            <div class="qc-sku-cell">
              <img class="qc-sku-thumb" :src="skuCellOf(o).thumb || '/products/main.png'" :alt="skuCellOf(o).name">
              <div class="qc-sku-info">
                <div class="qc-sku-name" :title="skuCellOf(o).name">{{ skuCellOf(o).name }}</div>
                <span class="qc-sku-sale">销量 {{ skuCellOf(o).sales.toLocaleString() }}</span>
              </div>
            </div>
          </td>
          <td v-else><span class="tag">{{ o.code }}</span></td>
          <td class="col-name">
            <div><span class="tag">{{ o.type }}</span></div>
            <div class="ao-reason" :title="o.reason">{{ o.reason }}</div>
          </td>
          <td class="ao-cs"><span v-if="o.csTag" class="tag">{{ o.csTag }}</span><span v-else class="ao-dim">—</span></td>
          <td v-if="showPsub">
            <span class="tag" :style="{ background: `${psubColor(o)}1a`, color: psubColor(o) }">{{ o.psub || o.ptype }}</span>
          </td>
          <td class="ao-wrap">{{ o.appliedAt }}</td>
          <td v-if="!embedded"><span class="tag" :class="statusTag(o.status)">{{ o.status }}</span></td>
          <td>
            <div class="qc-op-col">
              <a v-if="o.sessionId" @click="sessionModalId = o.sessionId">查看会话</a>
              <span v-else class="ao-dim">—</span>
            </div>
          </td>
        </tr>
        <tr v-if="!rows.length">
          <td :colspan="7 + (hidePlat ? -1 : 0) + (showPsub ? 1 : 0) + (embedded ? 0 : 1)">
            <div class="sg-empty-wrap">
              <div class="sg-empty-icon">◌</div>
              <div>暂无数据，请调整筛选条件</div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="pageCount > 1" class="ao-foot">
      <span>第 {{ page }} / {{ pageCount }} 页 · 共 {{ filtered.length.toLocaleString() }} 单</span>
      <button type="button" class="sg-btn" :disabled="page <= 1" @click="page--">‹ 上一页</button>
      <button type="button" class="sg-btn" :disabled="page >= pageCount" @click="page++">下一页 ›</button>
    </div>

    <ChatFullModal
      v-if="sessionModalId"
      :sessions="seriesSessions"
      :current-id="sessionModalId"
      :on-nav="(id: string) => (sessionModalId = id)"
      :on-close="() => (sessionModalId = null)"
      :on-update-hits="onModalHits"
      :cs-tag-map="csTagMap"
      show-sub
    />
  </div>
</template>
