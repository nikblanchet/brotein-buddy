/**
 * Backup and restore utilities for BroteinBuddy application state.
 *
 * Pure functions (no DOM, no localStorage) for converting between AppState
 * and the JSON backup file format. The UI layer wraps these with Blob
 * downloads and File inputs.
 *
 * @module lib/backup
 */

import { isAppState, type AppState } from '../types/models';
import { migrateState } from './storage';

/**
 * Error thrown when a backup payload cannot be parsed or validated.
 *
 * The {@link BackupError.reason} field is a machine-readable code suitable
 * for selecting an inline error message in the UI. The {@link Error.message}
 * is a human-readable fallback.
 */
export class BackupError extends Error {
  readonly reason: BackupErrorReason;

  constructor(reason: BackupErrorReason, message: string) {
    super(message);
    this.name = 'BackupError';
    this.reason = reason;
  }
}

/** Categorized reasons {@link parseBackupJson} can fail. */
export type BackupErrorReason = 'empty' | 'malformed-json' | 'schema-invalid';

/**
 * Serializes application state to a JSON string suitable for a backup file.
 *
 * Pretty-printed with 2-space indentation so users can open backups in a
 * text editor and read them.
 *
 * @param state - The application state to serialize
 * @returns Indented JSON string
 */
export function exportStateAsJson(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Parses a backup file's contents into an AppState.
 *
 * Runs the same migration pipeline as {@link loadState}, so a v1 backup
 * loaded into a v2 app will be transparently upgraded. The result is
 * validated against {@link isAppState} before being returned.
 *
 * @param text - Raw text contents of a backup file
 * @returns A valid AppState at the current schema version
 * @throws {BackupError} If the text is empty, not JSON, or fails schema validation
 */
export function parseBackupJson(text: string): AppState {
  if (text.trim() === '') {
    throw new BackupError('empty', 'Backup file is empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BackupError('malformed-json', 'Backup file is not valid JSON.');
  }

  const migrated = migrateState(parsed);
  if (!isAppState(migrated)) {
    throw new BackupError(
      'schema-invalid',
      'Backup contents do not match the BroteinBuddy data format.'
    );
  }

  return migrated;
}

/**
 * Builds the suggested filename for a backup file.
 *
 * Format: `brotein-buddy-backup-YYYY-MM-DD.json` using the local date.
 *
 * @param date - Date to embed in the filename (defaults to now)
 * @returns Filename including the `.json` extension
 */
export function buildBackupFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `brotein-buddy-backup-${year}-${month}-${day}.json`;
}
