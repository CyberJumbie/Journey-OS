import { useMutation, useQuery } from '@tanstack/react-query';

// ── API helpers (auth endpoints use relative URLs via Next.js proxy) ──────────

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message = data.message || res.statusText;
    const error = new Error(message);
    (error as AuthFetchError).status = res.status;
    throw error;
  }

  return res.json() as Promise<T>;
}

interface AuthFetchError extends Error {
  status: number;
}

// ── Forgot Password ──────────────────────────────────────────────────────────

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      authFetch<{ message: string }>('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      }),
  });
}

// ── Invitation ───────────────────────────────────────────────────────────────

interface InvitationData {
  email: string;
  role: string;
  institution_name: string;
}

export function useValidateInvitation(token: string | null) {
  return useQuery({
    queryKey: ['invitation', token],
    queryFn: () =>
      authFetch<InvitationData>(`/api/v1/auth/invitation/validate?token=${token}`),
    enabled: !!token,
    retry: false,
  });
}

interface AcceptInvitationInput {
  token: string;
  full_name: string;
  password: string;
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (input: AcceptInvitationInput) =>
      authFetch<{ message: string }>('/api/v1/auth/invitation/accept', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}

// ── Email Verification ───────────────────────────────────────────────────────

interface UserData {
  email: string;
  role: string;
  [key: string]: unknown;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authFetch<UserData>('/api/v1/auth/me'),
    retry: false,
  });
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) =>
      authFetch<{ message: string }>('/api/v1/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  });
}

export function useResendVerification() {
  return useMutation({
    mutationFn: () =>
      authFetch<{ message: string }>('/api/v1/auth/resend-verification', {
        method: 'POST',
      }),
  });
}

// ── Onboarding ───────────────────────────────────────────────────────────────

export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: () =>
      authFetch<{ message: string }>('/api/v1/auth/onboarding/complete', {
        method: 'POST',
      }),
  });
}

// ── Waitlist ─────────────────────────────────────────────────────────────────

interface WaitlistInput {
  institution_name: string;
  institution_type: string;
  accreditation_body: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  student_count: number;
  website_url?: string;
  reason?: string;
  [key: string]: unknown;
}

export function useWaitlistApplication() {
  return useMutation({
    mutationFn: (input: WaitlistInput) =>
      authFetch<{ message: string }>('/api/v1/waitlist', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  });
}
