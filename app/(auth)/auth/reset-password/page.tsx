'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [isCheckingLink, setIsCheckingLink] = useState(true);
  
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleAuthStateChange = () => {
      // Let Supabase handle the auth state automatically
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state change:', event, session);
        
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          console.log('Valid password recovery session detected');
          setIsValidLink(true);
          setIsCheckingLink(false);
        } else if (event === 'SIGNED_OUT' || !session) {
          // Check if we have URL parameters that might indicate a reset attempt
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          
          if (code) {
            console.log('Code found in URL, but no session. This might be a timing issue.');
            // Give Supabase a moment to process the auth state
            setTimeout(() => {
              supabase.auth.getSession().then(({ data: { session }, error }) => {
                if (session && !error) {
                  console.log('Session found after delay:', session);
                  setIsValidLink(true);
                } else {
                  console.log('No session after delay, showing error');
                  setError('Invalid or expired reset link. Please request a new password reset email.');
                }
                setIsCheckingLink(false);
              });
            }, 1000);
          } else {
            setError('This page requires a valid password reset link. Please request a new password reset email.');
            setIsCheckingLink(false);
          }
        }
      });

      return subscription;
    };

    const checkInitialState = async () => {
      try {
        // Log URL for debugging
        console.log('Full URL:', window.location.href);
        console.log('Search params:', Object.fromEntries(new URLSearchParams(window.location.search).entries()));
        
        // Check if we already have a session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session && !error) {
          console.log('Existing session found:', session);
          setIsValidLink(true);
          setIsCheckingLink(false);
          return;
        }

        // If no session, set up auth state listener and let Supabase handle the URL
        const subscription = handleAuthStateChange();
        
        // Clean up subscription on unmount
        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('Error checking initial state:', err);
        setError('An error occurred while validating the reset link.');
        setIsCheckingLink(false);
      }
    };

    checkInitialState();
  }, [supabase.auth]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError(updateError.message);
      } else {
        setMessage('Password updated successfully! Redirecting to login...');
        setTimeout(() => {
          router.push('/login?message=Password updated successfully');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Validating reset link...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Invalid or expired reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
            <div className="space-y-3">
              <Link href="/forgot-password">
                <Button className="w-full" variant="outline">
                  Request New Reset Email
                </Button>
              </Link>
              <Link href="/login">
                <Button className="w-full" variant="ghost">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter new password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Password must be at least 6 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  disabled={loading}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle className="h-4 w-4" />
                <span>{message}</span>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating Password...</span>
                </div>
              ) : (
                'Update Password'
              )}
            </Button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-gray-600 hover:text-blue-600 underline underline-offset-4"
              >
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
