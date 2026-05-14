/**
 * Unit tests for the sync coordinator.
 *
 * Mocks the supabase client and the inner sync module so this test focuses
 * on the state machine: which auth event triggers which push/pull, the
 * conflict-pending pathway, debounced push behaviour, and the suppress-
 * outbound flag during server-driven state replacement.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get, writable, type Writable } from 'svelte/store';
import type { AppState } from '../../src/types/models';

let authChangeHandler: ((event: string, session: unknown) => void) | null = null;
let appStateStore: Writable<AppState>;

const pushFullState = vi.fn(async () => undefined);
const pullFullState = vi.fn(async () => null as AppState | null);
const peekRemoteState = vi.fn(async () => ({
  exists: false,
  boxCount: 0,
  flavorCount: 0,
  eventCount: 0,
  updatedAt: null,
}));
const clearRemoteState = vi.fn(async () => undefined);

class FakeSyncError extends Error {
  readonly cause?: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'SyncError';
    this.cause = cause;
  }
}

const supabaseAuthMock = {
  onAuthStateChange: vi.fn((handler: (event: string, session: unknown) => void) => {
    authChangeHandler = handler;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  }),
  signOut: vi.fn(async () => ({ error: null })),
};

vi.mock('../../src/lib/supabase', () => ({
  get supabase() {
    return { auth: supabaseAuthMock };
  },
  isSyncConfigured: () => true,
}));

vi.mock('../../src/lib/sync', () => ({
  pushFullState: (...args: unknown[]) => pushFullState(...(args as [])),
  pullFullState: (...args: unknown[]) => pullFullState(...(args as [])),
  peekRemoteState: (...args: unknown[]) => peekRemoteState(...(args as [])),
  clearRemoteState: (...args: unknown[]) => clearRemoteState(...(args as [])),
  SyncError: FakeSyncError,
}));

vi.mock('../../src/lib/stores', () => ({
  get appState() {
    return appStateStore;
  },
  replaceAppState: (state: AppState) => appStateStore.set(state),
}));

const { createDefaultAppState } = await import('../../src/types/models');

function freshLocalState(): AppState {
  return createDefaultAppState();
}

function populatedLocalState(): AppState {
  return {
    ...createDefaultAppState(),
    boxes: [
      {
        id: 'b1',
        flavorId: 'f1',
        quantity: 5,
        location: { stack: 0, height: 0 },
        isOpen: false,
      },
    ],
    flavors: [{ id: 'f1', name: 'Chocolate', randomPool: 'caffeinated' }],
  };
}

let coordinator: typeof import('../../src/lib/sync-coordinator');

beforeEach(async () => {
  vi.resetModules();
  authChangeHandler = null;
  appStateStore = writable<AppState>(freshLocalState());
  pushFullState.mockClear();
  pullFullState.mockClear();
  peekRemoteState.mockClear();
  clearRemoteState.mockClear();
  supabaseAuthMock.signOut.mockClear();
  supabaseAuthMock.onAuthStateChange.mockClear();

  coordinator = await import('../../src/lib/sync-coordinator');
  coordinator.initializeSync();
  coordinator.setPushDelay(50);
});

async function fireAuthEvent(event: string, session: unknown = { user: { id: 'u1' } }) {
  expect(authChangeHandler).not.toBeNull();
  authChangeHandler!(event, session);
  // Let the promise chain inside the handler resolve.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('initializeSync', () => {
  it('is idempotent', () => {
    coordinator.initializeSync();
    coordinator.initializeSync();
    expect(supabaseAuthMock.onAuthStateChange).toHaveBeenCalledTimes(1);
  });
});

describe('SIGNED_OUT', () => {
  it('clears pending conflict and returns status to idle', async () => {
    await fireAuthEvent('SIGNED_OUT', null);
    expect(get(coordinator.syncStatus)).toBe('idle');
    expect(get(coordinator.pendingConflict)).toBeNull();
  });
});

describe('SIGNED_IN', () => {
  it('pushes when the server is empty and the local has data', async () => {
    appStateStore.set(populatedLocalState());
    peekRemoteState.mockResolvedValueOnce({
      exists: false,
      boxCount: 0,
      flavorCount: 0,
      eventCount: 0,
      updatedAt: null,
    });

    await fireAuthEvent('SIGNED_IN');

    expect(pushFullState).toHaveBeenCalled();
    expect(pullFullState).not.toHaveBeenCalled();
    expect(get(coordinator.syncStatus)).toBe('saved');
  });

  it('pulls when the server has data and the local is empty', async () => {
    const server = populatedLocalState();
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 1,
      flavorCount: 1,
      eventCount: 0,
      updatedAt: '2026-05-14T12:00:00.000Z',
    });
    pullFullState.mockResolvedValueOnce(server);

    await fireAuthEvent('SIGNED_IN');

    expect(pullFullState).toHaveBeenCalled();
    expect(pushFullState).not.toHaveBeenCalled();
    expect(get(appStateStore).boxes).toHaveLength(1);
    expect(get(coordinator.syncStatus)).toBe('saved');
  });

  it('surfaces a pending conflict when both sides have data', async () => {
    appStateStore.set(populatedLocalState());
    const summary = {
      exists: true,
      boxCount: 4,
      flavorCount: 2,
      eventCount: 12,
      updatedAt: '2026-05-13T08:00:00.000Z',
    };
    peekRemoteState.mockResolvedValueOnce(summary);

    await fireAuthEvent('SIGNED_IN');

    expect(get(coordinator.syncStatus)).toBe('conflict-pending');
    expect(get(coordinator.pendingConflict)).toEqual(summary);
    expect(pullFullState).not.toHaveBeenCalled();
    expect(pushFullState).not.toHaveBeenCalled();
  });

  it('records an error when peek throws', async () => {
    peekRemoteState.mockRejectedValueOnce(new FakeSyncError('boom'));
    await fireAuthEvent('SIGNED_IN');
    expect(get(coordinator.syncStatus)).toBe('error');
    expect(get(coordinator.lastError)).toBe('boom');
  });
});

describe('INITIAL_SESSION', () => {
  it('silently pulls when a session is hydrated from cache', async () => {
    pullFullState.mockResolvedValueOnce(populatedLocalState());
    await fireAuthEvent('INITIAL_SESSION');
    expect(pullFullState).toHaveBeenCalled();
    expect(peekRemoteState).not.toHaveBeenCalled();
    expect(get(coordinator.syncStatus)).toBe('saved');
  });

  it('does nothing when the hydrated session is null', async () => {
    await fireAuthEvent('INITIAL_SESSION', null);
    expect(pullFullState).not.toHaveBeenCalled();
  });
});

describe('resolveConflict', () => {
  beforeEach(async () => {
    appStateStore.set(populatedLocalState());
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 4,
      flavorCount: 2,
      eventCount: 12,
      updatedAt: '2026-05-13T08:00:00.000Z',
    });
    await fireAuthEvent('SIGNED_IN');
    expect(get(coordinator.pendingConflict)).not.toBeNull();
  });

  it('keep-local clears the server then pushes', async () => {
    await coordinator.resolveConflict('keep-local');
    expect(clearRemoteState).toHaveBeenCalled();
    expect(pushFullState).toHaveBeenCalled();
    expect(get(coordinator.pendingConflict)).toBeNull();
    expect(get(coordinator.syncStatus)).toBe('saved');
  });

  it('keep-server pulls and replaces local state', async () => {
    const server = populatedLocalState();
    pullFullState.mockResolvedValueOnce(server);
    await coordinator.resolveConflict('keep-server');
    expect(pullFullState).toHaveBeenCalled();
    expect(clearRemoteState).not.toHaveBeenCalled();
    expect(get(coordinator.pendingConflict)).toBeNull();
    expect(get(coordinator.syncStatus)).toBe('saved');
  });

  it('cancel signs the user out without touching server data', async () => {
    await coordinator.resolveConflict('cancel');
    expect(supabaseAuthMock.signOut).toHaveBeenCalled();
    expect(clearRemoteState).not.toHaveBeenCalled();
    expect(pushFullState).not.toHaveBeenCalled();
    expect(get(coordinator.pendingConflict)).toBeNull();
  });
});

describe('debounced push', () => {
  it('does not push when no session is active', async () => {
    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f1' }));
    await new Promise((r) => setTimeout(r, 80));
    expect(pushFullState).not.toHaveBeenCalled();
  });

  it('pushes once after the debounce delay when signed in', async () => {
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 0,
      flavorCount: 0,
      eventCount: 0,
      updatedAt: '2026-05-14T12:00:00.000Z',
    });
    pullFullState.mockResolvedValueOnce(freshLocalState());
    await fireAuthEvent('SIGNED_IN');
    pushFullState.mockClear();

    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f1' }));
    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f2' }));

    await new Promise((r) => setTimeout(r, 80));
    expect(pushFullState).toHaveBeenCalledTimes(1);
  });
});
