/* 临时验证：素材中心 1:1 原型还原（四屏：左悬浮/选中、导入竞品链接、右展开、右选择） */
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
  await page.click('.subnav:has-text("竞价商品")');
  await page.waitForSelector('.ops-center .page.show .bd-table');

  /* 进入详情（查看态无素材入口） */
  await page.locator('.ops-center .page.show .bd-table tbody a:has-text("详情")').first().click();
  await page.waitForSelector('.sgd-top-title');
  results['entry.hiddenView'] = (await page.locator('.cpd-side-btn:has-text("素材")').count()) === 0;

  /* 编辑态出现素材入口 */
  await page.click('.cpd-top-acts button:has-text("编辑")');
  results['entry.editShow'] = (await page.locator('.cpd-side-btn:has-text("素材")').count()) === 1;

  /* 进入素材中心 */
  await page.click('.cpd-side-btn:has-text("素材")');
  await page.waitForSelector('.mc-page');
  results['mc.title'] = ((await page.locator('.mc-title').textContent()) || '').includes('素材中心');
  results['mc.acts'] = (await page.locator('.mc-acts button:has-text("取消")').count()) === 1
    && (await page.locator('.mc-acts button:has-text("保存修改")').count()) === 1;
  results['mc.tabs'] = (await page.locator('.mc-tab').count()) === 2
    && ((await page.locator('.mc-tab.active').textContent()) || '').includes('选图换图');

  /* 分区：主图/SKU/详情/白底，无视频（1:1 原型） */
  const secs = (await page.locator('.mc-left-body .mc-sec-title').allTextContents()).join(',');
  results['mc.secs'] = secs.includes('商品主图') && secs.includes('SKU图片') && secs.includes('详情图') && secs.includes('通用商品白底图') && !secs.includes('视频');

  /* 图片块：主图4 / 详情8 / 白底1 / 上传1 / SKU行4 / 拖拽角标 */
  const imgsGroups = page.locator('.mc-left-body .mc-imgs');
  results['mc.main4'] = (await imgsGroups.nth(0).locator('.mc-img').count()) === 4;
  results['mc.detail8'] = (await imgsGroups.nth(1).locator('.mc-img').count()) === 8;
  results['mc.white1'] = (await imgsGroups.nth(2).locator('.mc-img').count()) === 1;
  results['mc.upload1'] = (await page.locator('.mc-left-body .mc-upload').count()) === 1;
  results['mc.sku4'] = (await page.locator('.mc-sku-row').count()) === 4;
  results['mc.skuNoCode'] = (await page.locator('.mc-left-body .mc-sku-codes').count()) === 0
    && (await page.locator('.mc-left-body .mc-sku-img').count()) === 4;
  results['mc.drag'] = (await page.locator('.mc-left-body .mc-drag').count()) >= 12;

  /* 分区定位 tab：点「详情图」滚动定位+高亮；回顶后「商品主图」恢复高亮 */
  await page.locator('.mc-anchor button:has-text("详情图")').click();
  await page.waitForTimeout(700);
  const leftBox = page.locator('.mc-left');
  const st1 = await leftBox.evaluate((el) => el.scrollTop);
  results['mc.anchorJump'] = st1 > 100 && (((await page.locator('.mc-anchor button.on').textContent()) || '').includes('详情图'));
  await page.waitForTimeout(400); /* 等点击锁过期，再验证纯滚动监听 */
  await leftBox.evaluate((el) => el.scrollTo({ top: 0 }));
  await page.waitForTimeout(300);
  results['mc.anchorSpy'] = ((await page.locator('.mc-anchor button.on').textContent()) || '').includes('商品主图');

  /* 悬浮白色气泡：查看/更换/删除；删除主图 → 3 */
  await imgsGroups.nth(0).locator('.mc-img').first().hover();
  const ops = ((await imgsGroups.nth(0).locator('.mc-bubble.h').first().textContent()) || '').replace(/\s/g, '');
  results['mc.hoverBubble'] = ops.includes('查看') && ops.includes('更换') && ops.includes('删除');
  await imgsGroups.nth(0).locator('.mc-bubble.h a:has-text("删除")').first().click();
  results['mc.removeMain'] = (await imgsGroups.nth(0).locator('.mc-img').count()) === 3;

  /* 点选主图：蓝框 + 常显气泡 替换/添加 */
  const mainTiles = page.locator('.mc-imgs .mc-img');
  await mainTiles.nth(1).click();
  const pickTxt = ((await page.locator('.mc-bubble.s').textContent()) || '').replace(/\s/g, '');
  results['mc.pick'] = (await page.locator('.mc-img.selected').count()) === 1
    && pickTxt.includes('替换') && pickTxt.includes('添加');
  await mainTiles.nth(1).click();
  results['mc.unpick'] = (await page.locator('.mc-img.selected').count()) === 0;

  /* 查看预览：遮罩 + ESC 关闭 */
  await imgsGroups.nth(0).locator('.mc-img').first().hover();
  await imgsGroups.nth(0).locator('.mc-bubble.h a:has-text("查看")').first().click();
  results['mc.preview'] = (await page.locator('.mc-preview').count()) === 1;
  await page.keyboard.press('Escape');
  results['mc.previewEsc'] = (await page.locator('.mc-preview').count()) === 0;

  /* 同类拖拽排序：主图第1张拖到第3张 */
  const before = await imgsGroups.nth(0).locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  const dt1 = await page.evaluateHandle(() => new DataTransfer());
  await imgsGroups.nth(0).locator('.mc-img').nth(0).dispatchEvent('dragstart', { dataTransfer: dt1 });
  await imgsGroups.nth(0).locator('.mc-img').nth(2).dispatchEvent('drop', { dataTransfer: dt1 });
  const after = await imgsGroups.nth(0).locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  results['mc.reorder'] = after[2] === before[0] && after[0] === before[1];

  /* 一键美化 tab：tab 提示 + 左生成控制卡 + 右任务三态 */
  await page.click('.mc-tab:has-text("一键美化")');
  results['mc.beautyHint'] = (await page.locator('.mc-tab-hint:has-text("更换商品风格")').count()) === 1;
  results['mc.beautyGen'] = (await page.locator('.mc-gen-card').count()) === 1
    && (await page.locator('.mc-prompt-chip:has-text("生成提示词")').count()) === 1
    && (await page.locator('.mc-gen-bar button:has-text("仅生成")').count()) === 1;
  results['mc.beautyTasks'] = (await page.locator('.mc-task').count()) === 3;
  results['mc.beautyStates'] = (await page.locator('.mc-task-pct').count()) === 1
    && (await page.locator('.mc-regen:has-text("重新生成")').count()) === 1
    && (await page.locator('.mc-task-strip .mc-thwrap').count()) === 4
    && ((await page.locator('.mc-strip-more').last().textContent()) || '').includes('+3');
  /* 空提示词提交→报错；生成提示词→chip 变优化；再提交→新增 running 任务 */
  await page.click('.mc-gen-bar button:has-text("仅生成")');
  results['mc.beautyGenErr'] = ((await page.locator('.toast').last().textContent()) || '').includes('请先填写美化需求');
  await page.click('.mc-prompt-chip');
  results['mc.beautyPrompt'] = (await page.locator('.mc-prompt-chip:has-text("优化提示词")').count()) === 1;
  await page.click('.mc-gen-bar button:has-text("仅生成")');
  results['mc.beautyNewTask'] = (await page.locator('.mc-task').count()) === 4;
  /* 完成态任务：展开→6 图密铺；悬浮气泡 5 操作 */
  await page.locator('.mc-task').nth(3).locator('.mc-fold').click();
  results['mc.beautyExpand'] = (await page.locator('.mc-task').nth(3).locator('.mc-task-grid .mc-thwrap').count()) === 6;
  await page.locator('.mc-task').nth(3).locator('.mc-thwrap').first().hover();
  results['mc.beautyBubble'] = (await page.locator('.mc-float-bubble a:visible').count()) === 5;
  await page.screenshot({ path: `${OUT}/ops-verify-material-beauty.png` });
  await page.click('.mc-tab:has-text("选图换图")');

  /* 右栏：3 条目 / 收起态响应式图墙全展示(每5) / 淘宝黄标 / 创建人+前往查看 与平台标签同排（展开下方） */
  results['lib.entries'] = (await page.locator('.mc-lib').count()) === 3;
  results['lib.strip'] = (await page.locator('.mc-lib-strip img').count()) === 15;
  results['lib.more'] = (await page.locator('.mc-strip-more').count()) === 0;
  results['lib.meta'] = (await page.locator('.mc-lib-tag:has-text("淘宝")').count()) === 3
    && (await page.locator('.mc-lib-meta a:has-text("前往查看")').count()) === 3
    && (await page.locator('.mc-lib-meta .mc-lib-person').count()) === 3
    && (await page.locator('.mc-lib-top a:has-text("前往查看")').count()) === 0;
  const tagBox = await page.locator('.mc-lib-meta .mc-lib-tag').first().boundingBox();
  const personBox = await page.locator('.mc-lib-meta .mc-lib-person').first().boundingBox();
  results['lib.personSameRow'] = !!tagBox && !!personBox && Math.abs(tagBox.y - personBox.y) < 4;
  await page.screenshot({ path: `${OUT}/ops-verify-mclib.png` });

  /* 展开首条：主图5/SKU图墙3/详情4；右图点选 */
  await page.click('.mc-lib .mc-fold');
  results['lib.open'] = (await page.locator('.mc-lib-open').count()) === 1;
  results['lib.rmain5'] = (await page.locator('.mc-lib-open .mc-rgrid:not(.two):not(.sku) .mc-rimg').count()) === 5;
  results['lib.rsku3'] = (await page.locator('.mc-lib-open .mc-rgrid.sku .mc-rimg').count()) === 3;
  results['lib.rdetail4'] = (await page.locator('.mc-lib-open .mc-rgrid.two .mc-rimg').count()) === 4;
  await page.locator('.mc-rgrid:not(.two) .mc-rimg').first().click();
  results['lib.rsel'] = (await page.locator('.mc-rimg.sel').count()) === 1;
  await page.locator('.mc-rgrid:not(.two) .mc-rimg').nth(1).click();
  results['lib.multiSel'] = (await page.locator('.mc-rimg.sel').count()) === 2;

  /* 批量拖拽换图：右栏选中 2 张拖到左栏主图第 1 张，顺序替换 */
  const dt2 = await page.evaluateHandle(() => new DataTransfer());
  await page.locator('.mc-rgrid:not(.two) .mc-rimg').nth(0).dispatchEvent('dragstart', { dataTransfer: dt2 });
  await imgsGroups.nth(0).locator('.mc-img').nth(0).dispatchEvent('drop', { dataTransfer: dt2 });
  const srcs2 = await imgsGroups.nth(0).locator('img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
  results['lib.dragSwap'] = (srcs2[0] || '').includes('hairpin') && (srcs2[1] || '').includes('main');

  /* 手风琴：展开第 2 条时第 1 条自动收起 */
  await page.locator('.mc-lib').nth(1).locator('.mc-fold').click();
  results['lib.accordion'] = (await page.locator('.mc-lib-open').count()) === 1
    && (await page.locator('.mc-lib').nth(0).locator('.mc-lib-strip').count()) === 1;

  /* 导入素材弹层：竞品链接可增删 + 必填校验 + 导入新增条目 */
  await page.click('.mc-right-head button:has-text("导入素材")');
  results['mc.importOpen'] = (await page.locator('.mc-import-pop').count()) === 1;
  await page.click('.mc-pop-add');
  results['mc.importRow2'] = (await page.locator('.mc-pop-row').count()) === 2;
  await page.click('.mc-import-pop button:has-text("开始导入")');
  results['mc.importErr'] = (await page.locator('.mc-pop-row.err').count()) === 2;
  await page.fill('.mc-pop-row input >> nth=0', 'https://mobile.yangkeduo.com/goods.html?id=1');
  await page.fill('.mc-pop-row input >> nth=1', 'https://item.taobao.com/item.htm?id=2');
  await page.click('.mc-import-pop button:has-text("开始导入")');
  results['mc.imported'] = (await page.locator('.mc-import-pop').count()) === 0
    && (await page.locator('.mc-lib').count()) === 4;

  /* 截图：左栏回顶 + 首条展开态 */
  await page.locator('.mc-left').evaluate((el) => el.scrollTo({ top: 0 }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ops-verify-material.png` });

  /* 取消返回详情 */
  await page.click('.mc-acts button:has-text("取消")');
  await page.waitForSelector('.sgd-top-title');
  results['mc.back'] = (await page.locator('.sgd-top-title').count()) === 1;

  await browser.close();
  const fail = Object.entries(results).filter(([, v]) => !v);
  console.log(JSON.stringify(results, null, 2));
  console.log(fail.length ? `FAIL: ${fail.map(([k]) => k).join(', ')}` : 'ALL PASS');
})().catch((e) => { console.error(e); process.exit(1); });
