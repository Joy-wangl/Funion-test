/* 验证：市场商机 › 竞店商品 › 店铺商品已匹配行操作列出现「查看内部商品」，点击打开命中抽屉 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');
const path = require('path');
const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

const cdpScreenshot = async (page, file) => {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  await cdp.detach();
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const results = {};

  await page.goto('http://127.0.0.1:5173/#ops-center', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ops-center', { timeout: 60000 });

  /* 进入市场商机（商机中心分组下的 subnav） */
  await page.click('.ops-center .side .subnav:has-text("市场商机")');
  await page.waitForSelector('.mk-page');

  /* 竞店商品 tab */
  await page.click('.mk2-tab:has-text("竞店商品")');
  await page.waitForSelector('.mk-jd-pane');

  /* 店铺商品子 tab */
  await page.click('.mk2-subtab:has-text("店铺商品")');
  await page.waitForFunction(() => document.querySelectorAll('.mk-jd-table tbody tr').length > 0);

  /* 至少有一行已匹配 */
  const matchedRows = page.locator('.mk-jd-goods-table tbody tr:has(.mk-hits)');
  results['jd.matchRowsExist'] = await matchedRows.count() > 0;

  /* 第一行已匹配的操作列包含「查看内部商品」 */
  const firstMatched = matchedRows.first();
  const viewLink = firstMatched.locator('.actions-col a:has-text("查看内部商品")');
  results['jd.viewLinkVisible'] = await viewLink.isVisible();

  /* 商品信息列展示竞品链接 */
  const firstRow = page.locator('.mk-jd-goods-table tbody tr').first();
  results['jd.linkLabelVisible'] = await firstRow.locator('.mk-link-label:has-text("竞品链接：")').isVisible();
  results['jd.linkHrefVisible'] = await firstRow.locator('.mk-link').isVisible();

  /* 店铺商品操作列竖排：两个链接的 top 不同 */
  results['jd.actionsVertical'] = await firstMatched.evaluate((row) => {
    const links = Array.from(row.querySelectorAll('.actions-col a'));
    if (links.length < 2) return false;
    const boxes = links.map((a) => a.getBoundingClientRect());
    return boxes.every((b) => b.width > 0) && boxes[0].top < boxes[1].top && boxes[0].left === boxes[1].left;
  });

  await cdpScreenshot(page, path.join(OUT, 'mk-jd-goods-match-link.png'));

  /* 点击打开抽屉 */
  await viewLink.click();
  await page.waitForSelector('.mk-hit-drawer');
  results['jd.drawerOpen'] = await page.locator('.mk-hit-drawer').isVisible();

  /* 抽屉标题与内容 */
  const headText = await page.locator('.mk-hit-tt').innerText();
  results['jd.drawerHasTitle'] = headText.includes('内部商品命中');
  results['jd.drawerHasCount'] = /命中\s*\d+\s*个内部商品/.test(headText);
  results['jd.drawerHasRows'] = await page.locator('.mk-hit-table tbody tr').count() > 0;

  await cdpScreenshot(page, path.join(OUT, 'mk-jd-goods-match-drawer.png'));

  /* 关闭抽屉 */
  await page.click('.mk-hit-close');
  await page.waitForFunction(() => document.querySelector('.mk-hit-drawer') === null);
  results['jd.drawerClose'] = await page.locator('.mk-hit-drawer').count() === 0;

  await browser.close();

  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  if (fail.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
