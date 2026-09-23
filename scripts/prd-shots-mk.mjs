/* 市场商机模块原型页无头截图，输出到 public/prd-shots/，供语雀 PRD 嵌图使用 */
import { chromium } from 'file:///D:/Funion/.playwright/package/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/prd-shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1680, height: 1050 } });
await page.goto('http://localhost:5173/', { waitUntil: 'commit' });
await page.waitForTimeout(3500);

const clickLeaf = async (t) => {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('div,a,span,button')].filter((e) => e.textContent.trim() === t && !e.children.length && e.offsetParent !== null)[0];
    if (el) { el.click(); return true; }
    return false;
  }, t);
  console.log('click', t, ok);
  return ok;
};

/* 导航：智能运营中心 → 市场商机（商机中心组默认展开，勿点组头以免收起） */
await clickLeaf('智能运营中心');
await page.waitForTimeout(400);
await clickLeaf('市场商机');
await page.waitForTimeout(700);

/* 淘宝顺买默认列表 */
await page.screenshot({ path: path.join(OUT, 'mk-list.png') });

/* 创建任务弹窗 */
await clickLeaf('创建任务');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'mk-create.png') });
await clickLeaf('取消');
await page.waitForTimeout(300);

/* 设备状态面板＋任务执行情况弹窗（展开抓取记录） */
await page.click('.mk-dev-fab');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'mk-dev.png') });
await page.click('.mk-task-card');
await page.waitForTimeout(500);
await page.evaluate(() => {
  const a = [...document.querySelectorAll('.mk-task-table .mk-task-acts a')].find((x) => x.textContent.trim() === '查看' || x.textContent.trim() === '详情');
  if (a) a.click();
});
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'mk-task.png') });
await page.click('.mk-task-close');
await page.waitForTimeout(300);
await page.click('.mk-close-btn');
await page.waitForTimeout(300);

/* 视频号商机-小店商机 */
await clickLeaf('视频号商机');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'mk-xd.png') });

/* 视频号商机-推荐商机 */
await clickLeaf('推荐商机');
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(OUT, 'mk-vh.png') });

/* 商机详情下钻 */
await clickLeaf('淘宝顺买');
await page.waitForTimeout(500);
await clickLeaf('详情');
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(OUT, 'mk-detail.png') });

await browser.close();
console.log('shots done:', fs.readdirSync(OUT).filter((f) => f.startsWith('mk-')).join(', '));
