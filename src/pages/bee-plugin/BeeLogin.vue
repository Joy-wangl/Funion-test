<script setup lang="ts">
import { computed, ref } from 'vue';
import { qrMatrix } from './data';
import { pushToast } from '../../components/toast';

const emit = defineEmits<{ (e: 'success', user: string): void; (e: 'close'): void }>();
/* tone=fs：Funion s 复用登录卡（蓝紫渐变 logo + 品牌文案） */
const props = withDefaults(defineProps<{ tone?: 'bee' | 'fs'; brand?: string; slogan?: string; demoUser?: string }>(), {
  tone: 'bee',
  brand: '蜜蜂搬家',
  slogan: '电商搬家插件 · 一站式选品铺货',
  demoUser: '蜜蜂用户',
});

const seed = ref(20260827);
const matrix = computed(() => qrMatrix(seed.value));
const scanning = ref(false);

/* 登录方式：钉钉扫码 / 账号密码 */
const mode = ref<'qr' | 'pwd'>('qr');
const acct = ref({ name: '', pwd: '', cap: '' });
const acctErr = ref<{ name?: string; pwd?: string; cap?: string }>({});
const logging = ref(false);

/* 图形验证码：4 位去混淆字符，点码刷新，大小写不敏感；校验失败自动换码 */
const CAP_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genCap = () => Array.from({ length: 4 }, () => CAP_CHARS[Math.floor(Math.random() * CAP_CHARS.length)]).join('');
const capCode = ref(genCap());
const refreshCap = () => { capCode.value = genCap(); };

const submitAcct = () => {
  const e: typeof acctErr.value = {};
  if (!acct.value.name.trim()) e.name = '请输入用户名';
  if (!acct.value.pwd.trim()) e.pwd = '请输入密码';
  if (!acct.value.cap.trim()) e.cap = '请输入验证码';
  else if (acct.value.cap.trim().toUpperCase() !== capCode.value) {
    e.cap = '验证码不正确';
    refreshCap();
  }
  acctErr.value = e;
  if (Object.keys(e).length > 0) return;
  logging.value = true;
  pushToast('正在校验账号信息…');
  setTimeout(() => emit('success', acct.value.name.trim()), 900);
};

/* 演示环境：模拟钉钉扫码成功回调 */
const simulate = () => {
  if (scanning.value) return;
  scanning.value = true;
  pushToast('扫码成功，正在确认登录…');
  setTimeout(() => emit('success', props.demoUser), 900);
};

const refresh = () => {
  seed.value = Math.floor(Math.random() * 1e8) + 1;
  scanning.value = false;
};
</script>

<template>
  <div class="bee-login" @click.self="emit('close')">
    <div class="bl-card">
      <div class="bl-brand">
        <span class="bee-logo big" :class="{ fs: tone === 'fs' }">{{ tone === 'fs' ? 'S' : '🐝' }}</span>
        <div class="bl-brand-t">
          <b>{{ brand }}</b>
          <i>{{ slogan }}</i>
        </div>
      </div>

      <div class="bl-tabs">
        <button :class="{ on: mode === 'qr' }" @click="mode = 'qr'">扫码登录</button>
        <button :class="{ on: mode === 'pwd' }" @click="mode = 'pwd'">账号登录</button>
      </div>

      <!-- 钉钉扫码 -->
      <template v-if="mode === 'qr'">
        <div class="bl-qr">
          <span class="bl-corner c1" /><span class="bl-corner c2" />
          <span class="bl-corner c3" /><span class="bl-corner c4" />
          <svg class="bl-qr-svg" :viewBox="`0 0 ${matrix.length} ${matrix.length}`" shape-rendering="crispEdges">
            <template v-for="(row, r) in matrix" :key="r">
              <template v-for="(cell, c) in row" :key="c">
                <rect v-if="cell" :x="c" :y="r" width="1" height="1" />
              </template>
            </template>
          </svg>
          <span class="bl-ding">钉</span>
          <div v-if="scanning" class="bl-scanline" />
        </div>

        <div class="bl-title">钉钉扫码登录</div>
        <div class="bl-hint">打开钉钉 App 扫一扫，快速登录{{ brand }}</div>

        <button class="bl-btn" :disabled="scanning" @click="simulate">
          {{ scanning ? '登录中…' : '模拟扫码成功（演示）' }}
        </button>
        <a class="bl-refresh" @click="refresh">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11a8 8 0 1 0-2.3 6.3" /><path d="M20 4v7h-7" /></svg>
          刷新二维码
        </a>
      </template>

      <!-- 账号密码 -->
      <div v-else class="bl-acct">
        <div class="bl-field">
          <input v-model="acct.name" placeholder="请输入用户名" @input="acctErr.name = undefined" />
          <div v-if="acctErr.name" class="bl-err">{{ acctErr.name }}</div>
        </div>
        <div class="bl-field">
          <input v-model="acct.pwd" type="password" placeholder="请输入密码" @keyup.enter="submitAcct" @input="acctErr.pwd = undefined" />
          <div v-if="acctErr.pwd" class="bl-err">{{ acctErr.pwd }}</div>
        </div>
        <div class="bl-field">
          <div class="bl-caprow">
            <input v-model="acct.cap" placeholder="请输入验证码" @keyup.enter="submitAcct" @input="acctErr.cap = undefined" />
            <button class="bl-cap" type="button" title="点击刷新验证码" @click="refreshCap">
              <span v-for="(ch, i) in capCode" :key="i" :class="`c${i}`">{{ ch }}</span>
            </button>
          </div>
          <div v-if="acctErr.cap" class="bl-err">{{ acctErr.cap }}</div>
        </div>
        <button class="bl-btn" :disabled="logging" @click="submitAcct">
          {{ logging ? '登录中…' : '登录' }}
        </button>
      </div>

      <div class="bl-agree">登录即代表同意《用户协议》与《隐私政策》</div>
    </div>
  </div>
</template>
