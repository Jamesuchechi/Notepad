import { OpenRouter } from '@openrouter/sdk';
import { useAIStore } from '@/store/useAIStore';
import { useSettingsStore } from '@/store/useSettingsStore';

const STABLE_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-nano-2-vl:free',
  'qwen/qwen3-coder:free',
  'openai/gpt-oss-120b:free',
  'gpt-4o-mini',
  'gpt-3.5-turbo',
  'google/gemini-2.5-flash',
];

function isRetryableModelError(error) {
  if (!error) return false;
  const retryableNames = [
    'PaymentRequiredResponseError',
    'ProviderOverloadedResponseError',
    'ServiceUnavailableResponseError',
    'RequestTimeoutResponseError',
    'BadGatewayResponseError',
  ];
  return (
    retryableNames.some((name) => error.name === name) ||
    retryableNames.some((name) => error.message?.includes(name)) ||
    error.message?.includes('credits') ||
    error.message?.includes('unavailable')
  );
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

/**
 * Streams AI completions from OpenRouter.
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

  try {
    const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    if (!apiKey) {
      console.warn('OpenRouter API key is missing. Add VITE_OPENROUTER_API_KEY to your .env file.');
      yield '[AI unavailable: Please configure VITE_OPENROUTER_API_KEY in your .env file]';
      return;
    }

    const openRouter = new OpenRouter({
      apiKey,
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
          await wait(2500);
          throw error;
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
