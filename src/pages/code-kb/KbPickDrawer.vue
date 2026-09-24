<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { CbMaterial, MaterialType } from './codeKbData';
import { cbProductMap, materialsOfProduct, productsOfSeries } from './codeKbData';

/** 推荐素材选用抽屉（商品创建编辑态各上传位共用）：
 *  展示当前ID所属系列下全部商品编码豆腐块＋该编码下当前类型的素材；
 *  默认 TOP榜（生效素材按销量 TOP10），可切「全部」；卡片勾选跨编码累计，确认后回传选中素材 */
const props = defineProps<{ open: boolean; type: MaterialType; productId: string }>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'confirm', list: CbMaterial[]): void }>();

const curCode = ref('');
const view = ref<'top' | 'all'>('top');
const sel = ref<CbMaterial[]>([]);

watch(() => props.open, (v) => {
  if (!v) return;
  curCode.value = props.productId;
  view.value = 'top';
  sel.value = [];
});

const product = computed(() => cbProductMap[props.productId] ?? null);
const codes = computed(() => (product.value ? productsOfSeries(product.value.seriesId) : []));
const typeCount = (id: string) => materialsOfProduct(id).filter((m) => m.type === props.type).length;

const list = computed(() => {
  const all = materialsOfProduct(curCode.value)
    .filter((m) => m.type === props.type)
    .slice()
    .sort((a, b) => b.sales - a.sales);
  return view.value === 'top' ? all.filter((m) => m.status === '生效').slice(0, 10) : all;
});

const isSel = (m: CbMaterial) => sel.value.some((s) => s.id === m.id);
const toggle = (m: CbMaterial) => {
  const i = sel.value.findIndex((s) => s.id === m.id);
  if (i >= 0) sel.value.splice(i, 1);
  else sel.value.push(m);
};
const confirm = () => {
  if (!sel.value.length) return;
  emit('confirm', sel.value.slice());
};
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="kbp-mask" @click.self="emit('close')">
      <div class="kbp-panel">
        <div class="kbp-head">
          <span class="kbp-title">推荐素材</span>
          <span class="kbp-type">{{ type }}</span>
          <button type="button" class="kbp-close" title="关闭" @click="emit('close')">✕</button>
        </div>

        <!-- 当前ID所属系列下全部商品编码 -->
        <div class="kbp-codes">
          <button
            v-for="p in codes"
            :key="p.id"
            class="kbp-code"
            :class="curCode === p.id ? 'on' : ''"
            @click="curCode = p.id"
          >
            <b>{{ p.id }}</b>
            <span>素材 {{ typeCount(p.id) }}</span>
          </button>
        </div>

        <div class="kbp-toolbar">
          <button class="kbp-tab" :class="view === 'top' ? 'on' : ''" @click="view = 'top'">TOP榜</button>
          <button class="kbp-tab" :class="view === 'all' ? 'on' : ''" @click="view = 'all'">全部</button>
          <span class="kbp-count">共 {{ list.length }} 个素材</span>
        </div>

        <div class="kbp-body">
          <div v-if="list.length" class="kbp-grid">
            <div
              v-for="m in list"
              :key="m.id"
              class="kbp-card"
              :class="isSel(m) ? 'on' : ''"
              @click="toggle(m)"
            >
              <span class="kbp-thumb">
                <img :src="m.thumb" :alt="m.name" />
                <i v-if="type === '视频'" class="kbp-play">▶</i>
              </span>
              <i class="kbp-check" :class="isSel(m) ? 'on' : ''">
                <svg v-if="isSel(m)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
              </i>
              <div class="kbp-name" :title="m.name">{{ m.name }}</div>
              <div class="kbp-sub">销量 {{ m.sales }} · {{ m.version }}</div>
            </div>
          </div>
          <div v-else class="kbp-empty">该编码下暂无「{{ type }}」类型素材</div>
        </div>

        <div class="kbp-foot">
          <span class="kbp-selinfo">
            已选 {{ sel.length }} 项
            <a v-if="sel.length" href="#" @click.prevent="sel = []">清空</a>
          </span>
          <span class="kbp-acts">
            <button type="button" class="kbp-btn" @click="emit('close')">取消</button>
            <button type="button" class="kbp-btn primary kbp-ok" :disabled="!sel.length" @click="confirm">确认使用</button>
          </span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* 推荐素材抽屉：右侧 760px 白面板，豆腐块/卡片风格与素材库抽屉一致 */
.kbp-mask { position: fixed; inset: 0; z-index: 1700; background: rgba(20, 25, 40, 0.45); display: flex; justify-content: flex-end; }
.kbp-panel { width: 760px; max-width: 92vw; height: 100%; background: #fff; display: flex; flex-direction: column; box-shadow: -8px 0 32px rgba(20, 25, 40, 0.16); }
.kbp-head { display: flex; align-items: center; gap: 10px; padding: 16px 24px; border-bottom: 1px solid #edf0f5; }
.kbp-title { font-size: 15px; font-weight: 600; color: #202532; }
.kbp-type { padding: 2px 10px; border-radius: 6px; background: #eef2ff; color: #4f7cff; font-size: 12px; }
.kbp-close { margin-left: auto; width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: #596070; font-size: 14px; cursor: pointer; }
.kbp-close:hover { background: #f5f7fb; color: #202532; }

.kbp-codes { display: flex; gap: 12px; overflow-x: auto; padding: 12px 24px 14px; border-bottom: 1px solid #edf0f5; }
.kbp-code { flex: none; min-width: 128px; padding: 8px 14px; border: 0; border-radius: 8px; background: #f0f2f7; cursor: pointer; text-align: center; transition: background .15s; }
.kbp-code b { display: block; font-size: 13px; color: #202532; font-weight: 600; font-family: 'SF Mono', Consolas, monospace; }
.kbp-code span { display: block; font-size: 11px; color: #8b92a1; margin-top: 2px; }
.kbp-code:hover { background: #e8ebf3; }
.kbp-code.on { background: #eef2ff; }
.kbp-code.on b { color: #4f7cff; }
.kbp-code.on span { color: #7b96e8; }

.kbp-toolbar { display: flex; align-items: center; gap: 32px; padding: 0 24px; border-bottom: 1px solid #edf0f5; }
.kbp-tab { position: relative; padding: 12px 0; border: 0; background: transparent; font-size: 14px; color: #596070; cursor: pointer; }
.kbp-tab.on { color: #4f7cff; font-weight: 600; }
.kbp-tab.on::after { content: ''; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; border-radius: 1px; background: #4f7cff; }
.kbp-count { margin-left: auto; font-size: 12px; color: #8b92a1; }

.kbp-body { flex: 1; overflow: auto; padding: 16px 24px 24px; scrollbar-gutter: stable; }
.kbp-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
.kbp-card { position: relative; padding: 8px; border: 1px solid #e6e9f0; border-radius: 10px; cursor: pointer; transition: border-color .15s, background .15s; }
.kbp-card:hover { border-color: #c9d4f5; }
.kbp-card.on { border-color: #4f7cff; background: #f5f8ff; }
.kbp-thumb { position: relative; display: block; aspect-ratio: 1 / 1; border-radius: 8px; overflow: hidden; background: #f2f4f8; }
.kbp-thumb img { width: 100%; height: 100%; object-fit: cover; }
.kbp-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 17, 20, 0.55); color: #fff; font-style: normal; font-size: 13px; display: flex; align-items: center; justify-content: center; }
.kbp-check { position: absolute; top: 14px; right: 14px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #c6ccd8; background: rgba(255, 255, 255, 0.92); display: flex; align-items: center; justify-content: center; color: #fff; }
.kbp-check.on { border-color: #4f7cff; background: #4f7cff; }
.kbp-name { margin-top: 8px; font-size: 12px; color: #202532; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.kbp-sub { margin-top: 2px; font-size: 11px; color: #8b92a1; }
.kbp-empty { padding: 56px 0; text-align: center; font-size: 13px; color: #8b92a1; }

.kbp-foot { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-top: 1px solid #edf0f5; }
.kbp-selinfo { font-size: 13px; color: #596070; }
.kbp-selinfo a { margin-left: 12px; color: #4f7cff; text-decoration: none; }
.kbp-acts { display: flex; gap: 12px; }
.kbp-btn { height: 32px; padding: 0 18px; border: 1px solid #dde1ea; border-radius: 8px; background: #fff; font-size: 13px; color: #202532; cursor: pointer; }
.kbp-btn:hover { border-color: #c6ccd8; }
.kbp-btn.primary { border-color: #4f7cff; background: #4f7cff; color: #fff; }
.kbp-btn.primary:hover { background: #3d6ae8; }
.kbp-btn.primary:disabled { border-color: #c9d4f5; background: #c9d4f5; cursor: not-allowed; }
</style>
