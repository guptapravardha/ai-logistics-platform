// ─── LogiFlow — fleet.js ───

let allVehicles = [];

const STATUS_BADGE = { active: 'badge-paid', idle: 'badge-draft', maintenance: 'badge-pending', breakdown: 'badge-overdue' };

function seedVehicles() {
  return [
    { id: 'VEH-001', number: 'MH 04 AB 1234', type: 'truck',      make: 'Tata',          model: 'Prima 4028.S', capacity: 25,  driver: 'Ramesh Kumar', status: 'active',      insurance: '2026-12-31', fc: '2026-09-15', gps: 'GPS-00112', year: 2021 },
    { id: 'VEH-002', number: 'UP 80 CD 5678', type: 'trailer',    make: 'Ashok Leyland', model: 'Captain 3518', capacity: 40,  driver: 'Vijay Singh',  status: 'active',      insurance: '2026-08-20', fc: '2026-06-10', gps: 'GPS-00113', year: 2020 },
    { id: 'VEH-003', number: 'DL 01 EF 9012', type: 'mini_truck', make: 'Mahindra',      model: 'Bolero Pikup', capacity: 1.5, driver: 'Suresh Yadav', status: 'idle',        insurance: '2027-03-05', fc: '2027-01-20', gps: 'GPS-00114', year: 2022 },
    { id: 'VEH-004', number: 'GJ 05 GH 3456', type: 'truck',      make: 'Tata',          model: 'LPT 2518',     capacity: 15,  driver: '',             status: 'maintenance', insurance: '2026-10-15', fc: '2026-08-30', gps: '',          year: 2019 },
    { id: 'VEH-005', number: 'RJ 14 IJ 7890', type: 'tempo',      make: 'Force',         model: 'Traveller',    capacity: 2,   driver: 'Anil Sharma',  status: 'idle',        insurance: '2027-05-22', fc: '2027-03-10', gps: 'GPS-00116', year: 2023 },
  ];
}

function loadVehicles() {
  allVehicles = JSON.parse(localStorage.getItem('lf_vehicles') || 'null') || seedVehicles();
  renderVehicles(allVehicles);
  updateStats();
  populateDriverSelect();
}

function renderVehicles(list) {
  const tbody = document.getElementById('fleet-tbody');
  tbody.innerHTML = list.length ? list.map(v => `
    <tr>
      <td><span class="mono">${v.number}</span></td>
      <td>${v.type.replace('_',' ')}</td>
      <td>${v.make} ${v.model}</td>
      <td>${v.capacity} ton${v.capacity > 1 ? 's' : ''}</td>
      <td>${v.driver || '<span class="muted">Unassigned</span>'}</td>
      <td><span class="badge ${STATUS_BADGE[v.status] || ''}">${v.status}</span></td>
      <td class="${isExpiringSoon(v.insurance) ? 'expiry-warn' : ''}">${v.insurance || '—'}</td>
      <td class="${isExpiringSoon(v.fc) ? 'expiry-warn' : ''}">${v.fc || '—'}</td>
      <td class="actions-cell">
        <button class="btn btn-xs" onclick="viewVehicle('${v.id}')">View</button>
        <button class="btn btn-xs btn-primary" onclick="updateVehicleStatus('${v.id}')">Status</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="9" class="empty-cell">No vehicles found.</td></tr>';
}

function updateStats() {
  document.getElementById('stat-total').textContent       = allVehicles.length;
  document.getElementById('stat-active').textContent      = allVehicles.filter(v => v.status === 'active').length;
  document.getElementById('stat-maintenance').textContent = allVehicles.filter(v => v.status === 'maintenance').length;
  document.getElementById('stat-idle').textContent        = allVehicles.filter(v => v.status === 'idle').length;
}

function isExpiringSoon(dateStr) {
  if (!dateStr) return false;
  const diff = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  return diff < 30;
}

let activeFilters = {};
function searchVehicles(q) { activeFilters.q = q; applyFilters(); }
function filterVehicles(key, val) { activeFilters[key] = val; applyFilters(); }
function applyFilters() {
  let list = [...allVehicles];
  if (activeFilters.q) { const q = activeFilters.q.toLowerCase(); list = list.filter(v => v.number.toLowerCase().includes(q) || v.make.toLowerCase().includes(q) || v.driver.toLowerCase().includes(q)); }
  if (activeFilters.status) list = list.filter(v => v.status === activeFilters.status);
  if (activeFilters.type)   list = list.filter(v => v.type   === activeFilters.type);
  renderVehicles(list);
}

function createVehicle() {
  const number = document.getElementById('v-number').value;
  const type   = document.getElementById('v-type').value;
  if (!number || !type) { showToast('Vehicle number and type are required.', 'error'); return; }

  const sel    = document.getElementById('v-driver');
  const driverName = sel.options[sel.selectedIndex]?.text === 'Unassigned' ? '' : sel.options[sel.selectedIndex]?.text;

  const vehicle = {
    id:        'VEH-' + String(Date.now()).slice(-3),
    number, type,
    make:      document.getElementById('v-make').value,
    model:     document.getElementById('v-model').value,
    capacity:  parseFloat(document.getElementById('v-capacity').value) || 0,
    year:      parseInt(document.getElementById('v-year').value) || new Date().getFullYear(),
    driver:    driverName,
    status:    'idle',
    insurance: document.getElementById('v-insurance').value,
    fc:        document.getElementById('v-fc').value,
    gps:       document.getElementById('v-gps').value,
  };
  allVehicles.unshift(vehicle);
  saveVehicles();
  renderVehicles(allVehicles);
  updateStats();
  closeModal('create-vehicle-modal');
  showToast(`Vehicle ${number} added!`);
}

function viewVehicle(id) {
  const v = allVehicles.find(x => x.id === id);
  if (!v) return;
  alert(`Vehicle: ${v.number}\nType: ${v.type}\nMake/Model: ${v.make} ${v.model}\nCapacity: ${v.capacity} tons\nDriver: ${v.driver || 'Unassigned'}\nStatus: ${v.status}\nInsurance: ${v.insurance}\nFC: ${v.fc}\nGPS: ${v.gps || 'None'}`);
}

function updateVehicleStatus(id) {
  const v      = allVehicles.find(x => x.id === id);
  if (!v) return;
  const flow   = ['idle','active','maintenance'];
  const idx    = flow.indexOf(v.status);
  v.status     = flow[(idx + 1) % flow.length];
  saveVehicles();
  renderVehicles(allVehicles);
  updateStats();
  showToast(`${v.number} → ${v.status}`);
}

function populateDriverSelect() {
  const sel     = document.getElementById('v-driver');
  const drivers = JSON.parse(localStorage.getItem('lf_drivers') || '[]');
  drivers.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; sel.appendChild(o); });
}

function saveVehicles() { localStorage.setItem('lf_vehicles', JSON.stringify(allVehicles)); }

document.addEventListener('DOMContentLoaded', loadVehicles);
