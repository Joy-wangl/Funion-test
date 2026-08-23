/* 运营组管理原型页无头截图，输出到 public/prd-shots/，供语雀 PRD 嵌图使用 */
import { chromium } from 'file:///D:/Funion/.playwright/package/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/prd-shots');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

/* 进入 权限设置-运营组管理（父级未展开时先展开） */
const entry = page.locator('text=运营组管理').first();
if (!(await entry.isVisible().catch(() => false))) await page.click('text=权限设置');
await entry.click();
await page.waitForSelector('.og-md');
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(OUT, 'og-main.png') });

/* 新建运营组 步骤2：选择组长（成员选择组件单选） */
await page.click('button:has-text("新建运营组")');
await page.fill('input[placeholder="请输入组名"]', '截图演示组');
await page.click('button:has-text("下一步：选择组长")');
await page.waitForSelector('.member-transfer');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'og-create2.png') });
await page.click('button:has-text("取消")');
await page.waitForTimeout(200);

/* 组长行：添加专员（多选批量） */
await page.click('text=添加专员');
await page.waitForSelector('.member-transfer');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'og-add.png') });
await page.click('button:has-text("取消")');
await page.waitForTimeout(200);

/* 组长行：转交组长（单选替换） */
await page.click('text=转交组长');
await page.waitForSelector('.member-transfer');
await page.waitForTimeout(300);
await page.screenshot({ path: path.join(OUT, 'og-transfer.png') });
await page.click('button:has-text("取消")');

await browser.close();
console.log('shots done:', fs.readdirSync(OUT).join(', '));
