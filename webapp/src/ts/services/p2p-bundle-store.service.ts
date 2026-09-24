import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { BRIDGE_CHUNK_BYTES, P2pService, ReceivedBundle } from '@mm-services/p2p.service';

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

  /** How many bundles this device is carrying. */
  async count(): Promise<number> {
    const response = await this.db.info();
    return response.doc_count;
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
      const chunk = this.p2pService.readBundle(bundle.id, offset, BRIDGE_CHUNK_BYTES);
      if (!chunk) {
        throw new Error('bundle_read_failed');
      }
      chunks.push(chunk);
    }
    return chunks.join('');
  }
}

const PAYLOAD = 'payload';
