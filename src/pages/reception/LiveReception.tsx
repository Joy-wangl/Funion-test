/* =========================================================
   聚合接待 · 实时客服接待（平台账号接待监控）
   按用户截图 1:1 还原：8 平台 tab + 筛选统计 + 店铺卡/账号卡
   功能先按截图搭好，待用户后续重构指令
   ========================================================= */
import { useMemo, useState } from 'react';
import { LIVE_PLATFORMS, liveStoresOf, type LivePlatform, type LiveStore } from './liveData';
import { RC_COMPANY, RC_GROUPS } from './data';

const nowStr = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

/** 每店默认展示账号卡数，其余收在「查看更多(N个)」 */
const PAGE = 6;

export default function LiveReception() {
  const [platform, setPlatform] = useState<LivePlatform>('拼多多');
  const [stores, setStores] = useState<LiveStore[]>(() => liveStoresOf('拼多多'));
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [nameDraft, setNameDraft] = useState('');
  const [nameApplied, setNameApplied] = useState('');
  const [updatedAt, setUpdatedAt] = useState('2026-08-23 10:52:51');

  const shown = useMemo(
    () =>
      nameApplied
        ? stores.filter((s) => s.name.includes(nameApplied) || s.accounts.some((a) => a.name.includes(nameApplied)))
        : stores,
    [stores, nameApplied],
  );

  const stats = useMemo(() => {
    const all = stores.flatMap((s) => s.accounts);
    return {
      online: all.filter((a) => a.pc).length,
      recv: stores.reduce((n, s) => n + s.recv, 0),
      unreplied: stores.reduce((n, s) => n + s.unreplied, 0),
      chat: all.filter((a) => a.unreplied > 0).length,
    };
  }, [stores]);

  const switchPlatform = (p: LivePlatform) => {
    setPlatform(p);
    setStores(liveStoresOf(p));
    setExpanded({});
  };

  const toggleSwitch = (storeName: string, accId: number, key: 'recvSwitch' | 'loginSwitch') => {
    setStores((v) =>
      v.map((s) =>
        s.name !== storeName
          ? s
          : { ...s, accounts: s.accounts.map((a) => (a.id === accId ? { ...a, [key]: !a[key] } : a)) },
      ),
    );
  };

  const query = () => {
    setNameApplied(nameDraft.trim());
    setUpdatedAt(nowStr());
  };

  return (
    <div className="rc-view rc-live">
      {/* ---------- 平台 tab ---------- */}
      <div className="qc-body rc-live-tabs">
        {LIVE_PLATFORMS.map((p) => (
          <span key={p} className={`rc-live-tab ${p === platform ? 'cur' : ''}`} onClick={() => switchPlatform(p)}>
            {p}
          </span>
        ))}
      </div>

      {/* ---------- 筛选 + 统计 ---------- */}
      <div className="qc-body rc-live-filter">
        <div className="rc-live-filter-left">
          <div className="rc-filter-row">
            <select className="select" defaultValue="" onChange={() => {}}>
              <option value="">公司</option>
              <option>{RC_COMPANY}</option>
            </select>
            <select className="select" defaultValue="" onChange={() => {}}>
              <option value="">分组</option>
              {RC_GROUPS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
            <input
              className="input rc-input"
              placeholder="店铺名称/登录账号"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') query();
              }}
            />
          </div>
          <div className="rc-filter-row">
            <select className="select" defaultValue="" onChange={() => {}}>
              <option value="">未回复筛选</option>
            </select>
            <select className="select" defaultValue="" onChange={() => {}}>
              <option value="">警告状态</option>
            </select>
            <select className="select" defaultValue="" onChange={() => {}}>
              <option value="">接待开关</option>
            </select>
          </div>
        </div>
        <div className="rc-live-right">
          <div className="rc-live-stats">
            <span className="rc-live-stat green">在线： {stats.online}</span>
            <span className="rc-live-stat green">接待： {stats.recv}</span>
            <span className="rc-live-stat yellow">未回复： {stats.unreplied}</span>
            <span className="rc-live-stat yellow">聊天服务账号未回复： {stats.chat}</span>
            <span className="rc-live-stat red">紧急： 0</span>
            <span className="rc-live-stat red">严重： 0</span>
          </div>
          <div className="rc-live-actions">
            <button className="btn primary" onClick={query}>查询数据</button>
            <span className="rc-warn-tip">
              友情提醒：频繁刷新
              <br />
              可能会导致账号异常
            </span>
            <button className="btn primary" onClick={() => setUpdatedAt(nowStr())}>拉取全部未回复</button>
            <span className="rc-updated">最近更新： {updatedAt}</span>
          </div>
        </div>
      </div>

      {/* ---------- 店铺卡 ---------- */}
      {shown.length === 0 ? (
        <div className="qc-body rc-live-empty">暂无数据</div>
      ) : (
        <div className="rc-live-stores">
          {shown.map((s) => {
            const open = !!expanded[s.name];
            const list = open ? s.accounts : s.accounts.slice(0, PAGE);
            return (
              <div className="qc-body rc-store" key={s.name}>
                <div className="rc-store-head">
                  <b className="rc-store-name">{s.name}</b>
                  <span className="rc-store-m">接待： <b>{s.recv}</b></span>
                  <span className="rc-store-m">未回复： <b className={s.unreplied > 0 ? 'red' : ''}>{s.unreplied}</b></span>
                  <span className="rc-store-m">回复率： <b>{s.rate}</b></span>
                  <a className="rc-link">平台订单分流</a>
                  <span className="rc-store-sp" />
                  <button className="btn sm" onClick={() => setUpdatedAt(nowStr())}>刷新店铺数据</button>
                  <span className="rc-store-m">总数： {s.total}</span>
                </div>

                <div className="rc-noroute">
                  <b>不分流账号：</b>
                  <span className="rc-noroute-txt">{s.noRoute.join('、')}</span>
                  <a className="rc-link">修改</a>
                </div>

                <div className="rc-accs">
                  {list.map((a) => (
                    <div className={`rc-acc ${a.pc ? 'hot' : ''}`} key={a.id}>
                      <div className="rc-acc-head">
                        <span className="rc-acc-name">{a.name}</span>
                        <span className="rc-acc-id">ID: {a.id}</span>
                      </div>
                      <div className="rc-acc-chips">
                        <span className={`rc-live-chip ${a.pc ? 'on' : ''}`}>PC: {a.pc ? '在线' : '离线'}</span>
                        <span className={`rc-live-chip ${a.mobile ? 'on' : ''}`}>移动: {a.mobile ? '在线' : '离线'}</span>
                        {a.pull ? <button className="rc-pull">拉取未回复</button> : null}
                        {a.transfer ? <span className="rc-transfer">转移</span> : null}
                      </div>
                      <div className="rc-acc-stats">
                        <span>接待： <b>{a.recv}</b></span>
                        <span>未回复： <b className={a.unreplied > 0 ? 'red' : ''}>{a.unreplied}</b></span>
                      </div>
                      {a.full ? (
                        <div className="rc-acc-sw">
                          <span className="rc-sw-pair">
                            接待开关：
                            <span
                              className={`rc-switch ${a.recvSwitch ? 'on' : ''}`}
                              onClick={() => toggleSwitch(s.name, a.id, 'recvSwitch')}
                            >
                              <i />
                            </span>
                          </span>
                          <span className="rc-sw-pair">
                            登录开关：
                            <span
                              className={`rc-switch ${a.loginSwitch ? 'on' : ''}`}
                              onClick={() => toggleSwitch(s.name, a.id, 'loginSwitch')}
                            >
                              <i />
                            </span>
                          </span>
                          <span>在线</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                {s.total > PAGE ? (
                  <div className="rc-more" onClick={() => setExpanded((v) => ({ ...v, [s.name]: !open }))}>
                    {open ? '收起' : `查看更多(${s.total - PAGE}个)`}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
