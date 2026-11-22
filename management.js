/* Management preview: derives business metrics from shared orders; technical actions are samples only. */
(() => {
  'use strict';
  const api=window.FleetPreview, roles=window.FleetRoles, $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=n=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n);
  const labels={pending:'Chờ phân xe',assigned:'Đã phân công',running:'Đang chạy',completed:'Hoàn thành',cancelled:'Đã hủy'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const key='fleet-management-preview-v1';
  let sample={checks:{},flags:{ai:true,sheets:true},records:[]};
  try{const s=JSON.parse(localStorage.getItem(key));if(s&&s.checks&&s.flags&&Array.isArray(s.records))sample=s;}catch{}
  const note=t=>`<p class="workflow-note">${t}</p>`;
  const button=(text,action,id='')=>`<button class="secondary" type="button" data-management="${action}" data-id="${esc(id)}">${text}</button>`;
  const panel=(title,body)=>`<section class="panel management-panel"><div class="panel-heading"><h2>${title}</h2></div>${body}</section>`;
  const table=(heads,rows)=>`<div class="table-wrap" tabindex="0" role="region" aria-label="Bảng đối chiếu"><table class="role-table"><thead><tr>${heads.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows||`<tr><td colspan="${heads.length}">Không có dữ liệu trong phạm vi này.</td></tr>`}</tbody></table></div>`;
  const date=d=>d?d.split('-').reverse().join('/'):'Chưa có ngày';
  function orders(){const month=new URL(location.href).searchParams.get('report_month')||'all';return api.snapshot().orders.filter(o=>month==='all'||o.day.startsWith(month));}
  function rows(list){return list.map(o=>`<tr><td><strong class="order-code">${esc(o.id)}</strong></td><td>${esc(date(o.day))}</td><td>${esc(o.material)}<small>${esc(api.qtyText?api.qtyText(o):number(o.quantity)+' '+(o.unit||'m³'))}</small></td><td>${esc(o.customer)}</td><td>${esc(labels[o.status])}</td><td>${esc(o.plate||'Chưa phân xe')}</td></tr>`).join('');}
  function metric(label,value,unit,description,id){return `<button class="panel executive-metric" data-management="orders" data-id="${id}"><span>${label}</span><strong>${number(value)}<small>${unit}</small></strong><span>${description}</span><span class="metric-link">Xem đơn đối chiếu →</span></button>`;}
  function bar(label,count,total,id,status=''){const percentage=total?count/total*100:0;return `<button class="report-bar-row" data-management="orders" data-id="${esc(id)}"><span>${esc(label)}</span><span class="report-track"><span class="report-fill" data-bar data-status="${status}" style="width:${percentage}%"></span></span><strong>${number(count)} <small>đơn · ${number(percentage)}%</small></strong></button>`;}
  function overview(){
    const root=$('#role-view');if(roles.role()!=='admin'||root?.dataset.adminPage!=='overview')return;
    root.querySelector('.stats').hidden=true;root.querySelector('.role-grid').hidden=true;
    root.querySelector('h1').textContent='Tổng quan';
    root.querySelector('.page-heading p').textContent='Đơn hàng, tiến độ và khối lượng — dành cho người quản lý.';
    const list=orders(),total=list.length,done=list.filter(o=>o.status==='completed').length,pending=list.filter(o=>o.status==='pending').length,tonnes=list.filter(o=>o.status!=='cancelled').reduce((n,o)=>n+o.quantity,0);
    const selected=new URL(location.href).searchParams.get('report_month')||'all',months=[...new Set([...api.snapshot().orders.map(o=>o.day.slice(0,7)),...(/^\d{4}-\d{2}$/.test(selected)?[selected]:[])])].sort().reverse();
    const statuses=Object.entries(labels).map(([id,label])=>bar(label,list.filter(o=>o.status===id).length,total,id,id)).join('');
    const statusColors={pending:'var(--pending-fg)',assigned:'color-mix(in srgb,var(--running-fg) 60%,var(--surface))',running:'var(--running-fg)',completed:'var(--complete-fg)',cancelled:'var(--cancel-fg,var(--muted))'};
    let angle=0;
    const stops=Object.keys(labels).map(id=>{const start=angle;angle+=total?list.filter(o=>o.status===id).length/total*360:0;return `${statusColors[id]} ${start}deg ${angle}deg`;}).join(',');
    const statusRing=`<div class="status-visual"><button class="status-ring" data-management="orders" data-id="all" style="--segments:${total?'conic-gradient('+stops+')':'var(--line)'}" aria-label="Xem toàn bộ ${total} đơn theo trạng thái"><span><strong>${total}</strong><small>tổng đơn</small></span></button><div>${statuses}</div></div>`;
    const materials=[...new Set(list.map(o=>o.material))].map(m=>bar(m,list.filter(o=>o.material===m).length,total,'material:'+m)).join('');
    const days=[...new Set(list.map(o=>o.day))].sort();
    const chartMonths=new URL(location.href).searchParams.get('chart_months')==='6'?6:12;
    const lastDay=days.at(-1),lastMonth=lastDay?.slice(0,7);
    const chartDates=lastMonth?Array.from({length:chartMonths},(_,i)=>{const d=new Date(lastMonth+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()-chartMonths+1+i);return d.toISOString().slice(0,7);}):[];
    const peak=Math.max(1,...chartDates.map(m=>list.filter(o=>o.day.startsWith(m)).length));
    const dailyChart=`<div class="chart-range" role="group" aria-label="Số tháng trên biểu đồ">${[6,12].map(n=>`<button type="button" data-management="chart-range" data-id="${n}" aria-pressed="${n===chartMonths}">${n} tháng</button>`).join('')}</div><div class="daily-chart monthly-chart" role="group" aria-label="Số đơn theo tháng giao dự kiến; màu theo trạng thái"><div class="daily-axis"><span>${peak} đơn</span><span>${number(peak/2)}</span><span>0</span></div><div class="daily-columns">${chartDates.map(m=>{const group=list.filter(o=>o.day.startsWith(m));return `<button class="daily-column" data-management="orders" data-id="month:${m}" aria-label="Tháng ${m.slice(5)}/${m.slice(0,4)}: ${group.length} đơn"><strong>${group.length}</strong><span class="daily-stack" style="height:${group.length/peak*160}px">${Object.keys(labels).map(status=>{const n=group.filter(o=>o.status===status).length;return n?`<span data-bar data-status="${status}" title="${esc(labels[status])}: ${n} đơn" style="height:${n/group.length*100}%"></span>`:'';}).join('')}</span><small>T${Number(m.slice(5))}</small></button>`;}).join('')||'<p>Chưa có đơn trong phạm vi này.</p>'}</div></div><div class="chart-legend">${Object.entries(labels).map(([s,l])=>`<span><i data-status="${s}"></i>${l}</span>`).join('')}</div>`;
    const groupedMonths=[...new Set(list.map(o=>o.day.slice(0,7)))].sort();
    const daily=table(['Tháng giao dự kiến','Tổng đơn','Hoàn thành','Đang chạy','Chờ phân xe'],groupedMonths.map(m=>{const group=list.filter(o=>o.day.startsWith(m));return `<tr><td>${m.slice(5)}/${m.slice(0,4)}</td><td>${group.length}</td><td>${group.filter(o=>o.status==='completed').length}</td><td>${group.filter(o=>o.status==='running').length}</td><td>${group.filter(o=>o.status==='pending').length}</td></tr>`;}).join(''));
    const fleet=table(['Xe','Đơn gắn với xe','Đơn hoàn thành'],api.snapshot().vehicles.map(v=>`<tr><td>${esc(v.plate)}</td><td>${list.filter(o=>o.plate===v.plate).length}</td><td>${list.filter(o=>o.plate===v.plate&&o.status==='completed').length}</td></tr>`).join(''));
    root.insertAdjacentHTML('beforeend',`<div id="executive-dashboard"><div class="report-toolbar"><label>Phạm vi thống kê<select id="executive-month"><option value="all">Tất cả dữ liệu mẫu</option>${months.map(m=>`<option value="${m}" ${m===selected?'selected':''}>Tháng ${m.slice(5)}/${m.slice(0,4)}</option>`).join('')}</select></label>${button('Đổi cách bố trí','layout')}<span>Dữ liệu mẫu · ${total} đơn · Theo ngày giao dự kiến</span></div><div class="executive-summary">${note(total?`Có <strong>${pending} đơn chờ phân xe</strong>. <strong>${done}/${total} đơn đã hoàn thành</strong> (${number(done/total*100)}%). Xem trạng thái bên dưới để biết phần việc còn lại.`:'Chưa có đơn trong phạm vi đang chọn.')}</div><div class="executive-top"><section class="panel executive-balance"><span class="report-eyebrow">TỔNG QUAN ĐƠN HÀNG</span><span>Tổng đơn trong phạm vi</span><strong>${number(total)} <small>đơn</small></strong><p>Bao gồm tất cả trạng thái, kể cả đơn đã hủy.</p>${button('Xem toàn bộ đơn','orders','all')}<div class="balance-progress" role="img" aria-label="${done} trên ${total} đơn hoàn thành"><span style="width:${total?done/total*100:0}%"></span></div><span>${done}/${total} đơn hoàn thành · ${pending} đơn chờ phân xe</span></section><div class="executive-kpis">${metric('Đơn hoàn thành',done,'đơn','Đã có trạng thái hoàn thành.','completed')}${metric('Hoàn thành',total?done/total*100:0,'%','Đơn hoàn thành / tổng đơn trong phạm vi.','completed')}${metric('Đang chạy / Chờ TX',list.filter(o=>['running','assigned'].includes(o.status)).length,'đơn','Đơn đang thực hiện hoặc chờ tài xế xác nhận.','running')}${metric('Chờ phân xe',pending,'đơn','Chưa có xe được phân công.','pending')}</div>${panel('Đơn hàng theo tháng',dailyChart+note(lastMonth?`${chartMonths} tháng đến ${lastMonth.slice(5)}/${lastMonth.slice(0,4)}, theo phạm vi lọc. Tháng không có đơn hiển thị 0; bấm cột để đối chiếu.`:'Chưa có dữ liệu để vẽ biểu đồ.'))}</div><div class="executive-charts">${panel('Đơn hàng đang ở bước nào?',statusRing+note('Mỗi đơn thuộc một trạng thái. Tỷ trọng tính trên tổng đơn; bấm từng dòng để đối chiếu.'))}${panel('Khách đang đặt vật liệu gì?',materials+note('Thống kê theo số đơn, không cộng gộp viên/kg/m³ hay suy ra doanh thu.'))}${panel('Tiến độ theo tháng',daily+note('Gộp đơn theo tháng giao dự kiến trong phạm vi lọc; trạng thái hiện tại, chưa phải tỷ lệ giao đúng hạn.'))}${panel('Phân bố đơn theo xe',fleet+note('Đếm đơn có gắn biển số trong phạm vi lọc, không quy đổi thành số chuyến hay điểm công bằng.'))}</div>${panel('Danh sách đối chiếu',rows(list)?table(['Mã đơn','Ngày giao dự kiến','Vật liệu & đơn vị','Khách hàng','Trạng thái','Xe'],rows(list)):note('Chưa có dữ liệu.'))}${note('Chưa có đơn giá, chi phí, thời gian giao thực tế hoặc hệ số quy đổi để tính doanh thu, lợi nhuận và tỷ lệ đúng hạn.')}</div>`);
    $('#executive-month').value=months.includes(selected)?selected:'all';
    const charts=$('.executive-charts');charts.dataset.layout='balanced';
    // Keep text at its final size when changing the chart grid.
    animate(root,'admin');
  }
  const services={gps:'Kết nối GPS',sheets:'Đồng bộ Google Sheets',storage:'Lưu ảnh',database:'Cơ sở dữ liệu',worker:'Tác vụ nền'};
  let lastSystemHealth={},terminalHistory=[],terminalCleared=false,commandHistory=[],historyCursor=0;
  const commands=[['health system','Tổng quan hệ thống'],['health gps','Tình trạng tín hiệu GPS'],['health accounts','Số tài khoản đang hoạt động'],['health jobs','Tác vụ lỗi và yêu cầu đang chờ'],['help','Xem danh sách lệnh'],['clear','Dọn nội dung console']];
  function terminalMarkup(){
    const failed=lastSystemHealth.failedJobs??0,waiting=(lastSystemHealth.pendingChanges??0)+(lastSystemHealth.pendingMaintenance??0);
    const attention=failed>0?'error':waiting>0?'pending':'idle';
    const attentionLabel=failed>0?'Có lỗi cần kiểm tra':waiting>0?'Có việc chờ xử lý':'Không có việc chờ';
    const initial='Fleet Autopilot / System Admin\nDữ liệu mô phỏng · Bộ lệnh chỉ đọc\n\n'+terminalAnswer('health system').text;
    return `<div class="kali-desktop"><section class="panel system-terminal" aria-label="Terminal kiểm tra trạng thái"><div class="terminal-title"><span>&gt;_ fleet@preview: ~/system-admin</span><small>Dữ liệu mẫu · Chỉ đọc</small></div><div class="terminal-body"><div id="system-terminal-output" class="terminal-output" role="log" aria-live="polite" aria-relevant="additions text">${terminalHistory.map(text=>`<pre>${esc(text)}</pre>`).join('')||(terminalCleared?'':`<pre>${esc(initial)}</pre>`)}</div><form id="system-terminal-form" class="terminal-input-row" autocomplete="off"><label for="system-terminal-input"><span>(fleet㉿preview)-[~/system-admin]</span><span>└─$</span></label><input id="system-terminal-input" name="command" list="system-command-list" type="text" maxlength="80" spellcheck="false" autocapitalize="off" placeholder="health system" aria-label="Nhập lệnh trạng thái, ví dụ health gps" aria-describedby="terminal-input-help"><datalist id="system-command-list">${commands.map(([c,label])=>`<option value="${c}">${label}</option>`).join('')}</datalist><button type="submit">Chạy lệnh ↵</button></form><p class="terminal-comment" id="terminal-input-help">Enter chạy lệnh · ↑ ↓ lịch sử · Chọn lệnh từ Guide</p></div></section><aside class="kali-tools"><details class="terminal-guide" open><summary>Guide — Lệnh hệ thống</summary><div class="terminal-guide-grid">${commands.map(([command,label])=>`<button type="button" data-management="terminal-command" data-id="${command}"><code>${command}</code><span>${label}</span></button>`).join('')}</div><p>Chọn lệnh để điền vào terminal. Chỉ chạy bộ lệnh của ứng dụng, không kết nối shell Linux.</p></details><section class="kali-task-window" data-attention-state="${attention}" aria-label="Việc cần xử lý"><div class="system-task-header"><h2 class="system-task-heading"><svg aria-hidden="true"><use href="#alert"/></svg>Cần xử lý</h2><span class="system-task-status" role="status"><span aria-hidden="true"></span>${attentionLabel}</span></div><div class="kali-task"><strong><span class="system-task-count" data-task-state="${failed>0?'error':'idle'}">${lastSystemHealth.failedJobs??0}</span><span>tác vụ lỗi mẫu</span></strong><button class="${(lastSystemHealth.failedJobs??0)>0?'primary':'secondary'}" data-gov="system-page" data-id="maintenance">Mở bảo trì →</button></div><div class="kali-task"><strong><span class="system-task-count" data-task-state="${(lastSystemHealth.pendingChanges??0)>0?'pending':'idle'}">${lastSystemHealth.pendingChanges??0}</span><span>thay đổi quyền đang chờ</span></strong><button class="secondary" data-gov="system-page" data-id="changes">Xem yêu cầu →</button></div><button class="text-button" data-gov="system-page" data-id="security">An ninh & nhật ký →</button></section><div class="kali-wallpaper" aria-hidden="true"></div></aside><section class="panel system-service-table"><div class="panel-heading"><h2>Dịch vụ</h2></div>${table(['Thành phần','Kết quả kiểm tra mẫu','Thao tác'],Object.entries(services).map(([id,name])=>`<tr><td>${esc(name)}</td><td>${esc(sample.checks[id]||'Chưa kiểm tra')}</td><td>${button('Kiểm tra mẫu','check',id)}</td></tr>`).join(''))}</section></div>`;
  }
  function terminalAnswer(raw){
    const normalized=String(raw).trim().toLowerCase().replace(/\s+/g,' ').replace(/^helth\b/,'health');
    const command=['guide','guild','?'].includes(normalized)?'help':normalized;
    if(command==='clear')return {clear:true,text:''};
    if(command==='help')return {text:commands.map(([c,label])=>`${c.padEnd(18)} ${label}`).join('\n')+'\n\nCác lệnh chỉ đọc dữ liệu mẫu; không phải shell Linux.'};
    const users=(roles.snapshot().users||[]).filter(u=>!u.deleted),health=lastSystemHealth;
    if(command==='health system')return {text:`[SYSTEM] Tổng quan dữ liệu mẫu\nTài khoản hoạt động: ${users.filter(u=>u.active).length}/${users.length}\nTác vụ lỗi: ${health.failedJobs??0}/${health.totalJobs??0}\nThay đổi quyền đang chờ: ${health.pendingChanges??0}\nBảo trì đang chờ: ${health.pendingMaintenance??0}\nThành phần đã kiểm tra mẫu: ${Object.keys(services).filter(id=>sample.checks[id]).length}/5\n\nChưa kết nối giám sát thật. Chưa có số đo CPU, RAM hay uptime.`};
    if(command==='health gps'){
      const vehicles=api.snapshot().vehicles;
      return {text:`[GPS] Tình trạng tín hiệu trong dữ liệu mẫu\nCó tín hiệu mẫu: ${vehicles.filter(v=>v.gps==='fresh').length}\nChưa cập nhật: ${vehicles.filter(v=>v.gps==='stale').length}\nMất tín hiệu mẫu: ${vehicles.filter(v=>v.gps==='offline').length}\nLần kiểm tra mẫu: ${sample.checks.gps||'Chưa kiểm tra'}\n\nKhông gọi GPS thật. Không hiển thị vị trí xe hoặc hội thoại.`};
    }
    if(command==='health accounts')return {text:`[ACCOUNTS] Tài khoản mẫu\nTổng tài khoản: ${users.length}\nHoạt động: ${users.filter(u=>u.active).length}\nNgừng hoạt động: ${users.filter(u=>!u.active).length}\n\nXem trang Tài khoản & truy cập để thao tác.`};
    if(command==='health jobs')return {text:`[JOBS] Tác vụ và yêu cầu mẫu\nTổng tác vụ: ${health.totalJobs??0}\nĐang lỗi: ${health.failedJobs??0}\nBảo trì đang chờ: ${health.pendingMaintenance??0}\n\nLệnh này không chạy lại hoặc thay đổi tác vụ.`};
    return {text:'Chưa nhận ra lệnh. Gõ help hoặc chọn lệnh trong Guide.\nVí dụ: health system, health gps, health jobs.'};
  }
  function runTerminal(raw){
    if(roles.role()!=='admin_system')return;
    const input=$('#system-terminal-input'),output=$('#system-terminal-output');
    if(!input||!output)return;
    const command=String(raw).trim().slice(0,80);if(!command)return;
    const result=terminalAnswer(command);
    if(result.clear){terminalHistory=[];terminalCleared=true;}
    else terminalHistory.push(`┌─(fleet㉿preview)-[~/system-admin]\n└─$ ${command}\n${result.text}`);
    terminalHistory=terminalHistory.slice(-20);
    // Text nodes only: command input can never become markup or executable code.
    output.replaceChildren();
    terminalHistory.forEach(text=>{const line=document.createElement('pre');line.textContent=text;output.append(line);});
    commandHistory.push(command);commandHistory=commandHistory.slice(-30);historyCursor=commandHistory.length;
    output.scrollTop=output.scrollHeight;input.value='';input.focus({preventScroll:true});
  }
  function systemAnalytics(health,users,logs){
    const vehicles=api.snapshot().vehicles||[];
    const gps=[['Có tín hiệu','fresh','#74d8ab'],['Chậm cập nhật','stale','#e8bc69'],['Mất tín hiệu','offline','#ee9199']].map(([label,key,color])=>({label,color,count:vehicles.filter(v=>v.gps===key).length}));
    const unknown=vehicles.length-gps.reduce((n,g)=>n+g.count,0);
    if(unknown)gps.push({label:'Chưa phân loại',color:'#8da2bf',count:unknown});
    let start=0;const segments=gps.map(g=>{const end=start+(vehicles.length?g.count/vehicles.length*100:0);const stop=`${g.color} ${start}% ${end}%`;start=end;return stop;}).join(',');
    const ring=`<div class="soc-ring" style="--soc-segments:${vehicles.length?'conic-gradient('+segments+')':'#293b53'}"><div><strong>${vehicles.length}</strong><span>xe mẫu</span></div></div>`;
    const legend=gps.map(g=>`<div class="soc-legend-row"><i style="background:${g.color}"></i><span>${g.label}</span><strong>${g.count}</strong></div>`).join('');
    const existing=users.filter(u=>!u.deleted),active=existing.filter(u=>u.active).length;
    const jobs=Math.max(0,health.totalJobs??0),failed=Math.min(jobs,Math.max(0,health.failedJobs??0));
    const rows=[['Tài khoản hoạt động',active,existing.length,'#58a6ff'],['Tài khoản tạm ngưng',existing.length-active,existing.length,'#8da2bf'],['Tác vụ lỗi',failed,jobs,'#ee9199'],['Tác vụ còn lại',jobs-failed,jobs,'#74d8ab']];
    const bars=rows.map(([label,count,total,color])=>`<div class="soc-bar-row"><div><span>${label}</span><strong>${count}<small> / ${total}</small></strong></div><div class="soc-track"><span style="width:${total?count/total*100:0}%;background:${color}"></span></div></div>`).join('');
    const valid=logs.filter(l=>Number.isFinite(Date.parse(l.at||'')));
    const end=valid.length?Math.max(...valid.map(l=>Date.parse(l.at))):Date.now();
    const dayKey=t=>new Date(t).toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'});
    const days=Array.from({length:7},(_,i)=>dayKey(end-(6-i)*86400000));
    const counts=days.map(day=>valid.filter(l=>dayKey(l.at)===day).length),max=Math.max(1,...counts);
    const points=counts.map((n,i)=>`${40+i*80},${155-n/max*115}`).join(' ');
    const ticks=days.map((day,i)=>`<text x="${40+i*80}" y="184" text-anchor="middle">${day.slice(8)}/${day.slice(5,7)}</text>`).join('');
    const dots=counts.map((n,i)=>`<circle cx="${40+i*80}" cy="${155-n/max*115}" r="4"><title>${days[i]}: ${n} bản ghi</title></circle>`).join('');
    const trend=`<div class="soc-trend-summary"><strong>${counts.reduce((a,b)=>a+b,0)}</strong><span>bản ghi / 7 ngày</span><span class="soc-source">AUDIT LOG · MẪU</span></div><svg class="soc-trend" viewBox="0 0 560 200" role="img" aria-label="Nhật ký quản trị theo 7 ngày; ${days.map((d,i)=>d+': '+counts[i]).join('; ')}"><g class="soc-grid-lines"><path d="M40 40H520M40 97.5H520M40 155H520"/></g><g class="soc-axis"><text x="28" y="44" text-anchor="end">${max}</text><text x="28" y="159" text-anchor="end">0</text>${ticks}</g><polygon class="soc-area" points="40,155 ${points} 520,155"/><polyline class="soc-line" points="${points}"/><g class="soc-dots">${dots}</g></svg><div class="soc-period">${days[0]} → ${days[6]} · UTC+7</div>`;
    return `<div class="soc-section-heading"><div><span class="report-eyebrow">OPERATIONS ANALYTICS</span><h2>Phân tích giám sát</h2></div><span class="system-environment">DỮ LIỆU MẪU · KHÔNG REALTIME</span></div><div class="soc-analytics">${panel('Nhật ký quản trị · 7 ngày',trend+note('Ngày không có bản ghi hiển thị 0. Khoảng thời gian kết thúc tại nhật ký mới nhất; chưa có nhật ký thì dùng ngày hiện tại.'))}${panel('Tình trạng tín hiệu GPS',`<div class="soc-gps">${ring}<div>${legend}</div></div>`+note('Phân bố trạng thái xe trong dữ liệu mẫu, không xác nhận kết nối GPS thật.'))}${panel('Tài khoản & tác vụ',bars+note('Mỗi thanh có mẫu số riêng. Tác vụ còn lại chỉ là tác vụ không ở trạng thái lỗi, không đồng nghĩa đã thành công.'))}</div>`;
  }
  function systemDashboard(health){
    const users=roles.snapshot().users||[],logs=roles.snapshot().system||[];
    const active=users.filter(u=>!u.deleted&&u.active).length;
    const checked=Object.keys(services).filter(id=>sample.checks[id]).length;
    const datedLogs=logs.filter(l=>/^\d{4}-\d{2}-\d{2}T/.test(l.at||'')&&Number.isFinite(Date.parse(l.at)));
    const days=[...new Set(datedLogs.map(l=>new Date(l.at).toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'})))].sort().slice(-7);
    const daily=days.map(d=>({day:d,count:logs.filter(l=>l.at&&new Date(l.at).toString()!=='Invalid Date'&&new Date(l.at).toLocaleDateString('sv-SE',{timeZone:'Asia/Bangkok'})===d).length}));
    const max=Math.max(1,...daily.map(d=>d.count));
    lastSystemHealth=health;
    const terminal=terminalMarkup();
    // Reuse Dispatch's stat component; keep the existing navigation and sample counts.
    const tile = (label, value, description, page) => {
      const icon = {accounts: 'order', maintenance: 'alert', changes: 'layers'}[page] || 'gear';
      return `<button class="stat" data-gov="system-page" data-id="${page}" title="${esc(description)} · Xem chi tiết"><span class="stat-icon"><svg aria-hidden="true"><use href="#${icon}"/></svg></span><span>${esc(label)}<strong>${value}</strong></span></button>`;
    };
    return `<section class="stats system-standard-kpis" aria-label="Tổng quan hệ thống">${tile('Tài khoản hoạt động',active,'Dữ liệu tài khoản mẫu','accounts')}${tile('Tác vụ lỗi',health.failedJobs??0,'Dữ liệu tác vụ mẫu','maintenance')}${tile('Thay đổi quyền đang chờ',health.pendingChanges??0,'Chờ duyệt hoặc thực hiện','changes')}</section>${terminal}<details class="kali-reports"><summary>Số liệu & thành phần hệ thống</summary><div class="kali-report-content"><section class="panel system-console"><div><span class="report-eyebrow">FLEET AUTOPILOT / SYSTEM CONTROL</span><h2>Trung tâm giám sát</h2><p>Tài khoản, kết nối và tác vụ trong một góc nhìn.</p><span class="system-environment">BẢN THỬ · CHƯA KẾT NỐI GIÁM SÁT THẬT</span></div><div class="system-readout"><strong>${String(Object.keys(services).length).padStart(2,'0')}</strong><span>thành phần theo dõi</span><small>${checked}/5 đã kiểm tra mẫu · Chưa xác nhận sức khỏe dịch vụ</small></div></section><div class="system-kpi-grid">${tile('Tài khoản hoạt động',active,'Tài khoản mẫu đang được kích hoạt','accounts')}${tile('Tác vụ đang lỗi',health.failedJobs??0,`Trong ${health.totalJobs??0} tác vụ mẫu`,'maintenance')}${tile('Thay đổi quyền đang chờ',health.pendingChanges??0,'Chờ duyệt hoặc chờ thực hiện','changes')}${tile('Bảo trì đang chờ',health.pendingMaintenance??0,'Yêu cầu đã duyệt chưa xử lý','maintenance')}</div>${systemAnalytics(health,users,logs)}<div class="system-observatory">${panel('Bản đồ thành phần',`<div class="system-service-grid">${Object.entries(services).map(([id,label],i)=>`<article class="system-service"><span class="system-service-number">0${i+1}</span><strong>${label}</strong><span class="system-service-state">${sample.checks[id]?'Đã kiểm tra mẫu':'Chưa kiểm tra'}</span><small>${esc(sample.checks[id]||'Chưa có thông tin kết nối thật')}</small>${button('Kiểm tra mẫu','check',id)}</article>`).join('')}</div>`+note('Các ô mô tả thành phần, không xác nhận dịch vụ đang online. Kiểm tra chỉ chạy kịch bản UI.'))}${panel('Nhịp hoạt động quản trị',`<div class="system-log-total"><strong>${logs.length}</strong><span>bản ghi nhật ký mẫu</span></div><div class="system-log-chart" role="group" aria-label="Số bản ghi nhật ký theo ngày, tối đa 7 ngày có ghi nhận">${daily.map(d=>`<div><strong>${d.count}</strong><span style="height:${Math.max(3,d.count/max*110)}px"></span><small>${d.day.slice(8)}/${d.day.slice(5,7)}</small></div>`).join('')||'<p>Chưa có nhật ký có ngày hợp lệ.</p>'}</div>`+note('Số thao tác đã lưu theo ngày (giờ Việt Nam/Thái Lan), không phải lưu lượng request hoặc mức tải máy chủ.'))}</div>${panel('Hoạt động gần nhất',table(['Thời gian','Người thực hiện','Thao tác','Kết quả'],logs.slice(0,5).map(l=>`<tr><td>${l.at&&new Date(l.at).toString()!=='Invalid Date'?new Date(l.at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}):'Chưa ghi nhận'}</td><td>${esc(l.actor)}</td><td>${esc(l.action)}</td><td>${esc(l.result||'Lịch sử mẫu')}</td></tr>`).join(''))+`<button class="secondary" data-gov="system-page" data-id="logs">Mở toàn bộ nhật ký</button>`)}${note('Số liệu lấy từ dữ liệu mẫu hiện có. CPU, RAM, độ trễ, uptime và dung lượng sao lưu chưa có nguồn đo nên chưa hiển thị số giả.')}</div></details>`;
  }
  function systemContent(page,health={}){
    const disclaimer=note('Bản thử: mọi kiểm tra, điều khiển và yêu cầu chỉ mô phỏng trên trình duyệt; chưa kết nối hạ tầng thật.');
    if(page==='health')return systemDashboard(health);
    if(page==='connections')return disclaimer+panel('Kiểm tra từng kết nối',Object.entries(services).filter(([id])=>['gps','sheets','storage'].includes(id)).map(([id,name])=>`<div class="role-row"><div><strong>${name}</strong><small>${esc(sample.checks[id]||'Chưa có kết quả kiểm tra mẫu')}</small></div>${button('Kiểm tra kết nối mẫu','check',id)}</div>`).join(''))+panel('Khi kết nối thất bại',note('Kiểm tra nhà cung cấp và cấu hình cùng người phát triển. Màn hình này không hiển thị khóa bí mật hoặc tự thay đổi thông tin kết nối.')+button('Ghi yêu cầu hỗ trợ mẫu','request','connection'));
    if(page==='data'){
      const s=api.snapshot(),issues=s.orders.flatMap(o=>o.plate&&!s.vehicles.some(v=>v.plate===o.plate)?[`${o.id}: biển số không có trong danh sách xe`]:['assigned','running'].includes(o.status)&&!o.plate?[`${o.id}: trạng thái đã phân công/đang chạy nhưng thiếu xe`]:[]);
      return disclaimer+panel('Kiểm tra liên kết đơn và xe',note('Kiểm tra dữ liệu mẫu đang có: đơn gắn biển số không tồn tại; đơn đã phân công/đang chạy nhưng thiếu xe.')+(issues.length?`<ul>${issues.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:note('Không phát hiện bất thường trong hai quy tắc trên. Không phải xác nhận toàn bộ dữ liệu hợp lệ.'))+button('Chạy kiểm tra lại','scan')+button('Ghi yêu cầu hỗ trợ mẫu','request','data'))+panel('Phạm vi sửa dữ liệu',note('Giữ nguyên dữ liệu nghiệp vụ. Khi cần sửa, người phát triển xác định nguyên nhân và phương án; quyền sửa trạng thái đơn/chuyến qua UI chưa được chốt.'));
    }
    if(page==='controls')return disclaimer+panel('Công tắc chức năng mẫu',Object.entries({ai:'Đề xuất phân xe bằng AI',sheets:'Đồng bộ Google Sheets'}).map(([id,name])=>`<div class="role-row"><div><strong>${name}</strong><small>${sample.flags[id]?'Bật trong kịch bản mẫu':'Tạm dừng trong kịch bản mẫu'} · Không thay đổi chức năng thật</small></div>${button(sample.flags[id]?'Tạm dừng mẫu':'Bật lại mẫu','toggle',id)}</div>`).join(''))+panel('Thông báo bảo trì',note('Ghi yêu cầu có phạm vi, lý do và ảnh hưởng dự kiến. Không tự ngắt phiên làm việc hoặc dừng các chuyến đang chạy.')+button('Lập yêu cầu bảo trì mẫu','request','maintenance'));
    return disclaimer+panel('Sao lưu',note('Chưa kết nối dịch vụ sao lưu: chưa có thời điểm hay kết quả sao lưu đã xác thực.')+button('Ghi yêu cầu sao lưu mẫu','request','backup')+note('Ghi yêu cầu không tạo bản sao lưu. Khôi phục toàn hệ thống vẫn chuyển người phát triển.'))+panel('Chẩn đoán & yêu cầu gần đây',button('Xem bản chẩn đoán mẫu','diagnostic')+table(['Thời gian','Loại','Lý do'],sample.records.map(r=>`<tr><td>${esc(r.at)}</td><td>${esc(r.label)}</td><td>${esc(r.reason)}</td></tr>`).join(''))+note('Bản chẩn đoán chỉ gồm trạng thái kiểm tra mẫu và số lượng bản ghi; không kèm hội thoại, vị trí, mật khẩu hay khóa dịch vụ.'));
  }
  const animations=new Set();
  let panelObserver,lastEntrance='';
  function animate(root,role){
    panelObserver?.disconnect();panelObserver=null;
    animations.forEach(a=>a.cancel());animations.clear();
    if(!root?.isConnected||role==='system')return;
    const url=new URL(location.href),signature=[role,root.dataset.adminPage,url.searchParams.get('system_page'),url.searchParams.get('chart_months'),url.searchParams.get('report_month')].join('|');
    const fresh=signature!==lastEntrance;lastEntrance=signature;
    if(reduced.matches||!fresh||!['admin','system'].includes(role))return;
    const system=role==='system';
    const cards=[...root.querySelectorAll(system?'.governance-grid>.panel,.system-kpi,.system-observatory>.panel':'.executive-balance,.executive-metric,.management-panel,.role-grid>.panel')].filter(el=>!el.hidden&&el.getClientRects().length);
    function play(el,frames,options){
      const a=el.animate(frames,options);animations.add(a);
      a.finished.catch(()=>{}).finally(()=>animations.delete(a));
    }
    const reveal=(el,index)=>{
      if(!el.isConnected||reduced.matches)return;
      // Small scale changes in one live layer: center-out, outside-in, then edge-in.
      const pattern=index%3,scale=system?(pattern===1?1.008:.98):(pattern===1?1.018:.94);
      const origin=pattern===2?(index%2?'100% 50%':'0% 50%'):'50% 50%';
      const offset=pattern===2?(index%2?-6:6):0;
      play(el,[{opacity:system?.88:.76,transform:`translateX(${offset}px) scale(${scale})`,transformOrigin:origin},{opacity:1,transform:'translateX(0) scale(1)',transformOrigin:origin}],{duration:system?280:440,delay:Math.min(index*(system?20:35),system?40:105),easing:'cubic-bezier(.16,1,.3,1)',fill:'backwards'});
      if(!system)el.querySelectorAll('.daily-stack,.report-fill,.balance-progress>span').forEach(bar=>{
        const vertical=bar.matches('.daily-stack');
        play(bar,[{transform:vertical?'scaleY(.15)':'scaleX(.15)',transformOrigin:vertical?'bottom':'left'},{transform:vertical?'scaleY(1)':'scaleX(1)',transformOrigin:vertical?'bottom':'left'}],{duration:480,delay:90,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
      });
    };
    if(typeof IntersectionObserver==='function'){
      panelObserver=new IntersectionObserver(entries=>{
        let order=0;
        entries.forEach(entry=>{if(entry.isIntersecting){panelObserver?.unobserve(entry.target);reveal(entry.target,cards.indexOf(entry.target)+order++);}});
      },{threshold:.06});
      cards.forEach(el=>panelObserver.observe(el));
    }else cards.forEach(reveal);
  }
  function audit(label,reason){const at=new Date().toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'});sample.records.unshift({at,label,reason});const entry={id:crypto.randomUUID(),at:new Date().toISOString(),actor:'Phạm Huy Hoàng',action:label,before:'Kịch bản UI',after:reason,result:'Mô phỏng · Không tác động hệ thống thật'};roles.snapshot().system.unshift(entry);roles.save();try{localStorage.setItem(key,JSON.stringify(sample));}catch{api.toast('Không lưu được dữ liệu mẫu.');}roles.render();}
  document.addEventListener('change',e=>{if(e.target.id==='executive-month'&&roles.role()==='admin'){const url=new URL(location.href);url.searchParams.set('report_month',e.target.value);history.replaceState(null,'',url);roles.render();$('#executive-month')?.focus();}});
  document.addEventListener('submit',e=>{if(e.target.id==='system-terminal-form'){e.preventDefault();runTerminal(e.target.elements.command.value);}});
  document.addEventListener('keydown',e=>{
    if(e.target.id!=='system-terminal-input'||roles.role()!=='admin_system'||!['ArrowUp','ArrowDown'].includes(e.key))return;
    e.preventDefault();historyCursor=Math.max(0,Math.min(commandHistory.length,historyCursor+(e.key==='ArrowUp'?-1:1)));
    e.target.value=commandHistory[historyCursor]||'';
  });
  document.addEventListener('click',e=>{
    const b=e.target.closest('[data-management]');if(!b)return;
    const {management:action,id}=b.dataset;
    if(action==='terminal-command'&&roles.role()==='admin_system'&&commands.some(([command])=>command===id)){
      const input=$('#system-terminal-input');if(input){input.value=id;input.focus({preventScroll:true});input.scrollIntoView({block:'nearest',behavior:'auto'});}return;
    }
    if(action==='chart-range'&&roles.role()==='admin'&&['6','12'].includes(id)){const url=new URL(location.href);url.searchParams.set('chart_months',id);history.replaceState(null,'',url);roles.render();document.querySelector(`[data-management="chart-range"][data-id="${id}"]`)?.focus({preventScroll:true});return;}
    if(action==='layout'&&roles.role()==='admin'){const el=$('.executive-charts'),update=()=>el.dataset.layout=el.dataset.layout==='balanced'?'focus':'balanced';update();return;}
    if(action==='orders'&&roles.role()==='admin'){const list=orders().filter(o=>id==='all'||id==='tonnes'&&o.status!=='cancelled'||id.startsWith('material:')&&o.material===id.slice(9)||id.startsWith('month:')&&o.day.startsWith(id.slice(6))||o.status===id);const node=document.createElement('div');node.innerHTML=table(['Mã đơn','Ngày giao dự kiến','Vật liệu / khối lượng','Khách hàng','Trạng thái','Xe'],rows(list));api.openModal('Đối chiếu đơn hàng',`${list.length} đơn · Cùng phạm vi với báo cáo · Dữ liệu mẫu`,node);return;}
    if(roles.role()!=='admin_system')return;
    if(action==='scan'){roles.render();api.toast('Đã kiểm tra lại hai quy tắc trên dữ liệu mẫu.');return;}
    if(action==='diagnostic'){const node=document.createElement('div');node.innerHTML=note(`Dữ liệu mẫu: ${api.snapshot().orders.length} đơn; ${api.snapshot().vehicles.length} xe. Các kết quả bên dưới không phải kiểm tra dịch vụ thật.`)+table(['Thành phần','Lần kiểm tra mẫu'],Object.entries(sample.checks).map(([id,at])=>`<tr><td>${esc(services[id])}</td><td>${esc(at)}</td></tr>`).join(''));api.openModal('Chẩn đoán mẫu — chỉ đọc','Không bao gồm dữ liệu nhạy cảm.',node);return;}
    if(!['check','toggle','request'].includes(action))return;
    if(action==='check'&&!services[id]||action==='toggle'&&!Object.hasOwn(sample.flags,id))return;
    const title=action==='check'?'Chạy kiểm tra mẫu':action==='toggle'?'Đổi công tắc mẫu':'Ghi yêu cầu hỗ trợ mẫu',node=document.createElement('div');
    node.innerHTML=`<form class="role-form">${note(action==='toggle'?'Chỉ thay công tắc của kịch bản UI. Khi triển khai thật cần kiểm tra tác vụ đang chạy trước khi tạm dừng.':action==='check'?'Chỉ ghi thời điểm chạy kịch bản kiểm tra, không gọi dịch vụ hay xác nhận kết nối thành công.':'Chỉ lưu yêu cầu mẫu để theo dõi; chưa gửi cho người khác hoặc thực hiện bảo trì.')}<label>Lý do<textarea name="reason" required maxlength="500"></textarea></label><button class="primary">Xác nhận mô phỏng</button></form>`;
    api.openModal(title,'Thao tác trên dữ liệu mẫu.',node);
    node.querySelector('form').onsubmit=event=>{event.preventDefault();if(!event.target.reportValidity())return;const reason=event.target.elements.reason.value.trim();if(!reason)return;if(action==='check')sample.checks[id]=new Date().toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'});if(action==='toggle')sample.flags[id]=!sample.flags[id];$('#modal').close();audit(title+' · '+(services[id]||id),reason);api.toast('Đã ghi nhận thao tác mẫu và nhật ký.');};
  });
  window.FleetManagement={systemContent};
  window.addEventListener('fleet:role-render',()=>{overview();if(roles.role()==='admin'&&$('#role-view')?.dataset.adminPage!=='overview')animate($('#role-view'),'admin');if(roles.role()==='admin_system')animate($('#role-view'),'system');});
  window.addEventListener('fleet:reset',()=>{sample={checks:{},flags:{ai:true,sheets:true},records:[]};terminalHistory=[];terminalCleared=false;commandHistory=[];historyCursor=0;try{localStorage.removeItem(key);}catch{}roles.render();});
  reduced.addEventListener('change',()=>{if(reduced.matches){panelObserver?.disconnect();animations.forEach(a=>a.cancel());}});
  roles.render();
})();
