/* 出图：项目管理(IT部) LOGO(1:1) + 三张详情图（项目详情/任务详情/迭代详情） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/public/pm';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1700, height: 1200 }, deviceScaleFactor: 2 });
  await page.goto('file:///d:/Qoder/Funion/scripts/pm-mock.html', { waitUntil: 'load' });
  await page.waitForTimeout(300);

  /* LOGO 1:1，圆角外透明 */
  await page.locator('#pm-logo').screenshot({ path: `${OUT}/pm-logo.png`, omitBackground: true });
  /* 三张详情图 */
  await page.locator('#page-project').screenshot({ path: `${OUT}/pm-detail-project.png` });
  await page.locator('#page-task').screenshot({ path: `${OUT}/pm-detail-task.png` });
  await page.locator('#page-sprint').screenshot({ path: `${OUT}/pm-detail-sprint.png` });

  for (const f of ['pm-logo.png', 'pm-detail-project.png', 'pm-detail-task.png', 'pm-detail-sprint.png']) {
    const s = fs.statSync(`${OUT}/${f}`);
    console.log(f, s.size);
  }
  await browser.close();
})();
