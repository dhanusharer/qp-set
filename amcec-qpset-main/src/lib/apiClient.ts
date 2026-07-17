import { APIError } from './types';

// Environment-based API URL
const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '');

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
  timeout?: number;
  retries?: number;
}

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

const processQueue = (token: string) => {
  refreshQueue.forEach((callback) => callback(token));
  refreshQueue = [];
};

const rejectQueue = () => {
  refreshQueue = [];
};

function handleAuthFailure() {
  // Notify contexts to reset auth state
  window.dispatchEvent(new Event('auth-logout'));
  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    window.location.href = '/login';
  }
}

function getCookie(name: string): string | undefined {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

// Perform token refresh operation
async function performTokenRefresh(): Promise<void> {
  try {
    const headers = new Headers();
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
    });

    if (!res.ok) throw new Error('Token refresh failed');

    const result = await res.json();
    if (!result.success) throw new Error('Token refresh failed');
  } catch (err) {
    handleAuthFailure();
    throw err;
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries: number, delay = 1000): Promise<Response> {
  try {
    const res = await fetch(url, options);
    // Retry on transient status codes
    if ([502, 503, 504].includes(res.status) && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw err;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  if (options.params) {
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined) url.searchParams.append(key, String(val));
    });
  }

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // Attach CSRF header for state-changing requests
  const method = options.method?.toUpperCase() || 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
  }

  // Set timeout controller
  const timeoutMs = options.timeout ?? 10000;
  const timeoutController = new AbortController();
  if (options.signal) {
    options.signal.addEventListener('abort', () => timeoutController.abort());
  }
  const timeoutId = setTimeout(() => timeoutController.abort(new Error('Request Timeout')), timeoutMs);

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
    signal: timeoutController.signal,
  };

  const retryCount = options.retries ?? 1;

  try {
    const response = await fetchWithRetry(url.toString(), fetchOptions, retryCount);
    clearTimeout(timeoutId);

    // Interceptor: Response HTTP Status checks
    if (response.status === 401) {
      // Prevent recursive refresh loops
      if (path === '/auth/login' || path === '/auth/refresh') {
        throw new Error('Authentication failed');
      }

      // This request triggered the refresh — retry directly after getting new token
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          await performTokenRefresh();
          isRefreshing = false;
          processQueue('');

          // Retry this request directly with the fresh token
          const retryRes = await fetch(url.toString(), fetchOptions);
          if (!retryRes.ok) throw new Error('Retry after token refresh failed');
          if (retryRes.status === 204) return null as unknown as T;
          return await retryRes.json();
        } catch (err) {
          isRefreshing = false;
          rejectQueue();
          throw err;
        }
      }

      // Concurrent requests queue here while another request is already refreshing
      return new Promise<T>((resolve, reject) => {
        refreshQueue.push(() => {
          fetch(url.toString(), fetchOptions)
            .then(async (res) => {
              if (!res.ok) throw new Error('Retry after token refresh failed');
              if (res.status === 204) return null as unknown as T;
              resolve(await res.json());
            })
            .catch(reject);
        });
      });
    }

    let result: any;
    if (response.status !== 204) {
      try {
        result = await response.json();
      } catch {}
    }

    if (!response.ok) {
      let errorMsg = 'Server responded with an error';
      if (result && typeof result === 'object') {
        if (result.success === false && result.error) {
          errorMsg = result.error.message || errorMsg;
        } else {
          errorMsg = result.message || errorMsg;
        }
      }
      throw { message: errorMsg, statusCode: response.status } as APIError;
    }

    if (response.status === 204) {
      return null as unknown as T;
    }

    if (result && typeof result === 'object' && 'success' in result) {
      if (!result.success) {
        throw { 
          message: result.error?.message || 'Request failed', 
          statusCode: response.status 
        } as APIError;
      }
    }

    return result as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw { message: 'Request aborted or timed out', statusCode: 408 } as APIError;
    }
    throw err as APIError;
  }
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: any, options?: RequestOptions) => request<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'DELETE' }),
};
