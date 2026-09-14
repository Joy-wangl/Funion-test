/* 验证：店铺商品 - 京麦 tab（查询条件 / 列表列 / 平铺操作 / 批量改价改库存 / 状态流转 / 详情联动）
 * 一切以京麦 11.0 商品列表调研为准：全部商品=在售+待售聚合；行操作按状态平铺（修改/复制/上架/下架/删除），其余收「更多」 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');
const OUT = 'd:/Qoder/Funion/screenshots';
const P = '.page.show';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  const r = {};

  /* 捕获最后一条 toast（2600ms 自动消失，操作后立即读取） */
  const toast = async () => {
    await page.waitForSelector('.toast-wrap .toast', { timeout: 3000 });
    const ts = await page.locator('.toast-wrap .toast').allTextContents();
    return (ts[ts.length - 1] ?? '').trim();
  };
  const chip = (label) => page.locator(`${P} .sg-statusbar .sg-chip`, { hasText: label });
  const rowCount = () => page.locator(`${P} .jm-table tbody tr`).count();
  const rowActs = (i) => page.locator(`${P} .jm-table tbody tr`).nth(i).locator('.jm-acts a.sg-link').allTextContents();

  /* ---------- 导航：智能运营中心 → 店铺商品 → 京麦 tab ---------- */
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center .side');
  await page.locator('.ops-center .side .nav-text', { hasText: '店铺商品' }).click();
  await page.waitForSelector(`${P} .sg-page`);
  await page.locator(`${P} .sg-tab:text-is("京麦")`).click();
  await page.waitForSelector(`${P} .jm-table`);
  r.tabActive = (await page.locator(`${P} .sg-tab.active`).textContent())?.trim() === '京麦';

  /* ---------- 状态页签：全部商品/在售/待售/审核中/审核驳回/回收站 + 计数 ---------- */
  const chipTexts = (await page.locator(`${P} .sg-statusbar .sg-chip`).allTextContents()).map((t) => t.trim());
  r.chips = JSON.stringify(chipTexts.map((t) => t.replace(/\(\d+\)$/, ''))) ===
    JSON.stringify(['全部商品', '在售', '待售', '审核中', '审核驳回', '回收站']);
  r.chipCounts = JSON.stringify(chipTexts.map((t) => Number((t.match(/\((\d+)\)$/) ?? [])[1]))) ===
    JSON.stringify([5, 2, 3, 1, 1, 1]);

  /* ---------- 查询条件：商品名/商品ID/SKU ID/货号/品牌/类目 + 批量改价/改库存/重置/查询 ---------- */
  const fLabels = (await page.locator(`${P} .sg-filter .sg-field label`).allTextContents()).map((t) => t.trim());
  r.filterFields = JSON.stringify(fLabels) === JSON.stringify(['商品名', '商品ID', 'SKU ID', '货号', '品牌', '类目']);
  const actBtns = (await page.locator(`${P} .sg-actions .sg-btn`).allTextContents()).map((t) => t.trim());
  r.actionBtns = JSON.stringify(actBtns) === JSON.stringify(['批量改价', '批量改库存', '重置', '查询']);
  r.batchDisabled = await page.locator(`${P} .sg-actions .sg-btn:has-text("批量改价")`).isDisabled();

  /* ---------- 列表列：商品信息/京东价/可用库存/商品状态/操作 ---------- */
  const ths = (await page.locator(`${P} .jm-table thead th`).allTextContents()).map((t) => t.trim()).filter(Boolean);
  r.tableHead = JSON.stringify(ths) === JSON.stringify(['商品信息', '京东价', '可用库存', '商品状态', '操作']);
  r.defaultRows = (await rowCount()) === 5;
  /* 商品信息含 商品ID / SKU ID / 货号 三行 */
  r.gidRows = (await page.locator(`${P} .jm-table tbody tr`).first().locator('.sg-gid').count()) === 3;
  await page.screenshot({ path: `${OUT}/sg-jm-list.png`, fullPage: true });

  /* ---------- 各状态页签的行操作（平铺重点操作 + 更多） ---------- */
  await chip('在售').click();
  r.onsaleRows = (await rowCount()) === 2;
  r.onsaleActs = JSON.stringify((await rowActs(0)).map((t) => t.trim())) === JSON.stringify(['修改', '复制', '下架', '删除']);
  r.onsaleMore = (await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a:has-text("更多")').count()) === 1;

  await chip('待售').click();
  r.pendingRows = (await rowCount()) === 3;
  r.pendingActs = JSON.stringify((await rowActs(0)).map((t) => t.trim())) === JSON.stringify(['修改', '复制', '上架', '删除']);
  /* 待售子状态标签（未上架/自主下架/系统下架待审核） */
  r.pendingSubs = (await page.locator(`${P} .jm-table tbody .sg-offtag.normal`).allTextContents()).map((t) => t.trim())
    .sort().join('|') === ['未上架', '自主下架', '系统下架待审核'].sort().join('|');
  await page.screenshot({ path: `${OUT}/sg-jm-pending.png`, fullPage: true });

  await chip('审核中').click();
  r.auditRows = (await rowCount()) === 1;
  r.auditActs = JSON.stringify((await rowActs(0)).map((t) => t.trim())) === JSON.stringify(['催审', '复制']);

  await chip('审核驳回').click();
  r.rejectRows = (await rowCount()) === 1;
  r.rejectActs = JSON.stringify((await rowActs(0)).map((t) => t.trim())) === JSON.stringify(['修改', '复制', '删除']);
  r.rejectTag = (await page.locator(`${P} .jm-table tbody .sg-failtag`).count()) === 1;

  await chip('回收站').click();
  r.recycleRows = (await rowCount()) === 1;
  r.recycleActs = JSON.stringify((await rowActs(0)).map((t) => t.trim())) === JSON.stringify(['还原', '彻底删除']);

  /* ---------- 查询：品牌=PERDORA → 全部商品命中 2 行；重置 → 5 行 ---------- */
  await chip('全部商品').click();
  await page.locator(`${P} .sg-filter .sg-field:has(label:text-is("品牌")) input`).fill('PERDORA');
  await page.locator(`${P} .sg-actions .sg-btn:has-text("查询")`).click();
  await page.waitForTimeout(150);
  r.queryBrand = (await rowCount()) === 2;
  await page.locator(`${P} .sg-actions .sg-btn:has-text("重置")`).click();
  await page.waitForTimeout(150);
  r.queryReset = (await rowCount()) === 5;

  /* ---------- 批量改价：全选 5 → 京东价 88.88 ---------- */
  await page.locator(`${P} .jm-table thead th input[type=checkbox]`).click();
  await page.waitForTimeout(120);
  r.selAll = ((await page.locator(`${P} .sg-actions .sg-mini`).textContent()) ?? '').includes('5');
  r.batchEnabled = !(await page.locator(`${P} .sg-actions .sg-btn:has-text("批量改价")`).isDisabled());
  await page.locator(`${P} .sg-actions .sg-btn:has-text("批量改价")`).click();
  await page.waitForSelector('.mask .modal');
  r.priceModalTitle = (await page.locator('.mask .m-title').textContent())?.trim() === '批量改价';
  await page.locator('.mask .bp-input').fill('88.88');
  await page.locator('.mask .modal-foot .btn.primary').click();
  r.priceToast = (await toast()).includes('批量改价成功');
  await page.waitForTimeout(200);
  r.priceApplied = (await page.locator(`${P} .jm-table tbody .jm-price`).allTextContents()).every((t) => t.trim() === '¥88.88');
  await page.screenshot({ path: `${OUT}/sg-jm-batchprice.png`, fullPage: true });

  /* ---------- 批量改库存：全选 5 → 可用库存 500 ---------- */
  await page.locator(`${P} .jm-table thead th input[type=checkbox]`).click();
  await page.waitForTimeout(120);
  await page.locator(`${P} .sg-actions .sg-btn:has-text("批量改库存")`).click();
  await page.waitForSelector('.mask .modal');
  r.stockModalTitle = (await page.locator('.mask .m-title').textContent())?.trim() === '批量改库存';
  await page.locator('.mask .bp-input').fill('500');
  await page.locator('.mask .modal-foot .btn.primary').click();
  r.stockToast = (await toast()).includes('批量改库存成功');
  await page.waitForTimeout(200);
  const stockCells = await page.locator(`${P} .jm-table tbody tr`).evaluateAll(
    (trs) => trs.map((tr) => tr.children[3]?.textContent?.trim()),
  );
  r.stockApplied = stockCells.every((v) => v === '500');

  /* ---------- 状态流转：在售 → 下架 → 待售 → 上架 → 在售 ---------- */
  await chip('在售').click();
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("下架")').click();
  r.offToast = (await toast()).includes('已下架');
  await page.waitForTimeout(200);
  r.afterOff = (await rowCount()) === 1; /* 在售 2 → 1 */
  await chip('待售').click();
  r.pendingAfterOff = (await rowCount()) === 4; /* 待售 3 → 4 */
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("上架")').click();
  r.onToast = (await toast()).includes('已上架');
  await page.waitForTimeout(200);
  r.afterOn = (await rowCount()) === 3; /* 待售 4 → 3 */

  /* ---------- 删除 → 回收站 → 还原 ---------- */
  await chip('在售').click();
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("删除")').click();
  r.delToast = (await toast()).includes('移入商品回收站');
  await page.waitForTimeout(200);
  await chip('回收站').click();
  r.recycleAfterDel = (await rowCount()) === 2; /* 回收站 1 → 2 */
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("还原")').click();
  r.restoreToast = (await toast()).includes('已还原');
  await page.waitForTimeout(200);
  r.recycleAfterRestore = (await rowCount()) === 1;

  /* ---------- 彻底删除：确认弹窗 → 移除 ---------- */
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("彻底删除")').click();
  await page.waitForSelector('.mask .modal');
  r.delModalTitle = (await page.locator('.mask .m-title').textContent())?.trim() === '删除确认';
  await page.screenshot({ path: `${OUT}/sg-jm-delconfirm.png` });
  await page.locator('.mask .modal-foot .btn.primary').click();
  r.purgeToast = (await toast()).includes('已彻底删除');
  await page.waitForTimeout(200);
  r.recycleEmpty = (await rowCount()) === 0 && (await page.locator(`${P} .sg-empty`).count()) === 1;

  /* ---------- 复制：生成新的待售商品 ---------- */
  await chip('在售').click();
  const onsaleBefore = await rowCount();
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("复制")').click();
  r.copyToast = (await toast()).includes('复制成功');
  await page.waitForTimeout(200);
  await chip('待售').click();
  r.copyAdded = (await rowCount()) >= 1; /* 新待售商品已入列 */
  await chip('在售').click();
  r.copyKeepsOnsale = (await rowCount()) === onsaleBefore; /* 复制不影响原在售行 */

  /* ---------- 催审 ---------- */
  await chip('审核中').click();
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("催审")').click();
  r.urgeToast = (await toast()).includes('已催审');

  /* ---------- 行操作「修改」→ 京麦详情编辑态 ---------- */
  await chip('审核驳回').click();
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a.sg-link:has-text("修改")').click();
  await page.waitForSelector(`${P} .jm-detail`);
  await page.waitForTimeout(200);
  r.editMode = (await page.locator(`${P} .jm-detail .cpd-spec-card`).count()) === 2
    && (await page.locator(`${P} .cpd-top-acts .sg-btn:has-text("保存版本")`).count()) === 1;
  await page.screenshot({ path: `${OUT}/sg-jm-detail-edit.png`, fullPage: true });
  await page.locator(`${P} .sgd-back`).click();
  await page.waitForSelector(`${P} .jm-table`);
  r.backFromEdit = (await page.locator(`${P} .sg-tab.active`).textContent())?.trim() === '京麦';

  /* ---------- 「更多 → 商品详情」→ 京麦详情查看态 ---------- */
  await chip('全部商品').click();
  await page.locator(`${P} .jm-table tbody tr`).first().locator('.jm-acts a:has-text("更多")').click();
  await page.waitForSelector('.add-pop .add-pop-item');
  r.moreHasDetail = ((await page.locator('.add-pop .add-pop-item').allTextContents()).map((t) => t.trim())).includes('商品详情');
  await page.locator('.add-pop .add-pop-item:has-text("商品详情")').click();
  await page.waitForSelector(`${P} .jm-detail`);
  await page.waitForTimeout(200);
  r.viewMode = (await page.locator(`${P} .jm-detail .sgd-spec-row`).count()) === 2
    && (await page.locator(`${P} .jm-detail .cpd-spec-card`).count()) === 0;
  await page.screenshot({ path: `${OUT}/sg-jm-detail-view.png`, fullPage: true });
  await page.locator(`${P} .sgd-back`).click();
  await page.waitForSelector(`${P} .jm-table`);

  r.errors = errors.length === 0;
  if (errors.length) console.log('CONSOLE ERRORS:', errors);
  const fail = Object.entries(r).filter(([, v]) => !v);
  console.log(fail.length ? `FAIL ${fail.length}:` : 'ALL PASS', JSON.stringify(r, null, 1));
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
