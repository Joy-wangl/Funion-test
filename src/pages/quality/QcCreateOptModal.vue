<script setup lang="ts">
/* ---------- 创建优化任务弹窗（仅问题点/需求/凭证，对齐原系统表单） ---------- */
import { ref } from 'vue';
import type { QcCenterSeries } from './qcCenterData';
import { OPT_DEMANDS, OPT_PROBLEMS } from './qcOptData';
import Modal from '../../components/Modal.vue';
import BubbleSelect from '../../components/BubbleSelect.vue';

const props = defineProps<{
  series: QcCenterSeries;
  onClose: () => void;
  onSubmit: (form: { problem: string; demand: string; evidence: string[] }) => void;
}>();

const problem = ref('');
const demand = ref('');
const evidence = ref<string[]>([]);
const errs = ref<{ problem?: string; demand?: string }>({});
const fileRef = ref<HTMLInputElement | null>(null);

const submit = () => {
  const e: typeof errs.value = {};
  if (!problem.value) e.problem = '请选择问题点';
  if (!demand.value) e.demand = '请选择需求';
  errs.value = e;
  if (e.problem || e.demand) return;
  props.onSubmit({ problem: problem.value, demand: demand.value, evidence: evidence.value });
};
</script>

<template>
  <Modal
    title="创建优化任务"
    :sub="`系列 ${series.seriesCode} · ${series.name}`"
    size="md"
    @close="props.onClose"
  >
    <div class="qc-create-form">
      <div class="qc-create-grid">
        <div class="form-item">
          <label><span class="req">*</span>问题点</label>
          <div class="fi-ctrl">
            <BubbleSelect
              class-name="sg-select"
              :options="[...OPT_PROBLEMS]"
              :value="problem || '请选择问题点'"
              @change="(v: string) => { problem = v; errs = { ...errs, problem: undefined }; }"
            />
            <div v-if="errs.problem" class="form-err">{{ errs.problem }}</div>
          </div>
        </div>
        <div class="form-item">
          <label><span class="req">*</span>需求</label>
          <div class="fi-ctrl">
            <BubbleSelect
              class-name="sg-select"
              :options="[...OPT_DEMANDS]"
              :value="demand || '请选择需求'"
              @change="(v: string) => { demand = v; errs = { ...errs, demand: undefined }; }"
            />
            <div v-if="errs.demand" class="form-err">{{ errs.demand }}</div>
          </div>
        </div>
      </div>
      <div class="form-item">
        <label>凭证</label>
        <div class="fi-ctrl">
          <input
            ref="fileRef"
            type="file"
            multiple
            style="display: none"
            @change="(e: Event) => {
              const names = [...((e.target as HTMLInputElement).files ?? [])].map((f) => f.name);
              if (names.length) evidence = [...evidence, ...names.filter((n) => !evidence.includes(n))];
              (e.target as HTMLInputElement).value = '';
            }"
          >
          <div class="ev-line">
            <button class="btn primary sm" type="button" @click="fileRef?.click()">
              点击上传
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <polyline points="16 16 12 12 8 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <line x1="12" y1="12" x2="12" y2="21" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
            <span v-for="n in evidence" :key="n" class="ev-thumb" :title="n">
              {{ n.split('.').pop()?.toUpperCase().slice(0, 4) || '附件' }}
              <i class="x" @click="evidence = evidence.filter((x) => x !== n)">×</i>
            </span>
          </div>
        </div>
      </div>
    </div>
    <template #foot>
      <button class="btn" @click="props.onClose">取消</button>
      <button class="btn primary" @click="submit">创建任务</button>
    </template>
  </Modal>
</template>
