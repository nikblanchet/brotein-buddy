/**
 * Unit tests for the realtime subscription module.
 *
 * Mocks the supabase client's `channel()` API and verifies that:
 *   - The subscription is bound to the correct user_id filter on both
 *     events and app_states.
 *   - The onChange callback receives the right reason for each broadcast.
 *   - The unsubscribe handle is wired to `removeChannel`.
 *   - A missing supabase client returns a no-op subscription instead of
 *     throwing.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

interface ChannelHandler {
  event: string;
  table: string;
  filter: string;
  callback: (payload: unknown) => void;
}

interface MockChannel {
  handlers: ChannelHandler[];
  on: Mock;
  subscribe: Mock;
}

let mockChannel: MockChannel | null = null;
let supabaseValue: unknown;
const removeChannel = vi.fn(async () => undefined);

vi.mock('../../src/lib/supabase', () => ({
  get supabase() {
    return supabaseValue;
  },
  isSyncConfigured: () => supabaseValue !== null,
}));

function makeMockClient() {
  removeChannel.mockClear();
  return {
    channel(_name: string): MockChannel {
      mockChannel = {
        handlers: [],
        on: vi.fn(function (
          this: MockChannel,
          _type: string,
          config: { event: string; table: string; filter: string },
          callback: (payload: unknown) => void
        ) {
          this.handlers.push({
            event: config.event,
            table: config.table,
            filter: config.filter,
            callback,
          });
          return this;
        }),
        subscribe: vi.fn(function (this: MockChannel, _statusCallback?: unknown) {
          return this;
        }),
      };
      // The `on()` chain returns `this` so we need to bind the mock channel
      // before exposing its methods.
      mockChannel.on = mockChannel.on.bind(mockChannel);
      mockChannel.subscribe = mockChannel.subscribe.bind(mockChannel);
      return mockChannel;
    },
    removeChannel,
  };
}

const { subscribeToRemoteChanges } = await import('../../src/lib/realtime');

beforeEach(() => {
  mockChannel = null;
  supabaseValue = makeMockClient();
  removeChannel.mockClear();
});

describe('subscribeToRemoteChanges', () => {
  it('registers handlers for events INSERT and app_states UPDATE filtered by user_id', () => {
    subscribeToRemoteChanges('user-42', () => {});

    expect(mockChannel).not.toBeNull();
    expect(mockChannel!.handlers).toHaveLength(2);

    const eventsHandler = mockChannel!.handlers.find((h) => h.table === 'events');
    expect(eventsHandler).toBeDefined();
    expect(eventsHandler!.event).toBe('INSERT');
    expect(eventsHandler!.filter).toBe('user_id=eq.user-42');

    const snapshotHandler = mockChannel!.handlers.find((h) => h.table === 'app_states');
    expect(snapshotHandler).toBeDefined();
    expect(snapshotHandler!.event).toBe('UPDATE');
    expect(snapshotHandler!.filter).toBe('user_id=eq.user-42');
  });

  it('calls onChange with "event-insert" when an events row arrives', () => {
    const onChange = vi.fn();
    subscribeToRemoteChanges('user-1', onChange);

    const eventsHandler = mockChannel!.handlers.find((h) => h.table === 'events');
    eventsHandler!.callback({ new: { id: 'ev_1' } });

    expect(onChange).toHaveBeenCalledWith('event-insert');
  });

  it('calls onChange with "snapshot-update" when an app_states row updates', () => {
    const onChange = vi.fn();
    subscribeToRemoteChanges('user-1', onChange);

    const snapshotHandler = mockChannel!.handlers.find((h) => h.table === 'app_states');
    snapshotHandler!.callback({ new: { updated_at: '2026-05-14T12:00:00.000Z' } });

    expect(onChange).toHaveBeenCalledWith('snapshot-update');
  });

  it('unsubscribe() forwards to supabase.removeChannel', async () => {
    const sub = subscribeToRemoteChanges('user-1', () => {});
    const channel = mockChannel;

    await sub.unsubscribe();

    expect(removeChannel).toHaveBeenCalledWith(channel);
  });

  it('returns a no-op subscription when supabase is null', async () => {
    supabaseValue = null;
    const onChange = vi.fn();
    const sub = subscribeToRemoteChanges('user-1', onChange);

    await expect(sub.unsubscribe()).resolves.toBeUndefined();
    expect(onChange).not.toHaveBeenCalled();
  });
});
