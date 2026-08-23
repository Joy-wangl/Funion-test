<script setup lang="ts">
defineProps<{
  title: string;
  sub?: string;
  size?: 'md' | 'lg' | 'xl';
}>();
const emit = defineEmits<{ (e: 'close'): void }>();
</script>

<template>
  <div class="mask" @click.self="emit('close')">
    <div class="modal" :class="size ?? ''">
      <div class="modal-head">
        <div>
          <div class="m-title">{{ title }}</div>
          <div v-if="sub" class="m-sub">{{ sub }}</div>
        </div>
        <span class="x" @click="emit('close')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </span>
      </div>
      <div class="modal-body"><slot /></div>
      <div class="modal-foot"><slot name="foot" /></div>
    </div>
  </div>
</template>
