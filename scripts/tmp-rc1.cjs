/* 临时探针：值班监控「全部」选项行 + 查询条件清除 icon（用完即删） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:5174/', { waitUntil: 'networkidle' });

  await p.evaluate(() => {
    const els = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && e.textContent?.trim() === '聚合接待');
    els[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await p.waitForTimeout(400);
  await p.locator('.rc-menu-text', { hasText: '宝妈接待' }).first().click();
  await p.waitForTimeout(500);
  await p.locator('.rc-mon-tools, button').filter({ hasText: '值班监控' }).first().click();
  await p.waitForTimeout(500);

  // 打开客服多选菜单：应无 全选/清空 菜单头，首行=「全部客服」选项
  await p.locator('.rc-mon-tools .msel').nth(1).locator('.msel-trigger').click();
  await p.waitForTimeout(300);
  const headCount = await p.locator('.msel-menu .msel-head').count();
  const firstOpt = await p.locator('.msel-menu .msel-opt').first().textContent();
  console.log('msel-head(全选/清空) count =', headCount, '(应0) | 首行选项 =', JSON.stringify(firstOpt?.trim()));
  // 选一项再点「全部客服」行 → 清空
  await p.locator('.msel-menu .msel-opt', { hasText: '王强' }).first().click();
  await p.waitForTimeout(200);
  const midLabel = await p.locator('.rc-mon-tools .msel').nth(1).locator('.msel-text').textContent();
  await p.locator('.msel-menu .msel-opt').first().click();
  await p.waitForTimeout(200);
  const endLabel = await p.locator('.rc-mon-tools .msel').nth(1).locator('.msel-text').textContent();
  console.log('选中后回显 =', JSON.stringify(midLabel?.trim()), '→ 点全部行后 =', JSON.stringify(endLabel?.trim()));
  await p.evaluate(() => document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })));
  await p.waitForTimeout(200);

  // 名称输入清除 icon
  const kw = p.locator('.rc-mon-kwwrap input');
  await kw.fill('王');
  await p.waitForTimeout(200);
  const clearVisible = await p.locator('.rc-mon-clear').isVisible();
  await p.locator('.rc-mon-tools').screenshot({ path: 'screenshots/rc1-mon-clear.png' });
  await p.locator('.rc-mon-clear').click();
  await p.waitForTimeout(200);
  const kwAfter = await kw.inputValue();
  const clearGone = (await p.locator('.rc-mon-clear').count()) === 0;
  console.log('有值时清除icon可见 =', clearVisible, '| 点击后输入值 =', JSON.stringify(kwAfter), '| icon收起 =', clearGone);

  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
