/* 验证：品控-线上 命中问题管理+问题商品定义 合并为一级路由「配置中心」+ 页内 tab 切换 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
const BASE = 'http://127.0.0.1:5173/';

const clickByText = (page, sel, text) =>
  page.evaluate(([sel, text]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.textContent.trim().includes(text));
    if (!el) return 'miss:' + text;
    el.click();
    return 'ok';
  }, [sel, text]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });

  const r = {};
  await clickByText(page, '.top-tabs-item', '品控-线上');
  await page.waitForTimeout(600);

  const topLeaves = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-side > .qc-nav:not(.qc-subnav):not(.qc-nav-parent) .qc-nav-text')].map((e) => e.textContent.trim()),
  );
  console.log('topLeaves:', JSON.stringify(topLeaves));
  r['nav.hasConfigCenter'] = topLeaves.includes('配置中心');
  r['nav.noHit'] = !topLeaves.includes('命中问题管理');
  r['nav.noPdef'] = !topLeaves.includes('问题商品定义');
  r['nav.codeMonitorKept'] = topLeaves.includes('编码监控');

  /* 点「配置中心」进入，默认命中问题管理 tab */
  await clickByText(page, '.qc-side > .qc-nav', '配置中心');
  await page.waitForTimeout(500);
  const tabs = await page.locator('.qc-main .qc-conf-tabs button').allTextContents();
  r['tabs'] = tabs;
  r['tabs.two'] = tabs.length === 2 && tabs[0] === '命中问题管理' && tabs[1] === '问题商品定义';
  r['tab.hitActive'] = (await page.locator('.qc-main .qc-conf-tabs button.active').textContent()) === '命中问题管理';
  r['hit.rendered'] = (await page.locator('.qc-center-page .qc-hm-wrap').count()) > 0;
  await page.screenshot({ path: `${OUT}/config-center-hit.png` });

  /* 切到问题商品定义 tab */
  await page.locator('.qc-main .qc-conf-tabs button:has-text("问题商品定义")').click();
  await page.waitForTimeout(500);
  r['pdef.rendered'] = (await page.locator('.qc-center-page .pd-panel').count()) > 0;
  r['nav.stillActive'] = (await page.locator('.qc-side > .qc-nav:has-text("配置中心")').getAttribute('class'))?.includes('active') === true;
  /* 页内原顶层 tab（编码配置/店铺评分配置）仍在 */
  r['pdef.innerTabs'] = (await page.locator('.qc-center-page .pd-panel .pd-cfg-tabs button').count()) === 2;
  await page.screenshot({ path: `${OUT}/config-center-pdef.png` });

  /* 切回命中问题管理 */
  await page.locator('.qc-main .qc-conf-tabs button:has-text("命中问题管理")').click();
  await page.waitForTimeout(400);
  r['back.hit'] = (await page.locator('.qc-main .qc-conf-tabs button.active').textContent()) === '命中问题管理';

  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
