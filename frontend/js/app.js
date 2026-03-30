/* ================================================================
   LogiFlow — app.js
   Core utilities: API requests, auth helpers, offline queue,
   toast system, theme, PWA, global event handlers
   ================================================================ */

'use strict';

/* ─── Constants ─── */
const API_ORIGIN = (() => {
  if (window.location.protocol === 'file:') return 'http://localhost:5000';
  if (window.location.protocol.startsWith('http') && window.location.port && window.location.port !== '5000') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }
  return '';
})();
const API_BASE   = `${API_ORIGIN}/api`;
const TOKEN_KEY  = 'lf-token';
const USER_KEY   = 'lf-user';
const THEME_KEY  = 'lf-theme';
const REFRESH_KEY= 'lf-refresh';

/* ================================================================
   API Request Helper
   ================================================================ */
const api = {
  async request(method, endpoint, data = null, options = {}) {
    const token = auth.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const config = {
      method,
      headers,
      ...(data ? { body: JSON.stringify(data) } : {}),
    };

    try {
      let res = await fetch(`${API_BASE}${endpoint}`, config);

      // Auto-refresh on 401
      if (res.status === 401 && !options._retry) {
        const refreshed = await auth.refreshToken();
        if (refreshed) {
          options._retry = true;
          headers.Authorization = `Bearer ${auth.getToken()}`;
          res = await fetch(`${API_BASE}${endpoint}`, { ...config, headers });
        } else {
          auth.logout();
          return;
        }
      }

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw Object.assign(new Error(json.message || 'Request failed'), {
          status: res.status,
          data: json,
        });
      }

      return json;
    } catch (err) {
      // If offline, queue mutation requests
      if (!navigator.onLine && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        await offlineQueue.add(endpoint, method, data);
        Toast.show('Saved offline — will sync when connection returns', 'info');
        return { queued: true };
      }
      throw err;
    }
  },

  get:    (url, opts)       => api.request('GET',    url, null, opts),
  post:   (url, data, opts) => api.request('POST',   url, data, opts),
  put:    (url, data, opts) => api.request('PUT',    url, data, opts),
  patch:  (url, data, opts) => api.request('PATCH',  url, data, opts),
  delete: (url, opts)       => api.request('DELETE', url, null, opts),

  /* File upload */
  async upload(endpoint, formData) {
    const token = auth.getToken();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(json.message || 'Upload failed'), { status: res.status });
    return json;
  }
};

window.api = api;

/* ================================================================
   Auth Helper
   ================================================================ */
const auth = {
  getToken()  { return localStorage.getItem(TOKEN_KEY) },
  getUser()   { try { return JSON.parse(localStorage.getItem(USER_KEY)) || null } catch { return null } },
  getRefresh(){ return localStorage.getItem(REFRESH_KEY) },

  setSession(accessToken, refreshToken, user) {
    localStorage.setItem(TOKEN_KEY,   accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY,    JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isLoggedIn() { return !!this.getToken() },

  async refreshToken() {
    const refresh = this.getRefresh();
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: refresh }),
      });
      if (!res.ok) return false;
      const json = await res.json();
      localStorage.setItem(TOKEN_KEY, json.data.accessToken);
      if (json.data.refreshToken) localStorage.setItem(REFRESH_KEY, json.data.refreshToken);
      return true;
    } catch { return false; }
  },

  logout() {
    const refresh = this.getRefresh();
    if (refresh) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.getToken()}` },
        body: JSON.stringify({ refreshToken: refresh }),
      }).catch(() => {});
    }
    this.clearSession();
    window.location.href = '/pages/login.html';
  },

  /* Role-based redirect after login */
  redirectToDashboard(role) {
    const roleMap = {
      admin:     '/pages/dashboard/admin.html',
      company:   '/pages/dashboard/company.html',
      logistics: '/pages/dashboard/logistics.html',
      manager:   '/pages/dashboard/manager.html',
      driver:    '/pages/dashboard/driver.html',
      supplier:  '/pages/dashboard/supplier.html',
      gate:      '/pages/dashboard/gate.html',
    };
    window.location.href = roleMap[role] || '/pages/dashboard.html';
  },

  /* Guard: call on protected pages */
  requireAuth(allowedRoles = []) {
    if (!this.isLoggedIn()) {
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    const user = this.getUser();
    if (allowedRoles.length && user && !allowedRoles.includes(user.role)) {
      Toast.show('Access denied for your role', 'error');
      this.redirectToDashboard(user.role);
      return false;
    }
    return true;
  },
};

window.auth = auth;

/* ================================================================
   Toast Notification System
   ================================================================ */
const Toast = {
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.getElementById('toastBox');
      if (!this._container) {
        this._container = document.createElement('div');
        this._container.className = 'toast-box';
        this._container.id = 'toastBox';
        document.body.appendChild(this._container);
      }
    }
    return this._container;
  },

  show(message, type = 'info', duration = 5000) {
    const box = this._getContainer();
    const icons = { ok: '✅', success: '✅', error: '❌', er: '❌', info: 'ℹ️', in: 'ℹ️', warn: '⚠️' };
    const cls   = { ok: 'ok', success: 'ok', error: 'er', er: 'er', info: 'in', in: 'in', warn: 'in' };

    const toast = document.createElement('div');
    toast.className = `toast ${cls[type] || 'in'}`;
    toast.innerHTML = `
      <span>${icons[type] || 'ℹ️'}</span>
      <span style="flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:1rem;flex-shrink:0">✕</button>
    `;
    box.appendChild(toast);
    if (duration > 0) setTimeout(() => toast.remove(), duration);
    return toast;
  },

  success(msg, dur) { return this.show(msg, 'success', dur) },
  error(msg, dur)   { return this.show(msg, 'error',   dur) },
  info(msg, dur)    { return this.show(msg, 'info',    dur) },
  warn(msg, dur)    { return this.show(msg, 'warn',    dur) },
};

window.Toast = Toast;

/* ================================================================
   Offline Queue (IndexedDB)
   ================================================================ */
const offlineQueue = {
  async _db() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('logiflow-offline', 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        ['offlineShipments', 'offlineGateEntries', 'offlineTracking', 'offlineQueue'].forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  async add(endpoint, method, data) {
    const db = await this._db();
    const item = {
      endpoint, method, data,
      token: auth.getToken(),
      queuedAt: new Date().toISOString(),
    };
    return new Promise((resolve, reject) => {
      const tx  = db.transaction('offlineQueue', 'readwrite');
      const req = tx.objectStore('offlineQueue').add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror   = () => reject(req.error);
    });
  },

  async flush() {
    const db = await this._db();
    const items = await new Promise((res, rej) => {
      const tx  = db.transaction('offlineQueue', 'readonly');
      const req = tx.objectStore('offlineQueue').getAll();
      req.onsuccess = () => res(req.result);
      req.onerror   = () => rej(req.error);
    });

    for (const item of items) {
      try {
        const res = await fetch(`${API_BASE}${item.endpoint}`, {
          method: item.method,
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${item.token}` },
          body: JSON.stringify(item.data),
        });
        if (res.ok) {
          const tx = db.transaction('offlineQueue', 'readwrite');
          tx.objectStore('offlineQueue').delete(item.id);
        }
      } catch { /* retry later */ }
    }
  },
};

/* Flush queue when coming back online */
window.addEventListener('online', () => {
  offlineQueue.flush();
  document.getElementById('offlineBar')?.classList.remove('show');
  Toast.show('Back online — syncing data...', 'success', 3000);
});
window.addEventListener('offline', () => {
  document.getElementById('offlineBar')?.classList.add('show');
});

/* ================================================================
   Utilities
   ================================================================ */
const utils = {
  formatINR(amount) {
    if (amount == null) return '—';
    if (amount >= 1e7)  return '₹' + (amount / 1e7).toFixed(2) + ' Cr';
    if (amount >= 1e5)  return '₹' + (amount / 1e5).toFixed(2) + ' L';
    if (amount >= 1e3)  return '₹' + (amount / 1e3).toFixed(1) + 'K';
    return '₹' + amount.toLocaleString('en-IN');
  },

  formatDate(date, options = {}) {
    if (!date) return '—';
    const d = new Date(date);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', ...options
    });
  },

  timeAgo(date) {
    if (!date) return '—';
    const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
    if (seconds < 60)   return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
    if (seconds < 86400)return `${Math.floor(seconds/3600)}h ago`;
    return `${Math.floor(seconds/86400)}d ago`;
  },

  formatKM(km) {
    if (km == null) return '—';
    return km >= 1000 ? (km/1000).toFixed(1) + ' K km' : km + ' km';
  },

  /* Truncate text */
  truncate(str, len = 40) {
    return str && str.length > len ? str.slice(0, len) + '...' : str;
  },

  /* Copy to clipboard */
  async copy(text, successMsg = 'Copied!') {
    try {
      await navigator.clipboard.writeText(text);
      Toast.success(successMsg);
    } catch {
      Toast.error('Failed to copy');
    }
  },

  /* Debounce */
  debounce(fn, ms = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  },

  /* Validate Indian phone */
  isIndianPhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.replace(/\s/g,'').replace(/^\+91/,''));
  },

  /* Generate shipment ID */
  genShipmentRef(prefix = 'SHP') {
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(Math.random()*90000+10000)}`;
  },
};

window.utils = utils;

/* ================================================================
   Scroll Reveal
   ================================================================ */
(function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  function observe() {
    document.querySelectorAll('.rv, .rv-l, .rv-r, .stg').forEach(el => {
      if (!el.classList.contains('in')) obs.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observe);
  } else {
    observe();
  }
})();

/* ================================================================
   Counter Animation
   ================================================================ */
function animateCounter(el, target, duration = 1800) {
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val = Math.floor(ease * target);
    if (target >= 1000) {
      el.textContent = val >= 1000 ? (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'K' : val;
    } else {
      el.textContent = val;
    }
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target >= 1000 ? (target / 1000).toFixed(target >= 10000 ? 0 : 1) + 'K' : target;
  }
  requestAnimationFrame(step);
}

window.animateCounter = animateCounter;

/* ================================================================
   Theme (dark only for now — light mode future)
   ================================================================ */
const themeManager = {
  current: localStorage.getItem(THEME_KEY) || 'dark',
  apply() {
    document.documentElement.setAttribute('data-theme', this.current);
  },
  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, this.current);
    this.apply();
  },
};
themeManager.apply();
window.themeManager = themeManager;

/* ================================================================
   PWA Install Banner
   ================================================================ */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;

  // Show install button after 10s if user hasn't dismissed
  setTimeout(() => {
    const existing = document.getElementById('pwa-install-btn');
    if (existing || !deferredInstallPrompt) return;

    const btn = document.createElement('button');
    btn.id = 'pwa-install-btn';
    btn.className = 'btn-s';
    btn.style.cssText = `
      position:fixed;bottom:1.5rem;right:1.5rem;z-index:900;
      display:flex;align-items:center;gap:.5rem;font-size:.75rem;
      box-shadow:0 4px 24px rgba(0,0,0,.4);
    `;
    btn.innerHTML = '📥 Install App';
    btn.onclick = async () => {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btn.remove();
      if (outcome === 'accepted') Toast.success('LogiFlow installed!');
    };

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'margin-left:.25rem;cursor:pointer;opacity:.6';
    closeBtn.onclick = (e) => { e.stopPropagation(); btn.remove(); };
    btn.appendChild(closeBtn);

    document.body.appendChild(btn);
    setTimeout(() => btn.remove(), 15000);
  }, 10000);
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('pwa-install-btn')?.remove();
  Toast.success('LogiFlow added to your home screen');
});

/* ================================================================
   Shipment Tracking (landing page)
   ================================================================ */
async function trackShipment() {
  const input = document.getElementById('trackInput');
  if (!input) return;
  const val = input.value.trim();
  if (!val) { Toast.error('Enter a shipment ID or vehicle number'); return; }

  Toast.info(`Tracking ${val}...`);
  await new Promise(r => setTimeout(r, 700));
  window.location.href = `/pages/track.html?id=${encodeURIComponent(val)}`;
}
window.trackShipment = trackShipment;

/* ================================================================
   Contact Form
   ================================================================ */
async function submitContact() {
  const name   = document.getElementById('cName')?.value.trim();
  const email  = document.getElementById('cEmail')?.value.trim();
  const phone  = document.getElementById('cPhone')?.value.trim() || '';
  const role   = document.getElementById('cRole')?.value || '';
  const msg    = document.getElementById('cMsg')?.value.trim();

  if (!name)  return Toast.error('Please enter your name');
  if (!email) return Toast.error('Please enter your email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Toast.error('Invalid email address');
  if (!msg)   return Toast.error('Please describe your logistics setup');

  const btn = document.querySelector('#contact .btn-p');
  if (btn) { btn.disabled = true; btn.textContent = 'Sending...'; }

  try {
    await api.post('/contact', { name, email, phone, role, message: msg });
    Toast.success("Message sent! We'll reach out within 2 hours.");
    if (btn) { btn.textContent = 'Sent ✓'; }
    ['cName','cEmail','cPhone','cMsg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  } catch {
    Toast.error('Failed to send. Email us at sales@logiflow.in');
    if (btn) { btn.disabled = false; btn.textContent = 'Request Demo →'; }
  }
}
window.submitContact = submitContact;

/* ================================================================
   Service Worker Registration
   ================================================================ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then(reg => {
        // Check for updates periodically
        setInterval(() => reg.update(), 60 * 60 * 1000); // hourly
      })
      .catch(err => console.warn('SW registration failed:', err));
  });
}

/* ================================================================
   Push Notification Subscription
   ================================================================ */
window.subscribePush = async function(vapidPublicKey) {
  if (!('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  try {
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    await api.post('/notifications/push-subscribe', { subscription: sub });
    return sub;
  } catch (err) {
    console.warn('Push subscription failed:', err);
    return null;
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw     = window.atob(base64);
  const output  = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

/* ================================================================
   Request Notification Permission
   ================================================================ */
window.requestNotificationPermission = async function() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const perm = await Notification.requestPermission();
  return perm === 'granted';
};

/* ================================================================
   Sidebar Toggle
   ================================================================ */
window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
};

/* ================================================================
   Floating AI Assistant
   ================================================================ */
async function sendAssistantMessage(message) {
  const res = await api.post('/ai/chat', { message, channel: 'widget' });
  return res.data?.reply || 'I could not generate a response right now.';
}

function initChatWidget() {
  if (document.getElementById('lf-chat-widget')) return;

  const widget = document.createElement('section');
  widget.id = 'lf-chat-widget';
  widget.className = 'chat-widget';
  widget.innerHTML = `
    <div class="glass-card chat-panel" id="lf-chat-panel" hidden>
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
        <div>
          <h3 style="margin:0 0 6px">LogiFlow AI</h3>
          <p class="muted" style="margin:0">Ask about shipments, delays, payments, drivers, or platform help.</p>
        </div>
      </div>
      <div class="chat-feed" id="lf-chat-feed">
        <div class="chat-bubble"><strong>Assistant:</strong> I can help admins, managers, drivers, suppliers, and gate staff use LogiFlow.</div>
      </div>
      <form class="chat-form" id="lf-chat-form">
        <input id="lf-chat-input" type="text" placeholder="Ask LogiFlow AI..." required />
        <button class="btn-p" type="submit">Send</button>
      </form>
    </div>
    <button class="chat-toggle" id="lf-chat-toggle" type="button">AI</button>
  `;
  document.body.appendChild(widget);

  const panel = document.getElementById('lf-chat-panel');
  const toggle = document.getElementById('lf-chat-toggle');
  const form = document.getElementById('lf-chat-form');
  const input = document.getElementById('lf-chat-input');
  const feed = document.getElementById('lf-chat-feed');

  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) input.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) return;
    feed.insertAdjacentHTML('beforeend', `<div class="chat-bubble"><strong>You:</strong> ${message}</div>`);
    input.value = '';
    try {
      const reply = await sendAssistantMessage(message);
      feed.insertAdjacentHTML('beforeend', `<div class="chat-bubble"><strong>Assistant:</strong> ${reply}</div>`);
    } catch (err) {
      feed.insertAdjacentHTML('beforeend', `<div class="chat-bubble"><strong>Assistant:</strong> ${err.message || 'Assistant unavailable.'}</div>`);
    }
    feed.scrollTop = feed.scrollHeight;
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initChatWidget);
} else {
  initChatWidget();
}

console.info('%c LogiFlow OS v1.0.0 ', 'background:#FF5500;color:#fff;font-family:monospace;font-weight:bold;padding:4px 8px;border-radius:3px');
