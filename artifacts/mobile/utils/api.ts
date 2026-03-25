const BASE_URL = (() => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (!domain) return '/api';
  return `https://${domain}/api`;
})();

export type ApiError = {
  status: number;
  message: string;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const err: ApiError = {
      status: response.status,
      message: body.error ?? `Erro ${response.status}`,
    };
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
