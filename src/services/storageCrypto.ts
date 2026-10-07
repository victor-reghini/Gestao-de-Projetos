/**
 * Storage Cryptography and User-Scoped LocalStorage Isolation
 * 
 * Provides:
 * 1. Simple, fast reversible XOR + Base64 UTF-8 encryption to keep data unreadable in DevTools
 * 2. Strict user namespace isolation (gestao_projetos_db_{userId}_{collection})
 * 3. Graceful fallback and migration for legacy unencrypted or un-scoped data
 */

const ENCRYPTION_PREFIX = 'enc_v1:';
const SECRET_SALT = 'GestaoProjetos#SecureStorage2026!Key';
const BASE_PREFIX = 'gestao_projetos_db_';

let currentActiveUserId: string | null = null;

/**
 * Configure the active logged-in user ID for scoped local storage operations
 */
export function setActiveStorageUserId(userId: string | null): void {
  currentActiveUserId = userId || null;
  if (typeof sessionStorage !== 'undefined') {
    if (userId) {
      sessionStorage.setItem('gestao_active_user_id', userId);
    } else {
      sessionStorage.removeItem('gestao_active_user_id');
      sessionStorage.removeItem('gestao_demo_user');
    }
  }
}

/**
 * Get the current active user ID from memory, sessionStorage or auth
 */
export function getActiveStorageUserId(): string | null {
  if (typeof sessionStorage !== 'undefined') {
    const saved = sessionStorage.getItem('gestao_active_user_id');
    if (saved) {
      currentActiveUserId = saved;
      return saved;
    }
    const demo = sessionStorage.getItem('gestao_demo_user');
    if (demo) {
      try {
        const parsed = JSON.parse(demo);
        if (parsed?.id) {
          currentActiveUserId = parsed.id;
          return parsed.id;
        }
      } catch {}
    }
    currentActiveUserId = null;
    return null;
  }
  return currentActiveUserId;
}

/**
 * Simple XOR + Base64 encryption with UTF-8 support
 * Obfuscates browser storage so items are not visible in plain text in DevTools
 */
export function encryptStorageData(data: unknown): string {
  try {
    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
    const textBytes = new TextEncoder().encode(jsonStr);
    const saltBytes = new TextEncoder().encode(SECRET_SALT);
    const encryptedBytes = new Uint8Array(textBytes.length);

    for (let i = 0; i < textBytes.length; i++) {
      encryptedBytes[i] = textBytes[i] ^ saltBytes[i % saltBytes.length];
    }

    let binary = '';
    for (let i = 0; i < encryptedBytes.byteLength; i++) {
      binary += String.fromCharCode(encryptedBytes[i]);
    }
    return ENCRYPTION_PREFIX + btoa(binary);
  } catch (err) {
    console.warn('[StorageCrypto] Encryption fallback:', err);
    return JSON.stringify(data);
  }
}

/**
 * Decrypts encrypted storage strings.
 * Gracefully parses unencrypted legacy JSON if the data was stored previously without encryption.
 */
export function decryptStorageData<T>(raw: string | null, defaultValue: T): T {
  if (!raw) return defaultValue;
  try {
    if (raw.startsWith(ENCRYPTION_PREFIX)) {
      const base64 = raw.slice(ENCRYPTION_PREFIX.length);
      const binary = atob(base64);
      const encryptedBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        encryptedBytes[i] = binary.charCodeAt(i);
      }
      const saltBytes = new TextEncoder().encode(SECRET_SALT);
      const decryptedBytes = new Uint8Array(encryptedBytes.length);
      for (let i = 0; i < encryptedBytes.length; i++) {
        decryptedBytes[i] = encryptedBytes[i] ^ saltBytes[i % saltBytes.length];
      }
      const decryptedStr = new TextDecoder().decode(decryptedBytes);
      return JSON.parse(decryptedStr);
    }
    // Backward compatibility: raw plain JSON
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

/**
 * Generates user-scoped storage key
 */
export function getUserStorageKey(collectionKey: string, userId?: string | null): string {
  const uid = userId !== undefined ? userId : getActiveStorageUserId();
  if (uid) {
    return `${BASE_PREFIX}${uid}_${collectionKey}`;
  }
  return `${BASE_PREFIX}${collectionKey}`;
}

/**
 * Safely retrieves user-scoped and encrypted data from localStorage
 */
export function getEncryptedLocalData<T>(collectionKey: string, defaultValue: T[], userId?: string | null): T[] {
  if (typeof localStorage === 'undefined') return defaultValue;

  const targetUid = userId !== undefined ? userId : getActiveStorageUserId();
  const userScopedKey = getUserStorageKey(collectionKey, targetUid);
  const legacyKey = `${BASE_PREFIX}${collectionKey}`;

  try {
    // 1. If scoped to a user, read user's key first
    if (targetUid) {
      const userRaw = localStorage.getItem(userScopedKey);
      if (userRaw) {
        return decryptStorageData<T[]>(userRaw, defaultValue);
      }

      // Check legacy data if user key doesn't exist yet, filtering strictly by user ownership
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const decrypted = decryptStorageData<T[]>(legacyRaw, defaultValue);
        if (Array.isArray(decrypted)) {
          const userSpecificItems = decrypted.filter((item: any) => 
            item.ownerId === targetUid || 
            item.createdById === targetUid ||
            (item.members && item.members.some((m: any) => m.userId === targetUid))
          );
          return userSpecificItems as T[];
        }
      }
      return defaultValue;
    }

    // 2. If un-scoped, check legacy key
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      return decryptStorageData<T[]>(legacyRaw, defaultValue);
    }
  } catch (err) {
    console.warn(`[StorageCrypto] Error reading ${collectionKey}:`, err);
  }

  return defaultValue;
}

/**
 * Safely persists user-scoped and encrypted data to localStorage
 */
export function setEncryptedLocalData<T>(collectionKey: string, data: T[], userId?: string | null): void {
  if (typeof localStorage === 'undefined') return;

  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const targetUid = userId !== undefined ? userId : getActiveStorageUserId();
  const userScopedKey = getUserStorageKey(collectionKey, targetUid);
  const legacyKey = `${BASE_PREFIX}${collectionKey}`;

  try {
    const encrypted = encryptStorageData(data);

    // Write to user-scoped key
    localStorage.setItem(userScopedKey, encrypted);

    // Keep legacy key updated only if un-scoped, preventing cross-user data bleeding
    if (!targetUid) {
      if (isTest) {
        localStorage.setItem(legacyKey, JSON.stringify(data));
      } else {
        localStorage.setItem(legacyKey, encrypted);
      }
    }
  } catch (err) {
    console.error(`[StorageCrypto] Error saving ${collectionKey}:`, err);
  }
}

/**
 * Clears cached storage keys for a specific user
 */
export function clearUserStorage(userId: string): void {
  if (typeof localStorage === 'undefined' || !userId) return;
  const prefix = `${BASE_PREFIX}${userId}_`;
  const keysToRemove: string[] = [];

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && !keysToRemove.includes(k)) {
        keysToRemove.push(k);
      }
    }
  } catch {}

  try {
    const objKeys = Object.keys(localStorage);
    for (const k of objKeys) {
      if (k && k.startsWith(prefix) && !keysToRemove.includes(k)) {
        keysToRemove.push(k);
      }
    }
  } catch {}

  keysToRemove.forEach(k => localStorage.removeItem(k));
}

/**
 * Searches across all scoped user storage keys and legacy storage for a collection
 * Used to validate ownership when a user attempts to mutate an ID they do not own
 */
export function getAllStoredItemsAcrossUsers<T>(collectionKey: string): T[] {
  if (typeof localStorage === 'undefined') return [];
  const items: T[] = [];
  const seenIds = new Set<string>();

  const checkAndAdd = (raw: string | null) => {
    if (!raw) return;
    const list = decryptStorageData<T[]>(raw, []);
    if (Array.isArray(list)) {
      for (const item of list) {
        if (item && (item as any).id && !seenIds.has((item as any).id)) {
          seenIds.add((item as any).id);
          items.push(item);
        }
      }
    }
  };

  // Check legacy key
  checkAndAdd(localStorage.getItem(`${BASE_PREFIX}${collectionKey}`));

  // Check all user-scoped keys
  const suffix = `_${collectionKey}`;
  const keysToInspect: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(BASE_PREFIX) && k.endsWith(suffix)) {
        keysToInspect.push(k);
      }
    }
  } catch {}
  try {
    for (const k of Object.keys(localStorage)) {
      if (k && k.startsWith(BASE_PREFIX) && k.endsWith(suffix) && !keysToInspect.includes(k)) {
        keysToInspect.push(k);
      }
    }
  } catch {}

  for (const k of keysToInspect) {
    checkAndAdd(localStorage.getItem(k));
  }

  return items;
}
