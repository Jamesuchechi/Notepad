import { create } from 'zustand';

export const useAIStore = create((set) => ({
  isGenerating: false,
  error: null,
  queueLength: 0,
  rateLimitMessage: null,
  setGenerating: (isGenerating) => set({ isGenerating }),
  setError: (error) => set({ error }),
  setQueueLength: (queueLength) => set({ queueLength }),
  setRateLimitMessage: (message) => set({ rateLimitMessage: message }),
}));
