// Writes locale entry pages (/en/, /ar/, /about) with the correct <html lang dir> and manifest
// before any JS runs (ARCH §6.1, §9.1). The app shell itself hydrates client-side.
// NFR-01: every entry page also preloads the learner route chunk, and each locale page preloads that locale's
// message catalogues, so they download with the entry bundle instead of one round trip later. All /en/* and
// /ar/* URLs are served by their locale page (public/_redirects; the preview middleware below does the same).
import fs from 'node:fs';
import path from 'node:path';

const pages = [
  { out: 'en/index.html', lang: 'en', dir: 'ltr', title: 'Number Oasis' },
  { out: 'ar/index.html', lang: 'ar', dir: 'rtl', title: 'واحة الأرقام' },
  { out: 'about/index.html', lang: 'en', dir: 'ltr', title: 'About · Number Oasis' },
];

// Rollup module ids use forward slashes on every platform.
const LEARNER = /\/src\/pages\/Learner\.tsx$/;
const CATALOGUE = /\/src\/locales\/(en|ar)\/(?!_)[^/]+\.json$/;

const preloadTags = (files) => [...new Set(files)].map((f) => `<link rel="modulepreload" crossorigin href="/${f}">`).join('');

export function prerenderLocales() {
  let outDir = 'dist';
  const learner = [];
  const catalogues = { en: [], ar: [] };
  return {
    name: 'number-oasis-prerender',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    configurePreviewServer(server) {
      // Same routing as public/_redirects: /en/* and /ar/* get their locale entry page.
      server.middlewares.use((req, _res, next) => {
        const m = /^\/(en|ar)\/[^.?]*(\?.*)?$/.exec(req.url ?? '');
        if (m && req.headers.accept?.includes('text/html')) req.url = `/${m[1]}/index.html`;
        next();
      });
    },
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.facadeModuleId) continue;
        if (LEARNER.test(chunk.facadeModuleId)) learner.push(chunk.fileName, ...chunk.imports);
        const c = CATALOGUE.exec(chunk.facadeModuleId);
        if (c) catalogues[c[1]].push(chunk.fileName);
      }
    },
    closeBundle() {
      if (!learner.length) return; // dev server
      const src = path.resolve(outDir, 'index.html');
      if (!fs.existsSync(src)) return;
      // hreflang alternates are added here because Vite would try to bundle them as assets (ARCH §9.1).
      const alternates = ['en', 'ar'].map((l) => `<link rel="alternate" hreflang="${l}" href="/${l}/" />`).join('') + '<link rel="alternate" hreflang="x-default" href="/" />';
      const head = fs.readFileSync(src, 'utf8');
      const base = head.replace('</head>', `${alternates}${preloadTags(learner.filter((f) => !head.includes(f)))}</head>`);
      fs.writeFileSync(src, base);
      for (const p of pages) {
        const html = base
          .replace(/<html lang="[^"]*" dir="[^"]*">/, `<html lang="${p.lang}" dir="${p.dir}">`)
          .replace(/href="\/en\/manifest.webmanifest"/, `href="/${p.lang}/manifest.webmanifest"`)
          .replace(/<title>[^<]*<\/title>/, `<title>${p.title}</title>`)
          .replace('</head>', `${preloadTags(catalogues[p.lang] ?? [])}</head>`);
        const dest = path.resolve(outDir, p.out);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, html);
      }
    },
  };
}
