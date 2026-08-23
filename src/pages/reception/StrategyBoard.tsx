/* =========================================================
   聚合接待 · 视图②「智能分流」策略页（面包屑：分流设置 › 智能分流）
   6 窗口 tab / 策略卡片 / 策略详情抽屉 / 选择账号弹窗
   ========================================================= */
import { useEffect, useMemo, useState } from 'react';
import { RC_COMPANY, RC_GROUPS, RC_STRATEGIES, type RcGroup, type RcStrategy } from './data';
import { IconXsm, Modal } from '../permission/shared';

/** 演示占位文案口径（与线上逐字一致） */
const toastPlaceholder = (name: string) => `演示原型：「${name}」页面暂未开放`;

const WINDOW_TABS = ['账号管理', '客服管理', '智能分流', '实时会话', '会话监控', '客服指标数据'];

interface Props {
  pushToast: (msg: string, type?: 'success' | 'error') => void;
  /** 表格页「智能分流」按钮跳转：打开对应分组首张策略卡抽屉 */
  openGroupId: number | null;
  /** 跳转序号：同组重复点击也能重新打开抽屉 */
  jumpSeq: number;
}

type Filter = { company: string; group: string; name: string };
const EMPTY_FILTER: Filter = { company: '', group: '', name: '' };

/* ---------- 策略详情抽屉本地配置 ---------- */
interface DrawerCfg {
  modeTab: '常规' | '智能分流';
  regularOn: boolean;
  mode: string;
  metrics: boolean[];
  rules: { conj: string; v: string }[];
  modeOpen: boolean;
  personnel: string[];
}
const DEFAULT_CFG: DrawerCfg = {
  modeTab: '常规',
  regularOn: false,
  mode: '宝妈接待',
  metrics: [true, true, true, true],
  rules: [{ conj: '当', v: '30' }, { conj: '且', v: '20' }, { conj: '且', v: '50' }, { conj: '且', v: '50' }],
  modeOpen: true,
  personnel: [],
};
const METRIC_NAMES = ['均响', '未回复量', '3分钟回复率', '30秒响应率'];
const METRIC_UNITS = ['秒', '个', '%', '%'];
const METRIC_OPS = ['超出', '超出', '小于', '小于'];
const MODE_OPTIONS = [
  { k: '均衡', d: '按每分钟的接待量进行均衡分配' },
  { k: '灵活', d: '按当前客服的待处理量进行分配' },
  { k: '自定义', d: '根据自定义规则进行分配' },
  { k: '宝妈接待', d: '按宝妈接待规则进行分配' },
];

/** 线上候选客服名单（选择账号弹窗） */
const CANDIDATES: { group: RcGroup; names: string[] }[] = [
  { group: '宝妈一组', names: ['王强', '刘芳', '陈浩', '赵敏'] },
  { group: '宝妈二组', names: ['吴婷', '徐磊', '孙莉', '高原', '林晓芸', '马超'] },
  { group: '宝妈三组', names: ['周洁', '郑爽', '汪洋', '冯雪', '蒋芸', '沈月', '韩磊', '曹颖', '谢娜', '邓超'] },
  { group: '宝妈四组', names: ['杨幂', '秦岚'] },
];

export default function StrategyBoard({ pushToast, openGroupId, jumpSeq }: Props) {
  const [cards, setCards] = useState<RcStrategy[]>(RC_STRATEGIES);
  const [draft, setDraft] = useState<Filter>(EMPTY_FILTER);
  const [applied, setApplied] = useState<Filter>(EMPTY_FILTER);
  const [drawerId, setDrawerId] = useState<number | null>(null);
  const [cfg, setCfg] = useState<DrawerCfg>(DEFAULT_CFG);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [pkGroup, setPkGroup] = useState('');
  const [pkName, setPkName] = useState('');

  const filtered = useMemo(() => cards.filter((c) => {
    if (applied.company !== '' && applied.company !== RC_COMPANY) return false;
    if (applied.group !== '' && c.group !== applied.group) return false;
    if (applied.name !== '' && !c.name.includes(applied.name)) return false;
    return true;
  }), [cards, applied]);

  const drawerCard = cards.find((c) => c.id === drawerId) ?? null;

  const openCard = (card: RcStrategy) => {
    setCfg({ ...DEFAULT_CFG, personnel: [card.name.split('/')[0]] });
    setDrawerId(card.id);
  };

  /** 表格页分组行「智能分流」跳转：打开该组第一张卡片 */
  useEffect(() => {
    if (openGroupId == null || jumpSeq === 0) return;
    const card = cards.find((c) => c.id === openGroupId);
    if (card) openCard(card);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openGroupId, jumpSeq]);

  /** Esc：先关选择账号，再关策略抽屉 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pickerOpen) setPickerOpen(false);
      else if (drawerId !== null) setDrawerId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pickerOpen, drawerId]);

  const toggleCardSwitch = (card: RcStrategy) => {
    setCards((v) => v.map((c) => (c.id === card.id ? { ...c, on: !c.on } : c)));
    pushToast(`${card.on ? '已停用' : '已启用'}策略「${card.name}」`);
  };

  const deleteCard = () => {
    if (!drawerCard) return;
    setCards((v) => v.filter((c) => c.id !== drawerCard.id));
    pushToast(`已删除策略「${drawerCard.name}」`);
    setDrawerId(null);
  };

  /** 选择账号弹窗：候选按筛选分组展示 */
  const pkCandidates = CANDIDATES
    .filter((b) => pkGroup === '' || b.group === pkGroup)
    .map((b) => ({ group: b.group, names: b.names.filter((n) => pkName === '' || n.includes(pkName)) }))
    .filter((b) => b.names.length > 0);
  const pkSelected = CANDIDATES
    .map((b) => ({ group: b.group, names: b.names.filter((n) => picked.has(n)) }))
    .filter((b) => b.names.length > 0);

  return (
    <div className="rc-view">
      {/* 窗口式 tab：仅「智能分流」为功能页，其余为演示占位 */}
      <div className="rc-wtabs">
        {WINDOW_TABS.map((t) => (
          <div
            key={t}
            className={`rc-wtab ${t === '智能分流' ? 'active' : ''}`}
            onClick={() => pushToast(t === '智能分流' ? '演示原型：当前页不可关闭' : toastPlaceholder(t))}
          >
            {t}
            <span className="x" onClick={(e) => { e.stopPropagation(); pushToast(t === '智能分流' ? '演示原型：当前页不可关闭' : toastPlaceholder(t)); }}><IconXsm /></span>
          </div>
        ))}
      </div>

      <div className="qc-body">
        {/* 筛选区 */}
        <div className="qc-filters rc-filter-row">
          <select className="select" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}>
            <option value="">公司</option>
            <option value={RC_COMPANY}>{RC_COMPANY}</option>
          </select>
          <select className="select" value={draft.group} onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}>
            <option value="">组别</option>
            {RC_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input
            className="input rc-input"
            placeholder="策略名称"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onKeyDown={(e) => { if (e.key === 'Enter') setApplied(draft); }}
          />
          <div className="rc-actions">
            <button type="button" className="btn primary" onClick={() => setApplied(draft)}>查询</button>
            <button type="button" className="btn" onClick={() => { setDraft(EMPTY_FILTER); setApplied(EMPTY_FILTER); pushToast('筛选条件已重置'); }}>重置</button>
          </div>
        </div>

        {/* 总公司区 */}
        <div className="rc-sec-title">总公司区</div>
        <div className="rc-company-box">
          <div className="rc-company-name">{RC_COMPANY}</div>
          {filtered.length === 0 ? (
            <div className="rc-empty">暂无数据</div>
          ) : (
            <div className="rc-cards">
              {filtered.map((c) => (
                <div className="rc-card" key={c.id} onClick={() => openCard(c)}>
                  <div className="rc-card-head">
                    <b className="rc-card-name">{c.name}</b>
                    <span
                      className={`rc-switch ${c.on ? 'on' : ''}`}
                      title="启用/停用策略"
                      onClick={(e) => { e.stopPropagation(); toggleCardSwitch(c); }}
                    ><i /></span>
                  </div>
                  <div className="rc-card-tags">
                    {c.tags.map((t) => <span key={t} className={`rc-tag ${t === '自营' ? 'green' : 'orange'}`}>{t}</span>)}
                    <span className="rc-tag blue">会话次数：{c.sessions}</span>
                  </div>
                  <div className="rc-card-grid">
                    <span className="full">公司：{RC_COMPANY}</span>
                    <span>店铺数量：{c.shops}</span>
                    <span>包含{c.people}人</span>
                    <span>系列编码数量：{c.codes}</span>
                    <span>标签：未设置</span>
                    <span>优先级：{c.priority}</span>
                    <span>ID：{c.id}</span>
                    <span className="full">名称：{c.name}</span>
                  </div>
                  <span
                    className="rc-card-clock"
                    title="变更记录"
                    onClick={(e) => { e.stopPropagation(); pushToast('演示占位：变更记录后续迭代设计'); }}
                  >⏱</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- 策略详情抽屉 ---------- */}
      {drawerCard ? (
        <div className="rc-drawer-mask" onClick={() => setDrawerId(null)}>
          <div className="rc-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="rc-drawer-title">策略详情</div>
            <div className="rc-drawer-main">
              {/* 左栏：主策略 */}
              <div className="rc-drawer-left">
                <div className="rc-sub-title">主策略</div>
                <div className="rc-card mini">
                  <div className="rc-card-head">
                    <b className="rc-card-name">{drawerCard.name}</b>
                    <span className={`rc-switch ${drawerCard.on ? 'on' : ''}`}><i /></span>
                  </div>
                  <div className="rc-card-tags">
                    {drawerCard.tags.map((t) => <span key={t} className={`rc-tag ${t === '自营' ? 'green' : 'orange'}`}>{t}</span>)}
                    <span className="rc-tag blue">会话次数：{drawerCard.sessions}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn primary rc-add-sub"
                  onClick={() => pushToast('演示占位：子策略规则新增后续迭代设计')}
                >子策略规则＋</button>
              </div>

              {/* 右栏：配置 */}
              <div className="rc-drawer-right">
                <div className="rc-drawer-head">
                  <b>{drawerCard.name}</b>
                  <div className="rc-drawer-btns">
                    <button type="button" className="btn" onClick={() => setDrawerId(null)}>关闭</button>
                    <button type="button" className="btn primary" onClick={() => pushToast(`已保存策略「${drawerCard.name}」`)}>保存</button>
                    <button type="button" className="btn danger" onClick={deleteCard}>删除</button>
                  </div>
                </div>

                <div className="rc-cfg-row">
                  <span>系列商品编码</span>
                  <a onClick={() => pushToast('「系列商品编码」配置（演示占位，后续迭代设计）')}>添加 ›</a>
                </div>
                <div className="rc-cfg-row">
                  <span>商品ID</span>
                  <a onClick={() => pushToast('「商品ID」配置（演示占位，后续迭代设计）')}>添加 ›</a>
                </div>
                <div className="rc-cfg-row">
                  <span>状态 <span className="rc-dim">已选择</span> <span className="rc-pill blue">售前</span> <span className="rc-dim">状态</span></span>
                  <a onClick={() => pushToast('「状态」配置（演示占位，后续迭代设计）')}>添加 ›</a>
                </div>
                <div className="rc-cfg-row">
                  <span>生效时间配置</span>
                  <a onClick={() => pushToast('「生效时间配置」配置（演示占位，后续迭代设计）')}>配置 ›</a>
                </div>
                <div className="rc-cfg-row">
                  <span>分流归属 <span className="rc-pill">已选择 1 个公司</span></span>
                  <a onClick={() => pushToast('「分流归属」配置（演示占位，后续迭代设计）')}>添加 ›</a>
                </div>
                <div className="rc-cfg-row">
                  <span>分流模式</span>
                  <a onClick={() => setCfg((c) => ({ ...c, modeOpen: !c.modeOpen }))}>配置 {cfg.modeOpen ? '∧' : '∨'}</a>
                </div>

                {cfg.modeOpen ? (
                  <div className="rc-mode-box">
                    <div className="rc-seg-tabs">
                      {(['常规', '智能分流'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={cfg.modeTab === t ? 'cur' : ''}
                          onClick={() => setCfg((c) => ({ ...c, modeTab: t }))}
                        >{t}</button>
                      ))}
                    </div>
                    <div className="rc-mode-line">
                      常规分流是否启用：
                      <span
                        className={`rc-switch ${cfg.regularOn ? 'on' : ''}`}
                        onClick={() => setCfg((c) => ({ ...c, regularOn: !c.regularOn }))}
                      ><i /></span>
                    </div>
                    <div className="rc-mode-radios">
                      {MODE_OPTIONS.map((m) => (
                        <label key={m.k} className="rc-radio">
                          <input
                            type="radio"
                            name="rc-mode"
                            checked={cfg.mode === m.k}
                            onChange={() => setCfg((c) => ({ ...c, mode: m.k }))}
                          />
                          <b>{m.k}</b>
                          <span>（{m.d}）</span>
                        </label>
                      ))}
                    </div>
                    <div className="rc-mode-metrics">
                      {METRIC_NAMES.map((m, i) => (
                        <label key={m}>
                          <input
                            type="checkbox"
                            checked={cfg.metrics[i]}
                            onChange={() => setCfg((c) => ({ ...c, metrics: c.metrics.map((v, j) => (j === i ? !v : v)) }))}
                          />
                          {m}
                        </label>
                      ))}
                    </div>
                    <div className="rc-rules">
                      {cfg.rules.map((r, i) => (
                        <div className="rc-rule" key={i}>
                          {i === 0 ? (
                            <span className="rc-rule-kw">当</span>
                          ) : (
                            <select
                              className="select rc-rule-conj"
                              value={r.conj}
                              onChange={(e) => setCfg((c) => ({ ...c, rules: c.rules.map((x, j) => (j === i ? { ...x, conj: e.target.value } : x)) }))}
                            >
                              <option value="且">且</option>
                              <option value="或">或</option>
                            </select>
                          )}
                          <span>{METRIC_NAMES[i]}{METRIC_OPS[i]}</span>
                          <input
                            className="input rc-rule-v"
                            value={r.v}
                            onChange={(e) => setCfg((c) => ({ ...c, rules: c.rules.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)) }))}
                          />
                          <span>{METRIC_UNITS[i]}，则分流给排名下一位客服</span>
                        </div>
                      ))}
                    </div>
                    <div className="rc-people">
                      <div className="rc-people-head">
                        <span>人员配置</span>
                        <a onClick={() => { setPicked(new Set(cfg.personnel)); setPkGroup(''); setPkName(''); setPickerOpen(true); }}>+ 添加</a>
                      </div>
                      <div className="rc-people-box">
                        {cfg.personnel.length === 0 ? (
                          <span className="rc-dim">请点击右上角「添加」配置分流人员</span>
                        ) : (
                          <>
                            <span>组别：{drawerCard.group}</span>
                            <span className="rc-dim">→</span>
                            {cfg.personnel.map((p) => <span key={p} className="rc-people-chip">{p}</span>)}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------- 选择账号弹窗 ---------- */}
      {pickerOpen ? (
        <Modal
          title="选择账号"
          size="lg"
          foot={(
            <>
              <button type="button" className="btn" onClick={() => setPickerOpen(false)}>取消</button>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  setCfg((c) => ({ ...c, personnel: [...picked] }));
                  setPickerOpen(false);
                  pushToast('已确认分流人员选择');
                }}
              >确定</button>
            </>
          )}
          onClose={() => setPickerOpen(false)}
        >
          <div className="qc-filters rc-filter-row">
            <select className="select" value="" onChange={() => {}}>
              <option value="">公司</option>
              <option>{RC_COMPANY}</option>
            </select>
            <select className="select" value={pkGroup} onChange={(e) => setPkGroup(e.target.value)}>
              <option value="">分组</option>
              {RC_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <input
              className="input rc-input wide"
              placeholder="请输入姓名"
              value={pkName}
              onChange={(e) => setPkName(e.target.value)}
            />
          </div>
          <div className="rc-pick-panes">
            <div className="rc-pick-pane">
              {pkCandidates.length === 0 ? (
                <div className="rc-empty-sm">暂无数据</div>
              ) : pkCandidates.map((b) => (
                <div className="rc-pick-block" key={b.group}>
                  <div className="rc-pick-group">组别：{b.group}</div>
                  {b.names.map((n) => (
                    <label key={n} className="rc-pick-item">
                      <input
                        type="checkbox"
                        checked={picked.has(n)}
                        onChange={() => setPicked((s) => {
                          const next = new Set(s);
                          if (next.has(n)) next.delete(n);
                          else next.add(n);
                          return next;
                        })}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="rc-pick-pane">
              {pkSelected.length === 0 ? (
                <div className="rc-empty-sm">在左侧勾选以添加人员</div>
              ) : pkSelected.map((b) => (
                <div className="rc-pick-block" key={b.group}>
                  <div className="rc-pick-group">组别：{b.group}</div>
                  {b.names.map((n) => (
                    <label key={n} className="rc-pick-item">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => setPicked((s) => {
                          const next = new Set(s);
                          next.delete(n);
                          return next;
                        })}
                      />
                      {n}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
