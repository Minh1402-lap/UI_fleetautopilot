/* Complete browser-local demo for the dispatch screen. No backend or real assignment. */
(() => {
  const $=selector=>document.querySelector(selector);
  const storageKey='fleet-autopilot-ui-demo-v1';
  const vehicles=[{plate:'51C-732.18',eta:18},{plate:'51D-110.46',eta:21},{plate:'51C-905.27',eta:24}];
  const trips=[
    {id:'ĐH-1044',material:'Đá 1×2',load:'25 tấn',from:'Mỏ Tân Hòa',to:'Công trình Q.2',plate:'51C-732.18',status:'Đang chạy',time:'10:24'},
    {id:'ĐH-1043',material:'Cát san lấp',load:'20 tấn',from:'Mỏ Long Phước',to:'Công trình Q.9',plate:'51D-110.46',status:'Hoàn thành',time:'09:57'},
    {id:'ĐH-1042',material:'Đất đắp',load:'30 tấn',from:'Mỏ Phước Bình',to:'Thủ Đức',plate:'51C-905.27',status:'Hoàn thành',time:'09:21'}
  ];
  const initial=()=>({selected:vehicles[0].plate,assigned:false,assignedAt:null});
  let state=initial();
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey));
    if(saved&&vehicles.some(v=>v.plate===saved.selected))state={selected:saved.selected,assigned:saved.assigned===true,assignedAt:typeof saved.assignedAt==='string'&&!Number.isNaN(Date.parse(saved.assignedAt))?saved.assignedAt:null};
  } catch {}
  const modal=$('#modal'),searchModal=$('#search-modal');
  const title=$('#modal-title'),copy=$('#modal-copy'),content=$('#modal-content'),confirm=$('#confirm-modal');
  const originalTimeline=$('#timeline').innerHTML;
  let onConfirm=null,zoom=1,query='',toastTimer;
  const normalize=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
  function save(){try{localStorage.setItem(storageKey,JSON.stringify(state));}catch{}}
  function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
  const statusTypes={'Đang chạy':'running','Hoàn thành':'completed','Đơn chờ':'pending','Đã phân công':'assigned'};
  function statusBadge(label){
    const key=statusTypes[label]||'neutral';
    const badge=node('span',undefined,'badge');badge.dataset.status=key;
    const dot=node('span',undefined,'status-dot');dot.setAttribute('aria-hidden','true');
    badge.append(dot,node('span',label));return badge;
  }
  function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>{$('#toast').hidden=true;},3500);}
  function openModal(name,text,extra=null,action=null){
    modal.classList.remove('assignment-review');
    $('#cancel-modal').textContent='Đóng';confirm.textContent='Xác nhận mô phỏng';
    title.textContent=name;copy.textContent=text;content.replaceChildren();if(extra)content.append(extra);
    onConfirm=action;confirm.hidden=!action;
    if(!modal.open)modal.showModal();
  }
  function closeModal(){modal.close();onConfirm=null;}
  $('#close-modal').addEventListener('click',closeModal);$('#cancel-modal').addEventListener('click',closeModal);
  confirm.addEventListener('click',()=>{const action=onConfirm;closeModal();if(action)action();});
  function closeOnBackdrop(dialog){dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});}
  closeOnBackdrop(modal);closeOnBackdrop(searchModal);
  const currentOrder=()=>({id:'ĐH-1045',material:'Cát xây dựng',load:'30 tấn',from:'Mỏ Tân Hòa',to:'Công trình Q.9',plate:state.selected,status:state.assigned?'Đã phân công':'Đơn chờ',time:state.assignedAt?new Date(state.assignedAt).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}):'—'});
  function detail(trip){
    const status=node('div',undefined,'trip-status');status.append(node('span','Trạng thái mẫu'),statusBadge(trip.status));
    openModal('Chi tiết '+trip.id,trip.material+' · '+trip.load+'\n'+trip.from+' → '+trip.to+'\nXe: '+trip.plate+'\n\nThông tin dùng để xem thử giao diện.',status);
  }
  function list(items){
    const wrap=node('div',undefined,'dialog-list');
    items.forEach(trip=>{const button=node('button',undefined,'dialog-row');const left=node('span');left.append(node('strong',trip.id+' · '+trip.material),node('small',trip.from+' → '+trip.to));button.append(left,statusBadge(trip.status));button.addEventListener('click',()=>{if(searchModal.open)searchModal.close();detail(trip);});wrap.append(button);});
    return wrap;
  }
  function render(){
    document.querySelectorAll('[data-vehicle]').forEach(button=>{const selected=button.dataset.vehicle===state.selected;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));button.disabled=state.assigned;});
    $('#assign').replaceChildren(document.createTextNode(state.assigned?'Xem phân công':'Duyệt phân công'),node('span','→'));
    $('#suggest').disabled=state.assigned;
    $('#dispatch-note').textContent=state.assigned?'Đã mô phỏng phân công '+state.selected+' · Dữ liệu lưu trên trình duyệt này.':'Đang chọn xe '+state.selected+' · Chưa phân công.';
    const counts={'Đơn chờ':state.assigned?11:12,'Chuyến đang chạy':28,'Xe sẵn sàng':state.assigned?15:16,'Cần xử lý':3};
    document.querySelectorAll('[data-summary]').forEach(button=>{button.querySelector('strong').textContent=counts[button.dataset.summary];});
    $('#timeline').innerHTML=originalTimeline;
    if(state.assigned){const li=node('li');const box=node('div');box.append(node('strong','Mô phỏng phân công xe '+state.selected),node('p','Đơn ĐH-1045 · Cát xây dựng (30 tấn)'));li.append(box,node('time',currentOrder().time));$('#timeline').prepend(li);}
  }
  document.querySelectorAll('[data-vehicle]').forEach(button=>button.addEventListener('click',()=>{if(state.assigned)return;state.selected=button.dataset.vehicle;save();render();}));
  $('#assign').addEventListener('click',()=>{
    if(state.assigned){detail(currentOrder());return;}
    const review=$('#assignment-review-template').content.cloneNode(true);
    review.querySelector('[data-review-plate]').textContent=state.selected;
    openModal('Duyệt phân công','Kiểm tra đơn hàng và xe trước khi xác nhận.',review,()=>{
      state.assigned=true;state.assignedAt=new Date().toISOString();save();render();toast('Đã lưu phân công mẫu trên trình duyệt.');
    });
    modal.classList.add('assignment-review');$('#cancel-modal').textContent='Quay lại';confirm.append(node('span','→'));
  });
  $('#suggest').addEventListener('click',()=>{state.selected=vehicles[0].plate;save();render();$('#dispatch-note').textContent='Đang hiển thị 3 phương án mẫu, xếp theo thời gian đến điểm lấy để minh họa.';});
  function filtered(){const term=normalize(query.trim());return trips.filter(trip=>normalize(Object.values(trip).join(' ')).includes(term));}
  function filter(value){
    query=value;$('#search').value=value;$('#mobile-search-input').value=value;
    const ids=new Set(filtered().map(t=>t.id));document.querySelectorAll('[data-search]').forEach(row=>{row.hidden=!ids.has(row.querySelector('[data-trip]').dataset.trip);});
    $('#no-results').hidden=ids.size>0;
    const results=$('#search-results');results.replaceChildren();if(ids.size)results.append(list(filtered()));else results.append(node('p','Không tìm thấy chuyến phù hợp.','empty'));
  }
  $('#search').addEventListener('input',event=>filter(event.target.value));
  $('#mobile-search-input').addEventListener('input',event=>filter(event.target.value));
  function openSearch(){filter(query);searchModal.showModal();$('#mobile-search-input').focus();}
  $('#open-search').addEventListener('click',openSearch);$('#close-search').addEventListener('click',()=>searchModal.close());
  document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)&&!modal.open&&!searchModal.open){event.preventDefault();if($('#search').getClientRects().length)$('#search').focus();else openSearch();}});
  document.querySelectorAll('[data-trip]').forEach(button=>button.addEventListener('click',()=>detail(trips.find(t=>t.id===button.dataset.trip))));
  $('#all-trips').addEventListener('click',()=>openModal('Chuyến gần đây','Các chuyến minh họa trong bản UI này.',list(state.assigned?[currentOrder(),...trips]:trips)));
  document.querySelectorAll('[data-summary]').forEach(button=>button.addEventListener('click',()=>{
    const name=button.dataset.summary;
    if(name==='Đơn chờ')openModal(name,state.assigned?'Đơn minh họa ĐH-1045 đã được phân công trong bản thử.':'ĐH-1045 · Cát xây dựng (30 tấn)\nMỏ Tân Hòa → Công trình Q.9\n\nSố tổng đang hiển thị là dữ liệu mẫu.');
    else if(name==='Xe sẵn sàng')openModal(name,'Các xe đề xuất trong bản thử:\n'+vehicles.map(v=>v.plate+' · ≈ '+v.eta+' phút').join('\n')+'\n\nChưa kiểm tra lịch xe hoặc tải trọng thực tế.');
    else if(name==='Chuyến đang chạy')openModal(name,'Một chuyến đang chạy minh họa.',list(trips.filter(t=>t.status==='Đang chạy')));
    else openModal(name,'Có 3 mục cần xử lý trong số liệu mẫu. Bản thử hiện tập trung vào thao tác phân xe.');
  }));
  $('#notifications').addEventListener('click',()=>openModal('Hoạt động gần đây',state.assigned?'Đã mô phỏng phân công '+state.selected+' cho đơn ĐH-1045.':'Đã hiển thị 3 phương án xe mẫu cho đơn ĐH-1045.'));
  function reset(){state=initial();save();filter('');render();zoom=1;updateZoom();toast('Đã khôi phục dữ liệu mẫu.');}
  $('#reset-demo').addEventListener('click',reset);
  $('#account').addEventListener('click',()=>{const button=node('button','Khôi phục dữ liệu mẫu','dialog-row');button.addEventListener('click',()=>{closeModal();reset();});openModal('Điều phối viên','Không gian UI thử nghiệm\nDữ liệu mẫu được lưu riêng trên trình duyệt này.',button);});
  function updateZoom(){$('.map-art').style.transform='scale('+zoom+')';$('#map-out').disabled=zoom<=1;$('#map-in').disabled=zoom>=1.6;$('#map-in').setAttribute('aria-label','Phóng to sơ đồ, hiện '+Math.round(zoom*100)+'%');$('#map-out').setAttribute('aria-label','Thu nhỏ sơ đồ, hiện '+Math.round(zoom*100)+'%');}
  $('#map-in').addEventListener('click',()=>{zoom=Math.min(1.6,+(zoom+.2).toFixed(1));updateZoom();});$('#map-out').addEventListener('click',()=>{zoom=Math.max(1,+(zoom-.2).toFixed(1));updateZoom();});
  const table=$('.table-wrap'),hint=node('p','Cuộn ngang để xem thêm →','table-hint');hint.hidden=true;table.insertAdjacentElement('afterend',hint);const updateHint=()=>{hint.hidden=table.scrollWidth<=table.clientWidth+1;};new ResizeObserver(updateHint).observe(table);
  document.querySelectorAll('.trips [data-trip]').forEach(button=>{
    const trip=trips.find(t=>t.id===button.dataset.trip),row=button.closest('tr');
    row.dataset.status=statusTypes[trip.status];row.cells[3].replaceChildren(statusBadge(trip.status));
  });
  filter('');render();updateZoom();updateHint();
})();
