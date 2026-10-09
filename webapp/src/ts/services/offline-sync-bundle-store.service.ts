import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { BRIDGE_CHUNK_BYTES, OfflineSyncService, ReceivedBundle } from '@mm-services/offline-sync.service';

/**
 * Holds the bundles this device is carrying for other people.
 *
 * The contents are encrypted to the server and this device has no key for them, so nothing here
 * opens a bundle, indexes it, or shows it: a bundle is a sealed parcel with an address on the
 * outside. They live in their own local database that is never replicated, because they are not
 * this user's documents and would otherwise travel up as if they were.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncBundleStoreService {
  constructor(
    private readonly dbService: DbService,
    private readonly offlineSyncService: OfflineSyncService,
  ) { }

  private get db() {
    return this.dbService.get({ remote: false, bundles: true });
  }

  /**
   * Takes every bundle the native side is holding into the store.
   *
   * A bundle is only dropped from native storage once it is safely stored, so a failure part way
   * leaves it to be collected again rather than losing it.
   *
   * @returns how many bundles were taken
   */
  async collect(): Promise<number> {
    let collected = 0;
    for (const bundle of this.offlineSyncService.receivedBundles()) {
      await this.take(bundle);
      collected += 1;
    }
    return collected;
  }

  private async take(bundle: ReceivedBundle) {
    try {
      await this.db.put({
        _id: bundle.id,
        envelope: bundle.envelope,
        signature: bundle.signature,
        received_date: Date.now(),
        _attachments: {
          [PAYLOAD]: {
            content_type: 'application/octet-stream',
            data: this.readPayload(bundle),
          },
        },
      });
    } catch (err: any) {
      // Already stored. Taking the same bundle twice is normal: the native copy is only dropped
      // after this write, so a stop between the two leaves it to be taken again. Failing here would
      // stop every bundle behind this one from being taken.
      if (err.status !== 409) {
        throw err;
      }
    }
    this.offlineSyncService.deleteBundle(bundle.id);
  }

  /**
   * How many bundles this device is carrying, counted from the documents rather than
   * `info().doc_count`, which PouchDB does not increment for a document written with an inline
   * attachment, and every bundle has one.
   */
  async count(): Promise<number> {
    const response = await this.db.allDocs();
    return response.rows.length;
  }

  /**
   * Reads a bundle back across the bridge.
   *
   * Kept as base64 rather than decoded into bytes because that is what PouchDB stores an
   * attachment as, so decoding it here would only be undone on the way in. Joining the chunks as
   * text is only sound because each one covers a whole number of 3-byte groups, so none of them
   * pads except the last.
   */
  private readPayload(bundle: ReceivedBundle): string {
    const chunks: string[] = [];
    for (let offset = 0; offset < bundle.bytes; offset += BRIDGE_CHUNK_BYTES) {
      const chunk = this.offlineSyncService.readBundle(bundle.id, offset, BRIDGE_CHUNK_BYTES);
      if (!chunk) {
        throw new Error('bundle_read_failed');
      }
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

const PAYLOAD = 'payload';
