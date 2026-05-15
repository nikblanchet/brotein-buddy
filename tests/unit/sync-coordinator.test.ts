/**
 * Unit tests for the sync coordinator (PR 3 architecture).
 *
 * Mocks the supabase client, the inner sync module, the realtime module,
 * and the stores. Asserts the state machine: which auth event triggers
 * which reconciliation path, the meta-aware push/pull/conflict decision,
 * offline-mode entry/exit, backoff retry, and the realtime subscription
 * lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get, writable, type Writable } from 'svelte/store';
import type { AppState } from '../../src/types/models';

let authChangeHandler: ((event: string, session: unknown) => void) | null = null;
let appStateStore: Writable<AppState>;

const pushFullState = vi.fn(async () => '2026-05-14T12:00:00.000Z');
const pullFullState = vi.fn(async () => null as AppState | null);
const peekRemoteState = vi.fn(async () => ({
  exists: false,
  boxCount: 0,
  flavorCount: 0,
  eventCount: 0,
  updatedAt: null as string | null,
}));
const clearRemoteState = vi.fn(async () => undefined);

const realtimeUnsubscribe = vi.fn(async () => undefined);
const subscribeToRemoteChanges = vi.fn((_userId: string, _onChange: (reason: string) => void) => ({
  unsubscribe: realtimeUnsubscribe,
}));

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

vi.mock('../../src/lib/realtime', () => ({
  subscribeToRemoteChanges: (...args: unknown[]) =>
    subscribeToRemoteChanges(...(args as [string, (reason: string) => void])),
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

afterEach(() => {
  // Clear any pending timers / listeners left by the coordinator under
  // test before vi.resetModules tosses the module reference. Without
  // this, stale setTimeouts fire into the next test's mocked
  // pushFullState and pollute call counts.
  coordinator?.__resetForTests?.();
});

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  authChangeHandler = null;
  appStateStore = writable<AppState>(freshLocalState());
  pushFullState.mockClear();
  pushFullState.mockResolvedValue('2026-05-14T12:00:00.000Z');
  pullFullState.mockClear();
  peekRemoteState.mockClear();
  peekRemoteState.mockResolvedValue({
    exists: false,
    boxCount: 0,
    flavorCount: 0,
    eventCount: 0,
    updatedAt: null,
  });
  clearRemoteState.mockClear();
  supabaseAuthMock.signOut.mockClear();
  supabaseAuthMock.onAuthStateChange.mockClear();
  subscribeToRemoteChanges.mockClear();
  realtimeUnsubscribe.mockClear();

  coordinator = await import('../../src/lib/sync-coordinator');
  coordinator.initializeSync();
  coordinator.setPushDelay(50);
});

async function fireAuthEvent(event: string, session: unknown = { user: { id: 'u1' } }) {
  expect(authChangeHandler).not.toBeNull();
  authChangeHandler!(event, session);
  // Drain microtasks so the chained handler completes.
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('initializeSync', () => {
  it('is idempotent', () => {
    coordinator.initializeSync();
    coordinator.initializeSync();
    expect(supabaseAuthMock.onAuthStateChange).toHaveBeenCalledTimes(1);
  });
});

describe('SIGNED_OUT', () => {
  it('clears conflict, sync meta, and unsubscribes realtime', async () => {
    // Set up: sign in first so realtime is active and meta exists.
    appStateStore.set(populatedLocalState());
    await fireAuthEvent('SIGNED_IN');
    expect(subscribeToRemoteChanges).toHaveBeenCalled();

    await fireAuthEvent('SIGNED_OUT', null);

    expect(get(coordinator.syncStatus)).toBe('idle');
    expect(get(coordinator.pendingConflict)).toBeNull();
    expect(get(coordinator.pendingChanges)).toBe(false);
    expect(realtimeUnsubscribe).toHaveBeenCalled();
    expect(localStorage.getItem('BROTEINBUDDY_SYNC_META')).toBeNull();
  });
});

describe('SIGNED_IN — reconciles based on local + remote', () => {
  it('pushes when local has data and the server is empty', async () => {
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
    expect(get(coordinator.pendingChanges)).toBe(false);
  });

  it('pulls when local is empty and server has data', async () => {
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

  it('enters offline mode when peek throws', async () => {
    peekRemoteState.mockRejectedValueOnce(new FakeSyncError('network down'));
    await fireAuthEvent('SIGNED_IN');
    expect(get(coordinator.syncStatus)).toBe('offline');
    expect(get(coordinator.lastError)).toBe('network down');
  });

  it('subscribes to realtime after a successful reconcile', async () => {
    await fireAuthEvent('SIGNED_IN');
    expect(subscribeToRemoteChanges).toHaveBeenCalledWith('u1', expect.any(Function));
  });
});

describe('INITIAL_SESSION — meta-aware reconcile', () => {
  it('no-ops when local is clean and server has not changed since last sync', async () => {
    // Seed meta with "last synced at 2026-05-14".
    localStorage.setItem(
      'BROTEINBUDDY_SYNC_META',
      JSON.stringify({
        dirty: false,
        lastServerUpdatedAt: '2026-05-14T12:00:00.000Z',
        lastSyncedAt: '2026-05-14T12:00:00.000Z',
      })
    );
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 1,
      flavorCount: 0,
      eventCount: 0,
      updatedAt: '2026-05-14T12:00:00.000Z',
    });

    await fireAuthEvent('INITIAL_SESSION');

    expect(pullFullState).not.toHaveBeenCalled();
    expect(pushFullState).not.toHaveBeenCalled();
    expect(get(coordinator.syncStatus)).toBe('saved');
  });

  it('pushes when local has unsynced edits (Burning Man recovery)', async () => {
    // Pretend the user edited offline: meta says dirty=true, lastServerUpdatedAt
    // is older than what's currently on the server (server unchanged).
    localStorage.setItem(
      'BROTEINBUDDY_SYNC_META',
      JSON.stringify({
        dirty: true,
        lastServerUpdatedAt: '2026-05-04T08:00:00.000Z',
        lastSyncedAt: '2026-05-04T08:00:00.000Z',
      })
    );
    appStateStore.set(populatedLocalState());
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 0,
      flavorCount: 0,
      eventCount: 0,
      updatedAt: '2026-05-04T08:00:00.000Z',
    });

    await fireAuthEvent('INITIAL_SESSION');

    expect(pushFullState).toHaveBeenCalled();
    expect(pullFullState).not.toHaveBeenCalled();
  });

  it('pulls when only the server has changed since last sync', async () => {
    localStorage.setItem(
      'BROTEINBUDDY_SYNC_META',
      JSON.stringify({
        dirty: false,
        lastServerUpdatedAt: '2026-05-13T08:00:00.000Z',
        lastSyncedAt: '2026-05-13T08:00:00.000Z',
      })
    );
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 1,
      flavorCount: 1,
      eventCount: 0,
      updatedAt: '2026-05-14T12:00:00.000Z',
    });
    pullFullState.mockResolvedValueOnce(populatedLocalState());

    await fireAuthEvent('INITIAL_SESSION');

    expect(pullFullState).toHaveBeenCalled();
    expect(pushFullState).not.toHaveBeenCalled();
  });

  it('surfaces conflict when both meta.dirty AND server changed', async () => {
    localStorage.setItem(
      'BROTEINBUDDY_SYNC_META',
      JSON.stringify({
        dirty: true,
        lastServerUpdatedAt: '2026-05-04T08:00:00.000Z',
        lastSyncedAt: '2026-05-04T08:00:00.000Z',
      })
    );
    appStateStore.set(populatedLocalState());
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 4,
      flavorCount: 2,
      eventCount: 12,
      updatedAt: '2026-05-14T12:00:00.000Z',
    });

    await fireAuthEvent('INITIAL_SESSION');

    expect(get(coordinator.syncStatus)).toBe('conflict-pending');
    expect(pullFullState).not.toHaveBeenCalled();
    expect(pushFullState).not.toHaveBeenCalled();
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
    pullFullState.mockResolvedValueOnce(populatedLocalState());
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
    // Bring the coordinator to a synced state first.
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

  it('marks meta dirty on local mutation', async () => {
    await fireAuthEvent('SIGNED_IN');
    pushFullState.mockClear();

    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f1' }));

    const meta = JSON.parse(localStorage.getItem('BROTEINBUDDY_SYNC_META') ?? '{}');
    expect(meta.dirty).toBe(true);
    expect(get(coordinator.pendingChanges)).toBe(true);
  });
});

describe('offline mode + backoff', () => {
  it('enters offline mode when push fails', async () => {
    await fireAuthEvent('SIGNED_IN');
    const callsAfterSignIn = pushFullState.mock.calls.length;
    pushFullState.mockImplementationOnce(async () => {
      throw new FakeSyncError('network down');
    });

    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f1' }));
    await new Promise((r) => setTimeout(r, 80));

    expect(pushFullState.mock.calls.length).toBeGreaterThan(callsAfterSignIn);
    expect(get(coordinator.syncStatus)).toBe('offline');
  });

  it('does not reset push debounce while offline (avoids battery drain)', async () => {
    await fireAuthEvent('SIGNED_IN');
    pushFullState.mockClear();
    pushFullState.mockImplementationOnce(async () => {
      throw new FakeSyncError('network down');
    });

    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f1' }));
    await new Promise((r) => setTimeout(r, 80));
    expect(pushFullState).toHaveBeenCalledTimes(1);

    pushFullState.mockClear();
    // While offline, additional mutations should NOT trigger immediate pushes.
    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f2' }));
    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f3' }));
    await new Promise((r) => setTimeout(r, 80));

    expect(pushFullState).not.toHaveBeenCalled();
  });

  it('window online event triggers a retry and exits offline mode on success', async () => {
    await fireAuthEvent('SIGNED_IN');
    pushFullState.mockImplementationOnce(async () => {
      throw new FakeSyncError('network down');
    });

    appStateStore.update((state) => ({ ...state, favoriteFlavorId: 'f1' }));
    await new Promise((r) => setTimeout(r, 80));
    expect(get(coordinator.syncStatus)).toBe('offline');

    pushFullState.mockResolvedValueOnce('2026-05-14T13:00:00.000Z');
    window.dispatchEvent(new Event('online'));
    await new Promise((r) => setTimeout(r, 30));

    expect(get(coordinator.syncStatus)).toBe('saved');
  });
});

describe('realtime', () => {
  it('subscribes with the user id from the session', async () => {
    await fireAuthEvent('SIGNED_IN', { user: { id: 'specific-user-id' } });
    expect(subscribeToRemoteChanges).toHaveBeenCalledWith('specific-user-id', expect.any(Function));
  });

  it('does not re-subscribe on a second SIGNED_IN for the same session', async () => {
    await fireAuthEvent('SIGNED_IN');
    await fireAuthEvent('INITIAL_SESSION');
    expect(subscribeToRemoteChanges).toHaveBeenCalledTimes(1);
  });

  it('remote-change callback triggers a reconcile', async () => {
    await fireAuthEvent('SIGNED_IN');
    // Grab the onChange callback the coordinator registered.
    const onChange = subscribeToRemoteChanges.mock.calls[0]?.[1];
    expect(onChange).toBeDefined();

    peekRemoteState.mockClear();
    peekRemoteState.mockResolvedValueOnce({
      exists: true,
      boxCount: 1,
      flavorCount: 0,
      eventCount: 1,
      updatedAt: '2026-05-14T13:00:00.000Z',
    });
    pullFullState.mockResolvedValueOnce(populatedLocalState());

    onChange?.('event-insert');
    await new Promise((r) => setTimeout(r, 30));

    expect(peekRemoteState).toHaveBeenCalled();
  });
});
