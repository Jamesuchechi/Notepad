export function safeReadJson(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return parsed;
  } catch (error) {
    console.warn(`safeReadJson failed for ${key}:`, error);
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      console.warn(`safeReadJson removeItem failed for ${key}:`, removeError);
    }
    return null;
  }
}

export function safeWriteJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`safeWriteJson failed for ${key}:`, error);
  }
}

export const safeLocalStorage = {
  getItem: (name) => {
    try {
      const value = localStorage.getItem(name);
      if (!value) return null;

      const parsed = JSON.parse(value);
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    } catch (error) {
      console.warn(`safeLocalStorage.getItem failed for ${name}:`, error);
      try {
        localStorage.removeItem(name);
      } catch (removeError) {
        console.warn(`safeLocalStorage.removeItem failed for ${name}:`, removeError);
      }
      return null;
    }
  },

  setItem: (name, value) => {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(name, serialized);
    } catch (error) {
      console.warn(`safeLocalStorage.setItem failed for ${name}:`, error);
    }
  },

  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      console.warn(`safeLocalStorage.removeItem failed for ${name}:`, error);
    }
  },
};

export class IndexedDBStorage {
  constructor(dbName = 'BrainDB', storeName = 'keyval') {
    this.dbName = dbName;
    this.storeName = storeName;
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(key) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async set(key, val) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.put(val, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async del(key) {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

const idbStorage = new IndexedDBStorage();

let activeEncryptionKey = null;

export function setEncryptionKey(key) {
  activeEncryptionKey = key;
}

export function clearEncryptionKey() {
  activeEncryptionKey = null;
}

export async function deriveKey(password, salt = 'brain-notepad-crypto-salt') {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function arrayBufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex) {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < view.length; i++) {
    view[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return view.buffer;
}

async function encryptData(text, key) {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  );
  return JSON.stringify({
    encrypted: true,
    iv: arrayBufferToHex(iv),
    data: arrayBufferToHex(encrypted),
  });
}

async function decryptData(cipherTextJson, key) {
  try {
    const { encrypted, iv: ivHex, data: dataHex } = JSON.parse(cipherTextJson);
    if (!encrypted) return cipherTextJson;
    const iv = new Uint8Array(hexToArrayBuffer(ivHex));
    const data = hexToArrayBuffer(dataHex);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}

export const indexedDBStorage = {
  getItem: async (name) => {
    try {
      const val = await idbStorage.get(name);
      if (val === undefined || val === null) {
        // Migration from localStorage
        const localVal = localStorage.getItem(name);
        if (localVal) {
          console.log(`Migrating ${name} from localStorage to IndexedDB...`);
          await idbStorage.set(name, localVal);
          try {
            return JSON.parse(localVal);
          } catch (err) {
            return localVal;
          }
        }
        return null;
      }

      // If it's not a string, it's an old direct object, return directly for backward compatibility
      if (typeof val !== 'string') {
        return val;
      }

      let rawString = val;
      // Check if data is encrypted
      if (val.startsWith('{"encrypted":true')) {
        if (!activeEncryptionKey) {
          console.warn(`Attempted to load encrypted store ${name} without key.`);
          return null;
        }
        rawString = await decryptData(val, activeEncryptionKey);
      }

      if (!rawString) return null;
      try {
        return JSON.parse(rawString);
      } catch (e) {
        return rawString;
      }
    } catch (e) {
      console.error(e);
      return null;
    }
  },
  setItem: async (name, value) => {
    try {
      // Serialize value to strip functions and convert to string
      const stringifiedValue = typeof value === 'string' ? value : JSON.stringify(value);
      
      let finalValue = stringifiedValue;
      if (activeEncryptionKey) {
        finalValue = await encryptData(stringifiedValue, activeEncryptionKey);
      }
      await idbStorage.set(name, finalValue);
    } catch (e) {
      console.error(e);
    }
  },
  removeItem: async (name) => {
    try {
      await idbStorage.del(name);
    } catch (e) {
      console.error(e);
    }
  },
};

