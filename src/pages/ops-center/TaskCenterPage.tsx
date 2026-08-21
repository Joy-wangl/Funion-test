import { useState } from 'react';
import { parentTasks, type ParentTask, type SubTask } from './data';
import BubbleSelect from '../../components/BubbleSelect';

const platformOptions = ['发布平台', '淘宝', '天猫', '拼多多', '抖音', '快手', '京东', '阿里巴巴', '微信视频号小店'];
const typeOptions = ['任务类型', '快速铺货', '商品铺货', '商品发布', '批量上架', '自动定价', '自动换图'];
const channelOptions = ['全部', '智能', '蜂联'];

/** 时间区间（开始 → 结束） */
function Range() {
  return (
    <div className="sg-range">
      <input className="sg-input" placeholder="开始时间" />
      <span>→</span>
      <input className="sg-input" placeholder="结束时间" />
    </div>
  );
}

const parentStatusText: Record<ParentTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  done: '已完成',
};

/* 任务状态：圆环占比 + 中心数字 */
const RING_C = 2 * Math.PI * 15;
function TaskRing({ p }: { p: ParentTask }) {
  const total = p.success + p.failed + p.running;
  const pct = total > 0 ? Math.round(((p.success + p.failed) / total) * 100) : 0;
  return (
    <span className="tc-ring-cell">
      <span className="tc-ring-wrap">
        <svg className="tc-ring" width="36" height="36" viewBox="0 0 36 36">
          <circle className="track" cx="18" cy="18" r="15" />
          <circle
            className={`bar ${p.status}`}
            cx="18"
            cy="18"
            r="15"
            strokeDasharray={`${(RING_C * pct) / 100} ${RING_C}`}
          />
        </svg>
        <b>{pct}%</b>
      </span>
      <span className="tc-ring-text">{parentStatusText[p.status]}</span>
    </span>
  );
}

/* ================= 父任务列表（一级页） ================= */
interface ListFilter {
  tab: string;
  platform: string;
  channel: string;
  creator: string;
  type: string;
  shop: string;
}
const defaultListFilter: ListFilter = { tab: 'all', platform: '发布平台', channel: '全部', creator: '', type: '任务类型', shop: '' };

function ParentList({ onDetail }: { onDetail: (p: ParentTask) => void }) {
  const [tab, setTab] = useState('all');
  const [platform, setPlatform] = useState('发布平台');
  const [channel, setChannel] = useState('全部');
  const [creator, setCreator] = useState('');
  const [type, setType] = useState('任务类型');
  const [shop, setShop] = useState('');
  const [applied, setApplied] = useState<ListFilter>(defaultListFilter);

  const count = (st: ParentTask['status']) => parentTasks.filter((p) => p.status === st).length;
  const tabs = [
    { key: 'all', text: '全部', n: parentTasks.length },
    { key: 'queued', text: '队列中', n: count('queued') },
    { key: 'running', text: '执行中', n: count('running') },
    { key: 'done', text: '已完成', n: count('done') },
  ];

  const snapshot = (nextTab: string): ListFilter => ({
    tab: nextTab,
    platform,
    channel,
    creator: creator.trim(),
    type,
    shop: shop.trim(),
  });
  const onTab = (key: string) => {
    setTab(key);
    setApplied(snapshot(key));
  };
  const onSearch = () => setApplied(snapshot(tab));
  const onReset = () => {
    setPlatform('发布平台');
    setChannel('全部');
    setCreator('');
    setType('任务类型');
    setShop('');
    setTab('all');
    setApplied(defaultListFilter);
  };

  const visible = parentTasks.filter((p) => {
    const okTab = applied.tab === 'all' || p.status === applied.tab;
    const okPlatform = applied.platform === '发布平台' || p.subs.some((s) => s.platform === applied.platform);
    const okChannel = applied.channel === '全部' || p.channel === applied.channel;
    const okCreator = !applied.creator || p.creator.indexOf(applied.creator) > -1;
    const okType = applied.type === '任务类型' || p.type === applied.type;
    const okShop = !applied.shop || p.subs.some((s) => s.shop.indexOf(applied.shop) > -1);
    return okTab && okPlatform && okChannel && okCreator && okType && okShop;
  });

  return (
    <>
      <div className="tc-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tc-tab ${tab === t.key ? 'active' : ''}`} onClick={() => onTab(t.key)}>
            {t.text}({t.n})
          </button>
        ))}
      </div>

      <div className="tc-filter">
        <div className="sg-grid">
          <div className="sg-field">
            <label>发布平台</label>
            <BubbleSelect className="sg-select" value={platform} onChange={setPlatform} options={platformOptions} />
          </div>
          <div className="sg-field">
            <label>渠道</label>
            <BubbleSelect className="sg-select" value={channel} onChange={setChannel} options={channelOptions} />
          </div>
          <div className="sg-field">
            <label>创建人</label>
            <input className="sg-input" placeholder="请输入创建人" value={creator} onChange={(e) => setCreator(e.target.value)} />
          </div>
          <div className="sg-field">
            <label>任务类型</label>
            <BubbleSelect className="sg-select" value={type} onChange={setType} options={typeOptions} />
          </div>
          <div className="sg-field">
            <label>创建时间</label>
            <Range />
          </div>
          <div className="sg-field">
            <label>发布店铺名称</label>
            <input className="sg-input" placeholder="请输入发布店铺名称" value={shop} onChange={(e) => setShop(e.target.value)} />
          </div>
          <div className="sg-actions">
            <button className="sg-btn" onClick={onReset}>
              重置
            </button>
            <button className="sg-btn primary" onClick={onSearch}>
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="tc-table-card">
        <div className="tc-table-wrap">
          <table className="tc-table tc-list">
            <thead>
              <tr>
                <th style={{ width: 64 }}>序号</th>
                <th>
                  创建人/创建时间 <span className="tc-sort">⇅</span>
                </th>
                <th>任务类型</th>
                <th>任务状态</th>
                <th>发布信息</th>
                <th>执行信息</th>
                <th>渠道</th>
                <th>
                  执行起止时间 <span className="tc-sort">⇅</span>
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id}>
                  <td>{parentTasks.indexOf(p) + 1}</td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>{p.creator}</div>
                      <div>{p.createTime}</div>
                    </div>
                  </td>
                  <td>{p.type}</td>
                  <td>
                    <TaskRing p={p} />
                  </td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>发布店铺数：{p.shops}</div>
                      <div>发布链接数：{p.links}</div>
                    </div>
                  </td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>任务成功：{p.success}</div>
                      <div>任务失败：{p.failed}</div>
                      <div>执行中：{p.running}</div>
                    </div>
                  </td>
                  <td>{p.channel}</td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>起：{p.startTime || '–'}</div>
                      <div>止：{p.endTime || '–'}</div>
                    </div>
                  </td>
                  <td className="actions-col">
                    <a className="tc-link" onClick={() => onDetail(p)}>
                      查看详情
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ================= 子任务详情（二级页） ================= */
interface DetailFilter {
  tab: string;
  chip: string;
  templateNo: string;
  linkId: string;
  platform: string;
  shop: string;
  retried: string;
}
const defaultDetailFilter: DetailFilter = {
  tab: 'all',
  chip: '全部',
  templateNo: '',
  linkId: '',
  platform: '发布平台',
  shop: '',
  retried: '是否重试',
};

/** 子任务三节点状态（获取链接信息/定价策略计算/商品发布店铺），由任务状态推导 */
function stepsOf(s: SubTask) {
  const ok = { dot: 'ok', v: '成功', cls: '' };
  const dash = { dot: 'wait', v: '–', cls: 'wait' };
  /* 队列中：首节点待执行，后续未触及 */
  if (s.status === 'queued') return [{ dot: 'wait', v: '待执行', cls: 'wait' }, dash, dash];
  if (s.status === 'running') return [ok, ok, { dot: 'ok', v: '执行中', cls: '' }];
  /* 已完成：三节点全部通过 */
  if (s.status === 'success') return [ok, ok, ok];
  /* 执行失败：失败节点及其后续节点均失败 */
  const f = s.failStep ?? 2;
  return [0, 1, 2].map((i) => (i < f ? ok : { dot: 'fail', v: '执行失败', cls: 'fail' }));
}
const stepLabels = ['获取链接信息', '定价策略计算', '商品发布店铺'];

function SubDetail({ parent }: { parent: ParentTask }) {
  const [tab, setTab] = useState('all');
  const [chip, setChip] = useState('全部');
  const [templateNo, setTemplateNo] = useState('');
  const [linkId, setLinkId] = useState('');
  const [platform, setPlatform] = useState('发布平台');
  const [shop, setShop] = useState('');
  const [retried, setRetried] = useState('是否重试');
  const [applied, setApplied] = useState<DetailFilter>(defaultDetailFilter);
  const [checked, setChecked] = useState<number[]>([]);

  const subs = parent.subs;
  const count = (st: SubTask['status']) => subs.filter((s) => s.status === st).length;
  const tabs = [
    { key: 'all', text: '全部', n: subs.length },
    { key: 'queued', text: '队列中', n: count('queued') },
    { key: 'running', text: '执行中', n: count('running') },
    { key: 'done', text: '已完成', n: count('success') },
    { key: 'failed', text: '执行失败', n: count('failed') },
  ];

  const snapshot = (nextTab: string, nextChip?: string): DetailFilter => ({
    tab: nextTab,
    chip: nextChip ?? chip,
    templateNo: templateNo.trim(),
    linkId: linkId.trim(),
    platform,
    shop: shop.trim(),
    retried,
  });
  const onTab = (key: string) => {
    setTab(key);
    setChecked([]);
    setApplied(snapshot(key));
  };
  const onChip = (c: string) => {
    setChip(c);
    setChecked([]);
    setApplied(snapshot(tab, c));
  };
  const onSearch = () => setApplied(snapshot(tab));
  const onReset = () => {
    setChip('全部');
    setTemplateNo('');
    setLinkId('');
    setPlatform('发布平台');
    setShop('');
    setRetried('是否重试');
    setTab('all');
    setChecked([]);
    setApplied(defaultDetailFilter);
  };

  const visible = subs.filter((s) => {
    const okTab =
      applied.tab === 'all' ||
      (applied.tab === 'done' ? s.status === 'success' : applied.tab === 'failed' ? s.status === 'failed' : s.status === applied.tab);
    const okChip = applied.tab !== 'failed' || applied.chip === '全部' || s.reason === applied.chip;
    const okTpl = !applied.templateNo || s.templateNo.indexOf(applied.templateNo) > -1;
    const okLink = !applied.linkId || s.linkId.indexOf(applied.linkId) > -1;
    const okPlatform = applied.platform === '发布平台' || s.platform === applied.platform;
    const okShop = !applied.shop || s.shop.indexOf(applied.shop) > -1;
    const okRetried = applied.retried === '是否重试' || (applied.retried === '是') === s.retried;
    return okTab && okChip && okTpl && okLink && okPlatform && okShop && okRetried;
  });

  const isFailed = tab === 'failed';
  const isQueued = tab === 'queued';
  const allChecked = visible.length > 0 && visible.every((s) => checked.includes(s.id));
  const toggleAll = () => setChecked(allChecked ? [] : visible.map((s) => s.id));
  const toggleOne = (id: number, on: boolean) => setChecked((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)));
  const onBatchRetry = () => {
    if (!checked.length) {
      alert('请先勾选需要重试的任务');
      return;
    }
    alert(`已发起 ${checked.length} 个任务的批量重试（演示）`);
  };

  return (
    <>
      <div className="tc-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tc-tab ${tab === t.key ? 'active' : ''}`} onClick={() => onTab(t.key)}>
            {t.text}({t.n})
          </button>
        ))}
      </div>

      <div className="tc-filter">
        {isFailed && (
          <div className="tc-chips">
            {['全部', '发品超限', '库存不足', '其它'].map((c) => (
              <button key={c} className={`tc-chip ${chip === c ? 'active' : ''}`} onClick={() => onChip(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="sg-grid">
          <div className="sg-field">
            <label>模版号</label>
            <input className="sg-input" placeholder="请输入模版号" value={templateNo} onChange={(e) => setTemplateNo(e.target.value)} />
          </div>
          <div className="sg-field">
            <label>链接商品ID</label>
            <input className="sg-input" placeholder="请输入链接商品ID" value={linkId} onChange={(e) => setLinkId(e.target.value)} />
          </div>
          <div className="sg-field">
            <label>发布平台</label>
            <BubbleSelect className="sg-select" value={platform} onChange={setPlatform} options={platformOptions} />
          </div>
          <div className="sg-field">
            <label>发布店铺名称</label>
            <input className="sg-input" placeholder="请输入发布店铺名称" value={shop} onChange={(e) => setShop(e.target.value)} />
          </div>
          {tab !== 'queued' && (
            <div className="sg-field">
              <label>{tab === 'all' ? '创建时间' : '执行时间'}</label>
              <Range />
            </div>
          )}
          {isFailed && (
            <div className="sg-field">
              <label>是否重试</label>
              <BubbleSelect className="sg-select" value={retried} onChange={setRetried} options={['是否重试', '是', '否']} />
            </div>
          )}
        </div>
        <div className="sg-actions">
          <div className="sg-mini"></div>
          <div className="sg-rightacts">
            {isFailed && (
              <button className="sg-btn primary" onClick={onBatchRetry}>
                批量重试
              </button>
            )}
            <button className="sg-btn" onClick={onReset}>
              重置
            </button>
            <button className="sg-btn primary" onClick={onSearch}>
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="tc-table-card">
        <div className="tc-table-wrap">
          <table className="tc-table tc-detail">
            <thead>
              <tr>
                {isFailed && (
                  <th style={{ width: 72 }}>
                    <label className="tc-check">
                      <input type="checkbox" className="ib-check" checked={allChecked} onChange={toggleAll} />
                      选择
                    </label>
                  </th>
                )}
                <th style={{ width: 64 }}>序号</th>
                <th>商品信息</th>
                <th>任务状态</th>
                <th>发布信息</th>
                <th>
                  执行起止时间 <span className="tc-sort">⇅</span>
                </th>
                {!isQueued && <th>操作</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  {isFailed && (
                    <td>
                      <input
                        type="checkbox"
                        className="ib-check"
                        checked={checked.includes(s.id)}
                        onChange={(e) => toggleOne(s.id, e.target.checked)}
                      />
                    </td>
                  )}
                  <td>{subs.indexOf(s) + 1}</td>
                  <td>
                    <div className="tc-product">
                      <img className="tc-thumb" src={s.thumb} />
                      <div>
                        <div className="tc-pname">{s.name}</div>
                        <div className="tc-pmeta">竞品链接：{s.linkId}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={`tc-steps ${s.status === 'queued' ? 'gray' : ''}`}>
                      {stepsOf(s).map((st, i) => (
                        <div className="tc-step" key={stepLabels[i]}>
                          <i className={st.dot} />
                          <span>{stepLabels[i]}：</span>
                          <span className={`v ${st.cls}`}>{st.v}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="tc-pf">
                      <span>平台名称</span>
                      <span className="tc-pf-shop">
                        <i className="tc-pf-badge">淘</i>
                        {s.shop}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>起：{s.startTime || '–'}</div>
                      <div>止：{s.endTime || '–'}</div>
                    </div>
                  </td>
                  {!isQueued && (
                    <td className="actions-col">
                      {s.status === 'failed' ? (
                        <a className="tc-link">重试</a>
                      ) : (
                        <span className="tc-dash">–</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ================= 按任务详情（扁平子任务列表） ================= */
interface FlatRow {
  sub: SubTask;
  parent: ParentTask;
}
const flatAll: FlatRow[] = parentTasks.flatMap((p) => p.subs.map((sub) => ({ sub, parent: p })));

const subStatusText: Record<SubTask['status'], string> = {
  queued: '队列中',
  running: '执行中',
  success: '已完成',
  failed: '执行失败',
};
const subStatusCls: Record<SubTask['status'], string> = {
  queued: 'queued',
  running: 'running',
  success: 'done',
  failed: 'failed',
};

interface FlatFilter {
  tab: string;
  chip: string;
  creator: string;
  platform: string;
  channel: string;
  type: string;
  shop: string;
  retried: string;
}
const defaultFlatFilter: FlatFilter = {
  tab: 'all',
  chip: '全部',
  creator: '',
  platform: '发布平台',
  channel: '全部',
  type: '任务类型',
  shop: '',
  retried: '是否重试',
};

function SubFlatList() {
  const [tab, setTab] = useState('all');
  const [chip, setChip] = useState('全部');
  const [creator, setCreator] = useState('');
  const [platform, setPlatform] = useState('发布平台');
  const [channel, setChannel] = useState('全部');
  const [type, setType] = useState('任务类型');
  const [shop, setShop] = useState('');
  const [retried, setRetried] = useState('是否重试');
  const [applied, setApplied] = useState<FlatFilter>(defaultFlatFilter);
  const [checked, setChecked] = useState<string[]>([]);

  const count = (st: SubTask['status']) => flatAll.filter((r) => r.sub.status === st).length;
  const tabs = [
    { key: 'all', text: '全部', n: flatAll.length },
    { key: 'queued', text: '队列中', n: count('queued') },
    { key: 'running', text: '执行中', n: count('running') },
    { key: 'done', text: '已完成', n: count('success') },
    { key: 'failed', text: '执行失败', n: count('failed') },
  ];

  const snapshot = (nextTab: string, nextChip?: string): FlatFilter => ({
    tab: nextTab,
    chip: nextChip ?? chip,
    creator: creator.trim(),
    platform,
    channel,
    type,
    shop: shop.trim(),
    retried,
  });
  const onTab = (key: string) => {
    setTab(key);
    setChecked([]);
    setApplied(snapshot(key));
  };
  const onChip = (c: string) => {
    setChip(c);
    setChecked([]);
    setApplied(snapshot(tab, c));
  };
  const onSearch = () => setApplied(snapshot(tab));
  const onReset = () => {
    setChip('全部');
    setCreator('');
    setPlatform('发布平台');
    setChannel('全部');
    setType('任务类型');
    setShop('');
    setRetried('是否重试');
    setTab('all');
    setChecked([]);
    setApplied(defaultFlatFilter);
  };
  const onBatchRetry = () => {
    if (!checked.length) {
      alert('请先勾选需要重试的任务');
      return;
    }
    alert(`已发起 ${checked.length} 个任务的批量重试（演示）`);
  };

  const visible = flatAll.filter((r) => {
    const okTab =
      applied.tab === 'all' ||
      (applied.tab === 'done' ? r.sub.status === 'success' : applied.tab === 'failed' ? r.sub.status === 'failed' : r.sub.status === applied.tab);
    const okChip = applied.tab !== 'failed' || applied.chip === '全部' || r.sub.reason === applied.chip;
    const okCreator = !applied.creator || r.parent.creator.indexOf(applied.creator) > -1;
    const okPlatform = applied.platform === '发布平台' || r.sub.platform === applied.platform;
    const okChannel = applied.channel === '全部' || r.parent.channel === applied.channel;
    const okType = applied.type === '任务类型' || r.parent.type === applied.type;
    const okShop = !applied.shop || r.sub.shop.indexOf(applied.shop) > -1;
    const okRetried = applied.retried === '是否重试' || (applied.retried === '是') === r.sub.retried;
    return okTab && okChip && okCreator && okPlatform && okChannel && okType && okShop && okRetried;
  });

  const isFailed = tab === 'failed';
  const allChecked = visible.length > 0 && visible.every((r) => checked.includes(`${r.parent.id}-${r.sub.id}`));
  const toggleAll = () => setChecked(allChecked ? [] : visible.map((r) => `${r.parent.id}-${r.sub.id}`));
  const toggleOne = (key: string, on: boolean) => setChecked((prev) => (on ? [...prev, key] : prev.filter((x) => x !== key)));

  return (
    <>
      <div className="tc-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`tc-tab ${tab === t.key ? 'active' : ''}`} onClick={() => onTab(t.key)}>
            {t.text}({t.n})
          </button>
        ))}
      </div>

      <div className="tc-filter">
        {isFailed && (
          <div className="tc-chips">
            {['全部', '发品超限', '库存不足', '其它'].map((c) => (
              <button key={c} className={`tc-chip ${chip === c ? 'active' : ''}`} onClick={() => onChip(c)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <div className="sg-grid">
          <div className="sg-field">
            <label>创建人</label>
            <input className="sg-input" placeholder="请输入创建人" value={creator} onChange={(e) => setCreator(e.target.value)} />
          </div>
          <div className="sg-field">
            <label>发布平台</label>
            <BubbleSelect className="sg-select" value={platform} onChange={setPlatform} options={platformOptions} />
          </div>
          <div className="sg-field">
            <label>渠道</label>
            <BubbleSelect className="sg-select" value={channel} onChange={setChannel} options={channelOptions} />
          </div>
          <div className="sg-field">
            <label>任务类型</label>
            <BubbleSelect className="sg-select" value={type} onChange={setType} options={typeOptions} />
          </div>
          <div className="sg-field">
            <label>发布店铺名称</label>
            <input className="sg-input" placeholder="请输入发布店铺名称" value={shop} onChange={(e) => setShop(e.target.value)} />
          </div>
          <div className="sg-field">
            <label>创建时间</label>
            <Range />
          </div>
          {tab !== 'queued' && (
            <div className="sg-field">
              <label>执行时间</label>
              <Range />
            </div>
          )}
          {isFailed && (
            <div className="sg-field">
              <label>是否重试</label>
              <BubbleSelect className="sg-select" value={retried} onChange={setRetried} options={['是否重试', '是', '否']} />
            </div>
          )}
        </div>
        <div className="sg-actions">
          <div className="sg-mini"></div>
          <div className="sg-rightacts">
            {isFailed && (
              <button className="sg-btn primary" onClick={onBatchRetry}>
                批量重试
              </button>
            )}
            <button className="sg-btn" onClick={onReset}>
              重置
            </button>
            <button className="sg-btn primary" onClick={onSearch}>
              查询
            </button>
          </div>
        </div>
      </div>

      <div className="tc-table-card">
        <div className="tc-table-wrap">
          <table className="tc-table tc-detail">
            <thead>
              <tr>
                {isFailed && (
                  <th style={{ width: 72 }}>
                    <label className="tc-check">
                      <input type="checkbox" className="ib-check" checked={allChecked} onChange={toggleAll} />
                      选择
                    </label>
                  </th>
                )}
                <th style={{ width: 64 }}>序号</th>
                <th>商品信息</th>
                <th>任务类型</th>
                <th>节点状态</th>
                <th>任务状态</th>
                <th>平台/店铺</th>
                <th>创建人</th>
                <th>渠道</th>
                <th>
                  执行起止时间 <span className="tc-sort">⇅</span>
                </th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => (
                <tr key={`${r.parent.id}-${r.sub.id}`}>
                  {isFailed && (
                    <td>
                      <input
                        type="checkbox"
                        className="ib-check"
                        checked={checked.includes(`${r.parent.id}-${r.sub.id}`)}
                        onChange={(e) => toggleOne(`${r.parent.id}-${r.sub.id}`, e.target.checked)}
                      />
                    </td>
                  )}
                  <td>{i + 1}</td>
                  <td>
                    <div className="tc-product">
                      <img className="tc-thumb" src={r.sub.thumb} />
                      <div>
                        <div className="tc-pname">{r.sub.name}</div>
                        <div className="tc-pmeta">竞品链接：{r.sub.linkId}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.parent.type}</td>
                  <td>
                    <div className={`tc-steps ${r.sub.status === 'queued' ? 'gray' : ''}`}>
                      {stepsOf(r.sub).map((st, si) => (
                        <div className="tc-step" key={stepLabels[si]}>
                          <i className={st.dot} />
                          <span>{stepLabels[si]}：</span>
                          <span className={`v ${st.cls}`}>{st.v}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`tc-st ${subStatusCls[r.sub.status]}`}>
                      <i />
                      {subStatusText[r.sub.status]}
                    </span>
                  </td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>{r.sub.platform}</div>
                      <div>{r.sub.shop}</div>
                    </div>
                  </td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>{r.parent.creator}</div>
                      <div>{r.parent.createTime}</div>
                    </div>
                  </td>
                  <td>{r.parent.channel}</td>
                  <td>
                    <div className="tc-cell-lines">
                      <div>起：{r.sub.startTime || '–'}</div>
                      <div>止：{r.sub.endTime || '–'}</div>
                    </div>
                  </td>
                  <td className="actions-col">
                    {r.sub.status === 'failed' ? <a className="tc-link">重试</a> : <span className="tc-dash">–</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/** 任务中心页：按任务批次 / 按任务详情 两种视角可切换 */
export default function TaskCenterPage() {
  const [mode, setMode] = useState<'batch' | 'detail'>('batch');
  const [detail, setDetail] = useState<ParentTask | null>(null);
  return (
    <div className="tc-page">
      <div className="tc-mode">
        <button
          className={mode === 'batch' ? 'active' : ''}
          onClick={() => {
            setMode('batch');
            setDetail(null);
          }}
        >
          按任务批次
        </button>
        <button className={mode === 'detail' ? 'active' : ''} onClick={() => setMode('detail')}>
          按任务详情
        </button>
      </div>
      {mode === 'batch' ? (
        detail ? (
          <>
            <button className="tc-back" onClick={() => setDetail(null)}>
              ‹ 返回
            </button>
            <SubDetail parent={detail} />
          </>
        ) : (
          <ParentList onDetail={setDetail} />
        )
      ) : (
        <SubFlatList />
      )}
    </div>
  );
}
