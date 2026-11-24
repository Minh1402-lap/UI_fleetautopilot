/* Smooth, progressive transitions. Rendering and browser history stay synchronous
   inside each transition update; no delay is added to business actions. */
(() => {
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const replayed=new WeakSet();
  const themeOrigins=[['top-right','100% 0%'],['bottom-left','0% 100%'],['top-left','0% 0%'],['bottom-right','100% 100%'],['right','100% 50%'],['left','0% 50%'],['top','50% 0%'],['bottom','50% 100%']];
  let themeStep=0;
  let active=null,pending=false,updating=false,queue=[];
  let pageAnimation;
  function incoming(){const main=document.querySelector('#main');pageAnimation?.cancel();if(main&&!reduced.matches)pageAnimation=main.animate?.([{opacity:.96},{opacity:1}],{duration:240,easing:'ease-out'});}
  function flush(){const batch=queue.splice(0);pending=false;updating=true;try{for(const update of batch)update();}finally{updating=false;}}
  function transition(update,kind='page'){
    // Render navigation synchronously into one live DOM. Never blend two text snapshots.
    if(kind==='page'){active?.skipTransition();delete document.documentElement.dataset.motion;update();incoming();return;}
    if(reduced.matches||!document.startViewTransition){update();if(!reduced.matches)incoming();return;}
    active?.skipTransition();queue.push(update);if(pending)return;
    pending=true;document.documentElement.dataset.motion=kind;
    if(kind==='theme'){
      const [name,point]=themeOrigins[themeStep++%themeOrigins.length];
      document.documentElement.dataset.motionOrigin=name;
      document.documentElement.style.setProperty('--theme-reveal-origin',point);
    }
    try{
      const t=document.startViewTransition(flush);active=t;
      t.ready.catch(()=>{});
      t.finished.catch(()=>{}).finally(()=>{if(active===t){active=null;delete document.documentElement.dataset.motion;}});
    }catch{flush();delete document.documentElement.dataset.motion;incoming();}
  }
  function replay(target,event){replayed.add(event);target.dispatchEvent(event);}
  function stop(e){e.preventDefault();e.stopImmediatePropagation();}
  window.addEventListener('click',e=>{
    if(updating||replayed.has(e)||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.altKey||e.shiftKey)return;
    const b=e.target.closest('button');if(!b||b.disabled)return;
    const theme=b.dataset.themeOption;
    const nav=b.hasAttribute('data-page')||b.hasAttribute('data-role-choice')||
      b.dataset.roleAction==='driver-tab'||b.dataset.gov==='system-page'||
      ['admin-page','tickets','leave-tickets','new-report'].includes(b.dataset.workflowAction)||
      ['go-orders','go-orders-pending','go-gps','go-fleet','go-reports','dispatch-order'].includes(b.dataset.action);
    if(!theme&&!nav)return;
    // Re-selecting an active item should not flash the screen.
    if(theme&&theme===document.documentElement.dataset.theme||nav&&(b.getAttribute('aria-current')==='page'||b.getAttribute('aria-checked')==='true'))return;
    stop(e);
    const attr=['data-page','data-role-choice','data-role-action','data-workflow-action','data-gov','data-action'].find(a=>b.hasAttribute(a));
    const selector=attr?`[${attr}="${CSS.escape(b.getAttribute(attr))}"]${b.hasAttribute('data-id')?`[data-id="${CSS.escape(b.dataset.id)}"]`:''}`:'';
    transition(()=>{const target=b.isConnected?b:selector&&document.querySelector(selector);if(target)replay(target,new MouseEvent('click',{bubbles:true,cancelable:true,view:window,button:0,clientX:e.clientX,clientY:e.clientY}));},theme?'theme':'page');
  },true);
  window.addEventListener('change',e=>{
    if(updating||replayed.has(e)||e.target.id!=='theme-select')return;
    if(e.target.value===document.documentElement.dataset.theme)return;
    const target=e.target,value=target.value;stop(e);
    transition(()=>{target.value=value;replay(target,new Event('change',{bubbles:true}));},'theme');
  },true);
  window.addEventListener('popstate',e=>{
    if(updating||replayed.has(e))return;
    e.stopImmediatePropagation();
    const theme=new URLSearchParams(location.search).get('theme');
    transition(()=>replay(window,new PopStateEvent('popstate',{state:e.state})),theme&&theme!==document.documentElement.dataset.theme?'theme':'page');
  },true);
  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=document.querySelector('#modal'),content=document.querySelector('#modal-content');
    if(!dialog||!content)return;
    new MutationObserver(()=>{
      if(!dialog.open||reduced.matches)return;
      content.getAnimations().forEach(a=>a.cancel());
      content.animate?.([{opacity:.85,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,easing:'cubic-bezier(.22,1,.36,1)'});
    }).observe(content,{childList:true});
  });
  reduced.addEventListener('change',()=>{if(reduced.matches){active?.skipTransition();pageAnimation?.cancel();}});
})();
