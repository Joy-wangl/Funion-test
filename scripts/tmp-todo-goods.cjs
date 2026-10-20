/* 待办卡商品展示验证：商品优化列表卡面在附件位增加 商品图＋平台＋店铺名＋商品名称 */
const { chromium } = require('D:/PM.funion/.playwright/package/index.js');

const clickText = async (page, sel, text) =>
  page.evaluate(([s, t]) => {
    const el = [...document.querySelectorAll(s)].find((x) => x.textContent.replace(/\s/g, '').endsWith(t));
    if (el) { el.click(); return true; }
    return false;
  }, [sel, text]);

const cardsInfo = () =>
  [...document.querySelectorAll('.qc-todo-card')].map((c) => ({
    title: c.querySelector('.td-title')?.textContent.trim() ?? '',
    goods: [...c.querySelectorAll('.td-good')].map((g) => ({
      thumb: g.querySelector('.tg-thumb')?.getAttribute('src') ?? '',
      thumbOk: (g.querySelector('.tg-thumb')?.naturalWidth ?? 0) > 0,
      logoOk: (g.querySelector('.tg-plat img')?.naturalWidth ?? 0) > 0,
      logoAlt: g.querySelector('.tg-plat img')?.getAttribute('alt') ?? '',
      shop: g.querySelector('.tg-shop')?.textContent.trim() ?? '',
      name: g.querySelector('.tg-name')?.textContent.trim() ?? '',
      oneLine: (() => {
        const r = g.getBoundingClientRect();
        return r.height < 60;
      })(),
    })),
    files: c.querySelectorAll('.td-files > *').length,
  }));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

  await page.goto('http://127.0.0.1:5173/#qc-online', { waitUntil: 'networkidle' });
  await page.evaluate(() => [...document.querySelectorAll('.qc-nav-text')].find((e) => e.textContent.trim() === '待办任务')?.click());
  await page.waitForSelector('.qc-todo-list', { timeout: 30000 });

  const out = {};
  /* 我发起的 × 商品优化（用户截图场景） */
  await clickText(page, 'button', '我发起的');
  await page.waitForTimeout(300);
  await clickText(page, '.tc-typeitem', '商品优化');
  await page.waitForTimeout(400);
  out.mine = await page.evaluate(cardsInfo);
  await page.screenshot({ path: 'screenshots/todo-goods-mine.png' });

  /* 待处理 × 商品优化（TD-001 收件态：商品行＋附件并存） */
  await clickText(page, 'button', '待处理的');
  await page.waitForTimeout(400);
  out.pending = await page.evaluate(cardsInfo);
  await page.screenshot({ path: 'screenshots/todo-goods-pending.png' });

  /* 系列编码优化：不应出现商品行 */
  await clickText(page, '.tc-typeitem', '系列编码优化');
  await page.waitForTimeout(400);
  out.series = await page.evaluate(cardsInfo);

  out.errs = errs;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
