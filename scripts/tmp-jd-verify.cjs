/* 竞店商品双 tab 版功能回归：子 tab 切换 / 筛选 / 收起 / 排序 / 跨 tab 跳转 / 创建 / 删除确认 / 空态 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');
const fs = require('fs');

const OUT = 'D:/PM.funion/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const ok = [];
const bad = [];
const check = (name, cond, extra = '') => {
  (cond ? ok : bad).push(name);
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' | ' + extra : ''}`);
};

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 950 } });
  page.setDefaultTimeout(60000);
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.click('.top-tabs-item:has-text("智能运营中心")');
  await page.waitForSelector('.ops-center');
  await page.click('.subnav:has-text("市场商机")');
  await page.waitForSelector('.ops-center .page.show .mk2-seg');
  await page.click('.ops-center .page.show .mk2-tab:has-text("竞店商品")');
  await page.waitForTimeout(600);

  const subs = page.locator('.ops-center .page.show .mk2-subseg .mk2-subtab');
  const taskTab = subs.nth(0);
  const goodsTab = subs.nth(1);
  const taskRows = page.locator('.ops-center .page.show .mk-jd-table tbody tr');

  check('竞店商品有双 tab', (await subs.allInnerTexts()).join('|') === '竞店任务|店铺商品', (await subs.allInnerTexts()).join('|'));
  check('默认选中竞店任务', (await taskTab.getAttribute('class')).includes('active'));
  check('竞店任务表 11 行', (await taskRows.count()) === 11, `rows=${await taskRows.count()}`);

  /* 顶栏与子 tab 拼接成一张卡（solo 只在淘宝顺买生效） */
  const mount = await page.evaluate(() => {
    const top = document.querySelector('.ops-center .page.show .mk2-top');
    const sub = document.querySelector('.ops-center .page.show .mk2-subseg');
    return { solo: top.classList.contains('solo'), sameCard: Math.round(top.getBoundingClientRect().bottom) === Math.round(sub.getBoundingClientRect().top) };
  });
  check('顶栏与子 tab 同卡拼接', !mount.solo && mount.sameCard, JSON.stringify(mount));

  /* 竞店任务筛选 / 收起 / 重置 */
  const foldBtn = page.locator('.ops-center .page.show .mk-jd-fold');
  const taskQuery = page.locator('.ops-center .page.show .sg-actions .sg-btn.primary').last();
  await page.fill('.ops-center .page.show input[placeholder="请输入竞店名称"]', '果奇');
  await taskQuery.click();
  await page.waitForTimeout(350);
  check('任务按名称筛选', (await taskRows.count()) === 1, `rows=${await taskRows.count()}`);
  await page.locator('.ops-center .page.show .sg-actions .sg-btn:not(.primary)').click();
  await page.waitForTimeout(350);
  check('任务重置恢复 11 行', (await taskRows.count()) === 11);

  await foldBtn.click();
  await page.waitForTimeout(350);
  check('收起后筛选字段隐藏', (await page.locator('.ops-center .page.show .mk-jd-fold').innerText()).trim() === '展开' && (await page.locator('.ops-center .page.show input[placeholder="请输入竞店名称"]').count()) === 0);
  await page.screenshot({ path: `${OUT}/jd2-folded.png` });
  await foldBtn.click();
  await page.waitForTimeout(350);
  check('展开恢复筛选', (await page.locator('.ops-center .page.show input[placeholder="请输入竞店名称"]').count()) === 1);

  /* 创建任务弹窗 */
  await page.locator('.ops-center .page.show .sg-actions .sg-btn', { hasText: '创建任务' }).click();
  await page.waitForTimeout(400);
  check('创建任务弹窗打开', await page.locator('.mk-create-mask').isVisible());
  await page.locator('.mk-create-mask .sg-btn', { hasText: '取消' }).first().click();
  await page.waitForTimeout(300);

  /* 删除任务二次确认（取消） */
  await taskRows.first().locator('a', { hasText: '删除任务' }).click();
  await page.waitForTimeout(350);
  check('删除任务二次确认', (await page.locator('.mk-confirm-mask .mk-confirm-body').innerText()).includes('删除后不可恢复'));
  await page.locator('.mk-confirm-mask .sg-btn', { hasText: '取消' }).click();
  await page.waitForTimeout(300);
  check('取消后数据不变', (await taskRows.count()) === 11);

  /* 跨 tab：任务行「店铺商品」→ 切到店铺商品 tab 并按店过滤 */
  const taskName = (await taskRows.first().locator('td').nth(1).innerText()).trim();
  await taskRows.first().locator('a', { hasText: '店铺商品' }).click();
  await page.waitForTimeout(700);
  const goodsActive = (await goodsTab.getAttribute('class')).includes('active');
  const shopVal = await page.locator('.ops-center .page.show input[placeholder="请输入店铺名称"]').inputValue();
  const scrollTop = await page.evaluate(() => document.querySelector('.app-content').scrollTop);
  check('跨 tab 切到店铺商品', goodsActive);
  check('跨 tab 预填店铺名', shopVal === taskName, `${shopVal} / ${taskName}`);
  check('跨 tab 回到页面顶部', scrollTop < 8, `scrollTop=${scrollTop}`);
  check('按该店过滤生效', (await taskRows.count()) < 11, `rows=${await taskRows.count()}`);
  await page.screenshot({ path: `${OUT}/jd2-jump.png` });

  /* 店铺商品筛选 / 排序 / 重置 */
  await page.locator('.ops-center .page.show .sg-actions .sg-btn:not(.primary):not(:disabled)').last().click();
  await page.waitForTimeout(350);
  check('商品重置恢复 11 行', (await taskRows.count()) === 11, `rows=${await taskRows.count()}`);

  const priceOf = async () => (await taskRows.allInnerTexts()).map((t) => Number((t.match(/\d+\.\d{2}/g) || [0])[0]));
  const priceTh = page.locator('.ops-center .page.show th', { hasText: '售价' });
  await priceTh.click();
  await page.waitForTimeout(300);
  const desc = await priceOf();
  check('售价首点降序', desc.every((v, i) => i === 0 || desc[i - 1] >= v), desc.join(','));
  await priceTh.click();
  await page.waitForTimeout(300);
  const asc = await priceOf();
  check('售价再点升序', asc.every((v, i) => i === 0 || asc[i - 1] <= v), asc.join(','));
  await priceTh.click();
  await page.waitForTimeout(300);
  check('售价三点复原', (await priceOf())[0] === 12.9);

  /* 销量涨幅列：前日 → 当日 两个数值 + 涨量 */
  const pairTxt = (await taskRows.first().locator('.mk-sales-pair').innerText()).replace(/\s+/g, ' ');
  const deltaTxt = (await taskRows.first().locator('.mk-sales-delta').innerText()).replace(/\s+/g, ' ');
  check('销量列展示前日→当日', /^[\d,]+ → [\d,]+$/.test(pairTxt), pairTxt);
  check('销量列展示涨量', /^[↑↓] [\d,]+$/.test(deltaTxt), deltaTxt);

  /* 销量涨幅排序：降 → 升 → 复原 */
  const deltaOf = async () => (await taskRows.allInnerTexts()).map((t) => {
    const m = t.match(/[↑↓]\s*([\d,]+)/);
    return m ? Number(m[1].replace(/,/g, '')) : 0;
  });
  const growthTh = page.locator('.ops-center .page.show th', { hasText: '销量涨幅' });
  await growthTh.click();
  await page.waitForTimeout(300);
  const gDesc = await deltaOf();
  check('涨幅首点降序', gDesc.every((v, i) => i === 0 || gDesc[i - 1] >= v), gDesc.join(','));
  await growthTh.click();
  await page.waitForTimeout(300);
  const gAsc = await deltaOf();
  check('涨幅再点升序', gAsc.every((v, i) => i === 0 || gAsc[i - 1] <= v), gAsc.join(','));
  await growthTh.click();
  await page.waitForTimeout(300);
  check('涨幅三点复原', (await taskRows.first().locator('.mk-sales-pair').innerText()).replace(/\s+/g, ' ') === pairTxt, pairTxt);

  /* 是否完善下拉可用 */
  const sel = page.locator('.ops-center .page.show .sg-filter .bselect').first();
  await sel.click();
  await page.waitForTimeout(300);
  const optCount = await page.locator('.bselect-pop .bselect-opt, .bselect-opt').count();
  check('是否完善下拉可展开', optCount >= 3, `opts=${optCount}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  /* 空态 */
  await page.fill('.ops-center .page.show input[placeholder="请输入商品名称"]', '不存在的商品XYZ');
  await page.locator('.ops-center .page.show .sg-actions .sg-btn.primary').last().click();
  await page.waitForTimeout(400);
  check('空态展示', await page.locator('.ops-center .page.show .sg-empty').isVisible());
  await page.screenshot({ path: `${OUT}/jd2-empty.png` });
  await page.locator('.ops-center .page.show .sg-actions .sg-btn:not(.primary):not(:disabled)').last().click();
  await page.waitForTimeout(300);

  /* 切回竞店任务：状态保留 */
  await taskTab.click();
  await page.waitForTimeout(500);
  check('切回竞店任务表正常', (await taskRows.count()) === 11);

  /* 全网搜索跳转（未完善行） */
  await goodsTab.click();
  await page.waitForTimeout(500);
  const searchLink = page.locator('.ops-center .page.show .mk-jd-table tbody a', { hasText: '全网搜索' }).first();
  if (await searchLink.count()) {
    await searchLink.click();
    await page.waitForTimeout(500);
    check('未完善行「全网搜索」跳转', ((await page.locator('.ops-center .subnav.active').innerText()) || '').includes('全网搜索'));
  } else {
    check('未完善行「全网搜索」跳转', false, '无未完善行');
  }

  console.log(`\nRESULT pass=${ok.length} fail=${bad.length}${bad.length ? ' -> ' + bad.join(', ') : ''}`);
  await browser.close();
})();
