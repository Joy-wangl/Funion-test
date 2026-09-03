/* 临时工具：去除图片水印（右上半透明白块反向混合 + 底部文字局部修复） */
const { chromium } = require('D:/Funion/.playwright/package/index.js');
const fs = require('fs');

const SRC = 'C:/Users/Joywa/AppData/Roaming/Qoder/SharedClientCache/cache/images/task-f1e/pcg1xpt4-72253c6c.png';
const OUT = 'd:/Qoder/Funion/hairpin-nowm.png';

(async () => {
  const b64 = fs.readFileSync(SRC).toString('base64');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const res = await page.evaluate(async ({ data, probe }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const W = img.width; const H = img.height;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, W, H);
    const px = d.data;
    const lum = (x, y) => { const i = (y * W + x) * 4; return 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]; };
    const mean = (x0, x1, y0, y1) => { let s = 0; let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += lum(x, y); n++; } return s / n; };

    /* ---- 检测白块边界（1px 差分，边缘锐利） ---- */
    let rectL = -1;
    const yEdge = Math.round(H * 0.25);
    for (let x = Math.round(W * 0.45); x < Math.round(W * 0.75); x++) {
      if (lum(x, yEdge) - lum(x - 1, yEdge) > 40) { rectL = x; break; }
    }
    if (rectL < 0) rectL = Math.round(W * 0.54);
    let rectT = -1; let rectB = -1;
    const xTop = Math.min(W - 1, rectL + Math.round(W * 0.1));
    for (let y = Math.round(H * 0.05); y < Math.round(H * 0.3); y++) {
      if (lum(xTop, y) - lum(xTop, y - 1) > 20 || lum(Math.round(W * 0.9), y) - lum(Math.round(W * 0.9), y - 1) > 15) { rectT = y; break; }
    }
    for (let y = Math.round(H * 0.35); y < Math.round(H * 0.6); y++) {
      if (mean(Math.round(W * 0.75), Math.round(W * 0.95), y, y + 1) - mean(Math.round(W * 0.75), Math.round(W * 0.95), y + 1, y + 2) > 15) { rectB = y; break; }
    }
    if (rectT < 0) rectT = Math.round(H * 0.1);
    if (rectB < 0) rectB = Math.round(H * 0.455) - 1;
    const info = { W, H, rectL, rectT, rectB };
    if (probe) {
      const col = []; for (let x = 242; x <= 260; x++) col.push(Math.round(lum(x, 150)));
      const rowT = []; for (let y = 54; y <= 70; y++) rowT.push(Math.round(lum(420, y)));
      const rowB = []; for (let y = 262; y <= 278; y++) rowB.push(Math.round(lum(420, y)));
      return { info, col, rowT, rowB, b64: '' };
    }

    /* ---- 估算白块透明度（底边上下墙面近似连续） ---- */
    let aSum = 0; let aN = 0;
    for (let x = Math.round(W * 0.75); x < Math.round(W * 0.95); x += 4) {
      const inside = lum(x, rectB - 3); const outside = lum(x, rectB + 3);
      if (255 - outside > 40) { aSum += (inside - outside) / (255 - outside); aN++; }
    }
    const alpha = Math.max(0.05, Math.min(0.9, aSum / aN));
    info.alpha = alpha;

    /* ---- 反向混合恢复白块区域 ---- */
    for (let y = rectT; y <= rectB; y++) {
      for (let x = rectL; x < W; x++) {
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          px[i + c] = Math.max(0, Math.min(255, Math.round((px[i + c] - 255 * alpha) / (1 - alpha))));
        }
      }
    }

    /* ---- 底部文字水印：掩码 + 水平插值修复 ---- */
    const tx0 = Math.round(W * 0.12); const tx1 = Math.round(W * 0.6);
    const ty0 = Math.round(H * 0.78); const ty1 = Math.round(H * 0.885);
    const masked = new Uint8Array(W * H);
    const win = 5;
    const buildMask = (th) => {
      for (let y = ty0; y < ty1; y++) {
        for (let x = tx0; x < tx1; x++) {
          if (masked[y * W + x]) continue;
          const vals = [];
          for (let dy = -win; dy <= win; dy += 2) for (let dx = -win; dx <= win; dx += 2) {
            const yy = y + dy; const xx = x + dx;
            if (yy >= 0 && yy < H && xx >= 0 && xx < W) vals.push(lum(xx, yy));
          }
          vals.sort((p, q) => p - q);
          const med = vals[vals.length >> 1];
          if (lum(x, y) - med > th) masked[y * W + x] = 1;
        }
      }
    };
    const inpaint = () => {
      for (let y = ty0; y < ty1; y++) {
        for (let x = tx0; x < tx1; x++) {
          if (!masked[y * W + x]) continue;
          let lx = x - 1; while (lx >= tx0 && masked[y * W + lx] && x - lx < 14) lx--;
          let rx = x + 1; while (rx < tx1 && masked[y * W + rx] && rx - x < 14) rx++;
          const li = (y * W + lx) * 4; const ri = (y * W + rx) * 4;
          const okL = lx >= tx0 && !masked[y * W + lx]; const okR = rx < tx1 && !masked[y * W + rx];
          const i = (y * W + x) * 4;
          for (let c = 0; c < 3; c++) {
            if (okL && okR) { const t = (x - lx) / (rx - lx); px[i + c] = Math.round(px[li + c] * (1 - t) + px[ri + c] * t); }
            else if (okL) px[i + c] = px[li + c];
            else if (okR) px[i + c] = px[ri + c];
          }
        }
      }
    };
    buildMask(12); inpaint();
    buildMask(8); inpaint();
    buildMask(5); inpaint();

    ctx.putImageData(d, 0, 0);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    const buf = await blob.arrayBuffer();
    let bin = '';
    const u8 = new Uint8Array(buf);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
    return { info, b64: btoa(bin) };
  }, { data: b64, probe: process.env.PROBE === '1' });
  if (res.b64) fs.writeFileSync(OUT, Buffer.from(res.b64, 'base64'));
  console.log(JSON.stringify(res));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
