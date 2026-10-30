<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import DateRangePicker from '../../components/DateRangePicker.vue';
import { pushToast } from '../../components/toast';
import type { CpStrategy } from './strategyData';
import { PUB_SHOPS } from './data';

/* 店铺词表：与发布任务店铺同源（PUB_SHOPS 去重） */
const SHOP_OPTIONS = [...new Set(PUB_SHOPS.map((s) => s.name))];

/** 优惠券新建/详情抽屉：优惠信息（优惠方式/商品范围；适用范围不展示）→ 基础信息（名称/推广场景/券数量/领取时间/使用时间）；详情态另展示券ID与领取进度 */
const props = defineProps<{ model: CpStrategy | null }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'save', d: Omit<CpStrategy, 'id' | 'couponId' | 'claimed' | 'status'>): void }>();

const readonly = computed(() => !!props.model);

interface CpForm {
  shop: string;
  name: string;
  mode: string;
  discount: string;
  scope: CpStrategy['scope'];
  goodsMode: CpStrategy['goodsMode'];
  goodsCount: string;
  scene: string;
  issueCount: string;
  perLimit: string;
  claimFrom: string;
  claimTo: string;
  useMode: CpStrategy['useMode'];
  useDays: string;
  useFrom: string;
  useTo: string;
}
const DEFAULTS: CpForm = {
  shop: '',
  name: '',
  mode: '',
  discount: '',
  scope: '部分商品',
  goodsMode: '手动选择',
  goodsCount: '',
  scene: '',
  issueCount: '0',
  perLimit: '1',
  claimFrom: '',
  claimTo: '',
  useMode: '和领取时间一致',
  useDays: '0',
  useFrom: '',
  useTo: '',
};
const form = ref<CpForm>({ ...DEFAULTS });
const errs = ref<Record<string, string | undefined>>({});
const pick = (m: CpStrategy): CpForm => ({
  shop: m.shop, name: m.name, mode: m.mode, discount: m.discount, scope: m.scope, goodsMode: m.goodsMode,
  goodsCount: m.goodsCount, scene: m.scene,
  issueCount: m.issueCount, perLimit: m.perLimit, claimFrom: m.claimFrom, claimTo: m.claimTo,
  useMode: m.useMode, useDays: m.useDays, useFrom: m.useFrom, useTo: m.useTo,
});
watch(() => props.model, (m) => {
  form.value = m ? pick(m) : { ...DEFAULTS };
  errs.value = {};
}, { immediate: true });

const MODE_OPTIONS = ['统一折扣'];
const GOODS_OPTIONS: CpStrategy['goodsMode'][] = ['手动选择', '批量导入'];

/* 折扣输入限制：数字＋最多一位小数（小数点后最多展示一位）；区间 1~10 由保存校验 */
const onDiscountInput = () => {
  const raw = form.value.discount.replace(/[^\d.]/g, '');
  const dot = raw.indexOf('.');
  form.value.discount = dot === -1 ? raw : `${raw.slice(0, dot + 1)}${raw.slice(dot + 1).replace(/\./g, '').slice(0, 1)}`;
  errs.value.discount = undefined;
};

const useSummary = (f: CpForm) => (f.useMode === '和领取时间一致' ? '和领取时间一致' : f.useMode === '领取后天内有效' ? `领取后${f.useDays}天内有效` : `${f.useFrom} ~ ${f.useTo}`);

/* 详情态领取进度：领取率＝已领取÷发放张数，去尾零 */
const rateText = computed(() => {
  const m = props.model;
  if (!m) return '0';
  const total = Number(m.issueCount);
  if (!total || Number.isNaN(total)) return '0';
  return String(parseFloat(((Number(m.claimed) / total) * 100).toFixed(1)));
});

const save = () => {
  const e: Record<string, string | undefined> = {};
  if (!form.value.shop) e.shop = '请选择店铺';
  if (!form.value.mode) e.mode = '请选择优惠方式';
  if (!form.value.name.trim()) e.name = '请输入名称';
  if (!form.value.discount.trim() || Number.isNaN(Number(form.value.discount))) e.discount = '请输入折扣';
  else if (Number(form.value.discount) < 1 || Number(form.value.discount) > 10) e.discount = '折扣需在 1~10 之间';
  if (!form.value.issueCount.trim() || Number.isNaN(Number(form.value.issueCount))) e.issueCount = '请输入发放张数';
  if (!form.value.perLimit.trim() || Number.isNaN(Number(form.value.perLimit))) e.perLimit = '请输入每人限领';
  if (!form.value.claimFrom || !form.value.claimTo) e.claim = '请选择领取时间';
  if (form.value.scope === '部分商品' && (!form.value.goodsCount.trim() || Number.isNaN(Number(form.value.goodsCount)))) e.goodsCount = '请输入适用商品件数';
  if (form.value.useMode === '领取后天内有效' && (!form.value.useDays.trim() || Number.isNaN(Number(form.value.useDays)))) e.useDays = '请输入天数';
  if (form.value.useMode === '自定义' && (!form.value.useFrom || !form.value.useTo)) e.use = '请选择使用时间';
  errs.value = e;
  if (Object.keys(e).some((k) => e[k])) return;
  pushToast('优惠券已保存');
  emit('save', { ...form.value });
};
</script>

<template>
  <div class="cp-mask" @click.self="emit('close')">
    <div class="cp-drawer">
      <div class="cp-head">
        <span class="cp-head-t">{{ readonly ? '优惠券详情' : '新建优惠券' }}</span>
        <button type="button" class="cp-x" title="关闭" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>

      <div class="cp-body">
        <!-- 优惠信息 -->
        <div class="cp-sec">
          <div class="cp-sec-t">优惠信息</div>
          <div class="cp-row">
            <label class="cp-lb"><span class="cp-req">*</span>优惠方式</label>
            <div class="cp-ctl">
              <BubbleSelect class-name="cp-sel" :options="MODE_OPTIONS" :value="form.mode || '请选择'" @change="(v: string) => { form.mode = v; errs.mode = undefined; }" />
              <template v-if="!readonly">
                <input v-model="form.discount" type="text" inputmode="decimal" class="cp-in num" placeholder="输入折扣" @input="onDiscountInput" />
                <span class="cp-unit">折</span>
              </template>
              <template v-else><span class="cp-ro">{{ form.discount }}折</span></template>
            </div>
            <div v-if="errs.mode || errs.discount" class="cp-err">{{ errs.mode || errs.discount }}</div>
          </div>
          <div v-if="form.scope === '部分商品'" class="cp-row cp-row-top">
            <label class="cp-lb">商品范围</label>
            <div class="cp-ctl col">
              <div class="cp-ctl">
                <template v-if="readonly">{{ form.goodsMode }}（适用商品 {{ form.goodsCount }}件）</template>
                <template v-else>
                  <label v-for="o in GOODS_OPTIONS" :key="o" class="cp-radio">
                    <input type="radio" name="cp-goods" :checked="form.goodsMode === o" @change="form.goodsMode = o" />
                    <span>{{ o }}</span>
                  </label>
                  <input v-model="form.goodsCount" type="number" class="cp-in num" placeholder="适用商品件数" @input="errs.goodsCount = undefined" />
                  <span class="cp-unit">件</span>
                </template>
              </div>
              <button v-if="!readonly && form.goodsMode === '手动选择'" type="button" class="cp-pick" @click="pushToast('原型演示：商品选择未接入')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                选择小店商品
              </button>
            </div>
            <div v-if="errs.goodsCount" class="cp-err">{{ errs.goodsCount }}</div>
          </div>
        </div>

        <!-- 基础信息 -->
        <div class="cp-sec">
          <div class="cp-sec-t">基础信息</div>
          <div class="cp-row">
            <label class="cp-lb"><span class="cp-req">*</span>店铺</label>
            <div class="cp-ctl">
              <template v-if="readonly"><span class="cp-ro">{{ form.shop }}</span></template>
              <BubbleSelect v-else class-name="cp-sel shop" :options="SHOP_OPTIONS" :value="form.shop || '请选择店铺'" @change="(v: string) => { form.shop = v; errs.shop = undefined; }" />
            </div>
            <div v-if="errs.shop" class="cp-err">{{ errs.shop }}</div>
          </div>
          <div class="cp-row">
            <label class="cp-lb"><span class="cp-req">*</span>名称</label>
            <div class="cp-ctl grow">
              <template v-if="readonly">{{ form.name }}</template>
              <input v-else v-model="form.name" class="cp-in name" maxlength="30" placeholder="如：通用券10/27" @input="errs.name = undefined" />
            </div>
            <div v-if="errs.name" class="cp-err">{{ errs.name }}</div>
          </div>
          <div class="cp-row">
            <label class="cp-lb">推广场景</label>
            <div class="cp-ctl grow">
              <template v-if="readonly">{{ form.scene || '—' }}</template>
              <input v-else v-model="form.scene" class="cp-in name" maxlength="20" placeholder="如：全场景、双十一大促" />
            </div>
          </div>
          <div class="cp-row">
            <label class="cp-lb"><span class="cp-req">*</span>券数量</label>
            <div class="cp-ctl">
              <span class="cp-sub">发放张数</span>
              <template v-if="readonly"><span class="cp-ro">{{ form.issueCount }} 张</span></template>
              <template v-else>
                <input v-model="form.issueCount" type="number" class="cp-in num" @input="errs.issueCount = undefined" />
                <span class="cp-unit">张</span>
              </template>
              <span class="cp-sub gap">每人限领</span>
              <template v-if="readonly"><span class="cp-ro">{{ form.perLimit }} 张</span></template>
              <template v-else>
                <input v-model="form.perLimit" type="number" class="cp-in num" @input="errs.perLimit = undefined" />
                <span class="cp-unit">张</span>
              </template>
            </div>
            <div v-if="errs.issueCount || errs.perLimit" class="cp-err">{{ errs.issueCount || errs.perLimit }}</div>
          </div>
          <!-- 详情态独有：券ID 与领取进度（查看已领取数量） -->
          <div v-if="readonly" class="cp-row">
            <label class="cp-lb">券ID</label>
            <div class="cp-ctl"><span class="cp-ro">{{ model?.couponId }}</span></div>
          </div>
          <div v-if="readonly" class="cp-row">
            <label class="cp-lb">领取进度</label>
            <div class="cp-ctl">
              <span class="cp-ro">{{ model?.claimed }}/{{ model?.issueCount }}</span>
              <span class="cp-sub">领取率{{ rateText }}%</span>
            </div>
          </div>
          <div class="cp-row">
            <label class="cp-lb"><span class="cp-req">*</span>领取时间</label>
            <div class="cp-ctl grow">
              <template v-if="readonly">{{ form.claimFrom }} ~ {{ form.claimTo }}</template>
              <DateRangePicker v-else v-model:from="form.claimFrom" v-model:to="form.claimTo" placeholder="开始日期 - 结束日期" @update:from="errs.claim = undefined" @update:to="errs.claim = undefined" />
            </div>
            <div v-if="errs.claim" class="cp-err">{{ errs.claim }}</div>
          </div>
          <div class="cp-row cp-row-top">
            <label class="cp-lb"><span class="cp-req">*</span>使用时间</label>
            <div class="cp-ctl col">
              <template v-if="readonly">{{ useSummary(form) }}</template>
              <template v-else>
                <div class="cp-ctl wrap">
                  <label class="cp-radio">
                    <input type="radio" name="cp-use" :checked="form.useMode === '和领取时间一致'" @change="form.useMode = '和领取时间一致'" />
                    <span>和领取时间一致</span>
                  </label>
                  <label class="cp-radio">
                    <input type="radio" name="cp-use" :checked="form.useMode === '领取后天内有效'" @change="form.useMode = '领取后天内有效'" />
                    <span>领取后</span>
                  </label>
                  <input v-model="form.useDays" type="number" class="cp-in days" :disabled="form.useMode !== '领取后天内有效'" @input="errs.useDays = undefined" />
                  <span class="cp-unit">天</span>
                  <span class="cp-radio-tail">内有效</span>
                  <label class="cp-radio">
                    <input type="radio" name="cp-use" :checked="form.useMode === '自定义'" @change="form.useMode = '自定义'" />
                    <span>自定义</span>
                  </label>
                </div>
                <div v-if="form.useMode === '自定义'" class="cp-ctl">
                  <DateRangePicker v-model:from="form.useFrom" v-model:to="form.useTo" placeholder="开始日期 - 结束日期" @update:from="errs.use = undefined" @update:to="errs.use = undefined" />
                </div>
              </template>
            </div>
            <div v-if="errs.useDays || errs.use" class="cp-err">{{ errs.useDays || errs.use }}</div>
          </div>
        </div>
      </div>

      <div class="cp-foot">
        <button type="button" class="cp-btn ghost" @click="emit('close')">{{ readonly ? '关闭' : '取消' }}</button>
        <button v-if="!readonly" type="button" class="cp-btn primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cp-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(15, 23, 42, 0.42);
}

.cp-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  width: 640px;
  max-width: 94vw;
  background: #fff;
  box-shadow: -8px 0 24px rgba(15, 23, 42, 0.08);
}

.cp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  padding: 18px 24px;
}

.cp-head-t {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text, #202532);
}

.cp-x {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--color-text-2, #445066);
  cursor: pointer;
}

.cp-x:hover {
  background: var(--color-fill-1, #f7f8fa);
}

.cp-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  padding: 8px 24px 24px;
}

.cp-body::-webkit-scrollbar {
  display: none;
}

.cp-sec {
  margin-bottom: 28px;
}

.cp-sec-t {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #202532);
  margin-bottom: 18px;
}

.cp-sec-t::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--color-primary, #4f7cff);
  border-radius: 2px;
}

/* 行：标签定宽 70px 贴最长标签「*领取时间」(4字+星) + 左侧对齐（标题长度一致左对齐），禁留大空白 + 控件列；错误落于控件下方 */
.cp-row {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  grid-template-areas:
    'lb ctl'
    '. err';
  column-gap: 14px;
  align-items: center;
  margin-bottom: 16px;
}

.cp-row-top {
  align-items: start;
}

.cp-lb {
  grid-area: lb;
  font-size: 14px;
  color: var(--color-text, #202532);
  text-align: left;
}

.cp-req {
  color: #ef4444;
  margin-right: 2px;
}

.cp-ctl {
  grid-area: ctl;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text, #202532);
  min-width: 0;
}

.cp-ctl.col {
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.cp-ctl.wrap {
  flex-wrap: wrap;
  row-gap: 10px;
}

.cp-ctl.grow {
  width: 100%;
}

.cp-sub {
  color: var(--color-text-2, #445066);
}

.cp-sub.gap {
  margin-left: 12px;
}

.cp-radio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 14px;
  color: var(--color-text, #202532);
}

.cp-radio input[type="radio"] {
  accent-color: var(--color-primary, #4f7cff);
}

.cp-radio-tail {
  font-size: 14px;
  color: var(--color-text, #202532);
}

.cp-sel {
  width: 150px;
  height: 36px;
}

.cp-sel.shop {
  width: 240px;
}

.cp-in {
  height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--color-fill-1, #f7f8fa);
  font-size: 14px;
  color: var(--color-text, #202532);
  outline: none;
  transition: border-color 150ms, background 150ms;
}

.cp-in:focus {
  border-color: var(--color-primary, #4f7cff);
  background: #fff;
}

.cp-in:disabled {
  color: var(--color-text-3, #8b92a1);
  cursor: not-allowed;
}

.cp-in.num {
  width: 110px;
}

.cp-in.days {
  width: 70px;
}

.cp-in.name {
  width: 100%;
}

.cp-unit {
  flex: none;
  font-size: 14px;
  color: var(--color-text-2, #445066);
}

.cp-ro {
  font-size: 14px;
  color: var(--color-text, #202532);
}

.cp-pick {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: var(--color-fill-1, #f7f8fa);
  color: var(--color-text-2, #445066);
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms;
}

.cp-pick:hover {
  background: #e9ecf1;
}

.cp-err {
  grid-area: err;
  margin-top: 4px;
  font-size: 12px;
  color: #ef4444;
}

.cp-foot {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex: none;
  padding: 14px 24px;
}

.cp-btn {
  min-width: 76px;
  height: 36px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: background 150ms;
}

.cp-btn.ghost {
  background: var(--color-fill-1, #f7f8fa);
  color: var(--color-text-2, #445066);
}

.cp-btn.ghost:hover {
  background: #e9ecf1;
}

.cp-btn.primary {
  background: var(--color-primary, #4f7cff);
  color: #fff;
}

.cp-btn.primary:hover {
  background: #3a6be6;
}
</style>
