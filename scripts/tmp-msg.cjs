/* 验证：消息通知闭环（白底顶栏/铃铛角标/两层tab/商品块/已读/跳转定位/外部点击关闭） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 900 } });
  const results = {};
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');

  /* 顶栏白色底色（图一） */
  results['msg.topbarWhite'] = (await page.locator('.ops-topbar').evaluate((el) => getComputedStyle(el).backgroundColor)) === 'rgb(255, 255, 255)';

  /* 铃铛入口 + 未读角标 3（五类预警中 3 条未读） */
  results['msg.bell'] = (await page.locator('.ops-topbar .msg-bell-btn:visible').count()) === 1;
  results['msg.badge3'] = ((await page.locator('.msg-badge').textContent()) || '').trim() === '3';

  /* 面板展开：头部改名消息通知 / 全部已读 */
  await page.click('.msg-bell-btn');
  await page.waitForSelector('.msg-panel');
  const headTxt = (await page.locator('.msg-head').textContent()) || '';
  results['msg.head'] = headTxt.includes('消息通知') && headTxt.includes('全部已读');

  /* 第一层 tab：下架运营（全部/风控自动下架/平台下架） */
  const l1Txt = ((await page.locator('.msg-tabs.l1').textContent()) || '').replace(/\s/g, '');
  results['msg.l1Tabs'] = ['全部(5)', '风控自动下架(2)', '平台下架(3)'].every((t) => l1Txt.includes(t));
  /* 第二层 tab：全部 + 五类预警类型 */
  const l2Txt = ((await page.locator('.msg-tabs.l2').textContent()) || '').replace(/\s/g, '');
  results['msg.l2Tabs'] = ['全部(5)', '保证金违规下架(1)', '品牌到期下架(1)', '封禁下架(1)', '库存不足自动下架(1)', '长期无动销下架(1)'].every((t) => l2Txt.includes(t));
  results['msg.unread3'] = (await page.locator('.msg-item.unread').count()) === 3;
  /* 无系统通知/异常编码残留 */
  const panelTxt = (await page.locator('.msg-panel').textContent()) || '';
  results['msg.noSysTypes'] = !panelTxt.includes('系统通知') && !panelTxt.includes('异常编码');

  /* 商品块集成：主图 + 商品ID + 店铺（平台图标） */
  const firstItem = page.locator('.msg-item').first();
  results['msg.goodsBlock'] = (await firstItem.locator('.msg-goods > img').count()) === 1
    && ((await firstItem.textContent()) || '').includes('8888777776678')
    && ((await firstItem.textContent()) || '').includes('店铺')
    && (await firstItem.locator('.store-logo img').count()) === 1;
  /* 面板加宽（≥640px，参考图大弹窗） */
  results['msg.panelWide'] = (await page.locator('.msg-panel').evaluate((el) => el.offsetWidth)) >= 640;
  /* 卡片标题：预警类型 16px 加粗黑字（参考图字號字重） */
  const titleStyle = await firstItem.locator('.msg-title-row b').evaluate((el) => { const s = getComputedStyle(el); return `${s.fontSize}|${s.fontWeight}`; });
  results['msg.titleStyle'] = titleStyle === '16px|700';
  /* 卡片首行：组名 + 时间灰字 */
  const metaTxt = ((await firstItem.locator('.msg-meta').textContent()) || '').replace(/\s/g, '');
  results['msg.metaRow'] = (metaTxt.includes('风控自动下架') || metaTxt.includes('平台下架')) && metaTxt.includes('2026-');
  /* 标注①：l1 与 chip 之间分割线 */
  results['msg.l1Divider'] = (await page.locator('.msg-tabs.l1').evaluate((el) => getComputedStyle(el).borderBottomWidth)) === '1px';
  /* 标注②：标题左对齐、未读点位于文字右侧 */
  results['msg.dotAfter'] = (await firstItem.locator('.msg-title-row').evaluate((el) => el.children[0] && el.children[0].tagName === 'B')) === true;
  /* 标注③：商品ID/店铺 一排展示 */
  results['msg.kvOneRow'] = (await firstItem.locator('.msg-kvs').evaluate((el) => getComputedStyle(el).flexDirection)) === 'row';
  /* 标注④：原因文案不再重复标题（库存类改为信息型文案） */
  results['msg.reasonNoDup'] = !panelTxt.includes('系列编码库存不足') && panelTxt.includes('系列编码可用库存为 0');
  await page.screenshot({ path: `${OUT}/ops-verify-msg-panel.png` });

  /* 第一层切风控自动下架：第二层仅组内两预警类型，列表 2 行 */
  await page.locator('.msg-tabs.l1 span', { hasText: '风控自动下架' }).click();
  const l2Risk = ((await page.locator('.msg-tabs.l2').textContent()) || '').replace(/\s/g, '');
  results['msg.l2Risk'] = l2Risk.includes('全部(2)') && l2Risk.includes('库存不足自动下架(1)') && l2Risk.includes('长期无动销下架(1)') && !l2Risk.includes('保证金违规下架');
  results['msg.riskRows2'] = (await page.locator('.msg-item').count()) === 2;

  /* 第二层切长期无动销下架：1 行；点击跳转店铺商品定位 */
  await page.locator('.msg-tabs.l2 span', { hasText: '长期无动销下架' }).click();
  results['msg.warnRows1'] = (await page.locator('.msg-item').count()) === 1;
  await page.locator('.msg-item').first().click();
  results['msg.panelClosed'] = (await page.locator('.msg-panel').count()) === 0;
  await page.waitForSelector('.sg-page:visible .sg-filter');
  const gidInput = page.locator('.sg-page:visible input[placeholder="请输入商品ID"]');
  results['msg.jumpShop'] = (await gidInput.inputValue()) === '8888777776678'
    && (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 1;
  results['msg.badge2'] = ((await page.locator('.msg-badge').textContent()) || '').trim() === '2';

  /* 全部已读：角标消失 + 无未读条目 */
  await page.click('.msg-bell-btn');
  await page.waitForSelector('.msg-panel');
  await page.locator('.msg-head a').click();
  results['msg.markAll'] = (await page.locator('.msg-badge').count()) === 0
    && (await page.locator('.msg-item.unread').count()) === 0;

  /* 面板外点击关闭 */
  await page.click('.ops-center .side-head');
  results['msg.outsideClose'] = (await page.locator('.msg-panel').count()) === 0;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(fail.length ? `FAIL ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
  for (const [k, v] of Object.entries(results)) console.log(`${v ? 'PASS' : 'FAIL'} ${k}`);
  if (fail.length) process.exit(1);
})();
