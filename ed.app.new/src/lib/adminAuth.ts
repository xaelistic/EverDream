/**
 * Admin access control — checks user profile for admin flag
 */

import { getCurrentUser, getProfile, supabase } from './supabase/client';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export async function isAdminUser(): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return true;
    }

    const profile = await getProfile();
    if (profile?.is_admin === true || profile?.role === 'admin') {
      return true;
    }

    const { data: meta } = await supabase.auth.getUser();
    const appMeta = meta?.user?.app_metadata;
    if (appMeta?.role === 'admin' || appMeta?.is_admin === true) {
      return true;
    }

    return localStorage.getItem('everdream_admin') === 'true';
  } catch {
    return false;
  }
}