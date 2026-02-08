"use server";

import { createClient } from "@/supabase/server";

//sign up with email and password
export async function signup(formData: {
  name: string;
  email: string;
  password: string;
  phone: string;
}) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: formData.email as string,
    password: formData.password as string,
    options: {
      data: {
        full_name: formData.name as string,
        phone: formData.phone as string,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { user: data.user, session: data.session };
}

//login with email and password
export async function login(formData: { email: string; password: string }) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.email,
    password: formData.password,
  });

  if (error) {
    return { error: error.message };
  }

  return { user: data.user, session: data.session };
}

//logout and remove user
export async function logOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return { error: error.message };
  }

  return;
}

//reset password
export async function resetPassword(email: string) {
  const supabase = await createClient();

  // Use the current origin for the redirect URL
  const redirectUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/reset-password`
    : `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'}/auth/reset-password`;

  console.log('Attempting password reset for:', email);
  console.log('Redirect URL:', redirectUrl);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  if (error) {
    console.error('Password reset error:', error);
    return { error: error.message };
  }

  console.log('Password reset email sent successfully');
  return { success: true };
}

//update password (for reset password flow)
export async function updatePassword(password: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: password
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
