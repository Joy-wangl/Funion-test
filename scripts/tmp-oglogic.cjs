/* 临时验证：运营组新逻辑（组长可兼任多组 + 助理可直挂组长） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.click('.top-tabs-item:has-text("运营中心")');
  const ogEntry = page.locator('text=运营组管理').first();
  if (!(await ogEntry.isVisible().catch(() => false))) await page.click('text=权限设置');
  await ogEntry.click();
  await page.waitForSelector('.og-md');

  const results = {};

  /* ---------- A. 新建组可选已在任组长（同平台），专员仍禁选 ---------- */
  await page.click('button:has-text("新建运营组")');
  await page.fill('input[placeholder="请输入组名"]', '多组测试');
  await page.click('button:has-text("下一步：选择组长")');
  await page.waitForSelector('.member-transfer');

  await page.fill('.member-transfer-left input[placeholder="搜索成员"]', '黄亚芳');
  await page.waitForSelector('.mtr-row:has-text("黄亚芳")');
  results['create.leaderSelectable'] = (await page.locator('.mtr-row.disabled:has-text("黄亚芳")').count()) === 0;

  await page.fill('.member-transfer-left input[placeholder="搜索成员"]', '孙倩');
  await page.waitForSelector('.mtr-row:has-text("孙倩")');
  results['create.specStillDisabled'] = (await page.locator('.mtr-row.disabled:has-text("孙倩")').count()) === 1;

  await page.fill('.member-transfer-left input[placeholder="搜索成员"]', '黄亚芳');
  await page.click('.mtr-row:has-text("黄亚芳")');
  await page.click('.modal button:has-text("创建")');
  await page.waitForSelector('.og-md-item:has-text("多组测试")');
  results['create.newGroupWithSameLeader'] = (await page.locator('.og-md-item:has-text("多组测试") .og-md-item-sub:has-text("黄亚芳")').count()) === 1;
  results['create.oldGroupKeepsLeader'] = (await page.locator('.og-md-item:has-text("黄亚芳大组") .og-md-item-sub:has-text("黄亚芳")').count()) === 1;

  /* ---------- B. 组长行「更多→添加助理」直挂助理 ---------- */
  await page.click('.og-md-item:has-text("黄亚芳大组")');
  await page.waitForSelector('.og-detail .og-tr:has-text("运营组长")');
  await page.click('.og-detail .og-tr:has-text("运营组长") a:has-text("更多")');
  await page.click('.add-pop-item:has-text("添加助理")');
  await page.waitForSelector('.modal:has-text("添加运营助理")');

  await page.fill('.modal input[placeholder="搜索成员"]', '郑婷');
  await page.waitForSelector('.modal .mtr-row:has-text("郑婷")');
  results['assis.pickEnabled'] = (await page.locator('.modal .mtr-row.disabled:has-text("郑婷")').count()) === 0;
  await page.click('.modal .mtr-row:has-text("郑婷")');
  await page.click('.modal button:has-text("确认添加")');

  await page.waitForSelector('.og-detail .og-tr:has-text("运营组长") .og-g-count:has-text("1助理")');
  results['assis.badgeOnLeader'] = true;

  await page.click('.og-detail .og-tr:has-text("运营组长")');
  await page.waitForSelector('.og-detail .og-tr.sub:has-text("郑婷")');
  results['assis.rowUnderLeader'] = (await page.locator('.og-detail .og-tr.sub:has-text("郑婷") .og-role-tag:has-text("运营助理")').count()) === 1;

  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-oglogic.png` });

  await browser.close();
  let fail = 0;
  for (const [k, v] of Object.entries(results)) {
    if (!v) fail++;
    console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  }
  console.log(fail === 0 ? 'OGLOGIC VERIFY OK' : `OGLOGIC VERIFY FAIL(${fail})`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
