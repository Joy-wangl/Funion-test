/* 验证：详情页 App Store 风格（更新内容/新功能/评价/创作者/相关推荐） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);

  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForTimeout(500);
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(400);

  // 打开聚水潭ERP（有标签：高效/协同）
  await page.click('.ap-cell:has-text("聚水潭ERP")');
  await page.waitForSelector('.ap-whatsnew');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-detail-1-top.png` });

  // 滚动到评价区
  await page.locator('.ap-rev').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-detail-2-rev.png` });

  // 滚动到底部：创作者信息 + 相关推荐
  await page.locator('.ap-author').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-detail-3-bottom.png` });

  await page.evaluate(() => {
    const main = document.querySelector('.ap-main');
    const h = [...document.querySelectorAll('.ap-detail-sub')].find((x) => x.textContent.includes('相关推荐'));
    if (main && h) {
      const r = h.getBoundingClientRect();
      const m = main.getBoundingClientRect();
      main.scrollTop += r.top - m.top - 8;
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-detail-4-related.png` });

  await browser.close();
  console.log('ac detail shots ok');
})().catch((e) => { console.error(e); process.exit(1); });
