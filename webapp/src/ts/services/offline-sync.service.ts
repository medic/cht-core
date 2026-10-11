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

/**
 * How much of a bundle crosses the bridge per call, in decoded bytes.
 *
 * A multiple of 3, which matters on the way in: chunks read back are joined as base64 text, and
 * only a whole number of 3-byte groups encodes without padding in the middle of the result.
 */
export const BRIDGE_CHUNK_BYTES = 3 * 128 * 1024;

/** A bundle held by the native side, waiting for the webapp to take it. */
export interface ReceivedBundle {
  id: string;
  envelope: string;
  signature: string;
  /** Decoded size, which is what the read offsets count in. */
  bytes: number;
}

export interface OfflineSyncResult {
  ok: boolean;
  /**
   * On success, what the result means for that call: the pairing payload when hosting starts, or
   * the host's label when joining succeeds. On failure, a stable code with a translation key,
   * rather than a message to show.
   */
  detail: string;
  /**
   * What actually went wrong, when the native side can say. For the failure record only: it is
   * built on the device, so it cannot be translated and is never shown.
   */
  diagnostic?: string;
  /** Set only when a hosting session started. */
  session?: HostingSession;
}

/**
 * Drives a peer-to-peer pairing session through the native bridge.
 *
 * Two roles, granted separately, because a device can legitimately have one and not the other:
 * a relay carries other people's data to the server, a sender sends their own. Whether the
 * device can technically do either is a second question the bridge answers, since hosting needs a
 * newer Android than joining.
 */
@Injectable({ providedIn: 'root' })
export class OfflineSyncService {
  private readonly hostingSubject = new Subject<OfflineSyncResult>();
  private readonly pairingSubject = new Subject<OfflineSyncResult>();
  private readonly permissionsSubject = new Subject<boolean>();
  private readonly transferSubject = new Subject<OfflineSyncResult>();
  private readonly receivedSubject = new Subject<string>();

  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) { }

  /**
   * The native bridge cht-android exposes to the WebView.
   *
   * Absent in a browser, which is the normal case for most of CHT, so this is read off globalThis
   * the way the rest of the app reads it: everything here degrades to "not available" rather than
   * failing, and the rest of the app is unaffected. An app older than this webapp has the bridge
   * but not these methods, so it counts as absent too: every call below would otherwise throw.
   */
  private get bridge() {
    const bridge = (globalThis as any)?.medicmobile_android ?? null;
    return typeof bridge?.offline_sync_host_available === 'function' ? bridge : null;
  }

  /** True only when running inside cht-android with the offline sync methods present. */
  isSupported(): boolean {
    return !!this.bridge;
  }

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
      // A failure is still recorded when the device details cannot be read.
      return 'unknown device';
    }
  }

  /** Whether this user may relay another device's data, and this device can host a session. */
  async canHost(): Promise<boolean> {
    if (!this.bridge?.offline_sync_host_available()) {
      return false;
    }
    return this.authService.has('can_relay_offline_data_bundle');
  }

  /** Whether this user may send their data to a relay, and this device can join a session. */
  async canJoin(): Promise<boolean> {
    // Online-only users, admins included, are never given a key: the server refuses their bundles.
    if (!this.bridge?.offline_sync_join_available() || this.sessionService.isOnlineOnly()) {
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

  /** Emits once per bundle handed over, successfully or not. */
  transferResult(): Observable<OfflineSyncResult> {
    return this.transferSubject.asObservable();
  }

  /** Emits the id of each bundle a peer has just delivered to this device. */
  bundleReceived(): Observable<string> {
    return this.receivedSubject.asObservable();
  }

  // --- Moving a bundle across the bridge --------------------------------------------------
  //
  // A bundle is megabytes of ciphertext, too much to pass in one call, so both directions move it
  // a chunk at a time and it rests in native storage in between. The webapp drives both: it pushes
  // the chunks out, and it pulls the chunks in.

  /** Opens an outbound bundle, returning the id the chunks belong to. */
  openBundle(): string | null {
    return this.bridge?.offline_sync_bundle_open() || null;
  }

  /** Appends one base64 chunk. False means the bundle could not be written and is abandoned. */
  writeBundle(id: string, chunk: string): boolean {
    return !!this.bridge?.offline_sync_bundle_write(id, chunk);
  }

  /** Hands the assembled bundle to the paired host. The outcome arrives on transferResult(). */
  sendBundle(id: string, envelope: string, signature: string) {
    this.bridge?.offline_sync_bundle_send(id, envelope, signature);
  }

  /** Drops an outbound bundle that will not be sent, so a failed attempt leaves nothing behind. */
  abortBundle(id: string) {
    this.bridge?.offline_sync_bundle_abort(id);
  }

  // A handover is bracketed rather than each bundle, because the native side holds the session
  // open for as long as it is running, rather than letting go between bundles.
  transferStarted() {
    this.bridge?.offline_sync_transfer_started();
  }

  transferProgress(delivered: number) {
    this.bridge?.offline_sync_transfer_progress(delivered);
  }

  transferFinished(ok: boolean) {
    this.bridge?.offline_sync_transfer_finished(ok);
  }

  receivedBundles(): ReceivedBundle[] {
    return JSON.parse(this.bridge?.offline_sync_received_bundles() || '[]');
  }

  /**
   * One chunk of a received bundle, base64 encoded, starting at a decoded byte offset.
   *
   * Native encodes without line breaks, because the chunks are joined as text and Android's default
   * base64 wraps at 76 characters, which would make the joined result unreadable. An empty string
   * means the chunk could not be read, and the caller stops rather than storing a hole: how much
   * there is to read comes from `bytes`, not from this returning nothing.
   */
  readBundle(id: string, offset: number, length: number): string {
    return this.bridge?.offline_sync_bundle_read(id, offset, length) || '';
  }

  deleteBundle(id: string): boolean {
    return !!this.bridge?.offline_sync_bundle_delete(id);
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

  transferResolved(ok: boolean, detail: string) {
    this.transferSubject.next({ ok, detail });
  }

  bundleReceivedBy(id: string) {
    this.receivedSubject.next(id);
  }
}
