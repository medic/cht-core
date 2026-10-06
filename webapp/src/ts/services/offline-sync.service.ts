import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { AuthService } from '@mm-services/auth.service';
import { SessionService } from '@mm-services/session.service';


/** What the native side reports once a hosting session is up. */
export interface HostingSession {
  /** A PNG data URL of the code a peer scans. */
  qr: string;
  /** The network a peer joins. Named by the OS, so it is read back rather than chosen. */
  ssid: string;
  password: string;
}

export interface OfflineSyncResult {
  ok: boolean;
  /**
   * On success, what the result means for that call: the pairing payload when hosting starts, or
   * the host's label when joining succeeds. On failure, a stable code with a translation key,
   * never a message to show directly.
   */
  detail: string;
  /**
   * What actually went wrong, when the native side can say. For the failure record only: it is
   * built on the device, so it cannot be translated and must never reach the screen.
   */
  diagnostic?: string;
  /** Set only when a hosting session started. */
  session?: HostingSession;
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
export class OfflineSyncService {
  private readonly hostingSubject = new Subject<OfflineSyncResult>();
  private readonly pairingSubject = new Subject<OfflineSyncResult>();
  private readonly permissionsSubject = new Subject<boolean>();

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) { }

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

  /** True only when running inside cht-android with the offline sync methods present. */
  /**
   * Make, model and Android version, for the record kept when a session fails.
   *
   * Hosting depends on what the hardware and the OEM allow, so a failure code on its own does not
   * say whether the same phone would ever work. Read here rather than at the call site to keep
   * every use of the bridge in one file.
   */
  deviceDescription(): string {
    try {
      const info = JSON.parse(this.bridge?.getDeviceInfo() || '{}');
      const hardware = info.hardware || {};
      const software = info.software || {};
      return `${hardware.manufacturer} ${hardware.model}, `
        + `Android ${software.androidVersion} (API ${software.osApiLevel})`;
    } catch {
      // Diagnostics must never be the reason a failure goes unreported.
      return 'unknown device';
    }
  }

  isSupported(): boolean {
    return !!this.bridge && typeof this.bridge.offline_sync_host_available === 'function';
  }

  /** Whether this user may relay another device's data, and this device can host a session. */
  async canHost(): Promise<boolean> {
    if (!this.isSupported() || !this.bridge.offline_sync_host_available()) {
      return false;
    }
    return this.authService.has('can_relay_offline_data_bundle');
  }

  /** Whether this user may send their data to a relay, and this device can join a session. */
  async canJoin(): Promise<boolean> {
    // Online-only users, admins included, are never given a key: the server refuses their bundles.
    if (!this.isSupported() || !this.bridge.offline_sync_join_available() ||
      this.sessionService.isOnlineOnly()) {
      return false;
    }
    return this.authService.has('can_send_offline_data_bundle');
  }

  /** Results arrive asynchronously: bringing a hotspot up takes seconds. */
  hostingResult(): Observable<OfflineSyncResult> {
    return this.hostingSubject.asObservable();
  }

  pairingResult(): Observable<OfflineSyncResult> {
    return this.pairingSubject.asObservable();
  }

  /** Emits once the user has answered the Android permission prompt. */
  permissionsResolved(): Observable<boolean> {
    return this.permissionsSubject.asObservable();
  }

  startHosting() {
    this.bridge?.offline_sync_start_hosting();
  }

  stopHosting() {
    this.bridge?.offline_sync_stop_hosting();
  }

  isHosting(): boolean {
    return !!this.bridge?.offline_sync_is_hosting();
  }

  scanAndJoin() {
    this.bridge?.offline_sync_scan_and_join();
  }

  leaveSession() {
    this.bridge?.offline_sync_leave_session();
  }

  // Called by AndroidApiService when the native side reports back.
  hostingResolved(ok: boolean, detail: string, diagnostic?: string) {
    if (!ok) {
      return this.hostingSubject.next({ ok, detail, diagnostic });
    }
    // Success carries the session as JSON, since the screen needs the network details as text and
    // not only inside the code. A body that will not parse is a failure: there is nothing to show.
    try {
      this.hostingSubject.next({ ok, detail, session: JSON.parse(detail) });
    } catch (err) {
      console.error('OfflineSyncService :: Could not read the hosting session', err);
      this.hostingSubject.next({ ok: false, detail: 'payload_failed' });
    }
  }

  pairingResolved(ok: boolean, detail: string) {
    this.pairingSubject.next({ ok, detail });
  }

  permissionsResolvedBy(granted: boolean) {
    this.permissionsSubject.next(granted);
  }
}
