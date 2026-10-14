// i18n checks (agent-instructions §7, §12.3): key parity, ICU argument parity, Arabic plural categories,
// every key referenced in source exists, and no hard-coded user-visible text in JSX.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const load = (loc) => {
  const dir = path.join(root, 'src/locales', loc);
  const out = {};
  // Top-level namespaces load with the shell; lazy/ namespaces load with the page that needs them.
  const files = fs.readdirSync(dir).map((f) => [dir, f]);
  if (fs.existsSync(path.join(dir, 'lazy'))) files.push(...fs.readdirSync(path.join(dir, 'lazy')).map((f) => [path.join(dir, 'lazy'), f]));
  for (const [base, f] of files) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(base, f), 'utf8'));
    for (const [k, v] of Object.entries(data)) {
      if (k in out) errors.push(`${loc}: duplicate key ${k}`);
      out[k] = v;
    }
  }
  return out;
};

const errors = [];
const en = load('en');
const ar = load('ar');

for (const k of Object.keys(en)) if (!(k in ar)) errors.push(`ar is missing ${k}`);
for (const k of Object.keys(ar)) if (!(k in en)) errors.push(`en is missing ${k}`);

// Top-level ICU arguments (ignores plural branch bodies' literal text).
function args(msg) {
  const out = new Set();
  const re = /\{\s*([a-zA-Z_][\w]*)\s*(?:,|\})/g;
  let m;
  while ((m = re.exec(msg))) out.add(m[1]);
  return [...out].sort().join(',');
}
for (const k of Object.keys(en)) {
  if (!(k in ar)) continue;
  if (args(en[k]) !== args(ar[k])) errors.push(`ICU argument mismatch for ${k}: en[${args(en[k])}] ar[${args(ar[k])}]`);
}

// Arabic plural messages must define zero, one, two, few, many, other (agent-instructions §7.3).
for (const [k, v] of Object.entries(ar)) {
  if (!/,\s*plural\s*,/.test(v)) continue;
  for (const cat of ['zero', 'one', 'two', 'few', 'many', 'other']) {
    if (!new RegExp(`(^|[\\s{}])${cat}\\s*\\{`).test(v)) errors.push(`ar plural ${k} lacks "${cat}"`);
  }
}

// Keys referenced from source and content.
const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|json)$/.test(e.name) && !p.includes(`${path.sep}locales${path.sep}`)) files.push(p);
  }
};
walk(path.join(root, 'src'));
const NS = ['common', 'footer', 'ws', 'welcome', 'picker', 'setup', 'avatar', 'gate', 'answer', 'break', 'error', 'notFound', 'about', 'home', 'world', 'skill', 'hint', 'lesson', 'manip', 'practice', 'dailyMix', 'math', 'games', 'rewards', 'trophies', 'trophy', 'progress', 'grownups', 'report', 'profiles', 'settings', 'data', 'privacy'];
const used = new Set();
// Domain event names share the dotted style but are not messages.
const EVENT_NAMES = new Set(['lesson.completed', 'item.answered', 'practiceSet.completed', 'dailyMix.completed', 'gameRound.completed', 'stars.changed', 'trophy.awarded', 'oasisStage.reached']);
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const re = new RegExp(`['"\`]((?:${NS.join('|')})\\.[A-Za-z0-9_.-]+)['"\`]`, 'g');
  let m;
  while ((m = re.exec(src))) if (!m[1].endsWith('.')) used.add(m[1]);
  if (f.endsWith('.tsx')) {
    // Hard-coded JSX text: letters between tags that aren't expressions (DebugPanel is dev-only and exempt).
    if (!f.endsWith('DebugPanel.tsx')) {
      const jsx = /(?<![=\-])>([^<>{}\n;()=]*[A-Za-z؀-ۿ][^<>{}\n;()=]*)</g;
      let j;
      while ((j = jsx.exec(src))) errors.push(`${path.relative(root, f)}: hard-coded text "${j[1].trim()}"`);
    }
  }
}
// Dynamic keys expand from content.
const skills = JSON.parse(fs.readFileSync(path.join(root, 'src/content/skills.json'), 'utf8'));
for (const s of skills) {
  used.add(s.titleKey);
  used.add(`hint.${s.id}`);
}
const trophies = JSON.parse(fs.readFileSync(path.join(root, 'src/content/trophies.json'), 'utf8'));
for (const t of trophies) {
  used.add(t.titleKey);
  used.add(t.hintKey);
}
for (const op of ['add', 'sub', 'mul', 'div']) for (const b of ['a', 'b', 'result']) used.add(`math.spoken.${op}.${b}`);
for (const k of used) if (!EVENT_NAMES.has(k) && !(k in en)) errors.push(`key used but missing from catalogues: ${k}`);

// Arabic strings not yet reviewed by a native-speaker educator (agent-instructions §6.4).
const reviewFile = path.join(root, 'src/locales/ar/_review.json');
const review = fs.existsSync(reviewFile) ? JSON.parse(fs.readFileSync(reviewFile, 'utf8')) : {};
const pending = Object.entries(review).filter(([, v]) => v === 'pending').length;

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  console.error(`\n${errors.length} i18n problem(s).`);
  process.exit(1);
}
console.log(`✓ i18n: ${Object.keys(en).length} keys, parity OK, Arabic plurals OK, ${used.size} referenced keys resolved.`);
console.log(`  Arabic strings pending educator review: ${pending}`);
if (process.env.NODE_ENV === 'production' && pending > 0 && !process.env.ALLOW_PENDING_REVIEW) {
  console.error('✗ Production builds cannot ship Arabic marked "_review": "pending".');
  process.exit(1);
}
