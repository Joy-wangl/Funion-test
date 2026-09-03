/* 临时验证：运营驾驶舱 / 运营管理 对照 demo 补缺（筛选、列字段、操作、删除商品） */
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

  /* ----- 运营驾驶舱 ----- */
  await page.click('.ops-center .nav-text:has-text("运营驾驶舱")');
  await page.waitForSelector('.dash-toolbar');
  const selTexts = (await page.locator('.dash-toolbar .bselect.platformSelect .bselect-text').allTextContents()).join(',');
  results['dash.filters'] = ['数据模式', '平台', '店铺', '主管', '组长', '运营', '助理'].every((t) => selTexts.includes(t));
  await page.locator('.dash-toolbar .bselect.platformSelect').first().click();
  await page.waitForSelector('.bselect-menu');
  const modeOpts = (await page.locator('.bselect-menu .bselect-opt').allTextContents()).join(',');
  results['dash.compareMode'] = modeOpts.includes('对比模式') && modeOpts.includes('列表模式');
  await page.click('.timebar .label'); /* 空点关闭菜单 */
  results['dash.kpis'] = (await page.locator('.kpis .kpi').count()) === 20;
  results['dash.lists'] = (await page.locator('.dashboard-lists .list-card').count()) === 2;
  await page.screenshot({ path: `${OUT}/ops-verify-dashboard.png` });

  /* ----- 时间条交互：实时/7天/30天 + 日/周/月 日历（图一风格） ----- */
  await page.click('.timebar .tb.mode:has-text("7天")');
  results['dash.t7'] = (await page.locator('.timebar .date').innerText()).trim() === '2026-08-06 ~ 2026-08-12';
  await page.click('.timebar .tb.mode:has-text("30天")');
  results['dash.t30'] = (await page.locator('.timebar .date').innerText()).trim() === '2026-07-14 ~ 2026-08-12';
  await page.click('.timebar .tb.mode:has-text("实时")');
  results['dash.tReal'] = (await page.locator('.timebar .date').innerText()).trim() === '2026-08-12';
  /* 日：单日日历点选 → 单日日期 */
  await page.click('.timebar .tb.gran:has-text("日")');
  await page.waitForSelector('.calendar.show.narrow .days');
  results['dash.dayCal42'] = (await page.locator('.calendar.show .days button').count()) === 42;
  await page.click('.calendar.show .days button >> nth=10');
  results['dash.dayPick'] = /^\d{4}-\d{2}-\d{2}$/.test((await page.locator('.timebar .date').innerText()).trim());
  /* 周：周选日历，悬停整周高亮（2 实心 + 5 浅），点选 周一~周日 */
  await page.click('.timebar .tb.gran:has-text("周")');
  await page.waitForSelector('.calendar.show .days');
  await page.hover('.calendar.show .days button >> nth=16');
  await page.waitForTimeout(150);
  results['dash.weekHover'] = (await page.locator('.calendar.show .days .sel').count()) === 2
    && (await page.locator('.calendar.show .days .range').count()) === 5;
  await page.screenshot({ path: `${OUT}/ops-verify-dash-weekcal.png` });
  await page.click('.calendar.show .days button >> nth=16');
  results['dash.weekPick'] = (await page.locator('.timebar .date').innerText()).includes('~');
  /* 月：月选日历 12 格，点选 年-月；‹ › 按月平移 */
  await page.click('.timebar .tb.gran:has-text("月")');
  await page.waitForSelector('.calendar.show .months');
  results['dash.months12'] = (await page.locator('.calendar.show .months button').count()) === 12;
  await page.click('.calendar.show .months button >> nth=6');
  results['dash.monthPick'] = /^\d{4}-\d{2}$/.test((await page.locator('.timebar .date').innerText()).trim());
  await page.click('.timebar .tb:has-text("›")');
  results['dash.monthShift'] = (await page.locator('.timebar .date').innerText()).trim() === '2026-08';
  /* 自定义区间双面板日历仍在 */
  await page.click('.timebar .tb:has-text("自定义")');
  results['dash.rangeCal'] = (await page.locator('.calendar.show .calendar-panels .cal-panel').count()) === 2;
  await page.click('.timebar .label');

  /* ----- 运营管理 ----- */
  await page.click('.ops-center .nav-text:has-text("运营管理")');
  await page.waitForSelector('.om-page .id-filter-card');
  /* 删除商品按钮已移除：按钮组 = ▦ + 批量操作 + 操作日志 + 重置 + 查询 */
  results['om.noDeleteBtn'] = (await page.locator('.om-delete-btn').count()) === 0;
  const idActsTxt = ((await page.locator('.id-actions').textContent()) || '').replace(/\s/g, '');
  results['om.idActions'] = ['重置', '查询', '批量操作', '操作日志'].every((t) => idActsTxt.includes(t)) && !idActsTxt.includes('删除商品');
  /* 按钮组一列（单排）展示：▦ 最左 → 批量操作 → 操作日志 → 重置 → 查询最右，且同排 */
  const icBox = await page.locator('.id-actions .id-btn.icon').boundingBox();
  const bsBox = await page.locator('.id-actions .om-select').boundingBox();
  const lgBox = await page.locator('.id-actions .om-log-btn').boundingBox();
  const rsBox = await page.locator('.id-actions .id-btn.primary').boundingBox();
  results['om.oneRow'] = [icBox, bsBox, lgBox, rsBox].every((b) => !!b && Math.abs(b.y - rsBox.y) < 4);
  results['om.order'] = icBox.x < bsBox.x && bsBox.x < lgBox.x && lgBox.x < rsBox.x;
  /* 按钮组与末排查询条件（自动化标签）同排展示（按标注「一排展示」）：底边对齐 */
  const tagBox = await page.locator('.om-page .id-field:has-text("自动化标签")').last().boundingBox();
  results['om.actsSameRow'] = !!tagBox && !!rsBox && Math.abs((tagBox.y + tagBox.height) - (rsBox.y + rsBox.height)) < 8;
  results['om.noToolbar'] = (await page.locator('.om-toolbar').count()) === 0;
  await page.screenshot({ path: `${OUT}/ops-verify-om-actions.png` });
  const thArr = (await page.locator('.om-page .ib-table thead th').allTextContents()).map((t) => t.trim());
  const ths = thArr.join(',');
  results['om.cols'] = !ths.includes('上架店铺') && !ths.includes('库存数');
  results['om.noCloud'] = !ths.includes('云仓占比');
  results['om.publisher'] = ths.includes('发布人');
  results['om.publisherVal'] = (((await page.locator('.om-page .ib-table tbody tr').first().textContent()) || '').includes('王龙'));
results['om.qCols'] = ths.includes('备注') && ths.includes('总广告费') && ths.includes('星星')
    && !['明细', '商品名称', '日期', '选择平台', '店铺', '连续', '请选择项目', '请选择爆品', '自动化标签', '上架天数最小', '上架天数最大', '禁用仓', '查看全仓', '外仓率最小值 %', '外仓率最大值 %', '商品ID'].some((c) => ths.includes(c));
  const mi = thArr.indexOf('发生毛利2');
  const formTxt = (await page.locator('.om-page .id-filter-card').textContent()) || '';
  results['om.noDaysForm'] = !formTxt.includes('上架天数');
  /* 外仓率最小/最大值仅作查询条件：表单保留、列表不展示 */
  results['om.waiFormOnly'] = formTxt.includes('外仓率最小值') && formTxt.includes('外仓率最大值');
  const td0 = await page.locator('.om-page .ib-table tbody tr').first().locator('td').allTextContents();
  results['om.maoliConcrete'] = mi >= 0 && /^¥\d+(\.\d+)?$/.test((td0[mi] || '').trim());
  /* 星星/旗帜使用图标样式：row0 红星图标(rgb(245,34,45))、row0 旗帜空白无图标、row1 红旗图标；star/flag path 不同 */
  results['om.iconCells'] = await page.evaluate(() => {
    const hs = [...document.querySelectorAll('.om-page .ib-table thead th')].map((t) => (t.textContent || '').trim());
    const si = hs.indexOf('星星');
    const fi = hs.indexOf('旗帜');
    if (si < 0 || fi < 0) return false;
    const trs = document.querySelectorAll('.om-page .ib-table tbody tr');
    const sSvg = trs[0].children[si].querySelector('svg.cell-icon');
    const f0 = trs[0].children[fi].querySelector('svg.cell-icon');
    const f1 = trs[1].children[fi].querySelector('svg.cell-icon');
    if (!sSvg || f0 || !f1) return false;
    const col = getComputedStyle(sSvg).color;
    const sPath = sSvg.querySelector('path')?.getAttribute('d') || '';
    const fPath = f1.querySelector('path')?.getAttribute('d') || '';
    return col === 'rgb(245, 34, 45)' && sPath.startsWith('M12 17.27') && fPath.startsWith('M14.4 6');
  });
  /* 截图前横向滚动到星星/旗帜区域，便于目视图标与删列 */
  await page.evaluate(() => { const w = document.querySelector('.om-page .ib-table-wrap'); if (w) w.scrollLeft = 1000; });
  await page.locator('.om-page .ib-table').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-verify-om-table.png` });
  /* 横向滚到最右，目视查询条件扩展列 */
  await page.locator('.om-page .ib-table-wrap').evaluate((el) => { el.scrollLeft = el.scrollWidth; });
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ops-verify-om-qcols.png` });
  await page.locator('.om-page .ib-table-wrap').evaluate((el) => { el.scrollLeft = 0; });

  /* 总广告费：单组件单列（最小值 至 最大值 直接输入），无步进器 */
  const adField = page.locator('.om-page .id-field:has(> label:text-is("总广告费"))');
  results['om.adRangeInputs'] = (await adField.locator('.id-range input').count()) === 2;
  results['om.adNoStep'] = (await page.locator('.om-page .id-steprange').count()) === 0;
  const adBox = await adField.boundingBox();
  const catBox = await page.locator('.om-page .id-field', { hasText: '经营大类' }).first().boundingBox();
  results['om.adOneCol'] = !!adBox && !!catBox && Math.abs(adBox.width - catBox.width) < 8;
  /* 选择平台只保留 全部/淘宝/视频号 */
  const platField = page.locator('.om-page .id-field:has(> label:text-is("选择平台"))');
  await platField.locator('.bselect-trigger').click();
  const platOpts = (await page.locator('.bselect-menu .bselect-opt').allTextContents()).join(',');
  results['om.platOpts'] = platOpts === '全部,淘宝,视频号';
  await page.screenshot({ path: `${OUT}/ops-verify-om-plat.png` });
  await platField.locator('.bselect-trigger').click();

  /* 星星/旗帜彩色枚举：星星=8 彩色星图标；旗帜=空白+8 旗图标；选中后触发器显图标+彩色文字 */
  const starField = page.locator('.om-page .id-field:has(> label:text-is("星星"))');
  await starField.locator('.bselect-trigger').click();
  results['om.starOpts'] = (await page.locator('.bselect-menu .bselect-opt').count()) === 8
    && (await page.locator('.bselect-menu .bselect-opt svg').count()) === 8;
  const starRed = page.locator('.bselect-menu .bselect-opt', { hasText: '红色' });
  results['om.starRedColor'] = (await starRed.locator('.bselect-label').evaluate((el) => getComputedStyle(el).color)) === 'rgb(245, 34, 45)';
  await starRed.click();
  results['om.starSel'] = (await starField.locator('.bselect-text svg').count()) === 1
    && (await starField.locator('.bselect-text > span').evaluate((el) => getComputedStyle(el).color)) === 'rgb(245, 34, 45)';
  const flagField = page.locator('.om-page .id-field:has(> label:text-is("旗帜"))');
  await flagField.locator('.bselect-trigger').click();
  const flagTxt = (await page.locator('.bselect-menu .bselect-opt').allTextContents()).join(',');
  results['om.flagOpts'] = flagTxt.includes('空白') && flagTxt.includes('靛色') && (await page.locator('.bselect-menu .bselect-opt svg').count()) === 8;
  await page.screenshot({ path: `${OUT}/ops-verify-om-starflag.png` });
  await flagField.locator('.bselect-trigger').click();

  /* 自动化标签：81 项枚举 + 模糊搜索过滤 + 选中回显 */
  const tagField = page.locator('.om-page .id-field:has(> label:text-is("自动化标签"))');
  await tagField.locator('.bselect-trigger').click();
  results['om.tagSearchBox'] = (await page.locator('.bselect-menu .bselect-search input').count()) === 1;
  results['om.tagCount'] = (await page.locator('.bselect-menu .bselect-opt').count()) === 81;
  await page.locator('.bselect-menu .bselect-search input').fill('小茶');
  await page.waitForTimeout(150);
  const teaTxt = (await page.locator('.bselect-menu .bselect-opt').allTextContents()).join(',');
  results['om.tagFuzzy'] = teaTxt === '武汉-抖音暴力自动化-小茶日记,武汉-多多暴力自动化-小茶日记';
  await page.screenshot({ path: `${OUT}/ops-verify-om-autotag.png` });
  await page.locator('.bselect-menu .bselect-opt').first().click();
  results['om.tagPicked'] = ((await tagField.locator('.bselect-text').textContent()) || '').includes('武汉-抖音暴力自动化-小茶日记');

  /* 操作按钮行与列表疏远间距 >= 14px */
  const actBox = await page.locator('.om-page .id-actions').boundingBox();
  const tableBox = await page.locator('.om-page .ib-table-card').boundingBox();
  results['om.gapActionsTable'] = !!actBox && !!tableBox && (tableBox.y - (actBox.y + actBox.height)) >= 14;
  await adField.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ops-verify-om-adrange.png` });

  /* 条件型字段：先选 低于/高于/等于/介于 再输入值；介于=最小值 至 最大值 */
  results['om.condCount'] = (await page.locator('.om-page .id-cond').count()) === 15;
  const f6 = page.locator('.om-page .id-field:has(> label:text-is("毛六利润率"))');
  results['om.condOneInput'] = (await f6.locator('.id-cond input').count()) === 1;
  await f6.locator('.id-cond .bselect-trigger').click();
  const menuTxt = (await page.locator('.bselect-menu').textContent()) || '';
  results['om.condOpts'] = ['毛六利润率低于', '毛六利润率高于', '毛六利润率等于', '毛六利润率介于'].every((t) => menuTxt.includes(t));
  await page.locator('.bselect-menu .bselect-opt', { hasText: '毛六利润率介于' }).click();
  results['om.condBetween2'] = (await f6.locator('.id-cond input').count()) === 2;
  await f6.locator('.id-cond .bselect-trigger').click();
  await page.locator('.bselect-menu .bselect-opt', { hasText: '毛六利润率高于' }).click();
  results['om.condAbove1'] = (await f6.locator('.id-cond input').count()) === 1;
  await f6.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ops-verify-om-cond.png` });

  /* 销量 XX 日 条件 XXX：天数输入 + 值输入 + 条件选择；「连续」已改名「销量」 */
  results['om.salesForm'] = (await page.locator('.om-page .id-compact input').count()) === 2
    && (await page.locator('.om-page .id-compact .bselect').count()) === 1
    && formTxt.includes('销量') && !formTxt.includes('连续');
  /* 是否有动销：下拉 全部/有动销/无动销 */
  const dxOm = page.locator('.om-page .id-field', { hasText: '是否有动销' });
  results['om.dxField'] = (await dxOm.count()) === 1;
  await dxOm.locator('.bselect').click();
  await page.waitForSelector('.bselect-menu');
  const dxTxt = ((await page.locator('.bselect-menu').textContent()) || '').replace(/\s/g, '');
  results['om.dxOpts'] = ['全部', '有动销', '无动销'].every((t) => dxTxt.includes(t));
  await dxOm.locator('.bselect').click();
  await page.locator('.om-page .id-compact').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ops-verify-om-consec.png` });
  const acts = ((await page.locator('.om-page .ib-table tbody tr').first().locator('.actions-col').textContent()) || '').replace(/\s/g, '');
  /* 操作列与店铺商品同步：状态驱动（商品详情 + 下架/撤销审核/立即上架/发布） */
  results['om.acts'] = acts.includes('商品详情') && /下架|撤销审核|立即上架|发布/.test(acts) && !acts.includes('快速铺货') && !acts.includes('导入模版') && !acts.includes('导入素材') && !acts.includes('添加到');
  results['om.noBadge'] = (await page.locator('.om-page .ib-meta .badge-orange').count()) === 0;
  results['om.noStockBadge'] = (await page.locator('.om-page .ib-table tbody .badge-red:has-text("库存紧张")').count()) === 0;

  /* ▦ 列管理含新列，隐藏生效 */
  await page.click('.id-btn.icon');
  await page.waitForSelector('.om-col-pop');
  const popTxt = (await page.locator('.om-col-pop').textContent()) || '';
  results['om.colPop'] = !popTxt.includes('上架店铺') && !popTxt.includes('库存数') && !popTxt.includes('云仓占比') && popTxt.includes('发布人');
  results['om.fields36'] = (await page.locator('.om-col-item').count()) === 36;
    const popBox = await page.locator('.om-col-pop').boundingBox();
    results['om.colPopInViewport'] = !!popBox && popBox.x >= 0 && popBox.x + popBox.width <= 1800 && popBox.y >= 0 && popBox.y + popBox.height <= 900;
  await page.screenshot({ path: `${OUT}/ops-verify-colpop.png` });
  await page.locator('.om-col-pop label:has-text("状态") input').click();
  const ths2 = (await page.locator('.om-page .ib-table thead th').allTextContents()).join(',');
  results['om.hideStatus'] = !ths2.includes('状态');
  await page.locator('.om-col-pop label:has-text("状态") input').click();
  /* 查询条件扩展列同样可隐藏（星星） */
  await page.locator('.om-col-pop label:has-text("星星") input').click();
  const ths3 = (await page.locator('.om-page .ib-table thead th').allTextContents()).join(',');
  results['om.hideStar'] = !ths3.includes('星星');
  await page.locator('.om-col-pop label:has-text("星星") input').click();
  await page.click('.id-filter-card > .id-grid > .id-field > label'); /* 空点关闭气泡 */
  await page.screenshot({ path: `${OUT}/ops-verify-opmanage.png` });

  /* ----- 内部商机：提示条 + 快速选品 ----- */
  await page.click('.ops-center .subnav:has-text("内部商机")');
  await page.waitForSelector('.ib-filters');
  results['ib.tips'] = (await page.locator('.ib-lefttips').count()) === 1;
  results['ib.quickSel'] = (await page.locator('.page.show .ib-rightacts .bselect .bselect-text:has-text("快速选品")').count()) === 1;

  const fails = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fails.length ? `FAIL ${fails.length}` : 'ALL PASS');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})();
