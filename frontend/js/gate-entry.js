// ─── LogiFlow — gate-entry.js ───

let gateLog = [];
let entryType = 'entry';

function seedGateLog() {
  return [
    { id: 'GE-001', vehicle: 'MH 04 AB 1234', shipment: 'SHP-00398', driver: 'Ramesh Kumar', type: 'entry', weightIn: 31500, weightOut: 0,     remarks: '',              time: '2026-03-23 08:14', status: 'inside'   },
    { id: 'GE-002', vehicle: 'GJ 05 GH 3456', shipment: 'SHP-00401', driver: 'Mohan Patel',  type: 'entry', weightIn: 22000, weightOut: 0,     remarks: '',              time: '2026-03-23 09:30', status: 'inside'   },
    { id: 'GE-003', vehicle: 'DL 01 EF 9012', shipment: 'SHP-00385', driver: 'Suresh Yadav', type: 'exit',  weightIn: 18000, weightOut: 16200, remarks: 'Documents OK',  time: '2026-03-23 10:45', status: 'exited'   },
    { id: 'GE-004', vehicle: 'RJ 14 IJ 7890', shipment: '',          driver: 'Anil Sharma',  type: 'entry', weightIn: 5400,  weightOut: 0,     remarks: 'Empty return',  time: '2026-03-23 11:20', status: 'inside'   },
  ];
}

function loadGateLog() {
  gateLog = JSON.parse(localStorage.getItem('lf_gate_log') || 'null') || seedGateLog();
  renderGateLog(gateLog);
  updateStats();
}

function renderGateLog(list) {
  const container = document.getElementById('gate-log');
  container.innerHTML = list.length ? list.map(g => `
    <div class="gate-entry-card ${g.type === 'exit' ? 'exit-card' : 'entry-card'}">
      <div class="gate-entry-icon">${g.type === 'entry' ? '▶' : '◀'}</div>
      <div class="gate-entry-body">
        <div class="gate-entry-top">
          <span class="gate-vehicle">${g.vehicle}</span>
          <span class="badge ${g.type === 'entry' ? 'badge-paid' : 'badge-draft'}">${g.type}</span>
          <span class="badge ${g.status === 'inside' ? 'badge-pending' : 'badge-transit'}">${g.status}</span>
        </div>
        <div class="gate-entry-meta">
          ${g.shipment ? `<span>📦 ${g.shipment}</span>` : ''}
          <span>👤 ${g.driver || '—'}</span>
          <span>⚖️ In: ${g.weightIn} kg${g.weightOut ? ` | Out: ${g.weightOut} kg` : ''}</span>
          ${g.remarks ? `<span>📝 ${g.remarks}</span>` : ''}
        </div>
        <div class="gate-entry-time">${g.time}</div>
      </div>
      <div class="gate-entry-actions">
        ${g.status === 'inside' ? `<button class="btn btn-xs btn-primary" onclick="recordExit('${g.id}')">Record Exit</button>` : ''}
        <button class="btn btn-xs" onclick="printEntry('${g.id}')">Print</button>
      </div>
    </div>
  `).join('') : '<div class="empty-state">No gate entries today.</div>';
}

function updateStats() {
  const today = new Date().toISOString().split('T')[0];
  const todayLog = gateLog.filter(g => g.time.startsWith(today));
  document.getElementById('stat-entries').textContent = todayLog.length;
  document.getElementById('stat-in').textContent      = gateLog.filter(g => g.status === 'inside').length;
  document.getElementById('stat-out').textContent     = gateLog.filter(g => g.status === 'exited').length;
  document.getElementById('stat-pending').textContent = gateLog.filter(g => g.status === 'inside').length;
}

function setEntryType(type) {
  entryType = type;
  document.getElementById('btn-entry').classList.toggle('active', type === 'entry');
  document.getElementById('btn-exit').classList.toggle('active',  type === 'exit');
}

function recordEntry() {
  const vehicle = document.getElementById('ge-vehicle').value;
  if (!vehicle) { showToast('Vehicle number is required.', 'error'); return; }

  const entry = {
    id:        'GE-' + String(Date.now()).slice(-4),
    vehicle,
    shipment:  document.getElementById('ge-shipment').value,
    driver:    document.getElementById('ge-driver').value,
    type:      entryType,
    weightIn:  parseFloat(document.getElementById('ge-weight-in').value)  || 0,
    weightOut: parseFloat(document.getElementById('ge-weight-out').value) || 0,
    remarks:   document.getElementById('ge-remarks').value,
    time:      new Date().toLocaleString('en-IN').replace(',',''),
    status:    entryType === 'entry' ? 'inside' : 'exited',
  };

  gateLog.unshift(entry);
  saveGateLog();
  renderGateLog(gateLog);
  updateStats();
  closeModal('manual-entry-modal');
  showToast(`Gate ${entryType} recorded for ${vehicle}`);

  // Reset form
  ['ge-vehicle','ge-shipment','ge-driver','ge-weight-in','ge-weight-out','ge-remarks'].forEach(id => document.getElementById(id).value = '');
}

function recordExit(id) {
  const entry = gateLog.find(g => g.id === id);
  if (!entry) return;
  const wOut = prompt(`Enter exit weight (kg) for ${entry.vehicle}:`);
  if (!wOut) return;
  entry.status    = 'exited';
  entry.weightOut = parseFloat(wOut) || 0;
  entry.type      = 'exit';
  saveGateLog();
  renderGateLog(gateLog);
  updateStats();
  showToast(`Exit recorded for ${entry.vehicle}`);
}

function printEntry(id) {
  const g = gateLog.find(x => x.id === id);
  if (!g) return;
  const win = window.open('', '_blank');
  win.document.write(`<pre style="font-family:monospace;padding:20px">
=== LOGIFLOW GATE PASS ===
ID:       ${g.id}
Vehicle:  ${g.vehicle}
Shipment: ${g.shipment || 'N/A'}
Driver:   ${g.driver || 'N/A'}
Type:     ${g.type.toUpperCase()}
Wt In:    ${g.weightIn} kg
Wt Out:   ${g.weightOut || 'N/A'} kg
Time:     ${g.time}
Status:   ${g.status}
Remarks:  ${g.remarks || 'None'}
=========================
  </pre>`);
  win.print();
}

function searchGateEntries(q) {
  const lower = q.toLowerCase();
  renderGateLog(gateLog.filter(g => g.vehicle.toLowerCase().includes(lower) || g.shipment.toLowerCase().includes(lower) || g.driver.toLowerCase().includes(lower)));
}

function filterGate(key, val) {
  if (!val) { renderGateLog(gateLog); return; }
  if (key === 'type')  renderGateLog(gateLog.filter(g => g.type === val));
  if (key === 'date')  renderGateLog(gateLog.filter(g => g.time.startsWith(val)));
}

function exportGateLog() {
  const rows = [['ID','Vehicle','Shipment','Driver','Type','Weight In','Weight Out','Time','Status'],...gateLog.map(g=>[g.id,g.vehicle,g.shipment,g.driver,g.type,g.weightIn,g.weightOut,g.time,g.status])];
  const csv  = rows.map(r=>r.join(',')).join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const a    = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'gate-log.csv'; a.click();
}

function openScanner() { document.getElementById('scanner-area').style.display = 'block'; }
function closeScanner() { document.getElementById('scanner-area').style.display = 'none'; }
function saveGateLog() { localStorage.setItem('lf_gate_log', JSON.stringify(gateLog)); }

document.addEventListener('DOMContentLoaded', loadGateLog);
