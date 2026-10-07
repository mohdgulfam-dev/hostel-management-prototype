
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>"₹"+Number(n||0).toLocaleString("en-IN");
const monthLabel=m=>new Date(m+"-01T00:00:00").toLocaleDateString("en-IN",{month:"long",year:"numeric"});
const initials=n=>String(n||"").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const avatarClass=n=>["","purple","green","orange","red"][([...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0)%5)];
const tenantById=id=>DATA.tenants.find(t=>t.id===id);
const roomById=id=>DATA.rooms.find(r=>r.id===id);
const billFor=(roomId,month)=>DATA.electricityBills.find(b=>b.roomId===roomId&&b.month===month);
const paymentsFor=(tenantId,type,month)=>DATA.payments.filter(p=>p.tenantId===tenantId&&p.type===type&&p.month===month);
const sum=arr=>arr.reduce((a,b)=>a+Number(b.amount||0),0);
function occupancy(roomId){return DATA.tenants.filter(t=>t.roomId===roomId).length}
function eleShare(tenant,month){
  const occ=occupancy(tenant.roomId), bill=billFor(tenant.roomId,month);
  return occ&&bill?Math.round(Number(bill.totalBill)/occ):0;
}
function due(tenant,type,month){
  const expected=type==="rent"?Number(tenant.monthlyRent||DATA.settings.tenantRent):eleShare(tenant,month);
  return Math.max(0,expected-sum(paymentsFor(tenant.id,type,month)));
}
function statusFor(tenant,type,month){
  const expected=type==="rent"?Number(tenant.monthlyRent||DATA.settings.tenantRent):eleShare(tenant,month);
  const paid=sum(paymentsFor(tenant.id,type,month));
  if(expected<=0)return "Paid";
  if(paid<=0)return "Unpaid";
  if(paid<expected)return "Partial";
  return "Paid";
}
function totalDue(tenant,month){return due(tenant,"rent",month)+due(tenant,"electricity",month)}
function roomFinancials(roomId,month){
  const ts=DATA.tenants.filter(t=>t.roomId===roomId);
  const rentExpected=sum(ts.map(t=>Number(t.monthlyRent||DATA.settings.tenantRent)));
  const rentCollected=sum(ts.flatMap(t=>paymentsFor(t.id,"rent",month)));
  const bill=billFor(roomId,month)?.totalBill||0;
  const eleCollected=sum(ts.flatMap(t=>paymentsFor(t.id,"electricity",month)));
  return {tenants:ts,rentExpected,rentCollected,rentOutstanding:Math.max(0,rentExpected-rentCollected),bill,eleCollected,eleOutstanding:Math.max(0,bill-eleCollected)};
}
function totals(month){
  const rentExpected=sum(DATA.tenants.map(t=>Number(t.monthlyRent||DATA.settings.tenantRent)));
  const rentCollected=sum(DATA.payments.filter(p=>p.type==="rent"&&p.month===month));
  const eleTotal=sum(DATA.electricityBills.filter(b=>b.month===month).map(b=>Number(b.totalBill)));
  const eleCollected=sum(DATA.payments.filter(p=>p.type==="electricity"&&p.month===month));
  return {rentExpected,rentCollected,rentDue:Math.max(0,rentExpected-rentCollected),eleTotal,eleCollected,eleDue:Math.max(0,eleTotal-eleCollected),tenants:DATA.tenants.length,rooms:DATA.rooms.filter(r=>occupancy(r.id)>0).length};
}
function toast(msg,type="success"){const el=document.createElement("div");el.className="toast "+type;el.textContent=msg;$("#toast-root").appendChild(el);setTimeout(()=>el.remove(),2600)}
function go(route,params={}){STATE.route=route;STATE.params=params;try{history.pushState({route,params},"",`#${route}`)}catch(e){}render()}
function activeTab(){if(["home"].includes(STATE.route))return"home";if(STATE.route.startsWith("tenant"))return"tenants";if(["rent","payment","electricity","electricityDetail","financial","room","rooms","addRoom"].includes(STATE.route))return"rent";return"more"}
function header(title="",back=false,menu=false){
 return `<header class="header">${back?`<button class="icon-btn" data-action="back" aria-label="Back">←</button>`:`<button class="icon-btn" data-action="menu" aria-label="Menu">☰</button>`}<div class="brand">HS <span>Height</span></div><div class="header-actions">${menu?`<button class="icon-btn" data-action="noop">⋮</button>`:`<button class="profile-circle" data-action="profile">${initials(DATA.admin.name)||"A"}</button>`}</div></header>`
}
function bottomNav(){const a=activeTab();return `<nav class="bottom-nav">
  <button class="nav-item ${a==="home"?"active":""}" data-nav="home"><span class="nav-icon">⌂</span><span>Home</span></button>
  <button class="nav-item ${a==="tenants"?"active":""}" data-nav="tenants"><span class="nav-icon">♟</span><span>Tenants</span></button>
  <button class="nav-item ${a==="rent"?"active":""}" data-nav="rent"><span class="nav-icon">▤</span><span>Rent</span></button>
  <button class="nav-item ${a==="more"?"active":""}" data-nav="more"><span class="nav-icon">•••</span><span>More</span></button>
</nav>`}
function shell(content,{head=true,back=false,menu=false}={}){return `<div class="screen">${head?header("",back,menu):""}<main class="page">${content}</main>${bottomNav()}</div>`}
function monthControl(month){return `<div class="month-control"><button data-month="-1">‹</button><span class="month-label">${monthLabel(month)}</span><button data-month="1">›</button></div>`}
function changeMonth(delta){
 const d=new Date(STATE.month+"-01T00:00:00");d.setMonth(d.getMonth()+delta);STATE.month=d.toISOString().slice(0,7);render()
}
function statusBadge(s){return `<span class="badge ${s==="Paid"?"badge-paid":s==="Partial"?"badge-partial":"badge-due"}">${esc(s)}</span>`}
function iconCircle(kind){
 const map={rent:["⌂","icon-blue"],electricity:["ϟ","icon-yellow"],records:["▥","icon-purple"],rooms:["▣","icon-blue"],tenant:["♟","icon-green"]};
 const [i,c]=map[kind]||["•","icon-blue"];return `<div class="icon-wrap ${c}">${i}</div>`
}

function renderLogin(){
 return `<div class="login"><div class="login-hero"><div class="logo-mark">HS</div><div class="logo-word">HS <span>Height</span></div><div class="logo-sub">HOSTEL MANAGEMENT</div></div>
 <section class="login-panel"><h1>Welcome back</h1><p>Sign in to manage your hostel</p>
 <div class="field"><label for="login-phone">Mobile number</label><div class="phone-field"><span class="phone-code">🇮🇳 +91</span><input id="login-phone" inputmode="numeric" maxlength="10" placeholder="Enter mobile number"></div><div id="login-error" class="help" style="color:var(--red)"></div></div>
 <button class="btn btn-primary btn-block" style="margin-top:18px" data-action="login">Continue →</button>
 <div class="security"><span class="security-icon">🔒</span><span>Only authorized hostel owners can access this account.</span></div></section></div>`
}
function renderHome(){
 const t=totals(STATE.month), recent=[...DATA.payments].filter(p=>p.month===STATE.month).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,3);
 return shell(`<div class="title-row"><div><h1 class="page-title">Dashboard</h1><p class="page-subtitle">Overview for ${monthLabel(STATE.month)}</p></div></div>
 ${monthControl(STATE.month)}
 <div class="stat-grid">
  <div class="stat blue" data-action="go-rent"><div class="label">Total Rent Expected</div><div class="value">${money(t.rentExpected)}</div><div class="hint">${DATA.tenants.length} tenants</div></div>
  <div class="stat green" data-action="go-rent"><div class="label">Rent Collected</div><div class="value money-green">${money(t.rentCollected)}</div><div class="hint">Actual payments</div></div>
  <div class="stat red" data-action="go-rent-due"><div class="label">Rent Due</div><div class="value money-red">${money(t.rentDue)}</div><div class="hint">Outstanding</div></div>
  <div class="stat blue" data-action="go-electricity"><div class="label">Electricity Collected</div><div class="value money-blue">${money(t.eleCollected)}</div><div class="hint">Actual payments</div></div>
  <div class="stat yellow" data-action="go-electricity"><div class="label">Electricity Due</div><div class="value money-amber">${money(t.eleDue)}</div><div class="hint">Room bills</div></div>
  <div class="stat purple" data-action="go-tenants"><div class="label">Total Tenants</div><div class="value">${t.tenants}</div><div class="hint">Current residents</div></div>
 </div>
 <div class="quick-grid" style="margin-top:12px"><div class="quick-card" data-action="go-rooms"><div class="label">Occupied Rooms</div><div class="value">${t.rooms} / ${DATA.rooms.length}</div></div><div class="quick-card" data-action="go-rent"><div class="label">Room Rent Standard</div><div class="value">${money(DATA.settings.roomRent)}</div></div></div>
 <div class="section-title between"><span>Recent Payments</span><button class="btn btn-soft" data-action="go-financial">View All →</button></div>
 <div class="card list-card">${recent.length?recent.map(p=>{const x=tenantById(p.tenantId);return `<div class="list-row clickable" data-payment="${p.id}"><div class="avatar ${avatarClass(x?.name)}">${initials(x?.name)}</div><div class="row-main"><div class="row-name">${esc(x?.name)}</div><div class="row-meta">Room ${esc(roomById(x?.roomId)?.roomNumber)} • ${p.type==="rent"?"Rent":"Electricity"}</div></div><div class="row-side"><b class="money money-green">${money(p.amount)}</b><span class="row-meta">${p.date}</span></div></div>`}).join(""):`<div class="empty">No payments for this month.</div>`}</div>`)
}
function renderTenants(){
 const q=(STATE.q||"").toLowerCase(), f=STATE.filter||"all";
 let list=DATA.tenants.filter(t=>`${t.name} ${t.phone} ${roomById(t.roomId)?.roomNumber}`.toLowerCase().includes(q));
 if(f==="due")list=list.filter(t=>totalDue(t,STATE.month)>0);if(f==="paid")list=list.filter(t=>totalDue(t,STATE.month)===0);
 return shell(`<div class="title-row"><div><h1 class="page-title">Tenants <span class="badge badge-info">${DATA.tenants.length}</span></h1><p class="page-subtitle">Manage all tenants living in your hostel</p></div><button class="btn btn-primary" data-action="add-tenant">+ Add Tenant</button></div>
 <div class="search">⌕<input id="list-search" value="${esc(STATE.q||"")}" placeholder="Search tenant or mobile number..."></div>
 <div class="filters"><button class="filter-chip ${f==="all"?"active":""}" data-filter="all">All (${DATA.tenants.length})</button><button class="filter-chip ${f==="due"?"active":""}" data-filter="due">Due (${DATA.tenants.filter(t=>totalDue(t,STATE.month)>0).length})</button><button class="filter-chip ${f==="paid"?"active":""}" data-filter="paid">Paid (${DATA.tenants.filter(t=>totalDue(t,STATE.month)===0).length})</button><button class="filter-chip" data-action="tenant-filter">☷</button></div>
 <div class="card list-card">${list.length?list.map(t=>{const room=roomById(t.roomId), rd=due(t,"rent",STATE.month), ed=due(t,"electricity",STATE.month), td=rd+ed;return `<div class="list-row clickable" data-tenant="${t.id}"><div class="avatar ${avatarClass(t.name)}">${initials(t.name)}</div><div class="row-main"><div class="row-name">${esc(t.name)}</div><div class="row-meta">${esc(t.phone)} • Room ${room?.roomNumber}</div></div><div class="row-main" style="max-width:105px"><div class="row-meta">Rent <b>${money(t.monthlyRent)}</b></div><div class="row-meta">Electricity <b>${money(eleShare(t,STATE.month))}</b></div></div><div class="row-side">${td?`<span class="badge badge-due">${money(td)} Due</span>`:`<span class="badge badge-paid">Paid</span>`}</div><span class="chevron">›</span></div>`}).join(""):`<div class="empty">${q?"No tenants match your search.":"No tenants found."}</div>`}</div>`)
}
function tenantForm(editId=null){
 const t=editId?tenantById(editId):{name:"",phone:"",roomId:"",monthlyRent:DATA.settings.tenantRent,joiningDate:new Date().toISOString().slice(0,10)};
 const available=DATA.rooms.filter(r=>occupancy(r.id)<r.capacity || r.id===t.roomId);
 return shell(`<div class="title-row"><div><h1 class="page-title">${editId?"Edit Tenant":"Add Tenant"}</h1><p class="page-subtitle">${editId?"Update tenant information":"Add a new tenant to your hostel"}</p></div></div>
 <form id="tenant-form" class="card pad form-grid">
 <input type="hidden" name="id" value="${esc(editId||"")}">
 <div class="field"><label>Full Name <span class="required">*</span></label><input class="input" name="name" value="${esc(t.name)}" placeholder="Enter full name" required></div>
 <div class="field"><label>Mobile Number <span class="required">*</span></label><input class="input" name="phone" inputmode="tel" maxlength="10" value="${esc(t.phone.replace(/^\\+91\\s*/,""))}" placeholder="Enter mobile number" required></div>
 <div class="field"><label>Room Number <span class="required">*</span></label><select class="select" name="roomId" required><option value="">Select room number</option>${available.map(r=>`<option value="${r.id}" ${(t.roomId===r.id || (!editId && STATE.prefillRoom===r.id))?"selected":""}>Room ${r.roomNumber} (${occupancy(r.id)}/${r.capacity})</option>`).join("")}</select></div>
 <div class="field"><label>Monthly Rent <span class="required">*</span></label><input class="input" name="monthlyRent" type="number" min="0" value="${t.monthlyRent}" required><div class="help">Default tenant rent is ${money(DATA.settings.tenantRent)}. The room standard is ${money(DATA.settings.roomRent)}.</div></div>
 <div class="field"><label>Date of Joining <span class="required">*</span></label><input class="input" name="joiningDate" type="date" value="${t.joiningDate}" required></div>
 <div class="notice">Tenant will be linked to the selected room. Shared rooms support up to 3 tenants. Electricity is calculated from the room's monthly bill.</div>
 <button class="btn btn-primary btn-block" type="submit">${editId?"Save Changes":"Add Tenant"}</button>
 </form>`)
}
function renderTenantDetail(id){
 const t=tenantById(id);if(!t)return go("tenants");const room=roomById(t.roomId),rd=due(t,"rent",STATE.month),ed=due(t,"electricity",STATE.month);
 const hist=["2026-10","2026-09","2026-08"].map(m=>({m,rent:due(t,"rent",m),ele:due(t,"electricity",m),status:rd===0&&ed===0&&m===STATE.month?"Paid":statusFor(t,"rent",m)==="Paid"&&statusFor(t,"electricity",m)==="Paid"?"Paid":"Partial"}));
 return shell(`<div class="detail-card card"><div class="detail-head"><div class="avatar ${avatarClass(t.name)}">${initials(t.name)}</div><div style="flex:1"><h1 style="margin:0;font-size:25px">${esc(t.name)}</h1><div class="row-meta" style="font-size:15px;margin-top:5px">☎ ${esc(t.phone)}</div><div style="margin-top:5px;color:var(--blue);font-weight:700">▣ Room ${room?.roomNumber}</div><div class="row-meta">Joined on ${new Date(t.joiningDate+"T00:00:00").toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</div></div><button class="btn btn-soft" data-action="edit-tenant" data-id="${t.id}">✎ Edit</button></div></div>
 <div class="section-title between"><span>Current Dues</span><span class="row-meta">${monthLabel(STATE.month)}</span></div>
 <div class="dues"><div class="due-card" style="background:${rd?"#FFF0F2":"#EFFAF4"}"><div class="label">Rent</div><div class="amount ${rd?"money-red":"money-green"}">${money(rd)} <span class="badge ${rd?"badge-due":"badge-paid"}">${rd?"Unpaid":"Paid"}</span></div><div class="row-meta">Due after payments</div></div>
 <div class="due-card" style="background:${ed?"#FFF9E9":"#EFFAF4"}"><div class="label">Electricity</div><div class="amount ${ed?"money-amber":"money-green"}">${money(ed)} <span class="badge ${ed?"badge-partial":"badge-paid"}">${ed?"Due":"Paid"}</span></div><div class="row-meta">Share: ${money(eleShare(t,STATE.month))}</div></div></div>
 <div class="detail-actions"><button class="btn btn-primary" data-action="record-payment" data-id="${t.id}">▣ Record Payment</button><button class="btn btn-soft" data-action="reminder" data-id="${t.id}">➤ Send Reminder</button><button class="btn btn-soft" data-action="edit-tenant" data-id="${t.id}">✎ Edit Tenant</button></div>
 <div class="section-title">Payment History</div><div class="table-wrap"><table><thead><tr><th>Month</th><th>Rent Due</th><th>Electricity Due</th><th>Status</th><th>Action</th></tr></thead><tbody>${hist.map(h=>`<tr><td>${monthLabel(h.m)}</td><td class="${h.rent?"money-red":"money-green"}">${money(h.rent)}</td><td class="${h.ele?"money-red":"money-green"}">${money(h.ele)}</td><td>${statusBadge(h.status)}</td><td><button class="btn btn-soft" data-action="view-month" data-id="${t.id}" data-month="${h.m}">View</button></td></tr>`).join("")}</tbody></table></div>`)
}
function renderRooms(){
 const q=(STATE.q||"").toLowerCase(), f=STATE.filter||"all";
 let rooms=DATA.rooms.filter(r=>r.roomNumber.toLowerCase().includes(q));
 if(f==="occupied")rooms=rooms.filter(r=>occupancy(r.id)>0);if(f==="available")rooms=rooms.filter(r=>occupancy(r.id)<r.capacity);
 return shell(`<div class="title-row"><div><h1 class="page-title">Rooms <span class="badge badge-info">${DATA.rooms.length}</span></h1><p class="page-subtitle">${DATA.rooms.filter(r=>occupancy(r.id)>0).length} occupied • ${DATA.tenants.length} tenants</p></div><button class="btn btn-primary" data-action="add-room">+ Add Room</button></div>
 <div class="search">⌕<input id="list-search" value="${esc(STATE.q||"")}" placeholder="Search room number..."></div>
 <div class="filters"><button class="filter-chip ${f==="all"?"active":""}" data-filter="all">All (${DATA.rooms.length})</button><button class="filter-chip ${f==="occupied"?"active":""}" data-filter="occupied">Occupied (${DATA.rooms.filter(r=>occupancy(r.id)>0).length})</button><button class="filter-chip ${f==="available"?"active":""}" data-filter="available">Available (${DATA.rooms.filter(r=>occupancy(r.id)<r.capacity).length})</button></div>
 <div class="card list-card">${rooms.map(r=>{const ts=DATA.tenants.filter(t=>t.roomId===r.id),rf=roomFinancials(r.id,STATE.month);return `<div class="list-row clickable" data-room="${r.id}">${iconCircle("rooms")}<div class="row-main"><div class="row-name">Room ${r.roomNumber}</div><div class="row-meta">${ts.length} / ${r.capacity} occupied</div><div class="occupancy">${[0,1,2].map(i=>`<span class="occ ${i<ts.length?"filled":""}"></span>`).join("")}</div></div><div class="row-main">${ts.slice(0,3).map(t=>`<div class="row-meta"><b>${initials(t.name)}</b> ${esc(t.name)}</div>`).join("")}</div><div class="row-side"><div class="row-meta">Monthly Rent</div><b>${money(r.monthlyRent)}</b><div class="row-meta">Outstanding</div><b class="${rf.rentOutstanding+rf.eleOutstanding?"money-red":"money-green"}">${money(rf.rentOutstanding+rf.eleOutstanding)}</b></div><span class="chevron">›</span></div>`}).join("")||`<div class="empty">No rooms found.</div>`}</div>`)
}
function addRoomForm(editId=null){
 const r=editId?roomById(editId):{roomNumber:"",capacity:3,monthlyRent:7500,type:"shared"};
 return shell(`<div class="title-row"><div><h1 class="page-title">${editId?"Edit Room":"Add Room"}</h1><p class="page-subtitle">${editId?"Update room details":"Create a new hostel room"}</p></div></div>
 <form id="room-form" class="card pad form-grid"><input type="hidden" name="id" value="${esc(editId||"")}">
 <div class="field"><label>Room Number *</label><input class="input" name="roomNumber" value="${esc(r.roomNumber)}" required></div>
 <div class="field"><label>Maximum Occupancy *</label><input class="input" name="capacity" type="number" min="1" max="3" value="${r.capacity}" ${r.type==="shared"?"":"disabled"} required><div class="help">Shared rooms have a maximum capacity of 3.</div></div>
 <div class="field"><label>Monthly Room Rent *</label><input class="input" name="monthlyRent" type="number" min="0" value="${r.monthlyRent}" required></div>
 <div class="field"><label>Monthly Rent Per Tenant *</label><input class="input" value="${DATA.settings.tenantRent}" disabled></div>
 <div class="field"><label>Room Type</label><select class="select" name="type"><option value="shared" ${r.type==="shared"?"selected":""}>Shared</option><option value="single" ${r.type==="single"?"selected":""}>Single</option></select></div>
 <button class="btn btn-primary btn-block" type="submit">Save Room</button></form>`)
}
function renderRoomDetail(id){
 const r=roomById(id);if(!r)return go("rooms");const ts=DATA.tenants.filter(t=>t.roomId===id),rf=roomFinancials(id,STATE.month),bill=rf.bill;
 return shell(`<div class="card pad"><div class="between"><div class="room-head">${iconCircle("rooms")}<div><h1 style="margin:0;font-size:27px">Room ${r.roomNumber}</h1><div class="row-meta" style="font-size:16px">${ts.length} / ${r.capacity} occupied</div><div class="row-meta">Shared room • ${ts.length} tenants</div><div class="occupancy">${[0,1,2].map(i=>`<span class="occ ${i<ts.length?"filled":""}"></span>`).join("")}</div></div></div><button class="btn btn-soft" data-action="edit-room" data-id="${r.id}">✎ Edit Room</button></div></div>
 <div class="kv-grid" style="margin-top:12px"><div class="kv"><div class="k">Total Monthly Rent</div><div class="v">${money(r.monthlyRent)}</div><div class="row-meta">${money(DATA.settings.tenantRent)} per tenant</div></div><div class="kv" style="background:#FFF9E9"><div class="k">Electricity Bill</div><div class="v money-amber">${money(bill)}</div><button class="btn btn-soft" style="margin-top:9px" data-action="edit-electricity" data-room="${r.id}">Update Bill</button></div></div>
 <div class="section-title between"><span>Occupants (${ts.length})</span><button class="btn btn-soft" data-action="add-tenant-room" data-room="${r.id}">+ Add Tenant</button></div>
 <div class="card list-card">${ts.map(t=>`<div class="list-row clickable" data-tenant="${t.id}"><div class="avatar ${avatarClass(t.name)}">${initials(t.name)}</div><div class="row-main"><div class="row-name">${esc(t.name)}</div><div class="row-meta">${esc(t.phone)}</div></div><div class="row-main"><div class="row-meta">Rent (${money(t.monthlyRent)})</div>${statusBadge(statusFor(t,"rent",STATE.month))}</div><div class="row-main"><div class="row-meta">Electricity (${money(eleShare(t,STATE.month))})</div>${statusBadge(statusFor(t,"electricity",STATE.month))}</div><span class="chevron">›</span></div>`).join("")||`<div class="empty">No occupants.</div>`}</div>
 <div class="section-title between"><span>Room Financial Summary</span><span class="row-meta">${monthLabel(STATE.month)}</span></div>
 <div class="stat-grid"><div class="stat blue"><div class="label">Total Rent</div><div class="value">${money(rf.rentExpected)}</div><div class="hint">${money(DATA.settings.tenantRent)} × ${ts.length} tenants</div></div><div class="stat green"><div class="label">Rent Collected</div><div class="value money-green">${money(rf.rentCollected)}</div><div class="hint">${ts.filter(t=>statusFor(t,"rent",STATE.month)==="Paid").length} / ${ts.length} paid</div></div><div class="stat red"><div class="label">Rent Outstanding</div><div class="value money-red">${money(rf.rentOutstanding)}</div></div><div class="stat yellow"><div class="label">Electricity Bill</div><div class="value money-amber">${money(rf.bill)}</div></div><div class="stat blue"><div class="label">Electricity Collected</div><div class="value money-blue">${money(rf.eleCollected)}</div></div><div class="stat red"><div class="label">Electricity Outstanding</div><div class="value money-red">${money(rf.eleOutstanding)}</div></div></div>`)
}
function renderRent(){
 const q=(STATE.q||"").toLowerCase(), f=STATE.filter||"all",t=totals(STATE.month);
 let list=DATA.tenants.filter(x=>`${x.name} ${x.phone} ${roomById(x.roomId)?.roomNumber}`.toLowerCase().includes(q));
 list=list.filter(x=>{const s=statusFor(x,"rent",STATE.month);return f==="all"||s.toLowerCase()===f});
 return shell(`<div class="title-row"><div><h1 class="page-title">Rent Management</h1><p class="page-subtitle">Track monthly rent collection from tenants</p></div></div>${monthControl(STATE.month)}
 <div class="stat-grid"><div class="stat green"><div class="label">Collected</div><div class="value money-green">${money(t.rentCollected)}</div><div class="hint">${DATA.tenants.filter(x=>statusFor(x,"rent",STATE.month)==="Paid").length} of ${DATA.tenants.length} tenants</div></div><div class="stat red"><div class="label">Outstanding</div><div class="value money-red">${money(t.rentDue)}</div><div class="hint">${DATA.tenants.filter(x=>due(x,"rent",STATE.month)>0).length} tenants</div></div><div class="stat blue"><div class="label">Total Tenants</div><div class="value">${DATA.tenants.length}</div><div class="hint">Across ${DATA.rooms.length} rooms</div></div></div>
 <div class="between" style="margin:13px 0"><div class="filters" style="margin:0"><button class="filter-chip ${f==="all"?"active":""}" data-filter="all">All (${DATA.tenants.length})</button><button class="filter-chip ${f==="paid"?"active":""}" data-filter="paid">Paid</button><button class="filter-chip ${f==="unpaid"?"active":""}" data-filter="unpaid">Unpaid</button><button class="filter-chip ${f==="partial"?"active":""}" data-filter="partial">Partial</button></div><button class="btn btn-secondary" data-action="bulk-reminder">✉ Reminder</button></div>
 <div class="search">⌕<input id="list-search" value="${esc(STATE.q||"")}" placeholder="Search tenant or room number..."></div>
 <div class="table-wrap"><table><thead><tr><th>Tenant</th><th>Room</th><th>Rent</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${list.map(x=>{const paid=sum(paymentsFor(x.id,"rent",STATE.month)),d=due(x,"rent",STATE.month);return `<tr data-tenant="${x.id}" class="clickable"><td><b>${esc(x.name)}</b><br><span class="row-meta">${esc(x.phone)}</span></td><td>${roomById(x.roomId)?.roomNumber}</td><td>${money(x.monthlyRent)}</td><td class="money-green">${paid?money(paid):"-"}</td><td class="${d?"money-red":"money-green"}">${money(d)}</td><td>${statusBadge(statusFor(x,"rent",STATE.month))}</td><td>›</td></tr>`}).join("")}</tbody></table></div>`)
}
function renderElectricity(){
 const q=(STATE.q||"").toLowerCase(),f=STATE.filter||"all",t=totals(STATE.month);
 let list=DATA.tenants.filter(x=>`${x.name} ${x.phone} ${roomById(x.roomId)?.roomNumber}`.toLowerCase().includes(q)).filter(x=>{const s=statusFor(x,"electricity",STATE.month);return f==="all"||s.toLowerCase()===f});
 return shell(`<div class="title-row"><div><h1 class="page-title">Electricity Management</h1><p class="page-subtitle">Track room electricity bills and tenant payments</p></div>${monthControl(STATE.month)}</div>
 <div class="stat-grid"><div class="stat yellow"><div class="label">Total Electricity Bill</div><div class="value money-amber">${money(t.eleTotal)}</div><div class="hint">Room bills for ${monthLabel(STATE.month)}</div></div><div class="stat green"><div class="label">Collected</div><div class="value money-green">${money(t.eleCollected)}</div><div class="hint">Paid by tenants</div></div><div class="stat red"><div class="label">Outstanding</div><div class="value money-red">${money(t.eleDue)}</div><div class="hint">Pending amount</div></div></div>
 <div class="between" style="margin:13px 0"><div class="filters" style="margin:0"><button class="filter-chip ${f==="all"?"active":""}" data-filter="all">All</button><button class="filter-chip ${f==="paid"?"active":""}" data-filter="paid">Paid</button><button class="filter-chip ${f==="unpaid"?"active":""}" data-filter="unpaid">Unpaid</button><button class="filter-chip ${f==="partial"?"active":""}" data-filter="partial">Partial</button></div><button class="btn btn-secondary" data-action="bulk-reminder">✉ Reminder</button></div>
 <div class="search">⌕<input id="list-search" value="${esc(STATE.q||"")}" placeholder="Search tenant or room number..."></div>
 <div class="table-wrap"><table><thead><tr><th>Tenant</th><th>Room</th><th>Electricity</th><th>Paid</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>${list.map(x=>{const share=eleShare(x,STATE.month),paid=sum(paymentsFor(x.id,"electricity",STATE.month)),d=due(x,"electricity",STATE.month);return `<tr data-electricity-tenant="${x.id}"><td><b>${esc(x.name)}</b><br><span class="row-meta">${esc(x.phone)}</span></td><td>${roomById(x.roomId)?.roomNumber}</td><td>${money(share)}</td><td class="money-green">${paid?money(paid):"-"}</td><td class="${d?"money-red":"money-green"}">${money(d)}</td><td>${statusBadge(statusFor(x,"electricity",STATE.month))}</td><td>›</td></tr>`}).join("")}</tbody></table></div>
 <div class="section-title">Monthly Room Electricity Bills</div><div class="card list-card">${DATA.rooms.map(r=>{const b=billFor(r.id,STATE.month);return `<div class="list-row"><div class="icon-wrap icon-yellow">ϟ</div><div class="row-main"><div class="row-name">Room ${r.roomNumber}</div><div class="row-meta">${occupancy(r.id)} occupants • Equal split</div></div><div class="row-side"><b>${money(b?.totalBill||0)}</b><button class="btn btn-soft" data-action="edit-electricity" data-room="${r.id}">Edit Bill</button></div></div>`}).join("")}</div>`)
}
function renderElectricityDetail(id){
 const t=tenantById(id),share=eleShare(t,STATE.month),paid=sum(paymentsFor(t.id,"electricity",STATE.month)),d=due(t,"electricity",STATE.month),b=billFor(t.roomId,STATE.month);
 return shell(`<div class="card pad"><div class="detail-head">${iconCircle("electricity")}<div><div class="row-meta">${monthLabel(STATE.month)}</div><h1 style="margin:2px 0;font-size:28px">Electricity</h1><div class="row-meta">${esc(t.name)} • Room ${roomById(t.roomId)?.roomNumber}</div></div></div></div>
 <div class="stat-grid" style="margin-top:12px"><div class="stat yellow"><div class="label">Room Electricity Bill</div><div class="value money-amber">${money(b?.totalBill||0)}</div></div><div class="stat blue"><div class="label">Tenant Share</div><div class="value">${money(share)}</div></div><div class="stat green"><div class="label">Paid</div><div class="value money-green">${money(paid)}</div></div><div class="stat red"><div class="label">Outstanding</div><div class="value money-red">${money(d)}</div></div></div>
 <div class="notice warning" style="margin-top:12px">${d?money(d)+" is still pending for "+monthLabel(STATE.month)+".":"Electricity is fully paid for this month."}</div>
 <div class="detail-actions"><button class="btn btn-primary" data-action="record-payment" data-id="${t.id}" data-type="electricity">▣ Record Payment</button><button class="btn btn-soft" data-action="reminder" data-id="${t.id}">➤ Send Reminder</button></div>
 <div class="section-title">Payment History</div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Amount</th><th>Mode</th><th>Status</th></tr></thead><tbody>${paymentsFor(t.id,"electricity",STATE.month).map(p=>`<tr><td>${p.date}</td><td class="money-green">${money(p.amount)}</td><td>${esc(p.mode)}</td><td>${statusBadge("Paid")}</td></tr>`).join("")||`<tr><td colspan="4">No payments recorded.</td></tr>`}</tbody></table></div>
 <div class="card pad" style="margin-top:14px;background:#F3F7FD"><b>Billing Information</b><div class="info-row"><span class="info-label">Billing Month</span><span class="info-value">${monthLabel(STATE.month)}</span></div><div class="info-row"><span class="info-label">Room Electricity Bill</span><span class="info-value">${money(b?.totalBill||0)}</span></div><div class="info-row"><span class="info-label">Tenant Electricity Share</span><span class="info-value">${money(share)}</span></div></div>`)
}
function renderFinancial(){
 const tab=STATE.finTab||"rent",t=totals(STATE.month),ps=DATA.payments.filter(p=>p.month===STATE.month&&p.type===tab);
 return shell(`<div class="title-row"><div><h1 class="page-title">Financial Records</h1><p class="page-subtitle">View all rent and electricity payments</p></div></div>
 <div class="segment"><button class="${tab==="rent"?"active":""}" data-fin-tab="rent">Rent</button><button class="${tab==="electricity"?"active":""}" data-fin-tab="electricity">Electricity</button></div>
 <div class="filters"><button class="filter-chip active">${monthLabel(STATE.month)}</button><button class="filter-chip">All Tenants</button><button class="filter-chip">All Rooms</button><button class="filter-chip">All Status</button></div>
 <div class="card pad"><div class="between"><div><h2 style="margin:0">${monthLabel(STATE.month)}</h2><div class="row-meta">${tab==="rent"?"Rent":"Electricity"} Summary</div></div><button class="btn btn-secondary" data-action="export-csv">⇩ Export</button></div>
 <div class="stat-grid" style="margin-top:14px"><div class="stat blue"><div class="label">${tab==="rent"?"Total Expected Rent":"Total Electricity Bills"}</div><div class="value">${money(tab==="rent"?t.rentExpected:t.eleTotal)}</div></div><div class="stat green"><div class="label">Collected</div><div class="value money-green">${money(tab==="rent"?t.rentCollected:t.eleCollected)}</div></div><div class="stat red"><div class="label">Outstanding</div><div class="value money-red">${money(tab==="rent"?t.rentDue:t.eleDue)}</div></div></div></div>
 <div class="section-title">Payment Records</div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Tenant</th><th>Room</th><th>Amount</th><th>Payment Mode</th><th>Status</th></tr></thead><tbody>${ps.sort((a,b)=>b.date.localeCompare(a.date)).map(p=>{const x=tenantById(p.tenantId);return `<tr><td>${p.date}</td><td>${esc(x?.name)}</td><td>${roomById(p.roomId)?.roomNumber}</td><td class="money-green">${money(p.amount)}</td><td>${esc(p.mode)}</td><td>${statusBadge("Paid")}</td></tr>`}).join("")||`<tr><td colspan="6">No payment records.</td></tr>`}</tbody></table></div>`)
}
function renderMore(){
 return shell(`<div class="title-row"><div><h1 class="page-title">HS Height</h1><p class="page-subtitle">Hostel administration</p></div></div><div class="profile-banner"><div class="avatar">${initials(DATA.admin.name)}</div><div style="flex:1"><h2 style="margin:0">${esc(DATA.admin.name)}</h2><div class="row-meta">${esc(DATA.admin.phone)}</div><span class="badge badge-paid" style="margin-top:7px">✓ Admin Access</span></div><span class="chevron">›</span></div>
 <div class="section-title">Management</div><div class="card more-list">
 ${[
 ["rent","Rent","Manage rent, view dues and record payments","⌂"],
 ["electricity","Electricity","Manage bills, dues and payments","ϟ"],
 ["rooms","Rooms","Manage hostel rooms","▣"],
 ["financial","Financial Records","View all rent and electricity payments","▥"]
 ].map(x=>`<div class="more-item" data-more="${x[0]}"><div class="icon-wrap ${x[0]==="electricity"?"icon-yellow":x[0]==="financial"?"icon-purple":"icon-blue"}">${x[3]}</div><div class="mi-main"><div class="mi-title">${x[1]}</div><div class="mi-sub">${x[2]}</div></div><span class="chevron">›</span></div>`).join("")}</div>
 <div class="section-title">Account</div><div class="card more-list">
 <div class="more-item" data-more="profile">${iconCircle("tenant")}<div class="mi-main"><div class="mi-title">Admin Profile</div><div class="mi-sub">View and update your profile</div></div><span class="chevron">›</span></div>
 <div class="more-item" data-more="hostel">${iconCircle("rooms")}<div class="mi-main"><div class="mi-title">Hostel Information</div><div class="mi-sub">View hostel details</div></div><span class="chevron">›</span></div>
 <div class="more-item" data-action="logout">${iconCircle("tenant")}<div class="mi-main"><div class="mi-title">Logout</div><div class="mi-sub">Sign out from your account</div></div><span class="chevron">›</span></div></div>`)
}
function renderHostel(){
 const h=DATA.hostel;
 return shell(`<div class="title-row"><div><h1 class="page-title">Hostel Information</h1></div></div><div class="card pad"><div class="between"><div class="detail-head"><div class="avatar" style="width:78px;height:78px;font-size:24px">HS</div><div><h2 style="margin:0;font-size:27px">${esc(h.name)}</h2><div class="row-meta">Hostel Profile</div><span class="badge badge-paid" style="margin-top:7px">✓ Active</span></div></div><button class="btn btn-soft" data-action="edit-hostel">▣ Edit</button></div></div>
 <div class="section-title">Basic Information</div><div class="card pad"><div class="info-row"><span class="info-label">Hostel Name</span><span class="info-value">${esc(h.name)}</span></div><div class="info-row"><span class="info-label">Address</span><span class="info-value">${esc(h.address).replace(/\n/g,"<br>")}</span></div><div class="info-row"><span class="info-label">Owner Name</span><span class="info-value">${esc(h.ownerName)}</span></div><div class="info-row"><span class="info-label">Contact Number</span><span class="info-value">${esc(h.contact)}</span></div></div>
 <div class="section-title">Hostel Details</div><div class="card pad"><div class="info-row"><span class="info-label">Total Rooms</span><span class="info-value">${DATA.rooms.length}</span></div><div class="info-row"><span class="info-label">Students Per Room</span><span class="info-value">${h.roomCapacity} maximum</span></div><div class="info-row"><span class="info-label">Default Room Monthly Rent</span><span class="info-value">${money(h.defaultRoomRent)}</span></div><div class="info-row"><span class="info-label">Default Tenant Monthly Rent</span><span class="info-value">${money(h.defaultTenantRent)}</span></div><div class="info-row"><span class="info-label">Electricity Billing</span><span class="info-value">Separate from rent<br><span class="row-meta">Equal split among current room occupants</span></span></div></div>
 <div class="section-title">Additional Information</div><div class="card pad"><div class="info-row"><span class="info-label">Notes</span><span class="info-value">${esc(h.notes||"NA")}</span></div></div>`)
}
function hostelEdit(){
 const h=DATA.hostel;return shell(`<div class="title-row"><div><h1 class="page-title">Edit Hostel Information</h1></div></div><form id="hostel-form" class="card pad form-grid"><div class="field"><label>Hostel Name</label><input class="input" name="name" value="${esc(h.name)}" required></div><div class="field"><label>Address</label><textarea class="textarea" name="address">${esc(h.address)}</textarea></div><div class="field"><label>Owner Name</label><input class="input" name="ownerName" value="${esc(h.ownerName)}" required></div><div class="field"><label>Contact Number</label><input class="input" name="contact" value="${esc(h.contact)}" required></div><div class="field"><label>Default Room Monthly Rent</label><input class="input" type="number" name="defaultRoomRent" value="${h.defaultRoomRent}" required></div><div class="field"><label>Default Tenant Monthly Rent</label><input class="input" type="number" name="defaultTenantRent" value="${h.defaultTenantRent}" required></div><div class="field"><label>Maximum Students Per Shared Room</label><input class="input" type="number" name="roomCapacity" value="3" min="1" max="3" required></div><div class="field"><label>Notes</label><textarea class="textarea" name="notes">${esc(h.notes||"")}</textarea></div><button class="btn btn-primary btn-block">Save Changes</button></form>`)
}
function adminProfile(){
 const a=DATA.admin;return shell(`<div class="title-row"><div><h1 class="page-title">Admin Profile</h1><p class="page-subtitle">View and update your profile</p></div></div><form id="admin-form" class="card pad form-grid"><div class="profile-banner"><div class="avatar">${initials(a.name)}</div><div><b>${esc(a.name)}</b><div class="row-meta">${esc(a.phone)}</div></div></div><div class="field"><label>Admin Name</label><input class="input" name="name" value="${esc(a.name)}" required></div><div class="field"><label>Mobile Number</label><input class="input" name="phone" value="${esc(a.phone)}" required></div><div class="field"><label>Email (optional)</label><input class="input" name="email" type="email" value="${esc(a.email||"")}"></div><button class="btn btn-primary btn-block">Save Profile</button></form>`)
}
function render(){
 const app=$("#app");
 if(!STATE.loggedIn){app.innerHTML=renderLogin();return}
 let html="";
 switch(STATE.route){
  case"home":html=renderHome();break;case"tenants":html=renderTenants();break;case"tenantForm":html=tenantForm(STATE.params.id);break;case"tenantDetail":html=renderTenantDetail(STATE.params.id);break;
  case"rooms":html=renderRooms();break;case"roomForm":html=addRoomForm(STATE.params.id);break;case"roomDetail":html=renderRoomDetail(STATE.params.id);break;
  case"rent":html=renderRent();break;case"electricity":html=renderElectricity();break;case"electricityDetail":html=renderElectricityDetail(STATE.params.id);break;
  case"financial":html=renderFinancial();break;
  case"more":html=renderMore();break;case"hostel":html=renderHostel();break;case"hostelEdit":html=hostelEdit();break;case"profile":html=adminProfile();break;default:STATE.route="home";html=renderHome();
 }
 app.innerHTML=html;
}
const STATE={route:"home",params:{},month:DATA.settings.month,q:"",filter:"all",finTab:"rent",loggedIn:false};
function openSheet(content){
 const root=$("#modal-root");root.innerHTML=`<div class="modal-backdrop"><section class="sheet" data-sheet>${content}</section></div>`;
}
function closeModal(){$("#modal-root").innerHTML=""}
function recordPaymentSheet(id,type="rent"){
 const t=tenantById(id),r=roomById(t.roomId),rentDue=due(t,"rent",STATE.month),eleDue=due(t,"electricity",STATE.month),sel=type;
 openSheet(`<div class="drag"></div><div class="sheet-head"><div><h2>Record Payment</h2><p class="sheet-sub">Add a new payment for this tenant</p></div><button class="close" data-action="close-modal">×</button></div>
 <div class="card pad"><b>${esc(t.name)}</b><div class="row-meta">+91 ${esc(t.phone.replace(/^\+91\s*/,""))} • Room ${r.roomNumber}</div></div>
 <div class="segment"><button class="${sel==="rent"?"active":""}" data-pay-type="rent">⌂ Rent</button><button class="${sel==="electricity"?"active":""}" data-pay-type="electricity">ϟ Electricity</button></div>
 <div id="payment-summary">${paymentFields(t,sel,rentDue,eleDue)}</div>`)
}
function paymentFields(t,type,rentDue,eleDue){
 const d=type==="rent"?rentDue:eleDue, share=eleShare(t,STATE.month),b=billFor(t.roomId,STATE.month);
 return `<form id="payment-form" class="form-grid"><input type="hidden" name="tenantId" value="${t.id}"><input type="hidden" name="type" value="${type}"><div class="notice">${type==="rent"?`Amount Due: <b>${money(d)}</b>`:`Room Electricity Bill: <b>${money(b?.totalBill||0)}</b><br>Tenant Electricity Share: <b>${money(share)}</b><br>Amount Already Paid: <b>${money(sum(paymentsFor(t.id,"electricity",STATE.month)))}</b><br>Remaining Due: <b>${money(d)}</b>`}</div><div class="field"><label>Amount Paid *</label><input class="input" name="amount" type="number" min="1" max="${d}" placeholder="Enter amount" required></div><div class="field"><label>Payment Date *</label><input class="input" name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></div><div class="field"><label>Payment Mode</label><select class="select" name="mode"><option>Cash</option><option>UPI</option><option>Bank Transfer</option><option>Other</option></select></div><div class="field"><label>Note (Optional)</label><input class="input" name="note" placeholder="Add a note"></div><button class="btn btn-primary btn-block">Save Payment</button></form>`
}
function reminderSheet(prefillId=null){
 const dueTenants=DATA.tenants.filter(t=>totalDue(t,STATE.month)>0), selected=prefillId?[prefillId]:dueTenants.map(t=>t.id);
 const rentDue=dueTenants.filter(t=>due(t,"rent",STATE.month)>0),eleDue=dueTenants.filter(t=>due(t,"electricity",STATE.month)>0);
 openSheet(`<div class="drag"></div><div class="sheet-head"><div><h2>Send Reminder</h2><p class="sheet-sub">Prepare a payment reminder for selected tenants</p></div><button class="close" data-action="close-modal">×</button></div>
 <div class="card pad" style="background:#F2F7FF"><div class="between"><b>${selected.length} tenants selected</b><span>Due: ${money(selected.reduce((a,id)=>a+totalDue(tenantById(id),STATE.month),0))}</span></div><div class="grid grid-2" style="margin-top:10px"><div class="due-card"><b>${rentDue.length}</b><div class="row-meta">rent due • ${money(sum(rentDue.map(t=>due(t,"rent",STATE.month))))}</div></div><div class="due-card"><b>${eleDue.length}</b><div class="row-meta">electricity due • ${money(sum(eleDue.map(t=>due(t,"electricity",STATE.month))))}</div></div></div></div>
 <div class="field" style="margin-top:15px"><label>Recipients</label><select id="reminder-scope" class="select"><option value="all">All due tenants</option><option value="rent">Rent due tenants</option><option value="electricity">Electricity due tenants</option><option value="selected">Selected tenant(s)</option></select></div>
 <div class="field"><label>Message</label><button class="btn btn-soft" data-action="default-message">Use Default Message</button><textarea id="reminder-message" class="textarea" style="margin-top:8px">Your hostel payment is pending for ${monthLabel(STATE.month)}. Please clear your due amount at the earliest. If you have already paid, kindly ignore this message.</textarea><div class="help">Prototype only — no SMS/WhatsApp is sent.</div></div>
 <div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Cancel</button><button class="btn btn-primary" data-action="send-reminder" data-tenant="${prefillId||""}">➤ Send Reminder</button></div>`)
}
function editElectricitySheet(roomId){
 const b=billFor(roomId,STATE.month),r=roomById(roomId);openSheet(`<div class="drag"></div><div class="sheet-head"><div><h2>Room Electricity Bill</h2><p class="sheet-sub">Room ${r.roomNumber} • ${monthLabel(STATE.month)}</p></div><button class="close" data-action="close-modal">×</button></div><form id="electricity-form" class="form-grid"><input type="hidden" name="roomId" value="${roomId}"><div class="field"><label>Total Electricity Bill *</label><input class="input" name="totalBill" type="number" min="0" value="${b?.totalBill||0}" required></div><div class="notice">The bill is allocated equally among current occupants. Current occupancy: <b>${occupancy(roomId)}</b>. Share updates automatically.</div><button class="btn btn-primary btn-block">Save Electricity Bill</button></form>`)
}
function exportCSV(){
 const rows=[["Date","Tenant","Room","Type","Amount","Payment Mode","Month"]];
 DATA.payments.filter(p=>p.month===STATE.month).forEach(p=>{const t=tenantById(p.tenantId);rows.push([p.date,t?.name||"",roomById(p.roomId)?.roomNumber||"",p.type,p.amount,p.mode,p.month])});
 const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`hs-height-financial-${STATE.month}.csv`;a.click();URL.revokeObjectURL(url);toast("CSV exported successfully")
}
document.addEventListener("click",e=>{
 if(e.target.classList?.contains("modal-backdrop")){closeModal();return}
 const el=e.target.closest("[data-action],[data-nav],[data-filter],[data-month],[data-tenant],[data-room],[data-electricity-tenant],[data-more],[data-fin-tab],[data-pay-type]");
 if(!el)return;
 if(el.dataset.nav){STATE.q="";STATE.filter="all";go(el.dataset.nav);return}
 if(el.dataset.month){changeMonth(Number(el.dataset.month));return}
 if(el.dataset.filter){STATE.filter=el.dataset.filter;render();return}
 if(el.dataset.tenant){go("tenantDetail",{id:el.dataset.tenant});return}
 if(el.dataset.room){go("roomDetail",{id:el.dataset.room});return}
  if(el.dataset.electricityTenant){go("electricityDetail",{id:el.dataset.electricityTenant});return}
 if(el.dataset.finTab){STATE.finTab=el.dataset.finTab;render();return}
 if(el.dataset.payType){const form=$("#payment-form");if(form){const t=tenantById(form.tenantId.value);$("#payment-summary").innerHTML=paymentFields(t,el.dataset.payType,due(t,"rent",STATE.month),due(t,"electricity",STATE.month));document.querySelectorAll("[data-pay-type]").forEach(x=>x.classList.toggle("active",x.dataset.payType===el.dataset.payType));}return}
 if(el.dataset.more){const m=el.dataset.more;({rent:()=>go("rent"),electricity:()=>go("electricity"),rooms:()=>go("rooms"),financial:()=>go("financial"),profile:()=>go("profile"),hostel:()=>go("hostel")}[m]||(()=>{}))();return}
 const a=el.dataset.action;
 if(a==="login"){const inp=$("#login-phone"),v=inp.value.replace(/\D/g,"");if(!/^\d{10}$/.test(v)){$("#login-error").textContent="Enter a valid 10-digit mobile number.";return}localStorage.setItem(AUTH_KEY,"+91 "+v);STATE.loggedIn=true;go("home");toast("Welcome to HS Height");return}
 if(a==="back"){if(history.state?.route){history.back()}else{go(activeTab())}return}
 if(a==="profile")go("profile");
 if(a==="menu")go("more");
 if(a==="go-tenants")go("tenants");if(a==="go-rooms")go("rooms");if(a==="go-rent")go("rent");if(a==="go-rent-due"){STATE.filter="unpaid";go("rent")}if(a==="go-electricity")go("electricity");if(a==="go-financial")go("financial");
 if(a==="add-tenant")go("tenantForm");if(a==="edit-tenant")go("tenantForm",{id:el.dataset.id});
 if(a==="add-tenant-room"){STATE.prefillRoom=el.dataset.room;go("tenantForm")}
 if(a==="add-room")go("roomForm");if(a==="edit-room")go("roomForm",{id:el.dataset.id});
 if(a==="record-payment")recordPaymentSheet(el.dataset.id,el.dataset.type||"rent");if(a==="reminder")reminderSheet(el.dataset.id);if(a==="bulk-reminder")reminderSheet();
 if(a==="edit-electricity")editElectricitySheet(el.dataset.room);
 if(a==="close-modal")closeModal();if(a==="default-message"){$("#reminder-message").value=`Your hostel payment is pending for ${monthLabel(STATE.month)}. Please clear your due amount at the earliest. If you have already paid, kindly ignore this message.`}
 if(a==="send-reminder"){const scope=$("#reminder-scope")?.value||"all",ids=scope==="rent"?DATA.tenants.filter(t=>due(t,"rent",STATE.month)>0).map(t=>t.id):scope==="electricity"?DATA.tenants.filter(t=>due(t,"electricity",STATE.month)>0).map(t=>t.id):el.dataset.tenant?[el.dataset.tenant]:DATA.tenants.filter(t=>totalDue(t,STATE.month)>0).map(t=>t.id);DATA.reminders.push({month:STATE.month,tenantIds:ids,message:$("#reminder-message").value,createdAt:new Date().toISOString()});saveData();closeModal();toast("Reminder prepared successfully")}
 if(a==="export-csv")exportCSV();
   if(a==="logout"){openConfirm("Logout?","You will return to the login screen. Your hostel data will remain saved.",()=>{localStorage.removeItem(AUTH_KEY);STATE.loggedIn=false;closeModal();render()})}
});
document.addEventListener("input",e=>{if(e.target.id==="list-search"){STATE.q=e.target.value;render()}})
document.addEventListener("submit",e=>{
 e.preventDefault();const f=e.target,fd=new FormData(f);
 if(f.id==="tenant-form"){const id=fd.get("id"),phone=String(fd.get("phone")).replace(/\D/g,""),roomId=fd.get("roomId");if(!/^\d{10}$/.test(phone)){toast("Enter a valid 10-digit mobile number.","error");return}const room=roomById(roomId);if(!room){toast("Select a room.","error");return}if(!id&&occupancy(roomId)>=room.capacity){toast("This room is already full. Maximum occupancy is 3 tenants.","error");return}if(id){const t=tenantById(id);Object.assign(t,{name:fd.get("name"),phone:"+91 "+phone,roomId,monthlyRent:Number(fd.get("monthlyRent")),joiningDate:fd.get("joiningDate")});toast("Tenant updated successfully")}else{const t={id:"tenant_"+Date.now(),name:fd.get("name"),phone:"+91 "+phone,roomId,monthlyRent:Number(fd.get("monthlyRent")),joiningDate:fd.get("joiningDate")};DATA.tenants.push(t);toast("Tenant added successfully")}saveData();delete STATE.prefillRoom;go(id?"tenantDetail":"tenants",{id:id||""});return}
 if(f.id==="room-form"){const id=fd.get("id"),num=String(fd.get("roomNumber")).trim(),cap=Math.min(3,Math.max(1,Number(fd.get("capacity"))));if(!num){toast("Enter a room number.","error");return}if(DATA.rooms.some(r=>r.roomNumber===num&&r.id!==id)){toast("Room number already exists.","error");return}if(id){const r=roomById(id),occ=occupancy(id);if(cap<occ){toast(`Room has ${occ} occupants. Capacity cannot be reduced below occupancy.`,"error");return}Object.assign(r,{roomNumber:num,capacity:cap,monthlyRent:Number(fd.get("monthlyRent")),type:fd.get("type")});toast("Room updated successfully")}else{DATA.rooms.push({id:"room_"+Date.now(),roomNumber:num,capacity:cap,monthlyRent:Number(fd.get("monthlyRent")),type:fd.get("type")});toast("Room added successfully")}saveData();go("rooms");return}
 if(f.id==="payment-form"){const tenant=tenantById(fd.get("tenantId")),type=fd.get("type"),amount=Number(fd.get("amount")),remaining=due(tenant,type,STATE.month);if(!amount||amount<=0){toast("Enter a valid payment amount.","error");return}if(amount>remaining){toast("Payment cannot exceed the remaining due amount.","error");return}DATA.payments.push({id:"payment_"+Date.now(),tenantId:tenant.id,roomId:tenant.roomId,type,month:STATE.month,amount,date:fd.get("date"),mode:fd.get("mode"),note:fd.get("note")});saveData();closeModal();toast("Payment recorded successfully");render();return}
 if(f.id==="electricity-form"){const roomId=fd.get("roomId"),month=STATE.month,totalBill=Number(fd.get("totalBill"));if(totalBill<0){toast("Enter a valid electricity bill amount.","error");return}let b=billFor(roomId,month);if(b)b.totalBill=totalBill;else DATA.electricityBills.push({id:`electricity_${roomId}_${month}`,roomId,month,totalBill});saveData();closeModal();toast("Electricity bill updated successfully");render();return}
  if(f.id==="hostel-form"){Object.assign(DATA.hostel,{name:fd.get("name"),address:fd.get("address"),ownerName:fd.get("ownerName"),contact:fd.get("contact"),defaultRoomRent:Number(fd.get("defaultRoomRent")),defaultTenantRent:Number(fd.get("defaultTenantRent")),roomCapacity:Math.min(3,Number(fd.get("roomCapacity"))),notes:fd.get("notes")});DATA.settings.roomRent=DATA.hostel.defaultRoomRent;DATA.settings.tenantRent=DATA.hostel.defaultTenantRent;saveData();toast("Hostel information updated");go("hostel");return}
 if(f.id==="admin-form"){DATA.admin={name:fd.get("name"),phone:fd.get("phone"),email:fd.get("email")};saveData();toast("Admin profile updated");go("profile");return}
});
function openConfirm(title,msg,yes){$("#modal-root").innerHTML=`<div class="modal-backdrop"><section class="dialog"><div class="dialog-head"><div><h2>${esc(title)}</h2><p class="sheet-sub">${esc(msg)}</p></div></div><div class="modal-actions"><button class="btn btn-secondary" data-action="close-modal">Cancel</button><button class="btn btn-danger" id="confirm-yes">Confirm</button></div></section></div>`;$("#confirm-yes").onclick=yes}
window.addEventListener("popstate",render);
render();
