export const DEMO_ACCOUNT_ID = 'demo-dreamystars';
export const DEMO_ACCOUNT_NAME = 'dreamystars';
const DEMO_SESSION_KEY = 'slidefarm-showcase-account';

export function demoAccountEnabled() {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return false;
  try { return sessionStorage.getItem(DEMO_SESSION_KEY) === 'true'; }
  catch { return false; }
}

export function setDemoAccountEnabled(enabled: boolean) {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return;
  try {
    if (enabled) sessionStorage.setItem(DEMO_SESSION_KEY, 'true');
    else sessionStorage.removeItem(DEMO_SESSION_KEY);
  } catch { /* The demo remains unavailable if session storage is blocked. */ }
}
