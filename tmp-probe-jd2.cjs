const { chromium } = require('./.playwright/package');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 2560, height: 1600 } });
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const e = Array.from(document.querySelectorAll('*')).find((x) => x.children.length === 0 && x.textContent.trim() === '运营中心');
    if (e) e.closest('a, button, li, div').click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const s = Array.from(document.querySelectorAll('.ops-center .subnav')).find((x) => x.textContent.includes('市场商机'));
    if (s) s.click();
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    const t = Array.from(document.querySelectorAll('.mk2-tab')).find((x) => x.textContent.trim() === '竞店商品');
    if (t) t.click();
  });
  await page.waitForTimeout(900);

  // 找内层滚动容器并回顶
  const info = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const scroller = (el) => {
      let p = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 4) return p;
        p = p.parentElement;
      }
      return null;
    };
    const s = scroller(mk);
    if (s) s.scrollTop = 0;
    return { scrollerCls: s ? s.className : null, scrollTop: s ? s.scrollTop : null };
  });
  await page.waitForTimeout(400);
  // 重置两段筛选
  await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const fs = mk.querySelectorAll('.sg-filter');
    for (const f of fs) {
      const btn = [...f.querySelectorAll('.sg-actions button')].find((b) => b.textContent.trim() === '重置');
      if (btn) btn.click();
    }
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'D:/PM.funion/screenshots/mk-jd-onepage-top.png' });

  // 滚到商品段
  const g = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const title = mk.querySelector('.mk-jd-sec-gap');
    title.scrollIntoView({ block: 'start' });
    const scroller = (() => {
      let p = mk.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        if (/(auto|scroll)/.test(cs.overflowY) && p.scrollHeight > p.clientHeight + 4) return p;
        p = p.parentElement;
      }
      return null;
    })();
    return { titleTop: title.getBoundingClientRect().top, scrollerTop: scroller ? scroller.scrollTop : null };
  });
  await page.waitForTimeout(600);
  const g2 = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const title = mk.querySelector('.mk-jd-sec-gap');
    return { titleTop: title.getBoundingClientRect().top, titleFz: getComputedStyle(title).fontSize, titleFw: getComputedStyle(title).fontWeight };
  });
  await page.screenshot({ path: 'D:/PM.funion/screenshots/mk-jd-onepage-goods.png' });
  console.log(JSON.stringify({ info, g, g2, errs }, null, 2));
  await browser.close();
  process.exit(0);
})();
