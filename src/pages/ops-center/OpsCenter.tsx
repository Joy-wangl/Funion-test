import { useState } from 'react';
import './OpsCenter.css';
import DashboardPage from './DashboardPage';
import InternalPage from './InternalPage';
import MarketPage from './MarketPage';
import SearchPage from './SearchPage';
import OperationManagePage from './OperationManagePage';
import ShopGoodsPage from './ShopGoodsPage';
import CreateProductPage from './CreateProductPage';
import TaskCenterPage from './TaskCenterPage';
import AiAssistantPage from './AiAssistantPage';
import MemberManagement from '../permission/MemberManagement';
import DepartmentManagement from '../permission/DepartmentManagement';
import RolePermission from '../permission/RolePermission';

type PageKey =
  | 'dashboard'
  | 'internal'
  | 'market'
  | 'search'
  | 'operationManage'
  | 'shopGoods'
  | 'createTaobao'
  | 'createVideo'
  | 'taskCenter'
  | 'permMember'
  | 'permDept'
  | 'permRole'
  | 'aiAssistant';

/** 智能运营中心外壳：侧边栏 + 顶栏 + 页面切换（与 preview.html 行为一致） */
export default function OpsCenter() {
  /* 默认展示内部商机（原版末尾 showPage('internal')） */
  const [page, setPage] = useState<PageKey>('internal');
  /* 高亮：顶栏 nav 与子级 subnav 共用，全局唯一 */
  const [active, setActive] = useState<string>('internal');
  /* 三组可展开菜单的展开状态（商机中心默认展开） */
  const [productOpen, setProductOpen] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [permissionOpen, setPermissionOpen] = useState(false);

  /* 切到商品创建子页时自动展开菜单（原版 showCreateTaobao / showCreateVideo） */
  const showCreate = (variant: 'createTaobao' | 'createVideo') => {
    setPage(variant);
    setCreateOpen(true);
  };

  const onSubnav = (key: string, target?: PageKey) => {
    setActive(key);
    if (target) setPage(target);
  };

  const navCls = (key: PageKey) => `nav ${active === key ? 'active' : ''}`;
  const pageCls = (key: PageKey) => `page ${page === key ? 'show' : ''}`;

  return (
    <div className="ops-center app">
      <div className="ops-topbar">
        <div className="ops-brand">
          <img className="ops-brand-logo" src="/logos/ops-logo.png" alt="" />
          <span className="ops-brand-name">智能运营中心</span>
        </div>
        <div className="ops-topbar-right">
          <button className="ops-bell" title="通知">🔔</button>
          <span className="ops-avatar">管</span>
        </div>
      </div>
      <div className="ops-body">
      <aside className="side">
        <div className="side-scroll">
        <div className={navCls('dashboard')} onClick={() => onSubnav('dashboard', 'dashboard')}>
          <span className="nav-ico">▦</span>
          <span className="nav-text">运营驾驶舱</span>
        </div>
        <div className={navCls('operationManage')} onClick={() => onSubnav('operationManage', 'operationManage')}>
          <span className="nav-ico">◫</span>
          <span className="nav-text">运营管理</span>
        </div>
        <div
          className={`nav nav-parent ${productOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setProductOpen((v) => !v);
          }}
        >
          <div className="nav-left">
            <span className="nav-ico">▣</span>
            <span className="nav-text">商机中心</span>
          </div>
          <span className="nav-arrow">▶</span>
        </div>
        <div className={`subnav-wrap ${productOpen ? 'show' : ''}`}>
          <div
            className={`subnav ${active === 'search' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSubnav('search', 'search');
            }}
          >
            全网搜索
          </div>
          <div
            className={`subnav ${active === 'internal' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSubnav('internal', 'internal');
            }}
          >
            内部商机
          </div>
          <div
            className={`subnav ${active === 'market' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onSubnav('market', 'market');
            }}
          >
            市场商机
          </div>
        </div>
        <div className={navCls('shopGoods')} onClick={() => onSubnav('shopGoods', 'shopGoods')}>
          <span className="nav-ico">▥</span>
          <span className="nav-text">店铺商品</span>
        </div>
        <div
          className={`nav nav-parent ${createOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setCreateOpen((v) => !v);
          }}
        >
          <div className="nav-left">
            <span className="nav-ico">✚</span>
            <span className="nav-text">商品创建</span>
          </div>
          <span className="nav-arrow">▶</span>
        </div>
        <div className={`subnav-wrap ${createOpen ? 'show' : ''}`}>
          <div
            className={`subnav ${active === 'createTaobao' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActive('createTaobao');
              showCreate('createTaobao');
            }}
          >
            淘宝
          </div>
          <div
            className={`subnav ${active === 'createVideo' ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setActive('createVideo');
              showCreate('createVideo');
            }}
          >
            视频号
          </div>
        </div>
        <div className={navCls('taskCenter')} onClick={() => onSubnav('taskCenter', 'taskCenter')}>
          <span className="nav-ico">▧</span>
          <span className="nav-text">任务中心</span>
        </div>
        <div className="nav">
          <span className="nav-ico">￥</span>
          <span className="nav-text">商品策略</span>
        </div>
        <div className={navCls('aiAssistant')} onClick={() => onSubnav('aiAssistant', 'aiAssistant')}>
          <span className="nav-ico">✦</span>
          <span className="nav-text">AI助手</span>
        </div>
        <div className="nav">
          <span className="nav-ico">⚙</span>
          <span className="nav-text">自动化中心</span>
        </div>
        <div
          className={`nav nav-parent ${permissionOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setPermissionOpen((v) => !v);
          }}
        >
          <div className="nav-left">
            <span className="nav-ico">♟</span>
            <span className="nav-text">权限设置</span>
          </div>
          <span className="nav-arrow">▶</span>
        </div>
        <div className={`subnav-wrap ${permissionOpen ? 'show' : ''}`}>
          {(
            [
              { name: '店铺管理' },
              { name: '账号管理' },
              { name: '成员管理', target: 'permMember' },
              { name: '部门管理', target: 'permDept' },
              { name: '角色管理', target: 'permRole' },
            ] as { name: string; target?: PageKey }[]
          ).map((item) => (
            <div
              key={item.name}
              className={`subnav ${active === item.name ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onSubnav(item.name, item.target);
              }}
            >
              {item.name}
            </div>
          ))}
        </div>
        </div>
        <div className="side-version">客户端 v1.0.1</div>
      </aside>

      <main className="main">
        <div className="content">
          <section className={pageCls('dashboard')}>
            <DashboardPage />
          </section>
          <section className={pageCls('internal')}>
            <InternalPage />
          </section>
          <section className={pageCls('market')}>
            <MarketPage />
          </section>
          <section className={pageCls('search')}>
            <SearchPage />
          </section>
          <section className={pageCls('operationManage')}>
            <OperationManagePage />
          </section>
          <section className={pageCls('shopGoods')}>
            <ShopGoodsPage />
          </section>
          <section className={pageCls('createTaobao')}>
            <CreateProductPage variant="taobao" />
          </section>
          <section className={pageCls('createVideo')}>
            <CreateProductPage variant="video" />
          </section>
          <section className={pageCls('aiAssistant')}>
            <AiAssistantPage />
          </section>
          <section className={pageCls('taskCenter')}>
            <TaskCenterPage />
          </section>
          <section className={pageCls('permMember')}>
            <div className="page-header">
              <div className="page-title">
                <p>组织成员 · 角色与账号状态</p>
              </div>
            </div>
            <div className="pm-page pm-embed">
              <MemberManagement />
            </div>
          </section>
          <section className={pageCls('permDept')}>
            <div className="page-header">
              <div className="page-title">
                <p>组织架构与部门成员</p>
              </div>
            </div>
            <div className="pm-page pm-embed">
              <DepartmentManagement />
            </div>
          </section>
          <section className={pageCls('permRole')}>
            <div className="page-header">
              <div className="page-title">
                <p>角色分组与功能权限配置</p>
              </div>
            </div>
            <div className="pm-page pm-embed">
              <RolePermission />
            </div>
          </section>
        </div>
      </main>
      </div>
    </div>
  );
}
