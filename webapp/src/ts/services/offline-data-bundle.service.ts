import { Injectable } from '@angular/core';
// Both imported statically: a dynamic import becomes its own webpack chunk, which the service
// worker precaches, and the precached list is asserted in tests/e2e/default/service-worker.
// The `.js` suffix is required by @noble's exports map.
import { Encrypter } from 'age-encryption';
import { ed25519 } from '@noble/curves/ed25519.js';

import { DbService } from '@mm-services/db.service';
import { DBSyncService } from '@mm-services/db-sync.service';
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
  docCount: number;
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
   * report whose contact arrives in a later batch is dropped and never retried. The webapp always
   * writes a contact before a report that needs it, so replaying the changes feed in order is what
   * keeps them together.
   *
   * @throws if the device has no keys, which means it was never registered to send bundles
   */
  async *packBundles(sinceSeq: any): AsyncGenerator<SealedBundle> {
    const username = this.sessionService.userCtx()?.name;
    const keys = await this.deviceKeyService.getKeyMaterial();
    if (!username || !keys) {
      throw new Error('This device is not registered to send offline data bundles.');
    }

    let bundleSeq = 1;
    for await (const group of this.groupChanges(sinceSeq)) {
      yield await this.seal(username, keys, bundleSeq++, group.lines, group.lastSeq);
    }
  }

  /**
   * Gathers changes into groups small enough to seal, each carrying the position it ends at.
   *
   * A group is closed by the line that would take it over the cap rather than by the one that
   * did, so a bundle is never larger than a phone can hand over.
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

      yield* page.results.filter(change => change.doc);
      since = page.last_seq;
    } while (page.results.length === CHANGES_PAGE_SIZE);
  }

  private async seal(
    username: string,
    keys: DeviceKeyMaterial,
    bundleSeq: number,
    lines: string[],
    lastSeq: any,
  ): Promise<SealedBundle> {
    // `bundle_seq` is the only field the relay reads: it orders bundles and spots a gap without
    // opening them. Nothing here names what changed, or when, because the relay would see it.
    const envelopeBytes = new TextEncoder().encode(JSON.stringify({
      user: username,
      device_id: keys.deviceId,
      bundle_seq: bundleSeq,
    }));

    const encrypter = new Encrypter();
    encrypter.addRecipient(keys.serverEncryptionPublicKey);

    return {
      envelope: toBase64(envelopeBytes),
      signature: toBase64(ed25519.sign(envelopeBytes, keys.signingPrivateKey)),
      ciphertext: await encrypter.encrypt(lines.join('')),
      lastSeq,
      docCount: lines.length,
    };
  }
}

const isFull = (bytes: number, lineLength: number): boolean => {
  return bytes > 0 && bytes + lineLength > MAX_BUNDLE_BYTES;
};

const toBase64 = (bytes: Uint8Array): string => {
  return window.btoa(Array.from(bytes, byte => String.fromCodePoint(byte)).join(''));
};
