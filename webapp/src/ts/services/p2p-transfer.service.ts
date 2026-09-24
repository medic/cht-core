import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { BundleScope, OfflineDataBundleService, SealedBundle } from '@mm-services/offline-data-bundle.service';
import { P2pService } from '@mm-services/p2p.service';

// How much of a bundle to push across the bridge per call. A bundle is megabytes and a single
// call that size risks the WebView, so it goes over in pieces. A multiple of 3 so each chunk
// base64-encodes without padding, which is what lets the chunks be joined again on the way back.
const CHUNK_BYTES = 3 * 128 * 1024;

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
    for await (const bundle of this.bundleService.packBundles(this.bundleService.getPosition(scope))) {
      await this.deliver(bundle);
      this.bundleService.recordExported(bundle.lastSeq);
      delivered += 1;
    }
    return delivered;
  }

  private async deliver(bundle: SealedBundle) {
    const id = this.p2pService.openBundle();
    if (!id) {
      throw new Error('bundle_open_failed');
    }

    for (let offset = 0; offset < bundle.ciphertext.length; offset += CHUNK_BYTES) {
      const chunk = bundle.ciphertext.subarray(offset, offset + CHUNK_BYTES);
      if (!this.p2pService.writeBundle(id, toBase64(chunk))) {
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

const toBase64 = (bytes: Uint8Array): string => {
  return window.btoa(Array.from(bytes, byte => String.fromCodePoint(byte)).join(''));
};
