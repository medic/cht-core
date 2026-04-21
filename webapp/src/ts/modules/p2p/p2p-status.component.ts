import { Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NgIf, NgFor, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCard, MatCardHeader, MatCardTitle, MatCardContent, MatCardSubtitle } from '@angular/material/card';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIcon } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  MatExpansionPanel, MatExpansionPanelHeader,
  MatExpansionPanelTitle, MatAccordion
} from '@angular/material/expansion';
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { DbService } from '@mm-services/db.service';
import { DBSyncService } from '@mm-services/db-sync.service';
import { P2pConfigService, P2pRole } from '@mm-services/p2p-config.service';
import { P2pTransitFilterService } from '@mm-services/p2p-transit-filter.service';
import { P2pTransitPurgeService } from '@mm-services/p2p-transit-purge.service';
import { SessionService } from '@mm-services/session.service';
import { ToolBarComponent } from '@mm-components/tool-bar/tool-bar.component';

declare const medicmobile_android: any;

type SyncState =
  'idle' | 'starting' | 'syncing' | 'completed' | 'failed' |
  'stopping' | 'scanning' | 'waiting' | 'connecting' |
  'waiting_wifi' | 'stopped' | 'preview' | 'peer_connected';

const S: Record<string, SyncState> = {
  IDLE: 'idle',
  STARTING: 'starting',
  SYNCING: 'syncing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  STOPPING: 'stopping',
  SCANNING: 'scanning',
  WAITING: 'waiting',
  CONNECTING: 'connecting',
  WAITING_WIFI: 'waiting_wifi',
  STOPPED: 'stopped',
  PREVIEW: 'preview',
  PEER_CONNECTED: 'peer_connected',
};

const SYNC_LOG_ID = '_local/p2p-sync-log';
const RELAY_LOG_ID = '_local/p2p-relay-log';
const ERROR_NOT_INITIALIZED = 'p2p.error.not_initialized';

interface SyncSession {
  session_id: string;
  peer_device_id: string;
  peer_user: string;
  started_at: number;
  completed_at: number;
  docs_pushed: number;
  docs_pulled: number;
  bytes_transferred: number;
  status: SessionStatus;
  error: string | null;
}

type SessionStatus = 'completed' | 'failed' | 'interrupted';

const SESSION_STATUS: Record<string, SessionStatus> = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  INTERRUPTED: 'interrupted',
};

interface RelaySession {
  session_id: string;
  source_device_id: string;
  source_user: string;
  started_at: number;
  completed_at: number;
  docs_received: number;
  in_scope_count: number;
  transit_count: number;
  rejected_count: number;
  bytes_received: number;
  status: SessionStatus;
}

interface HistoryEntry {
  session_id: string;
  type: 'sync' | 'relay';
  peer: string;
  started_at: number;
  completed_at: number;
  docs_count: number;
  transit_count: number;
  bytes: number;
  status: SessionStatus;
  error: string | null;
}

@Component({
  selector: 'p2p-status',
  templateUrl: './p2p-status.component.html',
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardContent,
    MatCardSubtitle,
    MatButton,
    MatProgressBar,
    MatIcon,
    MatChipsModule,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatAccordion,
    TranslateDirective,
    TranslatePipe,
    ToolBarComponent,
  ],
})
export class P2pStatusComponent implements OnInit, OnDestroy {
  // Config-driven state
  loading = true;
  p2pEnabled = false;
  p2pRole: P2pRole = null;
  hasBridgeAvailable = false;

  // Sync state
  syncState: SyncState = S.IDLE;
  hotspotActive = false;
  connectedPeers: string[] = [];
  qrCodeDataUrl: string | null = null;
  hotspotSsid: string | null = null;
  hotspotPassword: string | null = null;
  showPassword = false;

  // Progress
  docsSynced = 0;
  totalDocs = 0;
  bytesTransferred = 0;
  transitDocCount = 0;
  pendingPurgeCount = 0;
  hasStaleTransitDocs = false;

  // Preview (staging view)
  previewContacts = 0;
  previewReports = 0;
  previewTotal = 0;

  // Error
  lastError: string | null = null;

  // History
  history: HistoryEntry[] = [];
  historyLoading = false;
  totalSessions = 0;
  totalDocsSynced = 0;
  totalBytesTransferred = 0;
  totalTransitDocs = 0;

  private statusPollInterval: any = null;
  private connectionPollInterval: any = null;
  private readonly POLL_INTERVAL_MS = 2000;
  private stoppedResetTimeout: any = null;
  private completionResetTimeout: any = null;

  private bridgeInitialized = false;
  private bridgeInitializing = false;

  constructor(
    private readonly ngZone: NgZone,
    private readonly dbService: DbService,
    private readonly dbSyncService: DBSyncService,
    private readonly http: HttpClient,
    private readonly p2pConfigService: P2pConfigService,
    private readonly sessionService: SessionService,
    private readonly transitFilterService: P2pTransitFilterService,
    private readonly transitPurgeService: P2pTransitPurgeService
  ) {}

  async ngOnInit() {
    this.hasBridgeAvailable = this.hasBridge();
    await this.loadConfig();
    if (this.p2pEnabled) {
      if (this.hasBridgeAvailable) {
        await this.initializeBridge();
        // Restore state from bridge if P2P is already running (e.g., navigated away and back)
        this.restoreActiveState();
      }
      this.loadTransitStats();
      this.checkStaleTransitDocs();
      this.loadHistory();
    }
    this.loading = false;
  }

  ngOnDestroy() {
    this.stopStatusPolling();
    this.stopConnectionPolling();
    if (this.stoppedResetTimeout) {
      clearTimeout(this.stoppedResetTimeout);
    }
    if (this.completionResetTimeout) {
      clearTimeout(this.completionResetTimeout);
    }
  }

  private async loadConfig() {
    const config = await this.p2pConfigService.getConfig();
    this.p2pEnabled = config.enabled;
    this.p2pRole = await this.p2pConfigService.getUserP2pRole();
  }

  private async fetchRevocationList(): Promise<any> {
    try {
      return await firstValueFrom(this.http.get<any>('/api/v1/p2p/revocation-list'));
    } catch (err) {
      console.debug('P2pStatus: could not fetch revocation list, using empty', err);
      return { version: 0, revoked_devices: [], revoked_users: [] };
    }
  }

  private async buildInitConfig(authResponse: any): Promise<any> {
    const revocationList = await this.fetchRevocationList();
    const deviceId = await this.getOrCreateDeviceId();
    const userCtx = this.sessionService.userCtx();
    return {
      config: await firstValueFrom(this.http.get<any>('/api/v1/p2p/config/_')),
      scope_manifest: authResponse.scope_manifest,
      server_public_key: authResponse.server_public_key,
      token: authResponse.token,
      revocation_list: revocationList,
      device_id: deviceId,
      user_id: userCtx?.name || 'unknown',
    };
  }

  private callBridgeInitialize(config: any): boolean {
    const raw = medicmobile_android.p2pInitialize(JSON.stringify(config));
    const result = JSON.parse(raw);
    return result.ok;
  }

  private async initializeFromCache(): Promise<void> {
    const cached = await this.loadCachedInitConfig();
    if (!cached) {
      console.error('P2pStatus: no cached config available, P2P unavailable offline');
      return;
    }
    try {
      if (this.callBridgeInitialize(cached)) {
        this.bridgeInitialized = true;
        console.info('P2pStatus: bridge initialized from cache');
      }
    } catch (cacheErr) {
      console.error('P2pStatus: cached config init failed', cacheErr);
    }
  }

  private async initializeBridge() {
    if (this.bridgeInitialized) {
      return;
    }
    if (typeof medicmobile_android.p2pInitialize !== 'function') {
      console.debug('P2pStatus: p2pInitialize not available on bridge');
      return;
    }
    try {
      const authResponse: any = await firstValueFrom(this.http.post('/api/v1/p2p/authorize', {}));
      const initConfig = await this.buildInitConfig(authResponse);
      if (this.callBridgeInitialize(initConfig)) {
        this.bridgeInitialized = true;
        console.info('P2pStatus: bridge initialized successfully');
        await this.cacheInitConfig(initConfig);
      } else {
        console.error('P2pStatus: bridge init failed');
      }
    } catch (err) {
      console.warn('P2pStatus: server unreachable, trying cached config', err);
      await this.initializeFromCache();
    }
  }

  private async ensureBridgeInitialized(): Promise<boolean> {
    if (this.bridgeInitialized) {
      return true;
    }
    if (this.bridgeInitializing) {
      return false;
    }
    this.bridgeInitializing = true;
    try {
      await this.initializeBridge();
    } finally {
      this.bridgeInitializing = false;
    }
    return this.bridgeInitialized;
  }

  private async cacheInitConfig(config: any) {
    const db = this.dbService.get();
    const id = '_local/p2p-init-cache';
    try {
      const existing: any = await db.get(id);
      await db.put({ ...existing, config, cached_at: Date.now() });
    } catch (err) {
      console.debug('P2pStatus: no existing cache doc, creating new', err);
      await db.put({ _id: id, config, cached_at: Date.now() });
    }
  }

  private async loadCachedInitConfig(): Promise<any> {
    const db = this.dbService.get();
    try {
      const doc: any = await db.get('_local/p2p-init-cache');
      return doc.config;
    } catch (err) {
      console.debug('P2pStatus: no cached init config found', err);
      return null;
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    const LOCAL_DEVICE_ID = '_local/p2p-device-id';
    const db = this.dbService.get();
    try {
      const doc: any = await db.get(LOCAL_DEVICE_ID);
      return doc.device_id;
    } catch (err: any) {
      if (err.status !== 404) {
        throw err;
      }
      const deviceId = crypto.randomUUID();
      await db.put({ _id: LOCAL_DEVICE_ID, device_id: deviceId });
      return deviceId;
    }
  }

  get isHost(): boolean {
    return this.p2pRole === 'host';
  }

  get isPeer(): boolean {
    return this.p2pRole === 'peer';
  }

  private async loadTransitStats() {
    await this.transitFilterService.loadTransitIndex();
    this.transitDocCount = this.transitFilterService.getTransitDocCount();
    try {
      this.pendingPurgeCount = await this.transitPurgeService.getPendingPurgeCount();
    } catch (err) {
      console.error('P2pStatus: failed to get pending purge count', err);
    }
  }

  private async checkStaleTransitDocs() {
    try {
      this.hasStaleTransitDocs = await this.transitPurgeService.hasStaleTransitDocs();
    } catch (err) {
      console.error('P2pStatus: failed to check stale transit docs', err);
    }
  }

  private handleIncapableDevice(cap: any): boolean {
    if (cap.capability === 'permission_needed') {
      if (typeof medicmobile_android.getP2pPermissions === 'function') {
        medicmobile_android.getP2pPermissions();
      }
      this.lastError = 'p2p.error.permission_needed';
      this.syncState = S.IDLE;
      return false;
    }
    if (cap.capability === 'location_services_off') {
      this.lastError = cap.reason;
      this.syncState = S.IDLE;
      return false;
    }
    this.lastError = cap.reason || cap.capability;
    this.syncState = S.FAILED;
    return false;
  }

  private checkAndRequestPermissions(): boolean {
    if (!this.hasBridgeAvailable) {
      return false;
    }
    try {
      if (typeof medicmobile_android.p2pGetCapability !== 'function') {
        return true;
      }
      const raw = medicmobile_android.p2pGetCapability();
      const cap = JSON.parse(raw);
      if (!cap.capable) {
        return this.handleIncapableDevice(cap);
      }
      return true;
    } catch (err) {
      console.debug('P2pStatus: capability check failed', err);
      return true;
    }
  }

  private extractQrCredentials(result: any) {
    if (result.qr_data_url) {
      this.qrCodeDataUrl = result.qr_data_url;
    }
    if (!result.qr_payload) {
      return;
    }
    try {
      const qr = JSON.parse(result.qr_payload);
      this.hotspotSsid = qr.ssid || null;
      this.hotspotPassword = qr.pwd || null;
    } catch (err) {
      console.debug('P2pStatus: QR payload parse failed', err);
    }
  }

  private handleHostModeResult(result: any) {
    if (result.ok) {
      this.syncState = S.WAITING;
      this.hotspotActive = true;
      this.extractQrCredentials(result);
      this.startStatusPolling();
    } else {
      this.syncState = S.FAILED;
      this.lastError = result.error || 'Unknown error';
    }
  }

  async startAsHost() {
    if (!this.hasBridgeAvailable) {
      return;
    }
    if (!await this.ensureBridgeInitialized()) {
      this.lastError = ERROR_NOT_INITIALIZED;
      return;
    }
    this.syncState = S.STARTING;
    this.lastError = null;
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!this.checkAndRequestPermissions()) {
      return;
    }
    try {
      const raw = medicmobile_android.p2pStartHostMode();
      this.handleHostModeResult(JSON.parse(raw));
    } catch (err: any) {
      this.syncState = S.FAILED;
      this.lastError = err.message || 'Failed to start host mode';
      console.error('P2pStatus: failed to start host mode', err);
    }
  }

  async startAsPeer() {
    if (!this.hasBridgeAvailable) {
      return;
    }
    if (!await this.ensureBridgeInitialized()) {
      this.lastError = ERROR_NOT_INITIALIZED;
      return;
    }
    this.syncState = S.SCANNING;
    this.lastError = null;
    if (!this.checkAndRequestPermissions()) {
      return;
    }

    // Register callback for QR scan result
    (window as any).CHTCore = (window as any).CHTCore || {};
    (window as any).CHTCore.P2p = (window as any).CHTCore.P2p || {};
    (window as any).CHTCore.P2p.onQrScanResult = (qrData: string | null) => {
      this.ngZone.run(() => this.handleQrScanResult(qrData));
    };

    // Launch QR scanner
    try {
      medicmobile_android.p2pScanQrCode();
    } catch (err: any) {
      this.syncState = S.FAILED;
      this.lastError = err.message || 'Failed to launch QR scanner';
      console.error('P2pStatus: failed to launch QR scanner', err);
    }
  }

  private handleQrScanResult(qrData: string | null) {
    if (!qrData) {
      this.syncState = S.IDLE;
      return;
    }
    try {
      const raw = medicmobile_android.p2pStartClientMode(qrData);
      const result = JSON.parse(raw);
      if (!result.ok) {
        this.syncState = S.FAILED;
        this.lastError = result.error || 'Unknown error';
        return;
      }
      this.hotspotSsid = result.ssid || null;
      this.hotspotPassword = result.password || null;
      if (result.auto_connecting) {
        this.syncState = S.CONNECTING;
        this.startStatusPolling();
      } else {
        this.syncState = S.WAITING_WIFI;
        this.startConnectionPolling();
      }
    } catch (err: any) {
      this.syncState = S.FAILED;
      this.lastError = err.message || 'Failed to connect';
      console.error('P2pStatus: failed to start peer mode', err);
    }
  }

  retrySync() {
    if (!this.hasBridgeAvailable) {
      return;
    }
    this.lastError = null;
    try {
      const raw = (window as any).medicmobile_android.p2pRetrySync();
      const result = JSON.parse(raw);
      if (result.ok) {
        this.syncState = S.CONNECTING;
        this.startStatusPolling();
      } else if (result.error?.includes('no_cached_connection')) {
        // No cached credentials — fall back to full re-scan
        this.startAsPeer();
      } else {
        this.syncState = S.FAILED;
        this.lastError = result.error || 'Retry failed';
      }
    } catch (err: any) {
      this.syncState = S.FAILED;
      this.lastError = err.message || 'Retry failed';
      console.error('P2pStatus: retry failed', err);
    }
  }

  stopSync() {
    if (!this.hasBridgeAvailable) {
      return;
    }
    this.syncState = S.STOPPING;
    try {
      medicmobile_android.p2pStop();
    } catch (err: any) {
      console.error('P2pStatus: failed to stop sync', err);
    }
    this.stopStatusPolling();
    this.stopConnectionPolling();
    this.syncState = S.STOPPED;
    this.hotspotActive = false;
    this.connectedPeers = [];
    this.qrCodeDataUrl = null;
    this.hotspotSsid = null;
    this.hotspotPassword = null;
    this.stoppedResetTimeout = setTimeout(() => {
      if (this.syncState === S.STOPPED) {
        this.syncState = S.IDLE;
      }
    }, 3000);

    // Force server sync so P2P-received docs replicate to the server.
    // force=true bypasses the isP2pActive() guard in db-sync.service.
    // Uses retry logic since the first attempt may fail if network isn't ready yet.
    if (this.isHost) {
      this.triggerPostP2pSync();
    }
  }

  proceedSync() {
    if (!this.hasBridgeAvailable) {
      return;
    }
    try {
      const raw = medicmobile_android.p2pProceedSync();
      const result = JSON.parse(raw);
      if (result.ok) {
        this.syncState = S.SYNCING;
        this.startStatusPolling();
      } else {
        this.syncState = S.FAILED;
        this.lastError = result.error || 'Failed to proceed';
      }
    } catch (err: any) {
      this.syncState = S.FAILED;
      this.lastError = err.message || 'Failed to proceed with sync';
      console.error('P2pStatus: failed to proceed with sync', err);
    }
  }

  dismissCompletion() {
    if (this.completionResetTimeout) {
      clearTimeout(this.completionResetTimeout);
      this.completionResetTimeout = null;
    }
    this.resetToIdle();
  }

  private scheduleCompletionReset() {
    if (this.completionResetTimeout) {
      clearTimeout(this.completionResetTimeout);
    }
    this.completionResetTimeout = setTimeout(() => {
      if (this.syncState === S.COMPLETED) {
        this.resetToIdle();
      }
    }, 10000);
  }

  private triggerPostP2pSync(attempt = 1, maxAttempts = 4, delayMs = 3000) {
    setTimeout(() => this.executePostP2pSyncAttempt(attempt, maxAttempts, delayMs), delayMs);
  }

  private async executePostP2pSyncAttempt(attempt: number, maxAttempts: number, delayMs: number) {
    try {
      console.info(`P2pStatus: post-P2P sync attempt ${attempt}/${maxAttempts}`);
      await this.dbSyncService.sync(true);
      const failures = this.dbSyncService.getLastToWriteFailures();
      if (failures > 0) {
        this.retryPostP2pSyncIfPossible(attempt, maxAttempts, delayMs, `${failures} write failures`);
        return;
      }
      console.info('P2pStatus: 0 write failures, purging P2P docs');
      await this.transitPurgeService.markAllBatchesPushedAndPurge();
      await this.loadTransitStats();
    } catch (err) {
      this.retryPostP2pSyncIfPossible(attempt, maxAttempts, delayMs, String(err));
    }
  }

  private retryPostP2pSyncIfPossible(attempt: number, maxAttempts: number, delayMs: number, reason: string) {
    console.warn(`P2pStatus: attempt ${attempt} issue: ${reason}`);
    if (attempt < maxAttempts) {
      this.triggerPostP2pSync(attempt + 1, maxAttempts, delayMs);
    }
  }

  private resetToIdle() {
    this.syncState = S.IDLE;
    this.docsSynced = 0;
    this.totalDocs = 0;
    this.bytesTransferred = 0;
    this.previewContacts = 0;
    this.previewReports = 0;
    this.previewTotal = 0;
    this.lastError = null;
    this.hotspotSsid = null;
    this.hotspotPassword = null;
  }

  async purgeTransitDocs() {
    try {
      await this.transitPurgeService.purgeConfirmedTransitDocs();
      await this.loadTransitStats();
    } catch (err) {
      console.error('P2pStatus: purge failed', err);
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }

  private startStatusPolling() {
    this.stopStatusPolling();
    this.statusPollInterval = setInterval(() => this.pollStatus(), this.POLL_INTERVAL_MS);
  }

  private stopStatusPolling() {
    if (this.statusPollInterval) {
      clearInterval(this.statusPollInterval);
      this.statusPollInterval = null;
    }
  }

  /**
   * Poll to detect when the user has manually connected to the hotspot WiFi.
   * Calls p2pCheckConnection() which pings the host's HTTP server.
   * When reachable, stops polling and switches to status polling.
   */
  private startConnectionPolling() {
    this.stopConnectionPolling();
    this.connectionPollInterval = setInterval(() => {
      this.ngZone.run(() => {
        if (!this.hasBridgeAvailable || typeof medicmobile_android.p2pCheckConnection !== 'function') {
          return;
        }
        try {
          const raw = medicmobile_android.p2pCheckConnection();
          const result = JSON.parse(raw);
          if (result.connected) {
            console.info('P2pStatus: host reachable, starting sync');
            this.stopConnectionPolling();
            this.syncState = S.CONNECTING;
            this.startStatusPolling();
          }
        } catch (err) {
          console.debug('P2pStatus: connection check pending', err);
        }
      });
    }, 3000);
  }

  private stopConnectionPolling() {
    if (this.connectionPollInterval) {
      clearInterval(this.connectionPollInterval);
      this.connectionPollInterval = null;
    }
  }

  private applyStatusUpdate(status: any) {
    this.hotspotActive = status.hotspot_active || false;
    this.connectedPeers = status.connected_peers || [];
    this.docsSynced = status.docs_synced || 0;
    this.totalDocs = status.total_docs || 0;
    this.bytesTransferred = status.bytes_transferred || 0;
    if (status.qr_code_data_url) {
      this.qrCodeDataUrl = status.qr_code_data_url;
    }
    if (status.error) {
      this.lastError = status.error;
    }
  }

  private handlePollStateTransitions(rawState: string, status: any) {
    if (rawState === S.PREVIEW) {
      this.previewContacts = status.preview_contacts || 0;
      this.previewReports = status.preview_reports || 0;
      this.previewTotal = status.preview_total || 0;
      this.stopStatusPolling();
      return;
    }
    if (this.syncState === S.SYNCING) {
      this.transitDocCount = this.transitFilterService.getTransitDocCount();
    }
    if (this.syncState === S.COMPLETED || this.syncState === S.FAILED || this.syncState === S.IDLE) {
      this.stopStatusPolling();
      this.loadTransitStats();
      this.loadHistory();
    }
  }

  private pollStatus() {
    this.ngZone.run(() => {
      if (!this.hasBridgeAvailable || typeof medicmobile_android.p2pGetStatus !== 'function') {
        return;
      }
      try {
        const raw = medicmobile_android.p2pGetStatus();
        const status = JSON.parse(raw);
        const rawState = status.state || S.IDLE;

        if (rawState === S.WAITING_WIFI && this.syncState !== S.WAITING_WIFI) {
          this.syncState = S.WAITING_WIFI;
          this.stopStatusPolling();
          this.startConnectionPolling();
          return;
        }

        this.syncState = rawState as SyncState;
        this.applyStatusUpdate(status);
        this.handlePollStateTransitions(rawState, status);
      } catch (err) {
        console.debug('P2pStatus: poll failed', err);
      }
    });
  }

  private hasBridge(): boolean {
    return medicmobile_android !== undefined && medicmobile_android !== null;
  }

  /**
   * Restore active P2P state from bridge (survives page navigation).
   * If sync is already running in the Java layer, pick up the current state.
   */
  private restoreWifiAndPreview(status: any, state: string) {
    if (status.hotspot_ssid) {
      this.hotspotSsid = status.hotspot_ssid;
    }
    if (status.hotspot_password) {
      this.hotspotPassword = status.hotspot_password;
    }
    if (state === S.PREVIEW) {
      this.previewContacts = status.preview_contacts || 0;
      this.previewReports = status.preview_reports || 0;
      this.previewTotal = status.preview_total || 0;
    }
  }

  private resumePollingForState(state: string) {
    const statusPollStates: string[] = [S.WAITING, S.SYNCING, S.CONNECTING, S.SCANNING];
    if (state === S.WAITING_WIFI) {
      this.startConnectionPolling();
    } else if (statusPollStates.includes(state)) {
      this.startStatusPolling();
    }
  }

  private restoreActiveState() {
    if (!this.hasBridgeAvailable || typeof medicmobile_android.p2pGetStatus !== 'function') {
      return;
    }
    try {
      const raw = medicmobile_android.p2pGetStatus();
      const status = JSON.parse(raw);
      const state = status.state || S.IDLE;
      if (state === S.IDLE) {
        return;
      }
      this.syncState = state as SyncState;
      this.applyStatusUpdate(status);
      this.restoreWifiAndPreview(status, state);
      this.resumePollingForState(state);
      console.info('P2pStatus: restored active state:', state);
    } catch (err) {
      console.debug('P2pStatus: could not restore state', err);
    }
  }

  get syncProgress(): number {
    if (this.totalDocs === 0) {
      return 0;
    }
    return Math.round((this.docsSynced / this.totalDocs) * 100);
  }

  get isSyncing(): boolean {
    const activeStates: SyncState[] = [
      S.SYNCING, S.STARTING, S.WAITING, S.SCANNING,
      S.CONNECTING, S.WAITING_WIFI, S.PREVIEW, S.PEER_CONNECTED,
    ];
    return activeStates.includes(this.syncState);
  }

  get canStart(): boolean {
    return this.p2pEnabled && this.syncState === S.IDLE && this.hasBridgeAvailable;
  }

  // --- History ---

  private mapSyncSession(s: SyncSession): HistoryEntry {
    return {
      session_id: s.session_id,
      type: 'sync',
      peer: s.peer_user || s.peer_device_id,
      started_at: s.started_at,
      completed_at: s.completed_at,
      docs_count: (s.docs_pushed || 0) + (s.docs_pulled || 0),
      transit_count: 0,
      bytes: s.bytes_transferred || 0,
      status: s.status,
      error: s.error || null,
    };
  }

  private mapRelaySession(s: RelaySession): HistoryEntry {
    return {
      session_id: s.session_id,
      type: 'relay',
      peer: s.source_user || s.source_device_id,
      started_at: s.started_at,
      completed_at: s.completed_at,
      docs_count: s.docs_received || 0,
      transit_count: s.transit_count || 0,
      bytes: s.bytes_received || 0,
      status: s.status,
      error: null,
    };
  }

  private async loadLogEntries<T>(
    logId: string, mapper: (s: T) => HistoryEntry, label: string
  ): Promise<HistoryEntry[]> {
    try {
      const db = this.dbService.get();
      const log = await db.get(logId);
      const sessions: T[] = log.sessions || [];
      return sessions.map(mapper);
    } catch (err: any) {
      if (err.status !== 404) {
        console.error(`P2pStatus: failed to load ${label}`, err);
      }
      return [];
    }
  }

  async loadHistory() {
    this.historyLoading = true;

    const syncEntries = await this.loadLogEntries<SyncSession>(
      SYNC_LOG_ID, s => this.mapSyncSession(s), 'sync log'
    );
    const relayEntries = await this.loadLogEntries<RelaySession>(
      RELAY_LOG_ID, s => this.mapRelaySession(s), 'relay log'
    );

    const entries = [...syncEntries, ...relayEntries];
    entries.sort((a, b) => b.started_at - a.started_at);
    this.history = entries;
    this.computeStats();
    this.historyLoading = false;
  }

  private computeStats() {
    this.totalSessions = this.history.length;
    this.totalDocsSynced = 0;
    this.totalBytesTransferred = 0;
    this.totalTransitDocs = 0;

    for (const entry of this.history) {
      this.totalDocsSynced += entry.docs_count;
      this.totalBytesTransferred += entry.bytes;
      this.totalTransitDocs += entry.transit_count;
    }
  }

  formatDuration(startMs: number, endMs: number): string {
    if (!startMs || !endMs) {
      return '--';
    }
    const diffSec = Math.round((endMs - startMs) / 1000);
    if (diffSec < 60) {
      return `${diffSec}s`;
    }
    const min = Math.floor(diffSec / 60);
    const sec = diffSec % 60;
    return `${min}m ${sec}s`;
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case SESSION_STATUS.COMPLETED: return 'check_circle';
      case SESSION_STATUS.FAILED: return 'error';
      case SESSION_STATUS.INTERRUPTED: return 'warning';
      default: return 'help';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case SESSION_STATUS.COMPLETED: return 'p2p-success';
      case SESSION_STATUS.FAILED: return 'p2p-error';
      case SESSION_STATUS.INTERRUPTED: return 'p2p-warning-icon';
      default: return '';
    }
  }
}
