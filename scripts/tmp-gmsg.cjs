/* 验证：顶栏全局站内信（铃铛角标/两层tab 应用→类别/空态/点击已读跳转/全部已读/外部关闭） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = {};
  const texts = (sel) => page.locator(sel).allTextContents();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  /* 入口：顶栏七妮妮侧铃铛 + 未读角标 4 */
  r.bell = (await page.locator('.app-header .gmsg-bell-btn').count()) === 1;
  r.badge4 = ((await page.locator('.gmsg-badge').textContent()) || '').trim() === '4';

  /* 面板展开：头部 + 两层 tab 计数 */
  await page.click('.gmsg-bell-btn');
  await page.waitForSelector('.gmsg-panel');
  const head = (await page.locator('.gmsg-head').textContent()) || '';
  r.head = head.includes('站内信') && head.includes('全部已读');
  r.l1 = JSON.stringify(await texts('.gmsg-tabs.l1 span')) === JSON.stringify(['全部(6)', '顺买商机(3)', '蜜蜂插件(2)', '品控中心(1)']);
  r.l2 = JSON.stringify(await texts('.gmsg-tabs.l2 span')) === JSON.stringify(['全部(6)', '订单消息通知(3)', '任务完成通知(3)']);
  r.cards6 = (await page.locator('.gmsg-item').count()) === 6;
  r.firstTitle = ((await page.locator('.gmsg-item .gmsg-title-row b').first().textContent()) || '') === '品控中心每日风险品推送通知';
  await page.screenshot({ path: `${OUT}/gmsg-panel.png`, clip: { x: 720, y: 0, width: 880, height: 800 } });

  /* 品控中心下订单消息通知为 0 → 空态 */
  await page.click('.gmsg-tabs.l1 span:has-text("品控中心")');
  await page.waitForTimeout(200);
  r.l2qc = JSON.stringify(await texts('.gmsg-tabs.l2 span')) === JSON.stringify(['全部(1)', '订单消息通知(0)', '任务完成通知(1)']);
  await page.click('.gmsg-tabs.l2 span:has-text("订单消息通知")');
  await page.waitForTimeout(200);
  r.empty = await page.locator('.gmsg-empty').isVisible();
  await page.screenshot({ path: `${OUT}/gmsg-empty.png`, clip: { x: 720, y: 0, width: 880, height: 500 } });

  /* 点击卡片：已读 + 关面板 + 跳转品控中心 */
  await page.click('.gmsg-tabs.l1 span:has-text("全部")');
  await page.waitForTimeout(200);
  await page.click('.gmsg-item >> nth=0');
  await page.waitForTimeout(400);
  r.closedAfterClick = (await page.locator('.gmsg-panel').count()) === 0;
  r.jumpQc = ((await page.locator('.top-tabs-item.is-active').textContent()) || '').trim() === '品控中心';
  r.badge3 = ((await page.locator('.gmsg-badge').textContent()) || '').trim() === '3';

  /* 全部已读 → 角标消失 + 入口禁用态 */
  await page.click('.gmsg-bell-btn');
  await page.waitForSelector('.gmsg-panel');
  await page.click('.gmsg-head a');
  await page.waitForTimeout(200);
  r.badgeGone = (await page.locator('.gmsg-badge').count()) === 0;
  r.markAllDisabled = (await page.locator('.gmsg-head a.disabled').count()) === 1;

  /* 面板外点击关闭（点顶栏 logo 区，无副作用） */
  await page.mouse.click(60, 30);
  await page.waitForTimeout(200);
  r.closedOutside = (await page.locator('.gmsg-panel').count()) === 0;

  await browser.close();
  r.errors = errors;
  console.log(JSON.stringify(r, null, 2));
  const pass = Object.entries(r).every(([k, v]) => (k === 'errors' ? v.length === 0 : v === true));
  console.log(pass ? 'ALL PASS' : 'HAS FAIL');
})().catch((e) => { console.error(e); process.exit(1); });
