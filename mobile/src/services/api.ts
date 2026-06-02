import { useAppStore } from '../store/useAppStore';

// We map both local emulator networks (10.0.2.2 for Android, 127.0.0.1 for iOS)
const BASE_URL = 'http://10.0.2.2:5003/api';

export class MobileApiService {
  private static async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
    const url = `${BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Attach token from state
    const token = useAppStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      method,
      headers,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (e: any) {
      console.warn(`[Mobile API Error] ${endpoint}:`, e);
      throw e;
    }
  }

  public static get(endpoint: string) { return this.request(endpoint, 'GET'); }
  public static post(endpoint: string, body: any) { return this.request(endpoint, 'POST', body); }
  public static put(endpoint: string, body: any) { return this.request(endpoint, 'PUT', body); }
}
