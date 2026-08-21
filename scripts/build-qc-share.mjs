/* 生成「品控中心」可单独分发的单文件 HTML：内联 dist-share 的 JS/CSS，双击即可打开。
   包含品控中心完整功能（数据概览 + 监控列表全部交互），不含同级顶部 tab。
   前置：node_modules/vite/bin/vite.js build --config vite.config.share.ts */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist-share', 'assets');
const jsFile = readdirSync(dist).find((f) => f.endsWith('.js'));
const cssFile = readdirSync(dist).find((f) => f.endsWith('.css'));
if (!jsFile || !cssFile) throw new Error('dist-share/assets 缺少 js/css，请先执行 vite build --config vite.config.share.ts');

let js = readFileSync(join(dist, jsFile), 'utf8');
const css = readFileSync(join(dist, cssFile), 'utf8');
/* 内联后防止脚本内容提前闭合 script 标签 */
js = js.replace(/<\/script>/g, '<\\/script>');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>品控中心</title>
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

const out = join(root, 'Funion-品控中心.html');
writeFileSync(out, html);
console.log(`✓ 已生成 ${out}（${(html.length / 1024 / 1024).toFixed(2)} MB），直接发送该文件即可离线预览品控中心完整功能`);
