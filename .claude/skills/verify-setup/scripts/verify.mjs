#!/usr/bin/env node
// Project setup verification for the Vue 3 + Vuetify 3 + Pinia + TS + Cropper.js image editor.
// Usage (from project root):
//   node .claude/skills/verify-setup/scripts/verify.mjs          static checks only (fast, no network)
//   node .claude/skills/verify-setup/scripts/verify.mjs --full   + fresh clone, npm i, type-check, build, dev smoke test
import { existsSync, readFileSync, readdirSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';

const root = process.cwd();
const full = process.argv.includes('--full');
const results = [];
const ok = (msg) => results.push(['PASS', msg]);
const warn = (msg) => results.push(['WARN', msg]);
const fail = (msg) => results.push(['FAIL', msg]);

const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : null);
const major = (range) => {
  const m = String(range ?? '').match(/(\d+)/);
  return m ? Number(m[1]) : null;
};
const installedMajor = (name) => {
  const p = join(root, 'node_modules', name, 'package.json');
  return existsSync(p) ? major(JSON.parse(readFileSync(p, 'utf8')).version) : null;
};

function walk(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, exts, out);
    else if (exts.includes(extname(p))) out.push(p);
  }
  return out;
}

// ---------- package.json ----------
const pkgText = read('package.json');
if (!pkgText) {
  fail('package.json not found — run from the project root');
  report();
}
const pkg = JSON.parse(pkgText);
const deps = { ...pkg.dependencies, ...pkg.devDependencies };

pkg.scripts?.dev ? ok(`scripts.dev = "${pkg.scripts.dev}"`) : fail('scripts.dev is missing (npm run dev must work)');
pkg.scripts?.build ? ok('scripts.build present') : warn('scripts.build is missing');

const expectations = [
  ['vue', 3, 'dependencies'],
  ['vuetify', 3, 'dependencies'],
  ['pinia', null, 'dependencies'],
  ['cropperjs', 2, 'dependencies'],
  ['typescript', null, 'devDependencies'],
  ['vue-tsc', null, 'devDependencies'],
  ['vite', null, 'devDependencies'],
  ['vite-plugin-vuetify', null, 'devDependencies'],
];
for (const [name, wantMajor, section] of expectations) {
  if (!deps[name]) {
    fail(`${name} missing from package.json (${section})`);
    continue;
  }
  const declared = major(deps[name]);
  const installed = installedMajor(name);
  if (wantMajor !== null && declared !== wantMajor) {
    fail(`${name} declared as "${deps[name]}", expected major ${wantMajor}`);
  } else if (wantMajor !== null && installed !== null && installed !== wantMajor) {
    fail(`${name} installed major ${installed}, expected ${wantMajor} (reinstall)`);
  } else {
    ok(`${name} ${deps[name]}${installed !== null ? ` (installed ${installed}.x)` : ''}`);
  }
}
if (/^(latest|\*|>=)/.test(String(deps.vuetify ?? ''))) {
  fail('vuetify range can resolve to v4 — pin to "^3.x"');
}

// ---------- node / lockfiles ----------
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (pkg.engines?.node) ok(`engines.node = "${pkg.engines.node}" (current ${process.versions.node})`);
else warn(`engines.node not set (current ${process.versions.node}); add it so reviewers know the required Node`);
if (nodeMajor < 20) fail(`Node ${process.versions.node} is too old for current Vite`);

existsSync(join(root, 'package-lock.json')) ? ok('package-lock.json present') : warn('package-lock.json missing — commit it for reproducible npm i');
for (const lock of ['pnpm-lock.yaml', 'yarn.lock', 'bun.lockb']) {
  if (existsSync(join(root, lock))) fail(`${lock} found — project must use npm only`);
}

// ---------- vite config ----------
const viteFile = ['vite.config.ts', 'vite.config.mts', 'vite.config.js'].find((f) => existsSync(join(root, f)));
const vite = viteFile ? read(viteFile) : '';
if (!viteFile) fail('vite.config.* not found');
else {
  /vuetify\s*\(/.test(vite) ? ok('vite-plugin-vuetify registered') : fail(`vuetify() plugin not found in ${viteFile}`);
  /isCustomElement[\s\S]{0,80}cropper-/.test(vite)
    ? ok('isCustomElement configured for <cropper-*>')
    : fail(`isCustomElement for cropper-* not found in ${viteFile}`);
}

// ---------- sources ----------
const srcFiles = walk(join(root, 'src'), ['.ts', '.vue', '.js', '.mts']);
const src = srcFiles.map((f) => [f.slice(root.length + 1), readFileSync(f, 'utf8')]);
const grep = (re) => src.filter(([, t]) => re.test(t)).map(([f]) => f);

// alias @/
if (grep(/from\s+['"]@\//).length) {
  const tsconfigs = readdirSync(root).filter((f) => /^tsconfig.*\.json$/.test(f)).map((f) => read(f)).join('\n');
  /["']@\/\*["']\s*:/.test(tsconfigs) ? ok('tsconfig paths has "@/*"') : fail('imports use "@/" but no "@/*" in tsconfig paths');
  /['"]@['"]\s*:|find:\s*['"]@['"]/.test(vite) ? ok('vite resolve.alias has "@"') : fail('imports use "@/" but no "@" alias in vite config');
}

// vuetify styles + icons
grep(/vuetify\/styles/).length ? ok("'vuetify/styles' imported") : fail("'vuetify/styles' is not imported anywhere in src");
if (grep(/mdi-[a-z]/).length) {
  deps['@mdi/font'] ? ok('@mdi/font present for mdi-* icons') : fail('mdi-* icons used but @mdi/font not in dependencies');
  grep(/@mdi\/font/).length ? ok('@mdi/font CSS imported') : fail('@mdi/font CSS not imported in src');
}
grep(/app\.use\(\s*createPinia|createPinia\(\)/).length ? ok('Pinia installed on the app') : fail('createPinia() not found in src');
grep(/import\s+['"]cropperjs['"]|\$define\(\)/).length ? ok('Cropper elements registered') : warn('cropperjs import / $define() not found');

// forbidden patterns
const forbidden = [
  [/getCroppedCanvas|new\s+Cropper\s*\(/, 'Cropper.js v1 API'],
  [/vue-cropperjs|vue-advanced-cropper/, 'v1 cropper wrapper'],
  [/cropperjs\/dist\/cropper\.css/, 'v1 cropper CSS import'],
  [/localStorage\.|sessionStorage\./, 'browser storage (not required by the task)'],
];
if (!deps['@vueuse/core']) forbidden.push([/@vueuse\//, '@vueuse used but not a dependency']);
for (const [re, label] of forbidden) {
  const hits = grep(re);
  hits.length ? fail(`${label}: ${hits.join(', ')}`) : ok(`no ${label}`);
}

// env vars without example
if (grep(/import\.meta\.env\.VITE_/).length && !existsSync(join(root, '.env.example'))) {
  warn('VITE_* env vars used but no .env.example — npm run dev may break on a clean clone');
}

// ---------- full run ----------
if (full) await fullRun();
report();

async function fullRun() {
  const isGit = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).status === 0;
  if (!isGit) {
    warn('not a git repo — skipping fresh-clone test, running in place');
  }
  const dir = isGit ? mkdtempSync(join(tmpdir(), 'verify-setup-')) : root;
  try {
    if (isGit) {
      const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).stdout.trim();
      if (dirty) warn('uncommitted changes are NOT included in the fresh clone test');
      run('git', ['clone', '--quiet', root, dir], root, 'git clone');
    }
    if (!run('npm', ['i'], dir, 'npm i')) return;
    const typeCheck = pkg.scripts?.['type-check'] ? ['npm', ['run', 'type-check']] : ['npx', ['vue-tsc', '--noEmit']];
    run(typeCheck[0], typeCheck[1], dir, typeCheck.flat().join(' '));
    if (pkg.scripts?.build) run('npm', ['run', 'build'], dir, 'npm run build');
    await devSmoke(dir);
  } finally {
    if (isGit) rmSync(dir, { recursive: true, force: true });
  }
}

function run(cmd, args, cwd, label) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status === 0) {
    ok(label);
    return true;
  }
  fail(`${label} failed:\n${(r.stdout + r.stderr).split('\n').slice(-25).join('\n')}`);
  return false;
}

async function devSmoke(cwd) {
  const port = 5199;
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
    cwd,
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32',
  });
  let output = '';
  child.stdout.on('data', (d) => (output += d));
  child.stderr.on('data', (d) => (output += d));
  const deadline = Date.now() + 60_000;
  let up = false;
  while (Date.now() < deadline && !up) {
    await new Promise((r) => setTimeout(r, 1000));
    try {
      const res = await fetch(`http://localhost:${port}/`);
      const html = await res.text();
      up = res.ok && html.includes('id="app"');
    } catch {}
  }
  if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
  else try { process.kill(-child.pid, 'SIGTERM'); } catch {}
  up ? ok(`npm run dev serves http://localhost:${port}`) : fail(`npm run dev did not serve within 60s:\n${output.slice(-2000)}`);
}

function report() {
  for (const [status, msg] of results) console.log(`${status}  ${msg}`);
  const failed = results.filter(([s]) => s === 'FAIL').length;
  const warned = results.filter(([s]) => s === 'WARN').length;
  console.log(`\n${failed} failed, ${warned} warnings, ${results.length - failed - warned} passed`);
  process.exit(failed ? 1 : 0);
}
