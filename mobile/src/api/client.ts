import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HOST_CANDIDATES,
  ACTIVE_BASE_URL,
  setActiveBaseUrl,
} from '../config/env';
import { resetToLogin } from '../navigation/navigationRef';

/**
 * High-speed Axios client for FoodBridge AI mobile app.
 * Automatically resolves and switches between USB Reverse Tunnel (127.0.0.1:5003)
 * and Local Wi-Fi (10.128.124.55:5003) without network timeouts or lags.
 */
export const apiClient = axios.create({
  baseURL: `${ACTIVE_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 4500,
});

let isResolvingHost = false;
let isHandling401 = false;

/**
 * Fast ping probe to detect and latch onto the fastest reachable host (USB or Wi-Fi).
 */
export const probeFastestHost = async (): Promise<string> => {
  if (isResolvingHost) return ACTIVE_BASE_URL;
  isResolvingHost = true;

  try {
    const savedHost = await AsyncStorage.getItem('custom_server_host').catch(() => null);
    const candidates = savedHost ? [savedHost, ...HOST_CANDIDATES] : HOST_CANDIDATES;

    const checks = candidates.map(async (candidate) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1200);
        const res = await fetch(`${candidate}/api/food-ai/health`, {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          return candidate;
        }
      } catch {}
      return null;
    });

    const winner = await Promise.race(
      checks.map((p) =>
        p.then((val) => {
          if (val) return val;
          return new Promise<string>(() => {}); // Never resolve if null
        })
      )
    ).catch(() => null);

    if (winner) {
      setActiveBaseUrl(winner);
      apiClient.defaults.baseURL = `${winner}/api`;
      console.log(`[API Host Probe] Selected fastest live backend host: ${winner}`);
      return winner;
    }
  } catch (err) {
    console.warn('[API Host Probe] Ping probe finished without race winner:', err);
  } finally {
    isResolvingHost = false;
  }

  return ACTIVE_BASE_URL;
};

// Probe immediately on module load
probeFastestHost().catch(() => {});

// ─── REQUEST INTERCEPTOR ─────────────────────────────────────────────────────
apiClient.interceptors.request.use(
  async (config) => {
    // Keep baseURL synchronized with active host
    config.baseURL = `${ACTIVE_BASE_URL}/api`;

    const token = await AsyncStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = (config.method || 'GET').toUpperCase();
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
    console.log(`[API REQUEST START] ${method} -> ${fullUrl}`);

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR ────────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    const method = (response.config?.method || 'GET').toUpperCase();
    const fullUrl = `${response.config?.baseURL || ''}${response.config?.url || ''}`;
    console.log(`[API REQUEST SUCCESS] ${method} -> ${fullUrl} [Status ${response.status}]`);
    return response;
  },
  async (error) => {
    const status = error.response?.status;
    const rawData = error.response?.data;
    const config: AxiosRequestConfig & { _retryCount?: number } = error.config || {};
    const method = (config.method || 'GET').toUpperCase();
    const fullUrl = `${config.baseURL || ''}${config.url || ''}`;

    // Auto-retry on alternative host candidate if network failed or timed out
    const isNetworkOrTimeout =
      !error.response &&
      (error.code === 'ECONNABORTED' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout'));

    if (isNetworkOrTimeout && (!config._retryCount || config._retryCount < 2)) {
      config._retryCount = (config._retryCount || 0) + 1;
      console.warn(`[API Connection Retry] Network glitch on ${ACTIVE_BASE_URL}. Finding alternative live host...`);

      // Switch to alternative candidate
      const nextHost = HOST_CANDIDATES.find((h) => h !== ACTIVE_BASE_URL) || HOST_CANDIDATES[0];
      setActiveBaseUrl(nextHost);
      config.baseURL = `${nextHost}/api`;
      apiClient.defaults.baseURL = `${nextHost}/api`;

      try {
        return await apiClient(config);
      } catch (retryErr) {
        // Fall through to error handler
      }
    }

    let errorMessage = error.message || 'Network request failed';
    if (rawData && typeof rawData === 'object' && rawData.message) {
      errorMessage = rawData.message;
    } else if (typeof rawData === 'string' && rawData.trim()) {
      errorMessage = rawData.slice(0, 200);
    } else if (status) {
      errorMessage = `Server request failed with HTTP ${status}`;
    }

    if (error.response) {
      error.message = errorMessage;
    }

    console.warn(`[API REQUEST FAILURE] ${method} -> ${fullUrl} [Status ${status || 'NET_ERR'}]: ${errorMessage}`);

    if (status === 401 && !isHandling401) {
      isHandling401 = true;
      console.warn('[API] 401 Unauthorized — clearing session and navigating to Login');

      try {
        await AsyncStorage.multiRemove(['auth_token', 'user_data']);
        resetToLogin();
      } catch (clearErr) {
        console.error('[API] Error clearing auth state on 401:', clearErr);
      } finally {
        setTimeout(() => {
          isHandling401 = false;
        }, 3000);
      }
    }

    return Promise.reject(error);
  }
);
