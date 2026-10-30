const { chromium } = require('./.playwright/package');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 2560, height: 1600 } });
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

  const r = await page.evaluate(() => {
    const mk = document.querySelector('.mk-page');
    const sc = document.querySelector('.app-content');
    const scRect = sc.getBoundingClientRect();
    const sticky = [];
    let p = mk;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      if (cs.position === 'sticky' || cs.position === 'fixed') {
        sticky.push({ cls: p.className, pos: cs.position, top: cs.top, rectTop: Math.round(p.getBoundingClientRect().top), rectBottom: Math.round(p.getBoundingClientRect().bottom) });
      }
      p = p.parentElement;
    }
    // 顶部第一排可见元素
    const topEls = [];
    for (const el of mk.querySelectorAll('.mk2-tabwrap, .mk-jd-sec, .sg-filter, .sg-card')) {
      const rc = el.getBoundingClientRect();
      if (rc.top < 500) topEls.push({ cls: el.className, top: Math.round(rc.top), h: Math.round(rc.height) });
    }
    return {
      scTop: Math.round(scRect.top), scPadTop: getComputedStyle(sc).paddingTop, scScrollTop: sc.scrollTop,
      sticky, topEls: topEls.slice(0, 8),
      mkPad: getComputedStyle(mk).paddingTop,
    };
  });
  console.log(JSON.stringify(r, null, 2));
  await browser.close();
  process.exit(0);
})();
