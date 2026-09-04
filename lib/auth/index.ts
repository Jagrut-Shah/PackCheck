/**
 * PackCheck AI - Authentication Module
 * Owner: Vijay (Backend)
 * Purpose: Authentication sessions, JWT/Supabase Auth handling, role authorization.
 */

import { AuthSession, UserProfile } from "@/lib/types/user";
import { supabase } from "@/lib/supabase";

function toUserProfile(user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>>["data"]["user"]): UserProfile | null {
  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  return {
    id: user.id,
    fullName: metadata.full_name ?? metadata.fullName ?? user.email ?? "",
    employeeCode: metadata.badge_number ?? metadata.employeeCode ?? "",
    email: user.email ?? "",
    role: metadata.role ?? "INSPECTOR",
    organizationId: metadata.organization_id ?? "",
    departmentId: metadata.department_id ?? "",
    isActive: metadata.is_active ?? true,
    designation: metadata.designation,
    badgeNumber: metadata.badge_number,
    department: metadata.department,
    jurisdictionState: metadata.jurisdiction_state,
    jurisdictionDistrict: metadata.jurisdiction,
    createdAt: user.created_at,
    lastLoginAt: metadata.last_login_at,
  };
}

export async function signIn(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(input: {
  email: string;
  password: string;
  fullName: string;
  badgeNumber: string;
  department: string;
  jurisdiction: string;
  role: string;
}) {
  return supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.fullName,
        badge_number: input.badgeNumber,
        department: input.department,
        jurisdiction: input.jurisdiction,
        role: input.role,
      },
    },
  });
}

export async function sendPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login`,
  });
}

export async function getCurrentSession(): Promise<AuthSession> {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user ?? null;

  return {
    user: toUserProfile(user),
    token: data.session?.access_token,
    isAuthenticated: Boolean(data.session),
  };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const session = await getCurrentSession();
  return session.user;
}

export async function signOut() {
  return supabase.auth.signOut();
}

