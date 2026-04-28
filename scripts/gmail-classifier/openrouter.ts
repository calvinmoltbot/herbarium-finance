// OpenRouter API client + usage capture.

import type { ClassificationResult, UsageRecord } from './types';
import { OPENROUTER_MODEL } from './config';
import { SYSTEM_PROMPT, userPromptFor } from './prompt';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    cost?: number; // USD — present when `usage: { include: true }` is in request
  };
  error?: { message?: string };
}

export interface ClassifyOutput {
  result: ClassificationResult | null;
  usage: UsageRecord;
}

export async function classifyEmail(input: {
  from: string;
  subject: string;
  date: string;
  body: string;
}): Promise<ClassifyOutput> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');

  const start = Date.now();
  const baseUsage = (extra: Partial<UsageRecord> = {}): UsageRecord => ({
    model: OPENROUTER_MODEL,
    prompt_tokens: null,
    completion_tokens: null,
    total_tokens: null,
    cost_usd: null,
    duration_ms: Date.now() - start,
    success: false,
    error_message: null,
    ...extra,
  });

  const requestBody = JSON.stringify({
    model: OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPromptFor(input) },
    ],
    response_format: { type: 'json_object' },
    usage: { include: true },
    temperature: 0,
  });
  const requestHeaders = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://herbarium-finance.warmwetcircles.com',
    'X-Title': 'Herbarium Finance - Gmail Classifier',
  };

  // Retry on transient 5xx / 429 / network failures with exponential backoff.
  // OpenRouter / upstream provider routinely emits 504s and 429s under load.
  let response: Response | null = null;
  let lastErr = '';
  const MAX_ATTEMPTS = 4;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      response = await fetch(ENDPOINT, { method: 'POST', headers: requestHeaders, body: requestBody });
      if (response.status < 500 && response.status !== 429) break; // success or non-transient error
      lastErr = `http ${response.status}`;
    } catch (e) {
      lastErr = `network: ${(e as Error).message}`;
    }
    if (attempt < MAX_ATTEMPTS) {
      const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 500; // 1s, 2s, 4s + jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  if (!response) {
    return { result: null, usage: baseUsage({ error_message: lastErr }) };
  }

  let data: OpenRouterResponse;
  try {
    data = (await response.json()) as OpenRouterResponse;
  } catch (e) {
    return { result: null, usage: baseUsage({ error_message: `bad json: ${(e as Error).message}` }) };
  }

  const usage: UsageRecord = baseUsage({
    prompt_tokens: data.usage?.prompt_tokens ?? null,
    completion_tokens: data.usage?.completion_tokens ?? null,
    total_tokens: data.usage?.total_tokens ?? null,
    cost_usd: data.usage?.cost ?? null,
  });

  if (!response.ok) {
    usage.error_message = `http ${response.status}: ${data.error?.message ?? 'unknown'}`;
    return { result: null, usage };
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    usage.error_message = 'empty content in response';
    return { result: null, usage };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (e) {
    usage.error_message = `json parse: ${(e as Error).message}`;
    return { result: null, usage };
  }

  // Gemini sometimes wraps a single result in an array despite json_object mode.
  // Unwrap defensively.
  const obj = Array.isArray(raw) ? raw[0] : raw;
  if (!obj || typeof obj !== 'object') {
    usage.error_message = `unexpected shape: ${typeof obj}`;
    return { result: null, usage };
  }

  usage.success = true;
  return { result: obj as ClassificationResult, usage };
}
