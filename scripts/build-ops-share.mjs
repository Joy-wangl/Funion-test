/* 生成「智能运营中心」可单独分发的单文件 HTML：内联 dist-ops 的 JS/CSS 与被引用的 public 图片（base64），
   双击即可打开。包含智能运营中心完整功能（侧边栏 + 全部子页与交互），不含应用顶栏与同级顶部 tab。
   前置：node_modules/vite/bin/vite.js build --config vite.config.ops-share.ts */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist-ops', 'assets');
const jsFile = readdirSync(dist).find((f) => f.endsWith('.js'));
const cssFile = readdirSync(dist).find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('dist-ops/assets 缺少 js/css，请先执行 vite build --config vite.config.ops-share.ts');

let js = readFileSync(join(dist, jsFile), 'utf8');
const css = readFileSync(join(dist, cssFile), 'utf8');
/* 内联后防止脚本内容提前闭合 script 标签 */
js = js.replace(/<\/script>/g, '<\\/script>');

/* 代码以绝对路径引用的 public 图片 → base64 data URL（全局 map + 引用替换，仅内联实际引用到的文件） */
const assetMap = {};
for (const dir of ['logos', 'products']) {
  for (const f of readdirSync(join(root, 'public', dir))) {
    const p = `/${dir}/${f}`;
    const quoted = js.includes(`"${p}"`) || js.includes(`'${p}'`) || js.includes(`\`${p}\``);
    if (!quoted) continue;
    const b64 = readFileSync(join(root, 'public', dir, f)).toString('base64');
    const mime = f.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    assetMap[p] = `data:${mime};base64,${b64}`;
  }
}
for (const p of Object.keys(assetMap)) {
  const ref = `__A[${JSON.stringify(p)}]`;
  js = js.split(`"${p}"`).join(ref);
  js = js.split(`'${p}'`).join(ref);
  js = js.split(`\`${p}\``).join(ref);
}
/* 动态拼接的平台 logo 路径（CreateProductPage pubLogo：`/logos/${PUB_LOGOS[p] ?? 'taobao'}.png`）
   → 改写为运行时查 __A 映射（五种平台 logo 均已被静态引用而内联）。
   压缩产物中模板字面量以反引号定界，且内层字符串也可能是反引号，表达式需允许任意字符 */
js = js.replace(/`\/logos\/\$\{(.+?)\}\.png`/g, (_m, expr) => `(__A["/logos/"+(${expr})+".png"]||"")`);

/* 兜底：内联后仍残留的 public 绝对路径引用（排除 __A["…"] 引用自身；说明存在漏网图片，会在离线打开时 404） */
const leftover = [...js.matchAll(/(?<!__A\[")\/(?:logos|products|prd-shots)\//g)].map((m) => m[0]);
if (leftover.length) console.warn(`⚠ 仍有未内联的图片引用：${[...new Set(leftover)].join('、')}`);

js = `const __A=${JSON.stringify(assetMap)};\n${js}`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>智能运营中心</title>
<style>
${css}
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
${js}
</script>
</body>
</html>
`;

const out = join(root, 'Funion-智能运营中心.html');
writeFileSync(out, html);
console.log(`✓ 已生成 ${out}（${(html.length / 1024 / 1024).toFixed(2)} MB），直接发送该文件即可离线预览智能运营中心完整功能`);
