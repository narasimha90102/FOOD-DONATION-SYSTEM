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
        throw new Error(data.message || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (error: any) {
      // Provide a helpful error when the backend server is not reachable at all
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error(`[API Service] ❌ Backend unreachable at ${url}. Is the backend server running on port 5003?`);
        throw new Error('Cannot connect to the server. Please make sure the backend is running on port 5003.');
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
