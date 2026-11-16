let currentUser = null;
function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function showToast(msg, type) {
  type = type || 'primary';
  const id = 'toast_' + Date.now();
  const html = '<div id="' + id + '" class="toast align-items-center text-bg-' + type + ' border-0"><div class="d-flex"><div class="toast-body">' + msg + '</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div></div>';
  document.querySelector('#toastContainer').insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  const t = new bootstrap.Toast(el, { delay: 2800 });
  t.show();
  el.addEventListener('hidden.bs.toast', function() { el.remove(); });
}
function statusBadge(mapType, status) {
  const label = (STATUS_MAP[mapType] || {})[status] || status;
  return '<span class="badge rounded-pill badge-status-' + status + '">' + label + '</span>';
}
function canApprove() { return currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager'); }
function isAdmin() { return currentUser && currentUser.role === 'admin'; }
function exportExcel(rows, columns, filename) {
  const BOM = '\uFEFF';
  const esc = function(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  let csv = columns.map(function(c) { return esc(c.title); }).join(',') + '\n';
  rows.forEach(function(row) { csv += columns.map(function(c) { return esc(row[c.key]); }).join(',') + '\n'; });
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (filename || 'export') + '.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('\u5df2\u5bfc\u51fa ' + filename + '.csv', 'success');
}

function applyRoleUI() { $$('.admin-nav').forEach(function(el) { el.style.display = isAdmin() ? '' : 'none'; }); }
function showLogin() { $('#loginPage').style.display = ''; $('#appPage').style.display = 'none'; }
function showApp() {
  $('#loginPage').style.display = 'none';
  $('#appPage').style.display = 'block';
  $('#currentUserName').textContent = currentUser.name;
  $('#currentUserRole').textContent = ROLE_MAP[currentUser.role] || currentUser.role;
  applyRoleUI();
  navigate('dashboard');
}
function navigate(panel) {
  $$('.content-panel').forEach(function(p) { p.classList.remove('active'); });
  var el = $('#panel-' + panel);
  if (el) el.classList.add('active');
  $$('#sidebarNav .nav-link').forEach(function(a) { a.classList.toggle('active', a.dataset.panel === panel); });
  var titles = { dashboard:'\u5de5\u4f5c\u53f0', procurement:'\u91c7\u8d2d\u7533\u8bf7', stock:'\u8bbe\u5907\u5165\u5e93', equipment:'\u8bbe\u5907\u53f0\u8d26', maintenance:'\u7ef4\u4fee\u7ba1\u7406', scrap:'\u62a5\u5e9f\u5ba1\u6279', stats:'\u67e5\u8be2\u7edf\u8ba1', users:'\u7528\u6237\u7ba1\u7406', settings:'\u7cfb\u7edf\u8bbe\u7f6e' };
  $('#pageTitle').textContent = titles[panel] || panel;
  var R = { dashboard:renderDashboard, procurement:renderProcurement, stock:refreshStockProcOptions, equipment:renderEquipment, maintenance:renderMaintenance, scrap:renderScrap, stats:renderStats, users:renderUsers, settings:loadSettings };
  if (R[panel]) R[panel]();
}
function doLogin(e) {
  e.preventDefault();
  var u = $('#loginUsername').value.trim(), p = $('#loginPassword').value;
  var user = LEMS.getUsers().find(function(x) { return x.username === u && x.password === p; });
  if (!user) { showToast('\u7528\u6237\u540d\u6216\u5bc6\u7801\u9519\u8bef', 'danger'); return; }
  currentUser = { id:user.id, username:user.username, name:user.name, role:user.role, department:user.department };
  LEMS.setSession(currentUser);
  showApp();
  showToast('\u6b22\u8fce\uff0c' + user.name, 'success');
}
function logout() { LEMS.clearSession(); currentUser = null; showLogin(); }
function checkSession() { var s = LEMS.getSession(); if (s) { currentUser = s; showApp(); } else showLogin(); }
function renderDashboard() {
  var eq = LEMS.getEquipment(), proc = LEMS.getProcurements(), scrap = LEMS.getScrap();
  $('#statTotal').textContent = eq.length;
  $('#statInUse').textContent = eq.filter(function(e){return e.status==='in_use';}).length;
  $('#statMaint').textContent = eq.filter(function(e){return e.status==='maintenance';}).length;
  $('#statPendingProc').textContent = proc.filter(function(p){return p.status==='pending';}).length;
  $('#statPendingScrap').textContent = scrap.filter(function(s){return s.status==='pending';}).length;
  var acts = [];
  proc.forEach(function(p){acts.push({t:p.applyDate,text:'[\u91c7\u8d2d] '+p.applicantName+' '+p.name});});
  eq.forEach(function(e){acts.push({t:e.warehouseDate,text:'[\u5165\u5e93] '+e.code+' '+e.name});});
  acts.sort(function(a,b){return new Date(b.t)-new Date(a.t);});
  $('#recentList').innerHTML = acts.slice(0,12).map(function(a){return '<li class="list-group-item small">'+LEMS.formatDate(a.t)+' '+a.text+'</li>';}).join('') || '<li class="list-group-item text-muted">\u6682\u65e0</li>';
}
function renderProcurement() {
  var status = $('#procFilterStatus').value, kw = ($('#procSearch').value||'').toLowerCase(), list = LEMS.getProcurements();
  if (status) list = list.filter(function(p){return p.status===status;});
  if (kw) list = list.filter(function(p){return (p.name+p.applicantName).toLowerCase().indexOf(kw)>=0;});
  list.sort(function(a,b){return new Date(b.applyDate)-new Date(a.applyDate);});
  $('#procurementTableBody').innerHTML = list.map(function(p){
    var ops = '';
    if (canApprove() && p.status==='pending') ops += '<button class="btn btn-success btn-sm" onclick="approveProc(\''+p.id+'\',1)">\u6279\u51c6</button> <button class="btn btn-danger btn-sm" onclick="approveProc(\''+p.id+'\',0)">\u9a73\u56de</button> ';
    if (p.status==='approved') ops += '<button class="btn btn-primary btn-sm" onclick="goStock(\''+p.id+'\')">\u5165\u5e93</button> ';
    return '<tr><td>'+(p.orderNo||'')+'</td><td>'+p.name+'</td><td>'+(p.model||'-')+'</td><td>'+p.quantity+'</td><td>'+p.budget+'</td><td>'+p.applicantName+'</td><td>'+statusBadge('procurement',p.status)+'</td><td>'+LEMS.formatDate(p.applyDate)+'</td><td>'+ops+'</td></tr>';
  }).join('') || '<tr><td colspan="9" class="text-center text-muted">\u6682\u65e0</td></tr>';
}
function openProcurementModal() { $('#procurementForm').reset(); new bootstrap.Modal('#procurementModal').show(); }
function saveProcurement(e) {
  e.preventDefault();
  var list = LEMS.getProcurements();
  list.push({ id:LEMS.uid(), orderNo:'CG'+Date.now().toString().slice(-10), name:$('#procName').value.trim(), model:$('#procModel').value.trim(), category:$('#procCategory').value.trim(), quantity:parseInt($('#procQuantity').value,10)||1, budget:parseFloat($('#procBudget').value)||0, unitPrice:parseFloat($('#procUnitPrice').value)||0, supplier:$('#procSupplier').value.trim(), reason:$('#procReason').value.trim(), applicantId:currentUser.id, applicantName:currentUser.name, status:'pending', applyDate:new Date().toISOString() });
  LEMS.saveProcurements(list);
  bootstrap.Modal.getInstance($('#procurementModal')).hide();
  showToast('\u5df2\u63d0\u4ea4', 'success');
  renderProcurement();
}
function approveProc(id, ok) {
  var list = LEMS.getProcurements(), p = list.find(function(x){return x.id===id;});
  if (!p) return;
  p.status = ok ? 'approved' : 'rejected';
  p.approverName = currentUser.name;
  LEMS.saveProcurements(list);
  showToast(ok ? '\u5df2\u6279\u51c6' : '\u5df2\u9a73\u56de', ok?'success':'warning');
  renderProcurement(); renderDashboard();
}
function goStock(pid) { navigate('stock'); $('#stockProcurementId').value = pid; fillStockFromProc(pid); }
function exportProcurement() {
  exportExcel(LEMS.getProcurements().map(function(p){return {orderNo:p.orderNo,name:p.name,model:p.model,quantity:p.quantity,budget:p.budget,applicantName:p.applicantName,statusText:STATUS_MAP.procurement[p.status],applyDate:LEMS.formatDate(p.applyDate)};}), [{key:'orderNo',title:'\u5355\u53f7'},{key:'name',title:'\u540d\u79f0'},{key:'model',title:'\u578b\u53f7'},{key:'quantity',title:'\u6570\u91cf'},{key:'budget',title:'\u9884\u7b97'},{key:'applicantName',title:'\u7533\u8bf7\u4eba'},{key:'statusText',title:'\u72b6\u6001'},{key:'applyDate',title:'\u65f6\u95f4'}], '\u91c7\u8d2d\u7533\u8bf7');
}
function refreshStockProcOptions() {
  var sel = $('#stockProcurementId'), approved = LEMS.getProcurements().filter(function(p){return p.status==='approved';});
  sel.innerHTML = '<option value="">\u624b\u52a8\u5165\u5e93</option>' + approved.map(function(p){return '<option value="'+p.id+'">'+p.name+'</option>';}).join('');
}
function fillStockFromProc(pid) {
  var p = LEMS.getProcurements().find(function(x){return x.id===pid;});
  if (!p) return;
  $('#stockName').value = p.name; $('#stockModel').value = p.model||''; $('#stockCategory').value = p.category||'';
  $('#stockPrice').value = p.unitPrice || (p.budget/(p.quantity||1));
}
function submitStock(e) {
  e.preventDefault();
  var code = LEMS.generateEquipmentCode(), procId = $('#stockProcurementId').value;
  var eq = { id:LEMS.uid(), code:code, name:$('#stockName').value.trim(), model:$('#stockModel').value.trim(), category:$('#stockCategory').value.trim(), brand:$('#stockBrand').value.trim(), price:parseFloat($('#stockPrice').value)||0, location:$('#stockLocation').value.trim(), keeper:$('#stockKeeper').value.trim()||currentUser.name, status:'in_use', warehouseDate:new Date().toISOString(), remark:$('#stockRemark').value.trim() };
  var list = LEMS.getEquipment(); list.push(eq); LEMS.saveEquipment(list);
  if (procId) { var procs = LEMS.getProcurements(), pr = procs.find(function(x){return x.id===procId;}); if (pr){pr.status='stocked';LEMS.saveProcurements(procs);} }
  $('#stockResult').classList.remove('d-none');
  $('#stockResult').innerHTML = '<strong>\u5165\u5e93\u6210\u529f</strong> \u7f16\u53f7: <code>'+code+'</code>';
  $('#stockForm').reset(); refreshStockProcOptions();
  showToast('\u5165\u5e93\u6210\u529f '+code, 'success'); renderDashboard();
}
function renderEquipment() {
  var kw = ($('#eqSearch').value||'').toLowerCase(), st = $('#eqFilterStatus').value, list = LEMS.getEquipment();
  if (st) list = list.filter(function(e){return e.status===st;});
  if (kw) list = list.filter(function(e){return (e.code+e.name+e.location||'').toLowerCase().indexOf(kw)>=0;});
  $('#equipmentTableBody').innerHTML = list.map(function(e){
    return '<tr><td><code>'+e.code+'</code></td><td>'+e.name+'</td><td>'+(e.model||'-')+'</td><td>'+(e.category||'-')+'</td><td>'+(e.price||'-')+'</td><td>'+(e.location||'-')+'</td><td>'+(e.keeper||'-')+'</td><td>'+statusBadge('equipment',e.status)+'</td><td>'+LEMS.formatDateOnly(e.warehouseDate)+'</td><td><button class="btn btn-sm btn-outline-primary" onclick="showEquipmentDetail(\''+e.id+'\')">\u8be6\u60c5</button></td></tr>';
  }).join('') || '<tr><td colspan="10">\u6682\u65e0</td></tr>';
}
function showEquipmentDetail(id) {
  var e = LEMS.getEquipment().find(function(x){return x.id===id;});
  if (!e) return;
  $('#equipmentDetailBody').innerHTML = '<p><b>\u7f16\u53f7</b> '+e.code+'</p><p><b>\u540d\u79f0</b> '+e.name+'</p><p><b>\u72b6\u6001</b> '+statusBadge('equipment',e.status)+'</p><p><b>\u4f4d\u7f6e</b> '+(e.location||'-')+'</p>';
  new bootstrap.Modal('#equipmentDetailModal').show();
}
function exportEquipment() {
  exportExcel(LEMS.getEquipment().map(function(e){return {code:e.code,name:e.name,model:e.model,category:e.category,price:e.price,location:e.location,keeper:e.keeper,statusText:STATUS_MAP.equipment[e.status]};}), [{key:'code',title:'\u7f16\u53f7'},{key:'name',title:'\u540d\u79f0'},{key:'model',title:'\u578b\u53f7'},{key:'category',title:'\u7c7b\u522b'},{key:'price',title:'\u5355\u4ef7'},{key:'location',title:'\u4f4d\u7f6e'},{key:'keeper',title:'\u4fdd\u7ba1\u4eba'},{key:'statusText',title:'\u72b6\u6001'}], '\u8bbe\u5907\u53f0\u8d26');
}
function fillEqSelect(selId, inUseOnly) {
  var sel = $(selId), list = LEMS.getEquipment().filter(function(e){return e.status!=='scrapped';});
  if (inUseOnly) list = list.filter(function(e){return e.status==='in_use';});
  sel.innerHTML = '<option value="">\u8bf7\u9009\u62e9</option>'+list.map(function(e){return '<option value="'+e.id+'">'+e.code+' - '+e.name+'</option>';}).join('');
}
function openMaintenanceModal() { fillEqSelect('#maintEquipmentId', true); $('#maintenanceForm').reset(); $('#maintStartDate').value=new Date().toISOString().slice(0,10); new bootstrap.Modal('#maintenanceModal').show(); }
function saveMaintenance(e) {
  e.preventDefault();
  var eqId = $('#maintEquipmentId').value, eq = LEMS.getEquipment().find(function(x){return x.id===eqId;});
  if (!eq) return;
  var ml = LEMS.getMaintenance();
  ml.push({ id:LEMS.uid(), equipmentId:eqId, equipmentCode:eq.code, equipmentName:eq.name, type:$('#maintType').value.trim(), description:$('#maintDescription').value.trim(), cost:parseFloat($('#maintCost').value)||0, startDate:$('#maintStartDate').value, vendor:$('#maintVendor').value.trim(), status:'ongoing', operator:currentUser.name });
  LEMS.saveMaintenance(ml);
  eq.status = 'maintenance'; LEMS.saveEquipment(LEMS.getEquipment());
  bootstrap.Modal.getInstance($('#maintenanceModal')).hide();
  showToast('\u5df2\u767b\u8bb0', 'success'); renderMaintenance();
}
function renderMaintenance() {
  $('#maintenanceTableBody').innerHTML = LEMS.getMaintenance().sort(function(a,b){return new Date(b.startDate)-new Date(a.startDate);}).map(function(m){
    var ops = m.status==='ongoing' ? '<button class="btn btn-success btn-sm" onclick="completeMaint(\''+m.id+'\')">\u5b8c\u6210</button>' : '';
    return '<tr><td>'+m.equipmentCode+'</td><td>'+m.equipmentName+'</td><td>'+(m.type||'-')+'</td><td>'+m.cost+'</td><td>'+m.startDate+'</td><td>'+statusBadge('maintenance',m.status)+'</td><td>'+(m.vendor||'-')+'</td><td>'+ops+'</td></tr>';
  }).join('') || '<tr><td colspan="8">\u6682\u65e0</td></tr>';
}
function completeMaint(id) {
  var ml = LEMS.getMaintenance(), m = ml.find(function(x){return x.id===id;});
  if (!m) return;
  m.status = 'completed'; LEMS.saveMaintenance(ml);
  var eq = LEMS.getEquipment().find(function(e){return e.id===m.equipmentId;});
  if (eq && eq.status==='maintenance'){eq.status='in_use';LEMS.saveEquipment(LEMS.getEquipment());}
  showToast('\u5df2\u5b8c\u6210','success'); renderMaintenance(); renderEquipment();
}
function openScrapModal() { fillEqSelect('#scrapEquipmentId', true); $('#scrapForm').reset(); new bootstrap.Modal('#scrapModal').show(); }
function saveScrap(e) {
  e.preventDefault();
  var eqId = $('#scrapEquipmentId').value, eq = LEMS.getEquipment().find(function(x){return x.id===eqId;});
  if (!eq) return;
  var list = LEMS.getScrap();
  list.push({ id:LEMS.uid(), equipmentId:eqId, equipmentCode:eq.code, equipmentName:eq.name, reason:$('#scrapReason').value.trim(), applicantId:currentUser.id, applicantName:currentUser.name, status:'pending', applyDate:new Date().toISOString() });
  LEMS.saveScrap(list);
  bootstrap.Modal.getInstance($('#scrapModal')).hide();
  showToast('\u5df2\u63d0\u4ea4','success'); renderScrap();
}
function renderScrap() {
  $('#scrapTableBody').innerHTML = LEMS.getScrap().sort(function(a,b){return new Date(b.applyDate)-new Date(a.applyDate);}).map(function(s){
    var ops = '';
    if (canApprove() && s.status==='pending') ops = '<button class="btn btn-success btn-sm" onclick="approveScrap(\''+s.id+'\',1)">\u6279\u51c6</button> <button class="btn btn-danger btn-sm" onclick="approveScrap(\''+s.id+'\',0)">\u9a73\u56de</button>';
    return '<tr><td>'+s.equipmentCode+'</td><td>'+s.equipmentName+'</td><td>'+s.reason+'</td><td>'+s.applicantName+'</td><td>'+LEMS.formatDate(s.applyDate)+'</td><td>'+statusBadge('scrap',s.status)+'</td><td>'+ops+'</td></tr>';
  }).join('') || '<tr><td colspan="7">\u6682\u65e0</td></tr>';
}
function approveScrap(id, ok) {
  var list = LEMS.getScrap(), s = list.find(function(x){return x.id===id;});
  if (!s) return;
  s.status = ok ? 'approved' : 'rejected'; LEMS.saveScrap(list);
  if (ok) { var eq = LEMS.getEquipment().find(function(e){return e.id===s.equipmentId;}); if (eq){eq.status='scrapped';LEMS.saveEquipment(LEMS.getEquipment());} }
  showToast(ok?'\u5df2\u6279\u51c6':'\u5df2\u9a73\u56de', ok?'success':'warning');
  renderScrap(); renderEquipment(); renderDashboard();
}
function exportScrap() {
  exportExcel(LEMS.getScrap().map(function(s){return {equipmentCode:s.equipmentCode,equipmentName:s.equipmentName,reason:s.reason,statusText:STATUS_MAP.scrap[s.status]};}), [{key:'equipmentCode',title:'\u7f16\u53f7'},{key:'equipmentName',title:'\u540d\u79f0'},{key:'reason',title:'\u539f\u56e0'},{key:'statusText',title:'\u72b6\u6001'}], '\u62a5\u5e9f\u8bb0\u5f55');
}
function renderStats() {
  var eq = LEMS.getEquipment(), byCat = {}, bySt = {in_use:0,maintenance:0,scrapped:0};
  eq.forEach(function(e){var c=e.category||'\u672a\u5206\u7c7b';byCat[c]=(byCat[c]||0)+1;if(bySt[e.status]!=null)bySt[e.status]++;});
  var maxC = Math.max(1); Object.keys(byCat).forEach(function(k){if(byCat[k]>maxC)maxC=byCat[k];});
  $('#statsByCategory').innerHTML = Object.keys(byCat).map(function(k){return '<div class="mb-2"><div class="d-flex justify-content-between small"><span>'+k+'</span><span>'+byCat[k]+'</span></div><div class="chart-bar"><div class="chart-bar-fill" style="width:'+(byCat[k]/maxC*100)+'%"></div></div></div>';}).join('')||'\u6682\u65e0';
  var maxS = Math.max(1,bySt.in_use,bySt.maintenance,bySt.scrapped);
  $('#statsByStatus').innerHTML = Object.keys(bySt).map(function(k){return '<div class="mb-2"><div class="d-flex justify-content-between small"><span>'+STATUS_MAP.equipment[k]+'</span><span>'+bySt[k]+'</span></div><div class="chart-bar"><div class="chart-bar-fill" style="width:'+(bySt[k]/maxS*100)+'%"></div></div></div>';}).join('');
  var inUse = eq.filter(function(e){return e.status==='in_use';});
  var total = eq.filter(function(e){return e.status!=='scrapped';}).reduce(function(s,e){return s+(e.price||0);},0);
  $('#statsTotalValue').textContent = '\u00a5'+total.toFixed(2);
  $('#statsAvgPrice').textContent = inUse.length ? '\u00a5'+(total/inUse.length).toFixed(2) : '\u00a50';
  $('#statsCount').textContent = inUse.length;
}
function renderUsers() {
  if (!isAdmin()) return;
  $('#usersTableBody').innerHTML = LEMS.getUsers().map(function(u){
    var del = u.id!==currentUser.id ? '<button class="btn btn-outline-danger btn-sm" onclick="deleteUser(\''+u.id+'\')">\u5220\u9664</button>' : '';
    return '<tr><td>'+u.username+'</td><td>'+u.name+'</td><td>'+ROLE_MAP[u.role]+'</td><td>'+(u.department||'-')+'</td><td><button class="btn btn-sm btn-outline-primary" onclick="editUser(\''+u.id+'\')">\u7f16\u8f91</button> '+del+'</td></tr>';
  }).join('');
}
function openUserModal() { $('#userForm').reset(); $('#userId').value=''; $('#userPassword').required=true; new bootstrap.Modal('#userModal').show(); }
function editUser(id) {
  var u = LEMS.getUsers().find(function(x){return x.id===id;});
  $('#userId').value=u.id; $('#userUsername').value=u.username; $('#userPassword').value=''; $('#userPassword').required=false;
  $('#userName').value=u.name; $('#userRole').value=u.role; $('#userDepartment').value=u.department||'';
  new bootstrap.Modal('#userModal').show();
}
function saveUser(e) {
  e.preventDefault(); if (!isAdmin()) return;
  var users = LEMS.getUsers(), id = $('#userId').value, un = $('#userUsername').value.trim();
  if (users.some(function(u){return u.username===un && u.id!==id;})) { showToast('\u7528\u6237\u540d\u5df2\u5b58\u5728','danger'); return; }
  if (id) { var u = users.find(function(x){return x.id===id;}); u.username=un; if($('#userPassword').value)u.password=$('#userPassword').value; u.name=$('#userName').value.trim(); u.role=$('#userRole').value; u.department=$('#userDepartment').value.trim(); }
  else { if(!$('#userPassword').value){showToast('\u8bf7\u8bbe\u7f6e\u5bc6\u7801','warning');return;} users.push({id:LEMS.uid(),username:un,password:$('#userPassword').value,name:$('#userName').value.trim(),role:$('#userRole').value,department:$('#userDepartment').value.trim()}); }
  LEMS.saveUsers(users); bootstrap.Modal.getInstance($('#userModal')).hide(); showToast('\u5df2\u4fdd\u5b58','success'); renderUsers();
}
function deleteUser(id) { if(!confirm('\u786e\u5b9a\u5220\u9664\uff1f'))return; LEMS.saveUsers(LEMS.getUsers().filter(function(u){return u.id!==id;})); renderUsers(); }
function loadSettings() { if(isAdmin()) $('#settingsCodePrefix').value = LEMS.getSettings().codePrefix||'LAB'; }
function saveSettings(e) { e.preventDefault(); var s=LEMS.getSettings(); s.codePrefix=$('#settingsCodePrefix').value.trim().toUpperCase()||'LAB'; LEMS.saveSettings(s); showToast('\u5df2\u4fdd\u5b58','success'); }
function resetData() { if(!confirm('\u91cd\u7f6e\u6240\u6709\u6570\u636e\uff1f'))return; Object.values(LEMS_KEYS).forEach(function(k){localStorage.removeItem(k);}); LEMS.init(); logout(); }

document.addEventListener('DOMContentLoaded', function() {
  LEMS.init();
  document.querySelector('#loginForm').addEventListener('submit', doLogin);
  document.querySelector('#btnLogout').addEventListener('click', logout);
  $$('#sidebarNav .nav-link').forEach(function(a) {
    a.addEventListener('click', function(e) { e.preventDefault(); navigate(a.dataset.panel); });
  });
  document.querySelector('#btnNewProcurement').addEventListener('click', openProcurementModal);
  document.querySelector('#procurementForm').addEventListener('submit', saveProcurement);
  document.querySelector('#procFilterStatus').addEventListener('change', renderProcurement);
  document.querySelector('#procSearch').addEventListener('input', renderProcurement);
  document.querySelector('#btnExportProcurement').addEventListener('click', exportProcurement);
  document.querySelector('#stockForm').addEventListener('submit', submitStock);
  document.querySelector('#stockProcurementId').addEventListener('change', function() {
    if (this.value) fillStockFromProc(this.value);
  });
  document.querySelector('#btnToggleSidebar').addEventListener('click', function() {
    document.querySelector('#sidebar').classList.toggle('show');
  });
  document.querySelector('#eqSearch').addEventListener('input', renderEquipment);
  document.querySelector('#eqFilterStatus').addEventListener('change', renderEquipment);
  document.querySelector('#btnExportStatsMaint').addEventListener('click', function() {
    exportExcel(LEMS.getMaintenance().map(function(m){return {equipmentCode:m.equipmentCode,type:m.type,cost:m.cost,startDate:m.startDate,statusText:STATUS_MAP.maintenance[m.status]};}), [{key:'equipmentCode',title:'\u7f16\u53f7'},{key:'type',title:'\u7c7b\u578b'},{key:'cost',title:'\u8d39\u7528'},{key:'startDate',title:'\u65e5\u671f'},{key:'statusText',title:'\u72b6\u6001'}], '\u7ef4\u4fee\u8bb0\u5f55');
  });
  document.querySelector('#btnExportEquipment').addEventListener('click', exportEquipment);
  document.querySelector('#btnNewMaintenance').addEventListener('click', openMaintenanceModal);
  document.querySelector('#maintenanceForm').addEventListener('submit', saveMaintenance);
  document.querySelector('#btnNewScrap').addEventListener('click', openScrapModal);
  document.querySelector('#scrapForm').addEventListener('submit', saveScrap);
  document.querySelector('#btnExportScrap').addEventListener('click', exportScrap);
  document.querySelector('#btnExportStatsEq').addEventListener('click', exportEquipment);
  document.querySelector('#btnExportStatsProc').addEventListener('click', exportProcurement);
  document.querySelector('#btnNewUser').addEventListener('click', openUserModal);
  document.querySelector('#userForm').addEventListener('submit', saveUser);
  document.querySelector('#settingsForm').addEventListener('submit', saveSettings);
  document.querySelector('#btnResetData').addEventListener('click', resetData);
  checkSession();
});
