import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './BubbleSelect.css';

export interface BubbleOption {
  value: string;
  label: string;
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

  const current = value !== undefined ? value : inner;
  const currentLabel = opts.find((o) => o.value === current)?.label ?? current;
  /* 当前值不在选项中 → 视为功能标题占位，灰色展示且不可作为选择项 */
  const isPlaceholder = !opts.some((o) => o.value === current);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

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
      {open && (
        <div className="bselect-menu">
          {opts.map((o) => (
            <div
              key={o.value || o.label}
              className={`bselect-opt${o.value === current ? ' selected' : ''}`}
              onClick={() => {
                if (value === undefined) setInner(o.value);
                onChange?.(o.value);
                setOpen(false);
              }}
            >
              <span className="bselect-check">{o.value === current ? '✓' : ''}</span>
              <span className="bselect-label">{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
