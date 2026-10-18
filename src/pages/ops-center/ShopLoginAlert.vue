<script setup lang="ts">
/* ---------- 顶栏店铺登录失效提醒：口径与账号管理一致（该店卖家账号全部离线＝掉店）；
   至多平铺 3 个芯片，超出收进「+N」悬浮面板；点击芯片/面板行走掉店桥直达账号管理的管理账号抽屉 ---------- */
import { computed, onBeforeUnmount, ref } from 'vue';
import { PLATFORM_LOGO } from './data';
import { amOfflineShopNames, amOfflineSellerOfShop } from '../permission/accountData';
import { requestShopAcct } from '../../components/globalMsgData';

const MAX = 3;
const expired = computed(() =>
  amOfflineShopNames.value
    .map((name) => {
      const r = amOfflineSellerOfShop(name);
      return r ? { name, platform: r.platform, login: r.login, acctId: r.acctId, updatedAt: r.updatedAt } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x),
);
const shown = computed(() => expired.value.slice(0, MAX));
const hidden = computed(() => expired.value.slice(MAX));

const open = ref(false);
let timer: number | undefined;
const show = () => { window.clearTimeout(timer); open.value = true; };
const hide = () => { timer = window.setTimeout(() => { open.value = false; }, 120); };
onBeforeUnmount(() => window.clearTimeout(timer));

const go = (acctId: string) => { open.value = false; requestShopAcct(acctId); };
</script>

<template>
  <div v-if="expired.length" class="shop-login-alert">
    <button
      v-for="x in shown" :key="x.name" type="button" class="shop-alert-chip"
      :title="`${x.name} · ${x.login} · ${x.updatedAt} 离线，点击前往管理账号`"
      @click="go(x.acctId)"
    >
      <img class="shop-alert-logo" :src="PLATFORM_LOGO[x.platform]" :alt="x.platform">
      <span class="nm">{{ x.name }}</span>
      <span class="st"><i class="shop-alert-blink" aria-hidden="true" />登录失效</span>
    </button>

    <div v-if="hidden.length" class="shop-alert-more" @mouseenter="show" @mouseleave="hide">
      <button type="button" class="shop-alert-chip more" :title="`另有 ${hidden.length} 家店铺登录失效`">+{{ hidden.length }}</button>
      <div v-if="open" class="shop-alert-panel">
        <button
          v-for="x in hidden" :key="x.name" type="button" class="shop-alert-row"
          :title="`${x.name} · ${x.login} · ${x.updatedAt} 离线`"
          @click="go(x.acctId)"
        >
          <img class="shop-alert-logo" :src="PLATFORM_LOGO[x.platform]" :alt="x.platform">
          <span class="nm">{{ x.name }}</span>
          <span class="st"><i class="shop-alert-blink" aria-hidden="true" />登录失效</span>
        </button>
      </div>
    </div>
  </div>
</template>
