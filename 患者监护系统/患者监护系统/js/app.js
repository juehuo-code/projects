// ============================================================
// 数据库层 — localStorage 封装
// ============================================================
const DB = {
  get(key) { try { return JSON.parse(localStorage.getItem('pms_'+key)) || null; } catch(e) { return null; } },
  set(key, val) { localStorage.setItem('pms_'+key, JSON.stringify(val)); },
  init() {
    // 初始化默认数据
    if (!DB.get('users')) {
      DB.set('users', [
        { id:'u1', username:'admin', password:'123456', role:'admin', name:'系统管理员', createdAt:Date.now() },
        { id:'u2', username:'doctor1', password:'123456', role:'doctor', name:'张医生', createdAt:Date.now() },
        { id:'u3', username:'nurse1', password:'123456', role:'doctor', name:'李护士', createdAt:Date.now() }
      ]);
    }
    if (!DB.get('patients')) DB.set('patients', []);
    if (!DB.get('vitals')) DB.set('vitals', []);
    if (!DB.get('thresholds')) DB.set('thresholds', []);
    if (!DB.get('alerts')) DB.set('alerts', []);
    if (!DB.get('logs')) DB.set('logs', []);
    if (!DB.get('syslogs')) DB.set('syslogs', []);
    if (!DB.get('nextId')) DB.set('nextId', { patient:1000, vital:1000, alert:1000, log:1000, syslog:1000, user:1000 });
  },
  nextId(type) {
    const ids = DB.get('nextId');
    const v = (ids[type] || 1000) + 1;
    ids[type] = v;
    DB.set('nextId', ids);
    return type.substring(0,1).toUpperCase() + v;
  },
  // 系统日志
  syslog(action, detail, userId) {
    const logs = DB.get('syslogs');
    logs.unshift({ id:DB.nextId('syslog'), userId, action, detail, time:new Date().toISOString() });
    if (logs.length > 500) logs.length = 500;
    DB.set('syslogs', logs);
  }
};
DB.init();

// ============================================================
// 应用控制器
// ============================================================
const App = {
  currentUser: null,

  login() {
    const username = document.getElementById('login-user').value.trim();
    const password = document.getElementById('login-pass').value.trim();
    const errEl = document.getElementById('login-err');
    if (!username || !password) { errEl.textContent = '请输入账号和密码'; return; }
    const users = DB.get('users');
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) { errEl.textContent = '账号或密码错误'; return; }
    this.currentUser = user;
    DB.syslog('登录', `用户 ${user.username} 登录系统`, user.id);
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app').classList.add('active');
    this.initUI();
    this.navigate('dashboard');
  },

  logout() {
    if (this.currentUser) DB.syslog('登出', `用户 ${this.currentUser.username} 登出系统`, this.currentUser.id);
    this.currentUser = null;
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app').classList.remove('active');
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
    document.getElementById('login-err').textContent = '';
  },

  initUI() {
    const user = this.currentUser;
    document.getElementById('sidebar-user').innerHTML = `👤 ${user.name}<br><small>${user.role==='admin'?'管理员':'医护人员'}</small>`;

    // 导航菜单
    const navItems = [
      { id:'dashboard', label:'📊 工作台', show:true },
      { id:'patients', label:'👥 患者管理', show:true },
      { id:'vitals', label:'💓 生理数据', show:true },
      { id:'alerts', label:'⚠️ 异常预警', show:true },
      { id:'logs', label:'📋 监护日志', show:true },
      { id:'reports', label:'📈 病情报告', show:true },
      { id:'admin', label:'⚙️ 管理后台', show:user.role==='admin' }
    ];
    const nav = document.getElementById('nav');
    nav.innerHTML = navItems.filter(i=>i.show).map(i =>
      `<a href="#" data-page="${i.id}" onclick="App.navigate('${i.id}')">${i.label}</a>`
    ).join('');
  },

  navigate(pageId) {
    // 更新导航 active
    document.querySelectorAll('#nav a').forEach(a => a.classList.remove('active'));
    const link = document.querySelector(`#nav a[data-page="${pageId}"]`);
    if (link) link.classList.add('active');
    // 显示页面
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById('page-'+pageId);
    if (page) { page.classList.add('active'); page.innerHTML = ''; }
    document.getElementById('page-title').textContent = link ? link.textContent.trim() : pageId;
    // 侧边栏移动端关闭
    document.getElementById('sidebar').classList.remove('open');
    // 渲染
    switch(pageId) {
      case 'dashboard': PageDashboard.render(); break;
      case 'patients': PagePatients.render(); break;
      case 'vitals': PageVitals.render(); break;
      case 'alerts': PageAlerts.render(); break;
      case 'logs': PageLogs.render(); break;
      case 'reports': PageReports.render(); break;
      case 'admin': PageAdmin.render(); break;
    }
  },

  // 通用弹窗
  modal(html) {
    document.getElementById('modal-box').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('active');
  },
  closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
  },

  // Toast 通知
  toast(msg, type='info') {
    const el = document.createElement('div');
    el.className = 'alert-toast';
    const colors = { info:'#1a73b5', success:'#2e7d32', warn:'#e65100', danger:'#c62828' };
    el.style.borderLeftColor = colors[type] || colors.info;
    el.innerHTML = `<span>${msg}</span><button class="close" onclick="this.parentElement.remove()">×</button>`;
    document.body.appendChild(el);
    setTimeout(() => { if(el.parentElement) el.remove(); }, 4000);
  },

  // 确认对话框
  confirm(msg, onYes) {
    App.modal(`
      <h2>确认操作</h2><p style="margin-bottom:16px;">${msg}</p>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-danger" id="confirm-yes">确认</button>
      </div>
    `);
    document.getElementById('confirm-yes').onclick = () => { App.closeModal(); onYes(); };
  }
};

// 点击遮罩关闭弹窗
document.addEventListener('click', e => { if (e.target.id === 'modal-overlay') App.closeModal(); });

// ============================================================
// 页面渲染函数
// ============================================================

// ---------- 工作台 ----------
const PageDashboard = {
  render() {
    const patients = DB.get('patients');
    const alerts = DB.get('alerts');
    const vitals = DB.get('vitals');
    const triggered = alerts.filter(a => a.status !== 'resolved' && a.status !== 'inactive');
    const today = new Date().toISOString().slice(0,10);
    const todayVitals = vitals.filter(v => v.time && v.time.startsWith(today));

    const html = `
      <div class="stats-row">
        <div class="stat-card info"><div class="num">${patients.length}</div><div class="label">在院患者总数</div></div>
        <div class="stat-card warn"><div class="num">${triggered.length}</div><div class="label">待处理预警</div></div>
        <div class="stat-card ok"><div class="num">${todayVitals.length}</div><div class="label">今日数据采集</div></div>
        <div class="stat-card"><div class="num">${alerts.filter(a=>a.status==='resolved').length}</div><div class="label">已完结预警</div></div>
      </div>
      <div class="card">
        <h3>📋 待处理预警</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>患者</th><th>异常指标</th><th>数值</th><th>阈值</th><th>时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              ${triggered.slice(0,10).map(a => {
                const p = patients.find(x => x.id === a.patientId);
                const statusMap = { triggered:'<span class="badge badge-danger">已触发</span>', processing:'<span class="badge badge-warn">处理中</span>' };
                return `<tr>
                  <td>${p?p.name:'—'}</td><td>${a.indicator}</td><td style="color:var(--danger);font-weight:700">${a.value}</td>
                  <td>${a.threshold}</td><td>${new Date(a.time).toLocaleString()}</td>
                  <td>${statusMap[a.status]||a.status}</td>
                  <td><button class="btn btn-sm btn-outline" onclick="PageAlerts.handleAlert('${a.id}')">处理</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--text-light);padding:24px;">暂无待处理预警 ✅</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById('page-dashboard').innerHTML = html;
  }
};

// ---------- 患者管理 ----------
const PagePatients = {
  render(filter='') {
    const patients = DB.get('patients');
    const list = filter ? patients.filter(p => p.name.includes(filter) || p.hospitalId.includes(filter) || p.doctor.includes(filter)) : patients;
    const html = `
      <div class="toolbar">
        <input placeholder="🔍 搜索姓名/住院号/主治医生..." oninput="PagePatients.render(this.value)" value="${filter}">
        <button class="btn btn-primary" onclick="PagePatients.showForm()">➕ 新增患者</button>
        <span style="color:var(--text-light);font-size:13px;">共 ${list.length} 条</span>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>住院号</th><th>姓名</th><th>性别</th><th>年龄</th><th>床位号</th><th>患病信息</th><th>主治医生</th><th>入院时间</th><th>操作</th></tr></thead>
            <tbody>
              ${list.map(p => `<tr>
                <td>${p.hospitalId}</td><td><strong>${p.name}</strong></td><td>${p.gender}</td><td>${p.age}</td>
                <td>${p.bedNo}</td><td>${p.diagnosis}</td><td>${p.doctor}</td>
                <td>${p.admitDate}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="PagePatients.showForm('${p.id}')">✏️</button>
                  <button class="btn btn-sm btn-danger" onclick="App.confirm('确定删除患者 ${p.name} 吗？',()=>PagePatients.remove('${p.id}'))">🗑</button>
                </td>
              </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-light);padding:24px;">暂无患者数据</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById('page-patients').innerHTML = html;
  },

  showForm(id) {
    const p = id ? DB.get('patients').find(x => x.id === id) : null;
    const title = p ? '编辑患者' : '新增患者';
    App.modal(`
      <h2>${title}</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
        <div class="field"><label>姓名 *</label><input id="f-name" value="${p?p.name:''}"></div>
        <div class="field"><label>性别</label><select id="f-gender">${['男','女'].map(g=>`<option ${p&&p.gender===g?'selected':''}>${g}</option>`)}</select></div>
        <div class="field"><label>年龄</label><input id="f-age" type="number" value="${p?p.age:''}"></div>
        <div class="field"><label>住院号 *</label><input id="f-hospitalId" value="${p?p.hospitalId:''}"></div>
        <div class="field"><label>床位号</label><input id="f-bedNo" value="${p?p.bedNo:''}"></div>
        <div class="field"><label>主治医生</label><input id="f-doctor" value="${p?p.doctor:''}"></div>
        <div class="field"><label>入院时间</label><input id="f-admitDate" type="date" value="${p?p.admitDate:''}"></div>
        <div class="field" style="grid-column:1/-1"><label>患病信息</label><textarea id="f-diagnosis">${p?p.diagnosis:''}</textarea></div>
      </div>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-primary" id="save-btn">保存</button>
      </div>
    `);
    document.getElementById('save-btn').onclick = () => {
      const data = {
        id: p ? p.id : DB.nextId('patient'),
        name: document.getElementById('f-name').value.trim(),
        gender: document.getElementById('f-gender').value,
        age: parseInt(document.getElementById('f-age').value) || 0,
        hospitalId: document.getElementById('f-hospitalId').value.trim(),
        bedNo: document.getElementById('f-bedNo').value.trim(),
        doctor: document.getElementById('f-doctor').value.trim(),
        admitDate: document.getElementById('f-admitDate').value,
        diagnosis: document.getElementById('f-diagnosis').value.trim(),
        updatedAt: Date.now()
      };
      if (!data.name || !data.hospitalId) { App.toast('姓名和住院号为必填项','warn'); return; }
      const patients = DB.get('patients');
      if (p) {
        const idx = patients.findIndex(x => x.id === id);
        patients[idx] = data;
      } else {
        data.createdAt = Date.now();
        patients.push(data);
      }
      DB.set('patients', patients);
      DB.syslog(p?'更新患者':'新增患者', `${data.name} (${data.hospitalId})`, App.currentUser.id);
      App.closeModal();
      PagePatients.render();
      App.toast(p?'患者信息已更新':'患者已添加','success');
    };
  },

  remove(id) {
    const patients = DB.get('patients');
    const p = patients.find(x => x.id === id);
    DB.set('patients', patients.filter(x => x.id !== id));
    DB.syslog('删除患者', `${p?p.name:''} (${p?p.hospitalId:''})`, App.currentUser.id);
    PagePatients.render();
    App.toast('患者已删除','success');
  }
};

// ---------- 生理数据 ----------
const PageVitals = {
  currentPatientId: null,
  chart: null,

  render() {
    const patients = DB.get('patients');
    const vitals = DB.get('vitals');
    const pid = this.currentPatientId;
    const filtered = pid ? vitals.filter(v => v.patientId === pid) : vitals;
    // 按时间倒序
    filtered.sort((a,b) => new Date(b.time) - new Date(a.time));

    const html = `
      <div class="toolbar">
        <select onchange="PageVitals.selectPatient(this.value)">
          <option value="">全部患者</option>
          ${patients.map(p => `<option value="${p.id}" ${pid===p.id?'selected':''}>${p.name} (${p.hospitalId})</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="PageVitals.showForm()" ${!pid?'disabled':''}>➕ 录入数据</button>
        <button class="btn btn-outline" onclick="PageVitals.showImport()">📥 批量导入</button>
        <span style="color:var(--text-light);font-size:13px;">共 ${filtered.length} 条</span>
      </div>
      ${pid ? `
      <div class="card"><h3>📈 趋势图</h3><div class="chart-wrap"><canvas id="vitals-chart"></canvas></div></div>
      ` : '<div class="card" style="text-align:center;color:var(--text-light);padding:32px;">请先选择患者查看趋势图</div>'}
      <div class="card">
        <h3>📋 数据列表</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>患者</th><th>体温(℃)</th><th>脉搏(次/分)</th><th>血压(mmHg)</th><th>心率(次/分)</th><th>心电</th><th>设备编号</th><th>采集时间</th><th>操作</th></tr></thead>
            <tbody>
              ${filtered.slice(0,50).map(v => {
                const p = patients.find(x => x.id === v.patientId);
                return `<tr>
                  <td>${p?p.name:'—'}</td><td>${v.temperature}</td><td>${v.pulse}</td>
                  <td>${v.bloodPressure || '—'}</td><td>${v.heartRate}</td>
                  <td>${v.ecg || '—'}</td><td>${v.deviceId || '—'}</td>
                  <td>${new Date(v.time).toLocaleString()}</td>
                  <td><button class="btn btn-sm btn-danger" onclick="App.confirm('确定删除此条数据？',()=>PageVitals.remove('${v.id}'))">🗑</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-light);padding:24px;">暂无数据</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById('page-vitals').innerHTML = html;

    if (pid) this.renderChart();
  },

  selectPatient(id) {
    this.currentPatientId = id;
    this.render();
  },

  renderChart() {
    const pid = this.currentPatientId;
    const vitals = DB.get('vitals').filter(v => v.patientId === pid).sort((a,b) => new Date(a.time) - new Date(b.time));
    const labels = vitals.map(v => new Date(v.time).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}));
    const temps = vitals.map(v => parseFloat(v.temperature));
    const pulses = vitals.map(v => parseInt(v.pulse));
    const hrs = vitals.map(v => parseInt(v.heartRate));

    if (this.chart) this.chart.destroy();
    const ctx = document.getElementById('vitals-chart');
    if (!ctx) return;
    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label:'体温(℃)', data:temps, borderColor:'#e65100', backgroundColor:'rgba(230,81,0,.1)', tension:.3, yAxisID:'y' },
          { label:'脉搏(次/分)', data:pulses, borderColor:'#1a73b5', backgroundColor:'rgba(26,115,181,.1)', tension:.3, yAxisID:'y1' },
          { label:'心率(次/分)', data:hrs, borderColor:'#c62828', backgroundColor:'rgba(198,40,40,.1)', tension:.3, yAxisID:'y1' }
        ]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        interaction: { mode:'index', intersect:false },
        plugins: { legend: { position:'bottom' } },
        scales: {
          y: { type:'linear', position:'left', title:{display:true, text:'体温 (℃)'}, min:30, max:45 },
          y1: { type:'linear', position:'right', title:{display:true, text:'次/分'}, grid:{drawOnChartArea:false} }
        }
      }
    });
  },

  showForm() {
    App.modal(`
      <h2>录入生理数据</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;">
        <div class="field"><label>体温 (℃) *</label><input id="f-temp" type="number" step="0.1" placeholder="36.5"></div>
        <div class="field"><label>脉搏 (次/分)</label><input id="f-pulse" type="number" placeholder="72"></div>
        <div class="field"><label>血压 (mmHg)</label><input id="f-bp" placeholder="120/80"></div>
        <div class="field"><label>心率 (次/分)</label><input id="f-hr" type="number" placeholder="75"></div>
        <div class="field"><label>心电数据</label><input id="f-ecg" placeholder="正常/异常描述"></div>
        <div class="field"><label>设备编号</label><input id="f-device" placeholder="DEV-001"></div>
        <div class="field"><label>采集时间 *</label><input id="f-time" type="datetime-local" value="${new Date().toISOString().slice(0,16)}"></div>
      </div>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-primary" id="save-vital">保存</button>
      </div>
    `);
    document.getElementById('save-vital').onclick = () => {
      const temp = parseFloat(document.getElementById('f-temp').value);
      if (isNaN(temp) || temp < 25 || temp > 45) { App.toast('请输入有效的体温值 (25~45℃)','warn'); return; }
      const pulse = parseInt(document.getElementById('f-pulse').value) || 0;
      const hr = parseInt(document.getElementById('f-hr').value) || 0;
      if (pulse && (pulse < 20 || pulse > 250)) { App.toast('脉搏值超出有效范围 (20~250)','warn'); return; }
      if (hr && (hr < 20 || hr > 300)) { App.toast('心率值超出有效范围 (20~300)','warn'); return; }
      const time = document.getElementById('f-time').value;
      if (!time) { App.toast('请选择采集时间','warn'); return; }
      const data = {
        id: DB.nextId('vital'),
        patientId: PageVitals.currentPatientId,
        temperature: temp,
        pulse,
        bloodPressure: document.getElementById('f-bp').value.trim(),
        heartRate: hr,
        ecg: document.getElementById('f-ecg').value.trim(),
        deviceId: document.getElementById('f-device').value.trim(),
        time: new Date(time).toISOString(),
        recordedBy: App.currentUser.id
      };
      const vitals = DB.get('vitals');
      vitals.push(data);
      DB.set('vitals', vitals);
      // 自动生成监护日志
      const patient = DB.get('patients').find(p => p.id === data.patientId);
      const logs = DB.get('logs');
      logs.unshift({ id:DB.nextId('log'), patientId:data.patientId, vitalId:data.id, content:`录入生理数据：体温${temp}℃ 脉搏${pulse} 心率${hr}`, time:new Date().toISOString(), type:'auto', operator:App.currentUser.name });
      if (logs.length > 1000) logs.length = 1000;
      DB.set('logs', logs);
      // 检查预警
      AlertEngine.check(data);
      DB.syslog('录入生理数据', `${patient?patient.name:''} 体温${temp}℃`, App.currentUser.id);
      App.closeModal();
      PageVitals.render();
      App.toast('生理数据已保存','success');
    };
  },

  showImport() {
    if (!PageVitals.currentPatientId) { App.toast('请先选择患者','warn'); return; }
    App.modal(`
      <h2>批量导入生理数据</h2>
      <p style="font-size:12px;color:var(--text-light);margin-bottom:12px;">每行一条数据，格式：体温,脉搏,血压,心率,心电,设备编号,时间(YYYY-MM-DD HH:mm)</p>
      <textarea id="f-import" rows="6" placeholder="36.5,72,120/80,75,正常,DEV-001,2025-06-15 08:00&#10;36.8,78,125/82,80,正常,DEV-001,2025-06-15 12:00" style="width:100%;"></textarea>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-primary" id="do-import">导入</button>
      </div>
    `);
    document.getElementById('do-import').onclick = () => {
      const raw = document.getElementById('f-import').value.trim();
      if (!raw) { App.toast('请输入数据','warn'); return; }
      const lines = raw.split('\n').filter(l => l.trim());
      let count = 0, errors = 0;
      const vitals = DB.get('vitals');
      lines.forEach(line => {
        const parts = line.split(',').map(s => s.trim());
        const temp = parseFloat(parts[0]);
        if (isNaN(temp) || temp < 25 || temp > 45) { errors++; return; }
        const pulse = parseInt(parts[1]) || 0;
        const hr = parseInt(parts[3]) || 0;
        if (pulse && (pulse < 20 || pulse > 250)) { errors++; return; }
        if (hr && (hr < 20 || hr > 300)) { errors++; return; }
        const data = {
          id: DB.nextId('vital'),
          patientId: PageVitals.currentPatientId,
          temperature: temp,
          pulse,
          bloodPressure: parts[2] || '',
          heartRate: hr,
          ecg: parts[4] || '',
          deviceId: parts[5] || '',
          time: parts[6] ? new Date(parts[6]).toISOString() : new Date().toISOString(),
          recordedBy: App.currentUser.id
        };
        vitals.push(data);
        AlertEngine.check(data);
        count++;
      });
      DB.set('vitals', vitals);
      DB.syslog('批量导入数据', `成功${count}条 失败${errors}条`, App.currentUser.id);
      App.closeModal();
      PageVitals.render();
      App.toast(`导入完成：成功 ${count} 条，失败 ${errors} 条`,'success');
    };
  },

  remove(id) {
    const vitals = DB.get('vitals');
    DB.set('vitals', vitals.filter(v => v.id !== id));
    DB.syslog('删除生理数据', `数据ID: ${id}`, App.currentUser.id);
    PageVitals.render();
    App.toast('数据已删除','success');
  }
};

// ============================================================
// 预警引擎
// ============================================================
const AlertEngine = {
  // 检查单条生理数据是否触发预警
  check(vitalData) {
    const thresholds = DB.get('thresholds').filter(t => t.patientId === vitalData.patientId);
    const alerts = DB.get('alerts');
    const patient = DB.get('patients').find(p => p.id === vitalData.patientId);
    let triggered = false;

    thresholds.forEach(t => {
      const checks = [
        { key:'temperature', indicator:'体温', value:vitalData.temperature, min:t.tempMin, max:t.tempMax, unit:'℃' },
        { key:'heartRate', indicator:'心率', value:vitalData.heartRate, min:t.hrMin, max:t.hrMax, unit:'次/分' },
        { key:'systolic', indicator:'收缩压', value:vitalData.bloodPressure?parseInt(vitalData.bloodPressure.split('/')[0]):null, min:t.bpSysMin, max:t.bpSysMax, unit:'mmHg' },
        { key:'diastolic', indicator:'舒张压', value:vitalData.bloodPressure?parseInt(vitalData.bloodPressure.split('/')[1]):null, min:t.bpDiaMin, max:t.bpDiaMax, unit:'mmHg' }
      ];
      checks.forEach(c => {
        if (c.value == null || isNaN(c.value)) return;
        const minOk = c.min == null || c.min === '' || c.value >= parseFloat(c.min);
        const maxOk = c.max == null || c.max === '' || c.value <= parseFloat(c.max);
        if (!minOk || !maxOk) {
          const threshold = (!minOk ? '下限'+c.min : '上限'+c.max) + c.unit;
          // 避免重复生成同类型预警
          const existing = alerts.find(a => a.patientId === vitalData.patientId && a.indicator === c.indicator && (a.status==='triggered'||a.status==='processing'));
          if (!existing) {
            alerts.push({
              id: DB.nextId('alert'),
              patientId: vitalData.patientId,
              indicator: c.indicator,
              value: c.value,
              threshold,
              time: new Date().toISOString(),
              status: 'triggered',
              handler: '',
              opinion: '',
              handledAt: null
            });
            triggered = true;
            // 弹窗预警
            App.toast(`⚠️ ${patient?patient.name:'患者'} ${c.indicator}异常：${c.value}${c.unit}，安全范围 ${c.min||'—'}~${c.max||'—'}${c.unit}`, 'danger');
          }
        }
      });
    });

    if (triggered) {
      DB.set('alerts', alerts);
      // 自动生成预警日志
      const logs = DB.get('logs');
      logs.unshift({ id:DB.nextId('log'), patientId:vitalData.patientId, vitalId:vitalData.id, content:'⚠️ 自动预警：生理指标超出安全阈值', time:new Date().toISOString(), type:'alert', operator:'系统' });
      if (logs.length > 1000) logs.length = 1000;
      DB.set('logs', logs);
    }
  }
};

// ---------- 异常预警页面 ----------
const PageAlerts = {
  filterStatus: '',

  render() {
    const alerts = DB.get('alerts');
    const patients = DB.get('patients');
    const list = this.filterStatus ? alerts.filter(a => a.status === this.filterStatus) : alerts;
    list.sort((a,b) => new Date(b.time) - new Date(a.time));

    const statusOptions = [
      { v:'', l:'全部' }, { v:'triggered', l:'已触发' }, { v:'processing', l:'处理中' }, { v:'resolved', l:'已完结' }
    ];
    const statusBadge = s => {
      const m = { triggered:'badge-danger', processing:'badge-warn', resolved:'badge-success', inactive:'badge-default' };
      const t = { triggered:'已触发', processing:'处理中', resolved:'已完结', inactive:'未触发' };
      return `<span class="badge ${m[s]||'badge-default'}">${t[s]||s}</span>`;
    };

    const html = `
      <div class="toolbar">
        ${statusOptions.map(o => `<button class="btn ${this.filterStatus===o.v?'btn-primary':'btn-outline'} btn-sm" onclick="PageAlerts.setFilter('${o.v}')">${o.l}</button>`).join('')}
        <button class="btn btn-outline btn-sm" onclick="PageAlerts.showThresholds()">⚙️ 阈值设置</button>
        <span style="color:var(--text-light);font-size:13px;">共 ${list.length} 条</span>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>患者</th><th>异常指标</th><th>数值</th><th>安全阈值</th><th>触发时间</th><th>状态</th><th>处理人</th><th>操作</th></tr></thead>
            <tbody>
              ${list.map(a => {
                const p = patients.find(x => x.id === a.patientId);
                return `<tr>
                  <td>${p?p.name:'—'}</td><td>${a.indicator}</td>
                  <td style="color:var(--danger);font-weight:700">${a.value}</td><td>${a.threshold}</td>
                  <td>${new Date(a.time).toLocaleString()}</td><td>${statusBadge(a.status)}</td>
                  <td>${a.handler||'—'}</td>
                  <td><button class="btn btn-sm btn-outline" onclick="PageAlerts.handleAlert('${a.id}')">处理</button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:24px;">暂无预警记录</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById('page-alerts').innerHTML = html;
  },

  setFilter(s) { this.filterStatus = s; this.render(); },

  handleAlert(id) {
    const alert = DB.get('alerts').find(a => a.id === id);
    if (!alert) return;
    const patient = DB.get('patients').find(p => p.id === alert.patientId);
    App.modal(`
      <h2>⚠️ 预警处理</h2>
      <div style="background:var(--primary-light);padding:12px;border-radius:8px;margin-bottom:12px;">
        <p><strong>患者：</strong>${patient?patient.name:'—'} (${patient?patient.hospitalId:''})</p>
        <p><strong>异常指标：</strong>${alert.indicator}</p>
        <p><strong>检测数值：</strong><span style="color:var(--danger);font-weight:700">${alert.value}</span></p>
        <p><strong>安全阈值：</strong>${alert.threshold}</p>
        <p><strong>触发时间：</strong>${new Date(alert.time).toLocaleString()}</p>
        <p><strong>当前状态：</strong>${alert.status}</p>
      </div>
      <div class="field"><label>处理意见</label><textarea id="f-opinion" rows="3">${alert.opinion||''}</textarea></div>
      <div class="field"><label>状态</label><select id="f-status">
        <option value="triggered" ${alert.status==='triggered'?'selected':''}>已触发</option>
        <option value="processing" ${alert.status==='processing'?'selected':''}>处理中</option>
        <option value="resolved" ${alert.status==='resolved'?'selected':''}>已完结</option>
      </select></div>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-primary" id="save-alert">保存</button>
      </div>
    `);
    document.getElementById('save-alert').onclick = () => {
      const alerts = DB.get('alerts');
      const idx = alerts.findIndex(a => a.id === id);
      alerts[idx].opinion = document.getElementById('f-opinion').value.trim();
      alerts[idx].status = document.getElementById('f-status').value;
      alerts[idx].handler = App.currentUser.name;
      alerts[idx].handledAt = new Date().toISOString();
      DB.set('alerts', alerts);
      // 自动生成处理日志
      const logs = DB.get('logs');
      logs.unshift({ id:DB.nextId('log'), patientId:alert.patientId, alertId:alert.id, content:`处理预警：${alert.indicator} → ${alerts[idx].status}，意见：${alerts[idx].opinion||'无'}`, time:new Date().toISOString(), type:'alert', operator:App.currentUser.name });
      DB.set('logs', logs);
      DB.syslog('处理预警', `预警ID:${id} → ${alerts[idx].status}`, App.currentUser.id);
      App.closeModal();
      PageAlerts.render();
      App.toast('预警处理已更新','success');
    };
  },

  showThresholds() {
    const patients = DB.get('patients');
    const thresholds = DB.get('thresholds');
    // 生成患者列表，带上阈值信息
    const rows = patients.map(p => {
      const t = thresholds.find(x => x.patientId === p.id);
      return { patient:p, threshold:t };
    });
    App.modal(`
      <h2>⚙️ 患者安全阈值设置</h2>
      <div style="max-height:55vh;overflow-y:auto;">
        <table>
          <thead><tr><th>患者</th><th>体温下限(℃)</th><th>体温上限(℃)</th><th>心率下限</th><th>心率上限</th><th>收缩压下/上限</th><th>舒张压下/上限</th><th>操作</th></tr></thead>
          <tbody>${rows.map(r => {
            const t = r.threshold || {};
            return `<tr>
              <td>${r.patient.name}</td>
              <td><input id="t-tmin-${r.patient.id}" value="${t.tempMin||''}" style="width:70px"></td>
              <td><input id="t-tmax-${r.patient.id}" value="${t.tempMax||''}" style="width:70px"></td>
              <td><input id="t-hrmin-${r.patient.id}" value="${t.hrMin||''}" style="width:70px"></td>
              <td><input id="t-hrmax-${r.patient.id}" value="${t.hrMax||''}" style="width:70px"></td>
              <td><input id="t-bpsmin-${r.patient.id}" value="${t.bpSysMin||''}" style="width:60px">/<input id="t-bpsmax-${r.patient.id}" value="${t.bpSysMax||''}" style="width:60px"></td>
              <td><input id="t-bpdmin-${r.patient.id}" value="${t.bpDiaMin||''}" style="width:60px">/<input id="t-bpdmax-${r.patient.id}" value="${t.bpDiaMax||''}" style="width:60px"></td>
              <td><button class="btn btn-sm btn-primary" onclick="PageAlerts.saveThreshold('${r.patient.id}')">💾</button></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="actions"><button class="btn btn-outline" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  saveThreshold(patientId) {
    const data = {
      patientId,
      tempMin: document.getElementById('t-tmin-'+patientId).value,
      tempMax: document.getElementById('t-tmax-'+patientId).value,
      hrMin: document.getElementById('t-hrmin-'+patientId).value,
      hrMax: document.getElementById('t-hrmax-'+patientId).value,
      bpSysMin: document.getElementById('t-bpsmin-'+patientId).value,
      bpSysMax: document.getElementById('t-bpsmax-'+patientId).value,
      bpDiaMin: document.getElementById('t-bpdmin-'+patientId).value,
      bpDiaMax: document.getElementById('t-bpdmax-'+patientId).value,
      updatedAt: Date.now(),
      updatedBy: App.currentUser.id
    };
    let thresholds = DB.get('thresholds');
    const idx = thresholds.findIndex(t => t.patientId === patientId);
    if (idx >= 0) thresholds[idx] = data; else thresholds.push(data);
    DB.set('thresholds', thresholds);
    DB.syslog('设置阈值', `患者ID:${patientId}`, App.currentUser.id);
    App.toast('阈值已保存','success');
  }
};

// ---------- 监护日志 ----------
const PageLogs = {
  filterPatient: '',

  render() {
    const logs = DB.get('logs');
    const patients = DB.get('patients');
    let list = logs;
    if (this.filterPatient) list = list.filter(l => l.patientId === this.filterPatient);
    list = [...list].sort((a,b) => new Date(b.time) - new Date(a.time));

    const typeBadge = t => {
      const m = { auto:'badge-info', manual:'badge-success', alert:'badge-danger' };
      const n = { auto:'自动', manual:'手动', alert:'预警' };
      return `<span class="badge ${m[t]||'badge-default'}">${n[t]||t}</span>`;
    };

    const html = `
      <div class="toolbar">
        <select onchange="PageLogs.filterPatient=this.value;PageLogs.render()">
          <option value="">全部患者</option>
          ${patients.map(p => `<option value="${p.id}" ${PageLogs.filterPatient===p.id?'selected':''}>${p.name}</option>`).join('')}
        </select>
        <button class="btn btn-primary" onclick="PageLogs.showManualForm()">✍️ 手动记录</button>
        <button class="btn btn-outline" onclick="PageLogs.exportCSV()">📥 导出CSV</button>
        <span style="color:var(--text-light);font-size:13px;">共 ${list.length} 条</span>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>时间</th><th>患者</th><th>操作类型</th><th>内容</th><th>操作人</th></tr></thead>
            <tbody>
              ${list.slice(0,200).map(l => {
                const p = patients.find(x => x.id === l.patientId);
                return `<tr>
                  <td>${new Date(l.time).toLocaleString()}</td><td>${p?p.name:'—'}</td>
                  <td>${typeBadge(l.type)}</td><td>${l.content}</td><td>${l.operator||'—'}</td>
                </tr>`;
              }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:24px;">暂无日志</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    document.getElementById('page-logs').innerHTML = html;
  },

  showManualForm() {
    const patients = DB.get('patients');
    App.modal(`
      <h2>✍️ 手动记录监护日志</h2>
      <div class="field"><label>患者 *</label><select id="f-log-patient">${patients.map(p => `<option value="${p.id}">${p.name} (${p.hospitalId})</option>`).join('')}</select></div>
      <div class="field"><label>内容 *</label><textarea id="f-log-content" rows="4" placeholder="记录监护内容..."></textarea></div>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-primary" id="save-log">保存</button>
      </div>
    `);
    document.getElementById('save-log').onclick = () => {
      const patientId = document.getElementById('f-log-patient').value;
      const content = document.getElementById('f-log-content').value.trim();
      if (!content) { App.toast('请输入日志内容','warn'); return; }
      const logs = DB.get('logs');
      logs.unshift({ id:DB.nextId('log'), patientId, content, time:new Date().toISOString(), type:'manual', operator:App.currentUser.name });
      DB.set('logs', logs);
      DB.syslog('手动记录日志', `患者ID:${patientId}`, App.currentUser.id);
      App.closeModal();
      PageLogs.render();
      App.toast('日志已记录','success');
    };
  },

  exportCSV() {
    const logs = DB.get('logs');
    const patients = DB.get('patients');
    let csv = '时间,患者,类型,内容,操作人\n';
    logs.forEach(l => {
      const p = patients.find(x => x.id === l.patientId);
      csv += `${l.time},${p?p.name:''},${l.type},"${l.content}",${l.operator}\n`;
    });
    const blob = new Blob(['﻿'+csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '监护日志_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    App.toast('日志已导出','success');
  }
};

// ---------- 病情报告 ----------
const PageReports = {
  render() {
    const patients = DB.get('patients');
    const html = `
      <div class="card">
        <h3>📈 生成病情报告</h3>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:end;">
          <div class="field"><label>选择患者</label><select id="rpt-patient">${patients.map(p => `<option value="${p.id}">${p.name} (${p.hospitalId})</option>`).join('')}</select></div>
          <div class="field"><label>开始日期</label><input id="rpt-start" type="date" value="${new Date(Date.now()-7*86400000).toISOString().slice(0,10)}"></div>
          <div class="field"><label>结束日期</label><input id="rpt-end" type="date" value="${new Date().toISOString().slice(0,10)}"></div>
          <div class="field"><button class="btn btn-primary" onclick="PageReports.generate()">📊 生成报告</button></div>
        </div>
      </div>
      <div class="card" id="report-result">
        <p style="text-align:center;color:var(--text-light);padding:40px;">请选择患者和时间范围，点击生成报告</p>
      </div>
    `;
    document.getElementById('page-reports').innerHTML = html;
  },

  generate() {
    const patientId = document.getElementById('rpt-patient').value;
    const start = document.getElementById('rpt-start').value;
    const end = document.getElementById('rpt-end').value;
    if (!start || !end) { App.toast('请选择时间范围','warn'); return; }
    const startDate = new Date(start);
    const endDate = new Date(end + 'T23:59:59');

    const patient = DB.get('patients').find(p => p.id === patientId);
    if (!patient) return;

    const vitals = DB.get('vitals').filter(v => v.patientId === patientId && new Date(v.time) >= startDate && new Date(v.time) <= endDate).sort((a,b) => new Date(a.time) - new Date(b.time));
    const alerts = DB.get('alerts').filter(a => a.patientId === patientId && new Date(a.time) >= startDate && new Date(a.time) <= endDate);
    const logs = DB.get('logs').filter(l => l.patientId === patientId && new Date(l.time) >= startDate && new Date(l.time) <= endDate);
    const threshold = DB.get('thresholds').find(t => t.patientId === patientId);
    const vitalsCount = vitals.length;

    // 计算统计
    const temps = vitals.map(v => v.temperature).filter(v => !isNaN(v));
    const hrs = vitals.map(v => v.heartRate).filter(v => !isNaN(v) && v > 0);
    const avgTemp = temps.length ? (temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1) : '—';
    const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : '—';
    const minTemp = temps.length ? Math.min(...temps).toFixed(1) : '—';
    const avgHR = hrs.length ? Math.round(hrs.reduce((a,b)=>a+b,0)/hrs.length) : '—';

    const html = `
      <h3>📋 病情报告 — ${patient.name}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-bottom:16px;">
        <div style="background:var(--primary-light);padding:14px;border-radius:8px;">
          <strong>基本信息</strong><br>
          住院号：${patient.hospitalId} | 性别：${patient.gender} | 年龄：${patient.age}<br>
          床位：${patient.bedNo} | 主治：${patient.doctor}<br>
          入院：${patient.admitDate} | 诊断：${patient.diagnosis}
        </div>
        <div style="background:#e8f5e9;padding:14px;border-radius:8px;">
          <strong>报告周期</strong><br>
          ${start} ~ ${end}<br>
          数据采集：${vitalsCount} 条 | 预警：${alerts.length} 条 | 日志：${logs.length} 条
        </div>
        <div style="background:#fff3e0;padding:14px;border-radius:8px;">
          <strong>体征统计</strong><br>
          平均体温：${avgTemp}℃ | 范围：${minTemp}~${maxTemp}℃<br>
          平均心率：${avgHR} 次/分<br>
          安全阈值：体温 ${threshold?threshold.tempMin||'—':'—'}~${threshold?threshold.tempMax||'—':'—'}℃ | 心率 ${threshold?threshold.hrMin||'—':'—'}~${threshold?threshold.hrMax||'—':'—'}次/分
        </div>
      </div>

      <div class="card"><h3>📈 趋势图</h3><div class="chart-wrap"><canvas id="report-chart"></canvas></div></div>

      <div class="card"><h3>💓 生理数据 (最近50条)</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>时间</th><th>体温</th><th>脉搏</th><th>血压</th><th>心率</th><th>心电</th></tr></thead>
          <tbody>${vitals.slice(-50).reverse().map(v => `<tr>
            <td>${new Date(v.time).toLocaleString()}</td><td>${v.temperature}℃</td><td>${v.pulse}</td>
            <td>${v.bloodPressure||'—'}</td><td>${v.heartRate}</td><td>${v.ecg||'—'}</td>
          </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">无数据</td></tr>'}</tbody>
        </table></div>
      </div>

      <div class="card"><h3>⚠️ 预警记录</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>时间</th><th>指标</th><th>数值</th><th>阈值</th><th>状态</th><th>处理意见</th></tr></thead>
          <tbody>${alerts.map(a => `<tr>
            <td>${new Date(a.time).toLocaleString()}</td><td>${a.indicator}</td><td>${a.value}</td>
            <td>${a.threshold}</td><td>${a.status}</td><td>${a.opinion||'—'}</td>
          </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;">无预警</td></tr>'}</tbody>
        </table></div>
      </div>

      <div style="display:flex;gap:10px;margin-top:16px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="PageReports.print()">🖨️ 打印</button>
        <button class="btn btn-primary" onclick="PageReports.exportExcel()">📥 导出Excel</button>
      </div>
    `;
    document.getElementById('report-result').innerHTML = html;

    // 渲染图表
    setTimeout(() => {
      const ctx = document.getElementById('report-chart');
      if (!ctx) return;
      const labels = vitals.map(v => new Date(v.time).toLocaleString('zh-CN', {month:'short',day:'numeric',hour:'2-digit'}));
      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label:'体温(℃)', data:vitals.map(v=>v.temperature), borderColor:'#e65100', tension:.3, yAxisID:'y' },
            { label:'心率(次/分)', data:vitals.map(v=>v.heartRate), borderColor:'#c62828', tension:.3, yAxisID:'y1' }
          ]
        },
        options: {
          responsive:true, maintainAspectRatio:false,
          plugins: { legend: { position:'bottom' } },
          scales: {
            y: { type:'linear', position:'left', title:{display:true,text:'体温(℃)'} },
            y1: { type:'linear', position:'right', title:{display:true,text:'心率(次/分)'}, grid:{drawOnChartArea:false} }
          }
        }
      });
    }, 100);

    DB.syslog('生成报告', `患者:${patient.name} ${start}~${end}`, App.currentUser.id);
  },

  print() {
    const content = document.getElementById('report-result').innerHTML;
    const win = window.open('','_blank','width=900,height=700');
    win.document.write(`<html><head><title>病情报告</title><style>body{font-family:"Microsoft YaHei",sans-serif;padding:20px;color:#333;} table{border-collapse:collapse;width:100%;margin-bottom:16px;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#e8f4fd;} h3{color:#155a8a;} @media print{body{padding:0;}}</style></head><body>${content}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  },

  exportExcel() {
    const patientId = document.getElementById('rpt-patient').value;
    const start = document.getElementById('rpt-start').value;
    const end = document.getElementById('rpt-end').value;
    const patient = DB.get('patients').find(p => p.id === patientId);
    const vitals = DB.get('vitals').filter(v => v.patientId === patientId && new Date(v.time) >= new Date(start) && new Date(v.time) <= new Date(end+'T23:59:59'));
    let csv = '﻿时间,体温(℃),脉搏(次/分),血压,心率(次/分),心电,设备编号\n';
    vitals.forEach(v => { csv += `${v.time},${v.temperature},${v.pulse},${v.bloodPressure||''},${v.heartRate},${v.ecg||''},${v.deviceId||''}\n`; });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `病情报告_${patient?patient.name:'患者'}_${start}_${end}.csv`;
    a.click(); URL.revokeObjectURL(url);
    App.toast('报告已导出','success');
  }
};

// ---------- 管理员后台 ----------
const PageAdmin = {
  tab: 'users', // users | syslogs

  render() {
    if (App.currentUser.role !== 'admin') {
      document.getElementById('page-admin').innerHTML = '<div class="card" style="text-align:center;padding:40px;color:var(--text-light);">无访问权限</div>';
      return;
    }
    const tabs = [
      { id:'users', label:'👥 用户管理' },
      { id:'syslogs', label:'📋 系统日志' }
    ];
    const html = `
      <div class="toolbar">
        ${tabs.map(t => `<button class="btn ${this.tab===t.id?'btn-primary':'btn-outline'} btn-sm" onclick="PageAdmin.switchTab('${t.id}')">${t.label}</button>`).join('')}
      </div>
      <div id="admin-content"></div>
    `;
    document.getElementById('page-admin').innerHTML = html;
    this.renderContent();
  },

  switchTab(t) { this.tab = t; this.render(); },

  renderContent() {
    const container = document.getElementById('admin-content');
    if (this.tab === 'users') this.renderUsers(container);
    else this.renderSyslogs(container);
  },

  renderUsers(container) {
    const users = DB.get('users');
    container.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-primary btn-sm" onclick="PageAdmin.showUserForm()">➕ 新增用户</button>
        <span style="color:var(--text-light);font-size:13px;">共 ${users.length} 个账号</span>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>账号</th><th>姓名</th><th>角色</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody>
              ${users.map(u => `<tr>
                <td>${u.username}</td><td>${u.name}</td>
                <td>${u.role==='admin'?'<span class="badge badge-danger">管理员</span>':'<span class="badge badge-info">医护人员</span>'}</td>
                <td>${new Date(u.createdAt).toLocaleString()}</td>
                <td>
                  <button class="btn btn-sm btn-outline" onclick="PageAdmin.showUserForm('${u.id}')">✏️</button>
                  ${u.id !== App.currentUser.id ? `<button class="btn btn-sm btn-danger" onclick="App.confirm('确定删除用户 ${u.username} 吗？',()=>PageAdmin.removeUser('${u.id}'))">🗑</button>` : ''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderSyslogs(container) {
    const syslogs = DB.get('syslogs');
    const users = DB.get('users');
    container.innerHTML = `
      <div class="toolbar">
        <button class="btn btn-outline btn-sm" onclick="PageAdmin.exportSyslogs()">📥 导出CSV</button>
        <span style="color:var(--text-light);font-size:13px;">共 ${syslogs.length} 条</span>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>时间</th><th>用户</th><th>操作</th><th>详情</th></tr></thead>
            <tbody>
              ${syslogs.slice(0,200).map(l => {
                const u = users.find(x => x.id === l.userId);
                return `<tr>
                  <td>${new Date(l.time).toLocaleString()}</td><td>${u?u.username:'—'}</td>
                  <td>${l.action}</td><td>${l.detail}</td>
                </tr>`;
              }).join('') || '<tr><td colspan="4" style="text-align:center;padding:24px;">暂无系统日志</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  showUserForm(id) {
    const u = id ? DB.get('users').find(x => x.id === id) : null;
    App.modal(`
      <h2>${u?'编辑用户':'新增用户'}</h2>
      <div class="field"><label>账号 *</label><input id="f-uname" value="${u?u.username:''}"></div>
      <div class="field"><label>密码 *</label><input id="f-upass" type="password" value="${u?u.password:''}"></div>
      <div class="field"><label>姓名</label><input id="f-urname" value="${u?u.name:''}"></div>
      <div class="field"><label>角色</label><select id="f-urole">
        <option value="doctor" ${u&&u.role==='doctor'?'selected':''}>医护人员</option>
        <option value="admin" ${u&&u.role==='admin'?'selected':''}>管理员</option>
      </select></div>
      <div class="actions">
        <button class="btn btn-outline" onclick="App.closeModal()">取消</button>
        <button class="btn btn-primary" id="save-user">保存</button>
      </div>
    `);
    document.getElementById('save-user').onclick = () => {
      const username = document.getElementById('f-uname').value.trim();
      const password = document.getElementById('f-upass').value.trim();
      const name = document.getElementById('f-urname').value.trim();
      if (!username || !password) { App.toast('账号和密码为必填项','warn'); return; }
      const users = DB.get('users');
      // 检查重复
      const dup = users.find(x => x.username === username && (!u || x.id !== u.id));
      if (dup) { App.toast('账号已存在','warn'); return; }
      const data = { id: u?u.id:DB.nextId('user'), username, password, role:document.getElementById('f-urole').value, name, createdAt: u?u.createdAt:Date.now() };
      if (u) {
        users[users.findIndex(x => x.id === id)] = data;
      } else {
        users.push(data);
      }
      DB.set('users', users);
      DB.syslog(u?'更新用户':'新增用户', `${data.username} (${data.role})`, App.currentUser.id);
      App.closeModal();
      PageAdmin.render();
      App.toast(u?'用户已更新':'用户已创建','success');
    };
  },

  removeUser(id) {
    const users = DB.get('users');
    const u = users.find(x => x.id === id);
    DB.set('users', users.filter(x => x.id !== id));
    DB.syslog('删除用户', `${u?u.username:''}`, App.currentUser.id);
    PageAdmin.render();
    App.toast('用户已删除','success');
  },

  exportSyslogs() {
    const syslogs = DB.get('syslogs');
    const users = DB.get('users');
    let csv = '﻿时间,用户,操作,详情\n';
    syslogs.forEach(l => {
      const u = users.find(x => x.id === l.userId);
      csv += `${l.time},${u?u.username:''},${l.action},"${l.detail}"\n`;
    });
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '系统日志_' + new Date().toISOString().slice(0,10) + '.csv';
    a.click(); URL.revokeObjectURL(url);
    App.toast('系统日志已导出','success');
  }
};

// 支持回车登录
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') App.login(); });
document.getElementById('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') App.login(); });

console.log('🏥 患者监护系统已就绪');
console.log('默认账号: admin / 123456 (管理员)');
console.log('默认账号: doctor1 / 123456 (医护)');
console.log('数据存储于 localStorage，刷新不丢失');
