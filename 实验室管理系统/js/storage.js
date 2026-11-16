const LEMS_KEYS = {
  users: 'lems_users',
  procurements: 'lems_procurements',
  equipment: 'lems_equipment',
  maintenance: 'lems_maintenance',
  scrap: 'lems_scrap',
  settings: 'lems_settings',
  session: 'lems_session',
  initialized: 'lems_initialized'
};

const LEMS = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  init() {
    if (localStorage.getItem(LEMS_KEYS.initialized)) return;
    this.set(LEMS_KEYS.users, [
      { id: 'u1', username: 'admin', password: 'admin123', name: '系统管理员', role: 'admin', department: '信息中心' },
      { id: 'u2', username: 'manager', password: 'manager123', name: '张主管', role: 'manager', department: '设备科' },
      { id: 'u3', username: 'user', password: 'user123', name: '李研究员', role: 'operator', department: '化学实验室' }
    ]);
    this.set(LEMS_KEYS.procurements, []);
    this.set(LEMS_KEYS.equipment, []);
    this.set(LEMS_KEYS.maintenance, []);
    this.set(LEMS_KEYS.scrap, []);
    this.set(LEMS_KEYS.settings, { codePrefix: 'LAB', seqByYear: {} });
    localStorage.setItem(LEMS_KEYS.initialized, '1');
  },
  getUsers() { return this.get(LEMS_KEYS.users) || []; },
  saveUsers(u) { this.set(LEMS_KEYS.users, u); },
  getProcurements() { return this.get(LEMS_KEYS.procurements) || []; },
  saveProcurements(p) { this.set(LEMS_KEYS.procurements, p); },
  getEquipment() { return this.get(LEMS_KEYS.equipment) || []; },
  saveEquipment(e) { this.set(LEMS_KEYS.equipment, e); },
  getMaintenance() { return this.get(LEMS_KEYS.maintenance) || []; },
  saveMaintenance(m) { this.set(LEMS_KEYS.maintenance, m); },
  getScrap() { return this.get(LEMS_KEYS.scrap) || []; },
  saveScrap(s) { this.set(LEMS_KEYS.scrap, s); },
  getSettings() { return this.get(LEMS_KEYS.settings) || { codePrefix: 'LAB', seqByYear: {} }; },
  saveSettings(s) { this.set(LEMS_KEYS.settings, s); },
  getSession() { return this.get(LEMS_KEYS.session); },
  setSession(user) { this.set(LEMS_KEYS.session, user); },
  clearSession() { localStorage.removeItem(LEMS_KEYS.session); },
  uid() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8); },
  generateEquipmentCode() {
    const s = this.getSettings();
    const prefix = s.codePrefix || 'LAB';
    const year = new Date().getFullYear();
    const yk = String(year);
    if (!s.seqByYear) s.seqByYear = {};
    const next = (s.seqByYear[yk] || 0) + 1;
    s.seqByYear[yk] = next;
    this.saveSettings(s);
    return prefix + '-' + year + '-' + String(next).padStart(4, '0');
  },
  formatDate(d) {
    if (!d) return '-';
    const dt = new Date(d);
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('zh-CN') + ' ' + dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  },
  formatDateOnly(d) {
    if (!d) return '-';
    const dt = new Date(d);
    return isNaN(dt) ? d : dt.toLocaleDateString('zh-CN');
  }
};

const STATUS_MAP = {
  procurement: { pending: '待审批', approved: '已批准', rejected: '已驳回', stocked: '已入库' },
  equipment: { in_use: '在用', maintenance: '维修中', scrapped: '已报废' },
  maintenance: { ongoing: '维修中', completed: '已完成' },
  scrap: { pending: '待审批', approved: '已批准', rejected: '已驳回' }
};

const ROLE_MAP = { admin: '系统管理员', manager: '设备主管', operator: '普通用户' };