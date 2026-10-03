import api from './api';

export const invoicesApi = {
  list: () => api.get('/invoices').then(({ data }) => data || []),
  get: (id) => api.get(`/invoices/${id}`).then(({ data }) => data),
  extract: (file) => {
    const body = new FormData();
    body.append('file', file);
    return api.post('/invoices/extract', body, {
      timeout: 120000,
    }).then(({ data }) => data);
  },
  update: (id, payload) => api.patch(`/invoices/${id}`, payload).then(({ data }) => data),
  confirm: (id) => api.post(`/invoices/${id}/confirm`).then(({ data }) => data),
  remove: (id) => api.delete(`/invoices/${id}`).then(({ data }) => data),
  document: (id) => api.get(`/invoices/${id}/document`, { responseType: 'blob' }).then(async ({ data, headers }) => {
    const contentType = String(headers['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const payload = JSON.parse(await data.text());
      return { kind: 'url', ...payload };
    }
    return { kind: 'blob', blob: data, mimeType: data.type || contentType };
  }),
};

export default invoicesApi;
