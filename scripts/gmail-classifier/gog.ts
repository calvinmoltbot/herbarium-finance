// Wrapper around the gog CLI for Gmail access.
// Spawns the binary, expects JSON output via the `-j` flag.

import { spawn } from 'node:child_process';
import { GOG_ACCOUNT, GOG_CLIENT } from './config';
import type { GmailMessage, GmailHeaders } from './types';

const BASE_FLAGS = ['-j', '-a', GOG_ACCOUNT, '--client', GOG_CLIENT];

async function gog<T = unknown>(args: string[]): Promise<T> {
  return new Promise((resolve, reject) => {
    const p = spawn('gog', [...args, ...BASE_FLAGS]);
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    p.stdout.on('data', (b) => stdout.push(b));
    p.stderr.on('data', (b) => stderr.push(b));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`gog ${args.join(' ')} exited ${code}: ${Buffer.concat(stderr).toString()}`));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(stdout).toString()));
      } catch (e) {
        reject(new Error(`gog ${args.join(' ')} returned invalid JSON: ${(e as Error).message}`));
      }
    });
  });
}

interface SearchResult {
  threads?: Array<{ id: string }>;
  resultSizeEstimate?: number;
}

export async function searchThreads(query: string, maxResults = 20): Promise<string[]> {
  const result = await gog<SearchResult>(['gmail', 'search', query, '--max', String(maxResults)]);
  return (result.threads ?? []).map((t) => t.id);
}

interface ThreadResult {
  thread?: { messages?: GmailMessage[] };
}

export async function getThreadMessages(threadId: string): Promise<GmailMessage[]> {
  const result = await gog<ThreadResult>(['gmail', 'thread', 'get', threadId]);
  return result.thread?.messages ?? [];
}

export function getHeaders(msg: GmailMessage): GmailHeaders {
  const out: GmailHeaders = {};
  for (const h of msg.payload?.headers ?? []) {
    if (h.name === 'From' || h.name === 'To' || h.name === 'Subject' || h.name === 'Date') {
      out[h.name] = h.value;
    }
  }
  return out;
}

/** Walks MIME parts and returns the first text/plain or text/html body, base64url-decoded. */
export function getBodyText(msg: GmailMessage, maxBytes = 4096): string {
  const collect = (parts: NonNullable<GmailMessage['payload']['parts']>): string | null => {
    for (const part of parts) {
      if (part.body?.data && (part.mimeType === 'text/plain' || part.mimeType === 'text/html')) {
        return part.body.data;
      }
      if (part.parts) {
        const inner = collect(part.parts);
        if (inner) return inner;
      }
    }
    return null;
  };

  const data = msg.payload.body?.data ?? (msg.payload.parts ? collect(msg.payload.parts) : null);
  if (!data) return msg.snippet ?? '';

  // gmail uses base64url
  const buf = Buffer.from(data, 'base64url');
  const text = buf.toString('utf8').slice(0, maxBytes);
  // crude HTML strip — fine for LLM input
  return text.replace(/<style[\s\S]*?<\/style>/gi, '')
             .replace(/<script[\s\S]*?<\/script>/gi, '')
             .replace(/<[^>]+>/g, ' ')
             .replace(/&nbsp;/gi, ' ')
             .replace(/&amp;/gi, '&')
             .replace(/&lt;/gi, '<')
             .replace(/&gt;/gi, '>')
             .replace(/\s+/g, ' ')
             .trim();
}
