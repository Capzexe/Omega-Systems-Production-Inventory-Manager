import type { Profile } from '../types';

let csrfToken = '';
let currentUser: Profile | null = null;
export const getSessionUser = () => currentUser;

export async function apiRequest(action: string, options: RequestInit = {}): Promise<any> {
  const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, {
    ...options,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && action !== 'login') {
      csrfToken = '';
      currentUser = null;
      window.dispatchEvent(new Event('session-expired'));
    }
    throw new Error(body.error || `Request failed (${response.status}).`);
  }
  if (typeof body.csrfToken === 'string') csrfToken = body.csrfToken;
  if ('user' in body) currentUser = body.user;
  if (action === 'logout') { csrfToken = ''; currentUser = null; }
  return body;
}

export const signOut = async () => {
  await apiRequest('logout', { method: 'POST', body: '{}' });
  window.dispatchEvent(new Event('session-expired'));
};
