<script setup lang="ts">
/** AI助手页 */
</script>

<template>
  <div class="ai-page">
    <div class="ai-layout">
      <aside class="ai-side">
        <div class="ai-side-title">你的私人助理</div>

        <div class="ai-menu">
          <div class="ai-menu-item active">
            <span class="ai-menu-ico">⊕</span>
            <span>新会话</span>
          </div>
          <div class="ai-menu-item">
            <span class="ai-menu-ico">▦</span>
            <span>资源广场</span>
          </div>
          <div class="ai-menu-item">
            <span class="ai-menu-ico">▤</span>
            <span>数据分析</span>
          </div>
          <div class="ai-menu-item">
            <span class="ai-menu-ico">⚙</span>
            <span>配置管理</span>
          </div>
        </div>

        <div class="ai-session-head">
          <span>会话</span>
          <span>⌄</span>
        </div>
        <div class="ai-session-item">
          <span class="ai-menu-ico">💬</span>
          <span>新会话</span>
        </div>
      </aside>

      <div class="ai-main">
        <div class="ai-topline" />

        <div class="ai-center">
          <h2>我能帮你做些什么呢？</h2>
          <p>请描述你的问题或想法</p>
        </div>

        <div class="ai-composer-wrap">
          <div class="ai-composer">
            <textarea class="ai-textarea" placeholder="输入你的问题或描述你想要解决的事情" />
            <div class="ai-compose-bar">
              <div class="ai-tools">
                <button class="ai-tool-btn">🔗</button>
                <button class="ai-tool-btn">🖼</button>
                <button class="ai-tool-btn">⚡</button>
                <button class="ai-tool-btn red">⌘ 选择模型</button>
              </div>
              <button class="ai-send">➤</button>
            </div>
          </div>
          <div class="ai-suggest">
            <div class="ai-chip">👤 电商数据分析专家</div>
            <div class="ai-chip">👤 电商店群生成助手</div>
            <div class="ai-chip">👤 淘宝秒杀标题生成助手</div>
            <div class="ai-chip">更多 ▾</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
