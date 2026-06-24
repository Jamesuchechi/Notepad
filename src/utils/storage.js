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
