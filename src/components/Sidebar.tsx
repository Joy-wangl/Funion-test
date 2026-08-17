import { useEffect, useState, type ReactNode } from 'react';
import type { MenuItem } from '../config/navigation';
import './Sidebar.css';

interface SidebarProps {
  menus: MenuItem[];
  activeKey: string;
  onSelect: (key: string) => void;
}

/** 深度优先查找第一个叶子菜单项（用于 Tab 切换后的默认选中） */
export function findFirstLeaf(menus: MenuItem[]): MenuItem | undefined {
  for (const item of menus) {
    if (!item.children?.length) return item;
    const leaf = findFirstLeaf(item.children);
    if (leaf) return leaf;
  }
  return undefined;
}

/** 查找目标菜单项的父级 key（用于自动展开所在分组） */
function findParentKey(menus: MenuItem[], targetKey: string): string | undefined {
  for (const item of menus) {
    if (item.children?.some((child) => child.key === targetKey)) return item.key;
    if (item.children) {
      const found = findParentKey(item.children, targetKey);
      if (found) return found;
    }
  }
  return undefined;
}

export default function Sidebar({ menus, activeKey, onSelect }: SidebarProps) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // 选中项变化时（如切换 Tab），自动展开其所在的分组
  useEffect(() => {
    const parentKey = findParentKey(menus, activeKey);
    if (parentKey) {
      setExpandedKeys((keys) =>
        keys.includes(parentKey) ? keys : [...keys, parentKey],
      );
    }
  }, [menus, activeKey]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((keys) =>
      keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key],
    );
  };

  const renderMenuItem = (item: MenuItem, depth = 0): ReactNode => {
    const hasChildren = Boolean(item.children?.length);
    const isExpanded = expandedKeys.includes(item.key);
    const isActive = item.key === activeKey;

    return (
      <div key={item.key}>
        <button
          type="button"
          className={[
            'sidebar-item',
            isActive ? 'is-active' : '',
            depth > 0 ? 'is-child' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => (hasChildren ? toggleExpand(item.key) : onSelect(item.key))}
        >
          <span className="sidebar-item-label">{item.label}</span>
          {hasChildren && (
            <span className={`sidebar-item-arrow ${isExpanded ? 'is-open' : ''}`}>
              ▾
            </span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="sidebar-submenu">
            {item.children!.map((child) => renderMenuItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar-menu">{menus.map((item) => renderMenuItem(item))}</nav>
    </aside>
  );
}
