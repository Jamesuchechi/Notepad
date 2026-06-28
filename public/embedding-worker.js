// Import Transformers.js from CDN inside Web Worker
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';

// Enable remote model downloads from HF
env.allowLocalModels = false;

let embedderPromise = null;

function getEmbedder() {
  if (!embedderPromise) {
    self.postMessage({ type: 'status', status: 'loading' });
    embedderPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')
      .then((pipe) => {
        self.postMessage({ type: 'status', status: 'ready' });
        return pipe;
      })
      .catch((err) => {
        self.postMessage({ type: 'status', status: 'error', error: err.message });
        embedderPromise = null;
        throw err;
      });
  }
  return embedderPromise;
}

self.onmessage = async (event) => {
  const { type, text, id, query } = event.data;

  try {
    const pipe = await getEmbedder();

    if (type === 'embed') {
      // Mean pooling + Normalisation is built-in
      const output = await pipe(text, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      self.postMessage({ type: 'embed-result', id, embedding });
    } else if (type === 'embed-query') {
      const output = await pipe(query, { pooling: 'mean', normalize: true });
      const embedding = Array.from(output.data);
      self.postMessage({ type: 'query-result', query, embedding });
    }
  } catch (err) {
    console.error('Embedding worker failed:', err);
    self.postMessage({ type: 'error', error: err.message, id });
  }
};
