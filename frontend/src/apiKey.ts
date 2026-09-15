const STORAGE_KEY = "documentParserApiKey";

export function getStoredApiKey(): string | null {
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setStoredApiKey(apiKey: string): void {
  window.localStorage.setItem(STORAGE_KEY, apiKey);
}

export function clearStoredApiKey(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
