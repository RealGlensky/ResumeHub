import { Client } from '@replit/object-storage';
import type { Readable } from 'stream';

// Constructed lazily: the constructor kicks off a background request to
// Replit's storage sidecar, so building it at import time would attempt
// that on every server boot even when nothing uploads/downloads a file.
let storageClient: Client | null = null;
function getClient(): Client {
  if (!storageClient) storageClient = new Client();
  return storageClient;
}

export async function uploadBuffer(objectName: string, buffer: Buffer): Promise<void> {
  const result = await getClient().uploadFromBytes(objectName, buffer);
  if (!result.ok) {
    throw new Error(`Failed to upload ${objectName}: ${result.error.message}`);
  }
}

export function downloadStream(objectName: string): Readable {
  return getClient().downloadAsStream(objectName);
}

export async function deleteObject(objectName: string): Promise<void> {
  const result = await getClient().delete(objectName, { ignoreNotFound: true });
  if (!result.ok) {
    throw new Error(`Failed to delete ${objectName}: ${result.error.message}`);
  }
}
