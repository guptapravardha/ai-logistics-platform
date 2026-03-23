// ─── LogiFlow Phase 7 — payments.js ───
// Handles invoices, payments timeline, notifications feed, alert settings

const fmt = n => '₹' + Math.round(n).toLocaleString('en-IN');

let nextInvNum = 96;
let alertCount = 12;

// ── Seed Data ──────────────────────────────────────────

let invoices = [
  { id: 'INV-2026-0089', client: 'Tata Steel Transport',    amount: 182500, due: '2026-03-28', status: 'paid',       ship: 'SHP-00398' },
  { id: 'INV-2026-0091', client: 'Mahindra Logistics',      amount: 94200,  due: '2026-03-31', status: 'pending',    ship: 'SHP-00401' },
  { id: 'INV-2026-0093', client: 'Flipkart Supply Chain',   amount: 67800,  due: '2026-03-15', status: 'overdue',    ship: 'SHP-00407' },
  { id: 'INV-2026-0094', client: 'Amazon Fresh India',      amount: 138900, due: '2026-04-05', status: 'processing', ship: 'SHP-00411' },
  { id: 'INV-2026-0095', client: 'BigBasket Fulfillment',   amount: 52300,  due: '2026-04-10', status: 'draft',      ship: 'SHP-00415' },
];

let payments = [
  { title: 'Payment received — Tata Steel Transport',   meta: 'INV-2026-0089 · NEFT · UTR 204891023',              amount: 182500, type: 'received', time: 'Today, 9:42 AM'      },
  { title: 'Partial payment — Flipkart Supply Chain',   meta: 'INV-2026-0093 · ₹30,000 of ₹67,800 received',       amount: 30000,  type: 'partial',  time: 'Yesterday, 3:15 PM'  },
  { title: 'Payment overdue — Flipkart Supply Chain',   meta: 'INV-2026-0093 · 7 days overdue · reminder sent',    amount: 37800,  type: 'overdue',  time: 'Mar 15, 2026'        },
  { title: 'Invoice sent — Amazon Fresh India',         meta: 'INV-2026-0094 · email + WhatsApp delivered',        amount: 138900, type: 'sent',     time: 'Mar 18, 2026'        },
  { title: 'Payment received — BlueDart Express',       meta: 'INV-2026-0085 · RTGS · same-day settlement',        amount: 245000, type: 'received', time: 'Mar 17, 2026'        },
  { title: 'AI flagged — duplicate invoice attempt',    meta: 'INV-2026-0082 · blocked automatically',             amount: 0,      type: 'alert',    time: 'Mar 16, 2026'        },
];

let notifications = [
  { title: 'Payment overdue — Flipkart Supply Chain', desc: 'INV-2026-0093 is 7 days past due. Auto-reminder sent via email and WhatsApp.',        time: '2 hrs ago',          type: 'overdue',  channels: ['email', 'push', 'whatsapp'], unread: true  },
  { title: '₹1,82,500 received from Tata Steel',      desc: 'Full payment confirmed. INV-2026-0089 marked as paid. Ledger updated.',               time: '5 hrs ago',          type: 'paid',     channels: ['email', 'push'],             unread: true  },
  { title: 'New invoice — Amazon Fresh India',         desc: 'INV-2026-0094 for ₹1,38,900 sent to procurement@amazonfresh.in',                      time: 'Today, 8:30 AM',     type: 'invoice',  channels: ['email'],                     unread: false },
  { title: 'AI anomaly detected',                      desc: 'Unusual payment pattern for BigBasket account. Review before next invoice.',           time: 'Yesterday, 6:45 PM', type: 'alert',    channels: ['push'],                      unread: false },
  { title: 'Bulk payment batch processed',             desc: '5 invoices totalling ₹4,82,000 reconciled via NACH mandate. All accounts updated.',    time: 'Mar 20, 2026',       type: 'batch',    channels: ['email', 'push'],             unread: false },
];

const alertSettings = [
  {
    title: 'Email Alerts',
    items: [
      { label: 'Invoice generated',  on: true  },
      { label: 'Payment received',   on: true  },
      { label: 'Payment overdue',    on: true  },
      { label: 'Partial payment',    on: false },
      { label: 'Dispute raised',     on: true  },
    ]
  },
  {
    title: 'Push Notifications',
    items: [
      { label: 'Invoice approved',   on: true  },
      { label: 'Payment confirmed',  on: true  },
      { label: 'Overdue reminder',   on: true  },
      { label: 'Bulk payment batch', on: false },
      { label: 'AI anomaly alert',   on: true  },
    ]
  },
  {
    title: 'Escalation Rules',
    items: [
      { label: 'Overdue >7 days → SMS',      on: true  },
      { label: 'Overdue >15 days → Call',    on: false },
      { label: 'Amount >₹5L → Approval',    on: true  },
      { label: 'New client first invoice',   on: true  },
    ]
  },
  {
    title: 'AI Auto-Actions',
    items: [
      { label: 'Auto-send reminders',        on: true  },
      { label: 'Auto-reconcile payments',    on: true  },
      { label: 'Flag duplicate invoices',    on: true  },
      { label: 'Predict late payments',      on: true  },
    ]
  },
];

// ── Tab Switching ──────────────────────────────────────

function switchTab(tab, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
}

// ── Stats ──────────────────────────────────────────────

function updateStats() {
  const total       = invoices.reduce((s, i) => s + i.amount, 0);
  const collected   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const outstanding = invoices.filter(i => ['pending','overdue','processing'].includes(i.status)).reduce((s, i) => s + i.amount, 0);

  document.getElementById('stat-total').textContent       = fmt(total);
  document.getElementById('stat-collected').textContent   = fmt(collected);
  document.getElementById('stat-outstanding').textContent = fmt(outstanding);
  document.getElementById('stat-alerts').textContent      = alertCount;
}

// ── Invoices ───────────────────────────────────────────

const STATUS_ICONS = { paid: '✓', pending: '⏳', overdue: '!', processing: '↻', draft: '○' };

function renderInvoices(list) {
  const data = list || invoices;
  const container = document.getElementById('invoice-list');
  if (!data.length) { container.innerHTML = '<div class="empty-state">No invoices found.</div>'; return; }

  container.innerHTML = data.map(inv => `
    <div class="invoice-card" data-id="${inv.id}">
      <div class="inv-row">
        <div class="inv-icon">${STATUS_ICONS[inv.status] || '□'}</div>
        <div class="inv-main">
          <div class="inv-id">${inv.id} <span class="badge badge-${inv.status}">${inv.status}</span></div>
          <div class="inv-client">${inv.client} · ${inv.ship}</div>
        </div>
        <div class="inv-right">
          <div class="inv-amount">${fmt(inv.amount)}</div>
          <div class="inv-due">Due ${inv.due}</div>
        </div>
      </div>
      <div class="inv-actions">
        <button class="btn btn-sm" onclick="viewInvoice('${inv.id}')">View Details</button>
        ${inv.status === 'draft'      ? `<button class="btn btn-sm btn-primary" onclick="sendInvoice('${inv.id}')">Send Invoice</button>` : ''}
        ${inv.status === 'overdue'    ? `<button class="btn btn-sm btn-danger" onclick="sendReminder('${inv.id}')">Send Reminder</button>` : ''}
        ${['pending','processing'].includes(inv.status) ? `<button class="btn btn-sm" onclick="markPaid('${inv.id}')">Mark Paid</button>` : ''}
        ${inv.status === 'paid'       ? `<button class="btn btn-sm" onclick="downloadInvoice('${inv.id}')">Download PDF</button>` : ''}
      </div>
    </div>
  `).join('');
}

function filterInvoices(query) {
  const q = query.toLowerCase();
  renderInvoices(invoices.filter(i =>
    i.id.toLowerCase().includes(q) ||
    i.client.toLowerCase().includes(q) ||
    i.ship.toLowerCase().includes(q)
  ));
}

function filterByStatus(status) {
  renderInvoices(status ? invoices.filter(i => i.status === status) : invoices);
}

function viewInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  alert(`Invoice Details\n\nID: ${inv.id}\nClient: ${inv.client}\nShipment: ${inv.ship}\nAmount: ${fmt(inv.amount)}\nDue: ${inv.due}\nStatus: ${inv.status.toUpperCase()}`);
}

function sendInvoice(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  inv.status = 'pending';
  alertCount++;
  addNotification({ title: `Invoice sent — ${inv.client}`, desc: `${inv.id} for ${fmt(inv.amount)} has been sent.`, type: 'invoice', channels: ['email','push'], unread: true });
  renderInvoices();
  updateStats();
  showToast(`Invoice ${inv.id} sent successfully!`);
}

function markPaid(id) {
  const inv = invoices.find(i => i.id === id);
  if (!inv) return;
  inv.status = 'paid';
  alertCount++;
  payments.unshift({ title: `Payment received — ${inv.client}`, meta: `${inv.id} · manual mark`, amount: inv.amount, type: 'received', time: 'Just now' });
  addNotification({ title: `${fmt(inv.amount)} received — ${inv.client}`, desc: `${inv.id} marked as paid. Ledger updated.`, type: 'paid', channels: ['push'], unread: true });
  renderInvoices();
  renderPayments();
  renderNotifications();
  updateStats();
  showToast(`${inv.id} marked as paid!`);
}

function sendReminder(id) {
  alertCount++;
  addNotification({ title: `Overdue reminder sent`, desc: `${id} — reminder dispatched via email, push, and WhatsApp.`, type: 'overdue', channels: ['email','push','whatsapp'], unread: true });
  renderNotifications();
  updateStats();
  showToast('Reminder sent to client!');
}

function downloadInvoice(id) {
  showToast(`Downloading PDF for ${id}...`);
}

// ── Invoice Modal ──────────────────────────────────────

function openInvoiceModal() {
  const d = new Date(); d.setDate(d.getDate() + 30);
  document.getElementById('f-due').value = d.toISOString().split('T')[0];
  document.getElementById('prev-id').textContent = 'INV-2026-0' + String(nextInvNum).padStart(4, '0');
  document.getElementById('modal-overlay').classList.add('open');
}

function closeInvoiceModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  ['f-client','f-ship','f-freight','f-handling'].forEach(id => document.getElementById(id).value = '');
  updatePreview();
}

function closeModalOnOverlay(e) {
  if (e.target === document.getElementById('modal-overlay')) closeInvoiceModal();
}

function updatePreview() {
  const f   = parseFloat(document.getElementById('f-freight').value) || 0;
  const h   = parseFloat(document.getElementById('f-handling').value) || 0;
  const gst = Math.round((f + h) * 0.18);
  const total = f + h + gst;
  document.getElementById('prev-freight').textContent = fmt(f);
  document.getElementById('prev-handling').textContent = fmt(h);
  document.getElementById('prev-gst').textContent      = fmt(gst);
  document.getElementById('prev-total').textContent    = fmt(total);
}

function saveInvoice(status) {
  const client   = document.getElementById('f-client').value  || 'New Client';
  const ship     = document.getElementById('f-ship').value    || 'SHP-XXXXX';
  const due      = document.getElementById('f-due').value     || '2026-04-30';
  const f        = parseFloat(document.getElementById('f-freight').value)  || 0;
  const h        = parseFloat(document.getElementById('f-handling').value) || 0;
  const gst      = Math.round((f + h) * 0.18);
  const total    = f + h + gst;
  const id       = 'INV-2026-0' + String(nextInvNum).padStart(4, '0');
  nextInvNum++;

  invoices.unshift({ id, client, amount: total, due, status, ship });

  if (status === 'pending') {
    alertCount++;
    addNotification({ title: `Invoice sent — ${client}`, desc: `${id} for ${fmt(total)} sent successfully.`, type: 'invoice', channels: ['email','push'], unread: true });
  }

  closeInvoiceModal();
  renderInvoices();
  renderNotifications();
  updateStats();
  showToast(status === 'draft' ? `Invoice saved as draft.` : `Invoice ${id} generated & sent!`);
}

// ── Payments Timeline ──────────────────────────────────

const TYPE_DOT = { received: '#1D9E75', partial: '#EF9F27', overdue: '#E24B4A', sent: '#378ADD', alert: '#7F77DD', batch: '#1D9E75' };

function renderPayments() {
  const container = document.getElementById('pay-timeline');
  container.innerHTML = payments.map((p, i) => `
    <div class="pay-item">
      <div class="pay-line">
        <div class="pay-dot" style="background:${TYPE_DOT[p.type] || '#888'}"></div>
        ${i < payments.length - 1 ? '<div class="pay-connector"></div>' : ''}
      </div>
      <div class="pay-body">
        <div class="pay-title">${p.title}</div>
        <div class="pay-meta">${p.meta}</div>
        ${p.amount > 0 ? `<div class="pay-amount">${fmt(p.amount)}</div>` : ''}
        <div class="pay-time">${p.time}</div>
      </div>
    </div>
  `).join('');
}

// ── Notifications ──────────────────────────────────────

const NOTIF_ICONS = { overdue: '!', paid: '✓', invoice: '⊟', alert: '⚑', batch: '⊞' };
const NOTIF_CLASS = { overdue: 'notif-red', paid: 'notif-teal', invoice: 'notif-amber', alert: 'notif-purple', batch: 'notif-blue' };

function renderNotifications() {
  const container = document.getElementById('notif-list');
  if (!container) return;
  container.innerHTML = notifications.map((n, i) => `
    <div class="notif-card ${n.unread ? 'unread' : ''} ${NOTIF_CLASS[n.type] || ''}" onclick="readNotif(${i})">
      <div class="notif-icon-wrap ${NOTIF_CLASS[n.type] || ''}">${NOTIF_ICONS[n.type] || '•'}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
        <div class="notif-footer">
          <div class="notif-channels">${n.channels.map(c => `<span class="ch-badge">${c}</span>`).join('')}</div>
          <span class="notif-time">${n.time}</span>
        </div>
      </div>
    </div>
  `).join('');
  updateUnreadBadge();
}

function addNotification(n) {
  notifications.unshift(n);
  renderNotifications();
}

function readNotif(i) {
  notifications[i].unread = false;
  renderNotifications();
}

function markAllRead() {
  notifications.forEach(n => n.unread = false);
  renderNotifications();
  showToast('All notifications marked as read.');
}

function updateUnreadBadge() {
  const count = notifications.filter(n => n.unread).length;
  const badge = document.getElementById('unread-count');
  if (badge) badge.textContent = count + ' unread';
}

// ── Alert Settings ─────────────────────────────────────

function renderSettings() {
  const container = document.getElementById('settings-grid');
  if (!container) return;
  container.innerHTML = alertSettings.map((group, gi) => `
    <div class="settings-card">
      <h4>${group.title}</h4>
      ${group.items.map((item, ii) => `
        <div class="toggle-row">
          <span class="toggle-label">${item.label}</span>
          <label class="toggle-switch">
            <input type="checkbox" ${item.on ? 'checked' : ''} onchange="toggleSetting(${gi},${ii},this.checked)" />
            <span class="toggle-slider"></span>
          </label>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function toggleSetting(gi, ii, val) {
  alertSettings[gi].items[ii].on = val;
  showToast(`Setting "${alertSettings[gi].items[ii].label}" ${val ? 'enabled' : 'disabled'}.`);
}

// ── Toast ──────────────────────────────────────────────

function showToast(msg) {
  let toast = document.getElementById('lf-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'lf-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1D9E75;color:#fff;padding:10px 18px;border-radius:8px;font-size:13px;z-index:9999;opacity:0;transition:opacity .3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.style.opacity = '0', 2800);
}

// ── Init ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  renderInvoices();
  renderPayments();
  renderNotifications();
  renderSettings();
});
