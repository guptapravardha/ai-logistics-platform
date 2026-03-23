// ─── LogiFlow Phase 7 — notifications.js ───
// Standalone notifications page logic

const NOTIF_ICONS = { overdue: '!', paid: '✓', invoice: '⊟', alert: '⚑', batch: '⊞' };
const NOTIF_CLASS = { overdue: 'notif-red', paid: 'notif-teal', invoice: 'notif-amber', alert: 'notif-purple', batch: 'notif-blue' };

let notifications = JSON.parse(localStorage.getItem('lf_notifications') || 'null') || [
  { title: 'Payment overdue — Flipkart Supply Chain', desc: 'INV-2026-0093 is 7 days past due date. Auto-reminder sent via email and WhatsApp.', time: '2 hrs ago',          type: 'overdue',  channels: ['email','push','whatsapp'], unread: true  },
  { title: '₹1,82,500 received from Tata Steel',      desc: 'Full payment confirmed. INV-2026-0089 marked as paid. Ledger updated.',            time: '5 hrs ago',          type: 'paid',     channels: ['email','push'],            unread: true  },
  { title: 'New invoice — Amazon Fresh India',         desc: 'INV-2026-0094 for ₹1,38,900 sent to procurement@amazonfresh.in',                   time: 'Today, 8:30 AM',     type: 'invoice',  channels: ['email'],                   unread: false },
  { title: 'AI anomaly detected',                      desc: 'Unusual payment pattern for BigBasket account. Review before next invoice.',        time: 'Yesterday, 6:45 PM', type: 'alert',    channels: ['push'],                    unread: false },
  { title: 'Bulk payment batch processed',             desc: '5 invoices totalling ₹4,82,000 reconciled via NACH mandate. All accounts updated.', time: 'Mar 20, 2026',       type: 'batch',    channels: ['email','push'],            unread: false },
];

let activeFilter = 'all';

function saveNotifications() {
  localStorage.setItem('lf_notifications', JSON.stringify(notifications));
}

function renderNotifications(filter) {
  const f = filter || activeFilter;
  const data = f === 'all' ? notifications : notifications.filter(n => n.type === f || (f === 'payment' && n.type === 'paid'));
  const container = document.getElementById('notif-list-page');

  container.innerHTML = data.length ? data.map((n, i) => `
    <div class="notif-card ${n.unread ? 'unread' : ''} ${NOTIF_CLASS[n.type] || ''}" onclick="readNotif(${notifications.indexOf(n)})">
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
  `).join('') : '<div class="empty-state">No notifications in this category.</div>';

  const unread = notifications.filter(n => n.unread).length;
  const badge = document.getElementById('unread-count');
  if (badge) badge.textContent = unread + ' unread';
}

function filterNotifs(type, btn) {
  activeFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderNotifications(type);
}

function readNotif(i) {
  notifications[i].unread = false;
  saveNotifications();
  renderNotifications();
}

function markAllRead() {
  notifications.forEach(n => n.unread = false);
  saveNotifications();
  renderNotifications();
}

document.addEventListener('DOMContentLoaded', () => {
  renderNotifications();
});
