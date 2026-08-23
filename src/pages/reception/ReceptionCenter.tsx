/* =========================================================
   聚合接待（宝妈接待）· 模块外壳
   左侧菜单 + 两个视图：
   ① 宝妈接待表格页（基础数据 › 客服管理）
   ② 智能分流策略页（分流设置 › 智能分流）
   ========================================================= */
import { useState } from 'react';
import AgentTable from './AgentTable';
import StrategyBoard from './StrategyBoard';
import LiveReception from './LiveReception';
import { RC_AGENTS, type RcAgent } from './data';
import { ToastWrap, useToasts } from '../permission/shared';
import '../quality/style.css';
import './rc.css';

type View = 'table' | 'strategy' | 'live';

/** 左侧一级菜单（未开放模块点击 toast 文案口径与线上一致） */
const SIDE_TOP = ['概况', '基础数据', '智能回复'];
const SIDE_BOTTOM = ['监控中心', '平台数据', '记录查询', '远程登录器', '系统配置', '绩效相关统计'];
const JUHE_CHILDREN = ['绩效统计', '接待排名', '实时客服接待', '店铺分流统计'];

export default function ReceptionCenter({ sidebarCollapsed }: { sidebarCollapsed: boolean }) {
  const [view, setView] = useState<View>('table');
  const [sideOpen] = useState(!sidebarCollapsed);
  const [groupsOpen, setGroupsOpen] = useState<Record<string, boolean>>({ 聚合接待: true, 分流设置: false });
  const [agents, setAgents] = useState<RcAgent[]>(RC_AGENTS);
  /** 表格页关联策略跳转：打开对应策略卡抽屉 */
  const [jump, setJump] = useState<{ id: number | null; seq: number }>({ id: null, seq: 0 });
  const { toasts, pushToast } = useToasts();

  const goStrategy = (cardId: number) => {
    setJump((j) => ({ id: cardId, seq: j.seq + 1 }));
    setGroupsOpen((v) => ({ ...v, 分流设置: true }));
    setView('strategy');
  };

  const toggleAgentStrategy = (id: number) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    const next = !agent.strategy;
    setAgents((v) => v.map((a) => (a.id === id ? { ...a, strategy: next } : a)));
    pushToast(`已${next ? '启用' : '禁用'}「${agent.name}」的策略，组内客服已同步`);
  };

  return (
    <div className="pm-page qc-page rc-page">
      {/* ---------- 左侧菜单 ---------- */}
      <aside className={`qc-side rc-side ${sideOpen ? '' : 'collapsed'}`}>
        <div className="rc-side-brand">
          <span className="rc-logo">聚</span>
          <b>聚合接待</b>
        </div>
        <div className="rc-menu">
          {SIDE_TOP.map((m) => (
            <div key={m} className="rc-menu-item" onClick={() => pushToast(`演示原型：「${m}」模块暂未开放`)}>
              <span className="rc-menu-ico">▦</span>
              <span className="rc-menu-text">{m}</span>
            </div>
          ))}

          {/* 聚合接待（默认展开） */}
          <div
            className="rc-menu-item grp"
            onClick={() => setGroupsOpen((v) => ({ ...v, 聚合接待: !v['聚合接待'] }))}
          >
            <span className="rc-menu-ico">◈</span>
            <span className="rc-menu-text">聚合接待</span>
            <span className={`rc-menu-arrow ${groupsOpen['聚合接待'] ? 'open' : ''}`}>∨</span>
          </div>
          {groupsOpen['聚合接待'] ? (
            <>
              {JUHE_CHILDREN.map((m) =>
                m === '实时客服接待' ? (
                  <div
                    key={m}
                    className={`rc-menu-item child ${view === 'live' ? 'active' : ''}`}
                    onClick={() => setView('live')}
                  >
                    <span className="rc-menu-text">{m}</span>
                  </div>
                ) : (
                  <div key={m} className="rc-menu-item child" onClick={() => pushToast(`演示原型：「${m}」页面暂未开放`)}>
                    <span className="rc-menu-text">{m}</span>
                  </div>
                ),
              )}
              <div
                className={`rc-menu-item child ${view === 'table' ? 'active' : ''}`}
                onClick={() => setView('table')}
              >
                <span className="rc-menu-text">宝妈接待</span>
              </div>
            </>
          ) : null}

          {/* 分流设置（默认收起） */}
          <div
            className="rc-menu-item grp"
            onClick={() => setGroupsOpen((v) => ({ ...v, 分流设置: !v['分流设置'] }))}
          >
            <span className="rc-menu-ico">⇄</span>
            <span className="rc-menu-text">分流设置</span>
            <span className={`rc-menu-arrow ${groupsOpen['分流设置'] ? 'open' : ''}`}>∨</span>
          </div>
          {groupsOpen['分流设置'] ? (
            <div
              className={`rc-menu-item child ${view === 'strategy' ? 'active' : ''}`}
              onClick={() => { setJump({ id: null, seq: 0 }); setView('strategy'); }}
            >
              <span className="rc-menu-text">智能分流</span>
            </div>
          ) : null}

          {SIDE_BOTTOM.map((m) => (
            <div key={m} className="rc-menu-item" onClick={() => pushToast(`演示原型：「${m}」模块暂未开放`)}>
              <span className="rc-menu-ico">▦</span>
              <span className="rc-menu-text">{m}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ---------- 主区 ---------- */}
      <div className="qc-main rc-main">
        {view === 'table' ? (
          <AgentTable
            agents={agents}
            setAgents={setAgents}
            toggleAgentStrategy={toggleAgentStrategy}
            pushToast={pushToast}
            onGoStrategy={goStrategy}
          />
        ) : view === 'strategy' ? (
          <StrategyBoard pushToast={pushToast} openGroupId={jump.id} jumpSeq={jump.seq} />
        ) : (
          <LiveReception />
        )}
      </div>

      <ToastWrap toasts={toasts} />
    </div>
  );
}
