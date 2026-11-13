import { BunelixKernel } from '@bunelix/core';
import { bundles } from './bundles/index.js';
import './style.css';
const kernel = new BunelixKernel(bundles,{environment:'development'});
const root = document.getElementById('app');
if (!root) throw new Error('Missing #app');
let dispose: void | (()=>void);
async function go(path:string) {
  dispose?.(); root!.replaceChildren();
  const screen=kernel.screens.get(path);
  if (!screen) {root!.textContent='Écran inconnu';return;}
  const cleanup=await screen.mount(root!);
  dispose=typeof cleanup==='function'?cleanup:undefined;
  document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.getAttribute('data-path')===path?'page':'false'));
}
await kernel.start();
const nav=document.createElement('nav');
for (const screen of kernel.screens.list()) {
  const b=document.createElement('button');
  b.textContent=screen.title;b.setAttribute('data-path',screen.path);
  b.addEventListener('click',()=>{void go(screen.path);});
  nav.append(b);
}
document.body.append(nav);
await go('/home');
window.addEventListener('pagehide',()=>{void kernel.stop();},{once:true});
