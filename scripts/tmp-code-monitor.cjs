/* 验证：品控-线上 数据概览+监控列表 合并为一级路由「编码监控」+ 页内 tab 切换 */
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

  /* 侧栏：一级叶子只有「编码监控」，不再有独立的 数据概览/监控列表 叶子（店铺分监控子路由内的数据概览除外） */
  const topLeaves = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-side > .qc-nav:not(.qc-subnav):not(.qc-nav-parent) .qc-nav-text')].map((e) => e.textContent.trim()),
  );
  console.log('topLeaves:', JSON.stringify(topLeaves));
  r['nav.hasCodeMonitor'] = topLeaves.includes('编码监控');
  r['nav.noStandaloneOverview'] = topLeaves.filter((t) => t === '数据概览').length === 0;
  r['nav.noStandaloneList'] = topLeaves.filter((t) => t === '监控列表').length === 0;

  /* 点「编码监控」进入，默认数据概览 tab */
  await clickByText(page, '.qc-side > .qc-nav', '编码监控');
  await page.waitForTimeout(500);
  const tabs = await page.locator('.qc-main .qc-code-tabs button').allTextContents();
  r['tabs'] = tabs;
  r['tabs.two'] = tabs.length === 2 && tabs[0] === '数据概览' && tabs[1] === '监控列表';
  r['tab.overviewActive'] = (await page.locator('.qc-main .qc-code-tabs button.active').textContent()) === '数据概览';
  r['overview.rendered'] = (await page.locator('.qc-ov-panel').count()) > 0;
  await page.screenshot({ path: `${OUT}/code-monitor-overview.png` });

  /* 切到监控列表 tab */
  await page.locator('.qc-main .qc-code-tabs button:has-text("监控列表")').click();
  await page.waitForTimeout(500);
  r['list.rendered'] = (await page.locator('.qc-center-page .qc-wide, .qc-center-page tbody tr').count()) > 0;
  r['nav.stillActive'] = (await page.locator('.qc-side > .qc-nav:has-text("编码监控")').getAttribute('class'))?.includes('active') === true;
  await page.screenshot({ path: `${OUT}/code-monitor-list.png` });

  /* 概览卡点类型 → 落入监控列表 tab（跨模块跳转仍生效） */
  await page.locator('.qc-main .qc-code-tabs button:has-text("数据概览")').click();
  await page.waitForTimeout(400);
  const jumped = await clickByText(page, '.qc-ov-panel .type-card, .qc-ov-panel .flat-card', '质量问题');
  await page.waitForTimeout(500);
  r['jump.toList'] = (await page.locator('.qc-main .qc-code-tabs button.active').textContent()) === '监控列表';
  console.log('jumpClick:', jumped);

  /* 运维壳（非线上）侧栏保持 数据概览/监控列表 两叶子不变 */
  await clickByText(page, '.top-tabs-item', '运维管理后台');
  await page.waitForTimeout(600);
  const opsNav = await page.evaluate(() => {
    const side = [...document.querySelectorAll('.qc-side')].find((s) => s.textContent.includes('运维管理后台'));
    return side ? [...side.querySelectorAll('.qc-nav .qc-nav-text')].map((e) => e.textContent.trim()) : [];
  });
  console.log('opsNav:', JSON.stringify(opsNav));
  r['ops.unchanged'] = opsNav.includes('数据概览') && opsNav.includes('监控列表') && !opsNav.includes('编码监控');

  await browser.close();
  const fail = Object.entries(r).filter(([k, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(r, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})();
