<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { IconCheck } from './permIcons';

const props = defineProps<{
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
}>();
const emit = defineEmits<{ (e: 'change', checked: boolean): void }>();

const inputRef = ref<HTMLInputElement | null>(null);
const applyIndeterminate = () => {
  if (inputRef.value) inputRef.value.indeterminate = !!props.indeterminate;
};
onMounted(applyIndeterminate);
watch(() => props.indeterminate, applyIndeterminate);
</script>

<template>
  <label class="checkbox" :class="disabled ? 'disabled' : ''">
    <input
      ref="inputRef"
      type="checkbox"
      :checked="checked"
      :disabled="disabled"
      @change="emit('change', ($event.target as HTMLInputElement).checked)"
    />
    <span class="box"><IconCheck /></span>
  </label>
</template>
