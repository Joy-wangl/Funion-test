/* 临时：核对双端口环境差异（正式无 code-kb / 开发有） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const [port, label] of [[5173, 'prod'], [5174, 'dev']]) {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'commit' });
    await page.waitForTimeout(6000);
    const has = await page.locator('.side .nav-parent', { hasText: '系列编码知识库' }).count();
    console.log(`${label}(${port}) code-kb-nav:`, has);
    await page.close();
  }
  await browser.close();
})();
