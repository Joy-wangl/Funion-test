<script setup lang="ts">
/* =========================================================
   聚合接待 · 视图②「智能分流」策略页（面包屑：分流设置 › 智能分流）
   6 窗口 tab / 策略卡片 / 策略详情抽屉 / 选择账号弹窗
   ========================================================= */
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RC_COMPANY, RC_GROUPS, RC_STRATEGIES, type RcGroup, type RcStrategy } from './data';
import Modal from '../../components/Modal.vue';

/** 演示占位文案口径（与线上逐字一致） */
const toastPlaceholder = (name: string) => `演示原型：「${name}」页面暂未开放`;

const WINDOW_TABS = ['账号管理', '客服管理', '智能分流', '实时会话', '会话监控', '客服指标数据'];

interface Props {
  pushToast: (msg: string, type?: 'success' | 'error') => void;
  /** 表格页「智能分流」按钮跳转：打开对应分组首张策略卡抽屉 */
  openGroupId: number | null;
  /** 跳转序号：同组重复点击也能重新打开抽屉 */
  jumpSeq: number;
}
const props = defineProps<Props>();

type Filter = { company: string; group: string; name: string };
const EMPTY_FILTER: Filter = { company: '', group: '', name: '' };

/* ---------- 策略详情抽屉本地配置 ---------- */
interface DrawerCfg {
  modeTab: '常规' | '智能分流';
  regularOn: boolean;
  mode: string;
  metrics: boolean[];
  rules: { conj: string; v: string }[];
  modeOpen: boolean;
  personnel: string[];
}
const DEFAULT_CFG: DrawerCfg = {
  modeTab: '常规',
  regularOn: false,
  mode: '宝妈接待',
  metrics: [true, true, true, true],
  rules: [{ conj: '当', v: '30' }, { conj: '且', v: '20' }, { conj: '且', v: '50' }, { conj: '且', v: '50' }],
  modeOpen: true,
  personnel: [],
};
const METRIC_NAMES = ['均响', '未回复量', '3分钟回复率', '30秒响应率'];
const METRIC_UNITS = ['秒', '个', '%', '%'];
const METRIC_OPS = ['超出', '超出', '小于', '小于'];
const MODE_OPTIONS = [
  { k: '均衡', d: '按每分钟的接待量进行均衡分配' },
  { k: '灵活', d: '按当前客服的待处理量进行分配' },
  { k: '自定义', d: '根据自定义规则进行分配' },
  { k: '宝妈接待', d: '按宝妈接待规则进行分配' },
];

/** 线上候选客服名单（选择账号弹窗） */
const CANDIDATES: { group: RcGroup; names: string[] }[] = [
  { group: '宝妈一组', names: ['王强', '刘芳', '陈浩', '赵敏'] },
  { group: '宝妈二组', names: ['吴婷', '徐磊', '孙莉', '高原', '林晓芸', '马超'] },
  { group: '宝妈三组', names: ['周洁', '郑爽', '汪洋', '冯雪', '蒋芸', '沈月', '韩磊', '曹颖', '谢娜', '邓超'] },
  { group: '宝妈四组', names: ['杨幂', '秦岚'] },
];

const cards = ref<RcStrategy[]>(RC_STRATEGIES);
const draft = ref<Filter>({ ...EMPTY_FILTER });
const applied = ref<Filter>({ ...EMPTY_FILTER });
const drawerId = ref<number | null>(null);
const cfg = ref<DrawerCfg>({ ...DEFAULT_CFG });
const pickerOpen = ref(false);
const picked = ref<Set<string>>(new Set());
const pkGroup = ref('');
const pkName = ref('');

const filtered = computed(() => cards.value.filter((c) => {
  if (applied.value.company !== '' && applied.value.company !== RC_COMPANY) return false;
  if (applied.value.group !== '' && c.group !== applied.value.group) return false;
  if (applied.value.name !== '' && !c.name.includes(applied.value.name)) return false;
  return true;
}));

const drawerCard = computed(() => cards.value.find((c) => c.id === drawerId.value) ?? null);

const openCard = (card: RcStrategy) => {
  cfg.value = { ...DEFAULT_CFG, personnel: [card.name.split('/')[0]] };
  drawerId.value = card.id;
};

/** 表格页分组行「智能分流」跳转：打开该组第一张卡片 */
watch(() => [props.openGroupId, props.jumpSeq] as const, () => {
  if (props.openGroupId == null || props.jumpSeq === 0) return;
  const card = cards.value.find((c) => c.id === props.openGroupId);
  if (card) openCard(card);
});

/** Esc：先关选择账号，再关策略抽屉 */
const onKey = (e: KeyboardEvent) => {
  if (e.key !== 'Escape') return;
  if (pickerOpen.value) pickerOpen.value = false;
  else if (drawerId.value !== null) drawerId.value = null;
};
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));

const toggleCardSwitch = (card: RcStrategy) => {
  cards.value = cards.value.map((c) => (c.id === card.id ? { ...c, on: !c.on } : c));
  props.pushToast(`${card.on ? '已停用' : '已启用'}策略「${card.name}」`);
};

const deleteCard = () => {
  if (!drawerCard.value) return;
  cards.value = cards.value.filter((c) => c.id !== drawerCard.value!.id);
  props.pushToast(`已删除策略「${drawerCard.value.name}」`);
  drawerId.value = null;
};

/** 选择账号弹窗：候选按筛选分组展示 */
const pkCandidates = computed(() => CANDIDATES
  .filter((b) => pkGroup.value === '' || b.group === pkGroup.value)
  .map((b) => ({ group: b.group, names: b.names.filter((n) => pkName.value === '' || n.includes(pkName.value)) }))
  .filter((b) => b.names.length > 0));
const pkSelected = computed(() => CANDIDATES
  .map((b) => ({ group: b.group, names: b.names.filter((n) => picked.value.has(n)) }))
  .filter((b) => b.names.length > 0));
</script>

<template>
  <div class="rc-view">
    <!-- 窗口式 tab：仅「智能分流」为功能页，其余为演示占位 -->
    <div class="rc-wtabs">
      <div
        v-for="t in WINDOW_TABS"
        :key="t"
        class="rc-wtab"
        :class="{ active: t === '智能分流' }"
        @click="props.pushToast(t === '智能分流' ? '演示原型：当前页不可关闭' : toastPlaceholder(t))"
      >
        {{ t }}
        <span class="x" @click.stop="props.pushToast(t === '智能分流' ? '演示原型：当前页不可关闭' : toastPlaceholder(t))">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      </div>
    </div>

    <div class="qc-body">
      <!-- 筛选区 -->
      <div class="qc-filters rc-filter-row">
        <select v-model="draft.company" class="select">
          <option value="">公司</option>
          <option :value="RC_COMPANY">{{ RC_COMPANY }}</option>
        </select>
        <select v-model="draft.group" class="select">
          <option value="">组别</option>
          <option v-for="g in RC_GROUPS" :key="g" :value="g">{{ g }}</option>
        </select>
        <input
          v-model="draft.name"
          class="input rc-input"
          placeholder="策略名称"
          @keydown.enter="applied = { ...draft }"
        />
        <div class="rc-actions">
          <button type="button" class="btn primary" @click="applied = { ...draft }">查询</button>
          <button type="button" class="btn" @click="draft = { ...EMPTY_FILTER }; applied = { ...EMPTY_FILTER }; props.pushToast('筛选条件已重置')">重置</button>
        </div>
      </div>

      <!-- 总公司区 -->
      <div class="rc-sec-title">总公司区</div>
      <div class="rc-company-box">
        <div class="rc-company-name">{{ RC_COMPANY }}</div>
        <div v-if="filtered.length === 0" class="rc-empty">暂无数据</div>
        <div v-else class="rc-cards">
          <div v-for="c in filtered" :key="c.id" class="rc-card" @click="openCard(c)">
            <div class="rc-card-head">
              <b class="rc-card-name">{{ c.name }}</b>
              <span
                class="rc-switch"
                :class="{ on: c.on }"
                title="启用/停用策略"
                @click.stop="toggleCardSwitch(c)"
              ><i /></span>
            </div>
            <div class="rc-card-tags">
              <span v-for="t in c.tags" :key="t" class="rc-tag" :class="t === '自营' ? 'green' : 'orange'">{{ t }}</span>
              <span class="rc-tag blue">会话次数：{{ c.sessions }}</span>
            </div>
            <div class="rc-card-grid">
              <span class="full">公司：{{ RC_COMPANY }}</span>
              <span>店铺数量：{{ c.shops }}</span>
              <span>包含{{ c.people }}人</span>
              <span>系列编码数量：{{ c.codes }}</span>
              <span>标签：未设置</span>
              <span>优先级：{{ c.priority }}</span>
              <span>ID：{{ c.id }}</span>
              <span class="full">名称：{{ c.name }}</span>
            </div>
            <span
              class="rc-card-clock"
              title="变更记录"
              @click.stop="props.pushToast('演示占位：变更记录后续迭代设计')"
            >⏱</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ---------- 策略详情抽屉 ---------- -->
    <div v-if="drawerCard" class="rc-drawer-mask" @click="drawerId = null">
      <div class="rc-drawer" @click.stop>
        <div class="rc-drawer-title">策略详情</div>
        <div class="rc-drawer-main">
          <!-- 左栏：主策略 -->
          <div class="rc-drawer-left">
            <div class="rc-sub-title">主策略</div>
            <div class="rc-card mini">
              <div class="rc-card-head">
                <b class="rc-card-name">{{ drawerCard.name }}</b>
                <span class="rc-switch" :class="{ on: drawerCard.on }"><i /></span>
              </div>
              <div class="rc-card-tags">
                <span v-for="t in drawerCard.tags" :key="t" class="rc-tag" :class="t === '自营' ? 'green' : 'orange'">{{ t }}</span>
                <span class="rc-tag blue">会话次数：{{ drawerCard.sessions }}</span>
              </div>
            </div>
            <button
              type="button"
              class="btn primary rc-add-sub"
              @click="props.pushToast('演示占位：子策略规则新增后续迭代设计')"
            >子策略规则＋</button>
          </div>

          <!-- 右栏：配置 -->
          <div class="rc-drawer-right">
            <div class="rc-drawer-head">
              <b>{{ drawerCard.name }}</b>
              <div class="rc-drawer-btns">
                <button type="button" class="btn" @click="drawerId = null">关闭</button>
                <button type="button" class="btn primary" @click="props.pushToast(`已保存策略「${drawerCard.name}」`)">保存</button>
                <button type="button" class="btn danger" @click="deleteCard">删除</button>
              </div>
            </div>

            <div class="rc-cfg-row">
              <span>系列商品编码</span>
              <a @click="props.pushToast('「系列商品编码」配置（演示占位，后续迭代设计）')">添加 ›</a>
            </div>
            <div class="rc-cfg-row">
              <span>商品ID</span>
              <a @click="props.pushToast('「商品ID」配置（演示占位，后续迭代设计）')">添加 ›</a>
            </div>
            <div class="rc-cfg-row">
              <span>状态 <span class="rc-dim">已选择</span> <span class="rc-pill blue">售前</span> <span class="rc-dim">状态</span></span>
              <a @click="props.pushToast('「状态」配置（演示占位，后续迭代设计）')">添加 ›</a>
            </div>
            <div class="rc-cfg-row">
              <span>生效时间配置</span>
              <a @click="props.pushToast('「生效时间配置」配置（演示占位，后续迭代设计）')">配置 ›</a>
            </div>
            <div class="rc-cfg-row">
              <span>分流归属 <span class="rc-pill">已选择 1 个公司</span></span>
              <a @click="props.pushToast('「分流归属」配置（演示占位，后续迭代设计）')">添加 ›</a>
            </div>
            <div class="rc-cfg-row">
              <span>分流模式</span>
              <a @click="cfg = { ...cfg, modeOpen: !cfg.modeOpen }">配置 {{ cfg.modeOpen ? '∧' : '∨' }}</a>
            </div>

            <div v-if="cfg.modeOpen" class="rc-mode-box">
              <div class="rc-seg-tabs">
                <button
                  v-for="t in (['常规', '智能分流'] as const)"
                  :key="t"
                  type="button"
                  :class="{ cur: cfg.modeTab === t }"
                  @click="cfg = { ...cfg, modeTab: t }"
                >{{ t }}</button>
              </div>
              <div class="rc-mode-line">
                常规分流是否启用：
                <span
                  class="rc-switch"
                  :class="{ on: cfg.regularOn }"
                  @click="cfg = { ...cfg, regularOn: !cfg.regularOn }"
                ><i /></span>
              </div>
              <div class="rc-mode-radios">
                <label v-for="m in MODE_OPTIONS" :key="m.k" class="rc-radio">
                  <input
                    type="radio"
                    name="rc-mode"
                    :checked="cfg.mode === m.k"
                    @change="cfg = { ...cfg, mode: m.k }"
                  />
                  <b>{{ m.k }}</b>
                  <span>（{{ m.d }}）</span>
                </label>
              </div>
              <div class="rc-mode-metrics">
                <label v-for="(m, i) in METRIC_NAMES" :key="m">
                  <input
                    type="checkbox"
                    :checked="cfg.metrics[i]"
                    @change="cfg = { ...cfg, metrics: cfg.metrics.map((v, j) => (j === i ? !v : v)) }"
                  />
                  {{ m }}
                </label>
              </div>
              <div class="rc-rules">
                <div v-for="(r, i) in cfg.rules" :key="i" class="rc-rule">
                  <span v-if="i === 0" class="rc-rule-kw">当</span>
                  <select
                    v-else
                    class="select rc-rule-conj"
                    :value="r.conj"
                    @change="cfg = { ...cfg, rules: cfg.rules.map((x, j) => (j === i ? { ...x, conj: ($event.target as HTMLSelectElement).value } : x)) }"
                  >
                    <option value="且">且</option>
                    <option value="或">或</option>
                  </select>
                  <span>{{ METRIC_NAMES[i] }}{{ METRIC_OPS[i] }}</span>
                  <input
                    class="input rc-rule-v"
                    :value="r.v"
                    @input="cfg = { ...cfg, rules: cfg.rules.map((x, j) => (j === i ? { ...x, v: ($event.target as HTMLInputElement).value } : x)) }"
                  />
                  <span>{{ METRIC_UNITS[i] }}，则分流给排名下一位客服</span>
                </div>
              </div>
              <div class="rc-people">
                <div class="rc-people-head">
                  <span>人员配置</span>
                  <a @click="picked = new Set(cfg.personnel); pkGroup = ''; pkName = ''; pickerOpen = true">+ 添加</a>
                </div>
                <div class="rc-people-box">
                  <span v-if="cfg.personnel.length === 0" class="rc-dim">请点击右上角「添加」配置分流人员</span>
                  <template v-else>
                    <span>组别：{{ drawerCard.group }}</span>
                    <span class="rc-dim">→</span>
                    <span v-for="p in cfg.personnel" :key="p" class="rc-people-chip">{{ p }}</span>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ---------- 选择账号弹窗 ---------- -->
    <Modal
      v-if="pickerOpen"
      title="选择账号"
      size="lg"
      @close="pickerOpen = false"
    >
      <div class="qc-filters rc-filter-row">
        <select class="select" value="" @change="() => {}">
          <option value="">公司</option>
          <option>{{ RC_COMPANY }}</option>
        </select>
        <select v-model="pkGroup" class="select">
          <option value="">分组</option>
          <option v-for="g in RC_GROUPS" :key="g" :value="g">{{ g }}</option>
        </select>
        <input
          v-model="pkName"
          class="input rc-input wide"
          placeholder="请输入姓名"
        />
      </div>
      <div class="rc-pick-panes">
        <div class="rc-pick-pane">
          <div v-if="pkCandidates.length === 0" class="rc-empty-sm">暂无数据</div>
          <div v-for="b in pkCandidates" :key="b.group" class="rc-pick-block">
            <div class="rc-pick-group">组别：{{ b.group }}</div>
            <label v-for="n in b.names" :key="n" class="rc-pick-item">
              <input
                type="checkbox"
                :checked="picked.has(n)"
                @change="() => {
                  const next = new Set(picked);
                  if (next.has(n)) next.delete(n);
                  else next.add(n);
                  picked = next;
                }"
              />
              {{ n }}
            </label>
          </div>
        </div>
        <div class="rc-pick-pane">
          <div v-if="pkSelected.length === 0" class="rc-empty-sm">在左侧勾选以添加人员</div>
          <div v-for="b in pkSelected" :key="b.group" class="rc-pick-block">
            <div class="rc-pick-group">组别：{{ b.group }}</div>
            <label v-for="n in b.names" :key="n" class="rc-pick-item">
              <input
                type="checkbox"
                checked
                @change="() => {
                  const next = new Set(picked);
                  next.delete(n);
                  picked = next;
                }"
              />
              {{ n }}
            </label>
          </div>
        </div>
      </div>
      <template #foot>
        <button type="button" class="btn" @click="pickerOpen = false">取消</button>
        <button
          type="button"
          class="btn primary"
          @click="cfg = { ...cfg, personnel: [...picked] }; pickerOpen = false; props.pushToast('已确认分流人员选择')"
        >确定</button>
      </template>
    </Modal>
  </div>
</template>
