const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface ApiErrorPayload {
  detail?: string;
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiRequest(path, options);

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiFetchResponse(path: string, options: RequestInit = {}): Promise<Response> {
  return apiRequest(path, options);
}

async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = response.statusText;
    try {
      const data = (await response.json()) as ApiErrorPayload;
      if (data?.detail) {
        message = data.detail;
      }
    } catch (error) {
      // ignore parsing errors
    }
    throw new Error(message);
  }

  return response;
}
