/* 验证：市场商机 › 竞店商品 › 店铺商品 › 屏蔽店铺 icon 点击打开店铺选择器，选中店铺后列表过滤 */
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

  /* 进入市场商机 */
  await page.click('.ops-center .side .subnav:has-text("市场商机")');
  await page.waitForSelector('.mk-page');

  /* 竞店商品 tab */
  await page.click('.mk2-tab:has-text("竞店商品")');
  await page.waitForSelector('.mk-jd-pane');

  /* 店铺商品子 tab */
  await page.click('.mk2-subtab:has-text("店铺商品")');
  await page.waitForFunction(() => document.querySelectorAll('.mk-jd-table tbody tr').length > 0);

  /* 屏蔽店铺 icon 可见 */
  const blockBtn = page.locator('.mk-shop-block-btn');
  results['blockBtnVisible'] = await blockBtn.isVisible();

  await cdpScreenshot(page, path.join(OUT, 'mk-jd-goods-block-btn.png'));

  /* 点击打开选择器 */
  await blockBtn.click();
  await page.waitForSelector('.mk-shop-block-menu');
  results['blockMenuOpen'] = await page.locator('.mk-shop-block-menu').isVisible();

  await cdpScreenshot(page, path.join(OUT, 'mk-jd-goods-block-menu.png'));

  /* 获取当前列表行数 */
  const initialRowCount = await page.locator('.mk-jd-table.mk-jd-goods-table tbody tr').count();
  results['initialRowCount'] = initialRowCount;

  /* 选择第一个店铺（嘉晨日用百货） */
  const firstShop = page.locator('.mk-shop-block-menu .msel-opt').first();
  const shopName = await firstShop.locator('.msel-label').innerText();
  await firstShop.click();
  results['shopSelected'] = shopName;

  /* 等待列表更新 */
  await page.waitForTimeout(300);

  /* 验证列表行数减少 */
  const filteredRowCount = await page.locator('.mk-jd-table.mk-jd-goods-table tbody tr').count();
  results['filteredRowCount'] = filteredRowCount;
  results['rowCountDecreased'] = filteredRowCount < initialRowCount;

  /* 验证 icon 显示激活态和计数 */
  results['blockBtnActive'] = await blockBtn.evaluate(el => el.classList.contains('active'));
  const countBadge = page.locator('.mk-shop-block-count');
  results['countBadgeVisible'] = await countBadge.isVisible();
  results['countBadgeText'] = await countBadge.innerText();

  await cdpScreenshot(page, path.join(OUT, 'mk-jd-goods-block-filtered.png'));

  /* 清空选择 */
  const clearBtn = page.locator('.mk-shop-block-menu .msel-head-btn:has-text("清空")');
  await clearBtn.click();
  await page.waitForTimeout(300);

  /* 验证列表恢复 */
  const restoredRowCount = await page.locator('.mk-jd-table.mk-jd-goods-table tbody tr').count();
  results['restoredRowCount'] = restoredRowCount;
  results['rowCountRestored'] = restoredRowCount === initialRowCount;

  /* 关闭菜单 */
  await page.click('body');
  await page.waitForTimeout(200);
  results['blockMenuClosed'] = await page.locator('.mk-shop-block-menu').count() === 0;

  await browser.close();

  const fail = Object.entries(results).filter(([, v]) => typeof v === 'boolean' && !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  if (fail.length) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
