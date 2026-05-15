/**
 * Unit tests for the sync module (push/pull/peek/clear).
 *
 * Mocks the local `lib/supabase` singleton with a hand-rolled stub that
 * records every call. Each test resets the stub via `installMockClient`.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { AppState } from '../../src/types/models';

// Hand-rolled query-builder stub. Records calls and returns the data the
// test seeded for the current chain. Supports the small slice of supabase-js
// the sync module actually uses.
interface TableCall {
  table: string;
  op: 'select' | 'upsert' | 'delete';
  args: unknown[];
  filter?: { column: string; value: unknown };
}

interface MockClient {
  auth: {
    getUser: Mock;
  };
  from: Mock;
  __calls: TableCall[];
  __seedSnapshot: (row: unknown) => void;
  __seedEvents: (rows: unknown[]) => void;
  __seedCount: (n: number) => void;
  __seedError: (op: 'snapshot' | 'events' | 'count' | 'upsert', err: unknown) => void;
  __seedUser: (id: string | null) => void;
}

let mock: MockClient;

function buildMockClient(): MockClient {
  const calls: TableCall[] = [];
  let snapshot: unknown = null;
  let snapshotError: unknown = null;
  let events: unknown[] = [];
  let eventsError: unknown = null;
  let count = 0;
  let countError: unknown = null;
  let upsertError: unknown = null;
  let userId: string | null = 'user-123';

  function from(table: string) {
    return {
      select(_cols: string, opts?: { count?: string; head?: boolean }) {
        const wantsCount = opts?.count === 'exact';
        return {
          eq(column: string, value: unknown) {
            const filter = { column, value };
            return {
              async maybeSingle() {
                calls.push({ table, op: 'select', args: [_cols], filter });
                if (table === 'app_states') {
                  return { data: snapshot, error: snapshotError };
                }
                return { data: null, error: null };
              },
              order() {
                return {
                  returns: () => ({
                    async then(resolve: (v: unknown) => unknown) {
                      calls.push({ table, op: 'select', args: [_cols], filter });
                      return resolve({ data: events, error: eventsError });
                    },
                  }),
                };
              },
              ...(wantsCount
                ? {
                    async then(resolve: (v: unknown) => unknown) {
                      calls.push({ table, op: 'select', args: [_cols], filter });
                      return resolve({ count, error: countError });
                    },
                  }
                : {}),
            };
          },
        };
      },
      async upsert(rows: unknown, _opts?: unknown) {
        calls.push({ table, op: 'upsert', args: [rows, _opts] });
        return { error: upsertError };
      },
      delete() {
        return {
          async eq(column: string, value: unknown) {
            calls.push({ table, op: 'delete', args: [], filter: { column, value } });
            return { error: null };
          },
        };
      },
    };
  }

  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: userId ? { id: userId } : null },
        error: null,
      })),
    },
    from: vi.fn(from),
    __calls: calls,
    __seedSnapshot(row) {
      snapshot = row;
    },
    __seedEvents(rows) {
      events = rows;
    },
    __seedCount(n) {
      count = n;
    },
    __seedError(op, err) {
      if (op === 'snapshot') snapshotError = err;
      if (op === 'events') eventsError = err;
      if (op === 'count') countError = err;
      if (op === 'upsert') upsertError = err;
    },
    __seedUser(id) {
      userId = id;
    },
  };
}

function installMockClient() {
  mock = buildMockClient();
  return mock;
}

vi.mock('../../src/lib/supabase', () => ({
  get supabase() {
    return mock;
  },
  isSyncConfigured: () => true,
}));

// Import after vi.mock so the mocked supabase is used.
const { pushFullState, pullFullState, peekRemoteState, clearRemoteState, SyncError } =
  await import('../../src/lib/sync');
const { createDefaultAppState } = await import('../../src/types/models');

const SAMPLE_STATE: AppState = {
  ...createDefaultAppState(),
  boxes: [
    {
      id: 'box1',
      flavorId: 'f1',
      quantity: 5,
      location: { stack: 0, height: 0 },
      isOpen: false,
    },
  ],
  flavors: [{ id: 'f1', name: 'Chocolate', randomPool: 'caffeinated' }],
  events: [
    {
      id: 'ev_1',
      timestamp: '2026-05-14T12:00:00.000Z',
      type: 'box_received',
      boxId: 'box1',
      flavorId: 'f1',
      quantity: 5,
      location: { stack: 0, height: 0 },
      isOpen: false,
    },
  ],
};

beforeEach(() => {
  installMockClient();
});

describe('peekRemoteState', () => {
  it('returns exists:false when no row is present', async () => {
    mock.__seedSnapshot(null);
    const summary = await peekRemoteState();
    expect(summary.exists).toBe(false);
    expect(summary.boxCount).toBe(0);
  });

  it('returns counts for boxes/flavors/events when present', async () => {
    mock.__seedSnapshot({
      boxes: [{}, {}, {}],
      flavors: [{}, {}],
      updated_at: '2026-05-14T12:00:00.000Z',
    });
    mock.__seedCount(7);
    const summary = await peekRemoteState();
    expect(summary).toEqual({
      exists: true,
      boxCount: 3,
      flavorCount: 2,
      eventCount: 7,
      updatedAt: '2026-05-14T12:00:00.000Z',
    });
  });

  it('throws SyncError when the snapshot read fails', async () => {
    mock.__seedError('snapshot', { message: 'boom' });
    await expect(peekRemoteState()).rejects.toBeInstanceOf(SyncError);
  });

  it('throws SyncError when the event count query fails', async () => {
    mock.__seedSnapshot({ boxes: [], flavors: [], updated_at: '2026-05-14T12:00:00.000Z' });
    mock.__seedError('count', { message: 'count failed' });
    await expect(peekRemoteState()).rejects.toBeInstanceOf(SyncError);
  });
});

describe('pullFullState', () => {
  it('returns null when no row exists', async () => {
    mock.__seedSnapshot(null);
    expect(await pullFullState()).toBeNull();
  });

  it('assembles AppState from snapshot + events', async () => {
    mock.__seedSnapshot({
      user_id: 'user-123',
      version: 3,
      boxes: SAMPLE_STATE.boxes,
      flavors: SAMPLE_STATE.flavors,
      favorite_flavor_id: null,
      settings: {},
      updated_at: '2026-05-14T12:00:00.000Z',
    });
    mock.__seedEvents([
      {
        id: 'ev_1',
        user_id: 'user-123',
        type: 'box_received',
        event_timestamp: '2026-05-14T12:00:00.000Z',
        payload: {
          boxId: 'box1',
          flavorId: 'f1',
          quantity: 5,
          location: { stack: 0, height: 0 },
          isOpen: false,
        },
      },
    ]);

    const state = await pullFullState();
    expect(state).not.toBeNull();
    expect(state!.boxes).toHaveLength(1);
    expect(state!.events).toHaveLength(1);
    expect(state!.events[0].type).toBe('box_received');
  });

  it('upgrades a v2 snapshot through the migration pipeline', async () => {
    mock.__seedSnapshot({
      user_id: 'user-123',
      version: 2,
      boxes: [],
      flavors: [],
      favorite_flavor_id: null,
      settings: {},
      updated_at: '2026-05-14T12:00:00.000Z',
    });
    mock.__seedEvents([]);

    const state = await pullFullState();
    expect(state).not.toBeNull();
    expect(state!.version).toBe(3);
    expect(state!.events).toEqual([]);
  });

  it('throws SyncError when the events query fails', async () => {
    mock.__seedSnapshot({
      user_id: 'user-123',
      version: 3,
      boxes: [],
      flavors: [],
      favorite_flavor_id: null,
      settings: {},
      updated_at: '2026-05-14T12:00:00.000Z',
    });
    mock.__seedError('events', { message: 'events query failed' });
    await expect(pullFullState()).rejects.toBeInstanceOf(SyncError);
  });

  it('throws SyncError when assembled state fails schema validation', async () => {
    mock.__seedSnapshot({
      user_id: 'user-123',
      version: 3,
      boxes: 'not an array',
      flavors: [],
      favorite_flavor_id: null,
      settings: {},
      updated_at: '2026-05-14T12:00:00.000Z',
    });
    mock.__seedEvents([]);
    await expect(pullFullState()).rejects.toBeInstanceOf(SyncError);
  });
});

describe('pushFullState', () => {
  it('upserts app_states and events', async () => {
    await pushFullState(SAMPLE_STATE);

    const upserts = mock.__calls.filter((c) => c.op === 'upsert');
    expect(upserts.map((u) => u.table)).toContain('app_states');
    expect(upserts.map((u) => u.table)).toContain('events');
  });

  it('skips the events upsert when state.events is empty', async () => {
    await pushFullState({ ...SAMPLE_STATE, events: [] });

    const tables = mock.__calls.filter((c) => c.op === 'upsert').map((c) => c.table);
    expect(tables).toContain('app_states');
    expect(tables).not.toContain('events');
  });

  it('throws SyncError when upsert fails', async () => {
    mock.__seedError('upsert', { message: 'fail' });
    await expect(pushFullState(SAMPLE_STATE)).rejects.toBeInstanceOf(SyncError);
  });

  it('throws SyncError when getUser returns no user', async () => {
    mock.__seedUser(null);
    await expect(pushFullState(SAMPLE_STATE)).rejects.toBeInstanceOf(SyncError);
  });

  it('splits event fields into payload column correctly', async () => {
    await pushFullState(SAMPLE_STATE);

    const eventUpsert = mock.__calls.find((c) => c.op === 'upsert' && c.table === 'events');
    expect(eventUpsert).toBeDefined();
    const rows = eventUpsert!.args[0] as Array<{
      id: string;
      type: string;
      event_timestamp: string;
      payload: Record<string, unknown>;
    }>;
    expect(rows[0].id).toBe('ev_1');
    expect(rows[0].type).toBe('box_received');
    expect(rows[0].event_timestamp).toBe('2026-05-14T12:00:00.000Z');
    // id/timestamp/type should NOT appear inside payload
    expect(rows[0].payload).not.toHaveProperty('id');
    expect(rows[0].payload).not.toHaveProperty('timestamp');
    expect(rows[0].payload).not.toHaveProperty('type');
    expect(rows[0].payload.boxId).toBe('box1');
  });
});

describe('clearRemoteState', () => {
  it('deletes events then app_state for the current user', async () => {
    await clearRemoteState();
    const deletes = mock.__calls.filter((c) => c.op === 'delete');
    expect(deletes).toHaveLength(2);
    expect(deletes[0].table).toBe('events');
    expect(deletes[1].table).toBe('app_states');
  });
});
