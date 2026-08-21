import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import './BubbleSelect.css';

export interface BubbleOption {
  value: string;
  label: string;
  /** 禁用项：灰色展示、不可点选（用于业务约束提示） */
  disabled?: boolean;
}

interface BubbleSelectProps {
  /** 选项：字符串（value=label）或 {value,label} */
  options: (string | BubbleOption)[];
  /** 受控值（option 的 value） */
  value?: string;
  /** 非受控默认值 */
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  /** 外层容器附加类名（复用各模块盒样式） */
  className?: string;
  style?: CSSProperties;
}

const norm = (o: string | BubbleOption): BubbleOption =>
  typeof o === 'string' ? { value: o, label: o } : o;

/** 全局统一筛选下拉：白底气泡菜单，替代原生 select 的灰色弹层 */
export default function BubbleSelect({
  options,
  value,
  defaultValue,
  onChange,
  disabled,
  className,
  style,
}: BubbleSelectProps) {
  const opts = options.map(norm);
  const [inner, setInner] = useState(defaultValue ?? (opts[0]?.value ?? ''));
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number; up: boolean; maxH: number } | null>(null);

  const current = value !== undefined ? value : inner;
  const currentLabel = opts.find((o) => o.value === current)?.label ?? current;
  /* 当前值不在选项中 → 视为功能标题占位，灰色展示且不可作为选择项 */
  const isPlaceholder = !opts.some((o) => o.value === current);

  /* 浮层设计理念：菜单 portal 到 body、fixed 定位，永不被弹窗/抽屉等 overflow 容器裁剪；
     下方空间不足时自动向上展开，滚动/缩放时跟随触发器重新定位 */
  const updatePos = () => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    /* 选项自然高度（opt 约 33px + 菜单 padding 12 + 上下边框 2），避免 border-box 下 2px 溢出滚动条 */
    const contentH = opts.length * 33 + 12 + 2;
    const spaceBelow = window.innerHeight - r.bottom - 6;
    const spaceAbove = r.top - 6;
    const up = contentH > spaceBelow && spaceAbove > spaceBelow;
    const maxH = Math.max(120, Math.min(contentH, up ? spaceAbove : spaceBelow));
    /* 水平方向保护：不超出视口左右缘 */
    const width = Math.max(r.width, 96);
    const vw = window.innerWidth;
    const left = vw > 0 ? Math.max(8, Math.min(r.left, vw - width - 8)) : r.left;
    setPos({ top: up ? r.top - 6 : r.bottom + 6, left, width, up, maxH });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    updatePos();
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const menuStyle: CSSProperties = pos
    ? {
      position: 'fixed',
      top: pos.top,
      left: pos.left,
      minWidth: pos.width,
      maxHeight: pos.maxH,
      zIndex: 2500,
      transform: pos.up ? 'translateY(-100%)' : undefined,
    }
    : { position: 'fixed', visibility: 'hidden' };

  return (
    <div
      className={`bselect${open ? ' open' : ''}${disabled ? ' disabled' : ''}${className ? ` ${className}` : ''}`}
      style={style}
      ref={ref}
    >
      <button
        type="button"
        className="bselect-trigger"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`bselect-text${isPlaceholder ? ' ph' : ''}`}>{currentLabel}</span>
        <svg className="bselect-arrow" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 4.5 L6 8 L9.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && createPortal(
        <div className="bselect-menu" style={menuStyle} ref={menuRef}>
          {opts.map((o) => (
            <div
              key={o.value || o.label}
              className={`bselect-opt${o.value === current ? ' selected' : ''}${o.disabled ? ' disabled' : ''}`}
              onClick={() => {
                if (o.disabled) return;
                if (value === undefined) setInner(o.value);
                onChange?.(o.value);
                setOpen(false);
              }}
            >
              <span className="bselect-check">{o.value === current ? '✓' : ''}</span>
              <span className="bselect-label">{o.label}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
