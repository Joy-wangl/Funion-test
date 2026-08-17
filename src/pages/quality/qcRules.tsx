/* =========================================================
   品控管理 v2 · 规则配置
   阈值配置（多维度阈值 + 命中预览）/ 问题类型管理（自定义类型闭环）
   ========================================================= */
import { useMemo, useState } from 'react';
import {
  PRODUCT_CODES,
  aggPlatformStats,
  typeMetricsOfCodes,
  type QcThresholds,
} from './data';

/* ---------- 阈值配置：三维度可调 + 保存前实时命中预览 ---------- */
export function ThresholdConfigView({ thresholds, onApply, onReset }: {
  thresholds: QcThresholds;
  onApply: (next: QcThresholds) => void;
  onReset: () => void;
}) {
  const [rate, setRate] = useState(String(Math.round(thresholds.refundRate * 100)));
  const [prob, setProb] = useState(String(thresholds.problemCount));
  const [hit, setHit] = useState(String(thresholds.typeHitCount));

  const metrics = useMemo(() => PRODUCT_CODES.map((c) => ({
    agg: aggPlatformStats(c.platforms),
    tm: typeMetricsOfCodes([c]),
  })), []);

  const dRate = Number(rate) / 100;
  const dProb = Math.floor(Number(prob));
  const dHit = Math.floor(Number(hit));
  const valid = Number(rate) >= 1 && Number(rate) <= 100 && dProb >= 1 && dHit >= 1;

  return (
    <div className="qc-ov">
      <div className="th-grid">
        <div className="qc-panel th-card">
          <div className="p-title">综合退款率 <span className="p-sub">按订单量加权 ≥ 该值 → 疑似</span></div>
          <div className="th-input">
            <input className="input" type="number" min={1} max={100} value={rate} onChange={(e) => setRate(e.target.value)} />
            <span className="unit">%</span>
          </div>
          <div className="th-hit">
            当前配置命中 <b>{metrics.filter((m) => m.agg.refundRate >= dRate).length}</b> 个编码 · 同步驱动趋势图阈值线与退款率着色
          </div>
        </div>
        <div className="qc-panel th-card">
          <div className="p-title">问题数量 <span className="p-sub">售后单总数 ≥ 该值 → 疑似</span></div>
          <div className="th-input">
            <input className="input" type="number" min={1} value={prob} onChange={(e) => setProb(e.target.value)} />
            <span className="unit">单</span>
          </div>
          <div className="th-hit">
            当前配置命中 <b>{metrics.filter((m) => m.tm.problemCount >= dProb).length}</b> 个编码 · 统计全部问题类型售后单
          </div>
        </div>
        <div className="qc-panel th-card">
          <div className="p-title">问题类型出现次数 <span className="p-sub">单一类型命中 ≥ 该值 → 疑似</span></div>
          <div className="th-input">
            <input className="input" type="number" min={1} value={hit} onChange={(e) => setHit(e.target.value)} />
            <span className="unit">次</span>
          </div>
          <div className="th-hit">
            当前配置命中 <b>{metrics.filter((m) => m.tm.maxTypeHit >= dHit).length}</b> 个编码 · 取各类型命中最大值
          </div>
        </div>
      </div>

      <div className="th-actions">
        <button
          className="btn primary"
          disabled={!valid}
          onClick={() => onApply({ refundRate: dRate, problemCount: dProb, typeHitCount: dHit })}
        >
          保存并生效
        </button>
        <button className="btn" onClick={onReset}>恢复默认</button>
        <span className="th-note">保存后：品控状态、系统预审核建议、概览图表将按新阈值实时重算</span>
      </div>

      <div className="qc-panel">
        <div className="p-title">阈值生效范围 <span className="p-sub">任一维度超标即标记疑似垃圾品</span></div>
        <div className="th-rules">
          <div className="th-rule"><b>品控状态</b>商品 / 系列维度的退款率、问题数量、单类型命中任一超阈值 → 疑似（标记垃圾品仍经审核流确认）</div>
          <div className="th-rule"><b>系统预审核</b>超阈值 → 建议标记垃圾品；未超阈值但有风险命中 → 建议优化；否则建议通过</div>
          <div className="th-rule"><b>趋势图</b>综合退款率趋势的红色虚线实时跟随退款率阈值</div>
          <div className="th-rule"><b>效果验证</b>优化任务「已回落 / 仍偏高」判定跟随退款率阈值</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 问题类型管理：内置 + 自定义，全局贯通 ---------- */
export function TypeManageView({ types, builtinCount, usage, onAdd, onRemove }: {
  types: string[];
  builtinCount: number;
  usage: (t: string) => { hits: number; tasks: number };
  onAdd: (name: string) => boolean;
  onRemove: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <div className="qc-ov">
      <div className="qc-panel">
        <div className="p-title">新增自定义问题类型 <span className="p-sub">添加后实时贯通：筛选 / 分布图 / 命中排行 / 诊断建议 / 优化任务</span></div>
        <div className="type-add-row">
          <input
            className="input"
            placeholder="输入类型名称，如：包装破损、配件缺失"
            maxLength={10}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && onAdd(name.trim())) setName(''); }}
          />
          <button className="btn primary" onClick={() => { if (onAdd(name.trim())) setName(''); }}>添加</button>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>问题类型</th>
            <th>属性</th>
            <th>售后命中</th>
            <th>关联优化任务</th>
            <th style={{ width: 140 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {types.map((t, i) => {
            const u = usage(t);
            const builtin = i < builtinCount;
            return (
              <tr key={t}>
                <td><span className={`tag ${t === '质量问题' ? 'red' : t === '描述不符' ? 'orange' : ''}`}>{t}</span></td>
                <td>{builtin ? <span className="tag blue">内置</span> : <span className="tag orange">自定义</span>}</td>
                <td>{u.hits} 次</td>
                <td>{u.tasks} 个</td>
                <td>
                  <div className="qc-op-col">
                    {builtin
                      ? <span style={{ color: 'var(--text-4)', fontSize: 12 }}>内置不可删除</span>
                      : <a onClick={() => onRemove(t)}>删除</a>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
