/* Vue 迁移期验证截图：壳层 + 聚合接待模块 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1080 } });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('.app-layout .top-tabs');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/vue-verify-0-shell.png` });

  // ---------- 聚合接待 · 表格页 ----------
  await page.click('.top-tabs-item:has-text("聚合接待")');
  await page.waitForSelector('.rc-tree');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-1-table.png` });

  // 分组 tab + 组策略开关
  await page.click('.rc-group-tabs button:has-text("宝妈三组")');
  await page.waitForSelector('.rc-group-strategy');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/vue-verify-2-grouptab.png` });
  await page.click('.rc-group-tabs button:has-text("全部")');

  // 转移会话弹窗（左右级联）
  await page.click('.rc-btn-manual');
  await page.waitForSelector('.rc-casc');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/vue-verify-3-transfer.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // 值班监控弹窗（饼图）
  await page.click('.rc-op-mon');
  await page.waitForSelector('.rc-mon-pie');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/vue-verify-4-monitor.png` });
  await page.click('.rc-mon-tab:has-text("登录状态")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/vue-verify-4b-monitor-login.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  // ---------- 实时客服接待 ----------
  await page.click('.rc-menu-item:has-text("实时客服接待")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-5-live.png` });

  // ---------- 智能分流策略页 ----------
  await page.click('.rc-menu-item.grp:has-text("分流设置")');
  await page.click('.rc-menu-item.child:has-text("智能分流")');
  await page.waitForSelector('.rc-cards');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-6-strategy.png` });

  // 策略详情抽屉
  await page.click('.rc-card');
  await page.waitForSelector('.rc-drawer');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/vue-verify-7-drawer.png` });

  // 选择账号弹窗
  await page.click('.rc-people-head a:has-text("添加")');
  await page.waitForSelector('.rc-pick-panes');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/vue-verify-8-picker.png` });
  // 关闭选择账号弹窗（点击遮罩左上角，避开 .mask 的 click.self 判定）
  await page.click('.mask', { position: { x: 12, y: 12 } });
  await page.waitForTimeout(300);

  // 关闭策略详情抽屉（点击遮罩左侧，避开抽屉本体）
  await page.click('.rc-drawer-mask', { position: { x: 20, y: 400 } });
  await page.waitForTimeout(300);

  // ---------- 品控中心 ----------
  await page.click('.top-tabs-item:has-text("品控中心")');
  await page.waitForSelector('.qc-side');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/vue-verify-qc-1-dash.png`, fullPage: true });

  // 监控列表
  await page.click('.qc-nav:has-text("监控列表")');
  await page.waitForSelector('.table.qc-wide tbody tr');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-qc-2-series.png`, fullPage: true });

  // 第一行详情抽屉
  await page.click('.qc-op-col a:has-text("查看详情")');
  await page.waitForSelector('.drawer');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-qc-3-drawer.png` });
  await page.click('.drawer-foot .btn:has-text("关闭")');
  await page.waitForTimeout(300);

  // 优化任务页
  await page.click('.qc-nav:has-text("优化任务")');
  await page.waitForSelector('.opt-status-tabs');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-qc-4-opt.png`, fullPage: true });

  // ---------- 应用中心 ----------
  // 首页（看板/首页：公告 banner + 上新 + 榜单 + 意见反馈）
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-home');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/vue-verify-ac-1-dash.png`, fullPage: true });

  // 应用列表（侧栏「全部」）
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForSelector('.ap-grid');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ac-2-list.png`, fullPage: true });

  // 数据概览看板（首页「全部数据」入口）
  await page.click('.ap-cats button:has-text("首页")');
  await page.waitForSelector('.ap-home');
  await page.click('.ap-link:has-text("全部数据")');
  await page.waitForSelector('.ap-dash');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ac-3-overview.png`, fullPage: true });

  // 返回首页 → 消息中心抽屉
  await page.click('.ap-dash-head .ap-back');
  await page.waitForSelector('.ap-home');
  await page.click('.ap-bell');
  await page.waitForSelector('.ap-drawer-msg');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ac-4-msg.png` });
  await page.click('.ap-drawer-msg .ap-drawer-head button:has(svg)');
  await page.waitForTimeout(300);

  // ---------- 智能运营中心 ----------
  // 数据看板（运营驾驶舱）
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.click('.ops-center .side .nav:has-text("运营驾驶舱")');
  await page.waitForSelector('.dash-toolbar');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/vue-verify-ops-1-dash.png`, fullPage: true });

  // 任务中心
  await page.click('.ops-center .side .nav:has-text("任务中心")');
  await page.waitForSelector('.tc-page');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ops-2-task.png`, fullPage: true });

  // 店铺商品
  await page.click('.ops-center .side .nav:has-text("店铺商品")');
  await page.waitForSelector('.page.show .sg-page');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ops-3-goods.png`, fullPage: true });

  // 权限设置 → 成员管理
  await page.click('.ops-center .side .nav-parent:has-text("权限设置")');
  await page.click('.ops-center .side .subnav:has-text("成员管理")');
  await page.waitForSelector('.pm-embed .workspace');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/vue-verify-ops-4-member.png`, fullPage: true });

  // 部门管理：归属前置（无「未配置」、无「编辑归属」）+ 树间距
  await page.click('.ops-center .side .subnav:has-text("部门管理")');
  await page.waitForSelector('.page.show .pm-embed .content-panel table');
  await page.waitForTimeout(300);
  const dmNoEdit = (await page.locator('.page.show .pm-embed a:has-text("编辑归属")').count()) === 0;
  const dmNoUnset = (await page.locator('.page.show .pm-embed td:has-text("未配置")').count()) === 0;
  const dmHasAssign = (await page.locator('.page.show .pm-embed .og-assign-row').count()) > 0;
  await page.screenshot({ path: `${OUT}/vue-verify-ops-5-dept.png`, fullPage: true });

  await browser.close();
  console.log(`VUE SHOTS OK dmNoEdit=${dmNoEdit} dmNoUnset=${dmNoUnset} dmHasAssign=${dmHasAssign}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
