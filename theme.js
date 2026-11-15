/* Four provisional themes. The choice is local to this UI preview. */
(() => {
  const key='fleet-autopilot-ui-theme-v1';
  const allowed=new Set(['light','dark','amber','moss']);
  const requested=new URLSearchParams(location.search).get('theme');
  let saved;
  try { saved=localStorage.getItem(key); } catch {}
  let current=allowed.has(requested)?requested:(allowed.has(saved)?saved:'light');
  function apply(theme,persist=false) {
    if(!allowed.has(theme))return;
    current=theme;
    document.documentElement.dataset.theme=theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',({light:'#d2dbe2',dark:'#080808',amber:'#080a0c',moss:'#13190d'})[theme]);
    document.querySelectorAll('[data-theme-option]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeOption===theme)));
    const selector=document.querySelector('#theme-select');if(selector)selector.value=theme;
    const brand=document.querySelector('.brand');
    if(brand){const link=new URL(location.href);link.searchParams.set('theme',theme);brand.href=link.href;}
    if(persist) {
      try {localStorage.setItem(key,theme);} catch {}
      const url=new URL(location.href);url.searchParams.set('theme',theme);history.replaceState(null,'',url);
    }
  }
  apply(current);
  window.addEventListener('popstate',()=>{
    const theme=new URLSearchParams(location.search).get('theme');
    if(allowed.has(theme))apply(theme,true);
  });
  document.addEventListener('DOMContentLoaded',()=>{
    apply(current);
    document.querySelectorAll('[data-theme-option]').forEach(button=>button.addEventListener('click',()=>apply(button.dataset.themeOption,true)));
    document.querySelector('#theme-select')?.addEventListener('change',event=>apply(event.target.value,true));
  });
})();
