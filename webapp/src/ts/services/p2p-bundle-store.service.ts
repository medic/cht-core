import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { P2pService, ReceivedBundle } from '@mm-services/p2p.service';

// How much of a bundle to pull back across the bridge per call, matching the outbound chunk.
// The multiple of 3 matters here: it is what makes the base64 chunks joinable without re-encoding.
const CHUNK_BYTES = 3 * 128 * 1024;

/**
 * Holds the bundles this device is carrying for other people.
 *
 * The contents are encrypted to the server and this device has no key for them, so nothing here
 * opens a bundle, indexes it, or shows it: a bundle is a sealed parcel with an address on the
 * outside. They live in their own local database that is never replicated, because they are not
 * this user's documents and must not travel up as if they were.
 */
@Injectable({ providedIn: 'root' })
export class P2pBundleStoreService {
  constructor(
    private readonly dbService: DbService,
    private readonly p2pService: P2pService,
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
    for (const bundle of this.p2pService.receivedBundles()) {
      await this.take(bundle);
      collected += 1;
    }
    return collected;
  }

  private async take(bundle: ReceivedBundle) {
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
    this.p2pService.deleteBundle(bundle.id);
  }

  /**
   * Reads a bundle back across the bridge.
   *
   * Kept as base64 rather than decoded into bytes because that is what PouchDB stores an
   * attachment as, so decoding it here would only be undone on the way in.
   */
  private readPayload(bundle: ReceivedBundle): string {
    const chunks: string[] = [];
    for (let offset = 0; offset < bundle.bytes; offset += CHUNK_BYTES) {
      const chunk = this.p2pService.readBundle(bundle.id, offset, CHUNK_BYTES);
      if (!chunk) {
        throw new Error('bundle_read_failed');
      }
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

const PAYLOAD = 'payload';
