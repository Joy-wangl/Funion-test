/* 下载官方 Node.js（含 npm）zip，供本地安装依赖使用 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://nodejs.org/dist/v22.16.0/node-v22.16.0-win-x64.zip';
const outDir = path.join(__dirname, '..', '.tools');
const outFile = path.join(outDir, 'node.zip');

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outFile) && fs.statSync(outFile).size > 10_000_000) {
  console.log('already downloaded', fs.statSync(outFile).size);
  process.exit(0);
}

const file = fs.createWriteStream(outFile);
https.get(URL, (res) => {
  if (res.statusCode !== 200) {
    console.error('HTTP', res.statusCode);
    process.exit(1);
  }
  const total = Number(res.headers['content-length'] || 0);
  let got = 0;
  res.on('data', (c) => {
    got += c.length;
    if (got % (5 * 1024 * 1024) < c.length) console.log(`${Math.round((got / total) * 100)}%`);
  });
  res.pipe(file);
  file.on('finish', () => file.close(() => console.log('done', got)));
}).on('error', (e) => {
  console.error(e.message);
  process.exit(1);
});
