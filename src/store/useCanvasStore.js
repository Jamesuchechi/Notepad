import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useCanvasStore = create(
  persist(
    (set, get) => ({
      cards: [],
      connections: [],

      addCard: (attrs = {}) => {
        const newCard = {
          id: 'card-' + Math.random().toString(36).substr(2, 9),
          x: attrs.x ?? 100,
          y: attrs.y ?? 100,
          width: attrs.width ?? 250,
          height: attrs.height ?? 160,
          type: attrs.type ?? 'note', // 'note' | 'text' | 'image'
          noteId: attrs.noteId ?? null,
          content: attrs.content ?? '',
          color: attrs.color ?? '#6366f1',
        };

        set((state) => ({
          cards: [...state.cards, newCard],
        }));
        return newCard;
      },

      updateCardPosition: (id, x, y) => {
        set((state) => ({
          cards: state.cards.map((card) => (card.id === id ? { ...card, x, y } : card)),
        }));
      },

      updateCardSize: (id, width, height) => {
        set((state) => ({
          cards: state.cards.map((card) => (card.id === id ? { ...card, width, height } : card)),
        }));
      },

      updateCardContent: (id, content) => {
        set((state) => ({
          cards: state.cards.map((card) => (card.id === id ? { ...card, content } : card)),
        }));
      },

      removeCard: (id) => {
        set((state) => ({
          cards: state.cards.filter((card) => card.id !== id),
          // Also clean up any connections involving this card
          connections: state.connections.filter((conn) => conn.fromId !== id && conn.toId !== id),
        }));
      },

      addConnection: (fromId, toId) => {
        // Prevent duplicate connections or connecting to self
        if (fromId === toId) return;
        const exists = get().connections.some(
          (c) => (c.fromId === fromId && c.toId === toId) || (c.fromId === toId && c.toId === fromId)
        );
        if (exists) return;

        const newConn = {
          id: 'conn-' + Math.random().toString(36).substr(2, 9),
          fromId,
          toId,
        };

        set((state) => ({
          connections: [...state.connections, newConn],
        }));
      },

      removeConnection: (id) => {
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
        }));
      },

      clearCanvas: () => {
        set({ cards: [], connections: [] });
      },
    }),
    {
      name: 'brain_canvas_layout',
    }
  )
);
