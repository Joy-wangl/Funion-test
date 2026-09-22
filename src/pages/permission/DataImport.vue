<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import Ellipsis from '../../components/Ellipsis.vue';
import Modal from '../../components/Modal.vue';
import { pushToast } from '../../components/toast';
import './style.css';

/* =========================================================
   设置 › 数据导入（文件上传记录列表）
   列：上传时间 / 上传文件 / 上传人 / 上传文件类型 / 操作（下载、重新上传）；记录不可删除
   筛选：文件类型（即效）；新建：上传弹窗（选类型 + 选文件）
   文件类型初始仅「日报数据」；弹窗内类型下拉 creatable 可新建类型，类型同样不可删除
   ========================================================= */

interface DiRow {
  id: number;
  time: string;
  file: string;
  size: string;
  uploader: string;
  type: string;
}

/* 上传记录种子：类型统一日报数据，时间倒序 */
const rows = ref<DiRow[]>([
  { id: 5, time: '2026-09-16 09:24', file: '日报数据_20260916.xlsx', size: '128 KB', uploader: '七妮妮', type: '日报数据' },
  { id: 4, time: '2026-09-15 09:18', file: '日报数据_20260915.xlsx', size: '126 KB', uploader: '李四', type: '日报数据' },
  { id: 3, time: '2026-09-14 09:31', file: '日报数据_20260914.csv', size: '96 KB', uploader: '陈默', type: '日报数据' },
  { id: 2, time: '2026-09-13 09:12', file: '日报数据_20260913.xlsx', size: '131 KB', uploader: '林悦', type: '日报数据' },
  { id: 1, time: '2026-09-12 09:20', file: '日报数据_20260912.xlsx', size: '124 KB', uploader: '七妮妮', type: '日报数据' },
]);

/* 文件类型池：初始仅日报数据；新建弹窗 creatable 只增不删 */
const types = ref<string[]>(['日报数据']);

/* ---------- 筛选（即效，无查询按钮） ---------- */
const fType = ref('全部');
const filterOpts = computed(() => ['全部', ...types.value]);
const filtered = computed(() => rows.value.filter((r) => fType.value === '全部' || r.type === fType.value));

/* ---------- 新建上传弹窗 ---------- */
const createOpen = ref(false);
const cType = ref('日报数据');
const cFile = ref<{ name: string; size: number } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const openCreate = () => { createOpen.value = true; };
const closeCreate = () => { createOpen.value = false; };
const pickFile = () => fileInputRef.value?.click();
const onFileChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  cFile.value = f ? { name: f.name, size: f.size } : null;
};
/* creatable 抛新值即入类型池（只增不删） */
const onTypeChange = (v: string) => {
  cType.value = v;
  if (!types.value.includes(v)) {
    types.value.push(v);
    pushToast(`已新建文件类型「${v}」`);
  }
};
const fmtSize = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const nowStr = () => {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const submit = () => {
  if (!cFile.value) { pushToast('请先选择要上传的文件', 'warning'); return; }
  rows.value.unshift({ id: Date.now(), time: nowStr(), file: cFile.value.name, size: fmtSize(cFile.value.size), uploader: '七妮妮', type: cType.value });
  pushToast(`已上传 ${cFile.value.name}`);
  createOpen.value = false;
  cFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
};

/* ---------- 行操作：下载 / 重新上传（记录不可删除） ---------- */
/* 下载：静态演示用占位内容生成 blob，按记录文件名落盘 */
const download = (r: DiRow) => {
  const blob = new Blob([`${r.type}\n文件名,${r.file}\n上传时间,${r.time}\n上传人,${r.uploader}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = r.file;
  a.click();
  URL.revokeObjectURL(url);
  pushToast(`开始下载 ${r.file}`);
};
/* 重新上传：换文件后刷新文件名/大小/时间/上传人，类型保持不变 */
const reUpId = ref<number | null>(null);
const reUpInputRef = ref<HTMLInputElement | null>(null);
const openReUp = (r: DiRow) => { reUpId.value = r.id; reUpInputRef.value?.click(); };
const onReUpChange = (e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  const row = rows.value.find((x) => x.id === reUpId.value);
  if (f && row) {
    row.file = f.name;
    row.size = fmtSize(f.size);
    row.time = nowStr();
    row.uploader = '七妮妮';
    pushToast(`已重新上传 ${f.name}`);
  }
  reUpId.value = null;
  if (reUpInputRef.value) reUpInputRef.value.value = '';
};
</script>

<template>
  <div class="sg-page di-page">
    <!-- 筛选卡：文件类型条件 + 新建入口同排右对齐（条件即效） -->
    <div class="sg-filter">
      <div class="sg-grid">
        <div class="sg-field">
          <label>文件类型</label>
          <BubbleSelect class-name="sg-select" :value="fType" :options="filterOpts" @change="(v: string) => (fType = v)" />
        </div>
        <div class="sg-actions">
          <button type="button" class="sg-btn primary" @click="openCreate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>新建</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 上传记录列表：操作列仅下载/重新上传（记录不可删除） -->
    <div class="sg-card">
      <div :style="{ overflow: 'auto' }">
        <table class="sg-table di-table">
          <thead>
            <tr>
              <th>上传时间</th>
              <th>上传文件</th>
              <th>上传人</th>
              <th>上传文件类型</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filtered" :key="r.id">
              <td>{{ r.time }}</td>
              <td>
                <div class="di-filecell">
                  <Ellipsis class="name" :text="r.file" />
                  <span class="size">{{ r.size }}</span>
                </div>
              </td>
              <td>{{ r.uploader }}</td>
              <td>{{ r.type }}</td>
              <td>
                <div class="sg-acts">
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="download(r)">下载</a>
                  <a class="sg-link" href="javascript:void(0)" @click.prevent="openReUp(r)">重新上传</a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="filtered.length === 0" class="sg-empty">
          <div class="sg-empty-wrap">
            <div class="sg-empty-icon">◌</div>
            <div>暂无数据，请调整筛选条件</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 重新上传隐藏文件入口：行操作触发，选完即替换对应记录 -->
    <input ref="reUpInputRef" type="file" accept=".xls,.xlsx,.csv" :style="{ display: 'none' }" @change="onReUpChange" />

    <!-- 新建上传弹窗：pm-host 宿主层复用 .pm-page 弹窗基础样式 -->
    <div class="pm-page pm-host">
      <Modal v-if="createOpen" title="新建数据导入" sub="选择文件类型并上传文件" @close="closeCreate">
        <div class="di-form">
          <div class="di-field">
            <label>上传文件类型</label>
            <BubbleSelect :value="cType" :options="types" creatable @change="onTypeChange" />
          </div>
          <div class="di-field">
            <label>上传文件</label>
            <div class="di-filezone" :class="{ on: !!cFile }" @click="pickFile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></svg>
              <template v-if="cFile">
                <span class="di-filename">{{ cFile.name }}</span>
                <span class="di-filesite">{{ fmtSize(cFile.size) }}</span>
              </template>
              <span v-else>点击选择文件（xls / xlsx / csv）</span>
            </div>
            <input ref="fileInputRef" type="file" accept=".xls,.xlsx,.csv" :style="{ display: 'none' }" @change="onFileChange" />
          </div>
          <div class="di-field">
            <label>上传人</label>
            <div class="di-val">七妮妮</div>
          </div>
        </div>
        <template #foot>
          <button class="btn" @click="closeCreate">取消</button>
          <button class="btn primary" @click="submit">确认上传</button>
        </template>
      </Modal>
    </div>
  </div>
</template>
