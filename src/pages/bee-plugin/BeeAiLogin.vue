<script setup lang="ts">
import { ref } from 'vue';
import { pushToast } from '../../components/toast';

const emit = defineEmits<{ (e: 'success', user: string): void; (e: 'close'): void }>();

/* AI图库独立账号体系：与搬家登录互不相通，需单独登录 */
const acct = ref({ name: '', pwd: '' });
const acctErr = ref<{ name?: string; pwd?: string }>({});
const logging = ref(false);
const submit = () => {
  const e: typeof acctErr.value = {};
  if (!acct.value.name.trim()) e.name = '请输入用户名';
  if (!acct.value.pwd.trim()) e.pwd = '请输入密码';
  acctErr.value = e;
  if (Object.keys(e).length > 0) return;
  logging.value = true;
  pushToast('正在校验 AI图库 账号…');
  setTimeout(() => emit('success', acct.value.name.trim()), 900);
};
</script>

<template>
  <div class="bee-login" @click.self="emit('close')">
    <div class="bl-card ail-card">
      <div class="bl-brand">
        <span class="ail-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="15" rx="3" /><circle cx="9" cy="11" r="1.8" /><path d="M3 17l5-4 4 3 4-4 5 5" /></svg>
        </span>
        <div class="bl-brand-t">
          <b>AI图库</b>
          <i>AI 生成商品图素材 · 独立账号体系</i>
        </div>
      </div>

      <div class="bl-acct ail-acct">
        <div class="bl-field">
          <input v-model="acct.name" placeholder="请输入 AI图库 用户名" @input="acctErr.name = undefined" />
          <div v-if="acctErr.name" class="bl-err">{{ acctErr.name }}</div>
        </div>
        <div class="bl-field">
          <input v-model="acct.pwd" type="password" placeholder="请输入密码" @keyup.enter="submit" @input="acctErr.pwd = undefined" />
          <div v-if="acctErr.pwd" class="bl-err">{{ acctErr.pwd }}</div>
        </div>
        <button class="bl-btn" :disabled="logging" @click="submit">
          {{ logging ? '登录中…' : '登录' }}
        </button>
      </div>

      <div class="bl-agree">AI图库 账号与蜜蜂搬家账号相互独立，需分别登录</div>
    </div>
  </div>
</template>
