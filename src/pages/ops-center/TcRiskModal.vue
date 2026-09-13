<script setup lang="ts">
/** 风控二次确认弹窗：风险管控商品上架确认（任务中心列表 / 发布进度面板共用） */
defineProps<{
  /** 商品名称 */
  name: string;
  /** 风险说明（默认公司风险管控口径） */
  reason?: string;
}>();
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'continue'): void }>();
</script>

<template>
  <Teleport to="body">
    <div class="tcr-mask" @click.self="emit('cancel')">
      <div class="tcr-modal">
        <div class="tcr-head">
          <b>风险提示</b>
          <button type="button" title="关闭" @click="emit('cancel')">✕</button>
        </div>
        <div class="tcr-body">
          <div class="tcr-kv"><span>商品名称</span><b :title="name">{{ name }}</b></div>
          <div class="tcr-warn">
            <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
              <path d="M10 2.5 18.5 17H1.5L10 2.5Z" stroke="var(--color-warning)" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M10 8v4" stroke="var(--color-warning)" stroke-width="1.6" stroke-linecap="round" />
              <circle cx="10" cy="14.6" r="0.9" fill="var(--color-warning)" />
            </svg>
            <p>{{ reason || '该商品为公司风险管控商品，上架可能会导致亏损，是否确认上架？' }}</p>
          </div>
        </div>
        <div class="tcr-foot">
          <button type="button" @click="emit('cancel')">取消任务</button>
          <button type="button" class="primary" @click="emit('continue')">继续上架</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tcr-mask {
  position: fixed;
  inset: 0;
  z-index: 1100;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tcr-modal {
  width: 400px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

.tcr-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}
.tcr-head b { font-size: 14px; color: #1d2129; }
.tcr-head button {
  background: none;
  border: none;
  font-size: 14px;
  color: #8a94a6;
  cursor: pointer;
  padding: 2px 6px;
  line-height: 1;
  border-radius: 4px;
}
.tcr-head button:hover { background: #f2f3f7; color: #1d2129; }

.tcr-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}
.tcr-kv { display: flex; gap: 12px; font-size: 13px; }
.tcr-kv span { flex: none; width: 60px; color: #8a94a6; }
.tcr-kv b {
  flex: 1;
  color: #1d2129;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tcr-warn {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  background: var(--color-warning-light);
  border: 1px solid #ffe4ba;
  border-radius: 6px;
}
.tcr-warn svg { flex: none; margin-top: 1px; }
.tcr-warn p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #4e5969;
}

.tcr-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
}
.tcr-foot button {
  padding: 6px 16px;
  border: 1px solid #e5e6eb;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  color: #4e5969;
  cursor: pointer;
}
.tcr-foot button:hover { border-color: #c9cdd4; }
.tcr-foot button.primary { background: #4f7cff; border-color: #4f7cff; color: #fff; }
.tcr-foot button.primary:hover { background: #3f6cf2; border-color: #3f6cf2; }
</style>
