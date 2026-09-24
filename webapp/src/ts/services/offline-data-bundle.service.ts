import { Injectable } from '@angular/core';
// Both imported statically: a dynamic import becomes its own webpack chunk, which the service
// worker precaches, and the precached list is asserted in tests/e2e/default/service-worker.
// The `.js` suffix is required by @noble's exports map.
import { Encrypter } from 'age-encryption';
import { ed25519 } from '@noble/curves/ed25519.js';

import { toBase64 } from '../base64';
import { DbService } from '@mm-services/db.service';
import { DBSyncService, readOnlyFilter } from '@mm-services/db-sync.service';
import { DeviceKeyMaterial, DeviceKeyService } from '@mm-services/device-key.service';
import { SessionService } from '@mm-services/session.service';

// A bundle has to survive a transfer between two phones over a hotspot, and that link is the
// binding constraint, not the endpoint: the server accepts up to MAX_REQUEST_SIZE (32mb), but a
// body that large takes long enough on a poor link that the transfer is likely to break first.
const MAX_BUNDLE_BYTES = 8 * 1024 * 1024;

// How many changes to read from PouchDB at a time. Only bounds the read, not the bundle.
const CHANGES_PAGE_SIZE = 100;

// Kept alongside `medic-last-replicated-seq`, which is the same kind of value maintained by
// replication, so the two positions a bundle can be packed from are stored the same way.
const LAST_EXPORTED_SEQ_KEY = 'medic-last-exported-seq';

// Bundle numbering is per device and never restarts, because it is what lets a relay order
// bundles and spot a gap between them. A counter that began again at 1 each handover would give
// two different bundles the same number.
const LAST_BUNDLE_SEQ_KEY = 'medic-last-bundle-seq';

/**
 * How far back to pack.
 *
 * `export` sends what has changed since this device last handed data over, and trusts that the
 * handover arrived. `sync` sends everything the server is not known to have received, which
 * re-sends anything that was handed to a relay that never made it.
 */
export type BundleScope = 'export' | 'sync';

export interface SealedBundle {
  /** base64 of the utf8 envelope json. This is verbatim what the signature covers. */
  envelope: string;
  signature: string;
  ciphertext: Uint8Array;
  /**
   * The changes-feed position this bundle ends at. The caller advances its marker to this value
   * only once the bundle has actually been handed over, so an interrupted transfer resumes rather
   * than skipping what never left the device.
   */
  lastSeq: any;
}

/**
 * Packs the documents this device has changed into sealed bundles for a relay to carry.
 *
 * Each bundle is encrypted to the server and signed by this device, so the relay carrying it can
 * neither read it nor pass it off as someone else's. Nothing here talks to a relay: producing the
 * bundles and moving them are separate jobs, because the same bundles are meant to travel by other
 * transports later.
 */
@Injectable({ providedIn: 'root' })
export class OfflineDataBundleService {
  constructor(
    private readonly dbService: DbService,
    private readonly dbSyncService: DBSyncService,
    private readonly deviceKeyService: DeviceKeyService,
    private readonly sessionService: SessionService,
  ) { }

  /**
   * The changes-feed position a scope packs from.
   *
   * Neither position is ever an acknowledgement from the server that it holds the data: `sync` is
   * as far as replication got, and `export` only says a relay took the bundles, not that it
   * delivered them.
   */
  getPosition(scope: BundleScope): number {
    const replicated = this.dbSyncService.getLastReplicatedSeq();
    if (scope === 'sync') {
      return replicated;
    }
    // Whichever reached further. A device that has never exported, or that lost its local
    // storage, then packs from the sync position rather than from zero, which would re-send the
    // whole database, nearly all of which the server sent to this device in the first place.
    const exported = Number(window.localStorage.getItem(LAST_EXPORTED_SEQ_KEY));
    return exported > replicated ? exported : replicated;
  }

  /**
   * The number for the next bundle this device produces.
   *
   * Consumed whether or not the bundle is delivered: the number identifies a bundle, so reusing it
   * for a different one would be worse than leaving a gap where an undelivered bundle would have
   * been.
   */
  private nextBundleSeq(): number {
    const next = Number(window.localStorage.getItem(LAST_BUNDLE_SEQ_KEY)) + 1;
    window.localStorage.setItem(LAST_BUNDLE_SEQ_KEY, next.toString());
    return next;
  }

  /** Records how far a completed handover reached. Only ever moves forward. */
  recordExported(seq: number) {
    if (seq > this.getPosition('export')) {
      window.localStorage.setItem(LAST_EXPORTED_SEQ_KEY, seq.toString());
    }
  }

  /**
   * Yields sealed bundles covering everything changed after `sinceSeq`, oldest change first.
   *
   * Order matters and is this side's responsibility: the server authorizes docs a batch at a time,
   * and a batch can only grant access from the docs it holds plus what the server already has. A
   * report whose contact arrives in a later batch is dropped and never retried.
   *
   * Change order covers the common case, because the webapp writes a contact before any report
   * that needs it. It does NOT cover a contact edited after such a report: the feed carries one
   * entry per document at its latest position, so the edit moves the contact behind the report.
   * That case still depends on the server already holding the contact.
   *
   * @throws a stable code, `device_not_registered`, when this device has no keys
   */
  async *packBundles(sinceSeq: any): AsyncGenerator<SealedBundle> {
    const username = this.sessionService.userCtx()?.name;
    const keys = await this.deviceKeyService.getKeyMaterial();
    if (!username || !keys) {
      throw new Error('device_not_registered');
    }

    for await (const group of this.groupChanges(sinceSeq)) {
      yield await this.seal(username, keys, group);
    }
  }

  /**
   * Gathers changes into groups small enough to seal, each carrying the position it ends at.
   *
   * A group is closed by the line that would take it over the cap rather than by the one that
   * did, so a bundle stays within what a phone can hand over, unless a single document is larger
   * than the cap on its own.
   */
  private async *groupChanges(sinceSeq: any) {
    let lines: string[] = [];
    let bytes = 0;
    let lastSeq = sinceSeq;

    for await (const change of this.readChanges(sinceSeq)) {
      const line = JSON.stringify(change.doc) + '\n';
      if (isFull(bytes, line.length)) {
        yield { lines, lastSeq };
        lines = [];
        bytes = 0;
      }
      lines.push(line);
      bytes += line.length;
      lastSeq = change.seq;
    }

    if (lines.length) {
      yield { lines, lastSeq };
    }
  }

  /**
   * Reads the changes feed a page at a time, newest last.
   *
   * Paged rather than read whole because a device that has been offline for weeks has a delta
   * larger than the bundle it ends up in, and holding all of it to then cut it up defeats the
   * point of capping the bundle.
   */
  private async *readChanges(sinceSeq: any) {
    let since = sinceSeq;
    let page;
    do {
      page = await this.dbService.get().changes({
        since,
        include_docs: true,
        limit: CHANGES_PAGE_SIZE,
      });

      // The same filter replication uses to decide what may travel up. Settings, forms,
      // translations and design documents all come down from the server and would be refused on
      // the way back, so packing one only spends a bundle on data that cannot land.
      yield* page.results.filter(change => change.doc && readOnlyFilter(change.doc));
      since = page.last_seq;
    } while (page.results.length === CHANGES_PAGE_SIZE);
  }

  private async seal(
    username: string,
    keys: DeviceKeyMaterial,
    group: { lines: string[]; lastSeq: any },
  ): Promise<SealedBundle> {
    // `bundle_seq` is the only field the relay reads: it orders bundles and spots a gap without
    // opening them. Nothing here names what changed, or when, because the relay would see it.
    const envelopeBytes = new TextEncoder().encode(JSON.stringify({
      user: username,
      device_id: keys.deviceId,
      bundle_seq: this.nextBundleSeq(),
    }));

    const encrypter = new Encrypter();
    encrypter.addRecipient(keys.serverEncryptionPublicKey);

    return {
      envelope: toBase64(envelopeBytes),
      signature: toBase64(ed25519.sign(envelopeBytes, keys.signingPrivateKey)),
      ciphertext: await encrypter.encrypt(group.lines.join('')),
      lastSeq: group.lastSeq,
    };
  }
}

// A group always takes at least one line, so a single document larger than the cap becomes an
// oversized bundle of its own rather than one that can never be sent.
const isFull = (bytes: number, lineLength: number): boolean => {
  return bytes > 0 && bytes + lineLength > MAX_BUNDLE_BYTES;
};
