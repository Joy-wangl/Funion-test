/* 验证：智能运营中心新增「异常编码预警」路由（商品创建与任务中心之间） */
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

  /* 侧边栏存在「异常编码预警」，且位于 商品创建 与 任务中心 之间 */
  const names = await page.locator('.ops-center .side .nav-text').allTextContents();
  const iWarn = names.findIndex((t) => t.trim() === '异常编码预警');
  const iCreate = names.findIndex((t) => t.trim() === '商品创建');
  const iTask = names.findIndex((t) => t.trim() === '任务中心');
  results['cw.navExists'] = iWarn !== -1;
  results['cw.navOrder'] = iCreate !== -1 && iTask !== -1 && iWarn === iCreate + 1 && iTask === iWarn + 1;

  /* 点击跳转：页面展示且导航高亮 */
  await page.click('.ops-center .side .nav:has-text("异常编码预警")');
  await page.waitForSelector('.ops-center .cw-page');
  results['cw.pageShow'] = await page.locator('.ops-center .cw-page').isVisible();
  results['cw.navActive'] = (await page.locator('.ops-center .side .nav.active .nav-text').textContent() || '').trim() === '异常编码预警';

  /* 列表字段：无「商品策略」，「预警原因」位于 商品数据 与 发布信息 之间 */
  const heads = await page.locator('.ops-center .cw-page .sg-table thead th').allTextContents();
  const cData = heads.findIndex((t) => t.includes('商品数据'));
  const cWarn = heads.findIndex((t) => t.includes('预警原因'));
  const cPub = heads.findIndex((t) => t.includes('发布信息'));
  results['cw.noStrategyCol'] = !heads.some((t) => t.includes('商品策略'));
  results['cw.warnColPos'] = cData !== -1 && cWarn === cData + 1 && cPub === cWarn + 1;
  /* 仅已下架商品（7 行），且每行预警原因均红色不为空 */
  const rowCount = () => page.locator('.ops-center .cw-page .sg-table tbody tr').count();
  results['cw.offOnly'] = (await rowCount()) === 7 && (await page.locator('.ops-center .cw-page .sg-warn').count()) === 7;
  const warnRow = page.locator('.ops-center .cw-page .sg-table tbody tr', { hasText: '8888777776669' });
  results['cw.warnText'] = ((await warnRow.locator('.sg-warn').textContent()) || '').trim() === '平台质检不合格，平台自动下架';
  /* 新增下架类型预警原因：库存不足自动下架 / 长期无动销下架 */
  const stockWarn = page.locator('.ops-center .cw-page .sg-table tbody tr', { hasText: '8888777776677' });
  results['cw.newOffReason'] = ((await stockWarn.locator('.sg-warn').textContent()) || '').trim() === '系列编码可用库存为 0，已自动下架';
  const nosaleWarn = page.locator('.ops-center .cw-page .sg-table tbody tr', { hasText: '8888777776678' });
  results['cw.newOffReason2'] = ((await nosaleWarn.locator('.sg-warn').textContent()) || '').trim() === '商品20天内无动销，已自动下架';
  /* 下架原因筛选为级联选择：风控自动下架组含库存不足自动下架 / 长期无动销下架 */
  const orField = page.locator('.ops-center .cw-page .sg-field', { hasText: '下架原因' });
  await orField.locator('.bselect-trigger').click();
  await page.locator('.casc-menu').waitFor();
  await page.locator('.casc-menu .casc-item.group', { hasText: '风控自动下架' }).click();
  const orOpts = ((await page.locator('.casc-menu .casc-col.right').textContent()) || '').replace(/\s/g, '');
  results['cw.offReasonOpts'] = orOpts.includes('库存不足自动下架') && orOpts.includes('长期无动销下架');
  await orField.locator('.bselect-trigger').click();
  /* 查询条件：系列编码 / 发布方式；发布信息列展示发布方式 */
  results['cw.seriesField'] = await page.locator('.ops-center .cw-page .sg-field', { hasText: '系列编码' }).isVisible();
  const pmField = page.locator('.ops-center .cw-page .sg-field', { hasText: '发布方式' });
  results['cw.pubModeField'] = await pmField.isVisible();
  results['cw.pubModeCell'] = ((await warnRow.textContent()) || '').includes('蜂联');
  /* 发布方式=店铺发布 + 查询 → 2 行（6670/6676），重置恢复 7 行（并行会话改枚举为 蜂联/店铺发布） */
  await pmField.locator('.bselect-trigger').click();
  await page.locator('.bselect-menu:visible .bselect-opt').first().waitFor();
  const opts = await page.locator('.bselect-menu:visible .bselect-opt').allTextContents();
  results['cw.pubModeOpts'] = ['全部', '蜂联', '店铺发布'].every((o) => opts.some((t) => t.includes(o)));
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '店铺发布' }).click();
  await page.locator('.ops-center .cw-page .sg-btn.primary', { hasText: '查询' }).click();
  results['cw.filterMode'] = (await rowCount()) === 2;
  await page.locator('.ops-center .cw-page .sg-btn', { hasText: '重置' }).click();
  results['cw.reset'] = (await rowCount()) === 7;

  /* 关联商品抽屉：关联关系作查询条件 + 列表带关联关系字段；商品状态/预警类型彩色标签 */
  const relLink = warnRow.locator('.sg-link', { hasText: '关联商品' });
  results['cw.relLink'] = await relLink.isVisible();
  await relLink.click();
  const drawer = page.locator('.cw-drawer');
  await drawer.waitFor();
  results['cw.drawerOpen'] = await drawer.isVisible();
  results['cw.noTabs'] = (await drawer.locator('.cw-drawer-tabs').count()) === 0;
  /* 关联关系查询条件：选项含 全部 + 三种关联 */
  const rtField = drawer.locator('.sg-field', { hasText: '关联关系' });
  results['cw.relTypeField'] = await rtField.isVisible();
  await rtField.locator('.bselect-trigger').click();
  await page.locator('.bselect-menu:visible .bselect-opt').first().waitFor();
  const rtOpts = await page.locator('.bselect-menu:visible .bselect-opt').allTextContents();
  results['cw.relTypeOpts'] = ['全部', '系列编码关联', '链接商品关联', '竞品链接关联'].every((t) => rtOpts.some((x) => x.includes(t)));
  await rtField.locator('.bselect-trigger').click();
  const dRows = () => drawer.locator('.sg-table tbody tr').count();
  results['cw.relRowsAll'] = (await dRows()) === 6;
  /* 列表关联关系字段：表头 + 行内容 */
  const dHeads = await drawer.locator('.sg-table thead th').allTextContents();
  results['cw.relHeads'] = ['商品信息', '关联关系', '销量数据', '商品状态', '商品数据', '预警类型', '发布信息', '操作'].every((h) => dHeads.some((t) => t.includes(h)));
  const firstRowText = (await drawer.locator('.sg-table tbody tr').first().textContent()) || '';
  /* 系列编码展示行已于并行会话移除（2026-09-01 16:59），断言对齐当前 UI：仅校验关联关系列 */
  results['cw.relColCell'] = firstRowText.includes('系列编码关联');
  /* 商品状态/预警类型：彩色标签（参考商品创建列表页） */
  const sellRowD = drawer.locator('.sg-table tbody tr', { hasText: '888877779' });
  results['cw.relStatusTag'] = ((await sellRowD.locator('.sgd-tag.green').textContent()) || '').trim() === '销售中';
  results['cw.relWarnDash'] = (await sellRowD.locator('.sg-dash').count()) === 1;
  const offRowD = drawer.locator('.sg-table tbody tr', { hasText: '888877780' });
  results['cw.relOffTag'] = ((await offRowD.locator('.sgd-tag.gray').textContent()) || '').trim() === '已下架';
    /* 手动下架/平台下架无预警 → 「-」；五类预警取本名（保证金违规下架等） */
  results['cw.relWarnDashOff'] = (await offRowD.locator('.sg-dash').count()) === 1;
  const sysRowD = drawer.locator('.sg-table tbody tr', { hasText: '665544322' });
  results['cw.relWarnTag'] = (await sysRowD.locator('.sgd-tag.red').count()) === 0
    && (await sysRowD.locator('.sg-dash').count()) === 1;
  /* 关联关系筛选：竞品链接关联+查询 → 2 行竞品店铺，重置恢复 6 行 */
  await rtField.locator('.bselect-trigger').click();
  await page.locator('.bselect-menu:visible .bselect-opt').first().waitFor();
  await page.locator('.bselect-menu:visible .bselect-opt').filter({ hasText: /^\s*竞品链接关联\s*$/ }).click();
  await drawer.locator('.sg-btn.primary', { hasText: '查询' }).click();
  results['cw.relComp'] = (await dRows()) === 2 && ((await drawer.locator('.sg-table tbody').textContent()) || '').includes('竞品美妆专营店');
  await drawer.locator('.sg-btn', { hasText: '重置' }).click();
  results['cw.relFilterReset'] = (await dRows()) === 6;
  /* 发布方式=店铺发布+查询 → 2 行（780/782） */
  const dpm = drawer.locator('.sg-field', { hasText: '发布方式' });
  await dpm.locator('.bselect').click();
  await page.locator('.bselect-menu:visible .bselect-opt').first().waitFor();
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '店铺发布' }).click();
  await drawer.locator('.sg-btn.primary', { hasText: '查询' }).click();
  results['cw.relFilter'] = (await dRows()) === 2;
  await drawer.locator('.sg-btn', { hasText: '重置' }).click();
  /* 排序：销量数据 降序→231(竞品)在前，升序→0(780 稳定序)在前 */
  const firstId = async () => ((await drawer.locator('.sg-table tbody tr').first().textContent()) || '');
  await drawer.locator('.sg-table thead th', { hasText: '销量数据' }).click();
  results['cw.relSortDesc'] = (await firstId()).includes('665544321');
  await drawer.locator('.sg-table thead th', { hasText: '销量数据' }).click();
  results['cw.relSortAsc'] = (await firstId()).includes('888877780');
  await page.screenshot({ path: `${OUT}/ops-verify-cw-drawer.png` });
  await drawer.locator('.cw-close').click();
  results['cw.drawerClose'] = (await page.locator('.cw-drawer').count()) === 0;
  await page.screenshot({ path: `${OUT}/ops-verify-codewarn.png` });

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
