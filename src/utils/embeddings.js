import { IndexedDBStorage } from './storage';

const db = new IndexedDBStorage('BrainEmbeddingsDB', 'embeddings');

let worker = null;
let status = 'idle'; // 'idle' | 'loading' | 'ready' | 'error'
const statusCallbacks = new Set();
const pendingEmbeddings = new Map();
const pendingQueries = new Map();

export function getEmbeddingStatus() {
  return status;
}

export function subscribeToEmbeddingStatus(callback) {
  statusCallbacks.add(callback);
  callback(status);
  return () => statusCallbacks.delete(callback);
}

function notifyStatus(newStatus) {
  status = newStatus;
  statusCallbacks.forEach((cb) => cb(status));
}

export function initEmbeddingWorker() {
  if (worker) return worker;

  worker = new Worker('/embedding-worker.js', { type: 'module' });

  worker.onmessage = async (e) => {
    const { type, id, embedding, query, status: workerStatus, error } = e.data;

    if (type === 'status') {
      notifyStatus(workerStatus);
    } else if (type === 'embed-result') {
      const resolve = pendingEmbeddings.get(id);
      if (resolve) {
        await db.set(id, embedding);
        resolve(embedding);
        pendingEmbeddings.delete(id);
      }
    } else if (type === 'query-result') {
      const resolve = pendingQueries.get(query);
      if (resolve) {
        resolve(embedding);
        pendingQueries.delete(query);
      }
    } else if (type === 'error') {
      console.error('Embedding worker reported error:', error);
      if (id) {
        const resolve = pendingEmbeddings.get(id);
        if (resolve) resolve(null);
        pendingEmbeddings.delete(id);
      }
    }
  };

  return worker;
}

// Generate vector embedding for a note
export async function getNoteEmbedding(note) {
  if (!note) return null;

  // Check cache first
  const cached = await db.get(note.id);
  if (cached) return cached;

  initEmbeddingWorker();

  // Strip HTML tags for clean text content
  const cleanText = extractCleanText(note.title, note.content);
  if (!cleanText) return null;

  return new Promise((resolve) => {
    pendingEmbeddings.set(note.id, resolve);
    worker.postMessage({ type: 'embed', id: note.id, text: cleanText });
  });
}

// Force re-calculation (e.g. when note content changes)
export async function updateNoteEmbedding(note) {
  if (!note) return null;
  
  initEmbeddingWorker();
  
  const cleanText = extractCleanText(note.title, note.content);
  if (!cleanText) return null;

  return new Promise((resolve) => {
    pendingEmbeddings.set(note.id, resolve);
    worker.postMessage({ type: 'embed', id: note.id, text: cleanText });
  });
}

function extractCleanText(title, content) {
  const t = title || '';
  if (!content) return t;
  
  // Quick browser-safe tag stripping
  const clean = content.replace(/<\/?[^>]+(>|$)/g, ' ');
  return `${t}\n${clean}`.replace(/\s+/g, ' ').trim();
}

// Remove embedding from cache
export async function deleteNoteEmbedding(id) {
  try {
    await db.del(id);
  } catch (err) {
    console.error(err);
  }
}

// Cosine similarity
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// Offline Semantic vector search
export async function semanticSearch(query, notes) {
  if (!query.trim()) return [];

  initEmbeddingWorker();

  // Get embedding for query
  const queryVec = await new Promise((resolve) => {
    pendingQueries.set(query, resolve);
    worker.postMessage({ type: 'embed-query', query });
  });

  if (!queryVec) return [];

  const results = [];
  const activeNotes = notes.filter((n) => !n.trashed);

  for (const note of activeNotes) {
    const noteVec = await getNoteEmbedding(note);
    if (noteVec) {
      const similarity = cosineSimilarity(queryVec, noteVec);
      results.push({ note, similarity });
    }
  }

  // Sort by similarity score descending
  return results
    .filter((r) => r.similarity > 0.38) // Threshold for matches
    .sort((a, b) => b.similarity - a.similarity);
}
