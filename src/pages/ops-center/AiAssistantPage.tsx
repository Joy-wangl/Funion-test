/** AI助手页 */
export default function AiAssistantPage() {
  return (
    <div className="ai-page">
      <div className="ai-layout">
        <aside className="ai-side">
          <div className="ai-side-title">你的私人助理</div>

          <div className="ai-menu">
            <div className="ai-menu-item active">
              <span className="ai-menu-ico">⊕</span>
              <span>新会话</span>
            </div>
            <div className="ai-menu-item">
              <span className="ai-menu-ico">▦</span>
              <span>资源广场</span>
            </div>
            <div className="ai-menu-item">
              <span className="ai-menu-ico">▤</span>
              <span>数据分析</span>
            </div>
            <div className="ai-menu-item">
              <span className="ai-menu-ico">⚙</span>
              <span>配置管理</span>
            </div>
          </div>

          <div className="ai-session-head">
            <span>会话</span>
            <span>⌄</span>
          </div>
          <div className="ai-session-item">
            <span className="ai-menu-ico">💬</span>
            <span>新会话</span>
          </div>
        </aside>

        <div className="ai-main">
          <div className="ai-topline"></div>

          <div className="ai-center">
            <h2>我能帮你做些什么呢？</h2>
            <p>请描述你的问题或想法</p>
          </div>

          <div className="ai-composer-wrap">
            <div className="ai-composer">
              <textarea className="ai-textarea" placeholder="输入你的问题或描述你想要解决的事情"></textarea>
              <div className="ai-compose-bar">
                <div className="ai-tools">
                  <button className="ai-tool-btn">🔗</button>
                  <button className="ai-tool-btn">🖼</button>
                  <button className="ai-tool-btn">⚡</button>
                  <button className="ai-tool-btn red">⌘ 选择模型</button>
                </div>
                <button className="ai-send">➤</button>
              </div>
            </div>
            <div className="ai-suggest">
              <div className="ai-chip">👤 电商数据分析专家</div>
              <div className="ai-chip">👤 电商店群生成助手</div>
              <div className="ai-chip">👤 淘宝秒杀标题生成助手</div>
              <div className="ai-chip">更多 ▾</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
