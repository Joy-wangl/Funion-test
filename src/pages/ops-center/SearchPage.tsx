import { useState } from 'react';
import Ellipsis from '../../components/Ellipsis';

const PLATFORMS = [
  { name: '淘宝', color: '#ff7700' },
  { name: '京东', color: '#e1251b' },
  { name: '拼多多', color: '#e02e24' },
  { name: '1688', color: '#ff6a00' },
  { name: '抖音', color: '#111111' },
];

interface SsResult {
  platform: string;
  color: string;
  name: string;
  price: string;
  sales: number;
}

const NAME_POOL = [
  '便携水果刀削皮刀家用去皮神器创意款',
  '玻尿酸修护精华液补水保湿舒缓敏感肌',
  '立体拼图儿童益智拼装玩具恐龙款',
  '厨房置物架台面调料收纳架免打孔',
  '指甲刀套装全套耳勺指甲钳斜口修剪',
  '多功能料理机家用小型便携果汁杯',
];

/** 全网搜索（集成式竞品搜索） */
export default function SearchPage() {
  const [kw, setKw] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<SsResult[]>([]);

  const doSearch = () => {
    const key = kw.trim();
    if (!key) return;
    const plats = PLATFORMS.filter((p) => checked[p.name]);
    const use = plats.length ? plats : PLATFORMS;
    const list: SsResult[] = [];
    use.forEach((p, pi) => {
      for (let i = 0; i < 3; i++) {
        list.push({
          platform: p.name,
          color: p.color,
          name: `${key} ${NAME_POOL[(pi + i) % NAME_POOL.length]}`,
          price: (19.9 + ((pi + i) * 37) % 180).toFixed(2),
          sales: 1200 + ((pi * 7 + i * 13) % 40) * 337,
        });
      }
    });
    setResults(list);
    setSearched(true);
  };

  const clear = () => {
    setSearched(false);
    setResults([]);
  };

  return (
    <div className="ss-page">
      <div className="ss-card">
        <div className="ss-row1">
          <span className="ss-title">集成式竞品搜索</span>
          <input
            className="ss-input"
            placeholder="输入竞品关键词，回车或点击全网搜索"
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') doSearch();
            }}
          />
          <button className="sg-btn primary" onClick={doSearch}>全网搜索</button>
          <button className="sg-btn" onClick={clear}>清空结果</button>
        </div>
        <div className="ss-row2">
          <span className="ss-label">搜索平台：</span>
          {PLATFORMS.map((p) => (
            <label className="ss-plat" key={p.name}>
              <input
                type="checkbox"
                checked={!!checked[p.name]}
                onChange={(e) => setChecked({ ...checked, [p.name]: e.target.checked })}
              />
              <span className="ss-dot" style={{ background: p.color }} />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      <div className="ss-result">
        {!searched ? (
          <div className="ss-empty">
            <svg className="ss-empty-icon" viewBox="0 0 48 48" width="56" height="56">
              <circle cx="21" cy="21" r="13" fill="none" stroke="#9aa2b1" strokeWidth="3" />
              <line x1="31" y1="31" x2="42" y2="42" stroke="#9aa2b1" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <div className="ss-empty-text">输入关键词，一键在多个电商平台搜索竞品</div>
            <div className="ss-empty-sub">支持： 淘宝 / 京东 / 拼多多 / 1688 / 抖音</div>
          </div>
        ) : (
          <div className="ss-list">
            {results.map((r, i) => (
              <div className="ss-item" key={i}>
                <span className="ss-item-plat">
                  <span className="ss-dot" style={{ background: r.color }} />
                  {r.platform}
                </span>
                <span className="ss-item-name"><Ellipsis text={r.name} /></span>
                <span className="ss-item-price">¥{r.price}</span>
                <span className="ss-item-sales">销量 {r.sales.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
