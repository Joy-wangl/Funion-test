/* 生成可单独分发的单文件 HTML：内联 JS/CSS，public 图片转 base64，双击即可打开 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');

let html = readFileSync(join(dist, 'index.html'), 'utf8');
const jsFile = readdirSync(join(dist, 'assets')).find((f) => f.endsWith('.js'));
const cssFile = readdirSync(join(dist, 'assets')).find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('dist/assets 缺少 js/css，请先执行 npm run build');

let js = readFileSync(join(dist, 'assets', jsFile), 'utf8');
const css = readFileSync(join(dist, 'assets', cssFile), 'utf8');
/* 内联后防止脚本内容提前闭合 script 标签 */
js = js.replace(/<\/script>/g, '<\\/script>');

/* public 下被代码以绝对路径引用的图片 → base64 data URL（全局 map + 引用替换，避免重复内联） */
const assetMap = {};
for (const dir of ['logos', 'products']) {
  for (const f of readdirSync(join(root, 'public', dir))) {
    const b64 = readFileSync(join(root, 'public', dir, f)).toString('base64');
    const mime = f.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    assetMap[`/${dir}/${f}`] = `data:${mime};base64,${b64}`;
  }
}
for (const p of Object.keys(assetMap)) {
  const ref = `__A[${JSON.stringify(p)}]`;
  js = js.split(`"${p}"`).join(ref);
  js = js.split(`'${p}'`).join(ref);
  js = js.split(`\`${p}\``).join(ref);
}
js = `const __A=${JSON.stringify(assetMap)};\n` + js;

html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*>\s*<\/script>/, () => `<script type="module">\n${js}\n</script>`);
html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/, () => `<style>\n${css}\n</style>`);
html = html.split('/favicon.svg').join(`data:image/svg+xml;base64,${readFileSync(join(root, 'public', 'favicon.svg')).toString('base64')}`);

const out = join(root, 'Funion-预览.html');
writeFileSync(out, html);
console.log(`✓ 已生成 ${out}（${(html.length / 1024 / 1024).toFixed(2)} MB），直接发送该文件即可离线预览`);
