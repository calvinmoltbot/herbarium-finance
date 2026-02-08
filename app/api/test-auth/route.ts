import { NextResponse } from 'next/server';
import { createClient } from '@/supabase/server';

/**
 * Test-only authentication endpoint
 * Allows Puppeteer tests to authenticate without OAuth flow
 *
 * SECURITY: Only available in development mode
 */
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Endpoint not available' },
      { status: 404 }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    // Use environment variables for test credentials if not provided
    const testEmail = email || process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = password || process.env.TEST_USER_PASSWORD || 'test-password-123';

    const supabase = await createClient();

    // Sign in the test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.error('Test auth error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (!data.session) {
      return NextResponse.json(
        { error: 'No session created' },
        { status: 500 }
      );
    }

    // Return success with session info
    return NextResponse.json({
      success: true,
      user: {
        id: data.user?.id,
        email: data.user?.email,
      },
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (error) {
    console.error('Test auth exception:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check if test auth is available
 */
export async function GET() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { available: false },
      { status: 404 }
    );
  }

  return NextResponse.json({
    available: true,
    message: 'Test authentication endpoint is available',
    usage: 'POST /api/test-auth with { email, password } (optional)',
  });
}
