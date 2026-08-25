/* 临时验证：商品创建-淘宝 更多菜单新增「关联发布任务」+ 选任务弹窗 + toast */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.ops-center .side');

  const results = {};

  /* 进入商品创建-淘宝 */
  await page.click('.nav-parent:has-text("商品创建")');
  await page.waitForTimeout(200);
  await page.click('.subnav:has-text("淘宝")');
  await page.waitForSelector('.create-table tbody tr');

  /* 更多菜单：关联发布任务在列 */
  await page.locator('.create-ops a:has-text("更多")').first().click();
  await page.waitForSelector('.add-pop');
  const menuTexts = await page.locator('.add-pop .add-pop-item').allTextContents();
  results['menu.items'] = menuTexts.join(',') === '关联发布任务,复制,删除';

  /* 点击关联发布任务：弹窗列出可关联任务批次 */
  await page.click('.add-pop .add-pop-item:has-text("关联发布任务")');
  await page.waitForSelector('.cp-modal:has-text("关联发布任务")');
  results['modal.title'] = (await page.locator('.cp-modal-title:has-text("关联发布任务")').count()) === 1;
  results['modal.rowTitle'] = ((await page.locator('.cp-modal-text').textContent()) || '').includes('玫瑰小众轻奢复古耳钉');
  const taskCount = await page.locator('.cp-task-item').count();
  results['modal.tasks'] = taskCount >= 1;
  await page.waitForTimeout(200);
  await page.screenshot({ path: 'd:/Qoder/Funion/vue-verify-cplink.png' });

  /* 选择首个任务：关闭弹窗 + toast */
  await page.locator('.cp-task-item').first().click();
  await page.waitForTimeout(200);
  results['link.toast'] = (await page.locator(':text("已关联发布任务")').count()) >= 1;
  results['modal.closed'] = (await page.locator('.cp-modal').count()) === 0;

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'CPLINK VERIFY OK' : `CPLINK VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
