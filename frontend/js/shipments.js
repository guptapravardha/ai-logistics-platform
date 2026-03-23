// ─── LogiFlow — shipments.js ───

const API = '/api/shipments';
let allShipments = [];
let currentPage  = 1;
const PER_PAGE   = 15;

const STATUS_BADGE = {
  pending:    'badge-pending',
  in_transit: 'badge-transit',
  delivered:  'badge-paid',
  delayed:    'badge-overdue',
  cancelled:  'badge-draft',
};

const PRIORITY_BADGE = { high: 'badge-overdue', medium: 'badge-pending', low: 'badge-draft' };

// ── Load ────────────────────────────────────────────────
async function loadShipments() {
  try {
    const res  = await fetch(API, { headers: authHeaders() });
    const data = await res.json();
    allShipments = data.data || seedShipments();
  } catch {
    allShipments = seedShipments();
  }
  renderShipments(allShipments);
  updateStats();
  populateDriverSelect();
}

function seedShipments() {
  return [
    { id: 'SHP-00398', client: 'Tata Steel Transport',  origin: 'Mumbai',  destination: 'Delhi',     driver: 'Ramesh Kumar',  status: 'in_transit', priority: 'high',   eta: '2026-03-25', weight: 12000 },
    { id: 'SHP-00401', client: 'Mahindra Logistics',    origin: 'Pune',    destination: 'Bangalore', driver: 'Suresh Yadav',  status: 'pending',    priority: 'medium', eta: '2026-03-28', weight: 5500  },
    { id: 'SHP-00407', client: 'Flipkart Supply Chain', origin: 'Chennai', destination: 'Hyderabad', driver: 'Vijay Singh',   status: 'delayed',    priority: 'high',   eta: '2026-03-20', weight: 8200  },
    { id: 'SHP-00411', client: 'Amazon Fresh India',    origin: 'Delhi',   destination: 'Jaipur',    driver: 'Mohan Patel',   status: 'in_transit', priority: 'medium', eta: '2026-03-26', weight: 3400  },
    { id: 'SHP-00415', client: 'BigBasket Fulfillment', origin: 'Kolkata', destination: 'Patna',     driver: '',             status: 'pending',    priority: 'low',    eta: '2026-04-01', weight: 2100  },
    { id: 'SHP-00385', client: 'BlueDart Express',      origin: 'Mumbai',  destination: 'Surat',     driver: 'Anil Sharma',   status: 'delivered',  priority: 'medium', eta: '2026-03-18', weight: 950   },
  ];
}

// ── Render ──────────────────────────────────────────────
function renderShipments(list) {
  const start  = (currentPage - 1) * PER_PAGE;
  const paged  = list.slice(start, start + PER_PAGE);
  const tbody  = document.getElementById('shipments-tbody');

  tbody.innerHTML = paged.length ? paged.map(s => `
    <tr>
      <td><span class="mono">${s.id}</span></td>
      <td>${s.origin} → ${s.destination}</td>
      <td>${s.client}</td>
      <td>${s.driver || '<span class="muted">Unassigned</span>'}</td>
      <td><span class="badge ${STATUS_BADGE[s.status] || ''}">${s.status.replace('_',' ')}</span></td>
      <td><span class="badge ${PRIORITY_BADGE[s.priority] || ''}">${s.priority}</span></td>
      <td>${s.eta || '—'}</td>
      <td class="actions-cell">
        <button class="btn btn-xs" onclick="viewShipment('${s.id}')">View</button>
        <button class="btn btn-xs btn-primary" onclick="updateStatus('${s.id}')">Update</button>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="8" class="empty-cell">No shipments found.</td></tr>';

  renderPagination(list.length);
}

function renderPagination(total) {
  const pages   = Math.ceil(total / PER_PAGE);
  const el      = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML  = Array.from({ length: pages }, (_, i) => `
    <button class="page-btn ${i + 1 === currentPage ? 'active' : ''}" onclick="goPage(${i + 1})">${i + 1}</button>
  `).join('');
}

function goPage(n) { currentPage = n; renderShipments(allShipments); }

// ── Stats ───────────────────────────────────────────────
function updateStats() {
  document.getElementById('stat-total').textContent     = allShipments.length;
  document.getElementById('stat-transit').textContent   = allShipments.filter(s => s.status === 'in_transit').length;
  document.getElementById('stat-delivered').textContent = allShipments.filter(s => s.status === 'delivered').length;
  document.getElementById('stat-delayed').textContent   = allShipments.filter(s => s.status === 'delayed').length;
}

// ── Search / Filter ─────────────────────────────────────
let activeFilters = {};
function searchShipments(q) {
  activeFilters.q = q;
  applyFilters();
}
function filterShipments(key, val) {
  activeFilters[key] = val;
  applyFilters();
}
function applyFilters() {
  let list = [...allShipments];
  if (activeFilters.q) {
    const q = activeFilters.q.toLowerCase();
    list = list.filter(s => s.id.toLowerCase().includes(q) || s.client.toLowerCase().includes(q) || s.origin.toLowerCase().includes(q) || s.destination.toLowerCase().includes(q));
  }
  if (activeFilters.status)   list = list.filter(s => s.status   === activeFilters.status);
  if (activeFilters.priority) list = list.filter(s => s.priority === activeFilters.priority);
  currentPage = 1;
  renderShipments(list);
}

// ── Create ──────────────────────────────────────────────
function createShipment() {
  const client = document.getElementById('s-client').value;
  const origin = document.getElementById('s-origin').value;
  const dest   = document.getElementById('s-dest').value;
  if (!client || !origin || !dest) { showToast('Please fill required fields.', 'error'); return; }

  const newShipment = {
    id:          'SHP-' + String(Date.now()).slice(-5),
    client,
    origin,
    destination: dest,
    driver:      document.getElementById('s-driver').options[document.getElementById('s-driver').selectedIndex]?.text || '',
    status:      'pending',
    priority:    document.getElementById('s-priority').value,
    eta:         document.getElementById('s-eta').value,
    weight:      parseFloat(document.getElementById('s-weight').value) || 0,
  };

  allShipments.unshift(newShipment);
  updateStats();
  renderShipments(allShipments);
  closeModal('create-shipment-modal');
  showToast(`Shipment ${newShipment.id} created!`);
}

// ── View ────────────────────────────────────────────────
function viewShipment(id) {
  const s = allShipments.find(x => x.id === id);
  if (!s) return;
  document.getElementById('view-title').textContent = s.id;
  document.getElementById('view-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">Client</span><span>${s.client}</span></div>
      <div class="detail-item"><span class="detail-label">Status</span><span class="badge ${STATUS_BADGE[s.status]}">${s.status.replace('_',' ')}</span></div>
      <div class="detail-item"><span class="detail-label">Origin</span><span>${s.origin}</span></div>
      <div class="detail-item"><span class="detail-label">Destination</span><span>${s.destination}</span></div>
      <div class="detail-item"><span class="detail-label">Driver</span><span>${s.driver || 'Unassigned'}</span></div>
      <div class="detail-item"><span class="detail-label">ETA</span><span>${s.eta || '—'}</span></div>
      <div class="detail-item"><span class="detail-label">Weight</span><span>${s.weight} kg</span></div>
      <div class="detail-item"><span class="detail-label">Priority</span><span class="badge ${PRIORITY_BADGE[s.priority]}">${s.priority}</span></div>
    </div>
  `;
  openModal('view-shipment-modal');
}

function updateStatus(id) {
  const s       = allShipments.find(x => x.id === id);
  if (!s) return;
  const flow    = ['pending','in_transit','delivered'];
  const idx     = flow.indexOf(s.status);
  if (idx < flow.length - 1) { s.status = flow[idx + 1]; renderShipments(allShipments); updateStats(); showToast(`${id} → ${s.status.replace('_',' ')}`); }
  else showToast(`${id} is already delivered.`);
}

function exportShipments() {
  const rows = [['ID','Client','Origin','Destination','Driver','Status','Priority','ETA'],...allShipments.map(s=>[s.id,s.client,s.origin,s.destination,s.driver,s.status,s.priority,s.eta])];
  downloadCSV(rows, 'shipments.csv');
}

function populateDriverSelect() {
  const sel = document.getElementById('s-driver');
  if (!sel) return;
  const drivers = JSON.parse(localStorage.getItem('lf_drivers') || '[]');
  drivers.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = d.name; sel.appendChild(o); });
}

function authHeaders() { return { 'Authorization': 'Bearer ' + (localStorage.getItem('lf_token') || ''), 'Content-Type': 'application/json' }; }

function downloadCSV(rows, filename) {
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

document.addEventListener('DOMContentLoaded', loadShipments);
