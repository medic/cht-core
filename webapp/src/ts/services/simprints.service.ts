import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SimprintsService {
  private currentRequest:any = {};
  private SP_ID_MASK = 0xFFFFF8;
  private MAX_TIER = 3;
  private resolvePromise;

  private request(endpoint) {
    // eslint-disable-next-line no-bitwise
    const requestId = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER) & this.SP_ID_MASK;
    this.currentRequest = {
      id: requestId,
      deferred: new Promise((resolve) => {
        this.resolvePromise = resolve;
      }),
    };
    // `call` needed to specify context: #3511
    endpoint.call(window.medicmobile_android, this.currentRequest.id);
    return this.currentRequest.deferred;
  }

  private isCurrentRequest(requestId) {
    return this.currentRequest.id === requestId;
  }

  private parseTierNumber(tier) {
    return Number.parseInt(tier.split('_')[1]);
  }

  enabled() {
    try {
      return !!(
        window.medicmobile_android &&
        typeof window.medicmobile_android.simprints_available === 'function' &&
        window.medicmobile_android.simprints_available()
      );
    } catch (err) {
      console.error(err);
      return false;
    }
  }
  
  register() {
    return this.request(window.medicmobile_android.simprints_reg);
  }

  registerResponse(requestId, response) {
    if (this.isCurrentRequest(requestId)) {
      this.resolvePromise(response.id);
    }
  }

  identify() {
    return this.request(window.medicmobile_android.simprints_ident);
  }

  identifyResponse(requestId, identities) {
    if (this.isCurrentRequest(requestId)) {
      identities.forEach((identity) => {
        // Tier from TIER_1 (best) to TIER_5 (worst)
        identity.tierNumber = this.parseTierNumber(identity.tier);
      });
      identities = identities.filter((identity) => {
        return identity.tierNumber <= this.MAX_TIER;
      });
      this.resolvePromise(identities);
    }
  }
}
