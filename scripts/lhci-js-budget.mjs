// NFR-01 "initial JavaScript ≤ 200 KB gzipped", checked after `lhci collect` (see lighthouserc.cjs).
// Lighthouse's resource-summary counts transfer bytes including response headers (~0.6 KB per request with the
// security headers), so this sums the gzipped bodies of the same-origin scripts each audited page actually loaded.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BUDGET = 200 * 1024;
const root = path.resolve(import.meta.dirname, '..');
const lhciDir = path.join(root, '.lighthouseci');
const lhrs = fs.readdirSync(lhciDir).filter((f) => /^lhr-.*\.json$/.test(f));
if (!lhrs.length) {
  console.error('js-budget: no Lighthouse results in .lighthouseci — run `lhci collect` first');
  process.exit(1);
}

const perUrl = new Map();
for (const f of lhrs) {
  const lhr = JSON.parse(fs.readFileSync(path.join(lhciDir, f), 'utf8'));
  const origin = new URL(lhr.requestedUrl).origin;
  let bytes = 0;
  for (const req of lhr.audits['network-requests'].details.items) {
    if (req.resourceType !== 'Script' || !req.url.startsWith(origin)) continue;
    const file = path.join(root, 'dist', new URL(req.url).pathname);
    if (!fs.existsSync(file)) throw new Error(`js-budget: ${file} not in dist/ — rebuild before measuring`);
    bytes += zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;
  }
  perUrl.set(lhr.requestedUrl, Math.max(perUrl.get(lhr.requestedUrl) ?? 0, bytes));
}

let failed = false;
for (const [url, bytes] of perUrl) {
  const ok = bytes <= BUDGET;
  failed ||= !ok;
  console.log(`${ok ? '✓' : '✗'} ${url}  initial JS ${(bytes / 1024).toFixed(1)} KB gzipped (budget ${BUDGET / 1024} KB)`);
}
process.exit(failed ? 1 : 0);
