/* 验证：聚合接待表格列头单排、去除 分组/客服(外)/值班监控 列与分组级表头 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(600);
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('table.rc-tree');
  await page.waitForTimeout(300);

  // 外层表头：单排
  const headRows = await page.locator('table.rc-tree > thead tr').count();
  const headTxt = ((await page.locator('table.rc-tree > thead').textContent()) || '');
  const ths = await page.$$eval('table.rc-tree > thead th', els => els.map(e => (e.textContent || '').trim()));
  // 内层子表表头
  const subTxt = ((await page.locator('table.rc-sub thead').textContent()) || '');

  await page.screenshot({ path: `${OUT}/rc-head-single.png`, clip: { x: 200, y: 150, width: 1400, height: 620 } });

  const gone = ['分组', '值班监控', '接待量', '会话监控', '绩效指标', '客服'].every((k) => !ths.includes(k));
  const kept = ['所属公司', 'AI接待量', '3分钟回复率', '策略状态', '操作'].every((k) => headTxt.includes(k));
  const subGone = !subTxt.includes('值班监控') && !subTxt.includes('分组');
  const subKept = subTxt.includes('客服') && subTxt.includes('接待状态');
  console.log(`headRows=${headRows} outerGone=${gone} outerKept=${kept} subGone=${subGone} subKept=${subKept}`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
