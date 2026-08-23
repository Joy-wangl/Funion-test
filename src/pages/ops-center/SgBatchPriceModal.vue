<script setup lang="ts">
import { computed, ref } from 'vue';
import Modal from '../../components/Modal.vue';

const props = defineProps<{ count: number }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'ok', msg: string): void;
}>();

/* ================= 批量调价 / 批量涨价弹窗 ================= */
type BpMode = 'adjust' | 'raise';
type BpMethod = 'rate' | 'profit';

/** 校验边界：利润 -5 ~ 999；利润率 -20% ~ 80% */
const BP_LIMIT: Record<BpMethod, { min: number; max: number }> = {
  rate: { min: -20, max: 80 },
  profit: { min: -5, max: 999 },
};

const mode = ref<BpMode>('adjust');
const method = ref<BpMethod>('rate');
const value = ref('');
const err = ref('');

const modeText = computed(() => mode.value === 'adjust' ? '批量调价' : '批量涨价');
const methodLabel = computed(() => mode.value === 'adjust' ? '调价方式' : '涨价方式');
const limit = computed(() => BP_LIMIT[method.value]);

const confirm = () => {
  const t = value.value.trim();
  if (!t) { err.value = '请输入数值'; return; }
  const v = Number(t);
  if (!Number.isFinite(v)) { err.value = '请输入有效数字'; return; }
  if (v < limit.value.min || v > limit.value.max) {
    err.value = method.value === 'rate'
      ? `利润率超出范围：最小 ${limit.value.min}%，最大 ${limit.value.max}%`
      : `利润超出范围：最小 ${limit.value.min}，最大 ${limit.value.max}`;
    return;
  }
  emit('ok', `${modeText.value}成功：已对 ${props.count} 件出售中商品生效（${method.value === 'rate' ? `${t}%` : `${t} 元`}）`);
  emit('close');
};
</script>

<template>
  <Modal
    :title="modeText"
    :sub="`将对 ${count} 件出售中商品生效`"
    @close="emit('close')"
  >
    <div class="bp-rows">
      <div class="bp-row">
        <span class="bp-label">模式</span>
        <div class="bp-opts">
          <span class="bp-opt" :class="mode === 'adjust' ? 'on' : ''" @click="mode = 'adjust'; err = ''">批量调价</span>
          <span class="bp-sep">/</span>
          <span class="bp-opt" :class="mode === 'raise' ? 'on' : ''" @click="mode = 'raise'; err = ''">批量涨价</span>
        </div>
      </div>
      <div class="bp-row">
        <span class="bp-label">{{ methodLabel }}</span>
        <div class="bp-opts">
          <span class="bp-opt" :class="method === 'rate' ? 'on' : ''" @click="method = 'rate'; err = ''">
            {{ mode === 'adjust' ? '调整利润率' : '涨利润率' }}
          </span>
          <span class="bp-sep">/</span>
          <span class="bp-opt" :class="method === 'profit' ? 'on' : ''" @click="method = 'profit'; err = ''">
            {{ mode === 'adjust' ? '调整利润' : '涨利润' }}
          </span>
        </div>
      </div>
      <div class="bp-row">
        <span class="bp-label">{{ method === 'rate' ? '利润率' : '利润' }}</span>
        <input
          v-model="value"
          class="sg-input bp-input"
          :placeholder="method === 'rate' ? '如 8' : '如 5'"
          @input="err = ''"
        />
        <span class="bp-unit">{{ method === 'rate' ? '%' : '元' }}</span>
        <span class="bp-hint">{{ method === 'rate' ? '范围 -20% ~ 80%' : '范围 -5 ~ 999' }}</span>
      </div>
      <div v-if="err" class="bp-err">{{ err }}</div>
    </div>
    <template #foot>
      <button class="btn" @click="emit('close')">取消</button>
      <button class="btn primary" @click="confirm">确定</button>
    </template>
  </Modal>
</template>
