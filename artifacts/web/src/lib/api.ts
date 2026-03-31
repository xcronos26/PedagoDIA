// Core API fetch wrapper that handles Auth tokens and 401s
export const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('pedagogia_token');
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem('pedagogia_token');
    localStorage.removeItem('pedagogia_teacher');
    window.location.href = import.meta.env.BASE_URL + 'login';
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!response.ok) {
    let errorMsg = 'Ocorreu um erro na requisição.';
    try {
      const data = await response.json();
      errorMsg = data.error || errorMsg;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(errorMsg);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
