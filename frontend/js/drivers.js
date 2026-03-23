// ─── LogiFlow — drivers.js ───

let allDrivers = [];

const STATUS_COLOR = { available: '#1D9E75', on_trip: '#EF9F27', off_duty: '#6b7280', inactive: '#E24B4A' };

function seedDrivers() {
  return [
    { id: 'DRV-001', name: 'Ramesh Kumar',  phone: '+91 98201 11234', license: 'MH0120190012345', licenseExp: '2027-08-15', experience: 8,  status: 'on_trip',   rating: 4.7, trips: 312, vehicleType: 'truck',      city: 'Mumbai'  },
    { id: 'DRV-002', name: 'Suresh Yadav',  phone: '+91 97302 22345', license: 'UP0120180023456', licenseExp: '2026-05-20', experience: 5,  status: 'available', rating: 4.4, trips: 198, vehicleType: 'trailer',    city: 'Lucknow' },
    { id: 'DRV-003', name: 'Vijay Singh',   phone: '+91 96403 33456', license: 'DL0120210034567', licenseExp: '2028-03-10', experience: 12, status: 'on_trip',   rating: 4.8, trips: 541, vehicleType: 'truck',      city: 'Delhi'   },
    { id: 'DRV-004', name: 'Mohan Patel',   phone: '+91 95504 44567', license: 'GJ0120200045678', licenseExp: '2027-11-30', experience: 6,  status: 'available', rating: 4.2, trips: 224, vehicleType: 'mini_truck', city: 'Surat'   },
    { id: 'DRV-005', name: 'Anil Sharma',   phone: '+91 94605 55678', license: 'RJ0120190056789', licenseExp: '2026-09-05', experience: 9,  status: 'off_duty',  rating: 4.5, trips: 389, vehicleType: 'tempo',      city: 'Jaipur'  },
    { id: 'DRV-006', name: 'Deepak Gupta',  phone: '+91 93706 66789', license: 'MH0120220067890', licenseExp: '2029-01-22', experience: 3,  status: 'available', rating: 4.0, trips: 87,  vehicleType: 'truck',      city: 'Pune'    },
  ];
}

function loadDrivers() {
  allDrivers = JSON.parse(localStorage.getItem('lf_drivers') || 'null') || seedDrivers();
  renderDrivers(allDrivers);
  updateStats();
}

function renderDrivers(list) {
  const grid = document.getElementById('drivers-grid');
  grid.innerHTML = list.length ? list.map(d => `
    <div class="driver-card" onclick="viewDriver('${d.id}')">
      <div class="driver-card-top">
        <div class="driver-avatar">${initials(d.name)}</div>
        <div class="driver-info">
          <div class="driver-name">${d.name}</div>
          <div class="driver-phone">${d.phone}</div>
          <div class="driver-status" style="color:${STATUS_COLOR[d.status] || '#888'}">${d.status.replace('_',' ')}</div>
        </div>
        <div class="driver-rating">⭐ ${d.rating}</div>
      </div>
      <div class="driver-stats">
        <div class="ds-item"><span>${d.trips}</span><span>Trips</span></div>
        <div class="ds-item"><span>${d.experience}y</span><span>Exp</span></div>
        <div class="ds-item"><span>${d.vehicleType.replace('_',' ')}</span><span>Type</span></div>
        <div class="ds-item"><span>${d.city}</span><span>Base</span></div>
      </div>
      <div class="driver-card-actions">
        <button class="btn btn-xs" onclick="event.stopPropagation(); viewDriver('${d.id}')">Profile</button>
        <button class="btn btn-xs btn-primary" onclick="event.stopPropagation(); assignDriver('${d.id}')">Assign Trip</button>
        ${d.status === 'on_trip' ? `<button class="btn btn-xs" onclick="event.stopPropagation(); markAvailable('${d.id}')">Mark Available</button>` : ''}
      </div>
    </div>
  `).join('') : '<div class="empty-state">No drivers found.</div>';
}

function updateStats() {
  document.getElementById('stat-total').textContent     = allDrivers.length;
  document.getElementById('stat-available').textContent = allDrivers.filter(d => d.status === 'available').length;
  document.getElementById('stat-on-trip').textContent   = allDrivers.filter(d => d.status === 'on_trip').length;
  const ratings = allDrivers.map(d => d.rating);
  document.getElementById('stat-rating').textContent    = ratings.length ? (ratings.reduce((a,b)=>a+b,0)/ratings.length).toFixed(1) : '—';
}

function searchDrivers(q) {
  const lower = q.toLowerCase();
  renderDrivers(allDrivers.filter(d => d.name.toLowerCase().includes(lower) || d.phone.includes(lower) || d.city.toLowerCase().includes(lower)));
}

function filterDrivers(key, val) {
  renderDrivers(val ? allDrivers.filter(d => d[key] === val) : allDrivers);
}

function createDriver() {
  const name = document.getElementById('d-name').value;
  const phone = document.getElementById('d-phone').value;
  const license = document.getElementById('d-license').value;
  if (!name || !phone || !license) { showToast('Name, phone and license are required.', 'error'); return; }

  const driver = {
    id:          'DRV-' + String(Date.now()).slice(-3),
    name, phone, license,
    licenseExp:  document.getElementById('d-license-exp').value,
    experience:  parseInt(document.getElementById('d-exp').value) || 0,
    vehicleType: document.getElementById('d-vtype').value,
    city:        document.getElementById('d-city').value,
    status:      'available',
    rating:      0,
    trips:       0,
  };
  allDrivers.unshift(driver);
  saveDrivers();
  renderDrivers(allDrivers);
  updateStats();
  closeModal('create-driver-modal');
  showToast(`Driver ${name} added!`);
}

function viewDriver(id) {
  const d = allDrivers.find(x => x.id === id);
  if (!d) return;
  document.getElementById('driver-view-title').textContent = d.name;
  document.getElementById('driver-view-body').innerHTML = `
    <div class="driver-profile-header">
      <div class="driver-avatar large">${initials(d.name)}</div>
      <div>
        <div class="driver-name">${d.name}</div>
        <div class="driver-phone">${d.phone}</div>
        <div class="driver-status" style="color:${STATUS_COLOR[d.status]}">${d.status.replace('_',' ')}</div>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><span class="detail-label">License No.</span><span class="mono">${d.license}</span></div>
      <div class="detail-item"><span class="detail-label">License Expiry</span><span>${d.licenseExp || '—'}</span></div>
      <div class="detail-item"><span class="detail-label">Experience</span><span>${d.experience} years</span></div>
      <div class="detail-item"><span class="detail-label">Vehicle Type</span><span>${d.vehicleType.replace('_',' ')}</span></div>
      <div class="detail-item"><span class="detail-label">Total Trips</span><span>${d.trips}</span></div>
      <div class="detail-item"><span class="detail-label">Rating</span><span>⭐ ${d.rating || 'No ratings'}</span></div>
      <div class="detail-item"><span class="detail-label">Home City</span><span>${d.city}</span></div>
    </div>
  `;
  openModal('view-driver-modal');
}

function assignDriver(id) {
  const d = allDrivers.find(x => x.id === id);
  if (!d) return;
  if (d.status !== 'available') { showToast('Driver is not available.', 'error'); return; }
  d.status = 'on_trip';
  d.trips++;
  saveDrivers();
  renderDrivers(allDrivers);
  updateStats();
  showToast(`${d.name} assigned to trip.`);
}

function markAvailable(id) {
  const d = allDrivers.find(x => x.id === id);
  if (d) { d.status = 'available'; saveDrivers(); renderDrivers(allDrivers); updateStats(); showToast(`${d.name} marked as available.`); }
}

function saveDrivers() { localStorage.setItem('lf_drivers', JSON.stringify(allDrivers)); }
function initials(name) { return name.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase(); }

document.addEventListener('DOMContentLoaded', loadDrivers);
