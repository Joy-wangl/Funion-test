/* AI作图中心闭环自测：壳落地→选品→场景/风格→生成→结果→素材库/任务/配置→选区/详情/失败态 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const OUT = 'D:/PM.funion/screenshots';
const BASE = process.argv[2] || 'http://localhost:5173/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  page.setDefaultTimeout(60000);
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE:', m.text()); });

  await page.goto(`${BASE}#ai-studio`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.as-app', { state: 'attached' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/as-01-shell.png` });

  // 顶栏 tab 位置（智能运营中心后方）
  const tabOrder = await page.$$eval('.top-tabs-item .top-tabs-chip-label', (els) => els.map((e) => e.textContent));
  console.log('TABS:', tabOrder.join(','));

  // 缺商品时生成禁用 + 提示
  const genDisabled = await page.$eval('.as-gen-btn', (b) => b.disabled);
  const hint = await page.$eval('.as-gen-hint', (e) => e.textContent.trim());
  console.log('GEN_DISABLED:', genDisabled, 'HINT:', hint);

  // 选品弹窗
  await page.click('.as-src-row .as-src-tile');
  await page.waitForSelector('.as-pick-grid');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/as-02-pick.png` });
  await page.click('.as-pick-card');
  await page.click('.as-app .modal-foot .as-btn.primary');
  await page.waitForSelector('.as-src-card');

  // 场景 + 风格
  await page.click('.as-scene-card');
  await page.click('.as-style-card');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/as-03-conf.png` });

  // 生成 → 运行态 → 结果
  await page.click('.as-gen-btn');
  await page.waitForSelector('.as-run-head');
  await page.screenshot({ path: `${OUT}/as-04-running.png` });
  await page.waitForSelector('.as-res-grid .as-res-cell', { timeout: 30000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/as-05-results.png` });

  // 存素材库（全部）
  await page.click('.as-res-foot .as-btn:first-child');
  await page.waitForTimeout(300);

  // 素材库
  await page.click('.as-nav-item:has-text("素材库")');
  await page.waitForSelector('.as-mat-grid');
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/as-06-material.png` });
  // 空态（搜索无果）
  await page.fill('.as-mat-bar .as-pick-kw', 'zzz-no-match');
  await page.waitForSelector('.as-mat .as-empty');
  await page.screenshot({ path: `${OUT}/as-07-material-empty.png` });
  await page.fill('.as-mat-bar .as-pick-kw', '');

  // 任务记录：种子失败行展开
  await page.click('.as-nav-item:has-text("任务记录")');
  await page.waitForSelector('.as-task-table');
  await page.screenshot({ path: `${OUT}/as-08-tasks.png` });
  await page.click('.as-tr:has-text("抠白底图")');
  await page.waitForSelector('.as-fail-note');
  await page.screenshot({ path: `${OUT}/as-09-task-fail.png` });

  // 配置页：场景库开关 + 风格库
  await page.click('.as-nav-item:has-text("场景与风格配置")');
  await page.waitForSelector('.as-conf-grid');
  await page.screenshot({ path: `${OUT}/as-10-config-scene.png` });
  await page.click('.as-seg.tabs button:has-text("风格库")');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${OUT}/as-11-config-style.png` });

  // 回工作台：选区清除杂物（拖拽画选区）→ 生成
  await page.click('.as-nav-item:has-text("作图工作台")');
  await page.click('.as-act:has-text("选区清除杂物")');
  await page.waitForSelector('.as-stage');
  await page.$eval('.as-stage', (el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const box = await page.$eval('.as-stage', (el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  await page.mouse.move(box.x + box.w * 0.2, box.y + box.h * 0.25);
  await page.mouse.down();
  await page.mouse.move(box.x + box.w * 0.45, box.y + box.h * 0.5, { steps: 6 });
  await page.mouse.up();
  await page.waitForSelector('.as-rect-tag');
  await page.screenshot({ path: `${OUT}/as-12-rect.png` });
  await page.click('.as-gen-btn');
  await page.waitForSelector('.as-res-grid .as-res-cell', { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/as-13-rect-result.png` });

  // 详情图：屏数 + 长图结果
  await page.click('.as-act:has-text("详情图")');
  await page.waitForTimeout(200);
  await page.click('.as-style-card');
  await page.click('.as-gen-btn');
  await page.waitForSelector('.as-res-grid .as-res-cell', { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/as-14-detail.png` });

  // 白底图透明底
  await page.click('.as-act:has-text("抠白底图")');
  await page.click('.as-seg button:has-text("透明底")');
  await page.click('.as-gen-btn');
  await page.waitForSelector('.as-res-grid .as-res-cell', { timeout: 30000 });
  await page.screenshot({ path: `${OUT}/as-15-whitebg.png` });

  await browser.close();
  console.log('AS-VERIFY DONE');
})().catch((e) => { console.error('VERIFY FAIL:', e.message); process.exit(1); });
