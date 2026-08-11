export class ApiError extends Error {
  status: number;
  code?: string;
  stackTrace?: string;

  constructor(message: string, status: number, code?: string, stackTrace?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.stackTrace = stackTrace;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://food-donation-system-pqfz.onrender.com/api';

interface FetchOptions extends RequestInit {
  body?: any;
}

export class ApiService {
  /**
   * Universal fetch runner with auto Bearer tokens
   */
  private static async request(endpoint: string, options: FetchOptions = {}): Promise<any> {
    const url = `${BASE_URL}${endpoint}`;
    
    // Setup standard headers
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Append JWT token if active in localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('fb_token');
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    if (options.body && !(options.body instanceof FormData)) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Global 401 handler: token expired or invalid → force re-login
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem('fb_token');
          localStorage.removeItem('fb_user');
          // Only redirect if not already on the auth pages
          if (!window.location.pathname.startsWith('/auth')) {
            window.location.href = '/auth/login';
          }
        }
        throw new ApiError(data.message || `Request failed with status ${response.status}`, response.status, data.code, data.stack);
      }

      return data;
    } catch (error: any) {
      // Provide a helpful error when the backend server is not reachable at all
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error(`[API Service] ❌ Backend unreachable at ${url}.`);
        if (url.includes('localhost') || url.includes('127.0.0.1')) {
          throw new Error('Cannot connect to the local server. Please make sure the backend is running locally on port 5003.');
        } else {
          throw new Error(`Cannot connect to the backend server at ${BASE_URL}. Please verify your internet connection or backend server status.`);
        }
      }
      console.error(`[API Service Error] ${endpoint}:`, error);
      throw error;
    }
  }

  // HTTP helper utilities
  public static async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  public static async post(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, { method: 'POST', body });
  }

  public static async put(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, { method: 'PUT', body });
  }

  public static async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  }
}
