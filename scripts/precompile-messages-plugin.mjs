// Build-only: ships ICU message catalogues as pre-parsed ASTs and swaps the runtime ICU parser for formatjs'
// `no-parser` entry (≈ 12 KB gzipped less initial JavaScript; NFR-01 budget ≤ 200 KB). The dev server keeps the
// plain strings and the parser so the en-XA pseudo-locale and hot reload keep working.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { parse } from '@formatjs/icu-messageformat-parser';

const require = createRequire(import.meta.url);
// Startup catalogues and the route-level ones in lazy/ (e.g. worksheets); never _review.json sidecars.
const CATALOGUE = /[\\/]src[\\/]locales[\\/](en|ar)[\\/](?:lazy[\\/])?(?!_)[^\\/]+\.json$/;

export function precompileMessages() {
  return {
    name: 'oasis-precompile-messages',
    apply: 'build',
    enforce: 'pre',
    config() {
      return {
        resolve: {
          alias: [{ find: /^@formatjs\/icu-messageformat-parser$/, replacement: require.resolve('@formatjs/icu-messageformat-parser/no-parser.js') }],
        },
      };
    },
    load(id) {
      const m = CATALOGUE.exec(id.split('?')[0]);
      if (!m) return null;
      const locale = new Intl.Locale(m[1]);
      const messages = JSON.parse(fs.readFileSync(id.split('?')[0], 'utf8'));
      const ast = Object.fromEntries(Object.entries(messages).map(([k, v]) => [k, parse(v, { locale })]));
      return JSON.stringify(ast); // still JSON: Vite's JSON plugin turns it into a module
    },
  };
}
