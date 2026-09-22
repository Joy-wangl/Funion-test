<script setup lang="ts">
/** 统一日期范围选择器：单次弹层内完成起止选择，替代双 input 分离模式 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{
  from: string;
  to: string;
  placeholder?: string;
}>();
const emit = defineEmits<{
  (e: 'update:from', v: string): void;
  (e: 'update:to', v: string): void;
}>();

const open = ref(false);
const anchor = ref('');
const view = ref({ y: 2026, m: 9 });
const triggerRef = ref<HTMLDivElement | null>(null);
const pos = ref({ x: 0, y: 0 });

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(new Date());

const display = computed(() => {
  if (props.from && props.to) return `${props.from} ~ ${props.to}`;
  if (props.from) return `${props.from} ~ 请选择结束日期`;
  return props.placeholder ?? '请选择日期范围';
});

const cells = computed(() => {
  const { y, m } = view.value;
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const start = new Date(y, m - 1, 1 - lead);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { iso: iso(d), day: d.getDate(), inMonth: d.getMonth() === m - 1 };
  });
});

const cellClass = (c: { iso: string; inMonth: boolean }) => {
  const cls: Record<string, boolean> = { out: !c.inMonth, today: c.iso === today };
  cls.on = c.iso === props.from || c.iso === props.to || (!props.to && c.iso === anchor.value);
  cls.in = !!props.from && !!props.to && c.iso > props.from && c.iso < props.to;
  return cls;
};

const shift = (n: number) => {
  let { y, m } = view.value;
  m += n;
  if (m < 1) { m = 12; y -= 1; }
  if (m > 12) { m = 1; y += 1; }
  view.value = { y, m };
};

const openPop = () => {
  const base = props.from ? new Date(`${props.from}T00:00:00`) : new Date();
  view.value = { y: base.getFullYear(), m: base.getMonth() + 1 };
  anchor.value = props.from && !props.to ? props.from : '';
  const rect = triggerRef.value?.getBoundingClientRect();
  pos.value = { x: rect?.left ?? 0, y: (rect?.bottom ?? 0) + 4 };
  open.value = true;
};

const pick = (isoV: string) => {
  if (!anchor.value) {
    anchor.value = isoV;
    emit('update:from', isoV);
    emit('update:to', '');
    return;
  }
  if (isoV < anchor.value) {
    emit('update:from', isoV);
    emit('update:to', anchor.value);
  } else {
    emit('update:from', anchor.value);
    emit('update:to', isoV);
  }
  anchor.value = '';
  open.value = false;
};

const clear = () => {
  emit('update:from', '');
  emit('update:to', '');
  anchor.value = '';
  open.value = false;
};

const pickToday = () => {
  emit('update:from', today);
  emit('update:to', today);
  anchor.value = '';
  open.value = false;
};

const onDocDown = (e: MouseEvent) => {
  const t = e.target as HTMLElement;
  if (!t.closest('.drp-pop') && !t.closest('.drp-trigger')) open.value = false;
};

onMounted(() => document.addEventListener('mousedown', onDocDown));
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocDown));
</script>

<template>
  <div class="drp-trigger" ref="triggerRef" @click="openPop">
    <span class="drp-text" :class="{ ph: !from && !to }">{{ display }}</span>
    <span class="drp-clock">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    </span>
  </div>
  <Teleport to="body">
    <div v-if="open" class="drp-pop" :style="{ left: pos.x + 'px', top: pos.y + 'px' }">
      <div class="drp-head">
        <span class="drp-title">{{ view.y }}年{{ String(view.m).padStart(2, '0') }}月</span>
        <span class="drp-nav">
          <button type="button" aria-label="上个月" @click="shift(-1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button type="button" aria-label="下个月" @click="shift(1)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </span>
      </div>
      <div class="drp-week"><span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w">{{ w }}</span></div>
      <div class="drp-grid">
        <button v-for="c in cells" :key="c.iso" type="button" class="drp-cell" :class="cellClass(c)" @click="pick(c.iso)">{{ c.day }}</button>
      </div>
      <div class="drp-foot">
        <button type="button" @click="clear">清除</button>
        <button type="button" @click="pickToday">今天</button>
      </div>
    </div>
  </Teleport>
</template>

<style>
.drp-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  background: #fff;
  border: 1px solid var(--color-border, #e8ebf1);
  border-radius: var(--radius-lg, 10px);
  cursor: pointer;
  font-size: var(--fs-base, 14px);
  color: var(--color-text, #202532);
  transition: border-color 150ms;
  min-width: 220px;
}
.drp-trigger:hover {
  border-color: var(--color-primary, #4f7cff);
}
.drp-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.drp-text.ph {
  color: var(--color-text-4, #c9cdd4);
}
.drp-clock {
  flex: none;
  margin-left: 8px;
  color: var(--color-text-3, #8b92a1);
}
.drp-pop {
  position: fixed;
  z-index: 4100;
  background: #fff;
  border: 1px solid var(--color-border, #e8ebf1);
  border-radius: var(--radius-md, 8px);
  box-shadow: var(--shadow-lg, 0 10px 30px rgba(26,34,56,.12));
  padding: 12px;
  width: 280px;
}
.drp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.drp-title {
  font-size: var(--fs-base, 14px);
  font-weight: var(--fw-medium, 500);
  color: var(--color-text, #202532);
}
.drp-nav {
  display: flex;
  gap: 4px;
}
.drp-nav button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-text-2, #445066);
  border-radius: 4px;
}
.drp-nav button:hover {
  background: var(--color-fill-2, #f2f3f7);
}
.drp-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 4px;
}
.drp-week span {
  text-align: center;
  font-size: var(--fs-aux, 12px);
  color: var(--color-text-3, #8b92a1);
  padding: 4px 0;
}
.drp-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.drp-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--fs-base, 14px);
  color: var(--color-text, #202532);
  border-radius: 4px;
  margin: 0 auto;
}
.drp-cell:hover {
  background: var(--color-primary-light, #eef3ff);
}
.drp-cell.out {
  color: var(--color-text-4, #c9cdd4);
}
.drp-cell.today {
  font-weight: var(--fw-medium, 500);
  color: var(--color-primary, #4f7cff);
}
.drp-cell.on {
  background: var(--color-primary, #4f7cff);
  color: #fff;
}
.drp-cell.in {
  background: var(--color-primary-light, #eef3ff);
}
.drp-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-2, #f0f3f7);
}
.drp-foot button {
  padding: 4px 12px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: var(--fs-aux, 12px);
  color: var(--color-primary, #4f7cff);
  border-radius: 4px;
}
.drp-foot button:hover {
  background: var(--color-primary-light, #eef3ff);
}
</style>
