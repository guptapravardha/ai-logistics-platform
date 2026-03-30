'use strict';

async function loginUser(payload) {
  const res = await api.post('/auth/login', payload);
  const data = res.data || {};
  auth.setSession(data.accessToken, data.refreshToken, data.user);
  Toast.success('Logged in successfully');
  auth.redirectToDashboard(data.user?.role || 'company');
}

async function registerUser(payload) {
  const res = await api.post('/auth/register', payload);
  return res;
}

window.LogiFlowAuth = { loginUser, registerUser };
