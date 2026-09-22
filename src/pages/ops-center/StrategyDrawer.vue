<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { pushToast } from '../../components/toast';
import type { StStrategy } from './strategyData';

const props = defineProps<{ editData?: StStrategy }>();
const emit = defineEmits<{ (e: 'back'): void }>();

/* 策略表单：平台（通用/视频号/淘宝）+ 淘宝活动参与状态驱动区块 */
interface StForm {
  platform: string;
  name: string;
  joinActivity: string;
  activity: string;
  autoEnroll: string;
  skuPricingMode: 'rate' | 'profit';
  rateValue: string;
  enablePromo: string;
  pausePromo: string;
  bidMode: 'roi' | 'volume';
  bidTarget: string;
  roiConfig: string;
  budgetType: 'unlimited' | 'daily';
  dailyBudget: string;
  publishMode: string;
  /* 视频号专属：假一赔三 / 换货 / 七天无理由 */
  fakeComp: 'no' | 'yes';
  exchange: 'no' | 'yes';
  sevenDay: string;
}

/** 根据策略类型映射表单平台选项 */
const mapPlatform = (type: string) => {
  if (type.includes('淘宝')) return '淘宝';
  if (type.includes('视频号')) return '视频号';
  return '全平台通用';
};

/** 从列表行数据构建表单初始值 */
const buildFormFromStrategy = (s: StStrategy): StForm => ({
  platform: mapPlatform(s.type),
  name: s.name,
  joinActivity: s.joinActivity === '否' ? '否' : '是',
  activity: s.activityType === '秒杀' ? '秒杀' : '顺买',
  autoEnroll: '是',
  skuPricingMode: s.mode.includes('利润') && !s.mode.includes('利润率') ? 'profit' : 'rate',
  rateValue: s.rate.replace(/[^0-9.]/g, ''),
  enablePromo: s.promoted === '否' ? '否' : '是',
  pausePromo: '连续亏损3日暂停推广',
  bidMode: 'roi',
  bidTarget: '增加净成交金额',
  roiConfig: '保本投产+1',
  budgetType: 'daily',
  dailyBudget: '',
  publishMode: '放入仓库',
  fakeComp: 'no',
  exchange: 'no',
  sevenDay: '支持七天无理由',
});

const defaultForm: StForm = {
  platform: '全平台通用',
  name: '',
  joinActivity: '是',
  activity: '顺买',
  autoEnroll: '是',
  skuPricingMode: 'rate',
  rateValue: '',
  enablePromo: '是',
  pausePromo: '连续亏损3日暂停推广',
  bidMode: 'roi',
  bidTarget: '增加净成交金额',
  roiConfig: '保本投产+1',
  budgetType: 'daily',
  dailyBudget: '',
  publishMode: '放入仓库',
  fakeComp: 'no',
  exchange: 'no',
  sevenDay: '支持七天无理由',
};

const form = ref<StForm>({ ...defaultForm });
const formErr = ref<Record<string, string | undefined>>({});
const isEdit = computed(() => !!props.editData);

/* 编辑数据变化时自动回填表单 */
watch(() => props.editData, (s) => {
  form.value = s ? buildFormFromStrategy(s) : { ...defaultForm };
  formErr.value = {};
}, { immediate: true });

const isTaobao = computed(() => form.value.platform === '淘宝');
const isShipinhao = computed(() => form.value.platform === '视频号');
const isUniversal = computed(() => form.value.platform === '全平台通用');
const joinAct = computed(() => form.value.joinActivity === '是');
const actPricing = computed(() => isTaobao.value && joinAct.value);
/* 上架方式：淘宝/通用=放入仓库/直接上架；视频号=放入草稿箱/直接上架；淘宝参与活动时由活动接管不展示 */
const showPublish = computed(() => isShipinhao.value || isUniversal.value || (isTaobao.value && !joinAct.value));
const publishModes = computed(() => (isShipinhao.value ? ['放入草稿箱', '直接上架'] : ['放入仓库', '直接上架']));
/* 切平台时仓库/草稿箱同义互换，避免单选失配 */
watch(() => form.value.platform, (p, old) => {
  if (p === '视频号' && form.value.publishMode === '放入仓库') form.value.publishMode = '放入草稿箱';
  else if (old === '视频号' && form.value.publishMode === '放入草稿箱') form.value.publishMode = '放入仓库';
});

const save = () => {
  const e: Record<string, string> = {};
  if (!form.value.name.trim()) e.name = '请输入策略名称';
  if (!form.value.rateValue.trim() || Number.isNaN(Number(form.value.rateValue))) {
    e.rateValue = form.value.skuPricingMode === 'rate' ? '请输入利润率' : '请输入利润';
  }
  if (form.value.budgetType === 'daily' && (!form.value.dailyBudget.trim() || Number.isNaN(Number(form.value.dailyBudget)))) {
    e.dailyBudget = '请输入每日预算';
  }
  formErr.value = e;
  if (Object.keys(e).length > 0) return;
  pushToast(isEdit.value ? '策略已更新' : '策略已保存');
  emit('back');
};

const PLATFORM_OPTIONS = ['全平台通用', '视频号', '淘宝'];
const YES_NO = ['是', '否'];
const ACTIVITY_OPTIONS = ['顺买', '秒杀'];
const PAUSE_PROMO_OPTIONS = ['连续亏损3日暂停推广'];
const ROI_OPTIONS = ['保本投产+1'];
const BID_TARGETS = ['增加总成交金额', '增加净成交金额'];
const SEVEN_DAY_OPTIONS = ['支持七天无理由', '不支持七天无理由'];
</script>

<template>
  <div class="st-form-page">
    <!-- 头部：返回 + 保存 -->
    <div class="st-form-header">
      <button class="st-form-back" @click="emit('back')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
        返回
      </button>
      <button class="st-form-save" @click="save">{{ isEdit ? '保存修改' : '保存' }}</button>
    </div>

    <!-- 表单内容 -->
    <div class="st-form-body">
      <div class="st-form-wrap">
        <!-- 策略类型 -->
        <div class="st-sec">
          <div class="st-sec-t">策略类型</div>
          <div class="st-row">
            <label class="st-lb"><span class="st-req">*</span>策略可用平台</label>
            <BubbleSelect class-name="st-sel" :options="PLATFORM_OPTIONS" :value="form.platform" @change="(v: string) => (form.platform = v)" />
          </div>
        </div>

        <!-- 基本信息 -->
        <div class="st-sec">
          <div class="st-sec-t">基本信息</div>
          <div class="st-row">
            <label class="st-lb"><span class="st-req">*</span>策略名称</label>
            <input v-model="form.name" class="st-in name" placeholder="请输入" @input="formErr.name = undefined" />
            <div v-if="formErr.name" class="st-err">{{ formErr.name }}</div>
          </div>
        </div>

        <!-- 活动配置（淘宝） -->
        <div v-if="isTaobao" class="st-sec">
          <div class="st-sec-t">活动配置</div>
          <div class="st-row-2">
            <div class="st-col">
              <label class="st-lb"><span class="st-req">*</span>是否参与活动</label>
              <BubbleSelect class-name="st-sel" :options="YES_NO" :value="form.joinActivity" @change="(v: string) => (form.joinActivity = v)" />
            </div>
            <div v-if="joinAct" class="st-col">
              <label class="st-lb"><span class="st-req">*</span>选择活动</label>
              <BubbleSelect class-name="st-sel" :options="ACTIVITY_OPTIONS" :value="form.activity" @change="(v: string) => (form.activity = v)" />
            </div>
          </div>
          <div v-if="joinAct" class="st-row">
            <label class="st-lb"><span class="st-req">*</span>自动报入活动</label>
            <div class="st-inline">
              <BubbleSelect class-name="st-sel" :options="YES_NO" :value="form.autoEnroll" @change="(v: string) => (form.autoEnroll = v)" />
              <span class="st-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                <span class="st-info-pop">商品符合条件后将自动报入活动</span>
              </span>
            </div>
          </div>
        </div>

        <!-- 定价规则（活动/常规） -->
        <div class="st-sec">
          <div class="st-sec-t">{{ actPricing ? '活动商品定价规则' : '常规商品定价规则' }}</div>
          <div class="st-desc">
            {{ actPricing
              ? '配置定价规则后，使用该策略上架的商品上架或报名活动时，活动价将按照配置的利润/利润率进行定价，产品售价按照活动折扣比例反推(顺买：活动售价*10/秒杀：活动售价*5)'
              : '配置定价规则后，使用该策略上架的商品发布时，产品售价将按照配置的利润/利润率进行定价' }}
          </div>
          <div class="st-row">
            <label class="st-lb"><span class="st-req">*</span>{{ actPricing ? 'SKU报活动定价方式' : 'SKU定价方式' }}</label>
            <div class="st-cards">
              <label class="st-card" :class="{ on: form.skuPricingMode === 'rate' }">
                <input type="radio" name="sku-mode" :checked="form.skuPricingMode === 'rate'" @change="form.skuPricingMode = 'rate'; formErr.rateValue = undefined" />
                <div class="st-card-c">
                  <span class="st-card-t">控利润率</span>
                  <span class="st-card-d">{{ actPricing ? '设置商品SKU活动价时将保持所配置的利润率' : '设置商品SKU售价时将保持所配置的利润率' }}</span>
                </div>
              </label>
              <label class="st-card" :class="{ on: form.skuPricingMode === 'profit' }">
                <input type="radio" name="sku-mode" :checked="form.skuPricingMode === 'profit'" @change="form.skuPricingMode = 'profit'; formErr.rateValue = undefined" />
                <div class="st-card-c">
                  <span class="st-card-t">控利润</span>
                  <span class="st-card-d">{{ actPricing ? '设置商品SKU活动价时将保持所配置的利润' : '设置商品SKU售价时将保持所配置的利润' }}</span>
                </div>
              </label>
            </div>
          </div>
          <div class="st-row">
            <label class="st-lb"><span class="st-req">*</span>{{ form.skuPricingMode === 'rate' ? '设置利润率' : '设置利润' }}</label>
            <div class="st-rate">
              <input v-model="form.rateValue" class="st-in rate" placeholder="请输入" @input="formErr.rateValue = undefined" />
              <span class="st-rate-u">{{ form.skuPricingMode === 'rate' ? '%' : '元' }}</span>
            </div>
            <div v-if="formErr.rateValue" class="st-err">{{ formErr.rateValue }}</div>
          </div>
        </div>

        <!-- 服务保障（视频号）：假一赔三 / 换货 / 七天无理由 -->
        <template v-if="isShipinhao">
          <div class="st-sec">
            <div class="st-sec-t">是否假一赔三</div>
            <div class="st-radios">
              <label class="st-radio">
                <input type="radio" name="st-fake-comp" :checked="form.fakeComp === 'no'" @change="form.fakeComp = 'no'" />
                <span>不支持假一赔三</span>
              </label>
              <label class="st-radio">
                <input type="radio" name="st-fake-comp" :checked="form.fakeComp === 'yes'" @change="form.fakeComp = 'yes'" />
                <span>支持假一赔三</span>
              </label>
            </div>
          </div>
          <div class="st-sec">
            <div class="st-sec-t">是否支持换货</div>
            <div class="st-radios">
              <label class="st-radio">
                <input type="radio" name="st-exchange" :checked="form.exchange === 'no'" @change="form.exchange = 'no'" />
                <span>不支持换货</span>
              </label>
              <label class="st-radio">
                <input type="radio" name="st-exchange" :checked="form.exchange === 'yes'" @change="form.exchange = 'yes'" />
                <span>支持换货</span>
              </label>
            </div>
          </div>
          <div class="st-sec">
            <div class="st-sec-t">7天无理由</div>
            <BubbleSelect class-name="st-sel" :options="SEVEN_DAY_OPTIONS" :value="form.sevenDay" @change="(v: string) => (form.sevenDay = v)" />
          </div>
        </template>

        <!-- 推广配置（淘宝+参与活动） -->
        <div v-if="actPricing" class="st-sec">
          <div class="st-sec-t">推广配置</div>
          <div class="st-row-2">
            <div class="st-col">
              <label class="st-lb"><span class="st-req">*</span>是否开启推广</label>
              <BubbleSelect class-name="st-sel" :options="YES_NO" :value="form.enablePromo" @change="(v: string) => (form.enablePromo = v)" />
            </div>
            <div v-if="form.enablePromo === '是'" class="st-col">
              <label class="st-lb"><span class="st-req">*</span>亏损暂停推广</label>
              <BubbleSelect class-name="st-sel" :options="PAUSE_PROMO_OPTIONS" :value="form.pausePromo" @change="(v: string) => (form.pausePromo = v)" />
            </div>
          </div>
          <template v-if="form.enablePromo === '是'">
            <div class="st-row">
              <label class="st-lb"><span class="st-req">*</span>出价方式</label>
              <div class="st-cards">
                <label class="st-card wide" :class="{ on: form.bidMode === 'roi' }">
                  <input type="radio" name="bid-mode" :checked="form.bidMode === 'roi'" @change="form.bidMode = 'roi'" />
                  <div class="st-card-c">
                    <span class="st-card-t">投产比投放</span>
                    <span class="st-card-d">优先控制投产比达标，稳定成本下尽可能拿量</span>
                  </div>
                </label>
                <label class="st-card wide" :class="{ on: form.bidMode === 'volume' }">
                  <input type="radio" name="bid-mode" :checked="form.bidMode === 'volume'" @change="form.bidMode = 'volume'" />
                  <div class="st-card-c">
                    <span class="st-card-t">最大化拿量</span>
                    <span class="st-card-d">优先完成预算目标，最大化拿量规模，投放过程中成本会有浮动</span>
                  </div>
                </label>
              </div>
            </div>
            <div class="st-row">
              <label class="st-lb"><span class="st-req">*</span>出价目标</label>
              <div class="st-seg">
                <button v-for="t in BID_TARGETS" :key="t" type="button" :class="{ on: form.bidTarget === t }" @click="form.bidTarget = t">{{ t }}</button>
              </div>
            </div>
            <div class="st-row">
              <label class="st-lb"><span class="st-req">*</span>投产比配置</label>
              <BubbleSelect class-name="st-sel" :options="ROI_OPTIONS" :value="form.roiConfig" @change="(v: string) => (form.roiConfig = v)" />
            </div>
            <div class="st-row">
              <label class="st-lb"><span class="st-req">*</span>预算类型</label>
              <div class="st-seg">
                <button type="button" :class="{ on: form.budgetType === 'unlimited' }" @click="form.budgetType = 'unlimited'">不限预算</button>
                <button type="button" :class="{ on: form.budgetType === 'daily' }" @click="form.budgetType = 'daily'">每日预算</button>
              </div>
            </div>
            <div v-if="form.budgetType === 'daily'" class="st-row">
              <label class="st-lb"><span class="st-req">*</span>每日预算</label>
              <div class="st-rate">
                <input v-model="form.dailyBudget" class="st-in rate" placeholder="请输入" @input="formErr.dailyBudget = undefined" />
                <span class="st-rate-u">元</span>
              </div>
              <div v-if="formErr.dailyBudget" class="st-err">{{ formErr.dailyBudget }}</div>
            </div>
          </template>
        </div>

        <!-- 上架方式：淘宝=放入仓库/直接上架；视频号=放入草稿箱/直接上架；通用=放入仓库/直接上架（仓库对视频号即草稿箱） -->
        <div v-if="showPublish" class="st-sec">
          <div class="st-sec-t">上架方式</div>
          <div class="st-row">
            <label class="st-lb"><span class="st-req">*</span>上架方式</label>
            <div class="st-radios">
              <label v-for="m in publishModes" :key="m" class="st-radio">
                <input type="radio" name="publish-mode" :checked="form.publishMode === m" @change="form.publishMode = m" />
                <span>{{ m }}<i v-if="m === '放入仓库' && isUniversal" class="st-radio-tip">（视频号平台实际为放入草稿箱）</i></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.st-form-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  background: #fff;
}

/* 头部 */
.st-form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid var(--color-border, #e8ebf1);
  flex-shrink: 0;
}

.st-form-back {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--fs-base, 14px);
  color: var(--color-text, #202532);
}

.st-form-back:hover {
  color: var(--color-primary, #4f7cff);
}

.st-form-save {
  padding: 8px 24px;
  border: none;
  background: var(--color-primary, #4f7cff);
  color: #fff;
  cursor: pointer;
  font-size: var(--fs-base, 14px);
  border-radius: var(--radius-md, 8px);
  transition: background 150ms;
}

.st-form-save:hover {
  background: #3a6be6;
}

/* 内容 */
.st-form-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px 32px;
  background: #fff;
}

.st-form-wrap {
  max-width: 960px;
}

/* 区块 */
.st-sec {
  margin-bottom: 40px;
}

.st-sec:last-child {
  margin-bottom: 0;
}

.st-sec-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--fs-base, 14px);
  font-weight: var(--fw-medium, 500);
  color: var(--color-text, #202532);
  margin-bottom: 20px;
}

.st-sec-t::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary, #4f7cff);
  border-radius: 2px;
}

/* 行 */
.st-row {
  margin-bottom: 22px;
}

.st-row:last-child {
  margin-bottom: 0;
}

/* 双列行 */
.st-row-2 {
  display: flex;
  gap: 40px;
  margin-bottom: 22px;
}

.st-row-2:last-child {
  margin-bottom: 0;
}

.st-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.st-lb {
  display: block;
  font-size: var(--fs-base, 14px);
  color: var(--color-text, #202532);
  margin-bottom: 10px;
}

.st-req {
  color: #ef4444;
  margin-right: 2px;
}

/* 下拉/输入宽度 */
.st-sel {
  width: 230px;
  height: 40px;
}

.st-sel :deep(.bselect-trigger) {
  padding: 0 12px;
  border: 1px solid var(--color-border, #e8ebf1);
  border-radius: var(--radius-lg, 10px);
  background: #fff;
  transition: border-color 150ms;
}

.st-sel :deep(.bselect-trigger:hover) {
  border-color: var(--color-primary, #4f7cff);
}

.st-in {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--color-border, #e8ebf1);
  border-radius: var(--radius-lg, 10px);
  font-size: var(--fs-base, 14px);
  color: var(--color-text, #202532);
  outline: none;
  background: #fff;
  transition: border-color 150ms;
}

.st-in:focus {
  border-color: var(--color-primary, #4f7cff);
}

.st-in.name {
  width: 460px;
}

.st-in.rate {
  width: 180px;
}

.st-err {
  margin-top: 6px;
  font-size: var(--fs-aux, 12px);
  color: #ef4444;
}

/* 说明 */
.st-desc {
  padding: 10px 14px;
  background: var(--color-fill-1, #f7f8fa);
  border-radius: var(--radius-md, 8px);
  font-size: var(--fs-aux, 12px);
  color: var(--color-text-3, #8b92a1);
  margin-bottom: 20px;
  line-height: 1.6;
}

/* 信息提示气泡 */
.st-info {
  position: relative;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-3, #8b92a1);
  cursor: help;
}

.st-info-pop {
  display: none;
  position: absolute;
  left: 22px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  background: var(--color-text, #202532);
  color: #fff;
  font-size: var(--fs-aux, 12px);
  padding: 8px 12px;
  border-radius: var(--radius-md, 8px);
  white-space: nowrap;
}

.st-info:hover .st-info-pop {
  display: block;
}

/* 定价/出价卡片 */
.st-cards {
  display: flex;
  gap: 12px;
}

.st-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 230px;
  padding: 14px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-md, 8px);
  background: var(--color-fill-1, #f7f8fa);
  cursor: pointer;
  transition: all 150ms;
}

.st-card.wide {
  width: 460px;
}

.st-card:hover {
  border-color: var(--color-primary, #4f7cff);
}

.st-card.on {
  border-color: var(--color-primary, #4f7cff);
  background: var(--color-primary-light, #eef3ff);
}

.st-card input[type="radio"] {
  margin-top: 2px;
  accent-color: var(--color-primary, #4f7cff);
  flex-shrink: 0;
}

.st-card-c {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.st-card-t {
  font-size: var(--fs-base, 14px);
  font-weight: var(--fw-medium, 500);
  color: var(--color-text, #202532);
}

.st-card.on .st-card-t {
  color: var(--color-primary, #4f7cff);
}

.st-card-d {
  font-size: var(--fs-aux, 12px);
  color: var(--color-text-3, #8b92a1);
  line-height: 1.5;
}

/* 分段控件 */
.st-seg {
  display: inline-flex;
}

.st-seg button {
  width: 230px;
  height: 40px;
  border: none;
  background: var(--color-fill-1, #f7f8fa);
  color: var(--color-text-2, #445066);
  font-size: var(--fs-base, 14px);
  cursor: pointer;
  transition: all 150ms;
}

.st-seg button:first-child {
  border-radius: var(--radius-lg, 10px) 0 0 var(--radius-lg, 10px);
}

.st-seg button:last-child {
  border-radius: 0 var(--radius-lg, 10px) var(--radius-lg, 10px) 0;
}

.st-seg button.on {
  background: var(--color-primary, #4f7cff);
  color: #fff;
}

/* 利润率输入 + 单位 */
.st-rate {
  display: flex;
  align-items: center;
  gap: 8px;
}

.st-rate-u {
  font-size: var(--fs-base, 14px);
  color: var(--color-text-2, #445066);
}

/* 单选（内联） */
.st-radios {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.st-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: var(--fs-base, 14px);
  color: var(--color-text, #202532);
}

.st-radio input[type="radio"] {
  accent-color: var(--color-primary, #4f7cff);
  width: 16px;
  height: 16px;
}

/* 单选项后的平台差异说明（通用策略：放入仓库对视频号即草稿箱） */
.st-radio-tip {
  font-style: normal;
  font-size: var(--fs-aux, 12px);
  color: var(--color-text-3, #8b92a1);
  margin-left: 6px;
}
</style>
