import {defineBundle} from '@bunelix/core';
export const CounterBundle=defineBundle({
  id:'example.counter', version:'0.1.0', apiVersion:1,
  requires:[{id:'example.welcome',minVersion:'0.1.0'}],
  register({screens,events}) {
    let count=0;
    screens.add({path:'/counter',title:'Compteur',mount(root) {
      const title=document.createElement('h2');title.textContent='Un geste, un événement';
      const button=document.createElement('button');button.textContent='Ajouter un point : 0';
      button.addEventListener('click',()=>{count++;button.textContent=`Ajouter un point : ${count}`;void events.emit('example.point-added',{count});});
      root.append(title,button);
    }});
  }
});
