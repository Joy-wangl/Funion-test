/* 临时验证：chevron 展开交互对齐品控系列列表 + 转移入操作列 + 在线状态上下标签 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-page .rc-tree');
  await page.click('.rc-menu-item:has-text("实时客服接待")');
  await page.waitForSelector('.rc-live-stores');
  await page.waitForTimeout(300);

  const store1 = page.locator('.rc-store').nth(0);

  /* 展开角标：svg chevron，与品控系列列表同款；无下级占位保对齐 */
  results['caret.svg'] = (await store1.locator('.rc-acc-caret svg').count()) >= 6;
  results['caret.ph'] = (await store1.locator('.rc-acc-caret.ph').count()) >= 3;
  const nameXs = await store1.locator('.rc-acc-name').evaluateAll((els) => els.slice(0, 4).map((e) => Math.round(e.getBoundingClientRect().x)));
  results['name.aligned'] = nameXs.every((x) => Math.abs(x - nameXs[0]) <= 1);

  /* 在线状态：上下排布，仅 PC/移动 文案，离线灰/在线绿 */
  const row1 = store1.locator('tbody tr').first();
  const chips = row1.locator('.rc-net-chip');
  results['chip.texts'] = ((await chips.allTextContents()).join(',')) === 'PC,移动';
  const c0 = await chips.nth(0).boundingBox();
  const c1 = await chips.nth(1).boundingBox();
  results['chip.stacked'] = !!c0 && !!c1 && c1.y > c0.y + c0.height - 2;
  results['chip.onGreen'] = (await store1.locator('.rc-net-chip.on').count()) >= 1;

  /* 转移：名称列无、操作列有（2334 行） */
  const alertRow = store1.locator('tr', { hasText: '售前麒翠' }).first();
  results['transfer.ops'] = (await alertRow.locator('td:last-child .rc-transfer').count()) === 1;
  results['transfer.notName'] = (await alertRow.locator('td:first-child .rc-transfer').count()) === 0;
  /* 转移为文本操作按钮（button + 透明底），与拉取同款 */
  results['transfer.btn'] = await alertRow.locator('.rc-transfer').evaluate((e) => {
    const cs = getComputedStyle(e);
    return e.tagName === 'BUTTON' && (cs.backgroundColor === 'rgba(0, 0, 0, 0)' || cs.backgroundColor === 'transparent');
  });

  /* 展开客服子行仍正常 */
  await alertRow.locator('.rc-acc-caret').click();
  await page.waitForTimeout(200);
  results['sub.expand'] = (await store1.locator('.rc-subrow').count()) === 2;
  /* 名称列两行同左缘：账号名/ID、客服名/分组，且子行与账号名对齐 */
  const align = await page.evaluate(() => {
    const name = document.querySelector('.rc-acc-name').getBoundingClientRect().x;
    const id = document.querySelector('.rc-acc-main .rc-acc-id').getBoundingClientRect().x;
    const sub = document.querySelector('.rc-sub-name').getBoundingClientRect().x;
    const grp = document.querySelector('.rc-subrow .rc-acc-id').getBoundingClientRect().x;
    return {
      idName: Math.abs(name - id) <= 1,
      subName: Math.abs(name - sub) <= 1,
      grpSub: Math.abs(sub - grp) <= 1,
    };
  });
  results['id.name.aligned'] = align.idName;
  results['sub.name.aligned'] = align.subName;
  results['sub.group.aligned'] = align.grpSub;
  await page.screenshot({ path: `${OUT}/rc-verify-live-staff.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
