/* 探针：单人收件待办详情＝620 无处理人列；多人收件＝960 带处理人列；内容卡按参考图（正文/附件/图片） */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const clickCard = (page, kw) =>
  page.evaluate((k) => {
    [...document.querySelectorAll('.qc-todo-card')].find((c) => c.querySelector('.td-title')?.textContent.includes(k))?.click();
  }, kw);
const clickBtn = (page, sel, txt) =>
  page.evaluate(([s, t]) => {
    [...document.querySelectorAll(s)].find((x) => x.textContent.replace(/\s/g, '').endsWith(t))?.click();
  }, [sel, txt]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务')?.click());
  await page.waitForSelector('.qc-todo-list', { timeout: 30000 });
  await clickBtn(page, '.qc-todo-pill button', '我发起的');
  await page.waitForTimeout(300);

  const out = {};
  /* 单人：TD-011 折叠收纳箱指定商品编码优化 */
  out.cardFoot = await page.evaluate(() =>
    [...document.querySelectorAll('.qc-todo-card')].find((c) => c.querySelector('.td-title')?.textContent.includes('折叠收纳箱指定商品编码优化'))?.querySelector('.td-name')?.textContent.trim());
  await clickCard(page, '折叠收纳箱指定商品编码优化');
  await page.waitForSelector('.qc-todo-page-drawer', { timeout: 15000 });
  await page.waitForTimeout(400);
  out.single = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-page-drawer');
    return {
      width: Math.round(d.getBoundingClientRect().width),
      handlersCol: !!d.querySelector('.qc-todo-handlers'),
      sender: d.querySelector('.qd-sender b')?.textContent.trim(),
      tabs: [...d.querySelectorAll('.qd-tabs button')].map((b) => b.textContent.trim()),
    };
  });
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-page-drawer .qd-tabs button')].find((b) => b.textContent.trim() === '处理结果')?.click());
  await page.waitForTimeout(300);
  out.singleRes = await page.evaluate(() => {
    const body = document.querySelector('.qc-todo-page-drawer .qd-body');
    return {
      resText: (body?.querySelector('.qd-text')?.textContent ?? '').trim().slice(0, 20),
      resAtts: body?.querySelectorAll('.qd-att').length ?? 0,
    };
  });
  await page.evaluate(() => [...document.querySelectorAll('.qc-todo-page-drawer .qd-tabs button')].find((b) => b.textContent.trim() === '事项')?.click());
  await page.waitForTimeout(300);
  out.singleMat = await page.evaluate(() => {
    const b2 = document.querySelector('.qc-todo-page-drawer .qd-body');
    return {
      matAtts: b2?.querySelectorAll('.qd-att').length ?? 0,
      matImgs: [...(b2?.querySelectorAll('.qd-imgs img') ?? [])].map((i) => i.naturalWidth > 0),
    };
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshots/todo-detail-single.png' });
  await page.evaluate(() => document.querySelector('.qc-todo-page-drawer .qd-close')?.click());
  await page.waitForTimeout(300);

  /* 多人：TD-006 毛绒玩具指定编码承重整改 */
  await clickCard(page, '毛绒玩具指定编码承重整改');
  await page.waitForSelector('.qc-todo-page-drawer', { timeout: 15000 });
  await page.waitForTimeout(400);
  out.multi = await page.evaluate(() => {
    const d = document.querySelector('.qc-todo-page-drawer');
    return {
      width: Math.round(d.getBoundingClientRect().width),
      handlersCol: !!d.querySelector('.qc-todo-handlers'),
      hCards: d.querySelectorAll('.qh-card').length,
      cnt: d.querySelector('.qh-cnt')?.textContent.trim(),
    };
  });
  await page.screenshot({ path: 'screenshots/todo-detail-multi.png' });
  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
