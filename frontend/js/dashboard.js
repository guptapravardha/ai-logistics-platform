'use strict';

async function loadDashboardOverview() {
  const data = await api.get('/analytics/overview');
  return data.data || {};
}

function renderKpis(kpis = {}) {
  const mapping = {
    'kpi-shipments': kpis.shipments ?? 0,
    'kpi-delivered': kpis.delivered ?? 0,
    'kpi-transit': kpis.inTransit ?? 0,
    'kpi-delayed': kpis.delayed ?? 0,
    'kpi-drivers': kpis.drivers ?? 0,
    'kpi-revenue': `Rs ${Number(kpis.revenue || 0).toLocaleString('en-IN')}`,
  };
  Object.entries(mapping).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

window.LogiFlowDashboard = { loadDashboardOverview, renderKpis };
