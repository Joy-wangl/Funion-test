const { chromium } = require('D:/Funion/.playwright/package/index.js');

const OUT = 'd:/Qoder/Funion';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

  // 顶部 Tab 进入应用中心
  await page.click('.top-tabs-item:has-text("应用中心")');
  await page.waitForSelector('.ap-page');

  // 1. 应用列表
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-1-list.png` });

  // 1b. 列表我创建的展开菜单（打开/权限管理/编辑应用）
  await page.click('.ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-1b-list-menu.png` });
  await page.click('.ap-menu-mask');

  // 2. 搜索结果（搜索 ERP）
  await page.fill('.ap-search input', 'ERP');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-2-search.png` });
  await page.click('.ap-search-clear');

  // 3. 应用详情（海贼王ERP）
  await page.click('.ap-cell:has-text("海贼王ERP")');
  await page.waitForSelector('.ap-detail');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-3-detail.png` });
  await page.click('.ap-back');
  await page.waitForSelector('.ap-grid');

  // 4. 我的应用（底部头像栏入口）
  await page.click('.ap-side-user');
  await page.waitForSelector('.ap-mine-tabs');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-4-mine.png` });

  // 5. 我的创作下拉菜单
  await page.click('.ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-5-menu.png` });

  // 6. 删除弹窗
  await page.click('.ap-menu button:has-text("删除应用")');
  await page.waitForSelector('.ap-modal');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-6-delete.png` });
  await page.click('.ap-modal-foot .ap-btn-plain');

  // 7. 我添加的 tab
  await page.click('.ap-mine-tabs button:has-text("我添加的")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-7-added.png` });

  // 7b. 我添加的下拉菜单
  await page.click('.ap-act.caret >> nth=0');
  await page.waitForSelector('.ap-menu');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-7b-added-menu.png` });
  await page.click('.ap-menu-mask');

  // 8. 上传新创作（空表单）
  await page.click('.ap-btn-blue:has-text("上传新创作")');
  await page.waitForSelector('.ap-form');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-8-create.png`, fullPage: true });

  // 9. 上传新创作（填写后）
  await page.fill('.ap-field input', '勤劳小蜜蜂');
  await page.fill('.ap-field textarea', '小蜜蜂干活很刻苦');
  await page.click('.ap-upload.icon');
  await page.click('.ap-upload.main');
  await page.click('.ap-upload.main');
  await page.click('.ap-tag-add');
  await page.waitForSelector('.ap-tag-pop');
  await page.click('.ap-tag-opt >> nth=0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-9-create-filled.png`, fullPage: true });

  // 10. 管理类目抽屉
  await page.click('.ap-cat-manage');
  await page.waitForSelector('.ap-drawer');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/ac-verify-10-cat-drawer.png` });

  // 11. 新建分类 + 修改态
  await page.click('.ap-cat-new');
  await page.fill('.ap-cat-edit-input', '数据分析');
  await page.click('.ap-cat-ic-btn[title="确定"]');
  await page.click('.ap-cat-ic-btn[title="修改"] >> nth=0');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/ac-verify-11-cat-edit.png` });

  // 12. 类目下默认按标签使用次数排序
  await page.click('.ap-drawer-foot .ap-btn-plain');
  await page.click('.ap-cats button:has-text("数据管理类")');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/ac-verify-12-cat-tags.png` });

  await browser.close();
  console.log('screenshots done');
})().catch((e) => { console.error(e); process.exit(1); });
