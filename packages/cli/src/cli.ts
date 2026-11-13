#!/usr/bin/env node
/** Bunelix CLI v0.1. Command handlers deliberately avoid shell interpolation. */
import { readFile, readdir, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const VERSION = '0.1.0';
const VALID_SLUG = /^[a-z][a-z0-9-]{1,48}$/;
const usage = `Bunelix CLI ${VERSION}

  bunelix new <app-name>          Create a new Capacitor-ready app
  bunelix make:bundle <Name>      Generate and register a bundle in current app
  bunelix bundle:list             List generated application bundles
  bunelix doctor                  Check local prerequisites
  bunelix build android           Build Web, sync Capacitor and assemble debug APK
  bunelix --version               Print CLI version

The npm registry will need @bunelix/core published before external app install.
`;
function die(message: string): never { throw new Error(message); }
function safeName(name: string): string {
  if (!VALID_SLUG.test(name)) die(`Invalid name '${name}': use 2–49 lowercase letters, digits or hyphens`);
  return name;
}
function idFrom(name: string): string { return name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()); }
async function exists(path: string): Promise<boolean> { try { await access(path); return true; } catch { return false; } }
async function put(path: string, content: string): Promise<void> {
  await mkdir(resolve(path, '..'), {recursive: true});
  await writeFile(path, content, {flag: 'wx'});
}
const APP_MAIN = `import { BunelixKernel } from '@bunelix/core';
import { bundles } from './bundles/index.js';

const kernel = new BunelixKernel(bundles, { environment: 'development' });
const root = document.querySelector('#app');
if (!root) throw new Error('Missing #app');
let unmount;
async function show(path) {
  unmount?.(); root.replaceChildren();
  const screen = kernel.screens.get(path);
  if (!screen) { root.textContent = 'Screen not found: ' + path; return; }
  const cleanup = await screen.mount(root);
  unmount = typeof cleanup === 'function' ? cleanup : undefined;
}
await kernel.start();
await show('/home');
window.addEventListener('pagehide', () => { void kernel.stop(); }, {once:true});
`;
const APP_INDEX = `<!doctype html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#111827"/><title>Bunelix</title></head>
<body style="margin:0;background:#111827;color:#f8fafc;font:16px system-ui,sans-serif"><main id="app"></main><script type="module" src="/src/main.js"></script></body></html>
`;
const REGISTRY = `import type { BunelixBundle } from '@bunelix/core';
import { HomeBundle } from './home.js';
// bunelix:imports
export const bundles: BunelixBundle[] = [
  HomeBundle,
  // bunelix:registrations
];
`;
const HOME_BUNDLE = `import { defineBundle } from '@bunelix/core';
export const HomeBundle = defineBundle({
  id: 'app.home', version: '0.1.0', apiVersion: 1,
  register({ screens }) {
    screens.add({ path: '/home', title: 'Home', mount(root) {
      const box = document.createElement('section');
      box.style.cssText = 'padding:48px 20px;max-width:680px;margin:auto';
      const title = document.createElement('h1');
      title.textContent = 'Welcome to Bunelix ✦';
      const description = document.createElement('p');
      description.textContent = 'Create a new module with: npx bunelix make:bundle Journal';
      box.append(title, description); root.append(box);
    }});
  }
});
`;
async function createApp(appName: string, cwd: string): Promise<string> {
  const name = safeName(appName);
  const dir = resolve(cwd, name);
  if (await exists(dir)) die(`Target already exists: ${dir}`);
  await mkdir(dir, {recursive:true});
  const packageJson = {
    name, version: '0.1.0', private: true, type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0', build: 'tsc --noEmit && vite build',
      'android:add': 'npx cap add android', 'android:sync': 'npm run build && npx cap sync android',
      'android:open': 'npx cap open android'
    },
    dependencies: {'@bunelix/core': '^0.1.0', '@capacitor/core': '^8.0.0'},
    devDependencies: {'@bunelix/cli': '^0.1.0', '@capacitor/cli': '^8.0.0', '@capacitor/android': '^8.0.0', 'typescript': '^5.8.3', 'vite': '^7.0.0'}
  };
  await put(join(dir, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');
  await put(join(dir, 'index.html'), APP_INDEX);
  await put(join(dir, 'tsconfig.json'), JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'Bundler',lib:['ES2022','DOM'],strict:true,noEmit:true,allowJs:true,checkJs:false},include:['src/**/*']},null,2)+'\n');
  await put(join(dir, 'capacitor.config.ts'), `import type { CapacitorConfig } from '@capacitor/cli';\nconst config: CapacitorConfig = { appId: 'org.bunelix.${name.replaceAll('-','')}', appName: '${name}', webDir: 'dist' };\nexport default config;\n`);
  await put(join(dir, 'src/main.js'), APP_MAIN);
  await put(join(dir, 'src/bundles/index.ts'), REGISTRY);
  await put(join(dir, 'src/bundles/home.ts'), HOME_BUNDLE);
  await put(join(dir, '.gitignore'), 'node_modules/\ndist/\nandroid/\n.env\n*.keystore\n');
  await put(join(dir, 'README.md'), `# ${name}\n\nGenerated with Bunelix ${VERSION}.\n\nRun \`npm install\` (after Bunelix packages have been published), then \`npm run dev\`.\nAndroid: \`npm run android:add\`, then \`npm run android:sync\`, then \`npm run android:open\`.\n\nNever commit keystores or production secrets.\n`);
  return dir;
}
function bundleSource(name: string, id: string): string {
  return `import { defineBundle } from '@bunelix/core';
/** Generated bundle; add services, screens or event subscribers in register(). */
export const ${name}Bundle = defineBundle({
  id: '${id}', version: '0.1.0', apiVersion: 1,
  requires: [], permissions: [],
  register({ screens }) {
    screens.add({ path: '/${id.replaceAll('.', '-')}', title: '${name}', mount(root) {
      const heading = document.createElement('h1');
      heading.textContent = '${name}'; root.append(heading);
    }});
  },
  boot() {}, shutdown() {}
});
`;
}
async function createBundle(raw: string, cwd: string): Promise<string> {
  if (!/^[A-Z][A-Za-z0-9]{1,48}$/.test(raw)) die('Bundle class name must be PascalCase (e.g. Camera)');
  const slug = raw.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const target = join(cwd,'src','bundles',slug+'.ts');
  const registry = join(cwd,'src','bundles','index.ts');
  if (!(await exists(registry))) die('Not a Bunelix project: src/bundles/index.ts missing');
  if (await exists(target)) die(`Bundle already exists: ${target}`);
  const current = await readFile(registry,'utf8');
  if (!current.includes('// bunelix:imports') || !current.includes('// bunelix:registrations')) die('Registry missing Bunelix markers');
  const exported = `${raw}Bundle`;
  const next = current.replace('// bunelix:imports', `import { ${exported} } from './${slug}.js';\n// bunelix:imports`)
    .replace('// bunelix:registrations', `  ${exported},\n  // bunelix:registrations`);
  // Validate all names before writing. Do not overwrite existing files.
  await put(target,bundleSource(raw,'app.'+slug));
  await writeFile(registry,next);
  return target;
}
function runCommand(command: string, args: string[], cwd: string): void {
  const proc = spawnSync(command, args, {cwd, stdio:'inherit', shell:false});
  if (proc.error) throw proc.error;
  if (proc.status !== 0) die(`Command failed (${command} ${args.join(' ')}) with exit ${proc.status}`);
}
async function doctor(cwd: string): Promise<void> {
  console.log(`Bunelix ${VERSION} | Node ${process.version}`);
  if (Number(process.versions.node.split('.')[0]) < 22) die('Node >=22 required');
  for (const file of ['package.json','src/main.js','src/bundles/index.ts','capacitor.config.ts']) {
    const ok = await exists(join(cwd,file));
    console.log(`${ok ? '✓' : '✗'} ${file}`);
  }
  console.log('Native Android requires the Android SDK, a JDK and an Android device/emulator.');
}
export async function run(argv: string[] = process.argv.slice(2), cwd = process.cwd()): Promise<void> {
  const [command, arg, ...extra] = argv;
  if (!command || command === '--help' || command === '-h') {console.log(usage);return;}
  if (command === '--version' || command === '-V') {console.log(VERSION);return;}
  if (extra.length) die('Too many arguments');
  if (command === 'new' && arg) { console.log(`Created: ${await createApp(arg, cwd)}`); return; }
  if (command === 'make:bundle' && arg) {console.log(`Created and registered: ${await createBundle(arg,cwd)}`);return;}
  if (command === 'bundle:list' && !arg) {
    const dir = join(cwd,'src','bundles');
    if (!(await exists(dir))) die('Not a Bunelix app');
    console.log((await readdir(dir)).filter(n=>n.endsWith('.ts') && n !== 'index.ts').join('\n'));
    return;
  }
  if (command === 'doctor' && !arg) {await doctor(cwd);return;}
  if (command === 'build' && arg === 'android') {
    if (!(await exists(join(cwd, 'capacitor.config.ts')))) die('Not a Bunelix Capacitor project');
    runCommand('npm',['run','build'],cwd);
    if (!(await exists(join(cwd,'android')))) runCommand('npx',['cap','add','android'],cwd);
    runCommand('npx',['cap','sync','android'],cwd);
    const gradle = join(cwd,'android','gradlew');
    if (!(await exists(gradle))) die('Gradle wrapper not found after Capacitor sync');
    runCommand(gradle,['assembleDebug'],join(cwd,'android'));
    console.log('APK: android/app/build/outputs/apk/debug/app-debug.apk');
    return;
  }
  die(`Unknown command or missing argument.\n${usage}`);
}
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  run().catch(err => { console.error(`Bunelix: ${err instanceof Error ? err.message : String(err)}`);process.exitCode = 1; });
}
