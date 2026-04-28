// Shared types for the gmail classifier (Phase A — issue #13)

export interface GmailMessage {
  id: string;
  threadId: string;
  internalDate: string; // unix ms as string
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string; size?: number };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string; size?: number };
      parts?: GmailMessage['payload']['parts'];
    }>;
  };
}

export interface GmailHeaders {
  From?: string;
  To?: string;
  Subject?: string;
  Date?: string;
}

export interface ClassificationResult {
  vendor: string | null;
  amount: number | null;
  email_date: string | null; // YYYY-MM-DD
  items: Array<{ name: string; amount?: number }> | null;
  suggested_category: string | null; // category name, not id (script resolves)
  confidence: number; // 0..1
}

export interface UsageRecord {
  model: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number;
  success: boolean;
  error_message: string | null;
}
