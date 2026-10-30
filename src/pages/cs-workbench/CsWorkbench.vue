<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import './CsWorkbench.css';
import CsWorkBoard from './CsWorkBoard.vue';

/* ============ 静态还原：客服聚合聊天工作台（新项目占位页，纯展示无业务逻辑） ============ */

/* 看板「发送到当前会话」回投聊天区：卖家侧媒体消息追加在静态会话流后并滚到底 */
const sentMedia = ref<{ kind: 'img' | 'video'; src: string; label: string; time: string }[]>([]);
const msgsEl = ref<HTMLElement | null>(null);
const onSendMedia = (m: { kind: 'img' | 'video'; src: string; label: string }) => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  sentMedia.value.push({ ...m, time: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` });
  nextTick(() => {
    const el = msgsEl.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
};

const metrics = [
  { v: '0.00', k: '今日结算' },
  { v: '26', k: '今日接待' },
  { v: '0.00%', k: '3min回率' },
  { v: '0', k: '回复均响' },
  { v: '0', k: '成交订单' },
  { v: '0%', k: '转化率' },
  { v: '0%', k: '30s应答率' },
  { v: '0', k: '智能回复' },
];

/* 左侧图标栏：上半业务入口，下半系统项 */
const railTop = [
  { k: 'chat', t: '会话', badge: 1, on: true },
  { k: 'feige', t: '飞鸽' },
  { k: 'video', t: '视频号' },
  { k: 'tao', t: '淘工厂' },
  { k: 'history', t: '历史' },
  { k: 'star', t: '收藏' },
  { k: 'msg', t: '留言' },
  { k: 'order', t: '工单' },
  { k: 'after', t: '售后' },
  { k: 'addlog', t: '补登' },
];

/* 会话绑定：平台/监控店铺/知识库商品/SKU——切换会话后右看板（商品知识/标记会话/优化提示）内容随之切换；
   skuName＝当前会话关联 SKU 规格名（商品知识 ID 维度导轨挂「会话」角标）；
   optKind＝该会话在途优化任务类型：shop 店铺优化 / exp 体验分优化（优化提示页签按类型换展示样式） */
interface CsSessionSeed {
  id: number; name: string; code: string; stage: string; overdue?: string; unread?: number;
  time: string; preview: string; plat: string; shopId: string; productId: string; skuName: string;
  optKind: 'shop' | 'exp';
  /* 订单商品清单（商品粒度＝商品ID）：一单可含多个商品，首位＝本会话正在咨询的商品；缺省视为单商品订单 */
  orderItemIds?: string[];
}
const sessions: CsSessionSeed[] = [
  { id: 1, name: '人***', code: '5996', stage: '售中', overdue: '已超时 47 分钟', unread: 1, time: '读秒', preview: '质量问题包路费呢亲', plat: '拼多多', shopId: 'PDD-6033', productId: 'K001', skuName: '32码', optKind: 'shop', orderItemIds: ['7261558803412', '7261558803458', '4410276650033'] },
  { id: 2, name: '蔡*喵', code: '4069', stage: '售中', time: '07:41', preview: '好的，谢谢', plat: '淘宝', shopId: 'TB-2063', productId: 'K002', skuName: '31码', optKind: 'shop' },
  { id: 3, name: '红**动', code: '4387', stage: '售中', time: '07:38', preview: '[图片]', plat: '抖音', shopId: 'DY-3039', productId: 'K003', skuName: '40码', optKind: 'exp' },
  { id: 4, name: '吃*C', code: '4072', stage: '售中', time: '07:30', preview: '什么时候发货呀', plat: '快手', shopId: 'KS-5036', productId: 'K004', skuName: '两支礼盒装', optKind: 'shop', orderItemIds: ['4410276650033', '3398745512076'] },
  { id: 5, name: '刘***', code: '13882', stage: '售前', time: '07:21', preview: '退款成功通知', plat: '淘宝', shopId: 'TB-2088', productId: 'K005', skuName: '单支装', optKind: 'shop' },
  { id: 6, name: '雪***', code: '8464', stage: '售前', time: '07:15', preview: '收货地址修改成功', plat: '视频号', shopId: 'SP-4033', productId: 'K006', skuName: '42码', optKind: 'exp' },
  { id: 7, name: '******', code: '4070', stage: '售中', time: '昨天', preview: '质量问题包路费呢亲', plat: '拼多多', shopId: 'PDD-6012', productId: 'K001', skuName: '33码', optKind: 'exp' },
  { id: 8, name: '桃**主', code: '4086', stage: '售前', time: '昨天', preview: '动作', plat: '抖音', shopId: 'DY-3012', productId: 'K002', skuName: '30码', optKind: 'exp' },
  { id: 9, name: '小**呀', code: '8512', stage: '售前', time: '昨天', preview: '上架要白底图，能发我一张吗', plat: '视频号', shopId: 'SP-4033', productId: 'K002', skuName: '30码', optKind: 'shop' },
  { id: 10, name: '阿**7', code: '4127', stage: '售中', time: '昨天', preview: '轮播图首图必须白底吗', plat: '拼多多', shopId: 'PDD-6012', productId: 'K004', skuName: '单支装', optKind: 'exp' },
  { id: 11, name: '奶**盖', code: '13905', stage: '售中', time: '前天', preview: '详情页图片直接发我一份', plat: '抖音', shopId: 'DY-3039', productId: 'K005', skuName: '两支装', optKind: 'shop' },
  { id: 12, name: '青***', code: '4102', stage: '售前', time: '前天', preview: '有透明底图吗，要做主图', plat: '淘宝', shopId: 'TB-2063', productId: 'K006', skuName: '41码', optKind: 'exp' },
];
const activeSessionId = ref(1);
const activeSession = computed(() => sessions.find((s) => s.id === activeSessionId.value) ?? sessions[0]);
const pickSession = (id: number) => { activeSessionId.value = id; };

const quickPhrases = ['您好，很高兴为您服务', '请稍等，马上为您处理', '亲亲，感谢您的支持', '已为您反馈，请留意通知'];

const orderSubs = ['全部(1)', '未完成(0)', '待发货(0)', '待签收(1)', '已签收(0)', '退款中(0)'];
</script>

<template>
  <div class="csw-root">
    <!-- ============ 工作台顶栏：客服信息 + 实时指标条 ============ -->
    <div class="csw-topbar">
      <div class="csw-agent">
        <span class="csw-avatar">周</span>
        <div class="csw-agent-info">
          <b>周丽萍（予都售后）</b>
          <span>客服编号: 16Y909</span>
        </div>
        <span class="csw-online">在线</span>
        <span class="csw-online-num">在线人数: 12</span>
      </div>
      <div class="csw-metrics">
        <div v-for="m in metrics" :key="m.k" class="csw-metric">
          <b>{{ m.v }}</b>
          <span>{{ m.k }}</span>
        </div>
        <div class="csw-metric csw-sys">
          <b>0.5GB</b>
          <span>8核·8G·93%</span>
        </div>
      </div>
    </div>

    <!-- ============ 主体：图标栏 + 会话列表 + 聊天区 + 右侧订单面板 ============ -->
    <div class="csw-body">
      <!-- 左侧图标栏 -->
      <nav class="csw-rail">
        <button v-for="r in railTop" :key="r.k" type="button" class="csw-rail-item" :class="{ on: r.on }">
          <span class="csw-rail-ico">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <template v-if="r.k === 'chat'"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" /></template>
              <template v-else-if="r.k === 'feige'"><path d="M12 3l8 6-8 6-8-6 8-6z" /><path d="M4 15l8 6 8-6" /></template>
              <template v-else-if="r.k === 'video'"><rect x="3" y="5" width="14" height="14" rx="2" /><path d="M17 10l4-3v10l-4-3" /></template>
              <template v-else-if="r.k === 'tao'"><path d="M3 9h18l-2 11H5L3 9z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></template>
              <template v-else-if="r.k === 'history'"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></template>
              <template v-else-if="r.k === 'star'"><path d="M12 3l2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9L12 3z" /></template>
              <template v-else-if="r.k === 'msg'"><path d="M4 5h16v10H8l-4 4V5z" /></template>
              <template v-else-if="r.k === 'order'"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></template>
              <template v-else-if="r.k === 'after'"><path d="M12 3l9 4v6c0 4-3.5 7-9 8-5.5-1-9-4-9-8V7l9-4z" /></template>
              <template v-else><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></template>
            </svg>
            <i v-if="r.badge" class="csw-rail-badge">{{ r.badge }}</i>
          </span>
          <span class="csw-rail-t">{{ r.t }}</span>
        </button>
        <div class="csw-rail-spacer" />
        <button type="button" class="csw-rail-item">
          <span class="csw-rail-ico">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-2.3-5.6" /><path d="M20 4v4h-4" /></svg>
          </span>
          <span class="csw-rail-t">刷新</span>
          <span class="csw-rail-clock">07:52:41</span>
        </button>
        <button type="button" class="csw-rail-item">
          <span class="csw-rail-ico">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" /></svg>
          </span>
          <span class="csw-rail-t">我的</span>
        </button>
        <button type="button" class="csw-rail-item">
          <span class="csw-rail-ico">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.8-1.6L13.2 2h-2.4l-.5 2.9A7 7 0 0 0 7.5 6.5l-2.3-1-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .6.1 1.1.2 1.6l-2 1.5 2 3.4 2.3-1c.8.7 1.8 1.2 2.8 1.6l.5 2.9h2.4l.5-2.9c1-.3 2-.9 2.8-1.6l2.3 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.6z" /></svg>
          </span>
          <span class="csw-rail-t">设置</span>
        </button>
      </nav>

      <!-- 客服看板：固定左侧纵向面板（悬浮球展开）——优化提示/商品知识/标记会话 三模块纵向叠放 -->
      <CsWorkBoard :session="activeSession" @send-media="onSendMedia" />

      <!-- 会话列表 -->
      <section class="csw-sessions">
        <div class="csw-sess-head">
          <div class="csw-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input type="text" placeholder="搜索">
          </div>
          <div class="csw-sess-head-row">
            <span class="csw-sess-all">全部会话</span>
            <span class="csw-sess-act">动作</span>
            <button type="button" class="csw-sess-add" title="发起会话">＋</button>
          </div>
          <div class="csw-sess-pick">
            <b>会话选择</b>
            <span class="csw-sess-note">已回复会话不会批量回复</span>
          </div>
        </div>
        <div class="csw-sess-list">
          <div v-for="s in sessions" :key="s.id" class="csw-sess-card" :class="{ on: s.id === activeSessionId }" @click="pickSession(s.id)">
            <span class="csw-sess-ava">{{ s.name.charAt(0) }}</span>
            <div class="csw-sess-main">
              <div class="csw-sess-row1">
                <b class="csw-sess-name">{{ s.name }}</b>
                <span class="csw-sess-code">{{ s.code }}</span>
                <span class="csw-sess-stage">{{ s.stage }}</span>
                <span class="csw-sess-time">{{ s.time }}</span>
              </div>
              <div class="csw-sess-row2">
                <span v-if="s.overdue" class="csw-sess-overdue">{{ s.overdue }}</span>
                <span class="csw-sess-preview">{{ s.preview }}</span>
                <i v-if="s.unread" class="csw-sess-unread">{{ s.unread }}</i>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 聊天区 -->
      <section class="csw-chat">
        <div class="csw-chat-head">
          <span class="csw-chat-buyer">人*************0</span>
          <span class="csw-plat-chip">拼多多</span>
          <span class="csw-chat-code">5996</span>
          <span class="csw-chat-shop">下雨天的小卖部</span>
          <span class="csw-chat-orders">下单数(1)</span>
          <div class="csw-ai-toggle">
            <span class="on">AI开启</span>
            <span>AI关闭</span>
          </div>
          <div class="csw-chat-icos">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l9 4v6c0 4-3.5 7-9 8-5.5-1-9-4-9-8V7l9-4z" /></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
          </div>
        </div>

        <div ref="msgsEl" class="csw-msgs">
          <div class="csw-msg-time">07:12:37</div>
          <div class="csw-msg buyer">
            <span class="csw-msg-ava">买</span>
            <div class="csw-msg-body">
              <div class="csw-msg-bubble img">
                <span class="csw-img-ph">图片</span>
              </div>
            </div>
          </div>
          <div class="csw-msg buyer">
            <span class="csw-msg-ava">买</span>
            <div class="csw-msg-body">
              <div class="csw-msg-bubble">质量问题包路费呢亲</div>
            </div>
          </div>
          <div class="csw-msg seller">
            <div class="csw-msg-body">
              <div class="csw-msg-bubble green">亲亲，麻烦您稍微等待一下哈，这边马上查看一下情况哈</div>
              <div class="csw-msg-meta"><span class="csw-intent">意图回复</span> 07:12:50 · 已读</div>
            </div>
            <span class="csw-msg-ava">周</span>
          </div>
          <!-- 看板「发送到当前会话」回投的卖家媒体消息：图/视频缩略气泡＋标签时间行 -->
          <div v-for="(m, i) in sentMedia" :key="`sent-${i}`" class="csw-msg seller">
            <div class="csw-msg-body">
              <div class="csw-msg-bubble img">
                <img :src="m.src" alt="">
                <i v-if="m.kind === 'video'" class="csw-msg-play">▶</i>
              </div>
              <div class="csw-msg-meta">{{ m.label }} · {{ m.time }} · 已读</div>
            </div>
            <span class="csw-msg-ava">周</span>
          </div>
          <div class="csw-ai-card">
            <div class="csw-ai-card-head">
              <span class="csw-ai-tag">AI助手</span>
              <a class="csw-ai-link">意图设置转人工</a>
            </div>
            <div class="csw-ai-thinking">AI正在思考…</div>
          </div>
        </div>

        <div class="csw-quick">
          <span v-for="q in quickPhrases" :key="q" class="csw-quick-chip">{{ q }}</span>
        </div>
        <div class="csw-toolbar">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9" /><path d="M8.5 14s1.3 1.5 3.5 1.5S15.5 14 15.5 14" /><circle cx="9" cy="10" r="0.6" fill="currentColor" /><circle cx="15" cy="10" r="0.6" fill="currentColor" /></svg>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="M21 16l-5-4-8 7" /></svg>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" /></svg>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-5z" /></svg>
          <span class="csw-toolbar-links">
            <a>邀请下单</a><a>小额打款</a><a>小额收款</a><a>邀请开票</a>
          </span>
        </div>
        <div class="csw-input">
          <textarea placeholder="输入回复消息…"></textarea>
          <button type="button" class="csw-send">发送</button>
        </div>

        <!-- 待回复会话浮窗 -->
        <div class="csw-pending-pop">
          <div class="csw-pending-head">
            <b>待回复会话 <i>1</i></b>
            <span class="csw-pending-up">↑</span>
            <button type="button" class="csw-pending-x">×</button>
          </div>
          <div class="csw-pending-row">
            <span class="csw-sess-ava">人</span>
            <div class="csw-pending-info">
              <b>人*** · 5996</b>
              <span>质量问题包路费呢亲</span>
            </div>
            <span class="csw-sess-overdue">已超时 47 分钟</span>
          </div>
        </div>
      </section>

      <!-- 右侧订单面板 -->
      <aside class="csw-side">
        <div class="csw-side-tabs">
          <span>商品推荐</span>
          <span class="on">个人订单</span>
          <span>店铺订单</span>
        </div>
        <div class="csw-side-subs">
          <span v-for="(t, i) in orderSubs" :key="t" :class="{ on: i === 0 }">{{ t }}</span>
        </div>
        <div class="csw-side-notice">当前仅展示近90天的订单，更多订单请到订单管理查询</div>
        <div class="csw-order">
          <div class="csw-order-status">已发货，待签收</div>
          <div class="csw-order-row"><span class="k">订单编号</span><span class="v">261015-319511611002569</span><a class="csw-copy">复制</a></div>
          <div class="csw-order-row"><span class="k">下单时间</span><span class="v">2026-10-15 19:46:12</span></div>
          <div class="csw-order-row"><span class="k">售后状态</span><span class="v">-</span></div>
          <div class="csw-order-row"><span class="k">退换货包运费</span><span class="v">未赠送</span></div>
          <div class="csw-goods">
            <span class="csw-goods-img">图</span>
            <div class="csw-goods-info">
              <b>加厚手提式垃圾袋家用实惠装</b>
              <span>规格: 5卷装 ×1</span>
            </div>
            <span class="csw-goods-price">¥37.00</span>
          </div>
          <div class="csw-order-row"><span class="k">店铺优惠抵扣</span><span class="v minus">-¥10.00</span></div>
          <div class="csw-order-row"><span class="k">实收</span><span class="v strong">¥27.00</span></div>
          <div class="csw-order-remark">
            <span class="k">备注信息</span>
            <span class="csw-remark-tag">蓝色</span>
            <span class="v">补发(2650450863)#</span>
            <a class="csw-copy">复制</a>
          </div>
          <div class="csw-logi">
            <div class="csw-logi-head">
              <b>物流信息</b>
              <span class="csw-logi-fold">∨</span>
            </div>
            <div class="csw-logi-row"><span class="v">极兔速递 JT5536570565691</span><a class="csw-send-link">一键发送</a></div>
            <div class="csw-logi-row"><span class="v">快递员手机号 13798678201</span><a class="csw-send-link">一键发送</a></div>
            <a class="csw-logi-more">查看更多</a>
            <div class="csw-logi-track">【揭阳市】快件已到达揭阳普宁池尾市场八服务点，正在派送途中</div>
            <div class="csw-logi-time">2026-10-19 17:22:10</div>
          </div>
        </div>
        <div class="csw-side-foot">
          <button type="button">地址</button>
          <button type="button">修改备注</button>
          <button type="button">一键拦截</button>
          <button type="button">一键反馈</button>
          <button type="button">小额打款</button>
        </div>
      </aside>
    </div>

    <!-- 录屏指示 -->
    <span class="csw-rec">REC</span>
  </div>
</template>
