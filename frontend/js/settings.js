// ─── LogiFlow — settings.js ───

// ── Section switcher ────────────────────────────────────
function showSection(id, btn) {
  document.querySelectorAll('.settings-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('section-' + id).classList.add('active');
  btn.classList.add('active');
}

// ── Load profile from localStorage ──────────────────────
function loadProfile() {
  const user = JSON.parse(localStorage.getItem('lf_user') || '{}');
  if (document.getElementById('p-fname')) document.getElementById('p-fname').value = user.firstName || '';
  if (document.getElementById('p-lname')) document.getElementById('p-lname').value = user.lastName  || '';
  if (document.getElementById('p-email')) document.getElementById('p-email').value = user.email     || '';
  if (document.getElementById('p-phone')) document.getElementById('p-phone').value = user.phone     || '';
  if (document.getElementById('p-role'))  document.getElementById('p-role').value  = user.role      || 'Admin';
  const av = document.getElementById('avatar-preview');
  if (av && user.firstName) av.textContent = (user.firstName[0] + (user.lastName?.[0] || '')).toUpperCase();
}

function saveProfile() {
  const user = {
    firstName: document.getElementById('p-fname').value,
    lastName:  document.getElementById('p-lname').value,
    email:     document.getElementById('p-email').value,
    phone:     document.getElementById('p-phone').value,
    role:      document.getElementById('p-role').value,
  };
  localStorage.setItem('lf_user', JSON.stringify(user));
  showToast('Profile saved!');
}

// ── Company ──────────────────────────────────────────────
function loadCompany() {
  const co = JSON.parse(localStorage.getItem('lf_company') || '{}');
  ['name','gst','pan','cin','address','city','pin'].forEach(k => {
    const el = document.getElementById('c-' + k);
    if (el) el.value = co[k] || '';
  });
}

function saveCompany() {
  const co = { name: document.getElementById('c-name').value, gst: document.getElementById('c-gst').value, pan: document.getElementById('c-pan').value, cin: document.getElementById('c-cin').value, address: document.getElementById('c-address').value, city: document.getElementById('c-city').value, pin: document.getElementById('c-pin').value };
  localStorage.setItem('lf_company', JSON.stringify(co));
  showToast('Company details saved!');
}

// ── Notifications ────────────────────────────────────────
function renderNotifSettings() {
  const groups = [
    { title: 'Email Alerts',       items: ['Invoice generated','Payment received','Payment overdue','Partial payment','Dispute raised'] },
    { title: 'Push Notifications', items: ['Invoice approved','Payment confirmed','Overdue reminder','Bulk batch','AI anomaly alert'] },
    { title: 'Escalation Rules',   items: ['Overdue >7d → SMS','Overdue >15d → Call','Amount >₹5L → Approval','New client first invoice'] },
    { title: 'AI Auto-Actions',    items: ['Auto-send reminders','Auto-reconcile','Flag duplicates','Predict late payments'] },
  ];
  const saved = JSON.parse(localStorage.getItem('lf_notif_settings') || '{}');
  const container = document.getElementById('notif-settings-card');
  if (!container) return;
  container.innerHTML = groups.map(g => `
    <div style="margin-bottom:20px">
      <h4 style="font-size:13px;font-weight:600;margin-bottom:10px">${g.title}</h4>
      ${g.items.map(item => `
        <div class="toggle-row">
          <span class="toggle-label">${item}</span>
          <label class="toggle-switch">
            <input type="checkbox" ${saved[item] !== false ? 'checked' : ''} onchange="saveNotifSetting('${item}', this.checked)"/>
            <span class="toggle-slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function saveNotifSetting(key, val) {
  const saved = JSON.parse(localStorage.getItem('lf_notif_settings') || '{}');
  saved[key] = val;
  localStorage.setItem('lf_notif_settings', JSON.stringify(saved));
  showToast(`"${key}" ${val ? 'enabled' : 'disabled'}`);
}

// ── Security ─────────────────────────────────────────────
function changePassword() {
  const curr    = document.getElementById('s-current').value;
  const newPass = document.getElementById('s-new').value;
  const confirm = document.getElementById('s-confirm').value;
  if (!curr || !newPass) { showToast('Fill all password fields.', 'error'); return; }
  if (newPass !== confirm) { showToast('Passwords do not match.', 'error'); return; }
  if (newPass.length < 8)  { showToast('Password must be at least 8 characters.', 'error'); return; }
  // TODO: call /api/auth/change-password
  showToast('Password updated successfully!');
  ['s-current','s-new','s-confirm'].forEach(id => document.getElementById(id).value = '');
}

function toggle2FA(val) {
  localStorage.setItem('lf_2fa', val ? '1' : '0');
  showToast(`Two-factor authentication ${val ? 'enabled' : 'disabled'}.`);
}

function confirmDeleteAccount() {
  if (confirm('Are you absolutely sure? This cannot be undone.')) {
    showToast('Account deletion requested. You will receive a confirmation email.', 'error');
  }
}

// ── Integrations ─────────────────────────────────────────
function renderIntegrations() {
  const integrations = [
    { name: 'Razorpay',      desc: 'Payment gateway',          icon: '💳', connected: false },
    { name: 'Twilio',        desc: 'SMS & WhatsApp alerts',    icon: '📱', connected: false },
    { name: 'Google Maps',   desc: 'Live tracking & routing',  icon: '🗺️', connected: true  },
    { name: 'Tally',         desc: 'Accounting sync',          icon: '📒', connected: false },
    { name: 'FASTag',        desc: 'Toll & highway data',      icon: '🛣️', connected: false },
    { name: 'VAHAN API',     desc: 'Vehicle registration data', icon: '🔎', connected: false },
  ];
  const grid = document.getElementById('integrations-grid');
  if (!grid) return;
  grid.innerHTML = integrations.map(i => `
    <div class="integration-card">
      <div class="integration-icon">${i.icon}</div>
      <div class="integration-info">
        <div class="integration-name">${i.name}</div>
        <div class="integration-desc">${i.desc}</div>
      </div>
      <button class="btn btn-sm ${i.connected ? 'btn-danger-outline' : 'btn-primary'}" onclick="toggleIntegration('${i.name}', this)">
        ${i.connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  `).join('');
}

function toggleIntegration(name, btn) {
  const isConnected = btn.textContent.trim() === 'Disconnect';
  btn.textContent = isConnected ? 'Connect' : 'Disconnect';
  btn.classList.toggle('btn-primary', isConnected);
  btn.classList.toggle('btn-danger-outline', !isConnected);
  showToast(`${name} ${isConnected ? 'disconnected' : 'connected'}.`);
}

// ── Billing History ──────────────────────────────────────
function renderBillingHistory() {
  const el = document.getElementById('billing-history');
  if (!el) return;
  const history = [
    { date: 'Mar 1, 2026', amount: '₹2,999', status: 'Paid', plan: 'Pro Plan' },
    { date: 'Feb 1, 2026', amount: '₹2,999', status: 'Paid', plan: 'Pro Plan' },
    { date: 'Jan 1, 2026', amount: '₹2,999', status: 'Paid', plan: 'Pro Plan' },
  ];
  el.innerHTML = `<table class="data-table" style="margin-top:12px"><thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>` +
    history.map(h => `<tr><td>${h.date}</td><td>${h.plan}</td><td>${h.amount}</td><td><span class="badge badge-paid">${h.status}</span></td><td><button class="btn btn-xs">Invoice</button></td></tr>`).join('') +
    `</tbody></table>`;
}

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadCompany();
  renderNotifSettings();
  renderIntegrations();
  renderBillingHistory();
});
