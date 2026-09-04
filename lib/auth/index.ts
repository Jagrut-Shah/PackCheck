/**
 * PackCheck AI - Authentication Module
 * Owner: Vijay (Backend)
 * Purpose: Authentication sessions, JWT/Supabase Auth handling, role authorization.
 */

import { AuthSession, UserProfile } from "@/types/user";
import { CURRENT_MOCK_USER } from "@/mocks/users";

export async function getCurrentSession(): Promise<AuthSession> {
  // In development, return mock authenticated inspector session
  return {
    user: CURRENT_MOCK_USER,
    token: "mock-jwt-token-sih-2026",
    isAuthenticated: true,
  };
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const session = await getCurrentSession();
  return session.user;
}
