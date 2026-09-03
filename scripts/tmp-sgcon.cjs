/* 验证：店铺商品筛选「销量 X 日 条件 值」查询 + 「是否有动销」下拉（同运营管理形式） */
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
  await page.click('.nav-text:has-text("店铺商品")');
  await page.waitForSelector('.sg-page:visible .sg-filter');

  const f = page.locator('.sg-page:visible .sg-field', { hasText: '销量' });
  results['sg.salesField'] = (await f.count()) === 1
    && (await f.locator('.sg-compact input').count()) === 2
    && ((await f.locator('.sg-compact').textContent()) || '').includes('日');
  results['sg.noConsec'] = (await page.locator('.sg-page:visible .sg-field', { hasText: '连续' }).count()) === 0;
  /* 系列编码查询条件 */
  const sc = page.locator('.sg-page:visible .sg-field', { hasText: '系列编码' });
  results['sg.seriesCodeField'] = (await sc.count()) === 1
    && (await sc.locator('input').inputValue()) === '';
  /* 已删除：SKU名称 / 发布开始时间 */
  results['sg.noSku'] = (await page.locator('.sg-page:visible .sg-field', { hasText: 'SKU名称' }).count()) === 0;
  results['sg.noPubTime'] = (await page.locator('.sg-page:visible .sg-field', { hasText: '发布开始时间' }).count()) === 0;
  /* 预警相关条件（下架原因/发布方式/下架时间）在 全部/销售中/已下架 展示，审核中等状态隐藏 */
  const warnFieldCount = async () => (await page.locator('.sg-page:visible .sg-field', { hasText: '下架原因' }).count())
    + (await page.locator('.sg-page:visible .sg-field', { hasText: '发布方式' }).count())
    + (await page.locator('.sg-page:visible .sg-field', { hasText: '下架时间' }).count());
  results['sg.warnCondsDefault'] = (await warnFieldCount()) === 2; /* 并行会话移除下架原因级联，仅余 发布方式+下架时间 */
  await page.click('.sg-page:visible .sg-chip:has-text("审核中")');
  results['sg.warnCondsHiddenAuditing'] = (await warnFieldCount()) === 1; /* 审核中仅余发布方式（下架时间随 warnConds 隐藏） */
  await page.click('.sg-page:visible .sg-chip:has-text("全部")');
  /* 发布方式：选项 + 查询过滤（并行会话改枚举为 蜂联/店铺发布，店铺发布 5 行）+ 重置恢复 13 行 */
  const pm = page.locator('.sg-page:visible .sg-field', { hasText: '发布方式' });
  await pm.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  const pmOpts = ((await page.locator('.bselect-menu').textContent()) || '').replace(/\s/g, '');
  results['sg.pubModeOpts'] = ['蜂联', '店铺发布'].every((t) => pmOpts.includes(t));
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '店铺发布' }).click();
  await page.locator('.sg-page:visible .sg-btn.primary', { hasText: '查询' }).click();
  results['sg.pubModeFilter'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 5;
  await page.locator('.sg-page:visible .sg-btn', { hasText: '重置' }).click();
  results['sg.pubModeReset'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 13;
  /* 预警列：已下架行=下架类型+ⓘ悬浮气泡（图二样式），非已下架行=灰色短横 */
  const heads2 = await page.locator('.sg-page:visible .sg-table thead th').allTextContents();
  const iStrategy2 = heads2.findIndex((t) => t.includes('商品策略'));
  const iWarn = heads2.findIndex((t) => t.includes('预警'));
  const iPub = heads2.findIndex((t) => t.includes('发布信息'));
  results['sg.warnColPos'] = iStrategy2 !== -1 && iWarn === iStrategy2 + 1 && iPub === iWarn + 1;
  /* 按图调整：销量数据改名近20日销量概览、删曝光/评价块、删商品数据列 */
  results['sg.soldColRename'] = heads2.some((t) => t.includes('近20日销量概览')) && !heads2.some((t) => t.includes('销量数据'));
  results['sg.noDataCol'] = !heads2.some((t) => t.includes('商品数据'));
  const bizTxt = ((await page.locator('.sg-page:visible .sg-biz').first().textContent()) || '').replace(/\s/g, '');
  results['sg.bizSlim'] = bizTxt.includes('销量') && bizTxt.includes('总销量') && !bizTxt.includes('曝光') && !bizTxt.includes('评价');
  /* 行内单元格顶部对齐 */
  results['sg.tdTopAlign'] = (await page.locator('.sg-page:visible .sg-table tbody td').first().evaluate((el) => getComputedStyle(el).verticalAlign)) === 'top';
  const offRowW = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776669' });
  /* 平台下架无预警：行内仅状态列一个标签，预警列「-」 */
  results['sg.warnCellTag'] = (await offRowW.locator('.sg-offtag').count()) === 1
    && (await offRowW.locator('.sg-dash').count()) === 1;
  /* 预警列标签 + ⓘ 悬浮原因气泡（保证金违规下架行） */
  const depRowW = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776674' });
  await depRowW.locator('.sg-offtag').last().hover();
  await page.waitForTimeout(150);
  results['sg.warnCellPop'] = ((await page.locator('.sg-page:visible .sg-fail-pop').textContent()) || '').includes('保证金余额不足');
  await page.mouse.move(0, 0);
  const sellRowW = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776666' });
  results['sg.warnCellDash'] = (await sellRowW.locator('.sg-dash').count()) === 1;
  /* 不做风控监控：在售商品无前置预警，预警列为灰色短横 */
  const warnSellRow = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776671' });
  results['sg.warnSellDash'] = (await warnSellRow.locator('.sg-offtag').count()) === 0 && (await warnSellRow.locator('.sg-dash').count()) === 1;
  /* 条件下拉选项：大于/等于/小于 */
  await f.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  const opts = ((await page.locator('.bselect-menu').textContent()) || '').replace(/\s/g, '');
  results['sg.salesOpts'] = ['大于', '等于', '小于'].every((t) => opts.includes(t));
  await f.locator('.bselect').click();
  /* 是否命中预警：下拉 全部/命中预警/未命中预警 + 查询过滤（全部态：命中 7 / 未命中 6） */
  const dx = page.locator('.sg-page:visible .sg-field', { hasText: '是否命中预警' });
  results['sg.dxField'] = (await dx.count()) === 1;
  await dx.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  const dxOpts = ((await page.locator('.bselect-menu').textContent()) || '').replace(/\s/g, '');
  results['sg.dxOpts'] = ['全部', '命中预警', '未命中预警'].every((t) => dxOpts.includes(t));
  await page.locator('.bselect-menu:visible .bselect-opt').filter({ hasText: /^\s*命中预警\s*$/ }).click();
  await page.locator('.sg-page:visible .sg-btn.primary', { hasText: '查询' }).click();
  results['sg.dxHit'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 5;
  await dx.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  await page.locator('.bselect-menu:visible .bselect-opt').filter({ hasText: /^\s*未命中预警\s*$/ }).click();
  await page.locator('.sg-page:visible .sg-btn.primary', { hasText: '查询' }).click();
  results['sg.dxNoHit'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 8;
  await page.locator('.sg-page:visible .sg-btn', { hasText: '重置' }).click();
  /* 销售中 + 命中预警 → 2 行在售预警商品 */
  await page.click('.sg-page:visible .sg-chip:has-text("销售中")');
  await dx.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  await page.locator('.bselect-menu:visible .bselect-opt').filter({ hasText: /^\s*命中预警\s*$/ }).click();
  await page.locator('.sg-page:visible .sg-btn.primary', { hasText: '查询' }).click();
  results['sg.dxHitSelling'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 0;
  await page.locator('.sg-page:visible .sg-btn', { hasText: '重置' }).click();
  /* 销售中/审核中/审核待处理三状态无下架信息：不展示下架原因条件 */
  results['sg.offReasonHiddenSelling'] = (await page.locator('.sg-page:visible .sg-field', { hasText: '下架原因' }).count()) === 0;
  await page.waitForTimeout(200);

  /* 已下架 tab：下架类型筛选移入筛选表单（仅已下架态展示）+ 失败原因标签 */
  results['sg.offTypeHiddenAll'] = (await page.locator('.sg-page:visible .sg-field', { hasText: '下架类型' }).count()) === 0;
  await page.click('.sg-page:visible .sg-chip:has-text("已下架")');
  const otField = page.locator('.sg-page:visible .sg-field', { hasText: '下架类型' });
  await otField.waitFor();
  results['sg.offTypeRow'] = (await otField.count()) === 1;
  /* 已下架下才展示：下架时间（下架原因级联筛选已于并行会话移除 2026-09-01，断言对齐：字段不再存在） */
  results['sg.offReasonField'] = (await page.locator('.sg-page:visible .sg-field', { hasText: '下架原因' }).count()) === 0;
  results['sg.offTimeField'] = (await page.locator('.sg-page:visible .sg-field', { hasText: '下架时间' }).count()) === 1;
  /* 下架类型下拉选项：三组（手动下架/平台下架/风控自动下架），不再列具体原因 */
  await otField.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  const offOpts = ((await page.locator('.bselect-menu').textContent()) || '').replace(/\s/g, '');
  results['sg.offTypeOpts'] = ['手动下架', '平台下架', '风控自动下架'].every((t) => offOpts.includes(t))
    && !offOpts.includes('保证金违规下架') && !offOpts.includes('库存不足自动下架');
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '风控自动下架' }).click();
  results['sg.offGroupFilterRisk'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 2;
  await otField.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '平台下架' }).click();
  results['sg.offGroupFilterSystem'] = (await page.locator('.sg-page:visible .sg-table tbody tr').count()) === 4;
  await otField.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  await page.locator('.bselect-menu:visible .bselect-opt', { hasText: '全部' }).click();
  /* 状态统一为「已下架」 */
  const firstStatus = page.locator('.sg-page:visible .sg-table tbody tr').first().locator('.sg-status');
  results['sg.offStatusUnified'] = ((await firstStatus.textContent()) || '').replace(/\s/g, '') === '已下架';
  /* 颜色层级：已下架状态文本重（#3d4657），下架类型标签轻（#8a92a1） */
  results['sg.offStatusDark'] = (await page.locator('.sg-page:visible .sg-table tbody tr').first().locator('.sg-status span').last().evaluate((el) => getComputedStyle(el).color)) === 'rgb(61, 70, 87)';
  /* 下方标签展示下架类型（原因简述）+ 提示符 */
  const offTags = page.locator('.sg-page:visible .sg-offtag');
  const offTagTxt = ((await offTags.first().textContent()) || '').replace(/\s/g, '');
  results['sg.offTagType'] = (await offTags.count()) > 0 && offTagTxt.includes('平台下架');
  /* 已下架状态子标签不再带提示符/气泡；预警列保留提示符 + 悬浮气泡 */
  const firstRow = page.locator('.sg-page:visible .sg-table tbody tr').first();
  await firstRow.locator('.sg-offtag').first().hover();
  await page.waitForTimeout(150);
  results['sg.offNoStatusPop'] = (await page.locator('.sg-fail-pop').count()) === 0;
  await page.mouse.move(0, 0);
  /* 预警列标签悬浮气泡展示原因（保证金违规下架行） */
  const depRow = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776674' });
  await depRow.locator('.sg-offtag').last().hover();
  await page.waitForTimeout(150);
  const pop = page.locator('.sg-page:visible .sg-fail-pop');
  const popTxt = ((await pop.textContent()) || '').replace(/\s/g, '');
  results['sg.offFailPop'] = (await pop.isVisible())
    && popTxt.includes('保证金余额不足')
    && !popTxt.includes('前往查看');
  await page.mouse.move(0, 0);
  /* 类型文本浅色 + 提示符红色带边框 */
  const normalTag = page.locator('.sg-page:visible .sg-offtag.normal').first();
  results['sg.offTagLight'] = (await normalTag.evaluate((el) => getComputedStyle(el).color)) === 'rgb(138, 146, 161)';
  results['sg.offIconRed'] = (await page.locator('.sg-page:visible .sg-offtag .sg-fail-i').first().evaluate((el) => getComputedStyle(el).color)) === 'rgb(240, 91, 94)';
  /* 新增下架类型：库存不足自动下架 / 长期无动销下架，标签+悬浮原因气泡 */
  const stockRow = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776677' });
  results['sg.offStockTag'] = ((await stockRow.locator('.sg-offtag').last().textContent()) || '').includes('库存不足自动下架');
  await stockRow.locator('.sg-offtag').last().hover();
  await page.waitForTimeout(150);
  results['sg.offStockPop'] = ((await page.locator('.sg-page:visible .sg-fail-pop').textContent()) || '').includes('系列编码可用库存为 0，已自动下架');
  await page.mouse.move(0, 0);
  const nosaleRow = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776678' });
  results['sg.offNosaleTag'] = ((await nosaleRow.locator('.sg-offtag').last().textContent()) || '').includes('长期无动销下架');
  await nosaleRow.locator('.sg-offtag').last().hover();
  await page.waitForTimeout(150);
  results['sg.offNosalePop'] = ((await page.locator('.sg-page:visible .sg-fail-pop').textContent()) || '').includes('商品20天内无动销，已自动下架');
  await page.mouse.move(0, 0);
  /* 状态列下架分组：手动下架 / 平台下架（含保证金违规等）/ 风控自动下架；预警列仅五类预警（保证金违规/品牌到期/封禁/库存不足自动/长期无动销下架）取本名，手动下架与平台下架无预警 */
  results['sg.offGroupManual'] = ((await page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776670' }).locator('.sg-offtag').first().textContent()) || '').includes('手动下架');
  results['sg.offGroupSystem'] = ((await page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776674' }).locator('.sg-offtag').first().textContent()) || '').includes('平台下架');
  results['sg.offGroupRisk'] = ((await stockRow.locator('.sg-offtag').first().textContent()) || '').includes('风控自动下架')
    && ((await nosaleRow.locator('.sg-offtag').first().textContent()) || '').includes('风控自动下架');
  results['sg.warnSpecific'] = ((await page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776674' }).locator('.sg-offtag').last().textContent()) || '').includes('保证金违规下架');
  /* 手动下架无预警：预警列为「-」，行内仅状态列一个标签 */
  const manualRow = page.locator('.sg-page:visible .sg-table tbody tr', { hasText: '8888777776670' });
  results['sg.warnManualDash'] = (await manualRow.locator('.sg-offtag').count()) === 1 && (await manualRow.locator('.sg-dash').count()) === 1;
  /* 已下架行发布信息展示「下架时间」 */
  results['sg.offTimeLabel'] = ((await page.locator('.sg-page:visible .sg-table tbody tr').first().textContent()) || '').includes('下架时间');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ops-verify-sg-off.png` });

  /* 详情类目上方下架原因提示条 */
  await page.locator('.sg-page:visible .sg-acts a:has-text("商品详情")').first().click();
  await page.waitForSelector('.sgd-offnotice');
  const noticeTxt = ((await page.locator('.sgd-offnotice').textContent()) || '').replace(/\s/g, '');
  results['sg.detailOffNotice'] = noticeTxt.includes('下架原因') && noticeTxt.includes('平台自动下架');
  await page.screenshot({ path: `${OUT}/ops-verify-sg-detail-off.png` });
  await page.click('.sgd-back');
  await page.waitForSelector('.sg-page:visible .sg-offtag');

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
