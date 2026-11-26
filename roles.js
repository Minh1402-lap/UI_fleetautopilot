/* Four-role UI preview. Browser-local sample actions, not authentication. */
(() => {
  'use strict';
  const api=window.FleetPreview,$=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=n=>`<svg aria-hidden="true"><use href="#${n}"/></svg>`,key='fleet-autopilot-roles-v2';
  const names={dispatch:'Điều phối',admin:'Quản lý vận hành',admin_system:'Quản trị hệ thống',driver:'Tài xế'};
  // URL dùng system_admin cho dễ đọc; mã vai trò nội bộ cũ được giữ để không làm sai các kiểm tra quyền hiện hành.
  const internalRole=value=>value==='system_admin'?'admin_system':value;
  const publicRole=value=>value==='admin_system'?'system_admin':value;
  let activeDriverId=new URLSearchParams(location.search).get('driver')||'';
  // Lọc chuyến theo đúng tài xế đang xem và ưu tiên chuyến mới chờ nhận (assigned) để không bị chuyến khác che khuất
  function driverTrip(targetId=activeDriverId){
    const s=api.snapshot();
    const valid=targetId&&s.drivers.some(d=>d.id===targetId);
    const resolvedId=valid?targetId:(s.vehicles.find(v=>v.plate===s.orders.find(o=>o.status==='assigned')?.plate)?.driverId||s.vehicles.find(v=>v.plate===s.orders.find(o=>o.status==='running')?.plate)?.driverId||s.drivers[0]?.id||'');
    if(!valid&&resolvedId)activeDriverId=resolvedId;
    const myPlates=new Set(s.vehicles.filter(v=>v.driverId===resolvedId).map(v=>v.plate));
    const myOrders=s.orders.filter(o=>myPlates.has(o.plate));
    return myOrders.find(o=>o.status==='assigned')||myOrders.find(o=>o.status==='running')||null;
  }
  const initial=()=>({
    version:2,
    users:[
      {id:'U1',name:'Nguyễn Văn Minh',username:'minh.nv',role:'driver',authMethod:'Mật khẩu',mustChangePassword:false,active:true},
      {id:'U2',name:'Trần Minh An',username:'an.tm',role:'admin',authMethod:'Passkey',mustChangePassword:false,active:true},
      {id:'U3',name:'Lê Hoàng Nam',username:'nam.lh',role:'dispatch',authMethod:'Mật khẩu',mustChangePassword:false,active:true},
      {id:'U4',name:'Phạm Huy Hoàng',username:'hoang.ph',role:'admin_system',authMethod:'Passkey',mustChangePassword:false,active:true},
      {id:'U5',name:'Tài xế Bình (mẫu)',username:'binh.tx',role:'driver',authMethod:'Mật khẩu',mustChangePassword:true,active:true},
    ],
    requests:[{id:'YC-012',text:'Kiểm tra tín hiệu GPS 51C-481.66 (chu kỳ 10 phút)',by:'Trần Minh An',status:'Chờ xử lý'}],
    // Mọi thao tác phân công và duyệt hoàn thành trong nhật ký đều thuộc Điều phối (Lê Hoàng Nam), không thuộc Admin
    audit:[
      {id:'A1',at:'2026-11-16T03:26:00Z',actor:'Lê Hoàng Nam',action:'Duyệt phân công (V1)',order:'ĐH-1047',plate:'51D-110.46',driver:'Tài xế Bình (mẫu)',result:'Chờ tài xế xác nhận',before:'Chờ phân xe',after:'51D-110.46',request:''},
      {id:'A2',at:'2026-11-16T03:12:00Z',actor:'Lê Hoàng Nam',action:'Điều chỉnh xe',order:'ĐH-1044',plate:'51C-481.66',driver:'Tài xế Dũng (mẫu)',result:'Đã cập nhật',before:'51D-110.46',after:'51C-481.66',request:''},
      {id:'A3',at:'2026-11-16T02:57:00Z',actor:'Lê Hoàng Nam',action:'Duyệt hoàn thành & xác nhận xe sẵn sàng',order:'ĐH-1043',plate:'51D-218.09',driver:'Tài xế Giang (mẫu)',result:'Hoàn thành',before:'Chờ duyệt hoàn thành',after:'Hoàn thành · Xe sẵn sàng',request:''},
    ],
    system:[
      {id:'S1',at:'2026-11-16T03:12:00Z',actor:'Phạm Huy Hoàng',action:'Cập nhật vai trò thường',before:'Tài xế',after:'Điều phối',request:'U1'},
      {id:'S2',at:'2026-11-16T02:45:00Z',actor:'Phạm Huy Hoàng',action:'Kiểm tra kết nối GPS Taris',before:'51C-481.66',after:'Trạng thái mẫu: stale (không mở vị trí)',request:'BT-001'},
    ],
    incidents:[],
    // Dữ liệu bằng chứng 2 đầu mẫu (đầu nhận + đầu giao) kèm GPS điện thoại cho ĐH-1044
    evidence:[
      {id:'E-DEL-1044',order:'ĐH-1044',kind:'delivery',filename:'anh-dau-giao-DH1044.jpg',gps:{lat:10.788412,lon:106.752104,at:'2026-11-16T03:24:00Z',simulated:true},at:'2026-11-16T03:24:00Z'},
      {id:'E-PK-1044',order:'ĐH-1044',kind:'pickup',filename:'anh-dau-nhan-DH1044.jpg',gps:{lat:10.841205,lon:106.824510,at:'2026-11-16T02:35:00Z',simulated:true},at:'2026-11-16T02:35:00Z'},
    ],
  });
  let data=initial();
  try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===2&&['users','requests','audit','system','incidents','evidence'].every(k=>Array.isArray(s[k])))data=s;}catch{}
  let role='dispatch',tab='',query='',auditDay='',selected=data.audit[0]?.id,sysSelected=data.system[0]?.id,zoom=1,photo=null,photoUrl='',gps=null,captureKind='';
  const originalNav=$('.sidebar nav'),roleNav=document.createElement('nav');roleNav.className='role-nav';roleNav.setAttribute('aria-label','Điều hướng vai trò');originalNav.after(roleNav);
  const root=document.createElement('section');root.id='role-view';root.hidden=true;$('#main').insertBefore(root,$('#main footer'));
  const picker=document.createElement('div');picker.className='role-selector';picker.innerHTML=`<span>Vai trò mẫu</span><button type="button" id="role-preview" aria-label="Chuyển vai trò xem thử" aria-haspopup="menu" aria-expanded="false" aria-controls="role-menu"><span id="role-preview-label"></span><span aria-hidden="true">⌄</span></button><div id="role-menu" role="menu" aria-label="Chọn vai trò mẫu" hidden>${Object.entries(names).map(([k,v])=>`<button type="button" role="menuitemradio" aria-checked="false" data-role-choice="${k}"><span>${v}</span><span class="role-check" aria-hidden="true">✓</span></button>`).join('')}</div>`;$('.header-actions').append(picker);
  const driverBrand=document.createElement('div');driverBrand.className='driver-brand';driverBrand.textContent='F  Fleet Autopilot';$('header').prepend(driverBrand);
  const now=()=>new Date().toISOString(),id=p=>p+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,6);
  const tm=v=>new Date(v).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
  const dt=v=>new Date(v).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok'});
  const day=v=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
  function save(){try{localStorage.setItem(key,JSON.stringify(data));return true;}catch{api.toast('Không lưu được dữ liệu mẫu. Thay đổi chỉ còn trong phiên này.');return false;}}
  const btn=(text,action,value='',cls='secondary')=>`<button type="button" class="${cls}" data-role-action="${action}" data-id="${esc(value)}">${text}</button>`;
  const status=(text,type='completed')=>`<span class="badge" data-status="${type}"><span class="status-dot" aria-hidden="true"></span>${esc(text)}</span>`;
  const heading=(title,sub,ico='chart')=>`<section class="page-heading"><span class="heading-icon">${icon(ico)}</span><h1>${title}</h1><p>${sub}</p></section>`;
  const panel=(title,content,ico='layers')=>`<section class="panel"><div class="panel-heading"><h2>${icon(ico)}${title}</h2></div>${content}</section>`;
  const details=rows=>`<dl class="role-details">${rows.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v||'—')}</dd></div>`).join('')}</dl>`;
  const table=(headers,rows)=>`<div class="table-wrap" tabindex="0" role="region" aria-label="Bảng dữ liệu có thể cuộn ngang"><table class="role-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${headers.length}">Không có dữ liệu phù hợp.</td></tr>`}</tbody></table></div>`;
  const stats=items=>`<section class="stats workspace-stats" aria-label="Tổng quan">${items.map(([text,count,ico])=>`<div class="stat"><span class="stat-icon">${icon(ico)}</span><span>${text}<strong>${count}</strong></span></div>`).join('')}</section>`;
  function addLog(action,before='',after='',request=''){data.system.unshift({id:id('S'),at:now(),actor:'Phạm Huy Hoàng',action,before,after,request});data.system=data.system.slice(0,100);sysSelected=data.system[0].id;save();}
  function modal(title,html,submit){const box=document.createElement('div');box.innerHTML=html;api.openModal(title,'Bản thử · Chỉ lưu dữ liệu trong trình duyệt.',box);const form=box.querySelector('form');if(form)form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;const result=submit(new FormData(form));if(result===false)return;$('#modal').close();render();};}
  const input=(label,name,value='',type='text')=>`<label>${label}<input type="${type}" name="${name}" value="${esc(value)}" required maxlength="150"></label>`;
  function admin(){
    const s=api.snapshot(),list=data.audit.filter(a=>(!auditDay||day(a.at)===auditDay)&&Object.values(a).join(' ').toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))),a=list.find(a=>a.id===selected)||list[0];
    const toolbar=`<div class="role-toolbar"><input id="audit-query" type="search" aria-label="Tìm nhật ký phê duyệt" placeholder="Tìm đơn, người duyệt..." value="${esc(query)}"><label>Ngày <input id="audit-day" type="date" value="${esc(auditDay)}"></label></div>`;
    const rows=list.map(x=>`<tr aria-selected="${x.id===a?.id}"><td>${btn(tm(x.at),'audit-select',x.id,'text-button')}<br><small>${dt(x.at)}</small></td><td>${esc(x.actor)}</td><td>${esc(x.action)}</td><td><strong class="order-code">${esc(x.order)}</strong></td><td>${status(x.result)}</td></tr>`).join('');
    root.innerHTML=heading('Giám sát vận hành','Theo dõi vận chuyển và lịch sử phê duyệt.')+stats([['Đơn mẫu',s.orders.length,'order'],['Chuyến đang chạy',s.orders.filter(o=>o.status==='running').length,'truck'],['Đã hoàn thành',s.orders.filter(o=>o.status==='completed').length,'truck'],['Cần xử lý',s.orders.filter(o=>o.status==='pending').length+data.incidents.length,'alert']])+`<div class="role-grid">`+panel('Nhật ký phê duyệt',toolbar+table(['Thời gian','Người duyệt','Thao tác','Đơn hàng','Kết quả'],rows),'order')+panel('Chi tiết phê duyệt',a?details([['Đơn hàng',a.order],['Người duyệt',a.actor],['Thời gian',tm(a.at)+' · '+dt(a.at)],['Xe',a.plate],['Tài xế',a.driver],['Nội dung',a.action],['Trước',a.before],['Sau',a.after]])+btn('Xem lịch sử','audit-history',a.order,'primary'):'<p class="empty">Chọn một nhật ký để xem.</p>','order')+panel('Tình hình vận chuyển',table(['Đơn hàng','Tuyến','Trạng thái'],s.orders.map(o=>`<tr><td><strong class="order-code">${esc(o.id)}</strong></td><td>${esc(o.from)} → ${esc(o.to)}</td><td>${status(({pending:'Chờ phân xe',assigned:'Đã phân công',running:'Đang chạy',completed:'Hoàn thành',cancelled:'Đã hủy'})[o.status],o.status)}</td></tr>`).join('')),'truck')+panel('Yêu cầu bảo trì',requests()+btn('Tạo yêu cầu','request-new','','primary'),'gear')+`</div>`;
  }
  function requests(){
    const govList=window.FleetGovernance?.snapshot?.().maintenance;
    if(Array.isArray(govList)){
      return govList.map(r=>`<div class="role-row"><div><strong>${esc(r.id)} · ${esc(r.target||'')} · ${esc(r.text)}</strong><small>${esc(r.requestedBy||r.by||'—')} · Gửi đến System Admin</small>${status(r.status==='done'?'Hoàn thành':r.status==='escalated'?'Đã chuyển dev':'Chờ xử lý',r.status==='done'?'completed':'pending')}</div></div>`).join('')||'<p class="empty">Chưa có yêu cầu.</p>';
    }
    return data.requests.map(r=>`<div class="role-row"><div><strong>${esc(r.id)} · ${esc(r.text)}</strong><small>${esc(r.by)} · Gửi đến System Admin</small>${status(r.status,r.status==='Hoàn thành'?'completed':'pending')}</div>${role==='admin_system'?btn('Xử lý yêu cầu','request-process',r.id):''}</div>`).join('')||'<p class="empty">Chưa có yêu cầu.</p>';
  }
  function system(){const active=data.users.filter(u=>!u.deleted),log=data.system.find(x=>x.id===sysSelected)||data.system[0];
    const users=active.filter(u=>(u.name+' '+names[u.role]).toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi'))).map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(names[u.role])}</td><td>${status(u.active?'Hoạt động':'Vô hiệu hóa',u.active?'completed':'pending')}</td><td>${btn('Sửa','user-edit',u.id,'text-button')} ${btn(u.active?'Vô hiệu hóa':'Kích hoạt','user-toggle',u.id,'text-button')} ${btn('Xóa mẫu','user-delete',u.id,'text-button')}</td></tr>`).join('');
    const userContent=`<div class="role-toolbar"><input id="users-query" type="search" aria-label="Tìm tài khoản" placeholder="Tìm theo họ tên, vai trò..." value="${esc(query)}">${btn('Quản lý vai trò','roles-info')}${btn('Thêm tài khoản','user-new','','primary')}</div>`+table(['Họ tên','Vai trò','Trạng thái','Thao tác'],users);
    const logs=table(['Thời gian','Người thực hiện','Thao tác'],data.system.map(l=>`<tr aria-selected="${l.id===log?.id}"><td>${btn(tm(l.at),'system-select',l.id,'text-button')}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}</td></tr>`).join(''));
    root.innerHTML=heading('Quản trị hệ thống','Quản lý tài khoản, vai trò và yêu cầu bảo trì.','gear')+stats([['Tài khoản',active.length,'order'],['Vai trò',4,'layers'],['Yêu cầu bảo trì',data.requests.filter(r=>r.status!=='Hoàn thành').length,'gear'],['Thao tác mẫu',data.system.length,'activity']])+`<div class="role-grid">`+panel('Tài khoản & vai trò',userContent)+panel('Yêu cầu từ Admin',requests(),'order')+panel('Nhật ký hệ thống',logs,'activity')+panel('Chi tiết thay đổi',log?details([['Người thực hiện',log.actor],['Thời gian',tm(log.at)+' · '+dt(log.at)],['Mã yêu cầu',log.request],['Trước',log.before],['Sau',log.after]]):'<p class="empty">Chưa có thay đổi.</p>','order')+`<div class="role-wide">`+panel('Dữ liệu đã xóa',data.users.filter(u=>u.deleted).map(u=>`<div class="role-row"><span>${esc(u.name)} · ${esc(names[u.role])}</span>${btn('Khôi phục','user-restore',u.id)}</div>`).join('')||'<p class="role-hint">Chưa có tài khoản bị xóa mềm. Nhật ký được giữ để truy vết.</p>','order')+`</div></div>`;
  }
  function routeMap(o){const source=$('#dispatch-view .map-art').cloneNode(true);source.removeAttribute('aria-label');source.querySelectorAll('text')[0].textContent=o.from;source.querySelectorAll('text')[1].textContent=o.to;const paths=[...source.querySelectorAll('path')];paths.find(p=>p.getAttribute('stroke-linecap')==='round')?.classList.add('driver-route');source.insertAdjacentHTML('beforeend','<path class="driver-location" d="m290 130 14 25-14-5-14 5Z" stroke-width="2"/><text x="300" y="114" text-anchor="middle" fill="currentColor" font-size="13">Vị trí xe mẫu</text>');source.style.transform=`scale(${zoom})`;return `<div class="map driver-map">${source.outerHTML}<div class="map-tools">${btn('+','map-in','','icon-button')}${btn('−','map-out','','icon-button')}</div><span class="map-caption">Tuyến minh họa · Chưa kết nối bản đồ / GPS</span></div>`;}
  function driver(){const s=api.snapshot(),o=driverTrip(),curDrv=s.drivers.find(d=>d.id===activeDriverId)||s.drivers.find(d=>d.id===s.vehicles.find(v=>v.plate===o?.plate)?.driverId),curVeh=s.vehicles.find(v=>v.plate===o?.plate)||s.vehicles.find(v=>v.driverId===curDrv?.id);
    const drvSelect=s.drivers.length>1?` <select id="driver-switcher" aria-label="Chọn tài xế đang xem" style="margin-left:auto;max-width:190px;padding:4px 8px;border-radius:8px;border:1px solid var(--line);background:var(--nested);color:inherit;font:inherit;font-size:12px">${s.drivers.map(d=>{const v=s.vehicles.find(x=>x.driverId===d.id);return `<option value="${esc(d.id)}" ${d.id===curDrv?.id?'selected':''}>${esc(d.name)}${v?' · '+esc(v.plate):''}</option>`;}).join('')}</select>`:'';
    const nav=`<nav class="driver-tabs" aria-label="Tài xế">${btn('Chuyến của tôi','driver-tab','trip')}${btn('Báo sự cố','driver-tab','incidents')}</nav>`;
    if(tab==='incidents'){root.innerHTML=`<div class="driver-layout">`+heading('Báo sự cố','Xe hoặc đường đi · Gửi thông tin cho Điều phối.','alert')+panel('Gửi báo cáo',`<form id="incident-form" class="role-form"><label>Loại sự cố<select name="kind"><option>Xe</option><option>Đường</option></select></label><label>Mô tả<textarea name="description" rows="3" required maxlength="500"></textarea></label><label>Ảnh đính kèm (không bắt buộc)<input name="photo" type="file" accept="image/*" capture="environment"></label><p class="role-hint">Bản thử chỉ lưu mô tả và tên ảnh trong trình duyệt, chưa gửi đến Điều phối.</p><button class="primary">Lưu báo cáo mẫu</button></form>`,'alert')+panel('Báo cáo đã lưu',data.incidents.map(i=>`<div class="role-row"><div><strong>${esc(i.kind)} · ${esc(i.description)}</strong><small>${tm(i.at)} · ${esc(i.order)} · ${esc(i.filename||'Không có ảnh')}</small>${status('Đã lưu mẫu','pending')}</div></div>`).join('')||'<p class="role-hint">Chưa có báo cáo.</p>')+nav+'</div>';}
    else if(tab==='capture'&&o){root.innerHTML=`<div class="driver-layout">`+heading('Xác nhận vị trí','Ảnh kèm tọa độ và thời gian.','pin')+panel('Ảnh xác nhận',`<form id="evidence-form" class="role-form">${photoUrl?`<img class="driver-photo" alt="Ảnh tài xế vừa chọn" src="${photoUrl}">`:''}<label>Chụp / chọn ảnh<input id="driver-photo" name="photo" type="file" accept="image/*" capture="environment" ${photo?'':'required'}></label>${gps?status('Đã có GPS mô phỏng'):btn('Mô phỏng bật GPS','gps-demo')}<p class="role-hint">Thử UI bằng GPS mẫu. Ảnh không được tải lên máy chủ.</p>${gps?details([['Tọa độ mẫu',gps.lat+', '+gps.lon],['Độ chính xác mẫu','±12 m'],['Thời gian vị trí',tm(gps.at)],['Ảnh đã chọn',photo?.name]]):''}<button class="primary" ${!photo||!gps?'disabled':''}>Lưu xác nhận mẫu</button></form>`,'pin')+nav+'</div>';}
    else root.innerHTML=`<div class="driver-layout">`+heading('Chuyến của tôi','Xem tuyến đường và xác nhận chuyến.','truck')+`<p class="driver-identity">${icon('truck')}${esc(curDrv?.name||'Tài xế mẫu')} · ${esc(curVeh?.plate||'Chưa có xe')}${drvSelect}</p>`+(o?panel('Chuyến hiện tại',`<div class="driver-order"><div><strong>${esc(o.id)}</strong><p>${esc(o.material)} · ${esc(api.qtyText ? api.qtyText(o) : o.quantity + ' ' + (o.unit || 'm³'))}</p></div>${status(o.status==='running'?'Đang thực hiện':'Chờ tài xế xác nhận','running')}</div>`,'truck')+panel('Tuyến đường',routeMap(o)+`<p class="driver-identity">${icon('pin')}${esc(o.to)}</p><div class="driver-actions">${['picked_up','needs_more'].includes(window.FleetWorkflow?.stage?.(o)) ? btn(icon('order')+'Chụp ảnh giao hàng','driver-tab','capture','primary') : ''}<span class="role-hint">Ảnh kèm vị trí GPS điện thoại và thời gian</span>${btn(icon('alert')+'Báo sự cố','driver-tab','incidents')}</div>`,'pin')+`<p class="role-hint">${data.evidence.filter(e=>e.order===o.id).length} xác nhận mẫu đã lưu. Không hiển thị giá hàng hay tiền thu hộ.</p>`:panel('Chưa có chuyến','<p class="role-hint">Hiện không có chuyến đang chạy hoặc chờ xác nhận trong dữ liệu mẫu.</p>','truck'))+nav+'</div>';
    const layout=root.querySelector('.driver-layout');
    if(layout){layout.dataset.screen=tab==='incidents'?'incidents':tab==='capture'?'capture':'trip';const panels=layout.querySelectorAll(':scope > .panel');if(layout.dataset.screen==='trip'){panels[0]?.classList.add('driver-current-trip');panels[1]?.classList.add('driver-route-panel');}}
    root.querySelector(`[data-role-action="driver-tab"][data-id="${tab==='incidents'?'incidents':'trip'}"]`)?.setAttribute('aria-current','page');
  }
  function render(){
    const focus=root.contains(document.activeElement)?document.activeElement.id:null,pos=focus&&document.activeElement.selectionStart;
    document.body.dataset.role=role;document.body.classList.toggle('role-switch-active',role!=='dispatch');$('#role-preview-label').textContent=names[role];picker.querySelectorAll('[data-role-choice]').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.roleChoice===role)));root.hidden=role==='dispatch';
    if(role==='dispatch'){roleNav.innerHTML='';window.dispatchEvent(new Event('fleet:role-render'));return;}
    if(role==='driver'&&!['light','dark'].includes(document.documentElement.dataset.theme)){$('#theme-select').value='light';$('#theme-select').dispatchEvent(new Event('change',{bubbles:true}));}
    for(const option of $('#theme-select').options)option.disabled=role==='driver'&&!['light','dark'].includes(option.value);
    roleNav.innerHTML=(role==='admin'?[['chart','Giám sát vận hành'],['order','Nhật ký phê duyệt'],['gear','Yêu cầu bảo trì']]:role==='admin_system'?[['layers','Tài khoản & vai trò'],['activity','Nhật ký hệ thống'],['gear','Yêu cầu bảo trì']]:[]).map(([ico,text],i)=>`<button class="${i===0?'active':''}" data-role-action="section" data-id="${i}" title="${text}">${icon(ico)}<span class="nav-label">${text}</span></button>`).join('');
    $('.crumb').innerHTML=`${icon('home')}<span>/</span>${role==='admin'?'GIÁM SÁT VẬN HÀNH':role==='driver'?'TÀI XẾ':'QUẢN TRỊ HỆ THỐNG'}`;document.title=names[role]+' - Fleet Autopilot · Bản thử';
    ({admin,admin_system:system,driver})[role]();
    if(focus){const el=document.getElementById(focus);el?.focus({preventScroll:true});if(el&&typeof pos==='number'&&el.type==='search')el.setSelectionRange(pos,pos);}
    window.dispatchEvent(new Event('fleet:role-render'));
  }
  function setRole(value,push=true){value=internalRole(value);if(!names[value])value='dispatch';role=value;tab='';query='';auditDay='';for(const o of $('#theme-select').options)o.disabled=false;const u=new URL(location.href);u.searchParams.set('role',publicRole(value));if(push)history.pushState(null,'',u);else if(new URLSearchParams(location.search).get('role')==='admin_system')history.replaceState(null,'',u);api.render();render();window.scrollTo(0,0);}
  function closeRoleMenu(focus=false){$('#role-menu').hidden=true;$('#role-preview').setAttribute('aria-expanded','false');if(focus)$('#role-preview').focus();}
  function openRoleMenu(){const menu=$('#role-menu');menu.hidden=false;$('#role-preview').setAttribute('aria-expanded','true');menu.querySelector('[aria-checked=true]')?.focus();}
  $('#role-preview').onclick=()=>$('#role-menu').hidden?openRoleMenu():closeRoleMenu(true);
  picker.addEventListener('click',e=>{const choice=e.target.closest('[data-role-choice]');if(choice){closeRoleMenu();setRole(choice.dataset.roleChoice);$('#role-preview').focus();}});
  document.addEventListener('click',e=>{if(!picker.contains(e.target))closeRoleMenu();});
  picker.addEventListener('keydown',e=>{const menu=$('#role-menu'),buttons=[...menu.querySelectorAll('[data-role-choice]')];if(e.key==='Escape'){e.preventDefault();closeRoleMenu(true);}else if(e.key==='Tab')closeRoleMenu();else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(menu.hidden){openRoleMenu();return;}const index=buttons.indexOf(document.activeElement),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(index+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();}});
  window.addEventListener('popstate',()=>setRole(new URLSearchParams(location.search).get('role')||'dispatch',false));
  window.addEventListener('fleet:render',()=>render());
  window.addEventListener('fleet:reset',()=>{data=initial();selected=data.audit[0]?.id;sysSelected=data.system[0]?.id;query='';auditDay='';tab='';if(photoUrl)URL.revokeObjectURL(photoUrl);photo=null;photoUrl='';gps=null;save();render();});
  window.addEventListener('fleet:commit',e=>{const latest=api.snapshot().activity[0];if(!latest)return;data.audit.unshift({id:id('A'),at:now(),actor:e.detail.actor,action:e.detail.text,order:(e.detail.text||'').match(/ĐH-\d+/)?.[0]||'',result:'Đã cập nhật',before:'',after:e.detail.detail});save();if(role!=='dispatch')render();});
  document.addEventListener('input',e=>{if(['audit-query','users-query'].includes(e.target.id)){query=e.target.value;render();}});
  document.addEventListener('change',e=>{if(e.target.id==='driver-switcher'){activeDriverId=e.target.value;tab='trip';render();return;}if(e.target.id==='audit-day'){auditDay=e.target.value;render();}if(e.target.id==='driver-photo'){const file=e.target.files[0];if(!file)return;if(!file.type.startsWith('image/')||file.size>10*1024*1024){api.toast('Chọn ảnh tối đa 10 MB.');return;}if(photoUrl)URL.revokeObjectURL(photoUrl);photo=file;photoUrl=URL.createObjectURL(file);render();}});
  document.addEventListener('submit',e=>{
    if(e.target.id==='incident-form'){e.preventDefault();const f=new FormData(e.target),description=String(f.get('description')).trim();if(!description)return;const o=driverTrip();data.incidents.unshift({id:id('I'),kind:f.get('kind'),description,filename:f.get('photo')?.name||'',order:o?.id||'',at:now()});save();render();api.toast('Đã lưu báo cáo mẫu trong trình duyệt.');}
    if(e.target.id==='evidence-form'){e.preventDefault();if(!photo||!gps||role!=='driver')return;const kind=captureKind;const o=driverTrip();if(!o||!['pickup','delivery'].includes(kind))return;data.evidence.unshift({id:id('E'),order:o.id,kind,filename:photo.name,gps:{...gps,simulated:true},at:now()});if(!save())return;window.dispatchEvent(new CustomEvent('fleet:evidence-saved',{detail:{order:o.id,kind}}));URL.revokeObjectURL(photoUrl);photo=null;photoUrl='';gps=null;captureKind='';tab='trip';render();api.toast('Đã lưu metadata mẫu; ảnh chưa gửi lên máy chủ.');}
  });
  document.addEventListener('click',e=>{const b=e.target.closest('[data-role-action]');if(!b)return;const action=b.dataset.roleAction,value=b.dataset.id,u=data.users.find(u=>u.id===value);
    if(action==='driver-tab'){if(value==='capture'){const o=driverTrip();const stage=o?window.FleetWorkflow?.stage?.(o):'';captureKind=stage==='accepted'?'pickup':['picked_up','needs_more'].includes(stage)?'delivery':'';if(!captureKind)return;}tab=value;render();}
    if(action==='audit-select'){selected=value;render();}
    if(action==='system-select'){sysSelected=value;render();}
    if(action==='map-in'||action==='map-out'){zoom=Math.max(1,Math.min(1.6,zoom+(action==='map-in'?.2:-.2)));render();}
    if(action==='gps-demo'){gps={lat:10.781234,lon:106.731567,at:now()};render();}
    if(action==='section'){const headings=[...root.querySelectorAll('.panel h2')];const target=role==='admin'?[2,0,3][+value]:[0,2,1][+value];headings[target]?.closest('.panel').scrollIntoView({behavior:'smooth',block:'start'});}
    if(action==='audit-history'){modal('Lịch sử '+value,data.audit.filter(a=>a.order===value).map(a=>`<div class="role-row">${esc(a.actor)} · ${esc(a.action)}<small>${tm(a.at)} · ${dt(a.at)}</small></div>`).join(''));}
    if(action==='roles-info'){modal('Bốn vai trò mẫu',details(Object.entries(names).map(([k,n])=>[n,({driver:'Chuyến, bản đồ, ảnh xác nhận, sự cố',dispatch:'Điều phối và theo dõi vận chuyển',admin:'Giám sát nghiệp vụ, lịch sử duyệt',admin_system:'Tài khoản, vai trò, yêu cầu bảo trì'})[k]]))+'<p class="role-hint">Đổi vai trò từng tài khoản bằng nút Sửa. Đây là bản thử giao diện, chưa thực thi phân quyền backend.</p>');}
    if(action==='request-new'){modal('Tạo yêu cầu bảo trì',`<form class="role-form">${input('Biển số / phần gặp lỗi','target','51C-481.66')}${input('Nội dung yêu cầu','text')}<button class="primary">Lưu yêu cầu mẫu</button></form>`,f=>{const text=String(f.get('text')).trim(),target=String(f.get('target')||'Hệ thống').trim();if(!text)return false;const gov=window.FleetGovernance?.snapshot?.();if(gov?.maintenance){const req={id:'BT-'+String(gov.maintenance.length+1).padStart(3,'0'),kind:'gps',target,text,requestedBy:'Trần Minh An',approvedBy:'Trần Minh An',at:now(),status:'approved',result:''};gov.maintenance.unshift(req);window.FleetGovernance.save?.();window.FleetGovernance.log?.('Yêu cầu hỗ trợ từ Admin','Mới',`${target} · ${text}`,req.id);}else{data.requests.unshift({id:id('YC'),text,by:'Trần Minh An',status:'Chờ xử lý'});save();}});}
    if(action==='request-process'){const r=data.requests.find(r=>r.id===value);if(r)modal('Xử lý '+r.id,`<form class="role-form">${details([['Nội dung',r.text],['Người yêu cầu',r.by]])}<label>Trạng thái<select name="status"><option>Đang xử lý</option><option>Hoàn thành</option></select></label>${input('Ghi chú xử lý','note')}<button class="primary">Lưu xử lý mẫu</button></form>`,f=>{const before=r.status;r.status=f.get('status');r.note=f.get('note');addLog('Xử lý yêu cầu',before,r.status+' · '+r.note,r.id);});}
    if(action==='user-new'||action==='user-edit'){modal(u?'Sửa tài khoản':'Thêm tài khoản',`<form class="role-form">${input('Họ tên','name',u?.name)}<label>Vai trò<select name="role">${Object.entries(names).map(([k,v])=>`<option value="${k}" ${u?.role===k?'selected':''}>${v}</option>`).join('')}</select></label>${input('Lý do thay đổi','reason')}<label>Yêu cầu Admin<select name="request"><option value="">Chưa liên kết (mẫu)</option>${data.requests.map(r=>`<option value="${esc(r.id)}">${esc(r.id)}</option>`).join('')}</select></label><button class="primary">Lưu tài khoản mẫu</button></form>`,f=>{const name=String(f.get('name')).trim(),reason=String(f.get('reason')).trim();if(!name||!reason)return false;const before=u?u.name+' · '+names[u.role]:'Chưa có tài khoản';if(u){u.name=name;u.role=f.get('role');}else data.users.push({id:id('U'),name,role:f.get('role'),active:true});addLog(u?'Sửa tài khoản / vai trò':'Thêm tài khoản',before,name+' · '+names[f.get('role')]+' · '+reason,f.get('request'));});}
    if(['user-toggle','user-delete','user-restore'].includes(action)&&u){modal('Xác nhận thay đổi tài khoản',`<form class="role-form">${details([['Tài khoản',u.name],['Thao tác',action==='user-delete'?'Xóa mềm':action==='user-restore'?'Khôi phục':u.active?'Vô hiệu hóa':'Kích hoạt']])}${input('Lý do','reason')}<button class="primary">Xác nhận mẫu</button></form>`,f=>{const reason=String(f.get('reason')).trim();if(!reason)return false;const before=u.deleted?'Đã xóa':u.active?'Hoạt động':'Vô hiệu hóa';if(action==='user-delete')u.deleted=true;else if(action==='user-restore')u.deleted=false;else u.active=!u.active;addLog(action==='user-delete'?'Xóa mềm tài khoản':action==='user-restore'?'Khôi phục tài khoản':'Đổi trạng thái tài khoản',before,u.name+' · '+reason);});}
  });
  window.addEventListener('storage',e=>{if(e.key===key){try{const s=JSON.parse(localStorage.getItem(key));if(s?.version===2&&['users','requests','audit','system','incidents','evidence'].every(k=>Array.isArray(s[k]))){data=s;render();}}catch{}}});
  function setActiveDriver(nextId) {
    if (role !== 'driver' || !api.snapshot().drivers.some((driver) => driver.id === nextId)) return;
    activeDriverId = nextId;
    const url = new URL(location.href);
    url.searchParams.set('driver', nextId);
    url.searchParams.delete('ticket');
    history.replaceState(null, '', url);
    tab = 'trip';
    render();
  }
  window.FleetRoles={snapshot:()=>data,role:()=>role,driverTrip,activeDriver:()=>activeDriverId,setActiveDriver,setRole,save,render,openCapture:(kind)=>{captureKind=kind;tab='capture';render();},openIncidents:()=>{tab='incidents';render();}};
  setRole(new URLSearchParams(location.search).get('role')||'dispatch',false);
})();
