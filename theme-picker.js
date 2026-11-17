/* Mobile theme menu: uses the existing theme-select change flow and motion. */
(() => {
  document.addEventListener('DOMContentLoaded',()=>{
    const select=document.querySelector('#theme-select');
    if(!select)return;
    const wrapper=select.closest('.theme-select');
    const button=document.createElement('button');
    button.type='button';button.id='theme-picker';
    button.setAttribute('aria-haspopup','menu');button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-controls','theme-menu');
    const label=document.createElement('span');button.append(label);
    const menu=document.createElement('div');menu.id='theme-menu';menu.hidden=true;
    menu.setAttribute('role','menu');menu.setAttribute('aria-label','Chọn nền giao diện');
    const options=[...select.options].map(option=>{
      const item=document.createElement('button');item.type='button';item.tabIndex=-1;
      item.dataset.themeChoice=option.value;item.setAttribute('role','menuitemradio');
      const swatch=document.createElement('span');swatch.className='theme-swatch';swatch.setAttribute('aria-hidden','true');
      const text=document.createElement('span');text.textContent=option.textContent;
      const mark=document.createElement('span');mark.className='theme-choice-mark';mark.textContent='✓';mark.setAttribute('aria-hidden','true');
      item.append(swatch,text,mark);menu.append(item);return {option,item};
    });
    wrapper.append(button,menu);wrapper.classList.add('theme-menu-ready');
    select.tabIndex=-1;select.setAttribute('aria-hidden','true');
    function close(focus=false){menu.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();}
    function sync(){
      const current=select.selectedOptions[0];label.textContent=current?.textContent||'Chọn nền';
      button.setAttribute('aria-label','Chọn nền: '+label.textContent);
      for(const {option,item} of options){item.hidden=option.disabled;item.disabled=option.disabled;item.setAttribute('aria-checked',String(option.value===select.value));}
    }
    function open(last=false){
      sync();document.querySelector('#role-menu')?.setAttribute('hidden','');
      document.querySelector('#role-preview')?.setAttribute('aria-expanded','false');
      menu.hidden=false;button.setAttribute('aria-expanded','true');
      const available=options.filter(({option})=>!option.disabled);
      (last?available.at(-1):available.find(({option})=>option.value===select.value)||available[0])?.item.focus();
    }
    button.addEventListener('click',()=>menu.hidden?open():close(true));
    button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();open(e.key==='ArrowUp');}if(e.key==='Escape')close();});
    menu.addEventListener('click',e=>{
      const item=e.target.closest('[data-theme-choice]');if(!item||item.disabled)return;
      close(true);select.value=item.dataset.themeChoice;
      select.dispatchEvent(new Event('change',{bubbles:true}));sync();
    });
    menu.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close(true);return;}
      if(e.key==='Tab'){close();return;}
      const available=options.filter(({option})=>!option.disabled).map(({item})=>item);
      const index=available.indexOf(document.activeElement);let next;
      if(e.key==='ArrowDown')next=(index+1)%available.length;
      if(e.key==='ArrowUp')next=(index-1+available.length)%available.length;
      if(e.key==='Home')next=0;if(e.key==='End')next=available.length-1;
      if(next!==undefined){e.preventDefault();available[next]?.focus();}
    });
    document.addEventListener('pointerdown',e=>{if(!wrapper.contains(e.target))close();});
    wrapper.addEventListener('focusout',e=>{if(!wrapper.contains(e.relatedTarget))close();});
    select.addEventListener('change',sync);
    window.addEventListener('fleet:role-render',()=>{close();sync();});
    const observer=new MutationObserver(sync);
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    observer.observe(select,{subtree:true,attributes:true,attributeFilter:['disabled']});
    matchMedia('(min-width:601px)').addEventListener('change',()=>close());
    sync();
  });
})();
