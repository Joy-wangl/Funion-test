<template>
  <div class="sg-input-number" :class="{ disabled: disabled }">
    <button type="button" class="sg-in-btn" :disabled="disabled || modelValue <= min" @click="onChange(-1)">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14" /></svg>
    </button>
    <input class="sg-in-val" type="text" :value="modelValue" :disabled="disabled" readonly />
    <button type="button" class="sg-in-btn" :disabled="disabled || modelValue >= max" @click="onChange(1)">
      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}>(), { min: 1, max: 9999, step: 1, disabled: false });

const emit = defineEmits<{ (e: 'update:modelValue', v: number): void }>();

function onChange(delta: number) {
  const next = Math.max(props.min, Math.min(props.max, props.modelValue + delta * props.step));
  if (next !== props.modelValue) emit('update:modelValue', next);
}
</script>

<style scoped>
.sg-input-number { display: inline-flex; align-items: stretch; height: 28px; border: 1px solid #e4e8ef; border-radius: 6px; overflow: hidden; background: #fff; }
.sg-input-number.disabled { opacity: .45; cursor: not-allowed; }
.sg-in-btn { display: grid; place-items: center; width: 26px; border: 0; background: #f7f8fa; color: #4e5969; cursor: pointer; transition: background .15s, color .15s; }
.sg-in-btn:hover:not(:disabled) { background: #eef0f5; color: #2f6bff; }
.sg-in-btn:disabled { color: #c9cdd4; cursor: not-allowed; }
.sg-in-btn + .sg-in-btn { border-left: 1px solid #e4e8ef; }
.sg-in-val { width: 36px; border: 0; border-left: 1px solid #e4e8ef; border-right: 1px solid #e4e8ef; text-align: center; font-size: 13px; color: #1d2129; background: #fff; outline: none; }
</style>
