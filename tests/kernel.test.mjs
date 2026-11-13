import test from 'node:test';
import assert from 'node:assert/strict';
import { BunelixKernel, ServiceContainer, EventBus, ScreenRegistry, defineBundle, BunelixError } from '../packages/core/dist/index.js';
const b = (id, overrides={}) => defineBundle({id,version:'0.1.0',apiVersion:1,register(){},...overrides});

test('DI lazy singletons and cycles',()=>{
  const s=new ServiceContainer();let calls=0;
  s.register('a',()=>{calls++;return {answer:42};});
  assert.equal(s.get('a'),s.get('a'));assert.equal(calls,1);
  s.register('cycle-a', c=>c.get('cycle-b'));
  s.register('cycle-b', c=>c.get('cycle-a'));
  assert.throws(()=>s.get('cycle-a'), {code:'SERVICE_CYCLE'});
});
test('async events and unsubscribe',async()=>{
  const events=new EventBus();let sum=0;
  const unsub=events.on('counter',async n=>{sum+=n;});
  await events.emit('counter',2);unsub();await events.emit('counter',3);assert.equal(sum,2);
});
test('screens reject traversal and duplicates',()=>{
  const screens=new ScreenRegistry();screens.add({path:'/home',title:'H',mount(){}});
  assert.throws(()=>screens.add({path:'/home',title:'H',mount(){}}),{code:'DUPLICATE_ROUTE'});
  assert.throws(()=>screens.add({path:'/../admin',title:'H',mount(){}}),{code:'INVALID_ROUTE'});
});
test('dependency sorted before consumer, shutdown reversed',async()=>{
  const sequence=[];
  const one=b('provider',{register(){sequence.push('register provider');},boot(){sequence.push('boot provider');},shutdown(){sequence.push('stop provider');}});
  const two=b('consumer',{requires:[{id:'provider',minVersion:'0.1.0'}],register(){sequence.push('register consumer');},boot(){sequence.push('boot consumer');},shutdown(){sequence.push('stop consumer');}});
  const kernel=new BunelixKernel([two,one]);await kernel.start();assert.equal(kernel.state,'running');await kernel.stop();
  assert.deepEqual(sequence,['register provider','register consumer','boot provider','boot consumer','stop consumer','stop provider']);
});
test('missing, circular, duplicate and wrong API bundles rejected',()=>{
  assert.throws(()=>new BunelixKernel([b('a',{requires:[{id:'missing'}]})]),{code:'MISSING_DEPENDENCY'});
  assert.throws(()=>new BunelixKernel([b('a',{requires:[{id:'b'}]}),b('b',{requires:[{id:'a'}]})]),{code:'BUNDLE_CYCLE'});
  assert.throws(()=>new BunelixKernel([b('a'),b('a')]),{code:'DUPLICATE_BUNDLE'});
  assert.throws(()=>new BunelixKernel([b('a',{apiVersion:2})]),{code:'API_MISMATCH'});
  assert.throws(()=>new BunelixKernel([b('a',{requires:[{id:'b',minVersion:'1.0.0'}]}),b('b')]),{code:'DEPENDENCY_VERSION'});
});
test('permissions require declaration AND app permission',async()=>{
  let context;
  const kernel=new BunelixKernel([b('camera',{permissions:['camera'],register(ctx){context=ctx;}})],{allowedCapabilities:['camera','storage']});
  await kernel.start();assert.equal(context.capabilities.can('camera'),true);
  assert.equal(context.capabilities.can('storage'),false);
  assert.throws(()=>context.capabilities.require('storage'),{code:'CAPABILITY_DENIED'});
  await kernel.stop();
});
test('boot failure rolls back and preserves original error',async()=>{
  const changes=[];
  const kernel=new BunelixKernel([b('a',{boot(){changes.push('a');},shutdown(){changes.push('close-a');}}),b('b',{boot(){throw new Error('fail');},shutdown(){changes.push('close-b');}})]);
  await assert.rejects(kernel.start(),/fail/);assert.equal(kernel.state,'stopped');
  assert.deepEqual(changes,['a','close-b','close-a']);
});
test('register error resets state',async()=>{
  const kernel=new BunelixKernel([b('bad',{register(){throw new Error('bad register');}})]);
  await assert.rejects(kernel.start(),/bad register/);assert.equal(kernel.state,'stopped');
});
test('prototype poisoning ids and impossible lifecycle operations rejected',async()=>{
  assert.throws(()=>new BunelixKernel([b('__proto__')]),{code:'INVALID_NAME'});
  const kernel=new BunelixKernel([b('ok')]);await kernel.start();
  await assert.rejects(kernel.start(),{code:'INVALID_STATE'});await kernel.stop();await kernel.stop();
});
