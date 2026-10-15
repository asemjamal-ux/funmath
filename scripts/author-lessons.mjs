// Authoring tool: regenerates src/content/lessons.json from this compact table.
// Text lives in the locale catalogues under lesson.{SKILL}.{hook|model|keyIdea}; guided/ready prompts are shared.
import fs from 'node:fs';

const T = {
  // skill: [modelKind, modelOp, a, b, guided items [a, b, blank], keyIdea [a, b]]
  'ADD-01': ['counters', 'addition', 2, 3, [[1, 2, 'result'], [3, 1, 'result']], [2, 3]],
  'ADD-02': ['tenFrame', 'addition', 6, 3, [[5, 2, 'result'], [7, 3, 'result'], [4, 4, 'result']], [6, 3]],
  'ADD-03': ['tenFrame', 'addition', 7, 3, [[6, 4, 'b'], [8, 2, 'b']], [7, 3]],
  'ADD-04': ['numberLine', 'addition', 8, 5, [[9, 4, 'result'], [7, 6, 'result']], [8, 5]],
  'ADD-05': ['baseTen', 'addition', 23, 14, [[32, 15, 'result'], [41, 26, 'result']], [23, 14]],
  'ADD-06': ['baseTen', 'addition', 27, 15, [[38, 4, 'result'], [46, 27, 'result']], [27, 15]],
  'ADD-07': ['baseTen', 'addition', 246, 137, [[315, 128, 'result'], [264, 153, 'result']], [246, 137]],
  'SUB-01': ['counters', 'subtraction', 5, 2, [[4, 1, 'result'], [5, 3, 'result']], [5, 2]],
  'SUB-02': ['tenFrame', 'subtraction', 9, 4, [[8, 3, 'result'], [10, 6, 'result']], [9, 4]],
  'SUB-03': ['counters', 'addition', 4, 3, [[3, 4, 'b'], [5, 2, 'b']], [4, 3]],
  'SUB-04': ['numberLine', 'subtraction', 13, 5, [[12, 4, 'result'], [15, 7, 'result']], [13, 5]],
  'SUB-05': ['baseTen', 'subtraction', 48, 23, [[57, 34, 'result'], [69, 25, 'result']], [48, 23]],
  'SUB-06': ['baseTen', 'subtraction', 42, 17, [[53, 8, 'result'], [64, 38, 'result']], [42, 17]],
  'SUB-07': ['baseTen', 'subtraction', 302, 158, [[425, 162, 'result'], [503, 247, 'result']], [302, 158]],
  'MUL-01': ['groups', 'multiplication', 3, 4, [[2, 5, 'result'], [4, 3, 'result']], [3, 4]],
  'MUL-02': ['array', 'multiplication', 3, 4, [[2, 5, 'result'], [4, 3, 'result']], [3, 4]],
  'MUL-03': ['array', 'multiplication', 5, 3, [[2, 7, 'result'], [10, 4, 'result'], [0, 6, 'result']], [5, 3]],
  'MUL-04': ['array', 'multiplication', 4, 6, [[3, 5, 'result'], [4, 7, 'result']], [4, 6]],
  'MUL-05': ['array', 'multiplication', 6, 4, [[6, 3, 'result'], [7, 5, 'result']], [6, 4]],
  'MUL-06': ['array', 'multiplication', 9, 3, [[8, 4, 'result'], [9, 6, 'result']], [9, 3]],
  'DIV-01': ['plates', 'division', 12, 3, [[10, 2, 'result'], [15, 5, 'result']], [12, 3]],
  'DIV-02': ['groups', 'division', 15, 5, [[12, 4, 'result'], [18, 3, 'result']], [15, 5]],
  'DIV-03': ['groups', 'division', 20, 5, [[14, 2, 'result'], [0, 10, 'result'], [30, 10, 'result']], [20, 5]],
  'DIV-04': ['groups', 'division', 12, 4, [[21, 3, 'result'], [28, 4, 'result']], [12, 4]],
  'DIV-05': ['groups', 'division', 42, 6, [[36, 6, 'result'], [35, 7, 'result']], [42, 6]],
  'DIV-06': ['groups', 'division', 72, 8, [[56, 8, 'result'], [81, 9, 'result']], [72, 8]],
};

const skills = JSON.parse(fs.readFileSync('src/content/skills.json', 'utf8'));
const opOf = (id) => ({ ADD: 'addition', SUB: 'subtraction', MUL: 'multiplication', DIV: 'division' })[id.slice(0, 3)];

function solve(op, a, b) {
  return op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b;
}

function choicesFor(answer, count, max) {
  const out = [answer];
  const cand = [answer + 1, answer + 2, answer - 2, answer + 10, answer - 10, answer + 3, answer - 3, answer + 4];
  for (const c of cand) if (out.length < count && c >= 0 && c <= max && !out.includes(c)) out.push(c);
  // deterministic rotation so the answer is not always first
  const k = answer % out.length;
  return [...out.slice(k), ...out.slice(0, k)];
}

const lessons = Object.entries(T).map(([id, [kind, mop, ma, mb, guided, key]]) => {
  const skill = skills.find((s) => s.id === id);
  const op = id === 'SUB-03' ? 'addition' : opOf(id);
  const count = skill.stage === 1 ? 3 : 4;
  const max = skill.generator.valueMax;
  const steps = [
    { kind: 'hook', textKey: `lesson.${id}.hook`, audioKey: `${id}.hook`, illustration: 'oasis' },
    { kind: 'model', textKey: `lesson.${id}.model`, audioKey: `${id}.model`, model: { kind, op: mop, a: ma, b: mb } },
    ...guided.map(([a, b, blank], i) => {
      const c = solve(op, a, b);
      const answer = blank === 'a' ? a : blank === 'b' ? b : c;
      return {
        kind: 'guided',
        textKey: 'lesson.guided.prompt',
        audioKey: `${id}.guided${i + 1}`,
        item: { operation: op, operands: [a, b, c], blank, choices: choicesFor(answer, count, max) },
      };
    }),
    { kind: 'keyIdea', textKey: `lesson.${id}.keyIdea`, audioKey: `${id}.keyIdea`, expression: { operation: mop, operands: [key[0], key[1], solve(mop, key[0], key[1])], blank: 'result' } },
    { kind: 'ready', textKey: 'lesson.ready', audioKey: 'ui.ready' },
  ];
  return { id: `lesson-${id}`, skillId: id, steps };
});

// Advanced Worlds (decision 005): the model step shows a form's picture; guided items and key ideas carry a form
// (or decimal operands). Each guided entry is [form] or ['dec', operation, a, b].
const TOPIC = {
  'FRA-01': [{ k: 'fracName', n: 3, d: 4, shape: 'circle' }, [[{ k: 'fracName', n: 1, d: 2, shape: 'bar' }], [{ k: 'fracName', n: 2, d: 3, shape: 'circle' }]], { k: 'fracName', n: 3, d: 8, shape: 'bar' }],
  'FRA-02': [{ k: 'fracOf', n: 1, d: 4, q: 12 }, [[{ k: 'fracOf', n: 1, d: 2, q: 10 }, [5, 2, 10, 4]], [{ k: 'fracOf', n: 1, d: 3, q: 12 }, [4, 3, 9, 6]], [{ k: 'fracOf', n: 3, d: 4, q: 8 }, [6, 2, 3, 8]]], { k: 'fracOf', n: 2, d: 3, q: 12 }],
  'FRA-03': [{ k: 'fracEquiv', n: 1, d: 2, m: 2, ask: 'n', simplify: false }, [[{ k: 'fracEquiv', n: 1, d: 3, m: 2, ask: 'n', simplify: false }, [2, 1, 4, 3]], [{ k: 'fracEquiv', n: 3, d: 4, m: 2, ask: 'n', simplify: false }, [6, 3, 7, 5]]], { k: 'fracEquiv', n: 2, d: 3, m: 2, ask: 'n', simplify: false }],
  'FRA-04': [{ k: 'fracAdd', a: 2, b: 3, d: 7, op: '+' }, [[{ k: 'fracAdd', a: 1, b: 2, d: 5, op: '+' }, [3, 2, 4, 1]], [{ k: 'fracAdd', a: 5, b: 3, d: 8, op: '−' }, [2, 8, 1, 3]]], { k: 'fracAdd', a: 2, b: 3, d: 7, op: '+' }],
  'DEC-01': [{ k: 'decFrac', n: 3, den: 10, ask: 'dec' }, [[{ k: 'decFrac', n: 7, den: 10, ask: 'dec' }, [0.7, 0.07, 7, 1.7]], [{ k: 'decFrac', n: 4, den: 10, ask: 'frac' }, [4, 40, 1, 6]]], { k: 'decFrac', n: 13, den: 10, ask: 'dec' }],
  'DEC-02': [{ k: 'decFrac', n: 35, den: 100, ask: 'dec' }, [[{ k: 'decFrac', n: 7, den: 100, ask: 'dec' }, [0.07, 0.7, 7, 0.17]], [{ k: 'decFrac', n: 42, den: 100, ask: 'frac' }, [42, 4, 420, 24]]], { k: 'decFrac', n: 25, den: 100, ask: 'dec' }],
  'DEC-03': [{ k: 'decFrac', n: 24, den: 10, ask: 'dec' }, [['dec', 'addition', 1.2, 2.5, [3.7, 3.6, 4.7, 1.3]], ['dec', 'subtraction', 4.6, 1.3, [3.3, 5.9, 3.2, 2.3]]], ['dec', 'addition', 2.8, 1.5]],
  'DEC-04': [{ k: 'decFrac', n: 34, den: 10, ask: 'dec' }, [['dec', 'multiplication', 2.5, 10, [25, 0.25, 250, 2.5]], ['dec', 'division', 47, 10, [4.7, 470, 0.47, 47]]], ['dec', 'multiplication', 3.4, 100]],
  'GEO-01': [{ k: 'rect', measure: 'area', l: 4, w: 3, grid: true }, [[{ k: 'rect', measure: 'area', l: 3, w: 2, grid: true }, [6, 5, 10, 7]], [{ k: 'rect', measure: 'area', l: 5, w: 3, grid: true }, [15, 16, 8, 14]]], { k: 'rect', measure: 'area', l: 4, w: 3, grid: true }],
  'GEO-02': [{ k: 'rect', measure: 'perim', l: 4, w: 2, grid: true }, [[{ k: 'rect', measure: 'perim', l: 3, w: 2, grid: true }, [10, 6, 5, 12]], [{ k: 'rect', measure: 'perim', l: 6, w: 4, grid: false }, [20, 24, 10, 22]]], { k: 'rect', measure: 'perim', l: 5, w: 3, grid: false }],
  'GEO-03': [{ k: 'rect', measure: 'area', l: 6, w: 4, grid: false }, [[{ k: 'rect', measure: 'area', l: 7, w: 3, grid: false }, [21, 10, 20, 24]], [{ k: 'rect', measure: 'area', l: 8, w: 5, grid: false }, [40, 26, 13, 45]]], { k: 'rect', measure: 'area', l: 9, w: 4, grid: false }],
  'GEO-04': [{ k: 'side', of: 'area', l: 6, w: 4 }, [[{ k: 'side', of: 'area', l: 5, w: 3 }, [3, 10, 5, 4]], [{ k: 'side', of: 'perim', l: 6, w: 2 }, [2, 10, 4, 8]]], { k: 'side', of: 'area', l: 8, w: 3 }],
};

// Mirrors src/domain/math/topics.ts (formAnswer / build) for these fixed items.
const r2 = (x) => Math.round(x * 100) / 100;
function formItem(f) {
  switch (f.k) {
    case 'fracName': return ['division', [f.n, f.d, f.n], f.n];
    case 'fracOf': return ['multiplication', [f.q, f.d, (f.q / f.d) * f.n], (f.q / f.d) * f.n];
    case 'fracEquiv': { const ans = f.simplify ? (f.ask === 'n' ? f.n : f.d) : f.ask === 'n' ? f.n * f.m : f.d * f.m; return ['multiplication', [f.n, f.d, ans], ans]; }
    case 'fracAdd': { const ans = f.op === '+' ? f.a + f.b : f.a - f.b; return [f.op === '+' ? 'addition' : 'subtraction', [f.a, f.b, ans], ans]; }
    case 'decFrac': { const ans = f.ask === 'dec' ? f.n / f.den : f.n; return ['division', f.ask === 'dec' ? [f.n, f.den, ans] : [f.n / f.den, f.den, ans], ans, f.ask === 'dec' ? (f.den === 10 ? 1 : 2) : undefined]; }
    case 'rect': { const ans = f.measure === 'area' ? f.l * f.w : 2 * (f.l + f.w); return [f.measure === 'area' ? 'multiplication' : 'addition', [f.l, f.w, ans], ans]; }
    case 'side': { const total = f.of === 'area' ? f.l * f.w : 2 * (f.l + f.w); return [f.of === 'area' ? 'division' : 'subtraction', [total, f.l, f.w], f.w]; }
  }
}
function topicFixed(entry) {
  if (entry[0] === 'dec') {
    const [, op, a, b] = entry;
    const c = r2(op === 'addition' ? a + b : op === 'subtraction' ? a - b : op === 'multiplication' ? a * b : a / b);
    const dp = Math.max(1, ...[a, c].map((x) => (String(x).split('.')[1] ?? '').length));
    return { operation: op, operands: [a, b, c], blank: 'result', answer: c, dp };
  }
  const [form] = entry;
  const [operation, operands, answer, dp] = formItem(form);
  return { operation, operands, blank: 'result', answer, form, ...(dp ? { dp } : {}) };
}
function topicChoices(answer, dp) {
  const step = dp ? 10 ** -Math.min(dp, (String(answer).split('.')[1] ?? '').length || 1) : 1;
  const out = [answer];
  for (const k of [1, -1, 2, 10, -2, 3]) {
    const v = r2(answer + k * step);
    if (out.length < 4 && v >= 0 && !out.includes(v)) out.push(v);
  }
  const rot = Math.round(answer * 100) % out.length;
  return [...out.slice(rot), ...out.slice(0, rot)];
}

for (const [id, [modelForm, guided, key]] of Object.entries(TOPIC)) {
  const steps = [
    { kind: 'hook', textKey: `lesson.${id}.hook`, audioKey: `${id}.hook`, illustration: 'oasis' },
    { kind: 'model', textKey: `lesson.${id}.model`, audioKey: `${id}.model`, form: modelForm },
    ...guided.map((g, i) => {
      // An optional last element lists hand-picked choices built from typical mistakes (answer first).
      const picked = Array.isArray(g[g.length - 1]) ? g[g.length - 1] : null;
      const { answer, ...item } = topicFixed(picked ? g.slice(0, -1) : g);
      if (picked && picked[0] !== answer) throw new Error(`${id} guided ${i + 1}: first choice must be the answer ${answer}`);
      const choices = picked ? [...picked.slice(i % 4 === 0 ? 1 : 0, 2), picked[0], ...picked.slice(2)].filter((v, k, a) => a.indexOf(v) === k) : topicChoices(answer, item.dp);
      return { kind: 'guided', textKey: 'lesson.guided.prompt', audioKey: `${id}.guided${i + 1}`, item: { ...item, choices } };
    }),
    (() => {
      const { answer: _answer, ...expression } = topicFixed(Array.isArray(key) ? key : [key]);
      return { kind: 'keyIdea', textKey: `lesson.${id}.keyIdea`, audioKey: `${id}.keyIdea`, expression };
    })(),
    { kind: 'ready', textKey: 'lesson.ready', audioKey: 'ui.ready' },
  ];
  lessons.push({ id: `lesson-${id}`, skillId: id, steps });
}

fs.writeFileSync('src/content/lessons.json', JSON.stringify(lessons, null, 2) + '\n');
console.log(`Wrote ${lessons.length} lessons`);
