const API = 'https://your-hostinger-domain.com/api'; // ← Replace with your Hostinger backend URL

export const api = {
  async req(method, path, data) {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  get: (p) => api.req('GET', p),
  post: (p, d) => api.req('POST', p, d),
  patch: (p, d) => api.req('PATCH', p, d),
  delete: (p) => api.req('DELETE', p),
};

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
};

export const accountsApi = {
  list: () => api.get('/accounts'),
  create: (d) => api.post('/accounts', d),
  update: (id, d) => api.patch(`/accounts/${id}`, d),
  delete: (id) => api.delete(`/accounts/${id}`),
  events: (id) => api.get(`/accounts/${id}/events`),
  pushEvent: (id, d) => api.post(`/accounts/${id}/events`, d),
};

export const templatesApi = {
  list: () => api.get('/templates'),
  create: (d) => api.post('/templates', d),
  delete: (id) => api.delete(`/templates/${id}`),
};

export const messagesApi = {
  list: () => api.get('/messages'),
  create: (d) => api.post('/messages', d),
  due: () => api.get('/messages/due'),
  updateStatus: (id, status) => api.patch(`/messages/${id}`, { status }),
};