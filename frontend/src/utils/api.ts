/**
 * Covasant Continuum — API Client
 * Centralized API calls with JWT authentication.
 */

import { useAuthStore } from '../stores/authStore';

// Use deployed backend URL if provided, otherwise fallback to local proxy path
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API = `${BASE_URL}/api/v1`;

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().accessToken;
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  let res = await fetch(url, { ...options, headers });

  // Auto-refresh on 401
  if (res.status === 401) {
    const refreshed = await useAuthStore.getState().refreshSession();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${useAuthStore.getState().accessToken}`;
      res = await fetch(url, { ...options, headers });
    } else {
      useAuthStore.getState().logout();
    }
  }
  return res;
}

// ── Products ──
export async function fetchProducts() {
  const res = await apiFetch(`${API}/products/`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.items || data || [];
}

export async function fetchProduct(id: string) {
  const res = await apiFetch(`${API}/products/${id}`);
  if (!res.ok) throw new Error('Failed to fetch product');
  return res.json();
}

export async function createProduct(data: { name: string; full_name: string; description?: string; color?: string }) {
  const res = await apiFetch(`${API}/products/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create product' }));
    throw new Error(err.detail || 'Failed to create product');
  }
  return res.json();
}

export async function updateProduct(id: string, data: { name?: string; full_name?: string; description?: string; color?: string }) {
  const res = await apiFetch(`${API}/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update product' }));
    throw new Error(err.detail || 'Failed to update product');
  }
  return res.json();
}

export async function deleteProduct(id: string) {
  const res = await apiFetch(`${API}/products/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete product');
  return res.json();
}

// ── Artefacts ──
export async function fetchArtefacts(productId?: string, pageSize?: number) {
  const params = new URLSearchParams();
  if (productId) params.set('product_id', productId);
  if (pageSize) params.set('page_size', String(pageSize));
  const res = await apiFetch(`${API}/artefacts/?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch artefacts');
  return res.json();
}

export async function fetchArtefact(id: string) {
  const res = await apiFetch(`${API}/artefacts/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artefact');
  return res.json();
}

export async function uploadDocument(file: File | null, productId: string, title: string, artefactType: string, visibility: string, description?: string, videoUrl?: string, sprint?: string, release?: string) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  formData.append('title', title);
  formData.append('product_id', productId);
  formData.append('artefact_type', artefactType);
  formData.append('visibility', visibility);
  formData.append('status', 'published');
  if (description) formData.append('description', description);
  if (videoUrl) formData.append('video_url', videoUrl);
  if (sprint) formData.append('sprint', sprint);
  if (release) formData.append('release', release);

  const res = await apiFetch(`${API}/upload/`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return res.json();
}

export function getDownloadUrl(artefactId: string) {
  return `${API}/artefacts/${artefactId}/download`;
}

export async function deleteArtefact(id: string) {
  const res = await apiFetch(`${API}/artefacts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete artefact');
  return res.json();
}

// ── Users ──
export async function fetchUsers() {
  const res = await apiFetch(`${API}/users/`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLogs(skip = 0, limit = 100) {
  const res = await apiFetch(`${API}/analytics/logs?skip=${skip}&limit=${limit}`);
  if (!res.ok) return [];
  return res.json();
}

export async function promoteUser(userId: string, role: string) {
  const res = await apiFetch(`${API}/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error('Failed to update user');
  return res.json();
}

// ── Tenants ──
export async function fetchTenants() {
  const res = await apiFetch(`${API}/superadmin/tenants`);
  if (!res.ok) throw new Error('Failed to fetch tenants');
  return res.json();
}

export async function createTenant(data: { name: string; slug: string; domain?: string; allowed_products?: string[] }) {
  const res = await apiFetch(`${API}/superadmin/tenants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create tenant' }));
    throw new Error(err.detail || 'Failed to create tenant');
  }
  return res.json();
}

export async function updateTenant(id: string, data: { name?: string; slug?: string; domain?: string; allowed_products?: string[] }) {
  const res = await apiFetch(`${API}/superadmin/tenants/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update tenant' }));
    throw new Error(err.detail || 'Failed to update tenant');
  }
  return res.json();
}

// ── Notifications ──
export async function fetchNotifications() {
  const res = await apiFetch(`${API}/notifications/`);
  if (!res.ok) return { items: [], unread: 0 };
  return res.json();
}

export async function markNotificationRead(id: string) {
  const res = await apiFetch(`${API}/notifications/${id}/read`, { method: 'POST' });
  return res.ok;
}

// ── SuperAdmin: AI Providers ──
export async function fetchAIProviders() {
  const res = await apiFetch(`${API}/superadmin/ai-providers`);
  if (!res.ok) return [];
  return res.json();
}

export async function upsertAIProvider(data: { provider: string; api_key?: string; default_model?: string; is_active: boolean }) {
  const res = await apiFetch(`${API}/superadmin/ai-providers`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save provider' }));
    throw new Error(err.detail || 'Failed to save provider');
  }
  return res.json();
}

export async function deleteAIProvider(id: string) {
  const res = await apiFetch(`${API}/superadmin/ai-providers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete provider');
  return res.json();
}

// ── SuperAdmin: Tenants ──
export async function deleteTenant(id: string) {
  const res = await apiFetch(`${API}/superadmin/tenants/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete tenant');
  return res.json();
}

// ── SuperAdmin: Admins ──
export async function fetchAdmins() {
  const res = await apiFetch(`${API}/superadmin/admins`);
  if (!res.ok) return [];
  return res.json();
}

export async function promoteToAdmin(userId: string) {
  const res = await apiFetch(`${API}/superadmin/admins/${userId}/promote`, { method: 'PATCH' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to promote user' }));
    throw new Error(err.detail || 'Failed to promote user');
  }
  return res.json();
}

export async function demoteAdmin(userId: string) {
  const res = await apiFetch(`${API}/superadmin/admins/${userId}/demote`, { method: 'PATCH' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to demote user' }));
    throw new Error(err.detail || 'Failed to demote user');
  }
  return res.json();
}

// ── SuperAdmin: Platform Settings ──
export async function fetchPlatformSettings() {
  const res = await apiFetch(`${API}/superadmin/platform-settings`);
  if (!res.ok) return [];
  return res.json();
}

export async function updatePlatformSetting(key: string, value: string) {
  const res = await apiFetch(`${API}/superadmin/platform-settings/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error('Failed to update setting');
  return res.json();
}

// ── Search ──
export async function searchArtefacts(q: string, product?: string, artefactType?: string) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (product) params.set('product', product);
  if (artefactType) params.set('artefact_type', artefactType);
  const res = await apiFetch(`${API}/search/?${params.toString()}`);
  if (!res.ok) return { items: [], total: 0 };
  return res.json();
}

// ── Notifications (real API) ──
export async function fetchNotificationsReal() {
  const res = await apiFetch(`${API}/notifications/`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchUnreadCount() {
  const res = await apiFetch(`${API}/notifications/count`);
  if (!res.ok) return { unread: 0 };
  return res.json();
}

export async function markNotifRead(id: string) {
  const res = await apiFetch(`${API}/notifications/${id}/read`, { method: 'PATCH' });
  return res.ok;
}

export async function markAllNotifsRead() {
  const res = await apiFetch(`${API}/notifications/read-all`, { method: 'PATCH' });
  return res.ok;
}

// ── Chat (uses backend-configured AI, no client-side API key) ──
export async function sendChatMessage(message: string, context?: { product?: string; role?: string }) {
  const res = await apiFetch(`${API}/chat/`, {
    method: 'POST',
    body: JSON.stringify({ message, ...context }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Chat unavailable' }));
    throw new Error(err.detail || 'Chat unavailable');
  }
  return res.json();
}
