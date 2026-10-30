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
    const fixed = [];
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if ((cs.position === 'fixed' || cs.position === 'sticky') && el.getBoundingClientRect().height > 0) {
        const rc = el.getBoundingClientRect();
        if (rc.top < 200) fixed.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), pos: cs.position, top: Math.round(rc.top), bottom: Math.round(rc.bottom), z: cs.zIndex });
      }
    }
    return fixed.slice(0, 25);
  });
  console.log('FIXED', JSON.stringify(r, null, 2));

  // 元素探针：y=70,90,110,150 处是什么
  const hits = await page.evaluate(() => {
    return [70, 90, 110, 130, 150].map((y) => {
      const el = document.elementFromPoint(1400, y);
      return { y, tag: el && el.tagName, cls: el ? String(el.className).slice(0, 70) : null, txt: el ? (el.textContent || '').trim().slice(0, 20) : null };
    });
  });
  console.log('POINTS', JSON.stringify(hits, null, 2));
  await browser.close();
  process.exit(0);
})();
