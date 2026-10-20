/* 待办卡素材单类型验证：有范围（商品卡/店铺芯片）的卡不再混排附件；无范围的卡仍展示文件/视频/图片 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.evaluate(() => { [...document.querySelectorAll('.qc-nav-text')].find((n) => n.textContent.trim() === '待办任务')?.click(); });
  await page.waitForTimeout(900);
  const out = { pills: {} };
  const readCards = () => page.evaluate(() => [...document.querySelectorAll('.qc-todo-card')].map((c) => ({
    title: c.querySelector('.td-title')?.textContent.trim(),
    good: c.querySelectorAll('.td-good').length,
    shop: c.querySelectorAll('.td-shop').length,
    media: c.querySelectorAll('.td-thumb, .td-file').length,
  })));
  for (const pill of ['待处理的', '已处理的', '我发起的']) {
    await page.evaluate((p) => { [...document.querySelectorAll('.qc-todo-pill button')].find((b) => b.textContent.includes(p))?.click(); }, pill);
    await page.waitForTimeout(700);
    const cards = await readCards();
    out.pills[pill] = cards;
    out.pills[`${pill}_mixed`] = cards.filter((c) => (c.good > 0 || c.shop > 0) && c.media > 0).map((c) => c.title);
    if (pill === '待处理的') await page.screenshot({ path: 'D:/PM.funion/screenshots/todo-onemat.png' });
  }
  out.errs = errs;
  console.log(JSON.stringify(out, null, 2));
  await browser.close();
})();
