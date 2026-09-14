/* 擦除 banner 左下角轮播指示条/点：用同图下方干净渐变块羽化补片覆盖，其余像素不动 */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');

const SRC = 'C:/Users/Joywa/.qoder/vibe_images';
const OUT = 'd:/Qoder/Funion/screenshots';
const JOBS = [
  { in: `${SRC}/pm-banner-1-v2_1788589456.png`, out: `${OUT}/pm-banner-1-clean.png` },
  { in: `${SRC}/pm-banner-2-v2_1788589456.png`, out: `${OUT}/pm-banner-2-clean.png` },
  { in: `${SRC}/pm-banner-3-v2_1788589456.png`, out: `${OUT}/pm-banner-3-clean.png` },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('about:blank');

  for (const job of JOBS) {
    const b64 = fs.readFileSync(job.in).toString('base64');
    const dataUrl = await page.evaluate(async (b64) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      /* 补片区域（左下角指示条所在）与取样源（其正下方干净渐变） */
      const R = { x: 40, y: 690, w: 320, h: 150 };
      const SY = 860;
      const p = document.createElement('canvas');
      p.width = R.w; p.height = R.h;
      const pctx = p.getContext('2d');
      pctx.drawImage(c, R.x, SY, R.w, R.h, 0, 0, R.w, R.h);
      /* 四边羽化蒙版，避免接缝 */
      const F = 30;
      pctx.globalCompositeOperation = 'destination-in';
      const blurC = document.createElement('canvas');
      blurC.width = R.w; blurC.height = R.h;
      const bctx = blurC.getContext('2d');
      bctx.filter = 'blur(14px)';
      bctx.fillStyle = '#fff';
      bctx.fillRect(F, F, R.w - F * 2, R.h - F * 2);
      pctx.drawImage(blurC, 0, 0);
      ctx.drawImage(p, R.x, R.y);
      return c.toDataURL('image/png');
    }, b64);
    fs.writeFileSync(job.out, Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('OK', job.out, fs.statSync(job.out).size);
  }
  await browser.close();
})();
