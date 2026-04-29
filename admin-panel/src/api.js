const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const fetchUsers    = ()                  => request('/admin/users/list');
export const fetchUser     = (username)          => request(`/admin/users/${username}`);
export const createUser    = (data)              => request('/admin/users', { method: 'POST', body: JSON.stringify(data) });
export const updateProfile = (username, profile) => request(`/admin/users/${username}/profile`, { method: 'PUT', body: JSON.stringify({ profile }) });
export const updatePassword= (username, password)=> request(`/admin/users/${username}/password`, { method: 'PUT', body: JSON.stringify({ password }) });
export const deleteUser    = (username)          => request(`/admin/users/${username}`, { method: 'DELETE' });
export const clearChats    = (username)          => request(`/admin/users/${username}/chats`, { method: 'DELETE' });
export const clearPlans    = (username)          => request(`/admin/users/${username}/plans`, { method: 'DELETE' });
export const fetchStats    = ()                  => request('/admin/stats');
export const lookupUser    = (username)          => request(`/users/GetAllData?username=${encodeURIComponent(username)}`);
