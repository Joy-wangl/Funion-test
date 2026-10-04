/* 自动化配置（move 模块）PRD 原型截图：输出 public/prd-shots/mv-*.png */
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const OUT = 'D:/PM.funion/public/prd-shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--no-proxy-server'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });

let ok = false;
for (let i = 0; i < 4 && !ok; i++) {
  try {
    await page.goto('http://127.0.0.1:5174/#ops-center', { waitUntil: 'commit', timeout: 15000 });
    await page.waitForSelector('.top-tabs-item', { timeout: 10000 });
    ok = true;
  } catch { await page.waitForTimeout(1200); }
}
if (!ok) { console.error('DEV SERVER NOT READY'); process.exit(1); }

const clickText = (sel, txt) => page.evaluate(([s, t]) => {
  const el = [...document.querySelectorAll(s)].find((e) => e.textContent.trim() === t && e.offsetParent !== null);
  if (el) { el.click(); return true; }
  return false;
}, [sel, txt]);

console.log('tab', await clickText('.top-tabs-item', '智能运营中心'));
await page.waitForTimeout(500);
if (!(await page.locator('.mv-page').count())) {
  const tabAny = await page.evaluate(() => {
    const el = [...document.querySelectorAll('.top-tabs-item')].find((e) => e.textContent.includes('智能运营'));
    if (el) { el.click(); return true; }
    return false;
  });
  console.log('tabAny', tabAny);
  await page.waitForTimeout(500);
  console.log('parent', await clickText('.nav-parent', '自动化中心'));
  await page.waitForTimeout(400);
}
const leaf = await page.evaluate(() => {
  const el = [...document.querySelectorAll('.subnav')].find((e) => e.textContent.trim() === '自动化配置');
  if (el) { el.click(); return true; }
  return false;
});
console.log('leaf', leaf);
await page.waitForSelector('.mv-page', { timeout: 8000 });
await page.waitForTimeout(500);

/* 1. 列表整页 */
await page.screenshot({ path: OUT + '/mv-list.png', fullPage: true });

/* 2. 更多气泡（一次性·待执行行 at-07：平铺3+更多[删除]） */
const rowAt07 = page.locator('tr', { hasText: 'at-07' }).first();
await rowAt07.locator('a', { hasText: '更多' }).click();
await page.waitForSelector('.add-pop');
await page.waitForTimeout(250);
await page.screenshot({ path: OUT + '/mv-more-pop.png' });
await page.keyboard.press('Escape');
await page.evaluate(() => document.body.click());
await page.waitForTimeout(300);

/* 3. 删除二次确认弹窗（at-05 已禁用行，平铺含删除） */
const rowAt05 = page.locator('tr', { hasText: 'at-05' }).first();
await rowAt05.locator('a', { hasText: '删除' }).click();
await page.waitForSelector('.bp-rows');
await page.waitForTimeout(250);
await page.screenshot({ path: OUT + '/mv-del-modal.png' });
await clickText('.btn', '取消');
await page.waitForTimeout(300);

/* 4. 新建任务抽屉·步骤1 */
await clickText('.sg-actions button', '新建任务');
await page.waitForSelector('.mv-drawer');
await page.waitForTimeout(350);
await page.screenshot({ path: OUT + '/mv-drawer1.png' });

/* 5. 步骤2（发布策略+发布店铺）：填名称→选店铺→填条件阈值→下一步 */
await page.fill('.mv-drawer .sg-input', 'PRD演示-自动搬家任务');
await page.locator('.mv-drawer .mv-chip-add').first().click();
await page.waitForSelector('.mv-srcmodal');
await page.waitForTimeout(250);
await page.screenshot({ path: OUT + '/mv-shop-pick.png' });
await page.locator('.mv-srcmodal .mv-shopitem').nth(1).click();
await clickText('.mv-src-foot button', '确认');
await page.waitForTimeout(300);
/* 条件配置默认一行「销量 > 阈值」，填阈值过校验 */
await page.locator('.mv-drawer .mv-cond-val input').first().fill('50');
await page.waitForTimeout(200);
await clickText('.mv-dr-foot button', '下一步');
await page.waitForTimeout(350);
const step2 = await page.locator('.mv-drawer', { hasText: '发布策略' }).count();
console.log('step2', step2);
await page.screenshot({ path: OUT + '/mv-drawer2.png' });
await clickText('.mv-dr-foot button', '取消');
await page.waitForTimeout(300);

/* 注：编辑保存生效提醒 toast 寿命仅 2.6s 且依赖在途状态，PRD 直接复用 screenshots/mv-edit-note.png，不在此脚本产出 */

await browser.close();
console.log('shots done:', fs.readdirSync(OUT).filter((f) => f.startsWith('mv-')).join(', '));
