export function safeReadJson(key) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch (error) {
    console.warn(`safeReadJson failed for ${key}:`, error);
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
      JSON.parse(value);
      return value;
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
      localStorage.setItem(name, value);
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
