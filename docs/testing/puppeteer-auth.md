# Puppeteer Authentication for Testing

## Overview

This guide explains how to use the test authentication endpoint (`/api/test-auth`) to bypass OAuth flows in Puppeteer tests.

## Security

⚠️ **IMPORTANT**: The test authentication endpoint is **ONLY** available in development mode (`NODE_ENV !== 'production'`). It will return a 404 error in production.

## Setup

### 1. Create a Test User in Supabase

First, you need to create a test user in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to Authentication → Users
3. Click "Add User"
4. Create a user with:
   - Email: `test@example.com` (or your preferred email)
   - Password: Strong password
   - Confirm the email if required

### 2. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Test authentication credentials (dev only)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=your-test-password-here
```

## Usage

### Basic Puppeteer Test

```typescript
import puppeteer from 'puppeteer';

async function testWithAuth() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Navigate to your app
  await page.goto('http://localhost:3000');

  // Authenticate using the test endpoint
  const authResponse = await page.evaluate(async () => {
    const response = await fetch('/api/test-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}), // Uses env variables
    });
    return await response.json();
  });

  console.log('Authenticated:', authResponse.success);
  console.log('User ID:', authResponse.user.id);

  // Now navigate to protected pages
  await page.goto('http://localhost:3000/transactions');

  // Your tests here...

  await browser.close();
}
```

### With Custom Credentials

```typescript
const authResponse = await page.evaluate(async () => {
  const response = await fetch('/api/test-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'custom@example.com',
      password: 'custom-password',
    }),
  });
  return await response.json();
});
```

### Testing the Transaction Category Amendment Feature

```typescript
import puppeteer from 'puppeteer';

async function testCategoryAmendment() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Step 1: Authenticate
  await page.goto('http://localhost:3000');

  const authResult = await page.evaluate(async () => {
    const response = await fetch('/api/test-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return await response.json();
  });

  if (!authResult.success) {
    throw new Error('Authentication failed');
  }

  console.log('✓ Authenticated as:', authResult.user.email);

  // Step 2: Navigate to transactions page
  await page.goto('http://localhost:3000/transactions', {
    waitUntil: 'networkidle0',
  });

  console.log('✓ Navigated to transactions page');

  // Step 3: Click on the first transaction to open detail panel
  await page.waitForSelector('[data-testid="transaction-row"]', { timeout: 5000 });
  await page.click('[data-testid="transaction-row"]');

  console.log('✓ Opened transaction detail panel');

  // Step 4: Click the Edit/Assign category button
  await page.waitForSelector('button:has-text("Edit")', { timeout: 5000 });
  await page.click('button:has-text("Edit")');

  console.log('✓ Clicked edit category button');

  // Step 5: Select a category from the picker
  await page.waitForSelector('[role="combobox"]', { timeout: 5000 });
  await page.click('[role="combobox"]');
  await page.waitForSelector('[role="option"]', { timeout: 5000 });
  await page.click('[role="option"]:first-child');

  console.log('✓ Selected new category');

  // Step 6: Verify success toast appears
  await page.waitForSelector('.sonner-toast', { timeout: 5000 });
  const toastText = await page.$eval('.sonner-toast', el => el.textContent);

  console.log('✓ Success toast appeared:', toastText);

  // Clean up
  await browser.close();
}

// Run the test
testCategoryAmendment().catch(console.error);
```

## API Endpoint Details

### GET /api/test-auth

Check if the test authentication endpoint is available.

**Response:**
```json
{
  "available": true,
  "message": "Test authentication endpoint is available",
  "usage": "POST /api/test-auth with { email, password } (optional)"
}
```

### POST /api/test-auth

Authenticate a test user.

**Request Body (optional):**
```json
{
  "email": "test@example.com",
  "password": "your-password"
}
```

**Success Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "test@example.com"
  },
  "session": {
    "access_token": "token-here",
    "refresh_token": "refresh-token-here"
  }
}
```

**Error Response:**
```json
{
  "error": "Error message here"
}
```

## Troubleshooting

### "Endpoint not available" error

Make sure you're running in development mode (`NODE_ENV=development`).

### Authentication fails

1. Verify the test user exists in Supabase
2. Check the email is confirmed
3. Verify the password is correct
4. Check `.env.local` has the correct credentials

### Session not persisting

The test-auth endpoint sets cookies automatically via Supabase. If sessions aren't persisting:

1. Make sure cookies are enabled in your Puppeteer instance
2. Verify you're navigating to pages **after** authentication
3. Check that middleware is not blocking authenticated routes

## Best Practices

1. **Use a dedicated test user** - Don't use real user accounts for testing
2. **Environment variables** - Store credentials in `.env.local`, never in code
3. **Clean up** - Close browser instances after tests
4. **Test isolation** - Each test should authenticate independently
5. **Error handling** - Always check `authResult.success` before proceeding

## Related Files

- `/app/api/test-auth/route.ts` - Test authentication endpoint
- `/middleware.ts` - Middleware exception for test-auth
- `/supabase/server.ts` - Supabase server client used by endpoint
