/* 独立展示页入口：仅渲染品控中心完整功能（数据概览 + 监控列表），不含同级顶部 tab */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/index.css';
import './share.css';
import QualityCenter from '../src/pages/quality/QualityCenter';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QualityCenter sidebarCollapsed={false} />
  </StrictMode>,
);
