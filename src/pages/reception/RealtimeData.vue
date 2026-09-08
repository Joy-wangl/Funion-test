<script setup lang="ts">
/* =========================================================
   聚合接待 · 主 tab「实时数据」（列表形式）
   筛选（公司/分组/客服名称/客服状态）+ 查询/刷新按钮同排右对齐
   列表卡：实时统计 chip + 最近更新时间 / 列表 / 总数分页
   四项指标（均响/未回复数/3分钟回复率/30秒响应率）按团队均值评判：
   绿=优于均值或达标 / 黄=劣于均值 20% 以内 / 红=劣于均值 20% 以上
   （均响、未回复数越低越好，反向判断）；字体统一黑 + 更浅档浅底区分，
   列头漏斗按评判等级筛选（与子表接待状态列头筛选同一交互）
   ========================================================= */
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { RC_COMPANIES, RC_COMPANY_GROUPS, RC_ALL_GROUPS, type RcAgent } from './data';

const props = defineProps<{
  agents: RcAgent[];
  pushToast: (msg: string, type?: 'success' | 'error') => void;
}>();

type RtFilter = { company: string; group: string; name: string; status: string };
const EMPTY: RtFilter = { company: '', group: '', name: '', status: '' };
const draft = ref<RtFilter>({ ...EMPTY });
const applied = ref<RtFilter>({ ...EMPTY });
const page = ref(1);
const pageSize = ref(10);

const STATUS_CLS: Record<string, string> = { 在线: 'rc-st on', 小休: 'rc-st rest', 离线: 'rc-st off' };

/* 分组选项跟随公司（级联） */
const groupOpts = computed(() => (draft.value.company === '' ? [...RC_ALL_GROUPS] : [...(RC_COMPANY_GROUPS[draft.value.company] ?? [])]));
const onCompany = (v: string) => {
  draft.value.company = v;
  if (v !== '' && draft.value.group !== '' && !(RC_COMPANY_GROUPS[v] ?? []).includes(draft.value.group)) draft.value.group = '';
};
const apply = () => { applied.value = { ...draft.value }; page.value = 1; };

/* ---------- 团队均值与评判等级 ---------- */
type Lv = 'g' | 'y' | 'r';
/** 基础集合（公司/分组/名称/状态筛选后）：团队均值口径 */
const base = computed(() => props.agents.filter((a) => {
  const f = applied.value;
  if (f.company !== '' && a.company !== f.company) return false;
  if (f.group !== '' && a.group !== f.group) return false;
  if (f.name !== '' && !a.name.includes(f.name)) return false;
  if (f.status !== '' && a.status !== f.status) return false;
  return true;
}));
const avg = computed(() => {
  const l = base.value;
  const n = l.length || 1;
  return {
    resp: l.reduce((s, a) => s + a.resp, 0) / n,
    unreplied: l.reduce((s, a) => s + a.unreplied, 0) / n,
    r3m: l.reduce((s, a) => s + a.r3m, 0) / n,
    r30s: l.reduce((s, a) => s + a.r30s, 0) / n,
  };
});
/** 越高越好：≥均值绿；低于均值 20% 以内黄；低于 20% 以上红 */
const lvUp = (v: number, m: number): Lv => (v >= m ? 'g' : v >= m * 0.8 ? 'y' : 'r');
/** 越低越好（均响/未回复）：≤均值绿；高于均值 20% 以内黄；高于 20% 以上红 */
const lvDown = (v: number, m: number): Lv => (v <= m ? 'g' : v <= m * 1.2 ? 'y' : 'r');
const levelsOf = (a: RcAgent) => ({
  resp: lvDown(a.resp, avg.value.resp),
  unreplied: lvDown(a.unreplied, avg.value.unreplied),
  r3m: lvUp(a.r3m, avg.value.r3m),
  r30s: lvUp(a.r30s, avg.value.r30s),
});
/* 四项评判指标（着色对象；列头漏斗即该指标的等级筛选器） */
const METRICS = [
  { key: 'resp', label: '均响' },
  { key: 'unreplied', label: '未回复数' },
  { key: 'r3m', label: '3分钟回复率' },
  { key: 'r30s', label: '30秒响应率' },
] as const;
type MetricKey = (typeof METRICS)[number]['key'];
const LV_OPTS: { v: Lv | ''; t: string }[] = [
  { v: '', t: '不限' },
  { v: 'g', t: '优异' },
  { v: 'y', t: '仍需努力' },
  { v: 'r', t: '未达标' },
];
/** 指标等级筛选：每列单选、空=不限；列间=与（列头漏斗菜单，即时生效） */
const colFilter = ref<Record<MetricKey, Lv | ''>>({ resp: '', unreplied: '', r3m: '', r30s: '' });
/** 当前展开的列头筛选菜单（全表同时只开一个） */
const filterMenu = ref<MetricKey | ''>('');
const pickLevel = (k: MetricKey, v: Lv | '') => {
  colFilter.value = { ...colFilter.value, [k]: v };
  page.value = 1;
  filterMenu.value = '';
};
const list = computed(() => base.value.filter((a) => {
  const l = levelsOf(a);
  return METRICS.every((m) => {
    const f = colFilter.value[m.key];
    return !f || l[m.key] === f;
  });
}));

/** 实时接待量：仅在线客服持有进行中会话（演示口径） */
const recvOf = (a: RcAgent) => (a.status === '在线' ? 40 + ((a.id * 7) % 20) : 0);

/* 右侧实时统计 chip（当前查询结果口径） */
const chips = computed(() => ({
  online: list.value.filter((a) => a.status === '在线').length,
  recv: list.value.reduce((s, a) => s + recvOf(a), 0),
  unreplied: list.value.reduce((s, a) => s + a.unreplied, 0),
  hasUnreplied: list.value.filter((a) => a.unreplied > 0).length,
}));

/* ---------- 刷新时间 ---------- */
const pad = (n: number) => String(n).padStart(2, '0');
const stampOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const updatedAt = ref(stampOf(new Date()));
const doRefresh = () => {
  updatedAt.value = stampOf(new Date());
  props.pushToast('实时数据已刷新');
};

/* ---------- 分页 ---------- */
const pages = computed(() => Math.max(1, Math.ceil(list.value.length / pageSize.value)));
const safePage = computed(() => Math.min(page.value, pages.value));
const pageRows = computed(() => list.value.slice((safePage.value - 1) * pageSize.value, safePage.value * pageSize.value));
</script>

<template>
  <div class="rc-rt-view">
    <!-- 查询区（独立白卡）：筛选 + 查询/刷新按钮同排右对齐 -->
    <div class="qc-body rc-filter-card">
      <div class="qc-filters rc-filter-row">
        <BubbleSelect
          class-name="input rc-bs"
          :value="draft.company || '公司'"
          :options="[...RC_COMPANIES]"
          @change="onCompany"
        />
        <BubbleSelect
          class-name="input rc-bs"
          :value="draft.group || '分组'"
          :options="groupOpts"
          @change="(v: string) => (draft.group = v)"
        />
        <input
          v-model="draft.name"
          class="input rc-input"
          placeholder="请输入客服名称"
          @keydown.enter="apply"
        />
        <BubbleSelect
          class-name="input rc-bs"
          :value="draft.status || '客服状态'"
          :options="['在线', '小休', '离线']"
          @change="(v: string) => (draft.status = v)"
        />
        <div class="rc-rt-actions">
          <button type="button" class="btn primary" @click="apply">查询数据</button>
          <button type="button" class="btn primary" @click="doRefresh">刷新数据</button>
        </div>
      </div>
    </div>

    <!-- 列表区（独立白卡）：统计 chip + 更新时间 / 列表 / 评判注释 / 总数分页 -->
    <div class="qc-body rc-table-card">
      <div class="rc-rt-bar">
        <div class="rc-rt-chips">
          <span class="rc-rt-chip">在线: <b class="g">{{ chips.online }}</b></span>
          <span class="rc-rt-chip">接待: <b>{{ chips.recv }}</b></span>
          <span class="rc-rt-chip">未回复: <b class="w">{{ chips.unreplied }}</b></span>
          <span class="rc-rt-chip">有未回复客服: <b class="r">{{ chips.hasUnreplied }}</b></span>
        </div>
        <span class="rc-rt-time">最近更新时间: {{ updatedAt }}</span>
      </div>
      <div class="rc-wide">
        <table class="table rc-rt-table">
          <thead>
            <tr>
              <th>客服</th>
              <th>分组</th>
              <th>ID</th>
              <th>接待状态</th>
              <th>接待</th>
              <th v-for="m in METRICS" :key="m.key">
                <span class="rc-rt-th">
                  {{ m.label }}
                  <span
                    class="rc-col-filter"
                    :class="{ on: !!colFilter[m.key] }"
                    title="按评判等级筛选"
                    @click="filterMenu = filterMenu === m.key ? '' : m.key"
                  >
                    <svg viewBox="0 0 1024 1024" width="12" height="12" aria-hidden="true">
                      <path fill="currentColor" d="M880 128H144c-13.3 0-20 16-10.7 25.4L416 448v320c0 12.7 10.3 23 23 23h146c12.7 0 23-10.3 23-23V448l282.7-294.6C900 144 893.3 128 880 128z" />
                    </svg>
                  </span>
                  <template v-if="filterMenu === m.key">
                    <div class="rc-col-mask" @click="filterMenu = ''" />
                    <div class="rc-col-menu">
                      <div
                        v-for="o in LV_OPTS"
                        :key="o.t"
                        class="rc-col-opt"
                        :class="{ cur: colFilter[m.key] === o.v }"
                        @click="pickLevel(m.key, o.v)"
                      ><i v-if="o.v" class="rc-rt-dot" :class="o.v" />{{ o.t }}</div>
                    </div>
                  </template>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in pageRows" :key="a.id">
              <td><b>{{ a.name }}</b></td>
              <td><span class="tag blue">{{ a.group }}</span></td>
              <td class="rc-dim">ID: {{ a.id }}</td>
              <td><span :class="STATUS_CLS[a.status]">{{ a.status }}</span></td>
              <td>{{ recvOf(a) }}</td>
              <td :class="`rc-lv-${levelsOf(a).resp}`">{{ a.resp }}s</td>
              <td :class="`rc-lv-${levelsOf(a).unreplied}`">{{ a.unreplied }}条</td>
              <td :class="`rc-lv-${levelsOf(a).r3m}`">{{ a.r3m }}%</td>
              <td :class="`rc-lv-${levelsOf(a).r30s}`">{{ a.r30s }}%</td>
            </tr>
            <tr v-if="pageRows.length === 0"><td colspan="9" class="rc-sub-empty">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
      <div class="rc-rt-note">
        评判标准：<i class="rc-rt-dot g" /> 优异，高于团队均值或达标；<i class="rc-rt-dot y" /> 仍需努力，低于团队均值 20% 以内；<i class="rc-rt-dot r" /> 未达标，低于团队均值 20% 以上（均响、未回复数为越低越好，反向判断）；单元格以浅底区分（字体统一黑），列头漏斗可按评判等级筛选对应指标。
      </div>
      <div class="rc-table-foot rc-rt-foot">
        <span class="rc-rt-total">总数: {{ list.length }}</span>
        <div class="rc-pager">
          <BubbleSelect
            class-name="select rc-pg-size"
            :value="String(pageSize)"
            :options="[
              { value: '10', label: '10条/页' },
              { value: '20', label: '20条/页' },
              { value: '50', label: '50条/页' },
            ]"
            @change="(v: string) => { pageSize = Number(v); page = 1; }"
          />
          <button type="button" class="rc-pg-btn" :disabled="safePage <= 1" @click="page = Math.max(1, page - 1)">‹</button>
          <button
            v-for="p in pages"
            :key="p"
            type="button"
            class="rc-pg-btn"
            :class="{ cur: p === safePage }"
            @click="page = p"
          >{{ p }}</button>
          <button type="button" class="rc-pg-btn" :disabled="safePage >= pages" @click="page = Math.min(pages, page + 1)">›</button>
          <span class="rc-pg-jump">
            前往
            <input
              :key="`${safePage}-${list.length}-${pageSize}`"
              :value="safePage"
              @keydown.enter="(e: KeyboardEvent) => {
                const v = Number((e.target as HTMLInputElement).value);
                if (Number.isFinite(v)) page = Math.min(pages, Math.max(1, Math.round(v)));
              }"
            />
            页
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
