// Centralized API endpoint configuration for Android APK and Web
export const CURRENT_LAN_IP = '10.128.124.55';
export const DEV_PORT = '5003';

// Fast host candidates:
// 1. 127.0.0.1:5003 (Ultra-fast 0ms USB ADB reverse proxy)
// 2. 10.128.124.55:5003 (Current Local Wi-Fi LAN IP)
// 3. 10.249.174.12:5003 (Secondary Wi-Fi LAN IP)
// 4. 10.0.2.2:5003 (Android Studio Emulator)
// 5. localhost:5003
export const HOST_CANDIDATES = [
  `http://127.0.0.1:${DEV_PORT}`,
  `http://${CURRENT_LAN_IP}:${DEV_PORT}`,
  `http://10.249.174.12:${DEV_PORT}`,
  `http://10.0.2.2:${DEV_PORT}`,
  `http://localhost:${DEV_PORT}`,
];

export let ACTIVE_BASE_URL = `http://127.0.0.1:${DEV_PORT}`;

export const getActiveApiUrl = () => `${ACTIVE_BASE_URL}/api`;
export const getActiveSocketUrl = () => ACTIVE_BASE_URL;

export const setActiveBaseUrl = (url: string) => {
  ACTIVE_BASE_URL = url.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

export const API_BASE_URL = ACTIVE_BASE_URL;
export const API_URL = `${ACTIVE_BASE_URL}/api`;
export const SOCKET_URL = ACTIVE_BASE_URL;

