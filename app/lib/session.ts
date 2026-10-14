type SecureStoragePlugin = {
  get: (options: { key: string }) => Promise<{ value: string | null }>;
  set: (options: { key: string; value: string }) => Promise<void>;
  remove: (options: { key: string }) => Promise<void>;
};

function secureStorage(): SecureStoragePlugin | undefined {
  if (typeof window === "undefined") return undefined;
  const capacitor = (window as Window & { Capacitor?: { Plugins?: { SecureStoragePlugin?: SecureStoragePlugin } } }).Capacitor;
  return capacitor?.Plugins?.SecureStoragePlugin;
}

export async function getSessionValue(key: string): Promise<string | null> {
  const secure = secureStorage();
  if (secure) {
    try {
      return (await secure.get({ key })).value;
    } catch {
      // Fall back to browser storage when the native bridge is unavailable.
    }
  }
  return localStorage.getItem(key);
}

export async function setSessionValue(key: string, value: string): Promise<void> {
  const secure = secureStorage();
  if (secure) {
    try {
      await secure.set({ key, value });
      return;
    } catch {
      // Fall back to browser storage when the native bridge is unavailable.
    }
  }
  localStorage.setItem(key, value);
}

export async function removeSessionValue(key: string): Promise<void> {
  const secure = secureStorage();
  if (secure) {
    try {
      await secure.remove({ key });
      return;
    } catch {
      // Fall back to browser storage when the native bridge is unavailable.
    }
  }
  localStorage.removeItem(key);
}
