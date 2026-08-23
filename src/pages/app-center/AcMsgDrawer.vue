<script setup lang="ts">
/* 消息中心抽屉：身份/维度/已读未读（1:1 移植自 AppCenter.tsx 的 msgOpen 分支） */
import { computed } from 'vue';
import { FB_TYPES, type AppItem, type AppReview, type FeedbackItem } from './data';
import { IC, agoText } from './acHelpers';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';

const props = defineProps<{
  apps: AppItem[];
  /** 我的应用（mine）关联的评价 */
  myReviews: AppReview[];
  fbList: FeedbackItem[];
  msgTab: 'app' | 'sys';
  msgAppFilter: string;
  msgFbType: string;
  msgStatus: 'all' | 'pending' | 'done';
  rvReplyId: string | null;
  rvReplyText: string;
  fbReplyId: string | null;
  fbReplyText: string;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMsgTab: (t: 'app' | 'sys') => void;
  onMsgAppFilter: (id: string) => void;
  onMsgFbType: (t: string) => void;
  onMsgStatus: (s: 'all' | 'pending' | 'done') => void;
  onMarkRevRead: (id: string) => void;
  onMarkFbRead: (id: string) => void;
  onGotoApp: (appId: string) => void;
  onGotoFb: (fbId: string) => void;
  onRvReplyId: (id: string | null) => void;
  onRvReplyText: (v: string) => void;
  onReplyReview: (id: string) => void;
  onFbReplyId: (id: string | null) => void;
  onFbReplyText: (v: string) => void;
  onReplyFb: (id: string) => void;
}>();

const unreadReviewCount = computed(() => props.myReviews.filter((r) => r.read === false).length);
const unreadFbCount = computed(() => props.fbList.filter((f) => f.read === false).length);
const railApps = computed(() => props.apps.filter((a) => a.mine && props.myReviews.some((r) => r.appId === a.id)));
const shownReviews = computed(() => (props.msgAppFilter === 'all' ? props.myReviews : props.myReviews.filter((r) => r.appId === props.msgAppFilter))
  .filter((r) => props.msgStatus === 'all' || (props.msgStatus === 'pending' ? !r.reply : !!r.reply)));
const shownFb = computed(() => (props.msgFbType === 'all' ? props.fbList : props.fbList.filter((f) => f.type === props.msgFbType))
  .filter((f) => props.msgStatus === 'all' || (props.msgStatus === 'pending' ? f.msgs[f.msgs.length - 1].role === 'user' : f.msgs[f.msgs.length - 1].role === 'admin')));
</script>

<template>
  <div class="ap-drawer-mask" @click="onClose()" />
  <div class="ap-drawer ap-drawer-msg">
    <div class="ap-drawer-head">
      <span>消息中心</span>
      <div class="ap-msg-head-act">
        <button type="button" class="ap-link" @click="onMarkAllRead()">全部已读</button>
        <button type="button" @click="onClose()"><AcSvg :d="IC.clear" :size="14" /></button>
      </div>
    </div>
    <div class="ap-msg-tabs">
      <button type="button" :class="msgTab === 'sys' ? 'on' : ''" @click="onMsgTab('sys')">
        系统反馈<i v-if="unreadFbCount > 0">{{ unreadFbCount }}</i>
      </button>
      <button type="button" :class="msgTab === 'app' ? 'on' : ''" @click="onMsgTab('app')">
        应用反馈<i v-if="unreadReviewCount > 0">{{ unreadReviewCount }}</i>
      </button>
    </div>
    <div class="ap-msg-pane">
      <div class="ap-msg-rail">
        <template v-if="msgTab === 'app'">
          <button type="button" :class="msgAppFilter === 'all' ? 'on' : ''" @click="onMsgAppFilter('all')">
            <span class="ap-rail-name">全部应用</span>
            <i v-if="unreadReviewCount > 0" class="ap-rail-unread">{{ unreadReviewCount }}</i>
          </button>
          <button
            v-for="a in railApps"
            :key="a.id"
            type="button"
            :class="msgAppFilter === a.id ? 'on' : ''"
            @click="onMsgAppFilter(a.id)"
          >
            <AcLogo :icon="a.icon" :size="33" />
            <span class="ap-rail-name">{{ a.name }}</span>
            <i
              v-if="myReviews.filter((r) => r.appId === a.id && r.read === false).length > 0"
              class="ap-rail-unread"
            >{{ myReviews.filter((r) => r.appId === a.id && r.read === false).length }}</i>
          </button>
        </template>
        <template v-else>
          <button type="button" :class="msgFbType === 'all' ? 'on' : ''" @click="onMsgFbType('all')">
            <span class="ap-rail-name">全部类型</span>
            <i v-if="unreadFbCount > 0" class="ap-rail-unread">{{ unreadFbCount }}</i>
          </button>
          <button
            v-for="t in FB_TYPES"
            :key="t"
            type="button"
            :class="msgFbType === t ? 'on' : ''"
            @click="onMsgFbType(t)"
          >
            <span class="ap-rail-name">{{ t }}</span>
            <i v-if="fbList.filter((f) => f.type === t && f.read === false).length > 0" class="ap-rail-unread">{{ fbList.filter((f) => f.type === t && f.read === false).length }}</i>
          </button>
        </template>
      </div>
      <div class="ap-msg-list">
        <div class="ap-msg-filter">
          <div class="ap-fb-tabs">
            <button type="button" :class="msgStatus === 'all' ? 'on' : ''" @click="onMsgStatus('all')">全部</button>
            <button type="button" :class="msgStatus === 'pending' ? 'on' : ''" @click="onMsgStatus('pending')">待回复</button>
            <button type="button" :class="msgStatus === 'done' ? 'on' : ''" @click="onMsgStatus('done')">已回复</button>
          </div>
        </div>
        <template v-if="msgTab === 'app'">
          <div v-if="shownReviews.length === 0" class="ap-empty">该应用下暂无用户评价</div>
          <div
            v-for="r in shownReviews"
            :key="r.id"
            class="ap-msg-item"
            :class="r.read === false ? ' unread' : ''"
            @click="onMarkRevRead(r.id)"
          >
            <div class="ap-msg-top">
              <b>
                <i v-if="r.read === false" class="ap-msg-dot" />
                {{ apps.find((a) => a.id === r.appId)?.name ?? r.appId }}
                <em class="ap-msg-st" :class="r.reply ? 'done' : 'pending'">{{ r.reply ? '已回复' : '待回复' }}</em>
              </b>
              <span class="ap-msg-top-act">
                <i>{{ agoText(r.date) }} · v{{ r.version }}</i>
                <button type="button" class="ap-link" @click="onMarkRevRead(r.id); onGotoApp(r.appId)">查看应用</button>
              </span>
            </div>
            <div class="ap-msg-rev">
              <span>{{ r.user }}</span>
              <span class="ap-msg-stars">
                <AcSvg v-for="n in 5" :key="n" :d="IC.star" :size="12" filled :class-name="n <= r.stars ? 'ap-star' : 'ap-star-dim'" />
              </span>
              <p>{{ r.title }} · {{ r.text }}</p>
              <div v-if="r.images && r.images.length > 0" class="ap-rev-imgs">
                <img v-for="(src, i) in r.images" :key="i" :src="src" alt="">
              </div>
            </div>
            <div v-if="r.reply" class="ap-msg-reply"><i>我的回复 · {{ agoText(r.reply.date) }}</i><p>{{ r.reply.text }}</p></div>
            <div v-else-if="rvReplyId === r.id" class="ap-msg-replyform">
              <input :value="rvReplyText" :maxlength="100" placeholder="回复该用户的评价" @input="onRvReplyText(($event.target as HTMLInputElement).value)">
              <div>
                <button type="button" @click="onRvReplyId(null)">取消</button>
                <button type="button" class="on" @click="onReplyReview(r.id)">回复</button>
              </div>
            </div>
            <div v-else class="ap-msg-foot">
              <button type="button" class="ap-link" @click="onRvReplyId(r.id); onRvReplyText('')">回复</button>
            </div>
          </div>
          <div class="ap-msg-note">应用级反馈建议渠道（用户直接向开发者反馈）规划中，后续将在此汇聚展示</div>
        </template>
        <template v-else>
          <div v-if="shownFb.length === 0" class="ap-empty">该类型下暂无反馈</div>
          <div
            v-for="f in shownFb"
            :key="f.id"
            class="ap-msg-item"
            :class="f.read === false ? ' unread' : ''"
            @click="onMarkFbRead(f.id)"
          >
            <div class="ap-msg-top">
              <b>
                <i v-if="f.read === false" class="ap-msg-dot" />
                {{ f.type }}
                <em class="ap-msg-st" :class="f.msgs[f.msgs.length - 1].role === 'user' ? 'pending' : 'done'">{{ f.msgs[f.msgs.length - 1].role === 'user' ? '待回复' : '已回复' }}</em>
              </b>
              <span class="ap-msg-top-act">
                <i>{{ f.at }}</i>
                <button type="button" class="ap-link" @click="onMarkFbRead(f.id); onGotoFb(f.id)">查看反馈</button>
              </span>
            </div>
            <div class="ap-msg-thread">
              <div v-for="m in f.msgs" :key="m.id" class="ap-msg-m" :class="m.role">
                <i>{{ m.by }} · {{ m.at }}</i>
                <p>{{ m.content }}</p>
              </div>
            </div>
            <div v-if="fbReplyId === f.id" class="ap-msg-replyform">
              <input :value="fbReplyText" :maxlength="200" placeholder="以应用市场管理员身份回复" @input="onFbReplyText(($event.target as HTMLInputElement).value)">
              <div>
                <button type="button" @click="onFbReplyId(null)">取消</button>
                <button type="button" class="on" @click="onReplyFb(f.id)">回复</button>
              </div>
            </div>
            <div v-else class="ap-msg-foot">
              <button type="button" class="ap-link" @click="onFbReplyId(f.id); onFbReplyText('')">回复</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
