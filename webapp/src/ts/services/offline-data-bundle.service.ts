import { Injectable } from '@angular/core';
// Imported statically: a dynamic import becomes its own webpack chunk, which the service worker
// precaches, and the precached list is asserted in tests/e2e/default/service-worker.
import { Encrypter } from 'age-encryption';

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
  /** Documents too large to send this way, which the user has to be told about. */
  skipped: number;
}

/**
 * A position reached with nothing to send, because every document there was too large.
 *
 * Yielded rather than swallowed so the caller still moves its position past those documents and
 * still learns they exist: they cannot travel this way, and offering them again every time would
 * stall every later handover behind them.
 */
const NOTHING_TO_SEND = { envelope: '', signature: '', ciphertext: new Uint8Array() };

/**
 * Packs the documents this device has changed into sealed bundles for a relay to carry.
 *
 * Each bundle is encrypted to the server and signed by this device, so the relay carrying it can
 * neither read it nor pass it off as someone else's. Nothing here talks to a relay: producing the
 * bundles and moving them are separate jobs, because the same bundles are meant to travel by other
 * transports later.
 */
/**
 * SHA-256 of the age header of a ciphertext, base64, which is what the api checks the body against.
 *
 * The header is the text prefix up to and including the newline that ends the `--- <mac>` line.
 * Hashing only that is what keeps the check affordable on the api side: it can be verified off the
 * front of the stream, before any doc is written, and it still binds the whole body because the
 * file key is wrapped inside that header to the server's key.
 */
const headerHash = async (ciphertext: Uint8Array): Promise<string> => {
  const end = headerEnd(ciphertext);
  if (end === -1) {
    throw new Error('bundle_seal_failed');
  }
  return toBase64(new Uint8Array(await crypto.subtle.digest('SHA-256', ciphertext.subarray(0, end))));
};

/** Whether a "\n---" starts here, which is how the age header's last line begins. */
const startsTerminator = (bytes: Uint8Array, at: number): boolean => {
  return bytes[at] === 0x0a && bytes[at + 1] === 0x2d && bytes[at + 2] === 0x2d && bytes[at + 3] === 0x2d;
};

/** The byte after the next newline, or -1 when the line never ends. */
const afterNextNewline = (bytes: Uint8Array, from: number): number => {
  const lineEnd = bytes.indexOf(0x0a, from);
  return lineEnd === -1 ? -1 : lineEnd + 1;
};

/** The byte after the newline that ends the `--- <mac>` line, or -1 when there is no header. */
const headerEnd = (bytes: Uint8Array): number => {
  for (let i = 0; i < bytes.length - 3; i++) {
    if (startsTerminator(bytes, i)) {
      return afterNextNewline(bytes, i + 1);
    }
  }
  return -1;
};

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
      const bundle = await this.toBundle(username, keys, group);
      if (bundle) {
        yield bundle;
      }
    }
  }

  /** Null for a group that reached a position without producing anything worth reporting. */
  private async toBundle(
    username: string,
    keys: DeviceKeyMaterial,
    group: { lines: string[]; lastSeq: any; skipped: number },
  ): Promise<SealedBundle | null> {
    if (group.lines.length) {
      return this.seal(username, keys, group);
    }
    if (group.skipped) {
      return { ...NOTHING_TO_SEND, lastSeq: group.lastSeq, skipped: group.skipped };
    }
    return null;
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
    let skipped = 0;
    let lastSeq = sinceSeq;

    for await (const change of this.readChanges(sinceSeq)) {
      const line = JSON.stringify(change.doc) + '\n';

      if (isTooLarge(line.length)) {
        skipped += 1;
        lastSeq = change.seq;
        continue;
      }

      if (isFull(bytes, line.length)) {
        yield { lines, lastSeq, skipped };
        lines = [];
        bytes = 0;
        skipped = 0;
      }
      lines.push(line);
      bytes += line.length;
      // Only once the line is in: a bundle must never claim a position it does not cover, or a
      // transfer that stops here would skip whatever sits between the two.
      lastSeq = change.seq;
    }

    // Always: an empty one is discarded by the caller, which already has to tell a sealed group
    // from a skipped one.
    yield { lines, lastSeq, skipped };
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
        // Bytes, not stubs. The changes feed hands back attachment metadata only, and CouchDB
        // rejects the WHOLE write with a 412 when it is given a stub whose bytes it does not
        // have, so one photo would take a bundle down rather than arrive without its image.
        // Inlining them is what `sentinel/src/lib/archiving.js` and `replication.service.ts` do.
        attachments: true,
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
    group: { lines: string[]; lastSeq: any; skipped: number },
  ): Promise<SealedBundle> {
    // Encrypted before the envelope is built, because the envelope has to carry a hash of this
    // ciphertext's age header. That is what ties the signature to the body: without it the
    // signature says who sent a bundle but not what is in it.
    const encrypter = new Encrypter();
    encrypter.addRecipient(keys.serverEncryptionPublicKey);
    const ciphertext = await encrypter.encrypt(group.lines.join(''));

    // `bundle_seq` is the only field the relay reads: it orders bundles and spots a gap without
    // opening them. Nothing here names what changed, or when, because the relay would see it.
    const envelopeBytes = new TextEncoder().encode(JSON.stringify({
      user: username,
      device_id: keys.deviceId,
      bundle_seq: this.nextBundleSeq(),
      payload_header_sha256: await headerHash(ciphertext),
    }));

    return {
      envelope: toBase64(envelopeBytes),
      signature: toBase64(new Uint8Array(
        await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.signingPrivateKey, envelopeBytes)
      )),
      ciphertext,
      lastSeq: group.lastSeq,
      skipped: group.skipped,
    };
  }
}

const isFull = (bytes: number, lineLength: number): boolean => {
  return bytes > 0 && bytes + lineLength > MAX_BUNDLE_BYTES;
};

/**
 * A document that cannot fit a bundle on its own cannot be sent this way at all.
 *
 * An attachment may be up to 30mb, which is over the endpoint's limit once encoded, so there is no
 * bundle that could carry it. Skipping keeps the rest moving, and the caller tells the user rather
 * than dropping it in silence.
 */
const isTooLarge = (lineLength: number): boolean => lineLength > MAX_BUNDLE_BYTES;
