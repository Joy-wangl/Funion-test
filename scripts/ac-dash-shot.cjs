/* 验证：数据看板入口+二级页、我的应用间距 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);

  // 入口：贡献榜头部「全部数据」
  const entry = await page.locator('.ap-rank-head .ap-link').textContent();
  await page.screenshot({ path: `${OUT}/ac-dash-entry.png`, clip: { x: 0, y: 300, width: 1100, height: 600 } });

  // 进入看板
  await page.click('.ap-rank-head .ap-link');
  await page.waitForSelector('.ap-dash');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-dash.png`, fullPage: true });

  // 数据概览：两个模块，应用数据概览在上，字段齐全
  const ovlTitles = await page.$$eval('.ap-dash-ovmod > h3', els => els.map(e => (e.firstChild ? e.firstChild.textContent : '').trim()));
  const ovlLbs = await page.$$eval('.ap-dash-ovmod:first-of-type .ap-dash-kpi .lb', els => els.map(e => e.textContent));
  const ovlTotal = await page.$eval('.ap-dash-ovmod .ap-dash-kpi .vl', el => el.textContent);

  // 范围切换
  await page.click('.ap-dash-range button:has-text("近7天")');
  await page.waitForTimeout(200);
  const on7 = await page.evaluate(() => document.querySelector('.ap-dash-range button.on')?.textContent);
  await page.screenshot({ path: `${OUT}/ac-dash-7d.png`, clip: { x: 200, y: 200, width: 1200, height: 500 } });

  // TOP10 重心区；行内趋势预览已移除，仅保留趋势图按钮
  const topN = await page.locator('.ap-dash-top3-row').count();
  const sparkRemoved = (await page.locator('.ap-dash-spark').count()) === 0;
  const trendBtnTxt = ((await page.locator('.ap-dash-trendcell').first().textContent()) || '').trim();
    const headTxt = ((await page.locator('.ap-dash-thead').textContent()) || '').trim();
    const headOk = !headTxt.includes('标记') && headTxt.endsWith('使用趋势');
  // 表头/内容对齐：同列表头与首行字段左缘同 x（表头入滚动容器后不受滚动条挤压）
  const headX = await page.$eval('.ap-dash-thead', el => Array.from(el.children).map(c => Math.round(c.getBoundingClientRect().x)));
  const rowX = await page.$eval('.ap-dash-trow', el => Array.from(el.children).map(c => Math.round(c.getBoundingClientRect().x)));
  const alignOk = headX.length === rowX.length && headX.every((x, i) => Math.abs(x - rowX[i]) <= 2);

  // 使用趋势弹窗：点击行内趋势图按钮 → 弹窗含指标 pills，可切周期，可关闭
  await page.click('.ap-dash-trendcell');
  await page.waitForSelector('.ap-trend-modal');
  const chipTxt = (await page.locator('.ap-trend-chips').textContent()) || '';
  const bandTxt = await page.$$eval('.ap-trend-svg .band-lb', els => els.map(e => e.textContent));
  // chips 可选择：点击隐藏总使用人次折线，再点恢复（参考品控交互）
  await page.click('.ap-trend-chip:has-text("总使用人次")');
  await page.waitForTimeout(200);
  const useOff = (await page.locator('.ap-trend-chip.off:has-text("总使用人次")').count()) === 1;
  const useLineHidden = (await page.locator('.ap-trend-svg polyline[stroke="#2e7cf6"]').count()) === 0;
  await page.click('.ap-trend-chip:has-text("总使用人次")');
  await page.waitForTimeout(200);
  const useBack = (await page.locator('.ap-trend-svg polyline[stroke="#2e7cf6"]').count()) === 1;
  const chipToggle = useOff && useLineHidden && useBack;
  // 自定义时间（与品控一致）：点自定义 → 日期触发器 → 改区间生效
  await page.click('.ap-trend-modal .ap-dash-range button:has-text("自定义")');
  await page.waitForSelector('.ap-date-trigger');
  await page.click('.ap-date-trigger');
  await page.waitForSelector('.ap-date-pop');
  const isoLocal = (off) => { const t = new Date(); t.setDate(t.getDate() - off); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
  const lbl = (off) => { const t = new Date(); t.setDate(t.getDate() - off); return `${t.getMonth() + 1}/${t.getDate()}`; };
  await page.locator('.ap-date-pop input').nth(0).fill(isoLocal(22));
  await page.locator('.ap-date-pop input').nth(1).fill(isoLocal(8));
  await page.waitForTimeout(250);
  const pdTxt = (await page.locator('.ap-trend-foot .pd').textContent()) || '';
  const customOk = pdTxt.includes(`${lbl(22)} → ${lbl(8)}`);
  // 悬浮交互（与品控一致）：悬浮出 tooltip+参考线，移开消失
  await page.hover('.ap-trend-svg', { position: { x: 450, y: 150 } });
  await page.waitForTimeout(200);
  const tipLines = await page.locator('.ap-trend-tip .ap-trend-tip-line').count();
  const tipGuide = (await page.locator('.ap-trend-svg line[stroke="#8a94a6"]').count()) === 1;
  await page.screenshot({ path: `${OUT}/ac-trend-tip.png` });
  await page.hover('.ap-trend-head');
  await page.waitForTimeout(200);
  const tipGone = (await page.locator('.ap-trend-tip').count()) === 0;
  const tipOk = tipLines === 2 && tipGuide && tipGone;
  await page.click('.ap-trend-modal .ap-dash-range button:has-text("近7天")');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/ac-dash-trend.png` });
  await page.click('.ap-trend-closebtn');
  await page.waitForTimeout(250);
  const trendClosed = (await page.locator('.ap-trend-modal').count()) === 0;

  // 搜索：ERP
  await page.fill('.ap-dash-search input', 'ERP');
  await page.waitForTimeout(200);
  const rowsErp = await page.locator('.ap-dash-trow').count();
  await page.fill('.ap-dash-search input', '');
  await page.waitForTimeout(200);

  // 类目筛选：下拉（BubbleSelect）选数据管理类
  await page.click('.ap-dash-cat-select .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-menu .bselect-opt:has-text("数据管理类")');
  await page.waitForTimeout(200);
  const catSelTxt = ((await page.locator('.ap-dash-cat-select .bselect-text').textContent()) || '').trim();
  const rowsCat = await page.locator('.ap-dash-trow').count();
  const cntN = await page.locator('.ap-dash-cnt').count();
  await page.screenshot({ path: `${OUT}/ac-dash-filter.png`, fullPage: true });
  await page.click('.ap-dash-cat-select .bselect-trigger');
  await page.waitForSelector('.bselect-menu');
  await page.click('.bselect-menu .bselect-opt:has-text("全部")');
  await page.waitForTimeout(200);
  const catReset = ((await page.locator('.ap-dash-cat-select .bselect-text').textContent()) || '').trim() === '全部';

  // 返回首页
  await page.click('.ap-dash-head .ap-back');
  await page.waitForSelector('.ap-home-rank-row');

  // 我的应用间距
  await page.click('.ap-side-user');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-mine-gap.png`, clip: { x: 0, y: 60, width: 1600, height: 420 } });

  console.log(`ovl=${ovlTitles.join('|')} lbs=${ovlLbs.join('/')} ovlTotal=${ovlTotal} entry=${entry} rangeOn=${on7} topN=${topN} sparkRemoved=${sparkRemoved} trendBtn=${trendBtnTxt} headOk=${headOk} alignOk=${alignOk} customOk=${customOk} tipOk=${tipOk} bands=${bandTxt.join('/')} noVer=${!chipTxt.includes('版本时间段')} chipToggle=${chipToggle} trendClosed=${trendClosed} rowsErp=${rowsErp} rowsCat=${rowsCat} cntRemoved=${cntN === 0} catSelOk=${catSelTxt === '数据管理类'} catReset=${catReset}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
