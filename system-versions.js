/* View preferences only. Neither choice changes roles, business data or commands. */
(() => {
  'use strict';
  const key='fleet-system-view-v1',versions=['standard','terminal'],styles=['kali','hacker'];
  let saved={};try{saved=JSON.parse(localStorage.getItem(key))||{};}catch{}
  let current={version:versions.includes(saved.version)?saved.version:'standard',style:styles.includes(saved.style)?saved.style:'kali'};
  const initial={...current};
  function readURL(){
    const q=new URLSearchParams(location.search);
    current.version=versions.includes(q.get('system_version'))?q.get('system_version'):initial.version;
    current.style=styles.includes(q.get('terminal_style'))?q.get('terminal_style'):initial.style;
  }
  readURL();
  const box=document.createElement('div');box.className='system-view-picker';
  box.innerHTML='<label>Phiên bản <select id="system-version" aria-label="Phiên bản System Admin"><option value="standard">Chuẩn</option><option value="terminal">Terminal</option></select></label><label id="terminal-style-label">Kiểu Terminal <select id="terminal-style" aria-label="Kiểu Terminal"><option value="kali">Kali</option><option value="hacker">Hacker xanh</option></select></label>';
  document.querySelector('.header-actions').append(box);
  const version=box.querySelector('#system-version'),style=box.querySelector('#terminal-style'),styleLabel=box.querySelector('#terminal-style-label');
  function sync(){
    const active=window.FleetRoles.role()==='admin_system';box.hidden=!active;
    document.body.dataset.systemVersion=current.version;document.body.dataset.terminalStyle=current.style;
    version.value=current.version;style.value=current.style;styleLabel.hidden=current.version!=='terminal';
  }
  function choose(){
    if(window.FleetRoles.role()!=='admin_system')return;
    if(!versions.includes(version.value)||!styles.includes(style.value))return;
    current={version:version.value,style:style.value};
    const url=new URL(location.href);url.searchParams.set('system_version',current.version);url.searchParams.set('terminal_style',current.style);
    history.pushState(null,'',url);
    try{localStorage.setItem(key,JSON.stringify(current));}catch{}
    sync(); // CSS changes in place: preserve command drafts, output, filters and open dialogs.
  }
  version.addEventListener('change',choose);style.addEventListener('change',choose);
  window.addEventListener('popstate',()=>{readURL();sync();});
  window.addEventListener('fleet:role-render',sync);
  sync();
})();
