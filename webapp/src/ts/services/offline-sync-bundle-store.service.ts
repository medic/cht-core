import { Injectable } from '@angular/core';

import { DbService } from '@mm-services/db.service';
import { BRIDGE_CHUNK_BYTES, OfflineSyncService, ReceivedBundle } from '@mm-services/offline-sync.service';

export interface StoredBundle {
  _id: string;
  _rev?: string;
  envelope: string;
  signature: string;
  received_date: number;
  /** How many times the server has refused this bundle for a reason that might not last. */
  attempts?: number;
  /** Set once it is no longer worth offering. The bytes are kept: nothing else holds them. */
  undeliverable?: boolean;
}

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
  // Collections run one after another, so two never work from the same list of native bundles.
  private collecting: Promise<void> = Promise.resolve();

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
   */
  collect(): Promise<void> {
    const run = this.collecting.then(() => this.collectNow());
    this.collecting = run.catch(() => undefined);
    return run;
  }

  private async collectNow() {
    for (const bundle of this.offlineSyncService.receivedBundles()) {
      await this.take(bundle);
    }
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
   * Every bundle still worth offering to the server, oldest first.
   *
   * Oldest first because a relay carrying two bundles from one device carries them in sequence,
   * and the server has to see them in that order.
   */
  async pending(): Promise<StoredBundle[]> {
    const response = await this.db.allDocs({ include_docs: true });
    return response.rows
      .map(row => row.doc)
      .filter(doc => !doc.undeliverable)
      .sort((left, right) => left.received_date - right.received_date);
  }

  /** How many bundles this device is holding that the server would not take. */
  async undeliverable(): Promise<number> {
    const response = await this.db.allDocs({ include_docs: true });
    return response.rows.filter(row => row.doc.undeliverable).length;
  }

  /** Counts a refusal that might not last, and answers how many there have now been. */
  async recordAttempt(id: string): Promise<number> {
    const doc = await this.db.get(id);
    const attempts = (doc.attempts || 0) + 1;
    await this.db.put({ ...doc, attempts });
    return attempts;
  }

  /**
   * Stops offering a bundle, without throwing it away.
   *
   * The bytes stay on the phone because no one else has them: this device cannot read the bundle
   * to judge what is in it, so destroying it is not a call it is in any position to make.
   */
  async markUndeliverable(id: string, reason: number) {
    const doc = await this.db.get(id);
    await this.db.put({ ...doc, undeliverable: true, undeliverable_status: reason });
  }

  /** The sealed bytes of one stored bundle, ready to send on untouched. */
  getPayload(id: string): Promise<Blob> {
    return this.db.getAttachment(id, PAYLOAD);
  }

  /** Drops a bundle the server has taken. The caller already holds the doc, so no second read. */
  remove(bundle: StoredBundle) {
    return this.db.remove(bundle);
  }

  /** How many bundles this device is carrying. */
  /**
   * Counted from the documents rather than `info().doc_count`, which PouchDB does not increment for a
   * document written with an inline attachment, and every bundle has one.
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
