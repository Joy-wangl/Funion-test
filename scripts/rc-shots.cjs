const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 顶部 Tab 进入聚合接待（默认视图①：宝妈接待表格页）
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-page .rc-tree');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/rc-verify-1-table.png` });

  // 分组维度切换标签：宝妈二组
  await page.click('.rc-group-tabs button:has-text("宝妈二组")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1b-grouptab.png`, fullPage: true });
  await page.click('.rc-group-tabs button:has-text("全部")');
  await page.waitForTimeout(300);

  // 分组策略状态 + 关联策略（仅具体分组下展示）
  await page.click('.rc-group-tabs button:has-text("宝妈四组")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1g-groupstrategy.png`, fullPage: true });
  // 关联策略（成员操作列）点击：跳转智能分流页并打开抽屉
  await page.click('.rc-group-tabs button:has-text("宝妈一组")');
  await page.waitForTimeout(300);
  await page.click('.rc-rel-link');
  await page.waitForSelector('.rc-drawer');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1h-reljump.png` });
  await page.click('.rc-drawer-btns .btn:has-text("关闭")');
  await page.waitForTimeout(300);
  await page.click('.rc-menu-item.child:has-text("宝妈接待")');
  await page.waitForTimeout(300);
  // 组开关：开启→关闭（成员禁用）截图→再开启→回全部
  await page.click('.rc-group-tabs button:has-text("宝妈四组")');
  await page.waitForTimeout(300);
  await page.click('.rc-group-strategy .rc-switch');
  await page.waitForTimeout(200);
  await page.click('.rc-group-strategy .rc-switch');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1i-groupoff.png`, fullPage: true });
  await page.click('.rc-group-strategy .rc-switch');
  await page.waitForTimeout(200);
  await page.click('.rc-group-tabs button:has-text("全部")');
  await page.waitForTimeout(300);

  // 接待状态列头筛选：菜单 + 小休过滤 + 还原
  await page.click('.rc-col-filter');
  await page.waitForSelector('.rc-col-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-1c-statusmenu.png` });
  await page.click('.rc-col-opt:has-text("小休")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1d-statusfiltered.png` });
  await page.click('.rc-col-filter');
  await page.waitForSelector('.rc-col-menu');
  await page.click('.rc-col-opt:has-text("全部")');
  await page.waitForTimeout(300);

  // 子表列头排序：接待会话数 降序→升序→清除
  await page.click('.rc-th-sort:has-text("接待会话数")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1j-sortdesc.png`, fullPage: true });
  await page.click('.rc-th-sort:has-text("接待会话数")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-1k-sortasc.png`, fullPage: true });
  await page.click('.rc-th-sort:has-text("接待会话数")');
  await page.waitForTimeout(300);

  // 顶部筛选：接待状态气泡下拉
  await page.click('.rc-filter-row .rc-bs:has-text("接待状态")');
  await page.waitForSelector('.bselect-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-1f-statusbubble.png` });
  await page.click('.bselect-opt:has-text("在线")');
  await page.waitForTimeout(200);
  await page.click('.btn:has-text("重置")');
  await page.waitForTimeout(300);

  // 多公司：展开第二家公司（天猫）
  await page.click('.rc-row-company >> nth=1 >> .rc-caret');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-2-p2.png`, fullPage: true });

  // 手动分流弹窗（单人）：级联选成员
  await page.click('.rc-btn-manual');
  await page.waitForSelector('.modal');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-3-transfer.png` });
  await page.click('.rc-casc-m:has-text("刘芳") input');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-3b-transfer-pick.png` });
  await page.click('.modal-foot .btn:has-text("取消")');
  await page.waitForTimeout(200);

  // 值班监控弹窗：饼图 + tab 切换
  await page.click('.rc-op-mon');
  await page.waitForSelector('.rc-mon');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-6-monitor.png` });
  await page.click('.rc-mon-tab:has-text("登录状态")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-6b-monitor-login.png` });
  await page.click('.modal-foot .btn:has-text("关闭")');
  await page.waitForTimeout(200);

  // 批量转移会话（公司行全选）：级联收起一组 + 选组为目标
  await page.click('.rc-row-company input[type="checkbox"]');
  await page.click('.btn:has-text("批量转移会话")');
  await page.waitForSelector('.rc-casc');
  await page.waitForTimeout(200);
  await page.click('.rc-casc-g:has-text("宝妈二组")');
  await page.click('.rc-casc-g:has-text("宝妈二组") input');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-5-batch.png` });
  await page.click('.modal-foot .btn:has-text("取消")');
  await page.waitForTimeout(200);

  // 视图②：智能分流策略页（侧栏 分流设置 › 智能分流；关联策略跳转可能已展开该组）
  if ((await page.locator('.rc-menu-item.child:has-text("智能分流")').count()) === 0) {
    await page.click('.rc-menu-item.grp:has-text("分流设置")');
  }
  await page.click('.rc-menu-item.child:has-text("智能分流")');
  await page.waitForSelector('.rc-cards');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-6-board.png` });

  // 策略详情抽屉
  await page.click('.rc-cards .rc-card >> nth=0');
  await page.waitForSelector('.rc-drawer');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${OUT}/rc-verify-7-drawer.png` });

  // 选择账号弹窗
  await page.click('.rc-people-head a');
  await page.waitForSelector('.rc-pick-panes');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-8-picker.png` });
  await page.click('.modal-foot .btn:has-text("取消")');
  await page.waitForTimeout(200);
  await page.click('.rc-drawer-btns .btn:has-text("关闭")');
  await page.waitForTimeout(200);

  // 侧边栏未开放模块 toast
  await page.click('.rc-menu-item:has-text("概况")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-9-toast.png` });

  // 视图③：实时客服接待
  await page.click('.rc-menu-item:has-text("实时客服接待")');
  await page.waitForSelector('.rc-live-stores');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-10-live.png` });

  // 展开「查看更多」
  await page.click('.rc-store >> nth=0 >> .rc-more');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/rc-verify-11-live-more.png`, fullPage: true });

  // 切换平台 tab（暂无数据）
  await page.click('.rc-live-tab:has-text("抖音")');
  await page.waitForSelector('.rc-live-empty');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/rc-verify-12-live-empty.png` });

  await browser.close();
  console.log('RC SHOTS OK');
})().catch((e) => { console.error(e); process.exit(1); });
