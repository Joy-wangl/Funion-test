<script setup lang="ts">
import { computed, ref } from 'vue';
import BubbleSelect from '../../components/BubbleSelect.vue';
import { createVersions, type CreateVersion } from './data';

const props = defineProps<{
  currentId: string;
  toast: (msg: string) => void;
}>();
const emit = defineEmits<{
  (e: 'switch', v: CreateVersion): void;
  (e: 'close'): void;
}>();

/** 选择版本全屏页：筛选 + 版本列表（切换/复制/删除/新建版本） */
interface VerFilter { title: string; name: string; no: string; person: string; platform: string; d1: string; d2: string }
const VER_EMPTY: VerFilter = { title: '', name: '', no: '', person: '', platform: '全部平台', d1: '', d2: '' };

const rows = ref<CreateVersion[]>(createVersions);
const draft = ref<VerFilter>({ ...VER_EMPTY });
const applied = ref<VerFilter>({ ...VER_EMPTY });
const list = computed(() => rows.value.filter((r) => {
  const day = r.time.slice(0, 10);
  return (
    (!applied.value.title || r.title.includes(applied.value.title)) &&
    (!applied.value.name || r.verName.includes(applied.value.name)) &&
    (!applied.value.no || r.versionNo.includes(applied.value.no)) &&
    (!applied.value.person || r.person.includes(applied.value.person)) &&
    (applied.value.platform === '全部平台' || r.platform === applied.value.platform) &&
    (!applied.value.d1 || day >= applied.value.d1) &&
    (!applied.value.d2 || day <= applied.value.d2)
  );
}));

const onMaskClick = (e: MouseEvent) => { if (e.target === e.currentTarget) emit('close'); };
</script>

<template>
  <div class="cpd-ver-mask" @click="onMaskClick">
    <div class="cpd-ver-panel">
      <div class="cpd-ver-head">
        <span class="cpd-ver-h">选择版本</span>
        <button class="cpd-ver-close" title="关闭" @click="emit('close')">✕</button>
      </div>
      <div class="cpd-ver-body">
        <div class="cpd-ver-top">
          <button class="primaryBtn" @click="props.toast('已新建版本')">新建版本</button>
        </div>
        <div class="cpd-ver-filter">
          <div class="cpd-ver-grid">
            <input v-model="draft.title" class="ib-input" placeholder="商品标题" />
            <input v-model="draft.name" class="ib-input" placeholder="版本名称" />
            <input v-model="draft.no" class="ib-input" placeholder="版本号" />
            <input v-model="draft.person" class="ib-input" placeholder="创建人" />
          </div>
          <div class="cpd-ver-row2">
            <BubbleSelect
              class-name="ib-select cpd-ver-plat"
              :value="draft.platform"
              :options="['全部平台', '淘宝', '视频号']"
              @change="(v: string) => (draft = { ...draft, platform: v })"
            />
            <div class="ib-range cpd-ver-range">
              <input v-model="draft.d1" class="ib-input" placeholder="创建开始日期" />
              <span>→</span>
              <input v-model="draft.d2" class="ib-input" placeholder="创建结束日期" />
            </div>
            <div class="cpd-ver-spacer" />
            <button class="lightBtn" @click="draft = { ...VER_EMPTY }; applied = { ...VER_EMPTY }">重置</button>
            <button class="primaryBtn" @click="applied = { ...draft }">查询</button>
          </div>
        </div>
        <table class="ib-table cpd-ver-table">
          <thead>
            <tr>
              <th>商品模板信息</th>
              <th>版本信息</th>
              <th>发布信息</th>
              <th>创建人&创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in list" :key="r.id">
              <td>
                <div class="cpd-ver-tpl">
                  <img :src="r.thumb" alt="" />
                  <div>
                    <div class="cpd-ver-ttitle" :title="r.title">{{ r.title }}</div>
                    <div class="cpd-ver-no">版本号:{{ r.versionNo }}</div>
                    <span class="cpd-plat-tag">{{ r.platform }}</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="cpd-ver-name">{{ r.verName }}</div>
                <div class="cpd-ver-desc">{{ r.verDesc }}</div>
              </td>
              <td>发布平台：{{ r.pubPlatform }}</td>
              <td>
                <div class="cpd-ver-name">{{ r.person }}</div>
                <div class="cpd-ver-desc">{{ r.time }}</div>
              </td>
              <td>
                <div class="cpd-ver-ops">
                  <a v-if="r.id === props.currentId" class="muted">当前版本</a>
                  <a v-else @click="emit('switch', r)">切换</a>
                  <a @click="props.toast(`已复制版本 ${r.verName}`)">复制</a>
                  <a
                    class="danger"
                    @click="rows = rows.filter((x) => x.id !== r.id); props.toast('版本已删除')"
                  >
                    删除
                  </a>
                </div>
              </td>
            </tr>
            <tr v-if="list.length === 0">
              <td colspan="5" class="cpd-ver-empty">暂无匹配版本</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
