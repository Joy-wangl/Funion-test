const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 顶部 Tab 进入应用中心
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-page');

  // 1. 首页默认落地（空态）
  await page.waitForSelector('.ap-home');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-1-home-empty.png`, fullPage: true });

  // 2. 全部 tab 列表
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForSelector('.ap-grid');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-2-list.png` });

  // 2b. 列表我创建的展开菜单
  await page.click('.ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-2b-list-menu.png` });
  await page.click('.ap-menu-mask');

  // 3. 搜索结果（搜索 ERP）
  await page.fill('.ap-search input', 'ERP');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-3-search.png` });
  await page.click('.ap-search-clear');

  // 4. 详情 + 收藏
  await page.click('.ap-cell:has-text("海贼王ERP")');
  await page.waitForSelector('.ap-detail');
  await page.click('.ap-fav');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-4-detail-fav.png` });
  await page.click('.ap-back');
  await page.waitForSelector('.ap-grid');

  // 5. 我的应用（底部头像栏入口）
  await page.click('.ap-side-user');
  await page.waitForSelector('.ap-mine-tabs');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-5-mine.png` });

  // 6. 我的创作下拉菜单
  await page.click('.ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-6-menu.png` });

  // 7. 删除弹窗
  await page.click('.ap-menu button:has-text("删除应用")');
  await page.waitForSelector('.ap-modal');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-7-delete.png` });
  await page.click('.ap-modal-foot .ap-btn-plain');

  // 8. 我添加的 tab + 菜单
  await page.click('.ap-mine-tabs button:has-text("我添加的")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-8-added.png` });
  await page.click('.ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-8b-added-menu.png` });
  await page.click('.ap-menu-mask');

  // 9. 上传新创作（空表单）
  await page.click('.ap-btn-blue:has-text("上传新创作")');
  await page.waitForSelector('.ap-form');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-9-create.png`, fullPage: true });

  // 10. 上传新创作（填写后）
  await page.fill('.ap-field input', '勤劳小蜜蜂');
  await page.fill('.ap-field textarea', '小蜜蜂干活很刻苦');
  await page.click('.ap-upload.icon');
  await page.click('.ap-upload.main');
  await page.click('.ap-upload.main');
  await page.click('.ap-tag-add');
  await page.waitForSelector('.ap-tag-pop');
  await page.click('.ap-tag-opt >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-10-create-filled.png`, fullPage: true });

  // 11. 管理类目抽屉 + 修改态
  await page.click('.ap-cat-manage');
  await page.waitForSelector('.ap-drawer');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-11-cat-drawer.png` });
  await page.click('.ap-cat-new');
  await page.fill('.ap-cat-edit-input', '数据分析');
  await page.click('.ap-cat-ic-btn[title="确定"]');
  await page.click('.ap-cat-ic-btn[title="修改"] >> nth=0');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-11b-cat-edit.png` });
  await page.click('.ap-drawer-foot .ap-btn-plain');

  // 12. 类目下默认按标签使用次数排序
  await page.click('.ap-cats button:has-text("数据管理类")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-12-cat-tags.png` });

  // 13. 记录最近使用（全部列表打开一个应用）
  await page.click('.ap-cats button:has-text("全部")');
  await page.waitForTimeout(300);
  await page.click('.ap-act.plain:has-text("打开") >> nth=0');
  await page.waitForTimeout(300);

  // 14. 首页（有数据）
  await page.click('.ap-cats button:has-text("首页")');
  await page.waitForSelector('.ap-home');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-14-home.png`, fullPage: true });

  // 15. 平台公告 banner 弹窗
  await page.click('.ap-banner');
  await page.waitForSelector('.ap-notice-body');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-15-notice.png` });
  await page.click('.ap-modal-foot .ap-btn-blue');

  // 16. 贡献榜 tab 切换（最佳应用榜）
  await page.click('.ap-rank-tabs button:has-text("最佳应用榜")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-16-rank-best.png`, fullPage: true });

  await browser.close();
  console.log('screenshots done');
})().catch((e) => { console.error(e); process.exit(1); });
