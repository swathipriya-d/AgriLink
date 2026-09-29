const TOKEN_KEY = 'agrilink.session.v1';

export const getToken = () => {
  try { return window.sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
};

export const setToken = (token) => {
  try {
    if (token) window.sessionStorage.setItem(TOKEN_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* Private browsing may disable storage; the current tab remains browseable. */ }
};

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`/api${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload;
}

export const get = (path) => request(path);
export const post = (path, data) => request(path, { method: 'POST', body: data instanceof FormData ? data : JSON.stringify(data) });
export const patch = (path, data) => request(path, { method: 'PATCH', body: JSON.stringify(data) });
export const put = (path, data) => request(path, { method: 'PUT', body: JSON.stringify(data) });
export const del = (path) => request(path, { method: 'DELETE' });
