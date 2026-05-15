/**
 * Unit tests for the auth module.
 *
 * Mocks the supabase client. Verifies sendMagicLink/signOut error handling
 * and the session-store reflection of supabase auth events.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { get } from 'svelte/store';

interface MockAuth {
  getSession: Mock;
  onAuthStateChange: Mock;
  signInWithOtp: Mock;
  signOut: Mock;
}

let mockAuth: MockAuth;
let authChangeHandler: ((event: string, session: unknown) => void) | null = null;

function buildMockAuth(): MockAuth {
  return {
    getSession: vi.fn(async () => ({ data: { session: null } })),
    onAuthStateChange: vi.fn((handler: (event: string, session: unknown) => void) => {
      authChangeHandler = handler;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    }),
    signInWithOtp: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => ({ error: null })),
  };
}

vi.mock('../../src/lib/supabase', () => ({
  get supabase() {
    return { auth: mockAuth };
  },
  isSyncConfigured: () => true,
}));

mockAuth = buildMockAuth();

// window.location.origin used inside sendMagicLink — jsdom provides it.
const { sendMagicLink, signOut, session, AuthError, SyncNotConfiguredError } =
  await import('../../src/lib/auth');

beforeEach(() => {
  mockAuth.signInWithOtp.mockClear();
  mockAuth.signOut.mockClear();
  mockAuth.getSession.mockClear();
});

describe('sendMagicLink', () => {
  it('calls supabase.auth.signInWithOtp with the trimmed email', async () => {
    await sendMagicLink('  user@example.com  ');
    expect(mockAuth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        options: expect.objectContaining({
          emailRedirectTo: expect.any(String),
          shouldCreateUser: true,
        }),
      })
    );
  });

  it('throws AuthError on empty email', async () => {
    await expect(sendMagicLink('   ')).rejects.toBeInstanceOf(AuthError);
  });

  it('throws AuthError when supabase returns an error', async () => {
    mockAuth.signInWithOtp.mockResolvedValueOnce({ error: { message: 'rate limit' } });
    await expect(sendMagicLink('user@example.com')).rejects.toMatchObject({
      name: 'AuthError',
      message: 'rate limit',
    });
  });
});

describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    await signOut();
    expect(mockAuth.signOut).toHaveBeenCalled();
  });

  it('throws AuthError when supabase returns an error', async () => {
    mockAuth.signOut.mockResolvedValueOnce({ error: { message: 'network down' } });
    await expect(signOut()).rejects.toBeInstanceOf(AuthError);
  });
});

describe('session store', () => {
  it('starts at null and reflects auth-state-change updates', () => {
    expect(get(session)).toBeNull();
    expect(authChangeHandler).not.toBeNull();

    const fakeSession = { user: { id: 'u1', email: 'u1@example.com' } };
    authChangeHandler!('SIGNED_IN', fakeSession);
    expect(get(session)).toEqual(fakeSession);

    authChangeHandler!('SIGNED_OUT', null);
    expect(get(session)).toBeNull();
  });
});

describe('SyncNotConfiguredError', () => {
  // Reset to a state where the supabase singleton is null
  it('is the class name used when sync is not configured', () => {
    const err = new SyncNotConfiguredError();
    expect(err.name).toBe('SyncNotConfiguredError');
  });
});
