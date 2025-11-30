export const storage = {
  get: async (key: string) => {
    const value = localStorage.getItem(key);
    return value ? { value } : null;
  },
  set: async (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
};
