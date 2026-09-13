<script setup lang="ts">
import { ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import {
  MV_PICK_SORTS, MV_SHELF_DAYS, MV_STRATEGIES, MV_TRIGGER_CONDS, mvPickSummary, mvShopOf, mvShops, mvTargetShops,
  type MvPickSort, type MvScheduleMode, type MvShelfDays, type MvTask, type MvTaskType,
} from './moveData';
import { PLATFORM_LOGO } from './data';

/** 搬家任务配置抽屉：三步向导 ① 选源店铺 → ② 执行条件与策略 → ③ 发布设置；新建 / 编辑 */
const props = defineProps<{ model: MvTask | null; presetShopId?: string; tasks: MvTask[] }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'save', t: MvTask): void }>();

const m = props.model;
const step = ref(1);
const STEPS = [
  { n: 1, label: '选源店铺' },
  { n: 2, label: '执行条件与策略' },
  { n: 3, label: '发布设置' },
];

/* 步骤1：任务命名 + 源店铺多选（不做占用校验：不同任务/条件可发布到不同店铺） */
const name = ref(m?.name ?? '');
const preset = mvShops.find((s) => s.id === props.presetShopId);
const sourceIds = ref<string[]>(m ? [...m.sourceShopIds] : preset && preset.platform !== '视频号' ? [preset.id] : []);
const toggleSource = (id: string) => {
  sourceIds.value = sourceIds.value.includes(id) ? sourceIds.value.filter((x) => x !== id) : [...sourceIds.value, id];
};

/* 步骤2：执行条件（类型+调度）+ 选品规则 + 策略与策略关联店铺 */
const type = ref<MvTaskType>(m?.type ?? '定时');
const scheduleMode = ref<MvScheduleMode>(m?.scheduleMode ?? '长期');
const onceTime = ref('2026-09-12 02:00');
const cycle = ref('每天');
const cycleTime = ref('02:00');
const triggerCond = ref(m?.triggerCond ?? MV_TRIGGER_CONDS[0]);
const intervalN = ref('6');
const intervalUnit = ref('小时');
const pickSort = ref<MvPickSort>(m?.pick.sort ?? '销量降序');
const minSold = ref(String(m?.pick.minSold ?? 0));
const minOrders = ref(String(m?.pick.minOrders ?? 0));
const shelfDays = ref<MvShelfDays>(m?.pick.shelfDays ?? '不限');
const limitMode = ref<'全部' | '取前N款'>((m?.pick.limit ?? 0) > 0 ? '取前N款' : '全部');
const limitN = ref(String(m?.pick.limit || 100));
const scope = ref<MvTask['scope']>(m?.scope ?? '全店商品');
const excludeOff = ref(m?.excludeOff ?? true);
const strategy = ref(m?.strategy ?? '');
/* 策略关联店铺：发布落地店（视频号单选），策略规则在该店生效 */
const targetId = ref(m?.targetShopId ?? (preset && preset.platform === '视频号' ? preset.id : mvTargetShops[0].id));

/* 步骤3：发布设置 */
const publishMode = ref<MvTask['publishMode']>(m?.publishMode ?? '发布到仓库');
const batchSize = ref(String(m?.batchSize ?? 50));
const precheck = ref(m?.precheck ?? true);

/* 执行规则摘要：按类型生成，列表与批次触发同源 */
const buildRule = () => {
  if (type.value === '定时') return scheduleMode.value === '一次性' ? `${onceTime.value} 执行一次` : `${cycle.value} ${cycleTime.value} 执行`;
  if (type.value === '条件触发') return `${triggerCond.value}时即时触发`;
  return `每${intervalN.value}${intervalUnit.value}执行一次`;
};
const pickNow = () => ({
  sort: pickSort.value,
  minSold: Number(minSold.value) || 0,
  minOrders: Number(minOrders.value) || 0,
  shelfDays: shelfDays.value,
  limit: limitMode.value === '取前N款' ? Number(limitN.value) || 0 : 0,
});

/* 步骤推进：当前步必填校验通过才放行 */
const next = () => {
  if (step.value === 1) {
    if (!name.value.trim()) { pushToast('请输入任务名称', 'error'); return; }
    if (sourceIds.value.length === 0) { pushToast('请至少选择一个源店铺', 'error'); return; }
    step.value = 2;
    return;
  }
  if (!strategy.value) { pushToast('请关联发布策略（搬家前置条件）', 'error'); return; }
  if (!targetId.value) { pushToast('请选择策略关联店铺（视频号）', 'error'); return; }
  step.value = 3;
};
const prev = () => { step.value = Math.max(1, step.value - 1); };

const save = () => {
  if (!name.value.trim()) { pushToast('请输入任务名称', 'error'); step.value = 1; return; }
  if (sourceIds.value.length === 0) { pushToast('请至少选择一个源店铺', 'error'); step.value = 1; return; }
  if (!strategy.value) { pushToast('请关联发布策略（搬家前置条件）', 'error'); step.value = 2; return; }
  if (!targetId.value) { pushToast('请选择策略关联店铺（视频号）', 'error'); step.value = 2; return; }
  const base: MvTask = m ? { ...m } : {
    id: `mv-${Date.now().toString().slice(-6)}`,
    status: '未开始',
    createdAt: '2026-09-09 10:00',
  } as MvTask;
  emit('save', {
    ...base,
    name: name.value.trim(),
    type: type.value,
    scheduleMode: type.value === '定时' ? scheduleMode.value : undefined,
    triggerCond: type.value === '条件触发' ? triggerCond.value : undefined,
    interval: type.value === '循环' ? `每${intervalN.value}${intervalUnit.value}` : undefined,
    runRule: buildRule(),
    sourceShopIds: [...sourceIds.value],
    targetShopId: targetId.value,
    strategy: strategy.value,
    pick: pickNow(),
    scope: scope.value,
    excludeOff: excludeOff.value,
    publishMode: publishMode.value,
    batchSize: Number(batchSize.value) || 50,
    precheck: precheck.value,
  });
};
</script>

<template>
  <div class="mv-drawer-mask" @click.self="emit('close')">
    <div class="mv-drawer">
      <div class="mv-dr-head">
        <div>
          <div class="mv-dr-title">{{ m ? '编辑搬家任务' : '新建搬家任务' }}</div>
          <div class="mv-dr-sub">三步向导：选源店铺 → 配置执行条件与策略 → 发布设置并保存</div>
        </div>
        <span class="mv-dr-x" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      </div>
      <div class="mv-steps">
        <div v-for="s in STEPS" :key="s.n" class="mv-step" :class="[step === s.n ? 'on' : '', step > s.n ? 'done' : '']">
          <i>{{ step > s.n ? '✓' : s.n }}</i><span>{{ s.label }}</span>
        </div>
      </div>
      <div class="mv-dr-body">
        <!-- 步骤1：选源店铺 -->
        <div v-if="step === 1">
          <div class="mv-sec">任务名称<span class="mv-req">*</span></div>
          <div class="mv-row">
            <label>任务名称</label>
            <input v-model="name" class="sg-input" placeholder="如 视频号搬家-淘宝心选店全店" />
          </div>
          <div class="mv-sec">源店铺<span class="mv-req">*</span><span class="mv-hint" style="margin-left: 8px; font-weight: 400">可多选：一个任务可同时搬多个店</span></div>
          <div class="mv-row">
            <div class="mv-shoplist">
              <div
                v-for="s in mvShops.filter((x) => x.platform !== '视频号')"
                :key="s.id"
                class="mv-shopitem"
                :class="sourceIds.includes(s.id) ? 'on' : ''"
                @click="toggleSource(s.id)"
              >
                <input type="checkbox" :checked="sourceIds.includes(s.id)" />
                <span class="store-logo"><img :src="PLATFORM_LOGO[s.platform]" alt="" /></span>
                <span>{{ s.name }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 步骤2：执行条件 + 选品规则 + 策略与策略关联店铺 -->
        <div v-else-if="step === 2">
          <div class="mv-sec">执行条件<span class="mv-req">*</span></div>
          <div class="mv-row">
            <label>任务类型</label>
            <div class="mv-typecards">
              <button type="button" class="mv-typecard" :class="type === '定时' ? 'on' : ''" @click="type = '定时'">
                <b>定时任务</b><span>一次性 / 长期，到点自动执行</span>
              </button>
              <button type="button" class="mv-typecard" :class="type === '条件触发' ? 'on' : ''" @click="type = '条件触发'">
                <b>条件触发任务</b><span>源店事件发生时即时触发</span>
              </button>
              <button type="button" class="mv-typecard" :class="type === '循环' ? 'on' : ''" @click="type = '循环'">
                <b>循环任务</b><span>按固定间隔循环执行</span>
              </button>
            </div>
          </div>
          <div v-if="type === '定时'" class="mv-row">
            <label>执行方式</label>
            <BubbleSelect class-name="sg-select" :value="scheduleMode" :options="['一次性', '长期']" @change="(v: string) => (scheduleMode = v as MvScheduleMode)" />
            <template v-if="scheduleMode === '一次性'">
              <input v-model="onceTime" class="sg-input" placeholder="执行时间 如 2026-09-12 02:00" />
            </template>
            <template v-else>
              <BubbleSelect class-name="sg-select" :value="cycle" :options="['每天', '每周']" @change="(v: string) => (cycle = v)" />
              <input v-model="cycleTime" class="sg-input" style="width: 110px" placeholder="02:00" />
            </template>
          </div>
          <div v-if="type === '条件触发'" class="mv-row">
            <label>触发条件</label>
            <BubbleSelect class-name="sg-select" :value="triggerCond" :options="MV_TRIGGER_CONDS" @change="(v: string) => (triggerCond = v)" />
            <span class="mv-hint">条件命中后即时生成执行批次</span>
          </div>
          <div v-if="type === '循环'" class="mv-row">
            <label>循环间隔</label>
            <span class="mv-hint">每</span>
            <input v-model="intervalN" class="sg-input" style="width: 80px" placeholder="6" />
            <BubbleSelect class-name="sg-select" :value="intervalUnit" :options="['小时', '天']" @change="(v: string) => (intervalUnit = v)" />
            <span class="mv-hint">执行一次</span>
          </div>
          <div class="mv-sec">选品规则<span class="mv-hint" style="margin-left: 8px; font-weight: 400">搬家非盲搬：按指标圈定源店商品并排序抓取</span></div>
          <div class="mv-row">
            <label>商品范围</label>
            <BubbleSelect class-name="sg-select" :value="scope" :options="['全店商品', '仅有动销商品']" @change="(v: string) => (scope = v as MvTask['scope'])" />
            <label style="width: auto"><input v-model="excludeOff" type="checkbox" /> 剔除已下架商品</label>
          </div>
          <div class="mv-row">
            <label>商品排序</label>
            <BubbleSelect class-name="sg-select" :value="pickSort" :options="MV_PICK_SORTS" @change="(v: string) => (pickSort = v as MvPickSort)" />
            <span class="mv-hint">按此顺序抓取发布，爆款优先搬</span>
          </div>
          <div class="mv-row">
            <label>过滤条件</label>
            <span class="mv-hint">近30日销量 ≥</span>
            <input v-model="minSold" class="sg-input" style="width: 80px" placeholder="0" />
            <span class="mv-hint">累计订单 ≥</span>
            <input v-model="minOrders" class="sg-input" style="width: 80px" placeholder="0" />
            <span class="mv-hint">上架天数</span>
            <BubbleSelect class-name="sg-select" :value="shelfDays" :options="MV_SHELF_DAYS" @change="(v: string) => (shelfDays = v as MvShelfDays)" />
          </div>
          <div class="mv-row">
            <label>搬家数量</label>
            <BubbleSelect class-name="sg-select" :value="limitMode" :options="['全部', '取前N款']" @change="(v: string) => (limitMode = v as '全部' | '取前N款')" />
            <input v-if="limitMode === '取前N款'" v-model="limitN" class="sg-input" style="width: 90px" placeholder="100" />
            <span class="mv-hint">按排序截断，爆款先搬；0 为不限</span>
          </div>
          <div class="mv-sec">策略与关联店铺<span class="mv-req">*</span></div>
          <div class="mv-row">
            <label>发布策略</label>
            <BubbleSelect class-name="sg-select" :value="strategy || '请选择策略'" :options="MV_STRATEGIES" @change="(v: string) => (strategy = v)" />
            <span class="mv-hint">策略决定搬家发布的调价 / 图文改写 / 上架规则</span>
          </div>
          <div class="mv-row">
            <label>关联店铺</label>
            <div class="mv-shoplist">
              <div
                v-for="s in mvTargetShops"
                :key="s.id"
                class="mv-shopitem"
                :class="targetId === s.id ? 'on' : ''"
                @click="targetId = s.id"
              >
                <input type="radio" name="mv-target" :checked="targetId === s.id" />
                <span class="store-logo"><img :src="PLATFORM_LOGO[s.platform]" alt="" /></span>
                <span>{{ s.name }}</span>
              </div>
            </div>
          </div>
          <div class="mv-hint">策略关联店铺即发布落地店（视频号），策略规则在该店生效。</div>
        </div>

        <!-- 步骤3：发布设置 + 配置回看 + 注意项 -->
        <div v-else>
          <div class="mv-sec">发布设置</div>
          <div class="mv-row">
            <label>发布方式</label>
            <BubbleSelect class-name="sg-select" :value="publishMode" :options="['发布到仓库', '直接上架']" @change="(v: string) => (publishMode = v as MvTask['publishMode'])" />
            <span class="mv-hint">推荐先发布到仓库，人工审核后上架</span>
          </div>
          <div class="mv-row">
            <label>分批大小</label>
            <input v-model="batchSize" class="sg-input" style="width: 100px" placeholder="50" />
            <span class="mv-hint">款/批，单批过量易触发平台风控</span>
            <label style="width: auto"><input v-model="precheck" type="checkbox" /> 合规预检（极限词/侵权图筛查）</label>
          </div>
          <div class="mv-sec">配置回看</div>
          <div class="mv-recap">
            <div class="mv-recap-row"><span>任务</span><b>{{ name }}（{{ type }}{{ type === '定时' ? `-${scheduleMode}` : '' }}）</b></div>
            <div class="mv-recap-row"><span>源店铺</span><b>{{ sourceIds.map((id) => mvShopOf(id)?.name).join('、') }}</b></div>
            <div class="mv-recap-row"><span>落地店</span><b>{{ mvShopOf(targetId)?.name }} · {{ strategy }}</b></div>
            <div class="mv-recap-row"><span>执行</span><b>{{ buildRule() }}</b></div>
            <div class="mv-recap-row"><span>选品</span><b>{{ mvPickSummary(pickNow()) }}</b></div>
          </div>
          <div class="mv-sec">注意项</div>
          <div class="mv-caution">
            <div>① 分批执行（默认 ≤50 款/批），单批过量易触发平台风控；</div>
            <div>② 跨平台图文须经策略改写（标题清洗 / 图片去水印），原样搬运易判盗图侵权；</div>
            <div>③ 建议先发布到仓库草稿、人工审核后再上架；</div>
            <div>④ 搬家完成后核对 SKU 映射，防规格体系差异丢 SKU。</div>
          </div>
        </div>
      </div>
      <div class="mv-dr-foot">
        <button class="sg-btn" @click="emit('close')">取消</button>
        <button v-if="step > 1" class="sg-btn" @click="prev">上一步</button>
        <button v-if="step < 3" class="sg-btn primary" @click="next">下一步</button>
        <button v-else class="sg-btn primary" @click="save">保存任务</button>
      </div>
    </div>
  </div>
</template>
