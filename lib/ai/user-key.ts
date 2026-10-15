const STORAGE_KEY = 'slidefarm-openai-api-key';

export function getUserApiKey(): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
}

export function saveUserApiKey(value: string): void {
  localStorage.setItem(STORAGE_KEY, value.trim());
}

export function removeUserApiKey(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function aiRequestHeaders(): Record<string, string> {
  const key = getUserApiKey();
  return key ? { 'x-openai-api-key': key } : {};
}
