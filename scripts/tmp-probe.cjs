/* 探针：首屏/侧栏/子导航可见性诊断 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 900 } });
  p.on('pageerror', (e) => console.log('PAGEERR:', String(e).slice(0, 300)));
  p.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text().slice(0, 300)); });
  await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  console.log('tabs:', JSON.stringify(await p.locator('.top-tabs-item').allTextContents()));
  await p.click('.top-tabs-item:has-text("智能运营中心")').catch((e) => console.log('tabclick fail:', e.message.split('\n')[0]));
  await p.waitForTimeout(1000);
  console.log('ops visible:', await p.locator('.ops-center').first().isVisible().catch(() => false));
  console.log('subnav count:', await p.locator('.subnav').count());
  console.log('subnav tb count:', await p.locator('.subnav[title="淘宝"]').count(), 'visible:', await p.locator('.subnav[title="淘宝"]').first().isVisible().catch(() => false));
  console.log('navtext count:', await p.locator('.nav-text:has-text("商品创建")').count());
  console.log('sidebar collapsed cls:', await p.locator('.ops-sidebar, .ops-center aside, .ops-center .sidebar').first().getAttribute('class').catch(() => 'n/a'));
  await p.screenshot({ path: 'd:/Qoder/Funion/screenshots/tmp-probe.png' });
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
