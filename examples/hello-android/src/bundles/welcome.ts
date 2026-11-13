import { defineBundle } from '@bunelix/core';
export const WelcomeBundle = defineBundle({
  id:'example.welcome', version:'0.1.0', apiVersion:1,
  register({screens,services}) {
    services.register('welcome.message', ()=>'Chaque application commence par un module.');
    screens.add({path:'/home', title:'Accueil',mount(root) {
      const h=document.createElement('h1');h.textContent='BUNELIX ✦';
      const p=document.createElement('p');p.textContent=services.get<string>('welcome.message');
      root.append(h,p);
    }});
  }
});
