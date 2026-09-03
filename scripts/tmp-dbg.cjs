/* 临时调试：内部商机 ib-actions 实际 DOM */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1800, height: 900 } });
  await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await p.click('.top-tabs-item:has-text("智能运营中心")');
  await p.waitForSelector('.ops-center');
  await p.click('.ops-center .subnav:has-text("内部商机")');
  await p.waitForSelector('.ib-filters');
  console.log('LEFTTIPS:', await p.locator('.ib-lefttips').count());
  console.log('RIGHTACTS:', await p.locator('.ib-rightacts').innerHTML());
  await b.close();
})();
