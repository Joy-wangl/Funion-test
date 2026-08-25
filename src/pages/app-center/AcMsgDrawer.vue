<script setup lang="ts">
/* 消息中心抽屉：身份/维度/已读未读（1:1 移植自 AppCenter.tsx 的 msgOpen 分支） */
import { computed } from 'vue';
import { FB_TYPES, APP_FB_TYPES, type AppItem, type AppFeedback, type AppReview, type FeedbackItem } from './data';
import { IC, agoText } from './acHelpers';
import AcSvg from './AcSvg.vue';
import AcLogo from './AcLogo.vue';

const props = defineProps<{
  apps: AppItem[];
  /** 我的应用（mine）关联的评价 */
  myReviews: AppReview[];
  /** 我的应用（mine）关联的应用级意见反馈 */
  appFbList: AppFeedback[];
  fbList: FeedbackItem[];
  msgTab: 'app' | 'sys';
  /** 使用者反馈子模块：应用评价 / 意见反馈 */
  msgSubTab: 'review' | 'feedback';
  msgAppFilter: string;
  msgFbType: string;
  /** 意见反馈类型筛选（APP_FB_TYPES + all） */
  msgAfType: string;
  msgStatus: 'all' | 'pending' | 'done';
  rvReplyId: string | null;
  rvReplyText: string;
  afReplyId: string | null;
  afReplyText: string;
  afReplyImages: string[];
  fbReplyId: string | null;
  fbReplyText: string;
  onClose: () => void;
  onMarkAllRead: () => void;
  onMsgTab: (t: 'app' | 'sys') => void;
  onMsgSubTab: (t: 'review' | 'feedback') => void;
  onMsgAppFilter: (id: string) => void;
  onMsgFbType: (t: string) => void;
  onMsgAfType: (t: string) => void;
  onMsgStatus: (s: 'all' | 'pending' | 'done') => void;
  onMarkRevRead: (id: string) => void;
  onMarkAfRead: (id: string) => void;
  onMarkFbRead: (id: string) => void;
  onGotoApp: (appId: string) => void;
  onGotoFb: (fbId: string) => void;
  onRvReplyId: (id: string | null) => void;
  onRvReplyText: (v: string) => void;
  onReplyReview: (id: string) => void;
  onAfReplyId: (id: string | null) => void;
  onAfReplyText: (v: string) => void;
  onAfReplyImages: (imgs: string[]) => void;
  onReplyAppFb: (id: string) => void;
  onFbReplyId: (id: string | null) => void;
  onFbReplyText: (v: string) => void;
  onReplyFb: (id: string) => void;
}>();

const unreadReviewCount = computed(() => props.myReviews.filter((r) => r.read === false).length);
const unreadAppFbCount = computed(() => props.appFbList.filter((f) => f.read === false).length);
const unreadUserCount = computed(() => unreadReviewCount.value + unreadAppFbCount.value);
const unreadFbCount = computed(() => props.fbList.filter((f) => f.read === false).length);
/* 左栏应用随子模块切换：评价维度 / 反馈维度；当前筛选应用无数据时也保留入口（展示空态） */
const railApps = computed(() => {
  const list = props.apps.filter((a) => a.mine && (props.msgSubTab === 'review'
    ? props.myReviews.some((r) => r.appId === a.id)
    : props.appFbList.some((f) => f.appId === a.id)));
  if (props.msgAppFilter !== 'all' && !list.some((a) => a.id === props.msgAppFilter)) {
    const cur = props.apps.find((a) => a.id === props.msgAppFilter);
    if (cur) list.unshift(cur);
  }
  return list;
});
const railUnreadOf = (appId: string) => (props.msgSubTab === 'review'
  ? props.myReviews.filter((r) => r.appId === appId && r.read === false).length
  : props.appFbList.filter((f) => f.appId === appId && f.read === false).length);
const shownReviews = computed(() => (props.msgAppFilter === 'all' ? props.myReviews : props.myReviews.filter((r) => r.appId === props.msgAppFilter))
  .filter((r) => props.msgStatus === 'all' || (props.msgStatus === 'pending' ? !r.reply : !!r.reply)));
const shownAppFbs = computed(() => (props.msgAppFilter === 'all' ? props.appFbList : props.appFbList.filter((f) => f.appId === props.msgAppFilter))
  .filter((f) => props.msgAfType === 'all' || f.type === props.msgAfType)
  .filter((f) => props.msgStatus === 'all' || (props.msgStatus === 'pending' ? !f.reply : !!f.reply)));
const shownFb = computed(() => (props.msgFbType === 'all' ? props.fbList : props.fbList.filter((f) => f.type === props.msgFbType))
  .filter((f) => props.msgStatus === 'all' || (props.msgStatus === 'pending' ? f.msgs[f.msgs.length - 1].role === 'user' : f.msgs[f.msgs.length - 1].role === 'admin')));

/* 意见反馈回复配图：最多 3 张，与反馈提交同构 */
const onPickAfReplyImages = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).slice(0, 3 - props.afReplyImages.length);
  files.forEach((f) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (props.afReplyImages.length >= 3) return;
      props.onAfReplyImages([...props.afReplyImages, String(reader.result)]);
    };
    reader.readAsDataURL(f);
  });
  input.value = '';
};
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
        使用者反馈<i v-if="unreadUserCount > 0">{{ unreadUserCount }}</i>
      </button>
    </div>
    <div v-if="msgTab === 'app'" class="ap-msg-subtabs">
      <button type="button" :class="msgSubTab === 'review' ? 'on' : ''" @click="onMsgSubTab('review')">
        应用评价<em class="ap-vis pub">公开</em><i v-if="unreadReviewCount > 0">{{ unreadReviewCount }}</i>
      </button>
      <button type="button" :class="msgSubTab === 'feedback' ? 'on' : ''" @click="onMsgSubTab('feedback')">
        意见反馈<em class="ap-vis priv">隐私</em><i v-if="unreadAppFbCount > 0">{{ unreadAppFbCount }}</i>
      </button>
    </div>
    <div class="ap-msg-pane">
      <div class="ap-msg-rail">
        <template v-if="msgTab === 'app'">
          <button type="button" :class="msgAppFilter === 'all' ? 'on' : ''" @click="onMsgAppFilter('all')">
            <span class="ap-rail-name">全部应用</span>
            <i v-if="(msgSubTab === 'review' ? unreadReviewCount : unreadAppFbCount) > 0" class="ap-rail-unread">{{ msgSubTab === 'review' ? unreadReviewCount : unreadAppFbCount }}</i>
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
            <i v-if="railUnreadOf(a.id) > 0" class="ap-rail-unread">{{ railUnreadOf(a.id) }}</i>
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
          <div v-if="msgTab === 'app' && msgSubTab === 'feedback'" class="ap-fb-types ap-msg-af-types">
            <button type="button" :class="msgAfType === 'all' ? 'on' : ''" @click="onMsgAfType('all')">全部</button>
            <button v-for="t in APP_FB_TYPES" :key="t" type="button" :class="msgAfType === t ? 'on' : ''" @click="onMsgAfType(t)">{{ t }}</button>
          </div>
        </div>
        <template v-if="msgTab === 'app' && msgSubTab === 'review'">
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
                <em class="ap-vis pub">公开</em>
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
        </template>
        <template v-else-if="msgTab === 'app'">
          <div v-if="shownAppFbs.length === 0" class="ap-empty">该应用下暂无用户意见反馈</div>
          <div
            v-for="f in shownAppFbs"
            :key="f.id"
            class="ap-msg-item"
            :class="f.read === false ? ' unread' : ''"
            @click="onMarkAfRead(f.id)"
          >
            <div class="ap-msg-top">
              <b>
                <i v-if="f.read === false" class="ap-msg-dot" />
                {{ apps.find((a) => a.id === f.appId)?.name ?? f.appId }}
                <em class="ap-msg-st" :class="f.reply ? 'done' : 'pending'">{{ f.reply ? '已回复' : '待回复' }}</em>
                <em class="ap-vis priv">隐私</em>
              </b>
              <span class="ap-msg-top-act">
                <i>{{ agoText(f.date) }} · v{{ f.version }}</i>
                <button type="button" class="ap-link" @click="onMarkAfRead(f.id); onGotoApp(f.appId)">查看应用</button>
              </span>
            </div>
            <div class="ap-msg-rev">
              <span>{{ f.user }}<em class="ap-fb-type" :class="f.type === 'BUG反馈' ? 'bug' : f.type === '体验反馈' ? 'ux' : ''">{{ f.type }}</em></span>
              <p>{{ f.content }}</p>
              <div v-if="f.images && f.images.length > 0" class="ap-rev-imgs">
                <img v-for="(src, i) in f.images" :key="i" :src="src" alt="">
              </div>
            </div>
            <div v-if="f.reply" class="ap-msg-reply">
              <i>开发者回复 · {{ agoText(f.reply.date) }}</i>
              <p>{{ f.reply.text }}</p>
              <div v-if="f.reply.images && f.reply.images.length > 0" class="ap-rev-imgs">
                <img v-for="(src, i) in f.reply.images" :key="i" :src="src" alt="">
              </div>
            </div>
            <div v-else-if="afReplyId === f.id" class="ap-msg-replyform col">
              <div class="ap-rf-row">
                <input :value="afReplyText" :maxlength="100" placeholder="回复该用户的意见反馈" @input="onAfReplyText(($event.target as HTMLInputElement).value)">
                <div>
                  <button type="button" @click="onAfReplyId(null)">取消</button>
                  <button type="button" class="on" @click="onReplyAppFb(f.id)">回复</button>
                </div>
              </div>
              <div class="ap-rev-up">
                <span v-for="(src, i) in afReplyImages" :key="i" class="ap-rev-thumb">
                  <img :src="src" alt="">
                  <button type="button" title="移除图片" @click="onAfReplyImages(afReplyImages.filter((_, j) => j !== i))"><AcSvg :d="IC.clear" :size="10" /></button>
                </span>
                <label v-if="afReplyImages.length < 3" class="ap-rev-up-add">
                  <AcSvg :d="IC.plus" :size="14" />
                  <em>添加图片</em>
                  <input type="file" accept="image/*" multiple @change="onPickAfReplyImages">
                </label>
              </div>
            </div>
            <div v-else class="ap-msg-foot">
              <button type="button" class="ap-link" @click="onAfReplyId(f.id); onAfReplyText('')">回复</button>
            </div>
          </div>
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
