/**
 * Centralized Google OAuth configuration for FoodBridge AI.
 * Targets port 3003 consistently in development.
 */
export const OAUTH_CONFIG = {
  google: {
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "593391029903-3rb6nc1c2mctdj8rf17eb95g42c5q6rf.apps.googleusercontent.com",
    redirectUri: typeof window !== 'undefined' 
      ? `${window.location.origin}/auth/login` 
      : (process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || "http://localhost:3003/auth/login"),
  }
};
