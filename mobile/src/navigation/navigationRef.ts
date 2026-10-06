import { createNavigationContainerRef } from '@react-navigation/native';

/**
 * Root navigation ref — allows navigation from outside React components.
 * Used by the API client interceptor to redirect to Login on 401/token expiry.
 */
export const navigationRef = createNavigationContainerRef<any>();

export const navigate = (name: string, params?: object) => {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
};

export const resetToLogin = () => {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }
};
