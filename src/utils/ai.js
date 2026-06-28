import { OpenRouter } from '@openrouter/sdk';
import { useAIStore } from '@/store/useAIStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const STABLE_FREE_MODELS = [
  'google/gemma-2-9b-it:free',
  'qwen/qwen-2.5-coder-32b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemini-2.5-flash',
  'gpt-4o-mini',
];

function isRetryableModelError(error) {
  if (!error) return false;
  if (error.name === 'AbortError' || error.message?.includes('aborted')) {
    return false;
  }
  return true;
}

function isRateLimitError(error) {
  if (!error) return false;
  return (
    error.name === 'TooManyRequestsResponseError' ||
    error.message?.includes('429') ||
    error.message?.includes('Too Many Requests') ||
    error.message?.includes('rate limit')
  );
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Simple lock-based queue to prevent concurrent floods
let currentLock = Promise.resolve();
let activeCount = 0;
let queueLength = 0;

function incrementActive() {
  activeCount++;
  useAIStore.getState().setGenerating(true);
}

function decrementActive() {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    useAIStore.getState().setGenerating(false);
  }
}

function setQueue(length) {
  queueLength = length;
  useAIStore.getState().setQueueLength(length);
  if (length > 1) {
    useAIStore.getState().setRateLimitMessage(
      'AI is busy. Your request is queued and will run shortly.'
    );
  } else {
    useAIStore.getState().setRateLimitMessage(null);
  }
}

async function acquireLock() {
  queueLength += 1;
  setQueue(queueLength);

  let release;
  const nextLock = new Promise((resolve) => {
    release = resolve;
  });
  const previousLock = currentLock;
  currentLock = nextLock;
  await previousLock;

  queueLength = Math.max(0, queueLength - 1);
  setQueue(queueLength);

  incrementActive();
  return () => {
    decrementActive();
    release();
  };
}

async function* streamGroq(messages, options, apiKey) {
  const models = ['llama-3.1-8b-instant', 'llama3-8b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'];
  let response = null;
  let lastError = null;

  for (const model of models) {
    try {
      response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          max_tokens: options.max_tokens ?? 1024,
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API error (${response.status}): ${errText}`);
      }
      break;
    } catch (err) {
      lastError = err;
      console.warn(`Groq model ${model} failed, trying next...`, err);
    }
  }

  if (!response) {
    throw lastError || new Error('All Groq models failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleaned = line.trim();
        if (!cleaned) continue;
        if (cleaned === 'data: [DONE]') continue;
        if (cleaned.startsWith('data: ')) {
          try {
            const data = JSON.parse(cleaned.slice(6));
            const content = data.choices?.[0]?.delta?.content || '';
            if (content) {
              yield content;
            }
          } catch (err) {
            // Ignore partial lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Streams AI completions from OpenRouter, falling back to Groq if needed.
 * @param {Array<{role: string, content: string}>} messages
 * @param {Object} options
 * @returns {AsyncGenerator<string>}
 */
export async function* stream(messages, options = {}) {
  // Check if AI is enabled globally
  const aiEnabled = useSettingsStore.getState().aiEnabled;
  if (!aiEnabled) {
    yield '[AI features are currently disabled in settings]';
    return;
  }

  const release = await acquireLock();
  useAIStore.getState().setError(null);

  const orApiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!orApiKey && !groqApiKey) {
    console.warn('AI API keys are missing. Add VITE_OPENROUTER_API_KEY or VITE_GROQ_API_KEY to your .env file.');
    yield '[AI unavailable: Please configure API keys in your .env file]';
    release();
    return;
  }

  try {
    if (orApiKey) {
      try {
        const openRouter = new OpenRouter({
          apiKey: orApiKey,
          httpReferer: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
          appTitle: 'Brain Notepad',
        });

        const { signal, model, ...chatRequestOptions } = options;
        const modelsToTry = Array.from(
          new Set([model, ...STABLE_FREE_MODELS].filter(Boolean))
        );

        let lastError = null;
        let response;

        for (const currentModel of modelsToTry) {
          try {
            response = await openRouter.chat.send(
              {
                chatRequest: {
                  model: currentModel,
                  messages,
                  stream: true,
                  max_tokens: chatRequestOptions.max_tokens ?? 1024,
                  ...chatRequestOptions,
                },
              },
              {
                signal,
              }
            );
            break;
          } catch (error) {
            lastError = error;
            if (isRateLimitError(error)) {
              // Wait a bit to cool down, then continue to other fallback models in the list
              await wait(1000);
            }
            if (!isRetryableModelError(error) || currentModel === modelsToTry[modelsToTry.length - 1]) {
              throw error;
            }
          }
        }

        if (!response) {
          throw lastError || new Error('No AI response available');
        }

        for await (const chunk of response) {
          if (options.signal?.aborted) {
            break;
          }
          const content = chunk.choices?.[0]?.delta?.content || '';
          if (content) {
            yield content;
          }
        }
        return; // Success, skip fallback
      } catch (orError) {
        console.warn('OpenRouter failed, attempting Groq fallback...', orError);
        if (!groqApiKey) {
          throw orError; // No fallback available
        }
      }
    }

    // Fallback to Groq
    yield* streamGroq(messages, options, groqApiKey);

  } catch (error) {
    console.error('AI streaming error:', error);
    const errMsg = error?.message || 'Unknown API error';
    useAIStore.getState().setError(errMsg);
    yield `[AI Error: ${errMsg}]`;
  } finally {
    release();
  }
}

export async function streamToText(messages, options = {}) {
  let result = '';
  for await (const chunk of stream(messages, options)) {
    result += chunk;
  }
  return result.trim();
}

export async function generateWeeklyDigest(notes, options = {}) {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new Error('No notes provided for weekly digest.');
  }

  const noteContext = notes
    .map((note) => {
      const content = (note.content || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `Title: ${note.title || 'Untitled'}\nLast updated: ${note.updatedAt || note.createdAt}\nContent: ${content.slice(0, 500)}`;
    })
    .join('\n\n');

  const prompt = `You are an AI assistant that creates a clean weekly digest from notes. Given the following notes edited in the last 7 days, produce a structured summary with themes, highlights, and open actions. Return the digest as plain text with headings. Do not include any markdown code blocks.

${noteContext}`;

  return streamToText([{ role: 'user', content: prompt }], options);
}
