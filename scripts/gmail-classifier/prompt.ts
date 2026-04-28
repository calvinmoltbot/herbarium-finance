// Classification prompt + JSON schema for OpenRouter.

export const SYSTEM_PROMPT = `You extract structured purchase information from order/receipt emails.
Output a single JSON OBJECT only (not an array, not wrapped in any container).
No prose, no markdown.

Fields:
- vendor (string|null): clean merchant name, e.g. "Etsy", "Amazon", "Sostrene Grene"
- amount (number|null): total charged, in the email's stated currency. Numbers only, no symbols.
- email_date (string|null): YYYY-MM-DD of the order/charge
- items (array|null): line items if itemised, each {name: string, amount?: number}
- suggested_category (string|null): best-fit business category (see list)
- confidence (number): 0..1 — your confidence in the extraction

Suggested category options (use exact names):
- Equipment, Materials, Yarn, Undyed yarn, Dyes, Chemicals, Lace, Fabric
- Yarn labels, Threads boxes, Stitch markers, Knitting pattern
- Calendars, Books, Stationery, Packaging, Postage
- Software, Web Hosting, Advertising, Show fee, Travel
- Bank fees, Insurance, Training, Charitable, Gift, Misc

Pick "Misc" only if nothing fits or you can't tell.
Output null fields rather than guessing — that's better than wrong data.`;

export function userPromptFor(input: {
  from: string;
  subject: string;
  date: string;
  body: string;
}): string {
  return `From: ${input.from}
Subject: ${input.subject}
Date: ${input.date}

Body:
${input.body.slice(0, 2000)}`;
}
