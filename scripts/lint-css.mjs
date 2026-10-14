// Style lint (N-07, agent-instructions §6.3, §12.4): no physical-direction properties, no raw colours outside
// tokens.css, and no physical inline-style keys in components.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(css|tsx|ts)$/.test(e.name)) files.push(p);
  }
};
walk(path.join(root, 'src'));

const PHYSICAL_CSS = /(?:^|[\s;{])((?:margin|padding|border)-(?:left|right)(?:-[a-z]+)?|(?<![-\w])(?:left|right)\s*:|text-align\s*:\s*(?:left|right)|float\s*:\s*(?:left|right)|clear\s*:\s*(?:left|right)|border-(?:top|bottom)-(?:left|right)-radius)/;
const PHYSICAL_JS = /\b(marginLeft|marginRight|paddingLeft|paddingRight|borderLeft\w*|borderRight\w*|textAlign:\s*['"](?:left|right)['"]|float:\s*['"](?:left|right)['"])\b|[{,]\s*(left|right)\s*:/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;

for (const f of files) {
  const rel = path.relative(root, f);
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  lines.forEach((line, i) => {
    const code = line.replace(/\/\*.*?\*\//g, '').replace(/\/\/.*$/, '');
    if (f.endsWith('.css')) {
      if (PHYSICAL_CSS.test(code)) errors.push(`${rel}:${i + 1} physical CSS property: ${line.trim()}`);
      if (!f.endsWith('tokens.css') && HEX.test(code)) errors.push(`${rel}:${i + 1} raw colour outside tokens.css: ${line.trim()}`);
    } else {
      if (/style/.test(code) && PHYSICAL_JS.test(code)) errors.push(`${rel}:${i + 1} physical style key: ${line.trim()}`);
      if (HEX.test(code) && /style|fill|stroke|color/i.test(code)) errors.push(`${rel}:${i + 1} raw colour in component: ${line.trim()}`);
    }
  });
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ styles: ${files.length} files, no physical properties or stray colours`);
