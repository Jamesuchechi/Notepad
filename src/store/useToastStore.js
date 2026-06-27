import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export const useToastStore = create((set, get) => ({
  toasts: [],

  showToast: (message, options = {}) => {
    const id = uuidv4();
    const duration = options.duration ?? 4000;

    const newToast = {
      id,
      message,
      actionLabel: options.actionLabel ?? null,
      onAction: options.onAction ?? null,
    };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
