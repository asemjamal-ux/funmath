// Production builds must not ship Arabic still marked "_review": "pending" (agent-instructions §6.4, §15).
import { execFileSync } from 'node:child_process';
execFileSync(process.execPath, ['scripts/lint-i18n.mjs'], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
