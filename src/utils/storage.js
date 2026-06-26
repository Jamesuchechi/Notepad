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
