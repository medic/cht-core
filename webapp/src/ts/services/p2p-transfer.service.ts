import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { toBase64 } from '../base64';
import { BundleScope, OfflineDataBundleService, SealedBundle } from '@mm-services/offline-data-bundle.service';
import { BRIDGE_CHUNK_BYTES, P2pService } from '@mm-services/p2p.service';

/**
 * Hands this device's data to a paired relay.
 *
 * Each bundle is only counted as handed over once the native side says it reached the host, and
 * the export position moves bundle by bundle: a transfer that stops halfway leaves the rest to be
 * packed again next time rather than skipping it.
 */
@Injectable({ providedIn: 'root' })
export class P2pTransferService {
  constructor(
    private readonly bundleService: OfflineDataBundleService,
    private readonly p2pService: P2pService,
  ) { }

  /**
   * Packs and hands over everything the scope covers.
   *
   * @returns how many bundles the host took
   * @throws with a stable code the webapp can translate, never a message
   */
  async handOver(scope: BundleScope): Promise<number> {
    let delivered = 0;
    this.p2pService.transferStarted();
    try {
      for await (const bundle of this.bundleService.packBundles(this.bundleService.getPosition(scope))) {
        await this.deliver(bundle);
        this.bundleService.recordExported(bundle.lastSeq);
        delivered += 1;
        this.p2pService.transferProgress(delivered);
      }
    } catch (err) {
      this.p2pService.transferFinished(false);
      throw err;
    }
    this.p2pService.transferFinished(true);
    return delivered;
  }

  private async deliver(bundle: SealedBundle) {
    const id = this.p2pService.openBundle();
    if (!id) {
      throw new Error('bundle_open_failed');
    }

    // A bundle is megabytes, too much for one call, so it goes over in pieces. Native decodes
    // each piece on its own, so nothing here depends on how they line up.
    for (let offset = 0; offset < bundle.ciphertext.length; offset += BRIDGE_CHUNK_BYTES) {
      const chunk = bundle.ciphertext.subarray(offset, offset + BRIDGE_CHUNK_BYTES);
      if (!this.p2pService.writeBundle(id, toBase64(chunk))) {
        // Half a bundle is of no use to anyone: the next attempt packs the same data again from
        // the position this one never moved.
        this.p2pService.abortBundle(id);
        throw new Error('bundle_write_failed');
      }
    }

    // Subscribed before the send, because the native side can answer immediately.
    const result = firstValueFrom(this.p2pService.transferResult());
    this.p2pService.sendBundle(id, bundle.envelope, bundle.signature);

    const { ok, detail } = await result;
    if (!ok) {
      throw new Error(detail);
    }
  }
}
