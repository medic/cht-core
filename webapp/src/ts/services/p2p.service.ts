import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';


export interface P2pResult {
  ok: boolean;
  /**
   * On success, what the result means for that call: the pairing payload when hosting starts, or
   * the host's label when joining succeeds. On failure, a stable code with a translation key,
   * never a message to show directly.
   */
  detail: string;
}

/**
 * Drives a peer-to-peer pairing session through the native bridge.
 *
 * Two roles, granted separately, because a device can legitimately have one and not the other:
 * a supervisor relays other people's data to the server, a CHW sends their own. Whether the
 * device can technically do either is a second question the bridge answers, since hosting needs a
 * newer Android than joining.
 */
@Injectable({ providedIn: 'root' })
export class P2pService {
  private readonly hostingSubject = new Subject<P2pResult>();
  private readonly pairingSubject = new Subject<P2pResult>();
  private readonly permissionsSubject = new Subject<boolean>();

  constructor(private readonly authService: AuthService) { }

  /**
   * The native bridge cht-android exposes to the WebView.
   *
   * Absent in a browser, which is the normal case for most of CHT, so this is read off globalThis
   * the way the rest of the app reads it: everything here degrades to "not available" rather than
   * failing, and the rest of the app is unaffected.
   */
  private get bridge() {
    return (globalThis as any)?.medicmobile_android ?? null;
  }

  /** True only when running inside cht-android with the P2P methods present. */
  isSupported(): boolean {
    return !!this.bridge && typeof this.bridge.p2p_host_available === 'function';
  }

  /** Whether this user may relay another device's data, and this device can host a session. */
  async canHost(): Promise<boolean> {
    if (!this.isSupported() || !this.bridge.p2p_host_available()) {
      return false;
    }
    return this.authService.has('can_relay_offline_data_bundle');
  }

  /** Whether this user may send their data to a relay, and this device can join a session. */
  async canJoin(): Promise<boolean> {
    if (!this.isSupported() || !this.bridge.p2p_join_available()) {
      return false;
    }
    return this.authService.has('can_send_offline_data_bundle');
  }

  /** Results arrive asynchronously: bringing a hotspot up takes seconds. */
  hostingResult(): Observable<P2pResult> {
    return this.hostingSubject.asObservable();
  }

  pairingResult(): Observable<P2pResult> {
    return this.pairingSubject.asObservable();
  }

  /** Emits once the user has answered the Android permission prompt. */
  permissionsResolved(): Observable<boolean> {
    return this.permissionsSubject.asObservable();
  }

  startHosting() {
    this.bridge?.p2p_start_hosting();
  }

  stopHosting() {
    this.bridge?.p2p_stop_hosting();
  }

  isHosting(): boolean {
    return !!this.bridge?.p2p_is_hosting();
  }

  scanAndJoin() {
    this.bridge?.p2p_scan_and_join();
  }

  leaveSession() {
    this.bridge?.p2p_leave_session();
  }

  // Called by AndroidApiService when the native side reports back.
  hostingResolved(ok: boolean, detail: string) {
    this.hostingSubject.next({ ok, detail });
  }

  pairingResolved(ok: boolean, detail: string) {
    this.pairingSubject.next({ ok, detail });
  }

  permissionsResolvedBy(granted: boolean) {
    this.permissionsSubject.next(granted);
  }
}
