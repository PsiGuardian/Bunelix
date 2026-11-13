import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {run} from '../packages/cli/dist/cli.js';
const scratch=async(fn)=>{const dir=await mkdtemp(join(tmpdir(),'bunelix-test-'));try{await fn(dir);}finally{await rm(dir,{recursive:true,force:true});}};

test('create app, generate and auto-register a bundle', async()=>scratch(async(dir)=>{
  await run(['new','hello-app'],dir);
  const app=join(dir,'hello-app');await access(join(app,'capacitor.config.ts'));
  await run(['make:bundle','Camera'],app);
  const registry=await readFile(join(app,'src/bundles/index.ts'),'utf8');
  assert.match(registry,/CameraBundle/);
  const bundle=await readFile(join(app,'src/bundles/camera.ts'),'utf8');
  assert.match(bundle,/export const CameraBundle/);
  assert.doesNotMatch(bundle,/CameraBundleBundle/);
  await assert.rejects(run(['make:bundle','Camera'],app),/already exists/);
}));
test('invalid path names rejected safely',async()=>scratch(async(dir)=>{
  await assert.rejects(run(['new','../escape'],dir),/Invalid name/);
  await assert.rejects(run(['new','AbC'],dir),/Invalid name/);
}));
